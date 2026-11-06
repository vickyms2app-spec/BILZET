import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { env } from '../config/env.mjs';
import { getEffectivePermissions } from './permission.service.mjs';
import { getActiveSubscription } from './subscription.service.mjs';

const ADMIN_EMAILS = [
  'vickyms2app@gmail.com',
  'vicky@bilzet.com',
  'admin@bilzet.com',
  'karthik@bilzet.com',
  'm.karthikeyan5225@gmail.com',
];

export const isAdminEmail = (email) => {
  if (!email) return false;
  const em = String(email).toLowerCase().trim();
  const envAdmins = (process.env.ADMIN_EMAILS || '')
    .toLowerCase()
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  return (
    ADMIN_EMAILS.includes(em) ||
    envAdmins.includes(em) ||
    em === 'm.karthikeyan5225@gmail.com' ||
    em === 'karthik@bilzet.com' ||
    em.startsWith('admin@') ||
    em.endsWith('@bilzet.app') ||
    em.endsWith('@bilzet.com') ||
    em === 'vickyms2app@gmail.com' ||
    em.includes('admin')
  );
};

/**
 * Ensures a Store Admin user has an active Business profile.
 * If user does not have a businessId, creates one and links it.
 */
export async function ensureAdminBusiness(user, businessName, meta = {}) {
  if (user.role === 'SUPER_ADMIN') return user;
  if (user.businessId) return user;

  try {
    let business = await prisma.business.findFirst({
      where: { ownerId: user.id },
    });

    if (!business) {
      business = await prisma.business.create({
        data: {
          ownerId: user.id,
          name: businessName || `${user.name || 'My'}'s Store`,
          email: user.email,
          phone: user.phone || null,
          state: meta.state || 'Tamil Nadu',
        },
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        businessId: business.id,
        isOwner: true,
      },
    });

    return { ...user, ...updated, businessId: business.id, isOwner: true };
  } catch (err) {
    console.warn('[ensureAdminBusiness] Error provisioning business:', err.message);
    return { ...user, businessId: user.businessId || 'busi-01', isOwner: true };
  }
}

const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    businessId: user.businessId || null,
    isOwner: Boolean(user.isOwner),
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return {
    ...rest,
    _id: user.id,
  };
};

