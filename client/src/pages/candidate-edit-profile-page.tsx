import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle2, Globe, Mail, Phone, MapPin, Award, Star,
  Edit, Plus, Save, Eye, Shield, User, Camera, Users, Heart,
  MessageSquare, Music, Image, Youtube, Flag, BarChart3,
  Calendar, Target, Zap, TrendingUp, Video, Crown, Loader2,
  Send, AlertTriangle
} from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import type { PoliticianProfile, PoliticianSigSponsorship, SpecialInterestGroup, CandidateProfileModule } from "@shared/schema";

type PoliticianWithPosition = PoliticianProfile & {
  position?: { title: string; jurisdiction?: string | null } | null;
};

type SponsorWithSig = PoliticianSigSponsorship & {
  sig?: SpecialInterestGroup | null;
};

type RatingStats = {
  averageGrade: string;
  totalRatings: number;
};

interface ProfileModule {
  id: string;
  name: string;
  type: string;
  isPremium: boolean;
  isEnabled: boolean;
  position: number;
  itemCount: number;
  customData?: Record<string, unknown>;
}

const availableModules = [
  { type: "bio", name: "About Me", icon: User, isPremium: false },
  { type: "photos", name: "Photo Gallery", icon: Camera, isPremium: false },
  { type: "feed", name: "Recent Posts", icon: MessageSquare, isPremium: false },
  { type: "youtube", name: "YouTube Video", icon: Youtube, isPremium: false },
  { type: "badges", name: "Badges & Achievements", icon: Award, isPremium: false },
  { type: "issues", name: "Issue Interests", icon: Flag, isPremium: false },
  { type: "civic-tracker", name: "Civic Activity Tracker", icon: BarChart3, isPremium: false },
  { type: "pinned-post", name: "Pinned Post", icon: Target, isPremium: false },
  { type: "debate-history", name: "Debate History", icon: MessageSquare, isPremium: false },
  { type: "events", name: "Event Participation", icon: Calendar, isPremium: false },
  { type: "political-compass", name: "Political Compass", icon: Target, isPremium: false },
  { type: "campaign-hub", name: "Campaign Hub", icon: TrendingUp, isPremium: true },
  { type: "media-hub", name: "Media Hub", icon: Video, isPremium: true },
  { type: "widgets", name: "Custom Widgets", icon: Zap, isPremium: true },
  { type: "supporter-wall", name: "Supporter Wall", icon: Heart, isPremium: true },
];

const moduleIcons: Record<string, any> = {
  bio: User, photos: Camera, feed: MessageSquare, youtube: Youtube,
  badges: Award, issues: Flag, "civic-tracker": BarChart3,
  "pinned-post": Target, "debate-history": MessageSquare,
  events: Calendar, "political-compass": Target,
  "campaign-hub": TrendingUp, "media-hub": Video,
  widgets: Zap, "supporter-wall": Heart,
};

