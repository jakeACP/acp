import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, Plus, Edit, Trash2, Search, ExternalLink, Database, Loader2, FileDown, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
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
  createdAt?: string;
  updatedAt?: string;
};

const CATEGORIES = [
  { value: "corporate", label: "Corporate" },
  { value: "pac", label: "Political Action Committee (PAC)" },
  { value: "super_pac", label: "Super PAC" },
  { value: "union", label: "Labor Union" },
  { value: "lobby", label: "Lobbying Group" },
  { value: "nonprofit", label: "Non-Profit Organization" },
  { value: "industry", label: "Industry Association" },
  { value: "Anti-Corruption Endorsement", label: "Anti-Corruption Endorsement (ACE)" },
  { value: "other", label: "Other" },
];

const INDUSTRIES = [
  { value: "defense", label: "Defense & Military" },
  { value: "healthcare", label: "Healthcare & Pharma" },
  { value: "energy", label: "Energy & Oil" },
  { value: "finance", label: "Finance & Banking" },
  { value: "tech", label: "Technology" },
  { value: "agriculture", label: "Agriculture" },
  { value: "real_estate", label: "Real Estate" },
  { value: "transportation", label: "Transportation" },
  { value: "telecom", label: "Telecommunications" },
  { value: "entertainment", label: "Entertainment & Media" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "foreign", label: "Foreign Entity" },
  { value: "other", label: "Other" },
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

  const getIndustryLabel = (value: string) => {
    return INDUSTRIES.find(i => i.value === value)?.label || value;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              onClick={() => downloadCsv(TEMPLATES.sigs.filename, TEMPLATES.sigs.headers, TEMPLATES.sigs.sample)}
              title="Download blank CSV template for SIG data entry"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button
              variant="outline"
              onClick={() => seedXlsxMutation.mutate()}
              disabled={seedXlsxMutation.isPending}
              title="Seed all 62 SIGs from the XLSX database"
            >
              {seedXlsxMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Seed 62 SIGs
            </Button>
            <Button onClick={openCreateDialog} data-testid="btn-create-sig">
              <Plus className="h-4 w-4 mr-2" />
              Add SIG
            </Button>
          </div>
        </div>

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
                <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Influence / Grade</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Total Contributions</TableHead>
                    <TableHead>FEC ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sigs.map((sig) => (
                    <TableRow key={sig.id} data-testid={`row-sig-${sig.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {sig.logoUrl ? (
                            <img src={sig.logoUrl} alt="" className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{sig.name}</div>
                            {sig.acronym && (
                              <div className="text-sm text-slate-500">({sig.acronym})</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline">{getCategoryLabel(sig.category)}</Badge>
                          {sig.isAce && (
                            <Badge className="bg-emerald-600 text-white text-xs gap-1 px-1.5">
                              <ShieldCheck className="h-3 w-3" />ACE
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sig.influenceScore !== null && sig.influenceScore !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 relative">
                              <div className="absolute top-0 h-full w-px bg-white/60" style={{ left: "50%" }} />
                              <div className="absolute top-0 h-full w-1 bg-white shadow-sm"
                                style={{ left: `calc(${((sig.influenceScore + 50) / 100) * 100}% - 2px)` }} />
                            </div>
                            <span className="text-xs text-slate-500">{sig.influenceScore > 0 ? "+" : ""}{sig.influenceScore}</span>
                            <span className={`text-xs ${gradeColor(sig.letterGrade || autoGrade(sig.influenceScore))}`}>
                              {sig.letterGrade || autoGrade(sig.influenceScore)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sig.industry ? getIndustryLabel(sig.industry) : "-"}
                      </TableCell>
                      <TableCell>{sig.headquarters || "-"}</TableCell>
                      <TableCell>
                        {sig.totalContributions != null
                          ? `$${sig.totalContributions.toLocaleString()}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {sig.fecId ? (
                          <a
                            href={`https://www.fec.gov/data/committee/${sig.fecId}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs flex items-center gap-1"
                          >
                            {sig.fecId}
                            <ExternalLink className="h-3 w-3 inline-block" />
                          </a>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sig.isActive ? "default" : "secondary"}>
                          {sig.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {sig.website && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(sig.website, "_blank")}
                              data-testid={`btn-website-${sig.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(sig)}
                            data-testid={`btn-edit-${sig.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Delete "${sig.name}"? This will also remove all sponsorship links.`)) {
                                deleteSigMutation.mutate(sig.id);
                              }
                            }}
                            data-testid={`btn-delete-${sig.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
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
                <Input
                  id="fecId"
                  name="fecId"
                  defaultValue={editingSig?.fecId ?? ""}
                  placeholder="e.g. C00000935"
                  data-testid="input-sig-fec-id"
                />
                <p className="text-xs text-slate-500">FEC committee ID — links to the FEC.gov profile page for this group.</p>
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
