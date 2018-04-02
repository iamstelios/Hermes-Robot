import time
from ev3dev.ev3 import LargeMotor, ColorSensor
from enum import Enum, IntEnum
from pickled import pickled
from ring import RingBuf


mLeft = LargeMotor('outD')
mRight = LargeMotor('outC')

mRight.polarity = 'inversed'
mLeft.polarity = 'inversed'

cLeft = ColorSensor('in3')
cRight = ColorSensor('in4')

""" Marks which side of the robot the line is on. """
# TODO did i get sides right?
class MoveDir(IntEnum):
    LINE_LEFT = -1
    LINE_RIGHT = 1

""" Minimum and maximum reflectance the line sensor sees. """
MIN_REFL = 1
MAX_REFL = 60
""" Target value of reflectance for staying on line. """
TARGET_REFL = 50

"""
Stores parameters and provides functionality for following a line using PID.
"""
class PidRunner:
    """ Non-agressive steering. """
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

    """ Aggressive steering. """
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

    def __init__(self, Kp, Ki, Kd, power, alt_steer=False):
        self.Kp = Kp
        self.Ki = Ki
        self.Kd = Kd
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

        stopcolours = list(map(lambda s: colour2num[s] if isinstance(s, str) else s, stopcolours))

        # Move forward a bit
        for motor in (mLeft, mRight):
            motor.stop_action = "coast"
            motor.duty_cycle_sp = self.power
            motor.run_direct()

        time.sleep(0.15)
        for motor in (mLeft, mRight):
            motor.stop()

        linesens.mode = 'COL-REFLECT'
        coloursens.mode = 'COL-COLOR'
        lastError = error = integral = 0

        colour = None
        done = False

        while not done:
            colour = coloursens.color

            mLeft.run_direct()
            mRight.run_direct()

            while colour not in stopcolours:
                refRead = linesens.value()

                error = TARGET_REFL - (100 * (refRead - MIN_REFL) / (MAX_REFL - MIN_REFL))
                derivative = error - lastError
                lastError = error
                integral = float(0.5) * integral + error
                course = (self.Kp * error + self.Kd * derivative + self.Ki * integral) * direction

                for (motor, pow) in zip((mLeft, mRight), self.steering(course)):
                    motor.duty_cycle_sp = pow
                colour = coloursens.color

            mRight.stop()
            mLeft.stop()

            # Check again for colour
            done = True
            for i in range(0, 4):
                if colour != coloursens.color:
                    done = False
                    break

        return colour

# 0: No color
# 1: Black
# 2: Blue
# 3: Green
# 4: Yellow
# 5: Red
# 6: White
# 7: Brown
colour2num = {'r': 5, 'g': 3, 'b': 2, 'y': 4, 'bk': 1, 'w': 6, 'br': 7}
allColours = [5, 3, 4, 7, 1]
allColoursNotBlack = [5, 3, 4, 7]
junctionMarker = colour2num['bk']

""" State of the robot's movement subsystem. """
class MoveState(Enum):
    AT_LINE = 0 # following a line
    AT_JUNCTION = 1 # traversing a junction
    AT_BASE = 2# stopped at a base
    LOST = 3# lost bearings. !!panic!!

#@pickled
class GroundMovementController:
    LINE_PID = PidRunner(0.55, 0.02, 0.05, 70)
    ROUNDABOUT_PID = PidRunner(0.6, 0.05, 0.3, 75)
    DOCK_PID = PidRunner(0.65, 0.3, 0, 25)

    def __init__(self):
        self._pkl_state = MoveState.AT_LINE
        self._pkl_dir = MoveDir.LINE_RIGHT

    """ Force set a movement state, e.g. if the robot was moved manually. """
    def set_state(self, state=MoveState.AT_LINE, dir=MoveDir.LINE_RIGHT):
        self._pkl_state = state
        self._pkl_dir = dir

    """ Follows a straight line until the given colour is seen. """
    def follow_line_until(self, colour, pid_runner=LINE_PID):
        if self._pkl_dir == MoveDir.LINE_RIGHT:
            coloursens = cLeft
            linesens = cRight
        else:
            coloursens = cRight
            linesens = cLeft

        pid_runner.follow_line(self._pkl_dir, coloursens, linesens, [colour])

    """
    Rotates around by at most dist tacho units while looking for lines.
    Rotates back to the last line seen during the initial sweep or back
    to the initial position if no lines are found.
    dist - max distance in tacho count, positive for CW and negative for CCW turn
    sensor - ColourSensor to measure reflectance with
    @returns distance in tacho counts from initial position to last line seen
             or None if no lines were found
    """
    def _rotate_find_lines(self, dist, sensor):
        print("_rotate_find_lines", dist)

        sensor.mode = 'COL-REFLECT'

        buf = RingBuf(0, 5)

        # Threshold reflectance below which we are definitely seeing black
        THRESH_REFL = 7
        # Threshold of variance above which we are on a black-white edge
        VAR_THRESH = 20.0

        init_pos = mRight.position

        mLeft.run_to_rel_pos(speed_sp = 150, position_sp = -dist, stop_action="coast")
        mRight.run_to_rel_pos(speed_sp = 150, position_sp = dist, stop_action="coast")

        furthest_line = 0
        while mRight.is_running or mLeft.is_running:
            val = sensor.value()
            buf.push(val)
            var = buf.var(5)
            print(val)
            if var > VAR_THRESH and val <= THRESH_REFL:
                furthest_line = mRight.position

        diff = furthest_line - mRight.position
        if furthest_line == 0:
            diff = init_pos - mRight.position

        mLeft.run_to_rel_pos(position_sp = -diff, stop_action="coast")
        mRight.run_to_rel_pos(position_sp = diff, stop_action="coast")

        while mRight.is_running or mLeft.is_running:
            pass

        return None if furthest_line == 0 else (furthest_line - init_pos)

    """ Swaps the robot from one side of the line to another. Works with multiple lines in the way. """
    def swap_line_side(self):
        mLeft.speed_sp = mRight.speed_sp = 200

        """ Maximum distance to turn in tacho counts on right motor. """
        rturn = 0
        """ The sensor initially further away from the line. """
        sensor = None

        if self._pkl_dir == MoveDir.LINE_LEFT:
            rturn = -200
            sensor = cRight
            self._pkl_dir = MoveDir.LINE_RIGHT
        else:
            rturn = 200
            sensor = cLeft
            self._pkl_dir = MoveDir.LINE_LEFT

        self._rotate_find_lines(rturn, sensor)

    """
    Turns the robot around on a straight line.
    """
    def reverse_dir(self):
        sensor = None
        dist = 0

        if self._pkl_dir == MoveDir.LINE_RIGHT:
            sensor = cRight
            dist = 700
        else:
            sensor = cLeft
            dist = -700

        self._rotate_find_lines(dist, sensor)

    """ Move straight forwards or backwards by the specified distance. """
    def move_raw(self, dist):
        mLeft.speed_sp = mRight.speed_sp = 200

        mLeft.run_to_rel_pos(position_sp = dist)
        mRight.run_to_rel_pos(position_sp = dist)

        while mRight.is_running:
            pass

    def dock(self):
        self.follow_line_until('r', pid_runner=self.DOCK_PID)

g = GroundMovementController()
