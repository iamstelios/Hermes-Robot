import serial
import time


"""
Communicates with the Arduino to retrieve readings from
connected sensors. Arduino protocol:
P (Ping) - should reply with "All systems online."
R (Reed) - replies with a bitmask of Reed switch readings
"""
class ArduinoSensorsManager:
    """
    Initializes the Arduino sensors communication.
    devArduino - path to the device where Arduino is connected
    """
    def __init__(self, devArduino = '/dev/ttyACM0'):
        self._comm = serial.Serial(devArduino, 9600, timeout=1)
        time.sleep(3) # Really long delay necessary, otherwise fails
        self._comm.write(b'P')
        line = self._comm.readline()
        if not line.startswith(b"All systems online."):
            raise IOError("Cannot find Arduino at " + devArduino)

    def __del__(self):
        self._comm.close()

    """
    Reads the n-th Reed switch and returns True if there is
    a magnet near, otherwise False.
    """
    def read_reed(self, n):
        self._comm.write(b'R')
        line = self._comm.readline()
        val = int(line)
        val >>= n;
        val &= 0x1
        return val != 0x1
