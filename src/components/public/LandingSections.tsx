import React, { useEffect, useState } from 'react';
import { Shield, BookOpen, Users, CheckCircle2, TrendingUp, Landmark, GraduationCap, MapPin, Phone, Mail } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

// SMP Maarif NU Landing Page Components
export function SmpHero() {
  return (
    <div className="relative min-h-screen flex items-center bg-[#001524] text-white overflow-hidden">
      {/* Background with overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{
          backgroundImage: `url("https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop")`
        }}
      />

      <div className="container mx-auto px-4 z-10 grid md:grid-cols-2 gap-12 items-center">
        <div className="max-w-2xl">
          <div className="inline-block bg-[#E5B869]/20 text-[#E5B869] px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-[#E5B869]/30">
            Penerimaan Peserta Didik Baru 2024/2025
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight font-serif">
            Generasi Cerdas, <br/>
            <span className="text-[#E5B869]">Berakhlak Mulia</span>
          </h1>
          <p className="text-xl mb-10 text-gray-300 leading-relaxed max-w-lg">
            SMP Maarif NU Ponpes Annur Mageung membentuk karakter unggul dengan perpaduan pendidikan nasional dan nilai-nilai kepesantrenan.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button className="bg-[#E5B869] hover:bg-[#D4A055] text-[#001524] font-bold text-lg px-8">
              Daftar Sekarang
            </Button>
            <Button variant="secondary" className="border-[#E5B869] text-[#E5B869] hover:bg-[#E5B869]/10 text-lg px-8">
              Jelajahi Profil
            </Button>
          </div>
        </div>
        
        <div className="hidden md:grid grid-cols-2 gap-4">
           {/* Card 1 */}
           <div className="bg-[#001e33]/80 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:border-[#E5B869]/50 transition-colors transform translate-y-8">
             <div className="w-12 h-12 bg-[#E5B869]/20 rounded-xl flex items-center justify-center mb-4 text-[#E5B869]">
               <BookOpen className="w-6 h-6" />
             </div>
             <h3 className="text-xl font-bold mb-2">Kurikulum Merdeka</h3>
             <p className="text-sm text-gray-400">Pembelajaran adaptif yang fokus pada pengembangan karakter dan kompetensi.</p>
           </div>
           
           {/* Card 2 */}
           <div className="bg-[#001e33]/80 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:border-[#E5B869]/50 transition-colors">
             <div className="w-12 h-12 bg-[#E5B869]/20 rounded-xl flex items-center justify-center mb-4 text-[#E5B869]">
               <Shield className="w-6 h-6" />
             </div>
             <h3 className="text-xl font-bold mb-2">Pendidikan Karakter</h3>
             <p className="text-sm text-gray-400">Terintegrasi dengan nilai-nilai ahlussunnah wal jamaah an-nahdliyah.</p>
           </div>

           {/* Card 3 */}
           <div className="bg-[#E5B869] text-[#001524] p-6 rounded-2xl col-span-2 transform -translate-y-4 shadow-xl">
             <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-1">Akreditasi A</h3>
                  <p className="text-[#001524]/80 font-medium">Badan Akreditasi Nasional</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-black">A</span>
                </div>
             </div>
           </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#001524] border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
            <div className="py-6 px-4 text-center">
              <div className="text-3xl font-bold text-[#E5B869] mb-1">15+</div>
              <div className="text-sm text-gray-400">Tahun Berdiri</div>
            </div>
            <div className="py-6 px-4 text-center">
              <div className="text-3xl font-bold text-[#E5B869] mb-1">450+</div>
              <div className="text-sm text-gray-400">Siswa Aktif</div>
            </div>
            <div className="py-6 px-4 text-center">
              <div className="text-3xl font-bold text-[#E5B869] mb-1">45+</div>
              <div className="text-sm text-gray-400">Tenaga Pendidik</div>
            </div>
            <div className="py-6 px-4 text-center">
              <div className="text-3xl font-bold text-[#E5B869] mb-1">100%</div>
              <div className="text-sm text-gray-400">Lulusan Melanjutkan</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SmpFeatures() {
  const features = [
    {
      icon: <GraduationCap className="w-8 h-8" />,
      title: "Guru Profesional",
      description: "Tenaga pendidik tersertifikasi dengan kualifikasi S1 & S2."
    },
    {
      icon: <Landmark className="w-8 h-8" />,
      title: "Fasilitas Lengkap",
      description: "Laboratorium komputer, IPA, dan perpustakaan digital."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Ekstrakurikuler",
      description: "Beragam pilihan ekskul untuk pengembangan bakat siswa."
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Prestasi Akademik",
      description: "Pembinaan intensif untuk olimpiade dan kompetisi."
    }
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-[#E5B869] tracking-wider uppercase mb-3">Keunggulan Kami</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-[#001524] mb-4 font-serif">Mengapa Memilih SMP Maarif NU?</h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Kami berkomitmen memberikan pendidikan terbaik yang mengintegrasikan kecerdasan intelektual, emosional, dan spiritual.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group">
              <div className="w-16 h-16 bg-[#001524] text-[#E5B869] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#E5B869] group-hover:text-[#001524] transition-colors">
                {feature.icon}
              </div>
              <h4 className="text-xl font-bold text-[#001524] mb-3">{feature.title}</h4>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SmpPrograms() {
  const programs = [
    {
      image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=2070&auto=format&fit=crop",
      title: "Program Tahfidz",
      category: "Keagamaan",
      description: "Bimbingan hafalan Al-Qur'an terpadu dengan target minimal 3 Juz selama masa pendidikan SMP."
    },
    {
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop",
      title: "English & Arabic Club",
      category: "Bahasa",
      description: "Pembiasaan bahasa asing untuk mempersiapkan siswa bersaing di era global."
    },
    {
      image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2032&auto=format&fit=crop",
      title: "Science & Tech",
      category: "Akademik",
      description: "Pengembangan kemampuan sains dan teknologi melalui eksperimen dan proyek terapan."
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-16">
          <div>
            <h2 className="text-sm font-bold text-[#E5B869] tracking-wider uppercase mb-3">Program Unggulan</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-[#001524] font-serif">Pengembangan Potensi Siswa</h3>
          </div>
          <Button variant="secondary" className="border-[#001524] text-[#001524] hidden md:flex">
            Lihat Semua Program
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {programs.map((program, index) => (
            <div key={index} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm group">
              <div className="relative h-56 overflow-hidden">
                <img 
                  src={program.image} 
                  alt={program.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 bg-[#E5B869] text-[#001524] text-xs font-bold px-3 py-1 rounded-full">
                  {program.category}
                </div>
              </div>
              <div className="p-8">
                <h4 className="text-xl font-bold text-[#001524] mb-3">{program.title}</h4>
                <p className="text-gray-600 mb-6">{program.description}</p>
                <Button className="w-full bg-[#001524] hover:bg-[#001524]/90 text-white">
                  Pelajari Lebih Lanjut
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Ponpes Annur Mageung Landing Page Components
export function PesantrenHero() {
  return (
    <div className="relative min-h-screen flex items-center bg-[#001524] text-white overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{
          backgroundImage: `url("https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=2076&auto=format&fit=crop")`
        }}
      />

      <div className="container mx-auto px-4 z-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-[#E5B869]/10 text-[#E5B869] px-4 py-2 rounded-full text-sm font-semibold mb-8 border border-[#E5B869]/20">
            <span className="w-2 h-2 rounded-full bg-[#E5B869] animate-pulse"></span>
            Pendaftaran Santri Baru Telah Dibuka
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight font-serif">
            Mencetak Ulama <br/>
            <span className="text-[#E5B869] italic">Amilin</span>
          </h1>
          <p className="text-xl mb-10 text-gray-300 leading-relaxed max-w-2xl">
            Pondok Pesantren Annur Mageung memadukan kajian kitab kuning salaf dengan sistem pendidikan modern untuk membentuk generasi islami yang tangguh.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button className="bg-[#E5B869] hover:bg-[#D4A055] text-[#001524] font-bold text-lg px-8">
              Pendaftaran Online
            </Button>
            <Button variant="secondary" className="border-white/20 text-white hover:bg-white hover:text-[#001524] text-lg px-8">
              Profil Pesantren
            </Button>
          </div>
        </div>
      </div>

      {/* Info Cards Overlay */}
      <div className="absolute -bottom-16 left-0 right-0 z-20 hidden md:block">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-[#E5B869] transform transition-transform hover:-translate-y-2">
              <div className="w-12 h-12 bg-[#001524]/5 rounded-lg flex items-center justify-center mb-4 text-[#001524]">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#001524] mb-2">Kajian Kitab Kuning</h3>
              <p className="text-gray-600 text-sm">Sistem sorogan dan bandongan klasik dengan kurikulum berjenjang.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-[#001524] transform transition-transform hover:-translate-y-2">
              <div className="w-12 h-12 bg-[#001524]/5 rounded-lg flex items-center justify-center mb-4 text-[#001524]">
                <Landmark className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#001524] mb-2">Pendidikan Formal</h3>
              <p className="text-gray-600 text-sm">Terintegrasi dengan SMP dan jenjang pendidikan formal lainnya.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-[#E5B869] transform transition-transform hover:-translate-y-2">
              <div className="w-12 h-12 bg-[#001524]/5 rounded-lg flex items-center justify-center mb-4 text-[#001524]">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#001524] mb-2">Pembinaan Akhlak</h3>
              <p className="text-gray-600 text-sm">Penanaman nilai adab dan kedisiplinan 24 jam di lingkungan asrama.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PesantrenAbout() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="bg-[#001524] rounded-2xl p-8 text-white text-center">
              <div className="text-6xl font-bold text-[#E5B869] mb-2">1998</div>
              <div className="text-gray-300">Tahun Berdiri</div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-[#E5B869] tracking-wider uppercase mb-3">Tentang Pesantren</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-[#001524] mb-6 font-serif">Membangun Tradisi Keilmuan Pesantren Salaf</h3>
            <p className="text-gray-600 text-lg mb-6 leading-relaxed">
              Pondok Pesantren Annur Mageung didirikan dengan niat luhur untuk melestarikan tradisi keilmuan Islam ahlussunnah wal jamaah.
            </p>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Kami memadukan sistem pendidikan salafiyah yang berfokus pada penguasaan kitab kuning dengan sistem pendidikan modern untuk menjawab tantangan zaman tanpa meninggalkan jati diri santri.
            </p>
            
            <ul className="space-y-4 mb-8">
              {[
                "Pengajian Kitab Kuning Rutin",
                "Tahfidzul Qur'an",
                "Pengembangan Bahasa Arab & Inggris",
                "Kemandirian & Wirausaha Santri"
              ].map((item, i) => (
                <li key={i} className="flex items-center text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-[#E5B869] mr-3 flex-shrink-0" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
            
            <Button className="bg-[#001524] hover:bg-[#001524]/90 text-white px-8">
              Sejarah Lengkap
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section className="py-24 bg-[#001524] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#001524] to-[#001e33]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 font-serif">Mari Bergabung Bersama Kami</h2>
          <p className="text-gray-300 text-lg">
            Untuk informasi lebih lanjut mengenai pendaftaran atau program kami, jangan ragu untuk menghubungi panitia penerimaan santri/siswa baru.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl text-center hover:bg-white/10 transition-colors">
            <div className="w-14 h-14 bg-[#E5B869]/20 rounded-full flex items-center justify-center mx-auto mb-6 text-[#E5B869]">
              <MapPin className="w-7 h-7" />
            </div>
            <h4 className="text-xl font-bold mb-3">Lokasi</h4>
            <p className="text-gray-400 text-sm">
              Jl. Pesantren No. 1, Mageung,<br />
              Kec. Karanganyar, Kab. Demak,<br />
              Jawa Tengah
            </p>
          </div>
          
          <div className="bg-[#E5B869] text-[#001524] p-8 rounded-2xl text-center shadow-xl transform md:-translate-y-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 text-[#001524]">
              <Phone className="w-7 h-7" />
            </div>
            <h4 className="text-xl font-bold mb-3">Telepon / WhatsApp</h4>
            <p className="font-medium mb-1">Admin SMP: 0812-3456-7890</p>
            <p className="font-medium">Admin Ponpes: 0812-0987-6543</p>
            <Button className="w-full mt-6 bg-[#001524] hover:bg-[#001e33] text-white">
              Hubungi Sekarang
            </Button>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl text-center hover:bg-white/10 transition-colors">
            <div className="w-14 h-14 bg-[#E5B869]/20 rounded-full flex items-center justify-center mx-auto mb-6 text-[#E5B869]">
              <Mail className="w-7 h-7" />
            </div>
            <h4 className="text-xl font-bold mb-3">Email</h4>
            <p className="text-gray-400 text-sm mb-1">
              info@smpmaarifnu.sch.id
            </p>
            <p className="text-gray-400 text-sm">
              admin@annurmageung.com
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}



type BeritaRow = {
  id: string;
  judul: string;
  ringkasan: string | null;
  foto_url: string | null;
  created_at: string;
  entitas: string;
};

type AgendaRow = {
  id: string;
  judul: string;
  tanggal: string;
  lokasi: string | null;
  entitas: string;
};

type GaleriRow = {
  id: string;
  foto_url: string;
  keterangan: string | null;
  entitas: string;
};

type SaranRow = {
  id?: string;
};

// ---------- SectionBerita ----------
export function SectionBerita({
  entitas,
  entityLabel,
  detailBasePath,
}: {
  entitas: string;
  entityLabel: string;
  detailBasePath: string;
}) {
  const [items, setItems] = useState<BeritaRow[]>([]);

  useEffect(() => {
    supabase
      .from('lp_berita')
      .select('id,judul,ringkasan,foto_url,created_at,entitas')
      .eq('entitas', entitas)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { if (data) setItems(data as BeritaRow[]); });
  }, [entitas]);

  if (!items.length) return null;

  return (
    <section id="berita" className="section-shell py-20 sm:py-24">
      <p className="section-kicker">Kabar Terkini</p>
      <h2 className="section-title">Berita {entityLabel}</h2>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="premium-card group overflow-hidden">
            {item.foto_url && (
              <div className="overflow-hidden">
                <img src={item.foto_url} alt={item.judul} className="image-zoom aspect-[16/10] w-full object-cover" />
              </div>
            )}
            <div className="p-6">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-green-700">{new Date(item.created_at).toLocaleDateString('id-ID')}</p>
              <h3 className="mb-3 font-display text-xl font-bold leading-snug text-green-950">{item.judul}</h3>
              {item.ringkasan && <p className="text-sm text-gray-600 leading-6">{item.ringkasan}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ---------- SectionAgenda ----------
export function SectionAgenda({ entitas, entityLabel }: { entitas: string; entityLabel: string }) {
  const [items, setItems] = useState<AgendaRow[]>([]);

  useEffect(() => {
    supabase
      .from('lp_agenda')
      .select('id,judul,tanggal,lokasi,entitas')
      .eq('entitas', entitas)
      .order('tanggal', { ascending: true })
      .limit(5)
      .then(({ data }) => { if (data) setItems(data as AgendaRow[]); });
  }, [entitas]);

  if (!items.length) return null;

  return (
    <section id="agenda" className="border-y border-green-900/5 bg-white py-20 sm:py-24">
      <div className="section-shell">
        <p className="section-kicker">Kalender Kegiatan</p>
        <h2 className="section-title">Agenda {entityLabel}</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="group flex gap-5 rounded-2xl border border-green-900/10 bg-[#f9f8f4] p-5 transition hover:border-green-400/50 hover:shadow-soft">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-green-950 px-1 py-2 text-center text-white shadow-lg">
                <span className="block text-2xl font-bold leading-none text-green-300">
                  {new Date(item.tanggal).getDate()}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider">
                  {new Date(item.tanggal).toLocaleDateString('id-ID', { month: 'short' })}
                </span>
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-green-950">{item.judul}</h3>
                {item.lokasi && <p className="text-sm text-gray-500 mt-1">{item.lokasi}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- SectionGaleri ----------
export function SectionGaleri({ entitas }: { entitas: string }) {
  const [items, setItems] = useState<GaleriRow[]>([]);

  useEffect(() => {
    supabase
      .from('lp_galeri')
      .select('id,foto_url,keterangan,entitas')
      .eq('entitas', entitas)
      .limit(9)
      .then(({ data }) => { if (data) setItems(data as GaleriRow[]); });
  }, [entitas]);

  if (!items.length) return null;

  return (
    <section id="galeri" className="section-shell py-20 sm:py-24">
      <p className="section-kicker">Cerita dalam Gambar</p>
      <h2 className="section-title mb-10">Galeri Foto</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-green-950 shadow-soft sm:rounded-[1.5rem]">
            <img
              src={item.foto_url}
              alt={item.keterangan || 'Galeri'}
              className="image-zoom h-full w-full object-cover"
            />
            {item.keterangan && (
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-green-950/90 via-transparent to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-sm font-medium text-white">{item.keterangan}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- SeksiCekPembayaran ----------
export function SeksiCekPembayaran({
  entitas,
  personLabel,
  recordLabel,
}: {
  entitas: string;
  personLabel: string;
  recordLabel: string;
}) {
  const [nis, setNis] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCek = async () => {
    if (!nis.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    if (entitas === 'smp' || entitas === 'pesantren') {
      const functionName =
        entitas === 'smp' ? 'lookup_smp_student_record' : 'lookup_pesantren_student_record';
      const { data, error: rpcError } = await supabase.rpc(functionName, {
        p_kode_unik: nis.trim(),
        p_client_key: navigator.userAgent,
      });

      setLoading(false);
      const payload = data as Record<string, unknown> | null;
      if (rpcError || !payload || payload.status === 'not_found') {
        setError(`Data ${personLabel} tidak ditemukan.`);
        return;
      }
      if (payload.status === 'rate_limited') {
        setError('Terlalu banyak percobaan. Silakan tunggu sebentar.');
        return;
      }
      setResult(payload);
      return;
    }
  };

  const peserta = (result?.peserta || result?.santri) as Record<string, unknown> | undefined;
  const tagihan = (result?.tagihan as Record<string, unknown>[] | undefined) || [];
  const raport = (result?.raport as Record<string, unknown>[] | undefined) || [];
  const perizinan = (result?.perizinan as Record<string, unknown>[] | undefined) || [];
  const formatCurrency = (value: unknown) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
  const formatPublicDateTime = (value: unknown) =>
    value
      ? new Intl.DateTimeFormat('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(String(value)))
      : '-';
  const izinStatusLabel = (value: unknown) =>
    value === 'selesai' ? 'Sudah kembali' : String(value || '-').replace(/_/g, ' ');
  const raportPdfUrl = (path: unknown) =>
    typeof path === 'string' && path
      ? supabase.storage.from(entitas === 'smp' ? 'smp-raport-pdf' : 'pp-raport-pdf').getPublicUrl(path).data.publicUrl
      : '';
  const izinPdfUrl = (path: unknown) =>
    typeof path === 'string' && path
      ? supabase.storage.from('pp-perizinan-pdf').getPublicUrl(path).data.publicUrl
      : '';

  return (
    <section id="cek-santri" className="relative isolate overflow-hidden bg-green-950 py-20 text-white sm:py-24">
      <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:52px_52px] opacity-30" />
      <div className="absolute -right-20 top-0 -z-10 h-72 w-72 rounded-full bg-green-400/15 blur-3xl" />
      <div className="section-shell">
        <p className="section-kicker !text-green-300">Layanan Digital</p>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold sm:text-5xl">Cek Pembayaran & {recordLabel}</h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/60">Akses informasi administrasi secara cepat dan mandiri menggunakan nomor induk.</p>
        <div className="mt-8 flex max-w-xl flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur sm:flex-row">
          <input
            value={nis}
            onChange={(e) => setNis(e.target.value)}
            placeholder={`Masukkan NIS / kode unik ${personLabel}`}
            className="min-h-12 flex-1 rounded-xl border border-white/10 bg-green-950/40 px-4 text-white placeholder:text-white/40 outline-none"
          />
          <button
            onClick={handleCek}
            disabled={loading}
            className="min-h-12 rounded-xl bg-green-500 px-6 font-bold text-green-950 transition hover:bg-green-200 disabled:opacity-60"
          >
            {loading ? 'Cek...' : 'Cek'}
          </button>
        </div>
        {error && <p className="mt-4 text-red-300 text-sm">{error}</p>}
        {result && peserta ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded bg-white/10 p-5">
              <h3 className="font-semibold text-yellow-300 mb-3">Data {personLabel}</h3>
              {[
                ['Nama', peserta.nama],
                ['NIS', peserta.nis],
                ['Kelas', peserta.kelas],
                ['Status', peserta.status],
              ].map(([label, value]) => (
                <div key={label as string} className="flex gap-2 border-b border-white/10 py-2 text-sm">
                  <span className="w-24 shrink-0 text-white/60">{label as string}</span>
                  <span className="text-white">{String(value ?? '-')}</span>
                </div>
              ))}
            </div>

            <div className="grid gap-4">
              <div className="rounded bg-white/10 p-5">
                <h3 className="font-semibold text-yellow-300">Ringkasan Pembayaran</h3>
                <div className="mt-3 grid gap-2">
                  {tagihan.length ? tagihan.slice(0, 6).map((item, index) => (
                    <div key={String(item.id || index)} className="rounded border border-white/10 bg-white/5 p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <span>{String(item.jenis_tagihan || 'Tagihan')}</span>
                        <span className="font-semibold capitalize">{String(item.status || '-').replace(/_/g, ' ')}</span>
                      </div>
                      <div className="mt-2 text-white/65">
                        Nominal {formatCurrency(item.nominal)} - Sisa {formatCurrency(item.sisa_tagihan)}
                      </div>
                    </div>
                  )) : <p className="text-sm text-white/60">Belum ada tagihan tercatat.</p>}
                </div>
              </div>

              <div className="rounded bg-white/10 p-5">
                <h3 className="font-semibold text-yellow-300">Raport Terpublish</h3>
                <div className="mt-3 grid gap-2">
                  {raport.length ? raport.map((item, index) => {
                    const url = raportPdfUrl(item.pdf_url);
                    return (
                      <div key={String(item.periode || index)} className="rounded border border-white/10 bg-white/5 p-3 text-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold">{String(item.periode || '-')}</p>
                            <p className="mt-1 text-white/55">Publish: {item.published_at ? new Date(String(item.published_at)).toLocaleDateString('id-ID') : '-'}</p>
                          </div>
                          {url ? (
                            <a href={url} target="_blank" rel="noreferrer" className="inline-flex justify-center rounded bg-green-500 px-4 py-2 font-bold text-green-950">
                              Buka PDF
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  }) : <p className="text-sm text-white/60">Raport belum dipublish admin.</p>}
                </div>
              </div>

              {entitas === 'pesantren' ? (
                <div className="rounded bg-white/10 p-5">
                  <h3 className="font-semibold text-yellow-300">Riwayat Perizinan</h3>
                  <div className="mt-3 grid gap-2">
                    {perizinan.length ? perizinan.map((item, index) => {
                      const url = izinPdfUrl(item.file_url);
                      return (
                        <div key={String(item.id || index)} className="rounded border border-white/10 bg-white/5 p-3 text-sm">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold">{String(item.jenis_izin || 'Izin')} - {izinStatusLabel(item.status)}</p>
                              <p className="mt-1 text-white/55">
                                {item.tanggal_mulai ? new Date(String(item.tanggal_mulai)).toLocaleDateString('id-ID') : '-'}
                                {item.tanggal_selesai ? ` s.d. ${new Date(String(item.tanggal_selesai)).toLocaleDateString('id-ID')}` : ''}
                              </p>
                              {item.waktu_kembali_aktual ? (
                                <p className="mt-1 font-semibold text-green-300">Sudah kembali: {formatPublicDateTime(item.waktu_kembali_aktual)}</p>
                              ) : null}
                              <p className="mt-1 text-white/65">{String(item.tujuan || item.alasan || '-')}</p>
                            </div>
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer" className="inline-flex justify-center rounded bg-green-500 px-4 py-2 font-bold text-green-950">
                                Buka Surat
                              </a>
                            ) : null}
                          </div>
                        </div>
                      );
                    }) : <p className="text-sm text-white/60">Belum ada catatan perizinan.</p>}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : result ? (
          <div className="mt-6 rounded bg-white/10 p-5 max-w-lg">
            <h3 className="font-semibold text-yellow-300 mb-3">Data {personLabel}</h3>
            {Object.entries(result)
              .filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k))
              .map(([k, v]) => (
                <div key={k} className="flex gap-2 text-sm border-b border-white/10 py-2">
                  <span className="text-white/60 w-32 shrink-0 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="text-white">{String(v ?? '-')}</span>
                </div>
              ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ---------- SectionSaranKritik ----------
export function SectionSaranKritik({
  entitas,
  entityLabel,
}: {
  entitas: string;
  entityLabel: string;
}) {
  const [form, setForm] = useState({ nama: '', pesan: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pesan.trim()) return;
    setLoading(true);
    setStatus('');

    const { error } = await supabase.from('lp_saran').insert({
      entitas,
      nama: form.nama.trim() || 'Anonim',
      pesan: form.pesan.trim(),
    });

    setLoading(false);
    if (error) {
      setStatus('Gagal mengirim pesan. Silakan coba lagi.');
    } else {
      setForm({ nama: '', pesan: '' });
      setStatus('Pesan berhasil dikirim. Terima kasih!');
    }
  };

  return (
    <section id="saran" className="section-shell py-20 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
        <div>
          <p className="section-kicker">Ruang Aspirasi</p>
          <h2 className="section-title">Saran & Kritik untuk {entityLabel}</h2>
          <p className="mt-5 max-w-md leading-7 text-slate-600">Masukan Anda membantu kami menghadirkan layanan pendidikan yang terus bertumbuh dan lebih baik.</p>
        </div>
      <form onSubmit={handleSubmit} className="premium-card grid gap-4 p-5 sm:p-8">
        <label className="grid gap-2 text-sm font-semibold text-gray-700">
          Nama (opsional)
          <input
            value={form.nama}
            onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
            placeholder="Nama Anda"
            className="min-h-12 rounded-xl border border-green-900/10 bg-[#f9f8f4] px-4 font-normal outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-gray-700">
          Pesan *
          <textarea
            value={form.pesan}
            onChange={(e) => setForm((f) => ({ ...f, pesan: e.target.value }))}
            rows={4}
            placeholder="Tuliskan saran atau kritik Anda..."
            className="rounded-xl border border-green-900/10 bg-[#f9f8f4] px-4 py-3 font-normal outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-green-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-green-800 disabled:opacity-60"
        >
          {loading ? 'Mengirim...' : 'Kirim Pesan'}
        </button>
        {status && <p className="text-sm text-green-700 font-medium">{status}</p>}
      </form>
      </div>
    </section>
  );
}
