#!/usr/bin/env python3
import asyncio
import json
from time import sleep

import websocket as syncws


@asyncio.coroutine
def initialise_simulation(position):
    global simulationWS
    # simulationWS = yield from websockets.connect("ws://%s:8001/" % "127.0.0.1")
    simulationWS = syncws.WebSocket()
    simulationWS.connect("ws://%s:8001/" % "127.0.0.1")
    status = {
        "updateId": -1,
        "status": "Simulation state update",
        "onJunction": False,
        "isPassing": False,
        "isMoving": False,
        "position": {
            "node": str(position)
        }
    }
    simulationWS.send(json.dumps(status))
    response = simulationWS.recv()
    print("< {}".format(response))
    assert (response == '{"result":"Success","id":-1}')
    print("Simulation initialised")


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

        progress = 0
        id = 0
        while progress < 100:
            success = False
            is_passing = False
            while success == False:
                status = {
                    "updateId": id,
                    "status": "Simulation state update",
                    "onJunction": False,
                    "isPassing": is_passing,
                    "isMoving": True,
                    "position": {
                        "startNode": self.nodeA.string,
                        "endNode": self.nodeB.string,
                        "progress": progress + 1
                    }
                }
                simulationWS.send(json.dumps(status))
                print("> {}".format(status))
                response = simulationWS.recv()
                print("< {}".format(response))
                response_json = json.loads(response)
                if response_json["result"] == "Success":
                    success = True
                    is_passing = False
                    progress += 1
                    sleep(0.06)
                    id += 1
                elif response_json["reason"] == "Obstruction":
                    is_passing = True

        return self.nodeB

    def opposite(self):
        return Move(self.nodeB, self.nodeA)


class MoveJunction(SubInstruction):
    def __str__(self):
        return 'MoveJunction(%s,%s)' % (self.entry, self.exit)

    def __init__(self, entry, exit, pos):
        self.entry = entry
        self.exit = exit
        self.pos = pos

    def run(self):
        # Entry and exit are strings representing the entry and exit
        # that the robot should take at the junction: 'y' for yellow etc.
        print('Junction entry: %s, exit: %s' % (self.entry, self.exit))
        progress = 0
        while progress < 100:
            success = False
            is_passing = False
            while success == False:
                status = {
                    "status": "Simulation state update",
                    "onJunction": True,
                    "isPassing": False,
                    "isMoving": True,
                    "position": {
                        "entrance": self.entry,
                        "exit": self.exit,
                        "progress": progress + 1,
                        "junction": str(self.pos)
                    }
                }
                simulationWS.send(json.dumps(status))
                print("> {}".format(status))
                response = simulationWS.recv()
                print("< {}".format(response))
                response_json = json.loads(response)
                # json.loads(response)
                if response_json["result"] == "Success":
                    success = True
                    is_passing = False
                    progress += 2
                    sleep(0.06)
                elif response_json["reason"] == "Obstruction":
                    sleep(0.48)
        print('Junction movement finished')

        return None

    def opposite(self):
        return MoveJunction(self.exit, self.entry, self.pos)


class Reverse(SubInstruction):
    # Reverses the position of the robot 180 degrees
    def __str__(self):
        return 'Reverse()'

    def run(self):
        print('Reversing direction')

        sleep(2.4)
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
        sleep(12)
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
        sleep(12)
        print('Dropped box at level %d' % self.level)

        return None

    def opposite(self):
        return BasePickUp(self.level)
