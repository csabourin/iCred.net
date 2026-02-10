import * as ed from "@noble/ed25519";
import { base64url } from "./utils";

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  publicKeyJwk: JsonWebKey;
}

export async function generateEd25519KeyPair(): Promise<KeyPair> {
  const privateKey = ed.utils.randomSecretKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);

  const publicKeyJwk: JsonWebKey = {
    kty: "OKP",
    crv: "Ed25519",
    x: base64url.encode(publicKey),
  };

  return { publicKey, privateKey, publicKeyJwk };
}

export function encryptPrivateKey(
  privateKey: Uint8Array,
  _masterKey?: string
): string {
  // MVP: base64url encode. In production, use AES-GCM with master key from env.
  return base64url.encode(privateKey);
}

export function decryptPrivateKey(
  encrypted: string,
  _masterKey?: string
): Uint8Array {
  return base64url.decode(encrypted);
}

export async function signPayload(
  payload: object,
  privateKey: Uint8Array
): Promise<string> {
  const header = { alg: "EdDSA", typ: "JWT" };
  const headerB64 = base64url.encodeString(JSON.stringify(header));
  const payloadB64 = base64url.encodeString(JSON.stringify(payload));

  const signingInput = `${headerB64}.${payloadB64}`;
  const message = new TextEncoder().encode(signingInput);
  const signature = await ed.signAsync(message, privateKey);

  return `${signingInput}.${base64url.encode(signature)}`;
}

export async function verifyJwt(
  jwt: string,
  publicKeyJwk: JsonWebKey
): Promise<{ valid: boolean; payload?: any; reason?: string }> {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3)
      return { valid: false, reason: "Invalid JWT format" };

    const [headerB64, payloadB64, signatureB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;
    const message = new TextEncoder().encode(signingInput);
    const signature = base64url.decode(signatureB64);
    const publicKey = base64url.decode(publicKeyJwk.x!);

    const valid = await ed.verifyAsync(signature, message, publicKey);
    if (!valid) return { valid: false, reason: "Invalid signature" };

    const payload = JSON.parse(base64url.decodeString(payloadB64));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, reason: "Token expired" };
    }

    // Check not-before
    if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) {
      return { valid: false, reason: "Token not yet valid" };
    }

    return { valid: true, payload };
  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}

export function buildDidWeb(
  domain: string,
  path: string
): string {
  const segments = path
    .split("/")
    .filter(Boolean)
    .join(":");
  return segments ? `did:web:${domain}:${segments}` : `did:web:${domain}`;
}

export function didToUrl(did: string): string {
  const parts = did.replace("did:web:", "").split(":");
  const domain = parts[0];
  const path = parts.slice(1).join("/");
  if (!path) return `https://${domain}/.well-known/did.json`;
  return `https://${domain}/${path}/did.json`;
}

export function buildDidDocument(
  did: string,
  publicKeyJwk: JsonWebKey,
  serviceEndpoint?: string
) {
  const doc: any = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    id: did,
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk,
      },
    ],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
  };

  if (serviceEndpoint) {
    doc.service = [
      {
        id: `${did}#icred-profile`,
        type: "IcredProfile",
        serviceEndpoint,
      },
    ];
  }

  return doc;
}

export async function issueVerifiableCredential({
  issuerDid,
  issuerPrivateKey,
  holderDid,
  credentialId,
  credentialSubject,
  domain,
  scope,
  family,
  assuranceLevel,
  issuerName,
  expiresAt,
}: {
  issuerDid: string;
  issuerPrivateKey: Uint8Array;
  holderDid: string;
  credentialId: string;
  credentialSubject: Record<string, any>;
  domain: string;
  scope: string;
  family: string;
  assuranceLevel: string;
  issuerName: string;
  expiresAt?: Date;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const payload: any = {
    iss: issuerDid,
    sub: holderDid,
    nbf: now,
    iat: now,
    jti: credentialId,
    vc: {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://icred.net/contexts/v1",
      ],
      type: ["VerifiableCredential", `Icred${capitalize(family)}`],
      issuer: {
        id: issuerDid,
        name: issuerName,
      },
      credentialSubject: {
        id: holderDid,
        ...credentialSubject,
      },
      icred: {
        assuranceLevel,
        family,
        domain,
        scope,
        verifyUrl: `https://icred.net/verify/${credentialId}`,
      },
    },
  };

  if (expiresAt) {
    payload.exp = Math.floor(expiresAt.getTime() / 1000);
  }

  return signPayload(payload, issuerPrivateKey);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
