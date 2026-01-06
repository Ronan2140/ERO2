import React, { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { LiveVisualization } from './components/LiveVisualization';
import { ResultsDashboard } from './components/ResultsDashboard';
import { runSimulation } from './simulationEngine';
import { ScenarioType, SimulationConfig, SimulationResult } from './types';
import { Activity } from 'lucide-react';

const DEFAULT_CONFIG: SimulationConfig = {
  scenario: ScenarioType.WATERFALL,
  duration: 1000,
  executionServerCount: 4,
  executionQueueCapacity: 50,
  resultQueueCapacity: 20,
  resultServerSpeed: 1,
  enableBackup: false,
  arrivalRateIng: 0.2, // % chance per tick
  serviceDurationIng: 15, // ticks to process
  arrivalRatePrepa: 0.05, // % chance
  serviceDurationPrepa: 40, // ticks
  damBlockDuration: 50 // blocks for 50, open for 25
};

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'LIVE' | 'RESULTS'>('RESULTS');
  const [isSimulating, setIsSimulating] = useState(false);

  const handleRunSimulation = () => {
    setIsSimulating(true);
    // Use setTimeout to allow UI to update to "processing" state if calculation is heavy
    setTimeout(() => {
      const results = runSimulation(config);
      setSimulationResult(results);
      setIsSimulating(false);
    }, 100);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      
      {/* Sidebar Controls */}
      <ControlPanel 
        config={config} 
        setConfig={setConfig} 
        onRun={handleRunSimulation} 
        isRunning={isSimulating}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navigation */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <Activity size={20} />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Moulinette Simulator <span className="text-slate-400 font-normal">v1.0</span></h1>
          </div>
          
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
          <button 
               onClick={() => setActiveTab('RESULTS')}
               className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'RESULTS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Résultats & Data
             </button>
             <button 
               onClick={() => setActiveTab('LIVE')}
               className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'LIVE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Visualisation
             </button>
             
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-hidden relative">
           {activeTab === 'LIVE' ? (
             <LiveVisualization results={simulationResult} config={config} />
           ) : (
             <ResultsDashboard results={simulationResult} scenario={config.scenario} />
           )}
        </main>
      </div>
    </div>
  );
};

export default App;