import {
  AlertTriangle,
  ArrowRight,
  GraduationCap,
  Landmark,
  ScanFace,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SmpDataModule } from "../../components/smp/SmpDataModules";
import { useAuth } from "../../contexts/AuthContext";
import { getSmpMenuForRole } from "../../lib/smpAdminMenu";
import { supabase } from "../../lib/supabase";

type DashboardStats = {
  totalSiswaAktif: number;
  totalAlumni: number;
  tagihanBelumLunas: number | null;
  nominalBelumLunas: number | null;
  pelanggaranBulanIni: number;
  presensiHariIni: number;
};

type RecentInvoice = {
  id: string;
  anggota_id: string;
  nama_tagihan: string | null;
  nominal: number;
  status: string;
  jatuh_tempo: string | null;
  periode: string | null;
  created_at: string;
  anggota_nama?: string;
  nis?: string;
};

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function nextMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value: number | null) {
  return new Intl.NumberFormat("id-ID").format(value || 0);
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="min-w-0 rounded-xl bg-white p-3 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-4 text-gray-500 sm:text-sm">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold leading-none text-gray-950 sm:mt-3 sm:text-3xl">
            {value}
          </p>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800 sm:h-11 sm:w-11 sm:rounded">
          <Icon className="h-4 w-4 sm:h-[21px] sm:w-[21px]" />
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-gray-500 sm:mt-4 sm:text-sm sm:leading-6 sm:text-gray-600">
        {detail}
      </p>
    </article>
  );
}

function AccessDeniedModule() {
  return (
    <section className="rounded bg-white p-6 shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">
        Akses Ditolak
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-gray-950">
        Role akun tidak memiliki izin membuka menu ini.
      </h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">
        Gunakan menu yang tersedia di sidebar sesuai role login saat ini.
      </p>
    </section>
  );
}

