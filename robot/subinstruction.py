#!/usr/bin/env python3

#---------FOR PRESENTATION--------------
from time import sleep
wait_time = 4
#---------------------------------------

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
    def __init__(self, nodeA, nodeB, exit=None):
        from client import Position
        self.nodeA = nodeA
        self.nodeB = nodeB
        self.success = True
        self.exit = exit

    def run(self):
        # Exit parameter is the exit that the robot should take,
        # if robot is at the start of node A and it is a junction!
        # "run" should only be called from the following combinations of nodes:
        # junction to junction, workstation/base to junction, junction to workstation/base.
        print('Moving from %s to %s' % (self.nodeA.string, self.nodeB.string))
        linefollower.run(self.exit)
        return self.nodeB


def opposite(self):
    from client import junction_endpoints
    new_exit = None
    if self.nodeB.isJunction:
        # Find which exit to use
        # r for red, g for green, b for blue, y for yellow
        new_exit = [colour for colour, node in junction_endpoints[
            self.nodeB.number].items() if node == self.nodeA.string][0]
    return Move(self.nodeB, self.nodeA, new_exit)

class Reverse(SubInstruction):
    # Reverses the position of the robot 180 degrees
    def run(self):
        print('Reversing direction')

        #TODO: WRITE CODE FOR MOVEMENT HERE!
        sleep(wait_time)
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

        #TODO: WRITE CODE FOR MOVEMENT HERE!
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

        #TODO: WRITE CODE FOR MOVEMENT HERE!
        sleep(wait_time)
        print('Dropped box at level %d' % self.level)
        return None

    def opposite(self):
        return BasePickUp(self.level)

class WorkstationPickUp(SubInstruction):
    # Takes the box from the workstation
    def run(self):
        print('Picking up box from workstation')

        #TODO: WRITE CODE FOR MOVEMENT HERE!
        sleep(wait_time)
        print('Picked up box from workstation')
        return None

    def opposite(self):
        return WorkstationDrop()

class WorkstationDrop(SubInstruction):
    # Delivers the box to the workstation
    def run(self):
        print('Dropping box to workstation')

        #TODO: WRITE CODE FOR MOVEMENT HERE!
        sleep(wait_time)
        print('Dropped box to workstation')
        return None

    def opposite(self):
        return WorkstationPickUp()