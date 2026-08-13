import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

jest.setTimeout(60000);

describe('Milestone 2 Customer & Membership Tenant Security E2E Test', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer | null = null;

  let tokenUserA: string;
  let tokenUserB: string;
  let orgAId: string;
  let orgBId: string;
  let branchAId: string;
  let branchBId: string;
  let customerBId: string;
  let planAId: string;

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

  it('1. User A creates Org A, Customer A, and Plan A', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/send-otp').send({ phone: '+919111111111' }).expect(200);
    const verify = await request(app.getHttpServer()).post('/api/v1/auth/verify-otp').send({ phone: '+919111111111', otp: '123456' }).expect(200);
    tokenUserA = verify.body.data.tokens.accessToken;

    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ name: 'Gym Alpha', vertical: 'GYM' })
      .expect(201);

    orgAId = orgRes.body.data.organization._id;
    branchAId = orgRes.body.data.mainBranch._id;

    const planRes = await request(app.getHttpServer())
      .post('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .send({ name: 'Monthly Gold', code: 'M-GOLD', duration: 1, durationType: 'MONTHS', price: 2000 })
      .expect(201);

    planAId = planRes.body.data._id;
    expect(planAId).toBeDefined();
  });

  it('2. User B creates Org B and Customer B', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/send-otp').send({ phone: '+919222222222' }).expect(200);
    const verify = await request(app.getHttpServer()).post('/api/v1/auth/verify-otp').send({ phone: '+919222222222', otp: '123456' }).expect(200);
    tokenUserB = verify.body.data.tokens.accessToken;

    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ name: 'Gym Beta', vertical: 'GYM' })
      .expect(201);

    orgBId = orgRes.body.data.organization._id;
    branchBId = orgRes.body.data.mainBranch._id;

    const custRes = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .set('x-organization-id', orgBId)
      .send({ branchId: branchBId, firstName: 'UserB Customer', phone: '+919888888888' })
      .expect(201);

    customerBId = custRes.body.data._id;
    expect(customerBId).toBeDefined();
  });

  it('3. User A attempts to view Customer B across tenant boundary (CRITICAL BLOCK)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerBId}`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgBId)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('User is not authorized for the requested organization context');
  });

  it('4. User A attempts to assign Plan A to Customer B within Org A context', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .send({ customerId: customerBId, membershipPlanId: planAId, branchId: branchAId })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Customer not found in current organization');
  });
});
