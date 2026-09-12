import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  Users,
  Briefcase,
  Wrench,
  Search,
  Bell,
  Calendar,
  ChevronDown,
  ArrowRight,
  Store,
  UserPlus,
  FileText,
  Plus
} from 'lucide-react';
import {
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-xl shadow-slate-200/50 text-left">
        <p className="text-[10px] font-bold text-slate-400">{payload[0].payload.date}</p>
        <div className="flex items-center space-x-1.5 mt-1">
          <span className="w-2 h-2 rounded-full bg-[#bc36ad] block"></span>
          <span className="text-xs font-black text-slate-800">
            {payload[0].value.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
  return null;
};
export const Dashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    jobs: 0,
    services: 0,
    vendors: 0,
    users: 0,
    applications: 0
  });

  const [activities, setActivities] = useState([]);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/dashboard-stats');
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchDashboardStats();

    const unsubJobs = onSnapshot(collection(db, 'jobs'), s => setStats(prev => ({ ...prev, jobs: s.size })), () => fetchDashboardStats());
    const unsubServices = onSnapshot(collection(db, 'services'), s => setStats(prev => ({ ...prev, services: s.size })), () => fetchDashboardStats());
    const unsubVendors = onSnapshot(collection(db, 'vendors'), s => setStats(prev => ({ ...prev, vendors: s.size })), () => fetchDashboardStats());
    const unsubUsers = onSnapshot(collection(db, 'users'), s => setStats(prev => ({ ...prev, users: s.size })), () => fetchDashboardStats());
    const unsubApps = onSnapshot(collection(db, 'applications'), s => setStats(prev => ({ ...prev, applications: s.size })), () => fetchDashboardStats());

    return () => {
      unsubJobs();
      unsubServices();
      unsubVendors();
      unsubUsers();
      unsubApps();
    };
  }, []);

  // Real-time Recent Activities Feed
  useEffect(() => {
    const formatTime = (timestamp) => {
      if (!timestamp) return 'Just now';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const diffMs = new Date() - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} mins ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    let rawActivities = { jobs: [], vendors: [], users: [], apps: [] };

    const updateCombined = () => {
      const all = [
        ...rawActivities.jobs,
        ...rawActivities.vendors,
        ...rawActivities.users,
        ...rawActivities.apps
      ];
      // Sort by creation date descending
      all.sort((a, b) => {
        const timeA = a.rawTime ? (a.rawTime.toDate ? a.rawTime.toDate().getTime() : new Date(a.rawTime).getTime()) : 0;
        const timeB = b.rawTime ? (b.rawTime.toDate ? b.rawTime.toDate().getTime() : new Date(b.rawTime).getTime()) : 0;
        return timeB - timeA;
      });
      setActivities(all.slice(0, 5));
    };

    const unsubJobsList = onSnapshot(query(collection(db, 'jobs'), limit(3)), (snap) => {
      rawActivities.jobs = snap.docs.map(doc => ({
        title: 'New job posted:',
        name: doc.data().jobTitle || doc.data().title || 'Job Listing',
        sub: doc.data().companyName ? `by ${doc.data().companyName}` : 'by Recruiter',
        time: formatTime(doc.data().createdAt),
        rawTime: doc.data().createdAt,
        icon: Plus,
        color: 'text-pink-500',
        bg: 'bg-pink-50',
        borderColor: 'border-pink-100'
      }));
      updateCombined();
    }, () => {});

    const unsubVendorsList = onSnapshot(query(collection(db, 'vendors'), limit(3)), (snap) => {
      rawActivities.vendors = snap.docs.map(doc => ({
        title: 'New vendor',
        name: `${doc.data().businessName || doc.data().name || 'Vendor'} added`,
        sub: doc.data().category ? `Category: ${doc.data().category}` : '',
        time: formatTime(doc.data().createdAt),
        rawTime: doc.data().createdAt,
        icon: Store,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50',
        borderColor: 'border-emerald-100'
      }));
      updateCombined();
    }, () => {});

    const unsubUsersList = onSnapshot(query(collection(db, 'users'), limit(3)), (snap) => {
      rawActivities.users = snap.docs.map(doc => ({
        title: 'New user registered',
        name: doc.data().name || doc.data().displayName || 'User Registered',
        sub: doc.data().phone || doc.data().email || '',
        time: formatTime(doc.data().createdAt),
        rawTime: doc.data().createdAt,
        icon: Users,
        color: 'text-purple-500',
        bg: 'bg-purple-50',
        borderColor: 'border-purple-100'
      }));
      updateCombined();
    }, () => {});

    const unsubAppsList = onSnapshot(query(collection(db, 'applications'), limit(3)), (snap) => {
      rawActivities.apps = snap.docs.map(doc => ({
        title: 'New application received',
        name: doc.data().jobTitle || doc.data().applicantName || 'Application Submitted',
        sub: doc.data().applicantName ? `from ${doc.data().applicantName}` : '',
        time: formatTime(doc.data().createdAt),
        rawTime: doc.data().createdAt,
        icon: FileText,
        color: 'text-orange-500',
        bg: 'bg-orange-50',
        borderColor: 'border-orange-100'
      }));
      updateCombined();
    }, () => {});

    return () => {
      unsubJobsList();
      unsubVendorsList();
      unsubUsersList();
      unsubAppsList();
    };
  }, []);

  const topStats = [
    {
      name: 'Total Jobs',
      value: stats.jobs,
      trend: '12%',
      icon: Briefcase,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      name: 'Total Services',
      value: stats.services,
      trend: '8%',
      icon: Wrench,
      color: 'text-pink-600',
      bg: 'bg-pink-50'
    },
    {
      name: 'Total Vendors',
      value: stats.vendors,
      trend: '14%',
      icon: Store,
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    },
    {
      name: 'Total Users',
      value: stats.users,
      trend: '10%',
      icon: UserPlus,
      color: 'text-green-600',
      bg: 'bg-emerald-50'
    },
    {
      name: 'Total Applications',
      value: stats.applications,
      trend: '16%',
      icon: FileText,
      color: 'text-[#bc36ad]',
      bg: 'bg-purple-50/50'
    },
  ];

  const chartData = [
    { name: 'May 18', date: 'May 18, 2024', value: 180 },
    { name: 'May 25', date: 'May 25, 2024', value: 650 },
    { name: 'Jun 01', date: 'Jun 01, 2024', value: 500 },
    { name: 'Jun 08', date: 'Jun 08, 2024', value: 1120 },
    { name: 'Jun 15', date: 'Jun 15, 2024', value: 900 },
    { name: 'Jun 18', date: 'Jun 18, 2024', value: 1250 },
  ];

  const quickActions = [
    {
      title: 'Add New Job',
      desc: 'Post a new job',
      path: '/jobs',
      icon: Briefcase,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      cardBg: 'bg-purple-50/20 hover:bg-purple-50/50 border-purple-100/30'
    },

    {
      title: 'Add Vendor',
      desc: 'Register vendor',
      path: '/vendors',
      icon: Store,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      cardBg: 'bg-orange-50/20 hover:bg-orange-50/50 border-orange-100/30'
    },
    {
      title: 'Add User',
      desc: 'Create new user',
      path: '/users',
      icon: UserPlus,
      color: 'text-green-600',
      bg: 'bg-emerald-50',
      cardBg: 'bg-emerald-50/20 hover:bg-emerald-50/50 border-emerald-100/30'
    },
    {
      title: 'View Applications',
      desc: 'Check all applications',
      path: '/jobs',
      icon: FileText,
      color: 'text-[#bc36ad]',
      bg: 'bg-purple-50/60',
      cardBg: 'bg-purple-50/10 hover:bg-purple-50/30 border-purple-100/20'
    }
  ];

  return (
    <Layout>
      <div className="flex-1 bg-[#F8FAFC] min-h-screen px-10 py-8 space-y-8">
        {/* Header Section */}
        <header className="flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h1 className="text-[28px] font-black text-slate-900 tracking-tight">Welcome back, Admin! 👋</h1>
            <p className="text-xs font-semibold text-slate-400 mt-1.5">Here's what's happening on Meesent today.</p>
          </div>

          <div className="flex items-center space-x-5">
            {/* Search Input */}
            <div className="relative group hidden xl:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#bc36ad] transition-colors" />
              <input
                type="text"
                placeholder="Search anything..."
                className="pl-11 pr-6 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-semibold w-64 focus:bg-white focus:border-[#bc36ad]/30 focus:ring-0 shadow-sm transition-all"
              />
            </div>

            {/* Date Selector */}
            <div className="flex items-center bg-white border border-slate-100 rounded-2xl px-4 py-2 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
              <Calendar className="w-4 h-4 text-slate-400 mr-2.5" />
              <div className="text-left leading-tight">
                <p className="text-[10px] font-black text-slate-700">May 18, 2024</p>
                <p className="text-[10px] font-black text-slate-700">- Jun 18, 2024</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-2.5" />
            </div>

            {/* Notification Bell */}
            <div className="relative cursor-pointer group">
              <div className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm group-hover:bg-slate-50 transition-all">
                <Bell className="w-4.5 h-4.5 text-slate-700" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#e11d48] text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">8</span>
            </div>

            {/* Profile Info */}
            <div className="flex items-center space-x-3 border-l border-slate-200/60 pl-6 cursor-pointer group">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#bc36ad] to-purple-500 flex items-center justify-center text-white font-black text-sm shadow-md">
                  M
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#F8FAFC]"></span>
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <p className="text-xs font-black text-slate-800">Admin</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {topStats.map((stat, idx) => (
            <div key={idx} className="bg-white p-5 rounded-[22px] border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
              {/* Icon + name/value row */}
              <div className="flex items-center space-x-4 mb-4">
                <div className={`w-14 h-14 flex-shrink-0 rounded-2xl ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{stat.name}</p>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <h3 className="text-2xl font-black text-slate-800">{stat.value}</h3>
                    <span className="text-[10px] font-black text-emerald-500">↗ {stat.trend}</span>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="border-t border-slate-50 pt-3">
                <span className="text-[10px] font-bold text-slate-400">↑ from last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Middle Section: Chart and Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Card */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[35px] border border-slate-100/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Overview</h3>
                <p className="text-xs font-semibold text-slate-400 mt-1">Platform growth performance</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-xl px-4 py-2 shadow-sm flex items-center cursor-pointer hover:bg-slate-50 transition-all">
                <span className="text-xs font-bold text-slate-600">This Month</span>
                <ChevronDown className="w-4 h-4 text-slate-400 inline-block ml-2" />
              </div>
            </div>

            <div className="h-72 w-full pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#bc36ad" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#bc36ad" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    ticks={[0, 350, 700, 1050, 1400]}
                    domain={[0, 1400]}
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#bc36ad"
                    strokeWidth={4}
                    dot={{ r: 4, fill: '#bc36ad', stroke: '#white', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#bc36ad', stroke: '#white', strokeWidth: 3 }}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activities Card */}
          <div className="bg-white p-8 rounded-[35px] border border-slate-100/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Recent Activities</h3>
              <button onClick={() => navigate('/jobs')} className="text-[#bc36ad] text-[10px] font-black uppercase tracking-widest hover:underline">View All</button>
            </div>
            <div className="space-y-6 flex-1 flex flex-col justify-around">
              {activities.map((act, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded-full ${act.bg} border ${act.borderColor} flex-shrink-0 flex items-center justify-center`}>
                      <act.icon className={`w-4 h-4 ${act.color}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-slate-500">{act.title}</p>
                      <h4 className="text-xs font-black text-slate-900 mt-0.5">{act.name}</h4>
                      {act.sub && <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{act.sub}</p>}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap ml-4">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="space-y-5">
          <div className="text-left">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {quickActions.map((act, idx) => (
              <div
                key={idx}
                onClick={() => navigate(act.path)}
                className={`p-4 rounded-[20px] border ${act.cardBg} flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group shadow-sm`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-xl ${act.bg} flex items-center justify-center`}>
                    <act.icon className={`w-4 h-4 ${act.color}`} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-slate-800">{act.title}</h4>
                    <p className="text-[9px] font-semibold text-slate-400 mt-0.5">{act.desc}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors mr-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};
