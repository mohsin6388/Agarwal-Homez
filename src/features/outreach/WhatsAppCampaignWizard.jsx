import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  FileText,
  LoaderCircle,
  MessageCircle,
  Plus,
  Search,
  Send,
  Users,
} from "lucide-react";
import { audienceApi } from "../../api/audienceApi.js";
import { campaignApi } from "../../api/outreachApi.js";
import { whatsappApi } from "../../api/whatsappApi.js";
import { useCampaignWizardStore } from "../../store/campaignWizardStore.js";
import WhatsAppPhonePreview from "../../components/ui/WhatsAppPhonePreview.jsx";

const STEPS = [
  { label: "1. Choose recipients", path: "/outreach/whatsapp/new" },
  { label: "2. Choose message", path: "/outreach/whatsapp/new/message" },
  { label: "3. Review and send", path: "/outreach/whatsapp/new/review" },
];
const money = (value) =>
  value === null || value === undefined
    ? null
    : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const count = (value) => Number(value || 0).toLocaleString("en-IN");

function istDateTimeParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}
function templateBody(template) {
  return (
    template?.bodyText ||
    (template?.components || []).find(
      (part) => String(part.type).toUpperCase() === "BODY",
    )?.text ||
    ""
  );
}
function templateHeader(template) {
  return (
    (template?.components || []).find(
      (part) => String(part.type).toUpperCase() === "HEADER",
    ) || null
  );
}
function variableIndexes(template) {
  const text = templateBody(template);
  return [
    ...new Set(
      [...text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((match) =>
        Number(match[1]),
      ),
    ),
  ].sort((a, b) => a - b);
}
function statusOf(template) {
  return String(template?.status || "").toUpperCase();
}
function getHeaderType(template) {
  const explicit = String(template?.headerType || "").toLowerCase();
  if (explicit && explicit !== "none") return explicit;
  const format = String(templateHeader(template)?.format || "").toLowerCase();
  if (["image", "document", "text"].includes(format)) return format;
  return "none";
}
function displayVariable(template, index, variables) {
  const match = (templateBody(template) || "").match(
    new RegExp(`\\{\\{\\s*${index}\\s*\\}\\}`),
  );
  if (!match) return "";
  const setting = variables[index] || {
    source: "name",
    fallback: "Sir/Ma'am",
    value: "",
  };
  if (setting.source === "static")
    return setting.value || setting.fallback || "Sir/Ma’am";
  if (setting.source === "city") return "Kanpur";
  if (setting.source === "budget") return "₹80 lakh – ₹85 lakh";
  if (setting.source === "phone") return "+91 98765 43210";
  if (setting.source === "email") return "customer@example.com";
  return "Ayush";
}
function personalise(body, variables) {
  return String(body || "").replace(/\{\{\s*(\d+)\s*\}\}/g, (_match, number) =>
    displayVariable({ bodyText: body }, Number(number), variables),
  );
}
function getSourceLabel(audience) {
  if (audience?.sourceType === "upload")
    return `${audience.sourceFileName || audience.sourceLabel || "Excel upload"} · ${new Date(audience.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;
  if (audience?.sourceType === "paste") return "Manually pasted contacts";
  if (audience?.sourceFileName)
    return `Existing Excel / CSV · ${audience.sourceFileName}`;
  if (
    audience?.sourceLabel &&
    audience.sourceLabel !== "Upload Data se chunein"
  )
    return audience.sourceLabel;
  return "PropAI Leads";
}
function Panel({ title, children, className = "" }) {
  return (
    <section className={`card min-w-0 !p-4 sm:!p-5 ${className}`}>
      <h2 className="text-base font-extrabold text-text dark:text-white">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function FieldLabel({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-bold text-text dark:text-ink-100"
    >
      {children}
    </label>
  );
}
function Stepper({ step }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {STEPS.map((item, index) => {
        const number = index + 1;
        const done = number < step;
        const active = number === step;
        return (
          <div
            key={item.path}
            className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-3 ${active ? "border-primary bg-primary-soft dark:bg-primary/10" : done ? "border-primary/30 bg-primary/5" : "border-surface-border bg-white dark:border-ink-800 dark:bg-ink-900"}`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${done || active ? "bg-primary text-white" : "bg-page text-text-muted dark:bg-ink-800 dark:text-ink-400"}`}
            >
              {done ? <Check size={15} /> : number}
            </span>
            <div className="min-w-0">
              <p
                className={`truncate text-xs font-extrabold sm:text-sm ${active ? "text-primary dark:text-emerald-200" : "text-text dark:text-ink-200"}`}
              >
                {item.label}
              </p>
              {done && (
                <p className="mt-0.5 text-[10px] text-text-muted dark:text-ink-400">
                  Complete
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function WhatsAppCampaignWizard({ step = 1 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const wizard = useCampaignWizardStore();
  const [audiences, setAudiences] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [audiencesLoading, setAudiencesLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [audienceSearch, setAudienceSearch] = useState("");

  const selectedAudience = useMemo(
    () =>
      audiences.find(
        (item) => String(item._id) === String(wizard.audienceId),
      ) || null,
    [audiences, wizard.audienceId],
  );
  const selectedTemplate = wizard.selectedTemplate;
  const indexes = useMemo(
    () => variableIndexes(selectedTemplate),
    [selectedTemplate],
  );
  const category = String(
    selectedTemplate?.category || "MARKETING",
  ).toUpperCase();
  const bodyText = templateBody(selectedTemplate);
  const headerType = getHeaderType(selectedTemplate);
  const headerImage = selectedTemplate?.imageUrl || wizard.headerImageUrl || "";
  const headerDocumentName =
    headerType === "document"
      ? selectedTemplate?.headerFileName || "Brochure PDF"
      : "";
  const buttons =
    selectedTemplate?.buttons ||
    (selectedTemplate?.components || []).find(
      (part) => String(part.type).toUpperCase() === "BUTTONS",
    )?.buttons ||
    [];
  const filteredAudiences = audiences.filter((audience) => {
    const fromUpload =
      audience.sourceType === "upload" ||
      Boolean(audience.sourceFileName) ||
      /\.(csv|xlsx?)$/i.test(audience.sourceLabel || "");
    const matchesType =
      audienceFilter === "all" ||
      (audienceFilter === "uploads" ? fromUpload : !fromUpload);
    const haystack =
      `${audience.name || ""} ${audience.sourceFileName || ""} ${audience.sourceLabel || ""} ${(audience.tags || []).join(" ")}`.toLowerCase();
    return (
      matchesType && haystack.includes(audienceSearch.trim().toLowerCase())
    );
  });

  const chooseTemplate = useCallback(
    (template) => {
      const nextVariables = {};
      variableIndexes(template).forEach((index) => {
        nextVariables[index] = wizard.variables[index] || {
          source: "name",
          value: "",
          fallback: "Sir/Ma'am",
        };
      });
      wizard.setTemplate(template, nextVariables);
    },
    [wizard],
  );

  useEffect(() => {
    const preselectedAudienceId = new URLSearchParams(location.search).get(
      "audienceId",
    );
    if (preselectedAudienceId && preselectedAudienceId !== wizard.audienceId)
      wizard.setField("audienceId", preselectedAudienceId);
    const preselectedTemplate = location.state?.selectedTemplate;
    if (
      preselectedTemplate &&
      `${preselectedTemplate.name}::${preselectedTemplate.language}` !==
        `${wizard.selectedTemplate?.name}::${wizard.selectedTemplate?.language}`
    )
      chooseTemplate(preselectedTemplate);
    // Wizard selections intentionally persist across route transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  useEffect(() => {
    let alive = true;
    setAudiencesLoading(true);
    audienceApi
      .list()
      .then((response) => {
        if (alive) setAudiences(response.data?.audiences || []);
      })
      .catch((err) => {
        if (alive)
          setLoadingError(
            err?.response?.data?.message ||
              "Could not load saved audiences. Please create an audience first.",
          );
      })
      .finally(() => {
        if (alive) setAudiencesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    whatsappApi
      .status()
      .then((response) => {
        if (alive) setWhatsappStatus(response.data || null);
      })
      .catch(() => {
        if (alive) setWhatsappStatus(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (step !== 2 && step !== 3) return undefined;
    let alive = true;
    setTemplatesLoading(true);
    whatsappApi
      .templates()
      .then((response) => {
        if (!alive) return;
        const approved = (response.data?.templates || []).filter(
          (template) => statusOf(template) === "APPROVED",
        );
        setTemplates(approved);
        const stillExists = approved.some(
          (template) =>
            `${template.name}::${template.language}` ===
            `${wizard.selectedTemplate?.name}::${wizard.selectedTemplate?.language}`,
        );
        if (!stillExists && approved.length) chooseTemplate(approved[0]);
      })
      .catch((err) => {
        if (alive)
          setLoadingError(
            err?.response?.data?.message ||
              "Could not load approved Meta templates.",
          );
      })
      .finally(() => {
        if (alive) setTemplatesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!wizard.audienceId) {
      wizard.setPreview(null);
      return undefined;
    }
    let alive = true;
    campaignApi
      .preview({
        audienceId: wizard.audienceId,
        channel: "whatsapp",
        skipAlreadySent: wizard.skipAlreadySent,
        category,
      })
      .then((response) => {
        if (alive) wizard.setPreview(response.data || null);
      })
      .catch((err) => {
        if (alive) {
          wizard.setPreview(null);
          setLoadingError(
            err?.response?.data?.message ||
              "Could not load the audience preview.",
          );
        }
      });
    return () => {
      alive = false;
    };
  }, [wizard.audienceId, wizard.skipAlreadySent, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeVariable = (index, patch) => wizard.setVariable(index, patch);
  const validVariables = indexes.every((index) => {
    const config = wizard.variables[index] || {
      source: "name",
      value: "",
      fallback: "Sir/Ma'am",
    };
    return (
      config.source !== "static" || Boolean(String(config.value || "").trim())
    );
  });

  const goNext = () => {
    setActionError("");
    if (step === 1) {
      if (!selectedAudience) {
        setActionError("Please select a saved audience first.");
        return;
      }
      if (!(wizard.preview?.final > 0)) {
        setActionError(
          "The selected audience has no eligible WhatsApp contacts.",
        );
        return;
      }
      navigate(STEPS[1].path);
      return;
    }
    if (step === 2) {
      if (!selectedTemplate) {
        setActionError("Please select an approved Meta template.");
        return;
      }
      if (!validVariables) {
        setActionError(
          "Please enter a value for the custom template variable.",
        );
        return;
      }
      navigate(STEPS[2].path);
    }
  };

  const campaignPayload = () => {
    const now = istDateTimeParts();
    const payload = {
      name: wizard.campaignName.trim(),
      audienceId: wizard.audienceId,
      skipAlreadySent: wizard.skipAlreadySent,
      optInConfirmed: wizard.optInConfirmed,
      channels: { whatsapp: true, email: false },
      dailyLimit: 5000,
      whatsappTemplateName: selectedTemplate?.name,
      whatsappTemplateLanguage: selectedTemplate?.language || "en_US",
      whatsappTemplateCategory: category,
      whatsappTemplateBody: bodyText,
      whatsappTemplateHeaderType: headerType,
      whatsappTemplateHeaderImageUrl: headerImage,
      whatsappTemplateHeaderDocumentUrl:
        selectedTemplate?.headerDocumentUrl || wizard.headerDocumentUrl || "",
      whatsappTemplateVariables: indexes.map((index) => ({
        index,
        source: wizard.variables[index]?.source || "name",
        value: wizard.variables[index]?.value || "",
        fallback: wizard.variables[index]?.fallback || "Sir/Ma'am",
      })),
    };
    if (wizard.scheduleMode === "later")
      payload.scheduleAt = `${wizard.scheduleDate}T${wizard.scheduleTime}`;
    else {
      payload.startDate = now.date;
      payload.sendTime = now.time;
    }
    return payload;
  };

  const sendTest = async () => {
    setActionError("");
    setNotice("");
    if (!selectedAudience || !selectedTemplate) {
      setActionError("Please select an audience and an approved template.");
      return;
    }
    if (!wizard.testPhone.trim()) {
      setActionError("Please enter your WhatsApp number.");
      return;
    }
    if (!validVariables) {
      setActionError("Please enter a value for the custom variable.");
      return;
    }
    setTestSending(true);
    try {
      const result = await campaignApi.testSend({
        phone: wizard.testPhone.trim(),
        audienceId: wizard.audienceId,
        whatsappTemplateName: selectedTemplate.name,
        whatsappTemplateLanguage: selectedTemplate.language || "en_US",
        whatsappTemplateCategory: category,
        whatsappTemplateBody: bodyText,
        whatsappTemplateHeaderType: headerType,
        whatsappTemplateHeaderImageUrl: headerImage,
        whatsappTemplateHeaderDocumentUrl:
          selectedTemplate?.headerDocumentUrl || wizard.headerDocumentUrl || "",
        whatsappTemplateVariables: indexes.map((index) => ({
          index,
          source: wizard.variables[index]?.source || "name",
          value: wizard.variables[index]?.value || "",
          fallback: wizard.variables[index]?.fallback || "Sir/Ma'am",
        })),
      });
      setNotice(result.message || "Test template sent successfully.");
    } catch (err) {
      setActionError(
        err?.response?.data?.message ||
          "Could not send the WhatsApp test message. Check the number and Meta settings.",
      );
    } finally {
      setTestSending(false);
    }
  };

  const launch = async () => {
    setActionError("");
    setNotice("");
    if (!wizard.campaignName.trim()) {
      setActionError("Campaign name is required.");
      return;
    }
    if (!wizard.optInConfirmed) {
      setActionError(
        "Please confirm recipient opt-in before starting the campaign.",
      );
      return;
    }
    if (wizard.scheduleMode === "later") {
      if (!wizard.scheduleDate || !wizard.scheduleTime) {
        setActionError("Please select a scheduled date and time.");
        return;
      }
      const planned = new Date(
        `${wizard.scheduleDate}T${wizard.scheduleTime}:00+05:30`,
      );
      if (
        !Number.isFinite(planned.getTime()) ||
        planned.getTime() <= Date.now()
      ) {
        setActionError("The scheduled time must be in the future.");
        return;
      }
    }
    setLaunching(true);
    wizard.setField("launching", true);
    try {
      const result = await campaignApi.launch(campaignPayload());
      const queued = result.data?.queued?.whatsapp || 0;
      setNotice(
        `${count(queued)} WhatsApp messages added to the queue. The existing sending worker will process the queue.`,
      );
      window.setTimeout(() => {
        wizard.reset();
        navigate("/outreach/whatsapp", {
          replace: true,
          state: {
            notice: result.message || "Campaign added to the queue.",
          },
        });
      }, 1000);
    } catch (err) {
      setActionError(
        err?.response?.data?.message ||
          "Could not launch the campaign. Check the audience, template, and opt-in confirmation.",
      );
    } finally {
      setLaunching(false);
      wizard.setField("launching", false);
    }
  };

  const currentTime = istDateTimeParts();
  const chosenCount =
    wizard.preview?.final ??
    selectedAudience?.contactCount ??
    selectedAudience?.counts?.valid ??
    0;
  const categoryLabel = category === "UTILITY" ? "Utility" : "Marketing";

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/outreach/whatsapp"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-primary dark:text-ink-400"
          >
            <ArrowLeft size={14} /> WhatsApp campaigns
          </Link>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-text dark:text-white">
            Send bulk messages
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-text-muted dark:text-ink-400">
            Select a saved audience, preview the Meta-approved message, and
            review the campaign before launching.
          </p>
        </div>
        <div className="w-full max-w-sm">
          <FieldLabel htmlFor="campaign-name">Campaign name</FieldLabel>
          <input
            id="campaign-name"
            value={wizard.campaignName}
            onChange={(event) =>
              wizard.setField("campaignName", event.target.value)
            }
            maxLength={120}
            placeholder="Diwali offer – Kanpur leads"
            className="input-field"
          />
        </div>
      </div>
      <Stepper step={step} />
      {loadingError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-chip-error-bg px-4 py-3 text-sm text-chip-error-text"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span className="flex-1">{loadingError}</span>
          <button
            type="button"
            onClick={() => setLoadingError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-chip-error-bg px-4 py-3 text-sm text-chip-error-text"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary"
        >
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
          <div className="space-y-5">
            <Panel title="1. Choose recipients">
              <p className="mb-4 text-sm text-text-muted dark:text-ink-400">
                Select a saved audience. Need a new list? Create one in about a
                minute.
              </p>
              <Link
                to="/audiences/new"
                className="btn-secondary mb-4 inline-flex"
              >
                <Plus size={16} /> Create a new audience
              </Link>
              <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
                <label className="relative block">
                  <span className="sr-only">Search audiences</span>
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    value={audienceSearch}
                    onChange={(event) => setAudienceSearch(event.target.value)}
                    className="input-field pl-9"
                    placeholder="Search by audience name or Excel filename"
                  />
                </label>
                <label className="block">
                  <span className="sr-only">Audience type</span>
                  <select
                    value={audienceFilter}
                    onChange={(event) => setAudienceFilter(event.target.value)}
                    className="input-field"
                  >
                    <option value="all">All audiences</option>
                    <option value="uploads">Excel / CSV uploads</option>
                    <option value="leads">PropAI Leads / pasted lists</option>
                  </select>
                </label>
              </div>
              {audiencesLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-muted">
                  <LoaderCircle size={18} className="animate-spin" /> Loading
                  audiences…
                </div>
              ) : filteredAudiences.length === 0 ? (
                <div className="rounded-xl border border-dashed border-input-border px-4 py-10 text-center">
                  <Users className="mx-auto text-primary" size={28} />
                  <p className="mt-3 font-bold text-text dark:text-white">
                    No saved audiences found
                  </p>
                  <p className="mt-1 text-sm text-text-muted dark:text-ink-400">
                    Create a new audience, then select it here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAudiences.map((audience) => {
                    const active =
                      String(audience._id) === String(wizard.audienceId);
                    const total = Number(
                      audience.contactCount ?? audience.counts?.valid ?? 0,
                    );
                    const sent = Number(audience.skipCount?.whatsapp || 0);
                    return (
                      <button
                        type="button"
                        key={audience._id}
                        onClick={() => {
                          wizard.setField("audienceId", audience._id);
                          wizard.setPreview(null);
                          setLoadingError("");
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${active ? "border-primary bg-primary-soft ring-1 ring-primary/20 dark:bg-primary/10" : "border-surface-border bg-white hover:border-primary/50 dark:border-ink-700 dark:bg-ink-900"}`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${active ? "border-primary bg-primary text-white" : "border-input-border text-transparent"}`}
                        >
                          {active && <Check size={12} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-text dark:text-white">
                            {audience.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-text-muted dark:text-ink-400">
                            {getSourceLabel(audience)}
                            {audience.tags?.length
                              ? ` · Tag: ${audience.tags.join(", ")}`
                              : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="font-semibold text-text dark:text-ink-200">
                              {count(total)} contacts
                            </span>
                            <span className="text-text-muted dark:text-ink-400">
                              Saved{" "}
                              {audience.createdAt
                                ? new Date(audience.createdAt).toLocaleString(
                                    "en-IN",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )
                                : "date unknown"}
                            </span>
                          </div>
                        </div>
                        <div className="hidden text-right sm:block">
                          <p className="text-xs text-text-muted dark:text-ink-400">
                            WhatsApp messages sent
                          </p>
                          <p className="font-extrabold tabular-nums text-text dark:text-white">
                            {count(sent)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="mt-5 rounded-xl bg-page p-3.5 dark:bg-ink-800">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={wizard.skipAlreadySent}
                    onChange={(event) => {
                      wizard.setField("skipAlreadySent", event.target.checked);
                      wizard.setPreview(null);
                    }}
                    className="mt-1 h-4 w-4 accent-emerald-700"
                  />
                  <span>
                    <span className="block text-sm font-extrabold text-text dark:text-white">
                      Skip contacts who have already received a message
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted dark:text-ink-400">
                      Avoid sending another message to the same contact.
                    </span>
                  </span>
                </label>
              </div>
            </Panel>
          </div>
          <aside className="h-fit space-y-4 xl:sticky xl:top-5">
            <Panel title="Your selection">
              {selectedAudience ? (
                <>
                  <p className="text-sm font-extrabold text-text dark:text-white">
                    {selectedAudience.name}
                  </p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-text-muted dark:text-ink-400">
                        Total contacts
                      </span>
                      <b className="tabular-nums">
                        {count(
                          wizard.preview?.total ??
                            selectedAudience.contactCount,
                        )}
                      </b>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-text-muted dark:text-ink-400">
                        Previously sent (skipped)
                      </span>
                      <b className="tabular-nums">
                        {count(
                          wizard.preview?.skip ??
                            (wizard.skipAlreadySent
                              ? selectedAudience.skipCount?.whatsapp
                              : 0),
                        )}
                      </b>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-text-muted dark:text-ink-400">
                        Missing phone number
                      </span>
                      <b className="tabular-nums">
                        {count(wizard.preview?.missingContact || 0)}
                      </b>
                    </div>
                    <div className="rounded-xl bg-primary-soft p-4">
                      <p className="text-xs font-extrabold text-primary">
                        Messages to be sent
                      </p>
                      <p className="mt-1 text-3xl font-extrabold tabular-nums text-primary">
                        {count(chosenCount)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-muted dark:text-ink-400">
                  Select an audience to see the contact count.
                </p>
              )}
              <button
                type="button"
                onClick={goNext}
                disabled={!selectedAudience || !(wizard.preview?.final > 0)}
                className="btn-primary mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next: Choose message <ArrowRight size={16} />
              </button>
              <div className="mt-4 rounded-lg bg-primary-soft/70 p-3 text-xs leading-5 text-primary">
                <b>Nothing will be sent yet.</b> Messages will be sent only
                after you click “Start campaign” in Step 3.
              </div>
            </Panel>
          </aside>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Panel title="2. Choose message">
              <p className="mb-4 text-sm text-text-muted dark:text-ink-400">
                Only Meta-approved templates appear here. Submit new templates
                for approval before using them.
              </p>
              <div className="mb-4">
                <Link
                  to="/whatsapp/templates/new"
                  className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primary hover:underline"
                >
                  + Create a template and submit it for approval{" "}
                  <ArrowRight size={14} />
                </Link>
              </div>
              {templatesLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
                  <LoaderCircle size={18} className="animate-spin" /> Loading
                  approved templates…
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-input-border p-8 text-center">
                  <FileText size={28} className="mx-auto text-primary" />
                  <p className="mt-3 font-extrabold text-text dark:text-white">
                    No approved templates found
                  </p>
                  <p className="mt-1 text-sm text-text-muted dark:text-ink-400">
                    You can select a template here after Meta approves it.
                  </p>
                  <Link
                    to="/whatsapp/templates/new"
                    className="btn-primary mt-4 inline-flex"
                  >
                    New template <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => {
                    const active =
                      `${template.name}::${template.language}` ===
                      `${selectedTemplate?.name}::${selectedTemplate?.language}`;
                    const header = getHeaderType(template);
                    return (
                      <button
                        type="button"
                        key={`${template.name}::${template.language}`}
                        onClick={() => chooseTemplate(template)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${active ? "border-primary bg-primary-soft ring-1 ring-primary/20 dark:bg-primary/10" : "border-surface-border bg-white hover:border-primary/50 dark:border-ink-700 dark:bg-ink-900"}`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${active ? "border-primary bg-primary text-white" : "border-input-border text-transparent"}`}
                          >
                            {active && <Check size={12} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-primary-soft px-2 py-1 text-[10px] font-extrabold tracking-wide text-primary">
                                APPROVED
                              </span>
                              <span className="rounded-full bg-chip-neutral-bg px-2 py-1 text-[10px] font-extrabold text-chip-neutral-text">
                                {String(
                                  template.category || "MARKETING",
                                ).toUpperCase()}
                              </span>
                            </div>
                            <p className="mt-2 break-words font-extrabold text-text dark:text-white">
                              {template.name}
                            </p>
                            <p className="mt-1 text-xs text-text-muted dark:text-ink-400">
                              {template.name} · {template.language || "en_US"}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-text-muted dark:text-ink-300">
                              {templateBody(template) ||
                                "Message preview unavailable"}
                            </p>
                            {header !== "none" && (
                              <p className="mt-2 text-xs font-semibold text-text-muted dark:text-ink-400">
                                Header:{" "}
                                {header === "document"
                                  ? "PDF / Brochure"
                                  : header}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Panel>
            {selectedTemplate && (
              <Panel title="Personalisation (optional)">
                <p className="mb-3 text-sm text-text-muted dark:text-ink-400">
                  By default, the template's name variable is filled with the
                  customer's name. Change other settings only when needed.
                </p>
                <details className="rounded-xl border border-surface-border p-3 dark:border-ink-700">
                  <summary className="cursor-pointer text-sm font-extrabold text-primary">
                    Edit name, city, budget, or fallback
                  </summary>
                  <div className="mt-4 space-y-4">
                    {indexes.length === 0 ? (
                      <p className="rounded-lg bg-page p-3 text-sm text-text-muted dark:bg-ink-800 dark:text-ink-400">
                        This template has no variables. The message will be sent
                        exactly as approved.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {indexes.map((index) => {
                          const config = wizard.variables[index] || {
                            source: "name",
                            value: "",
                            fallback: "Sir/Ma'am",
                          };
                          return (
                            <div
                              key={index}
                              className="rounded-xl border border-surface-border p-4 dark:border-ink-700"
                            >
                              <p className="mb-3 text-sm font-extrabold text-text dark:text-white">
                                Variable {"{{"}
                                {index}
                                {"}}"}
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <FieldLabel
                                    htmlFor={`variable-source-${index}`}
                                  >
                                    What should go here?
                                  </FieldLabel>
                                  <select
                                    id={`variable-source-${index}`}
                                    className="input-field"
                                    value={config.source}
                                    onChange={(event) =>
                                      changeVariable(index, {
                                        source: event.target.value,
                                      })
                                    }
                                  >
                                    <option value="name">Contact name</option>
                                    <option value="city">City</option>
                                    <option value="budget">Budget</option>
                                    <option value="static">Custom text</option>
                                  </select>
                                </div>
                                {config.source === "static" && (
                                  <div>
                                    <FieldLabel
                                      htmlFor={`variable-value-${index}`}
                                    >
                                      Custom text
                                    </FieldLabel>
                                    <input
                                      id={`variable-value-${index}`}
                                      className="input-field"
                                      value={config.value || ""}
                                      onChange={(event) =>
                                        changeVariable(index, {
                                          value: event.target.value,
                                        })
                                      }
                                      placeholder="Special property offer"
                                      maxLength={1000}
                                    />
                                  </div>
                                )}
                                <div>
                                  <FieldLabel
                                    htmlFor={`variable-fallback-${index}`}
                                  >
                                    Fallback if name is unavailable
                                  </FieldLabel>
                                  <input
                                    id={`variable-fallback-${index}`}
                                    className="input-field"
                                    value={config.fallback || ""}
                                    onChange={(event) =>
                                      changeVariable(index, {
                                        fallback: event.target.value,
                                      })
                                    }
                                    placeholder="Sir/Ma'am"
                                    maxLength={200}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </details>
              </Panel>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={() => navigate(STEPS[0].path)}
                className="btn-secondary"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={
                  !selectedTemplate || templatesLoading || !validVariables
                }
                className="btn-primary disabled:opacity-50"
              >
                Next: Review <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <aside className="h-fit rounded-2xl border border-surface-border bg-white p-4 dark:border-ink-800 dark:bg-ink-900 xl:sticky xl:top-5">
            <h2 className="text-base font-extrabold text-text dark:text-white">
              Customer preview
            </h2>
            <p className="mt-1 text-xs text-text-muted dark:text-ink-400">
              WhatsApp phone preview
            </p>
            <div className="mt-4">
              <WhatsAppPhonePreview
                customerName="Ayush"
                title={selectedTemplate?.headerText || ""}
                greeting="Hello {{1}},"
                body={
                  selectedTemplate
                    ? personalise(bodyText, wizard.variables)
                    : "Select an approved template."
                }
                footer={selectedTemplate?.footerText || ""}
                buttons={buttons}
                headerImage={headerType === "image" ? headerImage : ""}
                headerDocumentName={headerDocumentName}
              />
            </div>
            <p className="mt-3 text-center text-xs text-text-muted dark:text-ink-400">
              Preview name: <b className="text-text dark:text-white">Ayush</b>{" "}
              (list ka pehla contact)
            </p>
          </aside>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Panel title="3. Review and send">
              <div className="space-y-3">
                {[
                  {
                    label: "Audience",
                    value: selectedAudience?.name || "No audience selected",
                    to: STEPS[0].path,
                  },
                  {
                    label: "Message",
                    value: selectedTemplate
                      ? `${selectedTemplate.name} · personalized`
                      : "No template selected",
                    to: STEPS[1].path,
                  },
                  {
                    label: "Sending from",
                    value: `${whatsappStatus?.verifiedName || "Agarwal Homez"}${whatsappStatus?.phoneNumber ? ` · ${whatsappStatus.phoneNumber}` : " · WhatsApp Business account"}`,
                    to: null,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-surface-border p-3.5 dark:border-ink-700"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-text-muted dark:text-ink-400">
                        {row.label}
                      </p>
                      <p className="mt-1 break-words text-sm font-extrabold text-text dark:text-white">
                        {row.value}
                      </p>
                    </div>
                    {row.to && (
                      <button
                        type="button"
                        onClick={() => navigate(row.to)}
                        className="text-sm font-extrabold text-primary hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="When should it be sent?">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => wizard.setField("scheduleMode", "now")}
                  className={`rounded-xl border p-4 text-left ${wizard.scheduleMode === "now" ? "border-primary bg-primary-soft" : "border-surface-border dark:border-ink-700"}`}
                >
                  <span className="flex items-center gap-2 font-extrabold text-text dark:text-white">
                    <Send size={16} className="text-primary" /> Send now
                  </span>
                  <span className="mt-1 block text-sm text-text-muted dark:text-ink-400">
                    Starts immediately; messages are sent gradually.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => wizard.setField("scheduleMode", "later")}
                  className={`rounded-xl border p-4 text-left ${wizard.scheduleMode === "later" ? "border-primary bg-primary-soft" : "border-surface-border dark:border-ink-700"}`}
                >
                  <span className="flex items-center gap-2 font-extrabold text-text dark:text-white">
                    <CalendarClock size={16} className="text-primary" />{" "}
                    Schedule for later
                  </span>
                  <span className="mt-1 block text-sm text-text-muted dark:text-ink-400">
                    Choose a date and time (IST)
                  </span>
                </button>
              </div>
              {wizard.scheduleMode === "later" && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="schedule-date">Date (IST)</FieldLabel>
                    <input
                      id="schedule-date"
                      type="date"
                      value={wizard.scheduleDate}
                      min={currentTime.date}
                      onChange={(event) =>
                        wizard.setField("scheduleDate", event.target.value)
                      }
                      className="input-field"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="schedule-time">Time (IST)</FieldLabel>
                    <input
                      id="schedule-time"
                      type="time"
                      value={wizard.scheduleTime}
                      onChange={(event) =>
                        wizard.setField("scheduleTime", event.target.value)
                      }
                      className="input-field"
                    />
                  </div>
                  <p className="text-xs text-text-muted dark:text-ink-400 sm:col-span-2">
                    The scheduled time will be interpreted in the Asia/Kolkata
                    time zone.
                  </p>
                </div>
              )}
            </Panel>
            <details className="card !p-4 sm:!p-5">
              <summary className="cursor-pointer text-base font-extrabold text-text dark:text-white">
                Optional: Send a test message first
              </summary>
              <div className="mt-3">
                <p className="mb-3 text-sm text-text-muted dark:text-ink-400">
                  The selected Meta template will be tested using sample
                  variables for the first contact in the audience.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <FieldLabel htmlFor="test-phone">
                      Your WhatsApp number
                    </FieldLabel>
                    <input
                      id="test-phone"
                      type="tel"
                      value={wizard.testPhone}
                      onChange={(event) =>
                        wizard.setField("testPhone", event.target.value)
                      }
                      className="input-field"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="sm:self-end">
                    <button
                      type="button"
                      onClick={sendTest}
                      disabled={
                        testSending || !selectedTemplate || !wizard.audienceId
                      }
                      className="btn-secondary w-full justify-center disabled:opacity-50"
                    >
                      {testSending ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <MessageCircle size={16} />
                      )}{" "}
                      Send test
                    </button>
                  </div>
                </div>
              </div>
            </details>
          </div>
          <aside className="h-fit space-y-4 xl:sticky xl:top-5">
            <Panel title="Final review">
              <div className="rounded-xl bg-primary-soft p-4">
                <p className="text-sm font-bold text-primary">
                  Recipients will receive a message
                </p>
                <p className="mt-1 text-4xl font-extrabold tabular-nums text-primary">
                  {count(chosenCount)}
                </p>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-text-muted dark:text-ink-400">
                    Meta charge / message
                  </span>
                  <b>
                    {wizard.preview?.rateInr == null
                      ? "Set the rate in Settings"
                      : money(wizard.preview.rateInr)}
                  </b>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-text-muted dark:text-ink-400">
                    Estimated total
                  </span>
                  <b>
                    {wizard.preview?.estimatedCostInr == null
                      ? "Set the rate in Settings"
                      : money(wizard.preview.estimatedCostInr)}
                  </b>
                </div>
                <div className="rounded-lg bg-page p-3 text-xs leading-5 text-text-muted dark:bg-ink-800 dark:text-ink-400">
                  Meta charges will be billed separately to your WhatsApp
                  account.
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-chip-warning-text/20 bg-chip-warning-bg p-3.5">
                  <input
                    type="checkbox"
                    checked={wizard.optInConfirmed}
                    onChange={(event) =>
                      wizard.setField("optInConfirmed", event.target.checked)
                    }
                    className="mt-1 h-4 w-4 accent-emerald-700"
                  />
                  <span className="text-xs leading-5 text-chip-warning-text">
                    <b className="block">
                      All these recipients have agreed to be contacted (opt-in).
                    </b>{" "}
                    Sending spam may result in your number being blocked.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={launch}
                  disabled={
                    launching ||
                    !wizard.optInConfirmed ||
                    !selectedTemplate ||
                    !(chosenCount > 0)
                  }
                  className="btn-primary w-full justify-center py-3 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {launching ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : wizard.scheduleMode === "later" ? (
                    <CalendarClock size={17} />
                  ) : (
                    <Send size={17} />
                  )}{" "}
                  {launching
                    ? "Adding campaign to the queue…"
                    : wizard.scheduleMode === "later"
                      ? "Schedule campaign"
                      : "Start campaign"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(STEPS[1].path)}
                  className="w-full py-2 text-sm font-bold text-text-muted hover:text-primary dark:text-ink-400"
                >
                  Go back
                </button>
              </div>
            </Panel>
          </aside>
        </div>
      )}
    </div>
  );
}
