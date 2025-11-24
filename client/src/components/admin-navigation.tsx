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
  Sliders
} from "lucide-react";

const adminMenuItems = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Moderation",
    href: "/admin/moderation",
    icon: Shield,
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: UserCircle,
  },
  {
    name: "Politicians",
    href: "/admin/politicians",
    icon: Users,
  },
  {
    name: "Polls",
    href: "/admin/polls",
    icon: BarChart3,
  },
  {
    name: "Security",
    href: "/admin/security",
    icon: Lock,
  },
  {
    name: "Database",
    href: "/admin/database",
    icon: Database,
  },
  {
    name: "Algorithm",
    href: "/admin/algorithm",
    icon: Cpu,
  },
  {
    name: "Algorithm Settings",
    href: "/admin/algorithm-settings",
    icon: Sliders,
  },
  {
    name: "ACP+",
    href: "/admin/acp-plus",
    icon: Coins,
  },
  {
    name: "Global Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminNavigation() {
  const [location] = useLocation();

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-1">
            <div className="flex items-center gap-2 mr-6">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Admin Panel
              </h2>
            </div>
            
            <nav className="hidden md:flex space-x-1">
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
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                      )}
                      data-testid={`admin-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </a>
                  </Link>
                );
              })}
            </nav>
          </div>

          <Link href="/">
            <a className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
              Back to Site
            </a>
          </Link>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3">
          <div className="grid grid-cols-2 gap-2">
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
