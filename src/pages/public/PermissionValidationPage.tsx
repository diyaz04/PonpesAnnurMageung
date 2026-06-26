import { CheckCircle2, FileText, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type ValidationPayload = {
  status: "valid" | "not_found";
  surat?: {
    id: string;
    nomor_surat: string | null;
    jenis_izin: string;
    tujuan: string | null;
    alasan: string;
    tanggal_mulai: string;
    tanggal_selesai: string | null;
    jam_keluar: string | null;
    jam_kembali: string | null;
    waktu_kembali_aktual: string | null;
    penjemput: string | null;
    status: string;
    file_url: string | null;
    created_at: string;
  };
  santri?: {
    nama: string;
    nis: string;
    kelas_pengajian: string;
    tahun_masuk: number;
  };
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(value?: string | null) {
  if (value === "selesai") return "Sudah kembali";
  return (value || "-").replace(/_/g, " ");
}

export default function PermissionValidationPage() {
  const { id } = useParams();
  const [payload, setPayload] = useState<ValidationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadValidation() {
      if (!id) {
        setError("Kode validasi tidak ditemukan.");
        setLoading(false);
        return;
      }
      const { data, error: rpcError } = await supabase.rpc("validate_pp_perizinan", {
        p_id: id,
      });
      setLoading(false);
      if (rpcError) {
        setError("Validasi belum bisa diproses.");
        return;
      }
      setPayload(data as ValidationPayload);
    }
    loadValidation();
  }, [id]);

  const pdfUrl = payload?.surat?.file_url
    ? supabase.storage.from("pp-perizinan-pdf").getPublicUrl(payload.surat.file_url).data.publicUrl
    : "";

  return (
    <div className="min-h-[calc(100svh-76px)] bg-[#f7faf7]">
      <section className="bg-green-950 px-4 py-14 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded bg-green-500 text-green-950">
              <ShieldCheck size={26} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-300">
                Validasi Surat Izin
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Pondok Pesantren An-Nur Mageung</h1>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-4xl gap-5 px-4 py-8">
        {loading ? (
          <div className="rounded bg-white p-6 shadow-soft">Memeriksa validitas surat...</div>
        ) : error || payload?.status !== "valid" ? (
          <div className="rounded bg-white p-6 shadow-soft">
            <div className="flex items-start gap-3 text-red-700">
              <XCircle className="mt-0.5" size={24} />
              <div>
                <h2 className="text-lg font-semibold">Surat tidak ditemukan</h2>
                <p className="mt-2 text-sm text-gray-600">
                  {error || "Kode QR ini tidak cocok dengan arsip perizinan pesantren."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded bg-white p-6 shadow-soft">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 text-emerald-700" size={28} />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-950">Surat Izin Valid</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Data surat cocok dengan arsip resmi pesantren.
                    </p>
                  </div>
                </div>
                {pdfUrl ? (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
                  >
                    <FileText className="mr-2" size={17} />
                    Buka PDF
                  </a>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded bg-white p-6 shadow-soft">
                <h3 className="font-semibold text-gray-950">Data Santri</h3>
                <div className="mt-4 grid gap-3 text-sm">
                  <p><span className="text-gray-500">Nama:</span> {payload.santri?.nama}</p>
                  <p><span className="text-gray-500">NIS:</span> {payload.santri?.nis}</p>
                  <p><span className="text-gray-500">Kelas Pengajian:</span> {payload.santri?.kelas_pengajian}</p>
                  <p><span className="text-gray-500">Tahun Masuk:</span> {payload.santri?.tahun_masuk}</p>
                </div>
              </div>

              <div className="rounded bg-white p-6 shadow-soft">
                <h3 className="font-semibold text-gray-950">Detail Izin</h3>
                <div className="mt-4 grid gap-3 text-sm">
                  <p><span className="text-gray-500">Nomor:</span> {payload.surat?.nomor_surat || "-"}</p>
                  <p><span className="text-gray-500">Jenis:</span> {payload.surat?.jenis_izin}</p>
                  <p><span className="text-gray-500">Tanggal:</span> {formatDate(payload.surat?.tanggal_mulai)} - {formatDate(payload.surat?.tanggal_selesai)}</p>
                  <p><span className="text-gray-500">Status:</span> {statusLabel(payload.surat?.status)}</p>
                  <p><span className="text-gray-500">Sudah kembali:</span> {formatDateTime(payload.surat?.waktu_kembali_aktual)}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
