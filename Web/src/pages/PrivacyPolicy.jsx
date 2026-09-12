import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Settings,
  Users,
  ShieldCheck,
  UserCheck,
  Clock,
  CreditCard,
  FileText,
  Mail,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const PrivacyPolicy = () => {
  const [openSection, setOpenSection] = useState('01');

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  const policies = [
    {
      id: '01',
      title: 'Information We Collect',
      icon: User,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <p>We collect the following types of information:</p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p><strong>Personal Information:</strong> Name, phone number, email address, and profile photo when you create an account.</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p><strong>Location Data:</strong> Precise or approximate location to show nearby job opportunities and service providers in Meesent Jobs and Meesent Services/Mart.</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p><strong>Device Information:</strong> Mobile device model, operating system, IP address, and app version for security and debugging.</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p><strong>Usage Data:</strong> Information about how you use the App, including services viewed, bookings made, and time spent.</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p><strong>Communications:</strong> Chats and bookings on the App are not end-to-end encrypted. We may access this data for safety, fraud prevention, and quality control.</p>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: '02',
      title: 'How We Use Your Information',
      icon: Settings,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Provide, operate, and maintain the App and its features.</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Connect users with relevant employers, job seekers, and service providers.</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Improve, personalize, and expand our App.</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Communicate with you for service updates, booking confirmations, and promotional offers.</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Prevent fraudulent activity, spam, and ensure the security of our platform.</p>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: '03',
      title: 'How We Share Your Information',
      icon: Users,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p><strong>With Service Providers:</strong> When you contact or book a job/service, we share your name, contact number, and location with that third-party provider to facilitate the service.</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p><strong>For Legal Reasons:</strong> We may disclose your information if required by law, court order, or government request.</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p><strong>Business Transfers:</strong> In case of a merger or acquisition, user information may be transferred.</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p><strong>We Do Not Sell Data:</strong> We do not sell your personal information to third-party advertisers or data brokers.</p>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: '04',
      title: 'Data Security',
      icon: ShieldCheck,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <p>We implement reasonable technical and organizational measures to protect your data. However, no electronic transmission or storage is 100% secure. You provide information at your own risk.</p>
        </div>
      )
    },
    {
      id: '05',
      title: 'Your Data Rights',
      icon: UserCheck,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <ul className="space-y-3 mb-4">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Access your personal data.</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Request correction of inaccurate data.</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Request deletion of your account and associated data.</p>
            </li>
          </ul>
          <p>To exercise these rights, contact us at: <a href="mailto:meesentonlineshoping@gmail.com" className="text-blue-600 font-bold hover:underline">meesentonlineshoping@gmail.com</a></p>
        </div>
      )
    },
    {
      id: '06',
      title: 'Data Retention',
      icon: Clock,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <p>We retain your information for as long as your account is active or as needed to provide services. If you delete your account, we will delete or anonymize your data within 90 days, except where we are required to retain it for legal compliance.</p>
        </div>
      )
    },
    {
      id: '07',
      title: "Children's Privacy",
      icon: Users,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <p>MEESENT is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we learn we have collected data from a child, we will delete it.</p>
        </div>
      )
    },
    {
      id: '08',
      title: 'Third-Party Payment Gateways',
      icon: CreditCard,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <p>If you make payments through the App, they are processed by third-party payment providers like Razorpay or Stripe. We do not store your full card details on our servers.</p>
        </div>
      )
    },
    {
      id: '09',
      title: 'Changes to This Privacy Policy',
      icon: FileText,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <p>We may update this Privacy Policy from time to time. The updated version will be posted on the App with a new "Last Updated" date. Your continued use of the App constitutes acceptance of the changes.</p>
        </div>
      )
    },
    {
      id: '10',
      title: 'Contact Us',
      icon: Mail,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <p>If you have questions about this Privacy Policy, please contact us:</p>
          <p className="font-medium">Email: <a href="mailto:meesentonlineshoping@gmail.com" className="text-blue-600 font-bold hover:underline">meesentonlineshoping@gmail.com</a></p>
        </div>
      )
    },
  ];

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white pb-0 font-sans selection:bg-blue-100">
      
      {/* ─── NAVBAR ─── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "#fff", borderBottom: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 20, justifyContent: "space-between" }}>
          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, textDecoration: "none" }}>
            <div>
              <div style={{ fontWeight: 900, color: "#b738af", fontSize: 17, lineHeight: 1.1, letterSpacing: 0.3 }}>MEESENT</div>
              <div style={{ fontSize: 9, color: "#9CA3AF", letterSpacing: 0.3 }}>Jobs · Services </div>
            </div>
          </Link>

          {/* Nav Links */}
          <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 13, fontWeight: 500, color: "#4B5563" }}>
            {["Jobs", "Services", "For Businesses", "How It Works"].map((n) => (
              <a key={n} href="#" style={{ color: "#4B5563", textDecoration: "none" }}>{n}</a>
            ))}
          </div>

          {/* Auth */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <a href="tel:+919876543210" style={{ fontSize: 13, fontWeight: 600, color: "#2563EB", border: "1.5px solid #BFDBFE", background: "transparent", padding: "6px 18px", borderRadius: 20, textDecoration: "none" }}>📞 Support: +91 98765 43210</a>
          </div>
        </div>
      </nav>

      {/* Header Section */}
      <div className="relative bg-[#f8fafc] overflow-hidden border-b border-slate-100 pt-12 pb-16 px-6 sm:px-12 lg:px-24 flex flex-col md:flex-row items-center justify-between">
        {/* Background Decorative Blur */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>

        <div className="max-w-2xl z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center bg-blue-600 text-white w-10 h-10 rounded-xl font-bold text-xl">
              M
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-wider">MEESENT</h1>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">Privacy Policy</h2>
          <h3 className="text-xl font-bold text-blue-600 mb-6">Your Privacy. Our Responsibility.</h3>

          <p className="text-sm text-slate-600 leading-relaxed max-w-lg font-medium">
            This Privacy Policy explains how we collect, use, share, and protect your information
            when you use the MEESENT App (Meesent Jobs, Meesent Services/Mart).
          </p>
        </div>

        {/* Shield Graphic */}
        <div className="hidden md:flex relative w-64 h-64 items-center justify-center z-10 mr-10 mt-10 md:mt-0">
          <div className="absolute inset-0 bg-blue-100 rounded-full opacity-60 blur-2xl"></div>
          <div className="relative w-48 h-56 bg-gradient-to-b from-blue-400 to-blue-600 rounded-b-[100px] shadow-2xl flex items-center justify-center border-4 border-white">
            <Lock className="w-16 h-16 text-white" />
            <div className="absolute -bottom-4 -right-4 bg-blue-500 rounded-full p-2 border-4 border-white shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="absolute -left-16 top-1/2 -translate-y-1/2 flex flex-col gap-3 -z-10 opacity-30">
            <div className="w-24 h-3 bg-slate-300 rounded-full"></div>
            <div className="w-32 h-3 bg-slate-300 rounded-full"></div>
            <div className="w-20 h-3 bg-slate-300 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Accordion Content */}
      <div className="container mx-auto">
        <div className="row mx-auto px-6 sm:px-12 mt-12 space-y-4 bg-white/50 p-4 rounded-3xl border border-slate-50 shadow-sm">
          {policies.map((policy) => {
            const isOpen = openSection === policy.id;
            const Icon = policy.icon;

            return (
              <div
                key={policy.id}
                className={`border transition-all duration-300 rounded-2xl overflow-hidden ${isOpen ? 'border-blue-100 shadow-xl shadow-blue-50/50 bg-white' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                  }`}
              >
                <button
                  onClick={() => toggleSection(policy.id)}
                  className="w-full flex items-center justify-between p-5 md:p-6 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors ${isOpen ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-blue-50 text-blue-600'}`}>
                      <Icon strokeWidth={2.5} size={22} />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-blue-600 font-bold text-lg">{policy.id}</span>
                      <span className="font-bold text-slate-800 text-[15px]">{policy.title}</span>
                    </div>
                  </div>
                  <div className="text-slate-400 mr-2 flex-shrink-0">
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {/* Expandable Content Area */}
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out px-5 md:px-[88px] ${isOpen ? 'max-h-[1000px] opacity-100 mb-6' : 'max-h-0 opacity-0'
                    }`}
                >
                  {policy.content}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer / Last Updated Box */}
      <div className="max-w-4xl mx-auto px-6 sm:px-12 mt-10">
        <div className="bg-[#f8fafc] border border-slate-100 rounded-2xl p-6 flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-200">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-blue-600 font-bold text-sm mb-1">Last Updated: 20 May 2024</h4>
            <p className="text-slate-500 text-xs font-medium">By using the MEESENT App, you agree to the terms of this Privacy Policy.</p>
          </div>
        </div>
      </div>

      {/* Secured Payments Razorpay text */}
      <div className="flex flex-col items-center justify-center mt-12 mb-12 gap-1 opacity-70">
        <span className="text-[10px] font-bold text-slate-500 tracking-wider">Secured Payments</span>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          Powered by <span className="font-bold text-slate-800 tracking-tight text-sm flex items-center italic">Razorpay</span>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: "#111827", padding: "48px 24px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.4fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, background: "#2563EB", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16 }}>M</div>
                <div>
                  <div style={{ fontWeight: 900, color: "#fff", fontSize: 15, letterSpacing: 0.3 }}>MEESENT</div>
                  <div style={{ fontSize: 9, color: "#4B5563" }}>Jobs · Services · Marketplace</div>
                </div>
              </div>
            </div>

            {/* Columns */}
            {[
              { title: "Product", links: ["Jobs", "Services", "For Businesses", "How It Works"] },
              { title: "Company", links: ["About Us", "Careers", "Blog", { text: "Privacy Policy", to: "/privacy-policy" }, { text: "Account Deletion", to: "/deleteaccount" }, { text: "Terms & Conditions", to: "/terms-conditions" }] },
              { title: "Support", links: ["Help Center", "Safety Center", "Contact Us"] },
            ].map((col) => (
              <div key={col.title}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 14 }}>{col.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.links.map((l) => (
                    typeof l === 'string' ? (
                      <a key={l} href="#" style={{ fontSize: 12, color: "#6B7280", textDecoration: "none" }}>{l}</a>
                    ) : (
                      <Link key={l.text} to={l.to} style={{ fontSize: 12, color: "#6B7280", textDecoration: "none" }}>{l.text}</Link>
                    )
                  ))}
                </div>
              </div>
            ))}

            {/* Social */}
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Follow Us</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { bg: "#1877F2", label: "f" },
                  { bg: "#E1306C", label: "📷" },
                  { bg: "#0A66C2", label: "in" },
                  { bg: "#FF0000", label: "▶" },
                ].map((s, i) => (
                  <div key={i} style={{ width: 32, height: 32, background: s.bg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{s.label}</div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #1F2937", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "#4B5563" }}>© 2026 MEESENT Technology. All rights reserved.</div>
            <div style={{ fontSize: 11, color: "#4B5563", display: "flex", alignItems: "center", gap: 5 }}>🌐 English ▾</div>
          </div>
        </div>
      </footer>

    </div>
  );
};
