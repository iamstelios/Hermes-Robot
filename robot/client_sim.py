#!/usr/bin/env python3

import argparse
import json
import re
from collections import deque

import websockets

from subinstruction_sim import *

# ================= HARDCODED MAP =====================

# r for red, g for green, b for blue, y for yellow

bases = set([0,6])

optimal_routes = [["r", "y", "b", "b", "b", "b", "b", "b", "b", "b", "b"],
        ["g", "g", "r", "b", "y", "y", "y", "y", "y", "y", "y"],
        ["r", "r", "r", "r", "b", "b", "y", "g", "g", "g", "g"],
        ["g", "g", "g", "g", "r", "y", "g", "g", "g", "g", "g"],
        ["b", "b", "b", "b", "b", "b", "b", "g", "y", "y", "y"],
        ["r", "r", "r", "r", "r", "r", "r", "r", "g", "b", "y"]]

endpoint_junction_connection = ["J0", "J0", "J1", "J1","J3","J3","J2","J4","J5","J5","J5"]

junction_endpoints = [
   { "r": "0", "b": "J1", "y": "1" },
   { "r": "2", "b": "3", "y":"J2","g": "J0" },
   { "r": "J1", "b": "J3", "y":"6","g": "J4" },
   { "r": "4", "y":"5","g": "J2" },
   { "b": "J2", "y":"J5","g": "7" },
   { "r": "J4", "b": "9", "y":"10","g": "8" }
]




# =================== MAP END =========================

class Position:
    def __str__(self):
        return self.string

    def __init__(self, string):
        self.string = string
        junction_pattern = re.compile("^J\d+$")
        endpoint_pattern = re.compile("^\d+$")
        number_pattern = re.compile("\d+")
        if junction_pattern.match(string):
            # Junction
            self.isJunction = True
            self.number = int(number_pattern.search(string).group(0))
            self.isBase = False
        elif endpoint_pattern.match(string):
            # Endpoint (Workstation or Base)
            self.isJunction = False
            self.number = int(number_pattern.search(string).group(0))
            self.isBase = self.number in bases
            self.isWorkstation = not self.isBase
        else:
            raise Exception

    def equals(self, position2):
        return self.string == position2.string


# Robot should be started at the 0 base
# Position "0" is the base
last_pos = Position("0")


def class_name(instance):
    return instance.__class__.__name__


def pathCalculator(source, destination):
    # Returns the queue of commands to traverse the path
    pos = source
    # Queue of all the sub instruction instances to be executed
    subQueue = deque()
    # Loop iterates until the position travelled is the destination
    while not pos.equals(destination):
        if pos.isJunction:
            entry = [colour for colour, node in junction_endpoints[
                pos.number].items() if node == prev_pos.string][0]
            exit = optimal_routes[pos.number][destination.number]
            new_pos = Position(junction_endpoints[pos.number].get(exit))
            subQueue.append(MoveJunction(entry, exit, pos))
            subQueue.append(Move(pos, new_pos))
        else:
            new_pos = Position(endpoint_junction_connection[pos.number])
            subQueue.append(Move(pos, new_pos))
        prev_pos = pos
        pos = new_pos
    return subQueue


# -------------------------INSTRUCTIONS----------------------------

# All instructions executed with robot without holding a box 
# and facing junction (all workstation connected to a junction!)

class alreadyInPlaceException(Exception):
    def __init__(self, message):
        self.message = message


@asyncio.coroutine
def go(dst):
    # Robot moves to the destination (faces away from junction and into the node!!)
    print("Instruction: go(%s)" % dst)
    destination = Position(dst)
    if destination.equals(last_pos):
        raise alreadyInPlaceException("Robot already in place requested to go")
    if destination.isJunction:
        raise Exception("Go destination cannot be a junction")
    subQueue = pathCalculator(last_pos, destination)
    subQueue.append(Reverse())

    cancelled = yield from queueProcessor(subQueue)
    return cancelled


@asyncio.coroutine
def retrieve(level, src, dst):
    # Retrives the box from the source base to the destination workstation
    print("Instruction: retrieve(%s,%s,%s)" % (level, src, dst))
    source = Position(src)
    destination = Position(dst)
    if not source.isBase:
        return Exception("Retrieve source should be a base")
    if not destination.isWorkstation:
        return Exception("Retrieve destination should be a workstation")

    # Queue of all the sub instruction instances to be executed
    subQueue = deque()
    # Used for the instructions move the robot to the source
    # Because this way it doesn't need to go back to original 
    # place without moving something
    uncancellableQueue = deque()
    if not last_pos.equals(source):
        # Move to the source base if not there already
        uncancellableQueue = pathCalculator(last_pos, source)
    else:
        # Face the base
        subQueue.append(Reverse())

    subQueue.append(BasePickUp(level))
    subQueue.append(Reverse())
    # Add path to workstation
    subQueue.extend(pathCalculator(source, destination))

    subQueue.append(BaseDrop(1))
    subQueue.append(Reverse())

    cancelled = yield from queueProcessor(subQueue, uncancellableQueue)
    return cancelled


