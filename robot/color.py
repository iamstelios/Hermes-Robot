import colorsys
from math import sqrt
from ring import RingBuf
from ev3dev.ev3 import Vec3Sensor


"""
Vector in 3D space with component-wise operations.
"""
class Vec3:
    def __init__(self, x, y, z):
        self._x = x
        self._y = y
        self._z = z

    def __add__(self, other):
        return Vec3(self._x + other._x, self._y + other._y, self._z + other._z)

    def __sub__(self, other):
        return Vec3(self._x - other._x, self._y - other._y, self._z - other._z)

    def __mul__(self, other):
        if isinstance(other, Vec3):
            return Vec3(self._x * other._x, self._y * other._y, self._z * other._z)

        return Vec3(self._x * other, self._y * other, self._z * other)

    def __truediv__(self, other):
        if isinstance(other, Vec3):
            return Vec3(self._x / other._x, self._y / other._y, self._z / other._z)

        return Vec3(self._x / other, self._y / other, self._z / other)

    def __str__(self):
        return "({}, {}, {})".format(self._x, self._y, self._z)

    """ Euclidean norm of the vector. """
    def norm(self):
        return sqrt(self._x * self._x + self._y * self._y + self._z * self._z)

    """ Returns a unit vector in the same direction as this one. """
    def unit(self):
        return self / self.norm()

    """ For vectors representing colours in RGB space, returns same colour in HSV. """
    def rgb_to_hsv(self):
        v = self * (255 / 1020)
        return Vec3(*colorsys.rgb_to_hsv(self._x, self._y, self._z))

COLOR_VALS = {
    ColorSensor.COLOR_WHITE: Vec3(330, 330, 330).rgb_to_hsv(),
    ColorSensor.COLOR_BLACK: Vec3(10, 7, 8).rgb_to_hsv(),
    ColorSensor.COLOR_RED: Vec3(329, 26, 30).rgb_to_hsv(),
    ColorSensor.COLOR_YELLOW: Vec3(386, 176, 62).rgb_to_hsv(),
    ColorSensor.COLOR_GREEN: Vec3(55, 170, 170).rgb_to_hsv() # TODO measure
}

# Experimental alternative colour detection. Mostly sucks, please don't use.
class BetterColorSensor(Vec3Sensor):
    def __init__(self, inp):
        super().__init__(inp)
        self._vals = RingBuf(Vec3(0,0,0), 3)

    def __setattr__(self, attr, val):
        if attr == "mode" and val == "COL-COLOR":
            super().__setattr__("mode", "RGB-RAW")
        else:
            super().__setattr__(attr, val)

    def __getattribute__(self, attr):
        if attr == "color":
            avg = Vec3(*self.raw).rgb_to_hsv()
           #for i in range(0, 3):
           #    self._vals.push(Vec3(*self.raw))

           #avg = self._vals.avg(3)
            print(avg)

            diffs = [ (name, ((avg - val) * Vec3(0.8, 0.1, 0.1)).norm()) for (name, val) in COLOR_VALS.items() ]
            diffs = sorted(diffs, key = lambda p: p[1]) # Sort by distance from each color
            print(diffs)
            return diffs[0][0]
        else:
            return super().__getattribute__(attr)
