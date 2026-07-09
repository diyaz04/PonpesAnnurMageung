import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  FileUp,
  Mail,
  Pencil,
  Plus,
  QrCode,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  UserCheck,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
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
import {
  notifyError,
  notifySuccess,
  notifyWarning,
  useNotifiedMessage,
} from "../../lib/notify";
import AccountManagementModule from "../admin/AccountManagementModule";
import FinanceModule from "../finance/FinanceModule";
import LandingContentAdmin from "../landing-admin/LandingContentAdmin";
import { supabase } from "../../lib/supabase";
import {
  downloadAllStudentCards,
  downloadStudentBiodata,
  downloadStudentCard,
  type StudentDocumentData,
} from "../../lib/studentDocuments";

type Santri = {
  id: string;
  nis: string;
  kode_unik: string;
  nama_lengkap: string;
  jenis_kelamin: "L" | "P";
  tahun_masuk: number;
  tanggal_masuk: string | null;
  kewarganegaraan: string | null;
  nik: string | null;
  nisn: string | null;
  tempat_lahir: string | null;
  kelas_pengajian: string | null;
  tanggal_lahir: string | null;
  agama: string | null;
  no_handphone: string | null;
  nama_ayah_kandung: string | null;
  status_ayah_kandung: string | null;
  nik_ayah: string | null;
  nama_ibu_kandung: string | null;
  status_ibu_kandung: string | null;
  nik_ibu: string | null;
  status_wali: string | null;
  jenjang: string | null;
  tingkat_kelas: string | null;
  kitas: string | null;
  asal_negara: string | null;
  alamat: string | null;
  nama_wali: string | null;
  no_hp_wali: string | null;
  foto_url: string | null;
  status: "aktif" | "alumni" | "keluar";
};

type Asatidz = {
  id: string;
  user_id: string | null;
  nama_lengkap: string;
  no_hp: string | null;
  foto_url: string | null;
};

type RaportConfig = {
  id: string;
  mata_pelajaran: string;
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
  kelompok: string;
  mata_pelajaran: string;
  kategori: string | null;
  format_nilai: "angka" | "huruf" | "predikat";
  kkm: number | null;
  urutan: number;
};

type RaportPenugasan = {
  id: string;
  periode_id: string;
  mapel_id: string;
  guru_id: string;
  santri_id: string;
  kelompok: string;
  guru?: Pick<Asatidz, "nama_lengkap">;
  mapel?: Pick<RaportMapel, "mata_pelajaran">;
  santri?: Pick<Santri, "nama_lengkap" | "nis" | "tahun_masuk" | "kelas_pengajian">;
};

type RaportNilaiDetail = {
  id: string;
  santri_id: string;
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
  santri_id: string;
  status: "draft" | "published";
  pdf_url: string | null;
  catatan: string | null;
  published_at: string | null;
  santri?: Pick<Santri, "nama_lengkap" | "nis" | "tahun_masuk" | "kelas_pengajian">;
};

type PelanggaranJenis = {
  id: string;
  nama: string;
  bobot_poin: number;
  tingkatan: "ringan" | "sedang" | "berat" | null;
};

type PsbRow = {
  id: string;
  tahun_ajaran: string | null;
  nomor_pendaftaran: string | null;
  nama_lengkap: string;
  jenis_kelamin: string | null;
  tanggal_masuk: string | null;
  kewarganegaraan: string | null;
  nik: string | null;
  nisn: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  agama: string | null;
  no_handphone: string | null;
  nama_ayah_kandung: string | null;
  status_ayah_kandung: string | null;
  nik_ayah: string | null;
  nama_ibu_kandung: string | null;
  status_ibu_kandung: string | null;
  nik_ibu: string | null;
  status_wali: string | null;
  nama_wali: string | null;
  jenjang: string | null;
  tingkat_kelas: string | null;
  kitas: string | null;
  asal_negara: string | null;
  alamat: string | null;
  nama_orang_tua: string | null;
  no_hp: string | null;
  dokumen_url: string | null;
  foto_url: string | null;
  bukti_url: string | null;
  status: "baru" | "diverifikasi" | "diterima" | "ditolak";
  created_at: string;
  updated_at: string | null;
};

type SuratArchive = {
  id: string;
  nomor_surat: string | null;
  jenis_surat: string;
  perihal: string | null;
  ditujukan: string | null;
  tanggal_surat: string;
  file_url: string | null;
  created_at: string;
};

type PerizinanRow = {
  id: string;
  santri_id: string;
  jenis_izin: string;
  tujuan: string | null;
  alasan: string;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  jam_keluar: string | null;
  jam_kembali: string | null;
  waktu_kembali_aktual: string | null;
  penjemput: string | null;
  no_hp_penjemput: string | null;
  penanggung_jawab: string | null;
  status: "diajukan" | "disetujui" | "selesai" | "ditolak" | "dibatalkan";
  catatan: string | null;
  nomor_surat: string | null;
  file_url: string | null;
  created_at: string;
  santri?: Pick<Santri, "nama_lengkap" | "nis" | "kelas_pengajian" | "tahun_masuk" | "nama_wali">;
};

type CapaianKategori = {
  id: string;
  nama_kategori: string;
  deskripsi: string | null;
  aktif: boolean;
  urutan: number;
};

type CapaianField = {
  id: string;
  kategori_id: string;
  field_key: string;
  field_label: string;
  field_type: "text" | "number" | "select" | "toggle" | "textarea";
  field_options: string[] | null;
  wajib: boolean;
  urutan: number;
};

type SignatureMode = "wet" | "digital";

const emptySantri: Partial<Santri> = {
  nama_lengkap: "",
  jenis_kelamin: "L",
  tahun_masuk: new Date().getFullYear(),
  tanggal_masuk: new Date().toISOString().slice(0, 10),
  kewarganegaraan: "Indonesia",
  agama: "Islam",
  kelas_pengajian: "",
  jenjang: "",
  tingkat_kelas: "",
  tanggal_lahir: "",
  tempat_lahir: "",
  alamat: "",
  nama_wali: "",
  no_hp_wali: "",
  status: "aktif",
};

type SantriImportKey =
  | "nis"
  | "kode_unik"
  | "tanggal_masuk"
  | "nama_lengkap"
  | "kewarganegaraan"
  | "nik"
  | "nisn"
  | "jenis_kelamin"
  | "tempat_lahir"
  | "tanggal_lahir"
  | "agama"
  | "no_handphone"
  | "nama_ayah_kandung"
  | "status_ayah_kandung"
  | "nik_ayah"
  | "nama_ibu_kandung"
  | "status_ibu_kandung"
  | "nik_ibu"
  | "status_wali"
  | "nama_wali"
  | "tahun_masuk"
  | "jenjang"
  | "tingkat_kelas"
  | "kelas_pengajian"
  | "kitas"
  | "asal_negara"
  | "alamat"
  | "no_hp_wali"
  | "status";

const santriImportColumns: ExcelColumn<SantriImportKey>[] = [
  { key: "nis", header: "NIS", example: "2526-L-0001" },
  { key: "kode_unik", header: "Kode Unik", example: "ABC12345" },
  { key: "tanggal_masuk", header: "Tanggal Masuk", example: "2026-07-01" },
  { key: "nama_lengkap", header: "Nama Lengkap", required: true, example: "Ahmad Fauzi" },
  { key: "kewarganegaraan", header: "Kewarganegaraan", example: "Indonesia" },
  { key: "nik", header: "NIK", example: "3200000000000001" },
  { key: "nisn", header: "NISN", example: "0123456789" },
  { key: "jenis_kelamin", header: "Jenis Kelamin", required: true, example: "L" },
  { key: "tempat_lahir", header: "Tempat Lahir", example: "Tasikmalaya" },
  { key: "tanggal_lahir", header: "Tanggal Lahir", example: "2012-05-20" },
  { key: "agama", header: "Agama", example: "Islam" },
  { key: "no_handphone", header: "No Handphone", example: "081234567890" },
  { key: "nama_ayah_kandung", header: "Nama Ayah Kandung", example: "Bapak Abdullah" },
  { key: "status_ayah_kandung", header: "Status Ayah Kandung", example: "Kandung" },
  { key: "nik_ayah", header: "NIK Ayah", example: "3200000000000002" },
  { key: "nama_ibu_kandung", header: "Nama Ibu Kandung", example: "Ibu Aminah" },
  { key: "status_ibu_kandung", header: "Status Ibu Kandung", example: "Kandung" },
  { key: "nik_ibu", header: "NIK Ibu", example: "3200000000000003" },
  { key: "status_wali", header: "Status Wali", example: "Orang Tua" },
  { key: "nama_wali", header: "Nama Wali", example: "Bapak Abdullah" },
  { key: "tahun_masuk", header: "Tahun Masuk", required: true, example: "2026" },
  { key: "jenjang", header: "Jenjang", example: "Pesantren" },
  { key: "tingkat_kelas", header: "Tingkat Kelas", example: "Ibtida A" },
  { key: "kelas_pengajian", header: "Kelas Pengajian", example: "Ibtida A" },
  { key: "kitas", header: "KITAS", example: "" },
  { key: "asal_negara", header: "Asal Negara", example: "Indonesia" },
  { key: "alamat", header: "Alamat", example: "Sariwangi, Tasikmalaya" },
  { key: "no_hp_wali", header: "No HP Wali", example: "081234567890" },
  { key: "status", header: "Status", example: "aktif" },
];

const suratTemplates = [
  "Surat Keterangan Aktif / Masih Mondok",
  "Surat Undangan Acara/Kegiatan",
];

const SURAT_CARDS = [
  { id: "aktif", title: "Surat Keterangan Aktif / Masih Mondok", desc: "Keterangan santri masih aktif mondok.", icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: "undangan", title: "Surat Undangan Acara/Kegiatan", desc: "Undangan kegiatan resmi pesantren.", icon: Mail, color: "text-pink-600", bg: "bg-pink-50" },
];

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

