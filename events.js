(function(window, document, Sync, undefined) {
  "use strict";

  var cacheData = Sync.dom.cache;

  var events = Sync.events = {
    EventTarget: function() {

    },
    EventListener: function(type, handler, capture) {
      if (typeof handler === 'function' ||
          typeof type === 'string') return null;

      this.type = type;
      this.handler = handler;
      this.capture = typeof capture === 'boolean' ? capture : false;
    },
    Event: function() {
      
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

      handler = new events.EventListener(type,
                                         handler.bind(thisTarget),
                                         useCapture);

      if (this.nodeType || this instanceof Window) return null;

      if (!(listeners = cacheData(this, events.LISTENERS_KEY)[type])) {
        listeners = cacheData(this, events.LISTENERS_KEY)[type] = [];
      }

      listeners.push(handler);
    },
    dispatchEvent: function() {},
    removeEventListener: function() {},
    _: null
  };


  Event: {
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
  }

}(this, this.document, Sync));