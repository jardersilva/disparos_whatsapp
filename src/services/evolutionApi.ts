import axios, { AxiosInstance } from 'axios';

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
    state: 'open' | 'close' | 'connecting';
  };
}

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}

export function createEvolutionClient(config: EvolutionConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseUrl,
    headers: {
      'Content-Type': 'application/json',
      apikey: config.apiKey,
    },
  });
  return client;
}

export async function checkConnectionStatus(
  client: AxiosInstance,
  instanceName: string
): Promise<ConnectionState> {
  const { data } = await client.get<ConnectionState>(
    `/instance/connectionState/${instanceName}`
  );
  return data;
}

export async function sendTextMessage(
  client: AxiosInstance,
  instanceName: string,
  payload: SendMessagePayload
): Promise<SendMessageResponse> {
  // Normalize number: remove non-digits, ensure country code
  let number = payload.number.replace(/\D/g, '');
  if (!number.startsWith('55')) {
    number = '55' + number;
  }

  const { data } = await client.post<SendMessageResponse>(
    `/message/sendText/${instanceName}`,
    {
      number,
      text: payload.text,
    }
  );
  return data;
}

// Utility to add delay between messages (avoids rate-limiting / bans)
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
