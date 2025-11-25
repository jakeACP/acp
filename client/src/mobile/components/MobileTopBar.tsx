import { Bell } from "lucide-react";
import { Link } from "wouter";
import acpLogo from "@assets/logo-tpb_1763998990798.png";

interface MobileTopBarProps {
  title: string;
  subtitle?: string;
}

export function MobileTopBar({ title, subtitle }: MobileTopBarProps) {
  return (
    <header className="glass-top-bar" data-testid="mobile-top-bar">
      <div className="flex items-center justify-between">
        <Link href="/mobile">
          <div className="logo-container" data-testid="mobile-logo">
            <img src={acpLogo} alt="ACP" />
          </div>
        </Link>
        
        <div className="text-center flex-1 px-4">
          <h1 className="text-white font-bold text-lg tracking-wide uppercase">
            {title}
          </h1>
          {subtitle && (
            <p className="text-white/70 text-xs">
              {subtitle}
            </p>
          )}
        </div>

        <Link href="/mobile/notifications">
          <button 
            className="notification-button"
            data-testid="mobile-notifications"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
        </Link>
      </div>
    </header>
  );
}
