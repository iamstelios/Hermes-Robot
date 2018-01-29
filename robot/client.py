#!/usr/bin/env python3

import asyncio
import websockets

@asyncio.coroutine
def start():
    websocket = yield from websockets.connect('ws://10.42.0.170:8000/')

    try:
        status = "This is a status message"
        yield from websocket.send(status)
        print("> {}".format(status))

        instruction = yield from websocket.recv()
        print("< {}".format(instruction))

    finally:
        yield from websocket.close()

asyncio.get_event_loop().run_until_complete(start())
