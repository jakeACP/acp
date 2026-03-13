import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminNavigation } from "@/components/admin-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Cpu, TrendingUp, Zap, BarChart, Loader2, Save, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";

interface GradingSettings {
  id: string;
  dataScoreWeight: number;
  pledgeScoreWeight: number;
  communityAdjWeight: number;
  committeeSharePenalty: number;
  smallDollarBonus: number;
  individualShareBonus: number;
  sigMoneyWeight: number;
  gradeACutoff: number;
  gradeBCutoff: number;
  gradeCCutoff: number;
  gradeDCutoff: number;
  updatedAt: string | null;
}

interface AlgorithmSettings {
  id: string;
  freshnessWeight: number;
  likeWeight: number;
  commentWeight: number;
  shareWeight: number;
  friendBoost: number;
  followingBoost: number;
  groupBoost: number;
  verifiedBoost: number;
  flagPenalty: number;
  timeDecayRate: number;
  localContentBoost: number;
  diversityFactor: number;
  updatedBy: string | null;
  updatedAt: Date | null;
}

export default function AdminAlgorithmPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Partial<AlgorithmSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const [gradingSettings, setGradingSettings] = useState<Partial<GradingSettings>>({});
  const [hasGradingChanges, setHasGradingChanges] = useState(false);

  const { data: currentSettings, isLoading } = useQuery<AlgorithmSettings>({
    queryKey: ["/api/admin/algorithm-settings"],
  });

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<AlgorithmSettings>) => {
      return await apiRequest("/api/admin/algorithm-settings", "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/algorithm-settings"] });
      toast({
        title: "Settings Saved",
        description: "Algorithm settings have been updated successfully.",
      });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: currentGradingSettings } = useQuery<GradingSettings>({
    queryKey: ["/api/admin/grading-settings"],
  });

  useEffect(() => {
    if (currentGradingSettings) {
      setGradingSettings(currentGradingSettings);
    }
  }, [currentGradingSettings]);

  const saveGradingMutation = useMutation({
    mutationFn: async (data: Partial<GradingSettings>) => {
      return await apiRequest("/api/admin/grading-settings", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/grading-settings"] });
      toast({ title: "Grade Settings Saved", description: "Corruption grading algorithm updated." });
      setHasGradingChanges(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleGradingSliderChange = (field: keyof GradingSettings, value: number[]) => {
    setGradingSettings((prev) => ({ ...prev, [field]: value[0] }));
    setHasGradingChanges(true);
  };

  const handleGradingNumberChange = (field: keyof GradingSettings, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setGradingSettings((prev) => ({ ...prev, [field]: num }));
      setHasGradingChanges(true);
    }
  };

  const handleSliderChange = (field: keyof AlgorithmSettings, value: number[]) => {
    setSettings((prev) => ({ ...prev, [field]: value[0] }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(settings);
  };

  const handleReset = () => {
    if (currentSettings) {
      setSettings(currentSettings);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdminNavigation />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Algorithm</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Configure content ranking, recommendations, and feed algorithms
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Algorithm Version
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">v1.0</div>
                <Cpu className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Engagement Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">0%</div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">Fast</div>
                <Zap className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Active Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">0</div>
                <BarChart className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Temporal Signals</CardTitle>
              <CardDescription>Control how time affects content ranking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="freshnessWeight">Freshness Weight</Label>
                  <span className="text-sm font-medium">{settings.freshnessWeight?.toFixed(2)}</span>
                </div>
                <Slider
                  id="freshnessWeight"
                  data-testid="slider-freshness-weight"
                  min={0}
                  max={5}
                  step={0.1}
                  value={[settings.freshnessWeight ?? 1]}
                  onValueChange={(value) => handleSliderChange("freshnessWeight", value)}
                />
                <p className="text-xs text-muted-foreground">
                  How much to prioritize recent posts (higher = newer posts rank higher)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="timeDecayRate">Time Decay Rate</Label>
                  <span className="text-sm font-medium">{settings.timeDecayRate?.toFixed(2)}</span>
                </div>
                <Slider
                  id="timeDecayRate"
                  data-testid="slider-time-decay-rate"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[settings.timeDecayRate ?? 0.1]}
                  onValueChange={(value) => handleSliderChange("timeDecayRate", value)}
                />
                <p className="text-xs text-muted-foreground">
                  How quickly older posts lose relevance (higher = faster decay)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Engagement Weights</CardTitle>
              <CardDescription>Configure the value of different engagement types</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="likeWeight">Like Weight</Label>
                  <span className="text-sm font-medium">{settings.likeWeight?.toFixed(2)}</span>
                </div>
                <Slider
                  id="likeWeight"
                  data-testid="slider-like-weight"
                  min={0}
                  max={5}
                  step={0.1}
                  value={[settings.likeWeight ?? 1]}
                  onValueChange={(value) => handleSliderChange("likeWeight", value)}
                />
                <p className="text-xs text-muted-foreground">
                  Value of each like/reaction on a post
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="commentWeight">Comment Weight</Label>
                  <span className="text-sm font-medium">{settings.commentWeight?.toFixed(2)}</span>
                </div>
                <Slider
                  id="commentWeight"
                  data-testid="slider-comment-weight"
                  min={0}
                  max={10}
                  step={0.1}
                  value={[settings.commentWeight ?? 2]}
                  onValueChange={(value) => handleSliderChange("commentWeight", value)}
                />
                <p className="text-xs text-muted-foreground">
                  Value of each comment (typically higher than likes)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="shareWeight">Share Weight</Label>
                  <span className="text-sm font-medium">{settings.shareWeight?.toFixed(2)}</span>
                </div>
                <Slider
                  id="shareWeight"
                  data-testid="slider-share-weight"
                  min={0}
                  max={10}
                  step={0.1}
                  value={[settings.shareWeight ?? 3]}
                  onValueChange={(value) => handleSliderChange("shareWeight", value)}
                />
                <p className="text-xs text-muted-foreground">
                  Value of each share (usually the highest engagement signal)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Graph Boosts</CardTitle>
              <CardDescription>Adjust how relationships affect content visibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="friendBoost">Friend Boost</Label>
                  <span className="text-sm font-medium">{settings.friendBoost?.toFixed(2)}</span>
                </div>
                <Slider
                  id="friendBoost"
                  data-testid="slider-friend-boost"
                  min={0}
                  max={10}
                  step={0.1}
                  value={[settings.friendBoost ?? 2]}
                  onValueChange={(value) => handleSliderChange("friendBoost", value)}
                />
                <p className="text-xs text-muted-foreground">
                  Boost for posts from friends
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="followingBoost">Following Boost</Label>
                  <span className="text-sm font-medium">{settings.followingBoost?.toFixed(2)}</span>
                </div>
                <Slider
                  id="followingBoost"
                  data-testid="slider-following-boost"
                  min={0}
                  max={10}
                  step={0.1}
                  value={[settings.followingBoost ?? 1.5]}
                  onValueChange={(value) => handleSliderChange("followingBoost", value)}
                />
                <p className="text-xs text-muted-foreground">
                  Boost for posts from people you follow
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="groupBoost">Group Boost</Label>
                  <span className="text-sm font-medium">{settings.groupBoost?.toFixed(2)}</span>
                </div>
                <Slider
                  id="groupBoost"
                  data-testid="slider-group-boost"
                  min={0}
                  max={10}
                  step={0.1}
                  value={[settings.groupBoost ?? 1.5]}
                  onValueChange={(value) => handleSliderChange("groupBoost", value)}
                />
                <p className="text-xs text-muted-foreground">
                  Boost for posts from groups you've joined
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality Signals</CardTitle>
              <CardDescription>Control how quality indicators affect ranking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="verifiedBoost">Verified User Boost</Label>
                  <span className="text-sm font-medium">{settings.verifiedBoost?.toFixed(2)}</span>
                </div>
                <Slider
                  id="verifiedBoost"
                  data-testid="slider-verified-boost"
                  min={0}
                  max={5}
                  step={0.1}
                  value={[settings.verifiedBoost ?? 1.2]}
                  onValueChange={(value) => handleSliderChange("verifiedBoost", value)}
                />
                <p className="text-xs text-muted-foreground">
                  Boost for posts from verified users
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="flagPenalty">Flag Penalty</Label>
                  <span className="text-sm font-medium">{settings.flagPenalty?.toFixed(2)}</span>
                </div>
                <Slider
                  id="flagPenalty"
                  data-testid="slider-flag-penalty"
                  min={0}
                  max={10}
                  step={0.1}
                  value={[settings.flagPenalty ?? 2]}
                  onValueChange={(value) => handleSliderChange("flagPenalty", value)}
                />
                <p className="text-xs text-muted-foreground">
                  Penalty for flagged content (higher = more severe)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="localContentBoost">Local Content Boost</Label>
                  <span className="text-sm font-medium">{settings.localContentBoost?.toFixed(2)}</span>
                </div>
                <Slider
                  id="localContentBoost"
                  data-testid="slider-local-content-boost"
                  min={0}
                  max={5}
                  step={0.1}
                  value={[settings.localContentBoost ?? 1.3]}
                  onValueChange={(value) => handleSliderChange("localContentBoost", value)}
                />
                <p className="text-xs text-muted-foreground">
                  Boost for location-relevant content
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="diversityFactor">Diversity Factor</Label>
                  <span className="text-sm font-medium">{settings.diversityFactor?.toFixed(2)}</span>
                </div>
                <Slider
                  id="diversityFactor"
                  data-testid="slider-diversity-factor"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[settings.diversityFactor ?? 0.3]}
                  onValueChange={(value) => handleSliderChange("diversityFactor", value)}
                />
                <p className="text-xs text-muted-foreground">
                  Promote content diversity (higher = more variety in feed)
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              data-testid="button-reset"
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || updateMutation.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              data-testid="button-save"
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          <div className="mt-10">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-1">Corruption Grading Algorithm</h2>
              <p className="text-muted-foreground text-sm">
                Configure how politician corruption grades (A–F) are computed from FEC financial data, SIG sponsorships, and community input.
              </p>
              <div className="mt-2 rounded bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
                FinalScore = <strong>{Math.round((gradingSettings.dataScoreWeight ?? 0.85) * 100)}%</strong> × DataScore
                + <strong>{Math.round((gradingSettings.pledgeScoreWeight ?? 0.10) * 100)}%</strong> × PledgeScore
                + <strong>{Math.round((gradingSettings.communityAdjWeight ?? 0.05) * 100)}%</strong> × CommunityAdj
              </div>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Formula Weights</CardTitle>
                  <CardDescription>How much each component contributes to the final score (should sum to 100%)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { field: "dataScoreWeight" as const, label: "DataScore Weight", desc: "FEC financial data & SIG money signals", max: 1, step: 0.01, pct: true },
                    { field: "pledgeScoreWeight" as const, label: "PledgeScore Weight", desc: "ACE sponsors and non-ACE SIG penalties", max: 1, step: 0.01, pct: true },
                    { field: "communityAdjWeight" as const, label: "Community Adj Weight", desc: "Manual per-politician adjustment (±5 range)", max: 1, step: 0.01, pct: true },
                  ].map(({ field, label, desc, max, step, pct }) => (
                    <div key={field} className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{label}</Label>
                        <span className="text-sm font-medium">
                          {pct ? `${Math.round((gradingSettings[field] as number ?? 0) * 100)}%` : (gradingSettings[field] as number ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        min={0} max={max} step={step}
                        value={[gradingSettings[field] as number ?? 0]}
                        onValueChange={(v) => handleGradingSliderChange(field, v)}
                      />
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>DataScore Sub-Weights</CardTitle>
                  <CardDescription>Controls how FEC and SIG metrics influence the DataScore (starts at 100, then adjustments applied)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { field: "committeeSharePenalty" as const, label: "Committee Share Penalty", desc: "How much PAC/committee money hurts the score (per 100% of receipts)", max: 100 },
                    { field: "smallDollarBonus" as const, label: "Small Dollar Bonus", desc: "Reward for small individual donors (<$200 unitemized)", max: 50 },
                    { field: "individualShareBonus" as const, label: "Individual Share Bonus", desc: "Bonus when >50% of receipts come from individuals", max: 50 },
                    { field: "sigMoneyWeight" as const, label: "SIG Money Weight", desc: "Penalty from linked special-interest group money (normalized to $1M)", max: 50 },
                  ].map(({ field, label, desc, max }) => (
                    <div key={field} className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{label}</Label>
                        <span className="text-sm font-medium">{(gradingSettings[field] as number ?? 0).toFixed(1)}</span>
                      </div>
                      <Slider
                        min={0} max={max} step={0.5}
                        value={[gradingSettings[field] as number ?? 0]}
                        onValueChange={(v) => handleGradingSliderChange(field, v)}
                      />
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grade Thresholds (0–100)</CardTitle>
                  <CardDescription>Minimum score required for each letter grade</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { field: "gradeACutoff" as const, label: "A cutoff" },
                      { field: "gradeBCutoff" as const, label: "B cutoff" },
                      { field: "gradeCCutoff" as const, label: "C cutoff" },
                      { field: "gradeDCutoff" as const, label: "D cutoff" },
                    ].map(({ field, label }) => (
                      <div key={field} className="space-y-1">
                        <Label>{label}</Label>
                        <Input
                          type="number"
                          min={0} max={100} step={1}
                          value={gradingSettings[field] ?? ""}
                          onChange={(e) => handleGradingNumberChange(field, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Scores below D cutoff receive an F.</p>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={() => saveGradingMutation.mutate(gradingSettings)}
                  disabled={!hasGradingChanges || saveGradingMutation.isPending}
                >
                  {saveGradingMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />Save Grade Settings</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
