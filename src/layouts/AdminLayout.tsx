import {
  BookOpenCheck,
  FileText,
  GraduationCap,
  Home,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  ScrollText,
  ShieldAlert,
  ScanFace,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAuth } from "../contexts/AuthContext";
import { pesantrenLogoUrl, smpLogoUrl } from "../lib/brandLogos";
import {
  getPesantrenMenuForRole,
  type PesantrenMenuItem,
} from "../lib/pesantrenAdminMenu";
import { getSmpMenuForRole, type SmpMenuItem } from "../lib/smpAdminMenu";

const iconBySlug: Record<string, typeof Home> = {
  "data-santri": Users,
  "data-siswa": Users,
  "data-alumni": GraduationCap,
  "data-asatidz": Users,
  "data-guru": Users,
  "raport-santri": BookOpenCheck,
  "raport-siswa": BookOpenCheck,
  "catatan-pelanggaran": ShieldAlert,
  "capaian-santri": ScrollText,
  "capaian-siswa": ScrollText,
  "presensi-online": ScanFace,
  perizinan: FileText,
  "manajemen-akun": UserCog,
  "surat-keluar": FileText,
  psb: GraduationCap,
  spmb: GraduationCap,
  "keuangan-tagihan": Landmark,
  "konten-landing-page": Newspaper,
};

function groupMenu<T extends PesantrenMenuItem | SmpMenuItem>(menu: T[]) {
  return menu.reduce<Record<string, T[]>>((acc, item) => {
    acc[item.group] = acc[item.group] || [];
    acc[item.group].push(item);
    return acc;
  }, {});
}

export default function AdminLayout() {
  const { logout, profiles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isPesantrenArea = location.pathname.startsWith("/admin/pesantren");
  const isSmpArea = location.pathname.startsWith("/admin/smp");
  const activeProfile = isPesantrenArea
    ? profiles.pesantren
    : profiles.smp || profiles.pesantren || null;
  const activeEntity = isSmpArea ? "smp" : "pesantren";
  const activeBasePath = activeEntity === "smp" ? "/admin/smp" : "/admin/pesantren";
  const activeMenu =
    activeEntity === "smp"
      ? getSmpMenuForRole(profiles.smp?.role)
      : getPesantrenMenuForRole(profiles.pesantren?.role);
  const groupedMenu = groupMenu(activeMenu);
  const brandLogo = activeEntity === "smp" ? smpLogoUrl : pesantrenLogoUrl;
  const brandLabel = activeEntity === "smp" ? "SMP" : "Pesantren";

  async function handleLogout() {
    await logout();
    navigate("/admin/login", { replace: true });
  }

  const sidebar = (
    <aside className="flex h-full flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-5">
        <NavLink
          to={activeBasePath}
          className="flex items-center gap-3"
          onClick={() => setMobileOpen(false)}
        >
          <img
            src={brandLogo}
            alt={`Logo ${brandLabel}`}
            className="h-11 w-11 rounded border border-emerald-900/10 bg-white object-contain p-1"
          />
          <span>
            <span className="block text-sm font-semibold text-gray-950">
              Dashboard
            </span>
            <span className="block text-sm text-emerald-800">{brandLabel}</span>
          </span>
        </NavLink>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <NavLink
          to={activeBasePath}
          end
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            [
              "mb-3 flex items-center gap-3 rounded px-3 py-2 text-sm font-semibold transition",
              isActive
                ? "bg-emerald-800 text-white"
                : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-900",
            ].join(" ")
          }
        >
          <LayoutDashboard size={17} />
          Dashboard Home
        </NavLink>

        {Object.entries(groupedMenu).map(([group, items]) => (
          <div key={group} className="mt-5">
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
              {group}
            </p>
            <div className="mt-2 grid gap-1">
              {items.map((item) => {
                const Icon = iconBySlug[item.slug] || FileText;
                return (
                  <NavLink
                    key={item.slug}
                    to={`${activeBasePath}/${item.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition",
                        isActive
                          ? "bg-emerald-800 text-white"
                          : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-900",
                      ].join(" ")
                    }
                  >
                    <Icon size={17} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        {profiles.smp && activeEntity !== "smp" ? (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <NavLink
              to="/admin/smp"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-gold text-white"
                    : "text-gray-700 hover:bg-gold/10 hover:text-gold-dark",
                ].join(" ")
              }
            >
              <Home size={17} />
              Admin SMP
            </NavLink>
          </div>
        ) : null}
        {profiles.pesantren && activeEntity !== "pesantren" ? (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <NavLink
              to="/admin/pesantren"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-gold text-white"
                    : "text-gray-700 hover:bg-gold/10 hover:text-gold-dark",
                ].join(" ")
              }
            >
              <Home size={17} />
              Admin Pesantren
            </NavLink>
          </div>
        ) : null}
      </nav>

      <div className="border-t border-gray-100 p-4">
        <Button className="w-full gap-2" variant="secondary" onClick={handleLogout}>
          <LogOut size={16} />
          Keluar
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 lg:grid lg:grid-cols-[280px_1fr]">
      <div className="hidden lg:block">{sidebar}</div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[min(320px,86vw)]">{sidebar}</div>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Buka menu"
                className="grid h-10 w-10 place-items-center rounded border border-gray-200 text-gray-700 lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-dark">
                  Admin Dashboard
                </p>
                {activeProfile ? (
                  <p className="truncate text-sm text-gray-600">
                    {activeProfile.nama} · {activeProfile.role}
                  </p>
                ) : null}
              </div>
            </div>
            <NavLink
              to="/"
              className="hidden rounded border border-emerald-900/15 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 sm:inline-flex"
            >
              Lihat Website
            </NavLink>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
