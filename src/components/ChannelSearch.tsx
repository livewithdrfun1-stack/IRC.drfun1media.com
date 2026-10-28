import React, { useState } from 'react';
import {
  Search,
  Hash,
  Users,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Filter,
  SlidersHorizontal,
  ArrowRight,
  GitFork,
  Radio,
  BookOpen,
} from 'lucide-react';
import { ChannelInfo } from '../types';

interface ChannelSearchProps {
  channels: ChannelInfo[];
  onJoinChannel: (channelName: string) => void;
  onRefreshChannels: () => void;
  onSelectForDuplicator: (channelName: string) => void;
  onGoToChat: () => void;
}

export function ChannelSearch({
  channels,
  onJoinChannel,
  onRefreshChannels,
  onSelectForDuplicator,
  onGoToChat,
}: ChannelSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [minUsers, setMinUsers] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'users' | 'name'>('users');
  const [copiedChannel, setCopiedChannel] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefreshChannels();
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  const handleCopyShortcode = (channelName: string) => {
    const code = `[drfun1_irc_chat channel="${channelName}" height="650px"]`;
    navigator.clipboard.writeText(code);
    setCopiedChannel(channelName);
    setTimeout(() => setCopiedChannel(null), 2000);
  };

  // Filter and sort
  const filteredChannels = channels
    .filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesText = !q || c.name.toLowerCase().includes(q) || c.topic.toLowerCase().includes(q);
      const matchesUsers = c.usersCount >= minUsers;
      return matchesText && matchesUsers;
    })
    .sort((a, b) => {
      if (sortBy === 'users') {
        return b.usersCount - a.usersCount;
      }
      return a.name.localeCompare(b.name);
    });

  const totalUsersAcrossChannels = channels.reduce((acc, c) => acc + c.usersCount, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Search className="w-6 h-6 text-sky-400" />
            Channel Search Engine & Directory
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
            <span>irc.drfun1.com:6697 (SSL/TLS)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{channels.length} Indexed Channels</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{totalUsersAcrossChannels} Active Chatters</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors disabled:opacity-50"
            title="Send /LIST command to irc.drfun1.com"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>{isRefreshing ? 'Querying IRCd...' : 'Refresh Directory'}</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-[#111728] border border-slate-800 rounded-lg p-4 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search channels by name, topic keyword, or hashtag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b0f19] border border-slate-700 rounded-md pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Min users selector */}
            <div className="flex items-center gap-1.5 bg-[#0b0f19] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-300">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">Min Users:</span>
              <select
                value={minUsers}
                onChange={(e) => setMinUsers(Number(e.target.value))}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value={0} className="bg-slate-900">Any (0+)</option>
                <option value={5} className="bg-slate-900">5+ Users</option>
                <option value={15} className="bg-slate-900">15+ Users</option>
                <option value={25} className="bg-slate-900">25+ Users</option>
              </select>
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-1.5 bg-[#0b0f19] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'users' | 'name')}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="users" className="bg-slate-900">Most Active (Users)</option>
                <option value="name" className="bg-slate-900">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Tag Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
          <span className="text-[11px] uppercase tracking-wider text-slate-500">Popular:</span>
          {['#drfun1', '#general', '#wordpress', '#radio', '#duplicator'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSearchQuery(tag)}
              className="text-xs text-slate-300 hover:text-sky-300 hover:underline"
            >
              {tag}
            </button>
          ))}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[11px] text-slate-500 hover:text-slate-300 ml-2"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Channel Results Grid */}
      {filteredChannels.length === 0 ? (
        <div className="bg-[#111728] border border-slate-800 rounded-lg p-12 text-center">
          <Hash className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200">No channels found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            No channels on irc.drfun1.com match "{searchQuery}" with minimum {minUsers} users.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setMinUsers(0);
            }}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredChannels.map((channel) => (
            <div
              key={channel.name}
              className="bg-[#111728] border border-slate-800 hover:border-slate-700/80 rounded-lg p-4 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                      <Hash className="w-4 h-4 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 font-mono">
                        {channel.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono tabular-nums text-sky-400 font-semibold">
                          {channel.usersCount} users
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[11px] text-slate-500">
                          irc.drfun1.com
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onJoinChannel(channel.name);
                      onGoToChat();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors shrink-0"
                    title={`Join ${channel.name} now`}
                  >
                    <span>Join Room</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Topic / Description */}
                <p className="text-xs text-slate-300 mt-3 line-clamp-2 leading-relaxed bg-[#0b0f19] p-2.5 rounded border border-slate-800/80 font-mono">
                  {channel.topic || 'No topic set for this room.'}
                </p>
              </div>

              {/* Action Strip */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80 text-xs">
                <button
                  onClick={() => handleCopyShortcode(channel.name)}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Copy WordPress Shortcode for this channel"
                >
                  {copiedChannel === channel.name ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold text-[11px]">Shortcode Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Copy WP Shortcode</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onSelectForDuplicator(channel.name)}
                  className="flex items-center gap-1 text-slate-400 hover:text-sky-300 transition-colors text-[11px]"
                  title="Duplicate messages from this channel to another"
                >
                  <GitFork className="w-3 h-3 text-sky-400" />
                  <span>Duplicate Stream</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
