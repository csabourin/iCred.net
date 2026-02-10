# icred.net — Spécification technique MVP

## Contraintes de départ

| Paramètre | Valeur |
|---|---|
| Budget | Bootstrap (0 $ idéalement, ~20 $/mois max) |
| Stack | Node.js |
| Plateforme | Replit |
| Développeur | Solo (Christian) |
| Domaine | icred.net (acquis) |

---

## 1. Architecture Replit — Choix réalistes

### 1.1 Plan Replit recommandé

Le **plan Starter (gratuit)** ne permet pas de déployer des apps live ni d'accéder à PostgreSQL. Pour un MVP fonctionnel avec un domaine custom, tu auras besoin du **plan Core à 25 $/mois CAD** (≈20 USD). C'est ton seul coût fixe.

Ce que Core te donne :

- PostgreSQL natif (1,50 $/Go/mois stockage + 0,16 $/h compute — largement suffisant pour un MVP)
- Déploiement live avec domaine custom (icred.net)
- Apps privées
- 4 vCPUs / 8 Go RAM en dev

### 1.2 Architecture mono-Repl

Pour rester simple et déployable, tout vit dans **un seul Repl** :

```
icred-net/
├── src/
│   ├── server.js              # Express entry point
│   ├── config/
│   │   └── index.js           # Env vars, DB config
│   ├── db/
│   │   ├── schema.sql         # DDL PostgreSQL
│   │   └── client.js          # Pool pg
│   ├── crypto/
│   │   ├── keys.js            # Génération/stockage clés Ed25519
│   │   ├── vc-issuer.js       # Émission VC (JWT)
│   │   └── vc-verifier.js     # Vérification VC (JWT)
│   ├── routes/
│   │   ├── auth.js            # Inscription/login (Replit Auth ou custom)
│   │   ├── issuers.js         # CRUD issuers
│   │   ├── credentials.js     # Émission/révocation
│   │   ├── verify.js          # Page publique de vérification
│   │   ├── profile.js         # Profil holder
│   │   └── well-known.js      # /.well-known/did.json
│   ├── middleware/
│   │   ├── auth.js            # Session/JWT middleware
│   │   └── rateLimit.js       # Anti-abus
│   ├── views/                 # Templates EJS (ou HTML statique)
│   │   ├── verify.ejs         # Page publique de vérification
│   │   ├── profile.ejs        # Profil public du holder
│   │   └── issuer-dashboard.ejs
│   └── utils/
│       ├── did-web.js         # Résolution did:web
│       └── status.js          # Bitstring status list
├── public/
│   ├── css/
│   ├── js/
│   └── og-images/             # Images OG générées
├── package.json
├── .replit
└── replit.nix                 # Dépendances système si nécessaire
```

### 1.3 Stack technique détaillée

| Couche | Choix | Justification |
|---|---|---|
| Runtime | Node.js 20+ | Natif Replit, LTS |
| Framework | **Express.js** | Simple, mature, tu connais |
| DB | **PostgreSQL** (Replit natif) | Relationnel, JSONB pour les claims, gratuit sur Replit Core |
| ORM/Query | **pg** (node-postgres) + requêtes SQL | Pas besoin de Prisma/Sequelize pour un MVP |
| Auth | **Replit Auth** (phase 1) → custom JWT (phase 2) | Zéro config au début |
| Templates | **EJS** | Simple, server-rendered, bon pour SEO de la page Verify |
| Crypto (VC) | **did-jwt-vc** + **did-jwt** + **Ed25519** | JWT-based VCs — plus simple que JSON-LD Data Integrity |
| DID | **did:web** (icred.net) | Pas de blockchain, résolution HTTP standard |
| Identité issuer | **did:web:icred.net:issuers:{id}** | Chaque issuer a son propre DID sous ton domaine |
| Rate limiting | **express-rate-limit** | Anti-abus basique |
| Validation | **zod** | Validation de schéma côté serveur |
| CSS | **Pico CSS** ou **Water.css** | Classless CSS, beau par défaut, zéro config |

---

## 2. Schéma de base de données (PostgreSQL)

### 2.1 Tables principales

