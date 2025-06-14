#include <WiFi.h>
#include <FirebaseESP32.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include "DHT.h"

// ===== Konfigurasi WiFi =====
const char* ssid = "Infinix HOT 9 Play";      
const char* password = "Nursitii12";

// ===== Konfigurasi Firebase =====
#define DATABASE_URL "https://smartclassroom-416bc-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define DATABASE_SECRET "vG7tdUAQQWmlNhfYHKBFyDYVKeF0QJGy2dBTWHiR"

// ===== Objek Firebase =====
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ===== Konfigurasi Sensor =====
#define DHTPIN 14
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

const int LDR_PIN = 34;
const int LED_PIN = 16;
const int PWM_CHANNEL = 0;
const int PWM_FREQ = 5000;
const int PWM_RESOLUTION = 8;
const int gasSensorPin = 35;
const int numReadings = 10;

int readings[numReadings] = {0}, readIndex = 0, total = 0, average = 0;
const int thresholdHigh = 2900;
float temperature = 0, humidity = 0;
int ldrValue = 0;
bool gasDetected = false;
float smoothedBrightness = 0;
const float SMOOTHING_FACTOR = 0.1;
int ldrMin = 4095, ldrMax = 0;

unsigned long lastSensorReadTime = 0;
unsigned long lastFirebaseUpload = 0;
const unsigned long sensorInterval = 2000;
const unsigned long firebaseInterval = 2000; 

bool firebaseReady = false;

void setupFirebase() {
  Serial.println("Konfigurasi Firebase...");
  
  
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;
  
  // Inisialisasi Firebase
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Set ukuran buffer untuk operasi Firebase
  fbdo.setResponseSize(4096);
  
  firebaseReady = true;
  Serial.println("Firebase siap!");
}

void uploadToFirebase() {
  if (!firebaseReady) return;
  
  Serial.println("Mengirim data ke Firebase...");
  

  FirebaseJson json;
  json.set("temperature", temperature);
  json.set("humidity", humidity);
  json.set("ldr", ldrValue);
  json.set("gas", average);
  json.set("gasDetected", gasDetected);
  json.set("timestamp", millis());
  
  // Upload data ke Firebase
  String path = "/sensorData";
  
  if (Firebase.setJSON(fbdo, path, json)) {
    Serial.println("Data berhasil dikirim ke Firebase!");
  } else {
    Serial.println("Gagal mengirim data ke Firebase:");
    Serial.println(fbdo.errorReason());
  }
  
  
  String timestampPath = "/historicalData/" + String(millis());
  Firebase.setJSON(fbdo, timestampPath, json);
}

// ===== Fungsi Sensor =====
void updateSensors() {
  ldrValue = analogRead(LDR_PIN);
  
 
  total -= readings[readIndex];
  readings[readIndex] = analogRead(gasSensorPin);
  total += readings[readIndex];
  readIndex = (readIndex + 1) % numReadings;
  average = total / numReadings;
  gasDetected = (average > thresholdHigh);
  
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  if (!isnan(temp) && !isnan(hum)) {
    temperature = temp;
    humidity = hum;
  }
}

void kalibrasiLDR() {
  Serial.println("Kalibrasi LDR (5 detik):");
  unsigned long startTime = millis();
  while (millis() - startTime < 5000) {
    int val = analogRead(LDR_PIN);
    if (val < ldrMin) ldrMin = val;
    if (val > ldrMax) ldrMax = val;
    delay(100);
  }
  Serial.print("LDR min: "); Serial.println(ldrMin);
  Serial.print("LDR max: "); Serial.println(ldrMax);
}

void konekWiFi() {
  Serial.print("Menyambungkan ke WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); 
    Serial.print(".");
  }
  Serial.println("\nWiFi tersambung!");
  Serial.print("IP: "); Serial.println(WiFi.localIP());
}

void setupPWM() {
  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(LED_PIN, PWM_CHANNEL);
}

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  dht.begin();
  konekWiFi();
  setupFirebase(); 
  kalibrasiLDR();
  setupPWM();
  
  // Inisialisasi pembacaan gas sensor
  for (int i = 0; i < numReadings; i++) {
    readings[i] = analogRead(gasSensorPin);
    total += readings[i];
  }
  
  Serial.println("Setup selesai!");
}

void loop() {
  
  if (millis() - lastSensorReadTime >= sensorInterval) {
    updateSensors();
    lastSensorReadTime = millis();
    
    // Log ke Serial Monitor
    Serial.print("Suhu: "); Serial.print(temperature);
    Serial.print(" C | Kelembapan: "); Serial.print(humidity);
    Serial.print(" % | Gas: "); Serial.print(average);
    Serial.print(gasDetected ? " (Terdeteksi)" : " (Aman)");
    Serial.print(" | LDR: "); Serial.println(ldrValue);
  }
  
  
  if (millis() - lastFirebaseUpload >= firebaseInterval) {
    uploadToFirebase();
    lastFirebaseUpload = millis();
  }
  
  
  int raw = analogRead(LDR_PIN);
  raw = constrain(raw, ldrMin, ldrMax);
  int targetBrightness = map(raw, ldrMin, ldrMax, 0, 255);
  smoothedBrightness = (smoothedBrightness * (1.0 - SMOOTHING_FACTOR)) + (targetBrightness * SMOOTHING_FACTOR);
  ledcWrite(PWM_CHANNEL, (int)smoothedBrightness);
}