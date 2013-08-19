;(function(window) {
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
    if (!performance.now) {
      performance.now = performance.webkitNow || performance.msNow;
    }

    if (!performance.now) {
      return Date.now;
    }

    return function() {
      return performance.now();
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
      skewy: 'deg',
      matrix: ''
    },
    R_CAMEL_TO_CSS = /([A-Z])(?=[a-z])/g,
    DEFAULT_TRANSITION_DURATION = 300,
    DEFAULT_TRANSITION_FUNCTION = 'ease',
    DEFAULT_TRANSITION_DELAY = 0,
    STYLE_MAP = {
      transition: transitionProperty,
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
        }, 17);
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
  if (transitionProperty) {
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

      console.log(transition + '');

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
  }

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
    }, {
      key: 'matrix',
      len: 6
    }].forEach(function(prop) {
      var key = prop.key,
        len = prop.len;

      var transform = Transform[key] = function() {
        var args = slice.call(arguments, 0, len).map(function(arg) {
          return arg !== void 0 ?
            parseFloat(arg) + TRANSFORM_2D_MAP[key.toLowerCase()] : 0;
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
