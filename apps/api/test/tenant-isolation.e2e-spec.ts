import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

jest.setTimeout(60000);

describe('Tenant Isolation Security E2E Test', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer | null = null;

  let tokenUserA: string;
  let tokenUserB: string;
  let orgAId: string;
  let orgBId: string;
  let branchBId: string;

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

  it('1. Authenticate User A and create Org A', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+919000000001' })
      .expect(200);

    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919000000001', otp: '123456' })
      .expect(200);

    tokenUserA = verifyRes.body.data.tokens.accessToken;

    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ name: 'Organization A', vertical: 'GYM' })
      .expect(201);

    orgAId = orgRes.body.data.organization._id;
    expect(orgAId).toBeDefined();
  });

  it('2. Authenticate User B and create Org B with Branch B', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+919000000002' })
      .expect(200);

    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919000000002', otp: '123456' })
      .expect(200);

    tokenUserB = verifyRes.body.data.tokens.accessToken;

    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ name: 'Organization B', vertical: 'GYM' })
      .expect(201);

    orgBId = orgRes.body.data.organization._id;
    branchBId = orgRes.body.data.mainBranch._id;
    expect(orgBId).toBeDefined();
    expect(branchBId).toBeDefined();
  });

  it('3. User A attempts to access Org B data (CRITICAL SECURITY BLOCK)', async () => {
    // Attempting to access Org B branches using User A's token and x-organization-id: orgBId
    const res = await request(app.getHttpServer())
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgBId)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('User is not authorized for the requested organization context');
  });

  it('4. User A attempts to fetch Branch B by ID', async () => {
    // User A trying to query Org B branch ID with User A's valid org context (orgAId)
    const res = await request(app.getHttpServer())
      .get(`/api/v1/branches/${branchBId}`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('x-organization-id', orgAId)
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Branch not found in current organization');
  });
});
