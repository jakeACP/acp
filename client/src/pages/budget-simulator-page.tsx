import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Lock,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCcw,
  Save,
  Share2,
  DollarSign,
  Info,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface Category {
  id: string;
  name: string;
  amountBillions: number;
  isLocked: boolean;
  lockedTooltip?: string | null;
  sortOrder: number;
  colorHex?: string | null;
}

interface Baseline {
  id: string;
  fiscalYear: number;
  sourceName: string;
  sourceUrl?: string | null;
  totalOutlays: number;
  totalReceipts: number;
  deficit: number;
  categories: Category[];
}

type Step = "intro" | "simulator" | "results";

function formatBillions(b: number): string {
  if (Math.abs(b) >= 1000) {
    return `$${(b / 1000).toFixed(2)}T`;
  }
  return `$${b.toFixed(0)}B`;
}

function derivePhilosophyLabel(
  adjustments: Record<string, number>,
  categories: Category[],
  proposedTotal: number,
  baselineTotal: number,
  estimatedDeficit: number,
): string {
  const getSocialAvg = () => {
    const social = categories.filter((c) =>
      ["Social Security", "Medicare", "Medicaid & CHIP", "Education & Job Training", "Veterans Benefits"].some(
        (n) => c.name.includes(n.split(" ")[0])
      )
    );
    if (social.length === 0) return 0;
    return social.reduce((sum, c) => sum + (adjustments[c.id] ?? 0), 0) / social.length;
  };

  const defCat = categories.find((c) => c.name.toLowerCase().includes("defense"));
  const defenseAdj = defCat ? (adjustments[defCat.id] ?? 0) : 0;
  const socialAvg = getSocialAvg();
  const overallAdj = ((proposedTotal - baselineTotal) / baselineTotal) * 100;

  if (estimatedDeficit <= 0) return "Deficit Hawk";
  if (defenseAdj >= 7 && socialAvg >= 5) return "Big Government Spender";
  if (defenseAdj >= 6) return "National Security Hawk";
  if (socialAvg >= 6) return "Progressive";
  if (defenseAdj <= -6 && socialAvg <= -4) return "Libertarian";
  if (defenseAdj <= -5 && socialAvg >= 4) return "Social Democrat";
  if (socialAvg <= -5) return "Fiscal Conservative";
  if (Math.abs(overallAdj) <= 2 && Math.abs(defenseAdj) <= 2 && Math.abs(socialAvg) <= 2) return "Centrist";
  return "Mixed Priorities";
}

function PhilosophyBadge({ label }: { label: string }) {
  const colors: Record<string, string> = {
    "Deficit Hawk": "bg-green-100 text-green-800 border-green-300",
    "National Security Hawk": "bg-red-100 text-red-800 border-red-300",
    Progressive: "bg-blue-100 text-blue-800 border-blue-300",
    Libertarian: "bg-yellow-100 text-yellow-800 border-yellow-300",
    "Social Democrat": "bg-purple-100 text-purple-800 border-purple-300",
    "Fiscal Conservative": "bg-orange-100 text-orange-800 border-orange-300",
    Centrist: "bg-gray-100 text-gray-800 border-gray-300",
    "Big Government Spender": "bg-indigo-100 text-indigo-800 border-indigo-300",
    "Mixed Priorities": "bg-teal-100 text-teal-800 border-teal-300",
  };
  const cls = colors[label] ?? "bg-slate-100 text-slate-800 border-slate-300";
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{label}</span>;
}

