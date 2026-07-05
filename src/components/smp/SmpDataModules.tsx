import {
  Camera,
  Download,
  FileText,
  FileUp,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  UserCheck,
  Briefcase,
  BookOpen,
  ClipboardCheck,
  Mail,
  Users,
  Megaphone,
  ArrowLeftRight,
  FileSignature,
  ShieldCheck,
  ArrowLeft,
  FileCheck,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifiedMessage, notifyWarning } from "../../lib/notify";
import {
  downloadExcelTemplate,
  excelCellToText,
  normalizeGender,
  normalizeStatus,
  parseExcelDate,
  parseExcelFile,
  parseExcelNumber,
  type ExcelColumn,
} from "../../lib/excelImport";
import { supabase } from "../../lib/supabase";
import {
  downloadAllStudentCards,
  downloadStudentBiodata,
  downloadStudentCard,
  type StudentDocumentData,
} from "../../lib/studentDocuments";
import AccountManagementModule from "../admin/AccountManagementModule";
import FinanceModule from "../finance/FinanceModule";
import LandingContentAdmin from "../landing-admin/LandingContentAdmin";

type Siswa = {
  id: string;
  nis: string;
  nisn: string | null;
  kode_unik: string;
  nama_lengkap: string;
  jenis_kelamin: "L" | "P";
  kelas: string | null;
  tahun_masuk: number;
  tanggal_lahir: string | null;
  alamat: string | null;
  nama_wali: string | null;
  no_hp_wali: string | null;
  foto_url: string | null;
  status: "aktif" | "alumni" | "keluar";
};

type Guru = {
  id: string;
  user_id: string | null;
  nama_lengkap: string;
  no_hp: string | null;
  mata_pelajaran: string | null;
  foto_url: string | null;
};

type RaportConfig = {
  id: string;
  mata_pelajaran: string;
  kelas: string | null;
  semester: string | null;
  periode: string;
  format_nilai: "angka" | "huruf" | "predikat";
};

type RaportPeriode = {
  id: string;
  tahun_ajaran: string;
  semester: string;
  nama: string | null;
  status: "draft" | "aktif" | "terbuka" | "ditutup" | "published";
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  catatan: string | null;
};

type RaportMapel = {
  id: string;
  periode_id: string;
  kelas: string;
  mata_pelajaran: string;
  kelompok: string | null;
  format_nilai: "angka" | "huruf" | "predikat";
  kkm: number | null;
  urutan: number;
};

type RaportPenugasan = {
  id: string;
  periode_id: string;
  mapel_id: string;
  guru_id: string;
  siswa_id: string;
  kelas: string;
  guru?: Pick<Guru, "nama_lengkap" | "mata_pelajaran">;
  mapel?: Pick<RaportMapel, "mata_pelajaran">;
  siswa?: Pick<Siswa, "nama_lengkap" | "nis" | "kelas">;
};

type RaportNilaiDetail = {
  id: string;
  siswa_id: string;
  mapel_id: string;
  guru_id: string | null;
  nilai: string | null;
  predikat: string | null;
  deskripsi: string | null;
  catatan: string | null;
};

type RaportPublikasi = {
  id: string;
  periode_id: string;
  siswa_id: string;
  status: "draft" | "published";
  pdf_url: string | null;
  catatan: string | null;
  published_at: string | null;
  siswa?: Pick<Siswa, "nama_lengkap" | "nis" | "kelas">;
};

type PelanggaranJenis = {
  id: string;
  nama: string;
  bobot_poin: number;
  tingkatan: "ringan" | "sedang" | "berat" | null;
};

type SpmbRow = {
  id: string;
  tahun_ajaran: string | null;
  nomor_pendaftaran: string | null;
  nama_lengkap: string;
  jenis_kelamin: string | null;
  tanggal_lahir: string | null;
  alamat: string | null;
  nama_orang_tua: string | null;
  no_hp: string | null;
  asal_sekolah: string | null;
  dokumen_url: string | null;
  foto_url: string | null;
  bukti_url: string | null;
  status: "baru" | "diverifikasi" | "diterima" | "ditolak";
  created_at: string;
  updated_at: string | null;
};

type PresensiRow = {
  id: string;
  siswa_id: string;
  tanggal: string;
  jam_masuk: string | null;
  status: "hadir" | "izin" | "sakit" | "alpa" | "terlambat";
  metode: "manual" | "qr" | "face_recognition";
  siswa?: { nama_lengkap: string; nis: string; kelas: string | null };
};

type WajahData = {
  id: string;
  siswa_id: string;
  descriptor: number[] | number[][];
  aktif: boolean;
  siswa?: { nama_lengkap: string; kelas: string | null };
};

const inputClass =
  "min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700";

const emptySiswa: Partial<Siswa> = {
  nama_lengkap: "",
  jenis_kelamin: "L",
  kelas: "",
  tahun_masuk: new Date().getFullYear(),
  status: "aktif",
};

type SiswaImportKey =
  | "nis"
  | "nisn"
  | "kode_unik"
  | "nama_lengkap"
  | "jenis_kelamin"
  | "kelas"
  | "tahun_masuk"
  | "tanggal_lahir"
  | "alamat"
  | "nama_wali"
  | "no_hp_wali"
  | "status";

const siswaImportColumns: ExcelColumn<SiswaImportKey>[] = [
  { key: "nis", header: "NIS", example: "2526-L-0001" },
  { key: "nisn", header: "NISN", example: "0123456789" },
  { key: "kode_unik", header: "Kode Unik", example: "ABC12345" },
  { key: "nama_lengkap", header: "Nama Lengkap", required: true, example: "Siti Aminah" },
  { key: "jenis_kelamin", header: "Jenis Kelamin", required: true, example: "P" },
  { key: "kelas", header: "Kelas", example: "VII A" },
  { key: "tahun_masuk", header: "Tahun Masuk", required: true, example: "2026" },
  { key: "tanggal_lahir", header: "Tanggal Lahir", example: "2012-05-20" },
  { key: "alamat", header: "Alamat", example: "Sariwangi, Tasikmalaya" },
  { key: "nama_wali", header: "Nama Wali", example: "Ibu Halimah" },
  { key: "no_hp_wali", header: "No HP Wali", example: "081234567890" },
  { key: "status", header: "Status", example: "aktif" },
];

