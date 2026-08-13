# Klyro Architecture & Design Specification (Milestones 1, 2 & 3)

This document provides a comprehensive breakdown of the platform architecture, multi-tenancy model, RBAC permission hierarchy, authentication lifecycle, API response contracts, and database schema scoping.

---

## 1. Architectural Philosophy & Vertical Neutrality

Klyro is engineered from day one as a vertical-neutral SaaS platform. While **Klyro Gym** is the primary vertical delivered, the platform primitives (`User`, `Organization`, `Branch`, `Role`, `Permission`, `Customer`, `MembershipPlan`, `CustomerMembership`, `Subscription`, `Invoice`, `Payment`) preserve vertical neutrality at the core.

Future verticals (**Klyro Salon**, **Klyro Studio**, **Klyro Academy**) re-use the core authentication, multi-tenancy guards, customer directory structure, subscription entitlement engine, and RBAC matrix.

```
                  ┌─────────────────────────────────────┐
                  │          Platform Core              │
                  │ (Auth, Tenant Context, RBAC, Users) │
                  └──────────────────┬──────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
   ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
   │  Klyro Gym    │         │  Klyro Salon  │         │ Klyro Studio  │
   │  (Vertical)   │         │  (Vertical)   │         │  (Vertical)   │
   └───────────────┘         └───────────────┘         └───────────────┘
```

---

## 2. Financial Architecture Domain Isolation Rule

Milestone 3 enforces strict domain separation between **Klyro SaaS Subscription Billing** and **Gym Member Billing**:

```
DOMAIN A: KLYRO SAAS BILLING              DOMAIN B: GYM MEMBER BILLING
Organization                              Organization
  │                                         │
  ▼                                         ▼
Subscription                              Customer
  │                                         │
  ▼                                         ▼
SubscriptionPayment                       CustomerMembership
  │                                         │
  ▼                                         ▼
SubscriptionMandate                       Invoice (INV-1001)
                                            │
                                            ▼
                                          Payment (Cash, UPI, Card)
```

- A gym member payment is **NEVER** interpreted as payment toward a Klyro subscription.
- A Klyro subscription payment is **NEVER** counted toward gym revenue.

---

## 3. Data Models & Schemas

### 3.1 Domain A: Subscription Billing Collections
- `subscriptionPlans`: `name`, `code` (`STARTER`, `GROWTH`, `PRO`), `monthlyPrice`, `currency`, `memberLimit`, `features`, `status`.
- `subscriptions`: `organizationId`, `subscriptionPlanId`, `status` (`TRIAL`, `PENDING_PAYMENT`, `PENDING_AUTOPAY`, `ACTIVE`, `PAST_DUE`, `PAUSED`, `CANCELLED`, `EXPIRED`), `startedAt`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `provider`, `providerSubscriptionId`, `amount`, `gracePeriodEndsAt`.
- `subscriptionPayments`: `organizationId`, `subscriptionId`, `amount`, `currency`, `status` (`PENDING`, `SUCCESS`, `FAILED`), `method`, `provider`, `providerPaymentId`, `providerOrderId`, `paidAt`.
- `subscriptionMandates`: `organizationId`, `subscriptionId`, `provider`, `providerMandateId`, `method` (`UPI_AUTOPAY`, `CARD`, `EMANDATE`), `status` (`PENDING`, `ACTIVE`, `FAILED`, `CANCELLED`), `activatedAt`.

### 3.2 Domain B: Gym Member Billing Collections
- `invoices`: `organizationId`, `branchId`, `customerId`, `membershipId`, `invoiceNumber` (Atomic sequence `INV-1001`), `subtotal`, `totalAmount`, `status` (`OPEN`, `PARTIALLY_PAID`, `PAID`, `VOID`), `source` (`MEMBERSHIP`), `issuedAt`, `dueAt`.
- `payments`: `organizationId`, `branchId`, `customerId`, `invoiceId`, `membershipId`, `amount`, `method` (`CASH`, `UPI`, `CARD`, `BANK_TRANSFER`, `OTHER`), `status` (`SUCCESS`, `REFUNDED`), `reference`, `notes`, `paidAt`, `recordedBy`.
- `counters`: Atomic tenant sequence tracking for concurrency-safe invoice numbering.

---

## 4. RBAC Permission Matrix

| Permission | OWNER | MANAGER | STAFF | TRAINER | MEMBER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `subscription:read` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `subscription:manage` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `invoice:read` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `invoice:create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `invoice:update` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `payment:read` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `payment:create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `payment:refund` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `financial_summary:read` | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 5. Milestone 3 Financial Workflow Rules

1. **Membership / Invoice Separation**: Assigning a customer membership (`POST /api/v1/memberships`) creates ONLY the `CustomerMembership` record. **Membership assignment does NOT automatically create an invoice.**
2. **Explicit Invoice Creation**: Invoices are created as an explicit owner/manager business action via `POST /api/v1/invoices`. An invoice can optionally reference a `membershipId` (`source = MEMBERSHIP`) or exist independently (`source = OTHER`).
3. **Independent Amount Rules**: The invoice amount is authoritative and stored independently. Subtotal, discount amount, and total amount are explicitly set upon invoice creation, allowing negotiated rates, discounts, or complimentary access without altering plan price defaults.
4. **Customer-Centric Payment Workflow**: The primary payment workflow originates from `/customers/[id]`. Owners can click **[ Create Invoice ]** (preselecting customer and active membership) or **[ Record Payment ]** (preselecting customer, invoice, and remaining outstanding balance).
5. **Strict Payment Ownership Validation**: Backend verifies `Invoice.organizationId == tenantContext.organizationId`, `Customer.organizationId == tenantContext.organizationId`, `Invoice.customerId == payment.customerId`, and `Invoice.membershipId == payment.membershipId`.
6. **Overpayment Protection**: Server-side calculation engine rejects overpayments exceeding remaining invoice balance with `400 Bad Request`. Partial payments transition status to `PARTIALLY_PAID`, full payments to `PAID`.
7. **Refund Balance Restoration**: Refunding a payment marks it `REFUNDED` and restores the invoice's outstanding balance and status (`OPEN` or `PARTIALLY_PAID`). Refunded payments are excluded from `totalCollected` in `GET /api/v1/financial-summary`.
8. **Idempotent Invoice Backfill Script**: `npm run backfill:invoices --workspace=api` remains available for legacy data migration where explicit invoice generation is desired.
