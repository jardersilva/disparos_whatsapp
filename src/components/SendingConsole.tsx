import { useEffect, useRef } from 'react';
import type { Contact } from '../types';
import './SendingConsole.css';

interface SendingConsoleProps {
  contacts: Contact[];
  isSending: boolean;
  progress: number;
  totalSent: number;
  totalErrors: number;
}

export default function SendingConsole({
  contacts,
  isSending,
  progress,
  totalSent,
  totalErrors,
}: SendingConsoleProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contacts]);

  const totalPending = contacts.filter((c) => c.status === 'pending').length;
  const totalDone = totalSent + totalErrors;
  const total = contacts.length;

  return (
    <div className="console card animate-fade-in">
      <div className="console-header">
        <span className="console-icon">📡</span>
        <div>
          <h2>Console de Envio</h2>
          <p className="console-subtitle">
            {isSending ? 'Enviando mensagens...' : totalDone > 0 ? 'Envio finalizado' : 'Aguardando início'}
          </p>
        </div>
        {isSending && <div className="sending-indicator"><span className="spinner"></span></div>}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-number">{total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card stat-sent">
          <div className="stat-number">{totalSent}</div>
          <div className="stat-label">Enviados</div>
        </div>
        <div className="stat-card stat-errors">
          <div className="stat-number">{totalErrors}</div>
          <div className="stat-label">Erros</div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-number">{totalPending}</div>
          <div className="stat-label">Pendentes</div>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>
      )}

      {/* Log entries */}
      <div className="log-container">
        {contacts
          .filter((c) => c.status !== 'pending')
          .map((contact) => (
            <div key={contact.id} className={`log-entry log-${contact.status}`}>
              <span className="log-icon">
                {contact.status === 'sent'
                  ? '✅'
                  : contact.status === 'error'
                  ? '❌'
                  : '⏳'}
              </span>
              <span className="log-phone">{contact.phone}</span>
              {contact.name && <span className="log-name">{contact.name}</span>}
              <span className="log-status">
                {contact.status === 'sent'
                  ? 'Enviado'
                  : contact.status === 'error'
                  ? contact.error || 'Erro'
                  : 'Enviando...'}
              </span>
              {contact.sentAt && (
                <span className="log-time">{contact.sentAt}</span>
              )}
            </div>
          ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
