# Klyro — Multi-Vertical SaaS Platform (Milestone 1: Foundation)

Klyro is a multi-tenant SaaS platform built for vertical business operations, starting with **Klyro Gym** and expandable to Salon, Studio, Academy, and beyond.

---

## Architecture Overview

- **Frontend (`apps/web`)**: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui style components, installable PWA.
- **Backend (`apps/api`)**: NestJS REST API Gateway (`/api/v1/*`), TypeScript, Passport JWT authentication, Mongoose ODM.
- **Database**: MongoDB (tenant boundary enforced at server-side via `organizationId`).
- **Packages**:
  - `@klyro/config`: Shared Role/Permission matrices, Vertical definitions, and system settings.
  - `@klyro/types`: Shared TypeScript interfaces and API response contracts.
  - `@klyro/validation`: Shared Class-Validator DTO schemas.

---

## Prerequisites

- Node.js `v20+` or `v22+`
- npm `v10+`
- Docker & Docker Compose (for containerized local setup)
- MongoDB instance running locally (port `27017`) or via Docker

---

## Getting Started

### 1. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Default local environment configuration:
```env
NODE_ENV=development
API_PORT=4000
WEB_URL=http://localhost:3000
API_URL=http://localhost:4000
MONGODB_URI=mongodb://localhost:27017/klyro
JWT_SECRET=super_secret_klyro_jwt_key_dev_mode_only_123456789
JWT_REFRESH_SECRET=super_secret_klyro_jwt_refresh_key_dev_mode_only_987654321
DEV_OTP_ENABLED=true
DEFAULT_DEV_OTP=123456
CORS_ORIGIN=http://localhost:3000
```

### 2. Install Dependencies & Build Packages
```bash
npm install
npm run build --workspace=@klyro/config
npm run build --workspace=@klyro/types
npm run build --workspace=@klyro/validation
```

---

## Local Development Execution

### Run API Server (`apps/api`)
```bash
npm run start:dev --workspace=api
```
The REST API will start on `http://localhost:4000/api/v1`.

### Run Next.js Web PWA (`apps/web`)
```bash
npm run dev --workspace=web
```
The Web PWA application will start on `http://localhost:3000`.

---

## Docker Compose Setup

Run the full stack (API, Web, MongoDB) in isolated containers:
```bash
docker-compose up --build
```

Access services at:
- Web Application: `http://localhost:3000`
- REST API Gateway: `http://localhost:4000/api/v1/health`
- MongoDB: `localhost:27017`

---

## Running Automated Tests

### Run Backend Unit Tests
```bash
npm run test --workspace=api
```

### Run Tenant Isolation & Security E2E Tests
```bash
npm run test:e2e --workspace=api
```

---

## Key API Endpoints

| Method | Endpoint | Description | Auth Required | Tenant Required |
| :--- | :--- | :--- | :---: | :---: |
| `GET` | `/api/v1/health` | Service & DB Health Check | No | No |
| `POST` | `/api/v1/auth/send-otp` | Request OTP code | No | No |
| `POST` | `/api/v1/auth/verify-otp` | Verify OTP & obtain JWT | No | No |
| `POST` | `/api/v1/auth/refresh` | Refresh Access Token | No | No |
| `GET` | `/api/v1/auth/me` | Fetch Authenticated User | Yes | No |
| `POST` | `/api/v1/organizations` | Onboard New Organization | Yes | No |
| `GET` | `/api/v1/organizations/current` | Fetch Tenant Details | Yes | Yes |
| `PATCH` | `/api/v1/organizations/current` | Update Tenant Details | Yes | Yes |
| `GET` | `/api/v1/branches` | List Tenant Branches | Yes | Yes |
| `POST` | `/api/v1/branches` | Create Branch | Yes | Yes |
| `GET` | `/api/v1/branches/:id` | Fetch Branch by ID | Yes | Yes |
| `PATCH` | `/api/v1/branches/:id` | Update Branch | Yes | Yes |

---

## Development OTP Verification
In development mode (`DEV_OTP_ENABLED=true`), use the default dev OTP:
- Code: **`123456`**

---

## Documentation
- Architecture Design: [`docs/architecture.md`](file:///c:/Akshay-DEV-OPS/my_projects/klyro/docs/architecture.md)
