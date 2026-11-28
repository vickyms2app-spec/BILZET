import LegalPageLayout from "../components/common/LegalPageLayout";

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">1. Information We Collect</h2>
        <p>
          BILZET collects account details (name, email address, phone number), business profile information
          (store name, GSTIN, business address, logo, and authorized signature), and transactional billing,
          inventory, and GST records that you enter while using the platform.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">2. How We Use Your Information</h2>
        <p>
          Your data is used solely to provide POS billing, invoice generation, GST reporting, inventory
          tracking, multi-store administration, and subscription management. We do not sell or rent your
          business or customer data to third parties.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">3. Payment &amp; Authentication Security</h2>
        <p>
          Authentication is handled securely through Clerk and encrypted session tokens. Online subscription
          payments are processed via Razorpay; BILZET never stores your full card number, CVV, or UPI PIN.
          All API traffic is transmitted over HTTPS and protected with tenant-level isolation.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">4. Data Retention &amp; Access</h2>
        <p>
          Invoice and GST records are retained as required for tax and audit compliance. Store owners may
          update business details, export reports, or request account deletion by contacting support at{" "}
          <span className="font-semibold text-[#111318]">contact@bilzet.com</span>.
        </p>
      </section>
    </LegalPageLayout>
  );
}
