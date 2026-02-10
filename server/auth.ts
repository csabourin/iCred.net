import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import {
  generateEd25519KeyPair,
  encryptPrivateKey,
  buildDidWeb,
} from "./crypto";
import { registerSchema, loginSchema, type User } from "@shared/schema";

const DOMAIN = process.env.ICRED_DOMAIN || "icred.net";
const SALT_ROUNDS = 12;

// Extend Express session
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    (req as any).user = user;
    next();
  };
}

export async function getCurrentUser(req: Request): Promise<User | undefined> {
  if (!req.session?.userId) return undefined;
  return storage.getUserById(req.session.userId);
}

export function registerAuthRoutes(app: any) {
  // Register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { pseudonym, email, password } = parsed.data;

      // Check existing pseudonym
      const existingPseudonym = await storage.getUserByPseudonym(pseudonym);
      if (existingPseudonym) {
        return res.status(409).json({ message: "Pseudonym already taken" });
      }

      // Check existing email
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(409).json({ message: "Email already registered" });
        }
      }

      // Generate keys
      const keyPair = await generateEd25519KeyPair();
      const did = buildDidWeb(DOMAIN, `users/${pseudonym}`);
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await storage.createUser({
        pseudonym,
        email: email || null,
        passwordHash,
        did,
        publicKeyJwk: keyPair.publicKeyJwk,
        privateKeyEnc: encryptPrivateKey(keyPair.privateKey),
        role: "holder",
        status: "active",
        pseudonymStableSince: new Date(),
      });

      await storage.logAction({
        actorId: user.id,
        actorType: "user",
        action: "register",
        resourceType: "user",
        resourceId: user.id,
      });

      req.session.userId = user.id;

      res.status(201).json({
        user: sanitizeUser(user),
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const { pseudonym, password } = parsed.data;
      const user = await storage.getUserByPseudonym(pseudonym);

      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.status !== "active") {
        return res.status(403).json({ message: "Account is suspended" });
      }

      req.session.userId = user.id;

      await storage.logAction({
        actorId: user.id,
        actorType: "user",
        action: "login",
        resourceType: "user",
        resourceId: user.id,
      });

      res.json({ user: sanitizeUser(user) });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("icred.sid");
      res.json({ message: "Logged out" });
    });
  });

  // Get current user
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.json({ user: null });
    }

    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.json({ user: null });
    }

    // Also fetch issuers owned by this user
    const ownedIssuers = await storage.getIssuersByOwner(user.id);

    res.json({
      user: sanitizeUser(user),
      ownedIssuers: ownedIssuers.map((i) => ({
        id: i.id,
        name: i.name,
        slug: i.slug,
        verificationStatus: i.verificationStatus,
      })),
    });
  });

  // Update profile
  app.patch("/api/auth/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const { displayName, bio, avatarUrl } = req.body;

      const updated = await storage.updateUser(user.id, {
        displayName: displayName ?? user.displayName,
        bio: bio ?? user.bio,
        avatarUrl: avatarUrl ?? user.avatarUrl,
      });

      res.json({ user: sanitizeUser(updated!) });
    } catch (err) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
}

function sanitizeUser(user: User) {
  return {
    id: user.id,
    pseudonym: user.pseudonym,
    email: user.email,
    did: user.did,
    role: user.role,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    pseudonymStableSince: user.pseudonymStableSince,
    status: user.status,
    createdAt: user.createdAt,
  };
}
