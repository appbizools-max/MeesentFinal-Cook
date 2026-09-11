import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { ArrowUpRight, ArrowDownRight, CreditCard, ShieldCheck, Gem, Wallet } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export const Revenue = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    planRevenue: 0,
    registrationRevenue: 0,
    topVendors: []
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vendors'), (snapshot) => {
      const vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let planRev = 0;
      let regRev = 0;
      
      vendors.forEach(v => {
        // Calculate subscription revenue
        if (v.plan === 'big') planRev += 799;
        if (v.plan === 'small') planRev += 499;
        
        // Calculate registration revenue (assuming verified vendors paid 199)
        if (v.isVerified || v.verificationPaid) regRev += 199;
      });

      // Sort vendors by revenue field (if available) or leads
      const top = [...vendors]
        .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
        .slice(0, 5);

      setStats({
        totalRevenue: planRev + regRev,
        planRevenue: planRev,
        registrationRevenue: regRev,
        topVendors: top
      });
    });

    return () => unsub();
  }, []);

  const summaryCards = [
    { name: 'Total Gross Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, change: '+14%', trend: 'up', icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Subscription Earnings', value: `₹${stats.planRevenue.toLocaleString()}`, change: '+12%', trend: 'up', icon: Gem, color: 'text-purple-600', bg: 'bg-purple-50' },
    { name: 'Registration Fees', value: `₹${stats.registrationRevenue.toLocaleString()}`, change: '+8%', trend: 'up', icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <Layout title="Financial Analytics">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {summaryCards.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center">
            <div className={`p-4 rounded-xl ${stat.bg} mr-5`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.name}</p>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
                <div className={`flex items-center text-xs font-bold ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {stat.change}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900">Revenue by Vendor</h3>
            <button className="text-sm text-primary font-bold">View All</button>
          </div>
          <div className="space-y-4">
            {stats.topVendors.map((vendor) => (
              <div key={vendor.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm text-primary font-bold overflow-hidden">
                    {vendor.businessImage ? <img src={vendor.businessImage} alt={vendor.businessName} className="w-full h-full object-cover" /> : vendor.businessName.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-bold text-gray-900">{vendor.businessName}</div>
                    <div className="text-xs text-gray-500">{vendor.plan?.toUpperCase() || 'NO'} PLAN</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-gray-900">₹{(vendor.revenue || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-green-600 font-bold uppercase tracking-tighter">Verified</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6">Recent Transactions</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mr-4">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">Payout to Vendor #{i * 123}</div>
                    <div className="text-xs text-gray-500">24 Oct 2026, 14:30</div>
                  </div>
                </div>
                <div className="text-sm font-bold text-red-600">-₹4,500</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};
