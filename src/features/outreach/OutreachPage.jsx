import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  MessageCircle,
  Mail,
  Loader2,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { outreachApi, campaignApi } from "../../api/outreachApi.js";
import {
  useOutreachEvents,
  useOutreachSummaryQuery,
  SUMMARY_KEY,
} from "../../hooks/useOutreachLive.js";
import StatusChip, { fmtDateTime } from "./StatusChip.jsx";
import CampaignCard from "./CampaignCard.jsx";
import CampaignLauncher from "./CampaignLauncher.jsx";

const CAMPAIGNS_KEY = ["outreach", "campaigns"];

const CHANNEL_META = {
  whatsapp: {
    title: "WhatsApp Bulk Messages",
    subtitle:
      "Approved Meta templates ke saath queued sending aur live progress.",
    icon: MessageCircle,
    contact: (job) => job.phone || "—",
  },
  email: {
    title: "Bulk Email",
    subtitle: "Brevo API se queued email campaigns aur live delivery status.",
    icon: Mail,
    contact: (job) => job.email || "—",
  },
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "sent", label: "Sent" },
  { value: "processing", label: "Sending" },
  { value: "pending", label: "In queue" },
  { value: "scheduled", label: "Scheduled" },
  { value: "failed", label: "Failed" },
];

function StatCard({ icon: Icon, label, value, tone, hint }) {
  return (
    <div className="card !p-4">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}
        >
          <Icon size={18} />
        </span>

        <div>
          <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
          <p className="font-display text-xl font-bold text-ink-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>

      {hint && (
        <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">{hint}</p>
      )}
    </div>
  );
}

function normalizeStats(stats) {
  if (!stats || typeof stats !== "object") return null;

  return {
    total: Number(stats.total) || 0,
    sent: Number(stats.sent) || 0,
    failed: Number(stats.failed) || 0,
    pending: Number(stats.pending) || 0,
    processing: Number(stats.processing) || 0,
    paused: Number(stats.paused) || 0,
    scheduled: Number(stats.scheduled) || 0,
    cancelled: Number(stats.cancelled) || 0,
    nextRunAt: stats.nextRunAt || null,
  };
}

