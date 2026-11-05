export interface HistoryPoint {
  timestamp: number;
  value: number;
}

export interface NetworkHistoryPoint {
  timestamp: number;
  rxBytesSec: number;
  txBytesSec: number;
}

export interface GpuHistoryPoint {
  timestamp: number;
  utilization: number;
  memoryUsedMb: number;
  temperature: number;
}

export interface SystemOverview {
  cpuUsagePercent: number;
  memoryTotalGb: number;
  memoryUsedGb: number;
  memoryAvailableGb: number;
  memoryUsagePercent: number;
  swapTotalGb: number;
  swapUsedGb: number;
  swapUsagePercent: number;
  uptimeSeconds: number;
  loadAverage1m: number;
  loadAverage5m: number;
  loadAverage15m: number;

  gpuUsagePercent: number | null;
  gpuMemoryUsedGb: number | null;
  gpuMemoryTotalGb: number | null;
  gpuTemperatureC: number | null;

  storageTotalGb: number | null;
  storageUsedGb: number | null;
  storageUsagePercent: number | null;

  netRxSpeedBytesSec: number;
  netTxSpeedBytesSec: number;
  activeInterface: string;

  cpuModel: string;
  gpuModel: string;
  cpuTempC: number | null;

  networkHistory: NetworkHistoryPoint[];
  cpuHistory: HistoryPoint[];
  memoryHistory: HistoryPoint[];
}

export interface CpuMetrics {
  usagePercent: number;
  perCoreUsage: number[];
  modelName: string;
  physicalCores: number;
  logicalThreads: number;
  coreFrequenciesMhz: number[];
  minFrequencyMhz: number | null;
  maxFrequencyMhz: number | null;
  loadAverage1m: number;
  loadAverage5m: number;
  loadAverage15m: number;
  temperatureC: number | null;
  powerW: number | null;
  history: HistoryPoint[];
}

export interface GpuDevice {
  id: string;
  name: string;
  vendor: string;
  isIntegrated: boolean;
  utilizationPercent: number | null;
  memoryUsedMb: number | null;
  memoryTotalMb: number | null;
  memoryUsagePercent: number | null;
  temperatureC: number | null;
  powerDrawW: number | null;
  clockSpeedMhz: number | null;
  fanSpeedRpm: number | null;
  fanSpeedPercent: number | null;
  performanceState: string | null;
  driverVersion: string | null;
  unsupportedReasons: Record<string, string>;
  history: GpuHistoryPoint[];
}

export interface GpuMetrics {
  devices: GpuDevice[];
  selectedDeviceId: string | null;
}

export interface MemoryMetrics {
  totalRamGb: number;
  usedRamGb: number;
  availableRamGb: number;
  freeRamGb: number;
  cachedRamGb: number;
  buffersRamGb: number;
  ramUsagePercent: number;

  totalSwapGb: number;
  usedSwapGb: number;
  freeSwapGb: number;
  swapUsagePercent: number;

  sharedMb: number;
  slabMb: number;
  dirtyMb: number;
  writebackMb: number;

  history: HistoryPoint[];
}

export interface PhysicalDisk {
  name: string;
  model: string;
  sizeGb: number;
  diskType: string;
  isRotational: boolean;
  temperatureC: number | null;
}

export interface MountedPartition {
  device: string;
  mountPoint: string;
  fstype: string;
  totalGb: number;
  usedGb: number;
  availableGb: number;
  usagePercent: number;
  isRoot: boolean;
}

export interface StorageMetrics {
  physicalDisks: PhysicalDisk[];
  partitions: MountedPartition[];
  rootTotalGb: number | null;
  rootUsedGb: number | null;
  rootAvailableGb: number | null;
  rootUsagePercent: number | null;
  readSpeedMbS: number;
  writeSpeedMbS: number;
}

export interface NetworkInterface {
  name: string;
  interfaceType: string;
  state: string;
  macAddress: string | null;
  ipv4Address: string | null;
  ipv6Address: string | null;
  rxSpeedBytesSec: number;
  txSpeedBytesSec: number;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
  rxDrops: number;
  txDrops: number;
  speedMbps: number | null;
}

export interface SocketConnection {
  protocol: string;
  state: string;
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  process: string | null;
}

export interface NetworkMetrics {
  totalRxSpeedBytesSec: number;
  totalTxSpeedBytesSec: number;
  activeInterfaceName: string;
  interfaces: NetworkInterface[];
  connections: SocketConnection[];
  history: NetworkHistoryPoint[];
}

export interface SensorReading {
  id: string;
  name: string;
  category: string;
  value: number;
  unit: string;
  source: string;
  criticalValue: number | null;
}

export interface SensorMetrics {
  cpuTemperatures: SensorReading[];
  gpuTemperatures: SensorReading[];
  storageTemperatures: SensorReading[];
  motherboardTemperatures: SensorReading[];
  fans: SensorReading[];
  voltages: SensorReading[];
  power: SensorReading[];
}

export interface ProcessInfo {
  pid: number;
  user: string;
  cpuPercent: number;
  memoryPercent: number;
  memoryRssMb: number;
  state: string;
  threads: number;
  elapsed: string;
  name: string;
  cmdline: string;
}

export interface SystemInfo {
  osName: string;
  osVersion: string;
  kernelRelease: string;
  architecture: string;
  hostname: string;
  desktopEnvironment: string;
  displayServer: string;
  uptimeSeconds: number;
  bootTimestamp: number;
  kernelModulesCount: number;
  cpuFlagsSample: string[];
}

export interface SystemdService {
  name: string;
  description: string;
  loadState: string;
  activeState: string;
  subState: string;
}

export interface ServicesReport {
  isSystemdAvailable: boolean;
  statusMessage: string;
  services: SystemdService[];
}

export type PageId =
  | "Overview"
  | "CPU"
  | "GPU"
  | "Memory"
  | "Storage"
  | "Network"
  | "Processes"
  | "Sensors"
  | "System";

