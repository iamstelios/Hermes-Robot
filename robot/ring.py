import array


"""
A ringbuffer is a fixed-size buffer which behaves as if its ends are
connected. It keeps track of an index into itself where the next value
will be written and relative to which values ar read. When enough (size + 1)
values have been written to make the index wrap around, writing will start
to overwrite values at the beginning.

Can be used for computing running averages to smooth out sensor readings.
"""
class RingBuf:
    """
    tp - the type of variable stored (e.g. 'f' for float)
    size - the size of the buffer
    """
    def __init__(self, tp, size):
        self._data = array.array(tp, [0]*size)
        self._size = size
        self._i = 0

    """ Pushes a value onto the next slot in the ringuffer. """
    def push(self, val):
        self._data[self._i] = val
        self._i = (self._i+1) % self._size

    """
    Returns the n-th most recently pushed value, counting from 0. """
    def get(self, n=0):
        return self._data[(self._i-n-1) % self._size]

    """
    Returns the arithmetic mean of the last n pushed values. Only works
    for numeric types.
    """
    def avg(self, n):
        if n < 1:
            raise ValueError("Must use at least one value.")

        avg = 0
        for i in range(0, n):
            avg += self.get(i)
        return avg / n

    """
    Returns the variance in the last n pushed values. Only works for numeric
    types.
    """
    def var(self, n):
        avg = self.avg(n)
        
        var = 0
        for i in range(0, n):
            diff = self.get(i) - avg
            var += diff * diff
        return var / n

    """ Readable representation. """
    def __str__(self):
        fmt = '[ '
        for i in range(0, self._size - 1):
            fmt += str(self._data[i])
            fmt += ', '
        fmt += str(self._data[self._size - 1])
        fmt += ' ]'

        return fmt


