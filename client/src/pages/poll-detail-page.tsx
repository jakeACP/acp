import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/navigation";
import { Poll, Comment, User } from "@shared/schema";
import { BarChart3, Clock, Users, MessageCircle, X, ArrowLeft } from "lucide-react";
import { useState } from "react";

export default function PollDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [commentText, setCommentText] = useState<string>("");

  const { data: poll, isLoading: pollLoading } = useQuery<Poll>({
    queryKey: ["/api/polls", id],
    enabled: !!id,
  });

  const { data: myVote } = useQuery<{ optionId: string | null }>({
    queryKey: ["/api/polls", id, "my-vote"],
    enabled: !!user && !!id,
  });

  const { data: comments = [] } = useQuery<(Comment & { author: User })[]>({
    queryKey: ["/api/polls", id, "comments"],
    enabled: !!id,
  });

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      return await apiRequest(`/api/polls/${id}/vote`, "POST", { optionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls", id, "my-vote"] });
      toast({
        title: "Vote submitted",
        description: "Your vote has been recorded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Vote failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest(`/api/polls/${id}/comments`, "POST", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls", id, "comments"] });
      setCommentText("");
      toast({
        title: "Comment posted",
        description: "Your comment has been added to the poll",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Comment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const closePollMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/polls/${id}/close`, "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls", id] });
      toast({
        title: "Poll closed",
        description: "The poll has been closed and voting is no longer allowed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to close poll",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVote = () => {
    if (selectedOption && poll?.isActive) {
      voteMutation.mutate(selectedOption);
    }
  };

  const handleComment = () => {
    if (commentText.trim() && id) {
      commentMutation.mutate(commentText.trim());
    }
  };

  const handleClosePoll = () => {
    if (poll && user?.role === 'admin') {
      closePollMutation.mutate();
    }
  };

  if (pollLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-6xl mx-auto p-4">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-300 rounded mb-4"></div>
            <div className="h-64 bg-slate-300 rounded mb-4"></div>
            <div className="h-32 bg-slate-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-6xl mx-auto p-4 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Poll not found</h1>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const hasVoted = !!myVote?.optionId;
  const totalVotes = poll.totalVotes || 0;
  const isExpired = poll.endDate && new Date(poll.endDate) <= new Date();
  const canVote = poll.isActive && !isExpired && !hasVoted;
  const canClosePoll = user?.role === 'admin' && poll.isActive && !isExpired;

  const getOptionPercentage = (optionVotes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((optionVotes / totalVotes) * 100);
  };

  const getTimeRemaining = () => {
    if (!poll.endDate) return "No deadline";
    const now = new Date();
    const end = new Date(poll.endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 1) return "1 day left";
    if (days > 1) return `${days} days left`;
    
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    return `${hours} hour${hours !== 1 ? 's' : ''} left`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-6xl mx-auto p-4">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Feed
        </Button>

        {/* Poll Detail Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mr-4">
                  <BarChart3 className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-slate-900 mb-2" data-testid="text-poll-title">
                    {poll.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span data-testid="text-time-remaining">{getTimeRemaining()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span data-testid="text-vote-count">{totalVotes} votes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span data-testid="text-comment-count">{comments.length} comments</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <Badge variant={poll.isActive && !isExpired ? "default" : "secondary"} data-testid="badge-status">
                      {poll.isActive && !isExpired ? "Active" : "Closed"}
                    </Badge>
                    {poll.votingType === "ranked_choice" && (
                      <Badge variant="outline" data-testid="badge-voting-type">Ranked Choice</Badge>
                    )}
                    {poll.isBlockchainVerified && (
                      <Badge variant="outline" data-testid="badge-blockchain">Blockchain Verified</Badge>
                    )}
                  </div>
                </div>
              </div>
              {canClosePoll && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClosePoll}
                  disabled={closePollMutation.isPending}
                  data-testid="button-close-poll"
                >
                  <X className="h-4 w-4 mr-2" />
                  {closePollMutation.isPending ? "Closing..." : "Close Poll"}
                </Button>
              )}
            </div>
            
            {poll.description && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-slate-700" data-testid="text-poll-description">
                  {poll.description}
                </p>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {hasVoted || !canVote ? (
                // Show results
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">Results</h3>
                  {poll.options.map((option) => {
                    const percentage = getOptionPercentage(option.votes);
                    const isMyVote = myVote?.optionId === option.id;
                    
                    return (
                      <div
                        key={option.id}
                        className={`p-4 rounded-lg border-2 ${
                          isMyVote 
                            ? "border-primary bg-primary/5" 
                            : "border-slate-200"
                        }`}
                        data-testid={`option-result-${option.id}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-slate-900">
                            {option.text}
                            {isMyVote && <span className="text-primary ml-2">✓</span>}
                          </span>
                          <div className="text-right">
                            <span className="text-lg font-semibold text-slate-600">
                              {percentage}%
                            </span>
                            <div className="text-xs text-slate-500">
                              {option.votes} votes
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${
                              isMyVote ? "bg-primary" : "bg-slate-400"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Show voting interface
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Cast Your Vote</h3>
                  <RadioGroup
                    value={selectedOption}
                    onValueChange={setSelectedOption}
                    data-testid="radio-group-vote"
                  >
                    {poll.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center space-x-3 p-4 rounded-lg border-2 border-slate-200 hover:border-slate-300 cursor-pointer"
                        data-testid={`option-vote-${option.id}`}
                      >
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer text-lg">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  
                  <Button
                    onClick={handleVote}
                    disabled={!selectedOption || voteMutation.isPending}
                    className="w-full"
                    size="lg"
                    data-testid="button-cast-vote"
                  >
                    {voteMutation.isPending ? "Submitting..." : "Cast Vote"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator className="mb-6" />

        {/* Comments Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900" data-testid="heading-comments">
            Discussion ({comments.length})
          </h2>

          {/* Add Comment */}
          {user && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Share your thoughts on this poll..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    data-testid="textarea-comment"
                  />
                  <Button
                    onClick={handleComment}
                    disabled={!commentText.trim() || commentMutation.isPending}
                    data-testid="button-post-comment"
                  >
                    {commentMutation.isPending ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-slate-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p data-testid="text-no-comments">No comments yet. Be the first to share your thoughts!</p>
                </CardContent>
              </Card>
            ) : (
              comments.map((comment) => (
                <Card key={comment.id} data-testid={`comment-${comment.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-sm text-primary-foreground font-medium">
                          {comment.author.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-slate-900" data-testid={`text-comment-author-${comment.id}`}>
                            {comment.author.username}
                          </span>
                          <span className="text-sm text-slate-500">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p className="text-slate-700" data-testid={`text-comment-content-${comment.id}`}>
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}