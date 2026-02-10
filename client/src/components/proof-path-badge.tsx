import { Badge } from "@/components/ui/badge";
import { GraduationCap, Users, Briefcase, ClipboardCheck, BookOpen } from "lucide-react";
import { PROOF_PATHS } from "@shared/schema";
import { cn } from "@/lib/utils";

const PATH_ICONS: Record<string, typeof GraduationCap> = {
  institutional: GraduationCap,
  community: Users,
  portfolio: Briefcase,
  assessment: ClipboardCheck,
  methodology: BookOpen,
};

export function ProofPathBadge({ path }: { path: string }) {
  const info = PROOF_PATHS[path as keyof typeof PROOF_PATHS];
  const Icon = PATH_ICONS[path] || BookOpen;
  if (!info) return null;

  return (
    <Badge
      variant="outline"
      className="gap-1 font-normal no-default-hover-elevate no-default-active-elevate"
      data-testid={`badge-path-${path}`}
    >
      <Icon className="w-3 h-3" />
      {info.label}
    </Badge>
  );
}
