import { invoke } from "@tauri-apps/api/core";
import type {
  SystemOverview,
  CpuMetrics,
  GpuMetrics,
  MemoryMetrics,
  StorageMetrics,
  NetworkMetrics,
  SensorMetrics,
  PowerSupplyMetrics,
  ProcessInfo,
  SystemInfo,
  ServicesReport,
} from "../types/telemetry";

export async function fetchSystemOverview(): Promise<SystemOverview> {
  return await invoke<SystemOverview>("get_system_overview");
}

export async function fetchCpuMetrics(): Promise<CpuMetrics> {
  return await invoke<CpuMetrics>("get_cpu_metrics");
}

export async function fetchGpuMetrics(): Promise<GpuMetrics> {
  return await invoke<GpuMetrics>("get_gpu_metrics");
}

export async function fetchMemoryMetrics(): Promise<MemoryMetrics> {
  return await invoke<MemoryMetrics>("get_memory_metrics");
}

export async function fetchStorageMetrics(): Promise<StorageMetrics> {
  return await invoke<StorageMetrics>("get_storage_metrics");
}

export async function fetchNetworkMetrics(): Promise<NetworkMetrics> {
  return await invoke<NetworkMetrics>("get_network_metrics");
}

export async function fetchSensorMetrics(): Promise<SensorMetrics> {
  return await invoke<SensorMetrics>("get_sensor_metrics");
}

export async function fetchBatteryMetrics(): Promise<PowerSupplyMetrics> {
  return await invoke<PowerSupplyMetrics>("get_battery_metrics");
}

export async function fetchProcessList(limit?: number): Promise<ProcessInfo[]> {
  return await invoke<ProcessInfo[]>("get_process_list", { limit });
}

export async function killProcess(pid: number, signal: string): Promise<string> {
  return await invoke<string>("kill_process", { pid, signal });
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  return await invoke<SystemInfo>("get_system_info");
}

export async function fetchSystemServices(): Promise<ServicesReport> {
  return await invoke<ServicesReport>("get_system_services");
}

export async function controlSystemService(
  serviceName: string,
  action: string
): Promise<string> {
  return await invoke<string>("control_system_service", { serviceName, action });
}

export async function executePowerAction(action: string): Promise<string> {
  return await invoke<string>("system_power_action", { action });
}

