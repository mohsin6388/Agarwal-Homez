/** Compact KPI card shared by dashboards, contacts, and campaign summaries. */
export default function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  featured = false,
  className = '',
}) {
  return (
    <section
      className={`rounded-card border p-5 shadow-card ${
        featured
          ? 'border-primary/15 bg-primary-soft dark:border-primary/30 dark:bg-primary/10'
          : 'border-surface-border bg-white dark:border-ink-800 dark:bg-ink-900'
      } ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-5 text-text-muted dark:text-ink-400">{label}</p>
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-page text-primary dark:bg-ink-800 dark:text-emerald-300">
            <Icon size={18} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold tracking-tight text-text dark:text-white">{value}</p>
      {helper && <p className="mt-1.5 text-xs leading-5 text-text-muted dark:text-ink-400">{helper}</p>}
    </section>
  );
}
