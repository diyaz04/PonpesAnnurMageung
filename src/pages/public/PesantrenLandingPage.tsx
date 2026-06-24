import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Menu,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { pesantrenLogoUrl } from "../../lib/brandLogos";
import { supabase } from "../../lib/supabase";

type ContentRow = {
  id: string;
  section: string;
  key: string;
  value: string | null;
};

type NewsRow = {
  id: string;
  judul: string;
  thumbnail_url: string | null;
  konten: string | null;
  excerpt: string | null;
  tanggal: string | null;
  created_at: string;
};

type AgendaRow = {
  id: string;
  judul: string;
  tanggal: string;
  lokasi: string | null;
  deskripsi: string | null;
};

type GalleryRow = {
  id: string;
  album: string | null;
  media_url: string;
  tipe: "foto" | "video";
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

type LookupBill = {
  id: string;
  jenis_tagihan: string | null;
  nominal: number;
  status: "belum_lunas" | "cicilan" | "lunas";
  jatuh_tempo: string | null;
  total_dibayar: number;
  sisa_tagihan: number;
  riwayat_pembayaran: {
    jumlah_bayar: number;
    tanggal_bayar: string;
    catatan: string | null;
    kuitansi_url: string | null;
  }[];
};

type LookupResult = {
  status: "ok" | "not_found" | "rate_limited";
  santri?: {
    foto_url: string | null;
    nama: string;
    nis: string;
    kelas: string;
    status: string;
  };
  tagihan?: LookupBill[];
  raport?: {
    mata_pelajaran: string;
    periode: string;
    nilai: string | null;
  }[];
};

const fallbackHero =
  "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1400&q=80";

const fallbackLeader =
  "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80";

const fallbackFacility =
  "https://images.unsplash.com/photo-1517164850305-99a3e65bb47e?auto=format&fit=crop&w=900&q=80";

const navItems = [
  { href: "#beranda", label: "Beranda" },
  { href: "#profil", label: "Profil" },
  { href: "#berita", label: "Berita" },
  { href: "#agenda", label: "Agenda" },
  { href: "#galeri", label: "Galeri" },
  { href: "#cek-santri", label: "Cek Pembayaran dan Record santri" },
  { href: "#saran", label: "Saran & Kritik" },
];

const defaultLeaders: LeaderItem[] = [
  {
    nama: "KH. Pengasuh Pesantren",
    jabatan: "Pimpinan Pondok Pesantren",
    deskripsi:
      "Membimbing pengembangan pendidikan, pembinaan akhlak, dan kegiatan santri sehari-hari.",
    foto_url: fallbackLeader,
  },
];

const defaultFacilities: FacilityItem[] = [
  {
    nama: "Asrama Santri",
    deskripsi: "Ruang tinggal santri yang mendukung pembiasaan ibadah dan belajar.",
    foto_url: fallbackFacility,
  },
  {
    nama: "Ruang Belajar",
    deskripsi: "Area pembelajaran untuk kajian kitab, kelas diniyah, dan pendampingan.",
    foto_url:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80",
  },
  {
    nama: "Masjid dan Aula",
    deskripsi: "Pusat kegiatan ibadah, pengajian, musyawarah, dan acara pesantren.",
    foto_url:
      "https://images.unsplash.com/photo-1564121211835-e88c852648ab?auto=format&fit=crop&w=900&q=80",
  },
];

const fallbackGallery: GalleryRow[] = [
  {
    id: "fallback-1",
    album: "Kegiatan",
    media_url:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80",
    tipe: "foto",
  },
  {
    id: "fallback-2",
    album: "Pesantren",
    media_url:
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80",
    tipe: "foto",
  },
  {
    id: "fallback-3",
    album: "Fasilitas",
    media_url: fallbackFacility,
    tipe: "foto",
  },
];

function formatDate(value?: string | null) {
  if (!value) return "Tanggal menyusul";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function safeJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function makeExcerpt(row: NewsRow) {
  if (row.excerpt) return row.excerpt;
  if (!row.konten) return "Baca informasi terbaru dari Pondok Pesantren An-Nur Mageung.";
  return row.konten.replace(/<[^>]+>/g, "").slice(0, 150);
}

function getClientLookupKey() {
  const storageKey = "pesantren_public_lookup_key";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const next =
    "web-" +
    (window.crypto?.randomUUID?.() ||
      Math.random().toString(36).slice(2) + Date.now().toString(36));
  window.localStorage.setItem(storageKey, next);
  return next;
}

function isLookupLimited() {
  const key = "pesantren_lookup_attempts";
  const now = Date.now();
  const attempts = JSON.parse(window.localStorage.getItem(key) || "[]") as number[];
  const recent = attempts.filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 5) {
    window.localStorage.setItem(key, JSON.stringify(recent));
    return true;
  }
  recent.push(now);
  window.localStorage.setItem(key, JSON.stringify(recent));
  return false;
}

export default function PesantrenLandingPage() {
  const [contentRows, setContentRows] = useState<ContentRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [agenda, setAgenda] = useState<AgendaRow[]>([]);
  const [gallery, setGallery] = useState<GalleryRow[]>([]);
  const [activeProfile, setActiveProfile] = useState("visi");
  const [activeAlbum, setActiveAlbum] = useState("Semua");
  const [lightbox, setLightbox] = useState<GalleryRow | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lookupCode, setLookupCode] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [suggestionForm, setSuggestionForm] = useState({
    nama: "",
    kontak: "",
    pesan: "",
  });
  const [suggestionStatus, setSuggestionStatus] = useState("");
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  useEffect(() => {
    async function loadLandingData() {
      const today = new Date().toISOString().slice(0, 10);

      const [contentResult, newsResult, agendaResult, galleryResult] =
        await Promise.all([
          supabase
            .from("lp_konten")
            .select("id, section, key, value")
            .eq("entitas", "pesantren"),
          supabase
            .from("lp_berita")
            .select("id, judul, thumbnail_url, konten, excerpt, tanggal, created_at")
            .eq("entitas", "pesantren")
            .order("tanggal", { ascending: false })
            .limit(6),
          supabase
            .from("lp_agenda")
            .select("id, judul, tanggal, lokasi, deskripsi")
            .eq("entitas", "pesantren")
            .gte("tanggal", today)
            .order("tanggal", { ascending: true })
            .limit(8),
          supabase
            .from("lp_galeri")
            .select("id, album, media_url, tipe")
            .eq("entitas", "pesantren")
            .order("created_at", { ascending: false })
            .limit(12),
        ]);

      if (contentResult.data) setContentRows(contentResult.data as ContentRow[]);
      if (newsResult.data) setNews(newsResult.data as NewsRow[]);
      if (agendaResult.data) setAgenda(agendaResult.data as AgendaRow[]);
      if (galleryResult.data?.length) setGallery(galleryResult.data as GalleryRow[]);
      else setGallery(fallbackGallery);
    }

    loadLandingData();
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
          jabatan: content.pimpinan.jabatan || "Pimpinan Pesantren",
          deskripsi:
            content.pimpinan.deskripsi ||
            "Membimbing arah pendidikan dan pembinaan santri.",
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

  const albums = useMemo(
    () => ["Semua", ...Array.from(new Set(gallery.map((item) => item.album || "Umum")))],
    [gallery],
  );

  const filteredGallery = useMemo(() => {
    if (activeAlbum === "Semua") return gallery;
    return gallery.filter((item) => (item.album || "Umum") === activeAlbum);
  }, [activeAlbum, gallery]);

  const heroTitle = getContent(
    "hero",
    "headline",
    "Pondok Pesantren An-Nur Mageung",
  );
  const heroSubtitle = getContent(
    "hero",
    "subheadline",
    "Membina santri berakhlak, berilmu, dan siap mengabdi untuk masyarakat.",
  );
  const heroImage = getContent("hero", "banner_url", fallbackHero);
  const logoUrl = getContent("hero", "logo_url", pesantrenLogoUrl);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookup(null);
    setLookupError("");

    const trimmedCode = lookupCode.trim();
    if (!trimmedCode) {
      setLookupError("Masukkan kode unik santri terlebih dahulu.");
      return;
    }

    if (isLookupLimited()) {
      setLookupError("Terlalu banyak percobaan. Silakan coba lagi dalam 1 menit.");
      return;
    }

    setLookupLoading(true);
    const { data, error } = await supabase.rpc("lookup_pesantren_student_record", {
      p_kode_unik: trimmedCode,
      p_client_key: getClientLookupKey(),
    });

    if (error) {
      const fallback = await supabase.rpc("get_public_payment_status", {
        p_kode_unik: trimmedCode,
      });

      setLookupLoading(false);
      if (fallback.error || !fallback.data?.length) {
        setLookupError("Kode tidak valid atau data belum tersedia.");
        return;
      }

      setLookup({
        status: "ok",
        santri: {
          foto_url: null,
          nama: fallback.data[0].anggota_nama,
          nis: "-",
          kelas: "-",
          status: "aktif",
        },
        tagihan: fallback.data.map((item: Record<string, unknown>) => ({
          id: String(item.tagihan_id),
          jenis_tagihan: String(item.jenis_tagihan || "Tagihan"),
          nominal: Number(item.nominal || 0),
          status: item.status as LookupBill["status"],
          jatuh_tempo: String(item.jatuh_tempo || ""),
          total_dibayar: Number(item.total_dibayar || 0),
          sisa_tagihan: Number(item.sisa_tagihan || 0),
          riwayat_pembayaran: [],
        })),
        raport: [],
      });
      return;
    }

    setLookupLoading(false);
    const result = data as LookupResult;
    if (result.status === "rate_limited") {
      setLookupError("Terlalu banyak percobaan. Silakan coba lagi dalam 1 menit.");
      return;
    }
    if (result.status !== "ok") {
      setLookupError("Kode tidak valid atau data belum tersedia.");
      return;
    }
    setLookup(result);
  }

  async function handleSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuggestionStatus("");

    if (!suggestionForm.pesan.trim()) {
      setSuggestionStatus("Pesan wajib diisi.");
      return;
    }

    setSuggestionLoading(true);
    const { error } = await supabase.from("lp_saran_kritik").insert({
      entitas: "pesantren",
      nama: suggestionForm.nama.trim() || null,
      kontak: suggestionForm.kontak.trim() || null,
      pesan: suggestionForm.pesan.trim(),
    });
    setSuggestionLoading(false);

    if (error) {
      setSuggestionStatus("Saran belum terkirim. Silakan coba lagi.");
      return;
    }

    setSuggestionForm({ nama: "", kontak: "", pesan: "" });
    setSuggestionStatus("Terima kasih. Saran dan kritik sudah tersimpan.");
  }

  async function downloadStudentSummary() {
    if (!lookup?.santri) return;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Rekap Pembayaran dan Record Santri", 14, 18);
    doc.setFontSize(11);
    doc.text(`Nama: ${lookup.santri.nama}`, 14, 32);
    doc.text(`NIS: ${lookup.santri.nis}`, 14, 39);
    doc.text(`Kelas/Angkatan: ${lookup.santri.kelas}`, 14, 46);
    doc.text(`Status: ${lookup.santri.status}`, 14, 53);

    let y = 68;
    doc.setFontSize(13);
    doc.text("Tagihan", 14, y);
    y += 8;
    doc.setFontSize(10);
    (lookup.tagihan || []).forEach((bill, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `${index + 1}. ${bill.jenis_tagihan || "Tagihan"} - ${bill.status} - ${formatCurrency(
          bill.sisa_tagihan,
        )}`,
        14,
        y,
      );
      y += 7;
    });

    y += 6;
    doc.setFontSize(13);
    doc.text("Ringkasan Raport", 14, y);
    y += 8;
    doc.setFontSize(10);
    (lookup.raport || []).slice(0, 12).forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `${item.mata_pelajaran} (${item.periode}): ${item.nilai || "-"}`,
        14,
        y,
      );
      y += 7;
    });

    doc.save(`rekap-${lookup.santri.nis || "santri"}.pdf`);
  }

  return (
    <div className="public-page">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/95 text-white shadow-[0_10px_40px_rgba(7,21,33,.16)] backdrop-blur-xl">
        <nav className="section-shell flex h-[76px] items-center justify-between">
          <a href="#beranda" className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Pondok Pesantren An-Nur Mageung"
                className="h-12 w-12 rounded-2xl border border-white/15 bg-white object-contain p-1 shadow-lg"
              />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold text-sm font-black text-navy">
                AN
              </span>
            )}
            <span className="leading-tight">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-soft">
                Pondok Pesantren
              </span>
              <span className="mt-1 block text-sm font-bold text-white">
                An-Nur Mageung
              </span>
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
              to="/admin/pesantren"
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
                to="/admin/pesantren"
                className="mt-2 inline-flex items-center justify-center rounded-xl bg-gold px-4 py-3 text-sm font-bold text-navy"
                onClick={() => setMobileOpen(false)}
              >
                Login Dashboard Pesantren
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <section id="beranda" className="relative isolate overflow-hidden bg-navy text-white">
        <div className="absolute inset-0 -z-20">
          <img src={heroImage} alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/95 to-navy/55" />
        </div>
        <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:52px_52px] opacity-40" />
        <div className="absolute -right-32 top-16 -z-10 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
        <div className="section-shell grid min-h-[calc(100svh-76px)] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
          <div className="relative z-10 min-w-0">
            <p className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 px-3 py-2 text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-gold-soft sm:rounded-full sm:px-4 sm:text-xs sm:tracking-[0.18em]">
              <Sparkles className="shrink-0" size={15} />
              <span>Pendidikan Islam & Pembinaan Karakter</span>
            </p>
            <h1 className="mt-7 max-w-3xl break-words font-display text-4xl font-bold leading-[1.04] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
              {heroSubtitle}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href={getContent("hero", "cta_primary_url", "#saran")}
                className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-navy shadow-glow transition hover:-translate-y-0.5 hover:bg-gold-soft"
              >
                {getContent("hero", "cta_primary_text", "Daftar Santri Baru")}
                <ArrowUpRight className="ml-2" size={18} />
              </a>
              <a
                href="#profil"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
              >
                Lihat Profil
              </a>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 border-t border-white/10 pt-7">
              {[
                ["24 Jam", "Pembinaan"],
                ["Terpadu", "Agama & Akademik"],
                ["Beradab", "Budaya Santri"],
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
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-3xl bg-gold/20 blur-xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-2 shadow-2xl backdrop-blur">
              <img
                src={heroImage}
                alt="Foto Pondok Pesantren An-Nur Mageung"
                className="aspect-[4/5] w-full rounded-[1.55rem] object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
              />
              <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/20 bg-navy/80 p-4 backdrop-blur-xl sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold text-navy">
                    <BookOpen size={21} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">Pendidikan pesantren terpadu</p>
                    <p className="mt-1 text-xs leading-5 text-white/60">
                      Ilmu agama, adab, kemandirian, dan kepedulian sosial.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-card animate-float-slow absolute -left-3 top-8 hidden rounded-2xl p-3 sm:flex sm:items-center sm:gap-3 lg:-left-14">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-navy"><ShieldCheck size={20} /></span>
              <div><p className="text-xs font-bold">Lingkungan Aman</p><p className="text-[11px] text-white/55">Terarah & terpantau</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="profil" className="section-shell py-20 sm:py-24">
        <div className="max-w-3xl">
          <p className="section-kicker">
            Profil Pesantren
          </p>
          <h2 className="section-title">
            Lingkungan belajar, ibadah, dan pembinaan karakter santri.
          </h2>
        </div>

        <div className="mt-10 flex gap-2 overflow-x-auto pb-3">
          {[
            ["visi", "Visi & Misi"],
            ["sejarah", "Sejarah Singkat"],
            ["pimpinan", "Pimpinan Pesantren"],
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
                    "Terwujudnya santri yang beriman, berakhlakul karimah, berilmu, dan bermanfaat bagi umat.",
                  )}
                </p>
              </article>
              <article className="premium-card p-6 sm:p-8">
                <h3 className="font-display text-2xl font-bold text-navy">Misi</h3>
                <p className="mt-4 whitespace-pre-line leading-7 text-gray-700">
                  {getContent(
                    "profil",
                    "misi",
                    "Menyelenggarakan pendidikan agama yang kuat, membiasakan ibadah dan adab, serta menumbuhkan kemandirian santri.",
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
                  "Pondok Pesantren An-Nur Mageung tumbuh sebagai ruang pendidikan agama dan pembinaan masyarakat. Pesantren terus mengembangkan layanan pendidikan untuk santri dengan tetap menjaga nilai keilmuan, adab, dan khidmah.",
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
                  "Santri wajib mengikuti kegiatan pesantren, menjaga adab kepada guru dan sesama, memelihara kebersihan, menaati jadwal ibadah dan belajar, serta menjaga nama baik pesantren.",
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
                    src={facility.foto_url || fallbackFacility}
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

      <section className="relative isolate overflow-hidden bg-navy py-16 text-white">
        <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:52px_52px] opacity-30" />
        <div className="section-shell">
          <p className="section-kicker !text-gold-soft">
            Lembaga di Bawah Pesantren
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gold text-lg font-black text-navy shadow-glow">
                SMP
              </span>
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">SMP Ma'arif NU Sariwangi</h2>
                <p className="mt-3 max-w-2xl leading-7 text-cream-50">
                  Lembaga pendidikan formal yang mendukung ekosistem pembelajaran
                  pesantren melalui kurikulum sekolah, pembinaan karakter, dan
                  kegiatan siswa.
                </p>
              </div>
            </div>
            <Link
              to="/smp"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-bold text-navy transition hover:-translate-y-0.5 hover:bg-cream-100"
            >
              Kunjungi Website
              <ExternalLink className="ml-2" size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section id="berita" className="section-shell py-20 sm:py-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">
              Berita & Artikel
            </p>
            <h2 className="section-title">
              Kabar terbaru pesantren.
            </h2>
          </div>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {news.length ? (
            news.map((item) => (
              <Link
                key={item.id}
                to={`/berita/${item.id}`}
                className="premium-card group overflow-hidden"
              >
                <img
                  src={item.thumbnail_url || fallbackHero}
                  alt={item.judul}
                  className="image-zoom aspect-[16/10] w-full object-cover"
                />
                <div className="p-5">
                  <p className="text-sm text-navy-mid">
                    {formatDate(item.tanggal || item.created_at)}
                  </p>
                  <h3 className="mt-2 font-display text-xl font-bold leading-7 text-navy">
                    {item.judul}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {makeExcerpt(item)}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="premium-card p-6 text-sm text-gray-600 md:col-span-2 lg:col-span-3">
              Berita pesantren belum tersedia.
            </div>
          )}
        </div>
      </section>

      <section id="agenda" className="border-y border-navy/5 bg-white py-20 sm:py-24">
        <div className="section-shell">
          <p className="section-kicker">
            Agenda
          </p>
          <h2 className="section-title">
            Kegiatan terdekat.
          </h2>
          <div className="mt-8 grid gap-4">
            {agenda.length ? (
              agenda.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 rounded-2xl border border-navy/10 bg-[#f9f8f4] p-5 transition hover:border-gold/50 hover:shadow-soft md:grid-cols-[180px_1fr]"
                >
                  <div className="flex items-center gap-3 text-navy">
                    <CalendarDays size={22} />
                    <span className="font-semibold">{formatDate(item.tanggal)}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-950">
                      {item.judul}
                    </h3>
                    {item.lokasi ? (
                      <p className="mt-1 text-sm font-medium text-navy-mid">
                        {item.lokasi}
                      </p>
                    ) : null}
                    {item.deskripsi ? (
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {item.deskripsi}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded border border-navy/10 bg-krem-50 p-6 text-sm text-gray-600">
                Agenda terdekat belum tersedia.
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="galeri" className="section-shell py-20 sm:py-24">
        <p className="section-kicker">
          Galeri
        </p>
        <h2 className="section-title">
          Dokumentasi kegiatan dan fasilitas.
        </h2>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {albums.map((album) => (
            <button
              key={album}
              type="button"
              onClick={() => setActiveAlbum(album)}
              className={[
                "shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold",
                activeAlbum === album
                  ? "border-emerald-800 bg-navy text-white"
                  : "border-navy/15 bg-white text-gray-700",
              ].join(" ")}
            >
              {album}
            </button>
          ))}
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGallery.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightbox(item)}
              className="premium-card group overflow-hidden text-left"
            >
              {item.tipe === "video" ? (
                <div className="grid aspect-[4/3] place-items-center bg-navy text-white">
                  <ImageIcon size={32} />
                </div>
              ) : (
                <img
                  src={item.media_url}
                  alt={item.album || "Galeri pesantren"}
                  className="image-zoom aspect-[4/3] w-full object-cover"
                />
              )}
              <div className="p-4">
                <p className="text-sm font-semibold text-navy">
                  {item.album || "Umum"}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {item.tipe === "video" ? "Video" : "Foto"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section id="cek-santri" className="relative isolate overflow-hidden bg-navy py-20 text-white sm:py-24">
        <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:52px_52px] opacity-30" />
        <div className="section-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="section-kicker !text-gold-soft">
              Cek Pembayaran & Record Santri
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
              Masukkan kode unik untuk melihat data santri.
            </h2>
            <p className="mt-4 leading-7 text-cream-50">
              Sistem hanya menampilkan data jika kode unik cocok. Percobaan
              dibatasi untuk melindungi data santri.
            </p>
            <form onSubmit={handleLookup} className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                value={lookupCode}
                onChange={(event) => setLookupCode(event.target.value)}
                placeholder="Kode unik santri"
                className="min-h-12 flex-1 rounded-xl border border-white/20 bg-white px-4 text-gray-950 outline-none"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gold px-5 text-sm font-bold text-navy transition hover:bg-gold-soft disabled:opacity-70"
              >
                <Search className="mr-2" size={18} />
                {lookupLoading ? "Memeriksa..." : "Cek Data"}
              </button>
            </form>
            {lookupError ? (
              <p className="mt-3 rounded bg-red-50 px-4 py-3 text-sm text-red-700">
                {lookupError}
              </p>
            ) : null}
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 text-gray-950 shadow-card sm:p-7">
            {lookup?.santri ? (
              <div className="grid gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {lookup.santri.foto_url ? (
                    <img
                      src={lookup.santri.foto_url}
                      alt={lookup.santri.nama}
                      className="h-24 w-24 rounded object-cover"
                    />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded bg-navy-50 text-navy">
                      <FileText size={28} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">{lookup.santri.nama}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      NIS {lookup.santri.nis} - {lookup.santri.kelas}
                    </p>
                    <p className="mt-2 inline-flex rounded bg-navy-50 px-3 py-1 text-sm font-semibold capitalize text-navy-mid">
                      {lookup.santri.status}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-semibold">Status & Riwayat Tagihan</h4>
                    <button
                      type="button"
                      onClick={downloadStudentSummary}
                      className="inline-flex items-center rounded border border-navy/15 px-3 py-2 text-sm font-semibold text-navy hover:bg-navy-50"
                    >
                      <Download className="mr-2" size={16} />
                      Unduh Rekap PDF
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {lookup.tagihan?.length ? (
                      lookup.tagihan.map((bill) => (
                        <article
                          key={bill.id}
                          className="rounded border border-gray-200 p-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold">
                                {bill.jenis_tagihan || "Tagihan"}
                              </p>
                              <p className="mt-1 text-sm text-gray-600">
                                Jatuh tempo {formatDate(bill.jatuh_tempo)}
                              </p>
                            </div>
                            <span className="rounded bg-navy-50 px-3 py-1 text-sm font-semibold capitalize text-navy-mid">
                              {bill.status.replace("_", " ")}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                            <p>Nominal: {formatCurrency(bill.nominal)}</p>
                            <p>Dibayar: {formatCurrency(bill.total_dibayar)}</p>
                            <p>Sisa: {formatCurrency(bill.sisa_tagihan)}</p>
                          </div>
                          {bill.riwayat_pembayaran.length ? (
                            <div className="mt-3 border-t border-gray-100 pt-3">
                              {bill.riwayat_pembayaran.map((payment, index) => (
                                <div
                                  key={`${payment.tanggal_bayar}-${index}`}
                                  className="flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <span>
                                    {formatDate(payment.tanggal_bayar)} -{" "}
                                    {formatCurrency(payment.jumlah_bayar)}
                                  </span>
                                  {payment.kuitansi_url ? (
                                    <a
                                      href={payment.kuitansi_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center font-semibold text-navy-mid"
                                    >
                                      Unduh Kuitansi
                                      <Download className="ml-1" size={14} />
                                    </a>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <p className="rounded bg-gray-50 p-4 text-sm text-gray-600">
                        Tagihan belum tersedia.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold">Ringkasan Raport</h4>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {lookup.raport?.length ? (
                      lookup.raport.slice(0, 8).map((item) => (
                        <div
                          key={`${item.mata_pelajaran}-${item.periode}`}
                          className="rounded bg-krem-50 p-3 text-sm"
                        >
                          <p className="font-semibold">{item.mata_pelajaran}</p>
                          <p className="mt-1 text-gray-600">
                            {item.periode}: {item.nilai || "-"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded bg-gray-50 p-4 text-sm text-gray-600 sm:col-span-2">
                        Ringkasan raport belum tersedia.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid min-h-[360px] place-items-center rounded border border-dashed border-emerald-900/20 bg-krem-50 p-6 text-center">
                <div>
                  <CheckCircle2 className="mx-auto text-navy-mid" size={36} />
                  <p className="mt-4 font-semibold text-gray-950">
                    Data akan muncul setelah kode valid.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Tidak ada data yang ditampilkan sebelum kode unik berhasil
                    diverifikasi.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="saran" className="section-shell grid gap-10 py-20 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="section-kicker">
            Saran & Kritik
          </p>
          <h2 className="section-title">
            Sampaikan masukan untuk pesantren.
          </h2>
          <p className="mt-4 leading-7 text-gray-600">
            Setiap pesan akan masuk ke data saran dan kritik untuk ditinjau oleh
            pengelola.
          </p>
        </div>
        <form onSubmit={handleSuggestion} className="premium-card p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-gray-700">
              Nama
              <input
                value={suggestionForm.nama}
                onChange={(event) =>
                  setSuggestionForm((form) => ({ ...form, nama: event.target.value }))
                }
                className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-navy-light"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-gray-700">
              Kontak (opsional)
              <input
                value={suggestionForm.kontak}
                onChange={(event) =>
                  setSuggestionForm((form) => ({
                    ...form,
                    kontak: event.target.value,
                  }))
                }
                className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-navy-light"
              />
            </label>
          </div>
          <label className="mt-4 grid gap-2 text-sm font-semibold text-gray-700">
            Pesan
            <textarea
              value={suggestionForm.pesan}
              onChange={(event) =>
                setSuggestionForm((form) => ({ ...form, pesan: event.target.value }))
              }
              rows={5}
              className="rounded border border-gray-200 px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-navy-light"
            />
          </label>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={suggestionLoading}
              className="inline-flex items-center justify-center rounded bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy disabled:opacity-70"
            >
              <MessageSquare className="mr-2" size={18} />
              {suggestionLoading ? "Mengirim..." : "Kirim Pesan"}
            </button>
            {suggestionStatus ? (
              <p className="text-sm font-medium text-navy-mid">{suggestionStatus}</p>
            ) : null}
          </div>
        </form>
      </section>

      <footer className="border-t border-white/10 bg-navy-950 text-white">
        <div className="section-shell grid gap-8 py-12 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              Pondok Pesantren An-Nur Mageung
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-white/55">
              {getContent(
                "footer",
                "alamat",
                "Mageung, Sariwangi, Tasikmalaya, Jawa Barat",
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/65">
              <span className="inline-flex items-center gap-2">
                <Phone size={16} />
                {getContent("footer", "telepon", getContent("footer", "wa", "-"))}
              </span>
              <span>{getContent("footer", "email", "info@annurmageung.sch.id")}</span>
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

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Tutup galeri"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded bg-white text-gray-950"
          >
            <X size={20} />
          </button>
          {lightbox.tipe === "video" ? (
            <video
              src={lightbox.media_url}
              controls
              className="max-h-[84vh] w-full max-w-5xl rounded bg-black"
            />
          ) : (
            <img
              src={lightbox.media_url}
              alt={lightbox.album || "Galeri pesantren"}
              className="max-h-[84vh] w-full max-w-5xl rounded object-contain"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
