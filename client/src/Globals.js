export var lastId = 0;
export function incrementLastId() {
  lastId++;
  return lastId;
}
export var requests = [];
export const items = [
  {
    code: 0,
    name: 'Sandpaper, Wet and Dry, Fine',
    location: {
      store: 0,
      x: 0,
      y: 0
    }
  }, {
    code: 1,
    name: 'Torque screwdriver with assorted bits',
    location: {
      store: 0,
      x: 2,
      y: 1
    }
  }, {
    code: 2,
    name: 'Toothed lock washers, 30mm',
    location: {
      store: 0,
      x: 1,
      y: 0
    }
  }, {
    code: 3,
    name: 'Junior hack saw',
    location: {
      store: 0,
      x: 1,
      y: 3
    }
  }, {
    code: 4,
    name: 'Glue gun',
    location: {
      store: 0,
      x: 1,
      y: 1
    }
  }
];
