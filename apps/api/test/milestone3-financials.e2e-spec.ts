import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

jest.setTimeout(60000);

describe('Milestone 3 Financial Architecture & Tenant Isolation E2E Test', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer | null = null;

  let tokenUserA: string;
  let tokenUserB: string;
  let orgAId: string;
  let orgBId: string;
  let branchAId: string;
  let branchBId: string;
  let customerAId: string;
  let planAId: string;
  let invoiceAId: string;
  let paymentAId: string;

  beforeAll(async () => {
    try {
      mongoServer = await MongoMemoryServer.create();
      process.env.MONGODB_URI = mongoServer.getUri();
    } catch {
      process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/klyro_test';
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('1. User A creates Org A, checks out SaaS Subscription, and activates AutoPay', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/send-otp').send({ phone: '+919333333333' }).expect(200);
    const verify = await request(app.getHttpServer()).post('/api/v1/auth/verify-otp').send({ phone: '+919333333333', otp: '123456' }).expect(200);
    tokenUserA = verify.body.data.tokens.accessToken;

    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ name: 'Gym SaaS Alpha', vertical: 'GYM' })
      .expect(201);

    orgAId = orgRes.body.data.organization._id;
    branchAId = orgRes.body.data.mainBranch._id;

    // Get SaaS plans
    const plansRes = await request(app.getHttpServer()).get('/api/v1/subscription/plans').expect(200);
    const growthPlan = plansRes.body.data.find((p: any) => p.code === 'GROWTH');

    // Checkout
    await request(app.getHttpServer())
      .post('/api/v1/subscription/checkout')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .send({ subscriptionPlanId: growthPlan._id })
      .expect(201);

    // Setup AutoPay
    const autopayRes = await request(app.getHttpServer())
      .post('/api/v1/subscription/autopay/setup')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .send({ method: 'UPI_AUTOPAY' })
      .expect(201);

    expect(autopayRes.body.data.subscription.status).toBe('ACTIVE');
  });

  it('2. User A creates Customer A & Membership A -> Verifies NO automatic invoice is created', async () => {
    const custRes = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .send({ branchId: branchAId, firstName: 'Member Alpha', phone: '+919777777777' })
      .expect(201);

    customerAId = custRes.body.data._id;

    const planRes = await request(app.getHttpServer())
      .post('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .send({ name: 'Quarterly Pass', code: 'Q-PASS', duration: 3, durationType: 'MONTHS', price: 6000 })
      .expect(201);

    planAId = planRes.body.data._id;

    const membRes = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .send({ customerId: customerAId, membershipPlanId: planAId, branchId: branchAId })
      .expect(201);

    const membershipId = membRes.body.data._id;

    // VERIFY CRITICAL BUSINESS RULE: NO INVOICE CREATED AUTOMATICALLY
    const invRes = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerAId}/invoices`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    expect(invRes.body.data.length).toBe(0);

    // Explicitly create invoice
    const createInvRes = await request(app.getHttpServer())
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .send({
        customerId: customerAId,
        membershipId,
        branchId: branchAId,
        subtotal: 6000,
        discountAmount: 0,
        totalAmount: 6000,
      })
      .expect(201);

    expect(createInvRes.body.data.status).toBe('OPEN');
    expect(createInvRes.body.data.totalAmount).toBe(6000);
    invoiceAId = createInvRes.body.data._id;
  });

  it('3. User A records partial and full payments against explicit invoice', async () => {
    // Record ₹2,000 partial payment
    const p1 = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .send({ invoiceId: invoiceAId, customerId: customerAId, amount: 2000, method: 'UPI', reference: 'UPI-PARTIAL-001' })
      .expect(201);

    expect(p1.body.data.invoice.status).toBe('PARTIALLY_PAID');
    expect(p1.body.data.remainingOutstanding).toBe(4000);
    paymentAId = p1.body.data.payment._id;

    // Attempt overpayment rejection (> ₹4,000)
    await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .send({ invoiceId: invoiceAId, customerId: customerAId, amount: 5000, method: 'CASH' })
      .expect(400);

    // Record remaining ₹4,000 payment
    const p2 = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .send({ invoiceId: invoiceAId, customerId: customerAId, amount: 4000, method: 'CASH' })
      .expect(201);

    expect(p2.body.data.invoice.status).toBe('PAID');
    expect(p2.body.data.remainingOutstanding).toBe(0);

    // Financial Summary
    const summaryRes = await request(app.getHttpServer())
      .get('/api/v1/financial-summary')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    expect(summaryRes.body.data.totalCollected).toBe(6000);
    expect(summaryRes.body.data.totalOutstanding).toBe(0);
    expect(summaryRes.body.data.paidInvoiceCount).toBe(1);
  });

  it('4. User B attempts cross-tenant access to User A financial data (CRITICAL BLOCK)', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/send-otp').send({ phone: '+919444444444' }).expect(200);
    const verify = await request(app.getHttpServer()).post('/api/v1/auth/verify-otp').send({ phone: '+919444444444', otp: '123456' }).expect(200);
    tokenUserB = verify.body.data.tokens.accessToken;

    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ name: 'Gym Beta', vertical: 'GYM' })
      .expect(201);

    orgBId = orgRes.body.data.organization._id;

    // Activate subscription for Org B
    const plansRes = await request(app.getHttpServer()).get('/api/v1/subscription/plans').expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/subscription/checkout')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .set('x-organization-id', orgBId)
      .send({ subscriptionPlanId: plansRes.body.data[0]._id })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/subscription/autopay/setup')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .set('x-organization-id', orgBId)
      .send({ method: 'UPI_AUTOPAY' })
      .expect(201);

    // User B attempts to access Org A's invoice with Org A header -> Forbidden 403 (User B not member of Org A)
    await request(app.getHttpServer())
      .get(`/api/v1/invoices/${invoiceAId}`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .set('x-organization-id', orgAId)
      .expect(403);

    // User B attempts to access Org A's invoice within Org B context -> Not Found 404 (Cross-tenant query boundary)
    await request(app.getHttpServer())
      .get(`/api/v1/invoices/${invoiceAId}`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .set('x-organization-id', orgBId)
      .expect(404);
  });
});
