import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LiveStreamPlayer } from "@/components/LiveStreamPlayer";
import { CreateLiveStreamForm } from "@/components/CreateLiveStreamForm";
import { useAuth } from "@/hooks/use-auth";
import {
  Radio,
  Search,
  Plus,
  Filter,
  Calendar,
  Users,
  Eye,
  Clock,
  Zap,
} from "lucide-react";

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  status: "scheduled" | "live" | "ended";
  visibility: "public" | "unlisted" | "private";
  providerPlaybackUrl?: string;
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

export function LivePage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: streams = [], isLoading } = useQuery<LiveStream[]>({
    queryKey: ["/api/live/streams"],
  });

  // Filter streams based on search and status
  const filteredStreams = streams.filter((stream) => {
    const matchesSearch = stream.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         stream.owner.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || stream.status === statusFilter;
    const isVisible = stream.visibility === "public" || 
                     (user && stream.owner.id === user.id);
    
    return matchesSearch && matchesStatus && isVisible;
  });

  const liveStreams = filteredStreams.filter(stream => stream.status === "live");
  const scheduledStreams = filteredStreams.filter(stream => stream.status === "scheduled");
  const allStreams = filteredStreams;

  const getStreamsByStatus = (status: string) => {
    switch (status) {
      case "live":
        return liveStreams;
      case "scheduled":
        return scheduledStreams;
      default:
        return allStreams;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading live streams...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6" data-testid="live-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <Radio className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Live Streams</h1>
            <p className="text-muted-foreground">
              Watch live political discussions, debates, and community events
            </p>
          </div>
        </div>
        
        {user && (
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-stream" className="shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Go Live
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Live Stream</DialogTitle>
              </DialogHeader>
              <CreateLiveStreamForm
                onSuccess={() => setShowCreateForm(false)}
                onCancel={() => setShowCreateForm(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <div className="text-sm font-medium">Live Now</div>
            </div>
            <div className="text-2xl font-bold text-red-600">{liveStreams.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-yellow-600" />
              <div className="text-sm font-medium">Scheduled</div>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{scheduledStreams.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <div className="text-sm font-medium">Total Viewers</div>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {liveStreams.reduce((total, stream) => total + (stream.viewerCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-green-600" />
              <div className="text-sm font-medium">All Streams</div>
            </div>
            <div className="text-2xl font-bold text-green-600">{allStreams.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search streams or streamers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Streams</SelectItem>
            <SelectItem value="live">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                Live Only
              </div>
            </SelectItem>
            <SelectItem value="scheduled">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Scheduled
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stream Tabs */}
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live" className="flex items-center gap-2" data-testid="tab-live">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            Live ({liveStreams.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2" data-testid="tab-scheduled">
            <Calendar className="w-4 h-4" />
            Scheduled ({scheduledStreams.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2" data-testid="tab-all">
            <Eye className="w-4 h-4" />
            All ({allStreams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-6">
          {liveStreams.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="No Live Streams"
              description="There are no live streams right now. Check back later or start your own!"
              action={
                user ? (
                  <Button onClick={() => setShowCreateForm(true)} data-testid="button-go-live">
                    <Zap className="w-4 h-4 mr-2" />
                    Go Live Now
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {liveStreams.map((stream) => (
                <LiveStreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          {scheduledStreams.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No Scheduled Streams"
              description="There are no upcoming scheduled streams."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {scheduledStreams.map((stream) => (
                <LiveStreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {allStreams.length === 0 ? (
            <EmptyState
              icon={Eye}
              title="No Streams Found"
              description="No streams match your current search and filter criteria."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allStreams.map((stream) => (
                <LiveStreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface LiveStreamCardProps {
  stream: LiveStream;
}

function LiveStreamCard({ stream }: LiveStreamCardProps) {
  const getStatusColor = () => {
    switch (stream.status) {
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

  const getStatusText = () => {
    switch (stream.status) {
      case "live":
        return "LIVE";
      case "scheduled":
        return "SCHEDULED";
      case "ended":
        return "ENDED";
      default:
        return "OFFLINE";
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow" data-testid={`stream-card-${stream.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate" data-testid="stream-title">
              {stream.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground truncate" data-testid="stream-owner">
              by {stream.owner.username}
            </p>
          </div>
          <Badge className={`${getStatusColor()} text-white ml-2 shrink-0`} data-testid="stream-status">
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Thumbnail/Preview */}
        <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg flex items-center justify-center">
          {stream.status === "live" ? (
            <div className="text-center">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mx-auto mb-2"></div>
              <Radio className="w-8 h-8 text-red-500 mx-auto" />
              <p className="text-sm font-medium mt-1">LIVE</p>
            </div>
          ) : stream.status === "scheduled" ? (
            <div className="text-center">
              <Clock className="w-8 h-8 text-yellow-500 mx-auto" />
              <p className="text-sm font-medium mt-1">SCHEDULED</p>
            </div>
          ) : (
            <div className="text-center">
              <Eye className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-sm font-medium mt-1">ENDED</p>
            </div>
          )}
        </div>

        {/* Stream Info */}
        <div className="space-y-2">
          {stream.description && (
            <p className="text-sm text-muted-foreground line-clamp-2" data-testid="stream-description">
              {stream.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{stream.viewerCount || 0} viewers</span>
            </div>
            
            {stream.scheduledStart && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">
                  {new Date(stream.scheduledStart).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Button
          variant={stream.status === "live" ? "default" : "outline"}
          size="sm"
          className="w-full"
          data-testid={`button-watch-${stream.id}`}
        >
          {stream.status === "live" ? (
            <>
              <Radio className="w-4 h-4 mr-2" />
              Watch Live
            </>
          ) : stream.status === "scheduled" ? (
            <>
              <Calendar className="w-4 h-4 mr-2" />
              Set Reminder
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              View Recording
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4 max-w-md">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}