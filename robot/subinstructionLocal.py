#!/usr/bin/env python3

from client import Position, junction_endpoints

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
    def __str__(self):
        return 'Move(%s,%s,%s)' % (self.nodeA, self.nodeB, self.exit)
    # If node B is a junction, the robot should stop before entering the juction
    # Thus if the opposite is needed no exit input is needed to reach back node A.

    def __init__(self, nodeA, nodeB, exit=None):
        self.nodeA = nodeA
        self.nodeB = nodeB
        self.exit = None
        if exit is not None:
            self.exit = exit
            self.junctionExit = True
        else:
            self.junctionExit = False

    def run(self):
        # Exit parameter is the exit that the robot should take,
        # if robot is at the start of node A and it is a junction!
        print('Moving from %s to %s' % (self.nodeA.string, self.nodeB.string))

        # TODO: WRITE CODE FOR MOVEMENT HERE!
        sleep(wait_time)
        print('Arrived at %s' % self.nodeB.string)
        return self.nodeB

    def opposite(self):
        new_exit = None
        if self.nodeB.isJunction:
            # Find which exit to use
            # r for red, g for green, b for blue, y for yellow
            new_exit = [colour for colour, node in junction_endpoints[
                self.nodeB.number].items() if node == self.nodeA.string][0]
        return Move(self.nodeB, self.nodeA, new_exit)


class Reverse(SubInstruction):
    # Reverses the position of the robot 180 degrees
    def __str__(self):
        return 'Reverse()'

    def run(self):
        print('Reversing direction')

        # TODO: WRITE CODE FOR MOVEMENT HERE!
        sleep(wait_time)
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

        # TODO: WRITE CODE FOR MOVEMENT HERE!
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

        # TODO: WRITE CODE FOR MOVEMENT HERE!
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

        # TODO: WRITE CODE FOR MOVEMENT HERE!
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

        # TODO: WRITE CODE FOR MOVEMENT HERE!
        sleep(wait_time)
        print('Dropped box to workstation')
        return None

    def opposite(self):
        return WorkstationPickUp()
