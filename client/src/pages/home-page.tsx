import { Navigation } from "@/components/navigation";
import { UserSidebar } from "@/components/user-sidebar";
import { MainFeed } from "@/components/main-feed";
import { ActivitySidebar } from "@/components/activity-sidebar";

export default function HomePage() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <UserSidebar />
          </div>
          
          <div className="lg:col-span-2">
            <MainFeed />
          </div>
          
          <div className="lg:col-span-1">
            <ActivitySidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
