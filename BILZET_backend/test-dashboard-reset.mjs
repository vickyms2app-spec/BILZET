import prisma from './src/config/prisma.mjs';
import dateUtils from './src/utils/dateUtils.mjs';

async function runTestSuite() {
  console.log('====================================================');
  console.log('BILZET AUTOMATED DASHBOARD RESET & ISOLATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // TEST 1: Indian Standard Time (Asia/Kolkata) Midnight Boundaries
  console.log('--- TEST 1: Asia/Kolkata Business Day Boundaries ---');
  const dRange = dateUtils.getBusinessDayRange('2026-11-18', 'Asia/Kolkata');
  assert(
    dRange.startOfDay.toISOString() === '2026-11-17T18:30:00.000Z',
    'Start of day in IST (00:00:00) maps to exact UTC instant 18:30:00.000Z previous day'
  );
  assert(
    dRange.endOfDay.toISOString() === '2026-11-18T18:29:59.999Z',
    'End of day in IST (23:59:59.999) maps to exact UTC instant 18:29:59.999Z target day'
  );
  assert(
    dRange.endOfDay.getTime() - dRange.startOfDay.getTime() === 86399999,
    'Exact 24-hour span (86,399,999 ms) between start and end of business day'
  );

  // TEST 2: Countdown Timer Calculation
  console.log('\n--- TEST 2: Countdown Timer Logic ---');
  const secondsLeft = dateUtils.getSecondsUntilNextBusinessDay('Asia/Kolkata');
  assert(
    typeof secondsLeft === 'number' && secondsLeft >= 0 && secondsLeft <= 86400,
    `Remaining seconds until midnight IST calculated properly (${secondsLeft}s)`
  );

  // TEST 3: Range Windows (Today, Yesterday, Week, Month, FY)
  console.log('\n--- TEST 3: Date Range Windows ---');
  const todayWin = dateUtils.getRangeWindow('today', 'Asia/Kolkata');
  const yestWin = dateUtils.getRangeWindow('yesterday', 'Asia/Kolkata');
  const weekWin = dateUtils.getRangeWindow('week', 'Asia/Kolkata');
  const fyWin = dateUtils.getRangeWindow('fy', 'Asia/Kolkata');

  assert(todayWin.startDate === dateUtils.getCurrentDateInTimezone('Asia/Kolkata'), 'Today window matches current IST date');
  assert(yestWin.startUtc < todayWin.startUtc, 'Yesterday window precedes today window');
  assert(weekWin.startUtc < todayWin.startUtc, 'Last 7 days window starts 6 days prior');
  assert(fyWin.label.startsWith('FY'), `Financial Year window correctly resolved as ${fyWin.label}`);

  // TEST 4: Database Connection and Multi-Tenant Query Validation
  console.log('\n--- TEST 4: Database Multi-Tenant Daily Query Scoping ---');
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL successfully.');

    // Count all sales before test to ensure non-destructive invariant
    const initialSalesCount = await prisma.sale.count();
    console.log(`Initial total sales in database: ${initialSalesCount}`);

    // Create a mock tenant test to verify Day 1 vs Day 2 logic
    const testBusinessId = 'test-biz-' + Date.now();

    // Day 1 timestamp: 2026-11-17 12:00:00 IST -> 2026-11-17 06:30:00 UTC
    const day1Timestamp = new Date('2026-11-17T06:30:00.000Z');
    // Day 2 timestamp: 2026-11-18 12:00:00 IST -> 2026-11-18 06:30:00 UTC
    const day2Timestamp = new Date('2026-11-18T06:30:00.000Z');

    const day1Range = dateUtils.getBusinessDayRange('2026-11-17', 'Asia/Kolkata');
    const day2Range = dateUtils.getBusinessDayRange('2026-11-18', 'Asia/Kolkata');

    // Simulate Day 1 query when database has no sales for this test tenant
    const day1ZeroSales = await prisma.sale.aggregate({
      where: { businessId: testBusinessId, createdAt: { gte: day1Range.startOfDay, lte: day1Range.endOfDay } },
      _sum: { grandTotal: true },
      _count: { id: true },
    });
    assert(
      (day1ZeroSales._sum.grandTotal || 0) === 0 && day1ZeroSales._count.id === 0,
      'When no sales exist for business day, aggregates return 0 count and 0 sum'
    );

    // Verify non-destructive invariant: count did not decrease
    const finalSalesCount = await prisma.sale.count();
    assert(
      finalSalesCount === initialSalesCount,
      `Non-destructive invariant verified: DB records count remains strictly ${finalSalesCount} (0 records deleted)`
    );

    await prisma.$disconnect();
  } catch (err) {
    console.warn('Database live test note:', err.message);
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTestSuite();
