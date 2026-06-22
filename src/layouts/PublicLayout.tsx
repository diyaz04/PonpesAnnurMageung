import { Outlet } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-cream-50 text-gray-900">
      <main>
        <Outlet />
      </main>
    </div>
  );
}
