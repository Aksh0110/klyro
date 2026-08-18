import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ROLES, PERMISSIONS } from '@klyro/config';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Milestone 5 Communications, Notifications & Retention E2E Test', () => {
  let app: INestApplication;
  let dbConnection: Connection;
  let jwtService: JwtService;
  let configService: ConfigService;

  // Org A
  let orgAId: string;
  let branchAId: string;
  let branchBId: string;
  let ownerAUserId: string;
  let staffAUserId: string;
  let tokenOwnerA: string;
  let tokenStaffA: string;

  // Member A (Branch A)
  let memberAUserId: string;
  let customerAId: string;
  let tokenMemberA: string;

  // Member B (Branch B)
  let memberBUserId: string;
  let customerBId: string;
  let tokenMemberB: string;

  // Org B (Tenant Isolation)
  let orgBId: string;
  let ownerBUserId: string;
  let tokenOwnerB: string;

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

    // Setup Test Data
    orgAId = new Types.ObjectId().toString();
    branchAId = new Types.ObjectId().toString();
    branchBId = new Types.ObjectId().toString();
    orgBId = new Types.ObjectId().toString();

    ownerAUserId = new Types.ObjectId().toString();
    staffAUserId = new Types.ObjectId().toString();
    ownerBUserId = new Types.ObjectId().toString();
    memberAUserId = new Types.ObjectId().toString();
    memberBUserId = new Types.ObjectId().toString();

    customerAId = new Types.ObjectId().toString();
    customerBId = new Types.ObjectId().toString();

    // Create Users in DB
    const usersColl = dbConnection.collection('users');
    await usersColl.insertMany([
      {
        _id: new Types.ObjectId(ownerAUserId),
        phone: '+919999900001',
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
        _id: new Types.ObjectId(staffAUserId),
        phone: '+919999900003',
        status: 'ACTIVE',
        roles: [
          {
            organizationId: new Types.ObjectId(orgAId),
            role: ROLES.STAFF,
            permissions: [PERMISSIONS.CUSTOMER_READ, PERMISSIONS.ATTENDANCE_READ],
          },
        ],
      },
      {
        _id: new Types.ObjectId(ownerBUserId),
        phone: '+919999900002',
        status: 'ACTIVE',
        roles: [
          {
            organizationId: new Types.ObjectId(orgBId),
            role: ROLES.OWNER,
            permissions: Object.values(PERMISSIONS),
          },
        ],
      },
      {
        _id: new Types.ObjectId(memberAUserId),
        phone: '+919876543211',
        status: 'ACTIVE',
        roles: [
          {
            organizationId: new Types.ObjectId(orgAId),
            role: ROLES.MEMBER,
            permissions: [PERMISSIONS.NOTIFICATION_READ, PERMISSIONS.ANNOUNCEMENT_READ],
          },
        ],
      },
      {
        _id: new Types.ObjectId(memberBUserId),
        phone: '+919876543222',
        status: 'ACTIVE',
        roles: [
          {
            organizationId: new Types.ObjectId(orgAId),
            role: ROLES.MEMBER,
            permissions: [PERMISSIONS.NOTIFICATION_READ, PERMISSIONS.ANNOUNCEMENT_READ],
          },
        ],
      },
    ]);

    // Create Customers
    const custColl = dbConnection.collection('customers');
    await custColl.insertMany([
      {
        _id: new Types.ObjectId(customerAId),
        organizationId: new Types.ObjectId(orgAId),
        branchId: new Types.ObjectId(branchAId),
        userId: new Types.ObjectId(memberAUserId),
        customerCode: 'CUST-A1',
        firstName: 'Alice',
        phone: '+919876543211',
        status: 'ACTIVE',
      },
      {
        _id: new Types.ObjectId(customerBId),
        organizationId: new Types.ObjectId(orgAId),
        branchId: new Types.ObjectId(branchBId),
        userId: new Types.ObjectId(memberBUserId),
        customerCode: 'CUST-B1',
        firstName: 'Bob',
        phone: '+919876543222',
        status: 'ACTIVE',
      },
    ]);

    const secret = configService.get<string>('JWT_SECRET') || 'super_secret_klyro_jwt_key_dev_mode_only_123456789';

    // Generate JWT Tokens
    tokenOwnerA = jwtService.sign({ sub: ownerAUserId, phone: '+919999900001' }, { secret });
    tokenStaffA = jwtService.sign({ sub: staffAUserId, phone: '+919999900003' }, { secret });
    tokenOwnerB = jwtService.sign({ sub: ownerBUserId, phone: '+919999900002' }, { secret });
    tokenMemberA = jwtService.sign({ sub: memberAUserId, phone: '+919876543211' }, { secret });
    tokenMemberB = jwtService.sign({ sub: memberBUserId, phone: '+919876543222' }, { secret });
  });

  afterAll(async () => {
    if (dbConnection) {
      await dbConnection.collection('users').deleteMany({
        _id: {
          $in: [
            new Types.ObjectId(ownerAUserId),
            new Types.ObjectId(staffAUserId),
            new Types.ObjectId(ownerBUserId),
            new Types.ObjectId(memberAUserId),
            new Types.ObjectId(memberBUserId),
          ],
        },
      });
      await dbConnection.collection('customers').deleteMany({
        _id: { $in: [new Types.ObjectId(customerAId), new Types.ObjectId(customerBId)] },
      });
      await dbConnection.collection('announcements').deleteMany({
        organizationId: { $in: [new Types.ObjectId(orgAId), new Types.ObjectId(orgBId)] },
      });
      await dbConnection.collection('notifications').deleteMany({
        organizationId: { $in: [new Types.ObjectId(orgAId), new Types.ObjectId(orgBId)] },
      });
      await dbConnection.collection('customermemberships').deleteMany({
        organizationId: { $in: [new Types.ObjectId(orgAId), new Types.ObjectId(orgBId)] },
      });
      await dbConnection.collection('invoices').deleteMany({
        organizationId: { $in: [new Types.ObjectId(orgAId), new Types.ObjectId(orgBId)] },
      });
    }
    await app.close();
  });

  it('1. Owner Broadcast Announcement (ALL_MEMBERS)', async () => {
    // 1. Create Announcement
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        title: 'Gym Renovation Notice',
        body: 'The gym will be closed for renovation tomorrow.',
        audienceType: 'ALL_MEMBERS',
      })
      .expect(201);

    const announcementId = createRes.body.data?._id || createRes.body._id;
    expect(announcementId).toBeDefined();

    // 2. Publish Announcement
    await request(app.getHttpServer())
      .post(`/api/v1/announcements/${announcementId}/publish`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    // Give async delivery dispatch time
    await new Promise((r) => setTimeout(r, 200));

    // 3. Member A checks notifications feed
    const notifResA = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${tokenMemberA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    const notifDataA = notifResA.body.data || notifResA.body;
    expect(notifDataA.length).toBeGreaterThan(0);
    expect(notifDataA[0].title).toBe('Gym Renovation Notice');

    // 4. Check Unread Count
    const unreadRes = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${tokenMemberA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    const unreadData = unreadRes.body.data || unreadRes.body;
    expect(unreadData.unreadCount).toBeGreaterThan(0);

    // 5. Mark as read
    await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${notifDataA[0]._id}/read`)
      .set('Authorization', `Bearer ${tokenMemberA}`)
      .set('x-organization-id', orgAId)
      .expect(200);
  });

  it('2. Branch Audience Isolation (BRANCH_MEMBERS)', async () => {
    // Owner creates announcement for Branch A ONLY
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        title: 'Branch A AC Maintenance',
        body: 'Air conditioning service at Branch A today.',
        audienceType: 'BRANCH_MEMBERS',
        branchId: branchAId,
      })
      .expect(201);

    const announcementId = createRes.body.data?._id || createRes.body._id;

    // Publish
    await request(app.getHttpServer())
      .post(`/api/v1/announcements/${announcementId}/publish`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    await new Promise((r) => setTimeout(r, 200));

    // Member A (Branch A) receives it
    const notifResA = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${tokenMemberA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    const notifDataA = notifResA.body.data || notifResA.body;
    const foundBranchA = notifDataA.find((n: any) => n.title === 'Branch A AC Maintenance');
    expect(foundBranchA).toBeDefined();

    // Member B (Branch B) MUST NOT receive it
    const notifResB = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${tokenMemberB}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    const notifDataB = notifResB.body.data || notifResB.body;
    const foundBranchB = notifDataB.find((n: any) => n.title === 'Branch A AC Maintenance');
    expect(foundBranchB).toBeUndefined();
  });

  it('3. Retention Summary Insights Endpoint', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/communications/retention-summary')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    const summary = res.body.data || res.body;
    expect(summary).toHaveProperty('expiringCount');
    expect(summary).toHaveProperty('overdueCount');
    expect(summary).toHaveProperty('inactiveCount');
    expect(summary).toHaveProperty('attentionItems');
  });

  it('4. POST /api/v1/communications/run-triggers — Route Existence, Execution & Duplicate Prevention', async () => {
    // 1. Setup a membership expiring in 3 days
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 3);

    const planId = new Types.ObjectId();
    await dbConnection.collection('customermemberships').insertOne({
      _id: new Types.ObjectId(),
      organizationId: new Types.ObjectId(orgAId),
      branchId: new Types.ObjectId(branchAId),
      customerId: new Types.ObjectId(customerAId),
      membershipPlanId: planId,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: expDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Setup an overdue invoice
    const pastDueDate = new Date();
    pastDueDate.setDate(pastDueDate.getDate() - 5);
    await dbConnection.collection('invoices').insertOne({
      _id: new Types.ObjectId(),
      organizationId: new Types.ObjectId(orgAId),
      branchId: new Types.ObjectId(branchAId),
      customerId: new Types.ObjectId(customerAId),
      invoiceNumber: 'INV-TEST-001',
      status: 'OPEN',
      totalAmount: 1500,
      paidAmount: 0,
      dueAt: pastDueDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. First run of run-triggers by Owner
    const runRes1 = await request(app.getHttpServer())
      .post('/api/v1/communications/run-triggers')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    expect(runRes1.body.success).toBe(true);
    const data1 = runRes1.body.data;
    expect(data1).toBeDefined();
    expect(data1.notificationsCreated).toBeGreaterThanOrEqual(1);

    // 4. Repeated run — must be safe & prevent duplicate spam
    const runRes2 = await request(app.getHttpServer())
      .post('/api/v1/communications/run-triggers')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    expect(runRes2.body.success).toBe(true);
    const data2 = runRes2.body.data;
    expect(data2.duplicatesSkipped).toBeGreaterThanOrEqual(1);
    expect(data2.notificationsCreated).toBe(0);

    // 5. RBAC Protection — Member cannot run triggers
    await request(app.getHttpServer())
      .post('/api/v1/communications/run-triggers')
      .set('Authorization', `Bearer ${tokenMemberA}`)
      .set('x-organization-id', orgAId)
      .expect(403);

    // 6. RBAC Protection — Staff cannot run triggers
    await request(app.getHttpServer())
      .post('/api/v1/communications/run-triggers')
      .set('Authorization', `Bearer ${tokenStaffA}`)
      .set('x-organization-id', orgAId)
      .expect(403);
  });

  it('5. Scheduled Announcements & Cancellation', async () => {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 30);

    // Create scheduled announcement
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .send({
        title: 'Upcoming Yoga Workshop',
        body: 'Join our special yoga session this weekend.',
        audienceType: 'ALL_MEMBERS',
        scheduledAt: futureDate.toISOString(),
      })
      .expect(201);

    const announcementId = createRes.body.data?._id || createRes.body._id;
    const annData = createRes.body.data || createRes.body;
    expect(annData.status).toBe('SCHEDULED');

    // Cancel scheduled announcement
    const cancelRes = await request(app.getHttpServer())
      .post(`/api/v1/announcements/${announcementId}/cancel`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    const cancelData = cancelRes.body.data || cancelRes.body;
    expect(cancelData.status).toBe('CANCELLED');
  });

  it('6. Notification Preferences', async () => {
    // Member updates preferences
    const prefRes = await request(app.getHttpServer())
      .post('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${tokenMemberA}`)
      .set('x-organization-id', orgAId)
      .send({
        membershipReminders: false,
        paymentNotifications: true,
        announcements: true,
      })
      .expect(200);

    const prefData = prefRes.body.data || prefRes.body;
    expect(prefData.membershipReminders).toBe(false);

    // Get preferences
    const getPref = await request(app.getHttpServer())
      .get('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${tokenMemberA}`)
      .set('x-organization-id', orgAId)
      .expect(200);

    const getPrefData = getPref.body.data || getPref.body;
    expect(getPrefData.membershipReminders).toBe(false);
  });

  it('7. Tenant Isolation Security', async () => {
    // Owner B cannot view Org A announcements
    const res = await request(app.getHttpServer())
      .get('/api/v1/announcements')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .set('x-organization-id', orgBId)
      .expect(200);

    const data = res.body.data || res.body;
    expect(data.length).toBe(0);
  });
});
