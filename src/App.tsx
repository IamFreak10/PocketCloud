import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { NavTab, Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { LabsView } from './components/LabsView';
import { TopologyView } from './components/TopologyView';
import { TerminalView } from './components/TerminalView';
import { WebServersView } from './components/WebServersView';
import { DatabasesView } from './components/DatabasesView';
import { GatewayView } from './components/GatewayView';
import { BuiltinBrowserView } from './components/BuiltinBrowserView';
import { DnsManagerView } from './components/DnsManagerView';
import { NetworkTesterView } from './components/NetworkTesterView';
import { MissionsView } from './components/MissionsView';
import { SettingsView } from './components/SettingsView';
import { Lab, SystemCapabilities } from './types';
import { api } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [currentLab, setCurrentLab] = useState<Lab | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    // 1. Fetch system capabilities
    api.getCapabilities().then(setCapabilities).catch(console.error);

    // 2. Fetch labs
    api.listLabs().then(async (fetchedLabs) => {
      if (fetchedLabs.length > 0) {
        setLabs(fetchedLabs);
        setCurrentLab(fetchedLabs[0]);
      } else {
        // Automatically create initial starter lab
        try {
          const starter = await api.createLab(
            'Linux VPS & Web Server Lab',
            'Starter playground containing an isolated Alpine Linux VPS and Nginx Web Server',
            'vps-web'
          );
          setLabs([starter]);
          setCurrentLab(starter);
        } catch (e) {
          console.error('Failed to create starter lab:', e);
        }
      }
    });
  }, []);

  const handleStartComponent = async (labId: string, compId: string) => {
    try {
      const updatedComp = await api.startComponent(labId, compId);
      setLabs((prev) =>
        prev.map((l) => {
          if (l.id === labId) {
            const updatedComponents = l.components.map((c) =>
              c.id === compId ? updatedComp : c
            );
            return { ...l, status: 'Running', components: updatedComponents };
          }
          return l;
        })
      );
      if (currentLab?.id === labId) {
        setCurrentLab((prev) =>
          prev
            ? {
                ...prev,
                status: 'Running',
                components: prev.components.map((c) =>
                  c.id === compId ? updatedComp : c
                ),
              }
            : null
        );
      }
      showToast(`Started ${updatedComp.name} (${updatedComp.runtime_mode === 'docker' ? 'Real Container' : 'Simulated'})`);
    } catch (err: unknown) {
      showToast(`Failed to start: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleStopComponent = async (labId: string, compId: string) => {
    try {
      const updatedComp = await api.stopComponent(labId, compId);
      setLabs((prev) =>
        prev.map((l) => {
          if (l.id === labId) {
            const updatedComponents = l.components.map((c) =>
              c.id === compId ? updatedComp : c
            );
            return { ...l, components: updatedComponents };
          }
          return l;
        })
      );
      if (currentLab?.id === labId) {
        setCurrentLab((prev) =>
          prev
            ? {
                ...prev,
                components: prev.components.map((c) =>
                  c.id === compId ? updatedComp : c
                ),
              }
            : null
        );
      }
      showToast(`Stopped ${updatedComp.name}`);
    } catch (err: unknown) {
      showToast(`Failed to stop: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCreateLab = async (name: string, description: string, template?: string) => {
    try {
      const created = await api.createLab(name, description, template);
      setLabs((prev) => [created, ...prev]);
      setCurrentLab(created);
      showToast(`Created lab "${created.name}"`);
    } catch (err: unknown) {
      showToast(`Creation error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleOpenTerminalForComponent = (compId: string) => {
    setSelectedComponentId(compId);
    setCurrentTab('terminal');
  };

  const activeLabCount = labs.filter((l) => l.status === 'Running').length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0f19] text-white">
      {/* Top Navbar */}
      <Header capabilities={capabilities} />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          activeLabCount={activeLabCount}
        />

        {/* Dynamic Center Viewport */}
        <main className="flex-1 overflow-hidden relative bg-[#090d16]">
          {currentTab === 'dashboard' && (
            <DashboardView
              labs={labs}
              capabilities={capabilities}
              onQuickStart={(tmpl) =>
                handleCreateLab(
                  tmpl === 'vps-web' ? 'Full Stack Linux Lab' : 'Custom Cloud Lab',
                  'Dedicated container playground environment',
                  tmpl
                )
              }
              onOpenLab={(labId) => {
                const target = labs.find((l) => l.id === labId);
                if (target) {
                  setCurrentLab(target);
                  setCurrentTab('labs');
                }
              }}
            />
          )}

          {currentTab === 'labs' && (
            <LabsView
              labs={labs}
              currentLab={currentLab}
              onSelectLab={setCurrentLab}
              onCreateLab={handleCreateLab}
              onStartComponent={handleStartComponent}
              onStopComponent={handleStopComponent}
              onOpenTerminal={handleOpenTerminalForComponent}
              onViewLogs={handleOpenTerminalForComponent}
            />
          )}

          {currentTab === 'designer' && (
            <div className="p-8 h-full">
              <TopologyView
                components={currentLab?.components || []}
                onSelectComponent={setSelectedComponentId}
                onOpenTerminal={handleOpenTerminalForComponent}
              />
            </div>
          )}

          {currentTab === 'terminal' && (
            <div className="p-8 h-full">
              <TerminalView
                components={currentLab?.components || []}
                selectedComponentId={selectedComponentId}
                onSelectComponent={setSelectedComponentId}
              />
            </div>
          )}

          {currentTab === 'browser' && (
            <BuiltinBrowserView
              currentLab={currentLab}
              gatewayPort={capabilities?.gateway_port || 18080}
            />
          )}

          {currentTab === 'web' && <WebServersView currentLab={currentLab} />}

          {currentTab === 'dns' && (
            <DnsManagerView
              currentLab={currentLab}
              gatewayPort={capabilities?.gateway_port || 18080}
            />
          )}

          {currentTab === 'databases' && <DatabasesView currentLab={currentLab} />}

          {currentTab === 'diagnostics' && <NetworkTesterView />}

          {currentTab === 'gateway' && (
            <GatewayView
              currentLab={currentLab}
              gatewayPort={capabilities?.gateway_port || 18080}
            />
          )}

          {currentTab === 'missions' && (
            <MissionsView
              currentLab={currentLab}
              onOpenTerminal={handleOpenTerminalForComponent}
            />
          )}

          {currentTab === 'settings' && <SettingsView capabilities={capabilities} />}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#162238] border border-cyan-500/60 text-cyan-200 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
