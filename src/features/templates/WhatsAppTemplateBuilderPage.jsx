import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  MessageCircle,
  Plus,
  Save,
  Send,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { whatsappApi } from "../../api/whatsappApi.js";
import WhatsAppPhonePreview from "../../components/ui/WhatsAppPhonePreview.jsx";

const DEFAULTS = [
  "Ayush",
  "Kanpur",
  "₹80 lakh – ₹85 lakh",
  "2 BHK",
  "Agarwal Homez",
  "next week",
];
const NAME_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

function getComponent(template, type) {
  return (
    (template?.components || []).find(
      (part) => String(part.type || "").toUpperCase() === type,
    ) || null
  );
}

function getTemplateBody(template) {
  return template?.bodyText || getComponent(template, "BODY")?.text || "";
}

function getTemplateButtons(template) {
  return template?.buttons || getComponent(template, "BUTTONS")?.buttons || [];
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+/, "");
}

function headerInfo(template) {
  const header = getComponent(template, "HEADER");
  const raw = String(template?.headerType || "").toLowerCase();
  if (["none", "text", "image", "document"].includes(raw)) return raw;
  if (
    template?.headerDocumentUrl ||
    template?.documentUrl ||
    String(header?.format).toUpperCase() === "DOCUMENT"
  )
    return "document";
  if (
    template?.headerImageUrl ||
    template?.imageUrl ||
    String(header?.format).toUpperCase() === "IMAGE"
  )
    return "image";
  if (template?.headerText || String(header?.format).toUpperCase() === "TEXT")
    return "text";
  return "none";
}

