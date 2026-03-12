import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Flag, ShieldAlert, CheckCircle2, X, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";

type EnrichedFlag = {
  id: string;
  politicianId: string;
  politicianName: string;
  tradeId: string;
  ticker: string;
  transactionDate: string;
  tradeType: string | null;
  amount: string | null;
  reason: string;
  evidenceUrl: string | null;
  status: string;
  flaggedBy: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export default function AdminTradingFlagsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [reviewingFlag, setReviewingFlag] = useState<EnrichedFlag | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [demeritLabel, setDemeritLabel] = useState("");
  const [demeritDescription, setDemeritDescription] = useState("");

  const { data: flags = [], isLoading } = useQuery<EnrichedFlag[]>({
    queryKey: ['/api/admin/trading-flags', statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/trading-flags?status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to fetch flags");
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ flagId, status, note }: { flagId: string; status: string; note: string }) => {
      return apiRequest(`/api/admin/trading-flags/${flagId}/review`, "POST", { status, reviewNote: note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trading-flags'] });
      toast({ title: "Flag reviewed" });
    },
  });

  const demeritMutation = useMutation({
    mutationFn: async ({ politicianId, label, description, flagId }: { politicianId: string; label: string; description: string; flagId: string }) => {
      return apiRequest(`/api/admin/politician-profiles/${politicianId}/demerits`, "POST", {
        type: "insider_trading",
        label,
        description,
        flagId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trading-flags'] });
      toast({ title: "Demerit assigned", description: "Demerit tag has been added to the politician's profile." });
      setReviewingFlag(null);
      setDemeritLabel("");
      setDemeritDescription("");
      setReviewNote("");
    },
  });

  const handleApproveWithDemerit = () => {
    if (!reviewingFlag || !demeritLabel || !demeritDescription) return;
    reviewMutation.mutate({
      flagId: reviewingFlag.id,
      status: "approved",
      note: reviewNote,
    }, {
      onSuccess: () => {
        demeritMutation.mutate({
          politicianId: reviewingFlag.politicianId,
          label: demeritLabel,
          description: demeritDescription,
          flagId: reviewingFlag.id,
        });
      },
    });
  };

  const handleReject = (flag: EnrichedFlag) => {
    reviewMutation.mutate({ flagId: flag.id, status: "rejected", note: "" });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
      case "approved": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
      case "rejected": return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              Trading Flag Review
            </CardTitle>
            <CardDescription>Review user-submitted insider trading flags and assign demerits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-6">
              {["pending", "approved", "rejected"].map(s => (
                <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)} className="capitalize">
                  {s}
                </Button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : flags.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No {statusFilter} flags</p>
            ) : (
              <div className="space-y-3">
                {flags.map(flag => (
                  <div key={flag.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{flag.ticker}</span>
                        <Badge className={statusColor(flag.status)}>{flag.status}</Badge>
                        {flag.tradeType && <span className="text-xs text-slate-500 capitalize">{flag.tradeType}</span>}
                      </div>
                      <span className="text-xs text-slate-400">{flag.createdAt ? format(new Date(flag.createdAt), "PPp") : ""}</span>
                    </div>
                    <p className="text-sm"><span className="font-medium">Politician:</span> {flag.politicianName}</p>
                    <p className="text-sm"><span className="font-medium">Trade Date:</span> {flag.transactionDate} · <span className="font-medium">Amount:</span> {flag.amount || "—"}</p>
                    <p className="text-sm"><span className="font-medium">Reason:</span> {flag.reason}</p>
                    {flag.evidenceUrl && (
                      <a href={flag.evidenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <ExternalLink className="w-3 h-3" /> Evidence link
                      </a>
                    )}
                    {flag.reviewNote && <p className="text-xs text-slate-500 italic">Review note: {flag.reviewNote}</p>}

                    {flag.status === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="destructive" onClick={() => handleReject(flag)} disabled={reviewMutation.isPending}>
                          <X className="w-3.5 h-3.5 mr-1" />Reject
                        </Button>
                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { setReviewingFlag(flag); setDemeritLabel("Insider Trading"); setDemeritDescription(`Flagged trade: ${flag.ticker} on ${flag.transactionDate}`); }}>
                          <ShieldAlert className="w-3.5 h-3.5 mr-1" />Approve & Assign Demerit
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!reviewingFlag} onOpenChange={(open) => { if (!open) setReviewingFlag(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500" /> Approve Flag & Assign Demerit</DialogTitle>
          </DialogHeader>
          {reviewingFlag && (
            <div className="space-y-4">
              <div className="rounded border bg-slate-50 dark:bg-slate-800 p-3 text-sm">
                <p><span className="font-medium">Politician:</span> {reviewingFlag.politicianName}</p>
                <p><span className="font-medium">Trade:</span> {reviewingFlag.ticker} · {reviewingFlag.transactionDate}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Demerit Label (shown as tag) *</label>
                <Input value={demeritLabel} onChange={e => setDemeritLabel(e.target.value)} placeholder="e.g., Insider Trading" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Description *</label>
                <Textarea value={demeritDescription} onChange={e => setDemeritDescription(e.target.value)} placeholder="Explain the demerit..." rows={3} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Review Note (optional)</label>
                <Input value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Internal note..." className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingFlag(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={!demeritLabel || !demeritDescription || demeritMutation.isPending || reviewMutation.isPending} onClick={handleApproveWithDemerit}>
              {demeritMutation.isPending || reviewMutation.isPending ? "Processing..." : "Approve & Assign Demerit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
