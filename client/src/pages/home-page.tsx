import { Navigation } from "@/components/navigation";
import { UserSidebar } from "@/components/user-sidebar";
import { MainFeed } from "@/components/main-feed";
import { ActivitySidebar } from "@/components/activity-sidebar";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreatePostForm } from "@/components/create-post-form";
import { FeedViewProvider } from "@/contexts/feed-view-context";

export default function HomePage() {
  const [location] = useLocation();
  const [showCreatePost, setShowCreatePost] = useState(false);

  return (
    <FeedViewProvider>
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
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-card border-t border-gray-200 dark:border-border z-50">
          <div className="flex justify-around items-center py-2 px-4">
            <Link href="/">
              <button 
                className={`flex flex-col items-center py-2 ${
                  location === "/" ? "text-primary" : "text-gray-600 dark:text-gray-400"
                }`}
                data-testid="mobile-tab-home"
              >
                <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                </svg>
                <span className="text-xs">Home</span>
              </button>
            </Link>
            
            <Link href="/events">
              <button 
                className={`flex flex-col items-center py-2 ${
                  location === "/events" ? "text-primary" : "text-gray-600 dark:text-gray-400"
                }`}
                data-testid="mobile-tab-activity"
              >
                <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span className="text-xs">Events</span>
              </button>
            </Link>
            
            <button 
              className="flex flex-col items-center py-2"
              onClick={() => setShowCreatePost(true)}
              data-testid="mobile-tab-create"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mb-1">
                <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Create</span>
            </button>
            
            <Link href="/friends">
              <button 
                className={`flex flex-col items-center py-2 ${
                  location === "/friends" ? "text-primary" : "text-gray-600 dark:text-gray-400"
                }`}
                data-testid="mobile-tab-friends"
              >
                <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="m22 21-3-3m3 3-3-3"/>
                </svg>
                <span className="text-xs">Friends</span>
              </button>
            </Link>
            
            <Link href="/profile">
              <button 
                className={`flex flex-col items-center py-2 ${
                  location === "/profile" ? "text-primary" : "text-gray-600 dark:text-gray-400"
                }`}
                data-testid="mobile-tab-profile"
              >
                <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="text-xs">Profile</span>
              </button>
            </Link>
          </div>
        </div>
        
        {/* Create Post Dialog */}
        <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
            </DialogHeader>
            <CreatePostForm onSuccess={() => setShowCreatePost(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </FeedViewProvider>
  );
}
