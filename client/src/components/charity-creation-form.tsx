import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, Globe, GraduationCap, Shield, Stethoscope, Users, Leaf } from "lucide-react";

const charitySchema = z.object({
  name: z.string().min(3, "Charity name must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.string().min(1, "Please select a category"),
  goalAmount: z.string().min(1, "Please enter a goal amount"),
  image: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  endDate: z.string().optional(),
});

type CharityFormData = z.infer<typeof charitySchema>;

interface CharityCreationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const categoryOptions = [
  { value: "environment", label: "Environment", icon: Leaf },
  { value: "education", label: "Education", icon: GraduationCap },
  { value: "healthcare", label: "Healthcare", icon: Stethoscope },
  { value: "poverty", label: "Poverty Relief", icon: Heart },
  { value: "disaster", label: "Disaster Relief", icon: Shield },
  { value: "community", label: "Community", icon: Users },
  { value: "global", label: "Global Causes", icon: Globe },
];

export function CharityCreationForm({ onSuccess, onCancel }: CharityCreationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CharityFormData>({
    resolver: zodResolver(charitySchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      goalAmount: "",
      image: "",
      website: "",
      endDate: "",
    },
  });

  const createCharityMutation = useMutation({
    mutationFn: async (data: CharityFormData) => {
      const payload = {
        ...data,
        goalAmount: data.goalAmount,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      };
      return apiRequest("POST", "/api/charities", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charities"] });
      toast({
        title: "Success!",
        description: "Your charity has been created and is now live.",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create charity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: CharityFormData) => {
    setIsSubmitting(true);
    try {
      await createCharityMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="charity-creation-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Create New Charity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Charity Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter charity name" 
                      {...field} 
                      data-testid="input-charity-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your charity's mission and how donations will be used..."
                      className="min-h-[120px]"
                      {...field}
                      data-testid="textarea-charity-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-charity-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              {option.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="goalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fundraising Goal (USD) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="10000.00"
                      step="0.01"
                      min="1"
                      {...field}
                      data-testid="input-charity-goal"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Charity Image URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/charity-image.jpg"
                      {...field}
                      data-testid="input-charity-image"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      {...field}
                      data-testid="input-charity-website"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fundraising End Date (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      min={new Date().toISOString().split('T')[0]}
                      data-testid="input-charity-end-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || createCharityMutation.isPending}
                className="flex-1"
                data-testid="button-create-charity"
              >
                {isSubmitting ? "Creating..." : "Create Charity"}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                  data-testid="button-cancel-charity"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}