;(function(window, document, Sync, undefined) {
  "use strict";

  var xhr = new XMLHttpRequest(),
    globalXhr = xhr,
    hasResponseType = 'responseType' in xhr,
    hasResponse = 'response' in xhr,
    hasError,
    hasAbort,
    hasLoad,
    hasTimeout,
    hasLoadEnd,
    hasLoadStart,
    hasWraps,
    getDescNude = Object.getOwnPropertyDescriptor,
    getDesc = function(object, key) {
      try {
        return getDescNude(object, key);
      } catch (e) {};
    },
    define = Object.defineProperty,
    originalDesc = getDesc(window, 'XMLHttpRequest'),
    OriginalXHR = originalDesc.value,
    hasOwn = Object.prototype.hasOwnProperty,
    fixes = [],
    wraps = {},
    sendFixes = [],
    responseTypes = {
      text: function(text) {
        return text;
      },
      json: function(text) {
        return text ? JSON.parse(text) : null;
      },
      document: function() {
        // add document support via DOMParser/implementation.createDocument
        // mb for IE with htmlfile/iframe
      },
      arraybuffer: null,
      blob: null
    },
    needGlobalWrap,
    canDefineAccessors,
    customErrorCodesMap = {
      12002: {
        code: 504,
        text: 'Gateway Timeout'
      },
      120029: {
        code: 500,
        text: 'Internal Server Error'
      },
      120030: {
        code: 500,
        text: 'Internal Server Error'
      },
      120031: {
        code: 500,
        text: 'Internal Server Error'
      },
      12152: {
        code: 502,
        text: 'Bad Gateway'
      },
      1223: {
        code: 204,
        text: 'No Content'
      }
    };

  var fixResponse = function(type, text, xhr) {
    if (text && hasOwn.call(responseTypes, type) &&
        (type = responseTypes[type])) {
      return type(text, xhr);
    }

    return text;
  },
  getAcessorsDesc = function(xhr, prop) {
    var desc = getDesc(OriginalXHR.prototype, prop);

    if (!desc || !desc.set && !desc.get) {
      desc = getDesc(xhr, prop);
    }

    if (!desc || !desc.set && !desc.get) {
      return null;
    }

    return desc;
  },
  getValueDesc = function(xhr, prop) {
    var desc = getDesc(OriginalXHR.prototype, prop);

    if (!desc || !('value' in desc)) {
      desc = getDesc(xhr, prop);
    }

    if (!desc || !('value' in desc)) {
      return null;
    }

    return desc;
  },
  makeWrap = function(prop, handler) {
    hasWraps = true;

    wraps[prop] = {
      handler: handler
    };
  },
  addEvent = function(event, callback) {
    makeWrap('on' + event, function(_super) {
      var handler = null;

      typeof callback === 'function' && callback(_super);

      return {
        get: function() {
          return handler;
        },
        set: function(val) {
          if (handler) {
            this.removeEventListener(event, handler, false);
          }

          this.addEventListener(event, handler = val, false);
        }
      }
    });
  };

  // old Opera needs to open XHR before tweak him
  // need to do it only by demand
  // xhr.open('GET', '/', true);

  (function() {
    var a = {};

    try {
      define(a, 'test', {
        get: function() {
          return 123;
        }
      });

      if (a.test === 123) {
        canDefineAccessors = true;
        return
      }
    } catch (e) {};
  }());

  if (!hasResponse) {
    makeWrap('response', function(_super) {
      return {
        get: function() {
          var type = this.responseType,
            text = this.responseText;

          return fixResponse(this.type2fix || type, text, this);
        }/*,
        enumerable: true,
        configurable: true*/
      };
    });
  }

  if (!hasResponseType) {
    makeWrap('responseType', function(_super) {
      var type = '';

      return {
        set: function(val) {
          if (hasOwn.call(responseTypes, val) && responseTypes[val]) {
            type = val;
          }
        },
        get: function() {
          return type;
        }/*,
        enumerable: true,
        configurable: true*/
      };
    });
  } else {
    var unsupportResponseType,
      opened = false;

    try {
      xhr.responseType = 'text';
    } catch (e) {
      try {
        xhr.open('GET', '/', true);
      } catch (e) {}

      opened = true;
    }

    ['json', 'document', 'arraybuffer', 'blob'].some(function(type) {
      try {
        xhr.responseType = type;
      } catch (e) {
        unsupportResponseType = true;
        // needGlobalWrap = true;
        return true;
      }

      if (xhr.responseType !== type) {
        unsupportResponseType = true;
        return true;
      }
    });

    if (unsupportResponseType) {
      var resTypeDesc = getAcessorsDesc(xhr, 'responseType');

      if (!resTypeDesc) {
        needGlobalWrap = true;
      }

      console.log('ggggg');

      makeWrap('responseType', function(_super) {
        var value = _super.get();

        return {
          get: function() {
            return value;
          },
          set: function(val) {
            if (!hasOwn.call(responseTypes, val)) return;

            try {
              _super.set(value = val);
            } catch (e) {};

            if (_super.get() !== val) {
              // patch response property here

              if (responseTypes[val]) {
                this.type2fix = val;
                _super.set('text');
              }
            }
          }
        }
      });

      if (hasResponse) {
        makeWrap('response', function(_super) {
          return {
            get: function() {
              var type2fix = this.type2fix,
                response = _super.get();

              return fixResponse(type2fix, response, this);
            }
          }
        });
      }
    }
  }

  try {
    hasError = 'onerror' in xhr;
  } catch (e) {};

  try {
    hasAbort = 'onabort' in xhr;
  } catch (e) {};

  hasLoad = 'onload' in xhr;
  hasTimeout = 'ontimeout' in xhr;
  hasLoadEnd = 'onloadend' in xhr;
  hasLoadStart = 'onloadstart' in xhr;

  var needStatusWrap;

  // firefox before 16 fix
  try {
    getDescNude(OriginalXHR.prototype, 'status');
  } catch (e) {
    needGlobalWrap = true;
  }

  try {
    xhr.status;
    xhr.statusText;
  } catch (e) {
    needStatusWrap = true;
  }

  needStatusWrap && (function() {
    makeWrap('status', function(_super) {
      define(_super.self, '_realStatus', _super);

      return {
        get: function() {
          var self = _super.self;

          if (self.readyState === self.UNSENT) {
            return 0;
          }

          var status = _super.get()

          if (status === 13030 || !status) {
            return 0;
          }

          if (hasOwn.call(customErrorCodesMap, status)) {
            return customErrorCodesMap[status].code;
          }

          return status;
        }
      }
    });

    makeWrap('statusText', function(_super) {
      return {
        get: function() {
          var self = _super.self;

          if (self.readyState === self.UNSENT) {
            return '';
          }

          var status = self._realStatus;

          if (status === 13030 || !status) {
            return '';
          }

          if (hasOwn.call(customErrorCodesMap, status)) {
            return customErrorCodesMap[status].text;
          }

          return _super.get();;
        }
      }
    });
  }());

  if (!hasAbort) {
    addEvent('abort')
    
    makeWrap('abort', function(_super) {
      var realAbort = _super.get();

      return {
        value: function() {
          this._aborted = true;
          realAbort.call(this);
          var e = new CustomEvent('abort');
          this.dispatchEvent(e);
        }
      };
    });
  }

  if (!('timeout' in xhr) || !hasTimeout) (function() {
    var timer,
      abotedByTimeout,
      sent;

    var tryTimeout = function(self) {
      var timeout = self.timeout;

      if (timeout) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function() {
          timer = null;

          if (self.readyState >= self.DONE) return;

          abotedByTimeout = true;
          self.abort();

          var e = new CustomEvent('timeout');
          self.dispatchEvent(e);
        }, timeout);
      }
    };

    sendFixes.push(function(xhr) {
      tryTimeout(xhr);
      sent = true;
    });

    makeWrap('timeout', function(_super) {
      var timeout = 0,
        self = _super.self;

      var abortHandler = function(e) {
        if (abotedByTimeout) {
          e.stopPropagation();
          e.stopImmediatePropagation();
          e.preventDefault();
        }

        setTimeout(cleanUp, 1);
      },
      stateHandler = function() {
        if (self.readyState >= self.DONE) {
          clearTimeout(timer);
          timer = null;
          setTimeout(cleanUp, 1);
        }
      },
      cleanUp = function() {
        self.removeEventListener('timeout', cleanUp, true);
        self.removeEventListener('abort', abortHandler, true);
        self.removeEventListener('readystatechange', stateHandler, true);
      };

      self.addEventListener('timeout', cleanUp, true);
      self.addEventListener('abort', abortHandler, true);
      self.addEventListener('readystatechange', stateHandler, true);

      return {
        get: function() {
          return timeout;
        },
        set: function(val) {
          if (this.readyState >= this.DONE) return;

          timeout = val;

          if (sent) {
            tryTimeout(this);
          }
        }
      };
    });

    addEvent('timeout');
  }());

  if (!hasLoad || !hasLoadEnd || !hasLoadStart || !hasError) (function() {
    fixes.push(function(xhr) {
      var ended;

      var handleEnd = function(e) {
        if (ended) return;

        ended = true;

        if (!hasLoadEnd) {
          var e = new CustomEvent('loadend');
          xhr.dispatchEvent(e);
        }

        xhr.removeEventListener('readystatechange', stateHandler, true);
        xhr.removeEventListener('load', handleEnd, true);
        xhr.removeEventListener('abort', handleEnd, true);
        xhr.removeEventListener('error', handleEnd, true);
        xhr.removeEventListener('timeout', handleEnd, true);
      },
      stateHandler = function() {
        if (xhr.readyState < xhr.DONE || ended) return;
        if (!hasAbort && xhr._aborted) return;

        console.log('readyState: ', xhr.readyState);

        var status = xhr.status;

        if (xhr.getAllResponseHeaders() && status &&
          !isNaN(status) && xhr.statusText && xhr.statusText !== 'Unknown') {
          
          if (!hasLoad) {
            var e = new CustomEvent('load');
            xhr.dispatchEvent(e);
          }

          handleEnd();
          return;
        }

        var fireError = function() {
          var e = new CustomEvent('error');
          xhr.dispatchEvent(e);
          handleEnd();
        };

        if (!hasError) {
          fireError();
        } else {
          setTimeout(function() {
            if (!ended) {
              fireError();
            }
          }, 1);
        }
      };

      
      if (!hasLoad || !hasError) {
        xhr.addEventListener('readystatechange', stateHandler, true);
      }

      if (hasLoad) {
        xhr.addEventListener('load', handleEnd, true);
      }

      xhr.addEventListener('abort', handleEnd, true);
      xhr.addEventListener('error', handleEnd, true);
      xhr.addEventListener('timeout', handleEnd, true);
    });

    !hasLoadStart && sendFixes.push(function(xhr) {
      var e = new CustomEvent('loadstart');
      xhr.dispatchEvent(e);
    });

    !hasLoad && addEvent('load');
    !hasError && addEvent('error');
    !hasLoadEnd && addEvent('loadend');
    !hasLoadStart && addEvent('loadstart');
  }());

  if (sendFixes.length) {
    makeWrap('send', function(_super) {
      var realSend = _super.get(),
        send = function(data) {
          sendFixes.forEach(function(fix) {
            fix(this);
          }, this);

          return realSend.call(this, data);
        };

      return {
        get: function() {
          return send;
        }
      };
    });
  }

  if (!('addEventListener' in xhr)) (function() {
    needGlobalWrap = true;

    var supportedEvents = {
        error: hasError,
        abort: hasAbort,
        timeout: hasTimeout,
        load: hasLoad
      },
      realAccessors = {};

    // need events prefix because IE buggy with readystatechange
    // at DOM nodes
    var EVENT_PREFIX = 'xhr.';

    var addSupported = function(event, xhr) {
      var desc = getAcessorsDesc(xhr, 'on' + event);

      if (desc) {
        realAccessors[event] = desc;
        addEvent(event);
        return;
      }
    },
    getXHRET = function(xhr) {
      var et = this._eventTarget;

      if (!et) {
        et = this._eventTarget = document.createElement('xhr');
        try {
          document.documentElement.appendChild(et);
          document.documentElement.removeChild(et);
        } catch (e) {};
      }

      return et;
    },
    getEventsMap = function(xhrCache, event, capture) {
      var eventsMap = xhrCache['events_map'];

      eventsMap || (eventsMap = xhrCache['eventsMap'] = {});
      eventsMap = eventsMap[event] || (eventsMap[event] = {});
      eventsMap = eventsMap[capture] || (eventsMap[capture] = {
        index: [],
        store: []
      });

      return eventsMap;
    };

    define(XMLHttpRequest.prototype, 'dispatchEvent', {
      value: function(e) {
        var et = getXHRET(this),
          type = e.type;
        
        try {
          e.type = EVENT_PREFIX + e.type;
        } catch (e) {};

        if (e.type !== EVENT_PREFIX + type) {
          e = new CustomEvent(EVENT_PREFIX + type);
        }

        return et.dispatchEvent(e);
      },
      writable: false,
      configurable: true,
      enumerable: false
    });

    define(XMLHttpRequest.prototype, 'addEventListener', {
      value: function(event, handler, capture) {
        var xhrET = getXHRET(this),
          cached = Sync.cache(this, 'xhr_events_fix'),
          bindedAccessors = cached['binded_accessors'],
          eventsMap = getEventsMap(cached, event, capture);

        if (eventsMap.index.indexOf(handler) !== -1) return;

        if (!bindedAccessors) {
          bindedAccessors = cached['binded_accessors'] = {};
        }

        if (hasOwn.call(realAccessors, event) &&
          !hasOwn.call(bindedAccessors, event)) {
          bindedAccessors[event] = true;
          realAccessors[event].set.call(this, function() {
            var e = new CustomEvent(EVENT_PREFIX + event);
            xhrET.dispatchEvent(e);
          });
        }

        eventsMap.index.push(handler);
        eventsMap.store.push(handler = handler.bind(this));

        xhrET.addEventListener(EVENT_PREFIX + event, handler, capture);
      },
      writable: false,
      configurable: true,
      enumerable: false
    });

    define(XMLHttpRequest.prototype, 'removeEventListener', {
      value: function(event, handler, capture) {
        var xhrET = getXHRET(this),
          cached = Sync.cache(this, 'xhr_events_fix'),
          eventsMap = getEventsMap(cached, event, capture),
          indexed;

        if ((indexed = eventsMap.index.indexOf(handler)) === -1) return;

        handler = eventsMap.store[indexed];
        eventsMap.index.splice(indexed, 1);
        eventsMap.store.splice(indexed, 1);

        xhrET.removeEventListener(EVENT_PREFIX + event, handler, capture);
      },
      writable: false,
      configurable: true,
      enumerable: false
    });

    // readystatechange should be handled first
    // because IE buggy otherwise
    var events = ['readystatechange'].concat(Object.keys(supportedEvents));
    supportedEvents.readystatechange = true;

    events.forEach(function(event) {
      if (supportedEvents[event]) {
        addSupported(event, xhr);
      }
    });
  }());

  [
    'UNSENT',
    'OPENED',
    'HEADERS_RECEIVED',
    'LOADING',
    'DONE'
  ].forEach(function(key, index) {
    if (!(key in xhr)) {
      define(XMLHttpRequest.prototype, key, {
        value: index,
        enumerable: false,
        writable: true,
        configurable: true
      });
    }
  });

  if (needGlobalWrap && canDefineAccessors) {
    var XHRWrap = function() {
      var self = this,
        original = this._original = new OriginalXHR();

      Object.keys(wraps).forEach(function(key) {
        var wrap = wraps[key];

        define(self, key, Sync.extend({
          enumerable: false,
          configurable: true
        }, wrap.handler({
          get: function() {
            var val = original[key];

            if (typeof val === 'function') {
              return val.bind(original);
            }

            return val;
          },
          set: function(val) {
            return original[key] = val;
          },
          self: original
        })));
      });

      fixes.forEach(function(fix) {
        fix(self);
      });
    };

    (function() {
      var handler = function(key) {
        if (key in proto || hasOwn.call(wraps, key) || !(key in this)) return;

        /*try {
          var desc = getDesc(this, key);
        } catch (e) {*/
          var desc = {
            enumerable: false,
            configurable: true
          };
        // };

        define(proto, key, {
          get: function() {
            var original = this._original,
              val = original[key];

            if (typeof val === 'function') {
              return val.bind(original);
            }

            return val;
          },
          set: function(val) {
            this._original[key] = val;
          },
          enumerable: desc.enumerable,
          configurable: desc.configurable
        });
      };

      define(window, 'XMLHttpRequest', {
        value: XHRWrap,
        writable: originalDesc.writable,
        enumerable: originalDesc.enumerable,
        configurable: originalDesc.configurable
      });

      var proto = XMLHttpRequest.prototype,
        originalProto = OriginalXHR.prototype;

      if (originalProto) {
        Object.keys(originalProto).forEach(handler, originalProto);
      } else {
        ["open", "setRequestHeader", "send", "abort", "getResponseHeader", "getAllResponseHeaders", "overrideMimeType", "sendAsBinary", "onreadystatechange", "readyState", "timeout", "withCredentials", "upload", "responseURL", "status", "statusText", "responseType", "response", "responseText", "responseXML", "mozAnon", "mozSystem", "UNSENT", "OPENED", "HEADERS_RECEIVED", "LOADING", "DONE"].forEach(handler, xhr);
      }

      Object.keys(xhr).forEach(handler, xhr);

      ["statusText", "status", "response", "responseType",
       "responseXML", "responseText", "upload", "withCredentials",
       "readyState", "onreadystatechange", "onprogress", "onloadstart",
       "onloadend", "onload", "onerror", "onabort",
       "addEventListener", "removeEventListener", "dispatchEvent"].forEach(handler, xhr);
    }());
  } else if (fixes.length || hasWraps) {
    var XHRWrap = function() {
      var xhr = new OriginalXHR();

      Object.keys(wraps).forEach(function(key) {
        var wrap = wraps[key],
          desc = getAcessorsDesc(xhr, key),
          value;

        if (!desc) {
          desc = getValueDesc(xhr, key);

          if (!desc || typeof desc.value === 'function' ||
              typeof desc.value === 'undefined') {
            define(xhr, key, Sync.extend({
              enumerable: false,
              configurable: true
            }, wrap.handler({
              get: function() {
                return desc ? desc.value : void 0;
              },
              set: function(val) {},
              self: xhr
            })));

            return;
          } else {
            desc = null;
          }
        }

        desc && define(xhr, key, Sync.extend({
          enumerable: false,
          configurable: true
        }, wrap.handler({
          get: function() {
            return desc.get.call(xhr);
          },
          set: function(val) {
            desc.set.call(xhr, val);
          },
          self: xhr
        })));
      });

      fixes.forEach(function(fix) {
        fix(xhr);
      });

      return xhr;
    };

    define(window, 'XMLHttpRequest', {
      value: XHRWrap,
      writable: originalDesc.writable,
      enumerable: originalDesc.enumerable,
      configurable: originalDesc.configurable
    });
  } else {
    var XHRWrap = null;
  }

  // in IE we cannot redefine XHR via defineProperty
  // but can do it with regular assignment
  if (XHRWrap && XMLHttpRequest === OriginalXHR) {
    try {
      XMLHttpRequest = XHRWrap;
    } catch (e) {
      window.XMLHttpRequest = XHRWrap;
    }
  }

  xhr = globalXhr = null;
}(this, document, Sync));