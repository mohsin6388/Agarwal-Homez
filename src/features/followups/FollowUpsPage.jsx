import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Phone, Mail, CalendarClock } from "lucide-react";
import { followUpApi } from "../../api/followUpApi.js";
import { Link } from "react-router-dom";

const TABS = [
  ["all", "All"],
  ["today", "Due Today"],
  ["week", "This Week"],
  ["late", "Overdue"],
];

const istDay = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));

export default function FollowUpsPage() {
  const [due, setDue] = useState("all");
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await followUpApi.list({ due, limit: 100 });
      setItems(response.data.followUps || []);
      setCounts(response.data.counts || {});
      setError("");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Could not load follow-ups.",
      );
    } finally {
      setLoading(false);
    }
  }, [due]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (id, payload) => {
    try {
      await followUpApi.update(id, payload);
      await load();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Could not update follow-up.",
      );
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-ink-900 dark:text-white">
          Follow-ups
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Short summaries of each conversation. Select "View Full Conversation"
          to read the entire thread.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-4">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setDue(key)}
            className={`rounded-xl border p-3 text-left ${
              due === key
                ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                : "border-ink-200 bg-white dark:bg-ink-900"
            }`}
          >
            <p className="text-sm font-bold">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">
              {counts[key] ?? (key === "all" ? items.length : 0)}
            </p>
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {loading && <div className="card">Loading…</div>}

        {!loading && !items.length && (
          <div className="card text-center text-sm text-ink-500">
            No follow-ups in this category.
          </div>
        )}

        {items.map((followUp) => {
          const date = new Date(followUp.nextFollowUpDate);
          const todayKey = istDay(Date.now());
          const dateKey = istDay(followUp.nextFollowUpDate);
          const late = dateKey < todayKey;
          const dueLabel = late
            ? "Overdue"
            : dateKey === todayKey
              ? "Today"
              : new Date(dateKey) - new Date(todayKey) <= 6 * 86400000
                ? "This Week"
                : date.toLocaleDateString("en-IN");

          return (
            <article key={followUp._id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[240px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">
                      {followUp.leadId?.name || "Customer"}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        late
                          ? "bg-red-100 text-red-800"
                          : dateKey === todayKey
                            ? "bg-amber-100 text-amber-800"
                            : "bg-ink-100 text-ink-600"
                      }`}
                    >
                      {dueLabel}
                    </span>
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-800">
                      {followUp.leadTemperature || "lead"} · score{" "}
                      {followUp.conversation?.currentLeadScore ??
                        followUp.leadId?.leadScore ??
                        0}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-ink-500">
                    {followUp.leadId?.phone && (
                      <>
                        <Phone size={12} className="mr-1 inline" />
                        {followUp.leadId.phone} ·{" "}
                      </>
                    )}
                    {followUp.leadId?.email && (
                      <>
                        <Mail size={12} className="mr-1 inline" />
                        {followUp.leadId.email} ·{" "}
                      </>
                    )}
                    {String(followUp.channel || "whatsapp").toUpperCase()} ·
                    Last contact{" "}
                    {followUp.lastContactAt
                      ? new Date(followUp.lastContactAt).toLocaleString("en-IN")
                      : "—"}
                  </p>

                  {followUp.summary && (
                    <p className="mt-3 rounded-lg bg-ink-50 p-3 text-sm dark:bg-ink-800">
                      {followUp.summary}
                    </p>
                  )}

                  <p className="mt-3 text-sm">{followUp.nextFollowUpMessage}</p>
                  <p className="mt-2 text-xs text-ink-500">
                    <CalendarClock size={12} className="mr-1 inline" />
                    Due {date.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={
                      followUp.channel === "email" && followUp.emailThreadId
                        ? `/email/conversations?threadId=${encodeURIComponent(followUp.emailThreadId)}`
                        : `/whatsapp/conversations?leadId=${followUp.leadId?._id}`
                    }
                    className="btn-secondary text-xs"
                  >
                    View Full Conversation
                  </Link>
                  <button
                    onClick={() => update(followUp._id, { status: "done" })}
                    className="btn-primary text-xs"
                  >
                    <CheckCircle2 size={13} className="mr-1 inline" />
                    Mark as Done
                  </button>
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value) {
                        update(followUp._id, {
                          snoozeDays: Number(event.target.value),
                        });
                      }
                      event.target.value = "";
                    }}
                    className="input-field max-w-[150px] text-xs"
                    aria-label="Snooze follow-up"
                  >
                    <option value="">Snooze</option>
                    <option value="1">In 1 day</option>
                    <option value="3">In 3 days</option>
                    <option value="7">In 1 week</option>
                  </select>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