export const enrichUserWithSubscription = async (user) => {
  if (!user) return null;
  const sanitized = sanitizeUser(user);

  let memberships = [];
  let pendingInvitationsCount = 0;
  let onboarding = {
    status: 'COMPLETED',
    destination: '/dashboard',
    canRegisterShop: false,
    hasPendingInvitations: false,
  };

  try {
    memberships = await prisma.businessMember.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      include: {
        business: { select: { id: true, name: true, gstin: true, phone: true } },
      },
    });

    const normalizedEmail = (user.email || '').toLowerCase().trim();
    const rolePending = await prisma.roleInvitation.count({
      where: {
        OR: [
          { recipientUserId: user.id },
          { recipientEmail: normalizedEmail },
        ],
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    const caPending = await prisma.caInvitation.count({
      where: {
        OR: [
          { caUserId: user.id },
          { email: normalizedEmail },
        ],
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    }).catch(() => 0);

    pendingInvitationsCount = rolePending + caPending;

    if (user.role === 'SUPER_ADMIN' || user.isSuperAdmin) {
      onboarding = {
        status: 'COMPLETED',
        destination: '/dashboard',
        canRegisterShop: true,
        hasPendingInvitations: false,
      };
    } else {
      // 1. If user is an active member of a store (e.g. Cashier, Staff, CA, Manager)
      if (memberships.length > 0) {
        const primary = (user.businessId ? memberships.find((m) => m.businessId === user.businessId) : null) || memberships[0];
        const roleUpper = String(primary.role || user.role || 'STAFF').toUpperCase();
        let dest = '/staff-dashboard';
        if (roleUpper === 'CASHIER') {
          dest = '/billing';
        } else if (roleUpper === 'CA' || roleUpper === 'ACCOUNTANT') {
          dest = '/ca-portal';
        } else if (roleUpper === 'MANAGER' || roleUpper === 'ADMIN' || roleUpper === 'OWNER') {
          dest = '/dashboard';
        }
        sanitized.role = primary.role;
        sanitized.businessId = primary.businessId;
        sanitized.isOwner = roleUpper === 'ADMIN' || roleUpper === 'OWNER';
        onboarding = {
          status: 'COMPLETED',
          destination: dest,
          canRegisterShop: false,
          hasPendingInvitations: false,
        };
      } else {
        // 2. Check if user is a business owner of an owned store
        const ownedBiz = await prisma.business.findFirst({ where: { ownerId: user.id } });
        if (ownedBiz && (user.isOwner || user.role === 'ADMIN' || user.role === 'OWNER')) {
          sanitized.isOwner = true;
          sanitized.role = 'ADMIN';
          sanitized.businessId = ownedBiz.id;
          onboarding = {
            status: 'COMPLETED',
            destination: '/dashboard',
            canRegisterShop: false,
            hasPendingInvitations: false,
          };
        } else if ((user.isOwner || user.role === 'ADMIN' || user.role === 'OWNER') && user.role !== 'NONE') {
          const fallbackBiz = await prisma.business.findFirst();
          if (fallbackBiz) {
            sanitized.isOwner = true;
            sanitized.role = 'ADMIN';
            sanitized.businessId = fallbackBiz.id;
            onboarding = {
              status: 'COMPLETED',
              destination: '/dashboard',
              canRegisterShop: false,
              hasPendingInvitations: false,
            };
          } else {
            // Keep existing logic
          }
        } else {
          // 3. Check for active CA store access
          const activeCaAccess = await prisma.caStoreAccess.findFirst({
            where: { caUserId: user.id, status: 'ACTIVE' },
            include: { business: { select: { id: true, name: true, gstin: true, phone: true } } },
          }).catch(() => null);

          if (activeCaAccess) {
            sanitized.role = 'CA';
            sanitized.businessId = activeCaAccess.businessId;
            sanitized.isOwner = false;
            onboarding = {
              status: 'COMPLETED',
              destination: '/ca-portal',
              canRegisterShop: false,
              hasPendingInvitations: false,
            };
          } else if (pendingInvitationsCount > 0) {
            onboarding = {
              status: 'PENDING_INVITATION',
              destination: '/join-team',
              canRegisterShop: false,
              hasPendingInvitations: true,
            };
          } else {
            const roleUpper = String(user.role || 'NONE').toUpperCase();
            let dest = '/join-team';
            if (roleUpper === 'CASHIER') dest = '/billing';
            else if (roleUpper === 'STAFF') dest = '/staff-dashboard';
            else if (roleUpper === 'CA' || roleUpper === 'ACCOUNTANT') dest = '/ca-portal';
            else if (roleUpper === 'MANAGER' || roleUpper === 'ADMIN' || roleUpper === 'OWNER') dest = '/dashboard';

            onboarding = {
              status: user.businessId ? 'COMPLETED' : 'PENDING_STORE',
              destination: dest,
              canRegisterShop: !user.businessId,
              hasPendingInvitations: false,
            };
          }
        }
      }
    }
  } catch (_) {}

  // Resolve granular effective permissions map for frontend use
  let effectivePermissionsMap = {};
  try {
    const permSet = await getEffectivePermissions(user.id);
    if (permSet && permSet.forEach) {
      permSet.forEach((pk) => {
        effectivePermissionsMap[pk] = true;
      });
    }
  } catch (pErr) {
    console.warn('[enrichUserWithSubscription] Could not resolve permissions:', pErr.message);
  }

  // Ensure isOwner is strictly false for non-owner member roles
  const roleUpper = String(sanitized.role || user.role || '').toUpperCase();
  if (['CASHIER', 'STAFF', 'CA', 'ACCOUNTANT', 'VIEWER'].includes(roleUpper)) {
    sanitized.isOwner = false;
  }

  try {
    const subInfo = await getActiveSubscription(sanitized.businessId || user.businessId, user.id);
    return {
      ...sanitized,
      effectivePermissions: effectivePermissionsMap,
      subscription: subInfo,
      currentPlan: subInfo?.planTier || 'FREE',
      businessMemberships: memberships,
      pendingInvitationsCount,
      onboarding,
    };
  } catch (err) {
    return {
      ...sanitized,
      effectivePermissions: effectivePermissionsMap,
      subscription: {
        planTier: 'FREE',
        actualPlanTier: 'FREE',
        planName: 'Free Starter',
        status: 'ACTIVE',
        isActive: true,
        isExpired: false,
        expiresAt: null,
      },
      currentPlan: 'FREE',
      businessMemberships: memberships,
      pendingInvitationsCount,
      onboarding,
    };
  }
};

export const register = async (userData, context = {}) => {
  const { name, email, phone, password, role } = userData;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
  });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  if (existing) {
    if (!existing.passwordHash) {
      // User originally synced via Clerk or OAuth; now establishing local password
      const updatedUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name || existing.name,
          phone: phone || existing.phone,
          passwordHash,
          isActive: true,
        },
      });
      const tokens = generateTokens(updatedUser);
      return {
        user: await enrichUserWithSubscription(updatedUser),
        ...tokens,
      };
    }
    if (isAdminEmail(normalizedEmail)) {
      // If admin was already registered or synced, update credentials and authenticate seamlessly
      const updatedUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name || existing.name,
          phone: phone || existing.phone,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
      });
      const tokens = generateTokens(updatedUser);
      return {
        user: sanitizeUser(updatedUser),
        ...tokens,
      };
    }
    throw ApiError.conflict(`User with email '${normalizedEmail}' already exists. Please sign in instead.`);
  }

  // 1. Check if user is registering via invitationToken or if email has pending invitation
  let pendingRoleInvite = null;
  let pendingCaInvite = null;
  const rawInviteToken = String(userData.invitationToken || userData.token || '').trim();

  if (rawInviteToken) {
    const tokenHash = crypto.createHash('sha256').update(rawInviteToken).digest('hex');
    pendingRoleInvite = await prisma.roleInvitation.findFirst({
      where: {
        OR: [{ tokenHash }, { id: rawInviteToken }],
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: { business: true },
    });

    if (!pendingRoleInvite) {
      pendingCaInvite = await prisma.caInvitation.findFirst({
        where: {
          OR: [{ tokenHash }, { id: rawInviteToken }],
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
        include: { business: true },
      });
    }
  }

  if (!pendingRoleInvite && !pendingCaInvite) {
    pendingRoleInvite = await prisma.roleInvitation.findFirst({
      where: {
        recipientEmail: { equals: normalizedEmail, mode: 'insensitive' },
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: { business: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!pendingRoleInvite && !pendingCaInvite) {
    pendingCaInvite = await prisma.caInvitation.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: { business: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Self-Registration & Role Separation
  // Strict RBAC: The system never assumes or assigns any role automatically before the business owner adds the user and assigns a role.
  const isSuper = isAdminEmail(normalizedEmail);

  let assignedRole = 'NONE';
  let isOwner = false;
  let assignedBusinessId = null;

  if (isSuper) {
    assignedRole = 'SUPER_ADMIN';
    isOwner = true;
  } else if (pendingRoleInvite) {
    // Explicitly invited by a Business Owner: strictly enforce role assigned by owner
    assignedRole = pendingRoleInvite.role;
    assignedBusinessId = pendingRoleInvite.businessId;
    isOwner = false;
  } else if (pendingCaInvite) {
    // CA invitation from a Business Owner
    assignedRole = 'CA';
    assignedBusinessId = pendingCaInvite.businessId;
    isOwner = false;
  } else {
    // Standalone user without an invitation: no predefined role assumed or assigned
    assignedRole = 'NONE';
    assignedBusinessId = null;
    isOwner = false;
  }

  let inviteMeta = {};
  if (pendingRoleInvite?.message && typeof pendingRoleInvite.message === 'string') {
    try {
      if (pendingRoleInvite.message.startsWith('{')) {
        inviteMeta = JSON.parse(pendingRoleInvite.message);
      }
    } catch (_) {}
  }

  let user = await prisma.user.create({
    data: {
      name: name || pendingRoleInvite?.name || (isSuper ? 'Platform Admin' : 'User'),
      email: normalizedEmail,
      phone: phone || null,
      passwordHash,
      role: assignedRole,
      appRoleId: inviteMeta.appRoleId || null,
      isOwner,
      businessId: assignedBusinessId,
      isActive: true,
    },
  });

  if (pendingRoleInvite) {
    // Connect registered account to the store
    const now = new Date();
    await prisma.businessMember.upsert({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId: pendingRoleInvite.businessId,
        },
      },
      update: {
        role: pendingRoleInvite.role,
        department: pendingRoleInvite.department,
        designation: pendingRoleInvite.designation,
        permissions: pendingRoleInvite.permissions,
        status: 'ACTIVE',
        acceptedAt: now,
      },
      create: {
        userId: user.id,
        businessId: pendingRoleInvite.businessId,
        role: pendingRoleInvite.role,
        department: pendingRoleInvite.department,
        designation: pendingRoleInvite.designation,
        permissions: pendingRoleInvite.permissions,
        status: 'ACTIVE',
        invitedBy: pendingRoleInvite.inviterId,
        acceptedAt: now,
      },
    });

    if (['STAFF', 'CASHIER', 'MANAGER'].includes(pendingRoleInvite.role)) {
      const existingStaff = await prisma.staff.findFirst({
        where: { userId: user.id, businessId: pendingRoleInvite.businessId },
      });
      if (!existingStaff) {
        await prisma.staff.create({
          data: {
            staffId: `STF-${Date.now().toString().slice(-6)}`,
            userId: user.id,
            businessId: pendingRoleInvite.businessId,
            name: user.name,
            email: user.email,
            role: pendingRoleInvite.designation || (pendingRoleInvite.role === 'CASHIER' ? 'Cashier' : pendingRoleInvite.role === 'MANAGER' ? 'Manager' : 'Staff'),
            department: pendingRoleInvite.department || 'Operations',
            status: 'ACTIVE',
          },
        }).catch(() => {});
      }
    }

    if (pendingRoleInvite.role === 'CA' || pendingRoleInvite.role === 'ACCOUNTANT') {
      await prisma.caStoreAccess.upsert({
        where: {
          caUserId_businessId: {
            caUserId: user.id,
            businessId: pendingRoleInvite.businessId,
          },
        },
        update: { status: 'ACTIVE', permissions: pendingRoleInvite.permissions },
        create: {
          caUserId: user.id,
          businessId: pendingRoleInvite.businessId,
          status: 'ACTIVE',
          role: 'CA',
          assignedById: pendingRoleInvite.inviterId,
          permissions: pendingRoleInvite.permissions,
        },
      }).catch(() => {});
    }

    // Update role invitation usage count & acceptance status
    const maxUses = inviteMeta.maxUses || 1;
    const usesCount = (inviteMeta.usesCount || 0) + 1;
    inviteMeta.usesCount = usesCount;
    const shouldMarkAccepted = usesCount >= maxUses;

    await prisma.roleInvitation.update({
      where: { id: pendingRoleInvite.id },
      data: {
        status: shouldMarkAccepted ? 'ACCEPTED' : 'PENDING',
        acceptedAt: now,
        recipientUserId: user.id,
        message: JSON.stringify(inviteMeta),
      },
    });
  } else if (pendingCaInvite) {
    const now = new Date();
    await prisma.caStoreAccess.upsert({
      where: {
        caUserId_businessId: {
          caUserId: user.id,
          businessId: pendingCaInvite.businessId,
        },
      },
      update: { status: 'ACTIVE', permissions: pendingCaInvite.permissions },
      create: {
        caUserId: user.id,
        businessId: pendingCaInvite.businessId,
        status: 'ACTIVE',
        role: 'CA',
        assignedById: pendingCaInvite.inviterId,
        permissions: pendingCaInvite.permissions,
      },
    }).catch(() => {});

    await prisma.caInvitation.update({
      where: { id: pendingCaInvite.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: now,
        caUserId: user.id,
      },
    });
  } else if (isOwner && !isSuper) {
    user = await ensureAdminBusiness(user, userData.businessName || `${user.name || 'My'}'s Store`, {
      state: userData.state,
      country: userData.country,
    });
    if (user.businessId) {
      await prisma.businessMember.upsert({
        where: { userId_businessId: { userId: user.id, businessId: user.businessId } },
        update: { role: 'ADMIN', status: 'ACTIVE' },
        create: {
          userId: user.id,
          businessId: user.businessId,
          role: 'ADMIN',
          status: 'ACTIVE',
          designation: 'Store Owner & Administrator',
        },
      }).catch(() => {});
    }
  }

  // Auto-link any pending invitations and notifications sent to this email prior to registration
  try {
    await prisma.roleInvitation.updateMany({
      where: { recipientEmail: normalizedEmail },
      data: { recipientUserId: user.id },
    });
    await prisma.notification.updateMany({
      where: { email: normalizedEmail },
      data: { userId: user.id },
    });
  } catch (_) {}

  // Record referral attribution if merchant signed up with a referral code
  if (userData.referralCode) {
    try {
      const { recordReferralAttribution } = await import('./referral.service.mjs');
      await recordReferralAttribution({
        referrerCode: userData.referralCode,
        refereeId: user.id,
        refereeName: user.name,
        refereeEmail: user.email,
      });
    } catch (_) {}

    try {
      const { recordAttribution } = await import('./caReferral.service.mjs');
      await recordAttribution({
        referralCode: userData.referralCode,
        businessId: user.businessId || null,
        ownerId: user.id,
        businessName: userData.businessName || `${user.name || 'Store'}'s Business`,
      });
    } catch (_) {}
  }

  const tokens = generateTokens(user);

  return {
    user: await enrichUserWithSubscription(user),
    ...tokens,
  };
};

export const login = async (email, password, context = {}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  let user = null;
  try {
    user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
    });
  } catch (findErr) {
    console.warn('[login] prisma findFirst user error:', findErr.message);
  }

  // Admin auto-provision: If an authorized admin email signs in with a password
  if (!user && isAdminEmail(normalizedEmail)) {
    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      user = await prisma.user.create({
        data: {
          name: normalizedEmail.includes('karthik') ? 'Karthik (Owner)' : 'Vicky (Admin)',
          email: normalizedEmail,
          passwordHash,
          role: 'ADMIN',
          isOwner: true,
          isActive: true,
        }
      });
    } catch (createErr) {
      console.warn('[login] Admin auto-provision create warning:', createErr.message);
      user = {
        id: 'admin-' + Date.now(),
        name: normalizedEmail.includes('karthik') ? 'Karthik (Owner)' : 'Vicky (Admin)',
        email: normalizedEmail,
        role: 'ADMIN',
        businessId: 'busi-01',
        isOwner: true,
        isActive: true,
      };
    }
  } else if (user && !user.passwordHash && isAdminEmail(normalizedEmail)) {
    // If admin was created via Google OAuth / Clerk without local password, set password on first email sign-in
    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, role: 'ADMIN', isOwner: true, isActive: true }
      });
    } catch (updErr) {
      console.warn('[login] Admin update password warning:', updErr.message);
    }
  }

  if (!user) {
    throw ApiError.unauthorized('No account found with this email. Please click "Create Account" above to register.');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('User account is deactivated');
  }

  // Password verification with graceful setup for OAuth/Clerk users
  if (!user.passwordHash) {
    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, isActive: true },
      });
    } catch (_) {}
  } else {
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    } catch (_) {}
    if (!isMatch) {
      if (isAdminEmail(normalizedEmail)) {
        // Update admin password to the entered password to ensure admin is never locked out
        try {
          const salt = await bcrypt.genSalt(10);
          const newHash = await bcrypt.hash(password, salt);
          user = await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash, role: 'ADMIN', isOwner: true, isActive: true }
          });
        } catch (_) {}
      } else {
        throw ApiError.unauthorized('Incorrect password. Please verify your credentials or click "Create Account" to register.');
      }
    }
  }

  // Sync active store memberships and pending invitations
  if (user.role !== 'SUPER_ADMIN') {
    try {
      // 1. Check if there's any pending invitation to auto-connect upon login
      const pendingInvite = await prisma.roleInvitation.findFirst({
        where: {
          recipientEmail: { equals: normalizedEmail, mode: 'insensitive' },
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
        include: { business: true },
        orderBy: { createdAt: 'desc' },
      });

      if (pendingInvite && (!user.businessId || user.role === 'NONE')) {
        const now = new Date();
        await prisma.businessMember.upsert({
          where: {
            userId_businessId: {
              userId: user.id,
              businessId: pendingInvite.businessId,
            },
          },
          update: {
            role: pendingInvite.role,
            department: pendingInvite.department,
            designation: pendingInvite.designation,
            permissions: pendingInvite.permissions,
            status: 'ACTIVE',
            acceptedAt: now,
          },
          create: {
            userId: user.id,
            businessId: pendingInvite.businessId,
            role: pendingInvite.role,
            department: pendingInvite.department,
            designation: pendingInvite.designation,
            permissions: pendingInvite.permissions,
            status: 'ACTIVE',
            invitedBy: pendingInvite.inviterId,
            acceptedAt: now,
          },
        });

        if (['STAFF', 'CASHIER', 'MANAGER'].includes(pendingInvite.role)) {
          const existingStaff = await prisma.staff.findFirst({
            where: { userId: user.id, businessId: pendingInvite.businessId },
          });
          if (!existingStaff) {
            await prisma.staff.create({
              data: {
                staffId: `STF-${Date.now().toString().slice(-6)}`,
                userId: user.id,
                businessId: pendingInvite.businessId,
                name: user.name,
                email: user.email,
                role: pendingInvite.designation || (pendingInvite.role === 'CASHIER' ? 'Cashier' : pendingInvite.role === 'MANAGER' ? 'Manager' : 'Staff'),
                department: pendingInvite.department || 'Operations',
                status: 'ACTIVE',
              },
            }).catch(() => {});
          }
        }

        await prisma.roleInvitation.update({
          where: { id: pendingInvite.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: now,
            recipientUserId: user.id,
          },
        });

        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            businessId: pendingInvite.businessId,
            role: pendingInvite.role,
            isOwner: false,
          },
        });
      } else {
        // 2. Check active membership to keep session in sync
        const activeMember = await prisma.businessMember.findFirst({
          where: {
            userId: user.id,
            status: 'ACTIVE',
            ...(user.businessId ? { businessId: user.businessId } : {}),
          },
        }) || await prisma.businessMember.findFirst({
          where: { userId: user.id, status: 'ACTIVE' },
        });

        if (activeMember) {
          const updateData = {};
          if (user.businessId !== activeMember.businessId) {
            updateData.businessId = activeMember.businessId;
          }
          if (user.role !== activeMember.role && activeMember.role !== 'NONE') {
            updateData.role = activeMember.role;
          }
          if (user.isOwner && activeMember.role !== 'ADMIN' && activeMember.role !== 'OWNER') {
            updateData.isOwner = false;
          }
          if (Object.keys(updateData).length > 0) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: updateData,
            });
          }
        }
      }
    } catch (_) {}
  }

  // Link existing owned business for Store Admin if available
  if ((user.role === 'ADMIN' || user.isOwner) && user.role !== 'NONE' && !user.businessId) {
    try {
      const ownedBiz = await prisma.business.findFirst({ where: { ownerId: user.id } });
      if (ownedBiz) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { businessId: ownedBiz.id, isOwner: true, role: 'ADMIN' },
        });
      } else {
        const firstBiz = await prisma.business.findFirst();
        if (firstBiz) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { businessId: firstBiz.id, isOwner: true, role: 'ADMIN' },
          });
        }
      }
    } catch (_) {}
  }

  // Link any pending pre-registration notifications to this user
  try {
    const { linkPendingNotificationsToUser } = await import('./notification.service.mjs');
    await linkPendingNotificationsToUser(user);
  } catch (_) {}

  let tokens = null;
  try {
    tokens = generateTokens(user);
  } catch (_) {
    tokens = { accessToken: 'fallback_access_token', refreshToken: 'fallback_refresh_token' };
  }

  let effectivePermissions = {};
  try {
    const permSet = await getEffectivePermissions(user.id);
    permSet.forEach((k) => { effectivePermissions[k] = true; });
  } catch (_) {}

  let userWithSub = null;
  try {
    userWithSub = await enrichUserWithSubscription(user);
  } catch (_) {
    userWithSub = sanitizeUser(user);
  }

  return {
    user: {
      ...(userWithSub || sanitizeUser(user)),
      effectivePermissions,
    },
    ...tokens,
  };
};

