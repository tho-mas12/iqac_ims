import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import logo from '../assets/logo.png';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // If token already exists, prevent viewing login
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        username: username.trim(),
        password: password.trim(),
      });
      
      const { access_token, role, username: returnedUser } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);
      localStorage.setItem('username', returnedUser);
      
      toast.success(`Welcome back, ${returnedUser}!`);
      
      // Use replace to prevent going back to login
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Authentication failed. Please check credentials.';
      if (err.response?.status === 404) {
        errMsg = 'Backend API unreachable (404 Not Found). Please check backend deployment & VITE_API_URL.';
      } else if (err.response?.data?.detail) {
        errMsg = err.response.data.detail;
      }
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4">
      {/* Animated Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle top decoration line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
        
        {/* Brand/Logo Header */}
        <div className="flex flex-col items-center justify-center mb-8 text-center">
          <motion.img 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            src={logo} 
            alt="SJC Crest Logo" 
            className="h-28 w-auto mb-4 object-contain drop-shadow-lg"
          />
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight leading-tight">
            SJC IQAC-IMS
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-1">
            Institutional Monitoring System
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              User ID
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User className="h-5 w-5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200/80 bg-white/50 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 shadow-2xs"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200/80 bg-white/50 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 shadow-2xs"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md hover:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 cursor-pointer transform hover:-translate-y-[1px] active:translate-y-0 transition-all duration-300 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" />
                <span>Verify Credentials</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-8 text-center text-[10px] text-slate-400 font-medium">
          Protected Portal | St. Joseph's College IQAC © {new Date().getFullYear()}
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
