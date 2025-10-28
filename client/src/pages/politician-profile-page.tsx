import { useParams } from "wouter";
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
import { CheckCircle2, Globe, Mail, Phone, MapPin, Calendar, Award, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import type { Post, PoliticianProfile, PoliticalPosition } from "@shared/schema";

type PoliticianProfileWithPosition = PoliticianProfile & {
  position?: PoliticalPosition | null;
};

const claimFormSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

type ClaimFormData = z.infer<typeof claimFormSchema>;

export default function PoliticianProfilePage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery<PoliticianProfileWithPosition>({
    queryKey: [`/api/politician-profiles/${id}`],
    enabled: !!id,
  });

  // Fetch posts where this politician is tagged
  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ['/api/feeds/all'],
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

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading politician profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Politician profile not found</p>
      </div>
    );
  }

  const getCorruptionGradeColor = (grade: string) => {
    const colors = {
      'A': 'bg-green-500 text-white',
      'B': 'bg-blue-500 text-white',
      'C': 'bg-yellow-500 text-black',
      'D': 'bg-orange-500 text-white',
      'F': 'bg-red-500 text-white',
    };
    return colors[grade as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  // Filter posts where politician is tagged
  const taggedPosts = posts.filter((post: Post) => 
    post.tags?.some(tag => 
      tag.toLowerCase().includes(profile.fullName?.toLowerCase())
    )
  );

  const hasPendingClaim = profile.claimRequestStatus === 'pending';
  const hasRejectedClaim = profile.claimRequestStatus === 'rejected';
  const canClaim = !profile.isVerified && !hasPendingClaim;

  return (
    <div className="container mx-auto p-6 max-w-5xl" data-testid="politician-profile-page">
      {/* Header Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start gap-6">
            {/* Profile Photo with Verified Badge */}
            <div className="relative">
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.fullName}
                  className="w-32 h-32 rounded-lg object-cover"
                  data-testid="img-politician-photo"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-400">
                    {profile.fullName?.charAt(0)}
                  </span>
                </div>
              )}
              {profile.isVerified && (
                <div className="absolute -top-2 -left-2" data-testid="badge-verified">
                  <CheckCircle2 className="w-8 h-8 text-green-500 bg-white dark:bg-gray-900 rounded-full" />
                </div>
              )}
            </div>

            {/* Name and Position */}
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2" data-testid="text-politician-name">
                {profile.fullName}
              </CardTitle>
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
                <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="mt-4" variant="outline" data-testid="button-claim-page">
                      Claim This Page
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Claim Your Profile Page</DialogTitle>
                      <DialogDescription>
                        To claim this page, you must provide your office email address and phone number. 
                        We will call you to verify your identity before approving your claim.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmitClaim)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Office Email Address</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="your.name@office.gov" 
                                  {...field} 
                                  data-testid="input-claim-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input 
                                  type="tel" 
                                  placeholder="(555) 123-4567" 
                                  {...field} 
                                  data-testid="input-claim-phone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button 
                            type="submit" 
                            disabled={claimMutation.isPending}
                            data-testid="button-submit-claim"
                          >
                            {claimMutation.isPending ? "Submitting..." : "Submit Claim Request"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
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

            {/* Corruption Grade Badge */}
            {profile.corruptionGrade && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Corruption Grade</span>
                <div 
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold ${getCorruptionGradeColor(profile.corruptionGrade)}`}
                  data-testid="badge-corruption-grade"
                >
                  {profile.corruptionGrade}
                </div>
              </div>
            )}
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
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
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

      <Separator className="my-6" />

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
  );
}
