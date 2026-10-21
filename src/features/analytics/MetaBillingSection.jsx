import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  AlertTriangle,
  IndianRupee,
  Info,
  Loader2,
  MessageCircle,
  RefreshCw,
  Receipt,
  Gift,
} from "lucide-react";
import { analyticsApi } from "../../api/analyticsApi.js";

const RANGES = [
  { value: "this_month", label: "Is mahine" },
  { value: "last_month", label: "Pichhla mahina" },
  { value: "30d", label: "30 din" },
  { value: "7d", label: "7 din" },
];

const CATEGORY = {
  MARKETING: {
    label: "Marketing",
    note: "Offer / bulk templates",
    tone: "bg-orange-500",
  },
  UTILITY: {
    label: "Utility",
    note: "Reminder, update templates",
    tone: "bg-sky-500",
  },
  AUTHENTICATION: {
    label: "Authentication",
    note: "OTP",
    tone: "bg-violet-500",
  },
  AUTHENTICATION_INTERNATIONAL: {
    label: "Authentication (intl)",
    note: "OTP bahar ke number",
    tone: "bg-violet-400",
  },
  SERVICE: {
    label: "Service",
    note: "AI / aapke chat reply",
    tone: "bg-emerald-500",
  },
  REFERRAL_CONVERSION: {
    label: "Ad se aaye (free)",
    note: "Click-to-WhatsApp",
    tone: "bg-teal-500",
  },
};

function money(value, currency = "INR") {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: value < 100 ? 2 : 0,
    }).format(value);
  } catch {
    return `₹${Number(value).toLocaleString("en-IN")}`;
  }
}
const count = (n) => Number(n || 0).toLocaleString("en-IN");

function Tile({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="rounded-xl border border-ink-100 p-3.5 dark:border-ink-800">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}
        >
          <Icon size={16} />
        </span>
        <p className="text-xs font-medium text-ink-500 dark:text-ink-400">
          {label}
        </p>
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-ink-900 dark:text-white">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-400">{hint}</p>}
    </div>
  );
}

