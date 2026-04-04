import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, fetchCsrfToken, getCsrfToken } from "@/lib/queryClient";
import {
  Bot, ExternalLink, Download, Upload, RefreshCw, ShieldAlert,
  Loader2, Circle, Github, Info, HardDrive, Users, Database
} from "lucide-react";
import { cn } from "@/lib/utils";

type AgentApp = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  version: string | null;
  port: number | null;
  installPath: string | null;
  externalUrl: string | null;
  status: string;
  logoUrl: string | null;
  githubUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type LiveStatus = {
  status: "running" | "stopped" | "not_installed";
  reachable: boolean;
  httpStatus?: number;
};

function StatusBadge({ status, live }: { status: string; live?: LiveStatus }) {
  const effective = live?.status ?? status;

  if (effective === "running") {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 flex items-center gap-1.5">
        <Circle className="h-2 w-2 fill-current" />
        Running
      </Badge>
    );
  }
  if (effective === "stopped") {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
        <Circle className="h-2 w-2 fill-current" />
        Stopped
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
      <Circle className="h-2 w-2 fill-current opacity-50" />
      Not Installed
    </Badge>
  );
}

function AppCard({ app }: { app: AgentApp }) {
  const { toast } = useToast();
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/admin/agent-apps/${app.id}/status`, { credentials: "include" });
      const data: LiveStatus = await res.json();
      setLiveStatus(data);
    } catch {
      setLiveStatus({ status: "stopped", reachable: false });
    } finally {
      setCheckingStatus(false);
    }
  };

  const getCsrf = async () => {
    let token = getCsrfToken();
    if (!token) token = await fetchCsrfToken();
    return token;
  };

  const handleBackup = async () => {
    setDownloading(true);
    try {
      const csrfToken = await getCsrf();
      const res = await fetch(`/api/admin/agent-apps/${app.id}/backup`, {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Backup failed", description: err.error || "Unknown error", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${app.slug}-backup-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Backup downloaded", description: `${app.name} backup zip saved to your downloads.` });
    } catch {
      toast({ title: "Backup failed", description: "Network error", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      toast({ title: "No file selected", description: "Choose a backup .zip file first.", variant: "destructive" });
      return;
    }
    setRestoring(true);
    try {
      const csrfToken = await getCsrf();
      const formData = new FormData();
      formData.append("backup", restoreFile);
      const res = await fetch(`/api/admin/agent-apps/${app.id}/restore`, {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Restore failed", description: data.error || "Unknown error", variant: "destructive" });
        return;
      }
      toast({ title: "Restore complete", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-apps"] });
      setRestoreFile(null);
    } catch {
      toast({ title: "Restore failed", description: "Network error", variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {app.name}
                {app.version && (
                  <span className="text-xs font-normal text-slate-500">v{app.version}</span>
                )}
              </CardTitle>
              {app.port && (
                <p className="text-xs text-slate-500 mt-0.5">Port {app.port}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={app.status} live={liveStatus ?? undefined} />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={checkStatus}
              disabled={checkingStatus}
              title="Refresh live status"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", checkingStatus && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {app.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {app.description}
          </p>
        )}

        {/* Links row */}
        <div className="flex flex-wrap gap-2">
          {app.externalUrl ? (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
              <a href={app.externalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open App
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled>
              <ExternalLink className="h-3.5 w-3.5" />
              Not Running
            </Button>
          )}

          {app.githubUrl && (
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" asChild>
              <a href={app.githubUrl} target="_blank" rel="noopener noreferrer">
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
            </Button>
          )}
        </div>

        <Separator />

        {/* Backup & Restore */}
        <div>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5" />
            Backup & Restore
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={handleBackup}
              disabled={downloading || app.status === "not_installed"}
              title={app.status === "not_installed" ? "App not installed — nothing to backup" : "Download app config + database snapshot as zip"}
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {downloading ? "Backing up…" : "Backup"}
            </Button>

            <div className="flex items-center gap-1.5">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs pointer-events-none"
                  asChild
                >
                  <span>
                    <Upload className="h-3.5 w-3.5" />
                    {restoreFile ? restoreFile.name.slice(0, 18) + (restoreFile.name.length > 18 ? "…" : "") : "Choose backup…"}
                  </span>
                </Button>
              </label>
              {restoreFile && (
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 gap-1.5 text-xs"
                  onClick={handleRestore}
                  disabled={restoring}
                >
                  {restoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {restoring ? "Restoring…" : "Restore"}
                </Button>
              )}
            </div>
          </div>
          {app.status === "not_installed" && (
            <p className="text-xs text-slate-400 mt-1.5">Install the app first to enable backup/restore.</p>
          )}
        </div>

        {/* Install path info */}
        {app.installPath && (
          <div className="rounded-md bg-slate-50 dark:bg-slate-800 px-3 py-2">
            <p className="text-xs text-slate-500 font-mono">{app.installPath}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAgenticAiPage() {
  const { data: globalAdminData, isLoading: checkingAdmin } = useQuery<{ isGlobalAdmin: boolean }>({
    queryKey: ["/api/admin/is-global-admin"],
  });

  const { data: apps, isLoading: loadingApps } = useQuery<AgentApp[]>({
    queryKey: ["/api/admin/agent-apps"],
    enabled: !!globalAdminData?.isGlobalAdmin,
  });

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdminNavigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!globalAdminData?.isGlobalAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdminNavigation />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Access Denied
          </h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            The Agentic AI management page is restricted to the Global Administrator only. Contact your platform owner for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Agentic AI</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Manage sideloaded AI applications. Agents operate as ACP users and drive platform engagement.
            </p>
          </div>
        </div>

        {/* Info card */}
        <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium">How Agentic AI works with ACP</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                  <div className="flex gap-2">
                    <Users className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-xs">Agents as Users</p>
                      <p className="text-xs opacity-80">Create ACP user accounts for each agent. Assign roles (citizen, moderator) from the Users admin page.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Database className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-xs">Isolated Databases</p>
                      <p className="text-xs opacity-80">Each sideloaded app has its own database. Apps can also access the ACP database via the developer API.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Bot className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-xs">Environment Roles</p>
                      <p className="text-xs opacity-80">Dev agents test features &amp; give feedback. Prod agents engage real users to grow the community.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App cards */}
        {loadingApps ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : !apps || apps.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Bot className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">No apps registered</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Sideloaded apps will appear here once registered. Paperclip should be seeded automatically.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
