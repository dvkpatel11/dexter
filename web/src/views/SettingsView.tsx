import { useEffect, useState } from "react";
import {
  fetchSettings, updateSettings, fetchProviders, fetchModels,
  type DexterSettings, type ProviderInfo, type ModelInfo,
} from "../api/client";
import { cn } from "../lib/utils";
import { Save, Check, X, Loader2, RotateCcw } from "lucide-react";

export function SettingsView() {
  const [settings, setSettings] = useState<DexterSettings | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Draft state for editable fields
  const [provider, setProvider] = useState("");
  const [modelId, setModelId] = useState("");
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [searchProvider, setSearchProvider] = useState("auto");
  const [searchResults, setSearchResults] = useState(5);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchProviders()])
      .then(([s, p]) => {
        setSettings(s);
        setProviders(p);
        setProvider(s.provider ?? "openai");
        setModelId(s.modelId ?? "");
        setMemoryEnabled(s.memory?.enabled ?? true);
        setSearchProvider(s.search?.provider ?? "auto");
        setSearchResults(s.search?.numResults ?? 5);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Load models when provider changes
  useEffect(() => {
    if (!provider) return;
    fetchModels(provider).then(setModels).catch(() => setModels([]));
  }, [provider]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateSettings({
        provider,
        modelId,
        memory: { ...settings?.memory, enabled: memoryEnabled },
        search: { ...settings?.search, provider: searchProvider as DexterSettings["search"] extends { provider?: infer P } ? P : string, numResults: searchResults },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (error && !settings) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load settings: {error}. Make sure the backend is running.
        </div>
      </div>
    );
  }

  if (!settings) {
    return <div className="flex items-center justify-center p-10 text-muted-foreground">Loading settings...</div>;
  }

  const keyStatus = settings._keyStatus ?? {};

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure agent behavior, model defaults, and integrations</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            saved
              ? "bg-green-500/15 text-green-500"
              : "bg-primary text-primary-foreground hover:bg-primary/80"
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved" : "Save Changes"}
        </button>
      </div>

      {error && settings && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3 mb-4">{error}</div>
      )}

      {/* Model Configuration */}
      <Section title="Model" description="Default LLM provider and model for agent queries.">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Provider">
            <select
              value={provider}
              onChange={(e) => { setProvider(e.target.value); setModelId(""); }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} {p.hasKey ? "" : "(no key)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Model">
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Default</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.displayName} ({m.id})</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Memory */}
      <Section title="Memory" description="Persistent memory allows Dexter to remember facts, preferences, and prior analyses across sessions.">
        <Toggle
          label="Enable persistent memory"
          description="Agent will save and recall information using .dexter/memory/ files"
          checked={memoryEnabled}
          onChange={setMemoryEnabled}
        />
      </Section>

      {/* Search */}
      <Section title="Web Search" description="Configure how Dexter searches the web for research.">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Search Provider">
            <select
              value={searchProvider}
              onChange={(e) => setSearchProvider(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="auto">Auto (first available key)</option>
              <option value="exa">Exa</option>
              <option value="perplexity">Perplexity</option>
              <option value="tavily">Tavily</option>
            </select>
          </Field>
          <Field label="Results per search">
            <input
              type="number"
              min={1}
              max={20}
              value={searchResults}
              onChange={(e) => setSearchResults(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Field>
        </div>
      </Section>

      {/* API Keys Status */}
      <Section title="API Keys" description="Status of configured API keys. Keys are set via environment variables on the server.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {providers.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
              {keyStatus[p.id] ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/15">
                  <Check className="h-3 w-3 text-green-500" />
                </div>
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                  <X className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm font-medium text-foreground">{p.displayName}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          To configure keys, set environment variables (e.g. OPENAI_API_KEY) in your server environment or .env file.
        </p>
      </Section>

      {/* Data & Market Integrations */}
      <Section title="Market Data" description="External data providers for financials, prices, and news.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { name: "Polygon", key: "POLYGON_API_KEY" },
            { name: "FinnHub", key: "FINNHUB_API_KEY" },
            { name: "FMP", key: "FMP_API_KEY" },
            { name: "Exa Search", key: "EXASEARCH_API_KEY" },
            { name: "Perplexity", key: "PERPLEXITY_API_KEY" },
            { name: "Tavily", key: "TAVILY_API_KEY" },
            { name: "X / Twitter", key: "X_BEARER_TOKEN" },
          ].map((svc) => {
            // We don't have direct key status for these from the backend,
            // so show them as informational
            return (
              <div key={svc.key} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">{svc.name}</span>
                  <div className="text-[10px] text-muted-foreground font-mono">{svc.key}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-4">
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4">{description}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full text-left"
    >
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      <div className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4",
        checked ? "bg-primary" : "bg-muted"
      )}>
        <span className={cn(
          "inline-block h-4 w-4 rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )} />
      </div>
    </button>
  );
}
