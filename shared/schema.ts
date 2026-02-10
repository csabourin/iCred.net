import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  bigserial,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// USERS (holders + issuers + admins)
// ============================================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  pseudonym: varchar("pseudonym", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  did: varchar("did", { length: 512 }).unique().notNull(),
  publicKeyJwk: jsonb("public_key_jwk").notNull(),
  privateKeyEnc: text("private_key_enc"), // encrypted private key (for MVP)
  role: varchar("role", { length: 20 }).notNull().default("holder"),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  pseudonymStableSince: timestamp("pseudonym_stable_since").defaultNow(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// ISSUERS (organisations/communities)
// ============================================
export const issuers = pgTable("issuers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  nameFr: varchar("name_fr", { length: 255 }),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  descriptionFr: text("description_fr"),
  website: varchar("website", { length: 512 }),
  logoUrl: text("logo_url"),
  did: varchar("did", { length: 512 }).unique().notNull(),
  publicKeyJwk: jsonb("public_key_jwk").notNull(),
  privateKeyEnc: text("private_key_enc"),
  verificationStatus: varchar("verification_status", { length: 20 })
    .notNull()
    .default("pending"),
  verificationNotes: text("verification_notes"),
  verifiedAt: timestamp("verified_at"),
  policyUrl: varchar("policy_url", { length: 512 }),
  domains: text("domains")
    .array()
    .default(sql`'{}'`),
  category: text("category"),
  maxCredentialsPerDay: integer("max_credentials_per_day").default(50),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// CREDENTIAL TYPES (templates)
// ============================================
export const credentialTypes = pgTable("credential_types", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  issuerId: uuid("issuer_id")
    .notNull()
    .references(() => issuers.id),
  name: varchar("name", { length: 255 }).notNull(),
  nameFr: varchar("name_fr", { length: 255 }),
  slug: varchar("slug", { length: 128 }).notNull(),
  description: text("description"),
  descriptionFr: text("description_fr"),
  family: varchar("family", { length: 20 }).notNull(),
  domain: varchar("domain", { length: 128 }).notNull(),
  scope: varchar("scope", { length: 255 }),
  defaultAssuranceLevel: varchar("default_assurance_level", { length: 2 })
    .notNull()
    .default("A3"),
  defaultTtlDays: integer("default_ttl_days").default(1095),
  claimSchema: jsonb("claim_schema").notNull(),
  rubric: jsonb("rubric"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// CREDENTIALS (issued VCs)
// ============================================
export const credentials = pgTable("credentials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  credentialTypeId: uuid("credential_type_id").references(
    () => credentialTypes.id
  ),
  issuerId: uuid("issuer_id")
    .notNull()
    .references(() => issuers.id),
  holderId: uuid("holder_id")
    .notNull()
    .references(() => users.id),
  vcJwt: text("vc_jwt").notNull(),
  claims: jsonb("claims").notNull(),
  domain: text("domain").notNull(),
  scope: text("scope").notNull(),
  family: varchar("family", { length: 20 }).notNull().default("attestation"),
  assuranceLevel: varchar("assurance_level", { length: 2 }).notNull(),
  isPublic: boolean("is_public").default(false),
  evidenceHashes: text("evidence_hashes").array(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  revocationReason: text("revocation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// STATUS LISTS (Bitstring Status List W3C)
// ============================================
export const statusLists = pgTable("status_lists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  issuerId: uuid("issuer_id")
    .notNull()
    .references(() => issuers.id),
  encodedList: text("encoded_list").notNull(),
  listSize: integer("list_size").default(131072),
  nextIndex: integer("next_index").default(0),
  purpose: varchar("purpose", { length: 20 }).notNull().default("revocation"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// DISPUTES
// ============================================
export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  credentialId: uuid("credential_id")
    .notNull()
    .references(() => credentials.id),
  reporterId: uuid("reporter_id").references(() => users.id),
  reporterEmail: varchar("reporter_email", { length: 255 }),
  category: varchar("category", { length: 30 }).notNull(),
  description: text("description").notNull(),
  evidenceUrls: text("evidence_urls").array(),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  resolutionNotes: text("resolution_notes"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  responseDeadline: timestamp("response_deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// AUDIT LOG
// ============================================
export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actorId: uuid("actor_id").references(() => users.id),
  actorType: varchar("actor_type", { length: 20 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  resourceType: varchar("resource_type", { length: 30 }).notNull(),
  resourceId: uuid("resource_id"),
  details: jsonb("details"),
  ipHash: varchar("ip_hash", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// ZOD SCHEMAS
// ============================================

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const registerSchema = z.object({
  pseudonym: z
    .string()
    .min(3)
    .max(64)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Pseudonym can only contain letters, numbers, hyphens and underscores"
    ),
  email: z.string().email().optional(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  pseudonym: z.string().min(1),
  password: z.string().min(1),
});

export const insertIssuerSchema = createInsertSchema(issuers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
  did: true,
  publicKeyJwk: true,
  privateKeyEnc: true,
  ownerId: true,
});

export const insertCredentialTypeSchema = createInsertSchema(
  credentialTypes
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  issuerId: true,
});

export const issueCredentialSchema = z.object({
  credentialTypeId: z.string().uuid().optional(),
  holderPseudonym: z.string().min(1),
  domain: z.string().min(1),
  scope: z.string().min(1),
  family: z.enum(["attestation", "assessment", "process"]),
  claims: z.record(z.any()),
  assuranceLevel: z.enum(["A0", "A1", "A2", "A3", "A4", "A5"]),
  expiresInDays: z.number().int().positive().optional(),
  isPublic: z.boolean().optional().default(false),
});

export const createDisputeSchema = z.object({
  credentialId: z.string().uuid(),
  category: z.enum([
    "fraud",
    "impersonation",
    "issuer_compromised",
    "factual_error",
    "expired_competence",
    "other",
  ]),
  description: z.string().min(10).max(5000),
  evidenceUrls: z.array(z.string().url()).optional(),
  reporterEmail: z.string().email().optional(),
});

// ============================================
// TYPES
// ============================================
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Issuer = typeof issuers.$inferSelect;
export type InsertIssuer = z.infer<typeof insertIssuerSchema>;
export type CredentialType = typeof credentialTypes.$inferSelect;
export type Credential = typeof credentials.$inferSelect;
export type StatusList = typeof statusLists.$inferSelect;
export type Dispute = typeof disputes.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;

// ============================================
// CONSTANTS
// ============================================
export const ASSURANCE_LEVELS = {
  A0: {
    label: "Self-declared",
    labelFr: "Auto-déclaré",
    code: "A0",
    level: 0,
    color: "muted",
    description: "No external verification",
  },
  A1: {
    label: "Stable pseudonym",
    labelFr: "Pseudonyme stable",
    code: "A1",
    level: 1,
    color: "secondary",
    description: "Identity persistence over time",
  },
  A2: {
    label: "Verified evidence",
    labelFr: "Preuves vérifiées",
    code: "A2",
    level: 2,
    color: "accent",
    description: "Evidence-based claims reviewed",
  },
  A3: {
    label: "Issuer-attested",
    labelFr: "Attesté par un émetteur",
    code: "A3",
    level: 3,
    color: "primary",
    description: "Attested by a verified issuer",
  },
  A4: {
    label: "Demonstrated skill",
    labelFr: "Compétence démontrée",
    code: "A4",
    level: 4,
    color: "chart-2",
    description: "Passed a defined assessment",
  },
  A5: {
    label: "Minimal disclosure",
    labelFr: "Divulgation minimale",
    code: "A5",
    level: 5,
    color: "chart-3",
    description: "Zero-knowledge or selective disclosure",
  },
} as const;

export const CREDENTIAL_FAMILIES = {
  attestation: {
    label: "Attestation",
    labelFr: "Attestation",
    description: "A recognized entity attests a fact",
  },
  assessment: {
    label: "Assessment",
    labelFr: "Évaluation",
    description: "Passed a defined assessment",
  },
  process: {
    label: "Process",
    labelFr: "Processus",
    description: "Applies a reliability methodology",
  },
} as const;

export const PROOF_PATHS = {
  institutional: {
    label: "Institutional",
    labelFr: "Institutionnel",
    description: "Diplomas, certifications, official bodies",
  },
  community: {
    label: "Community",
    labelFr: "Communautaire",
    description: "Peer groups, elders, collectives",
  },
  portfolio: {
    label: "Portfolio",
    labelFr: "Portfolio",
    description: "Artifacts, references, work samples",
  },
  assessment: {
    label: "Assessment",
    labelFr: "Évaluation",
    description: "Exams, challenges, practical tests",
  },
  methodology: {
    label: "Methodology",
    labelFr: "Méthodologie",
    description: "Documented rigor practices",
  },
} as const;

export const DISPUTE_CATEGORIES = {
  fraud: { label: "Fraud", labelFr: "Fraude" },
  impersonation: { label: "Impersonation", labelFr: "Usurpation d'identité" },
  issuer_compromised: {
    label: "Issuer Compromised",
    labelFr: "Émetteur compromis",
  },
  factual_error: { label: "Factual Error", labelFr: "Erreur factuelle" },
  expired_competence: {
    label: "Expired Competence",
    labelFr: "Compétence expirée",
  },
  other: { label: "Other", labelFr: "Autre" },
} as const;
