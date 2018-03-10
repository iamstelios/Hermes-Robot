from ev3dev.ev3 import MediumMotor, OUTPUT_A
from enum import IntEnum
from pickled import pickled
from arduino import ArduinoSensorsManager


""" Possible positions of the lift, in percentage units. """
class LiftPos(IntEnum):
    BOTTOM = 0
    TOP = 100

    SHELF_0 = 5
    SHELF_0_UP = 29
    SHELF_1 = 51
    SHELF_1_UP = 65
    SHELF_2 = 83
    SHELF_2_UP = 95

"""
Given a lift position either returns the Reed switch number
if there is a sensor at that location or None if there isn't one.
"""
# TODO add more sensors
def get_reed_id(loc):
    return None
    if loc == LiftPos.SHELF_0:
        return 0
    elif loc == LiftPos.SHELF_0_UP:
        return 1
    elif loc == LiftPos.SHELF_1:
        return 2
    if loc == LiftPos.SHELF_1_UP:
        return 3
    elif loc == LiftPos.SHELF_2:
        return 4
    elif loc == LiftPos.SHELF_2_UP:
        return 5
    else:
        return None

""" Motor unit positions are in the range 0-TOP_MOTOR_POS. """
TOP_MOTOR_POS = 14000 # The position_sp of the motor at the top

""" Converts a position in motor units to a percentage positon. """
def motor_to_percent(motor_pos):
    return int(motor_pos / TOP_MOTOR_POS * LiftPos.TOP)

""" Converts a percentage position to a position in motor units. """
def percent_to_motor(pos):
    return int(pos * TOP_MOTOR_POS / LiftPos.TOP)

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
        self._pkl_position = LiftPos.BOTTOM

        # TODO if we need sensors for other things, initialize this manager
        # outside of VerticalMovementManager and only pass a reference
        self._sensors = ArduinoSensorsManager()

    """
    Sets the stored position of the lift. Useful when it was moved
    manually or fell.
    """
    def set_position(self, pos):
        self._pkl_position = pos

    """
    Moves in steps of the specified size for as long as the given condition evalutes to True. An
    optional maximum distance in motor units can be specified. Makes sure not to go outside of the
    valid position range. Returns the moved distance in motor units or None if the motor was stalled.
    Doesn't update the stored position.
    """
    def _move_while(self, cond, step = 10, max = None):
        init_pos = self._motor.position

        while cond():
            self._motor.run_to_rel_pos(position_sp = step)

            while self._motor.is_running and cond():
                # Make sure motor doesn't stall;
                if self._motor.is_stalled:
                    self._motor.stop()
                    return None

                diff = self._motor.position - init_pos
                new_pos = self._pkl_position + motor_to_percent(diff)

                # Bound distance travelled within the given value if specified
                # and position within percentage range
                if (max != None and diff >= max)
                or (new_pos == 0 or new_pos == 100):
                    self._motor.stop()
                    return diff

            self._motor.stop()

        return self._motor.position - init_pos

    """
    Assuming the lift is close to the given Reed switch, tries
    to position the lift in the middle of the switch.
    reed - (Reed switch number, height range)
    """
    def move_to_switch(self, reed):
        # Size of the range to scan for switches in motor units
        diff = 500

        init_pos = self._motor.position

        def run(n):
            self._motor.run_to_rel_pos(position_sp = n)
            self._motor.wait_until_not_moving()

        see_mag = lambda: self._sensors.read_reed(reed)

        if see_mag():
            # We start on a peak, go up to find valley
            self._move_while(see_mag, 5)

            # Now we reached either the center or one of the sides
            # TODO on top sensor this fails probably
            mvd = self._move_while(lambda: not see_mag(), 5, diff)

            if mvd == diff:
                # We moved far, so it's probably not the center but rather one of the sides,
                # go back until we see the center
                run(-mvd - 10)
                self._move_while(see_mag, -5)
            else:
                # We didn't move far, so this is the center
                pass
        else:
            # We are in a valley or in the center

            # Go up until either we see magnet or go too far
            # TODO on top sensor this fails probably
            mvd = self._move_while(lambda: not see_mag(), 5, diff)

            if mvd == diff:
                # We moved far, so this is one of the sides
                run(-mvd)

                # Go down until we see the first peak
                self._move_while(lambda: not see_mag(), -5)

                # Scale the peak and get to center
                self._move_while(see_mag, -5)

            else:
                # We didn't go far, so this is the center
                pass

        # Store the new position
        self._pkl_position += motor_to_percent(self._motor.position - init_pos)

    """ Moves the lift to the specified percentage position. """
    def move_to(self, pos):
        # Desired position [motor]
        pos_m = percent_to_motor(pos) # Desired position [motor]
        # Current position [motor]
        curr_pos_m = percent_to_motor(self._pkl_position)
        # Absolute current position [motor]
        curr_pos_sp = self._motor.position_sp

        if not self._pkl_position == pos:
            # Begin moving to roughly the right position
            self._motor.run_to_rel_pos(position_sp = pos_m - curr_pos_m)
            self._motor.wait_until_not_moving()

            self._pkl_position = pos

            # Then, if there is a sensor at that height, position the lift
            # accurately until it's at the sensor
            reed = get_reed_id(pos)
            if reed is not None:
                self.move_to_switch(reed)
