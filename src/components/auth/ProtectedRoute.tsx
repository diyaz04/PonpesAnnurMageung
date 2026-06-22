import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { AdminEntity } from "../../contexts/AuthContext";
import { useAuth } from "../../contexts/AuthContext";

type ProtectedRouteProps = {
  allowedRoles: string[];
  entity?: AdminEntity;
};

function RouteLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream-50 px-4">
      <div className="rounded bg-white px-6 py-5 text-center shadow-soft">
        <p className="text-sm font-semibold text-gold-dark">
          Memeriksa sesi admin...
        </p>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-md rounded bg-white p-6 text-center shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-dark">
          Akses Ditolak
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-gray-950">
          Role akun tidak memiliki izin.
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Silakan gunakan akun dengan role yang sesuai untuk membuka halaman ini.
        </p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({
  allowedRoles,
  entity,
}: ProtectedRouteProps) {
  const { user, profile, profiles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoading />;
  }

  if (!user) {
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );
  }

  const activeProfile = entity ? profiles[entity] : profile;

  if (!activeProfile || !allowedRoles.includes(activeProfile.role)) {
    return <AccessDenied />;
  }

  return <Outlet />;
}
