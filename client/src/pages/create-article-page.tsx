import { useState } from "react";
import { useLocation } from "wouter";
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
import { ArrowLeft, FileText, Image, Eye, Save, Send } from "lucide-react";
import type { User } from "@shared/schema";

const articleFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title must be less than 200 characters"),
  excerpt: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be less than 500 characters"),
  articleBody: z.string().min(50, "Article content must be at least 50 characters"),
  featuredImage: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  privacy: z.enum(["public", "friends"]),
  tags: z.string().optional(),
});

type ArticleFormData = z.infer<typeof articleFormSchema>;

export default function CreateArticlePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPreview, setIsPreview] = useState(false);
  const [articleContent, setArticleContent] = useState("");

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: "",
      excerpt: "",
      articleBody: "",
      featuredImage: "",
      privacy: "public",
      tags: "",
    },
  });

  const createArticleMutation = useMutation({
    mutationFn: async (data: ArticleFormData) => {
      const tagsArray = data.tags
        ? data.tags.split(",").map(tag => tag.trim().toLowerCase().replace(/^#/, "")).filter(Boolean)
        : [];

      const wordCount = data.articleBody.replace(/<[^>]*>/g, "").split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);

      const response = await apiRequest("POST", "/api/posts", {
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

  const onSubmit = (data: ArticleFormData) => {
    createArticleMutation.mutate(data);
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
              <FileText className="w-8 h-8" />
              Write Article
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Create a long-form article with rich formatting
            </p>
          </div>
          <div className="flex gap-2">
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
                        <Input 
                          placeholder="Enter your article title..." 
                          {...field}
                          data-testid="input-article-title"
                        />
                      </FormControl>
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
                        <Textarea 
                          placeholder="Write a brief description that will appear in the feed..."
                          rows={3}
                          {...field}
                          data-testid="input-article-excerpt"
                        />
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
                          <Input 
                            placeholder="politics, democracy, reform"
                            {...field}
                            data-testid="input-tags"
                          />
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
                <CardTitle>Article Content</CardTitle>
                <CardDescription>
                  Write your full article using the rich text editor. You can add headings, format text, include images, and more.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                disabled={createArticleMutation.isPending}
                data-testid="button-publish"
              >
                {createArticleMutation.isPending ? (
                  <>Publishing...</>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish Article
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
