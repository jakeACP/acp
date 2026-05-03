import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PLEDGE_DEFINITIONS } from "@shared/schema";
import { Shield, Clock, CheckCircle, XCircle, Loader2, UserCircle, Award } from "lucide-react";

type PledgeRequestRow = {
  id: string;
  userId: string;
  pledgeId: string;
  statement: string;
  status: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  username: string | null;
  userAvatar: string | null;
  userRole: string | null;
};

export default function AdminPledgeRequestsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [reviewing, setReviewing] = useState<PledgeRequestRow | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data: requests = [], isLoading } = useQuery<PledgeRequestRow[]>({
    queryKey: ["/api/admin/pledges", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/pledges?status=${statusFilter}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pledge requests");
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note: string }) => {
      return apiRequest(`/api/admin/pledges/${id}/review`, "POST", { status, reviewNote: note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pledges"] });
      toast({ title: "Pledge request reviewed" });
      setReviewing(null);
      setReviewNote("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getPledgeDef = (pledgeId: string) => PLEDGE_DEFINITIONS.find((p) => p.id === pledgeId);

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</Badge>;
    if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>;
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminNavigation />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="h-6 w-6 text-blue-600" />
              Pledge Requests
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Review and approve civic pledge submissions from users.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">{requests.length} result{requests.length !== 1 ? "s" : ""}</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-gray-500">
                No {statusFilter} pledge requests.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const pledgeDef = getPledgeDef(req.pledgeId);
                return (
                  <Card key={req.id} className="border dark:border-gray-700">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={req.userAvatar || undefined} />
                          <AvatarFallback><UserCircle className="h-5 w-5" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 dark:text-white">@{req.username || "unknown"}</span>
                            <Badge variant="outline" className="text-xs capitalize">{req.userRole}</Badge>
                            {statusBadge(req.status)}
                          </div>
                          <div className="mt-2">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {pledgeDef?.name || req.pledgeId}
                            </span>
                            {pledgeDef && (
                              <p className="text-xs text-gray-400 mt-0.5">{pledgeDef.description}</p>
                            )}
                          </div>
                          <blockquote className="mt-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 italic">
                            "{req.statement}"
                          </blockquote>
                          {req.reviewNote && (
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <strong>Review note:</strong> {req.reviewNote}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-gray-400">
                            Submitted {new Date(req.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {req.status === "pending" && (
                          <Button size="sm" onClick={() => { setReviewing(req); setReviewNote(""); }}>
                            Review
                          </Button>
                        )}
                        {req.status !== "pending" && (
                          <Button size="sm" variant="outline" onClick={() => { setReviewing(req); setReviewNote(req.reviewNote || ""); }}>
                            Re-review
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!reviewing} onOpenChange={(o) => { if (!o) { setReviewing(null); setReviewNote(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Pledge Request</DialogTitle>
            <DialogDescription>
              {reviewing && (
                <>
                  <strong>@{reviewing.username}</strong> — {getPledgeDef(reviewing.pledgeId)?.name || reviewing.pledgeId}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              <blockquote className="pl-3 border-l-2 border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 italic">
                "{reviewing.statement}"
              </blockquote>
              <div>
                <label className="text-sm font-medium block mb-1">Review Note (optional)</label>
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Add a note for the user..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setReviewing(null); setReviewNote(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={reviewMutation.isPending}
              onClick={() => reviewing && reviewMutation.mutate({ id: reviewing.id, status: "rejected", note: reviewNote })}
            >
              {reviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={reviewMutation.isPending}
              onClick={() => reviewing && reviewMutation.mutate({ id: reviewing.id, status: "approved", note: reviewNote })}
            >
              {reviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
