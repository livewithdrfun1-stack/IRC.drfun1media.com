import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Hash,
  X,
  Plus,
  Shield,
  Volume2,
  User,
  Users,
  Search,
  Terminal,
  CornerDownLeft,
  RotateCcw,
  ExternalLink,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { ChatMessage, ChannelUser } from '../types';
import { getNickColor, formatTime } from '../utils/ircColors';

interface IrcClientProps {
  connected: boolean;
  connecting: boolean;
  nick: string;
  setNick: (nick: string) => void;
  activeTab: string;
  channels: string[];
  unreadCounts: Record<string, number>;
  messages: ChatMessage[];
  channelUsers: Record<string, ChannelUser[]>;
  switchTab: (channel: string) => void;
  sendMessage: (channel: string, text: string) => void;
  joinChannel: (channel: string) => void;
  closeChannel: (channel: string) => void;
  onOpenSearch: () => void;
  onOpenStats: () => void;
}

export function IrcClient({
  connected,
  connecting,
  nick,
  setNick,
  activeTab,
  channels,
  unreadCounts,
  messages,
  channelUsers,
  switchTab,
  sendMessage,
  joinChannel,
  closeChannel,
  onOpenSearch,
  onOpenStats,
}: IrcClientProps) {
  const [inputText, setInputText] = useState('');
  const [isEditingNick, setIsEditingNick] = useState(false);
  const [tempNick, setTempNick] = useState(nick);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [newChannelInput, setNewChannelInput] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Filter messages for current active tab
  const activeMessages = messages.filter((m) => {
    if (activeTab === '*status*') {
      return m.channel === '*status*' || m.type === 'system';
    }
    return m.channel.toLowerCase() === activeTab.toLowerCase();
  });

  // Current channel users
  const rawUsers = channelUsers[activeTab] || [];
  const currentUsers = rawUsers.filter((u) =>
    u.nick.toLowerCase().includes(userSearchQuery.toLowerCase().trim())
  );

  // Handle auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length, autoScroll]);

  // Detect user manual scroll to toggle auto-scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    setHistory((prev) => [inputText, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);
    sendMessage(activeTab, inputText);
    setInputText('');
    setAutoScroll(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputText(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputText(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputText('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Tab completion for nicks or commands
      const words = inputText.split(' ');
      const lastWord = words[words.length - 1];
      if (lastWord) {
        if (lastWord.startsWith('/')) {
          const cmds = ['/join', '/part', '/nick', '/msg', '/me', '/topic', '/raw', '/clear', '/whois', '/list'];
          const match = cmds.find((c) => c.startsWith(lastWord.toLowerCase()));
          if (match) {
            words[words.length - 1] = match + ' ';
            setInputText(words.join(' '));
          }
        } else {
          const match = rawUsers.find((u) =>
            u.nick.toLowerCase().startsWith(lastWord.toLowerCase())
          );
          if (match) {
            words[words.length - 1] = (words.length === 1 ? match.nick + ': ' : match.nick + ' ');
            setInputText(words.join(' '));
          }
        }
      }
    }
  };

  const handleNickSave = () => {
    if (tempNick.trim()) {
      setNick(tempNick.trim());
    }
    setIsEditingNick(false);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChannelInput.trim()) {
      joinChannel(newChannelInput.trim());
      setNewChannelInput('');
      setJoinModalOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] bg-[#0b0f19] text-slate-200 overflow-hidden">
      {/* Channel Tabs Bar */}
      <div className="flex items-center justify-between bg-[#0e1424] border-b border-slate-800/80 px-3 py-1.5 shrink-0 overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {channels.map((chan) => {
            const isActive = chan.toLowerCase() === activeTab.toLowerCase();
            const unread = unreadCounts[chan.toLowerCase()] || 0;
            const isConsole = chan === '*status*';

            return (
              <button
                key={chan}
                onClick={() => switchTab(chan)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {isConsole ? (
                  <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span>{isConsole ? 'Server Console' : chan}</span>

                {unread > 0 && !isActive && (
                  <span className="ml-1 text-[10px] font-mono tabular-nums px-1.5 py-0.2 text-white bg-sky-500 rounded-sm">
                    {unread}
                  </span>
                )}

                {chan !== '*status*' && chan !== '#drfun1' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      closeChannel(chan);
                    }}
                    className="hover:text-red-400 p-0.5 rounded transition-colors"
                    title={`Leave ${chan}`}
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={() => setJoinModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition-colors border border-dashed border-slate-700/60"
            title="Join new channel"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Join</span>
          </button>
        </div>

        {/* User Identity & Nick Switcher */}
        <div className="flex items-center gap-2 shrink-0 text-xs">
          {isEditingNick ? (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-sky-500/50 rounded px-2 py-0.5">
              <input
                type="text"
                value={tempNick}
                onChange={(e) => setTempNick(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNickSave()}
                className="bg-transparent text-xs text-sky-300 font-mono focus:outline-none w-28"
                autoFocus
              />
              <button
                onClick={handleNickSave}
                className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 uppercase"
              >
                Set
              </button>
              <button
                onClick={() => setIsEditingNick(false)}
                className="text-[10px] text-slate-500 hover:text-slate-400"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setTempNick(nick);
                setIsEditingNick(true);
              }}
              className="flex items-center gap-1.5 text-slate-300 hover:text-sky-300 bg-slate-800/70 border border-slate-700/60 px-2.5 py-1 rounded text-xs transition-colors"
              title="Click to change your IRC nickname"
            >
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono">{nick}</span>
            </button>
          )}

          <button
            onClick={onOpenStats}
            className="hidden md:flex items-center gap-1.5 text-slate-400 hover:text-slate-200 bg-slate-800/40 border border-slate-700/40 px-2.5 py-1 rounded transition-colors text-xs"
            title="View TLS/SSL & Network Statistics"
          >
            <Lock className="w-3 h-3 text-emerald-400" />
            <span className="tabular-nums">6697 TLS</span>
          </button>
        </div>
      </div>

      {/* Channel Header Info */}
      <div className="flex items-center justify-between bg-[#111728] border-b border-slate-800 px-4 py-2 text-xs">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center gap-1.5 font-bold text-slate-200 whitespace-nowrap">
            {activeTab === '*status*' ? (
              <Terminal className="w-4 h-4 text-amber-400" />
            ) : (
              <Hash className="w-4 h-4 text-sky-400" />
            )}
            <span className="text-sm font-semibold tracking-tight">{activeTab}</span>
          </div>

          <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
            ·
          </span>

          <span className="text-slate-400 truncate text-xs">
            {activeTab === '*status*'
              ? 'Realtime diagnostics, TLS handshake telemetry, and raw server message logs'
              : `Topic: Welcome to ${activeTab} on irc.drfun1.com (port 6697 SSL/TLS)`}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-slate-400">
          {activeTab !== '*status*' && (
            <div className="flex items-center gap-1 font-mono tabular-nums text-xs text-slate-300">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{rawUsers.length} users</span>
            </div>
          )}

          <button
            onClick={() => sendMessage(activeTab, '/clear')}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 p-1 rounded transition-colors"
            title="Clear channel backlog"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Chat Window (Split: Message stream + User Nicklist) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages Stream */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 font-mono text-xs leading-relaxed select-text"
        >
          {activeMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
              <MessageSquare className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-400">No messages in {activeTab} yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Say hello or type <code className="text-sky-400 font-mono">/help</code> for available commands.
              </p>
            </div>
          ) : (
            activeMessages.map((msg) => {
              const nickColor = getNickColor(msg.sender);

              // Duplicated message from channel bridge
              if (msg.type === 'dupe') {
                return (
                  <div
                    key={msg.id}
                    className="flex items-start gap-2.5 py-1 px-2.5 rounded bg-sky-950/20 border-l-2 border-sky-400 text-sky-200"
                  >
                    <span className="text-slate-500 text-[11px] tabular-nums shrink-0 select-none">
                      {formatTime(msg.timestamp)}
                    </span>
                    <span className="font-semibold text-sky-400 shrink-0">
                      [Duplicator Relay]
                    </span>
                    <span className="break-words flex-1">{msg.text}</span>
                  </div>
                );
              }

              // System / Raw message
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} className="flex items-start gap-2 text-slate-400 py-0.5">
                    <span className="text-slate-600 text-[11px] tabular-nums shrink-0 select-none">
                      {formatTime(msg.timestamp)}
                    </span>
                    <span className="text-amber-400 font-semibold shrink-0">***</span>
                    <span className="text-slate-300 break-words flex-1">{msg.text}</span>
                  </div>
                );
              }

              // Join message
              if (msg.type === 'join') {
                return (
                  <div key={msg.id} className="flex items-center gap-2 text-emerald-400/90 py-0.5">
                    <span className="text-slate-600 text-[11px] tabular-nums shrink-0 select-none">
                      {formatTime(msg.timestamp)}
                    </span>
                    <span className="text-emerald-500 shrink-0 font-bold">→</span>
                    <span className="break-words">{msg.text}</span>
                  </div>
                );
              }

              // Part / Quit message
              if (msg.type === 'part' || msg.type === 'quit') {
                return (
                  <div key={msg.id} className="flex items-center gap-2 text-rose-400/80 py-0.5">
                    <span className="text-slate-600 text-[11px] tabular-nums shrink-0 select-none">
                      {formatTime(msg.timestamp)}
                    </span>
                    <span className="text-rose-500 shrink-0 font-bold">←</span>
                    <span className="break-words">{msg.text}</span>
                  </div>
                );
              }

              // Action (/me) message
              if (msg.type === 'action') {
                return (
                  <div key={msg.id} className="flex items-center gap-2 text-purple-300 py-0.5">
                    <span className="text-slate-600 text-[11px] tabular-nums shrink-0 select-none">
                      {formatTime(msg.timestamp)}
                    </span>
                    <span className="italic">
                      * <span style={{ color: nickColor }} className="font-semibold">{msg.sender}</span> {msg.text}
                    </span>
                  </div>
                );
              }

              // Regular chat PRIVMSG
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 py-0.5 rounded px-1 transition-colors ${
                    msg.isHighlight ? 'bg-amber-500/10 border-l-2 border-amber-400' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <span className="text-slate-500 text-[11px] tabular-nums shrink-0 select-none">
                    {formatTime(msg.timestamp)}
                  </span>

                  <span
                    onClick={() => {
                      setInputText((prev) => `${msg.sender}: ${prev}`);
                      inputRef.current?.focus();
                    }}
                    style={{ color: nickColor }}
                    className="font-semibold shrink-0 cursor-pointer hover:underline"
                    title={`Click to mention ${msg.sender}`}
                  >
                    &lt;{msg.sender}&gt;
                  </span>

                  <span className="text-slate-100 break-words flex-1 selection:bg-sky-700">
                    {msg.text}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Right Nicklist Sidebar */}
        {activeTab !== '*status*' && (
          <div className="w-56 bg-[#0e1424] border-l border-slate-800 flex flex-col shrink-0">
            <div className="p-2 border-b border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Filter users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded pl-8 pr-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-xs">
              <div className="text-[10px] uppercase font-semibold text-slate-500 px-2 py-1 tracking-wider">
                In Room ({currentUsers.length})
              </div>

              {currentUsers.map((user) => {
                const color = getNickColor(user.nick);
                return (
                  <div
                    key={user.nick}
                    onClick={() => {
                      setInputText((prev) => `${user.nick}: ${prev}`);
                      inputRef.current?.focus();
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800/60 cursor-pointer transition-colors group"
                  >
                    {user.prefix === '@' ? (
                      <span className="text-emerald-400 font-bold text-xs" title="Operator">
                        @
                      </span>
                    ) : user.prefix === '+' ? (
                      <span className="text-sky-400 font-bold text-xs" title="Voice">
                        +
                      </span>
                    ) : user.prefix === '%' ? (
                      <span className="text-amber-400 font-bold text-xs" title="Half-Op">
                        %
                      </span>
                    ) : (
                      <span className="w-2.5 text-slate-600" />
                    )}

                    <span style={{ color }} className="truncate font-medium">
                      {user.nick}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-2 border-t border-slate-800 bg-slate-900/60 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Channel Search</span>
              <button
                onClick={onOpenSearch}
                className="text-sky-400 hover:text-sky-300 font-semibold"
              >
                Browse &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message Command Input */}
      <div className="bg-[#0e1424] border-t border-slate-800 p-2.5">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeTab === '*status*'
                  ? 'Send raw command to irc.drfun1.com (e.g. /list, /whois nick, /version)...'
                  : `Message ${activeTab} or enter /command (/join, /me, /nick, /msg)...`
              }
              className="w-full bg-[#131b2e] border border-slate-700/80 rounded-md px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors shrink-0"
          >
            <span>Send</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Tip: <code className="text-slate-400">/j #channel</code> to join</span>
            <span>·</span>
            <span><code className="text-slate-400">/nick newname</code></span>
            <span>·</span>
            <span><code className="text-slate-400">Tab</code> to autocomplete</span>
          </div>

          <div className="flex items-center gap-2">
            <span>Target: <span className="font-mono text-slate-300">{activeTab}</span></span>
          </div>
        </div>
      </div>

      {/* Join Channel Modal */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#111728] border border-slate-700 rounded-lg w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Hash className="w-4 h-4 text-sky-400" />
                Join Channel on irc.drfun1.com
              </h3>
              <button
                onClick={() => setJoinModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Channel Name
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-mono">#</span>
                  <input
                    type="text"
                    value={newChannelInput.replace(/^#/, '')}
                    onChange={(e) => setNewChannelInput('#' + e.target.value.trim())}
                    placeholder="e.g. general, radio, wordpress"
                    className="w-full bg-slate-900 border border-slate-700 rounded pl-7 pr-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newChannelInput.trim() || newChannelInput === '#'}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded disabled:opacity-50"
                >
                  Join Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
