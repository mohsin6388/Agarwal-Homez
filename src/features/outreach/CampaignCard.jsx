// import { Pause, Play, Ban, RotateCcw, CalendarClock } from "lucide-react";
// import { fmtDateTime } from "./StatusChip.jsx";

// const STATUS_STYLE = {
//   active:
//     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
//   paused:
//     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
//   completed:
//     "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200",
//   cancelled: "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400",
// };

// function ChannelBar({ label, s, color }) {
//   const done = s.sent + s.failed + s.cancelled;
//   const pct = s.total ? Math.round((done / s.total) * 100) : 0;
//   const sentPct = s.total ? (s.sent / s.total) * 100 : 0;
//   const failPct = s.total ? (s.failed / s.total) * 100 : 0;
//   return (
//     <div>
//       <div className="mb-1 flex items-center justify-between text-xs text-ink-600 dark:text-ink-300">
//         <span className="font-medium">{label}</span>
//         <span>
//           {s.sent}/{s.total} sent · {pct}%
//         </span>
//       </div>
//       <div className="flex h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
//         <div
//           className={`${color} transition-all duration-500`}
//           style={{ width: `${sentPct}%` }}
//         />
//         <div
//           className="bg-red-500 transition-all duration-500"
//           style={{ width: `${failPct}%` }}
//         />
//       </div>
//     </div>
//   );
// }

// /** The card appears on one outreach page, while the other channel is shown in a compact view. */
// export default function CampaignCard({
//   campaign,
//   channel,
//   selected,
//   onSelect,
//   onAction,
//   busy,
// }) {
//   const c = campaign;
//   const wa = c.stats.whatsapp;
//   const em = c.stats.email;
//   const failed =
//     (c.channels.whatsapp ? wa.failed : 0) + (c.channels.email ? em.failed : 0);
//   const canPause = c.status === "active";
//   const canResume = c.status === "paused";
//   const canCancel = c.status === "active" || c.status === "paused";

//   return (
//     <div
//       className={`rounded-xl border p-4 transition ${
//         selected
//           ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/30"
//           : "border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900"
//       }`}
//     >
//       <div className="flex flex-wrap items-start justify-between gap-2">
//         <button onClick={onSelect} className="text-left">
//           <p className="font-display font-semibold text-ink-900 dark:text-white">
//             {c.name}
//           </p>
//           <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500 dark:text-ink-400">
//             <span>{c.totalLeads} leads</span>
//             <span className="inline-flex items-center gap-1">
//               <CalendarClock size={12} />
//               {c.dailyLimit > 0
//                 ? `${c.dailyLimit}/day at ${c.sendTime} · ${c.totalDays} day${c.totalDays > 1 ? "s" : ""}`
//                 : "All at once"}
//             </span>
//             {c.lastRunAt && c.dailyLimit > 0 && (
//               <span>Last batch: {fmtDateTime(c.lastRunAt)}</span>
//             )}
//           </p>
//         </button>
//         <span
//           className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLE[c.status]}`}
//         >
//           {c.status}
//         </span>
//       </div>

//       <div className="mt-3 space-y-2.5">
//         {c.channels.whatsapp && (
//           <ChannelBar label="WhatsApp" s={wa} color="bg-green-500" />
//         )}
//         {c.channels.email && (
//           <ChannelBar label="Email" s={em} color="bg-brand-500" />
//         )}
//         {c.channels.email && c.leadsWithoutEmail > 0 && (
//           <p className="text-xs text-ink-500 dark:text-ink-400">
//             {c.leadsWithoutEmail} lead(s) did not have an email address, so they
//             were contacted only via WhatsApp.
//           </p>
//         )}
//       </div>

//       <div className="mt-3 flex flex-wrap gap-2">
//         {canPause && (
//           <button
//             disabled={busy}
//             onClick={() => onAction("pause", c)}
//             className="btn-secondary !px-3 !py-1.5 !text-xs"
//           >
//             <Pause size={13} className="mr-1.5" /> Pause
//           </button>
//         )}
//         {canResume && (
//           <button
//             disabled={busy}
//             onClick={() => onAction("resume", c)}
//             className="btn-secondary !px-3 !py-1.5 !text-xs"
//           >
//             <Play size={13} className="mr-1.5" /> Resume
//           </button>
//         )}
//         {failed > 0 && (
//           <button
//             disabled={busy}
//             onClick={() => onAction("retry", c, channel)}
//             className="btn-secondary !px-3 !py-1.5 !text-xs"
//           >
//             <RotateCcw size={13} className="mr-1.5" /> Retry {failed} failed
//           </button>
//         )}
//         {canCancel && (
//           <button
//             disabled={busy}
//             onClick={() => onAction("cancel", c)}
//             className="btn-secondary !px-3 !py-1.5 !text-xs !text-red-600"
//           >
//             <Ban size={13} className="mr-1.5" /> Cancel
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }

import {
  Pause,
  Play,
  Ban,
  RotateCcw,
  CalendarClock,
  Users,
} from "lucide-react";
import { fmtDateTime } from "./StatusChip.jsx";

