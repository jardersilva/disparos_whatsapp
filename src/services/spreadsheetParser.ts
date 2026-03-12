import * as XLSX from 'xlsx';

export interface SpreadsheetRow {
  [key: string]: string | number | undefined;
}

export interface ParseResult {
  headers: string[];
  rows: SpreadsheetRow[];
  fileName: string;
}

export function parseSpreadsheetFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Use the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<SpreadsheetRow>(worksheet, {
          defval: '',
        });

        if (jsonData.length === 0) {
          reject(new Error('A planilha está vazia.'));
          return;
        }

        const headers = Object.keys(jsonData[0]);

        resolve({
          headers,
          rows: jsonData,
          fileName: file.name,
        });
      } catch {
        reject(new Error('Erro ao ler a planilha. Verifique se o formato é válido (CSV, XLS, XLSX).'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao carregar o arquivo.'));
    };

    reader.readAsArrayBuffer(file);
  });
}
