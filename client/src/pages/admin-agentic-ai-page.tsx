import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bot, CheckCircle2, Copy, FileText, Key, Loader2, Lock, ScrollText, ShieldAlert, ShieldCheck, Trash2, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type AgentKey = {
  id: string;
  name: string;
  keyPrefix: string;
  role: string;
  permissions: string[];
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type AgentLog = {
  id: string;
  agentName: string | null;
  role: string | null;
  endpoint: string;
  method: string;
  action: string;
  statusCode: number;
  success: boolean;
  message: string | null;
  createdAt: string;
};

type AgentMeta = {
  roles: string[];
  permissions: { value: string; label: string }[];
};

const defaultPermissions = ["articles:create", "moderation:flag", "sandbox:use"];

function formatRole(role: string) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusTone(status: string) {
  return status === "active"
    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800"
    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
}

function ErrorScreen() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
          The ACP Agent API Gateway is restricted to administrators only.
        </p>
      </div>
    </div>
  );
}

export default function AdminAgenticAiPage() {
  const { user, isLoading: checkingAuth } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const [name, setName] = useState("");
  const [role, setRole] = useState("moderator_agent");
  const [permissions, setPermissions] = useState<string[]>(defaultPermissions);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [sandboxPayload, setSandboxPayload] = useState('{"ping":"hello from OpenClaw"}');

  const { data: adminScope, isLoading: checkingAdminScope } = useQuery<{ isGlobalAdmin: boolean }>({
    queryKey: ["/api/admin/is-global-admin"],
    enabled: isAdmin,
  });
  const isGlobalAdmin = !!adminScope?.isGlobalAdmin;

  const { data: meta } = useQuery<AgentMeta>({
    queryKey: ["/api/admin/agent-keys/meta"],
    enabled: isGlobalAdmin,
  });

  const { data: keys, isLoading: loadingKeys } = useQuery<AgentKey[]>({
    queryKey: ["/api/admin/agent-keys"],
    enabled: isGlobalAdmin,
  });

  const { data: logs, isLoading: loadingLogs } = useQuery<AgentLog[]>({
    queryKey: ["/api/admin/agent-logs"],
    enabled: isGlobalAdmin,
  });

  const activeCount = useMemo(() => keys?.filter((key) => key.status === "active").length ?? 0, [keys]);

  const createKey = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/admin/agent-keys", "POST", { name, role, permissions });
      return res.json() as Promise<{ rawKey: string; key: AgentKey }>;
    },
    onSuccess: (data) => {
      setNewKey(data.rawKey);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-keys"] });
      toast({ title: "Agent key created", description: "Copy the key now. It will not be shown again." });
    },
    onError: (err: Error) => toast({ title: "Could not create key", description: err.message, variant: "destructive" }),
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/admin/agent-keys/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-keys"] });
      toast({ title: "Agent key revoked" });
    },
    onError: (err: Error) => toast({ title: "Could not revoke key", description: err.message, variant: "destructive" }),
  });

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: label });
  };

  const togglePermission = (value: string) => {
    setPermissions((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  if (checkingAuth || (isAdmin && checkingAdminScope)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdminNavigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!isAdmin || !isGlobalAdmin) return <ErrorScreen />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">ACP Agent API Gateway</h1>
                <p className="text-muted-foreground mt-1">
                  Issue scoped API keys for external AI agents such as Claw Machine and OpenClaw.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-[320px]">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Active keys</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Roles</p>
                <p className="text-2xl font-bold">{meta?.roles.length ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="col-span-2 sm:col-span-1">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Logged calls</p>
                <p className="text-2xl font-bold">{logs?.length ?? 0}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="p-5 grid gap-4 md:grid-cols-3 text-sm text-blue-900 dark:text-blue-200">
            <div className="flex gap-3">
              <ShieldCheck className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Scoped access</p>
                <p className="text-xs opacity-80">Each key receives only the permissions selected below.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <ScrollText className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Audited calls</p>
                <p className="text-xs opacity-80">Agent actions are logged with role, endpoint, status, and result.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Zap className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">External agent ready</p>
                <p className="text-xs opacity-80">Use bearer tokens against /api/agent endpoints from OpenClaw.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {newKey && (
          <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle2 className="h-4 w-4" /> New agent key
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-green-800 dark:text-green-200">Copy this key now. For security, only the prefix is stored after this moment.</p>
              <div className="flex gap-2">
                <Input value={newKey} readOnly className="font-mono text-xs bg-white dark:bg-slate-950" />
                <Button variant="outline" onClick={() => copyText(newKey, "Agent API key copied")}>Copy</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Key className="h-5 w-5" /> Create API key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Agent name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="OpenClaw Moderation Agent" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {(meta?.roles ?? [role]).map((item) => <option key={item} value={item}>{formatRole(item)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Permissions</label>
                <div className="space-y-2 rounded-lg border p-3 max-h-[300px] overflow-y-auto bg-white dark:bg-slate-900">
                  {(meta?.permissions ?? []).map((permission) => (
                    <label key={permission.value} className="flex items-start gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.includes(permission.value)}
                        onChange={() => togglePermission(permission.value)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium block">{permission.label}</span>
                        <span className="text-xs text-muted-foreground font-mono">{permission.value}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={() => createKey.mutate()} disabled={createKey.isPending || !name.trim() || permissions.length === 0}>
                {createKey.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                Generate key
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> Agent keys</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingKeys ? (
                <div className="py-12 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
              ) : !keys || keys.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Lock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No agent keys created yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {keys.map((key) => (
                    <div key={key.id} className="rounded-lg border bg-white dark:bg-slate-900 p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{key.name}</h3>
                            <Badge className={cn("border", statusTone(key.status))}>{key.status}</Badge>
                            <Badge variant="outline">{formatRole(key.role)}</Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                            <span>{key.keyPrefix}…</span>
                            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copyText(key.keyPrefix, "Key prefix copied")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}</p>
                        </div>
                        <Button size="sm" variant="destructive" disabled={key.status === "revoked" || revokeKey.isPending} onClick={() => revokeKey.mutate(key.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
                        </Button>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex flex-wrap gap-1.5">
                        {key.permissions.map((permission) => <Badge key={permission} variant="secondary" className="text-[10px] font-mono">{permission}</Badge>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" /> Agent endpoint reference</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ["GET", "/api/agent/auth/verify", "Validate bearer token and return role/permissions"],
                ["POST", "/api/agent/articles/create", "Create a public ACP post/article"],
                ["POST", "/api/agent/moderation/flag", "Flag content for moderator review"],
                ["POST", "/api/agent/users/ban", "Ban a user account"],
                ["POST", "/api/agent/politicians/import", "Import a politician profile"],
                ["POST", "/api/agent/elections/sync", "Log election sync output for review"],
                ["ANY", "/api/agent/sandbox/*", "Safe test endpoint for external agents"],
                ["GET", "/api/agent/logs", "Read activity logs with logs:read permission"],
              ].map(([method, path, description]) => (
                <div key={path} className="rounded-md border p-3 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">{method}</Badge>
                    <code className="text-xs font-mono break-all">{path}</code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                </div>
              ))}
              <div className="rounded-md bg-slate-100 dark:bg-slate-900 p-3 text-xs font-mono overflow-x-auto">
                Authorization: Bearer acp_agent_...
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5" /> Sandbox payload example</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={sandboxPayload} onChange={(e) => setSandboxPayload(e.target.value)} rows={8} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">
                External agents can POST this JSON to <code>/api/agent/sandbox/test</code> while using a key with <code>sandbox:use</code>.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><ScrollText className="h-5 w-5" /> Activity logs</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLogs ? (
              <div className="py-12 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
            ) : !logs || logs.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">No agent activity has been logged yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2 pr-3">Time</th>
                      <th className="text-left py-2 pr-3">Agent</th>
                      <th className="text-left py-2 pr-3">Action</th>
                      <th className="text-left py-2 pr-3">Endpoint</th>
                      <th className="text-left py-2 pr-3">Status</th>
                      <th className="text-left py-2">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-xs whitespace-nowrap text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="py-2 pr-3">{log.agentName ?? "Unknown"}<div className="text-xs text-muted-foreground">{log.role ? formatRole(log.role) : "No role"}</div></td>
                        <td className="py-2 pr-3 font-mono text-xs">{log.action}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{log.method} {log.endpoint}</td>
                        <td className="py-2 pr-3"><Badge className={cn("border", log.success ? statusTone("active") : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800")}>{log.statusCode}</Badge></td>
                        <td className="py-2 text-xs text-muted-foreground max-w-[260px] truncate">{log.message ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
