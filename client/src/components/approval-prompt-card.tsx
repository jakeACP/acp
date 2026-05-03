import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, X, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

type ApprovalPrompt = {
  id: string;
  fullName: string;
  party: string | null;
  photoUrl: string | null;
  positionTitle: string | null;
  office: string | null;
};

type ApprovalStats = {
  approveCount: number;
  disapproveCount: number;
  total: number;
  approvalPct: number;
};

function getPartyVariant(party: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!party) return "secondary";
  const p = party.toLowerCase();
  if (p.includes("democrat")) return "default";
  if (p.includes("republican")) return "destructive";
  return "secondary";
}

function SingleApprovalPrompt({
  prompt,
  onDismiss,
}: {
  prompt: ApprovalPrompt;
  onDismiss: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [localVote, setLocalVote] = useState<string | null>(null);
  const [localStats, setLocalStats] = useState<ApprovalStats | null>(null);

  const voteMutation = useMutation({
    mutationFn: async (vote: string) => {
      const res = await apiRequest("POST", "/api/approval/vote", {
        politicianProfileId: prompt.id,
        vote,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setLocalVote(data.userVote);
      setLocalStats(data.stats);
      queryClient.invalidateQueries({ queryKey: ["/api/approval/feed-prompts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approval", prompt.id] });
    },
  });

  const initials = prompt.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (localVote && localStats) {
    const approvalWidth = `${localStats.approvalPct}%`;
    const disapprovalWidth = `${100 - localStats.approvalPct}%`;
    return (
      <Card className="floating-card bg-card border border-border mb-4 md:mb-0">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={prompt.photoUrl ?? undefined} alt={prompt.fullName} />
              <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Link href={`/politicians/${prompt.id}`}>
                <p className="font-semibold text-sm hover:underline cursor-pointer truncate">{prompt.fullName}</p>
              </Link>
              {prompt.office && <p className="text-xs text-muted-foreground truncate">{prompt.office}</p>}
            </div>
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3 text-green-500" />
                {localStats.approveCount.toLocaleString()} approve ({localStats.approvalPct}%)
              </span>
              <span className="flex items-center gap-1">
                <ThumbsDown className="h-3 w-3 text-red-500" />
                {localStats.disapproveCount.toLocaleString()} disapprove
              </span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              <div className="bg-green-500 transition-all duration-500" style={{ width: approvalWidth }} />
              <div className="bg-red-500 transition-all duration-500" style={{ width: disapprovalWidth }} />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">
              {localStats.total.toLocaleString()} total votes
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="floating-card bg-card border border-border mb-4 md:mb-0">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 flex-shrink-0">
            <AvatarImage src={prompt.photoUrl ?? undefined} alt={prompt.fullName} />
            <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/politicians/${prompt.id}`}>
                  <p className="font-semibold text-sm hover:underline cursor-pointer leading-tight">{prompt.fullName}</p>
                </Link>
                {prompt.office && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{prompt.office}</p>
                )}
                {prompt.party && (
                  <Badge variant={getPartyVariant(prompt.party)} className="text-xs mt-1 h-5 px-1.5">
                    {prompt.party}
                  </Badge>
                )}
              </div>
              <button
                onClick={() => onDismiss(prompt.id)}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs font-medium text-foreground mt-2 mb-2">Do you approve?</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-8 border-green-500/40 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 hover:border-green-500"
                onClick={() => voteMutation.mutate("approve")}
                disabled={voteMutation.isPending}
              >
                <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-8 border-red-500/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-500"
                onClick={() => voteMutation.mutate("disapprove")}
                disabled={voteMutation.isPending}
              >
                <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />
                Disapprove
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApprovalPromptCard() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: prompts = [] } = useQuery<ApprovalPrompt[]>({
    queryKey: ["/api/approval/feed-prompts"],
    enabled: !!user,
  });

  const visiblePrompts = prompts.filter((p) => !dismissed.has(p.id));

  if (!user || visiblePrompts.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1 mb-2">
        <ThumbsUp className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Community Approval Ratings</span>
        <span className="text-xs text-muted-foreground ml-auto">Rate your representatives</span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {visiblePrompts.map((prompt) => (
          <SingleApprovalPrompt
            key={prompt.id}
            prompt={prompt}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  );
}
