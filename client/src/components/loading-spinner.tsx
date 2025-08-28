import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex flex-col items-center space-y-2">
        <div
          className={cn(
            "animate-spin rounded-full border-b-2 border-primary",
            sizeClasses[size]
          )}
          data-testid="loading-spinner"
        />
        {text && (
          <p className="text-sm text-muted-foreground animate-pulse" data-testid="loading-text">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse bg-muted rounded", className)}
      data-testid="loading-skeleton"
    />
  );
}