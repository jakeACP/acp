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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { sanitizeUrl } from "@/lib/utils";
import { CheckCircle2, Globe, Mail, Phone, MapPin, Calendar, Award, AlertTriangle, Star, DollarSign, Building2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import type { Post, PoliticianProfile, PoliticalPosition, PoliticianCorruptionRating, SpecialInterestGroup, PoliticianSigSponsorship } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

type PoliticianProfileWithPosition = PoliticianProfile & {
  position?: PoliticalPosition | null;
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
      <div className="container mx-auto p-6 max-w-5xl">
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
                    <div 
                      className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl font-bold ${getCorruptionGradeColor(profile.corruptionGrade)}`}
                      data-testid="badge-admin-grade"
                    >
                      {profile.corruptionGrade}
                    </div>
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

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {profile.email && (
              <div className="flex items-center gap-2" data-testid="text-email">
                <Mail className="w-4 h-4 text-gray-500" />
                <a href={`mailto:${profile.email}`} className="text-sm hover:underline">
                  {profile.email}
                </a>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-2" data-testid="text-phone">
                <Phone className="w-4 h-4 text-gray-500" />
                <a href={`tel:${profile.phone}`} className="text-sm hover:underline">
                  {profile.phone}
                </a>
              </div>
            )}
            {profile.website && (
              <div className="flex items-center gap-2" data-testid="text-website">
                <Globe className="w-4 h-4 text-gray-500" />
                <a href={sanitizeUrl(profile.website)} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                  {profile.website}
                </a>
              </div>
            )}
            {profile.officeAddress && (
              <div className="flex items-center gap-2" data-testid="text-office-address">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{profile.officeAddress}</span>
              </div>
            )}
            {profile.termStart && (
              <div className="flex items-center gap-2" data-testid="text-term">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  Term: {profile.termStart} - {profile.termEnd || "Present"}
                </span>
              </div>
            )}
          </div>

          {profile.biography && (
            <div className="mt-6">
              <h3 className="font-semibold text-lg mb-2">Biography</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300" data-testid="text-biography">
                {profile.biography}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Corruption Scorecard Section */}
      {profile.corruptionScorecard && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Corruption Scorecard
            </CardTitle>
            <CardDescription>
              Detailed information about corruption history and transparency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none" data-testid="text-corruption-scorecard">
              {profile.corruptionScorecard}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign Sponsors & Israel Lobby Section */}
      {sponsors.length > 0 && (() => {
        const validSponsors = sponsors.filter(s => s.sig);
        const pledgedAgainst = validSponsors.filter(s => s.relationshipType === 'pledged_against');
        const donorSponsors = validSponsors.filter(s => s.relationshipType !== 'pledged_against');
        const totalLobbyAmount = validSponsors.reduce((sum, s) => sum + (s.reportedAmount ?? 0), 0);
        const hasIsraelLobby = validSponsors.some(s => s.sig?.industry === 'foreign policy');

        return (
          <Card className="mb-6">
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

              {/* Pledged Against banners */}
              {pledgedAgainst.map(sponsor => (
                <div
                  key={sponsor.id}
                  className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40 px-4 py-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      Pledged Against {sponsor.sig?.acronym ?? sponsor.sig?.name}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {profile.fullName} has publicly rejected funding from {sponsor.sig?.name ?? sponsor.sig?.acronym}.
                    </p>
                    {sponsor.disclosureUrl && (
                      <a
                        href={sanitizeUrl(sponsor.disclosureUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Source: {sponsor.disclosureSource ?? 'Disclosure'}
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {/* Total Israel lobby amount summary */}
              {hasIsraelLobby && totalLobbyAmount > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/40 px-4 py-3">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Total for All Lobbies
                  </p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    ${(totalLobbyAmount / 100).toLocaleString()}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    Combined reported amount from linked lobby groups
                  </p>
                </div>
              )}

              {/* Donor SIG badges grid */}
              {donorSponsors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Linked Special Interest Groups
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {donorSponsors.map(sponsor => {
                      const sigTag = (sponsor.sig as any)?.tag || sponsor.sig?.acronym || encodeURIComponent(sponsor.sig?.name || "");
                      return (
                        <Link key={sponsor.id} href={`/sigs/${sigTag}`}>
                          <Badge
                            className={
                              sponsor.sig?.industry === 'foreign policy'
                                ? 'bg-orange-500 text-white border-orange-600 font-semibold hover:bg-orange-600 cursor-pointer'
                                : 'bg-slate-500 text-white border-slate-600 hover:bg-slate-600 cursor-pointer'
                            }
                          >
                            {sponsor.sig?.acronym ?? sponsor.sig?.name}
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {donorSponsors.map((sponsor) => (
                      <div
                        key={sponsor.id}
                        className="border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        data-testid={`sponsor-${sponsor.id}`}
                      >
                        <div className="flex items-start gap-3">
                          {sponsor.sig?.logoUrl ? (
                            <img
                              src={sponsor.sig.logoUrl}
                              alt={sponsor.sig?.name ?? "Organization"}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium truncate">
                                {sponsor.sig?.name ?? "Unknown Organization"}
                              </h4>
                              {sponsor.sig?.acronym && sponsor.sig.acronym !== sponsor.sig.name && (
                                <span className="text-sm text-slate-500">({sponsor.sig.acronym})</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {sponsor.sig?.industry && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {sponsor.sig.industry.replace(/_/g, " ")}
                                </Badge>
                              )}
                              {sponsor.isVerified && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-sm text-slate-600 dark:text-slate-400">
                              {typeof sponsor.reportedAmount === 'number' && sponsor.reportedAmount > 0 && (
                                <span className="font-medium text-orange-600 dark:text-orange-400">
                                  ${(sponsor.reportedAmount / 100).toLocaleString()}
                                </span>
                              )}
                              {sponsor.contributionPeriod && (
                                <span>{sponsor.contributionPeriod}</span>
                              )}
                            </div>
                            {sponsor.disclosureUrl ? (
                              <a
                                href={sanitizeUrl(sponsor.disclosureUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {sponsor.disclosureSource ?? 'Source'}
                              </a>
                            ) : sponsor.sig?.website ? (
                              <a
                                href={sanitizeUrl(sponsor.sig.website)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                              >
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
            </CardContent>
          </Card>
        );
      })()}

      {/* News Feed Section */}
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
    </div>
  );
}
