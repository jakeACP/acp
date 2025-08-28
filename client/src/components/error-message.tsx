import { AlertCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: "error" | "warning" | "info";
  className?: string;
  showIcon?: boolean;
}

export function ErrorMessage({
  title,
  message,
  onRetry,
  onDismiss,
  variant = "error",
  className,
  showIcon = true,
}: ErrorMessageProps) {
  const variantStyles = {
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  };

  return (
    <Alert className={cn(variantStyles[variant], className)} data-testid="error-message">
      <div className="flex items-start justify-between w-full">
        <div className="flex items-start space-x-2 flex-1">
          {showIcon && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            {title && (
              <h5 className="font-medium mb-1" data-testid="error-title">
                {title}
              </h5>
            )}
            <AlertDescription className="text-sm" data-testid="error-description">
              {message}
            </AlertDescription>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-2 h-7"
                data-testid="button-retry"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            )}
          </div>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 hover:bg-transparent"
            data-testid="button-dismiss"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </Alert>
  );
}

export function FormErrorMessage({ 
  message, 
  className 
}: { 
  message: string; 
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-red-600", className)} data-testid="form-error">
      {message}
    </p>
  );
}