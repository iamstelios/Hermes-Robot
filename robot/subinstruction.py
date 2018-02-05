#!/usr/bin/env python3

class SubInstruction(object):
    """ Abstract class """
    def run(self):
        raise NotImplementedError("run() should be implemented")
    def opposite(self):
        raise NotImplementedError("opposite() should be implemented")
class Move(SubInstruction):
    # Move robot from node A to node B 
    # Nodes can be either worker stations or junctions or the base
    # Robot should be facing the right direction when starting this
    # instruction (node A -> Node B)

    # If node B is a junction, the robot should stop before entering the juction
    # Thus if the opposite is needed no exit input is needed to reach back node A.
    def __init__(self, nodeA, nodeB, exit=None):
        from client import Position
        self.nodeA = nodeA
        self.nodeB = nodeB
        if exit is not None:
            self.exit = exit
            self.junctionExit = True
        else:
            self.junctionExit = False

    def run(self):
        # Exit parameter is the exit that the robot should take, 
        # if robot is at the start of node A and it is a junction!
        print('Moving from %s to %s' % (self.nodeA.string, self.nodeB.string))

        print('Arrived at %s' % self.nodeB.string)
    
    def opposite(self):
        from client import junction_endpoints
        new_exit = None
        if self.nodeB.isJunction:
            # Find which exit to use
            # r for red, g for green, b for blue, y for yellow
            new_exit = [colour for colour, node in junction_endpoints[
                self.nodeB.number].items() if node == self.nodeA.string][0]
        return Move(self.nodeB,self.nodeA,new_exit)

class Reverse(SubInstruction):
    # Reverses the position of the robot 180 degrees
    def run(self):
        print('Reversing direction')
        print('Direction reversed')

    def opposite(self):
        return Reverse()


class Pick(SubInstruction):
    # Picks up item at shelf level
    def __init__(self, level):
        self.level = level

    def run(self):
        print('Picking up box at level %d' % self.level)
        print('Picked up box at level %d' % self.level)
    def opposite(self):
        return Drop(self.level)

class Drop(SubInstruction):
    # Drops item at shelf position
    def __init__(self, level):
        self.level = level

    def run(self):
        print('Dropping box at level %d' % self.level)
        print('Dropped box at level %d' % self.level)
    
    def opposite(self):
        return Pick(self.level)

class Pickup(SubInstruction):
    # Takes the box from the worker station
    def run(self):
        print('Picking up box from worker station')
        print('Picked up box from worker station')
    
    def opposite(self):
        return Delivery()

class Delivery(SubInstruction):
    # Delivers the box to the worker station
    def run(self):
        print('(Delivery)Dropping box to worker station')
        print('(Delivery)Dropping box to worker station')
    
    def opposite(self):
        return Pickup()