import { eq, and, desc, sql, count } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  issuers,
  credentialTypes,
  credentials,
  statusLists,
  disputes,
  auditLog,
  type User,
  type Issuer,
  type CredentialType,
  type Credential,
  type StatusList,
  type Dispute,
  type AuditLogEntry,
} from "@shared/schema";

export class DatabaseStorage {
  // ========== USERS ==========
  async createUser(data: Partial<User> & { pseudonym: string; did: string; publicKeyJwk: any }): Promise<User> {
    const [user] = await db.insert(users).values(data as any).returning();
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByPseudonym(pseudonym: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.pseudonym, pseudonym));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  // ========== ISSUERS ==========
  async createIssuer(data: any): Promise<Issuer> {
    const [issuer] = await db.insert(issuers).values(data).returning();
    return issuer;
  }

  async getIssuers(): Promise<Issuer[]> {
    return db.select().from(issuers).where(eq(issuers.status, "active")).orderBy(desc(issuers.createdAt));
  }

  async getAllIssuers(): Promise<Issuer[]> {
    return db.select().from(issuers).orderBy(desc(issuers.createdAt));
  }

  async getIssuer(id: string): Promise<Issuer | undefined> {
    const [issuer] = await db.select().from(issuers).where(eq(issuers.id, id));
    return issuer;
  }

  async getIssuerBySlug(slug: string): Promise<Issuer | undefined> {
    const [issuer] = await db.select().from(issuers).where(eq(issuers.slug, slug));
    return issuer;
  }

  async getIssuersByOwner(ownerId: string): Promise<Issuer[]> {
    return db.select().from(issuers).where(eq(issuers.ownerId, ownerId));
  }

  async updateIssuer(id: string, data: Partial<Issuer>): Promise<Issuer | undefined> {
    const [issuer] = await db
      .update(issuers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(issuers.id, id))
      .returning();
    return issuer;
  }

  // ========== CREDENTIAL TYPES ==========
  async createCredentialType(data: any): Promise<CredentialType> {
    const [ct] = await db.insert(credentialTypes).values(data).returning();
    return ct;
  }

  async getCredentialTypesByIssuer(issuerId: string): Promise<CredentialType[]> {
    return db
      .select()
      .from(credentialTypes)
      .where(eq(credentialTypes.issuerId, issuerId))
      .orderBy(desc(credentialTypes.createdAt));
  }

  async getCredentialType(id: string): Promise<CredentialType | undefined> {
    const [ct] = await db.select().from(credentialTypes).where(eq(credentialTypes.id, id));
    return ct;
  }

  async updateCredentialType(id: string, data: Partial<CredentialType>): Promise<CredentialType | undefined> {
    const [ct] = await db
      .update(credentialTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(credentialTypes.id, id))
      .returning();
    return ct;
  }

  // ========== CREDENTIALS ==========
  async createCredential(data: any): Promise<Credential> {
    const [cred] = await db.insert(credentials).values(data).returning();
    return cred;
  }

  async getCredential(id: string): Promise<Credential | undefined> {
    const [cred] = await db.select().from(credentials).where(eq(credentials.id, id));
    return cred;
  }

  async getCredentialsByHolder(holderId: string): Promise<Credential[]> {
    return db
      .select()
      .from(credentials)
      .where(eq(credentials.holderId, holderId))
      .orderBy(desc(credentials.issuedAt));
  }

  async getPublicCredentialsByHolder(holderId: string): Promise<Credential[]> {
    return db
      .select()
      .from(credentials)
      .where(and(eq(credentials.holderId, holderId), eq(credentials.isPublic, true), eq(credentials.status, "active")))
      .orderBy(desc(credentials.issuedAt));
  }

  async getCredentialsByIssuer(issuerId: string): Promise<Credential[]> {
    return db
      .select()
      .from(credentials)
      .where(eq(credentials.issuerId, issuerId))
      .orderBy(desc(credentials.issuedAt));
  }

  async updateCredential(id: string, data: Partial<Credential>): Promise<Credential | undefined> {
    const [cred] = await db
      .update(credentials)
      .set(data)
      .where(eq(credentials.id, id))
      .returning();
    return cred;
  }

  async countCredentialsByIssuerToday(issuerId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await db
      .select({ count: count() })
      .from(credentials)
      .where(
        and(
          eq(credentials.issuerId, issuerId),
          sql`${credentials.createdAt} >= ${today}`
        )
      );
    return result[0]?.count ?? 0;
  }

  // ========== STATUS LISTS ==========
  async createStatusList(data: any): Promise<StatusList> {
    const [sl] = await db.insert(statusLists).values(data).returning();
    return sl;
  }

  async getStatusList(id: string): Promise<StatusList | undefined> {
    const [sl] = await db.select().from(statusLists).where(eq(statusLists.id, id));
    return sl;
  }

  async getStatusListByIssuer(issuerId: string): Promise<StatusList | undefined> {
    const [sl] = await db
      .select()
      .from(statusLists)
      .where(eq(statusLists.issuerId, issuerId))
      .limit(1);
    return sl;
  }

  async updateStatusList(id: string, data: Partial<StatusList>): Promise<StatusList | undefined> {
    const [sl] = await db
      .update(statusLists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(statusLists.id, id))
      .returning();
    return sl;
  }

  // ========== DISPUTES ==========
  async createDispute(data: any): Promise<Dispute> {
    const [dispute] = await db.insert(disputes).values(data).returning();
    return dispute;
  }

  async getDisputes(): Promise<Dispute[]> {
    return db.select().from(disputes).orderBy(desc(disputes.createdAt));
  }

  async getDispute(id: string): Promise<Dispute | undefined> {
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, id));
    return dispute;
  }

  async updateDispute(id: string, data: Partial<Dispute>): Promise<Dispute | undefined> {
    const [dispute] = await db
      .update(disputes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(disputes.id, id))
      .returning();
    return dispute;
  }

  async getDisputesByCredential(credentialId: string): Promise<Dispute[]> {
    return db
      .select()
      .from(disputes)
      .where(eq(disputes.credentialId, credentialId))
      .orderBy(desc(disputes.createdAt));
  }

  // ========== AUDIT LOG ==========
  async logAction(data: {
    actorId?: string;
    actorType: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: any;
    ipHash?: string;
  }): Promise<void> {
    await db.insert(auditLog).values(data as any);
  }

  async getAuditLog(limit: number = 100): Promise<AuditLogEntry[]> {
    return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
  }

  // ========== STATS ==========
  async getStats(): Promise<{
    totalUsers: number;
    totalIssuers: number;
    totalCredentials: number;
    totalDisputes: number;
    pendingIssuers: number;
    openDisputes: number;
  }> {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [issuerCount] = await db.select({ count: count() }).from(issuers);
    const [credCount] = await db.select({ count: count() }).from(credentials);
    const [disputeCount] = await db.select({ count: count() }).from(disputes);
    const [pendingIssuerCount] = await db
      .select({ count: count() })
      .from(issuers)
      .where(eq(issuers.verificationStatus, "pending"));
    const [openDisputeCount] = await db
      .select({ count: count() })
      .from(disputes)
      .where(eq(disputes.status, "open"));

    return {
      totalUsers: userCount?.count ?? 0,
      totalIssuers: issuerCount?.count ?? 0,
      totalCredentials: credCount?.count ?? 0,
      totalDisputes: disputeCount?.count ?? 0,
      pendingIssuers: pendingIssuerCount?.count ?? 0,
      openDisputes: openDisputeCount?.count ?? 0,
    };
  }
}

export const storage = new DatabaseStorage();
