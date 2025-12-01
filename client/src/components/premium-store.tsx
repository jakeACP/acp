import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Palette, Music, Image, Star, Crown, Plus, Eye, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorMessage } from "@/components/error-message";

type ThemeVariant = "patriot" | "ocean" | "forest" | "sunset" | "aurora" | "midnight";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  price: string;
  creatorId?: string;
  previewImage?: string;
  downloadCount: number;
  rating: string;
  createdAt: string;
}

const THEME_VARIANTS: Record<ThemeVariant, { name: string; description: string; background: string; colors: string }> = {
  patriot: {
    name: "Patriot Red/White/Blue",
    description: "Classic liquid glass patriotic theme with red, white, and blue gradient stripes",
    background: "repeating-linear-gradient(135deg, #B22234 0px, #B22234 100px, #FFFFFF 100px, #FFFFFF 108px, #3C3B6E 108px, #3C3B6E 208px, #FFFFFF 208px, #FFFFFF 216px)",
    colors: "from-red-600 via-white to-blue-900"
  },
  ocean: {
    name: "Ocean Depth",
    description: "Serene liquid glass theme with deep ocean blues and aqua accents",
    background: "linear-gradient(135deg, #1e3a8a 0%, #0369a1 50%, #06b6d4 100%)",
    colors: "from-blue-900 via-cyan-600 to-cyan-400"
  },
  forest: {
    name: "Forest Green",
    description: "Natural liquid glass theme with rich emerald and forest tones",
    background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)",
    colors: "from-emerald-900 via-emerald-700 to-emerald-500"
  },
  sunset: {
    name: "Sunset Glow",
    description: "Warm liquid glass theme with golden, orange, and purple sunset colors",
    background: "linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #a855f7 100%)",
    colors: "from-orange-900 via-orange-500 to-purple-600"
  },
  aurora: {
    name: "Aurora Borealis",
    description: "Magical liquid glass theme with green, purple, and pink northern lights",
    background: "linear-gradient(135deg, #1e1b4b 0%, #10b981 30%, #a855f7 70%, #ec4899 100%)",
    colors: "from-indigo-900 via-emerald-500 to-pink-500"
  },
  midnight: {
    name: "Midnight Stars",
    description: "Dark liquid glass theme with deep purple and silver starlight accents",
    background: "linear-gradient(135deg, #1a1625 0%, #2d1b69 50%, #3d2645 100%)",
    colors: "from-purple-950 via-purple-700 to-purple-500"
  }
};

