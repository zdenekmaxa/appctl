/*

  Kevyn McPhail
  Deeplocal
  FOB Receiving module code
  
  If Button A is pressed the the arduino returns 1, if button 2 is pressed the arduino returns 2
  Button A input is PIN 3, Button B input is PIN 2, and the momentary button press input is PIN 4.
  On the R02A receiving module, Button A is output D2, Button B is output D3, Momentary button press
  is output VT. 

  Hardware: Sparkfun Pro Micro 5V/16MHz

*/

void setup(){
  Serial.begin(9600);
  for (int i = 2; i<7; i++){
    pinMode(i, INPUT);
  }
}

int firstPin;
int secondPin;
int thirdPin;
int fourthPin;
int fifthPin; 

bool button1Down = false;
bool button2Down = false;
bool button3Down = false;
bool button4Down = false;

void loop(){
  firstPin = digitalRead(5);
  secondPin = digitalRead(4);
  thirdPin = digitalRead(3);
  fourthPin = digitalRead(2);
  fifthPin = digitalRead(6); 

  if ((firstPin == 1 & secondPin == 0 & thirdPin == 0 & fourthPin == 0 & fifthPin == 1) && !(button1Down)) {
    Serial.println(1);
    button1Down = true;
    delay(20);
  }
  if ((firstPin == 0 & secondPin == 1 & thirdPin == 0 & fourthPin == 0 & fifthPin == 1) && !button2Down) {
    Serial.println(2);
    button2Down = true;
    delay(20);
  }
  if ((firstPin == 0 & secondPin == 0 & thirdPin == 1 & fourthPin == 0 & fifthPin == 1) && !button3Down) {
    Serial.println(3);
    button3Down = true;
    delay(20);
  }
  if ((firstPin == 0 & secondPin == 0 & thirdPin == 0 & fourthPin == 1 & fifthPin == 1) && !button4Down) {
    Serial.println(4);
    button4Down = true;
    delay(20);
  }
  if (firstPin == 0 & secondPin == 0 & thirdPin == 0 & fourthPin == 0) {
    button1Down = false;
    button2Down = false;
    button3Down = false;
    button4Down = false;
  }
}

