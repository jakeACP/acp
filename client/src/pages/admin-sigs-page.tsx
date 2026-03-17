import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, Plus, Edit, Trash2, Search, ExternalLink, Database, Loader2, FileDown, FileUp, ShieldCheck, TrendingDown, TrendingUp, RefreshCw, Sparkles } from "lucide-react";
import { downloadCsv, TEMPLATES } from "@/lib/download-template";

function autoGrade(score: number): string {
  if (score >= 40) return "A+";
  if (score >= 25) return "A";
  if (score >= 10) return "B";
  if (score >= 1) return "B-";
  if (score === 0) return "C";
  if (score >= -9) return "D+";
  if (score >= -24) return "D";
  if (score >= -39) return "F+";
  return "F";
}

function gradeColor(grade?: string | null) {
  if (!grade) return "";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "text-green-600 dark:text-green-400 font-black";
  if (g.startsWith("B")) return "text-blue-600 dark:text-blue-400 font-black";
  if (g.startsWith("C")) return "text-yellow-600 dark:text-yellow-400 font-black";
  if (g.startsWith("D")) return "text-orange-600 dark:text-orange-400 font-black";
  return "text-red-600 dark:text-red-400 font-black";
}

type SpecialInterestGroup = {
  id: string;
  name: string;
  acronym?: string;
  description?: string;
  category: string;
  website?: string;
  logoUrl?: string;
  contactEmail?: string;
  headquarters?: string;
  foundedYear?: number;
  industry?: string;
  disclosureNotes?: string;
  gradeWeight?: number;
  influenceScore?: number | null;
  letterGrade?: string | null;
  isAce?: boolean;
  isActive: boolean;
  totalContributions?: number | null;
  fecId?: string | null;
  contactPhone?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const CATEGORIES = [
  { value: "pac_superpac", label: "PAC/SuperPAC (-)", sentiment: "negative" },
  { value: "lobby_firm", label: "Lobby Firm (-)", sentiment: "negative" },
  { value: "corporate_donation", label: "Corporate Donation (-)", sentiment: "negative" },
  { value: "foreign_influence", label: "Foreign Influence (-)", sentiment: "negative" },
  { value: "book_deal", label: "Book Deal (-)", sentiment: "negative" },
  { value: "paid_speeches", label: "Paid Speeches (-)", sentiment: "negative" },
  { value: "stock_gains", label: "Stock Gains (-)", sentiment: "negative" },
  { value: "crypto_gains", label: "Crypto Gains (-)", sentiment: "negative" },
  { value: "board_membership", label: "Board Membership (-)", sentiment: "negative" },
  { value: "dark_money", label: "Dark Money (-)", sentiment: "negative" },
  { value: "acd_demerit", label: "ACD (Demerit) (-)", sentiment: "negative" },
  { value: "nonprofit", label: "Non Profit", sentiment: "neutral" },
  { value: "labor_union", label: "Labor Union", sentiment: "neutral" },
  { value: "fundraising_event", label: "Fundraising Event", sentiment: "neutral" },
  { value: "bank_loan", label: "Bank Loan", sentiment: "neutral" },
  { value: "ace_endorsement", label: "ACE (Endorsement) (+)", sentiment: "positive" },
  { value: "grassroots_pac", label: "Grassroots PAC (+)", sentiment: "positive" },
  { value: "public_funding", label: "Public Funding (+)", sentiment: "positive" },
];

const INDUSTRIES = [
  { value: "agriculture", label: "Agriculture" },
  { value: "defense", label: "Defense & Military" },
  { value: "energy", label: "Energy & Oil" },
  { value: "entertainment", label: "Entertainment & Media" },
  { value: "finance", label: "Finance & Banking" },
  { value: "foreign", label: "Foreign Entity" },
  { value: "healthcare", label: "Healthcare & Pharma" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "political_party", label: "Political Party" },
  { value: "real_estate", label: "Real Estate" },
  { value: "retail", label: "Retail" },
  { value: "small_business", label: "Small Business" },
  { value: "tech", label: "Technology" },
  { value: "telecom", label: "Telecommunications" },
  { value: "transportation", label: "Transportation" },
  { value: "other", label: "Other/NA" },
];

export default function AdminSigsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSig, setEditingSig] = useState<SpecialInterestGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [influenceSlider, setInfluenceSlider] = useState<number>(0);
  const [gradeOverride, setGradeOverride] = useState<string>("auto");
  const [fetchingFecId, setFetchingFecId] = useState<string | null>(null);
  const [findMissingResult, setFindMissingResult] = useState<{ found: number; skipped: number; total: number } | null>(null);
  const [updateFecResult, setUpdateFecResult] = useState<{ updated: number; skipped: number; total: number } | null>(null);
  const [aiGradeResult, setAiGradeResult] = useState<{ graded: number; errors: number; total: number } | null>(null);
  const [fixCNumbersResult, setFixCNumbersResult] = useState<{ fixed: number; message: string } | null>(null);
  const [csvUploadResult, setCsvUploadResult] = useState<{ created: number; updated: number; errors: number; message: string } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const { data: sigs = [], isLoading } = useQuery<SpecialInterestGroup[]>({
    queryKey: ["/api/admin/sigs", { search: searchQuery, category: categoryFilter, industry: industryFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (categoryFilter && categoryFilter !== "all") params.append("category", categoryFilter);
      if (industryFilter && industryFilter !== "all") params.append("industry", industryFilter);
      const url = `/api/admin/sigs${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch SIGs");
      return response.json();
    },
  });

  const createSigMutation = useMutation({
    mutationFn: async (data: Partial<SpecialInterestGroup>) => {
      return await apiRequest("/api/admin/sigs", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sigs"] });
      toast({ title: "Special Interest Group created successfully" });
      setDialogOpen(false);
      setEditingSig(null);
    },
    onError: (error: any) => {
      toast({ title: "Error creating SIG", description: error.message, variant: "destructive" });
    },
  });

  const updateSigMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SpecialInterestGroup> }) => {
      return await apiRequest(`/api/admin/sigs/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sigs"] });
      toast({ title: "Special Interest Group updated successfully" });
      setDialogOpen(false);
      setEditingSig(null);
    },
    onError: (error: any) => {
      toast({ title: "Error updating SIG", description: error.message, variant: "destructive" });
    },
  });

  const seedXlsxMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/admin/sigs/seed-xlsx", "POST");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sigs"] });
      toast({ title: `${data?.count ?? 62} SIGs seeded successfully`, description: "All organizations from the XLSX have been added to the database." });
    },
    onError: (error: any) => {
      toast({ title: "Error seeding SIGs", description: error.message, variant: "destructive" });
    },
  });

  const deleteSigMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/sigs/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sigs"] });
      toast({ title: "Special Interest Group deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting SIG", description: error.message, variant: "destructive" });
    },
  });

  const fetchFecMutation = useMutation({
    mutationFn: async (id: string) => {
      setFetchingFecId(id);
      return await apiRequest(`/api/admin/sigs/${id}/fetch-fec`, "POST");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sigs"] });
      toast({ title: "FEC data fetched", description: data?.message ?? "SIG updated from FEC." });
      if (editingSig && data?.sig) setEditingSig(data.sig);
    },
    onError: (error: any) => {
      toast({ title: "FEC fetch failed", description: error.message, variant: "destructive" });
    },
    onSettled: () => setFetchingFecId(null),
  });

  const findMissingIdsMutation = useMutation({
    mutationFn: async () => apiRequest("/api/admin/sigs/find-missing-fec-ids", "POST"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sigs"] });
      setFindMissingResult({ found: data.found, skipped: data.skipped, total: data.total });
      toast({ title: "FEC ID scan complete", description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "Scan failed", description: error.message, variant: "destructive" });
    },
  });

  const updateSigsMutation = useMutation({
    mutationFn: async () => apiRequest("/api/admin/sigs/update-from-fec", "POST"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sigs"] });
      setUpdateFecResult({ updated: data.updated, skipped: data.skipped, total: data.total });
      toast({ title: "SIGs updated from FEC", description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const aiGradeMutation = useMutation({
    mutationFn: async () => apiRequest("/api/admin/sigs/ai-grade", "POST"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sigs"] });
      setAiGradeResult({ graded: data.graded, errors: data.errors, total: data.total });
      toast({ title: "AI grading complete", description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "AI grading failed", description: error.message, variant: "destructive" });
    },
  });

  const fixCNumbersMutation = useMutation({
    mutationFn: async () => apiRequest("/api/admin/sigs/fix-c-numbers", "POST"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sigs"] });
      setFixCNumbersResult({ fixed: data.fixed, message: data.message });
      toast({ title: `${data.fixed} FEC IDs fixed`, description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "Fix failed", description: error.message, variant: "destructive" });
    },
  });

  const uploadCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/sigs/upload-csv", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sigs"] });
      setCsvUploadResult({ created: data.created, updated: data.updated, errors: data.errors, message: data.message });
      toast({ title: "CSV import complete", description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "CSV import failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const gradeWeightRaw = formData.get("gradeWeight") as string;
    const computedGrade = gradeOverride !== "auto" ? gradeOverride : autoGrade(influenceSlider);
    const data: Partial<SpecialInterestGroup> = {
      name: formData.get("name") as string,
      acronym: formData.get("acronym") as string || undefined,
      description: formData.get("description") as string || undefined,
      category: formData.get("category") as string,
      website: formData.get("website") as string || undefined,
      logoUrl: formData.get("logoUrl") as string || undefined,
      contactEmail: formData.get("contactEmail") as string || undefined,
      headquarters: formData.get("headquarters") as string || undefined,
      foundedYear: formData.get("foundedYear") ? parseInt(formData.get("foundedYear") as string) : undefined,
      industry: formData.get("industry") as string || undefined,
      disclosureNotes: formData.get("disclosureNotes") as string || undefined,
      gradeWeight: gradeWeightRaw ? parseFloat(gradeWeightRaw) : undefined,
      influenceScore: influenceSlider,
      letterGrade: computedGrade,
      isActive: formData.get("isActive") === "on",
      totalContributions: formData.get("totalContributions") ? parseInt(formData.get("totalContributions") as string) : undefined,
      fecId: formData.get("fecId") as string || undefined,
      contactPhone: formData.get("contactPhone") as string || undefined,
    };

    if (editingSig) {
      updateSigMutation.mutate({ id: editingSig.id, data });
    } else {
      createSigMutation.mutate(data);
    }
  };

  const openCreateDialog = () => {
    setEditingSig(null);
    setInfluenceSlider(0);
    setGradeOverride("");
    setDialogOpen(true);
  };

  const openEditDialog = (sig: SpecialInterestGroup) => {
    setEditingSig(sig);
    setInfluenceSlider(sig.influenceScore ?? 0);
    setGradeOverride(sig.letterGrade || "");
    setDialogOpen(true);
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getCategorySentiment = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.sentiment || "neutral";
  };

  const categoryBadgeClass = (value: string) => {
    const s = getCategorySentiment(value);
    if (s === "negative") return "border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950";
    if (s === "positive") return "border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950";
    return "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400";
  };

  const getIndustryLabel = (value: string) => {
    return INDUSTRIES.find(i => i.value === value)?.label || value;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Special Interest Groups
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage organizations that sponsor politicians for corruption scorecard tracking
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => { setFixCNumbersResult(null); fixCNumbersMutation.mutate(); }}
              disabled={fixCNumbersMutation.isPending}
              title="Find SIGs whose name is a raw FEC committee ID (C00000000) and move it to the FEC ID field"
            >
              {fixCNumbersMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Fix C-Numbers
            </Button>
            <Button
              variant="outline"
              onClick={() => { setFindMissingResult(null); findMissingIdsMutation.mutate(); }}
              disabled={findMissingIdsMutation.isPending}
              title="Search FEC for committee IDs on SIGs that don't have one yet"
            >
              {findMissingIdsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Find Missing IDs
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadCsv(TEMPLATES.sigs.filename, TEMPLATES.sigs.headers, TEMPLATES.sigs.sample)}
              title="Download blank CSV template for SIG data entry"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setCsvUploadResult(null);
                  uploadCsvMutation.mutate(file);
                }
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              onClick={() => csvInputRef.current?.click()}
              disabled={uploadCsvMutation.isPending}
              title="Upload a CSV to bulk-create or update SIGs"
            >
              {uploadCsvMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4 mr-2" />
              )}
              Upload CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => { setUpdateFecResult(null); updateSigsMutation.mutate(); }}
              disabled={updateSigsMutation.isPending}
              title="Pull fresh name, address, phone, website, and contributions from FEC for all SIGs with an ID"
            >
              {updateSigsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Update SIGs
            </Button>
            <Button
              variant="outline"
              onClick={() => { setAiGradeResult(null); aiGradeMutation.mutate(); }}
              disabled={aiGradeMutation.isPending}
              title="Use AI to assign an initial influence score (-50 to +50) to ungraded SIGs"
            >
              {aiGradeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              AI Grade PACs
            </Button>
            <Button onClick={openCreateDialog} data-testid="btn-create-sig">
              <Plus className="h-4 w-4 mr-2" />
              Add SIG
            </Button>
          </div>
        </div>

        {/* FEC ID scan progress / result banner */}
        {findMissingIdsMutation.isPending && (
          <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-blue-700 dark:text-blue-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching FEC database for committee IDs…
            </div>
            <div className="w-full h-2 rounded-full bg-blue-200 dark:bg-blue-800 overflow-hidden">
              <div className="h-full w-2/5 rounded-full bg-blue-500"
                style={{ animation: "indeterminate 1.5s ease-in-out infinite" }}
              />
            </div>
          </div>
        )}
        {!findMissingIdsMutation.isPending && findMissingResult && (
          <div className="mb-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4 flex items-center justify-between">
            <div className="text-sm text-green-800 dark:text-green-200">
              <span className="font-semibold">Scan complete</span> — scanned {findMissingResult.total} SIGs · <span className="font-semibold text-green-700 dark:text-green-300">{findMissingResult.found} IDs assigned</span> · {findMissingResult.skipped} no match
            </div>
            <button onClick={() => setFindMissingResult(null)} className="text-green-600 dark:text-green-400 text-xs underline ml-4">dismiss</button>
          </div>
        )}

        {/* Update SIGs from FEC progress / result */}
        {updateSigsMutation.isPending && (
          <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-blue-700 dark:text-blue-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching full organization data from FEC for all SIGs…
            </div>
            <div className="w-full h-2 rounded-full bg-blue-200 dark:bg-blue-800 overflow-hidden">
              <div className="h-full w-2/5 rounded-full bg-blue-500" style={{ animation: "indeterminate 1.5s ease-in-out infinite" }} />
            </div>
          </div>
        )}
        {!updateSigsMutation.isPending && updateFecResult && (
          <div className="mb-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4 flex items-center justify-between">
            <div className="text-sm text-green-800 dark:text-green-200">
              <span className="font-semibold">Update complete</span> — {updateFecResult.total} with FEC IDs · <span className="font-semibold text-green-700 dark:text-green-300">{updateFecResult.updated} updated</span> · {updateFecResult.skipped} skipped
            </div>
            <button onClick={() => setUpdateFecResult(null)} className="text-green-600 dark:text-green-400 text-xs underline ml-4">dismiss</button>
          </div>
        )}

        {/* AI Grade PACs progress / result */}
        {aiGradeMutation.isPending && (
          <div className="mb-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 p-4">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-purple-700 dark:text-purple-300">
              <Sparkles className="h-4 w-4 animate-pulse" />
              AI is grading organizations from the perspective of a neutral voter…
            </div>
            <div className="w-full h-2 rounded-full bg-purple-200 dark:bg-purple-800 overflow-hidden">
              <div className="h-full w-2/5 rounded-full bg-purple-500" style={{ animation: "indeterminate 1.5s ease-in-out infinite" }} />
            </div>
          </div>
        )}
        {!aiGradeMutation.isPending && aiGradeResult && (
          <div className="mb-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 p-4 flex items-center justify-between">
            <div className="text-sm text-purple-800 dark:text-purple-200">
              <span className="font-semibold">AI grading complete</span> — <span className="font-semibold text-purple-700 dark:text-purple-300">{aiGradeResult.graded} organizations graded</span> · {aiGradeResult.errors} errors
            </div>
            <button onClick={() => setAiGradeResult(null)} className="text-purple-600 dark:text-purple-400 text-xs underline ml-4">dismiss</button>
          </div>
        )}

        {/* CSV Upload progress / result */}
        {uploadCsvMutation.isPending && (
          <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-blue-700 dark:text-blue-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing SIGs from CSV…
            </div>
            <div className="w-full h-2 rounded-full bg-blue-200 dark:bg-blue-800 overflow-hidden">
              <div className="h-full w-2/5 rounded-full bg-blue-500" style={{ animation: "indeterminate 1.5s ease-in-out infinite" }} />
            </div>
          </div>
        )}
        {!uploadCsvMutation.isPending && csvUploadResult && (
          <div className="mb-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4 flex items-center justify-between">
            <div className="text-sm text-green-800 dark:text-green-200">
              <span className="font-semibold">CSV import complete</span> —{" "}
              <span className="font-semibold text-green-700 dark:text-green-300">{csvUploadResult.created} created</span>,{" "}
              <span className="font-semibold text-green-700 dark:text-green-300">{csvUploadResult.updated} updated</span>
              {csvUploadResult.errors > 0 && <span className="text-red-600 dark:text-red-400"> · {csvUploadResult.errors} errors</span>}
            </div>
            <button onClick={() => setCsvUploadResult(null)} className="text-green-600 dark:text-green-400 text-xs underline ml-4">dismiss</button>
          </div>
        )}

        {/* Fix C-Numbers result */}
        {!fixCNumbersMutation.isPending && fixCNumbersResult && (
          <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4 flex items-center justify-between">
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">C-number fix complete</span> — <span className="font-semibold text-amber-700 dark:text-amber-300">{fixCNumbersResult.fixed} FEC IDs populated</span>. Run "Update SIGs" to pull their real names.
            </div>
            <button onClick={() => setFixCNumbersResult(null)} className="text-amber-600 dark:text-amber-400 text-xs underline ml-4">dismiss</button>
          </div>
        )}

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name or acronym..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-sig"
                  />
                </div>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel className="text-red-600 dark:text-red-400">Negative (-)</SelectLabel>
                    {CATEGORIES.filter(c => c.sentiment === "negative").map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel className="text-slate-500">Neutral</SelectLabel>
                    {CATEGORIES.filter(c => c.sentiment === "neutral").map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel className="text-green-600 dark:text-green-400">Positive (+)</SelectLabel>
                    {CATEGORIES.filter(c => c.sentiment === "positive").map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-industry-filter">
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {INDUSTRIES.map(ind => (
                    <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>
              {sigs.length} Special Interest Group{sigs.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : sigs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No Special Interest Groups found. Click "Add SIG" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Name</TableHead>
                    <TableHead className="w-[130px]">Category</TableHead>
                    <TableHead className="w-[120px]">Grade</TableHead>
                    <TableHead className="w-[110px]">Interest</TableHead>
                    <TableHead className="w-[160px]">Location</TableHead>
                    <TableHead className="w-[110px]">Contributions</TableHead>
                    <TableHead className="w-[100px]">FEC ID</TableHead>
                    <TableHead className="w-[68px]">Status</TableHead>
                    <TableHead className="text-right w-[130px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sigs.map((sig) => (
                    <TableRow key={sig.id} data-testid={`row-sig-${sig.id}`} className="h-9">
                      <TableCell className="py-1.5">
                        <div>
                          <div className="font-medium leading-tight truncate max-w-[210px]" title={sig.name}>{sig.name}</div>
                          {sig.acronym && (
                            <div className="text-slate-400 leading-tight">({sig.acronym})</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline" className={`text-[10px] px-1 py-0 leading-tight ${categoryBadgeClass(sig.category)}`}>
                            {getCategoryLabel(sig.category)}
                          </Badge>
                          {sig.isAce && (
                            <Badge className="bg-emerald-600 text-white text-[10px] gap-0.5 px-1 py-0 leading-tight">
                              <ShieldCheck className="h-2.5 w-2.5" />ACE
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        {sig.influenceScore !== null && sig.influenceScore !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 relative shrink-0">
                              <div className="absolute top-0 h-full w-px bg-white/60" style={{ left: "50%" }} />
                              <div className="absolute top-0 h-full w-1 bg-white shadow-sm"
                                style={{ left: `calc(${((sig.influenceScore + 50) / 100) * 100}% - 2px)` }} />
                            </div>
                            <span className="text-slate-400">{sig.influenceScore > 0 ? "+" : ""}{sig.influenceScore}</span>
                            <span className={gradeColor(sig.letterGrade || autoGrade(sig.influenceScore))}>
                              {sig.letterGrade || autoGrade(sig.influenceScore)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 text-slate-600 dark:text-slate-400">
                        {sig.industry ? getIndustryLabel(sig.industry) : <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="py-1.5 text-slate-600 dark:text-slate-400 truncate max-w-[160px]" title={sig.headquarters || ""}>
                        {sig.headquarters || <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="py-1.5">
                        {sig.totalContributions != null && sig.totalContributions > 0
                          ? <span className="text-green-700 dark:text-green-400 font-medium">
                              {sig.totalContributions >= 1_000_000
                                ? `$${(sig.totalContributions / 1_000_000).toFixed(1)}M`
                                : sig.totalContributions >= 1_000
                                  ? `$${Math.round(sig.totalContributions / 1_000)}K`
                                  : `$${sig.totalContributions.toLocaleString()}`}
                            </span>
                          : <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="py-1.5">
                        {sig.fecId ? (
                          <a
                            href={`https://www.fec.gov/data/committee/${sig.fecId}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline font-mono flex items-center gap-0.5"
                          >
                            {sig.fecId}
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        ) : <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant={sig.isActive ? "default" : "secondary"} className="text-[10px] px-1 py-0">
                          {sig.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-right">
                        <div className="flex justify-end gap-0.5">
                          {sig.fecId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Fetch data from FEC"
                              disabled={fetchingFecId === sig.id}
                              onClick={() => fetchFecMutation.mutate(sig.id)}
                              data-testid={`btn-fetch-fec-${sig.id}`}
                            >
                              {fetchingFecId === sig.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                                : <RefreshCw className="h-3.5 w-3.5 text-blue-500" />}
                            </Button>
                          )}
                          {sig.website && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Visit website"
                              onClick={() => window.open(sig.website, "_blank")}
                              data-testid={`btn-website-${sig.id}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Edit"
                            onClick={() => openEditDialog(sig)}
                            data-testid={`btn-edit-${sig.id}`}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Delete"
                            onClick={() => {
                              if (confirm(`Delete "${sig.name}"? This will also remove all sponsorship links.`)) {
                                deleteSigMutation.mutate(sig.id);
                              }
                            }}
                            data-testid={`btn-delete-${sig.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSig ? "Edit Special Interest Group" : "Create Special Interest Group"}
            </DialogTitle>
            <DialogDescription>
              {editingSig 
                ? "Update the details of this organization" 
                : "Add a new organization to track as a potential campaign sponsor"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingSig?.name || ""}
                    required
                    data-testid="input-sig-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acronym">Acronym</Label>
                  <Input
                    id="acronym"
                    name="acronym"
                    defaultValue={editingSig?.acronym || ""}
                    placeholder="e.g., NRA, AIPAC"
                    data-testid="input-sig-acronym"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select name="category" defaultValue={editingSig?.category || ""}>
                    <SelectTrigger data-testid="select-sig-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="text-red-600 dark:text-red-400">Negative (-)</SelectLabel>
                        {CATEGORIES.filter(c => c.sentiment === "negative").map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel className="text-slate-500">Neutral</SelectLabel>
                        {CATEGORIES.filter(c => c.sentiment === "neutral").map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel className="text-green-600 dark:text-green-400">Positive (+)</SelectLabel>
                        {CATEGORIES.filter(c => c.sentiment === "positive").map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Interest</Label>
                  <Select name="industry" defaultValue={editingSig?.industry || ""}>
                    <SelectTrigger data-testid="select-sig-industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(ind => (
                        <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingSig?.description || ""}
                  rows={3}
                  data-testid="input-sig-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    defaultValue={editingSig?.website || ""}
                    placeholder="https://..."
                    data-testid="input-sig-website"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    defaultValue={editingSig?.contactEmail || ""}
                    data-testid="input-sig-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    defaultValue={editingSig?.contactPhone || ""}
                    placeholder="e.g. (202) 555-0100"
                    data-testid="input-sig-phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="headquarters">Headquarters</Label>
                  <Input
                    id="headquarters"
                    name="headquarters"
                    defaultValue={editingSig?.headquarters || ""}
                    placeholder="City, State"
                    data-testid="input-sig-headquarters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="foundedYear">Founded Year</Label>
                  <Input
                    id="foundedYear"
                    name="foundedYear"
                    type="number"
                    min="1800"
                    max={new Date().getFullYear()}
                    defaultValue={editingSig?.foundedYear || ""}
                    data-testid="input-sig-founded"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  type="url"
                  defaultValue={editingSig?.logoUrl || ""}
                  placeholder="https://..."
                  data-testid="input-sig-logo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalContributions">Total Contributions ($)</Label>
                <Input
                  id="totalContributions"
                  name="totalContributions"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={editingSig?.totalContributions ?? ""}
                  placeholder="e.g. 5000000"
                  data-testid="input-sig-total-contributions"
                />
                <p className="text-xs text-slate-500">Grand total contributions in dollars (sourced from FEC / OpenSecrets).</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecId">FEC Committee ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="fecId"
                    name="fecId"
                    defaultValue={editingSig?.fecId ?? ""}
                    placeholder="e.g. C00000935"
                    data-testid="input-sig-fec-id"
                    className="flex-1"
                  />
                  {editingSig?.fecId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={fetchingFecId === editingSig.id}
                      onClick={() => fetchFecMutation.mutate(editingSig.id)}
                      className="whitespace-nowrap gap-1.5"
                    >
                      {fetchingFecId === editingSig.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <RefreshCw className="h-3.5 w-3.5" />}
                      Fetch FEC Data
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500">FEC committee ID — links to the FEC.gov profile page. Click "Fetch FEC Data" to auto-fill name, website, location, and total contributions.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="disclosureNotes">Disclosure Notes (Admin Only)</Label>
                <Textarea
                  id="disclosureNotes"
                  name="disclosureNotes"
                  defaultValue={editingSig?.disclosureNotes || ""}
                  rows={2}
                  placeholder="Internal notes about this organization..."
                  data-testid="input-sig-notes"
                />
              </div>

              {/* Influence Score */}
              <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">ACP Influence Score</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {influenceSlider > 0 ? "+" : ""}{influenceSlider}
                    </span>
                    <span className={`text-sm font-black ${gradeColor(gradeOverride !== "auto" ? gradeOverride : autoGrade(influenceSlider))}`}>
                      {gradeOverride !== "auto" ? gradeOverride : autoGrade(influenceSlider)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" />Corruption (-50)</span>
                  <span>Neutral (0)</span>
                  <span className="flex items-center gap-1">Progressive (+50)<TrendingUp className="h-3 w-3 text-green-500" /></span>
                </div>
                <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 mb-2">
                  <div className="absolute top-0 h-full w-px bg-white/60" style={{ left: "50%" }} />
                </div>
                <Slider
                  min={-50}
                  max={50}
                  step={1}
                  value={[influenceSlider]}
                  onValueChange={(v) => { setInfluenceSlider(v[0]); setGradeOverride("auto"); }}
                  className="w-full"
                />
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Grade Override:</Label>
                  <Select value={gradeOverride} onValueChange={setGradeOverride}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder={`Auto: ${autoGrade(influenceSlider)}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (from score)</SelectItem>
                      {["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F+","F","F-"].map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gradeWeight">Grade Impact Weight</Label>
                <Input
                  id="gradeWeight"
                  name="gradeWeight"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  defaultValue={editingSig?.gradeWeight ?? 1.0}
                  data-testid="input-sig-grade-weight"
                />
                <p className="text-xs text-slate-500">
                  Multiplier applied to this group's contribution when calculating a politician's grade. 1.0 = normal, 2.0 = double impact, 0.5 = half impact. ACE groups use this to offset negative scores.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  name="isActive"
                  defaultChecked={editingSig?.isActive ?? true}
                  data-testid="switch-sig-active"
                />
                <Label htmlFor="isActive">Active (can be linked to politicians)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createSigMutation.isPending || updateSigMutation.isPending}
                data-testid="btn-submit-sig"
              >
                {editingSig ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
