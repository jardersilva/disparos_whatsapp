import { useState, useRef, useCallback } from 'react';
import Settings from './components/Settings';
import ImportSheet from './components/ImportSheet';
import MessageComposer from './components/MessageComposer';
import SendingConsole from './components/SendingConsole';
import {
  createEvolutionClient,
  sendTextMessage,
  delay,
} from './services/evolutionApi';
import type { EvolutionConfig } from './services/evolutionApi';
import type { Contact } from './types';
import './App.css';

function App() {
  // API Config
  const [config, setConfig] = useState<EvolutionConfig>({
    baseUrl: import.meta.env.VITE_EVOLUTION_API_URL || '',
    apiKey: import.meta.env.VITE_EVOLUTION_API_KEY || '',
    instanceName: import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || '',
  });

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [imported, setImported] = useState(false);

  // Message
  const [message, setMessage] = useState('');
  const [delayMin, setDelayMin] = useState(5);
  const [delayMax, setDelayMax] = useState(15);

  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [totalSent, setTotalSent] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const stopRef = useRef(false);

  const progress =
    contacts.length > 0
      ? ((totalSent + totalErrors) / contacts.length) * 100
      : 0;

  const canSend =
    contacts.length > 0 &&
    message.trim().length > 0 &&
    config.baseUrl.trim().length > 0 &&
    config.apiKey.trim().length > 0 &&
    config.instanceName.trim().length > 0;

  const handleImport = useCallback(
    (importedContacts: Contact[]) => {
      setContacts(importedContacts);
      setImported(true);
      setTotalSent(0);
      setTotalErrors(0);
    },
    []
  );

  const getRandomDelay = () => {
    const min = Math.max(1, delayMin) * 1000;
    const max = Math.max(min, delayMax * 1000);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const handleStartSending = useCallback(async () => {
    if (!canSend) return;

    setIsSending(true);
    stopRef.current = false;
    setTotalSent(0);
    setTotalErrors(0);

    // Reset all contacts to pending
    setContacts((prev) =>
      prev.map((c) => ({ ...c, status: 'pending' as const, error: undefined, sentAt: undefined }))
    );

    const client = createEvolutionClient(config);

    for (let i = 0; i < contacts.length; i++) {
      if (stopRef.current) break;

      const contact = contacts[i];

      // Mark as sending
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contact.id ? { ...c, status: 'sending' as const } : c
        )
      );

      try {
        // Personalize message
        const personalizedMsg = contact.name
          ? message.replace(/\{nome\}/g, contact.name)
          : message.replace(/\{nome\}/g, '');

        await sendTextMessage(client, config.instanceName, {
          number: contact.phone,
          text: personalizedMsg,
        });

        const now = new Date().toLocaleTimeString('pt-BR');
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contact.id
              ? { ...c, status: 'sent' as const, sentAt: now }
              : c
          )
        );
        setTotalSent((prev) => prev + 1);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Erro desconhecido';
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contact.id
              ? { ...c, status: 'error' as const, error: errorMsg }
              : c
          )
        );
        setTotalErrors((prev) => prev + 1);
      }

      // Delay before next message (skip if last or stopped)
      if (i < contacts.length - 1 && !stopRef.current) {
        await delay(getRandomDelay());
      }
    }

    setIsSending(false);
  }, [canSend, contacts, config, message, delayMin, delayMax]);

  const handleStopSending = useCallback(() => {
    stopRef.current = true;
    setIsSending(false);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-content">
          <div className="app-logo">
            <svg viewBox="0 0 40 40" fill="none">
              <defs>
                <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#25D366" />
                  <stop offset="100%" stopColor="#128C7E" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="20" fill="url(#lg)" />
              <path
                d="M20 8C13.4 8 8 13.4 8 20c0 2.1.6 4.1 1.5 5.8L8 30l4.3-1.1c1.7.9 3.6 1.5 5.7 1.5 6.6 0 12-5.4 12-12S26.6 8 20 8z"
                fill="white"
                opacity="0.9"
              />
            </svg>
            <div>
              <h1>Disparos WhatsApp</h1>
              <span className="app-version">v1.0</span>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="app-grid">
          <div className="app-col-left">
            <Settings config={config} onConfigChange={setConfig} />
            <ImportSheet onImport={handleImport} />
          </div>

          <div className="app-col-right">
            {imported && (
              <>
                <MessageComposer
                  message={message}
                  onMessageChange={setMessage}
                  delayMin={delayMin}
                  delayMax={delayMax}
                  onDelayMinChange={setDelayMin}
                  onDelayMaxChange={setDelayMax}
                  contactCount={contacts.length}
                  canSend={canSend}
                  isSending={isSending}
                  onStartSending={handleStartSending}
                  onStopSending={handleStopSending}
                />
                <SendingConsole
                  contacts={contacts}
                  isSending={isSending}
                  progress={progress}
                  totalSent={totalSent}
                  totalErrors={totalErrors}
                />
              </>
            )}

            {!imported && (
              <div className="empty-state card">
                <div className="empty-state-icon">📋</div>
                <h3>Importe uma planilha para começar</h3>
                <p>
                  Configure a API e importe sua planilha de contatos para
                  habilitar o envio de mensagens.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
