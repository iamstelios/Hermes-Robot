#!/usr/bin/env python3

import asyncio
import websockets
import ev3dev.ev3 as ev3
import json
import sys
import re

def go(to="base"):
    print("I'm going to %s".format(to))
    print("Arrived at %s".format(to))

def retrieve():
    print("Retrieving x,y")
    print("#Workstation received item")


def store():
    print("Retrieving item from #Workstation")
    print("Item stored in x,y")

def transfer():
    print("Transfering from #Workstation")
    print("Tranfer to #Workstation completed")

actions = {"go": go,
           "retrieve": retrieve,
           "store": store,
           "transfer": transfer
           }


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
                actions[instruction["action"]]()

        except asyncio.TimeoutError:
            # Check the connection.
            try:
                pong_waiter = yield from ws.ping()
                yield from asyncio.wait_for(pong_waiter, timeout=10)
            except asyncio.TimeoutError:
                # No response to ping in 10 seconds, disconnect.
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
