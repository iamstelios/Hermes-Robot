from ev3dev.ev3 import MediumMotor, OUTPUT_A
from enum import IntEnum
from pickled import pickled
from arduino import ArduinoSensorsManager


""" Possible positions of the lift, in percentage units. """
class LiftPos(IntEnum):
    BOTTOM = 0
    TOP = 100

    SHELF_0 = 16
    SHELF_0_UP = 32
    SHELF_1 = 51
    SHELF_1_UP = 65
    SHELF_2 = 83
    SHELF_2_UP = 95

"""
Given a lift position either returns a pair of
(Reed switch number, height range) if there is
a sensor at that location or None if there isn't one.
"""
# TODO add more sensors
def get_reed_id(loc):
    if loc == LiftPos.SHELF_0:
        return (0, int(TOP_MOTOR_POS/3))
    elif loc == LiftPos.SHELF_0_UP:
        return (1, int(TOP_MOTOR_POS/8))
    elif loc == LiftPos.SHELF_1:
        return (2, int(TOP_MOTOR_POS/4))
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
    Assuming the lift is close to the given Reed switch, tries
    to position the lift in the middle of the switch.
    reed - (Reed switch number, height range)
    """
    def move_to_switch(self, reed):
        # Size of the range to scan for switches in motor units
        diff = reed[1]

        init_pos_m = self._motor.position

        # We began in middle of range to scan, so first go up halfway
        self._motor.run_to_rel_pos(position_sp = int(diff/2))
        self._motor.wait_until_not_moving()

        # Motor positions at top and bottom of range where the switch
        # is visible
        top = 0
        bot = 1e10

        # Do a sweep down and then back up
        for _ in range(0, 2):
            diff = -diff
            self._motor.run_to_rel_pos(position_sp = diff)

            while self._motor.is_running and not self._motor.is_stalled:
                if self._sensors.read_reed(reed[0]):
                    # Expand the visibility range as far as possible
                    top = max(top, self._motor.position)
                    bot = min(bot, self._motor.position)

            self._motor.wait_until_not_moving(timeout=500)

        if top != 0 and bot != 1e10:
            # Move to middle of switch visibility range
            self._motor.run_to_abs_pos(position_sp = int((top + bot) / 2))
            self._motor.wait_until_not_moving()
        else:
            # We failed to find a switch, move back to initial position
            self._motor.run_to_abs_pos(position_sp = init_pos_m)

        # Store the new position
        self._pkl_position += motor_to_percent(self._motor.position - init_pos_m)

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

    """
    Sets the stored position of the lift. Useful when it was moved
    manually or fell.
    """
    def set_position(self, pos):
        self._pkl_position = pos
