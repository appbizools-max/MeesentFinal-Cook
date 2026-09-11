import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Smartphone, Mail, CheckCircle, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

export const AccountDeletion = () => {
  const steps = [
    { num: '01', icon: Smartphone, title: 'Open the Meesent App', desc: 'Launch the Meesent app on your mobile device.' },
    { num: '02', icon: Mail, title: 'Contact Support', desc: 'Use the in-app support/chat feature, or email us at meesentonlineshoping@gmail.com.' },
    { num: '03', icon: CheckCircle, title: 'Provide Your Mobile Number', desc: 'Share the mobile number associated with your Meesent account for verification.' },
    { num: '04', icon: ShieldCheck, title: 'Verification & Processing', desc: 'Our team will verify the request and process your account deletion securely.' },
  ];

  const deletedData = [
    'User profile information',
    'Mobile number',
    'Service provider profile information',
    'Job posting information associated with the account',
    'User-uploaded images and content',
    'Chat history associated with the account where applicable',
  ];

  const retainedData = [
    'Transaction and payment records required for legal, tax, fraud prevention, or regulatory compliance purposes.',
    'Server logs retained for security purposes for a limited period.',
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#F5F7FF', color: '#111827', minHeight: '100vh' }}>

      {/* NAVBAR */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div>
              <div style={{ fontWeight: 900, color: '#b738af', fontSize: 17, lineHeight: 1.1, letterSpacing: 0.3 }}>MEESENT</div>
              <div style={{ fontSize: 9, color: '#9CA3AF', letterSpacing: 0.3 }}>Jobs · Services</div>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 13, fontWeight: 500, color: '#4B5563' }}>
            {['Jobs', 'Services', 'For Businesses', 'How It Works'].map((n) => (
              <span key={n} style={{ color: '#4B5563', cursor: 'pointer' }}>{n}</span>
            ))}
          </div>
          <a href="mailto:meesentonlineshoping@gmail.com" style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', border: '1.5px solid #FECACA', background: 'transparent', padding: '6px 18px', borderRadius: 20, textDecoration: 'none' }}>
            📧 meesentonlineshoping@gmail.com
          </a>
        </div>
      </nav>

      {/* HERO HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 50%, #FEE2E2 100%)', borderBottom: '1px solid #FECACA', padding: '56px 24px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 300, height: 300, background: 'rgba(220,38,38,0.06)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 250, height: 250, background: 'rgba(185,28,28,0.05)', borderRadius: '50%' }} />
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, position: 'relative' }}>
          <div style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, background: '#DC2626', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(220,38,38,0.3)' }}>
                <Trash2 size={24} color="#fff" />
              </div>
              <div style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: 0.5 }}>ACCOUNT MANAGEMENT</div>
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 900, color: '#111827', margin: '0 0 12px', lineHeight: 1.15, letterSpacing: -1 }}>
              Account <span style={{ color: '#DC2626' }}>Deletion</span> Request
            </h1>
            <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7, margin: 0, maxWidth: 480 }}>
              We respect your right to privacy and data control. You can request the deletion of your Meesent account and all associated personal data at any time.
            </p>
          </div>
          {/* Icon Graphic */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 160, height: 160, background: '#fff', borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 40px rgba(220,38,38,0.15)', border: '1px solid #FECACA', position: 'relative' }}>
              <Trash2 size={64} color="#DC2626" strokeWidth={1.5} />
              <div style={{ position: 'absolute', bottom: -8, right: -8, width: 36, height: 36, background: '#DC2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                <ShieldCheck size={18} color="#fff" />
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #FECACA', borderRadius: 12, padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#DC2626', textAlign: 'center' }}>
              ⏱ Processed within 90 days
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '48px 24px' }}>

        {/* HOW TO REQUEST */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ display: 'inline-block', background: '#FEE2E2', color: '#DC2626', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 20, marginBottom: 12, letterSpacing: 0.5 }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '0 0 8px' }}>How to Request Account Deletion</h2>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Follow these simple steps to request deletion of your account</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.num} style={{ background: '#fff', border: '1px solid #F3F4F6', borderRadius: 20, padding: '28px 22px', position: 'relative', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div style={{ width: 44, height: 44, background: '#FEF2F2', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={22} color="#DC2626" />
                    </div>
                    <span style={{ fontSize: 28, fontWeight: 900, color: '#FEE2E2' }}>{step.num}</span>
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>{step.title}</h3>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
                  {idx < steps.length - 1 && (
                    <div style={{ position: 'absolute', top: '50%', right: -12, width: 24, height: 2, background: '#FEE2E2', zIndex: 1 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* DATA INFO CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>

          {/* Data Deleted */}
          <div style={{ background: '#fff', border: '1px solid #DCFCE7', borderRadius: 20, padding: '28px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, background: '#DCFCE7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={22} color="#16A34A" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', letterSpacing: 0.5 }}>PERMANENTLY REMOVED</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>Data That Will Be Deleted</h3>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deletedData.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
                  <CheckCircle size={16} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Retained */}
          <div style={{ background: '#fff', border: '1px solid #FEF3C7', borderRadius: 20, padding: '28px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, background: '#FEF3C7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} color="#D97706" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', letterSpacing: 0.5 }}>TEMPORARILY RETAINED</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>Data That May Be Retained</h3>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {retainedData.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A' }}>
                  <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            {/* Processing Note */}
            <div style={{ background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={18} color="#EA580C" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
                <strong>Processing Time:</strong> Account deletion requests are typically processed within <strong>90 days</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* CONTACT CARD */}
        <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)', borderRadius: 24, padding: '40px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, boxShadow: '0 8px 40px rgba(30,58,138,0.3)' }}>
          <div>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 20, marginBottom: 14, letterSpacing: 0.5 }}>NEED HELP?</div>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>Contact Our Support Team</h3>
            <p style={{ fontSize: 13, color: '#93C5FD', margin: '0 0 24px', lineHeight: 1.6, maxWidth: 420 }}>
              Have questions about the deletion process? Our team is ready to help you through every step.
            </p>
            <a
              href="mailto:meesentonlineshoping@gmail.com"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1E3A8A', fontSize: 13, fontWeight: 700, padding: '12px 24px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
            >
              <Mail size={16} />
              meesentonlineshoping@gmail.com
            </a>
          </div>
          <div style={{ flexShrink: 0, width: 120, height: 120, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.2)' }}>
            <Mail size={52} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#111827', padding: '48px 24px 24px', marginTop: 0 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16 }}>M</div>
                <div>
                  <div style={{ fontWeight: 900, color: '#fff', fontSize: 15, letterSpacing: 0.3 }}>MEESENT</div>
                  <div style={{ fontSize: 9, color: '#4B5563' }}>Jobs · Services · Marketplace</div>
                </div>
              </div>
            </div>
            {[
              { title: 'Product', links: [{ text: 'Jobs' }, { text: 'Services' }, { text: 'For Businesses' }, { text: 'How It Works' }] },
              {
                title: 'Company',
                links: [
                  'About Us', 'Careers', 'Blog',
                  { text: 'Privacy Policy', to: '/privacy-policy' },
                  { text: 'Account Deletion', to: '/deleteaccount' },
                  { text: 'Terms & Conditions', to: '/terms-conditions' },
                ],
              },
              { title: 'Support', links: [{ text: 'Help Center' }, { text: 'Safety Center' }, { text: 'Contact Us' }] },
            ].map((col) => (
              <div key={col.title}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginBottom: 14 }}>{col.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {col.links.map((l) =>
                    l.to ? (
                      <Link key={l.text} to={l.to} style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>{l.text}</Link>
                    ) : (
                      <span key={l.text} style={{ fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>{l.text}</span>
                    )
                  )}
                </div>
              </div>
            ))}
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Follow Us</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ bg: '#1877F2', label: 'f' }, { bg: '#E1306C', label: '📷' }, { bg: '#0A66C2', label: 'in' }, { bg: '#FF0000', label: '▶' }].map((s, i) => (
                  <div key={i} style={{ width: 32, height: 32, background: s.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{s.label}</div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1F2937', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: '#4B5563' }}>© 2026 MEESENT Technology. All rights reserved.</div>
            <div style={{ fontSize: 11, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 5 }}>🌐 English ▾</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