```sql
-- ============================================
-- icred.net MVP — Schema PostgreSQL
-- ============================================

-- Extension pour UUID et crypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- UTILISATEURS (holders + issuers + admins)
-- ============================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Identité
    pseudonym       VARCHAR(64) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE,          -- optionnel, pour recovery
    password_hash   VARCHAR(255),                  -- bcrypt, null si Replit Auth
    replit_id       VARCHAR(255) UNIQUE,           -- si Replit Auth
    -- DID
    did             VARCHAR(512) UNIQUE NOT NULL,  -- did:web:icred.net:users:{id}
    public_key_jwk  JSONB NOT NULL,                -- Clé publique Ed25519 (JWK)
    -- Métadonnées
    role            VARCHAR(20) DEFAULT 'holder'
                    CHECK (role IN ('holder', 'issuer', 'admin')),
    pseudonym_stable_since TIMESTAMPTZ,            -- date de création du pseudo (A1)
    status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour lookups fréquents
CREATE INDEX idx_users_pseudonym ON users(pseudonym);
CREATE INDEX idx_users_did ON users(did);

-- ============================================
-- ISSUERS (organisations/communautés émettrices)
-- ============================================
CREATE TABLE issuers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Propriétaire (user qui a créé l'issuer)
    owner_id        UUID NOT NULL REFERENCES users(id),
    -- Identité
    name            VARCHAR(255) NOT NULL,
    name_fr         VARCHAR(255),                  -- Nom français (bilingue)
    slug            VARCHAR(128) UNIQUE NOT NULL,   -- URL-friendly
    description     TEXT,
    description_fr  TEXT,
    website         VARCHAR(512),
    -- DID
    did             VARCHAR(512) UNIQUE NOT NULL,   -- did:web:icred.net:issuers:{slug}
    public_key_jwk  JSONB NOT NULL,
    -- Vérification de l'issuer
    verification_status VARCHAR(20) DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
    verification_notes  TEXT,
    verified_at     TIMESTAMPTZ,
    -- Politique
    policy_url      VARCHAR(512),                  -- Lien vers la politique d'émission
    -- Catégories/domaines
    domains         TEXT[] DEFAULT '{}',            -- ex: {'web-development', 'accessibility'}
    -- Anti-abus
    max_credentials_per_day INTEGER DEFAULT 50,
    -- Métadonnées
    status          VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'revoked')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_issuers_slug ON issuers(slug);
CREATE INDEX idx_issuers_did ON issuers(did);
CREATE INDEX idx_issuers_domains ON issuers USING GIN(domains);

-- ============================================
-- CREDENTIAL TYPES (templates de credentials)
-- ============================================
CREATE TABLE credential_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issuer_id       UUID NOT NULL REFERENCES issuers(id),
    -- Définition
    name            VARCHAR(255) NOT NULL,
    name_fr         VARCHAR(255),
    slug            VARCHAR(128) NOT NULL,
    description     TEXT,
    description_fr  TEXT,
    -- Classification (familles A, B, C du design doc)
    family          VARCHAR(20) NOT NULL
        CHECK (family IN ('attestation', 'assessment', 'process')),
    -- Domaine
    domain          VARCHAR(128) NOT NULL,          -- ex: 'web-accessibility'
    scope           VARCHAR(255),                   -- ex: 'WCAG 2.1 AA audits'
    -- Niveau d'assurance par défaut
    default_assurance_level VARCHAR(2) DEFAULT 'A3'
        CHECK (default_assurance_level IN ('A0', 'A1', 'A2', 'A3', 'A4', 'A5')),
    -- Expiration par défaut (en jours, 0 = pas d'expiration)
    default_ttl_days INTEGER DEFAULT 1095,          -- 3 ans par défaut
    -- Schéma des claims (JSON Schema)
    claim_schema    JSONB NOT NULL,
    -- Rubrique (pour assessments)
    rubric          JSONB,                          -- critères d'évaluation
    -- Statut
    status          VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('draft', 'active', 'deprecated')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    -- Un issuer ne peut pas avoir deux types avec le même slug
    UNIQUE (issuer_id, slug)
);

CREATE INDEX idx_credential_types_domain ON credential_types(domain);

-- ============================================
-- CREDENTIALS (les VCs émises)
-- ============================================
CREATE TABLE credentials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Références
    credential_type_id UUID NOT NULL REFERENCES credential_types(id),
    issuer_id       UUID NOT NULL REFERENCES issuers(id),
    holder_id       UUID NOT NULL REFERENCES users(id),
    -- Le VC signé (JWT complet)
    vc_jwt          TEXT NOT NULL,
    -- Claims (dénormalisé pour recherche)
    claims          JSONB NOT NULL,
    -- Niveau d'assurance effectif
    assurance_level VARCHAR(2) NOT NULL
        CHECK (assurance_level IN ('A0', 'A1', 'A2', 'A3', 'A4', 'A5')),
    -- Cycle de vie
    issued_at       TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,                    -- null = pas d'expiration
    revoked_at      TIMESTAMPTZ,
    revocation_reason TEXT,
    -- Visibilité (le holder contrôle)
    is_public       BOOLEAN DEFAULT false,          -- visible sur le profil public
    -- Evidence (preuves soumises, hashées)
    evidence_hashes TEXT[],                         -- SHA-256 des documents soumis
    -- Statut
    status          VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'revoked', 'expired', 'suspended')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credentials_holder ON credentials(holder_id);
CREATE INDEX idx_credentials_issuer ON credentials(issuer_id);
CREATE INDEX idx_credentials_status ON credentials(status);
CREATE INDEX idx_credentials_domain ON credentials
    USING GIN (claims jsonb_path_ops);

-- ============================================
-- CREDENTIAL STATUS LIST (Bitstring Status List W3C)
-- ============================================
CREATE TABLE status_lists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issuer_id       UUID NOT NULL REFERENCES issuers(id),
    -- Bitstring encodée (base64)
    encoded_list    TEXT NOT NULL,
    -- Taille de la liste
    list_size       INTEGER DEFAULT 131072,         -- 16 Ko = 131072 bits
    -- Index du prochain bit disponible
    next_index      INTEGER DEFAULT 0,
    -- Métadonnées
    purpose         VARCHAR(20) DEFAULT 'revocation'
        CHECK (purpose IN ('revocation', 'suspension')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTESTATIONS
-- ============================================
CREATE TABLE disputes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id   UUID NOT NULL REFERENCES credentials(id),
    -- Qui conteste
    reporter_id     UUID REFERENCES users(id),     -- null si anonyme
    reporter_email  VARCHAR(255),                   -- si pas inscrit
    -- Détails
    category        VARCHAR(30) NOT NULL
        CHECK (category IN ('fraud', 'impersonation', 'issuer_compromised',
                            'factual_error', 'expired_competence', 'other')),
    description     TEXT NOT NULL,
    evidence_urls   TEXT[],
    -- Résolution
    status          VARCHAR(20) DEFAULT 'open'
        CHECK (status IN ('open', 'under_review', 'resolved_upheld',
                          'resolved_dismissed', 'resolved_revoked')),
    resolution_notes TEXT,
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    -- Deadlines
    response_deadline TIMESTAMPTZ,                  -- 14 jours après ouverture
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_credential ON disputes(credential_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ============================================
-- AUDIT LOG (transparence)
-- ============================================
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    -- Qui
    actor_id        UUID REFERENCES users(id),
    actor_type      VARCHAR(20) NOT NULL
        CHECK (actor_type IN ('user', 'issuer', 'admin', 'system')),
    -- Quoi
    action          VARCHAR(50) NOT NULL,
    resource_type   VARCHAR(30) NOT NULL,
    resource_id     UUID,
    -- Détails
    details         JSONB,
    ip_hash         VARCHAR(64),                    -- SHA-256 de l'IP (privacy)
    -- Quand
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ============================================
-- VUES UTILES
-- ============================================

-- Profil public d'un holder (credentials visibles)
CREATE VIEW public_profile AS
SELECT
    u.pseudonym,
    u.pseudonym_stable_since,
    c.id AS credential_id,
    ct.name AS credential_name,
    ct.name_fr AS credential_name_fr,
    ct.family,
    ct.domain,
    ct.scope,
    c.assurance_level,
    c.claims,
    c.issued_at,
    c.expires_at,
    c.status,
    i.name AS issuer_name,
    i.slug AS issuer_slug,
    i.verification_status AS issuer_verification
FROM credentials c
JOIN users u ON c.holder_id = u.id
JOIN credential_types ct ON c.credential_type_id = ct.id
JOIN issuers i ON c.issuer_id = i.id
WHERE c.is_public = true
  AND c.status = 'active'
  AND u.status = 'active';
```

