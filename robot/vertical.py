from ev3dev.ev3 import MediumMotor, OUTPUT_A
from enum import IntEnum, Enum
from pickled import pickled
from arduino import ArduinoSensorsManager
import time


""" Possible positions of the lift, in percentage units. """
class LiftPos(IntEnum):
    BOTTOM = 0
    TOP = 100

    SHELF_0 = 5
    SHELF_0_UP = 28
    SHELF_1 = 41
    SHELF_1_UP = 61
    SHELF_2 = 87
    SHELF_2_UP = 100

""" Motor unit positions are in the range 0-TOP_MOTOR_POS. """
TOP_MOTOR_POS = 13000 # The position delta of the motor from top to bottom

""" Converts a position in motor units to a percentage positon. """
def motor_to_percent(motor_pos):
    return motor_pos / TOP_MOTOR_POS * LiftPos.TOP

""" Converts a percentage position to a position in motor units. """
def percent_to_motor(pos):
    return int(pos * TOP_MOTOR_POS / LiftPos.TOP)

"""
Given a lift position either returns the Reed switch number
if there is a sensor at that location or None if there isn't one.
"""
def get_reed_id(loc):
    if loc == LiftPos.SHELF_0:
        return 0
    elif loc == LiftPos.SHELF_0_UP:
        return 1
    elif loc == LiftPos.SHELF_1:
        return 2
    elif loc == LiftPos.SHELF_1_UP:
        return 3
    elif loc == LiftPos.SHELF_2:
        return 4
    elif loc == LiftPos.SHELF_2_UP:
        return 5
    else:
        return None

