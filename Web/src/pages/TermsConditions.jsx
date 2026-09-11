import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle,
  User,
  Briefcase,
  Wrench,
  Building,
  AlertOctagon,
  Copyright,
  ShieldAlert,
  UserX,
  RefreshCcw,
  Mail,
  Lock,
  ChevronDown,
  ChevronUp,
  FileSignature
} from 'lucide-react';

export const TermsConditions = () => {
  const [openSection, setOpenSection] = useState('01');
  const navigate = useNavigate();

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  const terms = [
    {
      id: '01',
      title: 'Acceptance of Terms',
      icon: CheckCircle,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <p>By accessing or using MEESENT, you agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not use our platform.</p>
        </div>
      )
    },
    {
      id: '02',
      title: 'User Accounts',
      icon: User,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must be at least 18 years old to create an account</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You are responsible for maintaining the confidentiality of your account credentials</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must provide accurate and complete information when creating your account</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You are responsible for all activities that occur under your account</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must notify us immediately of any unauthorized use of your account</p>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: '03',
      title: 'Job Seeker Terms',
      icon: Briefcase,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must provide accurate and truthful information in your profile and resume</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must not misrepresent your qualifications, skills, or experience</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must respond professionally to employer communications</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must not apply for jobs you are not qualified for</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must not use the platform to harass or spam employers</p>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: '04',
      title: 'Service Provider Terms',
      icon: Wrench,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must provide accurate information about your services and qualifications</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must deliver services as described and agreed upon</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must maintain professional conduct with customers</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must not engage in fraudulent or deceptive practices</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must comply with all applicable laws and regulations</p>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: '05',
      title: 'Employer Terms',
      icon: Building,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must provide accurate job descriptions and requirements</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must not post fake or misleading job listings</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must respond to applicant communications in a timely manner</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must not discriminate based on race, gender, religion, or other protected characteristics</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>You must pay agreed compensation for services rendered</p>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: '06',
      title: 'Prohibited Activities',
      icon: AlertOctagon,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <p>You must not:</p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Use the platform for any illegal or unauthorized purpose</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Violate any applicable laws or regulations</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Infringe on the intellectual property rights of others</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Transmit viruses, malware, or harmful code</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Attempt to gain unauthorized access to our systems</p>
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 mr-2 flex-shrink-0"></span>
              <p>Interfere with or disrupt the platform's operation</p>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: '07',
      title: 'Intellectual Property',
      icon: Copyright,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <p>All content on MEESENT, including text, graphics, logos, and software, is owned by MEESENT or its licensors and is protected by copyright and other intellectual property laws.</p>
        </div>
      )
    },
    {
      id: '08',
      title: 'Limitation of Liability',
      icon: ShieldAlert,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <p>MEESENT shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount you paid, if any, for using our services.</p>
        </div>
      )
    },
    {
      id: '09',
      title: 'Termination',
      icon: UserX,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <p>We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our sole discretion.</p>
        </div>
      )
    },
    {
      id: '10',
      title: 'Changes to Terms',
      icon: RefreshCcw,
      content: (
        <div className="text-[13px] text-slate-600 space-y-4 leading-relaxed pl-2 pb-4">
          <p>We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms.</p>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 relative pb-0 font-sans selection:bg-blue-100 overflow-hidden">
      {/* Background gradients for Glassmorphism effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-blue-400/10 blur-[100px]"></div>
        <div className="absolute top-[20%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-purple-400/10 blur-[120px]"></div>
        <div className="absolute -bottom-[20%] left-[10%] w-[80vw] h-[80vw] rounded-full bg-emerald-300/10 blur-[120px]"></div>
      </div>
      
      {/* ─── NAVBAR ─── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255, 255, 255, 0.5)", boxShadow: "0 4px 30px rgba(0,0,0,0.03)" }}>
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
      <div className="relative overflow-hidden pt-12 pb-16 px-6 sm:px-12 lg:px-24 flex flex-col md:flex-row items-center justify-between">
        <div className="max-w-2xl z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center bg-blue-600 text-white w-10 h-10 rounded-xl font-bold text-xl">
              M
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-wider">MEESENT</h1>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">Terms & Conditions</h2>
          <h3 className="text-xl font-bold text-blue-600 mb-6">Rules & Guidelines for using MEESENT.</h3>

          <p className="text-sm text-slate-600 leading-relaxed max-w-lg font-medium">
            By accessing or using the MEESENT App (Jobs & Services), you agree to be bound by these Terms & Conditions.
            If you do not agree, please do not use our platform.
          </p>
        </div>

        {/* Shield Graphic */}
        <div className="hidden md:flex relative w-64 h-64 items-center justify-center z-10 mr-10 mt-10 md:mt-0">
          <div className="absolute inset-0 bg-blue-100 rounded-full opacity-60 blur-2xl"></div>
          <div className="relative w-48 h-56 bg-gradient-to-b from-blue-400 to-blue-600 rounded-b-[100px] shadow-2xl flex items-center justify-center border-4 border-white">
            <FileSignature className="w-16 h-16 text-white" />
            <div className="absolute -bottom-4 -right-4 bg-blue-500 rounded-full p-2 border-4 border-white shadow-lg">
              <CheckCircle className="w-6 h-6 text-white" />
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
      <div className="container mx-auto relative z-10">
        <div className="row mx-auto px-6 sm:px-12 mt-4 space-y-4 bg-white/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {terms.map((term) => {
            const isOpen = openSection === term.id;
            const Icon = term.icon;

            return (
              <div
                key={term.id}
                className={`border transition-all duration-300 rounded-2xl overflow-hidden ${isOpen ? 'border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white/80 backdrop-blur-md' : 'border-white/40 bg-white/30 backdrop-blur-sm hover:bg-white/50 hover:border-white/60 hover:shadow-sm'
                  }`}
              >
                <button
                  onClick={() => toggleSection(term.id)}
                  className="w-full flex items-center justify-between p-5 md:p-6 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors ${isOpen ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-blue-50 text-blue-600'}`}>
                      <Icon strokeWidth={2.5} size={22} />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-blue-600 font-bold text-lg">{term.id}</span>
                      <span className="font-bold text-slate-800 text-[15px]">{term.title}</span>
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
                  {term.content}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Static Contact Us Section */}
      <div className="container mx-auto px-6 sm:px-12 mt-10 mb-10 relative z-10">
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center">
          <div className="w-16 h-16 bg-blue-50/50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-black text-slate-900 mb-2">Contact Us</h4>
            <p className="text-sm text-slate-600 font-medium mb-4">If you have any questions about these Terms & Conditions, please contact us at:</p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400">@</span>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</div>
                  <a href="mailto:legal@meesent.com" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">legal@meesent.com</a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400">📍</span>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Address</div>
                  <div className="text-sm font-bold text-slate-700">Hyderabad, Telangana, India</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Last Updated Box */}
      <div className="container mx-auto px-6 sm:px-12 mt-6 relative z-10">
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-blue-600 font-bold text-sm mb-1">Last Updated: May 30, 2026</h4>
            <p className="text-slate-500 text-xs font-medium">By using the MEESENT App, you agree to the Terms & Conditions outlined above.</p>
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
              { title: "Company", links: ["About Us", "Careers", "Blog", { text: "Privacy Policy", to: "/privacy-policy" }, { text: "Terms & Conditions", to: "/terms-conditions" }] },
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
