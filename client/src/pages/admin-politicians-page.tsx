import { useState } from "react";
import { Link } from "wouter";
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
import { Users, Building2, Plus, Edit, Trash2, UserPlus, MapPin, Upload, Star, DollarSign, Link as LinkIcon, Unlink, Download, Loader2, Image, FileDown, Search, X, Shield, ExternalLink } from "lucide-react";
import { downloadCsv, TEMPLATES } from "@/lib/download-template";
import { ObjectUploader } from "@/components/ObjectUploader";

type SpecialInterestGroup = {
  id: string;
  name: string;
  acronym?: string;
  category: string;
  industry?: string;
  isActive: boolean;
};

type PoliticianSponsorship = {
  id: string;
  politicianId: string;
  sigId: string;
  relationshipType: string;
  reportedAmount?: number;
  contributionPeriod?: string;
  disclosureSource?: string;
  isVerified?: boolean;
  sig?: SpecialInterestGroup;
};

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
  featured?: boolean;
  corruptionGrade?: string;
  corruptionScorecard?: string;
  isVerified?: boolean;
  claimRequestEmail?: string;
  claimRequestPhone?: string;
  claimRequestStatus?: string;
  claimRequestDate?: string;
  verifiedDate?: string;
};

type ClaimRequest = PoliticianProfile & {
  position?: PoliticalPosition | null;
};

type PlatformCandidate = {
  id: string;
  userId: string;
  bio?: string;
  party?: string;
  platform?: string;
  location?: string;
  photoUrl?: string;
  websiteUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  user?: {
    username: string;
    displayName?: string;
    email?: string;
  };
};

