import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, Building2, Plus, Edit, Trash2, UserPlus, MapPin, Upload } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";

type PoliticalPosition = {
  id: string;
  title: string;
  officeType: string;
  level: string;
  jurisdiction: string;
  district?: string;
  termLength?: number;
  isElected?: boolean;
  description?: string;
  displayOrder?: number;
  isActive: boolean;
  currentHolderId?: string;
};

type PoliticianProfile = {
  id: string;
  fullName: string;
  party?: string;
  email?: string;
  phone?: string;
  officeAddress?: string;
  website?: string;
  photoUrl?: string;
  biography?: string;
  termStart?: string;
  termEnd?: string;
  isCurrent: boolean;
  positionId?: string;
};

export default function AdminPoliticiansPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("positions");
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PoliticalPosition | null>(null);
  const [editingProfile, setEditingProfile] = useState<PoliticianProfile | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | undefined>(undefined);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningProfile, setAssigningProfile] = useState<PoliticianProfile | null>(null);

  const { data: positions = [], isLoading: positionsLoading } = useQuery<PoliticalPosition[]>({
    queryKey: ["/api/admin/political-positions"],
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery<PoliticianProfile[]>({
    queryKey: ["/api/admin/politician-profiles"],
  });

  const createPositionMutation = useMutation({
    mutationFn: async (data: Partial<PoliticalPosition>) => {
      return await apiRequest("/api/admin/political-positions", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/political-positions"] });
      toast({ title: "Position created successfully" });
      setPositionDialogOpen(false);
      setEditingPosition(null);
    },
    onError: (error: any) => {
      toast({ title: "Error creating position", description: error.message, variant: "destructive" });
    },
  });

  const updatePositionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PoliticalPosition> }) => {
      return await apiRequest(`/api/admin/political-positions/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/political-positions"] });
      toast({ title: "Position updated successfully" });
      setPositionDialogOpen(false);
      setEditingPosition(null);
    },
    onError: (error: any) => {
      toast({ title: "Error updating position", description: error.message, variant: "destructive" });
    },
  });

  const deletePositionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/political-positions/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/political-positions"] });
      toast({ title: "Position deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting position", description: error.message, variant: "destructive" });
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: Partial<PoliticianProfile>) => {
      return await apiRequest("/api/admin/politician-profiles", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      toast({ title: "Profile created successfully" });
      setProfileDialogOpen(false);
      setEditingProfile(null);
    },
    onError: (error: any) => {
      toast({ title: "Error creating profile", description: error.message, variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PoliticianProfile> }) => {
      return await apiRequest(`/api/admin/politician-profiles/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      toast({ title: "Profile updated successfully" });
      setProfileDialogOpen(false);
      setEditingProfile(null);
    },
    onError: (error: any) => {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/politician-profiles/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      toast({ title: "Profile deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting profile", description: error.message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ profileId, positionId }: { profileId: string; positionId: string }) => {
      return await apiRequest(`/api/admin/politician-profiles/${profileId}/assign`, "POST", { positionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/political-positions"] });
      toast({ title: "Politician assigned successfully" });
      setAssignDialogOpen(false);
      setAssigningProfile(null);
    },
    onError: (error: any) => {
      toast({ title: "Error assigning politician", description: error.message, variant: "destructive" });
    },
  });

  const handlePositionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      officeType: formData.get("officeType") as string,
      level: formData.get("level") as string,
      jurisdiction: formData.get("jurisdiction") as string,
      district: formData.get("district") as string || undefined,
      termLength: formData.get("termLength") ? parseInt(formData.get("termLength") as string) : undefined,
      isElected: formData.get("isElected") === "true",
      description: formData.get("description") as string || undefined,
      isActive: formData.get("isActive") === "true",
    };

    if (editingPosition) {
      updatePositionMutation.mutate({ id: editingPosition.id, data });
    } else {
      createPositionMutation.mutate(data);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const positionIdValue = formData.get("positionId") as string;
    const data = {
      fullName: formData.get("fullName") as string,
      party: formData.get("party") as string || undefined,
      email: formData.get("email") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      officeAddress: formData.get("officeAddress") as string || undefined,
      website: formData.get("website") as string || undefined,
      photoUrl: uploadedPhotoUrl || editingProfile?.photoUrl || undefined,
      biography: formData.get("biography") as string || undefined,
      termStart: formData.get("termStart") as string || undefined,
      termEnd: formData.get("termEnd") as string || undefined,
      isCurrent: formData.get("isCurrent") === "true",
      positionId: positionIdValue === "none" ? undefined : positionIdValue || undefined,
    };

    if (editingProfile) {
      updateProfileMutation.mutate({ id: editingProfile.id, data });
    } else {
      createProfileMutation.mutate(data);
    }
  };

  const handleAssignSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assigningProfile) return;
    
    const formData = new FormData(e.currentTarget);
    const positionId = formData.get("positionId") as string;
    
    if (positionId) {
      assignMutation.mutate({ profileId: assigningProfile.id, positionId });
    }
  };

  const activePositions = positions.filter(p => p.isActive);
  const filledPositions = positions.filter(p => p.currentHolderId);
  const currentProfiles = profiles.filter(p => p.isCurrent);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Politicians Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage political positions and politician profiles
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{positions.length}</div>
                <Building2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Active Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activePositions.length}</div>
                <MapPin className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{profiles.length}</div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Filled Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{filledPositions.length}</div>
                <UserPlus className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Politicians Management</CardTitle>
            <CardDescription>
              Manage political positions and politician profiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="positions" data-testid="tab-positions">Political Positions</TabsTrigger>
                <TabsTrigger value="profiles" data-testid="tab-profiles">Politician Profiles</TabsTrigger>
              </TabsList>

              <TabsContent value="positions" className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Political positions are permanent entities (e.g., "President of the United States", "Senator from California")
                  </p>
                  <Button
                    onClick={() => {
                      setEditingPosition(null);
                      setPositionDialogOpen(true);
                    }}
                    data-testid="button-create-position"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Position
                  </Button>
                </div>

                {positionsLoading ? (
                  <div className="text-center py-8">Loading positions...</div>
                ) : positions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No political positions created yet</p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Position Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Jurisdiction</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Current Holder</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {positions.map((position) => {
                          const currentHolder = profiles.find(p => p.id === position.currentHolderId);
                          return (
                            <TableRow key={position.id} data-testid={`row-position-${position.id}`}>
                              <TableCell className="font-medium">{position.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{position.officeType}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{position.level}</Badge>
                              </TableCell>
                              <TableCell>{position.jurisdiction}</TableCell>
                              <TableCell>
                                <Badge variant={position.isActive ? "default" : "secondary"}>
                                  {position.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {currentHolder ? currentHolder.fullName : <span className="text-slate-400">Vacant</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingPosition(position);
                                      setPositionDialogOpen(true);
                                    }}
                                    data-testid={`button-edit-position-${position.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm("Are you sure you want to delete this position?")) {
                                        deletePositionMutation.mutate(position.id);
                                      }
                                    }}
                                    data-testid={`button-delete-position-${position.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="profiles" className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Politician profiles represent the actual people who hold or have held political positions
                  </p>
                  <Button
                    onClick={() => {
                      setEditingProfile(null);
                      setUploadedPhotoUrl(undefined);
                      setProfileDialogOpen(true);
                    }}
                    data-testid="button-create-profile"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Profile
                  </Button>
                </div>

                {profilesLoading ? (
                  <div className="text-center py-8">Loading profiles...</div>
                ) : profiles.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No politician profiles created yet</p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Photo</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Term</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profiles.map((profile) => {
                          const position = positions.find(p => p.id === profile.positionId);
                          return (
                            <TableRow key={profile.id} data-testid={`row-profile-${profile.id}`}>
                              <TableCell>
                                {profile.photoUrl ? (
                                  <img
                                    src={profile.photoUrl}
                                    alt={profile.fullName}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-slate-400" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{profile.fullName}</TableCell>
                              <TableCell>{profile.party || "-"}</TableCell>
                              <TableCell>
                                {position ? position.title : <span className="text-slate-400">Not assigned</span>}
                              </TableCell>
                              <TableCell>
                                {profile.termStart && profile.termEnd
                                  ? `${profile.termStart} - ${profile.termEnd}`
                                  : profile.termStart || "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={profile.isCurrent ? "default" : "secondary"}>
                                  {profile.isCurrent ? "Current" : "Former"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setAssigningProfile(profile);
                                      setAssignDialogOpen(true);
                                    }}
                                    data-testid={`button-assign-${profile.id}`}
                                  >
                                    <UserPlus className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingProfile(profile);
                                      setUploadedPhotoUrl(profile.photoUrl);
                                      setProfileDialogOpen(true);
                                    }}
                                    data-testid={`button-edit-profile-${profile.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm("Are you sure you want to delete this profile?")) {
                                        deleteProfileMutation.mutate(profile.id);
                                      }
                                    }}
                                    data-testid={`button-delete-profile-${profile.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={positionDialogOpen} onOpenChange={setPositionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPosition ? "Edit Position" : "Create Position"}</DialogTitle>
            <DialogDescription>
              {editingPosition ? "Update the political position details" : "Create a new political position"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePositionSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Position Title *</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editingPosition?.title}
                  placeholder="e.g., President of the United States"
                  required
                  data-testid="input-title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="officeType">Office Type *</Label>
                  <Select name="officeType" defaultValue={editingPosition?.officeType || "Executive"} required>
                    <SelectTrigger data-testid="select-office-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Executive">Executive</SelectItem>
                      <SelectItem value="Legislative">Legislative</SelectItem>
                      <SelectItem value="Judicial">Judicial</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="level">Level *</Label>
                  <Select name="level" defaultValue={editingPosition?.level || "federal"} required>
                    <SelectTrigger data-testid="select-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="federal">Federal</SelectItem>
                      <SelectItem value="state">State</SelectItem>
                      <SelectItem value="county">County</SelectItem>
                      <SelectItem value="city">City</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="jurisdiction">Jurisdiction *</Label>
                  <Input
                    id="jurisdiction"
                    name="jurisdiction"
                    defaultValue={editingPosition?.jurisdiction}
                    placeholder="e.g., United States, California"
                    required
                    data-testid="input-jurisdiction"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="district">District (optional)</Label>
                  <Input
                    id="district"
                    name="district"
                    defaultValue={editingPosition?.district}
                    placeholder="e.g., 12th Congressional District"
                    data-testid="input-district"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="termLength">Term Length (years, optional)</Label>
                  <Input
                    id="termLength"
                    name="termLength"
                    type="number"
                    defaultValue={editingPosition?.termLength}
                    placeholder="e.g., 4"
                    data-testid="input-term-length"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="isElected">Type *</Label>
                  <Select name="isElected" defaultValue={editingPosition?.isElected !== false ? "true" : "false"} required>
                    <SelectTrigger data-testid="select-is-elected">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Elected</SelectItem>
                      <SelectItem value="false">Appointed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="isActive">Status *</Label>
                <Select name="isActive" defaultValue={editingPosition?.isActive !== false ? "true" : "false"} required>
                  <SelectTrigger data-testid="select-is-active">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingPosition?.description}
                  placeholder="Description of the position's duties and responsibilities"
                  rows={3}
                  data-testid="textarea-description"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPositionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-position">
                {editingPosition ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProfile ? "Edit Profile" : "Create Profile"}</DialogTitle>
            <DialogDescription>
              {editingProfile ? "Update the politician profile details" : "Create a new politician profile"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={editingProfile?.fullName}
                  placeholder="e.g., John Doe"
                  required
                  data-testid="input-full-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="party">Party (optional)</Label>
                  <Input
                    id="party"
                    name="party"
                    defaultValue={editingProfile?.party}
                    placeholder="e.g., Democratic, Republican"
                    data-testid="input-party"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="isCurrent">Status *</Label>
                  <Select name="isCurrent" defaultValue={editingProfile?.isCurrent !== false ? "true" : "false"} required>
                    <SelectTrigger data-testid="select-is-current">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Current</SelectItem>
                      <SelectItem value="false">Former</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingProfile?.email}
                    placeholder="contact@example.com"
                    data-testid="input-email"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={editingProfile?.phone}
                    placeholder="(555) 123-4567"
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="officeAddress">Office Address (optional)</Label>
                <Input
                  id="officeAddress"
                  name="officeAddress"
                  defaultValue={editingProfile?.officeAddress}
                  placeholder="123 Main St, Washington DC"
                  data-testid="input-office-address"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="website">Website (optional)</Label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  defaultValue={editingProfile?.website}
                  placeholder="https://example.com"
                  data-testid="input-website"
                />
              </div>

              <div className="grid gap-2">
                <Label>Profile Photo (optional, max 10MB)</Label>
                <div className="space-y-3">
                  {uploadedPhotoUrl && (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img
                        src={uploadedPhotoUrl}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760}
                    onGetUploadParameters={async () => {
                      const response = await fetch("/api/upload", {
                        method: "POST",
                        credentials: "include",
                      });
                      const data = await response.json();
                      return { method: "PUT", url: data.uploadURL };
                    }}
                    onComplete={(result) => {
                      if (result.successful && result.successful[0]?.uploadURL) {
                        const uploadedUrl = result.successful[0].uploadURL.split("?")[0];
                        const objectPath = uploadedUrl.split("/").slice(-2).join("/");
                        setUploadedPhotoUrl(`/objects/${objectPath}`);
                        toast({ title: "Photo uploaded successfully" });
                      }
                    }}
                    buttonClassName="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadedPhotoUrl ? "Change Photo" : "Upload Photo"}
                  </ObjectUploader>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="termStart">Term Start (optional)</Label>
                  <Input
                    id="termStart"
                    name="termStart"
                    defaultValue={editingProfile?.termStart}
                    placeholder="MM/DD/YYYY (e.g., 01/20/2021)"
                    data-testid="input-term-start"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="termEnd">Term End (optional)</Label>
                  <Input
                    id="termEnd"
                    name="termEnd"
                    defaultValue={editingProfile?.termEnd}
                    placeholder="MM/DD/YYYY (e.g., 01/20/2025)"
                    data-testid="input-term-end"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="positionId">Assign to Position (optional)</Label>
                <Select name="positionId" defaultValue={editingProfile?.positionId || "none"}>
                  <SelectTrigger data-testid="select-position-id">
                    <SelectValue placeholder="Select a position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No position</SelectItem>
                    {positions.map(position => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.title} - {position.jurisdiction}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="biography">Biography (optional)</Label>
                <Textarea
                  id="biography"
                  name="biography"
                  defaultValue={editingProfile?.biography}
                  placeholder="Brief biography or background information"
                  rows={4}
                  data-testid="textarea-biography"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProfileDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-profile">
                {editingProfile ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Politician to Position</DialogTitle>
            <DialogDescription>
              Select a political position for {assigningProfile?.fullName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="positionId">Political Position *</Label>
                <Select name="positionId" required>
                  <SelectTrigger data-testid="select-assign-position">
                    <SelectValue placeholder="Select a position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(position => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.title} - {position.jurisdiction}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-assign">
                Assign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
