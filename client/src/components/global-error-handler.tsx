import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";

// Global error handler for React Query
export function setupGlobalErrorHandlers(queryClient: QueryClient) {
  // Error handling is set up via queryClient configuration
  // Individual queries and mutations handle their own error states
  console.log('Global error handlers initialized for query client');
}

// Component to catch unhandled errors
export function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Show user-friendly error
      toast({
        title: "Something went wrong",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Unhandled error:', event.error);
      
      // Show user-friendly error
      toast({
        title: "Something went wrong", 
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [toast]);

  return <>{children}</>;
}