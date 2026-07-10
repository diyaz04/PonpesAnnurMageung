import { CheckCircle2, FileText, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type ValidationPayload = {
  status: "valid" | "not_found";
  surat?: {
    id: string;
    nomor_surat: string | null;
    jenis_surat: string;
    perihal: string | null;
    ditujukan: string | null;
    tanggal_surat: string;
    file_url: string | null;
    penandatangan?: LetterSigner[];
    created_at: string;
  };
};

type LetterSigner = {
  relation?: string;
  role?: string;
  name?: string;
  primary?: boolean;
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

export default function SmpLetterValidationPage() {
  const { id } = useParams();
  const [payload, setPayload] = useState<ValidationPayload | null>(null);
  const [documentUrl, setDocumentUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadValidation() {
      if (!id) {
        setError("Kode validasi tidak ditemukan.");
        setLoading(false);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc("validate_smp_surat_keluar", {
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

  useEffect(() => {
    let objectUrl = "";

    async function loadDocument() {
      const fileUrl = payload?.surat?.file_url;
      if (!fileUrl || payload.status !== "valid") return;

      const { data } = await supabase.storage.from("smp-surat-keluar").download(fileUrl);
      if (!data) return;
      objectUrl = URL.createObjectURL(data);
      setDocumentUrl(objectUrl);
    }

    loadDocument();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [payload]);

  const signers = payload?.surat?.penandatangan || [];

  return (
    <div className="min-h-[calc(100svh-76px)] bg-[#f7faf7]">
      <section className="bg-emerald-950 px-4 py-14 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded bg-emerald-400 text-emerald-950">
              <ShieldCheck size={26} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                Validasi Surat SMP
              </p>
              <h1 className="mt-1 text-2xl font-semibold">SMP Ma'arif NU Sariwangi</h1>
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
                  {error || "Kode QR ini tidak cocok dengan arsip surat SMP."}
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
                    <h2 className="text-xl font-semibold text-gray-950">Surat Valid</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Data surat cocok dengan arsip resmi SMP.
                    </p>
                  </div>
                </div>
                {documentUrl ? (
                  <a
                    href={documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
                  >
                    <FileText className="mr-2" size={17} />
                    Buka Dokumen
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded bg-white p-6 shadow-soft">
              <h3 className="font-semibold text-gray-950">Detail Surat</h3>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <p><span className="text-gray-500">Nomor:</span> {payload.surat?.nomor_surat || "-"}</p>
                <p><span className="text-gray-500">Jenis:</span> {payload.surat?.jenis_surat}</p>
                <p><span className="text-gray-500">Perihal:</span> {payload.surat?.perihal || "-"}</p>
                <p><span className="text-gray-500">Ditujukan:</span> {payload.surat?.ditujukan || "-"}</p>
                <p><span className="text-gray-500">Tanggal Surat:</span> {formatDate(payload.surat?.tanggal_surat)}</p>
                <p><span className="text-gray-500">Diarsipkan:</span> {formatDateTime(payload.surat?.created_at)}</p>
              </div>
            </div>

            <div className="rounded bg-white p-6 shadow-soft">
              <h3 className="font-semibold text-gray-950">Penanda Tangan</h3>
              <div className="mt-4 grid gap-3">
                {signers.length ? (
                  signers.map((signer, index) => (
                    <div key={`${signer.name || signer.role || index}-${index}`} className="rounded border border-gray-100 bg-gray-50 p-3 text-sm">
                      <p className="font-semibold text-gray-950">{signer.name || "-"}</p>
                      <p className="mt-1 text-gray-600">{signer.role || "-"}</p>
                      <p className="mt-1 text-xs font-semibold text-emerald-800">
                        {signer.primary ? "Penanda tangan utama" : signer.relation || "Mengetahui"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Data penanda tangan belum tercatat pada arsip surat ini.</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
