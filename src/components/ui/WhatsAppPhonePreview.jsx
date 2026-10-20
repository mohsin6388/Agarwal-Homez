import {
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Phone,
  Video,
} from "lucide-react";

/** Reusable WhatsApp-style message preview for campaign and template screens. */
export default function WhatsAppPhonePreview({
  businessName = "Agarwal Homez",
  accountLabel = "Business account",
  customerName = "Ayush",
  greeting = "Namaste {{name}} ji,",
  title = "",
  body = "Aapki property requirement mein madad ke liye hum yahan hain.",
  footer = "",
  buttons = [],
  headerImage = "",
  headerDocumentName = "",
  timestamp = "9:41 AM",
  className = "",
}) {
  const personalize = (value = "") =>
    String(value).replace(/\{\{\s*name\s*\}\}|\{\{1\}\}/gi, customerName);

  return (
    <section
      className={`mx-auto w-full max-w-[320px] rounded-[2rem] border-[5px] border-phone-frame bg-phone-canvas p-2 shadow-elevated ${className}`.trim()}
      aria-label="WhatsApp message preview"
    >
      <div className="overflow-hidden rounded-[1.5rem] bg-phone-wallpaper">
        <div className="flex items-center gap-2.5 bg-phone-header px-3 py-3 text-white">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-extrabold">
            AH
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{businessName}</p>
            <p className="text-[10px] text-white/75">{accountLabel}</p>
          </div>
          <Video size={17} aria-hidden="true" />
          <Phone size={15} aria-hidden="true" />
          <MoreVertical size={17} aria-hidden="true" />
        </div>

        <div className="min-h-[300px] space-y-3 bg-[#eee7dd] px-3 py-4 [background-image:radial-gradient(#d9d0c4_0.7px,transparent_0.7px)] [background-size:13px_13px]">
          <div className="ml-auto max-w-[94%] rounded-xl rounded-tr-sm bg-phone-bubble px-3 py-2.5 text-[12px] leading-[1.55] text-phone-bubble-text shadow-sm">
            {headerImage ? (
              <img
                src={headerImage}
                alt="Template header"
                className="mb-2 max-h-40 w-full rounded-lg object-cover"
              />
            ) : headerDocumentName ? (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-phone-document p-2.5">
                <FileText
                  size={25}
                  className="shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words text-[11px] font-semibold">
                  {headerDocumentName}
                </span>
              </div>
            ) : null}
            {title && (
              <p className="mb-1 whitespace-pre-wrap font-extrabold text-[13px] leading-snug">
                {personalize(title)}
              </p>
            )}
            {greeting && (
              <p className="font-semibold">{personalize(greeting)}</p>
            )}
            {body && (
              <p className="mt-1 whitespace-pre-wrap">{personalize(body)}</p>
            )}
            {footer && (
              <p className="mt-2 text-[10px] text-phone-footer">
                {personalize(footer)}
              </p>
            )}
            <p className="mt-1 text-right text-[9px] text-phone-muted">
              {timestamp} <span aria-label="Message sent">✓✓</span>
            </p>
          </div>

          {buttons.length > 0 && (
            <div className="ml-auto max-w-[94%] space-y-1.5">
              {buttons.slice(0, 3).map((button, index) => {
                const label = typeof button === "string" ? button : button.text;
                return (
                  <div
                    key={`${label}-${index}`}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-center text-[11px] font-bold text-phone-button shadow-sm"
                  >
                    {label?.toLowerCase().includes("photo") ? (
                      <ImageIcon size={13} aria-hidden="true" />
                    ) : null}
                    {personalize(label || "")}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
