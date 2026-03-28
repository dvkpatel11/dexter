import { useEffect, useState } from 'react';
import { fetchModels, fetchProviders, type ModelInfo, type ProviderInfo } from '../api/client';

interface Props {
  value: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ value, onChange }: Props) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [activeProvider, setActiveProvider] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProviders()
      .then((list) => {
        const available = list.filter((p) => p.hasKey);
        setProviders(available);
        if (!activeProvider && available.length > 0) {
          setActiveProvider(available[0].id);
        }
      })
      .catch(() => setError('Failed to load providers'));
  }, []);

  useEffect(() => {
    if (!activeProvider) return;
    fetchModels(activeProvider)
      .then(setModels)
      .catch(() => setModels([]));
  }, [activeProvider]);

  if (error) return null;

  return (
    <div className="model-selector">
      <button
        className="model-selector-trigger"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className="model-selector-label">{value || 'Select model'}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="model-selector-dropdown">
          <div className="model-selector-providers">
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`model-selector-provider ${p.id === activeProvider ? 'active' : ''}`}
                onClick={() => setActiveProvider(p.id)}
              >
                {p.displayName}
              </button>
            ))}
          </div>
          <div className="model-selector-models">
            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`model-selector-model ${m.id === value ? 'active' : ''}`}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
              >
                <span>{m.displayName}</span>
                <span className="model-selector-model-id">{m.id}</span>
              </button>
            ))}
            {models.length === 0 && (
              <div className="model-selector-empty">No models available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
