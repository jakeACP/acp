import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./loading-spinner";
import { ReactNode } from "react";

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children: ReactNode;
  loadingText?: string;
  testId?: string;
}

export function ActionButton({
  onClick,
  disabled = false,
  loading = false,
  variant = "default",
  size = "default",
  className,
  children,
  loadingText,
  testId,
}: ActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      variant={variant}
      size={size}
      className={className}
      data-testid={testId}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          {loadingText || "Loading..."}
        </>
      ) : (
        children
      )}
    </Button>
  );
}