// Copyright 2009-2012 by contributors, MIT License
// vim: ts=4 sts=4 sw=4 expandtab

//Add semicolon to prevent IIFE from being passed as argument to concated code.
;
// Module systems magic dance
(function () {


var prototypeOfObject = Object.prototype;
var hasOwn = prototypeOfObject.hasOwnProperty;

// If JS engine supports accessors creating shortcuts.
var defineGetter;
var defineSetter;
var lookupGetter;
var lookupSetter;
var supportsAccessors;

if ((supportsAccessors = hasOwn.call(prototypeOfObject, "__defineGetter__"))) {
  defineGetter = prototypeOfObject.__defineGetter__;
  defineSetter = prototypeOfObject.__defineSetter__;
  lookupGetter = prototypeOfObject.__lookupGetter__;
  lookupSetter = prototypeOfObject.__lookupSetter__;
}

// ES5 15.2.3.2
// http://es5.github.com/#x15.2.3.2
if (!Object.getPrototypeOf) {
  // https://github.com/kriskowal/es5-shim/issues#issue/2
  // http://ejohn.org/blog/objectgetprototypeof/
  // recommended by fschaefer on github
  Object.getPrototypeOf = function getPrototypeOf(object) {
    return object.__proto__ || (
      object.constructor
        ? object.constructor.prototype
        : prototypeOfObject
    );
  };
}

//ES5 15.2.3.3
//http://es5.github.com/#x15.2.3.3

function doesGetOwnPropertyDescriptorWork(object) {
  try {
    object.sentinel = 0;
    return Object.getOwnPropertyDescriptor(
        object,
        "sentinel"
    ).value === 0;
  } catch (exception) {
    // returns falsy
  }
}

//check whether getOwnPropertyDescriptor works if it's given. Otherwise,
//shim partially.
if (Object.defineProperty) {
  var getOwnPropertyDescriptorWorksOnObject = 
    doesGetOwnPropertyDescriptorWork({});
  var getOwnPropertyDescriptorWorksOnDom = typeof document == "undefined" ||
  doesGetOwnPropertyDescriptorWork(document.createElement("div"));
  if (!getOwnPropertyDescriptorWorksOnDom || 
      !getOwnPropertyDescriptorWorksOnObject
  ) {
    var getOwnPropertyDescriptorFallback = Object.getOwnPropertyDescriptor;
  }
}

if (!Object.getOwnPropertyDescriptor || getOwnPropertyDescriptorFallback) {
  var ERR_NON_OBJECT = "Object.getOwnPropertyDescriptor called on a non-object: ";

  Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor(object, property) {
    if ((typeof object != "object" && typeof object != "function") || object === null) {
      throw new TypeError(ERR_NON_OBJECT + object);
    }

    // make a valiant attempt to use the real getOwnPropertyDescriptor
    // for I8's DOM elements.
    if (getOwnPropertyDescriptorFallback) {
      try {
        return getOwnPropertyDescriptorFallback.call(Object, object, property);
      } catch (exception) {
        // try the shim if the real one doesn't work
      }
    }

    // If object does not hasOwn property return undefined immediately.
    if (!hasOwn.call(object, property)) {
      return;
    }

    // If object has a property then it's for sure both `enumerable` and
    // `configurable`.
    var descriptor =  { enumerable: true, configurable: true };

    // If JS engine supports accessor properties then property may be a
    // getter or setter.
    if (supportsAccessors) {
      // Unfortunately `__lookupGetter__` will return a getter even
      // if object has own non getter property along with a same named
      // inherited getter. To avoid misbehavior we temporary remove
      // `__proto__` so that `__lookupGetter__` will return getter only
      // if it's owned by an object.
      var prototype = object.__proto__;
      object.__proto__ = prototypeOfObject;

      var getter = lookupGetter.call(object, property);
      var setter = lookupSetter.call(object, property);

      // Once we have getter and setter we can put values back.
      object.__proto__ = prototype;

      if (getter || setter) {
        if (getter) {
          descriptor.get = getter;
        }
        if (setter) {
          descriptor.set = setter;
        }
        // If it was accessor property we're done and return here
        // in order to avoid adding `value` to the descriptor.
        return descriptor;
      }
    }

    // If we got this far we know that object has an own property that is
    // not an accessor so we set it as a value and return descriptor.
    descriptor.value = object[property];
    descriptor.writable = true;
    return descriptor;
  };
}

// ES5 15.2.3.4
// http://es5.github.com/#x15.2.3.4
if (!Object.getOwnPropertyNames) {
  Object.getOwnPropertyNames = function getOwnPropertyNames(object) {
    return Object.keys(object);
  };
}

// ES5 15.2.3.5
// http://es5.github.com/#x15.2.3.5
if (!Object.create) {

  // Contributed by Brandon Benvie, October, 2012
  var createEmpty;
  var supportsProto = Object.prototype.__proto__ === null;
  if (supportsProto || typeof document == 'undefined') {
    createEmpty = function () {
      return { "__proto__": null };
    };
  } else {
    createEmpty = function () {
      return {};
    };
  }

  Object.create = function create(prototype, properties) {
    var object;
    function Type() {}  // An empty constructor.

    if (prototype === null) {
      object = createEmpty();
    } else {
      if (typeof prototype !== "object" && typeof prototype !== "function") {
        // In the native implementation `parent` can be `null`
        // OR *any* `instanceof Object`  (Object|Function|Array|RegExp|etc)
        // Use `typeof` tho, b/c in old IE, DOM elements are not `instanceof Object`
        // like they are in modern browsers. Using `Object.create` on DOM elements
        // is...err...probably inappropriate, but the native version allows for it.
        throw new TypeError("Object prototype may only be an Object or null"); // same msg as Chrome
      }
      Type.prototype = prototype;
      object = new Type();
      // IE has no built-in implementation of `Object.getPrototypeOf`
      // neither `__proto__`, but this manually setting `__proto__` will
      // guarantee that `Object.getPrototypeOf` will work as expected with
      // objects created using `Object.create`
      if (!supportsProto) {
        object.__proto__ = prototype;
      }
    }

    if (properties !== void 0) {
      Object.defineProperties(object, properties);
    }

    return object;
  };
}

// ES5 15.2.3.6
// http://es5.github.com/#x15.2.3.6

// Patch for WebKit and IE8 standard mode
// Designed by hax <hax.github.com>
// related issue: https://github.com/kriskowal/es5-shim/issues#issue/5
// IE8 Reference:
//   http://msdn.microsoft.com/en-us/library/dd282900.aspx
//   http://msdn.microsoft.com/en-us/library/dd229916.aspx
// WebKit Bugs:
//   https://bugs.webkit.org/show_bug.cgi?id=36423

function doesDefinePropertyWork(object) {
  try {
    Object.defineProperty(object, "sentinel", {});
    return "sentinel" in object;
  } catch (exception) {
    // returns falsy
  }
}

// check whether defineProperty works if it's given. Otherwise,
// shim partially.
if (Object.defineProperty) {
  var definePropertyWorksOnObject = doesDefinePropertyWork({});
  var definePropertyWorksOnDom = typeof document == "undefined" ||
    doesDefinePropertyWork(document.createElement("div"));
  if (!definePropertyWorksOnObject || !definePropertyWorksOnDom) {
    var definePropertyFallback = Object.defineProperty,
      definePropertiesFallback = Object.defineProperties;
  }
}

if (!Object.defineProperty || definePropertyFallback) {
  var ERR_NON_OBJECT_DESCRIPTOR = "Property description must be an object: ";
  var ERR_NON_OBJECT_TARGET = "Object.defineProperty called on non-object: "
  var ERR_ACCESSORS_NOT_SUPPORTED = "getters & setters can not be defined " +
                    "on this javascript engine";

  Object.defineProperty = function defineProperty(object, property, descriptor) {
    if ((typeof object != "object" && typeof object != "function") || object === null) {
      throw new TypeError(ERR_NON_OBJECT_TARGET + object);
    }
    if ((typeof descriptor != "object" && typeof descriptor != "function") || descriptor === null) {
      throw new TypeError(ERR_NON_OBJECT_DESCRIPTOR + descriptor);
    }
    // make a valiant attempt to use the real defineProperty
    // for I8's DOM elements.
    if (definePropertyFallback) {
      try {
        return definePropertyFallback.call(Object, object, property, descriptor);
      } catch (exception) {
        // try the shim if the real one doesn't work
      }
    }

    // If it's a data property.
    if (hasOwn.call(descriptor, "value")) {
      // fail silently if "writable", "enumerable", or "configurable"
      // are requested but not supported
      /*
      // alternate approach:
      if ( // can't implement these features; allow false but not true
        !(hasOwn.call(descriptor, "writable") ? descriptor.writable : true) ||
        !(hasOwn.call(descriptor, "enumerable") ? descriptor.enumerable : true) ||
        !(hasOwn.call(descriptor, "configurable") ? descriptor.configurable : true)
      )
        throw new RangeError(
          "This implementation of Object.defineProperty does not " +
          "support configurable, enumerable, or writable."
        );
      */

      if (supportsAccessors && (lookupGetter.call(object, property) ||
                    lookupSetter.call(object, property)))
      {
        // As accessors are supported only on engines implementing
        // `__proto__` we can safely override `__proto__` while defining
        // a property to make sure that we don't hit an inherited
        // accessor.
        var prototype = object.__proto__;
        object.__proto__ = prototypeOfObject;
        // Deleting a property anyway since getter / setter may be
        // defined on object itself.
        delete object[property];
        object[property] = descriptor.value;
        // Setting original `__proto__` back now.
        object.__proto__ = prototype;
      } else {
        object[property] = descriptor.value;
      }
    } else {
      if (!supportsAccessors) {
        throw new TypeError(ERR_ACCESSORS_NOT_SUPPORTED);
      }
      // If we got that far then getters and setters can be defined !!
      if (hasOwn.call(descriptor, "get")) {
        defineGetter.call(object, property, descriptor.get);
      }
      if (hasOwn.call(descriptor, "set")) {
        defineSetter.call(object, property, descriptor.set);
      }
    }
    return object;
  };
}

// ES5 15.2.3.7
// http://es5.github.com/#x15.2.3.7
if (!Object.defineProperties || definePropertiesFallback) {
  Object.defineProperties = function defineProperties(object, properties) {
    // make a valiant attempt to use the real defineProperties
    if (definePropertiesFallback) {
      try {
        return definePropertiesFallback.call(Object, object, properties);
      } catch (exception) {
        // try the shim if the real one doesn't work
      }
    }

    for (var property in properties) {
      if (hasOwn.call(properties, property) && property != "__proto__") {
        Object.defineProperty(object, property, properties[property]);
      }
    }
    return object;
  };
}

// ES5 15.2.3.8
// http://es5.github.com/#x15.2.3.8
if (!Object.seal) {
  Object.seal = function seal(object) {
    // this is misleading and breaks feature-detection, but
    // allows "securable" code to "gracefully" degrade to working
    // but insecure code.
    return object;
  };
}

// ES5 15.2.3.9
// http://es5.github.com/#x15.2.3.9
if (!Object.freeze) {
  Object.freeze = function freeze(object) {
    // this is misleading and breaks feature-detection, but
    // allows "securable" code to "gracefully" degrade to working
    // but insecure code.
    return object;
  };
}

// detect a Rhino bug and patch it
try {
  Object.freeze(function () {});
} catch (exception) {
  Object.freeze = (function freeze(freezeObject) {
    return function freeze(object) {
      if (typeof object == "function") {
        return object;
      } else {
        return freezeObject(object);
      }
    };
  })(Object.freeze);
}

// ES5 15.2.3.10
// http://es5.github.com/#x15.2.3.10
if (!Object.preventExtensions) {
  Object.preventExtensions = function preventExtensions(object) {
    // this is misleading and breaks feature-detection, but
    // allows "securable" code to "gracefully" degrade to working
    // but insecure code.
    return object;
  };
}

// ES5 15.2.3.11
// http://es5.github.com/#x15.2.3.11
if (!Object.isSealed) {
  Object.isSealed = function isSealed(object) {
    return false;
  };
}

// ES5 15.2.3.12
// http://es5.github.com/#x15.2.3.12
if (!Object.isFrozen) {
  Object.isFrozen = function isFrozen(object) {
    return false;
  };
}

// ES5 15.2.3.13
// http://es5.github.com/#x15.2.3.13
if (!Object.isExtensible) {
  Object.isExtensible = function isExtensible(object) {
    // 1. If Type(O) is not Object throw a TypeError exception.
    if (Object(object) !== object) {
      throw new TypeError(); // TODO message
    }
    // 2. Return the Boolean value of the [[Extensible]] internal property of O.
    var name = '';
    while (hasOwn.call(object, name)) {
      name += '?';
    }
    object[name] = true;
    var returnValue = hasOwn.call(object, name);
    delete object[name];
    return returnValue;
  };
}

if (!hasOwn.call(Function.prototype, 'bind')) {
  var slice = Array.prototype.slice;

  Object.defineProperty(Function.prototype, 'bind', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function(thisArg) {
      var fn = this,
        args = arguments.length > 1 ? slice.call(arguments, 1) : null;

      return function() {
        var currentArgs = arguments.length ? slice.call(arguments) : null;

        currentArgs = args ?
          (currentArgs ? args.concat(currentArgs) : args) :
          currentArgs;

        if (!currentArgs || !currentArgs.length) {
          return fn.call(thisArg);
        }

        if (currentArgs.length === 1) {
          return fn.call(thisArg, currentArgs[0]);
        }

        return fn.apply(thisArg, currentArgs);
      }
    }
  })
}

})();


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


// https://github.com/jakearchibald/ES6-Promise
// Copyright (c) 2013 Yehuda Katz, Tom Dale, and contributors
// https://github.com/jakearchibald/es6-promise/blob/master/LICENSE


(function() {
var define, requireModule, require, requirejs;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  requirejs = require = requireModule = function(name) {
  requirejs._eak_seen = registry;

    if (seen[name]) { return seen[name]; }
    seen[name] = {};

    if (!registry[name]) {
      throw new Error("Could not find module " + name);
    }

    var mod = registry[name],
        deps = mod.deps,
        callback = mod.callback,
        reified = [],
        exports;

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(requireModule(resolve(deps[i])));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;

    function resolve(child) {
      if (child.charAt(0) !== '.') { return child; }
      var parts = child.split("/");
      var parentBase = name.split("/").slice(0, -1);

      for (var i=0, l=parts.length; i<l; i++) {
        var part = parts[i];

        if (part === '..') { parentBase.pop(); }
        else if (part === '.') { continue; }
        else { parentBase.push(part); }
      }

      return parentBase.join("/");
    }
  };
})();

define("promise/all", 
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global toString */

    var isArray = __dependency1__.isArray;
    var isFunction = __dependency1__.isFunction;

    /**
      Returns a promise that is fulfilled when all the given promises have been
      fulfilled, or rejected if any of them become rejected. The return promise
      is fulfilled with an array that gives all the values in the order they were
      passed in the `promises` array argument.

      Example:

      ```javascript
      var promise1 = RSVP.resolve(1);
      var promise2 = RSVP.resolve(2);
      var promise3 = RSVP.resolve(3);
      var promises = [ promise1, promise2, promise3 ];

      RSVP.all(promises).then(function(array){
        // The array here would be [ 1, 2, 3 ];
      });
      ```

      If any of the `promises` given to `RSVP.all` are rejected, the first promise
      that is rejected will be given as an argument to the returned promises's
      rejection handler. For example:

      Example:

      ```javascript
      var promise1 = RSVP.resolve(1);
      var promise2 = RSVP.reject(new Error("2"));
      var promise3 = RSVP.reject(new Error("3"));
      var promises = [ promise1, promise2, promise3 ];

      RSVP.all(promises).then(function(array){
        // Code here never runs because there are rejected promises!
      }, function(error) {
        // error.message === "2"
      });
      ```

      @method all
      @for RSVP
      @param {Array} promises
      @param {String} label
      @return {Promise} promise that is fulfilled when all `promises` have been
      fulfilled, or rejected if any of them become rejected.
    */
    function all(promises) {
      /*jshint validthis:true */
      var Promise = this;

      if (!isArray(promises)) {
        throw new TypeError('You must pass an array to all.');
      }

      return new Promise(function(resolve, reject) {
        var results = [], remaining = promises.length,
        promise;

        if (remaining === 0) {
          resolve([]);
        }

        function resolver(index) {
          return function(value) {
            resolveAll(index, value);
          };
        }

        function resolveAll(index, value) {
          results[index] = value;
          if (--remaining === 0) {
            resolve(results);
          }
        }

        for (var i = 0; i < promises.length; i++) {
          promise = promises[i];

          if (promise && isFunction(promise.then)) {
            promise.then(resolver(i), reject);
          } else {
            resolveAll(i, promise);
          }
        }
      });
    }

    __exports__.all = all;
  });
define("promise/asap", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var browserGlobal = (typeof window !== 'undefined') ? window : {};
    var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
    var local = (typeof global !== 'undefined') ? global : this;

    // node
    function useNextTick() {
      return function() {
        process.nextTick(flush);
      };
    }

    function useMutationObserver() {
      var iterations = 0;
      var observer = new BrowserMutationObserver(flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    function useSetTimeout() {
      return function() {
        local.setTimeout(flush, 1);
      };
    }

    var queue = [];
    function flush() {
      for (var i = 0; i < queue.length; i++) {
        var tuple = queue[i];
        var callback = tuple[0], arg = tuple[1];
        callback(arg);
      }
      queue = [];
    }

    var scheduleFlush;

    // Decide what async method to use to triggering processing of queued callbacks:
    if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
      scheduleFlush = useNextTick();
    } else if (BrowserMutationObserver) {
      scheduleFlush = useMutationObserver();
    } else {
      scheduleFlush = useSetTimeout();
    }

    function asap(callback, arg) {
      var length = queue.push([callback, arg]);
      if (length === 1) {
        // If length is 1, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        scheduleFlush();
      }
    }

    __exports__.asap = asap;
  });
