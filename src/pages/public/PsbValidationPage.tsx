import { CheckCircle2, FileText, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type ValidationPayload = {
  status: "valid" | "not_found";
  pendaftar?: {
    id: string;
    nomor_pendaftaran: string | null;
    tahun_ajaran: string | null;
    nama_lengkap: string;
    jenis_kelamin: string | null;
    tanggal_lahir: string | null;
    alamat: string | null;
    nama_orang_tua: string | null;
    no_hp: string | null;
    status: "baru" | "diverifikasi" | "diterima" | "ditolak";
    bukti_url: string | null;
    created_at: string;
    updated_at: string;
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
  if (value === "baru") return "Belum terverifikasi";
  if (value === "diverifikasi") return "Terverifikasi";
  if (value === "diterima") return "Diterima";
  if (value === "ditolak") return "Ditolak";
  return "-";
}

function statusClass(value?: string | null) {
  if (value === "diverifikasi" || value === "diterima") return "bg-emerald-50 text-emerald-700";
  if (value === "ditolak") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

export default function PsbValidationPage() {
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

      const { data, error: rpcError } = await supabase.rpc("validate_pp_psb", {
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

  const proofUrl = payload?.pendaftar?.bukti_url
    ? supabase.storage.from("pp-psb-bukti").getPublicUrl(payload.pendaftar.bukti_url).data.publicUrl
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
                Validasi Bukti PSB
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Pondok Pesantren An-Nur Mageung</h1>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-4xl gap-5 px-4 py-8">
        {loading ? (
          <div className="rounded bg-white p-6 shadow-soft">Memeriksa bukti pendaftaran...</div>
        ) : error || payload?.status !== "valid" ? (
          <div className="rounded bg-white p-6 shadow-soft">
            <div className="flex items-start gap-3 text-red-700">
              <XCircle className="mt-0.5" size={24} />
              <div>
                <h2 className="text-lg font-semibold">Bukti pendaftaran tidak ditemukan</h2>
                <p className="mt-2 text-sm text-gray-600">
                  {error || "Kode QR ini tidak cocok dengan arsip PSB pesantren."}
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
                    <h2 className="text-xl font-semibold text-gray-950">Bukti Pendaftaran Valid</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Data pendaftaran cocok dengan arsip resmi pesantren.
                    </p>
                  </div>
                </div>
                {proofUrl ? (
                  <a
                    href={proofUrl}
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

            <div className="grid gap-5 md:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded bg-white p-6 shadow-soft">
                <h3 className="font-semibold text-gray-950">Status Pendaftaran</h3>
                <span
                  className={[
                    "mt-4 inline-flex rounded px-3 py-1.5 text-sm font-semibold",
                    statusClass(payload.pendaftar?.status),
                  ].join(" ")}
                >
                  {statusLabel(payload.pendaftar?.status)}
                </span>
                <div className="mt-4 grid gap-3 text-sm">
                  <p><span className="text-gray-500">Nomor:</span> {payload.pendaftar?.nomor_pendaftaran || "-"}</p>
                  <p><span className="text-gray-500">Tahun Ajaran:</span> {payload.pendaftar?.tahun_ajaran || "-"}</p>
                  <p><span className="text-gray-500">Tanggal Daftar:</span> {formatDateTime(payload.pendaftar?.created_at)}</p>
                </div>
              </div>

              <div className="rounded bg-white p-6 shadow-soft">
                <h3 className="font-semibold text-gray-950">Data Input Pendaftaran</h3>
                <div className="mt-4 grid gap-3 text-sm">
                  <p><span className="text-gray-500">Nama:</span> {payload.pendaftar?.nama_lengkap}</p>
                  <p><span className="text-gray-500">Jenis Kelamin:</span> {payload.pendaftar?.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}</p>
                  <p><span className="text-gray-500">Tanggal Lahir:</span> {formatDate(payload.pendaftar?.tanggal_lahir)}</p>
                  <p><span className="text-gray-500">Orang Tua/Wali:</span> {payload.pendaftar?.nama_orang_tua || "-"}</p>
                  <p><span className="text-gray-500">No HP:</span> {payload.pendaftar?.no_hp || "-"}</p>
                  <p><span className="text-gray-500">Alamat:</span> {payload.pendaftar?.alamat || "-"}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