type DelegateUser = {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  role: string;
  managedState?: string;
  createdAt?: string;
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
  const [sponsorDialogOpen, setSponsorDialogOpen] = useState(false);
  const [selectedPoliticianForSponsor, setSelectedPoliticianForSponsor] = useState<PoliticianProfile | null>(null);
  const [sponsorshipFilter, setSponsorshipFilter] = useState<string>("");

  // Positions search/filter
  const [positionSearch, setPositionSearch] = useState("");
  const [positionLevelFilter, setPositionLevelFilter] = useState("all");
  const [positionTypeFilter, setPositionTypeFilter] = useState("all");

  // Profiles search/filter
  const [profileSearch, setProfileSearch] = useState("");
  const [profilePartyFilter, setProfilePartyFilter] = useState("all");
  const [profileGradeFilter, setProfileGradeFilter] = useState("all");
  const [profileStatusFilter, setProfileStatusFilter] = useState("all");
  const [profileStateFilter, setProfileStateFilter] = useState("all");

  // Candidates search/filter
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidatePartyFilter, setCandidatePartyFilter] = useState("all");
  const [candidateStateFilter, setCandidateStateFilter] = useState("all");

  // Delegates search
  const [delegateSearch, setDelegateSearch] = useState("");

  const { data: positions = [], isLoading: positionsLoading } = useQuery<PoliticalPosition[]>({
    queryKey: ["/api/admin/political-positions"],
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery<PoliticianProfile[]>({
    queryKey: ["/api/admin/politician-profiles"],
  });

  const { data: claimRequests = [], isLoading: claimsLoading } = useQuery<ClaimRequest[]>({
    queryKey: ["/api/admin/politician-profiles/claim-requests"],
  });

  const { data: sigs = [] } = useQuery<SpecialInterestGroup[]>({
    queryKey: ["/api/admin/sigs"],
    queryFn: async () => {
      const response = await fetch("/api/admin/sigs?isActive=true", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch SIGs");
      return response.json();
    },
  });

  const { data: politicianSponsors = [], isLoading: sponsorsLoading } = useQuery<PoliticianSponsorship[]>({
    queryKey: ["/api/admin/politician-profiles", selectedPoliticianForSponsor?.id, "sponsors"],
    queryFn: async () => {
      if (!selectedPoliticianForSponsor) return [];
      const response = await fetch(`/api/admin/politician-profiles/${selectedPoliticianForSponsor.id}/sponsors`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch sponsors");
      return response.json();
    },
    enabled: !!selectedPoliticianForSponsor,
  });

  const { data: platformCandidates = [], isLoading: candidatesLoading } = useQuery<PlatformCandidate[]>({
    queryKey: ["/api/candidates"],
  });

  const { data: allAdminUsers = [], isLoading: delegatesLoading } = useQuery<DelegateUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
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
      setUploadedPhotoUrl(undefined);
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
      setUploadedPhotoUrl(undefined);
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

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      return await apiRequest(`/api/admin/politician-profiles/${id}/featured`, "PATCH", { featured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/politician-profiles/featured"] });
      toast({ title: "Featured status updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating featured status", description: error.message, variant: "destructive" });
    },
  });

  const updateCorruptionGradeMutation = useMutation({
    mutationFn: async ({ id, corruptionGrade }: { id: string; corruptionGrade: string | null }) => {
      return await apiRequest(`/api/admin/politician-profiles/${id}/corruption-grade`, "PATCH", { corruptionGrade });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/politician-profiles/featured"] });
      toast({ title: "Corruption grade updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating corruption grade", description: error.message, variant: "destructive" });
    },
  });

  const approveClaimMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/politician-profiles/${id}/claim-approve`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles/claim-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      toast({ title: "Claim request approved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error approving claim", description: error.message, variant: "destructive" });
    },
  });

  const rejectClaimMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/politician-profiles/${id}/claim-reject`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles/claim-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      toast({ title: "Claim request rejected" });
    },
    onError: (error: any) => {
      toast({ title: "Error rejecting claim", description: error.message, variant: "destructive" });
    },
  });

  const linkSponsorMutation = useMutation({
    mutationFn: async (data: { politicianId: string; sigId: string; relationshipType: string; reportedAmount?: number; contributionPeriod?: string; disclosureSource?: string }) => {
      return await apiRequest(`/api/admin/politician-profiles/${data.politicianId}/sponsors`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles", selectedPoliticianForSponsor?.id, "sponsors"] });
      toast({ title: "Sponsor linked successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error linking sponsor", description: error.message, variant: "destructive" });
    },
  });

  const unlinkSponsorMutation = useMutation({
    mutationFn: async ({ politicianId, sigId }: { politicianId: string; sigId: string }) => {
      return await apiRequest(`/api/admin/politician-profiles/${politicianId}/sponsors/${sigId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles", selectedPoliticianForSponsor?.id, "sponsors"] });
      toast({ title: "Sponsor unlinked successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error unlinking sponsor", description: error.message, variant: "destructive" });
    },
  });

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [handleDialogOpen, setHandleDialogOpen] = useState(false);

  const generateHandlesMutation = useMutation({
    mutationFn: async () => apiRequest("/api/admin/politicians/generate-handles", "POST"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      setHandleDialogOpen(false);
      toast({
        title: "Handles generated",
        description: `${data.updated} politician handles created (e.g. @TomEmmerMN). ${data.skipped} skipped (no position assigned).`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Handle generation failed", description: error.message, variant: "destructive" });
    },
  });

  const fetchPhotosMutation = useMutation({
    mutationFn: async () => apiRequest("/api/admin/politicians/fetch-photos", "POST"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      setPhotoDialogOpen(false);
      toast({
        title: "Photo fetch complete",
        description: `${data.fetched} photos fetched from Wikipedia, ${data.alreadyHad} already had photos, ${data.notFound} not found on Wikipedia.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Photo fetch failed", description: error.message, variant: "destructive" });
    },
  });

  const importCongressMutation = useMutation({
    mutationFn: async () => apiRequest("/api/admin/politicians/import-congress", "POST"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/political-positions"] });
      setImportDialogOpen(false);
      toast({
        title: "Congress import complete",
        description: `${data.profiles_created} created, ${data.profiles_updated} updated, ${data.positions_created} positions, ${data.sigs_created} lobby groups, ${data.sponsorships_created} sponsorships.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
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

  const handleSponsorSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPoliticianForSponsor) return;
    
    const formData = new FormData(e.currentTarget);
    const sigId = formData.get("sigId") as string;
    const relationshipType = formData.get("relationshipType") as string;
    const reportedAmountStr = formData.get("reportedAmount") as string;
    const contributionPeriod = formData.get("contributionPeriod") as string;
    const disclosureSource = formData.get("disclosureSource") as string;
    
    if (sigId && relationshipType) {
      linkSponsorMutation.mutate({
        politicianId: selectedPoliticianForSponsor.id,
        sigId,
        relationshipType,
        reportedAmount: reportedAmountStr ? parseInt(reportedAmountStr) * 100 : undefined,
        contributionPeriod: contributionPeriod || undefined,
        disclosureSource: disclosureSource || undefined,
      });
    }
  };

  const activePositions = positions.filter(p => p.isActive);
  const filledPositions = positions.filter(p => p.currentHolderId);
  const currentProfiles = profiles.filter(p => p.isCurrent);

  // Derived filter options
  const uniqueParties = [...new Set(profiles.map(p => p.party).filter(Boolean) as string[])].sort();
  const uniqueJurisdictions = [...new Set(positions.map(p => p.jurisdiction).filter(Boolean) as string[])].sort();
  const delegates = allAdminUsers.filter(u => ["admin", "state_admin", "moderator"].includes(u.role));

  // Filtered positions
  const filteredPositions = positions.filter(p => {
    const q = positionSearch.toLowerCase();
    const holder = profiles.find(pr => pr.id === p.currentHolderId);
    const matchSearch = !q
      || p.title.toLowerCase().includes(q)
      || p.jurisdiction.toLowerCase().includes(q)
      || p.officeType.toLowerCase().includes(q)
      || p.level.toLowerCase().includes(q)
      || (p.district || "").toLowerCase().includes(q)
      || (holder?.fullName || "").toLowerCase().includes(q);
    const matchLevel = positionLevelFilter === "all" || p.level === positionLevelFilter;
    const matchType = positionTypeFilter === "all" || p.officeType === positionTypeFilter;
    return matchSearch && matchLevel && matchType;
  });

  // Filtered profiles
  const filteredProfiles = profiles.filter(p => {
    const q = profileSearch.toLowerCase();
    const position = positions.find(pos => pos.id === p.positionId);
    const matchSearch = !q
      || p.fullName.toLowerCase().includes(q)
      || (p.party || "").toLowerCase().includes(q)
      || (p.biography || "").toLowerCase().includes(q)
      || (p.email || "").toLowerCase().includes(q)
      || (position?.title || "").toLowerCase().includes(q)
      || (position?.jurisdiction || "").toLowerCase().includes(q)
      || (position?.district || "").toLowerCase().includes(q);
    const matchParty = profilePartyFilter === "all" || p.party === profilePartyFilter;
    const matchGrade = profileGradeFilter === "all"
      || (profileGradeFilter === "none" ? !p.corruptionGrade : p.corruptionGrade === profileGradeFilter);
    const matchStatus = profileStatusFilter === "all"
      || (profileStatusFilter === "current" ? p.isCurrent : !p.isCurrent);
    const matchState = profileStateFilter === "all"
      || (position?.jurisdiction || "").toLowerCase().includes(profileStateFilter.toLowerCase());
    return matchSearch && matchParty && matchGrade && matchStatus && matchState;
  });

  // Filtered candidates
  const filteredCandidates = platformCandidates.filter(c => {
    const q = candidateSearch.toLowerCase();
    const matchSearch = !q
      || (c.user?.username || "").toLowerCase().includes(q)
      || (c.user?.displayName || "").toLowerCase().includes(q)
      || (c.party || "").toLowerCase().includes(q)
      || (c.bio || "").toLowerCase().includes(q)
      || (c.location || "").toLowerCase().includes(q)
      || (c.platform || "").toLowerCase().includes(q);
    const matchParty = candidatePartyFilter === "all" || c.party === candidatePartyFilter;
    const matchState = candidateStateFilter === "all"
      || (c.location || "").toLowerCase().includes(candidateStateFilter.toLowerCase());
    return matchSearch && matchParty && matchState;
  });

  // Filtered delegates
  const filteredDelegates = delegates.filter(u => {
    const q = delegateSearch.toLowerCase();
    return !q
      || u.username.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || (u.displayName || "").toLowerCase().includes(q)
      || (u.managedState || "").toLowerCase().includes(q)
      || u.role.toLowerCase().includes(q);
  });

  const ROLE_COLORS: Record<string, string> = {
    admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    state_admin: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    moderator: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Politicians Management</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage political positions and politician profiles
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => setHandleDialogOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Generate @Handles
            </Button>
            <Button
              onClick={() => setPhotoDialogOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Image className="w-4 h-4" />
              Fetch Wikipedia Photos
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadCsv(TEMPLATES.politicians.filename, TEMPLATES.politicians.headers, TEMPLATES.politicians.sample)}
              className="flex items-center gap-2"
              title="Download blank CSV template for politician data"
            >
              <FileDown className="w-4 h-4" />
              Download Template
            </Button>
            <Button
              onClick={() => setImportDialogOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4" />
              Import Candidates
            </Button>
          </div>
        </div>

        {/* Generate Handles Dialog */}
        <Dialog open={handleDialogOpen} onOpenChange={setHandleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate @Handles for Politicians</DialogTitle>
              <DialogDescription>
                This will create a unique @handle for every Congress member in the format @FirstLastState.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300 py-2">
              <p>• Format: <strong>@FirstLastState</strong> (e.g. @TomEmmerMN, @AmyKlobucharMN)</p>
              <p>• Derived from each politician's name + their state from their position title</p>
              <p>• Middle initials and suffixes (Jr., Sr., II, III) are automatically stripped</p>
              <p>• Duplicates are automatically resolved by appending a number</p>
              <p>• Safe to re-run — existing handles will be overwritten with regenerated ones</p>
              <p className="text-slate-500 dark:text-slate-400 mt-3">
                Only politicians with an assigned position (state) can receive a handle. Run the Congress import first if needed.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHandleDialogOpen(false)} disabled={generateHandlesMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => generateHandlesMutation.mutate()}
                disabled={generateHandlesMutation.isPending}
                className="bg-slate-800 hover:bg-slate-900 text-white"
              >
                {generateHandlesMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating handles...</>
                ) : (
                  <><Users className="w-4 h-4 mr-2" />Generate Handles</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fetch Wikipedia Photos Dialog */}
        <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fetch Wikipedia Headshots</DialogTitle>
              <DialogDescription>
                This will pull official headshots for all 535 Congress members from Wikipedia.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300 py-2">
              <p>• Photos are sourced from <strong>Wikipedia / Wikimedia Commons</strong> (free, no API key)</p>
              <p>• Only politicians <strong>without an existing photo</strong> will be updated</p>
              <p>• Photos will appear <strong>in grayscale</strong> until the politician claims their profile</p>
              <p>• This process fetches ~535 photos with a brief pause between each request</p>
              <p className="text-amber-600 dark:text-amber-400 mt-3">
                ⏱ This will take approximately <strong>60–90 seconds</strong> to complete.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPhotoDialogOpen(false)} disabled={fetchPhotosMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => fetchPhotosMutation.mutate()}
                disabled={fetchPhotosMutation.isPending}
                className="bg-slate-800 hover:bg-slate-900 text-white"
              >
                {fetchPhotosMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Fetching photos... (~60–90 seconds)
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4 mr-2" />
                    Start Fetch
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Congress Import Confirmation Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import All Congress Members</DialogTitle>
              <DialogDescription>
                This will import 535 members of Congress from the TrackAIPAC dataset, including:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300 py-2">
              <p>• <strong>535 politician profiles</strong> (100 senators + 435 House members)</p>
              <p>• <strong>535 congressional positions</strong> (one per district seat)</p>
              <p>• <strong>53 lobby group records</strong> (AIPAC, DMFI, RJC, and more)</p>
              <p>• <strong>SIG sponsorships</strong> linking each politician to their lobby groups</p>
              <p>• <strong>Corruption grades</strong> based on total Israel lobby funding received</p>
              <p>• <strong>"Rejects AIPAC" badges</strong> for 16 politicians who publicly rejected funding</p>
              <p className="text-slate-500 dark:text-slate-400 mt-3">
                This is safe to run multiple times — it will update existing records and skip duplicates.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importCongressMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => importCongressMutation.mutate()}
                disabled={importCongressMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {importCongressMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing... (this may take a minute)
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Start Import
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="positions" data-testid="tab-positions">Positions</TabsTrigger>
                <TabsTrigger value="profiles" data-testid="tab-profiles">Profiles</TabsTrigger>
                <TabsTrigger value="candidates" data-testid="tab-candidates">Candidates</TabsTrigger>
                <TabsTrigger value="delegates" data-testid="tab-delegates">Delegates</TabsTrigger>
              </TabsList>

              {/* ── POSITIONS TAB ── */}
              <TabsContent value="positions" className="space-y-4">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg">
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

                {/* Search + filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by title, jurisdiction, district, holder..."
                      value={positionSearch}
                      onChange={e => setPositionSearch(e.target.value)}
                      className="pl-8"
                    />
                    {positionSearch && (
                      <button onClick={() => setPositionSearch("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Select value={positionLevelFilter} onValueChange={setPositionLevelFilter}>
                    <SelectTrigger className="w-[130px]"><SelectValue placeholder="Level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="federal">Federal</SelectItem>
                      <SelectItem value="state">State</SelectItem>
                      <SelectItem value="county">County</SelectItem>
                      <SelectItem value="city">City</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={positionTypeFilter} onValueChange={setPositionTypeFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Executive">Executive</SelectItem>
                      <SelectItem value="Legislative">Legislative</SelectItem>
                      <SelectItem value="Judicial">Judicial</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-slate-500">{filteredPositions.length} of {positions.length}</span>
                </div>

                {positionsLoading ? (
                  <div className="text-center py-8">Loading positions...</div>
                ) : filteredPositions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{positions.length === 0 ? "No political positions created yet" : "No positions match your search"}</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Position Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Jurisdiction</TableHead>
                          <TableHead>District</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Current Holder</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPositions.map((position) => {
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
                              <TableCell className="text-slate-500 text-sm">{position.district || "-"}</TableCell>
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

              {/* ── PROFILES TAB ── */}
              <TabsContent value="profiles" className="space-y-4">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg">
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

                {/* Search + filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by name, party, position, state, district, bio..."
                      value={profileSearch}
                      onChange={e => setProfileSearch(e.target.value)}
                      className="pl-8"
                    />
                    {profileSearch && (
                      <button onClick={() => setProfileSearch("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Select value={profileStatusFilter} onValueChange={setProfileStatusFilter}>
                    <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="former">Former</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={profilePartyFilter} onValueChange={setProfilePartyFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Party" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Parties</SelectItem>
                      {uniqueParties.map(party => (
                        <SelectItem key={party} value={party}>{party}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={profileGradeFilter} onValueChange={setProfileGradeFilter}>
                    <SelectTrigger className="w-[120px]"><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      <SelectItem value="A">Grade A</SelectItem>
                      <SelectItem value="B">Grade B</SelectItem>
                      <SelectItem value="C">Grade C</SelectItem>
                      <SelectItem value="D">Grade D</SelectItem>
                      <SelectItem value="F">Grade F</SelectItem>
                      <SelectItem value="none">No Grade</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={profileStateFilter} onValueChange={setProfileStateFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Jurisdiction" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jurisdictions</SelectItem>
                      {uniqueJurisdictions.slice(0, 60).map(j => (
                        <SelectItem key={j} value={j}>{j}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-slate-500">{filteredProfiles.length} of {profiles.length}</span>
                </div>

                {profilesLoading ? (
                  <div className="text-center py-8">Loading profiles...</div>
                ) : filteredProfiles.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{profiles.length === 0 ? "No politician profiles created yet" : "No profiles match your search"}</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">Featured</TableHead>
                          <TableHead className="w-[60px]">Photo</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Term</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProfiles.map((profile) => {
                          const position = positions.find(p => p.id === profile.positionId);
                          return (
                            <TableRow key={profile.id} data-testid={`row-profile-${profile.id}`}>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    toggleFeaturedMutation.mutate({ 
                                      id: profile.id, 
                                      featured: !profile.featured 
                                    });
                                  }}
                                  data-testid={`button-star-${profile.id}`}
                                  className="p-1"
                                >
                                  <Star 
                                    className={`h-5 w-5 ${profile.featured ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} 
                                  />
                                </Button>
                              </TableCell>
                              <TableCell>
                                {profile.photoUrl ? (
                                  <img
                                    src={profile.photoUrl}
                                    alt={profile.fullName}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-slate-400" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{profile.fullName}</TableCell>
                              <TableCell className="text-sm">{profile.party || "-"}</TableCell>
                              <TableCell className="text-sm">
                                {position ? position.title : <span className="text-slate-400">Not assigned</span>}
                              </TableCell>
                              <TableCell className="text-sm text-slate-500">
                                {position?.jurisdiction || "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {profile.termStart && profile.termEnd
                                  ? `${profile.termStart} – ${profile.termEnd}`
                                  : profile.termStart || "-"}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={profile.corruptionGrade || "none"}
                                  onValueChange={(value) => {
                                    updateCorruptionGradeMutation.mutate({
                                      id: profile.id,
                                      corruptionGrade: value === "none" ? null : value
                                    });
                                  }}
                                >
                                  <SelectTrigger className="w-[70px]" data-testid={`select-grade-${profile.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">-</SelectItem>
                                    <SelectItem value="A">A</SelectItem>
                                    <SelectItem value="B">B</SelectItem>
                                    <SelectItem value="C">C</SelectItem>
                                    <SelectItem value="D">D</SelectItem>
                                    <SelectItem value="F">F</SelectItem>
                                  </SelectContent>
                                </Select>
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

              {/* ── CANDIDATES TAB ── */}
              <TabsContent value="candidates" className="space-y-4">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg">
                    Platform users who have registered as election candidates. Use the Import Candidates button above to bulk-import from CSV.
                  </p>
                </div>

                {/* Search + filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by name, party, location, platform, bio..."
                      value={candidateSearch}
                      onChange={e => setCandidateSearch(e.target.value)}
                      className="pl-8"
                    />
                    {candidateSearch && (
                      <button onClick={() => setCandidateSearch("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Select value={candidatePartyFilter} onValueChange={setCandidatePartyFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Party" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Parties</SelectItem>
                      {[...new Set(platformCandidates.map(c => c.party).filter(Boolean) as string[])].sort().map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={candidateStateFilter} onValueChange={setCandidateStateFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="State/Location" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {[...new Set(platformCandidates.map(c => c.location).filter(Boolean) as string[])].sort().map(loc => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-slate-500">{filteredCandidates.length} of {platformCandidates.length}</span>
                </div>

                {candidatesLoading ? (
                  <div className="text-center py-8">Loading candidates...</div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{platformCandidates.length === 0 ? "No candidates have registered on the platform yet" : "No candidates match your search"}</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Photo</TableHead>
                          <TableHead>Name / Username</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Bio</TableHead>
                          <TableHead>Website</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCandidates.map((candidate) => (
                          <TableRow key={candidate.id}>
                            <TableCell>
                              {candidate.photoUrl ? (
                                <img
                                  src={candidate.photoUrl}
                                  alt=""
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                  <Users className="h-5 w-5 text-slate-400" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{candidate.user?.displayName || candidate.user?.username || "Unknown"}</div>
                              {candidate.user?.username && (
                                <div className="text-xs text-slate-500">@{candidate.user.username}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{candidate.party || "-"}</TableCell>
                            <TableCell className="text-sm">{candidate.location || "-"}</TableCell>
                            <TableCell className="text-sm max-w-[200px]">
                              <span className="line-clamp-2 text-slate-600 dark:text-slate-400">
                                {candidate.bio || "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              {candidate.websiteUrl ? (
                                <a href={candidate.websiteUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" />Site
                                </a>
                              ) : <span className="text-slate-400 text-xs">-</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={candidate.isActive ? "default" : "secondary"}>
                                {candidate.isActive ? "Active" : "Inactive"}
                              </Badge>
                              {candidate.isFeatured && (
                                <Badge className="ml-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Featured</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* ── DELEGATES TAB ── */}
              <TabsContent value="delegates" className="space-y-4">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg">
                      Delegates are users with elevated roles (Admin, State Admin, Moderator) who have permission to manage and import Candidates, Current Reps, and Positions. Assign roles in User Management.
                    </p>
                  </div>
                  <Link href="/admin/users">
                    <Button variant="outline" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Manage Roles
                    </Button>
                  </Link>
                </div>

                {/* Search */}
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by name, email, role, state..."
                      value={delegateSearch}
                      onChange={e => setDelegateSearch(e.target.value)}
                      className="pl-8"
                    />
                    {delegateSearch && (
                      <button onClick={() => setDelegateSearch("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{filteredDelegates.length} of {delegates.length} delegates</span>
                </div>

                {delegatesLoading ? (
                  <div className="text-center py-8">Loading delegates...</div>
                ) : filteredDelegates.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{delegates.length === 0 ? "No delegates assigned yet. Go to User Management to grant roles." : "No delegates match your search"}</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Display Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Managed State</TableHead>
                          <TableHead>Permissions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDelegates.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">@{user.username}</TableCell>
                            <TableCell className="text-sm">{user.displayName || "-"}</TableCell>
                            <TableCell className="text-sm text-slate-500">{user.email}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[user.role] || "bg-slate-100 text-slate-700"}`}>
                                {user.role === "state_admin" ? "State Admin" : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {user.managedState ? (
                                <Badge variant="outline">{user.managedState}</Badge>
                              ) : (
                                <span className="text-slate-400 text-sm">All states</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {user.role === "admin" && "Full access: Candidates, Reps, Positions, SIGs"}
                              {user.role === "state_admin" && `State data: ${user.managedState || "unset"} — Candidates, Reps, Positions`}
                              {user.role === "moderator" && "Import access: Candidates, Reps, Positions"}
                            </TableCell>
                          </TableRow>
                        ))}
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
                      const { getCsrfToken } = await import("@/lib/queryClient");
                      const token = getCsrfToken();
                      const response = await fetch("/api/upload", {
                        method: "POST",
                        credentials: "include",
                        headers: token ? { "x-csrf-token": token } : {},
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

      <Dialog open={sponsorDialogOpen} onOpenChange={setSponsorDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Campaign Sponsor</DialogTitle>
            <DialogDescription>
              Add a SIG/sponsor relationship for {selectedPoliticianForSponsor?.fullName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            handleSponsorSubmit(e);
            setSponsorDialogOpen(false);
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="sigId">Organization *</Label>
                <Select name="sigId" required>
                  <SelectTrigger data-testid="select-sig">
                    <SelectValue placeholder="Select a Special Interest Group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sigs.filter(sig => 
                      !politicianSponsors.some(s => s.sigId === sig.id)
                    ).map(sig => (
                      <SelectItem key={sig.id} value={sig.id}>
                        {sig.name} {sig.acronym && `(${sig.acronym})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sigs.length === 0 && (
                  <p className="text-sm text-amber-600">
                    No SIGs found. Create some in the SIGs management page first.
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="relationshipType">Relationship Type *</Label>
                <Select name="relationshipType" defaultValue="donor" required>
                  <SelectTrigger data-testid="select-relationship-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary_sponsor">Primary Sponsor</SelectItem>
                    <SelectItem value="donor">Donor</SelectItem>
                    <SelectItem value="affiliated">Affiliated</SelectItem>
                    <SelectItem value="endorsed">Endorsed By</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="reportedAmount">Reported Amount ($)</Label>
                  <Input
                    id="reportedAmount"
                    name="reportedAmount"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g., 50000"
                    data-testid="input-amount"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contributionPeriod">Period</Label>
                  <Input
                    id="contributionPeriod"
                    name="contributionPeriod"
                    placeholder="e.g., 2020-2024"
                    data-testid="input-period"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="disclosureSource">Disclosure Source</Label>
                <Input
                  id="disclosureSource"
                  name="disclosureSource"
                  placeholder="e.g., FEC, OpenSecrets, Campaign Finance Database"
                  data-testid="input-source"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSponsorDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={linkSponsorMutation.isPending} data-testid="btn-submit-sponsor">
                {linkSponsorMutation.isPending ? "Linking..." : "Link Sponsor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