/** Dashboard → "Meta WhatsApp खर्च": Meta's approximate charges, by category, day and campaign. */
export default function MetaBillingSection() {
  const [range, setRange] = useState("this_month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await analyticsApi.metaBilling({ range });
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Meta ka usage load nahi hua.");
    } finally {
      setLoading(false);
    }
  }, [range]);
  useEffect(() => {
    load();
  }, [load]);

  const currency = data?.currency || "INR";
  const totals = data?.totals || {};
  const maxCategoryCost = Math.max(
    1,
    ...(data?.byCategory || []).map((c) => c.cost || 0),
  );
  const tier = data?.serviceFreeTier;
  const tierPct = tier
    ? Math.min(100, Math.round((tier.used / Math.max(1, tier.limit)) * 100))
    : 0;
  const problem = error || data?.error;

  return (
    <section
      className="card min-w-0 !p-4 sm:!p-5"
      aria-labelledby="meta-billing-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Receipt size={19} className="text-brand-600" />
            <h2
              id="meta-billing-title"
              className="font-display text-lg font-bold text-ink-900 dark:text-white"
            >
              Meta WhatsApp खर्च
            </h2>
          </div>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            Meta ke hisaab se kitne message gaye aur kitna charge banega
            (andaazan).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-xl bg-ink-50 p-1 dark:bg-ink-800">
            {RANGES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setRange(item.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${range === item.value ? "bg-white text-brand-700 shadow-sm dark:bg-ink-700 dark:text-white" : "text-ink-500 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-secondary !px-2.5 !py-2"
            aria-label="Refresh Meta usage"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex h-40 items-center justify-center gap-2 text-sm text-ink-400">
          <Loader2 size={18} className="animate-spin" /> Meta se data aa raha
          hai…
        </div>
      ) : problem ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          <span>{problem}</span>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              icon={IndianRupee}
              label="Andaazan Meta charge"
              value={data.costAvailable ? money(totals.cost, currency) : "—"}
              hint={
                data.costAvailable
                  ? data.period?.label
                  : "Partner credit line par cost nahi milta"
              }
              tone="bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300"
            />
            <Tile
              icon={MessageCircle}
              label="Chargeable messages"
              value={count(totals.chargedVolume)}
              hint={
                totals.chargedVolume && data.costAvailable
                  ? `Avg ${money(totals.cost / totals.chargedVolume, currency)} / message`
                  : "Template messages"
              }
              tone="bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300"
            />
            <Tile
              icon={Gift}
              label="Free messages"
              value={count(totals.freeVolume)}
              hint="Service tier / ad se aaye"
              tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
            />
            <Tile
              icon={Receipt}
              label="Total delivered"
              value={count(totals.volume)}
              hint="Meta ke records se"
              tone="bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="min-w-0 space-y-4">
              {tier && (
                <div className="rounded-xl border border-ink-100 p-3.5 dark:border-ink-800">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">
                      Free service messages
                    </p>
                    <p className="text-xs tabular-nums text-ink-500">
                      <b className="text-ink-900 dark:text-white">
                        {count(tier.used)}
                      </b>{" "}
                      / {count(tier.limit)}
                    </p>
                  </div>
                  <div
                    className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800"
                    role="progressbar"
                    aria-valuenow={tierPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Free service messages used"
                  >
                    <div
                      className={`h-full rounded-full ${tierPct >= 90 ? "bg-red-500" : tierPct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${tierPct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-500 dark:text-ink-400">
                    {tier.remaining > 0
                      ? `${count(tier.remaining)} free bache. Uske baad AI ke reply bhi charge honge.`
                      : "Free limit poori. Ab service messages bhi charge ho rahe hain."}{" "}
                    Har number par har mahine 1,000 free.
                  </p>
                </div>
              )}
              <div className="rounded-xl border border-ink-100 p-3.5 dark:border-ink-800">
                <p className="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
                  Category ke hisaab se
                </p>
                {(data.byCategory || []).length === 0 ? (
                  <p className="text-sm text-ink-400">
                    Is period mein koi message nahi.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {data.byCategory.map((c) => {
                      const meta = CATEGORY[c.category] || {
                        label: c.category,
                        note: "",
                        tone: "bg-ink-400",
                      };
                      return (
                        <li key={c.category}>
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="font-medium text-ink-800 dark:text-ink-100">
                              {meta.label}{" "}
                              <span className="text-[11px] font-normal text-ink-400">
                                {meta.note}
                              </span>
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums text-ink-900 dark:text-white">
                              {data.costAvailable
                                ? money(c.cost, currency)
                                : "—"}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                              <span
                                className={`block h-full ${meta.tone}`}
                                style={{
                                  width: `${Math.max(2, ((c.cost || 0) / maxCategoryCost) * 100)}%`,
                                }}
                              />
                            </span>
                            <span className="shrink-0 text-right text-[11px] tabular-nums text-ink-500">
                              {count(c.chargedVolume)} charged ·{" "}
                              {count(c.freeVolume)} free
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-ink-100 p-3.5 dark:border-ink-800">
              <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">
                Roz ka {data.costAvailable ? "charge" : "message count"}
              </p>
              <div className="mt-2 h-[220px]">
                {(data.daily || []).length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-ink-400">
                    Koi data nahi
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.daily}
                      margin={{ top: 6, right: 6, bottom: 0, left: -12 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        opacity={0.2}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(d) => d.slice(8, 10)}
                        minTickGap={8}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        allowDecimals={!data.costAvailable ? false : true}
                      />
                      <Tooltip
                        formatter={(v, name) =>
                          name === "cost"
                            ? [money(v, currency), "Charge"]
                            : [count(v), "Messages"]
                        }
                        labelFormatter={(d) =>
                          new Date(d).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })
                        }
                      />
                      <Bar
                        dataKey={data.costAvailable ? "cost" : "volume"}
                        fill="#059669"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-ink-800 dark:text-ink-100">
                Campaign ka andaazan
              </p>
              {(data.campaigns || []).length === 0 ? (
                <p className="mt-1 text-sm text-ink-400">
                  Is period mein koi bulk campaign nahi gaya.
                </p>
              ) : (
                <div className="mt-1 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-ink-400">
                        <th className="py-1.5 font-semibold">Campaign</th>
                        <th className="py-1.5 font-semibold">Type</th>
                        <th className="py-1.5 text-right font-semibold">
                          Bheje
                        </th>
                        <th className="py-1.5 text-right font-semibold">
                          Charge
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.campaigns.map((c) => (
                        <tr
                          key={c.campaignId}
                          className="border-t border-ink-100 dark:border-ink-800"
                        >
                          <td
                            className="max-w-[200px] truncate py-2 font-medium text-ink-800 dark:text-ink-100"
                            title={c.name}
                          >
                            {c.name}
                          </td>
                          <td className="py-2 text-xs text-ink-500">
                            {CATEGORY[c.category]?.label || c.category}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {count(c.sent)}
                          </td>
                          <td className="py-2 text-right font-semibold tabular-nums">
                            {c.estimatedCost == null
                              ? "—"
                              : money(c.estimatedCost, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-ink-400">
            <Info size={13} className="mt-0.5 shrink-0" />
            Ye Meta ka andaazan hai (GST alag). Final bill Meta Business
            Settings → Billing mein aata hai. Data har 30 minute mein refresh
            hota hai
            {data.fetchedAt
              ? ` · last ${new Date(data.fetchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
            .
          </p>
        </>
      )}
    </section>
  );
}
