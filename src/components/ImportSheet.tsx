import { useRef, useState } from 'react';
import { parseSpreadsheetFile, type ParseResult } from '../services/spreadsheetParser';
import type { Contact } from '../types';
import './ImportSheet.css';

interface ImportSheetProps {
  onImport: (contacts: Contact[], phoneColumn: string, nameColumn?: string) => void;
}

export default function ImportSheet({ onImport }: ImportSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [phoneColumn, setPhoneColumn] = useState('');
  const [nameColumn, setNameColumn] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    setError('');
    try {
      const result = await parseSpreadsheetFile(file);
      setParseResult(result);

      // Auto-detect phone column
      const phoneGuess = result.headers.find((h) =>
        /phone|telefone|celular|whatsapp|numero|número|fone|tel/i.test(h)
      );
      if (phoneGuess) setPhoneColumn(phoneGuess);

      // Auto-detect name column
      const nameGuess = result.headers.find((h) =>
        /name|nome|cliente|contato/i.test(h)
      );
      if (nameGuess) setNameColumn(nameGuess);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirmImport = () => {
    if (!parseResult || !phoneColumn) return;

    const contacts: Contact[] = parseResult.rows
      .map((row, i) => {
        const phone = String(row[phoneColumn] || '').trim();
        const name = nameColumn ? String(row[nameColumn] || '').trim() : undefined;
        return {
          id: `contact-${i}`,
          phone,
          name,
          status: 'pending' as const,
        };
      })
      .filter((c) => c.phone.length > 0);

    if (contacts.length === 0) {
      setError('Nenhum número de telefone válido encontrado.');
      return;
    }

    onImport(contacts, phoneColumn, nameColumn || undefined);
  };

  return (
    <div className="import-sheet card animate-fade-in">
      <div className="import-header">
        <span className="import-icon">📊</span>
        <div>
          <h2>Importar Contatos</h2>
          <p className="import-subtitle">CSV, XLS ou XLSX</p>
        </div>
      </div>

      {!parseResult ? (
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="drop-zone-content">
            <div className="drop-zone-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4L14 16h7v12h6V16h7L24 4z" fill="currentColor" opacity="0.6"/>
                <path d="M8 32v8c0 2.2 1.8 4 4 4h24c2.2 0 4-1.8 4-4v-8H8z" fill="currentColor" opacity="0.3"/>
              </svg>
            </div>
            <p className="drop-zone-text">
              Arraste sua planilha aqui ou <span>clique para selecionar</span>
            </p>
            <p className="drop-zone-hint">Formatos aceitos: .csv, .xls, .xlsx</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      ) : (
        <div className="import-mapping">
          <div className="file-info">
            <span className="file-badge">📄 {parseResult.fileName}</span>
            <span className="row-count">{parseResult.rows.length} contatos encontrados</span>
            <button
              className="btn-secondary btn-sm"
              onClick={() => {
                setParseResult(null);
                setPhoneColumn('');
                setNameColumn('');
              }}
            >
              Trocar Arquivo
            </button>
          </div>

          <div className="mapping-grid">
            <div className="field">
              <label htmlFor="phoneColumn">Coluna de Telefone *</label>
              <select
                id="phoneColumn"
                value={phoneColumn}
                onChange={(e) => setPhoneColumn(e.target.value)}
              >
                <option value="">Selecione...</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="nameColumn">Coluna de Nome (opcional)</label>
              <select
                id="nameColumn"
                value={nameColumn}
                onChange={(e) => setNameColumn(e.target.value)}
              >
                <option value="">Nenhuma</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview table */}
          <div className="preview-table-wrapper">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  {phoneColumn && <th>📱 Telefone</th>}
                  {nameColumn && <th>👤 Nome</th>}
                </tr>
              </thead>
              <tbody>
                {parseResult.rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    <td className="row-num">{i + 1}</td>
                    {phoneColumn && <td>{String(row[phoneColumn] || '')}</td>}
                    {nameColumn && <td>{String(row[nameColumn] || '')}</td>}
                  </tr>
                ))}
                {parseResult.rows.length > 5 && (
                  <tr className="preview-more">
                    <td colSpan={3}>
                      +{parseResult.rows.length - 5} contatos adicionais...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            className="btn-primary"
            disabled={!phoneColumn}
            onClick={handleConfirmImport}
          >
            ✅ Confirmar Importação ({parseResult.rows.length} contatos)
          </button>
        </div>
      )}

      {error && <p className="import-error">{error}</p>}
    </div>
  );
}
