// Clean Production Fallbacks
export const mockDashboardData = {
  todaySales: 28450,
  todayProfit: 14650,
  todayBills: 18,
  todayPurchases: 8400,
  todayExpenses: 1200,
  totalProducts: 48,
  totalCustomers: 24,
  lowStockProducts: 4,
  lowStockCount: 4,
  gstCollected: 3840,
  pendingPayments: 18750,
  salesByDay: [],
  trendData: {
    '7days': [
      { day: "Tue", sales: 22300, purchases: 10500 },
      { day: "Wed", sales: 17900, purchases: 7800 },
      { day: "Thu", sales: 24800, purchases: 11400 },
      { day: "Fri", sales: 19400, purchases: 6200 },
      { day: "Sat", sales: 31300, purchases: 9500 },
      { day: "Sun", sales: 26600, purchases: 12000 },
      { day: "Today", sales: 28450, purchases: 8400 }
    ],
    'month': [
      { day: "Week 1", sales: 132000, purchases: 58000 },
      { day: "Week 2", sales: 148000, purchases: 62000 },
      { day: "Week 3", sales: 154000, purchases: 54000 },
      { day: "Week 4", sales: 142000, purchases: 66000 }
    ],
    'year': [
      { day: "Jan", sales: 420000, purchases: 195000 },
      { day: "Feb", sales: 450000, purchases: 210000 },
      { day: "Mar", sales: 480000, purchases: 215000 },
      { day: "Apr", sales: 510000, purchases: 220000 },
      { day: "May", sales: 530000, purchases: 240000 },
      { day: "Jun", sales: 560000, purchases: 250000 },
      { day: "Jul", sales: 540000, purchases: 235000 },
      { day: "Aug", sales: 580000, purchases: 260000 },
      { day: "Sep", sales: 590000, purchases: 270000 },
      { day: "Oct", sales: 610000, purchases: 280000 },
      { day: "Nov", sales: 630000, purchases: 290000 },
      { day: "Dec", sales: 650000, purchases: 310000 }
    ]
  },
  paymentHealth: {
    total: 91700,
    collected: 34200,
    pending: 44500,
    overdue: 13000,
    collectedPct: 37,
    pendingPct: 49,
    overduePct: 14
  },
  topSellingProducts: [],
  recentSales: [],
  lowStockProductsList: [],
  paymentMethodSummary: [],
};

export const mockProducts = [];
export const mockCustomers = [];
export const mockCategories = [];
export const mockInventory = [];

