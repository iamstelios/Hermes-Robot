#!/usr/bin/env python3

import asyncio
import websockets
import ev3dev.ev3 as ev3
import json

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
def start():
    print("STARTING")
    websocket = yield from websockets.connect('ws://192.168.137.1:8000/')
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

asyncio.get_event_loop().run_until_complete(start())

