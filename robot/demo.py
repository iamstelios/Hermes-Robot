from ev3dev.ev3 import *
from vertical import *
import time


mLeft = LargeMotor('outD')
mRight = LargeMotor('outC')

col = ColorSensor('in4')
ref = ColorSensor('in3')

col.mode = 'COL-COLOR'
ref.mode = 'COL-REFLECT'

mRight.polarity = 'inversed'
mLeft.polarity = 'inversed'

mPower = 50

# min and max reflection
minRng = 15
maxRng = 80

#
trg = 55

# PID variables
kp = float(0.65)
ki = float(0.10)
kd = 2

# For black line white background:
# -1 if sensor on left side, 1 if on right side
direction = 1


# define non aggressive (steering1) and aggressive (steering2)


def steering1(course, power):
    power_left = power_right = power
    s = (50 - abs(float(course))) / 50
    if course >= 0:
        power_right *= s
        if course > 100:
            power_right = - power
    else:
        power_left *= s
        if course < -100:
            power_left = - power
    return (int(power_left), int(power_right))


def steering2(course, power):
    if course >= 0:
        if course > 100:
            power_right = 0
            power_left = power
        else:
            power_left = power
            power_right = power - ((power * course) / 100)
    else:
        if course < -100:
            power_left = 0
            power_right = power
        else:
            power_right = power
            power_left = power + ((power * course) / 100)
    return (int(power_left), int(power_right))


def run(mPower, trg, kp, kd, ki, direction, minRng, maxRng):
    lastError = error = integral = 0
    mLeft.run_direct()
    mRight.run_direct()

    while col.color != 5: # 5 -> red
        print("col: %d" % col.color)
        print("ref: %d" % ref.value())

        refRead = ref.value()

        error = trg - (100 * (refRead - minRng) / (maxRng - minRng))
        derivative = error - lastError
        lastError = error
        integral = float(0.5) * integral + error
        course = (kp * error + kd * derivative + ki * integral) * direction

        # change between steering1 and steering 2 HERE for different modes
        for (motor, pow) in zip((mLeft, mRight), steering2(course, mPower)):
            motor.duty_cycle_sp = pow
        time.sleep(0.01)

    mLeft.stop()
    mRight.stop()

v = VerticalMovementManager()

""" Turns the robot around on the line, given
the initial direction. """
def turn_around(from_dir):
    done = False

    # Reset duty cycles
    mLeft.duty_cycle_sp = 0
    mRight.duty_cycle_sp = 0

    mLeft.run_direct()
    mRight.run_direct()

    mLeft.duty_cycle_sp = -30
    mRight.duty_cycle_sp = 30

    time.sleep(1.5)

    # Read the reflectance under the light sensor
    ref_val = ref.value()
    while not ref_val > 40:
        ref_val = ref.value()
        print(ref_val)

    time.sleep(0.3)

    if from_dir == -1:
        time.sleep(1.2)

        mLeft.duty_cycle_sp = 30
        mRight.duty_cycle_sp = -30

        ref_val = ref.value()
        while not ref_val > 40:
            ref_val = ref.value()
            print(ref_val)

    mLeft.duty_cycle_sp = 0
    mRight.duty_cycle_sp = 0
    mLeft.stop()
    mRight.stop()

def dock(delivery, level_x, level_x_up):
    # TODO does initializing this several times work? should but some files might stay open
    if delivery == 0:
        # raise lift to level_x
        v.move_to(level_x)

        # move forward
        mLeft.run_timed(time_sp=1500, speed_sp=200)
        mRight.run_timed(time_sp=1500, speed_sp=200)
        mLeft.wait_until_not_moving()

        # raise lift to level_x_up
        v.move_to(level_x_up)

        # go back out of shelf
        mLeft.run_timed(time_sp=2000, speed_sp=-200)
        mRight.run_timed(time_sp=2000, speed_sp=-200)
        mLeft.wait_until_not_moving()

        v.move_to(LiftPos.BOTTOM)

    else:
        v.move_to(LiftPos.SHELF_0_UP)

        mLeft.run_timed(time_sp=1500, speed_sp=200)
        mRight.run_timed(time_sp=1500, speed_sp=200)
        mLeft.wait_until_not_moving()
        # lower here
        #
        v.move_to(LiftPos.BOTTOM)

        mLeft.run_timed(time_sp=2000, speed_sp=-200)
        mRight.run_timed(time_sp=2000, speed_sp=-200)
        mLeft.wait_until_not_moving()

def demo():
    global direction
    direction = 1

    print("Moving to shelf")
    run(mPower, trg, kp, kd, ki, direction, minRng, maxRng)

    # receive here
    print("Docking into shelf")
    dock(0, level_x=LiftPos.SHELF_0, level_x_up=LiftPos.SHELF_0_UP)

    turn_around(direction)

    # go to the drop-off station
    print("Going back to drop-off station")
    direction = -1
    run(mPower, trg, kp, kd, ki, direction, minRng, maxRng)

    # drop box off at station
    print("Dropping box off")
    dock(1, None, None)

    # can't turn here, robot runs into wall
    #turn_around(direction)

if __name__ == "__main__":
    demo()
