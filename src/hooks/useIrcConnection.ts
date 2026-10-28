import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ServerTelemetry,
  ChannelInfo,
  DuplicationRule,
  ChatMessage,
  DuplicatorEvent,
  ChannelUser,
} from '../types';

export function useIrcConnection() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [nick, setNick] = useState('Guest');
  const [activeTab, setActiveTab] = useState('#drfun1');
  const [channels, setChannels] = useState<string[]>(['*status*', '#drfun1', '#general']);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channelDirectory, setChannelDirectory] = useState<ChannelInfo[]>([]);
  const [duplicationRules, setDuplicationRules] = useState<DuplicationRule[]>([]);
  const [duplicatorEvents, setDuplicatorEvents] = useState<DuplicatorEvent[]>([]);
  const [telemetry, setTelemetry] = useState<ServerTelemetry | null>(null);
  const [channelUsers, setChannelUsers] = useState<Record<string, ChannelUser[]>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Seed default users for primary channels
  useEffect(() => {
    setChannelUsers({
      '#drfun1': [
        { nick: 'DrFun1_Admin', prefix: '@', isOp: true },
        { nick: 'IRCd_Bot', prefix: '@', isOp: true },
        { nick: 'RadioDJ_Live', prefix: '+', isVoice: true },
        { nick: 'NetOps', prefix: '%', isHalfOp: true },
        { nick: 'RetroWave', prefix: '' },
        { nick: 'ByteMaster', prefix: '' },
        { nick: 'CyberDrifter', prefix: '' },
        { nick: 'LinuxGeek', prefix: '' },
      ],
      '#general': [
        { nick: 'DrFun1_Admin', prefix: '@', isOp: true },
        { nick: 'ChanServ', prefix: '@', isOp: true },
        { nick: 'Alice', prefix: '+' },
        { nick: 'Bob_TheCoder', prefix: '' },
        { nick: 'Satellite_99', prefix: '' },
        { nick: 'Nova_Star', prefix: '' },
      ],
      '#wordpress': [
        { nick: 'WP_Guru', prefix: '@', isOp: true },
        { nick: 'PluginMaster', prefix: '+' },
        { nick: 'PhpCraft', prefix: '' },
      ],
      '#duplicator': [
        { nick: 'Bridge_Agent', prefix: '@', isOp: true },
        { nick: 'RelayMaster', prefix: '+' },
      ],
    });
  }, []);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id'>) => {
    const fullMsg: ChatMessage = {
      ...msg,
      id: 'msg-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now(),
    };

    setMessages((prev) => {
      // Keep last 800 messages to prevent memory leak
      const updated = [...prev, fullMsg];
      if (updated.length > 800) return updated.slice(-800);
      return updated;
    });

    // Handle unread counts if not on current active tab
    if (fullMsg.channel !== '*status*' && fullMsg.channel.toLowerCase() !== activeTab.toLowerCase()) {
      setUnreadCounts((prev) => ({
        ...prev,
        [fullMsg.channel.toLowerCase()]: (prev[fullMsg.channel.toLowerCase()] || 0) + 1,
      }));
    }
  }, [activeTab]);

  const connectWs = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setConnecting(true);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/irc`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
      addMessage({
        channel: '*status*',
        sender: '*** System',
        text: 'Connected to DrFun1 IRC Gateway WebSocket bridge (irc.drfun1.com:6697 SSL/TLS)',
        timestamp: Date.now(),
        type: 'system',
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerPayload(data);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setConnecting(false);
      wsRef.current = null;
      addMessage({
        channel: '*status*',
        sender: '*** System',
        text: 'WebSocket disconnected from IRC bridge. Retrying in 4 seconds...',
        timestamp: Date.now(),
        type: 'system',
      });

      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWs();
      }, 4000);
    };

    ws.onerror = (e) => {
      console.warn('WebSocket encountered error:', e);
    };
  }, [addMessage]);

  const handleServerPayload = (data: any) => {
    switch (data.type) {
      case 'init': {
        if (data.nick) setNick(data.nick);
        if (data.telemetry) setTelemetry(data.telemetry);
        if (data.channels) setChannelDirectory(data.channels);
        if (data.rules) setDuplicationRules(data.rules);

        addMessage({
          channel: '*status*',
          sender: '*** irc.drfun1.com',
          text: `Welcome to irc.drfun1.com [6697 TLS]. Assigned nickname: ${data.nick}. Secure cipher: ${data.telemetry?.sslDetails?.cipher || 'TLS_AES_256_GCM_SHA384'}.`,
          timestamp: Date.now(),
          type: 'system',
        });
        break;
      }

      case 'telemetry': {
        setTelemetry(data.telemetry);
        break;
      }

      case 'channel_update': {
        if (data.channel) {
          setChannelDirectory((prev) => {
            const index = prev.findIndex((c) => c.name.toLowerCase() === data.channel.name.toLowerCase());
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = data.channel;
              return updated;
            }
            return [...prev, data.channel];
          });
        }
        break;
      }

      case 'rules_update': {
        if (data.rules) setDuplicationRules(data.rules);
        break;
      }

      case 'duplicator_event': {
        const event: DuplicatorEvent = data.event;
        setDuplicatorEvents((prev) => [event, ...prev.slice(0, 49)]);

        addMessage({
          channel: event.targetChannel,
          sender: `${event.senderNick} (Relayed)`,
          text: event.mirroredText,
          timestamp: event.timestamp,
          type: 'dupe',
          isDuplicated: true,
        });
        break;
      }

      case 'nick_changed': {
        setNick(data.nick);
        addMessage({
          channel: '*status*',
          sender: '*** Nick',
          text: `Your nickname is now ${data.nick}`,
          timestamp: Date.now(),
          type: 'notice',
        });
        break;
      }

      case 'irc_line': {
        handleIncomingIrcLine(data.line, data.parsed);
        break;
      }
    }
  };

  const handleIncomingIrcLine = (line: string, parsed: any) => {
    if (!parsed) return;
    const { command, prefix, params } = parsed;
    const sender = prefix ? prefix.split('!')[0] : 'Server';

    if (command === 'PRIVMSG') {
      const target = params[0] || '';
      const text = params[1] || '';
      const isAction = text.startsWith('\x01ACTION ') && text.endsWith('\x01');
      const cleanText = isAction ? text.slice(8, -1) : text;
      const isSelf = sender.toLowerCase() === nick.toLowerCase();
      const isHighlight = !isSelf && text.toLowerCase().includes(nick.toLowerCase());

      // If private message directly to user
      const channelKey = target.startsWith('#') ? target : sender;

      // Ensure channel is in active tabs
      if (!channels.map((c) => c.toLowerCase()).includes(channelKey.toLowerCase())) {
        setChannels((prev) => [...prev, channelKey]);
      }

      addMessage({
        channel: channelKey,
        sender,
        text: cleanText,
        timestamp: Date.now(),
        type: isAction ? 'action' : 'privmsg',
        isSelf,
        isHighlight,
        raw: line,
      });
    } else if (command === 'JOIN') {
      const channel = (params[0] || '').replace(/^:/, '');
      if (channel) {
        if (sender.toLowerCase() === nick.toLowerCase()) {
          if (!channels.map((c) => c.toLowerCase()).includes(channel.toLowerCase())) {
            setChannels((prev) => [...prev, channel]);
          }
          setActiveTab(channel);
        }

        // Add user to channel nicklist
        setChannelUsers((prev) => {
          const list = prev[channel] || [];
          if (!list.some((u) => u.nick.toLowerCase() === sender.toLowerCase())) {
            return {
              ...prev,
              [channel]: [...list, { nick: sender, prefix: '' }],
            };
          }
          return prev;
        });

        addMessage({
          channel,
          sender: '*** Join',
          text: `${sender} (${prefix || 'user@host'}) has joined ${channel}`,
          timestamp: Date.now(),
          type: 'join',
        });
      }
    } else if (command === 'PART') {
      const channel = params[0] || '';
      const reason = params[1] ? ` (${params[1]})` : '';
      if (channel) {
        // Remove user from channel nicklist
        setChannelUsers((prev) => {
          const list = prev[channel] || [];
          return {
            ...prev,
            [channel]: list.filter((u) => u.nick.toLowerCase() !== sender.toLowerCase()),
          };
        });

        addMessage({
          channel,
          sender: '*** Part',
          text: `${sender} has left ${channel}${reason}`,
          timestamp: Date.now(),
          type: 'part',
        });
      }
    } else if (command === 'QUIT') {
      const reason = params[0] ? ` (${params[0]})` : '';
      addMessage({
        channel: activeTab,
        sender: '*** Quit',
        text: `${sender} has quit IRC${reason}`,
        timestamp: Date.now(),
        type: 'quit',
      });
    } else if (command === 'NOTICE') {
      addMessage({
        channel: activeTab,
        sender: `-${sender}-`,
        text: params[1] || params[0] || '',
        timestamp: Date.now(),
        type: 'notice',
      });
    } else if (command === '332' || command === 'TOPIC') {
      // Channel topic
      const channel = params[1] || params[0] || '';
      const topic = params[2] || params[1] || '';
      addMessage({
        channel,
        sender: '*** Topic',
        text: `Topic for ${channel}: ${topic}`,
        timestamp: Date.now(),
        type: 'topic',
      });
    } else {
      // General server numeric / raw notice to status console
      const messageText = params.join(' ');
      addMessage({
        channel: '*status*',
        sender: command,
        text: messageText,
        timestamp: Date.now(),
        type: 'system',
        raw: line,
      });
    }
  };

  useEffect(() => {
    connectWs();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWs]);

  // Clear unread count when switching to a channel
  const switchTab = useCallback((channel: string) => {
    setActiveTab(channel);
    setUnreadCounts((prev) => ({
      ...prev,
      [channel.toLowerCase()]: 0,
    }));
  }, []);

  const sendMessage = useCallback((channel: string, text: string) => {
    if (!text.trim()) return;

    if (text.startsWith('/')) {
      // Command parsing
      const parts = text.slice(1).split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      if (cmd === 'join' || cmd === 'j') {
        const ch = args[0] ? (args[0].startsWith('#') ? args[0] : '#' + args[0]) : '';
        if (ch) {
          if (!channels.map((c) => c.toLowerCase()).includes(ch.toLowerCase())) {
            setChannels((prev) => [...prev, ch]);
          }
          setActiveTab(ch);
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'join', channel: ch }));
          }
        }
        return;
      }

      if (cmd === 'part' || cmd === 'leave') {
        const ch = args[0] || channel;
        if (ch && ch !== '*status*') {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'part', channel: ch }));
          }
          setChannels((prev) => prev.filter((c) => c.toLowerCase() !== ch.toLowerCase()));
          if (activeTab.toLowerCase() === ch.toLowerCase()) {
            setActiveTab('#drfun1');
          }
        }
        return;
      }

      if (cmd === 'nick') {
        const newNick = args[0];
        if (newNick && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'set_nick', nick: newNick }));
        }
        return;
      }

      if (cmd === 'msg' || cmd === 'query' || cmd === 'q') {
        const target = args[0];
        const body = args.slice(1).join(' ');
        if (target) {
          if (!channels.includes(target)) {
            setChannels((prev) => [...prev, target]);
          }
          setActiveTab(target);
          if (body && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'chat_message', channel: target, text: body, nick }));
          }
        }
        return;
      }

      if (cmd === 'me') {
        const actionText = `\x01ACTION ${args.join(' ')}\x01`;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'chat_message', channel, text: actionText, nick }));
        }
        return;
      }

      if (cmd === 'raw' || cmd === 'quote') {
        const rawCmd = args.join(' ');
        if (rawCmd && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'send_raw', command: rawCmd }));
        }
        return;
      }

      if (cmd === 'clear') {
        setMessages((prev) => prev.filter((m) => m.channel.toLowerCase() !== channel.toLowerCase()));
        return;
      }

      // Default raw command fallback
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'send_raw', command: text.slice(1) }));
      }
      return;
    }

    // Normal message
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat_message', channel, text, nick }));
    }
  }, [channels, activeTab, nick]);

  const joinChannel = useCallback((channel: string) => {
    const formatted = channel.startsWith('#') ? channel : '#' + channel;
    if (!channels.map((c) => c.toLowerCase()).includes(formatted.toLowerCase())) {
      setChannels((prev) => [...prev, formatted]);
    }
    setActiveTab(formatted);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'join', channel: formatted }));
    }
  }, [channels]);

  const closeChannel = useCallback((channel: string) => {
    if (channel === '*status*' || channel === '#drfun1') return; // protect primary tabs
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'part', channel }));
    }
    setChannels((prev) => prev.filter((c) => c.toLowerCase() !== channel.toLowerCase()));
    if (activeTab.toLowerCase() === channel.toLowerCase()) {
      setActiveTab('#drfun1');
    }
  }, [activeTab]);

  const addDuplicationRule = useCallback((sourceChannel: string, targetChannel: string, prefix = '[Dupe]', direction: 'one-way' | 'two-way' = 'two-way') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'add_duplicator_rule',
        sourceChannel,
        targetChannel,
        prefix,
        direction,
      }));
    }
  }, []);

  const toggleDuplicationRule = useCallback((ruleId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'toggle_duplicator_rule',
        ruleId,
      }));
    }
  }, []);

  const deleteDuplicationRule = useCallback((ruleId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'delete_duplicator_rule',
        ruleId,
      }));
    }
  }, []);

  const refreshChannels = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'refresh_channels' }));
    }
  }, []);

  return {
    connected,
    connecting,
    nick,
    setNick: (newNick: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'set_nick', nick: newNick }));
      }
    },
    activeTab,
    channels,
    unreadCounts,
    messages,
    channelDirectory,
    duplicationRules,
    duplicatorEvents,
    telemetry,
    channelUsers,
    switchTab,
    sendMessage,
    joinChannel,
    closeChannel,
    addDuplicationRule,
    toggleDuplicationRule,
    deleteDuplicationRule,
    refreshChannels,
  };
}
