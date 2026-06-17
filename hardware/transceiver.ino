#include <WiFi.h>
#include <WiFiUdp.h>

const char* ssid = "CodeRed_SOS_Network"; 
WiFiUDP udp;

const int universalPort = 4330; // Both send and receive on the SAME port

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("--- CodeRed Universal Transceiver Booting ---");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid);
  
  Serial.print("Connecting to Mesh Network");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nSUCCESS: Connected!");
  Serial.print("Device IP: ");
  Serial.println(WiFi.localIP());
  
  // Start listening on the universal port
  udp.begin(universalPort);
  Serial.println("Transceiver Ready. Listening for signals...");
}

void loop() {
  // 1. LISTEN FOR ANY INCOMING NETWORK MESSAGES
  int packetSize = udp.parsePacket();
  if (packetSize) {
    char incomingPacket[512];
    int len = udp.read(incomingPacket, 511);
    if (len > 0) {
      incomingPacket[len] = 0;
      // Print the received message to the Serial Monitor
      Serial.println(incomingPacket); 
    }
  }

  // 2. SEND OUT ANY MESSAGES TYPED INTO THE SERIAL MONITOR
  if (Serial.available()) {
    String outboundMessage = Serial.readStringUntil('\n');
    outboundMessage.trim(); 
    
    if (outboundMessage.length() > 0) {
      // Dynamically calculate the perfect broadcast IP for whatever network you are on
      IPAddress broadcastIP = ~WiFi.subnetMask() | WiFi.localIP();
      
      // Broadcast it on the universal port
      udp.beginPacket(broadcastIP, universalPort);
      udp.print(outboundMessage);
      udp.endPacket();
    }
  }
}
