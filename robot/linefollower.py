from time import sleep
from math import sqrt
from ring import RingBuf
from ev3dev.ev3 import LargeMotor, ColorSensor


mLeft = LargeMotor('outD')
mRight = LargeMotor('outC')

class Color:
    def __init__(self, r, g, b):
        self._r = r
        self._g = g
        self._b = b

    def __add__(self, other):
        return Color(self._r + other._r, self._g + other._g, self._b + other._b)

    def __sub__(self, other):
        return Color(self._r - other._r, self._g - other._g, self._b - other._b)

    def __div__(self, other):
        if isinstance(other, Color):
            raise ValueError("Cannot divide color by color.")

        return Color(self._r / other, self._g / other, self._b / other)

    """ Euclidean norm of the color in RGB space. """
    def norm(self):
        return sqrt(self._r * self._r + self._g * self._g + self._b * self._b)

COLOR_VALS = {
    ColorSensor.COLOR_WHITE: Color(349, 220, 288),
    ColorSensor.COLOR_BLACK: Color(10, 7, 8),
    ColorSensor.COLOR_RED: Color(329, 26, 30),
    ColorSensor.COLOR_YELLOW: Color(386, 176, 62),
    ColorSensor.COLOR_GREEN: Color(55, 170, 170) # TODO measure
}

class BetterColorSensor:
    def __init__(self, inp):
        self._sensor = ColorSensor(inp)
        self._vals = RingBuf(Color(0,0,0), 4)
        self._hijack_mode = False

    def __setattr__(self, attr, val):
        if attr == "mode":
            if val == "COL-COLOR":
                self._sensor.mode = "RGB-RAW"
                self._hijack_mode = True
            else:
                self._sensor.mode = val
                self._hijack_mode = False
        else:
            setattr(self._sensor, attr, val)

    def __getattribute__(self, attr):
        if attr == "color" and self._hijack_mode == True:
            col = Color(*self._sensor.raw)
            self._vals.push(col)
            avg = self._vals.avg(4)

            diffs = [ (name, (avg - val).norm()) for (name, val) in COLOR_VALS.items() ]
            diffs = sorted(diffs, key = lambda p: p[1]) # Sort by distance from each color
            return diffs[0][0]
        else:
            return getattr(self._sensor, attr)

    def value(self, n=0):
        return self._sensor.value(n)

cLeft = BetterColorSensor('in3')
cRight = BetterColorSensor('in4')

mRight.polarity = 'inversed'
mLeft.polarity = 'inversed'

class PidRunner:
    def _steering1(self, course):
        power_left = power_right = self.power
        s = (50 - abs(float(course))) / 50
        if course >= 0:
            power_right *= s
            if course > 100:
                power_right = -self.power
        else:
            power_left *= s
            if course < -100:
                power_left = -self.power
        return (int(power_left), int(power_right))

    def _steering2(self, course):
        if course >= 0:
            if course > 100:
                power_right = 0
                power_left = self.power
            else:
                power_left = self.power
                power_right = self.power - ((self.power * course) / 100)
        else:
            if course < -100:
                power_left = 0
                power_right = self.power
            else:
                power_right = self.power
                power_left = self.power + ((self.power * course) / 100)
        return (int(power_left), int(power_right))

    def __init__(self, Kp, Ki, Kd, minRng, maxRng, trg, power, alt_steer=False):
        self.Kp = Kp
        self.Ki = Ki
        self.Kd = Kd
        self.minRng = minRng
        self.maxRng = maxRng
        self.trg = trg
        self.power = power
        self.steering = self._steering2 if alt_steer else self._steering1

    """
    Runs the robot with these PID parameters until one of stopcolours is seen.
    direction - -1 if sensor on left side, 1 if on right side (for black line, white background)
    coloursens - colour sensor object
    linesens - line sensor object
    stopcolours - array of colours to stop at
    """
    def follow_line(self, direction, coloursens, linesens, stopcolours):
        print("PidRunner.follow_line(direction={},stopcolours={})".format(direction, stopcolours))

        # Coerce into list to avoid annoying errors
        if not isinstance(stopcolours, list):
            stopcolours = [stopcolours]

        linesens.mode = 'COL-REFLECT'
        coloursens.mode = 'COL-COLOR'
        lastError = error = integral = 0
        mLeft.run_direct()
        mRight.run_direct()

        colour = -1

        while colour not in stopcolours:
            refRead = linesens.value()

            error = self.trg - (100 * (refRead - self.minRng) / (self.maxRng - self.minRng))
            derivative = error - lastError
            lastError = error
            integral = float(0.5) * integral + error
            course = (self.Kp * error + self.Kd * derivative + self.Ki * integral) * direction

            for (motor, pow) in zip((mLeft, mRight), self.steering(course)):
                motor.duty_cycle_sp = pow
            colour = coloursens.color
            print("colour={}".format(colour))

        sleep(0.25)
        mRight.stop()
        mLeft.stop()
        return colour

linePid = PidRunner(0.60, 0.03, 0.1, 11, 66, 55, 60)
roundaboutPid = PidRunner(0.6, 0.05, 0.3, 1, 88, 55, 75)

# For black line white background:
# -1 if sensor on left side, 1 if on right side
direction = 1

# 0: No color
# 1: Black
# 2: Blue
# 3: Green
# 4: Yellow
# 5: Red
# 6: White
# 7: Brown
colour2num = {'r': 5, 'g': 3, 'y': 4, 'bk': 1, 'w': 6, 'br': 7}
allColours = [5, 3, 4, 7, 1]
allColoursNotBlack = [5, 3, 4, 7]
junctionMarker = colour2num['bk']


""" Merry go round. """
def hook(exitcolour, time=600):
    print("hook(exitcolour={})".format(exitcolour))
    rounddirection = -direction

    # move right to catch line
    mRight.stop()
    mLeft.stop()
    mLeft.run_timed(time_sp=time, speed_sp=-200)
    mRight.run_timed(time_sp=time, speed_sp=200)
    mLeft.wait_until_not_moving()
    input("CONT")

    # pid on inside
    roundaboutPid.follow_line(rounddirection, coloursens=cRight, linesens=cLeft, stopcolours=[exitcolour])
    input("CONT")

    # turn left
    mLeft.run_timed(time_sp=time, speed_sp=200)
    mRight.run_timed(time_sp=time, speed_sp=-200)
    mLeft.wait_until_not_moving()

def run(colour=None):
    if colour == None:
        linePid.follow_line(direction, coloursens=cLeft, linesens=cRight, stopcolours=[junctionMarker])
    else:
        colour = colour2num[colour]

        finishcolour = linePid.follow_line(direction, coloursens=cLeft, linesens=cRight, stopcolours=allColours)
        print("finishcolour={}".format(finishcolour))
        input("CONT")
        if finishcolour == colour2num['bk']:
            linePid.follow_line(direction, coloursens=cLeft, linesens=cRight, stopcolours=allColoursNotBlack)
            input("CONT")

        hook(colour)
        input("CONT")
        linePid.follow_line(direction, coloursens=cLeft, linesens=cRight, stopcolours = [junctionMarker])
        input("CONT")

        if finishcolour != colour2num['bk']:
            linePid.follow_line(direction, coloursens=cLeft, linesens=cRight, stopcolours=allColours)

def dock():
    dockPid = PidRunner(0.65, 0.3, 0, linePid.minRng, linePid.maxRng, linePid.trg, 50)
    dockPid.follow_line(direction, coloursens=cLeft, linesens=cRight, stopcolours=[colour2num['r']])
