import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AssuranceBadge } from "@/components/assurance-badge";
import { CredentialStatus } from "@/components/credential-status";
import { ProofPathBadge } from "@/components/proof-path-badge";
import {
  ShieldCheck,
  Search,
  Fingerprint,
  Calendar,
  Building2,
  ArrowLeft,
  Copy,
  CheckCircle2,
} from "lucide-react";
import type { Credential, Holder, Issuer } from "@shared/schema";
import { CREDENTIAL_TYPES } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

function VerifyLookup() {
  const [credentialId, setCredentialId] = useState("");

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Verify a Credential</h1>
        <p className="text-muted-foreground">
          Enter a credential ID to verify its authenticity, status, and assurance level.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Credential ID (e.g. abc-123-def)"
            className="pl-10"
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value)}
            data-testid="input-credential-id"
          />
        </div>
        <Link href={credentialId ? `/verify/${credentialId}` : "#"}>
          <Button disabled={!credentialId.trim()} data-testid="button-verify-lookup">
            Verify
          </Button>
        </Link>
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        You can also visit a holder's profile to see all their credentials at once.
      </p>
    </div>
  );
}

interface VerifyResult {
  credential: Credential;
  holder: Holder;
  issuer: Issuer | null;
}

function VerifyDetail({ id }: { id: string }) {
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery<VerifyResult>({
    queryKey: ["/api/verify", id],
  });

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied", description: "Verification link copied to clipboard." });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-8 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Credential Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The credential ID "{id}" does not exist or has been removed.
        </p>
        <Link href="/verify">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Try Another
          </Button>
        </Link>
      </div>
    );
  }

  const { credential, holder, issuer } = data;
  const claims = credential.claims as Array<{ text: string; detail?: string }>;
  const typeInfo = CREDENTIAL_TYPES[credential.type as keyof typeof CREDENTIAL_TYPES];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <Link href="/verify">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={copyLink} data-testid="button-copy-link">
          <Copy className="w-4 h-4 mr-1" />
          Copy Link
        </Button>
      </div>

      <Card data-testid="card-verify-result">
        <CardContent className="pt-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Link href={`/holder/${holder.pseudonym}`}>
                  <span className="font-semibold hover:underline cursor-pointer" data-testid="text-holder-pseudonym">
                    @{holder.pseudonym}
                  </span>
                </Link>
                {holder.stableSince && (
                  <p className="text-xs text-muted-foreground">
                    Stable since {new Date(holder.stableSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
            <AssuranceBadge level={1} />
          </div>

          <div className="border-t pt-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Domain & Scope</p>
            <p className="font-medium">{credential.domain}</p>
            <p className="text-sm text-muted-foreground">{credential.scope}</p>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Credential</p>
              <div className="flex items-center gap-2 flex-wrap">
                <AssuranceBadge level={credential.assuranceLevel} size="lg" />
                <CredentialStatus status={credential.status} />
              </div>
            </div>

            {typeInfo && (
              <Badge variant="outline" className="mb-3 no-default-hover-elevate no-default-active-elevate text-xs font-normal">
                {typeInfo.label}
              </Badge>
            )}

            <div className="space-y-2">
              {claims.map((claim, i) => (
                <div
                  key={i}
                  className="p-3 rounded-md bg-card dark:bg-background/50 border border-border/50"
                  data-testid={`text-claim-${i}`}
                >
                  <p className="text-sm font-medium flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    {claim.text}
                  </p>
                  {claim.detail && (
                    <p className="text-xs text-muted-foreground ml-6 mt-0.5">{claim.detail}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Issued</p>
              <p className="text-sm flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {new Date(credential.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Expires</p>
              <p className="text-sm flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {credential.expiresAt
                  ? new Date(credential.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                  : "No expiration"}
              </p>
            </div>
          </div>

          {issuer && (
            <div className="border-t pt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Issued By</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{issuer.name}</p>
                  <p className="text-xs text-muted-foreground">{issuer.category}</p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-4 flex items-center gap-2 flex-wrap">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Proof Path</p>
            <ProofPathBadge path={credential.proofPath} />
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground text-center">
              Credential ID: <span className="font-mono">{credential.id}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Verify() {
  const [match, params] = useRoute("/verify/:id");

  if (match && params?.id) {
    return <VerifyDetail id={params.id} />;
  }

  return <VerifyLookup />;
}
