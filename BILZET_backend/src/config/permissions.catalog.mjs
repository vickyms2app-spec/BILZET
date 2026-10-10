/**
 * Bilzet Granular RBAC Permissions Catalog & System Role Definitions
 */

export const PERMISSIONS_CATALOG = [
  // Billing & Sales module
  { id: 'perm-01', key: 'billing.view', module: 'billing', action: 'view', description: 'View billing screen and invoice history' },
  { id: 'perm-02', key: 'billing.create', module: 'billing', action: 'create', description: 'Create and issue sales invoices' },
  { id: 'perm-03', key: 'billing.edit', module: 'billing', action: 'edit', description: 'Edit unfinalized draft invoices' },
  { id: 'perm-04', key: 'billing.cancel', module: 'billing', action: 'cancel', description: 'Cancel or void finalized sales invoices' },
  { id: 'perm-04b', key: 'billing.delete', module: 'billing', action: 'delete', description: 'Delete draft or void sales invoices' },
  { id: 'perm-05', key: 'billing.discount', module: 'billing', action: 'discount', description: 'Apply manual line or bill discounts' },
  { id: 'perm-06', key: 'billing.print', module: 'billing', action: 'print', description: 'Print A4, A5, or thermal invoice slips' },
  { id: 'perm-07', key: 'billing.export', module: 'billing', action: 'export', description: 'Export sales registers to Excel or CSV' },

  // Inventory & Stock module
  { id: 'perm-08', key: 'inventory.view', module: 'inventory', action: 'view', description: 'View product catalog, pricing and stock levels' },
  { id: 'perm-09', key: 'inventory.create', module: 'inventory', action: 'create', description: 'Add new products and barcodes' },
  { id: 'perm-10', key: 'inventory.edit', module: 'inventory', action: 'edit', description: 'Update product details, rates and tax rates' },
  { id: 'perm-11', key: 'inventory.delete', module: 'inventory', action: 'delete', description: 'Deactivate or delete inventory items' },
  { id: 'perm-12', key: 'inventory.adjust', module: 'inventory', action: 'adjust', description: 'Perform manual stock adjustments' },
  { id: 'perm-13', key: 'inventory.transfer', module: 'inventory', action: 'transfer', description: 'Transfer stock between godowns' },
  { id: 'perm-13b', key: 'inventory.print', module: 'inventory', action: 'print', description: 'Print barcode labels and stock sheets' },
  { id: 'perm-13c', key: 'inventory.export', module: 'inventory', action: 'export', description: 'Export inventory stock registers to Excel' },

  // Sales Operations (Challans, Returns, Ledger)
  { id: 'perm-14', key: 'sales_ops.challan', module: 'sales_ops', action: 'challan', description: 'Issue and manage delivery challans' },
  { id: 'perm-15', key: 'sales_ops.return', module: 'sales_ops', action: 'return', description: 'Accept customer sales returns' },
  { id: 'perm-16', key: 'sales_ops.payment', module: 'sales_ops', action: 'payment', description: 'Record customer credit dues payments' },
  { id: 'perm-16b', key: 'sales_ops.print', module: 'sales_ops', action: 'print', description: 'Print delivery challans and payment receipts' },
  { id: 'perm-16c', key: 'sales_ops.export', module: 'sales_ops', action: 'export', description: 'Export sales ops transactions' },

  // Purchases module
  { id: 'perm-17', key: 'purchases.view', module: 'purchases', action: 'view', description: 'View supplier purchases and orders' },
  { id: 'perm-18', key: 'purchases.create', module: 'purchases', action: 'create', description: 'Log purchase bills and orders' },
  { id: 'perm-19', key: 'purchases.edit', module: 'purchases', action: 'edit', description: 'Modify purchase bills and orders' },
  { id: 'perm-20', key: 'purchases.delete', module: 'purchases', action: 'delete', description: 'Delete purchase records' },
  { id: 'perm-21', key: 'purchases.debit', module: 'purchases', action: 'debit', description: 'Issue vendor debit notes' },
  { id: 'perm-21b', key: 'purchases.print', module: 'purchases', action: 'print', description: 'Print purchase orders and debit notes' },
  { id: 'perm-21c', key: 'purchases.export', module: 'purchases', action: 'export', description: 'Export purchases ledger to Excel' },

  // Customers CRM module
  { id: 'perm-22', key: 'customers.view', module: 'customers', action: 'view', description: 'Search and view customer profiles and ledgers' },
  { id: 'perm-23', key: 'customers.create', module: 'customers', action: 'create', description: 'Create new customer accounts' },
  { id: 'perm-24', key: 'customers.edit', module: 'customers', action: 'edit', description: 'Update customer credit limits and GSTIN' },
  { id: 'perm-25', key: 'customers.delete', module: 'customers', action: 'delete', description: 'Delete or deactivate customer profiles' },
  { id: 'perm-25b', key: 'customers.export', module: 'customers', action: 'export', description: 'Export customer directory to CSV/Excel' },

  // Staff & HR module
  { id: 'perm-26', key: 'staff.view', module: 'staff', action: 'view', description: 'View staff members and attendance status' },
  { id: 'perm-27', key: 'staff.create', module: 'staff', action: 'create', description: 'Add new staff members' },
  { id: 'perm-28', key: 'staff.edit', module: 'staff', action: 'edit', description: 'Update staff profiles and salaries' },
  { id: 'perm-28b', key: 'staff.delete', module: 'staff', action: 'delete', description: 'Remove or archive staff member profiles' },
  { id: 'perm-29', key: 'staff.attendance', module: 'staff', action: 'attendance', description: 'Log daily employee punches and hours' },
  { id: 'perm-30', key: 'staff.payroll', module: 'staff', action: 'payroll', description: 'Calculate and disburse monthly staff payroll' },
  { id: 'perm-30b', key: 'staff.print', module: 'staff', action: 'print', description: 'Print monthly payroll slips and cards' },
  { id: 'perm-30c', key: 'staff.export', module: 'staff', action: 'export', description: 'Export staff attendance and payroll registers' },

  // Attendance module (Self & Supervision)
  { id: 'perm-31', key: 'attendance.view_self', module: 'attendance', action: 'view_self', description: 'View personal attendance record and daily status' },
  { id: 'perm-32', key: 'attendance.check_in', module: 'attendance', action: 'check_in', description: 'Self punch-in daily working hours' },
  { id: 'perm-33', key: 'attendance.check_out', module: 'attendance', action: 'check_out', description: 'Self punch-out daily working hours' },
  { id: 'perm-34', key: 'attendance.view_all', module: 'attendance', action: 'view_all', description: 'Inspect all staff attendance across the business' },
  { id: 'perm-35', key: 'attendance.manage', module: 'attendance', action: 'manage', description: 'Supervise, adjust and correct employee attendance' },

  // Reports & Analytics module
  { id: 'perm-36', key: 'reports.view', module: 'reports', action: 'view', description: 'Access reporting overview' },
  { id: 'perm-37', key: 'reports.sales', module: 'reports', action: 'sales', description: 'Analyze sales revenue and daily/monthly trends' },
  { id: 'perm-38', key: 'reports.inventory', module: 'reports', action: 'inventory', description: 'View inventory valuation and turnover' },
  { id: 'perm-39', key: 'reports.profit_loss', module: 'reports', action: 'profit_loss', description: 'Inspect net profit and gross margins' },
  { id: 'perm-39b', key: 'reports.print', module: 'reports', action: 'print', description: 'Print summary reports and sales charts' },
  { id: 'perm-40', key: 'reports.export', module: 'reports', action: 'export', description: 'Export financial and audit statements' },

  // GST & Tax Filing module
  { id: 'perm-41', key: 'gst.view', module: 'gst', action: 'view', description: 'View GSTR-1, GSTR-3B and HSN tax summaries' },
  { id: 'perm-42', key: 'gst.export', module: 'gst', action: 'export', description: 'Export GST draft packets for portal upload' },

  // Settings & Team Management module
  { id: 'perm-43', key: 'settings.view', module: 'settings', action: 'view', description: 'View store settings and invoice styling' },
  { id: 'perm-44', key: 'settings.edit', module: 'settings', action: 'edit', description: 'Modify store details, bank accounts and templates' },
  { id: 'perm-45', key: 'team.view', module: 'settings', action: 'team_view', description: 'View team members and active accounts' },
  { id: 'perm-46', key: 'team.manage', module: 'settings', action: 'team_manage', description: 'Invite, edit, and deactivate team members' },
  { id: 'perm-46b', key: 'team.create', module: 'settings', action: 'team_create', description: 'Create and provision new sub-users' },
  { id: 'perm-46c', key: 'team.edit', module: 'settings', action: 'team_edit', description: 'Edit sub-user roles and credentials' },
  { id: 'perm-46d', key: 'team.delete', module: 'settings', action: 'team_delete', description: 'Deactivate or remove sub-users' },
  { id: 'perm-47', key: 'roles.manage', module: 'settings', action: 'roles_manage', description: 'Create and configure custom business roles' },
  { id: 'perm-48', key: 'subscription.manage', module: 'settings', action: 'sub_manage', description: 'View and upgrade subscription plan' },

  // Audit Logs
  { id: 'perm-49', key: 'audit_logs.view', module: 'audit_logs', action: 'view', description: 'View security audit logs and system activity' },

  // Chartered Accountant Portal
  { id: 'perm-50', key: 'ca_portal.view', module: 'ca_portal', action: 'view', description: 'Access dedicated Chartered Accountant Portal' },
];

