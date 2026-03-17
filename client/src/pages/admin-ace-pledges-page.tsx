import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BadgeCheck, Shield, Clock, CheckCircle, XCircle, ExternalLink, Loader2 } from "lucide-react";

type EnrichedPledge = {
  id: string;
  politicianId: string;
  politicianName: string;
  sigId: string;
  sigName: string;
  videoUrl: string;
  status: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminAcePledgesPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [reviewingPledge, setReviewingPledge] = useState<EnrichedPledge | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data: pledges = [], isLoading } = useQuery<EnrichedPledge[]>({
    queryKey: ["/api/admin/ace-pledges", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ace-pledges?status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to fetch pledges");
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ pledgeId, status, note }: { pledgeId: string; status: string; note: string }) => {
      return apiRequest(`/api/admin/ace-pledges/${pledgeId}/review`, "POST", { status, reviewNote: note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ace-pledges"] });
      toast({ title: "Pledge reviewed successfully" });
      setReviewingPledge(null);
      setReviewNote("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</Badge>;
    if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pending</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BadgeCheck className="w-6 h-6 text-blue-500" />
              ACE Pledge Reviews
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review and approve Anti-Corruption Endorsement pledge submissions from candidates.
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : pledges.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No {statusFilter} ACE pledge requests.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pledges.map((pledge) => (
              <Card key={pledge.id}>
                <CardContent className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{pledge.politicianName || `Politician #${pledge.politicianId}`}</span>
                      <span className="text-muted-foreground text-sm">→</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />{pledge.sigName || `SIG #${pledge.sigId}`}
                      </span>
                      {statusBadge(pledge.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(pledge.createdAt).toLocaleDateString()}
                    </p>
                    {pledge.reviewNote && (
                      <p className="text-xs text-muted-foreground italic">Note: {pledge.reviewNote}</p>
                    )}
                    {pledge.videoUrl && (
                      <a
                        href={pledge.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> View pledge video
                      </a>
                    )}
                  </div>
                  {pledge.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setReviewingPledge(pledge); setReviewNote(""); }}
                    >
                      Review
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!reviewingPledge} onOpenChange={(open) => { if (!open) setReviewingPledge(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review ACE Pledge</DialogTitle>
          </DialogHeader>
          {reviewingPledge && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                <p><span className="font-medium">Candidate:</span> {reviewingPledge.politicianName}</p>
                <p><span className="font-medium">ACE SIG:</span> {reviewingPledge.sigName}</p>
                {reviewingPledge.videoUrl && (
                  <a
                    href={reviewingPledge.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Watch pledge video
                  </a>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Review Note (optional)</label>
                <Textarea
                  placeholder="Add a note for the candidate..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewingPledge(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate({ pledgeId: reviewingPledge!.id, status: "rejected", note: reviewNote })}
            >
              {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
              Reject
            </Button>
            <Button
              disabled={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate({ pledgeId: reviewingPledge!.id, status: "approved", note: reviewNote })}
            >
              {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Approve & Grant Badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
