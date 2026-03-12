import { useState } from 'react';
import './MessageComposer.css';

interface MessageComposerProps {
  message: string;
  onMessageChange: (msg: string) => void;
  delayMin: number;
  delayMax: number;
  onDelayMinChange: (val: number) => void;
  onDelayMaxChange: (val: number) => void;
  contactCount: number;
  canSend: boolean;
  isSending: boolean;
  onStartSending: () => void;
  onStopSending: () => void;
}

export default function MessageComposer({
  message,
  onMessageChange,
  delayMin,
  delayMax,
  onDelayMinChange,
  onDelayMaxChange,
  contactCount,
  canSend,
  isSending,
  onStartSending,
  onStopSending,
}: MessageComposerProps) {
  const [showPreview, setShowPreview] = useState(false);

  const estimatedTime = contactCount > 0
    ? Math.ceil((contactCount * ((delayMin + delayMax) / 2)) / 60)
    : 0;

  return (
    <div className="composer card animate-fade-in">
      <div className="composer-header">
        <span className="composer-icon">✍️</span>
        <div>
          <h2>Mensagem</h2>
          <p className="composer-subtitle">Escreva a mensagem que será enviada</p>
        </div>
      </div>

      <div className="composer-body">
        <div className="field">
          <label htmlFor="messageText">Texto da Mensagem</label>
          <textarea
            id="messageText"
            placeholder="Digite sua mensagem aqui...&#10;&#10;Use {nome} para personalizar com o nome do contato."
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            rows={5}
            disabled={isSending}
          />
          <div className="char-count">{message.length} caracteres</div>
        </div>

        {message && (
          <button
            className="btn-secondary btn-preview"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? '🙈 Esconder' : '👁️ Pré-visualizar'}
          </button>
        )}

        {showPreview && message && (
          <div className="message-preview">
            <div className="preview-label">Prévia da Mensagem</div>
            <div className="preview-bubble">
              {message.replace(/\{nome\}/g, 'João')}
            </div>
          </div>
        )}

        <div className="delay-config">
          <div className="delay-header">
            <span>⏱️</span>
            <span>Intervalo entre mensagens</span>
          </div>
          <div className="delay-grid">
            <div className="field">
              <label htmlFor="delayMin">Mínimo (seg)</label>
              <input
                id="delayMin"
                type="number"
                min={1}
                max={120}
                value={delayMin}
                onChange={(e) => onDelayMinChange(Number(e.target.value))}
                disabled={isSending}
              />
            </div>
            <div className="field">
              <label htmlFor="delayMax">Máximo (seg)</label>
              <input
                id="delayMax"
                type="number"
                min={1}
                max={300}
                value={delayMax}
                onChange={(e) => onDelayMaxChange(Number(e.target.value))}
                disabled={isSending}
              />
            </div>
          </div>
          {contactCount > 0 && (
            <p className="estimate">
              ⏳ Tempo estimado: ~{estimatedTime} min para {contactCount} contatos
            </p>
          )}
        </div>

        <div className="composer-actions">
          {!isSending ? (
            <button
              className="btn-primary btn-send"
              disabled={!canSend}
              onClick={onStartSending}
            >
              🚀 Iniciar Envio ({contactCount} contatos)
            </button>
          ) : (
            <button className="btn-danger btn-stop" onClick={onStopSending}>
              ⏹️ Parar Envio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
