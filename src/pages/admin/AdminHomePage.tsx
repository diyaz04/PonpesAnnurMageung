import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminHomePage() {
  const { profile } = useAuth();

  if (profile?.entitas === "smp") {
    return <Navigate to="/admin/smp" replace />;
  }

  return <Navigate to="/admin/pesantren" replace />;
}
