import axios, { AxiosInstance } from 'axios';

// Todas as chamadas passam pelo proxy (Vite em dev, nginx em produção),
// que injeta a API key. Assim a chave nunca chega ao navegador.
const PROXY_BASE_URL = '/evolution';

export type ConnectionStatus = 'open' | 'close' | 'connecting';

export interface SendMessagePayload {
  number: string;
  text: string;
}

export interface SendMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    extendedTextMessage?: {
      text: string;
    };
    conversation?: string;
  };
  messageTimestamp: string;
  status: string;
}

export interface ConnectionState {
  instance: {
    instanceName: string;
    state: ConnectionStatus;
  };
}

export interface EvolutionConfig {
  instanceName: string;
}

export interface InstanceInfo {
  name: string;
  status: ConnectionStatus;
  number?: string;
  profileName?: string;
  profilePicUrl?: string;
}

export interface QrCodeData {
  base64?: string;
  pairingCode?: string;
}

interface RawInstance {
  name?: string;
  connectionStatus?: ConnectionStatus;
  ownerJid?: string | null;
  number?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
}

interface RawConnectResponse {
  base64?: string;
  code?: string;
  pairingCode?: string | null;
  instance?: { state?: ConnectionStatus };
}

interface RawCreateResponse {
  qrcode?: RawConnectResponse;
}

export function createEvolutionClient(): AxiosInstance {
  return axios.create({
    baseURL: PROXY_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
  });
}

const path = (name: string) => encodeURIComponent(name);

export async function checkConnectionStatus(
  client: AxiosInstance,
  instanceName: string
): Promise<ConnectionState> {
  const { data } = await client.get<ConnectionState>(
    `/instance/connectionState/${path(instanceName)}`
  );
  return data;
}

export async function fetchInstances(client: AxiosInstance): Promise<InstanceInfo[]> {
  const { data } = await client.get<RawInstance[]>('/instance/fetchInstances');
  return (Array.isArray(data) ? data : [])
    .filter((raw) => raw.name)
    .map((raw) => ({
      name: raw.name!,
      status: raw.connectionStatus ?? 'close',
      number: raw.number ?? raw.ownerJid?.split('@')[0] ?? undefined,
      profileName: raw.profileName ?? undefined,
      profilePicUrl: raw.profilePicUrl ?? undefined,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function toQrCode(raw: RawConnectResponse | undefined): QrCodeData {
  return {
    base64: raw?.base64 || undefined,
    pairingCode: raw?.pairingCode || undefined,
  };
}

export async function createInstance(
  client: AxiosInstance,
  instanceName: string
): Promise<QrCodeData> {
  const { data } = await client.post<RawCreateResponse>('/instance/create', {
    instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
  });
  return toQrCode(data.qrcode);
}

/**
 * Pede um novo QR Code. Com `number` (DDI + DDD + número), a API devolve
 * também um código de pareamento para conectar sem escanear.
 * Retorna `null` quando a instância já está conectada.
 */
export async function connectInstance(
  client: AxiosInstance,
  instanceName: string,
  number?: string
): Promise<QrCodeData | null> {
  const { data } = await client.get<RawConnectResponse>(
    `/instance/connect/${path(instanceName)}`,
    { params: number ? { number: normalizeNumber(number) } : undefined }
  );
  if (data.instance?.state === 'open') return null;
  return toQrCode(data);
}

export async function logoutInstance(client: AxiosInstance, instanceName: string) {
  await client.delete(`/instance/logout/${path(instanceName)}`);
}

export async function deleteInstance(client: AxiosInstance, instanceName: string) {
  await client.delete(`/instance/delete/${path(instanceName)}`);
}

export function normalizeNumber(raw: string): string {
  let number = raw.replace(/\D/g, '');
  if (!number.startsWith('55')) {
    number = '55' + number;
  }
  return number;
}

export async function sendTextMessage(
  client: AxiosInstance,
  instanceName: string,
  payload: SendMessagePayload
): Promise<SendMessageResponse> {
  const { data } = await client.post<SendMessageResponse>(
    `/message/sendText/${path(instanceName)}`,
    {
      number: normalizeNumber(payload.number),
      text: payload.text,
    }
  );
  return data;
}

/** Extrai uma mensagem legível dos erros da Evolution API / proxy. */
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      return 'API key inválida. Use a key global (AUTHENTICATION_API_KEY) da Evolution.';
    }
    if (status === 502 || status === 504) {
      return 'Não foi possível alcançar a Evolution API (verifique EVOLUTION_API_URL).';
    }
    const apiMessage = err.response?.data?.response?.message ?? err.response?.data?.message;
    if (Array.isArray(apiMessage) && apiMessage.length) return apiMessage.map(String).join(' ');
    if (typeof apiMessage === 'string' && apiMessage) return apiMessage;
    if (!err.response) return 'Sem resposta da API. O proxy está configurado?';
    return `Erro ${status} na Evolution API.`;
  }
  return err instanceof Error ? err.message : 'Erro desconhecido';
}

// Utility to add delay between messages (avoids rate-limiting / bans)
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
