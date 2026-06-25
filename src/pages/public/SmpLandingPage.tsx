import {
  ArrowUpRight,
  BookOpenCheck,
  ChevronRight,
  FileUp,
  GraduationCap,
  Menu,
  Phone,
  ScanFace,
  Send,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  SectionAgenda,
  SectionBerita,
  SectionGaleri,
  SectionSaranKritik,
  SeksiCekPembayaran,
} from "../../components/public/LandingSections";
import { smpLogoUrl } from "../../lib/brandLogos";
import { supabase } from "../../lib/supabase";

type ContentRow = {
  id: string;
  section: string;
  key: string;
  value: string | null;
};

type LeaderItem = {
  nama: string;
  jabatan: string;
  deskripsi: string;
  foto_url: string;
};

type FacilityItem = {
  nama: string;
  deskripsi: string;
  foto_url: string;
};

type SpmbForm = {
  nama_lengkap: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  alamat: string;
  nama_orang_tua: string;
  no_hp: string;
  asal_sekolah: string;
};

const fallbackHero =
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1400&q=80";

const fallbackLeader =
  "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80";

const defaultLeaders: LeaderItem[] = [
  {
    nama: "Kepala SMP Ma'arif NU Sariwangi",
    jabatan: "Kepala Sekolah",
    deskripsi:
      "Memimpin pengembangan pembelajaran, pembinaan karakter, dan layanan peserta didik.",
    foto_url: fallbackLeader,
  },
];

const defaultFacilities: FacilityItem[] = [
  {
    nama: "Ruang Kelas",
    deskripsi: "Ruang belajar untuk kegiatan akademik dan pembinaan kelas.",
    foto_url:
      "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=900&q=80",
  },
  {
    nama: "Perpustakaan",
    deskripsi: "Sumber bacaan dan literasi untuk menunjang pembelajaran siswa.",
    foto_url:
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80",
  },
  {
    nama: "Laboratorium",
    deskripsi: "Fasilitas praktik untuk menguatkan pemahaman sains dan teknologi.",
    foto_url:
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80",
  },
];

function safeJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isEnabled(value?: string) {
  return ["true", "1", "aktif", "active", "yes"].includes(
    (value || "").trim().toLowerCase(),
  );
}

function getBackgroundOpacity(value?: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.35;
  return Math.min(100, Math.max(0, parsed)) / 100;
}

