
export enum ScenarioType {
  WATERFALL = 'WATERFALL',
  CHANNELS_DAMS = 'CHANNELS_DAMS'
}

export enum AgentType {
  STANDARD = 'STANDARD',
  ING = 'ING', // Frequent, fast
  PREPA = 'PREPA' // Rare, slow
}

export interface SimulationConfig {
  scenario: ScenarioType;
  duration: number; // in ticks
  
  // Resources
  executionServerCount: number; // K
  executionQueueCapacity: number; // ks (0 = infinite)
  resultQueueCapacity: number; // kf (0 = infinite)
  resultServerSpeed: number; // ticks per item (usually 1)
  
  // Logic
  enableBackup: boolean; // For Q2 full scenario

  // Populations
  arrivalRateIng: number; // Lambda for ING/Standard
  serviceDurationIng: number; // Mu for ING/Standard
  
  arrivalRatePrepa: number; // Lambda for PREPA
  serviceDurationPrepa: number; // Mu for PREPA

  // Dam (Barrage)
  damBlockDuration: number; // tb
}

export interface Agent {
  id: number;
  type: AgentType;
  entryTick: number;
  
  // Execution Phase
  startExecutionTick: number | null;
  endExecutionTick: number | null;
  assignedServerId?: number;
  
  // Result Phase
  enterResultQueueTick: number | null;
  startResultTick: number | null;
  endResultTick: number | null;

  status: 'QUEUED_EXEC' | 'PROCESSING' | 'QUEUED_RESULT' | 'SENDING' | 'COMPLETED' | 'DROPPED_EXEC' | 'DROPPED_RESULT' | 'BACKUP_SAVED';
}

export interface TimeStepData {
  time: number;
  q1Length: number;
  q2Length: number;
  activeServers: number;
  damOpen: boolean;
  droppedCount: number;
  completedCount: number;
}

export interface SimulationResult {
  agents: Agent[];
  timeline: TimeStepData[];
  stats: {
    totalAgents: number;
    droppedExec: number;
    droppedResult: number;
    completed: number;
    avgWaitTime: number;
    avgSystemTime: number;
    serverUtilization: number;
    dropRateExec: number;
    dropRateResult: number;
  }
}
