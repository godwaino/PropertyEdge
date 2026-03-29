import { ArrowRight, CheckSquare, MessageCircle, DollarSign, AlertCircle } from 'lucide-react';
import { DataCard } from '../../ui/DataCard';
import { SectionHeader } from '../../ui/SectionHeader';
import type { FullAnalysisResult } from '../../../types/analysis';

interface Props {
  result: FullAnalysisResult;
}

function CopyButton({ text }: { text: string }) {
  const copy = () => navigator.clipboard?.writeText(text).catch(() => {});
  return (
    <button onClick={copy} className="text-xs text-cyan hover:text-cyan/80 transition-colors">
      Copy
    </button>
  );
}

export function NextStepsSection({ result }: Props) {
  const { nextSteps } = result;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Primary recommendation */}
      <DataCard className="border-cyan/30 bg-cyan/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center flex-shrink-0">
            <ArrowRight size={20} className="text-cyan" />
          </div>
          <div>
            <p className="text-xs text-cyan uppercase tracking-wider mb-1">Recommended Next Action</p>
            <p className="text-charcoal font-medium text-base leading-snug">
              {nextSteps.primaryRecommendation}
            </p>
          </div>
        </div>
      </DataCard>

      {/* Action list */}
      {nextSteps.actionList.length > 0 && (
        <DataCard>
          <SectionHeader title="Action Checklist" icon={<CheckSquare size={16} />} />
          <ol className="space-y-3">
            {nextSteps.actionList.map((action, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-navy-light border border-navy-border text-navy-300 text-xs flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-navy-300 pt-0.5">{action}</span>
              </li>
            ))}
          </ol>
        </DataCard>
      )}

      {/* Viewing checklist */}
      {nextSteps.viewingChecklist.length > 0 && (
        <DataCard>
          <SectionHeader
            title="Viewing Checklist"
            subtitle="Ask or check these during your visit"
            icon={<CheckSquare size={16} />}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {nextSteps.viewingChecklist.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-navy-light transition-colors">
                <div className="w-4 h-4 rounded border border-navy-border flex-shrink-0 mt-0.5" />
                <span className="text-xs text-navy-300">{item}</span>
              </div>
            ))}
          </div>
        </DataCard>
      )}

      {/* Agent questions */}
      {nextSteps.agentQuestions.length > 0 && (
        <DataCard>
          <SectionHeader
            title="Questions for the Agent"
            subtitle="Copy and bring to your viewing or call"
            icon={<MessageCircle size={16} />}
            action={
              <CopyButton text={nextSteps.agentQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')} />
            }
          />
          <ol className="space-y-2.5">
            {nextSteps.agentQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="text-navy-300 w-5 flex-shrink-0">{i + 1}.</span>
                <span className="text-navy-300">{q}</span>
              </li>
            ))}
          </ol>
        </DataCard>
      )}

      {/* Negotiation prompts */}
      {nextSteps.negotiationPrompts.length > 0 && (
        <DataCard>
          <SectionHeader
            title="Negotiation Prompts"
            subtitle="Evidence-based angles if you make an offer"
            icon={<DollarSign size={16} />}
          />
          <ul className="space-y-3">
            {nextSteps.negotiationPrompts.map((p, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan mt-1.5 flex-shrink-0" />
                <span className="text-navy-300">{p}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-navy-300 mt-4 border-t border-navy-border pt-3">
            These are analytical observations, not financial advice. Always take independent advice before making an offer.
          </p>
        </DataCard>
      )}

      {/* Unresolved checks */}
      {nextSteps.unresolvedChecks.length > 0 && (
        <DataCard className="border-gold/20">
          <SectionHeader
            title="Unresolved Checks"
            subtitle="Items to verify before proceeding"
            icon={<AlertCircle size={16} />}
          />
          <ul className="space-y-2">
            {nextSteps.unresolvedChecks.map((c, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <AlertCircle size={14} className="text-gold flex-shrink-0 mt-0.5" />
                <span className="text-navy-300">{c}</span>
              </li>
            ))}
          </ul>
        </DataCard>
      )}
    </div>
  );
}
