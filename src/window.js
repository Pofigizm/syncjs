;(function(window, document, Sync, undefined) {
  "use strict";

  if (!window.devicePixelRatio) {
    window.devicePixelRatio =
      window.webkitDevicePixelRatio ||
      window.mozDevicePixelRatio ||
      window.msDevicePixelRatio ||
      window.oDevicePixelRatio || 1;
  }
}(this, document, Sync));