const STATUS_STYLE = {
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  paused:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

function ChannelBar({ label, s, color }) {
  const total = s?.total || 0;
  const sent = s?.sent || 0;
  const failed = s?.failed || 0;
  const cancelled = s?.cancelled || 0;

  const done = sent + failed + cancelled;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-gray-700 dark:text-gray-200">
          {label}
        </span>

        <span className="font-medium text-gray-600 dark:text-gray-300">
          {sent}/{total} sent · {pct}%
        </span>
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className={`${color} transition-all duration-500`}
          style={{ width: `${total ? (sent / total) * 100 : 0}%` }}
        />
        <div
          className="bg-red-500 transition-all duration-500"
          style={{ width: `${total ? (failed / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

export default function CampaignCard({
  campaign,
  channel,
  selected,
  onSelect,
  onAction,
  busy,
}) {
  const c = campaign;
  const wa = c.stats?.whatsapp || {};
  const em = c.stats?.email || {};

  const channelStats = channel === "email" ? em : wa;
  const recipientCount = channelStats.total ?? c.totalLeads ?? 0;

  const failed =
    (c.channels?.whatsapp ? wa.failed || 0 : 0) +
    (c.channels?.email ? em.failed || 0 : 0);

  const canPause = c.status === "active";
  const canResume = c.status === "paused";
  const canCancel = canPause || canResume;

  const handleCardKeyDown = (event) => {
    // Keyboard selection works when the card itself is focused.
    if (
      event.target === event.currentTarget &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      onSelect?.();
    }
  };

  const handleCardClick = (event) => {
    // Keep action buttons independent from the card selection.
    if (event.target.closest("button")) return;
    onSelect?.();
  };

  return (
    <div
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      aria-label={`Select campaign ${c.name}`}
      className={`group relative rounded-2xl border p-3 sm:p-4
        cursor-pointer outline-none
        transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-lg
        focus-visible:ring-2 focus-visible:ring-brand-500
        ${
          selected
            ? "border-brand-500 bg-brand-50 shadow-md ring-1 ring-brand-200 dark:border-brand-500 dark:bg-brand-950/40 dark:ring-brand-800"
            : "border-gray-200 bg-white shadow-sm hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-700"
        }`}
    >
      {/* Campaign title and status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-bold leading-6 text-gray-900 dark:text-white sm:text-base">
            {c.name}
          </h3>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {channel === "email" ? "Email campaign" : "WhatsApp campaign"}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLE[c.status] || STATUS_STYLE.cancelled}`}
        >
          {c.status}
        </span>
      </div>

      {/* Campaign information */}
      <div className="mt-4 grid grid-cols-1 gap-2.5">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-gray-800/80">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Recipients
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm dark:bg-gray-700 dark:text-brand-300">
            <Users size={13} />
            {recipientCount} leads
          </span>
        </div>

        {/* <div className="flex items-start gap-2.5 rounded-xl border border-gray-100 px-3 py-2.5 dark:border-gray-700">
          <CalendarClock
            size={15}
            className="mt-0.5 shrink-0 text-gray-500 dark:text-gray-400"
          />

          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
              Sending schedule
            </p>

            <p className="mt-1 break-words text-xs leading-5 text-gray-500 dark:text-gray-400">
              {c.dailyLimit > 0
                ? `${c.dailyLimit} messages/day · ${c.sendTime || "Time not set"} · ${c.totalDays} day${c.totalDays === 1 ? "" : "s"}`
                : "All at once"}
            </p>
          </div>
        </div> */}

        {c.lastRunAt && c.dailyLimit > 0 && (
          <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
            Last batch: {fmtDateTime(c.lastRunAt)}
          </p>
        )}
      </div>

      {/* Delivery progress */}
      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-700">
        {c.channels?.whatsapp && (
          <ChannelBar label="WhatsApp" s={wa} color="bg-green-500" />
        )}

        {c.channels?.email && (
          <ChannelBar label="Email" s={em} color="bg-blue-500" />
        )}
      </div>

      {c.channels?.email && c.leadsWithoutEmail > 0 && (
        <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">
          {c.leadsWithoutEmail} lead(s) had no email address.
        </p>
      )}

      {/* Actions: clicking these must not toggle the card */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.();
          }}
          aria-pressed={selected}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            selected
              ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          <Users size={13} />
          {selected ? "Hide recipients" : `View leads (${recipientCount})`}
        </button>

        {canPause && (
          <button
            type="button"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              onAction("pause", c);
            }}
            className="btn-secondary !px-3 !py-2 !text-xs"
          >
            <Pause size={13} className="mr-1" />
            Pause
          </button>
        )}

        {canResume && (
          <button
            type="button"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              onAction("resume", c);
            }}
            className="btn-secondary !px-3 !py-2 !text-xs"
          >
            <Play size={13} className="mr-1" />
            Resume
          </button>
        )}

        {failed > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              onAction("retry", c, channel);
            }}
            className="btn-secondary !px-3 !py-2 !text-xs"
          >
            <RotateCcw size={13} className="mr-1" />
            Retry {failed} failed
          </button>
        )}

        {canCancel && (
          <button
            type="button"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              onAction("cancel", c);
            }}
            className="btn-secondary !px-3 !py-2 !text-xs !text-red-600"
          >
            <Ban size={13} className="mr-1" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
