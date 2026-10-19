import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  MapPin,
  Trash2,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { meetingApi } from "../../api/meetingApi.js";
import { settingsApi } from "../../api/settingsApi.js";
import ScheduleVisitModal from "./ScheduleVisitModal.jsx";
import { Link } from "react-router-dom";

const STATUSES = [
  "scheduled",
  "visited",
  "not_visited",
  "rescheduled",
  "cancelled",
];
const STATUS_LABELS = {
  scheduled: "Confirmed",
  visited: "Visited",
  not_visited: "Not Visited",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
};

const STATUS_COLORS = {
  scheduled: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  visited:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  not_visited:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  rescheduled:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  cancelled: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function visitDisplay(meeting) {
  if (meeting.status === "visited")
    return { label: "Visited", color: "bg-gray-100 text-gray-700" };
  if (meeting.status === "not_visited")
    return { label: "Not Visited", color: "bg-red-100 text-red-800" };
  if (meeting.status === "rescheduled")
    return { label: "Rescheduled", color: "bg-amber-100 text-amber-800" };
  if (meeting.status === "cancelled")
    return { label: "Cancelled", color: "bg-gray-200 text-gray-600" };
  if (meeting.reminders?.dayBeforeSentAt || meeting.reminders?.twoHourSentAt)
    return { label: "Reminder Sent", color: "bg-blue-100 text-blue-800" };
  if (meeting.confirmed)
    return { label: "Confirmed", color: "bg-green-100 text-green-800" };
  return {
    label: "Pending confirmation",
    color: "bg-amber-100 text-amber-800",
  };
}

export default function SiteVisitsPage() {
  const [meetings, setMeetings] = useState([]);
  const [status, setStatus] = useState("");
  const [group, setGroup] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({
    total: 0,
    scheduled: 0,
    visited: 0,
    notVisited: 0,
    rescheduled: 0,
    cancelled: 0,
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [salesTeam, setSalesTeam] = useState([]);
  useEffect(() => {
    settingsApi
      .get()
      .then((r) => setSalesTeam(r.data?.settings?.salesTeam || []))
      .catch(() => setSalesTeam([]));
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await meetingApi.list({
        ...(status ? { status } : {}),
        group,
        page,
        limit: 50,
      });
      setMeetings(res.data.meetings || []);
      setSummary(
        res.data.summary || {
          total: 0,
          scheduled: 0,
          visited: 0,
          notVisited: 0,
          rescheduled: 0,
          cancelled: 0,
        },
      );
      setPagination(res.data.pagination || { page, total: 0, totalPages: 1 });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Could not load site visits. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [status, group, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleStatusChange = async (id, newStatus) => {
    setError("");
    try {
      await meetingApi.update(id, { status: newStatus });
      await fetchList();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Could not update the visit status. Please try again.",
      );
    }
  };

  const handleAgentChange = async (id, agentName, agentPhone) => {
    try {
      await meetingApi.update(id, { agentName, agentPhone });
      await fetchList();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Could not assign the sales representative. Please try again.",
      );
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this site visit?")) return;
    setError("");
    try {
      await meetingApi.remove(id);
      await fetchList();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Could not delete the site visit. Please try again.",
      );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900 dark:text-white">
            Site Visits
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Site visits confirmed through WhatsApp conversations are
            automatically saved here.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Schedule Visit
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {[
          [
            "Total visits",
            summary.total,
            CalendarClock,
            "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300",
          ],
          [
            "Scheduled",
            summary.scheduled,
            CalendarClock,
            "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300",
          ],
          [
            "Visited",
            summary.visited,
            CheckCircle2,
            "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300",
          ],
          [
            "Not visited",
            summary.notVisited,
            AlertCircle,
            "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
          ],
          [
            "Rescheduled",
            summary.rescheduled,
            CalendarClock,
            "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300",
          ],
          [
            "Cancelled",
            summary.cancelled,
            XCircle,
            "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
          ],
        ].map(([label, value, Icon, tone]) => (
          <div key={label} className="card !p-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}
              >
                <Icon size={16} />
              </span>
              <div>
                <p className="text-[11px] text-ink-500 dark:text-ink-400">
                  {label}
                </p>
                <p className="text-lg font-bold text-ink-900 dark:text-white">
                  {Number(value || 0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1">
        {[
          ["today", "Today"],
          ["upcoming", "Upcoming"],
          ["done", "Completed"],
          ["all", "All"],
        ].map(([g, label]) => (
          <button
            key={g}
            onClick={() => {
              setGroup(g);
              setStatus("");
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${group === g ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"}`}
          >
            {label}{" "}
            <span className="ml-1 opacity-80">
              {summary.groups?.[g] ?? (g === "all" ? summary.total : 0)}
            </span>
          </button>
        ))}
        <button
          onClick={() => {
            setStatus("");
            setGroup("all");
            setPage(1);
          }}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${!status ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"}`}
        >
          Status: All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setGroup("all");
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${status === s ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"}`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="card mt-4 divide-y divide-ink-50 p-0 dark:divide-ink-800">
        {loading && (
          <div className="p-6 text-center text-sm text-ink-400">
            <Loader2 className="mx-auto animate-spin" size={22} />
            <p className="mt-2">Loading site visits…</p>
          </div>
        )}
        {!loading && meetings.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-400">
            No site visits found.
          </p>
        )}
        {meetings.map((m) => (
          <div
            key={m._id}
            className="flex items-center justify-between gap-3 p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink-900 dark:text-white">
                  {m.leadId?.name}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${visitDisplay(m).color || STATUS_COLORS[m.status]}`}
                >
                  {visitDisplay(m).label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                {[m.leadId?.phone, m.leadId?.email]
                  .filter(Boolean)
                  .join(" · ") || "No phone/email"}{" "}
                · {m.preferredDate} at {m.preferredTime}
              </p>
              {m.propertyId && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400">
                  <MapPin size={11} /> {m.propertyId.projectName} ·{" "}
                  {m.propertyId.bhk || ""}
                </p>
              )}
              <p className="mt-1 text-xs text-ink-500">
                Booked via:{" "}
                {m.bookedBy === "whatsapp_ai"
                  ? "WhatsApp AI"
                  : m.bookedBy === "email_reply"
                    ? "Email reply"
                    : "Manual"}{" "}
                · Sales representative: {m.agentName || "Not assigned"}
              </p>
              {m.leadId?._id && (
                <Link
                  className="mt-2 inline-flex text-xs font-bold text-emerald-700 underline"
                  to={`/whatsapp/conversations?leadId=${m.leadId._id}`}
                >
                  View chat
                </Link>
              )}
              <label className="mt-2 flex max-w-sm items-center gap-2 text-xs text-ink-500">
                Sales representative{" "}
                <select
                  value={m.agentName || ""}
                  onChange={(e) => {
                    const a = salesTeam.find((x) => x.name === e.target.value);
                    handleAgentChange(m._id, e.target.value, a?.phone || "");
                  }}
                  className="input-field max-w-[180px] py-1 text-xs"
                >
                  <option value="">Assign representative</option>
                  {salesTeam.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              {m.notes && (
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
                  {m.notes}
                </p>
              )}
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <select
                value={m.status}
                onChange={(e) => handleStatusChange(m._id, e.target.value)}
                className="rounded-lg border border-ink-200 px-2 py-1 text-xs dark:border-ink-700 dark:bg-ink-800 dark:text-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] || s}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleDelete(m._id)}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {pagination.total > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3 dark:border-ink-800 dark:bg-ink-900">
          <p className="text-xs text-ink-500 dark:text-ink-400">
            Showing {(pagination.page - 1) * 50 + 1}–
            {Math.min(pagination.page * 50, pagination.total)} of{" "}
            {pagination.total} visits
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-ink-200 px-3 py-2 text-xs disabled:opacity-40 dark:border-ink-700"
            >
              Previous
            </button>
            <span className="text-xs text-ink-500 dark:text-ink-400">
              Page {pagination.page || 1} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={page >= (pagination.totalPages || 1) || loading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-ink-200 px-3 py-2 text-xs disabled:opacity-40 dark:border-ink-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-ink-500">
        WhatsApp reminders are sent automatically one day and two hours before a
        visit. An approved Utility template must be configured.
      </p>
      {showModal && (
        <ScheduleVisitModal
          onClose={() => setShowModal(false)}
          onSaved={fetchList}
        />
      )}
    </div>
  );
}
