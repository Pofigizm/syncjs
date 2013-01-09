/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

;(function(window, undefined) {

  "use strict";

  var R_QUERY_SEARCH = /^([\w\d]*)(\[[\s\S]*\])$/;

  var toString = Object.prototype.toString,
    valueOf = Object.prototype.valueOf,
    hasOwn = Object.prototype.hasOwnProperty,
    arrayProto = Array.prototype,
    slice = arrayProto.slice,
    Sync = window.Sync = function Sync() {},

    //iteration each own properties of passing obj
    //and call fn with key/value arguments
    //additionaly passing an third argument -
    // - slice of "each" function arguments
    //which starting at 2
    each = Sync.each = function(obj, fn/*, thisValue*/) {
      if (typeof fn != 'function') {
        throw new TypeError('window.tools.each - wrong arguments "fn"');
      }

      for (var key in obj) {
        hasOwn.call(obj, key) && key !== 'prototype' &&
        fn.call(arguments[2] || null, obj[key], key, obj);
      }

      return obj;
    },

    //function for inhrerits some classes
    //expect one require argument - config
    //which describes the
    // - "parent" - constructor, that need to be inherited
    // - "proto" - object, that will be added
    //to newly created constructor
    inherits = Sync.inherits = function(options) {

      var handler = options.handler,
        parent = options.parent,
        proto = options.proto,
        meta = options.meta,
        mixins = options.mixins;

      if (isArray(mixins) && mixins.length) {
        var mix = mixins.pop();

        // An alternative way
        // Infinite battle -- loop vs. recursion

        /*while (mix = mixins.pop()) {
          parent = inherits({
            handler: mix,
            meta: mix,
            proto: mix.prototype,
            parent: parent
          });

        }*/

        parent = inherits({
          handler: mix,
          meta: mix,
          proto: mix.prototype,
          parent: parent,
          mixins: mixins
        });
      }

      function Class() {
        var self = this;

        if (parent) {
          if (!(this instanceof parent)) {
            self = Object.create(parent.prototype);
          }

          parent.apply(self, arguments);
        }

        handler && handler.apply(self, arguments);
        return self;
      }

      if (parent) {
        Class.prototype = Object.create(parent.prototype);
      }

      extend(true, Class, parent, meta);
      extend(Class.prototype, proto);

      Class.prototype.constructor = Class;

      if (parent) {
        Class.prototype.__super__ = parent;
        Class.prototype.__parent__ = parent.prototype;
      }

      return Class;
    },

    //indicates that first passed argument
    //is object or not

    isObject = Sync.isObject = function(obj) {
      obj = obj && obj.valueOf && obj.valueOf() || obj;
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
            to[key] = isArray(value) ? [] : {};
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

  Sync.ua = (function(arr, ua) {
    return {
      chrome: !!window.chrome,
      opera: !!window.opera,
      gecko: !!window.Components,
      oldIE: !!window.ActiveXObject
    };
  }());

  Sync.toString = function() {
    return 'Your think goes here ...';
  };

  var escape = function(key, val) {
      if (isArray(val)) {
        return val.map(function(deepVal, index) {
          return escape(key + '[' + index + ']', deepVal);
        }).join('&');
      } else if (typeof val === 'object') {
        return Object.keys(val).map(function(rest) {
          return escape(key + '[' + rest + ']', this[rest]);
        }, val).join('&');
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
    if ((!first && !second) || (first === second)) {
      return true;
    } else if (!first || !second ||
               toString.call(first) !== toString.call(second) ||
          first.length !== second.length) {
      return false;
    } else {
      return equal(first, second, Sync.equal);
    }
  };

  Sync.unescape = function(string) {
    if (typeof string !== 'string') return null;

    return string.split('&').reduce(function(result, prop) {
      if (prop) {
        prop = prop.split('=');
        unescapePair(result, prop[0], prop[1]);
      }
      return result;
    }, {});

  };

}(this));