export type PesantrenAdminRole = "superadmin" | "admin" | "bendahara" | "guru";

export type PesantrenMenuItem = {
  slug: string;
  label: string;
  group: "Data" | "Akademik" | "Administrasi" | "Keuangan" | "Landing Page";
  roles: PesantrenAdminRole[];
};

export const pesantrenMenuItems: PesantrenMenuItem[] = [
  {
    slug: "data-santri",
    label: "Data Santri",
    group: "Data",
    roles: ["superadmin", "admin"],
  },
  {
    slug: "data-alumni",
    label: "Data Alumni",
    group: "Data",
    roles: ["superadmin", "admin"],
  },
  {
    slug: "data-asatidz",
    label: "Data Asatidz",
    group: "Data",
    roles: ["superadmin", "admin"],
  },
  {
    slug: "raport-santri",
    label: "Raport Santri",
    group: "Akademik",
    roles: ["superadmin", "admin", "guru"],
  },
  {
    slug: "catatan-pelanggaran",
    label: "Catatan Pelanggaran",
    group: "Akademik",
    roles: ["superadmin", "admin", "guru"],
  },
  {
    slug: "capaian-santri",
    label: "Capaian Santri",
    group: "Akademik",
    roles: ["superadmin", "admin", "guru"],
  },
  {
    slug: "perizinan",
    label: "Perizinan",
    group: "Administrasi",
    roles: ["superadmin", "admin", "guru"],
  },
  {
    slug: "manajemen-akun",
    label: "Manajemen Akun",
    group: "Administrasi",
    roles: ["superadmin"],
  },
  {
    slug: "surat-keluar",
    label: "Generate Surat Keluar",
    group: "Administrasi",
    roles: ["superadmin", "admin"],
  },
  {
    slug: "psb",
    label: "PSB",
    group: "Administrasi",
    roles: ["superadmin", "admin"],
  },
  {
    slug: "keuangan-tagihan",
    label: "Keuangan & Tagihan",
    group: "Keuangan",
    roles: ["superadmin", "bendahara"],
  },
  {
    slug: "konten-landing-page",
    label: "Konten Landing Page",
    group: "Landing Page",
    roles: ["superadmin"],
  },
];

export function getPesantrenMenuForRole(role?: string | null) {
  return pesantrenMenuItems.filter((item) =>
    item.roles.includes(role as PesantrenAdminRole),
  );
}
