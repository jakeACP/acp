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
  Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { FriendButton } from "@/components/friend-button";
import { apiRequest } from "@/lib/queryClient";

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
      const response = await fetch("/api/profile/bio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
      const response = await fetch("/api/profile/customize", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
      const uploadResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        case "photos":
          return (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: module.itemCount }, (_, i) => (
                <div key={i + 1} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                  <Camera className="h-6 w-6 text-gray-400" />
                </div>
              ))}
            </div>
          );
        case "feed":
          return (
            <div className="space-y-3">
              {Array.from({ length: module.itemCount }, (_, i) => (
                <div key={i + 1} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                    <span className="text-sm font-medium">{user?.username}</span>
                  </div>
                  <p className="text-sm text-gray-600">Sample post content...</p>
                </div>
              ))}
            </div>
          );
        case "friends":
          return (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: module.itemCount }, (_, i) => (
                <div key={i + 1} className="text-center">
                  <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-1"></div>
                  <span className="text-xs">Friend {i + 1}</span>
                </div>
              ))}
            </div>
          );
        case "following":
          return (
            <div className="space-y-2">
              {Array.from({ length: module.itemCount }, (_, i) => (
                <div key={i + 1} className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <span className="text-sm">Following {i + 1}</span>
                </div>
              ))}
            </div>
          );
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
        case "youtube":
          return (
            <div className="text-center">
              {module.customData?.videoUrl ? (
                <div className="relative">
                  <iframe
                    width="100%"
                    height={module.customData?.height || "200"}
                    src={`https://www.youtube.com/embed/${module.customData.videoUrl.split('v=')[1]?.split('&')[0] || module.customData.videoUrl.split('/').pop()}`}
                    title="YouTube video"
                    frameBorder="0"
                    allowFullScreen
                    className="rounded-lg"
                  />
                </div>
              ) : (
                <div className="p-4 border-dashed border-2 border-gray-300 rounded-lg">
                  <Youtube className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">No YouTube video set</p>
                </div>
              )}
            </div>
          );
        case "badges":
          return (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: module.itemCount }, (_, i) => (
                <div key={i + 1} className="text-center p-2 border rounded-lg">
                  <Award className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
                  <span className="text-xs">Badge {i + 1}</span>
                </div>
              ))}
            </div>
          );
        case "issues":
          return (
            <div className="space-y-2">
              {["Healthcare Reform", "Anti-Corruption", "Climate Action", "Education", "Economic Justice"].slice(0, module.itemCount).map((issue, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <Flag className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{issue}</span>
                </div>
              ))}
            </div>
          );
        case "civic-tracker":
          return (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">23</div>
                <div className="text-xs text-green-700">Votes Cast</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">8</div>
                <div className="text-xs text-blue-700">Events Joined</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">15</div>
                <div className="text-xs text-purple-700">Polls Created</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">42</div>
                <div className="text-xs text-orange-700">Debates</div>
              </div>
            </div>
          );
        case "pinned-post":
          return (
            <div className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Star className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <p className="font-medium text-blue-900">Pinned Statement</p>
                  <p className="text-sm text-blue-700 mt-1">"Democracy works best when we all participate. Let's build a better future together! #ACP2024"</p>
                </div>
              </div>
            </div>
          );
        case "debate-history":
          return (
            <div className="space-y-2">
              {Array.from({ length: module.itemCount }, (_, i) => (
                <div key={i + 1} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">Healthcare Debate #{i + 1}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${i % 2 === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {i % 2 === 0 ? 'Won' : 'Lost'}
                  </span>
                </div>
              ))}
            </div>
          );
        case "events":
          return (
            <div className="space-y-2">
              {Array.from({ length: module.itemCount }, (_, i) => (
                <div key={i + 1} className="flex items-center gap-2 p-2 border rounded-lg">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium">Town Hall #{i + 1}</div>
                    <div className="text-xs text-gray-500">RSVP'd • Jan {15 + i}</div>
                  </div>
                </div>
              ))}
            </div>
          );
        case "analytics":
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Profile Views</span>
                <span className="font-bold">1,247</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Post Reach</span>
                <span className="font-bold">3,856</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Follower Growth</span>
                <span className="font-bold text-green-600">+127</span>
              </div>
              <BarChart3 className="h-16 w-full text-gray-300" />
            </div>
          );
        case "campaign-hub":
          return (
            <div className="space-y-3">
              <Button className="w-full" variant="default">
                <Heart className="h-4 w-4 mr-2" />
                Donate to Campaign
              </Button>
              <Button className="w-full" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Volunteer Sign-Up
              </Button>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm font-medium">Next Event</div>
                <div className="text-xs text-gray-600">Rally - Jan 20, 2025</div>
              </div>
            </div>
          );
        case "verified-badge":
          return (
            <div className="text-center p-4">
              <Shield className="h-12 w-12 mx-auto mb-2 text-blue-600" />
              <div className="font-bold text-blue-900">Verified Citizen</div>
              <div className="text-xs text-blue-700">ID Verified • ACP+ Member</div>
            </div>
          );
        case "civic-scorecard":
          return (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Contribution Score</span>
                <span className="font-bold text-green-600">A+</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Fact-Check Accuracy</span>
                <span className="font-bold">94%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Community Trust</span>
                <span className="font-bold text-blue-600">High</span>
              </div>
              <div className="text-center mt-3">
                <TrendingUp className="h-8 w-8 mx-auto text-green-500" />
              </div>
            </div>
          );
        case "media-hub":
          return (
            <div className="grid grid-cols-1 gap-2">
              {Array.from({ length: module.itemCount }, (_, i) => (
                <div key={i + 1} className="flex items-center gap-2 p-2 border rounded-lg">
                  <Video className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">Video Blog #{i + 1}</span>
                  <span className="text-xs text-gray-500 ml-auto">12:34</span>
                </div>
              ))}
            </div>
          );
        case "widgets":
          return (
            <div className="space-y-2">
              <div className="p-3 border rounded-lg bg-yellow-50">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Quick Poll</span>
                </div>
                <p className="text-xs text-gray-600">Should we increase healthcare funding?</p>
              </div>
              <div className="p-3 border rounded-lg bg-green-50">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Election Countdown</span>
                </div>
                <p className="text-xs text-gray-600">127 days until local elections</p>
              </div>
            </div>
          );
        case "supporter-wall":
          return (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: module.itemCount }, (_, i) => (
                <div key={i + 1} className="text-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full mx-auto mb-1 flex items-center justify-center">
                    <Heart className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-xs">Supporter {i + 1}</span>
                </div>
              ))}
            </div>
          );
        case "democracy-wrapped":
          return (
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 rounded-lg text-center">
              <Star className="h-8 w-8 mx-auto mb-2" />
              <div className="font-bold">2024 Democracy Wrapped</div>
              <div className="text-sm opacity-90">Your year in civic engagement</div>
              <Button variant="secondary" size="sm" className="mt-2">
                View Report
              </Button>
            </div>
          );
        case "legacy-timeline":
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Joined ACP - Jan 2024</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">First Vote Cast - Feb 2024</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Debate Champion - Mar 2024</span>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2">
                View Full Timeline
              </Button>
            </div>
          );
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
                <Dialog open={editingModule === module.id} onOpenChange={(open) => setEditingModule(open ? module.id : null)}>
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