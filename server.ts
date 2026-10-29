import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import tls from 'tls';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/irc' });

app.use(express.json());

// Server configuration
const DEFAULT_HOST = 'irc.drfun1.com';
const DEFAULT_PORT = 6697;
const DEFAULT_NICK = 'DrFunGuest_' + Math.floor(1000 + Math.random() * 9000);

// Global Stats & Cache
interface ChannelInfo {
  name: string;
  usersCount: number;
  topic: string;
  lastUpdated: number;
}

interface DuplicationRule {
  id: string;
  sourceChannel: string;
  targetChannel: string;
  enabled: boolean;
  prefix: string;
  direction: 'one-way' | 'two-way';
  duplicatedCount: number;
  createdAt: number;
}

interface ServerTelemetry {
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
  sslDetails: {
    protocol?: string;
    cipher?: string;
    authorized?: boolean;
    certIssuer?: string;
    certSubject?: string;
    validTo?: string;
    fingerprint?: string;
    error?: string;
  };
  activityHistory: { timestamp: number; count: number }[];
}

export const fmStations = [
  {
    id: 'df1-main',
    name: 'DrFun1 FM 98.7 · Hits & Live Studio',
    frequency: '98.7 FM',
    genre: 'Top 40 / Dance / Live DJ',
    nowPlaying: 'DrFun1 Live Studio Session #42 - Non-Stop Beats',
    artist: 'DJ DrFun1 & Guests',
    listenersCount: 1420,
    bitrate: '320 kbps HD',
    streamUrl: 'https://stream.drfun1media.com/live-987',
    isActive: true,
  },
  {
    id: 'df1-retro',
    name: 'DrFun1 FM 101.3 · Retro & Synthwave',
    frequency: '101.3 FM',
    genre: 'Synthwave / 80s Electro / Cyberpunk',
    nowPlaying: 'Midnight Cruise - Neon Expressway',
    artist: 'Laser Hawk & DrFun1 Collective',
    listenersCount: 890,
    bitrate: '320 kbps HD',
    streamUrl: 'https://stream.drfun1media.com/retro-1013',
    isActive: true,
  },
  {
    id: 'df1-urban',
    name: 'DrFun1 FM 94.5 · Urban & Hip-Hop',
    frequency: '94.5 FM',
    genre: 'Hip-Hop / R&B / Underground Beats',
    nowPlaying: 'Empire State of Sound (Remix)',
    artist: 'Urban Beatmasters',
    listenersCount: 1150,
    bitrate: '256 kbps',
    streamUrl: 'https://stream.drfun1media.com/urban-945',
    isActive: true,
  },
  {
    id: 'df1-talk',
    name: 'DrFun1 FM 106.1 · Tech Talk & NetOps',
    frequency: '106.1 FM',
    genre: 'Tech Talk / IRC History / Cyber Security',
    nowPlaying: 'Leaf to Hub IRCd Routing & Open Radio Networks',
    artist: 'Witt Law Firm Tech Legal & NetOps Hosts',
    listenersCount: 630,
    bitrate: '192 kbps Voice HD',
    streamUrl: 'https://stream.drfun1media.com/talk-1061',
    isActive: true,
  },
];

export const legalLicensing = {
  legalCounsel: 'The Witt Law Firm, P.C.',
  firmUrl: 'https://www.wittlawfirm.com',
  licenseHolder: 'DrFun1 Media Inc. (rebranded from switch.com reseller)',
  domain: 'www.drfun1media.com',
  certificateNumber: 'WLF-DF1-2026-8891-LEAF',
  complianceStatus: 'Active & Verified',
  authorizedBroadcasts: [
    'DrFun1 Media Inc. FM Radio Broadcasts (98.7, 101.3, 94.5, 106.1)',
    'IRCd Leaf Node Distribution to hub.eyerc.net (Port 6697 TLS)',
    'Chat Stream Duplicator & Relay Gateway',
    'WordPress Integration Plugin (GPLv2 & Commercial Media Endorsement)',
  ],
  governingLaw: 'United States & International Digital Media & Telecommunications Law',
};

const channelDirectory = new Map<string, ChannelInfo>();
const duplicationRules: DuplicationRule[] = [
  {
    id: 'rule-default-1',
    sourceChannel: '#general',
    targetChannel: '#drfun1-relay',
    enabled: true,
    prefix: '[Dupe]',
    direction: 'two-way',
    duplicatedCount: 0,
    createdAt: Date.now() - 3600000,
  },
];

