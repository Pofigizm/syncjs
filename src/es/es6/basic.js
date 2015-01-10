if (!Object.is) {
  Object.is = function(v1, v2) {
    if (v1 === 0 && v2 === 0) {
      return 1 / v1 === 1 / v2;
    }
    if (v1 !== v1) {
      return v2 !== v2;
    }
    return v1 === v2;
  };
}

if (!Number.isNaN) {
  Number.isNaN = function(target) {
    return typeof target === 'number' && isNaN(target);
  };
}

if (!Number.isFinite) {
  Number.isFinite = function(target) {
    return typeof target === 'number' && isFinite(target);
  };
}