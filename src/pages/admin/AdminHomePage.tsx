import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  School, 
  BookOpen, 
  Users, 
  Settings, 
  LogOut, 
  ChevronRight,
  TrendingUp,
  CreditCard,
  Bell,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function AdminHomePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Dashboard stats
  const [stats, setStats] = useState({
    smp: { students: 0, teachers: 0 },
    pesantren: { santri: 0, ustadz: 0 }
  });

  useEffect(() => {
    // If the user has a specific role, redirect them to their specific dashboard
    if (profile?.role === 'admin_smp') {
      navigate('/admin/smp');
    } else if (profile?.role === 'admin_pesantren') {
      navigate('/admin/pesantren');
    } else if (profile?.role === 'bendahara_pusat') {
      navigate('/admin/finance');
    } else {
      // Superadmin or pending role - fetch stats
      fetchStats();
    }
  }, [profile, navigate]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch SMP stats
      const { count: smpStudents } = await supabase
        .from('smp_students')
        .select('*', { count: 'exact', head: true });
        
      const { count: smpTeachers } = await supabase
        .from('smp_teachers')
        .select('*', { count: 'exact', head: true });
        
      // Fetch Pesantren stats
      const { count: santri } = await supabase
        .from('pesantren_santri')
        .select('*', { count: 'exact', head: true });
        
      const { count: ustadz } = await supabase
        .from('pesantren_ustadz')
        .select('*', { count: 'exact', head: true });
        
      setStats({
        smp: { 
          students: smpStudents || 0, 
          teachers: smpTeachers || 0 
        },
        pesantren: { 
          santri: santri || 0, 
          ustadz: ustadz || 0 
        }
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001524]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-[#001524] text-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#E5B869] rounded flex items-center justify-center">
                <School className="w-5 h-5 text-[#001524]" />
              </div>
              <span className="font-bold text-xl tracking-wide">Portal Admin Pusat</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300 hidden sm:block">
                Login sebagai: <strong className="text-white">{profile?.full_name}</strong>
              </span>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Keluar"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-serif">Selamat Datang, {profile?.full_name}</h1>
          <p className="mt-2 text-lg text-gray-600">Pilih modul yang ingin Anda kelola hari ini.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl">
          {/* SMP Module Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
            <div className="h-2 bg-[#001524]"></div>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-[#001524]/5 rounded-xl flex items-center justify-center text-[#001524]">
                  <School className="w-8 h-8" />
                </div>
                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Aktif</span>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2 font-serif">Sistem Informasi SMP</h2>
              <p className="text-gray-600 mb-6">Kelola data siswa, guru, akademik, dan pendaftaran siswa baru SMP Maarif NU.</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Total Siswa</p>
                  <p className="text-2xl font-bold text-[#001524]">{stats.smp.students}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Total Guru</p>
                  <p className="text-2xl font-bold text-[#001524]">{stats.smp.teachers}</p>
                </div>
              </div>
              
              <Link 
                to="/admin/smp" 
                className="w-full flex items-center justify-center gap-2 bg-[#001524] text-white py-3 px-4 rounded-xl font-medium hover:bg-[#001e33] transition-colors"
              >
                Masuk Dashboard SMP
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Pesantren Module Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
            <div className="h-2 bg-[#E5B869]"></div>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-[#E5B869]/20 rounded-xl flex items-center justify-center text-[#E5B869]">
                  <BookOpen className="w-8 h-8" />
                </div>
                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Aktif</span>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2 font-serif">Sistem Informasi Pesantren</h2>
              <p className="text-gray-600 mb-6">Kelola data santri, ustadz, asrama, dan pendaftaran santri baru Pondok Pesantren.</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Total Santri</p>
                  <p className="text-2xl font-bold text-[#E5B869]">{stats.pesantren.santri}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Total Ustadz</p>
                  <p className="text-2xl font-bold text-[#E5B869]">{stats.pesantren.ustadz}</p>
                </div>
              </div>
              
              <Link 
                to="/admin/pesantren" 
                className="w-full flex items-center justify-center gap-2 bg-[#E5B869] text-[#001524] py-3 px-4 rounded-xl font-bold hover:bg-[#d4a055] transition-colors"
              >
                Masuk Dashboard Pesantren
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="mt-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 font-serif">Akses Cepat</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl">
            <Link to="/admin/finance" className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3 hover:border-[#001524] hover:shadow-sm transition-all group">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="font-medium text-gray-700 group-hover:text-gray-900">Keuangan Pusat</span>
            </Link>
            
            <Link to="/admin/landing-content" className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3 hover:border-[#001524] hover:shadow-sm transition-all group">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </div>
              <span className="font-medium text-gray-700 group-hover:text-gray-900">Kelola Website</span>
            </Link>
            
            <Link to="/admin/accounts" className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3 hover:border-[#001524] hover:shadow-sm transition-all group">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <span className="font-medium text-gray-700 group-hover:text-gray-900">Kelola Akun</span>
            </Link>
            
            <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 flex items-center gap-3 opacity-70 cursor-not-allowed">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="font-medium text-gray-500">Laporan Global</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

