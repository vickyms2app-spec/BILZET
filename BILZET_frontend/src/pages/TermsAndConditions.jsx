import LegalPageLayout from "../components/common/LegalPageLayout";

export default function TermsAndConditions() {
  return (
    <LegalPageLayout title="Terms and Conditions">
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">1. Acceptance of Terms</h2>
        <p>
          By accessing or using BILZET (operated by Garden Greens Private Limited), you agree to be bound by
          these Terms and Conditions and all applicable laws and tax regulations in India.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">2. Platform Usage &amp; Account Responsibility</h2>
        <p>
          You are responsible for maintaining the confidentiality of your login credentials, configuring
          accurate GST rates and business details, and ensuring that all invoices and returns generated
          through your store comply with applicable statutory requirements.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">3. Subscriptions &amp; Billing</h2>
        <p>
          BILZET offers Free, Pro, and Premium subscription plans along with optional bill credit packs.
          Paid plans are billed in INR via Razorpay or supported UPI methods and activate upon verified
          payment confirmation.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">4. Service Availability &amp; Liability</h2>
        <p>
          While we strive for continuous uptime and data integrity, BILZET is provided on an &ldquo;as-is&rdquo;
          basis. For questions or legal notices, contact{" "}
          <span className="font-semibold text-[#111318]">contact@bilzet.com</span>.
        </p>
      </section>
    </LegalPageLayout>
  );
}
