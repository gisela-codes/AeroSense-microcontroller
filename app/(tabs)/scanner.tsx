import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBLE } from "@/context/BLEContext";
import { getSignalQuality } from "@/utils/bleHelpers";
import { formatRSSI } from "@/utils/formatting";

export default function ScannerScreen() {
  const {
    bluetoothState,
    connect,
    connectedDevice,
    connectionState,
    devices,
    error,
    permissionState,
    prepareBluetooth,
    receivedData,
    requestPermissions,
    scanState,
    startScan,
    stopScan,
  } = useBLE();

  const isBluetoothOn = bluetoothState === "on";
  const primaryActionLabel =
    scanState === "scanning" ? "Stop Scan" : "Scan for Devices";

  const handlePrimaryAction = async () => {
    if (scanState === "scanning") {
      await stopScan();
      return;
    }

    await startScan();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Clinical Kinetics</Text>
        <Text style={styles.title}>Bluetooth Pairing</Text>
        <Text style={styles.subtitle}>
          Allow Bluetooth access, turn Bluetooth on, then tap a nearby device to
          pair and connect.
        </Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Bluetooth Status</Text>
          <Text style={styles.heroValue}>
            {isBluetoothOn ? "Ready to scan" : "Bluetooth is off"}
          </Text>
          <Text style={styles.heroHint}>
            Permission: {permissionState} {"\u2022"} Radio: {bluetoothState}
          </Text>

          <View style={styles.heroActions}>
            <Pressable
              style={styles.primaryButton}
              onPress={handlePrimaryAction}
            >
              <Text style={styles.primaryButtonText}>{primaryActionLabel}</Text>
            </Pressable>
          </View>

          {!isBluetoothOn && permissionState === "granted" && (
            <Pressable style={styles.linkButton} onPress={prepareBluetooth}>
              <Text style={styles.linkButtonText}>Turn On Bluetooth</Text>
            </Pressable>
          )}

          {scanState === "scanning" && (
            <View style={styles.scanningRow}>
              <ActivityIndicator color="#8FF5CF" />
              <Text style={styles.scanningText}>
                Searching for nearby devices...
              </Text>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {connectedDevice && (
          <View style={styles.connectedCard}>
            <View style={styles.connectedHeader}>
              <Text style={styles.sectionTitle}>Connected Device</Text>
              <View style={styles.connectedBadge}>
                <Text style={styles.connectedBadgeText}>
                  {connectionState === "connected" ? "Connected" : "Connecting"}
                </Text>
              </View>
            </View>
            <Text style={styles.connectedName}>{connectedDevice.name}</Text>
            <Text style={styles.connectedMeta}>
              {connectedDevice.id} {"\u2022"} {formatRSSI(connectedDevice.rssi)}
            </Text>
            <Text style={styles.connectedHint}>
              Latest packets: {receivedData.length}
            </Text>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Found Devices</Text>
          <Text style={styles.sectionCount}>{devices.length} results</Text>
        </View>

        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No devices yet</Text>
              <Text style={styles.emptyText}>
                Start a scan after granting permissions and turning Bluetooth
                on.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const quality = getSignalQuality(item.rssi);

            return (
              <Pressable
                style={styles.deviceCard}
                onPress={() => connect(item.id)}
              >
                <View style={styles.deviceCopy}>
                  <Text style={styles.deviceName}>
                    {item.name || "Unknown Device"}
                  </Text>
                  <Text style={styles.deviceId}>{item.id}</Text>
                  <Text style={styles.deviceState}>
                    {item.isConnected
                      ? "Connected"
                      : item.isBonded
                        ? "Paired"
                        : "Tap to pair"}
                  </Text>
                </View>

                <View style={styles.signalWrap}>
                  <View style={styles.signalTrack}>
                    <View
                      style={[
                        styles.signalFill,
                        { width: `${Math.max(16, quality)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.signalText}>{formatRSSI(item.rssi)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#071225",
  },
  container: {
    flex: 1,
    backgroundColor: "#071225",
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  eyebrow: {
    color: "#8FF5CF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    color: "#F4F7FB",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: "#A7B6CF",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  heroCard: {
    backgroundColor: "#101D35",
    borderColor: "#1B2C4B",
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 18,
  },
  heroLabel: {
    color: "#8FF5CF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  heroValue: {
    color: "#F4F7FB",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  heroHint: {
    color: "#8A9BB8",
    fontSize: 14,
    marginBottom: 18,
  },
  heroActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#8FF5CF",
    borderRadius: 14,
    flex: 1,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#072033",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "#1A2A48",
    borderColor: "#294066",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: "#D9E4F7",
    fontSize: 14,
    fontWeight: "700",
  },
  linkButton: {
    alignSelf: "flex-start",
  },
  linkButtonText: {
    color: "#59D8FF",
    fontSize: 14,
    fontWeight: "700",
  },
  scanningRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  scanningText: {
    color: "#D9E4F7",
    fontSize: 14,
  },
  errorText: {
    color: "#FF948A",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
  },
  connectedCard: {
    backgroundColor: "#0E1A30",
    borderColor: "#20436B",
    borderLeftWidth: 3,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  connectedHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  connectedBadge: {
    backgroundColor: "#133D3A",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  connectedBadgeText: {
    color: "#8FF5CF",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  connectedName: {
    color: "#F4F7FB",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  connectedMeta: {
    color: "#A8B6CC",
    fontSize: 13,
    marginBottom: 8,
  },
  connectedHint: {
    color: "#59D8FF",
    fontSize: 13,
    fontWeight: "600",
  },
  listHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#E8EEF7",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  sectionCount: {
    color: "#9AAACA",
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyCard: {
    backgroundColor: "#0E1A30",
    borderColor: "#1B2C4B",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: {
    color: "#F4F7FB",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    color: "#9AAACA",
    fontSize: 14,
    lineHeight: 20,
  },
  deviceCard: {
    alignItems: "center",
    backgroundColor: "#0E1A30",
    borderColor: "#1B2C4B",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 16,
  },
  deviceCopy: {
    flex: 1,
    marginRight: 16,
  },
  deviceName: {
    color: "#F4F7FB",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  deviceId: {
    color: "#8194B4",
    fontSize: 12,
    marginBottom: 6,
  },
  deviceState: {
    color: "#8FF5CF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  signalWrap: {
    alignItems: "flex-end",
    minWidth: 88,
  },
  signalTrack: {
    backgroundColor: "#21314E",
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
    width: 88,
  },
  signalFill: {
    backgroundColor: "#59D8FF",
    borderRadius: 999,
    height: 8,
  },
  signalText: {
    color: "#8FF5CF",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
});
