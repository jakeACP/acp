import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";

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

export default function AdminAlgorithmSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Partial<AlgorithmSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Feed Algorithm Configuration</h1>
        <p className="text-muted-foreground">
          Fine-tune the parameters that determine how content is ranked and displayed in user feeds.
        </p>
      </div>

      <div className="space-y-6">
        {/* Temporal Signals */}
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

        {/* Engagement Weights */}
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

        {/* Social Graph Boosts */}
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

        {/* Quality Signals */}
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

        {/* Action Buttons */}
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
      </div>
    </div>
  );
}
