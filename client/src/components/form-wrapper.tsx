import { ReactNode } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorMessage } from "@/components/error-message";

interface FormWrapperProps {
  children: ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  loadingText?: string;
  className?: string;
}

export function FormWrapper({
  children,
  isLoading = false,
  error,
  onRetry,
  loadingText = "Processing...",
  className,
}: FormWrapperProps) {
  if (error) {
    return (
      <div className={className}>
        <ErrorMessage
          message={error.message || "Something went wrong. Please try again."}
          onRetry={onRetry}
          variant="error"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <fieldset disabled={isLoading} className="space-y-4">
        {children}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner text={loadingText} />
          </div>
        )}
      </fieldset>
    </div>
  );
}