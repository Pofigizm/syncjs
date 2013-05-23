/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

;(function(window, document, Sync, undefined) {
  "use strict";

  var R_CAMEL_2_CSS = /[A-Z](?=\w)/g;

  var Element = window.Element || window.HTMLElement,
    Document = window.Document || window.HTMLDocument,
    Node = window.Node,
    Text = window.Text,
    Comment = window.Comment,
    DocumentFragment = window.DocumentFragment || Document,
    createElement = typeof document.createElement === 'function' ?
      document.createElement.bind(document) : document.createElement,
    element = createElement('div'),
    head = document.getElementsByTagName('head')[0],
    NodeChildren = [
      Element,
      Document,
      Text
    ],
    applyingMutations = {
      prepend: {
        handler: function() {
          var node = mutationMacro(arguments);

          if (node) {
            this.insertBefore(node, this.firstChild);
          }
        },
        targets: [Element, DocumentFragment, Document]
      },
      append: {
        handler: function() {
          var node = mutationMacro(arguments);

          if (node) {
            this.appendChild(node);
          }
        },
        targets: [Element, DocumentFragment, Document]
      },
      before: {
        handler: function() {
          var node,
            parent = this.parentNode;

          if (!parent) return;

          node = mutationMacro(arguments);

          if (node) {
            parent.insertBefore(node, this);
          }
        },
        targets: [Element, Text, Comment]
      },
      after: {
        handler: function() {
          var node,
            parent = this.parentNode;

          if (!parent) return;

          node = mutationMacro(arguments);

          if (node) {
            parent.insertBefore(node, this.nextSibling);
          }
        },
        targets: [Element, Text, Comment]
      },
      replace: {
        handler: function() {
          var node,
            parent = this.parentNode;

          if (!parent) return;

          node = mutationMacro(arguments);

          if (node) {
            parent.replaceChild(node, this);
          }
        },
        targets: [Element, Text, Comment]
      },
      remove: {
        handler: function() {
          var parent = this.parentNode;

          if (!parent) return;

          parent.removeChild(this);
        },
        targets: [Element, Text, Comment]
      }
    };

  var camel2css = function(w) {
    return ('-' + w).toLowerCase();
  },
  mutationNodeTransform = function(node) {
    if (typeof node === 'string') {
      return document.createTextNode(node);
    }

    if (!node.nodeType) return null;

    return node;
  },
  mutationMacro = function(nodes) {
    if (!nodes) return null;

    if (nodes.length === 1) {
      return mutationNodeTransform(nodes[0]);
    }

    var fragment = document.createDocumentFragment(),
      i = 0,
      len = nodes.length,
      node;

    for (; i < len; i++) {
      node = mutationNodeTransform(nodes[i]);

      if (node) {
        fragment.appendChild(node);
      }
    }

    return fragment;
  },
  define = Object.defineProperty,
  getDescriptor = Object.getOwnPropertyDescriptor,
  slice = Array.prototype.slice,
  hasOwn = Object.prototype.hasOwnProperty;

  // IE8 targets
  if (!Node && document.attachEvent) {
    window.Node = Node = function Node() {};

    Node.prototype =
      document.documentElement.appendChild(document.createElement('Node'));

    document.documentElement.removeChild(Node.prototype);

    [
      'ELEMENT_NODE',
      'ATTRIBUTE_NODE',
      'TEXT_NODE',
      'CDATA_SECTION_NODE',
      'ENTITY_REFERENCE_NODE',
      'ENTITY_NODE',
      'PROCESSING_INSTRUCTION_NODE',
      'COMMENT_NODE',
      'DOCUMENT_NODE',
      'DOCUMENT_TYPE_NODE',
      'DOCUMENT_FRAGMENT_NODE',
      'NOTATION_NODE'
    ].forEach(function(name, value) {
      Node[name] = Node.prototype[name] = value + 1;
    });

    [
      'DOCUMENT_POSITION_DISCONNECTED',
      'DOCUMENT_POSITION_PRECEDING',
      'DOCUMENT_POSITION_FOLLOWING',
      'DOCUMENT_POSITION_CONTAINS',
      'DOCUMENT_POSITION_CONTAINED_BY',
      'DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC'
    ].forEach(function(name, value) {
      Node[name] = Node.prototype[name] = Math.pow(2, value);
    });

    Node.prototype.attachEvent('onpropertychange', function() {
      var name,
        desc;

      if (window.event && (name = window.event.propertyName)) {
        desc = Object.getOwnPropertyDescriptor(Node.prototype, name);

        NodeChildren.forEach(function(child) {
          define(child.prototype, name, desc);
        });
      }
    });

    define(window, 'Node', {
      value: Node
    });

    (function() {
      var originalPropertyDefinition = define;

      define = Object.defineProperty =
        function defineProperty(object, name, description) {
          var ret = originalPropertyDefinition.apply(this, arguments),
            e;

          if (object.nodeType && object.fireEvent) {
            e = document.createEventObject();
            e.propertyName = name;
            object.fireEvent('onpropertychange', e);
          }

          return ret;
        };
    }());
  }

  var dom = Sync.dom = {
    cache: function(elem, hash, value) {
      var data = elem._ || (elem._ = {});

      if (!hash) {
        return data;
      } else {
        if (typeof value !== 'undefined') {
          return data[hash] = value;
        } else {
          return typeof data[hash] !== 'undefined' ?
            data[hash] : (data[hash] = {});
        }
      }
    },
    dataset: function(node, name, value) {
      if (!node || !name) return null;

      name = 'data-' + name.replace(R_CAMEL_2_CSS, camel2css);

      if (value !== void 0 || value === null) {
        node.setAttribute(name, value);
        return value;
      }

      return node.hasAttribute(name) ? node.getAttribute(name) : void 0;
    },
    inTree: function(elem) {
      return elem && elem.nodeType &&
        (elem.parentNode ? ((elem = elem.parentNode).nodeType ===
          Node.DOCUMENT_FRAGMENT_NODE ? dom.inTree(elem) : true) : false);
    },
    isView: function(view) {
      return view && view.setTimeout && view.clearTimeout;
    }
  };

  if (!document.head) {
    Object.defineProperty(document, 'head', {
      get: function() {
        return head;
      }
    });
  }

  if (!('origin' in window.location)) {
    try {
      define(window.location, 'origin', {
        get: function() {
          return this.protocol + '//' + this.host;
        }
      });
    } catch (e) {
      window.location.origin =
        window.location.protocol + '//' + window.location.host;
    }
  }

  if (!('innerWidth' in window)) {
    Object.defineProperties(window, {
      innerWidth: {
        get: function() {
          if (document.compatMode !== 'CSS1Compat' && document.body) {
            return document.body.clientWidth || 0;
          } else {
            return document.documentElement.clientWidth || 0;
          }
        }
      },
      innerHeight: {
        get: function() {
          if (document.compatMode !== 'CSS1Compat' && document.body) {
            return document.body.clientHeight || 0;
          } else {
            return document.documentElement.clientHeight || 0;
          }
        }
      }
    });
  }

  try {
    var nodeListSlice = slice.call(document.querySelectorAll('html'), 0);
  } catch (e) {
    nodeListSlice = null;
  } finally {
    if (!Array.isArray(nodeListSlice)) {
      define(Array.prototype, 'slice', {
        writable: true,
        configurable: true,
        enumerable: false,
        value: function(from, to) {
          if (this instanceof window.StaticNodeList ||
              this instanceof window.NodeList ||
              this instanceof window.HTMLCollection ||
              this instanceof window.HTMLFormElement ||
              this instanceof window.HTMLSelectElement) {

            from |= 0;
            typeof to === 'number' || (to = this.length);

            if (!isFinite(from) || !isFinite(to) ||
                (to > this.length && from > this.length)) {
              return [];
            }

            var result = [],
              i = (from < 0 ? this.length - from : from),
              len = (to < 0 ? this.length - to : to),
              item;

            for (; i < len; i++) {
              if (hasOwn.call(this, i) && (item = this[i])) {
                result.push(item);
              }
            }

            return result;
          } else {

            return slice.apply(this, arguments);
          }
        }
      });
    }
  }

  // IE8
  if (!('textContent' in element) && 'innerText' in Element.prototype) {
    define(Element.prototype, 'textContent', {
      get: function() {
        return this.innerText;
      },
      set: function(value) {
        this.innerText = value;
      }
    });

    define(Text.prototype, 'textContent', {
      get: function() {
        return this.nodeValue;
      },
      set: function(value) {
        this.nodeValue = value;
      }
    });
  }

  if (!('outerHTML' in element)) {
    define(Element.prototype, 'outerHTML', {
      get: function() {
        var tmp = document.createElement('div'),
          html;

        tmp.appendChild(this.cloneNode(true));
        html = tmp.innerHTML;
        tmp = null;

        return html;
      },
      set: function(value) {

      }
    });
  }

  // IE8
  if (!('sheet' in createElement('style')) &&
      'styleSheet' in HTMLStyleElement.prototype) {

    var _styleSheetHTMLKey = '_styleSheetHTMLKey';

    Object.defineProperties(HTMLStyleElement.prototype, {
      sheet: {
        get: function() {
          return this.styleSheet;
        }
      },
      appendChild: {
        value: function(node) {
          if (!node || !node.nodeType) throw TypeError('bad argument');

          if (node.nodeType === Node.TEXT_NODE) {
            this.innerHTML += node.textContent;
          }
        }
      },
      innerHTML: {
        get: function() {
          if (this.styleSheet) {
            return this.styleSheet.cssText;
          } else {
            return Sync.dom.cache(this)[_styleSheetHTMLKey] || '';
          }
        },
        set: function(html) {
          if (!this.styleSheet) {
            var cache = Sync.dom.cache(this),
              self = this,
              handler = function() {
                if (self.readyState === 'loading' ||
                    self.readyState === 'complete') {
                  self.detachEvent('onreadystatechange', handler);
                  self.innerHTML = cache[_styleSheetHTMLKey];
                }
              };

            cache[_styleSheetHTMLKey] =
              (cache[_styleSheetHTMLKey] || '') + html;

            this.attachEvent('onreadystatechange', handler);
          } else {
            this.styleSheet.cssText = html;
          }
        }
      }
    });
  }

  // http://www.quirksmode.org/blog/archives/2006/01/contains_for_mo.html
  if (Node && !Node.prototype.contains &&
      'compareDocumentPosition' in Element.prototype) {
    var compareDocumentPosition = Element.prototype.compareDocumentPosition;
    define(Node.prototype, 'contains', {
      value: function contains(node) {
        return !!(compareDocumentPosition.call(this, node) & 16);
      }
    });
  }

  // IE8
  if (Node && !('compareDocumentPosition' in Node.prototype) &&
      'sourceIndex' in Node.prototype && 'contains' in Node.prototype) {
    define(Node.prototype, 'compareDocumentPosition', {
      value: function compareDocumentPosition(node) {
        var point = 0,
          getDocument = function(node) {
            for (var doc = node.parentNode; doc &&
                 doc.nodeType !== Node.DOCUMENT_NODE &&
                 doc.nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
                 doc = doc.parentNode);

            return doc;
          };

        if (this === node) {
          return point;
        }

        if (this.contains(node)) {
          point |= Node.DOCUMENT_POSITION_CONTAINED_BY;
        }

        if (node.contains(this)) {
          point |= Node.DOCUMENT_POSITION_CONTAINS;
        }

        if ((this.sourceIndex === node.sourceIndex) ||
            (this.sourceIndex < 0 || node.sourceIndex < 0) ||
            getDocument(this) !== getDocument(node)) {
          point |= Node.DOCUMENT_POSITION_DISCONNECTED |
            Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
        } else {
          point |= (this.sourceIndex < node.sourceIndex ?
                    Node.DOCUMENT_POSITION_FOLLOWING :
                    Node.DOCUMENT_POSITION_PRECEDING);
        }

        return point;
      }
    });
  }

  // IE8
  if (!('getComputedStyle' in window) &&
    'currentStyle' in Element.prototype) {
    define(window, 'getComputedStyle', {
      value: function(node) {
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          // temporary static only
          var ret = {},
            style = node.style,
            cur = node.currentStyle,
            key;

          for (key in cur) {
            try {
              ret[key] = style[key] || cur[key];
            } catch (e) {}
          }

          ret.cssFloat = ret.styleFloat;
          return ret;
        } else {
          return null;
        }
      }
    });
  }

  // ---
  // IE8
  if (!window.ClientRect && window.TextRectangle &&
      !('width' in window.TextRectangle)) {
    Object.defineProperties(TextRectangle.prototype, {
      width: {
        get: function() {
          return this.right - this.left;
        }
      },
      height: {
        get: function() {
          return this.bottom - this.top;
        }
      }
    });
  }

  if (!('hidden' in element)) {
    if ('runtimeStyle' in element) {
      define(Element.prototype, 'hidden', {
        get: function() {
          return this.runtimeStyle.display === 'none';
        },
        set: function(value) {
          var style = this.runtimeStyle;

          if (!value && style.display === 'none') {
            style.display = '';
          } else if (value && style.display !== 'none') {
            style.display = 'none';
          }
        }
      });
    } else {
      define(Element.prototype, 'hidden', {
        get: function() {
          return this.getAttribute('hidden') != null;
        },
        set: function(value) {
          if (value) {
            this.setAttribute('hidden', 'hidden');
          } else {
            this.removeAttribute('hidden');
          }
        }
      });

      var _hiddenStyleSheet = createElement('style');
      _hiddenStyleSheet.innerHTML = '[hidden] { display: none }';
      head.appendChild(_hiddenStyleSheet);
    }
  }

  if (!('defaultView' in element) && element.ownerDocument &&
      element.ownerDocument.parentWindow !== void 0) {
    define(Element.prototype, 'defaultView', {
      get: function() {
        return this.ownerDocument.parentWindow;
      }
    });
  }

  // ---
  // Copy-pated from X-tags repo by Mozilla
  // http://github.com/mozilla/x-tag
  var prefix = Sync.prefix = (function() {
      var styles = window.getComputedStyle(document.documentElement),
        pre,
        dom;

        try {
          pre = (slice.call(styles).join('')
                  .match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1];
        } catch (e) {
          pre = 'ms';
        }

        dom = pre === 'ms' ? pre.toUpperCase() : pre;

      return {
        dom: dom,
        prop: dom.toLowerCase(),
        lowercase: pre,
        css: '-' + pre + '-',
        js: pre[0].toUpperCase() + pre.slice(1)
      };
    })();



  // HTML5

  if (!('matchesSelector' in Element.prototype) &&
      !((prefix.prop + 'MatchesSelector') in Element.prototype) &&
      !('matches' in Element.prototype)) {
    define(Element.prototype, 'matchesSelector', {
      value: function(selector) {
        var tmp = document.createElement('div'),
          clone = this.cloneNode(false);

        tmp.appendChild(clone);
        tmp = !!tmp.querySelector(selector);

        clone = null;
        return tmp;
      }
    });
  }

  if (!('matches' in Element.prototype)) {
    define(Element.prototype, 'matches', {
      value: function() {
        var key = prefix.prop + 'Matches';

        return (key in this ? this[key] : this[key + 'Selector'] || this.matchesSelector)
          .apply(this, arguments);
      }
    });
  }

  if (!('pageXOffset' in window) || !('pageYOffset' in window)) {
    define(window, 'pageXOffset', {
      get: function() {
        return Math.max(document.body && document.body.scrollLeft || 0,
                        document.documentElement.scrollLeft);
      }
    });

    define(window, 'pageYOffset', {
      get: function() {
        return Math.max(document.body && document.body.scrollTop || 0,
                        document.documentElement.scrollTop);
      }
    });
  }

  if ('insertBefore' in element && 'appendChild' in element) {
    (function() {
      try {
        element.insertBefore(document.createTextNode('test'), null);
      } catch (e) {
        var _originalInsertBefore = element.insertBefore;

        define(Element.prototype, 'insertBefore', {
          value: function(node, child) {
            if (!child) {
              return this.appendChild(node);
            }

            return _originalInsertBefore.call(this, node, child);
          }
        });
      }
    }());
  }

  [
    'prepend',
    'append',
    'replace',
    'before',
    'after',
    'remove'
  ].forEach(function(key) {
    if (key in applyingMutations) {
      var mutation = applyingMutations[key],
        targets = mutation.targets,
        handler = mutation.handler;

      targets.forEach(function(target) {
        target = target.prototype;

        if (!(key in target)) {
          define(target, key, {
            value: handler
          });
        }
      });
    }
  });

  if (!('cssFloat' in document.documentElement.style) &&
    'styleFloat' in document.documentElement.style &&
    'CSSStyleDeclaration' in window) {
    define(CSSStyleDeclaration.prototype, 'cssFloat', {
      get: function() {
        return this.styleFloat;
      },
      set: function(value) {
        return (this.styleFloat = value);
      }
    });
  }

/*
  var R_PROGID_FILTER = /(?:^|\s)progid:DXImageTransform\.Microsoft\.Alpha\((.*?)\)/i,
    R_ALPHA_FILTER = /(?:^|\s)alpha\((.*?)\)/i;

  if (!('opacity' in document.documentElement.style) &&
    'filter' in document.documentElement.style &&
    'CSSStyleDeclaration' in window) {

      define(CSSStyleDeclaration.prototype, 'opacity', {
        get: function() {

          var match = (R_PROGID_FILTER.exec(this.filter) || R_ALPHA_FILTER.exec(this.filter) ||
            ['', this._opacity || ''])[1];*/

          //match = match && match.split(/\s*,\s*/).filter(function(value) {
          //  return !value.trim().indexOf('opacity');
          //})[0].split('=')[1];

/*
          if (match && !isNaN(match)) {
            return (match / 100).toFixed(2) + '';
          } else {
            return '';
          }

        },
        set: function(value) {
          if (!isFinite(value)) return;

          var filter = this.filter.replace(R_ALPHA_FILTER, '').replace(R_PROGID_FILTER, '');
          this.filter = filter + ' alpha(opacity=' + value * 100 + ')';
          this.zoom = 1;

        },
        configurable: true,
        enumerable: true
      });

    
  }*/


}(this, document, Sync));