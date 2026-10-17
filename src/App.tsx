import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { NavTab, Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { LabsView } from './components/LabsView';
import { TopologyView } from './components/TopologyView';
import { TerminalView } from './components/TerminalView';
import { VpsManagerView } from './components/VpsManagerView';
import { WebServersView } from './components/WebServersView';
import { DatabasesView } from './components/DatabasesView';
import { GatewayView } from './components/GatewayView';
import { BuiltinBrowserView } from './components/BuiltinBrowserView';
import { DnsManagerView } from './components/DnsManagerView';
import { NetworkTesterView } from './components/NetworkTesterView';
import { MissionsView } from './components/MissionsView';
import { SettingsView } from './components/SettingsView';
import { LoadingScreen } from './components/LoadingScreen';
import { Lab, LabComponent, SystemCapabilities } from './types';
import { api } from './services/api';

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [currentLab, setCurrentLab] = useState<Lab | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>(() => {
    return localStorage.getItem('pocketcloud_selected_comp_id') || undefined;
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSelectComponent = (id: string) => {
    setSelectedComponentId(id);
    try {
      localStorage.setItem('pocketcloud_selected_comp_id', id);
    } catch {
      // ignore
    }
  };

  // Automatically keep selectedComponentId locked on the active running VPS node
  useEffect(() => {
    if (!currentLab || currentLab.components.length === 0) return;
    const current = currentLab.components.find((c) => c.id === selectedComponentId);
    if (!current || current.status !== 'running') {
      const best =
        currentLab.components.find((c) => c.status === 'running' && (c.component_type === 'vps' || c.image.includes('ubuntu'))) ||
        currentLab.components.find((c) => c.status === 'running') ||
        currentLab.components.find((c) => c.component_type === 'vps' || c.image.includes('ubuntu')) ||
        currentLab.components[0];
      if (best && best.id !== selectedComponentId) {
        handleSelectComponent(best.id);
      }
    }
  }, [currentLab, selectedComponentId]);

  const handleRefreshCapabilities = async () => {
    try {
      const caps = await api.getCapabilities();
      setCapabilities(caps);
    } catch (e) {
      console.error('Failed to refresh capabilities:', e);
    }
  };

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
        // A fresh installation must start with the real Ubuntu VM path, never a
        // simulated shell presented as Ubuntu.
        try {
          const starter = await api.createLab(
            'Ubuntu 24.04 LTS Cloud Lab',
            'Official Ubuntu 24.04 VM with its own QEMU virtual disk and guest kernel',
            'ubuntu-vps'
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
      const runtime = updatedComp.runtime_mode === 'qemu' ? 'Real Ubuntu VM' : updatedComp.runtime_mode === 'docker' ? 'Real Container' : 'Simulated';
      showToast(`Started ${updatedComp.name} (${runtime})`);
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

  const handleAddComponent = async (
    labId: string,
    name: string,
    componentType: string,
    image: string,
    hostPort?: number,
    containerPort?: number
  ): Promise<LabComponent> => {
    try {
      const comp = await api.addComponent(labId, name, componentType, image, hostPort, containerPort);
      setLabs((prev) =>
        prev.map((l) => (l.id === labId ? { ...l, components: [...l.components, comp] } : l))
      );
      if (currentLab?.id === labId) {
        setCurrentLab((prev) => (prev ? { ...prev, components: [...prev.components, comp] } : null));
      }
      showToast(`Added ${name} to lab!`);
      return comp;
    } catch (err: unknown) {
      showToast(`Failed to add: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleDeleteComponent = async (labId: string, compId: string) => {
    try {
      const updatedLab = await api.deleteComponent(labId, compId);
      setLabs((prev) => prev.map((l) => (l.id === labId ? updatedLab : l)));
      if (currentLab?.id === labId) {
        setCurrentLab(updatedLab);
      }
      showToast(`Deleted component successfully`);
    } catch (err: unknown) {
      showToast(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleOpenTerminalForComponent = (compId: string) => {
    handleSelectComponent(compId);
    setCurrentTab('terminal');
  };

  const activeLabCount = labs.filter((l) => l.status === 'Running').length;

  if (showSplash) {
    return (
      <LoadingScreen
        capabilities={capabilities}
        onComplete={() => setShowSplash(false)}
        onRefreshCapabilities={handleRefreshCapabilities}
      />
    );
  }

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
        <main className="flex-1 overflow-hidden relative bg-[#FAF7EE]">
          <div className={currentTab === 'dashboard' ? 'h-full flex flex-col overflow-y-auto' : 'hidden'}>
            <DashboardView
              labs={labs}
              capabilities={capabilities}
              onQuickStart={(tmpl) =>
                handleCreateLab(
                  tmpl === 'ubuntu-vps'
                    ? 'Ubuntu 24.04 LTS Cloud Lab'
                    : tmpl === 'vps-web'
                    ? 'Full Stack Linux Lab'
                    : 'Custom Cloud Lab',
                  tmpl === 'ubuntu-vps'
                    ? 'Dedicated official Ubuntu 24.04 LTS environment with full Bash shell and apt'
                    : 'Dedicated container playground environment',
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
          </div>

          <div className={currentTab === 'labs' ? 'h-full flex flex-col' : 'hidden'}>
            <LabsView
              labs={labs}
              currentLab={currentLab}
              onSelectLab={setCurrentLab}
              onCreateLab={handleCreateLab}
              onAddComponent={handleAddComponent}
              onStartComponent={handleStartComponent}
              onStopComponent={handleStopComponent}
              onDeleteComponent={handleDeleteComponent}
              onOpenTerminal={handleOpenTerminalForComponent}
              onViewLogs={handleOpenTerminalForComponent}
            />
          </div>

          <div className={currentTab === 'designer' ? 'p-4 h-full' : 'hidden'}>
            <TopologyView
              components={currentLab?.components || []}
              onSelectComponent={setSelectedComponentId}
              onOpenTerminal={handleOpenTerminalForComponent}
            />
          </div>

          {/* Persistent Keep-Alive Terminal View */}
          <div className={currentTab === 'terminal' ? 'h-full flex flex-col' : 'hidden'}>
            <VpsManagerView
              components={currentLab?.components || []}
              selectedComponentId={selectedComponentId}
              onSelectComponent={handleSelectComponent}
              onStartComponent={handleStartComponent}
              onStopComponent={handleStopComponent}
              onDeleteComponent={handleDeleteComponent}
            />
          </div>

          {/* Persistent Keep-Alive Internet Simulator View */}
          <div className={currentTab === 'browser' ? 'h-full flex flex-col' : 'hidden'}>
            <BuiltinBrowserView
              currentLab={currentLab}
              gatewayPort={capabilities?.gateway_port || 18080}
            />
          </div>

          {currentTab === 'web' && <WebServersView currentLab={currentLab} />}

          <div className={currentTab === 'dns' ? 'h-full flex flex-col' : 'hidden'}>
            <DnsManagerView
              currentLab={currentLab}
              gatewayPort={capabilities?.gateway_port || 18080}
            />
          </div>

          {currentTab === 'databases' && <DatabasesView currentLab={currentLab} />}

          {currentTab === 'diagnostics' && <NetworkTesterView />}

          <div className={currentTab === 'gateway' ? 'h-full flex flex-col' : 'hidden'}>
            <GatewayView
              currentLab={currentLab}
              gatewayPort={capabilities?.gateway_port || 18080}
            />
          </div>

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
        <div className="fixed bottom-6 right-6 z-50 bg-[#FEF08A] border-2 border-stone-900 text-stone-900 px-4 py-2.5 rounded-xl shadow-[4px_4px_0px_#18181B] text-xs font-black font-mono flex items-center gap-2 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-stone-900" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
