export type SmpAdminRole = "superadmin" | "admin" | "bendahara" | "guru";

export type SmpMenuItem = {
  slug: string;
  label: string;
  group:
    | "Data"
    | "Akademik"
    | "Administrasi"
    | "Keuangan"
    | "Landing Page"
    | "Presensi";
  roles: SmpAdminRole[];
};

export const smpMenuItems: SmpMenuItem[] = [
  {
    slug: "data-siswa",
    label: "Data Siswa",
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
    slug: "data-guru",
    label: "Data Guru",
    group: "Data",
    roles: ["superadmin", "admin"],
  },
  {
    slug: "raport-siswa",
    label: "Raport Siswa",
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
    slug: "capaian-siswa",
    label: "Capaian Siswa",
    group: "Akademik",
    roles: ["superadmin", "admin", "guru"],
  },
  {
    slug: "presensi-online",
    label: "Presensi Online",
    group: "Presensi",
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
    slug: "spmb",
    label: "SPMB",
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

export function getSmpMenuForRole(role?: string | null) {
  return smpMenuItems.filter((item) =>
    item.roles.includes(role as SmpAdminRole),
  );
}
