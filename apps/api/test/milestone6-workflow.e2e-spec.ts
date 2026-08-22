import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ROLES, PERMISSIONS, PLAN_DURATION_TYPE, MEMBERSHIP_STATUS, INVOICE_STATUS, PAYMENT_STATUS } from '@klyro/config';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Milestone 6 Operational Simplification & Workflow Orchestration E2E Test', () => {
  let app: INestApplication;
  let dbConnection: Connection;
  let jwtService: JwtService;
  let configService: ConfigService;

  // Org A
  let orgAId: string;
  let branchAId: string;
  let ownerAUserId: string;
  let memberAUserId: string;
  let tokenOwnerA: string;
  let tokenMemberA: string;

  // Org B
  let orgBId: string;
  let ownerBUserId: string;
  let tokenOwnerB: string;

  // Plans
  let goldPlanId: string;
  let monthlyPlanId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    dbConnection = moduleFixture.get<Connection>(getConnectionToken());
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

    orgAId = new Types.ObjectId().toString();
    branchAId = new Types.ObjectId().toString();
    orgBId = new Types.ObjectId().toString();

    ownerAUserId = new Types.ObjectId().toString();
    memberAUserId = new Types.ObjectId().toString();
    ownerBUserId = new Types.ObjectId().toString();

    goldPlanId = new Types.ObjectId().toString();
    monthlyPlanId = new Types.ObjectId().toString();

    // Create Users
    await dbConnection.collection('users').insertMany([
      {
        _id: new Types.ObjectId(ownerAUserId),
        phone: '+919999911111',
        status: 'ACTIVE',
        roles: [
          {
            organizationId: new Types.ObjectId(orgAId),
            role: ROLES.OWNER,
            permissions: Object.values(PERMISSIONS),
          },
        ],
      },
      {
        _id: new Types.ObjectId(memberAUserId),
        phone: '+919876500001',
        status: 'ACTIVE',
        roles: [
          {
            organizationId: new Types.ObjectId(orgAId),
            role: ROLES.MEMBER,
            permissions: [PERMISSIONS.NOTIFICATION_READ],
          },
        ],
      },
      {
        _id: new Types.ObjectId(ownerBUserId),
        phone: '+919999922222',
        status: 'ACTIVE',
        roles: [
          {
            organizationId: new Types.ObjectId(orgBId),
            role: ROLES.OWNER,
            permissions: Object.values(PERMISSIONS),
          },
        ],
      },
    ]);

    // Create Branches
    await dbConnection.collection('branches').insertOne({
      _id: new Types.ObjectId(branchAId),
      organizationId: new Types.ObjectId(orgAId),
      name: 'Main Branch',
      code: 'MB-01',
      status: 'ACTIVE',
    });

    // Create Membership Plans
    await dbConnection.collection('membershipPlans').insertMany([
      {
        _id: new Types.ObjectId(goldPlanId),
        organizationId: new Types.ObjectId(orgAId),
        name: 'Gold Annual',
        code: 'GOLD-ANNUAL',
        price: 12000,
        duration: 1,
        durationType: PLAN_DURATION_TYPE.YEARS,
        status: 'ACTIVE',
      },
      {
        _id: new Types.ObjectId(monthlyPlanId),
        organizationId: new Types.ObjectId(orgAId),
        name: 'Monthly Pro',
        code: 'MONTHLY-PRO',
        price: 2500,
        duration: 1,
        durationType: PLAN_DURATION_TYPE.MONTHS,
        status: 'ACTIVE',
      },
    ]);

    const secret = configService.get<string>('JWT_SECRET') || 'super_secret_klyro_jwt_key_dev_mode_only_123456789';

    tokenOwnerA = jwtService.sign({ sub: ownerAUserId, phone: '+919999911111' }, { secret });
    tokenMemberA = jwtService.sign({ sub: memberAUserId, phone: '+919876500001' }, { secret });
    tokenOwnerB = jwtService.sign({ sub: ownerBUserId, phone: '+919999922222' }, { secret });
  });

  afterAll(async () => {
    if (dbConnection) {
      await dbConnection.collection('users').deleteMany({
        _id: {
          $in: [
            new Types.ObjectId(ownerAUserId),
            new Types.ObjectId(memberAUserId),
            new Types.ObjectId(ownerBUserId),
          ],
        },
      });
      await dbConnection.collection('branches').deleteMany({
        organizationId: { $in: [new Types.ObjectId(orgAId), new Types.ObjectId(orgBId)] },
      });
      await dbConnection.collection('membershipplans').deleteMany({
        organizationId: { $in: [new Types.ObjectId(orgAId), new Types.ObjectId(orgBId)] },
      });
      await dbConnection.collection('customers').deleteMany({
        organizationId: { $in: [new Types.ObjectId(orgAId), new Types.ObjectId(orgBId)] },
      });
      await dbConnection.collection('customerMemberships').deleteMany({
        organizationId: { $in: [new Types.ObjectId(orgAId), new Types.ObjectId(orgBId)] },
      });
      await dbConnection.collection('invoices').deleteMany({
        organizationId: { $in: [new Types.ObjectId(orgAId), new Types.ObjectId(orgBId)] },
      });
      await dbConnection.collection('payments').deleteMany({
        organizationId: { $in: [new Types.ObjectId(orgAId), new Types.ObjectId(orgBId)] },
      });
    }
    await app.close();
  });

  let onboardedCustomerAId: string;
  let onboardedCustomerBId: string;

  it('1. Member Onboarding with PAY_NOW (Single Business Workflow)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/gym/members/onboard')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        firstName: 'Rahul',
        lastName: 'Sharma',
        phone: '+919800011111',
        membershipPlanId: monthlyPlanId,
        paymentMode: 'PAY_NOW',
        paymentMethod: 'UPI',
        paymentReference: 'UPI-REF-001',
      })
      .expect(201);

    const data = res.body.data || res.body;
    expect(data.customer).toBeDefined();
    expect(data.customer.firstName).toBe('Rahul');
    expect(data.customer.customerCode).toBeDefined();
    onboardedCustomerAId = data.customer._id;

    // Membership verification
    expect(data.membership).toBeDefined();
    expect(data.membership.status).toBe(MEMBERSHIP_STATUS.ACTIVE);
    expect(data.membership.price).toBe(2500);

    // Invoice verification (Automatically created & PAID)
    expect(data.invoice).toBeDefined();
    expect(data.invoice.invoiceNumber).toBeDefined();
    expect(data.invoice.totalAmount).toBe(2500);
    expect(data.invoice.paidAmount).toBe(2500);
    expect(data.invoice.status).toBe(INVOICE_STATUS.PAID);

    // Payment verification
    expect(data.payment).toBeDefined();
    expect(data.payment.amount).toBe(2500);
    expect(data.payment.method).toBe('UPI');
    expect(data.payment.status).toBe(PAYMENT_STATUS.SUCCESS);
  });

  it('2. Member Onboarding with PAY_LATER (Automatic Invoice in OPEN Status)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/gym/members/onboard')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        firstName: 'Priya',
        lastName: 'Verma',
        phone: '+919800022222',
        membershipPlanId: monthlyPlanId,
        paymentMode: 'PAY_LATER',
      })
      .expect(201);

    const data = res.body.data || res.body;
    expect(data.customer).toBeDefined();
    expect(data.customer.firstName).toBe('Priya');
    onboardedCustomerBId = data.customer._id;

    // Membership active
    expect(data.membership).toBeDefined();
    expect(data.membership.status).toBe(MEMBERSHIP_STATUS.ACTIVE);

    // Invoice automatically created and OPEN
    expect(data.invoice).toBeDefined();
    expect(data.invoice.totalAmount).toBe(2500);
    expect(data.invoice.paidAmount).toBe(0);
    expect(data.invoice.status).toBe(INVOICE_STATUS.OPEN);

    // No payment created
    expect(data.payment).toBeUndefined();
  });

  it('3. Member Onboarding with Partial Payment (PARTIALLY_PAID Status)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/gym/members/onboard')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        firstName: 'Amit',
        lastName: 'Patel',
        phone: '+919800033333',
        membershipPlanId: monthlyPlanId,
        paymentMode: 'PAY_NOW',
        paymentAmount: 1000,
        paymentMethod: 'CASH',
      })
      .expect(201);

    const data = res.body.data || res.body;
    expect(data.invoice.totalAmount).toBe(2500);
    expect(data.invoice.paidAmount).toBe(1000);
    expect(data.invoice.status).toBe(INVOICE_STATUS.PARTIALLY_PAID);
    expect(data.payment.amount).toBe(1000);
  });

  it('4. Duplicate Member Phone Detection', async () => {
    // 1. Check duplicate endpoint
    const checkRes = await request(app.getHttpServer())
      .get('/api/v1/gym/members/check-duplicate?phone=%2B919800011111')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    const checkData = checkRes.body.data || checkRes.body;
    expect(checkData.exists).toBe(true);
    expect(checkData.customer.firstName).toBe('Rahul');

    // 2. Onboard attempt with existing phone -> 409 Conflict
    const conflictRes = await request(app.getHttpServer())
      .post('/api/v1/gym/members/onboard')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        firstName: 'Rahul',
        lastName: 'Sharma Duplicate',
        phone: '+919800011111',
        membershipPlanId: monthlyPlanId,
      })
      .expect(409);
  });

  it('5. Early Renewal Workflow (Starts after current membership expires)', async () => {
    // Customer A has active membership expiring in ~30 days.
    const renewRes = await request(app.getHttpServer())
      .post(`/api/v1/gym/members/${onboardedCustomerAId}/renew`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        membershipPlanId: monthlyPlanId,
        paymentMode: 'PAY_NOW',
        paymentMethod: 'UPI',
      })
      .expect(200);

    const data = renewRes.body.data || renewRes.body;
    expect(data.membership).toBeDefined();
    expect(data.membership.status).toBe(MEMBERSHIP_STATUS.ACTIVE);
    expect(data.invoice.status).toBe(INVOICE_STATUS.PAID);
    expect(data.payment).toBeDefined();

    // Verify start date begins after the first membership ends
    const firstMem = await dbConnection.collection('customerMemberships').findOne({
      customerId: new Types.ObjectId(onboardedCustomerAId),
    });
    const renewMemStartDate = new Date(data.membership.startDate);
    const firstMemEndDate = new Date(firstMem!.endDate);

    expect(renewMemStartDate.getTime()).toBeGreaterThanOrEqual(firstMemEndDate.getTime());
  });

  it('6. Contextual Payment Collection for Customer with Open Invoice', async () => {
    // Customer B has an open invoice of ₹2,500
    const collectRes = await request(app.getHttpServer())
      .post(`/api/v1/gym/members/${onboardedCustomerBId}/collect-payment`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        amount: 2500,
        method: 'CASH',
        notes: 'Front-desk cash settlement',
      })
      .expect(200);

    const data = collectRes.body.data || collectRes.body;
    expect(data.payment).toBeDefined();
    expect(data.payment.amount).toBe(2500);
    expect(data.payment.status).toBe(PAYMENT_STATUS.SUCCESS);

    expect(data.invoice).toBeDefined();
    expect(data.invoice.status).toBe(INVOICE_STATUS.PAID);
    expect(data.invoice.paidAmount).toBe(2500);
  });

  it('7. Security, RBAC & Tenant Isolation', async () => {
    // Member cannot onboard members
    await request(app.getHttpServer())
      .post('/api/v1/gym/members/onboard')
      .set('Authorization', `Bearer ${tokenMemberA}`)
      .set('x-organization-id', orgAId)
      .send({
        firstName: 'Test',
        phone: '+919999988888',
        membershipPlanId: monthlyPlanId,
      })
      .expect(403);

    // Owner B cannot renew customer belonging to Org A
    await request(app.getHttpServer())
      .post(`/api/v1/gym/members/${onboardedCustomerAId}/renew`)
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .set('x-organization-id', orgBId)
      .send({
        membershipPlanId: monthlyPlanId,
      })
      .expect(404);
  });
});
