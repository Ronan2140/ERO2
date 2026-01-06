
import { Agent, AgentType, ScenarioType, SimulationConfig, SimulationResult, TimeStepData } from './types';

// Helper to generate Poisson arrivals (simplified as Bernoulli process per tick for discrete sim)
const shouldArrive = (rate: number): boolean => {
  return Math.random() < rate;
};

export const runSimulation = (config: SimulationConfig): SimulationResult => {
  const agents: Agent[] = [];
  const timeline: TimeStepData[] = [];
  
  // State
  let q1: Agent[] = []; // Execution Queue
  let q2: Agent[] = []; // Result Queue
  
  // Servers state: stores agent ID or null
  // We track when a server will be free. serverFreeTick[i] = tick when server i is free.
  const executionServersFreeAt: number[] = new Array(config.executionServerCount).fill(0);
  let resultServerFreeAt = 0;

  // Counters
  let nextAgentId = 1;
  let droppedExecCount = 0;
  let droppedResultCount = 0;
  let completedCount = 0;

  // Dam State
  let damCycleTimer = 0;
  let isDamOpen = true;

  for (let tick = 0; tick < config.duration; tick++) {
    // 1. Update Dam State (Channels Scenario)
    let damStatus = true;
    if (config.scenario === ScenarioType.CHANNELS_DAMS && config.damBlockDuration > 0) {
      // Cycle: Block for tb, Open for tb/2
      const fullCycle = config.damBlockDuration * 1.5;
      const phase = tick % fullCycle;
      
      if (phase < config.damBlockDuration) {
        isDamOpen = false; // Blocked
      } else {
        isDamOpen = true; // Open
      }
      damStatus = isDamOpen;
    }

    // 2. Arrivals
    // Determine types based on scenario
    let newAgents: Agent[] = [];
    
    if (config.scenario === ScenarioType.WATERFALL) {
      if (shouldArrive(config.arrivalRateIng)) {
        newAgents.push({
          id: nextAgentId++,
          type: AgentType.STANDARD,
          entryTick: tick,
          startExecutionTick: null, endExecutionTick: null,
          enterResultQueueTick: null, startResultTick: null, endResultTick: null,
          status: 'QUEUED_EXEC'
        });
      }
    } else {
      // Channels
      if (shouldArrive(config.arrivalRateIng)) {
        newAgents.push({
          id: nextAgentId++, type: AgentType.ING, entryTick: tick,
          startExecutionTick: null, endExecutionTick: null,
          enterResultQueueTick: null, startResultTick: null, endResultTick: null,
          status: 'QUEUED_EXEC'
        });
      }
      if (shouldArrive(config.arrivalRatePrepa)) {
        newAgents.push({
          id: nextAgentId++, type: AgentType.PREPA, entryTick: tick,
          startExecutionTick: null, endExecutionTick: null,
          enterResultQueueTick: null, startResultTick: null, endResultTick: null,
          status: 'QUEUED_EXEC'
        });
      }
    }

    // 3. Queue 1 Enqueue (Execution)
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
    // Find free servers
    for (let i = 0; i < config.executionServerCount; i++) {
      if (executionServersFreeAt[i] <= tick && q1.length > 0) {
        // Simple strategy: Look for first available agent allowed to pass
        // If Dam is closed, ING agents cannot start processing (assuming Dam blocks access to servers)
        let agentIndex = -1;

        if (config.scenario === ScenarioType.CHANNELS_DAMS && !isDamOpen) {
          // Find first non-ING agent
          agentIndex = q1.findIndex(a => a.type !== AgentType.ING);
        } else {
          // FIFO
          agentIndex = 0;
        }

        if (agentIndex !== -1) {
          const agent = q1.splice(agentIndex, 1)[0];
          agent.startExecutionTick = tick;
          agent.status = 'PROCESSING';
          agent.assignedServerId = i;
          
          const duration = agent.type === AgentType.PREPA ? config.serviceDurationPrepa : config.serviceDurationIng;
          agent.endExecutionTick = tick + duration;
          executionServersFreeAt[i] = tick + duration;
        }
      }
    }

    // 5. Handle Execution Completion -> Move to Q2
    // We check agents that finished exactly at this tick
    // Note: In discrete sim, if endExecutionTick == tick, they are done and try to enter Q2
    const finishedExecAgents = agents.filter(a => a.endExecutionTick === tick && a.status === 'PROCESSING');
    
    for (const agent of finishedExecAgents) {
      agent.enterResultQueueTick = tick;
      
      // Check Q2 Capacity
      if (config.resultQueueCapacity > 0 && q2.length >= config.resultQueueCapacity) {
        if (config.enableBackup) {
          agent.status = 'BACKUP_SAVED';
          // Effectively done, but didn't go through result server standard path
          // We can mark it as completed for stats, but with a special flag
          agent.endResultTick = tick; // Instant backup
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

    // 6. Assign Result Server (Single server)
    if (resultServerFreeAt <= tick && q2.length > 0) {
      const agent = q2.shift()!;
      agent.startResultTick = tick;
      agent.status = 'SENDING';
      
      // Result sending is fast, usually 1 tick or configured
      const duration = config.resultServerSpeed || 1; 
      agent.endResultTick = tick + duration;
      resultServerFreeAt = tick + duration;
    }

    // 7. Complete Result Phase
    const finishedResultAgents = agents.filter(a => a.endResultTick === tick && a.status === 'SENDING');
    for (const agent of finishedResultAgents) {
      agent.status = 'COMPLETED';
      completedCount++;
    }

    // 8. Record Stats
    const activeServers = executionServersFreeAt.filter(t => t > tick).length;
    timeline.push({
      time: tick,
      q1Length: q1.length,
      q2Length: q2.length,
      activeServers,
      damOpen: damStatus,
      droppedCount: droppedExecCount + droppedResultCount,
      completedCount
    });
  }

  // Final Statistics Calculation
  const processedAgents = agents.filter(a => a.status === 'COMPLETED' || a.status === 'BACKUP_SAVED');
  
  const totalWaitTime = processedAgents.reduce((acc, a) => {
    // Wait Q1 + Wait Q2
    const wait1 = (a.startExecutionTick || 0) - a.entryTick;
    const wait2 = a.startResultTick ? (a.startResultTick - (a.enterResultQueueTick || 0)) : 0;
    return acc + wait1 + wait2;
  }, 0);

  const totalSystemTime = processedAgents.reduce((acc, a) => {
    // End - Start
    const end = a.endResultTick || a.endExecutionTick || config.duration;
    return acc + (end - a.entryTick);
  }, 0);

  // Server Utilization (Average active servers / Total K)
  const totalActiveTicks = timeline.reduce((acc, t) => acc + t.activeServers, 0);
  const avgServerUtilization = totalActiveTicks / (config.duration * config.executionServerCount);

  return {
    agents,
    timeline,
    stats: {
      totalAgents: agents.length,
      droppedExec: droppedExecCount,
      droppedResult: droppedResultCount,
      completed: completedCount,
      avgWaitTime: processedAgents.length ? totalWaitTime / processedAgents.length : 0,
      avgSystemTime: processedAgents.length ? totalSystemTime / processedAgents.length : 0,
      serverUtilization: avgServerUtilization,
      dropRateExec: agents.length ? droppedExecCount / agents.length : 0,
      dropRateResult: agents.length ? droppedResultCount / agents.length : 0,
    }
  };
};
