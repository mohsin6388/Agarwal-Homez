import {
  CheckCheck,
  ChevronLeft,
  ExternalLink,
  Phone,
  Reply,
} from "lucide-react";

/**
 * Phone-style WhatsApp preview used while creating a template and before a
 * bulk send. Pass either a Meta template (`template.components`) or the raw
 * parts (header / body / footer / buttons). `{{1}}`, `{{2}}`… are filled from
 * `values`; anything without a value stays visible as {{n}} so it is noticed.
 */
export function partsFromTemplate(template) {
  const components = template?.components || [];
  const find = (type) =>
    components.find((item) => String(item.type).toUpperCase() === type);
  const header = find("HEADER");
  const buttons = find("BUTTONS")?.buttons || [];
  return {
    headerText:
      String(header?.format || "TEXT").toUpperCase() === "TEXT"
        ? header?.text || ""
        : "",
    headerFormat: String(header?.format || "").toUpperCase(),
    imageUrl: template?.imageUrl || "",
    body: find("BODY")?.text || template?.bodyText || "",
    footer: find("FOOTER")?.text || "",
    buttons: buttons.map((b) => ({
      text: b.text,
      type: String(b.type || "").toUpperCase(),
    })),
  };
}

function fill(text, values = []) {
  return String(text || "").replace(/\{\{\s*(\d+)\s*\}\}/g, (whole, n) => {
    const value = values[Number(n) - 1];
    return value != null && String(value).trim() !== "" ? String(value) : whole;
  });
}

// WhatsApp formatting: *bold*, _italic_, ~strike~
export function Formatted({ text }) {
  const parts = String(text || "").split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g);
  return parts.map((part, i) => {
    if (/^\*[^*]+\*$/.test(part))
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    if (/^_[^_]+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    if (/^~[^~]+~$/.test(part)) return <s key={i}>{part.slice(1, -1)}</s>;
    return <span key={i}>{part}</span>;
  });
}

export default function WhatsAppPreview({
  businessName = "Agarwal Homez",
  headerText = "",
  headerFormat = "",
  imageUrl = "",
  body = "",
  footer = "",
  buttons = [],
  values = [],
  caption,
  time = "10:30 am",
  className = "",
}) {
  const bodyText = fill(body, values);
  const unfilled =
    /\{\{\s*\d+\s*\}\}/.test(bodyText) ||
    /\{\{\s*\d+\s*\}\}/.test(fill(headerText, values));
  const needsImage = headerFormat === "IMAGE" || Boolean(imageUrl);
  return (
    <div className={className}>
      <div className="mx-auto w-full max-w-[330px] rounded-[2rem] border-[6px] border-ink-900 bg-ink-900 shadow-xl dark:border-ink-700">
        <div className="overflow-hidden rounded-[1.6rem]">
          <div className="flex items-center gap-2 bg-[#075E54] px-3 py-2.5 text-white">
            <ChevronLeft size={18} aria-hidden="true" />
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              {businessName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {businessName}
              </span>
              <span className="block text-[10px] text-white/75">
                Business account
              </span>
            </span>
            <Phone size={16} aria-hidden="true" />
          </div>
          <div
            className="min-h-[300px] bg-[#ECE5DD] px-2.5 py-3"
            style={{
              backgroundImage:
                "radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)",
              backgroundSize: "14px 14px",
            }}
          >
            <p className="mx-auto mb-3 w-fit rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              TODAY
            </p>
            <div className="max-w-[92%] rounded-lg rounded-tl-none bg-white shadow-sm">
              {needsImage &&
                (imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Template header"
                    className="max-h-44 w-full rounded-t-lg object-cover p-1"
                  />
                ) : (
                  <div className="m-1 flex h-28 items-center justify-center rounded-md bg-slate-200 text-[11px] text-slate-500">
                    Header image
                  </div>
                ))}
              <div className="px-2.5 pb-1.5 pt-2 text-[13px] leading-[1.4] text-[#111B21]">
                {headerText && !needsImage && (
                  <p className="mb-1 font-bold">
                    <Formatted text={fill(headerText, values)} />
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">
                  {bodyText ? (
                    <Formatted text={bodyText} />
                  ) : (
                    <span className="text-slate-400">
                      Your message will appear here…
                    </span>
                  )}
                </p>
                {footer && (
                  <p className="mt-1 text-[11px] text-slate-500">{footer}</p>
                )}
                <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                  {time}{" "}
                  <CheckCheck
                    size={13}
                    className="text-sky-500"
                    aria-hidden="true"
                  />
                </p>
              </div>
              {buttons.length > 0 && (
                <div className="border-t border-slate-100">
                  {buttons.slice(0, 3).map((button, i) => (
                    <div
                      key={`${button.text}-${i}`}
                      className="flex items-center justify-center gap-1.5 border-b border-slate-100 py-2 text-[13px] font-medium text-[#00A5F4] last:border-0"
                    >
                      {button.type === "URL" ? (
                        <ExternalLink size={13} />
                      ) : button.type === "PHONE_NUMBER" ? (
                        <Phone size={13} />
                      ) : (
                        <Reply size={13} />
                      )}
                      {button.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {(caption || unfilled) && (
        <p className="mt-2 text-center text-[11px] text-ink-500 dark:text-ink-400">
          {unfilled
            ? "The value for each customer will appear wherever {{1}} is used."
            : caption}
        </p>
      )}
    </div>
  );
}