### 2.2 Notes sur le schéma

**Pourquoi JSONB pour les claims :** Chaque type de credential a des claims différents. Plutôt que de créer une table par type, JSONB permet de stocker des structures variées tout en gardant la capacité de recherche (GIN index). Le `claim_schema` dans `credential_types` définit la structure attendue (validée par Zod côté serveur).

**Pourquoi pas de table `wallets` ou `presentations` au MVP :** On garde ça pour la phase 2. Au MVP, le holder a un profil avec ses credentials visibles. Les Verifiable Presentations seront ajoutées quand on implémentera OpenID4VP.

**Bitstring Status List :** Conforme au standard W3C Bitstring Status List v1.0. Chaque credential pointe vers un index dans une bitstring. Pour vérifier la révocation, le vérifieur consulte la bitstring à l'endpoint public — sans savoir quelles autres credentials existent.

---

## 3. Système d'identité : did:web

### 3.1 Pourquoi did:web

`did:web` est la méthode DID la plus pragmatique pour un MVP :
- Aucune blockchain requise
- Résolution par simple HTTP GET
- Tu contrôles la résolution via ton domaine
- Supporté par toutes les librairies VC majeures

### 3.2 Structure des DIDs

```
did:web:icred.net                           → L'organisation icred.net elle-même
did:web:icred.net:issuers:acme-corp         → Un issuer
did:web:icred.net:users:a1b2c3d4            → Un holder (UUID tronqué)
```

