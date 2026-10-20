// import { FileText, Image as ImageIcon, MoreVertical, Phone, Video } from 'lucide-react';

// /** Reusable WhatsApp-style message preview for campaign and template screens. */
// export default function WhatsAppPhonePreview({
//   businessName = 'Agarwal Homez',
//   accountLabel = 'Business account',
//   customerName = 'Ayush',
//   greeting = 'Namaste {{name}} ji,',
//   title = '',
//   body = 'Aapki property requirement mein madad ke liye hum yahan hain.',
//   footer = '',
//   buttons = [],
//   headerImage = '',
//   headerDocumentName = '',
//   timestamp = '9:41 AM',
//   className = '',
// }) {
//   const personalize = (value = '') => String(value).replace(/\{\{\s*name\s*\}\}|\{\{1\}\}/gi, customerName);

//   return (
//     <section className={`mx-auto w-full max-w-[320px] rounded-[2rem] border-[5px] border-phone-frame bg-phone-canvas p-2 shadow-elevated ${className}`.trim()} aria-label="WhatsApp message preview">
//       <div className="overflow-hidden rounded-[1.5rem] bg-phone-wallpaper">
//         <div className="flex items-center gap-2.5 bg-phone-header px-3 py-3 text-white">
//           <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-extrabold">AH</span>
//           <div className="min-w-0 flex-1">
//             <p className="truncate text-sm font-bold">{businessName}</p>
//             <p className="text-[10px] text-white/75">{accountLabel}</p>
//           </div>
//           <Video size={17} aria-hidden="true" />
//           <Phone size={15} aria-hidden="true" />
//           <MoreVertical size={17} aria-hidden="true" />
//         </div>

//         <div className="min-h-[300px] space-y-3 bg-wa-wallpaper bg-[length:24px_24px] px-3 py-4">
//           <div className="ml-auto max-w-[94%] rounded-xl rounded-tr-sm bg-phone-bubble px-3 py-2.5 text-[12px] leading-[1.55] text-phone-bubble-text shadow-sm">
//             {headerImage ? (
//               <img src={headerImage} alt="Template header" className="mb-2 max-h-32 w-full rounded-lg object-cover" />
//             ) : headerDocumentName ? (
//               <div className="mb-2 flex items-center gap-2 rounded-lg bg-phone-document p-2.5">
//                 <FileText size={25} className="shrink-0 text-primary" aria-hidden="true" />
//                 <span className="min-w-0 break-words text-[11px] font-semibold">{headerDocumentName}</span>
//               </div>
//             ) : null}
//             {title && <p className="mb-1 font-extrabold">{personalize(title)}</p>}
//             {greeting && <p className="font-semibold">{personalize(greeting)}</p>}
//             {body && <p className="mt-1 whitespace-pre-wrap">{personalize(body)}</p>}
//             {footer && <p className="mt-2 text-[10px] text-phone-footer">{personalize(footer)}</p>}
//             <p className="mt-1 text-right text-[9px] text-phone-muted">{timestamp} <span aria-label="Message sent">✓✓</span></p>
//           </div>

//           {buttons.length > 0 && (
//             <div className="ml-auto max-w-[94%] space-y-1.5">
//               {buttons.slice(0, 3).map((button, index) => {
//                 const label = typeof button === 'string' ? button : button.text;
//                 return (
//                   <div key={`${label}-${index}`} className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-center text-[11px] font-bold text-phone-button shadow-sm">
//                     {label?.toLowerCase().includes('photo') ? <ImageIcon size={13} aria-hidden="true" /> : null}
//                     {personalize(label || '')}
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </div>
//       </div>
//     </section>
//   );
// }

import {
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Phone,
  Video,
  CheckCheck,
  ArrowLeft,
} from "lucide-react";

