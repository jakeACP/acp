import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Poll } from "@shared/schema";
import { 
  Trophy, 
  Clock, 
  Users, 
  BarChart3, 
  Shield, 
  GripVertical, 
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PollAnalytics } from "./poll-analytics";

interface RankedChoicePollProps {
  poll: Poll;
}

export function RankedChoicePoll({ poll }: RankedChoicePollProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rankedChoices, setRankedChoices] = useState<string[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Check if user has voted
  const { data: userVote } = useQuery({
    queryKey: ["/api/polls", poll.id, "user-vote"],
    enabled: !!user && !!poll.id,
  });

  const { data: rankedResults } = useQuery({
    queryKey: ["/api/polls", poll.id, "ranked-results"],
    enabled: !!poll.id,
  });

  const voteMutation = useMutation({
    mutationFn: async (choices: string[]) => {
      const res = await apiRequest(`/api/polls/${poll.id}/vote-ranked`, "POST", {
        rankedChoices: choices
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls", poll.id] });
      toast({
        title: "Vote Recorded",
        description: data.blockchainHash ? 
          `Your ranked vote has been recorded on the blockchain: ${data.blockchainHash.slice(0, 10)}...` :
          "Your ranked vote has been recorded successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Voting Failed",
        description: error.message || "Failed to record your vote",
        variant: "destructive",
      });
    },
  });

  const moveChoice = useCallback((index: number, direction: 'up' | 'down') => {
    const newChoices = [...rankedChoices];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newChoices.length) {
      [newChoices[index], newChoices[targetIndex]] = [newChoices[targetIndex], newChoices[index]];
      setRankedChoices(newChoices);
    }
  }, [rankedChoices]);

  const addChoice = useCallback((optionId: string) => {
    if (!rankedChoices.includes(optionId)) {
      setRankedChoices([...rankedChoices, optionId]);
    }
  }, [rankedChoices]);

  const removeChoice = useCallback((optionId: string) => {
    setRankedChoices(rankedChoices.filter(id => id !== optionId));
  }, [rankedChoices]);

  const handleSubmitVote = () => {
    if (rankedChoices.length === 0) {
      toast({
        title: "No Choices Selected",
        description: "Please rank at least one option before voting",
        variant: "destructive",
      });
      return;
    }
    voteMutation.mutate(rankedChoices);
  };

  const getOptionText = (optionId: string) => {
    return poll.options?.find(opt => opt.id === optionId)?.text || optionId;
  };

  const getRankNumber = (optionId: string) => {
    return rankedChoices.indexOf(optionId) + 1;
  };

  const totalVotes = poll.totalVotes || 0;
  const hasVoted = !!userVote;

  if (showAnalytics) {
    return <PollAnalytics poll={poll} />;
  }

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-purple-800">{poll.title}</CardTitle>
            <Badge variant="outline" className="border-purple-500 text-purple-700">
              Ranked Choice
            </Badge>
            {poll.isBlockchainVerified && (
              <Badge variant="outline" className="border-green-500 text-green-700">
                <Shield className="h-3 w-3 mr-1" />
                Blockchain
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(true)}
              className="flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              Analytics
            </Button>
            
            <Badge variant={poll.isActive ? "default" : "secondary"}>
              {poll.isActive ? "Active" : "Closed"}
            </Badge>
          </div>
        </div>

        {poll.description && (
          <p className="text-gray-600 mt-2">{poll.description}</p>
        )}

        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>{totalVotes} votes</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>
              {poll.endDate ? (
                poll.isActive ? 
                  `Ends ${formatDistanceToNow(new Date(poll.endDate), { addSuffix: true })}` :
                  `Ended ${formatDistanceToNow(new Date(poll.endDate), { addSuffix: true })}`
              ) : (
                poll.createdAt ? `Created ${formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true })}` : 'Recently created'
              )}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!hasVoted && poll.isActive ? (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">How Ranked Choice Voting Works</h4>
              <p className="text-sm text-purple-700 mb-2">
                Rank the options in order of your preference. If no option gets a majority, 
                the least popular option is eliminated and votes are redistributed until there's a winner.
              </p>
              <p className="text-xs text-purple-600">
                You can rank as many or as few options as you want.
              </p>
            </div>

            {/* Available Options */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Available Options</h4>
              <div className="grid gap-2">
                {poll.options?.map((option) => (
                  <div
                    key={option.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      rankedChoices.includes(option.id)
                        ? 'border-purple-300 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-200 hover:bg-purple-25'
                    }`}
                    onClick={() => 
                      rankedChoices.includes(option.id) 
                        ? removeChoice(option.id) 
                        : addChoice(option.id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className={rankedChoices.includes(option.id) ? 'text-purple-800 font-medium' : 'text-gray-900'}>
                        {option.text}
                      </span>
                      {rankedChoices.includes(option.id) && (
                        <Badge variant="outline" className="border-purple-500 text-purple-700">
                          #{getRankNumber(option.id)}
                        </Badge>
                      )}
                    </div>
                  </div>
                )) || []}
              </div>
            </div>

            {/* Ranked Choices */}
            {rankedChoices.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Your Ranking (drag to reorder)</h4>
                <div className="space-y-2">
                  {rankedChoices.map((optionId, index) => (
                    <div
                      key={optionId}
                      className="flex items-center space-x-3 p-3 bg-purple-50 border border-purple-200 rounded-lg"
                    >
                      <div className="flex flex-col space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveChoice(index, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveChoice(index, 'down')}
                          disabled={index === rankedChoices.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-3 flex-1">
                        <Badge className="bg-purple-600 text-white min-w-[24px] h-6 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <span className="font-medium text-purple-800">
                          {getOptionText(optionId)}
                        </span>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChoice(optionId)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Vote */}
            <div className="flex justify-end space-x-2">
              <Button
                onClick={handleSubmitVote}
                disabled={voteMutation.isPending || rankedChoices.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {voteMutation.isPending ? "Recording Vote..." : "Submit Ranked Vote"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {hasVoted && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 text-green-700 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">You've voted in this poll</span>
                </div>
                {userVote?.rankedChoices && (
                  <div className="text-sm text-green-600">
                    <p className="mb-1">Your ranking:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      {userVote.rankedChoices.map((optionId: string, index: number) => (
                        <li key={optionId}>{getOptionText(optionId)}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* Current Results */}
            {rankedResults && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Instant Runoff Results</h4>
                
                {rankedResults.winner && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Trophy className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-purple-800">Winner</span>
                    </div>
                    <p className="text-lg font-bold text-purple-900">
                      {getOptionText(rankedResults.winner)}
                    </p>
                    <p className="text-sm text-purple-700">
                      Won after {rankedResults.rounds?.length || 0} elimination rounds
                    </p>
                  </div>
                )}

                {/* Simple vote display for now */}
                <div className="space-y-2">
                  {poll.options?.map((option) => {
                    const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                    return (
                      <div key={option.id} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{option.text}</span>
                          <span className="text-sm text-gray-600">
                            {option.votes} votes ({percentage}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  }) || []}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}