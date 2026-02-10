import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  issuers,
  holders,
  credentials,
  type Issuer,
  type InsertIssuer,
  type Holder,
  type InsertHolder,
  type Credential,
  type InsertCredential,
} from "@shared/schema";

export interface IStorage {
  getIssuers(): Promise<Issuer[]>;
  getIssuer(id: string): Promise<Issuer | undefined>;
  getIssuerBySlug(slug: string): Promise<Issuer | undefined>;
  createIssuer(issuer: InsertIssuer): Promise<Issuer>;

  getHolder(id: string): Promise<Holder | undefined>;
  getHolderByPseudonym(pseudonym: string): Promise<Holder | undefined>;
  createHolder(holder: InsertHolder): Promise<Holder>;

  getCredential(id: string): Promise<Credential | undefined>;
  getCredentialsByHolder(holderId: string): Promise<Credential[]>;
  createCredential(credential: InsertCredential): Promise<Credential>;
}

export class DatabaseStorage implements IStorage {
  async getIssuers(): Promise<Issuer[]> {
    return db.select().from(issuers);
  }

  async getIssuer(id: string): Promise<Issuer | undefined> {
    const [issuer] = await db.select().from(issuers).where(eq(issuers.id, id));
    return issuer;
  }

  async getIssuerBySlug(slug: string): Promise<Issuer | undefined> {
    const [issuer] = await db.select().from(issuers).where(eq(issuers.slug, slug));
    return issuer;
  }

  async createIssuer(issuer: InsertIssuer): Promise<Issuer> {
    const [created] = await db.insert(issuers).values(issuer).returning();
    return created;
  }

  async getHolder(id: string): Promise<Holder | undefined> {
    const [holder] = await db.select().from(holders).where(eq(holders.id, id));
    return holder;
  }

  async getHolderByPseudonym(pseudonym: string): Promise<Holder | undefined> {
    const [holder] = await db.select().from(holders).where(eq(holders.pseudonym, pseudonym));
    return holder;
  }

  async createHolder(holder: InsertHolder): Promise<Holder> {
    const [created] = await db.insert(holders).values(holder).returning();
    return created;
  }

  async getCredential(id: string): Promise<Credential | undefined> {
    const [cred] = await db.select().from(credentials).where(eq(credentials.id, id));
    return cred;
  }

  async getCredentialsByHolder(holderId: string): Promise<Credential[]> {
    return db.select().from(credentials).where(eq(credentials.holderId, holderId));
  }

  async createCredential(credential: InsertCredential): Promise<Credential> {
    const [created] = await db.insert(credentials).values(credential).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
