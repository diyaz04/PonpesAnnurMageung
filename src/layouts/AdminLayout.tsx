import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { X, Menu, UserCheck, LogOut, Bell, Search, Globe, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSmpMenuForRole, type SmpMenuItem } from '../lib/smpAdminMenu';
import { getPesantrenMenuForRole, type PesantrenMenuItem } from '../lib/pesantrenAdminMenu';

type MenuItem = SmpMenuItem | PesantrenMenuItem;

function groupMenuItems(items: MenuItem[]) {
  return items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    acc[item.group] = acc[item.group] || [];
    acc[item.group].push(item);
    return acc;
  }, {});
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();

  const isAdminSmp = profile?.entitas === 'smp' || location.pathname.includes('/admin/smp');
  const isAdminPesantren = profile?.entitas === 'pesantren' || location.pathname.includes('/admin/pesantren');
  const basePath = isAdminSmp ? '/admin/smp' : '/admin/pesantren';

  const menuItems: MenuItem[] = isAdminSmp
    ? getSmpMenuForRole(profile?.role)
    : isAdminPesantren
      ? getPesantrenMenuForRole(profile?.role)
      : [];

  const groupedMenu = groupMenuItems(menuItems);

  const handleLogout = async () => {
    try { await logout(); navigate('/login'); }
    catch (error) { console.error('Failed to log out', error); }
  };

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden" style={{ background: '#F5F6F8' }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 text-white w-64 transition-transform duration-300 ease-in-out z-20 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0`}
        style={{ background: 'var(--navy)' }}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: 'var(--gold)', color: 'var(--navy)' }}>
              {isAdminSmp ? 'S' : 'P'}
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Panel Admin</h1>
              <p className="text-xs leading-tight" style={{ color: 'var(--gold-soft)' }}>
                {isAdminSmp ? "SMP Ma'arif NU" : 'PP Annur Mageung'}
              </p>
            </div>
          </div>
          <button className="lg:hidden" style={{ color: 'rgba(255,255,255,0.4)' }} onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-0.5">
            <Link
              to={basePath}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={location.pathname === basePath
                ? { background: 'var(--gold)', color: 'var(--navy)', fontWeight: 600 }
                : { color: 'rgba(255,255,255,0.65)' }}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>

            {Object.entries(groupedMenu).map(([group, items]) => (
              <div key={group} className="pt-5">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {group}
                </p>
                {items.map((item) => {
                  const itemPath = `${basePath}/${item.slug}`;
                  const isActive = location.pathname === itemPath;
                  return (
                    <Link
                      key={item.slug}
                      to={itemPath}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                      style={isActive
                        ? { background: 'var(--gold)', color: 'var(--navy)', fontWeight: 600 }
                        : { color: 'rgba(255,255,255,0.65)' }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* User */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(201,148,58,0.15)', border: '1.5px solid rgba(232,184,106,0.4)' }}>
              <UserCheck className="w-5 h-5" style={{ color: 'var(--gold-soft)' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-white leading-tight">{profile?.nama || 'Admin User'}</p>
              <p className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.45)' }}>{profile?.role || 'Administrator'}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: '#f87171' }}>
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
        {/* Topbar */}
        <header className="bg-white h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10"
          style={{ borderBottom: '0.5px solid rgba(10,22,40,0.1)' }}>
          <div className="flex items-center gap-4">
            <button className="lg:hidden" style={{ color: 'var(--navy-light)' }} onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: '#F5F6F8', border: '0.5px solid rgba(10,22,40,0.12)' }}>
              <Search className="w-4 h-4" style={{ color: '#999' }} />
              <input type="text" placeholder="Pencarian cepat..."
                className="bg-transparent border-none outline-none text-sm w-52" style={{ color: '#333' }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/"
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: '#F5F6F8', border: '0.5px solid rgba(10,22,40,0.12)' }}
              title="Lihat Website">
              <Globe className="w-4 h-4" style={{ color: 'var(--navy-light)' }} />
            </Link>
            <button className="w-9 h-9 rounded-lg flex items-center justify-center relative"
              style={{ background: '#F5F6F8', border: '0.5px solid rgba(10,22,40,0.12)' }}>
              <Bell className="w-4 h-4" style={{ color: 'var(--navy-light)' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <main className="min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-10 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
