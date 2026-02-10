import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "valid" | "expired" | "revoked";

const STATUS_CONFIG: Record<Status, { icon: typeof CheckCircle2; label: string; bg: string; text: string }> = {
  valid: { icon: CheckCircle2, label: "Valid", bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" },
  expired: { icon: Clock, label: "Expired", bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300" },
  revoked: { icon: XCircle, label: "Revoked", bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300" },
};

export function CredentialStatus({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as Status] || STATUS_CONFIG.valid;
  const Icon = config.icon;

  return (
    <Badge
      className={cn(
        config.bg,
        config.text,
        "no-default-hover-elevate no-default-active-elevate gap-1 font-medium"
      )}
      data-testid={`badge-status-${status}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
}