define("promise/cast", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
      `RSVP.Promise.cast` returns the same promise if that promise shares a constructor
      with the promise being casted.

      Example:

      ```javascript
      var promise = RSVP.resolve(1);
      var casted = RSVP.Promise.cast(promise);

      console.log(promise === casted); // true
      ```

      In the case of a promise whose constructor does not match, it is assimilated.
      The resulting promise will fulfill or reject based on the outcome of the
      promise being casted.

      In the case of a non-promise, a promise which will fulfill with that value is
      returned.

      Example:

      ```javascript
      var value = 1; // could be a number, boolean, string, undefined...
      var casted = RSVP.Promise.cast(value);

      console.log(value === casted); // false
      console.log(casted instanceof RSVP.Promise) // true

      casted.then(function(val) {
        val === value // => true
      });
      ```

      `RSVP.Promise.cast` is similar to `RSVP.resolve`, but `RSVP.Promise.cast` differs in the
      following ways:
      * `RSVP.Promise.cast` serves as a memory-efficient way of getting a promise, when you
      have something that could either be a promise or a value. RSVP.resolve
      will have the same effect but will create a new promise wrapper if the
      argument is a promise.
      * `RSVP.Promise.cast` is a way of casting incoming thenables or promise subclasses to
      promises of the exact class specified, so that the resulting object's `then` is
      ensured to have the behavior of the constructor you are calling cast on (i.e., RSVP.Promise).

      @method cast
      @for RSVP
      @param {Object} object to be casted
      @return {Promise} promise that is fulfilled when all properties of `promises`
      have been fulfilled, or rejected if any of them become rejected.
    */


    function cast(object) {
      /*jshint validthis:true */
      if (object && typeof object === 'object' && object.constructor === this) {
        return object;
      }

      var Promise = this;

      return new Promise(function(resolve) {
        resolve(object);
      });
    }

    __exports__.cast = cast;
  });
define("promise/config", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var config = {
      instrument: false
    };

    function configure(name, value) {
      if (arguments.length === 2) {
        config[name] = value;
      } else {
        return config[name];
      }
    }

    __exports__.config = config;
    __exports__.configure = configure;
  });
define("promise/polyfill", 
  ["./promise","./utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var RSVPPromise = __dependency1__.Promise;
    var isFunction = __dependency2__.isFunction;

    function polyfill() {
      var es6PromiseSupport = 
        "Promise" in window &&
        // Some of these methods are missing from
        // Firefox/Chrome experimental implementations
        "cast" in window.Promise &&
        "resolve" in window.Promise &&
        "reject" in window.Promise &&
        "all" in window.Promise &&
        "race" in window.Promise &&
        // Older version of the spec had a resolver object
        // as the arg rather than a function
        (function() {
          var resolve;
          new window.Promise(function(r) { resolve = r; });
          return isFunction(resolve);
        }());

      if (!es6PromiseSupport) {
        window.Promise = RSVPPromise;
      }
    }

    __exports__.polyfill = polyfill;
  });
define("promise/promise", 
  ["./config","./utils","./cast","./all","./race","./resolve","./reject","./asap","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __exports__) {
    "use strict";
    var config = __dependency1__.config;
    var configure = __dependency1__.configure;
    var objectOrFunction = __dependency2__.objectOrFunction;
    var isFunction = __dependency2__.isFunction;
    var now = __dependency2__.now;
    var cast = __dependency3__.cast;
    var all = __dependency4__.all;
    var race = __dependency5__.race;
    var staticResolve = __dependency6__.resolve;
    var staticReject = __dependency7__.reject;
    var asap = __dependency8__.asap;

    var counter = 0;

    config.async = asap; // default async is asap;

    function Promise(resolver) {
      if (!isFunction(resolver)) {
        throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
      }

      if (!(this instanceof Promise)) {
        throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
      }

      this._subscribers = [];

      invokeResolver(resolver, this);
    }

    function invokeResolver(resolver, promise) {
      function resolvePromise(value) {
        resolve(promise, value);
      }

      function rejectPromise(reason) {
        reject(promise, reason);
      }

      try {
        resolver(resolvePromise, rejectPromise);
      } catch(e) {
        rejectPromise(e);
      }
    }

    function invokeCallback(settled, promise, callback, detail) {
      var hasCallback = isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        try {
          value = callback(detail);
          succeeded = true;
        } catch(e) {
          failed = true;
          error = e;
        }
      } else {
        value = detail;
        succeeded = true;
      }

      if (handleThenable(promise, value)) {
        return;
      } else if (hasCallback && succeeded) {
        resolve(promise, value);
      } else if (failed) {
        reject(promise, error);
      } else if (settled === FULFILLED) {
        resolve(promise, value);
      } else if (settled === REJECTED) {
        reject(promise, value);
      }
    }

    var PENDING   = void 0;
    var SEALED    = 0;
    var FULFILLED = 1;
    var REJECTED  = 2;

    function subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      subscribers[length] = child;
      subscribers[length + FULFILLED] = onFulfillment;
      subscribers[length + REJECTED]  = onRejection;
    }

    function publish(promise, settled) {
      var child, callback, subscribers = promise._subscribers, detail = promise._detail;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        invokeCallback(settled, child, callback, detail);
      }

      promise._subscribers = null;
    }

    Promise.prototype = {
      constructor: Promise,

      _state: undefined,
      _detail: undefined,
      _subscribers: undefined,

      then: function(onFulfillment, onRejection) {
        var promise = this;

        var thenPromise = new this.constructor(function() {});

        if (this._state) {
          var callbacks = arguments;
          config.async(function invokePromiseCallback() {
            invokeCallback(promise._state, thenPromise, callbacks[promise._state - 1], promise._detail);
          });
        } else {
          subscribe(this, thenPromise, onFulfillment, onRejection);
        }

        return thenPromise;
      },

      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };

    Promise.all = all;
    Promise.cast = cast;
    Promise.race = race;
    Promise.resolve = staticResolve;
    Promise.reject = staticReject;

    function handleThenable(promise, value) {
      var then = null,
      resolved;

      try {
        if (promise === value) {
          throw new TypeError("A promises callback cannot return that same promise.");
        }

        if (objectOrFunction(value)) {
          then = value.then;

          if (isFunction(then)) {
            then.call(value, function(val) {
              if (resolved) { return true; }
              resolved = true;

              if (value !== val) {
                resolve(promise, val);
              } else {
                fulfill(promise, val);
              }
            }, function(val) {
              if (resolved) { return true; }
              resolved = true;

              reject(promise, val);
            });

            return true;
          }
        }
      } catch (error) {
        if (resolved) { return true; }
        reject(promise, error);
        return true;
      }

      return false;
    }

    function resolve(promise, value) {
      if (promise === value) {
        fulfill(promise, value);
      } else if (!handleThenable(promise, value)) {
        fulfill(promise, value);
      }
    }

    function fulfill(promise, value) {
      if (promise._state !== PENDING) { return; }
      promise._state = SEALED;
      promise._detail = value;

      config.async(publishFulfillment, promise);
    }

    function reject(promise, reason) {
      if (promise._state !== PENDING) { return; }
      promise._state = SEALED;
      promise._detail = reason;

      config.async(publishRejection, promise);
    }

    function publishFulfillment(promise) {
      publish(promise, promise._state = FULFILLED);
    }

    function publishRejection(promise) {
      publish(promise, promise._state = REJECTED);
    }

    __exports__.Promise = Promise;
  });
define("promise/race", 
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global toString */
    var isArray = __dependency1__.isArray;

    /**
      `RSVP.race` allows you to watch a series of promises and act as soon as the
      first promise given to the `promises` argument fulfills or rejects.

      Example:

      ```javascript
      var promise1 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 1");
        }, 200);
      });

      var promise2 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 2");
        }, 100);
      });

      RSVP.race([promise1, promise2]).then(function(result){
        // result === "promise 2" because it was resolved before promise1
        // was resolved.
      });
      ```

      `RSVP.race` is deterministic in that only the state of the first completed
      promise matters. For example, even if other promises given to the `promises`
      array argument are resolved, but the first completed promise has become
      rejected before the other promises became fulfilled, the returned promise
      will become rejected:

      ```javascript
      var promise1 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 1");
        }, 200);
      });

      var promise2 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          reject(new Error("promise 2"));
        }, 100);
      });

      RSVP.race([promise1, promise2]).then(function(result){
        // Code here never runs because there are rejected promises!
      }, function(reason){
        // reason.message === "promise2" because promise 2 became rejected before
        // promise 1 became fulfilled
      });
      ```

      @method race
      @for RSVP
      @param {Array} promises array of promises to observe
      @param {String} label optional string for describing the promise returned.
      Useful for tooling.
      @return {Promise} a promise that becomes fulfilled with the value the first
      completed promises is resolved with if the first completed promise was
      fulfilled, or rejected with the reason that the first completed promise
      was rejected with.
    */
    function race(promises) {
      /*jshint validthis:true */
      var Promise = this;

      if (!isArray(promises)) {
        throw new TypeError('You must pass an array to race.');
      }
      return new Promise(function(resolve, reject) {
        var results = [], promise;

        for (var i = 0; i < promises.length; i++) {
          promise = promises[i];

          if (promise && typeof promise.then === 'function') {
            promise.then(resolve, reject);
          } else {
            resolve(promise);
          }
        }
      });
    }

    __exports__.race = race;
  });
define("promise/reject", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
      `RSVP.reject` returns a promise that will become rejected with the passed
      `reason`. `RSVP.reject` is essentially shorthand for the following:

      ```javascript
      var promise = new RSVP.Promise(function(resolve, reject){
        reject(new Error('WHOOPS'));
      });

      promise.then(function(value){
        // Code here doesn't run because the promise is rejected!
      }, function(reason){
        // reason.message === 'WHOOPS'
      });
      ```

      Instead of writing the above, your code now simply becomes the following:

      ```javascript
      var promise = RSVP.reject(new Error('WHOOPS'));

      promise.then(function(value){
        // Code here doesn't run because the promise is rejected!
      }, function(reason){
        // reason.message === 'WHOOPS'
      });
      ```

      @method reject
      @for RSVP
      @param {Any} reason value that the returned promise will be rejected with.
      @param {String} label optional string for identifying the returned promise.
      Useful for tooling.
      @return {Promise} a promise that will become rejected with the given
      `reason`.
    */
    function reject(reason) {
      /*jshint validthis:true */
      var Promise = this;

      return new Promise(function (resolve, reject) {
        reject(reason);
      });
    }

    __exports__.reject = reject;
  });
define("promise/resolve", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
      `RSVP.resolve` returns a promise that will become fulfilled with the passed
      `value`. `RSVP.resolve` is essentially shorthand for the following:

      ```javascript
      var promise = new RSVP.Promise(function(resolve, reject){
        resolve(1);
      });

      promise.then(function(value){
        // value === 1
      });
      ```

      Instead of writing the above, your code now simply becomes the following:

      ```javascript
      var promise = RSVP.resolve(1);

      promise.then(function(value){
        // value === 1
      });
      ```

      @method resolve
      @for RSVP
      @param {Any} value value that the returned promise will be resolved with
      @param {String} label optional string for identifying the returned promise.
      Useful for tooling.
      @return {Promise} a promise that will become fulfilled with the given
      `value`
    */
    function resolve(value) {
      /*jshint validthis:true */
      var Promise = this;
      return new Promise(function(resolve, reject) {
        resolve(value);
      });
    }

    __exports__.resolve = resolve;
  });
define("promise/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function objectOrFunction(x) {
      return isFunction(x) || (typeof x === "object" && x !== null);
    }

    function isFunction(x) {
      return typeof x === "function";
    }

    function isArray(x) {
      return Object.prototype.toString.call(x) === "[object Array]";
    }

    // Date.now is not available in browsers < IE9
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
    var now = Date.now || function() { return new Date().getTime(); };


    __exports__.objectOrFunction = objectOrFunction;
    __exports__.isFunction = isFunction;
    __exports__.isArray = isArray;
    __exports__.now = now;
  });
requireModule('promise/polyfill').polyfill();
}());/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

;(function(window, undefined) {
  "use strict";

  var R_QUERY_SEARCH = /^([\w\d]*)(\[[\s\S]*\])$/;

  var toString = Object.prototype.toString,
    hasOwn = Object.prototype.hasOwnProperty,
    arrayProto = Array.prototype,
    slice = arrayProto.slice,
    getKeys = Object.keys,
    Sync = window.Sync = function Sync() {},
    each = Sync.each = function(obj, fn, thisValue) {
      if (typeof fn !== 'function' || !obj) return obj;

      var keys = getKeys(obj),
        key,
        i = 0,
        len = keys.length;

      if (thisValue) {
        fn = fn.bind(thisValue);
      }

      for (; i < len; i++) {
        key = keys[i];

        if (key === 'prototype') continue;

        fn(obj[key], key, obj);
      }

      return obj;
    },
    // indicates that first passed argument
    // is object or not
    isObject = Sync.isObject = function(obj) {
      obj = obj && typeof obj.valueOf === 'function' && obj.valueOf() || obj;
      return obj != null && typeof obj === 'object';
    },
    isStrict = function() {
      return !this;
    },
    isArray = Array.isArray,
    extend = Sync.extend = function(tmp) {
      var args = arguments,
        overwrite = true,
        recurse = false,
        start = 1,
        end = args.length,
        to = args[0];

      if (end < 2) return tmp || null;

      if (typeof tmp === 'boolean') {
        to = args[start++];
        recurse = args[0];
      }

      if (typeof args[end - 1] === 'boolean') {
        overwrite = args[--end];
      }

      function action(value, key) {
        if (recurse && isObject(value) &&
            (to[key] && overwrite || !to[key])) {

          if (!isArray(to[key]) && !isObject(to[key])) {
            if (isArray(value)) {
              to[key] = [];
            } else if (value instanceof RegExp || typeof value === 'regexp') {
              to[key] = new RegExp(value);
            } else {
              to[key] = {};
            }
          }

          extend(recurse, to[key], value, overwrite);
        } else if (typeof value !== 'undefined') {
          !overwrite && key in to || (to[key] = value);
        }
      }

      for (; start < end; start++) {
        if (isArray(args[start])) {
          args[start].forEach(action);
        } else {
          each(args[start], action);
        }
      }

      return to;
    };

  Sync.toString = function() {
    return 'https://github.com/NekR/Sync';
  };

  var escape = function(key, val) {
      if (isArray(val)) {
        return val.map(function(deepVal, index) {
          return escape(key + '[' + index + ']', deepVal);
        }).join('&');
      } else if (typeof val === 'object') {
        return Object.keys(val).map(function(rest) {
          return escape(key + '[' + rest + ']', this[rest]);
        }, val).filter(function(val) {
          return val;
        }).join('&');
      } else {
        return key + '=' + encodeURIComponent(val);
      }
    },
    equal = function(first, second, recursion) {
      if (isArray(first)) {
        return first.every(function(val, i) {
          return recursion(val, second[i]);
        });
      } else if (typeof first === 'object' && first !== null) {
        return Object.keys(first).every(function(val) {
          return recursion(first[val], second[val]);
        });
      } else {
        return first === second;
      }
    },
    unescapePair = Sync.unescapePair = function(target, name, value) {
      name = decodeURIComponent(name);
      value = decodeURIComponent(value);
      
      var match = name.match(R_QUERY_SEARCH),
        rest;

      if (match) {
        name = match[1];
        rest = (rest = match[2]).slice(1, rest.length - 1);
        rest = rest.split('][').reduce(function(key, next) {
          if (!(key in target)) {
            target[key] = next ? {} : [];
          }

          target = target[key];
          return next;
        }, name);

        target[rest] = value;
      } else {
        target[name] = value;
      }
    };

  Sync.escape = function(obj) {
    return Object.keys(obj).map(function(key) {
      return escape(key, obj[key]);
    }).join('&');
  };

  Sync.equal = function(first, second) {
    if (first === second) {
      return true;
    } else if (!first || !second || typeof first !== typeof second ||
          first.length !== second.length) {
      return false;
    } else {
      return equal(first, second, Sync.equal);
    }
  };

  Sync.unescape = function(string, linear) {
    if (typeof string !== 'string') return null;

    return string.split('&').reduce(function(result, prop) {
      if (prop) {
        prop = prop.split('=');

        if (linear) {
          result[decodeURIComponent(prop[0])] = decodeURIComponent(prop[1]);
        } else {
          unescapePair(result, prop[0], prop[1]);
        }
      }

      return result;
    }, {});
  };

  Sync.cache = function(elem, hash, value) {
    var data = elem._ || (elem._ = {});

    if (!hash) {
      return data;
    } else {
      if (typeof value !== 'undefined') {
        return data[hash] = value;
      } else {
        return typeof data[hash] !== 'undefined' ?
          data[hash] : (data[hash] = {});
      }
    }
  };
}(this));
/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

