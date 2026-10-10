import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { 
  Phone, 
  Search, 
  Building2, 
  CheckCircle2, 
  ShieldCheck, 
  Gift, 
  Sparkles, 
  Calendar, 
  Clock, 
  History, 
  Layers, 
  Info, 
  X,
  Eye,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

export const VendorLeadsTransfer = () => {
  const [vendors, setVendors] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'all-vendors' | 'extended-clients'
  const [activeTab, setActiveTab] = useState('all-vendors');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'extended' | 'protected' | 'delivered' | 'free'

  // Selected vendor for viewing extension history modal
  const [selectedHistoryVendor, setSelectedHistoryVendor] = useState(null);

  useEffect(() => {
    // Auth Check
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      const localAuth = localStorage.getItem('messent_admin_auth');
      if (!user && !localAuth) {
        toast.error('Access Denied: Please log in.');
        window.location.href = '/login';
      }
    });

    // 1. Real-time listener for Vendors
    const unsubVendors = onSnapshot(collection(db, 'vendors'), (snapshot) => {
      const vList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setVendors(vList);
    }, (err) => {
      console.error('Error fetching vendors:', err);
    });

    // 2. Real-time listener for Leads
    const qLeads = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubLeads = onSnapshot(qLeads, (snapshot) => {
      const lList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setLeads(lList);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching leads:', err);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubVendors();
      unsubLeads();
    };
  }, []);

  // Classify lead types cleanly
  const getLeadKind = (lead) => {
    if (lead.type === 'call' || lead.hasCalled) return 'call';
    if (lead.type === 'whatsapp' || lead.hasWhatsApp) return 'whatsapp';
    return 'visit';
  };

  // Helper to calculate guarantee progress & plan dates for any vendor
  const getVendorDetails = (vendor) => {
    const rawPlan = String(vendor.planId || vendor.plan || vendor.planType || '').toLowerCase();
    const isBig = rawPlan.includes('big') || rawPlan.includes('popular') || rawPlan.includes('growth') || rawPlan.includes('premium');
    const isSmall = rawPlan.includes('small') || rawPlan.includes('starter') || rawPlan.includes('active') || rawPlan.includes('smart');
    const isPaid = isBig || isSmall || (vendor.plan && vendor.plan !== 'none' && vendor.plan !== 'free');

    let planLabel = 'FREE / BASIC';
    let planBadgeClass = 'bg-gray-100 text-gray-700 border-gray-200';
    if (isBig) {
      planLabel = vendor.planName || 'BIG PLAN (PREMIUM)';
      planBadgeClass = 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
    } else if (isSmall) {
      planLabel = vendor.planName || 'SMALL PLAN (SMART)';
      planBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
    } else if (isPaid) {
      planLabel = String(vendor.planName || vendor.plan).toUpperCase();
      planBadgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold';
    }

    // 1. Plan Start Date
    let startDate = null;
    const rawStart = vendor.planStartDate || vendor.paymentDate || vendor.createdAt;
    if (rawStart) {
      try {
        const d = rawStart?.toDate ? rawStart.toDate() : new Date(rawStart);
        if (!isNaN(d.getTime())) startDate = d;
      } catch {}
    }

    // 2. Plan End Date / Expiry
    let endDate = null;
    const rawEnd = vendor.planExpiry || vendor.currentPeriodEnd || vendor.planEndDate || vendor.expiryDate;
    if (rawEnd) {
      try {
        const d = rawEnd?.toDate ? rawEnd.toDate() : new Date(rawEnd);
        if (!isNaN(d.getTime())) endDate = d;
      } catch {}
    }

    // Fallback: If startDate exists and duration is set
    if (!endDate && startDate && isPaid) {
      const months = vendor.planDurationMonths || vendor.billingCycleMonths || 1;
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + parseInt(months, 10));
      endDate = d;
    }

    // 3. Last Extension Date
    let lastExtensionDate = null;
    if (vendor.lastExtensionDate || vendor.lastExtendedAt) {
      try {
        const rawExt = vendor.lastExtensionDate || vendor.lastExtendedAt;
        const d = rawExt?.toDate ? rawExt.toDate() : new Date(rawExt);
        if (!isNaN(d.getTime())) lastExtensionDate = d;
      } catch {}
    }

    // 4. Count Leads (Visits, Calls, WhatsApp)
    const vLeads = leads.filter(l => l.vendorId === vendor.id);

    let visits = 0;
    let calls = 0;
    let whatsapp = 0;

    vLeads.forEach(l => {
      let leadTime = 0;
      if (l.createdAt) {
        try {
          leadTime = new Date(l.createdAt).getTime();
        } catch {}
      }

      // Check if lead falls within cycle
      let inCycle = true;
      if (startDate && leadTime && leadTime < startDate.getTime()) inCycle = false;
      if (endDate && leadTime && leadTime > endDate.getTime()) inCycle = false;

      if (inCycle) {
        const kind = getLeadKind(l);
        if (kind === 'call') calls++;
        else if (kind === 'whatsapp') whatsapp++;
        else visits++;
      }
    });

    // Minimum Guarantee: visits >= 5 OR calls >= 1 OR whatsapp >= 1
    const isFulfilled = visits >= 5 || calls >= 1 || whatsapp >= 1;
    const extensionTimes = vendor.extensionCount || (vendor.isExtended ? 1 : 0);
    const isExtended = !!(vendor.isExtended || extensionTimes > 0 || vendor.status === 'extended');

    let guaranteeStatus = 'NOT_APPLICABLE';
    if (isPaid) {
      if (isExtended) {
        guaranteeStatus = 'EXTENDED';
      } else if (isFulfilled) {
        guaranteeStatus = 'DELIVERED';
      } else {
        guaranteeStatus = 'PROTECTED';
      }
    }

    return {
      isPaid,
      isBig,
      isSmall,
      planLabel,
      planBadgeClass,
      startDate,
      endDate,
      lastExtensionDate,
      visits,
      calls,
      whatsapp,
      isFulfilled,
      isExtended,
      extensionTimes,
      totalMonthsExtended: extensionTimes,
      guaranteeNotice: vendor.guaranteeNotice || (isExtended ? 'Extended by +1 Month for FREE under Minimum Business Guarantee' : ''),
      extensionHistory: Array.isArray(vendor.extensionHistory) ? vendor.extensionHistory : [],
      guaranteeStatus
    };
  };

  // Enriched Vendors
  const enrichedVendors = vendors.map(v => ({
    ...v,
    computed: getVendorDetails(v)
  }));

  // Filtered Vendors for Tab 1 (All Vendors)
  const filteredAllVendors = enrichedVendors.filter(v => {
    const c = v.computed;

    // Filter by Status
    if (statusFilter === 'paid' && !c.isPaid) return false;
    if (statusFilter === 'free' && c.isPaid) return false;
    if (statusFilter === 'extended' && !c.isExtended) return false;
    if (statusFilter === 'protected' && c.guaranteeStatus !== 'PROTECTED') return false;
    if (statusFilter === 'delivered' && c.guaranteeStatus !== 'DELIVERED') return false;

    // Global Search: Business Name, Phone, Category, Owner Name
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = v.businessName && v.businessName.toLowerCase().includes(q);
      const matchOwner = v.ownerName && v.ownerName.toLowerCase().includes(q);
      const matchPhone = (v.phone && v.phone.includes(q)) || 
                         (v.phoneNumber && v.phoneNumber.includes(q)) || 
                         (v.mobile && v.mobile.includes(q));
      const matchCat = v.category && (
        Array.isArray(v.category) 
          ? v.category.some(cat => cat.toLowerCase().includes(q))
          : String(v.category).toLowerCase().includes(q)
      );

      if (!matchName && !matchOwner && !matchPhone && !matchCat) return false;
    }

    return true;
  });

  // Filtered Extended Clients for Tab 2
  const extendedClientsList = enrichedVendors
    .filter(v => v.computed.isExtended)
    .filter(v => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = v.businessName && v.businessName.toLowerCase().includes(q);
        const matchOwner = v.ownerName && v.ownerName.toLowerCase().includes(q);
        const matchPhone = (v.phone && v.phone.includes(q)) || 
                           (v.phoneNumber && v.phoneNumber.includes(q)) || 
                           (v.mobile && v.mobile.includes(q));
        const matchCat = v.category && (
          Array.isArray(v.category) 
            ? v.category.some(cat => cat.toLowerCase().includes(q))
            : String(v.category).toLowerCase().includes(q)
        );

        if (!matchName && !matchOwner && !matchPhone && !matchCat) return false;
      }
      return true;
    });

  // Metric KPI Counts
  const totalVendorsCount = vendors.length;
  const paidVendorsCount = enrichedVendors.filter(v => v.computed.isPaid).length;
  const targetMetCount = enrichedVendors.filter(v => v.computed.guaranteeStatus === 'DELIVERED').length;
  const protectedCount = enrichedVendors.filter(v => v.computed.guaranteeStatus === 'PROTECTED').length;
  const extendedVendorsCount = enrichedVendors.filter(v => v.computed.isExtended).length;
  const totalExtendedMonths = enrichedVendors.reduce((sum, v) => sum + (v.computed.extensionTimes || 0), 0);

  const formatDateDisplay = (dateObj) => {
    if (!dateObj) return 'N/A';
    try {
      const d = dateObj?.toDate ? dateObj.toDate() : new Date(dateObj);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDateTimeDisplay = (raw) => {
    if (!raw) return 'N/A';
    try {
      const d = raw?.toDate ? raw.toDate() : new Date(raw);
      if (isNaN(d.getTime())) return String(raw);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(raw);
    }
  };

  return (
    <Layout title="Vendor Leads & Business Guarantees">
      <div className="space-y-6">

        {/* 1. Top Header Banner */}
        <div className="bg-gradient-to-r from-[#0F1A3D] via-[#1a2d6b] to-[#0035a0] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                Automatic Minimum Business Guarantee System
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
              Vendor Leads &amp; Plan Guarantees
            </h1>
            <p className="text-white/70 text-sm mt-1 max-w-2xl leading-relaxed">
              Track vendor profiles, active plans, start and expiry dates, and live enquiries (<strong>Visits: 5</strong>, <strong>Calls: 1</strong>, <strong>WhatsApp: 1</strong>). If minimum business is not met by expiry, plans are <strong>automatically extended +1 Month for FREE</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 p-3.5 rounded-xl backdrop-blur-sm border border-white/10 flex-shrink-0">
            <div className="text-right">
              <span className="text-xs text-blue-200 block uppercase font-bold tracking-wider">Extended Clients</span>
              <span className="text-xl font-black text-amber-300 flex items-center justify-end gap-1.5">
                <Gift className="w-5 h-5 text-amber-300" />
                {extendedVendorsCount} Businesses
              </span>
              <span className="text-[10px] text-white/60 block mt-0.5">+{totalExtendedMonths} Free Months Granted Automatically</span>
            </div>
          </div>
        </div>

        {/* 2. Top Metric KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Total Vendors */}
          <div 
            onClick={() => { setActiveTab('all-vendors'); setStatusFilter('all'); }}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'all-vendors' && statusFilter === 'all'
                ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-500/20 shadow-md' 
                : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-bold uppercase">Total Vendors</span>
              <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">{totalVendorsCount}</div>
            <span className="text-[11px] text-gray-500 mt-1 block">All registered businesses</span>
          </div>

          {/* Paid Plan Vendors */}
          <div 
            onClick={() => { setActiveTab('all-vendors'); setStatusFilter('paid'); }}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'all-vendors' && statusFilter === 'paid'
                ? 'bg-purple-50/60 border-purple-400 ring-2 ring-purple-500/20 shadow-md' 
                : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-purple-700 font-bold uppercase">Paid Plans</span>
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">{paidVendorsCount}</div>
            <span className="text-[11px] font-semibold text-purple-600 mt-1 block">Premium &amp; Smart plans</span>
          </div>

          {/* In Progress / Protected */}
          <div 
            onClick={() => { setActiveTab('all-vendors'); setStatusFilter('protected'); }}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'all-vendors' && statusFilter === 'protected'
                ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-500/20 shadow-md' 
                : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-blue-700 font-bold uppercase">Protected</span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">{protectedCount}</div>
            <span className="text-[11px] font-semibold text-blue-600 mt-1 block">Cycle ongoing / active</span>
          </div>

          {/* Target Met */}
          <div 
            onClick={() => { setActiveTab('all-vendors'); setStatusFilter('delivered'); }}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'all-vendors' && statusFilter === 'delivered'
                ? 'bg-green-50/60 border-green-400 ring-2 ring-green-500/20 shadow-md' 
                : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-green-700 font-bold uppercase">Target Met</span>
              <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">{targetMetCount}</div>
            <span className="text-[11px] font-semibold text-green-600 mt-1 block">Min business delivered</span>
          </div>

          {/* Auto-Extended Tab Quick-Launch */}
          <div 
            onClick={() => setActiveTab('extended-clients')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'extended-clients'
                ? 'bg-amber-100/70 border-amber-500 ring-2 ring-amber-500/30 shadow-md' 
                : 'bg-amber-50/50 border-amber-200 hover:border-amber-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-amber-800 font-black uppercase flex items-center gap-1">
                Extended Clients
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center">
                <Gift className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-900">{extendedVendorsCount}</div>
            <span className="text-[11px] font-bold text-amber-700 mt-1 block">+{totalExtendedMonths} Mo Free Granted ➔</span>
          </div>
        </div>

        {/* 3. Main Data Container with Dual Tab Switcher */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Top Control Bar: Tab Switcher & Filter Controls */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            
            {/* The 2 Primary Tabs: All Vendors vs Extended Clients */}
            <div className="flex bg-gray-200/80 p-1 rounded-xl gap-1">
              <button
                onClick={() => setActiveTab('all-vendors')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'all-vendors'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers className="w-4 h-4 text-blue-600" />
                All Vendors &amp; Guarantees ({totalVendorsCount})
              </button>

              <button
                onClick={() => setActiveTab('extended-clients')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'extended-clients'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-amber-900 hover:bg-amber-100'
                }`}
              >
                <Gift className="w-4 h-4" />
                Extended Clients Section ({extendedVendorsCount})
              </button>
            </div>

            {/* Search Box & Quick Status Filter */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              
              {/* Search Input */}
              <div className="relative flex-1 lg:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search business, owner, phone, category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>

              {/* Status Filter Dropdown (shown on All Vendors tab) */}
              {activeTab === 'all-vendors' && (
                <div className="w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">All Statuses ({totalVendorsCount})</option>
                    <option value="paid">Paid Plans Only ({paidVendorsCount})</option>
                    <option value="protected">In Progress 🛡️ (Protected)</option>
                    <option value="delivered">Target Met ✅ (Delivered)</option>
                    <option value="extended">Extended 🎁 (+1 Mo Free)</option>
                    <option value="free">Free Plans</option>
                  </select>
                </div>
              )}

            </div>
          </div>

          {/* TAB 1: ALL VENDORS & GUARANTEES TABLE */}
          {activeTab === 'all-vendors' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100/70 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    <th className="px-5 py-3.5">Vendor Profile</th>
                    <th className="px-5 py-3.5">Active Plan</th>
                    <th className="px-5 py-3.5">Start Date</th>
                    <th className="px-5 py-3.5">End / Expiry Date</th>
                    <th className="px-5 py-3.5 text-center">Visits (5)</th>
                    <th className="px-5 py-3.5 text-center">Calls (1)</th>
                    <th className="px-5 py-3.5 text-center">WhatsApp (1)</th>
                    <th className="px-5 py-3.5">Guarantee Status</th>
                    <th className="px-5 py-3.5 text-right">Plan Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="px-5 py-12 text-center text-gray-500">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading vendors and guarantee metrics...
                      </td>
                    </tr>
                  ) : filteredAllVendors.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-5 py-12 text-center text-gray-500">
                        <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        No vendors found matching your filter or search.
                      </td>
                    </tr>
                  ) : (
                    filteredAllVendors.map((vendor) => {
                      const c = vendor.computed;
                      const phone = vendor.phone || vendor.phoneNumber || vendor.mobile || vendor.contactPhone || 'N/A';
                      const categoryText = Array.isArray(vendor.category) ? vendor.category.join(', ') : (vendor.category || 'General');

                      return (
                        <tr key={vendor.id} className="hover:bg-gray-50/80 transition-colors">
                          
                          {/* 1. Vendor Profile */}
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                              {vendor.businessName || 'Business Name'}
                              {c.isExtended && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                                  +{c.extensionTimes} Mo Ext
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {vendor.ownerName ? <span className="font-medium text-gray-700">{vendor.ownerName} • </span> : null}
                              <span className="text-gray-500">{categoryText}</span>
                            </div>
                            <div className="text-xs font-mono text-gray-700 mt-1">
                              {phone !== 'N/A' ? (
                                <a href={`tel:${phone}`} className="hover:text-blue-600">
                                  📞 {phone}
                                </a>
                              ) : (
                                <span className="text-gray-400">No Phone</span>
                              )}
                            </div>
                          </td>

                          {/* 2. Active Plan */}
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border ${c.planBadgeClass}`}>
                              <Sparkles className="w-3 h-3" />
                              {c.planLabel}
                            </span>
                            {vendor.planDurationMonths && (
                              <div className="text-[11px] text-gray-500 mt-1">
                                Duration: {vendor.planDurationMonths} Month{vendor.planDurationMonths > 1 ? 's' : ''}
                              </div>
                            )}
                          </td>

                          {/* 3. Start Date */}
                          <td className="px-5 py-3.5 text-xs text-gray-700">
                            {c.startDate ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span className="font-semibold">{formatDateDisplay(c.startDate)}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>

                          {/* 4. End / Expiry Date */}
                          <td className="px-5 py-3.5 text-xs">
                            {c.endDate ? (
                              <div>
                                <div className="font-bold text-gray-900 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                                  {formatDateDisplay(c.endDate)}
                                </div>
                                {c.extensionTimes > 0 && (
                                  <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                                    Extended +{c.extensionTimes} Month{c.extensionTimes > 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500 font-medium">Lifetime / Free</span>
                            )}
                          </td>

                          {/* 5. Profile Visits (Target: 5) */}
                          <td className="px-5 py-3.5 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className={`text-sm font-black ${c.visits >= 5 ? 'text-green-600' : 'text-gray-800'}`}>
                                {c.visits} <span className="text-xs font-normal text-gray-500">/ 5</span>
                              </span>
                              <div className="w-14 bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className={`h-full ${c.visits >= 5 ? 'bg-green-500' : 'bg-indigo-500'}`}
                                  style={{ width: `${Math.min(100, (c.visits / 5) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 6. Calls (Target: 1) */}
                          <td className="px-5 py-3.5 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className={`text-sm font-black ${c.calls >= 1 ? 'text-green-600' : 'text-gray-800'}`}>
                                {c.calls} <span className="text-xs font-normal text-gray-500">/ 1</span>
                              </span>
                              <div className="w-14 bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className={`h-full ${c.calls >= 1 ? 'bg-green-500' : 'bg-green-600'}`}
                                  style={{ width: `${Math.min(100, c.calls * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 7. WhatsApp (Target: 1) */}
                          <td className="px-5 py-3.5 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className={`text-sm font-black ${c.whatsapp >= 1 ? 'text-green-600' : 'text-gray-800'}`}>
                                {c.whatsapp} <span className="text-xs font-normal text-gray-500">/ 1</span>
                              </span>
                              <div className="w-14 bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className={`h-full ${c.whatsapp >= 1 ? 'bg-green-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(100, c.whatsapp * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 8. Guarantee Status */}
                          <td className="px-5 py-3.5">
                            {c.guaranteeStatus === 'EXTENDED' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Gift className="w-3.5 h-3.5 text-amber-600" />
                                EXTENDED 🎁 (+{c.extensionTimes} Mo)
                              </span>
                            ) : c.guaranteeStatus === 'DELIVERED' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                TARGET MET ✅
                              </span>
                            ) : c.guaranteeStatus === 'PROTECTED' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                IN PROGRESS 🛡️
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                Free Plan
                              </span>
                            )}
                            {c.isPaid && !c.isFulfilled && !c.isExtended && (
                              <div className="text-[10px] text-blue-600 font-semibold mt-1">
                                Auto-extends if unmet by expiry
                              </div>
                            )}
                          </td>

                          {/* 9. Plan Status (Pure Status Badge, No Manual Button) */}
                          <td className="px-5 py-3.5 text-right">
                            {c.isExtended ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                                <Gift className="w-3.5 h-3.5 text-amber-600" />
                                EXTENDED
                              </span>
                            ) : c.isPaid ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-green-100 text-green-800 border border-green-300 shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                ACTIVE
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                FREE
                              </span>
                            )}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: EXTENDED CLIENTS AUDIT & COMPLETE HISTORY TABLE */}
          {activeTab === 'extended-clients' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-amber-50/80 border-b border-amber-200 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                    <th className="px-5 py-3.5">Extended Client Profile</th>
                    <th className="px-5 py-3.5">Plan Type</th>
                    <th className="px-5 py-3.5 text-center">Times Extended</th>
                    <th className="px-5 py-3.5 text-center">Total Free Months</th>
                    <th className="px-5 py-3.5">Current Expiry Date</th>
                    <th className="px-5 py-3.5">Last Extended On</th>
                    <th className="px-5 py-3.5">Guarantee Trigger / Status</th>
                    <th className="px-5 py-3.5 text-right">Status &amp; Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-5 py-12 text-center text-gray-500">
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading extended clients audit data...
                      </td>
                    </tr>
                  ) : extendedClientsList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-5 py-12 text-center text-gray-500">
                        <Gift className="w-10 h-10 text-amber-300 mx-auto mb-2" />
                        <span className="font-bold text-gray-800 block text-sm">No Extended Clients Found</span>
                        <span className="text-xs text-gray-500">When vendors on paid plans do not receive minimum business, their free extensions automatically appear here.</span>
                      </td>
                    </tr>
                  ) : (
                    extendedClientsList.map((vendor) => {
                      const c = vendor.computed;
                      const phone = vendor.phone || vendor.phoneNumber || vendor.mobile || vendor.contactPhone || 'N/A';
                      const categoryText = Array.isArray(vendor.category) ? vendor.category.join(', ') : (vendor.category || 'General');

                      return (
                        <tr key={vendor.id} className="hover:bg-amber-50/40 transition-colors">
                          
                          {/* Client Profile */}
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                              {vendor.businessName || 'Business Name'}
                              <span className="bg-amber-100 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-amber-300">
                                Extended Client
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {vendor.ownerName ? <span className="font-medium text-gray-700">{vendor.ownerName} • </span> : null}
                              <span className="text-gray-500">{categoryText}</span>
                            </div>
                            <div className="text-xs font-mono text-gray-700 mt-1">
                              📞 {phone}
                            </div>
                          </td>

                          {/* Plan Type */}
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border ${c.planBadgeClass}`}>
                              <Sparkles className="w-3 h-3" />
                              {c.planLabel}
                            </span>
                            <div className="text-[11px] text-gray-500 mt-1">
                              Started: {formatDateDisplay(c.startDate)}
                            </div>
                          </td>

                          {/* How Many Times Extended */}
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                              {c.extensionTimes} Time{c.extensionTimes > 1 ? 's' : ''}
                            </span>
                          </td>

                          {/* Total Free Months */}
                          <td className="px-5 py-3.5 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-sm font-black text-amber-900">
                                +{c.totalMonthsExtended} Month{c.totalMonthsExtended > 1 ? 's' : ''} Free
                              </span>
                              <span className="text-[10px] text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-200 mt-0.5">
                                ₹0 Cost
                              </span>
                            </div>
                          </td>

                          {/* Current Expiry Date */}
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-gray-900 text-xs flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              {formatDateDisplay(c.endDate)}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              Active cycle extended
                            </div>
                          </td>

                          {/* Last Extended On */}
                          <td className="px-5 py-3.5 text-xs text-gray-700">
                            {c.lastExtensionDate ? (
                              <div className="flex items-center gap-1 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                {formatDateTimeDisplay(c.lastExtensionDate)}
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>

                          {/* Guarantee Status / Current Leads in Extension */}
                          <td className="px-5 py-3.5">
                            <div className="text-xs font-semibold text-gray-800">
                              Cycle Enquiries:
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] font-bold">
                              <span className={`px-1.5 py-0.5 rounded ${c.visits >= 5 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                                👁️ {c.visits}/5
                              </span>
                              <span className={`px-1.5 py-0.5 rounded ${c.calls >= 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                                📞 {c.calls}/1
                              </span>
                              <span className={`px-1.5 py-0.5 rounded ${c.whatsapp >= 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                                💬 {c.whatsapp}/1
                              </span>
                            </div>
                            <div className="text-[10px] text-amber-800 font-bold mt-1">
                              {c.isFulfilled ? 'Target Achieved in Extension ✅' : 'Cycle Protected 🛡️'}
                            </div>
                          </td>

                          {/* Status & Audit Info (No Manual Buttons) */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                                <Gift className="w-3 h-3 text-amber-600" />
                                EXTENDED
                              </span>
                              <button
                                onClick={() => setSelectedHistoryVendor(vendor)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-200"
                                title="View Complete Extension Audit History"
                              >
                                <Info className="w-3.5 h-3.5 text-blue-600" />
                                Audit Info
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-2">
            <div>
              Showing {activeTab === 'all-vendors' ? filteredAllVendors.length : extendedClientsList.length} of {activeTab === 'all-vendors' ? totalVendorsCount : extendedVendorsCount} entries
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-indigo-700 font-semibold">
                <Eye className="w-3.5 h-3.5" /> Target: 5 Profile Visits
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-green-700 font-semibold">
                <Phone className="w-3.5 h-3.5" /> Target: 1 Direct Call
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <MessageSquare className="w-3.5 h-3.5" /> Target: 1 WhatsApp
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-700 font-semibold">
                <Gift className="w-3.5 h-3.5" /> Auto-extends +1 Month Free if Unmet
              </span>
            </div>
          </div>

        </div>

        {/* 4. Complete Extended Client Audit & History Modal */}
        {selectedHistoryVendor && (
          <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Extension Audit: {selectedHistoryVendor.businessName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Automatic guarantee records and free extension details
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedHistoryVendor(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3 my-4">
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Total Extensions</span>
                  <div className="text-xl font-black text-amber-900 mt-0.5">
                    {selectedHistoryVendor.computed.extensionTimes} Times
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700">
                    +{selectedHistoryVendor.computed.totalMonthsExtended} Month{selectedHistoryVendor.computed.totalMonthsExtended > 1 ? 's' : ''} Free (Auto-Applied)
                  </span>
                </div>

                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                  <span className="text-[10px] uppercase font-bold text-blue-800 block">Current Expiry Date</span>
                  <div className="text-base font-black text-blue-900 mt-1">
                    {formatDateDisplay(selectedHistoryVendor.computed.endDate)}
                  </div>
                  <span className="text-[11px] font-semibold text-blue-700">
                    Plan: {selectedHistoryVendor.computed.planLabel}
                  </span>
                </div>
              </div>

              {/* Extension Log Entries */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block">
                  Extension History Logs
                </span>

                {selectedHistoryVendor.computed.extensionHistory && selectedHistoryVendor.computed.extensionHistory.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedHistoryVendor.computed.extensionHistory.map((item, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                        <div className="flex items-center justify-between font-bold text-gray-800">
                          <span className="flex items-center gap-1 text-amber-700">
                            <Gift className="w-3.5 h-3.5" /> Extension #{idx + 1} (+{item.monthsAdded || 1} Mo Free)
                          </span>
                          <span className="text-[10px] font-normal text-gray-500">
                            {formatDateTimeDisplay(item.extendedAt)}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-600 mt-1">
                          {item.reason || 'Auto-extended under Minimum Business Guarantee'}
                        </div>
                        {item.newExpiry && (
                          <div className="text-[10px] text-gray-500 mt-1 font-mono">
                            New Expiry: {formatDateDisplay(item.newExpiry)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                      <Gift className="w-4 h-4" />
                      Free 1-Month Extension Active (Automated)
                    </div>
                    <div>
                      <strong>Last Extended On:</strong> {formatDateTimeDisplay(selectedHistoryVendor.computed.lastExtensionDate || selectedHistoryVendor.computed.endDate)}
                    </div>
                    <div>
                      <strong>Automatic Policy:</strong> Vendor did not receive minimum business (5 visits, 1 call, or 1 WhatsApp) during cycle, so plan auto-extended for free.
                    </div>
                    <div className="text-gray-500 italic text-[11px] mt-1">
                      {selectedHistoryVendor.computed.guaranteeNotice}
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setSelectedHistoryVendor(null)}
                  className="px-5 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default VendorLeadsTransfer;
