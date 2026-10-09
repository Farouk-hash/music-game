import { BorderContainer } from "./BorderContainer";

// game/src/components/layout/Hero.jsx
export function Hero({ eyebrow, title, subtitle, stats, isLoading }) {
  return (
    <BorderContainer
        border="all"
        surface="raised"
        padding="xl"
        className="overflow-hidden"
        >
    <section className="space-y-8">
      {eyebrow && (
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          {eyebrow}
        </p>
      )}

      <div className="space-y-4">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-ink leading-[1.05]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-ink-muted max-w-xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {stats && (
        <>
          <div className="h-px bg-border" />

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-6">
            {stats.map((s) => (
              <div key={s.label}>
                <dd className="text-ink text-3xl sm:text-4xl font-bold tabular-nums leading-none">
                  {isLoading || s.value == null ? (
                    <span className="inline-block w-12 h-7 rounded bg-surface-2 animate-pulse" />
                  ) : (
                    s.value.toLocaleString('en-US')
                  )}
                </dd>
                <dt className="text-ink-subtle text-[11px] uppercase tracking-[0.18em] mt-2">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
    </BorderContainer>
  );
}