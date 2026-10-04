// BILZET Enterprise Security & Data Masking Utility

export const ADMIN_EMAILS = [
  "vickyms2app@gmail.com",
  "vicky@bilzet.com",
  "admin@bilzet.com",
  "karthik@bilzet.com",
];

export function isAdminEmail(email) {
  if (!email) return false;
  const em = String(email).toLowerCase().trim();
  const envAdmins = (typeof import.meta !== "undefined" && import.meta.env?.VITE_ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  return (
    ADMIN_EMAILS.includes(em) ||
    envAdmins.includes(em) ||
    em.startsWith("admin@") ||
    em.endsWith("@bilzet.app") ||
    em.endsWith("@bilzet.com") ||
    em === "vickyms2app@gmail.com" ||
    em.includes("admin")
  );
}

export function isAdminUser(user) {
  if (!user) return false;
  const email = user.email || user.primaryEmailAddress?.emailAddress || "";
  return (
    user.role === "SUPERADMIN" ||
    isAdminEmail(email) ||
    (user.role === "ADMIN" && isAdminEmail(email))
  );
}

/**
 * Mask Bank Account Number
 * Example: 50200012345678 -> •••• •••• •••• 5678
 */
export function maskAccountNumber(acc, isRevealed = false) {
  if (!acc) return "•••• •••• •••• ••••";
  if (isRevealed) return String(acc);
  const clean = String(acc).trim();
  const last4 = clean.slice(-4);
  return `•••• •••• •••• ${last4 || "••••"}`;
}

/**
 * Mask Bank IFSC Code
 * Example: HDFC0001234 -> ••••••••234
 */
export function maskIFSC(ifsc, isRevealed = false) {
  if (!ifsc) return "•••••••••••";
  if (isRevealed) return String(ifsc);
  const clean = String(ifsc).trim();
  const last3 = clean.slice(-3);
  return `••••••••${last3 || "•••"}`;
}

/**
 * Mask UPI ID
 * Example: bilzet@hdfcbank -> ••••••@hdfcbank
 */
export function maskUPI(upi, isRevealed = false) {
  if (!upi) return "••••••@bank";
  if (isRevealed) return String(upi);
  const parts = String(upi).split("@");
  if (parts.length < 2) return "••••••••";
  return `••••••@${parts[1]}`;
}

/**
 * Mask Salary Amount
 * Example: 45000 -> ₹••••••
 */
export function maskSalary(salary, isRevealed = false, suffix = "/mo") {
  if (isRevealed) {
    return `₹${Number(salary || 0).toLocaleString("en-IN")}${suffix}`;
  }
  return `₹••••••`;
}

/**
 * Mask Generic Currency
 */
export function maskCurrency(amount, isRevealed = false) {
  if (isRevealed) {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  }
  return `₹••••••`;
}

/**
 * Mask Phone Number
 * Example: 9876543210 -> ••••••3210
 */
export function maskPhone(phone, isRevealed = false) {
  if (!phone) return "—";
  if (isRevealed) return String(phone);
  const clean = String(phone).trim();
  return `••••••${clean.slice(-4)}`;
}

/**
 * Mask API keys or sensitive secrets
 */
export function maskSecret(secret, isRevealed = false) {
  if (!secret) return "—";
  if (isRevealed) return String(secret);
  const clean = String(secret);
  return `${clean.slice(0, 7)}••••••••••••••••${clean.slice(-4)}`;
}
