import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  Calendar,
  Activity,
  CheckSquare,
  FileText,
  AlertTriangle,
  Clock,
  Plus,
  Download,
  Search,
  Filter,
  ChevronRight,
  X,
  Eye,
  Check,
  FileSpreadsheet,
  Paperclip,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  RefreshCw,
  Printer,
  ChevronDown,
  Info,
  DollarSign,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import Button from "../components/common/Button";
import { caPortalApi } from "../api";

export default function CaAuditWorkspace({
  stores = [],
  selectedStoreId = "",
  setSelectedStoreId = () => {},
  user = {},
  onNavigateTab = () => {},
}) {
  // Active store lookup
  const activeStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || stores[0] || null;
  }, [stores, selectedStoreId]);

  // Financial Year State
  const currentYear = new Date().getFullYear();
  const [selectedFY, setSelectedFY] = useState(() => {
    const m = new Date().getMonth();
    return m >= 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
  });

  // Engagement Status
  const [engagementStatus, setEngagementStatus] = useState("FIELDWORK_IN_PROGRESS");
  const [statusNotification, setStatusNotification] = useState(null);

  // Main 3 Tabs: "checklist" | "working_papers" | "findings"
  const [activeTab, setActiveTab] = useState("checklist");

  // Loading & Data State
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [documents, setDocuments] = useState([]);

  // Modals & Drawers
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [selectedWorkingPaper, setSelectedWorkingPaper] = useState(null);
  const [selectedFinding, setSelectedFinding] = useState(null);

  const [addWpModalOpen, setAddWpModalOpen] = useState(false);
  const [addFindingModalOpen, setAddFindingModalOpen] = useState(false);

  // Working Paper Form State
  const [wpForm, setWpForm] = useState({
    code: "",
    title: "",
    area: "SALES",
    preparer: user?.name || "Audit Staff",
    description: "",
  });

  // Finding Form State
  const [findingForm, setFindingForm] = useState({
    title: "",
    category: "TAX_MISMATCH",
    financialImpact: "",
    responsiblePerson: "",
    dueDate: "",
    description: "",
  });

  // Searches & Filter
  const [checklistFilter, setChecklistFilter] = useState("ALL");
  const [wpSearch, setWpSearch] = useState("");
  const [findingSearch, setFindingSearch] = useState("");
  const [findingStatusFilter, setFindingStatusFilter] = useState("ALL");

  // Standard Audit Checklist Procedures
  const initialProcedures = useMemo(() => [
    // 1. Sales
    {
      id: "REV-01",
      name: "Sales Invoicing Completeness & Sequence Test",
      category: "Sales",
      objective: "Verify unbroken sequential invoice numbering and completeness of turnover.",
      sampleSize: "100% automated check of invoice sequences",
      testedCount: 45,
      evidence: "Sales Register Export, Void Invoices Log",
      preparer: "Audit Senior",
      reviewer: "Chartered Accountant",
      status: "VERIFIED",
      notes: "Sequential numbering verified without gaps. All voided bills have documented reasons.",
      history: [
        { date: "2026-10-15", action: "Tested 45 invoice samples", by: "Audit Senior" },
        { date: "2026-10-16", action: "Signed off procedure", by: "Partner CA" },
      ],
    },
    {
      id: "REV-02",
      name: "Cutoff Testing on Year-End Sales & Credit Notes",
      category: "Sales",
      objective: "Ensure sales recorded in the current financial year belong to this accounting period.",
      sampleSize: "Last 5 days before & first 5 days after cutoff",
      testedCount: 14,
      evidence: "Delivery Challans, Dispatch Slips",
      preparer: "Staff Auditor",
      reviewer: "Audit Senior",
      status: "IN_PROGRESS",
      notes: "3 high-value sales on month-end being corroborated against delivery confirmations.",
      history: [
        { date: "2026-10-16", action: "Sample selected from billing ledger", by: "Staff Auditor" },
      ],
    },
    // 2. Purchases
    {
      id: "PUR-01",
      name: "Supplier Inward Bill Verification & Authorization",
      category: "Purchases",
      objective: "Confirm purchase bills are authorized and match received inventory quantities.",
      sampleSize: "All purchases > ₹20,000",
      testedCount: 22,
      evidence: "Vendor Invoices, Purchase Orders",
      preparer: "Audit Senior",
      reviewer: "Chartered Accountant",
      status: "VERIFIED",
      notes: "All purchases over ₹20,000 reconciled with purchase orders and goods received notes.",
      history: [
        { date: "2026-10-14", action: "Matched POs with vendor bills", by: "Audit Senior" },
      ],
    },
    {
      id: "PUR-02",
      name: "Section 16(2) ITC Eligibility & Supplier GSTIN Active Status",
      category: "Purchases",
      objective: "Verify GSTIN validity of suppliers for input tax credit eligibility.",
      sampleSize: "All purchase invoices with GST > ₹1,000",
      testedCount: 38,
      evidence: "GSTR-2B Inward Data, Supplier Tax Invoices",
      preparer: "Staff Auditor",
      reviewer: "Audit Senior",
      status: "PENDING",
      notes: "Verifying supplier filings against monthly inward statements.",
      history: [],
    },
    // 3. Bank
    {
      id: "BNK-01",
      name: "Bank Statement Reconciliation & Ledger Balancing",
      category: "Bank",
      objective: "Ensure internal bank ledger balances match certified bank statements.",
      sampleSize: "Monthly bank statements for all active accounts",
      testedCount: 12,
      evidence: "Bank Statements, Bank Reconciliation Statement",
      preparer: "Audit Senior",
      reviewer: "Chartered Accountant",
      status: "VERIFIED",
      notes: "Bank reconciliation completed with zero unadjusted variance.",
      history: [
        { date: "2026-10-10", action: "Matched monthly statements", by: "Audit Senior" },
        { date: "2026-10-12", action: "BRS verified and signed", by: "Partner CA" },
      ],
    },
    {
      id: "BNK-02",
      name: "Section 40A(3) Cash Payment Limit Compliance",
      category: "Bank",
      objective: "Check that no expenditure exceeds ₹10,000 in cash in a single day.",
      sampleSize: "100% scan of cash book expense vouchers",
      testedCount: 160,
      evidence: "Day Book Cash Summary, Expense Vouchers",
      preparer: "Audit Senior",
      reviewer: "Chartered Accountant",
      status: "VERIFIED",
      notes: "All cash payments complied with the ₹10,000 limit.",
      history: [],
    },
    // 4. GST
    {
      id: "GST-01",
      name: "GSTR-1 vs GSTR-3B Tax Turnover Cross-Verification",
      category: "GST",
      objective: "Reconcile outward supplies declared in GSTR-1 against monthly GSTR-3B liability.",
      sampleSize: "Monthly returns across selected financial year",
      testedCount: 6,
      evidence: "Filed GSTR-1, GSTR-3B Acknowledgements",
      preparer: "Tax Senior",
      reviewer: "Chartered Accountant",
      status: "VERIFIED",
      notes: "Turnover matches perfectly across returns.",
      history: [
        { date: "2026-10-16", action: "Cross-reconciliation completed", by: "Tax Senior" },
      ],
    },
    {
      id: "GST-02",
      name: "Rate-wise Slab Classification & HSN Summary Scrutiny",
      category: "GST",
      objective: "Confirm correct GST tariff rates (0%, 5%, 12%, 18%, 28%) and mandatory 4/6 digit HSN codes.",
      sampleSize: "Product master catalog and high turnover items",
      testedCount: 85,
      evidence: "Product Master Tax Configuration, Item Ledger",
      preparer: "Staff Auditor",
      reviewer: "Audit Senior",
      status: "PENDING",
      notes: "Sample testing of items with recent rate changes pending.",
      history: [],
    },
    // 5. Inventory
    {
      id: "INV-01",
      name: "Stock Register Valuation & Negative Stock Check",
      category: "Inventory",
      objective: "Ensure closing inventory is valued as per AS-2 and no negative stocks exist.",
      sampleSize: "Full SKU inventory ledger",
      testedCount: 140,
      evidence: "Physical Stock Count Sheet, Valuation Ledger",
      preparer: "Audit Senior",
      reviewer: "Chartered Accountant",
      status: "IN_PROGRESS",
      notes: "Valuation applied using FIFO method. 2 low-stock SKUs being reviewed.",
      history: [
        { date: "2026-10-15", action: "Exported inventory valuation", by: "Audit Senior" },
      ],
    },
    // 6. Financial Statements
    {
      id: "FIN-01",
      name: "Debtor & Creditor Ledger Scrutiny and Ageing Review",
      category: "Financial Statements",
      objective: "Scrutinize customer dues and vendor payables, highlighting debts > 180 days.",
      sampleSize: "Outstanding receivables and payables balances",
      testedCount: 30,
      evidence: "Receivables Ageing Schedule, Vendor Confirmations",
      preparer: "Audit Senior",
      reviewer: "Chartered Accountant",
      status: "PENDING",
      notes: "Balance confirmation letters issued to top 10 parties.",
      history: [],
    },
    {
      id: "FIN-02",
      name: "Period Closing Reconciliations & Journal Vouchers Review",
      category: "Financial Statements",
      objective: "Review manual journal entries, depreciation calculations, and accruals.",
      sampleSize: "All month-end adjustment entries",
      testedCount: 18,
      evidence: "General Journal, Depreciation Schedule",
      preparer: "Staff Auditor",
      reviewer: "Audit Senior",
      status: "PENDING",
      notes: "Depreciation rates calculated as per Companies Act Schedule II.",
      history: [],
    },
  ], []);

  const [procedures, setProcedures] = useState(initialProcedures);

  // Local Working Papers
  const [workingPapers, setWorkingPapers] = useState([
    {
      id: "WP-SAL-01",
      title: "Sales Turnover & Return Analysis",
      area: "Sales",
      evidenceCount: 3,
      preparer: "Audit Senior",
      reviewer: "Partner CA",
      status: "APPROVED",
      updatedAt: "2026-10-16",
      scope: "Substantive testing of outward billing and credit note authorizations.",
      files: ["sales_register_q2.xlsx", "void_bills_log.pdf", "sample_selection_workings.pdf"],
    },
    {
      id: "WP-PUR-01",
      title: "Inward Supplies & ITC Claim Eligibility",
      area: "Purchases",
      evidenceCount: 2,
      preparer: "Staff Auditor",
      reviewer: "Audit Senior",
      status: "UNDER_REVIEW",
      updatedAt: "2026-10-15",
      scope: "Verification of supplier GSTIN status, tax invoice conformity, and Section 16(2) compliance.",
      files: ["purchase_itc_audit.xlsx", "supplier_gstin_mismatch.pdf"],
    },
    {
      id: "WP-BNK-01",
      title: "Bank Accounts & Cash Verification",
      area: "Bank",
      evidenceCount: 4,
      preparer: "Audit Senior",
      reviewer: "Partner CA",
      status: "APPROVED",
      updatedAt: "2026-10-12",
      scope: "Independent bank reconciliation, direct bank confirmation, and cash count certificates.",
      files: ["brs_current_ac_01.pdf", "bank_confirmation_letter.pdf", "cash_count_sheet.pdf"],
    },
    {
      id: "WP-GST-01",
      title: "GSTR-1, 2B and 3B Triangulation",
      area: "GST",
      evidenceCount: 2,
      preparer: "Tax Senior",
      reviewer: "Audit Senior",
      status: "UNDER_REVIEW",
      updatedAt: "2026-10-16",
      scope: "Automated triangulation of book sales against monthly portal filings and e-way bill threshold review.",
      files: ["gstr1_vs_3b_variance.xlsx", "e_way_bill_register.pdf"],
    },
    {
      id: "WP-INV-01",
      title: "Inventory Valuation & Cutoff Workpaper",
      area: "Inventory",
      evidenceCount: 1,
      preparer: "Audit Senior",
      reviewer: "Partner CA",
      status: "DRAFT",
      updatedAt: "2026-10-15",
      scope: "Stock count observation report, testing of unit costing, and slow-moving stock provisioning.",
      files: ["stock_valuation_summary.xlsx"],
    },
  ]);

  // Local Audit Findings
  const [findings, setFindings] = useState([
    {
      id: "FND-001",
      title: "Supplier GSTIN Inactive during Invoice Date",
      category: "TAX_MISMATCH",
      financialImpact: 14500,
      responsiblePerson: "Finance Manager (Client)",
      dueDate: "2026-10-25",
      status: "OPEN",
      description: "Vendor bill #V-4420 claimed ₹14,500 ITC, but supplier GSTIN was marked suspended during delivery.",
      resolutionNotes: "Client notified to seek revised invoice or credit note from vendor.",
    },
    {
      id: "FND-002",
      title: "B2B Sales Invoice Lacking Customer GSTIN",
      category: "COMPLIANCE",
      financialImpact: 8400,
      responsiblePerson: "Billing Counter Staff",
      dueDate: "2026-10-22",
      status: "IN_REVIEW",
      description: "Invoice #INV-2049 for ₹48,000 issued to corporate firm without recording buyer GSTIN.",
      resolutionNotes: "Buyer GSTIN received via email; amendment pending in GSTR-1 Table 9A.",
    },
    {
      id: "FND-003",
      title: "Bank Credit Unreconciled in Accounts",
      category: "RECONCILIATION",
      financialImpact: 25000,
      responsiblePerson: "Accountant (Client)",
      dueDate: "2026-10-18",
      status: "RESOLVED",
      description: "Direct NEFT credit of ₹25,000 received on 14th without customer reference.",
      resolutionNotes: "Party identified as Sri Ram Traders; advance receipt entry created in books.",
    },
  ]);

  // Load backend store audit tasks and discrepancies
  const loadWorkspaceData = useCallback(async () => {
    if (!activeStore?.id) return;
    setLoading(true);
    try {
      const [taskRes, discRes, docRes] = await Promise.all([
        caPortalApi.getTasks({ storeId: activeStore.id }).catch(() => ({ tasks: [] })),
        caPortalApi.getDiscrepancies({ storeId: activeStore.id }).catch(() => ({ discrepancies: [] })),
        caPortalApi.getDocuments({ storeId: activeStore.id }).catch(() => ({ documents: [] })),
      ]);

      const backendTasks = taskRes?.tasks || [];
      const backendDisc = discRes?.discrepancies || [];
      setTasks(backendTasks);
      setDiscrepancies(backendDisc);
      setDocuments(docRes?.documents || []);

      // If backend has discrepancies, integrate them into findings
      if (backendDisc.length > 0) {
        const mapped = backendDisc.map((d) => ({
          id: d.id,
          title: d.title || "Audit Discrepancy",
          category: d.discrepancyType || "AUDIT_FINDING",
          financialImpact: Number(d.amount || 0),
          responsiblePerson: "Client Store Owner",
          dueDate: d.createdAt ? new Date(d.createdAt).toISOString().split("T")[0] : "2026-10-31",
          status: d.status === "RESOLVED" ? "RESOLVED" : "OPEN",
          description: d.description || "Identified during CA audit review.",
          resolutionNotes: d.resolutionNotes || "Pending client action.",
        }));
        // Merge without duplicating IDs
        setFindings((prev) => {
          const ids = new Set(prev.map((f) => f.id));
          const additions = mapped.filter((m) => !ids.has(m.id));
          return [...prev, ...additions];
        });
      }
    } catch (err) {
      console.error("Failed to load audit workspace data:", err);
    } finally {
      setLoading(false);
    }
  }, [activeStore?.id]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // ════════════════════════════════════════════════════════════════
  // 4 SUMMARY CARDS CALCULATION (Section 2 Requirement)
  // 1. Procedures Pending
  // 2. Working Papers Under Review
  // 3. Open Findings
  // 4. Overdue Tasks
  // ════════════════════════════════════════════════════════════════
  const summaryMetrics = useMemo(() => {
    // 1. Procedures Pending
    const proceduresPending = procedures.filter(
      (p) => p.status === "PENDING" || p.status === "IN_PROGRESS"
    ).length;

    // 2. Working Papers Under Review (DRAFT or UNDER_REVIEW)
    const wpUnderReview = workingPapers.filter(
      (wp) => wp.status === "UNDER_REVIEW" || wp.status === "DRAFT"
    ).length;

    // 3. Open Findings (OPEN or IN_REVIEW)
    const openFindings = findings.filter(
      (f) => f.status === "OPEN" || f.status === "IN_REVIEW"
    ).length;

    // 4. Overdue Tasks (dueDate past today and not resolved)
    const today = new Date().toISOString().split("T")[0];
    const overdueTasks = findings.filter(
      (f) => f.status !== "RESOLVED" && f.dueDate && f.dueDate < today
    ).length;

    return {
      proceduresPending,
      wpUnderReview,
      openFindings,
      overdueTasks,
    };
  }, [procedures, workingPapers, findings]);

  // Filtered Checklist
  const filteredChecklist = useMemo(() => {
    if (checklistFilter === "ALL") return procedures;
    return procedures.filter((p) => p.category.toLowerCase() === checklistFilter.toLowerCase());
  }, [procedures, checklistFilter]);

  // Filtered Working Papers
  const filteredWorkingPapers = useMemo(() => {
    return workingPapers.filter((wp) => {
      const matchSearch =
        wpSearch === "" ||
        wp.id.toLowerCase().includes(wpSearch.toLowerCase()) ||
        wp.title.toLowerCase().includes(wpSearch.toLowerCase()) ||
        wp.area.toLowerCase().includes(wpSearch.toLowerCase()) ||
        wp.preparer.toLowerCase().includes(wpSearch.toLowerCase());
      return matchSearch;
    });
  }, [workingPapers, wpSearch]);

  // Filtered Findings
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchSearch =
        findingSearch === "" ||
        f.id.toLowerCase().includes(findingSearch.toLowerCase()) ||
        f.title.toLowerCase().includes(findingSearch.toLowerCase()) ||
        f.responsiblePerson.toLowerCase().includes(findingSearch.toLowerCase());

      if (!matchSearch) return false;
      if (findingStatusFilter === "OPEN") return f.status === "OPEN" || f.status === "IN_REVIEW";
      if (findingStatusFilter === "RESOLVED") return f.status === "RESOLVED";
      return true;
    });
  }, [findings, findingSearch, findingStatusFilter]);

  // Toggle procedure verification sign-off
  const handleToggleProcedureStatus = (procedureId) => {
    setProcedures((prev) =>
      prev.map((p) => {
        if (p.id === procedureId) {
          const nextStatus = p.status === "VERIFIED" ? "IN_PROGRESS" : "VERIFIED";
          const newHistory = [
            ...p.history,
            {
              date: new Date().toISOString().split("T")[0],
              action: `Status changed to ${nextStatus}`,
              by: user?.name || "Chartered Accountant",
            },
          ];
          return { ...p, status: nextStatus, history: newHistory };
        }
        return p;
      })
    );
    if (selectedProcedure?.id === procedureId) {
      setSelectedProcedure((prev) => ({
        ...prev,
        status: prev.status === "VERIFIED" ? "IN_PROGRESS" : "VERIFIED",
      }));
    }
  };

  // Primary Action: Add Working Paper
  const handleAddWorkingPaper = (e) => {
    e.preventDefault();
    if (!wpForm.title) return;

    const newCode = wpForm.code.trim() || `WP-${wpForm.area.slice(0, 3).toUpperCase()}-${String(workingPapers.length + 1).padStart(2, "0")}`;
    const newWp = {
      id: newCode,
      title: wpForm.title,
      area: wpForm.area,
      evidenceCount: 1,
      preparer: wpForm.preparer || user?.name || "Audit Senior",
      reviewer: "Chartered Accountant",
      status: "DRAFT",
      updatedAt: new Date().toISOString().split("T")[0],
      scope: wpForm.description || "Substantive audit testing working paper.",
      files: ["working_paper_draft.xlsx"],
    };

    setWorkingPapers([newWp, ...workingPapers]);
    setAddWpModalOpen(false);
    setWpForm({ code: "", title: "", area: "SALES", preparer: user?.name || "Audit Staff", description: "" });
    setStatusNotification(`Created Working Paper ${newCode}!`);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  // Primary Action: Add Finding
  const handleAddFinding = async (e) => {
    e.preventDefault();
    if (!findingForm.title) return;

    const newId = `FND-${String(findings.length + 1).padStart(3, "0")}`;
    const newFinding = {
      id: newId,
      title: findingForm.title,
      category: findingForm.category,
      financialImpact: parseFloat(findingForm.financialImpact) || 0,
      responsiblePerson: findingForm.responsiblePerson || "Client Store Management",
      dueDate: findingForm.dueDate || new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
      status: "OPEN",
      description: findingForm.description || "Identified during CA statutory audit review.",
      resolutionNotes: "Pending client clarification.",
    };

    setFindings([newFinding, ...findings]);

    // Persist to backend if store is selected
    if (activeStore?.id) {
      try {
        await caPortalApi.flagDiscrepancy(
          {
            title: newFinding.title,
            description: newFinding.description,
            discrepancyType: newFinding.category,
            amount: newFinding.financialImpact,
          },
          { storeId: activeStore.id }
        );
      } catch (_) {}
    }

    setAddFindingModalOpen(false);
    setFindingForm({
      title: "",
      category: "TAX_MISMATCH",
      financialImpact: "",
      responsiblePerson: "",
      dueDate: "",
      description: "",
    });
    setStatusNotification(`Recorded Audit Finding ${newId}!`);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  // Primary Action: Export Audit Report
  const handleExportAuditReport = () => {
    const reportData = {
      client: activeStore?.name,
      gstin: activeStore?.gstin || "Unregistered",
      financialYear: selectedFY,
      engagementStatus,
      exportedAt: new Date().toISOString(),
      auditor: user?.name || "Senior Chartered Accountant",
      summaryMetrics,
      procedures: procedures.map((p) => ({
        code: p.id,
        name: p.name,
        category: p.category,
        status: p.status,
        preparer: p.preparer,
        reviewer: p.reviewer,
      })),
      workingPapersCount: workingPapers.length,
      findings: findings.map((f) => ({
        id: f.id,
        title: f.title,
        category: f.category,
        impact: f.financialImpact,
        status: f.status,
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Audit_Report_${activeStore?.name || "Client"}_${selectedFY}.json`;
    a.click();
    URL.revokeObjectURL(a);
  };

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════════════════
          TOP SECTION: Client, Financial Year, Engagement Status & Actions
      ══════════════════════════════════════════════════════════ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Client & FY Controls */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Client Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Building2 size={16} className="text-slate-500 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Audit Client
                </span>
                <select
                  value={selectedStoreId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedStoreId(id);
                    localStorage.setItem("bilzet_active_store_id", id);
                  }}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 outline-hidden cursor-pointer"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Financial Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Calendar size={14} className="text-slate-500 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Financial Year
                </span>
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 outline-hidden cursor-pointer"
                >
                  {[
                    `${currentYear}-${currentYear + 1}`,
                    `${currentYear - 1}-${currentYear}`,
                    `${currentYear - 2}-${currentYear - 1}`,
                  ].map((fy) => (
                    <option key={fy} value={fy}>
                      FY {fy}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Audit Engagement Status */}
            <div className="flex items-center gap-1.5 pl-1">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
                  engagementStatus === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    engagementStatus === "COMPLETED" ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                />
                {engagementStatus === "COMPLETED" ? "Audit Signed Off" : "Fieldwork In Progress"}
              </span>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Exceptions Inbox */}
            <button
              onClick={() => onNavigateTab("exceptions")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-2xs"
            >
              <ShieldAlert size={14} className="text-blue-600" />
              <span>Exceptions Inbox</span>
            </button>

            {/* Add Working Paper */}
            <button
              onClick={() => setAddWpModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <Plus size={14} className="text-blue-600" />
              Add Working Paper
            </button>

            {/* Add Finding */}
            <button
              onClick={() => setAddFindingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-amber-300 bg-amber-50/80 text-amber-800 hover:bg-amber-100 transition shadow-2xs"
            >
              <AlertTriangle size={14} className="text-amber-600" />
              Add Finding
            </button>

            {/* Export Audit Report */}
            <button
              onClick={handleExportAuditReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs"
            >
              <Download size={14} />
              Export Audit Report
            </button>

            {/* Refresh */}
            <button
              onClick={loadWorkspaceData}
              title="Reload Workspace"
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : ""} />
            </button>
          </div>
        </div>

        {/* Feedback message */}
        {statusNotification && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-1.5">
              <Check size={15} className="text-emerald-600" /> {statusNotification}
            </span>
            <button onClick={() => setStatusNotification(null)}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          FOUR SUMMARY CARDS ONLY (Section 2 Requirement)
          1. Procedures Pending
          2. Working Papers Under Review
          3. Open Findings
          4. Overdue Tasks
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Procedures Pending */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              1. Procedures Pending
            </span>
            <CheckSquare size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summaryMetrics.proceduresPending}
            <span className="text-xs font-medium text-slate-400 ml-1.5">
              / {procedures.length} total
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Procedures awaiting verification
          </span>
        </div>

        {/* Card 2: Working Papers Under Review */}
        <div className="bg-white p-4.5 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-xs">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              2. Working Papers Under Review
            </span>
            <FileSpreadsheet size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">
            {summaryMetrics.wpUnderReview}
            <span className="text-xs font-medium text-blue-500 ml-1.5">
              / {workingPapers.length} active
            </span>
          </div>
          <span className="text-[11px] text-blue-600/80 mt-1 block">
            Awaiting senior partner sign-off
          </span>
        </div>

        {/* Card 3: Open Findings */}
        <div className="bg-white p-4.5 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              3. Open Findings
            </span>
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            {summaryMetrics.openFindings}
          </div>
          <span className="text-[11px] text-amber-600/80 mt-1 block">
            Discrepancies requiring client action
          </span>
        </div>

        {/* Card 4: Overdue Tasks */}
        <div className="bg-white p-4.5 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              4. Overdue Tasks
            </span>
            <Clock size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">
            {summaryMetrics.overdueTasks}
          </div>
          <span className="text-[11px] text-rose-600/80 mt-1 block">
            Past scheduled audit deadline
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MAIN CONTENT — ONLY 3 TABS (Section 2 Requirement)
          1. Audit Checklist
          2. Working Papers
          3. Findings
      ══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Tab Navigation Header */}
        <div className="flex items-center border-b border-slate-200 px-4 bg-slate-50/60">
          <button
            onClick={() => setActiveTab("checklist")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "checklist"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckSquare size={15} />
            Audit Checklist ({procedures.length})
          </button>

          <button
            onClick={() => setActiveTab("working_papers")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "working_papers"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet size={15} />
            Working Papers ({workingPapers.length})
          </button>

          <button
            onClick={() => setActiveTab("findings")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "findings"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertTriangle size={15} />
            Findings ({findings.length})
          </button>
        </div>

        {/* ────────────────────────────────────────────────────────
            TAB 1: AUDIT CHECKLIST
        ──────────────────────────────────────────────────────── */}
        {activeTab === "checklist" && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-500 font-semibold mr-1">Audit Area:</span>
              {[
                { id: "ALL", label: "All Procedures" },
                { id: "Sales", label: "Sales & Revenue" },
                { id: "Purchases", label: "Purchases & Expenses" },
                { id: "Bank", label: "Bank & Cash" },
                { id: "GST", label: "GST Compliance" },
                { id: "Inventory", label: "Inventory" },
                { id: "Financial Statements", label: "Financial Statements" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChecklistFilter(c.id)}
                  className={`px-3 py-1 rounded-lg font-semibold transition whitespace-nowrap ${
                    checklistFilter === c.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Checklist Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Procedure Description</th>
                    <th className="py-3 px-4">Area</th>
                    <th className="py-3 px-4">Preparer</th>
                    <th className="py-3 px-4">Reviewer</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredChecklist.map((proc) => (
                    <tr key={proc.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {proc.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {proc.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {proc.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{proc.preparer}</td>
                      <td className="py-3 px-4 text-slate-600">{proc.reviewer}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleProcedureStatus(proc.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                            proc.status === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : proc.status === "IN_PROGRESS"
                              ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                          title="Click to toggle verification status"
                        >
                          {proc.status === "VERIFIED" && <Check size={12} />}
                          {proc.status}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedProcedure(proc)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition"
                          title="Open Procedure Drawer"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            TAB 2: WORKING PAPERS
        ──────────────────────────────────────────────────────── */}
        {activeTab === "working_papers" && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Search */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search WP reference, title, area..."
                  value={wpSearch}
                  onChange={(e) => setWpSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">WP Reference</th>
                    <th className="py-3 px-4">Title &amp; Scope</th>
                    <th className="py-3 px-4">Audit Area</th>
                    <th className="py-3 px-4">Linked Evidence</th>
                    <th className="py-3 px-4">Preparer</th>
                    <th className="py-3 px-4">Reviewer</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWorkingPapers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        No working papers found.
                      </td>
                    </tr>
                  ) : (
                    filteredWorkingPapers.map((wp) => (
                      <tr key={wp.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {wp.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{wp.title}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{wp.scope}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {wp.area}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Paperclip size={12} /> {wp.evidenceCount} attachments
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{wp.preparer}</td>
                        <td className="py-3 px-4 text-slate-600">{wp.reviewer}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              wp.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700"
                                : wp.status === "UNDER_REVIEW"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {wp.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedWorkingPaper(wp)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition"
                            title="Open Working Paper Drawer"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            TAB 3: FINDINGS
        ──────────────────────────────────────────────────────── */}
        {activeTab === "findings" && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Search & Status Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search finding #, issue, person..."
                  value={findingSearch}
                  onChange={(e) => setFindingSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center gap-1.5 self-stretch sm:self-auto">
                <span className="text-xs text-slate-500 font-semibold mr-1">Status:</span>
                {[
                  { id: "ALL", label: "All Findings" },
                  { id: "OPEN", label: "Open / In Review" },
                  { id: "RESOLVED", label: "Resolved" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFindingStatusFilter(s.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      findingStatusFilter === s.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Findings Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Finding ID</th>
                    <th className="py-3 px-4">Discrepancy Title &amp; Details</th>
                    <th className="py-3 px-4 text-right">Financial Impact</th>
                    <th className="py-3 px-4">Responsible Person</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFindings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        No audit findings recorded.
                      </td>
                    </tr>
                  ) : (
                    filteredFindings.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {f.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{f.title}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{f.description}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {f.financialImpact > 0 ? (
                            <span className="text-rose-600">
                              ₹{f.financialImpact.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{f.responsiblePerson}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{f.dueDate}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              f.status === "RESOLVED"
                                ? "bg-emerald-50 text-emerald-700"
                                : f.status === "IN_REVIEW"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {f.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedFinding(f)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition"
                            title="Open Finding Drawer"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          DETAIL VIEW: PROCEDURE DRAWER
      ══════════════════════════════════════════════════════════ */}
      {selectedProcedure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                    {selectedProcedure.id}
                  </span>
                  <span className="text-xs font-bold text-blue-600 uppercase">
                    {selectedProcedure.category}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mt-1">
                  {selectedProcedure.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProcedure(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Audit Objective
                </span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedProcedure.objective}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Sample Criteria</span>
                  <strong className="text-slate-800">{selectedProcedure.sampleSize}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Transactions Tested</span>
                  <strong className="text-slate-800">{selectedProcedure.testedCount} samples</strong>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Linked Supporting Evidence
                </span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-slate-700">
                  <Paperclip size={14} className="text-slate-400" />
                  <span>{selectedProcedure.evidence}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Reviewer Notes &amp; Observations
                </span>
                <p className="text-slate-700 bg-blue-50/40 p-3 rounded-xl border border-blue-100">
                  {selectedProcedure.notes}
                </p>
              </div>

              {/* History */}
              {selectedProcedure.history && selectedProcedure.history.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Audit Verification History
                  </span>
                  <div className="space-y-1.5">
                    {selectedProcedure.history.map((h, i) => (
                      <div key={i} className="flex justify-between text-slate-500 text-[11px] p-2 bg-slate-50 rounded-lg">
                        <span>{h.action} ({h.by})</span>
                        <span className="font-mono">{h.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                onClick={() => handleToggleProcedureStatus(selectedProcedure.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedProcedure.status === "VERIFIED"
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {selectedProcedure.status === "VERIFIED" ? "Re-open Procedure" : "Mark as Verified ✓"}
              </button>

              <Button variant="secondary" size="sm" onClick={() => setSelectedProcedure(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          DETAIL VIEW: WORKING PAPER DRAWER
      ══════════════════════════════════════════════════════════ */}
      {selectedWorkingPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600">{selectedWorkingPaper.id}</span>
                <h3 className="font-bold text-slate-900 text-base">{selectedWorkingPaper.title}</h3>
              </div>
              <button onClick={() => setSelectedWorkingPaper(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Audit Area:</span>
                  <strong className="text-slate-800">{selectedWorkingPaper.area}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Preparer:</span>
                  <strong className="text-slate-800">{selectedWorkingPaper.preparer}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reviewer:</span>
                  <strong className="text-slate-800">{selectedWorkingPaper.reviewer}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <strong className="text-blue-600">{selectedWorkingPaper.status}</strong>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Scope &amp; Procedures Executed
                </span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                  {selectedWorkingPaper.scope}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Attached Evidence Files
                </span>
                <div className="space-y-1.5">
                  {(selectedWorkingPaper.files || []).map((file, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2 text-slate-700">
                        <FileText size={14} className="text-blue-600" /> {file}
                      </span>
                      <button
                        onClick={() => alert(`Downloading verified audit artifact: ${file}`)}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedWorkingPaper(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          DETAIL VIEW: FINDING DRAWER
      ══════════════════════════════════════════════════════════ */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
              <div>
                <span className="font-mono text-xs font-bold text-amber-800">{selectedFinding.id}</span>
                <h3 className="font-bold text-slate-900 text-base">{selectedFinding.title}</h3>
              </div>
              <button onClick={() => setSelectedFinding(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Financial Impact:</span>
                  <strong className="font-mono text-rose-600">
                    ₹{Number(selectedFinding.financialImpact || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Responsible Person:</span>
                  <strong className="text-slate-800">{selectedFinding.responsiblePerson}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Resolution Due Date:</span>
                  <strong className="font-mono text-slate-800">{selectedFinding.dueDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <strong className={selectedFinding.status === "RESOLVED" ? "text-emerald-600" : "text-rose-600"}>
                    {selectedFinding.status}
                  </strong>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Discrepancy Description
                </span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                  {selectedFinding.description}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Resolution History &amp; Actions
                </span>
                <p className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 text-blue-900 font-medium">
                  {selectedFinding.resolutionNotes}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                onClick={() => {
                  setFindings((prev) =>
                    prev.map((f) =>
                      f.id === selectedFinding.id
                        ? { ...f, status: f.status === "RESOLVED" ? "OPEN" : "RESOLVED" }
                        : f
                    )
                  );
                  setSelectedFinding((prev) => ({
                    ...prev,
                    status: prev.status === "RESOLVED" ? "OPEN" : "RESOLVED",
                  }));
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedFinding.status === "RESOLVED"
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {selectedFinding.status === "RESOLVED" ? "Reopen Finding" : "Mark Resolved ✓"}
              </button>

              <Button variant="secondary" size="sm" onClick={() => setSelectedFinding(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PRIMARY ACTION MODAL: ADD WORKING PAPER
      ══════════════════════════════════════════════════════════ */}
      {addWpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-blue-600" />
                Add Audit Working Paper
              </h3>
              <button onClick={() => setAddWpModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddWorkingPaper} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">WP Reference Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. WP-REV-02"
                  value={wpForm.code}
                  onChange={(e) => setWpForm({ ...wpForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Working Paper Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Substantive Testing of Debtor Balances"
                  value={wpForm.title}
                  onChange={(e) => setWpForm({ ...wpForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Audit Area</label>
                <select
                  value={wpForm.area}
                  onChange={(e) => setWpForm({ ...wpForm, area: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Sales">Sales &amp; Revenue</option>
                  <option value="Purchases">Purchases &amp; Expenses</option>
                  <option value="Bank">Bank &amp; Cash Reconciliation</option>
                  <option value="GST">GST &amp; Statutory Compliance</option>
                  <option value="Inventory">Inventory &amp; Stock Valuation</option>
                  <option value="Financial Statements">Financial Statements</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Preparer</label>
                <input
                  type="text"
                  value={wpForm.preparer}
                  onChange={(e) => setWpForm({ ...wpForm, preparer: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Scope &amp; Description</label>
                <textarea
                  rows={3}
                  placeholder="Enter audit testing scope, sample selection method, or observations..."
                  value={wpForm.description}
                  onChange={(e) => setWpForm({ ...wpForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setAddWpModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Working Paper
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PRIMARY ACTION MODAL: ADD AUDIT FINDING
      ══════════════════════════════════════════════════════════ */}
      {addFindingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                Record Audit Finding / Discrepancy
              </h3>
              <button onClick={() => setAddFindingModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddFinding} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Issue / Finding Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unreconciled bank debit of ₹15,000"
                  value={findingForm.title}
                  onChange={(e) => setFindingForm({ ...findingForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={findingForm.category}
                    onChange={(e) => setFindingForm({ ...findingForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="TAX_MISMATCH">Tax Mismatch</option>
                    <option value="COMPLIANCE">Statutory Compliance</option>
                    <option value="RECONCILIATION">Reconciliation</option>
                    <option value="VALUATION">Valuation / Cutoff</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Financial Impact (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={findingForm.financialImpact}
                    onChange={(e) => setFindingForm({ ...findingForm, financialImpact: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Responsible Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. Finance Head"
                    value={findingForm.responsiblePerson}
                    onChange={(e) => setFindingForm({ ...findingForm, responsiblePerson: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Resolution Due Date</label>
                  <input
                    type="date"
                    value={findingForm.dueDate}
                    onChange={(e) => setFindingForm({ ...findingForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observation Details</label>
                <textarea
                  rows={3}
                  placeholder="Detail the audit exception, root cause, and recommendation..."
                  value={findingForm.description}
                  onChange={(e) => setFindingForm({ ...findingForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setAddFindingModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Record Finding
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
