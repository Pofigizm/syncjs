(function(window, document, Sync, undefined) {
  "use strict";

  if (!document.addEventListener) return;

  var cache = Sync.cache,
    hasOwn = Object.prototype.hasOwnProperty,
    events = {
      synced: {},
      natives: {},
      EventTarget: function() {},
      addEvent: function(node, event, params) {
        var callbacks,
          store,
          index,
          capture = params.capture,
          callback = params.callback,
          namespace = (params.namespace || '') + '';

        //if ((node + '').toLowerCase().indexOf('window') !== -1) return;

        callbacks = getCache({
          node: node,
          key: EVENTS_CALLBACKS_INDEX,
          namespace: namespace,
          event: event,
          capture: capture
        });
        
        store = getCache({
          node: node,
          key: EVENTS_HANDLERS_STORE,
          namespace: namespace,
          event: event,
          capture: capture
        });

        index = callbacks.indexOf(callback);

        if (index !== -1) {
          return;
        }

        callbacks.push(callback);
        store.push(params);

        node.addEventListener(event, params.handler, !!capture);
      },
      removeEvent: function(node, event, params) {
        var callbacks,
          store,
          index,
          capture = params.capture,
          storeData,
          namespace = (params.namespace || '') + '';

        callbacks = getCache({
          node: node,
          key: EVENTS_CALLBACKS_INDEX,
          namespace: namespace,
          event: event,
          capture: capture
        });

        store = getCache({
          node: node,
          key: EVENTS_HANDLERS_STORE,
          namespace: namespace,
          event: event,
          capture: capture
        });

        index = callbacks.indexOf(params.callback);

        if (index !== -1 && (storeData = store[index])) {
          callbacks.splice(index, 1);
          store.splice(index, 1);
          node.removeEventListener(event, storeData.handler, capture);
        }
      },
      removeEventAll: function(node, event, params) {
        var capture = params.capture,
          namespace = (params.namespace || '') + '';

        var remove = function(capture) {
          var callbacks,
            store;

          callbacks = getCache({
            node: node,
            key: EVENTS_CALLBACKS_INDEX,
            namespace: namespace,
            event: event,
            capture: capture
          });

          store = getCache({
            node: node,
            key: EVENTS_HANDLERS_STORE,
            namespace: namespace,
            event: event,
            capture: capture
          });

          store.forEach(function(storeData, i) {
            node.removeEventListener(event, storeData.handler, capture);
          });

          store.splice(0, store.length);
          callbacks.splice(0, callbacks.length);
        };

        if (capture == null) {
          remove(true);
          remove(false);
        } else {
          remove(capture);
        }
      },
      dispatchEvent: function(node, event, params) {
        var defaultAction = params.defaultAction,
          inter = window[params.type || 'CustomEvent'];

        event = new inter(event, params.options);
        
        if (node.dispatchEvent(event) && typeof defaultAction === 'function') {
          defaultAction.call(this);
        }
      },
      cleanEvents: function(node, namespace) {
        if (!namespace || namespace === events.NAMESPACE_INTERNAL) return;

        var clean = function(namespace) {
          if (!namespace) return;

          Sync.each(namespace, function(data, event) {
            data.capture.concat(data.bubbling).forEach(function(storeData) {
              node.removeEventListener(event, storeData.handler, storeData.capture);
            });
          });
        },
        store = Sync.cache(node, EVENTS_HANDLERS_STORE);

        delete Sync.cache(node, EVENTS_CALLBACKS_INDEX)[namespace];
        clean(store[namespace]);
        delete store[namespace];
      },
      NAMESPACE_INTERNAL: 'internal'
    },
    natives = events.natives,
    commonDOMET = !hasOwn.call(HTMLDivElement.prototype, 'addEventListener'),
    ETOwnBuggy = false,
    ETList = ['EventTarget', 'Node', 'Element', 'HTMLElement'];
 
  var EVENTS_CALLBACKS_INDEX = 'events_callbacks_index',
    EVENTS_HANDLERS_STORE = 'events_handlers_store';

  var getCache = function(params) {
    var data = Sync.cache(params.node, params.key),
      event = params.event,
      namespace = params.namespace || events.NAMESPACE_INTERNAL;

    if (typeof namespace !== 'string') {
      return null;
    }

    data = hasOwn.call(data, namespace) ? data[namespace]  : (data[namespace] = {});

    data = hasOwn.call(data, event) ? data[event] : (data[event] = {
      capture: [],
      bubbling: []
    });

    return params.capture ? data.capture : data.bubbling;
  },
  getETMethod = function(method) {
    var result;
  
    ETList.some(function(inter) {
      var desc;

      inter = window[inter];
  
      if (inter && (desc = Object.getOwnPropertyDescriptor(inter.prototype, method))) {
        result = {
          inter: inter,
          desc: desc
        };
  
        return true;
      }
    });
  
    return result;
  },
  setETMethod = function(method, value, desc) {
    if (!commonDOMET) {
      return setSeparateET(method, value, desc);
    }

    ETList.forEach(function(inter) {
      inter = window[inter];
      inter && (inter = inter.prototype);
    
      if (inter) {
        var localDesc = desc || Object.getOwnPropertyDescriptor(inter, method);

        Object.defineProperty(inter, method, {
          value: value,
          writable: localDesc.writable,
          configurable: localDesc.configurable,
          enumerable: localDesc.enumerable
        });
      }
    });
  },
  setSeparateET = function(method, value, desc) {
    var tags = ["Link","Html","Body","Div","Form","Input","Image","Script","Head","Anchor","Style","Time","Option","Object","Output","Canvas","Select","UList","Meta","Base","DataList","Directory","Meter","Source","Button","Label","TableCol","Title","Media","Audio","Applet","TableCell","MenuItem","Legend","OList","TextArea","Quote","Menu","Unknown","BR","Progress","LI","FieldSet","Heading","Table","TableCaption","Span","FrameSet","Font","Frame","TableSection","OptGroup","Pre","Video","Mod","TableRow","Area","Data","Param","Template","IFrame","Map","DList","Paragraph","Embed","HR"];

    tags.forEach(function(tag) {
      tag = window['HTML' + tag + 'Element'];
      tag && (tag = tag.prototype);

      if (!tag) return;

      var localDesc = desc || Object.getOwnPropertyDescriptor(tag, method);

      Object.defineProperty(tag, method, {
        value: value,
        writable: localDesc.writable,
        configurable: localDesc.configurable,
        enumerable: localDesc.enumerable
      });
    });
  };

  window.EventTarget && (function() {
    var add = EventTarget.prototype.addEventListener,
      remove = EventTarget.prototype.removeEventListener,
      handler = function() {};

    try {
      add.call(document, 'ettest', handler, false);
      remove.call(document, 'ettest', handler, false);
    } catch (e) {
      ETOwnBuggy = true;
      ETList.push(ETList.shift());
    }
  }());

  (function() {
    var disabled = (function() {
      var button = document.createElement('button'),
        fieldset,
        handlesEvents,
        handlesEventsWrapped,
        html = document.documentElement,
        e;
  
      var TEST_EVENT_NAME = 'test';
  
      var eventHandler = function() {
        handlesEvents = true;
      },
      wrappedEventHandler = function() {
        handlesEventsWrapped = true;
      };
  
      button.disabled = true;
      html.appendChild(button);
  
      button.addEventListener(TEST_EVENT_NAME, eventHandler, false);
  
      e = document.createEvent('CustomEvent');
      e.initEvent(TEST_EVENT_NAME, false, false);
      button.dispatchEvent(e);
      button.removeEventListener(TEST_EVENT_NAME, eventHandler, false);
  
      if (!handlesEvents) {
        fieldset = document.createElement('fieldset');
        fieldset.disabled = true;
        fieldset.appendChild(button);
        html.appendChild(fieldset);
  
        button.disabled = false;
        button.addEventListener(TEST_EVENT_NAME, wrappedEventHandler, false);
  
        e = document.createEvent('CustomEvent');
        e.initCustomEvent(TEST_EVENT_NAME, false, false, 1);
        button.dispatchEvent(e);
        button.removeEventListener(TEST_EVENT_NAME, wrappedEventHandler, false);
  
        html.removeChild(fieldset);
      } else {
        html.removeChild(button);
        handlesEventsWrapped = true;
      }
  
      return {
        handlesEvents: handlesEvents,
        handlesEventsWrapped: handlesEventsWrapped
      };
    }());

    if (disabled.handlesEvents) return;
  
    var native = getETMethod('dispatchEvent'),
      nativeDispatch = native.desc,
      blockedEvents = {
        click: 1
      };
  
    var dispatchEvent = function(event, handler, capture) {
      var node = this,
        disabledDesc,
        disabledChanged,
        disabledChangedVal = true,
        disabledFix,
        result;
  
      if (!node.disabled || blockedEvents.hasOwnProperty(event)) {
        return nativeDispatch.value.apply(this, arguments);
      }
  
      try {
        disabledDesc = Object.getOwnPropertyDescriptor(
            // Firefox
            Object.getPrototypeOf(node),
            'disabled'
            // IE
          ) || Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'disabled');
      } catch (e) {
        // old firefox with XPC problems
        if (e.code === 0x8057000C ||
            e.result === 0x8057000C) {
          disabledDesc = {
            enumerable: false,
            configurable: true
          };
        }
      }
  
      if (disabledDesc && /*disabledDesc.set && disabledDesc.get &&*/
          !Object.getOwnPropertyDescriptor(node, 'disabled')) {
        disabledFix = true;
        node.disabled = false;
        console.log('used fix');
        // force update disabled property, wtf
        node.offsetWidth;

        Object.defineProperty(node, 'disabled', {
          enumerable: disabledDesc.enumerable,
          configurable: disabledDesc.configurable,
          set: function(val) {
            disabledChanged = true;
            disabledChangedVal = !!val;
          },
          get: function() {
            return disabledChangedVal;
          }
        });
      }
     
      result = nativeDispatch.value.apply(this, arguments);
     
      if (disabledFix) {
        delete node.disabled;
        node.disabled = disabledChanged ? disabledChangedVal : true;
      }
  
      return result;
    };

    setETMethod('dispatchEvent', dispatchEvent, nativeDispatch);
  
    /*Object.defineProperty(native.inter.prototype, 'dispatchEvent', {
      value: dispatchEvent,
      writable: nativeDispatch.writable,
      configurable: nativeDispatch.configurable,
      enumerable: nativeDispatch.enumerable
    });*/
  
    if (disabled.handlesEventsWrapped) return;
  
    // Here should be fix for elements wrapped with some others disabled elements
    // <fieldset disabled>
    //   <button disabled></button>
    // </fieldset>
  }());

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
        var init,
        e = document.createEvent(event);

        init = params.map(function(prop) {
          return dict ? dict[prop] : null;
        });

        init.unshift(type);
        e['init' + event].apply(e, init);

        return e;
      };
    }
  });

  [
    'addEventListener',
    'removeEventListener',
    'dispatchEvent'
  ].forEach(function(method) {
    var native = getETMethod(method);

    if (!native || !native.desc) return;

    natives[method] = native.desc.value;

    setETMethod(method, function() {
      var hook,
        type,
        arg = arguments[0];

      if (typeof arg === 'object') {
        type =  arg.type;
      } else {
        type = arg;
      }

      if (type && events.synced.hasOwnProperty(type) &&
          (hook = events.synced[type]) && (hook = hook[method])) {
        if (typeof hook === 'string') {
          arguments[0] = hook;
        } else {
          return hook.apply(this, arguments);
        }
      }

      return natives[method].apply(this, arguments);
    }, native.desc);
  });

  if (!('onmouseenter' in document.createElement('div'))) {
    Sync.each({
      mouseenter: 'mouseover',
      mouseleave: 'mouseout'
    }, function(event, hook) {
      events.synced[hook] = {
        addEventListener: function(hook, callback, capture) {
          events.addEvent(this, event, {
            handler: function(e) {
              var target = this,
                relatedTarget = e.relatedTarget;

              if (!relatedTarget || (target !== relatedTarget &&
                   !target.contains(relatedTarget))) {
                events.dispatchEvent(target, hook, {
                  type: 'MouseEvent',
                  options: Sync.extend({}, e, {
                    bubbles: false,
                    cancelable: false
                  })
                });
              }
            },
            callback: callback,
            capture: capture
          });

          events.natives.addEventListener.call(this, hook, callback, capture);
        },
        removeEventListener: function(hook, callback, capture) {
          events.removeEvent(this, event, {
            callback: callback,
            capture: capture
          });

          events.natives.removeEventListener.call(this, hook, callback, capture);
        }
      };
    });
  }

  if (!'oninput' in document.createElement('input')) {
    events.synced.input = {
      addEventListener: function(type, callback, capture) {
        var self = this;

        if (window.TextEvent && ((this.attachEvent && this.addEventListener) ||
            (this.nodeName.toLowerCase() === 'textarea' && !('oninput' in this))) ||
            (!'oninput' in this || !this.addEventListener)) {
          bindKeyPress.call(this, type, callback, capture);
        }

        natives.addEventListener.call(this, type, callback, capture);
      },
      removeEventListener: function(type, callback, capture) {
        unbindKeyPress.call(this, type, callback, capture);
        natives.removeEventListener.call(this, type, callback, capture);
      }
    };

    var bindKeyPress = function(hook, callback, capture) {
      var self = this,
        handler = function(e) {
          events.dispatchEvent(this, hook, {
            type: 'Event',
            options: {
              bubbles: false,
              cancelable: false
            }
          });
        };

      keypressBindings.forEach(function(event) {
        events.addEvent(self, event, {
          handler: handler,
          callback: callback,
          capture: capture
        });
      });
    },
    unbindKeyPress = function(hook, callback, capture){
      var self = this;

      keypressBindings.forEach(function(event) {
        events.removeEvent(self, event, {
          callback: callback,
          capture: capture
        });
      });
    },
    keypressBindings = [
      'keydown',
      'cut',
      'paste',
      'copy'
    ];
  };

  Sync.events = events;
}(this, this.document, Sync));