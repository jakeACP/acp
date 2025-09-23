import { LiveStreamManager } from "@/components/LiveStreamManager";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Video, AlertCircle } from "lucide-react";

export default function MyStreamsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground">
              You need to be logged in to manage your live streams.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Video className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold">My Live Streams</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your live streams, view analytics, and configure OBS settings
          </p>
        </div>

        <LiveStreamManager userId={user.id} />
      </div>
    </div>
  );
}