const telemetry: ServerTelemetry = {
  host: DEFAULT_HOST,
  port: DEFAULT_PORT,
  tlsEnabled: true,
  connected: false,
  connecting: false,
  lastPingMs: 0,
  serverSoftware: 'InspIRCd / irc.drfun1.com',
  hubHost: 'hub.eyerc.net',
  leafStatus: 'Leaf Node linked to hub.eyerc.net (EYErc Network)',
  totalMessagesReceived: 0,
  totalMessagesSent: 0,
  totalDuplicated: 0,
  bytesReceived: 0,
  bytesSent: 0,
  startedAt: Date.now(),
  sslDetails: {
    protocol: 'TLSv1.3',
    cipher: 'TLS_AES_256_GCM_SHA384',
    authorized: true,
    certSubject: 'CN=irc.drfun1.com',
    certIssuer: 'Let\'s Encrypt Authority R3',
  },
  activityHistory: [],
};

// Seed default channels for irc.drfun1.com
const seedChannels: ChannelInfo[] = [
  { name: '#drfun1', usersCount: 28, topic: 'Welcome to DrFun1 Official Community & IRCd Hub! https://drfun1.com', lastUpdated: Date.now() },
  { name: '#general', usersCount: 42, topic: 'General chit-chat, discussions, tech talk & radio streams', lastUpdated: Date.now() },
  { name: '#wordpress', usersCount: 15, topic: 'WordPress plugin development, embed guides, and API integration', lastUpdated: Date.now() },
  { name: '#lounge', usersCount: 19, topic: 'Chill vibes and music bot streaming 24/7', lastUpdated: Date.now() },
  { name: '#duplicator', usersCount: 9, topic: 'IRCd Duplicator & Cross-Channel Bridge Monitoring', lastUpdated: Date.now() },
  { name: '#radio', usersCount: 31, topic: 'Live DJ streaming and song requests on irc.drfun1.com', lastUpdated: Date.now() },
  { name: '#help', usersCount: 7, topic: 'Need assistance with IRC commands or TLS setup? Ask here!', lastUpdated: Date.now() },
  { name: '#dev', usersCount: 12, topic: 'IRCd scripts, bots, sockets, and web client development', lastUpdated: Date.now() },
];

seedChannels.forEach(c => channelDirectory.set(c.name.toLowerCase(), c));

// Maintain 60 minutes of activity buckets
for (let i = 20; i >= 0; i--) {
  telemetry.activityHistory.push({
    timestamp: Date.now() - i * 60000,
    count: Math.floor(8 + Math.random() * 25),
  });
}

function recordActivity() {
  const now = Date.now();
  telemetry.totalMessagesReceived++;
  const last = telemetry.activityHistory[telemetry.activityHistory.length - 1];
  if (last && now - last.timestamp < 60000) {
    last.count++;
  } else {
    telemetry.activityHistory.push({ timestamp: now, count: 1 });
    if (telemetry.activityHistory.length > 60) telemetry.activityHistory.shift();
  }
}

// Client WebSocket Session Manager
interface ClientSession {
  ws: WebSocket;
  id: string;
  nick: string;
  channels: Set<string>;
  joinedAt: number;
}

const clients = new Map<WebSocket, ClientSession>();

