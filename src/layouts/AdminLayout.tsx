import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  GraduationCap, 
  Wallet,
  FileText,
  UserCheck,
  ChevronDown,
  Bell,
  Search,
  Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { smpAdminMenu } from '../lib/smpAdminMenu';
import { pesantrenAdminMenu } from '../lib/pesantrenAdminMenu';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  // Determine which menu to show based on user role or URL
  const isAdminSmp = profile?.role === 'admin_smp' || location.pathname.includes('/admin/smp');
  const isAdminPesantren = profile?.role === 'admin_pesantren' || location.pathname.includes('/admin/pesantren');
  
  const menuItems = isAdminSmp ? smpAdminMenu : (isAdminPesantren ? pesantrenAdminMenu : []);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const toggleSubmenu = (title: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-[#001524] text-white w-64 transition-transform duration-300 ease-in-out z-20 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0`}
      >
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#E5B869] rounded flex items-center justify-center text-[#001524] font-bold text-xl">
              {isAdminSmp ? 'S' : 'P'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Panel Admin</h1>
              <p className="text-xs text-[#E5B869]">
                {isAdminSmp ? 'SMP Maarif NU' : 'PP Annur Mageung'}
              </p>
            </div>
          </div>
          <button 
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {menuItems.map((item, index) => (
              <div key={index}>
                {item.submenu ? (
                  <>
                    <button
                      onClick={() => toggleSubmenu(item.title)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                        item.submenu.some(sub => location.pathname === sub.path)
                          ? 'bg-[#E5B869] text-[#001524]'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span className="font-medium text-sm">{item.title}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenus[item.title] ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {expandedMenus[item.title] && (
                      <div className="mt-1 ml-9 space-y-1">
                        {item.submenu.map((sub, subIndex) => (
                          <Link
                            key={subIndex}
                            to={sub.path}
                            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                              location.pathname === sub.path
                                ? 'bg-[#E5B869]/20 text-[#E5B869] font-medium'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {sub.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-[#E5B869] text-[#001524] font-medium'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium text-sm">{item.title}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-[#E5B869]/30">
              <UserCheck className="w-5 h-5 text-[#E5B869]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{profile?.full_name || 'Admin User'}</p>
              <p className="text-xs text-gray-400">{profile?.role || 'Administrator'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 lg:px-8 border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="hidden md:flex items-center relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3" />
              <input 
                type="text" 
                placeholder="Pencarian cepat..." 
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001524] focus:border-transparent w-64 bg-gray-50"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 text-gray-500 hover:text-[#001524] hover:bg-gray-100 rounded-full transition-colors hidden sm:block" title="Lihat Website">
              <Globe className="w-5 h-5" />
            </Link>
            <button className="p-2 text-gray-500 hover:text-[#001524] hover:bg-gray-100 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}


