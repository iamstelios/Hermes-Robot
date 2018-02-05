from ev3dev.ev3 import MediumMotor, OUTPUT_A, UltrasonicSensor, INPUT_4
from enum import IntEnum
from pickled import pickled
from ring import RingBuf


""" Possible positions of the lift, in range from 0 to 100. """
class LiftPos(IntEnum):
    BOTTOM = 0
    TOP = 100

    SHELF_0 = 20
    SHELF_1 = 53
    SHELF_2 = 90

"""
The difference in percentage units between a position just below the shelf
and just above it, holding the box. Moving from a shelf position to that
position plus this lifts the box.
"""
BOX_LIFT_DELTA = 12

"""
The top position expressed both in motor units (tacho counts) and in
centimeters relative to the distance sensor.
"""
TOP_POS_MOTOR = 13000
TOP_POS_CM = 32.0

""" Converts a position in motor units to a percentage positon. """
def motor_to_percent(pos_motor):
    return pos_motor / TOP_POS_MOTOR * LiftPos.TOP

""" Converts a percentage position to a position in motor units. """
def percent_to_motor(pos):
    return pos * TOP_POS_MOTOR / LiftPos.TOP

""" Converts a position in centimeters to a percentage positon. """
def cm_to_percent(pos_cm):
    return pos_cm / TOP_POS_CM * LiftPos.TOP

""" Converts a percentage position to a position in centimeters. """
def percent_to_cm(pos):
    return pos * TOP_POS_CM / LiftPos.TOP

""" Manages the movement of the lift and runs the vertical motor. """
@pickled
# TODO measure constants
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

        # Initialize the ultrasonic distance sensor
        self._dist_sensor = UltrasonicSensor(INPUT_4)

        # Position of the lift in motor units, preserved across runs
        self._pkl_pos_motor = 0
        # Position of the lift in centimeters, preserved across runs
        self._pkl_pos_cm = 0

    """
    Returns the height measured by the ultrasonic distance sensor,
    with some smoothing applied.
    """
    def measure_height():
        r = RingBuf('f', 8)
        for _ in range(0, 8):
            r.push(self._dist_sensor.distance_centimeters)
            time.sleep(0.01)
        return r.avg(8)

    """ Moves the lift to the specified percentage position. """
    def move_to(self, pos):
        # TODO logic here is wrong, make right
        new_pos_motor = percent_to_motor(pos)
        new_pos_cm = percent_to_cm(pos)

        POS_CM_EPS = 3 # Maximum difference between measured and desired position
        while not abs(self.measure_height() - new_pos_cm) < POS_CM_EPS:
            # Move motor and wait for it to stop
            self._motor.run_to_rel_pos(position_sp = new_pos_motor - self._pkl_pos_motor)
            self._motor.wait_until_not_moving()
            # Update stored position
            self._pkl_pos_motor = new_pos_motor
            self._pkl_pos_cm = measure_height()

    """
    Sets the stored position of the lift. Useful when it was moved
    manually or fell.
    """
    def set_position(self, pos):
        self._pkl_pos_motor = percent_to_motor(pos)
        self._pkl_pos_cm = percent_to_cm(pos)
