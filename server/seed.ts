import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { log } from "./index";
import bcrypt from "bcrypt";
import {
  generateEd25519KeyPair,
  encryptPrivateKey,
  buildDidWeb,
  issueVerifiableCredential,
  decryptPrivateKey,
} from "./crypto";
import { createEmptyBitstring } from "./utils";

const DOMAIN = process.env.ICRED_DOMAIN || "icred.net";

export async function seedDatabase() {
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    log("Database already seeded, skipping.", "seed");
    return;
  }

  log("Seeding database with demo data...", "seed");

  // Create admin user
  const adminKeys = await generateEd25519KeyPair();
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await storage.createUser({
    pseudonym: "admin",
    email: "admin@icred.net",
    passwordHash: adminHash,
    did: buildDidWeb(DOMAIN, "users/admin"),
    publicKeyJwk: adminKeys.publicKeyJwk,
    privateKeyEnc: encryptPrivateKey(adminKeys.privateKey),
    role: "admin",
    displayName: "Platform Admin",
    bio: "iCred.net platform administrator",
    status: "active",
    pseudonymStableSince: new Date("2024-01-01"),
  });

  // Create holder users
  const holder1Keys = await generateEd25519KeyPair();
  const holderHash = await bcrypt.hash("holder123", 12);
  const holder1 = await storage.createUser({
    pseudonym: "a11y-christian",
    email: "christian@example.com",
    passwordHash: holderHash,
    did: buildDidWeb(DOMAIN, "users/a11y-christian"),
    publicKeyJwk: holder1Keys.publicKeyJwk,
    privateKeyEnc: encryptPrivateKey(holder1Keys.privateKey),
    role: "holder",
    displayName: "Christian A.",
    bio: "Accessibility specialist with focus on WCAG 2.1 compliance and inclusive design patterns.",
    status: "active",
    pseudonymStableSince: new Date("2024-09-01"),
  });

  const holder2Keys = await generateEd25519KeyPair();
  const holder2 = await storage.createUser({
    pseudonym: "sec-researcher",
    email: "sec@example.com",
    passwordHash: holderHash,
    did: buildDidWeb(DOMAIN, "users/sec-researcher"),
    publicKeyJwk: holder2Keys.publicKeyJwk,
    privateKeyEnc: encryptPrivateKey(holder2Keys.privateKey),
    role: "holder",
    displayName: "Security Researcher",
    bio: "Application security professional focused on web vulnerability assessment and secure coding practices.",
    status: "active",
    pseudonymStableSince: new Date("2024-06-15"),
  });

  const holder3Keys = await generateEd25519KeyPair();
  const holder3 = await storage.createUser({
    pseudonym: "craft-dev",
    email: "craft@example.com",
    passwordHash: holderHash,
    did: buildDidWeb(DOMAIN, "users/craft-dev"),
    publicKeyJwk: holder3Keys.publicKeyJwk,
    privateKeyEnc: encryptPrivateKey(holder3Keys.privateKey),
    role: "holder",
    displayName: "Craft Developer",
    bio: "Full-stack developer specializing in Craft CMS, Twig templating, and headless architectures.",
    status: "active",
    pseudonymStableSince: new Date("2025-01-10"),
  });

  // Create issuer owner user
  const issuerOwnerKeys = await generateEd25519KeyPair();
  const issuerOwner = await storage.createUser({
    pseudonym: "issuer-owner",
    passwordHash: holderHash,
    did: buildDidWeb(DOMAIN, "users/issuer-owner"),
    publicKeyJwk: issuerOwnerKeys.publicKeyJwk,
    privateKeyEnc: encryptPrivateKey(issuerOwnerKeys.privateKey),
    role: "issuer",
    displayName: "Issuer Manager",
    bio: "Manages multiple issuer organizations on iCred.net",
    status: "active",
    pseudonymStableSince: new Date("2024-03-01"),
  });

  // Create issuers
  const issuer1Keys = await generateEd25519KeyPair();
  const issuer1 = await storage.createIssuer({
    ownerId: issuerOwner.id,
    name: "Accessibility Guild",
    nameFr: "Guilde d'accessibilité",
    slug: "a11y-guild",
    description: "An open community of web professionals dedicated to maintaining high standards in accessibility.",
    descriptionFr: "Une communauté ouverte de professionnels du web dédiée au maintien de hauts standards en accessibilité.",
    website: "https://example.com/a11y-guild",
    did: buildDidWeb(DOMAIN, "issuers/a11y-guild"),
    publicKeyJwk: issuer1Keys.publicKeyJwk,
    privateKeyEnc: encryptPrivateKey(issuer1Keys.privateKey),
    verificationStatus: "verified",
    verifiedAt: new Date("2025-01-15"),
    category: "Web Development",
    domains: ["web-accessibility", "inclusive-design"],
    status: "active",
  });

  const issuer2Keys = await generateEd25519KeyPair();
  const issuer2 = await storage.createIssuer({
    ownerId: issuerOwner.id,
    name: "CyberSec Alliance",
    nameFr: "Alliance CyberSec",
    slug: "cybersec-alliance",
    description: "International collective of security researchers and practitioners promoting responsible disclosure.",
    descriptionFr: "Collectif international de chercheurs en sécurité promouvant la divulgation responsable.",
    website: "https://example.com/csa",
    did: buildDidWeb(DOMAIN, "issuers/cybersec-alliance"),
    publicKeyJwk: issuer2Keys.publicKeyJwk,
    privateKeyEnc: encryptPrivateKey(issuer2Keys.privateKey),
    verificationStatus: "verified",
    verifiedAt: new Date("2025-02-01"),
    category: "Cybersecurity",
    domains: ["application-security", "responsible-disclosure"],
    status: "active",
  });

  const issuer3Keys = await generateEd25519KeyPair();
  const issuer3 = await storage.createIssuer({
    ownerId: issuerOwner.id,
    name: "Open Education Network",
    nameFr: "Réseau d'éducation ouverte",
    slug: "open-education-network",
    description: "A decentralized network of educators and institutions working to make quality education verifiable.",
    descriptionFr: "Un réseau décentralisé d'éducateurs et d'institutions travaillant à rendre l'éducation de qualité vérifiable.",
    website: "https://example.com/oen",
    did: buildDidWeb(DOMAIN, "issuers/open-education-network"),
    publicKeyJwk: issuer3Keys.publicKeyJwk,
    privateKeyEnc: encryptPrivateKey(issuer3Keys.privateKey),
    verificationStatus: "verified",
    verifiedAt: new Date("2025-03-01"),
    category: "Education",
    domains: ["frontend-development", "education"],
    status: "active",
  });

  const issuer4Keys = await generateEd25519KeyPair();
  const issuer4 = await storage.createIssuer({
    ownerId: issuerOwner.id,
    name: "Craft CMS Community",
    nameFr: "Communauté Craft CMS",
    slug: "craft-cms-community",
    description: "Official community-driven certification body for Craft CMS developers and plugin authors.",
    descriptionFr: "Organisme de certification communautaire officiel pour les développeurs Craft CMS.",
    website: "https://example.com/craftcms",
    did: buildDidWeb(DOMAIN, "issuers/craft-cms-community"),
    publicKeyJwk: issuer4Keys.publicKeyJwk,
    privateKeyEnc: encryptPrivateKey(issuer4Keys.privateKey),
    verificationStatus: "pending",
    category: "CMS Development",
    domains: ["craft-cms", "plugin-development"],
    status: "active",
  });

  // Create status lists for issuers
  for (const issuer of [issuer1, issuer2, issuer3, issuer4]) {
    await storage.createStatusList({
      issuerId: issuer.id,
      encodedList: createEmptyBitstring(),
      purpose: "revocation",
    });
  }

  // Issue credentials (real JWT-signed VCs)
  const issueVC = async (
    issuer: any,
    issuerKeys: any,
    holder: any,
    params: {
      domain: string;
      scope: string;
      family: string;
      assuranceLevel: string;
      claims: Record<string, any>;
      expiresAt?: Date;
      isPublic?: boolean;
    }
  ) => {
    const privateKey = decryptPrivateKey(issuerKeys.privateKeyEnc);
    const credRecord = await storage.createCredential({
      issuerId: issuer.id,
      holderId: holder.id,
      vcJwt: "pending",
      claims: params.claims,
      domain: params.domain,
      scope: params.scope,
      family: params.family,
      assuranceLevel: params.assuranceLevel,
      isPublic: params.isPublic ?? true,
      status: "active",
      expiresAt: params.expiresAt || null,
    });

    const vcJwt = await issueVerifiableCredential({
      issuerDid: issuer.did,
      issuerPrivateKey: privateKey,
      holderDid: holder.did,
      credentialId: credRecord.id,
      credentialSubject: {
        pseudonym: `@${holder.pseudonym}`,
        ...params.claims,
      },
      domain: params.domain,
      scope: params.scope,
      family: params.family,
      assuranceLevel: params.assuranceLevel,
      issuerName: issuer.name,
      expiresAt: params.expiresAt,
    });

    await storage.updateCredential(credRecord.id, { vcJwt });
    return credRecord;
  };

  // Credential 1: WCAG Assessment
  await issueVC(
    issuer1,
    { privateKeyEnc: encryptPrivateKey(issuer1Keys.privateKey) },
    holder1,
    {
      domain: "web-accessibility",
      scope: "WCAG 2.1 AA audits",
      family: "assessment",
      assuranceLevel: "A4",
      claims: {
        role: "Certified Auditor",
        since: "2024-03-15",
        specialization: "Audit WCAG — sites gouvernementaux bilingues",
        score: "92%",
      },
      expiresAt: new Date("2029-02-10"),
      isPublic: true,
    }
  );

  // Credential 2: Community membership
  await issueVC(
    issuer1,
    { privateKeyEnc: encryptPrivateKey(issuer1Keys.privateKey) },
    holder1,
    {
      domain: "web-accessibility",
      scope: "Community Membership",
      family: "attestation",
      assuranceLevel: "A3",
      claims: {
        role: "Membre actif",
        since: "2024-03-15",
        contributions: "3+ community audit reviews",
      },
      isPublic: true,
    }
  );

  // Credential 3: OWASP Assessment
  await issueVC(
    issuer2,
    { privateKeyEnc: encryptPrivateKey(issuer2Keys.privateKey) },
    holder2,
    {
      domain: "application-security",
      scope: "OWASP Top 10 Web Vulnerability Assessment",
      family: "assessment",
      assuranceLevel: "A4",
      claims: {
        assessment: "OWASP Top 10 practical assessment",
        score: "87%",
        methodology: "Hands-on exploitation and remediation lab",
      },
      expiresAt: new Date("2028-03-01"),
      isPublic: true,
    }
  );

  // Credential 4: Responsible disclosure
  await issueVC(
    issuer2,
    { privateKeyEnc: encryptPrivateKey(issuer2Keys.privateKey) },
    holder2,
    {
      domain: "responsible-disclosure",
      scope: "Verified disclosure track record",
      family: "attestation",
      assuranceLevel: "A3",
      claims: {
        disclosures: "3+ coordinated vulnerability disclosures",
        compliance: "Follows CyberSec Alliance disclosure guidelines",
      },
      isPublic: true,
    }
  );

  // Credential 5: Craft CMS
  await issueVC(
    issuer3,
    { privateKeyEnc: encryptPrivateKey(issuer3Keys.privateKey) },
    holder3,
    {
      domain: "craft-cms",
      scope: "Plugin Development & Twig Templating",
      family: "attestation",
      assuranceLevel: "A3",
      claims: {
        certification: "Certified Craft CMS plugin developer",
        plugins: "2+ plugins on Craft Plugin Store",
        skills: "Advanced Twig templating proficiency",
      },
      expiresAt: new Date("2027-12-31"),
      isPublic: true,
    }
  );

  // Credential 6: Frontend
  await issueVC(
    issuer3,
    { privateKeyEnc: encryptPrivateKey(issuer3Keys.privateKey) },
    holder3,
    {
      domain: "frontend-development",
      scope: "Modern CSS & JavaScript Fundamentals",
      family: "assessment",
      assuranceLevel: "A4",
      claims: {
        assessment: "Frontend fundamentals assessment",
        score: "88%",
        topics: "CSS Grid, Flexbox, ES2024, Web APIs",
      },
      expiresAt: new Date("2027-09-01"),
      isPublic: true,
    }
  );

  log("Database seeded successfully with DID-based VCs.", "seed");
  log("Demo accounts: admin/admin123, a11y-christian/holder123, sec-researcher/holder123, craft-dev/holder123", "seed");
}
