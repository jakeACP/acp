import { Navigation } from "@/components/navigation";
import { UserSidebar } from "@/components/user-sidebar";
import { MainFeed } from "@/components/main-feed";
import { ActivitySidebar } from "@/components/activity-sidebar";

export default function HomePage() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      
      {/* Desktop Layout - Expanded */}
      <div className="hidden md:block">
        <div className="max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-4 lg:px-6 xl:px-8 py-6">
          <div className="grid grid-cols-5 xl:grid-cols-6 gap-6">
            <div className="col-span-1 xl:col-span-1">
              <UserSidebar />
            </div>
            
            <div className="col-span-3 xl:col-span-4">
              <MainFeed />
            </div>
            
            <div className="col-span-1">
              <ActivitySidebar />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - TikTok Style */}
      <div className="md:hidden">
        <div className="pb-16">
          <MainFeed />
        </div>
        
        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="flex justify-around items-center py-2 px-4">
            <button className="flex flex-col items-center py-2">
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
              <span className="text-xs">Home</span>
            </button>
            <button className="flex flex-col items-center py-2">
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span className="text-xs">Activity</span>
            </button>
            <button className="flex flex-col items-center py-2">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mb-1">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span className="text-xs">Create</span>
            </button>
            <button className="flex flex-col items-center py-2">
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="m22 21-3-3m3 3-3-3"/>
              </svg>
              <span className="text-xs">Friends</span>
            </button>
            <button className="flex flex-col items-center py-2">
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span className="text-xs">Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
