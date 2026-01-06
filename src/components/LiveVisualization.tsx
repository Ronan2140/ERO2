import React, { useState, useEffect } from 'react';
import { SimulationResult, Agent, AgentType, ScenarioType } from '../types';
import { Play, Pause, RotateCcw, Zap } from 'lucide-react';

interface Props {
  results: SimulationResult | null;
  config: any;
}

// État de l'agent (Inchangé)
const getAgentStatusAtTick = (agent: Agent, tick: number): string => {
  if (tick < agent.entryTick) return 'WAITING';
  if (agent.status === 'DROPPED_EXEC' && tick >= agent.entryTick) return 'DROPPED_EXEC';
  if (!agent.startExecutionTick || tick < agent.startExecutionTick) return 'QUEUED_EXEC';
  if (!agent.endExecutionTick || tick < agent.endExecutionTick) return 'PROCESSING';
  if (agent.status === 'DROPPED_RESULT' && tick >= agent.endExecutionTick) return 'DROPPED_RESULT';
  if (!agent.enterResultQueueTick || tick < agent.enterResultQueueTick) return 'TRANSITION_TO_Q2'; 
  if (!agent.startResultTick || tick < agent.startResultTick) return 'QUEUED_RESULT';
  if (!agent.endResultTick || tick < agent.endResultTick) return 'SENDING';
  return 'COMPLETED';
};

