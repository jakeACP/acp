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
  Youtube
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { apiRequest } from "@/lib/queryClient";

interface ProfileModule {
  id: string;
  name: string;
  type: "photos" | "feed" | "friends" | "following" | "music" | "background" | "youtube" | "custom";
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
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleType, setNewModuleType] = useState<string>("");

  const { data: user, isLoading: userLoading } = useQuery<UserProfile>({
    queryKey: userId ? [`/api/user/${userId}`] : ["/api/user"],
  });

  const [profileModules, setProfileModules] = useState<ProfileModule[]>([
    {
      id: "photos",
      name: "Photo Gallery",
      type: "photos",
      isPremium: false,
      isEnabled: true,
      position: 1,
      itemCount: 6
    },
    {
      id: "feed",
      name: "Recent Posts",
      type: "feed", 
      isPremium: false,
      isEnabled: true,
      position: 2,
      itemCount: 3
    },
    {
      id: "friends",
      name: "Friends List",
      type: "friends",
      isPremium: false,
      isEnabled: true,
      position: 3,
      itemCount: 8
    },
    {
      id: "following",
      name: "Following",
      type: "following",
      isPremium: false,
      isEnabled: true,
      position: 4,
      itemCount: 5
    },
    {
      id: "music",
      name: "Favorite Song",
      type: "music",
      isPremium: true,
      isEnabled: user?.subscriptionStatus === "premium",
      position: 5,
      itemCount: 1
    },
    {
      id: "background",
      name: "Custom Background",
      type: "background",
      isPremium: true,
      isEnabled: user?.subscriptionStatus === "premium",
      position: 6,
      itemCount: 1
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

  const addNewModule = (type: string) => {
    const moduleTypes = {
      youtube: { name: "YouTube Video", itemCount: 1, customData: { videoUrl: "", height: "200" } },
      photos: { name: "Photo Gallery", itemCount: 6, customData: {} },
      feed: { name: "Recent Posts", itemCount: 3, customData: {} },
      friends: { name: "Friends List", itemCount: 8, customData: {} },
      following: { name: "Following", itemCount: 5, customData: {} }
    };

    const moduleConfig = moduleTypes[type as keyof typeof moduleTypes];
    if (!moduleConfig) return;

    const newModule: ProfileModule = {
      id: `${type}-${Date.now()}`,
      name: moduleConfig.name,
      type: type as any,
      isPremium: false,
      isEnabled: true,
      position: profileModules.length + 1,
      itemCount: moduleConfig.itemCount,
      customData: moduleConfig.customData
    };

    setProfileModules(prev => [...prev, newModule]);
    setShowAddModule(false);
    setNewModuleType("");
  };
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
                            setProfileModules(modules => 
                              modules.map(m => m.id === module.id ? {...m, isEnabled: checked} : m)
                            );
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
                                setProfileModules(modules => 
                                  modules.map(m => m.id === module.id ? {...m, itemCount: parseInt(value)} : m)
                                );
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
                                  setProfileModules(modules => 
                                    modules.map(m => m.id === module.id ? {
                                      ...m, 
                                      customData: { ...m.customData, videoUrl: e.target.value }
                                    } : m)
                                  );
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Video Height</Label>
                              <Select 
                                value={module.customData?.height || "200"} 
                                onValueChange={(value) => {
                                  setProfileModules(modules => 
                                    modules.map(m => m.id === module.id ? {
                                      ...m, 
                                      customData: { ...m.customData, height: value }
                                    } : m)
                                  );
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
                            setProfileModules(modules => modules.filter(m => m.id !== module.id));
                            setEditingModule(null);
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
                    setProfileModules(modules => 
                      modules.map(m => m.id === module.id ? {...m, isEnabled: checked} : m)
                    );
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

            {isOwner && (
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
                  
                  <div className="space-y-2">
                    {[
                      { type: "youtube", name: "YouTube Video", icon: Youtube, description: "Embed a YouTube video with custom size" },
                      { type: "photos", name: "Photo Gallery", icon: Camera, description: "Display your photos in a grid" },
                      { type: "feed", name: "Recent Posts", icon: MessageSquare, description: "Show your latest posts" },
                      { type: "friends", name: "Friends List", icon: Users, description: "Display your friends" },
                      { type: "following", name: "Following", icon: Heart, description: "Show who you follow" }
                    ].map((moduleType) => {
                      const IconComponent = moduleType.icon;
                      return (
                        <Button
                          key={moduleType.type}
                          variant="outline"
                          className="w-full justify-start h-auto p-4"
                          onClick={() => addNewModule(moduleType.type)}
                          data-testid={`add-module-${moduleType.type}`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className="h-5 w-5" />
                            <div className="text-left">
                              <p className="font-medium">{moduleType.name}</p>
                              <p className="text-xs text-gray-500">{moduleType.description}</p>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
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