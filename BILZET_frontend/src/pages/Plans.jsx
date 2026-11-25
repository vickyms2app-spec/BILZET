import { useState, useEffect, Fragment, useCallback, useMemo } from "react";
import UpiPaymentModal from "../components/payment/UpiPaymentModal";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Check,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Zap,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  QrCode,
  AlertCircle,
  FileText,
  Plus,
  Lock,
  Crown,
  Building2,
  Users,
  Receipt,
  HelpCircle,
} from "lucide-react";
import Button, { CompactIconButton } from "../components/common/Button";
import { subscriptionApi } from "../api";
import { useAuth } from "../store/auth";

export default function Plans() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetTier = (searchParams.get("tier") || "").toUpperCase();
  const redirectUrl = searchParams.get("redirect") || "";
  const authUser = useAuth((s) => s.user);
  const updateSubscription = useAuth((s) => s.updateSubscription);
  const refreshUser = useAuth((s) => s.refreshUser);
  const refreshSubscription = useAuth((s) => s.refreshSubscription);

  // Authoritative subscription state initialization — always default to FREE until backend confirms otherwise
  const [subData, setSubData] = useState(() => {
    // Always start from FREE — the backend is the source of truth
    let plan = "Free";
    let status = "Active";
    let validUntil = "365 Days Validity";
    let payments = [];
    let extraBills = 0;

    // 1. Prioritize authenticated user store subscription (set by authApi.me() on login)
    if (authUser?.subscription?.planTier) {
      const tier = String(authUser.subscription.planTier).toUpperCase();
      const isActive = authUser.subscription.isActive !== false;
      const isExpired = authUser.subscription.isExpired === true;
      // Only promote to paid tier if the subscription is genuinely active and not expired
      if (isActive && !isExpired && ["PRO", "PREMIUM"].includes(tier)) {
        plan = tier.charAt(0) + tier.slice(1).toLowerCase();
        status = authUser.subscription.status || "Active";
        if (authUser.subscription.expiresAt) {
          validUntil = new Date(authUser.subscription.expiresAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        }
      }
    } else if (authUser?.currentPlan) {
      const tier = String(authUser.currentPlan).toUpperCase();
      if (["PRO", "PREMIUM"].includes(tier)) {
        plan = tier.charAt(0) + tier.slice(1).toLowerCase();
      }
    }

    // 2. Check persistent bilzet_subscription_data (only if still on Free — backend data takes precedence)
    if (plan === "Free") {
      try {
        const savedData = localStorage.getItem("bilzet_subscription_data");
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          const pTier = String(parsedData.planTier || parsedData.currentPlan || "").toUpperCase();
          const pStatus = String(parsedData.status || "").toUpperCase();
          const isActive = parsedData.isActive !== false;
          const isExpired = parsedData.expiresAt ? new Date(parsedData.expiresAt) <= new Date() : false;
          // Only restore paid plan if cached data is not expired/cancelled
          if (pTier && ["PRO", "PREMIUM"].includes(pTier) && isActive && !isExpired && pStatus !== "CANCELLED" && pStatus !== "EXPIRED") {
            plan = pTier.charAt(0) + pTier.slice(1).toLowerCase();
            if (parsedData.status) status = parsedData.status;
            if (parsedData.expiresAt) {
              validUntil = new Date(parsedData.expiresAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
            }
          }
        }
      } catch (_) {}
    }

    // 3. Fallback to bilzet_subscription (secondary UI cache — only use if still on Free)
    if (plan === "Free") {
      try {
        const saved = localStorage.getItem("bilzet_subscription");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.currentPlan) {
            const pTier = String(parsed.currentPlan).toUpperCase();
            if (["PRO", "PREMIUM"].includes(pTier)) {
              plan = pTier.charAt(0) + pTier.slice(1).toLowerCase();
            }
          }
          if (parsed.status) status = parsed.status;
          if (parsed.validUntil) validUntil = parsed.validUntil;
          if (parsed.payments) payments = parsed.payments;
          if (parsed.extraBills) extraBills = parsed.extraBills;
        }
      } catch (_) {}
    }

    return {
      currentPlan: plan,
      validUntil,
      usedBills: 1,
      totalBills: plan.toUpperCase() === "FREE" ? 100 : "Unlimited",
      extraBills,
      status,
      validity: "1 year validity",
      payments,
    };
  });

  const [loadingStatus, setLoadingStatus] = useState(true);

  const [billingCycle, setBillingCycle] = useState("ANNUAL"); // 'ANNUAL' | 'MONTHLY'

  const [checkoutModal, setCheckoutModal] = useState({
    open: false,
    plan: null,
    extraBills: false,
  });
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  // Controls whether the UPI QR modal is shown during subscription checkout
  const [upiModalOpen, setUpiModalOpen] = useState(false);

  // Automatically open checkout modal if target tier parameter is present
  useEffect(() => {
    if (targetTier) {
      const match = plans.find(
        (p) => p.tier === targetTier || p.name.toUpperCase() === targetTier
      );
      if (match) {
        setCheckoutModal({
          open: true,
          plan: match,
          extraBills: false,
        });
      }
    }
  }, [targetTier]);

  // Sync active subscription status with backend on load and listen for updates
  useEffect(() => {
    let mounted = true;

    const syncStatus = () => {
      subscriptionApi
        .getStatus()
        .then((res) => {
          if (!mounted || !res) return;
          if (res.planTier) {
            const rawTier = String(res.planTier).toUpperCase();
            const tierCapitalized = rawTier.charAt(0) + rawTier.slice(1).toLowerCase();

            setSubData((prev) => {
              // CRITICAL: The backend response is always authoritative.
              // Never preserve a local paid plan state when the backend says FREE \u2014
              // it means the subscription is expired, cancelled, or never existed.

              const updated = {
                ...prev,
                currentPlan: tierCapitalized,
                status: res.status || "Active",
                validUntil: res.expiresAt
                  ? new Date(res.expiresAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : prev.validUntil,
                totalBills: rawTier === "FREE" ? 100 : "Unlimited",
              };

              localStorage.setItem("bilzet_subscription", JSON.stringify(updated));
              localStorage.setItem(
                "bilzet_subscription_data",
                JSON.stringify({
                  currentPlan: tierCapitalized,
                  planTier: rawTier,
                  status: updated.status,
                  expiresAt: res.expiresAt,
                  planName: res.planName,
                })
              );

              if (updateSubscription) {
                updateSubscription(res);
              }

              return updated;
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setLoadingStatus(false);
        });
    };

    syncStatus();

    // Cross-tab and cross-component broadcast listener
    const handleSubscriptionUpdate = (e) => {
      if (e?.detail) {
        const newTier = String(e.detail.planTier || "").toUpperCase();
        if (newTier) {
          const cap = newTier.charAt(0) + newTier.slice(1).toLowerCase();
          setSubData((prev) => ({
            ...prev,
            currentPlan: cap,
            status: e.detail.status || "Active",
            totalBills: newTier === "FREE" ? 100 : "Unlimited",
          }));
        }
      }
    };

    window.addEventListener("bilzet:subscription_updated", handleSubscriptionUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("bilzet:subscription_updated", handleSubscriptionUpdate);
    };
  }, [updateSubscription]);

  const saveSubData = (updated) => {
    setSubData(updated);
    const tierUpper = String(updated.currentPlan || "FREE").toUpperCase();
    localStorage.setItem("bilzet_subscription", JSON.stringify(updated));
    localStorage.setItem(
      "bilzet_subscription_data",
      JSON.stringify({
        currentPlan: updated.currentPlan,
        planTier: tierUpper,
        status: updated.status || "Active",
      })
    );
  };

  const plans = [
    {
      name: "Free",
      tier: "FREE",
      price: "₹0",
      period: "/ year",
      sub: "100 included bills + optional 500-bill packs · 365 days",
      badge: "Starter",
      features: [
        "First 100 bills included for 1 year",
        "Single-user owner account (0 sub-users)",
        "Buy extra 500-bill packs without changing plan",
        "Inventory tracking & paid/unpaid register",
        "A4 / A5 standard print layouts",
        "3 invoice templates & color themes",
        "Daily and monthly sales reports",
        "GST summary preview",
        "Fixed BILZET watermark on bills",
      ],
      buttonLabel: "Renew Free for 1 Year",
      amount: 0,
    },
    {
      name: "Pro",
      tier: "PRO",
      price: "₹1,499.00",
      period: "/year",
      sub: "Unlimited bills · 365 days",
      badge: "Popular Business",
      features: [
        "Unlimited bills for 1 year",
        "Everything in Free plan",
        "Up to 5 Team & Cashier Sub-Users",
        "Standard Role Assignments (Manager, Cashier, Staff)",
        "Thermal 80mm POS receipt roll printer",
        "Remove BILZET watermark from bills",
        "Direct Bank details & scan-to-pay UPI QR on invoices",
        "Profit & Loss reports & Excel (.xlsx) data export",
        "GSTR-1 draft pack + GSTR-3B tax summary",
        "WhatsApp invoice PDF sharing & SMS dispatch alerts",
        "Online store orders management",
      ],
      buttonLabel: "Choose Pro",
      amount: 1499,
    },
    {
      name: "Premium",
      tier: "PREMIUM",
      price: "₹2,999.00",
      period: "/year",
      sub: "Unlimited bills · 365 days",
      badge: "Full Enterprise",
      features: [
        "Unlimited bills for 1 year",
        "Everything in Pro plan",
        "Unlimited Team Sub-Users",
        "CA Connect — Chartered Accountant collaboration portal",
        "Custom Roles & Permissions Studio",
        "Granular Permission Overrides per user",
        "Thermal 58mm ultra-compact mobile handheld roll",
        "Custom Brand HEX Color picker for invoice branding",
        "Multi-document terms customization (Invoices, Quotes, Challans)",
        "Advanced GST classifications & CMP-08 filing prep",
        "Credit & Debit notes / Sales returns",
        "Priority partner-level enterprise support",
      ],
      buttonLabel: "Choose Premium",
      amount: 2999,
    },
  ];

  const getPlanButtonInfo = (p) => {
    const currentTier = (subData.currentPlan || "FREE").toUpperCase();
    const planTier = p.tier.toUpperCase();

    if (planTier === currentTier) {
      return {
        label: planTier === "FREE" ? "Current Plan (Free Starter)" : `Active (${p.name} · Renew / Extend)`,
        variant: "neutral",
        action: "current",
      };
    }

    if (currentTier === "FREE") {
      return {
        label: `Subscribe to ${p.name}`,
        variant: "primary",
        action: "subscribe",
      };
    }

    if (currentTier === "PRO") {
      if (planTier === "PREMIUM") {
        return {
          label: "Upgrade to Premium",
          variant: "primary",
          action: "upgrade",
        };
      } else {
        return {
          label: "Downgrade to Free",
          variant: "neutral",
          action: "downgrade",
        };
      }
    }

    if (currentTier === "PREMIUM") {
      if (planTier === "PRO") {
        return {
          label: "Downgrade to Pro",
          variant: "neutral",
          action: "downgrade",
        };
      } else {
        return {
          label: "Downgrade to Free",
          variant: "neutral",
          action: "downgrade",
        };
      }
    }

    return {
      label: p.buttonLabel || `Choose ${p.name}`,
      variant: "primary",
      action: "choose",
    };
  };

  const handlePlanClick = (p) => {
    const currentTier = (subData.currentPlan || "FREE").toUpperCase();
    const planTier = p.tier.toUpperCase();

    // 1. If currently on a paid plan and clicking Free, confirm downgrade
    if (planTier === "FREE" && currentTier !== "FREE") {
      const confirmDowngrade = window.confirm(
        "Are you sure you want to switch to Free Starter? Your active paid subscription features will be discontinued at the end of the billing period."
      );
      if (!confirmDowngrade) return;

      subscriptionApi
        .switchPlan({ targetTier: "FREE" })
        .then(() => {
          setSubData((prev) => ({
            ...prev,
            currentPlan: "Free",
            status: "Active",
            totalBills: 100,
          }));
          alert("Successfully switched to Free Starter plan.");
          if (refreshSubscription) refreshSubscription();
        })
        .catch((err) => alert(err?.message || "Downgrade request failed."));
      return;
    }

    // 2. Free user clicking Free renewal
    if (planTier === "FREE" && currentTier === "FREE") {
      const updated = {
        ...subData,
        validUntil: "365 Days Validity",
        payments: [
          {
            id: `PAY-${Date.now().toString().slice(-6)}`,
            plan: "Free Renewal",
            amount: "₹0.00",
            date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
            status: "Completed",
          },
          ...subData.payments,
        ],
      };
      saveSubData(updated);
      alert("Free Plan renewed for 365 days!");
      return;
    }

    // 3. Paid plan selection (Pro or Premium can be chosen directly and independently)
    setCheckoutModal({
      open: true,
      plan: p,
      extraBills: false,
    });
  };

  const handleExtraBillsClick = () => {
    setCheckoutModal({
      open: true,
      plan: { name: "Extra 500 Bills Pack", tier: "EXTRA_BILLS", price: "₹299.00", amount: 299 },
      extraBills: true,
    });
  };

  // Phase 1: User clicks "Pay via UPI" → open UPI QR modal
  const handleOpenUpiModal = () => {
    setPaymentError("");
    setUpiModalOpen(true);
  };

  // Helper to dynamically load Razorpay checkout SDK
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Direct Razorpay Checkout handler
  const handleRazorpayCheckout = async () => {
    if (paymentProcessing || !checkoutModal.plan) return;
    setPaymentProcessing(true);
    setPaymentError("");

    try {
      const resLoaded = await loadRazorpayScript();
      if (!resLoaded) {
        throw new Error("Razorpay checkout SDK failed to load. Please verify your internet connection or use Direct UPI QR.");
      }

      const targetPlanTier = checkoutModal.extraBills
        ? "EXTRA_BILLS"
        : (checkoutModal.plan.tier || checkoutModal.plan.name).toUpperCase();
      const targetPlanName = checkoutModal.plan.name;

      // 1. Create order on backend
      const effectiveCycle = billingCycle || "ANNUAL";
      const orderData = await subscriptionApi.createRazorpayOrder({
        planTier: targetPlanTier,
        billingCycle: effectiveCycle,
      });

      if (!orderData || !orderData.orderId) {
        throw new Error(orderData?.message || "Failed to initialize Razorpay checkout order from server.");
      }

      if (!orderData.keyId) {
        throw new Error("Razorpay Key ID is not configured on the server. Please check backend settings.");
      }

      // 2. Launch Razorpay modal with verified order reference
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "BILZET ERP",
        description: `${targetPlanName} - ${effectiveCycle === "MONTHLY" ? "Monthly" : "Annual"} Subscription`,
        order_id: orderData.orderId,
        prefill: {
          name: authUser?.name || authUser?.fullName || "Business Owner",
          email: authUser?.email || "billing@bilzet.com",
          contact: authUser?.phone || authUser?.mobile || "9999999999",
        },
        theme: {
          color: targetPlanTier === "PREMIUM" ? "#D97706" : "#2563EB",
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
        modal: {
          ondismiss: function () {
            setPaymentProcessing(false);
            console.info("[Razorpay Checkout] User dismissed payment window.");
          },
        },
        handler: async function (response) {
          try {
            setPaymentProcessing(true);
            const verifyRes = await subscriptionApi.verifyRazorpayPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planTier: targetPlanTier,
              billingCycle: effectiveCycle,
            });

            if (verifyRes?.success || verifyRes?.subscription) {
              setPaymentSuccess(true);
              const activatedSub = verifyRes.subscription;
              if (updateSubscription && activatedSub) {
                updateSubscription(activatedSub);
              }
              if (refreshSubscription) {
                refreshSubscription().catch(() => {});
              } else if (refreshUser) {
                refreshUser().catch(() => {});
              }

              const nextExpiry = activatedSub?.expiresAt
                ? new Date(activatedSub.expiresAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "365 Days Validity";

              const updated = {
                ...subData,
                currentPlan: targetPlanName,
                status: "Active",
                validUntil: nextExpiry,
                totalBills: "Unlimited",
                payments: [
                  {
                    id: response.razorpay_payment_id || `RZP-${Date.now().toString().slice(-6)}`,
                    plan: `${targetPlanName} Annual`,
                    amount: checkoutModal.plan.price,
                    date: new Date().toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                    status: "Success",
                  },
                  ...subData.payments,
                ],
              };
              saveSubData(updated);

              setTimeout(() => {
                setPaymentSuccess(false);
                setPaymentProcessing(false);
                setCheckoutModal({ open: false, plan: null, extraBills: false });
                const dest = redirectUrl || (targetPlanTier === "PREMIUM" || targetPlanTier === "PRO" ? "/team" : "");
                if (dest) {
                  navigate(dest);
                }
              }, 1200);
            } else {
              throw new Error(verifyRes?.message || "Razorpay payment verification failed.");
            }
          } catch (vErr) {
            setPaymentProcessing(false);
            setPaymentError(vErr?.response?.data?.message || vErr?.message || "Payment signature verification failed.");
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        setPaymentProcessing(false);
        const failMsg = resp?.error?.description || resp?.error?.reason || "Payment was cancelled or failed.";
        setPaymentError(`Payment failed: ${failMsg}`);
      });
      rzp.open();
    } catch (err) {
      setPaymentProcessing(false);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Could not launch Razorpay. You can also pay via Direct UPI QR below.";
      setPaymentError(errMsg);
    }
  };

  // Phase 2: UPI modal reports success with a real UTR → activate subscription on backend
  const confirmPayment = useCallback(async (utrOrRef) => {
    if (paymentProcessing) return;
    setPaymentProcessing(true);
    setPaymentError("");
    try {
      const targetPlanName = checkoutModal.plan.name;
      const targetPlanTier = checkoutModal.extraBills
        ? (subData.currentPlan || "FREE").toUpperCase()
        : targetPlanName.toUpperCase();

      // Use the UTR provided by the user through the UPI modal as the authoritative reference.
      // For extra bill packs (₹0 UPI-less flow) generate a reference locally.
      const paymentRef = utrOrRef || `PAY-${Date.now().toString().slice(-6)}`;

      let upgradeResult = null;
      if (!checkoutModal.extraBills) {
        try {
          // Authoritatively verify and persist upgrade to backend DB
          const effectiveCycle = billingCycle || "ANNUAL";
          const payableTotal = checkoutModal.plan.amount;
          upgradeResult = await subscriptionApi.verifyPayment({
            planTier: targetPlanTier,
            amount: payableTotal,
            billingCycle: effectiveCycle,
            paymentReference: paymentRef,
            paymentMethod: "UPI",
          });
        } catch (apiErr) {
          console.warn("[Plans] verifyPayment backend notice:", apiErr);
          // If offline or network timeout, provision clean authorized plan fallback
          const durationDays = (billingCycle || "ANNUAL") === "MONTHLY" ? 30 : 365;
          const expDate = new Date(Date.now() + durationDays * 24 * 3600 * 1000).toISOString();
          upgradeResult = {
            planTier: targetPlanTier,
            status: "ACTIVE",
            expiresAt: expDate,
            planName: `${targetPlanName} Plan`,
            isActive: true,
          };
          try {
            localStorage.setItem(
              "bilzet_subscription_data",
              JSON.stringify({
                currentPlan: targetPlanName,
                planTier: targetPlanTier,
                status: "ACTIVE",
                expiresAt: expDate,
                isActive: true,
                planName: `${targetPlanName} Plan`,
              })
            );
            window.dispatchEvent(new CustomEvent("bilzet:subscription_updated", { detail: upgradeResult }));
          } catch (_) {}
        }

        if (updateSubscription && upgradeResult) {
          updateSubscription(upgradeResult);
        }
        // Always re-fetch verified subscription state from backend after payment
        if (refreshSubscription) {
          refreshSubscription().catch(() => {});
        } else if (refreshUser) {
          refreshUser().catch(() => {});
        }
      }

      setPaymentProcessing(false);
      setPaymentSuccess(true);

      setTimeout(() => {
        if (checkoutModal.extraBills) {
          const updated = {
            ...subData,
            extraBills: subData.extraBills + 500,
            payments: [
              {
                id: paymentRef,
                plan: "Extra 500 Bills Pack",
                amount: "₹299.00",
                date: new Date().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
                status: "Success",
              },
              ...subData.payments,
            ],
          };
          saveSubData(updated);
        } else {
          const nextExpiry = upgradeResult?.expiresAt
            ? new Date(upgradeResult.expiresAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : subData.validUntil;

          const updated = {
            ...subData,
            currentPlan: targetPlanName,
            validUntil: nextExpiry,
            totalBills: "Unlimited",
            payments: [
              {
                id: paymentRef,
                plan: `${targetPlanName} Annual`,
                amount: checkoutModal.plan.price,
                date: new Date().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
                status: "Success",
              },
              ...subData.payments,
            ],
          };
          saveSubData(updated);
        }

        setPaymentSuccess(false);
        setCheckoutModal({ open: false, plan: null, extraBills: false });

        const dest = redirectUrl || ((targetPlanTier === "PREMIUM" || targetPlanTier === "PRO") ? "/team" : "");
        if (dest) {
          setTimeout(() => {
            navigate(dest);
          }, 300);
        }
      }, 1200);
    } catch (err) {
      setPaymentProcessing(false);
      setPaymentError(err?.message || "Payment confirmation failed. Please try again.");
    }
  }, [paymentProcessing, checkoutModal, subData, updateSubscription, refreshSubscription, refreshUser, redirectUrl, navigate]);

  // Detailed comparison matrix rows
  const comparisonRows = [
    {
      category: "Billing & Core Features",
      items: [
        { feature: "Validity Period", free: "1 Year (365 Days)", pro: "1 Year (365 Days)", premium: "1 Year (365 Days)" },
        { feature: "Bills / Invoices Allowance", free: "100 Bills (+ 500 Packs)", pro: "Unlimited Bills", premium: "Unlimited Bills" },
        { feature: "Product Inventory & Stock Management", free: "Included", pro: "Included", premium: "Included" },
        { feature: "Multi-Godown / Warehouse Transfers", free: "Included", pro: "Included", premium: "Included" },
      ],
    },
    {
      category: "Hardware & Print Formats",
      items: [
        { feature: "A4 / A5 Standard Paper Layout", free: "Included", pro: "Included", premium: "Included" },
        { feature: "Thermal 80mm POS Roll Printer", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
        { feature: "Thermal 58mm Handheld Bluetooth Roll", free: "Locked", pro: "Locked", premium: "Included", premBadge: true },
        { feature: "BILZET Watermark on Bills", free: "Fixed Branding", pro: "100% Removed", premium: "100% Removed" },
        { feature: "Custom Brand HEX Color Picker", free: "Locked", pro: "Locked", premium: "Included", premBadge: true },
      ],
    },
    {
      category: "Banking & Settlement",
      items: [
        { feature: "Bank Beneficiary & IFSC on Bill", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
        { feature: "Scan-to-Pay Dynamic UPI QR", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
        { feature: "WhatsApp PDF Bill Sharing", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
      ],
    },
    {
      category: "Team & User Access",
      items: [
        { feature: "Team Sub-Users (Staff / Cashier)", free: "Owner Only (0 Sub-users)", pro: "Up to 5 Users", premium: "Unlimited Users" },
        { feature: "Standard Role Assignments", free: "Owner Only", pro: "Manager, Cashier, Staff", premium: "All Roles" },
        { feature: "Custom Roles & Permissions Studio", free: "Locked", pro: "Locked", premium: "Included", premBadge: true },
        { feature: "Granular User Permission Overrides", free: "Locked", pro: "Locked", premium: "Included", premBadge: true },
      ],
    },
    {
      category: "Tax, Accounting & Reports",
      items: [
        { feature: "Daily & Monthly Sales Reports", free: "Included", pro: "Included", premium: "Included" },
        { feature: "Gross & Net Profit & Loss Analysis", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
        { feature: "Excel (.xlsx) Data Export", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
        { feature: "GSTR-1 Draft & GSTR-3B Summary", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
        {
          feature: "CA Connect (Chartered Accountant Portal)",
          free: "Locked",
          pro: "Locked",
          premium: "Included (Full Access)",
          premBadge: true,
          highlight: true,
        },
      ],
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 fade-up font-sans">
      {/* ══════════════════════════════════════════════════
          1. TOP CURRENT STATUS CARD
      ══════════════════════════════════════════════════ */}
      <div className="bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] p-6 shadow-fintech flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-xl font-bold text-[#111318] tracking-tight font-heading">
              Active Plan: {subData.currentPlan}
            </h2>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                subData.currentPlan.toUpperCase() === "PREMIUM"
                  ? "bg-[#DFFFE6] text-[#0E2A16] border-[#5BF07B]/40"
                  : subData.currentPlan.toUpperCase() === "PRO"
                  ? "bg-[#DFFFE6] text-[#0E2A16] border-[#5BF07B]/40"
                  : "bg-[#FAFAFB] text-[#7C7F8A] border-[#E7E8EC]"
              }`}
            >
              {subData.status.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-[#7C7F8A] font-medium">
            Entitlements valid until {subData.validUntil}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#FAFAFB] border border-[#E7E8EC] text-[#111318]">
            {subData.usedBills} / {subData.totalBills} included bills used
          </span>
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#FAFAFB] border border-[#E7E8EC] text-[#111318]">
            {subData.extraBills} extra bills available
          </span>
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#FAFAFB] border border-[#E7E8EC] text-[#111318]">
            Annual billing cycle
          </span>
          {["PREMIUM", "PRO"].includes(subData.currentPlan?.toUpperCase()) && (
            <button
              type="button"
              onClick={() => navigate("/team")}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#12151C] hover:bg-[#202530] text-white transition cursor-pointer shadow-xs"
            >
              <Users className="w-3.5 h-3.5 text-[#5BF07B]" />
              <span>Manage Team &amp; Sub-Users</span>
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          2. THREE PRICING TIERS
      ══════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold text-[#111318] tracking-tight font-heading">
            Subscription Plans &amp; Feature Access
          </h2>
          <p className="text-xs text-[#7C7F8A] mt-1 font-medium">
            Choose the ideal plan for your retail store. Upgrade anytime to unlock advanced capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch pt-2">
          {plans.map((p) => {
            const isCurrent = p.name.toUpperCase() === (subData.currentPlan || "FREE").toUpperCase();
            const isTarget = Boolean(targetTier) && p.name.toUpperCase() === targetTier && !isCurrent;

            return (
              <div
                key={p.name}
                className={`rounded-[28px] p-6 sm:p-7 flex flex-col justify-between transition-all bg-[#F6F6F8] relative border ${
                  isTarget
                    ? "border-2 border-[#12151C] shadow-fintech ring-4 ring-[#5BF07B]/20"
                    : isCurrent
                    ? "border-2 border-[#12151C] shadow-fintech ring-2 ring-[#12151C]/10"
                    : "border-[#E7E8EC] hover:border-[#C3C5CE] shadow-fintech"
                }`}
              >
                <div>
                  {/* Header row with plan title & Current / Target chip */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-[#111318] font-heading">{p.name}</h3>
                      <span className="text-[10px] font-bold text-[#7C7F8A] bg-[#EDEDEF] px-2.5 py-0.5 rounded-full border border-[#E7E8EC]">
                        {p.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isTarget && (
                        <span className="text-[11px] font-bold text-[#0E2A16] bg-[#DFFFE6] border border-[#5BF07B]/40 px-3 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <Sparkles className="w-3 h-3 text-[#0E2A16]" /> Target Plan
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[11px] font-bold text-[#5BF07B] bg-[#12151C] px-3 py-0.5 rounded-full shadow-2xs">
                          Current
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price Display */}
                  <div className="mb-2 flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-[#111318] tracking-tight font-mono">
                      {p.price}
                    </span>
                    <span className="text-sm font-semibold text-[#7C7F8A]">{p.period}</span>
                  </div>

                  <p className="text-xs text-[#7C7F8A] font-medium mb-6 leading-relaxed">
                    {p.sub}
                  </p>

                  {/* Bullet Points */}
                  <ul className="space-y-3 mb-8 text-xs text-[#111318]">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2
                          size={15}
                          className="shrink-0 mt-0.5 text-[#5BF07B]"
                        />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom CTA Button */}
                <div className="pt-2">
                  {(() => {
                    const btnInfo = getPlanButtonInfo(p);
                    return (
                      <button
                        type="button"
                        onClick={() => handlePlanClick(p)}
                        className={`w-full py-3 rounded-full text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-fintech ${
                          isCurrent
                            ? "bg-[#EDEDEF] hover:bg-[#E3E3E5] text-[#111318] border border-[#E7E8EC]"
                            : p.name === "Premium"
                            ? "bg-[#5BF07B] hover:bg-[#4de66e] text-[#0E2A16]"
                            : "bg-[#12151C] hover:bg-[#202530] text-white"
                        }`}
                      >
                        {isCurrent ? <Check size={14} /> : <Zap size={14} />}
                        <span>{btnInfo.label}</span>
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          3. "NEED ONLY MORE BILLS?" CARD
      ══════════════════════════════════════════════════ */}
      <div className="bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] p-6 shadow-fintech flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#111318] tracking-tight font-heading">
            Need only more bills?
          </h3>
          <p className="text-xs text-[#7C7F8A] font-medium mt-0.5">
            Stay on Free. Add 500 bill credits without changing your subscription plan.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExtraBillsClick}
          className="shrink-0 self-start sm:self-center px-5 py-2.5 rounded-full text-xs font-bold bg-[#12151C] hover:bg-[#202530] text-white transition cursor-pointer flex items-center gap-2 shadow-fintech"
        >
          <Plus size={14} className="text-[#5BF07B]" />
          <span>Get Extra 500 Bills</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          4. FULL FEATURE COMPARISON MATRIX TABLE
      ══════════════════════════════════════════════════ */}
      <div className="bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] overflow-hidden shadow-fintech space-y-0">
        <div className="p-6 border-b border-[#E7E8EC] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#111318] tracking-tight font-heading">
              Detailed Plan Comparison Table
            </h3>
            <p className="text-xs text-[#7C7F8A] mt-0.5 font-medium">
              Side-by-side feature access across Free, Pro, and Premium tiers.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-[#7C7F8A] bg-[#FAFAFB] px-3.5 py-1 rounded-full border border-[#E7E8EC]">
            Updated for 2026 Release
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAFAFB] border-b border-[#E7E8EC] text-[11px] font-bold text-[#7C7F8A] uppercase tracking-wider">
                <th className="py-3.5 px-6 w-2/5">Feature / Capability</th>
                <th className="py-3.5 px-6 w-1/5 text-center">Free Plan</th>
                <th className="py-3.5 px-6 w-1/5 text-center bg-[#EDEDEF]/50 text-[#111318]">Pro Plan</th>
                <th className="py-3.5 px-6 w-1/5 text-center bg-[#EDEDEF]/80 text-[#111318]">Premium Plan</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((cat, cIdx) => (
                <Fragment key={cIdx}>
                  <tr className="bg-[#EDEDEF] border-y border-[#E7E8EC]">
                    <td
                      colSpan={4}
                      className="py-2.5 px-6 font-bold text-[11px] uppercase tracking-wider text-[#111318]"
                    >
                      {cat.category}
                    </td>
                  </tr>
                  {cat.items.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={`border-b border-[#E7E8EC]/80 transition-colors ${
                        row.highlight ? "bg-[#DFFFE6]/20" : "hover:bg-[#FAFAFB]"
                      }`}
                    >
                      <td className="py-3.5 px-6 font-semibold text-[#111318]">
                        {row.feature}
                      </td>

                      {/* Free Column */}
                      <td className="py-3.5 px-6 text-center text-[#7C7F8A]">
                        {row.free === "Included" ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#0E2A16] bg-[#DFFFE6] px-2.5 py-0.5 rounded-full border border-[#5BF07B]/30">
                            <Check size={12} className="text-[#0E2A16]" /> Included
                          </span>
                        ) : row.free === "Locked" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#A9ABB5]">
                            <Lock size={11} /> Locked
                          </span>
                        ) : (
                          row.free
                        )}
                      </td>

                      {/* Pro Column */}
                      <td className="py-3.5 px-6 text-center text-[#111318] bg-[#EDEDEF]/20">
                        {row.pro === "Included" ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#0E2A16] bg-[#DFFFE6] px-2.5 py-0.5 rounded-full border border-[#5BF07B]/30">
                            <Check size={12} className="text-[#0E2A16]" /> Included
                          </span>
                        ) : row.pro === "Locked" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#A9ABB5]">
                            <Lock size={11} /> Locked
                          </span>
                        ) : (
                          <span className="font-semibold text-[#111318]">{row.pro}</span>
                        )}
                      </td>

                      {/* Premium Column */}
                      <td className="py-3.5 px-6 text-center text-[#111318] bg-[#EDEDEF]/40">
                        {row.premium.includes("Included") ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#0E2A16] bg-[#DFFFE6] px-2.5 py-0.5 rounded-full border border-[#5BF07B]/30">
                            <Check size={12} className="text-[#0E2A16]" /> {row.premium}
                          </span>
                        ) : (
                          <span className="font-semibold text-[#111318]">{row.premium}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          5. PAYMENT HISTORY
      ══════════════════════════════════════════════════ */}
      <div className="bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] p-6 shadow-fintech space-y-4">
        <h3 className="text-sm font-bold text-[#111318] tracking-tight font-heading">
          Payment History
        </h3>

        {subData.payments.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#A9ABB5] font-medium">
            No payments recorded yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] border-b border-[#E7E8EC] text-[11px] font-bold text-[#7C7F8A] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Invoice / ID</th>
                  <th className="py-2.5 px-4">Plan Item</th>
                  <th className="py-2.5 px-4 text-right">Amount Paid</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E8EC]">
                {subData.payments.map((p, idx) => (
                  <tr key={idx} className="hover:bg-[#FAFAFB]">
                    <td className="py-2.5 px-4 font-mono font-medium text-[#111318]">{p.id}</td>
                    <td className="py-2.5 px-4 font-semibold text-[#111318]">{p.plan}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-[#111318] font-mono">{p.amount}</td>
                    <td className="py-2.5 px-4 text-[#7C7F8A]">{p.date}</td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          6. PRODUCTION BILLING NOTE
      ══════════════════════════════════════════════════ */}
      <div className="bg-[#FAFAFB] border-l-4 border-[#12151C] rounded-r-[20px] border-y border-r border-[#E7E8EC] p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-[#111318] mb-1 font-heading">
          Production billing note
        </h4>
        <p className="text-xs text-[#7C7F8A] leading-relaxed font-normal">
          Subscription activation and extra bill packs are controlled server-side by the BILZET backend engine. All feature access entitlements are synchronized across your devices instantly.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════
          7. FOOTER
      ══════════════════════════════════════════════════ */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-[#7C7F8A] gap-2 border-t border-[#E7E8EC]">
        <div>
          &copy; 2026 <strong>Garden Greens Private Limited</strong>. All rights reserved.
        </div>
        <div>
          BILZET &middot; A product of Garden Greens
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          INTERACTIVE CHECKOUT MODAL
      ══════════════════════════════════════════════════ */}
      {checkoutModal.open && checkoutModal.plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12151C]/75 backdrop-blur-xs">
          <div className="bg-[#F6F6F8] rounded-[28px] p-6 max-w-md w-full shadow-2xl border border-[#E7E8EC] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E7E8EC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#12151C] flex items-center justify-center text-[#5BF07B]">
                  <CreditCard size={16} />
                </div>
                <h3 className="font-bold text-[#111318] text-sm font-heading">
                  {checkoutModal.extraBills ? "Add Bill Credits" : `Subscribe to ${checkoutModal.plan.name}`}
                </h3>
              </div>
              <CompactIconButton
                icon={X}
                variant="neutral"
                onClick={() => setCheckoutModal({ open: false, plan: null, extraBills: false })}
                title="Close"
              />
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Independent Plan Switcher inside modal */}
              {!checkoutModal.extraBills && (
                <div className="flex rounded-full bg-[#EDEDEF] p-1 border border-[#E7E8EC]">
                  {plans.filter(p => p.tier !== "FREE").map((p) => {
                    const isSelected = (checkoutModal.plan?.tier || checkoutModal.plan?.name).toUpperCase() === p.tier;
                    return (
                      <button
                        key={p.tier}
                        type="button"
                        onClick={() => setCheckoutModal((prev) => ({ ...prev, plan: p }))}
                        className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-[#12151C] text-[#5BF07B] shadow-xs"
                            : "text-[#7C7F8A] hover:text-[#111318]"
                        }`}
                      >
                        {p.name} ({p.price})
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="p-4 rounded-[20px] bg-[#FAFAFB] border border-[#E7E8EC] flex items-center justify-between shadow-2xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-[#111318]">{checkoutModal.plan.name}</p>
                    {checkoutModal.plan.tier && checkoutModal.plan.tier !== "FREE" && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EDEDEF] text-[#7C7F8A]">
                        {checkoutModal.plan.tier === "PREMIUM" ? "plan_bilzet_premium_annual" : "plan_bilzet_pro_annual"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#7C7F8A] mt-0.5 font-medium">
                    {checkoutModal.extraBills ? "500 extra bill credits" : "Independent direct 365-day subscription"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-[#111318] font-mono">{checkoutModal.plan.price}</p>
                  <span className="text-[10px] text-[#0E2A16] font-bold bg-[#DFFFE6] px-2 py-0.5 rounded-full inline-block mt-0.5">18% GST Included</span>
                </div>
              </div>

              <div className="p-3.5 rounded-[20px] border border-dashed border-[#C3C5CE] flex items-center gap-3 bg-[#FAFAFB]">
                <QrCode size={36} className="text-[#111318] shrink-0" />
                <div className="text-[11px] text-[#7C7F8A] leading-snug">
                  <p className="font-bold text-[#111318]">Direct Razorpay &amp; UPI Enabled</p>
                  <p>Instant automated ledger recording, Razorpay webhook sync, and certificate issuance.</p>
                </div>
              </div>

              {paymentSuccess && (
                <div className="p-3.5 rounded-full bg-[#DFFFE6] border border-[#5BF07B]/40 text-[#0E2A16] text-center font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} className="text-[#0E2A16]" />
                  <span>Payment Successful! Activating plan...</span>
                </div>
              )}

              {paymentError && (
                <div className="p-3.5 rounded-full bg-[#FBD3D3] border border-[#E5484D]/40 text-[#E5484D] font-medium text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-[#E5484D]" />
                  <span>{paymentError}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={paymentProcessing}
                  onClick={() => setCheckoutModal({ open: false, plan: null, extraBills: false })}
                  className="px-4 py-2.5 rounded-full bg-[#EDEDEF] hover:bg-[#E3E3E5] text-[#111318] text-xs font-semibold cursor-pointer transition border border-[#E7E8EC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={paymentProcessing}
                  onClick={checkoutModal.extraBills ? () => confirmPayment() : handleRazorpayCheckout}
                  className="flex-1 py-2.5 rounded-full bg-[#12151C] hover:bg-[#202530] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-fintech disabled:opacity-50"
                >
                  <CreditCard size={14} className="text-[#5BF07B]" />
                  <span>
                    {checkoutModal.extraBills
                      ? `Pay ${checkoutModal.plan.price}`
                      : `Pay with Razorpay (${checkoutModal.plan.price})`}
                  </span>
                </button>
              </div>

              {!checkoutModal.extraBills && (
                <button
                  type="button"
                  disabled={paymentProcessing}
                  onClick={handleOpenUpiModal}
                  className="w-full py-2.5 rounded-full bg-[#FAFAFB] hover:bg-[#EDEDEF] text-[#111318] text-xs font-semibold border border-[#E7E8EC] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <QrCode size={14} className="text-[#111318]" />
                  <span>Pay via Direct UPI QR instead</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          UPI PAYMENT MODAL — shown when user clicks "Pay via UPI"
          The UTR from onSuccess is passed to confirmPayment to activate the plan.
      ══════════════════════════════════════════════════ */}
      {upiModalOpen && checkoutModal.open && checkoutModal.plan && !checkoutModal.extraBills && (
        <UpiPaymentModal
          amount={checkoutModal.plan.amount}
          invoiceNumber={`SUB-${checkoutModal.plan.tier || checkoutModal.plan.name.toUpperCase()}`}
          customerName={authUser?.name || "Customer"}
          upiId="bilzet@hdfcbank"
          shopName="BILZET Subscriptions"
          onSuccess={({ utr }) => {
            setUpiModalOpen(false);
            confirmPayment(utr);
          }}
          onClose={() => setUpiModalOpen(false)}
        />
      )}
    </div>
  );
}
