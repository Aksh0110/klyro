# Klyro Architecture & Design Specification (Milestones 1, 2, 3 & 4)

This document provides a comprehensive breakdown of the platform architecture, multi-tenancy model, RBAC permission hierarchy, authentication lifecycle, API response contracts, database schema scoping, and GPS self check-in operations.

---

## 1. Architectural Philosophy & Vertical Neutrality

Klyro is engineered from day one as a vertical-neutral SaaS platform. While **Klyro Gym** is the primary vertical delivered, the platform primitives (`User`, `Organization`, `Branch`, `Role`, `Permission`, `Customer`, `MembershipPlan`, `CustomerMembership`, `Subscription`, `Invoice`, `Payment`, `Attendance`) preserve vertical neutrality at the core.

Future verticals (**Klyro Salon**, **Klyro Studio**, **Klyro Academy**) re-use the core authentication, multi-tenancy guards, customer directory structure, subscription entitlement engine, attendance engine, and RBAC matrix.

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

### 3.3 Milestone 4: Daily Operations & GPS Attendance Collections
- `branches`: Extended with `location` (`latitude`, `longitude`) and `settings` (`memberSelfCheckInEnabled` default `false`, `selfCheckInRadiusMeters` default `100`).
- `attendances`: `organizationId`, `branchId`, `customerId`, `membershipId`, `attendanceDate` (server timezone `Asia/Kolkata` formatted `YYYY-MM-DD`), `checkInAt`, `checkOutAt`, `source` (`GPS_SELF_CHECKIN`), `latitude`, `longitude`, `accuracyMeters`, `recordedBy`.
  - Compound Unique Index: `{ organizationId: 1, customerId: 1, attendanceDate: 1 }`.

### 3.4 Milestone 5: Communications, Notifications & Retention Collections
- `announcements`: `organizationId`, `branchId?`, `createdBy`, `title`, `body`, `audienceType` (`ALL_MEMBERS`, `BRANCH_MEMBERS`), `status` (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `CANCELLED`), `channels` (`IN_APP`, `WEB_PUSH`, `WHATSAPP`), `scheduledAt?`, `publishedAt?`.
- `notifications`: `organizationId`, `recipientUserId`, `customerId?`, `type` (`ANNOUNCEMENT`, `MEMBERSHIP_EXPIRING`, `MEMBERSHIP_EXPIRED`, `MEMBERSHIP_ACTIVATED`, `INVOICE_DUE`, `INVOICE_OVERDUE`, `PAYMENT_RECEIVED`, `MEMBER_INACTIVE`, `WELCOME`, `SYSTEM`), `title`, `body`, `status` (`PENDING`, `SENT`, `DELIVERED`, `FAILED`, `READ`), `announcementId?`, `metadata?`, `eventKey?`, `scheduledAt?`, `sentAt?`, `readAt?`.
  - Compound Unique Index on `eventKey`: `{ organizationId: 1, eventKey: 1 }` for idempotency & duplicate-prevention.
- `notificationDeliveries`: `organizationId`, `notificationId`, `channel` (`IN_APP`, `WEB_PUSH`, `WHATSAPP`, `SMS`, `EMAIL`), `status` (`PENDING`, `SENT`, `DELIVERED`, `FAILED`), `providerMessageId?`, `errorDetails?`, `sentAt?`.
- `notificationPreferences`: `organizationId`, `userId`, `membershipReminders`, `paymentNotifications`, `announcements`, `webPushSubscription`.

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
| `attendance:self_checkin` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `attendance:read:own` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `attendance:read` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `attendance:summary` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `announcement:read` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `announcement:create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `announcement:update` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `announcement:publish` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `announcement:cancel` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `notification:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `notification:manage` | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 5. Milestone 5 Communications & Provider Architecture

1. **Provider Abstraction**: Interfaced via `INotificationProvider` (`InAppProvider`, `WebPushProvider`, and `WhatsAppProviderStub`).
2. **Audience Resolution**: Resolves eligible User/Customer IDs dynamically for `ALL_MEMBERS` or `BRANCH_MEMBERS` within `organizationId` and `branchId`.
3. **Idempotency Engine**: Enforces deterministic keys (`expiring:7d:cust:mem:date`, `invoice:overdue:inv:date`) to guarantee notifications are sent exactly once per business event.
4. **Retention Engine**: Aggregates `expiringMemberships`, `overdueInvoices`, `inactiveMembers` (7d+ without visit) into actionable `RetentionAttentionSummary` cards for gym owners.


---

## 5. Milestone 4 GPS Self Check-In Architectural Specifications

1. **Member PWA Self Check-In Flow**:
   ```
   Member opens Klyro Mobile PWA → Tap [ CHECK IN ] → Request Browser Geolocation (Intentional action)
         → Post { latitude, longitude, accuracyMeters } to POST /api/v1/attendance/self-check-in
         → Server derives Customer from authenticated User
         → Server checks branch.settings.memberSelfCheckInEnabled == true
         → Server evaluates MembershipAccessService (ACTIVE allowed, EXPIRED rejected)
         → Server calculates Haversine distance from Branch coordinates & checks accuracy
         → Server enforces idempotent same-day check-in per customer
         → Attendance record saved with source = GPS_SELF_CHECKIN
   ```
2. **Branch Location Requirement**: `memberSelfCheckInEnabled` cannot be toggled `true` unless branch `latitude` and `longitude` are set.
3. **Haversine Distance Validation**:
   $$\text{distance} = 2 \cdot R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
   Server calculates distance authoritatively and compares against `selfCheckInRadiusMeters` (default 100m).
4. **Zero Hardware Scope Constraint**: V1 relies strictly on standard mobile PWA geolocation. Turnstiles, RFID, biometrics, manual staff check-in, and native apps are excluded.
5. **Default Timezone**: All date boundaries, attendance dating, and daily summaries use **Indian Standard Time (`Asia/Kolkata`)** by default without unnecessary settings or configuration overhead.

