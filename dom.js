/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function(window, document, Sync, undefined){
  "use strict";

  var Element = window.Element || window.HTMLElement,
    Document = window.Document || window.HTMLDocument,
    Node = window.Node,
    createElement = document.createElement.bind(document),
    element = createElement('div'),
    head = document.getElementsByTagName('head')[0],
    R_CAMEL_2_CSS = /[A-Z](?=\w)/g,
    camel2css = function(w) {
      return ('-' + w).toLowerCase();
    },
    NodeChildren = [
      Element,
      Document
    ];

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

    Node.prototype.attachEvent('onpropertychange', function() {
      var name,
        desc;

      if (window.event && (name = window.event.propertyName)) {

        desc = Object.getOwnPropertyDescriptor(Node.prototype, name);

        NodeChildren.forEach(function(child) {

          Object.defineProperty(child.prototype, name, desc);

        });
      }

    });


    Object.defineProperty(window, 'Node', {
      value: Node
    });

    ;(function() {
      var originalPropertyDefinition = Object.defineProperty;

      Object.defineProperty = function defineProperty(object, name, description) {
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
          return data[hash] || (data[hash] = {});
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

  if (!('textContent' in document.createElement('div'))
    && 'innerText' in Element.prototype) {
    Object.defineProperty(Element.prototype, 'textContent', {
      get: function() {
        return this.innerText;
      },
      set: function(value) {
        this.innerText = value;
      }
    });
  }

  //http://www.quirksmode.org/blog/archives/2006/01/contains_for_mo.html
  if (Node && !Node.prototype.contains && Node.prototype.compareDocumentPosition) {
    Object.defineProperty(Node.prototype, 'contains', {
      value: function contains(node) {
        return !!(this.compareDocumentPosition(node) & 16);
      }
    });
  }

  if ((!'origin' in window.location)) {
    Object.defineProperty(window.location, 'origin', {
      get: function() {
        return this.protocol + '//' + this.host;
      }
    });
  }


}(this, document, Sync));