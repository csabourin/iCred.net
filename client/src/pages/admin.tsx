import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Building2,
  AlertTriangle,
  ScrollText,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Award,
} from "lucide-react";

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-8">Loading...</div>;
  if (!user || user.role !== "admin") {
    navigate("/auth");
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-2" /> Stats
          </TabsTrigger>
          <TabsTrigger value="issuers">
            <Building2 className="h-4 w-4 mr-2" /> Issuers
          </TabsTrigger>
          <TabsTrigger value="disputes">
            <AlertTriangle className="h-4 w-4 mr-2" /> Disputes
          </TabsTrigger>
          <TabsTrigger value="audit">
            <ScrollText className="h-4 w-4 mr-2" /> Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-6">
          <StatsPanel />
        </TabsContent>
        <TabsContent value="issuers" className="mt-6">
          <IssuersPanel />
        </TabsContent>
        <TabsContent value="disputes" className="mt-6">
          <DisputesPanel />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <AuditLogPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatsPanel() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    apiFetch("/api/admin/stats")
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return <div className="text-muted-foreground">Loading stats...</div>;

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users },
    { label: "Total Issuers", value: stats.totalIssuers, icon: Building2 },
    { label: "Total Credentials", value: stats.totalCredentials, icon: Award },
    { label: "Total Disputes", value: stats.totalDisputes, icon: AlertTriangle },
    { label: "Pending Issuers", value: stats.pendingIssuers, icon: Clock },
    { label: "Open Disputes", value: stats.openDisputes, icon: AlertTriangle },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <c.icon className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function IssuersPanel() {
  const [issuers, setIssuers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIssuers = () => {
    apiFetch("/api/admin/issuers")
      .then((data) => setIssuers(data.issuers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchIssuers(); }, []);

  const handleVerify = async (id: string, status: string, notes?: string) => {
    try {
      await apiFetch(`/api/admin/issuers/${id}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ status, notes }),
      });
      fetchIssuers();
    } catch {
      // handle error
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading issuers...</div>;

  return (
    <div className="space-y-3">
      {issuers.map((issuer) => (
        <Card key={issuer.id}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{issuer.name}</span>
                  <Badge
                    variant={
                      issuer.verificationStatus === "verified"
                        ? "default"
                        : issuer.verificationStatus === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {issuer.verificationStatus}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{issuer.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  DID: {issuer.did} | Category: {issuer.category}
                </p>
              </div>
              {issuer.verificationStatus === "pending" && (
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => handleVerify(issuer.id, "verified")}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleVerify(issuer.id, "rejected", "Does not meet requirements")}
                  >
                    <XCircle className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              )}
              {issuer.verificationStatus === "verified" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerify(issuer.id, "suspended", "Suspended by admin")}
                >
                  Suspend
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DisputesPanel() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDisputes = () => {
    apiFetch("/api/admin/disputes")
      .then((data) => setDisputes(data.disputes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDisputes(); }, []);

  const handleResolve = async (id: string, status: string, notes: string) => {
    try {
      await apiFetch(`/api/admin/disputes/${id}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ status, notes }),
      });
      fetchDisputes();
    } catch {
      // handle error
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading disputes...</div>;

  if (disputes.length === 0) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">No disputes.</CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      {disputes.map((d) => (
        <Card key={d.id}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={d.status === "open" ? "destructive" : "secondary"}>
                    {d.status}
                  </Badge>
                  <Badge variant="outline">{d.category}</Badge>
                </div>
                <p className="text-sm">{d.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Credential: {d.credentialId} | Reported: {new Date(d.createdAt).toLocaleDateString()}
                </p>
              </div>
              {d.status === "open" && (
                <div className="flex gap-2 ml-4">
                  <ResolveDisputeDialog
                    disputeId={d.id}
                    onResolve={handleResolve}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ResolveDisputeDialog({
  disputeId,
  onResolve,
}: {
  disputeId: string;
  onResolve: (id: string, status: string, notes: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Resolve</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Dispute</DialogTitle>
          <DialogDescription>Choose how to resolve this dispute.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Resolution notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => { onResolve(disputeId, "resolved_dismissed", notes); setOpen(false); }}
              variant="outline"
            >
              Dismiss
            </Button>
            <Button
              onClick={() => { onResolve(disputeId, "resolved_upheld", notes); setOpen(false); }}
            >
              Uphold
            </Button>
            <Button
              onClick={() => { onResolve(disputeId, "resolved_revoked", notes); setOpen(false); }}
              variant="destructive"
            >
              Revoke Credential
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AuditLogPanel() {
  const [log, setLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/admin/audit?limit=50")
      .then((data) => setLog(data.auditLog || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted-foreground">Loading audit log...</div>;

  if (log.length === 0) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">No audit entries yet.</CardContent></Card>;
  }

  return (
    <div className="space-y-2">
      {log.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="py-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{entry.actorType}</Badge>
              <span className="font-medium">{entry.action}</span>
              <span className="text-muted-foreground">on {entry.resourceType}</span>
              {entry.resourceId && (
                <span className="text-xs text-muted-foreground font-mono">{entry.resourceId.slice(0, 8)}...</span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
