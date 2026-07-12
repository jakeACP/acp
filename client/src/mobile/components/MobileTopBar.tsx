import { LayoutGrid, MessageCircle, Palette, Volume2, VolumeX } from "lucide-react";
import { Link } from "wouter";
import acpLogo from "@assets/logo-tpb_1763998990798.png";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";

interface MobileTopBarProps {
  title?: string;
  subtitle?: string;
  activeSegment?: "signals" | "feed";
  onSegmentChange?: (segment: "signals" | "feed") => void;
  onDiscover?: () => void;
  muted?: boolean;
  onMuteToggle?: () => void;
}

export function MobileTopBar({
  title,
  subtitle,
  activeSegment,
  onSegmentChange,
  onDiscover,
  muted,
  onMuteToggle,
}: MobileTopBarProps) {
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
    <header className="glass-top-bar mobile-home-top-bar" data-testid="mobile-top-bar">
      <div className="mobile-home-top-bar-inner">
        <Link href="/mobile" className="mobile-top-logo" aria-label="ACP home" data-testid="mobile-logo">
          <span className="logo-container" aria-hidden="true">
            <img src={acpLogo} alt="ACP" />
          </span>
        </Link>

        {activeSegment && onSegmentChange ? (
          <div className="mobile-feed-switcher" role="tablist" aria-label="Home feed">
            <button
              type="button"
              role="tab"
              aria-selected={activeSegment === "signals"}
              onClick={() => onSegmentChange("signals")}
              className={activeSegment === "signals" ? "active" : ""}
            >
              Signals
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSegment === "feed"}
              onClick={() => onSegmentChange("feed")}
              className={activeSegment === "feed" ? "active" : ""}
            >
              News Feed
            </button>
          </div>
        ) : (
          <div className="text-center flex-1 min-w-0 px-2">
            <h1 className="text-white font-bold text-sm truncate uppercase">{title}</h1>
            {subtitle && <p className="text-white/70 text-[10px] truncate">{subtitle}</p>}
          </div>
        )}

        <div className="mobile-top-actions">
          {onDiscover && (
            <button
              type="button"
              className="mobile-top-icon"
              aria-label="Browse Signals"
              onClick={onDiscover}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          )}
          {onMuteToggle && (
            <button
              type="button"
              className="mobile-top-icon"
              aria-label={muted ? "Unmute signal" : "Mute signal"}
              onClick={onMuteToggle}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
          <button
            type="button"
            className="mobile-top-icon"
            data-testid="mobile-theme-toggle"
            aria-label="Toggle theme"
            onClick={cycleTheme}
          >
            <Palette className="w-4 h-4" />
          </button>
          <Link
            href="/mobile/messages"
            className="mobile-top-icon"
            data-testid="mobile-messages"
            aria-label="Messages"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
