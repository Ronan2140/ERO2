import React, { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { LiveVisualization } from './components/LiveVisualization';
import { ResultsDashboard } from './components/ResultsDashboard';
import { runSimulation } from './simulationEngine';
import { ScenarioType, SimulationConfig, SimulationResult, simulationHistoryType } from './types';
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
  arrivalRateIng: 0.2,
  serviceDurationIng: 15,
  arrivalRatePrepa: 0.05,
  serviceDurationPrepa: 40,
  damBlockDuration: 50,
  damOpenDuration: 25
};

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'LIVE' | 'RESULTS'>('RESULTS');
  const [isSimulating, setIsSimulating] = useState(false);

  // Structure : Record<CléConfigString, { config: ObjetConfig, results: ListeStats }>
  const [simulationHistory, setSimulationHistory] = useState<Record<string, simulationHistoryType>>({});

  const handleRunSimulation = (numIterations: any = 1) => {
    const iterations = typeof numIterations === 'number' ? numIterations : 1;
    setIsSimulating(true);

    setTimeout(() => {
      // Clé unique basée sur l'objet config complet
      const configKey = JSON.stringify(config);

      let currentIterationStats: any[] = [];
      let lastResult: SimulationResult | null = null;

      // Accumulateurs pour le calcul des moyennes sur N itérations
      let accStats = {
        avgWaitTime: 0,
        avgSystemTime: 0,
        serverUtilization: 0,
        dropRateTotal: 0
      };

      for (let i = 0; i < iterations; i++) {
        const results = runSimulation(config);
        lastResult = results;
        const s = results.stats;

        accStats.avgWaitTime += s.avgWaitTime;
        accStats.avgSystemTime += s.avgSystemTime;
        accStats.serverUtilization += s.serverUtilization;
        accStats.dropRateTotal += (s.dropRateExec + s.dropRateResult);

        currentIterationStats.push({
          Date: new Date().toLocaleString(),
          Iteration: i + 1,
          Total_Agents: s.totalAgents,
          Taux_Rejet_Global: ((s.dropRateExec + s.dropRateResult) * 100).toFixed(2) + "%",
          Temps_Sejour_Moyen: s.avgSystemTime.toFixed(2),
          Utilisation_Serveurs: (s.serverUtilization * 100).toFixed(2) + "%",
          ING_Wait: s.ing.avgWaitTime.toFixed(2),
          PREPA_Wait: s.prepa.avgWaitTime.toFixed(2),
          Sigma: s.sigma.toFixed(2)
        });
      }

      // Mise à jour de l'affichage Dashboard avec les moyennes
      if (lastResult) {
        setSimulationResult({
          ...lastResult,
          stats: {
            ...lastResult.stats,
            avgWaitTime: accStats.avgWaitTime / iterations,
            avgSystemTime: accStats.avgSystemTime / iterations,
            serverUtilization: accStats.serverUtilization / iterations,
          }
        });
      }

      // Enregistrement dans l'historique Record Config -> Results
      setSimulationHistory((prev) => {
        const existingEntry = prev[configKey] || { config: { ...config }, results: [] };
        return {
          ...prev,
          [configKey]: {
            ...existingEntry,
            results: [...existingEntry.results, ...currentIterationStats]
          }
        };
      });

      setIsSimulating(false);
      setActiveTab('RESULTS');
    }, 100);
  };

  const exportHistoryToExcel = () => {
    const wb = XLSX.utils.book_new();
    const summaryRows: any[] = [];
    if (Object.keys(simulationHistory).length === 0) {
      alert("Aucune donnée d'historique à exporter.");
      return;
    }
    Object.entries(simulationHistory).forEach(([configKey, historyEntry], index) => {
      const { config: entryConfig, results } = historyEntry;
      if (results.length === 0) return;

      // Création du bloc de paramètres (Clé / Valeur)
      const configParams = [
        ["PARAMÈTRES DE LA CONFIGURATION", ""],
        ["ID Interne", `Config_${index + 1}`],
        ["Scénario", entryConfig.scenario],
        ["Ticks Simulation", entryConfig.duration],
        ["Serveurs d'exécution (K)", entryConfig.executionServerCount],
        ["Capacité File Entrée (ks)", entryConfig.executionQueueCapacity],
        ["Capacité File Sortie (kf)", entryConfig.resultQueueCapacity],
        ["Vitesse Serveur Sortie", entryConfig.resultServerSpeed],
        ["Backup Système", entryConfig.enableBackup ? "Activé" : "Désactivé"],
        ["Taux Arrivée ING (λ)", entryConfig.arrivalRateIng],
        ["Durée Service ING (d)", entryConfig.serviceDurationIng],
      ];

      if (entryConfig.scenario === ScenarioType.CHANNELS_DAMS) {
        configParams.push(
          ["Taux Arrivée PREPA (λ)", entryConfig.arrivalRatePrepa],
          ["Durée Service PREPA (d)", entryConfig.serviceDurationPrepa],
          ["Cycle Barrage (Fermé/Ouvert)", `${entryConfig.damBlockDuration}/${entryConfig.damOpenDuration}`]
        );
      }

      configParams.push(["", ""], ["RÉSULTATS DES SIMULATIONS (BENCHMARK)", ""]);

      // Génération de la feuille Excel
      const ws = XLSX.utils.aoa_to_sheet(configParams);
      // Ajout des données JSON sous le bloc paramètres
      XLSX.utils.sheet_add_json(ws, results, { origin: configParams.length - 1 });

      // Calcul des métriques pour l'onglet de résumé
      const avgSejour = results.reduce((acc, r) => acc + parseFloat(r.Temps_Sejour_Moyen), 0) / results.length;
      const avgRejet = results.reduce((acc, r) => acc + parseFloat(r.Taux_Rejet_Global), 0) / results.length;

      summaryRows.push({
        Configuration: `Config ${index + 1}`,
        TotalAgent: results.reduce((acc, r) => acc + parseInt(r.Total_Agents), 0) / results.length,
        Scenario: entryConfig.scenario,
        Tests_Effectues: results.length,
        Moy_Sejour: avgSejour.toFixed(2),
        Moy_Rejet: avgRejet.toFixed(2) + "%",
        K: entryConfig.executionServerCount,
        Lambda_ING: entryConfig.arrivalRateIng
      });

      // Nom d'onglet : C_1_WATERFALL_blabla...
      const sheetName = `C${index + 1}_${entryConfig.scenario.substring(0, 10)}`.replace(/[\\\/\?\*\[\]]/g, "_");
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "SYNTHESE_GLOBALE");

    XLSX.writeFile(wb, `ERO2_Benchmark_Final_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              Moulinette Simulator <span className="text-slate-400 font-normal">v2.1</span>
            </h1>
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