const suratTemplates = [
  "Surat Keterangan Aktif Sekolah",
  "Surat Keterangan Lulus / Alumni",
  "Surat Izin Kegiatan",
  "Surat Panggilan Orang Tua / Wali",
  "Surat Keterangan Pindah / Mutasi",
  "Surat Keterangan Kelakuan Baik",
  "Surat Undangan Acara/Kegiatan",
  "Surat Keterangan Lainnya",
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function randomCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function buildNis(tahunMasuk: number, gender: string, sequence: number) {
  const start = String(tahunMasuk).slice(-2);
  const end = String(tahunMasuk + 1).slice(-2);
  return `${start}${end}-${gender || "L"}-${String(sequence).padStart(4, "0")}`;
}

function matchText(value: string | null | undefined, query: string) {
  return (value || "").toLowerCase().includes(query.toLowerCase());
}

function siswaToDocumentData(row: Siswa): StudentDocumentData {
  return {
    nama: row.nama_lengkap,
    nomorInduk: row.nis,
    nomorIndukLabel: "NIS",
    kodeUnik: row.kode_unik,
    jenisKelamin: row.jenis_kelamin,
    tahunMasuk: row.tahun_masuk,
    tanggalLahir: row.tanggal_lahir,
    kelas: row.kelas,
    alamat: row.alamat,
    namaWali: row.nama_wali,
    noHpWali: row.no_hp_wali,
    fotoUrl: row.foto_url,
    status: row.status,
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-gray-700">
      {label}
      {children}
    </label>
  );
}

function ModuleShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5">
      <div className="rounded bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
          Modul Admin SMP
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-gray-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: React.ReactNode[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-hidden rounded bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.12em] text-gray-500">
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="px-4 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={headers.length}>
                  Data belum tersedia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function uploadPublicFile(bucket: string, folder: string, file: File) {
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${Date.now()}-${randomCode(6)}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function DataSiswaModule() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Siswa[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("aktif");
  const [kelasFilter, setKelasFilter] = useState("");
  const [editing, setEditing] = useState<Partial<Siswa> | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);

  async function loadRows() {
    const { data } = await supabase
      .from("smp_siswa")
      .select("*")
      .neq("status", "alumni")
      .order("created_at", { ascending: false });
    setRows((data || []) as Siswa[]);
  }

  useEffect(() => {
    loadRows();
  }, []);

  const kelasList = Array.from(new Set(rows.map((row) => row.kelas).filter(Boolean))) as string[];
  const filteredRows = rows.filter((row) => {
    const bySearch =
      matchText(row.nama_lengkap, search) ||
      matchText(row.nis, search) ||
      matchText(row.nisn, search);
    return (
      bySearch &&
      (statusFilter ? row.status === statusFilter : true) &&
      (kelasFilter ? row.kelas === kelasFilter : true)
    );
  });

  async function saveSiswa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing?.nama_lengkap || !editing.jenis_kelamin || !editing.tahun_masuk) {
      setMessage("Nama, jenis kelamin, dan tahun masuk wajib diisi.");
      return;
    }

    let fotoUrl = editing.foto_url || null;
    if (photoFile) fotoUrl = await uploadPublicFile("siswa-foto", "siswa", photoFile);

    const sequence =
      rows.filter(
        (row) =>
          row.tahun_masuk === Number(editing.tahun_masuk) &&
          row.jenis_kelamin === editing.jenis_kelamin,
      ).length + 1;

    const payload = {
      nis:
        editing.nis ||
        buildNis(Number(editing.tahun_masuk), editing.jenis_kelamin, sequence),
      nisn: editing.nisn || null,
      kode_unik: editing.kode_unik || randomCode(),
      nama_lengkap: editing.nama_lengkap,
      jenis_kelamin: editing.jenis_kelamin,
      kelas: editing.kelas || null,
      tahun_masuk: Number(editing.tahun_masuk),
      tanggal_lahir: editing.tanggal_lahir || null,
      alamat: editing.alamat || null,
      nama_wali: editing.nama_wali || null,
      no_hp_wali: editing.no_hp_wali || null,
      foto_url: fotoUrl,
      status: editing.status || "aktif",
    };

    const result = editing.id
      ? await supabase.from("smp_siswa").update(payload).eq("id", editing.id)
      : await supabase.from("smp_siswa").insert(payload);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setEditing(null);
    setPhotoFile(null);
    setMessage("Data siswa tersimpan.");
    loadRows();
  }

  async function downloadSiswaTemplate() {
    await downloadExcelTemplate({
      columns: siswaImportColumns,
      filename: "template-import-siswa-smp.xlsx",
      sheetName: "Import Siswa",
    });
  }

  async function importSiswaExcel(file: File | null) {
    if (!file) return;
    setImporting(true);
    setMessage("");

    try {
      const importedRows = await parseExcelFile(file, siswaImportColumns);

      if (!importedRows.length) {
        setMessage("File Excel kosong atau belum berisi data siswa.");
        return;
      }

      const errors: string[] = [];
      const nisSet = new Set(rows.map((row) => row.nis));
      const nisnSet = new Set(rows.map((row) => row.nisn).filter(Boolean));
      const codeSet = new Set(rows.map((row) => row.kode_unik));
      const sequenceByYearGender = new Map<string, number>();

      rows.forEach((row) => {
        const key = `${row.tahun_masuk}-${row.jenis_kelamin}`;
        sequenceByYearGender.set(key, (sequenceByYearGender.get(key) || 0) + 1);
      });

      const payloads = importedRows.map((row, index) => {
        const rowNumber = index + 2;
        const nama = excelCellToText(row.nama_lengkap);
        const jenisKelamin = normalizeGender(row.jenis_kelamin) as Siswa["jenis_kelamin"];
        const tahunMasuk = parseExcelNumber(row.tahun_masuk);
        const nisn = excelCellToText(row.nisn) || null;

        if (!nama) errors.push(`Baris ${rowNumber}: Nama Lengkap wajib diisi.`);
        if (!jenisKelamin) errors.push(`Baris ${rowNumber}: Jenis Kelamin harus L atau P.`);
        if (!tahunMasuk) errors.push(`Baris ${rowNumber}: Tahun Masuk wajib angka.`);
        if (nisn && nisnSet.has(nisn)) errors.push(`Baris ${rowNumber}: NISN duplikat.`);

        const sequenceKey = `${tahunMasuk || new Date().getFullYear()}-${jenisKelamin || "L"}`;
        const nextSequence = (sequenceByYearGender.get(sequenceKey) || 0) + 1;
        sequenceByYearGender.set(sequenceKey, nextSequence);

        let nis = excelCellToText(row.nis) || buildNis(Number(tahunMasuk), jenisKelamin, nextSequence);
        let kodeUnik = excelCellToText(row.kode_unik) || randomCode();

        while (nisSet.has(nis)) {
          const next = (sequenceByYearGender.get(sequenceKey) || 0) + 1;
          sequenceByYearGender.set(sequenceKey, next);
          nis = buildNis(Number(tahunMasuk), jenisKelamin, next);
        }

        while (codeSet.has(kodeUnik)) {
          kodeUnik = randomCode();
        }

        nisSet.add(nis);
        if (nisn) nisnSet.add(nisn);
        codeSet.add(kodeUnik);

        return {
          nis,
          nisn,
          kode_unik: kodeUnik,
          nama_lengkap: nama,
          jenis_kelamin: jenisKelamin,
          kelas: excelCellToText(row.kelas) || null,
          tahun_masuk: Number(tahunMasuk),
          tanggal_lahir: parseExcelDate(row.tanggal_lahir),
          alamat: excelCellToText(row.alamat) || null,
          nama_wali: excelCellToText(row.nama_wali) || null,
          no_hp_wali: excelCellToText(row.no_hp_wali) || null,
          foto_url: null,
          status: normalizeStatus(row.status) as Siswa["status"],
        };
      });

      if (errors.length) {
        setMessage(errors.slice(0, 5).join(" "));
        return;
      }

      const { error } = await supabase.from("smp_siswa").insert(payloads);
      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(`${payloads.length} data siswa berhasil diimport dari Excel.`);
      loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import Excel gagal.");
    } finally {
      setImporting(false);
    }
  }

  async function downloadCard(row: Siswa) {
    setGeneratingDocs(true);
    try {
      await downloadStudentCard("smp", siswaToDocumentData(row));
    } finally {
      setGeneratingDocs(false);
    }
  }

  async function downloadBiodata(row: Siswa) {
    setGeneratingDocs(true);
    try {
      await downloadStudentBiodata("smp", siswaToDocumentData(row));
    } finally {
      setGeneratingDocs(false);
    }
  }

  async function downloadAllCards() {
    setGeneratingDocs(true);
    try {
      await downloadAllStudentCards("smp", filteredRows.map(siswaToDocumentData));
      setMessage(`${filteredRows.length} kartu siswa masuk ke file PDF.`);
    } finally {
      setGeneratingDocs(false);
    }
  }

  async function resetKode(row: Siswa) {
    const kodeBaru = randomCode();
    const { error } = await supabase
      .from("smp_siswa")
      .update({ kode_unik: kodeBaru })
      .eq("id", row.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    await supabase.from("smp_kode_unik_audit").insert({
      siswa_id: row.id,
      kode_lama: row.kode_unik,
      kode_baru: kodeBaru,
      pelaku_id: user?.id || null,
    });
    setMessage("Kode unik siswa berhasil direset.");
    loadRows();
  }

  async function updateStatus(row: Siswa, status: Siswa["status"]) {
    const { error } = await supabase
      .from("smp_siswa")
      .update({ status })
      .eq("id", row.id);
    setMessage(error ? error.message : "Status siswa diperbarui.");
    loadRows();
  }

  async function deleteSiswa(row: Siswa) {
    const { error } = await supabase.from("smp_siswa").delete().eq("id", row.id);
    setMessage(error ? error.message : "Data siswa dihapus.");
    loadRows();
  }

  return (
    <ModuleShell
      title="Data Siswa"
      description="CRUD siswa, biodata wali, foto, NIS otomatis, kode unik, dan status alumni/keluar."
    >
      <div className="rounded bg-white p-5 shadow-soft">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, NIS, atau NISN"
              className={`${inputClass} w-full pl-10`}
            />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>
            <option value="">Semua status</option>
            <option value="aktif">Aktif</option>
            <option value="keluar">Keluar</option>
          </select>
          <select value={kelasFilter} onChange={(event) => setKelasFilter(event.target.value)} className={inputClass}>
            <option value="">Semua kelas</option>
            {kelasList.map((kelas) => (
              <option key={kelas} value={kelas}>{kelas}</option>
            ))}
          </select>
          <button onClick={() => setEditing(emptySiswa)} className="inline-flex items-center justify-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
            <Plus className="mr-2" size={17} />
            Tambah
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={downloadSiswaTemplate}
            className="inline-flex items-center rounded border border-emerald-900/15 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
          >
            <Download className="mr-2" size={17} />
            Download Template Excel
          </button>
          <label className="inline-flex cursor-pointer items-center rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50">
            <FileUp className="mr-2" size={17} />
            {importing ? "Mengimport..." : "Import Excel"}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={importing}
              onChange={(event) => {
                importSiswaExcel(event.target.files?.[0] || null);
                event.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            disabled={generatingDocs || !filteredRows.length}
            onClick={downloadAllCards}
            className="inline-flex items-center rounded bg-green-500 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            <Download className="mr-2" size={17} />
            {generatingDocs ? "Membuat PDF..." : "Download Semua Kartu"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </div>

      {editing ? (
        <form onSubmit={saveSiswa} className="rounded bg-white p-5 shadow-soft">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Nama lengkap">
              <input value={editing.nama_lengkap || ""} onChange={(event) => setEditing((cur) => ({ ...cur, nama_lengkap: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Jenis kelamin">
              <select value={editing.jenis_kelamin || "L"} onChange={(event) => setEditing((cur) => ({ ...cur, jenis_kelamin: event.target.value as "L" | "P" }))} className={inputClass}>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </Field>
            <Field label="Kelas">
              <input value={editing.kelas || ""} onChange={(event) => setEditing((cur) => ({ ...cur, kelas: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Tahun masuk">
              <input type="number" value={editing.tahun_masuk || ""} onChange={(event) => setEditing((cur) => ({ ...cur, tahun_masuk: Number(event.target.value) }))} className={inputClass} />
            </Field>
            <Field label="NIS">
              <input value={editing.nis || ""} onChange={(event) => setEditing((cur) => ({ ...cur, nis: event.target.value }))} placeholder="Otomatis jika kosong" className={inputClass} />
            </Field>
            <Field label="NISN">
              <input value={editing.nisn || ""} onChange={(event) => setEditing((cur) => ({ ...cur, nisn: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Kode unik">
              <input value={editing.kode_unik || ""} onChange={(event) => setEditing((cur) => ({ ...cur, kode_unik: event.target.value }))} placeholder="Otomatis jika kosong" className={inputClass} />
            </Field>
            <Field label="Tanggal lahir">
              <input type="date" value={editing.tanggal_lahir || ""} onChange={(event) => setEditing((cur) => ({ ...cur, tanggal_lahir: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Status">
              <select value={editing.status || "aktif"} onChange={(event) => setEditing((cur) => ({ ...cur, status: event.target.value as Siswa["status"] }))} className={inputClass}>
                <option value="aktif">Aktif</option>
                <option value="alumni">Alumni</option>
                <option value="keluar">Keluar</option>
              </select>
            </Field>
            <Field label="Nama wali">
              <input value={editing.nama_wali || ""} onChange={(event) => setEditing((cur) => ({ ...cur, nama_wali: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="No. HP wali">
              <input value={editing.no_hp_wali || ""} onChange={(event) => setEditing((cur) => ({ ...cur, no_hp_wali: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Upload foto">
              <input type="file" accept="image/*" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} className={inputClass} />
            </Field>
          </div>
          <Field label="Alamat">
            <textarea value={editing.alamat || ""} onChange={(event) => setEditing((cur) => ({ ...cur, alamat: event.target.value }))} rows={3} className="rounded border border-gray-200 px-3 py-3 font-normal" />
          </Field>
          <div className="mt-5 flex gap-3">
            <button className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
              <Save className="mr-2" size={17} /> Simpan
            </button>
            <button type="button" onClick={() => setEditing(null)} className="rounded border px-4 py-2 text-sm font-semibold">Batal</button>
          </div>
        </form>
      ) : null}

      <DataTable
        headers={["NIS", "NISN", "Nama", "JK", "Kelas", "Status", "Aksi"]}
        rows={filteredRows.map((row) => [
          row.nis,
          row.nisn || "-",
          row.nama_lengkap,
          row.jenis_kelamin,
          row.kelas || "-",
          row.status,
          <div key="actions" className="flex flex-wrap gap-2">
            <button onClick={() => setEditing(row)} className="rounded border p-2"><Pencil size={15} /></button>
            <button
              onClick={() => downloadCard(row)}
              disabled={generatingDocs}
              className="rounded border px-2 py-1 text-xs font-semibold text-gray-700"
            >
              Kartu
            </button>
            <button
              onClick={() => downloadBiodata(row)}
              disabled={generatingDocs}
              className="rounded border px-2 py-1 text-xs font-semibold text-emerald-800"
            >
              Biodata
            </button>
            <button onClick={() => resetKode(row)} className="rounded border p-2"><RefreshCcw size={15} /></button>
            <button onClick={() => updateStatus(row, "alumni")} className="rounded border px-2 py-1 text-xs font-semibold">Alumni</button>
            <button onClick={() => updateStatus(row, "keluar")} className="rounded border px-2 py-1 text-xs font-semibold">Keluar</button>
            <button onClick={() => deleteSiswa(row)} className="rounded border p-2 text-red-600"><Trash2 size={15} /></button>
          </div>,
        ])}
      />
    </ModuleShell>
  );
}

function AlumniModule() {
  const [rows, setRows] = useState<Siswa[]>([]);
  const [search, setSearch] = useState("");
  const [kelas, setKelas] = useState("");

  async function loadRows() {
    const { data } = await supabase
      .from("smp_siswa")
      .select("*")
      .eq("status", "alumni")
      .order("tahun_masuk", { ascending: false });
    setRows((data || []) as Siswa[]);
  }

  useEffect(() => {
    loadRows();
  }, []);

  const filteredRows = rows.filter(
    (row) =>
      (matchText(row.nama_lengkap, search) || matchText(row.nis, search)) &&
      (kelas ? row.kelas === kelas : true),
  );
  const kelasList = Array.from(new Set(rows.map((row) => row.kelas).filter(Boolean))) as string[];

  async function restore(row: Siswa) {
    await supabase.from("smp_siswa").update({ status: "aktif" }).eq("id", row.id);
    loadRows();
  }

  return (
    <ModuleShell title="Data Alumni" description="Data siswa alumni, filter, pencarian, dan kembalikan aktif.">
      <div className="rounded bg-white p-5 shadow-soft">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau NIS" className={inputClass} />
          <select value={kelas} onChange={(event) => setKelas(event.target.value)} className={inputClass}>
            <option value="">Semua kelas</option>
            {kelasList.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>
      <DataTable
        headers={["NIS", "Nama", "Kelas", "Tahun Masuk", "Aksi"]}
        rows={filteredRows.map((row) => [
          row.nis,
          row.nama_lengkap,
          row.kelas || "-",
          String(row.tahun_masuk),
          <button key="restore" onClick={() => restore(row)} className="rounded border px-3 py-2 text-sm font-semibold text-emerald-800">Kembalikan Aktif</button>,
        ])}
      />
    </ModuleShell>
  );
}

function GuruModule() {
  const [teachers, setTeachers] = useState<Guru[]>([]);
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [editing, setEditing] = useState<Partial<Guru> & { email?: string; password?: string } | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Guru | null>(null);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [kelasAssign, setKelasAssign] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    const [guruResult, siswaResult] = await Promise.all([
      supabase.from("smp_guru").select("*").order("created_at", { ascending: false }),
      supabase.from("smp_siswa").select("*").eq("status", "aktif").order("nama_lengkap"),
    ]);
    setTeachers((guruResult.data || []) as Guru[]);
    setSiswa((siswaResult.data || []) as Siswa[]);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing?.nama_lengkap) return;
    let userId = editing.user_id || null;
    if (!editing.id && editing.email && editing.password) {
      const { data, error } = await supabase.functions.invoke("create-smp-guru-account", {
        body: { email: editing.email, password: editing.password, nama: editing.nama_lengkap },
      });
      if (error || data?.error) {
        setMessage(data?.error || error?.message || "Akun guru belum berhasil dibuat.");
        return;
      }
      userId = data.user_id;
    }
    const payload = {
      user_id: userId,
      nama_lengkap: editing.nama_lengkap,
      no_hp: editing.no_hp || null,
      mata_pelajaran: editing.mata_pelajaran || null,
      foto_url: editing.foto_url || null,
    };
    const result = editing.id
      ? await supabase.from("smp_guru").update(payload).eq("id", editing.id)
      : await supabase.from("smp_guru").insert(payload);
    setMessage(result.error ? result.error.message : "Data guru tersimpan.");
    setEditing(null);
    loadData();
  }

  async function openAssign(teacher: Guru) {
    setSelectedTeacher(teacher);
    const { data } = await supabase
      .from("smp_guru_siswa_assign")
      .select("siswa_id")
      .eq("guru_id", teacher.id);
    setAssignedIds((data || []).map((row) => row.siswa_id));
  }

  async function saveAssignments() {
    if (!selectedTeacher) return;
    await supabase.from("smp_guru_siswa_assign").delete().eq("guru_id", selectedTeacher.id);
    if (assignedIds.length) {
      await supabase.from("smp_guru_siswa_assign").insert(
        assignedIds.map((siswaId) => ({ guru_id: selectedTeacher.id, siswa_id: siswaId })),
      );
    }
    setSelectedTeacher(null);
    setMessage("Assign siswa tersimpan.");
  }

  function addByClass(kelas: string) {
    setKelasAssign(kelas);
    if (!kelas) return;
    const ids = siswa.filter((item) => item.kelas === kelas).map((item) => item.id);
    setAssignedIds(Array.from(new Set([...assignedIds, ...ids])));
  }

  async function deleteTeacher(teacher: Guru) {
    await supabase.from("smp_guru").delete().eq("id", teacher.id);
    loadData();
  }

  return (
    <ModuleShell title="Data Guru" description="CRUD guru, buat akun Supabase Auth role guru, dan assign siswa.">
      <div className="rounded bg-white p-5 shadow-soft">
        <button onClick={() => setEditing({ nama_lengkap: "" })} className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          <Plus className="mr-2" size={17} /> Tambah Guru
        </button>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </div>
      {editing ? (
        <form onSubmit={saveTeacher} className="rounded bg-white p-5 shadow-soft">
          <div className="grid gap-3 md:grid-cols-2">
            <input value={editing.nama_lengkap || ""} onChange={(event) => setEditing((cur) => ({ ...cur, nama_lengkap: event.target.value }))} placeholder="Nama guru" className={inputClass} />
            <input value={editing.no_hp || ""} onChange={(event) => setEditing((cur) => ({ ...cur, no_hp: event.target.value }))} placeholder="No HP" className={inputClass} />
            <input value={editing.mata_pelajaran || ""} onChange={(event) => setEditing((cur) => ({ ...cur, mata_pelajaran: event.target.value }))} placeholder="Mata pelajaran" className={inputClass} />
            {!editing.id ? <>
              <input type="email" value={editing.email || ""} onChange={(event) => setEditing((cur) => ({ ...cur, email: event.target.value }))} placeholder="Email akun guru" className={inputClass} />
              <input type="password" value={editing.password || ""} onChange={(event) => setEditing((cur) => ({ ...cur, password: event.target.value }))} placeholder="Password awal" className={inputClass} />
            </> : null}
          </div>
          <div className="mt-4 flex gap-3">
            <button className="rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Simpan</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded border px-4 py-2 text-sm font-semibold">Batal</button>
          </div>
        </form>
      ) : null}
      <DataTable
        headers={["Nama", "Mapel", "No HP", "Akun", "Aksi"]}
        rows={teachers.map((teacher) => [
          teacher.nama_lengkap,
          teacher.mata_pelajaran || "-",
          teacher.no_hp || "-",
          teacher.user_id ? "Terhubung" : "Belum ada",
          <div key="actions" className="flex flex-wrap gap-2">
            <button onClick={() => setEditing(teacher)} className="rounded border px-3 py-2 text-sm font-semibold">Edit</button>
            <button onClick={() => openAssign(teacher)} className="rounded border px-3 py-2 text-sm font-semibold text-emerald-800">Assign</button>
            <button onClick={() => deleteTeacher(teacher)} className="rounded border px-3 py-2 text-sm font-semibold text-red-600">Hapus</button>
          </div>,
        ])}
      />
      {selectedTeacher ? (
        <div className="rounded bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold">Assign Siswa - {selectedTeacher.nama_lengkap}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
            <select value={kelasAssign} onChange={(event) => addByClass(event.target.value)} className={inputClass}>
              <option value="">Tambah berdasarkan kelas</option>
              {Array.from(new Set(siswa.map((item) => item.kelas).filter(Boolean))).map((kelas) => <option key={kelas} value={kelas || ""}>{kelas}</option>)}
            </select>
            <p className="text-sm text-gray-600">{assignedIds.length} siswa dipilih.</p>
          </div>
          <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
            {siswa.map((item) => (
              <label key={item.id} className="flex items-center gap-2 rounded border p-3 text-sm">
                <input type="checkbox" checked={assignedIds.includes(item.id)} onChange={(event) => setAssignedIds((cur) => event.target.checked ? [...cur, item.id] : cur.filter((id) => id !== item.id))} />
                {item.nama_lengkap} ({item.kelas || "-"})
              </label>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={saveAssignments} className="rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Simpan Assign</button>
            <button onClick={() => setSelectedTeacher(null)} className="rounded border px-4 py-2 text-sm font-semibold">Tutup</button>
          </div>
        </div>
      ) : null}
    </ModuleShell>
  );
}

function RaportModule({ role }: { role: string }) {
  const { user } = useAuth();
  const isAdmin = role === "superadmin" || role === "admin";
  const [periods, setPeriods] = useState<RaportPeriode[]>([]);
  const [mapel, setMapel] = useState<RaportMapel[]>([]);
  const [teachers, setTeachers] = useState<Guru[]>([]);
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [assignments, setAssignments] = useState<RaportPenugasan[]>([]);
  const [nilaiRows, setNilaiRows] = useState<RaportNilaiDetail[]>([]);
  const [publishedRows, setPublishedRows] = useState<RaportPublikasi[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<Guru | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedSiswa, setSelectedSiswa] = useState("");
  const [values, setValues] = useState<Record<string, { nilai: string; predikat: string; deskripsi: string }>>({});
  const [periodForm, setPeriodForm] = useState({
    tahun_ajaran: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    semester: "Ganjil",
    status: "draft" as RaportPeriode["status"],
    tanggal_mulai: "",
    tanggal_selesai: "",
    catatan: "",
  });
  const [mapelForm, setMapelForm] = useState({
    kelas: "",
    mata_pelajaran: "",
    kelompok: "",
    format_nilai: "angka" as RaportMapel["format_nilai"],
    kkm: "",
    urutan: 0,
  });
  const [assignmentForm, setAssignmentForm] = useState({ guru_id: "", kelas: "", mapel_id: "" });
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  async function loadData() {
    const [periodResult, teacherResult, siswaResult] = await Promise.all([
      supabase.from("smp_raport_periode").select("*").order("created_at", { ascending: false }),
      supabase.from("smp_guru").select("*").order("nama_lengkap"),
      supabase.from("smp_siswa").select("*").eq("status", "aktif").order("nama_lengkap"),
    ]);
    const loadedPeriods = (periodResult.data || []) as RaportPeriode[];
    setPeriods(loadedPeriods);
    setTeachers((teacherResult.data || []) as Guru[]);
    setSiswa((siswaResult.data || []) as Siswa[]);
    setSelectedPeriod((cur) => cur || loadedPeriods.find((period) => ["aktif", "terbuka"].includes(period.status))?.id || loadedPeriods[0]?.id || "");
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    async function loadTeacher() {
      if (isAdmin || !user?.id) return setCurrentTeacher(null);
      const { data } = await supabase.from("smp_guru").select("*").eq("user_id", user.id).maybeSingle();
      setCurrentTeacher((data || null) as Guru | null);
    }
    loadTeacher();
  }, [isAdmin, user?.id]);

  useEffect(() => {
    async function loadPeriodDetails() {
      if (!selectedPeriod) {
        setMapel([]);
        setAssignments([]);
        setNilaiRows([]);
        setPublishedRows([]);
        return;
      }
      const [mapelResult, assignmentResult, nilaiResult, publishResult] = await Promise.all([
        supabase.from("smp_raport_mapel").select("*").eq("periode_id", selectedPeriod).order("kelas").order("urutan"),
        supabase.from("smp_raport_penugasan").select("*, guru:smp_guru(nama_lengkap,mata_pelajaran), mapel:smp_raport_mapel(mata_pelajaran), siswa:smp_siswa(nama_lengkap,nis,kelas)").eq("periode_id", selectedPeriod).order("created_at", { ascending: false }),
        supabase.from("smp_raport_nilai_detail").select("*"),
        supabase.from("smp_raport_publikasi").select("*, siswa:smp_siswa(nama_lengkap,nis,kelas)").eq("periode_id", selectedPeriod).order("updated_at", { ascending: false }),
      ]);
      setMapel((mapelResult.data || []) as RaportMapel[]);
      setAssignments((assignmentResult.data || []) as RaportPenugasan[]);
      setNilaiRows((nilaiResult.data || []) as RaportNilaiDetail[]);
      setPublishedRows((publishResult.data || []) as RaportPublikasi[]);
    }
    loadPeriodDetails();
  }, [selectedPeriod]);

  useEffect(() => {
    if (!assignmentForm.kelas) {
      setAssignedStudentIds([]);
      return;
    }
    if (!assignmentForm.mapel_id) {
      setAssignedStudentIds([]);
      return;
    }
    setAssignedStudentIds(
      assignments
        .filter((item) => item.guru_id === assignmentForm.guru_id && item.kelas === assignmentForm.kelas && item.mapel_id === assignmentForm.mapel_id)
        .map((item) => item.siswa_id),
    );
  }, [assignmentForm.guru_id, assignmentForm.kelas, assignmentForm.mapel_id, assignments]);

  useEffect(() => {
    if (!selectedSiswa) {
      setValues({});
      return;
    }
    const nextValues = nilaiRows
      .filter((row) => row.siswa_id === selectedSiswa)
      .reduce<Record<string, { nilai: string; predikat: string; deskripsi: string }>>((acc, row) => {
        acc[row.mapel_id] = {
          nilai: row.nilai || "",
          predikat: row.predikat || "",
          deskripsi: row.deskripsi || "",
        };
        return acc;
      }, {});
    setValues(nextValues);
  }, [selectedSiswa, nilaiRows]);

  const selectedPeriodRow = periods.find((period) => period.id === selectedPeriod);
  const kelasList = useMemo(
    () => Array.from(new Set(siswa.map((item) => item.kelas).filter(Boolean) as string[])).sort(),
    [siswa],
  );
  const periodMapel = useMemo(() => {
    return mapel.filter((item) => (selectedKelas ? item.kelas === selectedKelas : true));
  }, [mapel, selectedKelas]);
  const teacherAssignments = useMemo(() => {
    if (isAdmin) return assignments;
    if (!currentTeacher) return [];
    return assignments.filter((item) => item.guru_id === currentTeacher.id);
  }, [assignments, currentTeacher, isAdmin]);
  const assignedSiswa = useMemo(() => {
    const ids = new Set(teacherAssignments.map((item) => item.siswa_id));
    return siswa.filter((item) => ids.has(item.id));
  }, [siswa, teacherAssignments]);
  const selected = siswa.find((item) => item.id === selectedSiswa);
  const inputSiswaList = isAdmin ? siswa : assignedSiswa;
  const inputMapel = useMemo(() => {
    if (!selected) return [];
    if (isAdmin) return mapel.filter((item) => item.kelas === selected.kelas);
    const assignedMapelIds = new Set(teacherAssignments.filter((item) => item.siswa_id === selected.id).map((item) => item.mapel_id));
    return mapel.filter((item) => item.kelas === selected.kelas && assignedMapelIds.has(item.id));
  }, [isAdmin, mapel, selected, teacherAssignments]);
  const canInput = isAdmin || ["aktif", "terbuka"].includes(selectedPeriodRow?.status || "");

  async function savePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await supabase.from("smp_raport_periode").insert({
      ...periodForm,
      tanggal_mulai: periodForm.tanggal_mulai || null,
      tanggal_selesai: periodForm.tanggal_selesai || null,
      catatan: periodForm.catatan || null,
      created_by: user?.id || null,
    });
    setMessage(error ? error.message : "Tahun ajaran dan semester raport tersimpan.");
    if (!error) {
      setPeriodForm((form) => ({ ...form, status: "draft", catatan: "" }));
      loadData();
    }
  }

  async function updatePeriodStatus(status: RaportPeriode["status"]) {
    if (!selectedPeriod) return;
    const { error } = await supabase.from("smp_raport_periode").update({ status }).eq("id", selectedPeriod);
    setMessage(error ? error.message : `Status periode diubah menjadi ${status}.`);
    loadData();
  }

  async function saveMapel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPeriod) return setMessage("Pilih periode raport dulu.");
    const { error } = await supabase.from("smp_raport_mapel").insert({
      periode_id: selectedPeriod,
      kelas: mapelForm.kelas,
      mata_pelajaran: mapelForm.mata_pelajaran,
      kelompok: mapelForm.kelompok || null,
      format_nilai: mapelForm.format_nilai,
      kkm: mapelForm.kkm ? Number(mapelForm.kkm) : null,
      urutan: Number(mapelForm.urutan || 0),
    });
    setMessage(error ? error.message : "Mata pelajaran kelas tersimpan.");
    if (!error) {
      setMapelForm({ kelas: mapelForm.kelas, mata_pelajaran: "", kelompok: "", format_nilai: "angka", kkm: "", urutan: mapel.length + 1 });
      setSelectedPeriod(selectedPeriod);
      const { data } = await supabase.from("smp_raport_mapel").select("*").eq("periode_id", selectedPeriod).order("kelas").order("urutan");
      setMapel((data || []) as RaportMapel[]);
    }
  }

  async function deleteMapel(row: RaportMapel) {
    if (!confirm(`Hapus mapel ${row.mata_pelajaran} untuk kelas ${row.kelas}?`)) return;
    const { error } = await supabase.from("smp_raport_mapel").delete().eq("id", row.id);
    setMessage(error ? error.message : "Mata pelajaran dihapus.");
    setMapel((cur) => cur.filter((item) => item.id !== row.id));
  }

  async function saveAssignments() {
    if (!selectedPeriod || !assignmentForm.guru_id || !assignmentForm.kelas || !assignmentForm.mapel_id) return setMessage("Pilih periode, guru, kelas, dan mapel dulu.");
    await supabase.from("smp_raport_penugasan").delete().eq("periode_id", selectedPeriod).eq("guru_id", assignmentForm.guru_id).eq("kelas", assignmentForm.kelas).eq("mapel_id", assignmentForm.mapel_id);
    if (assignedStudentIds.length) {
      const { error } = await supabase.from("smp_raport_penugasan").insert(
        assignedStudentIds.map((siswaId) => ({
          periode_id: selectedPeriod,
          mapel_id: assignmentForm.mapel_id,
          guru_id: assignmentForm.guru_id,
          siswa_id: siswaId,
          kelas: assignmentForm.kelas,
        })),
      );
      if (error) return setMessage(error.message);
    }
    setMessage("Penugasan guru dan siswa tersimpan.");
    const { data } = await supabase.from("smp_raport_penugasan").select("*, guru:smp_guru(nama_lengkap,mata_pelajaran), mapel:smp_raport_mapel(mata_pelajaran), siswa:smp_siswa(nama_lengkap,nis,kelas)").eq("periode_id", selectedPeriod).order("created_at", { ascending: false });
    setAssignments((data || []) as RaportPenugasan[]);
  }

  async function saveNilai() {
    if (!selectedSiswa || !selected) return setMessage("Pilih siswa dulu.");
    if (!canInput) return setMessage("Periode ini belum dibuka admin untuk pengisian nilai.");
    const payload = inputMapel.map((item) => ({
      siswa_id: selectedSiswa,
      mapel_id: item.id,
      guru_id: currentTeacher?.id || null,
      nilai: values[item.id]?.nilai || null,
      predikat: values[item.id]?.predikat || null,
      deskripsi: values[item.id]?.deskripsi || null,
    }));
    const { error } = await supabase.from("smp_raport_nilai_detail").upsert(payload, { onConflict: "siswa_id,mapel_id" });
    setMessage(error ? error.message : "Nilai raport tersimpan.");
    if (!error) {
      const { data } = await supabase.from("smp_raport_nilai_detail").select("*");
      setNilaiRows((data || []) as RaportNilaiDetail[]);
    }
  }

  async function generateRaportPdf(student: Siswa, publish = false) {
    if (!selectedPeriodRow) return setMessage("Pilih periode raport dulu.");
    const studentMapel = mapel.filter((item) => item.kelas === student.kelas);
    const rows = studentMapel.map((item) => ({
      mapel: item,
      nilai: nilaiRows.find((row) => row.siswa_id === student.id && row.mapel_id === item.id),
    }));
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(6, 78, 59);
    doc.rect(0, 0, pageWidth, 34, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("RAPORT SISWA", pageWidth / 2, 13, { align: "center" });
    doc.setFontSize(10);
    doc.text("SMP MA'ARIF NU SARIWANGI", pageWidth / 2, 21, { align: "center" });
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "normal");
    doc.text(`Nama: ${student.nama_lengkap}`, 14, 46);
    doc.text(`NIS: ${student.nis}`, 14, 53);
    doc.text(`Kelas: ${student.kelas || "-"}`, 14, 60);
    doc.text(`Periode: ${selectedPeriodRow.nama || `${selectedPeriodRow.tahun_ajaran} - ${selectedPeriodRow.semester}`}`, 112, 46);
    doc.text(`Status: ${publish ? "Published" : "Preview"}`, 112, 53);
    let y = 74;
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 253, 244);
    doc.rect(14, y - 7, 182, 9, "F");
    doc.text("Mata Pelajaran", 18, y);
    doc.text("Nilai", 104, y);
    doc.text("Predikat", 128, y);
    doc.text("Deskripsi", 154, y);
    y += 9;
    doc.setFont("helvetica", "normal");
    rows.forEach((row) => {
      const deskripsi = doc.splitTextToSize(row.nilai?.deskripsi || "-", 38);
      const rowHeight = Math.max(10, deskripsi.length * 5);
      if (y + rowHeight > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(row.mapel.mata_pelajaran, 18, y);
      doc.text(row.nilai?.nilai || "-", 104, y);
      doc.text(row.nilai?.predikat || "-", 128, y);
      doc.text(deskripsi, 154, y);
      doc.line(14, y + rowHeight - 5, 196, y + rowHeight - 5);
      y += rowHeight;
    });
    y = Math.max(y + 12, 220);
    doc.setFontSize(10);
    doc.text("Wali Kelas", 32, y);
    doc.text("Kepala Sekolah", 138, y);
    doc.text("(________________)", 26, y + 30);
    doc.text("(________________)", 132, y + 30);
    const filename = `raport-${student.nis}-${selectedPeriodRow.tahun_ajaran.replace("/", "-")}-${selectedPeriodRow.semester}.pdf`;
    if (!publish) {
      doc.save(filename);
      return;
    }
    const blob = doc.output("blob");
    const path = `smp/${selectedPeriodRow.id}/${student.id}-${Date.now()}.pdf`;
    const upload = await supabase.storage.from("smp-raport-pdf").upload(path, blob, { contentType: "application/pdf", upsert: true });
    if (upload.error) return setMessage(upload.error.message);
    const { error } = await supabase.from("smp_raport_publikasi").upsert({
      periode_id: selectedPeriodRow.id,
      siswa_id: student.id,
      status: "published",
      pdf_url: upload.data.path,
      published_by: user?.id || null,
      published_at: new Date().toISOString(),
    }, { onConflict: "periode_id,siswa_id" });
    setMessage(error ? error.message : `Raport ${student.nama_lengkap} dipublish.`);
    const { data } = await supabase.from("smp_raport_publikasi").select("*, siswa:smp_siswa(nama_lengkap,nis,kelas)").eq("periode_id", selectedPeriodRow.id).order("updated_at", { ascending: false });
    setPublishedRows((data || []) as RaportPublikasi[]);
  }

  function publicPdfUrl(path?: string | null) {
    if (!path) return "";
    return supabase.storage.from("smp-raport-pdf").getPublicUrl(path).data.publicUrl;
  }

  return (
    <ModuleShell title="Raport Siswa" description="Admin mengatur tahun ajaran, semester, mapel per kelas, penugasan guru/siswa, lalu guru mengisi raport yang sudah dibuka.">
      <div className="rounded bg-white p-5 shadow-soft">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
          <select value={selectedPeriod} onChange={(e) => { setSelectedPeriod(e.target.value); setSelectedSiswa(""); }} className={inputClass}>
            <option value="">Pilih tahun ajaran / semester</option>
            {periods.map((period) => <option key={period.id} value={period.id}>{period.nama || `${period.tahun_ajaran} - ${period.semester}`} ({period.status})</option>)}
          </select>
          <select value={selectedKelas} onChange={(e) => setSelectedKelas(e.target.value)} className={inputClass}>
            <option value="">Semua kelas</option>
            {kelasList.map((kelas) => <option key={kelas}>{kelas}</option>)}
          </select>
          <div className="rounded border border-gray-200 px-3 py-2 text-sm">
            <span className="font-semibold">Status:</span> {selectedPeriodRow?.status || "-"}
          </div>
        </div>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </div>

      {isAdmin ? (
        <>
          <form onSubmit={savePeriod} className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">1. Tahun Ajaran & Semester</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input value={periodForm.tahun_ajaran} onChange={(e) => setPeriodForm((form) => ({ ...form, tahun_ajaran: e.target.value }))} placeholder="2026/2027" className={inputClass} />
              <select value={periodForm.semester} onChange={(e) => setPeriodForm((form) => ({ ...form, semester: e.target.value }))} className={inputClass}><option>Ganjil</option><option>Genap</option></select>
              <select value={periodForm.status} onChange={(e) => setPeriodForm((form) => ({ ...form, status: e.target.value as RaportPeriode["status"] }))} className={inputClass}><option value="draft">Draft</option><option value="aktif">Aktif</option><option value="terbuka">Terbuka untuk guru</option><option value="ditutup">Ditutup</option></select>
              <input type="date" value={periodForm.tanggal_mulai} onChange={(e) => setPeriodForm((form) => ({ ...form, tanggal_mulai: e.target.value }))} className={inputClass} />
              <input type="date" value={periodForm.tanggal_selesai} onChange={(e) => setPeriodForm((form) => ({ ...form, tanggal_selesai: e.target.value }))} className={inputClass} />
              <input value={periodForm.catatan} onChange={(e) => setPeriodForm((form) => ({ ...form, catatan: e.target.value }))} placeholder="Catatan admin" className={inputClass} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"><Plus className="mr-2" size={17} />Buat Periode</button>
              {(["draft", "aktif", "terbuka", "ditutup", "published"] as RaportPeriode["status"][]).map((status) => (
                <button key={status} type="button" onClick={() => updatePeriodStatus(status)} className="rounded border px-3 py-2 text-sm font-semibold capitalize">{status}</button>
              ))}
            </div>
          </form>

          <form onSubmit={saveMapel} className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">2. Mata Pelajaran per Kelas</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-6">
              <select value={mapelForm.kelas} onChange={(e) => setMapelForm((form) => ({ ...form, kelas: e.target.value }))} className={inputClass}><option value="">Kelas</option>{kelasList.map((kelas) => <option key={kelas}>{kelas}</option>)}</select>
              <input value={mapelForm.mata_pelajaran} onChange={(e) => setMapelForm((form) => ({ ...form, mata_pelajaran: e.target.value }))} placeholder="Mata pelajaran" className={inputClass} />
              <input value={mapelForm.kelompok} onChange={(e) => setMapelForm((form) => ({ ...form, kelompok: e.target.value }))} placeholder="Kelompok" className={inputClass} />
              <select value={mapelForm.format_nilai} onChange={(e) => setMapelForm((form) => ({ ...form, format_nilai: e.target.value as RaportMapel["format_nilai"] }))} className={inputClass}><option value="angka">Angka</option><option value="huruf">Huruf</option><option value="predikat">Predikat</option></select>
              <input type="number" value={mapelForm.kkm} onChange={(e) => setMapelForm((form) => ({ ...form, kkm: e.target.value }))} placeholder="KKM" className={inputClass} />
              <input type="number" value={mapelForm.urutan} onChange={(e) => setMapelForm((form) => ({ ...form, urutan: Number(e.target.value) }))} placeholder="Urutan" className={inputClass} />
            </div>
            <button className="mt-4 inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"><Save className="mr-2" size={17} />Simpan Mapel</button>
          </form>

          <div className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">3. Assign Guru & Siswa</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <select value={assignmentForm.guru_id} onChange={(e) => setAssignmentForm((form) => ({ ...form, guru_id: e.target.value }))} className={inputClass}><option value="">Pilih guru</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.nama_lengkap} {teacher.mata_pelajaran ? `- ${teacher.mata_pelajaran}` : ""}</option>)}</select>
              <select value={assignmentForm.kelas} onChange={(e) => setAssignmentForm((form) => ({ ...form, kelas: e.target.value, mapel_id: "" }))} className={inputClass}><option value="">Pilih kelas</option>{kelasList.map((kelas) => <option key={kelas}>{kelas}</option>)}</select>
              <select value={assignmentForm.mapel_id} onChange={(e) => setAssignmentForm((form) => ({ ...form, mapel_id: e.target.value }))} className={inputClass}><option value="">Pilih mapel</option>{mapel.filter((item) => item.kelas === assignmentForm.kelas).map((item) => <option key={item.id} value={item.id}>{item.mata_pelajaran}</option>)}</select>
            </div>
            {assignmentForm.kelas && assignmentForm.mapel_id ? (
              <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto rounded border border-gray-200 p-3 md:grid-cols-2">
                {siswa.filter((item) => item.kelas === assignmentForm.kelas).map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={assignedStudentIds.includes(item.id)} onChange={(event) => setAssignedStudentIds((cur) => event.target.checked ? [...cur, item.id] : cur.filter((id) => id !== item.id))} />
                    {item.nama_lengkap} ({item.nis})
                  </label>
                ))}
              </div>
            ) : null}
            <button onClick={saveAssignments} type="button" className="mt-4 inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"><UserCheck className="mr-2" size={17} />Simpan Penugasan</button>
          </div>
        </>
      ) : null}

      <div className="rounded bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">{isAdmin ? "4. Pengisian & Preview Nilai" : "Pengisian Raport Guru"}</h2>
        {!isAdmin && !canInput ? <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-800">Belum ada periode raport yang dibuka admin untuk pengisian nilai.</p> : null}
        <select value={selectedSiswa} onChange={(e) => setSelectedSiswa(e.target.value)} className={`${inputClass} mt-4 w-full`}>
          <option value="">Pilih siswa</option>
          {inputSiswaList.map((item) => <option key={item.id} value={item.id}>{item.nama_lengkap} ({item.kelas || "-"})</option>)}
        </select>
        {selected ? (
          <div className="mt-5 grid gap-4">
            {inputMapel.length ? inputMapel.map((item) => (
              <div key={item.id} className="grid gap-3 rounded border border-gray-200 p-4 md:grid-cols-[1fr_120px_120px_1.4fr]">
                <div>
                  <p className="font-semibold text-gray-950">{item.mata_pelajaran}</p>
                  <p className="mt-1 text-xs text-gray-500">Kelas {item.kelas} {item.kkm ? `- KKM ${item.kkm}` : ""}</p>
                </div>
                <input value={values[item.id]?.nilai || ""} onChange={(e) => setValues((cur) => ({ ...cur, [item.id]: { nilai: e.target.value, predikat: cur[item.id]?.predikat || "", deskripsi: cur[item.id]?.deskripsi || "" } }))} placeholder="Nilai" className={inputClass} disabled={!canInput} />
                <input value={values[item.id]?.predikat || ""} onChange={(e) => setValues((cur) => ({ ...cur, [item.id]: { nilai: cur[item.id]?.nilai || "", predikat: e.target.value, deskripsi: cur[item.id]?.deskripsi || "" } }))} placeholder="Predikat" className={inputClass} disabled={!canInput} />
                <textarea value={values[item.id]?.deskripsi || ""} onChange={(e) => setValues((cur) => ({ ...cur, [item.id]: { nilai: cur[item.id]?.nilai || "", predikat: cur[item.id]?.predikat || "", deskripsi: e.target.value } }))} placeholder="Deskripsi capaian" rows={2} className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-700" disabled={!canInput} />
              </div>
            )) : <p className="rounded bg-gray-50 p-4 text-sm text-gray-600">Belum ada mapel untuk kelas siswa ini.</p>}
            <div className="flex flex-wrap gap-2">
              <button onClick={saveNilai} className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"><Save className="mr-2" size={17} />Simpan Nilai</button>
              {isAdmin ? <button onClick={() => generateRaportPdf(selected, false)} className="inline-flex items-center rounded border px-4 py-2 text-sm font-semibold"><Download className="mr-2" size={17} />Preview PDF</button> : null}
              {isAdmin ? <button onClick={() => generateRaportPdf(selected, true)} className="inline-flex items-center rounded bg-gray-950 px-4 py-2 text-sm font-semibold text-white"><FileText className="mr-2" size={17} />Publish PDF</button> : null}
            </div>
          </div>
        ) : null}
      </div>

      {isAdmin ? (
        <>
          <DataTable headers={["Kelas", "Mapel", "Kelompok", "Format", "KKM", "Aksi"]} rows={periodMapel.map((row) => [row.kelas, row.mata_pelajaran, row.kelompok || "-", row.format_nilai, row.kkm ?? "-", <button key="delete" onClick={() => deleteMapel(row)} className="rounded border px-3 py-2 text-xs font-semibold text-red-700">Hapus</button>])} />
          <DataTable headers={["Guru", "Mapel", "Siswa", "Kelas"]} rows={assignments.map((row) => [row.guru?.nama_lengkap || "-", row.mapel?.mata_pelajaran || "-", row.siswa?.nama_lengkap || "-", row.kelas])} />
          <DataTable headers={["Siswa", "Kelas", "Status", "Tanggal Publish", "PDF"]} rows={publishedRows.map((row) => [row.siswa?.nama_lengkap || "-", row.siswa?.kelas || "-", row.status, formatDate(row.published_at), row.pdf_url ? <a key="pdf" href={publicPdfUrl(row.pdf_url)} target="_blank" rel="noreferrer" className="font-semibold text-emerald-800">Buka PDF</a> : "-"])} />
        </>
      ) : null}
    </ModuleShell>
  );
}

function PelanggaranModule({ role }: { role: string }) {
  const { user } = useAuth();
  const isAdmin = role === "superadmin" || role === "admin";
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [jenis, setJenis] = useState<PelanggaranJenis[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [form, setForm] = useState({ siswa_id: "", jenis_id: "", tanggal: new Date().toISOString().slice(0, 10), keterangan: "" });
  const [jenisForm, setJenisForm] = useState<Partial<PelanggaranJenis>>({ nama: "", bobot_poin: 0, tingkatan: "ringan" });
  const [message, setMessage] = useState("");
  async function loadData() {
    const [siswaResult, jenisResult, recordResult] = await Promise.all([
      supabase.from("smp_siswa").select("*").eq("status", "aktif").order("nama_lengkap"),
      supabase.from("smp_pelanggaran_jenis").select("*").order("nama"),
      supabase.from("smp_pelanggaran").select("*, siswa:smp_siswa(nama_lengkap,nis,kelas), jenis:smp_pelanggaran_jenis(nama,bobot_poin,tingkatan)").order("tanggal", { ascending: false }).limit(200),
    ]);
    setSiswa((siswaResult.data || []) as Siswa[]);
    setJenis((jenisResult.data || []) as PelanggaranJenis[]);
    setRecords(recordResult.data || []);
  }
  useEffect(() => { loadData(); }, []);
  async function saveJenis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await supabase.from("smp_pelanggaran_jenis").insert({ nama: jenisForm.nama, bobot_poin: Number(jenisForm.bobot_poin || 0), tingkatan: jenisForm.tingkatan });
    setMessage(error ? error.message : "Kamus pelanggaran tersimpan.");
    setJenisForm({ nama: "", bobot_poin: 0, tingkatan: "ringan" });
    loadData();
  }
  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await supabase.from("smp_pelanggaran").insert({ ...form, pencatat_id: user?.id || null });
    setMessage(error ? error.message : "Catatan pelanggaran tersimpan.");
    setForm({ siswa_id: "", jenis_id: "", tanggal: new Date().toISOString().slice(0, 10), keterangan: "" });
    loadData();
  }
  const totals = records.reduce<Record<string, number>>((acc, record) => ({ ...acc, [record.siswa_id]: (acc[record.siswa_id] || 0) + Number(record.jenis?.bobot_poin || 0) }), {});
  return (
    <ModuleShell title="Catatan Pelanggaran" description="Kamus pelanggaran, pencatatan, poin akumulasi, dan riwayat siswa.">
      {isAdmin ? <form onSubmit={saveJenis} className="rounded bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Kamus Pelanggaran</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input value={jenisForm.nama || ""} onChange={(e) => setJenisForm((j) => ({ ...j, nama: e.target.value }))} placeholder="Nama pelanggaran" className={inputClass} />
          <input type="number" value={jenisForm.bobot_poin || 0} onChange={(e) => setJenisForm((j) => ({ ...j, bobot_poin: Number(e.target.value) }))} placeholder="Poin" className={inputClass} />
          <select value={jenisForm.tingkatan || "ringan"} onChange={(e) => setJenisForm((j) => ({ ...j, tingkatan: e.target.value as PelanggaranJenis["tingkatan"] }))} className={inputClass}>
            <option value="ringan">Ringan</option><option value="sedang">Sedang</option><option value="berat">Berat</option>
          </select>
        </div>
        <button className="mt-4 rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Simpan Jenis</button>
      </form> : null}
      <form onSubmit={saveRecord} className="rounded bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Pencatatan Pelanggaran</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select value={form.siswa_id} onChange={(e) => setForm((f) => ({ ...f, siswa_id: e.target.value }))} className={inputClass}><option value="">Pilih siswa</option>{siswa.map((item) => <option key={item.id} value={item.id}>{item.nama_lengkap}</option>)}</select>
          <select value={form.jenis_id} onChange={(e) => setForm((f) => ({ ...f, jenis_id: e.target.value }))} className={inputClass}><option value="">Pilih pelanggaran</option>{jenis.map((item) => <option key={item.id} value={item.id}>{item.nama} ({item.bobot_poin})</option>)}</select>
          <input type="date" value={form.tanggal} onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))} className={inputClass} />
          <input value={form.keterangan} onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))} placeholder="Keterangan" className={inputClass} />
        </div>
        <button className="mt-4 rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Catat</button>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </form>
      <DataTable headers={["Tanggal", "Siswa", "Pelanggaran", "Poin", "Akumulasi", "Keterangan"]} rows={records.map((r) => [formatDate(r.tanggal), r.siswa?.nama_lengkap || "-", r.jenis?.nama || "-", String(r.jenis?.bobot_poin || 0), String(totals[r.siswa_id] || 0), r.keterangan || "-"])} />
    </ModuleShell>
  );
}

function CapaianModule() {
  const { user } = useAuth();
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [form, setForm] = useState({ siswa_id: "", jenis: "hafalan Quran", detail: "", progres: "" });
  const [message, setMessage] = useState("");
  async function loadData() {
    const [siswaResult, recordResult, historyResult] = await Promise.all([
      supabase.from("smp_siswa").select("*").eq("status", "aktif").order("nama_lengkap"),
      supabase.from("smp_capaian").select("*, siswa:smp_siswa(nama_lengkap,nis,kelas)").order("updated_at", { ascending: false }),
      supabase.from("smp_capaian_riwayat").select("*, siswa:smp_siswa(nama_lengkap)").order("created_at", { ascending: false }).limit(50),
    ]);
    setSiswa((siswaResult.data || []) as Siswa[]);
    setRecords(recordResult.data || []);
    setHistory(historyResult.data || []);
  }
  useEffect(() => { loadData(); }, []);
  async function saveCapaian(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { data: guru } = await supabase.from("smp_guru").select("id").eq("user_id", user?.id).maybeSingle();
    const { error } = await supabase.from("smp_capaian").insert({ ...form, guru_id: guru?.id || null });
    setMessage(error ? error.message : "Capaian siswa tersimpan.");
    setForm({ siswa_id: "", jenis: "hafalan Quran", detail: "", progres: "" });
    loadData();
  }
  return (
    <ModuleShell title="Capaian Siswa" description="Catat capaian hafalan Quran/kitab dan riwayat perubahan.">
      <form onSubmit={saveCapaian} className="rounded bg-white p-5 shadow-soft">
        <div className="grid gap-3 md:grid-cols-2">
          <select value={form.siswa_id} onChange={(e) => setForm((f) => ({ ...f, siswa_id: e.target.value }))} className={inputClass}><option value="">Pilih siswa</option>{siswa.map((item) => <option key={item.id} value={item.id}>{item.nama_lengkap}</option>)}</select>
          <select value={form.jenis} onChange={(e) => setForm((f) => ({ ...f, jenis: e.target.value }))} className={inputClass}><option value="hafalan Quran">Hafalan Quran</option><option value="kitab">Kitab</option></select>
          <input value={form.detail} onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))} placeholder="Detail" className={inputClass} />
          <input value={form.progres} onChange={(e) => setForm((f) => ({ ...f, progres: e.target.value }))} placeholder="Progres" className={inputClass} />
        </div>
        <button className="mt-4 rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Simpan</button>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </form>
      <DataTable headers={["Siswa", "Jenis", "Detail", "Progres", "Update"]} rows={records.map((r) => [r.siswa?.nama_lengkap || "-", r.jenis, r.detail, r.progres || "-", formatDate(r.updated_at)])} />
      <div className="rounded bg-white p-5 shadow-soft"><h2 className="text-lg font-semibold">Riwayat Perubahan</h2><div className="mt-4 grid gap-2">{history.map((h) => <div key={h.id} className="rounded bg-gray-50 p-3 text-sm">{h.siswa?.nama_lengkap || "-"} {h.aksi} {h.jenis} - {h.detail}</div>)}</div></div>
    </ModuleShell>
  );
}

const SURAT_CARDS = [
  { id: 'sppd', title: 'SPPD', desc: 'Surat Perintah Perjalanan Dinas', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'aktif', title: 'Surat Keterangan Aktif', desc: 'Keterangan siswa masih aktif belajar', icon: ClipboardCheck, color: 'text-teal-500', bg: 'bg-teal-50' },
  { id: 'wali', title: 'Surat Keterangan Wali Siswa', desc: 'Keterangan wali/orang tua siswa', icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'rekomendasi', title: 'Surat Rekomendasi', desc: 'Rekomendasi siswa untuk lomba/kegiatan', icon: FileCheck, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'permohonan', title: 'Surat Permohonan', desc: 'Permohonan umum untuk berbagai keperluan', icon: Mail, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'tugas', title: 'Surat Tugas', desc: 'Penugasan guru/pegawai ke kegiatan', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'undangan', title: 'Surat Undangan Rapat', desc: 'Undangan rapat atau kegiatan internal', icon: Megaphone, color: 'text-pink-500', bg: 'bg-pink-50' },
  { id: 'pindah', title: 'Surat Keterangan Pindah', desc: 'Keterangan pindah sekolah siswa', icon: ArrowLeftRight, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'pernyataan', title: 'Surat Pernyataan', desc: 'Pernyataan orang tua/wali murid', icon: FileSignature, color: 'text-slate-500', bg: 'bg-slate-50' },
  { id: 'kelakuan_baik', title: 'Surat Kelakuan Baik', desc: 'Keterangan berkelakuan baik siswa', icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-50' },
];


function SuratModule() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'buat' | 'log'>('buat');
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [archive, setArchive] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Guru[]>([]);
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [message, setMessage] = useNotifiedMessage();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  
  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  
  function toggleSelectAll() {
    if (selectedIds.length === archive.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(archive.map(a => a.id));
    }
  }

  async function deleteSelected() {
    if (!selectedIds.length) return;
    if (!confirm(`Yakin hapus ${selectedIds.length} surat terpilih?`)) return;
    
    const files = archive.filter(a => selectedIds.includes(a.id)).map(a => a.file_url).filter(Boolean);
    if (files.length) {
      await supabase.storage.from('smp-surat-keluar').remove(files);
    }
    
    const { error } = await supabase.from('smp_surat_keluar').delete().in('id', selectedIds);
    if (error) {
      setMessage("Gagal menghapus: " + error.message);
    } else {
      setMessage(`${selectedIds.length} log surat dihapus.`);
      setSelectedIds([]);
      loadData();
    }
  }

  const [formTugas, setFormTugas] = useState({
    nomor_surat: '',
    nama_pegawai: '',
    unit_kerja: 'SMP Ma\'arif NU Sariwangi',
    tugas: '',
    hari_tanggal: new Date().toISOString().slice(0, 10),
    tempat: '',
    jabatan: '',
    lama_hari: '1 hari',
    biaya: 'Transport (PP) Rp. ',
    tanggal_dikeluarkan: new Date().toISOString().slice(0, 10),
    pejabat: 'Adrian Fauzi Rahman, M.Pd',
  });
  
  const [formAktif, setFormAktif] = useState({
    nomor_surat: 'P/041/PD.02.02/smpmns.srw/2026',
    pejabat: 'ADRIAN FAUZI RAHMAN, M.Pd',
    jabatan: 'Kepala Sekolah',
    unit_kerja: 'SMP MAARIF NU SARIWANGI',
    alamat: 'Kp. Mageung Desa Sirnasari Kec. Sariwangi Tasikmalaya',
    tahun_pelajaran: '2025 -2026',
    tujuan: 'Gala Siswa Indonesia',
    tanggal_dikeluarkan: new Date().toISOString().slice(0, 10),
    tempat_tanggal: 'Sariwangi, 13 Juni 2026',
  });
  const [aktifSiswaIds, setAktifSiswaIds] = useState<string[]>([]);
  
  const [formWali, setFormWali] = useState({
    nomor_surat: 'P/010/PD.02.02/smpmns.srw/2025',
    pejabat: 'ADRIAN FAUZI RAHMAN, M.Pd',
    jabatan_pejabat: 'Kepala Sekolah SMP Maarif NU Sariwangi',
    wali_nama: '',
    wali_ttl: '',
    wali_jk: '',
    wali_pekerjaan: 'Mengurus Rumah Tangga',
    wali_alamat: '',
    siswa_nama: '',
    siswa_nisn: '',
    siswa_ttl: '',
    siswa_jk: '',
    siswa_pelajar_dari: 'SMP Maarif NU Sariwangi',
    siswa_no_rek: '',
    keperluan: 'persyaratan pengambilan dana bantuan Program Indonesia Pintar (PIP) Sekolah Menengah Pertama Tahun 2025',
    tempat_tanggal: 'Sariwangi, 22 Desember 2025',
  });
  const [waliSiswaId, setWaliSiswaId] = useState<string>('');
  
  const [formRekomendasi, setFormRekomendasi] = useState({
    nomor_surat: 'P/016/PD.01.01/smpmns.srw/2025',
    pejabat: 'Adrian Fauzi Rahman, M.Pd',
    ttl_pejabat: 'Tasikmalaya, 28 Januari 1999',
    jabatan_pejabat: 'Kepala Sekolah SMP Ma\'arif NU Sariwangi',
    alamat_pejabat: 'Kp. Mageung Desa Sirnasari Kec. Sariwangi Kab. Tasikmalaya',
    direkomendasikan_kepada: 'Perwakilan Tim Futsal SMP Maarif NU Sariwangi',
    kegiatan: 'Futsal Competition Pendidikan Indonesia Kab. Tasikmalaya 2025 untuk tingkat SMP/MTs se Kabupaten Tasikmalaya yang dilaksanakan pada tanggal 18 - 19 Oktober 2025 di Lapang Firman Futsal Stadium Singaparna Kab. Tasikmalaya.',
    tempat_tanggal: 'Tasikmalaya, 17 Oktober 2025',
    format_cetak: '2_lembar',
    judul_lampiran: 'DAFTAR PESERTA DIDIK FUTSAL COMPETITION PENDIDIKAN INDONESIA\nSMP MAARIF NU SARIWANGI',
  });
  const [rekomendasiSiswaIds, setRekomendasiSiswaIds] = useState<string[]>([]);
  
  const [isManualPegawai, setIsManualPegawai] = useState(false);

  async function loadData() {
    const [suratResult, guruResult, siswaResult] = await Promise.all([
      supabase.from('smp_surat_keluar').select('*').order('created_at', { ascending: false }),
      supabase.from("smp_guru").select("*").order("nama_lengkap"),
      supabase.from("smp_siswa").select("*").eq("status", "aktif").order("nama_lengkap"),
    ]);
    setArchive(suratResult.data || []);
    setTeachers((guruResult.data || []) as Guru[]);
    setSiswa((siswaResult.data || []) as Siswa[]);
  }

  useEffect(() => { loadData(); }, []);

  function drawKop(doc: any, logoKiri?: string | null, logoKanan?: string | null) {
    if (logoKiri) doc.addImage(logoKiri, 'PNG', 12, 6, 38, 38);
    if (logoKanan) doc.addImage(logoKanan, 'PNG', 160, 6, 38, 38);

    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('YAYASAN AN-NUR MAGEUNG', 105, 18, { align: 'center' });
    doc.setTextColor(0, 128, 0); // Darker Green
    doc.setFontSize(21);
    doc.text('SMP MAARIF NU SARIWANGI', 105, 27, { align: 'center' });
    doc.setTextColor(0, 0, 0); // Black
    doc.setFontSize(11); doc.setFont('times', 'normal');
    doc.text('SK.No. 421.9/KEP.2492/DISDIK/2013', 105, 33, { align: 'center' });
    doc.text('NSS : 202 021 229 220  NPSN : 69788587', 105, 38, { align: 'center' });
    doc.setFontSize(12); doc.setFont('times', 'bold');
    doc.text('TERAKREDITASI "B"', 105, 43, { align: 'center' });
    doc.setFontSize(11); doc.setFont('times', 'normal');
    doc.text('Kp. Mageung Desa Sirnasari Kec. Sariwangi Kab. Tasikmalaya 46465', 105, 48, { align: 'center' });
    doc.text('Email: ', 58, 53); 
    doc.setTextColor(0, 102, 204); doc.text('smpmaarifsariwangi@gmail.com', 69, 53); 
    doc.setTextColor(0, 0, 0); doc.text('Tlp. 0821-1927-9300', 126, 53);
    doc.setLineWidth(1.0); doc.line(12, 56, 198, 56);
    doc.setLineWidth(0.3); doc.line(12, 57.5, 198, 57.5);
  }

  const [generating, setGenerating] = useState(false);

  async function generateTugasAndSPPD() {
    setGenerating(true);
    setMessage('');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      const loadImage = (url: string) => {
        return new Promise<string | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            canvas.getContext('2d')?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      const logoYayasan = await loadImage('/logo-yayasan.png');
      const logoSmp = await loadImage('/logo-smp.png');

      // PAGE 1: SURAT TUGAS
      drawKop(doc, logoYayasan, logoSmp);
      doc.setFontSize(14); doc.setFont('times', 'bold');
      doc.text('SURAT TUGAS', 105, 65, { align: 'center' });
      const tw = doc.getTextWidth('SURAT TUGAS');
      doc.line(105 - tw/2, 66, 105 + tw/2, 66);
      doc.setFontSize(12); doc.setFont('times', 'normal');
      doc.text(`Nomor : ${formTugas.nomor_surat}`, 105, 72, { align: 'center' });

      doc.text(`Kepala Sekolah Menengah Pertama Ma'arif NU Sariwangi, dengan ini menugaskan kepada`, 20, 85);
      doc.text('Saudara :', 20, 93);
      doc.text('Nama', 40, 105); doc.text(`: ${formTugas.nama_pegawai}`, 80, 105);
      doc.text('Unit Kerja', 40, 115); doc.text(`: ${formTugas.unit_kerja}`, 80, 115);
      doc.text('Tugas', 40, 125); doc.text(`: ${formTugas.tugas}`, 80, 125);
      doc.text('Hari / Tanggal', 40, 135); doc.text(`: ${formatDate(formTugas.hari_tanggal)}`, 80, 135);
      doc.text('Tempat', 40, 145); doc.text(`: ${formTugas.tempat}`, 80, 145);

      doc.text('Setelah melaksanakan tugas ini agar segera membuat laporan dan atas perhatiannya', 30, 165);
      doc.text('disampaikan terima kasih.', 20, 173);

      doc.text(`Sariwangi, ${formatDate(formTugas.tanggal_dikeluarkan)}`, 120, 195);
      doc.text(`Kepala SMP Ma'arif NU Sariwangi`, 120, 203);
      doc.setFont('times', 'bold');
      doc.text(formTugas.pejabat, 120, 230);
      const nw = doc.getTextWidth(formTugas.pejabat);
      doc.line(120, 231, 120 + nw, 231);
      doc.setFont('times', 'normal');

      // PAGE 2: SPPD Table
      doc.addPage();
      drawKop(doc, logoYayasan, logoSmp);
      doc.setFontSize(14); doc.setFont('times', 'bold');
      doc.text('SURAT PERINTAH PERJALANAN DINAS (SPPD)', 105, 65, { align: 'center' });
    const sw = doc.getTextWidth('SURAT PERINTAH PERJALANAN DINAS (SPPD)');
    doc.line(105 - sw/2, 66, 105 + sw/2, 66);
    doc.setFontSize(12); doc.setFont('times', 'normal');
    doc.text(`Nomor : ${formTugas.nomor_surat}`, 105, 72, { align: 'center' });

    // Table drawing
    let startY = 85;
    const rowHeight = 10;
    const col1 = 15;
    const col2 = 25;
    const col3 = 90;
    const col4 = 195;
    doc.setLineWidth(0.1);
    
    const rows = [
      ['1', 'Pejabat yang memerintah', `Kepala SMP Ma'arif NU Sariwangi`],
      ['2', 'Nama Pegawai yang diperintah', formTugas.nama_pegawai],
      ['3', 'Jabatan/Pangkat dari pegawai yang diberi perintah', formTugas.jabatan],
      ['4', 'Maksud perjalanan dinas', formTugas.tugas],
      ['5', 'Alat angkutan yang dipergunakan', 'Darat'],
      ['6', 'Tempat berangkat', `SMP Ma'arif NU Sariwangi`],
      ['7', 'Tempat Tujuan', formTugas.tempat],
      ['8', 'Perjalanan Dinas yang diperintahkan', `Selama: ${formTugas.lama_hari}\nDari tanggal: ${formatDate(formTugas.hari_tanggal)}\ns.d. tanggal: ${formatDate(formTugas.hari_tanggal)}`],
      ['9', 'Biaya perjalanan Dinas', formTugas.biaya],
      ['10', 'Keterangan', '']
    ];

    let currentY = startY;
    doc.line(col1, currentY, col4, currentY);
    for (let i = 0; i < rows.length; i++) {
      const isMultiLine = i === 7;
      const h = isMultiLine ? 25 : rowHeight;
      doc.text(rows[i][0], col1 + 3, currentY + 7);
      doc.text(rows[i][1], col2 + 2, currentY + 7, { maxWidth: col3 - col2 - 4 });
      if (isMultiLine) {
        doc.text(rows[i][2], col3 + 2, currentY + 7);
      } else {
        doc.text(rows[i][2], col3 + 2, currentY + 7, { maxWidth: col4 - col3 - 4 });
      }
      currentY += h;
      doc.line(col1, currentY, col4, currentY);
    }
    
    // Vertical lines
    doc.line(col1, startY, col1, currentY);
    doc.line(col2, startY, col2, currentY);
    doc.line(col3, startY, col3, currentY);
    doc.line(col4, startY, col4, currentY);

    currentY += 15;
    doc.text(`Dikeluarkan di : Sariwangi`, 120, currentY);
    doc.text(`Pada tanggal : ${formatDate(formTugas.tanggal_dikeluarkan)}`, 120, currentY + 6);
    doc.text(`Kepala SMP Ma'arif NU Sariwangi`, 120, currentY + 12);
    doc.setFont('times', 'bold');
    doc.text(formTugas.pejabat, 120, currentY + 35);
    const nw2 = doc.getTextWidth(formTugas.pejabat);
    doc.line(120, currentY + 36, 120 + nw2, currentY + 36);
    doc.setFont('times', 'normal');

    // PAGE 3: SPPD Page 2
    doc.addPage();
    drawKop(doc, logoYayasan, logoSmp);

    doc.text('Berangkat dari', 80, 65); doc.text(`: SMP Ma'arif NU Sariwangi`, 110, 65);
    doc.text('Tujuan', 80, 72); doc.text(`: ${formTugas.tempat}`, 110, 72);
    doc.text('Pada Tanggal', 80, 79); doc.text(`: ${formatDate(formTugas.hari_tanggal)}`, 110, 79);
    
    doc.text(`Kepala SMP Ma'arif NU Sariwangi`, 110, 92);
    doc.setFont('times', 'bold');
    doc.text(formTugas.pejabat, 110, 115);
    const nw3 = doc.getTextWidth(formTugas.pejabat);
    doc.line(110, 116, 110 + nw3, 116);
    doc.setFont('times', 'normal');

    // Box configurations
    const bx = 15, by = 125, bw = 85, bh = 45;
    const bx2 = bx + bw;
    
    for (let row = 0; row < 2; row++) {
      const cy = by + (row * bh);
      // Box 1 (Left)
      doc.rect(bx, cy, bw, bh);
      if (row === 0) {
        doc.text('I. Tiba di', bx + 3, cy + 7); doc.text(':', bx + 30, cy + 7);
      } else {
        doc.text('II. Tiba di', bx + 3, cy + 7); doc.text(':', bx + 30, cy + 7);
      }
      doc.text('Pada tanggal', bx + 6, cy + 13); doc.text(':', bx + 30, cy + 13);
      doc.text('Mengetahui Pihak Lembaga (Instansi) :', bx + 6, cy + 19);
      doc.text('............................................', bx + 6, cy + 40);

      // Box 2 (Right)
      doc.rect(bx2, cy, bw, bh);
      doc.text('Berangkat dari', bx2 + 3, cy + 7); doc.text(':', bx2 + 30, cy + 7);
      doc.text('Pada tanggal', bx2 + 6, cy + 13); doc.text(':', bx2 + 30, cy + 13);
      doc.text('Mengetahui Pihak Lembaga (Instansi) :', bx2 + 6, cy + 19);
      doc.text('............................................', bx2 + 6, cy + 40);
    }
    
    // Bottom Box row
    const cy3 = by + (2 * bh);
    doc.rect(bx, cy3, bw, bh);
    doc.text('III. Tiba Kembali di', bx + 3, cy3 + 7); doc.text(':', bx + 33, cy3 + 7);
    doc.text('Pada Tanggal', bx + 6, cy3 + 13); doc.text(':', bx + 33, cy3 + 13);
    
    doc.rect(bx2, cy3, bw, bh);
    doc.text('Telah diperiksa dengan keterangan bahwa', bx2 + 3, cy3 + 7);
    doc.text('perjalanan tersebut atas benar dilakukan perintahnya', bx2 + 3, cy3 + 13);
    doc.text('dan semata-mata untuk kepentingan jabatan dalam', bx2 + 3, cy3 + 19);
    doc.text('waktu yang sesingkat-singkatnya.', bx2 + 3, cy3 + 25);
    
    doc.setFont('times', 'bold');
    doc.text('Pejabat Pembuat Komitmen', bx2 + 20, cy3 + 35);
    doc.text(formTugas.pejabat, bx2 + 20, cy3 + 55);
    const nw4 = doc.getTextWidth(formTugas.pejabat);
    doc.line(bx2 + 20, cy3 + 56, bx2 + 20 + nw4, cy3 + 56);
    doc.setFont('times', 'normal');
    
    const blob = doc.output('blob');
    setPreviewBlob(blob);
    setPreviewPdfUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setMessage(err.message || 'Terjadi kesalahan saat preview PDF.');
    } finally {
      setGenerating(false);
    }
  }

  async function saveAndDownloadTugas() {
    if (!previewBlob) return;
    setGenerating(true);
    setMessage('');
    try {
      const path = `smp/tugas-${Date.now()}-${Math.floor(Math.random() * 10000)}.pdf`;
      const upload = await supabase.storage.from('smp-surat-keluar').upload(path, previewBlob, { contentType: 'application/pdf' });
      const { error } = await supabase.from('smp_surat_keluar').insert({
        nomor_surat: formTugas.nomor_surat || null,
        jenis_surat: 'Surat Tugas & SPPD',
        perihal: formTugas.tugas,
        ditujukan: formTugas.tempat,
        tanggal_surat: formTugas.tanggal_dikeluarkan,
        dibuat_oleh: user?.id || null,
        file_url: upload.data?.path || null
      });
      if (upload.error || error) {
        setGenerating(false);
        return setMessage(upload.error?.message || error?.message || 'Surat belum tersimpan.');
      }
      
      const link = document.createElement('a');
      link.href = previewPdfUrl!;
      link.download = `${formTugas.nomor_surat || 'surat-tugas'}.pdf`;
      link.click();
      
      setMessage('Surat Tugas & SPPD berhasil disimpan dan didownload.');
      setPreviewPdfUrl(null);
      setPreviewBlob(null);
      loadData();
      setActiveTab('log');
      setActiveForm(null);
    } catch (err: any) {
      setMessage(err.message || 'Gagal menyimpan surat.');
    } finally {
      setGenerating(false);
    }
  }

  async function generateSuratKeteranganAktif() {
    setGenerating(true);
    setMessage('');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      const loadImage = (url: string) => {
        return new Promise<string | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            canvas.getContext('2d')?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      const logoYayasan = await loadImage('/logo-yayasan.png');
      const logoSmp = await loadImage('/logo-smp.png');

      drawKop(doc, logoYayasan, logoSmp);
      doc.setFontSize(14); doc.setFont('times', 'bold');
      doc.text('SURAT KETERANGAN', 105, 65, { align: 'center' });
      const tw = doc.getTextWidth('SURAT KETERANGAN');
      doc.line(105 - tw/2, 66, 105 + tw/2, 66);
      doc.setFontSize(12); doc.setFont('times', 'normal');
      doc.text(`Nomor : ${formAktif.nomor_surat || ''}`, 105, 72, { align: 'center' });

      doc.text(`Yang bertanda tangan dibawah ini`, 20, 85);
      doc.text('Nama', 20, 95); doc.text(`: ${formAktif.pejabat || ''}`, 60, 95);
      doc.text('Jabatan', 20, 103); doc.text(`: ${formAktif.jabatan || ''}`, 60, 103);
      doc.text('Unit Kerja', 20, 111); doc.text(`: ${formAktif.unit_kerja || ''}`, 60, 111);
      doc.text('Alamat', 20, 119); doc.text(`: ${formAktif.alamat || ''}`, 60, 119);

      doc.text(`Dengan ini menerangkan bahwa nama-nama berikut ini:`, 20, 131);

      let currentY = 136;
      doc.setLineWidth(0.1);
      const colNo = 20, colNama = 35, colNisn = 105, colTtl = 135, colEnd = 195;
      
      doc.line(colNo, currentY, colEnd, currentY); 
      doc.setFont('times', 'bold');
      doc.text('No', colNo + 5, currentY + 6);
      doc.text('Nama', colNama + 25, currentY + 6);
      doc.text('NISN', colNisn + 10, currentY + 6);
      doc.text('Tempat Tanggal Lahir', colTtl + 10, currentY + 6);
      currentY += 10;
      doc.line(colNo, currentY, colEnd, currentY); 
      
      doc.setFont('times', 'normal');
      const selectedStudents = siswa.filter(s => aktifSiswaIds.includes(s.id));
      for (let i = 0; i < selectedStudents.length; i++) {
        const s = selectedStudents[i];
        const ttl = `${s.alamat?.split(',')[0] || 'Tasikmalaya'}, ${formatDate(s.tanggal_lahir) || '-'}`;
        doc.text((i + 1).toString(), colNo + 5, currentY + 6);
        doc.text(s.nama_lengkap || '-', colNama + 2, currentY + 6);
        doc.text(s.nisn || '-', colNisn + 2, currentY + 6);
        doc.text(ttl, colTtl + 2, currentY + 6);
        currentY += 10;
        doc.line(colNo, currentY, colEnd, currentY);
      }
      
      doc.line(colNo, 136, colNo, currentY);
      doc.line(colNama, 136, colNama, currentY);
      doc.line(colNisn, 136, colNisn, currentY);
      doc.line(colTtl, 136, colTtl, currentY);
      doc.line(colEnd, 136, colEnd, currentY);

      currentY += 15;
      doc.text(`adalah benar-benar tercatat sebagai Peserta Didik SMP MA'ARIF NU SARIWANGI Tahun Pelajaran`, 20, currentY);
      doc.text(`${formAktif.tahun_pelajaran || ''} dan berhak mengikuti ${formAktif.tujuan || ''}.`, 20, currentY + 8);
      doc.text(`Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.`, 20, currentY + 16);

      currentY += 35;
      doc.text(formAktif.tempat_tanggal || '', 120, currentY);
      doc.text(`Kepala Sekolah,`, 120, currentY + 8);
      
      currentY += 35;
      doc.setFont('times', 'bold');
      doc.text(formAktif.pejabat || '', 120, currentY);
      const nw = doc.getTextWidth(formAktif.pejabat || '');
      doc.line(120, currentY + 1, 120 + nw, currentY + 1);
      doc.setFont('times', 'normal');

      const blob = doc.output('blob');
      setPreviewBlob(blob);
      setPreviewPdfUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setMessage(err.message || 'Terjadi kesalahan saat preview PDF.');
    } finally {
      setGenerating(false);
    }
  }

  async function saveAndDownloadAktif() {
    if (!previewBlob) return;
    setGenerating(true);
    setMessage('');
    try {
      const path = `smp/aktif-${Date.now()}-${Math.floor(Math.random() * 10000)}.pdf`;
      const upload = await supabase.storage.from('smp-surat-keluar').upload(path, previewBlob, { contentType: 'application/pdf' });
      const { error } = await supabase.from('smp_surat_keluar').insert({
        nomor_surat: formAktif.nomor_surat || null,
        jenis_surat: 'Surat Keterangan Aktif',
        perihal: formAktif.tujuan,
        ditujukan: 'Siswa / Instansi Terkait',
        tanggal_surat: formAktif.tanggal_dikeluarkan,
        dibuat_oleh: user?.id || null,
        file_url: upload.data?.path || null
      });
      if (upload.error || error) {
        setGenerating(false);
        return setMessage(upload.error?.message || error?.message || 'Surat belum tersimpan.');
      }
      
      const link = document.createElement('a');
      link.href = previewPdfUrl!;
      link.download = `${formAktif.nomor_surat?.replace(/\//g, '-') || 'surat-aktif'}.pdf`;
      link.click();
      
      setMessage('Surat Keterangan Aktif berhasil disimpan dan didownload.');
      setPreviewPdfUrl(null);
      setPreviewBlob(null);
      loadData();
      setActiveTab('log');
      setActiveForm(null);
    } catch (err: any) {
      setMessage(err.message || 'Gagal menyimpan surat.');
    } finally {
      setGenerating(false);
    }
  }

  async function generateSuratKeteranganWali() {
    setGenerating(true);
    setMessage('');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      const loadImage = (url: string) => {
        return new Promise<string | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            canvas.getContext('2d')?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      const logoYayasan = await loadImage('/logo-yayasan.png');
      const logoSmp = await loadImage('/logo-smp.png');

      drawKop(doc, logoYayasan, logoSmp);
      doc.setFontSize(14); doc.setFont('times', 'bold');
      doc.text('SURAT KETERANGAN', 105, 65, { align: 'center' });
      const tw = doc.getTextWidth('SURAT KETERANGAN');
      doc.line(105 - tw/2, 66, 105 + tw/2, 66);
      doc.setFontSize(12); doc.setFont('times', 'normal');
      doc.text(`Nomor: ${formWali.nomor_surat || ''}`, 105, 72, { align: 'center' });

      doc.text(`Yang bertandatangan di bawah ini adalah ${formWali.jabatan_pejabat || ''} menerangkan`, 20, 85);
      doc.text(`bahwa:`, 20, 93);
      
      const lb = 65;
      doc.text('Nama', 25, 103); doc.text(`: ${formWali.wali_nama || ''}`, lb, 103);
      doc.text('Tempat Tanggal Lahir', 25, 111); doc.text(`: ${formWali.wali_ttl || ''}`, lb, 111);
      doc.text('Jenis Kelamin', 25, 119); doc.text(`: ${formWali.wali_jk || ''}`, lb, 119);
      doc.text('Pekerjaan', 25, 127); doc.text(`: ${formWali.wali_pekerjaan || ''}`, lb, 127);
      doc.text('Alamat', 25, 135); doc.text(`: ${formWali.wali_alamat || ''}`, lb, 135);

      doc.text(`Nama tersebut di atas adalah benar Wali dari :`, 20, 150);
      doc.text('Nama', 25, 160); doc.text(`: ${formWali.siswa_nama || ''}`, lb, 160);
      doc.text('NISN', 25, 168); doc.text(`: ${formWali.siswa_nisn || ''}`, lb, 168);
      doc.text('Tempat Tanggal Lahir', 25, 176); doc.text(`: ${formWali.siswa_ttl || ''}`, lb, 176);
      doc.text('Jenis Kelamin', 25, 184); doc.text(`: ${formWali.siswa_jk || ''}`, lb, 184);
      doc.text('Pelajar dari', 25, 192); doc.text(`: ${formWali.siswa_pelajar_dari || ''}`, lb, 192);
      doc.text('Nomor Rekening', 25, 200); doc.text(`: ${formWali.siswa_no_rek || ''}`, lb, 200);

      const splitTujuan = doc.splitTextToSize(`Demikian surat keterangan wali ini dibuat dengan sebenarnya untuk dipergunakan sebagai ${formWali.keperluan || ''}.`, 170);
      doc.text(splitTujuan, 20, 215);

      let currentY = 215 + (splitTujuan.length * 7) + 15;
      doc.text(formWali.tempat_tanggal || '', 120, currentY);
      doc.text(`Kepala Sekolah`, 120, currentY + 8);
      
      currentY += 35;
      doc.setFont('times', 'bold');
      doc.text(formWali.pejabat || '', 120, currentY);
      const nw = doc.getTextWidth(formWali.pejabat || '');
      doc.line(120, currentY + 1, 120 + nw, currentY + 1);
      doc.setFont('times', 'normal');

      const blob = doc.output('blob');
      setPreviewBlob(blob);
      setPreviewPdfUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setMessage(err.message || 'Terjadi kesalahan saat preview PDF.');
    } finally {
      setGenerating(false);
    }
  }

  async function saveAndDownloadWali() {
    if (!previewBlob) return;
    setGenerating(true);
    setMessage('');
    try {
      const path = `smp/wali-${Date.now()}-${Math.floor(Math.random() * 10000)}.pdf`;
      const upload = await supabase.storage.from('smp-surat-keluar').upload(path, previewBlob, { contentType: 'application/pdf' });
      const { error } = await supabase.from('smp_surat_keluar').insert({
        nomor_surat: formWali.nomor_surat || null,
        jenis_surat: 'Surat Keterangan Wali Siswa',
        perihal: 'Keterangan Wali Siswa',
        ditujukan: 'Instansi Terkait',
        tanggal_surat: new Date().toISOString().slice(0, 10),
        dibuat_oleh: user?.id || null,
        file_url: upload.data?.path || null
      });
      if (upload.error || error) {
        setGenerating(false);
        return setMessage(upload.error?.message || error?.message || 'Surat belum tersimpan.');
      }
      
      const link = document.createElement('a');
      link.href = previewPdfUrl!;
      link.download = `${formWali.nomor_surat?.replace(/\//g, '-') || 'surat-wali'}.pdf`;
      link.click();
      
      setMessage('Surat Keterangan Wali Siswa berhasil disimpan dan didownload.');
      setPreviewPdfUrl(null);
      setPreviewBlob(null);
      loadData();
      setActiveTab('log');
      setActiveForm(null);
    } catch (err: any) {
      setMessage(err.message || 'Gagal menyimpan surat.');
    } finally {
      setGenerating(false);
    }
  }

  async function generateSuratRekomendasi() {
    setGenerating(true);
    setMessage('');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      const loadImage = (url: string) => {
        return new Promise<string | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            canvas.getContext('2d')?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      const logoYayasan = await loadImage('/logo-yayasan.png');
      const logoSmp = await loadImage('/logo-smp.png');

      drawKop(doc, logoYayasan, logoSmp);
      doc.setFontSize(14); doc.setFont('times', 'bold');
      doc.text('SURAT REKOMENDASI', 105, 65, { align: 'center' });
      const tw = doc.getTextWidth('SURAT REKOMENDASI');
      doc.line(105 - tw/2, 66, 105 + tw/2, 66);
      doc.setFontSize(12); doc.setFont('times', 'normal');
      doc.text(`Nomor : ${formRekomendasi.nomor_surat || ''}`, 105, 72, { align: 'center' });

      doc.text(`Yang bertanda tangan dibawah ini :`, 20, 85);
      
      const lb = 65;
      doc.text('Nama', 20, 95); doc.text(`: ${formRekomendasi.pejabat || ''}`, lb, 95);
      doc.text('Tempat Tanggal Lahir', 20, 103); doc.text(`: ${formRekomendasi.ttl_pejabat || ''}`, lb, 103);
      doc.text('Jabatan', 20, 111); doc.text(`: ${formRekomendasi.jabatan_pejabat || ''}`, lb, 111);
      doc.text('Alamat sekolah', 20, 119); doc.text(`: ${formRekomendasi.alamat_pejabat || ''}`, lb, 119);

      doc.setFont('times', 'normal');
      doc.text('Memberikan rekomendasi kepada ', 20, 131);
      doc.setFont('times', 'italic');
      doc.text(`${formRekomendasi.direkomendasikan_kepada || ''}.`, 78, 131);
      doc.setFont('times', 'normal');
      
      let currentY = 139;

      const drawTable = (startY: number) => {
        const colNo = 20, colNama = 35, colTtl = 105, colKelas = 170, colEnd = 195;
        doc.setLineWidth(0.1);
        doc.line(colNo, startY, colEnd, startY);
        doc.text('NO', colNo + 5, startY + 6);
        doc.text('NAMA', colNama + 25, startY + 6);
        doc.text('TEMPAT TANGGAL LAHIR', colTtl + 10, startY + 6);
        doc.text('KELAS', colKelas + 5, startY + 6);
        
        let cy = startY + 10;
        doc.line(colNo, cy, colEnd, cy);
        
        const selectedStudents = siswa.filter(s => rekomendasiSiswaIds.includes(s.id));
        for (let i = 0; i < selectedStudents.length; i++) {
          const s = selectedStudents[i];
          const ttl = `${s.alamat?.split(',')[0] || 'Tasikmalaya'}, ${formatDate(s.tanggal_lahir) || '-'}`;
          doc.text((i + 1).toString(), colNo + 5, cy + 6);
          doc.text(s.nama_lengkap || '-', colNama + 2, cy + 6);
          doc.text(ttl, colTtl + 2, cy + 6);
          doc.text(s.kelas || '-', colKelas + 2, cy + 6);
          cy += 10;
          doc.line(colNo, cy, colEnd, cy);
        }
        
        doc.line(colNo, startY, colNo, cy);
        doc.line(colNama, startY, colNama, cy);
        doc.line(colTtl, startY, colTtl, cy);
        doc.line(colKelas, startY, colKelas, cy);
        doc.line(colEnd, startY, colEnd, cy);
        
        return cy;
      };

      if (formRekomendasi.format_cetak === '1_lembar') {
        currentY = drawTable(currentY) + 10;
      }
      
      const splitKegiatan = doc.splitTextToSize(`Untuk mengikuti kegiatan ${formRekomendasi.kegiatan || ''}`, 170);
      doc.text(splitKegiatan, 20, currentY);
      
      currentY += (splitKegiatan.length * 7) + 5;
      
      doc.text(`Demikian surat rekomendasi ini dibuat untuk dapat dipergunakan sebagaimana mestinya.`, 20, currentY);

      currentY += 20;
      doc.text(formRekomendasi.tempat_tanggal || '', 120, currentY);
      doc.text(`Kepala Sekolah`, 120, currentY + 8);
      
      currentY += 35;
      doc.setFont('times', 'bold');
      doc.text(formRekomendasi.pejabat || '', 120, currentY);
      const nw2 = doc.getTextWidth(formRekomendasi.pejabat || '');
      doc.line(120, currentY + 1, 120 + nw2, currentY + 1);
      doc.setFont('times', 'normal');

      if (formRekomendasi.format_cetak === '2_lembar') {
        doc.addPage();
        drawKop(doc, logoYayasan, logoSmp);
        doc.setFont('times', 'bold');
        
        const lampiranLines = (formRekomendasi.judul_lampiran || '').split('\n');
        let lY = 65;
        lampiranLines.forEach(l => {
          doc.text(l, 105, lY, { align: 'center' });
          lY += 7;
        });
        
        doc.setFont('times', 'normal');
        drawTable(lY + 5);
      }

      const blob = doc.output('blob');
      setPreviewBlob(blob);
      setPreviewPdfUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setMessage(err.message || 'Terjadi kesalahan saat preview PDF.');
    } finally {
      setGenerating(false);
    }
  }

  async function saveAndDownloadRekomendasi() {
    if (!previewBlob) return;
    setGenerating(true);
    setMessage('');
    try {
      const path = `smp/rekomendasi-${Date.now()}-${Math.floor(Math.random() * 10000)}.pdf`;
      const upload = await supabase.storage.from('smp-surat-keluar').upload(path, previewBlob, { contentType: 'application/pdf' });
      const { error } = await supabase.from('smp_surat_keluar').insert({
        nomor_surat: formRekomendasi.nomor_surat || null,
        jenis_surat: 'Surat Rekomendasi',
        perihal: 'Rekomendasi Kegiatan',
        ditujukan: 'Instansi / Panitia Terkait',
        tanggal_surat: new Date().toISOString().slice(0, 10),
        dibuat_oleh: user?.id || null,
        file_url: upload.data?.path || null
      });
      if (upload.error || error) {
        setGenerating(false);
        return setMessage(upload.error?.message || error?.message || 'Surat belum tersimpan.');
      }
      
      const link = document.createElement('a');
      link.href = previewPdfUrl!;
      link.download = `${formRekomendasi.nomor_surat?.replace(/\//g, '-') || 'surat-rekomendasi'}.pdf`;
      link.click();
      
      setMessage('Surat Rekomendasi berhasil disimpan dan didownload.');
      setPreviewPdfUrl(null);
      setPreviewBlob(null);
      loadData();
      setActiveTab('log');
      setActiveForm(null);
    } catch (err: any) {
      setMessage(err.message || 'Gagal menyimpan surat.');
    } finally {
      setGenerating(false);
    }
  }

  async function downloadArchive(row: any) {
    if (!row.file_url) return;
    const { data } = await supabase.storage.from('smp-surat-keluar').download(row.file_url);
    if (!data) return;
    const link = document.createElement('a'); link.href = URL.createObjectURL(data);
    link.download = `${row.nomor_surat || row.jenis_surat}.pdf`; link.click(); URL.revokeObjectURL(link.href);
  }

  return (
    <ModuleShell title="Surat Keluar" description="Generate dan cetak surat resmi madrasah.">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setActiveTab('buat'); setActiveForm(null); }}
          className={`px-4 py-2 text-sm font-semibold rounded flex items-center gap-2 border ${activeTab === 'buat' ? 'bg-white text-gray-900 border-gray-200 shadow-sm' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-white/50'}`}
        >
          <Plus size={16} /> Buat Surat
        </button>
        <button
          onClick={() => setActiveTab('log')}
          className={`px-4 py-2 text-sm font-semibold rounded flex items-center gap-2 border ${activeTab === 'log' ? 'bg-white text-gray-900 border-gray-200 shadow-sm' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-white/50'}`}
        >
          <FileText size={16} /> Log Surat Keluar
        </button>
      </div>

      {activeTab === 'buat' && !activeForm && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {SURAT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => {
                  if (card.id === 'tugas' || card.id === 'sppd') {
                    setActiveForm('tugas');
                  } else if (card.id === 'aktif') {
                    setActiveForm('aktif');
                  } else if (card.id === 'wali') {
                    setActiveForm('wali');
                  } else if (card.id === 'rekomendasi') {
                    setActiveForm('rekomendasi');
                  } else {
                    notifyWarning('Form surat ini belum tersedia.');
                  }
                }}
                className="relative flex flex-col items-start p-5 bg-white border border-gray-100 rounded-xl shadow-soft hover:shadow-md hover:border-emerald-100 transition-all text-left overflow-hidden"
              >
                {['tugas', 'sppd', 'aktif', 'wali', 'rekomendasi'].includes(card.id) && (
                  <div className="absolute top-0 right-0 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-b border-l border-emerald-100">
                    Tersedia
                  </div>
                )}
                <div className={`p-2 rounded-lg mb-4 ${card.bg}`}>
                  <Icon className={card.color} size={20} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{card.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              </button>
            )
          })}
        </div>
      )}

      {activeTab === 'buat' && activeForm === 'tugas' && (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Surat Tugas & SPPD</h2>
              <p className="text-sm text-gray-500">Isi formulir untuk men-generate 3 lembar surat.</p>
            </div>
            <button
              onClick={() => setActiveForm(null)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft size={16} /> Kembali
            </button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Field label="Nomor Surat">
              <input value={formTugas.nomor_surat} onChange={e => setFormTugas(f => ({ ...f, nomor_surat: e.target.value }))} className={inputClass} placeholder="P/025/KP.06.01/smpmns.srw/2025" />
            </Field>
            <Field label="Nama Pegawai">
              {!isManualPegawai ? (
                <select
                  value={teachers.some(t => t.nama_lengkap === formTugas.nama_pegawai) ? formTugas.nama_pegawai : (formTugas.nama_pegawai ? 'Lainnya' : '')}
                  onChange={e => {
                    const teacherName = e.target.value;
                    if (teacherName === 'Lainnya') {
                      setIsManualPegawai(true);
                      setFormTugas(f => ({ ...f, nama_pegawai: '', jabatan: '' }));
                    } else {
                      const teacher = teachers.find(t => t.nama_lengkap === teacherName);
                      setFormTugas(f => ({
                        ...f,
                        nama_pegawai: teacherName,
                        jabatan: teacher ? (teacher.mata_pelajaran ? `Guru ${teacher.mata_pelajaran}` : 'Guru / Pegawai') : f.jabatan
                      }));
                    }
                  }}
                  className={inputClass}
                >
                  <option value="">-- Pilih Pegawai/Guru --</option>
                  <option value="Lainnya">Ketik Manual (Lainnya)</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.nama_lengkap}>{t.nama_lengkap}</option>
                  ))}
                </select>
              ) : (
                <div className="flex gap-2">
                  <input 
                    autoFocus
                    value={formTugas.nama_pegawai}
                    onChange={e => setFormTugas(f => ({ ...f, nama_pegawai: e.target.value }))}
                    className={inputClass}
                    placeholder="Ketik nama beserta gelar" 
                  />
                  <button 
                    onClick={() => { setIsManualPegawai(false); setFormTugas(f => ({ ...f, nama_pegawai: '', jabatan: '' })); }}
                    className="px-3 py-2 text-sm font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200"
                  >
                    Batal
                  </button>
                </div>
              )}
            </Field>
            <Field label="Jabatan/Pangkat">
              <input value={formTugas.jabatan} onChange={e => setFormTugas(f => ({ ...f, jabatan: e.target.value }))} className={inputClass} placeholder="Contoh: Kepala Sekolah / Guru" />
            </Field>
            <Field label="Tugas / Maksud Perjalanan">
              <input value={formTugas.tugas} onChange={e => setFormTugas(f => ({ ...f, tugas: e.target.value }))} className={inputClass} placeholder="Contoh: Sosialisasi Anak Tidak Sekolah (ATS)" />
            </Field>
            <Field label="Tempat Tujuan">
              <input value={formTugas.tempat} onChange={e => setFormTugas(f => ({ ...f, tempat: e.target.value }))} className={inputClass} placeholder="Contoh: SMPN 1 Sukaraja" />
            </Field>
            <Field label="Hari / Tanggal Berangkat">
              <input type="date" value={formTugas.hari_tanggal} onChange={e => setFormTugas(f => ({ ...f, hari_tanggal: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Lama Perjalanan">
              <input value={formTugas.lama_hari} onChange={e => setFormTugas(f => ({ ...f, lama_hari: e.target.value }))} className={inputClass} placeholder="1 hari" />
            </Field>
            <Field label="Biaya Transport">
              <input value={formTugas.biaya} onChange={e => setFormTugas(f => ({ ...f, biaya: e.target.value }))} className={inputClass} placeholder="Transport (PP) Rp." />
            </Field>
            <Field label="Tanggal Dikeluarkan">
              <input type="date" value={formTugas.tanggal_dikeluarkan} onChange={e => setFormTugas(f => ({ ...f, tanggal_dikeluarkan: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Pejabat Pembuat Komitmen">
              <input value={formTugas.pejabat} onChange={e => setFormTugas(f => ({ ...f, pejabat: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          
          {previewPdfUrl ? (
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex gap-2 mb-2">
                <button onClick={saveAndDownloadTugas} disabled={generating} className="flex-1 bg-emerald-800 text-white text-sm font-semibold py-2.5 rounded shadow-sm hover:bg-emerald-700 disabled:opacity-70">
                  {generating ? 'Menyimpan...' : 'Simpan ke Log & Download'}
                </button>
                <button onClick={() => { setPreviewPdfUrl(null); setPreviewBlob(null); }} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded border border-gray-200 hover:bg-gray-200 shadow-sm">
                  Batal / Edit
                </button>
              </div>
              <iframe src={previewPdfUrl} className="w-full h-[600px] border border-gray-200 rounded-lg shadow-sm" title="PDF Preview" />
            </div>
          ) : (
            <button onClick={generateTugasAndSPPD} disabled={generating} className="inline-flex items-center rounded bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed">
              <FileText className="mr-2" size={18} /> {generating ? 'Menggenerate Preview...' : 'Preview PDF (3 Lembar)'}
            </button>
          )}
          {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
        </div>
      )}

      {activeTab === 'buat' && activeForm === 'aktif' && (
        <div className="bg-white rounded p-5 border">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setActiveForm(null)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={18} /></button>
            <h2 className="text-lg font-semibold">Buat Surat Keterangan Aktif</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="grid gap-3 mb-4">
                <label className="text-sm font-medium">Nomor Surat</label>
                <input value={formAktif.nomor_surat} onChange={(e) => setFormAktif({...formAktif, nomor_surat: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Tempat, Tanggal Dikeluarkan</label>
                <input value={formAktif.tempat_tanggal} onChange={(e) => setFormAktif({...formAktif, tempat_tanggal: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Tahun Pelajaran</label>
                <input value={formAktif.tahun_pelajaran} onChange={(e) => setFormAktif({...formAktif, tahun_pelajaran: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Berhak Mengikuti / Tujuan</label>
                <input value={formAktif.tujuan} onChange={(e) => setFormAktif({...formAktif, tujuan: e.target.value})} className={inputClass} />
              </div>
              
              <div className="border-t pt-4 mt-4 grid gap-3">
                <h3 className="font-semibold text-sm">Pejabat Penandatangan</h3>
                <label className="text-sm font-medium">Nama Pejabat</label>
                <input value={formAktif.pejabat} onChange={(e) => setFormAktif({...formAktif, pejabat: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Jabatan</label>
                <input value={formAktif.jabatan} onChange={(e) => setFormAktif({...formAktif, jabatan: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Unit Kerja</label>
                <input value={formAktif.unit_kerja} onChange={(e) => setFormAktif({...formAktif, unit_kerja: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Alamat</label>
                <input value={formAktif.alamat} onChange={(e) => setFormAktif({...formAktif, alamat: e.target.value})} className={inputClass} />
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm mb-3">Daftar Siswa</h3>
              <div className="flex flex-col gap-2 mb-4">
                <select 
                  className={inputClass} 
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id && !aktifSiswaIds.includes(id)) {
                      setAktifSiswaIds([...aktifSiswaIds, id]);
                    }
                    e.target.value = '';
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>-- Pilih Siswa dari Data --</option>
                  {siswa.map(s => (
                    <option key={s.id} value={s.id}>{s.nama_lengkap} ({s.nisn || s.nis})</option>
                  ))}
                </select>
                
                <div className="border rounded p-3 min-h-[200px] flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                  {aktifSiswaIds.length === 0 ? (
                    <p className="text-sm text-gray-500 italic text-center mt-10">Belum ada siswa terpilih.</p>
                  ) : (
                    aktifSiswaIds.map(id => {
                      const student = siswa.find(s => s.id === id);
                      if (!student) return null;
                      return (
                        <div key={id} className="flex justify-between items-center bg-gray-50 p-2 rounded border text-sm">
                          <div>
                            <p className="font-medium">{student.nama_lengkap}</p>
                            <p className="text-xs text-gray-500">NISN: {student.nisn || '-'}</p>
                          </div>
                          <button onClick={() => setAktifSiswaIds(aktifSiswaIds.filter(i => i !== id))} className="text-red-500 hover:bg-red-50 p-1 rounded">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex gap-2">
                  <button onClick={generateSuratKeteranganAktif} disabled={generating || aktifSiswaIds.length === 0} className="bg-white border flex-1 py-2 rounded font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    {generating ? 'Memproses...' : 'Preview PDF'}
                  </button>
                  {previewBlob && (
                    <button onClick={saveAndDownloadAktif} disabled={generating} className="bg-emerald-800 text-white flex-1 py-2 rounded font-semibold hover:bg-emerald-700 disabled:opacity-50 flex justify-center items-center gap-2">
                      <Save size={16} /> Simpan & Print
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {previewPdfUrl && (
            <div className="mt-8 border-t pt-6">
              <h3 className="font-semibold mb-4">Preview PDF</h3>
              <iframe src={previewPdfUrl} className="w-full h-[600px] rounded border" title="Preview PDF" />
            </div>
          )}
        </div>
      )}

      {activeTab === 'buat' && activeForm === 'wali' && (
        <div className="bg-white rounded p-5 border">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setActiveForm(null)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={18} /></button>
            <h2 className="text-lg font-semibold">Buat Surat Keterangan Wali Siswa</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="grid gap-3 mb-4">
                <label className="text-sm font-medium">Nomor Surat</label>
                <input value={formWali.nomor_surat} onChange={(e) => setFormWali({...formWali, nomor_surat: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Tempat, Tanggal Dikeluarkan</label>
                <input value={formWali.tempat_tanggal} onChange={(e) => setFormWali({...formWali, tempat_tanggal: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Keperluan (untuk dipergunakan sebagai ...)</label>
                <textarea value={formWali.keperluan} rows={3} onChange={(e) => setFormWali({...formWali, keperluan: e.target.value})} className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-700" />
              </div>

              <div className="border-t pt-4 mt-4 grid gap-3">
                <h3 className="font-semibold text-sm">Data Wali</h3>
                <label className="text-sm font-medium">Nama Wali</label>
                <input value={formWali.wali_nama} onChange={(e) => setFormWali({...formWali, wali_nama: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Tempat Tanggal Lahir</label>
                <input value={formWali.wali_ttl} onChange={(e) => setFormWali({...formWali, wali_ttl: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Jenis Kelamin</label>
                <input value={formWali.wali_jk} onChange={(e) => setFormWali({...formWali, wali_jk: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Pekerjaan</label>
                <input value={formWali.wali_pekerjaan} onChange={(e) => setFormWali({...formWali, wali_pekerjaan: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Alamat</label>
                <input value={formWali.wali_alamat} onChange={(e) => setFormWali({...formWali, wali_alamat: e.target.value})} className={inputClass} />
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm mb-3">Isi Otomatis dari Data Siswa</h3>
              <div className="flex flex-col gap-2 mb-4">
                <select 
                  className={inputClass} 
                  value={waliSiswaId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setWaliSiswaId(id);
                    if (id) {
                      const student = siswa.find(s => s.id === id);
                      if (student) {
                        const s_ttl = `${student.alamat?.split(',')[0] || 'Tasikmalaya'}, ${formatDate(student.tanggal_lahir) || ''}`;
                        const jkStr = student.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan';
                        setFormWali({
                          ...formWali,
                          siswa_nama: student.nama_lengkap || '',
                          siswa_nisn: student.nisn || student.nis || '',
                          siswa_ttl: s_ttl,
                          siswa_jk: jkStr,
                          wali_nama: student.nama_wali || '',
                          wali_alamat: student.alamat || '',
                        });
                      }
                    }
                  }}
                >
                  <option value="" disabled>-- Pilih Siswa --</option>
                  {siswa.map(s => (
                    <option key={s.id} value={s.id}>{s.nama_lengkap} ({s.nisn || s.nis})</option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-4 mt-4 grid gap-3">
                <h3 className="font-semibold text-sm">Data Siswa</h3>
                <label className="text-sm font-medium">Nama Siswa</label>
                <input value={formWali.siswa_nama} onChange={(e) => setFormWali({...formWali, siswa_nama: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">NISN</label>
                <input value={formWali.siswa_nisn} onChange={(e) => setFormWali({...formWali, siswa_nisn: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Tempat Tanggal Lahir</label>
                <input value={formWali.siswa_ttl} onChange={(e) => setFormWali({...formWali, siswa_ttl: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Jenis Kelamin</label>
                <input value={formWali.siswa_jk} onChange={(e) => setFormWali({...formWali, siswa_jk: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Pelajar dari</label>
                <input value={formWali.siswa_pelajar_dari} onChange={(e) => setFormWali({...formWali, siswa_pelajar_dari: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Nomor Rekening</label>
                <input value={formWali.siswa_no_rek} onChange={(e) => setFormWali({...formWali, siswa_no_rek: e.target.value})} className={inputClass} />
              </div>

              <div className="border-t pt-4 mt-4 grid gap-3">
                <h3 className="font-semibold text-sm">Pejabat Penandatangan</h3>
                <label className="text-sm font-medium">Nama Pejabat</label>
                <input value={formWali.pejabat} onChange={(e) => setFormWali({...formWali, pejabat: e.target.value})} className={inputClass} />
                <label className="text-sm font-medium">Jabatan & Instansi (dalam teks)</label>
                <input value={formWali.jabatan_pejabat} onChange={(e) => setFormWali({...formWali, jabatan_pejabat: e.target.value})} className={inputClass} />
              </div>
              
              <div className="border-t pt-4 mt-6">
                <div className="flex gap-2">
                  <button onClick={generateSuratKeteranganWali} disabled={generating} className="bg-white border flex-1 py-2 rounded font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    {generating ? 'Memproses...' : 'Preview PDF'}
                  </button>
                  {previewBlob && (
                    <button onClick={saveAndDownloadWali} disabled={generating} className="bg-emerald-800 text-white flex-1 py-2 rounded font-semibold hover:bg-emerald-700 disabled:opacity-50 flex justify-center items-center gap-2">
                      <Save size={16} /> Simpan & Print
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {previewPdfUrl && (
            <div className="mt-8 border-t pt-6">
              <h3 className="font-semibold mb-4">Preview PDF</h3>
              <iframe src={previewPdfUrl} className="w-full h-[600px] rounded border" title="Preview PDF" />
            </div>
          )}
        </div>
      )}

      {activeTab === 'buat' && activeForm === 'rekomendasi' && (
        <div className="bg-white rounded p-5 border">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setActiveForm(null)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={18} /></button>
            <h2 className="text-lg font-semibold">Buat Surat Rekomendasi</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="grid gap-3 mb-4">
                <label className="text-sm font-medium">Nomor Surat</label>
                <input value={formRekomendasi.nomor_surat} onChange={(e) => setFormRekomendasi({...formRekomendasi, nomor_surat: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Tempat, Tanggal Dikeluarkan</label>
                <input value={formRekomendasi.tempat_tanggal} onChange={(e) => setFormRekomendasi({...formRekomendasi, tempat_tanggal: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Memberikan rekomendasi kepada (Tercetak Italic)</label>
                <input value={formRekomendasi.direkomendasikan_kepada} onChange={(e) => setFormRekomendasi({...formRekomendasi, direkomendasikan_kepada: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Tujuan Rekomendasi / Kegiatan</label>
                <textarea value={formRekomendasi.kegiatan} rows={3} onChange={(e) => setFormRekomendasi({...formRekomendasi, kegiatan: e.target.value})} className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-700" />
              </div>

              <div className="border-t pt-4 mt-4 grid gap-3">
                <h3 className="font-semibold text-sm">Pejabat Penandatangan</h3>
                <label className="text-sm font-medium">Nama Pejabat</label>
                <input value={formRekomendasi.pejabat} onChange={(e) => setFormRekomendasi({...formRekomendasi, pejabat: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Tempat Tanggal Lahir Pejabat</label>
                <input value={formRekomendasi.ttl_pejabat} onChange={(e) => setFormRekomendasi({...formRekomendasi, ttl_pejabat: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Jabatan Pejabat</label>
                <input value={formRekomendasi.jabatan_pejabat} onChange={(e) => setFormRekomendasi({...formRekomendasi, jabatan_pejabat: e.target.value})} className={inputClass} />
                
                <label className="text-sm font-medium">Alamat Sekolah</label>
                <input value={formRekomendasi.alamat_pejabat} onChange={(e) => setFormRekomendasi({...formRekomendasi, alamat_pejabat: e.target.value})} className={inputClass} />
              </div>
            </div>
            
            <div>
              <div className="bg-gray-50 p-4 rounded mb-6 border border-gray-100">
                <h3 className="font-semibold text-sm mb-3">Format Cetak</h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={formRekomendasi.format_cetak === '1_lembar'} onChange={() => setFormRekomendasi({...formRekomendasi, format_cetak: '1_lembar'})} className="text-emerald-600 focus:ring-emerald-600" />
                    1 Lembar (Tabel digabung)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={formRekomendasi.format_cetak === '2_lembar'} onChange={() => setFormRekomendasi({...formRekomendasi, format_cetak: '2_lembar'})} className="text-emerald-600 focus:ring-emerald-600" />
                    2 Lembar (Tabel di lampiran terpisah)
                  </label>
                </div>
                
                {formRekomendasi.format_cetak === '2_lembar' && (
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-700">Judul Tabel Lampiran</label>
                    <textarea value={formRekomendasi.judul_lampiran} rows={2} onChange={(e) => setFormRekomendasi({...formRekomendasi, judul_lampiran: e.target.value})} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-700" />
                  </div>
                )}
              </div>

              <div className="grid gap-3">
                <h3 className="font-semibold text-sm">Daftar Siswa (Tampil di Tabel)</h3>
                
                <div className="flex gap-2">
                  <select id="rekomendasiSiswaSelect" className={inputClass} defaultValue="">
                    <option value="" disabled>-- Pilih Siswa Tambahan --</option>
                    {siswa.filter(s => !rekomendasiSiswaIds.includes(s.id)).map(s => (
                      <option key={s.id} value={s.id}>{s.nama_lengkap} ({s.nisn || s.nis})</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      const sel = document.getElementById('rekomendasiSiswaSelect') as HTMLSelectElement;
                      if (sel.value) {
                        setRekomendasiSiswaIds([...rekomendasiSiswaIds, sel.value]);
                        sel.value = "";
                      }
                    }}
                    className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded text-sm font-semibold hover:bg-emerald-200"
                  >
                    Tambah
                  </button>
                </div>
                
                <div className="mt-2 border rounded p-3 min-h-[150px] bg-gray-50 flex flex-col gap-2">
                  {rekomendasiSiswaIds.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">Belum ada siswa terpilih.</p>
                  ) : (
                    rekomendasiSiswaIds.map((id, index) => {
                      const student = siswa.find(s => s.id === id);
                      return (
                        <div key={id} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200 shadow-sm">
                          <span className="text-sm font-medium">{index + 1}. {student?.nama_lengkap}</span>
                          <button onClick={() => setRekomendasiSiswaIds(rekomendasiSiswaIds.filter(x => x !== id))} className="text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              
              <div className="border-t pt-4 mt-6">
                <div className="flex gap-2">
                  <button onClick={generateSuratRekomendasi} disabled={generating} className="bg-white border flex-1 py-2 rounded font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    {generating ? 'Memproses...' : 'Preview PDF'}
                  </button>
                  {previewBlob && (
                    <button onClick={saveAndDownloadRekomendasi} disabled={generating} className="bg-emerald-800 text-white flex-1 py-2 rounded font-semibold hover:bg-emerald-700 disabled:opacity-50 flex justify-center items-center gap-2">
                      <Save size={16} /> Simpan & Print
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {previewPdfUrl && (
            <div className="mt-8 border-t pt-6">
              <h3 className="font-semibold mb-4">Preview PDF</h3>
              <iframe src={previewPdfUrl} className="w-full h-[600px] rounded border" title="Preview PDF" />
            </div>
          )}
        </div>
      )}

      {activeTab === 'log' && (
        <div className="space-y-4">
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
              <span className="text-sm font-medium text-red-800">{selectedIds.length} item terpilih</span>
              <button onClick={deleteSelected} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded shadow-sm hover:bg-red-700">
                <Trash2 size={16} /> Hapus Terpilih
              </button>
            </div>
          )}
          <DataTable 
            headers={[
              <input key="chk-all" type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === archive.length} onChange={toggleSelectAll} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />,
              'Tanggal', 'Nomor', 'Jenis', 'Perihal', 'Aksi'
            ]} 
            rows={archive.map((row) => [
              <input key={`chk-${row.id}`} type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />,
              formatDate(row.tanggal_surat), row.nomor_surat || '-', row.jenis_surat, row.perihal || '-', 
              <div key="actions" className="flex gap-2">
                <button onClick={() => downloadArchive(row)} className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 flex items-center gap-1"><Download size={14}/> Unduh</button>
              </div>
            ])} 
          />
        </div>
      )}
    </ModuleShell>
  );
}
function SpmbModule() {
  const [rows, setRows] = useState<SpmbRow[]>([]);
  const [selected, setSelected] = useState<SpmbRow | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "pendaftar" | "pengaturan">("dashboard");
  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState({
    active: false,
    tahun_ajaran: "",
    deskripsi:
      "Lengkapi formulir SPMB. Bukti pendaftaran resmi akan otomatis dibuat setelah data terkirim.",
    jadwal: "",
    syarat: "",
    alur: "",
    biaya: "",
  });

  async function loadRows() {
    const { data } = await supabase
      .from("smp_spmb_pendaftar")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data || []) as SpmbRow[]);
  }

  async function loadSettings() {
    const { data } = await supabase
      .from("lp_konten")
      .select("key,value")
      .eq("entitas", "smp")
      .eq("section", "spmb");
    const mapped = (data || []).reduce<Record<string, string>>((acc, row) => {
      acc[String(row.key)] = String(row.value || "");
      return acc;
    }, {});
    setSettings({
      active: ["true", "1", "aktif", "active", "yes", "ya"].includes(
        String(mapped.active || "false").toLowerCase(),
      ),
      tahun_ajaran: mapped.tahun_ajaran || "",
      deskripsi:
        mapped.deskripsi ||
        "Lengkapi formulir SPMB. Bukti pendaftaran resmi akan otomatis dibuat setelah data terkirim.",
      jadwal: mapped.jadwal || "",
      syarat: mapped.syarat || "",
      alur: mapped.alur || "",
      biaya: mapped.biaya || "",
    });
    if (mapped.tahun_ajaran) setYearFilter(mapped.tahun_ajaran);
  }

  useEffect(() => {
    loadRows();
    loadSettings();
  }, []);

  async function updateStatus(row: SpmbRow, status: SpmbRow["status"]) {
    const { error } = await supabase
      .from("smp_spmb_pendaftar")
      .update({ status })
      .eq("id", row.id);
    setMessage(error ? error.message : "Status pendaftar diperbarui.");
    loadRows();
  }

  async function deletePendaftar(row: SpmbRow) {
    const confirmed = window.confirm(`Hapus data SPMB atas nama ${row.nama_lengkap}?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("smp_spmb_pendaftar")
      .delete()
      .eq("id", row.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (row.bukti_url) await supabase.storage.from("smp-spmb-bukti").remove([row.bukti_url]);
    if (row.foto_url) await supabase.storage.from("smp-spmb-foto").remove([row.foto_url]);
    if (row.dokumen_url) await supabase.storage.from("spmb-dokumen").remove([row.dokumen_url]);

    if (selected?.id === row.id) setSelected(null);
    setMessage("Data pendaftar dihapus.");
    loadRows();
  }

  async function saveSettings() {
    setMessage("");
    const rowsToSave = Object.entries({
      active: settings.active ? "true" : "false",
      tahun_ajaran: settings.tahun_ajaran.trim(),
      deskripsi: settings.deskripsi.trim(),
      jadwal: settings.jadwal.trim(),
      syarat: settings.syarat.trim(),
      alur: settings.alur.trim(),
      biaya: settings.biaya.trim(),
    }).map(([key, value]) => ({ entitas: "smp", section: "spmb", key, value }));

    const { error } = await supabase
      .from("lp_konten")
      .upsert(rowsToSave, { onConflict: "entitas,section,key" });

    setMessage(error ? error.message : "Pengaturan SPMB tersimpan.");
    if (!error) {
      setYearFilter(settings.tahun_ajaran.trim());
      loadSettings();
    }
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(
      filteredRows.map((row) => ({
        "Nomor Pendaftaran": row.nomor_pendaftaran || "",
        "Tahun Ajaran": row.tahun_ajaran || "",
        "Tanggal Daftar": formatDate(row.created_at),
        "Nama Lengkap": row.nama_lengkap,
        "Jenis Kelamin": row.jenis_kelamin === "L" ? "Laki-laki" : row.jenis_kelamin === "P" ? "Perempuan" : "",
        "Tanggal Lahir": row.tanggal_lahir || "",
        "Asal Sekolah": row.asal_sekolah || "",
        "Nama Orang Tua/Wali": row.nama_orang_tua || "",
        "No HP": row.no_hp || "",
        Alamat: row.alamat || "",
        "URL Foto": row.foto_url
          ? supabase.storage.from("smp-spmb-foto").getPublicUrl(row.foto_url).data.publicUrl
          : "",
        Status: row.status,
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pendaftar SPMB");
    XLSX.writeFile(workbook, `data-spmb-${yearFilter || "semua"}.xlsx`);
  }

  const years = Array.from(
    new Set(rows.map((row) => row.tahun_ajaran).filter(Boolean) as string[]),
  );
  const summaryRows = settings.tahun_ajaran
    ? rows.filter((row) => row.tahun_ajaran === settings.tahun_ajaran)
    : rows;
  const filteredRows = rows.filter((row) => {
    const statusMatches = statusFilter ? row.status === statusFilter : true;
    const yearMatches = yearFilter ? row.tahun_ajaran === yearFilter : true;
    return statusMatches && yearMatches;
  });
  const total = summaryRows.length;
  const unverified = summaryRows.filter((row) => row.status === "baru").length;
  const verified = summaryRows.filter((row) =>
    ["diverifikasi", "diterima"].includes(row.status),
  ).length;

  function proofUrl(row: SpmbRow) {
    if (!row.bukti_url) return "";
    return supabase.storage.from("smp-spmb-bukti").getPublicUrl(row.bukti_url).data.publicUrl;
  }

  function photoUrl(row: SpmbRow) {
    if (!row.foto_url) return "";
    return supabase.storage.from("smp-spmb-foto").getPublicUrl(row.foto_url).data.publicUrl;
  }

  return (
    <ModuleShell
      title="SPMB"
      description="Atur tahun ajaran, buka/tutup SPMB di landing page, kelola pendaftar, verifikasi status, dan export data Excel."
    >
      <div className="rounded bg-white p-5 shadow-soft">
        <div className="flex flex-wrap gap-2">
          {[
            ["dashboard", "Dashboard"],
            ["pendaftar", "Pendaftar"],
            ["pengaturan", "Pengaturan"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={[
                "rounded border px-4 py-2 text-sm font-semibold",
                activeTab === key
                  ? "border-emerald-800 bg-emerald-800 text-white"
                  : "border-gray-200 bg-white text-gray-700",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </div>

      {activeTab === "dashboard" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Jumlah Pendaftar", total],
            ["Belum Terverifikasi", unverified],
            ["Terverifikasi", verified],
          ].map(([label, value]) => (
            <div key={label} className="rounded bg-white p-5 shadow-soft">
              <p className="text-sm font-semibold text-gray-500">{label}</p>
              <p className="mt-3 text-3xl font-bold text-emerald-900">{value}</p>
              <p className="mt-2 text-xs text-gray-500">
                Tahun ajaran {settings.tahun_ajaran || "semua"}
              </p>
            </div>
          ))}
          <div className="rounded bg-white p-5 shadow-soft md:col-span-3">
            <p className="text-sm font-semibold text-gray-500">Status SPMB Landing Page</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xl font-semibold text-gray-950">
                  {settings.active ? "SPMB sedang dibuka" : "SPMB sedang ditutup"}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {settings.active
                    ? "Section pendaftaran dan tombol cepat di hero landing page aktif."
                    : "Section pendaftaran tidak tampil di landing page."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("pengaturan")}
                className="inline-flex items-center rounded border px-4 py-2 text-sm font-semibold"
              >
                <Pencil className="mr-2" size={16} />
                Atur SPMB
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "pengaturan" ? (
        <div className="rounded bg-white p-5 shadow-soft">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-gray-700">
              Tahun ajaran SPMB
              <input
                value={settings.tahun_ajaran}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, tahun_ajaran: event.target.value }))
                }
                placeholder="Contoh: 2026/2027"
                className={inputClass}
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 rounded border border-gray-200 px-3 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={settings.active}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, active: event.target.checked }))
                }
              />
              Aktifkan SPMB di landing page
            </label>
            {(["deskripsi", "jadwal", "syarat", "alur", "biaya"] as const).map((key) => (
              <label key={key} className="grid gap-2 text-sm font-semibold capitalize text-gray-700">
                {key}
                <textarea
                  value={settings[key]}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, [key]: event.target.value }))
                  }
                  rows={3}
                  className="rounded border border-gray-200 px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={saveSettings}
            className="mt-4 inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
          >
            <Save className="mr-2" size={17} />
            Simpan Pengaturan
          </button>
        </div>
      ) : null}

      {activeTab === "pendaftar" ? (
        <>
          <div className="rounded bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row">
              <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className={inputClass}>
                <option value="">Semua tahun ajaran</option>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>
                <option value="">Semua status</option>
                <option value="baru">Baru</option>
                <option value="diverifikasi">Diverifikasi</option>
                <option value="diterima">Diterima</option>
                <option value="ditolak">Ditolak</option>
              </select>
              <button onClick={exportExcel} className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                <Download className="mr-2" size={17} />
                Export Excel
              </button>
            </div>
          </div>
          <DataTable
            headers={["Tanggal", "Nomor", "Nama", "Tahun", "Asal Sekolah", "Kontak", "Status", "Aksi"]}
            rows={filteredRows.map((row) => [
              formatDate(row.created_at),
              row.nomor_pendaftaran || "-",
              row.nama_lengkap,
              row.tahun_ajaran || "-",
              row.asal_sekolah || "-",
              row.no_hp || "-",
              row.status,
              <div key="actions" className="flex flex-wrap gap-2">
                <button onClick={() => setSelected(row)} className="rounded border px-3 py-2 text-sm font-semibold">Detail</button>
                {proofUrl(row) ? (
                  <a href={proofUrl(row)} target="_blank" rel="noreferrer" className="rounded border px-3 py-2 text-sm font-semibold">
                    Bukti
                  </a>
                ) : null}
                {(["baru", "diverifikasi", "diterima", "ditolak"] as const).map((status) => (
                  <button key={status} onClick={() => updateStatus(row, status)} className="rounded border px-3 py-2 text-xs font-semibold capitalize">
                    {status}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => deletePendaftar(row)}
                  className="inline-flex items-center rounded border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="mr-1" size={14} />
                  Hapus
                </button>
              </div>,
            ])}
          />
        </>
      ) : null}

      {selected ? (
        <div className="rounded bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold">Detail Pendaftar</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[140px_1fr]">
            {photoUrl(selected) ? (
              <img
                src={photoUrl(selected)}
                alt={selected.nama_lengkap}
                className="h-36 w-28 rounded border border-gray-200 object-cover"
              />
            ) : (
              <div className="grid h-36 w-28 place-items-center rounded border border-dashed border-gray-300 text-center text-xs text-gray-500">
                Foto belum ada
              </div>
            )}
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>Nomor: {selected.nomor_pendaftaran || "-"}</p>
              <p>Tahun ajaran: {selected.tahun_ajaran || "-"}</p>
              <p>Nama: {selected.nama_lengkap}</p>
              <p>JK: {selected.jenis_kelamin || "-"}</p>
              <p>Tanggal lahir: {formatDate(selected.tanggal_lahir)}</p>
              <p>Asal sekolah: {selected.asal_sekolah || "-"}</p>
              <p>Orang tua: {selected.nama_orang_tua || "-"}</p>
              <p>No HP: {selected.no_hp || "-"}</p>
              <p>Status: {selected.status}</p>
              <p className="md:col-span-2">Alamat: {selected.alamat || "-"}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {proofUrl(selected) ? (
              <a href={proofUrl(selected)} target="_blank" rel="noreferrer" className="rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                Buka Bukti PDF
              </a>
            ) : null}
            {photoUrl(selected) ? (
              <a href={photoUrl(selected)} target="_blank" rel="noreferrer" className="rounded border px-4 py-2 text-sm font-semibold">
                Buka Foto
              </a>
            ) : null}
            <button onClick={() => deletePendaftar(selected)} className="rounded border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
              Hapus Data
            </button>
            <button onClick={() => setSelected(null)} className="rounded border px-4 py-2 text-sm font-semibold">
              Tutup Detail
            </button>
          </div>
        </div>
      ) : null}
    </ModuleShell>
  );
}

function SpmbSettingsModule() {
  const [settings, setSettings] = useState({ active: false, deskripsi: "", jadwal: "", syarat: "", alur: "", biaya: "" });
  const [message, setMessage] = useState("");
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("lp_konten").select("key,value").eq("entitas", "smp").eq("section", "spmb");
      const rows = (data || []).reduce<Record<string, string>>((acc, row) => ({ ...acc, [row.key]: row.value || "" }), {});
      setSettings({ active: ["true", "aktif", "1"].includes((rows.active || "").toLowerCase()), deskripsi: rows.deskripsi || "", jadwal: rows.jadwal || "", syarat: rows.syarat || "", alur: rows.alur || "", biaya: rows.biaya || "" });
    }
    load();
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rows = Object.entries({ active: settings.active ? "true" : "false", deskripsi: settings.deskripsi, jadwal: settings.jadwal, syarat: settings.syarat, alur: settings.alur, biaya: settings.biaya }).map(([key, value]) => ({ entitas: "smp", section: "spmb", key, value }));
    const { error } = await supabase.from("lp_konten").upsert(rows, { onConflict: "entitas,section,key" });
    setMessage(error ? error.message : "Pengaturan landing SPMB tersimpan.");
  }
  return (
    <ModuleShell title="Konten Landing Page" description="Kontrol status dan konten SPMB di landing page SMP.">
      <form onSubmit={save} className="rounded bg-white p-5 shadow-soft">
        <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={settings.active} onChange={(e) => setSettings((s) => ({ ...s, active: e.target.checked }))} /> Aktifkan SPMB di landing page</label>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(["deskripsi", "jadwal", "syarat", "alur", "biaya"] as const).map((key) => <label key={key} className="grid gap-2 text-sm font-semibold capitalize">{key}<textarea value={settings[key]} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))} rows={3} className="rounded border border-gray-200 px-3 py-3 font-normal" /></label>)}
        </div>
        <button className="mt-4 rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Simpan</button>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </form>
    </ModuleShell>
  );
}

function distance(a: number[], b: number[]) {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
}

function normalizeDescriptor(value: number[] | number[][]) {
  if (Array.isArray(value[0])) return value as number[][];
  return [value as number[]];
}

function PresensiModule() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [faceapi, setFaceapi] = useState<any>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [mode, setMode] = useState<"enroll" | "presensi" | "rekap">("presensi");
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [wajah, setWajah] = useState<WajahData[]>([]);
  const [presensi, setPresensi] = useState<PresensiRow[]>([]);
  const [selectedSiswa, setSelectedSiswa] = useState("");
  const [kelas, setKelas] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [range, setRange] = useState({ from: new Date().toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10), tipe: "harian" });
  const [samples, setSamples] = useState<number[][]>([]);
  const [message, setMessage] = useState("");

  async function loadData() {
    const [siswaResult, wajahResult, presensiResult] = await Promise.all([
      supabase.from("smp_siswa").select("*").eq("status", "aktif").order("nama_lengkap"),
      supabase.from("smp_wajah_data").select("*, siswa:smp_siswa(nama_lengkap,kelas)").eq("aktif", true),
      supabase.from("smp_presensi").select("*, siswa:smp_siswa(nama_lengkap,nis,kelas)").gte("tanggal", range.from).lte("tanggal", range.to).order("tanggal", { ascending: false }),
    ]);
    setSiswa((siswaResult.data || []) as Siswa[]);
    setWajah((wajahResult.data || []) as WajahData[]);
    setPresensi((presensiResult.data || []) as PresensiRow[]);
  }

  useEffect(() => { loadData(); }, [range.from, range.to]);

  async function loadModels() {
    if (modelsReady) return;
    const api = await import("face-api.js");
    const loadFrom = async (modelUrl: string) => {
      await Promise.all([
        api.nets.ssdMobilenetv1.loadFromUri(modelUrl),
        api.nets.faceLandmark68Net.loadFromUri(modelUrl),
        api.nets.faceRecognitionNet.loadFromUri(modelUrl),
      ]);
    };

    try {
      await loadFrom("/models");
    } catch {
      await loadFrom("https://justadudewhohacks.github.io/face-api.js/models");
    }
    setFaceapi(api);
    setModelsReady(true);
    setMessage("Model face recognition siap.");
  }

  async function startCamera() {
    await loadModels();
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    setCameraOn(true);
  }

  function stopCamera() {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function detectDescriptor() {
    if (!faceapi || !videoRef.current) return null;
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options())
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection ? Array.from(detection.descriptor as Float32Array) : null;
  }

  async function captureSample() {
    const descriptor = await detectDescriptor();
    if (!descriptor) {
      setMessage("Wajah belum terdeteksi. Pastikan kamera menghadap siswa.");
      return;
    }
    setSamples((current) => [...current, descriptor]);
    setMessage(`Sample tersimpan (${samples.length + 1}/5).`);
  }

  async function saveEnrollment() {
    if (!selectedSiswa || samples.length < 5) {
      setMessage("Pilih siswa dan ambil minimal 5 sample wajah.");
      return;
    }
    const averaged = samples[0].map((_, index) =>
      samples.reduce((sum, item) => sum + item[index], 0) / samples.length,
    );
    const { error } = await supabase.from("smp_wajah_data").upsert(
      {
        siswa_id: selectedSiswa,
        descriptor: averaged,
        aktif: true,
      },
      { onConflict: "siswa_id" },
    );
    setMessage(error ? error.message : "Enrollment wajah berhasil disimpan.");
    setSamples([]);
    loadData();
  }

  async function markAttendance(siswaId: string, method: "manual" | "face_recognition", status = "hadir") {
    const { error } = await supabase.from("smp_presensi").upsert(
      {
        siswa_id: siswaId,
        tanggal,
        jam_masuk: new Date().toISOString(),
        metode: method,
        status,
        dicatat_oleh: user?.id || null,
      },
      { onConflict: "siswa_id,tanggal" },
    );
    if (!error) {
      setMessage(`Presensi ${method === "manual" ? "manual" : "wajah"} tercatat.`);
      loadData();
    } else {
      setMessage(error.message);
    }
  }

  function startRealtimeAttendance() {
    if (!cameraOn || !faceapi) {
      setMessage("Aktifkan kamera dan model terlebih dahulu.");
      return;
    }
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(async () => {
      const descriptor = await detectDescriptor();
      if (!descriptor) return;
      const candidates = wajah.filter((item) =>
        kelas ? item.siswa?.kelas === kelas : true,
      );
      let best: { siswaId: string; score: number } | null = null;
      for (const item of candidates) {
        for (const stored of normalizeDescriptor(item.descriptor)) {
          const score = distance(descriptor, stored);
          if (!best || score < best.score) best = { siswaId: item.siswa_id, score };
        }
      }
      if (best && best.score < 0.6) {
        const already = presensi.some(
          (row) => row.siswa_id === best?.siswaId && row.tanggal === tanggal,
        );
        if (!already) await markAttendance(best.siswaId, "face_recognition");
      }
    }, 1500);
    setMessage("Presensi wajah berjalan real-time.");
  }

  function setPresetRange(tipe: string) {
    const today = new Date();
    const iso = (date: Date) => date.toISOString().slice(0, 10);
    let from = iso(today);
    let to = iso(today);
    if (tipe === "mingguan") {
      const d = new Date(today); d.setDate(today.getDate() - 6); from = iso(d);
    }
    if (tipe === "bulanan") {
      from = iso(new Date(today.getFullYear(), today.getMonth(), 1));
    }
    if (tipe === "semesteran") {
      from = iso(new Date(today.getFullYear(), today.getMonth() < 6 ? 0 : 6, 1));
    }
    setRange({ from, to, tipe });
  }

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.text("Rekap Presensi SMP Ma'arif NU Sariwangi", 14, 16);
    let y = 28;
    presensi.forEach((row, index) => {
      if (y > 280) { doc.addPage(); y = 18; }
      doc.text(`${index + 1}. ${row.tanggal} - ${row.siswa?.nama_lengkap || "-"} - ${row.status} - ${row.metode}`, 14, y);
      y += 7;
    });
    doc.save("rekap-presensi-smp.pdf");
  }

  function exportCsv() {
    const csv = [["Tanggal", "NIS", "Nama", "Kelas", "Status", "Metode", "Jam Masuk"].join(","), ...presensi.map((row) => [row.tanggal, row.siswa?.nis || "", row.siswa?.nama_lengkap || "", row.siswa?.kelas || "", row.status, row.metode, row.jam_masuk || ""].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "rekap-presensi-smp.csv"; link.click(); URL.revokeObjectURL(link.href);
  }

  const kelasList = Array.from(new Set(siswa.map((item) => item.kelas).filter(Boolean))) as string[];
  const siswaKelas = siswa.filter((item) => (kelas ? item.kelas === kelas : true));
  const presentIds = new Set(presensi.filter((row) => row.tanggal === tanggal).map((row) => row.siswa_id));

  return (
    <ModuleShell title="Presensi Online Face Recognition" description="Enrollment wajah, presensi real-time, fallback manual, rekap dan export.">
      <div className="rounded bg-white p-5 shadow-soft">
        <div className="flex flex-wrap gap-2">
          {(["presensi", "enroll", "rekap"] as const).map((item) => <button key={item} onClick={() => setMode(item)} className={["rounded px-4 py-2 text-sm font-semibold", mode === item ? "bg-emerald-800 text-white" : "border border-gray-200"].join(" ")}>{item === "enroll" ? "Enrollment" : item === "rekap" ? "Rekap" : "Presensi Harian"}</button>)}
        </div>
        <p className="mt-3 text-sm text-gray-600">Model dimuat lazy dari <span className="font-semibold">/models</span>, lalu fallback CDN bila file lokal belum tersedia: face_recognition_model, face_landmark_68_model, ssd_mobilenetv1_model.</p>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </div>

      {mode !== "rekap" ? (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <div className="rounded bg-white p-5 shadow-soft">
            <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded bg-gray-950 object-cover" />
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={startCamera} className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"><Camera className="mr-2" size={17} />Aktifkan Kamera</button>
              <button onClick={stopCamera} className="rounded border px-4 py-2 text-sm font-semibold">Matikan</button>
              {mode === "presensi" ? <button onClick={startRealtimeAttendance} className="rounded bg-green-500 px-4 py-2 text-sm font-semibold text-emerald-950">Mulai Real-time</button> : null}
            </div>
          </div>
          {mode === "enroll" ? (
            <div className="rounded bg-white p-5 shadow-soft">
              <h2 className="text-lg font-semibold">Enrollment Wajah</h2>
              <select value={selectedSiswa} onChange={(e) => setSelectedSiswa(e.target.value)} className={`${inputClass} mt-4 w-full`}><option value="">Pilih siswa</option>{siswa.map((item) => <option key={item.id} value={item.id}>{item.nama_lengkap} ({item.kelas || "-"})</option>)}</select>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={captureSample} className="rounded border px-4 py-2 text-sm font-semibold">Ambil Sample ({samples.length}/5)</button>
                <button onClick={saveEnrollment} className="rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Simpan Descriptor</button>
              </div>
              <DataTable headers={["Siswa", "Kelas", "Status"]} rows={wajah.map((row) => [row.siswa?.nama_lengkap || row.siswa_id, row.siswa?.kelas || "-", row.aktif ? "Aktif" : "Nonaktif"])} />
            </div>
          ) : (
            <div className="rounded bg-white p-5 shadow-soft">
              <h2 className="text-lg font-semibold">Presensi Harian</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={inputClass} />
                <select value={kelas} onChange={(e) => setKelas(e.target.value)} className={inputClass}><option value="">Semua kelas</option>{kelasList.map((item) => <option key={item}>{item}</option>)}</select>
              </div>
              <div className="mt-4 grid max-h-[460px] gap-2 overflow-y-auto">
                {siswaKelas.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 rounded border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="font-semibold">{item.nama_lengkap}</p><p className="text-sm text-gray-600">{item.nis} - {item.kelas || "-"}</p></div>
                    <div className="flex flex-wrap gap-2">
                      <span className={["rounded px-3 py-1 text-sm font-semibold", presentIds.has(item.id) ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"].join(" ")}>{presentIds.has(item.id) ? "Hadir" : "Belum"}</span>
                      <button onClick={() => markAttendance(item.id, "manual", "hadir")} className="rounded border px-3 py-1 text-sm font-semibold">Manual Hadir</button>
                      <button onClick={() => markAttendance(item.id, "manual", "izin")} className="rounded border px-3 py-1 text-sm font-semibold">Izin</button>
                      <button onClick={() => markAttendance(item.id, "manual", "sakit")} className="rounded border px-3 py-1 text-sm font-semibold">Sakit</button>
                      <button onClick={() => markAttendance(item.id, "manual", "alpa")} className="rounded border px-3 py-1 text-sm font-semibold">Alpa</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-5">
          <div className="rounded bg-white p-5 shadow-soft">
            <div className="grid gap-3 md:grid-cols-5">
              <select value={range.tipe} onChange={(e) => setPresetRange(e.target.value)} className={inputClass}><option value="harian">Harian</option><option value="mingguan">Mingguan</option><option value="bulanan">Bulanan</option><option value="semesteran">Semesteran</option><option value="custom">Custom</option></select>
              <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value, tipe: "custom" }))} className={inputClass} />
              <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value, tipe: "custom" }))} className={inputClass} />
              <select value={kelas} onChange={(e) => setKelas(e.target.value)} className={inputClass}><option value="">Semua kelas</option>{kelasList.map((item) => <option key={item}>{item}</option>)}</select>
              <div className="flex gap-2"><button onClick={exportPdf} className="rounded border px-3 py-2 text-sm font-semibold">PDF</button><button onClick={exportCsv} className="rounded border px-3 py-2 text-sm font-semibold">Excel/CSV</button></div>
            </div>
          </div>
          <DataTable headers={["Tanggal", "NIS", "Nama", "Kelas", "Status", "Metode", "Jam Masuk"]} rows={presensi.filter((row) => kelas ? row.siswa?.kelas === kelas : true).map((row) => [row.tanggal, row.siswa?.nis || "-", row.siswa?.nama_lengkap || "-", row.siswa?.kelas || "-", row.status, row.metode, row.jam_masuk ? new Date(row.jam_masuk).toLocaleTimeString("id-ID") : "-"])} />
        </div>
      )}
    </ModuleShell>
  );
}

function SimpleModule({ title }: { title: string }) {
  return <ModuleShell title={title} description="Modul tersedia di dashboard SMP dan siap dikembangkan lebih detail."><div className="rounded bg-white p-5 text-sm text-gray-600 shadow-soft">Belum ada workflow detail pada modul ini.</div></ModuleShell>;
}

export function SmpDataModule({ slug, role }: { slug: string; role: string }) {
  if (slug === "data-siswa") return <DataSiswaModule />;
  if (slug === "data-alumni") return <AlumniModule />;
  if (slug === "data-guru") return <GuruModule />;
  if (slug === "raport-siswa") return <RaportModule role={role} />;
  if (slug === "catatan-pelanggaran") return <PelanggaranModule role={role} />;
  if (slug === "capaian-siswa") return <CapaianModule />;
  if (slug === "presensi-online") return <PresensiModule />;
  if (slug === "manajemen-akun") return <AccountManagementModule entity="smp" />;
  if (slug === "surat-keluar") return <SuratModule />;
  if (slug === "spmb") return <SpmbModule />;
  if (slug === "keuangan-tagihan") return <FinanceModule initialEntity="smp" />;
  if (slug === "konten-landing-page") return <LandingContentAdmin initialEntity="smp" />;
  return <SimpleModule title="Modul SMP" />;
}
