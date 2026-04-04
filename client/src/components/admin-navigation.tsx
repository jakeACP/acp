import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Shield,
  Users,
  UserCircle,
  Lock,
  Database,
  Cpu,
  Coins,
  Settings,
  Building2,
  Flag,
  BadgeCheck,
  Radar,
  ChevronDown,
  Bot,
  FileDown,
  HardDrive,
  Layers,
  Puzzle,
  ArrowLeft,
  Menu,
  X,
  SlidersHorizontal,
} from "lucide-react";

interface SubItem {
  name: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  badge?: string;
}

interface NavCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  items: SubItem[];
}

const navCategories: NavCategory[] = [
  {
    id: "moderation",
    label: "Moderation",
    icon: Shield,
    items: [
      { name: "Flags", href: "/admin/moderation", icon: Flag },
      { name: "Security", href: "/admin/security", icon: Lock },
    ],
  },
  {
    id: "database",
    label: "Database",
    icon: Database,
    items: [
      { name: "Users", href: "/admin/users", icon: UserCircle },
      { name: "Politicians", href: "/admin/politicians", icon: Users },
      { name: "SIGs", href: "/admin/sigs", icon: Building2 },
      { name: "ACEs", href: "/admin/ace-pledges", icon: BadgeCheck },
      { name: "Trading Flags", href: "/admin/trading-flags", icon: Flag },
    ],
  },
  {
    id: "ai",
    label: "AI Tools",
    icon: Bot,
    items: [
      { name: "Algorithm", href: "/admin/algorithm", icon: Cpu },
      { name: "AI Writer", href: "/admin/ai-parameters", icon: Cpu },
      { name: "News Scanner", href: "/admin/scanner", icon: Radar },
      { name: "Agentic AI", href: "#", icon: Bot, disabled: true, badge: "Soon" },
    ],
  },
  {
    id: "settings",
    label: "Global Settings",
    icon: Settings,
    items: [
      { name: "Defaults", href: "/admin/settings", icon: SlidersHorizontal },
      { name: "Import / Export", href: "/admin/state-data", icon: FileDown },
      { name: "Backup System", href: "/admin/database", icon: HardDrive },
    ],
  },
  {
    id: "paid",
    label: "Paid Features",
    icon: Coins,
    items: [
      { name: "Templates", href: "/admin/acp-plus", icon: Layers },
      { name: "Modules", href: "/admin/acp-plus", icon: Puzzle },
    ],
  },
];

function DropdownMenu({
  category,
  location,
}: {
  category: NavCategory;
  location: string;
}) {
  const [open, setOpen] = useState(false);
  const CategoryIcon = category.icon;

  const isActiveCategory = category.items.some(
    (item) => !item.disabled && location === item.href
  );

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap select-none",
          isActiveCategory
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
        )}
      >
        <CategoryIcon className="h-3.5 w-3.5" />
        <span>{category.label}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 min-w-[160px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50"
          onMouseEnter={() => setOpen(true)}
        >
          {category.items.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            if (item.disabled) {
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-slate-400 dark:text-slate-600 cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={item.href + item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminNavigation() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  const isDashboard = location === "/admin/dashboard";

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                ACP Admin
              </span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5 ml-2">
              {/* Dashboard — direct link, no dropdown */}
              <Link
                href="/admin/dashboard"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                  isDashboard
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

              {navCategories.map((category, i) => (
                <div key={category.id} className="flex items-center">
                  {i > 0 && (
                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                  )}
                  <DropdownMenu category={category} location={location} />
                </div>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden lg:flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Site
            </Link>

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pb-4">
          {/* Dashboard */}
          <Link
            href="/admin/dashboard"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b border-slate-100 dark:border-slate-800",
              isDashboard
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                : "text-slate-700 dark:text-slate-300"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          {navCategories.map((category) => {
            const CategoryIcon = category.icon;
            const isExpanded = mobileExpanded === category.id;
            const isActiveCategory = category.items.some(
              (item) => !item.disabled && location === item.href
            );

            return (
              <div key={category.id} className="border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() =>
                    setMobileExpanded(isExpanded ? null : category.id)
                  }
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-sm font-medium",
                    isActiveCategory
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-slate-700 dark:text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="h-4 w-4" />
                    {category.label}
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-150",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {isExpanded && (
                  <div className="bg-slate-50 dark:bg-slate-950">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.href;
                      if (item.disabled) {
                        return (
                          <div
                            key={item.name}
                            className="flex items-center justify-between gap-2 pl-10 pr-4 py-2.5 text-sm text-slate-400 dark:text-slate-600"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {item.name}
                            </div>
                            {item.badge && (
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return (
                        <Link
                          key={item.href + item.name}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-2 pl-10 pr-4 py-2.5 text-sm font-medium",
                            isActive
                              ? "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <Link
            href="/"
            className="flex items-center gap-2 px-4 pt-3 text-sm text-slate-500 dark:text-slate-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Site
          </Link>
        </div>
      )}
    </div>
  );
}
