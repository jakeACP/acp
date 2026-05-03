import { useState } from "react";
import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Camera, 
  Music, 
  Users, 
  Heart, 
  MessageSquare, 
  Settings, 
  Crown,
  Image,
  Palette,
  Layout,
  Save,
  Eye,
  Upload,
  Edit,
  Plus,
  Youtube,
  Award,
  Flag,
  BarChart3,
  Crown as CrownIcon,
  Shield,
  TrendingUp,
  Video,
  Zap,
  Calendar,
  Star,
  Target,
  Trash2,
  BadgeCheck,
  CheckCircle,
  Clock,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { FriendButton } from "@/components/friend-button";
import { apiRequest } from "@/lib/queryClient";
import type { Post } from "@shared/schema";

interface ExtendedProfileData {
  issueInterests?: string[];
  pinnedPostId?: string | null;
  galleryPhotos?: string[];
  campaignHubLinks?: {
    donateUrl?: string | null;
    volunteerUrl?: string | null;
  };
  legacyTimeline?: Array<{ text: string; date: string }>;
  widgetConfig?: {
    pollQuestion?: string | null;
    pollOption1?: string;
    pollOption2?: string;
    electionDate?: string | null;
  };
}

const PRESET_ISSUES = [
  "Healthcare Reform", "Climate Action", "Education", "Economic Justice",
  "Anti-Corruption", "Housing Affordability", "Criminal Justice Reform",
  "Immigration", "LGBTQ+ Rights", "Voting Rights", "Gun Control",
  "Labor Rights", "Veterans Affairs", "Foreign Policy", "Tax Reform"
];

