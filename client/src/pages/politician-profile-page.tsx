import { useParams, Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { sanitizeUrl } from "@/lib/utils";
import { CheckCircle2, Globe, Mail, Phone, MapPin, Calendar, Award, AlertTriangle, Star, DollarSign, Building2, ExternalLink, Flag, TrendingUp, TrendingDown, Clock, ChevronDown, ChevronRight, ShieldAlert, Lock, PieChart as PieChartIcon, BarChart3, Wallet } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo, lazy, Suspense } from "react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { Post, PoliticianProfile, PoliticalPosition, PoliticianCorruptionRating, SpecialInterestGroup, PoliticianSigSponsorship, PoliticianDemerit } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

type PoliticianProfileWithPosition = PoliticianProfile & {
  position?: PoliticalPosition | null;
  targetPosition?: PoliticalPosition | null;
};

type SponsorWithSig = PoliticianSigSponsorship & {
  sig?: SpecialInterestGroup | null;
};

const claimFormSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

type ClaimFormData = z.infer<typeof claimFormSchema>;

const ratingFormSchema = z.object({
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  reasoning: z.string().optional(),
});

type RatingFormData = z.infer<typeof ratingFormSchema>;

type RatingStats = {
  averageGrade: string;
  gradeDistribution: Record<string, number>;
  totalRatings: number;
};

function formatTermDate(value: string | null | undefined): string {
  if (!value) return "";
  const num = Number(value);
  if (!isNaN(num) && num > 40000 && num < 80000) {
    const date = new Date((num - 25569) * 86400 * 1000);
    return format(date, "MMM d, yyyy");
  }
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return format(parsed, "MMM d, yyyy");
  return value;
}

