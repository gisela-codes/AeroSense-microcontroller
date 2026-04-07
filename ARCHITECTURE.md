# aeroSense - BLE Testing Starter App

A lightweight Expo + React Native application for testing Bluetooth Low Energy (BLE) connectivity with a clean, modular architecture.

## 📁 Project Structure

```
aeroSense/
├── app/                          # Expo Router screens and navigation
│   ├── _layout.tsx              # Root layout with BLE provider
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab navigation setup
│   │   ├── scanner.tsx          # BLE device scanner screen
│   │   └── connection.tsx       # Connected device management
│   └── modal.tsx
│
├── components/                   # Reusable UI components
│   ├── haptic-tab.tsx          # Tab bar haptic feedback
│   ├── themed-text.tsx         # Theme-aware text
│   ├── themed-view.tsx         # Theme-aware view
│   └── ui/                     # UI primitives
│
├── constants/                    # Shared constants
│   └── theme.ts                # Colors, typography config
│
├── context/                      # Global state management
│   └── BLEContext.tsx          # BLE state and operations
│
├── hooks/                        # Custom React hooks
│   ├── use-color-scheme.ts     # Color scheme detection
│   └── use-theme-color.ts      # Theme color management
│
├── types/                        # TypeScript interfaces
│   └── ble.ts                  # BLE types and interfaces
│
├── utils/                        # Utility functions
│   ├── bleHelpers.ts           # BLE-specific utilities
│   └── formatting.ts           # Display formatting helpers
│
├── Notification-Handler/        # Notification management
│   └── notificationService.ts  # Local notification service
│
├── Wireframe/                    # Design artifacts
│
├── assets/                       # Static assets
│   └── images/
│
├── ios/                          # iOS native code
├── package.json                  # Dependencies
├── app.json                      # Expo configuration
└── tsconfig.json               # TypeScript config
```

## 🎯 Core Features

### BLE Context (`context/BLEContext.tsx`)
Global state management for BLE operations:
- **Scan Management**: Start/stop device scanning
- **Connection Management**: Connect/disconnect from devices
- **State Tracking**: Track scan and connection states
- **Error Handling**: Centralized error management

### Types (`types/ble.ts`)
Type-safe BLE interfaces:
- `BLEDevice`: Device information with RSSI and services
- `BLEService`: Service metadata
- `BLECharacteristic`: Characteristic definition
- State enums: `BLEScanState`, `BLEConnectionState`

### Utils (`utils/`)
- **bleHelpers.ts**: Signal filtering, quality calculation, device deduplication
- **formatting.ts**: Display formatting for RSSI, UUID, timestamps

### Screens

#### Scanner (`app/(tabs)/scanner.tsx`)
- Real-time BLE device scanning
- Signal strength visualization
- Quick device connection
- Scan state management

#### Connection (`app/(tabs)/connection.tsx`)
- Connected device details
- Service enumeration
- Connection state display
- Device disconnect

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn
- Expo CLI
- iOS development setup (for iOS testing)

### Installation

```bash
cd aeroSense
npm install
```

### Running the App

**Development**
```bash
npm start
```

**iOS Simulator**
```bash
npm run ios
```

**Android Emulator**
```bash
npm run android
```

### EAS Build

**Development Build for iOS**
```bash
eas build --profile development --platform ios
```

**Preview Build**
```bash
eas build --profile preview --platform ios
```

## 🔧 Development

### Adding New BLE Features

1. **Extend Types** (`types/ble.ts`):
   ```typescript
   export interface MyCustomType {
     // Define your type
   }
   ```

2. **Add BLE Logic** (`context/BLEContext.tsx`):
   ```typescript
   // Add new context functions
   const myNewFunction = useCallback(async () => {
     // Implementation
   }, []);
   ```

3. **Create Screen** (`app/(tabs)/newscreen.tsx`):
   ```typescript
   export const MyScreen = () => {
     const { /* BLE state */ } = useBLE();
     // Render component
   };
   ```

4. **Register Route** (`app/(tabs)/_layout.tsx`):
   ```typescript
   <Tabs.Screen
     name="newscreen"
     options={{ title: 'My Screen' }}
   />
   ```

### Using the BLE Context

```typescript
import { useBLE } from '@/context/BLEContext';

export const MyComponent = () => {
  const { devices, startScan, connect } = useBLE();
  
  return (
    // Your JSX
  );
};
```

## 📦 Dependencies

### Core
- `react-native@0.81.5`
- `expo@54.0.33`
- `expo-router@6.0.23`

### Navigation
- `@react-navigation/native@7.1.8`
- `@react-navigation/bottom-tabs@7.4.0`

### BLE
- `react-native-ble-manager@12.4.4`

### UI/UX
- `@expo/vector-icons@15.0.3`
- `react-native-reanimated@4.1.1`
- `expo-haptics@15.0.8`

## 📱 Tested Platforms

- iOS 15+
- Android 12+ (with BLE support)

## 🐛 Troubleshooting

### BLE Not Working
1. Verify Bluetooth permissions in `app.json`
2. Check iOS Capabilities (Bluetooth)
3. Ensure devices are advertising BLE

### Build Failures
1. Clear cache: `npm cache clean --force`
2. Reset prebuild: `expo prebuild --clean`
3. Check iOS deployment target

## 📚 References

- [React Native BLE Manager](https://github.com/innoveit/react-native-ble-manager)
- [Expo Router Documentation](https://docs.expo.dev/routing/introduction/)
- [BLE Specifications](https://www.bluetooth.com/specifications/specs/)

## 📄 License

MIT

---

**Happy BLE Testing! 🚀**