function izinStatusLabel(status?: string | null) {
  if (status === "selesai") return "Sudah kembali";
  if (!status) return "-";
  return status.replace(/_/g, " ");
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

function matchesSearch(value: string | null | undefined, query: string) {
  return (value || "").toLowerCase().includes(query.toLowerCase());
}

function kelasPengajianLabel(row: Pick<Santri, "kelas_pengajian">) {
  return row.kelas_pengajian || "Belum diatur";
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

const inputClass =
  "min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700";

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
          Modul Data Pesantren
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-gray-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

async function uploadFile(bucket: string, folder: string, file: File) {
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${Date.now()}-${randomCode(6)}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function imageToDataUrl(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function drawPesantrenKop(doc: any, y = 7) {
  try {
    const kop = await imageToDataUrl("/kop-pesantren.png");
    doc.addImage(kop, "PNG", 15, y, 180, 41);
  } catch {
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("PONDOK PESANTREN AN-NUR", 105, y + 16, { align: "center" });
    doc.setFontSize(10);
    doc.text("Kp. Mageung Ds. Sirnasari Kec. Sariwangi Kab. Tasikmalaya", 105, y + 24, { align: "center" });
    doc.setLineWidth(0.8);
    doc.line(15, y + 36, 195, y + 36);
    doc.setLineWidth(0.25);
    doc.line(15, y + 38, 195, y + 38);
  }
}

function santriToDocumentData(row: Santri): StudentDocumentData {
  return {
    nama: row.nama_lengkap,
    nomorInduk: row.nis,
    nomorIndukLabel: "NIS",
    kodeUnik: row.kode_unik,
    jenisKelamin: row.jenis_kelamin,
    tahunMasuk: row.tahun_masuk,
    tanggalLahir: row.tanggal_lahir,
    alamat: row.alamat,
    namaWali: row.nama_wali,
    noHpWali: row.no_hp_wali,
    fotoUrl: row.foto_url,
    status: row.status,
  };
}

function DataSantriModule() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Santri[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("aktif");
  const [tahunFilter, setTahunFilter] = useState("");
  const [editing, setEditing] = useState<Partial<Santri> | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selectedCard, setSelectedCard] = useState<Santri | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useNotifiedMessage();
  const [importing, setImporting] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);

  async function loadRows() {
    const { data } = await supabase
      .from("pp_santri")
      .select("*")
      .neq("status", "alumni")
      .order("created_at", { ascending: false });
    setRows((data || []) as Santri[]);
  }

  useEffect(() => {
    loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const bySearch =
        matchesSearch(row.nama_lengkap, search) || matchesSearch(row.nis, search);
      const byStatus = statusFilter ? row.status === statusFilter : true;
      const byTahun = tahunFilter ? String(row.tahun_masuk) === tahunFilter : true;
      return bySearch && byStatus && byTahun;
    });
  }, [rows, search, statusFilter, tahunFilter]);
  const filteredIds = useMemo(() => filteredRows.map((row) => row.id), [filteredRows]);
  const selectedRows = useMemo(
    () => filteredRows.filter((row) => selectedIds.includes(row.id)),
    [filteredRows, selectedIds],
  );
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
  const partiallySelected = selectedRows.length > 0 && !allFilteredSelected;

  useEffect(() => {
    setSelectedIds([]);
  }, [search, statusFilter, tahunFilter]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = partiallySelected;
    }
  }, [partiallySelected]);

  const years = Array.from(new Set(rows.map((row) => row.tahun_masuk))).sort(
    (a, b) => b - a,
  );

  async function saveSantri(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing?.nama_lengkap || !editing.jenis_kelamin || !editing.tahun_masuk) {
      setMessage("Nama, jenis kelamin, dan tahun masuk wajib diisi.");
      return;
    }

    let fotoUrl = editing.foto_url || null;
    if (photoFile) {
      fotoUrl = await uploadFile("santri-foto", "santri", photoFile);
    }

    const existingSequence =
      rows.filter(
        (row) =>
          row.tahun_masuk === Number(editing.tahun_masuk) &&
          row.jenis_kelamin === editing.jenis_kelamin,
      ).length + 1;

    const payload = {
      nis:
        editing.nis ||
        buildNis(
          Number(editing.tahun_masuk),
          editing.jenis_kelamin,
          existingSequence,
        ),
      kode_unik: editing.kode_unik || randomCode(),
      nama_lengkap: editing.nama_lengkap,
      jenis_kelamin: editing.jenis_kelamin,
      tahun_masuk: Number(editing.tahun_masuk),
      tanggal_masuk: editing.tanggal_masuk || null,
      kewarganegaraan: editing.kewarganegaraan || null,
      nik: editing.nik || null,
      nisn: editing.nisn || null,
      tempat_lahir: editing.tempat_lahir || null,
      tanggal_lahir: editing.tanggal_lahir || null,
      agama: editing.agama || null,
      no_handphone: editing.no_handphone || null,
      nama_ayah_kandung: editing.nama_ayah_kandung || null,
      status_ayah_kandung: editing.status_ayah_kandung || null,
      nik_ayah: editing.nik_ayah || null,
      nama_ibu_kandung: editing.nama_ibu_kandung || null,
      status_ibu_kandung: editing.status_ibu_kandung || null,
      nik_ibu: editing.nik_ibu || null,
      status_wali: editing.status_wali || null,
      jenjang: editing.jenjang || null,
      tingkat_kelas: editing.tingkat_kelas || null,
      kelas_pengajian: editing.kelas_pengajian || editing.tingkat_kelas || null,
      kitas: editing.kitas || null,
      asal_negara: editing.asal_negara || null,
      alamat: editing.alamat || null,
      nama_wali: editing.nama_wali || null,
      no_hp_wali: editing.no_hp_wali || null,
      foto_url: fotoUrl,
      status: editing.status || "aktif",
    };

    const result = editing.id
      ? await supabase.from("pp_santri").update(payload).eq("id", editing.id)
      : await supabase.from("pp_santri").insert(payload);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setEditing(null);
    setPhotoFile(null);
    setMessage("Data santri tersimpan.");
    loadRows();
  }

  async function downloadSantriTemplate() {
    await downloadExcelTemplate({
      columns: santriImportColumns,
      filename: "template-import-santri-pesantren.xlsx",
      sheetName: "Import Santri",
    });
  }

  async function importSantriExcel(file: File | null) {
    if (!file) return;
    setImporting(true);
    setMessage("");

    try {
      const importedRows = await parseExcelFile(file, santriImportColumns);

      if (!importedRows.length) {
        setMessage("File Excel kosong atau belum berisi data santri.");
        return;
      }

      const errors: string[] = [];
      const nisSet = new Set(rows.map((row) => row.nis));
      const codeSet = new Set(rows.map((row) => row.kode_unik));
      const sequenceByYearGender = new Map<string, number>();

      rows.forEach((row) => {
        const key = `${row.tahun_masuk}-${row.jenis_kelamin}`;
        sequenceByYearGender.set(key, (sequenceByYearGender.get(key) || 0) + 1);
      });

      const payloads = importedRows.map((row, index) => {
        const rowNumber = index + 2;
        const nama = excelCellToText(row.nama_lengkap);
        const jenisKelamin = normalizeGender(row.jenis_kelamin) as Santri["jenis_kelamin"];
        const tahunMasuk = parseExcelNumber(row.tahun_masuk);

        if (!nama) errors.push(`Baris ${rowNumber}: Nama Lengkap wajib diisi.`);
        if (!jenisKelamin) errors.push(`Baris ${rowNumber}: Jenis Kelamin harus L atau P.`);
        if (!tahunMasuk) errors.push(`Baris ${rowNumber}: Tahun Masuk wajib angka.`);

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
        codeSet.add(kodeUnik);

        return {
          nis,
          kode_unik: kodeUnik,
          nama_lengkap: nama,
          jenis_kelamin: jenisKelamin,
          tahun_masuk: Number(tahunMasuk),
          tanggal_masuk: parseExcelDate(row.tanggal_masuk),
          kewarganegaraan: excelCellToText(row.kewarganegaraan) || null,
          nik: excelCellToText(row.nik) || null,
          nisn: excelCellToText(row.nisn) || null,
          tempat_lahir: excelCellToText(row.tempat_lahir) || null,
          tanggal_lahir: parseExcelDate(row.tanggal_lahir),
          agama: excelCellToText(row.agama) || null,
          no_handphone: excelCellToText(row.no_handphone) || null,
          nama_ayah_kandung: excelCellToText(row.nama_ayah_kandung) || null,
          status_ayah_kandung: excelCellToText(row.status_ayah_kandung) || null,
          nik_ayah: excelCellToText(row.nik_ayah) || null,
          nama_ibu_kandung: excelCellToText(row.nama_ibu_kandung) || null,
          status_ibu_kandung: excelCellToText(row.status_ibu_kandung) || null,
          nik_ibu: excelCellToText(row.nik_ibu) || null,
          status_wali: excelCellToText(row.status_wali) || null,
          jenjang: excelCellToText(row.jenjang) || null,
          tingkat_kelas: excelCellToText(row.tingkat_kelas) || null,
          kelas_pengajian: excelCellToText(row.kelas_pengajian) || excelCellToText(row.tingkat_kelas) || null,
          kitas: excelCellToText(row.kitas) || null,
          asal_negara: excelCellToText(row.asal_negara) || null,
          alamat: excelCellToText(row.alamat) || null,
          nama_wali: excelCellToText(row.nama_wali) || null,
          no_hp_wali: excelCellToText(row.no_hp_wali) || null,
          foto_url: null,
          status: normalizeStatus(row.status) as Santri["status"],
        };
      });

      if (errors.length) {
        setMessage(errors.slice(0, 5).join(" "));
        return;
      }

      const { error } = await supabase.from("pp_santri").insert(payloads);
      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(`${payloads.length} data santri berhasil diimport dari Excel.`);
      loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import Excel gagal.");
    } finally {
      setImporting(false);
    }
  }

  async function resetKode(row: Santri) {
    const kodeBaru = randomCode();
    const { error } = await supabase
      .from("pp_santri")
      .update({ kode_unik: kodeBaru })
      .eq("id", row.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await supabase.from("pp_kode_unik_audit").insert({
      santri_id: row.id,
      kode_lama: row.kode_unik,
      kode_baru: kodeBaru,
      pelaku_id: user?.id || null,
    });

    setMessage("Kode unik berhasil direset dan audit tercatat.");
    loadRows();
  }

  async function updateStatus(row: Santri, status: Santri["status"]) {
    const { error } = await supabase
      .from("pp_santri")
      .update({ status })
      .eq("id", row.id);
    setMessage(error ? error.message : `Status ${row.nama_lengkap} diperbarui.`);
    loadRows();
  }

  async function deleteSantri(row: Santri) {
    const { error } = await supabase.from("pp_santri").delete().eq("id", row.id);
    setMessage(error ? error.message : "Data santri dihapus.");
    loadRows();
  }

  async function downloadCard(row: Santri) {
    setGeneratingDocs(true);
    try {
      await downloadStudentCard("pesantren", santriToDocumentData(row));
    } finally {
      setGeneratingDocs(false);
    }
  }

  async function downloadBiodata(row: Santri) {
    setGeneratingDocs(true);
    try {
      await downloadStudentBiodata("pesantren", santriToDocumentData(row));
    } finally {
      setGeneratingDocs(false);
    }
  }

  async function downloadAllCards() {
    setGeneratingDocs(true);
    try {
      await downloadAllStudentCards(
        "pesantren",
        filteredRows.map(santriToDocumentData),
      );
      setMessage(`${filteredRows.length} kartu santri masuk ke file PDF.`);
    } finally {
      setGeneratingDocs(false);
    }
  }

  function toggleSelectAllRows() {
    setSelectedIds(allFilteredSelected ? [] : filteredIds);
  }

  function toggleSelectedRow(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  async function bulkUpdateStatus(status: Santri["status"]) {
    if (!selectedIds.length) return;
    setMessage("");
    const count = selectedIds.length;
    const { error } = await supabase
      .from("pp_santri")
      .update({ status })
      .in("id", selectedIds);

    if (error) {
      notifyError(error.message);
      return;
    }

    notifySuccess(`${count} data santri diubah ke status ${status}.`);
    setSelectedIds([]);
    await loadRows();
  }

  async function bulkDeleteSantri() {
    if (!selectedIds.length) return;
    const count = selectedIds.length;
    const confirmed = window.confirm(`Hapus ${count} data santri terpilih?`);
    if (!confirmed) return;

    setMessage("");
    const { error } = await supabase.from("pp_santri").delete().in("id", selectedIds);
    if (error) {
      notifyError(error.message);
      return;
    }

    notifySuccess(`${count} data santri dihapus.`);
    setSelectedIds([]);
    await loadRows();
  }

  async function downloadSelectedCards() {
    if (!selectedRows.length) return;
    setMessage("");
    setGeneratingDocs(true);
    try {
      await downloadAllStudentCards(
        "pesantren",
        selectedRows.map(santriToDocumentData),
      );
      notifySuccess(`${selectedRows.length} kartu santri terpilih masuk ke file PDF.`);
      setSelectedIds([]);
      await loadRows();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Gagal membuat kartu santri.");
    } finally {
      setGeneratingDocs(false);
    }
  }

  return (
    <ModuleShell
      title="Data Santri"
      description="Kelola biodata santri, wali, foto, status, kode unik, dan kartu santri."
    >
      <div className="rounded bg-white p-5 shadow-soft">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama atau NIS"
              className={`${inputClass} w-full pl-10`}
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={inputClass}
          >
            <option value="">Semua status</option>
            <option value="aktif">Aktif</option>
            <option value="keluar">Keluar</option>
          </select>
          <select
            value={tahunFilter}
            onChange={(event) => setTahunFilter(event.target.value)}
            className={inputClass}
          >
            <option value="">Semua tahun</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setEditing(emptySantri)}
            className="inline-flex items-center justify-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            <Plus className="mr-2" size={17} />
            Tambah
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={downloadSantriTemplate}
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
                importSantriExcel(event.target.files?.[0] || null);
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
        {selectedIds.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded border border-emerald-900/10 bg-emerald-50 p-3">
            <span className="text-sm font-semibold text-emerald-950">
              {selectedIds.length} data dipilih
            </span>
            <button
              type="button"
              onClick={() => bulkUpdateStatus("aktif")}
              className="rounded bg-white px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm hover:bg-emerald-100"
            >
              Set Aktif
            </button>
            <button
              type="button"
              onClick={() => bulkUpdateStatus("keluar")}
              className="rounded bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm hover:bg-amber-50"
            >
              Set Keluar
            </button>
            <button
              type="button"
              onClick={() => bulkUpdateStatus("alumni")}
              className="rounded bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-100"
            >
              Set Alumni
            </button>
            <button
              type="button"
              disabled={generatingDocs}
              onClick={downloadSelectedCards}
              className="inline-flex items-center rounded bg-emerald-800 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Download className="mr-2" size={14} />
              Kartu Terpilih
            </button>
            <button
              type="button"
              onClick={bulkDeleteSantri}
              className="inline-flex items-center rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              <Trash2 className="mr-2" size={14} />
              Hapus Terpilih
            </button>
          </div>
        ) : null}
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </div>

      {editing ? (
        <form onSubmit={saveSantri} className="rounded bg-white p-5 shadow-soft">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Nama lengkap">
              <input
                value={editing.nama_lengkap || ""}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    nama_lengkap: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Jenis kelamin">
              <select
                value={editing.jenis_kelamin || "L"}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    jenis_kelamin: event.target.value as "L" | "P",
                  }))
                }
                className={inputClass}
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </Field>
            <Field label="Tahun masuk">
              <input
                type="number"
                value={editing.tahun_masuk || ""}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    tahun_masuk: Number(event.target.value),
                  }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Tanggal masuk">
              <input
                type="date"
                value={editing.tanggal_masuk || ""}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    tanggal_masuk: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Kelas pengajian">
              <input
                value={editing.kelas_pengajian || ""}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    kelas_pengajian: event.target.value,
                  }))
                }
                placeholder="Contoh: Ibtida A"
                className={inputClass}
              />
            </Field>
            <Field label="Jenjang">
              <input
                value={editing.jenjang || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, jenjang: event.target.value }))
                }
                placeholder="Contoh: Pesantren"
                className={inputClass}
              />
            </Field>
            <Field label="Tingkat kelas">
              <input
                value={editing.tingkat_kelas || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, tingkat_kelas: event.target.value }))
                }
                placeholder="Contoh: Ibtida A"
                className={inputClass}
              />
            </Field>
            <Field label="NIS">
              <input
                value={editing.nis || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, nis: event.target.value }))
                }
                placeholder="Otomatis jika kosong"
                className={inputClass}
              />
            </Field>
            <Field label="NISN">
              <input
                value={editing.nisn || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, nisn: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="NIK">
              <input
                value={editing.nik || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, nik: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Kode unik">
              <input
                value={editing.kode_unik || ""}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    kode_unik: event.target.value,
                  }))
                }
                placeholder="Otomatis jika kosong"
                className={inputClass}
              />
            </Field>
            <Field label="Tempat lahir">
              <input
                value={editing.tempat_lahir || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, tempat_lahir: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Tanggal lahir">
              <input
                type="date"
                value={editing.tanggal_lahir || ""}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    tanggal_lahir: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Agama">
              <input
                value={editing.agama || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, agama: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Kewarganegaraan">
              <input
                value={editing.kewarganegaraan || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, kewarganegaraan: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="No handphone">
              <input
                value={editing.no_handphone || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, no_handphone: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Nama ayah kandung">
              <input
                value={editing.nama_ayah_kandung || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, nama_ayah_kandung: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Status ayah kandung">
              <input
                value={editing.status_ayah_kandung || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, status_ayah_kandung: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="NIK ayah">
              <input
                value={editing.nik_ayah || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, nik_ayah: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Nama ibu kandung">
              <input
                value={editing.nama_ibu_kandung || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, nama_ibu_kandung: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Status ibu kandung">
              <input
                value={editing.status_ibu_kandung || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, status_ibu_kandung: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="NIK ibu">
              <input
                value={editing.nik_ibu || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, nik_ibu: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Status wali">
              <input
                value={editing.status_wali || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, status_wali: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Nama wali">
              <input
                value={editing.nama_wali || ""}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    nama_wali: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="No. HP wali">
              <input
                value={editing.no_hp_wali || ""}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    no_hp_wali: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="KITAS">
              <input
                value={editing.kitas || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, kitas: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Asal negara">
              <input
                value={editing.asal_negara || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, asal_negara: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Status">
              <select
                value={editing.status || "aktif"}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    status: event.target.value as Santri["status"],
                  }))
                }
                className={inputClass}
              >
                <option value="aktif">Aktif</option>
                <option value="alumni">Alumni</option>
                <option value="keluar">Keluar</option>
              </select>
            </Field>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
            <Field label="Alamat">
              <textarea
                value={editing.alamat || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, alamat: event.target.value }))
                }
                rows={3}
                className="rounded border border-gray-200 px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </Field>
            <Field label="Upload foto">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
            >
              <Save className="mr-2" size={17} />
              Simpan
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold"
            >
              Batal
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.12em] text-gray-500">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllRows}
                    aria-label="Pilih semua santri"
                    className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                  />
                </th>
                <th className="px-4 py-3">NIS</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">NIK</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">JK</th>
                <th className="px-4 py-3">Tahun</th>
                <th className="px-4 py-3">Tingkat Kelas</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleSelectedRow(row.id)}
                      aria-label={`Pilih ${row.nama_lengkap}`}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold">{row.nis}</td>
                  <td className="px-4 py-3">{row.nisn || "-"}</td>
                  <td className="px-4 py-3">{row.nik || "-"}</td>
                  <td className="px-4 py-3">{row.nama_lengkap}</td>
                  <td className="px-4 py-3">{row.jenis_kelamin}</td>
                  <td className="px-4 py-3">{row.tahun_masuk}</td>
                  <td className="px-4 py-3">{row.tingkat_kelas || row.kelas_pengajian || "-"}</td>
                  <td className="px-4 py-3 capitalize">{row.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        title="Edit"
                        type="button"
                        onClick={() => setEditing(row)}
                        className="rounded border p-2 text-gray-700"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        title="Kartu"
                        type="button"
                        onClick={() => setSelectedCard(row)}
                        disabled={generatingDocs}
                        className="rounded border p-2 text-gray-700"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        title="Biodata PDF"
                        type="button"
                        onClick={() => downloadBiodata(row)}
                        disabled={generatingDocs}
                        className="rounded border px-2 py-1 text-xs font-semibold text-emerald-800"
                      >
                        Biodata
                      </button>
                      <button
                        title="Reset kode"
                        type="button"
                        onClick={() => resetKode(row)}
                        className="rounded border p-2 text-gray-700"
                      >
                        <RefreshCcw size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(row, "alumni")}
                        className="rounded border px-2 py-1 text-xs font-semibold"
                      >
                        Alumni
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(row, "keluar")}
                        className="rounded border px-2 py-1 text-xs font-semibold"
                      >
                        Keluar
                      </button>
                      <button
                        title="Hapus"
                        type="button"
                        onClick={() => deleteSantri(row)}
                        className="rounded border p-2 text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCard ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded bg-white p-5 shadow-soft">
            <div className="rounded border border-emerald-900/20 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                KARTU SANTRI
              </p>
              <h2 className="mt-1 text-lg font-semibold">{selectedCard.nama_lengkap}</h2>
              <p className="mt-2 text-sm text-gray-600">NIS {selectedCard.nis}</p>
              <p className="text-sm text-gray-600">
                Kelas pengajian {selectedCard.kelas_pengajian || `Angkatan ${selectedCard.tahun_masuk}`}
              </p>
              <div className="mt-4 flex items-end justify-between">
                {selectedCard.foto_url ? (
                  <img
                    src={selectedCard.foto_url}
                    alt={selectedCard.nama_lengkap}
                    className="h-24 w-20 rounded object-cover"
                  />
                ) : (
                  <div className="grid h-24 w-20 place-items-center rounded bg-gray-100 text-xs">
                    Foto
                  </div>
                )}
                <div className="grid h-24 w-24 place-items-center rounded bg-emerald-50 text-center text-xs font-semibold text-emerald-800">
                  Kode Akses
                  <span className="mt-1 block text-[11px] text-emerald-950">
                    {selectedCard.kode_unik}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => downloadCard(selectedCard)}
                className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
              >
                <Download className="mr-2" size={17} />
                Unduh PDF
              </button>
              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="rounded border px-4 py-2 text-sm font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ModuleShell>
  );
}

