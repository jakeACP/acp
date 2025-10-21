import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminNavigation } from "@/components/admin-navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminModerationPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [actionTaken, setActionTaken] = useState("");

  const { data: flaggedContent, isLoading } = useQuery({
    queryKey: ['/api/admin/flagged-content', statusFilter],
    queryFn: () => fetch(`/api/admin/flagged-content?status=${statusFilter}`).then(res => res.json()),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, actionTaken, reviewNote }: any) => {
      return await apiRequest(`/api/admin/flagged-content/${id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, actionTaken, reviewNote }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/flagged-content'] });
      toast({ title: "Content reviewed successfully" });
      setReviewingId(null);
      setReviewNote("");
      setActionTaken("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error reviewing content", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleReview = (id: string, status: string) => {
    reviewMutation.mutate({ id, status, actionTaken, reviewNote });
  };

  const getFlagTypeBadge = (flagType: string) => {
    const colors: Record<string, string> = {
      spam: "bg-yellow-500",
      hate_speech: "bg-red-500",
      nudity: "bg-purple-500",
      crime: "bg-orange-500",
      misinformation: "bg-blue-500",
      other: "bg-gray-500",
    };
    return colors[flagType] || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Content Moderation</h1>
          <p className="text-muted-foreground mt-2">Review flagged content</p>
        </div>

        <div className="mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="action_taken">Action Taken</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading flagged content...</p>
          </div>
        ) : flaggedContent && flaggedContent.length > 0 ? (
          <div className="space-y-4">
            {flaggedContent.map((item: any) => (
              <Card key={item.id} data-testid={`card-flagged-${item.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Flagged {item.contentType}
                      </CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge className={getFlagTypeBadge(item.flagType)}>
                          {item.flagType.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">{item.status}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Reason:</p>
                      <p className="text-sm text-muted-foreground">{item.reason || "No reason provided"}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Content ID:</p>
                      <p className="text-sm font-mono text-muted-foreground">{item.contentId}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Flagged at:</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {reviewingId === item.id ? (
                      <div className="space-y-4 border-t pt-4">
                        <div>
                          <label className="text-sm font-medium">Action Taken:</label>
                          <Select value={actionTaken} onValueChange={setActionTaken}>
                            <SelectTrigger data-testid="select-action">
                              <SelectValue placeholder="Select action" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="removed">Content Removed</SelectItem>
                              <SelectItem value="warning_sent">Warning Sent</SelectItem>
                              <SelectItem value="user_banned">User Banned</SelectItem>
                              <SelectItem value="no_action">No Action</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Review Note:</label>
                          <Textarea
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="Add your review notes..."
                            data-testid="input-review-note"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleReview(item.id, "action_taken")}
                            disabled={reviewMutation.isPending}
                            data-testid="button-approve"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve Action
                          </Button>
                          <Button
                            onClick={() => handleReview(item.id, "dismissed")}
                            variant="outline"
                            disabled={reviewMutation.isPending}
                            data-testid="button-dismiss"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Dismiss
                          </Button>
                          <Button
                            onClick={() => {
                              setReviewingId(null);
                              setReviewNote("");
                              setActionTaken("");
                            }}
                            variant="ghost"
                            disabled={reviewMutation.isPending}
                            data-testid="button-cancel"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : item.status === "pending" ? (
                      <Button
                        onClick={() => setReviewingId(item.id)}
                        data-testid="button-review"
                      >
                        Review
                      </Button>
                    ) : (
                      item.reviewNote && (
                        <div className="border-t pt-4">
                          <p className="text-sm font-medium">Review Note:</p>
                          <p className="text-sm text-muted-foreground">{item.reviewNote}</p>
                          {item.actionTaken && (
                            <>
                              <p className="text-sm font-medium mt-2">Action:</p>
                              <p className="text-sm text-muted-foreground">{item.actionTaken}</p>
                            </>
                          )}
                        </div>
                      )
                    )}
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
