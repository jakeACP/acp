import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AdminNavigation } from "@/components/admin-navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminUserBansPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("permanent");
  const [customDays, setCustomDays] = useState("");

  const { data: bannedUsers, isLoading } = useQuery({
    queryKey: ['/api/admin/banned-users'],
  });

  const banMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banned-users'] });
      toast({ title: "User banned successfully" });
      setIsDialogOpen(false);
      setUserId("");
      setReason("");
      setDuration("permanent");
      setCustomDays("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error banning user", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (banId: string) => {
      return await apiRequest(`/api/admin/unban-user/${banId}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banned-users'] });
      toast({ title: "User unbanned successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error unbanning user", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleBanUser = () => {
    let expiresAt = undefined;
    if (duration !== "permanent") {
      const days = duration === "custom" ? parseInt(customDays) : parseInt(duration.replace("days", ""));
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + days);
      expiresAt = expireDate.toISOString();
    }

    banMutation.mutate({
      userId,
      reason,
      duration,
      expiresAt,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Ban Management</h1>
            <p className="text-muted-foreground mt-2">Manage banned users and bots</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-ban-user">
                <Shield className="mr-2 h-4 w-4" />
                Ban User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ban User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">User ID</label>
                  <Input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter user ID"
                    data-testid="input-user-id"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Reason</label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for ban"
                    data-testid="input-reason"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Duration</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger data-testid="select-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="1days">1 Day</SelectItem>
                      <SelectItem value="7days">7 Days</SelectItem>
                      <SelectItem value="30days">30 Days</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {duration === "custom" && (
                  <div>
                    <label className="text-sm font-medium">Days</label>
                    <Input
                      type="number"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      placeholder="Number of days"
                      data-testid="input-custom-days"
                    />
                  </div>
                )}

                <Button
                  onClick={handleBanUser}
                  disabled={!userId || !reason || banMutation.isPending}
                  className="w-full"
                  data-testid="button-submit-ban"
                >
                  Ban User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading banned users...</p>
          </div>
        ) : bannedUsers && bannedUsers.length > 0 ? (
          <div className="space-y-4">
            {bannedUsers.map((ban: any) => (
              <Card key={ban.id} data-testid={`card-ban-${ban.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-destructive" />
                        Banned User
                      </CardTitle>
                      <Badge variant={ban.isActive ? "destructive" : "secondary"} className="mt-2">
                        {ban.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {ban.isActive && (
                      <Button
                        onClick={() => unbanMutation.mutate(ban.id)}
                        variant="outline"
                        size="sm"
                        disabled={unbanMutation.isPending}
                        data-testid={`button-unban-${ban.id}`}
                      >
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Unban
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">User ID:</p>
                      <p className="text-sm font-mono text-muted-foreground">{ban.userId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Reason:</p>
                      <p className="text-sm text-muted-foreground">{ban.reason}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Duration:</p>
                      <p className="text-sm text-muted-foreground">{ban.duration}</p>
                    </div>
                    {ban.expiresAt && (
                      <div>
                        <p className="text-sm font-medium">Expires:</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(ban.expiresAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">Banned at:</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(ban.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No banned users</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