export default function PoliticianProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimStep, setClaimStep] = useState<"ask-email" | "email-sent" | "manual">("ask-email");

  const { data: profile, isLoading: profileLoading } = useQuery<PoliticianProfileWithPosition>({
    queryKey: [`/api/politician-profiles/${id}`],
    enabled: !!id,
  });

  // Fetch posts where this politician is tagged
  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ['/api/feeds/all'],
  });

  // Fetch corruption rating stats
  const { data: ratingStats } = useQuery<RatingStats>({
    queryKey: [`/api/politician-profiles/${id}/rating/stats`],
    enabled: !!id,
  });

  // Fetch user's current rating (only if logged in)
  const { data: userRating } = useQuery<PoliticianCorruptionRating | null>({
    queryKey: [`/api/politician-profiles/${id}/rating/me`],
    enabled: !!id && !!user,
  });

  // Fetch campaign sponsors
  const { data: sponsors = [] } = useQuery<SponsorWithSig[]>({
    queryKey: [`/api/politician-profiles/${id}/sponsors`],
    enabled: !!id,
  });

  const form = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      email: "",
      phone: "",
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (data: ClaimFormData) => {
      return await apiRequest(`/api/politician-profiles/${id}/claim`, "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Claim Request Submitted",
        description: "Your page claim request has been submitted. An administrator will review it and contact you for verification.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/politician-profiles/${id}`] });
      setClaimDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Claim Request Failed",
        description: error.message || "Failed to submit claim request",
        variant: "destructive",
      });
    },
  });

  const onSubmitClaim = (data: ClaimFormData) => {
    claimMutation.mutate(data);
  };

  const claimByEmailMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/politician-profiles/${id}/claim-by-email`, "POST");
    },
    onSuccess: () => {
      setClaimStep("email-sent");
    },
    onError: (error: any) => {
      toast({
        title: "Email Send Failed",
        description: error.message || "Failed to send verification email",
        variant: "destructive",
      });
    },
  });

  const ratingMutation = useMutation({
    mutationFn: async (data: RatingFormData) => {
      return await apiRequest(`/api/politician-profiles/${id}/rate`, "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Rating Submitted",
        description: "Your corruption rating has been recorded. Thank you for your input!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/politician-profiles/${id}/rating/stats`] });
      queryClient.invalidateQueries({ queryKey: [`/api/politician-profiles/${id}/rating/me`] });
    },
    onError: (error: any) => {
      toast({
        title: "Rating Failed",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      });
    },
  });

  const onSubmitRating = (data: RatingFormData) => {
    ratingMutation.mutate(data);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-32">
          <p>Loading politician profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-32">
          <p>Politician profile not found</p>
        </div>
      </div>
    );
  }

  const getCorruptionGradeColor = (grade: string) => {
    const colors = {
      'A': 'bg-green-600 text-white',
      'B': 'bg-blue-500 text-white',
      'C': 'bg-yellow-400 text-yellow-900',
      'D': 'bg-orange-500 text-white',
      'F': 'bg-red-600 text-white',
    };
    return colors[grade as keyof typeof colors] || 'bg-slate-400 text-white';
  };

  // Filter posts where politician is tagged (by name OR @handle)
  const taggedPosts = posts.filter((post: Post) => 
    post.tags?.some(tag => {
      const t = tag.toLowerCase();
      if (profile.handle && t === `@${profile.handle.toLowerCase()}`) return true;
      return t.includes(profile.fullName?.toLowerCase() ?? "");
    })
  );

  const hasPendingClaim = profile.claimRequestStatus === 'pending';
  const hasRejectedClaim = profile.claimRequestStatus === 'rejected';
  const canClaim = !profile.isVerified && !hasPendingClaim;

  return (
    <div className="min-h-screen bg-background" data-testid="politician-profile-page">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-6 flex-1">
              {/* Profile Photo with Verified Badge */}
              <div className="relative flex flex-col items-center gap-1">
                {profile.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt={profile.fullName}
                    className={`w-32 h-32 rounded-lg object-cover transition-all duration-300 ${!profile.isVerified ? "grayscale" : ""}`}
                    data-testid="img-politician-photo"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">
                      {profile.fullName?.charAt(0)}
                    </span>
                  </div>
                )}
                {profile.isVerified ? (
                  <div className="absolute -top-2 -left-2" data-testid="badge-verified">
                    <CheckCircle2 className="w-8 h-8 text-green-500 bg-white dark:bg-gray-900 rounded-full" />
                  </div>
                ) : (
                  profile.photoUrl && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 text-center leading-tight mt-1">
                      Unclaimed profile
                    </span>
                  )
                )}
              </div>

              {/* Name and Position */}
              <div className="flex-1">
                <CardTitle className="text-3xl mb-1" data-testid="text-politician-name">
                  {profile.fullName}
                </CardTitle>
                {profile.handle && (
                  <p className="text-base font-medium text-blue-600 dark:text-blue-400 mb-1">
                    @{profile.handle}
                  </p>
                )}
                {profile.position && (
                  <CardDescription className="text-lg" data-testid="text-politician-position">
                    {profile.position.title}
                  </CardDescription>
                )}
                {profile.targetPosition && (
                  <CardDescription className="text-sm text-blue-600 dark:text-blue-400 mt-0.5 font-medium" data-testid="text-politician-target-position">
                    Running for: {profile.targetPosition.title}
                  </CardDescription>
                )}
                {profile.party && (
                  <Badge variant="outline" className="mt-2" data-testid="badge-party">
                    {profile.party}
                  </Badge>
                )}
                
                {/* Claim Page Button */}
              {canClaim && (
                <Dialog open={claimDialogOpen} onOpenChange={(open) => {
                  setClaimDialogOpen(open);
                  if (!open) { setClaimStep("ask-email"); form.reset(); }
                }}>
                  <DialogTrigger asChild>
                    <Button className="mt-4" variant="outline" data-testid="button-claim-page">
                      Claim This Page
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    {/* Step 1: offer email verification if profile has a public email */}
                    {claimStep === "ask-email" && profile?.email && (
                      <>
                        <DialogHeader>
                          <DialogTitle>Claim Your Profile Page</DialogTitle>
                          <DialogDescription>
                            We found a public contact email associated with this profile. The fastest way to verify is to send a confirmation link there.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Public contact email on file</p>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{profile.email}</p>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Can you receive emails at this address?
                          </p>
                        </div>
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setClaimStep("manual")}
                            className="sm:order-first"
                          >
                            No, use a different method
                          </Button>
                          <Button
                            onClick={() => claimByEmailMutation.mutate()}
                            disabled={claimByEmailMutation.isPending}
                            data-testid="button-send-claim-email"
                          >
                            {claimByEmailMutation.isPending ? "Sending..." : "Yes, send me a verification link"}
                          </Button>
                        </DialogFooter>
                      </>
                    )}

                    {/* Step 1 (no email): skip straight to manual */}
                    {claimStep === "ask-email" && !profile?.email && (
                      <>
                        <DialogHeader>
                          <DialogTitle>Claim Your Profile Page</DialogTitle>
                          <DialogDescription>
                            To claim this page, provide your office email and phone number. An admin will contact you to verify your identity.
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmitClaim)} className="space-y-4">
                            <FormField control={form.control} name="email" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Office Email Address</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="your.name@office.gov" {...field} data-testid="input-claim-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="phone" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input type="tel" placeholder="(555) 123-4567" {...field} data-testid="input-claim-phone" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <DialogFooter>
                              <Button type="submit" disabled={claimMutation.isPending} data-testid="button-submit-claim">
                                {claimMutation.isPending ? "Submitting..." : "Submit Claim Request"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </>
                    )}

                    {/* Step 2: email sent confirmation */}
                    {claimStep === "email-sent" && (
                      <>
                        <DialogHeader>
                          <DialogTitle>Check your inbox</DialogTitle>
                          <DialogDescription>
                            A verification link has been sent to:
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <div className="rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 px-4 py-3">
                            <p className="font-medium text-green-800 dark:text-green-300">{profile?.email}</p>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Click the link in that email within 72 hours to verify your identity and activate your profile page. If you don't see it, check your spam folder.
                          </p>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => setClaimDialogOpen(false)}>Done</Button>
                        </DialogFooter>
                      </>
                    )}

                    {/* Manual fallback: form submission to admin queue */}
                    {claimStep === "manual" && (
                      <>
                        <DialogHeader>
                          <DialogTitle>Claim Your Profile Page</DialogTitle>
                          <DialogDescription>
                            Provide your office email and phone number. An administrator will review your request and contact you to verify your identity.
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmitClaim)} className="space-y-4">
                            <FormField control={form.control} name="email" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Office Email Address</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="your.name@office.gov" {...field} data-testid="input-claim-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="phone" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input type="tel" placeholder="(555) 123-4567" {...field} data-testid="input-claim-phone" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <DialogFooter className="flex-col sm:flex-row gap-2">
                              <Button variant="outline" type="button" onClick={() => setClaimStep("ask-email")} className="sm:order-first">
                                Back
                              </Button>
                              <Button type="submit" disabled={claimMutation.isPending} data-testid="button-submit-claim">
                                {claimMutation.isPending ? "Submitting..." : "Submit Claim Request"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              )}

              {hasPendingClaim && (
                <div className="mt-4 flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm">Claim request pending admin approval</span>
                </div>
              )}

              {hasRejectedClaim && (
                <div className="mt-4 flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm">Previous claim request was rejected</span>
                </div>
              )}
              </div>
            </div>

            {/* Corruption Grades Display - Compact Top Right */}
            <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 w-48 flex-shrink-0">
              <div className="space-y-3">
                {/* Admin Grade */}
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Admin</p>
                  {profile.corruptionGrade ? (
                    <>
                    <div 
                      className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl font-bold ${getCorruptionGradeColor(profile.corruptionGrade)}`}
                      data-testid="badge-admin-grade"
                    >
                      {profile.corruptionGrade}
                    </div>
                    {(profile as any).numericScore != null && (
                      <p className="text-xs text-gray-500 mt-1">{Math.round((profile as any).numericScore)}/100</p>
                    )}
                    </>
                  ) : (
                    <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-400">
                      N/A
                    </div>
                  )}
                </div>

                {/* Community Grade */}
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Community</p>
                  {ratingStats && ratingStats.totalRatings > 0 ? (
                    <>
                      <div 
                        className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl font-bold ${getCorruptionGradeColor(ratingStats.averageGrade)}`}
                        data-testid="badge-community-grade"
                      >
                        {ratingStats.averageGrade}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {ratingStats.totalRatings} {ratingStats.totalRatings === 1 ? 'vote' : 'votes'}
                      </p>
                    </>
                  ) : (
                    <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-400">
                      N/A
                    </div>
                  )}
                </div>

                {/* Rating Buttons */}
                <div className="text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rate:</p>
                  <div className="flex gap-1 justify-center">
                    {['A', 'B', 'C', 'D', 'F'].map((grade) => (
                      <button
                        key={grade}
                        onClick={() => {
                          if (user) {
                            ratingMutation.mutate({ grade: grade as 'A' | 'B' | 'C' | 'D' | 'F', reasoning: userRating?.reasoning || undefined });
                          } else {
                            toast({
                              title: "Login Required",
                              description: "Please log in to rate this politician",
                              variant: "destructive",
                            });
                          }
                        }}
                        className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                          userRating?.grade === grade
                            ? `${getCorruptionGradeColor(grade)} scale-110`
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:scale-105'
                        }`}
                        data-testid={`button-rate-${grade}`}
                        disabled={ratingMutation.isPending}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── Two-column desktop layout ───────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── LEFT: Main tabbed content + news feed ─────────── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ── Tabbed Content ──────────────────────────────── */}
          <Tabs defaultValue="donors">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="donors">Donors</TabsTrigger>
              <TabsTrigger value="trading">Trading</TabsTrigger>
              <TabsTrigger value="endorsements">Endorsements</TabsTrigger>
              <TabsTrigger value="promises" disabled>Campaign Promises</TabsTrigger>
            </TabsList>

            {/* ── DONORS TAB ────────────────────────────────── */}
            <TabsContent value="donors">
              <DonorsTab profile={profile} sponsors={sponsors} />
            </TabsContent>

            {/* ── TRADING TAB ───────────────────────────────── */}
            <TabsContent value="trading">
              <TradingTab politicianId={id!} politicianName={profile.fullName} />
            </TabsContent>

            {/* ── ENDORSEMENTS TAB ──────────────────────────── */}
            <TabsContent value="endorsements">
              <EndorsementsTab profile={profile} sponsors={sponsors} />
            </TabsContent>

            {/* ── CAMPAIGN PROMISES TAB ─────────────────────── */}
            <TabsContent value="promises">
              <Card>
                <CardContent className="py-12 text-center">
                  <Lock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-lg font-medium text-slate-500 dark:text-slate-400">Coming Soon</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    Track campaign promises and accountability — launching soon.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* ── News Feed ─────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>News Feed</CardTitle>
              <CardDescription>
                Posts and discussions mentioning {profile.fullName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {postsLoading ? (
                <p>Loading posts...</p>
              ) : taggedPosts.length > 0 ? (
                <div className="space-y-4">
                  {taggedPosts.map((post: Post) => (
                    <div
                      key={post.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      data-testid={`post-${post.id}`}
                    >
                      <p className="text-sm mb-2">{post.content}</p>
                      {post.createdAt && (
                        <span className="text-xs text-gray-500">
                          {format(new Date(post.createdAt), "PPP")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500" data-testid="text-no-posts">
                  No posts found mentioning {profile.fullName}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: Sidebar — contact, bio, grades, scorecard ── */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4">

          {/* Contact & Term Info */}
          {(profile.email || profile.phone || profile.website || profile.officeAddress || profile.termStart) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Contact & Office</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {profile.email && (
                  <div className="flex items-center gap-2" data-testid="text-email">
                    <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <a href={`mailto:${profile.email}`} className="text-sm hover:underline truncate">
                      {profile.email}
                    </a>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2" data-testid="text-phone">
                    <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <a href={`tel:${profile.phone}`} className="text-sm hover:underline">
                      {profile.phone}
                    </a>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-2" data-testid="text-website">
                    <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <a href={sanitizeUrl(profile.website)} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline truncate">
                      {profile.website}
                    </a>
                  </div>
                )}
                {profile.officeAddress && (
                  <div className="flex items-center gap-2" data-testid="text-office-address">
                    <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm">{profile.officeAddress}</span>
                  </div>
                )}
                {profile.termStart && (
                  <div className="flex items-center gap-2" data-testid="text-term">
                    <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm">
                      Term: {formatTermDate(profile.termStart)} – {profile.termEnd ? formatTermDate(profile.termEnd) : "Present"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Biography */}
          {profile.biography && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Biography</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed" data-testid="text-biography">
                  {profile.biography}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Grade Explanation */}
          {(profile as any).gradeExplanation && (profile as any).numericScore != null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Grade Breakdown
                </CardTitle>
                <CardDescription className="text-xs">Score: {Math.round((profile as any).numericScore)}/100</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {(() => {
                  const expl = (profile as any).gradeExplanation as any;
                  const m = expl?.metrics ?? {};
                  const w = expl?.weights ?? {};
                  return (
                    <div className="space-y-1">
                      <p className="font-medium text-gray-700 dark:text-gray-300 text-xs">
                        Sources: {(expl?.sources ?? []).join(', ') || 'SIG data'}
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1">
                        {m.dataScore != null && <><span>Data Score:</span><span className="font-mono text-right">{m.dataScore.toFixed(1)}/100</span></>}
                        {m.pledgeScore != null && <><span>Pledge Score:</span><span className="font-mono text-right">{m.pledgeScore.toFixed(1)}/100</span></>}
                        {m.aceCount != null && <><span>ACE sponsors:</span><span className="font-mono text-right">{m.aceCount}</span></>}
                        {m.fec?.receipts != null && <><span>FEC receipts:</span><span className="font-mono text-right">${Math.round(m.fec.receipts).toLocaleString()}</span></>}
                        {m.fec?.committeeShare != null && <><span>PAC share:</span><span className="font-mono text-right">{(m.fec.committeeShare * 100).toFixed(1)}%</span></>}
                        {m.fec?.smallDollarShare != null && <><span>Small-dollar:</span><span className="font-mono text-right">{(m.fec.smallDollarShare * 100).toFixed(1)}%</span></>}
                        {m.fec?.individualShare != null && <><span>Individual:</span><span className="font-mono text-right">{(m.fec.individualShare * 100).toFixed(1)}%</span></>}
                      </div>
                      {w.dataScoreWeight != null && (
                        <p className="text-gray-500 pt-1">
                          Formula: {Math.round(w.dataScoreWeight * 100)}% Data + {Math.round(w.pledgeScoreWeight * 100)}% Pledge + {Math.round(w.communityAdjWeight * 100)}% Community
                        </p>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Corruption Scorecard */}
          {profile.corruptionScorecard && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Award className="w-4 h-4" />
                  Corruption Scorecard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none text-sm" data-testid="text-corruption-scorecard">
                  {profile.corruptionScorecard}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   DONORS TAB
   ════════════════════════════════════════════════════════════ */
function DonorsTab({ profile, sponsors }: { profile: PoliticianProfileWithPosition; sponsors: SponsorWithSig[] }) {
  const validSponsors = sponsors.filter(s => s.sig);
  const pledgedAgainst = validSponsors.filter(s => s.relationshipType === 'pledged_against');
  const donorSponsors = validSponsors.filter(s => s.relationshipType !== 'pledged_against');
  const totalLobbyAmount = validSponsors.reduce((sum, s) => sum + (s.reportedAmount ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Campaign Sponsors & Special Interests
        </CardTitle>
        <CardDescription>
          Organizations and groups linked to {profile.fullName}'s campaigns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {(() => {
          const bpTotal = profile.totalContributions != null && Number(profile.totalContributions) > 0
            ? Number(profile.totalContributions) : 0;
          const sigTotal = totalLobbyAmount > 0 ? Math.round(totalLobbyAmount / 100) : 0;
          const grandTotal = bpTotal + sigTotal;
          if (grandTotal === 0) return null;
          const hasBoth = bpTotal > 0 && sigTotal > 0;
          const hasBpOnly = bpTotal > 0 && sigTotal === 0;
          return (
            <div className="rounded-lg border-2 border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500 dark:text-red-400 mb-1">
                Grand Total Contributions
              </p>
              <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                ${grandTotal.toLocaleString()}
              </p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {hasBoth
                  ? `BallotPedia career total ($${bpTotal.toLocaleString()}) + linked SuperPACs / SIGs ($${sigTotal.toLocaleString()})`
                  : hasBpOnly
                    ? "Career total raised, sourced from BallotPedia / FEC data"
                    : "Sum of linked SuperPACs and special interest groups (BallotPedia data not yet available)"}
              </p>
            </div>
          );
        })()}

        {pledgedAgainst.map(sponsor => (
          <div key={sponsor.id} className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40 px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">
                Pledged Against {sponsor.sig?.acronym ?? sponsor.sig?.name}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                {profile.fullName} has publicly rejected funding from {sponsor.sig?.name ?? sponsor.sig?.acronym}.
              </p>
              {sponsor.disclosureUrl && (
                <a href={sanitizeUrl(sponsor.disclosureUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline mt-1">
                  <ExternalLink className="w-3 h-3" />
                  Source: {sponsor.disclosureSource ?? 'Disclosure'}
                </a>
              )}
            </div>
          </div>
        ))}

        {donorSponsors.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Linked Special Interest Groups</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {donorSponsors.map(sponsor => {
                const sigTag = (sponsor.sig as any)?.tag || sponsor.sig?.acronym || encodeURIComponent(sponsor.sig?.name || "");
                return (
                  <Link key={sponsor.id} href={`/sigs/${sigTag}`}>
                    <Badge className={sponsor.sig?.industry === 'foreign policy' ? 'bg-orange-500 text-white border-orange-600 font-semibold hover:bg-orange-600 cursor-pointer' : 'bg-slate-500 text-white border-slate-600 hover:bg-slate-600 cursor-pointer'}>
                      {sponsor.sig?.acronym ?? sponsor.sig?.name}
                    </Badge>
                  </Link>
                );
              })}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {donorSponsors.map((sponsor) => (
                <div key={sponsor.id} className="border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" data-testid={`sponsor-${sponsor.id}`}>
                  <div className="flex items-start gap-3">
                    {sponsor.sig?.logoUrl ? (
                      <img src={sponsor.sig.logoUrl} alt={sponsor.sig?.name ?? "Organization"} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium truncate">{sponsor.sig?.name ?? "Unknown Organization"}</h4>
                        {sponsor.sig?.acronym && sponsor.sig.acronym !== sponsor.sig.name && (
                          <span className="text-sm text-slate-500">({sponsor.sig.acronym})</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sponsor.sig?.industry && <Badge variant="outline" className="text-xs capitalize">{sponsor.sig.industry.replace(/_/g, " ")}</Badge>}
                        {sponsor.isVerified && <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">Verified</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {typeof sponsor.reportedAmount === 'number' && sponsor.reportedAmount > 0 && (
                          <span className="font-medium text-orange-600 dark:text-orange-400">${(sponsor.reportedAmount / 100).toLocaleString()}</span>
                        )}
                        {sponsor.contributionPeriod && <span>{sponsor.contributionPeriod}</span>}
                      </div>
                      {sponsor.disclosureUrl ? (
                        <a href={sanitizeUrl(sponsor.disclosureUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                          <ExternalLink className="w-3 h-3" />
                          {sponsor.disclosureSource ?? 'Source'}
                        </a>
                      ) : sponsor.sig?.website ? (
                        <a href={sanitizeUrl(sponsor.sig.website)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                          <ExternalLink className="w-3 h-3" />
                          Website
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {validSponsors.length === 0 && (
          <p className="text-sm text-slate-500 py-4 text-center">No donor or SuperPAC data on record for {profile.fullName}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════
   ENDORSEMENTS TAB
   ════════════════════════════════════════════════════════════ */
function EndorsementsTab({ profile, sponsors }: { profile: PoliticianProfileWithPosition; sponsors: SponsorWithSig[] }) {
  const endorsements = sponsors.filter(s => s.sig && (s.sig as any).isAce);
  const pledges = sponsors.filter(s => s.relationshipType === 'pledged_against');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Endorsements & Pledges
        </CardTitle>
        <CardDescription>
          Anti-corruption endorsements and pledges associated with {profile.fullName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pledges.map(sponsor => (
          <div key={sponsor.id} className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40 px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">Pledged Against {sponsor.sig?.acronym ?? sponsor.sig?.name}</p>
              <p className="text-sm text-green-700 dark:text-green-300">{profile.fullName} has publicly rejected funding from {sponsor.sig?.name ?? sponsor.sig?.acronym}.</p>
            </div>
          </div>
        ))}
        {endorsements.map(sponsor => (
          <div key={sponsor.id} className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 px-4 py-3">
            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-blue-800 dark:text-blue-200">{sponsor.sig?.name ?? sponsor.sig?.acronym}</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Anti-Corruption Endorsement (ACE)</p>
            </div>
          </div>
        ))}
        {pledges.length === 0 && endorsements.length === 0 && (
          <p className="text-sm text-slate-500 py-4 text-center">No endorsements or pledges on record for {profile.fullName}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════
   TRADING TAB
   ════════════════════════════════════════════════════════════ */
type QuiverTrade = {
  Ticker?: string;
  ticker?: string;
  Transaction?: string;
  transaction?: string;
  Amount?: string;
  amount?: string;
  Range?: string;
  TransactionDate?: string;
  transaction_date?: string;
  ReportDate?: string;
  report_date?: string;
  District?: string;
  Senator?: string;
  Representative?: string;
};

const SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology", MSFT: "Technology", GOOGL: "Technology", GOOG: "Technology", META: "Technology",
  AMZN: "Consumer", TSLA: "Automotive", NVDA: "Technology", AMD: "Technology", INTC: "Technology",
  JPM: "Finance", BAC: "Finance", GS: "Finance", MS: "Finance", C: "Finance", WFC: "Finance",
  JNJ: "Healthcare", PFE: "Healthcare", UNH: "Healthcare", ABBV: "Healthcare", MRK: "Healthcare",
  XOM: "Energy", CVX: "Energy", COP: "Energy", SLB: "Energy", OXY: "Energy",
  LMT: "Defense", RTX: "Defense", NOC: "Defense", BA: "Defense", GD: "Defense",
  DIS: "Media", NFLX: "Media", CMCSA: "Media",
};

const SECTOR_COLORS: Record<string, string> = {
  Technology: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40",
  Finance: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40",
  Healthcare: "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/40",
  Energy: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/40",
  Defense: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40",
  Media: "border-pink-200 bg-pink-50 dark:border-pink-800 dark:bg-pink-950/40",
  Automotive: "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/40",
  Consumer: "border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/40",
  Other: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50",
};

function getSector(ticker: string): string {
  return SECTOR_MAP[ticker.toUpperCase()] || "Other";
}

function getDaysToDisclose(txDate: string, reportDate: string): number | null {
  try {
    const tx = new Date(txDate);
    const rp = new Date(reportDate);
    if (isNaN(tx.getTime()) || isNaN(rp.getTime())) return null;
    return Math.round((rp.getTime() - tx.getTime()) / (1000 * 60 * 60 * 24));
  } catch { return null; }
}

const flagFormSchema = z.object({
  reason: z.string().min(10, "Please provide at least 10 characters explaining why this trade is suspicious"),
  evidenceUrl: z.string().url("Must be a valid URL").or(z.literal("")),
});
type FlagFormData = z.infer<typeof flagFormSchema>;

const SECTOR_CHART_COLORS: Record<string, string> = {
  Technology: "#3b82f6",
  Finance: "#10b981",
  Healthcare: "#8b5cf6",
  Energy: "#eab308",
  Defense: "#ef4444",
  Media: "#ec4899",
  Automotive: "#f97316",
  Consumer: "#14b8a6",
  Other: "#94a3b8",
};

function parseAmount(trade: QuiverTrade): number {
  const raw = trade.Amount || trade.amount;
  if (!raw) return 0;
  const n = parseFloat(String(raw).replace(/[,$]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseRange(range: string): { low: number; high: number } {
  if (!range) return { low: 0, high: 0 };
  const cleaned = range.replace(/\$/g, "").replace(/,/g, "");
  const parts = cleaned.split("-").map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { low: parts[0], high: parts[1] };
  }
  const single = parseFloat(cleaned);
  return { low: isNaN(single) ? 0 : single, high: isNaN(single) ? 0 : single };
}

function formatDollar(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function TradingTab({ politicianId, politicianName }: { politicianId: string; politicianName: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());
  const [showFlagDialog, setShowFlagDialog] = useState(false);

  const { data: trades = [], isLoading, isError } = useQuery<QuiverTrade[]>({
    queryKey: ['/api/politician-profiles', politicianId, 'trades'],
    queryFn: async () => {
      const res = await fetch(`/api/politician-profiles/${politicianId}/trades`);
      if (!res.ok) throw new Error("Failed to fetch trades");
      return res.json();
    },
  });

  const { data: demerits = [] } = useQuery<PoliticianDemerit[]>({
    queryKey: ['/api/politician-profiles', politicianId, 'demerits'],
    queryFn: async () => {
      const res = await fetch(`/api/politician-profiles/${politicianId}/demerits`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const flagForm = useForm<FlagFormData>({
    resolver: zodResolver(flagFormSchema),
    defaultValues: { reason: "", evidenceUrl: "" },
  });

  const flagMutation = useMutation({
    mutationFn: async (data: FlagFormData) => {
      return apiRequest(`/api/politician-profiles/${politicianId}/trades/flag`, "POST", {
        tradeId: `profile_flag_${Date.now()}`,
        ticker: "PROFILE",
        transactionDate: new Date().toISOString().split("T")[0],
        tradeType: "Profile Flag",
        amount: null,
        reason: data.reason,
        evidenceUrl: data.evidenceUrl || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Profile Flagged", description: "Thank you — this politician's trading activity has been flagged for review." });
      setShowFlagDialog(false);
      flagForm.reset();
    },
    onError: (err: any) => {
      toast({ title: "Flag Failed", description: err.message || "Could not submit flag", variant: "destructive" });
    },
  });

  const grouped = useMemo(() => {
    const map: Record<string, QuiverTrade[]> = {};
    trades.forEach(t => {
      const ticker = t.Ticker || t.ticker || "UNKNOWN";
      const sector = getSector(ticker);
      if (!map[sector]) map[sector] = [];
      map[sector].push(t);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [trades]);

  const analytics = useMemo(() => {
    if (trades.length === 0) return null;

    let totalBuyLow = 0, totalBuyHigh = 0, totalSellLow = 0, totalSellHigh = 0;
    const sectorAmounts: Record<string, { low: number; high: number }> = {};
    const timelineMap: Record<string, { buys: number; sells: number; net: number }> = {};
    let lateTrades = 0;

    const sortedTrades = [...trades].sort((a, b) => {
      const dA = a.TransactionDate || a.transaction_date || "";
      const dB = b.TransactionDate || b.transaction_date || "";
      return dA.localeCompare(dB);
    });

    sortedTrades.forEach(t => {
      const txType = (t.Transaction || t.transaction || "").toLowerCase();
      const range = t.Range || "";
      const { low, high } = parseRange(range);
      const midpoint = (low + high) / 2;
      const isBuy = txType.includes("purchase") || txType.includes("exchange");
      const sector = getSector(t.Ticker || t.ticker || "");
      const txDate = t.TransactionDate || t.transaction_date || "";
      const reportDate = t.ReportDate || t.report_date || "";
      const days = txDate && reportDate ? getDaysToDisclose(txDate, reportDate) : null;
      if (days != null && days > 45) lateTrades++;

      if (isBuy) {
        totalBuyLow += low;
        totalBuyHigh += high;
      } else {
        totalSellLow += low;
        totalSellHigh += high;
      }

      if (!sectorAmounts[sector]) sectorAmounts[sector] = { low: 0, high: 0 };
      sectorAmounts[sector].low += low;
      sectorAmounts[sector].high += high;

      const month = txDate.slice(0, 7);
      if (month) {
        if (!timelineMap[month]) timelineMap[month] = { buys: 0, sells: 0, net: 0 };
        if (isBuy) {
          timelineMap[month].buys += midpoint;
        } else {
          timelineMap[month].sells += midpoint;
        }
        timelineMap[month].net = timelineMap[month].buys - timelineMap[month].sells;
      }
    });

    const sectorData = Object.entries(sectorAmounts)
      .map(([name, { low, high }]) => ({
        name,
        value: Math.round((low + high) / 2),
        low,
        high,
        color: SECTOR_CHART_COLORS[name] || SECTOR_CHART_COLORS.Other,
      }))
      .sort((a, b) => b.value - a.value);

    const timelineData = Object.entries(timelineMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce((acc, [month, data]) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
        acc.push({
          month,
          label: month,
          buys: Math.round(data.buys),
          sells: Math.round(data.sells),
          net: Math.round(data.net),
          cumulative: Math.round(prev + data.net),
        });
        return acc;
      }, [] as { month: string; label: string; buys: number; sells: number; net: number; cumulative: number }[]);

    const netLow = totalBuyLow - totalSellLow;
    const netHigh = totalBuyHigh - totalSellHigh;

    return {
      totalBuyLow, totalBuyHigh, totalSellLow, totalSellHigh,
      netLow, netHigh,
      sectorData, timelineData, lateTrades,
    };
  }, [trades]);

  const toggleSector = (sector: string) => {
    setExpandedSectors(prev => {
      const next = new Set(prev);
      next.has(sector) ? next.delete(sector) : next.add(sector);
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto text-yellow-500 mb-3" />
          <p className="text-lg font-medium">Trade data temporarily unavailable</p>
          <a href="https://efts.sec.gov/LATEST/search-index?q=%22congressional%20trading%22" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-2 inline-flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> View official disclosure source
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Stock Trades & Financial Activity
              </CardTitle>
              <CardDescription>
                Congressional trading disclosures for {politicianName}
              </CardDescription>
            </div>
            {trades.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/40"
                onClick={() => {
                  if (!user) {
                    toast({ title: "Login Required", description: "Please log in to flag trading activity", variant: "destructive" });
                    return;
                  }
                  setShowFlagDialog(true);
                }}
              >
                <Flag className="w-4 h-4 mr-1.5" />
                Flag Insider Trading
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {demerits.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {demerits.map(d => (
                <Badge key={d.id} className="bg-red-600 text-white border-red-700">
                  <ShieldAlert className="w-3 h-3 mr-1" />
                  {d.label}
                </Badge>
              ))}
            </div>
          )}

          {trades.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <TrendingUp className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500">No stock trades found</p>
              <p className="text-xs text-slate-400">Trade data is sourced from congressional disclosure reports. This politician may not have any reported trades, or historical data may be temporarily unavailable.</p>
            </div>
          ) : analytics && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 p-3 text-center">
                  <TrendingUp className="w-5 h-5 mx-auto text-green-600 mb-1" />
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">Total Buys</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatDollar((analytics.totalBuyLow + analytics.totalBuyHigh) / 2)}</p>
                  <p className="text-[10px] text-green-600/70 dark:text-green-400/60">{formatDollar(analytics.totalBuyLow)} – {formatDollar(analytics.totalBuyHigh)}</p>
                </div>
                <div className="rounded-lg border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 p-3 text-center">
                  <TrendingDown className="w-5 h-5 mx-auto text-red-600 mb-1" />
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">Total Sales</p>
                  <p className="text-lg font-bold text-red-700 dark:text-red-300">{formatDollar((analytics.totalSellLow + analytics.totalSellHigh) / 2)}</p>
                  <p className="text-[10px] text-red-600/70 dark:text-red-400/60">{formatDollar(analytics.totalSellLow)} – {formatDollar(analytics.totalSellHigh)}</p>
                </div>
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-3 text-center">
                  <Wallet className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Est. Net Position</p>
                  <p className={`text-lg font-bold ${(analytics.netLow + analytics.netHigh) / 2 >= 0 ? "text-blue-700 dark:text-blue-300" : "text-orange-700 dark:text-orange-300"}`}>{formatDollar(Math.abs((analytics.netLow + analytics.netHigh) / 2))}</p>
                  <p className="text-[10px] text-blue-600/70 dark:text-blue-400/60">{formatDollar(Math.abs(analytics.netLow))} – {formatDollar(Math.abs(analytics.netHigh))}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 p-3 text-center">
                  <BarChart3 className="w-5 h-5 mx-auto text-slate-600 dark:text-slate-400 mb-1" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total Trades</p>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{trades.length}</p>
                  {analytics.lateTrades > 0 && (
                    <p className="text-[10px] text-red-500">{analytics.lateTrades} late disclosure{analytics.lateTrades !== 1 ? "s" : ""}</p>
                  )}
                </div>
              </div>

              {analytics.timelineData.length > 1 && (
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Trading Activity Over Time
                  </h4>
                  <div className="h-48">
                    <TradingTimelineChart data={analytics.timelineData} />
                  </div>
                </div>
              )}

              {analytics.sectorData.length > 1 && (
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4" />
                    Portfolio Allocation by Sector
                  </h4>
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="w-48 h-48">
                      <SectorPieChart data={analytics.sectorData} />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {analytics.sectorData.map(s => {
                        const total = analytics.sectorData.reduce((sum, d) => sum + d.value, 0);
                        const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : "0";
                        return (
                          <div key={s.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                              <span className="text-slate-700 dark:text-slate-300">{s.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500 text-xs">{pct}%</span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">{formatDollar(s.value)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2">
                  {trades.length} trade{trades.length !== 1 ? "s" : ""} across {grouped.length} sector{grouped.length !== 1 ? "s" : ""}
                </h4>
                <div className="space-y-2">
                  {grouped.map(([sector, sectorTrades]) => {
                    const isOpen = expandedSectors.has(sector);
                    const colorClass = SECTOR_COLORS[sector] || SECTOR_COLORS.Other;
                    const sectorTotal = sectorTrades.reduce((sum, t) => sum + parseAmount(t), 0);
                    return (
                      <div key={sector} className={`rounded-lg border ${colorClass} overflow-hidden`}>
                        <button onClick={() => toggleSector(sector)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:opacity-80 transition-opacity">
                          <div className="flex items-center gap-2">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span className="font-semibold text-sm">{sector}</span>
                            <Badge variant="outline" className="text-xs">{sectorTrades.length} trade{sectorTrades.length !== 1 ? "s" : ""}</Badge>
                          </div>
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{formatDollar(sectorTotal)}</span>
                        </button>
                        {isOpen && (
                          <div className="border-t px-4 py-2 space-y-2">
                            {sectorTrades.map((trade, idx) => {
                              const ticker = trade.Ticker || trade.ticker || "—";
                              const txType = trade.Transaction || trade.transaction || "—";
                              const range = trade.Range || "";
                              const txDate = trade.TransactionDate || trade.transaction_date || "";
                              const reportDate = trade.ReportDate || trade.report_date || "";
                              const daysToDisclose = txDate && reportDate ? getDaysToDisclose(txDate, reportDate) : null;
                              const isLate = daysToDisclose != null && daysToDisclose > 45;
                              const isBuy = txType.toLowerCase().includes("purchase");

                              return (
                                <div key={idx} className="flex items-center justify-between gap-3 py-2 border-b last:border-0 border-slate-200 dark:border-slate-700">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold shrink-0 ${isBuy ? "bg-green-500" : "bg-red-500"}`}>
                                      {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono font-bold text-sm">{ticker}</span>
                                        <span className="text-xs text-slate-500 capitalize">{txType}</span>
                                        {isLate && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-[10px]">Late Disclosure</Badge>}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                        <span className="font-medium">{range || "—"}</span>
                                        {txDate && <span>· {txDate}</span>}
                                        {daysToDisclose != null && (
                                          <span className="flex items-center gap-0.5">
                                            <Clock className="w-3 h-3" />{daysToDisclose}d to disclose
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showFlagDialog} onOpenChange={(open) => { if (!open) { setShowFlagDialog(false); flagForm.reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Flag className="w-5 h-5 text-red-500" /> Flag Insider Trading</DialogTitle>
            <DialogDescription>Report suspicious trading activity by {politicianName} for review by our team.</DialogDescription>
          </DialogHeader>
          <Form {...flagForm}>
            <form onSubmit={flagForm.handleSubmit((data) => flagMutation.mutate(data))} className="space-y-4">
              <FormField control={flagForm.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Why do you think this trading activity is suspicious? *</FormLabel>
                  <FormControl><Textarea placeholder="Describe what makes this politician's trading activity suspicious..." rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={flagForm.control} name="evidenceUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to supporting evidence (optional)</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowFlagDialog(false); flagForm.reset(); }}>Cancel</Button>
                <Button type="submit" disabled={flagMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white">
                  {flagMutation.isPending ? "Submitting..." : "Submit Flag"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectorPieChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Pie>
        <RechartsTooltip formatter={(value: number) => formatDollar(value)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function TradingTimelineChart({ data }: { data: { month: string; label: string; buys: number; sells: number; cumulative: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickFormatter={(v: string) => { const parts = v.split("-"); return parts.length === 2 ? `${parts[1]}/${parts[0].slice(2)}` : v; }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatDollar(v)} width={55} />
        <RechartsTooltip formatter={(value: number, name: string) => [formatDollar(value), name === "buys" ? "Purchases" : "Sales"]} labelFormatter={(l: string) => `Month: ${l}`} />
        <Bar dataKey="buys" fill="#22c55e" name="Purchases" radius={[2, 2, 0, 0]} />
        <Bar dataKey="sells" fill="#ef4444" name="Sales" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
