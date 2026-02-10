import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssuranceBadge } from "@/components/assurance-badge";
import { CredentialStatus } from "@/components/credential-status";
import { ProofPathBadge } from "@/components/proof-path-badge";
import {
  Shield,
  ShieldCheck,
  Eye,
  Lock,
  ArrowRight,
  Users,
  Award,
  Search,
  Fingerprint,
  CheckCircle2,
  Globe,
} from "lucide-react";

function HeroSection() {
  return (
    <section className="relative overflow-visible pt-20 pb-24 md:pt-32 md:pb-36">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 text-center">
        <Badge
          variant="outline"
          className="mb-6 no-default-hover-elevate no-default-active-elevate gap-1.5 text-sm font-normal"
          data-testid="badge-beta"
        >
          <Shield className="w-3.5 h-3.5" />
          Verifiable Credibility Protocol
        </Badge>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
          Prove what you know.
          <br />
          <span className="text-primary">Reveal only what you choose.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          A privacy-first hub where anyone — even under a pseudonym — can present
          cryptographically verifiable proof of expertise with minimal disclosure.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/registry">
            <Button size="lg" data-testid="button-explore-registry">
              <Search className="w-4 h-4 mr-2" />
              Explore Registry
            </Button>
          </Link>
          <Link href="/verify">
            <Button size="lg" variant="outline" data-testid="button-verify-credential">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Verify a Credential
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      icon: Fingerprint,
      title: "Establish Identity",
      description:
        "Create a stable pseudonym. Prove you control it without revealing who you are. Your privacy is foundational.",
    },
    {
      icon: Award,
      title: "Collect Credentials",
      description:
        "Gather attestations, pass assessments, or document your methodology. Multiple proof paths, no gatekeeping.",
    },
    {
      icon: Eye,
      title: "Share Selectively",
      description:
        "Choose what to reveal. Each claim shows its assurance level, validity, and verification method — nothing more.",
    },
  ];

  return (
    <section className="py-20 bg-card dark:bg-card">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">How it works</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Three steps from anonymous to credible — without ever compromising your privacy.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <Card key={i} className="hover-elevate">
              <CardContent className="pt-6">
                <div className="w-10 h-10 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function AssuranceLevelsSection() {
  const levels = [
    { level: 0, desc: "No control — standard format, sources required" },
    { level: 1, desc: "Proof of account control (anti-impersonation)" },
    { level: 2, desc: "Documents / artifacts reviewed" },
    { level: 3, desc: "Signed by a registered issuer" },
    { level: 4, desc: "Assessment passed with score & expiry" },
    { level: 5, desc: "Attribute proven without civil identity" },
  ];

  return (
    <section className="py-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Assurance Levels</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Not "credible or not" — each claim shows exactly what is proven, how, and by whom.
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-3">
          {levels.map(({ level, desc }) => (
            <div
              key={level}
              className="flex items-center gap-4 p-3 rounded-md hover-elevate"
              data-testid={`assurance-row-${level}`}
            >
              <AssuranceBadge level={level} size="lg" />
              <span className="text-sm text-muted-foreground flex-1">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProofPathsSection() {
  const paths = [
    {
      key: "institutional",
      icon: Globe,
      title: "Institutional",
      desc: "Diplomas, certifications, professional orders",
    },
    {
      key: "community",
      icon: Users,
      title: "Community",
      desc: "Peer groups, elders, collectives, associations",
    },
    {
      key: "portfolio",
      icon: Award,
      title: "Portfolio",
      desc: "Artifacts, references, documented work",
    },
    {
      key: "assessment",
      icon: CheckCircle2,
      title: "Assessment",
      desc: "Exams, challenges, practical demonstrations",
    },
    {
      key: "methodology",
      icon: Lock,
      title: "Methodology",
      desc: "Systematic sourcing, corrections, rigor",
    },
  ];

  return (
    <section className="py-20 bg-card dark:bg-card">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Multiple Proof Paths</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Inclusive by design. Different proofs, for different contexts — no implicit hierarchy.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paths.map(({ key, icon: Icon, title, desc }) => (
            <Card key={key} className="hover-elevate">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function VerifyPreviewSection() {
  return (
    <section className="py-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Verify in 10 Seconds</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Every verification page answers: Who, What, How much is proven, When, By whom, and Status.
          </p>
        </div>

        <Card className="max-w-xl mx-auto">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">@web_auditor</p>
                  <p className="text-xs text-muted-foreground">Stable for 18 months</p>
                </div>
              </div>
              <AssuranceBadge level={1} />
            </div>

            <div className="border-t pt-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Domain</p>
              <p className="text-sm font-medium">Web Accessibility — WCAG 2.1 Audits</p>
            </div>

            <div className="border-t pt-3 space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Claims</p>

              <div className="flex items-start justify-between flex-wrap gap-2 p-2 rounded-md bg-card dark:bg-background/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">Passed "Audit Checklist" assessment (80%)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Expires 2027-02-10</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <AssuranceBadge level={4} size="sm" />
                  <CredentialStatus status="valid" />
                </div>
              </div>

              <div className="flex items-start justify-between flex-wrap gap-2 p-2 rounded-md bg-card dark:bg-background/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">Attested member of Community Y</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <AssuranceBadge level={3} size="sm" />
                  <CredentialStatus status="valid" />
                </div>
              </div>

              <div className="flex items-start justify-between flex-wrap gap-2 p-2 rounded-md bg-card dark:bg-background/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">Method: Citations + public errata</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Reviewed 2026-01-15</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <AssuranceBadge level={2} size="sm" />
                  <CredentialStatus status="valid" />
                </div>
              </div>
            </div>

            <div className="border-t pt-3 flex items-center gap-2 flex-wrap">
              <ProofPathBadge path="assessment" />
              <ProofPathBadge path="community" />
              <ProofPathBadge path="methodology" />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="py-20 bg-card dark:bg-card">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-3">Ready to explore?</h2>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          Browse verified issuers, check existing credentials, or learn more about how assurance levels work.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/registry">
            <Button size="lg" data-testid="button-cta-registry">
              Browse Issuers
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div>
      <HeroSection />
      <HowItWorksSection />
      <AssuranceLevelsSection />
      <ProofPathsSection />
      <VerifyPreviewSection />
      <CtaSection />
    </div>
  );
}