@asyncio.coroutine
def store(level, src, dst):
    # Stores the box from the source workstation to the destination base
    print("Instruction: store(%s,%s,%s)" % (level, src, dst))
    source = Position(src)
    destination = Position(dst)
    if not source.isWorkstation:
        return Exception("Store source should be a workstation")
    if not destination.isBase:
        return Exception("Store destination should be a base")

    # Queue of all the sub instruction instances to be executed
    subQueue = deque()
    uncancellableQueue = deque()
    if not last_pos.equals(source):
        # Move to the source workstation if not there already
        uncancellableQueue = pathCalculator(last_pos, source)
    else:
        # Face the workstation
        subQueue.append(Reverse())

    subQueue.append(BasePickUp(1))
    subQueue.append(Reverse())
    # Add path to base
    subQueue.extend(pathCalculator(source, destination))

    subQueue.append(BaseDrop(level))
    subQueue.append(Reverse())

    cancelled = yield from queueProcessor(subQueue, uncancellableQueue)
    return cancelled


@asyncio.coroutine
def transfer(src, dst):
    # Transfer between two workstations
    print("Instruction: transfer(%s,%s)" % (src, dst))
    source = Position(src)
    destination = Position(dst)
    if not source.isWorkstation:
        return Exception("Transfer source should be a workstation")
    if not destination.isWorkstation:
        return Exception("Transfer destination should be a workstation")

    # Queue of all the sub instruction instances to be executed
    subQueue = deque()
    uncancellableQueue = deque()
    if not last_pos.equals(source):
        # Move to the source workstation if not there already
        uncancellableQueue = pathCalculator(last_pos, source)
    else:
        # Face the workstation
        subQueue.append(Reverse())

    subQueue.append(BasePickUp(1))
    subQueue.append(Reverse())
    # Add path to destination workstation
    subQueue.extend(pathCalculator(source, destination))

    subQueue.append(BaseDrop(1))
    subQueue.append(Reverse())

    cancelled = yield from queueProcessor(subQueue, uncancellableQueue)
    return cancelled


# -------------------END OF INSTRUCTIONS----------------------------
@asyncio.coroutine
def queueProcessor(queue, uncancellableQueue=deque()):
    # Excecutes the queue of sub instructions and handles cancelations
    global last_pos
    # Used in case of a cancelation
    reverseStack = list()
    cancelled = False

    totalInstructions = len(queue) + len(uncancellableQueue)

    # Uncancellable queue (used for moving to the source)
    while uncancellableQueue:
        # Dequeue sub instruction
        subInstruction = uncancellableQueue.popleft()
        # Run instruction dequeued
        try:
            position_change = subInstruction.run()
            if position_change is not None:
                last_pos = position_change
        except Exception as e:
            print("Error: SubInstruction failed to execute " + str(e))
        # poll server for cancellation and update position
        cancelled = (yield last_pos.string, totalInstructions, totalInstructions - len(queue) - len(uncancellableQueue))

    # Loop until instruction queue is empty
    while queue and not cancelled:
        # Dequeue sub instruction
        subInstruction = queue.popleft()
        print('Subinstruction: %s' % subInstruction)
        # Add reverse instruction to the reverse stack
        reverseStack.append(subInstruction.opposite())
        # Run instruction dequeued
        try:
            position_change = subInstruction.run()
            if position_change is not None:
                last_pos = position_change
        except Exception as e:
            print("Error: SubInstruction failed to execute " + str(e))
        # poll server for cancellation
        cancelled = (yield last_pos.string, totalInstructions,
                           totalInstructions - len(queue) - len(uncancellableQueue))

    # if cancelled then run reverse stack and confirm to server
    firstMovement = True
    totalInstructions = len(reverseStack)
    while cancelled and reverseStack:
        # Pop sub instruction
        subInstruction = reverseStack.pop()
        print('Subinstruction: %s' % subInstruction)
        if class_name(subInstruction) == "Move" and firstMovement:
            # Reverse the robot to face the new path
            Reverse().run()
            firstMovement = False
        # reverse function don't need to be executed except at the end
        if class_name(subInstruction) == "Reverse":
            # skip reversing
            # yield for the sake of updating progress
            yield last_pos.string, totalInstructions, totalInstructions - len(reverseStack)
            continue
        try:
            position_change = subInstruction.run()
            if position_change:
                last_pos = position_change
        except Exception as e:
            print("Error: SubInstruction failed to execute " + str(e))
        # Send position to the server
        yield last_pos.string, totalInstructions, totalInstructions - len(reverseStack)

    if cancelled:
        # Reverse such that the robot faces the junction
        Reverse().run()
    return cancelled


