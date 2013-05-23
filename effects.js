;(function() {
  'use strict';

  var vendors = 'webkit|moz|ms|o'.split('|'),
    events = {
      transition: 'transitionend'
    },
    eventsMap = {
      'webkit': 'webkitTransitionEnd',
      'moz': 'transitionend',
      'ms': 'MSTransitionEnd',
      'o': 'OTransitionEnd'
    },
    transitionProperty = 'Transition',
    transitionVendor = '',
    transformProperty = 'Transform',
    transformOrigin,
    transformStyle,
    style = document.createElement('div').style;

  var camelToCss = function(str, w) {
    return '-' + w.toLowerCase();
  },
  hasOwn = Object.prototype.hasOwnProperty;

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

  if (transformProperty.toLowerCase() in style) {
    transformProperty = transformProperty.toLowerCase();
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

  style = null;

  if (!transitionProperty || !transformProperty) {
    throw new Error('Browser does not supported CSS effects');
  }

  var TRANSFORM_2D_MAP = {
      translate: 'px',
      translatex: 'px',
      translatey: 'px',
      scale: '',
      scalex: '',
      sclaey: '',
      rotate: 'deg',
      skew: 'deg',
      skewx: 'deg',
      skewy: 'deg'
    },
    R_CAMEL_TO_CSS = /([A-Z])(?=[a-z])/g,
    DEFAULT_TRANSITION_DURATION = 300,
    DEFAULT_TRANSITION_FUNCTION = 'linear',
    DEFAULT_TRANSITION_DELAY = 0,
    STYLE_MAP = {
      transition: transitionProperty,
      transform: transformProperty,
      transformOrigin: transformOrigin,
      transformStyle: transformStyle
    };

    var Transition = function(params, duration, timing, delay) {
      var stack = this.stack = [];

      params || (params = []);

      params.forEach(function(key) {

        key = STYLE_MAP[key] || key;

        stack.push([
          key.replace(R_CAMEL_TO_CSS, camelToCss),
          (duration || DEFAULT_TRANSITION_DURATION) + 'ms',
          (timing || DEFAULT_TRANSITION_FUNCTION),
          (delay || DEFAULT_TRANSITION_DELAY) + 'ms'
        ].join(' '));

      });
    };

    Transition.stop = function(element) {
      element.style[transitionProperty] = 'null';
    };

    Transition.run = function(elem, props, params, callback) {
      var transition = [],
        style = elem.style,
        keys = Object.keys(props),
        count = keys.length,
        cssProps = {};

      if (typeof params === 'function') {
        callback = params;
        params = {};
      }

      params || (params = {});

      keys.forEach(function(key) {
        var newKey = STYLE_MAP[key] || key,
          cssKey = newKey.replace(R_CAMEL_TO_CSS, camelToCss);
        transition.push(newKey);
        style[newKey] = props[key];
        cssProps[cssKey] = 1;
      });

      elem.addEventListener(eventName, function transitionListener(e) {
        if (e.eventPhase !== e.AT_TARGET) return;

        var property = e.propertyName;

        if (property in cssProps && count) {
          delete cssProps[property];
          if (!--count) {
            elem.removeEventListener(eventName, transitionListener, true);
            callback && callback.call(this, e);
            style[transitionProperty] = '';
          }
        }

      }, true);

      style[transitionProperty] = new Transition(
        transition, params.duration, params.timing, params.delay);

    };

    Transition.prototype = {
      toString: function() {
        return this.stack.join(', ');
      }
    };

    // Transform section

    var Transform = function(map) {
      var stack = this.stack = [];

      Sync.each(map, function(val, key) {
        if (hasOwn.call(this, key)) {
          this[key].apply(this, val);
        }
      }, this);

      // Object.keys(map).forEach(function(name) {
      //   stack
      //     .push(name + '(' + (map[name] + '')
      //     .replace(/\s*(,)|$\s*/g, TRANSFORM_2D_MAP[name.toLowerCase()] + '$1') + ')');
      // });
    };

    // 2d transforms

    [{
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
    }].forEach(function(prop) {
      var key = prop.key,
        len = prop.len;

      Transform[key] = function() {
        var args = Array.prototype.slice(0, len).map(arguments, function(arg) {
          return parseInt(arg) + TRANSFORM_2D_MAP[key.toLowerCase()];
        });

        return key + '(' + args.join(',') + ')';
      };

      Transform.prototype[key] = function() {
        this.stack.push(Transform[key].apply(null, arguments));
        return this;
      };
    });

    Transform.prototype.toString = function() {
      return this.stack.join(' ');
    };
}());