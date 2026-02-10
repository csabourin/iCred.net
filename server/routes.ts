import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { registerAuthRoutes, requireAuth, requireRole, getCurrentUser } from "./auth";
import {
  generateEd25519KeyPair,
  encryptPrivateKey,
  decryptPrivateKey,
  buildDidWeb,
  buildDidDocument,
  issueVerifiableCredential,
  verifyJwt,
} from "./crypto";
import { slugify, createEmptyBitstring, setBitstringIndex, getBitstringIndex } from "./utils";
import {
  issueCredentialSchema,
  createDisputeSchema,
} from "@shared/schema";

const DOMAIN = process.env.ICRED_DOMAIN || "icred.net";

// Express 5 params can be string | string[]
function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : (val as string);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ============================================
  // AUTH ROUTES
  // ============================================
  registerAuthRoutes(app);

  // ============================================
  // DID RESOLUTION (public)
  // ============================================

  // Platform DID document
  app.get("/.well-known/did.json", (_req: Request, res: Response) => {
    const did = `did:web:${DOMAIN}`;
    const doc = buildDidDocument(did, {
      kty: "OKP",
      crv: "Ed25519",
      x: "platform-key-placeholder",
    });
    res.json(doc);
  });

  // Issuer DID document
  app.get("/issuers/:slug/did.json", async (req: Request, res: Response) => {
    try {
      const issuer = await storage.getIssuerBySlug(param(req, "slug"));
      if (!issuer) return res.status(404).json({ message: "Issuer not found" });

      const doc = buildDidDocument(
        issuer.did,
        issuer.publicKeyJwk as JsonWebKey,
        `https://${DOMAIN}/issuers/${issuer.slug}`
      );
      res.json(doc);
    } catch (err) {
      res.status(500).json({ message: "Failed to resolve DID" });
    }
  });

  // User DID document
  app.get("/users/:pseudonym/did.json", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserByPseudonym(param(req, "pseudonym"));
      if (!user) return res.status(404).json({ message: "User not found" });

      const doc = buildDidDocument(
        user.did,
        user.publicKeyJwk as JsonWebKey,
        `https://${DOMAIN}/holder/${user.pseudonym}`
      );
      res.json(doc);
    } catch (err) {
      res.status(500).json({ message: "Failed to resolve DID" });
    }
  });

  // ============================================
  // PUBLIC ROUTES
  // ============================================

  // List active issuers (verified only for public)
  app.get("/api/issuers", async (_req: Request, res: Response) => {
    try {
      const allIssuers = await storage.getIssuers();
      res.json(
        allIssuers.map((i) => ({
          id: i.id,
          name: i.name,
          nameFr: i.nameFr,
          slug: i.slug,
          description: i.description,
          descriptionFr: i.descriptionFr,
          website: i.website,
          logoUrl: i.logoUrl,
          category: i.category,
          domains: i.domains,
          verificationStatus: i.verificationStatus,
          verifiedAt: i.verifiedAt,
          createdAt: i.createdAt,
        }))
      );
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch issuers" });
    }
  });

  // Get issuer by slug (public)
  app.get("/api/issuers/:slug", async (req: Request, res: Response) => {
    try {
      const issuer = await storage.getIssuerBySlug(param(req, "slug"));
      if (!issuer) return res.status(404).json({ message: "Issuer not found" });

      const credTypes = await storage.getCredentialTypesByIssuer(issuer.id);

      res.json({
        issuer: {
          id: issuer.id,
          name: issuer.name,
          nameFr: issuer.nameFr,
          slug: issuer.slug,
          description: issuer.description,
          descriptionFr: issuer.descriptionFr,
          website: issuer.website,
          logoUrl: issuer.logoUrl,
          category: issuer.category,
          domains: issuer.domains,
          did: issuer.did,
          verificationStatus: issuer.verificationStatus,
          verifiedAt: issuer.verifiedAt,
          policyUrl: issuer.policyUrl,
          createdAt: issuer.createdAt,
        },
        credentialTypes: credTypes,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch issuer" });
    }
  });

  // Public holder profile
  app.get("/api/holders/:pseudonym", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserByPseudonym(param(req, "pseudonym"));
      if (!user || user.status !== "active") {
        return res.status(404).json({ message: "Holder not found" });
      }

      const creds = await storage.getPublicCredentialsByHolder(user.id);

      const credentialsWithIssuers = await Promise.all(
        creds.map(async (credential) => {
          const issuer = await storage.getIssuer(credential.issuerId);
          return {
            credential: {
              id: credential.id,
              domain: credential.domain,
              scope: credential.scope,
              family: credential.family,
              claims: credential.claims,
              assuranceLevel: credential.assuranceLevel,
              status: credential.status,
              issuedAt: credential.issuedAt,
              expiresAt: credential.expiresAt,
            },
            issuer: issuer
              ? {
                  name: issuer.name,
                  slug: issuer.slug,
                  verificationStatus: issuer.verificationStatus,
                }
              : null,
          };
        })
      );

      res.json({
        holder: {
          pseudonym: user.pseudonym,
          displayName: user.displayName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          did: user.did,
          pseudonymStableSince: user.pseudonymStableSince,
        },
        credentials: credentialsWithIssuers,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch holder profile" });
    }
  });

  // Verify credential (public API)
  app.get("/api/v1/verify/:id", async (req: Request, res: Response) => {
    try {
      const credential = await storage.getCredential(param(req, "id"));
      if (!credential) {
        return res.status(404).json({ message: "Credential not found" });
      }

      const holder = await storage.getUserById(credential.holderId);
      const issuer = await storage.getIssuer(credential.issuerId);

      // Verify JWT signature
      let signatureValid = false;
      let verificationDetails: any = {};
      if (issuer) {
        const result = await verifyJwt(
          credential.vcJwt,
          issuer.publicKeyJwk as JsonWebKey
        );
        signatureValid = result.valid;
        if (!result.valid) {
          verificationDetails.signatureError = result.reason;
        }
      }

      // Check expiration
      const expired =
        credential.expiresAt != null && new Date(credential.expiresAt) < new Date();

      // Calculate pseudonym age
      let pseudonymAge = "";
      if (holder?.pseudonymStableSince) {
        const months = Math.floor(
          (Date.now() - new Date(holder.pseudonymStableSince).getTime()) /
            (1000 * 60 * 60 * 24 * 30)
        );
        pseudonymAge =
          months < 12 ? `${months} mois` : `${Math.floor(months / 12)} an(s)`;
      }

      res.json({
        valid: signatureValid && credential.status === "active" && !expired,
        credential: {
          id: credential.id,
          holder: holder
            ? {
                pseudonym: holder.pseudonym,
                pseudonymStableSince: holder.pseudonymStableSince,
                pseudonymAge,
                did: holder.did,
              }
            : null,
          domain: credential.domain,
          scope: credential.scope,
          family: credential.family,
          assuranceLevel: credential.assuranceLevel,
          claims: credential.claims,
          issuer: issuer
            ? {
                name: issuer.name,
                slug: issuer.slug,
                did: issuer.did,
                verificationStatus: issuer.verificationStatus,
              }
            : null,
          issuedAt: credential.issuedAt,
          expiresAt: credential.expiresAt,
          status: credential.status,
          verifyUrl: `https://${DOMAIN}/verify/${credential.id}`,
        },
        verification: {
          signatureValid,
          issuerDid: issuer?.did,
          revoked: credential.status === "revoked",
          expired,
          checkedAt: new Date().toISOString(),
          ...verificationDetails,
        },
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to verify credential" });
    }
  });

  // Legacy verify endpoint (for backward compat with existing frontend)
  app.get("/api/verify/:id", async (req: Request, res: Response) => {
    try {
      const credential = await storage.getCredential(param(req, "id"));
      if (!credential) {
        return res.status(404).json({ message: "Credential not found" });
      }

      const holder = await storage.getUserById(credential.holderId);
      const issuer = await storage.getIssuer(credential.issuerId);

      res.json({ credential, holder, issuer });
    } catch (err) {
      res.status(500).json({ message: "Failed to verify credential" });
    }
  });

  // Bitstring Status List (public)
  app.get("/status/:issuerSlug/:listId", async (req: Request, res: Response) => {
    try {
      const issuer = await storage.getIssuerBySlug(param(req, "issuerSlug"));
      if (!issuer) return res.status(404).json({ message: "Issuer not found" });

      const statusList = await storage.getStatusList(param(req, "listId"));
      if (!statusList || statusList.issuerId !== issuer.id) {
        return res.status(404).json({ message: "Status list not found" });
      }

      res.json({
        "@context": [
          "https://www.w3.org/ns/credentials/v2",
          "https://w3id.org/vc/status-list/2021/v1",
        ],
        id: `https://${DOMAIN}/status/${issuer.slug}/${statusList.id}`,
        type: ["VerifiableCredential", "BitstringStatusListCredential"],
        issuer: issuer.did,
        credentialSubject: {
          id: `https://${DOMAIN}/status/${issuer.slug}/${statusList.id}#list`,
          type: "BitstringStatusList",
          statusPurpose: statusList.purpose,
          encodedList: statusList.encodedList,
        },
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch status list" });
    }
  });

  // ============================================
  // ISSUER REGISTRATION (authenticated holder)
  // ============================================
  app.post("/api/issuers", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const { name, nameFr, description, descriptionFr, website, category, domains, policyUrl } =
        req.body;

      if (!name) return res.status(400).json({ message: "Name is required" });

      const slug = slugify(name);

      // Check slug uniqueness
      const existing = await storage.getIssuerBySlug(slug);
      if (existing) {
        return res.status(409).json({ message: "An issuer with a similar name already exists" });
      }

      // Generate issuer keys
      const keyPair = await generateEd25519KeyPair();
      const did = buildDidWeb(DOMAIN, `issuers/${slug}`);

      const issuer = await storage.createIssuer({
        ownerId: user.id,
        name,
        nameFr: nameFr || null,
        slug,
        description: description || null,
        descriptionFr: descriptionFr || null,
        website: website || null,
        logoUrl: null,
        did,
        publicKeyJwk: keyPair.publicKeyJwk,
        privateKeyEnc: encryptPrivateKey(keyPair.privateKey),
        verificationStatus: "pending",
        category: category || null,
        domains: domains || [],
        policyUrl: policyUrl || null,
        status: "active",
      });

      // Create status list for this issuer
      await storage.createStatusList({
        issuerId: issuer.id,
        encodedList: createEmptyBitstring(),
        purpose: "revocation",
      });

      await storage.logAction({
        actorId: user.id,
        actorType: "user",
        action: "create_issuer",
        resourceType: "issuer",
        resourceId: issuer.id,
      });

      // Update user role to issuer if they're a holder
      if (user.role === "holder") {
        await storage.updateUser(user.id, { role: "issuer" });
      }

      res.status(201).json({ issuer });
    } catch (err: any) {
      console.error("Create issuer error:", err);
      res.status(500).json({ message: "Failed to create issuer" });
    }
  });

  // ============================================
  // CREDENTIAL TYPES (issuer)
  // ============================================
  app.post(
    "/api/issuer/:issuerId/credential-types",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = await getCurrentUser(req);
        if (!user) return res.status(401).json({ message: "Not authenticated" });

        const issuer = await storage.getIssuer(param(req, "issuerId"));
        if (!issuer || issuer.ownerId !== user.id) {
          return res.status(403).json({ message: "Not authorized" });
        }

        const { name, nameFr, description, descriptionFr, family, domain, scope, defaultAssuranceLevel, defaultTtlDays, claimSchema, rubric } = req.body;

        if (!name || !family || !domain || !claimSchema) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        const slug = slugify(name);

        const ct = await storage.createCredentialType({
          issuerId: issuer.id,
          name,
          nameFr: nameFr || null,
          slug,
          description: description || null,
          descriptionFr: descriptionFr || null,
          family,
          domain,
          scope: scope || null,
          defaultAssuranceLevel: defaultAssuranceLevel || "A3",
          defaultTtlDays: defaultTtlDays || 1095,
          claimSchema,
          rubric: rubric || null,
          status: "active",
        });

        await storage.logAction({
          actorId: user.id,
          actorType: "issuer",
          action: "create_credential_type",
          resourceType: "credential_type",
          resourceId: ct.id,
        });

        res.status(201).json({ credentialType: ct });
      } catch (err) {
        res.status(500).json({ message: "Failed to create credential type" });
      }
    }
  );

  app.get(
    "/api/issuer/:issuerId/credential-types",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = await getCurrentUser(req);
        if (!user) return res.status(401).json({ message: "Not authenticated" });

        const issuer = await storage.getIssuer(param(req, "issuerId"));
        if (!issuer || issuer.ownerId !== user.id) {
          return res.status(403).json({ message: "Not authorized" });
        }

        const types = await storage.getCredentialTypesByIssuer(issuer.id);
        res.json({ credentialTypes: types });
      } catch (err) {
        res.status(500).json({ message: "Failed to fetch credential types" });
      }
    }
  );

  // ============================================
  // CREDENTIAL ISSUANCE (issuer)
  // ============================================
  app.post(
    "/api/issuer/:issuerId/credentials/issue",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = await getCurrentUser(req);
        if (!user) return res.status(401).json({ message: "Not authenticated" });

        const issuer = await storage.getIssuer(param(req, "issuerId"));
        if (!issuer || issuer.ownerId !== user.id) {
          return res.status(403).json({ message: "Not authorized" });
        }

        if (issuer.verificationStatus !== "verified") {
          return res.status(403).json({
            message: "Issuer must be verified before issuing credentials",
          });
        }

        // Check daily limit
        const todayCount = await storage.countCredentialsByIssuerToday(issuer.id);
        if (todayCount >= (issuer.maxCredentialsPerDay || 50)) {
          return res
            .status(429)
            .json({ message: "Daily credential issuance limit reached" });
        }

        const parsed = issueCredentialSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            message: "Validation error",
            errors: parsed.error.flatten().fieldErrors,
          });
        }

        const data = parsed.data;

        // Find holder
        const holder = await storage.getUserByPseudonym(data.holderPseudonym);
        if (!holder) {
          return res.status(404).json({ message: "Holder not found" });
        }

        // Decrypt issuer private key
        const privateKey = decryptPrivateKey(issuer.privateKeyEnc!);

        // Calculate expiration
        let expiresAt: Date | undefined;
        if (data.expiresInDays) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);
        }

        // Create credential record first to get ID
        const credentialRecord = await storage.createCredential({
          credentialTypeId: data.credentialTypeId || null,
          issuerId: issuer.id,
          holderId: holder.id,
          vcJwt: "pending", // will be updated
          claims: data.claims,
          domain: data.domain,
          scope: data.scope,
          family: data.family,
          assuranceLevel: data.assuranceLevel,
          isPublic: data.isPublic,
          status: "active",
          expiresAt: expiresAt || null,
        });

        // Issue VC JWT
        const vcJwt = await issueVerifiableCredential({
          issuerDid: issuer.did,
          issuerPrivateKey: privateKey,
          holderDid: holder.did,
          credentialId: credentialRecord.id,
          credentialSubject: {
            pseudonym: `@${holder.pseudonym}`,
            ...data.claims,
          },
          domain: data.domain,
          scope: data.scope,
          family: data.family,
          assuranceLevel: data.assuranceLevel,
          issuerName: issuer.name,
          expiresAt,
        });

        // Update with JWT
        await storage.updateCredential(credentialRecord.id, { vcJwt });

        await storage.logAction({
          actorId: user.id,
          actorType: "issuer",
          action: "issue_credential",
          resourceType: "credential",
          resourceId: credentialRecord.id,
          details: {
            holderId: holder.id,
            holderPseudonym: holder.pseudonym,
            domain: data.domain,
            assuranceLevel: data.assuranceLevel,
          },
        });

        res.status(201).json({
          credential: { ...credentialRecord, vcJwt },
          verifyUrl: `https://${DOMAIN}/verify/${credentialRecord.id}`,
        });
      } catch (err: any) {
        console.error("Issue credential error:", err);
        res.status(500).json({ message: "Failed to issue credential" });
      }
    }
  );

  // List credentials issued by issuer
  app.get(
    "/api/issuer/:issuerId/credentials",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = await getCurrentUser(req);
        if (!user) return res.status(401).json({ message: "Not authenticated" });

        const issuer = await storage.getIssuer(param(req, "issuerId"));
        if (!issuer || issuer.ownerId !== user.id) {
          return res.status(403).json({ message: "Not authorized" });
        }

        const creds = await storage.getCredentialsByIssuer(issuer.id);

        const credentialsWithHolders = await Promise.all(
          creds.map(async (c) => {
            const holder = await storage.getUserById(c.holderId);
            return {
              ...c,
              holderPseudonym: holder?.pseudonym,
            };
          })
        );

        res.json({ credentials: credentialsWithHolders });
      } catch (err) {
        res.status(500).json({ message: "Failed to fetch credentials" });
      }
    }
  );

  // Revoke credential
  app.post(
    "/api/issuer/:issuerId/credentials/:credentialId/revoke",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = await getCurrentUser(req);
        if (!user) return res.status(401).json({ message: "Not authenticated" });

        const issuer = await storage.getIssuer(param(req, "issuerId"));
        if (!issuer || issuer.ownerId !== user.id) {
          return res.status(403).json({ message: "Not authorized" });
        }

        const credential = await storage.getCredential(param(req, "credentialId"));
        if (!credential || credential.issuerId !== issuer.id) {
          return res.status(404).json({ message: "Credential not found" });
        }

        if (credential.status === "revoked") {
          return res.status(400).json({ message: "Credential already revoked" });
        }

        const { reason } = req.body;

        await storage.updateCredential(credential.id, {
          status: "revoked",
          revokedAt: new Date(),
          revocationReason: reason || "Revoked by issuer",
        });

        await storage.logAction({
          actorId: user.id,
          actorType: "issuer",
          action: "revoke_credential",
          resourceType: "credential",
          resourceId: credential.id,
          details: { reason },
        });

        res.json({ message: "Credential revoked" });
      } catch (err) {
        res.status(500).json({ message: "Failed to revoke credential" });
      }
    }
  );

  // ============================================
  // HOLDER DASHBOARD
  // ============================================

  // My credentials
  app.get("/api/dashboard/credentials", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const creds = await storage.getCredentialsByHolder(user.id);

      const credentialsWithIssuers = await Promise.all(
        creds.map(async (c) => {
          const issuer = await storage.getIssuer(c.issuerId);
          return {
            ...c,
            issuerName: issuer?.name,
            issuerSlug: issuer?.slug,
            issuerVerificationStatus: issuer?.verificationStatus,
          };
        })
      );

      res.json({ credentials: credentialsWithIssuers });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch credentials" });
    }
  });

  // Toggle credential visibility
  app.patch(
    "/api/dashboard/credentials/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = await getCurrentUser(req);
        if (!user) return res.status(401).json({ message: "Not authenticated" });

        const credential = await storage.getCredential(param(req, "id"));
        if (!credential || credential.holderId !== user.id) {
          return res.status(404).json({ message: "Credential not found" });
        }

        const { isPublic } = req.body;
        if (typeof isPublic !== "boolean") {
          return res.status(400).json({ message: "isPublic must be a boolean" });
        }

        const updated = await storage.updateCredential(credential.id, { isPublic });
        res.json({ credential: updated });
      } catch (err) {
        res.status(500).json({ message: "Failed to update credential" });
      }
    }
  );

  // ============================================
  // DISPUTES
  // ============================================
  app.post("/api/disputes", async (req: Request, res: Response) => {
    try {
      const parsed = createDisputeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const data = parsed.data;

      // Verify credential exists
      const credential = await storage.getCredential(data.credentialId);
      if (!credential) {
        return res.status(404).json({ message: "Credential not found" });
      }

      const user = await getCurrentUser(req);

      // Set response deadline to 14 days
      const responseDeadline = new Date();
      responseDeadline.setDate(responseDeadline.getDate() + 14);

      const dispute = await storage.createDispute({
        credentialId: data.credentialId,
        reporterId: user?.id || null,
        reporterEmail: data.reporterEmail || null,
        category: data.category,
        description: data.description,
        evidenceUrls: data.evidenceUrls || [],
        status: "open",
        responseDeadline,
      });

      await storage.logAction({
        actorId: user?.id,
        actorType: user ? "user" : "system",
        action: "create_dispute",
        resourceType: "dispute",
        resourceId: dispute.id,
        details: { credentialId: data.credentialId, category: data.category },
      });

      res.status(201).json({ dispute });
    } catch (err) {
      res.status(500).json({ message: "Failed to create dispute" });
    }
  });

  // ============================================
  // ADMIN ROUTES
  // ============================================

  // Admin: list all issuers (including pending)
  app.get(
    "/api/admin/issuers",
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const allIssuers = await storage.getAllIssuers();
        res.json({ issuers: allIssuers });
      } catch (err) {
        res.status(500).json({ message: "Failed to fetch issuers" });
      }
    }
  );

  // Admin: verify/reject issuer
  app.patch(
    "/api/admin/issuers/:id/verify",
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const { status, notes } = req.body;
        if (!["verified", "rejected", "suspended"].includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }

        const issuer = await storage.getIssuer(param(req, "id"));
        if (!issuer) return res.status(404).json({ message: "Issuer not found" });

        const updated = await storage.updateIssuer(issuer.id, {
          verificationStatus: status,
          verificationNotes: notes || null,
          verifiedAt: status === "verified" ? new Date() : null,
        });

        const user = (req as any).user;
        await storage.logAction({
          actorId: user.id,
          actorType: "admin",
          action: `issuer_${status}`,
          resourceType: "issuer",
          resourceId: issuer.id,
          details: { notes },
        });

        res.json({ issuer: updated });
      } catch (err) {
        res.status(500).json({ message: "Failed to update issuer" });
      }
    }
  );

  // Admin: list disputes
  app.get(
    "/api/admin/disputes",
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const allDisputes = await storage.getDisputes();
        res.json({ disputes: allDisputes });
      } catch (err) {
        res.status(500).json({ message: "Failed to fetch disputes" });
      }
    }
  );

  // Admin: resolve dispute
  app.patch(
    "/api/admin/disputes/:id/resolve",
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const { status, notes } = req.body;
        if (
          !["resolved_upheld", "resolved_dismissed", "resolved_revoked"].includes(
            status
          )
        ) {
          return res.status(400).json({ message: "Invalid resolution status" });
        }

        const dispute = await storage.getDispute(param(req, "id"));
        if (!dispute) return res.status(404).json({ message: "Dispute not found" });

        const user = (req as any).user;

        const updated = await storage.updateDispute(dispute.id, {
          status,
          resolutionNotes: notes || null,
          resolvedBy: user.id,
          resolvedAt: new Date(),
        });

        // If resolved_revoked, also revoke the credential
        if (status === "resolved_revoked") {
          await storage.updateCredential(dispute.credentialId, {
            status: "revoked",
            revokedAt: new Date(),
            revocationReason: `Revoked after dispute resolution: ${notes || "No notes"}`,
          });
        }

        await storage.logAction({
          actorId: user.id,
          actorType: "admin",
          action: "resolve_dispute",
          resourceType: "dispute",
          resourceId: dispute.id,
          details: { status, notes },
        });

        res.json({ dispute: updated });
      } catch (err) {
        res.status(500).json({ message: "Failed to resolve dispute" });
      }
    }
  );

  // Admin: audit log
  app.get(
    "/api/admin/audit",
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
        const log = await storage.getAuditLog(limit);
        res.json({ auditLog: log });
      } catch (err) {
        res.status(500).json({ message: "Failed to fetch audit log" });
      }
    }
  );

  // Admin: stats
  app.get(
    "/api/admin/stats",
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const stats = await storage.getStats();
        res.json(stats);
      } catch (err) {
        res.status(500).json({ message: "Failed to fetch stats" });
      }
    }
  );

  return httpServer;
}
