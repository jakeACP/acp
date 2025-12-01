import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";

const privacySettingsSchema = z.object({
  defaultPostPrivacy: z.enum(["public", "private"]),
  hideRealNameInSearch: z.boolean(),
  discoverableByPhone: z.boolean(),
  discoverableByEmail: z.boolean(),
  userHandle: z.string().optional(),
});

type PrivacySettingsData = z.infer<typeof privacySettingsSchema>;

export default function PrivacySettingsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: privacySettings } = useQuery({
    queryKey: ["/api/privacy-settings"],
    enabled: !!user?.id,
  });

  const form = useForm<PrivacySettingsData>({
    resolver: zodResolver(privacySettingsSchema),
    defaultValues: {
      defaultPostPrivacy: privacySettings?.defaultPostPrivacy || "public",
      hideRealNameInSearch: privacySettings?.hideRealNameInSearch ?? false,
      discoverableByPhone: privacySettings?.discoverableByPhone ?? true,
      discoverableByEmail: privacySettings?.discoverableByEmail ?? true,
      userHandle: privacySettings?.userHandle || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PrivacySettingsData) => {
      return apiRequest("/api/privacy-settings", "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your privacy settings have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/privacy-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: PrivacySettingsData) => {
    setIsSaving(true);
    try {
      await mutation.mutateAsync(data);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Privacy Settings</h1>
            <p className="text-muted-foreground mt-1">Control who can see your information and how your posts are shared</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Post Privacy */}
            <Card className="floating-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Post Privacy
                </CardTitle>
                <CardDescription>Control the default privacy setting for your posts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="defaultPostPrivacy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Post Audience</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex items-center gap-2">
                              <span>Public - Everyone can see your posts</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="private">
                            <div className="flex items-center gap-2">
                              <span>Private - Only your friends can see your posts</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This setting applies to new posts. You can change privacy for individual posts when posting.
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Name & Search Privacy */}
            <Card className="floating-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Name Privacy
                </CardTitle>
                <CardDescription>Control how your name appears in search results</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="hideRealNameInSearch"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-hide-real-name"
                        />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel className="font-medium cursor-pointer">Hide real name in search</FormLabel>
                        <FormDescription>
                          Your username will be displayed instead of your first and last name when people search for you
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userHandle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username/Handle</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., @yourhandle"
                          data-testid="input-user-handle"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A unique handle for your profile (displayed if hiding real name)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Friend Discovery */}
            <Card className="floating-card">
              <CardHeader>
                <CardTitle>Find My Friends</CardTitle>
                <CardDescription>Control how friends can discover you through contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="discoverableByPhone"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-discoverable-phone"
                        />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel className="font-medium cursor-pointer">Discoverable by phone number</FormLabel>
                        <FormDescription>
                          Allow people who have your phone number to find you on the platform
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discoverableByEmail"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-discoverable-email"
                        />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel className="font-medium cursor-pointer">Discoverable by email address</FormLabel>
                        <FormDescription>
                          Allow people who have your email address to find you on the platform
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isSaving || mutation.isPending}
                data-testid="button-save-privacy-settings"
              >
                {isSaving || mutation.isPending ? "Saving..." : "Save Privacy Settings"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/settings")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
