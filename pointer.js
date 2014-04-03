;(function(Sync) {
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

  var findScrollParent = function(parent, computed) {
    var parents = [{
        computed: computed,
        element: parent
      }],
      needBreak;

    while (parent && (parent = parent.parentElement)) {
      // if (parent === document.documentElement) break;

      computed = null;

      if ((parent.scrollHeight > parent.clientHeight &&
        (computed = getComputedStyle(parent)).overflowY !== 'hidden' &&
        computed.overflowY !== 'visible') ||

        (parent.scrollWidth > parent.clientWidth &&
        (computed || (computed = getComputedStyle(parent)))
        .overflowX !== 'hidden' && computed.overflowX !== 'visible') ||

        (computed || (computed = getComputedStyle(parent))).position === 'fixed'
      ) {
        needBreak = true;
      }

      parents.push({
        element: parent,
        computed: computed
      });

      if (needBreak) {
        break;
      }

      needBreak = false;
    }

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
              needEnter = (!lastEnterTarget || !lastEnterTarget !== target),
              computed = isPrimary && getComputedStyle(target),
              parents;

            var touchData = touchesMap[id] = {
              pointer: pointer,
              time: e.timeStamp,
              // startTouch: Sync.extend({}, touch),
              startTouch: startTouch,
              startTarget: target,
              prevTarget: target,
              computed: isPrimary && needFastClick && computed
            };

            if (isPrimary) {
              parents = findScrollParent(target, computed);

              var touchAction = true;

              parents.some(function(parent) {
                var element = parent.element,
                  computed = parent.computed || getComputedStyle(element),
                  action = computed.touchAction ||
                    computed.content.split(/\s*;\s*/).reduce(function(result, rule) {
                      if (result) {
                        return result;
                      }

                      rule = rule.split(/\s*:\s*/);

                      if (rule[0] === 'touch-action') {
                        return rule[1];
                      }

                      return result;
                    }, '');

                if (action === 'none') {
                  touchAction = false;
                  return true;
                }
              });
  
              // !touchAction === noScroll
              touchData.touchAction = touchAction;
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

            if (isPrimary && !touchDevice.mouseEventsPrevented && !canceled) {
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

              if (!e._fastClick && touchData) {
                if (!touchData.ended) {
                  touchData.clicked = true;
                } else {
                  touchDevice.prevPrimaryTouch = touchDevice.currentPrimaryTouch;
                  touchDevice.currentPrimaryTouch = null;
                }
              }

              if (touchData && touchData.ignoreTouch) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
              } else {
                callback.call(this, e);
              }
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
}(Sync));