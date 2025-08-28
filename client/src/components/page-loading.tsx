import { LoadingSpinner, LoadingSkeleton } from "./loading-spinner";
import { Navigation } from "./navigation";

interface PageLoadingProps {
  title?: string;
  description?: string;
  showNavigation?: boolean;
}

export function PageLoading({ 
  title = "Loading...", 
  description,
  showNavigation = true 
}: PageLoadingProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      {showNavigation && <Navigation />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header skeleton */}
          <div className="space-y-2">
            <LoadingSkeleton className="h-8 w-64" />
            <LoadingSkeleton className="h-4 w-96" />
          </div>
          
          {/* Content skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-4 p-6 bg-white dark:bg-slate-800 rounded-lg border">
                <LoadingSkeleton className="h-4 w-3/4" />
                <LoadingSkeleton className="h-4 w-full" />
                <LoadingSkeleton className="h-4 w-2/3" />
                <div className="flex space-x-2">
                  <LoadingSkeleton className="h-8 w-16" />
                  <LoadingSkeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function InlineLoading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner text={text} />
    </div>
  );
}

export function ButtonLoading({ 
  text = "Loading...", 
  size = "sm" 
}: { 
  text?: string; 
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="flex items-center">
      <LoadingSpinner size={size} className="mr-2" />
      {text}
    </div>
  );
}