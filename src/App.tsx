import React, { useState, useEffect } from 'react';
import { useIrcConnection } from './hooks/useIrcConnection';
import { TopNav } from './components/TopNav';
import { IrcClient } from './components/IrcClient';
import { ChannelSearch } from './components/ChannelSearch';
import { StatsPage } from './components/StatsPage';
import { DuplicatorConsole } from './components/DuplicatorConsole';
import { WordPressSuite } from './components/WordPressSuite';

export default function App() {
  const {
    connected,
    connecting,
    nick,
    setNick,
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
  } = useIrcConnection();

  const [currentView, setCurrentView] = useState<'chat' | 'search' | 'stats' | 'duplicator' | 'wordpress'>('chat');
  const [duplicatorPrefill, setDuplicatorPrefill] = useState<string | undefined>(undefined);
  const [isEmbed, setIsEmbed] = useState(false);

  // Check URL query parameters for embed mode or initial channel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('embed') === '1') {
      setIsEmbed(true);
      const viewParam = params.get('view');
      if (viewParam === 'stats') setCurrentView('stats');
      else if (viewParam === 'channels') setCurrentView('search');
      else setCurrentView('chat');
    }

    const channelParam = params.get('channel');
    if (channelParam) {
      joinChannel(channelParam);
    }

    const nickParam = params.get('nick');
    if (nickParam) {
      setNick(nickParam);
    }
  }, [joinChannel, setNick]);

  const handleSelectForDuplicator = (channelName: string) => {
    setDuplicatorPrefill(channelName);
    setCurrentView('duplicator');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 flex flex-col font-sans selection:bg-sky-600/30 selection:text-white">
      {/* Top Bar (hidden in embed mode for clean iframe integration) */}
      {!isEmbed && (
        <TopNav
          currentView={currentView}
          onSelectView={setCurrentView}
          telemetry={telemetry}
          connected={connected}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {currentView === 'chat' && (
          <IrcClient
            connected={connected}
            connecting={connecting}
            nick={nick}
            setNick={setNick}
            activeTab={activeTab}
            channels={channels}
            unreadCounts={unreadCounts}
            messages={messages}
            channelUsers={channelUsers}
            switchTab={switchTab}
            sendMessage={sendMessage}
            joinChannel={joinChannel}
            closeChannel={closeChannel}
            onOpenSearch={() => setCurrentView('search')}
            onOpenStats={() => setCurrentView('stats')}
          />
        )}

        {currentView === 'search' && (
          <ChannelSearch
            channels={channelDirectory}
            onJoinChannel={(ch) => {
              joinChannel(ch);
              setCurrentView('chat');
            }}
            onRefreshChannels={refreshChannels}
            onSelectForDuplicator={handleSelectForDuplicator}
            onGoToChat={() => setCurrentView('chat')}
          />
        )}

        {currentView === 'stats' && (
          <StatsPage
            telemetry={telemetry}
            channelDirectory={channelDirectory}
            duplicationRules={duplicationRules}
            onRefreshChannels={refreshChannels}
          />
        )}

        {currentView === 'duplicator' && (
          <DuplicatorConsole
            rules={duplicationRules}
            events={duplicatorEvents}
            channels={channelDirectory}
            onAddRule={addDuplicationRule}
            onToggleRule={toggleDuplicationRule}
            onDeleteRule={deleteDuplicationRule}
            prefillSource={duplicatorPrefill}
          />
        )}

        {currentView === 'wordpress' && (
          <WordPressSuite
            appUrl={typeof window !== 'undefined' ? window.location.origin : ''}
          />
        )}
      </main>
    </div>
  );
}
