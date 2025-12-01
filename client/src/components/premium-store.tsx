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
import { ShoppingCart, Palette, Music, Image, Star, Crown, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorMessage } from "@/components/error-message";

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

export function PremiumStore() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: storeItems, isLoading, error } = useQuery<StoreItem[]>({
    queryKey: ["/api/store/items", selectedCategory === "all" ? "" : selectedCategory],
  });

  const { data: userBalance } = useQuery<{ balance: string }>({
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
    if (!userBalance) return false;
    return parseFloat(userBalance.balance) >= parseFloat(price);
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
                            disabled={!canAfford(item.price) || purchaseMutation.isPending}
                            size="sm"
                            data-testid={`purchase-${item.id}`}
                          >
                            {purchaseMutation.isPending ? (
                              <LoadingSpinner className="h-3 w-3" />
                            ) : canAfford(item.price) ? (
                              "Purchase"
                            ) : (
                              "Insufficient Funds"
                            )}
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