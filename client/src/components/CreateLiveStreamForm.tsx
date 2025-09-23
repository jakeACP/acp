import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Video, Calendar, Eye, EyeOff } from "lucide-react";

const createStreamSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().optional(),
  visibility: z.enum(["public", "unlisted", "private"]),
  scheduledStart: z.string().optional(),
});

type CreateStreamFormData = z.infer<typeof createStreamSchema>;

interface CreateLiveStreamFormProps {
  onSuccess?: (stream: any) => void;
  onCancel?: () => void;
}

export function CreateLiveStreamForm({ onSuccess, onCancel }: CreateLiveStreamFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateStreamFormData>({
    resolver: zodResolver(createStreamSchema),
    defaultValues: {
      title: "",
      description: "",
      visibility: "public",
      scheduledStart: "",
    },
  });

  const createStreamMutation = useMutation({
    mutationFn: async (data: CreateStreamFormData) => {
      const payload = {
        ...data,
        scheduledStart: data.scheduledStart ? new Date(data.scheduledStart).toISOString() : undefined,
      };
      const response = await apiRequest("/api/live/streams", "POST", payload);
      return response.json();
    },
    onSuccess: (stream) => {
      toast({
        title: "Stream Created",
        description: "Your live stream has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/live/streams"] });
      onSuccess?.(stream);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create stream",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: CreateStreamFormData) => {
    setIsSubmitting(true);
    try {
      await createStreamMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Eye className="w-4 h-4" />;
      case "unlisted":
        return <EyeOff className="w-4 h-4" />;
      case "private":
        return <EyeOff className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // Format for datetime-local input
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="create-stream-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Create Live Stream
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stream Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your stream title..."
                      {...field}
                      data-testid="input-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what your stream will be about..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Visibility */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-visibility">
                        <SelectValue placeholder="Choose visibility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Public - Anyone can find and watch
                        </div>
                      </SelectItem>
                      <SelectItem value="unlisted">
                        <div className="flex items-center gap-2">
                          <EyeOff className="w-4 h-4" />
                          Unlisted - Only people with the link can watch
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <EyeOff className="w-4 h-4" />
                          Private - Only you can watch
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scheduled Start */}
            <FormField
              control={form.control}
              name="scheduledStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Start (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="datetime-local"
                        min={getMinDateTime()}
                        {...field}
                        data-testid="input-scheduled-start"
                        className="pl-10"
                      />
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    Leave empty to create an on-demand stream
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="button-create-stream"
                className="flex-1"
              >
                {isSubmitting ? "Creating..." : "Create Stream"}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  data-testid="button-cancel"
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