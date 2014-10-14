(function(window, document, Sync, undefined) {
  // no strict in ie :)
  "use strict";

  if (document.addEventListener) return;

  var eventsMap = {
    click: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: true
    },
    mousedown: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: true,
      cancel: function(event, nativeEvent) {
        if (document.activeElement) {
          document.activeElement.onbeforedeactivate = function() {
            window.event && (window.event.returnValue = false);
            this.onbeforedeactivate = null;
          };
        }
      }
    },
    mousemove: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: false,
      check: (function() {
        var lastPageX,
          lastPageY,
          lastCall = 0;

        return function(event) {
          if ((event.timeStamp - lastCall) > 20 &&
              (lastPageX !== event.pageX || lastPageY !== event.pageY)) {
            lastCall = event.timeStamp;
            lastPageX = event.pageX;
            lastPageY = event.pageY;
            return true;
          }

          return false;
        }
      }())
    },
    mouseup: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: false
    },
    mouseenter: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    mouseleave: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    dblclick: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: false
    },
    keydown: {
      type: 'KeyboardEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: true
    },
    keypress: {
      type: 'KeyboardEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: true
    },
    keyup: {
      type: 'KeyboardEvent',
      targets: {
        Element: true,
      },
      bubbles: true,
      cancelable: false
    },
    focus: {
      type: 'FocusEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    blur: {
      type: 'FocusEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    focusin: {
      type: 'FocusEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: false
    },
    focusout: {
      type: 'FocusEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: false
    },
    scroll: {
      type: 'UIEvent',
      targets: {
        Element: true,
        Window: true
      },
      bubbles: false,
      cancelable: false
    },
    resize: {
      type: 'UIEvent',
      targets: {
        Window: true
      },
      bubbles: false,
      cancelable: false,
      check: (function() {
        var width = window.innerWidth,
          height = window.innerHeight;

        return function(event) {
          // Hardcoded for top view
          if (width !== window.innerWidth || height !== window.innerHeight) {
            return true;
          }
        }
      }())
    },
    unload: {
      type: 'UIEvent',
      targets: {
        Window: true
      },
      bubbles: false,
      cancelable: false
    },
    beforeunload: {
      type: 'UIEvent',
      targets: {
        Window: true
      },
      bubbles: false,
      cancelable: true,
      cancel: function(event, nativeEvent) {
        nativeEvent.returnValue = '';
      }
    },
    submit: {
      type: 'UIEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: true
    },
    change: {
      type: 'UIEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    error: {
      type: 'UIEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    abort: {
      type: 'UIEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    load: {
      type: 'UIEvent',
      targets: {
        Element: true,
        Document: true,
        Window: true
      },
      bubbles: false,
      cancelable: false
    },
    message: {
      type: /*'MessageEvent'*/ 'Event',
      targets: {
        Window: true
      },
      bubbles: false,
      cancelable: false,
      check: function(event, nativeEvent) {
        var data = nativeEvent.data;

        try {
          data = JSON.parse(data);
        } catch (e) {};

        event.data = data;
        event.origin = nativeEvent.origin;
        event.source = nativeEvent.source;

        return true;
      }
    },
    select: {
      type: 'UIEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false,
      checkTarget: function(target) {
        if (target.nodeName.toLowerCase() === 'textarea' ||
            (target.nodeName.toLowerCase() === 'input' &&
            ('text password').split(' ').indexOf(target.type) !== -1)) {
          return true;
        }
      }
    },
    input: {
      type: 'UIEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false,
      checkTarget: function(target) {
        if (target.nodeName.toLowerCase() === 'textarea' ||
            (target.nodeName.toLowerCase() === 'input' &&
            ('text password').split(' ').indexOf(target.type) !== -1)) {
          return true;
        }
      },
      add: function(type, target, config) {
        var handler = function() {
          if (window.event.propertyName !== 'value') return;

          EventTarget.prototype.dispatchEvent.call(target,
            new events.UIEvent(type, {
              bubbles: config.bubbles,
              cancelable: config.cancelable
            })
          );
        };

        target.attachEvent('onpropertychange', handler);

        return handler;
      },
      remove: function(type, target, config, handler) {
        target.detachEvent('onpropertychange', handler);
      }
    },
    DOMContentLoaded: {
      type: 'Event',
      targets: {
        Document: true
      },
      bubbles: false,
      cancelable: false,
      add: function(type, target, config) {
        var handler = function() {
          EventTarget.prototype.dispatchEvent.call(target, new events.Event(type, {
            bubbles: config.bubbles,
            cancelable: config.cancelable
          }));
        };

        target.defaultView.attachEvent('onload', handler);
        return handler;
      },
      remove: function(type, target, config, handler) {
        target.defaultView.detachEvent('onload', handler);
      }
    },
    readystatechange: {
      type: 'Event',
      bubbles: false,
      cancelable: false,
      targets: {
        XMLHttpRequest: true
      }
    },
    timeout: {
      type: 'Event',
      bubbles: false,
      cancelable: false,
      targets: {
        XMLHttpRequest: true
      }
    }
    // wheel
  },
  ie = Sync.ie || (Sync.ie = {}),
  events = {
    normalize: function(event, type) {
      type || event && (type = event.type);

      if (!event || !eventsMap.hasOwnProperty(type)) {
        return null;
      }

      var type,
        config = eventsMap[type],
        _interface = events[config.type],
        instance = Object.create(_interface.prototype);

      _interface.normalize.call(instance, event, config)

      return instance;
    }
  },
  NativeEvent = window.Event,
  globalEventsCounter = 0,
  globalEventsMap = {};

  var IE_DOM_EVENTS_KEY = 'ie_dom_events',
    EVENT_FIRE_PROPERTY = 'ie_dom_event_fire',
    LAST_TARGET_HADNLER_KEY = 'ie_last_target_handler',
    ATTACH_EVENT_HANDLER_KEY = 'ie_attach_event_handler';

  var define = function(obj, name, value) {
    if (obj.setTimeout) {
      eval(name + ' = value');
    } else {
      Object.defineProperty(obj, name, {
        value: value,
        enumerable: false,
        writable: true,
        configurable: true
      });
    }
  };

  var getEventStore = function(node, type, capture) {
    var events = Sync.cache(node, IE_DOM_EVENTS_KEY);
    events = events[type] || (events[type] = {
      /*bubbling: {
        index: [],
        listeners: []
      },
      capture: {*/
        index: [],
        listeners: []
      /*}*/
    });

    //return capture ? events.capture : events.bubbling;
    return events;
  },
  registerEventTarget = function(params) {
    var identifier = params.identifier,
      target = params.target,
      needProxy = params.needProxy,
      nativeEvent = params.nativeEvent;

    var path = globalEventsMap[identifier] || (globalEventsMap[identifier] = []);

    path.push({
      target: target,
      needProxy: needProxy
    });
  },
  fireListeners = function(item, normalEvent) {
    var target = item.target,
      store = getEventStore(target, normalEvent.type, item.capture),
      listeners = store.listeners.concat(),
      length = listeners.length,
      index = 0,
      result;

    normalEvent.currentTarget = target;
    normalEvent.eventPhase = item.phase;

    for (; index < length; index++) {

      var listener = listeners[index];
      result = listener.handleEvent.call(target, normalEvent);

      if (normalEvent.eventFlags & normalEvent.STOP_IMMEDIATE_PROPAGATION) {
        break;
      }
    }

    return result;
  },
  bindNativeHandler = function(self, type, config) {
    var targets = config.targets;

    checkIs: {
      if (!self.nodeType && self.setTimeout) {
        var isWin = true;
      } else if (self.nodeType === Node.DOCUMENT_NODE) {
        var isDoc = true;
      } else if (self.nodeType === Node.ELEMENT_NODE) {
        var isElem = true;

        if (self.ownerDocument.documentElement === self) {
          var isRoot = true;
        }
      } else if (self.nodeType) {
        var isOtherNode = true;
      } else {}
    }

    if ((isElem && !targets.Element) ||
        (isDoc && !targets.Document && !targets.Element) ||
        (isWin && !targets.Window && !targets.Element)) {
      return;
    }

    if (config.checkTarget && !config.checkTarget(self)) {
      return;
    }

    if (isWin && targets.Element && !targets.Window) {
      self = self.document;
      isDoc = true;
      isWin = false;
    } else if (isWin) {
      self = self.window;
    }

    var isLastTarget,
      doc = isWin ? self.document : self.ownerDocument || document,
      attachHandlerCache = Sync.cache(self, ATTACH_EVENT_HANDLER_KEY),
      needWin = !isWin && !targets.Window &&
        targets.Element && (isElem || isDoc);

    if (attachHandlerCache[type]) return;

    isLastTarget = !config.bubbles || (targets.Window && isWin) ||
       (targets.Element && !targets.Window && (isDoc || isWin));

    var lastTarget = isLastTarget ? self :
        (targets.Window ? doc.defaultView : doc),
      lastTargetCache = Sync.cache(lastTarget, LAST_TARGET_HADNLER_KEY),
      lastTargetCacheEntry = lastTargetCache && lastTargetCache[type];

    if (!isWin && !lastTargetCacheEntry) {
      if (config.addLastTarget) {
        var lastTargetHandler = config.addLastTarget(type, lastTarget, config);
      } else {
        var lastTargetHandler = function() {
          var identifier = window.event.data.trim(),
            normalEvent;

          if (!identifier || !isFinite(identifier)) return;

          if (needWin && (normalEvent = globalEventsMap[identifier])) {
            fireListeners({
              phase: normalEvent.BUBBLING_PHASE,
              target: doc.defaultView,
              capture: false,
              needProxy: true
            }, normalEvent);
          }

          delete globalEventsMap[identifier];
        };

        lastTarget.attachEvent('on' + type, lastTargetHandler);
      }

      lastTargetCacheEntry = lastTargetCache[type] = {
        handler: lastTargetHandler,
        bounds: []
      };
    }

    if (!isWin && lastTargetCacheEntry) {
      lastTargetCache[type].bounds.push(self);
    }

    if (config.add) {
      attachHandlerCache[type] = config.add(type, self, config);
      return;
    }

    self.attachEvent(
      'on' + type,
      attachHandlerCache[type] = function() {
        var nativeEvent = window.event,
          data = nativeEvent.data.trim(),
          identifier,
          event;

        if (!isWin) {
          if (data && isFinite(data)) {
            identifier = data;
            event = globalEventsMap[identifier];
          } else {
            identifier = nativeEvent.data = ++globalEventsCounter;
            event = globalEventsMap[identifier] = events.normalize(nativeEvent);
          }
        } else {
          event = events.normalize(nativeEvent);
        }

        var stopped = event.eventFlags & event.STOP_PROPAGATION,
          config = eventsMap[event.type] || {
            bubbles: event.bubbles,
            cancelable: event.cancelable
          },
          phase = self === event.target ? event.AT_TARGET : event.BUBBLING_PHASE;

        if ((config.check && !config.check(event, nativeEvent)) || stopped ||
            (phase === event.BUBBLING_PHASE && !config.bubbles)) {
          return;
        }

        var result = fireListeners({
          phase: phase,
          target: self,
          capture: false,
          needProxy: isWin || isDoc
        }, event);

        if (event.eventFlags & event.STOP_PROPAGATION) {
          nativeEvent.cancelBubble = true;
        }

        if (event.defaultPrevented) {
          if (config.cancelable) {
            nativeEvent.returnValue = false;
            if (config.cancel) {
              config.cancel(event, nativeEvent, config);
            }
          }
        } else if (result !== false && result !== void 0) {
          nativeEvent.returnValue = result;
        }
      }
    );
  },
  unbindNativeHandler = function(self, type, config) {
    var targets = config.targets;

    checkIs: {
      if (!self.nodeType && self.setTimeout) {
        var isWin = true;
      } else if (self.nodeType === Node.DOCUMENT_NODE) {
        var isDoc = true;
      } else if (self.nodeType === Node.ELEMENT_NODE) {
        var isElem = true;

        if (self.ownerDocument.documentElement === self) {
          var isRoot = true;
        }
      } else if (self.nodeType) {
        var isOtherNode = true;
      } else {}
    }

    if (isElem && !targets.Element ||
        isDoc && !targets.Document && !targets.Element ||
        isWin && !targets.Window && !targets.Element) {
      return;
    }

    if (config.checkTarget && !config.checkTarget(self)) {
      return;
    }

    if (isWin && targets.Element && !targets.Window) {
      self = self.document;
      isDoc = true;
      isWin = false;
    }

    var isLastTarget,
      doc = isWin ? self.document : self.ownerDocument || document,
      attachHandlerCache = Sync.cache(self, ATTACH_EVENT_HANDLER_KEY),
      needWin = !isWin && !targets.Window &&
        targets.Element && (isElem || isDoc);

    if (!attachHandlerCache[type]) return;

    isLastTarget = !config.bubbles || (targets.Window && isWin) ||
       (targets.Element && !targets.Window && (isDoc || isWin));

    var lastTarget = isLastTarget ? self :
        (targets.Window ? doc.defaultView : doc),
      lastTargetCache = Sync.cache(lastTarget, LAST_TARGET_HADNLER_KEY),
      lastTargetCacheEntry = lastTargetCache && lastTargetCache[type],
      boundIndex;

    if (!isWin && lastTargetCacheEntry) {
      boundIndex = lastTargetCacheEntry.bounds.indexOf(self);

      if (boundIndex !== -1) {
        lastTargetCacheEntry.bounds.splice(boundIndex, 1);
      }

      if (!lastTargetCacheEntry.bounds.length) {
        if (config.removeLastTarget) {
          config.removeLastTarget(type, lastTarget, config, lastTargetCacheEntry.handler);
        } else {
          lastTarget.detachEvent('on' + type, lastTargetCacheEntry.handler);
        }

        lastTargetCache[type] = null;
      }
    }

    if (config.remove) {
      config.remove(type, self, config, attachHandlerCache[type]);
      return;
    }

    self.detachEvent('on' + type, attachHandlerCache[type]);
  };

  Sync.each({
    Event: {
      constructor: function(type, params) {
        this.timeStamp = Date.now();
      },
      normalize: function(nativeEvent, config) {
        this.target = nativeEvent.srcElement || window;
        this.isTrusted = true;
        this.bubbles = config.bubbles;
        this.cancelable = config.cancelable;
        this.type = nativeEvent.type;
        this.eventFlags = this.INITIALIZED | this.DISPATCH;

        if (nativeEvent.returnValue === false) {
          this.preventDefault();
        }

        if (nativeEvent.cancelBubble === true) {
          this.stopPropagation();
        }
      },
      proto: {
        type: '',
        target: null,
        currentTarget: null,
        defaultPrevented: false,
        isTrusted: false,
        bubbles: false,
        cancelable: false,
        eventPhase: 0,
        eventFlags: 0,
        timeStamp: 0,
        stopPropagation: function() {
          this.eventFlags |= this.STOP_PROPAGATION;
        },
        stopImmediatePropagation: function() {
          this.eventFlags = this.eventFlags |
                            this.STOP_IMMEDIATE_PROPAGATION |
                            this.STOP_PROPAGATION;
        },
        preventDefault: function() {
          if (this.cancelable) {
            this.eventFlags |= this.CANCELED;
            //getters are not supported, so that passing new value manually
            this.defaultPrevented = true;
          }
        },
        initEvent: function(type, bubbles, cancelable) {
          if (this.eventFlags & this.DISPATCH) return;

          this.type = type + '';
          this.bubbles = !!bubbles;
          this.cancelable = !!cancelable;
          this.isTrusted = false;
          this.eventFlags = this.INITIALIZED;
          this.eventPhase = 0;
          this.target = null;
        },
        NONE: 0,
        CAPTURING_PHASE: 1,
        AT_TARGET: 2,
        BUBBLING_PHASE: 3,
        STOP_PROPAGATION: 1,
        STOP_IMMEDIATE_PROPAGATION: 2,
        CANCELED: 4,
        INITIALIZED: 8,
        DISPATCH: 16
      }
    },
    UIEvent: {
      proto: {
        view: null,
        detail: 0
      },
      normalize: function(nativeEvent) {
        this.view = (this.target.ownerDocument || this.target.document || document).defaultView;
      },
      parent: 'Event'
    },
    MouseEvent: {
      parent: 'UIEvent',
      proto: {
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
      constructor: function() {
        this.pageX = this.clientX + window.pageXOffset;
        this.pageY = this.clientY + window.pageYOffset;
      },
      normalize: function(nativeEvent, config) {
        var button;

        if (!nativeEvent.button || nativeEvent.button === 1 ||
            this.type === 'click' || this.type === 'dblclick') {
          button = 0;
        } else if (nativeEvent.button & 4) {
          button = 1;
        } else if (nativeEvent.button & 2) {
          button = 2;
        }

        //this.detail = 0;
        this.metaKey = false;
        this.ctrlKey = nativeEvent.ctrlKey || nativeEvent.ctrlLeft;
        this.altKey = nativeEvent.altKey || nativeEvent.altLeft;
        this.shiftKey = nativeEvent.shiftKey || nativeEvent.shiftLeft;
        this.screenX = nativeEvent.screenX;
        this.screenY = nativeEvent.screenY;
        this.clientX = nativeEvent.clientX;
        this.clientY = nativeEvent.clientY;
        this.buttons = nativeEvent.button;
        this.button = button;
        this.relatedTarget = this.target === nativeEvent.fromElement ?
          nativeEvent.toElement : nativeEvent.fromElement;
      }
    },
    KeyboardEvent: {
      parent: 'UIEvent',
      proto: {
        DOM_KEY_LOCATION_STANDARD: 0x00,
        DOM_KEY_LOCATION_LEFT: 0x01,
        DOM_KEY_LOCATION_RIGHT: 0x02,
        DOM_KEY_LOCATION_NUMPAD: 0x03,
        DOM_KEY_LOCATION_MOBILE: 0x04,
        DOM_KEY_LOCATION_JOYSTICK: 0x05,
        location: 0,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        repeat: false,
        locale: '',
        keyCode: 0,
        charCode: 0,
        VK_ESC: 27,
        VK_ENTER: 13,
        VK_SPACE: 32,
        VK_SHIFT: 16,
        VK_CTRL: 17,
        VK_ALT: 18
      },
      normalize: function(nativeEvent, config) {
        setChar: if (this.type === 'keypress') {
          this.charCode = nativeEvent.keyCode;
        }

        this.keyCode = nativeEvent.keyCode;
        this.repeat = nativeEvent.repeat;
        this.metaKey = false;
        this.altKey = nativeEvent.altKey || nativeEvent.altLeft;
        this.ctrlKey = nativeEvent.ctrlKey || nativeEvent.ctrlLeft;
        this.shiftKey = nativeEvent.shiftKey || nativeEvent.shiftLeft;

        if (this.keyCode === this.VK_ALT) {
          this.location = nativeEvent.altLeft ? this.DOM_KEY_LOCATION_LEFT :
                                                this.DOM_KEY_LOCATION_RIGHT;
        }

        if (this.keyCode === this.VK_CTRL) {
          this.location = nativeEvent.ctrlLeft ? this.DOM_KEY_LOCATION_LEFT :
                                                this.DOM_KEY_LOCATION_RIGHT;
        }

        if (this.keyCode === this.VK_SHIFT) {
          this.location = nativeEvent.shiftLeft ? this.DOM_KEY_LOCATION_LEFT :
                                                this.DOM_KEY_LOCATION_RIGHT;
        }
      }
    },
    FocusEvent: {
      parent: 'UIEvent',
      proto: {
        relatedTarget: null
      },
      normalize: function(nativeEvent, config) {
        this.relatedTarget = nativeEvent.toElement ?
          nativeEvent.toElement : nativeEvent.fromElement;
      }
    },
    CustomEvent: {
      parent: 'Event',
      proto: {
        detail: null
      }
    }
  }, function(config, _interface) {
    var constructor = events[_interface] = function(type, options) {
      var self = this;

      if (!(this instanceof constructor)) {
        self = Object.create(constructor.prototype);
      }

      if (!type) {
        return self;
      }

      options || (options = {});

      var bubbles = options.hasOwnProperty('bubbles') ? options.bubbles : this.bubbles,
        cancelable = options.hasOwnProperty('cancelable') ? options.cancelable : this.cancelable;

      self.initEvent(type, bubbles, cancelable);
      delete options.bubbles;
      delete options.cancelable;

      Sync.each(options, function(value, param) {
        if (constructor.prototype.hasOwnProperty(param)) {
          self[param] = value;
        }
      });

      config.constructor && config.constructor.apply(self, arguments);
      return self;
    },
    parent = config.parent ? events[config.parent] : null;

    constructor.normalize = function(nativeEvent, normalizeConfig) {
      if (parent) {
        parent.normalize.call(this, nativeEvent, normalizeConfig);
      }

      config.normalize.call(this, nativeEvent, normalizeConfig);
      config.constructor && config.constructor.apply(this, arguments);
    };

    constructor.prototype = parent ?
      Sync.extend(Object.create(parent.prototype), config.proto) : config.proto;
  });

  var EventListener = function(options) {
    options || (options = {});

    var type = options.type,
      handler = options.handler,
      capture = options.capture,
      target = options.target;

    if (!type || typeof type !== 'string' || !handler ||
        (typeof handler !== 'object' && typeof handler !== 'function')) {
      console.log('ret with null');
      return null;
    }

    this.type = type;
    this.target = target;
    this.handleEvent = 
      (typeof handler === 'function' ? handler : handler.handleEvent);

    this.capture =
      (typeof capture !== 'boolean' && (capture = false)) || capture;
  };

  var EventTarget = function() {};

  EventTarget.prototype = {
    addEventListener: function(type, handler, capture) {
      if (!(listener = new EventListener({
        type: type,
        handler: handler,
        capture: capture,
        target: this
      }))) return;

      var store = getEventStore(this, type, capture),
        listener,
        self = this,
        config = eventsMap[type];

      if (store.index.indexOf(handler) === -1) {
        store.index.push(handler);
        store.listeners.push(listener);
      }

      if (config && self.attachEvent) {
        bindNativeHandler(self, type, config);
      }
    },
    removeEventListener: function(type, handler, capture) {
      if (typeof handler === 'object' && handler) {
        handler = object.handleEvent;
      }

      if (typeof type !== 'string' || typeof handler !== 'function') {
        return;
      }

      var store = getEventStore(this, type, capture),
        self = this,
        config = eventsMap[type],
        index = store.index.indexOf(handler);

      if (index !== -1) {
        store.index.splice(index, 1);
        store.listeners.splice(index, 1);
      }

      if (!store.listeners.length && config && self.detachEvent) {
        unbindNativeHandler(self, type, config);
      }
    },
    dispatchEvent: function(event) {
      var bubbles = event.bubbles,
        path = [],
        target = event.target = this,
        config = eventsMap[event.type],
        indentifier;

      if (config) {
        identifier = ++globalEventsCounter;

        try {
          this.fireEvent('on' + event.type);
          return !event.defaultPrevented;
        } catch (e) {
          globalEventsMap[identifier] = null;
        }
      }

      propagation: if (bubbles && this.nodeType) {
        do {
          if (target.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            break propagation;
          }

          path.push(target);
          target = target.parentNode;
        } while (target && target.nodeType !== Node.DOCUMENT_NODE);

        if (target.nodeType === Node.DOCUMENT_NODE) {
          path.push(target);
          path.push(target.defaultView);
        }
        
        (function() {
          for (var index = 0, length = path.length; index < length; index++) {
            target = path[index];

            var phase = !index ? event.AT_TARGET : event.BUBBLING_PHASE;

            fireListeners({
              phase: phase,
              target: target,
              capture: false,
              needProxy: !target.nodeType || target.nodeType === Node.DOCUMENT_NODE
            }, event);

            if (event.eventFlags & event.STOP_PROPAGATION) {
              break;
            }
          }
        }());

        return !event.defaultPrevented;
      }

      fireListeners({
        phase: event.AT_TARGET,
        target: target,
        capture: false,
        needProxy: !target.nodeType || target.nodeType === Node.DOCUMENT_NODE
      }, event);

      return !event.defaultPrevented;
    }
  };

  [
    'Event',
    'CustomEvent',
    'UIEvent',
    'MouseEvent',
    'KeyboardEvent',
    'FocusEvent'
  ].forEach(function(key) {
    if (events.hasOwnProperty(key)) {
      define(window, key, events[key]);
    }
  });

  document.createEvent = function(inter) {
    if (events.hasOwnProperty(inter)) {
      return Object.create(events[inter].prototype);
    }
  };

  Sync.each(EventTarget.prototype, function(prop, key) {
    [
      Element.prototype,
      HTMLDocument.prototype,
      // XMLHttpRequest.prototype,
      window
    ].forEach(function(object) {
      define(object, key, prop);
    });
  });
}(this, this.document, Sync));