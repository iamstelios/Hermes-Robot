class SubinstructionError(Exception):
    """ Used when there is a problem finishing the subinstruction """
    def __init__(self, msg):
        # Parameter msg example: "Lost navigation lines"
        self._msg = msg
    def __str__(self):
        return self._msg
