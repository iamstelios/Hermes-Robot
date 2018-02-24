from ev3dev.ev3 import MediumMotor, OUTPUT_A
from enum import IntEnum
from pickled import pickled


""" Possible positions of the lift, in percentage units. """
class LiftPos(IntEnum):
    BOTTOM = 0
    TOP = 100

    SHELF_0 = 20
    SHELF_1 = 53
    SHELF_2 = 90

"""
The difference in percentage units between a position just below the shelf
and just above it, holding the box.
"""
BOX_LIFT_DELTA = 12

""" Motor unit positions are in the range 0-TOP_MOTOR_POS. """
TOP_MOTOR_POS = 13000 # The position_sp of the motor at the top

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
    # TODO add sensors to make sure lift is in right position
    def __init__(self, whereMotor = OUTPUT_A):
        # Initialize motor
        self._motor = MediumMotor(whereMotor)
        if not self._motor.connected:
            raise Error("Medium motor at " + whereMotor + " not connected!")
        self._motor.stop_action = MediumMotor.STOP_ACTION_HOLD
        # Default speed is 0, setting this is necessary
        self._motor.speed_sp = 500
        # Position of the lift in motor units, preserved across runs
        self._pkl_position = LiftPos.BOTTOM

    """ Moves the lift to the specified percentage position. """
    def move_to(self, pos):
        self._motor.wait_until_not_moving()
        new_pos = percent_to_motor(pos)
        if not self._pkl_position == new_pos:
            self._motor.run_to_rel_pos(position_sp = new_pos - self._pkl_position)
            self._pkl_position = new_pos

    """
    Sets the stored position of the lift. Useful when it was moved
    manually or fell.
    """
    def set_position(self, pos):
        self._pkl_position = percent_to_motor(pos)
