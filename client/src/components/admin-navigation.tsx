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
  BarChart3,
  Sliders,
  Building2
} from "lucide-react";

// Organized by category for better navigation
const adminMenuItems = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    category: "main",
  },
  {
    name: "Moderation",
    href: "/admin/moderation",
    icon: Shield,
    category: "content",
  },
  {
    name: "Polls",
    href: "/admin/polls",
    icon: BarChart3,
    category: "content",
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: UserCircle,
    category: "people",
  },
  {
    name: "Politicians",
    href: "/admin/politicians",
    icon: Users,
    category: "people",
  },
  {
    name: "SIGs",
    href: "/admin/sigs",
    icon: Building2,
    category: "people",
  },
  {
    name: "Security",
    href: "/admin/security",
    icon: Lock,
    category: "system",
  },
  {
    name: "Database",
    href: "/admin/database",
    icon: Database,
    category: "system",
  },
  {
    name: "Algorithm",
    href: "/admin/algorithm",
    icon: Cpu,
    category: "system",
  },
  {
    name: "Config",
    href: "/admin/algorithm-settings",
    icon: Sliders,
    category: "system",
  },
  {
    name: "AI Writer",
    href: "/admin/ai-parameters",
    icon: Cpu,
    category: "content",
  },
  {
    name: "ACP+",
    href: "/admin/acp-plus",
    icon: Coins,
    category: "business",
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    category: "config",
  },
];

export function AdminNavigation() {
  const [location] = useLocation();

  // Group items by category for visual organization
  const groupedItems: { [key: string]: typeof adminMenuItems } = {};
  adminMenuItems.forEach((item) => {
    if (!groupedItems[item.category]) {
      groupedItems[item.category] = [];
    }
    groupedItems[item.category].push(item);
  });

  const categoryOrder = ["main", "content", "people", "system", "business", "config"];

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center overflow-x-auto">
            <div className="flex items-center gap-2 mr-4 flex-shrink-0">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Admin
              </h2>
            </div>
            
            <nav className="hidden lg:flex items-center gap-1">
              {categoryOrder.map((category, categoryIndex) => {
                const items = groupedItems[category] || [];
                if (items.length === 0) return null;
                
                return (
                  <div key={category} className="flex items-center">
                    {categoryIndex > 0 && (
                      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                    )}
                    <div className="flex gap-0.5">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location === item.href;
                        
                        return (
                          <Link key={item.href} href={item.href}>
                            <a
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                                isActive
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                              )}
                              data-testid={`admin-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              <span>{item.name}</span>
                            </a>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          <Link href="/">
            <a className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex-shrink-0">
              Back to Site
            </a>
          </Link>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden pb-3 -mt-2">
          <div className="grid grid-cols-2 gap-1.5">
            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                    data-testid={`admin-nav-mobile-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </a>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
