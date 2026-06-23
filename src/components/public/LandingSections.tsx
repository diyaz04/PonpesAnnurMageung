import React, { useState } from 'react';
import { Shield, BookOpen, Users, ChevronRight, CheckCircle2, TrendingUp, Landmark, LineChart, GraduationCap, MapPin, Phone, Mail } from 'lucide-react';
import { Button } from '../ui/Button';

// SMP Maarif NU Landing Page Components
export function SmpHero() {
  return (
    <div className="relative bg-[#001524] text-white min-h-[90vh] flex items-center pt-16">
      {/* Background with overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{
          backgroundImage: `url("https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop")`
        }}
      ></div>
      
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
            <Button size="lg" className="bg-[#E5B869] hover:bg-[#D4A055] text-[#001524] font-bold text-lg px-8">
              Daftar Sekarang
            </Button>
            <Button size="lg" variant="outline" className="border-[#E5B869] text-[#E5B869] hover:bg-[#E5B869]/10 text-lg px-8">
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
                  <h3 className="text-2xl font-bold mb-1">Akretditasi A</h3>
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
      icon: <BookOpen className="w-8 h-8" />,
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
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold text-[#E5B869] tracking-wider uppercase mb-3">Keunggulan Kami</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-[#001524] mb-6 font-serif">Mengapa Memilih SMP Maarif NU?</h3>
          <p className="text-gray-600 text-lg">
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
        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
          <div className="max-w-2xl">
            <h2 className="text-sm font-bold text-[#E5B869] tracking-wider uppercase mb-3">Program Unggulan</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-[#001524] font-serif">Pengembangan Potensi Siswa</h3>
          </div>
          <Button variant="outline" className="mt-6 md:mt-0 border-[#001524] text-[#001524] hover:bg-[#001524] hover:text-white">
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
    <div className="relative bg-[#001524] text-white min-h-[90vh] flex items-center pt-16">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{
          backgroundImage: `url("https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=2076&auto=format&fit=crop")`
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#001524] to-transparent z-0"></div>
      
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
            <Button size="lg" className="bg-[#E5B869] hover:bg-[#D4A055] text-[#001524] font-bold text-lg px-8">
              Pendaftaran Online
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white hover:text-[#001524] text-lg px-8">
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
    <section className="py-24 bg-gray-50 pt-32 md:pt-40">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-[#E5B869] rounded-2xl transform rotate-3 scale-105 opacity-20"></div>
            <img 
              src="https://images.unsplash.com/photo-1604928141064-207cea6f571f?q=80&w=2070&auto=format&fit=crop" 
              alt="Santri mengaji" 
              className="relative rounded-2xl shadow-xl z-10 w-full object-cover h-[500px]"
            />
            <div className="absolute -bottom-8 -right-8 bg-[#001524] text-white p-6 rounded-xl shadow-xl z-20 hidden md:block">
              <div className="text-4xl font-bold text-[#E5B869] mb-1">1998</div>
              <div className="text-sm font-medium">Tahun Berdiri</div>
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
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#E5B869] rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform -translate-x-1/2 translate-y-1/2"></div>
      
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