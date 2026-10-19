import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Mail,
  Send,
  Eye,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
} from "lucide-react";
import { audienceApi } from "../../api/audienceApi.js";
import { emailApi } from "../../api/emailApi.js";
import { campaignApi } from "../../api/outreachApi.js";
import { uploadApi } from "../../api/uploadApi.js";

const PRESETS = {
  "Property offer": {
    subject: "Property options within your budget",
    body: "Hello {{name}},\n\nExplore our new property options in {{city}}. If you are interested, we can arrange a site visit.\n\nAgarwal Homez",
  },
  "New launch": {
    subject: "New property launch — {{city}}",
    body: "Hello {{name}},\n\nA new project has launched in {{city}}. Contact us for details or to arrange a site visit.\n\nAgarwal Homez",
  },
  "Diwali offer": {
    subject: "A Special Property Update for You",
    body: "Hello {{name}},\n\nWe have a special update on property options for you. Contact us for details or to arrange a site visit.\n\nAgarwal Homez",
  },
  "Blank template": { subject: "", body: "" },
};

const IMAGE_MAX_BYTES = 25 * 1024 * 1024;
const PDF_MAX_BYTES = 30 * 1024 * 1024;

function unwrapData(response) {
  return response?.data ?? response ?? null;
}

export default function BulkEmailPage() {
  const [audiences, setAudiences] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [audienceId, setAudienceId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [preset, setPreset] = useState("Property offer");
  const [name, setName] = useState("Agarwal Homez email campaign");
  const [subject, setSubject] = useState(PRESETS["Property offer"].subject);
  const [body, setBody] = useState(PRESETS["Property offer"].body);
  const [imageUrl, setImageUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [brochureUrl, setBrochureUrl] = useState("");
  const [brochureName, setBrochureName] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [skip, setSkip] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBrochure, setUploadingBrochure] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("info");
  const [emailStatus, setEmailStatus] = useState(null);
  const [showImage, setShowImage] = useState(false);
  const [showBrochure, setShowBrochure] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const refresh = useCallback(async () => {
    const [
      audienceResponse,
      templateResponse,
      campaignResponse,
      statusResponse,
    ] = await Promise.all([
      audienceApi.list(),
      emailApi.templates(),
      campaignApi.list(),
      emailApi.status(),
    ]);

    setAudiences(
      audienceResponse?.data?.audiences || audienceResponse?.audiences || [],
    );
    setTemplates(
      templateResponse?.data?.templates || templateResponse?.templates || [],
    );
    setCampaigns(
      campaignResponse?.data?.campaigns || campaignResponse?.campaigns || [],
    );
    setEmailStatus(unwrapData(statusResponse));
  }, []);

  useEffect(() => {
    let active = true;
    refresh()
      .catch((error) => {
        if (active) {
          setNotice(
            error?.response?.data?.message ||
              "Could not load data. Please check the backend connection and email settings.",
          );
          setNoticeType("error");
        }
      })
      .finally(() => {
        if (active) setLoadingPage(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!audienceId) {
      setPreview(null);
      setPreviewError("");
      setPreviewLoading(false);
      return undefined;
    }

    let active = true;
    setPreviewLoading(true);
    setPreviewError("");
    campaignApi
      .preview({ audienceId, channel: "email", skipAlreadySent: skip })
      .then((response) => {
        if (active) setPreview(response?.data || null);
      })
      .catch((error) => {
        if (active) {
          setPreview(null);
          setPreviewError(
            error?.response?.data?.message ||
              "Could not calculate the audience email count. Please try again.",
          );
        }
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });

    return () => {
      active = false;
    };
  }, [audienceId, skip]);

  const selectPreset = (value) => {
    const selectedPreset = PRESETS[value];
    setPreset(value);
    setTemplateId("");
    setSubject(selectedPreset.subject);
    setBody(selectedPreset.body);
    setImageUrl("");
    setImageName("");
    setBrochureUrl("");
    setBrochureName("");
    setCtaText("");
    setCtaUrl("");
    setShowImage(false);
    setShowBrochure(false);
    setShowCta(false);
  };

  const chooseTemplate = (id) => {
    if (!id) {
      selectPreset("Blank template");
      return;
    }
    setTemplateId(id);
    const template = templates.find((item) => item._id === id);
    if (!template) return;

    setSubject(template.subject || "");
    setBody(template.body || "");
    setImageUrl(template.imageUrl || "");
    setImageName(template.imageUrl ? "Saved template photo" : "");
    setBrochureUrl(template.brochureUrl || "");
    setBrochureName(template.brochureUrl ? "Saved template brochure.pdf" : "");
    setCtaText(template.ctaText || "");
    setCtaUrl(template.ctaUrl || "");
    setShowImage(Boolean(template.imageUrl));
    setShowBrochure(Boolean(template.brochureUrl));
    setShowCta(Boolean(template.ctaText || template.ctaUrl));
    setPreset("");
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Please select a valid image file for the photo.");
      setNoticeType("error");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setNotice("The photo must be smaller than 25 MB.");
      setNoticeType("error");
      return;
    }

    setUploadingImage(true);
    setNotice("");
    try {
      const response = await uploadApi.image(file, "templates/email");
      const url = response?.data?.url || response?.url;
      if (!url)
        throw new Error("The upload response did not include a file URL.");
      setImageUrl(url);
      setImageName(file.name);
      setShowImage(true);
      setNotice("Photo uploaded successfully.");
      setNoticeType("success");
    } catch (error) {
      setNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Photo upload failed. Please check your Cloudinary settings.",
      );
      setNoticeType("error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleBrochureUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setNotice("Please select a PDF file for the brochure.");
      setNoticeType("error");
      return;
    }
    if (file.size > PDF_MAX_BYTES) {
      setNotice("The brochure PDF must be smaller than 30 MB.");
      setNoticeType("error");
      return;
    }

    setUploadingBrochure(true);
    setNotice("");
    try {
      const response = await uploadApi.document(file, "templates/email");
      const url = response?.data?.url || response?.url;
      if (!url)
        throw new Error("The upload response did not include a PDF URL.");
      setBrochureUrl(url);
      setBrochureName(file.name);
      setShowBrochure(true);
      setNotice("Brochure PDF uploaded successfully.");
      setNoticeType("success");
    } catch (error) {
      setNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Brochure upload failed. Please check your Cloudinary settings.",
      );
      setNoticeType("error");
    } finally {
      setUploadingBrochure(false);
    }
  };

  const launch = async () => {
    if (!audienceId) {
      setNotice("Please select an audience first.");
      setNoticeType("error");
      return;
    }
    if (!subject.trim()) {
      setNotice("An email subject is required.");
      setNoticeType("error");
      return;
    }
    if (!body.trim()) {
      setNotice("An email body is required.");
      setNoticeType("error");
      return;
    }
    if (uploadingImage || uploadingBrochure) {
      setNotice("Please wait for the file upload to finish.");
      setNoticeType("error");
      return;
    }
    if (previewLoading || !preview) {
      setNotice(
        "Please wait for the audience send count to load before starting the campaign.",
      );
      setNoticeType("error");
      return;
    }
    if (Number(preview.final || 0) < 1) {
      setNotice("This audience has no eligible contacts for email delivery.");
      setNoticeType("error");
      return;
    }

    setLoading(true);
    setNotice("");
    try {
      const payload = {
        name: name.trim() || "Agarwal Homez email campaign",
        audienceId,
        skipAlreadySent: skip,
        channels: { whatsapp: false, email: true },
        // Worker sends one job at a time and applies BULK_EMAIL_INTERVAL_MS between sends.
        dailyLimit: 20000,
        emailTemplateId: templateId || undefined,
        emailSubject: subject.trim(),
        emailBody: body.trim(),
        emailImageUrl: imageUrl,
        emailBrochureUrl: brochureUrl,
        emailCtaText: showCta ? ctaText.trim() : "",
        emailCtaUrl: showCta ? ctaUrl.trim() : "",
      };
      const response = await campaignApi.launch(payload);
      const result = response?.data || {};
      setNotice(
        response?.message ||
          `The bulk email campaign has been added to the queue. ${Number(result.queued?.email || preview.final).toLocaleString("en-IN")} emails are queued for processing.`,
      );
      setNoticeType("success");
      await refresh();
    } catch (error) {
      setNotice(
        error?.response?.data?.message ||
          "Could not start the bulk email campaign.",
      );
      setNoticeType("error");
    } finally {
      setLoading(false);
    }
  };

  const insert = (token) => setBody((current) => `${current}${token}`);
  const canLaunch = Boolean(
    audienceId &&
    subject.trim() &&
    body.trim() &&
    preview &&
    Number(preview.final || 0) > 0 &&
    !previewLoading &&
    !loading &&
    !uploadingImage &&
    !uploadingBrochure,
  );
  const previewText = useMemo(
    () =>
      body.replaceAll("{{name}}", "Ayush").replaceAll("{{city}}", "Kanpur") ||
      "(Email body)",
    [body],
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header>
        <p className="text-sm text-ink-500">Email · Campaigns</p>
        <h1 className="font-display text-3xl font-extrabold text-ink-900 dark:text-white">
          Send Bulk Email
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Select an audience, prepare your email, and launch the campaign.
          Emails will be sent one at a time from the queue.
        </p>
      </header>

      {notice && (
        <div
          role={noticeType === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${noticeType === "error" ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200" : noticeType === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-brand-200 bg-brand-50 text-brand-800 dark:bg-brand-950/30 dark:text-brand-200"}`}
        >
          {noticeType === "error" ? (
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          )}
          <span>{notice}</span>
          <button
            type="button"
            className="ml-auto rounded p-1 opacity-70 hover:opacity-100"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="card space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-extrabold text-emerald-800">
                1
              </span>
              <h2 className="font-bold text-ink-900 dark:text-white">
                Who should receive this email?
              </h2>
            </div>
            <label className="block text-sm font-medium text-ink-700 dark:text-ink-200">
              Audience
              <select
                className="input-field mt-1 w-full"
                value={audienceId}
                disabled={loadingPage || loading}
                onChange={(event) => setAudienceId(event.target.value)}
              >
                <option value="">Select an audience</option>
                {audiences.map((audience) => (
                  <option key={audience._id} value={audience._id}>
                    {audience.name} ·{" "}
                    {audience.counts?.total ?? audience.leadIds?.length ?? 0}{" "}
                    contacts
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-start gap-2 text-sm text-ink-700 dark:text-ink-200">
              <input
                type="checkbox"
                className="mt-1"
                checked={skip}
                disabled={loading}
                onChange={(event) => setSkip(event.target.checked)}
              />
              <span>Skip contacts who have already received this email</span>
            </label>
            {audienceId && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-950/20">
                  <div>
                    <p className="text-xs text-ink-500">Total contacts</p>
                    <p className="text-lg font-extrabold">
                      {previewLoading ? "…" : (preview?.total ?? "—")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">
                      Already sent (will be skipped)
                    </p>
                    <p className="text-lg font-extrabold">
                      {previewLoading ? "…" : (preview?.skip ?? "—")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Emails to send</p>
                    <p className="text-lg font-extrabold text-emerald-800 dark:text-emerald-300">
                      {previewLoading ? "…" : (preview?.final ?? "—")}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  Email missing / opt-out:{" "}
                  {previewLoading ? "…" : (preview?.missingContact ?? "—")}
                </p>
                {previewError && (
                  <p
                    role="alert"
                    className="text-xs text-red-600 dark:text-red-300"
                  >
                    {previewError}
                  </p>
                )}
              </div>
            )}
            <label className="block text-sm font-medium text-ink-700 dark:text-ink-200">
              Campaign name
              <input
                className="input-field mt-1 w-full"
                value={name}
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                placeholder="Agarwal Homez property campaign"
              />
            </label>
          </section>

          <section className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-extrabold text-emerald-800">
                  2
                </span>
                <h2 className="font-bold text-ink-900 dark:text-white">
                  Email template
                </h2>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                No approval required
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map((value) => (
                <button
                  type="button"
                  key={value}
                  disabled={loading}
                  onClick={() => selectPreset(value)}
                  className={`rounded-full px-3 py-2 text-sm ${preset === value ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200"}`}
                >
                  {value}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium text-ink-700 dark:text-ink-200">
              Saved template
              <select
                className="input-field mt-1 w-full"
                value={templateId}
                disabled={loadingPage || loading}
                onChange={(event) => chooseTemplate(event.target.value)}
              >
                <option value="">Preset / Blank template</option>
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-ink-700 dark:text-ink-200">
              Subject
              <input
                maxLength={200}
                className="input-field mt-1 w-full"
                value={subject}
                disabled={loading}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="New properties you may like"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <span className="self-center text-xs text-ink-500">Insert:</span>
              {[
                ["Name", "{{name}}"],
                ["City", "{{city}}"],
              ].map(([label, token]) => (
                <button
                  type="button"
                  key={label}
                  disabled={loading}
                  onClick={() => insert(token)}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowImage((value) => !value)}
                className={`btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs ${showImage ? "border-emerald-600" : ""}`}
              >
                <ImageIcon size={14} /> Photo
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowBrochure((value) => !value)}
                className={`btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs ${showBrochure ? "border-emerald-600" : ""}`}
              >
                <FileText size={14} /> Brochure PDF
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowCta((value) => !value)}
                className={`btn-secondary px-3 py-1.5 text-xs ${showCta ? "border-emerald-600" : ""}`}
              >
                Button
              </button>
            </div>

            <label className="block text-sm font-medium text-ink-700 dark:text-ink-200">
              Email body
              <textarea
                rows={9}
                maxLength={5000}
                className="input-field mt-1 w-full resize-y"
                value={body}
                disabled={loading}
                onChange={(event) => setBody(event.target.value)}
                placeholder={
                  "Hello {{name}},\n\nExplore our new property options in {{city}}."
                }
              />
            </label>
            <p className="-mt-2 text-xs text-ink-500">
              Use <code>{"{{name}}"}</code> and <code>{"{{city}}"}</code> for
              personalized values.
            </p>

            {showImage && (
              <div className="rounded-xl border border-dashed border-ink-300 p-3 dark:border-ink-700">
                <p className="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
                  Email photo
                </p>
                <label className="btn-secondary inline-flex cursor-pointer items-center gap-2">
                  {uploadingImage ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <UploadCloud size={15} />
                  )}
                  {uploadingImage
                    ? "Uploading photo…"
                    : imageUrl
                      ? "Upload another photo"
                      : "Upload photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    className="hidden"
                    disabled={uploadingImage || loading}
                    onChange={handleImageUpload}
                  />
                </label>
                <p className="mt-1 text-xs text-ink-500">
                  JPG, PNG, WebP, GIF or AVIF · 25 MB maximum. The photo will be
                  uploaded to secure storage.
                </p>
                {imageUrl && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/20">
                    <img
                      src={imageUrl}
                      alt="Email attachment preview"
                      className="h-14 w-16 rounded object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                        {imageName || "Photo attached"}
                      </p>
                      <p className="text-[11px] text-ink-500">
                        Upload complete
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setImageUrl("");
                        setImageName("");
                      }}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {showBrochure && (
              <div className="rounded-xl border border-dashed border-ink-300 p-3 dark:border-ink-700">
                <p className="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
                  Property brochure PDF
                </p>
                <label className="btn-secondary inline-flex cursor-pointer items-center gap-2">
                  {uploadingBrochure ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <UploadCloud size={15} />
                  )}
                  {uploadingBrochure
                    ? "Uploading PDF…"
                    : brochureUrl
                      ? "Upload another PDF"
                      : "Upload PDF"}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    disabled={uploadingBrochure || loading}
                    onChange={handleBrochureUpload}
                  />
                </label>
                <p className="mt-1 text-xs text-ink-500">
                  PDF only · 30 MB maximum. A secure brochure link will be added
                  to the email automatically.
                </p>
                {brochureUrl && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/20">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-red-600 dark:bg-ink-800">
                      <FileText size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                        {brochureName || "Brochure PDF attached"}
                      </p>
                      <p className="text-[11px] text-ink-500">
                        Upload complete
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setBrochureUrl("");
                        setBrochureName("");
                      }}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {showCta && (
              <div className="grid gap-3 rounded-xl border border-ink-200 p-3 dark:border-ink-700 sm:grid-cols-2">
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-200">
                  Button text
                  <input
                    className="input-field mt-1 w-full"
                    value={ctaText}
                    maxLength={40}
                    disabled={loading}
                    onChange={(event) => setCtaText(event.target.value)}
                    placeholder="Book a site visit"
                  />
                </label>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-200">
                  Button URL
                  <input
                    className="input-field mt-1 w-full"
                    value={ctaUrl}
                    disabled={loading}
                    onChange={(event) => setCtaUrl(event.target.value)}
                    placeholder="https://agarwalhomez.com/…"
                  />
                </label>
              </div>
            )}
          </section>

          <section className="card space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-extrabold text-emerald-800">
                3
              </span>
              <h2 className="font-bold text-ink-900 dark:text-white">Send</h2>
            </div>
            <div className="rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60">
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Sender address
              </p>
              <p className="mt-1 break-all text-sm font-semibold text-ink-900 dark:text-white">
                {emailStatus?.fromAddress ||
                  "Configure the Brevo sender in Settings"}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-ink-500">Eligible emails</p>
                  <p className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-300">
                    {previewLoading
                      ? "…"
                      : Number(preview?.final || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-500">
                    Already sent (will be skipped)
                  </p>
                  <p className="text-2xl font-extrabold text-ink-900 dark:text-white">
                    {previewLoading
                      ? "…"
                      : Number(preview?.skip || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">
              <p className="font-semibold">Bulk sending runs automatically</p>
              <p className="mt-1 text-xs leading-5">
                When you click the button, emails are added to a persistent
                queue. The backend worker sends them one at a time; you do not
                need to keep this page open. An unsubscribe link is
                automatically included in every campaign email.
              </p>
            </div>
            <button
              type="button"
              onClick={launch}
              disabled={!canLaunch}
              className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={17} />
              )}
              {loading
                ? "Adding campaign to the queue…"
                : "Start bulk email campaign"}
            </button>
            {!audienceId && (
              <p className="text-xs text-ink-500">
                Select an audience in Step 1 first.
              </p>
            )}
            {audienceId && (!subject.trim() || !body.trim()) && (
              <p className="text-xs text-ink-500">
                Enter a subject and message in Step 2 before starting the
                campaign.
              </p>
            )}
            {audienceId && preview && Number(preview.final || 0) === 0 && (
              <p className="text-xs text-red-600 dark:text-red-300">
                The selected audience has no eligible email addresses.
              </p>
            )}
          </section>
        </div>

        <aside className="h-fit space-y-4 xl:sticky xl:top-4">
          <section className="card">
            <h2 className="font-bold text-ink-900 dark:text-white">
              <Eye size={16} className="mr-2 inline" />
              Live inbox preview
            </h2>
            <div className="mt-4 rounded-xl border border-ink-200 bg-white p-4 text-ink-900 dark:border-ink-700">
              <p className="text-xs text-ink-500">
                From: {emailStatus?.fromAddress || "Agarwal Homez"}
              </p>
              <p className="mt-1 text-xs text-ink-500">To: Ayush</p>
              <p className="mt-2 break-words font-bold">
                {subject || "(Subject)"}
              </p>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Email photo preview"
                  className="mt-3 max-h-44 w-full rounded-lg object-cover"
                />
              )}
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                {previewText}
              </p>
              {brochureUrl && (
                <p className="mt-3 inline-flex items-center gap-1 text-sm text-blue-700 underline">
                  <FileText size={14} />
                  View property brochure PDF
                </p>
              )}
              {showCta && ctaText && (
                <span className="mt-3 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">
                  {ctaText}
                </span>
              )}
              <p className="mt-4 border-t pt-3 text-xs text-ink-400">
                Unsubscribe
              </p>
            </div>
          </section>
          <section className="card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-ink-900 dark:text-white">
                Recent email campaigns
              </h2>
              <button
                type="button"
                onClick={() =>
                  refresh().catch((error) => {
                    setNotice(
                      error?.response?.data?.message ||
                        "Could not refresh campaigns.",
                    );
                    setNoticeType("error");
                  })
                }
                className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
                aria-label="Refresh campaigns"
              >
                <RefreshCw size={15} />
              </button>
            </div>
            {loadingPage ? (
              <p className="mt-3 text-sm text-ink-500">Loading campaigns…</p>
            ) : (
              campaigns
                .filter((campaign) => campaign.channels?.email)
                .slice(0, 5)
                .map((campaign) => (
                  <div
                    key={campaign._id}
                    className="mt-3 border-b border-ink-100 pb-3 last:border-0 dark:border-ink-800"
                  >
                    <p className="font-medium text-ink-900 dark:text-white">
                      {campaign.name}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {campaign.status} · {campaign.totalLeads} contacts
                    </p>
                  </div>
                ))
            )}
            {!loadingPage &&
              campaigns.filter((campaign) => campaign.channels?.email)
                .length === 0 && (
                <p className="mt-3 text-sm text-ink-500">
                  No email campaigns yet.
                </p>
              )}
          </section>
        </aside>
      </div>
    </div>
  );
}
