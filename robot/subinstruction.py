#!/usr/bin/env python3

#---------FOR PRESENTATION--------------
from time import sleep
from vertical import *
from ev3dev.ev3 import *
import linefollower

wait_time = 0
v = VerticalMovementManager()
#---------------------------------------

mLeft = LargeMotor('outD')
mRight = LargeMotor('outC')

col = ColorSensor('in4')
ref = ColorSensor('in3')

col.mode = 'COL-COLOR'
ref.mode = 'COL-REFLECT'

mRight.polarity = 'inversed'
mLeft.polarity = 'inversed'

class SubinstructionError(Exception):
    """ Used when there is a problem finishing the subinstruction """
    def __init__(self, msg):
        # Parameter msg example: "Lost navigation lines"
        self.msg = msg
    def __str__(self):
        return self.msg

class SubInstruction(object):
    """ Abstract class """
    def run(self):
        raise NotImplementedError("run() should be implemented")
    def opposite(self):
        raise NotImplementedError("opposite() should be implemented")

class Move(SubInstruction):
    # Move robot from node A to node B
    # Nodes can be either workstations or junctions or the base
    # Robot will be facing the right direction when starting this
    # instruction (Node A -> Node B)
    def __str__(self):
        return 'Move(%s,%s)' % (self.nodeA, self.nodeB)

    # If node B is a junction, the robot will stop before entering the juction
    def __init__(self, nodeA, nodeB):
        self.nodeA = nodeA
        self.nodeB = nodeB

    def run(self):
        print('Moving from %s to %s' % (self.nodeA.string, self.nodeB.string))
        
        linefollower.follow_line_until('bk')
        
        # sleep(wait_time)
        return self.nodeB


    def opposite(self):
        return Move(self.nodeB, self.nodeA)

class MoveJunction(SubInstruction):
    def __str__(self):
        return 'MoveJunction(%s,%s)' % (self.entry, self.exit)

    def __init__(self, entry, exit):
        self.entry = entry
        self.exit = exit
        
    def run(self):
        # Entry and exit are strings representing the entry and exit
        # that the robot should take at the junction: 'y' for yellow etc.
        print('Junction entry: %s, exit: %s' % (self.entry, self.exit))

        linefollower.follow_line_until(self.entry, "RIGHT")
        linefollower.swap_to("LEFT")
        linefollower.follow_line_until(self.exit, "LEFT")
        linefollower.swap_to("RIGHT")
        linefollower.follow_line_until('bk')
        # sleep(wait_time)
        print('Junction movement finished')
        return None

    def opposite(self):
        return MoveJunction(self.exit, self.entry)

class Reverse(SubInstruction):
    # Reverses the position of the robot 180 degrees
    def __str__(self):
        return 'Reverse()'

    def run(self):
        print('Reversing direction')

        mLeft.duty_cycle_sp = 0
        mRight.duty_cycle_sp = 0

        mLeft.run_direct()
        mRight.run_direct()

        mLeft.duty_cycle_sp = -30
        mRight.duty_cycle_sp = 30

        sleep(1.5)

        ref_val = ref.value()
        while not ref_val > 40:
            ref_val = ref.value()
            print(ref_val)

        sleep(0.5)

        mLeft.duty_cycle_sp = 0
        mRight.duty_cycle_sp = 0
        mLeft.stop()
        mRight.stop()

        sleep(0.5)

        print('Direction reversed')
        return None

    def opposite(self):
        return Reverse()


