import {
  ChevronRight,
  FileUp,
  GraduationCap,
  Menu,
  Phone,
  Send,
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
  const logoUrl = getContent("hero", "logo_url", smpLogoUrl);

  return (
    <div className="bg-krem-50 text-gray-950">
      <header className="sticky top-0 z-40 border-b border-navy/10 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
          <a href="#beranda" className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo SMP Ma'arif NU Sariwangi"
                className="h-11 w-11 rounded object-cover"
              />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded bg-navy text-sm font-semibold text-white">
                SMP
              </span>
            )}
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-gray-950">
                SMP Ma'arif NU
              </span>
              <span className="block text-sm text-navy-mid">Sariwangi</span>
            </span>
          </a>

          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-navy-50 hover:text-navy"
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/admin/smp"
              className="ml-2 inline-flex items-center justify-center rounded bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy"
            >
              Login Dashboard
            </Link>
          </div>

          <button
            type="button"
            aria-label="Buka menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded border border-navy/15 bg-white text-navy lg:hidden"
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        {mobileOpen ? (
          <div className="border-t border-navy/10 bg-white px-4 py-3 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-1">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded px-3 py-2 text-sm font-medium text-gray-700 hover:bg-navy-50"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <Link
                to="/admin/smp"
                className="mt-2 inline-flex items-center justify-center rounded bg-navy px-4 py-2.5 text-sm font-semibold text-white"
                onClick={() => setMobileOpen(false)}
              >
                Login Dashboard SMP
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <section id="beranda" className="border-b border-navy/10 bg-white">
        <div className="mx-auto grid min-h-[calc(100vh-69px)] max-w-7xl items-center gap-10 px-4 py-12 md:grid-cols-[1fr_0.95fr] lg:px-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-dark">
              SMP Ma'arif NU Sariwangi
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-gray-950 sm:text-5xl lg:text-6xl">
              {heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-gray-700 sm:text-lg">
              {heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {spmbActive ? (
                <a
                  href={getContent("hero", "cta_primary_url", "#spmb")}
                  className="inline-flex items-center justify-center rounded bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy"
                >
                  {getContent("hero", "cta_primary_text", "Daftar SPMB")}
                  <ChevronRight className="ml-2" size={18} />
                </a>
              ) : null}
              <a
                href="#profil"
                className="inline-flex items-center justify-center rounded border border-navy-mid/25 bg-white px-5 py-3 text-sm font-semibold text-navy transition hover:bg-navy-50"
              >
                Lihat Profil
              </a>
            </div>
          </div>
          <div className="relative">
            <img
              src={heroImage}
              alt="Foto SMP Ma'arif NU Sariwangi"
              className="aspect-[4/3] w-full rounded object-cover shadow-soft"
            />
            <div className="absolute bottom-4 left-4 right-4 rounded bg-white/95 p-4 shadow-soft">
              <p className="text-sm font-semibold text-navy">
                Sekolah berbasis karakter
              </p>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Menguatkan akademik, akhlak, literasi, dan kedisiplinan siswa.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="profil" className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-dark">
            Profil Sekolah
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-gray-950">
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
                "shrink-0 rounded border px-4 py-2 text-sm font-semibold transition",
                activeProfile === key
                  ? "border-navy-mid bg-navy text-white"
                  : "border-navy/15 bg-white text-gray-700 hover:bg-navy-50",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {activeProfile === "visi" ? (
            <div className="grid gap-5 md:grid-cols-2">
              <article className="rounded bg-white p-6 shadow-soft">
                <h3 className="text-xl font-semibold text-navy">Visi</h3>
                <p className="mt-4 leading-7 text-gray-700">
                  {getContent(
                    "profil",
                    "visi",
                    "Terwujudnya peserta didik yang beriman, berilmu, berakhlak, dan berdaya saing.",
                  )}
                </p>
              </article>
              <article className="rounded bg-white p-6 shadow-soft">
                <h3 className="text-xl font-semibold text-navy">Misi</h3>
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
            <article className="rounded bg-white p-6 shadow-soft">
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
                <article key={leader.nama} className="rounded bg-white p-4 shadow-soft">
                  <img
                    src={leader.foto_url || fallbackLeader}
                    alt={leader.nama}
                    className="aspect-[4/3] w-full rounded object-cover"
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
            <article className="rounded bg-white p-6 shadow-soft">
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
                  className="overflow-hidden rounded bg-white shadow-soft"
                >
                  <img
                    src={facility.foto_url}
                    alt={facility.nama}
                    className="aspect-[4/3] w-full object-cover"
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
        <section id="spmb" className="bg-navy py-16 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:px-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-soft">
                SPMB
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
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
                className="mt-6 inline-flex items-center rounded bg-gold px-5 py-3 text-sm font-semibold text-navy hover:bg-gold-soft"
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
                <article key={title} className="rounded bg-white/10 p-5">
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
      <SectionSaranKritik entitas="smp" entityLabel="SMP Ma'arif NU Sariwangi" />

      <footer className="border-t border-navy/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_0.8fr] lg:px-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-950">
              SMP Ma'arif NU Sariwangi
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-gray-600">
              {getContent(
                "footer",
                "alamat",
                "Sariwangi, Tasikmalaya, Jawa Barat",
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-700">
              <span className="inline-flex items-center gap-2">
                <Phone size={16} />
                {getContent("footer", "telepon", getContent("footer", "wa", "-"))}
              </span>
              <span>{getContent("footer", "email", "info@smpmaarifnusariwangi.sch.id")}</span>
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-950">Media Sosial</p>
            <div className="mt-3 grid gap-2 text-sm">
              {["facebook", "instagram", "youtube"].map((item) => {
                const url = content.footer?.[item];
                return url ? (
                  <a
                    key={item}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="capitalize text-navy-mid hover:text-navy"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4">
          <div className="mx-auto my-8 max-w-3xl rounded bg-white p-5 shadow-soft">
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
