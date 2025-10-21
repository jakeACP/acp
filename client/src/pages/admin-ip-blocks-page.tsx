import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AdminNavigation } from "@/components/admin-navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminIpBlocksPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ipAddress, setIpAddress] = useState("");
  const [reason, setReason] = useState("");

  const { data: blockedIps, isLoading } = useQuery({
    queryKey: ['/api/admin/blocked-ips'],
  });

  const blockMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/admin/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blocked-ips'] });
      toast({ title: "IP address blocked successfully" });
      setIsDialogOpen(false);
      setIpAddress("");
      setReason("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error blocking IP", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/unblock-ip/${id}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blocked-ips'] });
      toast({ title: "IP address unblocked successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error unblocking IP", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleBlockIp = () => {
    blockMutation.mutate({ ipAddress, reason });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">IP Blocking</h1>
            <p className="text-muted-foreground mt-2">Manage blocked IP addresses</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-block-ip">
                <ShieldAlert className="mr-2 h-4 w-4" />
                Block IP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Block IP Address</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">IP Address</label>
                  <Input
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="192.168.1.1"
                    data-testid="input-ip-address"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Reason</label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for blocking this IP"
                    data-testid="input-reason"
                  />
                </div>

                <Button
                  onClick={handleBlockIp}
                  disabled={!ipAddress || !reason || blockMutation.isPending}
                  className="w-full"
                  data-testid="button-submit-block"
                >
                  Block IP
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading blocked IPs...</p>
          </div>
        ) : blockedIps && blockedIps.length > 0 ? (
          <div className="space-y-4">
            {blockedIps.map((block: any) => (
              <Card key={block.id} data-testid={`card-ip-${block.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                        {block.ipAddress}
                      </CardTitle>
                      <Badge variant={block.isActive ? "destructive" : "secondary"} className="mt-2">
                        {block.isActive ? "Blocked" : "Unblocked"}
                      </Badge>
                    </div>
                    {block.isActive && (
                      <Button
                        onClick={() => unblockMutation.mutate(block.id)}
                        variant="outline"
                        size="sm"
                        disabled={unblockMutation.isPending}
                        data-testid={`button-unblock-${block.id}`}
                      >
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Unblock
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Reason:</p>
                      <p className="text-sm text-muted-foreground">{block.reason}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Blocked at:</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(block.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {block.unblockedAt && (
                      <div>
                        <p className="text-sm font-medium">Unblocked at:</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(block.unblockedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No blocked IPs</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