function FeedModule({ userId, itemCount, username }: { userId: string; itemCount: number; username?: string }) {
  const { data: posts, isLoading, isError } = useQuery<Post[]>({
    queryKey: ["/api/posts/user", userId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/user/${userId}`);
      if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
      return res.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: itemCount }, (_, i) => (
          <div key={i} className="p-3 border rounded-lg animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 border border-dashed rounded-lg">
        Could not load posts.
      </div>
    );
  }

  const visiblePosts = (posts ?? []).slice(0, itemCount);

  if (visiblePosts.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 border border-dashed rounded-lg">
        No posts yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visiblePosts.map(post => (
        <div key={post.id} className="p-3 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <span className="text-sm font-medium">{username}</span>
            {post.createdAt && (
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{post.content}</p>
          {((post.likesCount ?? 0) > 0 || (post.commentsCount ?? 0) > 0) && (
            <div className="flex gap-3 mt-2 text-xs text-gray-400">
              {(post.likesCount ?? 0) > 0 && <span>{post.likesCount} likes</span>}
              {(post.commentsCount ?? 0) > 0 && <span>{post.commentsCount} comments</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface ProfileModule {
  id: string;
  name: string;
  type: "bio" | "photos" | "feed" | "friends" | "following" | "music" | "background" | "youtube" | "badges" | "issues" | "civic-tracker" | "pinned-post" | "debate-history" | "events" | "political-compass" | "analytics" | "campaign-hub" | "verified-badge" | "civic-scorecard" | "media-hub" | "widgets" | "supporter-wall" | "democracy-wrapped" | "legacy-timeline" | "custom";
  isPremium: boolean;
  isEnabled: boolean;
  position: number;
  itemCount: number;
  customData?: any;
}

interface UserProfile {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string;
  subscriptionStatus: string;
  profileTheme?: string;
  profileBackground?: string;
  favoriteSong?: string;
  profileLayout?: any;
  voterVerificationStatus?: string;
  trustScore?: string;
  profileViews?: number;
  createdAt?: string;
}

export function ModularProfile({ userId, isOwner = false }: { userId?: string; isOwner?: boolean }) {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPoliticalQuiz, setShowPoliticalQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [currentQuizStep, setCurrentQuizStep] = useState(0);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [bioText, setBioText] = useState("");
  const [top8Selection, setTop8Selection] = useState<string[]>([]);

  // Political Compass Quiz Questions
  const politicalQuizQuestions = [
    // Economic Questions
    { id: 1, text: "Private companies should provide most public services", category: "economic", weight: 1 },
    { id: 2, text: "The government should regulate businesses to protect workers", category: "economic", weight: -1 },
    { id: 3, text: "Free market capitalism is the best economic system", category: "economic", weight: 1 },
    { id: 4, text: "Wealth should be redistributed from rich to poor", category: "economic", weight: -1 },
    { id: 5, text: "Healthcare should be publicly funded for everyone", category: "economic", weight: -1 },
    { id: 6, text: "Lower taxes are more important than public services", category: "economic", weight: 1 },
    { id: 7, text: "Workers should have more control over their workplaces", category: "economic", weight: -1 },
    { id: 8, text: "International trade benefits everyone", category: "economic", weight: 1 },
    
    // Social Questions  
    { id: 9, text: "Traditional family values should be promoted by government", category: "social", weight: 1 },
    { id: 10, text: "People should be free to live however they choose", category: "social", weight: -1 },
    { id: 11, text: "Law and order must be maintained at all costs", category: "social", weight: 1 },
    { id: 12, text: "Individual privacy is more important than national security", category: "social", weight: -1 },
    { id: 13, text: "Immigration should be strictly controlled", category: "social", weight: 1 },
    { id: 14, text: "Marijuana should be legalized", category: "social", weight: -1 },
    { id: 15, text: "Government surveillance is necessary for safety", category: "social", weight: 1 },
    { id: 16, text: "Same-sex marriage should be legal everywhere", category: "social", weight: -1 }
  ];
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleType, setNewModuleType] = useState<string>("");

  // Calculate political compass position
  const calculatePoliticalPosition = (answers: Record<number, number>) => {
    let economicTotal = 0;
    let socialTotal = 0;
    let economicCount = 0;
    let socialCount = 0;

    politicalQuizQuestions.forEach(question => {
      const answer = answers[question.id];
      if (answer !== undefined) {
        const score = (answer - 3) * question.weight; // Convert 1-5 scale to -2 to 2, then apply weight
        
        if (question.category === 'economic') {
          economicTotal += score;
          economicCount++;
        } else if (question.category === 'social') {
          socialTotal += score;
          socialCount++;
        }
      }
    });

    // Normalize to 0-200 range for SVG coordinates
    const economicPosition = economicCount > 0 ? 100 + (economicTotal / economicCount) * 40 : 100;
    const socialPosition = socialCount > 0 ? 100 - (socialTotal / socialCount) * 40 : 100; // Inverted for SVG
    
    return {
      economicPosition: Math.max(10, Math.min(190, economicPosition)),
      socialPosition: Math.max(10, Math.min(190, socialPosition)),
      economicScore: economicCount > 0 ? economicTotal / economicCount : 0,
      socialScore: socialCount > 0 ? socialTotal / socialCount : 0
    };
  };

  const finishQuiz = () => {
    const results = calculatePoliticalPosition(quizAnswers);
    
    // Update the political compass module with results
    const updatedModules = profileModules.map(mod => 
      mod.type === 'political-compass' 
        ? { ...mod, customData: { ...results, hasResults: true } }
        : mod
    );
    
    setProfileModules(updatedModules);
    setShowPoliticalQuiz(false);
    
    // Auto-save the changes
    saveModulesAutomatically(updatedModules);
    
    toast({
      title: "Political Compass Complete!",
      description: "Your political position has been calculated and saved to your profile.",
    });
  };

  const { data: user, isLoading: userLoading } = useQuery<UserProfile>({
    queryKey: userId ? [`/api/user/${userId}`] : ["/api/user"],
  });

  const profileUserId = userId || user?.id;

  const { data: top8Friends = [] } = useQuery<any[]>({
    queryKey: ["/api/users", profileUserId, "top8"],
    queryFn: async () => {
      if (!profileUserId) return [];
      const res = await fetch(`/api/users/${profileUserId}/top8`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!profileUserId,
  });

  const { data: allFriends = [] } = useQuery<any[]>({
    queryKey: ["/api/friends"],
    enabled: isOwner,
  });

  // Extended profile data (issue interests, pinned post, gallery, etc.)
  const { data: extendedData = {} as ExtendedProfileData, refetch: refetchExtended } = useQuery<ExtendedProfileData>({
    queryKey: ["/api/profile", profileUserId, "extended"],
    queryFn: async () => {
      if (!profileUserId) return {};
      const res = await fetch(`/api/profile/${profileUserId}/extended`);
      if (!res.ok) return {};
      return res.json();
    },
    enabled: !!profileUserId,
  });

  // Followers (Supporter Wall)
  const { data: followers = [] } = useQuery<any[]>({
    queryKey: ["/api/users", profileUserId, "followers"],
    queryFn: async () => {
      if (!profileUserId) return [];
      const res = await fetch(`/api/users/${profileUserId}/followers`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!profileUserId,
  });

  // Following list
  const { data: followingList = [] } = useQuery<any[]>({
    queryKey: ["/api/users", profileUserId, "following"],
    queryFn: async () => {
      if (!profileUserId) return [];
      const res = await fetch(`/api/users/${profileUserId}/following`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!profileUserId,
  });

  // All friends (accepted)
  const { data: allProfileFriends = [] } = useQuery<any[]>({
    queryKey: ["/api/users", profileUserId, "friends"],
    queryFn: async () => {
      if (!profileUserId) return [];
      const res = await fetch(`/api/users/${profileUserId}/friends`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!profileUserId,
  });

  // Activity stats
  const { data: activityStats } = useQuery<any>({
    queryKey: ["/api/profile", profileUserId, "activity-stats"],
    queryFn: async () => {
      if (!profileUserId) return null;
      const res = await fetch(`/api/profile/${profileUserId}/activity-stats`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!profileUserId,
  });

  // Badges
  const { data: badges = [] } = useQuery<any[]>({
    queryKey: ["/api/profile", profileUserId, "badges"],
    queryFn: async () => {
      if (!profileUserId) return [];
      const res = await fetch(`/api/profile/${profileUserId}/badges`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!profileUserId,
  });

  // Scorecard
  const { data: scorecard } = useQuery<any>({
    queryKey: ["/api/profile", profileUserId, "scorecard"],
    queryFn: async () => {
      if (!profileUserId) return null;
      const res = await fetch(`/api/profile/${profileUserId}/scorecard`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!profileUserId,
  });

  // Democracy Wrapped
  const wrappedYear = new Date().getFullYear();
  const { data: wrappedData } = useQuery<any>({
    queryKey: ["/api/profile", profileUserId, "wrapped", wrappedYear],
    queryFn: async () => {
      if (!profileUserId) return null;
      const res = await fetch(`/api/profile/${profileUserId}/wrapped/${wrappedYear}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!profileUserId,
  });
  const [wrappedExpanded, setWrappedExpanded] = useState(false);

  // Widget poll (backend-persisted votes)
  const { data: widgetPollData, refetch: refetchWidgetPoll } = useQuery<{ results: Record<string, number>; myVote: string | null }>({
    queryKey: ["/api/profile", profileUserId, "widget-poll"],
    queryFn: async () => {
      if (!profileUserId) return { results: {}, myVote: null };
      const res = await fetch(`/api/profile/${profileUserId}/widget-poll`);
      if (!res.ok) return { results: {}, myVote: null };
      return res.json();
    },
    enabled: !!profileUserId,
  });

  const castWidgetVoteMutation = useMutation({
    mutationFn: async (option: string) => {
      const { getCsrfToken } = await import("@/lib/queryClient");
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/profile/${profileUserId}/widget-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "x-csrf-token": csrfToken } : {}) },
        credentials: "include",
        body: JSON.stringify({ option }),
      });
      if (!res.ok) throw new Error("Vote failed");
      return res.json();
    },
    onMutate: (option) => setWidgetVoteOptimistic(option),
    onSuccess: () => {
      refetchWidgetPoll();
      setWidgetVoteOptimistic(null);
    },
    onError: () => {
      setWidgetVoteOptimistic(null);
      toast({ title: "Vote failed", variant: "destructive" });
    },
  });

  // User signals (Media Hub)
  const { data: userSignals = [] } = useQuery<any[]>({
    queryKey: ["/api/mobile/signals/user", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return [];
      const res = await fetch(`/api/mobile/signals/user/${profileUserId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!profileUserId,
  });

  // User posts (Debate History + Event Participation)
  const { data: userPostsList = [] } = useQuery<any[]>({
    queryKey: ["/api/posts/user", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return [];
      const res = await fetch(`/api/posts/user/${profileUserId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!profileUserId,
  });

  // Pinned post
  const pinnedPostId = extendedData?.pinnedPostId;
  const { data: pinnedPost } = useQuery<any>({
    queryKey: ["/api/posts", pinnedPostId],
    queryFn: async () => {
      if (!pinnedPostId) return null;
      const res = await fetch(`/api/posts/${pinnedPostId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!pinnedPostId,
  });

  // Track profile views on load (skip own profile)
  const hasTrackedView = React.useRef(false);
  React.useEffect(() => {
    if (profileUserId && !isOwner && !hasTrackedView.current) {
      hasTrackedView.current = true;
      fetch(`/api/profile/${profileUserId}/view`, { method: "POST" }).catch(() => {});
    }
  }, [profileUserId, isOwner]);

  // Save extended profile data mutation
  const saveExtendedMutation = useMutation({
    mutationFn: async (data: any) => {
      const { getCsrfToken } = await import("@/lib/queryClient");
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/profile/extended", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "x-csrf-token": csrfToken } : {}) },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile", profileUserId, "extended"] });
      refetchExtended();
      toast({ title: "Saved!", description: "Profile updated." });
    },
    onError: () => {
      toast({ title: "Save Failed", variant: "destructive" });
    },
  });

  // Local edit states for extended profile fields
  const [editIssues, setEditIssues] = useState<string[]>([]);
  const [editPinnedPostId, setEditPinnedPostId] = useState<string>("");
  const [editingTimelineIndex, setEditingTimelineIndex] = useState<number | null>(null);
  const [editingTimelineText, setEditingTimelineText] = useState<string>("");
  const [editingTimelineDate, setEditingTimelineDate] = useState<string>("");
  const [pinnedPostSearch, setPinnedPostSearch] = useState<string>("");
  const [editCampaignDonate, setEditCampaignDonate] = useState("");
  const [editCampaignVolunteer, setEditCampaignVolunteer] = useState("");
  const [editTimelineText, setEditTimelineText] = useState("");
  const [editTimelineDate, setEditTimelineDate] = useState("");
  const [editPollQuestion, setEditPollQuestion] = useState("");
  const [editPollOption1, setEditPollOption1] = useState("");
  const [editPollOption2, setEditPollOption2] = useState("");
  const [editElectionDate, setEditElectionDate] = useState("");
  const [widgetVoteOptimistic, setWidgetVoteOptimistic] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { getCsrfToken } = await import("@/lib/queryClient");
      const csrfToken = getCsrfToken();
      const formData = new FormData();
      formData.append("photo", file);
      const response = await fetch("/api/profile/gallery", {
        method: "POST",
        headers: { ...(csrfToken ? { "x-csrf-token": csrfToken } : {}) },
        credentials: "include",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      await refetchExtended();
      toast({ title: "Photo added!", description: "Your gallery has been updated." });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveTop8Mutation = useMutation({
    mutationFn: async (friendIds: string[]) => {
      const { getCsrfToken } = await import("@/lib/queryClient");
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/profile/top8", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "x-csrf-token": csrfToken } : {}) },
        credentials: "include",
        body: JSON.stringify({ friendIds }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to save Top 8");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Top 8 Saved!", description: "Your Top 8 friends have been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/users", profileUserId, "top8"] });
      setEditingModule(null);
    },
    onError: (error: Error) => {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    },
  });

  const [profileModules, setProfileModules] = useState<ProfileModule[]>([]);

  // Load profile modules from user data or set defaults
  React.useEffect(() => {
    if (user) {
      const defaultModules = [
        {
          id: "bio",
          name: "About Me",
          type: "bio" as const,
          isPremium: false,
          isEnabled: true,
          position: 0,
          itemCount: 1,
          customData: {}
        },
        {
          id: "photos",
          name: "Photo Gallery",
          type: "photos" as const,
          isPremium: false,
          isEnabled: true,
          position: 1,
          itemCount: 6,
          customData: {}
        },
        {
          id: "feed",
          name: "Recent Posts",
          type: "feed" as const, 
          isPremium: false,
          isEnabled: true,
          position: 2,
          itemCount: 3,
          customData: {}
        },
        {
          id: "friends",
          name: "Friends List",
          type: "friends" as const,
          isPremium: false,
          isEnabled: true,
          position: 3,
          itemCount: 8,
          customData: {}
        },
        {
          id: "following",
          name: "Following",
          type: "following" as const,
          isPremium: false,
          isEnabled: true,
          position: 4,
          itemCount: 5,
          customData: {}
        },
        {
          id: "music",
          name: "Favorite Song",
          type: "music" as const,
          isPremium: true,
          isEnabled: user.subscriptionStatus === "premium",
          position: 5,
          itemCount: 1,
          customData: {}
        },
        {
          id: "background",
          name: "Custom Background",
          type: "background" as const,
          isPremium: true,
          isEnabled: user.subscriptionStatus === "premium",
          position: 6,
          itemCount: 1,
          customData: {}
        }
      ];

      // Load saved modules or use defaults
      if (user.profileLayout && Array.isArray(user.profileLayout)) {
        setProfileModules(user.profileLayout);
      } else {
        setProfileModules(defaultModules);
      }
    }
  }, [user]);

  const [customization, setCustomization] = useState({
    theme: "blue",
    background: "",
    favoriteSong: "",
    customCSS: "",
    customColors: {
      primary: "#3b82f6",
      secondary: "#1e40af"
    }
  });

  // Update customization state when user data loads
  React.useEffect(() => {
    if (user) {
      setCustomization(prev => ({
        ...prev,
        theme: user.profileTheme || "default",
        background: user.profileBackground || "",
        favoriteSong: user.favoriteSong || ""
      }));
      setBioText(user.bio || "");
    }
  }, [user]);

  const saveBioMutation = useMutation({
    mutationFn: async (bio: string) => {
      const { getCsrfToken } = await import("@/lib/queryClient");
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/profile/bio", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "x-csrf-token": csrfToken } : {}) },
        credentials: "include",
        body: JSON.stringify({ bio }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save bio");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bio Updated!",
        description: "Your bio has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}`] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveCustomizationMutation = useMutation({
    mutationFn: async (data: any) => {
      const { getCsrfToken } = await import("@/lib/queryClient");
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/profile/customize", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "x-csrf-token": csrfToken } : {}) },
        credentials: "include",
        body: JSON.stringify({
          profileTheme: data.theme,
          profileBackground: data.background,
          favoriteSong: data.favoriteSong,
          profileLayout: profileModules
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save customization");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated!",
        description: "Your profile customization has been saved.",
      });
      setEditMode(false);
      // Invalidate both user queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}`] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (userLoading) {
    return <LoadingSpinner />;
  }

  const isPremiumUser = user?.subscriptionStatus === "premium";

  // Helper function to save modules automatically
  const saveModulesAutomatically = (updatedModules: ProfileModule[]) => {
    const currentData = {
      theme: customization.theme,
      background: customization.background,
      favoriteSong: customization.favoriteSong
    };
    
    saveCustomizationMutation.mutate({
      ...currentData,
      profileLayout: updatedModules
    });
  };

  const addNewModule = (type: string) => {
    const moduleTypes = {
      // Free modules
      photos: { name: "Photo Gallery", itemCount: 6, customData: {} },
      feed: { name: "Recent Posts", itemCount: 3, customData: {} },
      friends: { name: "Friends List", itemCount: 8, customData: {} },
      following: { name: "Following", itemCount: 5, customData: {} },
      badges: { name: "Badges & Achievements", itemCount: 6, customData: {} },
      issues: { name: "Issue Interests", itemCount: 5, customData: {} },
      "civic-tracker": { name: "Civic Activity Tracker", itemCount: 1, customData: {} },
      "pinned-post": { name: "Pinned Post", itemCount: 1, customData: {} },
      "debate-history": { name: "Debate History", itemCount: 5, customData: {} },
      events: { name: "Event Participation", itemCount: 4, customData: {} },
      youtube: { name: "YouTube Video", itemCount: 1, customData: { videoUrl: "", height: "200" } },
      // Premium modules
      analytics: { name: "Analytics Dashboard", itemCount: 1, customData: {} },
      "campaign-hub": { name: "Campaign Hub", itemCount: 1, customData: {} },
      "verified-badge": { name: "Verified ID Badge", itemCount: 1, customData: {} },
      "civic-scorecard": { name: "Civic Scorecard", itemCount: 1, customData: {} },
      "media-hub": { name: "Media Hub", itemCount: 3, customData: {} },
      widgets: { name: "Custom Widgets", itemCount: 2, customData: {} },
      "supporter-wall": { name: "Supporter Wall", itemCount: 8, customData: {} },
      "democracy-wrapped": { name: "Democracy Wrapped", itemCount: 1, customData: {} },
      "legacy-timeline": { name: "Legacy Timeline", itemCount: 1, customData: {} }
    };

    const moduleConfig = moduleTypes[type as keyof typeof moduleTypes];
    if (!moduleConfig) return;

    const premiumModules = ["analytics", "campaign-hub", "verified-badge", "civic-scorecard", "media-hub", "widgets", "supporter-wall", "democracy-wrapped", "legacy-timeline"];
    const isPremium = premiumModules.includes(type);

    const newModule: ProfileModule = {
      id: `${type}-${Date.now()}`,
      name: moduleConfig.name,
      type: type as any,
      isPremium: isPremium,
      isEnabled: true,
      position: profileModules.length + 1,
      itemCount: moduleConfig.itemCount,
      customData: moduleConfig.customData
    };

    const updatedModules = [...profileModules, newModule];
    setProfileModules(updatedModules);
    setShowAddModule(false);
    setNewModuleType("");
    
    // Auto-save the changes
    saveModulesAutomatically(updatedModules);
  };
  const themes = [
    // Free patriotic themes
    { value: "red", label: "🔴 Patriot Red" },
    { value: "white", label: "⚪ Classic White" },
    { value: "blue", label: "🔵 Freedom Blue" },
    // Premium gradient themes
    { value: "sunset", label: "🌅 Sunset Gradient", premium: true },
    { value: "ocean", label: "🌊 Ocean Waves", premium: true },
    { value: "purple-galaxy", label: "🌌 Purple Galaxy", premium: true },
    { value: "rainbow", label: "🌈 Rainbow Pride", premium: true },
    { value: "fire", label: "🔥 Fire Gradient", premium: true },
    { value: "emerald", label: "💎 Emerald Dream", premium: true },
    { value: "custom", label: "🎨 Custom Colors", premium: true }
  ];

  const getProfileStyle = () => {
    const baseStyle: React.CSSProperties = {};
    
    if (customization.background && isPremiumUser) {
      baseStyle.backgroundImage = `url(${customization.background})`;
      baseStyle.backgroundSize = "cover";
      baseStyle.backgroundPosition = "center";
    }
    
    // Apply custom gradient for custom theme
    if (customization.theme === 'custom' && isPremiumUser && customization.customColors) {
      baseStyle.background = `linear-gradient(135deg, ${customization.customColors.primary} 0%, ${customization.customColors.secondary} 100%)`;
    }
    
    return baseStyle;
  };

  const getThemeClasses = () => {
    switch (customization.theme) {
      // Free patriotic themes
      case "red":
        return "bg-gradient-to-br from-red-600 to-red-800 text-white";
      case "white":
        return "bg-gradient-to-br from-gray-50 to-white text-gray-900 border border-gray-200";
      case "blue":
        return "bg-gradient-to-br from-blue-600 to-blue-800 text-white";
      // Premium gradient themes
      case "sunset":
        return "bg-gradient-to-br from-orange-400 via-pink-500 to-red-500 text-white";
      case "ocean":
        return "bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600 text-white";
      case "purple-galaxy":
        return "bg-gradient-to-br from-purple-900 via-purple-600 to-pink-500 text-white";
      case "rainbow":
        return "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 text-white";
      case "fire":
        return "bg-gradient-to-br from-yellow-400 via-red-500 to-red-900 text-white";
      case "emerald":
        return "bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 text-white";
      case "custom":
        return "text-white"; // Custom colors handled by inline styles
      default:
        return "bg-gradient-to-br from-blue-600 to-blue-800 text-white";
    }
  };

  const getButtonClasses = () => {
    const isDarkTheme = ['dark', 'neon', 'retro'].includes(customization.theme);
    return isDarkTheme ? 
      "bg-white/20 text-white border-white/30 hover:bg-white/30" : 
      "bg-white text-gray-900 border-gray-300 hover:bg-gray-50";
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      // Get upload URL from object storage
      const { getCsrfToken } = await import("@/lib/queryClient");
      const token = getCsrfToken();
      const uploadResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}) },
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await uploadResponse.json();

      // Upload file to object storage
      const uploadFileResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadFileResponse.ok) {
        throw new Error('File upload failed');
      }

      // Update user avatar with the uploaded file URL
      const updateResponse = await fetch('/api/profile-picture', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}) },
        credentials: 'include',
        body: JSON.stringify({
          profilePictureURL: uploadURL,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update profile picture');
      }

      toast({
        title: "Avatar updated",
        description: "Your profile photo has been updated successfully",
      });

      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const renderProfileModule = (module: ProfileModule) => {
    if (!module.isEnabled) return null;

    const moduleContent = () => {
      switch (module.type) {
        case "bio":
          return (
            <div className="space-y-3">
              {isOwner ? (
                <>
                  <Textarea
                    placeholder="Tell us about yourself... (Who are you? What are your interests? What issues do you care about?)"
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    className="min-h-[120px] resize-y"
                    data-testid="input-bio"
                  />
                  <Button
                    onClick={() => saveBioMutation.mutate(bioText)}
                    disabled={saveBioMutation.isPending}
                    size="sm"
                    data-testid="button-save-bio"
                  >
                    {saveBioMutation.isPending ? "Saving..." : "Save Bio"}
                  </Button>
                </>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap" data-testid="text-bio">
                    {bioText || "No bio yet."}
                  </p>
                </div>
              )}
            </div>
          );
        case "photos": {
          const galleryPhotos: string[] = extendedData?.galleryPhotos || [];
          return (
            <div className="space-y-3">
              {isOwner && (
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <Button size="sm" variant="outline" asChild>
                      <span>
                        {uploadingPhoto ? <Clock className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                        {uploadingPhoto ? "Uploading..." : "Add Photo"}
                      </span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} disabled={uploadingPhoto} />
                  </label>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {galleryPhotos.slice(0, module.itemCount).map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    {isOwner && (
                      <button
                        onClick={() => {
                          const updated = galleryPhotos.filter((_, idx) => idx !== i);
                          saveExtendedMutation.mutate({ galleryPhotos: updated });
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {galleryPhotos.length === 0 && Array.from({ length: Math.min(module.itemCount, 6) }, (_, i) => (
                  <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <Camera className="h-6 w-6 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          );
        }
        case "feed":
          return user?.id ? (
            <FeedModule userId={user.id} itemCount={module.itemCount} username={user.username} />
          ) : null;
        case "friends": {
          const displayFriends = allProfileFriends.slice(0, module.itemCount);
          return (
            <div className="space-y-2">
              {displayFriends.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No friends yet.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {displayFriends.map((friend: any) => (
                    <a key={friend.userId} href={`/profile/${friend.userId}`} className="text-center group">
                      <Avatar className="w-12 h-12 mx-auto mb-1">
                        <AvatarImage src={friend.avatar} alt={friend.username} />
                        <AvatarFallback className="text-xs">
                          {friend.firstName?.[0] || friend.username?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate block group-hover:text-blue-600 transition-colors">
                        {friend.firstName || friend.username}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        }
        case "following": {
          const displayFollowing = followingList.slice(0, module.itemCount);
          return (
            <div className="space-y-2">
              {displayFollowing.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Not following anyone yet.</p>
              ) : (
                displayFollowing.map((u: any) => (
                  <a key={u.id} href={`/profile/${u.id}`} className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-1 transition-colors">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={u.avatar} alt={u.username} />
                      <AvatarFallback className="text-xs">{u.firstName?.[0] || u.username?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-sm font-medium block">{u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.username}</span>
                      <span className="text-xs text-gray-500">@{u.username}</span>
                    </div>
                  </a>
                ))
              )}
            </div>
          );
        }
        case "music":
          return (
            <div className="text-center">
              {customization.favoriteSong ? (
                <div className="p-4 border rounded-lg">
                  <Music className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <p className="font-medium">{customization.favoriteSong}</p>
                  <p className="text-sm text-gray-600">Now Playing</p>
                </div>
              ) : (
                <div className="p-4 border-dashed border-2 border-gray-300 rounded-lg">
                  <Music className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">No favorite song set</p>
                </div>
              )}
            </div>
          );
        case "youtube": {
          const ytVideoId = module.customData?.videoUrl?.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?#]+)/)?.[1];
          return (
            <div className="text-center">
              {module.customData?.videoUrl && ytVideoId ? (
                <div className="relative">
                  <iframe
                    width="100%"
                    height={module.customData?.height || "200"}
                    src={`https://www.youtube-nocookie.com/embed/${ytVideoId}`}
                    title="YouTube video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="rounded-lg"
                  />
                  <a href={`https://www.youtube.com/watch?v=${ytVideoId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 inline-block">Watch on YouTube</a>
                </div>
              ) : (
                <div className="p-4 border-dashed border-2 border-gray-300 rounded-lg">
                  <Youtube className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">{module.customData?.videoUrl ? "Invalid YouTube URL" : "No YouTube video set"}</p>
                </div>
              )}
            </div>
          );
        }
        case "badges": {
          const displayBadges = badges.slice(0, module.itemCount);
          return (
            <div className="grid grid-cols-3 gap-2">
              {displayBadges.length === 0 ? (
                <p className="col-span-3 text-sm text-gray-500 text-center py-4">No badges yet.</p>
              ) : (
                displayBadges.map((badge: any) => (
                  <div key={badge.id} className={`text-center p-2 border rounded-lg ${badge.earned ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200" : "opacity-40 grayscale"}`} title={badge.description}>
                    <Award className={`h-6 w-6 mx-auto mb-1 ${badge.earned ? "text-yellow-500" : "text-gray-400"}`} />
                    <span className="text-xs font-medium leading-tight block">{badge.name}</span>
                    {badge.earned && <CheckCircle className="h-3 w-3 text-green-500 mx-auto mt-0.5" />}
                  </div>
                ))
              )}
            </div>
          );
        }
        case "issues": {
          const savedIssues: string[] = extendedData?.issueInterests || [];
          return (
            <div className="space-y-2">
              {savedIssues.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {isOwner ? "Click edit to select your top issues." : "No issue interests set."}
                </p>
              ) : (
                savedIssues.slice(0, module.itemCount).map((issue: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Flag className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{issue}</span>
                  </div>
                ))
              )}
            </div>
          );
        }
        case "civic-tracker":
          return (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{activityStats?.postsCount ?? "—"}</div>
                <div className="text-xs text-blue-700">Posts Created</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{activityStats?.votesCount ?? "—"}</div>
                <div className="text-xs text-green-700">Polls Voted</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{activityStats?.commentsCount ?? "—"}</div>
                <div className="text-xs text-purple-700">Comments Made</div>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{activityStats?.likesReceived ?? "—"}</div>
                <div className="text-xs text-orange-700">Likes Received</div>
              </div>
            </div>
          );
        case "pinned-post": {
          if (!extendedData?.pinnedPostId) {
            return (
              <div className="p-4 border-dashed border-2 border-gray-300 rounded-lg text-center">
                <Star className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">{isOwner ? "Click edit to pin a post." : "No pinned post."}</p>
              </div>
            );
          }
          if (!pinnedPost) {
            return <div className="p-4 text-sm text-gray-400 text-center">Loading pinned post...</div>;
          }
          return (
            <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Star className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-200 line-clamp-4">{pinnedPost.content}</p>
                  <div className="flex gap-3 mt-2 text-xs text-blue-600">
                    {(pinnedPost.likesCount ?? 0) > 0 && <span>{pinnedPost.likesCount} likes</span>}
                    {pinnedPost.createdAt && <span>{new Date(pinnedPost.createdAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        }
        case "debate-history": {
          const debatePosts = userPostsList.filter((p: any) => p.type === "poll" || p.type === "debate").slice(0, module.itemCount);
          return (
            <div className="space-y-2">
              {debatePosts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No debates or polls yet.</p>
              ) : (
                debatePosts.map((post: any) => (
                  <div key={post.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MessageSquare className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      <span className="text-sm truncate">{post.title || post.content?.slice(0, 50) || "Untitled"}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">{post.likesCount ?? 0} likes</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{post.type}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        }
        case "events": {
          const volunteerPosts = userPostsList.filter((p: any) => p.type === "volunteer").slice(0, module.itemCount);
          return (
            <div className="space-y-2">
              {volunteerPosts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No volunteer events yet.</p>
              ) : (
                volunteerPosts.map((post: any) => (
                  <div key={post.id} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{post.volunteerTitle || post.title || post.content?.slice(0, 40) || "Volunteer Event"}</div>
                      <div className="text-xs text-gray-500">{post.volunteerOrganization || (post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "")}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        }
        case "analytics":
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Profile Views</span>
                <span className="font-bold">{(user?.profileViews ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Followers</span>
                <span className="font-bold">{followers.length.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Following</span>
                <span className="font-bold">{followingList.length.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Friends</span>
                <span className="font-bold">{allProfileFriends.length.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Posts</span>
                <span className="font-bold">{activityStats?.postsCount ?? 0}</span>
              </div>
            </div>
          );
        case "campaign-hub": {
          const donateUrl = extendedData?.campaignHubLinks?.donateUrl;
          const volunteerUrl = extendedData?.campaignHubLinks?.volunteerUrl;
          return (
            <div className="space-y-3">
              {donateUrl ? (
                <a href={donateUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full" variant="default">
                    <Heart className="h-4 w-4 mr-2" />
                    Donate to Campaign
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </a>
              ) : (
                <Button className="w-full" variant="default" disabled={!isOwner}>
                  <Heart className="h-4 w-4 mr-2" />
                  {isOwner ? "Add Donation Link (click edit)" : "No donation link set"}
                </Button>
              )}
              {volunteerUrl ? (
                <a href={volunteerUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Volunteer Sign-Up
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </a>
              ) : (
                <Button className="w-full" variant="outline" disabled={!isOwner}>
                  <Users className="h-4 w-4 mr-2" />
                  {isOwner ? "Add Volunteer Link (click edit)" : "No volunteer link set"}
                </Button>
              )}
            </div>
          );
        }
        case "verified-badge": {
          const isVerified = user?.voterVerificationStatus === "verified";
          const isPremium = user?.subscriptionStatus === "premium";
          return (
            <div className="text-center p-4">
              <Shield className={`h-12 w-12 mx-auto mb-2 ${isVerified ? "text-blue-600" : "text-gray-400"}`} />
              <div className={`font-bold ${isVerified ? "text-blue-900 dark:text-blue-300" : "text-gray-600"}`}>
                {isVerified ? "Verified Citizen" : "Not Verified"}
              </div>
              <div className="text-xs text-gray-500 mt-1 space-y-1">
                <div className={`flex items-center justify-center gap-1 ${isVerified ? "text-green-600" : "text-gray-400"}`}>
                  {isVerified ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {isVerified ? "ID Verified" : user?.voterVerificationStatus === "pending" ? "Verification Pending" : "Not Verified"}
                </div>
                <div className={`flex items-center justify-center gap-1 ${isPremium ? "text-purple-600" : "text-gray-400"}`}>
                  {isPremium ? <Crown className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {isPremium ? "ACP+ Member" : "Free Account"}
                </div>
              </div>
            </div>
          );
        }
        case "civic-scorecard":
          return (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Trust Score</span>
                <span className={`font-bold ${scorecard?.trustGrade?.startsWith("A") ? "text-green-600" : scorecard?.trustGrade?.startsWith("B") ? "text-blue-600" : "text-gray-600"}`}>{scorecard?.trustGrade ?? "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Engagement Grade</span>
                <span className={`font-bold ${scorecard?.engagementGrade?.startsWith("A") ? "text-green-600" : scorecard?.engagementGrade?.startsWith("B") ? "text-blue-600" : "text-gray-600"}`}>{scorecard?.engagementGrade ?? "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Community Grade</span>
                <span className={`font-bold ${scorecard?.communityGrade?.startsWith("A") ? "text-green-600" : scorecard?.communityGrade?.startsWith("B") ? "text-blue-600" : "text-gray-600"}`}>{scorecard?.communityGrade ?? "N/A"}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 pt-1 border-t">
                <span>{scorecard?.postCount ?? 0} posts</span>
                <span>{scorecard?.followerCount ?? 0} followers</span>
                <span>Trust: {scorecard?.trustScore != null ? `${Math.round(scorecard.trustScore * 100)}%` : "N/A"}</span>
              </div>
            </div>
          );
        case "media-hub": {
          const displaySignals = userSignals.slice(0, module.itemCount);
          return (
            <div className="grid grid-cols-1 gap-2">
              {displaySignals.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No videos yet.</p>
              ) : (
                displaySignals.map((signal: any) => (
                  <div key={signal.id} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    {signal.thumbnailUrl ? (
                      <img src={signal.thumbnailUrl} alt={signal.title} className="w-12 h-9 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-9 bg-purple-100 dark:bg-purple-900/30 rounded flex items-center justify-center">
                        <Video className="h-4 w-4 text-purple-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{signal.title || "Untitled Video"}</span>
                      <span className="text-xs text-gray-500">{signal.createdAt ? new Date(signal.createdAt).toLocaleDateString() : ""}</span>
                    </div>
                    {signal.duration && <span className="text-xs text-gray-500 ml-auto">{Math.floor(signal.duration / 60)}:{String(signal.duration % 60).padStart(2, "0")}</span>}
                  </div>
                ))
              )}
            </div>
          );
        }
        case "widgets": {
          const widgetConfig = extendedData?.widgetConfig || {};
          const pollQuestion = widgetConfig.pollQuestion;
          const pollOption1 = widgetConfig.pollOption1 || "Option A";
          const pollOption2 = widgetConfig.pollOption2 || "Option B";
          const electionDate = widgetConfig.electionDate ? new Date(widgetConfig.electionDate) : null;
          const daysUntilElection = electionDate ? Math.max(0, Math.ceil((electionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
          // Backend-persisted vote data with optimistic UI
          const myVote = widgetVoteOptimistic ?? widgetPollData?.myVote ?? null;
          const pollResults = widgetPollData?.results || {};
          const totalVotes = Object.values(pollResults).reduce((s, n) => s + n, 0);
          const opt1Count = pollResults[pollOption1] || 0;
          const opt2Count = pollResults[pollOption2] || 0;
          const opt1Pct = totalVotes > 0 ? Math.round((opt1Count / totalVotes) * 100) : 0;
          const opt2Pct = totalVotes > 0 ? Math.round((opt2Count / totalVotes) * 100) : 0;
          return (
            <div className="space-y-2">
              <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Quick Poll</span>
                  {totalVotes > 0 && <span className="text-xs text-gray-400 ml-auto">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>}
                </div>
                {pollQuestion ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{pollQuestion}</p>
                    {myVote ? (
                      // Show results after voting
                      <div className="space-y-1.5">
                        {[{ opt: pollOption1, count: opt1Count, pct: opt1Pct }, { opt: pollOption2, count: opt2Count, pct: opt2Pct }].map(({ opt, count, pct }) => (
                          <div key={opt}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className={myVote === opt ? "font-semibold" : ""}>{opt} {myVote === opt && "✓"}</span>
                              <span>{pct}% ({count})</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${myVote === opt ? "bg-yellow-400" : "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => castWidgetVoteMutation.mutate(pollOption1)}
                          disabled={castWidgetVoteMutation.isPending}
                          className="flex-1 text-xs py-1 px-2 rounded border border-gray-200 bg-white hover:bg-yellow-50 transition-colors"
                        >{pollOption1}</button>
                        <button
                          onClick={() => castWidgetVoteMutation.mutate(pollOption2)}
                          disabled={castWidgetVoteMutation.isPending}
                          className="flex-1 text-xs py-1 px-2 rounded border border-gray-200 bg-white hover:bg-yellow-50 transition-colors"
                        >{pollOption2}</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">{isOwner ? "Click edit to set a poll question." : "No poll set."}</p>
                )}
              </div>
              <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Election Countdown</span>
                </div>
                {daysUntilElection !== null ? (
                  <p className="text-sm font-bold text-green-700">{daysUntilElection} days until {electionDate?.toLocaleDateString()}</p>
                ) : (
                  <p className="text-xs text-gray-500">{isOwner ? "Click edit to set an election date." : "No election date set."}</p>
                )}
              </div>
            </div>
          );
        }
        case "supporter-wall": {
          const displayFollowers = followers.slice(0, module.itemCount);
          return (
            <div className="grid grid-cols-4 gap-2">
              {displayFollowers.length === 0 ? (
                <p className="col-span-4 text-sm text-gray-500 text-center py-4">No supporters yet.</p>
              ) : (
                displayFollowers.map((follower: any) => (
                  <a key={follower.id} href={`/profile/${follower.id}`} className="text-center group">
                    <Avatar className="w-10 h-10 mx-auto mb-1">
                      <AvatarImage src={follower.avatar} alt={follower.username} />
                      <AvatarFallback className="text-xs bg-green-100 text-green-700">
                        {follower.firstName?.[0] || follower.username?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs truncate block group-hover:text-green-600 transition-colors">
                      {follower.firstName || follower.username}
                    </span>
                  </a>
                ))
              )}
            </div>
          );
        }
        case "democracy-wrapped":
          return (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 rounded-lg text-center">
                <Star className="h-8 w-8 mx-auto mb-2" />
                <div className="font-bold">{wrappedYear} Democracy Wrapped</div>
                <div className="text-sm opacity-90">
                  {wrappedData ? `${wrappedData.postsWritten} posts · ${wrappedData.votesCast} votes · ${wrappedData.commentsMade} comments` : "Your year in civic engagement"}
                </div>
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => setWrappedExpanded(e => !e)}>
                  {wrappedExpanded ? "Hide Report" : "View Report"}
                </Button>
              </div>
              {wrappedExpanded && wrappedData && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-xl font-bold text-purple-600">{wrappedData.postsWritten}</div>
                    <div className="text-xs text-gray-600">Posts Written</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">{wrappedData.votesCast}</div>
                    <div className="text-xs text-gray-600">Votes Cast</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-xl font-bold text-green-600">{wrappedData.commentsMade}</div>
                    <div className="text-xs text-gray-600">Comments Made</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-xl font-bold text-orange-600">{wrappedData.friendsAdded}</div>
                    <div className="text-xs text-gray-600">Friends Added</div>
                  </div>
                  <div className="col-span-2 text-center p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                    <div className="text-xl font-bold text-pink-600">{wrappedData.likesReceived}</div>
                    <div className="text-xs text-gray-600">Likes Received</div>
                  </div>
                </div>
              )}
            </div>
          );
        case "legacy-timeline": {
          const timeline: Array<{text: string; date: string}> = extendedData?.legacyTimeline || [];
          const sortedTimeline = [...timeline].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const dotColors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"];
          return (
            <div className="space-y-3">
              {sortedTimeline.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">{isOwner ? "Click edit to add milestones." : "No timeline entries yet."}</p>
              ) : (
                sortedTimeline.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2 group">
                    <div className={`w-2 h-2 ${dotColors[i % dotColors.length]} rounded-full mt-1.5 flex-shrink-0`}></div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">{entry.text}</span>
                      <span className="text-xs text-gray-400 ml-2">{new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => {
                          const updated = timeline.filter((_, idx) => idx !== i);
                          saveExtendedMutation.mutate({ legacyTimeline: updated });
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          );
        }
        case "political-compass":
          return (
            <div className="space-y-3">
              <div className="text-center mb-3">
                <h4 className="font-medium text-sm">My Political Position</h4>
              </div>
              <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 border rounded-lg p-4">
                {/* Political Compass Grid */}
                <svg viewBox="0 0 200 200" className="w-full h-40">
                  {/* Grid lines */}
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="200" height="200" fill="url(#grid)" />
                  
                  {/* Main axes */}
                  <line x1="100" y1="0" x2="100" y2="200" stroke="#9ca3af" strokeWidth="2"/>
                  <line x1="0" y1="100" x2="200" y2="100" stroke="#9ca3af" strokeWidth="2"/>
                  
                  {/* Quadrant colors */}
                  <rect x="0" y="0" width="100" height="100" fill="#ef4444" fillOpacity="0.1"/>
                  <rect x="100" y="0" width="100" height="100" fill="#3b82f6" fillOpacity="0.1"/>
                  <rect x="0" y="100" width="100" height="100" fill="#10b981" fillOpacity="0.1"/>
                  <rect x="100" y="100" width="100" height="100" fill="#f59e0b" fillOpacity="0.1"/>
                  
                  {/* User position - Sample data for now */}
                  <circle 
                    cx={module.customData?.economicPosition || 120} 
                    cy={module.customData?.socialPosition || 80} 
                    r="6" 
                    fill="#dc2626" 
                    stroke="#fff" 
                    strokeWidth="2"
                  />
                </svg>
                
                {/* Axis labels */}
                <div className="flex justify-between text-xs text-gray-600 mt-2">
                  <span>Socialist</span>
                  <span>Capitalist</span>
                </div>
                <div className="flex flex-col items-center justify-between h-12 absolute left-0 top-0 -ml-1 text-xs text-gray-600">
                  <span className="transform -rotate-90 whitespace-nowrap">Authoritarian</span>
                </div>
                <div className="flex flex-col items-center justify-between h-12 absolute left-0 bottom-0 -ml-1 text-xs text-gray-600">
                  <span className="transform -rotate-90 whitespace-nowrap">Libertarian</span>
                </div>
              </div>
              
              {/* Take Quiz Button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setShowPoliticalQuiz(true);
                  setCurrentQuizStep(0);
                  setQuizAnswers({});
                }}
              >
                <Target className="h-4 w-4 mr-2" />
                {module.customData?.hasResults ? "Retake Quiz" : "Take Political Quiz"}
              </Button>
            </div>
          );
        default:
          return <p className="text-gray-500">Module content coming soon...</p>;
      }
    };

    return (
      <Card key={module.id} className="relative" data-testid={`profile-module-${module.type}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-1">
              {module.name}
              {module.isPremium && <Crown className="h-3 w-3 text-yellow-500" />}
            </span>
            <div className="flex items-center gap-2">
              {isOwner && (
                <Dialog open={editingModule === module.id} onOpenChange={(open) => {
                    setEditingModule(open ? module.id : null);
                    if (open && module.type === "friends") {
                      setTop8Selection(top8Friends.map((f: any) => f.userId));
                    }
                  }}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      data-testid={`edit-module-${module.type}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit {module.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`enabled-${module.id}`}
                          checked={module.isEnabled}
                          onCheckedChange={(checked) => {
                            if (module.isPremium && !isPremiumUser && checked) {
                              toast({
                                title: "Premium Feature",
                                description: "This feature requires ACP+ subscription.",
                                variant: "destructive",
                              });
                              return;
                            }
                            const updatedModules = profileModules.map(m => m.id === module.id ? {...m, isEnabled: checked} : m);
                            setProfileModules(updatedModules);
                            saveModulesAutomatically(updatedModules);
                          }}
                          disabled={module.isPremium && !isPremiumUser}
                        />
                        <Label htmlFor={`enabled-${module.id}`} className="text-sm">
                          Show this module on profile
                        </Label>
                      </div>
                      
                      {module.isEnabled && (
                        <>
                          {module.type !== "friends" && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Number of items to display</Label>
                            <Select 
                              value={module.itemCount.toString()} 
                              onValueChange={(value) => {
                                const updatedModules = profileModules.map(m => m.id === module.id ? {...m, itemCount: parseInt(value)} : m);
                                setProfileModules(updatedModules);
                                saveModulesAutomatically(updatedModules);
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((count) => (
                                  <SelectItem key={count} value={count.toString()}>
                                    {count} {count === 1 ? 'item' : 'items'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          )}
                          
                          {/* Friends (Top 8) specific configuration */}
                          {module.type === "friends" && isOwner && (
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Choose Top 8 Friends</Label>
                              {allFriends.length === 0 ? (
                                <p className="text-sm text-gray-500">You have no accepted friends yet.</p>
                              ) : (
                                <>
                                  <p className="text-xs text-gray-500">
                                    Select up to 8 friends to feature on your profile. ({top8Selection.length}/8 selected)
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                    {allFriends.map((friend: any) => {
                                      const isSelected = top8Selection.includes(friend.userId);
                                      return (
                                        <button
                                          key={friend.userId}
                                          type="button"
                                          onClick={() => {
                                            setTop8Selection(prev => {
                                              if (prev.includes(friend.userId)) {
                                                return prev.filter(id => id !== friend.userId);
                                              }
                                              if (prev.length >= 8) return prev;
                                              return [...prev, friend.userId];
                                            });
                                          }}
                                          className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                                            isSelected
                                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                                              : "border-gray-200 hover:border-gray-300"
                                          }`}
                                        >
                                          <Avatar className="w-8 h-8 shrink-0">
                                            <AvatarImage src={friend.avatar} alt={friend.username} />
                                            <AvatarFallback className="text-xs">
                                              {friend.firstName?.[0] || friend.username?.[0] || "?"}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-xs font-medium truncate">
                                            {friend.firstName ? `${friend.firstName} ${friend.lastName || ""}`.trim() : friend.username}
                                          </span>
                                          {isSelected && (
                                            <span className="ml-auto text-white bg-blue-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                                              {top8Selection.indexOf(friend.userId) + 1}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <Button
                                    onClick={() => saveTop8Mutation.mutate(top8Selection)}
                                    disabled={saveTop8Mutation.isPending}
                                    size="sm"
                                    className="w-full"
                                  >
                                    {saveTop8Mutation.isPending ? "Saving..." : "Save Top 8"}
                                  </Button>
                                </>
                              )}
                            </div>
                          )}

                          {/* YouTube-specific configuration */}
                          {module.type === "youtube" && (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium">YouTube Video URL</Label>
                              <Input
                                type="url"
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={module.customData?.videoUrl || ""}
                                onChange={(e) => {
                                  const updatedModules = profileModules.map(m => m.id === module.id ? {
                                    ...m, 
                                    customData: { ...m.customData, videoUrl: e.target.value }
                                  } : m);
                                  setProfileModules(updatedModules);
                                  saveModulesAutomatically(updatedModules);
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Video Height</Label>
                              <Select 
                                value={module.customData?.height || "200"} 
                                onValueChange={(value) => {
                                  const updatedModules = profileModules.map(m => m.id === module.id ? {
                                    ...m, 
                                    customData: { ...m.customData, height: value }
                                  } : m);
                                  setProfileModules(updatedModules);
                                  saveModulesAutomatically(updatedModules);
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="150">Small (150px)</SelectItem>
                                  <SelectItem value="200">Medium (200px)</SelectItem>
                                  <SelectItem value="300">Large (300px)</SelectItem>
                                  <SelectItem value="400">Extra Large (400px)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                          {/* Issue Interests specific configuration */}
                          {module.type === "issues" && (
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Select Your Top Issues</Label>
                              <p className="text-xs text-gray-500">Pick issues you care about (up to 10)</p>
                              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                                {PRESET_ISSUES.map((issue) => {
                                  const selected = (extendedData?.issueInterests || []).includes(issue);
                                  return (
                                    <button
                                      key={issue}
                                      type="button"
                                      onClick={() => {
                                        const current: string[] = extendedData?.issueInterests || [];
                                        const updated = selected
                                          ? current.filter((i: string) => i !== issue)
                                          : current.length < 10 ? [...current, issue] : current;
                                        saveExtendedMutation.mutate({ issueInterests: updated });
                                      }}
                                      className={`text-left text-xs p-2 rounded-lg border transition-colors ${selected ? "border-blue-500 bg-blue-50 dark:bg-blue-950 font-medium" : "border-gray-200 hover:border-gray-300"}`}
                                    >
                                      {selected && "✓ "}{issue}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Pinned Post specific configuration */}
                          {module.type === "pinned-post" && (
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Select a Post to Pin</Label>
                              <Input
                                placeholder="Search your posts..."
                                value={pinnedPostSearch}
                                onChange={(e) => setPinnedPostSearch(e.target.value)}
                              />
                              <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-1">
                                {userPostsList.length === 0 ? (
                                  <p className="text-xs text-gray-500 text-center py-4">No posts found.</p>
                                ) : (
                                  userPostsList
                                    .filter((p: any) => !pinnedPostSearch || (p.content || p.title || "").toLowerCase().includes(pinnedPostSearch.toLowerCase()))
                                    .slice(0, 20)
                                    .map((post: any) => {
                                      const isSelected = extendedData?.pinnedPostId === String(post.id);
                                      return (
                                        <button
                                          key={post.id}
                                          type="button"
                                          onClick={() => {
                                            saveExtendedMutation.mutate({ pinnedPostId: String(post.id) });
                                            setPinnedPostSearch("");
                                          }}
                                          disabled={saveExtendedMutation.isPending}
                                          className={`w-full text-left text-xs p-2 rounded transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-950 border border-blue-400" : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent"}`}
                                        >
                                          <div className="flex items-center gap-2">
                                            {isSelected && <Star className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                                            <span className="truncate">{post.content?.slice(0, 80) || post.title || `Post #${post.id}`}</span>
                                          </div>
                                          <span className="text-gray-400 ml-auto">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}</span>
                                        </button>
                                      );
                                    })
                                )}
                              </div>
                              {extendedData?.pinnedPostId && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600 text-xs">Currently pinned post #{extendedData.pinnedPostId}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 h-6"
                                    onClick={() => saveExtendedMutation.mutate({ pinnedPostId: null })}
                                  >
                                    Unpin
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Campaign Hub specific configuration */}
                          {module.type === "campaign-hub" && (
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Campaign Links</Label>
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs text-gray-500">Donation URL</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="url"
                                      placeholder="https://..."
                                      value={editCampaignDonate}
                                      onChange={(e) => setEditCampaignDonate(e.target.value)}
                                      className="flex-1"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        saveExtendedMutation.mutate({
                                          campaignHubLinks: {
                                            ...(extendedData?.campaignHubLinks || {}),
                                            donateUrl: editCampaignDonate.trim() || null,
                                          }
                                        });
                                        setEditCampaignDonate("");
                                      }}
                                      disabled={saveExtendedMutation.isPending}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                  {extendedData?.campaignHubLinks?.donateUrl && (
                                    <p className="text-xs text-green-600 mt-1">Current: {extendedData.campaignHubLinks.donateUrl}</p>
                                  )}
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Volunteer Sign-Up URL</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="url"
                                      placeholder="https://..."
                                      value={editCampaignVolunteer}
                                      onChange={(e) => setEditCampaignVolunteer(e.target.value)}
                                      className="flex-1"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        saveExtendedMutation.mutate({
                                          campaignHubLinks: {
                                            ...(extendedData?.campaignHubLinks || {}),
                                            volunteerUrl: editCampaignVolunteer.trim() || null,
                                          }
                                        });
                                        setEditCampaignVolunteer("");
                                      }}
                                      disabled={saveExtendedMutation.isPending}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                  {extendedData?.campaignHubLinks?.volunteerUrl && (
                                    <p className="text-xs text-green-600 mt-1">Current: {extendedData.campaignHubLinks.volunteerUrl}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Legacy Timeline specific configuration */}
                          {module.type === "legacy-timeline" && (
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Add New Milestone</Label>
                              <div className="space-y-2">
                                <Input
                                  placeholder="Milestone description..."
                                  value={editTimelineText}
                                  onChange={(e) => setEditTimelineText(e.target.value)}
                                />
                                <Input
                                  type="date"
                                  value={editTimelineDate}
                                  onChange={(e) => setEditTimelineDate(e.target.value)}
                                />
                                <Button
                                  size="sm"
                                  className="w-full"
                                  onClick={() => {
                                    if (editTimelineText.trim() && editTimelineDate) {
                                      const current: Array<{text: string; date: string}> = extendedData?.legacyTimeline || [];
                                      saveExtendedMutation.mutate({
                                        legacyTimeline: [...current, { text: editTimelineText.trim(), date: editTimelineDate }]
                                      });
                                      setEditTimelineText("");
                                      setEditTimelineDate("");
                                    }
                                  }}
                                  disabled={saveExtendedMutation.isPending || !editTimelineText.trim() || !editTimelineDate}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Milestone
                                </Button>
                              </div>
                              {(extendedData?.legacyTimeline || []).length > 0 && (
                                <div className="space-y-1 max-h-52 overflow-y-auto">
                                  <Label className="text-xs text-gray-500">Edit existing milestones:</Label>
                                  {(extendedData.legacyTimeline ?? []).map((entry, i) => (
                                    <div key={i} className="border rounded-lg p-2 bg-gray-50 dark:bg-gray-800 space-y-1.5">
                                      {editingTimelineIndex === i ? (
                                        // Inline edit form
                                        <div className="space-y-1.5">
                                          <Input
                                            value={editingTimelineText}
                                            onChange={(e) => setEditingTimelineText(e.target.value)}
                                            className="h-7 text-xs"
                                          />
                                          <Input
                                            type="date"
                                            value={editingTimelineDate}
                                            onChange={(e) => setEditingTimelineDate(e.target.value)}
                                            className="h-7 text-xs"
                                          />
                                          <div className="flex gap-1">
                                            <Button
                                              size="sm"
                                              className="h-6 text-xs flex-1"
                                              onClick={() => {
                                                if (editingTimelineText.trim() && editingTimelineDate) {
                                                  const updated = (extendedData.legacyTimeline ?? []).map((e, idx) =>
                                                    idx === i ? { text: editingTimelineText.trim(), date: editingTimelineDate } : e
                                                  );
                                                  saveExtendedMutation.mutate({ legacyTimeline: updated });
                                                  setEditingTimelineIndex(null);
                                                }
                                              }}
                                              disabled={saveExtendedMutation.isPending}
                                            >Save</Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 text-xs"
                                              onClick={() => setEditingTimelineIndex(null)}
                                            >Cancel</Button>
                                          </div>
                                        </div>
                                      ) : (
                                        // Display row with edit + delete buttons
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">{entry.text}</p>
                                            <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString()}</p>
                                          </div>
                                          <div className="flex gap-1 flex-shrink-0">
                                            <button
                                              onClick={() => {
                                                setEditingTimelineIndex(i);
                                                setEditingTimelineText(entry.text);
                                                setEditingTimelineDate(entry.date);
                                              }}
                                              className="text-blue-400 hover:text-blue-600"
                                              title="Edit"
                                            >
                                              <Edit className="h-3 w-3" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                const updated = (extendedData.legacyTimeline ?? []).filter((_, idx) => idx !== i);
                                                saveExtendedMutation.mutate({ legacyTimeline: updated });
                                              }}
                                              className="text-red-400 hover:text-red-600"
                                              title="Delete"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Custom Widgets specific configuration */}
                          {module.type === "widgets" && (
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Widget Settings</Label>
                              <div>
                                <Label className="text-xs text-gray-500">Poll Question</Label>
                                <Input
                                  placeholder="e.g. Should we raise the minimum wage?"
                                  value={editPollQuestion}
                                  onChange={(e) => setEditPollQuestion(e.target.value)}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs text-gray-500">Option A</Label>
                                  <Input
                                    placeholder="Yes"
                                    value={editPollOption1}
                                    onChange={(e) => setEditPollOption1(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Option B</Label>
                                  <Input
                                    placeholder="No"
                                    value={editPollOption2}
                                    onChange={(e) => setEditPollOption2(e.target.value)}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Election Date (for countdown)</Label>
                                <Input
                                  type="date"
                                  value={editElectionDate}
                                  onChange={(e) => setEditElectionDate(e.target.value)}
                                />
                              </div>
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                  saveExtendedMutation.mutate({
                                    widgetConfig: {
                                      pollQuestion: editPollQuestion.trim() || extendedData?.widgetConfig?.pollQuestion || null,
                                      pollOption1: editPollOption1.trim() || extendedData?.widgetConfig?.pollOption1 || "Yes",
                                      pollOption2: editPollOption2.trim() || extendedData?.widgetConfig?.pollOption2 || "No",
                                      electionDate: editElectionDate || extendedData?.widgetConfig?.electionDate || null,
                                    }
                                  });
                                  setEditPollQuestion("");
                                  setEditPollOption1("");
                                  setEditPollOption2("");
                                  setEditElectionDate("");
                                }}
                                disabled={saveExtendedMutation.isPending}
                              >
                                Save Widget Settings
                              </Button>
                            </div>
                          )}

                        </>
                      )}
                      
                      <div className="flex justify-between pt-4">
                        <Button 
                          onClick={() => {
                            const updatedModules = profileModules.filter(m => m.id !== module.id);
                            setProfileModules(updatedModules);
                            setEditingModule(null);
                            saveModulesAutomatically(updatedModules);
                          }}
                          variant="destructive"
                          size="sm"
                        >
                          Delete Module
                        </Button>
                        <Button 
                          onClick={() => setEditingModule(null)}
                          variant="outline"
                          size="sm"
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {editMode && isOwner && (
                <Switch
                  checked={module.isEnabled}
                  onCheckedChange={(checked) => {
                    if (module.isPremium && !isPremiumUser && checked) {
                      toast({
                        title: "Premium Feature",
                        description: "This feature requires ACP+ subscription.",
                        variant: "destructive",
                      });
                      return;
                    }
                    const updatedModules = profileModules.map(m => m.id === module.id ? {...m, isEnabled: checked} : m);
                    setProfileModules(updatedModules);
                    saveModulesAutomatically(updatedModules);
                  }}
                  disabled={module.isPremium && !isPremiumUser}
                />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {moduleContent()}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className={`relative overflow-hidden ${getThemeClasses()}`} style={getProfileStyle()}>
        <div className="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-sm"></div>
        <CardContent className="relative z-10 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center group">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-white" />
                )}
                
                {isOwner && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      {uploadingAvatar ? (
                        <LoadingSpinner className="h-6 w-6 text-white" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user?.username
                  }
                </h1>
                <p className="opacity-90">@{user?.username}</p>
                {isPremiumUser && (
                  <Badge className="mt-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                    ACP+ Member
                  </Badge>
                )}
              </div>
            </div>

            {isOwner ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={getButtonClasses()}
                  onClick={() => {
                    setEditMode(!editMode);
                    setPreviewMode(false);
                  }}
                  data-testid="button-edit-profile"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {editMode ? "Cancel" : "Customize"}
                </Button>
                {editMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={getButtonClasses()}
                    onClick={() => setPreviewMode(!previewMode)}
                    data-testid="button-preview-profile"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                )}
              </div>
            ) : user?.id && (
              <FriendButton 
                userId={user.id} 
                username={user.username}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30"
              />
            )}
          </div>

          {user?.bio && (
            <p className="opacity-90 mb-4">{user.bio}</p>
          )}
        </CardContent>
      </Card>

      {/* Customization Controls */}
      {editMode && isOwner && !previewMode && (
        <Card data-testid="customization-controls">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Profile Customization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Theme</Label>
                <Select
                  value={customization.theme}
                  onValueChange={(value) => setCustomization(prev => ({...prev, theme: value}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map((theme) => (
                      <SelectItem 
                        key={theme.value} 
                        value={theme.value}
                        disabled={theme.premium && !isPremiumUser}
                      >
                        <div className="flex items-center gap-2">
                          {theme.label}
                          {theme.premium && <Crown className="h-3 w-3 text-yellow-500" />}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isPremiumUser && (
                <div>
                  <Label>Background Image URL</Label>
                  <Input
                    value={customization.background}
                    onChange={(e) => setCustomization(prev => ({...prev, background: e.target.value}))}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              )}
            </div>

            {/* Custom Color Pickers for Premium Users */}
            {isPremiumUser && customization.theme === 'custom' && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50">
                <div>
                  <Label className="flex items-center gap-2">
                    <Crown className="h-3 w-3 text-yellow-500" />
                    Primary Color
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customization.customColors?.primary || "#3b82f6"}
                      onChange={(e) => setCustomization(prev => ({
                        ...prev, 
                        customColors: { ...prev.customColors, primary: e.target.value }
                      }))}
                      className="w-16 h-10 p-1 border rounded cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customization.customColors?.primary || "#3b82f6"}
                      onChange={(e) => setCustomization(prev => ({
                        ...prev, 
                        customColors: { ...prev.customColors, primary: e.target.value }
                      }))}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Crown className="h-3 w-3 text-yellow-500" />
                    Secondary Color
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customization.customColors?.secondary || "#1e40af"}
                      onChange={(e) => setCustomization(prev => ({
                        ...prev, 
                        customColors: { ...prev.customColors, secondary: e.target.value }
                      }))}
                      className="w-16 h-10 p-1 border rounded cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customization.customColors?.secondary || "#1e40af"}
                      onChange={(e) => setCustomization(prev => ({
                        ...prev, 
                        customColors: { ...prev.customColors, secondary: e.target.value }
                      }))}
                      placeholder="#1e40af"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {isPremiumUser && (
              <div>
                <Label>Favorite Song</Label>
                <Input
                  value={customization.favoriteSong}
                  onChange={(e) => setCustomization(prev => ({...prev, favoriteSong: e.target.value}))}
                  placeholder="Artist - Song Title"
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => saveCustomizationMutation.mutate(customization)}
                disabled={saveCustomizationMutation.isPending}
                data-testid="button-save-customization"
              >
                {saveCustomizationMutation.isPending ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profileModules
          .sort((a, b) => a.position - b.position)
          .map(renderProfileModule)
        }
        
        {/* Add Module Card - Only show when logged in and in edit mode */}
        {isOwner && (
          <Card className="relative border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors" data-testid="add-module-card">
            <Dialog open={showAddModule} onOpenChange={setShowAddModule}>
              <DialogTrigger asChild>
                <div className="p-6 text-center cursor-pointer h-full flex flex-col items-center justify-center min-h-[200px]">
                  <Plus className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-600 font-medium">Add Module</p>
                  <p className="text-sm text-gray-500">Customize your profile</p>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add a Module</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Choose a module type to add to your profile:</p>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-gray-900">Free Modules</h4>
                      <div className="space-y-2">
                        {[
                          { type: "photos", name: "Photo Gallery", icon: Camera, description: "Upload and showcase images" },
                          { type: "feed", name: "Recent Posts", icon: MessageSquare, description: "Personal activity feed" },
                          { type: "friends", name: "Friends List", icon: Users, description: "Connections you highlight" },
                          { type: "following", name: "Following", icon: Heart, description: "Who you follow and who follows you" },
                          { type: "badges", name: "Badges & Achievements", icon: Award, description: "Earned through voting, debates, contributions" },
                          { type: "issues", name: "Issue Interests", icon: Flag, description: "Healthcare, corruption, climate issues displayed" },
                          { type: "civic-tracker", name: "Civic Activity Tracker", icon: BarChart3, description: "Votes cast, polls participated, events joined" },
                          { type: "pinned-post", name: "Pinned Post", icon: Star, description: "Highlight a personal statement, meme, or campaign" },
                          { type: "debate-history", name: "Debate History", icon: MessageSquare, description: "Timeline of debates with win/loss tallies" },
                          { type: "events", name: "Event Participation", icon: Calendar, description: "Rallies, protests, town halls you've RSVP'd to" },
                          { type: "political-compass", name: "Political Compass", icon: Target, description: "Show your political position on economic and social axes" },
                          { type: "youtube", name: "YouTube Video", icon: Youtube, description: "Embed a YouTube video with custom size" }
                        ].map((moduleType) => {
                          const IconComponent = moduleType.icon;
                          return (
                            <Button
                              key={moduleType.type}
                              variant="outline"
                              className="w-full justify-start h-auto p-3"
                              onClick={() => addNewModule(moduleType.type)}
                              data-testid={`add-module-${moduleType.type}`}
                            >
                              <div className="flex items-center gap-3">
                                <IconComponent className="h-4 w-4" />
                                <div className="text-left">
                                  <p className="font-medium text-sm">{moduleType.name}</p>
                                  <p className="text-xs text-gray-500">{moduleType.description}</p>
                                </div>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-purple-900 flex items-center gap-1">
                        <CrownIcon className="h-3 w-3" /> Premium Modules (ACP+)
                      </h4>
                      <div className="space-y-2">
                        {[
                          { type: "analytics", name: "Analytics Dashboard", icon: TrendingUp, description: "Profile views, post reach, follower growth over time" },
                          { type: "campaign-hub", name: "Campaign Hub", icon: Users, description: "Donation button, volunteer sign-up, event calendar" },
                          { type: "verified-badge", name: "Verified ID Badge", icon: Shield, description: "Official verification with premium visual seal" },
                          { type: "civic-scorecard", name: "Civic Scorecard", icon: BarChart3, description: "AI-curated contribution and community trust report" },
                          { type: "media-hub", name: "Media Hub", icon: Video, description: "Host videos, podcasts, live streams on your profile" },
                          { type: "widgets", name: "Custom Widgets", icon: Zap, description: "Poll widget, petition widget, election countdown" },
                          { type: "supporter-wall", name: "Supporter Wall", icon: Heart, description: "List of people who've donated or endorsed you" },
                          { type: "democracy-wrapped", name: "Democracy Wrapped", icon: Star, description: "Annual Spotify-style recap with shareable graphics" },
                          { type: "legacy-timeline", name: "Legacy Timeline", icon: Calendar, description: "Your entire ACP journey as scrollable story" }
                        ].map((moduleType) => {
                          const IconComponent = moduleType.icon;
                          const isDisabled = !isPremiumUser;
                          return (
                            <Button
                              key={moduleType.type}
                              variant="outline"
                              className={`w-full justify-start h-auto p-3 ${isDisabled ? 'opacity-50' : ''}`}
                              onClick={() => {
                                if (isDisabled) {
                                  toast({
                                    title: "Premium Feature",
                                    description: "This module requires ACP+ subscription.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                addNewModule(moduleType.type);
                              }}
                              data-testid={`add-module-${moduleType.type}`}
                              disabled={isDisabled}
                            >
                              <div className="flex items-center gap-3">
                                <IconComponent className="h-4 w-4" />
                                <div className="text-left">
                                  <p className="font-medium text-sm flex items-center gap-1">
                                    {moduleType.name}
                                    <CrownIcon className="h-3 w-3 text-yellow-500" />
                                  </p>
                                  <p className="text-xs text-gray-500">{moduleType.description}</p>
                                </div>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={() => setShowAddModule(false)}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </Card>
        )}
      </div>

      {/* Political Compass Quiz Dialog */}
      <Dialog open={showPoliticalQuiz} onOpenChange={setShowPoliticalQuiz}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Political Compass Quiz
            </DialogTitle>
          </DialogHeader>
          
          {currentQuizStep < politicalQuizQuestions.length ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Question {currentQuizStep + 1} of {politicalQuizQuestions.length}
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all" 
                  style={{ width: `${((currentQuizStep + 1) / politicalQuizQuestions.length) * 100}%` }}
                />
              </div>
              
              <div className="py-4">
                <h3 className="font-medium mb-4">
                  {politicalQuizQuestions[currentQuizStep]?.text}
                </h3>
                
                <div className="space-y-2">
                  {[
                    { value: 1, label: "Strongly Disagree", color: "bg-red-100 hover:bg-red-200 text-red-800" },
                    { value: 2, label: "Disagree", color: "bg-orange-100 hover:bg-orange-200 text-orange-800" },
                    { value: 3, label: "Neutral", color: "bg-gray-100 hover:bg-gray-200 text-gray-800" },
                    { value: 4, label: "Agree", color: "bg-blue-100 hover:bg-blue-200 text-blue-800" },
                    { value: 5, label: "Strongly Agree", color: "bg-green-100 hover:bg-green-200 text-green-800" }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant="outline"
                      className={`w-full justify-start h-auto p-3 ${option.color} ${quizAnswers[politicalQuizQuestions[currentQuizStep]?.id] === option.value ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => {
                        const questionId = politicalQuizQuestions[currentQuizStep]?.id;
                        if (questionId) {
                          setQuizAnswers(prev => ({ ...prev, [questionId]: option.value }));
                          
                          // Auto-advance after a short delay
                          setTimeout(() => {
                            if (currentQuizStep < politicalQuizQuestions.length - 1) {
                              setCurrentQuizStep(prev => prev + 1);
                            }
                          }, 300);
                        }
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentQuizStep(prev => Math.max(0, prev - 1))}
                  disabled={currentQuizStep === 0}
                >
                  Previous
                </Button>
                <Button 
                  onClick={() => {
                    if (currentQuizStep < politicalQuizQuestions.length - 1) {
                      setCurrentQuizStep(prev => prev + 1);
                    }
                  }}
                  disabled={!quizAnswers[politicalQuizQuestions[currentQuizStep]?.id] || currentQuizStep >= politicalQuizQuestions.length - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : (
            // Quiz Results
            <div className="space-y-4 text-center">
              <div className="text-green-600 mb-4">
                <Target className="h-12 w-12 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">Quiz Complete!</h3>
              </div>
              
              <p className="text-gray-600">
                You've answered all {politicalQuizQuestions.length} questions. 
                Your political position will be calculated and displayed on your profile.
              </p>
              
              <div className="flex gap-2 justify-center">
                <Button onClick={finishQuiz}>
                  Save Results
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCurrentQuizStep(0);
                    setQuizAnswers({});
                  }}
                >
                  Retake Quiz
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!isPremiumUser && isOwner && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="p-6 text-center">
            <Crown className="h-12 w-12 mx-auto mb-4 text-purple-600" />
            <h3 className="text-lg font-semibold mb-2">Unlock Premium Profile Features</h3>
            <p className="text-gray-600 mb-4">
              Get ACP+ to access custom themes, backgrounds, favorite songs, and more MySpace-style customization options!
            </p>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              Upgrade to ACP+
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}