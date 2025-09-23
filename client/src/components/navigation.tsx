import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useQuery } from "@tanstack/react-query";
import { Vote, Bell, ChevronDown, Menu, Sun, Moon, Monitor, Shield } from "lucide-react";
import logoPath from "@assets/logo1_1753819424851.png";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { theme, setTheme, actualTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if user is owner admin
  const { data: adminUserId } = useQuery({
    queryKey: ["/api/admin/user-id"],
    queryFn: async () => {
      const response = await fetch("/api/admin/user-id");
      if (!response.ok) return null;
      return response.text();
    },
    enabled: user?.role === "admin"
  });

  const isOwnerAdmin = user?.role === "admin" && adminUserId && user.id === adminUserId;

  const navItems = [
    { href: "/", label: "Feed" },
    { href: "/live", label: "Live" },
    { href: "/friends", label: "Friends" },
    { href: "/messages", label: "Messages" },
    { href: "/representatives", label: "Your Reps" },
    { href: "/candidates", label: "Candidates" },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="floating-nav bg-card shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/">
              <div className="flex-shrink-0 flex items-center cursor-pointer">
                <img src={logoPath} alt="Anti-Corruption Party" className="h-12 w-12" />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={location === item.href ? "default" : "ghost"}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                      location === item.href
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="sr-only">View notifications</span>
            </Button>
            
            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" data-testid="button-theme-toggle">
                  {actualTheme === "dark" ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="floating-card border-0">
                <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer" data-testid="theme-light">
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer" data-testid="theme-dark">
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer" data-testid="theme-system">
                  <Monitor className="mr-2 h-4 w-4" />
                  <span>System</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Desktop User Menu */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-auto hover:bg-muted transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar || ""} />
                      <AvatarFallback>
                        {user?.firstName?.[0]}{user?.lastName?.[0] || user?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="floating-card border-0">
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
                  </Link>
                  <Link href="/my-streams">
                    <DropdownMenuItem className="cursor-pointer">My Streams</DropdownMenuItem>
                  </Link>
                  <Link href="/subscription">
                    <DropdownMenuItem className="cursor-pointer">ACP+ Subscription</DropdownMenuItem>
                  </Link>
                  <Link href="/crypto">
                    <DropdownMenuItem className="cursor-pointer">ACP Store</DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <Link href="/settings">
                    <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
                  </Link>
                  {isOwnerAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <Link href="/admin/representatives">
                        <DropdownMenuItem className="cursor-pointer" data-testid="link-admin-representatives">
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Portal
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 dark:text-red-400">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-border bg-white dark:bg-card">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={location === item.href ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
              <hr className="my-2 border-slate-200 dark:border-border" />
              
              {/* Mobile Theme Toggle */}
              <div className="flex items-center justify-between py-2 px-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Theme</span>
                <div className="flex gap-1">
                  <Button
                    variant={theme === "light" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className="h-8 w-8 p-0"
                    data-testid="mobile-theme-light"
                  >
                    <Sun className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className="h-8 w-8 p-0"
                    data-testid="mobile-theme-dark"
                  >
                    <Moon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTheme("system")}
                    className="h-8 w-8 p-0"
                    data-testid="mobile-theme-system"
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <hr className="my-2 border-slate-200 dark:border-border" />
              <Link href="/profile">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Profile
                </Button>
              </Link>
              <Link href="/my-streams">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  My Streams
                </Button>
              </Link>
              {isOwnerAdmin && (
                <Link href="/admin/representatives">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid="mobile-link-admin-representatives"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Portal
                  </Button>
                </Link>
              )}
              <Link href="/subscription">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ACP+ Subscription
                </Button>
              </Link>
              <Link href="/crypto">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ACP Store
                </Button>
              </Link>
              <hr className="my-2 border-slate-200 dark:border-border" />
              <Link href="/settings">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Settings
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-red-600 dark:text-red-400"
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
