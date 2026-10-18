const TONES = {
  hot: 'bg-chip-hot-bg text-chip-hot-text',
  visit: 'bg-chip-visit-bg text-chip-visit-text',
  warning: 'bg-chip-warning-bg text-chip-warning-text',
  error: 'bg-chip-error-bg text-chip-error-text',
  neutral: 'bg-chip-neutral-bg text-chip-neutral-text',
  success: 'bg-chip-success-bg text-chip-success-text',
  info: 'bg-chip-visit-bg text-chip-visit-text',
};

/** Shared status pill for lead temperature, meetings, campaign state, and templates. */
export default function StatusChip({
  children,
  label,
  tone = 'neutral',
  dot = false,
  className = '',
}) {
  const content = label ?? children;

  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold leading-none ${TONES[tone] || TONES.neutral} ${className}`.trim()}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {content}
    </span>
  );
}