/** Reusable WhatsApp-style preview for template builder and campaign screens. */
export default function WhatsAppPhonePreview({
  businessName = "Agarwal Homez",
  accountLabel = "Business account",
  customerName = "Ayush",
  greeting = "",
  title = "",
  body = "Aapki property requirement mein madad ke liye hum yahan hain.",
  footer = "",
  buttons = [],
  headerImage = "",
  headerDocumentName = "",
  timestamp = "10:30 AM",
  className = "",
}) {
  const personalize = (value = "") =>
    String(value)
      .replace(/\{\{\s*name\s*\}\}|\{\{1\}\}/gi, customerName)
      .replace(/\{\{2\}\}/g, "Noida")
      .replace(/\{\{3\}\}/g, "Property");

  return (
    <section
      className={`mx-auto w-full max-w-[340px] rounded-[2rem] border-[5px] border-slate-950 bg-slate-950 p-1.5 shadow-xl ${className}`.trim()}
      aria-label="WhatsApp message preview"
    >
      <div className="overflow-hidden rounded-[1.55rem] bg-[#efe9df]">
        <div className="flex items-center justify-between bg-[#075e54] px-3 pb-2 pt-2 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <ArrowLeft size={17} aria-hidden="true" />
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-extrabold">
              AH
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold">{businessName}</p>
              <p className="text-[9px] text-white/75">{accountLabel}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Video size={16} aria-hidden="true" />
            <Phone size={15} aria-hidden="true" />
            <MoreVertical size={16} aria-hidden="true" />
          </div>
        </div>

        <div className="flex items-center justify-center border-b border-[#ded6ca] bg-[#e9e1d6] py-2">
          <span className="rounded-md bg-white/90 px-2.5 py-1 text-[9px] font-medium text-slate-500 shadow-sm">
            TODAY
          </span>
        </div>

        <div className="min-h-[320px] space-y-3 bg-[#eee7dd] px-3 py-4 [background-image:radial-gradient(#d9d0c4_0.7px,transparent_0.7px)] [background-size:13px_13px]">
          <div className="ml-auto max-w-[96%] rounded-xl rounded-tr-sm bg-white px-3 py-2.5 text-[12px] leading-[1.55] text-slate-800 shadow-sm">
            {headerImage ? (
              <img
                src={headerImage}
                alt="Template header"
                className="mb-2 max-h-36 w-full rounded-lg object-cover"
              />
            ) : headerDocumentName ? (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-100 p-2.5">
                <FileText
                  size={24}
                  className="shrink-0 text-slate-600"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words text-[11px] font-semibold">
                  {headerDocumentName}
                </span>
              </div>
            ) : null}

            {title ? (
              <p className="mb-1 whitespace-pre-wrap font-bold">
                {personalize(title)}
              </p>
            ) : null}
            {greeting ? (
              <p className="whitespace-pre-wrap font-semibold">
                {personalize(greeting)}
              </p>
            ) : null}
            {body ? (
              <p className="mt-1 whitespace-pre-wrap break-words">
                {personalize(body)}
              </p>
            ) : null}
            {footer ? (
              <p className="mt-2 whitespace-pre-wrap text-[10px] text-slate-500">
                {personalize(footer)}
              </p>
            ) : null}
            <p className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-400">
              {timestamp}
              <CheckCheck
                size={12}
                className="text-sky-500"
                aria-label="Read"
              />
            </p>
          </div>

          {buttons.length > 0 && (
            <div className="ml-auto max-w-[96%] space-y-1.5">
              {buttons.slice(0, 3).map((button, index) => {
                const label = typeof button === "string" ? button : button.text;
                return (
                  <div
                    key={`${label}-${index}`}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-center text-[11px] font-semibold text-[#075e54] shadow-sm"
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

        <div className="flex items-center gap-2 bg-[#f7f5f1] px-2.5 py-2">
          <div className="flex h-9 min-w-0 flex-1 items-center rounded-full border border-slate-200 bg-white px-3 text-[11px] text-slate-400">
            Type a message...
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#128c7e] text-white">
            <Phone size={14} className="rotate-[-35deg]" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
