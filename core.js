/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

;(function(window, undefined) {

  "use strict";

  var toString = Object.prototype.toString,
    valueOf = Object.prototype.valueOf,
    hasOwn = Object.prototype.hasOwnProperty,
    arrayProto = Array.prototype,
    Sync = window.Sync = function Sync() {},

    //iteration each own properties of passing obj
    //and call fn with key/value arguments
    //additionaly passing an third argument -
    // - slice of "each" function arguments
    //which starting at 2
    each = Sync.each = function(obj, fn/*, thisValue*/) {
      var key;

      if (typeof fn != 'function') {
        throw new TypeError('window.tools.each - wrong arguments "fn"');
      }

      for (key in obj) {
        hasOwn.call(obj, key)
          && key !== 'prototype'
          && fn.call(arguments[2] || null, obj[key], key, obj);
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

      var handler = options.handler || function() {},
        parent = options.parent,
        proto = options.proto,
        meta = options.meta,
        mixins = options.mixins;

      if (Array.isArray(mixins) && mixins.length) {
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

        handler.apply(self, arguments);
        return self;
      };

      if (parent) {
        Class.prototype = Object.create(parent.prototype);
      }

      Sync.extend(true, Class, parent, meta);
      Sync.extend(Class.prototype, proto);

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

      if (typeof args[end-1] === 'boolean') {
        overwrite = args[--end];
      }

      function action(value, key) {

        if (recurse && (isObject(value))
          && (to[key] && overwrite || !to[key])) {

          if (!Array.isArray(to[key]) && !isObject(to[key])) {
            to[key] = Array.isArray(value) ? [] : {};
          }

          extend(recurse, to[key], value, overwrite);

        } else if (typeof value !== 'undefined') {
          !overwrite && key in to || (to[key] = value);
        }
      }

      for (; start < end; start++) {

        if (Array.isArray(args[start])) {
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
    }
  }());

  Sync.toString = function() {
    return 'Your think goes here ...';
  };

  if (!('origin' in window.location)) {
    try {
      Object.defineProperty(window.location, 'origin', {
        get: function() {
          return this.protocol + '//' + this.host;
        }
      });
    } catch (e) {
      window.location.origin = window.location.protocol + '//' + window.location.host;
    }
  }

  if (!('innerWidth' in window)) {
    Object.defineProperties(window, {
      innerWidth: {
        get: function() {
          if (document.compatMode !== "CSS1Compat" && document.body) {
            return document.body.clientWidth || 0;
          } else {
            return document.documentElement.clientWidth || 0;
          }
        }
      },
      innerHeight: {
        get: function() {
          if (document.compatMode !== "CSS1Compat" && document.body) {
            return document.body.clientHeight || 0;
          } else {
            return document.documentElement.clientHeight || 0;
          }
        }
      }
    });
  }

  var escape = function(key, val) {
      if (Array.isArray(val)) {
        return val.map(function(deepVal) {
          return escape(key, deepVal);
        });
      } else {
        return  key + '=' + encodeURIComponent(val);
      }
    },
    equal = function(first, second, recursion) {
      if (Array.isArray(first)) {
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

    };

  Sync.escape = function(obj) {
    return Object.keys(obj).map(function(key) {

      return escape(key, obj[key]);

    }).join('&');
  };

  Sync.equal = function(first, second) {

    if (!first && !second) {
      return true;
    } if (toString.call(first) !== toString.call(second)
      || first.length !== second.length) {
      return false;
    } else {
      return equal(first, second, Sync.equal);
    }

  };

  Sync.unscape = function(string) {
    if (typeof string !== 'string') return null;

    return string.split('&').reduce(function(result, prop) {
      if (prop) {
        prop = prop.split('=');
        result[prop[0]] = decodeURIComponent(prop[1]);
      }
      return result;
    }, {});

  };

}(this));