@asyncio.coroutine
def action_caller(instruction):
    action = instruction["action"]
    if action == "go":
        dst = instruction["dst"]
        yield from go(dst)
    elif action == "store":
        # Destination should be the base the box is to be stored
        level = instruction["level"]
        dst = instruction["dst"]
        src = instruction["src"]
        yield from store(level, src, dst)
    elif action == "retrieve":
        # Source should be the base the box to be retrieved is located
        level = instruction["level"]
        src = instruction["src"]
        dst = instruction["dst"]
        yield from retrieve(level, src, dst)
    elif action == "transfer":
        # Transfer is between two workstations
        src = instruction["src"]
        dst = instruction["dst"]
        yield from transfer(src, dst)
    elif action == 'update_map':
        pass
        # TODO: update_map()


@asyncio.coroutine
def handler(ip):
    print("STARTING")
    print("POSITION: %s" % last_pos.string)
    global websocket
    yield from initialise_simulation(last_pos)
    try:
        websocket = yield from websockets.connect("ws://%s:8000/" % ip)
    except OSError:
        print("Cannot connect to the server")
        return
    while True:
        try:
            status = {
                "status": "Requesting new instruction"
            }
            yield from websocket.send(json.dumps(status))
            print()
            print("> {}".format(status))

            instruction_raw = yield from websocket.recv()
            print("< {}".format(instruction_raw))

            if instruction_raw == "close":
                break
            else:
                instruction = json.loads(instruction_raw)
                cancelled = False

                # Generator that yields current position and is sending the cancellation
                gen = action_caller(instruction)
                try:
                    # for new_position in gen:
                    new_position, totalInstructions, currentInstruction = next(gen)
                except alreadyInPlaceException:
                    continue

                while True:
                    try:
                        status = {
                            "status": "Position and queue progress update",
                            "position": new_position,  # String
                            "progress": {
                                "currentSteps": currentInstruction,
                                "totalSteps": totalInstructions  # Integers
                            }
                        }
                        yield from websocket.send(json.dumps(status))
                        print("> {}".format(status))

                        if not cancelled:
                            status = {
                                "status": "Check Cancellation"
                            }
                            yield from websocket.send(json.dumps(status))
                            print("> {}".format(status))

                            cancel_instruction_raw = yield from websocket.recv()
                            print("< {}".format(cancel_instruction_raw))
                            cancel_instruction = json.loads(cancel_instruction_raw)
                            cancelled = cancel_instruction["cancelled"]
                        # Continue the operation
                        new_position, totalInstructions, currentInstruction = gen.send(cancelled)
                    except StopIteration:
                        if not cancelled:
                            break
                        else:
                            # Just keep updating position until cancelation complete
                            try:
                                status = {
                                    "status": "Position update",
                                    "position": new_position  # String
                                }
                                yield from websocket.send(json.dumps(status))
                                print("> {}".format(status))

                                # Continue the operation
                                new_position, totalInstructions, currentInstruction = gen.send(cancelled)
                            except StopIteration:
                                break

        # No need to send confirmation of instruction completed or cancelled           
        except websockets.exceptions.ConnectionClosed:
            for x in range(3):
                pass  # Sound.speak("Lost connection to server")
            break

    yield from websocket.close()


def main():
    # Parse arguements
    parser = argparse.ArgumentParser(description='Robot Parameters')
    parser.add_argument('--ip', type=str, default="127.0.0.1",
                        help='ip address of the server')
    parser.add_argument('--start', type=str, default="0",
                        help='starting position of robot')

    args = parser.parse_args()
    ip = args.ip
    # Check if ip is correctly structured 
    pattern = re.compile("\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}")
    test = pattern.match(ip)
    if (not test):
        print("Unacceptable ip address given for the server")
        return
    pattern = re.compile("^\d+$")
    test = pattern.match(args.start)
    if (not test):
        print("Starting position should be an integer")
        return
    global last_pos
    last_pos = Position(args.start)

    asyncio.get_event_loop().run_until_complete(handler(ip))


if __name__ == "__main__":
    main()