export const mockTeamMembers = [
  {
    id: "mock-1",
    _id: "mock-1",
    name: "Karthik Raja (Owner)",
    email: "owner@bilzet.com",
    phone: "+91 98765 43210",
    role: "ADMIN",
    roleName: "Store Owner",
    isOwner: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-2",
    _id: "mock-2",
    name: "Suresh Kumar",
    email: "suresh.cashier@bilzet.com",
    phone: "+91 98412 34567",
    role: "CASHIER",
    roleName: "Cashier",
    isOwner: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-3",
    _id: "mock-3",
    name: "Ananya Ramesh",
    email: "ananya.inventory@bilzet.com",
    phone: "+91 97890 12345",
    role: "INVENTORY_STAFF",
    roleName: "Inventory Staff",
    isOwner: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export const mockRoles = [
  { id: "role-1", _id: "role-1", name: "Administrator", code: "ADMIN", isSystem: true, description: "Full business management", userCount: 1, permissionsCount: 45 },
  { id: "role-2", _id: "role-2", name: "Manager", code: "MANAGER", isSystem: true, description: "Operational manager", userCount: 0, permissionsCount: 28 },
  { id: "role-staff", _id: "role-staff", name: "Staff", code: "STAFF", isSystem: true, description: "General store staff", userCount: 1, permissionsCount: 10 },
  { id: "role-3", _id: "role-3", name: "Cashier", code: "CASHIER", isSystem: true, description: "Counter checkout and sales", userCount: 1, permissionsCount: 8 },
  { id: "role-4", _id: "role-4", name: "Inventory Staff", code: "INVENTORY_STAFF", isSystem: true, description: "Stock and warehouse control", userCount: 1, permissionsCount: 7 },
  { id: "role-5", _id: "role-5", name: "HR Manager", code: "HR_MANAGER", isSystem: true, description: "Attendance and payroll", userCount: 0, permissionsCount: 5 },
];

export const mockPermissionsCatalog = {
  permissions: [
    { id: "p1", key: "billing.view", module: "billing", action: "view", description: "View billing screen and invoices" },
    { id: "p2", key: "billing.create", module: "billing", action: "create", description: "Create and issue sales invoices" },
    { id: "p3", key: "billing.cancel", module: "billing", action: "cancel", description: "Cancel or void sales invoices" },
    { id: "p4", key: "billing.discount", module: "billing", action: "discount", description: "Apply manual line discounts" },
    { id: "p5", key: "billing.print", module: "billing", action: "print", description: "Print A4/A5/thermal invoice slips" },
    { id: "p6", key: "inventory.view", module: "inventory", action: "view", description: "View products and stock levels" },
    { id: "p7", key: "inventory.create", module: "inventory", action: "create", description: "Add new products and barcodes" },
    { id: "p8", key: "inventory.adjust", module: "inventory", action: "adjust", description: "Perform stock adjustments" },
    { id: "p9", key: "inventory.transfer", module: "inventory", action: "transfer", description: "Transfer stock between godowns" },
    { id: "p10", key: "customers.view", module: "customers", action: "view", description: "Search customer directory" },
    { id: "p11", key: "customers.create", module: "customers", action: "create", description: "Create new customer profiles" },
    { id: "p12", key: "reports.view", module: "reports", action: "view", description: "Access reporting analytics" },
    { id: "p13", key: "reports.sales", module: "reports", action: "sales", description: "Analyze sales and revenue" },
    { id: "p14", key: "reports.profit_loss", module: "reports", action: "profit_loss", description: "Inspect profit and loss" },
    { id: "p15", key: "staff.attendance", module: "staff", action: "attendance", description: "Log daily attendance" },
    { id: "p16", key: "staff.payroll", module: "staff", action: "payroll", description: "Compute and disburse payroll" },
    { id: "p17", key: "gst.view", module: "gst", action: "view", description: "View GSTR-1 and GSTR-3B" },
    { id: "p18", key: "settings.edit", module: "settings", action: "edit", description: "Modify store configurations" },
    { id: "p19", key: "team.manage", module: "settings", action: "team_manage", description: "Manage team members and sub-users" },
  ],
  grouped: {
    billing: [
      { id: "p1", key: "billing.view", module: "billing", action: "view", description: "View billing screen and invoices" },
      { id: "p2", key: "billing.create", module: "billing", action: "create", description: "Create and issue sales invoices" },
      { id: "p3", key: "billing.cancel", module: "billing", action: "cancel", description: "Cancel or void sales invoices" },
      { id: "p4", key: "billing.discount", module: "billing", action: "discount", description: "Apply manual line discounts" },
      { id: "p5", key: "billing.print", module: "billing", action: "print", description: "Print A4/A5/thermal invoice slips" },
    ],
    inventory: [
      { id: "p6", key: "inventory.view", module: "inventory", action: "view", description: "View products and stock levels" },
      { id: "p7", key: "inventory.create", module: "inventory", action: "create", description: "Add new products and barcodes" },
      { id: "p8", key: "inventory.adjust", module: "inventory", action: "adjust", description: "Perform stock adjustments" },
      { id: "p9", key: "inventory.transfer", module: "inventory", action: "transfer", description: "Transfer stock between godowns" },
    ],
    customers: [
      { id: "p10", key: "customers.view", module: "customers", action: "view", description: "Search customer directory" },
      { id: "p11", key: "customers.create", module: "customers", action: "create", description: "Create new customer profiles" },
    ],
    reports: [
      { id: "p12", key: "reports.view", module: "reports", action: "view", description: "Access reporting analytics" },
      { id: "p13", key: "reports.sales", module: "reports", action: "sales", description: "Analyze sales and revenue" },
      { id: "p14", key: "reports.profit_loss", module: "reports", action: "profit_loss", description: "Inspect profit and loss" },
    ],
    staff: [
      { id: "p15", key: "staff.attendance", module: "staff", action: "attendance", description: "Log daily attendance" },
      { id: "p16", key: "staff.payroll", module: "staff", action: "payroll", description: "Compute and disburse payroll" },
    ],
    settings: [
      { id: "p18", key: "settings.edit", module: "settings", action: "edit", description: "Modify store configurations" },
      { id: "p19", key: "team.manage", module: "settings", action: "team_manage", description: "Manage team members and sub-users" },
    ],
  },
  modules: ["billing", "inventory", "customers", "reports", "staff", "settings"],
};

export const mockSubscriptionUsage = {
  planTier: "PRO",
  planName: "Pro Annual",
  usedSeats: 2,
  maxSeats: 5,
  remainingSeats: 3,
  canAddUser: true,
};

