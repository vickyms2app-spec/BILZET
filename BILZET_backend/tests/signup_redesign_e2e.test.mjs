import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/config/prisma.mjs';
import * as authService from '../src/services/auth.service.mjs';

test('BILZET — Signup Redesign E2E Contract & Role Behavior Verification', async (t) => {
  const timestamp = Date.now();

  await t.test('1. Business Owner Registration provisions Business and Admin role with State', async () => {
    const email = `owner_${timestamp}@testbilzet.com`;
    const payload = {
      name: 'Owner Rajesh Kumar',
      email,
      phone: '+91 9876543210',
      password: 'Password@123',
      accountType: 'BUSINESS_OWNER',
      businessName: `Rajesh Enterprises ${timestamp}`,
      country: 'India',
      state: 'Tamil Nadu',
    };

    const result = await authService.register(payload);
    assert.ok(result.accessToken, 'Access token should be issued');
    assert.ok(result.user, 'User object should be returned');
    assert.equal(result.user.email, email);
    assert.equal(result.user.role, 'ADMIN', 'Business Owner should be assigned ADMIN role');
    assert.equal(result.user.isOwner, true, 'Business Owner should have isOwner=true');
    assert.ok(result.user.businessId, 'Business Owner should have businessId provisioned');

    const biz = await prisma.business.findUnique({
      where: { id: result.user.businessId },
    });
    assert.ok(biz, 'Business must exist in DB');
    assert.equal(biz.name, `Rajesh Enterprises ${timestamp}`);
    assert.equal(biz.state, 'Tamil Nadu');
  });

  await t.test('2. Tax Consultant / CA Registration assigns CA role and preserves firm details', async () => {
    const email = `ca_${timestamp}@testbilzet.com`;
    const payload = {
      name: 'CA Suresh Raman',
      email,
      phone: '+91 9876543211',
      password: 'Password@123',
      accountType: 'TAX_CONSULTANT',
      businessName: 'Raman & Associates CA',
      country: 'India',
      state: 'Karnataka',
    };

    const result = await authService.register(payload);
    assert.ok(result.accessToken, 'Access token should be issued');
    assert.ok(result.user, 'User object should be returned');
    assert.equal(result.user.role, 'CA', 'Tax Consultant should be assigned CA role');
    assert.equal(result.user.isOwner, false, 'CA should not be owner of unrelated businesses');
  });

  await t.test('3. Staff / Other Role Registration does NOT grant owner or admin access', async () => {
    const email = `staff_${timestamp}@testbilzet.com`;
    const payload = {
      name: 'Staff Anitha P',
      email,
      phone: '+91 9876543212',
      password: 'Password@123',
      accountType: 'STAFF',
      businessName: '',
      country: 'India',
      state: 'Kerala',
    };

    const result = await authService.register(payload);
    assert.ok(result.accessToken, 'Access token should be issued');
    assert.ok(result.user, 'User object should be returned');
    assert.equal(result.user.role, 'NONE', 'Staff without invite must have role NONE');
    assert.equal(result.user.isOwner, false, 'Staff must not be business owner');
    assert.equal(result.user.businessId, null, 'Staff must not have arbitrary business assigned');
  });

  await t.test('4. Duplicate Email Registration is prevented with Conflict Error', async () => {
    const email = `owner_${timestamp}@testbilzet.com`;
    const payload = {
      name: 'Duplicate Rajesh',
      email,
      phone: '+91 9876543210',
      password: 'Password@123',
      accountType: 'BUSINESS_OWNER',
      businessName: 'Duplicate Store',
      country: 'India',
      state: 'Tamil Nadu',
    };

    await assert.rejects(
      async () => {
        await authService.register(payload);
      },
      (err) => {
        return err.status === 409 || err.message.includes('already exists');
      },
      'Should reject registration with existing email'
    );
  });
});
