/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

;(function(window, undefined) {

  "use strict";

  var toString = Object.prototype.toString,
    valueOf = Object.prototype.valueOf,
    hasOwn = Object.prototype.hasOwnProperty,
    arrayProto = Array.prototype,
    Sync = window.Sync = function Sync() {

    },

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
    inherits = function(parent, handler, proto, meta){
      handler || (handler = function(){});
      var newClass = function(){
        var self = this;
        if(!(this instanceof newClass)){
          self = Object.create(newClass.prototype);
        };
        parent.apply(self, arguments);
        handler.apply(self, arguments);
        return self;
      };
      newClass.prototype = Object.create(parent.prototype);
      newClass.prototype.__super__ = parent;
      newClass.prototype.__parent__ = parent;
      newClass.prototype.constructor = newClass;
      Sync.extend(true, newClass.prototype, proto);
      return newClass;
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

        if (recurse
          && (isObject(value))
          && (to[key] && overwrite
          || !to[key])) {

          if (!Array.isArray(to[key]) && !isObject(to[key])) {
            to[key] = Array.isArray(value) ? [] : {};
          }

          extend(recurse, to[key], value, overwrite);

        } else {
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

}(this));
