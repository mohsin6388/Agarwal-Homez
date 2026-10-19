import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { whatsappApi } from "../../api/whatsappApi.js";

const TABS = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "review", label: "Under Review" },
  { id: "rejected", label: "Rejected" },
];

function statusOf(item) {
  if (item?.isDraft || String(item?.status || "").toUpperCase() === "DRAFT")
    return "DRAFT";
  return String(item?.status || "UNKNOWN").toUpperCase();
}
function groupOf(item) {
  const status = statusOf(item);
  if (status === "DRAFT") return "all";
  if (status === "APPROVED") return "approved";
  if (["REJECTED", "DISABLED", "PAUSED"].includes(status))
    return status === "REJECTED" ? "rejected" : "review";
  return "review";
}
function StatusChip({ status }) {
  const labels = {
    APPROVED: "Approved",
    PENDING: "Under Review",
    PENDING_REVIEW: "Under Review",
    IN_APPEAL: "Under Review",
    REJECTED: "Rejected",
    DISABLED: "Disabled",
    PAUSED: "Paused",
    DRAFT: "Draft",
    UNKNOWN: "Unknown",
  };
  const className =
    status === "APPROVED"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : status === "REJECTED"
        ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
        : status === "DRAFT"
          ? "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${className}`}
    >
      {labels[status] || status.replaceAll("_", " ")}
    </span>
  );
}
function componentOf(item, type) {
  return (
    (item?.components || []).find(
      (component) => String(component.type || "").toUpperCase() === type,
    ) || null
  );
}
function bodyOf(item) {
  return (
    item?.bodyText ||
    componentOf(item, "BODY")?.text ||
    "Message preview is not available."
  );
}
function buttonsOf(item) {
  return item?.buttons || componentOf(item, "BUTTONS")?.buttons || [];
}

