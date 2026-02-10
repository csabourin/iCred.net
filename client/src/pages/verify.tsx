import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Fingerprint,
  Calendar,
  Building2,
  ArrowLeft,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { ASSURANCE_LEVELS, CREDENTIAL_FAMILIES } from "@shared/schema";
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
          Enter a credential ID to verify its authenticity, cryptographic signature, and status.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Credential ID (UUID)"
            className="pl-10"
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value)}
          />
        </div>
        <Link href={credentialId ? `/verify/${credentialId}` : "#"}>
          <Button disabled={!credentialId.trim()}>Verify</Button>
        </Link>
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        Credentials are verified cryptographically using EdDSA signatures and did:web resolution.
      </p>
    </div>
  );
}

interface VerifyResult {
  valid: boolean;
  credential: {
    id: string;
    holder: {
      pseudonym: string;
      pseudonymStableSince: string;
      pseudonymAge: string;
      did: string;
    } | null;
    domain: string;
    scope: string;
    family: string;
    assuranceLevel: string;
    claims: Record<string, any>;
    issuer: {
      name: string;
      slug: string;
      did: string;
      verificationStatus: string;
    } | null;
    issuedAt: string;
    expiresAt: string | null;
    status: string;
    verifyUrl: string;
  };
  verification: {
    signatureValid: boolean;
    issuerDid: string;
    revoked: boolean;
    expired: boolean;
    checkedAt: string;
  };
}

function VerifyDetail({ id }: { id: string }) {
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery<VerifyResult>({
    queryKey: ["/api/v1/verify", id],
    queryFn: () => fetch(`/api/v1/verify/${id}`).then((r) => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
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
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Credential Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The credential ID "{id}" does not exist or has been removed.
        </p>
        <Link href="/verify">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Try Another
          </Button>
        </Link>
      </div>
    );
  }

  const { valid, credential, verification } = data;
  const level = ASSURANCE_LEVELS[credential.assuranceLevel as keyof typeof ASSURANCE_LEVELS];
  const familyInfo = CREDENTIAL_FAMILIES[credential.family as keyof typeof CREDENTIAL_FAMILIES];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <Link href="/verify">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={copyLink}>
          <Copy className="w-4 h-4 mr-1" /> Copy Link
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Verification Status Banner */}
          <div
            className={`p-4 rounded-lg flex items-center gap-3 ${
              valid
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"
            }`}
          >
            {valid ? (
              <CheckCircle2 className="w-6 h-6 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 shrink-0" />
            )}
            <div>
              <p className="font-bold text-lg">
                {valid ? "CREDENTIAL VALID" : "CREDENTIAL INVALID"}
              </p>
              <p className="text-sm opacity-80">
                Verified on {new Date(verification.checkedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Signature verification details */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant={verification.signatureValid ? "default" : "destructive"}>
              {verification.signatureValid ? "Signature Valid" : "Signature Invalid"}
            </Badge>
            {verification.revoked && <Badge variant="destructive">Revoked</Badge>}
            {verification.expired && <Badge variant="destructive">Expired</Badge>}
            {credential.status === "active" && !verification.revoked && !verification.expired && (
              <Badge variant="default">Active</Badge>
            )}
          </div>

          {/* WHO */}
          {credential.holder && (
            <div className="border-t pt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Who</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <Link href={`/holder/${credential.holder.pseudonym}`}>
                    <span className="font-semibold hover:underline cursor-pointer">
                      @{credential.holder.pseudonym}
                    </span>
                  </Link>
                  {credential.holder.pseudonymAge && (
                    <p className="text-xs text-muted-foreground">
                      Pseudonym stable since {credential.holder.pseudonymAge}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* WHAT */}
          <div className="border-t pt-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">What</p>
            <p className="font-medium">{credential.domain}</p>
            <p className="text-sm text-muted-foreground">{credential.scope}</p>
          </div>

          {/* CLAIMS */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Claims</p>
              <div className="flex items-center gap-2 flex-wrap">
                {level && (
                  <Badge variant="secondary">
                    {level.code} — {level.label}
                  </Badge>
                )}
                {familyInfo && (
                  <Badge variant="outline">{familyInfo.label}</Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {Object.entries(credential.claims).map(([key, value]) => (
                <div
                  key={key}
                  className="p-3 rounded-md bg-card dark:bg-background/50 border border-border/50"
                >
                  <p className="text-sm font-medium flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>
                      <span className="text-muted-foreground">{key}:</span> {String(value)}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* DATES */}
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

          {/* ISSUER */}
          {credential.issuer && (
            <div className="border-t pt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Issued By</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {credential.issuer.name}
                    {credential.issuer.verificationStatus === "verified" && (
                      <span className="text-green-600 ml-1">(verified issuer)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">{credential.issuer.did}</p>
                </div>
              </div>
            </div>
          )}

          {/* CRYPTO FOOTER */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground text-center">
              Verified cryptographically by icred.net<br />
              Signature: EdDSA (Ed25519) | DID: {verification.issuerDid}
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1 font-mono">
              ID: {credential.id}
            </p>
          </div>

          {/* Dispute link */}
          <div className="border-t pt-3 text-center">
            <p className="text-xs text-muted-foreground">
              <AlertTriangle className="inline w-3 h-3 mr-1" />
              Something wrong? You can file a dispute for this credential.
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