export default function SmpLandingPage() {
  const [contentRows, setContentRows] = useState<ContentRow[]>([]);
  const [activeProfile, setActiveProfile] = useState("visi");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [spmbOpen, setSpmbOpen] = useState(false);
  const [spmbForm, setSpmbForm] = useState<SpmbForm>({
    nama_lengkap: "",
    jenis_kelamin: "",
    tanggal_lahir: "",
    alamat: "",
    nama_orang_tua: "",
    no_hp: "",
    asal_sekolah: "",
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [spmbStatus, setSpmbStatus] = useState("");
  const [spmbLoading, setSpmbLoading] = useState(false);

  useEffect(() => {
    async function loadContent() {
      const { data } = await supabase
        .from("lp_konten")
        .select("id, section, key, value")
        .eq("entitas", "smp");

      if (data) setContentRows(data as ContentRow[]);
    }

    loadContent();
  }, []);

  const content = useMemo(() => {
    return contentRows.reduce<Record<string, Record<string, string>>>((acc, row) => {
      acc[row.section] = acc[row.section] || {};
      acc[row.section][row.key] = row.value || "";
      return acc;
    }, {});
  }, [contentRows]);

  const getContent = (section: string, key: string, fallback: string) =>
    content[section]?.[key] || fallback;

  const spmbActive = isEnabled(content.spmb?.active);

  const navItems = [
    { href: "#beranda", label: "Beranda" },
    { href: "#profil", label: "Profil" },
    spmbActive ? { href: "#spmb", label: "SPMB" } : null,
    { href: "#berita", label: "Berita" },
    { href: "#agenda", label: "Agenda" },
    { href: "#galeri", label: "Galeri" },
    { href: "#cek-santri", label: "Cek Pembayaran dan Record santri" },
    { href: "#saran", label: "Saran & Kritik" },
  ].filter(Boolean) as { href: string; label: string }[];

  // No navItem needed for presensi — handled via dedicated button

  const leaders = useMemo(() => {
    const parsed = contentRows
      .filter((row) => row.section === "pimpinan")
      .map((row) => safeJson<LeaderItem>(row.value))
      .filter(Boolean) as LeaderItem[];

    if (parsed.length) return parsed;
    if (content.pimpinan?.nama) {
      return [
        {
          nama: content.pimpinan.nama,
          jabatan: content.pimpinan.jabatan || "Kepala Sekolah",
          deskripsi:
            content.pimpinan.deskripsi ||
            "Memimpin pengembangan pembelajaran dan pembinaan siswa.",
          foto_url: content.pimpinan.foto_url || fallbackLeader,
        },
      ];
    }
    return defaultLeaders;
  }, [contentRows, content]);

  const facilities = useMemo(() => {
    const parsed = contentRows
      .filter((row) => row.section === "fasilitas")
      .map((row) => safeJson<FacilityItem>(row.value))
      .filter(Boolean) as FacilityItem[];

    return parsed.length ? parsed : defaultFacilities;
  }, [contentRows]);

  async function handleSpmbSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSpmbStatus("");

    if (
      !spmbForm.nama_lengkap.trim() ||
      !spmbForm.jenis_kelamin ||
      !spmbForm.nama_orang_tua.trim() ||
      !spmbForm.no_hp.trim()
    ) {
      setSpmbStatus("Lengkapi nama calon siswa, jenis kelamin, orang tua/wali, dan nomor HP.");
      return;
    }

    setSpmbLoading(true);
    let dokumenUrl: string | null = null;

    if (documentFile) {
      const extension = documentFile.name.split(".").pop() || "file";
      const filePath = `smp/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage
        .from("spmb-dokumen")
        .upload(filePath, documentFile, { upsert: false });

      if (upload.error) {
        setSpmbLoading(false);
        setSpmbStatus("Dokumen belum berhasil diunggah. Silakan coba lagi.");
        return;
      }
      dokumenUrl = upload.data.path;
    }

    const { error } = await supabase.from("smp_spmb_pendaftar").insert({
      nama_lengkap: spmbForm.nama_lengkap.trim(),
      jenis_kelamin: spmbForm.jenis_kelamin || null,
      tanggal_lahir: spmbForm.tanggal_lahir || null,
      alamat: spmbForm.alamat.trim() || null,
      nama_orang_tua: spmbForm.nama_orang_tua.trim() || null,
      no_hp: spmbForm.no_hp.trim() || null,
      asal_sekolah: spmbForm.asal_sekolah.trim() || null,
      dokumen_url: dokumenUrl,
    });
    setSpmbLoading(false);

    if (error) {
      setSpmbStatus("Pendaftaran belum terkirim. Silakan coba lagi.");
      return;
    }

    setSpmbForm({
      nama_lengkap: "",
      jenis_kelamin: "",
      tanggal_lahir: "",
      alamat: "",
      nama_orang_tua: "",
      no_hp: "",
      asal_sekolah: "",
    });
    setDocumentFile(null);
    setSpmbStatus("Pendaftaran SPMB berhasil dikirim.");
  }

  const heroTitle = getContent("hero", "headline", "SMP Ma'arif NU Sariwangi");
  const heroSubtitle = getContent(
    "hero",
    "subheadline",
    "Membentuk siswa berilmu, berkarakter, dan dekat dengan nilai keislaman.",
  );
  const heroImage = getContent("hero", "banner_url", fallbackHero);
  const heroBackgroundOpacity = getBackgroundOpacity(
    getContent("hero", "background_opacity", "35"),
  );
  const logoUrl = getContent("hero", "logo_url", smpLogoUrl);

  return (
    <div className="public-page">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/95 text-white shadow-[0_10px_40px_rgba(7,21,33,.16)] backdrop-blur-xl">
        <nav className="section-shell flex h-[76px] items-center justify-between">
          <a href="#beranda" className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo SMP Ma'arif NU Sariwangi"
                className="h-12 w-12 rounded-2xl border border-white/15 bg-white object-contain p-1 shadow-lg"
              />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold text-sm font-black text-navy">
                SMP
              </span>
            )}
            <span className="leading-tight">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-soft">
                SMP Ma'arif NU
              </span>
              <span className="mt-1 block text-sm font-bold text-white">Sariwangi</span>
            </span>
          </a>

          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-[13px] font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/smp/presensi"
              className="ml-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-[13px] font-bold text-emerald-300 transition hover:-translate-y-0.5 hover:bg-emerald-400/20"
            >
              <ScanFace size={15} />
              Presensi Digital
            </Link>
            <Link
              to="/admin/smp"
              className="ml-2 inline-flex items-center justify-center rounded-full border border-gold/40 bg-gold px-4 py-2.5 text-[13px] font-bold text-navy transition hover:-translate-y-0.5 hover:bg-gold-soft"
            >
              Login Dashboard
            </Link>
          </div>

          <button
            type="button"
            aria-label="Buka menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white lg:hidden"
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        {mobileOpen ? (
          <div className="border-t border-white/10 bg-navy-950 px-4 py-4 shadow-2xl lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-1">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <Link
                to="/smp/presensi"
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300"
                onClick={() => setMobileOpen(false)}
              >
                <ScanFace size={16} />
                Presensi Digital
              </Link>
              <Link
                to="/admin/smp"
                className="mt-1 inline-flex items-center justify-center rounded-xl bg-gold px-4 py-3 text-sm font-bold text-navy"
                onClick={() => setMobileOpen(false)}
              >
                Login Dashboard SMP
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <section id="beranda" className="relative isolate overflow-hidden bg-navy text-white">
        <div className="absolute inset-0 -z-20">
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
            style={{ opacity: heroBackgroundOpacity }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/90 to-navy/75" />
          <div className="absolute inset-0 bg-navy/25" />
        </div>
        <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:52px_52px] opacity-40" />
        <div className="absolute -right-32 top-16 -z-10 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
        <div className="section-shell grid min-h-[calc(100svh-76px)] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
          <div className="relative z-10 min-w-0">
            <p className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 px-3 py-2 text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-gold-soft sm:rounded-full sm:px-4 sm:text-xs sm:tracking-[0.18em]">
              <Sparkles className="shrink-0" size={15} />
              <span>Sekolah Islam Berbasis Karakter</span>
            </p>
            <h1 className="mt-7 max-w-3xl break-words font-display text-4xl font-bold leading-[1.04] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
              {heroSubtitle}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              {spmbActive ? (
                <a
                  href={getContent("hero", "cta_primary_url", "#spmb")}
                  className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-navy shadow-glow transition hover:-translate-y-0.5 hover:bg-gold-soft"
                >
                  {getContent("hero", "cta_primary_text", "Daftar SPMB")}
                  <ArrowUpRight className="ml-2" size={18} />
                </a>
              ) : null}
              <a
                href="#profil"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
              >
                Lihat Profil
              </a>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 border-t border-white/10 pt-7">
              {[
                ["Holistik", "Akademik & Akhlak"],
                ["Adaptif", "Pembelajaran"],
                ["Terarah", "Pengembangan Bakat"],
              ].map(([value, label]) => (
                <div key={label}>
                  <p className="font-display text-xl font-bold text-gold-soft sm:text-2xl">{value}</p>
                  <p className="mt-1 text-[11px] leading-4 text-white/50 sm:text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto min-w-0 w-full max-w-xl lg:ml-auto">
            <div className="absolute -left-5 top-12 h-32 w-32 rounded-full border border-gold/20" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-2 shadow-2xl backdrop-blur">
              <img
                src={heroImage}
                alt="Foto SMP Ma'arif NU Sariwangi"
                className="aspect-[4/5] w-full rounded-[1.55rem] object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
              />
              <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/20 bg-navy/80 p-4 backdrop-blur-xl sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold text-navy">
                    <BookOpenCheck size={21} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">Belajar, bertumbuh, berkarakter</p>
                    <p className="mt-1 text-xs leading-5 text-white/60">
                      Akademik, akhlak, literasi, dan kedisiplinan yang seimbang.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-card animate-float-slow absolute -left-3 top-8 hidden rounded-2xl p-3 sm:flex sm:items-center sm:gap-3 lg:-left-14">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-navy"><Trophy size={20} /></span>
              <div><p className="text-xs font-bold">Potensi Maksimal</p><p className="text-[11px] text-white/55">Akademik & nonakademik</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="profil" className="section-shell py-20 sm:py-24">
        <div className="max-w-3xl">
          <p className="section-kicker">
            Profil Sekolah
          </p>
          <h2 className="section-title">
            Ruang belajar formal yang tumbuh bersama lingkungan pesantren.
          </h2>
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
          {[
            ["visi", "Visi & Misi"],
            ["sejarah", "Sejarah Singkat"],
            ["pimpinan", "Pimpinan Sekolah"],
            ["tertib", "Tata Tertib"],
            ["fasilitas", "Fasilitas"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveProfile(key)}
              className={[
                "shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition",
                activeProfile === key
                  ? "border-navy bg-navy text-white shadow-lg"
                  : "border-navy/10 bg-white text-slate-600 hover:border-navy/25 hover:text-navy",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {activeProfile === "visi" ? (
            <div className="grid gap-5 md:grid-cols-2">
              <article className="premium-card p-6 sm:p-8">
                <h3 className="font-display text-2xl font-bold text-navy">Visi</h3>
                <p className="mt-4 leading-7 text-gray-700">
                  {getContent(
                    "profil",
                    "visi",
                    "Terwujudnya peserta didik yang beriman, berilmu, berakhlak, dan berdaya saing.",
                  )}
                </p>
              </article>
              <article className="premium-card p-6 sm:p-8">
                <h3 className="font-display text-2xl font-bold text-navy">Misi</h3>
                <p className="mt-4 whitespace-pre-line leading-7 text-gray-700">
                  {getContent(
                    "profil",
                    "misi",
                    "Menyelenggarakan pembelajaran yang aktif, membina karakter dan disiplin, serta menguatkan budaya literasi dan keagamaan.",
                  )}
                </p>
              </article>
            </div>
          ) : null}

          {activeProfile === "sejarah" ? (
            <article className="premium-card p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-navy">
                Sejarah Singkat
              </h3>
              <p className="mt-4 whitespace-pre-line leading-8 text-gray-700">
                {getContent(
                  "profil",
                  "sejarah",
                  "SMP Ma'arif NU Sariwangi hadir sebagai lembaga pendidikan formal yang mendukung kebutuhan belajar masyarakat dan lingkungan pesantren dengan nilai keislaman, kedisiplinan, dan pengembangan potensi siswa.",
                )}
              </p>
            </article>
          ) : null}

          {activeProfile === "pimpinan" ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {leaders.map((leader) => (
                <article key={leader.nama} className="premium-card group p-4">
                  <img
                    src={leader.foto_url || fallbackLeader}
                    alt={leader.nama}
                    className="image-zoom aspect-[4/3] w-full rounded-2xl object-cover"
                  />
                  <h3 className="mt-4 text-lg font-semibold text-gray-950">
                    {leader.nama}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-navy-mid">
                    {leader.jabatan}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {leader.deskripsi}
                  </p>
                </article>
              ))}
            </div>
          ) : null}

          {activeProfile === "tertib" ? (
            <article className="premium-card p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-navy">Tata Tertib</h3>
              <p className="mt-4 whitespace-pre-line leading-8 text-gray-700">
                {getContent(
                  "profil",
                  "tata_tertib",
                  "Siswa wajib mengikuti kegiatan pembelajaran, menjaga kedisiplinan, menghormati guru dan sesama, menjaga kebersihan, serta menaati aturan sekolah.",
                )}
              </p>
            </article>
          ) : null}

          {activeProfile === "fasilitas" ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {facilities.map((facility) => (
                <article
                  key={facility.nama}
                  className="premium-card group overflow-hidden"
                >
                  <img
                    src={facility.foto_url}
                    alt={facility.nama}
                    className="image-zoom aspect-[4/3] w-full object-cover"
                  />
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-gray-950">
                      {facility.nama}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {facility.deskripsi}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {spmbActive ? (
        <section id="spmb" className="relative isolate overflow-hidden bg-navy py-20 text-white sm:py-24">
          <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:52px_52px] opacity-30" />
          <div className="section-shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="section-kicker !text-gold-soft">
                SPMB
              </p>
              <h2 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
                Seleksi Penerimaan Murid Baru
              </h2>
              <p className="mt-4 leading-7 text-cream-50">
                {getContent(
                  "spmb",
                  "deskripsi",
                  "Pendaftaran calon siswa baru SMP Ma'arif NU Sariwangi dibuka sesuai jadwal resmi sekolah.",
                )}
              </p>
              <button
                type="button"
                onClick={() => setSpmbOpen(true)}
                className="mt-7 inline-flex items-center rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-navy shadow-glow transition hover:-translate-y-0.5 hover:bg-gold-soft"
              >
                Isi Form Pendaftaran
                <Send className="ml-2" size={17} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Jadwal", getContent("spmb", "jadwal", "Informasi jadwal menyusul.")],
                ["Syarat", getContent("spmb", "syarat", "Mengisi formulir dan melengkapi dokumen pendaftaran.")],
                ["Alur", getContent("spmb", "alur", "Daftar online, verifikasi berkas, seleksi, dan pengumuman.")],
                ["Biaya", getContent("spmb", "biaya", "Informasi biaya pendaftaran menyusul.")],
              ].map(([title, text]) => (
                <article key={title} className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <h3 className="font-semibold text-gold-soft">{title}</h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-cream-50">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <SectionBerita
        entitas="smp"
        entityLabel="SMP Ma'arif NU Sariwangi"
        detailBasePath="/smp/berita"
      />
      <SectionAgenda entitas="smp" entityLabel="SMP" />
      <SectionGaleri entitas="smp" />
      <SeksiCekPembayaran
        entitas="smp"
        personLabel="siswa"
        recordLabel="Record Siswa"
      />

      {/* ── Presensi Digital Section ───────────────────────── */}
      <section id="presensi-digital" className="relative isolate overflow-hidden bg-navy py-20 text-white sm:py-24">
        <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:52px_52px] opacity-25" />
        <div className="absolute -left-20 top-0 -z-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 -z-10 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="section-shell">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="section-kicker !text-emerald-400/80">
                Presensi Digital
              </p>
              <h2 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-5xl">
                Absensi siswa lebih cepat dengan <span className="text-gold-soft">Face Recognition</span>
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-white/60">
                Sistem presensi berbasis pengenalan wajah secara real-time. Siswa cukup menghadap kamera — absensi tercatat otomatis tanpa perlu tanda tangan atau kartu.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/smp/presensi"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-400"
                >
                  <ScanFace size={18} />
                  Buka Halaman Presensi
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "⚡", title: "Real-time", desc: "Deteksi wajah otomatis setiap 1.2 detik" },
                { icon: "🔒", title: "Aman", desc: "Dilindungi kode akses khusus guru/admin" },
                { icon: "📊", title: "Rekap Instan", desc: "Data kehadiran langsung tersimpan ke sistem" },
                { icon: "🎯", title: "Akurat", desc: "Akurasi tinggi dengan model AI face-api.js" },
              ].map(({ icon, title, desc }) => (
                <article key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <span className="text-2xl">{icon}</span>
                  <h3 className="mt-3 font-semibold text-white">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-white/50">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SectionSaranKritik entitas="smp" entityLabel="SMP Ma'arif NU Sariwangi" />

      <footer className="border-t border-white/10 bg-navy-950 text-white">
        <div className="section-shell grid gap-8 py-12 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              SMP Ma'arif NU Sariwangi
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-white/55">
              {getContent(
                "footer",
                "alamat",
                "Sariwangi, Tasikmalaya, Jawa Barat",
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/65">
              <span className="inline-flex items-center gap-2">
                <Phone size={16} />
                {getContent("footer", "telepon", getContent("footer", "wa", "-"))}
              </span>
              <span>{getContent("footer", "email", "info@smpmaarifnusariwangi.sch.id")}</span>
            </div>
          </div>
          <div>
            <p className="font-semibold text-white">Media Sosial</p>
            <div className="mt-3 grid gap-2 text-sm">
              {["facebook", "instagram", "youtube"].map((item) => {
                const url = content.footer?.[item];
                return url ? (
                  <a
                    key={item}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="capitalize text-gold-soft hover:text-white"
                  >
                    {item}
                  </a>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </footer>

      {spmbOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/80 p-4 backdrop-blur-sm">
          <div className="mx-auto my-8 max-w-3xl rounded-[1.5rem] bg-white p-5 shadow-card sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-dark">
                  Form SPMB
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-gray-950">
                  Pendaftaran Calon Siswa
                </h2>
              </div>
              <button
                type="button"
                aria-label="Tutup form SPMB"
                onClick={() => setSpmbOpen(false)}
                className="grid h-10 w-10 place-items-center rounded border border-gray-200 text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSpmbSubmit} className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-gray-700">
                  Nama lengkap calon siswa
                  <input
                    value={spmbForm.nama_lengkap}
                    onChange={(event) =>
                      setSpmbForm((form) => ({
                        ...form,
                        nama_lengkap: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-navy-light"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-gray-700">
                  Jenis kelamin
                  <select
                    value={spmbForm.jenis_kelamin}
                    onChange={(event) =>
                      setSpmbForm((form) => ({
                        ...form,
                        jenis_kelamin: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-navy-light"
                  >
                    <option value="">Pilih</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-gray-700">
                  Tanggal lahir
                  <input
                    type="date"
                    value={spmbForm.tanggal_lahir}
                    onChange={(event) =>
                      setSpmbForm((form) => ({
                        ...form,
                        tanggal_lahir: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-navy-light"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-gray-700">
                  Asal sekolah
                  <input
                    value={spmbForm.asal_sekolah}
                    onChange={(event) =>
                      setSpmbForm((form) => ({
                        ...form,
                        asal_sekolah: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-navy-light"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-gray-700">
                  Nama orang tua/wali
                  <input
                    value={spmbForm.nama_orang_tua}
                    onChange={(event) =>
                      setSpmbForm((form) => ({
                        ...form,
                        nama_orang_tua: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-navy-light"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-gray-700">
                  Nomor HP
                  <input
                    value={spmbForm.no_hp}
                    onChange={(event) =>
                      setSpmbForm((form) => ({ ...form, no_hp: event.target.value }))
                    }
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-navy-light"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-gray-700">
                Alamat
                <textarea
                  value={spmbForm.alamat}
                  onChange={(event) =>
                    setSpmbForm((form) => ({ ...form, alamat: event.target.value }))
                  }
                  rows={3}
                  className="rounded border border-gray-200 px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-navy-light"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-gray-700">
                Upload dokumen
                <span className="flex min-h-12 items-center gap-3 rounded border border-dashed border-gray-300 px-3 text-sm font-normal text-gray-600">
                  <FileUp size={18} />
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) =>
                      setDocumentFile(event.target.files?.[0] || null)
                    }
                    className="w-full text-sm"
                  />
                </span>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={spmbLoading}
                  className="inline-flex items-center justify-center rounded bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy disabled:opacity-70"
                >
                  <GraduationCap className="mr-2" size={18} />
                  {spmbLoading ? "Mengirim..." : "Kirim Pendaftaran"}
                </button>
                {spmbStatus ? (
                  <p className="text-sm font-medium text-navy-mid">{spmbStatus}</p>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