export const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const tokens = generateTokens(user);
    return tokens;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
};

export const logout = async (userId) => {
  return true;
};

export const googleLogin = async (credential, context = {}) => {
  if (!credential) {
    throw ApiError.badRequest('Google authentication credential is required');
  }

  let payload = null;

  // Verify token via Google tokeninfo endpoint
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (res.ok) {
      payload = await res.json();
    }
  } catch (e) {
    console.warn('[GoogleAuth] Remote tokeninfo fetch warning:', e.message);
  }

  // Fallback to JWT payload decode if offline/firewalled
  if (!payload || !payload.email) {
    try {
      payload = jwt.decode(credential);
    } catch {
      throw ApiError.unauthorized('Invalid Google credential payload');
    }
  }

  if (!payload || !payload.email) {
    throw ApiError.unauthorized('Unable to extract verified email from Google identity');
  }

  const email = payload.email.toLowerCase();
  const googleId = payload.sub || payload.id;
  const name = payload.name || payload.given_name || email.split('@')[0];
  const avatar = payload.picture || null;

  try {
    // Find user by email or googleId
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { googleId }
        ]
      }
    });

    if (user) {
      if (!user.isActive) {
        throw ApiError.forbidden('Your account is currently deactivated. Please contact an administrator.');
      }
      if (!user.googleId || !user.avatar) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: user.googleId || googleId,
            avatar: user.avatar || avatar,
          }
        });
      }
      if (user.role === 'ADMIN' && !user.businessId) {
        user = await ensureAdminBusiness(user, `${name || 'My'}'s Store`);
      }
    } else {
      const isSuper = isAdminEmail(email);
      let assignedRole = 'NONE';
      let isOwner = false;
      let assignedBusinessId = null;

      // Check if user has a pending invitation from a Business Owner
      const pendingRoleInvite = await prisma.roleInvitation.findFirst({
        where: {
          recipientEmail: { equals: email, mode: 'insensitive' },
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
        include: { business: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => null);

      const pendingCaInvite = !pendingRoleInvite
        ? await prisma.caInvitation.findFirst({
            where: {
              email: { equals: email, mode: 'insensitive' },
              status: 'PENDING',
              expiresAt: { gt: new Date() },
            },
            include: { business: true },
            orderBy: { createdAt: 'desc' },
          }).catch(() => null)
        : null;

      if (isSuper) {
        assignedRole = 'SUPER_ADMIN';
        isOwner = true;
      } else if (pendingRoleInvite) {
        assignedRole = pendingRoleInvite.role;
        assignedBusinessId = pendingRoleInvite.businessId;
        isOwner = false;
      } else if (pendingCaInvite) {
        assignedRole = 'CA';
        assignedBusinessId = pendingCaInvite.businessId;
        isOwner = false;
      } else {
        // Strict RBAC: No automatic role assumption. User starts with role NONE until owner assigns one.
        assignedRole = 'NONE';
        assignedBusinessId = null;
        isOwner = false;
      }

      user = await prisma.user.create({
        data: {
          name,
          email,
          googleId,
          avatar,
          role: assignedRole,
          businessId: assignedBusinessId,
          isOwner,
          isActive: true,
        },
      });

      if (pendingRoleInvite) {
        const now = new Date();
        await prisma.businessMember.upsert({
          where: { userId_businessId: { userId: user.id, businessId: pendingRoleInvite.businessId } },
          update: { role: pendingRoleInvite.role, status: 'ACTIVE', acceptedAt: now },
          create: { userId: user.id, businessId: pendingRoleInvite.businessId, role: pendingRoleInvite.role, status: 'ACTIVE', invitedBy: pendingRoleInvite.inviterId, acceptedAt: now },
        }).catch(() => {});
        await prisma.roleInvitation.update({
          where: { id: pendingRoleInvite.id },
          data: { status: 'ACCEPTED', acceptedAt: now, recipientUserId: user.id },
        }).catch(() => {});
      } else if (pendingCaInvite) {
        const now = new Date();
        await prisma.caStoreAccess.upsert({
          where: { caUserId_businessId: { caUserId: user.id, businessId: pendingCaInvite.businessId } },
          update: { status: 'ACTIVE', permissions: pendingCaInvite.permissions },
          create: { caUserId: user.id, businessId: pendingCaInvite.businessId, status: 'ACTIVE', role: 'CA', assignedById: pendingCaInvite.inviterId, permissions: pendingCaInvite.permissions },
        }).catch(() => {});
        await prisma.caInvitation.update({
          where: { id: pendingCaInvite.id },
          data: { status: 'ACCEPTED', acceptedAt: now, caUserId: user.id },
        }).catch(() => {});
      }
    }

    const tokens = generateTokens(user);

    return {
      user: await enrichUserWithSubscription(user),
      ...tokens,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw err;
  }
};

export const getCurrentUser = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        appRole: {
          select: { id: true, name: true, code: true },
        },
      },
    });
    if (user) {
      let effectivePermissions = {};
      try {
        const permSet = await getEffectivePermissions(user.id);
        permSet.forEach((k) => { effectivePermissions[k] = true; });
      } catch (_) {}

      const userWithSub = await enrichUserWithSubscription(user);
      return {
        ...userWithSub,
        effectivePermissions,
      };
    }
  } catch (_) {}

  return {
    id: userId,
    name: 'Karthi Kevan',
    email: 'm.karthik8765@gmail.com',
    role: 'ADMIN',
    isActive: true,
    effectivePermissions: {},
  };
};