""" Manages the movement of the lift and runs the vertical motor. """
@pickled
class VerticalMovementManager:
    """
    Initializes the manager.
    whereMotor - interface on which vertical motor is attached
    """
    def __init__(self, whereMotor = OUTPUT_A):
        # Initialize motor
        self._motor = MediumMotor(whereMotor)
        if not self._motor.connected:
            raise ValueError("Medium motor at " + whereMotor + " not connected!")
        self._motor.stop_action = MediumMotor.STOP_ACTION_HOLD
        # Default speed is 0, setting this is necessary
        self._motor.speed_sp = 500

        # Position of the lift in percentage units, preserved across runs
        self._pkl_pos = LiftPos.BOTTOM

        # TODO if we need sensors for other things, initialize this manager
        # outside of VerticalMovementManager and only pass a reference
        self._sensors = ArduinoSensorsManager()

    """
    Sets the stored position of the lift. Useful when it was moved
    manually or fell.
    """
    def set_position(self, pos):
        self._pkl_pos = pos

    """
    Moves the lift to the specified percentage position. Doesn't use
    any sensors besides the motor tacho count.
    pos - where to move
    """
    def _move_to_raw(self, pos):
        if self._pkl_pos != pos:
            curr_pos_m = percent_to_motor(self._pkl_pos) # Current position [motor]
            pos_m = percent_to_motor(pos) # Desired position [motor]

            self._motor.run_to_rel_pos(position_sp = pos_m - curr_pos_m)
            self._motor.wait_until_not_moving()
            self._pkl_pos = pos

    class _MoveWhileResult(Enum):
        STALLED = 1, # Engine was stalled
        OVER_RANGE = 2, # Stopped at percentage range boundary
        OVER_LIM = 3, # Stopped at given limit
        COND = 4, # Stopped due to condition False

    """
    Moves with the specified slowdown for as long as the given condition evalutes to True. An
    optional maximum distance in motor units can be specified. Makes sure not to go outside of the
    valid position range. Returns the distance travelled in motor units.
    cond - () -> Boolean function. evaluated as frequently as possible. movement stops when False
    mult - how many times to slow down. larger values allow for more precision and an earlier stop
    [lim] - maximum distance to travel in motor units
    """
    def _move_while(self, cond, mult = 4, lim = None):
        print("_move_while(cond={},mult={},lim={})".format(cond, mult, lim))

        # First position within valid range
        if self._pkl_pos < 0:
            self._move_to_raw(0)
        elif self._pkl_pos > 100:
            self._move_to_raw(100)

        init_pos = self._motor.position
        sign = mult // abs(mult)

        # Set motor parameters
        self._motor.speed_sp //= mult
        self._motor.polarity = 'normal' if mult > 0 else 'inversed'
        self._motor.run_forever()

        ret = None

        while self._motor.is_running and cond():
            print(cond())
            if self._motor.is_stalled:
                ret = self._MoveWhileResult.STALLED
                break
            else:
                motor_pos = self._motor.position * sign
                diff = motor_pos - init_pos

                if lim != None and diff >= lim:
                    ret = self._MoveWhileResult.OVER_LIM
                    break

                new_pos = self._pkl_pos + motor_to_percent(diff)

                if new_pos <= -2 or new_pos >= 102:
                    ret = self._MoveWhileResult.OVER_RANGE
                    break

        if ret == None:
            ret = self._MoveWhileResult.COND

        # Reset motor parameters
        self._motor.stop()
        self._motor.polarity = 'normal'
        self._motor.speed_sp *= mult

        # Update position
        diff = self._motor.position - init_pos
        self._pkl_pos += motor_to_percent(diff)
        
        return ret

    """
    Tries to position the lift in the middle of the switch.
    reed - Reed switch number
    pos - an approximate percentage position of the switch
    """
    def _move_to_switch(self, reed, pos):
        print("_move_to_switch(reed={},pos={})".format(reed, pos))

        SPREAD = 7 # Minimum distance to the sensor to begin sensing

        # Distance and direction to the sensor
        diff = pos - self._pkl_pos
        sign = int(diff / abs(diff))
        assert(abs(sign) == 1)

        see_mag = lambda: self._sensors.read_reed(reed)

        if abs(diff) >= SPREAD:
            if sign > 0:
                print("Switch above lift")
            else:
                print("Switch below lift")

            # Move up to sensor at full speed, pray it doesn't miss
            mvd = self._move_while(lambda: not see_mag(), sign)
            if mvd != self._MoveWhileResult.COND:
                raise ValueError("ERROR: Sensor not within reach. Move result: " + str(mvd))

            # Scale the peak to get to the center, use reduced speed for accuracy
            mvd = self._move_while(see_mag, 5 * sign, 1000)

        else:
            print("WARNING: Lift close to desired position, not moving.")
            return

            # First find one of the peaks
            mult = 4 * sign
            if not see_mag():
                print("Looking for peak 1")

                diff = 500

                mvd = self._move_while(lambda: not see_mag(), mult, diff)

                while mvd != self._MoveWhileResult.COND:
                    print(mvd)
                    print("Moved far, reverting search direction")
                    diff *= 2
                    mult *= -1

                    mvd = self._move_while(lambda: not see_mag(), mult, diff)

            sign = int(mult / abs(mult))

            peak1 = [0, 0]
            peak2 = [0, 0]

            # We're on a peak, find its limits by going up and down
            print("Scanning peak 1")
            time.sleep(1.5)
            self._move_while(see_mag, mult)
            peak1[(sign + 1) // 2] = self._motor.position

            print("Scanning peak 1 in 2nd direction")
            time.sleep(1.5)
            # Move a tiny bit down to be within peak again
            mvd = self._move_while(lambda: not see_mag(), -mult, 500) 
            if mvd != self._MoveWhileResult.COND:
                raise ValueError("ERROR: peak 1 not wi")

            self._move_while(see_mag, -mult)
            peak1[(-sign + 1) // 2] = self._motor.position

            print(peak1)
            return

            print("Looking for peak 2")
            time.sleep(1.5)
            mvd = self._move_while(lambda: not see_mag(), -4, 250)
            if mvd == self._MoveWhileResult.OVER_LIM or mvd == self._MoveWhileResult.OVER_RANGE:
                print("Moved far down from peak 1, so peak 2 is above. Moving to center")
                self._move_to_raw(self._pkl_pos + motor_to_percent(peak1[1] - self._motor.position))
                self._move_to_raw(self._pkl_pos + 1)
            else:
                print("Moved just a bit from peak 1, so peak 2 is below. Moving to center")
                top = self._motor.position
                self._move_to_raw(self._pkl_pos + motor_to_percent(peak1[0] - top)/2)

    """
    Moves the lift to the specified percentage position, using all
    available information.
    pos - where to move
    """
    def move_to(self, pos):
        if not self._pkl_pos == pos:
            reed = get_reed_id(pos)

            if reed is not None:
                # If there is a sensor at that height, position the lift
                # accurately until it's at the sensor
                self._move_to_switch(reed, pos)
            else:
                # Otherwise move to the position using just the tacho count
                self._move_to_raw(pos)
