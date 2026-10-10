import { useState } from "react";
import {
  LifeBuoy,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  Printer,
  ShieldCheck,
  Send,
  Sparkles,
  ExternalLink,
  X,
  Search,
  Filter,
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  MessageSquare,
  FileText,
  Sliders,
  Calendar,
  Lock,
} from "lucide-react";
import Logo from "../components/common/Logo";
import Button, { CompactIconButton } from "../components/common/Button";

export default function Support() {
  const [activeTab, setActiveTab] = useState("tickets"); // "tickets" | "new_ticket" | "faq" | "contact"
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Ticket Details Modal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [internalNote, setInternalNote] = useState("");

  // New Ticket Form State
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("Billing & Invoices");
  const [ticketPriority, setTicketPriority] = useState("Medium");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  const phone = "+91 88254 54486";
  const rawPhone = "918825454486";
  const email = "Vickyms2app@gmail.com";

  // Initial Ticket Database
  const [tickets, setTickets] = useState([
    {
      id: "TCK-1042",
      customer: "Ramesh Supermarket",
      phone: "+91 98451 22340",
      email: "ramesh@mart.in",
      subject: "Thermal Printer 80mm margin cutoff on ESC/POS",
      category: "Hardware & Printers",
      priority: "High",
      status: "OPEN",
      assignedStaff: "Karthik Kumar",
      createdAt: "2026-10-01T10:30:00",
      updatedAt: "2026-10-02T09:15:00",
      description: "When printing invoice rolls on TVS RP-3200, the right margin drops the last 2 digits of the amount column.",
      history: [
        {
          sender: "Ramesh Supermarket",
          role: "customer",
          time: "01 Oct 2026, 10:30 AM",
          message: "When printing invoice rolls on TVS RP-3200, the right margin drops the last 2 digits of the amount column.",
        },
        {
          sender: "Karthik Kumar (Support)",
          role: "agent",
          time: "01 Oct 2026, 02:45 PM",
          message: "Hello Ramesh, please adjust the receipt width to 72mm printable area in Invoice Settings -> Paper Formats. Let us know if this solves it.",
        },
      ],
      notes: ["Customer is using Bluetooth 80mm roll driver v3.2."],
    },
    {
      id: "TCK-1041",
      customer: "Priya Electronics",
      phone: "+91 94432 88712",
      email: "priya@electro.com",
      subject: "UPI QR Code scan error on generated A4 invoices",
      category: "Billing & Invoices",
      priority: "Medium",
      status: "PENDING",
      assignedStaff: "Vignesh S",
      createdAt: "2026-09-30T14:20:00",
      updatedAt: "2026-10-01T11:00:00",
      description: "Customers scanning the QR code in Google Pay get 'Invalid Merchant VPA' error.",
      history: [
        {
          sender: "Priya Electronics",
          role: "customer",
          time: "30 Sep 2026, 02:20 PM",
          message: "Customers scanning the QR code in Google Pay get 'Invalid Merchant VPA' error.",
        },
        {
          sender: "Vignesh S (Support)",
          role: "agent",
          time: "30 Sep 2026, 05:10 PM",
          message: "Checking your bank VPA configuration. Please ensure there are no spaces or special characters in the UPI ID.",
        },
      ],
      notes: ["Awaiting customer confirmation of their correct VPA."],
    },
    {
      id: "TCK-1040",
      customer: "Metro Wholesale Mart",
      phone: "+91 97890 12345",
      email: "accounts@metromart.com",
      subject: "GSTR-1 JSON export tax breakdown query",
      category: "Tax & GST",
      priority: "Urgent",
      status: "RESOLVED",
      assignedStaff: "CA Connect Desk",
      createdAt: "2026-09-28T09:00:00",
      updatedAt: "2026-09-29T16:30:00",
      description: "Need to verify whether B2B reverse charge invoices are automatically segregated into Table 4B.",
      history: [
        {
          sender: "Metro Wholesale Mart",
          role: "customer",
          time: "28 Sep 2026, 09:00 AM",
          message: "Need to verify whether B2B reverse charge invoices are automatically segregated into Table 4B.",
        },
        {
          sender: "CA Connect Desk",
          role: "agent",
          time: "29 Sep 2026, 04:30 PM",
          message: "Yes, our GSTR-1 engine automatically splits Table 4B B2B RCM records based on vendor GSTIN flags.",
        },
      ],
      notes: ["Resolution confirmed by accountant."],
    },
    {
      id: "TCK-1039",
      customer: "Apex Retailers",
      phone: "+91 91234 56789",
      email: "support@apexretail.in",
      subject: "Adding custom discount on sales line items",
      category: "Software Features",
      priority: "Low",
      status: "CLOSED",
      assignedStaff: "Support Bot",
      createdAt: "2026-09-25T11:40:00",
      updatedAt: "2026-09-26T10:00:00",
      description: "How to apply a 5% discount on just 1 item instead of the entire invoice subtotal?",
      history: [
        {
          sender: "Apex Retailers",
          role: "customer",
          time: "25 Sep 2026, 11:40 AM",
          message: "How to apply a 5% discount on just 1 item instead of the entire invoice subtotal?",
        },
        {
          sender: "Support Bot",
          role: "agent",
          time: "25 Sep 2026, 11:41 AM",
          message: "In the Billing POS screen, click the 'Disc %' input next to each individual product row to apply line-item specific discounts.",
        },
      ],
      notes: ["User found the solution in FAQ."],
    },
  ]);

  // Support Dashboard KPIs
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === "OPEN").length;
  const pendingTickets = tickets.filter((t) => t.status === "PENDING").length;
  const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED").length;
  const closedTickets = tickets.filter((t) => t.status === "CLOSED").length;

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
    const matchCategory = categoryFilter === "ALL" || t.category === categoryFilter;
    const matchSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignedStaff.toLowerCase().includes(searchQuery.toLowerCase());

    return matchStatus && matchPriority && matchCategory && matchSearch;
  });

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    const newTicket = {
      id: `TCK-${1043 + tickets.length}`,
      customer: customerName.trim() || "Store Owner",
      phone: customerPhone.trim() || "+91 88254 54486",
      email: email,
      subject: ticketSubject.trim(),
      category: ticketCategory,
      priority: ticketPriority,
      status: "OPEN",
      assignedStaff: "Karthik Kumar",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: ticketMessage.trim(),
      history: [
        {
          sender: customerName.trim() || "Store Owner",
          role: "customer",
          time: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
          message: ticketMessage.trim(),
        },
      ],
      notes: [],
    };

    setTickets([newTicket, ...tickets]);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setTicketSubject("");
      setCustomerName("");
      setCustomerPhone("");
      setTicketMessage("");
      setActiveTab("tickets");
    }, 2000);
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    const newHistoryItem = {
      sender: "Support Team (You)",
      role: "agent",
      time: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
      message: replyText.trim(),
    };

    const updated = {
      ...selectedTicket,
      updatedAt: new Date().toISOString(),
      history: [...(selectedTicket.history || []), newHistoryItem],
    };

    setTickets(tickets.map((t) => (t.id === selectedTicket.id ? updated : t)));
    setSelectedTicket(updated);
    setReplyText("");
  };

  const handleAddInternalNote = (e) => {
    e.preventDefault();
    if (!internalNote.trim() || !selectedTicket) return;

    const updated = {
      ...selectedTicket,
      notes: [...(selectedTicket.notes || []), internalNote.trim()],
    };

    setTickets(tickets.map((t) => (t.id === selectedTicket.id ? updated : t)));
    setSelectedTicket(updated);
    setInternalNote("");
  };

  const handleUpdateStatus = (newStatus) => {
    if (!selectedTicket) return;
    const updated = { ...selectedTicket, status: newStatus, updatedAt: new Date().toISOString() };
    setTickets(tickets.map((t) => (t.id === selectedTicket.id ? updated : t)));
    setSelectedTicket(updated);
  };

  const handleUpdatePriority = (newPriority) => {
    if (!selectedTicket) return;
    const updated = { ...selectedTicket, priority: newPriority, updatedAt: new Date().toISOString() };
    setTickets(tickets.map((t) => (t.id === selectedTicket.id ? updated : t)));
    setSelectedTicket(updated);
  };

  const faqs = [
    {
      q: "How do I print an 80mm thermal receipt instead of A4 sheet?",
      a: "Go to 'Invoice Settings' from the sidebar menu, click on the 'Paper & Print Formats' tab, and choose '80mm Thermal Roll'. You can also toggle between Modern, Classic, Minimal, and Thermal in the Invoice Studio with instant live preview.",
    },
    {
      q: "How do I configure my shop's UPI QR Code for instant customer payments?",
      a: "In 'Invoice Settings' → 'Bank & UPI QR Setup', enter your Shop UPI ID (e.g. yourname@hdfcbank or phone@paytm). Every tax invoice and thermal receipt generated will dynamically encode an authentic scan-to-pay QR code with the exact bill amount.",
    },
    {
      q: "Can I use BILZET offline during power cuts or internet outages?",
      a: "Yes! BILZET caches active inventory and prices in your browser. You can continue issuing bills, and transactions automatically sync once connection is restored.",
    },
    {
      q: "How can I invite my Chartered Accountant (CA) to review GST reports?",
      a: "Navigate to 'CA Connect' in the sidebar menu. Enter your CA's email or phone number to grant read-only access for GSTR-1, GSTR-3B summaries, and monthly outward tax reports.",
    },
    {
      q: "What barcode scanners and thermal printers are supported?",
      a: "BILZET works plug-and-play with any standard USB or Bluetooth HID barcode scanner (1D/2D) and ESC/POS thermal printers (TVS, Epson, Pegasus, Everycom, Retsol, and standard generic 80mm/58mm printers).",
    },
  ];

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto fade-up">
      {/* ══════════════════════════════════════════════════
          HERO & HEADER BANNER
      ══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-[#0c1628] via-[#0d1f45] to-[#091228] border border-slate-800/60 shadow-lg text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-cyan-500/12 text-cyan-300 border border-cyan-500/20">
                <Sparkles size={11} />
                24/7 ERP Support Desk
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Support Engineers Online
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Customer Support Desk &amp; Help Center
            </h1>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ticket tracking, thermal printer setup assistance, UPI settlement support, and GST filing help
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <a
              href={`https://wa.me/${rawPhone}?text=${encodeURIComponent("Hello BILZET Support, I need assistance with my billing system.")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebc57] text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow transition active:scale-95"
            >
              <MessageCircle size={14} />
              <span>WhatsApp Care</span>
            </a>

            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setActiveTab("new_ticket")}
            >
              New Ticket
            </Button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SUPPORT DASHBOARD KPIS (SECTION 8 REQUIREMENT)
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div
          onClick={() => {
            setStatusFilter("ALL");
            setActiveTab("tickets");
          }}
          className={`kpi-card blue cursor-pointer transition ${
            statusFilter === "ALL" && activeTab === "tickets" ? "ring-2 ring-blue-500" : ""
          }`}
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Tickets</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{totalTickets}</p>
          <span className="text-[11px] text-blue-600 font-medium mt-0.5 block">All logged inquiries</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter("OPEN");
            setActiveTab("tickets");
          }}
          className={`kpi-card rose cursor-pointer transition ${
            statusFilter === "OPEN" && activeTab === "tickets" ? "ring-2 ring-rose-500" : ""
          }`}
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Open Tickets</p>
          <p className="text-2xl font-bold text-rose-600 mt-1 font-mono">{openTickets}</p>
          <span className="text-[11px] text-rose-500 font-medium mt-0.5 block">Awaiting response</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter("PENDING");
            setActiveTab("tickets");
          }}
          className={`kpi-card amber cursor-pointer transition ${
            statusFilter === "PENDING" && activeTab === "tickets" ? "ring-2 ring-amber-500" : ""
          }`}
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Tickets</p>
          <p className="text-2xl font-bold text-amber-600 mt-1 font-mono">{pendingTickets}</p>
          <span className="text-[11px] text-amber-600 font-medium mt-0.5 block">Customer follow-up</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter("RESOLVED");
            setActiveTab("tickets");
          }}
          className={`kpi-card emerald cursor-pointer transition ${
            statusFilter === "RESOLVED" && activeTab === "tickets" ? "ring-2 ring-emerald-500" : ""
          }`}
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resolved Tickets</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1 font-mono">{resolvedTickets}</p>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">Solution provided</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter("CLOSED");
            setActiveTab("tickets");
          }}
          className={`kpi-card purple col-span-2 sm:col-span-1 cursor-pointer transition ${
            statusFilter === "CLOSED" && activeTab === "tickets" ? "ring-2 ring-purple-500" : ""
          }`}
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Closed Tickets</p>
          <p className="text-2xl font-bold text-slate-700 mt-1 font-mono">{closedTickets}</p>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Archived / Complete</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          NAVIGATION TABS
      ══════════════════════════════════════════════════ */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab("tickets")}
          className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "tickets"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <LifeBuoy size={14} />
          <span>Support Tickets ({filteredTickets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("new_ticket")}
          className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "new_ticket"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Plus size={14} />
          <span>Submit New Ticket</span>
        </button>

        <button
          onClick={() => setActiveTab("faq")}
          className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "faq"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <HelpCircle size={14} />
          <span>Knowledge Base &amp; FAQs</span>
        </button>

        <button
          onClick={() => setActiveTab("contact")}
          className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "contact"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Phone size={14} />
          <span>Direct Contact Channels</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          TAB 1: TICKET LIST TABLE & FILTERS
      ══════════════════════════════════════════════════ */}
      {activeTab === "tickets" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="card px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="search-field flex-1 min-w-[220px] max-w-sm">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                placeholder="Search ticket ID, subject, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="Hardware & Printers">Hardware &amp; Printers</option>
                <option value="Billing & Invoices">Billing &amp; Invoices</option>
                <option value="Tax & GST">Tax &amp; GST</option>
                <option value="Software Features">Software Features</option>
              </select>

              {(statusFilter !== "ALL" || priorityFilter !== "ALL" || categoryFilter !== "ALL" || searchQuery) && (
                <button
                  onClick={() => {
                    setStatusFilter("ALL");
                    setPriorityFilter("ALL");
                    setCategoryFilter("ALL");
                    setSearchQuery("");
                  }}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Ticket Table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Ticket ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Subject &amp; Category</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned Staff</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <LifeBuoy size={24} className="mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-700">No support tickets match the selected filters</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Try adjusting your search criteria or create a new support ticket.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => {
                      const priorityColor =
                        ticket.priority === "Urgent"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : ticket.priority === "High"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : ticket.priority === "Medium"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-100 text-slate-700 border-slate-200";

                      const statusColor =
                        ticket.status === "OPEN"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : ticket.status === "PENDING"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : ticket.status === "RESOLVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200";

                      return (
                        <tr
                          key={ticket.id}
                          className="hover:bg-slate-50/70 transition cursor-pointer"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">
                            {ticket.id}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {ticket.customer}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {ticket.phone}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <p className="font-semibold text-slate-800 truncate">{ticket.subject}</p>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {ticket.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityColor}`}
                            >
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}
                            >
                              {ticket.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {ticket.assignedStaff}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {new Date(ticket.updatedAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              size="xs"
                              variant="neutral"
                              icon={FileText}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTicket(ticket);
                              }}
                            >
                              View Ticket
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 2: SUBMIT NEW TICKET FORM
      ══════════════════════════════════════════════════ */}
      {activeTab === "new_ticket" && (
        <div className="card max-w-2xl mx-auto p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Create Support Ticket</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit your issue or request directly to our customer engineering team
            </p>
          </div>

          {submitted && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Ticket logged successfully! Our team will respond shortly.</span>
            </div>
          )}

          <form onSubmit={handleTicketSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer / Store Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Garden Greens Mart"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Ticket Subject *</label>
              <input
                type="text"
                required
                placeholder="e.g. Need assistance with barcode scanner driver setup"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold outline-none"
                >
                  <option value="Hardware & Printers">Hardware &amp; Thermal Printers</option>
                  <option value="Billing & Invoices">Billing &amp; Invoices</option>
                  <option value="Tax & GST">GST &amp; Tax Compliance</option>
                  <option value="Software Features">Software Features &amp; Account</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority Level</label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold outline-none"
                >
                  <option value="Low">Low — General inquiry</option>
                  <option value="Medium">Medium — Standard request</option>
                  <option value="High">High — Store operations affected</option>
                  <option value="Urgent">Urgent — Billing halted / Emergency</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Detailed Description *</label>
              <textarea
                rows="4"
                required
                placeholder="Describe what occurred, any error messages displayed, and steps to reproduce..."
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-sans"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="neutral"
                icon={X}
                onClick={() => setActiveTab("tickets")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={Send}
              >
                Submit Ticket
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 3: FAQS ACCORDION
      ══════════════════════════════════════════════════ */}
      {activeTab === "faq" && (
        <div className="card max-w-3xl mx-auto p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Frequently Answered Questions</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant solutions for common printer, hardware, UPI, and tax configuration inquiries
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="border border-slate-200/80 rounded-xl overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between font-bold text-xs text-slate-800 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${openFaq === idx ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="p-4 text-xs text-slate-600 bg-white border-t border-slate-100 leading-relaxed font-normal">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 4: DIRECT CONTACT CHANNELS
      ══════════════════════════════════════════════════ */}
      {activeTab === "contact" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="card p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 grid place-items-center mx-auto">
              <MessageCircle size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">WhatsApp Priority Chat</h3>
            <p className="text-xs text-slate-500">
              Immediate live chat with BILZET technical specialists
            </p>
            <a
              href={`https://wa.me/${rawPhone}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs w-full justify-center inline-flex"
            >
              Open WhatsApp
            </a>
          </div>

          <div className="card p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center mx-auto">
              <Phone size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Direct Phone Hotline</h3>
            <p className="text-xs text-slate-500 font-mono">{phone}</p>
            <a
              href={`tel:${phone}`}
              className="btn-secondary text-xs w-full justify-center inline-flex"
            >
              Call Hotline
            </a>
          </div>

          <div className="card p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 grid place-items-center mx-auto">
              <Mail size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Email Support Desk</h3>
            <p className="text-xs text-slate-500 font-mono truncate">{email}</p>
            <a
              href={`mailto:${email}`}
              className="btn-secondary text-xs w-full justify-center inline-flex"
            >
              Send Email
            </a>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TICKET DETAILS MODAL (SECTION 8 REQUIREMENT)
      ══════════════════════════════════════════════════ */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl my-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <span className="font-mono font-extrabold text-blue-600 text-sm">
                  {selectedTicket.id}
                </span>
                <h3 className="text-base font-bold text-slate-900 truncate max-w-md">
                  {selectedTicket.subject}
                </h3>
              </div>
              <CompactIconButton
                icon={X}
                variant="neutral"
                onClick={() => setSelectedTicket(null)}
                title="Close"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 text-xs">
              {/* Left 2 Cols: Ticket History & Reply Box */}
              <div className="lg:col-span-2 p-6 space-y-5">
                {/* Customer & Issue Summary */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">{selectedTicket.customer}</span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      Created: {new Date(selectedTicket.createdAt).toLocaleString("en-IN", { dateStyle: "medium" })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">{selectedTicket.description}</p>
                </div>

                {/* Conversation Thread */}
                <div>
                  <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-blue-600" />
                    <span>Conversation &amp; Activity Log</span>
                  </h4>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {selectedTicket.history?.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border ${
                          msg.role === "agent"
                            ? "bg-blue-50/60 border-blue-200 ml-6 text-slate-800"
                            : "bg-white border-slate-200/80 mr-6 text-slate-700 shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 text-[11px]">
                          <strong className={msg.role === "agent" ? "text-blue-700 font-bold" : "text-slate-800"}>
                            {msg.sender}
                          </strong>
                          <span className="text-slate-400 font-mono text-[10px]">{msg.time}</span>
                        </div>
                        <p className="text-xs leading-relaxed">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reply Box */}
                <form onSubmit={handleSendReply} className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block font-bold text-slate-700">Reply to Customer</label>
                  <textarea
                    rows="3"
                    required
                    placeholder="Type your response or update here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-sans"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      icon={Send}
                    >
                      Send Reply
                    </Button>
                  </div>
                </form>
              </div>

              {/* Right Col: Administrative Controls */}
              <div className="p-6 bg-slate-50/40 space-y-5">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
                    Ticket Controls
                  </h4>

                  <div className="space-y-3">
                    {/* Status Changer */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Status
                      </label>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="PENDING">PENDING</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>

                    {/* Priority Changer */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Priority
                      </label>
                      <select
                        value={selectedTicket.priority}
                        onChange={(e) => handleUpdatePriority(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>

                    {/* Customer Info */}
                    <div className="pt-2 border-t border-slate-200/80 space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">
                        Customer Contact
                      </span>
                      <p className="font-semibold text-slate-800">{selectedTicket.customer}</p>
                      <p className="font-mono text-slate-500 text-[11px]">{selectedTicket.phone}</p>
                      <p className="font-mono text-slate-500 text-[11px] truncate">{selectedTicket.email}</p>
                    </div>

                    {/* Assigned Staff */}
                    <div className="pt-2 border-t border-slate-200/80 space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">
                        Assigned Engineer
                      </span>
                      <p className="font-semibold text-slate-800">{selectedTicket.assignedStaff}</p>
                    </div>

                    {/* Internal Staff Notes */}
                    <div className="pt-2 border-t border-slate-200/80 space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Lock size={11} />
                        <span>Internal Notes (Staff Only)</span>
                      </span>

                      {selectedTicket.notes?.map((n, i) => (
                        <div key={i} className="p-2 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[11px]">
                          {n}
                        </div>
                      ))}

                      <form onSubmit={handleAddInternalNote} className="space-y-1.5">
                        <input
                          type="text"
                          placeholder="Add private note..."
                          value={internalNote}
                          onChange={(e) => setInternalNote(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none"
                        />
                        <Button
                          type="submit"
                          size="xs"
                          variant="neutral"
                          icon={Plus}
                          className="w-full"
                        >
                          Add Note
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="danger"
                    icon={XCircle}
                    onClick={() => handleUpdateStatus("CLOSED")}
                    className="w-full"
                  >
                    Close This Ticket
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
