// #include <WiFi.h>
// #include <WebServer.h>
// #include "DHT.h"
// #include <FirebaseESP32.h>

// // ===== Konfigurasi WiFi =====
// const char* ssid = "Infinix HOT 9 Play";      
// const char* password = "Nursitii12";   

// // ===== Inisialisasi Web Server =====
// WebServer server(80);

// // ===== Konfigurasi Sensor =====
// // DHT22
// #define DHTPIN 14
// #define DHTTYPE DHT22
// DHT dht(DHTPIN, DHTTYPE);

// // LDR dan PWM LED
// const int LDR_PIN = 34;     // Input analog dari LDR
// const int LED_PIN = 16;     // PWM untuk LED strip
// const int PWM_CHANNEL = 0;
// const int PWM_FREQ = 5000;
// const int PWM_RESOLUTION = 8;

// int ldrMin = 4095;
// int ldrMax = 0;
// float smoothedBrightness = 0;
// const float SMOOTHING_FACTOR = 0.1;

// // Sensor Gas MQ-135
// const int gasSensorPin = 35;
// const int numReadings = 10;
// int readings[numReadings] = {0};
// int readIndex = 0;
// int total = 0;
// int average = 0;
// const int thresholdHigh = 2900;
// const int thresholdLow  = 1900;
// bool gasDetected = false;

// // DHT22
// float temperature = 0;
// float humidity = 0;

// // LDR monitoring
// int ldrValue = 0;

// // Waktu baca sensor
// unsigned long lastSensorReadTime = 0;
// const unsigned long sensorInterval = 2000;

// // ========== Fungsi Update Sensor ==========
// void updateSensors() {
//   ldrValue = analogRead(LDR_PIN);

//   total -= readings[readIndex];
//   readings[readIndex] = analogRead(gasSensorPin);
//   total += readings[readIndex];
//   readIndex = (readIndex + 1) % numReadings;
//   average = total / numReadings;
//   gasDetected = (average > thresholdHigh);

//   float temp = dht.readTemperature();
//   float hum = dht.readHumidity();

//   if (!isnan(temp) && !isnan(hum) && temp > -40 && hum >= 0 && hum <= 100) {
//     temperature = temp;
//     humidity = hum;
//   } else {
//     Serial.println("Gagal membaca DHT22! Data tidak valid.");
//   }
// }

// // ========== Halaman Web ==========
// String getSensorDataPage() {
//   String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
//   html += "<title>ESP32 Sensor Data</title>";
//   html += "<style>body { font-family: Arial; text-align: center; }</style>";
//   html += "</head><body>";
//   html += "<h1>Data Sensor ESP32</h1>";
//   html += "<p><strong>Suhu:</strong> <span id='temp'>0</span> &deg;C</p>";
//   html += "<p><strong>Kelembapan:</strong> <span id='hum'>0</span> %</p>";
//   html += "<p><strong>Gas:</strong> <span id='gas'>0</span> (<span id='status'>Aman</span>)</p>";
//   html += "<p><strong>Cahaya (LDR):</strong> <span id='ldr'>0</span></p>";
//   html += "<script>";
//   html += "function updateData() {";
//   html += "fetch('/data').then(response => response.json()).then(data => {";
//   html += "document.getElementById('temp').innerText = data.temperature;";
//   html += "document.getElementById('hum').innerText = data.humidity;";
//   html += "document.getElementById('gas').innerText = data.gas;";
//   html += "document.getElementById('status').innerText = data.status;";
//   html += "document.getElementById('ldr').innerText = data.ldr;";
//   html += "});";
//   html += "}";
//   html += "setInterval(updateData, 1000);";
//   html += "</script>";
//   html += "</body></html>";
//   return html;
// }

// void handleRoot() {
//   server.send(200, "text/html", getSensorDataPage());
// }

// void handleData() {
//   server.sendHeader("Access-Control-Allow-Origin", "*");
//   String json = "{";
//   json += "\"temperature\": " + String(temperature) + ",";
//   json += "\"humidity\": " + String(humidity) + ",";
//   json += "\"gas\": " + String(average) + ",";
//   json += "\"status\": \"" + String(gasDetected ? "Terdeteksi" : "Aman") + "\",";
//   json += "\"ldr\": " + String(ldrValue);
//   json += "}";
//   server.send(200, "application/json", json);
// }

// // ========== SETUP ==========
// void setup() {
//   Serial.begin(115200);
//   delay(2000);
//   dht.begin();

//   for (int i = 0; i < numReadings; i++) {
//     readings[i] = analogRead(gasSensorPin);
//     total += readings[i];
//   }

//   // Kalibrasi LDR
//   Serial.println("Kalibrasi LDR: Paparkan ke kondisi terang dan gelap!");
//   unsigned long startTime = millis();
//   while (millis() - startTime < 5000) {
//     int val = analogRead(LDR_PIN);
//     if (val < ldrMin) ldrMin = val;
//     if (val > ldrMax) ldrMax = val;
//     delay(100);
//   }
//   Serial.print("Terang (min): "); Serial.println(ldrMin);
//   Serial.print("Gelap (max): "); Serial.println(ldrMax);

//   // PWM Setup untuk LED
//   ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
//   ledcAttachPin(LED_PIN, PWM_CHANNEL);

//   // WiFi
//   Serial.print("Menghubungkan ke WiFi ");
//   Serial.println(ssid);
//   WiFi.begin(ssid, password);
//   while (WiFi.status() != WL_CONNECTED) {
//     delay(500); Serial.print(".");
//   }
//   Serial.println("\nTerhubung ke WiFi!");
//   Serial.print("IP Address ESP32: ");
//   Serial.println(WiFi.localIP());

//   // Web server
//   server.on("/", handleRoot);
//   server.on("/data", handleData);
//   server.begin();
//   Serial.println("Web server dimulai.");
// }

// // ========== LOOP ==========
// void loop() {
//   // Pembacaan berkala sensor
//   if (millis() - lastSensorReadTime >= sensorInterval) {
//     updateSensors();
//     lastSensorReadTime = millis();
//   }

//   // Handle web
//   server.handleClient();

//   // Update brightness LED otomatis dari LDR
//   int raw = analogRead(LDR_PIN);
//   raw = constrain(raw, ldrMin, ldrMax);
//   int targetBrightness = map(raw, ldrMin, ldrMax, 0, 255);
//   smoothedBrightness = (smoothedBrightness * (1.0 - SMOOTHING_FACTOR)) + (targetBrightness * SMOOTHING_FACTOR);
//   int pwmValue = (int)smoothedBrightness;
//   ledcWrite(PWM_CHANNEL, pwmValue);

//   // Debug Serial
//   Serial.print("Suhu: "); Serial.print(temperature); Serial.print(" C, ");
//   Serial.print("Kelembapan: "); Serial.print(humidity); Serial.print(" %, ");
//   Serial.print("Gas: "); Serial.print(average);
//   Serial.println(gasDetected ? " Terdeteksi" : " Aman");
//   Serial.print("LDR: "); Serial.print(raw);
//   Serial.print(" | PWM: "); Serial.println(pwmValue);
// }
