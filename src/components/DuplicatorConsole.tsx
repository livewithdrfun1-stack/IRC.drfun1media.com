import React, { useState } from 'react';
import {
  GitFork,
  ArrowRight,
  ArrowLeftRight,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Activity,
  Terminal,
  Shield,
  Hash,
  Check,
  Radio,
  Share2,
} from 'lucide-react';
import { DuplicationRule, DuplicatorEvent, ChannelInfo } from '../types';
import { formatTime } from '../utils/ircColors';

interface DuplicatorConsoleProps {
  rules: DuplicationRule[];
  events: DuplicatorEvent[];
  channels: ChannelInfo[];
  onAddRule: (source: string, target: string, prefix: string, direction: 'one-way' | 'two-way') => void;
  onToggleRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  prefillSource?: string;
}

export function DuplicatorConsole({
  rules,
  events,
  channels,
  onAddRule,
  onToggleRule,
  onDeleteRule,
  prefillSource,
}: DuplicatorConsoleProps) {
  const [source, setSource] = useState(prefillSource || '#general');
  const [target, setTarget] = useState('#drfun1-relay');
  const [prefix, setPrefix] = useState('[Dupe]');
  const [direction, setDirection] = useState<'one-way' | 'two-way'>('two-way');
  const [addedNotice, setAddedNotice] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source.trim() || !target.trim()) return;

    onAddRule(source.trim(), target.trim(), prefix.trim() || '[Dupe]', direction);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  const totalDuplicated = rules.reduce((acc, r) => acc + r.duplicatedCount, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <GitFork className="w-6 h-6 text-purple-400" />
            IRCd Chat Stream Duplicator
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
            <span>Bridge Engine on irc.drfun1.com:6697</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{rules.length} Configured Rules</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{totalDuplicated} Messages Replicated</span>
          </div>
        </div>
      </div>

      {/* Explainer Box */}
      <div className="bg-[#111728] border border-slate-800 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-2">
          <Share2 className="w-4 h-4 text-purple-400" />
          How the DrFun1 Duplicator Works
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
          The channel duplicator acts as an automated, high-speed relay across rooms on <strong className="text-slate-200">irc.drfun1.com</strong>.
          When a chatter sends a message in a source channel (e.g. <code className="text-sky-300 font-mono">#general</code>), the duplicator
          instantly replicates and transmits the message into target channels (e.g. <code className="text-purple-300 font-mono">#drfun1-relay</code> or web embeds),
          preserving the sender’s nickname attribution and timestamp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Create Rule Form */}
        <div className="lg:col-span-1 bg-[#111728] border border-slate-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
            <Plus className="w-4 h-4 text-purple-400" />
            Add Duplication Rule
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Source Channel
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="#general"
                className="w-full bg-[#0b0f19] border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target / Mirror Channel
              </label>
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="#relay"
                className="w-full bg-[#0b0f19] border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Relay Prefix Tag
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="[Dupe]"
                className="w-full bg-[#0b0f19] border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Sync Direction
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDirection('two-way')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded border font-medium transition-colors ${
                    direction === 'two-way'
                      ? 'bg-purple-950/60 border-purple-500/60 text-purple-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Two-Way Sync</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('one-way')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded border font-medium transition-colors ${
                    direction === 'one-way'
                      ? 'bg-purple-950/60 border-purple-500/60 text-purple-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>One-Way</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded transition-colors flex items-center justify-center gap-1.5"
            >
              {addedNotice ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Rule Activated!</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Activate Duplicator Rule</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Active Rules List */}
        <div className="lg:col-span-2 bg-[#111728] border border-slate-800 rounded-lg p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <GitFork className="w-4 h-4 text-purple-400" />
              Active Mirror & Duplication Rules
            </h2>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {rules.length} Active
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {rules.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No active duplication rules. Create a rule on the left.
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    rule.enabled
                      ? 'bg-[#0e1424] border-purple-500/30'
                      : 'bg-[#0a0d14] border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleRule(rule.id)}
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                      title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.enabled ? (
                        <ToggleRight className="w-6 h-6 text-purple-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-600" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-sky-400">{rule.sourceChannel}</span>
                        {rule.direction === 'two-way' ? (
                          <ArrowLeftRight className="w-3.5 h-3.5 text-purple-400" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                        )}
                        <span className="font-bold text-purple-300">{rule.targetChannel}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span>Tag: <code className="text-slate-400">{rule.prefix}</code></span>
                        <span>·</span>
                        <span className="tabular-nums font-mono text-purple-400">
                          {rule.duplicatedCount} msgs relayed
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded hover:bg-slate-800"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Live Duplication Stream Log */}
      <div className="bg-[#111728] border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            Live Duplicator Relay Stream
          </h2>
          <span className="text-xs text-slate-500 font-mono">Real-time IRC mirror queue</span>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800/80 rounded p-3 h-48 overflow-y-auto font-mono text-xs space-y-1.5">
          {events.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-xs">
              Waiting for cross-channel chatter... Send a message in #general or #drfun1 to test!
            </div>
          ) : (
            events.map((evt, idx) => (
              <div key={idx} className="flex items-start gap-2 text-slate-300">
                <span className="text-slate-600 text-[11px] tabular-nums shrink-0">
                  {formatTime(evt.timestamp)}
                </span>
                <span className="text-purple-400 font-semibold shrink-0">
                  [{evt.sourceChannel} &rarr; {evt.targetChannel}]
                </span>
                <span className="text-slate-400 shrink-0">&lt;{evt.senderNick}&gt;</span>
                <span className="text-slate-100 truncate">{evt.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
