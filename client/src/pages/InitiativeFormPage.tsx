import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Eye, AlertCircle, Plus, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// Form validation schema
const initiativeFormSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters").max(200, "Title must be less than 200 characters"),
  summary: z.string().min(50, "Summary must be at least 50 characters").max(1000, "Summary must be less than 1000 characters"),
  fullTextMd: z.string().min(100, "Full text must be at least 100 characters"),
  jurisdictionId: z.string().min(1, "Please select a jurisdiction"),
  initiativeType: z.string().min(1, "Please select an initiative type"),
  tags: z.array(z.string()).default([])
});

type InitiativeFormData = z.infer<typeof initiativeFormSchema>;

interface Jurisdiction {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
}

export default function InitiativeFormPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/initiatives/edit/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [newTag, setNewTag] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const isEditMode = Boolean(match && params?.id);
  const initiativeId = params?.id;


  // Form setup
  const form = useForm<InitiativeFormData>({
    resolver: zodResolver(initiativeFormSchema),
    defaultValues: {
      title: "",
      summary: "",
      fullTextMd: "",
      jurisdictionId: "",
      initiativeType: "statute",
      tags: []
    }
  });

  // Fetch existing initiative for editing
  const { data: existingInitiative, isLoading: loadingInitiative } = useQuery<{
    id: string;
    title: string;
    summary: string;
    fullTextMd: string;
    jurisdictionId: string;
    initiativeType: string;
    tags: string[];
  }>({
    queryKey: ["/api/initiatives", initiativeId],
    enabled: isEditMode && Boolean(initiativeId)
  });

  // Fetch jurisdictions
  const { data: jurisdictions = [], isLoading: loadingJurisdictions } = useQuery({
    queryKey: ["/api/jurisdictions"],
    enabled: true
  });

  // Update form when existing initiative loads
  useEffect(() => {
    if (existingInitiative) {
      form.reset({
        title: existingInitiative.title,
        summary: existingInitiative.summary,
        fullTextMd: existingInitiative.fullTextMd,
        jurisdictionId: existingInitiative.jurisdictionId,
        initiativeType: existingInitiative.initiativeType || "statute",
        tags: existingInitiative.tags || []
      });
    }
  }, [existingInitiative, form]);

  // Create initiative mutation
  const createMutation = useMutation({
    mutationFn: async (data: InitiativeFormData) => {
      const response = await apiRequest("/api/initiatives", "POST", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Initiative created successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/initiatives"] });
      setLocation(`/initiatives/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create initiative",
        variant: "destructive"
      });
    }
  });

  // Update initiative mutation  
  const updateMutation = useMutation({
    mutationFn: async (data: InitiativeFormData) => {
      const response = await apiRequest(`/api/initiatives/${initiativeId}`, "PATCH", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success", 
        description: "Initiative updated successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/initiatives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/initiatives", initiativeId] });
      setLocation(`/initiatives/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update initiative",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data: InitiativeFormData) => {
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !form.getValues("tags").includes(newTag.trim())) {
      const currentTags = form.getValues("tags");
      form.setValue("tags", [...currentTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags");
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };


  if (isEditMode && loadingInitiative) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/initiatives")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Initiatives
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {isEditMode ? "Edit Initiative" : "Create New Initiative"}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {isEditMode ? "Update your citizen initiative" : "Draft your citizen initiative for ballot qualification"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              data-testid="button-preview"
            >
              <Eye className="w-4 h-4 mr-2" />
              {isPreviewMode ? "Edit" : "Preview"}
            </Button>
          </div>
        </div>

        {/* Alert for draft status */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-yellow-800 dark:text-yellow-300 font-medium mb-1">
                Draft Status
              </p>
              <p className="text-yellow-700 dark:text-yellow-400">
                Your initiative will be saved as a draft. You can continue editing until you're ready to submit it for review.
              </p>
            </div>
          </div>
        </div>

        {isPreviewMode ? (
          // Preview Mode
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{form.watch("title") || "Initiative Title"}</CardTitle>
              <CardDescription className="text-base">
                {form.watch("summary") || "Initiative summary will appear here..."}
              </CardDescription>
              <div className="flex gap-2 flex-wrap pt-2">
                {form.watch("tags")?.map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap">
                {form.watch("fullTextMd") || "Full initiative text will appear here..."}
              </div>
            </CardContent>
          </Card>
        ) : (
          // Edit Mode
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Enter the core details of your initiative
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initiative Title</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter a clear, descriptive title for your initiative"
                            {...field} 
                            data-testid="input-title"
                          />
                        </FormControl>
                        <FormDescription>
                          This will appear on the ballot. Keep it concise but descriptive.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="jurisdictionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jurisdiction</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-jurisdiction">
                                <SelectValue placeholder="Select a jurisdiction" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(jurisdictions as Jurisdiction[]).map((jurisdiction: Jurisdiction) => (
                                <SelectItem key={jurisdiction.id} value={jurisdiction.id}>
                                  {jurisdiction.name} ({jurisdiction.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose where this initiative will be proposed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="initiativeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initiative Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-type">
                                <SelectValue placeholder="Select initiative type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="statute">Statute</SelectItem>
                              <SelectItem value="constitutional_amendment">Constitutional Amendment</SelectItem>
                              <SelectItem value="advisory">Advisory</SelectItem>
                              <SelectItem value="bond">Bond Measure</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Type of ballot measure you want to propose
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Summary</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Provide a clear, concise summary of what your initiative will do"
                            rows={4}
                            {...field}
                            data-testid="textarea-summary"
                          />
                        </FormControl>
                        <FormDescription>
                          This summary will help voters understand your initiative at a glance
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Full Text</CardTitle>
                  <CardDescription>
                    Complete text of the proposed initiative
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="fullTextMd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initiative Text</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter the complete text of your initiative. You can use Markdown formatting."
                            rows={15}
                            className="font-mono text-sm"
                            {...field}
                            data-testid="textarea-fulltext"
                          />
                        </FormControl>
                        <FormDescription>
                          This is the legal text that will be implemented if your initiative passes. Be specific and clear.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                  <CardDescription>
                    Add tags to help categorize your initiative
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      data-testid="input-new-tag"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={addTag}
                      disabled={!newTag.trim()}
                      data-testid="button-add-tag"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {form.watch("tags").length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {form.watch("tags").map((tag) => (
                        <Badge key={tag} variant="outline" className="flex items-center gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-gray-500 hover:text-gray-700"
                            data-testid={`button-remove-tag-${tag}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setLocation("/initiatives")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save as Draft"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}