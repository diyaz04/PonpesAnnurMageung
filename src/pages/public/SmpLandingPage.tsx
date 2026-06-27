import {
  ArrowUpRight,
  BookOpenCheck,
  ChevronRight,
  ExternalLink,
  FileText,
  FileUp,
  Globe,
  GraduationCap,
  LogIn,
  Mail,
  MapPin,
  Menu,
  Phone,
  ScanFace,
  Send,
  ShieldCheck,
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

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function makeRegistrationNumber(tahunAjaran: string) {
  const cleanYear = tahunAjaran.replace(/[^\d]/g, "").slice(0, 8) || String(new Date().getFullYear());
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SPMB/${cleanYear}/${randomPart}`;
}

function makeUuid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = (Math.random() * 16) | 0;
    const next = char === "x" ? value : (value & 0x3) | 0x8;
    return next.toString(16);
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Foto tidak bisa dibaca."));
    };
    image.src = url;
  });
}

async function compressImage(file: File) {
  const image = await loadImage(file);
  const maxSize = 900;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Foto tidak bisa dikompres.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Foto tidak bisa dikompres."));
      },
      "image/jpeg",
      0.78,
    );
  });
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [documentInputKey, setDocumentInputKey] = useState(0);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [spmbStatus, setSpmbStatus] = useState("");
  const [spmbProofUrl, setSpmbProofUrl] = useState("");
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
  const currentAcademicYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  const spmbYear = getContent("spmb", "tahun_ajaran", currentAcademicYear) || currentAcademicYear;
  const spmbDescription = getContent(
    "spmb",
    "deskripsi",
    "Lengkapi formulir SPMB. Bukti pendaftaran resmi akan otomatis dibuat setelah data terkirim.",
  );

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

  async function generateSpmbProofPdf(
    id: string,
    nomorPendaftaran: string,
    tahunAjaran: string,
    form: SpmbForm,
  ) {
    const [{ jsPDF }, QRCode] = await Promise.all([import("jspdf"), import("qrcode")]);
    const validationUrl = `${window.location.origin}/validasi-spmb/${id}`;
    const qrDataUrl = await QRCode.toDataURL(validationUrl, {
      width: 260,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    const labelX = 28;
    const valueX = 76;

    doc.setFillColor(16, 82, 53);
    doc.rect(0, 0, pageWidth, 34, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SMP MA'ARIF NU SARIWANGI", pageWidth / 2, 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Bukti Seleksi Penerimaan Murid Baru", pageWidth / 2, 22, { align: "center" });
    doc.text(`Tahun Ajaran ${tahunAjaran}`, pageWidth / 2, 28, { align: "center" });

    doc.setDrawColor(16, 82, 53);
    doc.setLineWidth(0.8);
    doc.line(margin, 41, pageWidth - margin, 41);

    doc.setTextColor(20, 26, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("BUKTI PENDAFTARAN SPMB", pageWidth / 2, 53, { align: "center" });
    doc.setFontSize(10);
    doc.text(nomorPendaftaran, pageWidth / 2, 60, { align: "center" });

    doc.setFillColor(244, 248, 244);
    doc.roundedRect(margin, 70, pageWidth - margin * 2, 92, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Data Calon Siswa", labelX, 82);

    const rows = [
      ["Nama Lengkap", form.nama_lengkap],
      ["Jenis Kelamin", form.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"],
      ["Tanggal Lahir", formatDate(form.tanggal_lahir)],
      ["Asal Sekolah", form.asal_sekolah],
      ["Nama Orang Tua/Wali", form.nama_orang_tua],
      ["No. HP", form.no_hp],
      ["Alamat", form.alamat],
    ];

    let y = 94;
    doc.setFontSize(10);
    rows.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, labelX, y);
      doc.text(":", valueX - 4, y);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(value || "-", pageWidth - valueX - margin);
      doc.text(wrapped, valueX, y);
      y += Math.max(8, wrapped.length * 5);
    });

    doc.setFillColor(232, 245, 236);
    doc.roundedRect(margin, 170, pageWidth - margin * 2, 28, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Status Awal: Belum Terverifikasi", labelX, 182);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Panitia akan memperbarui status setelah verifikasi administrasi.", labelX, 190);

    doc.addImage(qrDataUrl, "PNG", pageWidth - margin - 34, 210, 34, 34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Validasi QR", margin, 219);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Scan QR untuk membuka data pendaftaran dan status verifikasi resmi.", margin, 227);
    doc.setTextColor(16, 82, 53);
    doc.text(validationUrl, margin, 235, { maxWidth: pageWidth - margin * 2 - 40 });

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.text(
      `Dicetak otomatis pada ${new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date())}`,
      margin,
      276,
    );

    return doc.output("blob");
  }

  async function handleSpmbSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSpmbStatus("");
    setSpmbProofUrl("");

    if (
      !spmbForm.nama_lengkap.trim() ||
      !spmbForm.jenis_kelamin ||
      !spmbForm.nama_orang_tua.trim() ||
      !spmbForm.no_hp.trim()
    ) {
      setSpmbStatus("Lengkapi nama calon siswa, jenis kelamin, orang tua/wali, dan nomor HP.");
      return;
    }
    if (photoFile && !photoFile.type.startsWith("image/")) {
      setSpmbStatus("File foto harus berupa gambar.");
      return;
    }

    setSpmbLoading(true);
    const id = makeUuid();
    const nomorPendaftaran = makeRegistrationNumber(spmbYear);
    const proofBlob = await generateSpmbProofPdf(id, nomorPendaftaran, spmbYear, spmbForm);
    const yearPath = spmbYear.replace(/[^\w-]+/g, "-");
    const proofPath = `${yearPath}/${id}.pdf`;
    let dokumenUrl: string | null = null;
    let fotoUrl: string | null = null;

    if (photoFile) {
      let compressedPhoto: Blob;
      try {
        compressedPhoto = await compressImage(photoFile);
      } catch {
        setSpmbLoading(false);
        setSpmbStatus("Foto belum bisa dikompres. Silakan pilih file gambar lain.");
        return;
      }

      fotoUrl = `${yearPath}/${id}.jpg`;
      const photoUpload = await supabase.storage
        .from("smp-spmb-foto")
        .upload(fotoUrl, compressedPhoto, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (photoUpload.error) {
        setSpmbLoading(false);
        setSpmbStatus("Foto belum berhasil diunggah. Silakan coba lagi.");
        return;
      }
    }

    if (documentFile) {
      const extension = documentFile.name.split(".").pop() || "file";
      const filePath = `smp/${yearPath}/${id}.${extension}`;
      const upload = await supabase.storage
        .from("spmb-dokumen")
        .upload(filePath, documentFile, { upsert: true });

      if (upload.error) {
        setSpmbLoading(false);
        setSpmbStatus("Dokumen belum berhasil diunggah. Silakan coba lagi.");
        return;
      }
      dokumenUrl = upload.data.path;
    }

    const proofUpload = await supabase.storage
      .from("smp-spmb-bukti")
      .upload(proofPath, proofBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (proofUpload.error) {
      setSpmbLoading(false);
      setSpmbStatus("Bukti pendaftaran belum bisa dibuat. Silakan coba lagi.");
      return;
    }

    const { error } = await supabase.from("smp_spmb_pendaftar").insert({
      id,
      tahun_ajaran: spmbYear,
      nomor_pendaftaran: nomorPendaftaran,
      nama_lengkap: spmbForm.nama_lengkap.trim(),
      jenis_kelamin: spmbForm.jenis_kelamin || null,
      tanggal_lahir: spmbForm.tanggal_lahir || null,
      alamat: spmbForm.alamat.trim() || null,
      nama_orang_tua: spmbForm.nama_orang_tua.trim() || null,
      no_hp: spmbForm.no_hp.trim() || null,
      asal_sekolah: spmbForm.asal_sekolah.trim() || null,
      dokumen_url: dokumenUrl,
      foto_url: fotoUrl,
      bukti_url: proofPath,
    });
    setSpmbLoading(false);

    if (error) {
      setSpmbStatus("Pendaftaran belum terkirim. Silakan coba lagi.");
      return;
    }

    const publicUrl = supabase.storage.from("smp-spmb-bukti").getPublicUrl(proofPath).data.publicUrl;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(proofBlob);
    link.download = `bukti-spmb-${nomorPendaftaran.replace(/\//g, "-")}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);

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
    setPhotoFile(null);
    setDocumentInputKey((value) => value + 1);
    setPhotoInputKey((value) => value + 1);
    setSpmbProofUrl(publicUrl);
    setSpmbStatus("Pendaftaran SPMB berhasil. Bukti PDF sudah dibuat.");
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
      <header className="sticky top-0 z-40 border-b border-white/10 bg-green-950/95 text-white shadow-[0_10px_40px_rgba(16,43,30,.16)] backdrop-blur-xl">
        <nav className="section-shell flex h-[76px] items-center justify-between">
          <a href="#beranda" className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo SMP Ma'arif NU Sariwangi"
                className="h-12 w-12 rounded-2xl border border-white/15 bg-white object-contain p-1 shadow-lg"
              />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-green-500 text-sm font-black text-green-950">
                SMP
              </span>
            )}
            <span className="leading-tight">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-green-300">
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
              className="ml-2 inline-flex items-center justify-center rounded-full border border-green-400/40 bg-green-500 px-4 py-2.5 text-[13px] font-bold text-green-950 transition hover:-translate-y-0.5 hover:bg-green-200"
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
          <div className="border-t border-white/10 bg-green-950 px-4 py-4 shadow-2xl lg:hidden">
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
                className="mt-1 inline-flex items-center justify-center rounded-xl bg-green-500 px-4 py-3 text-sm font-bold text-green-950"
                onClick={() => setMobileOpen(false)}
              >
                Login Dashboard SMP
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <section id="beranda" className="relative isolate overflow-hidden bg-green-950 text-white">
        <div className="absolute inset-0 -z-20">
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
            style={{ opacity: heroBackgroundOpacity }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-green-950/95 via-green-950/90 to-green-900/75" />
          <div className="absolute inset-0 bg-green-900/25" />
        </div>
        <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:52px_52px] opacity-40" />
        <div className="absolute -right-32 top-16 -z-10 h-96 w-96 rounded-full bg-green-400/15 blur-3xl" />
        <div className="section-shell grid min-h-[calc(100svh-76px)] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
          <div className="relative z-10 min-w-0">
            <p className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-green-400/30 bg-green-400/10 px-3 py-2 text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-green-300 sm:rounded-full sm:px-4 sm:text-xs sm:tracking-[0.18em]">
              <Sparkles className="shrink-0" size={15} />
              <span>
                {spmbActive
                  ? `Seleksi Penerimaan Murid Baru Tahun Ajaran ${spmbYear} telah dibuka!`
                  : "Sekolah Islam Berbasis Karakter"}
              </span>
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
                  href="#spmb"
                  className="inline-flex items-center justify-center rounded-full bg-green-500 px-6 py-3.5 text-sm font-bold text-green-950 shadow-glow transition hover:-translate-y-0.5 hover:bg-green-200"
                >
                  {getContent("hero", "cta_primary_text", "Daftar SPMB Sekarang")}
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
                  <p className="font-display text-xl font-bold text-green-300 sm:text-2xl">{value}</p>
                  <p className="mt-1 text-[11px] leading-4 text-white/50 sm:text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto min-w-0 w-full max-w-xl lg:ml-auto">
            <div className="absolute -left-5 top-12 h-32 w-32 rounded-full border border-green-400/20" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-2 shadow-2xl backdrop-blur">
              <img
                src={heroImage}
                alt="Foto SMP Ma'arif NU Sariwangi"
                className="aspect-[4/5] w-full rounded-[1.55rem] object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
              />
              <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/20 bg-green-950/80 p-4 backdrop-blur-xl sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-500 text-green-950">
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
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-green-500 text-green-950"><Trophy size={20} /></span>
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
                  ? "border-green-950 bg-green-950 text-white shadow-lg"
                  : "border-green-900/10 bg-white text-slate-600 hover:border-green-900/25 hover:text-green-950",
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
                <h3 className="font-display text-2xl font-bold text-green-950">Visi</h3>
                <p className="mt-4 leading-7 text-gray-700">
                  {getContent(
                    "profil",
                    "visi",
                    "Terwujudnya peserta didik yang beriman, berilmu, berakhlak, dan berdaya saing.",
                  )}
                </p>
              </article>
              <article className="premium-card p-6 sm:p-8">
                <h3 className="font-display text-2xl font-bold text-green-950">Misi</h3>
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
              <h3 className="text-xl font-semibold text-green-950">
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
                  <p className="mt-1 text-sm font-semibold text-green-700">
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
              <h3 className="text-xl font-semibold text-green-950">Tata Tertib</h3>
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
        <section id="spmb" className="relative isolate overflow-hidden bg-green-950 py-20 text-white sm:py-24">
          <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:52px_52px] opacity-30" />
          <div className="section-shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="section-kicker !text-green-300">
                SPMB
              </p>
              <h2 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
                Seleksi Penerimaan Murid Baru Tahun Ajaran {spmbYear}
              </h2>
              <p className="mt-4 leading-7 text-cream-50">
                {spmbDescription}
              </p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-500 text-green-950">
                    <ShieldCheck size={22} />
                  </span>
                  <div>
                    <p className="font-semibold text-white">Bukti otomatis dengan QR validator</p>
                    <p className="mt-1 text-sm leading-6 text-cream-50">
                      Setelah submit, sistem membuat PDF bukti pendaftaran. QR di dalamnya membuka data input dan status verifikasi.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSpmbOpen(true)}
                className="mt-7 inline-flex items-center rounded-full bg-green-500 px-6 py-3.5 text-sm font-bold text-green-950 shadow-glow transition hover:-translate-y-0.5 hover:bg-green-200"
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
                  <h3 className="font-semibold text-green-300">{title}</h3>
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
      <section id="presensi-digital" className="relative isolate overflow-hidden bg-green-950 py-20 text-white sm:py-24">
        <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:52px_52px] opacity-25" />
        <div className="absolute -left-20 top-0 -z-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 -z-10 h-72 w-72 rounded-full bg-green-400/10 blur-3xl" />
        <div className="section-shell">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="section-kicker !text-emerald-400/80">
                Presensi Digital
              </p>
              <h2 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-5xl">
                Absensi siswa lebih cepat dengan <span className="text-green-300">Face Recognition</span>
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

      <footer className="border-t border-white/10 bg-green-950 text-white">
        {/* Main footer grid */}
        <div className="section-shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">

          {/* Col 1 — Brand */}
          <div>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo SMP Ma'arif NU Sariwangi"
                  className="h-12 w-12 rounded-2xl border border-white/15 bg-white object-contain p-1 shadow-lg"
                />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-green-500 text-sm font-black text-green-950">
                  SMP
                </span>
              )}
              <div className="leading-tight">
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-green-300">
                  SMP Ma'arif NU
                </span>
                <span className="block text-sm font-bold text-white">
                  Sariwangi
                </span>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-white/55">
              {getContent(
                "profil",
                "deskripsi_singkat",
                "SMP Ma'arif NU Sariwangi menyelenggarakan pendidikan formal bermutu dengan nilai keislaman, kedisiplinan, dan pengembangan potensi siswa.",
              )}
            </p>
            <div className="mt-5 flex gap-3">
              {[
                { key: "wa", icon: <Phone size={16} /> },
                { key: "email", icon: <Mail size={16} /> },
                { key: "website", icon: <Globe size={16} /> },
              ].map(({ key, icon }) => {
                const url = content.footer?.[key];
                return (
                  <a
                    key={key}
                    href={url || "#"}
                    target={key !== "wa" ? "_blank" : undefined}
                    rel="noreferrer"
                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                    aria-label={key}
                  >
                    {icon}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Col 2 — Navigasi Cepat */}
          <div>
            <p className="border-l-2 border-green-400 pl-3 text-xs font-bold uppercase tracking-widest text-white">
              Navigasi Cepat
            </p>
            <ul className="mt-5 grid gap-3 text-sm text-white/65">
              {[
                { href: "#beranda", label: "Beranda Sekolah" },
                { href: "#profil", label: "Profil & Visi Misi" },
                { href: "#program", label: "Program Unggulan" },
                { href: "#fasilitas", label: "Fasilitas Sekolah" },
                { href: "#ppdb", label: "Penerimaan Siswa Baru" },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="transition hover:text-white">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Sistem Informasi */}
          <div>
            <p className="border-l-2 border-green-400 pl-3 text-xs font-bold uppercase tracking-widest text-white">
              Sistem Informasi
            </p>
            <ul className="mt-5 grid gap-3 text-sm text-white/65">
              <li>
                <Link to="/admin/smp" className="transition hover:text-white">
                  Login Portal Wali & Guru
                </Link>
              </li>
              <li>
                <a href="#ppdb" className="transition hover:text-white">
                  Formulir Pendaftaran Siswa Baru
                </a>
              </li>
              <li>
                <a href="#cek-siswa" className="transition hover:text-white">
                  Cek Status Kelulusan PSB
                </a>
              </li>
              <li>
                <a href="#cek-siswa" className="transition hover:text-white">
                  Cek Pembayaran & Raport
                </a>
              </li>
            </ul>
            <Link
              to="/admin/smp"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-green-400/30 bg-green-500/15 px-4 py-2.5 text-xs font-bold text-green-300 transition hover:bg-green-500/25 hover:text-green-200"
            >
              <LogIn size={14} />
              Login Portal Admin
            </Link>
          </div>

          {/* Col 4 — Kontak & Lokasi */}
          <div>
            <p className="border-l-2 border-green-400 pl-3 text-xs font-bold uppercase tracking-widest text-white">
              Kontak &amp; Lokasi
            </p>
            <ul className="mt-5 grid gap-4 text-sm text-white/65">
              <li className="flex items-start gap-3">
                <MapPin size={16} className="mt-0.5 shrink-0 text-green-400" />
                <span className="leading-6">
                  {getContent(
                    "footer",
                    "alamat",
                    "Sariwangi, Tasikmalaya, Jawa Barat, Indonesia",
                  )}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="shrink-0 text-green-400" />
                <span>
                  {getContent("footer", "telepon", getContent("footer", "wa", "-"))}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="shrink-0 text-green-400" />
                <span>
                  {getContent("footer", "email", "info@smpmaarifnusariwangi.sch.id")}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="section-shell flex flex-col gap-3 py-5 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} SMP Ma'arif NU Sariwangi. Hak Cipta Dilindungi.
            </span>
            <span>
              Made with{" "}
              <span className="text-green-400" aria-label="cinta">♥</span>{" "}
              for a better school
            </span>
          </div>
        </div>
      </footer>

      {spmbOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-green-950/80 p-4 backdrop-blur-sm">
          <div className="mx-auto my-8 max-w-3xl rounded-[1.5rem] bg-white p-5 shadow-card sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-green-700">
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
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
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
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
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
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
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
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
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
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-gray-700">
                  Nomor HP
                  <input
                    value={spmbForm.no_hp}
                    onChange={(event) =>
                      setSpmbForm((form) => ({ ...form, no_hp: event.target.value }))
                    }
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
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
                  className="rounded border border-gray-200 px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-gray-700">
                Upload foto calon siswa
                <span className="flex min-h-12 items-center gap-3 rounded border border-dashed border-gray-300 px-3 text-sm font-normal text-gray-600">
                  <FileUp size={18} />
                  <input
                    key={photoInputKey}
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setPhotoFile(event.target.files?.[0] || null)
                    }
                    className="w-full text-sm"
                  />
                </span>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-gray-700">
                Upload dokumen
                <span className="flex min-h-12 items-center gap-3 rounded border border-dashed border-gray-300 px-3 text-sm font-normal text-gray-600">
                  <FileUp size={18} />
                  <input
                    key={documentInputKey}
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
                  className="inline-flex items-center justify-center rounded bg-green-950 px-5 py-3 text-sm font-semibold text-white hover:bg-green-950 disabled:opacity-70"
                >
                  <FileText className="mr-2" size={18} />
                  {spmbLoading ? "Memproses..." : "Submit dan Buat Bukti"}
                </button>
                {spmbProofUrl ? (
                  <a
                    href={spmbProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded border border-green-900/15 px-4 py-3 text-sm font-semibold text-green-950 hover:bg-green-50"
                  >
                    Buka Bukti PDF
                    <ExternalLink className="ml-2" size={16} />
                  </a>
                ) : null}
                {spmbStatus ? (
                  <p className="text-sm font-medium text-green-700">{spmbStatus}</p>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
