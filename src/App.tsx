import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import PublicLayout from "./layouts/PublicLayout";
import AdminHomePage from "./pages/admin/AdminHomePage";
import LoginPage from "./pages/admin/LoginPage";
import PesantrenAdminPage from "./pages/admin/PesantrenAdminPage";
import SmpAdminPage from "./pages/admin/SmpAdminPage";
import PesantrenArticlePage from "./pages/public/PesantrenArticlePage";
import PesantrenLandingPage from "./pages/public/PesantrenLandingPage";
import PermissionValidationPage from "./pages/public/PermissionValidationPage";
import SmpLandingPage from "./pages/public/SmpLandingPage";
import SmpPresensiPage from "./pages/public/SmpPresensiPage";

const adminRoles = ["superadmin", "admin", "bendahara", "guru"];

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<PesantrenLandingPage />} />
        <Route path="berita/:id" element={<PesantrenArticlePage />} />
        <Route path="smp/berita/:id" element={<PesantrenArticlePage />} />
        <Route path="smp" element={<SmpLandingPage />} />
        <Route path="validasi-izin/:id" element={<PermissionValidationPage />} />
      </Route>

      {/* Presensi publik — standalone full-page tanpa PublicLayout */}
      <Route path="smp/presensi" element={<SmpPresensiPage />} />

      <Route path="admin/login" element={<LoginPage />} />
      <Route path="admin" element={<ProtectedRoute allowedRoles={adminRoles} />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route
            path="pesantren/*"
            element={
              <ProtectedRoute allowedRoles={adminRoles} entity="pesantren" />
            }
          >
            <Route index element={<PesantrenAdminPage />} />
            <Route path="*" element={<PesantrenAdminPage />} />
          </Route>
          <Route
            path="smp/*"
            element={<ProtectedRoute allowedRoles={adminRoles} entity="smp" />}
          >
            <Route index element={<SmpAdminPage />} />
            <Route path="*" element={<SmpAdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
