import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { authApi } from "../../api/authApi.js";
import { useAuthStore } from "../../store/authStore.js";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await authApi.login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setSession(data.user, data.accessToken);
      navigate(location.state?.from?.pathname || "/dashboard", {
        replace: true,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to log in. Please check your email and password and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form-shell">
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-lg">
          <BuildingMark />
        </span>
        <span>
          <span className="block font-display text-xl font-bold leading-5 text-emerald-950">
            Agarwal
          </span>
          <span className="block font-display text-xl font-bold leading-5 text-emerald-950">
            Homez
          </span>
        </span>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">
        AGARWAL HOMEZ
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
        Welcome back
      </h1>
      <p className="mt-3 text-base text-ink-500">Sign in to your workspace</p>

      <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-ink-800"
          >
            Email address
          </label>
          <div className="relative">
            <Mail
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
            />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="input-field !rounded-xl !py-4 !pl-12"
              placeholder="name@company.com"
              value={form.email}
              onChange={(e) =>
                setForm((state) => ({ ...state, email: e.target.value }))
              }
            />
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-ink-800"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-emerald-900 hover:text-emerald-700"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <LockKeyhole
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
            />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="input-field !rounded-xl !py-4 !pl-12 !pr-12"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) =>
                setForm((state) => ({ ...state, password: e.target.value }))
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((show) => !show)}
              className="absolute inset-y-0 right-0 flex items-center px-4 text-ink-500 hover:text-emerald-900"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex w-full items-center justify-center gap-2 !rounded-xl !bg-emerald-950 !py-4 text-base shadow-lg shadow-emerald-950/15 hover:!bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {loading ? "Signing in…" : "Sign in"}
          {!loading && <ArrowRight size={19} />}
        </button>
      </form>
      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-ink-500">
        <ShieldCheck size={17} className="text-emerald-900" />
        <span>Secure access for Agarwal Homez</span>
      </div>
    </div>
  );
}

function BuildingMark() {
  return <Building2 size={22} />;
}
