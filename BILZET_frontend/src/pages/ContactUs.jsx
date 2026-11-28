import LegalPageLayout from "../components/common/LegalPageLayout";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function ContactUs() {
  return (
    <LegalPageLayout title="Contact Us">
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#111318]">Get in Touch</h2>
        <p>
          Have questions about BILZET subscriptions, billing features, GST exports, or account support?
          Our team is here to help you.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="p-4 rounded-2xl border border-[#E7E8EC] bg-[#FAFAFB] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#111318] uppercase tracking-wider">
            <Mail size={14} />
            <span>Email Support</span>
          </div>
          <p className="text-sm font-semibold text-[#111318]">contact@bilzet.com</p>
          <p className="text-xs text-[#7C7F8A]">For billing, refunds, and technical assistance</p>
        </div>

        <div className="p-4 rounded-2xl border border-[#E7E8EC] bg-[#FAFAFB] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#111318] uppercase tracking-wider">
            <Phone size={14} />
            <span>Phone / WhatsApp</span>
          </div>
          <p className="text-sm font-semibold text-[#111318]">+91 88254 54486</p>
          <p className="text-xs text-[#7C7F8A]">Monday – Saturday, 9:30 AM – 6:30 PM IST</p>
        </div>

        <div className="p-4 rounded-2xl border border-[#E7E8EC] bg-[#FAFAFB] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#111318] uppercase tracking-wider">
            <MapPin size={14} />
            <span>Registered Business</span>
          </div>
          <p className="text-sm font-semibold text-[#111318]">Garden Greens Private Limited</p>
          <p className="text-xs text-[#7C7F8A]">Tamil Nadu, India</p>
        </div>

        <div className="p-4 rounded-2xl border border-[#E7E8EC] bg-[#FAFAFB] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#111318] uppercase tracking-wider">
            <Clock size={14} />
            <span>Response Time</span>
          </div>
          <p className="text-sm font-semibold text-[#111318]">Within 24 Business Hours</p>
          <p className="text-xs text-[#7C7F8A]">Priority response for Pro &amp; Premium plans</p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
