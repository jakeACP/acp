import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNavigation } from "@/components/admin-navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Users, Globe, Shield, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export default function AdminUsersPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [roleDialogUser, setRoleDialogUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("citizen");
  const [selectedState, setSelectedState] = useState("all");
  const [deleteDialogUser, setDeleteDialogUser] = useState<any>(null);
  const { toast } = useToast();
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: [`/api/admin/users?limit=${limit}&offset=${page * limit}&search=${encodeURIComponent(search)}`],
  });

  const users = data?.users || [];
  const totalUsers = data?.total || 0;
  const totalPages = Math.ceil(totalUsers / limit);

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role, managedState }: { id: string; role: string; managedState: string }) => {
      return apiRequest(`/api/admin/users/${id}/role`, "PATCH", {
        role,
        managedState: role === "state_admin" ? managedState : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users?limit=${limit}&offset=${page * limit}`] });
      setRoleDialogUser(null);
      toast({ title: "Role updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/users/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users?limit=${limit}&offset=${page * limit}`] });
      setDeleteDialogUser(null);
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    },
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-600 text-white";
      case "state_admin": return "bg-orange-500 text-white";
      case "moderator": return "bg-blue-600 text-white";
      case "candidate": return "bg-purple-600 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === "state_admin") return "Database Administrator";
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-2">
            View all registered users with IP tracking information and role management
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
            <Input
              placeholder="Search by name, username, or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : users.length > 0 ? (
          <>
            <div className="space-y-4">
              {users.map((user: any) => (
                <Card key={user.id} data-testid={`card-user-${user.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          {user.firstName || ""} {user.lastName || ""} (@{user.username})
                        </CardTitle>
                        <div className="flex gap-2 mt-2 flex-wrap items-center">
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                          {user.managedState && (
                            <Badge variant="outline" className="text-orange-600 border-orange-400">
                              State: {user.managedState}
                            </Badge>
                          )}
                          {user.subscriptionStatus && user.subscriptionStatus !== "free" && (
                            <Badge className="bg-green-600 text-white">
                              ACP+ {user.subscriptionStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRoleDialog(user)}
                          className="flex items-center gap-1.5"
                          data-testid={`button-manage-role-${user.id}`}
                        >
                          <Shield className="h-3.5 w-3.5" />
                          Manage Role
                        </Button>
                        {user.role !== "admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteDialogUser(user)}
                            className="flex items-center gap-1.5 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950"
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Email:</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">User ID:</p>
                        <p className="text-sm font-mono text-muted-foreground">{user.id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Registered:</p>
                        <p className="text-sm text-muted-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleString() : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Last Seen:</p>
                        <p className="text-sm text-muted-foreground">
                          {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "Never"}
                        </p>
                      </div>

                      <div className="md:col-span-2 border-t pt-4 mt-2">
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          IP Address Tracking
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Registration IP</p>
                            <p className="text-sm font-mono">{user.registrationIp || "N/A"}</p>
                            {user.registrationCountry && (
                              <p className="text-xs text-muted-foreground mt-1">Country: {user.registrationCountry}</p>
                            )}
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Last Login IP</p>
                            <p className="text-sm font-mono">{user.lastLoginIp || "N/A"}</p>
                            {user.lastLoginCountry && (
                              <p className="text-xs text-muted-foreground mt-1">Country: {user.lastLoginCountry}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, totalUsers)} of {totalUsers} users
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center px-3">Page {page + 1} of {totalPages}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No users found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role Management Dialog */}
      <Dialog open={!!roleDialogUser} onOpenChange={(open) => !open && setRoleDialogUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Manage Role
            </DialogTitle>
            <DialogDescription>
              Update the role for <strong>@{roleDialogUser?.username}</strong>. Database Administrators (DBAs) can import and manage data for their assigned state.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger data-testid="select-role">
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
                  <SelectTrigger data-testid="select-managed-state">
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select a state…</SelectItem>
                    {US_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">This user will be able to import candidate, representative, and SIG data for this state.</p>
              </div>
            )}

            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><strong>Citizen</strong> — post, vote, follow, engage</p>
              <p><strong>Candidate</strong> — candidate profile + citizen access</p>
              <p><strong>Moderator</strong> — review flagged content</p>
              <p><strong>Database Administrator (DBA)</strong> — import and manage data for one state</p>
              <p><strong>Admin</strong> — full system access</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogUser(null)} disabled={updateRoleMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleRoleSave} disabled={updateRoleMutation.isPending || (selectedRole === "state_admin" && (!selectedState || selectedState === "all"))}>
              {updateRoleMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
              ) : (
                "Save Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!deleteDialogUser} onOpenChange={(open) => !open && setDeleteDialogUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>@{deleteDialogUser?.username}</strong>
              {deleteDialogUser?.email ? ` (${deleteDialogUser.email})` : ""}? This action cannot be undone.
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
              {deleteUserMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</>
              ) : (
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
