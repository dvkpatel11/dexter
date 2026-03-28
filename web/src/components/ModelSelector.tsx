import { useEffect, useRef, useState } from "react";
import { fetchModels, fetchProviders, type ModelInfo, type ProviderInfo } from "../api/client";
import { cn } from "../lib/utils";
import { ChevronDown, Cpu } from "lucide-react";

interface Props {
  value: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ value, onChange }: Props) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [activeProvider, setActiveProvider] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProviders()
      .then((list) => {
        const available = list.filter((p) => p.hasKey);
        setProviders(available);
        if (!activeProvider && available.length > 0) {
          setActiveProvider(available[0].id);
        }
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (!activeProvider) return;
    fetchModels(activeProvider)
      .then(setModels)
      .catch(() => setModels([]));
  }, [activeProvider]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Find display name for current value
  const displayLabel = (() => {
    if (!value) return "Select model";
    for (const p of providers) {
      const found = models.find((m) => m.id === value);
      if (found) return found.displayName;
    }
    return value;
  })();

  if (error) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5",
          "text-xs font-medium text-muted-foreground transition-all",
          "hover:border-primary/40 hover:text-foreground",
          open && "border-primary/40 text-foreground"
        )}
      >
        <Cpu className="h-3.5 w-3.5" />
        <span className="max-w-[180px] truncate">{displayLabel}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 flex overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/40 min-w-[360px] max-h-[320px]">
          {/* Provider tabs */}
          <div className="w-[120px] flex flex-col gap-0.5 border-r border-border p-1.5 overflow-y-auto shrink-0">
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveProvider(p.id)}
                className={cn(
                  "w-full text-left rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
                  p.id === activeProvider
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {p.displayName}
              </button>
            ))}
          </div>

          {/* Model list */}
          <div className="flex-1 flex flex-col gap-0.5 p-1.5 overflow-y-auto">
            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-md px-3 py-2.5 text-left transition-colors",
                  m.id === value
                    ? "bg-primary/15 text-primary"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <span className="text-sm font-medium">{m.displayName}</span>
                <span className="text-[11px] text-muted-foreground">{m.id}</span>
              </button>
            ))}
            {models.length === 0 && (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                No models available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
