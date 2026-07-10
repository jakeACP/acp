import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Home, Globe, Plus, MessageCircle, User } from "lucide-react";
import { CreatePostModal } from "./CreatePostModal";
import { useHaptics } from "../hooks/useHaptics";

interface NavItem {
  href: string;
  icon: typeof Home;
  label: string;
  isCreate?: boolean;
}

const navItems: NavItem[] = [
  { href: "/mobile",       icon: Home,          label: "Home"   },
  { href: "/mobile/civic", icon: Globe,         label: "Civic"  },
  { href: "/mobile/create",icon: Plus,          label: "Create", isCreate: true },
  { href: "/mobile/messages", icon: MessageCircle, label: "Inbox" },
  { href: "/mobile/profile",  icon: User,          label: "Profile" },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { selection } = useHaptics();

  return (
    <>
      <nav className="glass-bottom-nav" data-testid="mobile-bottom-nav">
        <div className="glass-bottom-nav-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/mobile"
                ? location === "/mobile" || location === "/mobile/"
                : location.startsWith(item.href);

            if (item.isCreate) {
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className="create-button"
                    data-testid="mobile-nav-create"
                    aria-label="Create"
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                </Link>
              );
            }

            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={`nav-button ${isActive ? "active" : ""}`}
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                  onClick={() => { if (!isActive) selection(); }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px]">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
