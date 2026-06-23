import {
  CalendarPlus,
  FileText,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  Wallet,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

type Entity = "pesantren" | "smp";
type PaymentProfile = "santri_siswa" | "santri_non_siswa" | "siswa_saja" | "khusus";
type PaymentPreset =
  | "santri_siswa_400"
  | "santri_400"
  | "santri_340"
  | "siswa_75"
  | "siswa_60"
  | "khusus";
type ItemCategory = "bulanan" | "masuk_cicil" | "insidentil" | "tabungan";
type MemberSource = Entity | "gabungan";

type BillType = {
  id: string;
  entitas: Entity;
  nama: string;
  nominal: number;
  berlaku_untuk: string;
};

type Member = {
  id: string;
  nis: string;
  nama_lengkap: string;
  kelas?: string | null;
  tahun_masuk: number;
  tanggal_lahir?: string | null;
  status: string;
  sumber?: MemberSource;
  related_ids?: string[];
};

type Invoice = {
  id: string;
  entitas: Entity;
  anggota_id: string;
  jenis_tagihan_id: string | null;
  nama_tagihan: string | null;
  catatan: string | null;
  kategori: ItemCategory;
  bisa_dicicil: boolean;
  nominal: number;
  status: "belum_lunas" | "cicilan" | "lunas";
  jatuh_tempo: string | null;
  periode: string | null;
  sumber_pengaturan_id: string | null;
  tabungan_target: number;
  ditarik_at: string | null;
  ditarik_oleh: string | null;
  catatan_penarikan: string | null;
  jenis?: { nama: string } | null;
};

type Payment = {
  id: string;
  tagihan_id: string;
  jumlah_bayar: number;
  tanggal_bayar: string;
  catatan: string | null;
  kuitansi_url: string | null;
};

type PaymentSetting = {
  id: string;
  entitas: Entity;
  anggota_id: string;
  profil_pembayaran: PaymentProfile;
  total_bulanan: number;
  tabungan_bulanan: number;
  aktif: boolean;
  catatan: string | null;
};

type SettingItem = {
  id?: string;
  pengaturan_id?: string;
  nama: string;
  nominal: number;
  kategori: ItemCategory;
  bisa_dicicil: boolean;
  masuk_tabungan: boolean;
  aktif: boolean;
  urutan: number;
};

type SavingsEntry = {
  id: string;
  entitas: Entity;
  anggota_id: string;
  tagihan_id: string | null;
  pembayaran_id: string | null;
  tipe: "setoran_otomatis" | "pemakaian_insidentil" | "penyesuaian";
  nominal: number;
  tanggal: string;
  catatan: string | null;
  created_at: string;
};

const inputClass =
  "min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700";

const categoryLabels: Record<ItemCategory, string> = {
  bulanan: "Bulanan",
  masuk_cicil: "Biaya masuk/cicilan",
  insidentil: "Insidentil",
  tabungan: "Tabungan kegiatan",
};

const profileLabels: Record<PaymentProfile, string> = {
  santri_siswa: "Santri + siswa SMP",
  santri_non_siswa: "Santri saja",
  siswa_saja: "Siswa saja",
  khusus: "Nominal khusus",
};

const paymentPresetOptions: Array<{
  value: PaymentPreset;
  label: string;
  profile: PaymentProfile;
}> = [
  { value: "santri_siswa_400", label: "Santri + siswa SMP - 400.000", profile: "santri_siswa" },
  { value: "santri_400", label: "Santri saja - 400.000", profile: "santri_non_siswa" },
  { value: "santri_340", label: "Santri saja - 340.000", profile: "santri_non_siswa" },
  { value: "siswa_75", label: "Siswa saja + tabungan - 75.000", profile: "siswa_saja" },
  { value: "siswa_60", label: "Siswa saja - 60.000", profile: "siswa_saja" },
  { value: "khusus", label: "Nominal khusus", profile: "khusus" },
];

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function entityLabel(entity: Entity) {
  return entity === "pesantren" ? "Keuangan Terpusat" : "SMP";
}

function getMemberScope(member: Member, entity: Entity) {
  const source = member.sumber || entity;
  if (source === "gabungan") {
    return member.kelas || `Angkatan ${member.tahun_masuk}`;
  }
  return source === "pesantren"
    ? `Angkatan ${member.tahun_masuk}`
    : member.kelas || `Angkatan ${member.tahun_masuk}`;
}

function memberLabel(member: Member) {
  const sourceLabel =
    member.sumber === "gabungan"
      ? "Santri + siswa SMP"
      : member.sumber === "smp"
        ? "Siswa SMP"
        : "Santri";
  return `${member.nama_lengkap} - ${member.nis} (${sourceLabel})`;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function memberMatchKeys(member: Member) {
  const name = normalizeName(member.nama_lengkap);
  return [
    member.nis ? `nis:${member.nis.trim().toLowerCase()}` : "",
    member.tanggal_lahir ? `name_birth:${name}|${member.tanggal_lahir}` : "",
  ].filter(Boolean);
}

function mergeFinanceMembers(santriRows: Member[], siswaRows: Member[]) {
  const santriByKey = new Map<string, Member>();
  const usedSantriIds = new Set<string>();
  const merged: Member[] = [];

  santriRows.forEach((santri) => {
    memberMatchKeys(santri).forEach((key) => santriByKey.set(key, santri));
  });

  siswaRows.forEach((siswa) => {
    const matchedSantri = memberMatchKeys(siswa)
      .map((key) => santriByKey.get(key))
      .find(Boolean);

    if (matchedSantri) {
      usedSantriIds.add(matchedSantri.id);
      merged.push({
        ...matchedSantri,
        kelas: siswa.kelas || matchedSantri.kelas,
        sumber: "gabungan",
        related_ids: [siswa.id],
      });
      return;
    }

    merged.push({ ...siswa, sumber: "smp", related_ids: [] });
  });

  santriRows
    .filter((santri) => !usedSantriIds.has(santri.id))
    .forEach((santri) => merged.push({ ...santri, sumber: "pesantren", related_ids: [] }));

  return merged.sort((a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap));
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function parseAmount(value: string | number | null | undefined) {
  return Number(value || 0);
}

function invoiceLabel(invoice: Invoice) {
  return invoice.nama_tagihan || invoice.jenis?.nama || "Tagihan";
}

function defaultItems(preset: PaymentPreset): SettingItem[] {
  const pesantrenMonthlyBase = [
    ["Listrik", 25000, false],
    ["Makan Bulanan", 280000, false],
    ["Kebersihan", 10000, false],
    ["Air Minum", 10000, false],
  ] as const;
  const smpMonthlyBase = [
    ["Tabungan Wajib", 40000, false],
    ["Infaq Komputer", 20000, false],
  ] as const;
  const pesantrenEntrance = [
    ["Infaq Masuk", 600000],
    ["Jas Almamater", 200000],
    ["Seragam Putih", 120000],
    ["Seragam Sarung", 100000],
    ["Loker", 200000],
  ] as const;
  const smpEntrance = [
    ["Batik", 90000],
    ["Kaos Olahraga", 90000],
    ["Atribut", 20000],
  ] as const;

  const rows: SettingItem[] = [];
  const pushItem = (
    nama: string,
    nominal: number,
    kategori: ItemCategory,
    masukTabungan = false,
  ) => {
    rows.push({
      nama,
      nominal,
      kategori: masukTabungan ? "tabungan" : kategori,
      bisa_dicicil: kategori !== "bulanan",
      masuk_tabungan: masukTabungan,
      aktif: true,
      urutan: rows.length + 1,
    });
  };

  if (preset === "khusus") return rows;

  const isSantri = preset.startsWith("santri");
  const isSiswa = preset === "santri_siswa_400" || preset.startsWith("siswa");

  if (isSantri) {
    pesantrenEntrance.forEach(([nama, nominal]) => pushItem(nama, nominal, "masuk_cicil"));
  }

  if (isSiswa) {
    smpEntrance.forEach(([nama, nominal]) => pushItem(nama, nominal, "masuk_cicil"));
  }

  const monthlyItems = [
    ...(isSantri ? pesantrenMonthlyBase : []),
    ...(preset === "santri_400"
      ? ([["Tabungan Kegiatan", 75000, true]] as const)
      : preset === "santri_340" || preset === "santri_siswa_400" || preset === "siswa_75"
        ? ([["Tabungan Kegiatan", 15000, true]] as const)
        : []),
    ...(isSiswa ? smpMonthlyBase : []),
  ];

  monthlyItems.forEach(([nama, nominal, masukTabungan]) =>
    pushItem(nama, nominal, masukTabungan ? "tabungan" : "bulanan", masukTabungan),
  );
  return rows;
}

function profileForPreset(preset: PaymentPreset) {
  return paymentPresetOptions.find((item) => item.value === preset)?.profile || "khusus";
}

function inferPreset(setting: PaymentSetting, items: SettingItem[]): PaymentPreset {
  const summary = summarizeItems(items);

  if (setting.profil_pembayaran === "santri_siswa") return "santri_siswa_400";
  if (setting.profil_pembayaran === "siswa_saja") {
    return summary.savings > 0 ? "siswa_75" : "siswa_60";
  }
  if (setting.profil_pembayaran === "santri_non_siswa") {
    return summary.monthly >= 400000 ? "santri_400" : "santri_340";
  }

  return "khusus";
}

function presetForMember(member?: Member): PaymentPreset {
  if (member?.sumber === "gabungan") return "santri_siswa_400";
  if (member?.sumber === "smp") return "siswa_60";
  return "santri_340";
}

function summarizeItems(items: SettingItem[]) {
  const activeItems = items.filter((item) => item.aktif);
  return {
    monthly: activeItems
      .filter((item) => item.kategori === "bulanan" || item.kategori === "tabungan")
      .reduce((sum, item) => sum + Number(item.nominal || 0), 0),
    entrance: activeItems
      .filter((item) => item.kategori === "masuk_cicil")
      .reduce((sum, item) => sum + Number(item.nominal || 0), 0),
    savings: activeItems
      .filter((item) => item.masuk_tabungan)
      .reduce((sum, item) => sum + Number(item.nominal || 0), 0),
  };
}

function buildItemNote(items: SettingItem[]) {
  return items
    .map((item) => `${item.nama}: ${formatCurrency(item.nominal)}`)
    .join("; ");
}

function duplicateInvoiceKey(invoice: {
  entitas: Entity;
  anggota_id: string;
  kategori: ItemCategory;
  nama_tagihan: string | null;
  periode: string | null;
}) {
  return [
    invoice.entitas,
    invoice.anggota_id,
    invoice.kategori,
    invoice.nama_tagihan || "",
    invoice.periode || "",
  ].join("|");
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
              rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-4 py-6 text-center text-gray-500">
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

function SubTabBar<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="rounded bg-white p-3 shadow-soft">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={[
              "rounded px-4 py-2 text-sm font-semibold",
              value === item.value
                ? "bg-emerald-800 text-white"
                : "bg-gray-100 text-gray-700",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FinanceModule({
  initialEntity: _initialEntity = "pesantren",
}: {
  initialEntity?: Entity;
}) {
  const { user, profiles } = useAuth();
  const activeEntity: Entity = "pesantren";
  const [tab, setTab] = useState<"pengaturan" | "tagihan" | "bayar" | "tabungan" | "laporan">(
    "pengaturan",
  );
  const [pengaturanTab, setPengaturanTab] = useState<"konfigurasi" | "daftar">(
    "konfigurasi",
  );
  const [tagihanTab, setTagihanTab] = useState<"generate" | "insidentil" | "daftar">(
    "generate",
  );
  const [bayarTab, setBayarTab] = useState<"catat" | "riwayat">("catat");
  const [tabunganTab, setTabunganTab] = useState<"catat" | "riwayat">("catat");
  const [laporanTab, setLaporanTab] = useState<"ringkasan" | "pembayaran" | "tunggakan">(
    "ringkasan",
  );
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<PaymentSetting[]>([]);
  const [settingItems, setSettingItems] = useState<SettingItem[]>([]);
  const [savingsEntries, setSavingsEntries] = useState<SavingsEntry[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedConfigMember, setSelectedConfigMember] = useState("");
  const [configPreset, setConfigPreset] = useState<PaymentPreset>("santri_siswa_400");
  const [configProfile, setConfigProfile] = useState<PaymentProfile>("santri_siswa");
  const [configNote, setConfigNote] = useState("");
  const [configActive, setConfigActive] = useState(true);
  const [draftItems, setDraftItems] = useState<SettingItem[]>([]);
  const [invoiceForm, setInvoiceForm] = useState({
    mode: "massal",
    scope: "semua",
    anggota_id: "",
    kategori: "bulanan",
    periode: currentMonth(),
    jatuh_tempo: "",
  });
  const [typeForm, setTypeForm] = useState<Partial<BillType>>({
    nama: "",
    nominal: 0,
    berlaku_untuk: "insidentil",
  });
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    tunai: "",
    dari_tabungan: "",
    tanggal_bayar: new Date().toISOString().slice(0, 10),
    catatan: "",
  });
  const [savingsMember, setSavingsMember] = useState("");
  const [savingsForm, setSavingsForm] = useState({
    tipe: "setoran_otomatis",
    nominal: "",
    tanggal: new Date().toISOString().slice(0, 10),
    catatan: "",
  });
  const [report, setReport] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    kategori: "",
    scope: "semua",
  });
  const activeRole = profiles.pesantren?.role || profiles.smp?.role || "";
  const canRetractInvoice = activeRole === "superadmin" || activeRole === "bendahara";

  async function loadData(entity = activeEntity) {
    const [typeResult, santriResult, siswaResult, invoiceResult, settingResult, savingsResult] =
      await Promise.all([
        supabase
          .from("keu_jenis_tagihan")
          .select("*")
          .eq("entitas", entity)
          .order("created_at", { ascending: false }),
        supabase
          .from("pp_santri")
          .select("*")
          .in("status", ["aktif", "alumni", "keluar"])
          .order("nama_lengkap"),
        supabase
          .from("smp_siswa")
          .select("*")
          .in("status", ["aktif", "alumni", "keluar"])
          .order("nama_lengkap"),
        supabase
          .from("keu_tagihan")
          .select("*, jenis:keu_jenis_tagihan(nama)")
          .eq("entitas", entity)
          .order("created_at", { ascending: false }),
        supabase
          .from("keu_pengaturan_pembayaran")
          .select("*")
          .eq("entitas", entity)
          .order("updated_at", { ascending: false }),
        supabase
          .from("keu_tabungan_kegiatan")
          .select("*")
          .eq("entitas", entity)
          .order("tanggal", { ascending: false }),
      ]);

    const invoiceRows = (invoiceResult.data || []) as Invoice[];
    const settingRows = (settingResult.data || []) as PaymentSetting[];
    const paymentResult = invoiceRows.length
      ? await supabase
          .from("keu_pembayaran")
          .select("*")
          .in(
            "tagihan_id",
            invoiceRows.map((invoice) => invoice.id),
          )
          .order("tanggal_bayar", { ascending: false })
      : { data: [] };
    const itemResult = settingRows.length
      ? await supabase
          .from("keu_pengaturan_item")
          .select("*")
          .in(
            "pengaturan_id",
            settingRows.map((setting) => setting.id),
          )
          .order("urutan", { ascending: true })
      : { data: [] };

    setBillTypes((typeResult.data || []) as BillType[]);
    setMembers(
      mergeFinanceMembers(
        (santriResult.data || []) as Member[],
        (siswaResult.data || []) as Member[],
      ),
    );
    setInvoices(invoiceRows);
    setPayments((paymentResult.data || []) as Payment[]);
    setSettings(settingRows);
    setSettingItems((itemResult.data || []) as SettingItem[]);
    setSavingsEntries((savingsResult.data || []) as SavingsEntry[]);
  }

  useEffect(() => {
    loadData(activeEntity);
    setSelectedConfigMember("");
    setSelectedMember("");
    setSelectedInvoice("");
    setSavingsMember("");
    setMessage("");
  }, [activeEntity]);

  const filteredMembers = useMemo(() => {
    return members.filter(
      (member) =>
        member.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
        member.nis.toLowerCase().includes(search.toLowerCase()),
    );
  }, [members, search]);

  function memberIdsFor(memberId: string) {
    const member = members.find((item) => item.id === memberId);
    return member ? [member.id, ...(member.related_ids || [])] : [memberId];
  }

  function memberByAnyId(memberId?: string | null) {
    if (!memberId) return undefined;
    return members.find(
      (member) => member.id === memberId || (member.related_ids || []).includes(memberId),
    );
  }

  const scopes = useMemo(() => {
    const values = members.map((member) => getMemberScope(member, activeEntity));
    return ["semua", ...Array.from(new Set(values))];
  }, [activeEntity, members]);

  const selectedConfigMemberIds = memberIdsFor(selectedConfigMember);
  const selectedSetting = settings.find((setting) =>
    selectedConfigMemberIds.includes(setting.anggota_id),
  );

  useEffect(() => {
    if (!selectedConfigMember) {
      setDraftItems([]);
      return;
    }

    const selectedMemberRow = members.find((member) => member.id === selectedConfigMember);
    const selectedMemberIds = memberIdsFor(selectedConfigMember);
    const existing = settings.find((setting) => selectedMemberIds.includes(setting.anggota_id));
    if (existing) {
      const existingItems = settingItems
        .filter((item) => item.pengaturan_id === existing.id)
        .map((item) => ({ ...item }));
      setConfigPreset(inferPreset(existing, existingItems));
      setConfigProfile(existing.profil_pembayaran);
      setConfigNote(existing.catatan || "");
      setConfigActive(existing.aktif);
      setDraftItems(existingItems);
      return;
    }

    const nextPreset = presetForMember(selectedMemberRow);
    const nextProfile = profileForPreset(nextPreset);
    setConfigPreset(nextPreset);
    setConfigProfile(nextProfile);
    setConfigNote("");
    setConfigActive(true);
    setDraftItems(defaultItems(nextPreset));
  }, [activeEntity, selectedConfigMember, settingItems, settings]);

  const settingSummary = summarizeItems(draftItems);

  const selectedMemberInvoices = invoices.filter(
    (invoice) => memberIdsFor(selectedMember).includes(invoice.anggota_id) && !invoice.ditarik_at,
  );
  const activeInvoices = invoices.filter((invoice) => !invoice.ditarik_at);
  const visibleActiveInvoices = activeInvoices.slice(0, 80);
  const visibleInvoiceIds = visibleActiveInvoices.map((invoice) => invoice.id);
  const allVisibleInvoicesSelected =
    visibleInvoiceIds.length > 0 &&
    visibleInvoiceIds.every((id) => selectedInvoiceIds.includes(id));
  const selectedInvoiceRow = invoices.find((invoice) => invoice.id === selectedInvoice);
  const selectedInvoicePayments = payments.filter(
    (payment) => payment.tagihan_id === selectedInvoice,
  );
  const selectedPaid = selectedInvoicePayments.reduce(
    (sum, payment) => sum + Number(payment.jumlah_bayar || 0),
    0,
  );
  const selectedInvoiceSavingsCredited = savingsEntries
    .filter(
      (entry) =>
        entry.tagihan_id === selectedInvoice &&
        entry.tipe === "setoran_otomatis",
    )
    .reduce((sum, entry) => sum + Number(entry.nominal || 0), 0);
  const selectedRemaining = Math.max(
    Number(selectedInvoiceRow?.nominal || 0) - selectedPaid,
    0,
  );
  const selectedSavingsBalance = savingsEntries
    .filter((entry) => memberIdsFor(selectedMember).includes(entry.anggota_id))
    .reduce((sum, entry) => sum + Number(entry.nominal || 0), 0);
  const savingsTabBalance = savingsEntries
    .filter((entry) => memberIdsFor(savingsMember).includes(entry.anggota_id))
    .reduce((sum, entry) => sum + Number(entry.nominal || 0), 0);

  const reportInvoices = invoices.filter((invoice) => {
    if (invoice.ditarik_at) return false;
    const categoryMatch = report.kategori ? invoice.kategori === report.kategori : true;
    const member = memberByAnyId(invoice.anggota_id);
    const scopeMatch =
      report.scope === "semua" || (member ? getMemberScope(member, activeEntity) === report.scope : false);
    return categoryMatch && scopeMatch;
  });
  const reportPayments = payments.filter(
    (payment) =>
      payment.tanggal_bayar >= report.from &&
      payment.tanggal_bayar <= report.to &&
      reportInvoices.some((invoice) => invoice.id === payment.tagihan_id),
  );
  const arrears = reportInvoices.filter((invoice) => invoice.status !== "lunas");
  const totalSavings = savingsEntries.reduce(
    (sum, entry) => sum + Number(entry.nominal || 0),
    0,
  );

  function updateDraftItem(index: number, changes: Partial<SettingItem>) {
    setDraftItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    );
  }

  function addDraftItem() {
    setDraftItems((items) => [
      ...items,
      {
        nama: "",
        nominal: 0,
        kategori: "insidentil",
        bisa_dicicil: true,
        masuk_tabungan: false,
        aktif: true,
        urutan: items.length + 1,
      },
    ]);
  }

  async function savePaymentSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConfigMember) {
      setMessage("Pilih anggota dulu sebelum menyimpan pengaturan.");
      return;
    }

    const cleanItems = draftItems
      .map((item, index) => ({
        ...item,
        nama: item.nama.trim(),
        nominal: Number(item.nominal || 0),
        urutan: index + 1,
      }))
      .filter((item) => item.nama && item.nominal >= 0);
    const summary = summarizeItems(cleanItems);
    const payload = {
      entitas: activeEntity,
      anggota_id: selectedConfigMember,
      profil_pembayaran: configProfile,
      total_bulanan: summary.monthly,
      tabungan_bulanan: summary.savings,
      aktif: configActive,
      catatan: configNote || null,
    };

    const settingResult = await supabase
      .from("keu_pengaturan_pembayaran")
      .upsert(payload, { onConflict: "entitas,anggota_id" })
      .select()
      .single();

    if (settingResult.error || !settingResult.data) {
      setMessage(settingResult.error?.message || "Pengaturan gagal disimpan.");
      return;
    }

    const settingId = (settingResult.data as PaymentSetting).id;
    await supabase.from("keu_pengaturan_item").delete().eq("pengaturan_id", settingId);

    const itemResult = cleanItems.length
      ? await supabase.from("keu_pengaturan_item").insert(
          cleanItems.map((item) => ({
            pengaturan_id: settingId,
            nama: item.nama,
            nominal: item.nominal,
            kategori: item.kategori,
            bisa_dicicil: item.bisa_dicicil,
            masuk_tabungan: item.masuk_tabungan,
            aktif: item.aktif,
            urutan: item.urutan,
          })),
        )
      : { error: null };

    setMessage(
      itemResult.error
        ? itemResult.error.message
        : `Pengaturan tersimpan. Bulanan ${formatCurrency(summary.monthly)}, tabungan ${formatCurrency(summary.savings)}.`,
    );
    loadData();
  }

  function editPaymentSetting(member: Member) {
    setSelectedConfigMember(member.id);
    setPengaturanTab("konfigurasi");
    setMessage("Konfigurasi dimuat. Silakan ubah lalu simpan.");
  }

  async function deletePaymentSetting(setting: PaymentSetting, memberName: string) {
    const confirmed = window.confirm(
      `Hapus konfigurasi pembayaran ${memberName}? Tagihan yang sudah pernah dibuat tidak ikut dihapus.`,
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("keu_pengaturan_pembayaran")
      .delete()
      .eq("id", setting.id);

    if (!error && selectedSetting?.id === setting.id) {
      setSelectedConfigMember("");
      setDraftItems([]);
      setConfigNote("");
      setConfigActive(true);
      setConfigPreset("santri_siswa_400");
      setConfigProfile("santri_siswa");
    }

    setMessage(error ? error.message : "Konfigurasi pembayaran dihapus.");
    loadData();
  }

  async function saveBillType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      entitas: activeEntity,
      nama: typeForm.nama,
      nominal: Number(typeForm.nominal || 0),
      berlaku_untuk: typeForm.berlaku_untuk || "insidentil",
    };
    const result = typeForm.id
      ? await supabase.from("keu_jenis_tagihan").update(payload).eq("id", typeForm.id)
      : await supabase.from("keu_jenis_tagihan").insert(payload);
    setMessage(result.error ? result.error.message : "Jenis tagihan insidentil tersimpan.");
    setTypeForm({ nama: "", nominal: 0, berlaku_untuk: "insidentil" });
    loadData();
  }

  async function deleteBillType(id: string) {
    const { error } = await supabase.from("keu_jenis_tagihan").delete().eq("id", id);
    setMessage(error ? error.message : "Jenis tagihan insidentil dihapus.");
    loadData();
  }

  async function generateInvoices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const targetMembers =
      invoiceForm.mode === "individual"
        ? members.filter((member) => member.id === invoiceForm.anggota_id)
        : members.filter((member) =>
            invoiceForm.scope === "semua"
              ? member.status === "aktif"
              : member.status === "aktif" &&
                getMemberScope(member, activeEntity) === invoiceForm.scope,
          );

    const rows = targetMembers.flatMap((member) => {
      const setting = settings.find(
        (item) => [member.id, ...(member.related_ids || [])].includes(item.anggota_id) && item.aktif,
      );
      if (!setting) return [];
      const activeItems = settingItems.filter(
        (item) => item.pengaturan_id === setting.id && item.aktif,
      );
      const monthlyItems = activeItems.filter(
        (item) => item.kategori === "bulanan" || item.kategori === "tabungan",
      );
      const entranceItems = activeItems.filter(
        (item) => item.kategori === "masuk_cicil",
      );
      const generatedRows = [];

      if (
        (invoiceForm.kategori === "bulanan" || invoiceForm.kategori === "semua") &&
        monthlyItems.length
      ) {
        const nominal = monthlyItems.reduce(
          (sum, item) => sum + Number(item.nominal || 0),
          0,
        );
        generatedRows.push({
          entitas: activeEntity,
          anggota_id: member.id,
          jenis_tagihan_id: null,
          nama_tagihan: `Syahriyah ${invoiceForm.periode || ""}`.trim(),
          catatan: buildItemNote(monthlyItems),
          kategori: "bulanan" as ItemCategory,
          bisa_dicicil: true,
          nominal,
          status: "belum_lunas" as const,
          jatuh_tempo: invoiceForm.jatuh_tempo || null,
          periode: invoiceForm.periode || null,
          sumber_pengaturan_id: setting.id,
          tabungan_target: monthlyItems
            .filter((item) => item.masuk_tabungan)
            .reduce((sum, item) => sum + Number(item.nominal || 0), 0),
        });
      }

      if (
        (invoiceForm.kategori === "masuk_cicil" || invoiceForm.kategori === "semua") &&
        entranceItems.length
      ) {
        const nominal = entranceItems.reduce(
          (sum, item) => sum + Number(item.nominal || 0),
          0,
        );
        generatedRows.push({
          entitas: activeEntity,
          anggota_id: member.id,
          jenis_tagihan_id: null,
          nama_tagihan: `Biaya Masuk ${invoiceForm.periode || ""}`.trim(),
          catatan: buildItemNote(entranceItems),
          kategori: "masuk_cicil" as ItemCategory,
          bisa_dicicil: true,
          nominal,
          status: "belum_lunas" as const,
          jatuh_tempo: invoiceForm.jatuh_tempo || null,
          periode: invoiceForm.periode || null,
          sumber_pengaturan_id: setting.id,
          tabungan_target: 0,
        });
      }

      return generatedRows;
    });

    if (!rows.length) {
      setMessage("Belum ada pengaturan aktif yang cocok untuk dibuatkan tagihan.");
      return;
    }

    const existingKeys = new Set(
      invoices
        .filter((invoice) => !invoice.ditarik_at)
        .map((invoice) => duplicateInvoiceKey(invoice)),
    );
    const uniqueRows = rows.filter((row) => !existingKeys.has(duplicateInvoiceKey(row)));
    const skippedRows = rows.length - uniqueRows.length;

    if (!uniqueRows.length) {
      setMessage("Tagihan untuk orang dan periode ini sudah ada, jadi tidak dibuat dobel.");
      return;
    }

    const { error } = await supabase.from("keu_tagihan").insert(uniqueRows);
    setMessage(
      error
        ? error.message
        : `${uniqueRows.length} tagihan dibuat. ${skippedRows} dilewati karena sudah ada.`,
    );
    loadData();
  }

  async function createIncidentalInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const type = billTypes.find((item) => item.id === typeForm.id);
    if (!type || !invoiceForm.anggota_id) {
      setMessage("Pilih jenis insidentil dan anggota dulu.");
      return;
    }

    const nextInvoice = {
      entitas: activeEntity,
      anggota_id: invoiceForm.anggota_id,
      kategori: "insidentil" as ItemCategory,
      nama_tagihan: type.nama,
      periode: invoiceForm.periode || null,
    };
    const alreadyExists = invoices.some(
      (invoice) =>
        !invoice.ditarik_at &&
        duplicateInvoiceKey(invoice) === duplicateInvoiceKey(nextInvoice),
    );
    if (alreadyExists) {
      setMessage("Tagihan insidentil ini sudah ada untuk anggota dan periode yang sama.");
      return;
    }

    const { error } = await supabase.from("keu_tagihan").insert({
      entitas: activeEntity,
      anggota_id: invoiceForm.anggota_id,
      jenis_tagihan_id: type.id,
      nama_tagihan: type.nama,
      catatan: "Tagihan insidentil dari bendahara.",
      kategori: "insidentil",
      bisa_dicicil: true,
      nominal: type.nominal,
      status: "belum_lunas",
      jatuh_tempo: invoiceForm.jatuh_tempo || null,
      periode: invoiceForm.periode || null,
      tabungan_target: 0,
    });

    setMessage(error ? error.message : "Tagihan insidentil dibuat.");
    loadData();
  }

  function toggleInvoiceSelection(id: string, checked: boolean) {
    setSelectedInvoiceIds((ids) =>
      checked ? Array.from(new Set([...ids, id])) : ids.filter((item) => item !== id),
    );
  }

  function toggleAllVisibleInvoices(checked: boolean) {
    setSelectedInvoiceIds((ids) =>
      checked
        ? Array.from(new Set([...ids, ...visibleInvoiceIds]))
        : ids.filter((id) => !visibleInvoiceIds.includes(id)),
    );
  }

  async function retractInvoiceWithoutPrompt(invoice: Invoice) {
    if (!canRetractInvoice) {
      return { error: "Hanya superadmin dan bendahara yang bisa menarik tagihan." };
    }

    const savingsCredited = savingsEntries
      .filter(
        (entry) =>
          entry.tagihan_id === invoice.id && entry.tipe === "setoran_otomatis",
      )
      .reduce((sum, entry) => sum + Number(entry.nominal || 0), 0);

    const { error } = await supabase.rpc("tarik_keu_tagihan", {
      p_tagihan_id: invoice.id,
      p_catatan: "Ditarik oleh bendahara karena koreksi tagihan.",
    });

    if (error) {
      return { error: error.message };
    }

    if (savingsCredited > 0) {
      const adjustment = await supabase.from("keu_tabungan_kegiatan").insert({
        entitas: activeEntity,
        anggota_id: invoice.anggota_id,
        tagihan_id: invoice.id,
        tipe: "penyesuaian",
        nominal: -savingsCredited,
        tanggal: new Date().toISOString().slice(0, 10),
        catatan: `Pembalik tabungan karena tagihan ${invoiceLabel(invoice)} ditarik.`,
        dibuat_oleh: user?.id || null,
      });
      if (adjustment.error) {
        return { error: adjustment.error.message };
      }
    }

    return { error: null };
  }

  async function retractInvoice(invoice: Invoice) {
    if (!canRetractInvoice) {
      setMessage("Hanya superadmin dan bendahara yang bisa menarik tagihan.");
      return;
    }

    const paid = payments
      .filter((payment) => payment.tagihan_id === invoice.id)
      .reduce((sum, payment) => sum + Number(payment.jumlah_bayar || 0), 0);

    const confirmed = window.confirm(
      paid > 0
        ? `Tarik tagihan ${invoiceLabel(invoice)} yang sudah punya pembayaran ${formatCurrency(
            paid,
          )}? Tagihan dan pembayarannya tidak akan dihitung di laporan aktif.`
        : `Tarik tagihan ${invoiceLabel(invoice)}? Tagihan tidak akan dihitung lagi.`,
    );
    if (!confirmed) return;

    const result = await retractInvoiceWithoutPrompt(invoice);

    setMessage(
      result.error
        ? `Gagal tarik tagihan: ${result.error}. Pastikan SQL migration terbaru sudah dijalankan.`
        : paid > 0
          ? "Tagihan ditarik. Pembayaran lama disimpan sebagai jejak, tapi tidak dihitung di laporan aktif."
          : "Tagihan berhasil ditarik dari perhitungan.",
    );
    setSelectedInvoiceIds((ids) => ids.filter((id) => id !== invoice.id));
    loadData();
  }

  async function retractSelectedInvoices() {
    if (!canRetractInvoice) {
      setMessage("Hanya superadmin dan bendahara yang bisa menarik tagihan.");
      return;
    }

    const targets = activeInvoices.filter((invoice) =>
      selectedInvoiceIds.includes(invoice.id),
    );
    if (!targets.length) {
      setMessage("Pilih tagihan yang mau ditarik terlebih dahulu.");
      return;
    }

    const paidTotal = targets.reduce((sum, invoice) => {
      return (
        sum +
        payments
          .filter((payment) => payment.tagihan_id === invoice.id)
          .reduce((total, payment) => total + Number(payment.jumlah_bayar || 0), 0)
      );
    }, 0);
    const confirmed = window.confirm(
      `Tarik ${targets.length} tagihan terpilih?${
        paidTotal > 0
          ? ` Total pembayaran yang menjadi jejak lama: ${formatCurrency(paidTotal)}.`
          : ""
      }`,
    );
    if (!confirmed) return;

    let success = 0;
    const errors: string[] = [];
    for (const invoice of targets) {
      const result = await retractInvoiceWithoutPrompt(invoice);
      if (result.error) {
        errors.push(`${invoiceLabel(invoice)}: ${result.error}`);
      } else {
        success += 1;
      }
    }

    setSelectedInvoiceIds((ids) =>
      ids.filter((id) => !targets.some((invoice) => invoice.id === id)),
    );
    setMessage(
      errors.length
        ? `${success} tagihan ditarik, ${errors.length} gagal. ${errors[0]}`
        : `${success} tagihan berhasil ditarik.`,
    );
    loadData();
  }

  async function makeReceiptPdf(payment: {
    jumlah_bayar: number;
    tanggal_bayar: string;
    catatan?: string | null;
  }) {
    if (!selectedInvoiceRow) return null;
    const member = memberByAnyId(selectedInvoiceRow.anggota_id);
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`KUITANSI PEMBAYARAN ${entityLabel(activeEntity).toUpperCase()}`, 105, 16, {
      align: "center",
    });
    doc.setFontSize(10);
    doc.text(`Tanggal: ${formatDate(payment.tanggal_bayar)}`, 14, 32);
    doc.text(`Nama: ${member?.nama_lengkap || "-"}`, 14, 42);
    doc.text(`NIS: ${member?.nis || "-"}`, 14, 50);
    doc.text(`Jenis Tagihan: ${invoiceLabel(selectedInvoiceRow)}`, 14, 58);
    doc.text(`Kategori: ${categoryLabels[selectedInvoiceRow.kategori]}`, 14, 66);
    doc.text(`Jumlah Bayar: ${formatCurrency(payment.jumlah_bayar)}`, 14, 74);
    doc.text(`Catatan: ${payment.catatan || "-"}`, 14, 82);
    doc.text("Bendahara", 150, 118);
    doc.save(`kuitansi-${member?.nis || "pembayaran"}-${payment.tanggal_bayar}.pdf`);

    const blob = doc.output("blob");
    const path = `${activeEntity}/${Date.now()}-${member?.nis || "kuitansi"}.pdf`;
    const upload = await supabase.storage
      .from("kuitansi-keuangan")
      .upload(path, blob, { contentType: "application/pdf" });
    return upload.error ? null : path;
  }

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedInvoiceRow) {
      setMessage("Pilih tagihan terlebih dahulu.");
      return;
    }

    const cashAmount = parseAmount(paymentForm.tunai);
    const savingsAmount = parseAmount(paymentForm.dari_tabungan);
    const totalAmount = cashAmount + savingsAmount;
    if (totalAmount <= 0) {
      setMessage("Jumlah pembayaran harus lebih dari 0.");
      return;
    }
    if (totalAmount > selectedRemaining) {
      setMessage("Jumlah pembayaran melebihi sisa tagihan.");
      return;
    }
    if (savingsAmount > 0 && Number(selectedInvoiceRow.tabungan_target || 0) > 0) {
      setMessage("Syahriyah yang berisi tabungan kegiatan tidak bisa dibayar dari saldo tabungan.");
      return;
    }
    if (savingsAmount > selectedSavingsBalance) {
      setMessage("Saldo tabungan kegiatan tidak cukup.");
      return;
    }

    const catatanParts = [
      paymentForm.catatan,
      savingsAmount > 0 ? `Dari tabungan: ${formatCurrency(savingsAmount)}` : "",
      cashAmount > 0 ? `Tunai/transfer: ${formatCurrency(cashAmount)}` : "",
    ].filter(Boolean);

    const receiptPath = await makeReceiptPdf({
      jumlah_bayar: totalAmount,
      tanggal_bayar: paymentForm.tanggal_bayar,
      catatan: catatanParts.join(" | ") || null,
    });

    const paymentResult = await supabase
      .from("keu_pembayaran")
      .insert({
        tagihan_id: selectedInvoiceRow.id,
        jumlah_bayar: totalAmount,
        tanggal_bayar: paymentForm.tanggal_bayar,
        bendahara_id: user?.id || null,
        catatan: catatanParts.join(" | ") || null,
        kuitansi_url: receiptPath,
      })
      .select()
      .single();

    if (!paymentResult.error) {
      const paymentId = (paymentResult.data as Payment).id;
      const ledgerRows = [];
      const savingsTarget = Number(selectedInvoiceRow.tabungan_target || 0);
      const savingsRemaining = Math.max(
        savingsTarget - selectedInvoiceSavingsCredited,
        0,
      );
      const willBePaidOff = selectedPaid + totalAmount >= Number(selectedInvoiceRow.nominal || 0);
      const proportionalSavings = selectedInvoiceRow.nominal
        ? Math.floor((totalAmount / Number(selectedInvoiceRow.nominal)) * savingsTarget)
        : 0;
      const savingsCredit = willBePaidOff
        ? savingsRemaining
        : Math.min(savingsRemaining, proportionalSavings);

      if (savingsCredit > 0) {
        ledgerRows.push({
          entitas: activeEntity,
          anggota_id: selectedInvoiceRow.anggota_id,
          tagihan_id: selectedInvoiceRow.id,
          pembayaran_id: paymentId,
          tipe: "setoran_otomatis",
          nominal: savingsCredit,
          tanggal: paymentForm.tanggal_bayar,
          catatan: `Setoran tabungan dari ${invoiceLabel(selectedInvoiceRow)}`,
          dibuat_oleh: user?.id || null,
        });
      }
      if (savingsAmount > 0) {
        ledgerRows.push({
          entitas: activeEntity,
          anggota_id: selectedInvoiceRow.anggota_id,
          tagihan_id: selectedInvoiceRow.id,
          pembayaran_id: paymentId,
          tipe: "pemakaian_insidentil",
          nominal: -savingsAmount,
          tanggal: paymentForm.tanggal_bayar,
          catatan: `Dipakai untuk ${invoiceLabel(selectedInvoiceRow)}`,
          dibuat_oleh: user?.id || null,
        });
      }
      if (ledgerRows.length) {
        await supabase.from("keu_tabungan_kegiatan").insert(ledgerRows);
      }
      await supabase.rpc("sync_keu_tagihan_status", {
        p_tagihan_id: selectedInvoiceRow.id,
      });
    }

    setMessage(
      paymentResult.error
        ? paymentResult.error.message
        : "Pembayaran tercatat, kuitansi dibuat, dan saldo tabungan tersinkron.",
    );
    setPaymentForm({
      tunai: "",
      dari_tabungan: "",
      tanggal_bayar: new Date().toISOString().slice(0, 10),
      catatan: "",
    });
    loadData();
  }

  async function saveSavingsAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!savingsMember) {
      setMessage("Pilih anggota untuk pencatatan tabungan.");
      return;
    }
    const rawAmount = parseAmount(savingsForm.nominal);
    if (rawAmount <= 0) {
      setMessage("Nominal tabungan harus lebih dari 0.");
      return;
    }
    const isWithdrawal = savingsForm.tipe === "pemakaian_insidentil";
    if (isWithdrawal && rawAmount > savingsTabBalance) {
      setMessage("Saldo tabungan tidak cukup untuk pemakaian ini.");
      return;
    }

    const { error } = await supabase.from("keu_tabungan_kegiatan").insert({
      entitas: activeEntity,
      anggota_id: savingsMember,
      tipe: savingsForm.tipe,
      nominal: isWithdrawal ? -rawAmount : rawAmount,
      tanggal: savingsForm.tanggal,
      catatan: savingsForm.catatan || null,
      dibuat_oleh: user?.id || null,
    });

    setMessage(error ? error.message : "Catatan tabungan kegiatan tersimpan.");
    setSavingsForm({
      tipe: "setoran_otomatis",
      nominal: "",
      tanggal: new Date().toISOString().slice(0, 10),
      catatan: "",
    });
    loadData();
  }

  function exportCsv() {
    const csv = [
      ["Entitas", "Tanggal", "NIS", "Nama", "Jenis", "Kategori", "Jumlah Bayar", "Status Tagihan"].join(","),
      ...reportPayments.map((payment) => {
        const invoice = invoices.find((item) => item.id === payment.tagihan_id);
        const member = memberByAnyId(invoice?.anggota_id);
        return [
          entityLabel(activeEntity),
          payment.tanggal_bayar,
          member?.nis || "",
          member?.nama_lengkap || "",
          invoice ? invoiceLabel(invoice) : "",
          invoice ? categoryLabels[invoice.kategori] : "",
          payment.jumlah_bayar,
          invoice?.status || "",
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-keuangan-${activeEntity}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.text(`Laporan Keuangan ${entityLabel(activeEntity)}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Periode: ${formatDate(report.from)} - ${formatDate(report.to)}`, 14, 24);
    let y = 36;
    reportPayments.forEach((payment, index) => {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      const invoice = invoices.find((item) => item.id === payment.tagihan_id);
      const member = memberByAnyId(invoice?.anggota_id);
      doc.text(
        `${index + 1}. ${payment.tanggal_bayar} - ${member?.nama_lengkap || "-"} - ${
          invoice ? invoiceLabel(invoice) : "-"
        } - ${formatCurrency(payment.jumlah_bayar)}`,
        14,
        y,
      );
      y += 7;
    });
    y += 6;
    doc.text(
      `Total Pembayaran: ${formatCurrency(
        reportPayments.reduce((sum, payment) => sum + Number(payment.jumlah_bayar), 0),
      )}`,
      14,
      y,
    );
    doc.save(`laporan-keuangan-${activeEntity}.pdf`);
  }

  return (
    <section className="grid gap-5">
      <div className="rounded bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-dark">
          Modul Keuangan Terpusat
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-gray-950">
          Keuangan, Tagihan & Tabungan Kegiatan
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Bendahara mengatur paket pembayaran tiap orang terlebih dahulu, lalu tagihan
          bulanan, biaya masuk cicilan, dan saldo tabungan kegiatan mengikuti pengaturan itu.
        </p>
      </div>

      <div className="rounded bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
            Keuangan Terpusat
          </span>
          <span className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
            Satu tagihan bulanan untuk santri dan siswa
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["pengaturan", "Pengaturan Orang", Settings],
            ["tagihan", "Buat Tagihan", CalendarPlus],
            ["bayar", "Pembayaran", FileText],
            ["tabungan", "Tabungan", Wallet],
            ["laporan", "Rekap & Laporan", FileText],
          ].map(([key, label, Icon]) => {
            const TabIcon = Icon as typeof FileText;
            return (
              <button
                key={key as string}
                type="button"
                onClick={() => setTab(key as typeof tab)}
                className={[
                  "inline-flex items-center rounded px-4 py-2 text-sm font-semibold",
                  tab === key ? "bg-gold text-emerald-950" : "bg-gray-100 text-gray-700",
                ].join(" ")}
              >
                <TabIcon className="mr-2" size={16} />
                {label as string}
              </button>
            );
          })}
        </div>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </div>

      {tab === "pengaturan" ? (
        <div className="grid gap-4">
          <SubTabBar
            value={pengaturanTab}
            onChange={setPengaturanTab}
            items={[
              { value: "konfigurasi", label: "Pengaturan & Komponen" },
              { value: "daftar", label: "Daftar Hasil Konfigurasi" },
            ]}
          />
          {pengaturanTab === "konfigurasi" ? (
            <div className="grid gap-5 xl:grid-cols-[460px_1fr]">
              <form onSubmit={savePaymentSetting} className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Pengaturan Pembayaran per Orang</h2>
            <label className="relative mt-4 block">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama atau NIS"
                className={`${inputClass} w-full pl-10`}
              />
            </label>
            <select
              value={selectedConfigMember}
              onChange={(event) => setSelectedConfigMember(event.target.value)}
              className={`${inputClass} mt-3 w-full`}
            >
              <option value="">Pilih anggota</option>
              {filteredMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {memberLabel(member)}
                </option>
              ))}
            </select>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <select
                value={configPreset}
                onChange={(event) => {
                  const preset = event.target.value as PaymentPreset;
                  setConfigPreset(preset);
                  setConfigProfile(profileForPreset(preset));
                  setDraftItems(defaultItems(preset));
                }}
                className={inputClass}
              >
                {paymentPresetOptions.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <label className="flex min-h-11 items-center gap-2 rounded border border-gray-200 px-3 text-sm">
                <input
                  type="checkbox"
                  checked={configActive}
                  onChange={(event) => setConfigActive(event.target.checked)}
                />
                Aktif ditagihkan
              </label>
            </div>
            <textarea
              value={configNote}
              onChange={(event) => setConfigNote(event.target.value)}
              placeholder="Catatan khusus, subsidi, atau alasan nominal berbeda"
              className={`${inputClass} mt-3 min-h-24 w-full py-3`}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded bg-emerald-50 p-3">
                <p className="text-xs text-emerald-900">Bulanan</p>
                <p className="font-semibold text-emerald-950">
                  {formatCurrency(settingSummary.monthly)}
                </p>
              </div>
              <div className="rounded bg-gold/20 p-3">
                <p className="text-xs text-gold-dark">Tabungan/bln</p>
                <p className="font-semibold text-gray-950">
                  {formatCurrency(settingSummary.savings)}
                </p>
              </div>
              <div className="rounded bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Biaya masuk</p>
                <p className="font-semibold text-gray-950">
                  {formatCurrency(settingSummary.entrance)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                <Save className="mr-2" size={17} />
                Simpan Pengaturan
              </button>
              <button
                type="button"
                onClick={addDraftItem}
                className="inline-flex items-center rounded border px-4 py-2 text-sm font-semibold"
              >
                <Plus className="mr-2" size={17} />
                Tambah Item
              </button>
            </div>
              </form>

              <div className="grid gap-4">
            <div className="overflow-hidden rounded bg-white shadow-soft">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold">Komponen Pembayaran</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.12em] text-gray-500">
                    <tr>
                      <th className="px-3 py-3">Nama</th>
                      <th className="px-3 py-3">Nominal</th>
                      <th className="px-3 py-3">Kategori</th>
                      <th className="px-3 py-3">Cicil</th>
                      <th className="px-3 py-3">Saldo</th>
                      <th className="px-3 py-3">Aktif</th>
                      <th className="px-3 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {draftItems.length ? (
                      draftItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2">
                            <input
                              value={item.nama}
                              onChange={(event) =>
                                updateDraftItem(index, { nama: event.target.value })
                              }
                              className={`${inputClass} w-48`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.nominal}
                              onChange={(event) =>
                                updateDraftItem(index, {
                                  nominal: Number(event.target.value),
                                })
                              }
                              className={`${inputClass} w-36`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.kategori}
                              onChange={(event) => {
                                const kategori = event.target.value as ItemCategory;
                                updateDraftItem(index, {
                                  kategori,
                                  masuk_tabungan:
                                    kategori === "tabungan" ? item.masuk_tabungan : false,
                                });
                              }}
                              className={`${inputClass} w-44`}
                            >
                              {(Object.keys(categoryLabels) as ItemCategory[]).map(
                                (category) => (
                                  <option key={category} value={category}>
                                    {categoryLabels[category]}
                                  </option>
                                ),
                              )}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={item.bisa_dicicil}
                              onChange={(event) =>
                                updateDraftItem(index, {
                                  bisa_dicicil: event.target.checked,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={item.masuk_tabungan}
                              onChange={(event) =>
                                updateDraftItem(index, {
                                  masuk_tabungan: event.target.checked,
                                  kategori: event.target.checked ? "tabungan" : item.kategori,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={item.aktif}
                              onChange={(event) =>
                                updateDraftItem(index, { aktif: event.target.checked })
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDraftItems((items) =>
                                  items.filter((_, itemIndex) => itemIndex !== index),
                                )
                              }
                              className="rounded border px-3 py-2 text-red-600"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                          Pilih anggota atau terapkan template pembayaran.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
              </div>
            </div>
          ) : (
            <DataTable
              headers={["NIS", "Nama", "Profil", "Bulanan", "Tabungan/bln", "Status", "Aksi"]}
              rows={members.slice(0, 80).map((member) => {
                const memberIds = [member.id, ...(member.related_ids || [])];
                const setting = settings.find((item) => memberIds.includes(item.anggota_id));
                return [
                  member.nis,
                  member.nama_lengkap,
                  setting ? profileLabels[setting.profil_pembayaran] : "Belum diatur",
                  setting ? formatCurrency(setting.total_bulanan) : "-",
                  setting ? formatCurrency(setting.tabungan_bulanan) : "-",
                  setting?.aktif ? "Aktif" : "Belum aktif",
                  setting ? (
                    <div key="actions" className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => editPaymentSetting(member)}
                        className="rounded border px-3 py-2 text-sm font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePaymentSetting(setting, member.nama_lengkap)}
                        className="rounded border px-3 py-2 text-sm font-semibold text-red-600"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <button
                      key="configure"
                      type="button"
                      onClick={() => editPaymentSetting(member)}
                      className="rounded border px-3 py-2 text-sm font-semibold text-emerald-800"
                    >
                      Atur
                    </button>
                  ),
                ];
              })}
            />
          )}
        </div>
      ) : null}

      {tab === "tagihan" ? (
        <div className="grid gap-4">
          <SubTabBar
            value={tagihanTab}
            onChange={setTagihanTab}
            items={[
              { value: "generate", label: "Generate Tagihan" },
              { value: "insidentil", label: "Tagihan Insidentil" },
              { value: "daftar", label: "Daftar Tagihan" },
            ]}
          />

          {tagihanTab === "generate" ? (
            <form onSubmit={generateInvoices} className="rounded bg-white p-5 shadow-soft">
              <h2 className="text-lg font-semibold">Buat Tagihan dari Pengaturan</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <select
                  value={invoiceForm.mode}
                  onChange={(event) =>
                    setInvoiceForm((form) => ({ ...form, mode: event.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="massal">Massal</option>
                  <option value="individual">Individual</option>
                </select>
                {invoiceForm.mode === "massal" ? (
                  <select
                    value={invoiceForm.scope}
                    onChange={(event) =>
                      setInvoiceForm((form) => ({ ...form, scope: event.target.value }))
                    }
                    className={inputClass}
                  >
                    {scopes.map((scope) => (
                      <option key={scope} value={scope}>
                        {scope}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={invoiceForm.anggota_id}
                    onChange={(event) =>
                      setInvoiceForm((form) => ({
                        ...form,
                        anggota_id: event.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">Pilih anggota</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {memberLabel(member)}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={invoiceForm.kategori}
                  onChange={(event) =>
                    setInvoiceForm((form) => ({ ...form, kategori: event.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="bulanan">Syahriyah bulanan</option>
                  <option value="masuk_cicil">Biaya masuk/cicilan</option>
                  <option value="semua">Syahriyah + biaya masuk</option>
                </select>
                <input
                  type="month"
                  value={invoiceForm.periode}
                  onChange={(event) =>
                    setInvoiceForm((form) => ({ ...form, periode: event.target.value }))
                  }
                  className={inputClass}
                />
                <input
                  type="date"
                  value={invoiceForm.jatuh_tempo}
                  onChange={(event) =>
                    setInvoiceForm((form) => ({
                      ...form,
                      jatuh_tempo: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <button className="mt-4 inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                <CalendarPlus className="mr-2" size={17} />
                Buat Tagihan
              </button>
            </form>
          ) : null}

          {tagihanTab === "insidentil" ? (
            <div className="grid gap-5">
              <form onSubmit={saveBillType} className="rounded bg-white p-5 shadow-soft">
                <h2 className="text-lg font-semibold">Jenis Tagihan Insidentil</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_150px]">
                  <input
                    value={typeForm.nama || ""}
                    onChange={(event) =>
                      setTypeForm((form) => ({ ...form, nama: event.target.value }))
                    }
                    placeholder="Nama, contoh Rihlah / ujian / kitab"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={typeForm.nominal || 0}
                    onChange={(event) =>
                      setTypeForm((form) => ({
                        ...form,
                        nominal: Number(event.target.value),
                      }))
                    }
                    className={inputClass}
                  />
                  <button className="inline-flex items-center justify-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                    <Save className="mr-2" size={17} />
                    Simpan
                  </button>
                </div>
              </form>

              <form onSubmit={createIncidentalInvoice} className="rounded bg-white p-5 shadow-soft">
                <h2 className="text-lg font-semibold">Assign Insidentil per Orang</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <select
                    value={typeForm.id || ""}
                    onChange={(event) =>
                      setTypeForm((form) => ({ ...form, id: event.target.value }))
                    }
                    className={inputClass}
                  >
                    <option value="">Pilih jenis</option>
                    {billTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.nama} - {formatCurrency(type.nominal)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={invoiceForm.anggota_id}
                    onChange={(event) =>
                      setInvoiceForm((form) => ({
                        ...form,
                        anggota_id: event.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">Pilih anggota</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {memberLabel(member)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={invoiceForm.jatuh_tempo}
                    onChange={(event) =>
                      setInvoiceForm((form) => ({
                        ...form,
                        jatuh_tempo: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                  <button className="inline-flex items-center justify-center rounded bg-gold px-4 py-2 text-sm font-semibold text-emerald-950">
                    <Plus className="mr-2" size={17} />
                    Assign
                  </button>
                </div>
              </form>

              <DataTable
                headers={["Nama", "Nominal", "Aksi"]}
                rows={billTypes.map((type) => [
                  type.nama,
                  formatCurrency(type.nominal),
                  <div key="actions" className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTypeForm(type)}
                      className="rounded border px-3 py-2 text-sm font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBillType(type.id)}
                      className="rounded border px-3 py-2 text-sm font-semibold text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>,
                ])}
              />
            </div>
          ) : null}

          {tagihanTab === "daftar" ? (
            <div className="grid gap-4">
              <div className="rounded bg-white p-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={allVisibleInvoicesSelected}
                      onChange={(event) => toggleAllVisibleInvoices(event.target.checked)}
                    />
                    Pilih semua yang tampil
                  </label>
                  {canRetractInvoice ? (
                    <button
                      type="button"
                      onClick={retractSelectedInvoices}
                      disabled={!selectedInvoiceIds.length}
                      className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      Tarik Terpilih ({selectedInvoiceIds.length})
                    </button>
                  ) : (
                    <span className="text-sm text-gray-500">
                      Tarik tagihan khusus superadmin/bendahara.
                    </span>
                  )}
                </div>
              </div>
              <DataTable
                headers={["Pilih", "Periode", "NIS", "Nama", "Tagihan", "Nominal", "Status", "Aksi"]}
                rows={visibleActiveInvoices.map((invoice) => {
                  const member = memberByAnyId(invoice.anggota_id);
                  const paid = payments
                    .filter((payment) => payment.tagihan_id === invoice.id)
                    .reduce(
                      (sum, payment) => sum + Number(payment.jumlah_bayar || 0),
                      0,
                    );
                  return [
                    <input
                      key={`select-${invoice.id}`}
                      type="checkbox"
                      checked={selectedInvoiceIds.includes(invoice.id)}
                      onChange={(event) =>
                        toggleInvoiceSelection(invoice.id, event.target.checked)
                      }
                    />,
                    invoice.periode || "-",
                    member?.nis || "-",
                    member?.nama_lengkap || "-",
                    <div key={invoice.id}>
                      <p className="font-semibold">{invoiceLabel(invoice)}</p>
                      {invoice.catatan ? (
                        <p className="mt-1 max-w-md text-xs leading-5 text-gray-500">
                          {invoice.catatan}
                        </p>
                      ) : null}
                    </div>,
                    formatCurrency(invoice.nominal),
                    invoice.status.replace("_", " "),
                    <div key="actions" className="grid gap-2">
                      {paid > 0 ? (
                        <span className="text-xs text-gray-500">
                          Terbayar {formatCurrency(paid)}
                        </span>
                      ) : null}
                      {canRetractInvoice ? (
                        <button
                          type="button"
                          onClick={() => retractInvoice(invoice)}
                          className="rounded border px-3 py-2 text-sm font-semibold text-red-600"
                        >
                          Tarik
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">
                          Khusus superadmin/bendahara
                        </span>
                      )}
                    </div>,
                  ];
                })}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "bayar" ? (
        <div className="grid gap-4">
          <SubTabBar
            value={bayarTab}
            onChange={setBayarTab}
            items={[
              { value: "catat", label: "Catat Pembayaran" },
              { value: "riwayat", label: "Riwayat Pembayaran" },
            ]}
          />
          {bayarTab === "catat" ? (
            <div className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Pencatatan Pembayaran</h2>
            <label className="relative mt-4 block">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari anggota"
                className={`${inputClass} w-full pl-10`}
              />
            </label>
            <select
              value={selectedMember}
              onChange={(event) => {
                setSelectedMember(event.target.value);
                setSelectedInvoice("");
              }}
              className={`${inputClass} mt-3 w-full`}
            >
              <option value="">Pilih anggota</option>
              {filteredMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {memberLabel(member)}
                </option>
              ))}
            </select>
            <select
              value={selectedInvoice}
              onChange={(event) => setSelectedInvoice(event.target.value)}
              className={`${inputClass} mt-3 w-full`}
            >
              <option value="">Pilih tagihan</option>
              {selectedMemberInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoiceLabel(invoice)} - {formatCurrency(invoice.nominal)} -{" "}
                  {invoice.status}
                </option>
              ))}
            </select>
            {selectedInvoiceRow ? (
              <div className="mt-4 rounded bg-gray-50 p-4 text-sm">
                <p>Total tagihan: {formatCurrency(selectedInvoiceRow.nominal)}</p>
                <p>Sudah dibayar: {formatCurrency(selectedPaid)}</p>
                <p>Sisa: {formatCurrency(selectedRemaining)}</p>
                <p>Saldo tabungan kegiatan: {formatCurrency(selectedSavingsBalance)}</p>
                {Number(selectedInvoiceRow.tabungan_target || 0) > 0 ? (
                  <p>
                    Target tabungan dari tagihan ini:{" "}
                    {formatCurrency(selectedInvoiceRow.tabungan_target)}; sudah masuk{" "}
                    {formatCurrency(selectedInvoiceSavingsCredited)}
                  </p>
                ) : null}
                <p>Kategori: {categoryLabels[selectedInvoiceRow.kategori]}</p>
                {selectedInvoiceRow.catatan ? (
                  <p>Rincian: {selectedInvoiceRow.catatan}</p>
                ) : null}
              </div>
            ) : null}
            <form onSubmit={savePayment} className="mt-4 grid gap-3">
              <input
                type="number"
                value={paymentForm.tunai}
                onChange={(event) =>
                  setPaymentForm((form) => ({
                    ...form,
                    tunai: event.target.value,
                  }))
                }
                placeholder="Dibayar tunai/transfer"
                className={inputClass}
              />
              <input
                type="number"
                value={paymentForm.dari_tabungan}
                onChange={(event) =>
                  setPaymentForm((form) => ({
                    ...form,
                    dari_tabungan: event.target.value,
                  }))
                }
                placeholder="Ambil dari tabungan kegiatan"
                className={inputClass}
              />
              <input
                type="date"
                value={paymentForm.tanggal_bayar}
                onChange={(event) =>
                  setPaymentForm((form) => ({
                    ...form,
                    tanggal_bayar: event.target.value,
                  }))
                }
                className={inputClass}
              />
              <input
                value={paymentForm.catatan}
                onChange={(event) =>
                  setPaymentForm((form) => ({
                    ...form,
                    catatan: event.target.value,
                  }))
                }
                placeholder="Catatan"
                className={inputClass}
              />
              <button className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                <FileText className="mr-2" size={17} />
                Catat & Generate Kuitansi
              </button>
            </form>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded bg-white p-5 shadow-soft">
                <h2 className="text-lg font-semibold">Riwayat Pembayaran</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari anggota"
                    className={inputClass}
                  />
                  <select
                    value={selectedMember}
                    onChange={(event) => {
                      setSelectedMember(event.target.value);
                      setSelectedInvoice("");
                    }}
                    className={inputClass}
                  >
                    <option value="">Pilih anggota</option>
                    {filteredMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {memberLabel(member)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedInvoice}
                    onChange={(event) => setSelectedInvoice(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Pilih tagihan</option>
                    {selectedMemberInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoiceLabel(invoice)} - {formatCurrency(invoice.nominal)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DataTable
                headers={["Tanggal", "Jumlah", "Catatan", "Kuitansi"]}
                rows={selectedInvoicePayments.map((payment) => [
                  formatDate(payment.tanggal_bayar),
                  formatCurrency(payment.jumlah_bayar),
                  payment.catatan || "-",
                  payment.kuitansi_url || "-",
                ])}
              />
            </div>
          )}
        </div>
      ) : null}

      {tab === "tabungan" ? (
        <div className="grid gap-4">
          <SubTabBar
            value={tabunganTab}
            onChange={setTabunganTab}
            items={[
              { value: "catat", label: "Catat Tabungan" },
              { value: "riwayat", label: "Riwayat Tabungan" },
            ]}
          />
          {tabunganTab === "catat" ? (
            <form onSubmit={saveSavingsAdjustment} className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Ledger Tabungan Kegiatan</h2>
            <select
              value={savingsMember}
              onChange={(event) => setSavingsMember(event.target.value)}
              className={`${inputClass} mt-4 w-full`}
            >
              <option value="">Pilih anggota</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {memberLabel(member)}
                </option>
              ))}
            </select>
            <div className="mt-4 rounded bg-emerald-50 p-4">
              <p className="text-sm text-emerald-900">Saldo tabungan kegiatan</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-950">
                {formatCurrency(savingsTabBalance)}
              </p>
            </div>
            <div className="mt-4 grid gap-3">
              <select
                value={savingsForm.tipe}
                onChange={(event) =>
                  setSavingsForm((form) => ({ ...form, tipe: event.target.value }))
                }
                className={inputClass}
              >
                <option value="setoran_otomatis">Setoran/penambahan</option>
                <option value="pemakaian_insidentil">Pemakaian untuk insidentil</option>
                <option value="penyesuaian">Penyesuaian saldo</option>
              </select>
              <input
                type="number"
                value={savingsForm.nominal}
                onChange={(event) =>
                  setSavingsForm((form) => ({ ...form, nominal: event.target.value }))
                }
                placeholder="Nominal"
                className={inputClass}
              />
              <input
                type="date"
                value={savingsForm.tanggal}
                onChange={(event) =>
                  setSavingsForm((form) => ({ ...form, tanggal: event.target.value }))
                }
                className={inputClass}
              />
              <input
                value={savingsForm.catatan}
                onChange={(event) =>
                  setSavingsForm((form) => ({ ...form, catatan: event.target.value }))
                }
                placeholder="Catatan"
                className={inputClass}
              />
              <button className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                <Wallet className="mr-2" size={17} />
                Simpan Catatan Tabungan
              </button>
            </div>
            </form>
          ) : (
            <div className="grid gap-4">
              <div className="rounded bg-white p-5 shadow-soft">
                <h2 className="text-lg font-semibold">Riwayat Tabungan Kegiatan</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
                  <select
                    value={savingsMember}
                    onChange={(event) => setSavingsMember(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Pilih anggota</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {memberLabel(member)}
                      </option>
                    ))}
                  </select>
                  <div className="rounded bg-emerald-50 px-4 py-3">
                    <p className="text-xs text-emerald-900">Saldo</p>
                    <p className="font-semibold text-emerald-950">
                      {formatCurrency(savingsTabBalance)}
                    </p>
                  </div>
                </div>
              </div>
              <DataTable
                headers={["Tanggal", "Tipe", "Nominal", "Catatan"]}
                rows={savingsEntries
                  .filter((entry) => memberIdsFor(savingsMember).includes(entry.anggota_id))
                  .map((entry) => [
                    formatDate(entry.tanggal),
                    entry.tipe.replace("_", " "),
                    <span
                      key={entry.id}
                      className={Number(entry.nominal) < 0 ? "text-red-700" : "text-emerald-800"}
                    >
                      {formatCurrency(entry.nominal)}
                    </span>,
                    entry.catatan || "-",
                  ])}
              />
            </div>
          )}
        </div>
      ) : null}

      {tab === "laporan" ? (
        <div className="grid gap-4">
          <SubTabBar
            value={laporanTab}
            onChange={setLaporanTab}
            items={[
              { value: "ringkasan", label: "Ringkasan" },
              { value: "pembayaran", label: "Data Pembayaran" },
              { value: "tunggakan", label: "Data Tunggakan" },
            ]}
          />
          <div className="rounded bg-white p-5 shadow-soft">
            <div className="grid gap-3 md:grid-cols-5">
              <input
                type="date"
                value={report.from}
                onChange={(event) =>
                  setReport((form) => ({ ...form, from: event.target.value }))
                }
                className={inputClass}
              />
              <input
                type="date"
                value={report.to}
                onChange={(event) =>
                  setReport((form) => ({ ...form, to: event.target.value }))
                }
                className={inputClass}
              />
              <select
                value={report.kategori}
                onChange={(event) =>
                  setReport((form) => ({
                    ...form,
                    kategori: event.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="">Semua kategori</option>
                {(Object.keys(categoryLabels) as ItemCategory[]).map((category) => (
                  <option key={category} value={category}>
                    {categoryLabels[category]}
                  </option>
                ))}
              </select>
              <select
                value={report.scope}
                onChange={(event) =>
                  setReport((form) => ({ ...form, scope: event.target.value }))
                }
                className={inputClass}
              >
                {scopes.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportPdf}
                  className="rounded border px-3 py-2 text-sm font-semibold"
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={exportCsv}
                  className="rounded border px-3 py-2 text-sm font-semibold"
                >
                  CSV
                </button>
              </div>
            </div>
          </div>

          {laporanTab === "ringkasan" ? (
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded bg-emerald-50 p-4">
                <p className="text-sm text-emerald-900">Total pembayaran</p>
                <p className="mt-2 text-xl font-semibold text-emerald-950">
                  {formatCurrency(
                    reportPayments.reduce(
                      (sum, payment) => sum + Number(payment.jumlah_bayar || 0),
                      0,
                    ),
                  )}
                </p>
              </div>
              <div className="rounded bg-gold/20 p-4">
                <p className="text-sm text-gold-dark">Tagihan belum lunas</p>
                <p className="mt-2 text-xl font-semibold text-gray-950">
                  {arrears.length}
                </p>
              </div>
              <div className="rounded bg-red-50 p-4">
                <p className="text-sm text-red-700">Nominal tunggakan</p>
                <p className="mt-2 text-xl font-semibold text-red-800">
                  {formatCurrency(
                    arrears.reduce((sum, invoice) => {
                      const paid = payments
                        .filter((payment) => payment.tagihan_id === invoice.id)
                        .reduce(
                          (total, payment) => total + Number(payment.jumlah_bayar || 0),
                          0,
                        );
                      return sum + Math.max(Number(invoice.nominal || 0) - paid, 0);
                    }, 0),
                  )}
                </p>
              </div>
              <div className="rounded bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Saldo tabungan kegiatan</p>
                <p className="mt-2 text-xl font-semibold text-gray-950">
                  {formatCurrency(totalSavings)}
                </p>
              </div>
            </div>
          ) : null}

          {laporanTab === "pembayaran" ? (
            <DataTable
            headers={["Tanggal", "NIS", "Nama", "Jenis", "Kategori", "Jumlah"]}
            rows={reportPayments.map((payment) => {
              const invoice = invoices.find((item) => item.id === payment.tagihan_id);
              const member = memberByAnyId(invoice?.anggota_id);
              return [
                formatDate(payment.tanggal_bayar),
                member?.nis || "-",
                member?.nama_lengkap || "-",
                invoice ? invoiceLabel(invoice) : "-",
                invoice ? categoryLabels[invoice.kategori] : "-",
                formatCurrency(payment.jumlah_bayar),
              ];
            })}
          />
          ) : null}

          {laporanTab === "tunggakan" ? (
            <DataTable
            headers={["NIS", "Nama", "Jenis", "Kategori", "Nominal", "Status", "Jatuh Tempo"]}
            rows={arrears.map((invoice) => {
              const member = memberByAnyId(invoice.anggota_id);
              return [
                member?.nis || "-",
                member?.nama_lengkap || "-",
                invoiceLabel(invoice),
                categoryLabels[invoice.kategori],
                formatCurrency(invoice.nominal),
                invoice.status.replace("_", " "),
                formatDate(invoice.jatuh_tempo),
              ];
            })}
          />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
