import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DonationModal } from "@/components/donation-modal";
import { useToast } from "@/hooks/use-toast";
import { Heart, Globe, GraduationCap, Shield, Stethoscope, Users, Leaf, Calendar, ExternalLink, MapPin, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { Charity, CharityDonation } from "@shared/schema";

const categoryIcons = {
  environment: Leaf,
  education: GraduationCap,
  healthcare: Stethoscope,
  poverty: Heart,
  disaster: Shield,
  community: Users,
  global: Globe,
};

export default function CharityDetailPage() {
  const params = useParams();
  const charityId = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDonationModal, setShowDonationModal] = useState(false);

  const { data: charity, isLoading: isLoadingCharity } = useQuery({
    queryKey: [`/api/charities/${charityId}`],
    queryFn: async () => {
      const response = await fetch(`/api/charities/${charityId}`);
      if (!response.ok) throw new Error("Failed to fetch charity");
      return response.json() as Promise<Charity>;
    },
    enabled: !!charityId,
  });

  const { data: topDonors, isLoading: isLoadingDonors } = useQuery({
    queryKey: [`/api/charities/${charityId}/top-donors`],
    queryFn: async () => {
      const response = await fetch(`/api/charities/${charityId}/top-donors`);
      if (!response.ok) throw new Error("Failed to fetch top donors");
      return response.json();
    },
    enabled: !!charityId,
  });

  if (!charityId) {
    return <div>Charity not found</div>;
  }

  if (isLoadingCharity) {
    return (
      <div className="container max-w-4xl mx-auto py-6">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!charity) {
    return (
      <div className="container max-w-4xl mx-auto py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Charity not found</p>
            <Link href="/charities">
              <Button className="mt-4">Browse Charities</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const IconComponent = categoryIcons[charity.category as keyof typeof categoryIcons] || Heart;
  const goalAmount = parseFloat(charity.goalAmount);
  const raisedAmount = parseFloat(charity.raisedAmount);
  const progressPercentage = goalAmount > 0 ? Math.min((raisedAmount / goalAmount) * 100, 100) : 0;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = charity.endDate && new Date(charity.endDate) < new Date();

  const handleDonationSuccess = () => {
    setShowDonationModal(false);
    queryClient.invalidateQueries({ queryKey: [`/api/charities/${charityId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/charities/${charityId}/top-donors`] });
    toast({
      title: "Thank you!",
      description: "Your donation has been processed successfully.",
    });
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      {/* Back Button */}
      <Link href="/charities">
        <Button variant="ghost" className="flex items-center gap-2" data-testid="button-back-to-charities">
          <ArrowLeft className="h-4 w-4" />
          Back to Charities
        </Button>
      </Link>

      {/* Main Charity Info */}
      <Card data-testid="charity-detail-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <IconComponent className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold" data-testid="charity-detail-name">
                  {charity.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="capitalize">
                    {charity.category}
                  </Badge>
                  {charity.isVerified && (
                    <Badge variant="default">
                      Verified
                    </Badge>
                  )}
                  {!charity.isActive && (
                    <Badge variant="destructive">
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {charity.isActive && !isExpired && (
              <Button
                onClick={() => setShowDonationModal(true)}
                className="flex items-center gap-2"
                data-testid="button-donate-charity"
              >
                <Heart className="h-4 w-4" />
                Donate Now
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Charity Image */}
          {charity.image && (
            <img
              src={charity.image}
              alt={charity.name}
              className="w-full h-64 object-cover rounded-lg"
              data-testid="charity-detail-image"
            />
          )}

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">About This Charity</h3>
            <p className="text-muted-foreground leading-relaxed" data-testid="charity-detail-description">
              {charity.description}
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">Fundraising Progress</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-green-600" data-testid="charity-detail-raised">
                  {formatCurrency(raisedAmount)}
                </span>
                <span className="text-muted-foreground" data-testid="charity-detail-goal">
                  Goal: {formatCurrency(goalAmount)}
                </span>
              </div>
              
              <Progress value={progressPercentage} className="w-full h-3" />
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{progressPercentage.toFixed(1)}% of goal reached</span>
                <span data-testid="charity-detail-donors">{charity.donorCount} donors</span>
              </div>
            </div>

            {/* ACP Coins Section */}
            {parseFloat(charity.acpCoinRaised) > 0 && (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">ACP</span>
                </div>
                <div>
                  <p className="font-semibold" data-testid="charity-detail-acp-raised">
                    {parseFloat(charity.acpCoinRaised).toFixed(2)} ACP Coins Raised
                  </p>
                  <p className="text-sm text-muted-foreground">
                    From community cryptocurrency donations
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {charity.endDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Campaign End Date</p>
                  <p className={`text-sm ${isExpired ? "text-red-500" : "text-muted-foreground"}`}>
                    {formatDate(charity.endDate)}
                    {isExpired && " (Ended)"}
                  </p>
                </div>
              </div>
            )}

            {charity.website && (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Website</p>
                  <a
                    href={charity.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                    data-testid="charity-detail-website"
                  >
                    Visit Website
                  </a>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Donors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Donors</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingDonors ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : topDonors && topDonors.length > 0 ? (
            <div className="space-y-3">
              {topDonors.map((donor: any, index: number) => (
                <div key={donor.user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {index + 1}
                    </div>
                    <Avatar>
                      <AvatarFallback>
                        {donor.user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{donor.user.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {donor.donationCount} donations
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {formatCurrency(parseFloat(donor.totalDonated))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No public donations yet. Be the first to contribute!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Donation Modal */}
      {showDonationModal && (
        <DonationModal
          charity={charity}
          isOpen={showDonationModal}
          onClose={() => setShowDonationModal(false)}
          onSuccess={handleDonationSuccess}
        />
      )}
    </div>
  );
}