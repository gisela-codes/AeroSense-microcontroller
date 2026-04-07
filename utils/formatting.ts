/**
 * Utility functions for formatting and display
 */

export const formatRSSI = (rssi: number): string => {
  return `${rssi} dBm`;
};

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

export const formatUUID = (uuid: string): string => {
  // Handle both short and long UUIDs
  if (uuid.length <= 8) {
    return uuid.toUpperCase();
  }
  return uuid.toLowerCase();
};

export const truncateString = (str: string, length: number = 20): string => {
  return str.length > length ? `${str.slice(0, length)}...` : str;
};
