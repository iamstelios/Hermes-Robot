#!/usr/bin/env python3

import asyncio
import websockets
#import ev3dev.ev3 as ev3
import json
import sys
import re
from collections import deque
#Import sub instructions
from subinstruction import *

bases = set([0])

class Position:
    def __init__(self,string):
        self.string = string
        junction_pattern = re.compile("^J\d+$")
        endpoint_pattern = re.compile("^\d+$")
        number_pattern = re.compile("\d+")
        if junction_pattern.match(string):
            #Junction 
            self.isJunction = True
            self.number = int(number_pattern.search(string).group(0))
            self.isBase = False
        elif endpoint_pattern.match(string):
            #Endpoint (Workstation or Base)
            self.isJunction = False
            self.number = int(number_pattern.search(string).group(0))
            self.isBase = self.number in bases
            self.isWorkstation = not self.isBase
        else:
            raise Exception
    def equals(self,position2):
        return self.string == position2.string

#Robot should be started at the 0 base
#Position "0" is the base
last_pos = Position("0")

#================= HARDCODED MAP =====================

#r for red, g for green, b for blue, y for yellow
optimal_routes = [['b','r','g','g'],['y','y','b','r']]

endpoint_junction_connection = ['J0','J0','J1','J1']

junction_endpoints = [
    {"r": "1", "g": "J1", "b":"0"},
    {"r": "3", "b":"2","y":"J0"},
    ]

#=================== MAP END =========================

def class_name(instance):
    return instance.__class__.__name__

def pathCalculator(source, destination):
    #Returns the queue of commands to traverse the path
    pos = source
    # Queue of all the sub instruction instances to be executed
    subQueue = deque()
    # Loop iterates until the position travelled is the destination
    while not pos.equals(destination):
        if pos.isJunction:
            exit = optimal_routes[pos.number][destination.number]
            new_pos = Position(junction_endpoints[pos.number].get(exit))
            subQueue.append(Move(pos,new_pos,exit))
        else:
            new_pos = Position(endpoint_junction_connection[pos.number])
            subQueue.append(Move(pos,new_pos))
        pos = new_pos
    return subQueue

#-------------------------INSTRUCTIONS----------------------------

# All instructions executed with robot without holding a box 
# and facing junction (all workstation connected to a junction!)

def go(dst):
    #Robot moves to the destination (faces away from junction and into the node!!)
    print("Instruction: go(%s)" % dst)
    destination = Position(dst)
    if destination.isJunction :
        return Exception("Go destination cannot be a junction")
    subQueue = pathCalculator(last_pos, destination)
    
    cancelled = yield from queueProcessor(subQueue)
    return cancelled
    
def retrieve(level,src,dst):
    #Retrives the box from the source base to the destination workstation
    print("Instruction: retrieve(%s,%s,%s)" % (level,src,dst))
    source = Position(src)
    destination = Position(dst)
    if not source.isBase :
        return Exception("Retrieve source should be a base")
    if not destination.isWorkstation :
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
    #Add path to workstation
    subQueue.extend(pathCalculator(source, destination))

    subQueue.append(WorkstationDrop())
    subQueue.append(Reverse())

    cancelled = yield from queueProcessor(subQueue,uncancellableQueue)
    return cancelled

def store(level,src,dst):
    #Stores the box from the source workstation to the destination base
    print("Instruction: store(%s,%s,%s)" % (level,src,dst))
    source = Position(src)
    destination = Position(dst)
    if not source.isWorkstation :
        return Exception("Store source should be a workstation")
    if not destination.isBase :
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
    
    subQueue.append(WorkstationPickUp())
    subQueue.append(Reverse())
    # Add path to base
    subQueue.extend(pathCalculator(source, destination))

    subQueue.append(BaseDrop(level))
    subQueue.append(Reverse())

    cancelled = yield from queueProcessor(subQueue,uncancellableQueue)
    return cancelled

def transfer(src,dst):
    #Transfer between two workstations
    print("Instruction: transfer(%s,%s)" % (src,dst))
    source = Position(src)
    destination = Position(dst)
    if not source.isWorkstation :
        return Exception("Transfer source should be a workstation")
    if not destination.isWorkstation :
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
    
    subQueue.append(WorkstationPickUp())
    subQueue.append(Reverse())
    # Add path to destination workstation
    subQueue.extend(pathCalculator(source, destination))

    subQueue.append(WorkstationDrop())
    subQueue.append(Reverse())

    cancelled = yield from queueProcessor(subQueue,uncancellableQueue)
    return cancelled

#-------------------END OF INSTRUCTIONS----------------------------

