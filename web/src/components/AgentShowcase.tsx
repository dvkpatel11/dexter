import { useState } from "react";
import { cn } from "../lib/utils";
import { SKILLS, OBJECTIVES, type Skill, type Objective } from "../data/skills";
import {
  Calculator, BarChart3, TrendingUp, Layers, PieChart, Scale,
  MessageCircle, ArrowRightLeft, Search, ShieldCheck, CalendarClock,
  Radar, Landmark, TriangleAlert, Bot, Sparkles, Zap,
} from "lucide-react";

// Map icon name strings to components
const ICONS: Record<string, React.ElementType> = {
  Calculator, BarChart3, TrendingUp, Layers, PieChart, Scale,
  MessageCircle, ArrowRightLeft, Search, ShieldCheck, CalendarClock,
  Radar, Landmark, TriangleAlert,
};

function getIcon(name: string) {
  return ICONS[name] ?? Bot;
}

interface Props {
  onSend: (message: string) => void;
}

type Tab = "objectives" | "skills";

export function AgentShowcase({ onSend }: Props) {
  const [tab, setTab] = useState<Tab>("objectives");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center justify-start min-h-[70vh] gap-8 pt-8 pb-32">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Bot className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dexter
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg leading-relaxed">
            Autonomous financial research agent powered by the analytical traditions of Buffett and Munger.
            Runs DCF valuations, peer comps, technical analysis, options strategies, and portfolio stress tests
            — all with real market data, never fabricated numbers.
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 rounded-lg bg-card border border-border p-1">
        <button
          type="button"
          onClick={() => setTab("objectives")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "objectives"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Quick Start
        </button>
        <button
          type="button"
          onClick={() => setTab("skills")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "skills"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          Skills
        </button>
      </div>

      {/* Objectives grid */}
      {tab === "objectives" && (
        <div className="w-full max-w-3xl">
          <p className="text-xs text-muted-foreground text-center mb-4">
            One-click workflows that chain multiple skills together. Click to launch.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {OBJECTIVES.map((obj) => (
              <ObjectiveCard key={obj.id} objective={obj} onSend={onSend} />
            ))}
          </div>
        </div>
      )}

      {/* Skills grid */}
      {tab === "skills" && (
        <div className="w-full max-w-3xl">
          <p className="text-xs text-muted-foreground text-center mb-4">
            Specialized analysis capabilities. Click any skill to try it.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SKILLS.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                expanded={expandedSkill === skill.id}
                onToggle={() => setExpandedSkill(expandedSkill === skill.id ? null : skill.id)}
                onSend={onSend}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Objective Card ───────────────────────────────────────────────────────

function ObjectiveCard({ objective, onSend }: { objective: Objective; onSend: (m: string) => void }) {
  const Icon = getIcon(objective.icon);
  const prompt = objective.prompt.replace("{TICKER}", "AAPL");

  return (
    <button
      type="button"
      onClick={() => onSend(prompt)}
      className="group rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:bg-accent"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{objective.name}</div>
          <div className="text-[11px] text-muted-foreground">{objective.tagline}</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {objective.description}
      </p>
      <div className="flex flex-wrap gap-1 mt-3">
        {objective.skills.map((sid) => {
          const skill = SKILLS.find((s) => s.id === sid);
          return skill ? (
            <span key={sid} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
              {skill.name}
            </span>
          ) : null;
        })}
      </div>
    </button>
  );
}

// ── Skill Card ───────────────────────────────────────────────────────────

function SkillCard({
  skill, expanded, onToggle, onSend,
}: {
  skill: Skill; expanded: boolean; onToggle: () => void; onSend: (m: string) => void;
}) {
  const Icon = getIcon(skill.icon);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-primary/30">
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">{skill.name}</div>
            <div className="text-xs text-muted-foreground">{skill.tagline}</div>
          </div>
          <svg
            className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{skill.description}</p>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Outputs</div>
            <div className="flex flex-wrap gap-1">
              {skill.outputs.map((o) => (
                <span key={o} className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{o}</span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSend(skill.examplePrompt)}
            className="w-full rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary font-medium text-left hover:bg-primary/10 transition-colors"
          >
            Try: "{skill.examplePrompt}"
          </button>
        </div>
      )}
    </div>
  );
}
