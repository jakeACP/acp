import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Heart, Users, MessageCircle, Building2, ShoppingBag, Plus, Target, Store, AlertTriangle } from "lucide-react";
import { z } from "zod";
import type { Boycott } from "@shared/schema";

const createBoycottSchema = z.object({
  title: z.string().min(1, "Title is required"),
  reason: z.string().min(10, "Please provide a detailed reason (at least 10 characters)"),
  targetCompany: z.string().min(1, "Target company is required"),
  targetProduct: z.string().optional(),
  alternativeProduct: z.string().optional(),
  alternativeCompany: z.string().optional(),
  image: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
});

type CreateBoycottData = z.infer<typeof createBoycottSchema>;

const popularTags = [
  "human-rights", "environment", "labor", "ethics", "corporate-greed", 
  "monopoly", "privacy", "corruption", "inequality", "workers-rights"
];

export default function BoycottsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: boycotts, isLoading } = useQuery<Boycott[]>({
    queryKey: ["/api/boycotts"],
  });

  const { data: userBoycotts } = useQuery<Boycott[]>({
    queryKey: ["/api/user/boycotts"],
    enabled: !!user,
  });

  const form = useForm<CreateBoycottData>({
    resolver: zodResolver(createBoycottSchema),
    defaultValues: {
      title: "",
      reason: "",
      targetCompany: "",
      targetProduct: "",
      alternativeProduct: "",
      alternativeCompany: "",
      image: "",
      tags: [],
    },
  });

  const createBoycottMutation = useMutation({
    mutationFn: async (data: CreateBoycottData) => {
      const response = await apiRequest("/api/boycotts", "POST", {
        ...data,
        tags: selectedTags,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Boycott created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/boycotts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/boycotts"] });
      form.reset();
      setSelectedTags([]);
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create boycott",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const subscribeToBoycottMutation = useMutation({
    mutationFn: async (boycottId: string) => {
      await apiRequest(`/api/boycotts/${boycottId}/subscribe`, "POST");
    },
    onSuccess: () => {
      toast({ title: "Subscribed to boycott successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/boycotts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/boycotts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to subscribe",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unsubscribeFromBoycottMutation = useMutation({
    mutationFn: async (boycottId: string) => {
      await apiRequest(`/api/boycotts/${boycottId}/subscribe`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Unsubscribed from boycott" });
      queryClient.invalidateQueries({ queryKey: ["/api/boycotts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/boycotts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to unsubscribe",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const onSubmit = (data: CreateBoycottData) => {
    createBoycottMutation.mutate(data);
  };

  const isSubscribedToBoycott = (boycottId: string) => {
    return userBoycotts?.some(b => b.id === boycottId) || false;
  };

  const handleSubscribeToggle = (boycottId: string) => {
    if (isSubscribedToBoycott(boycottId)) {
      unsubscribeFromBoycottMutation.mutate(boycottId);
    } else {
      subscribeToBoycottMutation.mutate(boycottId);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading boycotts...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Active Boycotts</h1>
          <p className="text-muted-foreground">
            Organize consumer power to drive corporate accountability
          </p>
        </div>
        
        {user && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-boycott">
                <Plus className="w-4 h-4 mr-2" />
                Create Boycott
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Boycott</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Boycott Title</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g. Boycott Amazon for Worker Rights"
                            data-testid="input-boycott-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetCompany"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Company</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g. Amazon"
                            data-testid="input-target-company"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetProduct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Product (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g. Amazon Prime, Whole Foods"
                            data-testid="input-target-product"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Boycott</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Explain why consumers should boycott this company or product..."
                            className="min-h-[100px]"
                            data-testid="textarea-boycott-reason"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="alternativeCompany"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alternative Company (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g. Local bookstores"
                              data-testid="input-alternative-company"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="alternativeProduct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alternative Product (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g. Buy direct from publishers"
                              data-testid="input-alternative-product"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="https://example.com/boycott-image.jpg"
                            data-testid="input-boycott-image"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Tags</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {popularTags.map(tag => (
                        <Button
                          key={tag}
                          type="button"
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleTagToggle(tag)}
                          data-testid={`button-tag-${tag}`}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      data-testid="button-cancel-boycott"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createBoycottMutation.isPending}
                      data-testid="button-submit-boycott"
                    >
                      {createBoycottMutation.isPending ? "Creating..." : "Create Boycott"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {boycotts?.map((boycott) => (
          <Card key={boycott.id} className="hover:shadow-lg transition-shadow" data-testid={`card-boycott-${boycott.id}`}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg line-clamp-2" data-testid={`text-boycott-title-${boycott.id}`}>
                    {boycott.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground" data-testid={`text-target-company-${boycott.id}`}>
                      {boycott.targetCompany}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {boycott.image && (
                <img 
                  src={boycott.image} 
                  alt={boycott.title}
                  className="w-full h-32 object-cover rounded-lg"
                  data-testid={`img-boycott-${boycott.id}`}
                />
              )}
              
              <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-boycott-reason-${boycott.id}`}>
                {boycott.reason}
              </p>

              {boycott.targetProduct && (
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm" data-testid={`text-target-product-${boycott.id}`}>
                    {boycott.targetProduct}
                  </span>
                </div>
              )}

              {(boycott.alternativeCompany || boycott.alternativeProduct) && (
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Store className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Alternative:
                    </span>
                  </div>
                  {boycott.alternativeCompany && (
                    <p className="text-sm text-green-600 dark:text-green-400" data-testid={`text-alternative-company-${boycott.id}`}>
                      {boycott.alternativeCompany}
                    </p>
                  )}
                  {boycott.alternativeProduct && (
                    <p className="text-sm text-green-600 dark:text-green-400" data-testid={`text-alternative-product-${boycott.id}`}>
                      {boycott.alternativeProduct}
                    </p>
                  )}
                </div>
              )}

              {boycott.tags && boycott.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {boycott.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs" data-testid={`badge-tag-${tag}-${boycott.id}`}>
                      {tag}
                    </Badge>
                  ))}
                  {boycott.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{boycott.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span data-testid={`text-subscriber-count-${boycott.id}`}>
                      {boycott.subscriberCount} supporters
                    </span>
                  </div>
                  {boycott.groupId && (
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>Discussion</span>
                    </div>
                  )}
                </div>

                {user && (
                  <Button
                    size="sm"
                    variant={isSubscribedToBoycott(boycott.id) ? "secondary" : "default"}
                    onClick={() => handleSubscribeToggle(boycott.id)}
                    disabled={subscribeToBoycottMutation.isPending || unsubscribeFromBoycottMutation.isPending}
                    data-testid={`button-subscribe-${boycott.id}`}
                  >
                    <Heart className={`w-4 h-4 mr-1 ${isSubscribedToBoycott(boycott.id) ? 'fill-current' : ''}`} />
                    {isSubscribedToBoycott(boycott.id) ? 'Supporting' : 'Support'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {boycotts?.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No active boycotts</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to organize a consumer boycott for corporate accountability
          </p>
          {user && (
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-boycott">
              <Plus className="w-4 h-4 mr-2" />
              Create First Boycott
            </Button>
          )}
        </div>
      )}
    </div>
  );
}