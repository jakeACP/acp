import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, FileText, Image, Eye, Save, Send, Pencil, Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { User, Post } from "@shared/schema";

const ARTICLE_TYPES = [
  { value: "current-events", label: "Current Events" },
  { value: "politicians", label: "Politicians" },
  { value: "proposals", label: "Proposals" },
  { value: "issues", label: "Issues" },
  { value: "donors", label: "Donors" },
  { value: "propaganda", label: "Propaganda" },
  { value: "conspiracies", label: "Conspiracies" },
  { value: "legal-cases", label: "Legal Cases" },
  { value: "leaks", label: "Leaks" },
] as const;

const articleFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title must be less than 200 characters"),
  excerpt: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be less than 500 characters"),
  articleBody: z.string().min(50, "Article content must be at least 50 characters"),
  featuredImage: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  privacy: z.enum(["public", "friends"]),
  articleType: z.enum(["current-events", "politicians", "proposals", "issues", "donors", "propaganda", "conspiracies", "legal-cases", "leaks"]),
  tags: z.string().optional(),
});

type ArticleFormData = z.infer<typeof articleFormSchema>;

type PostWithAuthor = Post & { author?: User };

export default function CreateArticlePage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/write/:id");
  const articleId = params?.id;
  const isEditMode = !!articleId;
  
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPreview, setIsPreview] = useState(false);
  const [articleContent, setArticleContent] = useState("");
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [suggestedImages, setSuggestedImages] = useState<string[]>([]);

  const { data: existingArticle, isLoading: isLoadingArticle } = useQuery<PostWithAuthor>({
    queryKey: ["/api/posts", articleId],
    enabled: isEditMode,
  });

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: "",
      excerpt: "",
      articleBody: "",
      featuredImage: "",
      privacy: "public",
      articleType: "current-events",
      tags: "",
    },
  });

  useEffect(() => {
    if (existingArticle && isEditMode) {
      const existingType = existingArticle.tags?.find(tag => 
        ARTICLE_TYPES.some(t => t.value === tag)
      ) as ArticleFormData["articleType"] | undefined;
      
      form.reset({
        title: existingArticle.title || "",
        excerpt: existingArticle.excerpt || "",
        articleBody: existingArticle.articleBody || "",
        featuredImage: existingArticle.featuredImage || "",
        privacy: (existingArticle.privacy as "public" | "friends") || "public",
        articleType: existingType || "current-events",
        tags: existingArticle.tags?.filter(tag => !ARTICLE_TYPES.some(t => t.value === tag)).join(", ") || "",
      });
      setArticleContent(existingArticle.articleBody || "");
    }
  }, [existingArticle, isEditMode, form]);

  const createArticleMutation = useMutation({
    mutationFn: async (data: ArticleFormData) => {
      const userTags = data.tags
        ? data.tags.split(",").map(tag => tag.trim().toLowerCase().replace(/^#/, "")).filter(Boolean)
        : [];
      const tagsArray = [data.articleType, ...userTags];

      const wordCount = data.articleBody.replace(/<[^>]*>/g, "").split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);

      const response = await apiRequest("/api/posts", "POST", {
        type: "blog",
        title: data.title,
        content: data.excerpt,
        excerpt: data.excerpt,
        articleBody: data.articleBody,
        featuredImage: data.featuredImage || null,
        privacy: data.privacy,
        tags: tagsArray,
        readingTime,
      });
      return response.json();
    },
    onSuccess: (newPost) => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({
        title: "Article Published",
        description: "Your article has been published successfully!",
      });
      navigate(`/article/${newPost.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to publish article",
        variant: "destructive",
      });
    },
  });

  const generateWithAiMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("/api/articles/generate", "POST", { title });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in to use AI generation");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to generate article");
      }
      return response.json();
    },
    onSuccess: (data) => {
      form.setValue("articleBody", data.articleBody);
      setArticleContent(data.articleBody);
      setIsAiDialogOpen(false);
      toast({
        title: "Content Generated",
        description: "AI has generated the article content based on your title. Review and edit as needed.",
      });
    },
    onError: (error: Error) => {
      setIsAiDialogOpen(false);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateArticleMutation = useMutation({
    mutationFn: async (data: ArticleFormData) => {
      const userTags = data.tags
        ? data.tags.split(",").map(tag => tag.trim().toLowerCase().replace(/^#/, "")).filter(Boolean)
        : [];
      const tagsArray = [data.articleType, ...userTags];

      const wordCount = data.articleBody.replace(/<[^>]*>/g, "").split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);

      const response = await apiRequest(`/api/posts/${articleId}`, "PATCH", {
        title: data.title,
        content: data.excerpt,
        excerpt: data.excerpt,
        articleBody: data.articleBody,
        featuredImage: data.featuredImage || null,
        privacy: data.privacy,
        tags: tagsArray,
        readingTime,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", articleId] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({
        title: "Article Updated",
        description: "Your article has been updated successfully!",
      });
      navigate(`/article/${articleId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update article",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ArticleFormData) => {
    if (isEditMode) {
      updateArticleMutation.mutate(data);
    } else {
      createArticleMutation.mutate(data);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600">Please log in to write an article.</p>
            <Button className="mt-4" onClick={() => navigate("/auth")}>
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditMode && isLoadingArticle) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600">Loading article...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditMode && existingArticle && existingArticle.authorId !== user.id) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600">You can only edit your own articles.</p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Back to Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {isEditMode ? <Pencil className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
              {isEditMode ? "Edit Article" : "Write Article"}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {isEditMode ? "Update your published article" : "Create a long-form article with rich formatting"}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 hover:from-purple-600 hover:to-blue-600"
                  disabled={!form.watch("title")?.trim()}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Content
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                {generateWithAiMutation.isPending ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
                      <Sparkles className="w-8 h-8 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-xl font-semibold text-purple-700 dark:text-purple-300">
                        AI is writing your article...
                      </p>
                      <p className="text-sm text-slate-500 px-4">
                        Creating content for: "{form.watch("title")}"
                      </p>
                      <p className="text-xs text-slate-400">
                        This typically takes 15-30 seconds
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        Generate Article Content
                      </DialogTitle>
                      <DialogDescription>
                        AI will generate the article body content based on your title using the configured AI parameters.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 border">
                        <p className="text-xs text-slate-500 uppercase font-medium mb-1">Article Title</p>
                        <p className="text-lg font-semibold">{form.watch("title") || "No title entered"}</p>
                      </div>
                      <p className="text-sm text-slate-500 mt-3">
                        The AI will write content for this title using the global AI Article Parameters configured in the admin panel.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAiDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => generateWithAiMutation.mutate(form.watch("title"))}
                        disabled={!form.watch("title")?.trim()}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Content
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={() => setIsPreview(!isPreview)}
              data-testid="button-toggle-preview"
            >
              <Eye className="w-4 h-4 mr-2" />
              {isPreview ? "Edit" : "Preview"}
            </Button>
          </div>
        </div>
      </div>

      {isPreview ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{form.watch("title") || "Untitled Article"}</CardTitle>
            <CardDescription>{form.watch("excerpt") || "No description provided"}</CardDescription>
            {form.watch("featuredImage") && (
              <img 
                src={form.watch("featuredImage")} 
                alt="Featured" 
                className="w-full h-64 object-cover rounded-lg mt-4"
              />
            )}
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: articleContent || "<p>Start writing your article...</p>" }}
            />
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Article Details</CardTitle>
                <CardDescription>
                  The title and description will be shown in the feed. Readers click to see the full article.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="Enter your article title..." 
                            {...field}
                            data-testid="input-article-title"
                            disabled={generateWithAiMutation.isPending}
                            className={generateWithAiMutation.isPending ? "pr-10" : ""}
                          />
                          {generateWithAiMutation.isPending && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="articleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Article Type</FormLabel>
                      <div className="relative">
                        <Select onValueChange={field.onChange} value={field.value} disabled={generateWithAiMutation.isPending}>
                          <FormControl>
                            <SelectTrigger data-testid="select-article-type">
                              <SelectValue placeholder="Select article type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ARTICLE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {generateWithAiMutation.isPending && (
                          <div className="absolute right-10 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                          </div>
                        )}
                      </div>
                      <FormDescription>
                        Choose the category that best fits your article
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea 
                            placeholder="Write a brief description that will appear in the feed..."
                            rows={3}
                            {...field}
                            data-testid="input-article-excerpt"
                            disabled={generateWithAiMutation.isPending}
                            className={generateWithAiMutation.isPending ? "pr-10" : ""}
                          />
                          {generateWithAiMutation.isPending && (
                            <div className="absolute right-3 top-3">
                              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        This appears in the feed. Keep it engaging to attract readers.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="featuredImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Featured Image URL (optional)</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="https://example.com/image.jpg"
                            {...field}
                            data-testid="input-featured-image"
                          />
                          <Button type="button" variant="outline" size="icon">
                            <Image className="w-4 h-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {suggestedImages.length > 0 && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Suggested Image Ideas:
                    </p>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      {suggestedImages.map((img, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-purple-500">•</span>
                          {img}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-slate-500 mt-2">
                      Search for these images online and paste the URL above.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="privacy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visibility</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-privacy">
                              <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="friends">Friends Only</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="politics, democracy, reform"
                              {...field}
                              data-testid="input-tags"
                              disabled={generateWithAiMutation.isPending}
                              className={generateWithAiMutation.isPending ? "pr-10" : ""}
                            />
                            {generateWithAiMutation.isPending && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>Comma-separated</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Article Content
                  {generateWithAiMutation.isPending && (
                    <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                  )}
                </CardTitle>
                <CardDescription>
                  Write your full article using the rich text editor. You can add headings, format text, include images, and more.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generateWithAiMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-dashed border-purple-200 dark:border-purple-800">
                    <div className="relative">
                      <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                      <Sparkles className="w-6 h-6 text-purple-400 absolute -top-1 -right-1 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-purple-700 dark:text-purple-300">
                        AI is writing your article...
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        This may take 15-30 seconds
                      </p>
                    </div>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="articleBody"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RichTextEditor
                            content={field.value}
                            onChange={(html) => {
                              field.onChange(html);
                              setArticleContent(html);
                            }}
                            placeholder="Start writing your article..."
                            minHeight="500px"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate("/")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createArticleMutation.isPending || updateArticleMutation.isPending}
                data-testid="button-publish"
              >
                {(createArticleMutation.isPending || updateArticleMutation.isPending) ? (
                  <>{isEditMode ? "Updating..." : "Publishing..."}</>
                ) : (
                  <>
                    {isEditMode ? <Save className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    {isEditMode ? "Update Article" : "Publish Article"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