### 3.3 DID Document (exemple)

Endpoint : `https://icred.net/.well-known/did.json` (pour did:web:icred.net)
Endpoint : `https://icred.net/issuers/acme-corp/did.json` (pour did:web:icred.net:issuers:acme-corp)

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "id": "did:web:icred.net:issuers:acme-corp",
  "authentication": [{
    "id": "did:web:icred.net:issuers:acme-corp#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:web:icred.net:issuers:acme-corp",
    "publicKeyMultibase": "z6Mkf5r..."
  }],
  "assertionMethod": [{
    "id": "did:web:icred.net:issuers:acme-corp#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:web:icred.net:issuers:acme-corp",
    "publicKeyMultibase": "z6Mkf5r..."
  }],
  "service": [{
    "id": "did:web:icred.net:issuers:acme-corp#icred-profile",
    "type": "IcredIssuerProfile",
    "serviceEndpoint": "https://icred.net/issuers/acme-corp"
  }]
}
```

---

## 4. Flux de credentials (JWT-based VC)

### 4.1 Pourquoi JWT plutôt que JSON-LD Data Integrity

| Critère | JWT (did-jwt-vc) | JSON-LD DI (digitalbazaar/vc) |
|---|---|---|
| Complexité | Faible — format JWT standard | Élevée — JSON-LD, contexts, documentLoader |
| Librairies Node.js | `did-jwt-vc`, `did-jwt` — matures, simples | `@digitalbazaar/vc` — plus complexe |
| Vérification client-side | Oui (n'importe quel décodeur JWT) | Nécessite résolution de contexts |
| Selective disclosure | SD-JWT (standard IETF) | BBS+ (plus avancé mais plus complexe) |
| Interopérabilité | Large (JOSE/COSE est un W3C Rec pour VC 2.0) | Large aussi |
| **Verdict MVP** | **✅ Choix recommandé** | Phase 2-3 |

### 4.2 Format d'une credential icred.net (JWT décodé)

```json
{
  "iss": "did:web:icred.net:issuers:a11y-guild",
  "sub": "did:web:icred.net:users:c3d4e5f6",
  "nbf": 1739145600,
  "exp": 1833840000,
  "vc": {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://icred.net/contexts/v1"
    ],
    "type": ["VerifiableCredential", "IcredAttestation"],
    "issuer": {
      "id": "did:web:icred.net:issuers:a11y-guild",
      "name": "Accessibility Guild"
    },
    "credentialSubject": {
      "id": "did:web:icred.net:users:c3d4e5f6",
      "pseudonym": "@a11y-christian",
      "domain": "web-accessibility",
      "scope": "WCAG 2.1 AA audits",
      "claims": {
        "role": "Membre actif",
        "since": "2024-03-15",
        "specialization": "Audit WCAG — sites gouvernementaux bilingues"
      }
    },
    "credentialSchema": {
      "id": "https://icred.net/schemas/attestation-v1.json",
      "type": "JsonSchema"
    },
    "credentialStatus": {
      "id": "https://icred.net/status/a11y-guild/1#42",
      "type": "BitstringStatusListEntry",
      "statusPurpose": "revocation",
      "statusListIndex": "42",
      "statusListCredential": "https://icred.net/status/a11y-guild/1"
    },
    "icred": {
      "assuranceLevel": "A3",
      "family": "attestation",
      "verifyUrl": "https://icred.net/verify/c3d4e5f6/a1b2c3"
    }
  }
}
```

### 4.3 Dépendances npm pour le MVP crypto

```json
{
  "dependencies": {
    "did-jwt": "^8.0.0",
    "did-jwt-vc": "^4.0.0",
    "did-resolver": "^4.1.0",
    "web-did-resolver": "^2.0.0",
    "@noble/ed25519": "^2.0.0",
    "uint8arrays": "^5.0.0",
    "multiformats": "^13.0.0"
  }
}
```

### 4.4 Code — Émission d'une credential (simplifié)

```javascript
// src/crypto/vc-issuer.js
import { createVerifiableCredentialJwt } from 'did-jwt-vc';
import { EdDSASigner } from 'did-jwt';

