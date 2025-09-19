import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Copy, Trash2, Calendar, Users, Mail, CheckCircle, XCircle } from "lucide-react";
import { Redirect } from "wouter";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";

const createInvitationSchema = z.object({
  email: z.string().email("Please enter a valid email").or(z.literal("")).optional(),
  expiresAt: z.string().optional(),
  maxUses: z.number().min(1, "Max uses must be at least 1").max(100, "Max uses cannot exceed 100").default(1),
});

type CreateInvitationData = z.infer<typeof createInvitationSchema>;

interface Invitation {
  id: string;
  token: string;
  email: string | null;
  invitedBy: string;
  usedBy: string | null;
  isUsed: boolean;
  expiresAt: string | null;
  maxUses: number;
  usageCount: number;
  createdAt: string;
  usedAt: string | null;
}

export default function AdminInvitationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const invitationForm = useForm<CreateInvitationData>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      maxUses: 1,
    },
  });

  // Redirect if not admin
  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: invitations = [], isLoading, refetch } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const createInvitationMutation = useMutation({
    mutationFn: async (data: CreateInvitationData): Promise<Invitation & { invitationUrl: string }> => {
      const response = await apiRequest("/api/invitations", "POST", {
        ...data,
        email: data.email || null,
        expiresAt: data.expiresAt || null,
      });
      return response.json();
    },
    onSuccess: (invitation) => {
      refetch();
      invitationForm.reset();
      toast({
        title: "Invitation created",
        description: "The invitation link has been generated successfully.",
      });
      // Auto-copy the invitation URL
      navigator.clipboard.writeText(invitation.invitationUrl);
      setCopiedToken(invitation.token);
      setTimeout(() => setCopiedToken(null), 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiRequest(`/api/invitations/${id}`, "DELETE");
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Invitation deleted",
        description: "The invitation has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCreateInvitation = (data: CreateInvitationData) => {
    createInvitationMutation.mutate(data);
  };

  const copyInvitationUrl = (token: string) => {
    const invitationUrl = `${window.location.origin}/register?invitation=${token}`;
    navigator.clipboard.writeText(invitationUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
    toast({
      title: "Copied to clipboard",
      description: "The invitation link has been copied to your clipboard.",
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Invitation Management</h1>
          <p className="text-slate-600 mt-2">Create and manage user invitations for the ACP platform</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Create Invitation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Invitation
              </CardTitle>
              <CardDescription>
                Generate invitation links for new users to join the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={invitationForm.handleSubmit(onCreateInvitation)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    {...invitationForm.register("email")}
                    placeholder="Restrict to specific email (optional)"
                    disabled={createInvitationMutation.isPending}
                    data-testid="input-invitation-email"
                  />
                  {invitationForm.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">
                      {invitationForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="maxUses">Max Uses</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    max="100"
                    {...invitationForm.register("maxUses", { valueAsNumber: true })}
                    placeholder="How many times this invitation can be used"
                    disabled={createInvitationMutation.isPending}
                    data-testid="input-invitation-max-uses"
                  />
                  {invitationForm.formState.errors.maxUses && (
                    <p className="text-sm text-destructive mt-1">
                      {invitationForm.formState.errors.maxUses.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    {...invitationForm.register("expiresAt")}
                    disabled={createInvitationMutation.isPending}
                    data-testid="input-invitation-expires"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createInvitationMutation.isPending}
                  data-testid="button-create-invitation"
                >
                  {createInvitationMutation.isPending ? (
                    <>
                      <LoadingSpinner />
                      <span className="ml-2">Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Invitation
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Invitation Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Invitation Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {invitations.filter(inv => inv.isUsed).length}
                  </div>
                  <div className="text-sm text-green-700">Used Invitations</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {invitations.filter(inv => !inv.isUsed && !isExpired(inv.expiresAt)).length}
                  </div>
                  <div className="text-sm text-blue-700">Active Invitations</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {invitations.filter(inv => isExpired(inv.expiresAt)).length}
                  </div>
                  <div className="text-sm text-red-700">Expired Invitations</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {invitations.length}
                  </div>
                  <div className="text-sm text-gray-700">Total Invitations</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invitations List */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>All Invitations</CardTitle>
            <CardDescription>Manage all created invitations</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No invitations created yet. Create your first invitation above.
              </div>
            ) : (
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="border rounded-lg p-4 flex items-center justify-between bg-white"
                    data-testid={`invitation-card-${invitation.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {invitation.isUsed ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Used
                          </Badge>
                        ) : isExpired(invitation.expiresAt) ? (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Expired
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-blue-100 text-blue-800">
                            Active
                          </Badge>
                        )}
                        {invitation.email && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {invitation.email}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 grid grid-cols-2 gap-4">
                        <div>Created: {formatDate(invitation.createdAt)}</div>
                        <div>Uses: {invitation.usageCount}/{invitation.maxUses}</div>
                        <div>Expires: {formatDate(invitation.expiresAt)}</div>
                        <div>Used: {formatDate(invitation.usedAt)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInvitationUrl(invitation.token)}
                        disabled={invitation.isUsed || isExpired(invitation.expiresAt)}
                        data-testid={`button-copy-${invitation.id}`}
                      >
                        {copiedToken === invitation.token ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy Link
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                        disabled={deleteInvitationMutation.isPending}
                        data-testid={`button-delete-${invitation.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}