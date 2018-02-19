import pickle
import os


""" Directory to store backup files in. """
PICKLE_DIR = '/home/robot/.gherkins/'
""" Variables prefixed with this string will be backed up. """
PICKLE_VAR_PREFIX = 'pkl_'

"""
Given a dictionary, returns all items in the dictionary that start with
the prefix indicating they should be pickled.
"""
def vals_to_pickle(d):
    return { k: v for k, v in d.items() if k.startswith(PICKLE_VAR_PREFIX) }

"""
Class decorator that automatically backs up values of variables prefixed
with PICKLE_VAR_PREFIX to disk, as well as restores them on restart. Should
be used with singletons, since all instances of the class share the same
backup file.
"""
def pickled(cls):
    class PickleWrapper(cls):
        def __init__(self, *args, **kwargs):
            # Guards against using custom __setattr__ in the superclass __init__
            self.__inited = False

            # Initialize actual class
            super().__init__(*args, **kwargs)

            # Compute the list of members which should be backed up
            preserve = sorted(vals_to_pickle(self.__dict__))
            preserve = map(lambda s: s[4:], preserve)

            # Find path to backup file
            path = PICKLE_DIR + cls.__name__ + '_' + '_'.join(preserve) + '.pkl'

            # Make sure backup directory exists
            os.makedirs(PICKLE_DIR, exist_ok=True)

            # Load values from previous file if it exists
            try:
                with open(path, 'rb') as f:
                    prev_dict = pickle.load(f)
                    self.__dict__.update(prev_dict)
            except:
                pass

            # Open backup file for writing
            self.__backup_file = open(path, 'wb')
            self.__inited = True

        """
        Custom function that passes variable writes through to the superclass
        as usual, but also backs up their values to disk if the names match the
        specified pattern.
        """
        def __setattr__(self, name, value):
            super().__setattr__(name, value)
            if self.__inited and name.startswith(PICKLE_VAR_PREFIX):
                # Always write at the beginning to avoid having files with multiple
                # copies of the dict stored
                self.__backup_file.seek(0)
                pickle.dump(vals_to_pickle(self.__dict__), self.__backup_file)

    return PickleWrapper
