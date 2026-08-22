import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

jest.setTimeout(90000);

describe('Milestone 4 GPS Attendance & Self Check-In E2E Test', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer | null = null;

  let tokenOwnerA: string;
  let tokenMemberB: string;
  let orgAId: string;
  let branchAId: string;
  let customerBId: string;
  let planId: string;

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

  it('1. Setup: Owner login, Organization creation, and Branch setup', async () => {
    // Owner OTP Login
    await request(app.getHttpServer()).post('/api/v1/auth/send-otp').send({ phone: '+919111111111' }).expect(200);
    const ownerVerify = await request(app.getHttpServer()).post('/api/v1/auth/verify-otp').send({ phone: '+919111111111', otp: '123456' }).expect(200);
    tokenOwnerA = ownerVerify.body.data.tokens.accessToken;

    // Create Organization
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({ name: 'Klyro Fitness Nagpur', vertical: 'GYM' })
      .expect(201);

    orgAId = orgRes.body.data.organization._id;
    branchAId = orgRes.body.data.mainBranch._id;
  });

  it('2. Branch Location & Self Check-in Toggle validation', async () => {
    // Enabling self check-in without coordinates must fail
    await request(app.getHttpServer())
      .patch(`/api/v1/branches/${branchAId}`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        settings: { memberSelfCheckInEnabled: true },
      })
      .expect(400);

    // Set branch location coordinates & enable self check-in
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/branches/${branchAId}`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        location: { latitude: 21.1458, longitude: 79.0882 },
        settings: { memberSelfCheckInEnabled: true, selfCheckInRadiusMeters: 100 },
      })
      .expect(200);

    expect(updateRes.body.data.location.latitude).toBe(21.1458);
    expect(updateRes.body.data.settings.memberSelfCheckInEnabled).toBe(true);
  });

  it('3. Member registration & Membership assignment', async () => {
    // Member OTP Login
    await request(app.getHttpServer()).post('/api/v1/auth/send-otp').send({ phone: '+919222222222' }).expect(200);
    const memberVerify = await request(app.getHttpServer()).post('/api/v1/auth/verify-otp').send({ phone: '+919222222222', otp: '123456' }).expect(200);
    tokenMemberB = memberVerify.body.data.tokens.accessToken;

    // Owner creates Customer profile linked to Member B's phone
    const custRes = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        branchId: branchAId,
        firstName: 'Rahul',
        lastName: 'Sharma',
        phone: '+919222222222',
        gender: 'MALE',
      })
      .expect(201);
    customerBId = custRes.body.data._id;

    // Create Membership Plan
    const planRes = await request(app.getHttpServer())
      .post('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        name: 'Gold Monthly',
        code: 'GOLD_MONTHLY',
        duration: 1,
        durationType: 'MONTHS',
        price: 2000,
      })
      .expect(201);
    planId = planRes.body.data._id;

    // Assign active membership
    await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        customerId: customerBId,
        membershipPlanId: planId,
        branchId: branchAId,
      })
      .expect(201);
  });

  it('4. Member GPS Self Check-in Success Flow', async () => {
    // Member B checks in 20 meters away from gym (21.1460, 79.0882)
    const res = await request(app.getHttpServer())
      .post('/api/v1/attendance/self-check-in')
      .set('Authorization', `Bearer ${tokenMemberB}`)
      .set('x-organization-id', orgAId)
      .set('x-branch-id', branchAId)
      .send({
        latitude: 21.1460,
        longitude: 79.0882,
        accuracyMeters: 10,
      })
      .expect(201);

    expect(res.body.data.status).toBe('SUCCESS');
    expect(res.body.data.attendance.source).toBe('GPS_SELF_CHECKIN');
  });

  it('5. Duplicate Check-in Idempotency', async () => {
    // Member B taps check-in again on the same day
    const res = await request(app.getHttpServer())
      .post('/api/v1/attendance/self-check-in')
      .set('Authorization', `Bearer ${tokenMemberB}`)
      .set('x-organization-id', orgAId)
      .set('x-branch-id', branchAId)
      .send({
        latitude: 21.1460,
        longitude: 79.0882,
        accuracyMeters: 10,
      })
      .expect(201);

    expect(res.body.data.status).toBe('ALREADY_CHECKED_IN');
    expect(res.body.data.message).toContain('already checked in today');
  });

  it('6. Member fetch own attendance', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/attendance/my')
      .set('Authorization', `Bearer ${tokenMemberB}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].source).toBe('GPS_SELF_CHECKIN');
  });

  it('7. Outside Radius Rejection', async () => {
    // Create new Member User C without prior check-in today
    await request(app.getHttpServer()).post('/api/v1/auth/send-otp').send({ phone: '+919333333333' }).expect(200);
    const memberVerify = await request(app.getHttpServer()).post('/api/v1/auth/verify-otp').send({ phone: '+919333333333', otp: '123456' }).expect(200);
    const tokenMemberC = memberVerify.body.data.tokens.accessToken;

    const custC = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({ branchId: branchAId, firstName: 'Priya', phone: '+919333333333' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({ customerId: custC.body.data._id, membershipPlanId: planId, branchId: branchAId })
      .expect(201);

    // Member C checks in from 2km away (21.1600, 79.0882)
    const errRes = await request(app.getHttpServer())
      .post('/api/v1/attendance/self-check-in')
      .set('Authorization', `Bearer ${tokenMemberC}`)
      .set('x-organization-id', orgAId)
      .set('x-branch-id', branchAId)
      .send({
        latitude: 21.1600,
        longitude: 79.0882,
        accuracyMeters: 10,
      })
      .expect(400);

    const msg7 = errRes.body.error?.message || errRes.body.message;
    expect(msg7).toContain("outside the gym's check-in area");
  });

  it('8. Feature Disabled Rejection', async () => {
    // Owner disables self check-in
    await request(app.getHttpServer())
      .patch(`/api/v1/branches/${branchAId}`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        settings: { memberSelfCheckInEnabled: false },
      })
      .expect(200);

    // Member B attempts check-in
    const errRes = await request(app.getHttpServer())
      .post('/api/v1/attendance/self-check-in')
      .set('Authorization', `Bearer ${tokenMemberB}`)
      .set('x-organization-id', orgAId)
      .set('x-branch-id', branchAId)
      .send({
        latitude: 21.1460,
        longitude: 79.0882,
        accuracyMeters: 10,
      })
      .expect(400);

    const msg8 = errRes.body.error?.message || errRes.body.message;
    expect(msg8).toContain('currently disabled by your gym');
  });

  it('9. Owner Attendance Monitoring & Summary View', async () => {
    // Owner fetches attendance summary
    const summaryRes = await request(app.getHttpServer())
      .get('/api/v1/attendance/summary')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    expect(summaryRes.body.data).toHaveProperty('todayCheckIns');
    expect(summaryRes.body.data).toHaveProperty('activeMembers');

    // Owner fetches today's check-ins list
    const todayRes = await request(app.getHttpServer())
      .get('/api/v1/attendance/today')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    expect(Array.isArray(todayRes.body.data)).toBe(true);
  });
});
