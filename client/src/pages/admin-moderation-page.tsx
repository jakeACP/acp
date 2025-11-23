import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminNavigation } from "@/components/admin-navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Flag, ThumbsDown, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminModerationPage() {
  const { toast } = useToast();

  const { data: flaggedContent, isLoading } = useQuery({
    queryKey: ['/api/admin/flagged-content'],
    queryFn: () => fetch(`/api/admin/flagged-content`).then(res => res.json()),
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      return await apiRequest(`/api/posts/${postId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/flagged-content'] });
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      toast({ title: "Post removed successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error removing post", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleDeletePost = (postId: string) => {
    if (confirm("Are you sure you want to permanently delete this post?")) {
      deletePostMutation.mutate(postId);
    }
  };

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      spam: "bg-yellow-600 text-white",
      harassment: "bg-red-600 text-white",
      inappropriate_content: "bg-orange-600 text-white",
      misinformation: "bg-blue-600 text-white",
      not_interested: "bg-gray-500 text-white",
    };
    return colors[reason] || "bg-gray-500 text-white";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Content Moderation</h1>
          <p className="text-muted-foreground mt-2">Review flagged posts (sorted by urgency)</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading flagged content...</p>
          </div>
        ) : flaggedContent && flaggedContent.length > 0 ? (
          <div className="space-y-4">
            {flaggedContent.map((item: any) => (
              <Card key={item.postId} data-testid={`card-flagged-${item.postId}`} className="border-l-4 border-l-destructive">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Flagged Post
                      </CardTitle>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <Badge className="bg-red-600 text-white">
                          <Flag className="h-3 w-3 mr-1" />
                          {item.reportCount} Reports
                        </Badge>
                        <Badge className="bg-gray-600 text-white">
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          {item.dislikeCount} Dislikes
                        </Badge>
                        <Badge variant="outline" className="font-bold">
                          Total Urgency: {item.totalUrgency}
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {item.reasons.map((reason: string) => (
                          <Badge key={reason} className={getReasonBadge(reason)}>
                            {reason.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePost(item.postId)}
                      disabled={deletePostMutation.isPending}
                      data-testid={`button-delete-${item.postId}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Post
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {item.post.authorFirstName} {item.post.authorLastName} (@{item.post.authorUsername})
                        </p>
                        <span className="text-xs text-muted-foreground">
                          · {new Date(item.post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{item.post.content}</p>
                      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                        <span>{item.post.likesCount} likes</span>
                        <span>{item.post.commentsCount} comments</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium">First Flagged:</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.firstFlaggedAt).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Post ID:</p>
                      <p className="text-sm font-mono text-muted-foreground">{item.postId}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No flagged content found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
