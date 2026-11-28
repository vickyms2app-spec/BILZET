import LegalPageLayout from "../components/common/LegalPageLayout";

export default function RefundPolicy() {
  return (
    <LegalPageLayout title="Refund and Cancellation Policy">
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">1. Subscription Cancellations</h2>
        <p>
          You may cancel or downgrade your BILZET subscription plan at any time from the Plans &amp;
          Subscriptions section. Upon cancellation, your active paid features remain available until the
          end of the current billing period unless downgraded immediately.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">2. Refund Eligibility</h2>
        <p>
          Subscription payments and extra bill credit packs are generally non-refundable once activated,
          except in cases of duplicate charges, failed activation after a verified debit, or billing
          errors caused by the platform.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">3. Refund Processing Timeline</h2>
        <p>
          Approved refunds are processed back to the original payment method (via Razorpay) within
          <strong> 5 to 7 business days</strong>, subject to your bank or card issuer&apos;s settlement timeline.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">4. How to Request a Refund</h2>
        <p>
          To request a refund for a duplicate or erroneous transaction, email{" "}
          <span className="font-semibold text-[#111318]">contact@bilzet.com</span> within 7 days of the
          transaction with your registered email, store name, and Razorpay payment/order ID.
        </p>
      </section>
    </LegalPageLayout>
  );
}
