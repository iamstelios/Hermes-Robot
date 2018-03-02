const storage = require('node-persist');

storage.initSync();

var exports = module.exports = storage;

exports.storeIfNotStored = function (key, value) {
    // Store value into the persistent storage
    // Used for initialization
    if (storage.getItemSync(key) === undefined) {
        console.log(key, " is undefined. Setting to", JSON.stringify(value));
        storage.setItemSync(key, value);
    }
};

exports.mutate = function (key, mutation) {
    // Update the value of the given key using the mutation function
    var tmp = storage.getItemSync(key);
    tmp = mutation(tmp);
    storage.setItemSync(key, tmp);
    return tmp;
};
