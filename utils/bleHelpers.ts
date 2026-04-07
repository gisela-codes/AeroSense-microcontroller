/**
 * BLE Helper utilities
 */

import { BLEDevice } from '@/types/ble';

/**
 * Filter out weak signals (RSSI < -80dBm)
 */
export const filterWeakSignals = (devices: BLEDevice[]): BLEDevice[] => {
  return devices.filter(device => device.rssi > -80);
};

/**
 * Sort devices by signal strength (RSSI)
 */
export const sortBySignalStrength = (devices: BLEDevice[]): BLEDevice[] => {
  return [...devices].sort((a, b) => b.rssi - a.rssi);
};

/**
 * Calculate signal quality percentage
 * RSSI range: -100 to -30 dBm
 */
export const getSignalQuality = (rssi: number): number => {
  const min = -100;
  const max = -30;
  const quality = ((rssi - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, quality));
};

/**
 * Format device name with fallback
 */
export const formatDeviceName = (device: BLEDevice): string => {
  return device.name || `Device ${device.id.slice(0, 8)}`;
};

/**
 * Check if device is recently seen (within last 30 seconds)
 */
export const isRecentlyActive = (device: BLEDevice, timeoutMs: number = 30000): boolean => {
  return Date.now() - device.lastSeen < timeoutMs;
};

/**
 * Deduplicate devices by ID
 */
export const deduplicateDevices = (devices: BLEDevice[]): BLEDevice[] => {
  const seen = new Set<string>();
  return devices.filter(device => {
    if (seen.has(device.id)) return false;
    seen.add(device.id);
    return true;
  });
};