export function PremiumStore() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [triedTheme, setTriedTheme] = useState<ThemeVariant | null>(null);

  const { data: storeItems, isLoading, error } = useQuery<StoreItem[]>({
    queryKey: ["/api/store/items", selectedCategory === "all" ? "" : selectedCategory],
  });

  const { data: userBalance, isLoading: balanceLoading } = useQuery<{ balance: string }>({
    queryKey: ["/api/acp/balance"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/store/purchase/${itemId}`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to purchase item");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase Successful!",
        description: "Item has been added to your profile customizations.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/acp/balance"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const response = await fetch("/api/store/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(itemData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create store item");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Created!",
        description: "Your customization is now available in the marketplace.",
      });
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/store/items"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: string) => {
    return parseFloat(price).toFixed(2);
  };

  const canAfford = (price: string) => {
    if (!userBalance?.balance) return false;
    return parseFloat(userBalance.balance) >= parseFloat(price);
  };

  const getButtonText = (price: string) => {
    if (purchaseMutation.isPending) return <LoadingSpinner className="h-3 w-3" />;
    if (balanceLoading) return "Loading...";
    if (canAfford(price)) return "Purchase";
    return "Insufficient Funds";
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "theme": return <Palette className="h-4 w-4" />;
      case "background": return <Image className="h-4 w-4" />;
      case "song": return <Music className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const categories = [
    { value: "all", label: "All Items" },
    { value: "theme", label: "Themes" },
    { value: "background", label: "Backgrounds" },
    { value: "song", label: "Music" },
    { value: "widget", label: "Widgets" },
    { value: "layout", label: "Layouts" }
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message="Failed to load store items" />;
  }

  return (
    <div className="space-y-6">
      {/* Theme Preview Container */}
      {triedTheme && (
        <div 
          className="relative rounded-lg overflow-hidden shadow-xl"
          style={{
            background: THEME_VARIANTS[triedTheme].background,
            minHeight: "200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column"
          }}
        >
          {/* Liquid Glass Effect */}
          <div className="absolute inset-0 backdrop-blur-3xl opacity-40"></div>
          
          {/* Content */}
          <div className="relative z-10 text-center text-white">
            <h3 className="text-2xl font-bold mb-2">{THEME_VARIANTS[triedTheme].name} Theme</h3>
            <p className="text-white/80 mb-4">{THEME_VARIANTS[triedTheme].description}</p>
            <Button 
              onClick={() => setTriedTheme(null)}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/50"
              data-testid="button-close-theme-preview"
            >
              <X className="h-4 w-4 mr-2" />
              Close Preview
            </Button>
          </div>
        </div>
      )}

      <Card data-testid="premium-store-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-purple-500" />
              Premium Profile Store
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Balance: ₳{userBalance ? formatPrice(userBalance.balance) : "0.00"}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="browse" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="browse" data-testid="tab-browse">Browse Items</TabsTrigger>
              <TabsTrigger value="create" data-testid="tab-create">Create & Sell</TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category.value}
                    variant={selectedCategory === category.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.value)}
                    data-testid={`filter-${category.value}`}
                  >
                    {category.label}
                  </Button>
                ))}
              </div>

              {/* Premium Themes Section */}
              {(selectedCategory === "all" || selectedCategory === "theme") && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 py-2">
                    <Palette className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-lg">Premium Liquid Glass Themes</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(THEME_VARIANTS).map(([themeKey, theme]) => (
                      <Card key={themeKey} className="overflow-hidden" data-testid={`theme-card-${themeKey}`}>
                        {/* Theme Preview */}
                        <div 
                          className="h-32 relative overflow-hidden flex items-center justify-center"
                          style={{ background: theme.background }}
                        >
                          <div className="absolute inset-0 backdrop-blur-md opacity-30"></div>
                          <div className="relative z-10 text-white text-center px-2">
                            <h4 className="font-bold text-sm">{theme.name}</h4>
                          </div>
                        </div>
                        
                        <CardContent className="pt-4">
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {theme.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-purple-600">₳2.50</span>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setTriedTheme(themeKey as ThemeVariant)}
                                variant="outline"
                                size="sm"
                                data-testid={`button-try-${themeKey}`}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Try
                              </Button>
                              <Button
                                onClick={() => purchaseMutation.mutate(`theme-${themeKey}`)}
                                disabled={purchaseMutation.isPending}
                                size="sm"
                                data-testid={`purchase-theme-${themeKey}`}
                              >
                                {purchaseMutation.isPending ? <LoadingSpinner className="h-3 w-3" /> : "Get"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {storeItems && storeItems.length > 0 ? (
                  storeItems.map((item) => (
                    <Card key={item.id} className="relative" data-testid={`store-item-${item.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(item.category)}
                            <h3 className="font-medium truncate">{item.name}</h3>
                          </div>
                          <Badge variant={item.type === "official" ? "default" : "secondary"}>
                            {item.type === "official" ? "Official" : "Community"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {item.previewImage && (
                          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                            <img
                              src={item.previewImage}
                              alt={item.name}
                              className="max-w-full max-h-full object-contain rounded"
                            />
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>★ {parseFloat(item.rating).toFixed(1)}</span>
                          <span>{item.downloadCount} downloads</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-purple-600">
                            ₳{formatPrice(item.price)}
                          </span>
                          <Button
                            onClick={() => purchaseMutation.mutate(item.id)}
                            disabled={balanceLoading || !canAfford(item.price) || purchaseMutation.isPending}
                            size="sm"
                            data-testid={`purchase-${item.id}`}
                          >
                            {getButtonText(item.price)}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No items available in this category</p>
                    <p className="text-sm">Check back later or try a different category!</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">Create & Sell Your Designs</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Design custom themes, backgrounds, and widgets for other users. Earn ACP coins for every purchase!
                </p>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  data-testid="button-start-creating"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Start Creating
                </Button>
              </div>

              {showCreateForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>Create New Store Item</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CreateItemForm
                      onSubmit={(data) => createItemMutation.mutate(data)}
                      onCancel={() => setShowCreateForm(false)}
                      isLoading={createItemMutation.isPending}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateItemForm({ onSubmit, onCancel, isLoading }: {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    itemData: "",
    previewImage: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Item Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Neon Purple Theme"
            required
          />
        </div>
        <div>
          <Label htmlFor="price">Price (ACP Coins)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({...formData, price: e.target.value})}
            placeholder="5.00"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="theme">Theme</SelectItem>
            <SelectItem value="background">Background</SelectItem>
            <SelectItem value="song">Music</SelectItem>
            <SelectItem value="widget">Widget</SelectItem>
            <SelectItem value="layout">Layout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="A vibrant neon purple theme with animated backgrounds..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="itemData">CSS/JSON Data</Label>
        <Textarea
          id="itemData"
          value={formData.itemData}
          onChange={(e) => setFormData({...formData, itemData: e.target.value})}
          placeholder="Paste your CSS styles or JSON configuration here..."
          rows={4}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} data-testid="button-submit-item">
          {isLoading ? (
            <>
              <LoadingSpinner className="h-4 w-4 mr-2" />
              Creating...
            </>
          ) : (
            "Create Item"
          )}
        </Button>
      </div>
    </form>
  );
}