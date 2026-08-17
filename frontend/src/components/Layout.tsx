import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderPlus, 
  ClipboardCheck, 
  Mail, 
  Users, 
  LogOut, 
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';
import logo from '../assets/logo.png';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role') || 'Staff';
  const username = localStorage.getItem('username') || 'User';

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Staff', 'Office'] },
    { name: 'Titles & Questions', path: '/titles', icon: FolderPlus, roles: ['Admin', 'Staff', 'Office'] },
    { name: 'Checklist', path: '/checklist', icon: ClipboardCheck, roles: ['Admin', 'Staff', 'Office'] },
    { name: 'Mail Tracking', path: '/mails', icon: Mail, roles: ['Admin', 'Staff', 'Office'] },
    { name: 'User Access Control', path: '/users', icon: Users, roles: ['Admin'] },
  ];

  const handleLogout = () => {
    // Clear auth credentials
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    
    // Replace state in history to block forward navigation (back button block)
    navigate('/login', { replace: true });
    
    // Hard refresh/history cleaning
    window.location.replace('/login');
  };

  // Block back button if not authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-68 bg-white border-r border-slate-100 flex flex-col justify-between shadow-sm z-10">
        <div>
          {/* Logo & Brand Header */}
          <div className="p-5 border-b border-slate-50 flex flex-col items-center justify-center text-center">
            <img 
              src={logo} 
              alt="SJC Crest Logo" 
              className="h-20 w-auto mb-3 object-contain drop-shadow-md transform hover:scale-105 transition-transform duration-300"
            />
            <h1 className="text-base font-bold text-slate-800 tracking-tight leading-tight">
              SJC IQAC-IMS
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1">
              Monitoring System
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {menuItems
              .filter(item => item.roles.includes(role))
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-indigo-50/70 text-indigo-600 shadow-xs border-l-4 border-indigo-600 pl-3'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* Footer User Info & Logout */}
        <div className="p-4 border-t border-slate-50 space-y-3">
          <div className="flex items-center space-x-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
            <div className="p-2 bg-indigo-100/50 rounded-lg text-indigo-600">
              {role === 'Admin' ? <ShieldAlert className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">{username}</p>
              <p className="text-[10px] font-medium text-slate-400">{role} Account</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-2.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100/70 rounded-xl transition-colors duration-300 cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-mesh">
        {/* Top Navbar */}
        <header className="h-16 bg-white/70 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 shadow-2xs">
          <h2 className="text-lg font-bold text-slate-800">
            {menuItems.find(item => item.path === location.pathname)?.name || 'Overview'}
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-xs font-medium text-slate-400">
              Institutional Monitoring Portal
            </span>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
