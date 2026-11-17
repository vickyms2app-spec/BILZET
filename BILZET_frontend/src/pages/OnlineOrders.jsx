import { useState, useEffect } from "react";
import {
  ShoppingBag,
  Plus,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  AlertTriangle,
  ArrowRight,
  Eye,
  RefreshCw,
  X,
  Phone,
  MapPin,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { onlineOrdersApi, productsApi } from "../api";
import SearchBar from "../components/common/SearchBar";

export default function OnlineOrders() {
  const nav = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Forms
  const [orderForm, setOrderForm] = useState({
    customerName: "",
    customerPhone: "",
    deliveryAddress: "",
    paymentMethod: "ONLINE_UPI",
    items: [{ productId: "", quantity: 1, unitPrice: 0 }],
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const notify = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordRes, prodRes] = await Promise.all([
        onlineOrdersApi.list(),
        productsApi.list({ limit: 100 }),
      ]);
      setOrders(ordRes?.orders || []);
      setProducts(prodRes?.data?.products || prodRes?.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await onlineOrdersApi.updateStatus(orderId, newStatus);
      notify("success", `Order updated to ${newStatus}`);
      if (selectedOrder) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      loadData();
    } catch (err) {
      notify("error", "Failed to update order status");
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const total = orderForm.items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
        0
      );
      await onlineOrdersApi.create({
        ...orderForm,
        totalAmount: total,
      });
      notify("success", "Online Order created successfully!");
      setShowCreateModal(false);
      setOrderForm({
        customerName: "",
        customerPhone: "",
        deliveryAddress: "",
        paymentMethod: "ONLINE_UPI",
        items: [{ productId: "", quantity: 1, unitPrice: 0 }],
      });
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchesSearch =
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone?.includes(search) ||
      (o.orderNumber && o.orderNumber.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto fade-up">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F6F6F8] p-5 sm:p-6 rounded-[24px] border border-[#E7E8EC] shadow-fintech">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#12151C] text-[#5BF07B] flex items-center justify-center shrink-0 shadow-xs">
            <ShoppingBag size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111318]">
              Online Store &amp; E-Commerce Orders
            </h1>
            <p className="text-xs sm:text-sm text-[#7C7F8A] mt-0.5 font-normal">
              Live customer orders pipeline, fulfillment stages and instant invoice conversion.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="h-10 px-4 rounded-xl bg-[#12151C] hover:bg-black text-white text-xs font-semibold shrink-0 inline-flex items-center justify-center gap-1.5 shadow-fintech transition cursor-pointer self-start sm:self-center"
        >
          <Plus size={15} className="text-[#5BF07B]" />
          <span>New Online Order</span>
        </button>
      </div>

      {/* Notifications */}
      {message.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
            message.type === "success"
              ? "bg-[#DFFFE6] border border-[#5BF07B]/40 text-[#0E2A16]"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={16} className="text-[#0E2A16] shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Filter Pills & Search ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F6F6F8] p-4 rounded-2xl border border-[#E7E8EC] shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-[#EDEDEF] rounded-xl border border-[#E7E8EC]">
          {[
            { id: "ALL", label: "All Orders" },
            { id: "PENDING", label: "Pending" },
            { id: "CONFIRMED", label: "Confirmed" },
            { id: "PACKED", label: "Packed" },
            { id: "SHIPPED", label: "Shipped" },
            { id: "DELIVERED", label: "Delivered" },
            { id: "CANCELLED", label: "Cancelled" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === st.id
                  ? "bg-[#12151C] text-white shadow-xs font-bold"
                  : "text-[#7C7F8A] hover:text-[#111318]"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search order #, customer, phone..."
          />
        </div>
      </div>

      {/* ── Orders Table ── */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-[#12151C]" />
          <p className="text-xs text-slate-500">Loading incoming store orders…</p>
        </div>
      ) : (
        <div className="bg-[#F6F6F8] rounded-[24px] border border-[#E7E8EC] overflow-hidden shadow-fintech">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EDEDEF] border-b border-[#E7E8EC] text-[11px] font-bold text-[#111318] uppercase tracking-wider">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Order Value</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E8EC] bg-white">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#7C7F8A]">
                      No online orders matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#F6F6F8]/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#111318]">
                        {ord.orderNumber || `ORD-${ord.id.slice(0, 6)}`}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#111318]">{ord.customerName}</p>
                        <p className="text-[10px] text-[#7C7F8A] font-mono">{ord.customerPhone}</p>
                      </td>
                      <td className="py-3 px-4 text-[#7C7F8A]">
                        {ord.items?.length || 1} items
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#111318]">
                        ₹{Number(ord.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDEDEF] text-[#111318]">
                          {ord.paymentMethod || "PAID ONLINE"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.status === "DELIVERED"
                              ? "bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40"
                              : ord.status === "SHIPPED"
                              ? "bg-[#12151C] text-white"
                              : ord.status === "PACKED"
                              ? "bg-[#EDEDEF] text-[#111318] border border-[#E7E8EC]"
                              : ord.status === "CONFIRMED"
                              ? "bg-[#E2F6F3] text-[#0E2A16] border border-[#A9DAD3]"
                              : ord.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {ord.status || "PENDING"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="p-1.5 text-[#7C7F8A] hover:text-[#111318] hover:bg-[#EDEDEF] rounded-lg transition cursor-pointer"
                          title="View Order Details"
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

      {/* ── Order Details Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md my-auto bg-[#F6F6F8] rounded-[24px] p-6 shadow-2xl border border-[#E7E8EC] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E8EC]">
              <div>
                <h3 className="font-bold text-[#111318] text-sm">
                  Order #{selectedOrder.orderNumber || selectedOrder.id.slice(0, 6)}
                </h3>
                <span className="text-[10px] text-[#7C7F8A]">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-[#7C7F8A] hover:text-[#111318] p-1 rounded-lg hover:bg-[#EDEDEF] transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              {/* Customer summary */}
              <div className="p-3 bg-white rounded-xl border border-[#E7E8EC] space-y-1.5 shadow-2xs">
                <p className="font-bold text-[#111318]">{selectedOrder.customerName}</p>
                <div className="flex items-center gap-2 text-[#7C7F8A]">
                  <Phone size={13} className="text-[#7C7F8A]" />
                  <span>{selectedOrder.customerPhone}</span>
                </div>
                {selectedOrder.deliveryAddress && (
                  <div className="flex items-start gap-2 text-[#7C7F8A] pt-1">
                    <MapPin size={13} className="text-[#7C7F8A] shrink-0 mt-0.5" />
                    <span>{selectedOrder.deliveryAddress}</span>
                  </div>
                )}
              </div>

              {/* Status Update Dropdown */}
              <div>
                <label className="block font-semibold text-[#111318] mb-1">
                  Change Fulfillment Status
                </label>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusUpdate(selectedOrder.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] font-semibold outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15"
                >
                  <option value="PENDING">Pending Acceptance</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PACKED">Packed &amp; Ready</option>
                  <option value="SHIPPED">Dispatched / Out for Delivery</option>
                  <option value="DELIVERED">Delivered to Customer</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                <span className="font-bold text-[#111318] block">Ordered Items</span>
                <div className="p-3 bg-white rounded-xl border border-[#E7E8EC] space-y-2 shadow-2xs">
                  {(selectedOrder.items || []).map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-[#111318]">
                        {it.product?.name || it.name || "Item"} × {it.quantity}
                      </span>
                      <span className="font-semibold text-[#111318]">
                        ₹{Number(it.unitPrice * it.quantity || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-[#E7E8EC] pt-2 flex justify-between font-bold text-[#111318]">
                    <span>Order Total:</span>
                    <span className="text-[#111318]">
                      ₹{Number(selectedOrder.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Action: Convert to Sales Invoice */}
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  nav("/billing");
                }}
                className="w-full py-2.5 rounded-xl bg-[#12151C] hover:bg-black text-white font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-fintech"
              >
                <FileText size={14} className="text-[#5BF07B]" />
                <span>Convert to Tax Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Order Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md my-auto bg-[#F6F6F8] rounded-[24px] p-6 shadow-2xl border border-[#E7E8EC] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E8EC]">
              <h3 className="font-bold text-[#111318] text-sm">Add New Online / Delivery Order</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#7C7F8A] hover:text-[#111318] p-1 rounded-lg hover:bg-[#EDEDEF] transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111318] mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Customer Name"
                    value={orderForm.customerName}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, customerName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111318] mb-1">Customer Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={orderForm.customerPhone}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, customerPhone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#111318] mb-1">Delivery Address *</label>
                <textarea
                  rows="2"
                  required
                  placeholder="Door No, Street, Apartment, Area"
                  value={orderForm.deliveryAddress}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, deliveryAddress: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111318] mb-1">Product Item *</label>
                <select
                  required
                  value={orderForm.items[0].productId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const p = products.find((x) => x.id === id);
                    setOrderForm({
                      ...orderForm,
                      items: [
                        {
                          productId: id,
                          quantity: orderForm.items[0].quantity,
                          unitPrice: p?.price || 0,
                        },
                      ],
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] font-semibold outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15"
                >
                  <option value="">Choose item</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ₹{p.price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111318] mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderForm.items[0].quantity}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        items: [{ ...orderForm.items[0], quantity: Number(e.target.value) }],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111318] mb-1">Payment Method</label>
                  <select
                    value={orderForm.paymentMethod}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, paymentMethod: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] font-semibold outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15"
                  >
                    <option value="ONLINE_UPI">UPI / NetBanking</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="CARD">Credit/Debit Card</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E7E8EC]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E7E8EC] font-semibold text-[#7C7F8A] hover:bg-[#EDEDEF] hover:text-[#111318] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#12151C] hover:bg-black text-white font-semibold flex items-center gap-2 transition cursor-pointer shadow-fintech"
                >
                  {submitting && <RefreshCw size={13} className="animate-spin text-[#5BF07B]" />}
                  <span>Create Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
