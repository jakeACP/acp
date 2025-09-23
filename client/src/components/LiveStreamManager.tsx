import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreateLiveStreamForm } from "./CreateLiveStreamForm";
import { LiveStreamPlayer } from "./LiveStreamPlayer";
import {
  Video,
  Plus,
  Settings,
  Copy,
  RefreshCw,
  Play,
  Square,
  Calendar,
  Users,
  Eye,
  AlertCircle,
} from "lucide-react";

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  status: "scheduled" | "live" | "ended";
  visibility: "public" | "unlisted" | "private";
  providerPlaybackUrl?: string;
  rtmpServerUrl?: string;
  scheduledStart?: string;
  actualStart?: string;
  actualEnd?: string;
  viewerCount?: number;
  createdAt: string;
  owner: {
    id: string;
    username: string;
  };
}

interface LiveStreamManagerProps {
  userId: string;
}

export function LiveStreamManager({ userId }: LiveStreamManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: streams = [], isLoading } = useQuery<LiveStream[]>({
    queryKey: ["/api/live/streams/user", userId],
    enabled: !!userId,
  });

  const updateStreamMutation = useMutation({
    mutationFn: async ({ streamId, status }: { streamId: string; status: string }) => {
      const response = await apiRequest(`/api/live/streams/${streamId}`, "PATCH", { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/live/streams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/live/streams/user", userId] });
      toast({
        title: "Stream Updated",
        description: "Stream status updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update stream",
        variant: "destructive",
      });
    },
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: async (streamId: string) => {
      const response = await apiRequest(`/api/live/streams/${streamId}/regenerate-key`, "POST");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Stream Key Regenerated",
        description: "Your new stream key has been generated.",
      });
      // Show the new stream key to the user
      navigator.clipboard.writeText(data.streamKey);
      toast({
        title: "Stream Key Copied",
        description: "Your new stream key has been copied to clipboard.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate stream key",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-red-500";
      case "scheduled":
        return "bg-yellow-500";
      case "ended":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleStartStream = (streamId: string) => {
    updateStreamMutation.mutate({ streamId, status: "live" });
  };

  const handleEndStream = (streamId: string) => {
    updateStreamMutation.mutate({ streamId, status: "ended" });
  };

  const copyStreamKey = async (stream: LiveStream) => {
    if (!stream.rtmpServerUrl) {
      toast({
        title: "No Stream URL",
        description: "Stream URL not available yet.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await navigator.clipboard.writeText(`${stream.rtmpServerUrl}`);
      toast({
        title: "Stream URL Copied",
        description: "RTMP URL copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const activeStreams = streams.filter((s) => s.status === "live");
  const scheduledStreams = streams.filter((s) => s.status === "scheduled");
  const endedStreams = streams.filter((s) => s.status === "ended");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="loading-state">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading streams...
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="stream-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Live Stream Manager</h2>
        </div>
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-stream">
              <Plus className="w-4 h-4 mr-2" />
              Create Stream
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Live Stream</DialogTitle>
            </DialogHeader>
            <CreateLiveStreamForm
              onSuccess={() => setShowCreateForm(false)}
              onCancel={() => setShowCreateForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* OBS Instructions */}
      <Alert data-testid="obs-instructions">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>OBS Setup:</strong> Copy your RTMP URL from any stream below and paste it into OBS Studio as your "Stream Key". 
          Set your server to "Custom" and use the provided RTMP URL.
        </AlertDescription>
      </Alert>

      {/* Stream Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeStreams.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled" data-testid="tab-scheduled">
            Scheduled ({scheduledStreams.length})
          </TabsTrigger>
          <TabsTrigger value="ended" data-testid="tab-ended">
            Ended ({endedStreams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeStreams.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Video className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Streams</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any live streams running right now.
                </p>
                <Button onClick={() => setShowCreateForm(true)} data-testid="button-create-first-stream">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Stream
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeStreams.map((stream) => (
                <StreamCard
                  key={stream.id}
                  stream={stream}
                  onStart={handleStartStream}
                  onEnd={handleEndStream}
                  onCopyKey={copyStreamKey}
                  onRegenerateKey={(id) => regenerateKeyMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          {scheduledStreams.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Scheduled Streams</h3>
                <p className="text-muted-foreground">
                  You don't have any upcoming scheduled streams.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {scheduledStreams.map((stream) => (
                <StreamCard
                  key={stream.id}
                  stream={stream}
                  onStart={handleStartStream}
                  onEnd={handleEndStream}
                  onCopyKey={copyStreamKey}
                  onRegenerateKey={(id) => regenerateKeyMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ended" className="space-y-4">
          {endedStreams.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Square className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Ended Streams</h3>
                <p className="text-muted-foreground">
                  Your completed streams will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {endedStreams.map((stream) => (
                <StreamCard
                  key={stream.id}
                  stream={stream}
                  onStart={handleStartStream}
                  onEnd={handleEndStream}
                  onCopyKey={copyStreamKey}
                  onRegenerateKey={(id) => regenerateKeyMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StreamCardProps {
  stream: LiveStream;
  onStart: (id: string) => void;
  onEnd: (id: string) => void;
  onCopyKey: (stream: LiveStream) => void;
  onRegenerateKey: (id: string) => void;
}

function StreamCard({ stream, onStart, onEnd, onCopyKey, onRegenerateKey }: StreamCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-red-500";
      case "scheduled":
        return "bg-yellow-500";
      case "ended":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card data-testid={`stream-card-${stream.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{stream.title}</CardTitle>
          <Badge className={`${getStatusColor(stream.status)} text-white`}>
            {stream.status.toUpperCase()}
          </Badge>
        </div>
        {stream.description && (
          <p className="text-sm text-muted-foreground">{stream.description}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{stream.viewerCount || 0} viewers</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{stream.visibility}</span>
          </div>
          {stream.scheduledStart && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {stream.status === "scheduled" ? "Starts" : "Started"}{" "}
                {new Date(stream.scheduledStart).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {stream.status === "scheduled" && (
            <Button
              size="sm"
              onClick={() => onStart(stream.id)}
              data-testid={`button-start-${stream.id}`}
            >
              <Play className="w-4 h-4 mr-1" />
              Start Stream
            </Button>
          )}
          
          {stream.status === "live" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onEnd(stream.id)}
              data-testid={`button-end-${stream.id}`}
            >
              <Square className="w-4 h-4 mr-1" />
              End Stream
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => onCopyKey(stream)}
            data-testid={`button-copy-url-${stream.id}`}
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy RTMP URL
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onRegenerateKey(stream.id)}
            data-testid={`button-regenerate-${stream.id}`}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Regenerate Key
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}