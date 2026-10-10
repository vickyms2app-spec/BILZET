import 'dotenv/config';
import prisma from '../src/config/prisma.mjs';
import {
  PERMISSIONS_CATALOG,
  SYSTEM_ROLE_DEFINITIONS,
} from '../src/config/permissions.catalog.mjs';

export { PERMISSIONS_CATALOG, SYSTEM_ROLE_DEFINITIONS };

export async function seedPermissionsAndRoles() {
  console.log('[Seed] Seeding permissions catalog...');

  // 1. Upsert Permissions
  const permissionRecordMap = new Map();
  for (const perm of PERMISSIONS_CATALOG) {
    const record = await prisma.permission.upsert({
      where: { key: perm.key },
      update: {
        module: perm.module,
        action: perm.action,
        description: perm.description,
      },
      create: perm,
    });
    permissionRecordMap.set(perm.key, record.id);
  }
  console.log(`[Seed] Upserted ${permissionRecordMap.size} permissions.`);

  // 2. Upsert System Roles and Role Permissions
  console.log('[Seed] Seeding system roles...');
  for (const roleDef of SYSTEM_ROLE_DEFINITIONS) {
    // System roles have businessId = null
    let role = await prisma.appRole.findFirst({
      where: {
        code: roleDef.code,
        businessId: null,
      },
    });

    if (!role) {
      role = await prisma.appRole.create({
        data: {
          code: roleDef.code,
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
          businessId: null,
        },
      });
    } else {
      role = await prisma.appRole.update({
        where: { id: role.id },
        data: {
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
        },
      });
    }

    // Upsert role permissions
    for (const permKey of roleDef.permissions) {
      const permissionId = permissionRecordMap.get(permKey);
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId,
          },
        });
      }
    }
  }
  console.log('[Seed] System roles and role permissions successfully configured.');

  // 3. Migrate / Link Existing Users to Businesses
  console.log('[Seed] Checking existing users for tenant / business linking...');
  const users = await prisma.user.findMany({
    include: {
      ownedBusiness: true,
      business: true,
      subscriptions: true,
    },
  });

  for (const user of users) {
    // If user is ADMIN or owner candidate without an owned business, create one
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || !user.businessId) {
      if (!user.ownedBusiness && user.role !== 'SUPER_ADMIN') {
        const business = await prisma.business.create({
          data: {
            ownerId: user.id,
            name: `${user.name}'s Business`,
            email: user.email,
            phone: user.phone,
          },
        });

        await prisma.user.update({
          where: { id: user.id },
          data: {
            businessId: business.id,
            isOwner: true,
          },
        });
        console.log(`[Seed] Created business for user: ${user.email} (${business.id})`);
      } else if (user.ownedBusiness && !user.isOwner) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            businessId: user.ownedBusiness.id,
            isOwner: true,
          },
        });
      }
    }

    // Update subscription maxSubUsers defaults if 0
    if (user.subscriptions && user.subscriptions.length > 0) {
      for (const sub of user.subscriptions) {
        if (!sub.maxSubUsers || sub.maxSubUsers === 0) {
          let seats = 0;
          if (sub.planTier === 'PRO') seats = 5;
          if (sub.planTier === 'ENTERPRISE' || sub.planTier === 'PREMIUM') seats = 15;

          if (seats > 0) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { maxSubUsers: seats },
            });
            console.log(`[Seed] Updated subscription ${sub.id} maxSubUsers to ${seats}`);
          }
        }
      }
    }
  }

  console.log('[Seed] Phase 1 seed complete!');
}

// Execute standalone if called directly
if (process.argv[1]?.endsWith('seedPermissions.mjs')) {
  seedPermissionsAndRoles()
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