function SmpDashboardHome({ role }: { role: string }) {
  const [stats, setStats] = useState<DashboardStats>({
    totalSiswaAktif: 0,
    totalAlumni: 0,
    tagihanBelumLunas: null,
    nominalBelumLunas: null,
    pelanggaranBulanIni: 0,
    presensiHariIni: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const showFinance = role === "superadmin" || role === "bendahara";

  useEffect(() => {
    async function loadRecentInvoices() {
      if (!showFinance) {
        setRecentInvoices([]);
        return;
      }

      const invoiceResult = await supabase
        .from("keu_tagihan")
        .select("id, anggota_id, nama_tagihan, nominal, status, jatuh_tempo, periode, created_at")
        .eq("entitas", "pesantren")
        .is("ditarik_at", null)
        .order("created_at", { ascending: false })
        .limit(6);
      const invoiceRows = (invoiceResult.data || []) as RecentInvoice[];
      const memberIds = Array.from(new Set(invoiceRows.map((invoice) => invoice.anggota_id)));
      const [santriResult, siswaResult] = memberIds.length
        ? await Promise.all([
            supabase
              .from("pp_santri")
              .select("id, nis, nama_lengkap")
              .in("id", memberIds),
            supabase
              .from("smp_siswa")
              .select("id, nis, nama_lengkap")
              .in("id", memberIds),
          ])
        : [{ data: [] }, { data: [] }];
      const memberMap = new Map(
        [
          ...((santriResult.data || []) as Array<{ id: string; nis: string; nama_lengkap: string }>),
          ...((siswaResult.data || []) as Array<{ id: string; nis: string; nama_lengkap: string }>),
        ].map(
          (member) => [member.id, member],
        ),
      );

      setRecentInvoices(
        invoiceRows.map((invoice) => {
          const member = memberMap.get(invoice.anggota_id);
          return {
            ...invoice,
            anggota_nama: member?.nama_lengkap,
            nis: member?.nis,
          };
        }),
      );
    }

    async function loadStats() {
      setLoading(true);
      const [siswaAktif, alumni, pelanggaran, presensi, tagihan] =
        await Promise.all([
          supabase
            .from("smp_siswa")
            .select("id", { count: "exact", head: true })
            .eq("status", "aktif"),
          supabase
            .from("smp_siswa")
            .select("id", { count: "exact", head: true })
            .eq("status", "alumni"),
          supabase
            .from("smp_pelanggaran")
            .select("id", { count: "exact", head: true })
            .gte("tanggal", monthStart())
            .lt("tanggal", nextMonthStart()),
          supabase
            .from("smp_presensi")
            .select("id", { count: "exact", head: true })
            .eq("tanggal", today()),
          showFinance
            ? supabase
                .from("keu_tagihan")
                .select("id, nominal", { count: "exact" })
                .eq("entitas", "pesantren")
                .neq("status", "lunas")
                .is("ditarik_at", null)
            : Promise.resolve({ data: [], count: null }),
        ]);

      await loadRecentInvoices();
      setStats({
        totalSiswaAktif: siswaAktif.count || 0,
        totalAlumni: alumni.count || 0,
        pelanggaranBulanIni: pelanggaran.count || 0,
        presensiHariIni: presensi.count || 0,
        tagihanBelumLunas: showFinance ? tagihan.count || 0 : null,
        nominalBelumLunas: showFinance
          ? (tagihan.data || []).reduce(
              (sum, row) => sum + Number(row.nominal || 0),
              0,
            )
          : null,
      });
      setLoading(false);
    }

    loadStats();
  }, [showFinance]);

  const visibleMenu = getSmpMenuForRole(role);

  return (
    <div className="grid gap-6">
      <section className="rounded bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-dark">
          Dashboard SMP
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-gray-950">
          Ringkasan SMP Ma'arif NU Sariwangi
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Statistik utama, presensi hari ini, dan akses cepat modul sesuai role.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <StatCard
          icon={Users}
          label="Total siswa aktif"
          value={loading ? "..." : formatNumber(stats.totalSiswaAktif)}
          detail="Siswa dengan status aktif."
        />
        <StatCard
          icon={GraduationCap}
          label="Total alumni"
          value={loading ? "..." : formatNumber(stats.totalAlumni)}
          detail="Siswa dengan status alumni."
        />
        {showFinance ? (
          <StatCard
            icon={Landmark}
            label="Tagihan belum lunas"
            value={loading ? "..." : formatNumber(stats.tagihanBelumLunas)}
            detail={`Estimasi nominal: ${loading ? "..." : formatCurrency(stats.nominalBelumLunas)}`}
          />
        ) : null}
        <StatCard
          icon={AlertTriangle}
          label="Pelanggaran bulan ini"
          value={loading ? "..." : formatNumber(stats.pelanggaranBulanIni)}
          detail="Catatan pelanggaran pada bulan berjalan."
        />
        <StatCard
          icon={ScanFace}
          label="Presensi hari ini"
          value={loading ? "..." : formatNumber(stats.presensiHariIni)}
          detail="Presensi yang sudah tercatat hari ini."
        />
      </div>

      {showFinance ? (
        <section className="rounded bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-950">Tagihan Terbaru</h2>
            <Link
              to="/admin/smp/keuangan-tagihan"
              className="text-sm font-semibold text-emerald-800"
            >
              Kelola tagihan
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.12em] text-gray-500">
                <tr>
                  <th className="px-4 py-3">Periode</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Tagihan</th>
                  <th className="px-4 py-3">Nominal</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentInvoices.length ? (
                  recentInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3">{invoice.periode || "-"}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">
                          {invoice.anggota_nama || "-"}
                        </p>
                        <p className="text-xs text-gray-500">{invoice.nis || "-"}</p>
                      </td>
                      <td className="px-4 py-3">{invoice.nama_tagihan || "Tagihan"}</td>
                      <td className="px-4 py-3">{formatCurrency(invoice.nominal)}</td>
                      <td className="px-4 py-3">{invoice.status.replace("_", " ")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      Belum ada tagihan terbaru.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded bg-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-gray-950">Akses Cepat</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleMenu.map((item) => (
            <Link
              key={item.slug}
              to={`/admin/smp/${item.slug}`}
              className="flex items-center justify-between gap-4 rounded border border-gray-200 p-4 text-sm font-semibold text-gray-800 transition hover:border-emerald-800/30 hover:bg-emerald-50"
            >
              {item.label}
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function SmpAdminPage() {
  const { profiles } = useAuth();
  const location = useLocation();
  const role = profiles.smp?.role || "";
  const slug = useMemo(() => {
    const prefix = "/admin/smp";
    return location.pathname.replace(prefix, "").replace(/^\/+/, "");
  }, [location.pathname]);
  const allowedSlugs = getSmpMenuForRole(role).map((item) => item.slug);

  if (!slug) {
    return <SmpDashboardHome role={role} />;
  }

  if (!allowedSlugs.includes(slug)) {
    return <AccessDeniedModule />;
  }

  return <SmpDataModule slug={slug} role={role} />;
}
