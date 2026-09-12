import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Save, RefreshCcw, ShieldCheck, Crown, Zap, IndianRupee, Megaphone, UserCheck, Award } from 'lucide-react';
import toast from 'react-hot-toast';

export const PricingSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState({
    verification: 199,
    servicesVerification: 199,
    jobsVerification: 99,
    pincodeAdPrice: 99,
    servicesPincodeAdWeekly: 29,
    servicesPincodeAdMonthly: 99,
    jobsPincodeAdWeekly: 29,
    jobsPincodeAdMonthly: 99,
    jobSeekerWeeklyPassPrice: 9,
    jobSeekerMonthlyPassPrice: 29,
    jobSeekerYearlyPassPrice: 199,
    jobSeekerPass: {
      weekly: 9,
      monthly: 29,
      yearly: 199
    },
    bigPlan: {
      monthly: 799,
      sixMonths: 4599,
      yearly: 9199
    },
    smallPlan: {
      monthly: 499,
      sixMonths: 2899,
      yearly: 5699
    }
  });

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'config', 'service_pricing'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPricing({
          ...data,
          jobSeekerWeeklyPassPrice: data.jobSeekerWeeklyPassPrice ?? data.jobSeekerPass?.weekly ?? 9,
          jobSeekerMonthlyPassPrice: data.jobSeekerMonthlyPassPrice ?? data.jobSeekerPass?.monthly ?? 29,
          jobSeekerYearlyPassPrice: data.jobSeekerYearlyPassPrice ?? data.jobSeekerPass?.yearly ?? 199,
          jobSeekerPass: {
            weekly: data.jobSeekerWeeklyPassPrice ?? data.jobSeekerPass?.weekly ?? 9,
            monthly: data.jobSeekerMonthlyPassPrice ?? data.jobSeekerPass?.monthly ?? 29,
            yearly: data.jobSeekerYearlyPassPrice ?? data.jobSeekerPass?.yearly ?? 199,
          }
        });
        setLoading(false);
        return;
      }
    } catch (error) {
      console.warn('Client getDoc for pricing restricted, fetching via server API...', error);
    }

    try {
      const res = await fetch('http://localhost:5000/api/pricing');
      const resData = await res.json();
      if (resData.success && resData.pricing) {
        const data = resData.pricing;
        setPricing({
          ...data,
          jobSeekerWeeklyPassPrice: data.jobSeekerWeeklyPassPrice ?? data.jobSeekerPass?.weekly ?? 9,
          jobSeekerMonthlyPassPrice: data.jobSeekerMonthlyPassPrice ?? data.jobSeekerPass?.monthly ?? 29,
          jobSeekerYearlyPassPrice: data.jobSeekerYearlyPassPrice ?? data.jobSeekerPass?.yearly ?? 199,
          jobSeekerPass: {
            weekly: data.jobSeekerWeeklyPassPrice ?? data.jobSeekerPass?.weekly ?? 9,
            monthly: data.jobSeekerMonthlyPassPrice ?? data.jobSeekerPass?.monthly ?? 29,
            yearly: data.jobSeekerYearlyPassPrice ?? data.jobSeekerPass?.yearly ?? 199,
          }
        });
      }
    } catch (apiError) {
      console.error('Failed to load pricing from API:', apiError);
      toast.error('Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    let saved = false;

    // Ensure sync between flat keys and nested jobSeekerPass object
    const payload = {
      ...pricing,
      jobSeekerPass: {
        weekly: pricing.jobSeekerWeeklyPassPrice ?? 9,
        monthly: pricing.jobSeekerMonthlyPassPrice ?? 29,
        yearly: pricing.jobSeekerYearlyPassPrice ?? 199,
      }
    };

    // 1. Try direct Firestore write
    try {
      await setDoc(doc(db, 'config', 'service_pricing'), payload, { merge: true });
      toast.success('Pricing Configuration Saved & Synced Live!');
      saved = true;
    } catch (fsErr) {
      console.warn('Direct Firestore write restricted/failed, trying backend server API...', fsErr);
    }

    // 2. Fallback to server API if direct write failed
    if (!saved) {
      try {
        const response = await fetch('http://localhost:5000/api/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const resData = await response.json();
        if (resData.success) {
          toast.success('Pricing Configuration Saved via Server!');
          saved = true;
        } else {
          throw new Error(resData.error || 'Server save failed');
        }
      } catch (backendErr) {
        console.error('Backend pricing API error:', backendErr);
        toast.error(`Failed to save pricing: ${backendErr?.message || 'Check server connection'}`);
      }
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <Layout title="Pricing Settings">
        <div className="flex items-center justify-center h-[70vh]">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin border-t-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-primary animate-pulse" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const InputField = ({ label, value, onChange, highlight = false }) => (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative group w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
          <span className={`font-black text-sm ${highlight ? 'text-primary' : 'text-slate-400 group-focus-within:text-slate-700'}`}>₹</span>
        </div>
        <input 
          type="number"
          value={value}
          onChange={onChange}
          className={`w-full pl-9 pr-4 py-3.5 bg-slate-50/80 border-2 ${highlight ? 'border-primary/20 focus:border-primary focus:bg-white' : 'border-slate-200 focus:border-slate-400 focus:bg-white'} rounded-2xl focus:ring-0 transition-all font-black text-slate-800 outline-none text-base shadow-inner`}
        />
      </div>
    </div>
  );

  return (
    <Layout title="Subscription & Pricing Control">
      <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gradient-to-r from-primary/10 via-purple-50 to-transparent p-6 rounded-3xl border border-primary/10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Revenue & Pricing Configuration</h1>
            <p className="text-slate-500 font-medium mt-1">Manage global pricing tiers, verification fees, and job seeker passes across Meesent.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-primary active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-slate-900/10 cursor-pointer"
          >
            {saving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{saving ? 'Syncing...' : 'Save & Publish'}</span>
          </button>
        </div>

        {/* SERVICES SECTION CONFIGURATION */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-8 bg-blue-600 rounded-full"></div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Services Module Configuration</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business Verification & Local Ads Rate</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="p-8 flex flex-col gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20 shrink-0">
                    <ShieldCheck className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Services Lifetime Verification</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5 uppercase tracking-wider">One-Time Onboarding Fee</p>
                  </div>
                </div>
                <div>
                  <InputField 
                    label="Services Verification Fee" 
                    value={pricing.servicesVerification ?? pricing.verification ?? 199} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPricing({...pricing, servicesVerification: val, verification: val});
                    }}
                    highlight={true}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="p-8 flex flex-col gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                    <Megaphone className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Services Targeted Ads Rate</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5 uppercase tracking-wider">Rate Per Pincode</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField 
                    label="Weekly Rate (₹/pincode/wk)" 
                    value={pricing.servicesPincodeAdWeekly ?? 29} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPricing({...pricing, servicesPincodeAdWeekly: val});
                    }}
                    highlight={true}
                  />
                  <InputField 
                    label="Monthly Rate (₹/pincode/mo)" 
                    value={pricing.servicesPincodeAdMonthly ?? pricing.servicesPincodeAdPrice ?? pricing.pincodeAdPrice ?? 99} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPricing({...pricing, servicesPincodeAdMonthly: val, servicesPincodeAdPrice: val, pincodeAdPrice: val});
                    }}
                    highlight={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* JOBS MODULE CONFIGURATION */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-8 bg-purple-600 rounded-full"></div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Jobs Module Configuration</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate Verification, Premium Passes & Job Ads Rate</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Jobs Seeker Verification */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden relative flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="p-7 flex flex-col gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                    <ShieldCheck className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Jobs Candidate Verification</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5 uppercase tracking-wider">Genuine Candidate Badge</p>
                  </div>
                </div>
                <div>
                  <InputField 
                    label="Jobs Verification Fee" 
                    value={pricing.jobsVerification ?? 99} 
                    onChange={(e) => setPricing({...pricing, jobsVerification: parseInt(e.target.value) || 0})}
                    highlight={true}
                  />
                </div>
              </div>
            </div>

            {/* Jobs Premium Job Seeker Pass Pricing Controls */}
            <div className="bg-white rounded-[32px] border-2 border-amber-400/40 shadow-md shadow-amber-500/5 overflow-hidden relative flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="p-7 flex flex-col gap-5 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
                    <Crown className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Premium Job Seeker Pass</h3>
                    <p className="text-xs font-bold text-amber-600 mt-0.5 uppercase tracking-wider bg-amber-50 inline-block px-2 py-0.5 rounded-full border border-amber-200/60">Seeker Upgrade Tiers</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3">
                  <InputField 
                    label="Weekly Pass (₹)" 
                    value={pricing.jobSeekerWeeklyPassPrice ?? 9} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPricing({
                        ...pricing, 
                        jobSeekerWeeklyPassPrice: val,
                        jobSeekerPass: { ...pricing.jobSeekerPass, weekly: val }
                      });
                    }}
                    highlight={true}
                  />
                  <InputField 
                    label="Monthly Pass (₹)" 
                    value={pricing.jobSeekerMonthlyPassPrice ?? 29} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPricing({
                        ...pricing, 
                        jobSeekerMonthlyPassPrice: val,
                        jobSeekerPass: { ...pricing.jobSeekerPass, monthly: val }
                      });
                    }}
                    highlight={true}
                  />
                  <InputField 
                    label="Annual Pass (₹)" 
                    value={pricing.jobSeekerYearlyPassPrice ?? 199} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPricing({
                        ...pricing, 
                        jobSeekerYearlyPassPrice: val,
                        jobSeekerPass: { ...pricing.jobSeekerPass, yearly: val }
                      });
                    }}
                    highlight={true}
                  />
                </div>
              </div>
            </div>

            {/* Jobs Targeted Ads Rate */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden relative flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="p-7 flex flex-col gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                    <Megaphone className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Jobs Targeted Ads Rate</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5 uppercase tracking-wider">Rate Per Pincode</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField 
                    label="Weekly Rate (₹/wk)" 
                    value={pricing.jobsPincodeAdWeekly ?? 29} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPricing({...pricing, jobsPincodeAdWeekly: val});
                    }}
                    highlight={true}
                  />
                  <InputField 
                    label="Monthly Rate (₹/mo)" 
                    value={pricing.jobsPincodeAdMonthly ?? pricing.jobsPincodeAdPrice ?? 99} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPricing({...pricing, jobsPincodeAdMonthly: val, jobsPincodeAdPrice: val});
                    }}
                    highlight={true}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* VENDOR SUBSCRIPTION PLANS CONFIGURATION */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-8 bg-indigo-600 rounded-full"></div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Vendor Subscription Tier Plans</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Global Business Membership Tiers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Premium Plan Settings */}
            <div className="bg-white rounded-[32px] border-2 border-primary/10 shadow-xl shadow-primary/5 overflow-hidden flex flex-col relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none"></div>
              
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Crown className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Premium Plan (Big Plan)</h2>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5 bg-primary/10 inline-block px-2 py-0.5 rounded-full">Top Tier Setup</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6 relative z-10 flex-1">
                <InputField 
                  label="Monthly Subscription" 
                  value={pricing.bigPlan.monthly} 
                  onChange={(e) => setPricing({...pricing, bigPlan: {...pricing.bigPlan, monthly: parseInt(e.target.value) || 0}})}
                />
                <InputField 
                  label="6 Months Subscription" 
                  value={pricing.bigPlan.sixMonths} 
                  onChange={(e) => setPricing({...pricing, bigPlan: {...pricing.bigPlan, sixMonths: parseInt(e.target.value) || 0}})}
                />
                <div className="relative">
                  <InputField 
                    label="Yearly Subscription (Best Value)" 
                    value={pricing.bigPlan.yearly} 
                    onChange={(e) => setPricing({...pricing, bigPlan: {...pricing.bigPlan, yearly: parseInt(e.target.value) || 0}})}
                  />
                </div>
              </div>
            </div>

            {/* Smart Plan Settings */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden flex flex-col relative group hover:border-slate-300 transition-colors">
              
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Smart Plan (Small Plan)</h2>
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-0.5 bg-orange-100 inline-block px-2 py-0.5 rounded-full">Essential Setup</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6 relative z-10 flex-1 bg-white">
                <InputField 
                  label="Monthly Subscription" 
                  value={pricing.smallPlan.monthly} 
                  onChange={(e) => setPricing({...pricing, smallPlan: {...pricing.smallPlan, monthly: parseInt(e.target.value) || 0}})}
                />
                <InputField 
                  label="6 Months Subscription" 
                  value={pricing.smallPlan.sixMonths} 
                  onChange={(e) => setPricing({...pricing, smallPlan: {...pricing.smallPlan, sixMonths: parseInt(e.target.value) || 0}})}
                />
                <InputField 
                  label="Yearly Subscription" 
                  value={pricing.smallPlan.yearly} 
                  onChange={(e) => setPricing({...pricing, smallPlan: {...pricing.smallPlan, yearly: parseInt(e.target.value) || 0}})}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
