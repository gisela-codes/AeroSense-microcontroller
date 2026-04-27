#include <FastIMU.h>
#include <Wire.h>
#include <bluefruit.h>

#define DEVICE_NAME         "GISELA BLE"
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

#define IMU_ADDR 0x68
#define AIR_PIN  A0

#define ADC_REF_VOLTAGE 3.3f
#define ADC_MAX_COUNTS  4095.0f

// found in airflow sensor datasheet
#define PA_PER_VOLT 1000.0f

void startAdv();
void scanI2C();
void calibrateAirZero();

MPU6500 IMU;
calData calib = { 0 };
AccelData accelData;
GyroData gyroData;

bool imuFound = true;
static uint16_t seq = 0;

const uint32_t SAMPLE_PERIOD_MS = 20;
uint32_t lastSampleMs = 0;

int16_t airZero = 0;

struct __attribute__((packed)) SensorPacket {
  uint16_t seq;
  int16_t air;   // pressure in Pa
  int16_t ax, ay, az;
  int16_t gx, gy, gz;
};

BLEService imuService(SERVICE_UUID);
BLECharacteristic imuCharacteristic(CHARACTERISTIC_UUID);

volatile bool deviceConnected = false;

void connect_callback(uint16_t conn_handle) {
  (void)conn_handle;
  deviceConnected = true;
  Serial.println("BLE client connected.");
}

void disconnect_callback(uint16_t conn_handle, uint8_t reason) {
  (void)conn_handle;
  (void)reason;
  deviceConnected = false;
  Serial.println("BLE client disconnected.");
}

void startAdv() {
  Serial.println("Configuring advertising...");
  Bluefruit.Advertising.stop();
  Bluefruit.ScanResponse.clearData();

  Bluefruit.Advertising.addFlags(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE);
  Bluefruit.Advertising.addTxPower();
  Bluefruit.Advertising.addService(imuService);
  Bluefruit.ScanResponse.addName();

  Bluefruit.Advertising.restartOnDisconnect(true);
  Bluefruit.Advertising.setInterval(32, 244);
  Bluefruit.Advertising.setFastTimeout(30);
  Bluefruit.Advertising.start(0);

  Serial.println("Advertising started.");
}

void scanI2C() {
  Serial.println("Scanning I2C...");
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.println(addr, HEX);
    }
  }
}

void calibrateAirZero() {
  const int samples = 200;
  int32_t sum = 0;

  Serial.println("Calibrating air zero...");
  delay(500);

  for (int i = 0; i < samples; i++) {
    sum += analogRead(AIR_PIN);
    delay(5);
  }

  airZero = (int16_t)(sum / samples);

  Serial.print("Air zero = ");
  Serial.println(airZero);
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  delay(2000);
  Serial.begin(115200);
  delay(2000);

  Serial.println("\nBOOT");
  Serial.println("Starting setup...");
  seq = 0;
  Wire.begin();
  Wire.setClock(100000);
  delay(100);

  scanI2C();

  analogReadResolution(12);
  pinMode(AIR_PIN, INPUT);

  calibrateAirZero();

  Serial.println("Initializing MPU6500 with FastIMU...");
  int err = IMU.init(calib, IMU_ADDR);
  if (err != 0) {
    Serial.print("FastIMU init failed: ");
    Serial.println(err);
    imuFound = false;
  } else {
    Serial.println("MPU6500 initialized with FastIMU.");
  }

  Serial.println("Starting Bluefruit...");
  Bluefruit.begin();
  Bluefruit.setTxPower(4);
  Bluefruit.setName(DEVICE_NAME);

  Bluefruit.Periph.setConnectCallback(connect_callback);
  Bluefruit.Periph.setDisconnectCallback(disconnect_callback);

  imuService.begin();

  imuCharacteristic.setProperties(CHR_PROPS_READ | CHR_PROPS_NOTIFY);
  imuCharacteristic.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  imuCharacteristic.setFixedLen(sizeof(SensorPacket));
  imuCharacteristic.begin();

  SensorPacket initPkt = {0, 0, 0, 0, 0, 0, 0, 0};
  imuCharacteristic.write((uint8_t*)&initPkt, sizeof(initPkt));

  startAdv();

  Serial.println("Setup complete.");
}

void loop() {
  static uint32_t lastBlink = 0;
  uint32_t now = millis();

  if (now - lastBlink >= 500) {
    lastBlink = now;
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  }

  if (now - lastSampleMs < SAMPLE_PERIOD_MS) {
    delay(1);
    return;
  }
  lastSampleMs = now;

  SensorPacket pkt;
  pkt.seq = seq++;

  // ---- Pressure calculation ----
  int16_t airRaw = (int16_t)analogRead(AIR_PIN);
  int16_t airDeltaCounts = airRaw - airZero;

  float vDiff = airDeltaCounts * (ADC_REF_VOLTAGE / ADC_MAX_COUNTS);
  float pa = vDiff * PA_PER_VOLT;

  if (pa > 32767.0f) pa = 32767.0f;
  if (pa < -32768.0f) pa = -32768.0f;

  pkt.air = (int16_t)pa;

  // ---- IMU ----
  if (imuFound) {
    IMU.update();
    IMU.getAccel(&accelData);
    IMU.getGyro(&gyroData);

    pkt.ax = (int16_t)(accelData.accelX * 2048.0f);
    pkt.ay = (int16_t)(accelData.accelY * 2048.0f);
    pkt.az = (int16_t)(accelData.accelZ * 2048.0f);
    pkt.gx = (int16_t)(gyroData.gyroX * 131.0f);
    pkt.gy = (int16_t)(gyroData.gyroY * 131.0f);
    pkt.gz = (int16_t)(gyroData.gyroZ * 131.0f);
  } else {
    pkt.ax = pkt.ay = pkt.az = 0;
    pkt.gx = pkt.gy = pkt.gz = 0;
  }

  // Debug
  // Serial.print("seq: "); Serial.print(pkt.seq);
  // Serial.print(" | Pa: "); Serial.print(pa, 2);
  // Serial.print(" | raw: "); Serial.print(airRaw);
  // Serial.print(" | zero: "); Serial.print(airZero);
  // Serial.print(" | connected: "); Serial.println(deviceConnected ? "yes" : "no");
  // Serial.print("seq: "); Serial.print(pkt.seq);
  // Serial.print(" | air: "); Serial.print(pkt.air);
  // Serial.print(" | acc: ");
  // Serial.print(pkt.ax, 3); Serial.print(", ");
  // Serial.print(pkt.ay, 3); Serial.print(", ");
  // Serial.print(pkt.az, 3);
  // Serial.print(" | gyro: ");
  // Serial.print(pkt.gx, 3); Serial.print(", ");
  // Serial.print(pkt.gy, 3); Serial.print(", ");
  // Serial.println(pkt.gz, 3);


  if (deviceConnected) {
    imuCharacteristic.notify((uint8_t*)&pkt, sizeof(pkt));
  }
}


