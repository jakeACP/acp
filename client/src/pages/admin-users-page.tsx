import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNavigation } from "@/components/admin-navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Users, Shield, Loader2, Trash2, Search, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const ROLES = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "state_admin", label: "Database Administrator" },
  { value: "moderator", label: "Moderator" },
  { value: "candidate", label: "Candidate" },
  { value: "citizen", label: "Citizen" },
];

export default function AdminUsersPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [roleDialogUser, setRoleDialogUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("citizen");
  const [selectedState, setSelectedState] = useState("all");
  const [deleteDialogUser, setDeleteDialogUser] = useState<any>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const limit = 25;

  const queryKey = `/api/admin/users?limit=${limit}&offset=${page * limit}&search=${encodeURIComponent(search)}`;

  const { data, isLoading } = useQuery({ queryKey: [queryKey] });

  const users = (data?.users || []).filter((u: any) =>
    roleFilter === "all" || u.role === roleFilter
  );
  const totalUsers = data?.total || 0;
  const totalPages = Math.ceil(totalUsers / limit);

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.startsWith?.("/api/admin/users") });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role, managedState }: { id: string; role: string; managedState: string }) =>
      apiRequest(`/api/admin/users/${id}/role`, "PATCH", {
        role,
        managedState: role === "state_admin" ? managedState : null,
      }),
    onSuccess: () => {
      invalidateUsers();
      setRoleDialogUser(null);
      toast({ title: "Role updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/admin/users/${id}`, "DELETE"),
    onSuccess: () => {
      invalidateUsers();
      setDeleteDialogUser(null);
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    },
  });

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700";
      case "state_admin": return "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700";
      case "moderator": return "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700";
      case "candidate": return "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700";
      default: return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600";
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === "state_admin") return "DBA";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const openRoleDialog = (user: any) => {
    setRoleDialogUser(user);
    setSelectedRole(user.role || "citizen");
    setSelectedState(user.managedState || "all");
  };

  const handleRoleSave = () => {
    if (!roleDialogUser) return;
    updateRoleMutation.mutate({
      id: roleDialogUser.id,
      role: selectedRole,
      managedState: selectedState === "all" ? "" : selectedState,
    });
  };

  const formatDate = (val: string | null) =>
    val ? new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">
              {totalUsers.toLocaleString()} registered users
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-5 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, username, or email…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Showing {users.length} of {totalUsers} users
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading users…
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No users found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead className="w-[260px]">User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[130px]">Role</TableHead>
                      <TableHead className="w-[140px]">Registered</TableHead>
                      <TableHead className="w-[140px]">Last Seen</TableHead>
                      <TableHead className="w-[130px]">Reg. IP</TableHead>
                      <TableHead className="w-[130px]">Last IP</TableHead>
                      <TableHead className="w-[110px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: any) => (
                      <>
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40"
                          onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                          data-testid={`row-user-${user.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                {(user.firstName?.[0] || user.username?.[0] || "?").toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : user.username}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {user.email || "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className={`text-xs px-2 py-0.5 w-fit ${getRoleBadgeClass(user.role)}`}>
                                {getRoleLabel(user.role)}
                              </Badge>
                              {user.managedState && (
                                <span className="text-xs text-muted-foreground">{user.managedState}</span>
                              )}
                              {user.subscriptionStatus && user.subscriptionStatus !== "free" && (
                                <Badge className="text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 w-fit" variant="outline">
                                  ACP+
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(user.createdAt)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(user.lastSeen)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {user.registrationIp || "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {user.lastLoginIp || "—"}
                          </TableCell>
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => openRoleDialog(user)}
                                title="Manage Role"
                              >
                                <Shield className="h-3.5 w-3.5" />
                              </Button>
                              {user.role !== "admin" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  onClick={() => setDeleteDialogUser(user)}
                                  title="Delete User"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded IP detail row */}
                        {expandedUserId === user.id && (
                          <TableRow key={`${user.id}-expanded`} className="bg-slate-50 dark:bg-slate-900/30">
                            <TableCell colSpan={8} className="py-3 px-6">
                              <div className="flex flex-wrap gap-6 text-sm">
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1">
                                    <Globe className="h-3 w-3" /> Registration IP
                                  </p>
                                  <p className="font-mono">{user.registrationIp || "N/A"}</p>
                                  {user.registrationCountry && <p className="text-xs text-muted-foreground">Country: {user.registrationCountry}</p>}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1">
                                    <Globe className="h-3 w-3" /> Last Login IP
                                  </p>
                                  <p className="font-mono">{user.lastLoginIp || "N/A"}</p>
                                  {user.lastLoginCountry && <p className="text-xs text-muted-foreground">Country: {user.lastLoginCountry}</p>}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">User ID</p>
                                  <p className="font-mono text-xs">{user.id}</p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, totalUsers)} of {totalUsers.toLocaleString()} users
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="flex items-center px-3 text-sm">Page {page + 1} of {totalPages}</div>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Role Management Dialog */}
      <Dialog open={!!roleDialogUser} onOpenChange={(open) => !open && setRoleDialogUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Manage Role — @{roleDialogUser?.username}
            </DialogTitle>
            <DialogDescription>
              Database Administrators (DBAs) can import and manage data for their assigned state.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen">Citizen — standard user</SelectItem>
                  <SelectItem value="candidate">Candidate — running for office</SelectItem>
                  <SelectItem value="moderator">Moderator — content moderation</SelectItem>
                  <SelectItem value="state_admin">Database Administrator (DBA) — manages data for a specific state</SelectItem>
                  <SelectItem value="admin">Admin — full access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRole === "state_admin" && (
              <div className="space-y-1.5">
                <Label>Managed State</Label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select a state…</SelectItem>
                    {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">This user can import candidate, representative, and SIG data for this state.</p>
              </div>
            )}

            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><strong>Citizen</strong> — post, vote, follow, engage</p>
              <p><strong>Candidate</strong> — candidate profile + citizen access</p>
              <p><strong>Moderator</strong> — review flagged content</p>
              <p><strong>DBA</strong> — import and manage data for one state</p>
              <p><strong>Admin</strong> — full system access</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogUser(null)} disabled={updateRoleMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleRoleSave}
              disabled={updateRoleMutation.isPending || (selectedRole === "state_admin" && (!selectedState || selectedState === "all"))}
            >
              {updateRoleMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialogUser} onOpenChange={(open) => !open && setDeleteDialogUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Permanently delete <strong>@{deleteDialogUser?.username}</strong>
              {deleteDialogUser?.email ? ` (${deleteDialogUser.email})` : ""}?
              All their posts, messages, and activity will be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogUser(null)} disabled={deleteUserMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUserMutation.mutate(deleteDialogUser.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</> : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