export async function issueCredential({ issuerDid, issuerPrivateKey, holderDid, credentialPayload, expiresAt }) {
  
  const signer = EdDSASigner(issuerPrivateKey); // Uint8Array de la clé privée
  
  const issuer = {
    did: issuerDid,
    signer,
    alg: 'EdDSA'
  };

  const vcPayload = {
    sub: holderDid,
    nbf: Math.floor(Date.now() / 1000),
    exp: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : undefined,
    vc: {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://icred.net/contexts/v1'
      ],
      type: ['VerifiableCredential', 'IcredAttestation'],
      credentialSubject: {
        id: holderDid,
        ...credentialPayload
      }
    }
  };

  const vcJwt = await createVerifiableCredentialJwt(vcPayload, issuer);
  return vcJwt;
}
```

### 4.5 Code — Vérification d'une credential

```javascript
// src/crypto/vc-verifier.js
import { verifyCredential } from 'did-jwt-vc';
import { Resolver } from 'did-resolver';
import { getResolver as getWebResolver } from 'web-did-resolver';

const resolver = new Resolver({
  ...getWebResolver()
});

export async function verifyVC(vcJwt) {
  try {
    const result = await verifyCredential(vcJwt, resolver);
    
    // Vérifier la révocation (bitstring status list)
    if (result.verifiableCredential.credentialStatus) {
      const isRevoked = await checkRevocationStatus(
        result.verifiableCredential.credentialStatus
      );
      if (isRevoked) {
        return { valid: false, reason: 'revoked' };
      }
    }

    return {
      valid: true,
      credential: result.verifiableCredential,
      issuer: result.issuer,
      payload: result.payload
    };
  } catch (error) {
    return { valid: false, reason: error.message };
  }
}