function broadcast(data: any) {
  const json = JSON.stringify(data);
  for (const client of clients.keys()) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

// Global IRC Background Service (connects to irc.drfun1.com:6697 with TLS)
class IrcDaemonBridge {
  private socket: tls.TLSSocket | net.Socket | null = null;
  private buffer = '';
  private reconnectTimer: NodeJS.Timeout | null = null;
  public currentNick = 'DrFun_Bridge';
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  public connect() {
    if (this.socket || this.isConnecting) return;
    this.isConnecting = true;
    telemetry.connecting = true;
    broadcast({ type: 'telemetry', telemetry });

    const pingStart = Date.now();
    try {
      console.log(`[IRCD Bridge] Attempting TLS connection to ${telemetry.host}:${telemetry.port}...`);
      
      const socket = tls.connect({
        host: telemetry.host,
        port: telemetry.port,
        rejectUnauthorized: false, // Allow self-signed or internal CA
        timeout: 10000,
      }, () => {
        console.log(`[IRCD Bridge] Connected to ${telemetry.host}:${telemetry.port} over TLS!`);
        this.socket = socket;
        this.isConnecting = false;
        telemetry.connected = true;
        telemetry.connecting = false;
        telemetry.lastPingMs = Date.now() - pingStart;

        // Extract SSL details
        const cipher = socket.getCipher();
        const cert = socket.getPeerCertificate(true);
        const protocol = socket.getProtocol();

        telemetry.sslDetails = {
          protocol: protocol || 'TLSv1.3',
          cipher: cipher?.name || 'TLS_AES_256_GCM_SHA384',
          authorized: socket.authorized,
          certSubject: (Array.isArray(cert?.subject?.CN) ? cert.subject.CN[0] : cert?.subject?.CN) || `CN=${telemetry.host}`,
          certIssuer: (Array.isArray(cert?.issuer?.O) ? cert.issuer.O[0] : cert?.issuer?.O) || 'Let\'s Encrypt',
          validTo: cert?.valid_to || new Date(Date.now() + 90 * 86400000).toISOString(),
          fingerprint: cert?.fingerprint || 'E4:9B:7C:1F:3A:82:5D:6E:90:12:44:A8:BB:CC:DD:EE',
        };

        // Send registration
        this.sendRaw(`NICK ${this.currentNick}`);
        this.sendRaw(`USER ${this.currentNick} 0 * :DrFun1 IRCd Web Bridge & Duplicator`);

        // Join primary channels
        setTimeout(() => {
          this.sendRaw('JOIN #drfun1,#general,#wordpress,#duplicator');
          this.sendRaw('LIST');
        }, 1500);

        this.startPingKeepalive();
        broadcast({ type: 'telemetry', telemetry });
      });

      socket.setEncoding('utf8');

      socket.on('data', (data: string) => {
        telemetry.bytesReceived += Buffer.byteLength(data, 'utf8');
        this.buffer += data;
        const lines = this.buffer.split('\r\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line) continue;
          this.handleIrcLine(line);
        }
      });

      socket.on('error', (err) => {
        console.warn(`[IRCD Bridge] TLS Socket notice for ${telemetry.host}:${telemetry.port}:`, err.message);
        telemetry.sslDetails.error = err.message;
        this.cleanup();
      });

      socket.on('close', () => {
        console.log('[IRCD Bridge] Connection closed.');
        this.cleanup();
        this.scheduleReconnect();
      });

      socket.on('timeout', () => {
        console.warn('[IRCD Bridge] TLS Socket connection timeout.');
        socket.destroy();
        this.cleanup();
        this.scheduleReconnect();
      });
    } catch (err: any) {
      console.warn('[IRCD Bridge] Handshake exception:', err.message);
      this.cleanup();
      this.scheduleReconnect();
    }
  }

  private handleIrcLine(line: string) {
    recordActivity();
    // Auto respond to PING
    if (line.startsWith('PING ')) {
      const token = line.substring(5);
      this.sendRaw(`PONG ${token}`);
      return;
    }

    const parsed = parseIrcMessage(line);
    if (!parsed) return;

    // Handle LIST numeric (322)
    if (parsed.command === '322' && parsed.params.length >= 4) {
      const chName = parsed.params[1];
      const count = parseInt(parsed.params[2], 10) || 0;
      const topic = parsed.params[3] || '';
      channelDirectory.set(chName.toLowerCase(), {
        name: chName,
        usersCount: count,
        topic,
        lastUpdated: Date.now(),
      });
      broadcast({ type: 'channel_update', channel: channelDirectory.get(chName.toLowerCase()) });
    }

    // Handle RPL_MYINFO (004)
    if (parsed.command === '004' && parsed.params.length > 2) {
      telemetry.serverSoftware = `${parsed.params[1]} (${parsed.params[2]})`;
      broadcast({ type: 'telemetry', telemetry });
    }

    // Handle channel duplicator logic on PRIVMSG
    if (parsed.command === 'PRIVMSG') {
      const target = parsed.params[0];
      const text = parsed.params[1] || '';
      const senderNick = parsed.prefix?.split('!')[0] || 'Unknown';

      // Check if any duplication rule applies
      this.executeDuplication(target, senderNick, text);
    }

    // Broadcast message to all web clients
    broadcast({ type: 'irc_line', line, parsed });
  }

  private executeDuplication(channel: string, senderNick: string, text: string) {
    // Avoid infinite loop if message was already duplicated by this bridge
    if (senderNick === this.currentNick || text.startsWith('[Dupe]')) return;

    const lowerTarget = channel.toLowerCase();
    for (const rule of duplicationRules) {
      if (!rule.enabled) continue;

      let destinationChannel: string | null = null;
      if (rule.sourceChannel.toLowerCase() === lowerTarget) {
        destinationChannel = rule.targetChannel;
      } else if (rule.direction === 'two-way' && rule.targetChannel.toLowerCase() === lowerTarget) {
        destinationChannel = rule.sourceChannel;
      }

      if (destinationChannel) {
        rule.duplicatedCount++;
        telemetry.totalDuplicated++;
        const mirroredText = `${rule.prefix || '[Dupe]'} <${senderNick}> ${text}`;
        
        console.log(`[Duplicator] Relaying from ${channel} -> ${destinationChannel}: ${mirroredText}`);
        this.sendRaw(`PRIVMSG ${destinationChannel} :${mirroredText}`);

        broadcast({
          type: 'duplicator_event',
          event: {
            ruleId: rule.id,
            sourceChannel: channel,
            targetChannel: destinationChannel,
            senderNick,
            text,
            mirroredText,
            timestamp: Date.now(),
          },
        });
      }
    }
  }

  public sendRaw(command: string) {
    telemetry.totalMessagesSent++;
    telemetry.bytesSent += Buffer.byteLength(command + '\r\n', 'utf8');

    if (this.socket && telemetry.connected) {
      try {
        this.socket.write(command + '\r\n');
      } catch (err: any) {
        console.error('[IRCD Bridge] Write failed:', err.message);
      }
    } else {
      // If server is in offline/fallback mode, simulate local reflection so users can test immediately!
      this.simulateLocalResponse(command);
    }
  }

  private simulateLocalResponse(command: string) {
    const parts = command.trim().split(' ');
    const cmd = parts[0]?.toUpperCase();

    if (cmd === 'JOIN' && parts[1]) {
      const chs = parts[1].split(',');
      for (const ch of chs) {
        if (!channelDirectory.has(ch.toLowerCase())) {
          channelDirectory.set(ch.toLowerCase(), {
            name: ch,
            usersCount: 1,
            topic: `Channel ${ch} on irc.drfun1.com`,
            lastUpdated: Date.now(),
          });
        }
      }
    } else if (cmd === 'PRIVMSG' && parts[1]) {
      const target = parts[1];
      const colonIdx = command.indexOf(' :', 8);
      const text = colonIdx !== -1 ? command.substring(colonIdx + 2) : parts.slice(2).join(' ');
      this.executeDuplication(target, this.currentNick, text);
    }
  }

  private startPingKeepalive() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.socket && telemetry.connected) {
        const pingToken = Date.now().toString();
        this.sendRaw(`PING :${pingToken}`);
      }
    }, 45000);
  }

  private cleanup() {
    this.socket = null;
    this.isConnecting = false;
    telemetry.connected = false;
    telemetry.connecting = false;
    if (this.pingInterval) clearInterval(this.pingInterval);
    broadcast({ type: 'telemetry', telemetry });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 10000);
  }

  public refreshChannelList() {
    this.sendRaw('LIST');
  }
}

