#!/usr/bin/env python3

from vertical import VerticalMovementManager, LiftPos
from linefollower import GroundMovementController


wait_time = 0
v = VerticalMovementManager()
g = GroundMovementController()

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
        
        g.follow_line_until('bk')
        
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

        g.follow_line_until(self.entry)
        g.swap_line_side()
        g.follow_line_until(self.exit, pid_runner=GroundMovementController.ROUNDABOUT_PID)
        g.swap_line_side()
        g.follow_line_until('bk')

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

        g.reverse_dir()

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
        return 'BasePickUp(%s)' % (self.level)

    def __init__(self, level):
        self.level = level

    def run(self):
        print('Picking up box at level %d' % self.level)

        pos = _lvl_to_shelf(self.level)
        v.move_to(pos)
        g.dock()
        v.move_to(LiftPos.above(pos))

        # move back a bit
        g.move_raw(-300)

        # lower grabber level to BOTTOM
        v.move_to(LiftPos.BOTTOM)

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

        pos = _lvl_to_shelf(self.level)
        v.move_to(LiftPos.above(pos))
        g.dock()
        v.move_to(pos)

        # move back
        g.move_raw(-300)

        # return grabber to BOTTOM position for stability
        v.move_to(LiftPos.BOTTOM)

        print('Dropped box at level %d' % self.level)

        return None

    def opposite(self):
        return BasePickUp(self.level)