;(function(window, document, Sync, undefined) {
  "use strict";

  var R_CAMEL_2_CSS = /[A-Z](?=\w)/g;

  var Element = window.Element || window.HTMLElement,
    Document = window.Document || window.HTMLDocument,
    Node = window.Node,
    Text = window.Text,
    Comment = window.Comment,
    DocumentFragment = window.DocumentFragment || Document,
    createElement = typeof document.createElement === 'function' ?
      document.createElement.bind(document) : document.createElement,
    element = createElement('div'),
    head = document.getElementsByTagName('head')[0],
    NodeChildren = [
      Element,
      Document,
      Text
    ],
    applyingMutations = {
      prepend: {
        handler: function() {
          var node = mutationMacro(arguments);

          if (node) {
            this.insertBefore(node, this.firstChild);
          }
        },
        targets: [Element, DocumentFragment, Document]
      },
      append: {
        handler: function() {
          var node = mutationMacro(arguments);

          if (node) {
            this.appendChild(node);
          }
        },
        targets: [Element, DocumentFragment, Document]
      },
      before: {
        handler: function() {
          var node,
            parent = this.parentNode;

          if (!parent) return;

          node = mutationMacro(arguments);

          if (node) {
            parent.insertBefore(node, this);
          }
        },
        targets: [Element, Text, Comment]
      },
      after: {
        handler: function() {
          var node,
            parent = this.parentNode;

          if (!parent) return;

          node = mutationMacro(arguments);

          if (node) {
            parent.insertBefore(node, this.nextSibling);
          }
        },
        targets: [Element, Text, Comment]
      },
      replace: {
        handler: function() {
          var node,
            parent = this.parentNode;

          if (!parent) return;

          node = mutationMacro(arguments);

          if (node) {
            parent.replaceChild(node, this);
          }
        },
        targets: [Element, Text, Comment]
      },
      remove: {
        handler: function() {
          var parent = this.parentNode;

          if (!parent) return;

          parent.removeChild(this);
        },
        targets: [Element, Text, Comment]
      }
    };

  var camel2css = function(w) {
    return ('-' + w).toLowerCase();
  },
  mutationNodeTransform = function(node) {
    if (typeof node === 'string') {
      return document.createTextNode(node);
    }

    if (!node.nodeType) return null;

    return node;
  },
  mutationMacro = function(nodes) {
    if (!nodes) return null;

    if (nodes.length === 1) {
      return mutationNodeTransform(nodes[0]);
    }

    var fragment = document.createDocumentFragment(),
      i = 0,
      len = nodes.length,
      node;

    for (; i < len; i++) {
      node = mutationNodeTransform(nodes[i]);

      if (node) {
        fragment.appendChild(node);
      }
    }

    return fragment;
  },
  define = Object.defineProperty,
  getDescriptor = Object.getOwnPropertyDescriptor,
  slice = Array.prototype.slice,
  hasOwn = Object.prototype.hasOwnProperty;

  // IE8 targets
  if (!Node && document.attachEvent) {
    window.Node = Node = function Node() {};

    Node.prototype =
      document.documentElement.appendChild(document.createElement('Node'));

    document.documentElement.removeChild(Node.prototype);

    [
      'ELEMENT_NODE',
      'ATTRIBUTE_NODE',
      'TEXT_NODE',
      'CDATA_SECTION_NODE',
      'ENTITY_REFERENCE_NODE',
      'ENTITY_NODE',
      'PROCESSING_INSTRUCTION_NODE',
      'COMMENT_NODE',
      'DOCUMENT_NODE',
      'DOCUMENT_TYPE_NODE',
      'DOCUMENT_FRAGMENT_NODE',
      'NOTATION_NODE'
    ].forEach(function(name, value) {
      Node[name] = Node.prototype[name] = value + 1;
    });

    [
      'DOCUMENT_POSITION_DISCONNECTED',
      'DOCUMENT_POSITION_PRECEDING',
      'DOCUMENT_POSITION_FOLLOWING',
      'DOCUMENT_POSITION_CONTAINS',
      'DOCUMENT_POSITION_CONTAINED_BY',
      'DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC'
    ].forEach(function(name, value) {
      Node[name] = Node.prototype[name] = Math.pow(2, value);
    });

    Node.prototype.attachEvent('onpropertychange', function() {
      var name,
        desc;

      if (window.event && (name = window.event.propertyName)) {
        desc = Object.getOwnPropertyDescriptor(Node.prototype, name);

        NodeChildren.forEach(function(child) {
          define(child.prototype, name, desc);
        });
      }
    });

    define(window, 'Node', {
      value: Node
    });

    (function() {
      var originalPropertyDefinition = define;

      define = Object.defineProperty =
        function defineProperty(object, name, description) {
          var ret = originalPropertyDefinition.apply(this, arguments),
            e;

          if (object.nodeType && object.fireEvent) {
            e = document.createEventObject();
            e.propertyName = name;
            object.fireEvent('onpropertychange', e);
          }

          return ret;
        };
    }());
  }

  /*var dom = Sync.dom = {
    inTree: function(elem) {
      return elem && elem.nodeType &&
        (elem.parentNode ? ((elem = elem.parentNode).nodeType ===
          Node.DOCUMENT_FRAGMENT_NODE ? dom.inTree(elem) : true) : false);
    },
    isView: function(view) {
      return view && view.setTimeout && view.clearTimeout;
    }
  };*/

  if (!document.head) {
    Object.defineProperty(document, 'head', {
      get: function() {
        return head;
      }
    });
  }

  if (!('origin' in window.location)) {
    try {
      define(window.location, 'origin', {
        get: function() {
          return this.protocol + '//' + this.host;
        }
      });
    } catch (e) {
      window.location.origin =
        window.location.protocol + '//' + window.location.host;
    }
  }

  if (!('origin' in document.createElement('a'))) {
    [
      'HTMLAnchorElement',
      'HTMLLinkElement',
      'HTMLAreaElement'
    ].forEach(function(key) {
      define(window[key].prototype, 'origin', {
        get: function() {
          return this.protocol + '//' + this.host;
        }
      });
    });
  }

  // IE8
  if (!('innerWidth' in window)) {
    Object.defineProperties(window, {
      innerWidth: {
        get: function() {
          if (document.compatMode !== 'CSS1Compat' && document.body) {
            return document.body.clientWidth || 0;
          } else {
            return document.documentElement.clientWidth || 0;
          }
        }
      },
      innerHeight: {
        get: function() {
          if (document.compatMode !== 'CSS1Compat' && document.body) {
            return document.body.clientHeight || 0;
          } else {
            return document.documentElement.clientHeight || 0;
          }
        }
      }
    });
  }

  // IE8 also
  try {
    var nodeListSlice = slice.call(document.querySelectorAll('html'), 0);
  } catch (e) {
    nodeListSlice = null;
  } finally {
    if (!Array.isArray(nodeListSlice)) {
      define(Array.prototype, 'slice', {
        writable: true,
        configurable: true,
        enumerable: false,
        value: function(from, to) {
          if (this instanceof window.StaticNodeList ||
              this instanceof window.NodeList ||
              this instanceof window.HTMLCollection ||
              this instanceof window.HTMLFormElement ||
              this instanceof window.HTMLSelectElement) {

            from |= 0;
            typeof to === 'number' || (to = this.length);

            if (!isFinite(from) || !isFinite(to) ||
                (to > this.length && from > this.length)) {
              return [];
            }

            var result = [],
              i = (from < 0 ? this.length - from : from),
              len = (to < 0 ? this.length - to : to),
              item;

            for (; i < len; i++) {
              if (hasOwn.call(this, i) && (item = this[i])) {
                result.push(item);
              }
            }

            return result;
          } else {

            return slice.apply(this, arguments);
          }
        }
      });
    }
  }

  // IE8
  if (!('textContent' in element) && 'innerText' in Element.prototype) {
    define(Element.prototype, 'textContent', {
      get: function() {
        return this.innerText;
      },
      set: function(value) {
        this.innerText = value;
      }
    });

    define(Text.prototype, 'textContent', {
      get: function() {
        return this.nodeValue;
      },
      set: function(value) {
        this.nodeValue = value;
      }
    });
  }

  if (!('outerHTML' in element)) {
    define(Element.prototype, 'outerHTML', {
      get: function() {
        var tmp = document.createElement('div'),
          html;

        tmp.appendChild(this.cloneNode(true));
        html = tmp.innerHTML;
        tmp = null;

        return html;
      },
      set: function(value) {
        this.insertAdjacentHTML('beforebegin', value);
        this.remove();
      }
    });
  }

  // IE8
  if (!('sheet' in createElement('style')) &&
      'styleSheet' in HTMLStyleElement.prototype) {

    var _styleSheetHTMLKey = '_styleSheetHTMLKey';

    Object.defineProperties(HTMLStyleElement.prototype, {
      sheet: {
        get: function() {
          return this.styleSheet;
        }
      },
      appendChild: {
        value: function(node) {
          if (!node || !node.nodeType) throw TypeError('bad argument');

          if (node.nodeType === Node.TEXT_NODE) {
            this.innerHTML += node.textContent;
          }
        }
      },
      innerHTML: {
        get: function() {
          if (this.styleSheet) {
            return this.styleSheet.cssText;
          } else {
            return Sync.dom.cache(this)[_styleSheetHTMLKey] || '';
          }
        },
        set: function(html) {
          if (!this.styleSheet) {
            var cache = Sync.dom.cache(this),
              self = this,
              handler = function() {
                if (self.readyState === 'loading' ||
                    self.readyState === 'complete') {
                  self.detachEvent('onreadystatechange', handler);
                  self.innerHTML = cache[_styleSheetHTMLKey];
                }
              };

            cache[_styleSheetHTMLKey] =
              (cache[_styleSheetHTMLKey] || '') + html;

            this.attachEvent('onreadystatechange', handler);
          } else {
            this.styleSheet.cssText = html;
          }
        }
      }
    });
  }

  // http://www.quirksmode.org/blog/archives/2006/01/contains_for_mo.html
  if (Node && !Node.prototype.contains &&
      'compareDocumentPosition' in Element.prototype) {
    var compareDocumentPosition = Element.prototype.compareDocumentPosition;
    define(Node.prototype, 'contains', {
      value: function contains(node) {
        return !!(compareDocumentPosition.call(this, node) & 16);
      }
    });
  }

  // IE8
  if (Node && !('compareDocumentPosition' in Node.prototype) &&
      'sourceIndex' in Node.prototype && 'contains' in Node.prototype) {
    define(Node.prototype, 'compareDocumentPosition', {
      value: function compareDocumentPosition(node) {
        var point = 0,
          getDocument = function(node) {
            for (var doc = node.parentNode; doc &&
                 doc.nodeType !== Node.DOCUMENT_NODE &&
                 doc.nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
                 doc = doc.parentNode);

            return doc;
          };

        if (this === node) {
          return point;
        }

        if (this.contains(node)) {
          point |= Node.DOCUMENT_POSITION_CONTAINED_BY;
        }

        if (node.contains(this)) {
          point |= Node.DOCUMENT_POSITION_CONTAINS;
        }

        if ((this.sourceIndex === node.sourceIndex) ||
            (this.sourceIndex < 0 || node.sourceIndex < 0) ||
            getDocument(this) !== getDocument(node)) {
          point |= Node.DOCUMENT_POSITION_DISCONNECTED |
            Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
        } else {
          point |= (this.sourceIndex < node.sourceIndex ?
                    Node.DOCUMENT_POSITION_FOLLOWING :
                    Node.DOCUMENT_POSITION_PRECEDING);
        }

        return point;
      }
    });
  }

  // IE8
  if (!('getComputedStyle' in window) &&
    'currentStyle' in Element.prototype) {
    define(window, 'getComputedStyle', {
      value: function(node) {
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          // temporary static only
          var ret = {},
            style = node.style,
            cur = node.currentStyle,
            key;

          for (key in cur) {
            try {
              ret[key] = style[key] || cur[key];
            } catch (e) {}
          }

          ret.cssFloat = ret.styleFloat;
          return ret;
        } else {
          return null;
        }
      }
    });
  }

  // ---
  // IE8
  if (!window.ClientRect && window.TextRectangle &&
      !('width' in window.TextRectangle)) {
    Object.defineProperties(TextRectangle.prototype, {
      width: {
        get: function() {
          return this.right - this.left;
        }
      },
      height: {
        get: function() {
          return this.bottom - this.top;
        }
      }
    });
  }

  if (!('hidden' in element)) {
    // IE8 wtf
    if ('runtimeStyle' in element) {
      define(Element.prototype, 'hidden', {
        get: function() {
          // return this.runtimeStyle.display === 'none';
          return this.hasAttribute('hidden');
        },
        set: function(value) {
          // need test in ie
          /*var style = this.runtimeStyle;

          if (!value && style.display === 'none') {
            style.display = '';
          } else if (value && style.display !== 'none') {
            style.display = 'none';
          }*/
        }
      });
    } else {
      define(Element.prototype, 'hidden', {
        get: function() {
          return this.hasAttribute('hidden');
        },
        set: function(value) {
          if (value) {
            this.setAttribute('hidden', '');
          } else {
            this.removeAttribute('hidden');
          }
        }
      });

      var _hiddenStyleSheet = createElement('style');
      _hiddenStyleSheet.innerHTML = '[hidden] { display: none }';
      head.appendChild(_hiddenStyleSheet);
    }
  }

  if (!('defaultView' in document) && document.parentWindow !== void 0) {
    define(Document.prototype, 'defaultView', {
      get: function() {
        return this.parentWindow;
      }
    });
  }

  

  // ---
  // Copy-pated from X-tags repo by Mozilla
  // http://github.com/mozilla/x-tag
  var prefix = Sync.prefix = (function() {
    var styles = window.getComputedStyle(document.documentElement),
      pre,
      dom;

      try {
        pre = (slice.call(styles).join('')
                .match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1];
      } catch (e) {
        pre = 'ms';
      }

      dom = pre === 'ms' ? pre.toUpperCase() : pre;

    return {
      dom: dom,
      prop: dom.toLowerCase(),
      lowercase: pre,
      css: '-' + pre + '-',
      js: pre[0].toUpperCase() + pre.slice(1)
    };
  })();

  // HTML5

  if (!('matchesSelector' in Element.prototype) &&
      !((prefix.prop + 'MatchesSelector') in Element.prototype) &&
      !('matches' in Element.prototype)) {
    define(Element.prototype, 'matchesSelector', {
      value: document.createElement('output').cloneNode(true).outerHTML === '<:output></:output>' ? function(selector) {
        var frag = document.createDocumentFragment(),
          tmp,
          clone;

        frag.appendChild(frag.createElement(this.tagName));

        tmp = frag.appendChild(frag.createElement('div'));
        clone = tmp.appendChild(frag.createElement(this.tagName));

        clone.mergeAttributes(this);

        tmp = !!tmp.querySelector(selector);
        frag = null;
        clone = null;

        return tmp;
      } : function(selector) {
        var tmp = document.createElement('div'),
          clone = this.cloneNode(false);

        tmp.appendChild(clone);
        tmp = !!tmp.querySelector(selector);

        clone = null;
        return tmp;
      }
    });
  }

  if (!('matches' in Element.prototype)) {
    define(Element.prototype, 'matches', {
      value: function() {
        var key = prefix.prop + 'Matches';

        return (key in this ? this[key] : this[key + 'Selector'] || this.matchesSelector)
          .apply(this, arguments);
      }
    });
  }

  if (!('pageXOffset' in window) || !('pageYOffset' in window)) {
    define(window, 'pageXOffset', {
      get: function() {
        return Math.max(document.body && document.body.scrollLeft || 0,
                        document.documentElement.scrollLeft);
      }
    });

    define(window, 'pageYOffset', {
      get: function() {
        return Math.max(document.body && document.body.scrollTop || 0,
                        document.documentElement.scrollTop);
      }
    });
  }

  if ('insertBefore' in element && 'appendChild' in element) {
    (function() {
      try {
        element.insertBefore(document.createTextNode('test'), null);
      } catch (e) {
        var _originalInsertBefore = element.insertBefore;

        define(Element.prototype, 'insertBefore', {
          value: function(node, child) {
            if (!child) {
              return this.appendChild(node);
            }

            return _originalInsertBefore.call(this, node, child);
          }
        });
      }
    }());
  }

  [
    'prepend',
    'append',
    'replace',
    'before',
    'after',
    'remove'
  ].forEach(function(key) {
    if (key in applyingMutations) {
      var mutation = applyingMutations[key],
        targets = mutation.targets,
        handler = mutation.handler;

      targets.forEach(function(target) {
        target = target.prototype;

        if (!(key in target)) {
          define(target, key, {
            value: handler
          });
        }
      });
    }
  });

  // IE8 hellow
  if (!('cssFloat' in document.documentElement.style) &&
    'styleFloat' in document.documentElement.style &&
    'CSSStyleDeclaration' in window) {
    define(CSSStyleDeclaration.prototype, 'cssFloat', {
      get: function() {
        return this.styleFloat;
      },
      set: function(value) {
        return (this.styleFloat = value);
      }
    });
  }
}(this, document, Sync));(function(window, document, Sync, undefined) {
  "use strict";

  if (!document.addEventListener) return;

  var cache = Sync.cache,
    define = Object.defineProperty,
    hasOwn = Object.prototype.hasOwnProperty,
    events = {
      synced: {},
      natives: {},
      EventTarget: function() {},
      addEvent: function(node, event, params) {
        var callbacks,
          store,
          index,
          capture = params.capture,
          callback = params.callback || params.handler,
          namespace = (params.namespace || '') + '',
          method = params.method;

        if (namespace === events.NAMESPACE_NATIVE && !method) {
          method = natives.addEventListener;
        }

        //if ((node + '').toLowerCase().indexOf('window') !== -1) return;

        callbacks = getCache({
          node: node,
          key: EVENTS_CALLBACKS_INDEX,
          namespace: namespace,
          event: event,
          capture: capture
        });
        
        store = getCache({
          node: node,
          key: EVENTS_HANDLERS_STORE,
          namespace: namespace,
          event: event,
          capture: capture
        });

        index = callbacks.indexOf(callback);

        if (index !== -1) {
          return;
        }

        callbacks.push(callback);
        store.push(params);

        if (method) {
          method.call(node, event, params.handler, !!capture);
        } else {
          node.addEventListener(event, params.handler, !!capture);
        }
      },
      removeEvent: function(node, event, params) {
        var callbacks,
          store,
          index,
          capture = params.capture,
          storeData,
          namespace = (params.namespace || '') + '',
          method = params.method;

        if (namespace === events.NAMESPACE_NATIVE && !method) {
          method = natives.removeEventListener;
        }

        callbacks = getCache({
          node: node,
          key: EVENTS_CALLBACKS_INDEX,
          namespace: namespace,
          event: event,
          capture: capture
        });

        store = getCache({
          node: node,
          key: EVENTS_HANDLERS_STORE,
          namespace: namespace,
          event: event,
          capture: capture
        });

        index = callbacks.indexOf(params.callback);

        if (index === -1 || !(storeData = store[index])) {
          return;
        }

        callbacks.splice(index, 1);
        store.splice(index, 1);

        if (method) {
          method.call(node, event, storeData.handler, capture);
        } else {
          node.removeEventListener(event, storeData.handler, capture);
        }
      },
      removeEventAll: function(node, event, params) {
        var capture = params.capture,
          namespace = (params.namespace || '') + '',
          method = params.method;

        if (namespace === events.NAMESPACE_NATIVE && !method) {
          method = natives.removeEventListener;
        }

        var remove = function(capture) {
          var callbacks,
          store;

          callbacks = getCache({
            node: node,
            key: EVENTS_CALLBACKS_INDEX,
            namespace: namespace,
            event: event,
            capture: capture
          });

          store = getCache({
            node: node,
            key: EVENTS_HANDLERS_STORE,
            namespace: namespace,
            event: event,
            capture: capture
          });

          store.forEach(function(storeData, i) {
            if (method) {
              method.call(node, event, storeData.handler, capture);
            } else {
              node.removeEventListener(event, storeData.handler, capture);
            }
          });

          store.splice(0, store.length);
          callbacks.splice(0, callbacks.length);
        };

        if (capture == null) {
          remove(true);
          remove(false);
        } else {
          remove(capture);
        }
      },
      dispatchEvent: function(node, event, params) {
        var defaultAction = params.defaultAction,
          after = params.after,
          before = params.before,
          inter = window[params.type || 'CustomEvent'];

        event = new inter(event, params.options);

        if (typeof before === 'function') {
          before(event);
        }

        var result = node.dispatchEvent(event);

        if (typeof after === 'function') {
          after(event, result);
        }
        
        if (result && typeof defaultAction === 'function') {
          defaultAction.call(this, event);
        }

        return result;
      },
      cleanEvents: function(node, namespace) {
        if (!namespace || namespace === events.NAMESPACE_INTERNAL ||
          namespace === events.NAMESPACE_NATIVE) return;

        var clean = function(namespace) {
          if (!namespace) return;

          Sync.each(namespace, function(data, event) {
            data.capture.concat(data.bubbling).forEach(function(storeData) {
              node.removeEventListener(event, storeData.handler, storeData.capture);
            });
          });
        },
        store = Sync.cache(node, EVENTS_HANDLERS_STORE);

        delete Sync.cache(node, EVENTS_CALLBACKS_INDEX)[namespace];
        clean(store[namespace]);
        delete store[namespace];
      },
      shadowEventAddition: function(event, fn) {
        var resultSynced;

        events.syncEvent(event, function(synced) {
          resultSynced = synced;

          return {
            addEventListener: function(type, callback, capture) {
              events.addEvent(this, type, {
                handler: function(e) {
                  fn.call(this, e);
                  callback.call(this, e);
                },
                callback: callback,
                capture: capture,
                method: synced.addEventListener
              });
            },
            removeEventListener: function(type, callback, capture) {
              events.removeEvent(this, type, {
                callback: callback,
                capture: capture,
                method: synced.removeEventListener
              });
            }
          };
        });
      },
      syncEvent: function(event, handle) {
        var lastSynced = hasOwn.call(events.synced, event) ?
          events.synced[event] : natives;

        var newSynced = handle(lastSynced);

        if (!newSynced.addEventListener) {
          newSynced.addEventListener = lastSynced.addEventListener;
        }

        if (!newSynced.removeEventListener) {
          newSynced.removeEventListener = lastSynced.removeEventListener;
        }

        events.synced[event] = newSynced;
      },
      handleOnce: function(obj, key, fn) {
        var cached = Sync.cache(obj, HANDLE_ONCE_STORE_KEY),
          listeners = cached[key] | 0;

        // console.log('handleOnceCache:', listeners);

        if (!listeners) {
          fn.call(obj);
        }

        cached[key] = ++listeners;
      },
      handleIfLast: function(obj, key, fn) {
        var cached = Sync.cache(obj, HANDLE_ONCE_STORE_KEY),
          listeners = cached[key] | 0;

        if (listeners) {
          cached[key] = --listeners;

          if (!listeners) {
            fn.call(obj);
          }
        }
      },
      shadowEventProp: function(e, key, val) {
        try {
          e[key] = val;
        } catch (err) {};
        
        if (e[key] !== val) {
          // try to change property if configurable
          // in Chrome should change getter instead of value
          try {
            Object.defineProperty(e, key, {
              get: function() {
                return val;
              }
            });
          } catch (err) {
            var protoEvent = e;

            e = Object.create(e/*, {
              [key]: {
                value: val
              }
            }*/);

            Object.defineProperty(e, key, {
              value: val
            });

            [
              'preventDefault',
              'stopPropagation',
              'stopImmediatePropagation'
            ].forEach(function(key) {
              e[key] = function() {
                protoEvent[key]()
              };
            });
          }
        }

        return e;
      },
      NAMESPACE_INTERNAL: 'internal',
      NAMESPACE_NATIVE: 'native'
    },
    natives = events.natives,
    commonDOMET = !hasOwn.call(HTMLDivElement.prototype, 'addEventListener'),
    ETOwnBuggy = false,
    ETList = ['EventTarget', 'Node', 'Element', 'HTMLElement'],
    hasTouch = 'ontouchstart' in document;
 
  var EVENTS_CALLBACKS_INDEX = 'events_callbacks_index',
    EVENTS_HANDLERS_STORE = 'events_handlers_store',
    EVENT_TARGET_COMPUTED_STYLE = 'event_computed_style',
    HANDLE_ONCE_STORE_KEY = 'handle_once_store';

  var getCache = function(params) {
    var data = Sync.cache(params.node, params.key),
      event = params.event,
      namespace = params.namespace || events.NAMESPACE_INTERNAL;

    if (typeof namespace !== 'string') {
      return null;
    }

    data = data.hasOwnProperty(namespace) ? data[namespace]  : (data[namespace] = {});

    data = data.hasOwnProperty(event) ? data[event] : (data[event] = {
      capture: [],
      bubbling: []
    });

    return params.capture ? data.capture : data.bubbling;
  },
  getDOMET = function(method) {
    var result;
  
    ETList.some(function(inter) {
      var desc;

      inter = window[inter];
  
      if (inter && (desc = Object.getOwnPropertyDescriptor(inter.prototype, method))) {
        result = {
          inter: inter,
          desc: desc
        };
  
        return true;
      }
    });
  
    return result;
  },
  setDOMET = function(method, value, desc) {
    if (!commonDOMET) {
      return setSeparateDOMET(method, value, desc);
    }

    ETList.forEach(function(inter) {
      inter = window[inter];
      inter && (inter = inter.prototype);
    
      if (inter) {
        var localDesc = desc || Object.getOwnPropertyDescriptor(inter, method);

        Object.defineProperty(inter, method, {
          value: value,
          writable: localDesc.writable,
          configurable: localDesc.configurable,
          enumerable: localDesc.enumerable
        });
      }
    });
  },
  setSeparateDOMET = function(method, value, desc) {
    var tags = ["Link","Html","Body","Div","Form","Input","Image","Script","Head","Anchor","Style","Time","Option","Object","Output","Canvas","Select","UList","Meta","Base","DataList","Directory","Meter","Source","Button","Label","TableCol","Title","Media","Audio","Applet","TableCell","MenuItem","Legend","OList","TextArea","Quote","Menu","Unknown","BR","Progress","LI","FieldSet","Heading","Table","TableCaption","Span","FrameSet","Font","Frame","TableSection","OptGroup","Pre","Video","Mod","TableRow","Area","Data","Param","Template","IFrame","Map","DList","Paragraph","Embed","HR"];

    tags.forEach(function(tag) {
      tag = window['HTML' + tag + 'Element'];
      tag && (tag = tag.prototype);

      if (!tag) return;

      var localDesc = desc || Object.getOwnPropertyDescriptor(tag, method);

      Object.defineProperty(tag, method, {
        value: value,
        writable: localDesc.writable,
        configurable: localDesc.configurable,
        enumerable: localDesc.enumerable
      });
    });
  },
  getETCustom = function(_interface, method) {
    var desc;

    _interface = window[_interface];
    
    desc = _interface &&
      (desc = Object.getOwnPropertyDescriptor(_interface.prototype, method));

    return {
      inter: _interface,
      desc: desc
    };
  },
  setETCustom = function(_interface, method, value, desc) {
    _interface = window[_interface];
    _interface && (_interface = _interface.prototype);
    
    if (!_interface) return;

    desc || (desc = Object.getOwnPropertyDescriptor(_interface, method));

    Object.defineProperty(_interface, method, {
      value: value,
      writable: desc.writable,
      configurable: desc.configurable,
      enumerable: desc.enumerable
    });
  },
  setET = function(_interface, prop, value, desc) {
    if (_interface.toUpperCase() === 'DOM') {
      setDOMET(prop, value, desc);
    } else {
      setETCustom(_interface, prop, value, desc);
    }
  },
  getET = function(_interface, prop) {
    if (_interface.toUpperCase() === 'DOM') {
      return getDOMET(prop);
    } else {
      return getETCustom(_interface, prop);
    }
  };

  window.EventTarget && (function() {
    var add = EventTarget.prototype.addEventListener,
      remove = EventTarget.prototype.removeEventListener,
      handler = function() {};

    try {
      add.call(document, 'ettest', handler, false);
      remove.call(document, 'ettest', handler, false);
    } catch (e) {
      ETOwnBuggy = true;
      ETList.push(ETList.shift());
    }
  }());


  // fix disabled elements
  (function() {
    var disabled = (function() {
      var button = document.createElement('button'),
        fieldset,
        handlesEvents,
        handlesEventsWrapped,
        html = document.documentElement,
        e;
  
      var TEST_EVENT_NAME = 'test';
  
      var eventHandler = function() {
        handlesEvents = true;
      },
      wrappedEventHandler = function() {
        handlesEventsWrapped = true;
      };
  
      button.disabled = true;
      html.appendChild(button);
  
      button.addEventListener(TEST_EVENT_NAME, eventHandler, false);
  
      e = document.createEvent('CustomEvent');
      e.initEvent(TEST_EVENT_NAME, false, false);
      button.dispatchEvent(e);
      button.removeEventListener(TEST_EVENT_NAME, eventHandler, false);
  
      if (!handlesEvents) {
        fieldset = document.createElement('fieldset');
        fieldset.disabled = true;
        fieldset.appendChild(button);
        html.appendChild(fieldset);
  
        button.disabled = false;
        button.addEventListener(TEST_EVENT_NAME, wrappedEventHandler, false);
  
        e = document.createEvent('CustomEvent');
        e.initCustomEvent(TEST_EVENT_NAME, false, false, 1);
        button.dispatchEvent(e);
        button.removeEventListener(TEST_EVENT_NAME, wrappedEventHandler, false);
  
        html.removeChild(fieldset);
      } else {
        html.removeChild(button);
        handlesEventsWrapped = true;
      }
  
      return {
        handlesEvents: handlesEvents,
        handlesEventsWrapped: handlesEventsWrapped
      };
    }());

    if (disabled.handlesEvents) return;
  
    var native = getDOMET('dispatchEvent'),
      nativeDispatch = native.desc,
      blockedEvents = {
        click: 1
      };
  
    var dispatchEvent = function(event) {
      var node = this,
        disabledDesc,
        disabledChanged,
        disabledChangedVal = true,
        disabledFix,
        result;
  
      if (!node.disabled ||
        (event && event.type && blockedEvents.hasOwnProperty(event.type))) {
        return nativeDispatch.value.call(this, event);
      }
  
      try {
        disabledDesc = Object.getOwnPropertyDescriptor(
            // Firefox
            Object.getPrototypeOf(node),
            'disabled'
            // IE
          ) || Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'disabled');
      } catch (e) {
        // old firefox with XPC problems
        if (e.code === 0x8057000C ||
            e.result === 0x8057000C) {
          disabledDesc = {
            enumerable: false,
            configurable: true
          };
        }
      }
  
      if (disabledDesc && /*disabledDesc.set && disabledDesc.get &&*/
          !Object.getOwnPropertyDescriptor(node, 'disabled')) {
        disabledFix = true;
        node.disabled = false;
        console.log('used fix');
        // force update disabled property, wtf
        node.offsetWidth;

        Object.defineProperty(node, 'disabled', {
          enumerable: disabledDesc.enumerable,
          configurable: disabledDesc.configurable,
          set: function(val) {
            disabledChanged = true;
            disabledChangedVal = !!val;
          },
          get: function() {
            return disabledChangedVal;
          }
        });
      }
     
      result = nativeDispatch.value.apply(this, arguments);
     
      if (disabledFix) {
        delete node.disabled;
        node.disabled = disabledChanged ? disabledChangedVal : true;
      }
  
      return result;
    };

    setDOMET('dispatchEvent', dispatchEvent, nativeDispatch);
  
    /*Object.defineProperty(native.inter.prototype, 'dispatchEvent', {
      value: dispatchEvent,
      writable: nativeDispatch.writable,
      configurable: nativeDispatch.configurable,
      enumerable: nativeDispatch.enumerable
    });*/
  
    if (disabled.handlesEventsWrapped) return;
  
    // Here should be fix for elements wrapped with some others disabled elements
    // <fieldset disabled>
    //   <button disabled></button>
    // </fieldset>
  }());
  
  // fix stopImmediatePropagation
  if (window.Event &&
    !('stopImmediatePropagation' in Event.prototype)) (function() {
    var stopDesc = Object.getOwnPropertyDescriptor(Event.prototype, 'stopPropagation');

    var SIP_FIX_KEY = 'events_sip_fix_key',
      SIP_FIX_KEY_INDEX = 'events_sip_fix_key_index';

    define(Event.prototype, 'stopImmediatePropagation', {
      value: function() {
        if (this._ignoreListeners) return;

        define(this, '_ignoreListeners', {
          value: true,
          writable: false,
          enumerable: false,
          configurable: false
        });
      },
      writable: stopDesc.writable,
      enumerable: stopDesc.enumerable,
      configurable: stopDesc.configurable
    });

    ['DOM', 'XMLHttpRequest'].forEach(function(_interface) {
      var addDesc = getET(_interface, 'addEventListener').desc,
        rmDesc = getET(_interface, 'removeEventListener').desc;

      setET('addEventListener', function(event, listener, capture) {
        var cached = cache(this),
          store = cached[SIP_FIX_KEY] || (cached[SIP_FIX_KEY] = {}),
          index = cached[SIP_FIX_KEY_INDEX] || (cached[SIP_FIX_KEY_INDEX] = {}),
          indexed,
          stored;

        capture = !!capture;

        store = store[event] || (store[event] = []);
        index = index[event] || (index[event] = []);

        if ((indexed = index.indexOf(listener)) !== -1) {
          stored = store[indexed];

          if (hasOwn.call(stored, capture)) {
            return addDesc.value.call(this, event, listener, capture);
          }
        } else {
          stored = {};
          indexed = index.push(listener) - 1;
          store.push(stored);
        }

        var wrap = function(e) {
          if (e._ignoreListeners) return;
          listener.call(this, e);
        };

        stored[capture] = wrap;
        return addDesc.value.call(this, event, wrap, capture);
      }, addDesc);

      setET('removeEventListener', function(event, listener, capture) {
        var cached = cache(this),
          store = cached[SIP_FIX_KEY] || (cached[SIP_FIX_KEY] = {}),
          index = cached[SIP_FIX_KEY_INDEX] || (cached[SIP_FIX_KEY_INDEX] = {}),
          indexed,
          stored;

        capture = !!capture;

        store = store[event] || (store[event] = []);
        index = index[event] || (index[event] = []);

        if ((indexed = index.indexOf(listener)) !== -1) {
          stored = store[indexed];

          if (hasOwn.call(stored, capture)) {
            if (!hasOwn.call(stored, !capture)) {
              index.splice(indexed, 1);
              store.splice(indexed, 1);
            }

            listener = stored[capture];
            delete stored[capture];
          }
        }

        return rmDesc.value.call(this, event, listener, capture);
      }, rmDesc);
    });
  }());

  (function() {
    try {
      document.createEvent('CustomEvent');
    } catch (e) {
      var _createEvent = document.createEvent;
      document.createEvent = function(event) {
        if (event === 'CustomEvent') {
          var e = _createEvent.call(this, 'Event');
          e.initCustomEvent = function(type, bubbles, cancelable, detail) {
            e.initEvent(type, bubbles, cancelable);
            e.detail = detail;
          };

          return e;
        }

        return _createEvent.call(this, event);
      };
    }
  }());

  Sync.each({
    'Event': [
      'bubbles',
      'cancelable'
    ],
    'CustomEvent': [
      'bubbles',
      'cancelable',
      'detail'
    ],
    'UIEvent': [
      'bubbles',
      'cancelable',
      'view',
      'detail'
    ],
    'MouseEvent': [
      'bubbles',
      'cancelable',
      'view',
      'detail',
      'screenX',
      'screenY',
      'clientX',
      'clientY',
      'ctrlKey',
      'altKey',
      'shiftKey',
      'metaKey',
      'button',
      'relatedTarget'
    ]
  }, function(params, event) {
    try {
      new window[event]('test', {});
    } catch (e) {
      window[event] && (window['_' + event] = window[event]);
      window[event] = function(type, dict) {
        var init,
        e = document.createEvent(event);

        init = params.map(function(prop) {
          return dict ? dict[prop] : null;
        });

        init.unshift(type);
        e['init' + event].apply(e, init);

        return e;
      };
    }
  });

  (function() {
    var _mouseClick = new MouseEvent('click');

    if ([
      MouseEvent.prototype,
      _mouseClick
    ].every(function(target) {
      if (!('layerX' in target)) return true;
    })) {
      ['X', 'Y'].forEach(function(axis) {
        define(MouseEvent.prototype, 'layer' + axis, {
          get: function() {
            var computed = Sync.cache(this);

            computed = computed[EVENT_TARGET_COMPUTED_STYLE] ||
              (computed[EVENT_TARGET_COMPUTED_STYLE] =
                window.getComputedStyle(this.target));

            if (computed.position === 'static') {
              return this['offset' + axis] +
                this.target['offset' + (axis === 'X' ? 'Left' : 'Top')];
            } else {
              return this['offset' + axis];
            }
          }
        });
      });
    }

    if ([
      MouseEvent.prototype,
      _mouseClick
    ].every(function(target) {
      if (!('offsetX' in target)) return true;
    })) {
      ['X', 'Y'].forEach(function(axis) {
        define(MouseEvent.prototype, 'offset' + axis, {
          get: function() {
            var computed = Sync.cache(this);

            computed = computed[EVENT_TARGET_COMPUTED_STYLE] ||
              (computed[EVENT_TARGET_COMPUTED_STYLE] =
                window.getComputedStyle(this.target));

            if (computed.position === 'static') {
              return this['layer' + axis] -
                this.target['offset' + (axis === 'X' ? 'Left' : 'Top')];
            } else {
              return this['layer' + axis];
            }
          }
        });
      });
    }
  }());

  [
    'addEventListener',
    'removeEventListener',
    'dispatchEvent'
  ].forEach(function(method) {
    var native = getDOMET(method);

    if (!native || !native.desc) return;

    natives[method] = native.desc.value;

    setDOMET(method, function(arg1, arg2, arg3) {
      var hook,
        type;

      if (typeof arg1 === 'object') {
        type =  arg1.type;
      } else {
        type = arg1;
      }

      if (type && events.synced.hasOwnProperty(type) &&
          (hook = events.synced[type]) && (hook = hook[method])) {
        if (typeof hook === 'string') {
          arg1 = hook;
        } else {
          return hook.call(this, arg1, arg2, arg3);
        }
      }

      return natives[method].call(this, arg1, arg2, arg3);
    }, native.desc);
  });

  // fix mouseenter/leave if they are not exist
  // or shadow them on devices with touch because
  // native enter/leave are broken in Chrome ...
  // ... and we cannot detect that
  bindEnterLeave: if (!('onmouseenter' in document.createElement('div')) || hasTouch) {
    // break bindEnterLeave;

    Sync.each({
      mouseenter: 'mouseover',
      mouseleave: 'mouseout'
    }, function(event, hook) {
      var hookKey = 'hook_' + event + '_' + hook,
        originalEventKeyHook = 'hook_' + event,
        originalHookKeyHook = 'hook_' + hook,
        eventSynched,
        hookEvents = {
          add: function(event) {
            events.handleOnce(document, hookKey, function() {
              // console.log('handleOnce', hookKey, document);

              events.addEvent(document, event, {
                handler: function(e) {
                  var target = e.target,
                    relatedTarget = e.relatedTarget;

                  events.dispatchEvent(target, originalEventKeyHook, {
                    type: 'MouseEvent',
                    options: e
                  });

                  if (!relatedTarget || (target !== relatedTarget &&
                       !target.contains(relatedTarget))) {
                    events.dispatchEvent(target, originalHookKeyHook, {
                      type: 'MouseEvent',
                      options: Sync.extend({}, e, {
                        bubbles: false,
                        cancelable: false
                      })
                    });
                  }
                },
                // index
                callback: hookEvents,
                capture: true,
                method: eventSynched.addEventListener
              });
            });
          },
          remove: function(event) {
            events.handleIfLast(document, hookKey, function() {
              events.removeEvent(document, event, {
                // index
                callback: hookEvents,
                capture: true,
                method: eventSynched.removeEventListener
              });
            });
          }
        };

      // mouseover / mouseout
      events.syncEvent(event, function(synced) {
        eventSynched = synced;

        return {
          addEventListener: function(event, callback, capture) {
            events.addEvent(this, originalEventKeyHook, {
              handler: function(e) {
                e = events.shadowEventProp(e, 'type', event);
                callback.call(this, e);
              },
              callback: callback,
              capture: capture
            });

            hookEvents.add(event);
          },
          removeEventListener: function(event, callback, capture) {
            events.removeEvent(this, originalEventKeyHook, {
              callback: callback,
              capture: capture
            });

            hookEvents.remove(event);
          }
        };
      });

      // mouseenter / mouseleave
      events.syncEvent(hook, function(synced) {
        return {
          addEventListener: function(hook, callback, capture) {
            events.addEvent(this, originalHookKeyHook, {
              handler: function(e) {
                e = events.shadowEventProp(e, 'type', event);
                callback.call(this, e);
              },
              callback: callback,
              capture: capture
            });

            hookEvents.add(event);
          },
          removeEventListener: function(hook, callback, capture) {
            events.removeEvent(this, originalHookKeyHook, {
              callback: callback,
              capture: capture
            });

            hookEvents.remove(event);
          }
        }
      });
    });
  }

  events.syncEvent('input', function(synced) {
    var bindKeyPress = function(hook, callback, capture) {
      var self = this,
        handler = function(e) {
          events.dispatchEvent(this, hook, {
            type: 'Event',
            options: {
              bubbles: false,
              cancelable: false
            }
          });
        };

      events.addEvent(self, 'contextmenu', {
        handler: function() {
          var handleMove = function() {
            self.removeEventListener('mousemove', handleMove, true);
            document.removeEventListener('mousemove', handleMove, true);

            handler();
          };

          self.addEventListener('mousemove', handleMove, true);
          document.addEventListener('mousemove', handleMove, true);
        },
        callback: callback,
        capture: true
      });

      keypressBindings.forEach(function(event) {
        events.addEvent(self, event, {
          handler: handler,
          callback: callback,
          capture: capture
        });
      });
    },
    unbindKeyPress = function(hook, callback, capture){
      var self = this;

      events.removeEvent(self, 'contextmenu', {
        callback: callback,
        capture: true
      });

      keypressBindings.forEach(function(event) {
        events.removeEvent(self, event, {
          callback: callback,
          capture: capture
        });
      });
    },
    keypressBindings = [
      'keydown',
      'cut',
      'paste',
      'copy'
    ],
    bindKey = 'hook_oninput',
    bindIndex = function() {};

    return {
      addEventListener: function(type, callback, capture) {
        var self = this;

        if (window.TextEvent && ((this.attachEvent && this.addEventListener) ||
            (this.nodeName.toLowerCase() === 'textarea' && !('oninput' in this))) ||
            (!'oninput' in this || !this.addEventListener)) {
          events.handleOnce(this, bindKey, function() {
            bindKeyPress.call(this, type, bindIndex, capture);
          });
        }

        synced.addEventListener.call(this, type, callback, capture);
      },
      removeEventListener: function(type, callback, capture) {
        events.handleIfLast(this, bindKey, function() {
          unbindKeyPress.call(this, type, bindIndex, capture);
        });

        synced.removeEventListener.call(this, type, callback, capture);
      }
    }
  });

  Sync.events = events;
}(this, this.document, Sync));;(function(Sync) {
  var navigator = window.navigator,
    pointers = {};
  
  Sync.pointers = pointers;

  if (window.PointerEvent) return;

  var events = Sync.events,
    natives = events.natives,
    hasOwn = Object.prototype.hasOwnProperty,
    slice = Array.prototype.slice,
    pow = Math.pow,
    activePointers = {},
    uidInc = 0,
    hasTouch = 'ontouchstart' in document,
    ua = navigator.userAgent.toLowerCase(),
    isV8 = !!(window.v8Intl || (window.Intl && Intl.v8BreakIterator)),
    isChrome = !!window.chrome,
    // need to check chrome not by UserAgent
    // chrome for android has not plugins and extensions
    // but on desktop plugins also might be disabled
    // so we need to check by the ability to install extensions
    isAndroid = ua.indexOf('android') !== -1 ||
      // detect for v8 to determine that this is not a iOS 
      isChrome && (!chrome.webstore/* || !chrome.app*/) && isV8,
    isIOS = !isAndroid && /iP(ad|hone|od)/i.test(navigator.userAgent),
    isIOSBadTarget = isIOS && (/OS ([6-9]|\d{2})_\d/).test(navigator.userAgent);

  /*console.log(JSON.stringify({
    isV8: isV8,
    isAndroid: isAndroid,
    isChrome: isChrome
  }));*/

  var FAKE_PREFIX = 'fake_',
    MOUSE_PREFIX = 'mouse',
    POINTER_PREFIX = 'pointer',
    TOUCH_PREFIX = 'touch',
    NS_MOUSE_POINTER = 'mouse_pointer',
    NS_TOUCH_POINTER = 'touch_pointer',
    DEVICE_LISTENERS_KEY = 'device_listeners_key',
    POINTER_DEFAULTS = {
      pointerId: 0,
      width: 0,
      height: 0,
      pressure: 0,
      tiltX: 0,
      tiltY: 0,
      pointerType: '',
      isPrimary: false
    },
    MOUSE_EVENT_INIT = {
      bubbles: false,
      cancelable: false,
      view: null,
      detail: 0,
      screenX: 0,
      screenY: 0,
      clientX: 0,
      clientY: 0,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      button: 0,
      buttons: 0,
      relatedTarget: null
    },
    POINTER_FIELDS = Object.keys(POINTER_DEFAULTS);

  [
    'down',
    'up',
    'move',
    'over',
    'out',
    'enter',
    'leave',
    'cancel'
  ].forEach(function(event) {
    var full = POINTER_PREFIX + event;

    events.syncEvent(full, function(synced) {
      return {
        addEventListener: function(type, callback, capture) {
          triggerDeviceListeners(this, event/*, capture*/);

          events.addEvent(this, full, {
            handler: callback,
            callback: callback,
            capture: capture,
            method: synced.addEventListener
          });
        },
        removeEventListener: function(type, callback, capture) {
          muteDeviceListeners(this, event/*, capture*/);

          events.addEvent(this, full, {
            callback: callback,
            capture: capture,
            method: synced.removeEventListener
          });
        }
      }
    });
  });

  // MSPointer type

  if (window.MSPointerEvent) return (function() {
    var msBindings = {
      down: function() {},
      up: function() {},
      move: function() {},
      over: function() {},
      out: function() {},
      enter: function() {},
      leave: function() {},
      cancel: function() {}
    }, msDevices = {};

    window.PointerEvent = function(type, options) {
      var event = document.createEvent('MSPointerEvent');

      event.initPointerEvent(
        type,
        options.bubbles,
        options.cancelable,
        options.view,
        options.detail,
        options.screenX,
        options.screenY,
        options.clientX,
        options.clientY,
        options.ctrlKey,
        options.altKey,
        options.shiftKey,
        options.metaKey,
        options.button,
        options.relatedTarget,
        options.offsetX,
        options.offsetY,
        options.width,
        options.height,
        options.pressure,
        options.rotation,
        options.tiltX,
        options.tiltY,
        options.pointerId,
        options.pointerType,
        options.hwTimestamp,
        options.isPrimary
      );

      return event;
    };

    triggerDeviceListeners = function(node, event) {

    };

    muteDeviceListeners = function(node, event) {

    };
  }());

  var devices = {};
  
  var triggerDeviceListeners = function(node, event,/* capture,*/ deviceType) {
    // if (!devices.length) return;

    Object.keys(devices).forEach(function(device) {
      if (deviceType && deviceType !== device) return;

      var type = DEVICE_LISTENERS_KEY + device + event;

      device = devices[device];

      Sync.events.handleOnce(node, type, function() {
        device.bindListener(node, event/*, capture*/);
      });

      /*var cached = Sync.cache(node, DEVICE_LISTENERS_KEY),
        type = device.type + event,
        listeners = cached[type] | 0;

      if (!listeners) {
        device.bindListener(node, event, capture);
      }

      cached[type] = ++listeners;*/
    });
  },
  muteDeviceListeners = function(node, event,/* capture,*/ deviceType) {
    // if (!devices.length) return;

    Object.keys(devices).forEach(function(device) {
      if (deviceType && deviceType !== device) return;

      var type = DEVICE_LISTENERS_KEY + device + event;

      device = devices[device];

      Sync.events.handleIfLast(node, type, function() {
        device.unbindListener(node, event/*, capture*/);
      });

      /*var cached = Sync.cache(node, DEVICE_LISTENERS_KEY),
        type = device.type + event,
        listeners = cached[type] | 0;

      if (listeners) {
        cached[type] = --listeners;

        if (!listeners) {
          device.unbindListener(node, event, capture);
        }
      }*/
    });
  },
  shadowEventType = function(e, type) {
    try {
      e.type = type;
    } catch (err) {};
    
    if (e.type !== type) {
      // try to change property if configurable
      // in Chrome should change getter instead of value
      try {
        Object.defineProperty(e, 'type', {
          get: function() {
            return type;
          }
        });
      } catch (err) {
        var protoEvent = e;

        e = Object.create(e, {
          type: {
            value: type
          }
        });

        [
          'preventDefault',
          'stopPropagation',
          'stopImmediatePropagation'
        ].forEach(function(key) {
          e[key] = function() {
            protoEvent[key]()
          };
        });
      }
    }

    return e;
  },
  syncEvent = function(deviceNatives, full, event, device) {
    events.syncEvent(full, function(synced) {
      deviceNatives[full] = synced;

      return {
        addEventListener: function(type, callback, capture) {
          if (event && device) {
            triggerDeviceListeners(this, event,/* capture,*/ device);
          }

          events.addEvent(this, FAKE_PREFIX + full, {
            handler: function(e) {
              // e = Sync.extend({}, e);
              e = shadowEventType(e, type);

              // console.log('type: ' + e.type);
              callback.call(this, e);
            },
            callback: callback,
            capture: capture,
            method: synced.addEventListener
          });
        },
        removeEventListener: function(type, callback, capture) {
          if (event && device) {
            muteDeviceListeners(this, event,/* capture,*/ device);
          }

          events.addEvent(this, FAKE_PREFIX + full, {
            callback: callback,
            capture: capture,
            method: synced.removeEventListener
          });
        }
      }
    });
  },
  debunce = function(fn, time, callFirst) {
    var lastCall;

    return function(arg) {
      var needCall;

      if (!lastCall && callFirst !== false) {
        needCall = true;
      }

      if (lastCall) {
        var now = Date.now();

        if (now - lastCall > time) {
          needCall = true;
        }
      }

      lastCall = Date.now();

      if (needCall) {
        var len = arguments.length;

        if (len <= 1) {
          return fn.call(this, arg);
        } else {
          return fn.apply(this, arguments);
        }
      }
    };
  };

  window.PointerEvent = function(type, options) {
    var event = new window.MouseEvent(type, options);

    POINTER_FIELDS.forEach(function(field) {
      if (!hasOwn.call(event, field)) {
        event[field] = hasOwn.call(options, field) ?
          options[field] : POINTER_DEFAULTS[field];
      }
    });

    return event;
  };

  pointers.getDevice = function(type) {
    return devices[type] || null;
  };

  pointers.Device = function(type) {
    this.type = type;
    this.pointers = [];
    this.counter = 0;

    // spec is not clear about canceling all device or pointer
    // it says:
    // cancel all events of type;
    // so that is a device
    this.mouseEventsPrevented = false;

    if (hasOwn.call(devices, type)) throw new Error();

    devices[type] = this;
  };

  pointers.Device.prototype = {
    createPointer: function() {
      var pointer = new pointers.Pointer(this);

      return pointer;
    },
    getNextId: function() {
      if (this.counter >= Number.MAX_VALUE) {
        return (this.counter = 0);
      }

      return this.counter++;
    },
    isPrimaryPointer: function(pointer) {
      return this.pointers[0] === pointer;
    },
    addPointer: function(pointer) {
      this.pointers.push(pointer);
    },
    removePointer: function(pointer) {
      var devicePointers = this.pointers,
        index = devicePointers.indexOf(pointer);

      if (index !== -1) {
        devicePointers.splice(index, 1);
      }
    },
    get primary() {
      return this.pointers[0] || null;
    }
  };

  pointers.Pointer = function(device) {
    this.device = device;
    this.id = device.getNextId();
    this.type = device.type;
    this.buttons = 0;

    device.addPointer(this);
  };

  pointers.Pointer.prototype = {
    get isPrimary() {
      return this.device.isPrimaryPointer(this);
    },
    get button() {
      var buttons = this.buttons,
        lastButtons = this._lastButtons,
        lastButton = this._lastButton,
        button;

      if (lastButtons === buttons) {
        return lastButton;
      }

      if (!buttons) {
        button = -1;
      } else if (buttons === 4) {
        button = 1;
      } else if (buttons === 2) {
        button = 2;
      } else {
        button = Math.log(buttons) / Math.log(2);
      }

      this._lastButton = button;
      this._lastButtons = buttons;

      return button;
    },
    destroy: function() {
      this.device.removePointer(this);
    },
    initEventDict: function(options) {
      var dict,
        buttons = this.buttons,
        button = this.button;

      options || (options = {});

      dict = {
        pointerId: this.id,
        pointerType: this.type,
        isPrimary: this.isPrimary,
        buttons: buttons,
        button: button
      };

      // options
      [
        'width',
        'height',
        'pressure',
        'tiltX',
        'tiltY',
        'cancelable',
        'bubbles'
      ].forEach(function(key) {
        if (key in options) {
          dict[key] = options[key]
        } else if (hasOwn.call(POINTER_DEFAULTS, key)) {
          dict[key] = POINTER_DEFAULTS[key]
        }
      });

      return dict;
    },
    dispatchEvent: function(node, event, mouseEventDict, options) {
      // Object.keys is not the keys there
      // properties of event are stored in the prototype
      // Sync.extend is backed by the Object.keys
      // so we use the for in loop instead
      // var dict = Sync.extend({}, mouseEventDict, this.initEventDict());
      // delete dict.type;

      var dict = {};

      Object.keys(MOUSE_EVENT_INIT).forEach(function(prop) {
        if (hasOwn.call(mouseEventDict, prop)) {
          dict[prop] = mouseEventDict[prop];
        }
      });

      if (!dict.view) {
        dict.view = node.defaultView;
      }

      // console.log(Sync.extend({}, options));
      options = this.initEventDict(options);

      Sync.extend(dict, options);

      return events.dispatchEvent(node, POINTER_PREFIX + event, {
        type: 'PointerEvent',
        options: dict
      });
    }
  };

  // ###################

  var needFastClick = (function() {
    if (!isAndroid || !window.chrome) return true;

    var metaViewport = document.querySelector('meta[name="viewport"]');

    if (metaViewport) {
      // Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
      if (metaViewport.content.toLowerCase().indexOf('user-scalable=no') !== -1) {
        return false;
      }
      // Chrome 32 and above with width=device-width or less don't need FastClick
      if (chromeVersion > 31 && window.innerWidth <= window.screen.width) {
        return false;
      }
    }
  }());

  // mouse type

  (function() {
    var mouseDevice = new pointers.Device('mouse'),
      mousePointer = mouseDevice.createPointer(),
      mouseNatives = {},
      mouseBindings = {
        down: function(e, type, event) {
          var pointerFire = !mousePointer.buttons;

          if ('buttons' in e) {
            mousePointer.buttons = e.buttons;
          } else {
            // hook MouseEvent buttons to pointer buttons here
            mousePointer.buttons += pow(2, e.button);
          }

          if (pointerFire) {
            // fire pointer down here
            
            var canceled = !mousePointer.dispatchEvent(
              e.target, type, e, {
                bubbles: true,
                cancelable: true
              });

            if (canceled) {
              mouseDevice.mouseEventsPrevented = true;
              e.preventDefault();
              return;
            }
          }

          var canceled = !events.dispatchEvent(e.target, FAKE_PREFIX + event, {
            type: 'MouseEvent',
            options: e
          });

          if (canceled) {
            e.preventDefault();
          }
        },
        up: function(e, type, event) {
          if (!mousePointer.buttons) return;

          if ('buttons' in e) {
            mousePointer.buttons = e.buttons;
          } else {
            // hook MouseEvent buttons to pointer buttons here
            // console.log(mousePointer.buttons, Math.pow(2, e.button))
            mousePointer.buttons -= Math.pow(2, e.button);
          }

          if (!mousePointer.buttons) {
            // fire pointer up here
            var canceled = !mousePointer
              .dispatchEvent(e.target, type, e, {
                bubbles: true,
                cancelable: true
              });
          }

          if (!mouseDevice.mouseEventsPrevented) {
            var canceled = !events.dispatchEvent(e.target, FAKE_PREFIX + event, {
              type: 'MouseEvent',
              options: e
            });
          }

          if (canceled) {
            e.preventDefault();
          }

          mouseDevice.mouseEventsPrevented = false;
        },
        cancel: function(e, type, event) {
          var canceled = !events.dispatchEvent(e.target, FAKE_PREFIX + event, {
            type: 'MouseEvent',
            options: e
          });

          if (canceled) {
            e.preventDefault();
            return;
          }

          mousePointer.dispatchEvent(e.target, type, e, {
            bubbles: true,
            cancelable: false
          });

          mousePointer.buttons = 0;
          mouseDevice.mouseEventsPrevented = false;
        },
        move: function(e, type, event) {
          var canceled = !mousePointer
            .dispatchEvent(e.target, type, e, {
              bubbles: true,
              cancelable: true
            });

          if (!mouseDevice.mouseEventsPrevented) {
            var canceled = !events.dispatchEvent(e.target, FAKE_PREFIX + event, {
              type: 'MouseEvent',
              options: e
            });
          }

          if (canceled) {
            e.preventDefault();
          }
        }
      };

    ['over', 'out', 'enter', 'leave'].forEach(function(type) {
      mouseBindings[type] = function(e, type, event) {
        var option = type === 'over' || type === 'out';

        var canceled = !mousePointer.dispatchEvent(
          e.target, type, e, {
            bubbles: option,
            cancelable: option
          });

        canceled || (canceled = !events.dispatchEvent(e.target, FAKE_PREFIX + event, {
          type: 'MouseEvent',
          options: e
        }));

        if (canceled) {
          e.preventDefault();
        }
      }
    });

    mouseDevice.bindListener = function(node, event/*, capture*/) {
      if (isIOS && hasTouch) return;

      var type = MOUSE_PREFIX + event,
        callback = mouseBindings[event];

      if (event === 'cancel') {
        type = 'contextmenu';
      }

      events.addEvent(node, type, {
        handler: function(e) {
          e.stopPropagation();
          e.stopImmediatePropagation();

          // console.log(event, type);

          var isCompatibility = checkForCompatibility(this, e, event, type);

          if (!isCompatibility) {
            callback.call(this, e, event, type);
          }
        },
        callback: callback,
        capture: /*capture*/ true,
        method: mouseNatives[type].addEventListener,
        namespace: NS_MOUSE_POINTER
      });
    };

    mouseDevice.unbindListener = function(node, event/*, capture*/) {
      if (isIOS && hasTouch) return;

      var type = MOUSE_PREFIX + event,
        callback = mouseBindings[event];

      if (event === 'cancel') {
        type = 'contextmenu';
      }

      events.removeEvent(node, type, {
        callback: callback,
        capture: /*capture*/ true,
        method: mouseNatives[type].removeEventListener,
        namespace: NS_MOUSE_POINTER
      });
    };

    var checkForCompatibility = function(node, e, event, type) {
      if (!(touchDevice = pointers.getDevice('touch'))) return;

      var touchData = touchDevice.currentPrimaryTouch,
        prevTouchData = touchDevice.prevPrimaryTouch,
        touchDevice;

      if (touchData && touchData.moved && isAndroid) return;

      // console.log('prev:', e.target, prevTouchData && prevTouchData.startTouch.target);

      if ((event === 'out' || event === 'leave') && (prevTouchData &&
        prevTouchData.startTouch.target === e.target)) {
        return true;
      }

      if (touchData) {
        var touch = touchData.startTouch,
          xMin = touch.clientX - 10,
          xMax = touch.clientX + 10,
          yMin = touch.clientY - 10,
          yMax = touch.clientY + 10;

        // console.log('checked:', [e.clientX, e.clientY], [touch.clientX, touch.clientY],
        //   (xMin < e.clientX && xMax > e.clientX &&
        //   yMin < e.clientY && yMax > e.clientY));

        if (touch.target === e.target &&
          xMin < e.clientX && xMax > e.clientX &&
          yMin < e.clientY && yMax > e.clientY) {
          return true;
        }
      }
    };

    var syncMouseEvents = function(deviceNatives, full, event) {
      events.syncEvent(full, function(synced) {
        deviceNatives[full] = synced;

        return {
          addEventListener: function(type, callback, capture) {
            if (event) {
              triggerDeviceListeners(this, event,/* capture,*/ 'mouse');

              if (hasTouch) {
                triggerDeviceListeners(this, event,/* capture,*/ 'touch');
              }
            }

            events.addEvent(this, FAKE_PREFIX + full, {
              handler: function(e) {
                // e = Sync.extend({}, e);
                e = shadowEventType(e, type);

                // console.log('type: ' + e.type);
                callback.call(this, e);
              },
              callback: callback,
              capture: capture,
              method: synced.addEventListener
            });
          },
          removeEventListener: function(type, callback, capture) {
            if (event) {
              muteDeviceListeners(this, event,/* capture,*/ 'mouse');

              if (hasTouch) {
                muteDeviceListeners(this, event,/* capture,*/ 'touch');
              }
            }

            events.addEvent(this, FAKE_PREFIX + full, {
              callback: callback,
              capture: capture,
              method: synced.removeEventListener
            });
          }
        }
      });
    };

    syncMouseEvents(mouseNatives, 'contextmenu', 'cancel');

    // create fake mouse event
    [
      'down',
      'up',
      'move',
      'over',
      'out',
      'enter',
      'leave'
    ].forEach(function(event) {
      var full = MOUSE_PREFIX + event;

      syncMouseEvents(mouseNatives, full, event);

      /*events.syncEvent(full, function(synced) {
        mouseNatives[full] = synced;

        return {
          addEventListener: function(type, callback, capture) {
            events.addEvent(this, FAKE_PREFIX + event, {
              handler: function(e) {
                e = Sync.extend({}, e);
                e.type = type;
                callback.call(this, e);
              },
              callback: callback,
              capture: capture,
              method: synced.addEventListener
            });
          },
          removeEventListener: function(type, callback, capture) {
            events.addEvent(this, FAKE_PREFIX + event, {
              callback: callback,
              capture: capture,
              method: synced.removeEventListener
            });
          }
        }
      });*/
    });
  }());

  // touch type

  var findScrollParents = function(parent) {

    var computed,
      parents = [];

    while (parent && (parent = parent.parentElement)) {
      if (parent === document.body ||
        parent === document.documentElement) break;

      if ((parent.scrollHeight > parent.clientHeight) ||
        (parent.scrollWidth > parent.clientWidth)) {
        parents.push(parent);
      }
    }

    parents.push(window);

    return parents;
  };

  hasTouch && (function() {
    var touchDevice = new pointers.Device('touch'),
      touchNatives = {},
      touchesMap = {},
      touchBindings = {
        start: function(e, type) {
          var touches = e.changedTouches;

          var handleTouch = function(touch) {
            var pointer,
              id = touch.identifier,
              lastEnterTarget = touchDevice.lastEnterTarget;

            if (touchesMap[id]) return;

            var target = touch.target,
              startTouch = {},
              pointer = touchDevice.createPointer();

            // firefox properties are from prototype
            // and cannot be moved by Object.keys
            for (var touchKey in touch) {
              startTouch[touchKey] = touch[touchKey];
            }

            pointer.buttons = 1;

            var overDict = getMouseDict(touch, {
                bubbles: true,
                cancelable: true,
                button: 0,
                buttons: 0,
                relatedTarget: null // prev target goes here
              }),
              downDict = getMouseDict(touch, {
                bubbles: true,
                cancelable: true,
                button: 0,
                buttons: 1,
                relatedTarget: null
              }),
              isPrimary = pointer.isPrimary,
              needEnter = (!lastEnterTarget || !lastEnterTarget !== target);

            var touchData = touchesMap[id] = {
              pointer: pointer,
              time: e.timeStamp,
              // startTouch: Sync.extend({}, touch),
              startTouch: startTouch,
              startTarget: target,
              prevTarget: target,
              style: isPrimary && needFastClick && window.getComputedStyle(target)
            };

            /*if (isPrimary && !(isAndroid && isChrome)) {
              var scrollParents = findScrollParents(target),

            }*/

            if (isPrimary) {
              touchDevice.currentPrimaryTouch = touchData;
            }

            // this block should be uncommented if leave event should be fired
            // not from pointerup/pointercancel event, but from pointerdown

            /*if (isPrimary && lastEnterTarget &&
                !lastEnterTarget.contains(target)) {
              pointer.dispatchEvent(
                lastEnterTarget,
                // inherit from mouse dict
                'leave', getMouseDict(touch, {
                  bubbles: false,
                  cancelable: false,
                  button: 0,
                  buttons: 0,
                  relatedTarget: target
                }));
            }*/

            isPrimary && dispatchMouseEvent(
              'move',
              target,
              getMouseDict(touch, {
                bubbles: true,
                cancelable: true,
                button: 0,
                buttons: 0,
                relatedTarget: null
              })
            );

            // pointerover
            pointer.dispatchEvent(
              target,
              // inherit from mouse dict
              'over', overDict/*, {
                bubbles: true,
                cancelable: true
              }*/);

            // compact mouseover
            isPrimary && dispatchMouseEvent('over', target, overDict);

            if (needEnter) {
              // compact mouseenter
              var enterDict = getMouseDict(touch, {
                bubbles: false,
                cancelable: false,
                button: 0,
                buttons: 0,
                relatedTarget: lastEnterTarget
              });

              pointer.dispatchEvent(target, 'enter', enterDict);
              isPrimary && dispatchMouseEvent('enter', target, enterDict);

              touchDevice.lastEnterTarget = target;
            }

            // pointerdown
            var canceled = !pointer.dispatchEvent(
              target,
              // inherit from mouse dict
              'down', downDict/*, {
                bubbles: true,
                cancelable: true
              }*/);

            if (canceled) {
              e.preventDefault();
              touchDevice.mouseEventsPrevented = true;
            }

            // compact mousedown
            if (isPrimary && /*!touchDevice.mouseEventsPrevented*/ canceled) {
              dispatchMouseEvent('down', target, downDict);
            }
          };

          if (touches.length) {
            slice.call(touches).forEach(handleTouch);
          } else {
            handleTouch(touches[0]);
          }
        },
        move: function(e, type) {
          var touches = e.targetTouches;

          var handleTouch = function(touch) {
            var id = touch.identifier,
              touchData = touchesMap[id];

            if (!touchData) return;

            var lastEnterTarget = touchDevice.lastEnterTarget,
              pointer = touchData.pointer,
              isPrimary = pointer.isPrimary,
              prevTarget = touchData.prevTarget;

            if (touchData.ignoreTouch) {
              return;
            }

            var getTarget = touchData.getTarget ||
              (touchData.getTarget = debunce(function(touch) {
                var target = document.elementFromPoint(
                  touch.clientX, touch.clientY);

                return target;
              }, 10, false));

            var target = getTarget(touch) || prevTarget;

            if (isPrimary) {
              touchData.moved = true;
            }

            if (target !== prevTarget) {
              handleTouchMove(touch, touchData, pointer, isPrimary, target, prevTarget);
            }

            var moveDict = getMouseDict(touch, {
              bubbles: true,
              cancelable: true,
              button: 0,
              buttons: 1,
              relatedTarget: null
            });

            var canceled = !pointer.dispatchEvent(target, 'move', moveDict);

            if (isPrimary && !touchDevice.mouseEventsPrevented) {
              canceled ||
                (canceled = !dispatchMouseEvent('move', target, moveDict));
            }

            if (canceled) {
              e.preventDefault();
            }

            if (!touchDevice.mouseEventsPrevented && !canceled) {
              // cannot detect opera via isChrome but Ya and Cr is
              var needIgnore = isAndroid && !isChrome;

              if (!isAndroid) {
                var startTouch = touchData.startTouch,
                  xMin = startTouch.clientX - 10,
                  xMax = startTouch.clientX + 10,
                  yMin = startTouch.clientY - 10,
                  yMax = startTouch.clientY + 10;

                if (xMin > touch.clientX || xMax < touch.clientX ||
                  yMin > touch.clientY || yMax < touch.clientY) {
                  needIgnore = true;
                }
              }

              if (needIgnore) {
                touchData.ignoreTouch = true;
                handleTouchCancel(touch, touchData, pointer, isPrimary, target, prevTarget);
              }
            }
          };

          if (touches.length) {
            slice.call(touches).forEach(handleTouch);
          } else {
            handleTouch(touches[0]);
          }
        },
        end: function(e, type) {
          var touches = e.changedTouches;

          var handleTouch = function(touch) {
            var id = touch.identifier,
              touchData = touchesMap[id];

            if (!touchData) return;

            var lastEnterTarget = touchDevice.lastEnterTarget,
              pointer = touchData.pointer,
              isPrimary = pointer.isPrimary,
              prevTarget = touchData.prevTarget,
              getTarget = touchData.getTarget,
              target = getTarget && getTarget(touch) || prevTarget;

            if (isPrimary) {
              touchData.ended = true;
            }

            if (!touchData.ignoreTouch && prevTarget !== target) {
              handleTouchMove(touch, touchData, pointer, isPrimary, target, prevTarget);
            }

            touchesMap[id] = null;
            touchDevice.lastEnterTarget = null;
            touchDevice.mouseEventsPrevented = false;

            if (!touchData.ignoreTouch) {
              handleTouchEnd(touch, touchData, pointer, isPrimary, target, prevTarget);
            }

            pointer.destroy();

            if (isPrimary && touchData.clicked) {
              touchDevice.prevPrimaryTouch = touchDevice.currentPrimaryTouch;
              touchDevice.currentPrimaryTouch = null;
            }

            /*var style = touchData.style

            if (!isPrimary || !style) return;

            if (style.msTouchAction === 'none' ||
                style.touchAction === 'none' ||
                touchData.startTarget
                  .getAttribute('touch-action') === 'none') return;

            e.preventDefault();

            var clickEvent = getMouseDict(touch, {
              bubbles: true,
              cancelable: true,
              button: 0,
              buttons: 1,
              relatedTarget: null
            });

            clickEvent = new MouseEvent('click', clickEvent);
            clickEvent._fastClick = true;
            target.dispatchEvent(clickEvent);*/
          };

          if (touches.length) {
            slice.call(touches).forEach(handleTouch);
          } else {
            handleTouch(touches[0]);
          }
        },
        cancel: function(e, type) {
          var touches = e.changedTouches;

          var handleTouch = function(touch) {
            var id = touch.identifier,
              touchData = touchesMap[id];

            if (!touchData) return;

            var lastEnterTarget = touchDevice.lastEnterTarget,
              pointer = touchData.pointer,
              isPrimary = pointer.isPrimary,
              prevTarget = touchData.prevTarget,
              getTarget = touchData.getTarget,
              target = getTarget && getTarget(touch) || touch.target;

            if (isPrimary) {
              touchData.ended = true;
            }

            touchesMap[id] = null;
            touchDevice.lastEnterTarget = null;
            touchDevice.mouseEventsPrevented = false;

            if (!touchData.ignoreTouch) {
              handleTouchCancel(touch, touchData, pointer, isPrimary, target, prevTarget);
            }

            pointer.destroy();

            if (isPrimary && touchData.clicked) {
              touchDevice.prevPrimaryTouch = touchDevice.currentPrimaryTouch;
              touchDevice.currentPrimaryTouch = null;
            }
          };

          if (touches.length) {
            slice.call(touches).forEach(handleTouch);
          } else {
            handleTouch(touches[0]);
          }
        }
      };

    var dispatchMouseEvent = function(event, target, dict) {
      if (!dict.view) {
        dict.view = target.defaultView;
      }

      return events.dispatchEvent(target, FAKE_PREFIX + MOUSE_PREFIX + event, {
        type: 'MouseEvent',
        options: dict
      });
    },
    getMouseDict = function(touch, options) {
      options || (options = {});

      [
        'screenX', 'screenY',
        'clientX', 'clientY',
        'ctrlKey', 'altKey',
        'shiftKey', 'metaKey'
      ].forEach(function(prop) {
        options[prop] = touch[prop];
      });

      return options;
    },
    handleTouchMove = function(touch, touchData, pointer, isPrimary, target, prevTarget) {
      touchData.prevTarget = target;

      var outDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 1,
        relatedTarget: target // prev target goes here
      });

      pointer.dispatchEvent(prevTarget, 'out', outDict);
      isPrimary && dispatchMouseEvent('out', prevTarget, outDict);

      if (!prevTarget.contains(target)) {
        var leaveDict = getMouseDict(touch, {
          bubbles: false,
          cancelable: false,
          button: 0,
          buttons: 1,
          relatedTarget: target // prev target goes here
        });

        pointer.dispatchEvent(prevTarget, 'leave', leaveDict);
        isPrimary && dispatchMouseEvent('leave', prevTarget, leaveDict);
      }

      var overDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 1,
        relatedTarget: prevTarget // prev target goes here
      });

      pointer.dispatchEvent(target, 'over', overDict);
      isPrimary && dispatchMouseEvent('over', target, overDict);

      var enterDict = getMouseDict(touch, {
        bubbles: false,
        cancelable: false,
        button: 0,
        buttons: 1,
        relatedTarget: prevTarget // prev target goes here
      });

      pointer.dispatchEvent(target, 'enter', enterDict);
      isPrimary && dispatchMouseEvent('enter', target, enterDict);
    },
    handleTouchCancel = function(touch, touchData, pointer, isPrimary, target, prevTarget) {
      var cancelDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: false,
        button: 0,
        buttons: 0,
        relatedTarget: null
      }),
      upDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        relatedTarget: null
      });

      pointer.dispatchEvent(target, 'cancel', cancelDict);

      if (isPrimary && !touchDevice.mouseEventsPrevented) {
        dispatchMouseEvent('up', window, upDict)
      }

      // simulate click may goes here

      var outDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        relatedTarget: null
      });

      pointer.dispatchEvent(target, 'out', outDict);
      isPrimary && dispatchMouseEvent('out', target, outDict);

      var leaveDict = getMouseDict(touch, {
        bubbles: false,
        cancelable: false,
        button: 0,
        buttons: 0,
        relatedTarget: null
      });

      // this pointer call is under question
      pointer.dispatchEvent(target, 'leave', leaveDict);
      isPrimary && dispatchMouseEvent('leave', target, leaveDict);
    },
    handleTouchEnd = function(touch, touchData, pointer, isPrimary, target, prevTarget) {
      var upDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        relatedTarget: null
      });

      var canceled = !pointer.dispatchEvent(target, 'up', upDict);

      if (isPrimary && !touchDevice.mouseEventsPrevented) {
        canceled ||
        (canceled = !dispatchMouseEvent('up', target, upDict));
      }

      if (canceled) {
        e.preventDefault();
      }

      // simulate click may goes here

      var outDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        relatedTarget: null
      });

      pointer.dispatchEvent(target, 'out', outDict);
      isPrimary && dispatchMouseEvent('out', target, outDict);

      var leaveDict = getMouseDict(touch, {
        bubbles: false,
        cancelable: false,
        button: 0,
        buttons: 0,
        relatedTarget: null
      });

      // this pointer call is under question
      pointer.dispatchEvent(target, 'leave', leaveDict);
      isPrimary && dispatchMouseEvent('leave', target, leaveDict);
    };

    events.syncEvent('click', function(synced) {
      return {
        addEventListener: function(type, callback, capture) {
          events.addEvent(this, type, {
            handler: function(e) {
              var touchData = touchDevice.currentPrimaryTouch;

              if (touchData && touchData.ignoreTouch) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                return;
              }

              if (!e._fastClick && touchData) {
                if (!touchData.ended) {
                  touchData.clicked = true;
                } else {
                  touchDevice.prevPrimaryTouch = touchDevice.currentPrimaryTouch;
                  touchDevice.currentPrimaryTouch = null;
                }
              }

              callback.call(this, e);
            },
            callback: callback,
            capture: capture,
            method: synced.addEventListener
          });
        },
        removeEventListener: function(type, callback, capture) {
          events.removeEvent(this, type, {
            callback: callback,
            capture: capture,
            method: synced.removeEventListener
          });
        }
      };
    });

    events.syncEvent('contextmenu', function(synced) {
      return {
        addEventListener: function(type, callback, capture) {
          events.addEvent(this, type, {
            handler: function(e) {
              var touchData = touchDevice.currentPrimaryTouch;

              if (touchData) {
                if (!touchData.ended) {
                  touchData.clicked = true;
                } else {
                  touchDevice.prevPrimaryTouch = touchDevice.currentPrimaryTouch;
                  touchDevice.currentPrimaryTouch = null;
                }
              }

              callback.call(this, e);
            },
            callback: callback,
            capture: capture,
            method: synced.addEventListener
          });
        },
        removeEventListener: function(type, callback, capture) {
          events.removeEvent(this, type, {
            callback: callback,
            capture: capture,
            method: synced.removeEventListener
          });
        }
      };
    });

    touchDevice.bindListener = function(node, event) {
      /*var binding = touchBindings[event];

      binding(node, event);*/

      Sync.each(touchBindings, function(fn, key) {
        var full = TOUCH_PREFIX + key;

        events.addEvent(node, full, {
          handler: function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();

            fn.call(this, e, event);
          },
          callback: fn,
          capture: /*capture*/ true,
          method: touchNatives[full].addEventListener,
          namespace: NS_TOUCH_POINTER
        });
      });

      // touchBindings(node, event);

      // method: mouseNatives[type].addEventListener,
      // namespace: NS_MOUSE_POINTER
    };

    touchDevice.unbindListener = function(node, event, capture) {
      Sync.each(touchBindings, function(fn, key) {
        var full = TOUCH_PREFIX + key;

        events.removeEvent(node, full, {
          callback: fn,
          capture: /*capture*/ true,
          method: touchNatives[full].removeEventListener,
          namespace: NS_TOUCH_POINTER
        });
      });
    };


    // no more touch events for this world
    [
      'start',
      'end',
      'move',
      'enter',
      'leave',
      'cancel'
    ].forEach(function(event) {
      var full = TOUCH_PREFIX + event;

      events.syncEvent(full, function(synced) {
        touchNatives[full] = synced;

        return {
          addEventListener: function() {},
          removeEventListener: function() {}
        }
      });
    });
  }());
}(Sync));;(function(window, document, Sync, undefined) {
  "use strict";

  var xhr = new XMLHttpRequest(),
    globalXhr = xhr,
    hasResponseType = 'responseType' in xhr,
    hasResponse = 'response' in xhr,
    hasError,
    hasAbort,
    hasLoad,
    hasTimeout,
    hasLoadEnd,
    hasLoadStart,
    hasWraps,
    getDescNude = Object.getOwnPropertyDescriptor,
    getDesc = function(object, key) {
      try {
        return getDescNude(object, key);
      } catch (e) {};
    },
    define = Object.defineProperty,
    originalDesc = getDesc(window, 'XMLHttpRequest'),
    OriginalXHR = originalDesc.value,
    hasOwn = Object.prototype.hasOwnProperty,
    fixes = [],
    wraps = {},
    sendFixes = [],
    responseTypes = {
      text: function(text) {
        return text;
      },
      json: function(text) {
        return text ? JSON.parse(text) : null;
      },
      document: function() {
        // add document support via DOMParser/implementation.createDocument
        // mb for IE with htmlfile/iframe
      },
      arraybuffer: null,
      blob: null
    },
    needGlobalWrap,
    canDefineAccessors,
    customErrorCodesMap = {
      12002: {
        code: 504,
        text: 'Gateway Timeout'
      },
      120029: {
        code: 500,
        text: 'Internal Server Error'
      },
      120030: {
        code: 500,
        text: 'Internal Server Error'
      },
      120031: {
        code: 500,
        text: 'Internal Server Error'
      },
      12152: {
        code: 502,
        text: 'Bad Gateway'
      },
      1223: {
        code: 204,
        text: 'No Content'
      }
    };

  var fixResponse = function(type, text, xhr) {
    if (text && hasOwn.call(responseTypes, type) &&
        (type = responseTypes[type])) {
      return type(text, xhr);
    }

    return text;
  },
  getAcessorsDesc = function(xhr, prop) {
    var desc = getDesc(OriginalXHR.prototype, prop);

    if (!desc || !desc.set && !desc.get) {
      desc = getDesc(xhr, prop);
    }

    if (!desc || !desc.set && !desc.get) {
      return null;
    }

    return desc;
  },
  getValueDesc = function(xhr, prop) {
    var desc = getDesc(OriginalXHR.prototype, prop);

    if (!desc || !('value' in desc)) {
      desc = getDesc(xhr, prop);
    }

    if (!desc || !('value' in desc)) {
      return null;
    }

    return desc;
  },
  makeWrap = function(prop, handler) {
    hasWraps = true;

    wraps[prop] = {
      handler: handler
    };
  },
  addEvent = function(event, callback) {
    makeWrap('on' + event, function(_super) {
      var handler = null;

      typeof callback === 'function' && callback(_super);

      return {
        get: function() {
          return handler;
        },
        set: function(val) {
          if (handler) {
            this.removeEventListener(event, handler, false);
          }

          this.addEventListener(event, handler = val, false);
        }
      }
    });
  };

  // old Opera needs to open XHR before tweak him
  // need to do it only by demand
  // xhr.open('GET', '/', true);

  (function() {
    var a = {};

    try {
      define(a, 'test', {
        get: function() {
          return 123;
        }
      });

      if (a.test === 123) {
        canDefineAccessors = true;
        return
      }
    } catch (e) {};
  }());

  if (!hasResponse) {
    makeWrap('response', function(_super) {
      return {
        get: function() {
          try {
            var type = this.responseType,
              text = this.responseText;
          } catch(e) {
            debugger;
          }

          return fixResponse(type, text, this);
        }/*,
        enumerable: true,
        configurable: true*/
      };
    });
  }

  if (!hasResponseType) {
    makeWrap('responseType', function(_super) {
      var type = '';

      return {
        set: function(val) {
          if (hasOwn.call(responseTypes, val) && responseTypes[val]) {
            type = val;
          }
        },
        get: function() {
          return type;
        }/*,
        enumerable: true,
        configurable: true*/
      };
    });
  } else {
    var unsupportResponseType,
      opened = false;

    try {
      xhr.responseType = 'text';
    } catch (e) {
      xhr.open('GET', '/', true);
      opened = true;
    }

    ['json', 'document', 'arraybuffer', 'blob'].some(function(type) {
      try {
        xhr.responseType = type;
      } catch (e) {
        unsupportResponseType = true;
        // needGlobalWrap = true;
        return true;
      }

      if (xhr.responseType !== type) {
        unsupportResponseType = true;
        return true;
      }
    });

    if (unsupportResponseType) {
      var resTypeDesc = getAcessorsDesc(xhr, 'responseType');

      if (!resTypeDesc) {
        needGlobalWrap = true;
      }

      console.log('ggggg');

      makeWrap('responseType', function(_super) {
        var value = _super.get();

        return {
          get: function() {
            return value;
          },
          set: function(val) {
            if (!hasOwn.call(responseTypes, val)) return;

            _super.set(value = val);

            if (_super.get() !== val) {
              // path response property here
              
              if (responseTypes[val]) {
                this.type2fix = val;
                _super.set('text');
              }
            }
          }
        }
      });

      if (hasResponse) {
        makeWrap('response', function(_super) {
          return {
            get: function() {
              var type2fix = this.type2fix,
                response = _super.get();

              return fixResponse(type2fix, response, this);
            }
          }
        });
      }
    }
  }

  try {
    hasError = 'onerror' in xhr;
  } catch (e) {};

  try {
    hasAbort = 'onabort' in xhr;
  } catch (e) {};

  hasLoad = 'onload' in xhr;
  hasTimeout = 'ontimeout' in xhr;
  hasLoadEnd = 'onloadend' in xhr;
  hasLoadStart = 'onloadstart' in xhr;

  var needStatusWrap;

  // firefox before 16 fix
  try {
    getDescNude(OriginalXHR.prototype, 'status');
  } catch (e) {
    needGlobalWrap = true;
  }

  try {
    xhr.status;
    xhr.statusText;
  } catch (e) {
    needStatusWrap = true;
  }

  needStatusWrap && (function() {
    makeWrap('status', function(_super) {
      define(_super.self, '_realStatus', _super);

      return {
        get: function() {
          var self = _super.self;

          if (self.readyState === self.UNSENT) {
            return 0;
          }

          var status = _super.get()

          if (status === 13030 || !status) {
            return 0;
          }

          if (hasOwn.call(customErrorCodesMap, status)) {
            return customErrorCodesMap[status].code;
          }

          return status;
        }
      }
    });

    makeWrap('statusText', function(_super) {
      return {
        get: function() {
          var self = _super.self;

          if (self.readyState === self.UNSENT) {
            return '';
          }

          var status = self._realStatus;

          if (status === 13030 || !status) {
            return '';
          }

          if (hasOwn.call(customErrorCodesMap, status)) {
            return customErrorCodesMap[status].text;
          }

          return _super.get();;
        }
      }
    });
  }());

  if (!hasAbort) {
    addEvent('abort')
    
    makeWrap('abort', function(_super) {
      var realAbort = _super.get();

      return {
        value: function() {
          this._aborted = true;
          realAbort.call(this);
          var e = new CustomEvent('abort');
          this.dispatchEvent(e);
        }
      };
    });
  }

  if (!('timeout' in xhr) || !hasTimeout) (function() {
    var timer,
      abotedByTimeout,
      sent;

    var tryTimeout = function(self) {
      var timeout = self.timeout;

      if (timeout) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function() {
          timer = null;

          if (self.readyState >= self.DONE) return;

          abotedByTimeout = true;
          self.abort();

          var e = new CustomEvent('timeout');
          self.dispatchEvent(e);
        }, timeout);
      }
    };

    sendFixes.push(function(xhr) {
      tryTimeout(xhr);
      sent = true;
    });

    makeWrap('timeout', function(_super) {
      var timeout = 0,
        self = _super.self;

      var abortHandler = function(e) {
        if (abotedByTimeout) {
          e.stopPropagation();
          e.stopImmediatePropagation();
          e.preventDefault();
        }

        setTimeout(cleanUp, 1);
      },
      stateHandler = function() {
        if (self.readyState >= self.DONE) {
          clearTimeout(timer);
          timer = null;
          setTimeout(cleanUp, 1);
        }
      },
      cleanUp = function() {
        self.removeEventListener('timeout', cleanUp, true);
        self.removeEventListener('abort', abortHandler, true);
        self.removeEventListener('readystatechange', stateHandler, true);
      };

      self.addEventListener('timeout', cleanUp, true);
      self.addEventListener('abort', abortHandler, true);
      self.addEventListener('readystatechange', stateHandler, true);

      return {
        get: function() {
          return timeout;
        },
        set: function(val) {
          if (this.readyState >= this.DONE) return;

          timeout = val;

          if (sent) {
            tryTimeout(this);
          }
        }
      };
    });

    addEvent('timeout');
  }());

  if (!hasLoad || !hasLoadEnd || !hasLoadStart || !hasError) (function() {
    fixes.push(function(xhr) {
      var ended;

      var handleEnd = function(e) {
        if (ended) return;

        ended = true;

        if (!hasLoadEnd) {
          var e = new CustomEvent('loadend');
          xhr.dispatchEvent(e);
        }

        xhr.removeEventListener('readystatechange', stateHandler, true);
        xhr.removeEventListener('load', handleEnd, true);
        xhr.removeEventListener('abort', handleEnd, true);
        xhr.removeEventListener('error', handleEnd, true);
        xhr.removeEventListener('timeout', handleEnd, true);
      },
      stateHandler = function() {
        if (xhr.readyState < xhr.DONE || ended) return;
        if (!hasAbort && xhr._aborted) return;

        console.log('readyState: ', xhr.readyState);

        var status = xhr.status;

        if (xhr.getAllResponseHeaders() && status &&
          !isNaN(status) && xhr.statusText && xhr.statusText !== 'Unknown') {
          
          if (!hasLoad) {
            var e = new CustomEvent('load');
            xhr.dispatchEvent(e);
          }

          handleEnd();
          return;
        }

        var fireError = function() {
          var e = new CustomEvent('error');
          xhr.dispatchEvent(e);
          handleEnd();
        };

        if (!hasError) {
          fireError();
        } else {
          setTimeout(function() {
            if (!ended) {
              fireError();
            }
          }, 1);
        }
      };

      
      if (!hasLoad || !hasError) {
        xhr.addEventListener('readystatechange', stateHandler, true);
      }

      if (hasLoad) {
        xhr.addEventListener('load', handleEnd, true);
      }

      xhr.addEventListener('abort', handleEnd, true);
      xhr.addEventListener('error', handleEnd, true);
      xhr.addEventListener('timeout', handleEnd, true);
    });

    !hasLoadStart && sendFixes.push(function(xhr) {
      var e = new CustomEvent('loadstart');
      xhr.dispatchEvent(e);
    });

    !hasLoad && addEvent('load');
    !hasError && addEvent('error');
    !hasLoadEnd && addEvent('loadend');
    !hasLoadStart && addEvent('loadstart');
  }());

  if (sendFixes.length) {
    makeWrap('send', function(_super) {
      var realSend = _super.get(),
        send = function(data) {
          sendFixes.forEach(function(fix) {
            fix(this);
          }, this);

          return realSend.call(this, data);
        };

      return {
        get: function() {
          return send;
        }
      };
    });
  }

  if (!('addEventListener' in xhr)) (function() {
    needGlobalWrap = true;

    var supportedEvents = {
        error: hasError,
        abort: hasAbort,
        timeout: hasTimeout,
        load: hasLoad
      },
      realAccessors = {};

    // need events prefix because IE buggy with readystatechange
    // at DOM nodes
    var EVENT_PREFIX = 'xhr.';

    var addSupported = function(event, xhr) {
      var desc = getAcessorsDesc(xhr, 'on' + event);

      if (desc) {
        realAccessors[event] = desc;
        addEvent(event);
        return;
      }
    },
    getXHRET = function(xhr) {
      var et = this._eventTarget;

      if (!et) {
        et = this._eventTarget = document.createElement('xhr');
        try {
          document.documentElement.appendChild(et);
          document.documentElement.removeChild(et);
        } catch (e) {};
      }

      return et;
    },
    getEventsMap = function(xhrCache, event, capture) {
      var eventsMap = xhrCache['events_map'];

      eventsMap || (eventsMap = xhrCache['eventsMap'] = {});
      eventsMap = eventsMap[event] || (eventsMap[event] = {});
      eventsMap = eventsMap[capture] || (eventsMap[capture] = {
        index: [],
        store: []
      });

      return eventsMap;
    };

    define(XMLHttpRequest.prototype, 'dispatchEvent', {
      value: function(e) {
        var et = getXHRET(this),
          type = e.type;
        
        try {
          e.type = EVENT_PREFIX + e.type;
        } catch (e) {};

        if (e.type !== EVENT_PREFIX + type) {
          e = new CustomEvent(EVENT_PREFIX + type);
        }

        return et.dispatchEvent(e);
      },
      writable: false,
      configurable: true,
      enumerable: false
    });

    define(XMLHttpRequest.prototype, 'addEventListener', {
      value: function(event, handler, capture) {
        var xhrET = getXHRET(this),
          cached = Sync.cache(this, 'xhr_events_fix'),
          bindedAccessors = cached['binded_accessors'],
          eventsMap = getEventsMap(cached, event, capture);

        if (eventsMap.index.indexOf(handler) !== -1) return;

        if (!bindedAccessors) {
          bindedAccessors = cached['binded_accessors'] = {};
        }

        if (hasOwn.call(realAccessors, event) &&
          !hasOwn.call(bindedAccessors, event)) {
          bindedAccessors[event] = true;
          realAccessors[event].set.call(this, function() {
            var e = new CustomEvent(EVENT_PREFIX + event);
            xhrET.dispatchEvent(e);
          });
        }

        eventsMap.index.push(handler);
        eventsMap.store.push(handler = handler.bind(this));

        xhrET.addEventListener(EVENT_PREFIX + event, handler, capture);
      },
      writable: false,
      configurable: true,
      enumerable: false
    });

    define(XMLHttpRequest.prototype, 'removeEventListener', {
      value: function(event, handler, capture) {
        var xhrET = getXHRET(this),
          cached = Sync.cache(this, 'xhr_events_fix'),
          eventsMap = getEventsMap(cached, event, capture),
          indexed;

        if ((indexed = eventsMap.index.indexOf(handler)) === -1) return;

        handler = eventsMap.store[indexed];
        eventsMap.index.splice(indexed, 1);
        eventsMap.store.splice(indexed, 1);

        xhrET.removeEventListener(EVENT_PREFIX + event, handler, capture);
      },
      writable: false,
      configurable: true,
      enumerable: false
    });

    // readystatechange should be handled first
    // because IE buggy otherwise
    var events = ['readystatechange'].concat(Object.keys(supportedEvents));
    supportedEvents.readystatechange = true;

    events.forEach(function(event) {
      if (supportedEvents[event]) {
        addSupported(event, xhr);
      }
    });
  }());

  [
    'UNSENT',
    'OPENED',
    'HEADERS_RECEIVED',
    'LOADING',
    'DONE'
  ].forEach(function(key, index) {
    if (!(key in xhr)) {
      define(XMLHttpRequest.prototype, key, {
        value: index,
        enumerable: false,
        writable: true,
        configurable: true
      });
    }
  });

  if (needGlobalWrap && canDefineAccessors) {
    var XHRWrap = function() {
      var self = this,
        original = this._original = new OriginalXHR();

      Object.keys(wraps).forEach(function(key) {
        var wrap = wraps[key];

        define(self, key, Sync.extend({
          enumerable: false,
          configurable: true
        }, wrap.handler({
          get: function() {
            var val = original[key];

            if (typeof val === 'function') {
              return val.bind(original);
            }

            return val;
          },
          set: function(val) {
            return original[key] = val;
          },
          self: original
        })));
      });

      fixes.forEach(function(fix) {
        fix(self);
      });
    };

    (function() {
      var handler = function(key) {
        if (key in proto || hasOwn.call(wraps, key) || !(key in this)) return;

        /*try {
          var desc = getDesc(this, key);
        } catch (e) {*/
          var desc = {
            enumerable: false,
            configurable: true
          };
        // };

        define(proto, key, {
          get: function() {
            var original = this._original,
              val = original[key];

            if (typeof val === 'function') {
              return val.bind(original);
            }

            return val;
          },
          set: function(val) {
            this._original[key] = val;
          },
          enumerable: desc.enumerable,
          configurable: desc.configurable
        });
      };

      define(window, 'XMLHttpRequest', {
        value: XHRWrap,
        writable: originalDesc.writable,
        enumerable: originalDesc.enumerable,
        configurable: originalDesc.configurable
      });

      var proto = XMLHttpRequest.prototype,
        originalProto = OriginalXHR.prototype;

      Object.keys(originalProto).forEach(handler, originalProto);
      Object.keys(xhr).forEach(handler, xhr);

      ["statusText", "status", "response", "responseType",
       "responseXML", "responseText", "upload", "withCredentials",
       "readyState", "onreadystatechange", "onprogress", "onloadstart",
       "onloadend", "onload", "onerror", "onabort",
       "addEventListener", "removeEventListener", "dispatchEvent"].forEach(handler, xhr);
    }());
  } else if (fixes.length || hasWraps) {
    var XHRWrap = function() {
      var xhr = new OriginalXHR();

      Object.keys(wraps).forEach(function(key) {
        var wrap = wraps[key],
          desc = getAcessorsDesc(xhr, key),
          value;

        if (!desc) {
          desc = getValueDesc(xhr, key);

          if (!desc || typeof desc.value === 'function' ||
              typeof desc.value === 'undefined') {
            define(xhr, key, Sync.extend({
              enumerable: false,
              configurable: true
            }, wrap.handler({
              get: function() {
                return desc ? desc.value : void 0;
              },
              set: function(val) {},
              self: xhr
            })));

            return;
          } else {
            desc = null;
          }
        }

        desc && define(xhr, key, Sync.extend({
          enumerable: false,
          configurable: true
        }, wrap.handler({
          get: function() {
            return desc.get.call(xhr);
          },
          set: function(val) {
            desc.set.call(xhr, val);
          },
          self: xhr
        })));
      });

      fixes.forEach(function(fix) {
        fix(xhr);
      });

      return xhr;
    };

    define(window, 'XMLHttpRequest', {
      value: XHRWrap,
      writable: originalDesc.writable,
      enumerable: originalDesc.enumerable,
      configurable: originalDesc.configurable
    });
  } else {
    var XHRWrap = null;
  }

  // in IE we cannot redefine XHR via defineProperty
  // but can do it with regular assignment
  if (XHRWrap && XMLHttpRequest === OriginalXHR) {
    try {
      XMLHttpRequest = XHRWrap;
    } catch (e) {
      window.XMLHttpRequest = XHRWrap;
    }
  }

  xhr = globalXhr = null;
}(this, document, Sync));;(function(window) {
  'use strict';

  var vendors = 'webkit|moz|ms|o'.split('|'),
    events = {
      transition: 'transitionend'
    },
    eventsMap = {
      'webkit': ['webkitTransitionEnd'],
      'moz': ['transitionend'],
      'o': ['OTransitionEnd', 'otransitionend'],
      '': ['transitionend']
    },
    eventName,
    transitionProperty = 'Transition',
    transitionVendor = '',
    transformProperty = 'Transform',
    perspectiveProperty = 'Perspective',
    backfaceProperty = 'BackfaceVisibility',
    backfaceKey = 'backfaceVisibility',
    perspectiveOrigin,
    transformOrigin,
    transformStyle,
    style = document.createElement('div').style;

  var R_VENDORS = /(webkit|moz|ms|o)-/i;

  var camelToCss = function(str, w) {
    return '-' + w.toLowerCase();
  },
  hasOwn = Object.prototype.hasOwnProperty,
  isArray = Array.isArray,
  slice = Array.prototype.slice,
  getTime = window.performance ? (function() {
    var now = performance.now || performance.webkitNow || performance.msNow;

    if (!now) {
      return Date.now;
    }

    return function() {
      return now.call(performance);
    };
  }()) : Date.now;

  // match vendor section
  {
    if (transitionProperty.toLowerCase() in style) {
      transitionProperty = transitionProperty.toLowerCase();
    } else if (!vendors.some(function(vendor) {
      if (vendor + transitionProperty in style) {
        transitionProperty = vendor + transitionProperty;
        transitionVendor = vendor.toLowerCase();
        return true;
      }

      return false;
    })) {
      transitionProperty = null;
    } else if (transitionVendor in eventsMap) {
      eventName = eventsMap[transitionVendor];
    }

    if (!eventName) {
      eventName = eventsMap[''];
    }

    if (transformProperty.toLowerCase() in style) {
      transformProperty = transformProperty.toLowerCase();
      transformOrigin = transformProperty + 'Origin';
      transformStyle = transformProperty + 'Style';
    } else if (!vendors.some(function(vendor) {
      if (vendor + transformProperty in style) {
        transformProperty = vendor + transformProperty;
        transformOrigin = transformProperty + 'Origin';
        transformStyle = transformProperty + 'Style';
        return true;
      }

      return false;
    })) {
      transformProperty = null;
    }

    if (perspectiveProperty.toLowerCase() in style) {
      perspectiveProperty = perspectiveProperty.toLowerCase();
      perspectiveOrigin = perspectiveProperty + 'Origin';
    } else if (!vendors.some(function(vendor) {
      if (vendor + perspectiveProperty in style) {
        perspectiveProperty = vendor + perspectiveProperty;
        perspectiveOrigin = perspectiveProperty + 'Origin';
        return true;
      }

      return false;
    })) {
      perspectiveProperty = null;
    }

    if (backfaceKey in style) {
      backfaceProperty = backfaceKey;
    } else if (!vendors.some(function(vendor) {
      if (vendor + backfaceProperty in style) {
        backfaceProperty = vendor + backfaceProperty;
        return true;
      }

      return false;
    })) {
      backfaceProperty = null;
    }
  }

  var TRANSFORM_MAP = {
      translate: 'px',
      translatex: 'px',
      translatey: 'px',
      scale: '',
      scalex: '',
      sclaey: '',
      rotate: 'deg',
      skew: 'deg',
      skewx: 'deg',
      skewy: 'deg',
      matrix: ''
    },
    TRANSFORM_3D_MAP = {
      translatez: 'px',
      rotatex: 'deg',
      rotatey: 'deg',
      rotatez: 'deg',
      scalez: ''
    },
    R_CAMEL_TO_CSS = /([A-Z])(?=[a-z])/g,
    DEFAULT_TRANSITION_DURATION = 300,
    DEFAULT_TRANSITION_FUNCTION = 'ease',
    DEFAULT_TRANSITION_DELAY = 0,
    STYLE_MAP = {
      transition: transitionProperty,
      transitionTimingFunction: transitionProperty + 'TimingFunction',
      transform: transformProperty,
      transformOrigin: transformOrigin,
      transformOriginX: transformOrigin + 'X',
      transformOriginY: transformOrigin + 'Y',
      transformOriginZ: transformOrigin + 'Z',
      transformStyle: transformStyle
    },
    REQUEST_ANIMATION_FRAME = 'requestAnimationFrame',
    CANCEL_REQUEST_ANIMATION_FRAME = 'cancelAnimationFrame',
    TRANSITION_DATA_KEY = 'transition_data';

  if (!window[REQUEST_ANIMATION_FRAME]) {
    window[REQUEST_ANIMATION_FRAME] = ['webkit', 'moz', 'o']
      .map(function(vendor) {
        return window[vendor + REQUEST_ANIMATION_FRAME]
      }).filter(function(a) {
        return !!a;
      })[0] || function(fn, element) {
        return setTimeout(function() {
          fn.call(element, getTime());
        }, 15);
      };

    window[CANCEL_REQUEST_ANIMATION_FRAME] = ['webkit', 'moz', 'o']
      .map(function(vendor) {
        return window[vendor + CANCEL_REQUEST_ANIMATION_FRAME]
      }).filter(function(a) {
        return !!a;
      })[0] || function(id) {
        clearTimeout(id);
      };
  }

  var Animation = function(params) {
    var self = this;

    params || (params = {});
    this.events = {};

    ['frame', 'end', 'play', 'pause'].forEach(function(event) {
      self.events[event] = typeof params[event] === 'function' ?
        params[event] : function() {};
    });

    if (params.duration) {
      this.duration = params.duration;
    }

    if (params.autoplay) {
      this.play();
    }
  };

  Animation.stack = [];
  Animation.frameHandler = function(time) {
    var stack = Animation.stack;

    stack.forEach(function(animation) {
      animation.frame(time);
    });

    if (stack.length) {
      Animation.request = requestAnimationFrame(Animation.frameHandler);
    }
  };

  Animation.prototype = {
    play: function(duration) {
      if (this.plaing) return false;

      var now = getTime();

      if (this.stopped) {
        if (duration != null && isFinite(duration)) {
          this.duration = duration;
        }

        this.lastTime = this.startTime = now;
        this.stopped = false;
        this.plaing = true;
      } else {
        //resume code
        this.startTime = (this.lastTime = now) -
          (this.pauseTime - (this.lastTime = this.startTime));
        this.plaing = true;
        this.pauseTime = null;
      }

      if (Animation.stack.push(this) === 1) {
        Animation.request = requestAnimationFrame(Animation.frameHandler);
      }
    },
    pause: function() {
      if (!this.plaing || this.stopped) return false;

      this.plaing = false;
      this.pauseTime = getTime();

      this.eject() || this.stop();
    },
    frame: function(time) {
      if (this.stopped || !this.plaing) return;

      var progress = (time - this.startTime) / this.duration;

      progress = progress > 1 ? 1 : progress;

      this.lastTime = time;
      this.events.frame(progress);

      if (progress >= 1) {
        this.end();
      }
    },
    end: function(){
      this.eject();
      this.stop();
      this.events.end();
    },
    stop: function() {
      this.stopped = true;
      this.plaing = false;
      this.lastTime =
        this.progress =
        this.startTime = 
        this.pauseTime = null;
      // do reset on stop
    },
    eject: function() {
      var stack = Animation.stack,
        index = stack.indexOf(this);

      if (index !== -1) {
        index = stack.splice(index, 1)[0];
      }

      if (!stack.length) {
        cancelAnimationFrame(Animation.request);
      }

      return index === this;
    },
    stopped: true,
    autoplay: false,
    plaing: false,
    duration: 0
  };

  // Transitions section
  var Transition = function(params) {
    if (params) {
      this.params = params;

      Sync.each(params, function(val, key) {
        if (typeof val === 'number') {
          params[key] = [val];
        }

        if (!isArray(val)) {
          params[key] = [];
        }
      });
    } else {
      this.params = params = {};
    }

    /*this.stack = params.map(function(param) {
      if (typeof param === 'string') {
        param = [param];
      }

      if (!Array.isArray(param)) return '';

      var key = param[0];

      if (STYLE_MAP.hasOwnProperty(key)) {
        key = STYLE_MAP[key];
      }

      key = key.replace(R_CAMEL_TO_CSS, camelToCss);

      if (!key.search(R_VENDORS)) {
        key = '-' + key;
      }

      param[0] = key;

      return param.join(' ');
    });*/
  };

  Transition.stop = function(element) {
    Transition.clean(element);
    element.style[transitionProperty] = 'null';
  };

  Transition.clean = function(element, listeners) {
    if (!listeners) {
      listeners = Sync.cache(element, TRANSITION_DATA_KEY).listeners || [];
    }

    eventName.forEach(function(event) {
      listeners.forEach(function(listener) {
        element.removeEventListener(event, listener, true);
      })
    });
  };

  Transition.run = function(elem, props, globalCallback) {
    var style = elem.style,
      keys = Object.keys(props),
      count = keys.length,
      cssProps = {},
      data = Sync.cache(elem, TRANSITION_DATA_KEY),
      listeners = data.listeners || (data.listeners = []),
      transition = new Transition(),
      params = transition.params;

    Sync.each(props, function(val, key) {
      if (typeof val === 'number') {
        val = [val];
      }

      if (!isArray(val) || !val.length) return;

      var len = val.length,
        domKey = key,
        cssKey,
        callback = typeof (len > 1 && val[len - 1]) === 'function',
        handle = function(trans, next, index) {
          var value = trans.shift(),
            transLength = trans.length,
            transCallback = typeof trans[transLength - 1] === 'function';

          if (transCallback) {
            transCallback = trans.pop();
          }

          params[domKey] = trans;

          if (index) {
            style.transition = transition;
          }

          style[domKey] = value;

          // key
          // trans [value, duration, timing-function, delay, callback];

          // style[domKey] = props[key];

          if (transitionProperty) {
            var transitionListener = function(e) {
              if (e.eventPhase !== e.AT_TARGET) return;

              var property = e.propertyName,
                index = listeners.indexOf(transitionListener);

              if (index !== -1) {
                listeners.splice(index, 1);
              }

              eventName.forEach(function(event) {
                elem.removeEventListener(event, transitionListener, true);
              });

              if (property === cssKey) {
                if (transCallback) {
                  transCallback();
                }

                if (next) {
                  next();
                }
              }
            };

            listeners.push(transitionListener);

            eventName.forEach(function(event) {
              elem.addEventListener(event, transitionListener, true);
            });
          } else {
            if (transCallback) {
              transCallback();
            }

            if (next) {
              next();
            }
          }
        },
        end = function() {

          if (callback) {
            callback();
          }

          delete cssProps[cssKey];

          if (!--count) {
            Transition.clean(elem, listeners);
            globalCallback && globalCallback();
            style[transitionProperty] = '';
          }
        };

      {
        if (STYLE_MAP.hasOwnProperty(key)) {
          domKey = STYLE_MAP[key];
        }

        cssKey = domKey.replace(R_CAMEL_TO_CSS, camelToCss);

        if (!cssKey.search(R_VENDORS)) {
          cssKey = '-' + cssKey;
        }

        cssProps[cssKey] = 1;
      }

      if (callback) {
        callback = val.pop();
      }

      if (!isArray(val[0])) {
        handle(val, end, 0);
        return;
      }

      val.reduceRight(function(next, trans, index) {
        return function() {
          handle(trans, next, index);
        };
      }, end)();
    });

    // console.log(transition + '');

    style.transition = transition;
  };

  Transition.prototype = {
    toString: function() {
      var params = this.params;

      return Object.keys(params).map(function(key) {
        var param = params[key],
          duration = param[0],
          fn = param[1],
          delay = param[2];

        if (STYLE_MAP.hasOwnProperty(key)) {
          key = STYLE_MAP[key];
        }

        key = key.replace(R_CAMEL_TO_CSS, camelToCss);

        if (!key.search(R_VENDORS)) {
          key = '-' + key;
        }

        return [
          key,
          duration ? duration + 'ms' : '',
          fn || '',
          delay ? delay + 'ms' : ''
        ].join(' ');
      }).join(', ');
    }
  };

  // Transform section
  if (transformProperty) {
    var Transform = function(element, map) {
      var stack;

      if (element && element.nodeType === Node.ELEMENT_NODE) {
        // need to real parse values
        stack = this.stack = [element.style.transform];
      } else {
        stack = this.stack = [];
        map = element;
        element = null;
      }

      Sync.each(map, function(val, key) {
        if (hasOwn.call(Transform, key)) {
          val = Transform[key].apply(Transform, isArray(val) ? val : [val]);
          stack.push(val);
        }
      });

      // Object.keys(map).forEach(function(name) {
      //   stack
      //     .push(name + '(' + (map[name] + '')
      //     .replace(/\s*(,)|$\s*/g, TRANSFORM_MAP[name.toLowerCase()] + '$1') + ')');
      // });
    };

    var transforms2d = [{
      key: 'translate',
      len: 2
    }, {
      key: 'translateX',
      len: 1
    }, {
      key: 'translateY',
      len: 1
    }, {
      key: 'rotate',
      len: 1
    }, {
      key: 'scale',
      len: 2
    }, {
      key: 'scaleX',
      len: 1
    }, {
      key: 'scaleY',
      len: 1
    }, {
      key: 'skew',
      len: 2
    }, {
      key: 'skewX',
      len: 1
    }, {
      key: 'skewY',
      len: 1
    }, {
      key: 'matrix',
      len: perspectiveProperty ? 9 : 6
    }];

    if (perspectiveProperty) {
      Sync.extend(TRANSFORM_MAP, TRANSFORM_3D_MAP);

      transforms2d.push({
        key: 'translateZ',
        len: 1
      }, {
        key: 'scaleZ',
        len: 1
      }, {
        key: 'rotateX',
        len: 1
      }, {
        key: 'rotateY',
        len: 1
      }, {
        key: 'rotateZ',
        len: 1
      });
    }

    // 2d transforms

    transforms2d.forEach(function(prop) {
      var key = prop.key,
        len = prop.len;

      var transform = Transform[key] = function() {
        var args = slice.call(arguments, 0, len).map(function(arg) {
          return arg !== void 0 ?
            parseFloat(arg) + TRANSFORM_MAP[key.toLowerCase()] : 0;
        });

        return key + '(' + args.join(',') + ')';
      };

      Transform.prototype[key] = function() {
        this.stack.push(transform.apply(null, arguments));
        return this;
      };
    });

    Transform.prototype.toString = function() {
      return this.stack.join(' ');
    };

    Transform.prototype.apply = function(element) {
      element.style[transformProperty] = this;
    };
  }

  Sync.effects = {
    Transform: Transform,
    Transition: Transition,
    Animation: Animation,
    transformProperty: transformProperty,
    transitionProperty: transitionProperty,
    perspectiveProperty: perspectiveProperty,
    backfaceProperty: backfaceProperty,
    translate: Transform ? function(element, x, y) {
      element.style.transform = Transform.translate(x, y);
    } : function(element, x, y) {
      var style = element.style;

      style.marginTop = y + 'px';
      style.marginLeft = x + 'px';
    },
    getTime: getTime
  };

  Sync.each(STYLE_MAP, function(used, normal) {
    if (used === normal) return;

    var usedDict = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, used) ||
      Object.getOwnPropertyDescriptor(style, used);

    Object.defineProperty(CSSStyleDeclaration.prototype, normal, {
      get: function() {
        return this[used];
      },
      set: function(val) {
        this[used] = val;
      },
      configurable: usedDict ? usedDict.configurable : true
    });
  });

  style = null;
}(this));