function MiniPieChart({ data, height = 180 }: { data: { name: string; value: number; color: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={height / 2 - 10}
          isAnimationActive={true}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <RechartsTooltip
          formatter={(value: number, name: string) => [`$${value.toFixed(0)}B`, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function BudgetSimulatorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("intro");
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [totalGoalAdj, setTotalGoalAdj] = useState(0);
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [savedSimId, setSavedSimId] = useState<string | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: baseline, isLoading } = useQuery<Baseline>({
    queryKey: ["/api/budget/active-baseline"],
  });

  const categories = useMemo(() => baseline?.categories ?? [], [baseline]);

  const proposedAmounts = useMemo(() => {
    const result: Record<string, number> = {};
    categories.forEach((c) => {
      const adj = c.isLocked ? 0 : (adjustments[c.id] ?? 0);
      result[c.id] = c.amountBillions * (1 + adj / 100);
    });
    return result;
  }, [categories, adjustments]);

  const proposedTotal = useMemo(
    () => Object.values(proposedAmounts).reduce((s, v) => s + v, 0),
    [proposedAmounts]
  );

  const baselineTotal = useMemo(
    () => categories.reduce((s, c) => s + c.amountBillions, 0),
    [categories]
  );

  const targetTotal = useMemo(
    () => baselineTotal * (1 + totalGoalAdj / 100),
    [baselineTotal, totalGoalAdj]
  );

  const differenceFromTarget = useMemo(
    () => proposedTotal - targetTotal,
    [proposedTotal, targetTotal]
  );

  const estimatedDeficit = useMemo(() => {
    const receipts = baseline?.totalReceipts ?? 4919;
    return proposedTotal - receipts;
  }, [proposedTotal, baseline]);

  const philosophyLabel = useMemo(
    () =>
      derivePhilosophyLabel(adjustments, categories, proposedTotal, baselineTotal, estimatedDeficit),
    [adjustments, categories, proposedTotal, baselineTotal, estimatedDeficit]
  );

  const pieData = useMemo(
    () =>
      categories.map((c) => ({
        name: c.name,
        value: parseFloat(proposedAmounts[c.id]?.toFixed(1) ?? "0"),
        color: c.colorHex ?? "#94a3b8",
      })),
    [categories, proposedAmounts]
  );

  const sortedChanges = useMemo(() => {
    return categories
      .filter((c) => !c.isLocked)
      .map((c) => ({
        ...c,
        adj: adjustments[c.id] ?? 0,
        absoluteChange: proposedAmounts[c.id] - c.amountBillions,
      }))
      .sort((a, b) => b.absoluteChange - a.absoluteChange);
  }, [categories, adjustments, proposedAmounts]);

  const biggestIncreases = sortedChanges.filter((c) => c.adj > 0).slice(0, 3);
  const biggestCuts = sortedChanges.filter((c) => c.adj < 0).slice(-3).reverse();

  const resetAll = useCallback(() => {
    setAdjustments({});
    setTotalGoalAdj(0);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/budget/simulations", {
        baselineId: baseline!.id,
        totalSpendingAdjustment: totalGoalAdj,
        categoryAdjustmentsJson: adjustments,
        proposedTotal,
        estimatedDeficit,
        philosophyLabel,
        visibility,
      });
    },
    onSuccess: async (res: any) => {
      const data = await res.json();
      setSavedSimId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/budget/simulations/me"] });
      toast({ title: "Simulation saved!", description: "Your budget is now on your profile." });
    },
    onError: () => {
      toast({ title: "Save failed", variant: "destructive" });
    },
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: async (newVis: "public" | "private") => {
      if (!savedSimId) return;
      return apiRequest("PATCH", `/api/budget/simulations/${savedSimId}`, { visibility: newVis });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget/simulations/me"] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading budget data…</p>
        </div>
      </div>
    );
  }

  if (!baseline) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No active baseline found.</p>
      </div>
    );
  }

  if (step === "intro") {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
          <div className="max-w-lg w-full space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-lg">
                <DollarSign className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Build Your Federal Budget</h1>
              <p className="text-muted-foreground text-lg">
                Redesign the U.S. federal budget by adjusting spending across 10 major categories.
                Your results are aggregated with other citizens and sent to your elected representatives.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                  <div>
                    <p className="font-medium text-sm">Adjust spending categories</p>
                    <p className="text-xs text-muted-foreground">Slide each category ±10% from the FY {baseline.fiscalYear} baseline</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                  <div>
                    <p className="font-medium text-sm">Watch your budget change live</p>
                    <p className="text-xs text-muted-foreground">An animated pie chart and live math panel update as you move sliders</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                  <div>
                    <p className="font-medium text-sm">Save & share your result</p>
                    <p className="text-xs text-muted-foreground">Your philosophy label and summary can appear on your profile</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full h-12 text-base"
              onClick={() => setStep("simulator")}
            >
              Start Simulator
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-xs text-muted-foreground text-center px-4">
              Data based on {baseline.sourceName} FY {baseline.fiscalYear} projections.
              This is an educational tool — adjustments are simplified to ±10% per category.
              Actual budget policy involves far more complexity.
            </p>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (step === "results") {
    const baselinePieData = categories.map((c) => ({
      name: c.name,
      value: parseFloat(c.amountBillions.toFixed(1)),
      color: c.colorHex ?? "#94a3b8",
    }));

    return (
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 p-4">
          <div className="max-w-3xl mx-auto space-y-6 py-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep("simulator")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <h2 className="text-2xl font-bold">Your Budget Results</h2>
            </div>

            {/* Philosophy label */}
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
              <CardContent className="pt-6 pb-6 text-center space-y-2">
                <p className="text-blue-100 text-sm uppercase tracking-wide font-medium">Your Budget Philosophy</p>
                <p className="text-3xl font-bold">{philosophyLabel}</p>
                <div className="flex justify-center gap-6 mt-4 text-sm">
                  <div className="text-center">
                    <p className="text-blue-200 text-xs">Proposed Total</p>
                    <p className="font-bold text-lg">{formatBillions(proposedTotal)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-blue-200 text-xs">Baseline</p>
                    <p className="font-bold text-lg">{formatBillions(baselineTotal)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-blue-200 text-xs">{estimatedDeficit >= 0 ? "Est. Deficit" : "Est. Surplus"}</p>
                    <p className={`font-bold text-lg ${estimatedDeficit >= 0 ? "text-red-300" : "text-green-300"}`}>
                      {formatBillions(Math.abs(estimatedDeficit))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Proposed pie */}
              <Card>
                <CardHeader><CardTitle className="text-base">Your Proposed Budget</CardTitle></CardHeader>
                <CardContent>
                  <MiniPieChart data={pieData} height={220} />
                </CardContent>
              </Card>

              {/* Baseline pie */}
              <Card>
                <CardHeader><CardTitle className="text-base">FY {baseline.fiscalYear} Baseline</CardTitle></CardHeader>
                <CardContent>
                  <MiniPieChart data={baselinePieData} height={220} />
                </CardContent>
              </Card>
            </div>

            {/* Comparison table */}
            <Card>
              <CardHeader><CardTitle className="text-base">Baseline vs. Proposed</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 font-medium">Category</th>
                        <th className="text-right py-2 font-medium">Baseline</th>
                        <th className="text-right py-2 font-medium">Proposed</th>
                        <th className="text-right py-2 font-medium">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => {
                        const proposed = proposedAmounts[c.id];
                        const diff = proposed - c.amountBillions;
                        const adj = adjustments[c.id] ?? 0;
                        return (
                          <tr key={c.id} className="border-b last:border-0">
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.colorHex ?? "#94a3b8" }} />
                                <span>{c.name}</span>
                                {c.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                              </div>
                            </td>
                            <td className="text-right py-2 text-muted-foreground">{formatBillions(c.amountBillions)}</td>
                            <td className="text-right py-2 font-medium">{formatBillions(proposed)}</td>
                            <td className={`text-right py-2 font-semibold ${diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : "text-muted-foreground"}`}>
                              {diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${formatBillions(diff)} (${adj > 0 ? "+" : ""}${adj.toFixed(0)}%)`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold border-t-2">
                        <td className="py-2">Total</td>
                        <td className="text-right py-2 text-muted-foreground">{formatBillions(baselineTotal)}</td>
                        <td className="text-right py-2">{formatBillions(proposedTotal)}</td>
                        <td className={`text-right py-2 ${proposedTotal > baselineTotal ? "text-red-600" : "text-green-600"}`}>
                          {proposedTotal === baselineTotal ? "—" : `${proposedTotal > baselineTotal ? "+" : ""}${formatBillions(proposedTotal - baselineTotal)}`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Biggest increases */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-red-500" /> Biggest Increases</CardTitle></CardHeader>
                <CardContent>
                  {biggestIncreases.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No increases made.</p>
                  ) : (
                    <div className="space-y-2">
                      {biggestIncreases.map((c) => (
                        <div key={c.id} className="flex justify-between text-sm">
                          <span>{c.name}</span>
                          <span className="font-semibold text-red-600">+{formatBillions(c.absoluteChange)} (+{c.adj.toFixed(0)}%)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Biggest cuts */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-green-600" /> Biggest Cuts</CardTitle></CardHeader>
                <CardContent>
                  {biggestCuts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No cuts made.</p>
                  ) : (
                    <div className="space-y-2">
                      {biggestCuts.map((c) => (
                        <div key={c.id} className="flex justify-between text-sm">
                          <span>{c.name}</span>
                          <span className="font-semibold text-green-600">{formatBillions(c.absoluteChange)} ({c.adj.toFixed(0)}%)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Save to profile */}
            {user && (
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Save className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-sm">Save to Your Profile</p>
                      <p className="text-xs text-muted-foreground">Show your budget philosophy on your profile page</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      id="visibility-toggle"
                      checked={visibility === "public"}
                      onCheckedChange={(v) => {
                        const next = v ? "public" : "private";
                        setVisibility(next);
                        if (savedSimId) updateVisibilityMutation.mutate(next);
                      }}
                    />
                    <Label htmlFor="visibility-toggle" className="text-sm cursor-pointer">
                      Make public on my profile
                    </Label>
                  </div>

                  {savedSimId ? (
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      Saved! Visit your profile to see the module.
                    </div>
                  ) : (
                    <Button
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      className="w-full"
                    >
                      {saveMutation.isPending ? "Saving…" : "Save My Budget"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Share card */}
            <Card className="border-dashed">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Share2 className="h-4 w-4" /> Summary Card
                </div>
                <div className="bg-white dark:bg-slate-900 border rounded-lg p-4 space-y-2 text-sm">
                  <p className="font-bold text-base">My FY {baseline.fiscalYear} Federal Budget</p>
                  <PhilosophyBadge label={philosophyLabel} />
                  <div className="flex gap-4 mt-2">
                    <div><span className="text-muted-foreground">Proposed:</span> <span className="font-medium">{formatBillions(proposedTotal)}</span></div>
                    <div><span className="text-muted-foreground">{estimatedDeficit >= 0 ? "Deficit:" : "Surplus:"}</span> <span className={`font-medium ${estimatedDeficit >= 0 ? "text-red-600" : "text-green-600"}`}>{formatBillions(Math.abs(estimatedDeficit))}</span></div>
                  </div>
                  {biggestIncreases.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Top increases: {biggestIncreases.map((c) => c.name).join(", ")}
                    </p>
                  )}
                  {biggestCuts.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Top cuts: {biggestCuts.map((c) => c.name).join(", ")}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">Built on ACP — Anti-Corruption Party Platform</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep("simulator"); }} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-1" /> Edit Budget
              </Button>
              <Link href="/profile" className="flex-1">
                <Button className="w-full">View My Profile</Button>
              </Link>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // ── Simulator step ──────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep("intro")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-sm font-bold">Build Your Federal Budget</p>
                <p className="text-xs text-muted-foreground">FY {baseline.fiscalYear} CBO Baseline</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetAll}>
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
              <Button size="sm" onClick={() => setStep("results")}>
                See Results <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {/* Live math panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Proposed Total", value: formatBillions(proposedTotal), sub: `vs ${formatBillions(baselineTotal)} baseline`, color: "text-foreground" },
              { label: "Change from Baseline", value: `${proposedTotal >= baselineTotal ? "+" : ""}${formatBillions(proposedTotal - baselineTotal)}`, sub: `${(((proposedTotal - baselineTotal) / baselineTotal) * 100).toFixed(1)}%`, color: proposedTotal > baselineTotal ? "text-red-600" : proposedTotal < baselineTotal ? "text-green-600" : "text-muted-foreground" },
              { label: "vs. Spending Goal", value: differenceFromTarget >= 0 ? `+${formatBillions(differenceFromTarget)}` : formatBillions(differenceFromTarget), sub: differenceFromTarget > 0 ? "above target" : differenceFromTarget < 0 ? "below target" : "on target", color: Math.abs(differenceFromTarget) < 50 ? "text-green-600" : "text-orange-600" },
              { label: estimatedDeficit >= 0 ? "Est. Deficit" : "Est. Surplus", value: formatBillions(Math.abs(estimatedDeficit)), sub: `receipts: ${formatBillions(baseline.totalReceipts)}`, color: estimatedDeficit >= 0 ? "text-red-600" : "text-green-600" },
            ].map((item) => (
              <Card key={item.label} className="text-center">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie chart */}
            <Card className="lg:sticky lg:top-24 lg:self-start">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Proposed Budget
                  <PhilosophyBadge label={philosophyLabel} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniPieChart data={pieData} height={260} />
                <div className="mt-3 grid grid-cols-2 gap-1">
                  {pieData.map((d) => (
                    <button
                      key={d.name}
                      onClick={() => {
                        const cat = categories.find((c) => c.name === d.name);
                        if (cat && categoryRefs.current[cat.id]) {
                          categoryRefs.current[cat.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-1 py-0.5 transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="truncate">{d.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category sliders */}
            <div className="space-y-3">
              {/* Total spending goal slider */}
              <Card className="border-2 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">Total Spending Goal</p>
                      <p className="text-xs text-muted-foreground">Set your overall target vs. baseline</p>
                    </div>
                    <span className={`text-sm font-bold ${totalGoalAdj > 0 ? "text-red-600" : totalGoalAdj < 0 ? "text-green-600" : "text-muted-foreground"}`}>
                      {totalGoalAdj === 0 ? "No change" : `${totalGoalAdj > 0 ? "+" : ""}${totalGoalAdj}%`}
                    </span>
                  </div>
                  <Slider
                    min={-10}
                    max={10}
                    step={1}
                    value={[totalGoalAdj]}
                    onValueChange={([v]) => setTotalGoalAdj(v)}
                    className="mb-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>-10% ({formatBillions(baselineTotal * 0.9)})</span>
                    <span>{formatBillions(targetTotal)} target</span>
                    <span>+10% ({formatBillions(baselineTotal * 1.1)})</span>
                  </div>
                </CardContent>
              </Card>

              {categories.map((cat) => {
                const adj = adjustments[cat.id] ?? 0;
                const proposed = proposedAmounts[cat.id];
                return (
                  <div
                    key={cat.id}
                    ref={(el) => { categoryRefs.current[cat.id] = el; }}
                  >
                    <Card className={cat.isLocked ? "opacity-80 border-dashed" : ""}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.colorHex ?? "#94a3b8" }} />
                            <p className="font-medium text-sm truncate">{cat.name}</p>
                            {cat.isLocked && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs">
                                  {cat.lockedTooltip ?? "This category is locked."}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-sm font-bold">{formatBillions(proposed)}</p>
                            <p className={`text-xs font-semibold ${adj > 0 ? "text-red-600" : adj < 0 ? "text-green-600" : "text-muted-foreground"}`}>
                              {adj === 0 ? `${formatBillions(cat.amountBillions)} baseline` : `${adj > 0 ? "+" : ""}${adj}% (${adj > 0 ? "+" : ""}${formatBillions(proposed - cat.amountBillions)})`}
                            </p>
                          </div>
                        </div>

                        {cat.isLocked ? (
                          <div className="h-4 flex items-center">
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                          </div>
                        ) : (
                          <>
                            <Slider
                              min={-10}
                              max={10}
                              step={1}
                              value={[adj]}
                              onValueChange={([v]) =>
                                setAdjustments((prev) => ({ ...prev, [cat.id]: v }))
                              }
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                              <span>-10%</span>
                              <span>0%</span>
                              <span>+10%</span>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}

              <Button className="w-full" onClick={() => setStep("results")}>
                See My Results <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
