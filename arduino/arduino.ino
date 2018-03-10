// Array of pins on which Reed switches are.
int reedSwitches[] = { 7, 6, 5, 4, 3, 2 };

void setup() {
  // Initialize serial communication at 9600 bits per second
  Serial.begin(9600);

  // Default all switches to high
  for (int s : reedSwitches) {
    pinMode(s, INPUT_PULLUP);
  }
}

// Reads Reed switches and returns their values as a bitset,
// starting from LSB for the first switch.
int readReedSwitches() {
  int ret = 0;
  int mask = 1;
  for (int s : reedSwitches) {
    ret += mask * digitalRead(s);
    mask <<= 1;
  }
  return ret;
}

void loop() {
  if (Serial.available() > 0) {
    int byteIn = Serial.read();
    
#ifdef DEBUG
    Serial.print("Got input: ");
    Serial.println((char)(byteIn));
#endif

    if (byteIn == 'P') { // Ping
      Serial.println("All systems online.");
    } else if (byteIn == 'R') { // Reed
      Serial.println(readReedSwitches());
    }
  }
}
