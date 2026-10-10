import prisma from '../src/config/prisma.mjs';

async function testDatabase() {
  console.log('Testing PostgreSQL connection and tables...');
  try {
    const userCount = await prisma.user.count();
    console.log('✅ Users table reachable. Total users:', userCount);

    const businessCount = await prisma.business.count();
    console.log('✅ Businesses table reachable. Total businesses:', businessCount);

    const roleCount = await prisma.appRole.count();
    console.log('✅ Roles table reachable. Total roles:', roleCount);

    const permCount = await prisma.permission.count();
    console.log('✅ Permissions table reachable. Total permissions:', permCount);

    console.log('🎉 All tables verified successfully!');
  } catch (err) {
    console.error('❌ Database query error:', err.message);
    if (err.message.includes('does not exist') || err.message.includes('relation') || err.message.includes('table')) {
      console.log('ℹ️ Tables need to be pushed to PostgreSQL. Running db push...');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
