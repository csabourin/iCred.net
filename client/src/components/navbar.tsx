import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, Search, Building2, Menu, X, User, LogIn, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/registry", label: "Issuers", icon: Building2 },
  { href: "/verify", label: "Verify", icon: Search },
];

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">icred</span>
          </div>
        </Link>

        <div className="hidden sm:flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-1.5",
                  location.startsWith(href) && "bg-accent"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">@{user.pseudonym}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/holder/${user.pseudonym}`}>
                    <User className="w-4 h-4 mr-2" /> My Profile
                  </Link>
                </DropdownMenuItem>
                {(user.role === "issuer" || user.role === "admin") && (
                  <DropdownMenuItem asChild>
                    <Link href="/issuer-dashboard">
                      <Building2 className="w-4 h-4 mr-2" /> Issuer Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                {user.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <ShieldCheck className="w-4 h-4 mr-2" /> Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            </Link>
          )}

          <div className="sm:hidden">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div className="sm:hidden border-t bg-background px-4 py-2 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2",
                  location.startsWith(href) && "bg-accent"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            </Link>
          ))}
          {user && (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setMobileOpen(false)}>
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Button>
              </Link>
              {(user.role === "issuer" || user.role === "admin") && (
                <Link href="/issuer-dashboard">
                  <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setMobileOpen(false)}>
                    <Building2 className="w-4 h-4" /> Issuer
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </header>
  );
}
