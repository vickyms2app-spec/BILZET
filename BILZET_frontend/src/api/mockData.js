// Demo / Mock Data for Offline & Guest Mode
export const mockDashboardData = {
  todaySales: 48250,
  todayProfit: 14600,
  todayBills: 38,
  todayExpenses: 3200,
  totalProducts: 142,
  totalCustomers: 89,
  lowStockProducts: 4,
  pendingPayments: 12400,
  salesByDay: [
    { date: "2026-09-21", sales: 28400, bills: 22 },
    { date: "2026-09-22", sales: 34200, bills: 27 },
    { date: "2026-09-23", sales: 31000, bills: 25 },
    { date: "2026-09-24", sales: 42800, bills: 34 },
    { date: "2026-09-25", sales: 39500, bills: 30 },
    { date: "2026-09-26", sales: 52100, bills: 41 },
    { date: "2026-09-27", sales: 48250, bills: 38 },
  ],
  topSellingProducts: [
    { _id: "p1", name: "Premium Basmati Rice 5kg", sku: "RIC-BAS-01", soldQuantity: 42, revenue: 18900 },
    { _id: "p2", name: "Cold-Pressed Sunflower Oil 1L", sku: "OIL-SUN-02", soldQuantity: 36, revenue: 6480 },
    { _id: "p3", name: "Organic Whole Wheat Atta 10kg", sku: "ATT-ORG-03", soldQuantity: 28, revenue: 11200 },
    { _id: "p4", name: "Tata Salt Crystal 1kg", sku: "SLT-TAT-04", soldQuantity: 55, revenue: 1650 },
    { _id: "p5", name: "Dairy Milk Silk 150g", sku: "CHOC-DM-05", soldQuantity: 31, revenue: 4650 },
  ],
  recentSales: [
    {
      _id: "s1",
      invoiceNumber: "INV-2026-0142",
      customer: { name: "Rajesh Kumar", phone: "9876543210" },
      grandTotal: 3420,
      paymentMethod: "upi",
      status: "COMPLETED",
      createdAt: new Date().toISOString(),
    },
    {
      _id: "s2",
      invoiceNumber: "INV-2026-0141",
      customer: { name: "Anita Sharma", phone: "9812345678" },
      grandTotal: 1850,
      paymentMethod: "cash",
      status: "COMPLETED",
      createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    },
    {
      _id: "s3",
      invoiceNumber: "INV-2026-0140",
      customer: { name: "Kiran Patel", phone: "9723456789" },
      grandTotal: 6200,
      paymentMethod: "card",
      status: "COMPLETED",
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    },
    {
      _id: "s4",
      invoiceNumber: "INV-2026-0139",
      customer: { name: "Walk-in Customer", phone: "" },
      grandTotal: 840,
      paymentMethod: "cash",
      status: "COMPLETED",
      createdAt: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    },
  ],
  lowStockProductsList: [
    { _id: "ls1", name: "Amul Butter 500g", sku: "BTR-AML-500", stock: 3, unit: "pack", minimumStock: 10 },
    { _id: "ls2", name: "Red Label Tea 500g", sku: "TEA-RED-500", stock: 2, unit: "box", minimumStock: 8 },
    { _id: "ls3", name: "Surf Excel Matic 2kg", sku: "DET-SRF-02", stock: 4, unit: "packet", minimumStock: 12 },
    { _id: "ls4", name: "Fortune Soya Chunks 200g", sku: "SOY-FRT-200", stock: 1, unit: "pack", minimumStock: 15 },
  ],
  paymentMethodSummary: [
    { method: "upi", amount: 26800, count: 21 },
    { method: "cash", amount: 14250, count: 12 },
    { method: "card", amount: 7200, count: 5 },
  ],
};

export const mockProducts = [
  { _id: "p1", name: "Premium Basmati Rice 5kg", sku: "RIC-BAS-01", category: "Grains", sellingPrice: 450, purchasePrice: 380, stock: 45, unit: "bag", gstRate: 5 },
  { _id: "p2", name: "Cold-Pressed Sunflower Oil 1L", sku: "OIL-SUN-02", category: "Oils", sellingPrice: 180, purchasePrice: 150, stock: 32, unit: "bottle", gstRate: 5 },
  { _id: "p3", name: "Organic Whole Wheat Atta 10kg", sku: "ATT-ORG-03", category: "Flours", sellingPrice: 400, purchasePrice: 330, stock: 28, unit: "bag", gstRate: 0 },
  { _id: "p4", name: "Amul Butter 500g", sku: "BTR-AML-500", category: "Dairy", sellingPrice: 275, purchasePrice: 240, stock: 3, unit: "pack", gstRate: 12 },
  { _id: "p5", name: "Tata Salt 1kg", sku: "SLT-TAT-04", category: "Spices", sellingPrice: 30, purchasePrice: 24, stock: 85, unit: "packet", gstRate: 0 },
  { _id: "p6", name: "Red Label Tea 500g", sku: "TEA-RED-500", category: "Beverages", sellingPrice: 310, purchasePrice: 265, stock: 2, unit: "box", gstRate: 5 },
];

export const mockCustomers = [
  { _id: "c1", name: "Rajesh Kumar", phone: "9876543210", email: "rajesh@example.com", balance: 0, totalOrders: 14 },
  { _id: "c2", name: "Anita Sharma", phone: "9812345678", email: "anita@example.com", balance: 1200, totalOrders: 8 },
  { _id: "c3", name: "Kiran Patel", phone: "9723456789", email: "kiran@example.com", balance: 0, totalOrders: 21 },
  { _id: "c4", name: "Suresh Reddy", phone: "9634567890", email: "suresh@example.com", balance: 3500, totalOrders: 5 },
];

export const mockCategories = [
  { _id: "cat1", name: "Grains & Cereals" },
  { _id: "cat2", name: "Dairy & Eggs" },
  { _id: "cat3", name: "Cooking Oils" },
  { _id: "cat4", name: "Beverages" },
  { _id: "cat5", name: "Snacks & Chocolates" },
];

export const mockInventory = [
  { _id: "inv-1", name: "Premium Basmati Rice 5kg", sku: "RIC-BAS-01", stock: 45, minimumStock: 10, value: 20250, unit: "bag", category: "Grains" },
  { _id: "inv-2", name: "Cold-Pressed Sunflower Oil 1L", sku: "OIL-SUN-02", stock: 32, minimumStock: 8, value: 5760, unit: "bottle", category: "Oils" },
  { _id: "inv-3", name: "Organic Whole Wheat Atta 10kg", sku: "ATT-ORG-03", stock: 28, minimumStock: 10, value: 11200, unit: "bag", category: "Flours" },
  { _id: "inv-4", name: "Amul Butter 500g", sku: "BTR-AML-500", stock: 3, minimumStock: 10, value: 825, unit: "pack", category: "Dairy" },
  { _id: "inv-5", name: "Tata Salt Crystal 1kg", sku: "SLT-TAT-04", stock: 85, minimumStock: 15, value: 2550, unit: "packet", category: "Spices" },
  { _id: "inv-6", name: "Red Label Tea 500g", sku: "TEA-RED-500", stock: 2, minimumStock: 8, value: 620, unit: "box", category: "Beverages" },
  { _id: "inv-7", name: "Surf Excel Matic 2kg", sku: "DET-SRF-02", stock: 4, minimumStock: 12, value: 1400, unit: "packet", category: "Household" },
  { _id: "inv-8", name: "Dairy Milk Silk 150g", sku: "CHOC-DM-05", stock: 31, minimumStock: 10, value: 4650, unit: "piece", category: "Snacks" },
];
