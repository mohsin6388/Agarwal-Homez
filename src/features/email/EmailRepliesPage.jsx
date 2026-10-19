import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  Send,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { emailApi } from "../../api/emailApi.js";

// Reply-related filters are intentionally removed. By default, the tracker
// loads every campaign email and keeps only delivery-related filters.
const FILTERS = [
  { value: "", label: "All emails" },
  { value: "bounced", label: "Bounced" },
  { value: "failed", label: "Failed / suppressed" },
];

function fmtDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function StatusPill({ status }) {
  const normalizedStatus = String(status || "waiting").replaceAll("_", " ");
  const isDelivered = normalizedStatus.toLowerCase() === "delivered";
  const isFailure = ["bounced", "failed", "complained", "suppressed"].includes(
    normalizedStatus.toLowerCase(),
  );

  const classes = isDelivered
    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
    : isFailure
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${classes}`}
    >
      {normalizedStatus}
    </span>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="card !p-4">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon size={19} />
        </span>
        <div>
          <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
          <p className="text-xl font-bold text-ink-900 dark:text-white">
            {Number(value || 0).toLocaleString("en-IN")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EmailRepliesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  // Empty state means no status filter: show all email records by default.
  const [state, setState] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const fetchRows = useCallback(
    async ({ quiet = false } = {}) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const response = await emailApi.replies({
          page,
          limit: 25,
          ...(state ? { state } : {}),
          ...(search ? { search } : {}),
        });
        setData(response.data);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Could not load email records. Please check the backend and Brevo setup.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, state, search],
  );

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const items = data?.items || [];
  const summary = data?.summary || {};
  const pagination = data?.pagination || {
    page: 1,
    total: 0,
    totalPages: 1,
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">
            Email Delivery Tracker
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500 dark:text-ink-400">
            View all campaign emails, send times, and delivery statuses here.
          </p>
        </div>
        <button
          onClick={() => fetchRows({ quiet: true })}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2"
        >
          {refreshing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}{" "}
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 flex gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Stat
          icon={Mail}
          label="Campaign emails"
          value={summary.total}
          tone="bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"
        />
        <Stat
          icon={Send}
          label="Queued / sending"
          value={summary.queued}
          tone="bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300"
        />
        <Stat
          icon={Inbox}
          label="Bounced / failed"
          value={(summary.bounced || 0) + (summary.failed || 0)}
          tone="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300"
        />
      </div>

      <div className="card mt-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.value || "all"}
                onClick={() => {
                  setState(filter.value);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${state === filter.value ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="relative w-full xl:max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search recipient email or subject"
              className="input-field pl-9"
            />
          </div>
        </div>
      </div>

      <div className="card mt-4 overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-ink-50 dark:bg-ink-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-ink-500 dark:text-ink-300">
                Lead
              </th>
              <th className="px-4 py-3 text-left font-semibold text-ink-500 dark:text-ink-300">
                Email / Campaign
              </th>
              <th className="px-4 py-3 text-left font-semibold text-ink-500 dark:text-ink-300">
                Sent / queued
              </th>
              <th className="px-4 py-3 text-left font-semibold text-ink-500 dark:text-ink-300">
                Delivery status
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-ink-400">
                  <Loader2 className="mx-auto animate-spin" size={23} />
                  <p className="mt-2">Loading email records…</p>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-ink-400">
                  <Inbox className="mx-auto mb-2" size={27} />
                  <p>No campaign emails found.</p>
                  <p className="mt-1 text-xs">
                    Emails sent through Brevo will be tracked here. Statuses for
                    emails sent through previous providers will not be imported.
                  </p>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item._id}
                  className="border-t border-ink-100 dark:border-ink-800"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900 dark:text-white">
                      {item.lead?.name || "Lead deleted"}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                      {item.lead?.phone || "No WhatsApp number"}
                    </p>
                    {item.siteVisit && (
                      <div className="mt-1.5">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          Visit:{" "}
                          {String(item.siteVisit.status || "").replaceAll(
                            "_",
                            " ",
                          )}
                          {item.siteVisit.propertyId?.projectName
                            ? ` · ${item.siteVisit.propertyId.projectName}`
                            : ""}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-ink-800 dark:text-ink-100">
                      {item.to || item.lead?.email || "—"}
                    </p>
                    <p className="mt-0.5 max-w-[300px] truncate text-xs text-ink-500 dark:text-ink-400">
                      {item.subject || "No subject"}
                      {item.campaign?.name ? ` · ${item.campaign.name}` : ""}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500 dark:text-ink-400">
                    {fmtDate(item.sentAt || item.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={item.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 dark:border-ink-800">
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {pagination.total
              ? `Showing ${(pagination.page - 1) * 25 + 1}–${Math.min(pagination.page * 25, pagination.total)} of ${pagination.total}`
              : "0 records"}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              className="rounded-lg border border-ink-200 p-2 disabled:opacity-40 dark:border-ink-700"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-ink-500 dark:text-ink-400">
              Page {pagination.page || 1} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={page >= (pagination.totalPages || 1) || loading}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
              className="rounded-lg border border-ink-200 p-2 disabled:opacity-40 dark:border-ink-700"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