export default function WhatsAppTemplateBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [draftId, setDraftId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("en_US");
  const [headerType, setHeaderType] = useState("none");
  const [headerText, setHeaderText] = useState("");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [headerDocumentUrl, setHeaderDocumentUrl] = useState("");
  const [headerFileName, setHeaderFileName] = useState("");
  const [bodyText, setBodyText] = useState(
    "Hello {{1}}, we have some property options for you at Agarwal Homez. Would you like to see the details?",
  );
  const [footerText, setFooterText] = useState("Agarwal Homez");
  const [buttons, setButtons] = useState([
    { type: "QUICK_REPLY", text: "Book a site visit" },
  ]);
  const [sampleValuesText, setSampleValuesText] = useState("");
  const [showSampleOverrides, setShowSampleOverrides] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const variableIndexes = useMemo(
    () =>
      [
        ...new Set(
          [...bodyText.matchAll(/\{\{(\d+)\}\}/g)].map((match) =>
            Number(match[1]),
          ),
        ),
      ].sort((a, b) => a - b),
    [bodyText],
  );
  const maxVariable = Math.max(0, ...variableIndexes);
  const nameValid = NAME_RE.test(name) && name.length <= 512;
  const sampleValues = sampleValuesText.split(",").map((item) => item.trim());
  const previewBody = useMemo(() => {
    const values = sampleValuesText.split(",").map((item) => item.trim());
    return bodyText.replace(
      /\{\{(\d+)\}\}/g,
      (token, index) =>
        values[Number(index) - 1] || DEFAULTS[Number(index) - 1] || "Sample",
    );
  }, [bodyText, sampleValuesText]);

  const applyTemplate = (template, { asCopy = false } = {}) => {
    if (!template) return;
    const nextName = String(template.name || "").trim();
    setDraftId(
      asCopy
        ? ""
        : String(
            template.draftId ||
              template._id ||
              (template.isDraft ? template.id : "") ||
              "",
          ),
    );
    setName(asCopy ? `${nextName.replace(/_v\d+$/, "")}_v2` : nextName);
    setCategory(
      String(template.category || "MARKETING").toUpperCase() === "UTILITY"
        ? "UTILITY"
        : "MARKETING",
    );
    setLanguage(template.language || "en_US");
    const type = headerInfo(template);
    setHeaderType(type);
    setHeaderText(
      template.headerText || getComponent(template, "HEADER")?.text || "",
    );
    setHeaderImageUrl(template.headerImageUrl || template.imageUrl || "");
    setHeaderDocumentUrl(
      template.headerDocumentUrl || template.documentUrl || "",
    );
    setHeaderFileName(template.headerFileName || "");
    setBodyText(getTemplateBody(template));
    setFooterText(
      template.footerText || getComponent(template, "FOOTER")?.text || "",
    );
    const nextButtons = getTemplateButtons(template)
      .map((button) => ({ type: "QUICK_REPLY", text: button.text || "" }))
      .slice(0, 3);
    setButtons(nextButtons);
    setSampleValuesText(
      Array.isArray(template.sampleValues)
        ? template.sampleValues.join(", ")
        : "",
    );
  };

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setError("");
      const copyTemplate = location.state?.copyTemplate;
      if (copyTemplate) {
        if (active) applyTemplate(copyTemplate, { asCopy: true });
        return;
      }
      const requestedDraftId = searchParams.get("draftId");
      if (!requestedDraftId) {
        setDraftId("");
        setName("");
        setCategory("MARKETING");
        setLanguage("en_US");
        setHeaderType("none");
        setHeaderText("");
        setHeaderImageUrl("");
        setHeaderDocumentUrl("");
        setHeaderFileName("");
        setBodyText(
          "Hello {{1}}, we have some property options for you at Agarwal Homez. Would you like to see the details?",
        );
        setFooterText("Agarwal Homez");
        setButtons([{ type: "QUICK_REPLY", text: "Book a site visit" }]);
        setSampleValuesText("");
        setShowSampleOverrides(false);
        setNotice("");
        return;
      }
      try {
        const result = await whatsappApi.templateDrafts();
        const drafts = result.data?.drafts || [];
        const draft = drafts.find(
          (item) => String(item._id || item.id) === requestedDraftId,
        );
        if (!draft)
          throw new Error(
            "Draft not found. Refresh the templates list and open it again.",
          );
        if (active) applyTemplate(draft);
      } catch (err) {
        if (active)
          setError(
            err?.response?.data?.message ||
              err.message ||
              "Could not load the draft.",
          );
      }
    };
    initialize();
    return () => {
      active = false;
    };
    // location.key changes only on navigation, including opening a draft/copy action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, searchParams]);

  const isDocumentHeader =
    headerType === "document" ||
    headerType === "brochure" ||
    headerType === "pdf";

  const payload = () => ({
    ...(draftId ? { draftId } : {}),
    name: name.trim(),
    category,
    language,
    headerType: isDocumentHeader ? "document" : headerType,
    headerText: headerType === "text" ? headerText.trim() : "",
    headerImageUrl: headerType === "image" ? headerImageUrl : "",
    headerDocumentUrl: isDocumentHeader ? headerDocumentUrl : "",
    headerFileName: isDocumentHeader ? headerFileName : "",
    bodyText: bodyText.trim(),
    footerText: footerText.trim(),
    buttons: buttons
      .filter((button) => button.text.trim())
      .map((button) => ({ type: "QUICK_REPLY", text: button.text.trim() })),
    sampleValues: sampleValues,
  });

  const saveDraft = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await whatsappApi.saveTemplateDraft(payload());
      const draft = result.data?.draft;
      setDraftId(String(draft?._id || draft?.id || draftId || ""));
      setNotice(
        result.message || "Draft saved. You can continue editing it later.",
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save the draft.");
    } finally {
      setSaving(false);
    }
  };

  const submitForApproval = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    if (!nameValid) {
      setSaving(false);
      setError(
        "Use lowercase letters/numbers and single underscores, e.g. property_offer.",
      );
      return;
    }
    if (!bodyText.trim()) {
      setSaving(false);
      setError("The message body is required.");
      return;
    }
    if (
      maxVariable &&
      variableIndexes.some((value, index) => value !== index + 1)
    ) {
      setSaving(false);
      setError(
        "Variables must be numbered sequentially as {{1}}, {{2}}, {{3}} without gaps.",
      );
      return;
    }
    if (headerType === "text" && !headerText.trim()) {
      setSaving(false);
      setError("Enter header text or choose a different header type.");
      return;
    }
    if (headerType === "image" && !headerImageUrl) {
      setSaving(false);
      setError("Upload an image before submitting an image header.");
      return;
    }
    if (isDocumentHeader && !headerDocumentUrl) {
      setSaving(false);
      setError("Upload a file before submitting a PDF or brochure header.");
      return;
    }
    if (buttons.some((button) => button.text.trim().length > 25)) {
      setSaving(false);
      setError("Each button label must be 25 characters or fewer.");
      return;
    }
    try {
      const result = await whatsappApi.createTemplate(payload());
      navigate("/whatsapp/templates", {
        state: {
          notice: result.message || "Template submitted to Meta for approval.",
        },
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Could not submit the template. Check Meta credentials, the header file, and the template fields.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleHeaderUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (headerType === "image" && (isPdf || !file.type.startsWith("image/"))) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (isDocumentHeader && !isPdf) {
      setError("Choose a PDF file for the PDF or brochure header.");
      return;
    }
    const max = isPdf ? 30 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > max) {
      setError(
        isPdf
          ? "The PDF must be smaller than 30 MB."
          : "The image must be smaller than 5 MB.",
      );
      return;
    }
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const result = await whatsappApi.uploadTemplateHeader(file);
      const uploaded = result.data || {};
      if (!uploaded.url)
        throw new Error("The upload response did not include a file URL.");
      if (isPdf) {
        setHeaderDocumentUrl(uploaded.url);
        setHeaderFileName(uploaded.fileName || file.name);
      } else setHeaderImageUrl(uploaded.url);
      setNotice(
        isPdf
          ? "PDF/brochure uploaded successfully."
          : "Header image uploaded successfully.",
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Header upload failed. Check the Cloudinary configuration.",
      );
    } finally {
      setUploading(false);
    }
  };

  const insertNameVariable = () => {
    const next =
      Math.max(
        0,
        ...[...bodyText.matchAll(/\{\{(\d+)\}\}/g)].map((match) =>
          Number(match[1]),
        ),
      ) + 1;
    setBodyText((value) => `${value}${value.trim() ? "\n" : ""}{{${next}}}`);
  };

  const addButton = () => {
    if (buttons.length >= 3) return;
    setButtons((current) => [...current, { type: "QUICK_REPLY", text: "" }]);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/whatsapp/templates"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-primary"
          >
            <ArrowLeft size={14} /> Templates
          </Link>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">
            Create a WhatsApp Template
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500 dark:text-ink-400">
            Write your template, preview it, and submit it to Meta for approval.
            Once approved, it will be available for bulk messaging.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
          <MessageCircle size={16} /> WhatsApp Cloud API
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
        >
          <X size={17} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <form
        onSubmit={submitForApproval}
        className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-4">
          <section className="card space-y-4 !p-5">
            <div>
              <h2 className="font-display text-lg font-extrabold text-ink-900 dark:text-white">
                Template Details
              </h2>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                Use a unique name. Meta makes the final approval decision.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink-700 dark:text-ink-200">
                Template Name
              </label>
              <input
                className="input-field"
                value={name}
                onChange={(event) => setName(normalizeName(event.target.value))}
                placeholder="property_offer_2026"
                maxLength={512}
                autoComplete="off"
                aria-invalid={Boolean(name) && !nameValid}
                required
              />
              <p
                className={`mt-1.5 text-xs ${name && !nameValid ? "text-red-600" : name ? "text-emerald-700 dark:text-emerald-300" : "text-ink-400"}`}
              >
                {name && !nameValid
                  ? "Use lowercase letters/numbers and single underscores."
                  : name
                    ? "The name format is valid."
                    : "Example: property_offer_2026"}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-ink-700 dark:text-ink-200">
                  Category
                </label>
                <select
                  className="input-field"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="MARKETING">Marketing (offer, launch)</option>
                  <option value="UTILITY">Utility (reminder, update)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-ink-700 dark:text-ink-200">
                  Language
                </label>
                <select
                  className="input-field"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  <option value="hi">Hindi</option>
                  <option value="en_US">English</option>
                </select>
              </div>
            </div>
          </section>

          <section className="card space-y-4 !p-5">
            <div>
              <h2 className="font-display text-lg font-extrabold text-ink-900 dark:text-white">
                Header (Optional)
              </h2>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                The header is optional. Image/PDF files are uploaded first, then
                a sample media handle is provided to Meta.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink-700 dark:text-ink-200">
                Header type
              </label>
              <select
                className="input-field"
                value={headerType}
                onChange={(event) => setHeaderType(event.target.value)}
              >
                <option value="none">None</option>
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="document">PDF</option>
                <option value="brochure">Brochure</option>
              </select>
            </div>
            {headerType === "text" && (
              <div>
                <label className="mb-1.5 block text-sm font-bold text-ink-700 dark:text-ink-200">
                  Header text
                </label>
                <input
                  className="input-field"
                  maxLength={60}
                  value={headerText}
                  onChange={(event) => setHeaderText(event.target.value)}
                  placeholder="Agarwal Homez — Property Update"
                  required
                />
              </div>
            )}
            {(headerType === "image" || isDocumentHeader) && (
              <div className="rounded-xl border border-dashed border-ink-200 p-4 dark:border-ink-700">
                <label className="btn-secondary inline-flex cursor-pointer items-center gap-2">
                  <UploadCloud size={16} />
                  {uploading
                    ? "Uploading…"
                    : headerType === "image"
                      ? "Upload Image"
                      : headerType === "brochure"
                        ? "Upload Brochure"
                        : "Upload PDF"}
                  <input
                    type="file"
                    accept={
                      headerType === "image"
                        ? "image/jpeg,image/png,image/webp"
                        : "application/pdf,.pdf"
                    }
                    className="hidden"
                    disabled={uploading}
                    onChange={handleHeaderUpload}
                  />
                </label>
                <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
                  {headerType === "image"
                    ? "JPG, PNG, or WebP · maximum 5 MB"
                    : "PDF · maximum 30 MB"}
                </p>
                {headerType === "image" && headerImageUrl && (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      Image uploaded successfully
                    </span>
                    <button
                      type="button"
                      onClick={() => setHeaderImageUrl("")}
                      className="text-xs font-bold text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {isDocumentHeader && headerDocumentUrl && (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <FileText size={15} />
                      <span className="truncate">
                        {headerFileName || "Brochure PDF"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderDocumentUrl("");
                        setHeaderFileName("");
                      }}
                      className="text-xs font-bold text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="card space-y-4 !p-5">
            <div>
              <h2 className="font-display text-lg font-extrabold text-ink-900 dark:text-white">
                Message
              </h2>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                Use {"{{1}}"} as the customer's name placeholder so each
                customer sees their own name. Personalization can make messages
                more relevant.
              </p>
            </div>
            <textarea
              className="input-field min-h-36 resize-y"
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              rows={6}
              maxLength={1024}
              placeholder="Hello {{1}}..."
              required
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={insertNameVariable}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Plus size={15} /> Insert Customer Name
              </button>
              <span className="text-xs text-ink-400">
                {bodyText.length}/1,024 characters
              </span>
            </div>
            <details
              open={showSampleOverrides}
              onToggle={(event) =>
                setShowSampleOverrides(event.currentTarget.open)
              }
              className="rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50"
            >
              <summary className="cursor-pointer text-xs font-bold text-ink-700 dark:text-ink-200">
                Optional Sample Value Overrides
              </summary>
              <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
                Sample values are generated automatically for preview (Ayush,
                Kanpur, etc.). Enter comma-separated values to override them.
              </p>
              <input
                className="input-field mt-2"
                value={sampleValuesText}
                onChange={(event) => setSampleValuesText(event.target.value)}
                placeholder="Ayush, Kanpur"
              />
            </details>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink-700 dark:text-ink-200">
                Footer (optional)
              </label>
              <input
                className="input-field"
                value={footerText}
                onChange={(event) => setFooterText(event.target.value)}
                maxLength={60}
                placeholder="Agarwal Homez"
              />
            </div>
          </section>

          <section className="card space-y-4 !p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold text-ink-900 dark:text-white">
                  Buttons (up to 3)
                </h2>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  Quick-reply button labels can contain up to 25 characters.
                </p>
              </div>
              <button
                type="button"
                onClick={addButton}
                disabled={buttons.length >= 3}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Plus size={15} /> Button
              </button>
            </div>
            {buttons.length === 0 && (
              <p className="rounded-lg bg-ink-50 p-3 text-sm text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                No buttons added. Customers can reply directly to the message.
              </p>
            )}
            {buttons.map((button, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-extrabold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                  {index + 1}
                </div>
                <input
                  className="input-field"
                  value={button.text}
                  onChange={(event) =>
                    setButtons((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, text: event.target.value }
                          : item,
                      ),
                    )
                  }
                  maxLength={25}
                  placeholder={
                    index === 0 ? "Book a site visit" : "Button label"
                  }
                  aria-label={`Quick reply button ${index + 1}`}
                />
                <span className="w-8 shrink-0 text-right text-[10px] text-ink-400">
                  {button.text.length}/25
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setButtons((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  aria-label={`Remove button ${index + 1}`}
                  className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </section>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving || uploading}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="submit"
              disabled={saving || uploading || !nameValid}
              className="btn-primary inline-flex items-center gap-2"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}{" "}
              {saving ? "Submitting…" : "Submit for Approval"}
            </button>
          </div>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-5">
          <div className="card !p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold text-ink-900 dark:text-white">
                  Live preview
                </h2>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  Name shown in preview: <strong>Ayush</strong>
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                {category}
              </span>
            </div>
            <WhatsAppPhonePreview
              accountLabel="Business account"
              customerName="Ayush"
              greeting=""
              title={headerType === "text" ? headerText : ""}
              body={previewBody}
              footer={footerText}
              buttons={buttons.filter((button) => button.text.trim())}
              headerImage={headerType === "image" ? headerImageUrl : ""}
              headerDocumentName={
                isDocumentHeader ? headerFileName || "Brochure.pdf" : ""
              }
            />
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
              Remember: Meta Approval Is Required
            </h3>
            <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-300">
              Only templates with an Approved status can be sent in bulk
              campaigns. Button labels, language, and category must comply with
              Meta's policies.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
