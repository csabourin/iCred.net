import { storage } from "./storage";
import { db } from "./db";
import { issuers } from "@shared/schema";
import { log } from "./index";

export async function seedDatabase() {
  const existingIssuers = await db.select().from(issuers).limit(1);
  if (existingIssuers.length > 0) {
    log("Database already seeded, skipping.", "seed");
    return;
  }

  log("Seeding database with demo data...", "seed");

  const issuer1 = await storage.createIssuer({
    name: "Web Standards Guild",
    slug: "web-standards-guild",
    description: "An open community of web professionals dedicated to maintaining high standards in accessibility, performance, and security across the web.",
    category: "Web Development",
    website: "https://example.com/wsg",
    logoUrl: null,
    status: "active",
  });

  const issuer2 = await storage.createIssuer({
    name: "CyberSec Alliance",
    slug: "cybersec-alliance",
    description: "International collective of security researchers and practitioners promoting responsible disclosure and defensive security education.",
    category: "Cybersecurity",
    website: "https://example.com/csa",
    logoUrl: null,
    status: "active",
  });

  const issuer3 = await storage.createIssuer({
    name: "Open Education Network",
    slug: "open-education-network",
    description: "A decentralized network of educators and institutions working to make quality education verifiable and accessible worldwide.",
    category: "Education",
    website: "https://example.com/oen",
    logoUrl: null,
    status: "active",
  });

  const issuer4 = await storage.createIssuer({
    name: "Craft CMS Community",
    slug: "craft-cms-community",
    description: "Official community-driven certification body for Craft CMS developers and plugin authors.",
    category: "CMS Development",
    website: "https://example.com/craftcms",
    logoUrl: null,
    status: "active",
  });

  const holder1 = await storage.createHolder({
    pseudonym: "web_auditor",
    displayName: "Web Auditor",
    bio: "Accessibility specialist with focus on WCAG 2.1 compliance and inclusive design patterns.",
    avatarUrl: null,
  });

  const holder2 = await storage.createHolder({
    pseudonym: "sec_researcher",
    displayName: "Security Researcher",
    bio: "Application security professional focused on web vulnerability assessment and secure coding practices.",
    avatarUrl: null,
  });

  const holder3 = await storage.createHolder({
    pseudonym: "craft_dev",
    displayName: "Craft Developer",
    bio: "Full-stack developer specializing in Craft CMS, Twig templating, and headless architectures.",
    avatarUrl: null,
  });

  await storage.createCredential({
    holderId: holder1.id,
    issuerId: issuer1.id,
    type: "assessment",
    domain: "Web Accessibility",
    scope: "WCAG 2.1 Level AA Audit Methodology",
    claims: [
      { text: "Passed WCAG 2.1 audit checklist assessment (92%)", detail: "Covered all Level A and AA success criteria" },
      { text: "Demonstrated proficiency in automated + manual testing", detail: "Tools: axe-core, NVDA, VoiceOver" },
    ],
    assuranceLevel: 4,
    proofPath: "assessment",
    status: "valid",
    expiresAt: new Date("2027-06-15"),
    evidence: null,
    signature: null,
  });

  await storage.createCredential({
    holderId: holder1.id,
    issuerId: issuer1.id,
    type: "attestation",
    domain: "Web Accessibility",
    scope: "Community Membership",
    claims: [
      { text: "Active member of the Web Standards Guild" },
      { text: "Contributed to 3+ community audit reviews" },
    ],
    assuranceLevel: 3,
    proofPath: "community",
    status: "valid",
    expiresAt: null,
    evidence: null,
    signature: null,
  });

  await storage.createCredential({
    holderId: holder1.id,
    issuerId: null,
    type: "process",
    domain: "Content Rigor",
    scope: "Methodology documentation",
    claims: [
      { text: "Systematically cites sources in all published work" },
      { text: "Maintains a public errata/corrections log" },
      { text: "Separates factual reporting from opinion in content" },
    ],
    assuranceLevel: 2,
    proofPath: "methodology",
    status: "valid",
    expiresAt: null,
    evidence: null,
    signature: null,
  });

  await storage.createCredential({
    holderId: holder2.id,
    issuerId: issuer2.id,
    type: "assessment",
    domain: "Application Security",
    scope: "OWASP Top 10 Web Vulnerability Assessment",
    claims: [
      { text: "Completed OWASP Top 10 practical assessment (87%)", detail: "Hands-on exploitation and remediation lab" },
      { text: "Demonstrated secure code review methodology" },
    ],
    assuranceLevel: 4,
    proofPath: "assessment",
    status: "valid",
    expiresAt: new Date("2027-03-01"),
    evidence: null,
    signature: null,
  });

  await storage.createCredential({
    holderId: holder2.id,
    issuerId: issuer2.id,
    type: "attestation",
    domain: "Responsible Disclosure",
    scope: "Verified disclosure track record",
    claims: [
      { text: "3+ coordinated vulnerability disclosures completed" },
      { text: "Follows CyberSec Alliance disclosure guidelines" },
    ],
    assuranceLevel: 3,
    proofPath: "institutional",
    status: "valid",
    expiresAt: null,
    evidence: null,
    signature: null,
  });

  await storage.createCredential({
    holderId: holder3.id,
    issuerId: issuer4.id,
    type: "attestation",
    domain: "Craft CMS Development",
    scope: "Plugin Development & Twig Templating",
    claims: [
      { text: "Certified Craft CMS plugin developer" },
      { text: "Published 2+ plugins on the Craft Plugin Store" },
      { text: "Demonstrated advanced Twig templating proficiency" },
    ],
    assuranceLevel: 3,
    proofPath: "portfolio",
    status: "valid",
    expiresAt: new Date("2027-12-31"),
    evidence: null,
    signature: null,
  });

  await storage.createCredential({
    holderId: holder3.id,
    issuerId: issuer3.id,
    type: "assessment",
    domain: "Frontend Development",
    scope: "Modern CSS & JavaScript Fundamentals",
    claims: [
      { text: "Passed frontend fundamentals assessment (88%)", detail: "CSS Grid, Flexbox, ES2024, Web APIs" },
    ],
    assuranceLevel: 4,
    proofPath: "assessment",
    status: "valid",
    expiresAt: new Date("2027-09-01"),
    evidence: null,
    signature: null,
  });

  log("Database seeded successfully.", "seed");
}
