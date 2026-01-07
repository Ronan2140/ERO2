import React from 'react';
import { ScenarioType, SimulationConfig } from '../types';
import { Settings, Play, Info } from 'lucide-react';
import { useState } from 'react';

interface Props {
  config: SimulationConfig;
  setConfig: React.Dispatch<React.SetStateAction<SimulationConfig>>;
  onRun: (iterations: number) => void;
  isRunning: boolean;
  onSave?: () => void;
}

const LabelWithTooltip: React.FC<{ label: string; help: string; position?: 'top' | 'bottom'; children?: React.ReactNode }> = ({ label, help, position = 'top', children }) => (
  <div className="flex items-center mb-1 gap-1.5">
    <label className="text-xs text-slate-500 block">{label}</label>
    <div className="group relative flex items-center">
      <Info size={12} className="text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
      <div className={`absolute left-0 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} w-52 p-2.5 bg-slate-800 text-slate-100 text-[10px] leading-snug rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-slate-700`}>
        {help}
        <div className={`absolute left-1.5 ${position === 'top' ? 'top-full border-t-slate-800' : 'bottom-full border-b-slate-800'} border-4 border-transparent`}></div>
      </div>
    </div>
    {children}
  </div>
);

export const ControlPanel: React.FC<Props> = ({ config, setConfig, onRun, isRunning, onSave }) => {
  
  const [iterations, setIterations] = useState(1);

  const handleChange = (key: keyof SimulationConfig, value: number | boolean | string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto h-full flex flex-col gap-6 font-sans text-slate-900">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="text-slate-700" size={24} />
        <h2 className="text-xl font-bold text-slate-800">Configuration</h2>
      </div>

      {/* Scenario Selection */}
      <div className="space-y-2">
        <LabelWithTooltip 
          label="Scénario" 
          help="Le modèle 'Waterfall' est un flux continu simple. Le modèle 'Channels' introduit une régulation (barrage) et plusieurs populations."
          position="bottom"
        />
        <div className="flex bg-slate-200 rounded-lg p-1">
          <button
            onClick={() => handleChange('scenario', ScenarioType.WATERFALL)}
            className={`flex-1 py-1 px-2 text-sm rounded-md transition-all ${config.scenario === ScenarioType.WATERFALL ? 'bg-white shadow text-blue-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Waterfall
          </button>
          <button
            onClick={() => handleChange('scenario', ScenarioType.CHANNELS_DAMS)}
            className={`flex-1 py-1 px-2 text-sm rounded-md transition-all ${config.scenario === ScenarioType.CHANNELS_DAMS ? 'bg-white shadow text-blue-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Channels
          </button>
        </div>
      </div>

      {/* Common Parameters */}
      <div className="space-y-4 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Resources (Moulinette)</h3>
        
        {/* Durée de Simulation */}
        <div>
          <LabelWithTooltip 
            label="Durée Simulation (T)" 
            help="Nombre total de ticks simulés par run. Plus T est grand, plus les statistiques sont stables."
          />
          <div className="flex items-center gap-2">
            <input 
              type="range" min="100" max="10000" step="100" 
              value={config.duration} 
              onChange={(e) => handleChange('duration', parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-sm font-mono w-12 text-center bg-white px-1 rounded border border-slate-200 text-slate-700">{config.duration}</span>
          </div>
        </div>

        {/* Nombre de Serveurs d'Exécution */}
        <div>
          <LabelWithTooltip 
            label="Serveurs d'exécution (K)" 
            help="Nombre de processeurs disponibles pour exécuter les tests."
          />
          <div className="flex items-center gap-2">
            <input 
              type="range" min="1" max="20" step="1" 
              value={config.executionServerCount} 
              onChange={(e) => handleChange('executionServerCount', parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-sm font-mono w-12 text-center bg-white px-1 rounded border border-slate-200 text-slate-700">{config.executionServerCount}</span>
          </div>
        </div>

        {/* Capacité File d'Exécution */}
        <div>
          <LabelWithTooltip 
            label="Capacité File Exec (ks)" 
            help="Taille maximale de la file d'attente principale. Si elle est pleine, les nouvelles soumissions sont rejetées (Erreur 503)."
          >
             <span className="text-[10px] text-slate-400 italic">(0 = ∞)</span>
          </LabelWithTooltip>
          <div className="flex items-center gap-2">
            <input 
              type="range" min="0" max="100" step="5" 
              value={config.executionQueueCapacity} 
              onChange={(e) => handleChange('executionQueueCapacity', parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-sm font-mono w-12 text-center bg-white px-1 rounded border border-slate-200 text-slate-700">{config.executionQueueCapacity === 0 ? '∞' : config.executionQueueCapacity}</span>
          </div>
        </div>

        {/* Capacité File de Retour */}
        <div>
          <LabelWithTooltip 
            label="Capacité File Retour (kf)" 
            help="Taille maximale de la file de résultats. Si elle est pleine, le résultat calculé est perdu (Page blanche)."
          >
             <span className="text-[10px] text-slate-400 italic">(0 = ∞)</span>
          </LabelWithTooltip>
          <div className="flex items-center gap-2">
            <input 
              type="range" min="0" max="100" step="5" 
              value={config.resultQueueCapacity} 
              onChange={(e) => handleChange('resultQueueCapacity', parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-sm font-mono w-12 text-center bg-white px-1 rounded border border-slate-200 text-slate-700">{config.resultQueueCapacity === 0 ? '∞' : config.resultQueueCapacity}</span>
          </div>
        </div>

        {/* Vitesse Serveur Résultat */}
        <div>
          <LabelWithTooltip 
            label="Vitesse Serveur Résultat (μr)" 
            help="Temps nécessaire pour évacuer un résultat. Augmenter ce temps aide à saturer la File de retour (kf) pour observer des gaspillages de CPU."
          />
          <div className="flex items-center gap-2">
            <input 
              type="range" min="1" max="20" step="1" 
              value={config.resultServerSpeed} 
              onChange={(e) => handleChange('resultServerSpeed', parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
            <span className="text-sm font-mono w-12 text-center bg-white px-1 rounded border border-slate-200 text-slate-700">{config.resultServerSpeed}t</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
           <LabelWithTooltip 
             label="Backup Activé"
             help="Active un système de secours qui sauvegarde les résultats si la file de retour est pleine."
           />
           <button 
            onClick={() => handleChange('enableBackup', !config.enableBackup)}
            className={`w-10 h-6 rounded-full transition-colors relative ${config.enableBackup ? 'bg-green-500' : 'bg-slate-300'}`}
           >
             <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${config.enableBackup ? 'translate-x-4' : 'translate-x-0'}`} />
           </button>
        </div>
      </div>

      {/* Population Parameters */}
      <div className="space-y-4 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          {config.scenario === ScenarioType.WATERFALL ? 'Population' : 'Populations'}
        </h3>
        
        <div className="p-3 bg-white rounded border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-blue-600 mb-2 border-b border-blue-100 pb-1">{config.scenario === ScenarioType.WATERFALL ? 'Étudiants' : 'ING (Fréquent/Rapide)'}</div>
          
          <div className="mb-3">
            <LabelWithTooltip label="Taux d'arrivée (λ)" help="Probabilité qu'un étudiant soumette un travail à chaque tick." />
            <div className="flex items-center gap-2">
                <input 
                  type="range" min="0.05" max="0.95" step="0.05" 
                  value={config.arrivalRateIng} 
                  onChange={(e) => handleChange('arrivalRateIng', parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-mono w-12 text-center bg-slate-50 px-1 rounded border border-slate-200 text-slate-600">
                    {Math.round(config.arrivalRateIng * 100)}%
                </span>
            </div>
          </div>

          <div>
            <LabelWithTooltip label="Durée Service (µ)" help="Temps nécessaire au serveur pour traiter une soumission." />
            <div className="flex items-center gap-2">
                <input 
                  type="range" min="5" max="50" step="1" 
                  value={config.serviceDurationIng} 
                  onChange={(e) => handleChange('serviceDurationIng', parseInt(e.target.value))}
                  className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-mono w-12 text-center bg-slate-50 px-1 rounded border border-slate-200 text-slate-600">
                    {config.serviceDurationIng}t
                </span>
            </div>
          </div>
        </div>

        {config.scenario === ScenarioType.CHANNELS_DAMS && (
          <div className="p-3 bg-white rounded border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-purple-600 mb-2 border-b border-purple-100 pb-1">PREPA (Rare/Long)</div>
            <div className="mb-3">
              <LabelWithTooltip label="Taux d'arrivée (λ)" help="Probabilité d'arrivée pour la population PREPA." />
              <div className="flex items-center gap-2">
                <input type="range" min="0.01" max="0.5" step="0.01" value={config.arrivalRatePrepa} onChange={(e) => handleChange('arrivalRatePrepa', parseFloat(e.target.value))} className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                <span className="text-xs font-mono w-12 text-center bg-slate-50 px-1 rounded border border-slate-200 text-slate-600">{Math.round(config.arrivalRatePrepa * 100)}%</span>
              </div>
            </div>
            <div>
              <LabelWithTooltip label="Durée Service (µ)" help="Temps de traitement pour la population PREPA." />
              <div className="flex items-center gap-2">
                <input type="range" min="10" max="100" step="5" value={config.serviceDurationPrepa} onChange={(e) => handleChange('serviceDurationPrepa', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                <span className="text-xs font-mono w-12 text-center bg-slate-50 px-1 rounded border border-slate-200 text-slate-600">{config.serviceDurationPrepa}t</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dam Regulation - Asymmetric Control */}
      {config.scenario === ScenarioType.CHANNELS_DAMS && (
        <div className="space-y-4 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Régulation (Barrage)</h3>
          
          <div>
            <LabelWithTooltip label="Durée Fermeture (tb)" help="Temps de blocage des ING pour laisser passer les PREPA." />
            <div className="flex items-center gap-2">
              <input type="range" min="0" max="200" step="5" value={config.damBlockDuration} onChange={(e) => handleChange('damBlockDuration', parseInt(e.target.value))} className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500" />
              <span className="text-sm font-mono w-12 text-center bg-white px-1 rounded border border-slate-200 text-slate-700">{config.damBlockDuration}t</span>
            </div>
          </div>

          <div>
            <LabelWithTooltip label="Durée Ouverture (to)" help="Temps pendant lequel la vanne est ouverte pour les ING." />
            <div className="flex items-center gap-2">
              <input type="range" min="10" max="200" step="5" value={config.damOpenDuration} onChange={(e) => handleChange('damOpenDuration', parseInt(e.target.value))} className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600" />
              <span className="text-sm font-mono w-12 text-center bg-white px-1 rounded border border-slate-200 text-slate-700">{config.damOpenDuration}t</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 text-right">
              Cycle total : {config.damBlockDuration + config.damOpenDuration} ticks
            </p>
          </div>
        </div>
      )}

      {/* Footer / Run Controls */}
      <div className="mt-auto pt-4 space-y-3">
         <div className="bg-slate-200/50 p-2 rounded-lg border border-slate-200">
            <LabelWithTooltip label="Nombre d'itérations" help="Nombre de répétitions pour le benchmark statistique." />
            <div className="flex items-center gap-2">
              <input type="number" min="1" max="100" value={iterations} onChange={(e) => setIterations(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Runs</span>
            </div>
         </div>

         <button onClick={() => onRun(iterations)} disabled={isRunning} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
           <Play size={20} fill="currentColor" />
           {isRunning ? 'Calcul...' : iterations > 1 ? `Lancer ${iterations} simulations` : 'Lancer Simulation'}
         </button>

          {onSave && (
            <button onClick={onSave} className="w-full mt-2 py-2 text-xs text-slate-500 font-semibold border border-dashed border-slate-300 rounded-lg hover:bg-white hover:text-blue-600 transition-colors">
              Exporter le Benchmark Excel
            </button>
          )}
      </div>
    </div>
  );
};