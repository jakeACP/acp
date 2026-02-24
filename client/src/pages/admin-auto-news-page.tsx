import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Newspaper, Zap, Clock, CheckCircle, XCircle, AlertCircle, Send, Globe, Twitter } from "lucide-react";
import { useState } from "react";
import { AdminNavigation } from "@/components/admin-navigation";

interface AutoNewsStatus {
  systemUserId: string | null;
  lastJobRun: string | null;
  lastJobStatus: string;
  lastJobError: string | null;
  lastArticleTitle: string | null;
  cronSchedule: string;
  nextRun: string | null;
  socialMedia: {
    platform: string;
    enabled: boolean;
    configured: boolean;
    handle: string | null;
  }[];
}

export default function AdminAutoNewsPage() {
  const { toast } = useToast();
  const [breakingTitle, setBreakingTitle] = useState("");

  const { data: status, isLoading } = useQuery<AutoNewsStatus>({
    queryKey: ["/api/admin/auto-news/status"],
    refetchInterval: 30000,
  });

  const triggerMutation = useMutation({
    mutationFn: async (title?: string) => {
      return await apiRequest("/api/admin/auto-news/trigger", "POST", title ? { title } : {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Article Generated",
        description: `"${data.title}" has been posted by ACP News Desk.`,
      });
      setBreakingTitle("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/auto-news/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/all"] });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate article. Check your settings.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Success</Badge>;
      case "error":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      case "running":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running</Badge>;
      case "skipped":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><AlertCircle className="w-3 h-3 mr-1" /> Skipped</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Never Run</Badge>;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "x": return <Twitter className="w-4 h-4" />;
      case "bluesky": return <Globe className="w-4 h-4" />;
      case "facebook": return <Globe className="w-4 h-4" />;
      case "threads": return <Globe className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdminNavigation />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Newspaper className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Auto News</h1>
            <p className="text-slate-500 dark:text-slate-400">Automated daily article generation and social media cross-posting</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Job Status</CardTitle>
            </CardHeader>
            <CardContent>
              {status && getStatusBadge(status.lastJobStatus)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Last Run</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {status?.lastJobRun
                  ? new Date(status.lastJobRun).toLocaleString()
                  : "Never"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Next Scheduled</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {status?.nextRun
                  ? new Date(status.nextRun).toLocaleString()
                  : "Not scheduled"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Daily at 8:00 AM ET</p>
            </CardContent>
          </Card>
        </div>

        {status?.lastArticleTitle && (
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Last Generated Article</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{status.lastArticleTitle}</p>
            </CardContent>
          </Card>
        )}

        {status?.lastJobError && (
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Last Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600 dark:text-red-400 text-sm">{status.lastJobError}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Breaking News Trigger
            </CardTitle>
            <CardDescription>
              Manually generate an article for a breaking story. Leave the title empty to auto-fetch the top headline, or enter a custom title.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="breakingTitle">Article Title (optional)</Label>
              <Input
                id="breakingTitle"
                placeholder="e.g., Major Corruption Scandal Rocks Senate"
                value={breakingTitle}
                onChange={(e) => setBreakingTitle(e.target.value)}
              />
              <p className="text-xs text-slate-500">Leave empty to auto-fetch the top political headline from the news</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => triggerMutation.mutate(breakingTitle || undefined)}
                disabled={triggerMutation.isPending}
              >
                {triggerMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Generate Article</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              Social Media Cross-Posting
            </CardTitle>
            <CardDescription>
              Auto-generated articles can be cross-posted to your social media accounts. Configure API keys in secrets to enable each platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {status?.socialMedia?.map((platform) => (
                <div
                  key={platform.platform}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    platform.enabled
                      ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(platform.platform)}
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                        {platform.platform === "x" ? "X (Twitter)" : platform.platform}
                      </p>
                      {platform.handle && (
                        <p className="text-xs text-slate-500">@{platform.handle}</p>
                      )}
                    </div>
                  </div>
                  {platform.enabled ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Not Configured</Badge>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2">Setup Instructions</h4>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <li><strong>X (Twitter):</strong> Add X_API_KEY, X_API_SECRET, and X_HANDLE to your secrets</li>
                <li><strong>Bluesky:</strong> Add BLUESKY_HANDLE and BLUESKY_APP_PASSWORD to your secrets</li>
                <li><strong>Facebook:</strong> Add FACEBOOK_PAGE_TOKEN and FACEBOOK_PAGE_ID to your secrets</li>
                <li><strong>Threads:</strong> Add THREADS_ACCESS_TOKEN and THREADS_USER_ID to your secrets</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">System Account</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {status?.systemUserId ? "ACP News Desk (Active)" : "Not initialized"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Schedule</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Daily at 8:00 AM ET ({status?.cronSchedule || "0 8 * * *"})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
