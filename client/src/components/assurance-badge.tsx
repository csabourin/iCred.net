import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldAlert, Award, Eye, User } from "lucide-react";
import { ASSURANCE_LEVELS } from "@shared/schema";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<number, { bg: string; text: string; icon: typeof Shield }> = {
  0: { bg: "bg-muted", text: "text-muted-foreground", icon: User },
  1: { bg: "bg-secondary", text: "text-secondary-foreground", icon: Shield },
  2: { bg: "bg-accent", text: "text-accent-foreground", icon: ShieldAlert },
  3: { bg: "bg-primary", text: "text-primary-foreground", icon: ShieldCheck },
  4: { bg: "bg-emerald-600 dark:bg-emerald-700", text: "text-white", icon: Award },
  5: { bg: "bg-violet-600 dark:bg-violet-700", text: "text-white", icon: Eye },
};

export function AssuranceBadge({
  level,
  size = "default",
  showLabel = true,
}: {
  level: number | string;
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
}) {
  // Accept either number (0-5) or string ("A0"-"A5")
  const levelNum = typeof level === "string" ? parseInt(level.replace("A", ""), 10) : level;
  const levelCode = typeof level === "string" ? level : `A${level}`;
  const info = ASSURANCE_LEVELS[levelCode as keyof typeof ASSURANCE_LEVELS];
  const style = LEVEL_STYLES[levelNum] || LEVEL_STYLES[0];
  const Icon = style.icon;

  if (!info) return null;

  return (
    <Badge
      className={cn(
        style.bg,
        style.text,
        "gap-1",
        size === "sm" && "text-xs",
        size === "lg" && "text-sm px-3 py-1"
      )}
    >
      <Icon className={cn(size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />
      {showLabel && <span>{info.code}</span>}
      {size === "lg" && <span className="ml-0.5">{info.label}</span>}
    </Badge>
  );
}

export function AssuranceLevelList() {
  return (
    <div className="space-y-2">
      {Object.entries(ASSURANCE_LEVELS).map(([key, info]) => {
        const level = info.level;
        return (
          <div key={key} className="flex items-center gap-3">
            <AssuranceBadge level={level} size="lg" />
            <span className="text-sm text-muted-foreground">{info.description}</span>
          </div>
        );
      })}
    </div>
  );
}