async function checkRevocationStatus(credentialStatus) {
  const response = await fetch(credentialStatus.statusListCredential);
  const statusListVC = await response.json();
  // Décoder la bitstring et vérifier l'index
  const index = parseInt(credentialStatus.statusListIndex);
  const bitstring = decodeBitstring(statusListVC.credentialSubject.encodedList);
  return bitstring[index] === 1;
}
```

---

## 5. API Endpoints

### 5.1 Routes publiques (aucune auth)

```
GET  /                                  → Landing page
GET  /verify/:credentialId              → Page de vérification publique
GET  /profile/:pseudonym                → Profil public du holder
GET  /issuers/:slug                     → Page publique de l'issuer
GET  /issuers/:slug/did.json            → DID Document de l'issuer
GET  /users/:id/did.json                → DID Document du holder
GET  /.well-known/did.json              → DID Document d'icred.net
GET  /status/:issuerSlug/:listId        → Bitstring Status List (revocation)
GET  /api/v1/verify/:credentialId       → API JSON de vérification
GET  /schemas/:schemaId.json            → JSON Schemas des credential types
```

### 5.2 Routes authentifiées — Holder

```
GET    /dashboard                       → Tableau de bord du holder
GET    /dashboard/credentials           → Mes credentials
PATCH  /dashboard/credentials/:id       → Toggle visibilité publique
GET    /dashboard/profile               → Éditer mon profil
PATCH  /dashboard/profile               → Sauvegarder profil
POST   /dashboard/disputes              → Soumettre une contestation
```

### 5.3 Routes authentifiées — Issuer

```
GET    /issuer-dashboard                       → Tableau de bord issuer
POST   /issuer-dashboard/credential-types      → Créer un type de credential
GET    /issuer-dashboard/credential-types       → Lister mes types
PATCH  /issuer-dashboard/credential-types/:id   → Modifier un type
POST   /issuer-dashboard/credentials/issue     → Émettre une credential
POST   /issuer-dashboard/credentials/:id/revoke → Révoquer une credential
GET    /issuer-dashboard/credentials            → Lister les credentials émises
```

### 5.4 Routes authentifiées — Admin

```
GET    /admin/issuers                   → Lister les demandes d'issuers
PATCH  /admin/issuers/:id/verify        → Approuver/rejeter un issuer
GET    /admin/disputes                  → Lister les contestations
PATCH  /admin/disputes/:id/resolve      → Résoudre une contestation
GET    /admin/audit                     → Consulter l'audit log
GET    /admin/stats                     → Statistiques globales
```

### 5.5 Réponse type — API de vérification

```
GET /api/v1/verify/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

```json
{
  "valid": true,
  "credential": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "holder": {
      "pseudonym": "@a11y-christian",
      "pseudonymStableSince": "2024-09-01T00:00:00Z",
      "pseudonymAge": "17 mois"
    },
    "domain": "web-accessibility",
    "scope": "WCAG 2.1 AA audits",
    "family": "attestation",
    "assuranceLevel": "A3",
    "claims": {
      "role": "Membre actif",
      "since": "2024-03-15",
      "specialization": "Audit WCAG — sites gouvernementaux bilingues"
    },
    "issuer": {
      "name": "Accessibility Guild",
      "slug": "a11y-guild",
      "verificationStatus": "verified"
    },
    "issuedAt": "2026-02-10T12:00:00Z",
    "expiresAt": "2029-02-10T12:00:00Z",
    "status": "active",
    "verifyUrl": "https://icred.net/verify/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  },
  "verification": {
    "signatureValid": true,
    "issuerDid": "did:web:icred.net:issuers:a11y-guild",
    "revocationChecked": true,
    "revoked": false,
    "expired": false,
    "checkedAt": "2026-02-10T15:30:00Z"
  }
}
```

---

## 6. Page Verify — UX en 10 secondes

### 6.1 Wireframe textuel

```
┌──────────────────────────────────────────────────┐
│  🔒 icred.net/verify/a1b2c3                      │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │  ✅ CREDENTIAL VALIDE                       │  │
│  │  Vérifiée le 10 fév. 2026 à 15:30 UTC      │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  QUI                                              │
│  @a11y-christian                                  │
│  Pseudonyme stable depuis 17 mois (A1)            │
│                                                   │
│  QUOI                                             │
│  Domaine : Accessibilité web                      │
│  Scope : Audits WCAG 2.1 AA                       │
│                                                   │
│  CLAIMS                                           │
│  ● Membre actif depuis mars 2024                  │
│  ● Spécialisation : sites gouv. bilingues         │
│  Niveau d'assurance : A3 (attesté par un issuer)  │
│                                                   │
│  ÉMIS PAR                                         │
│  🏢 Accessibility Guild (✓ issuer vérifié)        │
│  Émis le 10 fév. 2026 · Expire le 10 fév. 2029   │
│                                                   │
│  ─────────────────────────────────────────────    │
│  ℹ️ Que signifient ces niveaux?  [A0–A5 ▼]       │
│  ⚠️ Contester cette credential  [Signaler]        │
│                                                   │
│  Vérifié cryptographiquement par icred.net        │
│  Signature EdDSA · did:web:icred.net:issuers:...  │
└──────────────────────────────────────────────────┘
```

