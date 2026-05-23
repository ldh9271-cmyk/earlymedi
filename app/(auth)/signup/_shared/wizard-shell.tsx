'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type WizardStep = {
  key: string;
  title: string;
  description?: string;
};

export function WizardShell({
  steps,
  current,
  children,
}: {
  steps: WizardStep[];
  current: number;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2">
        {steps.map((step, idx) => {
          const done = idx < current;
          const active = idx === current;
          return (
            <li key={step.key} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  done && 'bg-care-500 text-white',
                  active && 'bg-brand-600 text-white',
                  !done && !active && 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <div className="hidden flex-1 sm:block">
                <div
                  className={cn(
                    'text-xs font-medium',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.title}
                </div>
              </div>
              {idx < steps.length - 1 ? (
                <div
                  className={cn('hidden h-px flex-1 sm:block', done ? 'bg-care-500' : 'bg-border')}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="rounded-xl border bg-white p-6">{children}</div>
    </div>
  );
}

export function useWizard(total: number): {
  step: number;
  next: () => void;
  prev: () => void;
  go: (n: number) => void;
} {
  const [step, setStep] = useState(0);
  return {
    step,
    next: () => setStep((s) => Math.min(s + 1, total - 1)),
    prev: () => setStep((s) => Math.max(s - 1, 0)),
    go: (n: number) => setStep(Math.max(0, Math.min(n, total - 1))),
  };
}
