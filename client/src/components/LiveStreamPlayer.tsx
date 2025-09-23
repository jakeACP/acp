import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Users, Clock, Play, Pause } from "lucide-react";

interface LiveStreamPlayerProps {
  stream: {
    id: string;
    title: string;
    description?: string;
    status: "scheduled" | "live" | "ended";
    providerPlaybackUrl?: string;
    scheduledStart?: string;
    actualStart?: string;
    actualEnd?: string;
    viewerCount?: number;
    owner: {
      id: string;
      username: string;
    };
  };
  showControls?: boolean;
}

export function LiveStreamPlayer({ stream, showControls = true }: LiveStreamPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewerCount, setViewerCount] = useState(stream.viewerCount || 0);

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

  const formatScheduledTime = () => {
    if (!stream.scheduledStart) return "";
    const date = new Date(stream.scheduledStart);
    return date.toLocaleString();
  };

  return (
    <Card className="w-full" data-testid={`stream-player-${stream.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg" data-testid="stream-title">{stream.title}</CardTitle>
          <Badge className={`${getStatusColor()} text-white`} data-testid="stream-status">
            {getStatusText()}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="stream-owner">
          by {stream.owner.username}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Video Player Area */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden" data-testid="video-container">
          {stream.status === "live" && stream.providerPlaybackUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              {/* Video player would be integrated here with provider's player */}
              <div className="text-white text-center">
                <Play className="w-12 h-12 mx-auto mb-2" />
                <p>Live Video Player</p>
                <p className="text-sm opacity-75">
                  Video URL: {stream.providerPlaybackUrl}
                </p>
              </div>
            </div>
          ) : stream.status === "scheduled" ? (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-2" />
                <p>Stream Scheduled</p>
                <p className="text-sm opacity-75">
                  Starts: {formatScheduledTime()}
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <Pause className="w-12 h-12 mx-auto mb-2" />
                <p>Stream Offline</p>
              </div>
            </div>
          )}
        </div>

        {/* Stream Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1" data-testid="viewer-count">
            <Eye className="w-4 h-4" />
            <span>{viewerCount} viewers</span>
          </div>
          {stream.actualStart && (
            <div className="flex items-center gap-1" data-testid="stream-start-time">
              <Clock className="w-4 h-4" />
              <span>Started {new Date(stream.actualStart).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {stream.description && (
          <p className="text-sm" data-testid="stream-description">
            {stream.description}
          </p>
        )}

        {/* Controls */}
        {showControls && stream.status === "live" && (
          <div className="flex gap-2">
            <Button
              variant={isPlaying ? "secondary" : "default"}
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              data-testid="button-play-pause"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Play
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}