### 6.2 Balises OG (partage social)

```html
<meta property="og:title" content="✅ @a11y-christian — Accessibilité web (A3)" />
<meta property="og:description" content="Attesté par Accessibility Guild · Audits WCAG 2.1 AA · Valide jusqu'en 2029" />
<meta property="og:image" content="https://icred.net/og/a1b2c3d4.png" />
<meta property="og:url" content="https://icred.net/verify/a1b2c3d4" />
<meta property="og:type" content="profile" />
```

---

## 7. Sécurité et anti-abus (MVP)

### 7.1 Mesures immédiates

| Menace | Mitigation |
|---|---|
| Brute force | express-rate-limit : 100 req/15min par IP |
| Sybil (faux comptes) | Rate limit création : 3 comptes/IP/jour + email optionnel pour recovery |
| Spam d'issuers | Approbation manuelle (toi en admin) |
| Credential forgery | Signature Ed25519 + vérification DID |
| XSS | Helmet.js + CSP strict + sanitization EJS |
| SQL injection | Requêtes paramétrées (pg) + Zod validation |
| CSRF | Token CSRF sur tous les formulaires POST |
| Secrets | Variables d'environnement Replit Secrets |

### 7.2 Stockage des clés privées

**Phase MVP :** Les clés privées des issuers sont stockées **chiffrées** dans la DB (colonne JSONB chiffrée avec une clé maître dans Replit Secrets). C'est acceptable pour un MVP mais **pas** pour la production.

**Phase 2 :** Migration vers un KMS (Key Management Service) externe, par exemple Hashicorp Vault (gratuit, self-hosted) ou un service cloud.

---

## 8. Conformité Loi 25 (Québec) — Minimum viable

### 8.1 Actions MVP obligatoires

1. **Politique de confidentialité** publiée sur icred.net/privacy (FR + EN)
2. **Consentement explicite** au moment de l'inscription (pas de case pré-cochée)
3. **Droit d'accès** : endpoint GET /dashboard/export (JSON de toutes les données personnelles)
4. **Droit de suppression** : endpoint DELETE /dashboard/account (anonymisation, pas suppression hard des credentials — la signature reste vérifiable mais le lien holder→identité est rompu)
5. **Responsable** : toi, Christian, nommé responsable de la protection des renseignements personnels (RPRP)
6. **Registre des incidents** : table `security_incidents` dans la DB

### 8.2 Ce qui peut attendre (mais pas trop)

- EFVP formelle (dès que tu as des vrais utilisateurs)
- Politique de rétention des données
- Procédure de notification de brèche (72h selon Loi 25)

---

## 9. Roadmap révisée pour Replit solo

### Phase 0 — Fondations (2–3 semaines)

- [ ] Setup Repl : Node.js + Express + PostgreSQL
- [ ] Schema DB (le SQL ci-dessus)
- [ ] Système de clés Ed25519 (génération, stockage)
- [ ] did:web resolution (/.well-known/did.json + /issuers/:slug/did.json)
- [ ] Auth basique (Replit Auth ou email/password avec bcrypt)
- [ ] Landing page + page « À propos / Niveaux d'assurance »

### Phase 1 — Attestation MVP (3–4 semaines)

- [ ] CRUD Issuers (inscription + approbation admin manuelle)
- [ ] CRUD Credential Types
- [ ] Émission de credentials (VC JWT signé)
- [ ] Page Verify publique (SSR avec EJS)
- [ ] Profil public du holder
- [ ] Bitstring Status List (révocation)
- [ ] API de vérification (JSON)
- [ ] Balises OG pour le partage
- [ ] Rate limiting + Helmet

