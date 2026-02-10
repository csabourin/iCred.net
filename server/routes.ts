import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/issuers", async (_req, res) => {
    try {
      const issuers = await storage.getIssuers();
      res.json(issuers);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch issuers" });
    }
  });

  app.get("/api/issuers/:id", async (req, res) => {
    try {
      const issuer = await storage.getIssuer(req.params.id);
      if (!issuer) {
        return res.status(404).json({ message: "Issuer not found" });
      }
      res.json(issuer);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch issuer" });
    }
  });

  app.get("/api/holders/:pseudonym", async (req, res) => {
    try {
      const holder = await storage.getHolderByPseudonym(req.params.pseudonym);
      if (!holder) {
        return res.status(404).json({ message: "Holder not found" });
      }

      const creds = await storage.getCredentialsByHolder(holder.id);

      const credentialsWithIssuers = await Promise.all(
        creds.map(async (credential) => {
          let issuer = null;
          if (credential.issuerId) {
            issuer = (await storage.getIssuer(credential.issuerId)) || null;
          }
          return { credential, issuer };
        })
      );

      res.json({ holder, credentials: credentialsWithIssuers });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch holder profile" });
    }
  });

  app.get("/api/verify/:id", async (req, res) => {
    try {
      const credential = await storage.getCredential(req.params.id);
      if (!credential) {
        return res.status(404).json({ message: "Credential not found" });
      }

      const holder = await storage.getHolder(credential.holderId);
      if (!holder) {
        return res.status(404).json({ message: "Holder not found" });
      }

      let issuer = null;
      if (credential.issuerId) {
        issuer = (await storage.getIssuer(credential.issuerId)) || null;
      }

      res.json({ credential, holder, issuer });
    } catch (err) {
      res.status(500).json({ message: "Failed to verify credential" });
    }
  });

  return httpServer;
}
