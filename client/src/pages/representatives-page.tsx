import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapPin, Phone, Mail, Globe, Heart, Search, User, Building2 } from "lucide-react";
import { TestApiButton } from "@/components/test-api-button";
import { ApiStatusNotice } from "@/components/api-status-notice";

interface Representative {
  name: string;
  office: string;
  party?: string;
  phones?: string[];
  emails?: string[];
  urls?: string[];
  photoUrl?: string;
  address?: Array<{
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
  }>;
  channels?: Array<{
    type: string;
    id: string;
  }>;
}

interface CivicData {
  offices: Array<{
    name: string;
    officialIndices: number[];
    levels?: string[];
    roles?: string[];
  }>;
  officials: Representative[];
}

export default function RepresentativesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [searchedAddress, setSearchedAddress] = useState("");
  const [civicData, setCivicData] = useState<CivicData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const searchRepresentatives = async () => {
    if (!address.trim()) {
      toast({
        title: "Address Required",
        description: "Please enter your address to find representatives",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("/api/representatives/search", "POST", {
        address: address.trim(),
      });
      const data = await response.json();
      
      setCivicData(data);
      setSearchedAddress(address.trim());
      
      toast({
        title: "Representatives Found",
        description: `Found ${data.officials?.length || 0} representatives for your area`,
      });
      
      if (data.fallbackMode) {
        toast({
          title: "Using Fallback Data",
          description: "Visit the provided links for current representative information",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Search Failed",
        description: error.message || "Could not find representatives for this address",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const followRepresentative = useMutation({
    mutationFn: async (repData: { name: string; office: string; party?: string }) => {
      const res = await apiRequest("/api/representatives/follow", "POST", repData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Representative Followed",
        description: "You'll receive updates about this representative",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to follow representative",
        variant: "destructive",
      });
    },
  });

  const getPartyColor = (party?: string) => {
    if (!party) return "bg-gray-100 text-gray-800";
    const p = party.toLowerCase();
    if (p.includes("democrat") || p.includes("democratic")) return "bg-blue-100 text-blue-800";
    if (p.includes("republican")) return "bg-red-100 text-red-800";
    if (p.includes("independent") || p.includes("green") || p.includes("libertarian")) 
      return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  const getOfficeLevel = (office: string) => {
    const o = office.toLowerCase();
    if (o.includes("president") || o.includes("senator") || o.includes("representative")) 
      return "Federal";
    if (o.includes("governor") || o.includes("state")) 
      return "State";
    if (o.includes("mayor") || o.includes("council") || o.includes("county")) 
      return "Local";
    return "Other";
  };

  const renderRepresentativeCard = (official: Representative, office: string) => (
    <Card key={`${official.name}-${office}`} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={official.photoUrl || ""} />
            <AvatarFallback>
              <User className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <CardTitle className="text-lg">{official.name}</CardTitle>
            <CardDescription className="text-base font-medium text-primary">
              {office}
            </CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getPartyColor(official.party)}>
                {official.party || "Unknown Party"}
              </Badge>
              <Badge variant="outline">
                {getOfficeLevel(office)}
              </Badge>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => followRepresentative.mutate({
              name: official.name,
              office: office,
              party: official.party,
            })}
            disabled={followRepresentative.isPending}
          >
            <Heart className="h-4 w-4 mr-2" />
            Follow
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {official.phones && official.phones.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-slate-500" />
                <span>{official.phones[0]}</span>
              </div>
            )}
            
            {official.emails && official.emails.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-slate-500" />
                <a 
                  href={`mailto:${official.emails[0]}`}
                  className="text-blue-600 hover:underline"
                >
                  {official.emails[0]}
                </a>
              </div>
            )}
            
            {official.urls && official.urls.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-slate-500" />
                <a 
                  href={official.urls[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Official Website
                </a>
              </div>
            )}
            
            {official.address && official.address.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <Building2 className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  {official.address[0].line1 && <div>{official.address[0].line1}</div>}
                  {official.address[0].city && (
                    <div>
                      {official.address[0].city}
                      {official.address[0].state && `, ${official.address[0].state}`}
                      {official.address[0].zip && ` ${official.address[0].zip}`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Social Media */}
          {official.channels && official.channels.length > 0 && (
            <div>
              <Separator className="my-3" />
              <div className="flex flex-wrap gap-2">
                {official.channels.map((channel, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {channel.type}: {channel.id}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const groupedRepresentatives = civicData ? 
    civicData.offices.reduce((acc, office) => {
      const level = office.levels?.[0] || getOfficeLevel(office.name);
      if (!acc[level]) acc[level] = [];
      
      office.officialIndices.forEach(index => {
        const official = civicData.officials[index];
        if (official) {
          acc[level].push({ official, office: office.name });
        }
      });
      
      return acc;
    }, {} as Record<string, Array<{ official: Representative; office: string }>>)
    : {};

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Know Your Representatives</h1>
              <p className="text-slate-600 mt-2">
                Find your elected officials and candidates by entering your address
              </p>
            </div>
            <TestApiButton />
          </div>
        </div>

        <ApiStatusNotice />

        {/* Address Search */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Enter Your Address
            </CardTitle>
            <CardDescription>
              We'll find your federal, state, and local representatives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="address" className="sr-only">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter your full address (e.g., 123 Main St, City, State, ZIP)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchRepresentatives()}
                />
              </div>
              <Button 
                onClick={searchRepresentatives}
                disabled={isLoading}
                className="px-6"
              >
                <Search className="h-4 w-4 mr-2" />
                {isLoading ? "Searching..." : "Find Reps"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {civicData && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-900">
                Representatives for: {searchedAddress}
              </h2>
              <p className="text-slate-600">
                Found {civicData.officials?.length || 0} representatives
              </p>
              {civicData.fallbackMode && (
                <p className="text-amber-600 text-sm mt-2">
                  Using fallback data - visit provided links for current information
                </p>
              )}
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({civicData.officials?.length || 0})</TabsTrigger>
                <TabsTrigger value="federal">Federal ({groupedRepresentatives.federal?.length || 0})</TabsTrigger>
                <TabsTrigger value="state">State ({groupedRepresentatives.state?.length || 0})</TabsTrigger>
                <TabsTrigger value="local">Local ({groupedRepresentatives.local?.length || 0})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {civicData.offices.map((office, officeIdx) => 
                    office.officialIndices.map(officialIdx => {
                      const official = civicData.officials[officialIdx];
                      return official ? (
                        <div key={`${officeIdx}-${officialIdx}`}>
                          {renderRepresentativeCard(official, office.name)}
                        </div>
                      ) : null;
                    })
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="federal" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {groupedRepresentatives.federal?.map(({ official, office }, idx) => (
                    <div key={idx}>{renderRepresentativeCard(official, office)}</div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="state" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {groupedRepresentatives.state?.map(({ official, office }, idx) => (
                    <div key={idx}>{renderRepresentativeCard(official, office)}</div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="local" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {groupedRepresentatives.local?.map(({ official, office }, idx) => (
                    <div key={idx}>{renderRepresentativeCard(official, office)}</div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Empty State */}
        {!civicData && !isLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <CardTitle className="mb-2">Find Your Representatives</CardTitle>
              <CardDescription className="mb-4">
                Enter your address above to discover your elected officials at federal, state, and local levels
              </CardDescription>
              <div className="text-sm text-slate-500">
                <p>We'll show you:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Contact information and office details</li>
                  <li>• Party affiliation and official websites</li>
                  <li>• Social media and communication channels</li>
                  <li>• Office addresses and phone numbers</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}