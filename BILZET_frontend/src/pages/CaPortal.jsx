import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Calendar,
  Percent,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
  RotateCcw,
  Printer,
  History,
  X,
  ChevronRight,
  Info,
  DollarSign,
  PackageCheck,
  Scale,
  Activity,
  AlertTriangle,
  CheckSquare,
  Flag,
  Paperclip,
  Lock,
  FileCheck,
  Layers,
  ShoppingBag,
  FolderCheck,
  Plus,
  Check,
  ExternalLink,
  SlidersHorizontal,
  Users,
  MessageSquare,
  LayoutGrid,
  Boxes,
  Settings,
  Send,
  ArrowRight,
  UserCheck,
  HelpCircle,
  Sparkles,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { caPortalApi } from "../api";
import TaxInvoice from "../components/invoice/TaxInvoice";
import Button, { CompactIconButton } from "../components/common/Button";

export default function CaPortal() {
  const { user } = useAuth();
  const { subTab } = useParams();
  const navigate = useNavigate();
  const isCAUser = user?.role === "CA" || user?.role === "SUPER_ADMIN" || user?.isSuperAdmin;

  // Tab mapping helper
  const resolveTab = (tab) => {
    if (!tab) return "dashboard";
    switch (tab) {
      case "dashboard": return "dashboard";
      case "clients": return "clients";
      case "pipeline": return "pipeline";
      case "deadlines": return "deadlines";
      case "sales":
      case "invoices": return "invoices";
      case "returns": return "returns";
      case "purchases": return "purchases";
      case "reconciliation": return "reconciliation";
      case "payments": return "payments";
      case "expenses": return "expenses";
      case "gst": return "gst";
      case "inventory": return "inventory";
      case "tasks": return "tasks";
      case "discrepancies": return "discrepancies";
      case "documents": return "documents";
      case "queries": return "queries";
      case "reports":
      case "workpapers": return "workpapers";
      case "closing": return "closing";
      case "audit-trail":
      case "activity": return "activity";
      case "team": return "team";
      case "automation": return "automation";
      case "settings": return "settings";
      default: return tab;
    }
  };

  // Stores State
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [loadingStores, setLoadingStores] = useState(true);

  // Data State
  const [invoices, setInvoices] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingCreditNotes, setLoadingCreditNotes] = useState(false);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState(() => resolveTab(subTab));
  const [searchQuery, setSearchQuery] = useState("");
  const [creditNoteSearch, setCreditNoteSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [returnFilter, setReturnFilter] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sync activeTab when subTab in URL changes
  useEffect(() => {
    if (subTab) {
      setActiveTab(resolveTab(subTab));
    }
  }, [subTab]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    // Route clean aliases
    if (newTab === "invoices") navigate("/ca-portal/sales");
    else if (newTab === "workpapers") navigate("/ca-portal/reports");
    else if (newTab === "activity") navigate("/ca-portal/audit-trail");
    else navigate(`/ca-portal/${newTab}`);
  };

  // Activity Ledger State
  const [activityList, setActivityList] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Module 4: Purchases & Suppliers State
  const [purchasesList, setPurchasesList] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // Module 5: Payments State
  const [paymentsList, setPaymentsList] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Module 6: Expenses State
  const [expensesList, setExpensesList] = useState([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Module 8: Inventory Audit State
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [inventoryMovements, setInventoryMovements] = useState([]);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Module 2: Tasks Pipeline State
  const [tasksList, setTasksList] = useState([]);
  const [tasksCounts, setTasksCounts] = useState({});
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", category: "GENERAL", priority: "MEDIUM", dueDate: "" });

  // Module 10: Discrepancies State
  const [discrepanciesList, setDiscrepanciesList] = useState([]);
  const [loadingDiscrepancies, setLoadingDiscrepancies] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [discrepancyForm, setDiscrepancyForm] = useState({ title: "", description: "", discrepancyType: "TAX_MISMATCH", referenceNumber: "", amount: "" });

  // Module 9: Documents State
  const [documentsList, setDocumentsList] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [newDocModalOpen, setNewDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({ title: "", fileUrl: "", category: "SUPPORTING_EVIDENCE" });

  // Module 13: Period Closing State
  const [periodClosingsList, setPeriodClosingsList] = useState([]);
  const [loadingClosings, setLoadingClosings] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closingForm, setClosingForm] = useState({ period: "", signOffNotes: "" });

  // Module 5: Bank Statement Reconciliation State
  const [bankSession, setBankSession] = useState(null);
  const [loadingBankSession, setLoadingBankSession] = useState(false);
  const [importBankModalOpen, setImportBankModalOpen] = useState(false);
  const [bankRowsInput, setBankRowsInput] = useState("");

  // Module 11: Reports & Workpapers State
  const [workpapersData, setWorkpapersData] = useState(null);
  const [loadingWorkpapers, setLoadingWorkpapers] = useState(false);

  // Module 14: Settings & Audit Rules Engine State
  const [rulesEvaluation, setRulesEvaluation] = useState(null);
  const [loadingRules, setLoadingRules] = useState(false);

  // Module: Client Queries & Requests State
  const [queriesList, setQueriesList] = useState([
    {
      id: "QRY-101",
      title: "Clarification on Vendor Advance Payment without Invoice",
      referenceNumber: "TXN-8821",
      question: "Payment of ₹45,000 made on 12th Sept lacks matching supplier tax invoice. Please upload vendor bill or voucher.",
      status: "WAITING_FOR_CLIENT",
      priority: "HIGH",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      clientReply: "Invoice copy requested from vendor, will upload by tomorrow.",
    },
    {
      id: "QRY-102",
      title: "HSN Code Discrepancy for New Electrical Accessories",
      referenceNumber: "INV-2026-089",
      question: "HSN 8536 billed at 12% GST instead of standard 18%. Please confirm tariff classification.",
      status: "RESOLVED",
      priority: "MEDIUM",
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      clientReply: "Corrected in master product catalogue to 18% GST.",
    },
  ]);
  const [newQueryModalOpen, setNewQueryModalOpen] = useState(false);
  const [queryForm, setQueryForm] = useState({
    title: "",
    referenceNumber: "",
    question: "",
    priority: "MEDIUM",
  });

  // Module: Team & Permissions Directory State
  const [teamMembers, setTeamMembers] = useState([
    {
      id: "TM-1",
      name: user?.name || "Karthik CA",
      email: user?.email || "ca@bilzet.com",
      role: "CA Partner / Principal Auditor",
      status: "ACTIVE",
      assignedStoresCount: 3,
      activeTasksCount: 4,
    },
    {
      id: "TM-2",
      name: "Sneha Sharma",
      email: "sneha.audit@bilzet.com",
      role: "Senior Audit Manager",
      status: "ACTIVE",
      assignedStoresCount: 2,
      activeTasksCount: 7,
    },
    {
      id: "TM-3",
      name: "Rahul Verma",
      email: "rahul.assistant@bilzet.com",
      role: "Article Assistant",
      status: "ACTIVE",
      assignedStoresCount: 1,
      activeTasksCount: 5,
    },
  ]);
  const [newTeamModalOpen, setNewTeamModalOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: "",
    email: "",
    role: "Senior Audit Manager",
  });

  // Module: Automation Rules Configuration State
  const [automationRulesConfig, setAutomationRulesConfig] = useState({
    autoCreateTasksOnException: true,
    flagCashOverLimit: true,
    cashLimitAmount: 10000,
    varianceThreshold: 100,
    checkDuplicateInvoiceNumbers: true,
    checkArithmeticGstMismatch: true,
    checkMissingB2bGstin: true,
    checkExcessReturns: true,
    checkNegativeInventory: true,
    checkUnreconciledBankCredits: true,
  });

  const handleCreateQuery = (e) => {
    e.preventDefault();
    if (!queryForm.title || !queryForm.question) return;
    const newQ = {
      id: `QRY-${Math.floor(100 + Math.random() * 900)}`,
      title: queryForm.title,
      referenceNumber: queryForm.referenceNumber || "GENERAL",
      question: queryForm.question,
      status: "WAITING_FOR_CLIENT",
      priority: queryForm.priority,
      createdAt: new Date().toISOString(),
      clientReply: "Pending client review",
    };
    setQueriesList([newQ, ...queriesList]);
    setNewQueryModalOpen(false);
    setQueryForm({ title: "", referenceNumber: "", question: "", priority: "MEDIUM" });
    alert("Query successfully transmitted to client portal!");
  };

  const handleResolveQuery = (id) => {
    setQueriesList(
      queriesList.map((q) => (q.id === id ? { ...q, status: "RESOLVED" } : q))
    );
  };

  const handleCreateTeamMember = (e) => {
    e.preventDefault();
    if (!teamForm.name || !teamForm.email) return;
    const newMember = {
      id: `TM-${teamMembers.length + 1}`,
      name: teamForm.name,
      email: teamForm.email,
      role: teamForm.role,
      status: "ACTIVE",
      assignedStoresCount: 1,
      activeTasksCount: 0,
    };
    setTeamMembers([...teamMembers, newMember]);
    setNewTeamModalOpen(false);
    setTeamForm({ name: "", email: "", role: "Senior Audit Manager" });
    alert(`Added ${teamForm.name} to CA Audit Firm team!`);
  };

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedCreditNote, setSelectedCreditNote] = useState(null);
  const [auditTrailInvoice, setAuditTrailInvoice] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // 1. Fetch authorized stores for this CA
  useEffect(() => {
    if (!isCAUser) return;
    setLoadingStores(true);
    caPortalApi
      .getStores()
      .then((res) => {
        const list = res?.stores || [];
        setStores(list);
        if (list.length > 0) {
          setSelectedStoreId(list[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load authorized stores for CA:", err);
        setStores([]);
      })
      .finally(() => setLoadingStores(false));
  }, [isCAUser]);

  // 2. Fetch invoices and financial summary
  const loadStoreData = async () => {
    if (!selectedStoreId) return;
    setLoadingData(true);
    try {
      const params = { storeId: selectedStoreId };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== "ALL") params.paymentStatus = statusFilter;
      if (returnFilter !== "ALL") params.returnStatus = returnFilter;
      if (selectedMonth) params.month = selectedMonth;
      if (selectedYear) params.year = selectedYear;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [invRes, sumRes] = await Promise.all([
        caPortalApi.getInvoices(params),
        caPortalApi.getFinancialSummary({
          storeId: selectedStoreId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          month: selectedMonth || undefined,
          year: selectedYear || undefined,
        }),
      ]);

      setInvoices(invRes?.invoices || []);
      setSummary(sumRes?.summary || null);
    } catch (err) {
      console.error("Failed to fetch store data for CA:", err);
      setInvoices([]);
    } finally {
      setLoadingData(false);
    }
  };

  // 3. Fetch credit notes
  const loadCreditNotesData = async () => {
    if (!selectedStoreId) return;
    setLoadingCreditNotes(true);
    try {
      const params = { storeId: selectedStoreId };
      if (creditNoteSearch.trim()) params.search = creditNoteSearch.trim();
      if (selectedMonth) params.month = selectedMonth;
      if (selectedYear) params.year = selectedYear;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await caPortalApi.getCreditNotes(params);
      setCreditNotes(res?.creditNotes || []);
    } catch (err) {
      console.error("Failed to fetch credit notes for CA:", err);
      setCreditNotes([]);
    } finally {
      setLoadingCreditNotes(false);
    }
  };

  // 4. Fetch synchronized audit & activity stream for CA
  const loadActivityData = async () => {
    if (!selectedStoreId) return;
    setLoadingActivity(true);
    try {
      const res = await caPortalApi.getActivity({ storeId: selectedStoreId, limit: 100 });
      setActivityList(res?.activity || []);
    } catch (err) {
      console.error("Failed to fetch activity logs for CA:", err);
      setActivityList([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  // 5. Purchases & Suppliers Loader
  const loadPurchasesData = async () => {
    if (!selectedStoreId) return;
    setLoadingPurchases(true);
    try {
      const [pRes, sRes] = await Promise.all([
        caPortalApi.getPurchases({ storeId: selectedStoreId, limit: 100 }),
        caPortalApi.getSuppliers({ storeId: selectedStoreId }),
      ]);
      setPurchasesList(pRes?.purchases || []);
      setSuppliersList(sRes?.suppliers || []);
    } catch (err) {
      console.error("Failed to fetch purchases for CA:", err);
      setPurchasesList([]);
    } finally {
      setLoadingPurchases(false);
    }
  };

  // 6. Payments Loader
  const loadPaymentsData = async () => {
    if (!selectedStoreId) return;
    setLoadingPayments(true);
    try {
      const res = await caPortalApi.getPayments({ storeId: selectedStoreId, limit: 100 });
      setPaymentsList(res?.payments || []);
    } catch (err) {
      console.error("Failed to fetch payments for CA:", err);
      setPaymentsList([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  // 7. Expenses Loader
  const loadExpensesData = async () => {
    if (!selectedStoreId) return;
    setLoadingExpenses(true);
    try {
      const res = await caPortalApi.getExpenses({ storeId: selectedStoreId, limit: 100 });
      setExpensesList(res?.expenses || []);
      setExpensesTotal(res?.totalAmount || 0);
    } catch (err) {
      console.error("Failed to fetch expenses for CA:", err);
      setExpensesList([]);
    } finally {
      setLoadingExpenses(false);
    }
  };

  // 8. Inventory Loader
  const loadInventoryData = async () => {
    if (!selectedStoreId) return;
    setLoadingInventory(true);
    try {
      const res = await caPortalApi.getInventory({ storeId: selectedStoreId, limit: 100 });
      setInventoryProducts(res?.products || []);
      setInventoryMovements(res?.recentMovements || []);
      setInventorySummary(res?.summary || null);
    } catch (err) {
      console.error("Failed to fetch inventory for CA:", err);
      setInventoryProducts([]);
    } finally {
      setLoadingInventory(false);
    }
  };

  // 9. Tasks Pipeline Loader & Actions
  const loadTasksData = async () => {
    if (!selectedStoreId) return;
    setLoadingTasks(true);
    try {
      const res = await caPortalApi.getTasks({ storeId: selectedStoreId });
      setTasksList(res?.tasks || []);
      setTasksCounts(res?.counts || {});
    } catch (err) {
      console.error("Failed to fetch tasks for CA:", err);
      setTasksList([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title) return;
    try {
      await caPortalApi.createTask(taskForm, { storeId: selectedStoreId });
      setNewTaskModalOpen(false);
      setTaskForm({ title: "", description: "", category: "GENERAL", priority: "MEDIUM", dueDate: "" });
      loadTasksData();
    } catch (err) {
      alert("Failed to create audit task: " + (err.message || "Unknown error"));
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await caPortalApi.updateTask(taskId, { status: newStatus }, { storeId: selectedStoreId });
      loadTasksData();
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await caPortalApi.deleteTask(taskId, { storeId: selectedStoreId });
      loadTasksData();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  // 10. Discrepancies Loader & Actions
  const loadDiscrepanciesData = async () => {
    if (!selectedStoreId) return;
    setLoadingDiscrepancies(true);
    try {
      const res = await caPortalApi.getDiscrepancies({ storeId: selectedStoreId });
      setDiscrepanciesList(res?.discrepancies || []);
    } catch (err) {
      console.error("Failed to fetch discrepancies for CA:", err);
      setDiscrepanciesList([]);
    } finally {
      setLoadingDiscrepancies(false);
    }
  };

  const handleFlagDiscrepancy = async (e) => {
    e.preventDefault();
    if (!discrepancyForm.title || !discrepancyForm.description) return;
    try {
      await caPortalApi.flagDiscrepancy(discrepancyForm, { storeId: selectedStoreId });
      setFlagModalOpen(false);
      setDiscrepancyForm({ title: "", description: "", discrepancyType: "TAX_MISMATCH", referenceNumber: "", amount: "" });
      loadDiscrepanciesData();
    } catch (err) {
      alert("Failed to flag discrepancy: " + (err.message || "Unknown error"));
    }
  };

  const handleVerifyDiscrepancy = async (discrepancyId) => {
    try {
      await caPortalApi.verifyDiscrepancy(discrepancyId, {}, { storeId: selectedStoreId });
      loadDiscrepanciesData();
    } catch (err) {
      console.error("Failed to verify discrepancy:", err);
    }
  };

  // 11. Documents Loader & Actions
  const loadDocumentsData = async () => {
    if (!selectedStoreId) return;
    setLoadingDocuments(true);
    try {
      const res = await caPortalApi.getDocuments({ storeId: selectedStoreId });
      setDocumentsList(res?.documents || []);
    } catch (err) {
      console.error("Failed to fetch documents for CA:", err);
      setDocumentsList([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!docForm.title || !docForm.fileUrl) return;
    try {
      await caPortalApi.createDocument(docForm, { storeId: selectedStoreId });
      setNewDocModalOpen(false);
      setDocForm({ title: "", fileUrl: "", category: "SUPPORTING_EVIDENCE" });
      loadDocumentsData();
    } catch (err) {
      alert("Failed to attach document: " + (err.message || "Unknown error"));
    }
  };

  // 12. Period Closings Loader & Actions
  const loadClosingsData = async () => {
    if (!selectedStoreId) return;
    setLoadingClosings(true);
    try {
      const res = await caPortalApi.getPeriodClosings({ storeId: selectedStoreId });
      setPeriodClosingsList(res?.periods || []);
    } catch (err) {
      console.error("Failed to fetch period closings for CA:", err);
      setPeriodClosingsList([]);
    } finally {
      setLoadingClosings(false);
    }
  };

  const handleClosePeriod = async (e) => {
    e.preventDefault();
    if (!closingForm.period) return;
    try {
      await caPortalApi.closePeriod(closingForm, { storeId: selectedStoreId });
      setCloseModalOpen(false);
      setClosingForm({ period: "", signOffNotes: "" });
      loadClosingsData();
    } catch (err) {
      alert("Failed to close period: " + (err.message || "Unknown error"));
    }
  };

  const handleSignOffPeriod = async (periodId) => {
    const notes = window.prompt("Enter CA Audit Sign-off Notes / Certificate reference:");
    if (notes === null) return;
    try {
      await caPortalApi.signOffPeriod(periodId, { signOffNotes: notes }, { storeId: selectedStoreId });
      loadClosingsData();
    } catch (err) {
      console.error("Failed to sign off period:", err);
    }
  };

  // Module 5: Bank Reconciliation Actions
  const loadBankSessionData = async () => {
    if (!selectedStoreId) return;
    setLoadingBankSession(true);
    try {
      const res = await caPortalApi.getBankReconciliation({ storeId: selectedStoreId });
      setBankSession(res?.session || null);
    } catch (err) {
      console.error("Failed to load bank reconciliation:", err);
    } finally {
      setLoadingBankSession(false);
    }
  };

  const handleImportBankStatement = async (e) => {
    e.preventDefault();
    if (!bankRowsInput.trim()) return;
    try {
      const lines = bankRowsInput.trim().split("\n");
      const rows = lines.map((line, idx) => {
        const parts = line.split(",").map((s) => s.trim());
        if (parts.length >= 4) {
          return {
            date: parts[0] || new Date().toISOString().split("T")[0],
            description: parts[1] || "Transaction",
            refNumber: parts[2] || `REF-${idx + 1}`,
            debit: Number(parts[3]) || 0,
            credit: Number(parts[4]) || 0,
            balance: Number(parts[5]) || 0,
          };
        }
        return {
          date: new Date().toISOString().split("T")[0],
          description: line,
          refNumber: `TXN-${idx + 1}`,
          credit: Number(line.replace(/[^0-9.]/g, "")) || 1000,
          debit: 0,
        };
      });

      const res = await caPortalApi.importBankStatement(
        { fileName: "Bank_Statement_Import.csv", rows },
        { storeId: selectedStoreId }
      );
      setBankSession(res?.session || null);
      setImportBankModalOpen(false);
      setBankRowsInput("");
      alert(`Bank statement imported: ${rows.length} rows processed with automated match suggestion!`);
    } catch (err) {
      alert("Failed to import statement: " + (err.message || "Unknown error"));
    }
  };

  const handleUpdateBankMatch = async (rowId, action) => {
    try {
      const res = await caPortalApi.updateBankMatch(rowId, { action }, { storeId: selectedStoreId });
      if (res?.session) {
        setBankSession(res.session);
      } else {
        loadBankSessionData();
      }
    } catch (err) {
      console.error("Failed to update match:", err);
    }
  };

  // Module 11: Workpapers Actions
  const loadWorkpapersData = async () => {
    if (!selectedStoreId) return;
    setLoadingWorkpapers(true);
    try {
      const res = await caPortalApi.getWorkpapers({ storeId: selectedStoreId });
      setWorkpapersData(res?.workpapers || null);
    } catch (err) {
      console.error("Failed to load workpapers:", err);
    } finally {
      setLoadingWorkpapers(false);
    }
  };

  // Module 14: Settings & Audit Rules Engine Actions
  const loadAuditRulesData = async () => {
    if (!selectedStoreId) return;
    setLoadingRules(true);
    try {
      const res = await caPortalApi.getAuditRules({ storeId: selectedStoreId, autoCreateTasks: false });
      setRulesEvaluation(res || null);
    } catch (err) {
      console.error("Failed to evaluate audit rules:", err);
    } finally {
      setLoadingRules(false);
    }
  };

  const handleExecuteAuditRules = async () => {
    if (!selectedStoreId) return;
    setLoadingRules(true);
    try {
      const res = await caPortalApi.runAuditRules({ autoCreateTasks: true }, { storeId: selectedStoreId });
      setRulesEvaluation(res || null);
      alert(`Audit Rules executed! Found ${res?.exceptionsFoundCount || 0} exception(s). Created ${res?.tasksCreatedCount || 0} task(s).`);
      loadTasksData();
    } catch (err) {
      alert("Failed to run rules: " + (err.message || "Unknown error"));
    } finally {
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    if (selectedStoreId) {
      loadStoreData();
      loadCreditNotesData();
      loadActivityData();
      loadPurchasesData();
      loadPaymentsData();
      loadExpensesData();
      loadInventoryData();
      loadTasksData();
      loadDiscrepanciesData();
      loadDocumentsData();
      loadClosingsData();
      loadBankSessionData();
      loadWorkpapersData();
      loadAuditRulesData();
    }
  }, [selectedStoreId, statusFilter, returnFilter, selectedMonth, selectedYear, startDate, endDate]);

  // Debounced search for invoices
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedStoreId) loadStoreData();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounced search for credit notes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedStoreId) loadCreditNotesData();
    }, 350);
    return () => clearTimeout(timer);
  }, [creditNoteSearch]);

  const activeStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || null;
  }, [stores, selectedStoreId]);

  // Handle opening an invoice modal
  const handleOpenInvoice = (inv) => {
    caPortalApi
      .getInvoice(inv.id || inv._id)
      .then((res) => {
        setSelectedInvoice(res?.invoice || res || inv);
      })
      .catch(() => {
        setSelectedInvoice(inv);
      });
  };

  // Handle opening audit trail
  const handleOpenAuditTrail = async (inv, e) => {
    if (e) e.stopPropagation();
    setAuditTrailInvoice(inv);
    setLoadingAudit(true);
    try {
      const res = await caPortalApi.getAuditTrail(inv.id || inv._id);
      setAuditLogs(res?.auditTrail || []);
    } catch (err) {
      console.error("Failed to fetch audit trail:", err);
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Quick preset period filter
  const handleSetQuickPeriod = (preset) => {
    const now = new Date();
    if (preset === "ALL") {
      setSelectedMonth("");
      setSelectedYear("");
      setStartDate("");
      setEndDate("");
    } else if (preset === "THIS_MONTH") {
      setSelectedMonth(String(now.getMonth() + 1));
      setSelectedYear(String(now.getFullYear()));
      setStartDate("");
      setEndDate("");
    } else if (preset === "THIS_YEAR") {
      setSelectedMonth("");
      setSelectedYear(String(now.getFullYear()));
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      const todayStr = now.toISOString().split("T")[0];
      setSelectedMonth("");
      setSelectedYear("");
      setStartDate(todayStr);
      setEndDate(todayStr);
    }
  };

  // ══════════════════════════════════════════════════
  // EXPORT & REPORT GENERATORS (Req 6)
  // ══════════════════════════════════════════════════

  // Export Invoices to CSV
  const handleExportInvoicesCSV = () => {
    if (!invoices || invoices.length === 0) return;

    const headers = [
      "Invoice #",
      "Date",
      "Customer Name",
      "Customer GSTIN",
      "Supply Type",
      "Taxable Value (₹)",
      "CGST (₹)",
      "SGST (₹)",
      "IGST (₹)",
      "Total GST (₹)",
      "Gross Invoice Total (₹)",
      "Returned Amount (₹)",
      "Net Payable (₹)",
      "Paid Amount (₹)",
      "Balance Due (₹)",
      "Payment Status",
      "Return Status",
    ];

    const rows = invoices.map((inv) => [
      `"${inv.invoiceNumber || ""}"`,
      `"${new Date(inv.date || inv.createdAt).toLocaleDateString("en-IN")}"`,
      `"${inv.customer?.name || "Walk-in Retail Customer"}"`,
      `"${inv.customer?.gstin || "N/A"}"`,
      `"${inv.customer?.isB2B ? "B2B" : "B2C"}"`,
      inv.taxableAmount || 0,
      inv.cgst || 0,
      inv.sgst || 0,
      inv.igst || 0,
      inv.taxTotal || 0,
      inv.grandTotal || 0,
      inv.totalReturnedAmount || 0,
      inv.netPayable || inv.grandTotal || 0,
      inv.paidAmount || 0,
      inv.balanceDue || 0,
      `"${inv.paymentStatus || ""}"`,
      `"${inv.returnStatus || (inv.returns?.length > 0 ? "PARTIALLY_RETURNED" : "NONE")}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `CA_Invoices_Register_${activeStore?.name?.replace(/\s+/g, "_") || "Store"}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Credit Notes to CSV
  const handleExportCreditNotesCSV = () => {
    if (!creditNotes || creditNotes.length === 0) return;

    const headers = [
      "Credit Note #",
      "Return Date",
      "Original Invoice #",
      "Original Invoice Date",
      "Customer Name",
      "Customer GSTIN",
      "Return Reason",
      "Returned Items Count",
      "Taxable Value Reversal (₹)",
      "CGST Reversal (₹)",
      "SGST Reversal (₹)",
      "IGST Reversal (₹)",
      "Total GST Adjustment (₹)",
      "Total Credit Note Value (₹)",
      "Refund Status",
      "Settlement Method",
    ];

    const rows = creditNotes.map((cn) => [
      `"${cn.creditNoteNumber || cn.returnNumber || ""}"`,
      `"${new Date(cn.returnDate || cn.createdAt).toLocaleDateString("en-IN")}"`,
      `"${cn.invoiceNumber || ""}"`,
      `"${cn.originalInvoiceDate ? new Date(cn.originalInvoiceDate).toLocaleDateString("en-IN") : "N/A"}"`,
      `"${cn.customer?.name || "Walk-in Retail Customer"}"`,
      `"${cn.customer?.gstin || "N/A"}"`,
      `"${cn.reason || "Customer Return"}"`,
      cn.items?.length || 0,
      cn.taxableAmount || 0,
      cn.cgstAdjustment || 0,
      cn.sgstAdjustment || 0,
      cn.igstAdjustment || 0,
      cn.gstAdjustment || 0,
      cn.totalAmount || 0,
      `"${cn.refundStatus || "COMPLETED"}"`,
      `"${cn.settlementDetails?.method || "CASH"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `CA_CreditNotes_Register_${activeStore?.name?.replace(/\s+/g, "_") || "Store"}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print / PDF Report Generator
  const handlePrintAuditReport = () => {
    window.print();
  };

  // ── Access Denied Screen (Strict Role Guard Req 5) ──
  if (!isCAUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 fade-up">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-red-100 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl mx-auto grid place-items-center border border-red-200">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Restricted Access</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            The Chartered Accountant Portal is reserved exclusively for authenticated users
            holding the <strong>CA (Chartered Accountant)</strong> role. Your current account
            does not have CA auditing privileges.
          </p>
          <div className="pt-2">
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Aggregate Metrics (Req 1)
  const metrics = summary?.metrics || {
    totalInvoices: invoices.length,
    totalSalesBeforeReturns: invoices.reduce((s, i) => s + (i.grandTotal || 0), 0),
    totalReturnsAmount: invoices.reduce((s, i) => s + Number(i.totalReturnedAmount || 0), 0),
    totalReturnsAndCreditNotes: invoices.reduce((s, i) => s + Number(i.totalReturnedAmount || 0), 0),
    netSalesAfterReturns: invoices.reduce((s, i) => s + (i.netPayable || i.grandTotal || 0), 0),
    gstCollectedOnSales: invoices.reduce((s, i) => s + (i.originalTaxTotal || i.taxTotal || 0), 0),
    gstAdjustmentsFromReturns: invoices.reduce((s, i) => s + (i.gstAdjustment || 0), 0),
    paymentsReceived: invoices.reduce((s, i) => s + (i.paidAmount || 0), 0),
    outstandingBalances: invoices.reduce((s, i) => s + (i.balanceDue || 0), 0),
    totalTaxable: invoices.reduce((s, i) => s + (i.taxableAmount || 0), 0),
    totalCgst: invoices.reduce((s, i) => s + (i.cgst || 0), 0),
    totalSgst: invoices.reduce((s, i) => s + (i.sgst || 0), 0),
    totalIgst: invoices.reduce((s, i) => s + (i.igst || 0), 0),
  };

  return (
    <div className="space-y-6 pb-16 fade-up">
      {/* ══════════════════════════════════════════════════
          TOP HEADER & STORE SWITCHER (Req 5 Multi-tenant)
      ══════════════════════════════════════════════════ */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 print:border-none print:shadow-none print:p-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 grid place-items-center shrink-0 shadow-2xs print:hidden">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Chartered Accountant (CA) Portal
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 print:hidden">
                <CheckCircle2 size={12} /> Certified CA Auditor Workspace
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Multi-store invoice verification, product return audit, and GST reconciliation
            </p>
          </div>
        </div>

        {/* Store Selection & Actions Dropdown */}
        <div className="flex items-center gap-3 self-stretch md:self-auto print:hidden">
          <div className="flex items-center gap-2 w-full md:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
            <Building2 size={18} className="text-slate-500 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Authorized Store
              </span>
              {loadingStores ? (
                <span className="text-xs text-slate-400 font-medium">Loading stores...</span>
              ) : stores.length === 0 ? (
                <span className="text-xs text-rose-600 font-medium">No stores assigned</span>
              ) : (
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-hidden cursor-pointer"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.gstin ? `(${s.gstin})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              loadStoreData();
              loadCreditNotesData();
            }}
            title="Refresh Store Data"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-2xs"
          >
            <RefreshCw size={16} className={loadingData || loadingCreditNotes ? "animate-spin text-blue-600" : ""} />
          </button>

          <Button
            variant="outline"
            size="sm"
            icon={Printer}
            onClick={handlePrintAuditReport}
            title="Print Audit Report or Save as PDF"
            className="hidden sm:inline-flex"
          >
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Empty State when no stores are connected */}
      {stores.length === 0 && !loadingStores && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-8 text-center space-y-3">
          <Building2 size={36} className="mx-auto text-amber-600" />
          <h3 className="text-lg font-bold text-slate-900">No Stores Authorized Yet</h3>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            You do not currently have audit authorization for any shop accounts. Shop owners must explicitly authorize your CA account ({user?.email}) through their <strong>CA Connect</strong> settings before you can inspect their records.
          </p>
        </div>
      )}

      {stores.length > 0 && (
        <>
          {/* ══════════════════════════════════════════════════
              REQ 1: COMPREHENSIVE CA DASHBOARD (7 REQUIRED METRICS)
          ══════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-3.5 print:grid-cols-4">
            {/* Metric 1: Total Invoices */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Invoices</span>
                <FileText size={15} className="text-slate-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5">
                {metrics.totalInvoices}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Audit Invoices</span>
            </div>

            {/* Metric 2: Total Sales Before Returns */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Sales Before Returns</span>
                <TrendingUp size={15} className="text-slate-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 font-mono">
                ₹{Number(metrics.totalSalesBeforeReturns || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Gross Sales Value</span>
            </div>

            {/* Metric 3: Total Returns and Credit Notes */}
            <div className="bg-white p-4 rounded-2xl border border-purple-200/80 bg-purple-50/20 shadow-xs">
              <div className="flex items-center justify-between text-purple-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">Returns &amp; Credit Notes</span>
                <RotateCcw size={15} className="text-purple-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1.5 font-mono">
                ₹{Number(metrics.totalReturnsAmount || metrics.totalReturnsAndCreditNotes || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-purple-600 mt-0.5 block">
                {metrics.totalReturnsCount || creditNotes.length} Credit Notes Issued
              </span>
            </div>

            {/* Metric 4: Net Sales After Returns */}
            <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/20 shadow-xs">
              <div className="flex items-center justify-between text-indigo-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">Net Sales After Returns</span>
                <Scale size={15} className="text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-1.5 font-mono">
                ₹{Number(metrics.netSalesAfterReturns || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-indigo-600 mt-0.5 block">Reconciled Turnover</span>
            </div>

            {/* Metric 5: GST Collected on Sales */}
            <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-xs">
              <div className="flex items-center justify-between text-blue-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">GST Collected</span>
                <Percent size={15} className="text-blue-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1.5 font-mono">
                ₹{Number(metrics.gstCollectedOnSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-blue-600 mt-0.5 block">
                Gross Output Tax
              </span>
            </div>

            {/* Metric 6: GST Adjustments from Returns */}
            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-xs">
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">GST Adjustments</span>
                <RotateCcw size={15} className="text-amber-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1.5 font-mono">
                -₹{Number(metrics.gstAdjustmentsFromReturns || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-amber-600 mt-0.5 block">
                Net GST: ₹{Number(metrics.netGst || (metrics.gstCollectedOnSales - metrics.gstAdjustmentsFromReturns) || 0).toFixed(0)}
              </span>
            </div>

            {/* Metric 7: Payments Received & Outstanding Balances */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">Payments &amp; Dues</span>
                <CreditCard size={15} className="text-emerald-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1.5 font-mono">
                ₹{Number(metrics.paymentsReceived || metrics.totalPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-rose-600 font-bold mt-0.5 font-mono">
                Due: ₹{Number(metrics.outstandingBalances || metrics.totalBalanceDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Quick Period Selector (Req 4) */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50/80 p-3 rounded-2xl border border-slate-200 text-xs print:hidden">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <Calendar size={14} /> Quick Filter:
              </span>
              {[
                { id: "ALL", label: "All Time" },
                { id: "TODAY", label: "Today" },
                { id: "THIS_MONTH", label: "This Month" },
                { id: "THIS_YEAR", label: "This Year" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSetQuickPeriod(p.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    (!selectedMonth && !selectedYear && !startDate && p.id === "ALL") ||
                    (selectedMonth === String(new Date().getMonth() + 1) && p.id === "THIS_MONTH") ||
                    (selectedYear === String(new Date().getFullYear()) && !selectedMonth && p.id === "THIS_YEAR")
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">
                Authorized GSTIN: <strong className="font-mono text-slate-800">{activeStore?.gstin || "Unregistered / Composition"}</strong>
              </span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              MAIN SECTION TABS — ALL 19 WORKSPACE SUB-PAGES
          ══════════════════════════════════════════════════ */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 print:hidden">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin">
              {/* Group A: Overview */}
              <button
                onClick={() => handleTabChange("dashboard")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "dashboard"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <LayoutGrid size={14} /> CA Dashboard
              </button>
              <button
                onClick={() => handleTabChange("clients")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "clients"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Building2 size={14} /> Client Management ({stores.length})
              </button>
              <button
                onClick={() => {
                  handleTabChange("pipeline");
                  loadTasksData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "pipeline"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Activity size={14} /> Audit Pipeline ({tasksList.length})
              </button>
              <button
                onClick={() => handleTabChange("deadlines")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "deadlines"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <AlertTriangle size={14} /> Deadlines &amp; Alerts
              </button>

              <span className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

              {/* Group B: Audit & Accounting */}
              <button
                onClick={() => handleTabChange("invoices")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "invoices"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <FileText size={14} /> Invoices ({invoices.length})
              </button>
              <button
                onClick={() => handleTabChange("returns")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "returns"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <RotateCcw size={14} /> Returns &amp; CN ({creditNotes.length})
              </button>
              <button
                onClick={() => {
                  handleTabChange("purchases");
                  loadPurchasesData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "purchases"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ShoppingBag size={14} /> Purchases ({purchasesList.length})
              </button>
              <button
                onClick={() => {
                  handleTabChange("reconciliation");
                  loadBankSessionData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "reconciliation"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Scale size={14} /> Bank Reconciliation
              </button>
              <button
                onClick={() => handleTabChange("gst")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "gst"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Percent size={14} /> GST Slabs
              </button>
              <button
                onClick={() => {
                  handleTabChange("inventory");
                  loadInventoryData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "inventory"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <PackageCheck size={14} /> Inventory Audit ({inventoryProducts.length})
              </button>
              <button
                onClick={() => {
                  handleTabChange("payments");
                  loadPaymentsData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "payments"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <CreditCard size={14} /> Payments ({paymentsList.length})
              </button>
              <button
                onClick={() => {
                  handleTabChange("expenses");
                  loadExpensesData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "expenses"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Layers size={14} /> Expenses ({expensesList.length})
              </button>

              <span className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

              {/* Group C: Work Management */}
              <button
                onClick={() => {
                  handleTabChange("tasks");
                  loadTasksData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "tasks"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <CheckSquare size={14} /> Tasks ({tasksList.length})
              </button>
              <button
                onClick={() => {
                  handleTabChange("discrepancies");
                  loadDiscrepanciesData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "discrepancies"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-600 hover:bg-rose-50"
                }`}
              >
                <Flag size={14} /> Discrepancies ({discrepanciesList.length})
              </button>
              <button
                onClick={() => {
                  handleTabChange("documents");
                  loadDocumentsData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "documents"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Paperclip size={14} /> Documents ({documentsList.length})
              </button>
              <button
                onClick={() => handleTabChange("queries")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "queries"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <MessageSquare size={14} /> Client Queries ({queriesList.length})
              </button>

              <span className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

              {/* Group D: Reporting & Compliance */}
              <button
                onClick={() => {
                  handleTabChange("workpapers");
                  loadWorkpapersData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "workpapers"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <FileSpreadsheet size={14} /> Workpapers &amp; Reports
              </button>
              <button
                onClick={() => {
                  handleTabChange("closing");
                  loadClosingsData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "closing"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <FileCheck size={14} /> Period Closing
              </button>
              <button
                onClick={() => {
                  handleTabChange("activity");
                  loadActivityData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "activity"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Activity size={14} /> Activity Ledger ({activityList.length})
              </button>

              <span className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

              {/* Group E: Administration */}
              <button
                onClick={() => handleTabChange("team")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "team"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Users size={14} /> Team &amp; Roles ({teamMembers.length})
              </button>
              <button
                onClick={() => {
                  handleTabChange("automation");
                  loadAuditRulesData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "automation"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <SlidersHorizontal size={14} /> Automation Rules
              </button>
              <button
                onClick={() => {
                  handleTabChange("settings");
                  loadAuditRulesData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "settings"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Settings size={14} /> Client Settings
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === "invoices" && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  onClick={handleExportInvoicesCSV}
                  title="Export Invoices to CSV"
                >
                  Export Invoices CSV
                </Button>
              )}
              {activeTab === "returns" && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  onClick={handleExportCreditNotesCSV}
                  title="Export Credit Notes to CSV"
                >
                  Export Credit Notes CSV
                </Button>
              )}
              {activeTab === "activity" && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={RefreshCw}
                  loading={loadingActivity}
                  onClick={loadActivityData}
                  title="Refresh Activity Ledger"
                >
                  Refresh Ledger
                </Button>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              VIEW 0: CA DASHBOARD EXECUTIVE OVERVIEW (Section A)
          ══════════════════════════════════════════════════ */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Executive Welcome & Audit Posture */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
                    <Sparkles size={14} /> Professional CA Audit Automation Suite Active
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">
                    Welcome back, {user?.name || "Chartered Accountant"}
                  </h2>
                  <p className="text-slate-300 text-xs max-w-xl leading-relaxed">
                    Client Store: <strong className="text-white font-semibold">{activeStore?.name || "Active Store"}</strong> ({activeStore?.gstin || "Unregistered / Composition"}). All transactions, GST adjustments, and reconciliation workflows are synchronized with immutable traceability.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={SlidersHorizontal}
                    loading={loadingRules}
                    onClick={handleExecuteAuditRules}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg"
                  >
                    Execute Rules Engine
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={FileSpreadsheet}
                    onClick={() => handleTabChange("workpapers")}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    View Workpapers
                  </Button>
                </div>
              </div>

              {/* Portfolio Quick Access Grid */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Building2 size={16} className="text-blue-600" />
                      Connected Client Businesses ({stores.length})
                    </h3>
                    <p className="text-xs text-slate-500">Quickly switch active audit client context</p>
                  </div>
                  <button
                    onClick={() => handleTabChange("clients")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Manage All Clients <ChevronRight size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {stores.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStoreId(s.id)}
                      className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                        selectedStoreId === s.id
                          ? "border-blue-600 bg-blue-50/40 shadow-xs"
                          : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs truncate max-w-[140px]">{s.name}</span>
                          {selectedStoreId === s.id && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                          GSTIN: {s.gstin || "Unregistered"}
                        </span>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Authorized
                        </span>
                        <span className="text-blue-600 font-bold">
                          {selectedStoreId === s.id ? "Auditing Now" : "Select Client →"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audit Pipeline Health & Statutory Deadlines */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pipeline Stages Card */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Activity size={16} className="text-indigo-600" />
                      Audit Task Workflow Health
                    </h3>
                    <button
                      onClick={() => handleTabChange("pipeline")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      Open Kanban Board <ArrowRight size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">To Review</span>
                      <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                        {tasksList.filter((t) => t.status === "PENDING" || !t.status).length}
                      </span>
                    </div>
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                      <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">In Progress</span>
                      <span className="text-xl font-black text-blue-800 mt-1 block font-mono">
                        {tasksList.filter((t) => t.status === "IN_PROGRESS").length}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
                      <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block">Correction Req.</span>
                      <span className="text-xl font-black text-rose-800 mt-1 block font-mono">
                        {tasksList.filter((t) => t.status === "CORRECTION_REQUIRED").length}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Completed</span>
                      <span className="text-xl font-black text-emerald-800 mt-1 block font-mono">
                        {tasksList.filter((t) => t.status === "COMPLETED" || t.status === "APPROVED").length}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Command Center */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Auditor Quick Actions
                    </span>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <button
                        onClick={() => setNewTaskModalOpen(true)}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <Plus size={14} /> New Audit Task
                      </button>
                      <button
                        onClick={() => setImportBankModalOpen(true)}
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-semibold flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <Scale size={14} /> Import Bank Statement
                      </button>
                      <button
                        onClick={() => setFlagModalOpen(true)}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <Flag size={14} /> Flag Discrepancy
                      </button>
                      <button
                        onClick={() => setNewQueryModalOpen(true)}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-semibold flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <MessageSquare size={14} /> Raise Query to Client
                      </button>
                    </div>
                  </div>
                </div>

                {/* Deadlines & Alerts Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-600" />
                      Statutory Deadlines
                    </h3>
                    <button
                      onClick={() => handleTabChange("deadlines")}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700"
                    >
                      All Alerts →
                    </button>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/30 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">GSTR-1 Monthly Return</span>
                        <span className="text-[10px] text-slate-500">Outward B2B &amp; B2C supplies</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Due 11th Nov
                      </span>
                    </div>
                    <div className="p-3 rounded-xl border border-blue-200/80 bg-blue-50/30 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">GSTR-3B Summary Return</span>
                        <span className="text-[10px] text-slate-500">Tax settlement &amp; eligible ITC</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        Due 20th Nov
                      </span>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">Period Closing Sign-Off</span>
                        <span className="text-[10px] text-slate-500">Lock immutable ledger</span>
                      </div>
                      <button
                        onClick={() => setCloseModalOpen(true)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-white"
                      >
                        Freeze Period
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Audit Trail Stream Preview */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <History size={16} className="text-slate-600" />
                    Synchronized Audit Activity Stream
                  </h3>
                  <button
                    onClick={() => handleTabChange("activity")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    View Full Immutable Ledger →
                  </button>
                </div>
                {activityList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No recent activity recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {activityList.slice(0, 5).map((act, i) => (
                      <div key={i} className="py-2.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900">{act.action || "TRANSACTION_EVENT"}</span>
                            <span className="text-slate-500 text-[11px] block">{act.details || act.note || "Audit record verified"}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {act.timestamp ? new Date(act.timestamp).toLocaleTimeString("en-IN") : "Just now"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 1: INVOICE MANAGEMENT REGISTER (Req 2)
          ══════════════════════════════════════════════════ */}
          {activeTab === "invoices" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              {/* Filter Bar */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Invoice #, Customer, GSTIN, Phone..."
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Payment Status Filter (Paid, Unpaid, Pending, Partially Paid) */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
                    {[
                      { id: "ALL", label: "All" },
                      { id: "PAID", label: "Paid" },
                      { id: "PARTIALLY_PAID", label: "Partial" },
                      { id: "PENDING", label: "Pending" },
                      { id: "UNPAID", label: "Unpaid" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setStatusFilter(st.id)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                          statusFilter === st.id
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Return Status Filter (Returned, Partially Returned, None) */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-600">
                    <RotateCcw size={13} className="text-slate-400" />
                    <select
                      value={returnFilter}
                      onChange={(e) => setReturnFilter(e.target.value)}
                      className="bg-transparent font-medium text-slate-800 outline-hidden cursor-pointer"
                    >
                      <option value="ALL">All Return Status</option>
                      <option value="NONE">No Returns</option>
                      <option value="PARTIALLY_RETURNED">Partially Returned</option>
                      <option value="RETURNED">Fully Returned</option>
                    </select>
                  </div>

                  {/* Month & Year Filter */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent font-medium text-slate-700 outline-hidden cursor-pointer"
                    >
                      <option value="">Month</option>
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((m, idx) => (
                        <option key={m} value={m}>
                          {new Date(2026, idx, 1).toLocaleString("en-US", { month: "short" })}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-transparent font-medium text-slate-700 outline-hidden cursor-pointer"
                    >
                      <option value="">Year</option>
                      {["2026", "2025", "2024"].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Pickers */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1">
                    <Calendar size={14} className="text-slate-400" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="text-xs text-slate-700 bg-transparent outline-hidden cursor-pointer"
                    />
                    <span className="text-xs text-slate-300">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="text-xs text-slate-700 bg-transparent outline-hidden cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer Details</th>
                      <th className="py-3 px-4 text-right">Taxable (₹)</th>
                      <th className="py-3 px-4 text-right">CGST (₹)</th>
                      <th className="py-3 px-4 text-right">SGST (₹)</th>
                      <th className="py-3 px-4 text-right">IGST (₹)</th>
                      <th className="py-3 px-4 text-right">Total (₹)</th>
                      <th className="py-3 px-4 text-right">Paid (₹)</th>
                      <th className="py-3 px-4 text-right">Due (₹)</th>
                      <th className="py-3 px-4 text-center">Payment Status</th>
                      <th className="py-3 px-4 text-center">Return Status</th>
                      <th className="py-3 px-4 text-center">Audit &amp; View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingData ? (
                      <tr>
                        <td colSpan="13" className="py-12 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw size={18} className="animate-spin text-blue-600" />
                            <span>Loading synchronized invoices...</span>
                          </div>
                        </td>
                      </tr>
                    ) : invoices.length === 0 ? (
                      <tr>
                        <td colSpan="13" className="py-12 text-center text-slate-400">
                          No invoices matching the current filter.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => {
                        const rawPS = (inv.paymentStatus || "").toUpperCase();
                        const isPaid = rawPS === "PAID" || inv.balanceDue === 0;
                        const isPartial = rawPS === "PARTIALLY_PAID" || rawPS === "PARTIALLY PAID" || rawPS === "PARTIAL";
                        const isPending = rawPS === "PENDING";

                        const retStatus = (inv.returnStatus || (inv.returns?.length > 0 ? "PARTIALLY_RETURNED" : "NONE")).toUpperCase();

                        return (
                          <tr
                            key={inv.id || inv._id}
                            className="hover:bg-slate-50/80 transition group cursor-pointer"
                            onClick={() => handleOpenInvoice(inv)}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-blue-600">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {new Date(inv.date || inv.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">
                                {inv.customer?.name || "Walk-in Retail Customer"}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                {inv.customer?.phone && <span>{inv.customer.phone}</span>}
                                {inv.customer?.gstin && (
                                  <span className="font-mono px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                                    {inv.customer.gstin}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-700">
                              ₹{(inv.taxableAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">
                              ₹{(inv.cgst || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">
                              ₹{(inv.sgst || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">
                              ₹{(inv.igst || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              ₹{(inv.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                              ₹{(inv.paidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">
                              ₹{(inv.balanceDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isPaid
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : isPartial
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : isPending
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {isPaid ? "Paid" : isPartial ? "Partial" : isPending ? "Pending" : "Unpaid"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {retStatus === "RETURNED" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                  Returned
                                </span>
                              ) : retStatus === "PARTIALLY_RETURNED" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                  Partial Ret.
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px] font-medium">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <CompactIconButton
                                  variant="primary"
                                  size="sm"
                                  icon={Eye}
                                  onClick={() => handleOpenInvoice(inv)}
                                  title="View Tax Invoice & Product Breakdown"
                                />
                                <CompactIconButton
                                  variant="outline"
                                  size="sm"
                                  icon={History}
                                  onClick={(e) => handleOpenAuditTrail(inv, e)}
                                  title="Inspect Lifecycle Audit Trail"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 2: RETURNS AND CREDIT NOTES (Req 3)
          ══════════════════════════════════════════════════ */}
          {activeTab === "returns" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              {/* Header & Filter Bar */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={creditNoteSearch}
                    onChange={(e) => setCreditNoteSearch(e.target.value)}
                    placeholder="Search by Credit Note #, Return #, Invoice #, Reason..."
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Total Credit Notes:</span> {creditNotes.length}
                </div>
              </div>

              {/* Credit Notes Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Credit Note #</th>
                      <th className="py-3 px-4">Return Date</th>
                      <th className="py-3 px-4">Original Invoice #</th>
                      <th className="py-3 px-4">Customer Details</th>
                      <th className="py-3 px-4 text-center">Items Returned</th>
                      <th className="py-3 px-4 text-right">Taxable Reversal (₹)</th>
                      <th className="py-3 px-4 text-right">CGST Rev. (₹)</th>
                      <th className="py-3 px-4 text-right">SGST Rev. (₹)</th>
                      <th className="py-3 px-4 text-right">IGST Rev. (₹)</th>
                      <th className="py-3 px-4 text-right">Total Refund (₹)</th>
                      <th className="py-3 px-4 text-center">Settlement Info</th>
                      <th className="py-3 px-4 text-center">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingCreditNotes ? (
                      <tr>
                        <td colSpan="12" className="py-12 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw size={18} className="animate-spin text-purple-600" />
                            <span>Loading credit notes and GST adjustments...</span>
                          </div>
                        </td>
                      </tr>
                    ) : creditNotes.length === 0 ? (
                      <tr>
                        <td colSpan="12" className="py-12 text-center text-slate-400">
                          No product returns or credit notes recorded for this store in the selected period.
                        </td>
                      </tr>
                    ) : (
                      creditNotes.map((cn) => {
                        const itemsCount = (cn.items || []).reduce((acc, it) => acc + Number(it.quantity || 1), 0);
                        const isInter = Boolean(cn.isInterState);

                        return (
                          <tr
                            key={cn.id || cn._id}
                            className="hover:bg-slate-50/80 transition cursor-pointer"
                            onClick={() => setSelectedCreditNote(cn)}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-purple-700">
                              {cn.creditNoteNumber || cn.returnNumber}
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {new Date(cn.returnDate || cn.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                              {cn.invoiceNumber}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">
                                {cn.customer?.name || "Walk-in Retail Customer"}
                              </div>
                              {cn.customer?.gstin && (
                                <div className="text-[10px] font-mono text-slate-500">
                                  GSTIN: {cn.customer.gstin}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                                {itemsCount} units ({cn.items?.length || 0} items)
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-700 font-semibold">
                              ₹{Number(cn.taxableAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">
                              {isInter ? "—" : `₹${Number(cn.cgstAdjustment || 0).toFixed(2)}`}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">
                              {isInter ? "—" : `₹${Number(cn.sgstAdjustment || 0).toFixed(2)}`}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">
                              {isInter ? `₹${Number(cn.igstAdjustment || cn.gstAdjustment || 0).toFixed(2)}` : "—"}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                              ₹{Number(cn.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {cn.settlementDetails?.method || "CASH"} / {cn.refundStatus || "COMPLETED"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <CompactIconButton
                                variant="primary"
                                size="sm"
                                icon={Eye}
                                onClick={() => setSelectedCreditNote(cn)}
                                title="Inspect Credit Note & Line-Item Reversal"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 3: GST REPORTS & TAX FILING ANALYSIS (Req 4)
          ══════════════════════════════════════════════════ */}
          {activeTab === "gst" && (
            <div className="space-y-6">
              {/* B2B vs B2C Supplies Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Building2 size={16} className="text-indigo-600" /> B2B Supplies (Registered)
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700">
                      GSTR-1 Table 4A, 4B, 4C
                    </span>
                  </div>
                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Invoices Count:</span>
                      <strong className="text-slate-900 font-mono">{summary?.gstFiling?.b2b?.count || 0}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Taxable Value:</span>
                      <strong className="font-mono text-slate-900">
                        ₹{(summary?.gstFiling?.b2b?.taxable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Output Tax (CGST + SGST + IGST):</span>
                      <strong className="font-mono text-blue-600">
                        ₹{(summary?.gstFiling?.b2b?.tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <CreditCard size={16} className="text-blue-600" /> B2C Supplies (Retail &amp; Walk-ins)
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700">
                      GSTR-1 Table 7
                    </span>
                  </div>
                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Invoices Count:</span>
                      <strong className="text-slate-900 font-mono">{summary?.gstFiling?.b2c?.count || 0}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Taxable Value:</span>
                      <strong className="font-mono text-slate-900">
                        ₹{(summary?.gstFiling?.b2c?.taxable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Output Tax:</span>
                      <strong className="font-mono text-blue-600">
                        ₹{(summary?.gstFiling?.b2c?.tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rate-Wise Slab Summary */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">GST Rate Slab Classification (0%, 5%, 12%, 18%, 28%)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Statutory tax breakdown by GST slab for direct input into GSTR-3B and GSTR-1
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                    Tax-component Totals
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Rate Slab</th>
                        <th className="py-3 px-4 text-right">Taxable Turnover (₹)</th>
                        <th className="py-3 px-4 text-right">CGST (₹)</th>
                        <th className="py-3 px-4 text-right">SGST (₹)</th>
                        <th className="py-3 px-4 text-right">Total Tax (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {["0", "5", "12", "18", "28"].map((rate) => {
                        const slab = summary?.gstFiling?.slabs?.[rate] || { taxable: 0, tax: 0 };
                        const halfTax = (slab.tax / 2).toFixed(2);
                        return (
                          <tr key={rate} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-sans font-bold text-slate-900">
                              GST {rate}% Slab
                            </td>
                            <td className="py-3 px-4 text-right text-slate-800">
                              ₹{Number(slab.taxable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-600">₹{halfTax}</td>
                            <td className="py-3 px-4 text-right text-slate-600">₹{halfTax}</td>
                            <td className="py-3 px-4 text-right font-bold text-blue-600">
                              ₹{Number(slab.tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 4: SYNCHRONIZED ACTIVITY & AUDIT LEDGER
          ══════════════════════════════════════════════════ */}
          {activeTab === "activity" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <History size={16} className="text-indigo-600" />
                    Synchronized Invoice Activity Ledger
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Immutable chronological record of all bill creation, payments, product returns, credit notes, and voiding events for {activeStore?.name || "Authorized Store"}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <ShieldCheck size={13} /> Authoritative PostgreSQL Ledger
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono">
                    {activityList.length} Events
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Invoice # &amp; Customer</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Financial State (Before → After)</th>
                      <th className="py-3 px-4">Adjustment / Notes</th>
                      <th className="py-3 px-4">Performed By</th>
                      <th className="py-3 px-4 text-center">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingActivity ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw size={16} className="animate-spin text-indigo-600" />
                            <span>Loading synchronized activity stream...</span>
                          </div>
                        </td>
                      </tr>
                    ) : activityList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No synchronized activity records found for this store.
                        </td>
                      </tr>
                    ) : (
                      activityList.map((log) => {
                        const d = log.details || {};
                        const action = log.action || d.eventType || "INVOICE_EVENT";
                        const isCreate = action === "INVOICE_CREATED";
                        const isPay = action === "PAYMENT_RECEIVED" || action === "PARTIAL_PAYMENT";
                        const isRet = action === "SALE_RETURNED" || action === "PRODUCT_RETURN";
                        const isVoid = action === "INVOICE_VOIDED" || action === "INVOICE_CANCELLED";

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isCreate
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : isPay
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : isRet
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : isVoid
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {isCreate && <FileText size={11} />}
                                {isPay && <CreditCard size={11} />}
                                {isRet && <RotateCcw size={11} />}
                                {isVoid && <AlertTriangle size={11} />}
                                {action.replace(/_/g, " ")}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-mono font-bold text-slate-900">
                                {d.invoiceNumber || (log.entityType === "SALE" ? `#${log.entityId.slice(0, 8)}` : "—")}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {d.customerName || "Walk-in Customer"}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                              {new Date(log.timestamp || log.createdAt).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </td>

                            <td className="py-3.5 px-4 font-mono text-[11px]">
                              {d.before && d.after ? (
                                <div className="space-y-0.5">
                                  <div>
                                    <span className="text-slate-400">Total: </span>
                                    <span className="line-through text-slate-400">₹{Number(d.before.grandTotal || 0).toFixed(0)}</span>
                                    <span className="text-slate-900 font-bold"> → ₹{Number(d.after.grandTotal || 0).toFixed(0)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Paid: </span>
                                    <span className="line-through text-slate-400">₹{Number(d.before.paidAmount || 0).toFixed(0)}</span>
                                    <span className="text-emerald-700 font-bold"> → ₹{Number(d.after.paidAmount || 0).toFixed(0)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Due: </span>
                                    <span className="line-through text-slate-400">₹{Number(d.before.balanceDue || 0).toFixed(0)}</span>
                                    <span className="text-rose-600 font-bold"> → ₹{Number(d.after.balanceDue || 0).toFixed(0)}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <div>
                                    <span className="text-slate-400">Total: </span>
                                    <span className="font-bold text-slate-900">₹{Number(d.grandTotal || 0).toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Paid: </span>
                                    <span className="font-semibold text-emerald-700">₹{Number(d.paidAmount || 0).toFixed(2)}</span>
                                    <span className="text-slate-400 ml-2">Due: </span>
                                    <span className="font-semibold text-rose-600">₹{Number(d.balanceDue || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-[11px]">
                              {d.creditNoteNumber && (
                                <div className="text-purple-700 font-semibold">
                                  CN #{d.creditNoteNumber} (GST Adj: ₹{Number(d.gstAdjustment || 0).toFixed(2)})
                                </div>
                              )}
                              {d.returnNumber && (
                                <div className="text-slate-600">
                                  Return #{d.returnNumber}
                                </div>
                              )}
                              {d.reason && (
                                <div className="text-slate-500 italic">
                                  Reason: {d.reason}
                                </div>
                              )}
                              {!d.creditNoteNumber && !d.returnNumber && !d.reason && (
                                <span className="text-slate-400 font-mono text-[10px]">Normal Transaction</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-medium text-slate-800">
                                {log.user?.name || log.user?.email || "System"}
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                {log.user?.role || "SYSTEM"}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {log.entityType === "SALE" && (
                                <CompactIconButton
                                  variant="primary"
                                  size="sm"
                                  icon={Eye}
                                  title="View Linked Invoice"
                                  onClick={() => handleOpenInvoice({ id: log.entityId })}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              MODULE 2: AUDIT WORKFLOW & TASK PIPELINE
          ══════════════════════════════════════════════════ */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckSquare size={16} className="text-blue-600" />
                    Audit Tasks &amp; Review Pipeline
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track pending reviews, flags, correction requests, and auditor sign-offs for {activeStore?.name}.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => setNewTaskModalOpen(true)}
                >
                  Create Audit Task
                </Button>
              </div>

              {/* Status Summary Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                {[
                  { label: "Pending", count: tasksCounts.PENDING || 0, bg: "bg-amber-50 text-amber-700 border-amber-200" },
                  { label: "In Review", count: tasksCounts.IN_REVIEW || 0, bg: "bg-blue-50 text-blue-700 border-blue-200" },
                  { label: "Flagged", count: tasksCounts.FLAGGED || 0, bg: "bg-rose-50 text-rose-700 border-rose-200" },
                  { label: "Correction Req", count: tasksCounts.CORRECTION_REQUESTED || 0, bg: "bg-purple-50 text-purple-700 border-purple-200" },
                  { label: "Resolved", count: tasksCounts.RESOLVED || 0, bg: "bg-teal-50 text-teal-700 border-teal-200" },
                  { label: "Completed", count: tasksCounts.COMPLETED || 0, bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                ].map((s) => (
                  <div key={s.label} className={`p-2.5 rounded-xl border font-bold ${s.bg}`}>
                    <div className="text-lg font-black">{s.count}</div>
                    <div className="text-[10px] uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Tasks List */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {loadingTasks ? (
                    <div className="p-12 text-center text-slate-400">Loading audit tasks...</div>
                  ) : tasksList.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs">
                      No audit tasks created yet. Click "Create Audit Task" above to add review items.
                    </div>
                  ) : (
                    tasksList.map((t) => (
                      <div key={t.id} className="p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{t.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              t.priority === "URGENT" || t.priority === "HIGH"
                                ? "bg-rose-100 text-rose-800"
                                : t.priority === "MEDIUM"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {t.priority}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                              {t.category}
                            </span>
                          </div>
                          {t.description && (
                            <p className="text-xs text-slate-600 max-w-2xl">{t.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-[11px] text-slate-400">
                            <span>Created: {new Date(t.createdAt).toLocaleDateString("en-IN")}</span>
                            {t.dueDate && <span>Due: {new Date(t.dueDate).toLocaleDateString("en-IN")}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={t.status}
                            onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value)}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="FLAGGED">Flagged</option>
                            <option value="CORRECTION_REQUESTED">Correction Requested</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                          <CompactIconButton
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            title="Delete Task"
                            onClick={() => handleDeleteTask(t.id)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              MODULE 4: PURCHASES & SUPPLIERS AUDIT
          ══════════════════════════════════════════════════ */}
          {activeTab === "purchases" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <ShoppingBag size={16} className="text-blue-600" />
                    Purchases Register &amp; Supplier Audit
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review vendor purchase bills, supplier GSTINs, input tax credits, and accounts payable.
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800">
                  {purchasesList.length} Purchase Bills
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Supplier &amp; GSTIN</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Taxable (₹)</th>
                        <th className="py-3 px-4 text-right">GST (₹)</th>
                        <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                        <th className="py-3 px-4 text-right">Paid (₹)</th>
                        <th className="py-3 px-4 text-right">Balance Due (₹)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {loadingPurchases ? (
                        <tr><td colSpan={9} className="py-12 text-center text-slate-400">Loading purchase bills...</td></tr>
                      ) : purchasesList.length === 0 ? (
                        <tr><td colSpan={9} className="py-12 text-center text-slate-400">No purchase records found for this store.</td></tr>
                      ) : (
                        purchasesList.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 font-bold text-slate-900">{p.invoiceNumber}</td>
                            <td className="py-3 px-4 font-sans">
                              <div className="font-semibold text-slate-800">{p.supplierName}</div>
                              {p.supplierGstin && <div className="text-[10px] text-slate-400 font-mono">GSTIN: {p.supplierGstin}</div>}
                            </td>
                            <td className="py-3 px-4 font-sans text-slate-600">{new Date(p.purchaseDate).toLocaleDateString("en-IN")}</td>
                            <td className="py-3 px-4 text-right text-slate-800">₹{p.subtotal?.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-blue-600">₹{p.taxTotal?.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">₹{p.grandTotal?.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-emerald-600">₹{p.paidAmount?.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-rose-600 font-bold">₹{p.balanceDue?.toFixed(2)}</td>
                            <td className="py-3 px-4 text-center font-sans">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.paymentStatus === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}>
                                {p.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              MODULE 5: PAYMENTS & BANK RECONCILIATION
          ══════════════════════════════════════════════════ */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CreditCard size={16} className="text-emerald-600" />
                    Payments &amp; Bank Reconciliation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Compare recorded payments, transaction IDs, payment methods, and ledger settlement status.
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono">
                  {paymentsList.length} Payment Receipts
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Receipt Date</th>
                        <th className="py-3 px-4">Invoice # &amp; Customer</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Transaction / Ref #</th>
                        <th className="py-3 px-4 text-right">Amount (₹)</th>
                        <th className="py-3 px-4 text-center">Reconciliation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingPayments ? (
                        <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading payment receipts...</td></tr>
                      ) : paymentsList.length === 0 ? (
                        <tr><td colSpan={6} className="py-12 text-center text-slate-400">No payment receipts recorded for this store.</td></tr>
                      ) : (
                        paymentsList.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 font-mono text-slate-600">{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-slate-900">{p.invoiceNumber}</span>
                              <div className="text-[11px] text-slate-500">{p.customerName}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800">
                                {p.method}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500">{p.transactionId || "—"}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">₹{p.amount?.toFixed(2)}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.reconciliationStatus === "MATCHED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}>
                                {p.reconciliationStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              MODULE 6: EXPENSES & FINANCIAL REVIEW
          ══════════════════════════════════════════════════ */}
          {activeTab === "expenses" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Layers size={16} className="text-purple-600" />
                    Business Expenses &amp; Outflow Review
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Audit operational overheads, vendor payouts, utility payments, and tax-deductible items.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Expenses</span>
                  <span className="text-base font-black font-mono text-purple-700">₹{Number(expensesTotal || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Expense Title</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Payment Method</th>
                        <th className="py-3 px-4">Recorded By</th>
                        <th className="py-3 px-4 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingExpenses ? (
                        <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading expenses...</td></tr>
                      ) : expensesList.length === 0 ? (
                        <tr><td colSpan={6} className="py-12 text-center text-slate-400">No expense records found for this store.</td></tr>
                      ) : (
                        expensesList.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 font-mono text-slate-600">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{e.title}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                {e.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">{e.paymentMethod}</td>
                            <td className="py-3 px-4 text-slate-600">{e.recordedBy}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{e.amount?.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              MODULE 8: INVENTORY AUDIT & STOCK MOVEMENTS
          ══════════════════════════════════════════════════ */}
          {activeTab === "inventory" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <PackageCheck size={16} className="text-amber-600" />
                    Inventory Valuation &amp; Stock Ledger Audit
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verify stock balances, preventing duplicate additions/deductions upon returns and voiding.
                  </p>
                </div>
                {inventorySummary && (
                  <div className="flex items-center gap-4 text-right font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Total Products</span>
                      <strong className="text-slate-900">{inventorySummary.totalProducts}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Stock Valuation</span>
                      <strong className="text-amber-700 font-black">₹{Number(inventorySummary.totalValuation || 0).toLocaleString("en-IN")}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-3 bg-slate-50 font-bold text-xs text-slate-700 border-b border-slate-200">
                  Stock Holdings &amp; HSN/GST Classification
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-4">Product Name</th>
                        <th className="py-2.5 px-4 font-mono">HSN Code</th>
                        <th className="py-2.5 px-4 font-mono">GST Rate</th>
                        <th className="py-2.5 px-4 text-right">In Stock</th>
                        <th className="py-2.5 px-4 text-right">Cost Price (₹)</th>
                        <th className="py-2.5 px-4 text-right">Selling Price (₹)</th>
                        <th className="py-2.5 px-4 text-right">Valuation (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {loadingInventory ? (
                        <tr><td colSpan={7} className="py-8 text-center text-slate-400">Loading stock catalog...</td></tr>
                      ) : inventoryProducts.length === 0 ? (
                        <tr><td colSpan={7} className="py-8 text-center text-slate-400">No inventory products found.</td></tr>
                      ) : (
                        inventoryProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-2.5 px-4 font-sans font-semibold text-slate-800">{p.name}</td>
                            <td className="py-2.5 px-4 text-slate-500">{p.hsnCode}</td>
                            <td className="py-2.5 px-4 text-blue-600 font-bold">{p.taxPercent}%</td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-900">{p.stock} {p.unit}</td>
                            <td className="py-2.5 px-4 text-right text-slate-600">₹{p.costPrice?.toFixed(2)}</td>
                            <td className="py-2.5 px-4 text-right text-slate-800">₹{p.sellingPrice?.toFixed(2)}</td>
                            <td className="py-2.5 px-4 text-right font-bold text-amber-700">₹{p.valuation?.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stock Movements Ledger */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-3 bg-slate-50 font-bold text-xs text-slate-700 border-b border-slate-200">
                  Chronological Stock Movements Ledger (Deductions &amp; Returns Reversals)
                </div>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs text-left font-mono">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2 px-4">Date</th>
                        <th className="py-2 px-4 font-sans">Product</th>
                        <th className="py-2 px-4">Type</th>
                        <th className="py-2 px-4 text-right">Quantity</th>
                        <th className="py-2 px-4 text-right">Previous Stock</th>
                        <th className="py-2 px-4 text-right">New Stock</th>
                        <th className="py-2 px-4 font-sans">Reason / Milestone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {inventoryMovements.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2 px-4 text-slate-500">{new Date(m.createdAt).toLocaleString("en-IN")}</td>
                          <td className="py-2 px-4 font-sans font-semibold text-slate-800">{m.productName}</td>
                          <td className="py-2 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.type === "RETURN"
                                ? "bg-purple-50 text-purple-700"
                                : m.type === "SALE"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {m.type}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right font-bold text-slate-900">{m.quantity}</td>
                          <td className="py-2 px-4 text-right text-slate-500">{m.previousStock}</td>
                          <td className="py-2 px-4 text-right font-bold text-emerald-700">{m.newStock}</td>
                          <td className="py-2 px-4 font-sans text-slate-600">{m.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              MODULE 10: DISCREPANCIES & CORRECTIONS
          ══════════════════════════════════════════════════ */}
          {activeTab === "discrepancies" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-rose-200/90 shadow-xs flex items-center justify-between bg-rose-50/20">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Flag size={16} className="text-rose-600" />
                    Audit Discrepancies &amp; Merchant Correction Requests
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Flag tax calculation errors, missing bills, or unmatched returns and track owner resolution.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Flag}
                  onClick={() => setFlagModalOpen(true)}
                  className="bg-rose-600 hover:bg-rose-700 border-rose-600"
                >
                  Flag Discrepancy
                </Button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {loadingDiscrepancies ? (
                    <div className="p-12 text-center text-slate-400">Loading discrepancies...</div>
                  ) : discrepanciesList.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs">
                      No unresolved discrepancies found for this store. Clean audit record!
                    </div>
                  ) : (
                    discrepanciesList.map((d) => (
                      <div key={d.id} className="p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-4">
                        <div className="space-y-1.5 max-w-3xl">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{d.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.status === "VERIFIED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : d.status === "RESOLVED"
                                ? "bg-teal-50 text-teal-700 border border-teal-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}>
                              {d.status}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {d.discrepancyType}
                            </span>
                            {d.referenceNumber && (
                              <span className="font-mono text-xs text-blue-600 font-bold">Ref: {d.referenceNumber}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600">{d.description}</p>
                          {d.correctionResponse && (
                            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900">
                              <strong>Store Owner Response:</strong> {d.correctionResponse}
                            </div>
                          )}
                        </div>

                        <div>
                          {d.status === "RESOLVED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={CheckCircle2}
                              onClick={() => handleVerifyDiscrepancy(d.id)}
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            >
                              Verify Correction
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              MODULE 9: DOCUMENTS & EVIDENCE
          ══════════════════════════════════════════════════ */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Paperclip size={16} className="text-indigo-600" />
                    Supporting Evidence &amp; Tax Documents Repository
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Invoices, purchase bills, bank statements, credit notes, and tax challans linked to audits.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => setNewDocModalOpen(true)}
                >
                  Attach Document
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {loadingDocuments ? (
                  <div className="col-span-3 p-12 text-center text-slate-400">Loading documents...</div>
                ) : documentsList.length === 0 ? (
                  <div className="col-span-3 p-12 text-center text-slate-400 text-xs">
                    No documents attached yet. Click "Attach Document" to link evidence.
                  </div>
                ) : (
                  documentsList.map((doc) => (
                    <div key={doc.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{doc.title}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700">
                          {doc.fileType}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block">{doc.category}</span>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        <ExternalLink size={12} /> Open Document
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              MODULE 13: PERIOD CLOSING & SIGN-OFF
          ══════════════════════════════════════════════════ */}
          {activeTab === "closing" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileCheck size={16} className="text-emerald-600" />
                    Period Closing &amp; CA Handover Sign-Off
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Freeze finalized tax periods, verify unresolved discrepancies, and issue CA audit certification.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Lock}
                  onClick={() => setCloseModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                >
                  Close Tax Period
                </Button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {loadingClosings ? (
                    <div className="p-12 text-center text-slate-400">Loading period closings...</div>
                  ) : periodClosingsList.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs">
                      No tax periods closed yet. Click "Close Tax Period" to reconcile a period.
                    </div>
                  ) : (
                    periodClosingsList.map((p) => (
                      <div key={p.id} className="p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 font-mono text-sm">Period: {p.period}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === "SIGNED_OFF"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}>
                              {p.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono text-slate-700">
                            <span>Sales: ₹{Number(p.totalSales || 0).toFixed(2)}</span>
                            <span>GST Collected: ₹{Number(p.totalGstCollected || 0).toFixed(2)}</span>
                            <span>GST Adjusted: ₹{Number(p.totalGstAdjusted || 0).toFixed(2)}</span>
                            <span className="font-bold text-blue-600">Net GST: ₹{Number(p.netGstPayable || 0).toFixed(2)}</span>
                          </div>
                          {p.signOffNotes && (
                            <p className="text-xs text-slate-500 italic mt-1">"{p.signOffNotes}"</p>
                          )}
                        </div>

                        <div>
                          {p.status !== "SIGNED_OFF" && (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={CheckCircle2}
                              onClick={() => handleSignOffPeriod(p.id)}
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            >
                              CA Sign-Off
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              MODULE 5: BANK & PAYMENT RECONCILIATION
          ══════════════════════════════════════════════════ */}
          {activeTab === "reconciliation" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Scale size={16} className="text-blue-600" />
                    Bank Statement Reconciliation &amp; Transaction Matcher
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Match recorded business payments and expense vouchers against imported bank statement entries.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={RefreshCw}
                    loading={loadingBankSession}
                    onClick={loadBankSessionData}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => setImportBankModalOpen(true)}
                  >
                    Import Bank Statement
                  </Button>
                </div>
              </div>

              {/* Statement KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Statement Deposits</span>
                  <div className="text-lg font-black text-emerald-700 mt-1 font-mono">
                    ₹{Number(bankSession?.totalDeposits || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Customer Inflows</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Statement Withdrawals</span>
                  <div className="text-lg font-black text-rose-700 mt-1 font-mono">
                    ₹{Number(bankSession?.totalWithdrawals || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Expense/Purchase Outflows</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auto-Matched</span>
                  <div className="text-lg font-black text-blue-700 mt-1 font-mono">
                    {bankSession?.matchedCount || 0} Txns
                  </div>
                  <span className="text-[10px] text-blue-600 mt-0.5 block">Confidence &ge; 85%</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unmatched</span>
                  <div className="text-lg font-black text-amber-700 mt-1 font-mono">
                    {bankSession?.unmatchedCount || 0} Txns
                  </div>
                  <span className="text-[10px] text-amber-600 mt-0.5 block">Requires Review</span>
                </div>
              </div>

              {/* Statement Rows Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">
                    Imported Statement Entries ({bankSession?.statementRows?.length || 0})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    File: <strong>{bankSession?.fileName || "None"}</strong>
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Reference #</th>
                        <th className="py-3 px-4 text-right">Debit (₹)</th>
                        <th className="py-3 px-4 text-right">Credit (₹)</th>
                        <th className="py-3 px-4 text-center">Match Status</th>
                        <th className="py-3 px-4">Matched Book Entry</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!bankSession?.statementRows || bankSession.statementRows.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="p-8 text-center text-slate-400 text-xs">
                            No bank statement imported yet. Click "Import Bank Statement" to paste or upload statement lines.
                          </td>
                        </tr>
                      ) : (
                        bankSession.statementRows.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4 font-mono">{row.date}</td>
                            <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-800">{row.description}</td>
                            <td className="py-3 px-4 font-mono text-slate-600">{row.refNumber}</td>
                            <td className="py-3 px-4 text-right font-mono text-rose-600">
                              {row.debit > 0 ? `₹${row.debit.toFixed(2)}` : "-"}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-emerald-600">
                              {row.credit > 0 ? `₹${row.credit.toFixed(2)}` : "-"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                row.matchStatus === "RECONCILED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : row.matchStatus === "SUGGESTED_MATCH"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}>
                                {row.matchStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {row.matchedTransaction ? (
                                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">
                                  {row.matchedTransaction.invoiceNumber || row.matchedTransaction.reference} (₹{row.matchedTransaction.amount})
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">No book match</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {row.matchStatus !== "RECONCILED" && row.matchedTransaction && (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleUpdateBankMatch(row.id, "CONFIRM")}
                                    className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => handleUpdateBankMatch(row.id, "REJECT")}
                                    className="px-2 py-1 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold hover:bg-slate-300 transition"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                              {row.matchStatus === "RECONCILED" && (
                                <span className="text-emerald-600 font-bold text-[11px] flex items-center justify-center gap-1">
                                  <Check size={12} /> Reconciled
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              MODULE 11: WORKPAPERS & STATUTORY REPORTING
          ══════════════════════════════════════════════════ */}
          {activeTab === "workpapers" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-emerald-600" />
                    CA Audit Workpapers &amp; Statutory Report Package
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pre-compiled sales registers, purchases ITC breakdown, credit notes, and audit certificates.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={RefreshCw}
                    loading={loadingWorkpapers}
                    onClick={loadWorkpapersData}
                  >
                    Refresh Workpapers
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Download}
                    onClick={() => {
                      if (!workpapersData) return;
                      const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workpapersData, null, 2));
                      const link = document.createElement("a");
                      link.setAttribute("href", jsonStr);
                      link.setAttribute("download", `CA_Workpapers_${activeStore?.name || "Store"}_${Date.now()}.json`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    Export Workpapers
                  </Button>
                </div>
              </div>

              {/* Workpapers Executive Summary */}
              {workpapersData?.reconciliationSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Audited Turnover</span>
                    <div className="text-lg font-black text-indigo-700 mt-1 font-mono">
                      ₹{Number(workpapersData.reconciliationSummary.netTurnover || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Output GST</span>
                    <div className="text-lg font-black text-blue-700 mt-1 font-mono">
                      ₹{Number(workpapersData.reconciliationSummary.netOutputGstLiability || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Eligible Input Tax (ITC)</span>
                    <div className="text-lg font-black text-emerald-700 mt-1 font-mono">
                      ₹{Number(workpapersData.reconciliationSummary.totalEligibleITC || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Exceptions Logged</span>
                    <div className="text-lg font-black text-purple-700 mt-1 font-mono">
                      {workpapersData.reconciliationSummary.openDiscrepanciesCount || 0} Open
                    </div>
                  </div>
                </div>
              )}

              {/* Workpaper Registers Preview */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                  1. Sales &amp; Output GST Workpaper Register ({workpapersData?.salesRegister?.length || 0} Records)
                </h4>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0 font-bold text-slate-500">
                      <tr>
                        <th className="p-2">Invoice #</th>
                        <th className="p-2">Customer</th>
                        <th className="p-2 text-right">Taxable (₹)</th>
                        <th className="p-2 text-right">CGST (₹)</th>
                        <th className="p-2 text-right">SGST (₹)</th>
                        <th className="p-2 text-right">Net Payable (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {(workpapersData?.salesRegister || []).map((s, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-bold">{s.invoiceNumber}</td>
                          <td className="p-2 font-sans">{s.customerName} ({s.supplyType})</td>
                          <td className="p-2 text-right">₹{Number(s.taxableAmount || 0).toFixed(2)}</td>
                          <td className="p-2 text-right">₹{Number(s.cgst || 0).toFixed(2)}</td>
                          <td className="p-2 text-right">₹{Number(s.sgst || 0).toFixed(2)}</td>
                          <td className="p-2 text-right font-bold text-blue-600">₹{Number(s.netPayable || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 pt-3">
                  2. Purchases &amp; Input Tax Credit (ITC) Register ({workpapersData?.purchasesRegister?.length || 0} Records)
                </h4>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0 font-bold text-slate-500">
                      <tr>
                        <th className="p-2">Bill #</th>
                        <th className="p-2">Supplier</th>
                        <th className="p-2">Supplier GSTIN</th>
                        <th className="p-2 text-right">Grand Total (₹)</th>
                        <th className="p-2 text-right">Input Tax (₹)</th>
                        <th className="p-2 text-center">ITC Eligible</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {(workpapersData?.purchasesRegister || []).map((p, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-bold">{p.invoiceNumber}</td>
                          <td className="p-2 font-sans">{p.supplierName}</td>
                          <td className="p-2">{p.supplierGstin}</td>
                          <td className="p-2 text-right">₹{Number(p.grandTotal || 0).toFixed(2)}</td>
                          <td className="p-2 text-right text-emerald-600">₹{Number(p.taxTotal || 0).toFixed(2)}</td>
                          <td className="p-2 text-center font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.itcEligible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                            }`}>
                              {p.itcEligible ? "YES" : "NO"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              MODULE 14: CLIENT & WORKSPACE SETTINGS / RULES ENGINE
          ══════════════════════════════════════════════════ */}
          {activeTab === "settings" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Authorized Store Profile */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Building2 size={16} className="text-blue-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Authorized Client Store</h3>
                  </div>
                  <div className="text-xs space-y-2 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Business Name:</span>
                      <strong className="text-slate-900">{activeStore?.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Authorized GSTIN:</span>
                      <strong className="font-mono text-slate-900">{activeStore?.gstin || "Unregistered"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">State / Jurisdictional Code:</span>
                      <strong>{activeStore?.state || "Tamil Nadu"} (33)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Registered Address:</span>
                      <span className="text-right max-w-xs">{activeStore?.address || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* CA Auditor Credentials */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Certified Auditor Profile</h3>
                  </div>
                  <div className="text-xs space-y-2 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Designated CA:</span>
                      <strong className="text-slate-900">{user?.name || "Senior Partner"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Auditor Email:</span>
                      <strong className="font-mono text-slate-900">{user?.email}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CA Membership / FRN:</span>
                      <strong className="font-mono text-emerald-700">ICAI-MEM-88254</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Audit Status:</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        AUTHORIZED &amp; ACTIVE
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Automated Audit Rules Engine Panel */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <SlidersHorizontal size={16} className="text-indigo-600" />
                      Automated Audit Rules Engine
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Continuously validates transaction arithmetic, GST rates, B2B compliance, and inventory anomalies.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={loadingRules}
                    onClick={handleExecuteAuditRules}
                    className="bg-indigo-600 hover:bg-indigo-700 border-indigo-600"
                  >
                    Execute All Rules
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {(rulesEvaluation?.rules || []).map((rule) => (
                    <div key={rule.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{rule.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                          {rule.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{rule.description}</p>
                    </div>
                  ))}
                </div>

                {rulesEvaluation?.exceptions && rulesEvaluation.exceptions.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <h4 className="font-bold text-rose-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Detected Audit Exceptions ({rulesEvaluation.exceptions.length})
                    </h4>
                    <div className="divide-y divide-slate-100 border border-rose-100 rounded-xl bg-rose-50/20 overflow-hidden text-xs">
                      {rulesEvaluation.exceptions.map((exc, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900">{exc.title}</span>
                            <p className="text-[11px] text-slate-600">{exc.description}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 shrink-0">
                            {exc.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              VIEW 2: CLIENT MANAGEMENT (Section A)
          ══════════════════════════════════════════════════ */}
          {activeTab === "clients" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Building2 size={20} className="text-blue-600" />
                    Authorized Client Portfolio ({stores.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage multiple client businesses under your CA firm with tenant isolation and cryptographic verification.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={RefreshCw}
                    onClick={() => {
                      caPortalApi.getStores().then((res) => setStores(res?.stores || []));
                    }}
                  >
                    Refresh Clients
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.map((s) => (
                  <div
                    key={s.id}
                    className={`bg-white rounded-2xl border p-5 space-y-4 shadow-xs transition ${
                      selectedStoreId === s.id ? "border-blue-600 ring-2 ring-blue-50" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                          <CheckCircle2 size={11} /> Authorized Client
                        </span>
                        <h4 className="font-bold text-slate-900 text-base">{s.name}</h4>
                        <span className="font-mono text-xs text-slate-500 block">
                          GSTIN: {s.gstin || "Unregistered / Retail"}
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
                        <Building2 size={20} />
                      </div>
                    </div>

                    <div className="space-y-2 text-xs border-t border-slate-100 pt-3 text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Financial Year:</span>
                        <strong className="text-slate-800">2026 - 2027</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Assigned CA:</span>
                        <strong className="text-slate-800">{user?.name || "Karthik CA"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Audit Status:</span>
                        <span className="font-bold text-emerald-600">Active &amp; In-Audit</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        variant={selectedStoreId === s.id ? "primary" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedStoreId(s.id);
                          handleTabChange("dashboard");
                        }}
                        className="w-full justify-center text-xs"
                      >
                        {selectedStoreId === s.id ? "Currently Auditing" : "Switch & Open Audit"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              VIEW 3: AUDIT PIPELINE KANBAN (Section A)
          ══════════════════════════════════════════════════ */}
          {activeTab === "pipeline" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Activity size={20} className="text-indigo-600" />
                    Multi-Stage Audit Workflow Pipeline
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track verification tasks across standardized audit checkpoints from initial review to CA sign-off.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => setNewTaskModalOpen(true)}
                  >
                    Create Task
                  </Button>
                </div>
              </div>

              {/* 6-Stage Kanban Board */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                {[
                  { id: "PENDING", label: "To Review", color: "border-slate-300 bg-slate-50/70" },
                  { id: "IN_PROGRESS", label: "In Progress", color: "border-blue-300 bg-blue-50/40" },
                  { id: "WAITING_FOR_CLIENT", label: "Waiting Client", color: "border-amber-300 bg-amber-50/40" },
                  { id: "CORRECTION_REQUIRED", label: "Correction Req.", color: "border-rose-300 bg-rose-50/40" },
                  { id: "READY_FOR_APPROVAL", label: "Ready Approval", color: "border-indigo-300 bg-indigo-50/40" },
                  { id: "COMPLETED", label: "Completed", color: "border-emerald-300 bg-emerald-50/40" },
                ].map((col) => {
                  const colTasks = tasksList.filter((t) => {
                    if (col.id === "PENDING") return t.status === "PENDING" || !t.status;
                    if (col.id === "COMPLETED") return t.status === "COMPLETED" || t.status === "APPROVED";
                    return t.status === col.id;
                  });

                  return (
                    <div key={col.id} className={`rounded-2xl border p-3 flex flex-col min-h-[450px] ${col.color}`}>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 mb-3">
                        <span className="font-bold text-slate-800 text-xs">{col.label}</span>
                        <span className="w-5 h-5 rounded-full bg-white text-slate-700 font-bold grid place-items-center text-[10px] shadow-2xs">
                          {colTasks.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 flex-1 overflow-y-auto">
                        {colTasks.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 text-[11px] italic">
                            No tasks
                          </div>
                        ) : (
                          colTasks.map((task) => (
                            <div key={task.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 uppercase">
                                  {task.category || "GENERAL"}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  task.priority === "URGENT" || task.priority === "HIGH"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}>
                                  {task.priority || "MEDIUM"}
                                </span>
                              </div>
                              <h5 className="font-bold text-slate-900 text-xs leading-snug">{task.title}</h5>
                              {task.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>
                              )}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                                {col.id !== "PENDING" && (
                                  <button
                                    onClick={() => handleUpdateTaskStatus(task.id, "PENDING")}
                                    title="Move back"
                                    className="p-1 rounded text-slate-400 hover:text-slate-700 text-[10px]"
                                  >
                                    ←
                                  </button>
                                )}
                                <div className="flex-1 text-right">
                                  {col.id === "PENDING" && (
                                    <button
                                      onClick={() => handleUpdateTaskStatus(task.id, "IN_PROGRESS")}
                                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] hover:bg-blue-100"
                                    >
                                      Start →
                                    </button>
                                  )}
                                  {col.id === "IN_PROGRESS" && (
                                    <button
                                      onClick={() => handleUpdateTaskStatus(task.id, "READY_FOR_APPROVAL")}
                                      className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] hover:bg-indigo-100"
                                    >
                                      Review →
                                    </button>
                                  )}
                                  {col.id === "READY_FOR_APPROVAL" && (
                                    <button
                                      onClick={() => handleUpdateTaskStatus(task.id, "COMPLETED")}
                                      className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700"
                                    >
                                      Approve ✓
                                    </button>
                                  )}
                                  {col.id === "CORRECTION_REQUIRED" && (
                                    <button
                                      onClick={() => handleUpdateTaskStatus(task.id, "IN_PROGRESS")}
                                      className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] hover:bg-amber-100"
                                    >
                                      Re-verify →
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              VIEW 4: STATUTORY DEADLINES & ALERTS (Section A)
          ══════════════════════════════════════════════════ */}
          {activeTab === "deadlines" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-amber-600" />
                  Statutory Compliance Calendar &amp; Audit Deadlines
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time statutory countdowns for Indian Goods and Services Tax (GST) returns, tax audits, and closing checkpoints.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    title: "GSTR-1 Monthly Return",
                    desc: "Outward supply statement for B2B & B2C sales",
                    dueDate: "11th of every month",
                    daysLeft: "3 days remaining",
                    status: "URGENT",
                    form: "Form GSTR-1",
                    color: "border-amber-200 bg-amber-50/30 text-amber-800",
                  },
                  {
                    title: "GSTR-3B Monthly Return",
                    desc: "Summary tax liability & ITC reconciliation settlement",
                    dueDate: "20th of every month",
                    daysLeft: "12 days remaining",
                    status: "UPCOMING",
                    form: "Form GSTR-3B",
                    color: "border-blue-200 bg-blue-50/30 text-blue-800",
                  },
                  {
                    title: "Tax Audit U/S 44AB",
                    desc: "Annual audit report for turnover exceeding statutory limit",
                    dueDate: "30th September",
                    daysLeft: "Annual cycle",
                    status: "ON_TRACK",
                    form: "Form 3CD",
                    color: "border-slate-200 bg-slate-50/50 text-slate-800",
                  },
                  {
                    title: "GSTR-9 / 9C Annual Reconciliation",
                    desc: "Audited reconciliation statement with certified financials",
                    dueDate: "31st December",
                    daysLeft: "Due end of year",
                    status: "ON_TRACK",
                    form: "Form GSTR-9C",
                    color: "border-purple-200 bg-purple-50/30 text-purple-800",
                  },
                  {
                    title: "Advance Tax Q3 Instalment",
                    desc: "Mandatory statutory tax advance instalment",
                    dueDate: "15th December",
                    daysLeft: "Quarterly",
                    status: "UPCOMING",
                    form: "Challan ITNS 280",
                    color: "border-emerald-200 bg-emerald-50/30 text-emerald-800",
                  },
                  {
                    title: "Monthly Period Closing Sign-Off",
                    desc: "Freeze immutable transaction ledger for current period",
                    dueDate: "End of active month",
                    daysLeft: "Requires CA Sign-off",
                    status: "PENDING",
                    form: "Audit Sign-off",
                    color: "border-indigo-200 bg-indigo-50/30 text-indigo-800",
                  },
                ].map((dl, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border space-y-3 ${dl.color}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white shadow-2xs">
                        {dl.form}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-800 shadow-2xs">
                        {dl.status}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{dl.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{dl.desc}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{dl.dueDate}</span>
                      <span className="font-bold text-indigo-700">{dl.daysLeft}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              VIEW 5: CLIENT QUERIES & REQUESTS (Section C)
          ══════════════════════════════════════════════════ */}
          {activeTab === "queries" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare size={20} className="text-indigo-600" />
                    Client Queries &amp; Clarification Tickets ({queriesList.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Formally communicate transaction questions, missing bills, and tariff disputes directly to the business owner.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Send}
                  onClick={() => setNewQueryModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Raise Query to Client
                </Button>
              </div>

              <div className="space-y-3">
                {queriesList.map((q) => (
                  <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600">{q.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            q.status === "RESOLVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {q.status === "RESOLVED" ? "RESOLVED" : "WAITING FOR CLIENT"}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            REF: {q.referenceNumber}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">{q.title}</h4>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(q.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auditor Question:</span>
                      <p>{q.question}</p>
                    </div>

                    {q.clientReply && (
                      <div className="p-3 bg-blue-50/60 rounded-xl text-xs text-blue-900 border border-blue-100 space-y-1">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Client Response:</span>
                        <p>{q.clientReply}</p>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      {q.status !== "RESOLVED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={CheckCheck}
                          onClick={() => handleResolveQuery(q.id)}
                          className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        >
                          Mark as Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              VIEW 6: TEAM MANAGEMENT & PERMISSIONS (Section E)
          ══════════════════════════════════════════════════ */}
          {activeTab === "team" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Users size={20} className="text-blue-600" />
                    Audit Team &amp; Role-Based Permissions
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage CA audit partners, senior audit managers, and article assistants with granular segregation of duties.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => setNewTeamModalOpen(true)}
                >
                  Add Audit Team Member
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {teamMembers.map((tm) => (
                  <div key={tm.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-slate-900 text-sm">{tm.name}</h4>
                        <span className="text-xs text-slate-500">{tm.email}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {tm.status}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Designation:</span>
                        <strong className="text-slate-800">{tm.role}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Assigned Stores:</span>
                        <strong>{tm.assignedStoresCount} Stores</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active Tasks:</span>
                        <strong>{tm.activeTasksCount} Tasks</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Least-Privilege Permissions Matrix */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
                <h4 className="font-bold text-slate-900 text-sm">Least-Privilege Role Authorization Matrix</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold">
                        <th className="py-2.5 px-3">Audit Operation</th>
                        <th className="py-2.5 px-3 text-center">CA Partner</th>
                        <th className="py-2.5 px-3 text-center">Audit Manager</th>
                        <th className="py-2.5 px-3 text-center">Article Assistant</th>
                        <th className="py-2.5 px-3 text-center">Read-Only Reviewer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-2.5 px-3 font-medium">Inspect Invoices, Returns &amp; Workpapers</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ View Only</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium">Execute Automated Rules &amp; Flag Issues</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Prepare</td>
                        <td className="py-2.5 px-3 text-center text-rose-500">✕ No</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium">Reconcile Bank Statements &amp; Auto-Match</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Full</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Suggest</td>
                        <td className="py-2.5 px-3 text-center text-rose-500">✕ No</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium">Final Sign-off &amp; Freeze Tax Period</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Certified Sign-off</td>
                        <td className="py-2.5 px-3 text-center text-rose-500">✕ No</td>
                        <td className="py-2.5 px-3 text-center text-rose-500">✕ No</td>
                        <td className="py-2.5 px-3 text-center text-rose-500">✕ No</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              VIEW 7: WORKFLOW AUTOMATION SETTINGS (Section E)
          ══════════════════════════════════════════════════ */}
          {activeTab === "automation" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <SlidersHorizontal size={20} className="text-indigo-600" />
                    Automated Audit Rules Engine &amp; Automation Controls
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure automated validation rules that detect discrepancies, arithmetic errors, and compliance risks across all transactions.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={SlidersHorizontal}
                  loading={loadingRules}
                  onClick={handleExecuteAuditRules}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Run All 8 Rules Now
                </Button>
              </div>

              {/* Active Rules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {[
                  {
                    id: "RULE_DUP_INV",
                    name: "Duplicate Invoice Numbers Check",
                    desc: "Flags identical invoice series or numbers across chronological periods.",
                    severity: "CRITICAL",
                    active: automationRulesConfig.checkDuplicateInvoiceNumbers,
                  },
                  {
                    id: "RULE_ARITHMETIC_GST",
                    name: "Arithmetic & GST Rate Verification",
                    desc: "Validates taxable amount + calculated CGST/SGST/IGST == grandTotal within ₹1 rounding tolerance.",
                    severity: "CRITICAL",
                    active: automationRulesConfig.checkArithmeticGstMismatch,
                  },
                  {
                    id: "RULE_B2B_GSTIN",
                    name: "Missing B2B Customer GSTIN (Value > ₹50,000)",
                    desc: "Checks statutory requirement of customer GSTIN recording for high-value B2B invoices.",
                    severity: "HIGH",
                    active: automationRulesConfig.checkMissingB2bGstin,
                  },
                  {
                    id: "RULE_EXCESS_RETURNS",
                    name: "Excessive Credit Note Value Reversal",
                    desc: "Detects credit notes where returned amount exceeds original invoice taxable turnover.",
                    severity: "HIGH",
                    active: automationRulesConfig.checkExcessReturns,
                  },
                  {
                    id: "RULE_CASH_EXPENSE_40A3",
                    name: "High-Value Cash Payments (Sec 40A(3) > ₹10,000)",
                    desc: "Flags non-banking single-day expense transactions exceeding Income Tax limits.",
                    severity: "MEDIUM",
                    active: automationRulesConfig.flagCashOverLimit,
                  },
                  {
                    id: "RULE_NEGATIVE_STOCK",
                    name: "Negative Stock Deficit Verification",
                    desc: "Alerts when billed sales quantities exceed current verified inventory records.",
                    severity: "HIGH",
                    active: automationRulesConfig.checkNegativeInventory,
                  },
                  {
                    id: "RULE_UNRECONCILED_BANK",
                    name: "Unreconciled Bank Credits > 30 Days",
                    desc: "Detects statement credit inflows without matching sales invoice receipt records.",
                    severity: "MEDIUM",
                    active: automationRulesConfig.checkUnreconciledBankCredits,
                  },
                  {
                    id: "RULE_TARIFF_HSN_MATCH",
                    name: "HSN Code & GST Rate Consistency",
                    desc: "Identifies inconsistent tax rates charged on identical product or service HSN items.",
                    severity: "MEDIUM",
                    active: true,
                  },
                ].map((r) => (
                  <div key={r.id} className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">{r.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.severity === "CRITICAL"
                          ? "bg-rose-100 text-rose-700"
                          : r.severity === "HIGH"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {r.severity}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">{r.desc}</p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={11} /> Engine Active
                      </span>
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          defaultChecked={r.active}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        Enabled
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sensitivity Configuration */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs text-xs">
                <h4 className="font-bold text-slate-900 text-sm">Sensitivity Thresholds &amp; Auto-Actions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Sec 40A(3) Cash Limit (₹)</label>
                    <input
                      type="number"
                      value={automationRulesConfig.cashLimitAmount}
                      onChange={(e) => setAutomationRulesConfig({ ...automationRulesConfig, cashLimitAmount: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Rounding Tolerance Variance (₹)</label>
                    <input
                      type="number"
                      value={automationRulesConfig.varianceThreshold}
                      onChange={(e) => setAutomationRulesConfig({ ...automationRulesConfig, varianceThreshold: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="autoTasks"
                      checked={automationRulesConfig.autoCreateTasksOnException}
                      onChange={(e) => setAutomationRulesConfig({ ...automationRulesConfig, autoCreateTasksOnException: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <label htmlFor="autoTasks" className="font-bold text-slate-700">
                      Auto-generate Tasks on Rule Failures
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════
          ACTION MODALS: NEW TASK, FLAG DISCREPANCY, ATTACH DOC, CLOSE PERIOD
      ══════════════════════════════════════════════════ */}
      {newTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Create Audit Task</h3>
              <button onClick={() => setNewTaskModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g., Verify Credit Note CN-001 with Goods Return Note"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Category</label>
                <select
                  value={taskForm.category}
                  onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                >
                  <option value="GENERAL">General Audit</option>
                  <option value="SALES">Sales & Invoices</option>
                  <option value="GST">GST & Tax Reversal</option>
                  <option value="PURCHASES">Purchases & Suppliers</option>
                  <option value="INVENTORY">Inventory Valuation</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setNewTaskModalOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit">Save Task</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {flagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-rose-700 flex items-center gap-1.5">
                <Flag size={16} /> Flag Audit Discrepancy
              </h3>
              <button onClick={() => setFlagModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleFlagDiscrepancy} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Discrepancy Issue Title *</label>
                <input
                  type="text"
                  required
                  value={discrepancyForm.title}
                  onChange={(e) => setDiscrepancyForm({ ...discrepancyForm, title: e.target.value })}
                  placeholder="e.g. Tax Rate Mismatch on Return CN-4402"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Type</label>
                <select
                  value={discrepancyForm.discrepancyType}
                  onChange={(e) => setDiscrepancyForm({ ...discrepancyForm, discrepancyType: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                >
                  <option value="TAX_MISMATCH">Tax Rate / Amount Mismatch</option>
                  <option value="MISSING_EVIDENCE">Missing Invoice / Bill Evidence</option>
                  <option value="UNBALANCED_PAYMENT">Unbalanced Dues / Overpayment</option>
                  <option value="UNMATCHED_RETURN">Unmatched Return / Over-return</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Reference Number</label>
                <input
                  type="text"
                  value={discrepancyForm.referenceNumber}
                  onChange={(e) => setDiscrepancyForm({ ...discrepancyForm, referenceNumber: e.target.value })}
                  placeholder="e.g. INV-2026-001 or CN-889"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Correction Requested from Business Owner *</label>
                <textarea
                  rows={2}
                  required
                  value={discrepancyForm.description}
                  onChange={(e) => setDiscrepancyForm({ ...discrepancyForm, description: e.target.value })}
                  placeholder="Explain the required correction clearly for the business owner"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setFlagModalOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit" className="bg-rose-600 hover:bg-rose-700 border-rose-600">Submit Flag</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {newDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Attach Evidence Document</h3>
              <button onClick={() => setNewDocModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateDocument} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={docForm.title}
                  onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                  placeholder="e.g. Bank Statement Sept 2026 or Vendor Tax Invoice"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Document URL / Path *</label>
                <input
                  type="text"
                  required
                  value={docForm.fileUrl}
                  onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })}
                  placeholder="https://... or /uploads/..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Category</label>
                <select
                  value={docForm.category}
                  onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                >
                  <option value="BANK_STATEMENT">Bank Statement</option>
                  <option value="PURCHASE_BILL">Purchase Bill</option>
                  <option value="TAX_CHALLAN">Tax Challan / Receipt</option>
                  <option value="SUPPORTING_EVIDENCE">Supporting Evidence</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setNewDocModalOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit">Attach</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {closeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-emerald-800 flex items-center gap-1.5">
                <Lock size={16} /> Close &amp; Freeze Tax Period
              </h3>
              <button onClick={() => setCloseModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleClosePeriod} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Period Identifier (YYYY-MM or FY) *</label>
                <input
                  type="text"
                  required
                  value={closingForm.period}
                  onChange={(e) => setClosingForm({ ...closingForm, period: e.target.value })}
                  placeholder="e.g. 2026-09 or 2026-Q3"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden font-mono"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Period Closing Notes</label>
                <textarea
                  rows={2}
                  value={closingForm.signOffNotes}
                  onChange={(e) => setClosingForm({ ...closingForm, signOffNotes: e.target.value })}
                  placeholder="e.g. Reconciled output GST with returns credit notes"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setCloseModalOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit" className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600">Freeze Period</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL 1: TAX INVOICE DETAIL & PRODUCT BREAKDOWN (Req 2)
      ══════════════════════════════════════════════════ */}
      {selectedInvoice && (
        <TaxInvoice
          invoice={selectedInvoice}
          shopSettings={activeStore}
          isModal={true}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* ══════════════════════════════════════════════════
          MODAL 2: CREDIT NOTE & GST REVERSAL AUDIT (Req 3)
      ══════════════════════════════════════════════════ */}
      {selectedCreditNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs fade-up">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 grid place-items-center">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Credit Note: {selectedCreditNote.creditNoteNumber || selectedCreditNote.returnNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Linked to Invoice #{selectedCreditNote.invoiceNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCreditNote(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs">
              {/* Key Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Return Date</span>
                  <div className="font-bold text-slate-800 mt-1">
                    {new Date(selectedCreditNote.returnDate || selectedCreditNote.createdAt).toLocaleDateString("en-IN")}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Taxable Reversal</span>
                  <div className="font-mono font-bold text-slate-800 mt-1">
                    ₹{Number(selectedCreditNote.taxableAmount || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                  <span className="text-[10px] text-purple-700 uppercase font-semibold">GST Reversal</span>
                  <div className="font-mono font-bold text-purple-700 mt-1">
                    ₹{Number(selectedCreditNote.gstAdjustment || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                  <span className="text-[10px] text-purple-700 uppercase font-semibold">Total Credit Value</span>
                  <div className="font-mono font-bold text-purple-700 mt-1">
                    ₹{Number(selectedCreditNote.totalAmount || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Settlement & Reversal Information */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Settlement &amp; Reversal Workflow</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Settlement Method:</span>
                    <strong className="text-slate-800">{selectedCreditNote.settlementDetails?.method || "CASH"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Refund Status:</span>
                    <strong className="text-emerald-700">{selectedCreditNote.refundStatus || "COMPLETED"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Reason:</span>
                    <strong className="text-slate-800">{selectedCreditNote.reason || "Customer Return"}</strong>
                  </div>
                </div>
              </div>

              {/* Returned Items Breakdown Table */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2 uppercase tracking-wider">Returned Products Breakdown</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3 text-center">HSN</th>
                        <th className="py-2.5 px-3 text-center">Qty Ret.</th>
                        <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                        <th className="py-2.5 px-3 text-right">GST Rate</th>
                        <th className="py-2.5 px-3 text-right">GST Adj. (₹)</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {(selectedCreditNote.items || []).map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                            {it.name || "Returned Item"}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500">{it.hsn || it.hsnCode || "1904"}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-purple-700">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700">₹{Number(it.taxableAmount || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{it.gstRate || 0}%</td>
                          <td className="py-2.5 px-3 text-right text-purple-600">₹{Number(it.gstAdjustment || it.taxAmount || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{Number(it.total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <Button variant="secondary" size="sm" onClick={() => setSelectedCreditNote(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL 3: AUDIT TRAIL MODAL (Req 6)
      ══════════════════════════════════════════════════ */}
      {auditTrailInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs fade-up">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Immutable Audit Log: {auditTrailInvoice.invoiceNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete lifecycle events and verification timestamps
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAuditTrailInvoice(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Log list */}
            <div className="p-6 space-y-4">
              {loadingAudit ? (
                <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw size={18} className="animate-spin text-blue-600" />
                  <span>Loading audit logs...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No subsequent modification logs found. Invoice is in original creation state.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {log.performedBy && (
                      <div className="text-[11px] text-slate-600">
                        Performed by: <strong>{log.performedBy.name || log.performedBy.email}</strong> ({log.performedBy.role})
                      </div>
                    )}
                    {log.changes && (
                      <pre className="mt-1 p-2 bg-slate-100 rounded-lg text-[10px] font-mono text-slate-700 overflow-x-auto">
                        {typeof log.changes === "string" ? log.changes : JSON.stringify(log.changes, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <Button variant="secondary" size="sm" onClick={() => setAuditTrailInvoice(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          IMPORT BANK STATEMENT MODAL
      ══════════════════════════════════════════════════ */}
      {importBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Scale size={16} className="text-blue-600" />
                Import Bank Statement (CSV / Text)
              </h3>
              <button onClick={() => setImportBankModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleImportBankStatement} className="space-y-3 text-xs">
              <p className="text-slate-500">
                Paste raw statement rows below. Format: <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">Date, Description, RefNumber, Debit, Credit, Balance</code>
              </p>
              <textarea
                rows={6}
                required
                value={bankRowsInput}
                onChange={(e) => setBankRowsInput(e.target.value)}
                placeholder={"2026-10-11, NEFT Inflow Customer Payment, TXN-9988, 0, 5250, 105250\n2026-10-11, Chq Generator Repair Outflow, CHQ-8822, 35000, 0, 70250"}
                className="w-full p-3 font-mono text-[11px] rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setImportBankModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Process &amp; Auto-Match
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════
          RAISE CLIENT QUERY MODAL
      ══════════════════════════════════════════════════ */}
      {newQueryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare size={16} className="text-indigo-600" />
                Raise Formal Audit Query to Client
              </h3>
              <button onClick={() => setNewQueryModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateQuery} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Query Subject / Title *</label>
                <input
                  type="text"
                  required
                  value={queryForm.title}
                  onChange={(e) => setQueryForm({ ...queryForm, title: e.target.value })}
                  placeholder="e.g. Missing supplier tax invoice for ₹45,000"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Reference Number (Invoice / Voucher / TXN)</label>
                <input
                  type="text"
                  value={queryForm.referenceNumber}
                  onChange={(e) => setQueryForm({ ...queryForm, referenceNumber: e.target.value })}
                  placeholder="e.g. INV-2026-088 or TXN-8821"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden font-mono"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Priority</label>
                <select
                  value={queryForm.priority}
                  onChange={(e) => setQueryForm({ ...queryForm, priority: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High (Urgent Compliance)</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Question / Clarification Details *</label>
                <textarea
                  rows={3}
                  required
                  value={queryForm.question}
                  onChange={(e) => setQueryForm({ ...queryForm, question: e.target.value })}
                  placeholder="Detail the exact information, invoice copy, or clarification required from the business owner"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setNewQueryModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  Transmit Query
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ADD CA AUDIT TEAM MEMBER MODAL
      ══════════════════════════════════════════════════ */}
      {newTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-blue-600" />
                Add CA Audit Team Member
              </h3>
              <button onClick={() => setNewTeamModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTeamMember} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Iyer"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={teamForm.email}
                  onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                  placeholder="e.g. ramesh.audit@firm.com"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Assigned Role</label>
                <select
                  value={teamForm.role}
                  onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                >
                  <option value="Senior Audit Manager">Senior Audit Manager</option>
                  <option value="Article Assistant">Article Assistant / Trainee</option>
                  <option value="CA Partner / Reviewer">CA Partner / Senior Reviewer</option>
                  <option value="Read-Only Reviewer">Read-Only Reviewer</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setNewTeamModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Team Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
