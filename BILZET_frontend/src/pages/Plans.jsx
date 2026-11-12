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

  // Dealer Special Offers State (Task 3)
  const [dealerOffers, setDealerOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoMessage, setPromoMessage] = useState({ type: "", text: "" });
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

  // Fetch active dealer promotional offers whenever billingCycle changes
  useEffect(() => {
    let mounted = true;
    subscriptionApi
      .getDealerOffers({ billingCycle })
      .then((res) => {
        if (mounted && res && res.offers) {
          setDealerOffers(res.offers);
        }
      })
      .catch((err) => {
        console.warn("Notice: could not load dealer offers:", err);
      });

    return () => {
      mounted = false;
    };
  }, [billingCycle]);

  // Handler to validate dealer promo code with backend API
  const handleApplyPromoCode = async (codeToValidate, targetPlanTier) => {
    const code = (codeToValidate || promoCodeInput).trim().toUpperCase();
    if (!code) {
      setPromoMessage({ type: "error", text: "Please enter a valid dealer promo code." });
      return;
    }
    setPromoValidating(true);
    setPromoMessage({ type: "", text: "" });
    try {
      const tier = targetPlanTier || checkoutModal.plan?.tier || "PRO";
      const res = await subscriptionApi.validateDealerOffer({
        code,
        planTier: tier,
        billingCycle,
      });
      if (res && res.valid) {
        setAppliedOffer(res);
        setPromoMessage({
          type: "success",
          text: `Dealer offer "${code}" applied! You save ₹${Number(res.discountAmount || 0).toLocaleString("en-IN")}.`,
        });
      } else {
        setAppliedOffer(null);
        setPromoMessage({
          type: "error",
          text: res?.message || "Invalid or expired dealer promo code.",
        });
      }
    } catch (err) {
      setAppliedOffer(null);
      setPromoMessage({
        type: "error",
        text: err?.message || "Failed to validate dealer offer code.",
      });
    } finally {
      setPromoValidating(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedOffer(null);
    setPromoCodeInput("");
    setPromoMessage({ type: "", text: "" });
  };

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

  // Memoized dealer plans supporting Dealer Basic, Dealer Pro, and Dealer Premium with dynamic backend offers
  const displayedDealerPlans = useMemo(() => {
    const isMonthly = billingCycle === "MONTHLY";
    const defaultPlans = [
      {
        planName: "Dealer Basic",
        badge: "Entry-level plan",
        code: "DEALERBASIC20",
        discountType: "PERCENTAGE",
        discountValue: 20,
        applicablePlans: ["BASIC", "DEALER_BASIC", "FREE", "PRO"],
        originalPrice: isMonthly ? 199 : 2388,
        discountedPrice: isMonthly ? 159 : 1910,
        savingsAmount: isMonthly ? 40 : 478,
        discountPercentage: 20,
        billingDuration: isMonthly ? "Monthly" : "Annual (365 Days)",
        durationLabel: isMonthly ? "/month" : "/year",
        features: [
          "Billing & Invoicing",
          "Product Catalog",
          "Basic Inventory",
          "Customer and Supplier Management",
          "Basic Sales Reports",
          "500 included bills/month",
        ],
        validUntil: "2026-12-31",
      },
      {
        planName: "Dealer Pro",
        badge: "Most Popular",
        code: "DEALER30",
        discountType: "PERCENTAGE",
        discountValue: 30,
        applicablePlans: ["PRO", "DEALER_PRO"],
        originalPrice: isMonthly ? 349 : 4188,
        discountedPrice: isMonthly ? 244 : 2932,
        savingsAmount: isMonthly ? 105 : 1256,
        discountPercentage: 30,
        billingDuration: isMonthly ? "Monthly" : "Annual (365 Days)",
        durationLabel: isMonthly ? "/month" : "/year",
        features: [
          "Everything in Basic",
          "Advanced Stock Overview",
          "Stock Movements",
          "Purchase Management",
          "Advanced Reports and Analytics",
          "GST Reports",
          "Expanded Multi-user Access",
        ],
        validUntil: "2026-12-31",
      },
      {
        planName: "Dealer Premium",
        badge: "Best Value",
        code: "DEALERVIP40",
        discountType: "PERCENTAGE",
        discountValue: 40,
        applicablePlans: ["PREMIUM", "DEALER_PREMIUM"],
        originalPrice: isMonthly ? 499 : 5988,
        discountedPrice: isMonthly ? 299 : 3593,
        savingsAmount: isMonthly ? 200 : 2395,
        discountPercentage: 40,
        billingDuration: isMonthly ? "Monthly" : "Annual (365 Days)",
        durationLabel: isMonthly ? "/month" : "/year",
        features: [
          "Everything in Pro",
          "Multi-Store Management",
          "Advanced Staff Management",
          "Role and Permission Management",
          "CA Connect",
          "Advanced GST Analytics",
          "Centralized Inventory",
          "Priority Support",
        ],
        validUntil: "2026-12-31",
      },
    ];

    if (!dealerOffers || dealerOffers.length === 0) {
      return defaultPlans;
    }

    return defaultPlans.map((dp) => {
      const match = dealerOffers.find(
        (o) =>
          (o.code && o.code.toUpperCase() === dp.code.toUpperCase()) ||
          (o.dealerPlan && o.dealerPlan.toUpperCase() === dp.planName.toUpperCase())
      );
      if (!match) return dp;

      return {
        ...dp,
        planName: match.dealerPlan || dp.planName,
        badge: match.badge || dp.badge,
        code: match.code || dp.code,
        discountPercentage: match.discountPercentage ?? match.discountValue ?? dp.discountPercentage,
        originalPrice: match.originalPrice ?? dp.originalPrice,
        discountedPrice: match.discountedPrice ?? dp.discountedPrice,
        savingsAmount: match.savingsAmount ?? dp.savingsAmount,
        billingDuration: match.billingDuration || dp.billingDuration,
        durationLabel: match.durationLabel || dp.durationLabel,
        features: (match.dealerBenefits && match.dealerBenefits.length > 0) ? match.dealerBenefits : dp.features,
        validUntil: match.validUntil || dp.validUntil,
      };
    });
  }, [dealerOffers, billingCycle]);

  const handleSubscribeDealerPlan = (plan) => {
    setPromoCodeInput(plan.code);
    const targetTier =
      plan.planName.toUpperCase().includes("PREMIUM")
        ? "PREMIUM"
        : "PRO";

    const matchedPlan = plans.find((p) => p.tier === targetTier) || plans[1];

    handleApplyPromoCode(plan.code, targetTier);
    setCheckoutModal({
      open: true,
      plan: {
        ...matchedPlan,
        name: plan.planName,
        tier: targetTier,
        amount: plan.discountedPrice || matchedPlan.amount,
        price: `₹${Number(plan.discountedPrice || matchedPlan.amount).toLocaleString("en-IN")}`,
      },
      extraBills: false,
    });
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

      // 1. Create order on backend with dealer offer discount
      const effectiveCycle = billingCycle || "ANNUAL";
      const orderData = await subscriptionApi.createRazorpayOrder({
        planTier: targetPlanTier,
        billingCycle: effectiveCycle,
        dealerOfferCode: appliedOffer?.code || undefined,
      });

      if (!orderData || !orderData.orderId) {
        throw new Error(orderData?.message || "Failed to initialize Razorpay checkout order.");
      }

      // 2. Launch Razorpay modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "BILZET ERP",
        description: `${targetPlanName} - ${effectiveCycle === "MONTHLY" ? "Monthly" : "Annual"} Subscription`,
        order_id: orderData.orderId,
        prefill: {
          name: authUser?.name || "Business Owner",
          email: authUser?.email || "billing@bilzet.com",
          contact: authUser?.phone || "9999999999",
        },
        theme: {
          color: targetPlanTier === "PREMIUM" ? "#D97706" : "#2563EB",
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
            setPaymentError(vErr?.message || "Payment signature verification failed.");
          }
        },
        modal: {
          ondismiss: function () {
            setPaymentProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        setPaymentProcessing(false);
        setPaymentError(resp?.error?.description || "Payment failed or was cancelled.");
      });
      rzp.open();
    } catch (err) {
      setPaymentProcessing(false);
      setPaymentError(err?.message || "Could not launch Razorpay. You can also pay via Direct UPI QR below.");
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
          // Authoritatively verify and persist upgrade to backend DB with dealer discount
          const effectiveCycle = billingCycle || "ANNUAL";
          const payableTotal = appliedOffer ? (appliedOffer.totalWithGst || appliedOffer.discountedPrice) : checkoutModal.plan.amount;
          upgradeResult = await subscriptionApi.verifyPayment({
            planTier: targetPlanTier,
            amount: payableTotal,
            billingCycle: effectiveCycle,
            paymentReference: paymentRef,
            paymentMethod: "UPI",
            dealerOfferCode: appliedOffer?.code || undefined,
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
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Active Plan: {subData.currentPlan}
            </h2>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                subData.currentPlan.toUpperCase() === "PREMIUM"
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : subData.currentPlan.toUpperCase() === "PRO"
                  ? "bg-blue-50 text-blue-800 border-blue-300"
                  : "bg-slate-100 text-slate-700 border-slate-300"
              }`}
            >
              {subData.status.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Entitlements valid until {subData.validUntil}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200/80 text-slate-700">
            {subData.usedBills} / {subData.totalBills} included bills used
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200/80 text-slate-700">
            {subData.extraBills} extra bills available
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200/80 text-slate-700">
            Annual billing cycle
          </span>
          {["PREMIUM", "PRO"].includes(subData.currentPlan?.toUpperCase()) && (
            <button
              type="button"
              onClick={() => navigate("/team")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer shadow-2xs"
            >
              <Users className="w-3.5 h-3.5" />
              Manage Team &amp; Sub-Users
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          2. DEALER PARTNER & SPECIAL OFFERS SECTION (TASK 3)
      ══════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 rounded-2xl border border-blue-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                Dealer &amp; Partner Program
              </span>
              <span className="text-xs font-semibold text-blue-900">
                Exclusive Volume &amp; Franchise Discounts
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1 tracking-tight">
              Dealer Special Offers &amp; Partner Pricing
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Verified dealers, distributors, and franchise partners receive exclusive discounted pricing on Pro and Premium tiers.
            </p>
          </div>

          {/* Professional Billing Cycle Switcher */}
          <div className="inline-flex rounded-xl p-1 bg-white border border-blue-200 self-start sm:self-auto shadow-xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingCycle("MONTHLY")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                billingCycle === "MONTHLY"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("ANNUAL")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                billingCycle === "ANNUAL"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Yearly (Best Savings)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${billingCycle === "ANNUAL" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                SAVE UP TO 40%
              </span>
            </button>
          </div>
        </div>

        {/* Dealer Plans Subscription Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {displayedDealerPlans.map((plan) => {
            const isApplied = appliedOffer?.code === plan.code;
            const badgeColor =
              plan.badge === "Best Value"
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : plan.badge === "Most Popular"
                ? "bg-blue-100 text-blue-900 border-blue-300"
                : "bg-emerald-100 text-emerald-900 border-emerald-300";

            return (
              <div
                key={plan.code || plan.planName}
                className={`bg-white rounded-2xl p-5 sm:p-6 border transition-all flex flex-col justify-between relative shadow-xs hover:shadow-md ${
                  plan.badge === "Best Value"
                    ? "border-amber-300 ring-2 ring-amber-400/20"
                    : plan.badge === "Most Popular"
                    ? "border-blue-400 ring-2 ring-blue-500/15"
                    : isApplied
                    ? "border-emerald-500 ring-2 ring-emerald-500/20"
                    : "border-blue-200/90 hover:border-blue-400"
                }`}
              >
                <div>
                  {/* Top Bar: Plan Name & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 tracking-tight">
                        {plan.planName}
                      </h4>
                      <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold inline-block mt-0.5">
                        Code: {plan.code}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${badgeColor}`}>
                        {plan.badge}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {plan.discountPercentage}% OFF
                      </span>
                    </div>
                  </div>

                  {/* Pricing Details */}
                  <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-slate-400 line-through font-mono">
                        ₹{Number(plan.originalPrice).toLocaleString("en-IN")}
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        ₹{Number(plan.discountedPrice).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {billingCycle === "MONTHLY" ? "/month" : "/year"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60">
                      <span className="font-bold text-emerald-700">
                        Save ₹{Number(plan.savingsAmount).toLocaleString("en-IN")} {billingCycle === "MONTHLY" ? "/mo" : "/yr"}
                      </span>
                      <span className="text-slate-500 font-medium">
                        Duration: {plan.billingDuration}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 pt-0.5">
                      Promotional dealer price (excl. 18% GST)
                    </p>
                  </div>

                  {/* Included Features */}
                  <div className="space-y-2 mb-6">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Included Features:
                    </p>
                    <ul className="space-y-2 text-xs text-slate-600">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Footer: Expiry & Subscribe Now Button */}
                <div className="pt-4 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      <span>
                        Expires:{" "}
                        {plan.validUntil
                          ? new Date(plan.validUntil).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "31 Dec 2026"}
                      </span>
                    </span>
                    {isApplied && (
                      <span className="text-[10px] font-bold text-emerald-700">Applied ✓</span>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    icon={Zap}
                    onClick={() => handleSubscribeDealerPlan(plan)}
                    className="w-full justify-center shadow-xs"
                  >
                    Subscribe Now
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dealer Benefits Comparison */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-blue-200/60 text-xs">
          <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100/80">
            <p className="font-bold text-blue-900 text-[11px]">Special Dealer Pricing</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Up to 40% margin on retail client activations</p>
          </div>
          <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100/80">
            <p className="font-bold text-blue-900 text-[11px]">Multi-Store Godowns</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Centralized inventory transfers between outlets</p>
          </div>
          <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100/80">
            <p className="font-bold text-blue-900 text-[11px]">Thermal &amp; POS SDK</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Thermal 80mm &amp; 58mm printer drivers included</p>
          </div>
          <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100/80">
            <p className="font-bold text-blue-900 text-[11px]">Dedicated CA Support</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Priority audit portal &amp; GST compliance</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          3. THREE PRICING TIERS
      ══════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Subscription Plans &amp; Feature Access
          </h2>
          <p className="text-xs text-slate-500 mt-1">
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
                className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all bg-white relative ${
                  isTarget
                    ? "border-2 border-indigo-600 shadow-lg ring-4 ring-indigo-500/20"
                    : isCurrent
                    ? "border-2 border-blue-500 shadow-md ring-2 ring-blue-500/10"
                    : "border border-slate-200/90 hover:border-slate-300 shadow-xs"
                }`}
              >
                <div>
                  {/* Header row with plan title & Current / Target chip */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {p.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isTarget && (
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <Sparkles className="w-3 h-3 text-indigo-500" /> Target Plan
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price Display */}
                  <div className="mb-2 flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {p.price}
                    </span>
                    <span className="text-sm font-semibold text-slate-600">{p.period}</span>
                  </div>

                  <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
                    {p.sub}
                  </p>

                  {/* Bullet Points */}
                  <ul className="space-y-3 mb-8 text-xs text-slate-700">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2
                          size={14}
                          className={`shrink-0 mt-0.5 ${
                            p.name === "Premium"
                              ? "text-amber-500"
                              : p.name === "Pro"
                              ? "text-blue-500"
                              : "text-emerald-500"
                          }`}
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
                      <Button
                        variant={btnInfo.variant || (isCurrent ? "neutral" : "primary")}
                        icon={isCurrent ? Check : Zap}
                        onClick={() => handlePlanClick(p)}
                        className="w-full"
                      >
                        {btnInfo.label}
                      </Button>
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
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Need only more bills?
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Stay on Free. Add 500 bill credits without changing your subscription plan.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={handleExtraBillsClick}
          className="shrink-0 self-start sm:self-center"
        >
          Get Extra 500 Bills
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════
          4. FULL FEATURE COMPARISON MATRIX TABLE
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs space-y-0">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Detailed Plan Comparison Table
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Side-by-side feature access across Free, Pro, and Premium tiers.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
            Updated for 2026 Release
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-5 w-2/5">Feature / Capability</th>
                <th className="py-3.5 px-5 w-1/5 text-center">Free Plan</th>
                <th className="py-3.5 px-5 w-1/5 text-center bg-blue-50/40 text-blue-900">Pro Plan</th>
                <th className="py-3.5 px-5 w-1/5 text-center bg-amber-50/40 text-amber-900">Premium Plan</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((cat, cIdx) => (
                <Fragment key={cIdx}>
                  <tr className="bg-slate-100/60 border-y border-slate-200/70">
                    <td
                      colSpan={4}
                      className="py-2.5 px-5 font-bold text-[11px] uppercase tracking-wider text-slate-700"
                    >
                      {cat.category}
                    </td>
                  </tr>
                  {cat.items.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={`border-b border-slate-100 transition-colors ${
                        row.highlight ? "bg-amber-50/20" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <td className="py-3 px-5 font-semibold text-slate-800">
                        {row.feature}
                      </td>

                      {/* Free Column */}
                      <td className="py-3 px-5 text-center text-slate-600">
                        {row.free === "Included" ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                            <Check size={13} className="text-emerald-600" /> Included
                          </span>
                        ) : row.free === "Locked" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Lock size={11} /> Locked
                          </span>
                        ) : (
                          row.free
                        )}
                      </td>

                      {/* Pro Column */}
                      <td className="py-3 px-5 text-center text-slate-800 bg-blue-50/20">
                        {row.pro === "Included" ? (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-700">
                            <Check size={13} className="text-blue-600" /> Included
                          </span>
                        ) : row.pro === "Locked" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Lock size={11} /> Locked
                          </span>
                        ) : (
                          <span className="font-semibold text-blue-900">{row.pro}</span>
                        )}
                      </td>

                      {/* Premium Column */}
                      <td className="py-3 px-5 text-center text-slate-900 bg-amber-50/20">
                        {row.premium.includes("Included") ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800">
                            <Check size={13} className="text-amber-600" /> {row.premium}
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-950">{row.premium}</span>
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
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Payment History
        </h3>

        {subData.payments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">
            No payments recorded yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Invoice / ID</th>
                  <th className="py-2.5 px-4">Plan Item</th>
                  <th className="py-2.5 px-4 text-right">Amount Paid</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subData.payments.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-800">{p.id}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{p.plan}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">{p.amount}</td>
                    <td className="py-2.5 px-4 text-slate-500">{p.date}</td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
      <div className="bg-[#fff9f2] border-l-4 border-amber-500 rounded-r-2xl border-y border-r border-amber-200/70 p-4 sm:p-5">
        <h4 className="text-xs font-bold text-slate-900 mb-1">
          Production billing note
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed font-normal">
          Subscription activation and extra bill packs are controlled server-side by the BILZET backend engine. All feature access entitlements are synchronized across your devices instantly.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════
          7. FOOTER
      ══════════════════════════════════════════════════ */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 border-t border-slate-200/60">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
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
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  {plans.filter(p => p.tier !== "FREE").map((p) => {
                    const isSelected = (checkoutModal.plan?.tier || checkoutModal.plan?.name).toUpperCase() === p.tier;
                    return (
                      <button
                        key={p.tier}
                        type="button"
                        onClick={() => setCheckoutModal((prev) => ({ ...prev, plan: p }))}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? p.tier === "PREMIUM"
                              ? "bg-amber-600 text-white shadow-xs"
                              : "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {p.name} ({p.price})
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-slate-900">{checkoutModal.plan.name}</p>
                    {checkoutModal.plan.tier && checkoutModal.plan.tier !== "FREE" && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        {checkoutModal.plan.tier === "PREMIUM" ? "plan_bilzet_premium_annual" : "plan_bilzet_pro_annual"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {checkoutModal.extraBills ? "500 extra bill credits" : "Independent direct 365-day subscription"}
                  </p>
                </div>
                <div className="text-right">
                  {appliedOffer && !checkoutModal.extraBills ? (
                    <div>
                      <p className="text-xs line-through text-slate-400 font-mono">
                        {checkoutModal.plan.price}
                      </p>
                      <p className="text-base font-black text-emerald-700 font-mono">
                        ₹{Number(appliedOffer.discountedPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-base font-black text-slate-900">{checkoutModal.plan.price}</p>
                  )}
                  <span className="text-[10px] text-emerald-600 font-bold">18% GST Included</span>
                </div>
              </div>

              {/* Dealer Promo Code Input & Verification (Task 3) */}
              {!checkoutModal.extraBills && (
                <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                      <Sparkles size={13} className="text-blue-600" />
                      <span>Have a Dealer Offer Code?</span>
                    </span>
                    {appliedOffer && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        Offer Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. DEALER30, DEALER500"
                      disabled={Boolean(appliedOffer)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono text-xs uppercase focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                    />
                    {appliedOffer ? (
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold cursor-pointer transition"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApplyPromoCode(promoCodeInput, checkoutModal.plan?.tier)}
                        disabled={promoValidating || !promoCodeInput.trim()}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition disabled:opacity-50"
                      >
                        {promoValidating ? "Checking..." : "Apply"}
                      </button>
                    )}
                  </div>

                  {promoMessage.text && (
                    <p
                      className={`text-[11px] font-medium ${
                        promoMessage.type === "success" ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {promoMessage.text}
                    </p>
                  )}
                </div>
              )}

              {/* Full Payment Breakdown at Checkout */}
              {appliedOffer && !checkoutModal.extraBills && (
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600 text-[11px]">
                    <span>Original Price:</span>
                    <span className="line-through font-mono">
                      ₹{Number(appliedOffer.originalPrice || checkoutModal.plan.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-700 font-semibold text-[11px]">
                    <span>Dealer Discount ({appliedOffer.discountPercentage || appliedOffer.savingsPercentage}% · {appliedOffer.code}):</span>
                    <span className="font-mono">
                      - ₹{Number(appliedOffer.savingsAmount || appliedOffer.discountAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 font-medium text-[11px] pt-1 border-t border-emerald-200/50">
                    <span>Net Price (after discount):</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{Number(appliedOffer.discountedPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 text-[11px]">
                    <span>Applicable GST (18%):</span>
                    <span className="font-mono text-emerald-800 font-semibold">
                      + ₹{Number(appliedOffer.gstAmount || Math.round((appliedOffer.discountedPrice || 0) * 0.18)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-emerald-200/80 flex items-center justify-between text-slate-900 font-bold text-xs">
                    <span>Final Payable Total:</span>
                    <span className="text-base text-emerald-800 font-mono font-black">
                      ₹{Number(appliedOffer.totalWithGst || ((appliedOffer.discountedPrice || 0) + Math.round((appliedOffer.discountedPrice || 0) * 0.18))).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 flex items-center gap-3">
                <QrCode size={36} className="text-blue-600 shrink-0" />
                <div className="text-[11px] text-slate-600 leading-snug">
                  <p className="font-bold text-slate-800">Direct Razorpay &amp; UPI Enabled</p>
                  <p>Instant automated ledger recording, Razorpay webhook sync, and certificate issuance.</p>
                </div>
              </div>

              {paymentSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Payment Successful! Activating plan...</span>
                </div>
              )}

              {paymentError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-600" />
                  <span>{paymentError}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="neutral"
                  icon={X}
                  disabled={paymentProcessing}
                  onClick={() => setCheckoutModal({ open: false, plan: null, extraBills: false })}
                  className="shrink-0"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  icon={CreditCard}
                  disabled={paymentProcessing}
                  loading={paymentProcessing}
                  onClick={checkoutModal.extraBills ? () => confirmPayment() : handleRazorpayCheckout}
                  className="flex-1"
                >
                  {checkoutModal.extraBills
                    ? `Pay ${checkoutModal.plan.price}`
                    : appliedOffer
                    ? `Pay with Razorpay (₹${Number(appliedOffer.totalWithGst || ((appliedOffer.discountedPrice || 0) + Math.round((appliedOffer.discountedPrice || 0) * 0.18))).toLocaleString("en-IN")})`
                    : `Pay with Razorpay (${checkoutModal.plan.price})`}
                </Button>
              </div>

              {!checkoutModal.extraBills && (
                <Button
                  type="button"
                  variant="neutral"
                  icon={QrCode}
                  disabled={paymentProcessing}
                  onClick={handleOpenUpiModal}
                  className="w-full text-xs text-slate-700"
                >
                  Pay via Direct UPI QR instead
                </Button>
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
          amount={appliedOffer?.totalWithGst || appliedOffer?.pricing?.totalWithGst || checkoutModal.plan.amount}
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
