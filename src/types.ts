export type MessageStatus = 'pending' | 'sending' | 'sent' | 'error';

export interface Contact {
  id: string;
  phone: string;
  name?: string;
  status: MessageStatus;
  error?: string;
  sentAt?: string;
}

export interface CampaignState {
  contacts: Contact[];
  message: string;
  delayMin: number;
  delayMax: number;
  isSending: boolean;
  progress: number;
  totalSent: number;
  totalErrors: number;
}
