import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Loader2,
  RotateCcw,
  Clock,
  CheckCircle2,
  Ban,
  AlertTriangle,
} from "lucide-react";
import { campaignApi } from "../../api/outreachApi.js";
import { fmtDateTime } from "./StatusChip.jsx";

export const DELIVERY_FAILURES_KEY = ["outreach", "delivery-failures"];

/** "5h 12m" / "42m" / "now" */
export function timeLeft(target, now = Date.now()) {
  const ms = new Date(target).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return "now";
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** Har 30 sec re-render, taaki timer chalta rahe */
export function useNowTick(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Chip({ contact, now }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap";
  const retryAt = new Date(contact.retryAfter).getTime();

  if (!contact.retryable) {
    return (
      <span
        className={`${base} bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400`}
      >
        <Ban size={13} /> Can’t retry
      </span>
    );
  }
  if (retryAt <= now) {
    return (
      <span
        className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}
      >
        <CheckCircle2 size={13} /> Ready
      </span>
    );
  }
  return (
    <span
      className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`}
    >
      <Clock size={13} /> Ready in {timeLeft(retryAt, now)}
    </span>
  );
}

function Box({ label, value, tone }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${tone}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="font-display text-lg font-bold">{value}</p>
    </div>
  );
}

/**
 * Campaign ke Meta-delivery-failed contacts + har ek ka timer.
 * Jab contacts "ready" hon, ek click se sab dobara bulk queue mein chale jate hain.
 */
export default function FailedDeliveryModal({ campaign, onClose, onRetried }) {
  const qc = useQueryClient();
  const now = useNowTick();
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: [...DELIVERY_FAILURES_KEY, campaign._id],
    queryFn: () => campaignApi.deliveryFailures(campaign._id),
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const contacts = data?.data?.contacts || [];
  const maxRetries = data?.data?.maxRetries ?? 2;

  // Timer client par live chalta hai, isliye counts bhi yahin se nikalte hain
  let ready = 0;
  let waiting = 0;
  let blocked = 0;
  let nextReadyAt = null;
  for (const c of contacts) {
    const at = new Date(c.retryAfter).getTime();
    if (!c.retryable) blocked += 1;
    else if (at <= now) ready += 1;
    else {
      waiting += 1;
      if (nextReadyAt === null || at < nextReadyAt) nextReadyAt = at;
    }
  }

  const resend = async () => {
    if (
      !window.confirm(
        `${ready} ready contact(s) ko dobara WhatsApp bulk mein bhejna hai?`,
      )
    )
      return;
    setResending(true);
    setError("");
    try {
      await campaignApi.retryDeliveryFailed(campaign._id);
      qc.invalidateQueries({ queryKey: DELIVERY_FAILURES_KEY });
      onRetried?.();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Resend failed.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl dark:bg-ink-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 dark:border-ink-800">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900 dark:text-white">
              <AlertTriangle size={18} className="text-red-500" />
              Failed deliveries
            </h3>
            <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
              Campaign: <b>{campaign.name}</b> — Meta ne bataya ki ye messages
              deliver nahi hue.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 px-5 pt-4 sm:grid-cols-4">
          <Box
            label="Failed"
            value={contacts.length}
            tone="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
          />
          <Box
            label="Ready to resend"
            value={ready}
            tone="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
          />
          <Box
            label={
              nextReadyAt
                ? `Waiting · next in ${timeLeft(nextReadyAt, now)}`
                : "Waiting"
            }
            value={waiting}
            tone="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
          />
          <Box
            label="Can’t retry"
            value={blocked}
            tone="bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
          />
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto px-5">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-ink-500 dark:bg-ink-900 dark:text-ink-400">
              <tr>
                <th className="py-2 pr-3">Contact</th>
                <th className="py-2 pr-3">Reason</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-ink-500">
                    <Loader2 className="mx-auto animate-spin" />
                  </td>
                </tr>
              )}
              {!isLoading && contacts.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="py-10 text-center text-ink-500 dark:text-ink-400"
                  >
                    Is campaign mein koi failed delivery nahi hai.
                  </td>
                </tr>
              )}
              {contacts.map((c) => (
                <tr
                  key={c.jobId}
                  className="border-t border-ink-100 align-top dark:border-ink-800"
                >
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-ink-900 dark:text-white">
                      {c.name || "—"}
                    </p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {c.phone || "—"}
                    </p>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-ink-600 dark:text-ink-300">
                    {c.reason}
                    {c.retryCount > 0 && (
                      <span className="block text-ink-400">
                        Retried {c.retryCount}/{maxRetries}
                      </span>
                    )}
                    {c.failedAt && (
                      <span className="block text-ink-400">
                        Failed {fmtDateTime(c.failedAt)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <Chip contact={c} now={now} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-ink-100 px-5 py-4 dark:border-ink-800">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-xs text-ink-500 dark:text-ink-400">
              Sirf “Ready” contacts dobara jayenge (same template). Baar-baar
              retry se Meta quality rating girti hai, isliye max {maxRetries}{" "}
              retry allowed hain.
            </p>
            <button
              type="button"
              disabled={ready === 0 || resending}
              onClick={resend}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {resending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RotateCcw size={16} />
              )}
              {ready > 0
                ? `Resend to ${ready} ready contact${ready > 1 ? "s" : ""}`
                : "No contacts ready yet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