### Phase 2 — Polish + Contestation (2–3 semaines)

- [ ] Système de contestation (formulaire + workflow admin)
- [ ] Dashboard holder (voir mes credentials, toggle visibilité)
- [ ] Dashboard issuer (émettre, révoquer, voir stats)
- [ ] Audit log
- [ ] Export données personnelles (Loi 25)
- [ ] Politique de confidentialité
- [ ] Tests automatisés (au moins les routes critiques)

### Phase 3 — Premier pilote

- [ ] Recruter 2–3 issuers pilotes
- [ ] Documenter l'onboarding issuer
- [ ] Publier la charte multi-voies
- [ ] Feedback loop → itération

---

## 10. Coûts estimés (mensuel)

| Poste | Coût |
|---|---|
| Replit Core | ~25 $ CAD/mois |
| Domaine icred.net | ~15 $ CAD/an (déjà payé) |
| PostgreSQL (Replit) | Inclus dans Core (< 1 Go) |
| Email transactionnel | Gratuit (Resend : 3000 emails/mois gratuits) |
| SSL | Inclus (Replit gère) |
| **Total** | **~25 $ CAD/mois** |

---

## 11. Librairies npm — package.json MVP

```json
{
  "name": "icred-net",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "db:migrate": "node src/db/migrate.js",
    "test": "node --test src/**/*.test.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "pg": "^8.13.0",
    "ejs": "^3.1.10",
    "bcrypt": "^5.1.1",
    "did-jwt": "^8.0.0",
    "did-jwt-vc": "^4.0.0",
    "did-resolver": "^4.1.0",
    "web-did-resolver": "^2.0.0",
    "@noble/ed25519": "^2.0.0",
    "uint8arrays": "^5.0.0",
    "zod": "^3.23.0",
    "helmet": "^8.0.0",
    "express-rate-limit": "^7.4.0",
    "cookie-session": "^2.1.0",
    "csurf": "^1.11.0",
    "pino": "^9.0.0"
  },
  "devDependencies": {
    "pino-pretty": "^11.0.0"
  }
}
```

---

## 12. Décisions architecturales documentées (ADR)

### ADR-001 : JWT plutôt que JSON-LD Data Integrity pour le MVP
**Contexte :** Deux formats de preuve sont supportés par VC 2.0.
**Décision :** JWT (JOSE/COSE) pour la simplicité, la maturité des outils Node.js, et la facilité de vérification.
**Conséquence :** On pourra ajouter le support Data Integrity en phase 3 pour les cas d'usage avancés (selective disclosure BBS+).

### ADR-002 : did:web plutôt que did:key ou did:ethr
**Contexte :** Plusieurs méthodes DID existent.
**Décision :** did:web car résolution HTTP pure, pas de blockchain, et icred.net contrôle le domaine.
**Risque accepté :** did:web dépend de la disponibilité du serveur. Si icred.net tombe, les DIDs ne résolvent plus.
**Mitigation :** Cache côté vérifieur + statut HTTP 304 + headers Cache-Control.

### ADR-003 : PostgreSQL plutôt que SQLite
**Contexte :** Replit offre les deux.
**Décision :** PostgreSQL pour le JSONB (claims), les arrays (domains, evidence_hashes), les index GIN, et la scalabilité future.

### ADR-004 : Server-side rendering (EJS) plutôt que SPA
**Contexte :** La page Verify doit être indexable et partageable (OG tags).
**Décision :** SSR avec EJS pour le MVP. Les dashboards pourraient migrer vers un SPA (React/Vue) plus tard si la complexité le justifie.

### ADR-005 : Approbation manuelle des issuers
**Contexte :** Le bootstrapping de confiance est critique.
**Décision :** Chaque issuer est approuvé manuellement par l'admin (toi) au MVP. Ça ne scale pas, mais ça garantit la qualité initiale et c'est un feature, pas un bug — « curated trust list ».

---

*Document généré le 10 février 2026 — icred.net MVP v0.1*