export default function WhatsAppTemplatesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [deletingId, setDeletingId] = useState("");
  const [configured, setConfigured] = useState(true);
  const [metaUnavailableMessage, setMetaUnavailableMessage] = useState("");

  const loadItems = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await whatsappApi.allTemplates();
      setItems(response.data?.templates || []);
      setConfigured(response.data?.configured !== false);
      setMetaUnavailableMessage(response.data?.metaUnavailableMessage || "");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Could not load templates. Check your Meta credentials and backend connection.",
      );
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);
  useEffect(() => {
    if (location.state?.notice) setNotice(location.state.notice);
  }, [location.state]);

  const counts = useMemo(
    () => ({
      all: items.length,
      approved: items.filter((item) => groupOf(item) === "approved").length,
      review: items.filter((item) => groupOf(item) === "review").length,
      rejected: items.filter((item) => groupOf(item) === "rejected").length,
    }),
    [items],
  );
  const filteredItems = useMemo(
    () =>
      activeTab === "all"
        ? items
        : items.filter((item) => groupOf(item) === activeTab),
    [activeTab, items],
  );

  const removeDraft = async (item) => {
    const id = String(item._id || item.draftId || item.id || "");
    if (!id || !window.confirm(`Delete draft "${item.name || "Untitled"}"?`))
      return;
    setDeletingId(id);
    setError("");
    setNotice("");
    try {
      const result = await whatsappApi.deleteTemplateDraft(id);
      setNotice(result.message || "Draft deleted successfully.");
      await loadItems(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not delete the draft.");
    } finally {
      setDeletingId("");
    }
  };

  const deleteMetaTemplate = async (item) => {
    if (
      !window.confirm(
        `Delete the template "${item.name}" from Meta? This action cannot be undone.`,
      )
    )
      return;
    setDeletingId(item.name);
    setError("");
    setNotice("");
    try {
      const result = await whatsappApi.deleteTemplate(item.name);
      setNotice(result.message || "Template deleted from Meta successfully.");
      await loadItems(true);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Could not delete the Meta template.",
      );
    } finally {
      setDeletingId("");
    }
  };

  const openCopy = (item) =>
    navigate("/whatsapp/templates/new", { state: { copyTemplate: item } });

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-primary">
            Templates
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">
            WhatsApp Templates
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500 dark:text-ink-400">
            View all your templates with previews. Only approved templates can
            be used in bulk campaigns.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadItems(true)}
            disabled={refreshing}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate("/whatsapp/templates/new")}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={16} /> Create Template
          </button>
        </div>
      </div>
      {notice && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
          <button
            type="button"
            className="ml-auto text-xs font-bold"
            onClick={() => setNotice("")}
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {!configured && metaUnavailableMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          {metaUnavailableMessage}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl border p-3 text-left transition ${activeTab === tab.id ? "border-primary bg-primary-soft shadow-sm" : "border-ink-100 bg-white hover:border-ink-200 dark:border-ink-800 dark:bg-ink-900"}`}
          >
            <span
              className={`block text-sm font-extrabold ${activeTab === tab.id ? "text-primary dark:text-emerald-200" : "text-ink-700 dark:text-ink-200"}`}
            >
              {tab.label}
            </span>
            <span className="mt-1 block text-2xl font-extrabold tabular-nums text-ink-950 dark:text-white">
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card flex items-center justify-center gap-2 py-14 text-sm text-ink-500">
          <Loader2 size={18} className="animate-spin" /> Loading templates…
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-14 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-ink-500 dark:bg-ink-800">
            <FileText size={22} />
          </span>
          <h2 className="font-display text-base font-extrabold text-ink-900 dark:text-white">
            No templates in this category
          </h2>
          <p className="mt-1 max-w-md text-sm text-ink-500 dark:text-ink-400">
            Create a new template or refresh to check its approval status with
            Meta.
          </p>
          <button
            type="button"
            onClick={() => navigate("/whatsapp/templates/new")}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <Plus size={15} /> Create Template
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredItems.map((item) => {
            const status = statusOf(item);
            const isDraft = status === "DRAFT";
            const body = bodyOf(item);
            const buttons = buttonsOf(item);
            const header = componentOf(item, "HEADER");
            const headerType = String(
              item.headerType || header?.format || "",
            ).toLowerCase();
            const headerImage = item.imageUrl || item.headerImageUrl || "";
            const documentName =
              item.headerFileName ||
              (item.headerDocumentUrl ? "Brochure PDF" : "");
            return (
              <article
                key={`${item.id || item._id || item.name}-${item.language || ""}-${status}`}
                className="card !p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words font-display text-lg font-extrabold text-ink-950 dark:text-white">
                      {item.name || "Untitled draft"}
                    </h2>
                    <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                      {item.name || "draft"} · {item.category || "Marketing"} ·{" "}
                      {item.language || "hi"}
                    </p>
                  </div>
                  <StatusChip status={status} />
                </div>
                {isDraft ? (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-ink-200 bg-ink-50 p-2.5 text-xs text-ink-500 dark:border-ink-700 dark:bg-ink-800/50 dark:text-ink-300">
                    <FileText size={15} /> Draft — not yet submitted to Meta for
                    approval.
                  </div>
                ) : null}
                <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50 p-3 dark:border-ink-800 dark:bg-ink-950/40">
                  <div className="mx-auto max-w-sm overflow-hidden rounded-xl bg-[#e7f4e8] p-3 dark:bg-emerald-950/30">
                    <div className="mb-2 flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                        AH
                      </span>
                      <span>
                        Agarwal Homez{" "}
                        <span className="block text-[10px] font-medium text-white/70">
                          Business account
                        </span>
                      </span>
                    </div>
                    <div className="rounded-xl rounded-tl-sm bg-white p-3 text-sm leading-5 text-slate-700 shadow-sm">
                      {headerType === "IMAGE" || headerType === "image" ? (
                        headerImage ? (
                          <img
                            src={headerImage}
                            alt="Template header"
                            className="mb-2 max-h-44 w-full rounded-lg object-cover"
                          />
                        ) : (
                          <div className="mb-2 rounded-lg bg-slate-100 p-3 text-xs text-slate-500">
                            Photo header
                          </div>
                        )
                      ) : null}
                      {(headerType === "DOCUMENT" ||
                        headerType === "document") && (
                        <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-100 p-2 text-xs">
                          <FileText size={22} />
                          <span>{documentName || "Brochure.pdf"}</span>
                        </div>
                      )}
                      {(headerType === "TEXT" || headerType === "text") && (
                        <p className="mb-1 font-bold">
                          {item.headerText || header?.text}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{body}</p>
                      {(item.footerText ||
                        componentOf(item, "FOOTER")?.text) && (
                        <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                          {item.footerText || componentOf(item, "FOOTER")?.text}
                        </p>
                      )}
                      <p className="mt-1 text-right text-[9px] text-slate-400">
                        9:41 AM ✓✓
                      </p>
                    </div>
                    {buttons.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {buttons.slice(0, 3).map((button, index) => (
                          <div
                            key={`${button.text}-${index}`}
                            className="rounded-lg bg-white p-2 text-center text-xs font-bold text-emerald-800 shadow-sm"
                          >
                            {button.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {status === "REJECTED" && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
                    <p className="text-xs font-extrabold text-red-800 dark:text-red-200">
                      Reason from Meta:
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-red-800 dark:text-red-200">
                      {item.rejected_reason ||
                        "Meta did not provide a rejection reason. Check the template details in WhatsApp Manager."}
                    </p>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  {isDraft ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/whatsapp/templates/new?draftId=${encodeURIComponent(item._id || item.id)}`,
                          )
                        }
                        className="btn-secondary inline-flex items-center gap-2 !px-3 !py-2 text-xs"
                      >
                        <FileText size={14} /> Open draft
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDraft(item)}
                        disabled={deletingId === String(item._id || item.id)}
                        className="btn-secondary inline-flex items-center gap-2 !px-3 !py-2 text-xs text-red-600 dark:text-red-300"
                      >
                        {deletingId === String(item._id || item.id) ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}{" "}
                        Delete draft
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => openCopy(item)}
                        className="btn-secondary inline-flex items-center gap-2 !px-3 !py-2 text-xs"
                      >
                        <Copy size={14} />
                        {status === "REJECTED"
                          ? "Edit and resubmit"
                          : "Make a copy"}
                      </button>
                      {status === "APPROVED" && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate("/outreach/whatsapp/new", {
                              state: { selectedTemplate: item },
                            })
                          }
                          className="btn-primary inline-flex items-center gap-2 !px-3 !py-2 text-xs"
                        >
                          Use in bulk campaign <ArrowRight size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteMetaTemplate(item)}
                        disabled={deletingId === item.name}
                        className="btn-secondary inline-flex items-center gap-2 !px-3 !py-2 text-xs text-red-600 dark:text-red-300"
                      >
                        {deletingId === item.name ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}{" "}
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 px-4 py-3 dark:border-ink-800">
        <p className="text-xs text-ink-500 dark:text-ink-400">
          Only approved templates can be used in bulk campaigns. Meta controls
          the approval status.
        </p>
        <button
          type="button"
          onClick={() => navigate("/outreach/whatsapp/new")}
          className="btn-primary inline-flex items-center gap-2"
        >
          Open bulk messaging <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
