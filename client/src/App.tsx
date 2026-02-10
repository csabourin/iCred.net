import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import Landing from "@/pages/landing";
import Registry from "@/pages/registry";
import Verify from "@/pages/verify";
import HolderProfile from "@/pages/holder-profile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/registry" component={Registry} />
      <Route path="/verify" component={Verify} />
      <Route path="/verify/:id" component={Verify} />
      <Route path="/holder/:pseudonym" component={HolderProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main>
              <Router />
            </main>
            <footer className="border-t py-6 text-center text-sm text-muted-foreground">
              <div className="max-w-5xl mx-auto px-4">
                icred.net — Verifiable Credibility Hub — Privacy-first, inclusive, rigorous.
              </div>
            </footer>
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
