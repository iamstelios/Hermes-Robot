#!/usr/bin/env python3

# TODO: remove docking instructions and add them to a separate SubInstruction
# TODO: store course specific pid vars and utilize them properly

#---------FOR PRESENTATION--------------
from ev3dev.ev3 import *
from time import sleep, time
from vertical import *
from pid import *
wait_time = 4
#-----------CLASS-----------------------
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

    # If node B is a junction, the robot should stop before entering the juction
    # Thus if the opposite is needed no exit input is needed to reach back node A.
    def __init__(self, nodeA, nodeB, exit=None, fake=False):
        from client import Position
        self.nodeA = nodeA
        self.nodeB = nodeB
        self.fake = fake
        if exit is not None:
            self.exit = exit
            self.junctionExit = True
        else:
            self.junctionExit = False

    def run(self):
        # Exit parameter is the exit that the robot should take, 
        # if robot is at the start of node A and it is a junction!
        # "run" should only be called from the following combinations of nodes:
        # junction to junction, workstation/base to junction, junction to workstation/base.
        print('Moving from %s to %s' % (self.nodeA.string, self.nodeB.string))

        # pid stuff
        if not self.fake:
            pid_run(mPower, trg, kp, kd, ki, direction, minRng, maxRng, color)

        print('Arrived at %s' % self.nodeB.string)
        return self.nodeB

    def opposite(self):
        from client import junction_endpoints
        new_exit = None
        if self.nodeB.isJunction:
            # Find which exit to use
            # r for red, g for green, b for blue, y for yellow
            new_exit = [colour for colour, node in junction_endpoints[
                self.nodeB.number].items() if node == self.nodeA.string][0]
        return Move(self.nodeB,self.nodeA,new_exit,fake=True)

class Reverse(SubInstruction):
    # Reverses the position of the robot 180 degrees
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
    def __init__(self, level):
        self.level = level

    def run(self):
        print('Picking up box at level %d' % self.level)

        # raise grabber to shelf level
        v.move_to(self.level)

        # position robot inside the base
        mLeft.run_timed(time_sp = 1500, speed_sp = 200)
        mRight.run_timed(time_sp = 1500, speed_sp = 200)
        mLeft.wait_until_not_moving()

        # calculate UP position of the shelf level
        if self.level == LiftPos.SHELF_0:
            v.move_to(LiftPos.SHELF_0_UP)
        elif self.level == LiftPos.SHELF_1:
            v.move_to(LiftPos.SHELF_1_UP)
        elif self.level == LiftPos.SHELF_2:
            v.move_to(LiftPos.SHELF_2_UP)
        else print('False level value. Please reinitialize.')

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
        else print('False level value. Please reinitialize.')

        # position robot inside the base
        mLeft.run_timed(time_sp = 1500, speed_sp = 200)
        mRight.run_timed(time_sp = 1500, speed_sp = 200)
        mLeft.wait_until_not_moving()

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
    def run(self):
        print('Picking up box from workstation')

        # move grabber to SHELF_0 position
        v.move_to(LiftPos.SHELF_0)

        # position robot inside the workspace
        mLeft.run_timed(time_sp = 1500, speed_sp = 200)
        mRight.run_timed(time_sp = 1500, speed_sp = 200)
        mLeft.wait_until_not_moving()

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
    def run(self):
        print('Dropping box to workstation')

        # move grabber to SHELF_0_UP position
        v.move_to(LiftPos.SHELF_0_UP)

        # position robot inside workstation
        mLeft.run_timed(time_sp = 1500, speed_sp = 200)
        mRight.run_timed(time_sp = 1500, speed_sp = 200)
        mLeft.wait_until_not_working()

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
