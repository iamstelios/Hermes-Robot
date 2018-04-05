import client
import subinstruction
from vertical import *
import time

#subinstruction.Move(client.Position('0'), client.Position('J0')).run()
#subinstruction.MoveJunction('r', 'y').run()
#subinstruction.Move(client.Position('J0'), client.Position('J1')).run()

subinstruction.Reverse().run()
time.sleep(30)
subinstruction.Reverse().run()
time.sleep(30)
subinstruction.Reverse().run()
time.sleep(30)
subinstruction.Reverse().run()
time.sleep(30)
subinstruction.Reverse().run()

# v = VerticalMovementManager()
# v.move_to(LiftPos.SHELF_1)
# v.move_to(LiftPos.SHELF_1_UP)

