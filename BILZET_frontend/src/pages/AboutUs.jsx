import LegalPageLayout from "../components/common/LegalPageLayout";

export default function AboutUs() {
  return (
    <LegalPageLayout title="About Us">
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">Who We Are</h2>
        <p>
          <strong>BILZET</strong> (a product of <strong>Garden Greens Private Limited</strong>) is an
          all-in-one GST Billing, POS, Inventory, and Business Management platform built for Indian
          retailers, wholesalers, and growing multi-store businesses.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">Our Mission</h2>
        <p>
          Our mission is to simplify daily billing, GST compliance, stock control, and customer khata
          management into one fast, reliable, and easy-to-use workspace so business owners can focus on
          serving customers and scaling operations.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">What BILZET Offers</h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Fast GST-compliant POS invoicing with A4, A5, and thermal (80mm / 58mm) print &amp; PDF export</li>
          <li>Real-time inventory, multi-warehouse stock transfers, and purchase management</li>
          <li>Customer credit (Khata), quotations, sales returns, and WhatsApp invoice sharing</li>
          <li>GSTR-1 / GSTR-3B export packs and CA Connect auditor collaboration</li>
          <li>Role-based team access control and multi-store switching</li>
        </ul>
      </section>
    </LegalPageLayout>
  );
}