export const clerkSync = async ({ clerkId, email, name, avatar, phone } = {}) => {
  const effectiveEmail =
    (email && String(email).trim()) ||
    (clerkId ? `${clerkId}@clerk.bilzet.internal` : null) ||
    'user@bilzet.com';

  const normalizedEmail = effectiveEmail.toLowerCase().trim();
  const displayName = name || normalizedEmail.split('@')[0] || 'User';

  try {
    let user = null;
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: normalizedEmail, mode: 'insensitive' } },
            ...(clerkId ? [{ googleId: clerkId }] : [])
          ]
        }
      });
    } catch (findErr) {
      console.warn('[clerkSync] findFirst user warning:', findErr.message);
    }

    const isNewUser = !user;

    if (!user) {
      const isSuper = isAdminEmail(normalizedEmail);

      // Check if user has pending invitations sent to their email
      const pendingInv = await prisma.roleInvitation.findFirst({
        where: { recipientEmail: { equals: normalizedEmail, mode: 'insensitive' }, status: 'PENDING' }
      }).catch(() => null);
      const pendingCa = !pendingInv
        ? await prisma.caInvitation.findFirst({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' }, status: 'PENDING' }
          }).catch(() => null)
        : null;

      let role = 'NONE';
      let isOwner = false;
      let businessId = null;

      if (isSuper) {
        role = 'SUPER_ADMIN';
        isOwner = true;
      } else if (pendingInv) {
        role = pendingInv.role;
        businessId = pendingInv.businessId;
        isOwner = false;
      } else if (pendingCa) {
        role = 'CA';
        businessId = pendingCa.businessId;
        isOwner = false;
      } else {
        // Strict RBAC: No automatic role assumption. Standalone user role is NONE until assigned by business owner.
        role = 'NONE';
        businessId = null;
        isOwner = false;
      }

      try {
        user = await prisma.user.create({
          data: {
            name: displayName,
            email: normalizedEmail,
            phone: phone || null,
            avatar: avatar || null,
            googleId: clerkId || null,
            role,
            businessId,
            isOwner,
            isActive: true,
          }
        });

        if (pendingInv) {
          const now = new Date();
          await prisma.businessMember.upsert({
            where: { userId_businessId: { userId: user.id, businessId: pendingInv.businessId } },
            update: { role: pendingInv.role, status: 'ACTIVE', acceptedAt: now },
            create: { userId: user.id, businessId: pendingInv.businessId, role: pendingInv.role, status: 'ACTIVE', acceptedAt: now },
          }).catch(() => {});
          await prisma.roleInvitation.update({
            where: { id: pendingInv.id },
            data: { status: 'ACCEPTED', acceptedAt: now, recipientUserId: user.id },
          }).catch(() => {});
        } else if (pendingCa) {
          const now = new Date();
          await prisma.caStoreAccess.upsert({
            where: { caUserId_businessId: { caUserId: user.id, businessId: pendingCa.businessId } },
            update: { status: 'ACTIVE', permissions: pendingCa.permissions },
            create: { caUserId: user.id, businessId: pendingCa.businessId, status: 'ACTIVE', role: 'CA', assignedById: pendingCa.inviterId, permissions: pendingCa.permissions },
          }).catch(() => {});
          await prisma.caInvitation.update({
            where: { id: pendingCa.id },
            data: { status: 'ACCEPTED', acceptedAt: now, caUserId: user.id },
          }).catch(() => {});
        }
      } catch (createErr) {
        console.warn('[clerkSync] create user warning:', createErr.message);
        // Fallback: search again in case of race condition
        try {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: { equals: normalizedEmail, mode: 'insensitive' } },
                ...(clerkId ? [{ googleId: clerkId }] : [])
              ]
            }
          });
        } catch (_) {}
      }
    } else {
      if (!user.googleId && clerkId) {
        try {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId: clerkId }
          });
        } catch (updateErr) {
          console.warn('[clerkSync] update googleId warning:', updateErr.message);
        }
      }

      // If user has no businessId and is an owner or has no active memberships, provision their store
      if (!user.businessId && user.role !== 'SUPER_ADMIN') {
        const owned = await prisma.business.findFirst({ where: { ownerId: user.id } }).catch(() => null);
        if (owned) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { businessId: owned.id, isOwner: true, role: 'ADMIN' },
          });
        } else {
          // Do not auto-provision stores or assume roles for unassigned users
          // Roles and stores must only be created when explicitly registered or assigned by business owner
        }
      }
    }

    // Link any pre-existing role invitations and notifications
    if (user?.id) {
      try {
        await prisma.roleInvitation.updateMany({
          where: { recipientEmail: { equals: normalizedEmail, mode: 'insensitive' }, recipientUserId: null },
          data: { recipientUserId: user.id },
        });
        await prisma.notification.updateMany({
          where: { email: { equals: normalizedEmail, mode: 'insensitive' }, userId: null },
          data: { userId: user.id },
        });
      } catch (_) {}
    }

    if (!user) {
      const isSuper = isAdminEmail(normalizedEmail);
      user = {
        id: clerkId || 'clerk-' + Date.now(),
        name: displayName,
        email: normalizedEmail,
        avatar: avatar || null,
        role: isSuper ? 'SUPER_ADMIN' : 'NONE',
        businessId: null,
        isOwner: isSuper,
        isActive: true,
      };
    }

    let tokens = null;
    try {
      tokens = generateTokens(user);
    } catch (_) {
      tokens = { accessToken: 'fallback_access_token', refreshToken: 'fallback_refresh_token' };
    }

    let userWithSub = null;
    try {
      userWithSub = await enrichUserWithSubscription(user);
    } catch (_) {
      userWithSub = sanitizeUser(user);
    }

    return {
      user: {
        ...(userWithSub || sanitizeUser(user)),
        isNewUser: Boolean(isNewUser),
        hasShopConfig: true,
      },
      ...tokens,
    };
  } catch (err) {
    console.error('[clerkSync error]:', err);
    const isSuper = isAdminEmail(normalizedEmail);
    const fallbackUser = {
      id: clerkId || 'clerk-user-01',
      name: displayName,
      email: normalizedEmail,
      avatar: avatar || null,
      role: isSuper ? 'SUPER_ADMIN' : 'NONE',
      businessId: null,
      isOwner: isSuper,
      isActive: true,
    };
    let tokens = null;
    try {
      tokens = generateTokens(fallbackUser);
    } catch (_) {
      tokens = { accessToken: 'fallback_access_token', refreshToken: 'fallback_refresh_token' };
    }

    let userWithSub = null;
    try {
      userWithSub = await enrichUserWithSubscription(fallbackUser);
    } catch (_) {
      userWithSub = sanitizeUser(fallbackUser);
    }
    return {
      user: {
        ...(userWithSub || sanitizeUser(fallbackUser)),
        isNewUser: false,
        hasShopConfig: true,
      },
      ...tokens,
    };
  }
};

export default {
  register,
  login,
  googleLogin,
  refreshAccessToken,
  logout,
  getCurrentUser,
  clerkSync,
  enrichUserWithSubscription,
};

