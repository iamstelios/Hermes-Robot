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
        elif endpoint_pattern.match(string):
            #Endpoint (Workstation or Base)
            self.isJunction = False
            self.number = int(number_pattern.search(string).group(0))
        else:
            raise Exception
    def equals(self,position2):
        return self.string == position2.string

#Robot should be started at the base
#Position "0" is the base
last_pos = Position("0")
base = Position("0")

#================= HARDCODED MAP =====================

#r for red, g for green, b for blue, y for yellow
optimal_routes = [['b','r','g','g'],['y','y','b','r']]

endpoint_junction_connection = ['J0','J0','J1','J1']

junction_endpoints = [
    {"r": "1", "g": "J1", "b":"0"},
    {"r": "3", "b":"2","y":"J0"},
    ]

#=================== MAP END =========================

#@asyncio.coroutine
#def pos_update_cancel_check():
    #send last_pos to server
    #check if cancel was made

#-------------------------INSTRUCTIONS----------------------------

# All instructions executed with robot without holding a box 
# and facing junction (all worker stations connected to a junction!)

def go(dst):
    print("Instruction: go(%s)" % dst)
    pos = last_pos
    destination = Position(dst)
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
    queueProcessor(subQueue)

def retrieve(x,y,dst):
    print("Retrieving x,y")

def store(x,y,src):
    print("Retrieving item from #Workstation")

def transfer(src,dst):
    print("Transfering from #Workstation")

#-------------------END OF INSTRUCTIONS----------------------------

def queueProcessor(queue):
    # Excecutes the queue of sub instructions and handles cancelations

    # Used in case of a cancelation
    reverseStack = list()
    # Loop until instruction queue is empty
    while queue:
        # Dequeue sub instruction
        subInstruction = queue.popleft()
        # Add reverse instruction to the reverse stack
        reverseStack.append(subInstruction.opposite())
        # Run instruction dequeued
        subInstruction.run()
        # poll server for cancellation
        #TODO!!!!!
        # if cancelled then run reverse stack and confirm to server
    print("Action Completed")
    #maybe send the server a confirmation


#TODO: delete
# action = {"go": go,
#             "retrieve": retrieve,
#             "store": store,
#             "transfer": transfer,
#             "cancel": cancel,
#             "update_map": update_map
#             }

def action_caller(instruction):
    action = instruction["action"]
    if action == "go":
        dst=instruction["dst"]
        go(dst)
    elif action == "store":
        x = instruction["position"]["x"]
        y = instruction["position"]["y"]
        src  = instruction["src"]
        store(x,y,src)
    elif action == "retrieve":
        x = instruction["position"]["x"]
        y = instruction["position"]["y"]
        dst = instruction["dst"]
        retrieve(x,y,dst)
    elif action == "transfer":
        src  = instruction["src"]
        dst = instruction["dst"]
        transfer(src,dst)
    elif action == update_map:
        update_map()

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
            status = "Requesting new instruction"
            yield from websocket.send(status)
            print("> {}".format(status))

            instruction_raw = yield from websocket.recv()
            print("< {}".format(instruction_raw))

            if instruction_raw == "close":
                break
            else:
                instruction = json.loads(instruction_raw)
                #actions[instruction["action"]]()
                action_caller(instruction)

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

    #Default ip address
    ip = "192.168.137.1"
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
