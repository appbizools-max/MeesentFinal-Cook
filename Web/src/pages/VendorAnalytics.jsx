import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { 
  Phone, 
  MessageSquare, 
  Eye, 
  Search, 
  BarChart2,
  PhoneCall,
  Sparkles,
  ArrowUpDown,
  Zap,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

export const VendorAnalytics = () => {
  const [vendors, setVendors] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('total'); // 'total', 'calls', 'whatsapp', 'views', 'name'
  const [timeRange, setTimeRange] = useState('this_month'); // Default: This Month!
  const [selectedVendorForLeads, setSelectedVendorForLeads] = useState(null);
  const [showLeadModal, setShowLeadModal] = useState(false);

  useEffect(() => {
    // Auth Check
    const checkRole = onAuthStateChanged(auth, async (user) => {
      const localAuth = localStorage.getItem('messent_admin_auth');
      if (!user && !localAuth) {
        toast.error("Access Denied: Please log in.");
        window.location.href = '/login';
      }
    });

    // Realtime Vendors Listener
    const unsubVendors = onSnapshot(collection(db, 'vendors'), (snapshot) => {
      const vList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVendors(vList);
      setLoading(false);
    });

    // Realtime Leads Listener
    const unsubLeads = onSnapshot(query(collection(db, 'leads'), orderBy('createdAt', 'desc')), (snapshot) => {
      const lList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLeads(lList);
    }, (err) => {
      console.log("Error reading leads listener:", err);
    });

    return () => {
      checkRole();
      unsubVendors();
      unsubLeads();
    };
  }, []);

  // Helper to check if vendor was registered on or before the selected timeframe
  const wasVendorRegisteredInTimeRange = (vendor, range) => {
    if (range === 'all') return true;
    if (!vendor.createdAt) return true;

    try {
      const regDate = new Date(vendor.createdAt.toDate ? vendor.createdAt.toDate() : vendor.createdAt);
      if (isNaN(regDate.getTime())) return true;

      const now = new Date();
      let endDate = now;

      if (range === 'this_month') {
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (range === 'last_month') {
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      } else if (range === 'month_before_last') {
        endDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
      } else if (range === '3_months_ago') {
        endDate = new Date(now.getFullYear(), now.getMonth() - 2, 0, 23, 59, 59);
      } else if (range === '4_months_ago') {
        endDate = new Date(now.getFullYear(), now.getMonth() - 3, 0, 23, 59, 59);
      }

      // If vendor was registered AFTER the end of that month, they did NOT exist yet in that timeframe
      if (regDate > endDate) return false;

      return true;
    } catch (_) {
      return true;
    }
  };

  // Helper function to check if lead falls within selected time range
  const isLeadInTimeRange = (lead, range) => {
    if (range === 'all') return true;
    if (!lead.createdAt) return true;

    try {
      const leadDate = new Date(lead.createdAt.toDate ? lead.createdAt.toDate() : lead.createdAt);
      if (isNaN(leadDate.getTime())) return true;

      const now = new Date();

      if (range === 'this_month') {
        return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
      }

      if (range === 'last_month') {
        const target = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const start = new Date(target.getFullYear(), target.getMonth(), 1);
        const end = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59);
        return leadDate >= start && leadDate <= end;
      }

      if (range === 'month_before_last') {
        const target = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const start = new Date(target.getFullYear(), target.getMonth(), 1);
        const end = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59);
        return leadDate >= start && leadDate <= end;
      }

      if (range === '3_months_ago') {
        const target = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const start = new Date(target.getFullYear(), target.getMonth(), 1);
        const end = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59);
        return leadDate >= start && leadDate <= end;
      }

      if (range === '4_months_ago') {
        const target = new Date(now.getFullYear(), now.getMonth() - 4, 1);
        const start = new Date(target.getFullYear(), target.getMonth(), 1);
        const end = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59);
        return leadDate >= start && leadDate <= end;
      }

      let days = 30;
      if (range === '1_month') days = 30;
      else if (range === '2_months') days = 60;
      else if (range === '3_months') days = 90;
      else if (range === '4_months') days = 120;

      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return leadDate >= cutoff;
    } catch (_) {
      return true;
    }
  };

  // Leads filtered by active timeRange selection
  const filteredLeadsByTime = leads.filter(l => isLeadInTimeRange(l, timeRange));

  // Vendors registered on or before the selected timeframe
  const activeVendorsForTimeRange = vendors.filter(v => wasVendorRegisteredInTimeRange(v, timeRange));

  // Helper to get computed counts combining vendor doc counters and filtered leads
  const getVendorMetrics = (vendor) => {
    const vLeads = filteredLeadsByTime.filter(l => l.vendorId === vendor.id);
    const callCountFromLeads = vLeads.filter(l => l.type === 'call').length;
    const whatsappCountFromLeads = vLeads.filter(l => l.type === 'whatsapp').length;
    const viewCountFromLeads = vLeads.filter(l => l.type === 'view').length;

    let calls = callCountFromLeads;
    let whatsapp = whatsappCountFromLeads;
    let views = viewCountFromLeads;

    // If "All Time" is selected, fallback to historical document counters if higher
    if (timeRange === 'all') {
      calls = Math.max(vendor.callsCount || vendor.calls || 0, callCountFromLeads);
      whatsapp = Math.max(vendor.whatsappCount || vendor.whatsapp || vendor.whatsappClicks || 0, whatsappCountFromLeads);
      views = Math.max(vendor.viewsCount || vendor.views || 0, viewCountFromLeads);
    }

    const totalEngagement = calls + whatsapp + views;

    return { calls, whatsapp, views, totalEngagement, leadCount: vLeads.length, vendorLeads: vLeads };
  };

  // Compute total aggregate stats across active vendors for active timeRange
  const totalVendors = activeVendorsForTimeRange.length;
  const totalCalls = activeVendorsForTimeRange.reduce((acc, v) => acc + getVendorMetrics(v).calls, 0);
  const totalWhatsapp = activeVendorsForTimeRange.reduce((acc, v) => acc + getVendorMetrics(v).whatsapp, 0);
  const totalViews = activeVendorsForTimeRange.reduce((acc, v) => acc + getVendorMetrics(v).views, 0);
  const totalEngagementOverall = totalCalls + totalWhatsapp + totalViews;

  // Filter & Sort Vendors
  const filteredVendors = activeVendorsForTimeRange
    .filter(v => {
      const term = searchTerm.toLowerCase();
      const bName = (v.businessName || '').toLowerCase();
      const oName = (v.ownerName || '').toLowerCase();
      const phone = (v.phone || v.phoneNumber || '').toLowerCase();
      const cat = (v.subCategory || v.category || '').toString().toLowerCase();
      return bName.includes(term) || oName.includes(term) || phone.includes(term) || cat.includes(term);
    })
    .sort((a, b) => {
      const mA = getVendorMetrics(a);
      const mB = getVendorMetrics(b);
      if (sortBy === 'total') return mB.totalEngagement - mA.totalEngagement;
      if (sortBy === 'calls') return mB.calls - mA.calls;
      if (sortBy === 'whatsapp') return mB.whatsapp - mA.whatsapp;
      if (sortBy === 'views') return mB.views - mA.views;
      return (a.businessName || '').localeCompare(b.businessName || '');
    });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return 'N/A';
    }
  };

  const getTimeRangeLabel = (range) => {
    const now = new Date();
    const getMonthName = (monthOffset) => {
      const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    };

    switch (range) {
      case 'this_month': return `This Month (${getMonthName(0)})`;
      case 'last_month': return `Last Month (${getMonthName(1)})`;
      case 'month_before_last': return `Month Before Last (${getMonthName(2)})`;
      case '3_months_ago': return `3 Months Ago (${getMonthName(3)})`;
      case '4_months_ago': return `4 Months Ago (${getMonthName(4)})`;
      case '1_month': return 'Last 30 Days';
      case '2_months': return 'Last 60 Days (2 Months)';
      case '3_months': return 'Last 90 Days (3 Months)';
      case '4_months': return 'Last 120 Days (4 Months)';
      default: return 'All Time';
    }
  };

  return (
    <Layout title="Vendor Analytics & Call Tracking">
      <div className="space-y-6">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 backdrop-blur-md rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider mb-3 border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5" /> Realtime Vendor Performance
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Vendor Analytics ({getTimeRangeLabel(timeRange)})</h1>
            <p className="text-blue-200 text-sm mt-1 max-w-xl">
              Track Calls Initiated + WhatsApp Clicks + Profile Visits per vendor registered during or before the selected timeframe.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-center">
              <p className="text-xs text-blue-200 font-medium">Registered Vendors</p>
              <p className="text-2xl font-black">{totalVendors}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-center">
              <p className="text-xs text-blue-200 font-medium">Total Score</p>
              <p className="text-2xl font-black text-amber-400">{totalEngagementOverall}</p>
            </div>
          </div>
        </div>

        {/* Time Range Filter Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-2">
              <Calendar className="w-4 h-4 text-blue-600" /> Timeframe:
            </span>

            {[
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'month_before_last', label: 'Month Before Last' },
              { id: '3_months_ago', label: '3 Months Ago' },
              { id: '4_months_ago', label: '4 Months Ago' },
              { id: '1_month', label: 'Last 30 Days' },
              { id: '2_months', label: 'Last 60 Days' },
              { id: 'all', label: 'All Time' },
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setTimeRange(btn.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  timeRange === btn.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            Active Filter: <span className="font-bold text-blue-600">{getTimeRangeLabel(timeRange)}</span>
          </div>
        </div>

        {/* Aggregate KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-blue-50 rounded-2xl text-blue-600">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Calls Initiated</p>
              <h3 className="text-2xl font-black text-slate-800">{totalCalls}</h3>
              <p className="text-[11px] text-blue-600 font-medium mt-0.5">{getTimeRangeLabel(timeRange)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-green-50 rounded-2xl text-green-600">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">WhatsApp Clicks</p>
              <h3 className="text-2xl font-black text-slate-800">{totalWhatsapp}</h3>
              <p className="text-[11px] text-green-600 font-medium mt-0.5">{getTimeRangeLabel(timeRange)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-purple-50 rounded-2xl text-purple-600">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profile Visits</p>
              <h3 className="text-2xl font-black text-slate-800">{totalViews}</h3>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5">{getTimeRangeLabel(timeRange)}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-md flex items-center gap-4">
            <div className="p-3.5 bg-white/20 backdrop-blur-sm rounded-2xl text-white">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-100 uppercase tracking-wider">Combined Score</p>
              <h3 className="text-2xl font-black">{totalEngagementOverall}</h3>
              <p className="text-[11px] text-amber-100 font-medium mt-0.5">Calls + WA + Visits</p>
            </div>
          </div>
        </div>

        {/* Search & Sort Controls Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor by business name, owner name, phone or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort By:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer w-full md:w-auto"
            >
              <option value="total">🔥 Highest Total (Calls + WA + Visits)</option>
              <option value="calls">Most Calls Initiated</option>
              <option value="whatsapp">Most WhatsApp Clicks</option>
              <option value="views">Most Profile Visits</option>
              <option value="name">Business Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Vendor Performance Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Vendor / Business</th>
                  <th className="p-4">Category / Niche</th>
                  <th className="p-4 text-center">Calls Initiated</th>
                  <th className="p-4 text-center">WhatsApp Clicks</th>
                  <th className="p-4 text-center">Profile Visits</th>
                  <th className="p-4 text-center">Total Score ({getTimeRangeLabel(timeRange)})</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">
                      Loading vendor analytics...
                    </td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">
                      No registered vendors matching criteria for {getTimeRangeLabel(timeRange)}.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor) => {
                    const metrics = getVendorMetrics(vendor);
                    const isTopPerformer = metrics.totalEngagement >= 5;

                    return (
                      <tr key={vendor.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-blue-600 text-sm flex-shrink-0 overflow-hidden">
                              {vendor.logo || vendor.image ? (
                                <img src={vendor.logo || vendor.image} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (vendor.businessName || 'B').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{vendor.businessName || 'Unnamed Business'}</span>
                                {isTopPerformer && (
                                  <span className="bg-amber-50 text-amber-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                                    ★ Top Engaged
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 font-medium">
                                {vendor.ownerName ? `Owner: ${vendor.ownerName} • ` : ''}{vendor.phone || vendor.phoneNumber || 'No phone'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600">
                            {vendor.subCategory || vendor.category || 'General'}
                          </span>
                        </td>

                        {/* Calls Badge */}
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${
                            metrics.calls > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-400'
                          }`}>
                            <Phone className="w-3.5 h-3.5" />
                            {metrics.calls} Calls
                          </span>
                        </td>

                        {/* WhatsApp Badge */}
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${
                            metrics.whatsapp > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-400'
                          }`}>
                            <MessageSquare className="w-3.5 h-3.5" />
                            {metrics.whatsapp} Chats
                          </span>
                        </td>

                        {/* Views Badge */}
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${
                            metrics.views > 0 ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-50 text-slate-400'
                          }`}>
                            <Eye className="w-3.5 h-3.5" />
                            {metrics.views} Visits
                          </span>
                        </td>

                        {/* Total Combined Score Badge */}
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black ${
                            metrics.totalEngagement > 0 
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-200' 
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            <Zap className="w-3.5 h-3.5" />
                            {metrics.totalEngagement} Total
                          </span>
                        </td>

                        {/* View Leads Modal Button */}
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedVendorForLeads(vendor);
                              setShowLeadModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-200"
                          >
                            <BarChart2 className="w-3.5 h-3.5" /> Lead History
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Leads Logs Modal */}
        {showLeadModal && selectedVendorForLeads && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Lead Activity Logs: {selectedVendorForLeads.businessName} ({getTimeRangeLabel(timeRange)})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Phone: {selectedVendorForLeads.phone || selectedVendorForLeads.phoneNumber || 'N/A'} • Category: {selectedVendorForLeads.subCategory || selectedVendorForLeads.category}
                  </p>
                </div>
                <button
                  onClick={() => setShowLeadModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-500 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {(() => {
                  const vendorLeads = filteredLeadsByTime.filter(l => l.vendorId === selectedVendorForLeads.id);
                  if (vendorLeads.length === 0) {
                    return (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <PhoneCall className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-600">No logs recorded for {getTimeRangeLabel(timeRange)}.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {vendorLeads.map((lead) => (
                        <div key={lead.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl ${
                              lead.type === 'call' ? 'bg-blue-100 text-blue-700' : lead.type === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {lead.type === 'call' ? <Phone className="w-5 h-5" /> : lead.type === 'whatsapp' ? <MessageSquare className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{lead.userName || 'Customer'}</p>
                              <p className="text-xs text-slate-500 font-medium">{lead.userPhone || 'No contact saved'}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              lead.type === 'call' ? 'bg-blue-50 text-blue-700' : lead.type === 'whatsapp' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'
                            }`}>
                              {lead.type === 'call' ? 'Phone Call' : lead.type === 'whatsapp' ? 'WhatsApp Chat' : 'Profile Visit'}
                            </span>
                            <p className="text-[11px] text-slate-400 font-medium mt-1">
                              {formatDate(lead.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setShowLeadModal(false)}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold transition-all"
                >
                  Close Log
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
