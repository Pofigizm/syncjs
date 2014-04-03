(function(window, document, Sync, undefined) {
  "use strict";

  if (!document.addEventListener) return;

  var cache = Sync.cache,
    define = Object.defineProperty,
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
          callback = params.callback || params.handler,
          namespace = (params.namespace || '') + '',
          method = params.method;

        if (namespace === events.NAMESPACE_NATIVE && !method) {
          method = natives.addEventListener;
        }

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

        if (method) {
          method.call(node, event, params.handler, !!capture);
        } else {
          node.addEventListener(event, params.handler, !!capture);
        }
      },
      removeEvent: function(node, event, params) {
        var callbacks,
          store,
          index,
          capture = params.capture,
          storeData,
          namespace = (params.namespace || '') + '',
          method = params.method;

        if (namespace === events.NAMESPACE_NATIVE && !method) {
          method = natives.removeEventListener;
        }

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

        if (index === -1 || !(storeData = store[index])) {
          return;
        }

        callbacks.splice(index, 1);
        store.splice(index, 1);

        if (method) {
          method.call(node, event, storeData.handler, capture);
        } else {
          node.removeEventListener(event, storeData.handler, capture);
        }
      },
      removeEventAll: function(node, event, params) {
        var capture = params.capture,
          namespace = (params.namespace || '') + '',
          method = params.method;

        if (namespace === events.NAMESPACE_NATIVE && !method) {
          method = natives.removeEventListener;
        }

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
            if (method) {
              method.call(node, event, storeData.handler, capture);
            } else {
              node.removeEventListener(event, storeData.handler, capture);
            }
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
          after = params.after,
          before = params.before,
          inter = window[params.type || 'CustomEvent'];

        event = new inter(event, params.options);

        if (typeof before === 'function') {
          before(event);
        }

        var result = node.dispatchEvent(event);

        if (typeof after === 'function') {
          after(event, result);
        }
        
        if (result && typeof defaultAction === 'function') {
          defaultAction.call(this, event);
        }

        return result;
      },
      cleanEvents: function(node, namespace) {
        if (!namespace || namespace === events.NAMESPACE_INTERNAL ||
          namespace === events.NAMESPACE_NATIVE) return;

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
      shadowEventAddition: function(event, fn) {
        var resultSynced;

        events.syncEvent(event, function(synced) {
          resultSynced = synced;

          return {
            addEventListener: function(type, callback, capture) {
              events.addEvent(this, type, {
                handler: function(e) {
                  fn.call(this, e);
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
      },
      syncEvent: function(event, handle) {
        var lastSynced = hasOwn.call(events.synced, event) ?
          events.synced[event] : natives;

        var newSynced = handle(lastSynced);

        if (!newSynced.addEventListener) {
          newSynced.addEventListener = lastSynced.addEventListener;
        }

        if (!newSynced.removeEventListener) {
          newSynced.removeEventListener = lastSynced.removeEventListener;
        }

        events.synced[event] = newSynced;
      },
      handleOnce: function(obj, key, fn) {
        var cached = Sync.cache(obj, HANDLE_ONCE_STORE_KEY),
          listeners = cached[key] | 0;

        // console.log('handleOnceCache:', listeners);

        if (!listeners) {
          fn.call(obj);
        }

        cached[key] = ++listeners;
      },
      handleIfLast: function(obj, key, fn) {
        var cached = Sync.cache(obj, HANDLE_ONCE_STORE_KEY),
          listeners = cached[key] | 0;

        if (listeners) {
          cached[key] = --listeners;

          if (!listeners) {
            fn.call(obj);
          }
        }
      },
      shadowEventProp: function(e, key, val) {
        try {
          e[key] = val;
        } catch (err) {};
        
        if (e[key] !== val) {
          // try to change property if configurable
          // in Chrome should change getter instead of value
          try {
            Object.defineProperty(e, key, {
              get: function() {
                return val;
              }
            });
          } catch (err) {
            var protoEvent = e;

            e = Object.create(e/*, {
              [key]: {
                value: val
              }
            }*/);

            Object.defineProperty(e, key, {
              value: val
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
      NAMESPACE_INTERNAL: 'internal',
      NAMESPACE_NATIVE: 'native'
    },
    natives = events.natives,
    commonDOMET = !hasOwn.call(HTMLDivElement.prototype, 'addEventListener'),
    ETOwnBuggy = false,
    ETList = ['EventTarget', 'Node', 'Element', 'HTMLElement'],
    hasTouch = 'ontouchstart' in document;
 
  var EVENTS_CALLBACKS_INDEX = 'events_callbacks_index',
    EVENTS_HANDLERS_STORE = 'events_handlers_store',
    EVENT_TARGET_COMPUTED_STYLE = 'event_computed_style',
    HANDLE_ONCE_STORE_KEY = 'handle_once_store';

  var getCache = function(params) {
    var data = Sync.cache(params.node, params.key),
      event = params.event,
      namespace = params.namespace || events.NAMESPACE_INTERNAL;

    if (typeof namespace !== 'string') {
      return null;
    }

    data = data.hasOwnProperty(namespace) ? data[namespace]  : (data[namespace] = {});

    data = data.hasOwnProperty(event) ? data[event] : (data[event] = {
      capture: [],
      bubbling: []
    });

    return params.capture ? data.capture : data.bubbling;
  },
  getDOMET = function(method) {
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
  setDOMET = function(method, value, desc) {
    if (!commonDOMET) {
      return setSeparateDOMET(method, value, desc);
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
  setSeparateDOMET = function(method, value, desc) {
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
  },
  getETCustom = function(_interface, method) {
    var desc;

    _interface = window[_interface];
    
    desc = _interface &&
      (desc = Object.getOwnPropertyDescriptor(_interface.prototype, method));

    return {
      inter: _interface,
      desc: desc
    };
  },
  setETCustom = function(_interface, method, value, desc) {
    _interface = window[_interface];
    _interface && (_interface = _interface.prototype);
    
    if (!_interface) return;

    desc || (desc = Object.getOwnPropertyDescriptor(_interface, method));

    Object.defineProperty(_interface, method, {
      value: value,
      writable: desc.writable,
      configurable: desc.configurable,
      enumerable: desc.enumerable
    });
  },
  setET = function(_interface, prop, value, desc) {
    if (_interface.toUpperCase() === 'DOM') {
      setDOMET(prop, value, desc);
    } else {
      setETCustom(_interface, prop, value, desc);
    }
  },
  getET = function(_interface, prop) {
    if (_interface.toUpperCase() === 'DOM') {
      return getDOMET(prop);
    } else {
      return getETCustom(_interface, prop);
    }
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


  // fix disabled elements
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
  
    var native = getDOMET('dispatchEvent'),
      nativeDispatch = native.desc,
      blockedEvents = {
        click: 1
      };
  
    var dispatchEvent = function(event) {
      var node = this,
        disabledDesc,
        disabledChanged,
        disabledChangedVal = true,
        disabledFix,
        result;
  
      if (!node.disabled ||
        (event && event.type && blockedEvents.hasOwnProperty(event.type))) {
        return nativeDispatch.value.call(this, event);
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

    setDOMET('dispatchEvent', dispatchEvent, nativeDispatch);
  
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
  
  // fix stopImmediatePropagation
  if (window.Event &&
    !('stopImmediatePropagation' in Event.prototype)) (function() {
    var stopDesc = Object.getOwnPropertyDescriptor(Event.prototype, 'stopPropagation');

    var SIP_FIX_KEY = 'events_sip_fix_key',
      SIP_FIX_KEY_INDEX = 'events_sip_fix_key_index';

    define(Event.prototype, 'stopImmediatePropagation', {
      value: function() {
        if (this._ignoreListeners) return;

        define(this, '_ignoreListeners', {
          value: true,
          writable: false,
          enumerable: false,
          configurable: false
        });
      },
      writable: stopDesc.writable,
      enumerable: stopDesc.enumerable,
      configurable: stopDesc.configurable
    });

    ['DOM', 'XMLHttpRequest'].forEach(function(_interface) {
      var addDesc = getET(_interface, 'addEventListener').desc,
        rmDesc = getET(_interface, 'removeEventListener').desc;

      setET('addEventListener', function(event, listener, capture) {
        var cached = cache(this),
          store = cached[SIP_FIX_KEY] || (cached[SIP_FIX_KEY] = {}),
          index = cached[SIP_FIX_KEY_INDEX] || (cached[SIP_FIX_KEY_INDEX] = {}),
          indexed,
          stored;

        capture = !!capture;

        store = store[event] || (store[event] = []);
        index = index[event] || (index[event] = []);

        if ((indexed = index.indexOf(listener)) !== -1) {
          stored = store[indexed];

          if (hasOwn.call(stored, capture)) {
            return addDesc.value.call(this, event, listener, capture);
          }
        } else {
          stored = {};
          indexed = index.push(listener) - 1;
          store.push(stored);
        }

        var wrap = function(e) {
          if (e._ignoreListeners) return;
          listener.call(this, e);
        };

        stored[capture] = wrap;
        return addDesc.value.call(this, event, wrap, capture);
      }, addDesc);

      setET('removeEventListener', function(event, listener, capture) {
        var cached = cache(this),
          store = cached[SIP_FIX_KEY] || (cached[SIP_FIX_KEY] = {}),
          index = cached[SIP_FIX_KEY_INDEX] || (cached[SIP_FIX_KEY_INDEX] = {}),
          indexed,
          stored;

        capture = !!capture;

        store = store[event] || (store[event] = []);
        index = index[event] || (index[event] = []);

        if ((indexed = index.indexOf(listener)) !== -1) {
          stored = store[indexed];

          if (hasOwn.call(stored, capture)) {
            if (!hasOwn.call(stored, !capture)) {
              index.splice(indexed, 1);
              store.splice(indexed, 1);
            }

            listener = stored[capture];
            delete stored[capture];
          }
        }

        return rmDesc.value.call(this, event, listener, capture);
      }, rmDesc);
    });
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

  (function() {
    var _mouseClick = new MouseEvent('click');

    if ([
      MouseEvent.prototype,
      _mouseClick
    ].every(function(target) {
      if (!('layerX' in target)) return true;
    })) {
      ['X', 'Y'].forEach(function(axis) {
        define(MouseEvent.prototype, 'layer' + axis, {
          get: function() {
            var computed = Sync.cache(this);

            computed = computed[EVENT_TARGET_COMPUTED_STYLE] ||
              (computed[EVENT_TARGET_COMPUTED_STYLE] =
                window.getComputedStyle(this.target));

            if (computed.position === 'static') {
              return this['offset' + axis] +
                this.target['offset' + (axis === 'X' ? 'Left' : 'Top')];
            } else {
              return this['offset' + axis];
            }
          }
        });
      });
    }

    if ([
      MouseEvent.prototype,
      _mouseClick
    ].every(function(target) {
      if (!('offsetX' in target)) return true;
    })) {
      ['X', 'Y'].forEach(function(axis) {
        define(MouseEvent.prototype, 'offset' + axis, {
          get: function() {
            var computed = Sync.cache(this);

            computed = computed[EVENT_TARGET_COMPUTED_STYLE] ||
              (computed[EVENT_TARGET_COMPUTED_STYLE] =
                window.getComputedStyle(this.target));

            if (computed.position === 'static') {
              return this['layer' + axis] -
                this.target['offset' + (axis === 'X' ? 'Left' : 'Top')];
            } else {
              return this['layer' + axis];
            }
          }
        });
      });
    }
  }());

  [
    'addEventListener',
    'removeEventListener',
    'dispatchEvent'
  ].forEach(function(method) {
    var native = getDOMET(method);

    if (!native || !native.desc) return;

    natives[method] = native.desc.value;

    setDOMET(method, function(arg1, arg2, arg3) {
      var hook,
        type;

      if (typeof arg1 === 'object') {
        type =  arg1.type;
      } else {
        type = arg1;
      }

      if (type && events.synced.hasOwnProperty(type) &&
          (hook = events.synced[type]) && (hook = hook[method])) {
        if (typeof hook === 'string') {
          arg1 = hook;
        } else {
          return hook.call(this, arg1, arg2, arg3);
        }
      }

      return natives[method].call(this, arg1, arg2, arg3);
    }, native.desc);
  });

  // fix mouseenter/leave if they are not exist
  // or shadow them on devices with touch because
  // native enter/leave are broken in Chrome ...
  // ... and we cannot detect that
  bindEnterLeave: if (!('onmouseenter' in document.createElement('div')) || hasTouch) {
    // break bindEnterLeave;

    Sync.each({
      mouseenter: 'mouseover',
      mouseleave: 'mouseout'
    }, function(event, hook) {
      var hookKey = 'hook_' + event + '_' + hook,
        originalEventKeyHook = 'hook_' + event,
        originalHookKeyHook = 'hook_' + hook,
        eventSynched,
        hookEvents = {
          add: function(event) {
            events.handleOnce(document, hookKey, function() {
              // console.log('handleOnce', hookKey, document);

              events.addEvent(document, event, {
                handler: function(e) {
                  var target = e.target,
                    relatedTarget = e.relatedTarget;

                  events.dispatchEvent(target, originalEventKeyHook, {
                    type: 'MouseEvent',
                    options: e
                  });

                  if (!relatedTarget || (target !== relatedTarget &&
                       !target.contains(relatedTarget))) {
                    events.dispatchEvent(target, originalHookKeyHook, {
                      type: 'MouseEvent',
                      options: Sync.extend({}, e, {
                        bubbles: false,
                        cancelable: false
                      })
                    });
                  }
                },
                // index
                callback: hookEvents,
                capture: true,
                method: eventSynched.addEventListener
              });
            });
          },
          remove: function(event) {
            events.handleIfLast(document, hookKey, function() {
              events.removeEvent(document, event, {
                // index
                callback: hookEvents,
                capture: true,
                method: eventSynched.removeEventListener
              });
            });
          }
        };

      // mouseover / mouseout
      events.syncEvent(event, function(synced) {
        eventSynched = synced;

        return {
          addEventListener: function(event, callback, capture) {
            events.addEvent(this, originalEventKeyHook, {
              handler: function(e) {
                e = events.shadowEventProp(e, 'type', event);
                callback.call(this, e);
              },
              callback: callback,
              capture: capture
            });

            hookEvents.add(event);
          },
          removeEventListener: function(event, callback, capture) {
            events.removeEvent(this, originalEventKeyHook, {
              callback: callback,
              capture: capture
            });

            hookEvents.remove(event);
          }
        };
      });

      // mouseenter / mouseleave
      events.syncEvent(hook, function(synced) {
        return {
          addEventListener: function(hook, callback, capture) {
            events.addEvent(this, originalHookKeyHook, {
              handler: function(e) {
                e = events.shadowEventProp(e, 'type', event);
                callback.call(this, e);
              },
              callback: callback,
              capture: capture
            });

            hookEvents.add(event);
          },
          removeEventListener: function(hook, callback, capture) {
            events.removeEvent(this, originalHookKeyHook, {
              callback: callback,
              capture: capture
            });

            hookEvents.remove(event);
          }
        }
      });
    });
  }

  events.syncEvent('input', function(synced) {
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

      events.addEvent(self, 'contextmenu', {
        handler: function() {
          var handleMove = function() {
            self.removeEventListener('mousemove', handleMove, true);
            document.removeEventListener('mousemove', handleMove, true);

            handler();
          };

          self.addEventListener('mousemove', handleMove, true);
          document.addEventListener('mousemove', handleMove, true);
        },
        callback: callback,
        capture: true
      });

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

      events.removeEvent(self, 'contextmenu', {
        callback: callback,
        capture: true
      });

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
    ],
    bindKey = 'hook_oninput',
    bindIndex = function() {};

    return {
      addEventListener: function(type, callback, capture) {
        var self = this;

        if (window.TextEvent && ((this.attachEvent && this.addEventListener) ||
            (this.nodeName.toLowerCase() === 'textarea' && !('oninput' in this))) ||
            (!'oninput' in this || !this.addEventListener)) {
          events.handleOnce(this, bindKey, function() {
            bindKeyPress.call(this, type, bindIndex, capture);
          });
        }

        synced.addEventListener.call(this, type, callback, capture);
      },
      removeEventListener: function(type, callback, capture) {
        events.handleIfLast(this, bindKey, function() {
          unbindKeyPress.call(this, type, bindIndex, capture);
        });

        synced.removeEventListener.call(this, type, callback, capture);
      }
    }
  });

  Sync.events = events;
}(this, this.document, Sync));