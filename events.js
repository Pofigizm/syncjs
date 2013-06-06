(function(window, document, Sync, undefined) {
  "use strict";

  var cache = Sync.cache,
    events = {
      EventTarget: function() {}
    };

  events.EventTarget.prototype = {
    getNode: function() {
      return this.node || (this.node = document.createElement('event-target'));
    }
  };

  [
    'addEventListener',
    'removeEventListener',
    'dispatchEvent'
  ].forEach(function(method) {
    this[method] = function() {
      return this.getNode()[method].apply(this, arguments);
    };
  }, events.EventTarget.prototype);

  (function() {
    try {
      document.createEvent('CustomEvent');
    } catch (e) {
      var _createEvent = document.createEvent;
      document.createEvent = function(event) {
        if (event === 'CustomEvent') {
          var e = _createEvent.call(this, 'Event');
          e.initCustomEvent = function(type, bubbles, cancelable, detail) {
            e.initEvent(type, bubbles, cancelable);
            e.detail = detail;
          };

          return e;
        }

        return _createEvent.call(this, event);
      };
    }
  }());

  Sync.each({
    'Event': [
      'bubbles',
      'cancelable'
    ],
    'CustomEvent': [
      'bubbles',
      'cancelable',
      'detail'
    ],
    'UIEvent': [
      'bubbles',
      'cancelable',
      'view',
      'detail'
    ],
    'MouseEvent': [
      'bubbles',
      'cancelable',
      'view',
      'detail',
      'screenX',
      'screenY',
      'clientX',
      'clientY',
      'ctrlKey',
      'altKey',
      'shiftKey',
      'metaKey',
      'button',
      'relatedTarget'
    ]
  }, function(params, event) {
    try {
      new window[event]('test', {});
    } catch (e) {
      window[event] && (window['_' + event] = window[event]);
      window[event] = function(type, dict) {
        var init = params.map(function(prop) {
          return dict[prop];
        }),
        e = document.createEvent(event);

        init.unshift(type);
        e['init' + event].apply(e, init);

        return e;
      };
    }
  });

  Sync.events = events;



  /*var events = Sync.events = {
    EventTarget: function() {

    },
    EventListener: function(type, handler, capture, thisTarget) {
      if (typeof handler === 'function' ||

      this.type = type;
      this.handler = handler;
      this.capture = typeof capture === 'boolean' ? capture : false;
      this.target = thisTarget;
    },
    constructors: {
      Event: function() {
        
      }
    },
    createEvent: function(type) {
      
    },
    LISTENERS_KEY: 'listeners'
  },
  types = {
    long: function(value) {
      return value | 0;
    },
    view: function(value) {
      return dom.isView(value) ? value : null;
    },
    boolean: function(value) {
      return typeof value === 'boolean' ? value : false;
    },
    short: function(value) {
      return types.long(value);
    },
    ushort: function(value) {
      return dom.types.long(value);
    },
    'unsigned short': function(value) {
      return dom.types.long(value);
    },
    DOMString: function(value) {
      return typeof value === 'string' ? value : '';
    },
    any: function(value) {
      return value;
    },
    Element: function(object) {
      return object && !!object.nodeType;
    }
  };

  events.EventTarget.prototype = {
    addEventListener: function(type, handler, useCapture) {
      var thisTarget = this,
        listeners;

      if (!handler || !type || typeof type !== 'string') return;

      if (typeof handler === 'object' && 'handleEvent' in handler) {
        thisTarget = handler;
        handler = handler.handleEvent;
      }

      if (typeof handler !== 'function') return;

      handler = new events.EventListener(type,
                                         handler,
                                         useCapture,
                                         thisTarget);

      if (this.nodeType || this instanceof Window) {
        // Bind events to DOM part objects
        return null;
      }

      if (!(listeners = cache(this, events.LISTENERS_KEY)[type])) {
        listeners = cache(this, events.LISTENERS_KEY)[type] = {
          capture: [],
          bubbling: []
        };
      }

      (useCapture ? listeners.capture : listeners.bubbling).push(handler);
    },
    dispatchEvent: function() {},
    removeEventListener: function() {},
    _: null
  };

  events.EventListener.prototype = {
    fire: function(event) {
      if (!(event instanceof events.Event)) {
        throw new TypeError();
      }

      this.handler.call(this.target, event);
    }
  };*/

  /*Event: {
    CAPTURING_PHASE: 1,
    AT_TARGET: 2,
    BUBBLING_PHASE: 3,
    initEvent: function(type, bubbles, cancelable){
      instances.Event.call(this, type, {
        "bubbles": bubbles,
        "cancelable": cancelable
      });
    },
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
    stopPrapagation: function(){
      this.eventFlags = this.eventFlags | this.STOP_PROPAGATION;
    },
    stopImmediatePropagation: function(){
      this.eventFlags = this.eventFlags | this.STOP_IMMEDIATE_PROPAGATION | this.STOP_PROPAGATION;
    },
    bubbles: false,
    cancelable: false,
    preventDefault: function(){
      if(this.cancelable){
        (this.eventFlags = this.eventFlags | this.CANCELED);
        //getters in not supported, so that passing true value manuality
        this.defaultPrevented = true;
      }
    },
    defaultPrevented: false,
    isTrusted: false
  }*/

}(this, this.document, Sync));