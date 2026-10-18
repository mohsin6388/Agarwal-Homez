import { Check } from 'lucide-react';

/** Three-step progress header. currentStep is one-based: 1, 2, or 3. */
export default function Stepper({ steps = [], currentStep = 1, className = '' }) {
  return (
    <nav aria-label="Campaign progress" className={`w-full ${className}`.trim()}>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {steps.map((step, index) => {
          const item = typeof step === 'string' ? { label: step } : step;
          const stepNumber = index + 1;
          const complete = stepNumber < currentStep;
          const current = stepNumber === currentStep;

          return (
            <li
              key={`${item.label}-${stepNumber}`}
              aria-current={current ? 'step' : undefined}
              className={`flex min-w-0 items-start gap-3 rounded-xl border px-3 py-3 ${
                current
                  ? 'border-primary/30 bg-primary-soft dark:border-primary/40 dark:bg-primary/10'
                  : 'border-surface-border bg-white dark:border-ink-800 dark:bg-ink-900'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                  complete
                    ? 'bg-primary text-white'
                    : current
                      ? 'bg-primary text-white'
                      : 'bg-chip-neutral-bg text-chip-neutral-text dark:bg-ink-800 dark:text-ink-300'
                }`}
              >
                {complete ? <Check size={16} aria-label="Complete" /> : stepNumber}
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block text-sm font-extrabold text-text dark:text-white">{item.label}</span>
                {item.summary && <span className="mt-0.5 block text-xs text-text-muted dark:text-ink-400">{item.summary}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
