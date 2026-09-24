import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { QrCodeData } from '../services/evolutionApi';
import {
  createEvolutionClient,
  connectInstance,
  checkConnectionStatus,
  getApiErrorMessage,
} from '../services/evolutionApi';
import './ConnectModal.css';

// O WhatsApp troca o QR a cada ~20-40s; a Evolution desiste após algumas tentativas.
const QR_REFRESH_MS = 30_000;
const MAX_QR_REFRESHES = 6;
const STATUS_POLL_MS = 3_000;

interface ConnectModalProps {
  instanceName: string;
  initialQr?: QrCodeData;
  onClose: () => void;
  onConnected: () => void;
}

type Mode = 'qr' | 'pairing';

function formatPairingCode(code: string) {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export default function ConnectModal({
  instanceName,
  initialQr,
  onClose,
  onConnected,
}: ConnectModalProps) {
  const client = useMemo(() => createEvolutionClient(), []);
  const [mode, setMode] = useState<Mode>('qr');
  const [qr, setQr] = useState<string | undefined>(initialQr?.base64);
  const [pairingCode, setPairingCode] = useState<string>();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [connected, setConnected] = useState(false);

  const skipFirstQrFetch = useRef(Boolean(initialQr?.base64));
  const onCloseRef = useRef(onClose);
  const onConnectedRef = useRef(onConnected);
  onCloseRef.current = onClose;
  onConnectedRef.current = onConnected;

  const markConnected = useCallback(() => {
    setConnected(true);
    onConnectedRef.current();
  }, []);

  // Fecha automaticamente pouco depois de conectar
  useEffect(() => {
    if (!connected) return;
    const timer = setTimeout(() => onCloseRef.current(), 1800);
    return () => clearTimeout(timer);
  }, [connected]);

  const requestQr = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await connectInstance(client, instanceName);
      if (!data) {
        markConnected();
        return;
      }
      setQr(data.base64);
      if (!data.base64) setError('A API ainda não gerou o QR Code. Tentando novamente...');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [client, instanceName, markConnected]);

  // Busca e renova o QR Code enquanto estiver no modo QR
  useEffect(() => {
    if (mode !== 'qr' || connected || expired) return;

    if (skipFirstQrFetch.current) {
      skipFirstQrFetch.current = false;
    } else {
      requestQr();
    }

    let refreshes = 0;
    const timer = setInterval(() => {
      refreshes += 1;
      if (refreshes > MAX_QR_REFRESHES) {
        setExpired(true);
        setQr(undefined);
        return;
      }
      requestQr();
    }, QR_REFRESH_MS);
    return () => clearInterval(timer);
  }, [mode, connected, expired, requestQr]);

  // Acompanha o estado da conexão até ficar "open"
  useEffect(() => {
    if (connected) return;
    const timer = setInterval(async () => {
      try {
        const { instance } = await checkConnectionStatus(client, instanceName);
        if (instance?.state === 'open') markConnected();
      } catch {
        // ignora falhas pontuais; o próximo ciclo tenta de novo
      }
    }, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [client, instanceName, connected, markConnected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const requestPairingCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Informe o número com DDD (ex.: 11 91234-5678).');
      return;
    }
    setLoading(true);
    setError('');
    setPairingCode(undefined);
    try {
      const data = await connectInstance(client, instanceName, digits);
      if (!data) {
        markConnected();
        return;
      }
      if (data.pairingCode) setPairingCode(data.pairingCode);
      else setError('A API não retornou um código de pareamento. Tente pelo QR Code.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setError('');
    setExpired(false);
    setPairingCode(undefined);
    if (next === 'qr') setQr(undefined);
    setMode(next);
  };

  // Portal no <body>: o card pai tem animação com transform, que prenderia o position: fixed.
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card animate-slide-up" role="dialog" aria-modal="true" aria-labelledby="connect-title">
        <div className="modal-header">
          <div>
            <h2 id="connect-title">Conectar WhatsApp</h2>
            <p className="modal-subtitle">
              Instância <strong>{instanceName}</strong>
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        {connected ? (
          <div className="connect-success">
            <div className="connect-success-icon">✓</div>
            <h3>WhatsApp conectado!</h3>
            <p>A instância já pode enviar mensagens.</p>
          </div>
        ) : (
          <>
            <div className="connect-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={mode === 'qr'}
                className={mode === 'qr' ? 'active' : ''}
                onClick={() => switchMode('qr')}
              >
                QR Code
              </button>
              <button
                role="tab"
                aria-selected={mode === 'pairing'}
                className={mode === 'pairing' ? 'active' : ''}
                onClick={() => switchMode('pairing')}
              >
                Código pelo número
              </button>
            </div>

            {mode === 'qr' ? (
              <div className="connect-body">
                <div className="qr-frame">
                  {expired ? (
                    <div className="qr-placeholder">
                      <p>O QR Code expirou.</p>
                      <button className="btn-secondary btn-sm" onClick={() => setExpired(false)}>
                        Gerar novo QR Code
                      </button>
                    </div>
                  ) : qr ? (
                    <img src={qr} alt={`QR Code para conectar a instância ${instanceName}`} />
                  ) : (
                    <div className="qr-placeholder">
                      <span className="spinner"></span>
                      <p>Gerando QR Code...</p>
                    </div>
                  )}
                </div>
                <ol className="connect-steps">
                  <li>Abra o WhatsApp no celular</li>
                  <li>
                    Toque em <strong>Mais opções</strong> ou <strong>Configurações</strong> →{' '}
                    <strong>Aparelhos conectados</strong>
                  </li>
                  <li>
                    Toque em <strong>Conectar aparelho</strong> e aponte para este QR Code
                  </li>
                </ol>
                {!expired && (
                  <button className="btn-secondary btn-sm" onClick={requestQr} disabled={loading}>
                    {loading ? 'Atualizando...' : '↻ Atualizar QR Code'}
                  </button>
                )}
              </div>
            ) : (
              <div className="connect-body">
                <div className="field pairing-field">
                  <label htmlFor="pairing-phone">Número do WhatsApp que será conectado</label>
                  <div className="pairing-row">
                    <input
                      id="pairing-phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="55 11 91234-5678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && requestPairingCode()}
                    />
                    <button className="btn-primary btn-sm" onClick={requestPairingCode} disabled={loading}>
                      {loading ? <span className="spinner"></span> : 'Gerar código'}
                    </button>
                  </div>
                </div>

                {pairingCode && <div className="pairing-code">{formatPairingCode(pairingCode)}</div>}

                <ol className="connect-steps">
                  <li>
                    No celular: <strong>Aparelhos conectados</strong> → <strong>Conectar aparelho</strong>
                  </li>
                  <li>
                    Toque em <strong>Conectar com número de telefone</strong>
                  </li>
                  <li>Digite o código mostrado acima</li>
                </ol>
              </div>
            )}

            <div className="connect-waiting">
              <span className="status-dot connecting"></span>
              Aguardando a leitura no celular...
            </div>
          </>
        )}

        {error && !connected && <p className="connect-error">{error}</p>}
      </div>
    </div>,
    document.body
  );
}