export default function CandidateEditProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [editMode, setEditMode] = useState(false);
  const [profileModules, setProfileModules] = useState<ProfileModule[]>([]);
  const [showAddModule, setShowAddModule] = useState(false);
  const [editingModule, setEditingModule] = useState<ProfileModule | null>(null);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [correctionField, setCorrectionField] = useState("");
  const [correctionCurrent, setCorrectionCurrent] = useState("");
  const [correctionSuggested, setCorrectionSuggested] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  const politicianId = user?.claimedPoliticianId;

  const { data: politician, isLoading: politicianLoading } = useQuery<PoliticianWithPosition>({
    queryKey: ["/api/politician-profiles", politicianId],
    queryFn: async () => {
      const res = await fetch(`/api/politician-profiles/${politicianId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    enabled: !!politicianId,
  });

  const { data: sponsors = [] } = useQuery<SponsorWithSig[]>({
    queryKey: ["/api/politician-profiles", politicianId, "sponsors"],
    queryFn: async () => {
      const res = await fetch(`/api/politician-profiles/${politicianId}/sponsors`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!politicianId,
  });

  const { data: ratingStats } = useQuery<RatingStats>({
    queryKey: ["/api/politician-profiles", politicianId, "rating", "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/politician-profiles/${politicianId}/rating/stats`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!politicianId,
  });

  const { data: savedModules = [], isLoading: modulesLoading } = useQuery<CandidateProfileModule[]>({
    queryKey: ["/api/candidate-profile", politicianId, "modules"],
    queryFn: async () => {
      const res = await fetch(`/api/candidate-profile/${politicianId}/modules`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!politicianId,
  });

  useEffect(() => {
    if (savedModules.length > 0) {
      setProfileModules(savedModules.map((m, i) => {
        const modType = m.moduleType;
        const rawContent = m.content;
        const content: Record<string, unknown> = typeof rawContent === "string"
          ? (() => { try { return JSON.parse(rawContent); } catch { return {}; } })()
          : (rawContent && typeof rawContent === "object" ? rawContent as Record<string, unknown> : {});
        return {
          id: m.id || `mod-${i}`,
          name: availableModules.find(am => am.type === modType)?.name || modType,
          type: modType,
          isPremium: false,
          isEnabled: true,
          position: m.position ?? i,
          itemCount: (content?.itemCount as number) ?? 6,
          customData: content,
        };
      }));
    } else if (savedModules.length === 0 && !modulesLoading) {
      setProfileModules([
        { id: "default-bio", name: "About Me", type: "bio", isPremium: false, isEnabled: true, position: 0, itemCount: 1 },
        { id: "default-photos", name: "Photo Gallery", type: "photos", isPremium: false, isEnabled: true, position: 1, itemCount: 6 },
      ]);
    }
  }, [savedModules, modulesLoading]);

  const saveModulesMutation = useMutation({
    mutationFn: async (modules: ProfileModule[]) => {
      const res = await apiRequest(`/api/candidate-profile/${politicianId}/modules`, "PUT", {
        modules: modules.filter(m => m.isEnabled).map(m => ({
          moduleType: m.type,
          content: { ...m.customData, itemCount: m.itemCount },
          position: m.position,
        })),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidate-profile", politicianId, "modules"] });
      toast({ title: "Profile saved" });
      setEditMode(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error saving profile", description: err.message, variant: "destructive" });
    },
  });

  const correctionMutation = useMutation({
    mutationFn: async (data: { fieldName: string; currentValue: string; suggestedValue: string; reason: string }) => {
      const res = await apiRequest(`/api/politicians/${politicianId}/correction`, "POST", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Change request submitted", description: "An admin will review your request." });
      setShowCorrectionDialog(false);
      setCorrectionField("");
      setCorrectionCurrent("");
      setCorrectionSuggested("");
      setCorrectionReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!politicianId) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto py-16 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No Claimed Profile</h2>
          <p className="text-muted-foreground mb-4">You haven't claimed a politician profile yet.</p>
          <Button onClick={() => navigate("/representatives")}>Browse Representatives</Button>
        </div>
      </div>
    );
  }

  if (politicianLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto py-16 flex justify-center"><LoadingSpinner /></div>
      </div>
    );
  }

  const gradeColor = (grade: string | null) => {
    if (!grade) return "bg-slate-500";
    const g = grade.toUpperCase();
    if (g === "A") return "bg-green-600";
    if (g === "B") return "bg-blue-600";
    if (g === "C") return "bg-yellow-600";
    if (g === "D") return "bg-orange-600";
    return "bg-red-600";
  };

  const aceSponsors = sponsors.filter((s) => s.sig?.isAce);

  const openCorrectionFor = (field: string, current: string) => {
    setCorrectionField(field);
    setCorrectionCurrent(current);
    setCorrectionSuggested("");
    setCorrectionReason("");
    setShowCorrectionDialog(true);
  };

  const addModule = (type: string) => {
    const def = availableModules.find(m => m.type === type);
    if (!def) return;
    const newMod: ProfileModule = {
      id: `mod-${Date.now()}`,
      name: def.name,
      type: def.type,
      isPremium: def.isPremium,
      isEnabled: true,
      position: profileModules.length,
      itemCount: 6,
    };
    setProfileModules(prev => [...prev, newMod]);
    setShowAddModule(false);
  };

  const removeModule = (id: string) => {
    setProfileModules(prev => prev.filter(m => m.id !== id));
    setEditingModule(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6 max-w-5xl">

        {/* Fixed Header Section - Read Only */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                {politician?.photoUrl ? (
                  <img src={politician.photoUrl} alt={politician.fullName} className="w-24 h-24 rounded-full object-cover border-4 border-white/30" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30">
                    <User className="w-12 h-12 text-white/60" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{politician?.fullName}</h1>
                  {politician?.isVerified && <CheckCircle2 className="w-5 h-5 text-green-300" />}
                </div>
                {politician?.handle && <p className="text-blue-200">@{politician.handle}</p>}
                {politician?.position && (
                  <p className="text-sm text-blue-100 mt-1">{politician.position.title} — {politician.position.jurisdiction}</p>
                )}
                {politician?.party && <Badge variant="secondary" className="mt-2 bg-white/20 text-white border-0">{politician.party}</Badge>}
              </div>
              <div className="flex gap-3 shrink-0">
                {politician?.corruptionGrade && (
                  <div className="text-center">
                    <div className={`w-14 h-14 rounded-lg ${gradeColor(politician.corruptionGrade)} flex items-center justify-center text-2xl font-bold text-white`}>
                      {politician.corruptionGrade}
                    </div>
                    <p className="text-xs text-blue-200 mt-1">ACP Grade</p>
                    {politician?.numericScore != null && <p className="text-xs text-blue-200">{politician.numericScore}/100</p>}
                  </div>
                )}
                {ratingStats?.averageGrade && (
                  <div className="text-center">
                    <div className={`w-14 h-14 rounded-lg ${gradeColor(ratingStats.averageGrade)} flex items-center justify-center text-2xl font-bold text-white`}>
                      {ratingStats.averageGrade}
                    </div>
                    <p className="text-xs text-blue-200 mt-1">Community</p>
                    <p className="text-xs text-blue-200">{ratingStats.totalRatings} votes</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Contact</h3>
                {politician?.email && <p className="text-sm flex items-center gap-1"><Mail className="w-3 h-3 text-muted-foreground" /> {politician.email}</p>}
                {politician?.phone && <p className="text-sm flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" /> {politician.phone}</p>}
                {politician?.officeAddress && <p className="text-sm flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" /> {politician.officeAddress}</p>}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" /> Links</h3>
                {politician?.website && (
                  <a href={politician.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline block truncate">
                    {politician.website}
                  </a>
                )}
                {politician?.ballotpediaUrl && (
                  <a href={politician.ballotpediaUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline block">
                    Ballotpedia
                  </a>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><Award className="w-3 h-3" /> Endorsements</h3>
                {aceSponsors.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {aceSponsors.map((s) => (
                      <Badge key={s.id} variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                        <Shield className="w-3 h-3 mr-1" />{s.sig?.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No endorsements yet</p>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                This section is managed by ACP. To request changes, click "Request Changes".
              </p>
              <Button variant="outline" size="sm" onClick={() => openCorrectionFor("", "")}>
                <Send className="w-3 h-3 mr-1" /> Request Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="candidate-profile">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="candidate-profile">Candidate Profile</TabsTrigger>
              <TabsTrigger value="news-feed">News Feed</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveModulesMutation.mutate(profileModules)} disabled={saveModulesMutation.isPending}>
                    {saveModulesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit className="w-4 h-4 mr-1" /> Customize
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="candidate-profile">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileModules.sort((a, b) => a.position - b.position).map((mod) => {
                const IconComp = moduleIcons[mod.type] || User;
                return (
                  <Card key={mod.id} className={`${!mod.isEnabled ? 'opacity-50' : ''}`}>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <IconComp className="w-4 h-4" /> {mod.name}
                      </CardTitle>
                      {editMode && (
                        <Button variant="ghost" size="sm" onClick={() => setEditingModule(mod)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <ModuleContent module={mod} politician={politician} politicianId={politicianId} />
                    </CardContent>
                  </Card>
                );
              })}

              {editMode && (
                <Card className="border-dashed border-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowAddModule(true)}>
                  <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Plus className="w-8 h-8 mb-2" />
                    <p className="text-sm font-medium">Add Module</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="news-feed">
            <NewsFeedSection politicianId={politicianId} politicianName={politician?.fullName} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Module Dialog */}
      <Dialog open={showAddModule} onOpenChange={setShowAddModule}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Module</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
            {availableModules
              .filter(am => !profileModules.some(pm => pm.type === am.type))
              .map(am => (
                <Button key={am.type} variant="outline" className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => addModule(am.type)}>
                  <am.icon className="w-5 h-5" />
                  <span className="text-xs">{am.name}</span>
                  {am.isPremium && <Badge variant="secondary" className="text-[10px]">ACP+</Badge>}
                </Button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Module Dialog */}
      <Dialog open={!!editingModule} onOpenChange={(v) => !v && setEditingModule(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit: {editingModule?.name}</DialogTitle></DialogHeader>
          {editingModule && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Visible</Label>
                <Switch checked={editingModule.isEnabled} onCheckedChange={(v) => {
                  const updated = { ...editingModule, isEnabled: v };
                  setEditingModule(updated);
                  setProfileModules(prev => prev.map(m => m.id === updated.id ? updated : m));
                }} />
              </div>
              <div>
                <Label>Items to Show</Label>
                <Select value={String(editingModule.itemCount)} onValueChange={(v) => {
                  const updated = { ...editingModule, itemCount: parseInt(v) };
                  setEditingModule(updated);
                  setProfileModules(prev => prev.map(m => m.id === updated.id ? updated : m));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 3, 6, 9, 12].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {editingModule.type === "youtube" && (
                <div>
                  <Label>YouTube Video URL</Label>
                  <Input
                    value={editingModule.customData?.videoUrl || ""}
                    onChange={(e) => {
                      const updated = { ...editingModule, customData: { ...editingModule.customData, videoUrl: e.target.value } };
                      setEditingModule(updated);
                      setProfileModules(prev => prev.map(m => m.id === updated.id ? updated : m));
                    }}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              )}
              {editingModule.type === "bio" && (
                <div>
                  <Label>Biography</Label>
                  <Textarea
                    value={editingModule.customData?.text || ""}
                    onChange={(e) => {
                      const updated = { ...editingModule, customData: { ...editingModule.customData, text: e.target.value } };
                      setEditingModule(updated);
                      setProfileModules(prev => prev.map(m => m.id === updated.id ? updated : m));
                    }}
                    rows={4}
                    placeholder="Write about yourself..."
                  />
                </div>
              )}
              <Button variant="destructive" size="sm" onClick={() => removeModule(editingModule.id)}>
                Delete Module
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Correction Request Dialog */}
      <Dialog open={showCorrectionDialog} onOpenChange={setShowCorrectionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Profile Changes</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>What needs to change?</Label>
              <Select value={correctionField} onValueChange={setCorrectionField}>
                <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fullName">Full Name</SelectItem>
                  <SelectItem value="party">Party</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="officeAddress">Office Address</SelectItem>
                  <SelectItem value="photoUrl">Profile Photo</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Current Value</Label>
              <Input value={correctionCurrent} onChange={e => setCorrectionCurrent(e.target.value)} placeholder="What it currently says..." />
            </div>
            <div>
              <Label>Suggested Value</Label>
              <Input value={correctionSuggested} onChange={e => setCorrectionSuggested(e.target.value)} placeholder="What it should say..." />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} placeholder="Why this change is needed..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCorrectionDialog(false)}>Cancel</Button>
            <Button
              onClick={() => correctionMutation.mutate({ fieldName: correctionField, currentValue: correctionCurrent, suggestedValue: correctionSuggested, reason: correctionReason })}
              disabled={!correctionField || !correctionSuggested || correctionMutation.isPending}
            >
              {correctionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModuleContent({ module, politician, politicianId }: { module: ProfileModule; politician: PoliticianWithPosition | undefined; politicianId: string }) {
  if (module.type === "bio") {
    const text = module.customData?.text || politician?.biography;
    return <p className="text-sm text-muted-foreground">{text || "No bio added yet. Click customize to add one."}</p>;
  }
  if (module.type === "youtube") {
    const url = module.customData?.videoUrl;
    if (!url) return <p className="text-sm text-muted-foreground">No video added. Click customize to add a YouTube video.</p>;
    const videoId = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?#]+)/)?.[1];
    if (!videoId) return <p className="text-sm text-muted-foreground">Invalid YouTube URL</p>;
    return <div className="aspect-video"><iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full rounded" allowFullScreen /></div>;
  }
  if (module.type === "photos") {
    return <p className="text-sm text-muted-foreground">Photo gallery coming soon</p>;
  }
  if (module.type === "issues") {
    return <p className="text-sm text-muted-foreground">Issue interests will be displayed here</p>;
  }
  return <p className="text-sm text-muted-foreground">{module.name} content will appear here</p>;
}

interface FeedPost {
  id: number;
  content: string;
  createdAt: string;
  author?: { username: string };
}

function NewsFeedSection({ politicianId, politicianName }: { politicianId: string; politicianName?: string }) {
  const { data: posts = [], isLoading } = useQuery<FeedPost[]>({
    queryKey: ["/api/feeds/all"],
  });

  const relevantPosts = posts.filter((p) => {
    const content = (p.content || "").toLowerCase();
    const name = (politicianName || "").toLowerCase();
    return name && content.includes(name);
  });

  if (isLoading) return <LoadingSpinner />;

  if (relevantPosts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2" />
          <p>No posts mentioning {politicianName} yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {relevantPosts.slice(0, 20).map((post) => (
        <Card key={post.id}>
          <CardContent className="py-4">
            <p className="text-sm font-medium mb-1">{post.author?.username || "Unknown"}</p>
            <p className="text-sm text-muted-foreground">{post.content}</p>
            <p className="text-xs text-muted-foreground mt-2">{new Date(post.createdAt).toLocaleDateString()}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
