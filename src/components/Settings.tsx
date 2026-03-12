import { useState, useEffect, useCallback } from 'react';
import type { EvolutionConfig, ConnectionState } from '../services/evolutionApi';
import { createEvolutionClient, checkConnectionStatus } from '../services/evolutionApi';
import './Settings.css';

interface SettingsProps {
  config: EvolutionConfig;
  onConfigChange: (config: EvolutionConfig) => void;
}

export default function Settings({ config, onConfigChange }: SettingsProps) {
  const [status, setStatus] = useState<ConnectionState | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const checkStatus = useCallback(async () => {
    if (!config.baseUrl || !config.apiKey || !config.instanceName) return;

    setChecking(true);
    setError('');
    try {
      const client = createEvolutionClient(config);
      const result = await checkConnectionStatus(client, config.instanceName);
      setStatus(result);
    } catch {
      setError('Não foi possível conectar à API.');
      setStatus(null);
    } finally {
      setChecking(false);
    }
  }, [config]);

  useEffect(() => {
    if (config.baseUrl && config.apiKey && config.instanceName) {
      checkStatus();
    }
  }, []);

  const stateLabel =
    status?.instance?.state === 'open'
      ? 'Conectado'
      : status?.instance?.state === 'connecting'
      ? 'Conectando...'
      : status?.instance?.state === 'close'
      ? 'Desconectado'
      : null;

  const stateBadgeClass =
    status?.instance?.state === 'open'
      ? 'badge-success'
      : status?.instance?.state === 'connecting'
      ? 'badge-warning'
      : 'badge-danger';

  return (
    <div className="settings card animate-fade-in">
      <div className="settings-header">
        <div className="settings-icon">⚙️</div>
        <div>
          <h2>Configurações da API</h2>
          <p className="settings-subtitle">Evolution API</p>
        </div>
        {stateLabel && (
          <span className={`badge ${stateBadgeClass} settings-status-badge`}>
            <span className={`status-dot ${status?.instance?.state}`}></span>
            {stateLabel}
          </span>
        )}
      </div>

      <div className="settings-grid">
        <div className="field">
          <label htmlFor="baseUrl">URL da API</label>
          <input
            id="baseUrl"
            type="text"
            placeholder="https://api.exemplo.com"
            value={config.baseUrl}
            onChange={(e) =>
              onConfigChange({ ...config, baseUrl: e.target.value })
            }
          />
        </div>
        <div className="field">
          <label htmlFor="apiKey">API Key</label>
          <input
            id="apiKey"
            type="password"
            placeholder="Sua chave de API"
            value={config.apiKey}
            onChange={(e) =>
              onConfigChange({ ...config, apiKey: e.target.value })
            }
          />
        </div>
        <div className="field">
          <label htmlFor="instanceName">Nome da Instância</label>
          <input
            id="instanceName"
            type="text"
            placeholder="minha-instancia"
            value={config.instanceName}
            onChange={(e) =>
              onConfigChange({ ...config, instanceName: e.target.value })
            }
          />
        </div>
      </div>

      <div className="settings-actions">
        <button
          className="btn-secondary"
          onClick={checkStatus}
          disabled={checking || !config.baseUrl || !config.apiKey || !config.instanceName}
        >
          {checking ? (
            <>
              <span className="spinner"></span> Verificando...
            </>
          ) : (
            '🔗 Testar Conexão'
          )}
        </button>
        {error && <span className="settings-error">{error}</span>}
      </div>
    </div>
  );
}
