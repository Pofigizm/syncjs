(function() {
  "use strict";

  if (typeof WeakMap === 'undefined') {
    // need weak sets
    (function() {
    var defineProperty = Object.defineProperty;
    var counter = Date.now() % 1e9;

    var WeakMap = function() {
      this.name = '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
    },
    checkKey = function(key) {
      if (!key || typeof key === 'string' ||
      typeof key === 'number' || typeof key === 'boolean' ||
      typeof key === 'regexp') {
      throw new TypeError('value is not a non-null object');
      }
    },
    wrap = function(fn) {
      return function(key, val) {
      checkKey(key);
      return fn.call(this, key, val);
      };
    };

    WeakMap.prototype = {
      set: wrap(function(key, value) {
      var entry = key[this.name];
      if (entry && entry[0] === key)
        entry[1] = value;
      else
        defineProperty(key, this.name, {value: [key, value], writable: true});
      }),
      get: wrap(function(key) {
      var entry;
      return (entry = key[this.name]) && entry[0] === key ?
        entry[1] : undefined;
      }),
      delete: wrap(function(key) {
      this.set(key, undefined);
      })
    };

    window.WeakMap = WeakMap;
    })();
  }
}());