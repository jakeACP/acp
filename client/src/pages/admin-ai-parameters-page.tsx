import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RotateCcw, Sparkles, Bot } from "lucide-react";
import { useState, useEffect } from "react";
import { AdminNavigation } from "@/components/admin-navigation";

interface AiArticleParameters {
  id: string;
  name: string;
  systemPrompt: string;
  writingStyle: string;
  toneGuidelines: string;
  focusAreas: string;
  contentLength: string;
  includeQuotes: boolean;
  includeSources: boolean;
  additionalInstructions: string | null;
  isActive: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

export default function AdminAiParametersPage() {
  const { toast } = useToast();
  const [params, setParams] = useState<Partial<AiArticleParameters>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: currentParams, isLoading } = useQuery<AiArticleParameters>({
    queryKey: ["/api/admin/ai-parameters"],
  });

  useEffect(() => {
    if (currentParams) {
      setParams(currentParams);
    }
  }, [currentParams]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<AiArticleParameters>) => {
      return await apiRequest("/api/admin/ai-parameters", "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-parameters"] });
      toast({
        title: "Parameters Saved",
        description: "AI article parameters have been updated successfully.",
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

  const handleChange = (field: keyof AiArticleParameters, value: any) => {
    setParams((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(params);
  };

  const handleReset = () => {
    if (currentParams) {
      setParams(currentParams);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <AdminNavigation />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AdminNavigation />
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold">AI Article Parameters</h1>
          </div>
          <p className="text-muted-foreground">
            Configure how AI generates article content. These settings apply globally to all article generation requests.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                System Prompt
              </CardTitle>
              <CardDescription>
                The persona and core instructions for the AI. This defines who the AI is and how it should behave.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={params.systemPrompt || ""}
                onChange={(e) => handleChange("systemPrompt", e.target.value)}
                placeholder="You are an investigative journalist..."
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Writing Style</CardTitle>
              <CardDescription>
                Define the overall writing style for generated articles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={params.writingStyle || ""}
                onChange={(e) => handleChange("writingStyle", e.target.value)}
                placeholder="Professional journalistic style with clear, accessible language"
                className="min-h-[80px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tone Guidelines</CardTitle>
              <CardDescription>
                The tone and attitude the AI should use when writing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={params.toneGuidelines || ""}
                onChange={(e) => handleChange("toneGuidelines", e.target.value)}
                placeholder="Objective but engaged. Expose corruption while maintaining journalistic integrity."
                className="min-h-[80px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Focus Areas</CardTitle>
              <CardDescription>
                Key topics and themes the AI should emphasize in articles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={params.focusAreas || ""}
                onChange={(e) => handleChange("focusAreas", e.target.value)}
                placeholder="Government transparency, political accountability, campaign finance..."
                className="min-h-[80px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Settings</CardTitle>
              <CardDescription>
                Configure the length and content elements of generated articles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Content Length</Label>
                <Select
                  value={params.contentLength || "medium"}
                  onValueChange={(value) => handleChange("contentLength", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (300-400 words)</SelectItem>
                    <SelectItem value="medium">Medium (600-800 words)</SelectItem>
                    <SelectItem value="long">Long (1000-1500 words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Quotes</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow AI to include relevant quotes in articles
                  </p>
                </div>
                <Switch
                  checked={params.includeQuotes ?? true}
                  onCheckedChange={(checked) => handleChange("includeQuotes", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Sources</Label>
                  <p className="text-sm text-muted-foreground">
                    Reference sources and provide context for claims
                  </p>
                </div>
                <Switch
                  checked={params.includeSources ?? true}
                  onCheckedChange={(checked) => handleChange("includeSources", checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Instructions</CardTitle>
              <CardDescription>
                Any extra guidance or constraints for the AI (optional).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={params.additionalInstructions || ""}
                onChange={(e) => handleChange("additionalInstructions", e.target.value)}
                placeholder="Any specific instructions, restrictions, or emphasis points..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 mt-8 sticky bottom-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Parameters
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
