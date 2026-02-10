import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ExternalLink, Search, ShieldCheck, Clock } from "lucide-react";
import { useState } from "react";

interface PublicIssuer {
  id: string;
  name: string;
  nameFr: string | null;
  slug: string;
  description: string | null;
  descriptionFr: string | null;
  website: string | null;
  logoUrl: string | null;
  category: string | null;
  domains: string[] | null;
  verificationStatus: string;
  verifiedAt: string | null;
  createdAt: string;
}

function IssuerCard({ issuer }: { issuer: PublicIssuer }) {
  const isVerified = issuer.verificationStatus === "verified";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
            {issuer.logoUrl ? (
              <img
                src={issuer.logoUrl}
                alt={issuer.name}
                className="w-8 h-8 rounded-sm object-contain"
              />
            ) : (
              <Building2 className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{issuer.name}</h3>
              {isVerified ? (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 gap-0.5 text-xs">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-0.5 text-xs">
                  <Clock className="w-3 h-3" />
                  {issuer.verificationStatus}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {issuer.description}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {issuer.category && (
                <Badge variant="outline" className="text-xs font-normal">
                  {issuer.category}
                </Badge>
              )}
              {issuer.domains?.map((d) => (
                <Badge key={d} variant="outline" className="text-xs font-normal">
                  {d}
                </Badge>
              ))}
              {issuer.website && (
                <a
                  href={issuer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Website
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IssuerSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-24 mt-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Registry() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: issuers, isLoading } = useQuery<PublicIssuer[]>({
    queryKey: ["/api/issuers"],
  });

  const filtered = issuers?.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Issuer Registry</h1>
        <p className="text-muted-foreground">
          Browse registered organizations that can issue verifiable credentials on icred.net.
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search issuers by name, category..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <>
            <IssuerSkeleton />
            <IssuerSkeleton />
            <IssuerSkeleton />
          </>
        ) : filtered && filtered.length > 0 ? (
          filtered.map((issuer) => <IssuerCard key={issuer.id} issuer={issuer} />)
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No issuers found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm ? "Try a different search term." : "No issuers have been registered yet."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
