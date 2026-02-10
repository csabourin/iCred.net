import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Shield, Search, Building2, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/registry", label: "Issuers", icon: Building2 },
  { href: "/verify", label: "Verify", icon: Search },
];

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
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
                data-testid={`link-nav-${label.toLowerCase()}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <div className="sm:hidden">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="button-mobile-menu"
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
                data-testid={`link-mobile-nav-${label.toLowerCase()}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
