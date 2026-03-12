import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
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
import { Users, Building2, Plus, Edit, Trash2, UserPlus, MapPin, Upload, Star, DollarSign, Link as LinkIcon, Unlink, Download, Loader2, FileDown, Search, X, Shield, ExternalLink, RefreshCw, CheckCircle2, XCircle, Inbox, ShieldCheck, Calculator, ArrowUp, ArrowDown, Bot as BotIcon } from "lucide-react";
import { downloadCsv, TEMPLATES } from "@/lib/download-template";
import { ObjectUploader } from "@/components/ObjectUploader";

type SpecialInterestGroup = {
  id: string;
  name: string;
  acronym?: string;
  category: string;
  industry?: string;
  gradeWeight?: number;
  isAce?: boolean;
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
  sigRank?: number | null;
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
  profileType?: string;
  positionId?: string;
  featured?: boolean;
  handle?: string;
  corruptionGrade?: string;
  corruptionScorecard?: string;
  totalContributions?: number | null;
  totalLobbyAmount?: number | null;
  numericScore?: number | null;
  fecCandidateId?: string | null;
  communityAdj?: number | null;
  gradeExplanation?: any;
  isVerified?: boolean;
  claimRequestEmail?: string;
  claimRequestPhone?: string;
  claimRequestStatus?: string;
  claimRequestDate?: string;
  verifiedDate?: string;
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
  const [manageSigsOpen, setManageSigsOpen] = useState(false);
  const [managingSigsPolitician, setManagingSigsPolitician] = useState<PoliticianProfile | null>(null);

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

  // AI State Scan
  const [scanState, setScanState] = useState("");
  const [scanPreview, setScanPreview] = useState<{
    stateName: string; profilesWithMissingData: number; positionsWithoutIncumbents: number;
    totalItems: number; estimatedSeconds: number; sampleProfiles: string[]; samplePositions: string[];
  } | null>(null);
  const [scanStatus, setScanStatus] = useState<"idle"|"previewing"|"ready"|"running"|"done">("idle");
  const [scanResult, setScanResult] = useState<{ updatedProfiles: number; createdProfiles: number; errors: string[] } | null>(null);
  const [scanElapsed, setScanElapsed] = useState(0);

  // SuperPAC Scan
  const [superPacStatus, setSuperPacStatus] = useState<"idle"|"running"|"done">("idle");
  const [superPacElapsed, setSuperPacElapsed] = useState(0);
  const [superPacResult, setSuperPacResult] = useState<{ candidatesScanned: number; newSigs: number; updatedSigs: number; skipped: number; errors: string[] } | null>(null);


  const { data: positions = [], isLoading: positionsLoading } = useQuery<PoliticalPosition[]>({
    queryKey: ["/api/admin/political-positions"],
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery<PoliticianProfile[]>({
    queryKey: ["/api/admin/politician-profiles"],
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

  const { data: managedSponsors = [], isLoading: managedSponsorsLoading } = useQuery<PoliticianSponsorship[]>({
    queryKey: ["/api/admin/politician-profiles", managingSigsPolitician?.id, "sponsors"],
    queryFn: async () => {
      if (!managingSigsPolitician) return [];
      const response = await fetch(`/api/admin/politician-profiles/${managingSigsPolitician.id}/sponsors`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch sponsors");
      return response.json();
    },
    enabled: !!managingSigsPolitician,
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles", managingSigsPolitician?.id, "sponsors"] });
      toast({ title: "Sponsor unlinked successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error unlinking sponsor", description: error.message, variant: "destructive" });
    },
  });

  const updateSponsorRankMutation = useMutation({
    mutationFn: async ({ id, sigRank }: { id: string; sigRank: number | null }) => {
      return await apiRequest(`/api/admin/politician-sponsorships/${id}`, "PATCH", { sigRank });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles", managingSigsPolitician?.id, "sponsors"] });
    },
    onError: (error: any) => {
      toast({ title: "Error updating rank", description: error.message, variant: "destructive" });
    },
  });

  const recalculateGradeMutation = useMutation({
    mutationFn: async (politicianId: string) => {
      return await apiRequest(`/api/admin/politician-profiles/${politicianId}/recalculate-grade`, "POST");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      toast({ title: `Grade recalculated: ${data.grade}`, description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "Error recalculating grade", description: error.message, variant: "destructive" });
    },
  });

  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Export CSV dialog
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<"idle" | "running" | "done">("idle");
  const [exportCount, setExportCount] = useState(0);

  // Profile sub-filter (all, representatives, candidates, delegates)
  const [profileSubFilter, setProfileSubFilter] = useState("all");
  const [profileDisplayLimit, setProfileDisplayLimit] = useState(100);

  // Candidate XLSX import
  const [candidateImportOpen, setCandidateImportOpen] = useState(false);
  const [candidateImportRows, setCandidateImportRows] = useState<any[]>([]);
  const [candidateImportPreview, setCandidateImportPreview] = useState<Record<string, number>>({});
  const [importDedupInfo, setImportDedupInfo] = useState<{ newCount: number; updateCount: number; updateNames: string[]; skipCount: number } | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importEta, setImportEta] = useState(0);
  const [importStatusMsg, setImportStatusMsg] = useState("");
  // Elapsed time counters for long-running data tools
  const [refreshElapsed, setRefreshElapsed] = useState(0);
  const [regradeElapsed, setRegradeElapsed] = useState(0);
  const [regradeResult, setRegradeResult] = useState<{ scanned: number; regraded: number; errors: number } | null>(null);
  const candidateFileRef = useRef<HTMLInputElement>(null);

  // Profiles CSV import
  const [profileImportOpen, setProfileImportOpen] = useState(false);
  const [profileImportRows, setProfileImportRows] = useState<any[]>([]);
  const profileFileRef = useRef<HTMLInputElement>(null);

  // Positions CSV import
  const [positionImportOpen, setPositionImportOpen] = useState(false);
  const [positionImportRows, setPositionImportRows] = useState<any[]>([]);
  const positionFileRef = useRef<HTMLInputElement>(null);

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

  const importCandidatesMutation = useMutation({
    mutationFn: async (candidates: any[]) =>
      apiRequest("/api/admin/politicians/import-candidates", "POST", { candidates }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/political-positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setCandidateImportOpen(false);
      setCandidateImportRows([]);
      setCandidateImportPreview({});
      setActiveTab("profiles");
      toast({
        title: "Import complete — see Profiles tab",
        description: `${data.created + data.updated} total — ${data.created} created, ${data.updated} updated, ${data.positions_created} positions added, ${data.photos_fetched ?? 0} photos fetched, ${data.handles_generated ?? 0} handles generated.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  const importProfilesCsvMutation = useMutation({
    mutationFn: async (profiles: any[]) =>
      apiRequest("/api/admin/politicians/import-profiles-csv", "POST", { profiles }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      setProfileImportOpen(false);
      setProfileImportRows([]);
      toast({
        title: "Profiles imported",
        description: `${data.created} created, ${data.updated} updated.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  const importPositionsCsvMutation = useMutation({
    mutationFn: async (positions: any[]) =>
      apiRequest("/api/admin/politicians/import-positions-csv", "POST", { positions }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/political-positions"] });
      setPositionImportOpen(false);
      setPositionImportRows([]);
      toast({
        title: "Positions imported",
        description: `${data.created} created, ${data.updated} updated.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  // Claim requests
  const { data: claimRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/politician-profiles/claim-requests"],
    refetchInterval: 30000,
  });

  const pendingClaims = (claimRequests as any[]).filter((r: any) => r.claimRequestStatus === "pending");

  const approveClaimMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/admin/politician-profiles/${id}/claim-approve`, "PATCH"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles/claim-requests"] });
      toast({ title: "Claim approved", description: "Profile marked as verified." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const rejectClaimMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/admin/politician-profiles/${id}/claim-reject`, "PATCH"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles/claim-requests"] });
      toast({ title: "Claim rejected" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const refreshDataMutation = useMutation({
    mutationFn: async () => apiRequest("/api/admin/politician-profiles/refresh-data", "POST"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      setRefreshElapsed(0);
      toast({
        title: "Refresh complete",
        description: `${data.updated ?? 0} profiles updated, ${data.skipped ?? 0} skipped.`,
      });
    },
    onError: (err: any) => {
      setRefreshElapsed(0);
      toast({ title: "Refresh failed", description: err.message, variant: "destructive" });
    },
  });

  const regradeAllMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("/api/admin/politician-profiles/regrade", "POST");
      return r.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      setRegradeElapsed(0);
      setRegradeResult({ scanned: data.scanned ?? 0, regraded: data.regraded ?? 0, errors: data.errors?.length ?? 0 });
    },
    onError: (err: any) => {
      setRegradeElapsed(0);
      toast({ title: "Regrade failed", description: err.message, variant: "destructive" });
    },
  });

  // Elapsed time counters for long-running mutations
  useEffect(() => {
    if (!refreshDataMutation.isPending) return;
    setRefreshElapsed(0);
    const id = setInterval(() => setRefreshElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [refreshDataMutation.isPending]);

  useEffect(() => {
    if (!regradeAllMutation.isPending) return;
    setRegradeElapsed(0);
    const id = setInterval(() => setRegradeElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [regradeAllMutation.isPending]);

  // Grading settings (PAC ceiling)
  const { data: gradingSettings, refetch: refetchGradingSettings } = useQuery<any>({
    queryKey: ["/api/admin/grading-settings"],
    queryFn: () => fetch("/api/admin/grading-settings", { credentials: "include" }).then(r => r.json()),
  });
  const updateGradingSettingsMutation = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const r = await apiRequest("/api/admin/grading-settings", "POST", patch);
      return r.json();
    },
    onSuccess: () => refetchGradingSettings(),
    onError: (err: any) => toast({ title: "Settings update failed", description: err.message, variant: "destructive" }),
  });

  // Import progress simulation
  useEffect(() => {
    if (!importCandidatesMutation.isPending) {
      setImportProgress(0);
      setImportEta(0);
      setImportStatusMsg("");
      return;
    }
    const totalSecs = Math.min(candidateImportRows.length * 0.5, 120);
    setImportEta(Math.round(totalSecs));
    setImportProgress(0);
    const msgs = [
      "Checking for duplicates…",
      "Fetching photos from Ballotpedia…",
      "Searching Wikipedia for photos…",
      "Generating @handles…",
      "Saving profiles to database…",
    ];
    let msgIdx = 0;
    setImportStatusMsg(msgs[0]);
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % msgs.length;
      setImportStatusMsg(msgs[msgIdx]);
    }, 3000);
    const startTime = Date.now();
    const progInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const pct = Math.min((elapsed / totalSecs) * 95, 95);
      setImportProgress(pct);
      setImportEta(Math.max(0, Math.round(totalSecs - elapsed)));
    }, 500);
    return () => {
      clearInterval(msgInterval);
      clearInterval(progInterval);
    };
  }, [importCandidatesMutation.isPending]);

  // Reset display limit when any filter changes
  useEffect(() => {
    setProfileDisplayLimit(100);
  }, [profileSearch, profileSubFilter, profileStatusFilter, profilePartyFilter, profileGradeFilter, profileStateFilter]);

  // Client-side export of currently filtered profiles
  function exportSelectionCsv() {
    const headers = ["FULL_NAME","PROFILE_TYPE","OFFICE","OFFICE_LEVEL","STATE","DISTRICT","PARTY","INCUMBENT","STATUS","PRIMARY_DATE","GENERAL_DATE","FEC_CANDIDATE_ID","BALLOTPEDIA_URL","WEBSITE","EMAIL","PHONE","BIOGRAPHY","PHOTO_URL","NOTES"];
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.join(",")];
    for (const p of filteredProfiles) {
      const pos = (p as any).position;
      lines.push([
        p.fullName, p.profileType || "candidate",
        pos?.title || "", pos?.level || "", pos?.jurisdiction || "", pos?.district || "",
        p.party || "", p.isCurrent ? "Yes" : "No", "",
        p.termStart || "", p.termEnd || "", p.fecCandidateId || "",
        (p as any).ballotpediaUrl || "", p.website || "", p.email || "",
        p.phone || "", p.biography || "", p.photoUrl || "", p.notes || "",
      ].map(escape).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acp_selection_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export handler
  async function handleExport() {
    setExportStatus("running");
    setExportProgress(0);
    try {
      const data: any[] = await apiRequest("/api/admin/politicians/export-csv", "GET").then(r => r.json());
      setExportCount(data.length);
      const etaMs = Math.max(1500, data.length * 2);
      const start = Date.now();
      const prog = setInterval(() => {
        const pct = Math.min(((Date.now() - start) / etaMs) * 95, 95);
        setExportProgress(pct);
      }, 100);
      // Build CSV matching template headers exactly
      const headers = TEMPLATES.candidates.headers;
      const csvRows = [headers.join(",")];
      for (const row of data) {
        const vals = headers.map(h => {
          const v = String(row[h] ?? "").replace(/"/g, '""');
          return `"${v}"`;
        });
        csvRows.push(vals.join(","));
      }
      clearInterval(prog);
      setExportProgress(100);
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `acp_politicians_export_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus("done");
    } catch (err: any) {
      setExportStatus("idle");
      setExportProgress(0);
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  }

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
      totalContributions: formData.get("totalContributions") ? Number(formData.get("totalContributions")) : undefined,
      fecCandidateId: (formData.get("fecCandidateId") as string) || undefined,
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
  const normalizeParty = (party: string | null | undefined): string => {
    if (!party) return "";
    const p = party.trim();
    if (["I", "Independent", "Unaffiliated"].includes(p)) return "Independent";
    if (p === "Democratic") return "Democrat";
    return p;
  };
  const uniqueParties = [...new Set(
    profiles.map(p => normalizeParty(p.party)).filter(Boolean)
  )].sort();
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
    const matchParty = profilePartyFilter === "all" || normalizeParty(p.party) === profilePartyFilter;
    const matchGrade = profileGradeFilter === "all"
      || (profileGradeFilter === "none" ? !p.corruptionGrade : p.corruptionGrade === profileGradeFilter);
    const matchStatus = profileStatusFilter === "all"
      || (profileStatusFilter === "current" ? (p.isCurrent && p.profileType !== "candidate") : false)
      || (profileStatusFilter === "former" ? (!p.isCurrent && p.profileType !== "candidate") : false)
      || (profileStatusFilter === "running" ? p.profileType === "candidate" : false);
    const matchState = profileStateFilter === "all"
      || (profileStateFilter === "acp-admins" ? p.profileType === "delegate" : false)
      || (position?.level || "").toLowerCase() === profileStateFilter.toLowerCase();
    const matchSubFilter = profileSubFilter === "all"
      || (profileSubFilter === "representatives" ? (p.profileType === "representative" || !p.profileType) : false)
      || (profileSubFilter === "candidates" ? p.profileType === "candidate" : false)
      || (profileSubFilter === "delegates" ? p.profileType === "delegate" : false)
      || (profileSubFilter === "active" ? !!p.isCurrent : false)
      || (profileSubFilter === "former" ? !p.isCurrent : false);
    return matchSearch && matchParty && matchGrade && matchStatus && matchState && matchSubFilter;
  });


  const ROLE_COLORS: Record<string, string> = {
    admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    state_admin: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    moderator: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  const PROFILE_TYPE_COLORS: Record<string, string> = {
    representative: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    candidate: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    delegate: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };
  const DERIVED_TAG_COLORS: Record<string, string> = {
    incumbent: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    inactive: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  };
  function getProfileTags(profile: { profileType?: string | null; isCurrent?: boolean | null }) {
    const primary = profile.profileType || "representative";
    const tags: Array<{ label: string; color: string }> = [
      { label: primary.charAt(0).toUpperCase() + primary.slice(1), color: PROFILE_TYPE_COLORS[primary] || "bg-blue-100 text-blue-800" },
    ];
    if (primary === "candidate" && profile.isCurrent) {
      tags.push({ label: "Incumbent", color: DERIVED_TAG_COLORS.incumbent });
    }
    if (!profile.isCurrent) {
      tags.push({ label: "Inactive", color: DERIVED_TAG_COLORS.inactive });
    }
    return tags;
  }

  function parseFileToRows(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const wb = XLSX.read(data, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  }

  async function handleCandidateFileSelect(file: File) {
    const raw = await parseFileToRows(file);
    const rows = raw.map(r => {
      const rawType = String(r["PROFILE_TYPE"] || r["Profile Type"] || r["profileType"] || "").trim().toLowerCase();
      let profileType = "candidate";
      if (rawType === "representative") profileType = "representative";
      else if (rawType === "delegate") profileType = "delegate";
      return {
        fullName: String(r["FULL_NAME"] || r["Full Name"] || r["fullName"] || "").trim(),
        office: String(r["OFFICE"] || r["Office"] || r["office"] || "").trim(),
        officeLevel: String(r["OFFICE_LEVEL"] || r["Office Level"] || r["officeLevel"] || "State").trim(),
        district: String(r["DISTRICT"] || r["District"] || r["district"] || "").trim(),
        state: String(r["STATE"] || r["State"] || r["state"] || "").trim(),
        party: String(r["PARTY"] || r["Party"] || r["party"] || "").trim(),
        isIncumbent: String(r["INCUMBENT"] || r["Incumbent"] || r["isIncumbent"] || "No").trim(),
        status: String(r["STATUS"] || r["Status"] || r["status"] || "").trim(),
        primaryDate: String(r["PRIMARY_DATE"] || r["Primary Date"] || r["primaryDate"] || "").trim(),
        generalDate: String(r["GENERAL_DATE"] || r["General Date"] || r["generalDate"] || "").trim(),
        ballotpediaUrl: String(r["BALLOTPEDIA_URL"] || r["Ballotpedia URL"] || r["ballotpediaUrl"] || "").trim(),
        fecCandidateId: String(r["FEC_CANDIDATE_ID"] || r["FEC ID"] || r["fecCandidateId"] || "").trim(),
        website: String(r["WEBSITE"] || r["Website"] || r["website"] || "").trim(),
        email: String(r["EMAIL"] || r["Email"] || r["email"] || "").trim(),
        phone: String(r["PHONE"] || r["Phone"] || r["phone"] || "").trim(),
        biography: String(r["BIOGRAPHY"] || r["Biography"] || r["biography"] || "").trim(),
        photoUrl: String(r["PHOTO_URL"] || r["Photo URL"] || r["photoUrl"] || "").trim(),
        notes: String(r["NOTES"] || r["Notes"] || r["notes"] || "").trim(),
        profileType,
      };
    }).filter(r => r.fullName);
    const preview: Record<string, number> = {};
    rows.forEach(r => { preview[r.profileType] = (preview[r.profileType] || 0) + 1; });

    // Dedup analysis against loaded profiles
    const existingNames = new Set(profiles.map((p: any) => p.fullName.toLowerCase()));
    const skipCount = raw.length - rows.length;
    const updateRows = rows.filter(r => existingNames.has(r.fullName.toLowerCase()));
    const newRows = rows.filter(r => !existingNames.has(r.fullName.toLowerCase()));
    setImportDedupInfo({
      newCount: newRows.length,
      updateCount: updateRows.length,
      updateNames: updateRows.slice(0, 10).map(r => r.fullName),
      skipCount,
    });

    setCandidateImportRows(rows);
    setCandidateImportPreview(preview);
  }

  async function handleProfileFileSelect(file: File) {
    const raw = await parseFileToRows(file);
    const rows = raw.map(r => ({
      fullName: String(r["FULL_NAME"] || r["Full Name"] || r["fullName"] || "").trim(),
      party: String(r["PARTY"] || r["Party"] || r["party"] || "").trim(),
      email: String(r["EMAIL"] || r["Email"] || r["email"] || "").trim(),
      phone: String(r["PHONE"] || r["Phone"] || r["phone"] || "").trim(),
      website: String(r["WEBSITE"] || r["Website"] || r["website"] || "").trim(),
      biography: String(r["BIOGRAPHY"] || r["Biography"] || r["biography"] || "").trim(),
      termStart: String(r["TERM_START"] || r["Term Start"] || r["termStart"] || "").trim(),
      termEnd: String(r["TERM_END"] || r["Term End"] || r["termEnd"] || "").trim(),
      isCurrent: String(r["IS_CURRENT"] || r["Is Current"] || r["isCurrent"] || "").trim(),
      officeAddress: String(r["OFFICE_ADDRESS"] || r["Office Address"] || r["officeAddress"] || "").trim(),
    })).filter(r => r.fullName);
    setProfileImportRows(rows);
  }

  async function handlePositionFileSelect(file: File) {
    const raw = await parseFileToRows(file);
    const rows = raw.map(r => ({
      title: String(r["POSITION_TITLE"] || r["Position Title"] || r["title"] || "").trim(),
      officeType: String(r["OFFICE_TYPE"] || r["Office Type"] || r["officeType"] || "Legislative").trim(),
      level: String(r["LEVEL"] || r["Level"] || r["level"] || "state").trim(),
      jurisdiction: String(r["JURISDICTION"] || r["Jurisdiction"] || r["jurisdiction"] || "").trim(),
      district: String(r["DISTRICT"] || r["District"] || r["district"] || "").trim(),
      termLength: String(r["TERM_LENGTH"] || r["Term Length"] || r["termLength"] || "").trim(),
      isElected: String(r["IS_ELECTED"] || r["Is Elected"] || r["isElected"] || "Yes").trim(),
      isActive: String(r["IS_ACTIVE"] || r["Is Active"] || r["isActive"] || "Yes").trim(),
    })).filter(r => r.title);
    setPositionImportRows(rows);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      
      <div className="w-full px-4 sm:px-6 lg:px-10 py-8">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Politicians Management</h1>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingProfile(null);
                setUploadedPhotoUrl(undefined);
                setProfileDialogOpen(true);
              }}
              data-testid="button-create-profile"
              className="flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Profile
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadCsv(TEMPLATES.candidates.filename, TEMPLATES.candidates.headers, TEMPLATES.candidates.sample)}
              className="flex items-center gap-1.5"
              title="Download blank CSV template for candidate/politician import"
            >
              <FileDown className="w-3.5 h-3.5" />
              Template
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setExportStatus("idle"); setExportProgress(0); setExportDialogOpen(true); }}
              className="flex items-center gap-1.5"
              title="Export all politicians and candidates as a CSV backup"
            >
              <Download className="w-3.5 h-3.5" />
              Export All
            </Button>
            <Button
              size="sm"
              onClick={() => setCandidateImportOpen(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="w-3.5 h-3.5" />
              Import XLSX/CSV
            </Button>
          </div>
        </div>

        {/* Congress Import Confirmation Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Congress (TrackAIPAC Dataset)</DialogTitle>
              <DialogDescription>
                Bulk-imports all 535 current Congress members from the hardcoded TrackAIPAC AIPAC funding dataset, including:
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

        {/* ── Export CSV Dialog ── */}
        <Dialog open={exportDialogOpen} onOpenChange={(open) => {
          if (!open && exportStatus !== "running") { setExportDialogOpen(false); setExportStatus("idle"); setExportProgress(0); }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Export Politicians & Candidates</DialogTitle>
              <DialogDescription>
                Downloads all profiles as a CSV with the exact same columns as the import template — perfect for backup and re-import.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {exportStatus === "idle" && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-sm text-slate-600 dark:text-slate-400">
                  <p><strong>{profiles.length}</strong> profiles will be exported.</p>
                  <p className="mt-1 text-xs">The file can be re-imported with no duplicate creates — all rows will update existing records.</p>
                </div>
              )}
              {exportStatus === "running" && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Exporting {profiles.length} profiles…</span>
                    <span>{Math.round(exportProgress)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 text-center">Building CSV…</p>
                </div>
              )}
              {exportStatus === "done" && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>{exportCount}</strong> profiles exported successfully. Check your downloads.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setExportDialogOpen(false); setExportStatus("idle"); setExportProgress(0); }}
                disabled={exportStatus === "running"}
              >
                {exportStatus === "done" ? "Close" : "Cancel"}
              </Button>
              {exportStatus !== "done" && (
                <Button
                  onClick={handleExport}
                  disabled={exportStatus === "running"}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {exportStatus === "running" ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting…</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" />Start Export</>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Universal Profile Import Dialog ── */}
        <Dialog open={candidateImportOpen} onOpenChange={(open) => {
          setCandidateImportOpen(open);
          if (!open) { setCandidateImportRows([]); setCandidateImportPreview({}); }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Import Profiles (Universal)</DialogTitle>
              <DialogDescription>
                Upload an XLSX or CSV file with any combination of Representatives, Candidates, or Delegates. The PROFILE_TYPE column determines how each row is categorized. Photos and @handles are automatically fetched/generated during import. Providing FEC_CANDIDATE_ID and BALLOTPEDIA_URL up-front enables future automated data scraping.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm font-medium">Select file (.xlsx or .csv)</Label>
                <input
                  ref={candidateFileRef}
                  type="file"
                  accept=".xlsx,.csv"
                  className="mt-1 block w-full text-sm text-slate-600 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleCandidateFileSelect(file);
                  }}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Required: FULL_NAME, OFFICE, OFFICE_LEVEL, STATE, PARTY, <strong>PROFILE_TYPE</strong> (representative / candidate / delegate)<br/>
                  Optional: DISTRICT, INCUMBENT (Yes/No), STATUS, PRIMARY_DATE, GENERAL_DATE, FEC_CANDIDATE_ID, BALLOTPEDIA_URL, WEBSITE, EMAIL, PHONE, BIOGRAPHY, PHOTO_URL, NOTES
                </p>
              </div>

              {/* Dedup preview — shown before import starts */}
              {candidateImportRows.length > 0 && !importCandidatesMutation.isPending && importDedupInfo && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 space-y-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Ready to import {candidateImportRows.length} rows
                  </p>
                  <div className="space-y-1">
                    {importDedupInfo.newCount > 0 && (
                      <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                        ✦ {importDedupInfo.newCount} new profiles will be created
                      </p>
                    )}
                    {importDedupInfo.updateCount > 0 && (
                      <div>
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                          ↻ {importDedupInfo.updateCount} existing profiles will be updated
                        </p>
                        <ul className="ml-3 mt-0.5 space-y-0.5">
                          {importDedupInfo.updateNames.map(n => (
                            <li key={n} className="text-xs text-amber-600 dark:text-amber-500">• {n}</li>
                          ))}
                          {importDedupInfo.updateCount > 10 && (
                            <li className="text-xs text-amber-500 dark:text-amber-600">+ {importDedupInfo.updateCount - 10} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                    {importDedupInfo.skipCount > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        ✕ {importDedupInfo.skipCount} rows skipped (missing FULL_NAME)
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(candidateImportPreview).map(([type, count]) => (
                      <span key={type} className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded px-1.5 py-0.5">
                        {type}: {count as number}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress bar — shown while import is running */}
              {importCandidatesMutation.isPending && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-3 space-y-2">
                  <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300 mb-1">
                    <span className="font-medium">{importStatusMsg}</span>
                    <span>~{importEta}s remaining</span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
                    Importing {candidateImportRows.length} profiles — please don't close this window
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCandidateImportOpen(false); setCandidateImportRows([]); setImportDedupInfo(null); }} disabled={importCandidatesMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => importCandidatesMutation.mutate(candidateImportRows)}
                disabled={candidateImportRows.length === 0 || importCandidatesMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {importCandidatesMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" />Import {candidateImportRows.length > 0 ? `${candidateImportRows.length} Profiles` : "Profiles"}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Profiles CSV Import Dialog ── */}
        <Dialog open={profileImportOpen} onOpenChange={(open) => {
          setProfileImportOpen(open);
          if (!open) setProfileImportRows([]);
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Import Politician Profiles</DialogTitle>
              <DialogDescription>
                Upload an XLSX or CSV file with politician profile data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm font-medium">Select file (.xlsx or .csv)</Label>
                <input
                  ref={profileFileRef}
                  type="file"
                  accept=".xlsx,.csv"
                  className="mt-1 block w-full text-sm text-slate-600 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleProfileFileSelect(file);
                  }}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Template columns: FULL_NAME, PARTY, EMAIL, PHONE, WEBSITE, BIOGRAPHY, TERM_START, TERM_END, IS_CURRENT (Yes/No), OFFICE_ADDRESS
                </p>
              </div>
              {profileImportRows.length > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Found {profileImportRows.length} profiles ready to import
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProfileImportOpen(false)} disabled={importProfilesCsvMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => importProfilesCsvMutation.mutate(profileImportRows)}
                disabled={profileImportRows.length === 0 || importProfilesCsvMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {importProfilesCsvMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" />Import {profileImportRows.length > 0 ? `${profileImportRows.length} Profiles` : "Profiles"}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Positions CSV Import Dialog ── */}
        <Dialog open={positionImportOpen} onOpenChange={(open) => {
          setPositionImportOpen(open);
          if (!open) setPositionImportRows([]);
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Import Political Positions</DialogTitle>
              <DialogDescription>
                Upload an XLSX or CSV file with political position data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm font-medium">Select file (.xlsx or .csv)</Label>
                <input
                  ref={positionFileRef}
                  type="file"
                  accept=".xlsx,.csv"
                  className="mt-1 block w-full text-sm text-slate-600 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handlePositionFileSelect(file);
                  }}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Template columns: POSITION_TITLE, OFFICE_TYPE, LEVEL, JURISDICTION, DISTRICT, TERM_LENGTH, IS_ELECTED (Yes/No), IS_ACTIVE (Yes/No)
                </p>
              </div>
              {positionImportRows.length > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Found {positionImportRows.length} positions ready to import
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPositionImportOpen(false)} disabled={importPositionsCsvMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => importPositionsCsvMutation.mutate(positionImportRows)}
                disabled={positionImportRows.length === 0 || importPositionsCsvMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {importPositionsCsvMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" />Import {positionImportRows.length > 0 ? `${positionImportRows.length} Positions` : "Positions"}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-5 px-1 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
          {[
            { label: "Total Positions", value: positions.length, icon: Building2, color: "text-blue-600 dark:text-blue-400" },
            { label: "Active Positions", value: activePositions.length, icon: MapPin, color: "text-green-600 dark:text-green-400" },
            { label: "Total Profiles", value: profiles.length, icon: Users, color: "text-purple-600 dark:text-purple-400" },
            { label: "Current Reps", value: currentProfiles.length, icon: UserPlus, color: "text-amber-600 dark:text-amber-400" },
          ].map(({ label, value, icon: Icon, color }, i, arr) => (
            <div key={label} className={`flex items-center gap-2 px-4 py-1.5 ${i < arr.length - 1 ? "border-r border-slate-200 dark:border-slate-700" : ""}`}>
              <Icon className={`h-4 w-4 ${color}`} />
              <span className={`text-lg font-bold ${color}`}>{value}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
            </div>
          ))}
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="positions" data-testid="tab-positions">Positions</TabsTrigger>
                <TabsTrigger value="profiles" data-testid="tab-profiles">Profiles</TabsTrigger>
                <TabsTrigger value="claim-requests" data-testid="tab-claim-requests" className="relative">
                  Claim Requests
                  {pendingClaims.length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-red-500 text-white">
                      {pendingClaims.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── POSITIONS TAB ── */}
              <TabsContent value="positions" className="space-y-4">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg">
                    Political positions are permanent entities (e.g., "President of the United States", "Senator from California")
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPositionImportOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Import from File
                    </Button>
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
                {/* ── External Data Tools ── */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">External Data Sources</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">

                    {/* TrackAIPAC */}
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Scan TrackAIPAC</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Sync AIPAC donation data for all 535 Congress members</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setImportDialogOpen(true)}
                        disabled={importCongressMutation.isPending}
                        className="mt-auto w-full text-xs"
                      >
                        {importCongressMutation.isPending ? (
                          <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Syncing…</>
                        ) : (
                          <><Download className="h-3 w-3 mr-1.5" />Run Scan</>
                        )}
                      </Button>
                    </div>

                    {/* Refresh from Web */}
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <RefreshCw className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Refresh from Web</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Fill missing photos, bios, and websites from Ballotpedia & Wikipedia</p>
                        </div>
                      </div>
                      {refreshDataMutation.isPending ? (
                        <div className="space-y-1.5 mt-auto">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-500 h-1.5 rounded-full animate-pulse" style={{ width: "100%" }} />
                          </div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 text-center">Running… {refreshElapsed}s</p>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refreshDataMutation.mutate()}
                          className="mt-auto w-full text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1.5" />Run Refresh
                        </Button>
                      )}
                    </div>

                    {/* Regrade Profiles */}
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <Calculator className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Regrade All Profiles</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Recalculate corruption grades using current weighting formula</p>
                        </div>
                      </div>
                      {regradeAllMutation.isPending ? (
                        <div className="space-y-1.5 mt-auto">
                          {(() => {
                            const ESTIMATED_SECONDS = 65;
                            const pct = Math.min(Math.round((regradeElapsed / ESTIMATED_SECONDS) * 100), 95);
                            return (
                              <>
                                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                  <span>Regrading…</span>
                                  <span>{pct}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-purple-500 h-2 rounded-full transition-all duration-1000"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <p className="text-xs text-purple-600 dark:text-purple-400 text-center">{regradeElapsed}s elapsed</p>
                              </>
                            );
                          })()}
                        </div>
                      ) : regradeResult ? (
                        <div className="space-y-1.5 mt-auto">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className="bg-green-500 h-2 rounded-full w-full" />
                          </div>
                          <div className="text-center space-y-0.5">
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                              ✓ {regradeResult.regraded.toLocaleString()} profiles regraded
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {regradeResult.scanned.toLocaleString()} scanned
                              {regradeResult.errors > 0 ? ` · ${regradeResult.errors} errors` : " · 0 errors"}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setRegradeResult(null); regradeAllMutation.mutate(); }}
                            className="w-full text-xs"
                          >
                            <Calculator className="h-3 w-3 mr-1.5" />Run Again
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setRegradeResult(null); regradeAllMutation.mutate(); }}
                          className="mt-auto w-full text-xs"
                        >
                          <Calculator className="h-3 w-3 mr-1.5" />Run Regrade
                        </Button>
                      )}
                    </div>

                    {/* PAC Grade Ceiling Settings */}
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <Shield className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">PAC Grade Ceiling</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Cap grades based on total SIG/PAC dollars received</p>
                          </div>
                        </div>
                        <button
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${gradingSettings?.enablePacCeiling ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                          onClick={() => updateGradingSettingsMutation.mutate({ enablePacCeiling: !gradingSettings?.enablePacCeiling })}
                          title={gradingSettings?.enablePacCeiling ? "Ceiling enabled — click to disable" : "Ceiling disabled — click to enable"}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${gradingSettings?.enablePacCeiling ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      {gradingSettings?.enablePacCeiling && (
                        <div className="space-y-1.5 mt-1">
                          {[
                            { label: "Any $ → cap B", field: "pacCeilingBThreshold", value: gradingSettings?.pacCeilingBThreshold ?? 0 },
                            { label: "Cap C above ($)", field: "pacCeilingCThreshold", value: gradingSettings?.pacCeilingCThreshold ?? 100000 },
                            { label: "Cap D above ($)", field: "pacCeilingDThreshold", value: gradingSettings?.pacCeilingDThreshold ?? 1000000 },
                            { label: "Force F above ($)", field: "pacCeilingFThreshold", value: gradingSettings?.pacCeilingFThreshold ?? 10000000 },
                          ].map(({ label, field, value }) => (
                            <div key={field} className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 dark:text-slate-400 w-28 shrink-0">{label}</span>
                              <input
                                type="number"
                                defaultValue={value}
                                className="flex-1 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-300 min-w-0"
                                onBlur={e => {
                                  const v = parseFloat(e.target.value);
                                  if (!isNaN(v)) updateGradingSettingsMutation.mutate({ [field]: v });
                                }}
                              />
                            </div>
                          ))}
                          <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">Run Regrade to apply changes.</p>
                        </div>
                      )}
                    </div>

                    {/* AI State Scan */}
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <BotIcon className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">AI State Scan</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Find missing data, vacant seats & candidates by state using AI</p>
                        </div>
                      </div>

                      {/* State selector row */}
                      <div className="flex gap-1.5 items-center">
                        <select
                          value={scanState}
                          onChange={e => { setScanState(e.target.value); setScanPreview(null); setScanStatus("idle"); setScanResult(null); }}
                          className="flex-1 text-xs rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-700 dark:text-slate-300"
                        >
                          <option value="">Select state…</option>
                          {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!scanState || scanStatus === "previewing" || scanStatus === "running"}
                          className="text-xs px-2.5 shrink-0"
                          onClick={async () => {
                            setScanStatus("previewing");
                            setScanPreview(null);
                            setScanResult(null);
                            try {
                              const data = await apiRequest("/api/admin/politicians/state-scan/preview", "POST", { state: scanState }).then(r => r.json());
                              setScanPreview(data);
                              setScanStatus("ready");
                            } catch (err: any) {
                              toast({ title: "Preview failed", description: err.message, variant: "destructive" });
                              setScanStatus("idle");
                            }
                          }}
                        >
                          {scanStatus === "previewing" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                        </Button>
                      </div>

                      {/* Preview results */}
                      {scanStatus === "ready" && scanPreview && (
                        <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-2 space-y-1 text-xs">
                          <p className="font-semibold text-emerald-700 dark:text-emerald-400">{scanPreview.stateName} scan ready</p>
                          <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{scanPreview.profilesWithMissingData}</span> profiles with missing data
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{scanPreview.positionsWithoutIncumbents}</span> seats without incumbents
                          </p>
                          {scanPreview.estimatedSeconds > 0 && (
                            <p className="text-slate-500 dark:text-slate-500">
                              Est. ~{scanPreview.estimatedSeconds < 60
                                ? `${scanPreview.estimatedSeconds}s`
                                : `${Math.ceil(scanPreview.estimatedSeconds / 60)}m`}
                            </p>
                          )}
                          {scanPreview.totalItems === 0 && (
                            <p className="text-emerald-600 dark:text-emerald-400 font-medium">All data looks complete!</p>
                          )}
                        </div>
                      )}

                      {/* Running progress */}
                      {scanStatus === "running" && (
                        <div className="space-y-1.5">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-1.5 rounded-full animate-pulse" style={{ width: "100%" }} />
                          </div>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center">Scanning… {scanElapsed}s</p>
                        </div>
                      )}

                      {/* Done result */}
                      {scanStatus === "done" && scanResult && (
                        <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-2 space-y-0.5 text-xs">
                          <p className="font-semibold text-blue-700 dark:text-blue-400">Scan complete</p>
                          <p className="text-slate-600 dark:text-slate-400">{scanResult.updatedProfiles} profiles updated</p>
                          <p className="text-slate-600 dark:text-slate-400">{scanResult.createdProfiles} profiles created</p>
                          {scanResult.errors.length > 0 && (
                            <div>
                              <p className="text-orange-600 dark:text-orange-400">{scanResult.errors.length} batch error(s)</p>
                              <p className="text-orange-500 dark:text-orange-400 break-all">{scanResult.errors[0]}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Run / Reset button */}
                      <div className="mt-auto">
                        {scanStatus === "done" ? (
                          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setScanStatus("idle"); setScanPreview(null); setScanResult(null); }}>
                            <RefreshCw className="h-3 w-3 mr-1.5" />New Scan
                          </Button>
                        ) : (
                          <Button
                            variant={scanStatus === "ready" && scanPreview && scanPreview.totalItems > 0 ? "default" : "outline"}
                            size="sm"
                            disabled={scanStatus !== "ready" || !scanPreview || scanPreview.totalItems === 0}
                            className="w-full text-xs"
                            onClick={async () => {
                              setScanStatus("running");
                              setScanElapsed(0);
                              const timer = setInterval(() => setScanElapsed(s => s + 1), 1000);
                              try {
                                const data = await apiRequest("/api/admin/politicians/state-scan/run", "POST", { state: scanState }).then(r => r.json());
                                clearInterval(timer);
                                setScanResult(data);
                                setScanStatus("done");
                                queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/admin/political-positions"] });
                              } catch (err: any) {
                                clearInterval(timer);
                                toast({ title: "Scan failed", description: err.message, variant: "destructive" });
                                setScanStatus("ready");
                              }
                            }}
                          >
                            {scanStatus === "running" ? (
                              <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Running…</>
                            ) : (
                              <><BotIcon className="h-3 w-3 mr-1.5" />
                                {scanPreview && scanPreview.totalItems > 0
                                  ? `Run Scan (${scanPreview.totalItems} items)`
                                  : "Run Scan"}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Scan SuperPACs */}
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <DollarSign className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Scan SuperPACs</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Pull all independent expenditures from FEC for every candidate with a FEC ID</p>
                        </div>
                      </div>

                      {superPacStatus === "running" && (
                        <div className="space-y-1.5">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-orange-500 h-1.5 rounded-full animate-pulse" style={{ width: "100%" }} />
                          </div>
                          <p className="text-xs text-orange-600 dark:text-orange-400 text-center">Scanning FEC… {superPacElapsed}s</p>
                        </div>
                      )}

                      {superPacStatus === "done" && superPacResult && (
                        <div className="rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-2 space-y-0.5 text-xs">
                          <p className="font-semibold text-orange-700 dark:text-orange-400">Scan complete</p>
                          <p className="text-slate-600 dark:text-slate-400">{superPacResult.candidatesScanned} candidates scanned</p>
                          <p className="text-slate-600 dark:text-slate-400">{superPacResult.newSigs} new SuperPACs found</p>
                          <p className="text-slate-600 dark:text-slate-400">{superPacResult.updatedSigs} existing SIGs updated</p>
                          {superPacResult.errors.length > 0 && <p className="text-red-500">{superPacResult.errors.length} error(s)</p>}
                        </div>
                      )}

                      <div className="mt-auto">
                        {superPacStatus === "done" ? (
                          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setSuperPacStatus("idle"); setSuperPacResult(null); }}>
                            <RefreshCw className="h-3 w-3 mr-1.5" />Scan Again
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={superPacStatus === "running"}
                            className="w-full text-xs"
                            onClick={async () => {
                              setSuperPacStatus("running");
                              setSuperPacElapsed(0);
                              const timer = setInterval(() => setSuperPacElapsed(s => s + 1), 1000);
                              try {
                                const data = await apiRequest("/api/admin/politicians/scan-superpacs", "POST", {}).then(r => r.json());
                                clearInterval(timer);
                                setSuperPacResult(data);
                                setSuperPacStatus("done");
                                toast({
                                  title: "✅ SuperPAC scan complete",
                                  description: `${data.candidatesScanned} candidates scanned · ${data.newSigs} new SuperPACs · ${data.updatedSigs} SIGs updated`,
                                });
                                queryClient.invalidateQueries({ queryKey: ["/api/admin/sigs"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
                              } catch (err: any) {
                                clearInterval(timer);
                                setSuperPacStatus("idle");
                                toast({ title: "Scan failed", description: err.message, variant: "destructive" });
                              }
                            }}
                          >
                            {superPacStatus === "running" ? (
                              <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Scanning…</>
                            ) : (
                              <><Search className="h-3 w-3 mr-1.5" />Scan SuperPACs 🔍</>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Sub-filter pills */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "all", label: "All" },
                    { key: "representatives", label: "Representatives" },
                    { key: "candidates", label: "Candidates" },
                    { key: "delegates", label: "Delegates" },
                    { key: "active", label: "Active" },
                    { key: "former", label: "Inactive" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setProfileSubFilter(key)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        profileSubFilter === key
                          ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                      }`}
                    >
                      {label}
                      <span className="ml-1.5 text-xs opacity-70">
                        {key === "all" && profiles.length}
                        {key === "representatives" && profiles.filter(p => p.profileType === "representative" || !p.profileType).length}
                        {key === "candidates" && profiles.filter(p => p.profileType === "candidate").length}
                        {key === "delegates" && profiles.filter(p => p.profileType === "delegate").length}
                        {key === "active" && profiles.filter(p => p.isCurrent).length}
                        {key === "former" && profiles.filter(p => !p.isCurrent).length}
                      </span>
                    </button>
                  ))}
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
                      <SelectItem value="running">Running</SelectItem>
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
                      <SelectItem value="federal">Federal</SelectItem>
                      <SelectItem value="state">State</SelectItem>
                      <SelectItem value="county">County</SelectItem>
                      <SelectItem value="city">City</SelectItem>
                      <SelectItem value="acp-admins">ACP-Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportSelectionCsv}
                    className="flex items-center gap-1.5 text-xs shrink-0"
                    title={`Export ${filteredProfiles.length} filtered profiles as CSV`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Selection ({filteredProfiles.length})
                  </Button>
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
                          <TableHead>Type</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Grand Total</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProfiles.slice(0, profileDisplayLimit).map((profile) => {
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
                                <a
                                  href={`/politicians/${profile.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block hover:opacity-80 transition-opacity"
                                  title={`Open ${profile.fullName}'s profile`}
                                >
                                  {profile.photoUrl ? (
                                    <img
                                      src={profile.photoUrl}
                                      alt={profile.fullName}
                                      className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent hover:ring-blue-400 transition-all"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:ring-2 hover:ring-blue-400 transition-all">
                                      <Users className="h-5 w-5 text-slate-400" />
                                    </div>
                                  )}
                                </a>
                              </TableCell>
                              <TableCell className="font-medium">
                                {profile.fullName}
                                {profile.handle && (
                                  <div className="text-xs text-slate-400">@{profile.handle}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {getProfileTags(profile).map(tag => (
                                    <span key={tag.label} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tag.color}`}>
                                      {tag.label}
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{profile.party || "-"}</TableCell>
                              <TableCell className="text-sm">
                                {position ? position.title : <span className="text-slate-400">Not assigned</span>}
                              </TableCell>
                              <TableCell className="text-sm text-slate-500">
                                {position?.jurisdiction || "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {(() => {
                                  const bp = Number(profile.totalContributions ?? 0);
                                  const sig = Math.round(Number(profile.totalLobbyAmount ?? 0) / 100);
                                  const total = bp + sig;
                                  if (total === 0) return <span className="text-slate-400">-</span>;
                                  return (
                                    <span className="text-red-600 dark:text-red-400 font-medium" title={bp > 0 && sig > 0 ? `BallotPedia: $${bp.toLocaleString()} + SuperPACs/SIGs: $${sig.toLocaleString()}` : undefined}>
                                      ${total.toLocaleString()}
                                    </span>
                                  );
                                })()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
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
                                {profile.numericScore != null && (
                                  <span className="text-xs text-slate-400">({Math.round(profile.numericScore)})</span>
                                )}
                                </div>
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
                                    title="Manage SIG Sponsorships & Grade"
                                    onClick={() => {
                                      setManagingSigsPolitician(profile);
                                      setSelectedPoliticianForSponsor(profile);
                                      setManageSigsOpen(true);
                                    }}
                                    data-testid={`button-manage-sigs-${profile.id}`}
                                  >
                                    <Shield className="h-4 w-4 text-blue-500" />
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
                {filteredProfiles.length > profileDisplayLimit && (
                  <div className="flex flex-col items-center gap-1 pt-2 pb-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileDisplayLimit(l => l + 100)}
                      className="flex items-center gap-2"
                    >
                      Load More ({filteredProfiles.length - profileDisplayLimit} remaining)
                    </Button>
                    <span className="text-xs text-slate-400">Showing {Math.min(profileDisplayLimit, filteredProfiles.length)} of {filteredProfiles.length}</span>
                  </div>
                )}
              </TabsContent>

              {/* ── CLAIM REQUESTS TAB ── */}
              <TabsContent value="claim-requests" className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Manual claim requests submitted by politicians who don't have a public email on file. Verify their identity before approving.
                </p>
                {pendingClaims.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Inbox className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm">No pending claim requests</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Politician</TableHead>
                        <TableHead>Submitted Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingClaims.map((claim: any) => (
                        <TableRow key={claim.id}>
                          <TableCell className="font-medium">{claim.fullName}</TableCell>
                          <TableCell>{claim.claimRequestEmail || "—"}</TableCell>
                          <TableCell>{claim.claimRequestPhone || "—"}</TableCell>
                          <TableCell>{claim.claimRequestDate ? new Date(claim.claimRequestDate).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                onClick={() => approveClaimMutation.mutate(claim.id)}
                                disabled={approveClaimMutation.isPending}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1"
                                onClick={() => rejectClaimMutation.mutate(claim.id)}
                                disabled={rejectClaimMutation.isPending}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                <Label htmlFor="totalContributions">Grand Total Contributions (optional)</Label>
                <Input
                  id="totalContributions"
                  name="totalContributions"
                  type="number"
                  defaultValue={editingProfile?.totalContributions != null ? Number(editingProfile.totalContributions) : undefined}
                  placeholder="e.g. 152782583 (whole dollars, from BallotPedia)"
                />
                <p className="text-xs text-slate-400">Career total raised in dollars. Leave blank to auto-populate from Refresh Data.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="fecCandidateId">FEC Candidate ID (optional)</Label>
                <Input
                  id="fecCandidateId"
                  name="fecCandidateId"
                  defaultValue={editingProfile?.fecCandidateId ?? ""}
                  placeholder="e.g. H8MN06059"
                />
                <p className="text-xs text-slate-400">FEC.gov candidate ID for financial data. Auto-looked up during Refresh Data if blank.</p>
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

      <Dialog open={manageSigsOpen} onOpenChange={setManageSigsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              SIG Sponsorships — {managingSigsPolitician?.fullName}
            </DialogTitle>
            <DialogDescription>
              Manage interest groups, set impact rank, and recalculate the corruption grade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">
                Rank 1 = highest impact. ACE groups reduce the score.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setManageSigsOpen(false);
                    setSponsorDialogOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Link SIG
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={recalculateGradeMutation.isPending || !managingSigsPolitician}
                  onClick={() => managingSigsPolitician && recalculateGradeMutation.mutate(managingSigsPolitician.id)}
                >
                  {recalculateGradeMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Calculator className="h-3.5 w-3.5 mr-1" />
                  )}
                  Recalculate Grade
                </Button>
              </div>
            </div>

            {managedSponsorsLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...
              </div>
            ) : managedSponsors.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No SIGs linked yet. Click "Link SIG" to add one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-[100px]">Amount</TableHead>
                    <TableHead className="w-[90px] text-center">Rank</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managedSponsors
                    .slice()
                    .sort((a, b) => {
                      if (a.sigRank == null && b.sigRank == null) return 0;
                      if (a.sigRank == null) return 1;
                      if (b.sigRank == null) return -1;
                      return a.sigRank - b.sigRank;
                    })
                    .map((sp) => (
                    <TableRow key={sp.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {sp.sig?.isAce && (
                            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                          )}
                          <div>
                            <div className="font-medium text-sm">{sp.sig?.name ?? sp.sigId}</div>
                            {sp.sig?.acronym && (
                              <div className="text-xs text-slate-500">({sp.sig.acronym})</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Badge variant={sp.sig?.isAce ? "default" : "outline"} className={sp.sig?.isAce ? "bg-emerald-600 text-white text-xs w-fit" : "text-xs w-fit"}>
                            {sp.sig?.isAce ? "ACE" : sp.relationshipType.replace("_", " ")}
                          </Badge>
                          {sp.sig?.gradeWeight !== undefined && sp.sig.gradeWeight !== 1 && (
                            <span className="text-xs text-slate-400">×{sp.sig.gradeWeight} weight</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {sp.reportedAmount ? `$${sp.reportedAmount.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={updateSponsorRankMutation.isPending}
                            onClick={() => {
                              const newRank = sp.sigRank ? sp.sigRank - 1 : null;
                              updateSponsorRankMutation.mutate({ id: sp.id, sigRank: newRank && newRank > 0 ? newRank : null });
                            }}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <span className="text-xs w-5 text-center font-mono">{sp.sigRank ?? "—"}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={updateSponsorRankMutation.isPending}
                            onClick={() => {
                              const newRank = (sp.sigRank ?? 0) + 1;
                              updateSponsorRankMutation.mutate({ id: sp.id, sigRank: newRank });
                            }}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            if (managingSigsPolitician) {
                              unlinkSponsorMutation.mutate({ politicianId: managingSigsPolitician.id, sigId: sp.sigId });
                            }
                          }}
                        >
                          <Unlink className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageSigsOpen(false)}>Close</Button>
          </DialogFooter>
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
