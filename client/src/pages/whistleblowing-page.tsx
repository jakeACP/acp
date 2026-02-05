import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { sanitizeUrl } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ThumbsUp, ThumbsDown, ExternalLink, FileText, Clock } from "lucide-react";
import type { WhistleblowingPost } from "@shared/schema";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

type WhistleblowingPostWithVote = WhistleblowingPost & {
  myVote?: { vote: string } | null;
};

export default function WhistleblowingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<"recent" | "credibility">("credibility");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");

  const { data: posts = [], isLoading } = useQuery<WhistleblowingPostWithVote[]>({
    queryKey: ["/api/whistleblowing", { sortBy }],
    queryFn: async () => {
      const posts = await fetch(`/api/whistleblowing?sortBy=${sortBy}`).then(r => r.json());
      if (user) {
        // Fetch votes for each post
        const postsWithVotes = await Promise.all(
          posts.map(async (post: WhistleblowingPost) => {
            try {
              const vote = await fetch(`/api/whistleblowing/${post.id}/my-vote`).then(r => r.json());
              return { ...post, myVote: vote };
            } catch {
              return { ...post, myVote: null };
            }
          })
        );
        return postsWithVotes;
      }
      return posts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; link?: string }) => {
      return apiRequest("/api/whistleblowing", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whistleblowing"] });
      toast({ title: "Success", description: "Whistleblowing report submitted successfully" });
      setTitle("");
      setDescription("");
      setLink("");
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to submit report", variant: "destructive" });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ postId, vote }: { postId: string; vote: "credible" | "not_credible" }) => {
      return apiRequest(`/api/whistleblowing/${postId}/vote`, "POST", { vote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whistleblowing"] });
      toast({ title: "Vote recorded", description: "Your credibility vote has been recorded" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to record vote", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      toast({ title: "Error", description: "Title and description are required", variant: "destructive" });
      return;
    }
    createMutation.mutate({ title, description, link: link || undefined });
  };

  const getCredibilityPercentage = (post: WhistleblowingPost) => {
    const total = post.credibleVotes + post.notCredibleVotes;
    if (total === 0) return 0;
    return Math.round((post.credibleVotes / total) * 100);
  };

  const getCredibilityColor = (percentage: number) => {
    if (percentage >= 70) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Whistleblowing Reports</h1>
        </div>
        <p className="text-muted-foreground">
          Expose corruption and wrongdoing. The community determines credibility through voting.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        {user && (
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "outline" : "default"}
            data-testid="button-toggle-form"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {showForm ? "Cancel" : "Submit Report"}
          </Button>
        )}

        <div className="flex gap-2">
          <Button
            variant={sortBy === "credibility" ? "default" : "outline"}
            onClick={() => setSortBy("credibility")}
            size="sm"
            data-testid="button-sort-credibility"
          >
            Most Credible
          </Button>
          <Button
            variant={sortBy === "recent" ? "default" : "outline"}
            onClick={() => setSortBy("recent")}
            size="sm"
            data-testid="button-sort-recent"
          >
            <Clock className="h-4 w-4 mr-1" />
            Recent
          </Button>
        </div>
      </div>

      {/* Creation Form */}
      {showForm && user && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Submit Whistleblowing Report</CardTitle>
            <CardDescription>
              Provide evidence of corruption or wrongdoing. Be specific and include links to supporting documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary of the issue"
                  required
                  maxLength={200}
                  data-testid="input-title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description of the corruption, wrongdoing, or evidence..."
                  rows={8}
                  required
                  data-testid="textarea-description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Supporting Link</label>
                <Input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://example.com/evidence"
                  type="url"
                  data-testid="input-link"
                />
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full"
                data-testid="button-submit"
              >
                {createMutation.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Post List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading reports...</div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No whistleblowing reports yet. Be the first to expose corruption!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => {
            const credibilityPercent = getCredibilityPercentage(post);
            const totalVotes = post.credibleVotes + post.notCredibleVotes;

            return (
              <Card key={post.id} data-testid={`whistleblowing-post-${post.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{post.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(post.createdAt!), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Credibility Badge */}
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        className={`${getCredibilityColor(credibilityPercent)} text-white px-3 py-1`}
                        data-testid={`credibility-badge-${post.id}`}
                      >
                        {credibilityPercent}% Credible
                      </Badge>
                      <span className="text-xs text-muted-foreground">{totalVotes} votes</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-foreground mb-4 whitespace-pre-wrap">{post.description}</p>

                  {/* Supporting Link */}
                  {post.link && (
                    <a
                      href={sanitizeUrl(post.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline mb-4"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Supporting Evidence
                    </a>
                  )}

                  {/* Documents */}
                  {post.documents && post.documents.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Documents:</p>
                      {post.documents.map((doc, idx) => (
                        <a
                          key={idx}
                          href={sanitizeUrl(doc.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {doc.name}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Voting Buttons */}
                  {user && (
                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        variant={post.myVote?.vote === "credible" ? "default" : "outline"}
                        size="sm"
                        onClick={() => voteMutation.mutate({ postId: post.id, vote: "credible" })}
                        disabled={voteMutation.isPending}
                        className="flex-1"
                        data-testid={`button-credible-${post.id}`}
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Credible ({post.credibleVotes})
                      </Button>
                      <Button
                        variant={post.myVote?.vote === "not_credible" ? "default" : "outline"}
                        size="sm"
                        onClick={() => voteMutation.mutate({ postId: post.id, vote: "not_credible" })}
                        disabled={voteMutation.isPending}
                        className="flex-1"
                        data-testid={`button-not-credible-${post.id}`}
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Not Credible ({post.notCredibleVotes})
                      </Button>
                    </div>
                  )}

                  {!user && (
                    <div className="pt-4 border-t text-center">
                      <Link href="/login">
                        <Button variant="outline" size="sm">
                          Sign in to vote on credibility
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
