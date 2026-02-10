import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const issuers = pgTable("issuers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  website: text("website"),
  logoUrl: text("logo_url"),
  status: text("status").notNull().default("active"),
  verifiedAt: timestamp("verified_at"),
});

export const holders = pgTable("holders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pseudonym: text("pseudonym").notNull().unique(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  stableSince: timestamp("stable_since").notNull().defaultNow(),
});

export const credentials = pgTable("credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  holderId: varchar("holder_id").notNull(),
  issuerId: varchar("issuer_id"),
  type: text("type").notNull(),
  domain: text("domain").notNull(),
  scope: text("scope").notNull(),
  claims: jsonb("claims").notNull(),
  assuranceLevel: integer("assurance_level").notNull(),
  proofPath: text("proof_path").notNull(),
  status: text("status").notNull().default("valid"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  evidence: text("evidence"),
  signature: text("signature"),
});

export const insertIssuerSchema = createInsertSchema(issuers).omit({ id: true, verifiedAt: true });
export const insertHolderSchema = createInsertSchema(holders).omit({ id: true, stableSince: true });
export const insertCredentialSchema = createInsertSchema(credentials).omit({ id: true, issuedAt: true });

export type InsertIssuer = z.infer<typeof insertIssuerSchema>;
export type Issuer = typeof issuers.$inferSelect;

export type InsertHolder = z.infer<typeof insertHolderSchema>;
export type Holder = typeof holders.$inferSelect;

export type InsertCredential = z.infer<typeof insertCredentialSchema>;
export type Credential = typeof credentials.$inferSelect;

export const ASSURANCE_LEVELS = {
  0: { label: "Self-declared", code: "A0", color: "muted" },
  1: { label: "Stable pseudonym", code: "A1", color: "secondary" },
  2: { label: "Verified evidence", code: "A2", color: "accent" },
  3: { label: "Issuer-attested", code: "A3", color: "primary" },
  4: { label: "Demonstrated skill", code: "A4", color: "chart-2" },
  5: { label: "Minimal disclosure", code: "A5", color: "chart-3" },
} as const;

export const CREDENTIAL_TYPES = {
  attestation: { label: "Attestation", description: "A recognized entity attests a fact" },
  assessment: { label: "Demonstrated Skill", description: "Passed a defined assessment" },
  process: { label: "Rigor & Method", description: "Applies a reliability methodology" },
} as const;

export const PROOF_PATHS = {
  institutional: { label: "Institutional", description: "Diplomas, certifications, official bodies" },
  community: { label: "Community", description: "Peer groups, elders, collectives" },
  portfolio: { label: "Portfolio", description: "Artifacts, references, work samples" },
  assessment: { label: "Assessment", description: "Exams, challenges, practical tests" },
  methodology: { label: "Methodology", description: "Documented rigor practices" },
} as const;
