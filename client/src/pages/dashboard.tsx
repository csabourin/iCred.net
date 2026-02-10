import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ASSURANCE_LEVELS } from "@shared/schema";
import {
  Shield,
  Eye,
  EyeOff,
  ExternalLink,
  User,
  Award,
  Settings,
} from "lucide-react";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) return <DashboardSkeleton />;
  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, <span className="font-mono">@{user.pseudonym}</span>
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {user.role}
        </Badge>
      </div>

      <Tabs defaultValue="credentials">
        <TabsList>
          <TabsTrigger value="credentials">
            <Award className="h-4 w-4 mr-2" /> My Credentials
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" /> Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="mt-6">
          <CredentialsList userId={user.id} />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <ProfileEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CredentialsList({ userId }: { userId: string }) {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCredentials = async () => {
    try {
      const data = await apiFetch("/api/dashboard/credentials");
      setCredentials(data.credentials || []);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const toggleVisibility = async (credId: string, isPublic: boolean) => {
    try {
      await apiFetch(`/api/dashboard/credentials/${credId}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublic }),
      });
      setCredentials((prev) =>
        prev.map((c) => (c.id === credId ? { ...c, isPublic } : c))
      );
    } catch {
      // handle error
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading credentials...</div>;

  if (credentials.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No credentials yet</h3>
          <p className="text-muted-foreground mt-2">
            When an issuer issues you a credential, it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {credentials.map((cred) => {
        const level = ASSURANCE_LEVELS[cred.assuranceLevel as keyof typeof ASSURANCE_LEVELS];
        return (
          <Card key={cred.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{cred.domain}</h3>
                    {level && (
                      <Badge variant="secondary" className="text-xs">
                        {level.code} — {level.label}
                      </Badge>
                    )}
                    <Badge
                      variant={cred.status === "active" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {cred.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{cred.scope}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Issued by {cred.issuerName || "Unknown"}{" "}
                    {cred.issuerVerificationStatus === "verified" && (
                      <span className="text-green-600">(verified)</span>
                    )}
                  </p>
                  {cred.claims && (
                    <div className="mt-2 text-sm">
                      {Object.entries(cred.claims).map(([key, value]) => (
                        <span key={key} className="inline-block mr-3 text-muted-foreground">
                          <span className="font-medium">{key}:</span> {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="flex items-center gap-2">
                    {cred.isPublic ? (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Switch
                      checked={cred.isPublic}
                      onCheckedChange={(checked) => toggleVisibility(cred.id, checked)}
                    />
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/verify/${cred.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ProfileEditor() {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ displayName, bio }),
      });
      await refreshUser();
      setMessage("Profile updated successfully");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>Update your public profile information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {message && (
            <div className="text-sm p-3 rounded-md bg-muted">{message}</div>
          )}
          <div className="space-y-2">
            <Label>Pseudonym</Label>
            <Input value={`@${user?.pseudonym}`} disabled />
            <p className="text-xs text-muted-foreground">
              DID: {user?.did}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short description of yourself"
              rows={3}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