export const SYSTEM_ROLE_DEFINITIONS = [
  {
    id: 'role-admin',
    code: 'ADMIN',
    name: 'Administrator',
    description: 'Full business administration and unrestricted access to all modules and actions',
    isSystem: true,
    businessId: null,
    permissions: PERMISSIONS_CATALOG.map((p) => p.key),
  },
  {
    id: 'role-manager',
    code: 'MANAGER',
    name: 'Manager',
    description: 'Operational manager with complete access to billing, inventory, purchasing, customers, staff supervision and reports',
    isSystem: true,
    businessId: null,
    permissions: [
      'billing.view', 'billing.create', 'billing.edit', 'billing.print', 'billing.export',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust', 'inventory.transfer', 'inventory.print', 'inventory.export',
      'sales_ops.challan', 'sales_ops.return', 'sales_ops.payment', 'sales_ops.print', 'sales_ops.export',
      'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.debit', 'purchases.print', 'purchases.export',
      'customers.view', 'customers.create', 'customers.edit', 'customers.export',
      'staff.view', 'staff.attendance',
      'attendance.view_self', 'attendance.check_in', 'attendance.check_out', 'attendance.view_all', 'attendance.manage',
      'reports.view', 'reports.sales', 'reports.inventory', 'reports.print', 'reports.export',
      'gst.view',
      'settings.view',
      'team.view',
    ],
  },
  {
    id: 'role-staff',
    code: 'STAFF',
    name: 'Staff',
    description: 'General staff member with billing POS, inventory lookup, order delivery, customer registry, and shift punch clock',
    isSystem: true,
    businessId: null,
    permissions: [
      'billing.view', 'billing.create', 'billing.print',
      'inventory.view',
      'sales_ops.challan',
      'customers.view', 'customers.create',
      'attendance.view_self', 'attendance.check_in', 'attendance.check_out',
    ],
  },
  {
    id: 'role-cashier',
    code: 'CASHIER',
    name: 'Cashier',
    description: 'Focused counter checkout operator for billing, customer lookup, and shift attendance',
    isSystem: true,
    businessId: null,
    permissions: [
      'billing.view', 'billing.create', 'billing.print',
      'inventory.view',
      'customers.view', 'customers.create',
      'attendance.view_self', 'attendance.check_in', 'attendance.check_out',
    ],
  },
  {
    id: 'role-sales-staff',
    code: 'SALES_STAFF',
    name: 'Sales Staff',
    description: 'Front-desk sales operator with order, challan and attendance capabilities',
    isSystem: true,
    businessId: null,
    permissions: [
      'billing.view', 'billing.create', 'billing.print',
      'inventory.view',
      'sales_ops.challan', 'sales_ops.payment',
      'customers.view', 'customers.create',
      'attendance.view_self', 'attendance.check_in', 'attendance.check_out',
    ],
  },
  {
    id: 'role-inventory-staff',
    code: 'INVENTORY_STAFF',
    name: 'Inventory & Godown Staff',
    description: 'Manages physical warehouse stock, deliveries, adjustments and attendance',
    isSystem: true,
    businessId: null,
    permissions: [
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust', 'inventory.transfer',
      'purchases.view', 'purchases.create',
      'attendance.view_self', 'attendance.check_in', 'attendance.check_out',
    ],
  },
  {
    id: 'role-purchase-staff',
    code: 'PURCHASE_STAFF',
    name: 'Procurement Specialist',
    description: 'Manages vendor relationships, purchase bills, purchase orders and attendance',
    isSystem: true,
    businessId: null,
    permissions: [
      'inventory.view',
      'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.debit',
      'attendance.view_self', 'attendance.check_in', 'attendance.check_out',
    ],
  },
  {
    id: 'role-hr-manager',
    code: 'HR_MANAGER',
    name: 'HR & Payroll Manager',
    description: 'Oversees employee roster, daily attendance punches, and payroll slips',
    isSystem: true,
    businessId: null,
    permissions: [
      'staff.view', 'staff.create', 'staff.edit', 'staff.attendance', 'staff.payroll',
      'attendance.view_self', 'attendance.check_in', 'attendance.check_out', 'attendance.view_all', 'attendance.manage',
    ],
  },
  {
    id: 'role-viewer',
    code: 'VIEWER',
    name: 'Read-Only Auditor / Viewer',
    description: 'Auditor or stakeholder with read-only inspection capabilities',
    isSystem: true,
    businessId: null,
    permissions: [
      'billing.view', 'billing.print',
      'inventory.view',
      'customers.view',
      'attendance.view_self',
      'reports.view', 'reports.sales',
    ],
  },
  {
    id: 'role-ca',
    code: 'CA',
    name: 'Chartered Accountant',
    description: 'Financial auditor with dedicated access to CA portal, sales registers, GST tax reports and audit statements for authorized stores',
    isSystem: true,
    businessId: null,
    permissions: [
      'ca_portal.view',
      'billing.view',
      'billing.export',
      'billing.print',
      'gst.view',
      'gst.export',
      'reports.view',
      'reports.sales',
      'reports.profit_loss',
      'reports.export',
    ],
  },
];
