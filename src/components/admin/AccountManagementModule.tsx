import { Plus, RefreshCcw, Save, ShieldCheck, UserCog } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AdminEntity } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

type ManagedRole = "admin" | "bendahara" | "guru";

type AccountProfile = {
  id: string;
  nama: string;
  role: ManagedRole | "superadmin";
  created_at: string;
};

type AccountForm = {
  nama: string;
  email: string;
  password: string;
  role: ManagedRole;
  no_hp: string;
  mata_pelajaran: string;
};

const roleOptions: { value: ManagedRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "bendahara", label: "Bendahara" },
  { value: "guru", label: "Guru" },
];

const emptyForm: AccountForm = {
  nama: "",
  email: "",
  password: "",
  role: "admin",
  no_hp: "",
  mata_pelajaran: "",
};

const inputClass =
  "min-h-11 rounded border border-gray-200 px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function entityLabel(entity: AdminEntity) {
  return entity === "smp" ? "SMP" : "Pesantren";
}

export default function AccountManagementModule({
  entity,
}: {
  entity: AdminEntity;
}) {
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const tableName = entity === "smp" ? "smp_profiles" : "pp_profiles";
  const visibleProfiles = useMemo(
    () => profiles.filter((profile) => profile.role !== "superadmin"),
    [profiles],
  );

  async function loadProfiles() {
    setLoading(true);
    const { data, error } = await supabase
      .from(tableName)
      .select("id,nama,role,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setProfiles((data || []) as AccountProfile[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProfiles();
  }, [tableName]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!form.nama.trim() || !form.email.trim() || !form.password) {
      setMessage("Nama, email, dan password wajib diisi.");
      return;
    }

    if (form.password.length < 6) {
      setMessage("Password minimal 6 karakter.");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.functions.invoke(
      "create-managed-account",
      {
        body: {
          entitas: entity,
          role: form.role,
          nama: form.nama,
          email: form.email,
          password: form.password,
          no_hp: form.no_hp,
          mata_pelajaran: form.mata_pelajaran,
        },
      },
    );

    setSaving(false);

    if (error || data?.error) {
      setMessage(data?.error || error?.message || "Akun belum berhasil dibuat.");
      return;
    }

    setMessage(`Akun ${roleOptions.find((role) => role.value === form.role)?.label} berhasil dibuat.`);
    setForm(emptyForm);
    loadProfiles();
  }

  return (
    <section className="grid gap-5">
      <div className="rounded bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-dark">
          Super Admin
        </p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-950">
              Manajemen Akun {entityLabel(entity)}
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Buat akun admin, bendahara, dan guru untuk area {entityLabel(entity)}.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded border border-emerald-900/15 px-3 py-2 text-sm font-semibold text-emerald-900">
            <ShieldCheck size={17} />
            Khusus Superadmin
          </span>
        </div>
      </div>

      <form onSubmit={createAccount} className="rounded bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-950">
          <UserCog size={20} />
          Buat Akun Baru
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Role
            <select
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  role: event.target.value as ManagedRole,
                }))
              }
              className={inputClass}
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Nama lengkap
            <input
              value={form.nama}
              onChange={(event) =>
                setForm((current) => ({ ...current, nama: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Email login
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Password awal
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            No. HP
            <input
              value={form.no_hp}
              onChange={(event) =>
                setForm((current) => ({ ...current, no_hp: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          {entity === "smp" && form.role === "guru" ? (
            <label className="grid gap-2 text-sm font-semibold text-gray-700">
              Mata pelajaran
              <input
                value={form.mata_pelajaran}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    mata_pelajaran: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </label>
          ) : null}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving ? (
              <RefreshCcw className="mr-2 animate-spin" size={17} />
            ) : (
              <Save className="mr-2" size={17} />
            )}
            {saving ? "Membuat..." : "Buat Akun"}
          </button>
          <button
            type="button"
            onClick={() => setForm(emptyForm)}
            className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold"
          >
            Reset
          </button>
        </div>
        {message ? (
          <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p>
        ) : null}
      </form>

      <div className="rounded bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-950">Akun Terdaftar</h2>
          <button
            type="button"
            onClick={loadProfiles}
            className="inline-flex w-fit items-center rounded border border-gray-200 px-3 py-2 text-sm font-semibold"
          >
            <RefreshCcw className="mr-2" size={16} />
            Refresh
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.12em] text-gray-500">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={3}>
                    Memuat akun...
                  </td>
                </tr>
              ) : visibleProfiles.length ? (
                visibleProfiles.map((profile) => (
                  <tr key={profile.id}>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {profile.nama}
                    </td>
                    <td className="px-4 py-3 capitalize">{profile.role}</td>
                    <td className="px-4 py-3">{formatDate(profile.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={3}>
                    Belum ada akun admin, bendahara, atau guru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
