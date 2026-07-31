import { getTranslations } from "next-intl/server";
import { SectionReveal } from "./SectionReveal";

const STEPS = [
  { num: "01", titleKey: "pipelineStep1Title", bodyKey: "pipelineStep1Body" },
  { num: "02", titleKey: "pipelineStep2Title", bodyKey: "pipelineStep2Body" },
  { num: "03", titleKey: "pipelineStep3Title", bodyKey: "pipelineStep3Body" },
  { num: "04", titleKey: "pipelineStep4Title", bodyKey: "pipelineStep4Body" },
] as const;

export async function PipelineSection() {
  const t = await getTranslations("landing");

  return (
    <section className="mb-24 md:mb-32">
      <SectionReveal>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tighter leading-[1.1] text-foreground mb-12 max-w-[20ch]">
          {t("pipelineTitle")}
        </h2>
      </SectionReveal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
        {STEPS.map((step, i) => (
          <SectionReveal key={step.num} delay={i * 0.08}>
            <div className="flex gap-5 py-7 border-t border-border">
              <span className="text-sm font-mono text-muted tabular-nums shrink-0 pt-0.5">
                {step.num}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t(step.titleKey)}
                </h3>
                <p className="text-sm text-muted leading-relaxed max-w-[48ch]">
                  {t(step.bodyKey)}
                </p>
              </div>
            </div>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}
