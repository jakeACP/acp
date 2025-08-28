import { useState } from "react";
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
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";

interface ProfileModule {
  id: string;
  name: string;
  type: "photos" | "feed" | "friends" | "following" | "music" | "background" | "custom";
  isPremium: boolean;
  isEnabled: boolean;
  position: number;
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

  const { data: user, isLoading: userLoading } = useQuery<UserProfile>({
    queryKey: ["/api/user", userId || "current"],
  });

  const [profileModules, setProfileModules] = useState<ProfileModule[]>([
    {
      id: "photos",
      name: "Photo Gallery",
      type: "photos",
      isPremium: false,
      isEnabled: true,
      position: 1
    },
    {
      id: "feed",
      name: "Recent Posts",
      type: "feed", 
      isPremium: false,
      isEnabled: true,
      position: 2
    },
    {
      id: "friends",
      name: "Friends List",
      type: "friends",
      isPremium: false,
      isEnabled: true,
      position: 3
    },
    {
      id: "following",
      name: "Following",
      type: "following",
      isPremium: false,
      isEnabled: true,
      position: 4
    },
    {
      id: "music",
      name: "Favorite Song",
      type: "music",
      isPremium: true,
      isEnabled: user?.subscriptionStatus === "premium",
      position: 5
    },
    {
      id: "background",
      name: "Custom Background",
      type: "background",
      isPremium: true,
      isEnabled: user?.subscriptionStatus === "premium",
      position: 6
    }
  ]);

  const [customization, setCustomization] = useState({
    theme: user?.profileTheme || "default",
    background: user?.profileBackground || "",
    favoriteSong: user?.favoriteSong || "",
    customCSS: ""
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
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
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
  const themes = [
    { value: "default", label: "Classic Blue" },
    { value: "dark", label: "Dark Mode" },
    { value: "neon", label: "Neon Purple", premium: true },
    { value: "retro", label: "Retro Wave", premium: true },
    { value: "minimalist", label: "Minimalist", premium: true }
  ];

  const getProfileStyle = () => {
    const baseStyle: React.CSSProperties = {};
    
    if (customization.background) {
      baseStyle.backgroundImage = `url(${customization.background})`;
      baseStyle.backgroundSize = "cover";
      baseStyle.backgroundPosition = "center";
    }
    
    return baseStyle;
  };

  const getThemeClasses = () => {
    switch (customization.theme) {
      case "dark":
        return "bg-gray-900 text-white";
      case "neon":
        return "bg-gradient-to-br from-purple-900 to-pink-900 text-white";
      case "retro":
        return "bg-gradient-to-br from-cyan-900 to-purple-900 text-white";
      case "minimalist":
        return "bg-gray-50 text-gray-900";
      default:
        return "bg-white text-gray-900";
    }
  };

  const renderProfileModule = (module: ProfileModule) => {
    if (!module.isEnabled) return null;

    const moduleContent = () => {
      switch (module.type) {
        case "photos":
          return (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                  <Camera className="h-6 w-6 text-gray-400" />
                </div>
              ))}
            </div>
          );
        case "feed":
          return (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 border rounded-lg">
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
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-1"></div>
                  <span className="text-xs">Friend {i}</span>
                </div>
              ))}
            </div>
          );
        case "following":
          return (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <span className="text-sm">Following {i}</span>
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
                  setProfileModules(modules => 
                    modules.map(m => m.id === module.id ? {...m, isEnabled: checked} : m)
                  );
                }}
                disabled={module.isPremium && !isPremiumUser}
              />
            )}
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
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-white" />
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

            {isOwner && (
              <div className="flex gap-2">
                <Button
                  variant={editMode ? "default" : "secondary"}
                  size="sm"
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
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewMode(!previewMode)}
                    data-testid="button-preview-profile"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                )}
              </div>
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
      </div>

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