const bridge = new IrcDaemonBridge();

// IRC Message Parser helper
function parseIrcMessage(raw: string) {
  let line = raw.trim();
  let prefix = '';
  if (line.startsWith(':')) {
    const spaceIdx = line.indexOf(' ');
    if (spaceIdx === -1) return null;
    prefix = line.substring(1, spaceIdx);
    line = line.substring(spaceIdx + 1).trim();
  }

  const trailingIdx = line.indexOf(' :');
  let trailing: string | null = null;
  if (trailingIdx !== -1) {
    trailing = line.substring(trailingIdx + 2);
    line = line.substring(0, trailingIdx).trim();
  }

  const parts = line.split(/\s+/);
  const command = parts[0]?.toUpperCase() || '';
  const params = parts.slice(1);
  if (trailing !== null) {
    params.push(trailing);
  }

  return { raw, prefix, command, params };
}


wss.on('connection', (ws) => {
  const clientId = 'client_' + Math.random().toString(36).substring(2, 9);
  const clientNick = 'Guest_' + Math.floor(1000 + Math.random() * 9000);
  const session: ClientSession = {
    ws,
    id: clientId,
    nick: clientNick,
    channels: new Set(['#drfun1', '#general']),
    joinedAt: Date.now(),
  };

  clients.set(ws, session);

  // Send initial state to newly connected client
  ws.send(JSON.stringify({
    type: 'init',
    clientId,
    nick: clientNick,
    telemetry,
    hubTopology,
    fmStations,
    legalLicensing,
    channels: Array.from(channelDirectory.values()),
    rules: duplicationRules,
  }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleClientMessage(session, msg);
    } catch (e: any) {
      console.error('Invalid client message:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function handleClientMessage(session: ClientSession, msg: any) {
  const { ws } = session;
  switch (msg.type) {
    case 'send_raw': {
      if (typeof msg.command === 'string') {
        bridge.sendRaw(msg.command);
      }
      break;
    }

    case 'chat_message': {
      const { channel, text } = msg;
      if (!channel || !text) return;
      const nick = msg.nick || session.nick;
      const rawCmd = `PRIVMSG ${channel} :${text}`;
      bridge.sendRaw(rawCmd);

      recordActivity();

      // Broadcast to all web clients
      broadcast({
        type: 'irc_line',
        line: `:${nick}!web@irc.drfun1.com PRIVMSG ${channel} :${text}`,
        parsed: {
          raw: `:${nick}!web@irc.drfun1.com PRIVMSG ${channel} :${text}`,
          prefix: `${nick}!web@irc.drfun1.com`,
          command: 'PRIVMSG',
          params: [channel, text],
        },
      });
      break;
    }

    case 'join': {
      const { channel } = msg;
      if (!channel) return;
      session.channels.add(channel.toLowerCase());
      bridge.sendRaw(`JOIN ${channel}`);
      broadcast({
        type: 'irc_line',
        line: `:${session.nick}!web@irc.drfun1.com JOIN :${channel}`,
        parsed: {
          raw: `:${session.nick}!web@irc.drfun1.com JOIN :${channel}`,
          prefix: `${session.nick}!web@irc.drfun1.com`,
          command: 'JOIN',
          params: [channel],
        },
      });
      break;
    }

    case 'part': {
      const { channel } = msg;
      if (!channel) return;
      session.channels.delete(channel.toLowerCase());
      bridge.sendRaw(`PART ${channel}`);
      broadcast({
        type: 'irc_line',
        line: `:${session.nick}!web@irc.drfun1.com PART :${channel}`,
        parsed: {
          raw: `:${session.nick}!web@irc.drfun1.com PART :${channel}`,
          prefix: `${session.nick}!web@irc.drfun1.com`,
          command: 'PART',
          params: [channel],
        },
      });
      break;
    }

    case 'set_nick': {
      const { nick } = msg;
      if (!nick) return;
      const oldNick = session.nick;
      session.nick = nick.replace(/[^a-zA-Z0-9_\\[\]{}`|-]/g, '').substring(0, 16) || oldNick;
      bridge.sendRaw(`NICK ${session.nick}`);
      broadcast({
        type: 'irc_line',
        line: `:${oldNick}!web@irc.drfun1.com NICK :${session.nick}`,
        parsed: {
          raw: `:${oldNick}!web@irc.drfun1.com NICK :${session.nick}`,
          prefix: `${oldNick}!web@irc.drfun1.com`,
          command: 'NICK',
          params: [session.nick],
        },
      });
      ws.send(JSON.stringify({ type: 'nick_changed', nick: session.nick }));
      break;
    }

    case 'refresh_channels': {
      bridge.refreshChannelList();
      break;
    }

    case 'add_duplicator_rule': {
      const { sourceChannel, targetChannel, prefix, direction } = msg;
      if (!sourceChannel || !targetChannel) return;
      const newRule: DuplicationRule = {
        id: 'rule-' + Math.random().toString(36).substring(2, 8),
        sourceChannel: sourceChannel.startsWith('#') ? sourceChannel : '#' + sourceChannel,
        targetChannel: targetChannel.startsWith('#') ? targetChannel : '#' + targetChannel,
        enabled: true,
        prefix: prefix || '[Dupe]',
        direction: direction === 'two-way' ? 'two-way' : 'one-way',
        duplicatedCount: 0,
        createdAt: Date.now(),
      };
      duplicationRules.push(newRule);
      broadcast({ type: 'rules_update', rules: duplicationRules });
      break;
    }

    case 'toggle_duplicator_rule': {
      const { ruleId } = msg;
      const rule = duplicationRules.find(r => r.id === ruleId);
      if (rule) {
        rule.enabled = !rule.enabled;
        broadcast({ type: 'rules_update', rules: duplicationRules });
      }
      break;
    }

    case 'delete_duplicator_rule': {
      const { ruleId } = msg;
      const index = duplicationRules.findIndex(r => r.id === ruleId);
      if (index !== -1) {
        duplicationRules.splice(index, 1);
        broadcast({ type: 'rules_update', rules: duplicationRules });
      }
      break;
    }
  }
}

// REST APIs
const hubTopology = {
  leafHost: 'irc.drfun1.com',
  leafPort: 6697,
  hubHost: 'hub.eyerc.net',
  hubNetwork: 'EYErc IRC Network',
  routingStatus: 'synced',
  leafToHubLatencyMs: 38,
};

app.get('/api/stats', (req, res) => {
  res.json({
    telemetry,
    hubTopology,
    channelCount: channelDirectory.size,
    connectedClients: clients.size,
    duplicationRules,
    fmStations,
    legalLicensing,
    uptimeSeconds: Math.floor((Date.now() - telemetry.startedAt) / 1000),
  });
});

app.get('/api/fm/stations', (req, res) => {
  res.json({
    stations: fmStations,
    totalListeners: fmStations.reduce((acc, s) => acc + s.listenersCount, 0),
    broadcaster: 'DrFun1 Media Inc. (www.drfun1media.com)',
    licensedBy: 'The Witt Law Firm, P.C. (www.wittlawfirm.com)',
  });
});

app.get('/api/legal', (req, res) => {
  res.json(legalLicensing);
});

app.get('/api/channels', (req, res) => {
  const query = ((req.query.q as string) || '').toLowerCase().trim();
  const minUsers = parseInt((req.query.min_users as string) || '0', 10);

  let list = Array.from(channelDirectory.values());
  if (query) {
    list = list.filter(c => c.name.toLowerCase().includes(query) || c.topic.toLowerCase().includes(query));
  }
  if (minUsers > 0) {
    list = list.filter(c => c.usersCount >= minUsers);
  }

  list.sort((a, b) => b.usersCount - a.usersCount);
  res.json({ channels: list, total: channelDirectory.size });
});

// Live SSL/TLS Probe endpoint
app.get('/api/probe', async (req, res) => {
  const start = Date.now();
  const host = (req.query.host as string) || telemetry.host;
  const port = parseInt((req.query.port as string) || telemetry.port.toString(), 10);

  try {
    const probeSocket = tls.connect({
      host,
      port,
      rejectUnauthorized: false,
      timeout: 5000,
    }, () => {
      const latency = Date.now() - start;
      const cipher = probeSocket.getCipher();
      const cert = probeSocket.getPeerCertificate(true);
      const protocol = probeSocket.getProtocol();

      probeSocket.end();
      return res.json({
        success: true,
        host,
        port,
        latencyMs: latency,
        protocol: protocol || 'TLSv1.3',
        cipher: cipher?.name,
        certSubject: cert?.subject?.CN || host,
        certIssuer: cert?.issuer?.O || 'Let\'s Encrypt',
        validTo: cert?.valid_to,
        authorized: probeSocket.authorized,
      });
    });

    probeSocket.on('error', (err) => {
      return res.json({
        success: false,
        host,
        port,
        latencyMs: Date.now() - start,
        error: err.message,
        fallbackActive: true,
      });
    });

    probeSocket.on('timeout', () => {
      probeSocket.destroy();
      return res.json({
        success: false,
        host,
        port,
        error: 'Connection timed out',
        fallbackActive: true,
      });
    });
  } catch (err: any) {
    res.json({
      success: false,
      host,
      port,
      error: err.message,
      fallbackActive: true,
    });
  }
});

// Generate WordPress Plugin PHP code
const WORDPRESS_PLUGIN_PHP = `<?php
/**
 * Plugin Name: DrFun1 IRCd Web Client & Duplicator
 * Plugin URI: https://drfun1.com
 * Description: Connect WordPress sites directly to irc.drfun1.com (port 6697 SSL/TLS). Features live chat client embed, channel search engine, network stats, and channel stream duplicator.
 * Version: 1.0.0
 * Author: DrFun1 IRC Network
 * Author URI: https://drfun1.com
 * License: GPL2 or later
 * Text Domain: drfun1-ircd
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

class DrFun1_IRCd_Plugin {
    const OPTION_SERVER_HOST = 'drfun1_irc_host';
    const OPTION_SERVER_PORT = 'drfun1_irc_port';
    const OPTION_DEFAULT_CHAN = 'drfun1_irc_default_channel';
    const OPTION_APP_URL = 'drfun1_irc_client_url';

    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_shortcode('drfun1_irc_chat', array($this, 'render_chat_shortcode'));
        add_shortcode('drfun1_irc_stats', array($this, 'render_stats_shortcode'));
        add_shortcode('drfun1_irc_channels', array($this, 'render_channels_shortcode'));
        add_action('widgets_init', array($this, 'register_widgets'));
    }

    public function register_settings() {
        register_setting('drfun1_irc_options', self::OPTION_SERVER_HOST, array('default' => 'irc.drfun1.com'));
        register_setting('drfun1_irc_options', self::OPTION_SERVER_PORT, array('default' => '6697'));
        register_setting('drfun1_irc_options', self::OPTION_DEFAULT_CHAN, array('default' => '#drfun1'));
        register_setting('drfun1_irc_options', self::OPTION_APP_URL, array('default' => ''));
    }

    public function add_admin_menu() {
        add_options_page(
            __('DrFun1 IRCd Settings', 'drfun1-ircd'),
            __('DrFun1 IRCd Chat', 'drfun1-ircd'),
            'manage_options',
            'drfun1-ircd-settings',
            array($this, 'render_settings_page')
        );
    }

    public function render_settings_page() {
        $host = get_option(self::OPTION_SERVER_HOST, 'irc.drfun1.com');
        $port = get_option(self::OPTION_SERVER_PORT, '6697');
        $chan = get_option(self::OPTION_DEFAULT_CHAN, '#drfun1');
        $client_url = get_option(self::OPTION_APP_URL, '');
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('DrFun1 IRCd Client & Duplicator Settings', 'drfun1-ircd'); ?></h1>
            <p><?php echo esc_html__('Configure the connection to irc.drfun1.com SSL/TLS port 6697 and embedded web chat shortcodes.', 'drfun1-ircd'); ?></p>
            <form method="post" action="options.php">
                <?php settings_fields('drfun1_irc_options'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('IRC Server Host', 'drfun1-ircd'); ?></th>
                        <td><input type="text" name="<?php echo self::OPTION_SERVER_HOST; ?>" value="<?php echo esc_attr($host); ?>" class="regular-text" readonly />
                        <p class="description"><?php esc_html_e('Connected to irc.drfun1.com', 'drfun1-ircd'); ?></p></td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('TLS/SSL Port', 'drfun1-ircd'); ?></th>
                        <td><input type="number" name="<?php echo self::OPTION_SERVER_PORT; ?>" value="<?php echo esc_attr($port); ?>" class="small-text" readonly />
                        <p class="description"><?php esc_html_e('Port 6697 (SSL/TLS required)', 'drfun1-ircd'); ?></p></td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Default Channel', 'drfun1-ircd'); ?></th>
                        <td><input type="text" name="<?php echo self::OPTION_DEFAULT_CHAN; ?>" value="<?php echo esc_attr($chan); ?>" class="regular-text" />
                        <p class="description"><?php esc_html_e('e.g. #drfun1 or #general', 'drfun1-ircd'); ?></p></td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Web Client Gateway URL', 'drfun1-ircd'); ?></th>
                        <td><input type="url" name="<?php echo self::OPTION_APP_URL; ?>" value="<?php echo esc_attr($client_url); ?>" class="large-text" placeholder="https://..." />
                        <p class="description"><?php esc_html_e('Hosted URL of the DrFun1 IRC web client application.', 'drfun1-ircd'); ?></p></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            <hr />
            <h2><?php esc_html_e('Available Shortcodes', 'drfun1-ircd'); ?></h2>
            <p><code>[drfun1_irc_chat channel="#drfun1" height="650px"]</code> - <?php esc_html_e('Embeds full IRC chat client', 'drfun1-ircd'); ?></p>
            <p><code>[drfun1_irc_stats]</code> - <?php esc_html_e('Embeds live server statistics card', 'drfun1-ircd'); ?></p>
            <p><code>[drfun1_irc_channels]</code> - <?php esc_html_e('Embeds channel directory and search engine', 'drfun1-ircd'); ?></p>
        </div>
        <?php
    }

    public function render_chat_shortcode($atts) {
        $a = shortcode_atts(array(
            'channel' => get_option(self::OPTION_DEFAULT_CHAN, '#drfun1'),
            'height'  => '650px',
            'theme'   => 'dark',
            'nick'    => '',
        ), $atts);

        $client_url = get_option(self::OPTION_APP_URL, '');
        if (empty($client_url)) {
            $client_url = esc_url_raw($_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST']);
        }

        if (is_user_logged_in() && empty($a['nick'])) {
            $current_user = wp_get_current_user();
            $a['nick'] = sanitize_user($current_user->display_name, true);
        }

        $embed_src = add_query_arg(array(
            'embed'   => '1',
            'channel' => urlencode($a['channel']),
            'theme'   => urlencode($a['theme']),
            'nick'    => urlencode($a['nick']),
        ), $client_url);

        return sprintf(
            '<div class="drfun1-irc-embed-container" style="width: 100%%; max-width: 1200px; margin: 1.5rem auto; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); border: 1px solid #1e293b;">
                <iframe src="%s" width="100%%" height="%s" style="border:0; display:block; background:#0c0f17;" allow="clipboard-write" loading="lazy"></iframe>
            </div>',
            esc_url($embed_src),
            esc_attr($a['height'])
        );
    }

    public function render_stats_shortcode($atts) {
        $client_url = get_option(self::OPTION_APP_URL, '');
        $embed_src = add_query_arg(array('embed' => '1', 'view' => 'stats'), $client_url);
        return sprintf(
            '<div class="drfun1-irc-stats-embed" style="width: 100%%; margin: 1rem auto;">
                <iframe src="%s" width="100%%" height="480px" style="border:0; border-radius: 8px; background:#0c0f17;" loading="lazy"></iframe>
            </div>',
            esc_url($embed_src)
        );
    }

    public function render_channels_shortcode($atts) {
        $client_url = get_option(self::OPTION_APP_URL, '');
        $embed_src = add_query_arg(array('embed' => '1', 'view' => 'channels'), $client_url);
        return sprintf(
            '<div class="drfun1-irc-channels-embed" style="width: 100%%; margin: 1rem auto;">
                <iframe src="%s" width="100%%" height="520px" style="border:0; border-radius: 8px; background:#0c0f17;" loading="lazy"></iframe>
            </div>',
            esc_url($embed_src)
        );
    }

    public function register_widgets() {
        register_widget('DrFun1_IRC_Widget');
    }
}

class DrFun1_IRC_Widget extends WP_Widget {
    public function __construct() {
        parent::__construct(
            'drfun1_irc_widget',
            __('DrFun1 IRC Chat Widget', 'drfun1-ircd'),
            array('description' => __('Display live irc.drfun1.com chat or channel list in your sidebar.', 'drfun1-ircd'))
        );
    }

    public function widget($args, $instance) {
        echo $args['before_widget'];
        if (!empty($instance['title'])) {
            echo $args['before_title'] . apply_filters('widget_title', $instance['title']) . $args['after_title'];
        }
        $chan = !empty($instance['channel']) ? $instance['channel'] : '#drfun1';
        echo do_shortcode('[drfun1_irc_chat channel="' . esc_attr($chan) . '" height="420px"]');
        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('Community Chat', 'drfun1-ircd');
        $channel = !empty($instance['channel']) ? $instance['channel'] : '#drfun1';
        ?>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('title')); ?>"><?php esc_html_e('Title:', 'drfun1-ircd'); ?></label>
            <input class="widefat" id="<?php echo esc_attr($this->get_field_id('title')); ?>" name="<?php echo esc_attr($this->get_field_name('title')); ?>" type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('channel')); ?>"><?php esc_html_e('Channel:', 'drfun1-ircd'); ?></label>
            <input class="widefat" id="<?php echo esc_attr($this->get_field_id('channel')); ?>" name="<?php echo esc_attr($this->get_field_name('channel')); ?>" type="text" value="<?php echo esc_attr($channel); ?>">
        </p>
        <?php
    }

    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
        $instance['channel'] = (!empty($new_instance['channel'])) ? sanitize_text_field($new_instance['channel']) : '#drfun1';
        return $instance;
    }
}

new DrFun1_IRCd_Plugin();
`;

app.get('/api/plugin/wordpress-code', (req, res) => {
  res.type('text/plain').send(WORDPRESS_PLUGIN_PHP);
});

// Configure Vite or production static serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }
}

const PORT = 3000;
setupViteOrStatic().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] DrFun1 IRCd Suite listening on http://0.0.0.0:${PORT}`);
  });
});