export const LiveVisualization: React.FC<Props> = ({ results, config }) => {
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(200);

  // Reset
  useEffect(() => {
    setCurrentTick(0);
    setIsPlaying(false);
  }, [results]);

  // Boucle de lecture
  useEffect(() => {
    if (isPlaying && results) {
      const interval = setInterval(() => {
        setCurrentTick((prev) => {
          if (prev >= config.duration - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
      return () => clearInterval(interval);
    }
  }, [isPlaying, results, config.duration, playbackSpeed]);

  // --- CONFIGURATION DU LAYOUT ---
  const BOX_TOP_Y = 15;     
  const BOX_BOTTOM_Y = 85;  
  const AGENT_BASE_Y = 82;  

  const getAgentPosition = (
    agent: Agent, 
    tick: number, 
    indexInGroup: number, 
    groupSize: number,
    globalDroppedIndex: number = -1
  ) => {
    const status = getAgentStatusAtTick(agent, tick);
    
    let x = -5;
    let y = 50;
    let opacity = 1;
    let scale = 1;

    // Colonnes (X)
    const COL_DROPPED_START = 5;
    const COL_Q1_START = 22;
    const COL_SERVERS_CENTER = 50;
    const COL_Q2_START = 65;
    const COL_OUTPUT_CENTER = 90;

    switch (status) {
      case 'WAITING':
        x = -5; y = 50; opacity = 0;
        break;

      case 'DROPPED_EXEC':
      case 'DROPPED_RESULT':
        const colsDropped = 4;
        const colDropped = globalDroppedIndex % colsDropped;
        const rowDropped = Math.floor(globalDroppedIndex / colsDropped);
        
        x = COL_DROPPED_START + 2 + (colDropped * 2.5);
        y = AGENT_BASE_Y - (rowDropped * 2); 
        if (y < 20) opacity = 0; 
        break;

      case 'QUEUED_EXEC':
        const colsQ1 = 5; 
        const colQ1 = indexInGroup % colsQ1;
        const rowQ1 = Math.floor(indexInGroup / colsQ1);
        
        x = COL_Q1_START + 1.5 + (colQ1 * 3);
        y = AGENT_BASE_Y - (rowQ1 * 2.5); 
        
        if (y < BOX_TOP_Y) { opacity = 0; } 
        break;

      case 'PROCESSING':
        const serverId = agent.assignedServerId !== undefined ? agent.assignedServerId : agent.id % config.executionServerCount;
        const serverAreaHeight = BOX_BOTTOM_Y - BOX_TOP_Y;
        const singleServerHeight = serverAreaHeight / config.executionServerCount;
        const slotTopY = BOX_TOP_Y + (serverId * singleServerHeight);
        
        x = COL_SERVERS_CENTER;
        y = slotTopY + (singleServerHeight / 2); 
        break;

      case 'TRANSITION_TO_Q2':
        x = 58; y = 50; scale = 0.5;
        break;

      case 'QUEUED_RESULT':
        const colsQ2 = 5;
        const colQ2 = indexInGroup % colsQ2;
        const rowQ2 = Math.floor(indexInGroup / colsQ2);
        
        x = COL_Q2_START + 1.5 + (colQ2 * 3);
        y = AGENT_BASE_Y - (rowQ2 * 2.5);
        
        if (y < BOX_TOP_Y) { opacity = 0; }
        break;

      case 'SENDING':
        x = COL_OUTPUT_CENTER; y = 50;
        break;

      case 'COMPLETED':
        x = 105; y = 50; opacity = 0;
        break;
    }

    return { x, y, opacity, scale, status };
  };

  if (!results) {
    return (
       <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <Zap size={48} className="mx-auto mb-4 text-blue-400 opacity-50" />
          <h3 className="text-lg font-semibold text-slate-700">Simulation non lancée</h3>
        </div>
      </div>
    );
  }

  // Filtrage
  const activeAgents = results.agents.filter(a => 
    a.entryTick <= currentTick && 
    ((a.status !== 'COMPLETED' && !a.status.includes('DROPPED')) || 
      (a.endResultTick && currentTick < a.endResultTick + 5) || 
      (a.status.includes('DROPPED')))
  );

  const agentsByStatus: Record<string, Agent[]> = {
    'QUEUED_EXEC': [], 'PROCESSING': [], 'QUEUED_RESULT': [], 'SENDING': [],
    'COMPLETED': [], 'DROPPED_EXEC': [], 'DROPPED_RESULT': []
  };

  activeAgents.forEach(agent => {
    const status = getAgentStatusAtTick(agent, currentTick);
    if (agentsByStatus[status]) agentsByStatus[status].push(agent);
    else agentsByStatus[status] = [agent];
  });
  
  const allDropped = [
    ...(agentsByStatus['DROPPED_EXEC'] || []),
    ...(agentsByStatus['DROPPED_RESULT'] || [])
  ].sort((a, b) => a.id - b.id);

  const serverCount = config.executionServerCount;
  const damOpen = results.timeline[currentTick]?.damOpen ?? true;
  const totalDroppedSoFar = results.timeline[currentTick]?.droppedCount || 0;

  const containerStyle = {
    top: `${BOX_TOP_Y}%`, 
    bottom: `${100 - BOX_BOTTOM_Y}%`
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans overflow-hidden">
      
      {/* Barre de Contrôle */}
      <div className="bg-white p-3 border-b border-slate-200 flex items-center justify-between shrink-0 z-30 shadow-sm h-16 relative">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 rounded-lg p-1">
             <button onClick={() => setIsPlaying(!isPlaying)} className={`p-2 rounded-md transition-all ${isPlaying ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
             </button>
             <button onClick={() => { setIsPlaying(false); setCurrentTick(0); }} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md">
                <RotateCcw size={18} />
             </button>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Temps</span>
            <span className="text-sm font-mono font-bold text-slate-800">{currentTick} / {config.duration}</span>
          </div>
        </div>

        <input 
          type="range" min="0" max={config.duration}
          value={currentTick} 
          onChange={(e) => { setIsPlaying(false); setCurrentTick(parseInt(e.target.value)); }}
          className="w-1/3 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />

        <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Vitesse</span>
             <input 
              type="range" min="10" max="500" step="10" 
              value={510 - playbackSpeed}
              onChange={(e) => setPlaybackSpeed(510 - parseInt(e.target.value))}
              className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500"
            />
        </div>
      </div>

      {/* --- ZONE VISUELLE --- */}
      <div className="flex-1 relative bg-slate-50 overflow-hidden select-none">
        
        {/* CALQUE 1 : STRUCTURE (ARRIÈRE-PLAN) */}
        <div className="absolute inset-0 pointer-events-none">
           
           {/* TITRES COLONNES */}
           <div className="absolute top-4 w-full flex text-center text-xs font-bold text-slate-400 uppercase tracking-wider z-0">
              <div className="absolute left-[5%] w-[12%] text-red-400">Rejets</div>
              <div className="absolute left-[22%] w-[15%]">Arrivée (File 1)</div>
              <div className="absolute left-[45%] w-[10%]">Serveurs (K={serverCount})</div>
              <div className="absolute left-[65%] w-[15%]">File Retour</div>
              <div className="absolute left-[85%] w-[10%]">Sortie</div>
           </div>

           {/* COLONNE 0 : TRASH BIN (Rejets) */}
           <div className="absolute left-[5%] w-[12%] border-2 border-dashed border-red-200 bg-red-50/30 rounded-2xl flex flex-col justify-end" style={containerStyle}>
              {/* MODIFIÉ: Positionné en dessous (-bottom-6) */}
              <div className="absolute -bottom-6 w-full text-center text-xs font-bold text-red-400">
                {totalDroppedSoFar} Perdus
              </div>
           </div>

           {/* COLONNE 1 : CONTAINER FILE EXECUTION */}
           <div className="absolute left-[22%] w-[15%] border-2 border-slate-300 bg-white rounded-2xl flex flex-col justify-end shadow-sm" style={containerStyle}>
              {/* MODIFIÉ: Positionné en dessous (-bottom-6) */}
              <div className="absolute -bottom-6 w-full text-center text-xs font-mono text-slate-500">
                 {agentsByStatus['QUEUED_EXEC']?.length || 0} / {config.executionQueueCapacity || '∞'}
              </div>
           </div>
           
           {/* BARRAGE (VISUEL) */}
           {config.scenario === ScenarioType.CHANNELS_DAMS && (
              <div className={`absolute left-[22%] w-[15%] h-1 transition-colors duration-300 z-20 ${damOpen ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-red-500 shadow-[0_0_15px_rgba(248,113,113,0.8)]'}`}
                   style={{ top: `${BOX_TOP_Y - 2}%` }}>
                 <span className={`absolute -top-5 left-0 w-full text-center text-[9px] font-bold ${damOpen ? 'text-green-600' : 'text-red-600'}`}>
                    {damOpen ? 'OUVERT' : 'FERMÉ'}
                 </span>
              </div>
           )}

           {/* COLONNE 2 : SERVEURS (RECTANGLES) */}
           <div className="absolute left-[45%] w-[10%] flex flex-col gap-1" style={{ top: `${BOX_TOP_Y}%`, bottom: `${100 - BOX_BOTTOM_Y}%` }}>
               {Array.from({length: serverCount}).map((_, i) => (
                 <div key={i} className="w-full flex-1 border-2 border-slate-300 bg-white rounded-lg flex items-center justify-center relative shadow-sm">
                    <span className="absolute top-1 left-1 text-[9px] text-slate-300 font-mono">#{i+1}</span>
                 </div>
               ))}
           </div>

           {/* COLONNE 3 : CONTAINER FILE RESULTAT */}
           <div className="absolute left-[65%] w-[15%] border-2 border-slate-300 bg-white rounded-2xl shadow-sm" style={containerStyle}>
               {/* MODIFIÉ: Positionné en dessous (-bottom-6) */}
               <div className="absolute -bottom-6 w-full text-center text-xs font-mono text-slate-500">
                 {agentsByStatus['QUEUED_RESULT']?.length || 0} / {config.resultQueueCapacity || '∞'}
              </div>
           </div>

           {/* COLONNE 4 : SERVEUR SORTIE */}
           <div className="absolute top-[40%] bottom-[40%] left-[90%] w-[5%] border-2 border-emerald-200 bg-emerald-50/30 rounded-xl flex items-center justify-center">
              <span className="text-[10px] text-emerald-400 font-bold uppercase rotate-90">Envoi</span>
           </div>

        </div>

        {/* CALQUE 2 : AGENTS (POINTS ANIMÉS) */}
        <div className="absolute inset-0">
          {activeAgents.map(agent => {
             const status = getAgentStatusAtTick(agent, currentTick);
             const group = agentsByStatus[status] || [];
             const indexInGroup = group.findIndex(a => a.id === agent.id); 
             
             let globalDroppedIndex = -1;
             if (status.includes('DROPPED')) {
                globalDroppedIndex = allDropped.findIndex(a => a.id === agent.id);
             }

             const { x, y, opacity, scale } = getAgentPosition(agent, currentTick, indexInGroup, group.length, globalDroppedIndex);

             return (
               <div
                 key={agent.id}
                 className="absolute w-3 h-3 rounded-full shadow-sm border border-white/40"
                 style={{
                   left: `${x}%`,
                   top: `${y}%`,
                   opacity: opacity,
                   transform: `translate(-50%, -50%) scale(${scale})`, 
                   backgroundColor: status.includes('DROPPED') ? '#ef4444' : (agent.type === AgentType.ING ? '#2563eb' : '#9333ea'),
                   transition: 'left 0.4s ease-in-out, top 0.4s ease-in-out, opacity 0.3s, transform 0.3s',
                   zIndex: status === 'PROCESSING' || status === 'SENDING' ? 20 : 10
                 }}
               >
               </div>
             );
          })}
        </div>

        {/* LÉGENDE STATIQUE */}
        <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-lg border border-slate-200 shadow-sm text-xs text-slate-600 backdrop-blur-sm z-40">
           <div className="flex items-center gap-2 mb-1">
             <div className="w-3 h-3 bg-blue-600 rounded-full"></div> <span>Étudiant Standard</span>
           </div>
           <div className="flex items-center gap-2 mb-1">
             <div className="w-3 h-3 bg-purple-600 rounded-full"></div> <span>Étudiant PREPA</span>
           </div>
           <div className="flex items-center gap-2 mb-1">
             <div className="w-3 h-3 bg-red-500 rounded-full"></div> <span>Rejet (Perte)</span>
           </div>
        </div>

      </div>

    </div>
  );
};