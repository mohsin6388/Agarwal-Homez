import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Filter,
  ListChecks,
  LoaderCircle,
  Plus,
  Save,
  Tag,
  UploadCloud,
  Users,
  X,
  ClipboardPaste,
  Database,
  AlertTriangle,
  Info,
} from "lucide-react";
import { audienceApi } from "../../api/audienceApi.js";

const COUNT_FORMAT = new Intl.NumberFormat("en-IN");
const STATUS_OPTIONS = [
  { value: "all", label: "All Contacts" },
  { value: "no_reply", label: "No Reply Yet" },
  { value: "hot", label: "Hot Leads" },
  { value: "visit", label: "Visit Leads" },
];
const EMPTY_FILTERS = {
  status: "all",
  city: "",
  jobTitle: "",
  dateRange: "any",
  sourceFile: "",
};

function count(value) {
  return COUNT_FORMAT.format(Number(value || 0));
}
function getError(error, fallback) {
  return error?.response?.data?.message || fallback;
}

async function downloadBlob(response, filename) {
  const blob =
    response?.data instanceof Blob ? response.data : new Blob([response?.data]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadRowsCsv(rows, filename = "propai-invalid-contacts.csv") {
  const columns = ["Row number", "Name", "Mobile", "Email", "Reason"];
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const body = [
    columns,
    ...rows.map((row) => [
      row.rowNumber,
      row.name,
      row.phone,
      row.email,
      (row.errors || []).join("; ") || row.duplicateReason || "Invalid contact",
    ]),
  ]
    .map((row) => row.map(quote).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function MethodCard({ active, icon: Icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full items-start gap-3 rounded-2xl border p-4 text-left transition ${active ? "border-primary bg-primary-soft ring-1 ring-primary/20 dark:bg-primary/10" : "border-surface-border bg-white hover:border-primary/50 dark:border-ink-700 dark:bg-ink-900"}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-primary text-white" : "bg-page text-primary dark:bg-ink-800"}`}
      >
        <Icon size={19} />
      </span>
      <span className="min-w-0">
        <span className="block font-extrabold text-text dark:text-white">
          {title}
        </span>
        <span className="mt-1 block text-sm leading-5 text-text-muted dark:text-ink-400">
          {description}
        </span>
      </span>
    </button>
  );
}

function CountTile({ label, value, tone, hint }) {
  const tones = {
    good: "border-primary/20 bg-primary-soft text-primary",
    warning:
      "border-chip-warning-text/20 bg-chip-warning-bg text-chip-warning-text",
    bad: "border-chip-error-text/20 bg-chip-error-bg text-chip-error-text",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-extrabold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold tabular-nums">
        {count(value)}
      </p>
      {hint && <p className="mt-1 text-xs opacity-80">{hint}</p>}
    </div>
  );
}

function RowStatus({ row }) {
  if (row.status === "duplicate" || row.isDuplicate)
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-chip-warning-bg px-2.5 py-1 text-xs font-extrabold text-chip-warning-text">
        Duplicate
      </span>
    );
  if (row.status === "invalid" || (row.errors || []).length)
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-chip-error-bg px-2.5 py-1 text-xs font-extrabold text-chip-error-text">
        Invalid number
      </span>
    );
  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-primary-soft px-2.5 py-1 text-xs font-extrabold text-primary">
      Valid
    </span>
  );
}

export default function AudienceBuilderPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const preselectedIds = useMemo(
    () =>
      [
        ...new Set(
          (searchParams.get("leadIds") || "")
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean),
        ),
      ].slice(0, 20000),
    [searchParams],
  );
  const [method, setMethod] = useState(
    preselectedIds.length ? "leads" : "upload",
  );
  const [file, setFile] = useState(null);
  const [pasteText, setPasteText] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterOptions, setFilterOptions] = useState({
    cities: [],
    jobTitles: [],
    sourceFiles: [],
  });
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [addCountryCode, setAddCountryCode] = useState(true);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [audienceName, setAudienceName] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [addToCrm, setAddToCrm] = useState(true);
  const [savedAudience, setSavedAudience] = useState(null);
  const [launchAfterSave, setLaunchAfterSave] = useState(false);

  const runPreview = useCallback(
    async (nextMethod = method) => {
      setError("");
      setNotice("");
      setPreviewLoading(true);
      try {
        let response;
        if (nextMethod === "upload") {
          if (!file)
            throw new Error("Please select an Excel or CSV file first.");
          response = await audienceApi.previewFile(file, addCountryCode);
        } else if (nextMethod === "paste") {
          if (!pasteText.trim())
            throw new Error("Please paste contacts first.");
          response = await audienceApi.previewText(pasteText, addCountryCode);
        } else {
          response = await audienceApi.previewLeads(
            {
              ...filters,
              leadIds: preselectedIds.length ? preselectedIds : undefined,
            },
            addCountryCode,
          );
          if (response.data?.filterOptions)
            setFilterOptions(response.data.filterOptions);
        }
        setPreview(response.data);
        setShowAllRows(false);
        setSavedAudience(null);
        if (nextMethod === "leads") {
          const validIds = (response.data?.rows || [])
            .filter((row) => row.status === "valid" && row.leadId)
            .map((row) => String(row.leadId));
          setSelectedLeadIds(
            preselectedIds.length
              ? validIds.filter((id) => preselectedIds.includes(id))
              : [],
          );
        } else {
          setSelectedLeadIds([]);
        }
        if (response.data?.truncated)
          setNotice(
            `Many contacts were found. The first ${count(response.data.rows?.length)} contacts are shown in the preview (maximum 20,000).`,
          );
        else
          setNotice(
            `${count(response.data?.summary?.valid)} valid contacts are ready for preview. No messages have been sent.`,
          );
      } catch (requestError) {
        setError(
          requestError?.response?.data?.message ||
            requestError.message ||
            "Could not preview contacts.",
        );
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    },
    [method, file, pasteText, addCountryCode, filters, preselectedIds],
  );

  useEffect(() => {
    if (!preselectedIds.length) return;
    let cancelled = false;
    (async () => {
      setPreviewLoading(true);
      setError("");
      try {
        const response = await audienceApi.previewLeads(
          { ...EMPTY_FILTERS, leadIds: preselectedIds },
          true,
        );
        if (cancelled) return;
        setPreview(response.data);
        setFilterOptions(
          response.data?.filterOptions || {
            cities: [],
            jobTitles: [],
            sourceFiles: [],
          },
        );
        setSelectedLeadIds(
          (response.data?.rows || [])
            .filter(
              (row) =>
                row.status === "valid" &&
                row.leadId &&
                preselectedIds.includes(String(row.leadId)),
            )
            .map((row) => String(row.leadId)),
        );
        setNotice(
          `${count(response.data?.summary?.valid)} selected contacts loaded successfully.`,
        );
      } catch (requestError) {
        if (!cancelled)
          setError(
            getError(requestError, "Could not load the selected contacts."),
          );
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preselectedIds]);

  const previewRows = preview?.rows || [];
  const validRows = useMemo(
    () =>
      previewRows.filter(
        (row) =>
          row.status === "valid" &&
          !row.isDuplicate &&
          (method !== "leads" || selectedLeadIds.includes(String(row.leadId))),
      ),
    [previewRows, method, selectedLeadIds],
  );
  const duplicateRows = useMemo(
    () =>
      previewRows.filter(
        (row) => row.status === "duplicate" || row.isDuplicate,
      ),
    [previewRows],
  );
  const invalidRows = useMemo(
    () =>
      previewRows.filter(
        (row) => row.status === "invalid" || (row.errors || []).length > 0,
      ),
    [previewRows],
  );
  const [showAllRows, setShowAllRows] = useState(false);
  const visiblePreviewRows = showAllRows
    ? previewRows
    : previewRows.slice(0, 100);
  const selectableLeadIds = useMemo(
    () =>
      previewRows
        .filter(
          (row) => row.status === "valid" && !row.isDuplicate && row.leadId,
        )
        .map((row) => String(row.leadId)),
    [previewRows],
  );
  const allVisibleLeadsSelected =
    selectableLeadIds.length > 0 &&
    selectableLeadIds.every((id) => selectedLeadIds.includes(id));
  const toggleLeadSelection = (leadId) => {
    const id = String(leadId);
    setSelectedLeadIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };
  const toggleAllLeadSelection = () => {
    setSelectedLeadIds((current) =>
      allVisibleLeadsSelected
        ? current.filter((id) => !selectableLeadIds.includes(id))
        : [...new Set([...current, ...selectableLeadIds])],
    );
  };

  const addTag = () => {
    const tag = tagInput.trim().slice(0, 40);
    if (
      tag &&
      !tags.some((existing) => existing.toLowerCase() === tag.toLowerCase()) &&
      tags.length < 20
    )
      setTags((current) => [...current, tag]);
    setTagInput("");
  };

  const saveAudience = async (alsoMakeCampaign = false) => {
    setError("");
    setNotice("");
    if (!preview) {
      setError("Please preview the contacts first.");
      return;
    }
    if (!audienceName.trim()) {
      setError("Please enter an audience name.");
      return;
    }
    if (!validRows.length) {
      setError("At least one valid contact is required to save this audience.");
      return;
    }
    setLaunchAfterSave(alsoMakeCampaign);
    setSaving(true);
    try {
      const response = await audienceApi.create({
        name: audienceName.trim(),
        tags,
        sourceType: preview.sourceType || method,
        sourceLabel: preview.sourceLabel || "",
        sourceFileName: preview.sourceFileName || "",
        addToCrm,
        addCountryCode,
        rows: (method === "leads" ? validRows : previewRows).map((row) => ({
          rowNumber: row.rowNumber,
          leadId: row.leadId,
          name: row.name || "",
          phone: row.phone || "",
          email: row.email || "",
          address: row.address || "",
          city: row.city || "",
          location: row.location || "",
          occupation: row.occupation || row.jobTitle || "",
          budgetMin: row.budgetMin ?? null,
          budgetMax: row.budgetMax ?? null,
          notes: row.notes || "",
          requirements: row.requirements || "",
          status: row.status,
          isDuplicate: Boolean(row.isDuplicate),
          duplicateReason: row.duplicateReason || "",
          errors: row.errors || [],
        })),
      });
      const audience = response.data?.audience;
      setSavedAudience(audience);
      setNotice(
        `Audience saved — ${count(response.data?.resolvedCount)} contacts. No messages were sent.`,
      );
      if (alsoMakeCampaign && audience?._id) {
        navigate(
          `/outreach/whatsapp/new?audienceId=${encodeURIComponent(audience._id)}`,
        );
      }
    } catch (requestError) {
      setError(
        getError(
          requestError,
          "Could not save the audience. Please try again.",
        ),
      );
    } finally {
      setSaving(false);
      setLaunchAfterSave(false);
    }
  };

  const downloadSample = async () => {
    try {
      await downloadBlob(
        await audienceApi.sampleSheet(),
        "propai-contacts-sample.xlsx",
      );
    } catch (requestError) {
      setError(getError(requestError, "Could not download the sample file."));
    }
  };

  const downloadSavedInvalid = async () => {
    if (!savedAudience?._id) return;
    try {
      await downloadBlob(
        await audienceApi.invalidCsv(savedAudience._id),
        `audience-invalid-${savedAudience._id}.csv`,
      );
    } catch (requestError) {
      setError(
        getError(requestError, "Could not download the invalid-numbers file."),
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-text-muted dark:text-ink-400">
            <Link to="/audiences" className="hover:text-primary">
              Audiences
            </Link>
            <span>›</span>
            <span className="text-primary">New Audience</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text dark:text-white">
            Create Your Audience
          </h1>
          <p className="page-description">
            Create a list once and reuse it in future campaigns.
          </p>
        </div>
        <Link to="/audiences" className="btn-secondary">
          <Users size={17} /> View Saved Audiences
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-chip-error-text/20 bg-chip-error-bg px-4 py-3 text-sm text-chip-error-text"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary"
        >
          <Info size={18} className="mt-0.5 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="min-w-0 space-y-5">
          <section className="card space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary font-extrabold">
                1
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-text dark:text-white">
                  Choose Contact Source
                </h2>
                <p className="mt-1 text-sm text-text-muted dark:text-ink-400">
                  Upload, paste, or create a list from existing Upload Data
                  contacts.
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <MethodCard
                active={method === "upload"}
                icon={FileSpreadsheet}
                title="Excel / CSV upload"
                description="Upload an existing list"
                onClick={() => {
                  setMethod("upload");
                  setPreview(null);
                  setError("");
                }}
              />
              <MethodCard
                active={method === "paste"}
                icon={ClipboardPaste}
                title="Paste Contacts"
                description="Copy and paste contacts directly"
                onClick={() => {
                  setMethod("paste");
                  setPreview(null);
                  setError("");
                }}
              />
              <MethodCard
                active={method === "leads"}
                icon={Database}
                title="Select from Upload Data"
                description="Filter by city, job title, or lead status"
                onClick={() => {
                  setMethod("leads");
                  setError("");
                  runPreview("leads");
                }}
              />
            </div>

            {method === "upload" && (
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const dropped = event.dataTransfer.files?.[0];
                  if (dropped) {
                    setFile(dropped);
                    setPreview(null);
                    setSavedAudience(null);
                  }
                }}
                className="rounded-2xl border-2 border-dashed border-input-border bg-page/60 p-5 text-center dark:border-ink-700 dark:bg-ink-950/30"
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <UploadCloud size={24} />
                </span>
                <p className="mt-3 font-extrabold text-text dark:text-white">
                  Drop an Excel or CSV file here
                </p>
                <p className="mt-1 text-sm text-text-muted dark:text-ink-400">
                  Only two columns are required: Name and Mobile Number.
                  Email-only contacts are also supported.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] || null);
                    setPreview(null);
                    setSavedAudience(null);
                  }}
                  className="sr-only"
                />
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary"
                  >
                    <FileUp size={17} /> Choose File
                  </button>
                  <button
                    type="button"
                    onClick={downloadSample}
                    className="btn-secondary"
                  >
                    <Download size={17} /> Download Sample File
                  </button>
                </div>
                {file && (
                  <p className="mt-3 text-sm font-bold text-primary">
                    {file.name} · {(file.size / 1024).toFixed(0)} KB selected
                  </p>
                )}
              </div>
            )}

            {method === "paste" && (
              <div className="space-y-3">
                <label
                  htmlFor="audience-paste"
                  className="block text-sm font-bold text-text dark:text-white"
                >
                  Paste contacts (one per line; names are optional)
                </label>
                <textarea
                  id="audience-paste"
                  rows={7}
                  value={pasteText}
                  onChange={(event) => {
                    setPasteText(event.target.value);
                    setPreview(null);
                    setSavedAudience(null);
                  }}
                  placeholder={
                    "Ayush, 9454593474\n9876543210\nRiya, riya@example.com"
                  }
                  className="input-field resize-y"
                />
                <p className="text-xs text-text-muted dark:text-ink-400">
                  You can paste a phone number, email, or both on one line.
                </p>
              </div>
            )}

            {method === "leads" && (
              <div className="space-y-4 rounded-2xl border border-surface-border bg-page/50 p-4 dark:border-ink-700 dark:bg-ink-950/30">
                {preselectedIds.length > 0 && (
                  <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2.5 text-sm font-bold text-primary">
                    <CheckCircle2 size={17} />
                    {count(preselectedIds.length)} selected contacts were loaded
                    from Upload Data.
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <label
                      htmlFor="audience-source-file"
                      className="mb-1.5 block text-sm font-bold"
                    >
                      Previously Uploaded Spreadsheet
                    </label>
                    <select
                      id="audience-source-file"
                      className="input-field"
                      value={filters.sourceFile}
                      onChange={(event) => {
                        setFilters((current) => ({
                          ...current,
                          sourceFile: event.target.value,
                        }));
                        setPreview(null);
                        setSelectedLeadIds([]);
                      }}
                    >
                      <option value="">All Uploaded Contacts</option>
                      {filterOptions.sourceFiles.map((fileName) => (
                        <option value={fileName} key={fileName}>
                          {fileName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="audience-status"
                      className="mb-1.5 block text-sm font-bold"
                    >
                      Status
                    </label>
                    <select
                      id="audience-status"
                      className="input-field"
                      value={filters.status}
                      onChange={(event) => {
                        setFilters((current) => ({
                          ...current,
                          status: event.target.value,
                        }));
                        setPreview(null);
                        setSelectedLeadIds([]);
                      }}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option value={option.value} key={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="audience-city"
                      className="mb-1.5 block text-sm font-bold"
                    >
                      City
                    </label>
                    <select
                      id="audience-city"
                      className="input-field"
                      value={filters.city}
                      onChange={(event) => {
                        setFilters((current) => ({
                          ...current,
                          city: event.target.value,
                        }));
                        setPreview(null);
                        setSelectedLeadIds([]);
                      }}
                    >
                      <option value="">All Cities</option>
                      {filterOptions.cities.map((city) => (
                        <option value={city} key={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="audience-job"
                      className="mb-1.5 block text-sm font-bold"
                    >
                      Job title
                    </label>
                    <select
                      id="audience-job"
                      className="input-field"
                      value={filters.jobTitle}
                      onChange={(event) => {
                        setFilters((current) => ({
                          ...current,
                          jobTitle: event.target.value,
                        }));
                        setPreview(null);
                        setSelectedLeadIds([]);
                      }}
                    >
                      <option value="">All Job Titles</option>
                      {filterOptions.jobTitles.map((job) => (
                        <option value={job} key={job}>
                          {job}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="audience-date"
                      className="mb-1.5 block text-sm font-bold"
                    >
                      Date Added
                    </label>
                    <select
                      id="audience-date"
                      className="input-field"
                      value={filters.dateRange}
                      onChange={(event) => {
                        setFilters((current) => ({
                          ...current,
                          dateRange: event.target.value,
                        }));
                        setPreview(null);
                        setSelectedLeadIds([]);
                      }}
                    >
                      <option value="30d">Last 30 Days</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="any">Any Time</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-text-muted dark:text-ink-400">
                    Select a previously uploaded Excel/CSV file, then check only
                    the contacts you want to include in the audience.
                  </p>
                  <button
                    type="button"
                    onClick={() => runPreview("leads")}
                    disabled={previewLoading}
                    className="btn-primary"
                  >
                    <Filter size={17} />
                    {previewLoading ? "Finding contacts…" : "Find Contacts"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-surface-border pt-4 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={addCountryCode}
                  onChange={(event) => {
                    setAddCountryCode(event.target.checked);
                    setPreview(null);
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="block font-extrabold text-text dark:text-white">
                    Automatically add +91 to phone numbers
                  </span>
                  <span className="mt-0.5 block text-xs text-text-muted dark:text-ink-400">
                    Applies only to 10-digit Indian mobile numbers.
                  </span>
                </span>
              </label>
              {method !== "leads" && (
                <button
                  type="button"
                  onClick={() => runPreview(method)}
                  disabled={previewLoading}
                  className="btn-primary shrink-0"
                >
                  <ListChecks size={17} />
                  {previewLoading ? "Cleaning the list…" : "Preview List"}
                </button>
              )}
            </div>
          </section>

          <section className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary font-extrabold">
                  2
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-text dark:text-white">
                    Contact List Summary
                  </h2>
                  <p className="mt-1 text-sm text-text-muted dark:text-ink-400">
                    Duplicates are removed from the audience; existing PropAI
                    Leads are reused.
                  </p>
                </div>
              </div>
              {preview && (
                <span className="rounded-full bg-chip-neutral-bg px-3 py-1 text-xs font-extrabold text-chip-neutral-text">
                  {preview.sourceLabel || "Preview ready"}
                </span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <CountTile
                label={
                  method === "leads" ? "Selected Contacts" : "Valid Contacts"
                }
                value={
                  method === "leads"
                    ? validRows.length
                    : preview?.summary?.valid || 0
                }
                tone="good"
                hint={
                  method === "leads"
                    ? "These contacts will be included in the audience"
                    : "Included in the audience"
                }
              />
              <CountTile
                label="Duplicates Removed"
                value={preview?.summary?.duplicates || 0}
                tone="warning"
                hint="Each contact is included once"
              />
              <CountTile
                label="Invalid numbers"
                value={preview?.summary?.invalid || 0}
                tone="bad"
                hint="These contacts will not be included"
              />
            </div>
            {preview ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-text-muted dark:text-ink-400">
                    {count(previewRows.length)} rows in preview{" "}
                    {method === "leads"
                      ? `· ${count(validRows.length)} selected`
                      : ""}{" "}
                    {previewRows.length > 100 && !showAllRows
                      ? "(showing the first 100)"
                      : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {method === "leads" && (
                      <>
                        <button
                          type="button"
                          onClick={toggleAllLeadSelection}
                          className="btn-secondary !min-h-9 !py-1.5"
                        >
                          {allVisibleLeadsSelected
                            ? "Clear selection"
                            : "Select all valid contacts"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedLeadIds([])}
                          disabled={!selectedLeadIds.length}
                          className="btn-secondary !min-h-9 !py-1.5"
                        >
                          Clear selection
                        </button>
                      </>
                    )}
                    {invalidRows.length > 0 && (
                      <button
                        type="button"
                        onClick={() => downloadRowsCsv(invalidRows)}
                        className="btn-secondary !min-h-9 !py-1.5"
                      >
                        <Download size={15} /> Download Invalid Numbers CSV
                      </button>
                    )}
                    {previewRows.length > 100 && (
                      <button
                        type="button"
                        onClick={() => setShowAllRows((value) => !value)}
                        className="btn-secondary !min-h-9 !py-1.5"
                      >
                        {showAllRows ? "Show fewer rows" : "Show all rows"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="table-scroll rounded-card border border-surface-border dark:border-ink-800">
                  <table className="w-full min-w-[780px] text-left text-sm">
                    <thead className="bg-page text-xs font-extrabold uppercase tracking-wide text-text-muted dark:bg-ink-800 dark:text-ink-300">
                      <tr>
                        {method === "leads" && (
                          <th className="w-10 px-3 py-3">
                            <input
                              type="checkbox"
                              aria-label="Select all valid contacts"
                              checked={allVisibleLeadsSelected}
                              onChange={toggleAllLeadSelection}
                              disabled={!selectableLeadIds.length}
                            />
                          </th>
                        )}
                        {[
                          "Name",
                          "WhatsApp number",
                          "City",
                          "Status",
                          "Reason",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="whitespace-nowrap px-3 py-3"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePreviewRows.map((row, index) => (
                        <tr
                          key={`${row.leadId || row.rowNumber || index}-${index}`}
                          className="border-t border-surface-border dark:border-ink-800"
                        >
                          {method === "leads" && (
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                aria-label={`Select ${row.name || row.phone || "contact"}`}
                                checked={Boolean(
                                  row.leadId &&
                                  selectedLeadIds.includes(String(row.leadId)),
                                )}
                                onChange={() =>
                                  row.leadId && toggleLeadSelection(row.leadId)
                                }
                                disabled={row.status !== "valid" || !row.leadId}
                              />
                            </td>
                          )}
                          <td className="max-w-[220px] px-3 py-3 font-bold text-text dark:text-white">
                            {row.name || "No name provided"}
                            {row.email && (
                              <span className="block truncate text-xs font-normal text-text-muted">
                                {row.email}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            {row.phone || "—"}
                          </td>
                          <td className="px-3 py-3">{row.city || "—"}</td>
                          <td className="px-3 py-3">
                            <RowStatus row={row} />
                          </td>
                          <td className="max-w-[240px] px-3 py-3 text-xs text-text-muted dark:text-ink-400">
                            {row.duplicateReason ||
                              (row.errors || []).join("; ") ||
                              "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-surface-border px-4 py-10 text-center dark:border-ink-700">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-page text-text-muted dark:bg-ink-800">
                  <ListChecks size={21} />
                </span>
                <p className="mt-3 font-bold text-text dark:text-white">
                  Preview contacts first
                </p>
                <p className="mt-1 text-sm text-text-muted dark:text-ink-400">
                  After preview, valid, duplicate, and invalid rows will appear
                  here.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 2xl:sticky 2xl:top-5">
          <section className="card space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary font-extrabold">
                3
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-text dark:text-white">
                  Name and Save Your Audience
                </h2>
                <p className="mt-1 text-sm text-text-muted dark:text-ink-400">
                  You can reuse saved audiences in future campaigns.
                </p>
              </div>
            </div>
            <div>
              <label
                htmlFor="audience-name"
                className="mb-1.5 block text-sm font-bold"
              >
                Audience Name
              </label>
              <input
                id="audience-name"
                value={audienceName}
                onChange={(event) => setAudienceName(event.target.value)}
                maxLength={120}
                placeholder="Example: Kanpur · October leads"
                className="input-field"
              />
            </div>
            <div>
              <label
                htmlFor="audience-tags"
                className="mb-1.5 flex items-center gap-2 text-sm font-bold"
              >
                <Tag size={15} /> Tags
              </label>
              <div className="flex gap-2">
                <input
                  id="audience-tags"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                  maxLength={40}
                  placeholder="Example: Kanpur, Diwali"
                  className="input-field min-w-0 flex-1"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="btn-secondary !px-3"
                  aria-label="Add tag"
                >
                  <Plus size={17} />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-chip-neutral-bg px-2.5 py-1 text-xs font-bold text-chip-neutral-text"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() =>
                          setTags((current) =>
                            current.filter((value) => value !== tag),
                          )
                        }
                        aria-label={`Remove ${tag} tag`}
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-primary-soft p-3 text-sm">
              <input
                type="checkbox"
                checked={addToCrm}
                onChange={(event) => setAddToCrm(event.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block font-extrabold text-text">
                  Also add new contacts to PropAI Leads (AI will handle their
                  replies).
                </span>
                <span className="mt-1 block text-xs leading-5 text-text-muted">
                  If unchecked, new contacts will remain hidden from the CRM
                  until they receive a reply, then become visible automatically.
                </span>
              </span>
            </label>
            <div className="rounded-xl border border-surface-border p-3 dark:border-ink-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted dark:text-ink-400">
                  Valid contacts
                </span>
                <span className="font-extrabold tabular-nums text-text dark:text-white">
                  {count(validRows.length)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-text-muted dark:text-ink-400">
                  Duplicates
                </span>
                <span className="font-bold tabular-nums">
                  {count(duplicateRows.length)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-text-muted dark:text-ink-400">
                  Invalid numbers
                </span>
                <span className="font-bold tabular-nums">
                  {count(invalidRows.length)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => saveAudience(false)}
              disabled={saving || !preview || !validRows.length}
              className="btn-primary w-full"
            >
              {saving && !launchAfterSave ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}
              Save Audience · {count(validRows.length)}
            </button>
            <button
              type="button"
              onClick={() => saveAudience(true)}
              disabled={saving || !preview || !validRows.length}
              className="btn-secondary w-full"
            >
              Save and Create Campaign <ArrowRight size={16} />
            </button>
            <p className="text-xs leading-5 text-text-muted dark:text-ink-400">
              Uploading does not send messages. It only saves the audience — you
              choose when to send from a campaign.
            </p>
          </section>
          {savedAudience && (
            <section className="card space-y-3 !border-primary/30">
              <div className="flex items-center gap-2 font-extrabold text-primary">
                <CheckCircle2 size={19} />
                Audience Saved Successfully
              </div>
              <p className="text-sm text-text-muted dark:text-ink-400">
                {savedAudience.name} ·{" "}
                {count(
                  savedAudience.contactCount || savedAudience.counts?.valid,
                )}{" "}
                contacts
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={downloadSavedInvalid}
                  disabled={!savedAudience.invalidRowCount}
                  className="btn-secondary w-full"
                >
                  <Download size={16} /> Invalid Numbers CSV
                </button>
                <Link to="/audiences" className="btn-secondary w-full">
                  <Users size={16} /> View Saved Audiences
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/outreach/whatsapp/new?audienceId=${encodeURIComponent(savedAudience._id)}`,
                    )
                  }
                  className="btn-primary w-full"
                >
                  Open Campaign Wizard <ArrowRight size={16} />
                </button>
              </div>
              <p className="text-xs text-text-muted">
                The selected audience will be preselected in the campaign
                wizard. No message will be sent yet.
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
