import prisma from '../config/prisma.mjs';

/**
 * Migration Script: Migrate existing Users, Owners, Staff, and CAs to BusinessMember records
 * Preserves all existing accounts, passwords, stores, financial history, and relationships.
 */
export async function migrateBusinessMemberships() {
  console.log('[Migration] Starting Business Memberships and Roles Migration...');

  let migratedCount = 0;

  // 1. Migrate Business Owners & Store Admins
  const businesses = await prisma.business.findMany({
    include: { owner: true },
  });

  for (const biz of businesses) {
    if (biz.ownerId) {
      try {
        await prisma.businessMember.upsert({
          where: {
            userId_businessId: {
              userId: biz.ownerId,
              businessId: biz.id,
            },
          },
          update: {
            role: 'ADMIN',
            status: 'ACTIVE',
          },
          create: {
            userId: biz.ownerId,
            businessId: biz.id,
            role: 'ADMIN',
            status: 'ACTIVE',
            designation: 'Store Owner & Administrator',
            acceptedAt: biz.createdAt || new Date(),
          },
        });
        migratedCount++;
      } catch (err) {
        console.warn(`[Migration] Notice for owner ${biz.ownerId} in ${biz.id}:`, err.message);
      }
    }
  }

  // 2. Migrate Staff records linked to Users
  const staffMembers = await prisma.staff.findMany({
    where: {
      userId: { not: null },
      businessId: { not: null },
      isDeleted: false,
    },
  });

  for (const st of staffMembers) {
    try {
      const rawRole = String(st.role || '').toUpperCase();
      let assignedRole = 'STAFF';
      if (rawRole === 'MANAGER') assignedRole = 'MANAGER';
      else if (rawRole === 'CASHIER') assignedRole = 'CASHIER';
      else if (rawRole === 'ADMIN') assignedRole = 'ADMIN';

      await prisma.businessMember.upsert({
        where: {
          userId_businessId: {
            userId: st.userId,
            businessId: st.businessId,
          },
        },
        update: {
          role: assignedRole,
          department: st.department || 'Operations',
          designation: st.role || 'Staff Member',
          status: st.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        },
        create: {
          userId: st.userId,
          businessId: st.businessId,
          role: assignedRole,
          department: st.department || 'Operations',
          designation: st.role || 'Staff Member',
          status: st.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
          acceptedAt: st.joiningDate || st.createdAt || new Date(),
        },
      });
      migratedCount++;
    } catch (err) {
      console.warn(`[Migration] Notice for staff ${st.id}:`, err.message);
    }
  }

  // 3. Migrate CA Store Accesses
  const caAccesses = await prisma.caStoreAccess.findMany({
    where: { status: 'ACTIVE' },
  });

  for (const ca of caAccesses) {
    try {
      await prisma.businessMember.upsert({
        where: {
          userId_businessId: {
            userId: ca.caUserId,
            businessId: ca.businessId,
          },
        },
        update: {
          role: 'CA',
          status: 'ACTIVE',
          permissions: ca.permissions,
        },
        create: {
          userId: ca.caUserId,
          businessId: ca.businessId,
          role: 'CA',
          designation: 'Chartered Accountant',
          status: 'ACTIVE',
          permissions: ca.permissions,
          acceptedAt: ca.createdAt || new Date(),
        },
      });
      migratedCount++;
    } catch (err) {
      console.warn(`[Migration] Notice for CA access ${ca.id}:`, err.message);
    }
  }

  // 4. Any other Users with an assigned businessId
  const assignedUsers = await prisma.user.findMany({
    where: {
      businessId: { not: null },
      isActive: true,
    },
  });

  for (const u of assignedUsers) {
    try {
      const uRole = u.role === 'NONE' ? 'STAFF' : (u.role || 'STAFF');
      await prisma.businessMember.upsert({
        where: {
          userId_businessId: {
            userId: u.id,
            businessId: u.businessId,
          },
        },
        update: {},
        create: {
          userId: u.id,
          businessId: u.businessId,
          role: uRole,
          status: 'ACTIVE',
          designation: u.role || 'Member',
          acceptedAt: u.createdAt || new Date(),
        },
      });
      migratedCount++;
    } catch (err) {
      console.warn(`[Migration] Notice for user ${u.id}:`, err.message);
    }
  }

  console.log(`[Migration] Completed successfully. Total membership records synchronized: ${migratedCount}`);
  return { success: true, migratedCount };
}

if (process.argv[1] && process.argv[1].endsWith('migrateBusinessMemberships.mjs')) {
  migrateBusinessMemberships()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}

export default migrateBusinessMemberships;
