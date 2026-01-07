export enum ScenarioType {
  WATERFALL = 'WATERFALL',
  CHANNELS_DAMS = 'CHANNELS_DAMS',
}

export enum AgentType {
  STANDARD = 'STANDARD',
  ING = 'ING',
  PREPA = 'PREPA',
}

export interface Agent {
  id: number;
  type: AgentType;
  entryTick: number;
  startExecutionTick: number | null;
  endExecutionTick: number | null;
  enterResultQueueTick: number | null;
  startResultTick: number | null;
  endResultTick: number | null;
  status:
    | 'QUEUED_EXEC'
    | 'PROCESSING'
    | 'DROPPED_EXEC'
    | 'QUEUED_RESULT'
    | 'DROPPED_RESULT'
    | 'SENDING'
    | 'COMPLETED'
    | 'BACKUP_SAVED';
  assignedServerId?: number;
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

export interface PopulationStats {
  avgWaitTime: number;
  avgSystemTime: number;
  dropRateExec: number;
  dropRateResult: number;
  count: number;
  completed: number;
}

export interface SimulationStats {
  totalAgents: number;
  droppedExec: number;
  droppedResult: number;
  completed: number;
  avgWaitTime: number;
  avgSystemTime: number;
  serverUtilization: number;
  dropRateExec: number;
  dropRateResult: number;
  ing: PopulationStats;
  prepa: PopulationStats;
}

export interface SimulationResult {
  agents: Agent[];
  timeline: TimeStepData[];
  stats: SimulationStats;
}

export interface SimulationConfig {
  scenario: ScenarioType;
  duration: number;
  executionServerCount: number;
  executionQueueCapacity: number;
  resultQueueCapacity: number;
  resultServerSpeed: number;
  enableBackup: boolean;
  arrivalRateIng: number;
  serviceDurationIng: number;
  arrivalRatePrepa: number;
  serviceDurationPrepa: number;
  damBlockDuration: number;
  damOpenDuration: number;
}
