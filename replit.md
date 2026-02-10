# icred.net - Verifiable Credibility Hub

## Overview
A privacy-first platform where anyone (even under a pseudonym) can present cryptographically verifiable proof of expertise with minimal disclosure. Built on concepts from W3C Verifiable Credentials, Open Badges 3.0, and OpenID4VP/VCI.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui components
- **Backend**: Express.js with REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)
- **State Management**: TanStack Query v5

## Key Concepts
- **Issuers**: Organizations that attest credentials
- **Holders**: Users with stable pseudonyms who collect credentials
- **Credentials**: Verifiable claims with assurance levels (A0-A5)
- **Assurance Levels**: A0 (self-declared) through A5 (minimal disclosure)
- **Proof Paths**: institutional, community, portfolio, assessment, methodology
- **Credential Types**: attestation, assessment (demonstrated skill), process (rigor & method)

## Pages
- `/` - Landing page with hero, how it works, assurance levels, proof paths
- `/registry` - Issuer registry with search/filter
- `/verify` - Credential verification lookup
- `/verify/:id` - Credential detail verification view
- `/holder/:pseudonym` - Holder profile with all credentials

## API Endpoints
- `GET /api/issuers` - List all issuers
- `GET /api/issuers/:id` - Get single issuer
- `GET /api/holders/:pseudonym` - Get holder profile + credentials
- `GET /api/verify/:id` - Verify a credential (returns credential + holder + issuer)

## Database Schema
- `issuers` - id, name, slug, description, category, website, logoUrl, status, verifiedAt
- `holders` - id, pseudonym, displayName, bio, avatarUrl, stableSince
- `credentials` - id, holderId, issuerId, type, domain, scope, claims (jsonb), assuranceLevel, proofPath, status, issuedAt, expiresAt, evidence, signature

## Seed Data
- 4 issuers across web dev, cybersecurity, education, CMS
- 3 holders: web_auditor, sec_researcher, craft_dev
- 7 credentials with various assurance levels and proof paths

## User Preferences
- Dark mode support with theme toggle
- Inter font for body, Source Serif 4 for serif, JetBrains Mono for code
