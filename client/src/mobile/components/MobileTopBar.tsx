import { Bell, Palette } from "lucide-react";
import { Link } from "wouter";
import acpLogo from "@assets/logo-tpb_1763998990798.png";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";

interface MobileTopBarProps {
  title: string;
  subtitle?: string;
}

export function MobileTopBar({ title, subtitle }: MobileTopBarProps) {
  const { setTheme, actualTheme } = useTheme();
  const { toast } = useToast();

  const cycleTheme = () => {
    const themes: Array<"light" | "dark" | "patriot"> = ["light", "dark", "patriot"];
    const themeNames = { light: "Light", dark: "Dark", patriot: "Patriot" };
    const currentIndex = themes.indexOf(actualTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    setTheme(nextTheme);
    toast({ title: `${themeNames[nextTheme]} Theme`, duration: 1500 });
  };

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

        <div className="flex items-center gap-3">
          <button 
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors border border-white/20"
            data-testid="mobile-theme-toggle"
            aria-label="Toggle theme"
            onClick={cycleTheme}
          >
            <Palette className="w-5 h-5" />
          </button>

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
      </div>
    </header>
  );
}
