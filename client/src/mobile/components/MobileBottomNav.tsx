import { useLocation, Link } from "wouter";
import { Home, Landmark, Building2, Plus, UserCheck, MessageCircle, User } from "lucide-react";
import { useHaptics } from "../hooks/useHaptics";

interface NavItem {
  href: string;
  icon: typeof Home;
  label: string;
  isCreate?: boolean;
}

const navItems: NavItem[] = [
  { href: "/mobile",          icon: Home,          label: "Home" },
  { href: "/mobile/reps",     icon: Landmark,      label: "Reps" },
  { href: "/mobile/lobbies",  icon: Building2,     label: "Lobbies" },
  { href: "/mobile/create",   icon: Plus,          label: "Create", isCreate: true },
  { href: "/mobile/friends",  icon: UserCheck,     label: "Friends" },
  { href: "/mobile/messages", icon: MessageCircle, label: "Inbox" },
  { href: "/mobile/profile",  icon: User,          label: "Profile" },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const { selection } = useHaptics();

  return (
    <>
      <nav
        className="glass-bottom-nav"
        data-testid="mobile-bottom-nav"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="glass-bottom-nav-inner" role="tablist">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/mobile"
                ? location === "/mobile" || location === "/mobile/"
                : location.startsWith(item.href);

            if (item.isCreate) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="create-button"
                  data-testid="mobile-nav-create"
                  aria-label="Create new post"
                  role="tab"
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-button ${isActive ? "active" : ""}`}
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                role="tab"
                aria-selected={isActive}
                onClick={() => { if (!isActive) selection(); }}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span aria-hidden="true">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
