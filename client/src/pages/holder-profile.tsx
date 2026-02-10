import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Fingerprint,
  Calendar,
  ArrowLeft,
  ExternalLink,
  Shield,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { ASSURANCE_LEVELS, CREDENTIAL_FAMILIES } from "@shared/schema";

interface HolderProfileData {
  holder: {
    pseudonym: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    did: string;
    pseudonymStableSince: string;
  };
  credentials: Array<{
    credential: {
      id: string;
      domain: string;
      scope: string;
      family: string;
      claims: Record<string, any>;
      assuranceLevel: string;
      status: string;
      issuedAt: string;
      expiresAt: string | null;
    };
    issuer: {
      name: string;
      slug: string;
      verificationStatus: string;
    } | null;
  }>;
}

function CredentialCard({
  credential,
  issuer,
}: {
  credential: HolderProfileData["credentials"][0]["credential"];
  issuer: HolderProfileData["credentials"][0]["issuer"];
}) {
  const level = ASSURANCE_LEVELS[credential.assuranceLevel as keyof typeof ASSURANCE_LEVELS];
  const familyInfo = CREDENTIAL_FAMILIES[credential.family as keyof typeof CREDENTIAL_FAMILIES];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{credential.domain}</p>
            <p className="text-sm text-muted-foreground">{credential.scope}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {level && (
              <Badge variant="secondary" className="text-xs">
                {level.code}
              </Badge>
            )}
            <Badge
              variant={credential.status === "active" ? "default" : "destructive"}
              className="text-xs"
            >
              {credential.status}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {familyInfo && (
            <Badge variant="outline" className="text-xs font-normal">
              {familyInfo.label}
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          {Object.entries(credential.claims).map(([key, value]) => (
            <div key={key} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <span>
                <span className="text-muted-foreground">{key}:</span> {String(value)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(credential.issuedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </span>
            {credential.expiresAt && (
              <span>
                Exp. {new Date(credential.expiresAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {issuer && (
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {issuer.name}
                {issuer.verificationStatus === "verified" && (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                )}
              </span>
            )}
            <Link href={`/verify/${credential.id}`}>
              <span className="flex items-center gap-0.5 text-primary cursor-pointer">
                <ExternalLink className="w-3 h-3" />
                Verify
              </span>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HolderProfile() {
  const [, params] = useRoute("/holder/:pseudonym");
  const pseudonym = params?.pseudonym || "";

  const { data, isLoading, error } = useQuery<HolderProfileData>({
    queryKey: ["/api/holders", pseudonym],
    queryFn: () => fetch(`/api/holders/${pseudonym}`).then((r) => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
    enabled: !!pseudonym,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Fingerprint className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Holder Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The pseudonym "@{pseudonym}" does not exist on icred.net.
        </p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back Home
          </Button>
        </Link>
      </div>
    );
  }

  const { holder, credentials } = data;
  const activeCount = credentials.filter((c) => c.credential.status === "active").length;
  const initials = (holder.displayName || holder.pseudonym)
    .split(/[\s_-]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const pseudonymAge = holder.pseudonymStableSince
    ? Math.floor(
        (Date.now() - new Date(holder.pseudonymStableSince).getTime()) /
          (1000 * 60 * 60 * 24 * 30)
      )
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Home
        </Button>
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <Avatar className="w-16 h-16">
          <AvatarFallback className="bg-primary/10 dark:bg-primary/20 text-primary text-lg font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">@{holder.pseudonym}</h1>
          </div>
          {holder.displayName && (
            <p className="text-muted-foreground">{holder.displayName}</p>
          )}
          {holder.bio && <p className="text-sm text-muted-foreground mt-0.5">{holder.bio}</p>}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Stable since{" "}
              {new Date(holder.pseudonymStableSince).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}{" "}
              ({pseudonymAge} months)
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {activeCount} active credential{activeCount !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{holder.did}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">Public Credentials</h2>

      {credentials.length > 0 ? (
        <div className="space-y-4">
          {credentials.map(({ credential, issuer }) => (
            <CredentialCard key={credential.id} credential={credential} issuer={issuer} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No public credentials</p>
            <p className="text-sm text-muted-foreground mt-1">
              This holder has not made any credentials publicly visible.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
