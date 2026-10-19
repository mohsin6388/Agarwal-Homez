import { Outlet, Link } from "react-router-dom";
import { Building2, ShieldCheck } from "lucide-react";

export default function AuthLayout() {
  return (
    <div className="login-layout min-h-screen bg-page lg:grid lg:grid-cols-[minmax(440px,0.92fr)_1.08fr]">
      <section className="relative flex min-h-screen items-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-100/50 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-amber-50/70 to-transparent" />
        </div>
        <div className="relative mx-auto w-full max-w-[480px]">
          <Link to="/" className="hidden items-center gap-3 lg:inline-flex">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950 text-white">
              <Building2 size={26} />
            </span>
            <span className="font-display text-2xl font-bold leading-6 text-emerald-950">
              Agarwal
              <br />
              Homez<span className="ml-1 text-amber-600">—</span>
            </span>
          </Link>
          <div className="mt-6 lg:mt-16">
            <Outlet />
          </div>
          <p className="mt-9 hidden items-center justify-center gap-2 text-xs text-ink-500 sm:flex">
            <ShieldCheck size={15} /> Trusted workspace for property teams
          </p>
        </div>
      </section>

      <aside className="relative hidden min-h-screen overflow-hidden bg-gradient-to-r from-white via-emerald-50 to-emerald-100 lg:block">
        {/* Light green background outside the image */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-emerald-50 to-emerald-100" />

        {/* Property image with curved left edge */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="propertyImageCurve">
              <path
                d="
          M 45 0
          L 1000 0
          L 1000 1000
          L 45 1000
          C 170 790, 180 650, 130 500
          C 90 360, 5 180, 45 0
          Z
        "
              />
            </clipPath>

            <linearGradient id="propertyImageShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#022c22" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#022c22" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          <image
            href="/images/property-login.jpg"
            x="0"
            y="0"
            width="1000"
            height="1000"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#propertyImageCurve)"
          />

          <rect
            width="1000"
            height="1000"
            fill="url(#propertyImageShade)"
            clipPath="url(#propertyImageCurve)"
          />

          {/* Smooth dark green curve */}
          <path
            d="
        M 45 0
        C 5 180, 90 360, 130 500
        C 180 650, 170 790, 45 1000
      "
            fill="none"
            stroke="#064e3b"
            strokeWidth="10"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Bottom information card */}
        <div className="absolute bottom-8 right-8 z-10 max-w-xl rounded-2xl border border-white/15 bg-emerald-950/85 p-7 text-white shadow-2xl backdrop-blur-sm xl:bottom-12 xl:right-12 xl:p-9">
          <p className="font-display text-3xl font-semibold leading-tight xl:text-4xl">
            Spaces built around life.
          </p>

          <p className="mt-3 text-sm text-emerald-50/90">
            Agarwal Homez
            <span className="mx-2 text-amber-400">•</span>
            Client Workspace
          </p>
        </div>
      </aside>
    </div>
  );
}
