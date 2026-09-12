import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Mail } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import logoImg from '../images/App Icon All.png';

export const EmployeeLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      const q = query(collection(db, 'employees'), where('email', '==', cleanEmail), where('password', '==', password));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        localStorage.setItem('messent_admin_auth', 'employee');
        setLoading(false);
        toast.success('Employee Login successful');
        navigate('/dashboard');
      } else {
        setLoading(false);
        toast.error('Invalid credentials');
      }
    } catch (error) {
      setLoading(false);
      toast.error('Login failed');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: 'radial-gradient(600px 400px at 90% 10%, rgba(0, 184, 160, 0.08), transparent 60%), radial-gradient(500px 500px at 10% 80%, rgba(37, 99, 235, 0.07), transparent 50%), #F7F8FC',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_12px_40px_rgba(15,26,61,0.06)] p-6 max-w-sm w-full">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <img src={logoImg} alt="Meesent Logo" className="w-9 h-9 object-contain rounded-lg shadow-sm" />
            <span className="font-bold text-xl tracking-tight text-[#0F1A3D]" style={{ fontFamily: "'Sora', sans-serif" }}>Meesent</span>
          </div>
          <div className="h-0.5 w-8 bg-gradient-to-r from-blue-600 to-teal-500 rounded-full"></div>
        </div>

        <h1 className="text-lg font-bold text-[#0F1A3D] text-center" style={{ fontFamily: "'Sora', sans-serif" }}>Employee Login</h1>
        <p className="text-center text-[11px] font-semibold text-slate-500 mt-0.5">
          Use your employee credentials to access the panel.
        </p>

        <form onSubmit={handleLogin} className="mt-5 space-y-3.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-[#F7F8FC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 transition-all text-xs"
                placeholder="employee@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-[#F7F8FC] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 transition-all text-xs"
                placeholder="********"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider shadow-md shadow-blue-600/10 hover:-translate-y-[1px] active:translate-y-0 transition-all disabled:opacity-60 text-xs"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-2 rounded-lg border border-slate-200 bg-white text-slate-500 font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors text-xs"
          >
            Back to Home
          </button>
        </form>
      </div>
    </div>
  );
};
