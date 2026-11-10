import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  X,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Ban,
  Send,
  Hourglass,
  AlertTriangle,
} from "lucide-react";
import { campaignApi } from "../../api/outreachApi.js";
import { fmtDateTime } from "./StatusChip.jsx";
import { timeLeft, useNowTick } from "./FailedDeliveryModal.jsx";

export const CONTACTED_KEY = ["outreach", "contacted"];
const PAGE_SIZE = 50;

const TABS = [
  { id: "all", label: "Sab bheje gaye" },
  { id: "sent", label: "Gaye hue" },
  { id: "failed", label: "Failed" },
  { id: "retry_later", label: "Baad me ja sakte hain" },
  { id: "cannot_send", label: "Kabhi nahi ja sakte" },
  { id: "queued", label: "Queue me" },
];

function Box({ label, value, hint, tone }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${tone}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="font-display text-lg font-bold">
        {Number(value || 0).toLocaleString("en-IN")}
      </p>
      {hint && <p className="mt-0.5 text-[11px] opacity-80">{hint}</p>}
    </div>
  );
}

function StatusChip({ contact, now }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap";
  switch (contact.group) {
    case "delivered":
      return (
        <span
          className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}
        >
          <CheckCircle2 size={13} /> Delivered
        </span>
      );
    case "awaiting":
      return (
        <span
          className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}
        >
          <Send size={13} /> Sent
        </span>
      );
    case "retry_later": {
      const at = contact.retryAfter
        ? new Date(contact.retryAfter).getTime()
        : 0;
      if (!at || at <= now) {
        return (
          <span
            className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}
          >
            <CheckCircle2 size={13} /> Ab ja sakta hai
          </span>
        );
      }
      return (
        <span
          className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`}
        >
          <Clock size={13} /> {timeLeft(at, now)} baad
        </span>
      );
    }
    case "cannot_send":
      return (
        <span
          className={`${base} bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400`}
        >
          <Ban size={13} /> Kabhi nahi ja sakta
        </span>
      );
    default:
      return (
        <span
          className={`${base} bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300`}
        >
          <Hourglass size={13} /> Queue me
        </span>
      );
  }
}

/**
 * WhatsApp campaigns me jin contacts ko message ja chuka hai (ya send fail hua)
 * unka summary + list. Naye campaign ke contacts picker se ye contacts chhupe
 * rehte hain, isliye yahan se dekh sakte hain: kitne gaye, kitne failed,
 * failed me se kitne baad me ja sakte hain aur kitne kabhi nahi.
 */
export default function ContactedContactsModal({
  onClose,
  initialTab = "all",
}) {
  const now = useNowTick();
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setPage(1);
  }, [tab, query]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const summaryQ = useQuery({
    queryKey: [...CONTACTED_KEY, "summary"],
    queryFn: () => campaignApi.contactedSummary(),
    staleTime: 0,
  });
  const listQ = useQuery({
    queryKey: [...CONTACTED_KEY, "list", tab, query, page],
    queryFn: () =>
      campaignApi.contactedList({
        group: tab,
        page,
        limit: PAGE_SIZE,
        ...(query ? { search: query } : {}),
      }),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  const s = summaryQ.data?.data?.summary;
  const reasons = (summaryQ.data?.data?.reasons || []).filter((r) =>
    tab === "retry_later"
      ? r.group === "retry_later"
      : tab === "cannot_send"
        ? r.group === "cannot_send"
        : true,
  );
  const contacts = listQ.data?.data?.contacts || [];
  const total = listQ.data?.data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showReasons = ["failed", "retry_later", "cannot_send"].includes(tab);

  const counts = {
    all: s?.contacted,
    sent: s?.sent,
    failed: s?.failed,
    retry_later: s?.retryLater?.total,
    cannot_send: s?.cannotSend,
    queued: s?.queued,
  };

  // Portal: launcher modal ke transform/overflow se bahar, seedha body par
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-2 sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bheje gaye contacts"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl dark:bg-ink-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 dark:border-ink-800">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900 dark:text-white">
              <Send size={18} className="text-brand-600" />
              Bheje gaye contacts
            </h3>
            <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
              Ye contacts naye campaign ki list me nahi dikhte. Yahan dekh sakte
              hain kis ko gaya, kis ka fail hua aur kab dobara ja sakta hai.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2 px-5 pt-4 sm:grid-cols-4">
          <Box
            label="Total bheje gaye"
            value={s?.contacted}
            hint={
              s ? `${(s.delivered || 0).toLocaleString("en-IN")} delivered` : ""
            }
            tone="bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
          />
          <Box
            label="Safaltapurvak gaye"
            value={s?.sent}
            hint={
              s && s.awaiting
                ? `${s.awaiting.toLocaleString("en-IN")} ka delivery status baaki`
                : ""
            }
            tone="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
          />
          <Box
            label="Failed"
            value={s?.failed}
            hint={
              s
                ? `${(s.retryLater?.total || 0).toLocaleString("en-IN")} baad me · ${(s.cannotSend || 0).toLocaleString("en-IN")} kabhi nahi`
                : ""
            }
            tone="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
          />
          <Box
            label="Baad me ja sakte"
            value={s?.retryLater?.total}
            hint={
              s?.retryLater?.total
                ? `${(s.retryLater.ready || 0).toLocaleString("en-IN")} abhi ready${
                    s.retryLater.nextRetryAt
                      ? ` · agla ${timeLeft(s.retryLater.nextRetryAt, now)} me`
                      : ""
                  }`
                : ""
            }
            tone="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
          />
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          className="mt-4 flex gap-1 overflow-x-auto px-5"
          aria-label="Contacts ka group"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                tab === t.id
                  ? "bg-brand-600 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
              }`}
            >
              {t.label}
              {counts[t.id] != null && (
                <span className="ml-1.5 opacity-80">
                  {Number(counts[t.id]).toLocaleString("en-IN")}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="px-5 pt-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              className="input-field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Naam ya mobile se dhundhein"
              aria-label="Bheje gaye contacts search"
            />
          </div>
          {showReasons && reasons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {reasons.map((r) => (
                <span
                  key={`${r.group}-${r.code}`}
                  className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] text-ink-600 dark:bg-ink-800 dark:text-ink-300"
                  title={r.code ? `Meta error ${r.code}` : undefined}
                >
                  <AlertTriangle size={11} className="text-amber-500" />
                  {r.reason} · <b>{Number(r.count).toLocaleString("en-IN")}</b>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        <div className="mt-3 min-h-0 flex-1 overflow-auto px-5">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-ink-500 dark:bg-ink-900 dark:text-ink-400">
              <tr>
                <th className="py-2 pr-3">Contact</th>
                <th className="py-2 pr-3">Campaign</th>
                <th className="py-2 pr-3">Detail</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {listQ.isLoading && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-ink-500">
                    <Loader2 className="mx-auto animate-spin" />
                  </td>
                </tr>
              )}
              {listQ.isError && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-red-600">
                    {listQ.error?.response?.data?.message ||
                      "Contacts load nahi hue. Dobara try karein."}
                  </td>
                </tr>
              )}
              {!listQ.isLoading && !listQ.isError && contacts.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-10 text-center text-ink-500 dark:text-ink-400"
                  >
                    Is group me koi contact nahi hai.
                  </td>
                </tr>
              )}
              {contacts.map((c) => (
                <tr
                  key={c.leadId}
                  className="border-t border-ink-100 align-top dark:border-ink-800"
                >
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-ink-900 dark:text-white">
                      {c.name || "—"}
                    </p>
                    <p className="text-xs tabular-nums text-ink-500 dark:text-ink-400">
                      {c.phone || "—"}
                    </p>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-ink-600 dark:text-ink-300">
                    {c.campaignName || "—"}
                    {c.sentAt && (
                      <span className="block text-ink-400">
                        {fmtDateTime(c.sentAt)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-ink-600 dark:text-ink-300">
                    {["retry_later", "cannot_send"].includes(c.group) ? (
                      <>
                        {c.reason}
                        {c.group === "retry_later" && c.retryAfter && (
                          <span className="block text-ink-400">
                            Dobara ja sakta hai: {fmtDateTime(c.retryAfter)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <StatusChip contact={c} now={now} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 px-5 py-3 text-xs text-ink-500 dark:border-ink-800 dark:text-ink-400">
          <span>
            <b className="text-ink-800 dark:text-ink-100">
              {Number(total).toLocaleString("en-IN")}
            </b>{" "}
            contacts
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || listQ.isFetching}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary !px-2 !py-1.5 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages || listQ.isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary !px-2 !py-1.5 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
