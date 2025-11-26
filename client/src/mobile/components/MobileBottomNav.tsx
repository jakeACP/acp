import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Home, Calendar, Plus, Users, User } from "lucide-react";
import { CreatePostModal } from "./CreatePostModal";

interface NavItem {
  href: string;
  icon: typeof Home;
  label: string;
  isCreate?: boolean;
}

const navItems: NavItem[] = [
  { href: "/mobile", icon: Home, label: "Home" },
  { href: "/mobile/events", icon: Calendar, label: "Events" },
  { href: "/mobile/create", icon: Plus, label: "Create", isCreate: true },
  { href: "/mobile/groups", icon: Users, label: "Groups" },
  { href: "/mobile/profile", icon: User, label: "Profile" },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <nav className="glass-bottom-nav" data-testid="mobile-bottom-nav">
        <div className="glass-bottom-nav-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || 
              (item.href === "/mobile" && location === "/mobile/") ||
              (item.href !== "/mobile" && location.startsWith(item.href));

            if (item.isCreate) {
              return (
                <button 
                  key={item.href}
                  className="create-button"
                  data-testid="mobile-nav-create"
                  aria-label="Create Post"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Icon className="w-6 h-6" />
                </button>
              );
            }

            return (
              <Link key={item.href} href={item.href}>
                <button 
                  className={`nav-button ${isActive ? 'active' : ''}`}
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px]">{item.label}</span>
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
