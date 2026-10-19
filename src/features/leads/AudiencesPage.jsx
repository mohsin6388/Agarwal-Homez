import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  LoaderCircle,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  Users,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  ClipboardPaste,
  Database,
} from "lucide-react";
import { audienceApi } from "../../api/audienceApi.js";

const count = (value) => Number(value || 0).toLocaleString("en-IN");
const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
function sourceLabel(audience) {
  if (audience.sourceType === "upload")
    return {
      text:
        audience.sourceFileName || audience.sourceLabel || "Excel / CSV upload",
      icon: FileSpreadsheet,
    };
  if (audience.sourceType === "paste")
    return { text: "Manually pasted contacts", icon: ClipboardPaste };
  if (audience.sourceFileName)
    return {
      text: `Existing sheet · ${audience.sourceFileName}`,
      icon: FileSpreadsheet,
    };
  return {
    text: audience.sourceLabel || "Selected from Upload Data",
    icon: Database,
  };
}

export default function AudiencesPage() {
  const navigate = useNavigate();
  const [audiences, setAudiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const loadAudiences = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await audienceApi.list();
      setAudiences(response.data?.audiences || []);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Could not load audiences. Please check your connection.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudiences();
  }, [loadAudiences]);

  const removeAudience = async (audience) => {
    if (
      !window.confirm(
        `Delete the audience “${audience.name}”? Lead contacts will not be deleted.`,
      )
    )
      return;
    setDeletingId(audience._id);
    setError("");
    setNotice("");
    try {
      await audienceApi.remove(audience._id);
      setAudiences((current) =>
        current.filter((item) => item._id !== audience._id),
      );
      setNotice(
        `Audience “${audience.name}” has been deleted. Your leads are safe.`,
      );
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Could not delete audience.",
      );
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold text-primary">
            PropAI CRM › Audiences
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-text dark:text-white">
            Saved audiences
          </h1>
          <p className="page-description">
            Create a list once and reuse it in future campaigns.
          </p>
        </div>
        <Link to="/audiences/new" className="btn-primary">
          <Plus size={18} /> Create Audience
        </Link>
      </div>
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-chip-error-bg px-4 py-3 text-sm text-chip-error-text"
        >
          <AlertCircle size={18} />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary"
        >
          <CheckCircle2 size={18} />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-muted dark:text-ink-400">
          {count(audiences.length)} saved audiences
        </p>
        <button
          type="button"
          onClick={loadAudiences}
          disabled={loading}
          className="btn-secondary !min-h-9 !py-1.5"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
          Refresh
        </button>
      </div>
      {loading ? (
        <div className="card flex items-center justify-center gap-3 py-16 text-text-muted">
          <LoaderCircle size={20} className="animate-spin" /> Loading audiences…
        </div>
      ) : audiences.length === 0 ? (
        <section className="card py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Users size={27} />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-text dark:text-white">
            No saved audiences yet
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-muted dark:text-ink-400">
            Upload an Excel/CSV file, paste contacts, or create your first
            audience from existing Upload Data contacts.
          </p>
          <Link to="/audiences/new" className="btn-primary mt-5">
            <Plus size={17} /> Create your audience
          </Link>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {audiences.map((audience) => {
            const source = sourceLabel(audience);
            const SourceIcon = source.icon;
            return (
              <article
                key={audience._id}
                className="card flex min-w-0 flex-col gap-4 !p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Users size={21} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      className="truncate text-lg font-extrabold text-text dark:text-white"
                      title={audience.name}
                    >
                      {audience.name}
                    </h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted dark:text-ink-400">
                      <SourceIcon size={14} />
                      <span className="truncate" title={source.text}>
                        {source.text}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-page p-3 dark:bg-ink-800">
                    <p className="text-xs text-text-muted dark:text-ink-400">
                      Contacts
                    </p>
                    <p className="mt-1 text-xl font-extrabold tabular-nums text-text dark:text-white">
                      {count(audience.contactCount ?? audience.counts?.valid)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-page p-3 dark:bg-ink-800">
                    <p className="text-xs text-text-muted dark:text-ink-400">
                      WhatsApp messages sent
                    </p>
                    <p className="mt-1 text-xl font-extrabold tabular-nums text-text dark:text-white">
                      {count(audience.skipCount?.whatsapp)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-page p-3 dark:bg-ink-800">
                    <p className="text-xs text-text-muted dark:text-ink-400">
                      Emails sent
                    </p>
                    <p className="mt-1 text-xl font-extrabold tabular-nums text-text dark:text-white">
                      {count(audience.skipCount?.email)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted dark:text-ink-400">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={14} /> {dateLabel(audience.createdAt)}
                  </span>
                  {audience.tags?.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Tag size={14} />
                      {audience.tags.join(", ")}
                    </span>
                  )}
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-surface-border pt-4 dark:border-ink-800">
                  <button
                    type="button"
                    onClick={() => removeAudience(audience)}
                    disabled={deletingId === audience._id}
                    className="btn-secondary !min-h-10 !py-2 !text-chip-error-text disabled:opacity-50"
                    aria-label={`Delete ${audience.name}`}
                  >
                    {deletingId === audience._id ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}{" "}
                    Delete audience
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/outreach/whatsapp/new?audienceId=${encodeURIComponent(audience._id)}`,
                      )
                    }
                    className="btn-primary !min-h-10 !py-2"
                  >
                    Create Campaign <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
