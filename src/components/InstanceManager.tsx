import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ConnectionStatus, InstanceInfo, QrCodeData } from '../services/evolutionApi';
import {
  createEvolutionClient,
  fetchInstances,
  createInstance,
  logoutInstance,
  deleteInstance,
  checkConnectionStatus,
  getApiErrorMessage,
} from '../services/evolutionApi';
import ConnectModal from './ConnectModal';
import './InstanceManager.css';

const LIST_POLL_MS = 15_000;
const INSTANCE_NAME_PATTERN = /^[A-Za-z0-9_-]{2,40}$/;

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  open: 'Conectado',
  connecting: 'Conectando',
  close: 'Desconectado',
};

const STATUS_BADGE: Record<ConnectionStatus, string> = {
  open: 'badge-success',
  connecting: 'badge-warning',
  close: 'badge-danger',
};

interface InstanceManagerProps {
  activeInstance: string;
  onActiveInstanceChange: (name: string) => void;
  onActiveStatusChange: (status: ConnectionStatus | null) => void;
  /** Bloqueia trocas de instância (ex.: durante um disparo). */
  locked: boolean;
}

export default function InstanceManager({
  activeInstance,
  onActiveInstanceChange,
  onActiveStatusChange,
  locked,
}: InstanceManagerProps) {
  const client = useMemo(() => createEvolutionClient(), []);
  const [instances, setInstances] = useState<InstanceInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [connectTarget, setConnectTarget] = useState<{ name: string; qr?: QrCodeData } | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setInstances(await fetchInstances(client));
      setError('');
    } catch (err) {
      const message = getApiErrorMessage(err);
      // Com uma key de instância (não global) não dá para listar; mostra ao menos a instância ativa.
      if (activeInstance) {
        try {
          const { instance } = await checkConnectionStatus(client, activeInstance);
          setInstances([{ name: activeInstance, status: instance.state }]);
          setError(`${message} Mostrando apenas a instância ativa.`);
          return;
        } catch {
          // cai no erro original abaixo
        }
      }
      setInstances([]);
      setError(message);
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  }, [client, activeInstance]);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const active = instances.find((i) => i.name === activeInstance);

  useEffect(() => {
    onActiveStatusChange(active?.status ?? null);
  }, [active?.status, onActiveStatusChange]);

  // Se a instância ativa não existe mais, seleciona a melhor disponível
  useEffect(() => {
    if (!loaded || error || locked || active) return;
    const fallback = instances.find((i) => i.status === 'open') ?? instances[0];
    const next = fallback?.name ?? '';
    if (next !== activeInstance) onActiveInstanceChange(next);
  }, [loaded, error, locked, active, instances, activeInstance, onActiveInstanceChange]);

  const runAction = async (name: string, action: () => Promise<void>) => {
    setBusy((prev) => ({ ...prev, [name]: true }));
    setError('');
    try {
      await action();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!INSTANCE_NAME_PATTERN.test(name)) {
      setError('Use de 2 a 40 caracteres: letras, números, "-" ou "_".');
      return;
    }
    if (instances.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      setError(`Já existe uma instância chamada "${name}".`);
      return;
    }

    setCreating(true);
    setError('');
    try {
      const qr = await createInstance(client, name);
      setNewName('');
      if (!locked) onActiveInstanceChange(name);
      setConnectTarget({ name, qr });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = (name: string) => {
    if (!window.confirm(`Desconectar o WhatsApp da instância "${name}"?`)) return;
    runAction(name, () => logoutInstance(client, name));
  };

  const handleDelete = (name: string) => {
    if (!window.confirm(`Excluir a instância "${name}"? Essa ação não pode ser desfeita.`)) return;
    runAction(name, () => deleteInstance(client, name));
  };

  return (
    <div className="instances card animate-fade-in">
      <div className="instances-header">
        <div className="instances-icon">📱</div>
        <div>
          <h2>Conexão WhatsApp</h2>
          <p className="instances-subtitle">Instâncias da Evolution API</p>
        </div>
        <button
          className="instances-refresh"
          onClick={load}
          disabled={refreshing}
          aria-label="Atualizar lista"
          title="Atualizar lista"
        >
          <span className={refreshing ? 'is-spinning' : ''}>↻</span>
        </button>
      </div>

      {!loaded ? (
        <div className="instances-empty">
          <span className="spinner"></span>
        </div>
      ) : instances.length === 0 ? (
        !error && (
          <div className="instances-empty">
            <p>Nenhuma instância ainda. Crie a primeira abaixo.</p>
          </div>
        )
      ) : (
        <ul className="instance-list">
          {instances.map((inst) => {
            const isActive = inst.name === activeInstance;
            const isBusy = !!busy[inst.name];
            return (
              <li key={inst.name} className={`instance-item${isActive ? ' is-active' : ''}`}>
                <div className="instance-row">
                  <div className="instance-avatar">
                    {inst.profilePicUrl ? (
                      <img src={inst.profilePicUrl} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      inst.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="instance-info">
                    <div className="instance-name">
                      {inst.name}
                      {isActive && <span className="instance-active-tag">em uso</span>}
                    </div>
                    <div className="instance-meta">
                      {inst.status === 'open'
                        ? [inst.profileName, inst.number && `+${inst.number}`].filter(Boolean).join(' · ') ||
                          'WhatsApp conectado'
                        : 'Sem WhatsApp conectado'}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[inst.status]}`}>
                    <span className={`status-dot ${inst.status}`}></span>
                    {STATUS_LABEL[inst.status]}
                  </span>
                </div>

                <div className="instance-actions">
                  {!isActive && (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => onActiveInstanceChange(inst.name)}
                      disabled={locked || isBusy}
                    >
                      Usar esta
                    </button>
                  )}
                  {inst.status === 'open' ? (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => handleLogout(inst.name)}
                      disabled={isBusy || (locked && isActive)}
                    >
                      Desconectar
                    </button>
                  ) : (
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => setConnectTarget({ name: inst.name })}
                      disabled={isBusy}
                    >
                      Conectar
                    </button>
                  )}
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => handleDelete(inst.name)}
                    disabled={isBusy || (locked && isActive)}
                  >
                    {isBusy ? <span className="spinner spinner-sm"></span> : 'Excluir'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form className="instance-create" onSubmit={handleCreate}>
        <label htmlFor="new-instance">Nova instância</label>
        <div className="instance-create-row">
          <input
            id="new-instance"
            type="text"
            placeholder="ex.: vendas-01"
            value={newName}
            maxLength={40}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="btn-primary btn-sm" disabled={creating || !newName.trim()}>
            {creating ? <span className="spinner spinner-sm"></span> : '+ Criar'}
          </button>
        </div>
      </form>

      {error && <p className="instances-error">{error}</p>}

      {connectTarget && (
        <ConnectModal
          instanceName={connectTarget.name}
          initialQr={connectTarget.qr}
          onClose={() => {
            setConnectTarget(null);
            load();
          }}
          onConnected={load}
        />
      )}
    </div>
  );
}
