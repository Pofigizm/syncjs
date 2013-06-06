(function(window, document, Sync, undefined) {
  // no strict in ie :)
  "use strict";

  var events = {};

  var IE_DOM_EVENTS_KEYS = 'ie_dom_events';

  var getEventStore = function(node, type, capture) {
    var events = Sync.cache(node, IE_DOM_EVENTS_KEYS);
    events = events[type] || (events[type] = {
      bubbling: {
        index: [],
        listeners: []
      },
      capture: {
        index: [],
        listeners: []
      }
    });

    return capture ? events.capture : events.bubbling;
  };

  events.Event = function() {};

  events.Event.prototype = {
    CAPTURING_PHASE: 1,
    AT_TARGET: 2,
    BUBBLING_PHASE: 3,
    type: '',
    target: null,
    currentTarget: null,
    eventPhase: 0,
    eventFlags: 0,
    STOP_PROPAGATION: 1,
    STOP_IMMEDIATE_PROPAGATION: 2,
    CANCELED: 4,
    INITIALIZED: 8,
    DISPATCH: 16,
    stopPrapagation: function() {
      this.eventFlags |= this.STOP_PROPAGATION;
    },
    stopImmediatePropagation: function() {
      this.eventFlags = this.eventFlags |
                        this.STOP_IMMEDIATE_PROPAGATION |
                        this.STOP_PROPAGATION;
    },
    bubbles: false,
    cancelable: false,
    preventDefault: function() {
      if (this.cancelable) {
        this.eventFlags |= this.CANCELED;
        //getters are not supported, so that passing new value manually
        this.defaultPrevented = true;
      }
    },
    defaultPrevented: false,
    isTrusted: false
  };

  var EventListener = function(options) {
    if (!(this instanceof EventListener)) {
      return new EventListener(options);
    }

    options || (options = {});
    var type = options.type,
      handler = options.handler,
      capture = options.capture,
      target = options.target;

    if (!type || typeof type !== 'string' ||
        !handler || typeof handler !== 'object') {
      return null;
    }

    this.type = type;
    this.target = target;
    this.handleEvent =
      typeof handler === 'function' ? handler : handler.handleEvent;
    this.capture =
      (typeof capture !== 'boolean' &&(capture = false)) || capture;
  };

  Sync.extend(Node.prototype, {
    addEventListener: function(type, handler, captrue) {
      if (!this.attachEvent) throw new Error('wrong this value');
      if (!listener = new EventListener({
        type: type,
        handler: handler,
        capture: capture,
        target: this
      })) return false;

      var store = getEventStore(this, type, capture),
        listener; 

      store.index.push(handler);
      store.listeners.push(listener);

      this.attachEvent('on' + type, listener.attache = function() {
        x
      });
    }
  });

}(this, this.document, Sync));