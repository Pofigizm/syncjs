;(function(Sync) {
  var navigator = window.navigator,
    pointers = {
      flags: {
        IMMEDIATE_POINTER_LEAVE: true,
        DETECT_CHROME_VERSION: true,
        DETECT_CHROME_BEHAVIOR: true,
        MOUSE_EVENTS: true,
        TOUCH_EVENTS: true,
        FIX_FLING_STOP: true,
        // Two main issues for this:
        // * firefox prevents contextmenu on stopPropagation()
        //   on 'contextmenu' event (https://bugzilla.mozilla.org/show_bug.cgi?id=998940)
        // * Android Stock Browser (prior to 4.4) fires compatibilty
        //   mouse-events before touchstart
        HANDLE_MOUSE_EVENTS_ANDROID: false,
        TOUCHMOVE_SLOP_SIZE: 10,
        // one of: auto, pointers-first, touch-first
        TOUCH_COMPATIBILITY_MODE: 'touch-first',
        PINCH_ZOOM_BEHAVIOR_PROPAGATION: false
      },
      devices: {}
    };
  
  Sync.pointers = pointers;

  if (window.PointerEvent) return;

  var events = Sync.events,
    natives = events.natives,
    hasOwn = Object.prototype.hasOwnProperty,
    slice = Array.prototype.slice,
    pow = Math.pow,
    abs = Math.abs,
    uidInc = 0,
    hasTouch = true || 'ontouchstart' in document,
    logger = new Sync.Logger('pointers');

  {
    var ua = navigator.userAgent.toLowerCase(),
      vendorStr = (navigator.vendor || '').toLowerCase(),
      vendor = ['google', 'yandex', 'opera', 'mozilla', {
        search: 'research in motion',
        key: 'rim'
      }].reduce(function(result, key) {
        if (typeof key !== 'string') {
          var found = vendorStr.indexOf(key.search) !== -1;
          result[key.key] = found;
        } else {
          found = vendorStr.indexOf(key) !== -1;
          result[key] = found;
        }

        return result;
      }, {}),
      isV8 = !!(window.v8Intl || (window.Intl && Intl.v8BreakIterator)),
      isAndroidStockium = false,
      isAndroidStock = 'isApplicationInstalled' in navigator ||
        (isAndroidStockium = isV8 && !window.chrome && vendor.google),
      isChrome = !!window.chrome && !isAndroidStock,
      isFx = !!navigator.mozApps,
      isAndroidFx = isFx && (navigator.appVersion || '')
        .toLowerCase().indexOf('android') !== -1,
      // need to check chrome not by UserAgent
      // chrome for android has not plugins and extensions
      // but on desktop plugins also might be disabled
      // so we need to check by the ability to install extensions
      isChromeAndroid = isChrome &&
        ('startActivity' in navigator || !chrome.webstore),
      isAndroid = isAndroidStock || isChromeAndroid || isAndroidFx ||
        (!isAndroidStock && !isChromeAndroid && !isAndroidFx) && 
          ua.indexOf('android') !== -1,
      isIOS = !isAndroid &&
        hasOwn.call(navigator, 'standalone') && 'ongesturestart' in window/* !!window.getSearchEngine*/ /*,
      isBadTargetIOS = isIOS && /OS ([6-9]|\d{2})_\d/.test(navigator.userAgent)*/,

      // chrome 32+
      isChromeBelow31 = isChrome && 'vibrate' in navigator &&
        'getContextAttributes' in document.createElement('canvas').getContext('2d'),
      isBB10 = navigator.platform.toLowerCase() === 'blackberry' && vendor.rim;
  }

  console.log(JSON.stringify({
    isV8: isV8,
    isAndroid: isAndroid,
    isChrome: isChrome,
    isChromeAndroid: isChromeAndroid,
    isAndroidStock: isAndroidStock,
    isFx: isFx,
    isAndroidFx: isAndroidFx,
    isIOS: isIOS
  }));

  // chrome 18 window.Intent
  // chrome 18 navigator.startActivity
  // chrome 18 chrome.appNotifications
  // chrome 18 chrome.setSuggestResult
  // chrome 18 chrome.searchBox
  // chrome 18 chrome.webstore
  // chrome 18 chrome.app

  // android stock chrome.searchBox
  // android stock navigator.isApplicationInstalled
  // android stock navigator.connection

  // chrome android latest inc isV8

  // chrome desktop chrome.app
  // chrome desktop chrome.webstore
  // inc isV8

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

  var devices = pointers.devices,
    flags = pointers.flags,
    pointersMap = {},
    idCounter = 0,
    hasTouchListeners,
    hasMouseListeners,
    hasPointerListeners;
  
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
  extendDOMObject = function(dist, source) {
    for (var key in source) {
      dist[key] = source[key];
    }

    return dist;
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

  events.setETCustom('Element', 'setPointerCapture', function(pointerId, options) {
    var pointer = pointersMap[pointerId],
      element = this;

    if (!pointer) {
      throw new (window.DOMException || window.Error)('InvalidPointerId');
    }

    if (!this.parentNode) {
      throw new (window.DOMException || window.Error)('');
    }

    if (!pointer.buttons) return;

    if (pointer.captured) {
      implicitReleaseCapture(pointer);
    }

    var device = pointers.getDevice(pointer.type),
      trackBoundaries = (options ? options.trackBoundaries : true) !== false;

    device.capturePointer(element, pointer);

    pointer.captured = true;
    pointer.captureElement = element;
    pointer.captureTrackBoundaries = trackBoundaries;

    pointer.dispatchEvent(element, 'gotpointercapture', {
      // mouse dict
      relatedTarget: null,
      cancelable: false,
      bubbles: true
    }, {
      // pointer dict
    }, false);
  }, {
    writable: true,
    configurable: true,
    enumerable: false
  });

  events.setETCustom('Element', 'releasePointerCapture', function(pointerId) {
    var pointer = pointersMap[pointerId],
      element = this;

    if (!pointer) {
      throw new (window.DOMException || window.Error)('InvalidPointerId');
    }

    if (!pointer.captured) return;

    var device = pointers.getDevice(pointer.type);

    device.releasePointer(element, pointer);

    pointer.captured = false;
    pointer.captureElement = null;
    pointer.captureTrackBoundaries = void 0;

    pointer.dispatchEvent(element, 'lostpointercapture', {
      // mouse dict
      relatedTarget: null,
      cancelable: false,
      bubbles: true
    }, {
      // pointer dict
    }, false);
  }, {
    writable: true,
    configurable: true,
    enumerable: false
  });

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
          triggerDeviceListeners(this, event);
          !hasPointerListeners && (hasPointerListeners = true);

          events.addEvent(this, full, {
            handler: callback,
            callback: callback,
            capture: capture,
            method: synced.addEventListener
          });
        },
        removeEventListener: function(type, callback, capture) {
          muteDeviceListeners(this, event);

          events.addEvent(this, full, {
            callback: callback,
            capture: capture,
            method: synced.removeEventListener
          });
        }
      }
    });
  });

  window.PointerEvent = function(type, options) {
    var event = new window.MouseEvent(type, options);

    POINTER_FIELDS.forEach(function(field) {
      if (!hasOwn.call(event, field)) {
        event[field] = hasOwn.call(options, field) ?
          options[field] : POINTER_DEFAULTS[field];
      }
    });

    event = events.shadowEventProp(event, {
      'button': options.button,
      'buttons': options.buttons
    });

    return event;
  };

  pointers.getDevice = function(type) {
    return devices[type] || null;
  };

  pointers.getNextId =  function() {
    if (idCounter >= Number.MAX_VALUE) {
      return (idCounter = 0);
    }

    return idCounter++;
  };

  pointers.Device = function(type) {
    this.type = type;
    this.pointers = [];

    // spec is not clear about canceling all device or pointer
    // it says:
    // cancel all events of type;
    // so that is a device
    this.mouseEventsPrevented = false;

    if (hasOwn.call(devices, type)) {
      logger.log('Duplicate of device:', type);
      throw new Error();
    }

    logger.log('New device:', type);
    devices[type] = this;
  };

  pointers.Device.prototype = {
    createPointer: function() {
      var pointer = new pointers.Pointer(this);

      return pointer;
    },
    isPrimaryPointer: function(pointer) {
      return this.pointers[0] === pointer;
    },
    addPointer: function(pointer) {
      var isPrimary = !this.pointers.length;

      this.pointers.push(pointer);

      if (isPrimary) {
        this.primaryPointer = pointer;
      }
    },
    removePointer: function(pointer) {
      var devicePointers = this.pointers,
        index = devicePointers.indexOf(pointer);

      if (index !== -1) {
        devicePointers.splice(index, 1);

        if (pointer === this.primaryPointer) {
          this.primaryPointer = null;
        }
      }
    },
    primaryPointer: null
  };

  pointers.Pointer = function(device) {
    this.device = device;
    this.id = pointers.getNextId();
    this.type = device.type;
    this.buttons = 0;

    pointersMap[this.id] = this;
    device.addPointer(this);
  };

  pointers.Pointer.prototype = {
    get isPrimary() {
      return this.device.primaryPointer === this;
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
      pointersMap[this.id] = null;
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
    dispatchEvent: function(node, event, mouseEventDict, options, prefixed) {
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

      return events.dispatchEvent(node, 
        (prefixed === false ? '' : POINTER_PREFIX) + event, {
        type: 'PointerEvent',
        options: dict
      });
    },
    captured: false,
    captureElement: null
  };

  // ###################

  var viewport = (function() {
    var metaViewport = document.querySelector('meta[name="viewport"]'),
      metaContent = metaViewport && metaViewport.content.toLowerCase(),
      hasScale = !metaContent;

    if (metaContent) {
      var userScalable = metaContent.indexOf('user-scalable=no') === -1,
        maximumScale = (metaContent.match(/maximum-scale=([\d\.]+?)/) || [])[1],
        minimumScale = (metaContent.match(/minimum-scale=([\d\.]+?)/) || [])[1];

      hasScale = userScalable ||
        // Android stock does not support minimum scale
        (maximumScale === minimumScale && !isAndroidStock);
    }

    return {
      meta: metaViewport,
      scaleAllowed: hasScale
    };
  }()),
  mayNeedFastClick = (function() {
    if (viewport.meta) {
      // Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
      // https://github.com/ftlabs/fastclick/issues/89

      // under question is false for Fx with his strange behavior when touch hold
      // also trigger click (some thing about 600ms after touchstart)
      if ((isChromeAndroid || isBB10 || isAndroidFx) && !viewport.scaleAllowed) {
        return false;
      }

      // Chrome 32 and above with width=device-width or less don't need FastClick
      if (flags.DETECT_CHROME_VERSION && isChromeAndroid && isChromeBelow31 &&
        // https://github.com/jakearchibald/fastclick/commit/4aedb2129c6e7daf146f0b8d2f933b8779a9f486
        // some fix from FastClick, need more research about those properties
        // and page zooming
          window.innerWidth <= window.screen.width) {
        return false;
      }
    }

    // scaled viewport
    if (viewport.scaleAllowed) {
      return false;
    }

    return true;
  }()),
  findScrollAncestors = function(parent, computed, iterator) {
    var parents = [{
        computed: computed,
        element: parent
      }],
      isScrollable,
      iterate = typeof iterator === 'function',
      isLast,
      parentData;

    while (parent) {
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
        isScrollable = true;
      }

      parents.push(parentData = {
        element: parent,
        computed: computed,
        scrollable: isScrollable
      });

      if (!(parent = parent.parentElement)) {
        isLast = true;
      }

      if (iterate) {
        iterator(parentData, isLast);
      }

      isScrollable = false;
    }

    parentData = parent = computed = null;

    return parents;
  },
  implicitReleaseCapture = function(pointer) { console.log('implicit release', pointer);
    var captured = pointer.captured;

    if (captured) {
      pointer.captureElement.releasePointerCapture(pointer.id);
    }
  },
  setOverflowHiddenY = false && (isChromeAndroid || isAndroidStock) ? function(node) {
    var createShadowRoot = (node.createShadowRoot || node.webkitCreateShadowRoot);

    if (!createShadowRoot) {
      node.style.overflowY = 'hidden';
      return;
    }

    var overflowMarkup = '<div class="yyy" style="width: 100%; overflow: visible; position: relative;height: 100%;">' +
      '<div class="xxx" style="/*height: 293px;*/ overflow: hidden; position: absolute;"><div class="zzz" style="/*height: 283px;*/ overflow: visible;">' +
      '<content></content><div style="float: right; width: 0; height:0"></div></div></div></div>';

    root.innerHTML = overflowMarkup;

    var computed = window.getComputedStyle(node),
      paddingTop = parseFloat(computed.paddingTop),
      paddingBottom = parseFloat(computed.paddingBottom),
      borderTop = parseFloat(computed.borderTop),
      borderBottom = parseFloat(computed.borderBottom),
      clientHeight = node.clientHeight,
      innerHeight = clientHeight - (paddingTop + paddingBottom),
      innerWidth = node.clientWidth -
        (parseFloat(computed.paddingLeft) + parseFloat(computed.paddingRight)),
      scrollerHeight = node.offsetHeight -
        clientHeight - (borderTop + borderBottom);

    var xxx = root.querySelector('xxx'),
      zzz = root.querySelector('zzz');

    xxx.style.height = innerHeight + paddingTop + 'px';
    zzz.style.position = 'absolute';
    zzz.style.height = innerHeight + 'px';
    zzz.style.width = innerWidth + 'px';
  } : function(node) {
    node.style.overflowY = 'hidden';
  },
  setOverflowHiddenX = function(node) {
    node.style.overflowX = 'hidden';
  };

  console.log('mayNeedFastClick:', mayNeedFastClick);

  // touch type

  hasTouch && (function() {
    var touchDevice = new pointers.Device('touch'),
      touchNatives = {},
      touchesMap = {},
      touchBindings = {
        move: function(e, type) {
          var targetTouches = e.targetTouches,
            touchCanceled,
            touchDispatched;

          preHandleTouchMove(e, type);

          var handleTouch = function(touch) {
            var id = touch.identifier,
              touchData = touchesMap[id];

            if (!touchData) return;

            // prevent click firing on scroll stop by touch surface
            // .. for iOS
            if (isIOS) {
              fixIOSScroll(touchData);
            }

            if (touchData.ignoreTouch) return;

            var fireTouchEvents = hasTouchListeners && flags.TOUCH_EVENTS,
              touchStartCanceled = touchData.touchStartCanceled;

            if (fireTouchEvents && !touchDispatched) {
              touchDispatched = true;
              touchCanceled = !dispatchTouchEvent('move', touchData.startTarget, e);
            }

            var lastEnterTarget = touchDevice.lastEnterTarget,
              pointer = touchData.pointer,
              captured = pointer.captured,
              needHitTest = !captured || pointer.captureTrackBoundaries,
              isPrimary = pointer.isPrimary,
              prevTarget = touchData.prevTarget,
              touchAction = touchData.touchAction,
              // getting new target for event not more than once per 10ms
              getTarget = touchData.getTarget ||
                (touchData.getTarget = debunce(doHitTest, 10, false)),
              target = needHitTest ?
                getTarget(touch) || prevTarget : prevTarget,
              movedOut = touchData.movedOut,
              isFirstMove,
              fireMouseEvents;

            if (touchData.touchMoveCanceled = touchCanceled) {
              touchData.fireMouseEvents = false;
              console.log('prevent mouse events: touchmove');
            }

            fireMouseEvents = touchData.fireMouseEvents;

            if (!touchData.moved) {
              touchData.moved = isFirstMove = true;
            }

            if (needHitTest && target !== prevTarget) {
              handleTouchMove(
                touch,
                touchData,
                pointer,
                isPrimary,
                target,
                prevTarget
              );
            }

            // override potentially hit tested target to capture target, if exist
            captured && (target = pointer.captureElement);

            var moveDict = getMouseDict(touch, {
              bubbles: true,
              cancelable: true,
              button: 0,
              buttons: 1,
              relatedTarget: null
            });

            // fire pointer move
            // here is question:
            // always fire one pointermove even is next 'll be pointercancel
            // or do something special
            pointer.dispatchEvent(target, 'move', moveDict);

            if (!isPrimary) return;

            if (touchData.stream.isZoomPrevented) {
              touchData.needFastClick = false;
              return;
            }

            if (fireMouseEvents && !touchDevice.mouseEventsPrevented) {
              dispatchMouseEvent('move', target, moveDict);
            }

            // prevent scroll if touch canceled
            // or if none touchAction for this element
            if (touchCanceled || (!touchAction === touchActionBits['none'] &&
              // for touchStartCanceled this work already did
              movedOut && !touchStartCanceled)
            ) {
              // console.log('cancel fast click by moved out');
              touchData.needFastClick = false;
              // console.log('prevent touchmove by !touchAction');
              e.preventDefault();

              // remove touchmove listeners here
              return;
            }

            // handle not consumed touch behavior
            if (touchAction !== touchActionBits['none'] &&
              !touchStartCanceled && !touchCanceled) {
              // cannot detect opera via isChrome but Ya and Cr is
              var needIgnore = isAndroid &&
                (flags.DETECT_CHROME_BEHAVIOR ? !isChrome : true);

              if (!isAndroid && movedOut) {
                needIgnore = true;
              }

              var startTarget = touchData.startTarget;

              if (touchData.startTargetNodeName === 'input' &&
                  startTarget.type === 'range') {
                needIgnore = false;
              }

              if (needIgnore) {
                touchData.ignoreTouch = true;
                touchData.needFastClick = false;
                console.log('canceled fast click be ignore');

                handleTouchCancel(
                  touch,
                  touchData,
                  pointer,
                  isPrimary,
                  target,
                  prevTarget,
                  e
                );
              }

              if (mayNeedFastClick) {
                unbindScrollFix(touchDevice.prevPrimaryTouch);
                bindScrollFix(touchData);
              }
            }
          };

          if (targetTouches.length) {
            slice.call(targetTouches).forEach(handleTouch);
          } else {
            handleTouch(targetTouches[0]);
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
              captured = pointer.captured,
              needHitTest = !captured || pointer.captureTrackBoundaries,
              isPrimary = pointer.isPrimary,
              prevTarget = touchData.prevTarget,
              getTarget = touchData.getTarget,
              target = needHitTest ?
                getTarget && getTarget(touch) || prevTarget : prevTarget;

            if (isPrimary) {
              touchData.timedOut =
                e.timeStamp - touchData.startTime >= TOUCH_CLICK_TIMEOUT;
              touchData.ended = true;
            }

            if (needHitTest && !touchData.ignoreTouch && prevTarget !== target) {
              handleTouchMove(
                touch,
                touchData,
                pointer,
                isPrimary,
                target, 
                prevTarget
              );
            }

            // override potentially hit tested target to capture target, if exist
            captured && (target = pointer.captureElement);

            var touchCanceled = !dispatchTouchEvent('end', touchData.startTarget,
                e, document.createTouchList(touch)),
              fireTouchEvents;

            if (touchData.touchEndCanceled = touchCanceled) {
              touchData.fireMouseEvents = false;
              console.log('prevent mouse events: touchend');
            }

            console.log('ignore end:', touchData.ignoreTouch);

            if (!touchData.ignoreTouch) {
              handleTouchEnd(touch, touchData, pointer,
                isPrimary, target, prevTarget, e);
            }

            cleanUpTouch(touchData);

            if (!e.targetTouches.length) {
              removeTouchBindings(touchData.startTarget, type);
            }
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
              captured = pointer.captured,
              isPrimary = pointer.isPrimary,
              prevTarget = touchData.prevTarget,
              getTarget = touchData.getTarget,
              // remove hit test from pointercancel event
              // target = getTarget && getTarget(touch) || touch.target;
              target = captured ? pointer.captureElement :
                prevTarget || touch.target;

            if (isPrimary) {
              touchData.ended = true;
              touchData.canceled = true;
            }

            if (!touchData.ignoreTouch) {
              handleTouchCancel(touch, touchData, pointer,
                isPrimary, target, prevTarget, e);
            }

            cleanUpTouch(touchData);

            if (!e.targetTouches.length) {
              removeTouchBindings(touchData.startTarget, type);
            }
          };

          if (touches.length) {
            slice.call(touches).forEach(handleTouch);
          } else {
            handleTouch(touches[0]);
          }
        }
      },
      touchHelper = {
        stream: null,
        Stream: function() {
          this.touches = [];
        },
        getStream: function() {
          return this.stream;
        },
        useStream: function(touchData) {
          var stream = this.stream ||
            (this.stream = new this.Stream());

          stream.addTouchData(touchData);

          return stream;
        },
        leaveStream: function(touchData) {
          var stream = this.stream;

          if (!stream) {
            throw new Error('Cannot leave touch-stream without stream');
          }

          stream.removeTouchData(touchData);

          if (!stream.isActual) {
            this.stream = stream = null;
          }
        }
      };

    touchHelper.Stream.prototype = {
      state: '',
      addTouchData: function(touchData) {
        var touches = this.touches;

        if (!touches.length) {
          this.isActual = true;
        }

        touches.push(touchData);
      },
      removeTouchData: function(touchData) {
        var touches = this.touches,
          index = touches.indexOf(touchData);

        if (index !== -1) {
          touches.splice(index, 1);

          if (!touches.length) {
            this.isActual = false;
          }
        }
      },
      isActual: null
    };

    var touchActionBits = {
      'none'        : 1 << 0,
      'pan-x'       : 1 << 1,
      'pan-y'       : 1 << 2,
      'manipulation': 1 << 3,
      'auto'        : 1 << 4
    };

    touchActionBits['scroll'] =
      touchActionBits['pan-x'] | touchActionBits['pan-y'];

    var TOUCH_SCROLL_CACHE = 'touch_scroll_cache',
      TOUCH_LISTENERS_CACHE = 'touch_listeners_cache',
      SCROLL_FIX_DELAY = 500,
      TOUCH_CLICK_TIMEOUT = 800,
      ELEMENT_DISABLED_FOR_SCROLL = '_element_disabled_for_scroll_';

    var initTouchStart = function(e, type) {
      var touches = e.changedTouches,
        self = this;

      var handleTouch = function(touch) {
        var id = touch.identifier,
          lastEnterTarget = touchDevice.lastEnterTarget;

        // cannot handle more than one touch with same id
        if (touchesMap[id]) {
          return;
        }

        var target = touch.target,
          startTouch = {},
          pointer = touchDevice.createPointer(),
          // use this for differing event sequence
          nodeTouchListeners = Sync.cache(self)[TOUCH_LISTENERS_CACHE],
          fireTouchEvents = hasTouchListeners && flags.TOUCH_EVENTS,
          touchCanceled = fireTouchEvents &&
            !dispatchTouchEvent('start', target, e, document.createTouchList(touch));

        // firefox properties are from prototype
        // and cannot be moved by Object.keys
        extendDOMObject(startTouch, touch);
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
        needFastClick = isPrimary && mayNeedFastClick,
        needEnter = (!lastEnterTarget || lastEnterTarget !== target),
        computed = isPrimary && getComputedStyle(target),
        fireMouseEvents;

        var touchData = touchesMap[id] = {
          pointer: pointer,
          startTime: e.timeStamp,
          startTouch: startTouch,
          startTarget: target,
          prevTarget: target,
          multitouch: !isPrimary,
          computed: isPrimary && computed,
          touchId: id,
          touchStartCanceled: touchCanceled,
          _fireMouseEvents: !touchCanceled && isPrimary && flags.MOUSE_EVENTS,
          get fireMouseEvents() {
            return hasMouseListeners && this._fireMouseEvents;
          },
          set fireMouseEvents(val) {
            this._fireMouseEvents = val;
          },
          get startTargetNodeName() {
            var nodeName = this._startTargetNodeName;

            if (!nodeName) {
              nodeName = this._startTargetNodeName =
                this.startTarget.nodeName.toLowerCase();
            }

            return nodeName;
          }
        };

        touchData.stream = touchHelper.useStream(touchData);
        fireMouseEvents = touchData.fireMouseEvents;

        /*if (!isPrimary) {
          touchDevice.primary.multitouch = true;
        }*/

        if (touchCanceled) {
          e.preventDefault();
          // if touchstart is canceled:
          // no more touch-action
          // no more click
          // no more scroll
          // no more compatibility mouse events

          console.log('canceled fast click by touchstart cancellation');
          needFastClick = false;
        } else if (isPrimary) {
          updateDevicePrimary(touchData);
        }

        if (!touchCanceled) {
          var touchAction = touchActionBits['auto'],
            mergeIterator = mergeTouchActionIterator(),
            propagateUpToRoot,
            determinedAction,
            scrollables = [];

          var ancestors = findScrollAncestors(target, computed, function(parent, isLast) {
            var element = parent.element;

            if (parent.scrollable) {
              scrollables.push(parent);
            }

            if (!determinedAction) {
              var computed = parent.computed || getComputedStyle(element),
                action = getTouchAction(handleContentTouchAction(computed.content));

              action = mergeIterator(action);

              if (action === touchActionBits['none'] || isLast) {
                determinedAction = true;
              }

              if (!propagateUpToRoot && !determinedAction && parent.scrollable) {
                if (!flags.PINCH_ZOOM_BEHAVIOR_PROPAGATION ||
                  action <= touchActionBits['scroll']) {
                  determinedAction = true;
                } else {
                  propagateUpToRoot = true;
                }
              }

              if (determinedAction) {
                if (!action) {
                  debugger;
                }

                touchAction = action;
              }
            }

            // after first parent touchAction must be determined already
            if (parent.scrollable && determinedAction) {
              parent.scrollLeft = parent.element.scrollLeft;
              parent.scrollTop = parent.element.scrollTop;
            }
          });

          touchData.ancestors = ancestors;
          console.log('touchAction:', touchAction);

          if (touchAction > touchActionBits['none']) {
            scrollables.push({
              isWin: true,
              scrollLeft: window.pageXOffset,
              scrollTop: window.pageYOffset,
              element: window
            });

            touchData.scrollables = scrollables;
          }

          // should touch action be none when touch is canceler
          // or touchAction assignment should be moved out of 'if statement'
          // -> touchData.touchAction = touchAction || touchActionBits['auto'];
          touchData.touchAction = touchAction;
        }

        if (isPrimary && !touchCanceled) {
          var panX = touchAction === touchActionBits['pan-x'],
            panY = touchAction === touchActionBits['pan-y'];

          if (panX || panY) {
            var len = scrollables.length,
              scrollable;

            for (; --len;) {
              scrollable = scrollables[len];

              if (!scrollable.isWin) {
                (panX ? setOverflowHiddenY :
                  setOverflowHiddenX)(scrollable.element);
              }
            }
          }
        }

        if (!flags.IMMEDIATE_POINTER_LEAVE &&
            lastEnterTarget && !lastEnterTarget.contains(target)) {
          // this block should execute if leave event should be fired
          // not from pointerup/pointercancel event, but from pointerdown

          pointer.dispatchEvent(lastEnterTarget, 'leave', getMouseDict(touch, {
            bubbles: false,
            cancelable: false,
            button: 0,
            buttons: 0,
            relatedTarget: target
          }));
        }

        fireMouseEvents && dispatchMouseEvent(
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
        pointer.dispatchEvent(target, 'over', overDict);

        // compact mouseover
        fireMouseEvents && dispatchMouseEvent('over', target, overDict);

        if (needEnter) {
          var enterDict = getMouseDict(touch, {
            bubbles: false,
            cancelable: false,
            button: 0,
            buttons: 0,
            relatedTarget: lastEnterTarget
          });

          pointer.dispatchEvent(target, 'enter', enterDict);

          // compact mouseenter
          fireMouseEvents && dispatchMouseEvent('enter', target, enterDict);
          touchDevice.lastEnterTarget = target;
        }

        // pointerdown
        var pointerDownCanceled = !pointer.dispatchEvent(target, 'down', downDict);

        if (pointerDownCanceled) {
          // canceled pointerdown should prevent default actions
          // e.g. selection or focus
          // canceled pointerdown should _not_ prevent click or scroll
          // on e.preventDefault() we can simulate click, but cannot simulate scroll
          // so that method cannot be used, at least right now

          // needFastClick = true;
          // e.preventDefault();
          // logger.log('Prevented pointerdown');

          // prevent compatibility mouse events
          touchDevice.mouseEventsPrevented = true;
        }

        // compact mousedown
        if (fireMouseEvents && !pointerDownCanceled) {
          dispatchMouseEvent('down', target, downDict);
        }

        // this is case from fastclick.js library
        // in iOS only trusted events can deselect range
        // ...
        // in future we can simulate that action and remove this block
        if (!touchCanceled && isIOS) {
          var selection = window.getSelection();

          if (selection.rangeCount && !selection.isCollapsed) {
            needFastClick = false;
            logger.log('needFastClick = false; By range deselect iOS');
            console.log('needFastClick = false; By range deselect iOS');
          }
        }

        touchData.needFastClick = needFastClick;
        addTouchBindings(target, type);
      };

      if (touches.length) {
        slice.call(touches).forEach(handleTouch);
      } else {
        handleTouch(touches[0]);
      }
    },
    addTouchBindings = function(node, event) {
      Sync.each(touchBindings, function(fn, key) {
        var full = TOUCH_PREFIX + key;

        events.addEvent(node, full, {
          handler: function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();

            // console.log('called touch binding:', key);

            fn.call(this, e, event);
          },
          callback: fn,
          capture: /*capture*/ true,
          method: touchNatives[full].addEventListener,
          namespace: NS_TOUCH_POINTER
        });
      });
    },
    removeTouchBindings = function(node, event) {
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

    var dispatchMouseEvent = function(event, target, dict) {
      if (!dict.view) {
        dict.view = target.defaultView;
      }

      if (event === 'over') {
        // debugger;
      }

      return events.dispatchEvent(target, FAKE_PREFIX + MOUSE_PREFIX + event, {
        type: 'MouseEvent',
        options: dict
      });
    },
    dispatchTouchEvent = function(type, target, originalEvent, changedTouches) { return true;
      var newEvent = new UIEvent(FAKE_PREFIX + TOUCH_PREFIX + type, {
        bubbles: originalEvent.bubbles,
        cancelable: originalEvent.cancelable,
        view: originalEvent.view,
        detail: originalEvent.detail
      });

      newEvent.touches = originalEvent.touches;
      newEvent.targetTouches = originalEvent.targetTouches;
      newEvent.changedTouches = changedTouches || originalEvent.changedTouches;

      /*(originalEvent.ctrlKey, originalEvent.altKey,
        originalEvent.shiftKey, originalEvent.metaKey, originalEvent.touches,
        originalEvent.targetTouches, changedTouches || originalEvent.changedTouches,
        originalEvent.scale, originalEvent.rotation);*/

      console.log(newEvent);

      return target.dispatchEvent(newEvent);
    },
    cleanUpTouch = function(touchData) {
      var pointer = touchData.pointer,
        isPrimary = touchData.pointer.isPrimary;

      touchesMap[touchData.touchId] = null;
      touchDevice.lastEnterTarget = null;
      
      if (isPrimary) {
        touchDevice.mouseEventsPrevented = false;
      }

      pointer.destroy();

      if (isPrimary && touchData.clicked) {
        updateDevicePrimary();
      }

      touchHelper.leaveStream(touchData);
      // touchData.stream = null;

      pointer = touchData = null;
    },
    doHitTest = function(touch) {
      // and handle of pointer-events: none;
      var target = document.elementFromPoint(
        touch.clientX, touch.clientY);

      return target;
    },
    mergeTouchActionIterator = function() {
      var result = 0,
        scrollVal = touchActionBits['scroll'],
        isFirst = true,
        ended;

      return function(action) {
        if (ended || !action) return result;

        if (isFirst) {
          result = action;
          isFirst = false;
        } else if (action & scrollVal) {
          if (result & scrollVal) {
            result |= action;
          }

          if (result > scrollVal) {
            result = action;
          }
        } else if (result > action) {
          result = action;
        }

        if (result /* & */ === touchActionBits['none']) {
          ended = true;
        }

        return result;

        /*return {
          value: result,
          ended: ended
        };*/
      };
    },
    mergeTouchActionOld /*= window.mergeTouchAction*/ = function(array) {
      var result = array[0],
        scrollVal = (touchActionBits['pan-x'] | touchActionBits['pan-y']);

      for (var i = 1, len = array.length, action; i < len; i++) {
        action = array[i];

        if (action & scrollVal) {
          if (result & scrollVal) {
            result |= action;
          }

          if (result > scrollVal) {
            result = action;
          }
        } else if (result > action) {
          result = action;
        }

        if (result /* & */ === touchActionBits['none']) {
          break;
        }
      }

      return result;
    },
    mergeTouchAction = function(array) {
      var action = 0,
        iterator = mergeTouchActionIterator();

      for (var i = 0, len = array.length; i < len; i++) {
        action = iterator(array[i]);
      }

      return action;
    },
    handleContentTouchAction = function(content) {
      var action = content.replace(/^('|")([\s\S]*)(\1)$/, '$2').split(/\s*;\s*/).reduce(function(result, rule) {
        if (result) {
          return result;
        }

        rule = rule.split(/\s*:\s*/);

        if (rule[0] === 'touch-action') {
          return rule[1];
        }

        return result;
      }, '');

      return action;
    },
    getTouchAction /*= window.getTouchAction*/ = function(action) {
      var propError;

      action = action.split(/\s+/).reduce(function(res, key) {
        if (propError) return res;

        if (!hasOwn.call(touchActionBits, key)) {
          propError = true;
          return res;
        }

        var bit = touchActionBits[key];

        // console.log('res & bit:', res, bit, res & bit)

        if (res & bit) {
          propError = true;
          return res;
        }

        if (res && (bit & (touchActionBits.none |
          touchActionBits.auto |
          touchActionBits.manipulation))) {
          propError = true;
          return res;
        }

        return res | bit;
      }, 0);

      if (propError) {
        return touchActionBits['auto'];
      }

      return action;
    },
    getMouseDict = function(touch, options, show) {
      options || (options = {});

      [
        'screenX', 'screenY',
        'clientX', 'clientY',
        'pageX', 'pageY',
        'ctrlKey', 'altKey',
        'shiftKey', 'metaKey'
      ].forEach(function(prop) {
        var z = touch[prop];

        if (z === 'pageX') {
          z += pageXOffset;
        }

        if (z === 'pageY') {
          z += pageYOffset;
        }

        options[prop] = z;

        if (show) {
          // console.log(prop + ':', z);
        }
      });

      return options;
    },
    checkForMovedOut = function(touchData, touch, isFirstMove) {
      var startTouch = touchData.startTouch,
        slopSize = flags.TOUCHMOVE_SLOP_SIZE,
        movedOut = touchData.movedOut;

      if (movedOut) {
        return movedOut;
      }

      var dirX = startTouch.clientX - touch.clientX,
        dirY = startTouch.clientY - touch.clientY,
        absX = abs(dirX),
        absY = abs(dirY);

      if (!movedOut && ((isAndroid && isFirstMove) ||
          absX >= slopSize || absY >= slopSize)
      ) {
        movedOut = touchData.movedOut = true;
        touchData.needFastClick = false;
        touchData.panAxis = absX > absY ? 'x' : 'y';
        touchData.panDir = (absX > absY ? dirX : dirY) > 0 ? 1 : -1;

        console.log('canceld fast click by check for move');
        logger.log('Pointer moved out of slop');
      }

      return movedOut;
    },
    preHandleTouchMove = function(e, type) {
      var isFirstMove,
        eTouches = e.touches,
        touches = [],
        touchActions = [],
        touchAction,
        movedOutData;

      var i = 0,
        len = eTouches.length,
        touch,
        touchData;

      for (; i < len; i++) {
        touch = eTouches[i];
        touchData = touchesMap[touch.identifier];
        
        if (touchData) {
          touches.push(touchData);
          touchActions.push(touchData.touchAction);

          if (checkForMovedOut(touchData, touch, !touchData.moved)) {
            movedOutData = touchData;
          }

          if (isFirstMove !== false) {
            isFirstMove = !touchData.moved;
          }
        }
      }

      // stream must always be when where is touches
      // especially on first touch move
      var stream = touchHelper.getStream();

      if (isFirstMove) {
        touchAction = mergeTouchAction(touchActions);
        console.log('touchActions:', touchActions, 'touchAction:', touchAction);

        var isZoom = stream.isZoom = (touches.length > 1 && viewport.scaleAllowed);

        if (isZoom) {
          stream.isGeastureDetermined = true;
        }

        if (isZoom && touchAction < touchActionBits['manipulation']) {
          stream.isZoomPrevented = true;
          e.preventDefault();
        }
      }

      if (!stream.isZoom && movedOutData) {

      }
    },
    handleTouchMove = function(touch, touchData, pointer, isPrimary, target, prevTarget) {
      var fireMouseEvents = touchData.fireMouseEvents,
        captured = pointer.captured,
        needOver = !captured ||
          target === pointer.captureElement,
        needOut = !captured ||
          prevTarget === pointer.captureElement;

      touchData.prevTarget = target;

      var outDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 1,
        relatedTarget: captured ? null : target // prev target goes here
      }),
      overDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 1,
        relatedTarget: captured ? null : prevTarget // prev target goes here
      }),
      enterDict = getMouseDict(touch, {
        bubbles: false,
        cancelable: false,
        button: 0,
        buttons: 1,
        relatedTarget: captured ? null : prevTarget // prev target goes here
      });

      if (needOut) {
        pointer.dispatchEvent(prevTarget, 'out', outDict);
        fireMouseEvents && dispatchMouseEvent('out', prevTarget, outDict);
      }

      if (needOut && !prevTarget.contains(target)) {
        var leaveDict = getMouseDict(touch, {
          bubbles: false,
          cancelable: false,
          button: 0,
          buttons: 1,
          relatedTarget: captured ? null : target // prev target goes here
        });

        pointer.dispatchEvent(prevTarget, 'leave', leaveDict);
        fireMouseEvents && dispatchMouseEvent('leave', prevTarget, leaveDict);
      }

      if (needOver) {
        pointer.dispatchEvent(target, 'over', overDict);
        fireMouseEvents && dispatchMouseEvent('over', target, overDict);

        pointer.dispatchEvent(target, 'enter', enterDict);
        fireMouseEvents && dispatchMouseEvent('enter', target, enterDict);
      }
    },
    handleTouchCancel = function(touch, touchData, pointer, isPrimary, target, prevTarget, e) {
      var fireMouseEvents = touchData.fireMouseEvents;

      dispatchTouchEvent('cancel', touchData.startTarget,
        e, document.createTouchList(touch));

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
      }),
      outDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        relatedTarget: null
      }),
      leaveDict = getMouseDict(touch, {
        bubbles: false,
        cancelable: false,
        button: 0,
        buttons: 0,
        relatedTarget: null
      });

      pointer.dispatchEvent(target, 'cancel', cancelDict);
      fireMouseEvents && dispatchMouseEvent('up', window, upDict)

      pointer.dispatchEvent(target, 'out', outDict);
      fireMouseEvents && dispatchMouseEvent('out', target, outDict);

      // this pointer call is under question
      
      if (flags.IMMEDIATE_POINTER_LEAVE) {
        pointer.dispatchEvent(target, 'leave', leaveDict);
      }

      fireMouseEvents && dispatchMouseEvent('leave', target, leaveDict);

      implicitReleaseCapture(pointer);
    },
    handlePreEnd = function(touch, touchData, pointer, isPrimary, target, prevTarget, e) {
      var fireMouseEvents = touchData.fireMouseEvents;

      var upDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        relatedTarget: null
      });

      pointer.dispatchEvent(target, 'up', upDict);
      fireMouseEvents && dispatchMouseEvent('up', target, upDict);
    },
    handlePastEnd = function(touch, touchData, pointer, isPrimary, target, prevTarget, e) {
      var fireMouseEvents = touchData.fireMouseEvents;

      var outDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        relatedTarget: null
      }),
      leaveDict = getMouseDict(touch, {
        bubbles: false,
        cancelable: false,
        button: 0,
        buttons: 0,
        relatedTarget: null
      });

      pointer.dispatchEvent(target, 'out', outDict);
      fireMouseEvents && dispatchMouseEvent('out', target, outDict);

      // this pointer call is under question
      // because of specification undefined position of that
      if (flags.IMMEDIATE_POINTER_LEAVE) {
        pointer.dispatchEvent(target, 'leave', leaveDict);
      }

      fireMouseEvents && dispatchMouseEvent('leave', target, leaveDict);

      implicitReleaseCapture(pointer);
    },
    handleTouchEnd = function(touch, touchData, pointer, isPrimary, target, prevTarget, e) {
      console.log('touchEnd:', target, prevTarget);

      // there is possible case then click is fired before touchend
      // in that situations for best synced events sequence probably need to defer click
      // (i.e. prevent real and sent synthetic in touchend) or
      // handle touchend in click event
      if (touchData.clicked) return;

      var movedOut = touchData.moved ? touchData.movedOut :
        checkForMovedOut(touchData, touch),
        // get needFastClick after
        // possibly call of checkForMovedOut
        needFastClick = touchData.needFastClick,
        timedOut = touchData.timedOut;

      // 'intent to click' should be determined on touchend base on current flags
      // if timed-out no intent to click, try to prevent real click and do not fire fast-click
      // if ignoreTouch then no intent to click
      // if current target !== start target also not intent to click
      // keep 'clicked' as separate flag e.g. intentToClick && !clicked
      // also cancelation of touch events going to prevent click
      // but 100% only consumed touchstart prevent click
      // therefore need to check for canceled only touchend
      // because touchmove is tracked by 'ignoreTouch' flag

      var intentToClick = !touchData.touchEndCanceled &&
        // need to properly deliver multitouch property
        (!e.touches.length && !touchData.multitouch) &&
        !touchData.isContextmenuShown && !timedOut && !touchData.ignoreTouch &&
        target === touchData.startTarget && !touchData.movedOut;

      console.log(
        !touchData.touchEndCanceled,
        !touchData.multitouch,
        !touchData.isContextmenuShown,
        !timedOut,
        !touchData.ignoreTouch,
        target === touchData.startTarget,
        !touchData.movedOut
      );

      touchData.intentToClick = intentToClick;

      var isNeedFastClick = intentToClick && !touchData.clicked &&
        needFastClick && !noElementFastClick(target);

      // intentToClick && isNeedFastClick does not match all cases
      // so there exists real clicks, not prevented and not emulated via fast-click
      // therefore prevent touchend only then intentToClick || isNeedFastClick

      handlePreEnd(touch, touchData, pointer,
        isPrimary, target, prevTarget, e);

      if (isNeedFastClick) {
        // try to prevent trusted click via canceling touchend
        // this does not work in Android Stock < 4.4

        console.log('prevent touchend by isNeedFastClick');
        e.preventDefault();

        handleFastClick(touch, touchData, pointer,
          isPrimary, target, prevTarget);

        handlePastEnd(touch, touchData, pointer,
          isPrimary, target, prevTarget, e);
      } else if (intentToClick) {
        touchData.needPastClick = true;
      } else {
        console.log('prevent touchend by !intentToClick');
        e.preventDefault();
        handlePastEnd(touch, touchData, pointer,
          isPrimary, target, prevTarget, e);
      }

      if (isNeedFastClick || !intentToClick) {
        console.log('unified cancelation goes here');
      }

      console.log('touches:', e.changedTouches.length, e.targetTouches.length, e.touches.length,
        'isNeedFastClick:', isNeedFastClick, 'intentToClick:', intentToClick,
        'multitouch:', touchData.multitouch);
    },
    handleFastClick = function(touch, touchData, pointer, isPrimary, target, prevTarget) {
      var computed = touchData.computed;

      var clickEventDict = getMouseDict(touch, {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: 1,
          relatedTarget: null,
          view: window,
          detail: 1
        }),
        clickEvent = new MouseEvent('click', clickEventDict),
        activeElement = document.activeElement;

      if (isChromeAndroid && activeElement !== target &&
        isFocusable(activeElement)
      ) {
        console.log('call blur');
        activeElement.blur();
      }

      if (isChromeAndroid/* || isBB10*/ /* && target.nodeName.toLowerCase() === 'select'*/) {
        var mouseDown = new MouseEvent('mousedown', clickEventDict);

        mouseDown.isFastClick = true;
        target.dispatchEvent(mouseDown);
      }

      if (/*target !== activeElement &&*/ needFocus(target)) {
        // also can tweak with placeCaret chrome android with scaled viewport
        if (!isIOS || !placeCaret(target, computed, clickEvent.clientX, clickEvent.clientY)) {
          target.focus();
        }
      }

      if (isChromeAndroid/* || isBB10*/ /* && target.nodeName.toLowerCase() === 'select'*/) {
        var mouseUp = new MouseEvent('mouseup', clickEventDict);

        mouseUp.isFastClick = true;
        target.dispatchEvent(mouseUp);
      }

      clickEvent.isFastClick = true;
      target.dispatchEvent(clickEvent);

      touchData.fastClicked = true;
      // console.log('click dispatched');
    },
    // need fix iOS from touchData.scrollClickFixed to
    // stream.scrollClickFixed
    fixIOSScroll = function(touchData) {
      var scrolledParent,
        movedOut = touchData.movedOut;

      if (!movedOut || touchData.scrollClickFixed) return;

      if (touchData.scrollables.some(function(parent) {
        var element = parent.element;

        if (parent.isWin) {
          var scrollLeft = window.pageXOffset,
            scrollTop = window.pageYOffset;
        } else {
          scrollLeft = element.scrollLeft;
          scrollTop = element.scrollTop;
        }

        if (parent.scrollLeft !== scrollLeft ||
            parent.scrollTop !== scrollTop) {
          scrolledParent = parent;
          return true;
        }
      })) {
        touchData.scrollClickFixed = true;

        var scrolledForStyle = scrolledParent.isWin ?
          document.documentElement : scrolledParent.element,
          scrolledForEvent = scrolledParent.element,
          prevCSSPointerEvents = scrolledForStyle.style.pointerEvents;

        if (scrolledParent.isWin) {
          Sync.cache(scrolledForStyle, ELEMENT_DISABLED_FOR_SCROLL, 1);
        }

        scrolledForStyle.style.pointerEvents = 'none !important';

        scrolledForEvent.addEventListener('scroll', function scrollHandler() {
          scrolledForEvent.removeEventListener('scroll', scrollHandler);
          scrolledForStyle.style.pointerEvents = prevCSSPointerEvents;

          if (scrolledParent.isWin) {
            Sync.cache(scrolledForStyle, ELEMENT_DISABLED_FOR_SCROLL, 0);
          }
        });

        // prevent pointer events until scrolled
      }
    },
    bindScrollFix = function(touchData) {
      var stream = touchData && touchData.stream,
        scrollables;

      if (isIOS || !stream || stream.scrollClickFixed) return;

      scrollables = touchData.scrollables;
      stream.scrollClickFixed = true;

      scrollables.forEach(function(parent) {
        var element = parent.element,
          scrollCache = Sync.cache(element, TOUCH_SCROLL_CACHE),
          scrollTimer,
          firstScroll = true,
          scrollStyleElem,
          prevCSSPointerEvents;

        if (scrollCache.scrollHandler) return;

        var scrollHandler = function() {
          if (firstScroll) {
            firstScroll = false;

            console.log('bind scroll', element);

            if (parent.isWin) {
              scrollStyleElem = document.documentElement;
              Sync.cache(scrollStyleElem, ELEMENT_DISABLED_FOR_SCROLL, 1);
            } else {
              scrollStyleElem = parent.element;
            }

            prevCSSPointerEvents = scrollStyleElem.style.pointerEvents;

            if (prevCSSPointerEvents === 'none') {
              console.log('wtf 123');
              debugger;
            }

            scrollStyleElem.style.pointerEvents = 'none';
            scrollCache.styleElem = scrollStyleElem;
            scrollCache.prevCSSPointerEvents = prevCSSPointerEvents;
            // console.log('bind:');
          }

          if (scrollTimer) clearTimeout(scrollTimer);

          scrollTimer = setTimeout(function() {
            scrollTimer = null;
            
            if (!stream.isActual) {
              unbindScrollFix(touchData);
            } else {
              scrollHandler();
            }
          }, SCROLL_FIX_DELAY);
        };

        scrollCache.scrollHandler = scrollHandler;
        element.addEventListener('scroll', scrollHandler);
      });
    },
    unbindScrollFix = function(touchData) {
      var stream = touchData && touchData.stream,
        scrollables;

      if (isIOS || !stream || !stream.scrollClickFixed) return;
      console.log('unbind scroll:', stream);

      scrollables = touchData.scrollables;
      stream.scrollClickFixed = false;

      scrollables.forEach(function(parent) {
        var element = parent.element,
          scrollCache = Sync.cache(element, TOUCH_SCROLL_CACHE);

        if (scrollCache.styleElem) {
          scrollCache.styleElem.style.pointerEvents = scrollCache.prevCSSPointerEvents;
          // console.log('set prev events:', scrollCache.styleElem.style.pointerEvents);

          if (parent.isWin) {
            Sync.cache(scrollCache.styleElem, ELEMENT_DISABLED_FOR_SCROLL, 0);
          }

          scrollCache.styleElem = null;
          scrollCache.prevCSSPointerEvents = '';
        }

        if (scrollCache.scrollHandler) {
          element.removeEventListener('scroll', scrollCache.scrollHandler);
          scrollCache.scrollHandler = null;
        }
      });
    },
    noElementFastClick = function(target) {
      var nodeName = target.nodeName.toLowerCase();

      if (isBB10 && nodeName === 'input' && target.type === 'file') {
        return true;
      }

      if (isAndroidStock) {
        if (nodeName === 'input' && target.type === 'range') {
          return true;
        }
      }

      if (isChromeAndroid) {
        if (nodeName === 'textarea') return true;
        if (nodeName === 'input') {
          switch (target.type) {
            case 'text':
            case 'email':
            case 'number':
            case 'tel':
            case 'url':
            case 'search':
              return true;
          }
        }
      }
    },
    needFocus = function(target) {
      var disabled = target.disabled || target.readOnly;

      switch (target.nodeName.toLowerCase()) {
        case 'textarea':
          return isIOS; // !disabled && (!isAndroidFx && !isChromeAndroid && !isBB10);
        case 'select':
          return !disabled && isAndroidFx || isIOS;
        case 'input': {
          if (disabled) return false;

          switch (target.type) {
            case 'button':
            case 'checkbox':
            case 'file':
            case 'image':
            case 'radio':
            case 'submit': {
              return isAndroidFx;
            }

            case 'range': {
              return !isChromeAndroid && !isBB10;
            }
          }

          return !isAndroidStock && !isAndroidFx;
        }
      }
    },
    isFocusable = function(target) {
      var disabled = target.disabled || target.readOnly;

      if (disabled) return false;

      switch (target.nodeName.toLowerCase()) {
        case 'textarea':
        case 'select':
        case 'button':
          return true;
        case 'input': {
          return target.type !== 'hidden';
        }
      }

      if (target.tabIndex >= 0) return true;

      return target.contentEditable === 'true';
    },
    placeCaret = function(target, computed, x, y) {
      var nodeName = target.nodeName.toLowerCase();

      if (!document.caretRangeFromPoint ||
         nodeName !== 'textarea' && nodeName !== 'input') return;

      pickInput: if (nodeName === 'input') {
        switch (target.type) {
          case 'text':
          case 'email':
          case 'number':
          case 'tel':
          case 'url':
          case 'search':
            break pickInput;
        }

        return;
      }

      var mirror = document.createElement('div'),
        mirrorStyle = mirror.style,
        rect = target.getBoundingClientRect();

      mirrorStyle.cssText = computed.cssText;

      mirrorStyle.margin = 0;
      mirrorStyle.position = 'absolute';
      mirrorStyle.opacity = 0;
      mirrorStyle.zIndex = 999999;
      mirrorStyle.left = rect.left + pageXOffset + 'px';
      mirrorStyle.top = rect.top + pageYOffset + 'px';

      mirror.textContent = target.value;

      document.body.append(mirror);

      var range = document.caretRangeFromPoint(x, y);
      
      target.setSelectionRange(range.startOffset, range.endOffset);
      mirror.remove();

      mirror = mirrorStyle = range = null;
      return true;
    },
    updateDevicePrimary = function(touchData) {
      if (touchDevice.currentPrimaryTouch) {
        touchDevice.prevPrimaryTouch = touchDevice.currentPrimaryTouch;
      }
      
      touchDevice.currentPrimaryTouch = touchData || null;;
    },
    BBContextMenuFix = function(e) {
      var touches = e.changedTouches;

      console.log('FIRED ONCE!!!');

      var handleTouch = function(touch) {
        var id = touch.identifier,
          outdatedTouch = touchesMap[id];

        if (!outdatedTouch) return;

        outdatedTouch.revoked = true;

        console.log('revoke outdated touch');

        handleTouchCancel(touch, outdatedTouch, outdatedTouch.pointer,
          outdatedTouch.pointer.isPrimary, outdatedTouch.startTarget,
          outdatedTouch.prevTarget, {
            bubbles: true,
            cancelable: false,
            detail: 0,
            view: e.view,
            targetTouches: document.createTouchList(),
            toucehs: document.createTouchList()
          });

        cleanUpTouch(outdatedTouch);
      };

      if (touches.length) {
        slice.call(touches).forEach(handleTouch);
      } else {
        handleTouch(touches[0]);
      }

      events.removeEvent(document, e.type, {
        callback: BBContextMenuFix,
        capture: true,
        method: touchNatives[e.type].removeEventListener,
        namespace: NS_TOUCH_POINTER
      });
    };

    events.syncEvent('click', function(synced) {
      return {
        addEventListener: function(type, callback, capture) {
          triggerDeviceListeners(this, type,/* capture,*/ 'touch');

          events.addEvent(this, type, {
            handler: function(e) {
              var touchData = touchDevice.currentPrimaryTouch,
                sameTouch = touchData &&
                  (e.timeStamp - touchData.startTime) < TOUCH_CLICK_TIMEOUT;

              if (!e.isFastClick && touchData) {
                if (sameTouch && !touchData.ended) {
                  touchData.clicked = true;
                } else {
                  updateDevicePrimary();
                }
              }

              if (sameTouch && touchData.ended &&
                (!touchData.intentToClick || touchData.fastClicked)) {
                console.log('prevent click by not need click');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
              } else {
                if (sameTouch && !touchData.ended) {
                  handlePreEnd(e, touchData, touchData.pointer,
                    touchData.isPrimary, e.target, touchData.prevTarget, e);

                  console.log('pre end in click');
                }

                callback.call(this, e);

                if (sameTouch && (!touchData.ended || touchData.needPastClick)) {
                  console.log('past end in click, ended:', touchData.ended);
                  handlePastEnd(e, touchData, touchData.pointer,
                    touchData.isPrimary, e.target, touchData.prevTarget, e);
                }
              }
            },
            callback: callback,
            capture: capture,
            method: synced.addEventListener
          });
        },
        removeEventListener: function(type, callback, capture) {
          muteDeviceListeners(this, type/*, capture*/, 'touch');

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

              console.log('touch contextmenu');

              if (!touchData) return;

              /*if (touchData) {
                console.log(
                  touchData,
                  type === 'contextmenu',
                  e.timeStamp - touchData.startTime >= 450,
                  !touchData.ended,
                  !touchData.clicked
                );
              }*/

              if (e.timeStamp - touchData.startTime >= 450 &&
                !touchData.ended && !touchData.clicked) {
                var isTouchEvent = true;
              }

              e.isTouchEvent = true;
              touchData.isContextmenuShown = true;

              if (isBB10) {
                var touchStart = TOUCH_PREFIX + 'start';

                events.addEvent(document, touchStart, {
                  handler: BBContextMenuFix,
                  capture: true,
                  method: touchNatives[touchStart].addEventListener,
                  namespace: NS_TOUCH_POINTER
                });
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

    touchDevice.capturePointer = function() {};
    touchDevice.releasePointer = function() {};

    touchDevice.bindListener = function(node, event) {
      var full = TOUCH_PREFIX + 'start';

      events.addEvent(node, full, {
        handler: function(e) {
          e.stopPropagation();
          e.stopImmediatePropagation();

          initTouchStart.call(this, e, event);
        },
        callback: initTouchStart,
        capture: /*capture*/ true,
        method: touchNatives[full].addEventListener,
        namespace: NS_TOUCH_POINTER
      });
    };

    touchDevice.unbindListener = function(node, event) {
      var full = TOUCH_PREFIX + 'start';

      events.removeEvent(node, full, {
        callback: initTouchStart,
        capture: /*capture*/ true,
        method: touchNatives[full].removeEventListener,
        namespace: NS_TOUCH_POINTER
      });
    };

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
          addEventListener: function(type, callback, capture) {
            triggerDeviceListeners(this, event, 'touch');

            !hasTouchListeners && (hasTouchListeners = true);

            events.handleOnce(this, TOUCH_LISTENERS_CACHE, function() {
              Sync.cache(this, TOUCH_LISTENERS_CACHE, 1);
            });

            events.addEvent(this, FAKE_PREFIX + full, {
              handler: function(e) {
                e = shadowEventType(e, type);
                callback.call(this, e);
              },
              callback: callback,
              capture: capture,
              method: synced.addEventListener
            });
          },
          removeEventListener: function(type, callback, capture) {
            muteDeviceListeners(this, event, 'touch');

            events.handleIfLast(this, TOUCH_LISTENERS_CACHE, function() {
              Sync.cache(this, TOUCH_LISTENERS_CACHE, 0);
            });

            events.addEvent(this, FAKE_PREFIX + full, {
              callback: callback,
              capture: capture,
              method: synced.removeEventListener
            });
          }
        };
      });
    });
  }());

  // mouse type
  (function() {
    var mouseDevice = new pointers.Device('mouse'),
      mousePointer = mouseDevice.createPointer(),
      mouseNatives = {},
      mouseBindings = {
        down: function(e, type, event, captured) {
          var pointerFire = !mousePointer.buttons;

          // pointer cannot be captured before pointer down
          // so no capture here

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
        up: function(e, type, event, captured) {
          if (!mousePointer.buttons) return;

          if ('buttons' in e) {
            mousePointer.buttons = e.buttons;
          } else {
            // hook MouseEvent buttons to pointer buttons here
            // console.log(mousePointer.buttons, Math.pow(2, e.button))
            mousePointer.buttons -= Math.pow(2, e.button);
          }

          var target = captured ? mousePointer.captureElement : e.target;

          if (!mousePointer.buttons) {
            // fire pointer up here
            var canceled = !mousePointer.dispatchEvent(target, type, e, {
              bubbles: true,
              cancelable: true
            });
          }

          if (!mouseDevice.mouseEventsPrevented) {
            var canceled = !events.dispatchEvent(target, FAKE_PREFIX + event, {
              type: 'MouseEvent',
              options: e
            });
          }

          if (canceled) {
            e.preventDefault();
          }

          implicitReleaseCapture(mousePointer);
          mouseDevice.mouseEventsPrevented = false;
        },
        cancel: function(e, type, event, captured) {
          var target = captured ? mousePointer.captureElement : e.target;

          mousePointer.dispatchEvent(target, type, e, {
            bubbles: true,
            cancelable: false
          });

          implicitReleaseCapture(mousePointer);
          mousePointer.buttons = 0;
          mouseDevice.mouseEventsPrevented = false;

          console.log('handle mouse contextmenu');
        },
        move: function(e, type, event, captured) {
          var target = captured ? mousePointer.captureElement : e.target,
            canceled = !mousePointer.dispatchEvent(target, type, e, {
              bubbles: true,
              cancelable: true
            });

          if (!mouseDevice.mouseEventsPrevented) {
            var canceled = !events.dispatchEvent(target, FAKE_PREFIX + event, {
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
      mouseBindings[type] = function(e, type, event, captured) {
        // is over or out event
        var option = type === 'over' || type === 'out';

        var target = captured ? mousePointer.captureElement : e.target;

        // ### override relatedTarget here
        if (captured) {
          events.shadowEventProp(e, 'relatedTarget', null);
        }

        var canceled = !mousePointer.dispatchEvent(target, type, e, {
          bubbles: option,
          cancelable: option
        });

        canceled = !events.dispatchEvent(target, FAKE_PREFIX + event, {
          type: 'MouseEvent',
          options: e
        }) && canceled;

        if (canceled) {
          e.preventDefault();
        }
      }
    });

    mouseDevice.capturePointer = function(element, pointer) {
      [
        'down', 'up', 'move', 'cancel', 'over', 'out'
      ].forEach(function(event) {
        triggerDeviceListeners(document, event, 'mouse');
      });

      triggerDeviceListeners(element, 'enter', 'mouse');
      triggerDeviceListeners(element, 'leave', 'mouse');
    };

    mouseDevice.releasePointer = function(element, pointer) {
      [
        'down', 'up', 'move', 'cancel', 'over', 'out'
      ].forEach(function(event) {
        muteDeviceListeners(document, event, 'mouse');
      });

      muteDeviceListeners(element, 'enter', 'mouse');
      muteDeviceListeners(element, 'leave', 'mouse');
    };

    mouseDevice.bindListener = function(node, event/*, capture*/) {
      if (hasTouch && (isIOS ||
        (isAndroid && !flags.HANDLE_MOUSE_EVENTS_ANDROID))) return;

      var type = MOUSE_PREFIX + event,
        callback = mouseBindings[event];

      if (event === 'cancel') {
        type = 'contextmenu';
      }

      events.addEvent(node, type, {
        handler: function(e) {
          e.stopPropagation();
          e.stopImmediatePropagation();

          if (event === 'cancel') {
            console.log('contextmenu from mouse');
          }

          var isCompatibility = checkForCompatibility(this, e, event, type),
            captured = mousePointer.captured,
            captureElement = mousePointer.captureElement;

          if (captured && ((event === 'enter' || event === 'leave' ||
              event === 'out' || event === 'over') && e.target !== captureElement)) {
            return;
          }

          if (event === 'cancel') {
            var contextMenuShown =
              handleContextMenu.call(this, e, event, type, captured);
          }

          if (!isCompatibility && !e.isFastClick &&
            !e.isTouchEvent && !contextMenuShown) {
            callback.call(this,
              e, event, type, captured, isCompatibility);
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

      // console.log(e, 'compatibility check');
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
    },
    handleContextMenu = function(e, event, type, captured) {
      var canceled = !events.dispatchEvent(e.target, FAKE_PREFIX + event, {
        type: 'MouseEvent',
        options: e
      });

      if (canceled) {
        e.preventDefault();
      }

      return !canceled;
    };

    var syncMouseEvents = function(deviceNatives, full, event) {
      events.syncEvent(full, function(synced) {
        deviceNatives[full] = synced;

        return {
          addEventListener: function(type, callback, capture) {
            if (event) {
              triggerDeviceListeners(this, event, 'mouse');

              if (hasTouch) {
                triggerDeviceListeners(this, event, 'touch');
              }
            }

            !hasMouseListeners && (hasMouseListeners = true);

            // console.log('sync add:', FAKE_PREFIX + full);

            events.addEvent(this, FAKE_PREFIX + full, {
              handler: function(e) {
                e = shadowEventType(e, type);
                callback.call(this, e);
              },
              callback: callback,
              capture: capture
            });
          },
          removeEventListener: function(type, callback, capture) {
            if (event) {
              muteDeviceListeners(this, event, 'mouse');

              if (hasTouch) {
                muteDeviceListeners(this, event, 'touch');
              }
            }

            events.addEvent(this, FAKE_PREFIX + full, {
              callback: callback,
              capture: capture
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
    });
  }());
}(Sync));