#---------FOR PRESENTATION--------------
from ev3dev.ev3 import *
from time import sleep, time
wait_time = 4
#-------------SETUP---------------------
mLeft = LargeMotor('outD')
mRight = LargetMotor('outC')

col = ColorSensor('in4')
ref = ColorSensor('in3')

col.mode = 'COL-COLOR'
ref.mode = 'COL-REFLECT'

mRight.polarity = 'inversed'
mLeft.polariy = 'inversed'

mPower = 50

# min and max reflection
minRng = 15
maxRng = 80

trg = 55
#---------------PID VARS------------------
kp = float(0.65)
ki = float(0.10)
kd = 2

# for black line, white background:
# -1 if sensor on left side
# 1 if on right side
direction = 1
#---------------STEERING------------------
# non aggressive steering
def steering1(course, power):
    power_left = power_right = power
    s = (50 - abs(float(course))) / 50
    if course >= 0:
        power_right *= s
        if course > 100:
            power_right = -power
    else:
        power_left *= s
        if course < -100
            power_left = -power
    return (int(power_left), int(power_right))

# aggressive steering
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
#-------------PID MOVEMENT----------------
def pid_run(mPower, trg, kp, kd, ki, direction, minRng, maxRng, color):
    lastError = error = integral = 0
    mLeft.run_direct()
    mRight.run_direct()

    while col.color != color: # color = junction entry marker color
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
#-----------------------------------------