/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function(window, document, Sync, undefined){
  "use strict";

  var Element = window.Element || window.HTMLElement,
    Document = window.Document || window.HTMLDocument,
    Node = window.Node,
    createElement = typeof document.createElement === 'function' ? document.createElement.bind(document) : document.createElement,
    element = createElement('div'),
    head = document.getElementsByTagName('head')[0],
    R_CAMEL_2_CSS = /[A-Z](?=\w)/g,
    camel2css = function(w) {
      return ('-' + w).toLowerCase();
    },
    NodeChildren = [
      Element,
      Document,
      Text
    ],
    applyingMutations = {
      append: [Element, window.DocumentFragment],
      prepend: [Element, window.DocumentFragment],
      before: [],
      after: [],
      replace: [Element, window.Text],
      remove: [Element, window.Text]
    },
    define = Object.defineProperty,
    getDescriptor = Object.getOwnPropertyDescriptor,
    slice = Array.prototype.slice;

  if (!Node && document.attachEvent) {
    window.Node = Node = function Node() {};
    Node.prototype
      = document.documentElement.appendChild(document.createElement('Node'));

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
      'DOCUMENT_POSITION_CONTAINED_BY'
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

    ;(function() {
      var originalPropertyDefinition = define;

      define = Object.defineProperty = function defineProperty(object, name, description) {
        var ret = originalPropertyDefinition.apply(this, arguments);

        if (object.nodeType && object.fireEvent) {
          var e = document.createEventObject();

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
          return typeof data[hash] !== 'undefined' ? data[hash] : (data[hash] = {});
        }
      }

    },
    dataset: function(node, name, value) {
      if(!node || !name) return null;

      if(value !== void 0 || value === null){
        if(node.dataset){
          node.dataset[name] = value;
        }else{
          node.setAttribute('data-' + name, value);
        }
      }else{

        if (node.dataset) {
          return node.dataset[name];
        } else {
          value = node.getAttribute('data-' + name.replace(R_CAMEL_2_CSS, camel2css));
          return value == null ? void 0 : value;
        }

      }

    }
  };

  if (!document.head) {
    Object.defineProperty(document, 'head', {
      get: function() {
        return head;
      }
    });
  };

  if (!('textContent' in element)
    && 'innerText' in Element.prototype) {
    define(Element.prototype, 'textContent', {
      get: function() {
        return this.innerText;
      },
      set: function(value) {
        this.innerText = value;
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

  // http://www.quirksmode.org/blog/archives/2006/01/contains_for_mo.html
  if (Node && !Node.prototype.contains && 'compareDocumentPosition' in Element.prototype) {
    var compareDocumentPosition = Element.prototype.compareDocumentPosition;
    define(Node.prototype, 'contains', {
      value: function contains(node) {
        return !!(compareDocumentPosition.call(this, node) & 16);
      }
    });
  }

  if (!('getComputedStyle' in window)
    && 'currentStyle' in Element.prototype) {
    define(window, 'getComputedStyle', {
      value: function(node) {
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          return node.currentStyle;
        } else {
          return null;
        }
      }
    });
  }

  // DOM4 Draft
  // http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#mutation-methods

  // ---

  if (!window.ClientRect && window.TextRectangle && !('width' in window.TextRectangle)) {
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


  // ---

  var vendors = Sync.vendors = 'WebKit|Moz|MS|O',
    prefix = Sync.prefix = (function() {

    var styles = window.getComputedStyle(document.documentElement, ''),
      pre,
      dom;

      try {
        pre = (Array.prototype.slice.call(styles).join('').match(/moz|webkit|ms/) || (styles.OLink === '' && ['o']))[0];
      } catch (e) {
        pre = 'ms';
      }

      dom = (vendors).match(new RegExp('(' + pre + ')', 'i'))[1];


    return {
      dom: dom,
      prop: dom.toLowerCase(),
      lowercase: pre,
      css: '-' + pre + '-',
      js: pre[0].toUpperCase() + pre.slice(1)
    };

  })();



  // HTML5

  if (!('matchesSelector' in Element.prototype)
    && !(prefix.pro + 'matchesSelector') in Element.prototype) {
    define(Element.prototype, 'matchesSelector', {
      value: function(selector) {
        var tmp = document.createElement('div'),
          clone = this.cloneNode(false);

        tmp.appendChild(clone);

        var match = !!tmp.querySelector(selector);

        clone = tmp = null;

        return match;

      }
    })
  }

  if (!('pageXOffset' in window) || !('pageYOffset' in window)) {
    //define()
  }


}(this, document, Sync));