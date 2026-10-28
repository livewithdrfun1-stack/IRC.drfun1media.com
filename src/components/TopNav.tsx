import React, { useState } from 'react';
import { Lock, ShieldCheck, X, Activity } from 'lucide-react';
import { ServerTelemetry } from '../types';

interface TopNavProps {
  currentView: 'chat' | 'search' | 'stats' | 'duplicator' | 'wordpress';
  onSelectView: (view: 'chat' | 'search' | 'stats' | 'duplicator' | 'wordpress') => void;
  telemetry: ServerTelemetry | null;
  connected: boolean;
}

export function TopNav({
  currentView,
  onSelectView,
  telemetry,
  connected,
}: TopNavProps) {
  const [showTlsModal, setShowTlsModal] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0e1424] border-b border-slate-800 text-slate-200 shrink-0">
        {/* Zone 1: Brand wordmark (single text element, no subtitles or pills) */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onSelectView('chat');
          }}
          className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-sky-400 transition-colors"
        >
          DrFun1 IRCd
        </a>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
          <button
            onClick={() => onSelectView('chat')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 ${
              currentView === 'chat'
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chat Client
          </button>

          <button
            onClick={() => onSelectView('search')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 ${
              currentView === 'search'
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Channel Search
          </button>

          <button
            onClick={() => onSelectView('stats')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 ${
              currentView === 'stats'
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Network Stats
          </button>

          <button
            onClick={() => onSelectView('duplicator')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 ${
              currentView === 'duplicator'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Duplicator
          </button>

          <button
            onClick={() => onSelectView('wordpress')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 ${
              currentView === 'wordpress'
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            WordPress Plugin
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowTlsModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80"
            title="Inspect SSL/TLS handshake certificate"
          >
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="tabular-nums">irc.drfun1.com:6697</span>
          </button>
        </div>
      </header>

      {/* Mobile Nav strip */}
      <div className="flex md:hidden items-center justify-around bg-[#0a0d16] border-b border-slate-800/80 py-2 px-3 text-[11px] font-medium text-slate-400 overflow-x-auto gap-2">
        <button
          onClick={() => onSelectView('chat')}
          className={currentView === 'chat' ? 'text-sky-400 font-bold' : ''}
        >
          Chat
        </button>
        <button
          onClick={() => onSelectView('search')}
          className={currentView === 'search' ? 'text-sky-400 font-bold' : ''}
        >
          Channels
        </button>
        <button
          onClick={() => onSelectView('stats')}
          className={currentView === 'stats' ? 'text-sky-400 font-bold' : ''}
        >
          Stats
        </button>
        <button
          onClick={() => onSelectView('duplicator')}
          className={currentView === 'duplicator' ? 'text-purple-400 font-bold' : ''}
        >
          Duplicator
        </button>
        <button
          onClick={() => onSelectView('wordpress')}
          className={currentView === 'wordpress' ? 'text-sky-400 font-bold' : ''}
        >
          WordPress
        </button>
      </div>

      {/* SSL/TLS Inspection Modal */}
      {showTlsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#111728] border border-slate-700 rounded-lg w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    TLS Connection Details
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    irc.drfun1.com on TCP Port 6697
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowTlsModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#0b0f19] rounded border border-slate-800/80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Host:</span>
                  <span className="text-slate-200 font-bold">irc.drfun1.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Port:</span>
                  <span className="text-slate-200">6697 (SSL/TLS required)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Protocol:</span>
                  <span className="text-emerald-400">{telemetry?.sslDetails?.protocol || 'TLSv1.3'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cipher:</span>
                  <span className="text-slate-300 truncate max-w-xs">{telemetry?.sslDetails?.cipher || 'TLS_AES_256_GCM_SHA384'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subject:</span>
                  <span className="text-slate-300">{telemetry?.sslDetails?.certSubject || 'CN=irc.drfun1.com'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Issuer:</span>
                  <span className="text-slate-300">{telemetry?.sslDetails?.certIssuer || "Let's Encrypt Authority"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Round-Trip Latency:</span>
                  <span className="text-emerald-400 tabular-nums">{telemetry?.lastPingMs || 24} ms</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowTlsModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
