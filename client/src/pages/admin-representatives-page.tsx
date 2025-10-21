import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertRepresentativeSchema, insertZipCodeLookupSchema, type Representative, type ZipCodeLookup } from "@shared/schema";
import { Plus, Search, Download, Upload, Edit, Trash2, MapPin, User, Calendar, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { AdminNavigation } from "@/components/admin-navigation";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form schemas - use strings for form inputs and transform for submission
const representativeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  officeTitle: z.string().min(1, "Office title is required"),
  officeLevel: z.string().min(1, "Office level is required"),
  party: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  district: z.string().optional(),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  termStart: z.string().optional(),
  termEnd: z.string().optional(),
  photoUrl: z.string().optional(),
  socials: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().default(true)
});

const zipMappingFormSchema = insertZipCodeLookupSchema;

type RepresentativeFormData = z.infer<typeof representativeFormSchema>;
type ZipMappingFormData = z.infer<typeof zipMappingFormSchema>;

interface RepresentativeListResponse {
  representatives: Representative[];
  total: number;
}

export default function AdminRepresentativesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [currentTab, setCurrentTab] = useState("representatives");
  const [showRepDialog, setShowRepDialog] = useState(false);
  const [showZipDialog, setShowZipDialog] = useState(false);
  const [editingRep, setEditingRep] = useState<Representative | null>(null);
  const [editingZip, setEditingZip] = useState<ZipCodeLookup | null>(null);
  
  // Filters and pagination
  const [repFilters, setRepFilters] = useState({
    search: "",
    officeLevel: "",
    active: true
  });
  const [repPagination, setRepPagination] = useState({ limit: 50, offset: 0 });
  const [zipSearch, setZipSearch] = useState("");

  // Owner admin check
  const { data: adminUserId } = useQuery({
    queryKey: ["/api/admin/user-id"],
    queryFn: async () => {
      const response = await fetch("/api/admin/user-id");
      if (!response.ok) throw new Error("Failed to get admin user");
      return response.text();
    }
  });

  // Redirect if not owner admin
  if (!user || user.role !== "admin" || (adminUserId && user.id !== adminUserId)) {
    return <Redirect to="/" />;
  }

  // Form setup
  const repForm = useForm<RepresentativeFormData>({
    resolver: zodResolver(representativeFormSchema),
    defaultValues: {
      name: "",
      officeTitle: "",
      officeLevel: "",
      party: "",
      email: "",
      phone: "",
      website: "",
      district: "",
      jurisdiction: "",
      termStart: "",
      termEnd: "",
      photoUrl: "",
      socials: "",
      notes: "",
      active: true
    }
  });

  const zipForm = useForm<ZipMappingFormData>({
    resolver: zodResolver(zipMappingFormSchema),
    defaultValues: {
      zipCode: "",
      representativeId: "",
      officeLevel: "",
      district: "",
      jurisdiction: "",
      priority: 1
    }
  });

  // Data queries
  const { data: repData, isLoading: repLoading, refetch: refetchReps } = useQuery<RepresentativeListResponse>({
    queryKey: ["/api/admin/representatives", repFilters, repPagination],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (repFilters.search) params.append("search", repFilters.search);
      if (repFilters.officeLevel) params.append("officeLevel", repFilters.officeLevel);
      params.append("active", repFilters.active.toString());
      params.append("limit", repPagination.limit.toString());
      params.append("offset", repPagination.offset.toString());

      const response = await fetch(`/api/admin/representatives?${params}`);
      if (!response.ok) throw new Error("Failed to fetch representatives");
      return response.json();
    }
  });

  const { data: zipMappings, isLoading: zipLoading, refetch: refetchZips } = useQuery<ZipCodeLookup[]>({
    queryKey: ["/api/admin/zip-mappings", zipSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (zipSearch) params.append("zipCode", zipSearch);
      
      const response = await fetch(`/api/admin/zip-mappings?${params}`);
      if (!response.ok) throw new Error("Failed to fetch zip mappings");
      return response.json();
    }
  });

  // Mutations
  const createRepMutation = useMutation({
    mutationFn: async (data: RepresentativeFormData) => {
      return apiRequest("/api/admin/representatives", "POST", data);
    },
    onSuccess: () => {
      toast({ title: "Representative created successfully" });
      setShowRepDialog(false);
      repForm.reset();
      refetchReps();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating representative",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateRepMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RepresentativeFormData> }) => {
      return apiRequest(`/api/admin/representatives/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      toast({ title: "Representative updated successfully" });
      setShowRepDialog(false);
      setEditingRep(null);
      repForm.reset();
      refetchReps();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating representative",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteRepMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/representatives/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Representative deleted successfully" });
      refetchReps();
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting representative",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const createZipMutation = useMutation({
    mutationFn: async (data: ZipMappingFormData) => {
      return apiRequest("/api/admin/zip-mappings", "POST", data);
    },
    onSuccess: () => {
      toast({ title: "Zip mapping created successfully" });
      setShowZipDialog(false);
      zipForm.reset();
      refetchZips();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating zip mapping",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteZipMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/zip-mappings/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Zip mapping deleted successfully" });
      refetchZips();
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting zip mapping",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const exportRepsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/representatives/export");
      if (!response.ok) throw new Error("Export failed");
      return response.json();
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `representatives-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Representatives exported successfully" });
    }
  });

  const importRepsMutation = useMutation({
    mutationFn: async (items: any[]) => {
      return apiRequest("/api/admin/representatives/import", "POST", { items });
    },
    onSuccess: (result: any) => {
      toast({ 
        title: "Import completed", 
        description: `${result.imported} representatives imported, ${result.errors.length} errors`
      });
      refetchReps();
    }
  });

  // Event handlers
  const handleEditRep = (rep: Representative) => {
    setEditingRep(rep);
    repForm.reset({
      name: rep.name,
      officeTitle: rep.officeTitle,
      officeLevel: rep.officeLevel,
      party: rep.party || "",
      email: rep.email || "",
      phone: rep.phone || "",
      website: rep.website || "",
      district: rep.district || "",
      jurisdiction: rep.jurisdiction || "",
      termStart: rep.termStart ? new Date(rep.termStart).toISOString().split('T')[0] : "",
      termEnd: rep.termEnd ? new Date(rep.termEnd).toISOString().split('T')[0] : "",
      photoUrl: rep.photoUrl || "",
      socials: JSON.stringify(rep.socials || {}),
      notes: rep.notes || "",
      active: rep.active ?? true
    });
    setShowRepDialog(true);
  };

  const handleRepSubmit: SubmitHandler<RepresentativeFormData> = (data) => {
    // Transform form data to API format
    const transformedData = {
      ...data,
      termStart: data.termStart || undefined,
      termEnd: data.termEnd || undefined,
      socials: data.socials ? JSON.parse(data.socials) : {},
      party: data.party || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      website: data.website || undefined,
      district: data.district || undefined,
      photoUrl: data.photoUrl || undefined,
      notes: data.notes || undefined
    };
    
    if (editingRep) {
      updateRepMutation.mutate({ id: editingRep.id, data: transformedData });
    } else {
      createRepMutation.mutate(transformedData);
    }
  };

  const handleZipSubmit = (data: ZipMappingFormData) => {
    createZipMutation.mutate(data);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (Array.isArray(data)) {
          importRepsMutation.mutate(data);
        } else {
          toast({
            title: "Invalid file format",
            description: "File must contain an array of representatives",
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "File parsing error",
          description: "Invalid JSON file",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      
      <div className="container max-w-7xl mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6" />
              Admin Representatives Portal
            </CardTitle>
            <CardDescription>
              Manage representatives and zip code mappings for the platform
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-4" data-testid="tabs-admin">
                <TabsTrigger value="representatives" data-testid="tab-representatives">
                  Representatives
                </TabsTrigger>
                <TabsTrigger value="zip-mappings" data-testid="tab-zip-mappings">
                  Zip Mappings
                </TabsTrigger>
                <TabsTrigger value="import-export" data-testid="tab-import-export">
                  Import/Export
                </TabsTrigger>
                <TabsTrigger value="audit" data-testid="tab-audit">
                  Audit
                </TabsTrigger>
              </TabsList>

              {/* Representatives Tab */}
              <TabsContent value="representatives" className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <Input
                      placeholder="Search representatives..."
                      value={repFilters.search}
                      onChange={(e) => setRepFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="max-w-sm"
                      data-testid="input-search-representatives"
                    />
                    <Select 
                      value={repFilters.officeLevel} 
                      onValueChange={(value) => setRepFilters(prev => ({ ...prev, officeLevel: value }))}
                    >
                      <SelectTrigger className="w-[180px]" data-testid="select-office-level">
                        <SelectValue placeholder="Office Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Levels</SelectItem>
                        <SelectItem value="federal">Federal</SelectItem>
                        <SelectItem value="state">State</SelectItem>
                        <SelectItem value="local">Local</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={repFilters.active}
                        onCheckedChange={(checked) => setRepFilters(prev => ({ ...prev, active: checked }))}
                        data-testid="switch-active-only"
                      />
                      <Label>Active Only</Label>
                    </div>
                  </div>
                  
                  <Dialog open={showRepDialog} onOpenChange={setShowRepDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => { setEditingRep(null); repForm.reset(); }} data-testid="button-add-representative">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Representative
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingRep ? "Edit Representative" : "Add Representative"}
                        </DialogTitle>
                        <DialogDescription>
                          {editingRep ? "Update representative information" : "Create a new representative record"}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...repForm}>
                        <form onSubmit={repForm.handleSubmit(handleRepSubmit)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={repForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name *</FormLabel>
                                  <FormControl>
                                    <Input {...field} data-testid="input-rep-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={repForm.control}
                              name="officeTitle"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Office Title *</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., Senator, Congressperson" data-testid="input-rep-office-title" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={repForm.control}
                              name="officeLevel"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Office Level *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-rep-office-level">
                                        <SelectValue placeholder="Select level" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="federal">Federal</SelectItem>
                                      <SelectItem value="state">State</SelectItem>
                                      <SelectItem value="local">Local</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={repForm.control}
                              name="party"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Party</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value || ""} placeholder="e.g., Democratic, Republican" data-testid="input-rep-party" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={repForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value || ""} type="email" data-testid="input-rep-email" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={repForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value || ""} data-testid="input-rep-phone" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={repForm.control}
                            name="website"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Website</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} type="url" data-testid="input-rep-website" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={repForm.control}
                              name="district"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>District</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value || ""} data-testid="input-rep-district" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={repForm.control}
                              name="jurisdiction"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Jurisdiction *</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value || ""} placeholder="e.g., California, US" data-testid="input-rep-jurisdiction" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={repForm.control}
                              name="photoUrl"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Photo URL</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value || ""} type="url" data-testid="input-rep-photo-url" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={repForm.control}
                              name="termStart"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Term Start</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="date" data-testid="input-rep-term-start" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={repForm.control}
                              name="termEnd"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Term End</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="date" data-testid="input-rep-term-end" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={repForm.control}
                            name="socials"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Social Media (JSON)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    value={field.value || ""}
                                    placeholder='{"twitter": "@username", "facebook": "profile"}'
                                    data-testid="textarea-rep-socials"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={repForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Textarea {...field} value={field.value || ""} data-testid="textarea-rep-notes" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={repForm.control}
                            name="active"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Active</FormLabel>
                                  <div className="text-[0.8rem] text-muted-foreground">
                                    Whether this representative is currently serving
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-rep-active"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <div className="flex justify-end space-x-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setShowRepDialog(false)}
                              data-testid="button-cancel-rep"
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createRepMutation.isPending || updateRepMutation.isPending}
                              data-testid="button-save-rep"
                            >
                              {(createRepMutation.isPending || updateRepMutation.isPending) && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              )}
                              {editingRep ? "Update" : "Create"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                {repLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Office</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead>Jurisdiction</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {repData?.representatives?.map((rep) => (
                          <TableRow key={rep.id} data-testid={`row-representative-${rep.id}`}>
                            <TableCell className="font-medium" data-testid={`text-rep-name-${rep.id}`}>
                              {rep.name}
                            </TableCell>
                            <TableCell data-testid={`text-rep-office-${rep.id}`}>
                              {rep.officeTitle}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" data-testid={`badge-rep-level-${rep.id}`}>
                                {rep.officeLevel}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-rep-party-${rep.id}`}>
                              {rep.party}
                            </TableCell>
                            <TableCell data-testid={`text-rep-jurisdiction-${rep.id}`}>
                              {rep.jurisdiction}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={rep.active ? "default" : "secondary"}
                                data-testid={`badge-rep-status-${rep.id}`}
                              >
                                {rep.active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditRep(rep)}
                                  data-testid={`button-edit-rep-${rep.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this representative?")) {
                                      deleteRepMutation.mutate(rep.id);
                                    }
                                  }}
                                  disabled={deleteRepMutation.isPending}
                                  data-testid={`button-delete-rep-${rep.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {repData?.representatives?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No representatives found
                      </div>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {repData && repData.total > repPagination.limit && (
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Showing {repPagination.offset + 1} to {Math.min(repPagination.offset + repPagination.limit, repData.total)} of {repData.total} representatives
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setRepPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                        disabled={repPagination.offset === 0}
                        data-testid="button-prev-page"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setRepPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                        disabled={repPagination.offset + repPagination.limit >= repData.total}
                        data-testid="button-next-page"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Zip Mappings Tab */}
              <TabsContent value="zip-mappings" className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <Input
                    placeholder="Search by zip code..."
                    value={zipSearch}
                    onChange={(e) => setZipSearch(e.target.value)}
                    className="max-w-sm"
                    data-testid="input-search-zip"
                  />
                  
                  <Dialog open={showZipDialog} onOpenChange={setShowZipDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => zipForm.reset()} data-testid="button-add-zip-mapping">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Zip Mapping
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Zip Code Mapping</DialogTitle>
                        <DialogDescription>
                          Create a new zip code to representative mapping
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...zipForm}>
                        <form onSubmit={zipForm.handleSubmit(handleZipSubmit)} className="space-y-4">
                          <FormField
                            control={zipForm.control}
                            name="zipCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Zip Code *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="12345" data-testid="input-zip-code" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={zipForm.control}
                            name="representativeId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Representative *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-zip-representative">
                                      <SelectValue placeholder="Select representative" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {repData?.representatives?.map((rep) => (
                                      <SelectItem key={rep.id} value={rep.id}>
                                        {rep.name} - {rep.officeTitle}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={zipForm.control}
                              name="officeLevel"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Office Level *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-zip-office-level">
                                        <SelectValue placeholder="Select level" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="federal">Federal</SelectItem>
                                      <SelectItem value="state">State</SelectItem>
                                      <SelectItem value="local">Local</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={zipForm.control}
                              name="priority"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Priority</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      value={field.value || ""}
                                      type="number" 
                                      min="1" 
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                      data-testid="input-zip-priority"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={zipForm.control}
                              name="district"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>District</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value || ""} data-testid="input-zip-district" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={zipForm.control}
                              name="jurisdiction"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Jurisdiction *</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value || ""} placeholder="e.g., California" data-testid="input-zip-jurisdiction" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setShowZipDialog(false)}
                              data-testid="button-cancel-zip"
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createZipMutation.isPending}
                              data-testid="button-save-zip"
                            >
                              {createZipMutation.isPending && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              )}
                              Create
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                {zipLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Zip Code</TableHead>
                          <TableHead>Representative</TableHead>
                          <TableHead>Office Level</TableHead>
                          <TableHead>District</TableHead>
                          <TableHead>Jurisdiction</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {zipMappings?.map((mapping) => (
                          <TableRow key={mapping.id} data-testid={`row-zip-mapping-${mapping.id}`}>
                            <TableCell className="font-medium" data-testid={`text-zip-code-${mapping.id}`}>
                              {mapping.zipCode}
                            </TableCell>
                            <TableCell data-testid={`text-zip-rep-${mapping.id}`}>
                              {(mapping as any).representativeName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" data-testid={`badge-zip-level-${mapping.id}`}>
                                {mapping.officeLevel}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-zip-district-${mapping.id}`}>
                              {mapping.district || "-"}
                            </TableCell>
                            <TableCell data-testid={`text-zip-jurisdiction-${mapping.id}`}>
                              {mapping.jurisdiction}
                            </TableCell>
                            <TableCell data-testid={`text-zip-priority-${mapping.id}`}>
                              {mapping.priority}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this zip mapping?")) {
                                    deleteZipMutation.mutate(mapping.id);
                                  }
                                }}
                                disabled={deleteZipMutation.isPending}
                                data-testid={`button-delete-zip-${mapping.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {zipMappings?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No zip mappings found
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Import/Export Tab */}
              <TabsContent value="import-export" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Export Data
                      </CardTitle>
                      <CardDescription>
                        Download representatives and zip mappings data
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button
                        onClick={() => exportRepsMutation.mutate()}
                        disabled={exportRepsMutation.isPending}
                        className="w-full"
                        data-testid="button-export-representatives"
                      >
                        {exportRepsMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Export Representatives
                      </Button>
                      
                      <Button
                        onClick={async () => {
                          try {
                            const response = await fetch("/api/admin/zip-mappings/export");
                            const data = await response.json();
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `zip-mappings-${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast({ title: "Zip mappings exported successfully" });
                          } catch (error) {
                            toast({ title: "Export failed", variant: "destructive" });
                          }
                        }}
                        variant="outline"
                        className="w-full"
                        data-testid="button-export-zip-mappings"
                      >
                        Export Zip Mappings
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Import Data
                      </CardTitle>
                      <CardDescription>
                        Upload JSON files to import representatives data
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="import-reps">Import Representatives</Label>
                        <Input
                          id="import-reps"
                          type="file"
                          accept=".json"
                          onChange={handleImportFile}
                          className="mt-2"
                          data-testid="input-import-representatives"
                        />
                      </div>

                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Import files should be valid JSON arrays containing representative objects with all required fields.
                        </AlertDescription>
                      </Alert>

                      {importRepsMutation.isSuccess && importRepsMutation.data && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Import completed: {importRepsMutation.data.imported} imported, {importRepsMutation.data.errors.length} errors
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Audit Tab */}
              <TabsContent value="audit" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Audit Logs
                    </CardTitle>
                    <CardDescription>
                      View administrative actions and changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      Audit log functionality will be implemented in the next phase
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}