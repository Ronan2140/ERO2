import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { SimulationResult, ScenarioType } from '../types';
import { Clock, AlertTriangle, Activity, GraduationCap, HardHat, ShieldAlert, Trash2 } from 'lucide-react';

interface Props {
  results: SimulationResult | null;
  scenario: ScenarioType;
}

type ViewMode = 'GLOBAL' | 'ING' | 'PREPA';

export const ResultsDashboard: React.FC<Props> = ({ results, scenario }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('GLOBAL');

  if (!results) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-full">
        <Activity size={64} className="mb-4 opacity-20" />
        <p className="text-lg">Lancez une simulation pour voir les résultats.</p>
      </div>
    );
  }

  // 1. Sélection des données selon la vue
  const stats = viewMode === 'GLOBAL' ? results.stats : (viewMode === 'ING' ? results.stats.ing : results.stats.prepa);

  // 2. Calcul des taux pour l'affichage (xx.x %)
  const rateExec = stats.dropRateExec * 100;
  const rateResult = stats.dropRateResult * 100;
  const totalDrop = rateExec + rateResult;

  // Données pour le graphique
  const chartData = results.timeline.length > 200
    ? results.timeline.filter((_, i) => i % Math.ceil(results.timeline.length / 200) === 0)
    : results.timeline;

  return (
    <div className="flex-1 p-8 overflow-y-auto h-full bg-slate-50 font-sans">

      {/* EN-TÊTE & SÉLECTEUR */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Analyse de Performance</h1>
          <p className="text-slate-500 text-sm">Vue : <span className="font-bold text-blue-600">{viewMode}</span></p>
        </div>

        <div className="flex bg-slate-200 p-1.5 rounded-xl gap-1 shadow-inner">
          <button
            onClick={() => setViewMode('GLOBAL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'GLOBAL' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Activity size={14} /> GLOBAL
          </button>
          <button
            onClick={() => setViewMode('ING')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'ING' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <HardHat size={14} /> ING
          </button>
          {scenario === ScenarioType.CHANNELS_DAMS && (
            <button
              onClick={() => setViewMode('PREPA')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'PREPA' ? 'bg-purple-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <GraduationCap size={14} /> PREPA
            </button>
          )}
        </div>
      </div>

      {/* GRILLE KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        {/* KPI 1 : TEMPS DE SÉJOUR */}
        <KpiCard
          title="Temps de Séjour Moyen"
          value={`${stats.avgSystemTime.toFixed(1)} t`}
          icon={<Clock size={20} />}
          sub={`Dont ${stats.avgWaitTime.toFixed(1)} t d'attente`}
          sub2={`Écart-type : ${results.stats.sigma.toFixed(1)} t`}
        />

        {/* KPI 2 : CARTE DE REJET DÉTAILLÉE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          {/* Total */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taux de Rejet Total</p>
              <h3 className={`text-3xl font-black mt-1 ${totalDrop > 20 ? 'text-red-600' : 'text-slate-800'}`}>
                {totalDrop.toFixed(1)}%
              </h3>
            </div>
            <div className={`p-3 rounded-xl ${totalDrop > 5 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
              <AlertTriangle size={24} />
            </div>
          </div>

          {/* Détails avec barres */}
          <div className="space-y-3 pt-4 border-t border-slate-50 mt-auto">
            {/* Barre Exec */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="flex items-center gap-1 text-slate-500"><ShieldAlert size={12} /> FILE 1 (EXEC)</span>
                <span className="text-slate-700">{rateExec.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full" style={{ width: `${rateExec}%` }}></div>
              </div>
            </div>
            {/* Barre Result */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="flex items-center gap-1 text-red-500"><Trash2 size={12} /> FILE 2 (RESULT)</span>
                <span className="text-red-600">{rateResult.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full" style={{ width: `${rateResult}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3 : UTILISATION OU VOLUME */}
        {viewMode === 'GLOBAL' ? (
          <KpiCard
            title="Utilisation Serveurs"
            value={`${(results.stats.serverUtilization * 100).toFixed(1)}%`}
            icon={<Activity size={20} />}
            sub="Charge moyenne des processeurs"
          />
        ) : (
          <KpiCard
            title="Volume Population"
            // @ts-ignore
            value={`${stats.count}`}
            icon={viewMode === 'ING' ? <HardHat size={20} /> : <GraduationCap size={20} />}
            sub="Nombre d'agents générés"
          />
        )}
      </div>

      {/* GRAPHIQUE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
        <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
          <Activity size={16} className="text-blue-500" /> Occupation des Files (Temps Réel)
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="time" hide />
            <YAxis fontSize={10} stroke="#94a3b8" axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            <Legend iconType="circle" />
            <Area type="monotone" dataKey="q1Length" name="File Exec (ks)" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
            <Area type="monotone" dataKey="q2Length" name="File Result (kf)" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, icon, sub, sub2 }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 mt-1">{value}</h3>
      </div>
      <div className="p-3 bg-slate-50 rounded-xl text-slate-400 border border-slate-100">{icon}</div>
    </div>
    <p className="text-[11px] text-slate-400 font-medium mt-auto">{sub}</p>
    {sub2 && <p className="text-[11px] text-slate-400 font-medium mt-1">{sub2}</p>}
  </div>
);