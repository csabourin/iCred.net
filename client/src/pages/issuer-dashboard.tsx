import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, useParams } from "wouter";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  Send,
  Ban,
  FileText,
  Award,
  Clock,
} from "lucide-react";

export default function IssuerDashboard() {
  const { user, ownedIssuers, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-8">Loading...</div>;
  if (!user) {
    navigate("/auth");
    return null;
  }

  if (ownedIssuers.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Issuer Dashboard</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No issuers yet</h3>
            <p className="text-muted-foreground mt-2 mb-4">
              Register an issuer organization to start issuing verifiable credentials.
            </p>
            <CreateIssuerButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Issuer Dashboard</h1>
        <CreateIssuerButton />
      </div>

      {ownedIssuers.length === 1 ? (
        <IssuerPanel issuerId={ownedIssuers[0].id} issuerName={ownedIssuers[0].name} status={ownedIssuers[0].verificationStatus} />
      ) : (
        <Tabs defaultValue={ownedIssuers[0].id}>
          <TabsList>
            {ownedIssuers.map((i) => (
              <TabsTrigger key={i.id} value={i.id}>
                {i.name}
                {i.verificationStatus === "pending" && (
                  <Clock className="h-3 w-3 ml-1 text-yellow-500" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {ownedIssuers.map((i) => (
            <TabsContent key={i.id} value={i.id} className="mt-6">
              <IssuerPanel issuerId={i.id} issuerName={i.name} status={i.verificationStatus} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function IssuerPanel({ issuerId, issuerName, status }: { issuerId: string; issuerName: string; status: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge
          variant={status === "verified" ? "default" : status === "pending" ? "secondary" : "destructive"}
        >
          {status}
        </Badge>
        {status === "pending" && (
          <span className="text-sm text-muted-foreground">
            Awaiting admin verification before you can issue credentials.
          </span>
        )}
      </div>

      <Tabs defaultValue="credentials">
        <TabsList>
          <TabsTrigger value="credentials">
            <Award className="h-4 w-4 mr-2" /> Issued Credentials
          </TabsTrigger>
          <TabsTrigger value="types">
            <FileText className="h-4 w-4 mr-2" /> Credential Types
          </TabsTrigger>
          <TabsTrigger value="issue">
            <Send className="h-4 w-4 mr-2" /> Issue New
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="mt-4">
          <IssuedCredentialsList issuerId={issuerId} />
        </TabsContent>

        <TabsContent value="types" className="mt-4">
          <CredentialTypesList issuerId={issuerId} />
        </TabsContent>

        <TabsContent value="issue" className="mt-4">
          {status === "verified" ? (
            <IssueCredentialForm issuerId={issuerId} issuerName={issuerName} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Your issuer must be verified by an admin before you can issue credentials.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IssuedCredentialsList({ issuerId }: { issuerId: string }) {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/issuer/${issuerId}/credentials`)
      .then((data) => setCredentials(data.credentials || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [issuerId]);

  const handleRevoke = async (credId: string) => {
    if (!confirm("Are you sure you want to revoke this credential?")) return;
    try {
      await apiFetch(`/api/issuer/${issuerId}/credentials/${credId}/revoke`, {
        method: "POST",
        body: JSON.stringify({ reason: "Revoked by issuer" }),
      });
      setCredentials((prev) =>
        prev.map((c) => (c.id === credId ? { ...c, status: "revoked" } : c))
      );
    } catch {
      // handle error
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  if (credentials.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No credentials issued yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {credentials.map((cred) => (
        <Card key={cred.id}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">@{cred.holderPseudonym}</span>
                  <Badge variant="secondary" className="text-xs">{cred.assuranceLevel}</Badge>
                  <Badge variant={cred.status === "active" ? "default" : "destructive"} className="text-xs">
                    {cred.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{cred.domain} — {cred.scope}</p>
              </div>
              <div className="flex gap-2">
                {cred.status === "active" && (
                  <Button variant="destructive" size="sm" onClick={() => handleRevoke(cred.id)}>
                    <Ban className="h-3 w-3 mr-1" /> Revoke
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CredentialTypesList({ issuerId }: { issuerId: string }) {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/issuer/${issuerId}/credential-types`)
      .then((data) => setTypes(data.credentialTypes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [issuerId]);

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-3">
      <CreateCredentialTypeButton issuerId={issuerId} onCreated={() => {
        apiFetch(`/api/issuer/${issuerId}/credential-types`)
          .then((data) => setTypes(data.credentialTypes || []))
          .catch(() => {});
      }} />
      {types.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No credential types defined yet.
          </CardContent>
        </Card>
      ) : (
        types.map((ct) => (
          <Card key={ct.id}>
            <CardContent className="py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{ct.name}</span>
                <Badge variant="outline" className="text-xs">{ct.family}</Badge>
                <Badge variant="secondary" className="text-xs">{ct.defaultAssuranceLevel}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{ct.domain} — {ct.scope}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function IssueCredentialForm({ issuerId, issuerName }: { issuerId: string; issuerName: string }) {
  const [holderPseudonym, setHolderPseudonym] = useState("");
  const [domain, setDomain] = useState("");
  const [scope, setScope] = useState("");
  const [family, setFamily] = useState("attestation");
  const [assuranceLevel, setAssuranceLevel] = useState("A3");
  const [claimsText, setClaimsText] = useState('{\n  "role": "",\n  "details": ""\n}');
  const [expiresInDays, setExpiresInDays] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    let claims: any;
    try {
      claims = JSON.parse(claimsText);
    } catch {
      setError("Invalid JSON for claims");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiFetch(`/api/issuer/${issuerId}/credentials/issue`, {
        method: "POST",
        body: JSON.stringify({
          holderPseudonym,
          domain,
          scope,
          family,
          assuranceLevel,
          claims,
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
          isPublic,
        }),
      });
      setSuccess(`Credential issued! Verify URL: /verify/${data.credential.id}`);
      setHolderPseudonym("");
      setDomain("");
      setScope("");
      setClaimsText('{\n  "role": "",\n  "details": ""\n}');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue a Credential</CardTitle>
        <CardDescription>Issue a signed verifiable credential as {issuerName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
          {success && <div className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-sm p-3 rounded-md">{success}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Holder Pseudonym</Label>
              <Input value={holderPseudonym} onChange={(e) => setHolderPseudonym(e.target.value)} placeholder="username" required />
            </div>
            <div className="space-y-2">
              <Label>Family</Label>
              <Select value={family} onValueChange={setFamily}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="attestation">Attestation</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="process">Process</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="web-accessibility" required />
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="WCAG 2.1 AA audits" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assurance Level</Label>
              <Select value={assuranceLevel} onValueChange={setAssuranceLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A0">A0 — Self-declared</SelectItem>
                  <SelectItem value="A1">A1 — Stable pseudonym</SelectItem>
                  <SelectItem value="A2">A2 — Verified evidence</SelectItem>
                  <SelectItem value="A3">A3 — Issuer-attested</SelectItem>
                  <SelectItem value="A4">A4 — Demonstrated skill</SelectItem>
                  <SelectItem value="A5">A5 — Minimal disclosure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expires in (days, optional)</Label>
              <Input type="number" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} placeholder="1095" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Claims (JSON)</Label>
            <Textarea
              value={claimsText}
              onChange={(e) => setClaimsText(e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
          </div>

          <Button type="submit" disabled={submitting}>
            <Send className="h-4 w-4 mr-2" />
            {submitting ? "Issuing..." : "Issue Credential"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateIssuerButton() {
  const { refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiFetch("/api/issuers", {
        method: "POST",
        body: JSON.stringify({ name, description, website, category }),
      });
      await refreshUser();
      setOpen(false);
      setName("");
      setDescription("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Register Issuer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register an Issuer Organization</DialogTitle>
          <DialogDescription>
            Your issuer will need admin approval before you can issue credentials.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Web Development" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Registering..." : "Register Issuer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateCredentialTypeButton({ issuerId, onCreated }: { issuerId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [family, setFamily] = useState("attestation");
  const [domain, setDomain] = useState("");
  const [scope, setScope] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiFetch(`/api/issuer/${issuerId}/credential-types`, {
        method: "POST",
        body: JSON.stringify({
          name,
          family,
          domain,
          scope,
          claimSchema: { type: "object", properties: {} },
        }),
      });
      onCreated();
      setOpen(false);
      setName("");
      setDomain("");
      setScope("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" /> New Type</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Credential Type</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Family</Label>
            <Select value={family} onValueChange={setFamily}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="attestation">Attestation</SelectItem>
                <SelectItem value="assessment">Assessment</SelectItem>
                <SelectItem value="process">Process</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Domain</Label>
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Scope</Label>
            <Input value={scope} onChange={(e) => setScope(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
