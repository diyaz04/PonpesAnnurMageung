import { Download, FileText, Plus, Save, Search, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

type Entity = "pesantren" | "smp";

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
  status: string;
};

type Invoice = {
  id: string;
  entitas: Entity;
  anggota_id: string;
  jenis_tagihan_id: string | null;
  nominal: number;
  status: "belum_lunas" | "cicilan" | "lunas";
  jatuh_tempo: string | null;
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

const inputClass =
  "min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700";

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
  return entity === "pesantren" ? "Pesantren" : "SMP";
}

function getMemberScope(member: Member, entity: Entity) {
  return entity === "pesantren"
    ? `Angkatan ${member.tahun_masuk}`
    : member.kelas || `Angkatan ${member.tahun_masuk}`;
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

export default function FinanceModule({
  initialEntity = "pesantren",
}: {
  initialEntity?: Entity;
}) {
  const { user } = useAuth();
  const [activeEntity, setActiveEntity] = useState<Entity>(initialEntity);
  const [tab, setTab] = useState<"jenis" | "assign" | "bayar" | "laporan">("jenis");
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [message, setMessage] = useState("");
  const [typeForm, setTypeForm] = useState<Partial<BillType>>({
    nama: "",
    nominal: 0,
    berlaku_untuk: "semua",
  });
  const [assignForm, setAssignForm] = useState({
    jenis_tagihan_id: "",
    mode: "massal",
    scope: "semua",
    anggota_id: "",
    jatuh_tempo: "",
  });
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    jumlah_bayar: "",
    tanggal_bayar: new Date().toISOString().slice(0, 10),
    catatan: "",
  });
  const [report, setReport] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    jenis_tagihan_id: "",
    scope: "semua",
  });
  const [search, setSearch] = useState("");

  async function loadData(entity = activeEntity) {
    const memberTable = entity === "pesantren" ? "pp_santri" : "smp_siswa";
    const [typeResult, memberResult, invoiceResult] = await Promise.all([
      supabase
        .from("keu_jenis_tagihan")
        .select("*")
        .eq("entitas", entity)
        .order("created_at", { ascending: false }),
      supabase
        .from(memberTable)
        .select("*")
        .in("status", ["aktif", "alumni", "keluar"])
        .order("nama_lengkap"),
      supabase
        .from("keu_tagihan")
        .select("*, jenis:keu_jenis_tagihan(nama)")
        .eq("entitas", entity)
        .order("created_at", { ascending: false }),
    ]);

    const invoiceRows = (invoiceResult.data || []) as Invoice[];
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

    setBillTypes((typeResult.data || []) as BillType[]);
    setMembers((memberResult.data || []) as Member[]);
    setInvoices(invoiceRows);
    setPayments((paymentResult.data || []) as Payment[]);
  }

  useEffect(() => {
    loadData(activeEntity);
  }, [activeEntity]);

  const filteredMembers = useMemo(() => {
    return members.filter(
      (member) =>
        member.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
        member.nis.toLowerCase().includes(search.toLowerCase()),
    );
  }, [members, search]);

  const scopes = useMemo(() => {
    const values = members.map((member) => getMemberScope(member, activeEntity));
    return ["semua", ...Array.from(new Set(values))];
  }, [activeEntity, members]);

  const selectedMemberInvoices = invoices.filter(
    (invoice) => invoice.anggota_id === selectedMember,
  );

  const selectedInvoiceRow = invoices.find((invoice) => invoice.id === selectedInvoice);
  const selectedInvoicePayments = payments.filter(
    (payment) => payment.tagihan_id === selectedInvoice,
  );
  const selectedPaid = selectedInvoicePayments.reduce(
    (sum, payment) => sum + Number(payment.jumlah_bayar || 0),
    0,
  );
  const selectedRemaining = Math.max(
    Number(selectedInvoiceRow?.nominal || 0) - selectedPaid,
    0,
  );

  const reportInvoices = invoices.filter((invoice) => {
    const typeMatch = report.jenis_tagihan_id
      ? invoice.jenis_tagihan_id === report.jenis_tagihan_id
      : true;
    const member = members.find((item) => item.id === invoice.anggota_id);
    const scopeMatch =
      report.scope === "semua" || (member ? getMemberScope(member, activeEntity) === report.scope : false);
    return typeMatch && scopeMatch;
  });
  const reportPayments = payments.filter(
    (payment) =>
      payment.tanggal_bayar >= report.from &&
      payment.tanggal_bayar <= report.to &&
      reportInvoices.some((invoice) => invoice.id === payment.tagihan_id),
  );
  const arrears = reportInvoices.filter((invoice) => invoice.status !== "lunas");

  async function saveBillType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      entitas: activeEntity,
      nama: typeForm.nama,
      nominal: Number(typeForm.nominal || 0),
      berlaku_untuk: typeForm.berlaku_untuk || "semua",
    };
    const result = typeForm.id
      ? await supabase.from("keu_jenis_tagihan").update(payload).eq("id", typeForm.id)
      : await supabase.from("keu_jenis_tagihan").insert(payload);
    setMessage(result.error ? result.error.message : "Jenis tagihan tersimpan.");
    setTypeForm({ nama: "", nominal: 0, berlaku_untuk: "semua" });
    loadData();
  }

  async function deleteBillType(id: string) {
    const { error } = await supabase.from("keu_jenis_tagihan").delete().eq("id", id);
    setMessage(error ? error.message : "Jenis tagihan dihapus.");
    loadData();
  }

  async function assignInvoices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const type = billTypes.find((item) => item.id === assignForm.jenis_tagihan_id);
    if (!type) {
      setMessage("Pilih jenis tagihan terlebih dahulu.");
      return;
    }

    const targetMembers =
      assignForm.mode === "individual"
        ? members.filter((member) => member.id === assignForm.anggota_id)
        : members.filter((member) =>
            assignForm.scope === "semua"
              ? member.status === "aktif"
              : member.status === "aktif" &&
                getMemberScope(member, activeEntity) === assignForm.scope,
          );

    if (!targetMembers.length) {
      setMessage("Tidak ada anggota yang cocok untuk assign tagihan.");
      return;
    }

    const { error } = await supabase.from("keu_tagihan").insert(
      targetMembers.map((member) => ({
        entitas: activeEntity,
        anggota_id: member.id,
        jenis_tagihan_id: type.id,
        nominal: type.nominal,
        status: "belum_lunas",
        jatuh_tempo: assignForm.jatuh_tempo || null,
      })),
    );

    setMessage(
      error
        ? error.message
        : `${targetMembers.length} tagihan berhasil ditugaskan.`,
    );
    loadData();
  }

  async function makeReceiptPdf(payment: {
    id?: string;
    jumlah_bayar: number;
    tanggal_bayar: string;
    catatan?: string | null;
  }) {
    if (!selectedInvoiceRow) return null;
    const member = members.find((item) => item.id === selectedInvoiceRow.anggota_id);
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
    doc.text(`Jenis Tagihan: ${selectedInvoiceRow.jenis?.nama || "-"}`, 14, 58);
    doc.text(`Jumlah Bayar: ${formatCurrency(payment.jumlah_bayar)}`, 14, 66);
    doc.text(`Catatan: ${payment.catatan || "-"}`, 14, 74);
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

    const amount = Number(paymentForm.jumlah_bayar || 0);
    if (amount <= 0) {
      setMessage("Jumlah pembayaran harus lebih dari 0.");
      return;
    }

    const receiptPath = await makeReceiptPdf({
      jumlah_bayar: amount,
      tanggal_bayar: paymentForm.tanggal_bayar,
      catatan: paymentForm.catatan || null,
    });

    const { error } = await supabase.from("keu_pembayaran").insert({
      tagihan_id: selectedInvoiceRow.id,
      jumlah_bayar: amount,
      tanggal_bayar: paymentForm.tanggal_bayar,
      bendahara_id: user?.id || null,
      catatan: paymentForm.catatan || null,
      kuitansi_url: receiptPath,
    });

    if (!error) {
      await supabase.rpc("sync_keu_tagihan_status", {
        p_tagihan_id: selectedInvoiceRow.id,
      });
    }

    setMessage(error ? error.message : "Pembayaran tercatat dan kuitansi dibuat.");
    setPaymentForm({
      jumlah_bayar: "",
      tanggal_bayar: new Date().toISOString().slice(0, 10),
      catatan: "",
    });
    loadData();
  }

  function exportCsv() {
    const csv = [
      ["Entitas", "Tanggal", "NIS", "Nama", "Jenis", "Jumlah Bayar", "Status Tagihan"].join(","),
      ...reportPayments.map((payment) => {
        const invoice = invoices.find((item) => item.id === payment.tagihan_id);
        const member = members.find((item) => item.id === invoice?.anggota_id);
        return [
          entityLabel(activeEntity),
          payment.tanggal_bayar,
          member?.nis || "",
          member?.nama_lengkap || "",
          invoice?.jenis?.nama || "",
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
      const member = members.find((item) => item.id === invoice?.anggota_id);
      doc.text(
        `${index + 1}. ${payment.tanggal_bayar} - ${member?.nama_lengkap || "-"} - ${invoice?.jenis?.nama || "-"} - ${formatCurrency(payment.jumlah_bayar)}`,
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
          Keuangan & Tagihan
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Kelola jenis tagihan, assign tagihan, pencatatan pembayaran, kuitansi,
          dan laporan untuk Pesantren dan SMP.
        </p>
      </div>

      <div className="rounded bg-white p-4 shadow-soft">
        <div className="flex flex-wrap gap-2">
          {(["pesantren", "smp"] as Entity[]).map((entity) => (
            <button
              key={entity}
              type="button"
              onClick={() => setActiveEntity(entity)}
              className={[
                "rounded px-4 py-2 text-sm font-semibold",
                activeEntity === entity
                  ? "bg-emerald-800 text-white"
                  : "border border-gray-200 text-gray-700",
              ].join(" ")}
            >
              {entityLabel(entity)}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["jenis", "Jenis Tagihan"],
            ["assign", "Penugasan"],
            ["bayar", "Pembayaran"],
            ["laporan", "Rekap & Laporan"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key as typeof tab)}
              className={[
                "rounded px-4 py-2 text-sm font-semibold",
                tab === key ? "bg-gold text-emerald-950" : "bg-gray-100 text-gray-700",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      </div>

      {tab === "jenis" ? (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <form onSubmit={saveBillType} className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Manajemen Jenis Tagihan</h2>
            <div className="mt-4 grid gap-3">
              <input
                value={typeForm.nama || ""}
                onChange={(event) =>
                  setTypeForm((form) => ({ ...form, nama: event.target.value }))
                }
                placeholder="Nama tagihan, contoh SPP"
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
                placeholder="Nominal"
                className={inputClass}
              />
              <input
                value={typeForm.berlaku_untuk || ""}
                onChange={(event) =>
                  setTypeForm((form) => ({
                    ...form,
                    berlaku_untuk: event.target.value,
                  }))
                }
                placeholder="Berlaku untuk: semua / kelas / angkatan"
                className={inputClass}
              />
            </div>
            <button className="mt-4 inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
              <Save className="mr-2" size={17} />
              Simpan Jenis
            </button>
          </form>
          <DataTable
            headers={["Nama", "Nominal", "Berlaku Untuk", "Aksi"]}
            rows={billTypes.map((type) => [
              type.nama,
              formatCurrency(type.nominal),
              type.berlaku_untuk,
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

      {tab === "assign" ? (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <form onSubmit={assignInvoices} className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Penugasan Tagihan</h2>
            <div className="mt-4 grid gap-3">
              <select
                value={assignForm.jenis_tagihan_id}
                onChange={(event) =>
                  setAssignForm((form) => ({
                    ...form,
                    jenis_tagihan_id: event.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="">Pilih jenis tagihan</option>
                {billTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.nama} - {formatCurrency(type.nominal)}
                  </option>
                ))}
              </select>
              <select
                value={assignForm.mode}
                onChange={(event) =>
                  setAssignForm((form) => ({ ...form, mode: event.target.value }))
                }
                className={inputClass}
              >
                <option value="massal">Massal</option>
                <option value="individual">Individual</option>
              </select>
              {assignForm.mode === "massal" ? (
                <select
                  value={assignForm.scope}
                  onChange={(event) =>
                    setAssignForm((form) => ({ ...form, scope: event.target.value }))
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
                  value={assignForm.anggota_id}
                  onChange={(event) =>
                    setAssignForm((form) => ({
                      ...form,
                      anggota_id: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Pilih anggota</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.nama_lengkap} - {member.nis}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="date"
                value={assignForm.jatuh_tempo}
                onChange={(event) =>
                  setAssignForm((form) => ({
                    ...form,
                    jatuh_tempo: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>
            <button className="mt-4 inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
              <Plus className="mr-2" size={17} />
              Assign Tagihan
            </button>
          </form>
          <DataTable
            headers={["NIS", "Nama", "Scope", "Status"]}
            rows={members
              .filter((member) =>
                assignForm.scope === "semua"
                  ? true
                  : getMemberScope(member, activeEntity) === assignForm.scope,
              )
              .slice(0, 80)
              .map((member) => [
                member.nis,
                member.nama_lengkap,
                getMemberScope(member, activeEntity),
                member.status,
              ])}
          />
        </div>
      ) : null}

      {tab === "bayar" ? (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
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
                  {member.nama_lengkap} - {member.nis}
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
                  {invoice.jenis?.nama || "Tagihan"} - {formatCurrency(invoice.nominal)} -{" "}
                  {invoice.status}
                </option>
              ))}
            </select>
            {selectedInvoiceRow ? (
              <div className="mt-4 rounded bg-gray-50 p-4 text-sm">
                <p>Total tagihan: {formatCurrency(selectedInvoiceRow.nominal)}</p>
                <p>Sudah dibayar: {formatCurrency(selectedPaid)}</p>
                <p>Sisa: {formatCurrency(selectedRemaining)}</p>
              </div>
            ) : null}
            <form onSubmit={savePayment} className="mt-4 grid gap-3">
              <input
                type="number"
                value={paymentForm.jumlah_bayar}
                onChange={(event) =>
                  setPaymentForm((form) => ({
                    ...form,
                    jumlah_bayar: event.target.value,
                  }))
                }
                placeholder="Jumlah pembayaran"
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
      ) : null}

      {tab === "laporan" ? (
        <div className="grid gap-5">
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
                value={report.jenis_tagihan_id}
                onChange={(event) =>
                  setReport((form) => ({
                    ...form,
                    jenis_tagihan_id: event.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="">Semua jenis</option>
                {billTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.nama}
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
                  Excel/CSV
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
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
            </div>
          </div>
          <DataTable
            headers={["Tanggal", "NIS", "Nama", "Jenis", "Jumlah"]}
            rows={reportPayments.map((payment) => {
              const invoice = invoices.find((item) => item.id === payment.tagihan_id);
              const member = members.find((item) => item.id === invoice?.anggota_id);
              return [
                formatDate(payment.tanggal_bayar),
                member?.nis || "-",
                member?.nama_lengkap || "-",
                invoice?.jenis?.nama || "-",
                formatCurrency(payment.jumlah_bayar),
              ];
            })}
          />
          <DataTable
            headers={["NIS", "Nama", "Jenis", "Nominal", "Status", "Jatuh Tempo"]}
            rows={arrears.map((invoice) => {
              const member = members.find((item) => item.id === invoice.anggota_id);
              return [
                member?.nis || "-",
                member?.nama_lengkap || "-",
                invoice.jenis?.nama || "-",
                formatCurrency(invoice.nominal),
                invoice.status.replace("_", " "),
                formatDate(invoice.jatuh_tempo),
              ];
            })}
          />
        </div>
      ) : null}
    </section>
  );
}
