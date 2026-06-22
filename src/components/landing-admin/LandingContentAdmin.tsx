import {
  CheckCircle2,
  Download,
  ImagePlus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Entity = "pesantren" | "smp";

type ContentRow = {
  id: string;
  entitas: Entity;
  section: string;
  key: string;
  value: string | null;
};

type LeaderItem = {
  id: string;
  nama: string;
  jabatan: string;
  deskripsi: string;
  foto_url: string;
};

type FacilityItem = {
  id: string;
  nama: string;
  deskripsi: string;
  foto_url: string;
};

type NewsRow = {
  id: string;
  judul: string;
  thumbnail_url: string | null;
  konten: string | null;
  excerpt: string | null;
  tanggal: string | null;
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

type SuggestionRow = {
  id: string;
  nama: string | null;
  kontak: string | null;
  pesan: string;
  status: "baru" | "dibaca" | "ditindak";
  catatan_admin: string | null;
  created_at: string;
};

type SpmbRow = {
  id: string;
  nama_lengkap: string;
  jenis_kelamin: string | null;
  tanggal_lahir: string | null;
  alamat: string | null;
  nama_orang_tua: string | null;
  no_hp: string | null;
  asal_sekolah: string | null;
  status: "baru" | "diverifikasi" | "diterima" | "ditolak";
  created_at: string;
};

const inputClass =
  "min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700";

const tabItems = [
  ["hero", "Hero"],
  ["profil", "Profil"],
  ["berita", "Berita"],
  ["agenda", "Agenda"],
  ["galeri", "Galeri"],
  ["footer", "Footer"],
  ["saran", "Saran & Kritik"],
  ["spmb", "SPMB"],
] as const;

function entityLabel(entity: Entity) {
  return entity === "pesantren"
    ? "Pondok Pesantren An-Nur Mageung"
    : "SMP Ma'arif NU Sariwangi";
}

function randomId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
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

async function uploadLandingAsset(entity: Entity, file: File) {
  const extension = file.name.split(".").pop() || "bin";
  const path = `${entity}/${Date.now()}-${randomId()}.${extension}`;
  const { error } = await supabase.storage.from("landing-assets").upload(path, file);
  if (error) throw error;
  return supabase.storage.from("landing-assets").getPublicUrl(path).data.publicUrl;
}

export default function LandingContentAdmin({
  initialEntity = "pesantren",
}: {
  initialEntity?: Entity;
}) {
  const [entity, setEntity] = useState<Entity>(initialEntity);
  const [tab, setTab] = useState<(typeof tabItems)[number][0]>("hero");
  const [contentRows, setContentRows] = useState<ContentRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [agenda, setAgenda] = useState<AgendaRow[]>([]);
  const [gallery, setGallery] = useState<GalleryRow[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [spmbRows, setSpmbRows] = useState<SpmbRow[]>([]);
  const [message, setMessage] = useState("");
  const [newsForm, setNewsForm] = useState<Partial<NewsRow>>({});
  const [agendaForm, setAgendaForm] = useState<Partial<AgendaRow>>({});
  const [galleryForm, setGalleryForm] = useState<Partial<GalleryRow>>({ tipe: "foto" });

  async function loadData(activeEntity = entity) {
    const [contentResult, newsResult, agendaResult, galleryResult, suggestionResult] =
      await Promise.all([
        supabase.from("lp_konten").select("*").eq("entitas", activeEntity),
        supabase
          .from("lp_berita")
          .select("*")
          .eq("entitas", activeEntity)
          .order("created_at", { ascending: false }),
        supabase
          .from("lp_agenda")
          .select("*")
          .eq("entitas", activeEntity)
          .order("tanggal", { ascending: true }),
        supabase
          .from("lp_galeri")
          .select("*")
          .eq("entitas", activeEntity)
          .order("created_at", { ascending: false }),
        supabase
          .from("lp_saran_kritik")
          .select("*")
          .eq("entitas", activeEntity)
          .order("created_at", { ascending: false }),
      ]);

    setContentRows((contentResult.data || []) as ContentRow[]);
    setNews((newsResult.data || []) as NewsRow[]);
    setAgenda((agendaResult.data || []) as AgendaRow[]);
    setGallery((galleryResult.data || []) as GalleryRow[]);
    setSuggestions((suggestionResult.data || []) as SuggestionRow[]);

    if (activeEntity === "smp") {
      const { data } = await supabase
        .from("smp_spmb_pendaftar")
        .select("*")
        .order("created_at", { ascending: false });
      setSpmbRows((data || []) as SpmbRow[]);
    } else {
      setSpmbRows([]);
    }
  }

  useEffect(() => {
    loadData(entity);
  }, [entity]);

  const content = useMemo(() => {
    return contentRows.reduce<Record<string, Record<string, string>>>((acc, row) => {
      acc[row.section] = acc[row.section] || {};
      acc[row.section][row.key] = row.value || "";
      return acc;
    }, {});
  }, [contentRows]);

  const getContent = (section: string, key: string) => content[section]?.[key] || "";

  const leaders = useMemo(() => {
    const parsed = contentRows
      .filter((row) => row.section === "pimpinan")
      .map((row) => safeJson<LeaderItem>(row.value))
      .filter(Boolean) as LeaderItem[];
    if (parsed.length) return parsed;
    if (content.pimpinan?.nama) {
      return [
        {
          id: "legacy",
          nama: content.pimpinan.nama,
          jabatan: content.pimpinan.jabatan || "",
          deskripsi: content.pimpinan.deskripsi || "",
          foto_url: content.pimpinan.foto_url || "",
        },
      ];
    }
    return [];
  }, [contentRows, content]);

  const facilities = useMemo(() => {
    return contentRows
      .filter((row) => row.section === "fasilitas")
      .map((row) => safeJson<FacilityItem>(row.value))
      .filter(Boolean) as FacilityItem[];
  }, [contentRows]);

  async function upsertContent(section: string, values: Record<string, string>) {
    const rows = Object.entries(values).map(([key, value]) => ({
      entitas: entity,
      section,
      key,
      value,
    }));
    const { error } = await supabase
      .from("lp_konten")
      .upsert(rows, { onConflict: "entitas,section,key" });
    setMessage(error ? error.message : "Konten tersimpan.");
    loadData();
  }

  async function saveHero(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let bannerUrl = String(form.get("banner_url") || "");
    const bannerFile = form.get("banner_file") as File | null;
    if (bannerFile?.size) bannerUrl = await uploadLandingAsset(entity, bannerFile);
    await upsertContent("hero", {
      headline: String(form.get("headline") || ""),
      subheadline: String(form.get("subheadline") || ""),
      banner_url: bannerUrl,
      logo_url: String(form.get("logo_url") || ""),
      cta_primary_text: String(form.get("cta_primary_text") || ""),
      cta_primary_url: String(form.get("cta_primary_url") || ""),
    });
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await upsertContent("profil", {
      visi: String(form.get("visi") || ""),
      misi: String(form.get("misi") || ""),
      sejarah: String(form.get("sejarah") || ""),
      tata_tertib: String(form.get("tata_tertib") || ""),
    });
  }

  async function saveListItem<T extends LeaderItem | FacilityItem>(
    section: "pimpinan" | "fasilitas",
    item: T,
    file?: File | null,
  ) {
    const nextItem = { ...item };
    if (file?.size) {
      nextItem.foto_url = await uploadLandingAsset(entity, file);
    }
    const key = nextItem.id || randomId();
    nextItem.id = key;
    const { error } = await supabase.from("lp_konten").upsert(
      {
        entitas: entity,
        section,
        key,
        value: JSON.stringify(nextItem),
      },
      { onConflict: "entitas,section,key" },
    );
    setMessage(error ? error.message : "Item tersimpan.");
    loadData();
  }

  async function deleteContentItem(section: string, key: string) {
    const { error } = await supabase
      .from("lp_konten")
      .delete()
      .eq("entitas", entity)
      .eq("section", section)
      .eq("key", key);
    setMessage(error ? error.message : "Item dihapus.");
    loadData();
  }

  async function saveNews(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let thumbnail = newsForm.thumbnail_url || null;
    const file = (event.currentTarget.elements.namedItem("thumbnail_file") as HTMLInputElement)
      .files?.[0];
    if (file) thumbnail = await uploadLandingAsset(entity, file);
    const payload = {
      entitas: entity,
      judul: newsForm.judul || "",
      thumbnail_url: thumbnail,
      konten: newsForm.konten || "",
      excerpt: newsForm.excerpt || null,
      tanggal: newsForm.tanggal || null,
    };
    const result = newsForm.id
      ? await supabase.from("lp_berita").update(payload).eq("id", newsForm.id)
      : await supabase.from("lp_berita").insert(payload);
    setMessage(result.error ? result.error.message : "Berita tersimpan.");
    setNewsForm({});
    loadData();
  }

  async function deleteNews(id: string) {
    const { error } = await supabase.from("lp_berita").delete().eq("id", id);
    setMessage(error ? error.message : "Berita dihapus.");
    loadData();
  }

  async function saveAgenda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      entitas: entity,
      judul: agendaForm.judul || "",
      tanggal: agendaForm.tanggal || new Date().toISOString().slice(0, 10),
      lokasi: agendaForm.lokasi || null,
      deskripsi: agendaForm.deskripsi || null,
    };
    const result = agendaForm.id
      ? await supabase.from("lp_agenda").update(payload).eq("id", agendaForm.id)
      : await supabase.from("lp_agenda").insert(payload);
    setMessage(result.error ? result.error.message : "Agenda tersimpan.");
    setAgendaForm({});
    loadData();
  }

  async function deleteAgenda(id: string) {
    const { error } = await supabase.from("lp_agenda").delete().eq("id", id);
    setMessage(error ? error.message : "Agenda dihapus.");
    loadData();
  }

  async function saveGallery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let mediaUrl = galleryForm.media_url || "";
    const file = (event.currentTarget.elements.namedItem("media_file") as HTMLInputElement)
      .files?.[0];
    if (file) mediaUrl = await uploadLandingAsset(entity, file);
    const payload = {
      entitas: entity,
      album: galleryForm.album || null,
      media_url: mediaUrl,
      tipe: galleryForm.tipe || "foto",
    };
    const result = galleryForm.id
      ? await supabase.from("lp_galeri").update(payload).eq("id", galleryForm.id)
      : await supabase.from("lp_galeri").insert(payload);
    setMessage(result.error ? result.error.message : "Galeri tersimpan.");
    setGalleryForm({ tipe: "foto" });
    loadData();
  }

  async function deleteGallery(id: string) {
    const { error } = await supabase.from("lp_galeri").delete().eq("id", id);
    setMessage(error ? error.message : "Galeri dihapus.");
    loadData();
  }

  async function saveFooter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await upsertContent("footer", {
      alamat: String(form.get("alamat") || ""),
      telepon: String(form.get("telepon") || ""),
      wa: String(form.get("wa") || ""),
      email: String(form.get("email") || ""),
      facebook: String(form.get("facebook") || ""),
      instagram: String(form.get("instagram") || ""),
      youtube: String(form.get("youtube") || ""),
    });
  }

  async function updateSuggestion(row: SuggestionRow, status: SuggestionRow["status"], note?: string) {
    const { error } = await supabase
      .from("lp_saran_kritik")
      .update({ status, catatan_admin: note ?? row.catatan_admin })
      .eq("id", row.id);
    setMessage(error ? error.message : "Status saran diperbarui.");
    loadData();
  }

  async function saveSpmbSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await upsertContent("spmb", {
      active: form.get("active") ? "true" : "false",
      deskripsi: String(form.get("deskripsi") || ""),
      jadwal: String(form.get("jadwal") || ""),
      syarat: String(form.get("syarat") || ""),
      alur: String(form.get("alur") || ""),
      biaya: String(form.get("biaya") || ""),
    });
  }

  async function updateSpmbStatus(id: string, status: SpmbRow["status"]) {
    const { error } = await supabase
      .from("smp_spmb_pendaftar")
      .update({ status })
      .eq("id", id);
    setMessage(error ? error.message : "Status SPMB diperbarui.");
    loadData();
  }

  function exportSpmbCsv() {
    const csv = [
      ["Nama", "JK", "Tanggal Lahir", "Asal Sekolah", "Orang Tua", "No HP", "Status"].join(","),
      ...spmbRows.map((row) =>
        [
          row.nama_lengkap,
          row.jenis_kelamin || "",
          row.tanggal_lahir || "",
          row.asal_sekolah || "",
          row.nama_orang_tua || "",
          row.no_hp || "",
          row.status,
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "spmb-pendaftar.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section className="grid gap-5">
      <div className="rounded bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-dark">
          Portal Admin Konten
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-gray-950">
          Landing Page {entityLabel(entity)}
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Superadmin dapat mengedit konten publik tanpa menyentuh kode.
        </p>
      </div>

      <div className="rounded bg-white p-4 shadow-soft">
        <div className="flex flex-wrap gap-2">
          {(["pesantren", "smp"] as Entity[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setEntity(item);
                if (item === "pesantren" && tab === "spmb") setTab("hero");
              }}
              className={[
                "rounded px-4 py-2 text-sm font-semibold",
                entity === item
                  ? "bg-emerald-800 text-white"
                  : "border border-gray-200 text-gray-700",
              ].join(" ")}
            >
              {entityLabel(item)}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabItems
            .filter(([key]) => entity === "smp" || key !== "spmb")
            .map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
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

      {tab === "hero" ? (
        <form onSubmit={saveHero} className="rounded bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-gray-950">Editor Hero</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Headline">
              <input name="headline" defaultValue={getContent("hero", "headline")} className={inputClass} />
            </Field>
            <Field label="Sub-headline">
              <input name="subheadline" defaultValue={getContent("hero", "subheadline")} className={inputClass} />
            </Field>
            <Field label="URL banner">
              <input name="banner_url" defaultValue={getContent("hero", "banner_url")} className={inputClass} />
            </Field>
            <Field label="Upload banner">
              <input name="banner_file" type="file" accept="image/*" className={inputClass} />
            </Field>
            <Field label="URL logo">
              <input name="logo_url" defaultValue={getContent("hero", "logo_url")} className={inputClass} />
            </Field>
            <Field label="Teks CTA">
              <input name="cta_primary_text" defaultValue={getContent("hero", "cta_primary_text")} className={inputClass} />
            </Field>
            <Field label="URL CTA">
              <input name="cta_primary_url" defaultValue={getContent("hero", "cta_primary_url")} className={inputClass} />
            </Field>
          </div>
          <button className="mt-5 inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
            <Save className="mr-2" size={17} />
            Simpan Hero
          </button>
        </form>
      ) : null}

      {tab === "profil" ? (
        <div className="grid gap-5">
          <form onSubmit={saveProfile} className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-950">Editor Profil</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Visi">
                <textarea name="visi" defaultValue={getContent("profil", "visi")} rows={4} className="rounded border border-gray-200 px-3 py-3 font-normal" />
              </Field>
              <Field label="Misi">
                <textarea name="misi" defaultValue={getContent("profil", "misi")} rows={4} className="rounded border border-gray-200 px-3 py-3 font-normal" />
              </Field>
              <Field label="Sejarah">
                <textarea name="sejarah" defaultValue={getContent("profil", "sejarah")} rows={5} className="rounded border border-gray-200 px-3 py-3 font-normal" />
              </Field>
              <Field label="Tata Tertib">
                <textarea name="tata_tertib" defaultValue={getContent("profil", "tata_tertib")} rows={5} className="rounded border border-gray-200 px-3 py-3 font-normal" />
              </Field>
            </div>
            <button className="mt-5 inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
              <Save className="mr-2" size={17} />
              Simpan Profil
            </button>
          </form>

          <div className="grid gap-5 xl:grid-cols-2">
            <ListEditor
              title="Pimpinan"
              items={leaders}
              onSave={(item, file) => saveListItem("pimpinan", item, file)}
              onDelete={(item) => deleteContentItem("pimpinan", item.id)}
            />
            <ListEditor
              title="Fasilitas"
              items={facilities}
              onSave={(item, file) => saveListItem("fasilitas", item, file)}
              onDelete={(item) => deleteContentItem("fasilitas", item.id)}
            />
          </div>
        </div>
      ) : null}

      {tab === "berita" ? (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <form onSubmit={saveNews} className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Manajemen Berita</h2>
            <div className="mt-4 grid gap-3">
              <input value={newsForm.judul || ""} onChange={(e) => setNewsForm((f) => ({ ...f, judul: e.target.value }))} placeholder="Judul" className={inputClass} />
              <input type="date" value={newsForm.tanggal || ""} onChange={(e) => setNewsForm((f) => ({ ...f, tanggal: e.target.value }))} className={inputClass} />
              <input value={newsForm.thumbnail_url || ""} onChange={(e) => setNewsForm((f) => ({ ...f, thumbnail_url: e.target.value }))} placeholder="URL thumbnail" className={inputClass} />
              <input name="thumbnail_file" type="file" accept="image/*" className={inputClass} />
              <textarea value={newsForm.excerpt || ""} onChange={(e) => setNewsForm((f) => ({ ...f, excerpt: e.target.value }))} rows={3} placeholder="Excerpt" className="rounded border border-gray-200 px-3 py-3 text-sm" />
              <textarea value={newsForm.konten || ""} onChange={(e) => setNewsForm((f) => ({ ...f, konten: e.target.value }))} rows={10} placeholder="Konten artikel markdown / rich text sederhana" className="rounded border border-gray-200 px-3 py-3 text-sm" />
            </div>
            <button className="mt-4 rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Simpan Berita</button>
          </form>
          <DataTable
            headers={["Tanggal", "Judul", "Aksi"]}
            rows={news.map((row) => [
              formatDate(row.tanggal),
              row.judul,
              <div key="actions" className="flex gap-2">
                <button onClick={() => setNewsForm(row)} className="rounded border px-3 py-2 text-sm font-semibold">Edit</button>
                <button onClick={() => deleteNews(row.id)} className="rounded border px-3 py-2 text-sm font-semibold text-red-600">Hapus</button>
              </div>,
            ])}
          />
        </div>
      ) : null}

      {tab === "agenda" ? (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <form onSubmit={saveAgenda} className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Manajemen Agenda</h2>
            <div className="mt-4 grid gap-3">
              <input value={agendaForm.judul || ""} onChange={(e) => setAgendaForm((f) => ({ ...f, judul: e.target.value }))} placeholder="Judul agenda" className={inputClass} />
              <input type="date" value={agendaForm.tanggal || ""} onChange={(e) => setAgendaForm((f) => ({ ...f, tanggal: e.target.value }))} className={inputClass} />
              <input value={agendaForm.lokasi || ""} onChange={(e) => setAgendaForm((f) => ({ ...f, lokasi: e.target.value }))} placeholder="Lokasi" className={inputClass} />
              <textarea value={agendaForm.deskripsi || ""} onChange={(e) => setAgendaForm((f) => ({ ...f, deskripsi: e.target.value }))} rows={4} placeholder="Deskripsi" className="rounded border border-gray-200 px-3 py-3 text-sm" />
            </div>
            <button className="mt-4 rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Simpan Agenda</button>
          </form>
          <DataTable
            headers={["Tanggal", "Judul", "Lokasi", "Aksi"]}
            rows={agenda.map((row) => [
              formatDate(row.tanggal),
              row.judul,
              row.lokasi || "-",
              <div key="actions" className="flex gap-2">
                <button onClick={() => setAgendaForm(row)} className="rounded border px-3 py-2 text-sm font-semibold">Edit</button>
                <button onClick={() => deleteAgenda(row.id)} className="rounded border px-3 py-2 text-sm font-semibold text-red-600">Hapus</button>
              </div>,
            ])}
          />
        </div>
      ) : null}

      {tab === "galeri" ? (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <form onSubmit={saveGallery} className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Manajemen Galeri</h2>
            <div className="mt-4 grid gap-3">
              <input value={galleryForm.album || ""} onChange={(e) => setGalleryForm((f) => ({ ...f, album: e.target.value }))} placeholder="Album" className={inputClass} />
              <select value={galleryForm.tipe || "foto"} onChange={(e) => setGalleryForm((f) => ({ ...f, tipe: e.target.value as GalleryRow["tipe"] }))} className={inputClass}>
                <option value="foto">Foto</option>
                <option value="video">Video</option>
              </select>
              <input value={galleryForm.media_url || ""} onChange={(e) => setGalleryForm((f) => ({ ...f, media_url: e.target.value }))} placeholder="URL media" className={inputClass} />
              <input name="media_file" type="file" accept="image/*,video/*" className={inputClass} />
            </div>
            <button className="mt-4 inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
              <ImagePlus className="mr-2" size={17} />
              Simpan Galeri
            </button>
          </form>
          <DataTable
            headers={["Album", "Tipe", "Media", "Aksi"]}
            rows={gallery.map((row) => [
              row.album || "Umum",
              row.tipe,
              <a key="media" href={row.media_url} target="_blank" rel="noreferrer" className="text-emerald-800">Lihat</a>,
              <div key="actions" className="flex gap-2">
                <button onClick={() => setGalleryForm(row)} className="rounded border px-3 py-2 text-sm font-semibold">Edit</button>
                <button onClick={() => deleteGallery(row.id)} className="rounded border px-3 py-2 text-sm font-semibold text-red-600">Hapus</button>
              </div>,
            ])}
          />
        </div>
      ) : null}

      {tab === "footer" ? (
        <form onSubmit={saveFooter} className="rounded bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold">Editor Footer</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {["alamat", "telepon", "wa", "email", "facebook", "instagram", "youtube"].map((key) => (
              <Field key={key} label={key}>
                <input name={key} defaultValue={getContent("footer", key)} className={inputClass} />
              </Field>
            ))}
          </div>
          <button className="mt-5 rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Simpan Footer</button>
        </form>
      ) : null}

      {tab === "saran" ? (
        <DataTable
          headers={["Tanggal", "Nama", "Kontak", "Pesan", "Status", "Aksi"]}
          rows={suggestions.map((row) => [
            formatDate(row.created_at),
            row.nama || "-",
            row.kontak || "-",
            row.pesan,
            row.status,
            <div key="actions" className="grid gap-2">
              <button onClick={() => updateSuggestion(row, "dibaca")} className="inline-flex items-center rounded border px-3 py-2 text-sm font-semibold"><CheckCircle2 className="mr-2" size={15} />Dibaca</button>
              <button onClick={() => updateSuggestion(row, "ditindak")} className="rounded border px-3 py-2 text-sm font-semibold">Ditindak</button>
            </div>,
          ])}
        />
      ) : null}

      {tab === "spmb" && entity === "smp" ? (
        <div className="grid gap-5">
          <form onSubmit={saveSpmbSettings} className="rounded bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Toggle & Konten SPMB</h2>
            <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
              <input name="active" type="checkbox" defaultChecked={["true", "aktif", "1"].includes(getContent("spmb", "active").toLowerCase())} />
              Aktifkan section SPMB
            </label>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {["deskripsi", "jadwal", "syarat", "alur", "biaya"].map((key) => (
                <Field key={key} label={key}>
                  <textarea name={key} defaultValue={getContent("spmb", key)} rows={3} className="rounded border border-gray-200 px-3 py-3 font-normal" />
                </Field>
              ))}
            </div>
            <button className="mt-5 rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Simpan SPMB</button>
          </form>
          <div className="rounded bg-white p-5 shadow-soft">
            <button onClick={exportSpmbCsv} className="inline-flex items-center rounded border px-4 py-2 text-sm font-semibold">
              <Download className="mr-2" size={17} />
              Export CSV Pendaftar
            </button>
          </div>
          <DataTable
            headers={["Tanggal", "Nama", "Asal Sekolah", "Kontak", "Status", "Aksi"]}
            rows={spmbRows.map((row) => [
              formatDate(row.created_at),
              row.nama_lengkap,
              row.asal_sekolah || "-",
              row.no_hp || "-",
              row.status,
              <div key="actions" className="flex flex-wrap gap-2">
                {(["diverifikasi", "diterima", "ditolak"] as const).map((status) => (
                  <button key={status} onClick={() => updateSpmbStatus(row.id, status)} className="rounded border px-3 py-2 text-xs font-semibold capitalize">{status}</button>
                ))}
              </div>,
            ])}
          />
        </div>
      ) : null}
    </section>
  );
}

function ListEditor<T extends LeaderItem | FacilityItem>({
  title,
  items,
  onSave,
  onDelete,
}: {
  title: string;
  items: T[];
  onSave: (item: T, file?: File | null) => Promise<void>;
  onDelete: (item: T) => Promise<void>;
}) {
  const [editing, setEditing] = useState<T | null>(null);

  return (
    <div className="rounded bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          onClick={() =>
            setEditing({
              id: randomId(),
              nama: "",
              jabatan: "",
              deskripsi: "",
              foto_url: "",
            } as T)
          }
          className="inline-flex items-center rounded border px-3 py-2 text-sm font-semibold"
        >
          <Plus className="mr-2" size={16} />
          Tambah
        </button>
      </div>
      {editing ? (
        <form
          className="mt-4 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const file = (event.currentTarget.elements.namedItem("foto_file") as HTMLInputElement).files?.[0];
            await onSave(editing, file);
            setEditing(null);
          }}
        >
          <input value={editing.nama} onChange={(e) => setEditing({ ...editing, nama: e.target.value })} placeholder="Nama" className={inputClass} />
          {"jabatan" in editing ? (
            <input value={editing.jabatan} onChange={(e) => setEditing({ ...editing, jabatan: e.target.value })} placeholder="Jabatan" className={inputClass} />
          ) : null}
          <textarea value={editing.deskripsi} onChange={(e) => setEditing({ ...editing, deskripsi: e.target.value })} placeholder="Deskripsi" rows={3} className="rounded border border-gray-200 px-3 py-3 text-sm" />
          <input value={editing.foto_url} onChange={(e) => setEditing({ ...editing, foto_url: e.target.value })} placeholder="URL foto" className={inputClass} />
          <input name="foto_file" type="file" accept="image/*" className={inputClass} />
          <div className="flex gap-2">
            <button className="rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Simpan</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded border px-4 py-2 text-sm font-semibold">Batal</button>
          </div>
        </form>
      ) : null}
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded border border-gray-200 p-3">
            <div className="flex gap-3">
              {item.foto_url ? <img src={item.foto_url} alt={item.nama} className="h-16 w-16 rounded object-cover" /> : null}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.nama}</p>
                {"jabatan" in item && item.jabatan ? <p className="text-sm text-emerald-800">{item.jabatan}</p> : null}
                <p className="mt-1 text-sm text-gray-600">{item.deskripsi}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setEditing(item)} className="rounded border px-3 py-2 text-sm font-semibold">Edit</button>
              <button onClick={() => onDelete(item)} className="rounded border px-3 py-2 text-sm font-semibold text-red-600">
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
