import { ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { pesantrenLogoUrl, smpLogoUrl } from "../../lib/brandLogos";
import { supabase } from "../../lib/supabase";

const loginSchema = z.object({
  email: z.string().email("Email tidak valid."),
  password: z.string().min(6, "Password minimal 6 karakter."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LocationState = {
  from?: string;
};

export default function LoginPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const defaultRedirect = useMemo(() => {
    if (profile?.entitas === "smp") {
      return "/admin/smp";
    }

    return "/admin/pesantren";
  }, [profile?.entitas]);

  const redirectTo = locationState?.from ?? defaultRedirect;

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!loading && user && profile) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, navigate, profile, redirectTo, user]);

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);

    const parsedValues = loginSchema.safeParse(values);

    if (!parsedValues.success) {
      const fieldErrors = parsedValues.error.flatten().fieldErrors;

      if (fieldErrors.email?.[0]) {
        setError("email", { message: fieldErrors.email[0] });
      }

      if (fieldErrors.password?.[0]) {
        setError("password", { message: fieldErrors.password[0] });
      }

      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword(
      parsedValues.data,
    );

    if (error) {
      setFormError("Email atau password tidak sesuai.");
      return;
    }

    const nextProfile = await refreshProfile(data.user);

    if (!nextProfile) {
      await supabase.auth.signOut();
      setFormError("Akun belum memiliki profile admin.");
      return;
    }

    const nextRedirect =
      locationState?.from ??
      (nextProfile.entitas === "smp" ? "/admin/smp" : "/admin/pesantren");

    navigate(nextRedirect, { replace: true });
  }

  // Deteksi entitas dari URL tujuan redirect
  const entityFromRedirect: "smp" | "pesantren" | null = useMemo(() => {
    const from = locationState?.from ?? "";
    if (from.startsWith("/admin/smp")) return "smp";
    if (from.startsWith("/admin/pesantren")) return "pesantren";
    return null;
  }, [locationState?.from]);

  // Setelah login, profile menentukan entitas
  const entity: "smp" | "pesantren" =
    profile?.entitas === "smp"
      ? "smp"
      : entityFromRedirect === "smp"
        ? "smp"
        : "pesantren";

  const logoUrl = entity === "smp" ? smpLogoUrl : pesantrenLogoUrl;
  const entityLabel =
    entity === "smp" ? "SMP Ma'arif NU Sariwangi" : "PP An-Nur Mageung";

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-krem-50 px-4">
        <p className="text-sm font-semibold text-green-700">
          Memeriksa sesi admin...
        </p>
      </div>
    );
  }

  if (user && profile) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-krem-50 px-4 py-10 text-gray-900">
      <section className="w-full max-w-md rounded bg-white p-6 shadow-soft sm:p-8">
        {/* Logo + identitas lembaga */}
        <div className="mb-6 flex items-center gap-4">
          <img
            src={logoUrl}
            alt={entityLabel}
            className="h-14 w-14 shrink-0 rounded-xl border border-gray-100 bg-white object-contain p-1 shadow-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700">
              Admin
            </p>
            <p className="mt-0.5 text-sm font-semibold text-gray-800">
              {entityLabel}
            </p>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-gray-950">
            Masuk Dashboard
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Gunakan email dan password admin yang terdaftar di Supabase Auth.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label
              className="text-sm font-medium text-gray-800"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              placeholder="admin@example.com"
              {...register("email")}
            />
            {errors.email ? (
              <p className="mt-2 text-sm text-red-600">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div>
            <label
              className="text-sm font-medium text-gray-800"
              htmlFor="password"
            >
              Password
            </label>
            <div className="mt-2 flex rounded border border-gray-300 bg-white focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="min-w-0 flex-1 rounded bg-transparent px-3 py-2.5 text-sm outline-none"
                placeholder="Masukkan password"
                {...register("password")}
              />
              <button
                type="button"
                className="grid w-11 place-items-center text-gray-500 transition hover:text-green-700"
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password ? (
              <p className="mt-2 text-sm text-red-600">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          {formError ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          ) : null}

          <Button
            className="w-full gap-2 py-3"
            disabled={isSubmitting}
            type="submit"
          >
            <LogIn size={18} />
            {isSubmitting ? "Memproses..." : "Masuk"}
          </Button>
        </form>

        <Link
          to="/"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded border border-green-900/15 px-4 py-2.5 text-sm font-semibold text-green-950 transition hover:bg-green-50"
        >
          <ArrowLeft size={17} />
          Kembali ke Landing Page
        </Link>
      </section>
    </main>
  );
}
