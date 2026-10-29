export interface SslDetails {
  protocol?: string;
  cipher?: string;
  authorized?: boolean;
  certIssuer?: string;
  certSubject?: string;
  validTo?: string;
  fingerprint?: string;
  error?: string;
}

export interface HubTopology {
  leafHost: string;
  leafPort: number;
  hubHost: string;
  hubNetwork: string;
  routingStatus: 'synced' | 'routing' | 'reconnecting';
  leafToHubLatencyMs: number;
}

export interface FmStation {
  id: string;
  name: string;
  frequency: string;
  genre: string;
  nowPlaying: string;
  artist: string;
  listenersCount: number;
  bitrate: string;
  streamUrl: string;
  isActive: boolean;
}

export interface LegalLicensing {
  legalCounsel: string;
  firmUrl: string;
  licenseHolder: string;
  domain: string;
  certificateNumber: string;
  complianceStatus: string;
  authorizedBroadcasts: string[];
}

export interface ServerTelemetry {
  host: string;
  port: number;
  tlsEnabled: boolean;
  connected: boolean;
  connecting: boolean;
  lastPingMs: number;
  serverSoftware: string;
  hubHost: string;
  leafStatus: string;
  totalMessagesReceived: number;
  totalMessagesSent: number;
  totalDuplicated: number;
  bytesReceived: number;
  bytesSent: number;
  startedAt: number;
  sslDetails: SslDetails;
  activityHistory: { timestamp: number; count: number }[];
}

export interface ChannelInfo {
  name: string;
  usersCount: number;
  topic: string;
  lastUpdated: number;
}

export interface DuplicationRule {
  id: string;
  sourceChannel: string;
  targetChannel: string;
  enabled: boolean;
  prefix: string;
  direction: 'one-way' | 'two-way';
  duplicatedCount: number;
  createdAt: number;
}

export interface DuplicatorEvent {
  ruleId: string;
  sourceChannel: string;
  targetChannel: string;
  senderNick: string;
  text: string;
  mirroredText: string;
  timestamp: number;
}

export type MessageType =
  | 'privmsg'
  | 'action'
  | 'notice'
  | 'join'
  | 'part'
  | 'quit'
  | 'kick'
  | 'topic'
  | 'mode'
  | 'system'
  | 'dupe';

export interface ChatMessage {
  id: string;
  channel: string;
  sender: string;
  text: string;
  timestamp: number;
  type: MessageType;
  isSelf?: boolean;
  isHighlight?: boolean;
  isDuplicated?: boolean;
  raw?: string;
}

export interface ChannelUser {
  nick: string;
  prefix: '@' | '+' | '%' | '';
  isOp?: boolean;
  isVoice?: boolean;
  isHalfOp?: boolean;
}
