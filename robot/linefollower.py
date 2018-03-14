from time import sleep
from ev3dev.auto import *

mLeft = LargeMotor('outD')
mRight = LargeMotor('outC')
cLeft = ColorSensor('in3')
cRight = ColorSensor('in4')

mRight.polarity = 'inversed'
mLeft.polarity = 'inversed'

mPower = 75

# min and max reflection
minRng = 1
maxRng = 88

#
trg = 55

# PID variables
kp = float(0.6)
ki = float(0.05)
kd = 0.3

# For black line white background:
# -1 if sensor on left side, 1 if on right side

# 0: No color
# 1: Black
# 2: Blue
# 3: Green
# 4: Yellow
# 5: Red
# 6: White
# 7: Brown

direction = 1
junctionmarker = 1

colour2num = {'r': 5, 'b': 2, 'g': 3, 'y': 4, 'bk': 1, 'w': 6, "br": 7}
allColours = [5, 2, 3, 4, 7, 1]


def steering(course, power):
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
    return int(power_left), int(power_right)


def pid(mPower, trg, kp, kd, ki, direction, minRng, maxRng, coloursens, linesens, stopcolours):
    linesens.mode = 'COL-REFLECT'
    coloursens.mode = 'COL-COLOR'
    lastError = error = integral = 0
    mLeft.run_direct()
    mRight.run_direct()

    while coloursens.color not in stopcolours:
        print(coloursens.color)
        refRead = linesens.value()

        error = trg - (100 * (refRead - minRng) / (maxRng - minRng))
        derivative = error - lastError
        lastError = error
        integral = float(0.5) * integral + error
        course = (kp * error + kd * derivative + ki * integral) * direction

        for (motor, pow) in zip((mLeft, mRight), steering(course, mPower)):
            motor.duty_cycle_sp = pow
        sleep(0.01)
    sleep(0.25)
    mRight.stop()
    mLeft.stop()
    return coloursens.color


def hook(exitcolour, time=500):
    rounddirection = -direction
    # move right to catch line
    mRight.stop()
    mLeft.stop()
    mLeft.run_timed(time_sp=time, speed_sp=100)
    mRight.run_timed(time_sp=time, speed_sp=250)
    sleep(time / 1000)
    # pid on inside
    pid(mPower, trg, kp, kd, ki, rounddirection, minRng, maxRng, coloursens=cRight, linesens=cLeft,
        stopcolours=exitcolour)
    mLeft.run_timed(time_sp=time, speed_sp=250)
    mRight.run_timed(time_sp=time, speed_sp=100)
    sleep(time / 1000)
    pid(mPower, trg, kp, kd, ki, direction, minRng, maxRng, coloursens=cLeft, linesens=cRight,
        stopcolours=[junctionmarker])


def run(colour=None):
    if colour == None:
        pid(mPower, trg, kp, kd, ki, direction, minRng, maxRng, coloursens=cLeft, linesens=cRight,
            stopcolours=[junctionmarker])
    else:
        c = colour2num[colour]

        finishcolour = pid(mPower, trg, kp, kd, ki, direction, minRng, maxRng, coloursens=cLeft, linesens=cRight,
                           stopcolours=allColours)

        if finishcolour == colour2num['bk']:
            pid(mPower, trg, kp, kd, ki, direction, minRng, maxRng, coloursens=cLeft, linesens=cRight,
                stopcolours=allColours)

        hook(c)
        pid(mPower, trg, kp, kd, ki, direction, minRng, maxRng, coloursens=cLeft, linesens=cRight,
            stopcolours=[junctionmarker])

        if finishcolour != colour2num['bk']:
            pid(mPower, trg, kp, kd, ki, direction, minRng, maxRng, coloursens=cLeft, linesens=cRight,
                stopcolours=allColours)


def dock():
    mPower = 50
    kp = 0.65
    ki = 0.3
    kd = 0
    pid(mPower, trg, kp, kd, ki, direction, minRng, maxRng, coloursens=cLeft, linesens=cRight,
        stopcolours=[5])
