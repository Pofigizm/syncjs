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
            } else if (value instanceof RegExp) {
              // copy RegExp
              to[key] = new RegExp(value);
            } else {
              to[key] = {};
            }
          }

          extend(recurse, to[key], value, overwrite);
        } else if (
          typeof value !== 'undefined' && (overwrite || !hasOwn.call(to, key))
        ) {
          to[key] = value;
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

  // need logger api
  // var logger = new Sync.Logger('loggerName');
  // logger.log('my log..') ->
  //   [loggerName]: my log..

  var logging = [];

  Sync.Logger = function(name) {
    this.name = name;
  };

  Sync.Logger.prototype = {
    log: function() {
      var args = slice.call(arguments);
      args.unshift('[' + this.name + ']');
      Sync.log.apply(null, args);
    }
  };

  Sync.log = function syncLog() {
    var log = slice.call(arguments);

    if (Sync.debug) {
      window.console.log.apply(window.console, log);
    }

    logging.push(log.join(' '));
  };

  Sync.logging = logging;
}(this));
