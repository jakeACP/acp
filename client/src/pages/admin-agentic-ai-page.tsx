import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bot, CheckCircle2, Copy, Key, Loader2, Lock, ScrollText, ShieldAlert, ShieldCheck, Trash2, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type PermissionMap = Record<string, boolean>;

type AgentKey = {
  id: string;
  name: string;
  keyPrefix: string;
  role: string;
  roleLabel: string;
  permissions: PermissionMap;
  rateLimit: number;
  sandboxMode: boolean;
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type AgentLog = {
  id: string;
  apiKeyId: string | null;
  agentName: string | null;
  role: string | null;
  endpoint: string;
  method: string;
  action: string;
  responseStatus: number;
  status: string;
  ip: string | null;
  sandbox: boolean;
  success: boolean;
  message: string | null;
  createdAt: string;
};

type AgentMeta = {
  roles: { value: string; label: string; defaults: PermissionMap; sandboxMode: boolean }[];
  permissions: { value: string; label: string }[];
};

type LogsResponse = {
  logs: AgentLog[];
  pagination: { limit: number; offset: number; hasMore: boolean };
};

function statusTone(status: string) {
  if (status === "active" || status === "success") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
  if (status === "error") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function AccessDenied() {
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
  const [tab, setTab] = useState<"keys" | "logs" | "roles">("keys");
  const [name, setName] = useState("");
  const [role, setRole] = useState("moderator_agent");
  const [customRole, setCustomRole] = useState("");
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [rateLimit, setRateLimit] = useState(100);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [selectedLogKey, setSelectedLogKey] = useState("all");
  const [logOffset, setLogOffset] = useState(0);

  const { data: meta } = useQuery<AgentMeta>({ queryKey: ["/api/admin/agent-keys/meta"], enabled: isAdmin });
  const { data: keys, isLoading: loadingKeys } = useQuery<AgentKey[]>({ queryKey: ["/api/admin/agent-keys"], enabled: isAdmin });
  const logQueryPath = selectedLogKey === "all" ? `/api/admin/agent-logs?limit=50&offset=${logOffset}` : `/api/admin/agent-logs?limit=50&offset=${logOffset}&apiKeyId=${selectedLogKey}`;
  const { data: logsResponse, isLoading: loadingLogs } = useQuery<LogsResponse>({ queryKey: [logQueryPath], enabled: isAdmin });

  const activeCount = useMemo(() => keys?.filter((key) => key.status === "active").length ?? 0, [keys]);
  const selectedRole = meta?.roles.find((item) => item.value === role);

  const applyRoleDefaults = (roleValue: string) => {
    if (roleValue === "__custom") {
      setRole(roleValue);
      setPermissions({});
      setSandboxMode(false);
      return;
    }
    const nextRole = meta?.roles.find((item) => item.value === roleValue);
    setRole(roleValue);
    setPermissions(nextRole?.defaults ?? {});
    setSandboxMode(nextRole?.sandboxMode ?? false);
  };

  const createKey = useMutation({
    mutationFn: async () => {
      const submittedRole = role === "__custom" ? customRole.trim() : role;
      const res = await apiRequest("/api/admin/agent-keys", "POST", { name, role: submittedRole, permissions, rateLimit, sandboxMode });
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

  const togglePermission = (value: string) => setPermissions((current) => ({ ...current, [value]: !current[value] }));

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdminNavigation />
        <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
      </div>
    );
  }

  if (!isAdmin) return <AccessDenied />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm"><Bot className="h-5 w-5 text-white" /></div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">ACP Agent API Gateway</h1>
              <p className="text-muted-foreground mt-1">Manage scoped X-Agent-Key access for Claw Machine, OpenClaw, and other external agents.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 min-w-[320px]">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active keys</p><p className="text-2xl font-bold">{activeCount}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Roles</p><p className="text-2xl font-bold">{meta?.roles.length ?? 0}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Recent logs</p><p className="text-2xl font-bold">{logsResponse?.logs.length ?? 0}</p></CardContent></Card>
          </div>
        </div>

        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="p-5 grid gap-4 md:grid-cols-3 text-sm text-blue-900 dark:text-blue-200">
            <div className="flex gap-3"><ShieldCheck className="h-5 w-5 mt-0.5" /><div><p className="font-semibold">Scoped permissions</p><p className="text-xs opacity-80">Every key uses a JSON permission map with explicit true/false access.</p></div></div>
            <div className="flex gap-3"><ScrollText className="h-5 w-5 mt-0.5" /><div><p className="font-semibold">Audited actions</p><p className="text-xs opacity-80">Requests capture endpoint, response status, IP, sandbox flag, and safe payload summaries.</p></div></div>
            <div className="flex gap-3"><Zap className="h-5 w-5 mt-0.5" /><div><p className="font-semibold">Sandbox safe</p><p className="text-xs opacity-80">QA and sandbox keys can test without mutating production records.</p></div></div>
          </CardContent>
        </Card>

        {newKey && (
          <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-green-800 dark:text-green-200"><CheckCircle2 className="h-4 w-4" /> New agent key</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-green-800 dark:text-green-200">Copy this key now. It must be sent as the <code>X-Agent-Key</code> header and will not be shown again.</p>
              <div className="flex gap-2"><Input value={newKey} readOnly className="font-mono text-xs bg-white dark:bg-slate-950" /><Button variant="outline" onClick={() => copyText(newKey, "Agent API key copied")}>Copy</Button></div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2 border-b pb-2">
          {[{ id: "keys", label: "API Keys", icon: Key }, { id: "logs", label: "Activity Logs", icon: ScrollText }, { id: "roles", label: "Roles Reference", icon: Users }].map((item) => {
            const Icon = item.icon;
            return <Button key={item.id} variant={tab === item.id ? "default" : "outline"} onClick={() => setTab(item.id as typeof tab)} className="gap-2"><Icon className="h-4 w-4" />{item.label}</Button>;
          })}
        </div>

        {tab === "keys" && (
          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Key className="h-5 w-5" /> Create API key</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><label className="text-sm font-medium">Agent name</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="OpenClaw News Agent" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Role</label><select value={role} onChange={(e) => applyRoleDefaults(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{(meta?.roles ?? []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}<option value="__custom">Custom role</option></select>{role === "__custom" ? <Input value={customRole} onChange={(e) => setCustomRole(e.target.value)} placeholder="custom_partner_agent" /> : selectedRole && <p className="text-xs text-muted-foreground">Defaults loaded from {selectedRole.label}.</p>}</div>
                <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label className="text-sm font-medium">Hourly rate limit</label><Input type="number" min={1} max={5000} value={rateLimit} onChange={(e) => setRateLimit(Number(e.target.value) || 1)} /></div><label className="flex items-center gap-2 text-sm mt-7"><input type="checkbox" checked={sandboxMode} onChange={(e) => setSandboxMode(e.target.checked)} />Sandbox mode</label></div>
                <div className="space-y-2"><label className="text-sm font-medium">Permissions</label><div className="space-y-2 rounded-lg border p-3 max-h-[300px] overflow-y-auto bg-white dark:bg-slate-900">{(meta?.permissions ?? []).map((permission) => <label key={permission.value} className="flex items-start gap-2 text-sm cursor-pointer"><input type="checkbox" checked={permissions[permission.value] === true} onChange={() => togglePermission(permission.value)} className="mt-1" /><span><span className="font-medium block">{permission.label}</span><span className="text-xs text-muted-foreground font-mono">{permission.value}</span></span></label>)}</div></div>
                <Button className="w-full" onClick={() => createKey.mutate()} disabled={createKey.isPending || !name.trim() || (role === "__custom" && !customRole.trim())}>{createKey.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}Generate key</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> Agent keys</CardTitle></CardHeader>
              <CardContent>
                {loadingKeys ? <div className="py-12 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div> : !keys || keys.length === 0 ? <div className="py-12 text-center text-muted-foreground"><Lock className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No agent keys created yet.</p></div> : <div className="space-y-3">{keys.map((key) => <div key={key.id} className="rounded-lg border bg-white dark:bg-slate-900 p-4"><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3"><div><div className="flex items-center gap-2 flex-wrap"><h3 className="font-semibold">{key.name}</h3><Badge className={cn("border", statusTone(key.status))}>{key.status}</Badge><Badge variant="outline">{key.roleLabel}</Badge>{key.sandboxMode && <Badge variant="secondary">Sandbox</Badge>}</div><div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground font-mono"><span>{key.keyPrefix}…</span><Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copyText(key.keyPrefix, "Key prefix copied")}><Copy className="h-3 w-3" /></Button></div><p className="mt-1 text-xs text-muted-foreground">Last used: {formatDate(key.lastUsedAt)} · Limit: {key.rateLimit}/hour</p></div><Button size="sm" variant="destructive" disabled={key.status === "revoked" || revokeKey.isPending} onClick={() => revokeKey.mutate(key.id)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke</Button></div><Separator className="my-3" /><div className="flex flex-wrap gap-1.5">{Object.entries(key.permissions).filter(([, enabled]) => enabled).map(([permission]) => <Badge key={permission} variant="secondary" className="text-[10px] font-mono">{permission}</Badge>)}</div></div>)}</div>}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "logs" && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ScrollText className="h-5 w-5" /> Activity Logs</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center"><select value={selectedLogKey} onChange={(e) => { setSelectedLogKey(e.target.value); setLogOffset(0); }} className="rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="all">All agent keys</option>{(keys ?? []).map((key) => <option key={key.id} value={key.id}>{key.name}</option>)}</select><Button variant="outline" disabled={logOffset === 0} onClick={() => setLogOffset(Math.max(logOffset - 50, 0))}>Previous</Button><Button variant="outline" disabled={!logsResponse?.pagination.hasMore} onClick={() => setLogOffset(logOffset + 50)}>Next</Button></div>
              {loadingLogs ? <div className="py-12 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div> : !logsResponse?.logs.length ? <div className="py-10 text-center text-muted-foreground">No agent activity has been logged yet.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2 pr-3">Time</th><th className="text-left py-2 pr-3">Agent</th><th className="text-left py-2 pr-3">Action</th><th className="text-left py-2 pr-3">Endpoint</th><th className="text-left py-2 pr-3">IP</th><th className="text-left py-2 pr-3">Status</th><th className="text-left py-2">Mode</th></tr></thead><tbody>{logsResponse.logs.map((log) => <tr key={log.id} className="border-b last:border-0"><td className="py-2 pr-3 text-xs whitespace-nowrap text-muted-foreground">{formatDate(log.createdAt)}</td><td className="py-2 pr-3">{log.agentName ?? "Unknown"}<div className="text-xs text-muted-foreground">{log.role ?? "No role"}</div></td><td className="py-2 pr-3 font-mono text-xs">{log.action}</td><td className="py-2 pr-3 font-mono text-xs">{log.method} {log.endpoint}</td><td className="py-2 pr-3 text-xs">{log.ip ?? "—"}</td><td className="py-2 pr-3"><Badge className={cn("border", statusTone(log.status))}>{log.responseStatus}</Badge></td><td className="py-2">{log.sandbox ? <Badge variant="secondary">Sandbox</Badge> : <Badge variant="outline">Live</Badge>}</td></tr>)}</tbody></table></div>}
            </CardContent>
          </Card>
        )}

        {tab === "roles" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> Roles Reference</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2">{(meta?.roles ?? []).map((item) => <div key={item.value} className="rounded-lg border bg-white dark:bg-slate-900 p-4"><div className="flex items-center gap-2 flex-wrap"><h3 className="font-semibold">{item.label}</h3>{item.sandboxMode && <Badge variant="secondary">Sandbox default</Badge>}</div><p className="text-xs text-muted-foreground font-mono mt-1">{item.value}</p><div className="mt-3 flex flex-wrap gap-1.5">{Object.entries(item.defaults).filter(([, enabled]) => enabled).map(([permission]) => <Badge key={permission} variant="outline" className="text-[10px] font-mono">{permission}</Badge>)}</div></div>)}</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5" /> Endpoint Contract</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">{[["POST", "/api/agent/auth/verify"], ["POST", "/api/agent/articles/create"], ["PUT", "/api/agent/articles/update"], ["POST", "/api/agent/moderation/flag"], ["POST", "/api/agent/users/ban"], ["POST", "/api/agent/politicians/import"], ["PUT", "/api/agent/politicians/update"], ["POST", "/api/agent/elections/sync"], ["POST", "/api/agent/testing/run"], ["POST", "/api/agent/security/scan"], ["GET", "/api/agent/logs"]].map(([method, path]) => <div key={path} className="rounded-md border p-3 bg-white dark:bg-slate-900"><Badge variant="outline" className="font-mono mr-2">{method}</Badge><code className="text-xs font-mono break-all">{path}</code></div>)}<div className="rounded-md bg-slate-100 dark:bg-slate-900 p-3 text-xs font-mono overflow-x-auto">X-Agent-Key: acp_agent_...</div></CardContent></Card>
          </div>
        )}
      </div>
    </div>
  );
}
