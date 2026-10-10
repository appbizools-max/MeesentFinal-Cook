import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Briefcase,
  Wrench,
  Store,
  Users,
  FileText,
  LayoutGrid,
  CreditCard,
  MapPin,
  Image as ImageIcon,
  Tag,
  MessageSquare,
  HelpCircle,
  Mail,
  Settings,
  ShieldCheck,
  History,
  LogOut,
  ChevronDown,
  ChevronLeft,
  Package,
  X
} from 'lucide-react';
import logoImg from '../../images/Meesent App logo .png';

export const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = localStorage.getItem('messent_admin_auth');
  const isEmployee = userRole === 'employee';

  // Track which parent dropdowns are open by item name
  const [openSections, setOpenSections] = useState({});

  const handleLogout = () => {
    localStorage.removeItem('messent_admin_auth');
    if (onClose) onClose();
    navigate('/login');
  };

  const toggleSection = (name) => {
    setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const sections = [
    {
      title: null,
      items: [
        { name: 'Dashboard', icon: Home, path: '/dashboard' },
      ]
    },
    {
      title: 'MANAGE',
      items: [
        {
          name: 'Jobs',
          icon: Briefcase,
          path: '/jobs',
          subItems: [
            { name: 'Recruitment Portal', path: '/jobs' },
            { name: 'Paid Post Jobs', path: '/jobs/paid' },
            { name: 'User Submitted Jobs', path: '/jobs/user' },
            { name: 'Open Ads', path: '/jobs/ads' },
            { name: 'Genuine Verifications', path: '/jobs/verifications' },
            ...(!isEmployee ? [{ name: 'Payments', path: '/jobs/payments' }] : []),
          ]
        },

        {
          name: 'Vendors',
          icon: Store,
          path: '/vendors',
          subItems: [
            { name: 'Manage Vendors', path: '/vendors' },
            { name: 'Leads & Guarantees', path: '/vendors/leads' },
            { name: 'Vendor Analytics & Calls', path: '/vendors/analytics' },
            ...(!isEmployee ? [{ name: 'Vendor Transactions', path: '/vendors/transactions' }] : []),
          ]
        },
        { name: 'Users', icon: Users, path: '/users' },
        { name: 'Unverified Users', icon: ShieldCheck, path: '/unverified-users' },
        ...(!isEmployee ? [{ name: 'Employees', icon: Users, path: '/employees' }] : []),
        { name: 'Categories', icon: LayoutGrid, path: '/categories' },
        { name: 'All Transactions', icon: CreditCard, path: '/service-areas' },
        { name: 'Banners', icon: ImageIcon, path: '/banners' },
        { name: 'Brand', icon: Package, path: '/brand' },
        { name: 'Subscription Pricing', icon: ShieldCheck, path: '/pricing' },
      ]
    }
  ];

  // Auto-open the section whose subItem matches current route on first render / route change
  useEffect(() => {
    sections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.subItems && item.subItems.some((sub) => location.pathname === sub.path)) {
          setOpenSections((prev) => {
            // Only set to true if not already tracked (don't override a manual close)
            if (prev[item.name] === undefined) {
              return { ...prev, [item.name]: true };
            }
            return prev;
          });
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`fixed inset-y-0 left-0 ${isCollapsed ? 'md:w-16' : 'md:w-56'} w-56 bg-[#0F1A3D] h-screen flex flex-col text-white z-[100] font-sans antialiased transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex transition-all duration-300 ease-in-out shadow-2xl md:shadow-none`}>
      {/* Brand Header */}
      <div className="p-4 pb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <img src={logoImg} alt="Meesent Logo" className="w-9 h-9 object-contain rounded-lg shadow-sm flex-shrink-0" />
          {!isCollapsed && (
            <div className="leading-tight transition-opacity duration-300">
              <span className="text-[15px] font-bold tracking-tight text-white block" style={{ fontFamily: "'Sora', sans-serif" }}>Meesent</span>
              <span className="text-[9px] font-semibold text-white/40 tracking-wide">Local Needs &amp; Jobs</span>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        <button onClick={onClose} className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 md:hidden transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        {!isCollapsed && (
          <button onClick={onToggleCollapse} className="hidden md:block p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="hidden md:flex justify-center mb-4">
          <button onClick={onToggleCollapse} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
      )}

      <nav className="flex-1 px-2.5 overflow-y-auto custom-scrollbar pb-6 scrollbar-hide">
        {sections.map((section, idx) => (
          <div key={idx} className="mb-5">
            {section.title && !isCollapsed && (
              <h3 className="px-3 text-[8.5px] font-black text-white/30 uppercase tracking-[0.2em] mb-2.5 block">
                {section.title}
              </h3>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path || (item.subItems && item.subItems.some(sub => location.pathname === sub.path));
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isDropdownOpen = !!openSections[item.name];

                return (
                  <React.Fragment key={item.name}>
                    {hasSubItems ? (
                      /* Parent with sub-items: button that toggles dropdown */
                      <button
                        onClick={() => toggleSection(item.name)}
                        className={`w-full flex items-center px-4 py-2.5 rounded-xl transition-all duration-300 group ${isCollapsed ? 'md:justify-center md:px-0' : ''} ${
                          isActive ? 'text-white bg-white/5' : 'text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                        title={isCollapsed ? item.name : undefined}
                      >
                        <item.icon className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? 'md:mr-0' : 'mr-3'} ${isActive ? 'scale-110 text-white' : 'text-white/60 group-hover:text-white'}`} />
                        <span className={`text-[12px] font-bold tracking-tight ${isCollapsed ? 'md:hidden' : 'md:inline'}`}>{item.name}</span>
                        {!isCollapsed && (
                          <div className="ml-auto">
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-white' : 'text-white/40'}`} />
                          </div>
                        )}
                      </button>
                    ) : (
                      /* Regular item: NavLink */
                      <NavLink
                        to={item.path}
                        onClick={() => { if (onClose) onClose(); }}
                        className={`flex items-center px-4 py-2.5 rounded-xl transition-all duration-300 group ${isCollapsed ? 'md:justify-center md:px-0' : ''} ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                        title={isCollapsed ? item.name : undefined}
                      >
                        <item.icon className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? 'md:mr-0' : 'mr-3'} ${isActive ? 'scale-110 text-white' : 'text-white/60 group-hover:text-white'}`} />
                        <span className={`text-[12px] font-bold tracking-tight ${isCollapsed ? 'md:hidden' : 'md:inline'}`}>{item.name}</span>
                      </NavLink>
                    )}

                    {/* Sub-item dropdown */}
                    {hasSubItems && isDropdownOpen && !isCollapsed && (
                      <div className="mt-1 ml-6 space-y-1 border-l border-white/10 pl-4">
                        {item.subItems.map((sub) => {
                          const isSubActive = location.pathname === sub.path;
                          return (
                            <NavLink
                              key={sub.name}
                              to={sub.path}
                              onClick={() => { if (onClose) onClose(); }}
                              className={`block py-2 px-3 rounded-lg text-[11px] font-bold transition-all ${
                                isSubActive ? 'text-blue-500 bg-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              {sub.name}
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout Footer */}
      <div className={`p-3.5 border-t border-white/5 bg-[#0F1A3D]/50 backdrop-blur-sm ${isCollapsed ? 'md:px-2' : ''}`}>
        <button onClick={handleLogout} className={`w-full flex items-center py-2.5 text-white/80 hover:bg-white/10 rounded-xl transition-all bg-white/5 group active:scale-95 ${isCollapsed ? 'md:justify-center md:px-0' : 'px-4'}`} title={isCollapsed ? "Logout" : undefined}>
          <LogOut className={`w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform ${isCollapsed ? 'md:mr-0' : 'mr-3'}`} />
          <span className={`font-black text-[9px] uppercase tracking-[0.15em] ${isCollapsed ? 'md:hidden' : 'md:inline'}`}>Logout</span>
        </button>
      </div>
    </div>
  );
};
