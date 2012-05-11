/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function(window, Sync, undefined){
  "use strict";

  var Element = window.Element || window.HTMLElement,
    Document = window.Document || window.HTMLDocument,
    createElement = document.createElement.bind(document),
    element = createElement('div'),
    head = document.getElementsByTagName('head')[0],
    R_CAMEL_2_CSS = /[A-Z](?=\w)/g,
    camel2css = function(input, w) {
      return '-' + w.toLowerCase();
    };

  Sync.dom = {
    cache: function(elem, hash, value) {
      var data = elem._ || (elem._ = {});

      if (!hash) {
        return data;
      } else {
        if (typeof value !== 'undefined') {
          data[hash] = value
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
    })
  };

}(this, Sync));