import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  Clock,
  Settings as SettingsIcon,
  UserCircle,
  LogOut,
  Moon,
  Sun,
  Menu,
  Mail,
  MessageCircle,
  Loader2,
  ChevronDown,
  MessageSquare,
  Upload,
  Flame,
  Smartphone,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  X,
} from "lucide-react";
import { useAuthStore } from "../store/authStore.js";
import { authApi } from "../api/authApi.js";
import { useOutreachSummaryLive } from "../hooks/useOutreachLive.js";

// Restore the original accordion-style sidebar while keeping all new phase routes.
const NAV_GROUPS = [
  { type: "link", to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { type: "link", to: "/leads", label: "Upload Data", icon: Upload },
  {
    type: "link",
    to: "/qualified-leads",
    label: "Qualified Leads",
    icon: Flame,
  },
  {
    type: "group",
    key: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    children: [
      {
        to: "/whatsapp/conversations",
        label: "Conversations",
        icon: MessageSquare,
      },
      {
        to: "/outreach/whatsapp",
        label: "Bulk Messages",
        icon: Smartphone,
        channel: "whatsapp",
      },
      { to: "/whatsapp/leads", label: "WhatsApp Leads", icon: Users },
      { to: "/whatsapp/templates", label: "Templates", icon: FileText },
    ],
  },
  {
    type: "group",
    key: "email",
    label: "Email",
    icon: Mail,
    children: [
      {
        to: "/outreach/email",
        label: "Bulk Email",
        icon: Mail,
        channel: "email",
      },
      { to: "/email/templates", label: "Templates", icon: FileText },
      {
        to: "/email/conversations",
        label: "Conversations",
        icon: MessageSquare,
      },
    ],
  },
  { type: "link", to: "/properties", label: "Properties", icon: Building2 },
  {
    type: "link",
    to: "/site-visits",
    label: "Site Visits",
    icon: CalendarCheck,
  },
  { type: "link", to: "/follow-ups", label: "Follow-ups", icon: Clock },
  {
    type: "group",
    key: "account",
    label: "Settings & Profile",
    icon: SettingsIcon,
    children: [
      { to: "/profile", label: "Profile", icon: UserCircle },
      { to: "/settings", label: "AI & Business Settings", icon: SettingsIcon },
    ],
  },
];

function OutreachBadge({ stats }) {
  if (!stats || !stats.total) return null;
  const done = stats.sent === stats.total;

  return (
    <span className="ml-auto flex shrink-0 items-center gap-1.5">
      {stats.processing > 0 && (
        <Loader2 size={12} className="animate-spin" aria-label="Sending" />
      )}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
          done
            ? "bg-primary/20 text-emerald-100"
            : "bg-white/10 text-sidebar-text"
        }`}
        title={`${stats.sent} sent, ${stats.pending + stats.paused} pending, ${stats.failed} failed`}
      >
        {stats.sent}/{stats.total}
      </span>
    </span>
  );
}

export default function DashboardLayout() {
  const { data: outreach } = useOutreachSummaryLive();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  const [expanded, setExpanded] = useState({
    whatsapp: false,
    email: false,
    account: false,
  });
  const { user, clearSession } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Automatically open the matching accordion when a nested page is loaded directly.
  useEffect(() => {
    const currentGroup = NAV_GROUPS.find(
      (item) =>
        item.type === "group" &&
        item.children.some(
          (child) =>
            location.pathname === child.to ||
            location.pathname.startsWith(`${child.to}/`),
        ),
    );

    if (currentGroup) {
      setExpanded((previous) => ({ ...previous, [currentGroup.key]: true }));
    }
  }, [location.pathname]);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setDarkMode((value) => !value);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      navigate("/login");
    }
  };

  const handleNavigate = () => setSidebarOpen(false);

  const linkClass = (isActive) =>
    `group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
      isActive
        ? "bg-sidebar-active font-extrabold text-sidebar-active-text shadow-sm"
        : "font-semibold text-sidebar-text hover:bg-white/10 hover:text-white"
    } ${sidebarCollapsed ? "justify-center" : ""}`;

  const renderNav = () =>
    NAV_GROUPS.map((item) => {
      if (item.type === "link") {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end
            onClick={handleNavigate}
            className={({ isActive }) => linkClass(isActive)}
            title={sidebarCollapsed ? item.label : undefined}
            aria-label={sidebarCollapsed ? item.label : undefined}
          >
            <Icon size={18} className="shrink-0" aria-hidden="true" />
            {!sidebarCollapsed && (
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            )}
          </NavLink>
        );
      }

      const Icon = item.icon;
      const active = item.children.some(
        (child) =>
          location.pathname === child.to ||
          location.pathname.startsWith(`${child.to}/`),
      );
      const isOpen = Boolean(expanded[item.key]);

      return (
        <div key={item.key} className="space-y-1">
          <button
            type="button"
            onClick={() => {
              if (sidebarCollapsed) setSidebarCollapsed(false);
              setExpanded((previous) =>
                previous[item.key]
                  ? { ...previous, [item.key]: false }
                  : {
                      whatsapp: false,
                      email: false,
                      account: false,
                      [item.key]: true,
                    },
              );
            }}
            className={linkClass(active)}
            title={sidebarCollapsed ? item.label : undefined}
            aria-label={sidebarCollapsed ? item.label : undefined}
            aria-expanded={isOpen}
          >
            <Icon size={18} className="shrink-0" aria-hidden="true" />
            {!sidebarCollapsed && (
              <>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <ChevronDown
                  size={15}
                  className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </>
            )}
          </button>

          {isOpen && !sidebarCollapsed && (
            <div className="ml-4 space-y-1 border-l border-sidebar-divider pl-3">
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                return (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    onClick={handleNavigate}
                    className={({ isActive }) =>
                      `group flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${
                        isActive
                          ? "bg-white/15 font-bold text-white"
                          : "font-medium text-sidebar-muted hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <ChildIcon
                      size={15}
                      className="shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {child.label}
                    </span>
                    {child.channel && (
                      <OutreachBadge stats={outreach?.[child.channel]} />
                    )}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    });

  const SidebarContent = (
    <div className="relative flex h-full flex-col bg-brand-950 text-sidebar-text">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #022c22 0%, rgba(2,44,34,.58) 58%, rgba(2,44,34,.72) 100%), url('/images/property-login.jpg')",
        }}
      />
      <div
        className={`relative z-10 flex min-h-[88px] items-center ${
          sidebarCollapsed ? "justify-center px-2" : "gap-3 px-5"
        } py-5`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-950/30">
          <Building2 size={21} aria-hidden="true" />
        </span>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold leading-5 text-white">
              Agarwal Homez
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-muted">
              PROPAI CRM
            </p>
          </div>
        )}
      </div>

      <nav
        aria-label="Main navigation"
        className="sidebar-scrollbar-hide relative z-10 min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4"
      >
        {renderNav()}
      </nav>

      <div className="relative z-10 space-y-1 border-t border-sidebar-divider px-3 pb-3 pt-3">
        <button
          type="button"
          onClick={() => setSidebarCollapsed((value) => !value)}
          className={`hidden min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-sidebar-muted transition hover:bg-white/10 hover:text-white lg:flex ${
            sidebarCollapsed ? "justify-center" : ""
          }`}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={17} />
          ) : (
            <PanelLeftClose size={17} />
          )}
          {!sidebarCollapsed && "Collapse sidebar"}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-sidebar-text transition hover:bg-white/10 hover:text-white ${
            sidebarCollapsed ? "justify-center" : ""
          }`}
          title={sidebarCollapsed ? "Log out" : undefined}
          aria-label={sidebarCollapsed ? "Log out" : undefined}
        >
          <LogOut size={18} className="shrink-0" aria-hidden="true" />
          {!sidebarCollapsed && "Log out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-page dark:bg-ink-950">
      <aside
        className={`relative hidden shrink-0 overflow-hidden border-r border-sidebar-divider transition-[width] duration-200 lg:block ${
          sidebarCollapsed ? "w-[76px]" : "w-[264px]"
        }`}
      >
        {SidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 h-full w-full bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[min(19rem,88vw)] overflow-hidden shadow-elevated">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-5 z-20 rounded-lg p-2 text-sidebar-muted hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-surface-border bg-white px-4 dark:border-ink-800 dark:bg-ink-900 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-1 text-text-muted hover:bg-page lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            {/* <div>
              <p className="text-sm font-extrabold text-text dark:text-white">PropAI CRM</p>
              <p className="text-[11px] font-medium text-text-muted dark:text-ink-400">
                Agarwal Homez · Sales workspace
              </p>
            </div> */}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label={darkMode ? "Enable Light Mode" : "Enable Dark Mode"}
              title={darkMode ? "Light mode" : "Dark mode"}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-text-muted transition hover:bg-page dark:text-ink-300 dark:hover:bg-ink-800"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              title={user?.name || "Profile"}
              aria-label="Open profile"
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-page dark:hover:bg-ink-800"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-extrabold text-primary dark:bg-primary/20 dark:text-emerald-200">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </span>
              {/* <span className="hidden md:block">
                <span className="block max-w-32 truncate text-xs font-bold text-text dark:text-white">
                  {user?.name || "Profile"}
                </span>
                <span className="block text-[11px] capitalize text-text-muted dark:text-ink-400">
                  {user?.role || "User"}
                </span>
              </span> */}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-page p-4 dark:bg-ink-950 sm:p-6 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
