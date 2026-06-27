import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Globe,
  ImageIcon,
  LogIn,
  Mail,
  MapPin,
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

const baseNavItems = [
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

type PsbFormState = {
  nama_lengkap: string;
  jenis_kelamin: "L" | "P";
  tanggal_lahir: string;
  alamat: string;
  nama_orang_tua: string;
  no_hp: string;
};

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

function getBackgroundOpacity(value?: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.35;
  return Math.min(100, Math.max(0, parsed)) / 100;
}

function isActiveFlag(value?: string | null) {
  return ["true", "1", "aktif", "active", "yes", "ya"].includes(
    String(value || "").toLowerCase(),
  );
}

function makeRegistrationNumber(tahunAjaran: string) {
  const cleanYear = tahunAjaran.replace(/[^\d]/g, "").slice(0, 8) || String(new Date().getFullYear());
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `PSB/${cleanYear}/${randomPart}`;
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
  const [psbForm, setPsbForm] = useState<PsbFormState>({
    nama_lengkap: "",
    jenis_kelamin: "L",
    tanggal_lahir: "",
    alamat: "",
    nama_orang_tua: "",
    no_hp: "",
  });
  const [psbLoading, setPsbLoading] = useState(false);
  const [psbStatus, setPsbStatus] = useState("");
  const [psbProofUrl, setPsbProofUrl] = useState("");
  const [psbPhoto, setPsbPhoto] = useState<File | null>(null);
  const [psbPhotoInputKey, setPsbPhotoInputKey] = useState(0);

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
  const heroBackgroundOpacity = getBackgroundOpacity(
    getContent("hero", "background_opacity", "35"),
  );
  const logoUrl = getContent("hero", "logo_url", pesantrenLogoUrl);
  const currentAcademicYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  const psbActive = isActiveFlag(getContent("psb", "active", "false"));
  const psbYear = getContent("psb", "tahun_ajaran", currentAcademicYear) || currentAcademicYear;
  const psbDescription = getContent(
    "psb",
    "deskripsi",
    "Lengkapi formulir pendaftaran santri baru. Bukti pendaftaran resmi akan otomatis dibuat setelah data terkirim.",
  );
  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    if (psbActive) {
      items.splice(1, 0, { href: "#psb", label: "PSB" });
    }
    return items;
  }, [psbActive]);

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

  async function generatePsbProofPdf(
    id: string,
    nomorPendaftaran: string,
    tahunAjaran: string,
    form: PsbFormState,
  ) {
    const [{ jsPDF }, QRCode] = await Promise.all([import("jspdf"), import("qrcode")]);
    const validationUrl = `${window.location.origin}/validasi-psb/${id}`;
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
    doc.text("PONDOK PESANTREN AN-NUR MAGEUNG", pageWidth / 2, 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Bukti Pendaftaran Santri Baru", pageWidth / 2, 22, { align: "center" });
    doc.text(`Tahun Ajaran ${tahunAjaran}`, pageWidth / 2, 28, { align: "center" });

    doc.setDrawColor(16, 82, 53);
    doc.setLineWidth(0.8);
    doc.line(margin, 41, pageWidth - margin, 41);

    doc.setTextColor(20, 26, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("BUKTI PENDAFTARAN", pageWidth / 2, 53, { align: "center" });
    doc.setFontSize(10);
    doc.text(nomorPendaftaran, pageWidth / 2, 60, { align: "center" });

    doc.setFillColor(244, 248, 244);
    doc.roundedRect(margin, 70, pageWidth - margin * 2, 86, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Data Pendaftar", labelX, 82);

    const rows = [
      ["Nama Lengkap", form.nama_lengkap],
      ["Jenis Kelamin", form.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"],
      ["Tanggal Lahir", formatDate(form.tanggal_lahir)],
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
    doc.roundedRect(margin, 164, pageWidth - margin * 2, 28, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Status Awal: Belum Terverifikasi", labelX, 176);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      "Simpan bukti ini. Panitia akan memperbarui status setelah proses verifikasi administrasi.",
      labelX,
      184,
    );

    doc.addImage(qrDataUrl, "PNG", pageWidth - margin - 34, 204, 34, 34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Validasi QR", margin, 213);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Scan QR untuk membuka data pendaftaran dan status verifikasi resmi.", margin, 221);
    doc.setTextColor(16, 82, 53);
    doc.text(validationUrl, margin, 229, { maxWidth: pageWidth - margin * 2 - 40 });

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

  async function handlePsbSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPsbStatus("");
    setPsbProofUrl("");

    if (!psbActive) {
      setPsbStatus("PSB belum dibuka.");
      return;
    }
    if (!psbForm.nama_lengkap.trim() || !psbForm.nama_orang_tua.trim() || !psbForm.no_hp.trim()) {
      setPsbStatus("Nama pendaftar, nama orang tua/wali, dan no HP wajib diisi.");
      return;
    }
    if (psbPhoto && !psbPhoto.type.startsWith("image/")) {
      setPsbStatus("File foto harus berupa gambar.");
      return;
    }

    setPsbLoading(true);
    const id = makeUuid();
    const nomorPendaftaran = makeRegistrationNumber(psbYear);
    const proofBlob = await generatePsbProofPdf(id, nomorPendaftaran, psbYear, psbForm);
    const storagePath = `${psbYear.replace(/[^\w-]+/g, "-")}/${id}.pdf`;
    let photoPath: string | null = null;

    if (psbPhoto) {
      let compressedPhoto: Blob;
      try {
        compressedPhoto = await compressImage(psbPhoto);
      } catch {
        setPsbLoading(false);
        setPsbStatus("Foto belum bisa dikompres. Silakan pilih file gambar lain.");
        return;
      }
      photoPath = `${psbYear.replace(/[^\w-]+/g, "-")}/${id}.jpg`;
      const photoUpload = await supabase.storage
        .from("pp-psb-foto")
        .upload(photoPath, compressedPhoto, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (photoUpload.error) {
        setPsbLoading(false);
        setPsbStatus("Foto belum bisa diupload. Silakan coba lagi.");
        return;
      }
    }

    const uploadResult = await supabase.storage
      .from("pp-psb-bukti")
      .upload(storagePath, proofBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadResult.error) {
      setPsbLoading(false);
      setPsbStatus("Bukti pendaftaran belum bisa dibuat. Silakan coba lagi.");
      return;
    }

    const { error } = await supabase.from("pp_psb_pendaftar").insert({
      id,
      tahun_ajaran: psbYear,
      nomor_pendaftaran: nomorPendaftaran,
      nama_lengkap: psbForm.nama_lengkap.trim(),
      jenis_kelamin: psbForm.jenis_kelamin,
      tanggal_lahir: psbForm.tanggal_lahir || null,
      alamat: psbForm.alamat.trim() || null,
      nama_orang_tua: psbForm.nama_orang_tua.trim(),
      no_hp: psbForm.no_hp.trim(),
      status: "baru",
      bukti_url: storagePath,
      foto_url: photoPath,
    });

    setPsbLoading(false);
    if (error) {
      setPsbStatus("Pendaftaran belum tersimpan. Silakan coba lagi.");
      return;
    }

    const publicUrl = supabase.storage.from("pp-psb-bukti").getPublicUrl(storagePath).data.publicUrl;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(proofBlob);
    link.download = `bukti-psb-${nomorPendaftaran.replace(/\//g, "-")}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);

    setPsbProofUrl(publicUrl);
    setPsbStatus("Pendaftaran berhasil. Bukti pendaftaran PDF sudah dibuat.");
    setPsbPhoto(null);
    setPsbPhotoInputKey((value) => value + 1);
    setPsbForm({
      nama_lengkap: "",
      jenis_kelamin: "L",
      tanggal_lahir: "",
      alamat: "",
      nama_orang_tua: "",
      no_hp: "",
    });
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
      <header className="sticky top-0 z-40 border-b border-white/10 bg-green-950/95 text-white shadow-[0_10px_40px_rgba(16,43,30,.16)] backdrop-blur-xl">
        <nav className="section-shell flex h-[76px] items-center justify-between">
          <a href="#beranda" className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Pondok Pesantren An-Nur Mageung"
                className="h-12 w-12 rounded-2xl border border-white/15 bg-white object-contain p-1 shadow-lg"
              />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-green-500 text-sm font-black text-green-950">
                AN
              </span>
            )}
            <span className="leading-tight">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-green-300">
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
                to="/admin/pesantren"
                className="mt-2 inline-flex items-center justify-center rounded-xl bg-green-500 px-4 py-3 text-sm font-bold text-green-950"
                onClick={() => setMobileOpen(false)}
              >
                Login Dashboard Pesantren
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
                {psbActive
                  ? `Penerimaan Santri Baru Tahun Ajaran ${psbYear} telah dibuka!`
                  : "Pendidikan Islam & Pembinaan Karakter"}
              </span>
            </p>
            <h1 className="mt-7 max-w-3xl break-words font-display text-4xl font-bold leading-[1.04] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
              {heroSubtitle}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href={psbActive ? "#psb" : getContent("hero", "cta_primary_url", "#saran")}
                className="inline-flex items-center justify-center rounded-full bg-green-500 px-6 py-3.5 text-sm font-bold text-green-950 shadow-glow transition hover:-translate-y-0.5 hover:bg-green-200"
              >
                {psbActive ? "Daftar PSB Sekarang" : getContent("hero", "cta_primary_text", "Daftar Santri Baru")}
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
                  <p className="font-display text-xl font-bold text-green-300 sm:text-2xl">{value}</p>
                  <p className="mt-1 text-[11px] leading-4 text-white/50 sm:text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto min-w-0 w-full max-w-xl lg:ml-auto">
            <div className="absolute -left-5 top-12 h-32 w-32 rounded-full border border-green-400/20" />
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-3xl bg-green-400/20 blur-xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-2 shadow-2xl backdrop-blur">
              <img
                src={heroImage}
                alt="Foto Pondok Pesantren An-Nur Mageung"
                className="aspect-[4/5] w-full rounded-[1.55rem] object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
              />
              <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/20 bg-green-950/80 p-4 backdrop-blur-xl sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-500 text-green-950">
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
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-green-500 text-green-950"><ShieldCheck size={20} /></span>
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
                    "Terwujudnya santri yang beriman, berakhlakul karimah, berilmu, dan bermanfaat bagi umat.",
                  )}
                </p>
              </article>
              <article className="premium-card p-6 sm:p-8">
                <h3 className="font-display text-2xl font-bold text-green-950">Misi</h3>
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
              <h3 className="text-xl font-semibold text-green-950">
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

      <section className="relative isolate overflow-hidden bg-green-950 py-16 text-white">
        <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:52px_52px] opacity-30" />
        <div className="section-shell">
          <p className="section-kicker !text-green-300">
            Lembaga di Bawah Pesantren
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-green-500 text-lg font-black text-green-950 shadow-glow">
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
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-bold text-green-950 transition hover:-translate-y-0.5 hover:bg-cream-100"
            >
              Kunjungi Website
              <ExternalLink className="ml-2" size={17} />
            </Link>
          </div>
        </div>
      </section>

      {psbActive ? (
        <section id="psb" className="border-b border-green-900/5 bg-[#f8fbf7] py-20 sm:py-24">
          <div className="section-shell grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <p className="section-kicker">Penerimaan Santri Baru</p>
              <h2 className="section-title">
                Pendaftaran santri baru Tahun Ajaran {psbYear}.
              </h2>
              <p className="mt-4 leading-7 text-gray-600">{psbDescription}</p>
              <div className="mt-6 rounded-2xl border border-green-900/10 bg-white p-5 shadow-soft">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-100 text-green-800">
                    <ShieldCheck size={22} />
                  </span>
                  <div>
                    <p className="font-semibold text-green-950">Bukti otomatis dengan QR validator</p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Setelah submit, sistem membuat PDF bukti pendaftaran. QR di dalamnya membuka data input dan status verifikasi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handlePsbSubmit} className="premium-card p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-gray-700 sm:col-span-2">
                  Nama lengkap calon santri
                  <input
                    value={psbForm.nama_lengkap}
                    onChange={(event) =>
                      setPsbForm((form) => ({ ...form, nama_lengkap: event.target.value }))
                    }
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-gray-700">
                  Jenis kelamin
                  <select
                    value={psbForm.jenis_kelamin}
                    onChange={(event) =>
                      setPsbForm((form) => ({
                        ...form,
                        jenis_kelamin: event.target.value as "L" | "P",
                      }))
                    }
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-gray-700">
                  Tanggal lahir
                  <input
                    type="date"
                    value={psbForm.tanggal_lahir}
                    onChange={(event) =>
                      setPsbForm((form) => ({ ...form, tanggal_lahir: event.target.value }))
                    }
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-gray-700">
                  Nama orang tua/wali
                  <input
                    value={psbForm.nama_orang_tua}
                    onChange={(event) =>
                      setPsbForm((form) => ({ ...form, nama_orang_tua: event.target.value }))
                    }
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-gray-700">
                  No HP aktif
                  <input
                    value={psbForm.no_hp}
                    onChange={(event) =>
                      setPsbForm((form) => ({ ...form, no_hp: event.target.value }))
                    }
                    className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-gray-700 sm:col-span-2">
                  Upload foto calon santri
                  <input
                    key={psbPhotoInputKey}
                    type="file"
                    accept="image/*"
                    onChange={(event) => setPsbPhoto(event.target.files?.[0] || null)}
                    className="rounded border border-gray-200 px-3 py-3 font-normal outline-none file:mr-3 file:rounded file:border-0 file:bg-green-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-gray-700 sm:col-span-2">
                  Alamat
                  <textarea
                    value={psbForm.alamat}
                    onChange={(event) =>
                      setPsbForm((form) => ({ ...form, alamat: event.target.value }))
                    }
                    rows={4}
                    className="rounded border border-gray-200 px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={psbLoading}
                  className="inline-flex items-center justify-center rounded bg-green-950 px-5 py-3 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-70"
                >
                  <FileText className="mr-2" size={18} />
                  {psbLoading ? "Memproses..." : "Submit dan Buat Bukti"}
                </button>
                {psbProofUrl ? (
                  <a
                    href={psbProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded border border-green-900/15 px-4 py-3 text-sm font-semibold text-green-950 hover:bg-green-50"
                  >
                    Buka Bukti PDF
                    <ExternalLink className="ml-2" size={16} />
                  </a>
                ) : null}
              </div>
              {psbStatus ? <p className="mt-3 text-sm font-medium text-green-700">{psbStatus}</p> : null}
            </form>
          </div>
        </section>
      ) : null}

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
                  <p className="text-sm text-green-700">
                    {formatDate(item.tanggal || item.created_at)}
                  </p>
                  <h3 className="mt-2 font-display text-xl font-bold leading-7 text-green-950">
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

      <section id="agenda" className="border-y border-green-900/5 bg-white py-20 sm:py-24">
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
                  className="grid gap-4 rounded-2xl border border-green-900/10 bg-[#f9f8f4] p-5 transition hover:border-green-400/50 hover:shadow-soft md:grid-cols-[180px_1fr]"
                >
                  <div className="flex items-center gap-3 text-green-950">
                    <CalendarDays size={22} />
                    <span className="font-semibold">{formatDate(item.tanggal)}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-950">
                      {item.judul}
                    </h3>
                    {item.lokasi ? (
                      <p className="mt-1 text-sm font-medium text-green-700">
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
              <div className="rounded border border-green-900/10 bg-krem-50 p-6 text-sm text-gray-600">
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
                  ? "border-emerald-800 bg-green-950 text-white"
                  : "border-green-900/15 bg-white text-gray-700",
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
                <div className="grid aspect-[4/3] place-items-center bg-green-950 text-white">
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
                <p className="text-sm font-semibold text-green-950">
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

      <section id="cek-santri" className="relative isolate overflow-hidden bg-green-950 py-20 text-white sm:py-24">
        <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:52px_52px] opacity-30" />
        <div className="section-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="section-kicker !text-green-300">
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
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-green-500 px-5 text-sm font-bold text-green-950 transition hover:bg-green-200 disabled:opacity-70"
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
                    <div className="grid h-24 w-24 place-items-center rounded bg-green-50 text-green-950">
                      <FileText size={28} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">{lookup.santri.nama}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      NIS {lookup.santri.nis} - {lookup.santri.kelas}
                    </p>
                    <p className="mt-2 inline-flex rounded bg-green-50 px-3 py-1 text-sm font-semibold capitalize text-green-700">
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
                      className="inline-flex items-center rounded border border-green-900/15 px-3 py-2 text-sm font-semibold text-green-950 hover:bg-green-50"
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
                            <span className="rounded bg-green-50 px-3 py-1 text-sm font-semibold capitalize text-green-700">
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
                                      className="inline-flex items-center font-semibold text-green-700"
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
                  <CheckCircle2 className="mx-auto text-green-700" size={36} />
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
                className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
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
                className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
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
              className="rounded border border-gray-200 px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={suggestionLoading}
              className="inline-flex items-center justify-center rounded bg-green-950 px-5 py-3 text-sm font-semibold text-white hover:bg-green-950 disabled:opacity-70"
            >
              <MessageSquare className="mr-2" size={18} />
              {suggestionLoading ? "Mengirim..." : "Kirim Pesan"}
            </button>
            {suggestionStatus ? (
              <p className="text-sm font-medium text-green-700">{suggestionStatus}</p>
            ) : null}
          </div>
        </form>
      </section>

      <footer className="border-t border-white/10 bg-green-950 text-white">
        {/* Main footer grid */}
        <div className="section-shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">

          {/* Col 1 — Brand */}
          <div>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo PP An-Nur Mageung"
                  className="h-12 w-12 rounded-2xl border border-white/15 bg-white object-contain p-1 shadow-lg"
                />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-green-500 text-sm font-black text-green-950">
                  AN
                </span>
              )}
              <div className="leading-tight">
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-green-300">
                  Pondok Pesantren
                </span>
                <span className="block text-sm font-bold text-white">
                  An-Nur Mageung
                </span>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-white/55">
              {getContent(
                "profil",
                "deskripsi_singkat",
                "Pondok Pesantren An-Nur Mageung menyelenggarakan pendidikan integratif antara ilmu agama, pembinaan akhlak, dan pendidikan formal modern.",
              )}
            </p>
            <div className="mt-5 flex gap-3">
              {[
                { key: "wa", icon: <Phone size={16} />, label: "WhatsApp" },
                { key: "email", icon: <Mail size={16} />, label: "Email" },
                { key: "website", icon: <Globe size={16} />, label: "Website" },
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
                { href: "#beranda", label: "Beranda Pesantren" },
                { href: "#profil", label: "Profil & Visi Misi" },
                { href: "#profil", label: "Program Unggulan" },
                { href: "#profil", label: "Fasilitas Pesantren" },
                { href: "#saran", label: "Saran & Kritik" },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="transition hover:text-white"
                  >
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
                <Link to="/admin/pesantren" className="transition hover:text-white">
                  Login Dashboard Pesantren
                </Link>
              </li>
              <li>
                <Link to="/admin/smp" className="transition hover:text-white">
                  Login Dashboard SMP
                </Link>
              </li>
              <li>
                <a href="#cek-santri" className="transition hover:text-white">
                  Cek Pembayaran Santri
                </a>
              </li>
              <li>
                <a href="#cek-santri" className="transition hover:text-white">
                  Record & Raport Santri
                </a>
              </li>
            </ul>
            <Link
              to="/admin/pesantren"
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
                    "Mageung, Sariwangi, Tasikmalaya, Jawa Barat, Indonesia",
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
                <span>{getContent("footer", "email", "info@annurmageung.sch.id")}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="section-shell flex flex-col gap-3 py-5 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} Pondok Pesantren An-Nur Mageung. Hak Cipta Dilindungi.
            </span>
            <span>
              Made with{" "}
              <span className="text-green-400" aria-label="cinta">♥</span>{" "}
              for a better pesantren
            </span>
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
