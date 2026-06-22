import {
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  ImageIcon,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export type PublicEntity = "pesantren" | "smp";

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
  peserta?: {
    foto_url: string | null;
    nama: string;
    nis: string;
    kelas: string;
    status: string;
  };
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

const fallbackImage =
  "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1400&q=80";

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
    album: "Fasilitas",
    media_url:
      "https://images.unsplash.com/photo-1517164850305-99a3e65bb47e?auto=format&fit=crop&w=900&q=80",
    tipe: "foto",
  },
  {
    id: "fallback-3",
    album: "Belajar",
    media_url:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80",
    tipe: "foto",
  },
];

export function formatDate(value?: string | null) {
  if (!value) return "Tanggal menyusul";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function makeExcerpt(row: NewsRow, entityLabel: string) {
  if (row.excerpt) return row.excerpt;
  if (!row.konten) return `Baca informasi terbaru dari ${entityLabel}.`;
  return row.konten.replace(/<[^>]+>/g, "").slice(0, 150);
}

function getClientLookupKey(entitas: PublicEntity) {
  const storageKey = `${entitas}_public_lookup_key`;
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const next =
    "web-" +
    (window.crypto?.randomUUID?.() ||
      Math.random().toString(36).slice(2) + Date.now().toString(36));
  window.localStorage.setItem(storageKey, next);
  return next;
}

function isLookupLimited(entitas: PublicEntity) {
  const key = `${entitas}_lookup_attempts`;
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

export function SectionBerita({
  entitas,
  entityLabel,
  detailBasePath,
}: {
  entitas: PublicEntity;
  entityLabel: string;
  detailBasePath: string;
}) {
  const [news, setNews] = useState<NewsRow[]>([]);

  useEffect(() => {
    async function loadNews() {
      const { data } = await supabase
        .from("lp_berita")
        .select("id, judul, thumbnail_url, konten, excerpt, tanggal, created_at")
        .eq("entitas", entitas)
        .order("tanggal", { ascending: false })
        .limit(6);

      if (data) setNews(data as NewsRow[]);
    }

    loadNews();
  }, [entitas]);

  return (
    <section id="berita" className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-dark">
        Berita & Artikel
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-gray-950">
        Kabar terbaru {entityLabel}.
      </h2>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {news.length ? (
          news.map((item) => (
            <Link
              key={item.id}
              to={`${detailBasePath}/${item.id}`}
              className="overflow-hidden rounded bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lg"
            >
              <img
                src={item.thumbnail_url || fallbackImage}
                alt={item.judul}
                className="aspect-[16/10] w-full object-cover"
              />
              <div className="p-5">
                <p className="text-sm text-emerald-800">
                  {formatDate(item.tanggal || item.created_at)}
                </p>
                <h3 className="mt-2 text-lg font-semibold leading-7 text-gray-950">
                  {item.judul}
                </h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {makeExcerpt(item, entityLabel)}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded bg-white p-6 text-sm text-gray-600 shadow-soft md:col-span-2 lg:col-span-3">
            Berita {entityLabel} belum tersedia.
          </div>
        )}
      </div>
    </section>
  );
}

export function SectionAgenda({
  entitas,
  entityLabel,
}: {
  entitas: PublicEntity;
  entityLabel: string;
}) {
  const [agenda, setAgenda] = useState<AgendaRow[]>([]);

  useEffect(() => {
    async function loadAgenda() {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("lp_agenda")
        .select("id, judul, tanggal, lokasi, deskripsi")
        .eq("entitas", entitas)
        .gte("tanggal", today)
        .order("tanggal", { ascending: true })
        .limit(8);

      if (data) setAgenda(data as AgendaRow[]);
    }

    loadAgenda();
  }, [entitas]);

  return (
    <section id="agenda" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-dark">
          Agenda
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-gray-950">
          Kegiatan terdekat.
        </h2>
        <div className="mt-8 grid gap-4">
          {agenda.length ? (
            agenda.map((item) => (
              <article
                key={item.id}
                className="grid gap-4 rounded border border-emerald-900/10 bg-cream-50 p-5 md:grid-cols-[180px_1fr]"
              >
                <div className="flex items-center gap-3 text-emerald-900">
                  <CalendarDays size={22} />
                  <span className="font-semibold">{formatDate(item.tanggal)}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-950">
                    {item.judul}
                  </h3>
                  {item.lokasi ? (
                    <p className="mt-1 text-sm font-medium text-emerald-800">
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
            <div className="rounded border border-emerald-900/10 bg-cream-50 p-6 text-sm text-gray-600">
              Agenda {entityLabel} belum tersedia.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function SectionGaleri({ entitas }: { entitas: PublicEntity }) {
  const [gallery, setGallery] = useState<GalleryRow[]>([]);
  const [activeAlbum, setActiveAlbum] = useState("Semua");
  const [lightbox, setLightbox] = useState<GalleryRow | null>(null);

  useEffect(() => {
    async function loadGallery() {
      const { data } = await supabase
        .from("lp_galeri")
        .select("id, album, media_url, tipe")
        .eq("entitas", entitas)
        .order("created_at", { ascending: false })
        .limit(12);

      setGallery(data?.length ? (data as GalleryRow[]) : fallbackGallery);
    }

    loadGallery();
  }, [entitas]);

  const albums = useMemo(
    () => ["Semua", ...Array.from(new Set(gallery.map((item) => item.album || "Umum")))],
    [gallery],
  );

  const filteredGallery = useMemo(() => {
    if (activeAlbum === "Semua") return gallery;
    return gallery.filter((item) => (item.album || "Umum") === activeAlbum);
  }, [activeAlbum, gallery]);

  return (
    <section id="galeri" className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-dark">
        Galeri
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-gray-950">
        Dokumentasi kegiatan dan fasilitas.
      </h2>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {albums.map((album) => (
          <button
            key={album}
            type="button"
            onClick={() => setActiveAlbum(album)}
            className={[
              "shrink-0 rounded border px-4 py-2 text-sm font-semibold",
              activeAlbum === album
                ? "border-emerald-800 bg-emerald-800 text-white"
                : "border-emerald-900/15 bg-white text-gray-700",
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
            className="group overflow-hidden rounded bg-white text-left shadow-soft"
          >
            {item.tipe === "video" ? (
              <div className="grid aspect-[4/3] place-items-center bg-emerald-950 text-white">
                <ImageIcon size={32} />
              </div>
            ) : (
              <img
                src={item.media_url}
                alt={item.album || "Galeri"}
                className="aspect-[4/3] w-full object-cover transition group-hover:scale-105"
              />
            )}
            <div className="p-4">
              <p className="text-sm font-semibold text-emerald-900">
                {item.album || "Umum"}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {item.tipe === "video" ? "Video" : "Foto"}
              </p>
            </div>
          </button>
        ))}
      </div>

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
              alt={lightbox.album || "Galeri"}
              className="max-h-[84vh] w-full max-w-5xl rounded object-contain"
            />
          )}
        </div>
      ) : null}
    </section>
  );
}

export function SeksiCekPembayaran({
  entitas,
  personLabel,
  recordLabel,
}: {
  entitas: PublicEntity;
  personLabel: string;
  recordLabel: string;
}) {
  const [lookupCode, setLookupCode] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const participant = lookup?.peserta || lookup?.santri;

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookup(null);
    setLookupError("");

    const trimmedCode = lookupCode.trim();
    if (!trimmedCode) {
      setLookupError(`Masukkan kode unik ${personLabel} terlebih dahulu.`);
      return;
    }

    if (isLookupLimited(entitas)) {
      setLookupError("Terlalu banyak percobaan. Silakan coba lagi dalam 1 menit.");
      return;
    }

    setLookupLoading(true);
    const rpcName =
      entitas === "pesantren"
        ? "lookup_pesantren_student_record"
        : "lookup_smp_student_record";
    const { data, error } = await supabase.rpc(rpcName, {
      p_kode_unik: trimmedCode,
      p_client_key: getClientLookupKey(entitas),
    });

    if (error) {
      const fallback = await supabase.rpc("get_public_payment_status", {
        p_kode_unik: trimmedCode,
      });
      setLookupLoading(false);

      const rows = (fallback.data || []).filter(
        (item: Record<string, unknown>) => item.entitas === entitas,
      );
      if (fallback.error || !rows.length) {
        setLookupError("Kode tidak valid atau data belum tersedia.");
        return;
      }

      setLookup({
        status: "ok",
        peserta: {
          foto_url: null,
          nama: rows[0].anggota_nama,
          nis: "-",
          kelas: "-",
          status: "aktif",
        },
        tagihan: rows.map((item: Record<string, unknown>) => ({
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

  async function downloadSummary() {
    if (!participant) return;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Rekap Pembayaran dan ${recordLabel}`, 14, 18);
    doc.setFontSize(11);
    doc.text(`Nama: ${participant.nama}`, 14, 32);
    doc.text(`NIS: ${participant.nis}`, 14, 39);
    doc.text(`Kelas/Angkatan: ${participant.kelas}`, 14, 46);
    doc.text(`Status: ${participant.status}`, 14, 53);

    let y = 68;
    doc.setFontSize(13);
    doc.text("Tagihan", 14, y);
    y += 8;
    doc.setFontSize(10);
    (lookup?.tagihan || []).forEach((bill, index) => {
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
    (lookup?.raport || []).slice(0, 12).forEach((item) => {
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

    doc.save(`rekap-${participant.nis || personLabel}.pdf`);
  }

  return (
    <section id="cek-santri" className="bg-emerald-950 py-16 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[0.85fr_1.15fr] lg:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-soft">
            Cek Pembayaran & {recordLabel}
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Masukkan kode unik untuk melihat data {personLabel}.
          </h2>
          <p className="mt-4 leading-7 text-emerald-50">
            Sistem hanya menampilkan data jika kode unik cocok. Percobaan
            dibatasi untuk melindungi data {personLabel}.
          </p>
          <form onSubmit={handleLookup} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              value={lookupCode}
              onChange={(event) => setLookupCode(event.target.value)}
              placeholder={`Kode unik ${personLabel}`}
              className="min-h-12 flex-1 rounded border border-white/20 bg-white px-4 text-gray-950 outline-none focus:ring-2 focus:ring-gold"
            />
            <button
              type="submit"
              disabled={lookupLoading}
              className="inline-flex min-h-12 items-center justify-center rounded bg-gold px-5 text-sm font-semibold text-emerald-950 transition hover:bg-gold-soft disabled:opacity-70"
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

        <div className="rounded bg-white p-5 text-gray-950 shadow-soft">
          {participant ? (
            <div className="grid gap-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {participant.foto_url ? (
                  <img
                    src={participant.foto_url}
                    alt={participant.nama}
                    className="h-24 w-24 rounded object-cover"
                  />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded bg-emerald-50 text-emerald-900">
                    <FileText size={28} />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold">{participant.nama}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    NIS {participant.nis} - {participant.kelas}
                  </p>
                  <p className="mt-2 inline-flex rounded bg-emerald-50 px-3 py-1 text-sm font-semibold capitalize text-emerald-800">
                    {participant.status}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="font-semibold">Status & Riwayat Tagihan</h4>
                  <button
                    type="button"
                    onClick={downloadSummary}
                    className="inline-flex items-center rounded border border-emerald-900/15 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
                  >
                    <Download className="mr-2" size={16} />
                    Unduh Rekap PDF
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  {lookup?.tagihan?.length ? (
                    lookup.tagihan.map((bill) => (
                      <article key={bill.id} className="rounded border border-gray-200 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold">
                              {bill.jenis_tagihan || "Tagihan"}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              Jatuh tempo {formatDate(bill.jatuh_tempo)}
                            </p>
                          </div>
                          <span className="rounded bg-emerald-50 px-3 py-1 text-sm font-semibold capitalize text-emerald-800">
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
                                    className="inline-flex items-center font-semibold text-emerald-800"
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
                  {lookup?.raport?.length ? (
                    lookup.raport.slice(0, 8).map((item) => (
                      <div
                        key={`${item.mata_pelajaran}-${item.periode}`}
                        className="rounded bg-cream-50 p-3 text-sm"
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
            <div className="grid min-h-[360px] place-items-center rounded border border-dashed border-emerald-900/20 bg-cream-50 p-6 text-center">
              <div>
                <CheckCircle2 className="mx-auto text-emerald-800" size={36} />
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
  );
}

export function SectionSaranKritik({
  entitas,
  entityLabel,
}: {
  entitas: PublicEntity;
  entityLabel: string;
}) {
  const [form, setForm] = useState({ nama: "", kontak: "", pesan: "" });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (!form.pesan.trim()) {
      setStatus("Pesan wajib diisi.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("lp_saran_kritik").insert({
      entitas,
      nama: form.nama.trim() || null,
      kontak: form.kontak.trim() || null,
      pesan: form.pesan.trim(),
    });
    setLoading(false);

    if (error) {
      setStatus("Saran belum terkirim. Silakan coba lagi.");
      return;
    }

    setForm({ nama: "", kontak: "", pesan: "" });
    setStatus("Terima kasih. Saran dan kritik sudah tersimpan.");
  }

  return (
    <section
      id="saran"
      className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-6"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-dark">
          Saran & Kritik
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-gray-950">
          Sampaikan masukan untuk {entityLabel}.
        </h2>
        <p className="mt-4 leading-7 text-gray-600">
          Setiap pesan akan masuk ke data saran dan kritik untuk ditinjau oleh
          pengelola.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="rounded bg-white p-6 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Nama
            <input
              value={form.nama}
              onChange={(event) =>
                setForm((current) => ({ ...current, nama: event.target.value }))
              }
              className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Kontak (opsional)
            <input
              value={form.kontak}
              onChange={(event) =>
                setForm((current) => ({ ...current, kontak: event.target.value }))
              }
              className="min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-semibold text-gray-700">
          Pesan
          <textarea
            value={form.pesan}
            onChange={(event) =>
              setForm((current) => ({ ...current, pesan: event.target.value }))
            }
            rows={5}
            className="rounded border border-gray-200 px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700"
          />
        </label>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-70"
          >
            <MessageSquare className="mr-2" size={18} />
            {loading ? "Mengirim..." : "Kirim Pesan"}
          </button>
          {status ? (
            <p className="text-sm font-medium text-emerald-800">{status}</p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