function AlumniModule() {
  const [rows, setRows] = useState<Santri[]>([]);
  const [search, setSearch] = useState("");
  const [tahunFilter, setTahunFilter] = useState("");
  const [message, setMessage] = useNotifiedMessage();

  async function loadRows() {
    const { data } = await supabase
      .from("pp_santri")
      .select("*")
      .eq("status", "alumni")
      .order("tahun_masuk", { ascending: false });
    setRows((data || []) as Santri[]);
  }

  useEffect(() => {
    loadRows();
  }, []);

  const filteredRows = rows.filter(
    (row) =>
      (matchesSearch(row.nama_lengkap, search) || matchesSearch(row.nis, search)) &&
      (tahunFilter ? String(row.tahun_masuk) === tahunFilter : true),
  );
  const years = Array.from(new Set(rows.map((row) => row.tahun_masuk))).sort(
    (a, b) => b - a,
  );

  async function restore(row: Santri) {
    const { error } = await supabase
      .from("pp_santri")
      .update({ status: "aktif" })
      .eq("id", row.id);
    setMessage(error ? error.message : "Alumni dikembalikan ke status aktif.");
    loadRows();
  }

  return (
    <ModuleShell
      title="Data Alumni"
      description="Kelola santri berstatus alumni dan kembalikan ke status aktif bila diperlukan."
    >
      <div className="rounded bg-white p-5 shadow-soft">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama atau NIS"
            className={inputClass}
          />
          <select
            value={tahunFilter}
            onChange={(event) => setTahunFilter(event.target.value)}
            className={inputClass}
          >
            <option value="">Semua tahun</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </div>
      <DataTable
        headers={["NIS", "Nama", "Tahun Masuk", "Wali", "Aksi"]}
        rows={filteredRows.map((row) => [
          row.nis,
          row.nama_lengkap,
          String(row.tahun_masuk),
          row.nama_wali || "-",
          <button
            key="restore"
            type="button"
            onClick={() => restore(row)}
            className="rounded border px-3 py-2 text-sm font-semibold text-emerald-800"
          >
            Kembalikan Aktif
          </button>,
        ])}
      />
    </ModuleShell>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-hidden rounded bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.12em] text-gray-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3">
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

function AsatidzModule() {
  const [teachers, setTeachers] = useState<Asatidz[]>([]);
  const [santri, setSantri] = useState<Santri[]>([]);
  const [editing, setEditing] = useState<Partial<Asatidz> & { email?: string; password?: string } | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Asatidz | null>(null);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [yearAssign, setYearAssign] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [message, setMessage] = useNotifiedMessage();
  const [savingTeacher, setSavingTeacher] = useState(false);

  async function loadData() {
    const [teacherResult, santriResult] = await Promise.all([
      supabase.from("pp_asatidz").select("*").order("created_at", { ascending: false }),
      supabase
        .from("pp_santri")
        .select("*")
        .eq("status", "aktif")
        .order("nama_lengkap", { ascending: true }),
    ]);
    setTeachers((teacherResult.data || []) as Asatidz[]);
    setSantri((santriResult.data || []) as Santri[]);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing?.nama_lengkap) {
      setMessage("Nama ustadz/ustadzah wajib diisi.");
      return;
    }
    if (!editing.id && (!editing.email || !editing.password)) {
      setMessage("Email akun guru dan password awal wajib diisi.");
      return;
    }

    setSavingTeacher(true);
    try {
      let fotoUrl = editing.foto_url || null;
      if (photoFile) {
        try {
          fotoUrl = await uploadFile("santri-foto", "asatidz", photoFile);
        } catch (error) {
          notifyWarning(
            error instanceof Error
              ? `Foto gagal diupload: ${error.message}. Data tetap disimpan tanpa foto baru.`
              : "Foto gagal diupload. Data tetap disimpan tanpa foto baru.",
          );
        }
      }

      if (!editing.id && editing.email && editing.password) {
        const { data, error } = await supabase.functions.invoke("create-managed-account", {
          body: {
            entitas: "pesantren",
            role: "guru",
            nama: editing.nama_lengkap,
            email: editing.email,
            password: editing.password,
            no_hp: editing.no_hp || "",
          },
        });

        if (error || data?.error) {
          const message = data?.error || error?.message || "Akun guru belum berhasil dibuat.";
          setMessage(message);
          return;
        }

        if (fotoUrl && data?.user_id) {
          const { error: photoUpdateError } = await supabase
            .from("pp_asatidz")
            .update({ foto_url: fotoUrl })
            .eq("user_id", data.user_id);
          if (photoUpdateError) notifyWarning(photoUpdateError.message);
        }

        setEditing(null);
        setPhotoFile(null);
        setMessage("Data asatidz dan akun guru tersimpan.");
        loadData();
        return;
      }

      const payload = {
        user_id: editing.user_id || null,
        nama_lengkap: editing.nama_lengkap,
        no_hp: editing.no_hp || null,
        foto_url: fotoUrl,
      };
      const result = editing.id
        ? await supabase.from("pp_asatidz").update(payload).eq("id", editing.id)
        : await supabase.from("pp_asatidz").insert(payload);

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      setEditing(null);
      setPhotoFile(null);
      setMessage("Data asatidz tersimpan.");
      loadData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Data asatidz belum berhasil disimpan.";
      setMessage(message);
    } finally {
      setSavingTeacher(false);
    }
  }

  async function openAssign(teacher: Asatidz) {
    setSelectedTeacher(teacher);
    const { data } = await supabase
      .from("pp_guru_santri_assign")
      .select("santri_id")
      .eq("guru_id", teacher.id);
    setAssignedIds((data || []).map((row) => row.santri_id));
  }

  async function saveAssignments() {
    if (!selectedTeacher) return;
    await supabase
      .from("pp_guru_santri_assign")
      .delete()
      .eq("guru_id", selectedTeacher.id);
    if (assignedIds.length) {
      await supabase.from("pp_guru_santri_assign").insert(
        assignedIds.map((santriId) => ({
          guru_id: selectedTeacher.id,
          santri_id: santriId,
        })),
      );
    }
    setMessage("Assign santri tersimpan.");
    setSelectedTeacher(null);
  }

  async function deleteTeacher(teacher: Asatidz) {
    const { error } = await supabase.from("pp_asatidz").delete().eq("id", teacher.id);
    setMessage(error ? error.message : "Data asatidz dihapus.");
    loadData();
  }

  function toggleYear(year: string) {
    setYearAssign(year);
    if (!year) return;
    const ids = santri
      .filter((item) => String(item.tahun_masuk) === year)
      .map((item) => item.id);
    setAssignedIds(Array.from(new Set([...assignedIds, ...ids])));
  }

  return (
    <ModuleShell
      title="Data Asatidz"
      description="Kelola ustadz/ustadzah, buat akun guru, dan assign santri binaan."
    >
      <div className="rounded bg-white p-5 shadow-soft">
        <button
          type="button"
          onClick={() => setEditing({ nama_lengkap: "", no_hp: "" })}
          className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="mr-2" size={17} />
          Tambah Asatidz
        </button>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </div>

      {editing ? (
        <form onSubmit={saveTeacher} className="rounded bg-white p-5 shadow-soft">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama lengkap">
              <input
                value={editing.nama_lengkap || ""}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    nama_lengkap: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="No. HP">
              <input
                value={editing.no_hp || ""}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, no_hp: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
            {!editing.id ? (
              <>
                <Field label="Email akun guru">
                  <input
                    type="email"
                    value={editing.email || ""}
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Password awal">
                  <input
                    type="password"
                    value={editing.password || ""}
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </Field>
              </>
            ) : null}
            <Field label="Foto">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={savingTeacher}
              className="rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {savingTeacher ? "Menyimpan..." : "Simpan"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="rounded border px-4 py-2 text-sm font-semibold">
              Batal
            </button>
          </div>
        </form>
      ) : null}

      <DataTable
        headers={["Nama", "No. HP", "Akun", "Aksi"]}
        rows={teachers.map((teacher) => [
          teacher.nama_lengkap,
          teacher.no_hp || "-",
          teacher.user_id ? "Terhubung" : "Belum ada akun",
          <div key="actions" className="flex flex-wrap gap-2">
            <button onClick={() => setEditing(teacher)} className="rounded border px-3 py-2 text-sm font-semibold">
              Edit
            </button>
            <button onClick={() => openAssign(teacher)} className="rounded border px-3 py-2 text-sm font-semibold text-emerald-800">
              Assign Santri
            </button>
            <button onClick={() => deleteTeacher(teacher)} className="rounded border px-3 py-2 text-sm font-semibold text-red-600">
              Hapus
            </button>
          </div>,
        ])}
      />

      {selectedTeacher ? (
        <div className="rounded bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-gray-950">
            Assign Santri - {selectedTeacher.nama_lengkap}
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
            <select value={yearAssign} onChange={(event) => toggleYear(event.target.value)} className={inputClass}>
              <option value="">Tambah berdasarkan tahun</option>
              {Array.from(new Set(santri.map((item) => item.tahun_masuk))).map((year) => (
                <option key={year} value={year}>
                  Angkatan {year}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-600">
              {assignedIds.length} santri dipilih.
            </p>
          </div>
          <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
            {santri.map((item) => (
              <label key={item.id} className="flex items-center gap-2 rounded border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={assignedIds.includes(item.id)}
                  onChange={(event) =>
                    setAssignedIds((current) =>
                      event.target.checked
                        ? [...current, item.id]
                        : current.filter((id) => id !== item.id),
                    )
                  }
                />
                {item.nama_lengkap}
              </label>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={saveAssignments} className="rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
              Simpan Assign
            </button>
            <button onClick={() => setSelectedTeacher(null)} className="rounded border px-4 py-2 text-sm font-semibold">
              Tutup
            </button>
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
  const [teachers, setTeachers] = useState<Asatidz[]>([]);
  const [santri, setSantri] = useState<Santri[]>([]);
  const [assignments, setAssignments] = useState<RaportPenugasan[]>([]);
  const [nilaiRows, setNilaiRows] = useState<RaportNilaiDetail[]>([]);
  const [publishedRows, setPublishedRows] = useState<RaportPublikasi[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<Asatidz | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedKelompok, setSelectedKelompok] = useState("");
  const [selectedSantri, setSelectedSantri] = useState("");
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
    kelompok: "",
    mata_pelajaran: "",
    kategori: "",
    format_nilai: "angka" as RaportMapel["format_nilai"],
    kkm: "",
    urutan: 0,
  });
  const [assignmentForm, setAssignmentForm] = useState({ guru_id: "", kelompok: "", mapel_id: "" });
  const [assignedSantriIds, setAssignedSantriIds] = useState<string[]>([]);
  const [message, setMessage] = useNotifiedMessage();

  async function loadData() {
    const [periodResult, teacherResult, santriResult] = await Promise.all([
      supabase.from("pp_raport_periode").select("*").order("created_at", { ascending: false }),
      supabase.from("pp_asatidz").select("*").order("nama_lengkap"),
      supabase.from("pp_santri").select("*").eq("status", "aktif").order("nama_lengkap"),
    ]);
    const loadedPeriods = (periodResult.data || []) as RaportPeriode[];
    setPeriods(loadedPeriods);
    setTeachers((teacherResult.data || []) as Asatidz[]);
    setSantri((santriResult.data || []) as Santri[]);
    setSelectedPeriod((current) => current || loadedPeriods.find((period) => ["aktif", "terbuka"].includes(period.status))?.id || loadedPeriods[0]?.id || "");
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    async function loadTeacher() {
      if (isAdmin || !user?.id) {
        setCurrentTeacher(null);
        return;
      }
      const { data } = await supabase.from("pp_asatidz").select("*").eq("user_id", user.id).maybeSingle();
      setCurrentTeacher((data || null) as Asatidz | null);
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
        supabase.from("pp_raport_mapel").select("*").eq("periode_id", selectedPeriod).order("kelompok").order("urutan"),
        supabase.from("pp_raport_penugasan").select("*, guru:pp_asatidz(nama_lengkap), mapel:pp_raport_mapel(mata_pelajaran), santri:pp_santri(nama_lengkap,nis,tahun_masuk,kelas_pengajian)").eq("periode_id", selectedPeriod).order("created_at", { ascending: false }),
        supabase.from("pp_raport_nilai_detail").select("*"),
        supabase.from("pp_raport_publikasi").select("*, santri:pp_santri(nama_lengkap,nis,tahun_masuk,kelas_pengajian)").eq("periode_id", selectedPeriod).order("updated_at", { ascending: false }),
      ]);
      setMapel((mapelResult.data || []) as RaportMapel[]);
      setAssignments((assignmentResult.data || []) as RaportPenugasan[]);
      setNilaiRows((nilaiResult.data || []) as RaportNilaiDetail[]);
      setPublishedRows((publishResult.data || []) as RaportPublikasi[]);
    }
    loadPeriodDetails();
  }, [selectedPeriod]);

  useEffect(() => {
    if (!assignmentForm.kelompok || !assignmentForm.mapel_id) {
      setAssignedSantriIds([]);
      return;
    }
    setAssignedSantriIds(
      assignments
        .filter((item) => item.guru_id === assignmentForm.guru_id && item.kelompok === assignmentForm.kelompok && item.mapel_id === assignmentForm.mapel_id)
        .map((item) => item.santri_id),
    );
  }, [assignmentForm.guru_id, assignmentForm.kelompok, assignmentForm.mapel_id, assignments]);

  useEffect(() => {
    if (!selectedSantri) {
      setValues({});
      return;
    }
    const nextValues = nilaiRows
      .filter((row) => row.santri_id === selectedSantri)
      .reduce<Record<string, { nilai: string; predikat: string; deskripsi: string }>>((acc, row) => {
        acc[row.mapel_id] = {
          nilai: row.nilai || "",
          predikat: row.predikat || "",
          deskripsi: row.deskripsi || "",
        };
        return acc;
      }, {});
    setValues(nextValues);
  }, [selectedSantri, nilaiRows]);

  const selectedPeriodRow = periods.find((period) => period.id === selectedPeriod);
  const kelompokList = useMemo(
    () => Array.from(new Set(santri.map((item) => kelasPengajianLabel(item)))).sort(),
    [santri],
  );
  const periodMapel = useMemo(
    () => mapel.filter((item) => (selectedKelompok ? item.kelompok === selectedKelompok : true)),
    [mapel, selectedKelompok],
  );
  const teacherAssignments = useMemo(() => {
    if (isAdmin) return assignments;
    if (!currentTeacher) return [];
    return assignments.filter((item) => item.guru_id === currentTeacher.id);
  }, [assignments, currentTeacher, isAdmin]);
  const assignedSantri = useMemo(() => {
    const ids = new Set(teacherAssignments.map((item) => item.santri_id));
    return santri.filter((item) => ids.has(item.id));
  }, [santri, teacherAssignments]);
  const selected = santri.find((item) => item.id === selectedSantri);
  const inputSantriList = isAdmin ? santri : assignedSantri;
  const inputMapel = useMemo(() => {
    if (!selected) return [];
    const kelompok = kelasPengajianLabel(selected);
    if (isAdmin) return mapel.filter((item) => item.kelompok === kelompok);
    const assignedMapelIds = new Set(teacherAssignments.filter((item) => item.santri_id === selected.id).map((item) => item.mapel_id));
    return mapel.filter((item) => item.kelompok === kelompok && assignedMapelIds.has(item.id));
  }, [isAdmin, mapel, selected, teacherAssignments]);
  const canInput = isAdmin || ["aktif", "terbuka"].includes(selectedPeriodRow?.status || "");

  async function savePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await supabase.from("pp_raport_periode").insert({
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
    const { error } = await supabase.from("pp_raport_periode").update({ status }).eq("id", selectedPeriod);
    setMessage(error ? error.message : `Status periode diubah menjadi ${status}.`);
    loadData();
  }

  async function saveMapel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPeriod) return setMessage("Pilih periode raport dulu.");
    const { error } = await supabase.from("pp_raport_mapel").insert({
      periode_id: selectedPeriod,
      kelompok: mapelForm.kelompok,
      mata_pelajaran: mapelForm.mata_pelajaran,
      kategori: mapelForm.kategori || null,
      format_nilai: mapelForm.format_nilai,
      kkm: mapelForm.kkm ? Number(mapelForm.kkm) : null,
      urutan: Number(mapelForm.urutan || 0),
    });
    setMessage(error ? error.message : "Pelajaran/kitab kelas pengajian tersimpan.");
    if (!error) {
      setMapelForm({ kelompok: mapelForm.kelompok, mata_pelajaran: "", kategori: "", format_nilai: "angka", kkm: "", urutan: mapel.length + 1 });
      const { data } = await supabase.from("pp_raport_mapel").select("*").eq("periode_id", selectedPeriod).order("kelompok").order("urutan");
      setMapel((data || []) as RaportMapel[]);
    }
  }

  async function deleteMapel(row: RaportMapel) {
    if (!confirm(`Hapus ${row.mata_pelajaran} untuk ${row.kelompok}?`)) return;
    const { error } = await supabase.from("pp_raport_mapel").delete().eq("id", row.id);
    setMessage(error ? error.message : "Pelajaran/kitab dihapus.");
    setMapel((current) => current.filter((item) => item.id !== row.id));
  }

  async function saveAssignments() {
    if (!selectedPeriod || !assignmentForm.guru_id || !assignmentForm.kelompok || !assignmentForm.mapel_id) return setMessage("Pilih periode, asatidz, kelas pengajian, dan pelajaran dulu.");
    await supabase.from("pp_raport_penugasan").delete().eq("periode_id", selectedPeriod).eq("guru_id", assignmentForm.guru_id).eq("kelompok", assignmentForm.kelompok).eq("mapel_id", assignmentForm.mapel_id);
    if (assignedSantriIds.length) {
      const { error } = await supabase.from("pp_raport_penugasan").insert(
        assignedSantriIds.map((santriId) => ({
          periode_id: selectedPeriod,
          mapel_id: assignmentForm.mapel_id,
          guru_id: assignmentForm.guru_id,
          santri_id: santriId,
          kelompok: assignmentForm.kelompok,
        })),
      );
      if (error) return setMessage(error.message);
    }
    setMessage("Penugasan asatidz dan santri tersimpan.");
    const { data } = await supabase.from("pp_raport_penugasan").select("*, guru:pp_asatidz(nama_lengkap), mapel:pp_raport_mapel(mata_pelajaran), santri:pp_santri(nama_lengkap,nis,tahun_masuk,kelas_pengajian)").eq("periode_id", selectedPeriod).order("created_at", { ascending: false });
    setAssignments((data || []) as RaportPenugasan[]);
  }

  async function saveNilai() {
    if (!selectedSantri || !selected) return setMessage("Pilih santri dulu.");
    if (!canInput) return setMessage("Periode ini belum dibuka admin untuk pengisian nilai.");
    const payload = inputMapel.map((item) => ({
      santri_id: selectedSantri,
      mapel_id: item.id,
      guru_id: currentTeacher?.id || null,
      nilai: values[item.id]?.nilai || null,
      predikat: values[item.id]?.predikat || null,
      deskripsi: values[item.id]?.deskripsi || null,
    }));
    const { error } = await supabase.from("pp_raport_nilai_detail").upsert(payload, { onConflict: "santri_id,mapel_id" });
    setMessage(error ? error.message : "Nilai raport tersimpan.");
    if (!error) {
      const { data } = await supabase.from("pp_raport_nilai_detail").select("*");
      setNilaiRows((data || []) as RaportNilaiDetail[]);
    }
  }

  async function generateRaportPdf(student: Santri, publish = false) {
    if (!selectedPeriodRow) return setMessage("Pilih periode raport dulu.");
    const kelompok = kelasPengajianLabel(student);
    const studentMapel = mapel.filter((item) => item.kelompok === kelompok);
    const rows = studentMapel.map((item) => ({
      mapel: item,
      nilai: nilaiRows.find((row) => row.santri_id === student.id && row.mapel_id === item.id),
    }));
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF("p", "pt", "a4");
    
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(6, 78, 59);
    doc.rect(0, 0, pageWidth, 60, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("RAPORT SANTRI", pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(12);
    doc.text("PONDOK PESANTREN AN-NUR MAGEUNG", pageWidth / 2, 45, { align: "center" });
    
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Nama: ${student.nama_lengkap}`, 40, 90);
    doc.text(`NIS: ${student.nis}`, 40, 105);
    doc.text(`Kelas Pengajian: ${kelompok}`, 40, 120);
    
    doc.text(`Periode: ${selectedPeriodRow.nama || `${selectedPeriodRow.tahun_ajaran} - ${selectedPeriodRow.semester}`}`, 350, 90);
    doc.text(`Status: ${publish ? "Published" : "Preview"}`, 350, 105);

    const tableBody = rows.map((row, index) => [
      index + 1,
      row.mapel.mata_pelajaran,
      row.nilai?.nilai || "-",
      row.nilai?.predikat || "-",
      row.nilai?.deskripsi || "-",
    ]);

    autoTable(doc, {
      startY: 140,
      head: [["No", "Pelajaran / Kitab", "Nilai", "Predikat", "Deskripsi"]],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [4, 120, 87] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 150 },
        2: { cellWidth: 40, halign: "center" },
        3: { cellWidth: 50, halign: "center" },
        4: { cellWidth: "auto" },
      },
      styles: { fontSize: 10, cellPadding: 6 },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 140;
    
    doc.setFontSize(10);
    doc.text("Wali Asrama / Ustadz", 70, finalY + 40);
    doc.text("Pengasuh Pesantren", 410, finalY + 40);
    doc.text("(_________________)", 65, finalY + 90);
    doc.text("(_________________)", 405, finalY + 90);
    const filename = `raport-${student.nis}-${selectedPeriodRow.tahun_ajaran.replace("/", "-")}-${selectedPeriodRow.semester}.pdf`;
    if (!publish) {
      doc.save(filename);
      return;
    }
    const blob = doc.output("blob");
    const path = `pesantren/${selectedPeriodRow.id}/${student.id}-${Date.now()}.pdf`;
    const upload = await supabase.storage.from("pp-raport-pdf").upload(path, blob, { contentType: "application/pdf", upsert: true });
    if (upload.error) return setMessage(upload.error.message);
    const { error } = await supabase.from("pp_raport_publikasi").upsert({
      periode_id: selectedPeriodRow.id,
      santri_id: student.id,
      status: "published",
      pdf_url: upload.data.path,
      published_by: user?.id || null,
      published_at: new Date().toISOString(),
    }, { onConflict: "periode_id,santri_id" });
    setMessage(error ? error.message : `Raport ${student.nama_lengkap} dipublish.`);
    const { data } = await supabase.from("pp_raport_publikasi").select("*, santri:pp_santri(nama_lengkap,nis,tahun_masuk,kelas_pengajian)").eq("periode_id", selectedPeriodRow.id).order("updated_at", { ascending: false });
    setPublishedRows((data || []) as RaportPublikasi[]);
  }

  function publicPdfUrl(path?: string | null) {
    if (!path) return "";
    return supabase.storage.from("pp-raport-pdf").getPublicUrl(path).data.publicUrl;
  }

  return (
    <ModuleShell
      title="Raport Santri"
      description="Admin mengatur tahun ajaran, semester, pelajaran/kitab per kelas pengajian, penugasan asatidz/santri, lalu guru mengisi raport yang sudah dibuka."
    >
      <div className="rounded bg-white p-5 shadow-soft">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
          <select value={selectedPeriod} onChange={(event) => { setSelectedPeriod(event.target.value); setSelectedSantri(""); }} className={inputClass}>
            <option value="">Pilih tahun ajaran / semester</option>
            {periods.map((period) => <option key={period.id} value={period.id}>{period.nama || `${period.tahun_ajaran} - ${period.semester}`} ({period.status})</option>)}
          </select>
          <select value={selectedKelompok} onChange={(event) => setSelectedKelompok(event.target.value)} className={inputClass}>
            <option value="">Semua kelas pengajian</option>
            {kelompokList.map((kelompok) => <option key={kelompok}>{kelompok}</option>)}
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
              <input value={periodForm.tahun_ajaran} onChange={(event) => setPeriodForm((form) => ({ ...form, tahun_ajaran: event.target.value }))} placeholder="2026/2027" className={inputClass} />
              <select value={periodForm.semester} onChange={(event) => setPeriodForm((form) => ({ ...form, semester: event.target.value }))} className={inputClass}><option>Ganjil</option><option>Genap</option></select>
              <select value={periodForm.status} onChange={(event) => setPeriodForm((form) => ({ ...form, status: event.target.value as RaportPeriode["status"] }))} className={inputClass}><option value="draft">Draft</option><option value="aktif">Aktif</option><option value="terbuka">Terbuka untuk guru</option><option value="ditutup">Ditutup</option></select>
              <input type="date" value={periodForm.tanggal_mulai} onChange={(event) => setPeriodForm((form) => ({ ...form, tanggal_mulai: event.target.value }))} className={inputClass} />
              <input type="date" value={periodForm.tanggal_selesai} onChange={(event) => setPeriodForm((form) => ({ ...form, tanggal_selesai: event.target.value }))} className={inputClass} />
              <input value={periodForm.catatan} onChange={(event) => setPeriodForm((form) => ({ ...form, catatan: event.target.value }))} placeholder="Catatan admin" className={inputClass} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"><Plus className="mr-2" size={17} />Buat Periode</button>
              {(["draft", "aktif", "terbuka", "ditutup", "published"] as RaportPeriode["status"][]).map((status) => (
                <button key={status} type="button" onClick={() => updatePeriodStatus(status)} className="rounded border px-3 py-2 text-sm font-semibold capitalize">{status}</button>
              ))}
            </div>
          </form>

          <form onSubmit={saveMapel} className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">2. Pelajaran / Kitab per Kelas Pengajian</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-6">
              <select value={mapelForm.kelompok} onChange={(event) => setMapelForm((form) => ({ ...form, kelompok: event.target.value }))} className={inputClass}><option value="">Kelas pengajian</option>{kelompokList.map((kelompok) => <option key={kelompok}>{kelompok}</option>)}</select>
              <input value={mapelForm.mata_pelajaran} onChange={(event) => setMapelForm((form) => ({ ...form, mata_pelajaran: event.target.value }))} placeholder="Pelajaran / kitab" className={inputClass} />
              <input value={mapelForm.kategori} onChange={(event) => setMapelForm((form) => ({ ...form, kategori: event.target.value }))} placeholder="Kategori" className={inputClass} />
              <select value={mapelForm.format_nilai} onChange={(event) => setMapelForm((form) => ({ ...form, format_nilai: event.target.value as RaportMapel["format_nilai"] }))} className={inputClass}><option value="angka">Angka</option><option value="huruf">Huruf</option><option value="predikat">Predikat</option></select>
              <input type="number" value={mapelForm.kkm} onChange={(event) => setMapelForm((form) => ({ ...form, kkm: event.target.value }))} placeholder="KKM" className={inputClass} />
              <input type="number" value={mapelForm.urutan} onChange={(event) => setMapelForm((form) => ({ ...form, urutan: Number(event.target.value) }))} placeholder="Urutan" className={inputClass} />
            </div>
            <button className="mt-4 inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"><Save className="mr-2" size={17} />Simpan Pelajaran</button>
          </form>

          <div className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">3. Assign Asatidz & Santri</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <select value={assignmentForm.guru_id} onChange={(event) => setAssignmentForm((form) => ({ ...form, guru_id: event.target.value }))} className={inputClass}><option value="">Pilih asatidz</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.nama_lengkap}</option>)}</select>
              <select value={assignmentForm.kelompok} onChange={(event) => setAssignmentForm((form) => ({ ...form, kelompok: event.target.value, mapel_id: "" }))} className={inputClass}><option value="">Pilih kelas pengajian</option>{kelompokList.map((kelompok) => <option key={kelompok}>{kelompok}</option>)}</select>
              <select value={assignmentForm.mapel_id} onChange={(event) => setAssignmentForm((form) => ({ ...form, mapel_id: event.target.value }))} className={inputClass}><option value="">Pilih pelajaran</option>{mapel.filter((item) => item.kelompok === assignmentForm.kelompok).map((item) => <option key={item.id} value={item.id}>{item.mata_pelajaran}</option>)}</select>
            </div>
            {assignmentForm.kelompok && assignmentForm.mapel_id ? (
              <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto rounded border border-gray-200 p-3 md:grid-cols-2">
                {santri.filter((item) => kelasPengajianLabel(item) === assignmentForm.kelompok).map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={assignedSantriIds.includes(item.id)} onChange={(event) => setAssignedSantriIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
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
        <select value={selectedSantri} onChange={(event) => setSelectedSantri(event.target.value)} className={`${inputClass} mt-4 w-full`}>
          <option value="">Pilih santri</option>
          {inputSantriList.map((item) => <option key={item.id} value={item.id}>{item.nama_lengkap} ({kelasPengajianLabel(item)})</option>)}
        </select>
        {selected ? (
          <div className="mt-5 grid gap-4">
            {inputMapel.length ? inputMapel.map((item) => (
              <div key={item.id} className="grid gap-3 rounded border border-gray-200 p-4 md:grid-cols-[1fr_120px_120px_1.4fr]">
                <div>
                  <p className="font-semibold text-gray-950">{item.mata_pelajaran}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.kelompok} {item.kkm ? `- KKM ${item.kkm}` : ""}</p>
                </div>
                <input value={values[item.id]?.nilai || ""} onChange={(event) => setValues((current) => ({ ...current, [item.id]: { nilai: event.target.value, predikat: current[item.id]?.predikat || "", deskripsi: current[item.id]?.deskripsi || "" } }))} placeholder="Nilai" className={inputClass} disabled={!canInput} />
                <input value={values[item.id]?.predikat || ""} onChange={(event) => setValues((current) => ({ ...current, [item.id]: { nilai: current[item.id]?.nilai || "", predikat: event.target.value, deskripsi: current[item.id]?.deskripsi || "" } }))} placeholder="Predikat" className={inputClass} disabled={!canInput} />
                <textarea value={values[item.id]?.deskripsi || ""} onChange={(event) => setValues((current) => ({ ...current, [item.id]: { nilai: current[item.id]?.nilai || "", predikat: current[item.id]?.predikat || "", deskripsi: event.target.value } }))} placeholder="Deskripsi capaian" rows={2} className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-700" disabled={!canInput} />
              </div>
            )) : <p className="rounded bg-gray-50 p-4 text-sm text-gray-600">Belum ada pelajaran untuk kelas pengajian santri ini.</p>}
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
          <DataTable headers={["Kelas Pengajian", "Pelajaran", "Kategori", "Format", "KKM", "Aksi"]} rows={periodMapel.map((row) => [row.kelompok, row.mata_pelajaran, row.kategori || "-", row.format_nilai, row.kkm ?? "-", <button key="delete" onClick={() => deleteMapel(row)} className="rounded border px-3 py-2 text-xs font-semibold text-red-700">Hapus</button>])} />
          <DataTable headers={["Asatidz", "Pelajaran", "Santri", "Kelas Pengajian"]} rows={assignments.map((row) => [row.guru?.nama_lengkap || "-", row.mapel?.mata_pelajaran || "-", row.santri?.nama_lengkap || "-", row.kelompok])} />
          <DataTable headers={["Santri", "Kelas Pengajian", "Status", "Tanggal Publish", "PDF"]} rows={publishedRows.map((row) => [row.santri?.nama_lengkap || "-", row.santri ? kelasPengajianLabel(row.santri) : "-", row.status, formatDate(row.published_at), row.pdf_url ? <a key="pdf" href={publicPdfUrl(row.pdf_url)} target="_blank" rel="noreferrer" className="font-semibold text-emerald-800">Buka PDF</a> : "-"])} />
        </>
      ) : null}
    </ModuleShell>
  );
}

function PelanggaranModule({ role }: { role: string }) {
  const { user } = useAuth();
  const isAdmin = role === "superadmin" || role === "admin";
  const [santri, setSantri] = useState<Santri[]>([]);
  const [jenis, setJenis] = useState<PelanggaranJenis[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [jenisForm, setJenisForm] = useState<Partial<PelanggaranJenis>>({
    nama: "",
    bobot_poin: 0,
    tingkatan: "ringan",
  });
  const [tingkatan, setTingkatan] = useState<Record<string, string>>({});
  const [recordForm, setRecordForm] = useState({
    santri_id: "",
    jenis_id: "",
    tanggal: new Date().toISOString().slice(0, 10),
    keterangan: "",
  });
  const [message, setMessage] = useNotifiedMessage();

  async function loadData() {
    const [santriResult, jenisResult, recordResult, tingkatResult] = await Promise.all([
      supabase.from("pp_santri").select("*").eq("status", "aktif").order("nama_lengkap"),
      supabase.from("pp_pelanggaran_jenis").select("*").order("nama"),
      supabase
        .from("pp_pelanggaran")
        .select("*, santri:pp_santri(nama_lengkap,nis), jenis:pp_pelanggaran_jenis(nama,bobot_poin,tingkatan)")
        .order("tanggal", { ascending: false })
        .limit(200),
      supabase.from("pp_pelanggaran_tingkatan").select("*"),
    ]);
    setSantri((santriResult.data || []) as Santri[]);
    setJenis((jenisResult.data || []) as PelanggaranJenis[]);
    setRecords(recordResult.data || []);
    setTingkatan(
      (tingkatResult.data || []).reduce<Record<string, string>>((acc, row) => {
        acc[row.tingkatan] = row.tindakan || "";
        return acc;
      }, {}),
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveJenis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await supabase.from("pp_pelanggaran_jenis").insert({
      nama: jenisForm.nama,
      bobot_poin: Number(jenisForm.bobot_poin || 0),
      tingkatan: jenisForm.tingkatan,
    });
    setMessage(error ? error.message : "Kamus pelanggaran tersimpan.");
    setJenisForm({ nama: "", bobot_poin: 0, tingkatan: "ringan" });
    loadData();
  }

  async function saveTingkatan() {
    const payload = Object.entries(tingkatan).map(([key, value]) => ({
      tingkatan: key,
      tindakan: value,
    }));
    const { error } = await supabase
      .from("pp_pelanggaran_tingkatan")
      .upsert(payload, { onConflict: "tingkatan" });
    setMessage(error ? error.message : "Tindakan tingkatan tersimpan.");
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await supabase.from("pp_pelanggaran").insert({
      ...recordForm,
      pencatat_id: user?.id || null,
    });
    setMessage(error ? error.message : "Catatan pelanggaran tersimpan.");
    setRecordForm({
      santri_id: "",
      jenis_id: "",
      tanggal: new Date().toISOString().slice(0, 10),
      keterangan: "",
    });
    loadData();
  }

  const totals = records.reduce<Record<string, number>>((acc, record) => {
    acc[record.santri_id] =
      (acc[record.santri_id] || 0) + Number(record.jenis?.bobot_poin || 0);
    return acc;
  }, {});

  return (
    <ModuleShell
      title="Catatan Pelanggaran"
      description="Konfigurasi pelanggaran, pencatatan, poin akumulasi, dan riwayat."
    >
      {isAdmin ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <form onSubmit={saveJenis} className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Kamus Pelanggaran</h2>
            <div className="mt-4 grid gap-3">
              <input
                value={jenisForm.nama || ""}
                onChange={(event) =>
                  setJenisForm((current) => ({ ...current, nama: event.target.value }))
                }
                placeholder="Nama pelanggaran"
                className={inputClass}
              />
              <input
                type="number"
                value={jenisForm.bobot_poin || 0}
                onChange={(event) =>
                  setJenisForm((current) => ({
                    ...current,
                    bobot_poin: Number(event.target.value),
                  }))
                }
                placeholder="Poin"
                className={inputClass}
              />
              <select
                value={jenisForm.tingkatan || "ringan"}
                onChange={(event) =>
                  setJenisForm((current) => ({
                    ...current,
                    tingkatan: event.target.value as PelanggaranJenis["tingkatan"],
                  }))
                }
                className={inputClass}
              >
                <option value="ringan">Ringan</option>
                <option value="sedang">Sedang</option>
                <option value="berat">Berat</option>
              </select>
            </div>
            <button className="mt-4 rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
              Simpan Jenis
            </button>
          </form>
          <div className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Tingkatan & Tindakan</h2>
            <div className="mt-4 grid gap-3">
              {["ringan", "sedang", "berat"].map((level) => (
                <label key={level} className="grid gap-2 text-sm font-semibold capitalize">
                  {level}
                  <textarea
                    value={tingkatan[level] || ""}
                    onChange={(event) =>
                      setTingkatan((current) => ({
                        ...current,
                        [level]: event.target.value,
                      }))
                    }
                    rows={2}
                    className="rounded border border-gray-200 px-3 py-3 font-normal"
                  />
                </label>
              ))}
            </div>
            <button onClick={saveTingkatan} className="mt-4 rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
              Simpan Tindakan
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={saveRecord} className="rounded bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Pencatatan Pelanggaran</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select value={recordForm.santri_id} onChange={(event) => setRecordForm((form) => ({ ...form, santri_id: event.target.value }))} className={inputClass}>
            <option value="">Pilih santri</option>
            {santri.map((item) => (
              <option key={item.id} value={item.id}>{item.nama_lengkap}</option>
            ))}
          </select>
          <select value={recordForm.jenis_id} onChange={(event) => setRecordForm((form) => ({ ...form, jenis_id: event.target.value }))} className={inputClass}>
            <option value="">Pilih pelanggaran</option>
            {jenis.map((item) => (
              <option key={item.id} value={item.id}>{item.nama} ({item.bobot_poin})</option>
            ))}
          </select>
          <input type="date" value={recordForm.tanggal} onChange={(event) => setRecordForm((form) => ({ ...form, tanggal: event.target.value }))} className={inputClass} />
          <input value={recordForm.keterangan} onChange={(event) => setRecordForm((form) => ({ ...form, keterangan: event.target.value }))} placeholder="Keterangan" className={inputClass} />
        </div>
        <button className="mt-4 rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          Catat Pelanggaran
        </button>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </form>

      <DataTable
        headers={["Tanggal", "Santri", "Pelanggaran", "Poin", "Akumulasi", "Keterangan"]}
        rows={records.map((record) => [
          formatDate(record.tanggal),
          record.santri?.nama_lengkap || "-",
          record.jenis?.nama || "-",
          String(record.jenis?.bobot_poin || 0),
          String(totals[record.santri_id] || 0),
          record.keterangan || "-",
        ])}
      />
    </ModuleShell>
  );
}

function CapaianModule({ role }: { role: string }) {
  const { user } = useAuth();
  const isAdmin = ["superadmin", "admin"].includes(role);
  const [santri, setSantri] = useState<Santri[]>([]);
  const [categories, setCategories] = useState<CapaianKategori[]>([]);
  const [fields, setFields] = useState<CapaianField[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [form, setForm] = useState({
    santri_id: "",
    kategori_id: "",
    data_dinamis: {} as Record<string, string | boolean>,
    progres: "",
  });
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeConfigCategory, setActiveConfigCategory] = useState("");
  const [categoryForm, setCategoryForm] = useState({
    id: "",
    nama_kategori: "",
    deskripsi: "",
    aktif: true,
    urutan: 0,
  });
  const [fieldForm, setFieldForm] = useState({
    id: "",
    field_key: "",
    field_label: "",
    field_type: "text" as CapaianField["field_type"],
    field_options: [] as string[],
    wajib: false,
    urutan: 0,
  });
  const [message, setMessage] = useNotifiedMessage();

  async function loadData() {
    const [santriResult, categoryResult, fieldResult, recordResult, historyResult] = await Promise.all([
      supabase.from("pp_santri").select("*").eq("status", "aktif").order("nama_lengkap"),
      supabase.from("pp_capaian_kategori").select("*").order("urutan").order("created_at"),
      supabase.from("pp_capaian_field").select("*").order("urutan").order("field_label"),
      supabase
        .from("pp_capaian")
        .select("*, santri:pp_santri(nama_lengkap,nis), kategori:pp_capaian_kategori(nama_kategori)")
        .order("updated_at", { ascending: false }),
      supabase
        .from("pp_capaian_riwayat")
        .select("*, santri:pp_santri(nama_lengkap), kategori:pp_capaian_kategori(nama_kategori)")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setSantri((santriResult.data || []) as Santri[]);
    setCategories((categoryResult.data || []) as CapaianKategori[]);
    setFields((fieldResult.data || []) as CapaianField[]);
    setRecords(recordResult.data || []);
    setHistory(historyResult.data || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!categories.length) return;
    const firstActive = categories.find((item) => item.aktif) || categories[0];
    setForm((current) => (current.kategori_id ? current : { ...current, kategori_id: firstActive.id }));
    setActiveConfigCategory((current) => current || firstActive.id);
  }, [categories]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.urutan - b.urutan || a.nama_kategori.localeCompare(b.nama_kategori)),
    [categories],
  );
  const selectedCategory = categories.find((item) => item.id === form.kategori_id);
  const selectedCategoryFields = useMemo(
    () => fields.filter((field) => field.kategori_id === form.kategori_id).sort((a, b) => a.urutan - b.urutan),
    [fields, form.kategori_id],
  );
  const activeConfigFields = useMemo(
    () => fields.filter((field) => field.kategori_id === activeConfigCategory).sort((a, b) => a.urutan - b.urutan),
    [fields, activeConfigCategory],
  );
  const filterFields = useMemo(
    () => fields.filter((field) => field.kategori_id === categoryFilter).sort((a, b) => a.urutan - b.urutan),
    [fields, categoryFilter],
  );
  const filteredRecords = records.filter((record) => (categoryFilter ? record.kategori_id === categoryFilter : true));

  function resetCategoryForm() {
    setCategoryForm({ id: "", nama_kategori: "", deskripsi: "", aktif: true, urutan: sortedCategories.length + 1 });
  }

  function resetFieldForm() {
    setFieldForm({
      id: "",
      field_key: "",
      field_label: "",
      field_type: "text",
      field_options: [],
      wajib: false,
      urutan: activeConfigFields.length + 1,
    });
  }

  function normalizeFieldKey(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function optionList(field: CapaianField) {
    return Array.isArray(field.field_options) ? field.field_options : [];
  }

  function dynamicValue(source: any, field: CapaianField) {
    const value = source?.data_dinamis?.[field.field_key];
    if (typeof value === "boolean") return value ? "Ya" : "Tidak";
    return value === undefined || value === null || value === "" ? "-" : String(value);
  }

  function recordSummary(record: any) {
    const recordFields = fields.filter((field) => field.kategori_id === record.kategori_id).sort((a, b) => a.urutan - b.urutan);
    const summary = recordFields
      .map((field) => {
        const value = dynamicValue(record, field);
        return value === "-" ? "" : `${field.field_label}: ${value}`;
      })
      .filter(Boolean)
      .join(", ");
    return summary || record.detail || "-";
  }

  function setDynamicValue(fieldKey: string, value: string | boolean) {
    setForm((current) => ({
      ...current,
      data_dinamis: {
        ...current.data_dinamis,
        [fieldKey]: value,
      },
    }));
  }

  function renderDynamicField(field: CapaianField, disabled = false) {
    const value = form.data_dinamis[field.field_key];
    const label = `${field.field_label}${field.wajib ? " *" : ""}`;
    if (field.field_type === "textarea") {
      return (
        <label key={field.id} className="grid gap-2 text-sm font-semibold text-gray-700 md:col-span-2">
          {label}
          <textarea
            value={String(value || "")}
            onChange={(event) => setDynamicValue(field.field_key, event.target.value)}
            rows={3}
            disabled={disabled}
            className="rounded border border-gray-200 px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700 disabled:bg-gray-50"
          />
        </label>
      );
    }
    if (field.field_type === "select") {
      return (
        <label key={field.id} className="grid gap-2 text-sm font-semibold text-gray-700">
          {label}
          <select
            value={String(value || "")}
            onChange={(event) => setDynamicValue(field.field_key, event.target.value)}
            disabled={disabled}
            className={inputClass}
          >
            <option value="">Pilih {field.field_label.toLowerCase()}</option>
            {optionList(field).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    }
    if (field.field_type === "toggle") {
      return (
        <label key={field.id} className="flex min-h-11 items-center gap-3 rounded border border-gray-200 px-3 text-sm font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => setDynamicValue(field.field_key, event.target.checked)}
            disabled={disabled}
          />
          {label}
        </label>
      );
    }
    return (
      <label key={field.id} className="grid gap-2 text-sm font-semibold text-gray-700">
        {label}
        <input
          type={field.field_type === "number" ? "number" : "text"}
          value={String(value || "")}
          onChange={(event) => setDynamicValue(field.field_key, event.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      </label>
    );
  }

  async function saveCapaian(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.santri_id) {
      setMessage("Pilih santri terlebih dahulu.");
      return;
    }
    if (!form.kategori_id) {
      setMessage("Pilih kategori capaian terlebih dahulu.");
      return;
    }
    const missingField = selectedCategoryFields.find((field) => {
      if (!field.wajib) return false;
      const value = form.data_dinamis[field.field_key];
      return value === undefined || value === null || value === "";
    });
    if (missingField) {
      setMessage(`${missingField.field_label} wajib diisi.`);
      return;
    }
    const { data: guru } = await supabase
      .from("pp_asatidz")
      .select("id")
      .eq("user_id", user?.id)
      .maybeSingle();
    const summary = selectedCategoryFields
      .map((field) => {
        const value = form.data_dinamis[field.field_key];
        if (value === undefined || value === null || value === "") return "";
        return `${field.field_label}: ${typeof value === "boolean" ? (value ? "Ya" : "Tidak") : value}`;
      })
      .filter(Boolean)
      .join(", ");
    const { error } = await supabase.from("pp_capaian").insert({
      santri_id: form.santri_id,
      kategori_id: form.kategori_id,
      data_dinamis: form.data_dinamis,
      jenis: selectedCategory?.nama_kategori || null,
      detail: summary || null,
      progres: form.progres || null,
      guru_id: guru?.id || null,
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Capaian santri tersimpan.");
    setForm((current) => ({ santri_id: "", kategori_id: current.kategori_id, data_dinamis: {}, progres: "" }));
    loadData();
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return setMessage("Akses konfigurasi hanya untuk admin.");
    if (!categoryForm.nama_kategori.trim()) return setMessage("Nama kategori wajib diisi.");
    const payload = {
      nama_kategori: categoryForm.nama_kategori.trim(),
      deskripsi: categoryForm.deskripsi.trim() || null,
      aktif: categoryForm.aktif,
      urutan: Number(categoryForm.urutan) || 0,
    };
    const result = categoryForm.id
      ? await supabase.from("pp_capaian_kategori").update(payload).eq("id", categoryForm.id)
      : await supabase.from("pp_capaian_kategori").insert(payload);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setMessage(categoryForm.id ? "Kategori capaian diperbarui." : "Kategori capaian ditambahkan.");
    resetCategoryForm();
    loadData();
  }

  async function deleteCategory(category: CapaianKategori) {
    if (!isAdmin) return setMessage("Akses konfigurasi hanya untuk admin.");
    const confirmed = window.confirm(`Hapus kategori "${category.nama_kategori}" beserta field-nya? Data capaian lama tetap tersimpan tanpa kategori.`);
    if (!confirmed) return;
    const { error } = await supabase.from("pp_capaian_kategori").delete().eq("id", category.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Kategori capaian dihapus.");
    if (activeConfigCategory === category.id) setActiveConfigCategory("");
    if (form.kategori_id === category.id) setForm((current) => ({ ...current, kategori_id: "", data_dinamis: {} }));
    loadData();
  }

  async function saveField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return setMessage("Akses konfigurasi hanya untuk admin.");
    if (!activeConfigCategory) return setMessage("Pilih kategori untuk field.");
    const fieldKey = normalizeFieldKey(fieldForm.field_key || fieldForm.field_label);
    if (!fieldKey || !fieldForm.field_label.trim()) return setMessage("Key dan label field wajib diisi.");
    const options = fieldForm.field_type === "select"
      ? fieldForm.field_options.map((option) => option.trim()).filter(Boolean)
      : [];
    if (fieldForm.field_type === "select" && !options.length) return setMessage("Field select wajib punya minimal satu opsi.");
    const payload = {
      kategori_id: activeConfigCategory,
      field_key: fieldKey,
      field_label: fieldForm.field_label.trim(),
      field_type: fieldForm.field_type,
      field_options: fieldForm.field_type === "select" ? options : null,
      wajib: fieldForm.wajib,
      urutan: Number(fieldForm.urutan) || 0,
    };
    const result = fieldForm.id
      ? await supabase.from("pp_capaian_field").update(payload).eq("id", fieldForm.id)
      : await supabase.from("pp_capaian_field").insert(payload);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setMessage(fieldForm.id ? "Field capaian diperbarui." : "Field capaian ditambahkan.");
    resetFieldForm();
    loadData();
  }

  async function deleteField(field: CapaianField) {
    if (!isAdmin) return setMessage("Akses konfigurasi hanya untuk admin.");
    const confirmed = window.confirm(`Hapus field "${field.field_label}"? Data lama pada field ini tetap ada di arsip JSON.`);
    if (!confirmed) return;
    const { error } = await supabase.from("pp_capaian_field").delete().eq("id", field.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Field capaian dihapus.");
    loadData();
  }

  async function moveField(field: CapaianField, direction: -1 | 1) {
    const currentIndex = activeConfigFields.findIndex((item) => item.id === field.id);
    const target = activeConfigFields[currentIndex + direction];
    if (!target) return;
    const [currentResult, targetResult] = await Promise.all([
      supabase.from("pp_capaian_field").update({ urutan: target.urutan }).eq("id", field.id),
      supabase.from("pp_capaian_field").update({ urutan: field.urutan }).eq("id", target.id),
    ]);
    const error = currentResult.error || targetResult.error;
    setMessage(error ? error.message : "Urutan field diperbarui.");
    if (!error) loadData();
  }

  const categoryTableRows = sortedCategories.map((category) => [
    category.nama_kategori,
    category.aktif ? "Aktif" : "Nonaktif",
    category.urutan,
    category.deskripsi || "-",
    <div key={category.id} className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => {
          setCategoryForm({
            id: category.id,
            nama_kategori: category.nama_kategori,
            deskripsi: category.deskripsi || "",
            aktif: category.aktif,
            urutan: category.urutan,
          });
          setActiveConfigCategory(category.id);
        }}
        className="inline-flex items-center rounded border px-3 py-2 text-xs font-semibold"
      >
        <Pencil className="mr-1" size={14} />
        Edit
      </button>
      <button
        type="button"
        onClick={() => deleteCategory(category)}
        className="inline-flex items-center rounded border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"
      >
        <Trash2 className="mr-1" size={14} />
        Hapus
      </button>
    </div>,
  ]);

  return (
    <ModuleShell
      title="Capaian Santri"
      description="Catat capaian santri dengan kategori dan field yang bisa dikonfigurasi admin."
    >
      {isAdmin ? (
        <div className="grid gap-5 rounded bg-white p-5 shadow-soft">
          <div>
            <h2 className="text-lg font-semibold">Konfigurasi Kategori & Field</h2>
            <p className="mt-1 text-sm text-gray-600">
              Admin dapat membuat kategori capaian, menyusun field isian, mengatur opsi select, dan melihat preview form.
            </p>
          </div>

          <form onSubmit={saveCategory} className="grid gap-3 rounded border border-gray-100 p-4 md:grid-cols-4">
            <input
              value={categoryForm.nama_kategori}
              onChange={(event) => setCategoryForm((current) => ({ ...current, nama_kategori: event.target.value }))}
              placeholder="Nama kategori"
              className={inputClass}
            />
            <input
              value={categoryForm.deskripsi}
              onChange={(event) => setCategoryForm((current) => ({ ...current, deskripsi: event.target.value }))}
              placeholder="Deskripsi singkat"
              className={inputClass}
            />
            <input
              type="number"
              value={categoryForm.urutan}
              onChange={(event) => setCategoryForm((current) => ({ ...current, urutan: Number(event.target.value) }))}
              placeholder="Urutan"
              className={inputClass}
            />
            <label className="flex min-h-11 items-center gap-3 rounded border border-gray-200 px-3 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={categoryForm.aktif}
                onChange={(event) => setCategoryForm((current) => ({ ...current, aktif: event.target.checked }))}
              />
              Aktif
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-4">
              <button type="submit" className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                <Save className="mr-2" size={17} />
                {categoryForm.id ? "Update Kategori" : "Tambah Kategori"}
              </button>
              <button type="button" onClick={resetCategoryForm} className="rounded border px-4 py-2 text-sm font-semibold">
                Reset
              </button>
            </div>
          </form>

          <DataTable headers={["Kategori", "Status", "Urutan", "Deskripsi", "Aksi"]} rows={categoryTableRows} />

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <form onSubmit={saveField} className="rounded border border-gray-100 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={activeConfigCategory}
                  onChange={(event) => {
                    setActiveConfigCategory(event.target.value);
                    resetFieldForm();
                  }}
                  className={inputClass}
                >
                  <option value="">Pilih kategori</option>
                  {sortedCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.nama_kategori}
                    </option>
                  ))}
                </select>
                <select
                  value={fieldForm.field_type}
                  onChange={(event) =>
                    setFieldForm((current) => ({
                      ...current,
                      field_type: event.target.value as CapaianField["field_type"],
                      field_options: event.target.value === "select" && !current.field_options.length ? [""] : current.field_options,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="toggle">Toggle</option>
                  <option value="textarea">Textarea</option>
                </select>
                <input
                  value={fieldForm.field_label}
                  onChange={(event) =>
                    setFieldForm((current) => ({
                      ...current,
                      field_label: event.target.value,
                      field_key: current.id ? current.field_key : normalizeFieldKey(event.target.value),
                    }))
                  }
                  placeholder="Label field, contoh Surat"
                  className={inputClass}
                />
                <input
                  value={fieldForm.field_key}
                  onChange={(event) => setFieldForm((current) => ({ ...current, field_key: normalizeFieldKey(event.target.value) }))}
                  placeholder="Key field, contoh surat"
                  className={inputClass}
                />
                <input
                  type="number"
                  value={fieldForm.urutan}
                  onChange={(event) => setFieldForm((current) => ({ ...current, urutan: Number(event.target.value) }))}
                  placeholder="Urutan"
                  className={inputClass}
                />
                <label className="flex min-h-11 items-center gap-3 rounded border border-gray-200 px-3 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={fieldForm.wajib}
                    onChange={(event) => setFieldForm((current) => ({ ...current, wajib: event.target.checked }))}
                  />
                  Wajib diisi
                </label>
              </div>

              {fieldForm.field_type === "select" ? (
                <div className="mt-3 rounded bg-gray-50 p-3">
                  <p className="text-sm font-semibold text-gray-700">Opsi select</p>
                  <div className="mt-2 grid gap-2">
                    {fieldForm.field_options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          value={option}
                          onChange={(event) =>
                            setFieldForm((current) => ({
                              ...current,
                              field_options: current.field_options.map((item, itemIndex) =>
                                itemIndex === index ? event.target.value : item,
                              ),
                            }))
                          }
                          placeholder={`Opsi ${index + 1}`}
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFieldForm((current) => ({
                              ...current,
                              field_options: current.field_options.filter((_, itemIndex) => itemIndex !== index),
                            }))
                          }
                          className="rounded border border-red-200 px-3 text-sm font-semibold text-red-700"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFieldForm((current) => ({ ...current, field_options: [...current.field_options, ""] }))}
                      className="inline-flex w-fit items-center rounded border px-3 py-2 text-sm font-semibold"
                    >
                      <Plus className="mr-2" size={15} />
                      Tambah Opsi
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="submit" className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                  <Save className="mr-2" size={17} />
                  {fieldForm.id ? "Update Field" : "Tambah Field"}
                </button>
                <button type="button" onClick={resetFieldForm} className="rounded border px-4 py-2 text-sm font-semibold">
                  Reset Field
                </button>
              </div>
            </form>

            <div className="rounded border border-gray-100 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Preview Field</h3>
              <div className="mt-3 grid gap-3">
                {activeConfigFields.length ? activeConfigFields.map((field, index) => (
                  <div key={field.id} className="rounded bg-gray-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{field.field_label}</p>
                        <p className="text-xs text-gray-500">
                          {field.field_key} - {field.field_type}{field.wajib ? " - wajib" : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => moveField(field, -1)} disabled={index === 0} className="rounded border px-2 py-1 text-xs disabled:opacity-40">
                          Naik
                        </button>
                        <button type="button" onClick={() => moveField(field, 1)} disabled={index === activeConfigFields.length - 1} className="rounded border px-2 py-1 text-xs disabled:opacity-40">
                          Turun
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFieldForm({
                              id: field.id,
                              field_key: field.field_key,
                              field_label: field.field_label,
                              field_type: field.field_type,
                              field_options: optionList(field),
                              wajib: field.wajib,
                              urutan: field.urutan,
                            })
                          }
                          className="rounded border px-2 py-1 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteField(field)} className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                )) : <p className="text-sm text-gray-500">Belum ada field pada kategori ini.</p>}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={saveCapaian} className="rounded bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Input Capaian</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Santri
            <select value={form.santri_id} onChange={(event) => setForm((current) => ({ ...current, santri_id: event.target.value }))} className={inputClass}>
              <option value="">Pilih santri</option>
              {santri.map((item) => (
                <option key={item.id} value={item.id}>{item.nama_lengkap}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Kategori Capaian
            <select
              value={form.kategori_id}
              onChange={(event) => setForm((current) => ({ ...current, kategori_id: event.target.value, data_dinamis: {} }))}
              className={inputClass}
            >
              <option value="">Pilih kategori</option>
              {sortedCategories.filter((category) => category.aktif).map((category) => (
                <option key={category.id} value={category.id}>{category.nama_kategori}</option>
              ))}
            </select>
          </label>
          {selectedCategoryFields.map((field) => renderDynamicField(field))}
          <label className="grid gap-2 text-sm font-semibold text-gray-700 md:col-span-2">
            Catatan progres
            <input
              value={form.progres}
              onChange={(event) => setForm((current) => ({ ...current, progres: event.target.value }))}
              placeholder="Catatan tambahan, contoh lancar, perlu murojaah, atau target berikutnya"
              className={inputClass}
            />
          </label>
          {form.kategori_id && !selectedCategoryFields.length ? (
            <p className="rounded bg-amber-50 p-3 text-sm font-medium text-amber-800 md:col-span-2">
              Kategori ini belum punya field isian. Admin perlu menambahkan field di konfigurasi.
            </p>
          ) : null}
        </div>
        <button className="mt-4 rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          Simpan Capaian
        </button>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </form>

      <div className="rounded bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Data Capaian</h2>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={inputClass}>
            <option value="">Semua kategori</option>
            {sortedCategories.map((category) => (
              <option key={category.id} value={category.id}>{category.nama_kategori}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        headers={
          categoryFilter && filterFields.length
            ? ["Santri", "Kategori", ...filterFields.map((field) => field.field_label), "Progres", "Update"]
            : ["Santri", "Kategori", "Ringkasan", "Progres", "Update"]
        }
        rows={filteredRecords.map((record) =>
          categoryFilter && filterFields.length
            ? [
                record.santri?.nama_lengkap || "-",
                record.kategori?.nama_kategori || record.jenis || "-",
                ...filterFields.map((field) => dynamicValue(record, field)),
                record.progres || "-",
                formatDate(record.updated_at),
              ]
            : [
                record.santri?.nama_lengkap || "-",
                record.kategori?.nama_kategori || record.jenis || "-",
                recordSummary(record),
                record.progres || "-",
                formatDate(record.updated_at),
              ],
        )}
      />

      <div className="rounded bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Riwayat Perubahan</h2>
        <div className="mt-4 grid gap-2">
          {history.map((item) => (
            <div key={item.id} className="rounded bg-gray-50 p-3 text-sm">
              <span className="font-semibold">{item.santri?.nama_lengkap || "-"}</span>{" "}
              {item.aksi} {item.kategori?.nama_kategori || item.jenis || "Capaian"} - {recordSummary(item)} ({item.progres || "-"})
            </div>
          ))}
          {!history.length ? <p className="text-sm text-gray-500">Belum ada riwayat perubahan.</p> : null}
        </div>
      </div>
    </ModuleShell>
  );
}

function PerizinanModule({ role }: { role: string }) {
  const { user } = useAuth();
  const isStaff = ["superadmin", "admin", "guru"].includes(role);
  const [santri, setSantri] = useState<Santri[]>([]);
  const [records, setRecords] = useState<PerizinanRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<PerizinanRow | null>(null);
  const [form, setForm] = useState({
    santri_id: "",
    jenis_izin: "Pulang",
    tujuan: "",
    alasan: "",
    tanggal_mulai: new Date().toISOString().slice(0, 10),
    tanggal_selesai: new Date().toISOString().slice(0, 10),
    jam_keluar: "",
    jam_kembali: "",
    penjemput: "",
    no_hp_penjemput: "",
    penanggung_jawab: "",
    catatan: "",
    nomor_surat: "",
  });
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("wet");
  const [signer, setSigner] = useState({
    nama: "",
    jabatan: "Pimpinan Pesantren",
  });
  const [message, setMessage] = useNotifiedMessage();

  async function loadData() {
    const [santriResult, izinResult] = await Promise.all([
      supabase.from("pp_santri").select("*").eq("status", "aktif").order("nama_lengkap"),
      supabase
        .from("pp_perizinan")
        .select("*, santri:pp_santri(nama_lengkap,nis,kelas_pengajian,tahun_masuk,nama_wali)")
        .order("tanggal_mulai", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setSantri((santriResult.data || []) as Santri[]);
    setRecords((izinResult.data || []) as PerizinanRow[]);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedSantri = santri.find((item) => item.id === form.santri_id);
  const filteredRecords = records.filter((row) => statusFilter ? row.status === statusFilter : true);

  function buildNomorSurat() {
    if (form.nomor_surat.trim()) return form.nomor_surat.trim();
    const date = new Date(form.tanggal_mulai || new Date());
    return `IZIN/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}/${randomCode(4)}`;
  }

  async function generatePdfBlob(nomorSurat: string, validationUrl: string) {
    const { jsPDF } = await import("jspdf");
    const QRCode = await import("qrcode");
    const doc = new jsPDF();
    const qrDataUrl =
      signatureMode === "digital"
        ? await QRCode.toDataURL(validationUrl, {
            margin: 1,
            width: 240,
            color: { dark: "#064e3b", light: "#ffffff" },
          })
        : null;
    const value = (text?: string | null) => text || "-";
    const tanggalIzin = `${formatDate(form.tanggal_mulai)} s.d. ${formatDate(form.tanggal_selesai)}`;

    await drawPesantrenKop(doc, 8);

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text(`SURAT IZIN ${form.jenis_izin.toUpperCase()}`, 105, 59, { align: "center" });
    const titleWidth = doc.getTextWidth(`SURAT IZIN ${form.jenis_izin.toUpperCase()}`);
    doc.line(105 - titleWidth / 2, 60.5, 105 + titleWidth / 2, 60.5);
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(`Nomor : ${nomorSurat}`, 105, 68, { align: "center" });

    doc.setFontSize(11);
    const intro = doc.splitTextToSize(
      "Yang bertanda tangan di bawah ini menerangkan bahwa santri berikut telah mendapatkan izin resmi dari Pondok Pesantren An-Nur.",
      170,
    );
    doc.text(intro, 20, 82);

    const drawRow = (label: string, text: string, x: number, y: number, labelWidth = 42, maxWidth = 122) => {
      doc.setFont("times", "normal");
      doc.text(label, x, y);
      doc.text(":", x + labelWidth, y);
      doc.text(doc.splitTextToSize(text || "-", maxWidth), x + labelWidth + 5, y);
    };

    doc.setFont("times", "bold");
    doc.text("Data Santri", 20, 104);
    doc.setFont("times", "normal");
    drawRow("Nama", value(selectedSantri?.nama_lengkap), 25, 114);
    drawRow("NIS", value(selectedSantri?.nis), 25, 122);
    drawRow("Kelas Pengajian", selectedSantri ? kelasPengajianLabel(selectedSantri) : "-", 25, 130);
    drawRow("Nama Wali", value(selectedSantri?.nama_wali), 25, 138);

    doc.setFont("times", "bold");
    doc.text("Detail Izin", 20, 154);
    doc.setFont("times", "normal");
    drawRow("Jenis Izin", value(form.jenis_izin), 25, 164);
    drawRow("Tujuan", value(form.tujuan), 25, 172);
    drawRow("Alasan", value(form.alasan), 25, 180);
    drawRow("Tanggal", tanggalIzin, 25, 188);
    drawRow("Jam Keluar", value(form.jam_keluar), 25, 196);
    drawRow("Perkiraan Kembali", value(form.jam_kembali), 25, 204);
    drawRow("Pendamping", value(form.penjemput), 25, 212);
    drawRow("No. HP", value(form.no_hp_penjemput), 25, 220);

    const noteLines = doc.splitTextToSize(
      `Surat ini dibuat sebagai bukti bahwa santri yang bersangkutan telah mendapatkan izin. ${
        form.catatan ? `Catatan: ${form.catatan}` : ""
      }`,
      170,
    );
    doc.text(noteLines, 20, 238);

    const signX = 125;
    const signY = 254;
    doc.text(`Sariwangi, ${formatDate(form.tanggal_mulai)}`, signX, signY);
    doc.text(signer.jabatan || "Pimpinan Pesantren", signX, signY + 8);
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", signX, signY + 13, 23, 23);
      doc.setFontSize(6.8);
      doc.text("Tanda tangan digital", signX + 28, signY + 18);
      doc.text("Scan QR untuk validasi", signX + 28, signY + 22);
      doc.setFontSize(5.2);
      doc.text(doc.splitTextToSize(validationUrl, 48).slice(0, 2), signX + 28, signY + 26);
      doc.setFont("times", "bold");
      doc.setFontSize(10.5);
      doc.text(signer.nama || "(________________)", signX + 28, signY + 39);
      const nameWidth = doc.getTextWidth(signer.nama || "(________________)");
      doc.line(signX + 28, signY + 40, signX + 28 + nameWidth, signY + 40);
    } else {
      doc.setFont("times", "bold");
      doc.text(signer.nama || "(________________)", signX, signY + 38);
      const nameWidth = doc.getTextWidth(signer.nama || "(________________)");
      doc.line(signX, signY + 39, signX + nameWidth, signY + 39);
    }

    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text(
      signatureMode === "digital"
        ? "QR pada tanda tangan berisi tautan validasi keabsahan surat."
        : "Surat ini dapat ditandatangani basah setelah dicetak.",
      20,
      282,
    );
    return { doc, blob: doc.output("blob") };
  }

  async function savePermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!isStaff) return setMessage("Akses tidak tersedia.");
    if (!form.santri_id || !form.alasan.trim() || !form.tanggal_mulai) {
      setMessage("Pilih santri, isi alasan, dan tanggal izin.");
      return;
    }
    const izinId = crypto.randomUUID();
    const nomorSurat = buildNomorSurat();
    const validationUrl = `${window.location.origin}/validasi-izin/${izinId}`;
    const { doc, blob } = await generatePdfBlob(nomorSurat, validationUrl);
    const path = `pesantren/${form.santri_id}/${Date.now()}-${randomCode(6)}.pdf`;
    const upload = await supabase.storage.from("pp-perizinan-pdf").upload(path, blob, {
      contentType: "application/pdf",
    });
    if (upload.error) {
      setMessage(upload.error.message);
      return;
    }
    const { error } = await supabase.from("pp_perizinan").insert({
      id: izinId,
      santri_id: form.santri_id,
      jenis_izin: form.jenis_izin,
      tujuan: form.tujuan || null,
      alasan: form.alasan,
      tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai: form.tanggal_selesai || null,
      jam_keluar: form.jam_keluar || null,
      jam_kembali: form.jam_kembali || null,
      penjemput: form.penjemput || null,
      no_hp_penjemput: form.no_hp_penjemput || null,
      penanggung_jawab: form.penanggung_jawab || null,
      status: "disetujui",
      catatan: form.catatan || null,
      nomor_surat: nomorSurat,
      file_url: upload.data.path,
      dibuat_oleh: user?.id || null,
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    doc.save(`${nomorSurat.replace(/\//g, "-")}.pdf`);
    setForm({
      santri_id: "",
      jenis_izin: "Pulang",
      tujuan: "",
      alasan: "",
      tanggal_mulai: new Date().toISOString().slice(0, 10),
      tanggal_selesai: new Date().toISOString().slice(0, 10),
      jam_keluar: "",
      jam_kembali: "",
      penjemput: "",
      no_hp_penjemput: "",
      penanggung_jawab: "",
      catatan: "",
      nomor_surat: "",
    });
    setMessage("Izin santri tersimpan dan surat izin berhasil dibuat.");
    loadData();
  }

  async function updateStatus(row: PerizinanRow, status: PerizinanRow["status"]) {
    const payload =
      status === "selesai"
        ? { status, waktu_kembali_aktual: new Date().toISOString() }
        : { status, waktu_kembali_aktual: row.waktu_kembali_aktual };
    const { error } = await supabase.from("pp_perizinan").update(payload).eq("id", row.id);
    setMessage(error ? error.message : status === "selesai" ? "Santri ditandai sudah kembali." : "Status perizinan diperbarui.");
    loadData();
  }

  function publicPdfUrl(path?: string | null) {
    if (!path) return "";
    return supabase.storage.from("pp-perizinan-pdf").getPublicUrl(path).data.publicUrl;
  }

  return (
    <ModuleShell
      title="Perizinan Santri"
      description="Catat izin pulang/keluar santri, generate surat bukti izin, dan tampilkan lognya di record santri."
    >
      <form onSubmit={savePermission} className="rounded bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Catat Izin & Generate Surat</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select value={form.santri_id} onChange={(event) => setForm((current) => ({ ...current, santri_id: event.target.value }))} className={inputClass}>
            <option value="">Pilih santri</option>
            {santri.map((item) => <option key={item.id} value={item.id}>{item.nama_lengkap} ({kelasPengajianLabel(item)})</option>)}
          </select>
          <select value={form.jenis_izin} onChange={(event) => setForm((current) => ({ ...current, jenis_izin: event.target.value }))} className={inputClass}>
            <option value="Pulang">Pulang</option>
            <option value="Keluar Pesantren">Keluar Pesantren</option>
            <option value="Berobat">Berobat</option>
            <option value="Kegiatan Keluarga">Kegiatan Keluarga</option>
            <option value="Lainnya">Lainnya</option>
          </select>
          <input value={form.nomor_surat} onChange={(event) => setForm((current) => ({ ...current, nomor_surat: event.target.value }))} placeholder="Nomor surat otomatis jika kosong" className={inputClass} />
          <input value={form.tujuan} onChange={(event) => setForm((current) => ({ ...current, tujuan: event.target.value }))} placeholder="Tujuan" className={inputClass} />
          <input value={form.alasan} onChange={(event) => setForm((current) => ({ ...current, alasan: event.target.value }))} placeholder="Alasan izin" className={inputClass} />
          <input value={form.penjemput} onChange={(event) => setForm((current) => ({ ...current, penjemput: event.target.value }))} placeholder="Penjemput/pendamping" className={inputClass} />
          <input value={form.no_hp_penjemput} onChange={(event) => setForm((current) => ({ ...current, no_hp_penjemput: event.target.value }))} placeholder="No HP penjemput" className={inputClass} />
          <input value={form.penanggung_jawab} onChange={(event) => setForm((current) => ({ ...current, penanggung_jawab: event.target.value }))} placeholder="Penanggung jawab/petugas" className={inputClass} />
          <input type="date" value={form.tanggal_mulai} onChange={(event) => setForm((current) => ({ ...current, tanggal_mulai: event.target.value }))} className={inputClass} />
          <input type="date" value={form.tanggal_selesai} onChange={(event) => setForm((current) => ({ ...current, tanggal_selesai: event.target.value }))} className={inputClass} />
          <input type="time" value={form.jam_keluar} onChange={(event) => setForm((current) => ({ ...current, jam_keluar: event.target.value }))} className={inputClass} />
          <input type="time" value={form.jam_kembali} onChange={(event) => setForm((current) => ({ ...current, jam_kembali: event.target.value }))} className={inputClass} />
        </div>
        <textarea value={form.catatan} onChange={(event) => setForm((current) => ({ ...current, catatan: event.target.value }))} rows={3} placeholder="Catatan tambahan" className="mt-3 w-full rounded border border-gray-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700" />
        <div className="mt-4 rounded border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-950">Penandatangan Semua Surat Perizinan</h3>
              <p className="mt-1 text-xs text-gray-600">Nama dan jabatan ini dipakai untuk surat yang digenerate dari menu perizinan.</p>
            </div>
            <div className="inline-flex rounded border border-gray-200 bg-white p-1">
              {([
                ["wet", "Basah"],
                ["digital", "Digital QR"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSignatureMode(mode)}
                  className={`rounded px-4 py-2 text-sm font-semibold ${signatureMode === mode ? "bg-emerald-800 text-white" : "text-gray-600 hover:text-gray-950"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              value={signer.nama}
              onChange={(event) => setSigner((current) => ({ ...current, nama: event.target.value }))}
              placeholder="Nama penandatangan"
              className={inputClass}
            />
            <input
              value={signer.jabatan}
              onChange={(event) => setSigner((current) => ({ ...current, jabatan: event.target.value }))}
              placeholder="Jabatan penandatangan"
              className={inputClass}
            />
          </div>
        </div>
        <button className="mt-4 inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          <FileText className="mr-2" size={17} />
          Simpan & Generate Surat
        </button>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </form>

      <div className="rounded bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>
            <option value="">Semua status</option>
            <option value="diajukan">Diajukan</option>
            <option value="disetujui">Disetujui</option>
            <option value="selesai">Sudah Kembali</option>
            <option value="ditolak">Ditolak</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
        </div>
      </div>

      <DataTable
        headers={["Tanggal", "Santri", "Jenis", "Tujuan", "Status", "Kembali", "Surat", "Aksi"]}
        rows={filteredRecords.map((row) => [
          `${formatDate(row.tanggal_mulai)} - ${formatDate(row.tanggal_selesai)}`,
          row.santri?.nama_lengkap || "-",
          row.jenis_izin,
          row.tujuan || "-",
          <span key="status" className={row.status === "selesai" ? "font-semibold text-emerald-800" : ""}>{izinStatusLabel(row.status)}</span>,
          row.waktu_kembali_aktual ? formatDateTime(row.waktu_kembali_aktual) : "-",
          row.file_url ? <a key="pdf" href={publicPdfUrl(row.file_url)} target="_blank" rel="noreferrer" className="font-semibold text-emerald-800">Buka Surat</a> : "-",
          <div key="actions" className="flex flex-wrap gap-2">
            <button onClick={() => setSelected(row)} className="rounded border px-3 py-2 text-xs font-semibold">Detail</button>
            {row.status !== "selesai" ? (
              <button onClick={() => updateStatus(row, "selesai")} className="rounded border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-800">Tandai Sudah Kembali</button>
            ) : null}
            {row.status !== "dibatalkan" ? (
              <button onClick={() => updateStatus(row, "dibatalkan")} className="rounded border px-3 py-2 text-xs font-semibold text-red-700">Batalkan</button>
            ) : null}
          </div>,
        ])}
      />

      {selected ? (
        <div className="rounded bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold">Detail Izin - {selected.santri?.nama_lengkap || "-"}</h2>
          <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
            <p>Nomor surat: {selected.nomor_surat || "-"}</p>
            <p>Kelas pengajian: {selected.santri ? kelasPengajianLabel(selected.santri) : "-"}</p>
            <p>Jenis: {selected.jenis_izin}</p>
            <p>Status: {izinStatusLabel(selected.status)}</p>
            <p>Waktu kembali aktual: {formatDateTime(selected.waktu_kembali_aktual)}</p>
            <p>Tujuan: {selected.tujuan || "-"}</p>
            <p>Alasan: {selected.alasan}</p>
            <p>Penjemput: {selected.penjemput || "-"}</p>
            <p>No HP: {selected.no_hp_penjemput || "-"}</p>
            <p className="md:col-span-2">Catatan: {selected.catatan || "-"}</p>
          </div>
          <button onClick={() => setSelected(null)} className="mt-4 rounded border px-4 py-2 text-sm font-semibold">Tutup Detail</button>
        </div>
      ) : null}
    </ModuleShell>
  );
}

function SuratModule() {
  const { user } = useAuth();
  const [santri, setSantri] = useState<Santri[]>([]);
  const [archive, setArchive] = useState<SuratArchive[]>([]);
  const [activeTab, setActiveTab] = useState<"buat" | "log">("buat");
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("wet");
  const [form, setForm] = useState({
    jenis_surat: suratTemplates[0],
    nomor_surat: "",
    perihal: "",
    tanggal_surat: new Date().toISOString().slice(0, 10),
    ditujukan: "",
    santri_id: "",
    isi_tambahan: "",
    jabatan_penandatangan: "Pimpinan Pesantren",
    nama_penandatangan: "",
    undangan_acara: "",
    undangan_tanggal: new Date().toISOString().slice(0, 10),
    undangan_waktu: "",
    undangan_tempat: "",
  });
  const [message, setMessage] = useNotifiedMessage();
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewValidationId, setPreviewValidationId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function loadData() {
    const [santriResult, archiveResult] = await Promise.all([
      supabase.from("pp_santri").select("*").order("nama_lengkap"),
      supabase.from("pp_surat_keluar").select("*").order("created_at", { ascending: false }),
    ]);
    setSantri((santriResult.data || []) as Santri[]);
    setArchive((archiveResult.data || []) as SuratArchive[]);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedSantri = santri.find((item) => item.id === form.santri_id);
  const preview = `${form.jenis_surat}\nNomor: ${form.nomor_surat || "-"}\nPerihal: ${form.perihal || "-"}\nTanggal: ${formatDate(form.tanggal_surat)}\nDitujukan: ${form.ditujukan || "-"}\nSantri: ${selectedSantri?.nama_lengkap || "-"}\n\nDengan ini Pondok Pesantren An-Nur Mageung menerangkan bahwa informasi pada surat ini dibuat sesuai data administrasi pesantren.\n${form.isi_tambahan || ""}`;

  function createUuid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  function validationUrlFor(id: string) {
    return `${window.location.origin}/validasi-surat-pesantren/${id}`;
  }

  async function makeQrDataUrl(value: string) {
    const QRCode = await import("qrcode");
    return QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 260,
      color: { dark: "#064e3b", light: "#FFFFFF" },
    });
  }

  function drawSignatureBlock(
    doc: any,
    x: number,
    y: number,
    qrDataUrl?: string | null,
    validationUrl?: string,
    lokasiSurat?: string
  ) {
    const loc = lokasiSurat || "Mageung";
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(`${loc}, ${formatDate(form.tanggal_surat)}`, x, y);
    doc.text(form.jabatan_penandatangan || "Pimpinan Pesantren", x, y + 8);

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", x, y + 13, 25, 25);
      doc.setFontSize(7);
      doc.text("Tanda tangan digital", x + 30, y + 18);
      doc.text("Scan QR untuk validasi", x + 30, y + 22);
      if (validationUrl) {
        doc.setFontSize(5.5);
        doc.text(doc.splitTextToSize(validationUrl, 48).slice(0, 2), x + 30, y + 26);
      }
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.text(form.nama_penandatangan || form.jabatan_penandatangan || "Pimpinan Pesantren", x + 30, y + 40);
      const width = doc.getTextWidth(form.nama_penandatangan || form.jabatan_penandatangan || "Pimpinan Pesantren");
      doc.line(x + 30, y + 41, x + 30 + width, y + 41);
      doc.setFont("times", "normal");
      return;
    }

    doc.setFont("times", "bold");
    doc.text(form.nama_penandatangan || form.jabatan_penandatangan || "Pimpinan Pesantren", x, y + 34);
    const width = doc.getTextWidth(form.nama_penandatangan || form.jabatan_penandatangan || "Pimpinan Pesantren");
    doc.line(x, y + 35, x + width, y + 35);
    doc.setFont("times", "normal");
  }

  function selectCard(card: (typeof SURAT_CARDS)[number]) {
    setActiveCard(card.id);
    setForm((current) => ({
      ...current,
      jenis_surat: card.title,
      perihal: card.id === "undangan" ? current.perihal || "Undangan Acara/Kegiatan" : current.perihal || card.title,
      ditujukan: card.id === "undangan" ? current.ditujukan || "Bapak/Ibu/Wali Santri" : current.ditujukan,
      undangan_acara: card.id === "undangan" ? current.undangan_acara || "Rapat / Kegiatan Pesantren" : current.undangan_acara,
    }));
  }

  async function generatePdf() {
    setGenerating(true);
    setMessage("");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const validationId = signatureMode === "digital" ? createUuid() : null;
      setPreviewValidationId(validationId);
      const validationUrl = validationId ? validationUrlFor(validationId) : "";
      const qrDataUrl = validationUrl ? await makeQrDataUrl(validationUrl) : null;

      await drawPesantrenKop(doc);
      if (false) {
      
      doc.setFont("times", "normal");
      doc.setFontSize(22);
      doc.text("معهد النورالاسلامي", 105, 18, { align: "center" }); 
      
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.text("PONDOK PESANTREN AN-NUR", 105, 26, { align: "center" });
      
      doc.setFontSize(12);
      doc.text("NSSPP: 5.1.0.0.320.62.306", 105, 32, { align: "center" });
      
      doc.setFont("times", "italic");
      doc.setFontSize(10);
      doc.text("Alamat : Kp. Mageung Ds. Sirnasari Kec. Sariwangi Kab. Tasikmalaya Provinsi Jawa Barat 46465", 105, 37, { align: "center" });
      
      const fullContactText = "Hp. 085314672849 – 085220053205 email : ppannur.mageung@gmail.com";
      const contactText = "Hp. 085314672849 – 085220053205 email : ";
      const emailText = "ppannur.mageung@gmail.com";
      const fullWidth = doc.getTextWidth(fullContactText);
      const startX = 105 - (fullWidth / 2);
      
      doc.text(contactText, startX, 42);
      doc.setTextColor(0, 0, 255);
      doc.text(emailText, startX + doc.getTextWidth(contactText), 42);
      
      doc.setDrawColor(0, 0, 255);
      doc.setLineWidth(0.2);
      doc.line(startX + doc.getTextWidth(contactText), 43, startX + doc.getTextWidth(contactText) + doc.getTextWidth(emailText), 43);
      
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(0, 0, 0);
      
      doc.setLineWidth(1.0);
      doc.line(15, 46, 195, 46);
      doc.setLineWidth(0.3);
      doc.line(15, 47.5, 195, 47.5);
      }
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(0, 0, 0);

    if (form.jenis_surat === "Surat Keterangan Aktif / Masih Mondok") {
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.text("SURAT KETERANGAN SANTRI AKTIF", 105, 60, { align: "center" });
      const titleWidth = doc.getTextWidth("SURAT KETERANGAN SANTRI AKTIF");
      doc.line(105 - (titleWidth/2), 61, 105 + (titleWidth/2), 61);
      
      doc.setFont("times", "normal");
      doc.text(`No : ${form.nomor_surat || "010/PPAM/II/2026"}`, 105, 67, { align: "center" });
      
      doc.text("Yang bertanda tangan di bawah ini,", 20, 80);
      
      doc.text("Nama Lengkap", 20, 88);
      doc.text(`: ${form.nama_penandatangan || "Aj. Albar Ajiz Rahman"}`, 70, 88);
      doc.text("Jabatan", 20, 96);
      doc.text(`: ${form.jabatan_penandatangan || "Pimpinan Pondok Pesantren An-Nur"}`, 70, 96);
      doc.text("Alamat Pondok Pesantren", 20, 104);
      doc.text(": Kp. Mageung RT.001 RW.003 Desa Sirnasari", 70, 104);
      doc.text("  Kecamatan Sariwangi Kabupaten Tasikmalaya", 72, 112);
      
      doc.text("Menerangkan bahwa :", 20, 126);
      
      const selectedSantriObj = santri.find((item) => item.id === form.santri_id);
      const namaSantri = selectedSantriObj?.nama_lengkap || "(Nama Santri)";
      const ttlSantri = selectedSantriObj?.tanggal_lahir ? `Tasikmalaya, ${formatDate(selectedSantriObj.tanggal_lahir)}` : "(Tempat, Tanggal Lahir)";
      const alamatSantri = selectedSantriObj?.alamat || "(Alamat)";
      
      doc.text("Nama santri", 20, 134);
      doc.text(`: ${namaSantri}`, 70, 134);
      doc.text("Tempat Tanggal Lahir", 20, 142);
      doc.text(`: ${ttlSantri}`, 70, 142);
      doc.text("Alamat", 20, 150);
      const splitAlamat = doc.splitTextToSize(`: ${alamatSantri}`, 120);
      doc.text(splitAlamat, 70, 150);
      
      let yPos = 150 + (splitAlamat.length * 6) + 4;
      
      const defaultDesc = `adalah benar-benar Santri Aktif di pesantren kami dan yang bersangkutan merupakan santri yatim.`;
      const descText = form.isi_tambahan || defaultDesc;
      const splitDesc = doc.splitTextToSize(descText, 170);
      doc.text(splitDesc, 20, yPos);
      
      yPos += (splitDesc.length * 6) + 4;
      
      doc.text("Demikian surat ini di buat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.", 20, yPos);
      
      drawSignatureBlock(doc, 125, yPos + 25, qrDataUrl, validationUrl, "Sariwangi");
    } else if (form.jenis_surat === "Surat Undangan Acara/Kegiatan") {
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.text(`Nomor`, 20, 62);
      doc.text(`: ${form.nomor_surat || "-"}`, 45, 62);
      doc.text(`Lampiran`, 20, 70);
      doc.text(`: -`, 45, 70);
      doc.text(`Perihal`, 20, 78);
      doc.text(`: ${form.perihal || "Undangan Acara/Kegiatan"}`, 45, 78);

      doc.text("Kepada Yth.", 20, 96);
      doc.setFont("times", "bold");
      doc.text(form.ditujukan || "Bapak/Ibu/Wali Santri", 20, 104);
      doc.setFont("times", "normal");
      doc.text("di Tempat", 20, 112);

      doc.text("Assalamu'alaikum Wr. Wb.", 20, 130);
      const opening = doc.splitTextToSize(
        "Dengan hormat, sehubungan dengan akan dilaksanakannya kegiatan Pondok Pesantren An-Nur, kami mengundang Bapak/Ibu/Saudara/i untuk hadir pada:",
        170,
      );
      doc.text(opening, 20, 142);

      const detailY = 162;
      const row = (label: string, value: string, y: number) => {
        doc.text(label, 32, y);
        doc.text(":", 68, y);
        doc.setFont("times", "bold");
        doc.text(value || "-", 74, y, { maxWidth: 112 });
        doc.setFont("times", "normal");
      };
      row("Hari/Tanggal", formatDate(form.undangan_tanggal), detailY);
      row("Waktu", form.undangan_waktu || "-", detailY + 8);
      row("Tempat", form.undangan_tempat || "-", detailY + 16);
      row("Acara", form.undangan_acara || form.perihal || "-", detailY + 24);

      const extraLines = form.isi_tambahan.trim()
        ? doc.splitTextToSize(form.isi_tambahan.trim(), 170)
        : [];
      if (extraLines.length) {
        doc.text(extraLines, 20, detailY + 42);
      }
      const closingY = detailY + 42 + (extraLines.length ? extraLines.length * 6 + 8 : 0);
      const closing = doc.splitTextToSize(
        "Demikian undangan ini kami sampaikan. Atas perhatian dan kehadirannya, kami ucapkan terima kasih.",
        170,
      );
      doc.text(closing, 20, closingY);
      doc.text("Wassalamu'alaikum Wr. Wb.", 20, closingY + closing.length * 6 + 8);

      drawSignatureBlock(doc, 125, Math.min(238, closingY + closing.length * 6 + 24), qrDataUrl, validationUrl, "Sariwangi");
    } else {
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.text(form.jenis_surat.toUpperCase(), 105, 60, { align: "center" });
      const titleWidth = doc.getTextWidth(form.jenis_surat.toUpperCase());
      doc.line(105 - (titleWidth/2), 61, 105 + (titleWidth/2), 61);
      
      doc.setFont("times", "normal");
      doc.text(`No : ${form.nomor_surat || "-"}`, 105, 67, { align: "center" });
      
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(preview, 170);
      doc.text(lines, 20, 80);
      const signatureY = Math.min(238, 80 + lines.length * 5.3 + 14);
      drawSignatureBlock(doc, 138, signatureY, qrDataUrl, validationUrl, "Sariwangi");
    }
    const blob = doc.output("blob");
    setPreviewBlob(blob);
    setPreviewPdfUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setMessage(err.message || "Gagal membuat preview PDF.");
    } finally {
      setGenerating(false);
    }
  }

  function resetPreview() {
    setPreviewPdfUrl(null);
    setPreviewBlob(null);
    setPreviewValidationId(null);
  }

  async function saveAndDownloadPdf() {
    if (!previewBlob) return;
    setGenerating(true);
    setMessage("");
    try {
      const path = `pesantren/${Date.now()}-${randomCode(6)}.pdf`;
      const upload = await supabase.storage.from("surat-keluar").upload(path, previewBlob, {
        contentType: "application/pdf",
      });

      const { error } = await supabase.from("pp_surat_keluar").insert({
        ...(previewValidationId ? { id: previewValidationId } : {}),
        nomor_surat: form.nomor_surat || null,
        jenis_surat: form.jenis_surat,
        perihal: form.perihal || null,
        ditujukan: form.ditujukan || null,
        tanggal_surat: form.tanggal_surat,
        santri_id: form.santri_id || null,
        dibuat_oleh: user?.id || null,
        file_url: upload.data?.path || null,
      });

      if (upload.error || error) {
        setGenerating(false);
        setMessage(upload.error?.message || error?.message || "Surat belum tersimpan.");
        return;
      }

      const link = document.createElement("a");
      link.href = previewPdfUrl!;
      link.download = `${form.nomor_surat?.replace(/\//g, "-") || "surat-keluar"}.pdf`;
      link.click();
      
      setMessage("Surat berhasil disimpan dan didownload.");
      resetPreview();
      loadData();
      setActiveTab("log");
      setActiveCard(null);
    } catch (err: any) {
      setMessage(err.message || "Gagal menyimpan surat.");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadArchive(row: SuratArchive) {
    if (!row.file_url) return;
    const { data, error } = await supabase.storage
      .from("surat-keluar")
      .download(row.file_url);
    if (error || !data) {
      setMessage(error?.message || "File tidak ditemukan.");
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(data);
    link.download = `${row.nomor_surat || row.jenis_surat}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function deleteArchive(row: SuratArchive) {
    if (!window.confirm("Yakin ingin menghapus log surat ini?")) return;
    if (row.file_url) {
      await supabase.storage.from("surat-keluar").remove([row.file_url]);
    }
    const { error } = await supabase.from("pp_surat_keluar").delete().eq("id", row.id);
    if (error) {
      setMessage(error.message || "Gagal menghapus log.");
    } else {
      setMessage("Log surat berhasil dihapus.");
      loadData();
    }
  }

  return (
    <ModuleShell
      title="Generate Surat Keluar"
      description="Pilih template, isi data dinamis, preview, generate PDF, dan arsipkan surat."
    >
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab("buat")}
          className={`inline-flex items-center rounded border px-4 py-2 text-sm font-semibold ${activeTab === "buat" ? "border-gray-200 bg-white text-gray-900 shadow-sm" : "border-transparent text-gray-500 hover:bg-white/60"}`}
        >
          <Plus className="mr-2" size={16} />
          Buat Surat
        </button>
        <button
          onClick={() => setActiveTab("log")}
          className={`inline-flex items-center rounded border px-4 py-2 text-sm font-semibold ${activeTab === "log" ? "border-gray-200 bg-white text-gray-900 shadow-sm" : "border-transparent text-gray-500 hover:bg-white/60"}`}
        >
          <FileText className="mr-2" size={16} />
          Log Surat
        </button>
      </div>

      {activeTab === "buat" ? (
        <div className="mb-6 flex flex-col gap-3 rounded bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded bg-emerald-50 text-emerald-700">
              <QrCode size={20} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Tanda Tangan</h3>
              <p className="text-xs text-gray-500">Gunakan tanda tangan basah atau digital QR untuk validasi surat.</p>
            </div>
          </div>
          <div className="inline-flex rounded border border-gray-200 bg-gray-50 p-1">
            {([
              ["wet", "Basah"],
              ["digital", "Digital QR"],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSignatureMode(mode)}
                className={`rounded px-4 py-2 text-sm font-semibold ${signatureMode === mode ? "bg-white text-emerald-800 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "buat" && !activeCard ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SURAT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => selectCard(card)}
                className="relative flex min-h-40 flex-col items-start rounded bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`mb-4 rounded p-2 ${card.bg}`}>
                  <Icon className={card.color} size={21} />
                </div>
                <h3 className="font-semibold text-gray-950">{card.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">{card.desc}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      {activeTab === "buat" && activeCard ? (
        <div className="max-w-4xl mx-auto">
          <div className="rounded bg-white p-5 shadow-soft">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">{form.jenis_surat}</h2>
                <p className="text-sm text-gray-500">Isi data surat, lalu generate PDF.</p>
              </div>
              <button onClick={() => setActiveCard(null)} className="rounded border px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Kembali
              </button>
            </div>
            {activeCard === "aktif" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Nomor Surat</label>
                  <input value={form.nomor_surat} onChange={(event) => setForm((current) => ({ ...current, nomor_surat: event.target.value }))} placeholder="Nomor surat" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Tanggal Dikeluarkan</label>
                  <input type="date" value={form.tanggal_surat} onChange={(event) => setForm((current) => ({ ...current, tanggal_surat: event.target.value }))} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">Pilih Santri Terkait</label>
                  <select value={form.santri_id} onChange={(event) => setForm((current) => ({ ...current, santri_id: event.target.value }))} className={inputClass}>
                    <option value="">-- Pilih Data Santri --</option>
                    {santri.map((item) => (
                      <option key={item.id} value={item.id}>{item.nama_lengkap}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Pejabat Penandatangan</label>
                  <input value={form.nama_penandatangan} onChange={(event) => setForm((current) => ({ ...current, nama_penandatangan: event.target.value }))} placeholder="Nama penandatangan" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Jabatan</label>
                  <input value={form.jabatan_penandatangan} onChange={(event) => setForm((current) => ({ ...current, jabatan_penandatangan: event.target.value }))} placeholder="Jabatan penandatangan" className={inputClass} />
                </div>
              </div>
            ) : activeCard === "undangan" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Nomor Surat</label>
                  <input value={form.nomor_surat} onChange={(event) => setForm((current) => ({ ...current, nomor_surat: event.target.value }))} placeholder="Nomor surat" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Tanggal Surat</label>
                  <input type="date" value={form.tanggal_surat} onChange={(event) => setForm((current) => ({ ...current, tanggal_surat: event.target.value }))} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">Kepada Yth.</label>
                  <input value={form.ditujukan} onChange={(event) => setForm((current) => ({ ...current, ditujukan: event.target.value }))} placeholder="Bapak/Ibu/Wali Santri" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Perihal</label>
                  <input value={form.perihal} onChange={(event) => setForm((current) => ({ ...current, perihal: event.target.value }))} placeholder="Undangan Acara/Kegiatan" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Nama Acara/Kegiatan</label>
                  <input value={form.undangan_acara} onChange={(event) => setForm((current) => ({ ...current, undangan_acara: event.target.value }))} placeholder="Nama acara/kegiatan" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Tanggal Acara</label>
                  <input type="date" value={form.undangan_tanggal} onChange={(event) => setForm((current) => ({ ...current, undangan_tanggal: event.target.value }))} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Waktu Acara</label>
                  <input value={form.undangan_waktu} onChange={(event) => setForm((current) => ({ ...current, undangan_waktu: event.target.value }))} placeholder="Contoh: 08.00 WIB s.d. selesai" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">Tempat Acara</label>
                  <input value={form.undangan_tempat} onChange={(event) => setForm((current) => ({ ...current, undangan_tempat: event.target.value }))} placeholder="Tempat kegiatan" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Pejabat Penandatangan</label>
                  <input value={form.nama_penandatangan} onChange={(event) => setForm((current) => ({ ...current, nama_penandatangan: event.target.value }))} placeholder="Nama penandatangan" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Jabatan</label>
                  <input value={form.jabatan_penandatangan} onChange={(event) => setForm((current) => ({ ...current, jabatan_penandatangan: event.target.value }))} placeholder="Jabatan penandatangan" className={inputClass} />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <input value={form.nomor_surat} onChange={(event) => setForm((current) => ({ ...current, nomor_surat: event.target.value }))} placeholder="Nomor surat" className={inputClass} />
                <input value={form.perihal} onChange={(event) => setForm((current) => ({ ...current, perihal: event.target.value }))} placeholder="Perihal" className={inputClass} />
                <input type="date" value={form.tanggal_surat} onChange={(event) => setForm((current) => ({ ...current, tanggal_surat: event.target.value }))} className={inputClass} />
                <input value={form.ditujukan} onChange={(event) => setForm((current) => ({ ...current, ditujukan: event.target.value }))} placeholder="Ditujukan" className={inputClass} />
                <select value={form.santri_id} onChange={(event) => setForm((current) => ({ ...current, santri_id: event.target.value }))} className={inputClass}>
                  <option value="">Data santri terkait</option>
                  {santri.map((item) => (
                    <option key={item.id} value={item.id}>{item.nama_lengkap}</option>
                  ))}
                </select>
                <input value={form.jabatan_penandatangan} onChange={(event) => setForm((current) => ({ ...current, jabatan_penandatangan: event.target.value }))} placeholder="Jabatan penandatangan" className={inputClass} />
                <input value={form.nama_penandatangan} onChange={(event) => setForm((current) => ({ ...current, nama_penandatangan: event.target.value }))} placeholder="Nama penandatangan" className={inputClass} />
              </div>
            )}
            <div className="mt-3">
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{activeCard === "undangan" ? "Catatan Tambahan Undangan (Opsional)" : "Catatan Tambahan (Opsional)"}</label>
              <textarea value={form.isi_tambahan} onChange={(event) => setForm((current) => ({ ...current, isi_tambahan: event.target.value }))} rows={4} placeholder={activeCard === "undangan" ? "Contoh: Mohon hadir tepat waktu dan mengenakan pakaian rapi." : "Masukkan keterangan tambahan jika ada..."} className="w-full rounded border border-gray-200 px-3 py-3 text-sm" />
            </div>
            <div className="border-t pt-5 mt-5">
              {previewPdfUrl ? (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2 mb-2">
                    <button onClick={saveAndDownloadPdf} disabled={generating} className="flex-1 rounded bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-70">
                      {generating ? "Menyimpan..." : "Simpan ke Log & Download"}
                    </button>
                    <button onClick={resetPreview} className="rounded border border-gray-200 bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200">
                      Batal / Edit
                    </button>
                  </div>
                  <iframe src={previewPdfUrl} className="h-[600px] w-full rounded-lg border border-gray-200 shadow-sm" title="PDF Preview" />
                </div>
              ) : (
                <button onClick={generatePdf} disabled={generating} className="mt-4 inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
                  <FileText className="mr-2" size={17} />
                  {generating ? "Memproses..." : "Preview PDF"}
                </button>
              )}
              {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "log" ? (
        <DataTable
          headers={["Tanggal", "Nomor", "Jenis", "Perihal", "Aksi"]}
          rows={archive.map((row) => [
            formatDate(row.tanggal_surat),
            row.nomor_surat || "-",
            row.jenis_surat,
            row.perihal || "-",
            <div key="actions" className="flex gap-2">
              <button onClick={() => downloadArchive(row)} className="rounded border px-3 py-2 text-sm font-semibold">
                Download
              </button>
              <a href={validationUrlFor(row.id)} target="_blank" rel="noreferrer" className="inline-flex items-center rounded border px-3 py-2 text-sm font-semibold text-emerald-800">
                <ExternalLink className="mr-2" size={15} />
                Validasi
              </a>
              <button onClick={() => deleteArchive(row)} className="inline-flex items-center rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                <Trash2 className="mr-2" size={15} />
                Hapus
              </button>
            </div>,
          ])}
        />
      ) : null}
    </ModuleShell>
  );
}

function PsbModule() {
  const [rows, setRows] = useState<PsbRow[]>([]);
  const [selected, setSelected] = useState<PsbRow | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "pendaftar" | "pengaturan">("dashboard");
  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [message, setMessage] = useNotifiedMessage();
  const [settings, setSettings] = useState({
    active: false,
    tahun_ajaran: "",
    deskripsi:
      "Lengkapi formulir pendaftaran santri baru. Bukti pendaftaran resmi akan otomatis dibuat setelah data terkirim.",
  });

  async function loadRows() {
    const { data } = await supabase
      .from("pp_psb_pendaftar")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data || []) as PsbRow[]);
  }

  async function loadSettings() {
    const { data } = await supabase
      .from("lp_konten")
      .select("section, key, value")
      .eq("entitas", "pesantren")
      .eq("section", "psb");

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
        "Lengkapi formulir pendaftaran santri baru. Bukti pendaftaran resmi akan otomatis dibuat setelah data terkirim.",
    });
    if (mapped.tahun_ajaran) setYearFilter(mapped.tahun_ajaran);
  }

  useEffect(() => {
    loadRows();
    loadSettings();
  }, []);

  async function updateStatus(row: PsbRow, status: PsbRow["status"]) {
    const { error } = await supabase
      .from("pp_psb_pendaftar")
      .update({ status })
      .eq("id", row.id);
    setMessage(error ? error.message : "Status pendaftar diperbarui.");
    loadRows();
  }

  async function deletePendaftar(row: PsbRow) {
    const confirmed = window.confirm(`Hapus data PSB atas nama ${row.nama_lengkap}?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("pp_psb_pendaftar")
      .delete()
      .eq("id", row.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (row.bukti_url) {
      await supabase.storage.from("pp-psb-bukti").remove([row.bukti_url]);
    }
    if (row.foto_url) {
      await supabase.storage.from("pp-psb-foto").remove([row.foto_url]);
    }

    if (selected?.id === row.id) setSelected(null);
    setMessage("Data pendaftar dihapus.");
    loadRows();
  }

  async function saveSettings() {
    setMessage("");
    const rowsToSave = [
      {
        entitas: "pesantren",
        section: "psb",
        key: "active",
        value: settings.active ? "true" : "false",
      },
      {
        entitas: "pesantren",
        section: "psb",
        key: "tahun_ajaran",
        value: settings.tahun_ajaran.trim(),
      },
      {
        entitas: "pesantren",
        section: "psb",
        key: "deskripsi",
        value: settings.deskripsi.trim(),
      },
    ];
    const { error } = await supabase
      .from("lp_konten")
      .upsert(rowsToSave, { onConflict: "entitas,section,key" });

    setMessage(error ? error.message : "Pengaturan PSB tersimpan.");
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
        "Tanggal Masuk": row.tanggal_masuk || "",
        "Nama Lengkap": row.nama_lengkap,
        Kewarganegaraan: row.kewarganegaraan || "",
        NIK: row.nik || "",
        NISN: row.nisn || "",
        "Jenis Kelamin": row.jenis_kelamin === "L" ? "Laki-laki" : row.jenis_kelamin === "P" ? "Perempuan" : "",
        "Tempat Lahir": row.tempat_lahir || "",
        "Tanggal Lahir": row.tanggal_lahir || "",
        Agama: row.agama || "",
        "No Handphone": row.no_handphone || row.no_hp || "",
        "Nama Ayah Kandung": row.nama_ayah_kandung || "",
        "Status Ayah Kandung": row.status_ayah_kandung || "",
        "NIK Ayah": row.nik_ayah || "",
        "Nama Ibu Kandung": row.nama_ibu_kandung || "",
        "Status Ibu Kandung": row.status_ibu_kandung || "",
        "NIK Ibu": row.nik_ibu || "",
        "Status Wali": row.status_wali || "",
        "Nama Wali": row.nama_wali || row.nama_orang_tua || "",
        Jenjang: row.jenjang || "",
        "Tingkat Kelas": row.tingkat_kelas || "",
        KITAS: row.kitas || "",
        "Asal Negara": row.asal_negara || "",
        Alamat: row.alamat || "",
        "URL Foto": row.foto_url
          ? supabase.storage.from("pp-psb-foto").getPublicUrl(row.foto_url).data.publicUrl
          : "",
        Status: row.status,
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pendaftar PSB");
    XLSX.writeFile(workbook, `data-psb-${yearFilter || "semua"}.xlsx`);
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

  function proofUrl(row: PsbRow) {
    if (!row.bukti_url) return "";
    return supabase.storage.from("pp-psb-bukti").getPublicUrl(row.bukti_url).data.publicUrl;
  }

  function photoUrl(row: PsbRow) {
    if (!row.foto_url) return "";
    return supabase.storage.from("pp-psb-foto").getPublicUrl(row.foto_url).data.publicUrl;
  }

  return (
    <ModuleShell
      title="PSB"
      description="Atur tahun ajaran, buka/tutup PSB di landing page, kelola pendaftar, verifikasi status, dan export data Excel."
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
            <p className="text-sm font-semibold text-gray-500">Status PSB Landing Page</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xl font-semibold text-gray-950">
                  {settings.active ? "PSB sedang dibuka" : "PSB sedang ditutup"}
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
                Atur PSB
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "pengaturan" ? (
        <div className="rounded bg-white p-5 shadow-soft">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-gray-700">
              Tahun ajaran PSB
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
              Aktifkan PSB di landing page
            </label>
            <label className="grid gap-2 text-sm font-semibold text-gray-700 md:col-span-2">
              Deskripsi singkat PSB
              <textarea
                value={settings.deskripsi}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, deskripsi: event.target.value }))
                }
                rows={4}
                className="rounded border border-gray-200 px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </label>
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
            headers={["Tanggal", "Nomor", "Nama", "Tahun", "Kontak", "Status", "Aksi"]}
            rows={filteredRows.map((row) => [
              formatDate(row.created_at),
              row.nomor_pendaftaran || "-",
              row.nama_lengkap,
              row.tahun_ajaran || "-",
              row.no_handphone || row.no_hp || "-",
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
              <div className="grid h-36 w-28 place-items-center rounded border border-dashed border-gray-300 text-xs text-gray-500">
                Foto belum ada
              </div>
            )}
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>Nomor: {selected.nomor_pendaftaran || "-"}</p>
              <p>Tahun ajaran: {selected.tahun_ajaran || "-"}</p>
              <p>Tanggal masuk: {formatDate(selected.tanggal_masuk)}</p>
              <p>Nama: {selected.nama_lengkap}</p>
              <p>Kewarganegaraan: {selected.kewarganegaraan || "-"}</p>
              <p>NIK: {selected.nik || "-"}</p>
              <p>NISN: {selected.nisn || "-"}</p>
              <p>JK: {selected.jenis_kelamin || "-"}</p>
              <p>Tempat lahir: {selected.tempat_lahir || "-"}</p>
              <p>Tanggal lahir: {formatDate(selected.tanggal_lahir)}</p>
              <p>Agama: {selected.agama || "-"}</p>
              <p>No HP: {selected.no_handphone || selected.no_hp || "-"}</p>
              <p>Ayah: {selected.nama_ayah_kandung || "-"}</p>
              <p>Status ayah: {selected.status_ayah_kandung || "-"}</p>
              <p>NIK ayah: {selected.nik_ayah || "-"}</p>
              <p>Ibu: {selected.nama_ibu_kandung || "-"}</p>
              <p>Status ibu: {selected.status_ibu_kandung || "-"}</p>
              <p>NIK ibu: {selected.nik_ibu || "-"}</p>
              <p>Status wali: {selected.status_wali || "-"}</p>
              <p>Nama wali: {selected.nama_wali || selected.nama_orang_tua || "-"}</p>
              <p>Jenjang: {selected.jenjang || "-"}</p>
              <p>Tingkat kelas: {selected.tingkat_kelas || "-"}</p>
              <p>KITAS: {selected.kitas || "-"}</p>
              <p>Asal negara: {selected.asal_negara || "-"}</p>
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

function SimplePlaceholder({ title }: { title: string }) {
  return (
    <ModuleShell title={title} description="Modul ini sudah tersedia di navigasi dan siap dikembangkan pada step lanjutan.">
      <div className="rounded bg-white p-5 text-sm text-gray-600 shadow-soft">
        Belum ada workflow detail untuk modul ini pada Step 7.
      </div>
    </ModuleShell>
  );
}

export function PesantrenDataModule({
  slug,
  role,
}: {
  slug: string;
  role: string;
}) {
  if (slug === "data-santri") return <DataSantriModule />;
  if (slug === "data-alumni") return <AlumniModule />;
  if (slug === "data-asatidz") return <AsatidzModule />;
  if (slug === "raport-santri") return <RaportModule role={role} />;
  if (slug === "catatan-pelanggaran") return <PelanggaranModule role={role} />;
  if (slug === "capaian-santri") return <CapaianModule role={role} />;
  if (slug === "perizinan") return <PerizinanModule role={role} />;
  if (slug === "manajemen-akun") return <AccountManagementModule entity="pesantren" />;
  if (slug === "surat-keluar") return <SuratModule />;
  if (slug === "psb") return <PsbModule />;
  if (slug === "keuangan-tagihan") return <FinanceModule initialEntity="pesantren" />;
  if (slug === "konten-landing-page") return <LandingContentAdmin initialEntity="pesantren" />;
  return <SimplePlaceholder title="Modul Pesantren" />;
}
