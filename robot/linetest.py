from ev3dev.ev3 import *

import time

mLeft = LargeMotor('outD')
mRight = LargeMotor('outC')
mMiddle = MediumMotor('outB')
slLeft = ColorSensor('in3')
slRight = ColorSensor('in4')

slLeft.mode = 'COL-COLOR'
slRight.mode = 'COL-COLOR'

LINE_COL = 1
TURN_SP = 150
RUN_SP=200

try:
    # do something

    while True:
        while slLeft.value() == LINE_COL:
            mLeft.run_forever(speed_sp=-TURN_SP)
            mRight.run_forever(speed_sp=TURN_SP)
        while slRight.value() == LINE_COL:
            mRight.run_forever(speed_sp=-(TURN_SP))
            mLeft.run_forever(speed_sp=TURN_SP)

        mRight.run_forever(speed_sp=RUN_SP, stop_action='coast')
        mLeft.run_forever(speed_sp=RUN_SP, stop_action='coast')


except:
    mRight.stop()
    mLeft.stop()