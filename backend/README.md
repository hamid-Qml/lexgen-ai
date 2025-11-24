# Lexy – Backend README (Work-in-Progress)

## Overview
Lexy is an AI-powered contract generation platform focused on Australian law.  
Users can onboard with their business details, choose from 170+ contract templates, answer dynamic hybrid questions (form + chat), and generate AI-assisted contracts with precedent-backed RAG retrieval.

This README summarizes what is implemented so far.

---

## Current Backend Structure (NestJS + TypeORM)

### Modules Implemented
- **AuthModule**
- **MailerModule**
- **BillingModule (Stripe)** – previously named SubscriptionsModule
- **ContractCatalogModule**
- **ContractsModule**
- **Onboarding support (via User fields)**

These modules provide authentication, billing initialization, contract catalog browsing, contract draft creation, and preliminary onboarding.

---

## 1. Authentication System

### Features Implemented
- Email/password signup
- Login
- JWT-based sessions
- Protected routes using AuthGuard('jwt')
- Forgot password (6-digit code via email)
- Reset password endpoint
- `auth.config.ts` and config validation
- Strong bcrypt hashing (`bcryptSaltRounds`)
- Access token generation

### Endpoints
- POST /auth/signup
- POST /auth/login
- GET /auth/me
- POST /auth/forgot-password
- POST /auth/reset-password?email=

Auth is fully functional and production-grade.

---

## 2. Mailer System (Resend)

### Completed
- Integrated Resend API
- System configuration via `mail.config.ts`
- Fully redesigned password reset email using **Lexy branding**
- Styled, responsive HTML email template
- Fallback plaintext
- Logging + error handling

### Pending
- “Share Contract” email not required for now (paused)

---

## 3. Billing System (Stripe Subscription Flow)

### Features Implemented
- Stripe SDK setup with configurable API version
- Stripe customer creation
- Stripe Checkout session creation (subscription mode)
- Billing Portal session creation
- Webhook handling:
  - checkout.session.completed
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
- Upserting subscription records to DB
- Linking Stripe subscription → internal subscription model
- Support for different plan tiers (Free, Pro, Business, Enterprise)
- Config validation for required price IDs

### Billing Endpoints
- GET /billing/me
- POST /billing/checkout-session
- GET /billing/portal
- POST /billing/webhook

Billing module follows the same structure as your previous production app, tailored for Lexy.

---

## 4. Contract Catalog Module

### Entities Implemented
#### ContractType
- slug
- name
- category (commercial, employment, technology, family_law)
- description
- complexityLevel (basic, standard, complex)
- jurisdictionDefault
- isActive
- Relations:
  - questionTemplates (1 → many)
  - precedents (1 → many)
  - drafts (1 → many)

#### ContractQuestionTemplate
- order
- questionKey
- label
- description
- inputType
- options (json)
- isRequired
- complexityLevel
- ManyToOne → ContractType

#### PrecedentDocument
- title
- contractType (nullable)
- category
- jurisdiction
- sourcePath
- embeddingVector (json)
- keywords[]
- createdAt

### Services Implemented
- Search contract types with query + category filters
- Find contract type by slug
- Filtering only active contract types
- Automatically return items sorted alphabetically

The catalog structure is now ready for seed data (contract types + question templates + precedents).

---

## 5. Contract Drafts Module (Foundational Setup)

### Entity Implemented
ContractDraft:
- user
- contractType
- title
- status (in_progress, ready_for_review, finalized)
- jurisdiction
- questionnaireState (jsonb)
- aiInputs (jsonb)
- aiDraftText
- aiRevisionNotes
- version
- created_at, updated_at

### Services Implemented
- Create a new draft for a given contract type
- Basic retrieval of draft by ID

### Pending (Future)
- Attach chat messages to drafts
- AI generation + self-critique flow
- Update draft answers
- Export DOCX/PDF

The foundation is complete; AI and export will be added later.

---

## 6. Onboarding (Initial Implementation)

Onboarding is supported through additional fields on the User entity:
- companyName
- primaryJurisdiction
- preferredCategories
- industry
- optional ABN/ACN
- subscriptionTier defaults to free

APIs for a dedicated Onboarding endpoint are planned but basic data structure already exists.

---

## 7. Global Config / Validation

- Fully implemented `config.validation.ts` with Joi
- Secrets validated:
  - JWT_SECRET
  - Stripe secrets + price IDs
  - Resend email config
  - Database URL
  - App base URL

Environment management is production-ready.

---

## 8. Entity Fixes & Relationship Mapping (Completed)

All necessary relations are now implemented:

- ContractType → questionTemplates
- ContractType → precedents
- ContractType → drafts
- PrecedentDocument → contractType
- ContractQuestionTemplate → contractType
- ContractDraft → user + contractType

These fixes removed errors like:
- Property ‘questionTemplates’ does not exist on type ContractType
- Property ‘precedents’ does not exist
- Query error: is_active vs isActive mismatch

Everything compiles without errors.

---

## 9. What’s Next (Planned Work)

### High Priority
- Onboarding API endpoints
- Contract creation wizard APIs
- Chat + form hybrid interaction backend
- AI generation pipeline (multi-stage + RAG)
- DOCX & PDF export

### Medium Priority
- Seed scripts for:
  - 30–40 contract types
  - 8–25 dynamic questions per type
  - Precedent mapping
- RAG embedding pipeline

### Low Priority
- Shared contract folders
- Team/enterprise roles

---

## Summary
The backend now has a **solid foundation** with:

- Full authentication
- Full password reset email system
- Full Stripe subscription module
- Contract catalog system with correct entity relationships
- Contract draft entity + basic creation logic
- Clean config validation
- All error-prone relationship issues resolved

The next stage is adding onboarding, contract creation flows, AI generation, and final export features.

---

## Author
Backend setup prepared for the Lexy contract generation platform.
