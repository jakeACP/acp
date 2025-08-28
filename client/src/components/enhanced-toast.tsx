import { toast as originalToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, XCircle, Info } from "lucide-react";

interface EnhancedToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const variantConfig = {
  default: {
    icon: Info,
    className: "",
  },
  destructive: {
    icon: XCircle,
    className: "bg-red-50 border-red-200 text-red-900",
  },
  success: {
    icon: CheckCircle,
    className: "bg-green-50 border-green-200 text-green-900",
  },
  warning: {
    icon: AlertCircle,
    className: "bg-yellow-50 border-yellow-200 text-yellow-900",
  },
  info: {
    icon: Info,
    className: "bg-blue-50 border-blue-200 text-blue-900",
  },
};

export function enhancedToast(options: EnhancedToastOptions) {
  const { title, description, variant = "default", duration = 5000, action } = options;
  const config = variantConfig[variant];
  const Icon = config.icon;

  return originalToast({
    title: (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {title}
      </div>
    ),
    description,
    variant: variant === "success" || variant === "warning" || variant === "info" ? "default" : variant,
    duration,
    action: action ? (
      <button
        onClick={action.onClick}
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        {action.label}
      </button>
    ) : undefined,
  } as any);
}

// Convenience functions
export const toast = {
  success: (title: string, description?: string, options?: Partial<EnhancedToastOptions>) =>
    enhancedToast({ title, description, variant: "success", ...options }),
    
  error: (title: string, description?: string, options?: Partial<EnhancedToastOptions>) =>
    enhancedToast({ title, description, variant: "destructive", ...options }),
    
  warning: (title: string, description?: string, options?: Partial<EnhancedToastOptions>) =>
    enhancedToast({ title, description, variant: "warning", ...options }),
    
  info: (title: string, description?: string, options?: Partial<EnhancedToastOptions>) =>
    enhancedToast({ title, description, variant: "info", ...options }),
    
  default: (title: string, description?: string, options?: Partial<EnhancedToastOptions>) =>
    enhancedToast({ title, description, variant: "default", ...options }),
};