export default function OutreachPage({ channel }) {
  const meta = CHANNEL_META[channel];
  const Icon = meta?.icon || Mail;
  const qc = useQueryClient();

  const [filter, setFilter] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [page, setPage] = useState(1);
  const [nowSending, setNowSending] = useState(null);
  const [busy, setBusy] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTemplate = searchParams.get("template") || "";

  const [launchOpen, setLaunchOpen] = useState(
    () => Boolean(initialTemplate) || searchParams.get("new") === "1",
  );

  const closeLauncher = () => {
    setLaunchOpen(false);

    if (searchParams.get("template") || searchParams.get("new")) {
      setSearchParams({}, { replace: true });
    }
  };

  /* ---------------- summary ---------------- */

  const {
    data: summaryAll,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    error: summaryError,
  } = useOutreachSummaryQuery();

  const rawStats = summaryAll?.[channel];
  const stats = normalizeStats(rawStats);

  const s = stats || {
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    processing: 0,
    paused: 0,
    scheduled: 0,
    cancelled: 0,
    nextRunAt: null,
  };

  /* ---------------- campaigns ---------------- */

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: CAMPAIGNS_KEY,
    queryFn: () => campaignApi.list(),
    staleTime: 10_000,
  });

  const campaigns = useMemo(
    () =>
      (campaignsData?.data?.campaigns || []).filter(
        (campaign) => campaign.channels?.[channel],
      ),
    [campaignsData, channel],
  );

  /* ---------------- jobs ---------------- */

  const jobsKey = ["outreach", "jobs", channel, campaignId, filter, page];

  const {
    data: jobsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: jobsKey,
    queryFn: () =>
      outreachApi.jobs({
        channel,
        page,
        limit: 50,
        ...(campaignId ? { campaignId } : {}),
        ...(filter ? { status: filter } : {}),
      }),
    placeholderData: (previousData) => previousData,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const jobs = jobsData?.data?.jobs || [];
  const pagination = jobsData?.data?.pagination;

  /* ---------------- refresh helpers ---------------- */

  const refreshAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    qc.invalidateQueries({ queryKey: ["outreach", "jobs"] });
    qc.invalidateQueries({ queryKey: SUMMARY_KEY });
  }, [qc]);

  /* ---------------- live events ---------------- */

  useOutreachEvents({
    onJob: (payload) => {
      if (!payload || payload.channel !== channel) return;

      if (payload.status === "processing") {
        setNowSending({
          jobId: payload.jobId,
          name: payload.name,
          contact: channel === "email" ? payload.email : payload.phone,
        });
      } else {
        setNowSending((current) =>
          String(current?.jobId) === String(payload.jobId) ? null : current,
        );
      }

      // Update cached job rows immediately.
      qc.setQueriesData({ queryKey: ["outreach", "jobs", channel] }, (old) => {
        if (!old?.data?.jobs) return old;

        return {
          ...old,
          data: {
            ...old.data,
            jobs: old.data.jobs.map((job) =>
              String(job.id) === String(payload.jobId)
                ? {
                    ...job,
                    status: payload.status ?? job.status,
                    attempts: payload.attempts ?? job.attempts,
                    sentAt: payload.sentAt ?? job.sentAt,
                    nextRunAt: payload.nextRunAt ?? job.nextRunAt,
                    lastError: payload.lastError ?? job.lastError,
                    scheduled:
                      payload.status === "pending" && payload.nextRunAt
                        ? new Date(payload.nextRunAt) > new Date()
                        : job.scheduled,
                  }
                : job,
            ),
          },
        };
      });

      // Server remains the source of truth for summary counts.
      qc.invalidateQueries({ queryKey: SUMMARY_KEY });
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },

    onProgress: (payload) => {
      if (!payload?.campaignId) {
        qc.invalidateQueries({ queryKey: SUMMARY_KEY });
        return;
      }

      qc.setQueryData(CAMPAIGNS_KEY, (old) => {
        if (!old?.data?.campaigns) return old;

        return {
          ...old,
          data: {
            ...old.data,
            campaigns: old.data.campaigns.map((campaign) =>
              String(campaign._id) === String(payload.campaignId)
                ? { ...campaign, stats: payload.stats }
                : campaign,
            ),
          },
        };
      });

      qc.invalidateQueries({ queryKey: SUMMARY_KEY });
    },

    onCampaign: refreshAll,
    onReconnect: refreshAll,
  });

  /* ---------------- campaign actions ---------------- */

  const handleAction = async (action, campaign, selectedChannel) => {
    if (
      action === "cancel" &&
      !window.confirm(
        `Cancel "${campaign.name}"? Pending messages nahi jayenge.`,
      )
    ) {
      return;
    }

    if (
      action === "delete" &&
      !window.confirm(
        `"${campaign.name}" campaign ko list se delete karna hai? Active campaign pehle cancel hogi. History permanently erase nahi hogi.`,
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const id = campaign._id;

      if (action === "pause") await campaignApi.pause(id);
      if (action === "resume") await campaignApi.resume(id);
      if (action === "cancel") await campaignApi.cancel(id);

      if (action === "retry") {
        await campaignApi.retryFailed(id, selectedChannel);
      }

      if (action === "delete") {
        await campaignApi.remove(id);

        if (String(campaignId) === String(id)) {
          setCampaignId("");
          setPage(1);
        }
      }

      refreshAll();
    } catch (error) {
      console.error("[Outreach] Campaign action failed:", error);

      window.alert(
        error?.response?.data?.message ||
          error?.message ||
          "Campaign action failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- derived stats ---------------- */

  const queued = s.pending + s.paused;
  const pct = s.total ? Math.round((s.sent / s.total) * 100) : 0;
  const todayDue = s.pending - s.scheduled;

  /* ---------------- render ---------------- */

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink-900 dark:text-white">
            <Icon size={24} className="text-brand-600" />
            {meta?.title || "Outreach"}
          </h1>

          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {meta?.subtitle || "Campaign progress and delivery status."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setLaunchOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Send size={16} />
          Create bulk campaign
        </button>
      </div>

      {/* Sending status banner */}

      <div
        className={`mt-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
          nowSending
            ? "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-100"
            : "border-ink-100 bg-white text-ink-500 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-400"
        }`}
      >
        {nowSending ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>
              Sending to <b>{nowSending.name || "lead"}</b>{" "}
              {nowSending.contact && (
                <span className="opacity-70">({nowSending.contact})</span>
              )}
              …
            </span>
          </>
        ) : s.processing > 0 ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Sending…
          </>
        ) : queued > 0 && s.nextRunAt ? (
          <>
            <Clock size={18} />
            Idle — next batch {fmtDateTime(s.nextRunAt)}
          </>
        ) : (
          <>
            <CheckCircle2 size={18} />
            Nothing is being sent right now
          </>
        )}
      </div>

      {/* Summary status */}

      {summaryLoading && (
        <p className="mt-3 text-sm text-ink-500" role="status">
          Loading outreach summary…
        </p>
      )}

      {summaryError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          Summary load nahi hui: {summaryError.message}
        </p>
      )}

      {!summaryLoading && !summaryError && !rawStats && (
        <p className="mt-3 text-sm text-amber-700" role="status">
          API response mein "{channel}" summary nahi mili. Network tab mein
          /api/outreach/summary ka response check karein.
        </p>
      )}

      {/* Summary cards */}

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Send}
          label="Total"
          value={s.total}
          tone="bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
          hint={`${pct}% complete`}
        />

        <StatCard
          icon={CheckCircle2}
          label="Sent"
          value={s.sent}
          tone="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
        />

        <StatCard
          icon={Clock}
          label="Pending"
          value={queued}
          tone="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          hint={
            s.scheduled
              ? `${s.scheduled} scheduled for later days${
                  todayDue > 0 ? `, ${todayDue} due now` : ""
                }`
              : undefined
          }
        />

        <StatCard
          icon={XCircle}
          label="Failed"
          value={s.failed}
          tone="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
        />
      </div>

      {/* Progress bar */}

      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
        <div
          className="bg-green-500 transition-all duration-500"
          style={{
            width: `${s.total ? (s.sent / s.total) * 100 : 0}%`,
          }}
        />

        <div
          className="bg-red-500 transition-all duration-500"
          style={{
            width: `${s.total ? (s.failed / s.total) * 100 : 0}%`,
          }}
        />
      </div>

      {summaryFetching && !summaryLoading && (
        <p className="mt-1 text-right text-xs text-ink-400">
          Updating summary…
        </p>
      )}

      {/* Campaigns */}

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-white">
            Campaigns
          </h2>

          {campaignId && (
            <button
              type="button"
              className="btn-secondary !px-3 !py-1.5 !text-xs"
              onClick={() => {
                setCampaignId("");
                setPage(1);
              }}
            >
              Show all contacts
            </button>
          )}
        </div>

        {campaignsLoading ? (
          <div className="rounded-xl border border-ink-100 bg-white px-4 py-8 text-center text-sm text-ink-500 dark:border-ink-800 dark:bg-ink-900">
            <Loader2 className="mx-auto animate-spin" />
            Loading campaigns…
          </div>
        ) : campaigns.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign._id}
                campaign={campaign}
                channel={channel}
                selected={String(campaignId) === String(campaign._id)}
                busy={busy}
                onSelect={() => {
                  setCampaignId((current) =>
                    String(current) === String(campaign._id)
                      ? ""
                      : campaign._id,
                  );
                  setPage(1);
                }}
                onAction={handleAction}
                onDelete={(selectedCampaign) =>
                  handleAction("delete", selectedCampaign)
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-ink-200 bg-white px-4 py-8 text-center text-sm text-ink-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-400">
            Abhi koi {channel === "email" ? "email" : "WhatsApp"} campaign nahi
            hai. “Create bulk campaign” se pehli campaign banayein.
          </div>
        )}
      </section>

      {/* Lead-wise jobs */}

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-white">
            Leads{" "}
            {campaignId && (
              <span className="text-sm font-normal text-ink-500">
                (filtered by campaign — click it again to clear)
              </span>
            )}
          </h2>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setFilter(item.value);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filter === item.value
                    ? "bg-brand-600 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500 dark:bg-ink-800 dark:text-ink-400">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">
                  {channel === "email" ? "Email" : "Phone"}
                </th>
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-ink-500"
                  >
                    <Loader2 className="mx-auto animate-spin" />
                  </td>
                </tr>
              )}

              {!isLoading && jobs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-ink-500 dark:text-ink-400"
                  >
                    Abhi is filter mein messages nahi hain. Upload Data se
                    contacts import karein, phir Create bulk campaign se
                    contacts select karein.
                  </td>
                </tr>
              )}

              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className={`border-t border-ink-100 transition-colors dark:border-ink-800 ${
                    job.status === "processing"
                      ? "bg-brand-50 dark:bg-brand-950/30"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-ink-900 dark:text-white">
                    {job.name || "—"}
                  </td>

                  <td className="px-4 py-3 text-ink-600 dark:text-ink-300">
                    {meta.contact(job)}
                  </td>

                  <td className="px-4 py-3 text-ink-500 dark:text-ink-400">
                    {job.dayNumber ? `Day ${job.dayNumber}` : "—"}
                  </td>

                  <td className="px-4 py-3">
                    <StatusChip job={job} />

                    {job.lastError &&
                      (job.status === "failed" ||
                        job.status === "paused" ||
                        job.scheduled) && (
                        <p
                          className="mt-1 max-w-xs truncate text-xs text-red-600 dark:text-red-400"
                          title={job.lastError}
                        >
                          {job.lastError}
                        </p>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm text-ink-500 dark:text-ink-400">
            <span>
              Page {pagination.page} of {pagination.totalPages} ·{" "}
              {pagination.total} leads {isFetching && "· updating…"}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary !px-2.5 !py-1.5"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                className="btn-secondary !px-2.5 !py-1.5"
                disabled={!pagination || page >= pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Campaign launcher */}

      {launchOpen && (
        <CampaignLauncher
          key={channel}
          channel={channel}
          initialTemplate={initialTemplate}
          onClose={closeLauncher}
          onLaunched={refreshAll}
        />
      )}
    </div>
  );
}
