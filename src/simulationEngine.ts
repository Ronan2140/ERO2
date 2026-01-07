import {
  Agent,
  AgentType,
  ScenarioType,
  SimulationConfig,
  SimulationResult,
  TimeStepData,
  PopulationStats,
} from './types';

const shouldArrive = (rate: number): boolean => {
  return Math.random() < rate;
};

export const runSimulation = (config: SimulationConfig): SimulationResult => {
  const agents: Agent[] = [];
  const timeline: TimeStepData[] = [];

  let q1: Agent[] = [];
  let q2: Agent[] = [];

  const executionServersFreeAt: number[] = new Array(config.executionServerCount).fill(0);
  let resultServerFreeAt = 0;

  let nextAgentId = 1;
  let droppedExecCount = 0;
  let droppedResultCount = 0;
  let completedCount = 0;
  let isDamOpen = true;

  for (let tick = 0; tick < config.duration; tick++) {
    // 1. Barrage Cycle
    let damStatus = true;
    if (config.scenario === ScenarioType.CHANNELS_DAMS && config.damBlockDuration > 0) {
      const openTime = config.damOpenDuration ?? config.damBlockDuration;
      const fullCycle = config.damBlockDuration + openTime;
      const phase = tick % fullCycle;

      if (phase < config.damBlockDuration) {
        isDamOpen = false;
      } else {
        isDamOpen = true;
      }
      damStatus = isDamOpen;
    }

    // 2. Arrivals
    let newAgents: Agent[] = [];
    if (config.scenario === ScenarioType.WATERFALL) {
      if (shouldArrive(config.arrivalRateIng)) {
        newAgents.push(createAgent(nextAgentId++, AgentType.STANDARD, tick));
      }
    } else {
      if (shouldArrive(config.arrivalRateIng)) {
        newAgents.push(createAgent(nextAgentId++, AgentType.ING, tick));
      }
      if (shouldArrive(config.arrivalRatePrepa)) {
        newAgents.push(createAgent(nextAgentId++, AgentType.PREPA, tick));
      }
    }

    // 3. Queue 1 (Entrée)
    for (const agent of newAgents) {
      if (config.executionQueueCapacity > 0 && q1.length >= config.executionQueueCapacity) {
        agent.status = 'DROPPED_EXEC';
        droppedExecCount++;
      } else {
        q1.push(agent);
      }
      agents.push(agent);
    }

    // 4. Assign Execution Servers
    for (let i = 0; i < config.executionServerCount; i++) {
      if (executionServersFreeAt[i] <= tick && q1.length > 0) {
        // Logique de priorité : Si barrage fermé, on ne prend PAS les ING
        let agentIndex = -1;
        if (config.scenario === ScenarioType.CHANNELS_DAMS && !isDamOpen) {
          // Chercher le premier non-ING (donc un PREPA)
          agentIndex = q1.findIndex((a) => a.type !== AgentType.ING);
        } else {
          // FIFO standard
          agentIndex = 0;
        }

        if (agentIndex !== -1) {
          const agent = q1.splice(agentIndex, 1)[0];
          agent.startExecutionTick = tick;
          agent.status = 'PROCESSING';
          agent.assignedServerId = i;

          const duration =
            agent.type === AgentType.PREPA
              ? config.serviceDurationPrepa
              : config.serviceDurationIng;
          agent.endExecutionTick = tick + duration;
          executionServersFreeAt[i] = tick + duration;
        }
      }
    }

    // 5. Execution Complete -> Queue 2
    const finishedExecAgents = agents.filter(
      (a) => a.endExecutionTick === tick && a.status === 'PROCESSING'
    );
    for (const agent of finishedExecAgents) {
      agent.enterResultQueueTick = tick;
      if (config.resultQueueCapacity > 0 && q2.length >= config.resultQueueCapacity) {
        if (config.enableBackup) {
          agent.status = 'BACKUP_SAVED';
          agent.endResultTick = tick;
          completedCount++;
        } else {
          agent.status = 'DROPPED_RESULT';
          droppedResultCount++;
        }
      } else {
        agent.status = 'QUEUED_RESULT';
        q2.push(agent);
      }
    }

    // 6. Result Server
    if (resultServerFreeAt <= tick && q2.length > 0) {
      const agent = q2.shift()!;
      agent.startResultTick = tick;
      agent.status = 'SENDING';
      const duration = config.resultServerSpeed || 1;
      agent.endResultTick = tick + duration;
      resultServerFreeAt = tick + duration;
    }

    // 7. Result Complete
    const finishedResultAgents = agents.filter(
      (a) => a.endResultTick === tick && a.status === 'SENDING'
    );
    for (const agent of finishedResultAgents) {
      agent.status = 'COMPLETED';
      completedCount++;
    }

    // 8. Stats timeline
    const activeServers = executionServersFreeAt.filter((t) => t > tick).length;
    timeline.push({
      time: tick,
      q1Length: q1.length,
      q2Length: q2.length,
      activeServers,
      damOpen: damStatus,
      droppedCount: droppedExecCount + droppedResultCount,
      completedCount,
    });
  }

  // --- CALCUL DES STATS FINALES ---

  const getWait = (a: Agent) =>
    (a.startExecutionTick || 0) -
    a.entryTick +
    (a.startResultTick ? a.startResultTick - (a.enterResultQueueTick || 0) : 0);
  const getSystem = (a: Agent) =>
    (a.endResultTick || a.endExecutionTick || config.duration) - a.entryTick;

  // Helper pour calculer les stats d'une sous-population
  const calcPopStats = (type: AgentType): PopulationStats => {
    const subAgents = agents.filter((a) => a.type === type);
    const completed = subAgents.filter(
      (a) => a.status === 'COMPLETED' || a.status === 'BACKUP_SAVED'
    );
    const droppedE = subAgents.filter((a) => a.status === 'DROPPED_EXEC').length;
    const droppedR = subAgents.filter((a) => a.status === 'DROPPED_RESULT').length;
    const total = subAgents.length;

    const totalWait = completed.reduce((acc, a) => acc + getWait(a), 0);
    const totalSys = completed.reduce((acc, a) => acc + getSystem(a), 0);

    return {
      count: total,
      completed: completed.length,
      avgWaitTime: completed.length ? totalWait / completed.length : 0,
      avgSystemTime: completed.length ? totalSys / completed.length : 0,
      dropRate: total ? (droppedE + droppedR) / total : 0,
      dropRateExec: total ? droppedE / total : 0,
      dropRateResult: total ? droppedR / total : 0,
    };
  };

  const globalProcessed = agents.filter(
    (a) => a.status === 'COMPLETED' || a.status === 'BACKUP_SAVED'
  );
  const globalWait = globalProcessed.reduce((acc, a) => acc + getWait(a), 0);
  const globalSys = globalProcessed.reduce((acc, a) => acc + getSystem(a), 0);
  const totalActiveTicks = timeline.reduce((acc, t) => acc + t.activeServers, 0);

  return {
    agents,
    timeline,
    stats: {
      totalAgents: agents.length,
      droppedExec: droppedExecCount,
      droppedResult: droppedResultCount,
      completed: completedCount,
      avgWaitTime: globalProcessed.length ? globalWait / globalProcessed.length : 0,
      avgSystemTime: globalProcessed.length ? globalSys / globalProcessed.length : 0,
      serverUtilization: totalActiveTicks / (config.duration * config.executionServerCount),
      dropRateExec: agents.length ? droppedExecCount / agents.length : 0,
      dropRateResult: agents.length ? droppedResultCount / agents.length : 0,
      // SPLIT STATS
      ing: calcPopStats(
        config.scenario === ScenarioType.WATERFALL ? AgentType.STANDARD : AgentType.ING
      ),
      prepa: calcPopStats(AgentType.PREPA),
    },
  };
};

function createAgent(id: number, type: AgentType, tick: number): Agent {
  return {
    id,
    type,
    entryTick: tick,
    startExecutionTick: null,
    endExecutionTick: null,
    enterResultQueueTick: null,
    startResultTick: null,
    endResultTick: null,
    status: 'QUEUED_EXEC',
  };
}
