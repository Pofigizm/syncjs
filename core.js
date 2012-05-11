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
	NOT_ENUMERABLE = [
		'prototype',
		'__proto__'
	],
	each = Sync.each = function(obj, fn) {
		var key, args = arrayProto.slice.call(arguments, 2);

		if (typeof fn != 'function') {
      throw new TypeError('window.tools.each - wrong arguments "fn"');
    }

		for (key in obj) {
      hasOwn.call(obj, key)
        && NOT_ENUMERABLE.indexOf(key) === -1
        && fn(key, obj[key], args);
    }

		return obj;
	},
	
	//function for inhrerits some classes
	//expect one require argument - config
	//which describes the 
	// - "parent" - constructor, that need to be inherited
	// - "proto" - object, that will be added
	//to newly created constructor
	inherits = Sync.inherits = function(config) {
		config = config || {};

		var parent = typeof config.parent === 'function' && config.parent;

		if (!parent) return null;

    var newClass = function() {
      var self = parent.apply(this, arguments) || this;
      self = config.handler && config.handler.apply(self, arguments) || self;
      if(self !== undefined && self !== this) return self;
    };

		extend(extend(newClass.prototype = Object.create(parent.prototype),
        config.proto).constructor = newClass, config.meta, {
        __parent__: parent
      });

		return newClass;
	},

	//indicates that first passed argument
	//is object or not

	isObject = Sync.isObject = function(obj) {
		obj = valueOf.call(obj);
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
      overwrite = args[--end]
    }

		for (; start < end; start++) {
			each(args[start], function(key, value) {
				if (recurse
            && isObject(value)
            && to[key]
            && (isObject(to[key]) || (to[key] = {}))) {
					extend(recurse, to[key], value, overwrite);
				} else {
					!overwrite && key in to || (to[key] = value);
				}
			});
		}

		return to;
	},
	userAgent = window.navigator.userAgent.toLowerCase();
	Sync.ua = (function(arr, ua) {
		ua[(ua.ver = arr[2]) && (ua.name = arr[1])] = true;
		return ua;
	}(
		/(firefox)\/([\d\.]+)/.exec(userAgent) ||
		/(chrome)\/([\d\.]+)/.exec(userAgent) ||
		/(opera)(?:.*)version\/([\d\.]+)/.exec(userAgent) ||
		/ms(ie) ([\d\.]+)/.exec(userAgent) ||
		/(safari)\/([\d\.]+)/.exec(userAgent.replace(/(version)(.*)(safari)/, '$3$2$1')) || [], {}));

}(this));