def queueProcessor(queue, uncancellableQueue = deque()):
    # Excecutes the queue of sub instructions and handles cancelations
    global last_pos
    # Used in case of a cancelation
    reverseStack = list()
    cancelled = False

    totalInstructions = len(queue)+len(uncancellableQueue)

    #Uncancellable queue (used for moving to the source)
    while uncancellableQueue:
        # Dequeue sub instruction
        subInstruction = uncancellableQueue.popleft()
        # Run instruction dequeued
        position_change = subInstruction.run()
        if position_change is not None:
            last_pos = position_change
        # poll server for cancellation and update position
        cancelled = (yield last_pos.string, totalInstructions, totalInstructions-len(queue)-len(uncancellableQueue))

    # Loop until instruction queue is empty
    while queue and not cancelled:
        # Dequeue sub instruction
        subInstruction = queue.popleft()
        # Add reverse instruction to the reverse stack
        reverseStack.append(subInstruction.opposite())
        # Run instruction dequeued
        position_change = subInstruction.run()
        if position_change is not None:
            last_pos = position_change
        # poll server for cancellation
        cancelled = (yield last_pos.string, totalInstructions, totalInstructions-len(queue)-len(uncancellableQueue))

    # if cancelled then run reverse stack and confirm to server
    firstMovement = True
    totalInstructions = len(reverseStack)
    while cancelled and reverseStack:
        # Pop sub instruction
        subInstruction = reverseStack.pop()
        if class_name(subInstruction) == "Move" and firstMovement:
            # Reverse the robot to face the new path
            Reverse().run()
            firstMovement = False
        # reverse function don't need to be executed except at the end
        if class_name(subInstruction) == "Reverse":
            # skip reversing
            # yield for the sake of updating progress
            yield last_pos.string, totalInstructions, totalInstructions-len(reverseStack)
            continue
        position_change = subInstruction.run()
        if position_change:
            last_pos = position_change
        #Send position to the server
        yield last_pos.string, totalInstructions, totalInstructions-len(reverseStack)
    
    if cancelled:
        #Reverse such that the robot faces the junction
        Reverse().run()
    return cancelled

def action_caller(instruction):
    action = instruction["action"]
    if action == "go":
        dst=instruction["dst"]
        yield from go(dst)
    elif action == "store":
        #Destination should be the base the box is to be stored
        level = instruction["level"]
        dst = instruction["dst"]
        src  = instruction["src"]
        yield from store(level,src,dst)
    elif action == "retrieve":
        #Source should be the base the box to be retrieved is located
        level = instruction["level"]
        src = instruction["src"]
        dst = instruction["dst"]
        yield from retrieve(level,src,dst)
    elif action == "transfer":
        #Transfer is between two workstations
        src  = instruction["src"]
        dst = instruction["dst"]
        yield from transfer(src,dst)
    elif action == 'update_map':
        pass
        #TODO: update_map()

@asyncio.coroutine
def handler(ip):
    print("STARTING")
    try:
        websocket = yield from websockets.connect("ws://%s:8000/" % ip)
    except OSError:
        print("Cannot connect to the server")
        return
    while True:
        try:
            status = {
                "status" : "Requesting new instruction"
            }
            yield from websocket.send(json.dumps(status))
            print("> {}".format(status))

            instruction_raw = yield from websocket.recv()
            print("< {}".format(instruction_raw))

            if instruction_raw == "close":
                break
            else:
                instruction = json.loads(instruction_raw)
                cancelled = False
                #Generator that yield current position and is send the cancellation
                gen= action_caller(instruction)
                #for new_position in gen:
                new_position, totalInstructions, currentInstruction = next(gen)
                while True:
                    try:
                        status = {
                            "status" : "Position and queue progress update",
                            "position" : new_position, #String
                            "progress" : [currentInstruction,totalInstructions] #Integers
                        }
                        yield from websocket.send(json.dumps(status))
                        print("> {}".format(status))

                        if not cancelled:
                            status = {
                                "status" : "Check Cancellation"
                            }
                            yield from websocket.send(json.dumps(status))
                            print("> {}".format(status))
                            
                            cancel_instruction_raw = yield from websocket.recv()
                            print("< {}".format(cancel_instruction_raw))
                            cancel_instruction = json.loads(cancel_instruction_raw)
                            cancelled = cancel_instruction["cancelled"]
                        #Continue the operation                    
                        new_position, totalInstructions, currentInstruction = gen.send(cancelled)
                    except StopIteration:
                        #TODO: Check if this can be removed
                        if not cancelled:
                            break
                        else:
                            #Just keep updating position until cancelation complete
                            try:
                                status = {
                                    "status" : "Position update",
                                    "position" : new_position #String
                                }
                                yield from websocket.send(json.dumps(status))
                                print("> {}".format(status))

                                #Continue the operation                    
                                new_position, totalInstructions, currentInstruction = gen.send(cancelled)
                            except StopIteration:
                                break
                # No need to send confirmation of instruction completed or cancelled

        except asyncio.TimeoutError:
            # Check the connection.
            try:
                pong_waiter = yield from ws.ping()
                yield from asyncio.wait_for(pong_waiter, timeout=10)
            except asyncio.TimeoutError:
                # No response to ping in 10 seconds, disconnect.
                #TODO: ADD A SPEAKER ALARM TO ALERT WORKERS
                break

    yield from websocket.close()

def main():

    # Default ip address
    # for windows
    # ip = "192.168.137.1"
    # localhost
    ip = "127.0.0.1"
    if(len(sys.argv)>1):
        ip=sys.argv[1]
        #Check if the arguement given is a well defined ip address
        pattern = re.compile("\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}")
        test = pattern.match(ip)
        if (not test):
            print("Unacceptable ip address given for the server")
            return
    
    asyncio.get_event_loop().run_until_complete(handler(ip))

if __name__ == "__main__":
    main()
