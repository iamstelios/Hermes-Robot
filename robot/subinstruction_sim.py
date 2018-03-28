#!/usr/bin/env python3

import websockets


wait_time = 0
v = VerticalMovementManager()
g = GroundMovementController()

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
    def __init__(self, nodeA, nodeB, websocket):
        self.nodeA = nodeA
        self.nodeB = nodeB
        self.websocket = websocket

    def run(self):
        print('Moving from %s to %s' % (self.nodeA.string, self.nodeB.string))

        return self.nodeB

    def opposite(self):
        return Move(self.nodeB, self.nodeA)

class MoveJunction(SubInstruction):
    def __str__(self):
        return 'MoveJunction(%s,%s)' % (self.entry, self.exit)

    def __init__(self, entry, exit, websocket):
        self.entry = entry
        self.exit = exit
        self.websocket = websocket
        
    def run(self):
        # Entry and exit are strings representing the entry and exit
        # that the robot should take at the junction: 'y' for yellow etc.
        print('Junction entry: %s, exit: %s' % (self.entry, self.exit))


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

        return None

    def opposite(self):
        return Reverse()

"""
Given a shelf level in the range 1-3 returns the corresponding LiftPos.
"""
def _lvl_to_shelf(lvl):
    if lvl == 1:
        return LiftPos.SHELF_0
    elif lvl == 2:
        return LiftPos.SHELF_1
    elif lvl == 3:
        return LiftPos.SHELF_2
    else:
        raise ValueError("Unknown shelf level %s specified." % str(lvl))

class BasePickUp(SubInstruction):
    # Picks up item at shelf level
    def __str__(self):
        return 'BasePickUp(%s)' % (self.level, websocket)

    def __init__(self, level):
        self.level = level
        self.websocket = websocket

    def run(self):
        print('Picking up box at level %d' % self.level)

        print('Picked up box at level %d' % self.level)

        return None

    def opposite(self):
        return BaseDrop(self.level)

class BaseDrop(SubInstruction):
    # Drops item at shelf position
    def __str__(self):
        return 'BaseDrop(%s)' % (self.level)
    
    def __init__(self, level, websocket):
        self.level = level
        self.websocket = websocket

    def run(self):
        print('Dropping box at level %d' % self.level)

        print('Dropped box at level %d' % self.level)

        return None

    def opposite(self):
        return BasePickUp(self.level)