class BasePickUp(SubInstruction):
    # Picks up item at shelf level
    def __str__(self):
        return 'BasePickUp(%s)' % (self.level)

    def __init__(self, level):
        self.level = level

    def run(self):
        print('Picking up box at level %d' % self.level)

        # raise grabber to shelf level

        v.move_to(self.level)

        # position robot inside the base
        # pid_run1(mPower, trg, kp, kd, ki, direction, minRng, maxRng, color)

        # calculate UP position of the shelf level
        if self.level == LiftPos.SHELF_0:
            v.move_to(LiftPos.SHELF_0_UP)
        elif self.level == LiftPos.SHELF_1:
            v.move_to(LiftPos.SHELF_1_UP)
        elif self.level == LiftPos.SHELF_2:
            v.move_to(LiftPos.SHELF_2_UP)
        else: print('False level value. Please reinitialize.')

        # move back
        mLeft.run_timed(time_sp = 2000, speed_sp = -200)
        mRight.run_timed(time_sp = 2000, speed_sp = -200)
        mLeft.wait_until_not_moving()

        # lower grabber level to BOTTOM
        v.move_to(LiftPos.BOTTOM)

        sleep(wait_time)
        print('Picked up box at level %d' % self.level)
        return None

    def opposite(self):
        return BaseDrop(self.level)

class BaseDrop(SubInstruction):
    # Drops item at shelf position
    def __str__(self):
        return 'BaseDrop(%s)' % (self.level)
    
    def __init__(self, level):
        self.level = level

    def run(self):
        print('Dropping box at level %d' % self.level)

        # calculate UP position of shelf level
        if self.level == LiftPos.SHELF_0:
            v.move_to(LiftPos.SHELF_0_UP)
        elif self.level == LiftPos.SHELF_1:
            v.move_to(LiftPos.SHELF_1_UP)
        elif self.level == LiftPos.SHELF_2:
            v.move_to(LiftPos.SHELF_2_UP)
        else: print('False level value. Please reinitialize.')

        # position robot inside the base
        # pid_run1(mPower, trg, kp, kd, ki, direction, minRng, maxRng, color)

        # return grabber to BOTTOM position for stability
        v.move_to(LiftPos.BOTTOM)

        # move back
        mLeft.run_timed(time_sp = 2000, speed_sp = -200)
        mRight.run_timed(time_sp = 2000, speed_sp = -200)
        mLeft.wait_until_not_moving()

        sleep(wait_time)
        print('Dropped box at level %d' % self.level)
        return None

    def opposite(self):
        return BasePickUp(self.level)

class WorkstationPickUp(SubInstruction):
    # Takes the box from the workstation
    def __str__(self):
        return 'WorkstationPickUp()'

    def run(self):
        print('Picking up box from workstation')

        # move grabber to SHELF_0 position
        v.move_to(LiftPos.SHELF_0)

        # position robot inside the workspace
        # pid_run1(mPower, trg, kp, kd, ki, direction, minRng, maxRng, color)

        # move grabber to SHELF_0_UP position
        v.move_to(LiftPos.SHELF_0_UP)

        # move back
        mLeft.run_timed(time_sp = 2000, speed_sp = -200)
        mRight.run_timed(time_sp = 2000, speed_sp = -200)
        mLeft.wait_until_not_moving()

        # lower grabber level to BOTTOM
        v.move_to(LiftPos.BOTTOM)

        sleep(wait_time)
        print('Picked up box from workstation')
        return None

    def opposite(self):
        return WorkstationDrop()

class WorkstationDrop(SubInstruction):
    # Delivers the box to the workstation
    def __str__(self):
        return 'WorkstationDrop()'
    
    def run(self):
        print('Dropping box to workstation')

        # move grabber to SHELF_0_UP position
        v.move_to(LiftPos.SHELF_0_UP)

        # position robot inside workstation
        # pid_run1(mPower, trg, kp, kd, ki, direction, minRng, maxRng, color)

        # lower grabber level to BOTTOM
        v.move_to(LiftPos.BOTTOM)

        # move back
        mLeft.run_timed(time_sp = 2000, speed_sp = -200)
        mRight.run_timed(time_sp = 2000, speed_sp = -200)
        mLeft.wait_until_not_moving()

        sleep(wait_time)
        print('Dropped box to workstation')
        return None

    def opposite(self):
        return WorkstationPickUp()
