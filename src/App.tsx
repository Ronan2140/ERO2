import React, { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { LiveVisualization } from './components/LiveVisualization';
import { ResultsDashboard } from './components/ResultsDashboard';
import { runSimulation } from './simulationEngine';
import { ScenarioType, SimulationConfig, SimulationResult } from './types';
import { Activity } from 'lucide-react';
import * as XLSX from 'xlsx';

const DEFAULT_CONFIG: SimulationConfig = {
  scenario: ScenarioType.WATERFALL,
  duration: 10000,
  executionServerCount: 4,
  executionQueueCapacity: 50,
  resultQueueCapacity: 20,
  resultServerSpeed: 1,
  enableBackup: false,
  arrivalRateIng: 0.2, // % chance per tick
  serviceDurationIng: 15, // ticks to process
  arrivalRatePrepa: 0.05, // % chance
  serviceDurationPrepa: 40, // ticks
  damBlockDuration: 50,
  damOpenDuration: 25
};

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'LIVE' | 'RESULTS'>('RESULTS');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationHistory, setSimulationHistory] = useState({});

  const handleRunSimulation = (numIterations: any = 1) => {
    const iterations = typeof numIterations === 'number' ? numIterations : 1;
    setIsSimulating(true);
  
    setTimeout(() => {
      const configKey = config.scenario == ScenarioType.WATERFALL ? `W_K${config.executionServerCount}_Q1${config.executionQueueCapacity}_Q2${config.resultQueueCapacity}_l${config.arrivalRateIng * 100}_d${config.serviceDurationIng}_${config.duration/1000}t` : 
                        `C_K${config.executionServerCount}_Q1${config.executionQueueCapacity}_Q2${config.resultQueueCapacity}_l${config.arrivalRateIng * 100}_${config.arrivalRatePrepa * 100}_d${config.serviceDurationIng}_${config.serviceDurationPrepa}_${config.duration/1000}t`;
      
      let summaryStats: any[] = [];
      let lastResult: SimulationResult | null = null;
  
      for (let i = 0; i < iterations; i++) {
        const results = runSimulation(config);
        lastResult = results;
        
        const stats = results.stats;
        
        summaryStats.push({
          Date: new Date().toLocaleString(),
          Scenario: config.scenario,
          Serveurs: config.executionServerCount,
          Cap_Q1: config.executionQueueCapacity,
          Cap_Q2: config.resultQueueCapacity,
          Flux_ING: config.arrivalRateIng,
          Flux_Prepa: config.arrivalRatePrepa,
          
          // GLOBAL
          Total_Agents: stats.totalAgents,
          Taux_Rejet_Global: ((stats.dropRateExec + stats.dropRateResult) * 100).toFixed(2) + "%",
          Temps_Sejour_Moyen: stats.avgSystemTime.toFixed(2),
          Utilisation_Serveurs: (stats.serverUtilization * 100).toFixed(2) + "%",
          
          // ING SPECIFIC
          ING_Wait: stats.ing.avgWaitTime.toFixed(2),
          ING_Drop: (stats.ing.dropRate * 100).toFixed(2) + "%",
          
          // PREPA SPECIFIC
          PREPA_Wait: stats.prepa.avgWaitTime.toFixed(2),
          PREPA_Drop: (stats.prepa.dropRate * 100).toFixed(2) + "%",
        });
      }
  
      setSimulationResult(lastResult);
      
      setSimulationHistory((prev: any) => ({
        ...prev,
        [configKey]: [...(prev[configKey] || []), ...summaryStats]
      }));
  
      setIsSimulating(false);
      setActiveTab('RESULTS');
    }, 100);
  };

  const exportHistoryToExcel = () => {
    const wb = XLSX.utils.book_new();
    const summaryRows = [];

    Object.keys(simulationHistory).forEach(key => {
      const data = simulationHistory[key];
      
      if (data.length > 0) {
        const avgSejour = data.reduce((acc, d) => acc + parseFloat(d.Temps_Sejour_Moyen), 0) / data.length;
        const avgRejet = data.reduce((acc, d) => acc + parseFloat(d.Taux_Rejet_Global), 0) / data.length;
        const avgIngWait = data.reduce((acc, d) => acc + parseFloat(d.ING_Wait), 0) / data.length;
        const avgPrepaWait = data.reduce((acc, d) => acc + parseFloat(d.PREPA_Wait), 0) / data.length;

        summaryRows.push({
          Configuration: key,
          Nb_Simulations: data.length,
          MOY_Temps_Sejour: avgSejour.toFixed(2),
          MOY_Taux_Rejet: avgRejet.toFixed(2) + "%",
          MOY_Attente_ING: avgIngWait.toFixed(2),
          MOY_Attente_PREPA: avgPrepaWait.toFixed(2)
        });
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const sheetName = key.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "RESUME_STATISTIQUE");

    XLSX.writeFile(wb, `ERO2_Benchmark_Consolide_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      
      <ControlPanel 
        config={config} 
        setConfig={setConfig} 
        onRun={handleRunSimulation} 
        onSave={exportHistoryToExcel}
        isRunning={isSimulating}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <Activity size={20} />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Moulinette Simulator <span className="text-slate-400 font-normal">v2.0</span></h1>
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