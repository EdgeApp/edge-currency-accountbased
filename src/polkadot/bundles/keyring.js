import JSBI from 'jsbi';
import nodeCrypto from 'crypto';

function _typeof(obj) {
  "@babel/helpers - typeof";

  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  }, _typeof(obj);
}

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  Object.defineProperty(Constructor, "prototype", {
    writable: false
  });
  return Constructor;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true
    }
  });
  Object.defineProperty(subClass, "prototype", {
    writable: false
  });
  if (superClass) _setPrototypeOf(subClass, superClass);
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };

  return _setPrototypeOf(o, p);
}

function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;

  try {
    Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

function _possibleConstructorReturn(self, call) {
  if (call && (typeof call === "object" || typeof call === "function")) {
    return call;
  } else if (call !== void 0) {
    throw new TypeError("Derived constructors may only return object or undefined");
  }

  return _assertThisInitialized(self);
}

function _createSuper(Derived) {
  var hasNativeReflectConstruct = _isNativeReflectConstruct();

  return function _createSuperInternal() {
    var Super = _getPrototypeOf(Derived),
        result;

    if (hasNativeReflectConstruct) {
      var NewTarget = _getPrototypeOf(this).constructor;

      result = Reflect.construct(Super, arguments, NewTarget);
    } else {
      result = Super.apply(this, arguments);
    }

    return _possibleConstructorReturn(this, result);
  };
}

function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}

function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}

function _iterableToArrayLimit(arr, i) {
  var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

  if (_i == null) return;
  var _arr = [];
  var _n = true;
  var _d = false;

  var _s, _e;

  try {
    for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

  return arr2;
}

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

function _createForOfIteratorHelper(o, allowArrayLike) {
  var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];

  if (!it) {
    if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
      if (it) o = it;
      var i = 0;

      var F = function () {};

      return {
        s: F,
        n: function () {
          if (i >= o.length) return {
            done: true
          };
          return {
            done: false,
            value: o[i++]
          };
        },
        e: function (e) {
          throw e;
        },
        f: F
      };
    }

    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  var normalCompletion = true,
      didErr = false,
      err;
  return {
    s: function () {
      it = it.call(o);
    },
    n: function () {
      var step = it.next();
      normalCompletion = step.done;
      return step;
    },
    e: function (e) {
      didErr = true;
      err = e;
    },
    f: function () {
      try {
        if (!normalCompletion && it.return != null) it.return();
      } finally {
        if (didErr) throw err;
      }
    }
  };
}

function _classPrivateFieldGet(receiver, privateMap) {
  var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get");

  return _classApplyDescriptorGet(receiver, descriptor);
}

function _classPrivateFieldSet(receiver, privateMap, value) {
  var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set");

  _classApplyDescriptorSet(receiver, descriptor, value);

  return value;
}

function _classExtractFieldDescriptor(receiver, privateMap, action) {
  if (!privateMap.has(receiver)) {
    throw new TypeError("attempted to " + action + " private field on non-instance");
  }

  return privateMap.get(receiver);
}

function _classApplyDescriptorGet(receiver, descriptor) {
  if (descriptor.get) {
    return descriptor.get.call(receiver);
  }

  return descriptor.value;
}

function _classApplyDescriptorSet(receiver, descriptor, value) {
  if (descriptor.set) {
    descriptor.set.call(receiver, value);
  } else {
    if (!descriptor.writable) {
      throw new TypeError("attempted to set read only private field");
    }

    descriptor.value = value;
  }
}

function _checkPrivateRedeclaration(obj, privateCollection) {
  if (privateCollection.has(obj)) {
    throw new TypeError("Cannot initialize the same private elements twice on an object");
  }
}

function _classPrivateFieldInitSpec(obj, privateMap, value) {
  _checkPrivateRedeclaration(obj, privateMap);

  privateMap.set(obj, value);
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createModule(modulePath) {
	return {
		path: modulePath,
		exports: {},
		require: function (path, base) {
			return commonjsRequire(path, base == null ? modulePath : base);
		}
	};
}

var DYNAMIC_REQUIRE_LOADERS = Object.create(null);
var DYNAMIC_REQUIRE_CACHE = Object.create(null);
var DYNAMIC_REQUIRE_SHORTS = Object.create(null);
var DEFAULT_PARENT_MODULE = {
	id: '<' + 'rollup>', exports: {}, parent: undefined, filename: null, loaded: false, children: [], paths: []
};
var CHECKED_EXTENSIONS = ['', '.js', '.json'];

function normalize$1 (path) {
	path = path.replace(/\\/g, '/');
	var parts = path.split('/');
	var slashed = parts[0] === '';
	for (var i = 1; i < parts.length; i++) {
		if (parts[i] === '.' || parts[i] === '') {
			parts.splice(i--, 1);
		}
	}
	for (var i = 1; i < parts.length; i++) {
		if (parts[i] !== '..') continue;
		if (i > 0 && parts[i - 1] !== '..' && parts[i - 1] !== '.') {
			parts.splice(--i, 2);
			i--;
		}
	}
	path = parts.join('/');
	if (slashed && path[0] !== '/')
	  path = '/' + path;
	else if (path.length === 0)
	  path = '.';
	return path;
}

function join () {
	if (arguments.length === 0)
	  return '.';
	var joined;
	for (var i = 0; i < arguments.length; ++i) {
	  var arg = arguments[i];
	  if (arg.length > 0) {
		if (joined === undefined)
		  joined = arg;
		else
		  joined += '/' + arg;
	  }
	}
	if (joined === undefined)
	  return '.';

	return joined;
}

function isPossibleNodeModulesPath (modulePath) {
	var c0 = modulePath[0];
	if (c0 === '/' || c0 === '\\') return false;
	var c1 = modulePath[1], c2 = modulePath[2];
	if ((c0 === '.' && (!c1 || c1 === '/' || c1 === '\\')) ||
		(c0 === '.' && c1 === '.' && (!c2 || c2 === '/' || c2 === '\\'))) return false;
	if (c1 === ':' && (c2 === '/' || c2 === '\\'))
		return false;
	return true;
}

function dirname (path) {
  if (path.length === 0)
    return '.';

  var i = path.length - 1;
  while (i > 0) {
    var c = path.charCodeAt(i);
    if ((c === 47 || c === 92) && i !== path.length - 1)
      break;
    i--;
  }

  if (i > 0)
    return path.substr(0, i);

  if (path.chartCodeAt(0) === 47 || path.chartCodeAt(0) === 92)
    return path.charAt(0);

  return '.';
}

function commonjsResolveImpl (path, originalModuleDir, testCache) {
	var shouldTryNodeModules = isPossibleNodeModulesPath(path);
	path = normalize$1(path);
	var relPath;
	if (path[0] === '/') {
		originalModuleDir = '/';
	}
	while (true) {
		if (!shouldTryNodeModules) {
			relPath = originalModuleDir ? normalize$1(originalModuleDir + '/' + path) : path;
		} else if (originalModuleDir) {
			relPath = normalize$1(originalModuleDir + '/node_modules/' + path);
		} else {
			relPath = normalize$1(join('node_modules', path));
		}

		if (relPath.endsWith('/..')) {
			break; // Travelled too far up, avoid infinite loop
		}

		for (var extensionIndex = 0; extensionIndex < CHECKED_EXTENSIONS.length; extensionIndex++) {
			var resolvedPath = relPath + CHECKED_EXTENSIONS[extensionIndex];
			if (DYNAMIC_REQUIRE_CACHE[resolvedPath]) {
				return resolvedPath;
			}
			if (DYNAMIC_REQUIRE_SHORTS[resolvedPath]) {
			  return resolvedPath;
			}
			if (DYNAMIC_REQUIRE_LOADERS[resolvedPath]) {
				return resolvedPath;
			}
		}
		if (!shouldTryNodeModules) break;
		var nextDir = normalize$1(originalModuleDir + '/..');
		if (nextDir === originalModuleDir) break;
		originalModuleDir = nextDir;
	}
	return null;
}

function commonjsResolve (path, originalModuleDir) {
	var resolvedPath = commonjsResolveImpl(path, originalModuleDir);
	if (resolvedPath !== null) {
		return resolvedPath;
	}
	return require.resolve(path);
}

function commonjsRequire (path, originalModuleDir) {
	var resolvedPath = commonjsResolveImpl(path, originalModuleDir);
	if (resolvedPath !== null) {
    var cachedModule = DYNAMIC_REQUIRE_CACHE[resolvedPath];
    if (cachedModule) return cachedModule.exports;
    var shortTo = DYNAMIC_REQUIRE_SHORTS[resolvedPath];
    if (shortTo) {
      cachedModule = DYNAMIC_REQUIRE_CACHE[shortTo];
      if (cachedModule)
        return cachedModule.exports;
      resolvedPath = commonjsResolveImpl(shortTo, null);
    }
    var loader = DYNAMIC_REQUIRE_LOADERS[resolvedPath];
    if (loader) {
      DYNAMIC_REQUIRE_CACHE[resolvedPath] = cachedModule = {
        id: resolvedPath,
        filename: resolvedPath,
        path: dirname(resolvedPath),
        exports: {},
        parent: DEFAULT_PARENT_MODULE,
        loaded: false,
        children: [],
        paths: [],
        require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? cachedModule.path : base);
        }
      };
      try {
        loader.call(commonjsGlobal, cachedModule, cachedModule.exports);
      } catch (error) {
        delete DYNAMIC_REQUIRE_CACHE[resolvedPath];
        throw error;
      }
      cachedModule.loaded = true;
      return cachedModule.exports;
    }	}
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

commonjsRequire.cache = DYNAMIC_REQUIRE_CACHE;
commonjsRequire.resolve = commonjsResolve;

var util$1 = {};

var types = {};

var maybeJSBI$E = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
/* eslint complexity: [2, 18], max-statements: [2, 33] */


var shams$1 = function hasSymbols() {
  if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') {
    return false;
  }

  if (_typeof(Symbol.iterator) === 'symbol') {
    return true;
  }

  var obj = {};
  var sym = Symbol('test');
  var symObj = Object(sym);

  if (typeof sym === 'string') {
    return false;
  }

  if (Object.prototype.toString.call(sym) !== '[object Symbol]') {
    return false;
  }

  if (Object.prototype.toString.call(symObj) !== '[object Symbol]') {
    return false;
  } // temp disabled per https://github.com/ljharb/object.assign/issues/17
  // if (sym instanceof Symbol) { return false; }
  // temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
  // if (!(symObj instanceof Symbol)) { return false; }
  // if (typeof Symbol.prototype.toString !== 'function') { return false; }
  // if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }


  var symVal = 42;
  obj[sym] = symVal;

  for (sym in obj) {
    return false;
  } // eslint-disable-line no-restricted-syntax, no-unreachable-loop


  if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) {
    return false;
  }

  if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) {
    return false;
  }

  var syms = Object.getOwnPropertySymbols(obj);

  if (syms.length !== 1 || maybeJSBI$E.notEqual(syms[0], sym)) {
    return false;
  }

  if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
    return false;
  }

  if (typeof Object.getOwnPropertyDescriptor === 'function') {
    var descriptor = Object.getOwnPropertyDescriptor(obj, sym);

    if (descriptor.value !== symVal || maybeJSBI$E.notEqual(descriptor.enumerable, true)) {
      return false;
    }
  }

  return true;
};

var hasSymbols$2 = shams$1;

var shams = function hasToStringTagShams() {
  return hasSymbols$2() && !!Symbol.toStringTag;
};

var origSymbol = typeof Symbol !== 'undefined' && Symbol;
var hasSymbolSham = shams$1;

var hasSymbols$1 = function hasNativeSymbols() {
  if (typeof origSymbol !== 'function') {
    return false;
  }

  if (typeof Symbol !== 'function') {
    return false;
  }

  if (_typeof(origSymbol('foo')) !== 'symbol') {
    return false;
  }

  if (_typeof(Symbol('bar')) !== 'symbol') {
    return false;
  }

  return hasSymbolSham();
};

var maybeJSBI$D = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
/* eslint no-invalid-this: 1 */


var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr$1 = Object.prototype.toString;
var funcType = '[object Function]';

var implementation$1 = function bind(that) {
  var target = this;

  if (typeof target !== 'function' || toStr$1.call(target) !== funcType) {
    throw new TypeError(ERROR_MESSAGE + target);
  }

  var args = slice.call(arguments, 1);
  var bound;

  var binder = function binder() {
    if (this instanceof bound) {
      var result = target.apply(this, args.concat(slice.call(arguments)));

      if (maybeJSBI$D.equal(Object(result), result)) {
        return result;
      }

      return this;
    } else {
      return target.apply(that, args.concat(slice.call(arguments)));
    }
  };

  var boundLength = Math.max(0, maybeJSBI$D.subtract(target.length, args.length));
  var boundArgs = [];

  for (var i = 0; i < boundLength; i++) {
    boundArgs.push('$' + i);
  }

  bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

  if (target.prototype) {
    var Empty = function Empty() {};

    Empty.prototype = target.prototype;
    bound.prototype = new Empty();
    Empty.prototype = null;
  }

  return bound;
};

var implementation = implementation$1;
var functionBind = Function.prototype.bind || implementation;

var bind$1 = functionBind;
var src = bind$1.call(Function.call, Object.prototype.hasOwnProperty);

var maybeJSBI$C = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

var undefined$1;
var $SyntaxError = SyntaxError;
var $Function = Function;
var $TypeError = TypeError; // eslint-disable-next-line consistent-return

var getEvalledConstructor = function getEvalledConstructor(expressionSyntax) {
  try {
    return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
  } catch (e) {}
};

var $gOPD$2 = Object.getOwnPropertyDescriptor;

if ($gOPD$2) {
  try {
    $gOPD$2({}, '');
  } catch (e) {
    $gOPD$2 = null; // this is IE 8, which has a broken gOPD
  }
}

var throwTypeError = function throwTypeError() {
  throw new $TypeError();
};

var ThrowTypeError = $gOPD$2 ? function () {
  try {
    // eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
    arguments.callee; // IE 8 does not throw here

    return throwTypeError;
  } catch (calleeThrows) {
    try {
      // IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
      return $gOPD$2(arguments, 'callee').get;
    } catch (gOPDthrows) {
      return throwTypeError;
    }
  }
}() : throwTypeError;
var hasSymbols = hasSymbols$1();

var getProto$1 = Object.getPrototypeOf || function (x) {
  return x.__proto__;
}; // eslint-disable-line no-proto


var needsEval = {};
var TypedArray = typeof Uint8Array === 'undefined' ? undefined$1 : getProto$1(Uint8Array);
var INTRINSICS = {
  '%AggregateError%': typeof AggregateError === 'undefined' ? undefined$1 : AggregateError,
  '%Array%': Array,
  '%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined$1 : ArrayBuffer,
  '%ArrayIteratorPrototype%': hasSymbols ? getProto$1([][Symbol.iterator]()) : undefined$1,
  '%AsyncFromSyncIteratorPrototype%': undefined$1,
  '%AsyncFunction%': needsEval,
  '%AsyncGenerator%': needsEval,
  '%AsyncGeneratorFunction%': needsEval,
  '%AsyncIteratorPrototype%': needsEval,
  '%Atomics%': typeof Atomics === 'undefined' ? undefined$1 : Atomics,
  '%BigInt%': typeof BigInt === 'undefined' ? undefined$1 : BigInt,
  '%Boolean%': Boolean,
  '%DataView%': typeof DataView === 'undefined' ? undefined$1 : DataView,
  '%Date%': Date,
  '%decodeURI%': decodeURI,
  '%decodeURIComponent%': decodeURIComponent,
  '%encodeURI%': encodeURI,
  '%encodeURIComponent%': encodeURIComponent,
  '%Error%': Error,
  '%eval%': eval,
  // eslint-disable-line no-eval
  '%EvalError%': EvalError,
  '%Float32Array%': typeof Float32Array === 'undefined' ? undefined$1 : Float32Array,
  '%Float64Array%': typeof Float64Array === 'undefined' ? undefined$1 : Float64Array,
  '%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined$1 : FinalizationRegistry,
  '%Function%': $Function,
  '%GeneratorFunction%': needsEval,
  '%Int8Array%': typeof Int8Array === 'undefined' ? undefined$1 : Int8Array,
  '%Int16Array%': typeof Int16Array === 'undefined' ? undefined$1 : Int16Array,
  '%Int32Array%': typeof Int32Array === 'undefined' ? undefined$1 : Int32Array,
  '%isFinite%': isFinite,
  '%isNaN%': isNaN,
  '%IteratorPrototype%': hasSymbols ? getProto$1(getProto$1([][Symbol.iterator]())) : undefined$1,
  '%JSON%': (typeof JSON === "undefined" ? "undefined" : _typeof(JSON)) === 'object' ? JSON : undefined$1,
  '%Map%': typeof Map === 'undefined' ? undefined$1 : Map,
  '%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols ? undefined$1 : getProto$1(new Map()[Symbol.iterator]()),
  '%Math%': Math,
  '%Number%': Number,
  '%Object%': Object,
  '%parseFloat%': parseFloat,
  '%parseInt%': parseInt,
  '%Promise%': typeof Promise === 'undefined' ? undefined$1 : Promise,
  '%Proxy%': typeof Proxy === 'undefined' ? undefined$1 : Proxy,
  '%RangeError%': RangeError,
  '%ReferenceError%': ReferenceError,
  '%Reflect%': typeof Reflect === 'undefined' ? undefined$1 : Reflect,
  '%RegExp%': RegExp,
  '%Set%': typeof Set === 'undefined' ? undefined$1 : Set,
  '%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols ? undefined$1 : getProto$1(new Set()[Symbol.iterator]()),
  '%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined$1 : SharedArrayBuffer,
  '%String%': String,
  '%StringIteratorPrototype%': hasSymbols ? getProto$1(''[Symbol.iterator]()) : undefined$1,
  '%Symbol%': hasSymbols ? Symbol : undefined$1,
  '%SyntaxError%': $SyntaxError,
  '%ThrowTypeError%': ThrowTypeError,
  '%TypedArray%': TypedArray,
  '%TypeError%': $TypeError,
  '%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined$1 : Uint8Array,
  '%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined$1 : Uint8ClampedArray,
  '%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined$1 : Uint16Array,
  '%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined$1 : Uint32Array,
  '%URIError%': URIError,
  '%WeakMap%': typeof WeakMap === 'undefined' ? undefined$1 : WeakMap,
  '%WeakRef%': typeof WeakRef === 'undefined' ? undefined$1 : WeakRef,
  '%WeakSet%': typeof WeakSet === 'undefined' ? undefined$1 : WeakSet
};

var doEval = function doEval(name) {
  var value;

  if (name === '%AsyncFunction%') {
    value = getEvalledConstructor('async function () {}');
  } else if (name === '%GeneratorFunction%') {
    value = getEvalledConstructor('function* () {}');
  } else if (name === '%AsyncGeneratorFunction%') {
    value = getEvalledConstructor('async function* () {}');
  } else if (name === '%AsyncGenerator%') {
    var fn = doEval('%AsyncGeneratorFunction%');

    if (fn) {
      value = fn.prototype;
    }
  } else if (name === '%AsyncIteratorPrototype%') {
    var gen = doEval('%AsyncGenerator%');

    if (gen) {
      value = getProto$1(gen.prototype);
    }
  }

  INTRINSICS[name] = value;
  return value;
};

var LEGACY_ALIASES = {
  '%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
  '%ArrayPrototype%': ['Array', 'prototype'],
  '%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
  '%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
  '%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
  '%ArrayProto_values%': ['Array', 'prototype', 'values'],
  '%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
  '%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
  '%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
  '%BooleanPrototype%': ['Boolean', 'prototype'],
  '%DataViewPrototype%': ['DataView', 'prototype'],
  '%DatePrototype%': ['Date', 'prototype'],
  '%ErrorPrototype%': ['Error', 'prototype'],
  '%EvalErrorPrototype%': ['EvalError', 'prototype'],
  '%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
  '%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
  '%FunctionPrototype%': ['Function', 'prototype'],
  '%Generator%': ['GeneratorFunction', 'prototype'],
  '%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
  '%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
  '%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
  '%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
  '%JSONParse%': ['JSON', 'parse'],
  '%JSONStringify%': ['JSON', 'stringify'],
  '%MapPrototype%': ['Map', 'prototype'],
  '%NumberPrototype%': ['Number', 'prototype'],
  '%ObjectPrototype%': ['Object', 'prototype'],
  '%ObjProto_toString%': ['Object', 'prototype', 'toString'],
  '%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
  '%PromisePrototype%': ['Promise', 'prototype'],
  '%PromiseProto_then%': ['Promise', 'prototype', 'then'],
  '%Promise_all%': ['Promise', 'all'],
  '%Promise_reject%': ['Promise', 'reject'],
  '%Promise_resolve%': ['Promise', 'resolve'],
  '%RangeErrorPrototype%': ['RangeError', 'prototype'],
  '%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
  '%RegExpPrototype%': ['RegExp', 'prototype'],
  '%SetPrototype%': ['Set', 'prototype'],
  '%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
  '%StringPrototype%': ['String', 'prototype'],
  '%SymbolPrototype%': ['Symbol', 'prototype'],
  '%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
  '%TypedArrayPrototype%': ['TypedArray', 'prototype'],
  '%TypeErrorPrototype%': ['TypeError', 'prototype'],
  '%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
  '%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
  '%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
  '%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
  '%URIErrorPrototype%': ['URIError', 'prototype'],
  '%WeakMapPrototype%': ['WeakMap', 'prototype'],
  '%WeakSetPrototype%': ['WeakSet', 'prototype']
};
var bind = functionBind;
var hasOwn$1 = src;
var $concat = bind.call(Function.call, Array.prototype.concat);
var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
var $replace = bind.call(Function.call, String.prototype.replace);
var $strSlice = bind.call(Function.call, String.prototype.slice);
/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */

var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g;
/** Used to match backslashes in property paths. */

var stringToPath = function stringToPath(string) {
  var first = $strSlice(string, 0, 1);
  var last = $strSlice(string, -1);

  if (first === '%' && last !== '%') {
    throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
  } else if (last === '%' && first !== '%') {
    throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
  }

  var result = [];
  $replace(string, rePropName, function (match, number, quote, subString) {
    result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
  });
  return result;
};
/* end adaptation */


var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
  var intrinsicName = name;
  var alias;

  if (hasOwn$1(LEGACY_ALIASES, intrinsicName)) {
    alias = LEGACY_ALIASES[intrinsicName];
    intrinsicName = '%' + alias[0] + '%';
  }

  if (hasOwn$1(INTRINSICS, intrinsicName)) {
    var value = INTRINSICS[intrinsicName];

    if (maybeJSBI$C.equal(value, needsEval)) {
      value = doEval(intrinsicName);
    }

    if (typeof value === 'undefined' && !allowMissing) {
      throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
    }

    return {
      alias: alias,
      name: intrinsicName,
      value: value
    };
  }

  throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
};

var getIntrinsic = function GetIntrinsic(name, allowMissing) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new $TypeError('intrinsic name must be a non-empty string');
  }

  if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
    throw new $TypeError('"allowMissing" argument must be a boolean');
  }

  var parts = stringToPath(name);
  var intrinsicBaseName = parts.length > 0 ? parts[0] : '';
  var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
  var intrinsicRealName = intrinsic.name;
  var value = intrinsic.value;
  var skipFurtherCaching = false;
  var alias = intrinsic.alias;

  if (alias) {
    intrinsicBaseName = alias[0];
    $spliceApply(parts, $concat([0, 1], alias));
  }

  for (var i = 1, isOwn = true; i < parts.length; i += 1) {
    var part = parts[i];
    var first = $strSlice(part, 0, 1);
    var last = $strSlice(part, -1);

    if ((first === '"' || first === "'" || first === '`' || last === '"' || last === "'" || last === '`') && maybeJSBI$C.notEqual(first, last)) {
      throw new $SyntaxError('property names with quotes must have matching quotes');
    }

    if (part === 'constructor' || !isOwn) {
      skipFurtherCaching = true;
    }

    intrinsicBaseName += '.' + part;
    intrinsicRealName = '%' + intrinsicBaseName + '%';

    if (hasOwn$1(INTRINSICS, intrinsicRealName)) {
      value = INTRINSICS[intrinsicRealName];
    } else if (value != null) {
      if (!(part in value)) {
        if (!allowMissing) {
          throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
        }

        return void undefined$1;
      }

      if ($gOPD$2 && i + 1 >= parts.length) {
        var desc = $gOPD$2(value, part);
        isOwn = !!desc; // By convention, when a data property is converted to an accessor
        // property to emulate a data property that does not suffer from
        // the override mistake, that accessor's getter is marked with
        // an `originalValue` property. Here, when we detect this, we
        // uphold the illusion by pretending to see that original data
        // property, i.e., returning the value rather than the getter
        // itself.

        if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
          value = desc.get;
        } else {
          value = value[part];
        }
      } else {
        isOwn = hasOwn$1(value, part);
        value = value[part];
      }

      if (isOwn && !skipFurtherCaching) {
        INTRINSICS[intrinsicRealName] = value;
      }
    }
  }

  return value;
};

var callBind$1 = createModule("/$$rollup_base$$/node_modules/call-bind");

(function (module) {

  var bind = functionBind;
  var GetIntrinsic = getIntrinsic;
  var $apply = GetIntrinsic('%Function.prototype.apply%');
  var $call = GetIntrinsic('%Function.prototype.call%');
  var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);
  var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);
  var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);
  var $max = GetIntrinsic('%Math.max%');

  if ($defineProperty) {
    try {
      $defineProperty({}, 'a', {
        value: 1
      });
    } catch (e) {
      // IE 8 has a broken defineProperty
      $defineProperty = null;
    }
  }

  module.exports = function callBind(originalFunction) {
    var func = $reflectApply(bind, $call, arguments);

    if ($gOPD && $defineProperty) {
      var desc = $gOPD(func, 'length');

      if (desc.configurable) {
        // original length, plus the receiver, minus any additional arguments (after the receiver)
        $defineProperty(func, 'length', {
          value: 1 + $max(0, originalFunction.length - (arguments.length - 1))
        });
      }
    }

    return func;
  };

  var applyBind = function applyBind() {
    return $reflectApply(bind, $apply, arguments);
  };

  if ($defineProperty) {
    $defineProperty(module.exports, 'apply', {
      value: applyBind
    });
  } else {
    module.exports.apply = applyBind;
  }
})(callBind$1);

var GetIntrinsic$2 = getIntrinsic;
var callBind = callBind$1.exports;
var $indexOf$1 = callBind(GetIntrinsic$2('String.prototype.indexOf'));

var callBound$3 = function callBoundIntrinsic(name, allowMissing) {
  var intrinsic = GetIntrinsic$2(name, !!allowMissing);

  if (typeof intrinsic === 'function' && $indexOf$1(name, '.prototype.') > -1) {
    return callBind(intrinsic);
  }

  return intrinsic;
};

var hasToStringTag$3 = shams();
var callBound$2 = callBound$3;
var $toString$2 = callBound$2('Object.prototype.toString');

var isStandardArguments = function isArguments(value) {
  if (hasToStringTag$3 && value && _typeof(value) === 'object' && Symbol.toStringTag in value) {
    return false;
  }

  return $toString$2(value) === '[object Arguments]';
};

var isLegacyArguments = function isArguments(value) {
  if (isStandardArguments(value)) {
    return true;
  }

  return value !== null && _typeof(value) === 'object' && typeof value.length === 'number' && value.length >= 0 && $toString$2(value) !== '[object Array]' && $toString$2(value.callee) === '[object Function]';
};

var supportsStandardArguments = function () {
  return isStandardArguments(arguments);
}();

isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests

var isArguments = supportsStandardArguments ? isStandardArguments : isLegacyArguments;

var maybeJSBI$B = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

var toStr = Object.prototype.toString;
var fnToStr = Function.prototype.toString;
var isFnRegex = /^\s*(?:function)?\*/;
var hasToStringTag$2 = shams();
var getProto = Object.getPrototypeOf;

var getGeneratorFunc = function getGeneratorFunc() {
  // eslint-disable-line consistent-return
  if (!hasToStringTag$2) {
    return false;
  }

  try {
    return Function('return function*() {}')();
  } catch (e) {}
};

var GeneratorFunction;

var isGeneratorFunction = function isGeneratorFunction(fn) {
  if (typeof fn !== 'function') {
    return false;
  }

  if (isFnRegex.test(fnToStr.call(fn))) {
    return true;
  }

  if (!hasToStringTag$2) {
    var str = toStr.call(fn);
    return str === '[object GeneratorFunction]';
  }

  if (!getProto) {
    return false;
  }

  if (typeof GeneratorFunction === 'undefined') {
    var generatorFunc = getGeneratorFunc();
    GeneratorFunction = generatorFunc ? getProto(generatorFunc) : false;
  }

  return maybeJSBI$B.equal(getProto(fn), GeneratorFunction);
};

var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

var foreach = function forEach(obj, fn, ctx) {
  if (toString.call(fn) !== '[object Function]') {
    throw new TypeError('iterator must be a function');
  }

  var l = obj.length;

  if (l === +l) {
    for (var i = 0; i < l; i++) {
      fn.call(ctx, obj[i], i, obj);
    }
  } else {
    for (var k in obj) {
      if (hasOwn.call(obj, k)) {
        fn.call(ctx, obj[k], k, obj);
      }
    }
  }
};

var possibleNames = ['BigInt64Array', 'BigUint64Array', 'Float32Array', 'Float64Array', 'Int16Array', 'Int32Array', 'Int8Array', 'Uint16Array', 'Uint32Array', 'Uint8Array', 'Uint8ClampedArray'];
var g$2 = typeof globalThis === 'undefined' ? commonjsGlobal : globalThis;

var availableTypedArrays$2 = function availableTypedArrays() {
  var out = [];

  for (var i = 0; i < possibleNames.length; i++) {
    if (typeof g$2[possibleNames[i]] === 'function') {
      out[out.length] = possibleNames[i];
    }
  }

  return out;
};

var GetIntrinsic$1 = getIntrinsic;
var $gOPD$1 = GetIntrinsic$1('%Object.getOwnPropertyDescriptor%', true);

if ($gOPD$1) {
  try {
    $gOPD$1([], 'length');
  } catch (e) {
    // IE 8 has a broken gOPD
    $gOPD$1 = null;
  }
}

var getOwnPropertyDescriptor$1 = $gOPD$1;

var GetIntrinsic = getIntrinsic;
var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);

if ($gOPD) {
  try {
    $gOPD([], 'length');
  } catch (e) {
    // IE 8 has a broken gOPD
    $gOPD = null;
  }
}

var getOwnPropertyDescriptor = $gOPD;

var maybeJSBI$A = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

var forEach$1 = foreach;
var availableTypedArrays$1 = availableTypedArrays$2;
var callBound$1 = callBound$3;
var $toString$1 = callBound$1('Object.prototype.toString');
var hasToStringTag$1 = shams();
var g$1 = typeof globalThis === 'undefined' ? commonjsGlobal : globalThis;
var typedArrays$1 = availableTypedArrays$1();

var $indexOf = callBound$1('Array.prototype.indexOf', true) || function indexOf(array, value) {
  for (var i = 0; i < array.length; i += 1) {
    if (maybeJSBI$A.equal(array[i], value)) {
      return i;
    }
  }

  return -1;
};

var $slice$1 = callBound$1('String.prototype.slice');
var toStrTags$1 = {};
var gOPD$1 = getOwnPropertyDescriptor;
var getPrototypeOf$1 = Object.getPrototypeOf; // require('getprototypeof');

if (hasToStringTag$1 && gOPD$1 && getPrototypeOf$1) {
  forEach$1(typedArrays$1, function (typedArray) {
    var arr = new g$1[typedArray]();

    if (Symbol.toStringTag in arr) {
      var proto = getPrototypeOf$1(arr);
      var descriptor = gOPD$1(proto, Symbol.toStringTag);

      if (!descriptor) {
        var superProto = getPrototypeOf$1(proto);
        descriptor = gOPD$1(superProto, Symbol.toStringTag);
      }

      toStrTags$1[typedArray] = descriptor.get;
    }
  });
}

var tryTypedArrays$1 = function tryAllTypedArrays(value) {
  var anyTrue = false;
  forEach$1(toStrTags$1, function (getter, typedArray) {
    if (!anyTrue) {
      try {
        anyTrue = maybeJSBI$A.equal(getter.call(value), typedArray);
      } catch (e) {
        /**/
      }
    }
  });
  return anyTrue;
};

var isTypedArray$1 = function isTypedArray(value) {
  if (!value || _typeof(value) !== 'object') {
    return false;
  }

  if (!hasToStringTag$1 || !(Symbol.toStringTag in value)) {
    var tag = $slice$1($toString$1(value), 8, -1);
    return $indexOf(typedArrays$1, tag) > -1;
  }

  if (!gOPD$1) {
    return false;
  }

  return tryTypedArrays$1(value);
};

var maybeJSBI$z = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

var forEach = foreach;
var availableTypedArrays = availableTypedArrays$2;
var callBound = callBound$3;
var $toString = callBound('Object.prototype.toString');
var hasToStringTag = shams();
var g = typeof globalThis === 'undefined' ? commonjsGlobal : globalThis;
var typedArrays = availableTypedArrays();
var $slice = callBound('String.prototype.slice');
var toStrTags = {};
var gOPD = getOwnPropertyDescriptor$1;
var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');

if (hasToStringTag && gOPD && getPrototypeOf) {
  forEach(typedArrays, function (typedArray) {
    if (typeof g[typedArray] === 'function') {
      var arr = new g[typedArray]();

      if (Symbol.toStringTag in arr) {
        var proto = getPrototypeOf(arr);
        var descriptor = gOPD(proto, Symbol.toStringTag);

        if (!descriptor) {
          var superProto = getPrototypeOf(proto);
          descriptor = gOPD(superProto, Symbol.toStringTag);
        }

        toStrTags[typedArray] = descriptor.get;
      }
    }
  });
}

var tryTypedArrays = function tryAllTypedArrays(value) {
  var foundName = false;
  forEach(toStrTags, function (getter, typedArray) {
    if (!foundName) {
      try {
        var name = getter.call(value);

        if (maybeJSBI$z.equal(name, typedArray)) {
          foundName = name;
        }
      } catch (e) {}
    }
  });
  return foundName;
};

var isTypedArray = isTypedArray$1;

var whichTypedArray = function whichTypedArray(value) {
  if (!isTypedArray(value)) {
    return false;
  }

  if (!hasToStringTag || !(Symbol.toStringTag in value)) {
    return $slice($toString(value), 8, -1);
  }

  return tryTypedArrays(value);
};

(function (exports) {

  var isArgumentsObject = isArguments;
  var isGeneratorFunction$1 = isGeneratorFunction;
  var whichTypedArray$1 = whichTypedArray;
  var isTypedArray = isTypedArray$1;

  function uncurryThis(f) {
    return f.call.bind(f);
  }

  var BigIntSupported = typeof BigInt !== 'undefined';
  var SymbolSupported = typeof Symbol !== 'undefined';
  var ObjectToString = uncurryThis(Object.prototype.toString);
  var numberValue = uncurryThis(Number.prototype.valueOf);
  var stringValue = uncurryThis(String.prototype.valueOf);
  var booleanValue = uncurryThis(Boolean.prototype.valueOf);

  if (BigIntSupported) {
    var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
  }

  if (SymbolSupported) {
    var symbolValue = uncurryThis(Symbol.prototype.valueOf);
  }

  function checkBoxedPrimitive(value, prototypeValueOf) {
    if (_typeof(value) !== 'object') {
      return false;
    }

    try {
      prototypeValueOf(value);
      return true;
    } catch (e) {
      return false;
    }
  }

  exports.isArgumentsObject = isArgumentsObject;
  exports.isGeneratorFunction = isGeneratorFunction$1;
  exports.isTypedArray = isTypedArray; // Taken from here and modified for better browser support
  // https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js

  function isPromise(input) {
    return typeof Promise !== 'undefined' && input instanceof Promise || input !== null && _typeof(input) === 'object' && typeof input.then === 'function' && typeof input["catch"] === 'function';
  }

  exports.isPromise = isPromise;

  function isArrayBufferView(value) {
    if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
      return ArrayBuffer.isView(value);
    }

    return isTypedArray(value) || isDataView(value);
  }

  exports.isArrayBufferView = isArrayBufferView;

  function isUint8Array(value) {
    return whichTypedArray$1(value) === 'Uint8Array';
  }

  exports.isUint8Array = isUint8Array;

  function isUint8ClampedArray(value) {
    return whichTypedArray$1(value) === 'Uint8ClampedArray';
  }

  exports.isUint8ClampedArray = isUint8ClampedArray;

  function isUint16Array(value) {
    return whichTypedArray$1(value) === 'Uint16Array';
  }

  exports.isUint16Array = isUint16Array;

  function isUint32Array(value) {
    return whichTypedArray$1(value) === 'Uint32Array';
  }

  exports.isUint32Array = isUint32Array;

  function isInt8Array(value) {
    return whichTypedArray$1(value) === 'Int8Array';
  }

  exports.isInt8Array = isInt8Array;

  function isInt16Array(value) {
    return whichTypedArray$1(value) === 'Int16Array';
  }

  exports.isInt16Array = isInt16Array;

  function isInt32Array(value) {
    return whichTypedArray$1(value) === 'Int32Array';
  }

  exports.isInt32Array = isInt32Array;

  function isFloat32Array(value) {
    return whichTypedArray$1(value) === 'Float32Array';
  }

  exports.isFloat32Array = isFloat32Array;

  function isFloat64Array(value) {
    return whichTypedArray$1(value) === 'Float64Array';
  }

  exports.isFloat64Array = isFloat64Array;

  function isBigInt64Array(value) {
    return whichTypedArray$1(value) === 'BigInt64Array';
  }

  exports.isBigInt64Array = isBigInt64Array;

  function isBigUint64Array(value) {
    return whichTypedArray$1(value) === 'BigUint64Array';
  }

  exports.isBigUint64Array = isBigUint64Array;

  function isMapToString(value) {
    return ObjectToString(value) === '[object Map]';
  }

  isMapToString.working = typeof Map !== 'undefined' && isMapToString(new Map());

  function isMap(value) {
    if (typeof Map === 'undefined') {
      return false;
    }

    return isMapToString.working ? isMapToString(value) : value instanceof Map;
  }

  exports.isMap = isMap;

  function isSetToString(value) {
    return ObjectToString(value) === '[object Set]';
  }

  isSetToString.working = typeof Set !== 'undefined' && isSetToString(new Set());

  function isSet(value) {
    if (typeof Set === 'undefined') {
      return false;
    }

    return isSetToString.working ? isSetToString(value) : value instanceof Set;
  }

  exports.isSet = isSet;

  function isWeakMapToString(value) {
    return ObjectToString(value) === '[object WeakMap]';
  }

  isWeakMapToString.working = typeof WeakMap !== 'undefined' && isWeakMapToString(new WeakMap());

  function isWeakMap(value) {
    if (typeof WeakMap === 'undefined') {
      return false;
    }

    return isWeakMapToString.working ? isWeakMapToString(value) : value instanceof WeakMap;
  }

  exports.isWeakMap = isWeakMap;

  function isWeakSetToString(value) {
    return ObjectToString(value) === '[object WeakSet]';
  }

  isWeakSetToString.working = typeof WeakSet !== 'undefined' && isWeakSetToString(new WeakSet());

  function isWeakSet(value) {
    return isWeakSetToString(value);
  }

  exports.isWeakSet = isWeakSet;

  function isArrayBufferToString(value) {
    return ObjectToString(value) === '[object ArrayBuffer]';
  }

  isArrayBufferToString.working = typeof ArrayBuffer !== 'undefined' && isArrayBufferToString(new ArrayBuffer());

  function isArrayBuffer(value) {
    if (typeof ArrayBuffer === 'undefined') {
      return false;
    }

    return isArrayBufferToString.working ? isArrayBufferToString(value) : value instanceof ArrayBuffer;
  }

  exports.isArrayBuffer = isArrayBuffer;

  function isDataViewToString(value) {
    return ObjectToString(value) === '[object DataView]';
  }

  isDataViewToString.working = typeof ArrayBuffer !== 'undefined' && typeof DataView !== 'undefined' && isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1));

  function isDataView(value) {
    if (typeof DataView === 'undefined') {
      return false;
    }

    return isDataViewToString.working ? isDataViewToString(value) : value instanceof DataView;
  }

  exports.isDataView = isDataView; // Store a copy of SharedArrayBuffer in case it's deleted elsewhere

  var SharedArrayBufferCopy = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : undefined;

  function isSharedArrayBufferToString(value) {
    return ObjectToString(value) === '[object SharedArrayBuffer]';
  }

  function isSharedArrayBuffer(value) {
    if (typeof SharedArrayBufferCopy === 'undefined') {
      return false;
    }

    if (typeof isSharedArrayBufferToString.working === 'undefined') {
      isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy());
    }

    return isSharedArrayBufferToString.working ? isSharedArrayBufferToString(value) : value instanceof SharedArrayBufferCopy;
  }

  exports.isSharedArrayBuffer = isSharedArrayBuffer;

  function isAsyncFunction(value) {
    return ObjectToString(value) === '[object AsyncFunction]';
  }

  exports.isAsyncFunction = isAsyncFunction;

  function isMapIterator(value) {
    return ObjectToString(value) === '[object Map Iterator]';
  }

  exports.isMapIterator = isMapIterator;

  function isSetIterator(value) {
    return ObjectToString(value) === '[object Set Iterator]';
  }

  exports.isSetIterator = isSetIterator;

  function isGeneratorObject(value) {
    return ObjectToString(value) === '[object Generator]';
  }

  exports.isGeneratorObject = isGeneratorObject;

  function isWebAssemblyCompiledModule(value) {
    return ObjectToString(value) === '[object WebAssembly.Module]';
  }

  exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;

  function isNumberObject(value) {
    return checkBoxedPrimitive(value, numberValue);
  }

  exports.isNumberObject = isNumberObject;

  function isStringObject(value) {
    return checkBoxedPrimitive(value, stringValue);
  }

  exports.isStringObject = isStringObject;

  function isBooleanObject(value) {
    return checkBoxedPrimitive(value, booleanValue);
  }

  exports.isBooleanObject = isBooleanObject;

  function isBigIntObject(value) {
    return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
  }

  exports.isBigIntObject = isBigIntObject;

  function isSymbolObject(value) {
    return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
  }

  exports.isSymbolObject = isSymbolObject;

  function isBoxedPrimitive(value) {
    return isNumberObject(value) || isStringObject(value) || isBooleanObject(value) || isBigIntObject(value) || isSymbolObject(value);
  }

  exports.isBoxedPrimitive = isBoxedPrimitive;

  function isAnyArrayBuffer(value) {
    return typeof Uint8Array !== 'undefined' && (isArrayBuffer(value) || isSharedArrayBuffer(value));
  }

  exports.isAnyArrayBuffer = isAnyArrayBuffer;
  ['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function (method) {
    Object.defineProperty(exports, method, {
      enumerable: false,
      value: function value() {
        throw new Error(method + ' is not supported in userland');
      }
    });
  });
})(types);

var isBuffer$1 = function isBuffer(arg) {
  return arg instanceof Buffer;
};

var inherits = createModule("/$$rollup_base$$/node_modules/util/node_modules/inherits");

var inherits_browser = createModule("/$$rollup_base$$/node_modules/util/node_modules/inherits");

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  inherits_browser.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    }
  };
} else {
  // old school shim for old browsers
  inherits_browser.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;

      var TempCtor = function TempCtor() {};

      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    }
  };
}

try {
  var util = require('util');
  /* istanbul ignore next */


  if (typeof util.inherits !== 'function') throw '';
  inherits.exports = util.inherits;
} catch (e) {
  /* istanbul ignore next */
  inherits.exports = inherits_browser.exports;
}

var maybeJSBI$y = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

(function (exports) {
  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.
  var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors || function getOwnPropertyDescriptors(obj) {
    var keys = Object.keys(obj);
    var descriptors = {};

    for (var i = 0; i < keys.length; i++) {
      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
    }

    return descriptors;
  };

  var formatRegExp = /%[sdj%]/g;

  exports.format = function (f) {
    if (!isString(f)) {
      var objects = [];

      for (var i = 0; i < arguments.length; i++) {
        objects.push(inspect(arguments[i]));
      }

      return objects.join(' ');
    }

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function (x) {
      if (x === '%%') return '%';
      if (i >= len) return x;

      switch (x) {
        case '%s':
          return String(args[i++]);

        case '%d':
          return maybeJSBI$y.toNumber(args[i++]);

        case '%j':
          try {
            return JSON.stringify(args[i++]);
          } catch (_) {
            return '[Circular]';
          }

        default:
          return x;
      }
    });

    for (var x = args[i]; i < len; x = args[++i]) {
      if (isNull(x) || !isObject(x)) {
        str += ' ' + x;
      } else {
        str += ' ' + inspect(x);
      }
    }

    return str;
  }; // Mark that a method should not be used.
  // Returns a modified function which warns once by default.
  // If --no-deprecation is set, then it is a no-op.


  exports.deprecate = function (fn, msg) {
    if (typeof process !== 'undefined' && maybeJSBI$y.equal(process.noDeprecation, true)) {
      return fn;
    } // Allow for deprecating things in the process of starting up.


    if (typeof process === 'undefined') {
      return function () {
        return exports.deprecate(fn, msg).apply(this, arguments);
      };
    }

    var warned = false;

    function deprecated() {
      if (!warned) {
        if (process.throwDeprecation) {
          throw new Error(msg);
        } else if (process.traceDeprecation) {
          console.trace(msg);
        } else {
          console.error(msg);
        }

        warned = true;
      }

      return fn.apply(this, arguments);
    }

    return deprecated;
  };

  var debugs = {};
  var debugEnvRegex = /^$/;

  if (process.env.NODE_DEBUG) {
    var debugEnv = process.env.NODE_DEBUG;
    debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replace(/\*/g, '.*').replace(/,/g, '$|^').toUpperCase();
    debugEnvRegex = new RegExp('^' + debugEnv + '$', 'i');
  }

  exports.debuglog = function (set) {
    set = set.toUpperCase();

    if (!debugs[set]) {
      if (debugEnvRegex.test(set)) {
        var pid = process.pid;

        debugs[set] = function () {
          var msg = exports.format.apply(exports, arguments);
          console.error('%s %d: %s', set, pid, msg);
        };
      } else {
        debugs[set] = function () {};
      }
    }

    return debugs[set];
  };
  /**
   * Echos the value of a value. Trys to print the value out
   * in the best way possible given the different types.
   *
   * @param {Object} obj The object to print out.
   * @param {Object} opts Optional options object that alters the output.
   */

  /* legacy: obj, showHidden, depth, colors*/


  function inspect(obj, opts) {
    // default options
    var ctx = {
      seen: [],
      stylize: stylizeNoColor
    }; // legacy...

    if (arguments.length >= 3) ctx.depth = arguments[2];
    if (arguments.length >= 4) ctx.colors = arguments[3];

    if (isBoolean(opts)) {
      // legacy...
      ctx.showHidden = opts;
    } else if (opts) {
      // got an "options" object
      exports._extend(ctx, opts);
    } // set default options


    if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
    if (isUndefined(ctx.depth)) ctx.depth = 2;
    if (isUndefined(ctx.colors)) ctx.colors = false;
    if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
    if (ctx.colors) ctx.stylize = stylizeWithColor;
    return formatValue(ctx, obj, ctx.depth);
  }

  exports.inspect = inspect; // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics

  inspect.colors = {
    'bold': [1, 22],
    'italic': [3, 23],
    'underline': [4, 24],
    'inverse': [7, 27],
    'white': [37, 39],
    'grey': [90, 39],
    'black': [30, 39],
    'blue': [34, 39],
    'cyan': [36, 39],
    'green': [32, 39],
    'magenta': [35, 39],
    'red': [31, 39],
    'yellow': [33, 39]
  }; // Don't use 'blue' not visible on cmd.exe

  inspect.styles = {
    'special': 'cyan',
    'number': 'yellow',
    'boolean': 'yellow',
    'undefined': 'grey',
    'null': 'bold',
    'string': 'green',
    'date': 'magenta',
    // "name": intentionally not styling
    'regexp': 'red'
  };

  function stylizeWithColor(str, styleType) {
    var style = inspect.styles[styleType];

    if (style) {
      return "\x1B[" + inspect.colors[style][0] + 'm' + str + "\x1B[" + inspect.colors[style][1] + 'm';
    } else {
      return str;
    }
  }

  function stylizeNoColor(str, styleType) {
    return str;
  }

  function arrayToHash(array) {
    var hash = {};
    array.forEach(function (val, idx) {
      hash[val] = true;
    });
    return hash;
  }

  function formatValue(ctx, value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (ctx.customInspect && value && isFunction(value.inspect) && // Filter out the util module, it's inspect function is special
    maybeJSBI$y.notEqual(value.inspect, exports.inspect) && // Also filter out any prototype objects using the circular check.
    !(value.constructor && maybeJSBI$y.equal(value.constructor.prototype, value))) {
      var ret = value.inspect(recurseTimes, ctx);

      if (!isString(ret)) {
        ret = formatValue(ctx, ret, recurseTimes);
      }

      return ret;
    } // Primitive types cannot have properties


    var primitive = formatPrimitive(ctx, value);

    if (primitive) {
      return primitive;
    } // Look up the keys of the object.


    var keys = Object.keys(value);
    var visibleKeys = arrayToHash(keys);

    if (ctx.showHidden) {
      keys = Object.getOwnPropertyNames(value);
    } // IE doesn't make error fields non-enumerable
    // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx


    if (isError(value) && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
      return formatError(value);
    } // Some type of object without properties can be shortcutted.


    if (keys.length === 0) {
      if (isFunction(value)) {
        var name = value.name ? ': ' + value.name : '';
        return ctx.stylize('[Function' + name + ']', 'special');
      }

      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      }

      if (isDate(value)) {
        return ctx.stylize(Date.prototype.toString.call(value), 'date');
      }

      if (isError(value)) {
        return formatError(value);
      }
    }

    var base = '',
        array = false,
        braces = ['{', '}']; // Make Array say that they are Array

    if (isArray(value)) {
      array = true;
      braces = ['[', ']'];
    } // Make functions say that they are functions


    if (isFunction(value)) {
      var n = value.name ? ': ' + value.name : '';
      base = ' [Function' + n + ']';
    } // Make RegExps say that they are RegExps


    if (isRegExp(value)) {
      base = ' ' + RegExp.prototype.toString.call(value);
    } // Make dates with properties first say the date


    if (isDate(value)) {
      base = ' ' + Date.prototype.toUTCString.call(value);
    } // Make error with message first say the error


    if (isError(value)) {
      base = ' ' + formatError(value);
    }

    if (keys.length === 0 && (!array || value.length == 0)) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      } else {
        return ctx.stylize('[Object]', 'special');
      }
    }

    ctx.seen.push(value);
    var output;

    if (array) {
      output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
    } else {
      output = keys.map(function (key) {
        return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
      });
    }

    ctx.seen.pop();
    return reduceToSingleString(output, base, braces);
  }

  function formatPrimitive(ctx, value) {
    if (isUndefined(value)) return ctx.stylize('undefined', 'undefined');

    if (isString(value)) {
      var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '').replace(/'/g, "\\'").replace(/\\"/g, '"') + '\'';
      return ctx.stylize(simple, 'string');
    }

    if (isNumber(value)) return ctx.stylize('' + value, 'number');
    if (isBoolean(value)) return ctx.stylize('' + value, 'boolean'); // For some reason typeof null is "object", so special case here.

    if (isNull(value)) return ctx.stylize('null', 'null');
  }

  function formatError(value) {
    return '[' + Error.prototype.toString.call(value) + ']';
  }

  function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
    var output = [];

    for (var i = 0, l = value.length; i < l; ++i) {
      if (hasOwnProperty(value, String(i))) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
      } else {
        output.push('');
      }
    }

    keys.forEach(function (key) {
      if (!key.match(/^\d+$/)) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
      }
    });
    return output;
  }

  function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
    var name, str, desc;
    desc = Object.getOwnPropertyDescriptor(value, key) || {
      value: value[key]
    };

    if (desc.get) {
      if (desc.set) {
        str = ctx.stylize('[Getter/Setter]', 'special');
      } else {
        str = ctx.stylize('[Getter]', 'special');
      }
    } else {
      if (desc.set) {
        str = ctx.stylize('[Setter]', 'special');
      }
    }

    if (!hasOwnProperty(visibleKeys, key)) {
      name = '[' + key + ']';
    }

    if (!str) {
      if (ctx.seen.indexOf(desc.value) < 0) {
        if (isNull(recurseTimes)) {
          str = formatValue(ctx, desc.value, null);
        } else {
          str = formatValue(ctx, desc.value, recurseTimes - 1);
        }

        if (str.indexOf('\n') > -1) {
          if (array) {
            str = str.split('\n').map(function (line) {
              return '  ' + line;
            }).join('\n').substr(2);
          } else {
            str = '\n' + str.split('\n').map(function (line) {
              return '   ' + line;
            }).join('\n');
          }
        }
      } else {
        str = ctx.stylize('[Circular]', 'special');
      }
    }

    if (isUndefined(name)) {
      if (array && key.match(/^\d+$/)) {
        return str;
      }

      name = JSON.stringify('' + key);

      if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
        name = name.substr(1, name.length - 2);
        name = ctx.stylize(name, 'name');
      } else {
        name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
        name = ctx.stylize(name, 'string');
      }
    }

    return name + ': ' + str;
  }

  function reduceToSingleString(output, base, braces) {
    var length = output.reduce(function (prev, cur) {
      if (cur.indexOf('\n') >= 0) ;
      return maybeJSBI$y.add(prev, cur.replace(/\u001b\[\d\d?m/g, '').length) + 1;
    }, 0);

    if (length > 60) {
      return braces[0] + (base === '' ? '' : base + '\n ') + ' ' + output.join(',\n  ') + ' ' + braces[1];
    }

    return maybeJSBI$y.add(braces[0], base) + ' ' + output.join(', ') + ' ' + braces[1];
  } // NOTE: These type checking functions intentionally don't use `instanceof`
  // because it is fragile and can be easily faked with `Object.create()`.


  exports.types = types;

  function isArray(ar) {
    return Array.isArray(ar);
  }

  exports.isArray = isArray;

  function isBoolean(arg) {
    return typeof arg === 'boolean';
  }

  exports.isBoolean = isBoolean;

  function isNull(arg) {
    return arg === null;
  }

  exports.isNull = isNull;

  function isNullOrUndefined(arg) {
    return arg == null;
  }

  exports.isNullOrUndefined = isNullOrUndefined;

  function isNumber(arg) {
    return typeof arg === 'number';
  }

  exports.isNumber = isNumber;

  function isString(arg) {
    return typeof arg === 'string';
  }

  exports.isString = isString;

  function isSymbol(arg) {
    return _typeof(arg) === 'symbol';
  }

  exports.isSymbol = isSymbol;

  function isUndefined(arg) {
    return arg === void 0;
  }

  exports.isUndefined = isUndefined;

  function isRegExp(re) {
    return isObject(re) && objectToString(re) === '[object RegExp]';
  }

  exports.isRegExp = isRegExp;
  exports.types.isRegExp = isRegExp;

  function isObject(arg) {
    return _typeof(arg) === 'object' && arg !== null;
  }

  exports.isObject = isObject;

  function isDate(d) {
    return isObject(d) && objectToString(d) === '[object Date]';
  }

  exports.isDate = isDate;
  exports.types.isDate = isDate;

  function isError(e) {
    return isObject(e) && (objectToString(e) === '[object Error]' || e instanceof Error);
  }

  exports.isError = isError;
  exports.types.isNativeError = isError;

  function isFunction(arg) {
    return typeof arg === 'function';
  }

  exports.isFunction = isFunction;

  function isPrimitive(arg) {
    return arg === null || typeof arg === 'boolean' || typeof arg === 'number' || typeof arg === 'string' || _typeof(arg) === 'symbol' || // ES6 symbol
    typeof arg === 'undefined';
  }

  exports.isPrimitive = isPrimitive;
  exports.isBuffer = isBuffer$1;

  function objectToString(o) {
    return Object.prototype.toString.call(o);
  }

  function pad(n) {
    return n < 10 ? '0' + n.toString(10) : n.toString(10);
  }

  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; // 26 Feb 16:19:34

  function timestamp() {
    var d = new Date();
    var time = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':');
    return [d.getDate(), months[d.getMonth()], time].join(' ');
  } // log is just a thin wrapper to console.log that prepends a timestamp


  exports.log = function () {
    console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
  };
  /**
   * Inherit the prototype methods from one constructor into another.
   *
   * The Function.prototype.inherits from lang.js rewritten as a standalone
   * function (not on Function.prototype). NOTE: If this file is to be loaded
   * during bootstrapping this function needs to be rewritten using some native
   * functions as prototype setup using normal JavaScript does not work as
   * expected during bootstrapping (see mirror.js in r114903).
   *
   * @param {function} ctor Constructor function which needs to inherit the
   *     prototype.
   * @param {function} superCtor Constructor function to inherit prototype from.
   */


  exports.inherits = inherits.exports;

  exports._extend = function (origin, add) {
    // Don't do anything if add isn't an object
    if (!add || !isObject(add)) return origin;
    var keys = Object.keys(add);
    var i = keys.length;

    while (_x = i, i = maybeJSBI$y.subtract(i, maybeJSBI$y.BigInt(1)), _x) {
      var _x;

      origin[keys[i]] = add[keys[i]];
    }

    return origin;
  };

  function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }

  var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;

  exports.promisify = function promisify(original) {
    if (typeof original !== 'function') throw new TypeError('The "original" argument must be of type Function');

    if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
      var fn = original[kCustomPromisifiedSymbol];

      if (typeof fn !== 'function') {
        throw new TypeError('The "util.promisify.custom" argument must be of type Function');
      }

      Object.defineProperty(fn, kCustomPromisifiedSymbol, {
        value: fn,
        enumerable: false,
        writable: false,
        configurable: true
      });
      return fn;
    }

    function fn() {
      var promiseResolve, promiseReject;
      var promise = new Promise(function (resolve, reject) {
        promiseResolve = resolve;
        promiseReject = reject;
      });
      var args = [];

      for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
      }

      args.push(function (err, value) {
        if (err) {
          promiseReject(err);
        } else {
          promiseResolve(value);
        }
      });

      try {
        original.apply(this, args);
      } catch (err) {
        promiseReject(err);
      }

      return promise;
    }

    Object.setPrototypeOf(fn, Object.getPrototypeOf(original));
    if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn,
      enumerable: false,
      writable: false,
      configurable: true
    });
    return Object.defineProperties(fn, getOwnPropertyDescriptors(original));
  };

  exports.promisify.custom = kCustomPromisifiedSymbol;

  function callbackifyOnRejected(reason, cb) {
    // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
    // Because `null` is a special error value in callbacks which means "no error
    // occurred", we error-wrap so the callback consumer can distinguish between
    // "the promise rejected with null" or "the promise fulfilled with undefined".
    if (!reason) {
      var newReason = new Error('Promise was rejected with a falsy value');
      newReason.reason = reason;
      reason = newReason;
    }

    return cb(reason);
  }

  function callbackify(original) {
    if (typeof original !== 'function') {
      throw new TypeError('The "original" argument must be of type Function');
    } // We DO NOT return the promise as it gives the user a false sense that
    // the promise is actually somehow related to the callback's execution
    // and that the callback throwing will reject the promise.


    function callbackified() {
      var args = [];

      for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
      }

      var maybeCb = args.pop();

      if (typeof maybeCb !== 'function') {
        throw new TypeError('The last argument must be of type Function');
      }

      var self = this;

      var cb = function cb() {
        return maybeCb.apply(self, arguments);
      }; // In true node style we process the callback on `nextTick` with all the
      // implications (stack, `uncaughtException`, `async_hooks`)


      original.apply(this, args).then(function (ret) {
        process.nextTick(cb.bind(null, null, ret));
      }, function (rej) {
        process.nextTick(callbackifyOnRejected.bind(null, rej, cb));
      });
    }

    Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
    Object.defineProperties(callbackified, getOwnPropertyDescriptors(original));
    return callbackified;
  }

  exports.callbackify = callbackify;
})(util$1);

function evaluateThis(fn) {
  return fn('return this');
}

var xglobal = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : evaluateThis(Function);
function extractGlobal(name, fallback) {
  return typeof xglobal[name] === 'undefined' ? fallback : xglobal[name];
}

var _encoder = /*#__PURE__*/new WeakMap();

var Fallback = /*#__PURE__*/function () {
  function Fallback() {
    _classCallCheck(this, Fallback);

    _classPrivateFieldInitSpec(this, _encoder, {
      writable: true,
      value: void 0
    });

    _classPrivateFieldSet(this, _encoder, new util$1.TextEncoder());
  } // For a Jest 26.0.1 environment, Buffer !== Uint8Array


  _createClass(Fallback, [{
    key: "encode",
    value: function encode(value) {
      return Uint8Array.from(_classPrivateFieldGet(this, _encoder).encode(value));
    }
  }]);

  return Fallback;
}();

var TextEncoder$1 = extractGlobal('TextEncoder', Fallback);

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Do not edit, auto-generated by @polkadot/dev
var packageInfo$2 = {
  name: '@polkadot/util',
  path: require('url').pathToFileURL(__filename).toString() ? new URL(require('url').pathToFileURL(__filename).toString()).pathname.substring(0, new URL(require('url').pathToFileURL(__filename).toString()).pathname.lastIndexOf('/') + 1) : 'auto',
  type: 'esm',
  version: '8.7.1'
};

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0
// eslint-disable-next-line @typescript-eslint/ban-types

/**
 * @name isFunction
 * @summary Tests for a `function`.
 * @description
 * Checks to see if the input value is a JavaScript function.
 * @example
 * <BR>
 *
 * ```javascript
 * import { isFunction } from '@polkadot/util';
 *
 * isFunction(() => false); // => true
 * ```
 */
function isFunction(value) {
  return typeof value === 'function';
}

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name isString
 * @summary Tests for a string.
 * @description
 * Checks to see if the input value is a JavaScript string.
 * @example
 * <BR>
 *
 * ```javascript
 * import { isString } from '@polkadot/util';
 *
 * console.log('isString', isString('test')); // => true
 * ```
 */
function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name isNull
 * @summary Tests for a `null` values.
 * @description
 * Checks to see if the input value is `null`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { isNull } from '@polkadot/util';
 *
 * console.log('isNull', isNull(null)); // => true
 * ```
 */
function isNull(value) {
  return value === null;
}

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name isUndefined
 * @summary Tests for a `undefined` values.
 * @description
 * Checks to see if the input value is `undefined`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { isUndefined } from '@polkadot/util';
 *
 * console.log('isUndefined', isUndefined(void(0))); // => true
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isUndefined(value) {
  return typeof value === 'undefined';
}

/**
 * @name assert
 * @summary Checks for a valid test, if not Error is thrown.
 * @description
 * Checks that `test` is a truthy value. If value is falsy (`null`, `undefined`, `false`, ...), it throws an Error with the supplied `message`. When `test` passes, `true` is returned.
 * @example
 * <BR>
 *
 * ```javascript
 * const { assert } from '@polkadot/util';
 *
 * assert(true, 'True should be true'); // passes
 * assert(false, 'False should not be true'); // Error thrown
 * assert(false, () => 'message'); // Error with 'message'
 * ```
 */

function assert(condition, message) {
  if (!condition) {
    throw new Error(isFunction(message) ? message() : message);
  }
}
/**
 * @name assertReturn
 * @description Returns when the value is not undefined/null, otherwise throws assertion error
 */

function assertReturn(value, message) {
  assert(!isUndefined(value) && !isNull(value), message);
  return value;
}

var maybeJSBI$x = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
var DEDUPE = 'Either remove and explicitly install matching versions or dedupe using your package manager.\nThe following conflicting packages were found:';
/** @internal */

function getEntry(name) {
  var _global = xglobal;

  if (!_global.__polkadotjs) {
    _global.__polkadotjs = {};
  }

  if (!_global.__polkadotjs[name]) {
    _global.__polkadotjs[name] = [];
  }

  return _global.__polkadotjs[name];
}

function getVersionLength(all) {
  var length = 0;

  var _iterator = _createForOfIteratorHelper(all),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var version = _step.value.version;
      length = Math.max(length, version.length);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return length;
}
/** @internal */


function flattenInfos(all) {
  var verLength = getVersionLength(all);

  var stringify = function stringify(_ref) {
    var name = _ref.name,
        version = _ref.version;
    return "\t".concat(version.padEnd(verLength), "\t").concat(name);
  };

  return all.map(stringify).join('\n');
}
/** @internal */


function flattenVersions(entry) {
  var toPath = function toPath(version) {
    return isString(version) ? {
      version: version
    } : version;
  };

  var all = entry.map(toPath);
  var verLength = getVersionLength(all);

  var stringify = function stringify(_ref2) {
    var path = _ref2.path,
        type = _ref2.type,
        version = _ref2.version;
    return "\t".concat("".concat(type || '').padStart(3), " ").concat(version.padEnd(verLength), "\t").concat(!path || path.length < 5 ? '<unknown>' : path);
  };

  return all.map(stringify).join('\n');
}
/** @internal */


function getPath(infoPath, pathOrFn) {
  if (infoPath) {
    return infoPath;
  } else if (isFunction(pathOrFn)) {
    try {
      return pathOrFn() || '';
    } catch (error) {
      return '';
    }
  }

  return pathOrFn || '';
}
/**
 * @name detectPackage
 * @summary Checks that a specific package is only imported once
 * @description A `@polkadot/*` version detection utility, checking for one occurence of a package in addition to checking for ddependency versions.
 */


function detectPackage(_ref3, pathOrFn) {
  var name = _ref3.name,
      path = _ref3.path,
      type = _ref3.type,
      version = _ref3.version;
  var deps = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  assert(name.startsWith('@polkadot'), function () {
    return "Invalid package descriptor ".concat(name);
  });
  var entry = getEntry(name);
  entry.push({
    path: getPath(path, pathOrFn),
    type: type,
    version: version
  });

  if (entry.length !== 1) {
    console.warn("".concat(name, " has multiple versions, ensure that there is only one installed.\n").concat(DEDUPE, "\n").concat(flattenVersions(entry)));
  } else {
    var mismatches = deps.filter(function (d) {
      return d && maybeJSBI$x.notEqual(d.version, version);
    });

    if (mismatches.length) {
      console.warn("".concat(name, " requires direct dependencies exactly matching version ").concat(version, ".\n").concat(DEDUPE, "\n").concat(flattenInfos(mismatches)));
    }
  }
}

var BigInt$1 = typeof xglobal.BigInt === 'function' && typeof xglobal.BigInt.asIntN === 'function' ? xglobal.BigInt : function () {
  return Number.NaN;
};

var maybeJSBI$w = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
/**
 * @name _0n
 * @summary BigInt constant for 0.
 */

var _0n$2 = JSBI.BigInt(0);
/**
 * @name _1n
 * @summary BigInt constant for 1.
 */

var _1n$2 = JSBI.BigInt(1);
/**
 * @name _1Mn
 * @summary BigInt constant for 1,000,000.
 */

JSBI.BigInt(1000000);
/**
* @name _1Bn
* @summary BigInt constant for 1,000,000,000.
*/

var _1Bn = JSBI.BigInt(1000000000);
/**
* @name _1Qn
* @summary BigInt constant for 1,000,000,000,000,000,000.
*/

maybeJSBI$w.multiply(_1Bn, _1Bn);
/**
* @name _2pow53n
* @summary BigInt constant for MAX_SAFE_INTEGER
*/

JSBI.BigInt(Number.MAX_SAFE_INTEGER);

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name objectKeys
 * @summary A version of Object.keys that is typed for TS
 */
function objectKeys(value) {
  return Object.keys(value);
}

/**
 * @name objectSpread
 * @summary Concats all sources into the destination
 */

function objectSpread(dest) {
  for (var i = 0; i < (arguments.length <= 1 ? 0 : arguments.length - 1); i++) {
    var src = i + 1 < 1 || arguments.length <= i + 1 ? undefined : arguments[i + 1];

    if (src) {
      var keys = objectKeys(src);

      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        dest[key] = src[key];
      }
    }
  }

  return dest;
}

var maybeJSBI$v = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
var U8_MAX = JSBI.BigInt(256);
var U16_MAX = JSBI.BigInt(256 * 256);

function xor(input) {
  var result = new Uint8Array(input.length);
  var dvI = new DataView(input.buffer, input.byteOffset);
  var dvO = new DataView(result.buffer);
  var mod = input.length % 2;
  var length = input.length - mod;

  for (var i = 0; i < length; i += 2) {
    dvO.setUint16(i, dvI.getUint16(i) ^ 0xffff);
  }

  if (mod) {
    dvO.setUint8(length, dvI.getUint8(length) ^ 0xff);
  }

  return result;
}

function toBigInt(input) {
  var dvI = new DataView(input.buffer, input.byteOffset);
  var mod = input.length % 2;
  var length = input.length - mod;
  var result = JSBI.BigInt(0);

  for (var i = 0; i < length; i += 2) {
    result = JSBI.add(maybeJSBI$v.multiply(result, U16_MAX), JSBI.BigInt(dvI.getUint16(i)));
  }

  if (mod) {
    result = JSBI.add(maybeJSBI$v.multiply(result, U8_MAX), JSBI.BigInt(dvI.getUint8(length)));
  }

  return result;
}
/**
 * @name u8aToBigInt
 * @summary Creates a BigInt from a Uint8Array object.
 */


function u8aToBigInt(value) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (!value || !value.length) {
    return JSBI.BigInt(0);
  }

  var _objectSpread = objectSpread({
    isLe: true,
    isNegative: false
  }, options),
      isLe = _objectSpread.isLe,
      isNegative = _objectSpread.isNegative;

  var u8a = isLe ? value.reverse() : value;
  return isNegative ? maybeJSBI$v.subtract(maybeJSBI$v.multiply(toBigInt(xor(u8a)), maybeJSBI$v.unaryMinus(_1n$2)), _1n$2) : toBigInt(u8a);
}

var maybeJSBI$u = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0
var U8_TO_HEX = new Array(256);
var U16_TO_HEX = new Array(256 * 256);
var HEX_TO_U8 = {};
var HEX_TO_U16 = {};

for (var n = 0; n < 256; n++) {
  var hex$1 = n.toString(16).padStart(2, '0');
  U8_TO_HEX[n] = hex$1;
  HEX_TO_U8[hex$1] = n;
}

for (var i = 0; i < 256; i++) {
  for (var j$1 = 0; j$1 < 256; j$1++) {
    var _hex = maybeJSBI$u.add(U8_TO_HEX[i], U8_TO_HEX[j$1]);

    var _n = i << 8 | j$1;

    U16_TO_HEX[_n] = _hex;
    HEX_TO_U16[_hex] = _n;
  }
}

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0
var REGEX_HEX_PREFIXED = /^0x[\da-fA-F]+$/;
var REGEX_HEX_NOPREFIX = /^[\da-fA-F]+$/;
/**
 * @name isHex
 * @summary Tests for a hex string.
 * @description
 * Checks to see if the input value is a `0x` prefixed hex string. Optionally (`bitLength` !== -1) checks to see if the bitLength is correct.
 * @example
 * <BR>
 *
 * ```javascript
 * import { isHex } from '@polkadot/util';
 *
 * isHex('0x1234'); // => true
 * isHex('0x1234', 8); // => false
 * ```
 */

function isHex(value) {
  var bitLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;
  var ignoreLength = arguments.length > 2 ? arguments[2] : undefined;
  return typeof value === 'string' && (value === '0x' || REGEX_HEX_PREFIXED.test(value)) && (bitLength === -1 ? ignoreLength || value.length % 2 === 0 : value.length === 2 + Math.ceil(bitLength / 4));
}

/**
 * @name hexStripPrefix
 * @summary Strips any leading `0x` prefix.
 * @description
 * Tests for the existence of a `0x` prefix, and returns the value without the prefix. Un-prefixed values are returned as-is.
 * @example
 * <BR>
 *
 * ```javascript
 * import { hexStripPrefix } from '@polkadot/util';
 *
 * console.log('stripped', hexStripPrefix('0x1234')); // => 1234
 * ```
 */

function hexStripPrefix(value) {
  if (!value || value === '0x') {
    return '';
  } else if (REGEX_HEX_PREFIXED.test(value)) {
    return value.substr(2);
  } else if (REGEX_HEX_NOPREFIX.test(value)) {
    return value;
  }

  throw new Error("Expected hex value to convert, found '".concat(value, "'"));
}

/**
 * @name hexToU8a
 * @summary Creates a Uint8Array object from a hex string.
 * @description
 * `null` inputs returns an empty `Uint8Array` result. Hex input values return the actual bytes value converted to a Uint8Array. Anything that is not a hex string (including the `0x` prefix) throws an error.
 * @example
 * <BR>
 *
 * ```javascript
 * import { hexToU8a } from '@polkadot/util';
 *
 * hexToU8a('0x80001f'); // Uint8Array([0x80, 0x00, 0x1f])
 * hexToU8a('0x80001f', 32); // Uint8Array([0x00, 0x80, 0x00, 0x1f])
 * ```
 */

function hexToU8a(_value) {
  var bitLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;

  if (!_value) {
    return new Uint8Array();
  }

  var value = hexStripPrefix(_value).toLowerCase();
  var valLength = value.length / 2;
  var endLength = Math.ceil(bitLength === -1 ? valLength : bitLength / 8);
  var result = new Uint8Array(endLength);
  var offset = endLength > valLength ? endLength - valLength : 0;
  var dv = new DataView(result.buffer, offset);
  var mod = (endLength - offset) % 2;
  var length = endLength - offset - mod;

  for (var i = 0; i < length; i += 2) {
    dv.setUint16(i, HEX_TO_U16[value.substr(i * 2, 4)]);
  }

  if (mod) {
    dv.setUint8(length, HEX_TO_U8[value.substr(value.length - 2, 2)]);
  }

  return result;
}

/**
 * @name hexToBigInt
 * @summary Creates a BigInt instance object from a hex string.
 */

function hexToBigInt(value) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return !value || value === '0x' ? JSBI.BigInt(0) : u8aToBigInt(hexToU8a(value), objectSpread({
    isLe: false,
    isNegative: false
  }, options));
}

var bn = createModule("/$$rollup_base$$/node_modules/bn.js/lib");

var maybeJSBI$t = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

(function (module) {
  (function (module, exports) {

    function assert(val, msg) {
      if (!val) throw new Error(msg || 'Assertion failed');
    } // Could use `inherits` module, but don't want to move from single file
    // architecture yet.


    function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;

      var TempCtor = function TempCtor() {};

      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    } // BN


    function BN(number, base, endian) {
      if (BN.isBN(number)) {
        return number;
      }

      this.negative = 0;
      this.words = null;
      this.length = 0; // Reduction context

      this.red = null;

      if (number !== null) {
        if (base === 'le' || base === 'be') {
          endian = base;
          base = 10;
        }

        this._init(number || 0, base || 10, endian || 'be');
      }
    }

    if (_typeof(module) === 'object') {
      module.exports = BN;
    } else {
      exports.BN = BN;
    }

    BN.BN = BN;
    BN.wordSize = 26;
    var Buffer;

    try {
      Buffer = require('buffer').Buffer;
    } catch (e) {}

    BN.isBN = function isBN(num) {
      if (num instanceof BN) {
        return true;
      }

      return num !== null && _typeof(num) === 'object' && maybeJSBI$t.equal(num.constructor.wordSize, BN.wordSize) && Array.isArray(num.words);
    };

    BN.max = function max(left, right) {
      if (left.cmp(right) > 0) return left;
      return right;
    };

    BN.min = function min(left, right) {
      if (left.cmp(right) < 0) return left;
      return right;
    };

    BN.prototype._init = function init(number, base, endian) {
      if (typeof number === 'number') {
        return this._initNumber(number, base, endian);
      }

      if (_typeof(number) === 'object') {
        return this._initArray(number, base, endian);
      }

      if (base === 'hex') {
        base = 16;
      }

      assert(base === (base | 0) && base >= 2 && base <= 36);
      number = number.toString().replace(/\s+/g, '');
      var start = 0;

      if (number[0] === '-') {
        start++;
      }

      if (base === 16) {
        this._parseHex(number, start);
      } else {
        this._parseBase(number, base, start);
      }

      if (number[0] === '-') {
        this.negative = 1;
      }

      this.strip();
      if (endian !== 'le') return;

      this._initArray(this.toArray(), base, endian);
    };

    BN.prototype._initNumber = function _initNumber(number, base, endian) {
      if (number < 0) {
        this.negative = 1;
        number = maybeJSBI$t.unaryMinus(number);
      }

      if (number < 0x4000000) {
        this.words = [number & 0x3ffffff];
        this.length = 1;
      } else if (number < 0x10000000000000) {
        this.words = [number & 0x3ffffff, number / 0x4000000 & 0x3ffffff];
        this.length = 2;
      } else {
        assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)

        this.words = [number & 0x3ffffff, number / 0x4000000 & 0x3ffffff, 1];
        this.length = 3;
      }

      if (endian !== 'le') return; // Reverse the bytes

      this._initArray(this.toArray(), base, endian);
    };

    BN.prototype._initArray = function _initArray(number, base, endian) {
      // Perhaps a Uint8Array
      assert(typeof number.length === 'number');

      if (number.length <= 0) {
        this.words = [0];
        this.length = 1;
        return this;
      }

      this.length = Math.ceil(number.length / 3);
      this.words = new Array(this.length);

      for (var i = 0; i < this.length; i++) {
        this.words[i] = 0;
      }

      var j, w;
      var off = 0;

      if (endian === 'be') {
        for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
          w = number[i] | number[i - 1] << 8 | number[i - 2] << 16;
          this.words[j] |= w << off & 0x3ffffff;
          this.words[j + 1] = w >>> 26 - off & 0x3ffffff;
          off += 24;

          if (off >= 26) {

            off -= 26;
            j = maybeJSBI$t.add(j, maybeJSBI$t.BigInt(1));
          }
        }
      } else if (endian === 'le') {
        for (i = 0, j = 0; i < number.length; i += 3) {
          w = number[i] | number[i + 1] << 8 | number[i + 2] << 16;
          this.words[j] |= w << off & 0x3ffffff;
          this.words[j + 1] = w >>> 26 - off & 0x3ffffff;
          off += 24;

          if (off >= 26) {

            off -= 26;
            j = maybeJSBI$t.add(j, maybeJSBI$t.BigInt(1));
          }
        }
      }

      return this.strip();
    };

    function parseHex(str, start, end) {
      var r = 0;
      var len = Math.min(str.length, end);

      for (var i = start; i < len; _x3 = i, i = maybeJSBI$t.add(i, maybeJSBI$t.BigInt(1)), _x3) {
        var _x3;

        var c = str.charCodeAt(i) - 48;
        r <<= 4; // 'a' - 'f'

        if (c >= 49 && c <= 54) {
          r |= c - 49 + 0xa; // 'A' - 'F'
        } else if (c >= 17 && c <= 22) {
          r |= c - 17 + 0xa; // '0' - '9'
        } else {
          r |= c & 0xf;
        }
      }

      return r;
    }

    BN.prototype._parseHex = function _parseHex(number, start) {
      // Create possibly bigger array to ensure that it fits the number
      this.length = Math.ceil(maybeJSBI$t.subtract(number.length, start) / 6);
      this.words = new Array(this.length);

      for (var i = 0; i < this.length; i++) {
        this.words[i] = 0;
      }

      var j, w; // Scan 24-bit chunks and add them to the number

      var off = 0;

      for (i = number.length - 6, j = 0; i >= start; i -= 6) {
        w = parseHex(number, i, i + 6);
        this.words[j] |= w << off & 0x3ffffff; // NOTE: `0x3fffff` is intentional here, 26bits max shift + 24bit hex limb

        this.words[j + 1] |= w >>> 26 - off & 0x3fffff;
        off += 24;

        if (off >= 26) {

          off -= 26;
          j = maybeJSBI$t.add(j, maybeJSBI$t.BigInt(1));
        }
      }

      if (i + 6 !== start) {
        w = parseHex(number, start, i + 6);
        this.words[j] |= w << off & 0x3ffffff;
        this.words[j + 1] |= w >>> 26 - off & 0x3fffff;
      }

      this.strip();
    };

    function parseBase(str, start, end, mul) {
      var r = 0;
      var len = Math.min(str.length, end);

      for (var i = start; i < len; _x5 = i, i = maybeJSBI$t.add(i, maybeJSBI$t.BigInt(1)), _x5) {
        var _x5;

        var c = str.charCodeAt(i) - 48;
        r *= mul; // 'a'

        if (c >= 49) {
          r += c - 49 + 0xa; // 'A'
        } else if (c >= 17) {
          r += c - 17 + 0xa; // '0' - '9'
        } else {
          r += c;
        }
      }

      return r;
    }

    BN.prototype._parseBase = function _parseBase(number, base, start) {
      // Initialize as zero
      this.words = [0];
      this.length = 1; // Find length of limb in base

      for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base) {
        limbLen++;
      }

      limbLen--;
      limbPow = limbPow / base | 0;
      var total = maybeJSBI$t.subtract(number.length, start);
      var mod = total % limbLen;
      var end = Math.min(total, total - mod) + start;
      var word = 0;

      for (var i = start; i < end; i += limbLen) {
        word = parseBase(number, i, i + limbLen, base);
        this.imuln(limbPow);

        if (this.words[0] + word < 0x4000000) {
          this.words[0] += word;
        } else {
          this._iaddn(word);
        }
      }

      if (mod !== 0) {
        var pow = 1;
        word = parseBase(number, i, number.length, base);

        for (i = 0; i < mod; _x6 = i, i = maybeJSBI$t.add(i, maybeJSBI$t.BigInt(1)), _x6) {
          var _x6;

          pow *= base;
        }

        this.imuln(pow);

        if (this.words[0] + word < 0x4000000) {
          this.words[0] += word;
        } else {
          this._iaddn(word);
        }
      }
    };

    BN.prototype.copy = function copy(dest) {
      dest.words = new Array(this.length);

      for (var i = 0; i < this.length; i++) {
        dest.words[i] = this.words[i];
      }

      dest.length = this.length;
      dest.negative = this.negative;
      dest.red = this.red;
    };

    BN.prototype.clone = function clone() {
      var r = new BN(null);
      this.copy(r);
      return r;
    };

    BN.prototype._expand = function _expand(size) {
      while (maybeJSBI$t.lessThan(this.length, size)) {
        var _x7, _y, _z;

        this.words[(_x7 = this, _y = "length", _z = _x7[_y], _x7[_y] = maybeJSBI$t.add(_z, maybeJSBI$t.BigInt(1)), _z)] = 0;
      }

      return this;
    }; // Remove leading `0` from `this`


    BN.prototype.strip = function strip() {
      while (this.length > 1 && this.words[this.length - 1] === 0) {
        var _x8, _y2, _z2;

        _x8 = this, _y2 = "length", _z2 = _x8[_y2], _x8[_y2] = maybeJSBI$t.subtract(_z2, maybeJSBI$t.BigInt(1));
      }

      return this._normSign();
    };

    BN.prototype._normSign = function _normSign() {
      // -0 = 0
      if (this.length === 1 && this.words[0] === 0) {
        this.negative = 0;
      }

      return this;
    };

    BN.prototype.inspect = function inspect() {
      return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
    };
    /*
     var zeros = [];
    var groupSizes = [];
    var groupBases = [];
     var s = '';
    var i = -1;
    while (++i < BN.wordSize) {
      zeros[i] = s;
      s += '0';
    }
    groupSizes[0] = 0;
    groupSizes[1] = 0;
    groupBases[0] = 0;
    groupBases[1] = 0;
    var base = 2 - 1;
    while (++base < 36 + 1) {
      var groupSize = 0;
      var groupBase = 1;
      while (groupBase < (1 << BN.wordSize) / base) {
        groupBase *= base;
        groupSize += 1;
      }
      groupSizes[base] = groupSize;
      groupBases[base] = groupBase;
    }
     */


    var zeros = ['', '0', '00', '000', '0000', '00000', '000000', '0000000', '00000000', '000000000', '0000000000', '00000000000', '000000000000', '0000000000000', '00000000000000', '000000000000000', '0000000000000000', '00000000000000000', '000000000000000000', '0000000000000000000', '00000000000000000000', '000000000000000000000', '0000000000000000000000', '00000000000000000000000', '000000000000000000000000', '0000000000000000000000000'];
    var groupSizes = [0, 0, 25, 16, 12, 11, 10, 9, 8, 8, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
    var groupBases = [0, 0, 33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216, 43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625, 16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632, 6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149, 24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176];

    BN.prototype.toString = function toString(base, padding) {
      base = base || 10;
      padding = padding | 0 || 1;
      var out;

      if (base === 16 || base === 'hex') {
        out = '';
        var off = 0;
        var carry = 0;

        for (var i = 0; i < this.length; i++) {
          var w = this.words[i];
          var word = ((w << off | carry) & 0xffffff).toString(16);
          carry = w >>> 24 - off & 0xffffff;

          if (carry !== 0 || i !== this.length - 1) {
            out = maybeJSBI$t.add(maybeJSBI$t.add(zeros[6 - word.length], word), out);
          } else {
            out = maybeJSBI$t.add(word, out);
          }

          off += 2;

          if (off >= 26) {
            off -= 26;
            i--;
          }
        }

        if (carry !== 0) {
          out = maybeJSBI$t.add(carry.toString(16), out);
        }

        while (maybeJSBI$t.remainder(out.length, padding) !== 0) {
          out = '0' + out;
        }

        if (this.negative !== 0) {
          out = '-' + out;
        }

        return out;
      }

      if (base === (base | 0) && base >= 2 && base <= 36) {
        // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
        var groupSize = groupSizes[base]; // var groupBase = Math.pow(base, groupSize);

        var groupBase = groupBases[base];
        out = '';
        var c = this.clone();
        c.negative = 0;

        while (!c.isZero()) {
          var r = c.modn(groupBase).toString(base);
          c = c.idivn(groupBase);

          if (!c.isZero()) {
            out = maybeJSBI$t.add(maybeJSBI$t.add(zeros[maybeJSBI$t.subtract(groupSize, r.length)], r), out);
          } else {
            out = maybeJSBI$t.add(r, out);
          }
        }

        if (this.isZero()) {
          out = '0' + out;
        }

        while (maybeJSBI$t.remainder(out.length, padding) !== 0) {
          out = '0' + out;
        }

        if (this.negative !== 0) {
          out = '-' + out;
        }

        return out;
      }

      assert(false, 'Base should be between 2 and 36');
    };

    BN.prototype.toNumber = function toNumber() {
      var ret = this.words[0];

      if (this.length === 2) {
        ret += this.words[1] * 0x4000000;
      } else if (this.length === 3 && this.words[2] === 0x01) {
        // NOTE: at this stage it is known that the top bit is set
        ret += 0x10000000000000 + this.words[1] * 0x4000000;
      } else if (this.length > 2) {
        assert(false, 'Number can only safely store up to 53 bits');
      }

      return this.negative !== 0 ? maybeJSBI$t.unaryMinus(ret) : ret;
    };

    BN.prototype.toJSON = function toJSON() {
      return this.toString(16);
    };

    BN.prototype.toBuffer = function toBuffer(endian, length) {
      assert(typeof Buffer !== 'undefined');
      return this.toArrayLike(Buffer, endian, length);
    };

    BN.prototype.toArray = function toArray(endian, length) {
      return this.toArrayLike(Array, endian, length);
    };

    BN.prototype.toArrayLike = function toArrayLike(ArrayType, endian, length) {
      var byteLength = this.byteLength();
      var reqLength = length || Math.max(1, byteLength);
      assert(byteLength <= reqLength, 'byte array longer than desired length');
      assert(reqLength > 0, 'Requested array length <= 0');
      this.strip();
      var littleEndian = endian === 'le';
      var res = new ArrayType(reqLength);
      var b, i;
      var q = this.clone();

      if (!littleEndian) {
        // Assume big-endian
        for (i = 0; i < reqLength - byteLength; _x9 = i, i = maybeJSBI$t.add(i, maybeJSBI$t.BigInt(1)), _x9) {
          var _x9;

          res[i] = 0;
        }

        for (i = 0; !q.isZero(); _x10 = i, i = maybeJSBI$t.add(i, maybeJSBI$t.BigInt(1)), _x10) {
          var _x10;

          b = q.andln(0xff);
          q.iushrn(8);
          res[reqLength - i - 1] = b;
        }
      } else {
        for (i = 0; !q.isZero(); _x11 = i, i = maybeJSBI$t.add(i, maybeJSBI$t.BigInt(1)), _x11) {
          var _x11;

          b = q.andln(0xff);
          q.iushrn(8);
          res[i] = b;
        }

        for (; i < reqLength; _x12 = i, i = maybeJSBI$t.add(i, maybeJSBI$t.BigInt(1)), _x12) {
          var _x12;

          res[i] = 0;
        }
      }

      return res;
    };

    if (Math.clz32) {
      BN.prototype._countBits = function _countBits(w) {
        return 32 - Math.clz32(w);
      };
    } else {
      BN.prototype._countBits = function _countBits(w) {
        var t = w;
        var r = 0;

        if (t >= 0x1000) {
          r += 13;
          t >>>= 13;
        }

        if (t >= 0x40) {
          r += 7;
          t >>>= 7;
        }

        if (t >= 0x8) {
          r += 4;
          t >>>= 4;
        }

        if (t >= 0x02) {
          r += 2;
          t >>>= 2;
        }

        return r + t;
      };
    }

    BN.prototype._zeroBits = function _zeroBits(w) {
      // Short-cut
      if (w === 0) return 26;
      var t = w;
      var r = 0;

      if ((t & 0x1fff) === 0) {
        r += 13;
        t >>>= 13;
      }

      if ((t & 0x7f) === 0) {
        r += 7;
        t >>>= 7;
      }

      if ((t & 0xf) === 0) {
        r += 4;
        t >>>= 4;
      }

      if ((t & 0x3) === 0) {
        r += 2;
        t >>>= 2;
      }

      if ((t & 0x1) === 0) {
        r++;
      }

      return r;
    }; // Return number of used bits in a BN


    BN.prototype.bitLength = function bitLength() {
      var w = this.words[this.length - 1];

      var hi = this._countBits(w);

      return (this.length - 1) * 26 + hi;
    };

    function toBitArray(num) {
      var w = new Array(num.bitLength());

      for (var bit = 0; bit < w.length; bit++) {
        var off = bit / 26 | 0;
        var wbit = bit % 26;
        w[bit] = (num.words[off] & 1 << wbit) >>> wbit;
      }

      return w;
    } // Number of trailing zero bits


    BN.prototype.zeroBits = function zeroBits() {
      if (this.isZero()) return 0;
      var r = 0;

      for (var i = 0; i < this.length; i++) {
        var b = this._zeroBits(this.words[i]);

        r += b;
        if (b !== 26) break;
      }

      return r;
    };

    BN.prototype.byteLength = function byteLength() {
      return Math.ceil(this.bitLength() / 8);
    };

    BN.prototype.toTwos = function toTwos(width) {
      if (this.negative !== 0) {
        return this.abs().inotn(width).iaddn(1);
      }

      return this.clone();
    };

    BN.prototype.fromTwos = function fromTwos(width) {
      if (this.testn(width - 1)) {
        return this.notn(width).iaddn(1).ineg();
      }

      return this.clone();
    };

    BN.prototype.isNeg = function isNeg() {
      return this.negative !== 0;
    }; // Return negative clone of `this`


    BN.prototype.neg = function neg() {
      return this.clone().ineg();
    };

    BN.prototype.ineg = function ineg() {
      if (!this.isZero()) {
        this.negative ^= 1;
      }

      return this;
    }; // Or `num` with `this` in-place


    BN.prototype.iuor = function iuor(num) {
      while (maybeJSBI$t.lessThan(this.length, num.length)) {
        var _x13, _y3, _z3;

        this.words[(_x13 = this, _y3 = "length", _z3 = _x13[_y3], _x13[_y3] = maybeJSBI$t.add(_z3, maybeJSBI$t.BigInt(1)), _z3)] = 0;
      }

      for (var i = 0; i < num.length; i++) {
        this.words[i] = maybeJSBI$t.bitwiseOr(this.words[i], num.words[i]);
      }

      return this.strip();
    };

    BN.prototype.ior = function ior(num) {
      assert(maybeJSBI$t.bitwiseOr(this.negative, num.negative) === 0);
      return this.iuor(num);
    }; // Or `num` with `this`


    BN.prototype.or = function or(num) {
      if (maybeJSBI$t.greaterThan(this.length, num.length)) return this.clone().ior(num);
      return num.clone().ior(this);
    };

    BN.prototype.uor = function uor(num) {
      if (maybeJSBI$t.greaterThan(this.length, num.length)) return this.clone().iuor(num);
      return num.clone().iuor(this);
    }; // And `num` with `this` in-place


    BN.prototype.iuand = function iuand(num) {
      // b = min-length(num, this)
      var b;

      if (maybeJSBI$t.greaterThan(this.length, num.length)) {
        b = num;
      } else {
        b = this;
      }

      for (var i = 0; i < b.length; i++) {
        this.words[i] = maybeJSBI$t.bitwiseAnd(this.words[i], num.words[i]);
      }

      this.length = b.length;
      return this.strip();
    };

    BN.prototype.iand = function iand(num) {
      assert(maybeJSBI$t.bitwiseOr(this.negative, num.negative) === 0);
      return this.iuand(num);
    }; // And `num` with `this`


    BN.prototype.and = function and(num) {
      if (maybeJSBI$t.greaterThan(this.length, num.length)) return this.clone().iand(num);
      return num.clone().iand(this);
    };

    BN.prototype.uand = function uand(num) {
      if (maybeJSBI$t.greaterThan(this.length, num.length)) return this.clone().iuand(num);
      return num.clone().iuand(this);
    }; // Xor `num` with `this` in-place


    BN.prototype.iuxor = function iuxor(num) {
      // a.length > b.length
      var a;
      var b;

      if (maybeJSBI$t.greaterThan(this.length, num.length)) {
        a = this;
        b = num;
      } else {
        a = num;
        b = this;
      }

      for (var i = 0; i < b.length; i++) {
        this.words[i] = maybeJSBI$t.bitwiseXor(a.words[i], b.words[i]);
      }

      if (maybeJSBI$t.notEqual(this, a)) {
        for (; i < a.length; i++) {
          this.words[i] = a.words[i];
        }
      }

      this.length = a.length;
      return this.strip();
    };

    BN.prototype.ixor = function ixor(num) {
      assert(maybeJSBI$t.bitwiseOr(this.negative, num.negative) === 0);
      return this.iuxor(num);
    }; // Xor `num` with `this`


    BN.prototype.xor = function xor(num) {
      if (maybeJSBI$t.greaterThan(this.length, num.length)) return this.clone().ixor(num);
      return num.clone().ixor(this);
    };

    BN.prototype.uxor = function uxor(num) {
      if (maybeJSBI$t.greaterThan(this.length, num.length)) return this.clone().iuxor(num);
      return num.clone().iuxor(this);
    }; // Not ``this`` with ``width`` bitwidth


    BN.prototype.inotn = function inotn(width) {
      assert(typeof width === 'number' && width >= 0);
      var bytesNeeded = Math.ceil(width / 26) | 0;
      var bitsLeft = width % 26; // Extend the buffer with leading zeroes

      this._expand(bytesNeeded);

      if (bitsLeft > 0) {
        bytesNeeded--;
      } // Handle complete words


      for (var i = 0; i < bytesNeeded; i++) {
        this.words[i] = maybeJSBI$t.bitwiseNot(this.words[i]) & 0x3ffffff;
      } // Handle the residue


      if (bitsLeft > 0) {
        this.words[i] = maybeJSBI$t.bitwiseNot(this.words[i]) & 0x3ffffff >> 26 - bitsLeft;
      } // And remove leading zeroes


      return this.strip();
    };

    BN.prototype.notn = function notn(width) {
      return this.clone().inotn(width);
    }; // Set `bit` of `this`


    BN.prototype.setn = function setn(bit, val) {
      assert(typeof bit === 'number' && bit >= 0);
      var off = bit / 26 | 0;
      var wbit = bit % 26;

      this._expand(off + 1);

      if (val) {
        this.words[off] = this.words[off] | 1 << wbit;
      } else {
        this.words[off] = this.words[off] & ~(1 << wbit);
      }

      return this.strip();
    }; // Add `num` to `this` in-place


    BN.prototype.iadd = function iadd(num) {
      var r; // negative + positive

      if (this.negative !== 0 && num.negative === 0) {
        this.negative = 0;
        r = this.isub(num);
        this.negative ^= 1;
        return this._normSign(); // positive + negative
      } else if (this.negative === 0 && num.negative !== 0) {
        num.negative = 0;
        r = this.isub(num);
        num.negative = 1;
        return r._normSign();
      } // a.length > b.length


      var a, b;

      if (maybeJSBI$t.greaterThan(this.length, num.length)) {
        a = this;
        b = num;
      } else {
        a = num;
        b = this;
      }

      var carry = 0;

      for (var i = 0; i < b.length; i++) {
        r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
        this.words[i] = r & 0x3ffffff;
        carry = r >>> 26;
      }

      for (; carry !== 0 && i < a.length; i++) {
        r = (a.words[i] | 0) + carry;
        this.words[i] = r & 0x3ffffff;
        carry = r >>> 26;
      }

      this.length = a.length;

      if (carry !== 0) {
        var _x14, _y4, _z4;

        this.words[this.length] = carry;
        _x14 = this, _y4 = "length", _z4 = _x14[_y4], _x14[_y4] = maybeJSBI$t.add(_z4, maybeJSBI$t.BigInt(1)); // Copy the rest of the words
      } else if (maybeJSBI$t.notEqual(a, this)) {
        for (; i < a.length; i++) {
          this.words[i] = a.words[i];
        }
      }

      return this;
    }; // Add `num` to `this`


    BN.prototype.add = function add(num) {
      var res;

      if (num.negative !== 0 && this.negative === 0) {
        num.negative = 0;
        res = this.sub(num);
        num.negative ^= 1;
        return res;
      } else if (num.negative === 0 && this.negative !== 0) {
        this.negative = 0;
        res = num.sub(this);
        this.negative = 1;
        return res;
      }

      if (maybeJSBI$t.greaterThan(this.length, num.length)) return this.clone().iadd(num);
      return num.clone().iadd(this);
    }; // Subtract `num` from `this` in-place


    BN.prototype.isub = function isub(num) {
      // this - (-num) = this + num
      if (num.negative !== 0) {
        num.negative = 0;
        var r = this.iadd(num);
        num.negative = 1;
        return r._normSign(); // -this - num = -(this + num)
      } else if (this.negative !== 0) {
        this.negative = 0;
        this.iadd(num);
        this.negative = 1;
        return this._normSign();
      } // At this point both numbers are positive


      var cmp = this.cmp(num); // Optimization - zeroify

      if (cmp === 0) {
        this.negative = 0;
        this.length = 1;
        this.words[0] = 0;
        return this;
      } // a > b


      var a, b;

      if (cmp > 0) {
        a = this;
        b = num;
      } else {
        a = num;
        b = this;
      }

      var carry = 0;

      for (var i = 0; i < b.length; i++) {
        r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
        carry = r >> 26;
        this.words[i] = r & 0x3ffffff;
      }

      for (; carry !== 0 && i < a.length; i++) {
        r = (a.words[i] | 0) + carry;
        carry = r >> 26;
        this.words[i] = r & 0x3ffffff;
      } // Copy rest of the words


      if (carry === 0 && i < a.length && maybeJSBI$t.notEqual(a, this)) {
        for (; i < a.length; i++) {
          this.words[i] = a.words[i];
        }
      }

      this.length = Math.max(this.length, i);

      if (maybeJSBI$t.notEqual(a, this)) {
        this.negative = 1;
      }

      return this.strip();
    }; // Subtract `num` from `this`


    BN.prototype.sub = function sub(num) {
      return this.clone().isub(num);
    };

    function smallMulTo(self, num, out) {
      out.negative = maybeJSBI$t.bitwiseXor(num.negative, self.negative);
      var len = maybeJSBI$t.add(self.length, num.length) | 0;
      out.length = len;
      len = len - 1 | 0; // Peel one iteration (compiler can't do it, because of code complexity)

      var a = self.words[0] | 0;
      var b = num.words[0] | 0;
      var r = a * b;
      var lo = r & 0x3ffffff;
      var carry = r / 0x4000000 | 0;
      out.words[0] = lo;

      for (var k = 1; k < len; k++) {
        // Sum all words with the same `i + j = k` and accumulate `ncarry`,
        // note that ncarry could be >= 0x3ffffff
        var ncarry = carry >>> 26;
        var rword = carry & 0x3ffffff;
        var maxJ = Math.min(k, num.length - 1);

        for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
          var i = k - j | 0;
          a = self.words[i] | 0;
          b = num.words[j] | 0;
          r = a * b + rword;
          ncarry += r / 0x4000000 | 0;
          rword = r & 0x3ffffff;
        }

        out.words[k] = rword | 0;
        carry = ncarry | 0;
      }

      if (carry !== 0) {
        out.words[k] = carry | 0;
      } else {
        var _x15, _y5, _z5;

        _x15 = out, _y5 = "length", _z5 = _x15[_y5], _x15[_y5] = maybeJSBI$t.subtract(_z5, maybeJSBI$t.BigInt(1));
      }

      return out.strip();
    } // TODO(indutny): it may be reasonable to omit it for users who don't need
    // to work with 256-bit numbers, otherwise it gives 20% improvement for 256-bit
    // multiplication (like elliptic secp256k1).


    var comb10MulTo = function comb10MulTo(self, num, out) {
      var a = self.words;
      var b = num.words;
      var o = out.words;
      var c = 0;
      var lo;
      var mid;
      var hi;
      var a0 = a[0] | 0;
      var al0 = a0 & 0x1fff;
      var ah0 = a0 >>> 13;
      var a1 = a[1] | 0;
      var al1 = a1 & 0x1fff;
      var ah1 = a1 >>> 13;
      var a2 = a[2] | 0;
      var al2 = a2 & 0x1fff;
      var ah2 = a2 >>> 13;
      var a3 = a[3] | 0;
      var al3 = a3 & 0x1fff;
      var ah3 = a3 >>> 13;
      var a4 = a[4] | 0;
      var al4 = a4 & 0x1fff;
      var ah4 = a4 >>> 13;
      var a5 = a[5] | 0;
      var al5 = a5 & 0x1fff;
      var ah5 = a5 >>> 13;
      var a6 = a[6] | 0;
      var al6 = a6 & 0x1fff;
      var ah6 = a6 >>> 13;
      var a7 = a[7] | 0;
      var al7 = a7 & 0x1fff;
      var ah7 = a7 >>> 13;
      var a8 = a[8] | 0;
      var al8 = a8 & 0x1fff;
      var ah8 = a8 >>> 13;
      var a9 = a[9] | 0;
      var al9 = a9 & 0x1fff;
      var ah9 = a9 >>> 13;
      var b0 = b[0] | 0;
      var bl0 = b0 & 0x1fff;
      var bh0 = b0 >>> 13;
      var b1 = b[1] | 0;
      var bl1 = b1 & 0x1fff;
      var bh1 = b1 >>> 13;
      var b2 = b[2] | 0;
      var bl2 = b2 & 0x1fff;
      var bh2 = b2 >>> 13;
      var b3 = b[3] | 0;
      var bl3 = b3 & 0x1fff;
      var bh3 = b3 >>> 13;
      var b4 = b[4] | 0;
      var bl4 = b4 & 0x1fff;
      var bh4 = b4 >>> 13;
      var b5 = b[5] | 0;
      var bl5 = b5 & 0x1fff;
      var bh5 = b5 >>> 13;
      var b6 = b[6] | 0;
      var bl6 = b6 & 0x1fff;
      var bh6 = b6 >>> 13;
      var b7 = b[7] | 0;
      var bl7 = b7 & 0x1fff;
      var bh7 = b7 >>> 13;
      var b8 = b[8] | 0;
      var bl8 = b8 & 0x1fff;
      var bh8 = b8 >>> 13;
      var b9 = b[9] | 0;
      var bl9 = b9 & 0x1fff;
      var bh9 = b9 >>> 13;
      out.negative = maybeJSBI$t.bitwiseXor(self.negative, num.negative);
      out.length = 19;
      /* k = 0 */

      lo = Math.imul(al0, bl0);
      mid = Math.imul(al0, bh0);
      mid = mid + Math.imul(ah0, bl0) | 0;
      hi = Math.imul(ah0, bh0);
      var w0 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w0 >>> 26) | 0;
      w0 &= 0x3ffffff;
      /* k = 1 */

      lo = Math.imul(al1, bl0);
      mid = Math.imul(al1, bh0);
      mid = mid + Math.imul(ah1, bl0) | 0;
      hi = Math.imul(ah1, bh0);
      lo = lo + Math.imul(al0, bl1) | 0;
      mid = mid + Math.imul(al0, bh1) | 0;
      mid = mid + Math.imul(ah0, bl1) | 0;
      hi = hi + Math.imul(ah0, bh1) | 0;
      var w1 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w1 >>> 26) | 0;
      w1 &= 0x3ffffff;
      /* k = 2 */

      lo = Math.imul(al2, bl0);
      mid = Math.imul(al2, bh0);
      mid = mid + Math.imul(ah2, bl0) | 0;
      hi = Math.imul(ah2, bh0);
      lo = lo + Math.imul(al1, bl1) | 0;
      mid = mid + Math.imul(al1, bh1) | 0;
      mid = mid + Math.imul(ah1, bl1) | 0;
      hi = hi + Math.imul(ah1, bh1) | 0;
      lo = lo + Math.imul(al0, bl2) | 0;
      mid = mid + Math.imul(al0, bh2) | 0;
      mid = mid + Math.imul(ah0, bl2) | 0;
      hi = hi + Math.imul(ah0, bh2) | 0;
      var w2 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w2 >>> 26) | 0;
      w2 &= 0x3ffffff;
      /* k = 3 */

      lo = Math.imul(al3, bl0);
      mid = Math.imul(al3, bh0);
      mid = mid + Math.imul(ah3, bl0) | 0;
      hi = Math.imul(ah3, bh0);
      lo = lo + Math.imul(al2, bl1) | 0;
      mid = mid + Math.imul(al2, bh1) | 0;
      mid = mid + Math.imul(ah2, bl1) | 0;
      hi = hi + Math.imul(ah2, bh1) | 0;
      lo = lo + Math.imul(al1, bl2) | 0;
      mid = mid + Math.imul(al1, bh2) | 0;
      mid = mid + Math.imul(ah1, bl2) | 0;
      hi = hi + Math.imul(ah1, bh2) | 0;
      lo = lo + Math.imul(al0, bl3) | 0;
      mid = mid + Math.imul(al0, bh3) | 0;
      mid = mid + Math.imul(ah0, bl3) | 0;
      hi = hi + Math.imul(ah0, bh3) | 0;
      var w3 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w3 >>> 26) | 0;
      w3 &= 0x3ffffff;
      /* k = 4 */

      lo = Math.imul(al4, bl0);
      mid = Math.imul(al4, bh0);
      mid = mid + Math.imul(ah4, bl0) | 0;
      hi = Math.imul(ah4, bh0);
      lo = lo + Math.imul(al3, bl1) | 0;
      mid = mid + Math.imul(al3, bh1) | 0;
      mid = mid + Math.imul(ah3, bl1) | 0;
      hi = hi + Math.imul(ah3, bh1) | 0;
      lo = lo + Math.imul(al2, bl2) | 0;
      mid = mid + Math.imul(al2, bh2) | 0;
      mid = mid + Math.imul(ah2, bl2) | 0;
      hi = hi + Math.imul(ah2, bh2) | 0;
      lo = lo + Math.imul(al1, bl3) | 0;
      mid = mid + Math.imul(al1, bh3) | 0;
      mid = mid + Math.imul(ah1, bl3) | 0;
      hi = hi + Math.imul(ah1, bh3) | 0;
      lo = lo + Math.imul(al0, bl4) | 0;
      mid = mid + Math.imul(al0, bh4) | 0;
      mid = mid + Math.imul(ah0, bl4) | 0;
      hi = hi + Math.imul(ah0, bh4) | 0;
      var w4 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w4 >>> 26) | 0;
      w4 &= 0x3ffffff;
      /* k = 5 */

      lo = Math.imul(al5, bl0);
      mid = Math.imul(al5, bh0);
      mid = mid + Math.imul(ah5, bl0) | 0;
      hi = Math.imul(ah5, bh0);
      lo = lo + Math.imul(al4, bl1) | 0;
      mid = mid + Math.imul(al4, bh1) | 0;
      mid = mid + Math.imul(ah4, bl1) | 0;
      hi = hi + Math.imul(ah4, bh1) | 0;
      lo = lo + Math.imul(al3, bl2) | 0;
      mid = mid + Math.imul(al3, bh2) | 0;
      mid = mid + Math.imul(ah3, bl2) | 0;
      hi = hi + Math.imul(ah3, bh2) | 0;
      lo = lo + Math.imul(al2, bl3) | 0;
      mid = mid + Math.imul(al2, bh3) | 0;
      mid = mid + Math.imul(ah2, bl3) | 0;
      hi = hi + Math.imul(ah2, bh3) | 0;
      lo = lo + Math.imul(al1, bl4) | 0;
      mid = mid + Math.imul(al1, bh4) | 0;
      mid = mid + Math.imul(ah1, bl4) | 0;
      hi = hi + Math.imul(ah1, bh4) | 0;
      lo = lo + Math.imul(al0, bl5) | 0;
      mid = mid + Math.imul(al0, bh5) | 0;
      mid = mid + Math.imul(ah0, bl5) | 0;
      hi = hi + Math.imul(ah0, bh5) | 0;
      var w5 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w5 >>> 26) | 0;
      w5 &= 0x3ffffff;
      /* k = 6 */

      lo = Math.imul(al6, bl0);
      mid = Math.imul(al6, bh0);
      mid = mid + Math.imul(ah6, bl0) | 0;
      hi = Math.imul(ah6, bh0);
      lo = lo + Math.imul(al5, bl1) | 0;
      mid = mid + Math.imul(al5, bh1) | 0;
      mid = mid + Math.imul(ah5, bl1) | 0;
      hi = hi + Math.imul(ah5, bh1) | 0;
      lo = lo + Math.imul(al4, bl2) | 0;
      mid = mid + Math.imul(al4, bh2) | 0;
      mid = mid + Math.imul(ah4, bl2) | 0;
      hi = hi + Math.imul(ah4, bh2) | 0;
      lo = lo + Math.imul(al3, bl3) | 0;
      mid = mid + Math.imul(al3, bh3) | 0;
      mid = mid + Math.imul(ah3, bl3) | 0;
      hi = hi + Math.imul(ah3, bh3) | 0;
      lo = lo + Math.imul(al2, bl4) | 0;
      mid = mid + Math.imul(al2, bh4) | 0;
      mid = mid + Math.imul(ah2, bl4) | 0;
      hi = hi + Math.imul(ah2, bh4) | 0;
      lo = lo + Math.imul(al1, bl5) | 0;
      mid = mid + Math.imul(al1, bh5) | 0;
      mid = mid + Math.imul(ah1, bl5) | 0;
      hi = hi + Math.imul(ah1, bh5) | 0;
      lo = lo + Math.imul(al0, bl6) | 0;
      mid = mid + Math.imul(al0, bh6) | 0;
      mid = mid + Math.imul(ah0, bl6) | 0;
      hi = hi + Math.imul(ah0, bh6) | 0;
      var w6 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w6 >>> 26) | 0;
      w6 &= 0x3ffffff;
      /* k = 7 */

      lo = Math.imul(al7, bl0);
      mid = Math.imul(al7, bh0);
      mid = mid + Math.imul(ah7, bl0) | 0;
      hi = Math.imul(ah7, bh0);
      lo = lo + Math.imul(al6, bl1) | 0;
      mid = mid + Math.imul(al6, bh1) | 0;
      mid = mid + Math.imul(ah6, bl1) | 0;
      hi = hi + Math.imul(ah6, bh1) | 0;
      lo = lo + Math.imul(al5, bl2) | 0;
      mid = mid + Math.imul(al5, bh2) | 0;
      mid = mid + Math.imul(ah5, bl2) | 0;
      hi = hi + Math.imul(ah5, bh2) | 0;
      lo = lo + Math.imul(al4, bl3) | 0;
      mid = mid + Math.imul(al4, bh3) | 0;
      mid = mid + Math.imul(ah4, bl3) | 0;
      hi = hi + Math.imul(ah4, bh3) | 0;
      lo = lo + Math.imul(al3, bl4) | 0;
      mid = mid + Math.imul(al3, bh4) | 0;
      mid = mid + Math.imul(ah3, bl4) | 0;
      hi = hi + Math.imul(ah3, bh4) | 0;
      lo = lo + Math.imul(al2, bl5) | 0;
      mid = mid + Math.imul(al2, bh5) | 0;
      mid = mid + Math.imul(ah2, bl5) | 0;
      hi = hi + Math.imul(ah2, bh5) | 0;
      lo = lo + Math.imul(al1, bl6) | 0;
      mid = mid + Math.imul(al1, bh6) | 0;
      mid = mid + Math.imul(ah1, bl6) | 0;
      hi = hi + Math.imul(ah1, bh6) | 0;
      lo = lo + Math.imul(al0, bl7) | 0;
      mid = mid + Math.imul(al0, bh7) | 0;
      mid = mid + Math.imul(ah0, bl7) | 0;
      hi = hi + Math.imul(ah0, bh7) | 0;
      var w7 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w7 >>> 26) | 0;
      w7 &= 0x3ffffff;
      /* k = 8 */

      lo = Math.imul(al8, bl0);
      mid = Math.imul(al8, bh0);
      mid = mid + Math.imul(ah8, bl0) | 0;
      hi = Math.imul(ah8, bh0);
      lo = lo + Math.imul(al7, bl1) | 0;
      mid = mid + Math.imul(al7, bh1) | 0;
      mid = mid + Math.imul(ah7, bl1) | 0;
      hi = hi + Math.imul(ah7, bh1) | 0;
      lo = lo + Math.imul(al6, bl2) | 0;
      mid = mid + Math.imul(al6, bh2) | 0;
      mid = mid + Math.imul(ah6, bl2) | 0;
      hi = hi + Math.imul(ah6, bh2) | 0;
      lo = lo + Math.imul(al5, bl3) | 0;
      mid = mid + Math.imul(al5, bh3) | 0;
      mid = mid + Math.imul(ah5, bl3) | 0;
      hi = hi + Math.imul(ah5, bh3) | 0;
      lo = lo + Math.imul(al4, bl4) | 0;
      mid = mid + Math.imul(al4, bh4) | 0;
      mid = mid + Math.imul(ah4, bl4) | 0;
      hi = hi + Math.imul(ah4, bh4) | 0;
      lo = lo + Math.imul(al3, bl5) | 0;
      mid = mid + Math.imul(al3, bh5) | 0;
      mid = mid + Math.imul(ah3, bl5) | 0;
      hi = hi + Math.imul(ah3, bh5) | 0;
      lo = lo + Math.imul(al2, bl6) | 0;
      mid = mid + Math.imul(al2, bh6) | 0;
      mid = mid + Math.imul(ah2, bl6) | 0;
      hi = hi + Math.imul(ah2, bh6) | 0;
      lo = lo + Math.imul(al1, bl7) | 0;
      mid = mid + Math.imul(al1, bh7) | 0;
      mid = mid + Math.imul(ah1, bl7) | 0;
      hi = hi + Math.imul(ah1, bh7) | 0;
      lo = lo + Math.imul(al0, bl8) | 0;
      mid = mid + Math.imul(al0, bh8) | 0;
      mid = mid + Math.imul(ah0, bl8) | 0;
      hi = hi + Math.imul(ah0, bh8) | 0;
      var w8 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w8 >>> 26) | 0;
      w8 &= 0x3ffffff;
      /* k = 9 */

      lo = Math.imul(al9, bl0);
      mid = Math.imul(al9, bh0);
      mid = mid + Math.imul(ah9, bl0) | 0;
      hi = Math.imul(ah9, bh0);
      lo = lo + Math.imul(al8, bl1) | 0;
      mid = mid + Math.imul(al8, bh1) | 0;
      mid = mid + Math.imul(ah8, bl1) | 0;
      hi = hi + Math.imul(ah8, bh1) | 0;
      lo = lo + Math.imul(al7, bl2) | 0;
      mid = mid + Math.imul(al7, bh2) | 0;
      mid = mid + Math.imul(ah7, bl2) | 0;
      hi = hi + Math.imul(ah7, bh2) | 0;
      lo = lo + Math.imul(al6, bl3) | 0;
      mid = mid + Math.imul(al6, bh3) | 0;
      mid = mid + Math.imul(ah6, bl3) | 0;
      hi = hi + Math.imul(ah6, bh3) | 0;
      lo = lo + Math.imul(al5, bl4) | 0;
      mid = mid + Math.imul(al5, bh4) | 0;
      mid = mid + Math.imul(ah5, bl4) | 0;
      hi = hi + Math.imul(ah5, bh4) | 0;
      lo = lo + Math.imul(al4, bl5) | 0;
      mid = mid + Math.imul(al4, bh5) | 0;
      mid = mid + Math.imul(ah4, bl5) | 0;
      hi = hi + Math.imul(ah4, bh5) | 0;
      lo = lo + Math.imul(al3, bl6) | 0;
      mid = mid + Math.imul(al3, bh6) | 0;
      mid = mid + Math.imul(ah3, bl6) | 0;
      hi = hi + Math.imul(ah3, bh6) | 0;
      lo = lo + Math.imul(al2, bl7) | 0;
      mid = mid + Math.imul(al2, bh7) | 0;
      mid = mid + Math.imul(ah2, bl7) | 0;
      hi = hi + Math.imul(ah2, bh7) | 0;
      lo = lo + Math.imul(al1, bl8) | 0;
      mid = mid + Math.imul(al1, bh8) | 0;
      mid = mid + Math.imul(ah1, bl8) | 0;
      hi = hi + Math.imul(ah1, bh8) | 0;
      lo = lo + Math.imul(al0, bl9) | 0;
      mid = mid + Math.imul(al0, bh9) | 0;
      mid = mid + Math.imul(ah0, bl9) | 0;
      hi = hi + Math.imul(ah0, bh9) | 0;
      var w9 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w9 >>> 26) | 0;
      w9 &= 0x3ffffff;
      /* k = 10 */

      lo = Math.imul(al9, bl1);
      mid = Math.imul(al9, bh1);
      mid = mid + Math.imul(ah9, bl1) | 0;
      hi = Math.imul(ah9, bh1);
      lo = lo + Math.imul(al8, bl2) | 0;
      mid = mid + Math.imul(al8, bh2) | 0;
      mid = mid + Math.imul(ah8, bl2) | 0;
      hi = hi + Math.imul(ah8, bh2) | 0;
      lo = lo + Math.imul(al7, bl3) | 0;
      mid = mid + Math.imul(al7, bh3) | 0;
      mid = mid + Math.imul(ah7, bl3) | 0;
      hi = hi + Math.imul(ah7, bh3) | 0;
      lo = lo + Math.imul(al6, bl4) | 0;
      mid = mid + Math.imul(al6, bh4) | 0;
      mid = mid + Math.imul(ah6, bl4) | 0;
      hi = hi + Math.imul(ah6, bh4) | 0;
      lo = lo + Math.imul(al5, bl5) | 0;
      mid = mid + Math.imul(al5, bh5) | 0;
      mid = mid + Math.imul(ah5, bl5) | 0;
      hi = hi + Math.imul(ah5, bh5) | 0;
      lo = lo + Math.imul(al4, bl6) | 0;
      mid = mid + Math.imul(al4, bh6) | 0;
      mid = mid + Math.imul(ah4, bl6) | 0;
      hi = hi + Math.imul(ah4, bh6) | 0;
      lo = lo + Math.imul(al3, bl7) | 0;
      mid = mid + Math.imul(al3, bh7) | 0;
      mid = mid + Math.imul(ah3, bl7) | 0;
      hi = hi + Math.imul(ah3, bh7) | 0;
      lo = lo + Math.imul(al2, bl8) | 0;
      mid = mid + Math.imul(al2, bh8) | 0;
      mid = mid + Math.imul(ah2, bl8) | 0;
      hi = hi + Math.imul(ah2, bh8) | 0;
      lo = lo + Math.imul(al1, bl9) | 0;
      mid = mid + Math.imul(al1, bh9) | 0;
      mid = mid + Math.imul(ah1, bl9) | 0;
      hi = hi + Math.imul(ah1, bh9) | 0;
      var w10 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w10 >>> 26) | 0;
      w10 &= 0x3ffffff;
      /* k = 11 */

      lo = Math.imul(al9, bl2);
      mid = Math.imul(al9, bh2);
      mid = mid + Math.imul(ah9, bl2) | 0;
      hi = Math.imul(ah9, bh2);
      lo = lo + Math.imul(al8, bl3) | 0;
      mid = mid + Math.imul(al8, bh3) | 0;
      mid = mid + Math.imul(ah8, bl3) | 0;
      hi = hi + Math.imul(ah8, bh3) | 0;
      lo = lo + Math.imul(al7, bl4) | 0;
      mid = mid + Math.imul(al7, bh4) | 0;
      mid = mid + Math.imul(ah7, bl4) | 0;
      hi = hi + Math.imul(ah7, bh4) | 0;
      lo = lo + Math.imul(al6, bl5) | 0;
      mid = mid + Math.imul(al6, bh5) | 0;
      mid = mid + Math.imul(ah6, bl5) | 0;
      hi = hi + Math.imul(ah6, bh5) | 0;
      lo = lo + Math.imul(al5, bl6) | 0;
      mid = mid + Math.imul(al5, bh6) | 0;
      mid = mid + Math.imul(ah5, bl6) | 0;
      hi = hi + Math.imul(ah5, bh6) | 0;
      lo = lo + Math.imul(al4, bl7) | 0;
      mid = mid + Math.imul(al4, bh7) | 0;
      mid = mid + Math.imul(ah4, bl7) | 0;
      hi = hi + Math.imul(ah4, bh7) | 0;
      lo = lo + Math.imul(al3, bl8) | 0;
      mid = mid + Math.imul(al3, bh8) | 0;
      mid = mid + Math.imul(ah3, bl8) | 0;
      hi = hi + Math.imul(ah3, bh8) | 0;
      lo = lo + Math.imul(al2, bl9) | 0;
      mid = mid + Math.imul(al2, bh9) | 0;
      mid = mid + Math.imul(ah2, bl9) | 0;
      hi = hi + Math.imul(ah2, bh9) | 0;
      var w11 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w11 >>> 26) | 0;
      w11 &= 0x3ffffff;
      /* k = 12 */

      lo = Math.imul(al9, bl3);
      mid = Math.imul(al9, bh3);
      mid = mid + Math.imul(ah9, bl3) | 0;
      hi = Math.imul(ah9, bh3);
      lo = lo + Math.imul(al8, bl4) | 0;
      mid = mid + Math.imul(al8, bh4) | 0;
      mid = mid + Math.imul(ah8, bl4) | 0;
      hi = hi + Math.imul(ah8, bh4) | 0;
      lo = lo + Math.imul(al7, bl5) | 0;
      mid = mid + Math.imul(al7, bh5) | 0;
      mid = mid + Math.imul(ah7, bl5) | 0;
      hi = hi + Math.imul(ah7, bh5) | 0;
      lo = lo + Math.imul(al6, bl6) | 0;
      mid = mid + Math.imul(al6, bh6) | 0;
      mid = mid + Math.imul(ah6, bl6) | 0;
      hi = hi + Math.imul(ah6, bh6) | 0;
      lo = lo + Math.imul(al5, bl7) | 0;
      mid = mid + Math.imul(al5, bh7) | 0;
      mid = mid + Math.imul(ah5, bl7) | 0;
      hi = hi + Math.imul(ah5, bh7) | 0;
      lo = lo + Math.imul(al4, bl8) | 0;
      mid = mid + Math.imul(al4, bh8) | 0;
      mid = mid + Math.imul(ah4, bl8) | 0;
      hi = hi + Math.imul(ah4, bh8) | 0;
      lo = lo + Math.imul(al3, bl9) | 0;
      mid = mid + Math.imul(al3, bh9) | 0;
      mid = mid + Math.imul(ah3, bl9) | 0;
      hi = hi + Math.imul(ah3, bh9) | 0;
      var w12 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w12 >>> 26) | 0;
      w12 &= 0x3ffffff;
      /* k = 13 */

      lo = Math.imul(al9, bl4);
      mid = Math.imul(al9, bh4);
      mid = mid + Math.imul(ah9, bl4) | 0;
      hi = Math.imul(ah9, bh4);
      lo = lo + Math.imul(al8, bl5) | 0;
      mid = mid + Math.imul(al8, bh5) | 0;
      mid = mid + Math.imul(ah8, bl5) | 0;
      hi = hi + Math.imul(ah8, bh5) | 0;
      lo = lo + Math.imul(al7, bl6) | 0;
      mid = mid + Math.imul(al7, bh6) | 0;
      mid = mid + Math.imul(ah7, bl6) | 0;
      hi = hi + Math.imul(ah7, bh6) | 0;
      lo = lo + Math.imul(al6, bl7) | 0;
      mid = mid + Math.imul(al6, bh7) | 0;
      mid = mid + Math.imul(ah6, bl7) | 0;
      hi = hi + Math.imul(ah6, bh7) | 0;
      lo = lo + Math.imul(al5, bl8) | 0;
      mid = mid + Math.imul(al5, bh8) | 0;
      mid = mid + Math.imul(ah5, bl8) | 0;
      hi = hi + Math.imul(ah5, bh8) | 0;
      lo = lo + Math.imul(al4, bl9) | 0;
      mid = mid + Math.imul(al4, bh9) | 0;
      mid = mid + Math.imul(ah4, bl9) | 0;
      hi = hi + Math.imul(ah4, bh9) | 0;
      var w13 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w13 >>> 26) | 0;
      w13 &= 0x3ffffff;
      /* k = 14 */

      lo = Math.imul(al9, bl5);
      mid = Math.imul(al9, bh5);
      mid = mid + Math.imul(ah9, bl5) | 0;
      hi = Math.imul(ah9, bh5);
      lo = lo + Math.imul(al8, bl6) | 0;
      mid = mid + Math.imul(al8, bh6) | 0;
      mid = mid + Math.imul(ah8, bl6) | 0;
      hi = hi + Math.imul(ah8, bh6) | 0;
      lo = lo + Math.imul(al7, bl7) | 0;
      mid = mid + Math.imul(al7, bh7) | 0;
      mid = mid + Math.imul(ah7, bl7) | 0;
      hi = hi + Math.imul(ah7, bh7) | 0;
      lo = lo + Math.imul(al6, bl8) | 0;
      mid = mid + Math.imul(al6, bh8) | 0;
      mid = mid + Math.imul(ah6, bl8) | 0;
      hi = hi + Math.imul(ah6, bh8) | 0;
      lo = lo + Math.imul(al5, bl9) | 0;
      mid = mid + Math.imul(al5, bh9) | 0;
      mid = mid + Math.imul(ah5, bl9) | 0;
      hi = hi + Math.imul(ah5, bh9) | 0;
      var w14 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w14 >>> 26) | 0;
      w14 &= 0x3ffffff;
      /* k = 15 */

      lo = Math.imul(al9, bl6);
      mid = Math.imul(al9, bh6);
      mid = mid + Math.imul(ah9, bl6) | 0;
      hi = Math.imul(ah9, bh6);
      lo = lo + Math.imul(al8, bl7) | 0;
      mid = mid + Math.imul(al8, bh7) | 0;
      mid = mid + Math.imul(ah8, bl7) | 0;
      hi = hi + Math.imul(ah8, bh7) | 0;
      lo = lo + Math.imul(al7, bl8) | 0;
      mid = mid + Math.imul(al7, bh8) | 0;
      mid = mid + Math.imul(ah7, bl8) | 0;
      hi = hi + Math.imul(ah7, bh8) | 0;
      lo = lo + Math.imul(al6, bl9) | 0;
      mid = mid + Math.imul(al6, bh9) | 0;
      mid = mid + Math.imul(ah6, bl9) | 0;
      hi = hi + Math.imul(ah6, bh9) | 0;
      var w15 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w15 >>> 26) | 0;
      w15 &= 0x3ffffff;
      /* k = 16 */

      lo = Math.imul(al9, bl7);
      mid = Math.imul(al9, bh7);
      mid = mid + Math.imul(ah9, bl7) | 0;
      hi = Math.imul(ah9, bh7);
      lo = lo + Math.imul(al8, bl8) | 0;
      mid = mid + Math.imul(al8, bh8) | 0;
      mid = mid + Math.imul(ah8, bl8) | 0;
      hi = hi + Math.imul(ah8, bh8) | 0;
      lo = lo + Math.imul(al7, bl9) | 0;
      mid = mid + Math.imul(al7, bh9) | 0;
      mid = mid + Math.imul(ah7, bl9) | 0;
      hi = hi + Math.imul(ah7, bh9) | 0;
      var w16 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w16 >>> 26) | 0;
      w16 &= 0x3ffffff;
      /* k = 17 */

      lo = Math.imul(al9, bl8);
      mid = Math.imul(al9, bh8);
      mid = mid + Math.imul(ah9, bl8) | 0;
      hi = Math.imul(ah9, bh8);
      lo = lo + Math.imul(al8, bl9) | 0;
      mid = mid + Math.imul(al8, bh9) | 0;
      mid = mid + Math.imul(ah8, bl9) | 0;
      hi = hi + Math.imul(ah8, bh9) | 0;
      var w17 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w17 >>> 26) | 0;
      w17 &= 0x3ffffff;
      /* k = 18 */

      lo = Math.imul(al9, bl9);
      mid = Math.imul(al9, bh9);
      mid = mid + Math.imul(ah9, bl9) | 0;
      hi = Math.imul(ah9, bh9);
      var w18 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
      c = (hi + (mid >>> 13) | 0) + (w18 >>> 26) | 0;
      w18 &= 0x3ffffff;
      o[0] = w0;
      o[1] = w1;
      o[2] = w2;
      o[3] = w3;
      o[4] = w4;
      o[5] = w5;
      o[6] = w6;
      o[7] = w7;
      o[8] = w8;
      o[9] = w9;
      o[10] = w10;
      o[11] = w11;
      o[12] = w12;
      o[13] = w13;
      o[14] = w14;
      o[15] = w15;
      o[16] = w16;
      o[17] = w17;
      o[18] = w18;

      if (c !== 0) {
        var _x16, _y6, _z6;

        o[19] = c;
        _x16 = out, _y6 = "length", _z6 = _x16[_y6], _x16[_y6] = maybeJSBI$t.add(_z6, maybeJSBI$t.BigInt(1));
      }

      return out;
    }; // Polyfill comb


    if (!Math.imul) {
      comb10MulTo = smallMulTo;
    }

    function bigMulTo(self, num, out) {
      out.negative = maybeJSBI$t.bitwiseXor(num.negative, self.negative);
      out.length = maybeJSBI$t.add(self.length, num.length);
      var carry = 0;
      var hncarry = 0;

      for (var k = 0; k < out.length - 1; k++) {
        // Sum all words with the same `i + j = k` and accumulate `ncarry`,
        // note that ncarry could be >= 0x3ffffff
        var ncarry = hncarry;
        hncarry = 0;
        var rword = carry & 0x3ffffff;
        var maxJ = Math.min(k, num.length - 1);

        for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
          var i = k - j;
          var a = self.words[i] | 0;
          var b = num.words[j] | 0;
          var r = a * b;
          var lo = r & 0x3ffffff;
          ncarry = ncarry + (r / 0x4000000 | 0) | 0;
          lo = lo + rword | 0;
          rword = lo & 0x3ffffff;
          ncarry = ncarry + (lo >>> 26) | 0;
          hncarry += ncarry >>> 26;
          ncarry &= 0x3ffffff;
        }

        out.words[k] = rword;
        carry = ncarry;
        ncarry = hncarry;
      }

      if (carry !== 0) {
        out.words[k] = carry;
      } else {
        var _x17, _y7, _z7;

        _x17 = out, _y7 = "length", _z7 = _x17[_y7], _x17[_y7] = maybeJSBI$t.subtract(_z7, maybeJSBI$t.BigInt(1));
      }

      return out.strip();
    }

    function jumboMulTo(self, num, out) {
      var fftm = new FFTM();
      return fftm.mulp(self, num, out);
    }

    BN.prototype.mulTo = function mulTo(num, out) {
      var res;
      var len = maybeJSBI$t.add(this.length, num.length);

      if (this.length === 10 && num.length === 10) {
        res = comb10MulTo(this, num, out);
      } else if (len < 63) {
        res = smallMulTo(this, num, out);
      } else if (len < 1024) {
        res = bigMulTo(this, num, out);
      } else {
        res = jumboMulTo(this, num, out);
      }

      return res;
    }; // Cooley-Tukey algorithm for FFT
    // slightly revisited to rely on looping instead of recursion


    function FFTM(x, y) {
      this.x = x;
      this.y = y;
    }

    FFTM.prototype.makeRBT = function makeRBT(N) {
      var t = new Array(N);
      var l = BN.prototype._countBits(N) - 1;

      for (var i = 0; i < N; i++) {
        t[i] = this.revBin(i, l, N);
      }

      return t;
    }; // Returns binary-reversed representation of `x`


    FFTM.prototype.revBin = function revBin(x, l, N) {
      if (x === 0 || x === N - 1) return x;
      var rb = 0;

      for (var i = 0; i < l; i++) {
        rb |= (x & 1) << l - i - 1;
        x >>= 1;
      }

      return rb;
    }; // Performs "tweedling" phase, therefore 'emulating'
    // behaviour of the recursive algorithm


    FFTM.prototype.permute = function permute(rbt, rws, iws, rtws, itws, N) {
      for (var i = 0; i < N; i++) {
        rtws[i] = rws[rbt[i]];
        itws[i] = iws[rbt[i]];
      }
    };

    FFTM.prototype.transform = function transform(rws, iws, rtws, itws, N, rbt) {
      this.permute(rbt, rws, iws, rtws, itws, N);

      for (var s = 1; s < N; s <<= 1) {
        var l = s << 1;
        var rtwdf = Math.cos(2 * Math.PI / l);
        var itwdf = Math.sin(2 * Math.PI / l);

        for (var p = 0; p < N; p += l) {
          var rtwdf_ = rtwdf;
          var itwdf_ = itwdf;

          for (var j = 0; j < s; j++) {
            var re = rtws[p + j];
            var ie = itws[p + j];
            var ro = rtws[p + j + s];
            var io = itws[p + j + s];
            var rx = rtwdf_ * ro - itwdf_ * io;
            io = rtwdf_ * io + itwdf_ * ro;
            ro = rx;
            rtws[p + j] = maybeJSBI$t.add(re, ro);
            itws[p + j] = maybeJSBI$t.add(ie, io);
            rtws[p + j + s] = maybeJSBI$t.subtract(re, ro);
            itws[p + j + s] = maybeJSBI$t.subtract(ie, io);
            /* jshint maxdepth : false */

            if (j !== l) {
              rx = rtwdf * rtwdf_ - itwdf * itwdf_;
              itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
              rtwdf_ = rx;
            }
          }
        }
      }
    };

    FFTM.prototype.guessLen13b = function guessLen13b(n, m) {
      var N = Math.max(m, n) | 1;
      var odd = N & 1;
      var i = 0;

      for (N = N / 2 | 0; N; N = N >>> 1) {
        i++;
      }

      return 1 << i + 1 + odd;
    };

    FFTM.prototype.conjugate = function conjugate(rws, iws, N) {
      if (N <= 1) return;

      for (var i = 0; i < N / 2; i++) {
        var t = rws[i];
        rws[i] = rws[N - i - 1];
        rws[N - i - 1] = t;
        t = iws[i];
        iws[i] = maybeJSBI$t.unaryMinus(iws[N - i - 1]);
        iws[N - i - 1] = maybeJSBI$t.unaryMinus(t);
      }
    };

    FFTM.prototype.normalize13b = function normalize13b(ws, N) {
      var carry = 0;

      for (var i = 0; i < N / 2; i++) {
        var w = Math.round(maybeJSBI$t.divide(ws[2 * i + 1], N)) * 0x2000 + Math.round(maybeJSBI$t.divide(ws[2 * i], N)) + carry;
        ws[i] = w & 0x3ffffff;

        if (w < 0x4000000) {
          carry = 0;
        } else {
          carry = w / 0x4000000 | 0;
        }
      }

      return ws;
    };

    FFTM.prototype.convert13b = function convert13b(ws, len, rws, N) {
      var carry = 0;

      for (var i = 0; i < len; i++) {
        carry = carry + (ws[i] | 0);
        rws[2 * i] = carry & 0x1fff;
        carry = carry >>> 13;
        rws[2 * i + 1] = carry & 0x1fff;
        carry = carry >>> 13;
      } // Pad with zeroes


      for (i = 2 * len; i < N; ++i) {
        rws[i] = 0;
      }

      assert(carry === 0);
      assert((carry & ~0x1fff) === 0);
    };

    FFTM.prototype.stub = function stub(N) {
      var ph = new Array(N);

      for (var i = 0; i < N; i++) {
        ph[i] = 0;
      }

      return ph;
    };

    FFTM.prototype.mulp = function mulp(x, y, out) {
      var N = 2 * this.guessLen13b(x.length, y.length);
      var rbt = this.makeRBT(N);

      var _ = this.stub(N);

      var rws = new Array(N);
      var rwst = new Array(N);
      var iwst = new Array(N);
      var nrws = new Array(N);
      var nrwst = new Array(N);
      var niwst = new Array(N);
      var rmws = out.words;
      rmws.length = N;
      this.convert13b(x.words, x.length, rws, N);
      this.convert13b(y.words, y.length, nrws, N);
      this.transform(rws, _, rwst, iwst, N, rbt);
      this.transform(nrws, _, nrwst, niwst, N, rbt);

      for (var i = 0; i < N; i++) {
        var rx = maybeJSBI$t.subtract(maybeJSBI$t.multiply(rwst[i], nrwst[i]), maybeJSBI$t.multiply(iwst[i], niwst[i]));
        iwst[i] = maybeJSBI$t.add(maybeJSBI$t.multiply(rwst[i], niwst[i]), maybeJSBI$t.multiply(iwst[i], nrwst[i]));
        rwst[i] = rx;
      }

      this.conjugate(rwst, iwst, N);
      this.transform(rwst, iwst, rmws, _, N, rbt);
      this.conjugate(rmws, _, N);
      this.normalize13b(rmws, N);
      out.negative = maybeJSBI$t.bitwiseXor(x.negative, y.negative);
      out.length = maybeJSBI$t.add(x.length, y.length);
      return out.strip();
    }; // Multiply `this` by `num`


    BN.prototype.mul = function mul(num) {
      var out = new BN(null);
      out.words = new Array(maybeJSBI$t.add(this.length, num.length));
      return this.mulTo(num, out);
    }; // Multiply employing FFT


    BN.prototype.mulf = function mulf(num) {
      var out = new BN(null);
      out.words = new Array(maybeJSBI$t.add(this.length, num.length));
      return jumboMulTo(this, num, out);
    }; // In-place Multiplication


    BN.prototype.imul = function imul(num) {
      return this.clone().mulTo(num, this);
    };

    BN.prototype.imuln = function imuln(num) {
      assert(typeof num === 'number');
      assert(num < 0x4000000); // Carry

      var carry = 0;

      for (var i = 0; i < this.length; i++) {
        var w = (this.words[i] | 0) * num;
        var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
        carry >>= 26;
        carry += w / 0x4000000 | 0; // NOTE: lo is 27bit maximum

        carry += lo >>> 26;
        this.words[i] = lo & 0x3ffffff;
      }

      if (carry !== 0) {
        var _x18, _y8, _z8;

        this.words[i] = carry;
        _x18 = this, _y8 = "length", _z8 = _x18[_y8], _x18[_y8] = maybeJSBI$t.add(_z8, maybeJSBI$t.BigInt(1));
      }

      return this;
    };

    BN.prototype.muln = function muln(num) {
      return this.clone().imuln(num);
    }; // `this` * `this`


    BN.prototype.sqr = function sqr() {
      return this.mul(this);
    }; // `this` * `this` in-place


    BN.prototype.isqr = function isqr() {
      return this.imul(this.clone());
    }; // Math.pow(`this`, `num`)


    BN.prototype.pow = function pow(num) {
      var w = toBitArray(num);
      if (w.length === 0) return new BN(1); // Skip leading zeroes

      var res = this;

      for (var i = 0; i < w.length; i++, res = res.sqr()) {
        if (w[i] !== 0) break;
      }

      if (++i < w.length) {
        for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
          if (w[i] === 0) continue;
          res = res.mul(q);
        }
      }

      return res;
    }; // Shift-left in-place


    BN.prototype.iushln = function iushln(bits) {
      assert(typeof bits === 'number' && bits >= 0);
      var r = bits % 26;
      var s = (bits - r) / 26;
      var carryMask = 0x3ffffff >>> 26 - r << 26 - r;
      var i;

      if (r !== 0) {
        var carry = 0;

        for (i = 0; maybeJSBI$t.lessThan(i, this.length); _x19 = i, i = maybeJSBI$t.add(i, maybeJSBI$t.BigInt(1)), _x19) {
          var _x19;

          var newCarry = this.words[i] & carryMask;
          var c = (this.words[i] | 0) - newCarry << r;
          this.words[i] = c | carry;
          carry = newCarry >>> 26 - r;
        }

        if (carry) {
          var _x20, _y9, _z9;

          this.words[i] = carry;
          _x20 = this, _y9 = "length", _z9 = _x20[_y9], _x20[_y9] = maybeJSBI$t.add(_z9, maybeJSBI$t.BigInt(1));
        }
      }

      if (s !== 0) {
        for (i = this.length - 1; i >= 0; _x21 = i, i = maybeJSBI$t.subtract(i, maybeJSBI$t.BigInt(1)), _x21) {
          var _x21;

          this.words[i + s] = this.words[i];
        }

        for (i = 0; i < s; _x22 = i, i = maybeJSBI$t.add(i, maybeJSBI$t.BigInt(1)), _x22) {
          var _x22;

          this.words[i] = 0;
        }

        this.length += s;
      }

      return this.strip();
    };

    BN.prototype.ishln = function ishln(bits) {
      // TODO(indutny): implement me
      assert(this.negative === 0);
      return this.iushln(bits);
    }; // Shift-right in-place
    // NOTE: `hint` is a lowest bit before trailing zeroes
    // NOTE: if `extended` is present - it will be filled with destroyed bits


    BN.prototype.iushrn = function iushrn(bits, hint, extended) {
      assert(typeof bits === 'number' && bits >= 0);
      var h;

      if (hint) {
        h = (hint - hint % 26) / 26;
      } else {
        h = 0;
      }

      var r = bits % 26;
      var s = Math.min((bits - r) / 26, this.length);
      var mask = 0x3ffffff ^ 0x3ffffff >>> r << r;
      var maskedWords = extended;
      h -= s;
      h = Math.max(0, h); // Extended mode, copy masked part

      if (maskedWords) {
        for (var i = 0; i < s; i++) {
          maskedWords.words[i] = this.words[i];
        }

        maskedWords.length = s;
      }

      if (s === 0) ; else if (this.length > s) {
        this.length -= s;

        for (i = 0; i < this.length; i++) {
          this.words[i] = this.words[i + s];
        }
      } else {
        this.words[0] = 0;
        this.length = 1;
      }

      var carry = 0;

      for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
        var word = this.words[i] | 0;
        this.words[i] = carry << 26 - r | word >>> r;
        carry = word & mask;
      } // Push carried bits as a mask


      if (maskedWords && carry !== 0) {
        var _x23, _y10, _z10;

        maskedWords.words[(_x23 = maskedWords, _y10 = "length", _z10 = _x23[_y10], _x23[_y10] = maybeJSBI$t.add(_z10, maybeJSBI$t.BigInt(1)), _z10)] = carry;
      }

      if (this.length === 0) {
        this.words[0] = 0;
        this.length = 1;
      }

      return this.strip();
    };

    BN.prototype.ishrn = function ishrn(bits, hint, extended) {
      // TODO(indutny): implement me
      assert(this.negative === 0);
      return this.iushrn(bits, hint, extended);
    }; // Shift-left


    BN.prototype.shln = function shln(bits) {
      return this.clone().ishln(bits);
    };

    BN.prototype.ushln = function ushln(bits) {
      return this.clone().iushln(bits);
    }; // Shift-right


    BN.prototype.shrn = function shrn(bits) {
      return this.clone().ishrn(bits);
    };

    BN.prototype.ushrn = function ushrn(bits) {
      return this.clone().iushrn(bits);
    }; // Test if n bit is set


    BN.prototype.testn = function testn(bit) {
      assert(typeof bit === 'number' && bit >= 0);
      var r = bit % 26;
      var s = (bit - r) / 26;
      var q = 1 << r; // Fast case: bit is much higher than all existing words

      if (this.length <= s) return false; // Check bit and return

      var w = this.words[s];
      return !!(w & q);
    }; // Return only lowers bits of number (in-place)


    BN.prototype.imaskn = function imaskn(bits) {
      assert(typeof bits === 'number' && bits >= 0);
      var r = bits % 26;
      var s = (bits - r) / 26;
      assert(this.negative === 0, 'imaskn works only with positive numbers');

      if (this.length <= s) {
        return this;
      }

      if (r !== 0) {
        s++;
      }

      this.length = Math.min(s, this.length);

      if (r !== 0) {
        var mask = 0x3ffffff ^ 0x3ffffff >>> r << r;
        this.words[this.length - 1] &= mask;
      }

      return this.strip();
    }; // Return only lowers bits of number


    BN.prototype.maskn = function maskn(bits) {
      return this.clone().imaskn(bits);
    }; // Add plain number `num` to `this`


    BN.prototype.iaddn = function iaddn(num) {
      assert(typeof num === 'number');
      assert(num < 0x4000000);
      if (num < 0) return this.isubn(maybeJSBI$t.unaryMinus(num)); // Possible sign change

      if (this.negative !== 0) {
        if (this.length === 1 && (this.words[0] | 0) < num) {
          this.words[0] = num - (this.words[0] | 0);
          this.negative = 0;
          return this;
        }

        this.negative = 0;
        this.isubn(num);
        this.negative = 1;
        return this;
      } // Add without checks


      return this._iaddn(num);
    };

    BN.prototype._iaddn = function _iaddn(num) {
      var _x24, _y11;

      _x24 = this.words, _y11 = 0, _x24[_y11] = maybeJSBI$t.add(_x24[_y11], num); // Carry

      for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
        this.words[i] -= 0x4000000;

        if (i === this.length - 1) {
          this.words[i + 1] = 1;
        } else {
          var _x25, _y12, _z11;

          _x25 = this.words, _y12 = i + 1, _z11 = _x25[_y12], _x25[_y12] = maybeJSBI$t.add(_z11, maybeJSBI$t.BigInt(1));
        }
      }

      this.length = Math.max(this.length, i + 1);
      return this;
    }; // Subtract plain number `num` from `this`


    BN.prototype.isubn = function isubn(num) {
      var _x26, _y13;

      assert(typeof num === 'number');
      assert(num < 0x4000000);
      if (num < 0) return this.iaddn(maybeJSBI$t.unaryMinus(num));

      if (this.negative !== 0) {
        this.negative = 0;
        this.iaddn(num);
        this.negative = 1;
        return this;
      }

      _x26 = this.words, _y13 = 0, _x26[_y13] = maybeJSBI$t.subtract(_x26[_y13], num);

      if (this.length === 1 && this.words[0] < 0) {
        this.words[0] = maybeJSBI$t.unaryMinus(this.words[0]);
        this.negative = 1;
      } else {
        // Carry
        for (var i = 0; i < this.length && this.words[i] < 0; i++) {
          this.words[i] += 0x4000000;
          this.words[i + 1] -= 1;
        }
      }

      return this.strip();
    };

    BN.prototype.addn = function addn(num) {
      return this.clone().iaddn(num);
    };

    BN.prototype.subn = function subn(num) {
      return this.clone().isubn(num);
    };

    BN.prototype.iabs = function iabs() {
      this.negative = 0;
      return this;
    };

    BN.prototype.abs = function abs() {
      return this.clone().iabs();
    };

    BN.prototype._ishlnsubmul = function _ishlnsubmul(num, mul, shift) {
      var len = maybeJSBI$t.add(num.length, shift);
      var i;

      this._expand(len);

      var w;
      var carry = 0;

      for (i = 0; maybeJSBI$t.lessThan(i, num.length); _x27 = i, i = maybeJSBI$t.add(i, maybeJSBI$t.BigInt(1)), _x27) {
        var _x27;

        w = (this.words[maybeJSBI$t.add(i, shift)] | 0) + carry;
        var right = (num.words[i] | 0) * mul;
        w -= right & 0x3ffffff;
        carry = (w >> 26) - (right / 0x4000000 | 0);
        this.words[maybeJSBI$t.add(i, shift)] = w & 0x3ffffff;
      }

      for (; maybeJSBI$t.lessThan(i, maybeJSBI$t.subtract(this.length, shift)); _x28 = i, i = maybeJSBI$t.add(i, maybeJSBI$t.BigInt(1)), _x28) {
        var _x28;

        w = (this.words[maybeJSBI$t.add(i, shift)] | 0) + carry;
        carry = w >> 26;
        this.words[maybeJSBI$t.add(i, shift)] = w & 0x3ffffff;
      }

      if (carry === 0) return this.strip(); // Subtraction overflow

      assert(carry === -1);
      carry = 0;

      for (i = 0; maybeJSBI$t.lessThan(i, this.length); _x29 = i, i = maybeJSBI$t.add(i, maybeJSBI$t.BigInt(1)), _x29) {
        var _x29;

        w = -(this.words[i] | 0) + carry;
        carry = w >> 26;
        this.words[i] = w & 0x3ffffff;
      }

      this.negative = 1;
      return this.strip();
    };

    BN.prototype._wordDiv = function _wordDiv(num, mode) {
      var shift = maybeJSBI$t.subtract(this.length, num.length);
      var a = this.clone();
      var b = num; // Normalize

      var bhi = b.words[b.length - 1] | 0;

      var bhiBits = this._countBits(bhi);

      shift = 26 - bhiBits;

      if (shift !== 0) {
        b = b.ushln(shift);
        a.iushln(shift);
        bhi = b.words[b.length - 1] | 0;
      } // Initialize quotient


      var m = maybeJSBI$t.subtract(a.length, b.length);
      var q;

      if (mode !== 'mod') {
        q = new BN(null);
        q.length = m + 1;
        q.words = new Array(q.length);

        for (var i = 0; i < q.length; i++) {
          q.words[i] = 0;
        }
      }

      var diff = a.clone()._ishlnsubmul(b, 1, m);

      if (diff.negative === 0) {
        a = diff;

        if (q) {
          q.words[m] = 1;
        }
      }

      for (var j = m - 1; j >= 0; j--) {
        var qj = (a.words[b.length + j] | 0) * 0x4000000 + (a.words[b.length + j - 1] | 0); // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
        // (0x7ffffff)

        qj = Math.min(qj / bhi | 0, 0x3ffffff);

        a._ishlnsubmul(b, qj, j);

        while (a.negative !== 0) {
          qj--;
          a.negative = 0;

          a._ishlnsubmul(b, 1, j);

          if (!a.isZero()) {
            a.negative ^= 1;
          }
        }

        if (q) {
          q.words[j] = qj;
        }
      }

      if (q) {
        q.strip();
      }

      a.strip(); // Denormalize

      if (mode !== 'div' && shift !== 0) {
        a.iushrn(shift);
      }

      return {
        div: q || null,
        mod: a
      };
    }; // NOTE: 1) `mode` can be set to `mod` to request mod only,
    //       to `div` to request div only, or be absent to
    //       request both div & mod
    //       2) `positive` is true if unsigned mod is requested


    BN.prototype.divmod = function divmod(num, mode, positive) {
      assert(!num.isZero());

      if (this.isZero()) {
        return {
          div: new BN(0),
          mod: new BN(0)
        };
      }

      var div, mod, res;

      if (this.negative !== 0 && num.negative === 0) {
        res = this.neg().divmod(num, mode);

        if (mode !== 'mod') {
          div = res.div.neg();
        }

        if (mode !== 'div') {
          mod = res.mod.neg();

          if (positive && mod.negative !== 0) {
            mod.iadd(num);
          }
        }

        return {
          div: div,
          mod: mod
        };
      }

      if (this.negative === 0 && num.negative !== 0) {
        res = this.divmod(num.neg(), mode);

        if (mode !== 'mod') {
          div = res.div.neg();
        }

        return {
          div: div,
          mod: res.mod
        };
      }

      if (maybeJSBI$t.bitwiseAnd(this.negative, num.negative) !== 0) {
        res = this.neg().divmod(num.neg(), mode);

        if (mode !== 'div') {
          mod = res.mod.neg();

          if (positive && mod.negative !== 0) {
            mod.isub(num);
          }
        }

        return {
          div: res.div,
          mod: mod
        };
      } // Both numbers are positive at this point
      // Strip both numbers to approximate shift value


      if (maybeJSBI$t.greaterThan(num.length, this.length) || this.cmp(num) < 0) {
        return {
          div: new BN(0),
          mod: this
        };
      } // Very short reduction


      if (num.length === 1) {
        if (mode === 'div') {
          return {
            div: this.divn(num.words[0]),
            mod: null
          };
        }

        if (mode === 'mod') {
          return {
            div: null,
            mod: new BN(this.modn(num.words[0]))
          };
        }

        return {
          div: this.divn(num.words[0]),
          mod: new BN(this.modn(num.words[0]))
        };
      }

      return this._wordDiv(num, mode);
    }; // Find `this` / `num`


    BN.prototype.div = function div(num) {
      return this.divmod(num, 'div', false).div;
    }; // Find `this` % `num`


    BN.prototype.mod = function mod(num) {
      return this.divmod(num, 'mod', false).mod;
    };

    BN.prototype.umod = function umod(num) {
      return this.divmod(num, 'mod', true).mod;
    }; // Find Round(`this` / `num`)


    BN.prototype.divRound = function divRound(num) {
      var dm = this.divmod(num); // Fast case - exact division

      if (dm.mod.isZero()) return dm.div;
      var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;
      var half = num.ushrn(1);
      var r2 = num.andln(1);
      var cmp = mod.cmp(half); // Round down

      if (cmp < 0 || r2 === 1 && cmp === 0) return dm.div; // Round up

      return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
    };

    BN.prototype.modn = function modn(num) {
      assert(num <= 0x3ffffff);
      var p = (1 << 26) % num;
      var acc = 0;

      for (var i = this.length - 1; i >= 0; i--) {
        acc = (p * acc + (this.words[i] | 0)) % num;
      }

      return acc;
    }; // In-place division by number


    BN.prototype.idivn = function idivn(num) {
      assert(num <= 0x3ffffff);
      var carry = 0;

      for (var i = this.length - 1; i >= 0; i--) {
        var w = (this.words[i] | 0) + carry * 0x4000000;
        this.words[i] = w / num | 0;
        carry = w % num;
      }

      return this.strip();
    };

    BN.prototype.divn = function divn(num) {
      return this.clone().idivn(num);
    };

    BN.prototype.egcd = function egcd(p) {
      assert(p.negative === 0);
      assert(!p.isZero());
      var x = this;
      var y = p.clone();

      if (x.negative !== 0) {
        x = x.umod(p);
      } else {
        x = x.clone();
      } // A * x + B * y = x


      var A = new BN(1);
      var B = new BN(0); // C * x + D * y = y

      var C = new BN(0);
      var D = new BN(1);
      var g = 0;

      while (x.isEven() && y.isEven()) {
        x.iushrn(1);
        y.iushrn(1);
        ++g;
      }

      var yp = y.clone();
      var xp = x.clone();

      while (!x.isZero()) {
        for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1) {
        }

        if (i > 0) {
          x.iushrn(i);

          while (i-- > 0) {
            if (A.isOdd() || B.isOdd()) {
              A.iadd(yp);
              B.isub(xp);
            }

            A.iushrn(1);
            B.iushrn(1);
          }
        }

        for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1) {
        }

        if (j > 0) {
          y.iushrn(j);

          while (j-- > 0) {
            if (C.isOdd() || D.isOdd()) {
              C.iadd(yp);
              D.isub(xp);
            }

            C.iushrn(1);
            D.iushrn(1);
          }
        }

        if (x.cmp(y) >= 0) {
          x.isub(y);
          A.isub(C);
          B.isub(D);
        } else {
          y.isub(x);
          C.isub(A);
          D.isub(B);
        }
      }

      return {
        a: C,
        b: D,
        gcd: y.iushln(g)
      };
    }; // This is reduced incarnation of the binary EEA
    // above, designated to invert members of the
    // _prime_ fields F(p) at a maximal speed


    BN.prototype._invmp = function _invmp(p) {
      assert(p.negative === 0);
      assert(!p.isZero());
      var a = this;
      var b = p.clone();

      if (a.negative !== 0) {
        a = a.umod(p);
      } else {
        a = a.clone();
      }

      var x1 = new BN(1);
      var x2 = new BN(0);
      var delta = b.clone();

      while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
        for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1) {
        }

        if (i > 0) {
          a.iushrn(i);

          while (i-- > 0) {
            if (x1.isOdd()) {
              x1.iadd(delta);
            }

            x1.iushrn(1);
          }
        }

        for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1) {
        }

        if (j > 0) {
          b.iushrn(j);

          while (j-- > 0) {
            if (x2.isOdd()) {
              x2.iadd(delta);
            }

            x2.iushrn(1);
          }
        }

        if (a.cmp(b) >= 0) {
          a.isub(b);
          x1.isub(x2);
        } else {
          b.isub(a);
          x2.isub(x1);
        }
      }

      var res;

      if (a.cmpn(1) === 0) {
        res = x1;
      } else {
        res = x2;
      }

      if (res.cmpn(0) < 0) {
        res.iadd(p);
      }

      return res;
    };

    BN.prototype.gcd = function gcd(num) {
      if (this.isZero()) return num.abs();
      if (num.isZero()) return this.abs();
      var a = this.clone();
      var b = num.clone();
      a.negative = 0;
      b.negative = 0; // Remove common factor of two

      for (var shift = 0; a.isEven() && b.isEven(); shift++) {
        a.iushrn(1);
        b.iushrn(1);
      }

      do {
        while (a.isEven()) {
          a.iushrn(1);
        }

        while (b.isEven()) {
          b.iushrn(1);
        }

        var r = a.cmp(b);

        if (r < 0) {
          // Swap `a` and `b` to make `a` always bigger than `b`
          var t = a;
          a = b;
          b = t;
        } else if (r === 0 || b.cmpn(1) === 0) {
          break;
        }

        a.isub(b);
      } while (true);

      return b.iushln(shift);
    }; // Invert number in the field F(num)


    BN.prototype.invm = function invm(num) {
      return this.egcd(num).a.umod(num);
    };

    BN.prototype.isEven = function isEven() {
      return (this.words[0] & 1) === 0;
    };

    BN.prototype.isOdd = function isOdd() {
      return (this.words[0] & 1) === 1;
    }; // And first word and num


    BN.prototype.andln = function andln(num) {
      return maybeJSBI$t.bitwiseAnd(this.words[0], num);
    }; // Increment at the bit position in-line


    BN.prototype.bincn = function bincn(bit) {
      assert(typeof bit === 'number');
      var r = bit % 26;
      var s = (bit - r) / 26;
      var q = 1 << r; // Fast case: bit is much higher than all existing words

      if (this.length <= s) {
        this._expand(s + 1);

        this.words[s] |= q;
        return this;
      } // Add bit and propagate, if needed


      var carry = q;

      for (var i = s; carry !== 0 && i < this.length; i++) {
        var w = this.words[i] | 0;
        w += carry;
        carry = w >>> 26;
        w &= 0x3ffffff;
        this.words[i] = w;
      }

      if (carry !== 0) {
        var _x30, _y14, _z12;

        this.words[i] = carry;
        _x30 = this, _y14 = "length", _z12 = _x30[_y14], _x30[_y14] = maybeJSBI$t.add(_z12, maybeJSBI$t.BigInt(1));
      }

      return this;
    };

    BN.prototype.isZero = function isZero() {
      return this.length === 1 && this.words[0] === 0;
    };

    BN.prototype.cmpn = function cmpn(num) {
      var negative = num < 0;
      if (this.negative !== 0 && !negative) return -1;
      if (this.negative === 0 && negative) return 1;
      this.strip();
      var res;

      if (this.length > 1) {
        res = 1;
      } else {
        if (negative) {
          num = maybeJSBI$t.unaryMinus(num);
        }

        assert(num <= 0x3ffffff, 'Number is too big');
        var w = this.words[0] | 0;
        res = w === num ? 0 : w < num ? -1 : 1;
      }

      if (this.negative !== 0) return maybeJSBI$t.unaryMinus(res) | 0;
      return res;
    }; // Compare two numbers and return:
    // 1 - if `this` > `num`
    // 0 - if `this` == `num`
    // -1 - if `this` < `num`


    BN.prototype.cmp = function cmp(num) {
      if (this.negative !== 0 && num.negative === 0) return -1;
      if (this.negative === 0 && num.negative !== 0) return 1;
      var res = this.ucmp(num);
      if (this.negative !== 0) return maybeJSBI$t.unaryMinus(res) | 0;
      return res;
    }; // Unsigned comparison


    BN.prototype.ucmp = function ucmp(num) {
      // At this point both numbers have the same sign
      if (maybeJSBI$t.greaterThan(this.length, num.length)) return 1;
      if (maybeJSBI$t.lessThan(this.length, num.length)) return -1;
      var res = 0;

      for (var i = this.length - 1; i >= 0; i--) {
        var a = this.words[i] | 0;
        var b = num.words[i] | 0;
        if (a === b) continue;

        if (a < b) {
          res = -1;
        } else if (a > b) {
          res = 1;
        }

        break;
      }

      return res;
    };

    BN.prototype.gtn = function gtn(num) {
      return this.cmpn(num) === 1;
    };

    BN.prototype.gt = function gt(num) {
      return this.cmp(num) === 1;
    };

    BN.prototype.gten = function gten(num) {
      return this.cmpn(num) >= 0;
    };

    BN.prototype.gte = function gte(num) {
      return this.cmp(num) >= 0;
    };

    BN.prototype.ltn = function ltn(num) {
      return this.cmpn(num) === -1;
    };

    BN.prototype.lt = function lt(num) {
      return this.cmp(num) === -1;
    };

    BN.prototype.lten = function lten(num) {
      return this.cmpn(num) <= 0;
    };

    BN.prototype.lte = function lte(num) {
      return this.cmp(num) <= 0;
    };

    BN.prototype.eqn = function eqn(num) {
      return this.cmpn(num) === 0;
    };

    BN.prototype.eq = function eq(num) {
      return this.cmp(num) === 0;
    }; //
    // A reduce context, could be using montgomery or something better, depending
    // on the `m` itself.
    //


    BN.red = function red(num) {
      return new Red(num);
    };

    BN.prototype.toRed = function toRed(ctx) {
      assert(!this.red, 'Already a number in reduction context');
      assert(this.negative === 0, 'red works only with positives');
      return ctx.convertTo(this)._forceRed(ctx);
    };

    BN.prototype.fromRed = function fromRed() {
      assert(this.red, 'fromRed works only with numbers in reduction context');
      return this.red.convertFrom(this);
    };

    BN.prototype._forceRed = function _forceRed(ctx) {
      this.red = ctx;
      return this;
    };

    BN.prototype.forceRed = function forceRed(ctx) {
      assert(!this.red, 'Already a number in reduction context');
      return this._forceRed(ctx);
    };

    BN.prototype.redAdd = function redAdd(num) {
      assert(this.red, 'redAdd works only with red numbers');
      return this.red.add(this, num);
    };

    BN.prototype.redIAdd = function redIAdd(num) {
      assert(this.red, 'redIAdd works only with red numbers');
      return this.red.iadd(this, num);
    };

    BN.prototype.redSub = function redSub(num) {
      assert(this.red, 'redSub works only with red numbers');
      return this.red.sub(this, num);
    };

    BN.prototype.redISub = function redISub(num) {
      assert(this.red, 'redISub works only with red numbers');
      return this.red.isub(this, num);
    };

    BN.prototype.redShl = function redShl(num) {
      assert(this.red, 'redShl works only with red numbers');
      return this.red.shl(this, num);
    };

    BN.prototype.redMul = function redMul(num) {
      assert(this.red, 'redMul works only with red numbers');

      this.red._verify2(this, num);

      return this.red.mul(this, num);
    };

    BN.prototype.redIMul = function redIMul(num) {
      assert(this.red, 'redMul works only with red numbers');

      this.red._verify2(this, num);

      return this.red.imul(this, num);
    };

    BN.prototype.redSqr = function redSqr() {
      assert(this.red, 'redSqr works only with red numbers');

      this.red._verify1(this);

      return this.red.sqr(this);
    };

    BN.prototype.redISqr = function redISqr() {
      assert(this.red, 'redISqr works only with red numbers');

      this.red._verify1(this);

      return this.red.isqr(this);
    }; // Square root over p


    BN.prototype.redSqrt = function redSqrt() {
      assert(this.red, 'redSqrt works only with red numbers');

      this.red._verify1(this);

      return this.red.sqrt(this);
    };

    BN.prototype.redInvm = function redInvm() {
      assert(this.red, 'redInvm works only with red numbers');

      this.red._verify1(this);

      return this.red.invm(this);
    }; // Return negative clone of `this` % `red modulo`


    BN.prototype.redNeg = function redNeg() {
      assert(this.red, 'redNeg works only with red numbers');

      this.red._verify1(this);

      return this.red.neg(this);
    };

    BN.prototype.redPow = function redPow(num) {
      assert(this.red && !num.red, 'redPow(normalNum)');

      this.red._verify1(this);

      return this.red.pow(this, num);
    }; // Prime numbers with efficient reduction


    var primes = {
      k256: null,
      p224: null,
      p192: null,
      p25519: null
    }; // Pseudo-Mersenne prime

    function MPrime(name, p) {
      // P = 2 ^ N - K
      this.name = name;
      this.p = new BN(p, 16);
      this.n = this.p.bitLength();
      this.k = new BN(1).iushln(this.n).isub(this.p);
      this.tmp = this._tmp();
    }

    MPrime.prototype._tmp = function _tmp() {
      var tmp = new BN(null);
      tmp.words = new Array(Math.ceil(this.n / 13));
      return tmp;
    };

    MPrime.prototype.ireduce = function ireduce(num) {
      // Assumes that `num` is less than `P^2`
      // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
      var r = num;
      var rlen;

      do {
        this.split(r, this.tmp);
        r = this.imulK(r);
        r = r.iadd(this.tmp);
        rlen = r.bitLength();
      } while (maybeJSBI$t.greaterThan(rlen, this.n));

      var cmp = maybeJSBI$t.lessThan(rlen, this.n) ? -1 : r.ucmp(this.p);

      if (cmp === 0) {
        r.words[0] = 0;
        r.length = 1;
      } else if (cmp > 0) {
        r.isub(this.p);
      } else {
        r.strip();
      }

      return r;
    };

    MPrime.prototype.split = function split(input, out) {
      input.iushrn(this.n, 0, out);
    };

    MPrime.prototype.imulK = function imulK(num) {
      return num.imul(this.k);
    };

    function K256() {
      MPrime.call(this, 'k256', 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
    }

    inherits(K256, MPrime);

    K256.prototype.split = function split(input, output) {
      var _x31, _y15, _z13;

      // 256 = 9 * 26 + 22
      var mask = 0x3fffff;
      var outLen = Math.min(input.length, 9);

      for (var i = 0; i < outLen; i++) {
        output.words[i] = input.words[i];
      }

      output.length = outLen;

      if (input.length <= 9) {
        input.words[0] = 0;
        input.length = 1;
        return;
      } // Shift by 9 limbs


      var prev = input.words[9];
      output.words[(_x31 = output, _y15 = "length", _z13 = _x31[_y15], _x31[_y15] = maybeJSBI$t.add(_z13, maybeJSBI$t.BigInt(1)), _z13)] = prev & mask;

      for (i = 10; i < input.length; i++) {
        var next = input.words[i] | 0;
        input.words[i - 10] = (next & mask) << 4 | prev >>> 22;
        prev = next;
      }

      prev >>>= 22;
      input.words[i - 10] = prev;

      if (prev === 0 && input.length > 10) {
        input.length -= 10;
      } else {
        input.length -= 9;
      }
    };

    K256.prototype.imulK = function imulK(num) {
      // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
      num.words[num.length] = 0;
      num.words[num.length + 1] = 0;
      num.length += 2; // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390

      var lo = 0;

      for (var i = 0; i < num.length; i++) {
        var w = num.words[i] | 0;
        lo += w * 0x3d1;
        num.words[i] = lo & 0x3ffffff;
        lo = w * 0x40 + (lo / 0x4000000 | 0);
      } // Fast length reduction


      if (num.words[num.length - 1] === 0) {
        var _x32, _y16, _z14;

        _x32 = num, _y16 = "length", _z14 = _x32[_y16], _x32[_y16] = maybeJSBI$t.subtract(_z14, maybeJSBI$t.BigInt(1));

        if (num.words[num.length - 1] === 0) {
          var _x33, _y17, _z15;

          _x33 = num, _y17 = "length", _z15 = _x33[_y17], _x33[_y17] = maybeJSBI$t.subtract(_z15, maybeJSBI$t.BigInt(1));
        }
      }

      return num;
    };

    function P224() {
      MPrime.call(this, 'p224', 'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
    }

    inherits(P224, MPrime);

    function P192() {
      MPrime.call(this, 'p192', 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
    }

    inherits(P192, MPrime);

    function P25519() {
      // 2 ^ 255 - 19
      MPrime.call(this, '25519', '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
    }

    inherits(P25519, MPrime);

    P25519.prototype.imulK = function imulK(num) {
      // K = 0x13
      var carry = 0;

      for (var i = 0; i < num.length; i++) {
        var hi = (num.words[i] | 0) * 0x13 + carry;
        var lo = hi & 0x3ffffff;
        hi >>>= 26;
        num.words[i] = lo;
        carry = hi;
      }

      if (carry !== 0) {
        var _x34, _y18, _z16;

        num.words[(_x34 = num, _y18 = "length", _z16 = _x34[_y18], _x34[_y18] = maybeJSBI$t.add(_z16, maybeJSBI$t.BigInt(1)), _z16)] = carry;
      }

      return num;
    }; // Exported mostly for testing purposes, use plain name instead


    BN._prime = function prime(name) {
      // Cached version of prime
      if (primes[name]) return primes[name];
      var prime;

      if (name === 'k256') {
        prime = new K256();
      } else if (name === 'p224') {
        prime = new P224();
      } else if (name === 'p192') {
        prime = new P192();
      } else if (name === 'p25519') {
        prime = new P25519();
      } else {
        throw new Error('Unknown prime ' + name);
      }

      primes[name] = prime;
      return prime;
    }; //
    // Base reduction engine
    //


    function Red(m) {
      if (typeof m === 'string') {
        var prime = BN._prime(m);

        this.m = prime.p;
        this.prime = prime;
      } else {
        assert(m.gtn(1), 'modulus must be greater than 1');
        this.m = m;
        this.prime = null;
      }
    }

    Red.prototype._verify1 = function _verify1(a) {
      assert(a.negative === 0, 'red works only with positives');
      assert(a.red, 'red works only with red numbers');
    };

    Red.prototype._verify2 = function _verify2(a, b) {
      assert(maybeJSBI$t.bitwiseOr(a.negative, b.negative) === 0, 'red works only with positives');
      assert(a.red && maybeJSBI$t.equal(a.red, b.red), 'red works only with red numbers');
    };

    Red.prototype.imod = function imod(a) {
      if (this.prime) return this.prime.ireduce(a)._forceRed(this);
      return a.umod(this.m)._forceRed(this);
    };

    Red.prototype.neg = function neg(a) {
      if (a.isZero()) {
        return a.clone();
      }

      return this.m.sub(a)._forceRed(this);
    };

    Red.prototype.add = function add(a, b) {
      this._verify2(a, b);

      var res = a.add(b);

      if (res.cmp(this.m) >= 0) {
        res.isub(this.m);
      }

      return res._forceRed(this);
    };

    Red.prototype.iadd = function iadd(a, b) {
      this._verify2(a, b);

      var res = a.iadd(b);

      if (res.cmp(this.m) >= 0) {
        res.isub(this.m);
      }

      return res;
    };

    Red.prototype.sub = function sub(a, b) {
      this._verify2(a, b);

      var res = a.sub(b);

      if (res.cmpn(0) < 0) {
        res.iadd(this.m);
      }

      return res._forceRed(this);
    };

    Red.prototype.isub = function isub(a, b) {
      this._verify2(a, b);

      var res = a.isub(b);

      if (res.cmpn(0) < 0) {
        res.iadd(this.m);
      }

      return res;
    };

    Red.prototype.shl = function shl(a, num) {
      this._verify1(a);

      return this.imod(a.ushln(num));
    };

    Red.prototype.imul = function imul(a, b) {
      this._verify2(a, b);

      return this.imod(a.imul(b));
    };

    Red.prototype.mul = function mul(a, b) {
      this._verify2(a, b);

      return this.imod(a.mul(b));
    };

    Red.prototype.isqr = function isqr(a) {
      return this.imul(a, a.clone());
    };

    Red.prototype.sqr = function sqr(a) {
      return this.mul(a, a);
    };

    Red.prototype.sqrt = function sqrt(a) {
      if (a.isZero()) return a.clone();
      var mod3 = this.m.andln(3);
      assert(mod3 % 2 === 1); // Fast case

      if (mod3 === 3) {
        var pow = this.m.add(new BN(1)).iushrn(2);
        return this.pow(a, pow);
      } // Tonelli-Shanks algorithm (Totally unoptimized and slow)
      //
      // Find Q and S, that Q * 2 ^ S = (P - 1)


      var q = this.m.subn(1);
      var s = 0;

      while (!q.isZero() && q.andln(1) === 0) {
        s++;
        q.iushrn(1);
      }

      assert(!q.isZero());
      var one = new BN(1).toRed(this);
      var nOne = one.redNeg(); // Find quadratic non-residue
      // NOTE: Max is such because of generalized Riemann hypothesis.

      var lpow = this.m.subn(1).iushrn(1);
      var z = this.m.bitLength();
      z = new BN(2 * z * z).toRed(this);

      while (this.pow(z, lpow).cmp(nOne) !== 0) {
        z.redIAdd(nOne);
      }

      var c = this.pow(z, q);
      var r = this.pow(a, q.addn(1).iushrn(1));
      var t = this.pow(a, q);
      var m = s;

      while (t.cmp(one) !== 0) {
        var tmp = t;

        for (var i = 0; tmp.cmp(one) !== 0; i++) {
          tmp = tmp.redSqr();
        }

        assert(i < m);
        var b = this.pow(c, new BN(1).iushln(m - i - 1));
        r = r.redMul(b);
        c = b.redSqr();
        t = t.redMul(c);
        m = i;
      }

      return r;
    };

    Red.prototype.invm = function invm(a) {
      var inv = a._invmp(this.m);

      if (inv.negative !== 0) {
        inv.negative = 0;
        return this.imod(inv).redNeg();
      } else {
        return this.imod(inv);
      }
    };

    Red.prototype.pow = function pow(a, num) {
      if (num.isZero()) return new BN(1).toRed(this);
      if (num.cmpn(1) === 0) return a.clone();
      var windowSize = 4;
      var wnd = new Array(1 << windowSize);
      wnd[0] = new BN(1).toRed(this);
      wnd[1] = a;

      for (var i = 2; i < wnd.length; i++) {
        wnd[i] = this.mul(wnd[i - 1], a);
      }

      var res = wnd[0];
      var current = 0;
      var currentLen = 0;
      var start = num.bitLength() % 26;

      if (start === 0) {
        start = 26;
      }

      for (i = num.length - 1; i >= 0; i--) {
        var word = num.words[i];

        for (var j = start - 1; j >= 0; j--) {
          var bit = word >> j & 1;

          if (maybeJSBI$t.notEqual(res, wnd[0])) {
            res = this.sqr(res);
          }

          if (bit === 0 && current === 0) {
            currentLen = 0;
            continue;
          }

          current <<= 1;
          current |= bit;
          currentLen++;
          if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;
          res = this.mul(res, wnd[current]);
          currentLen = 0;
          current = 0;
        }

        start = 26;
      }

      return res;
    };

    Red.prototype.convertTo = function convertTo(num) {
      var r = num.umod(this.m);
      return maybeJSBI$t.equal(r, num) ? r.clone() : r;
    };

    Red.prototype.convertFrom = function convertFrom(num) {
      var res = num.clone();
      res.red = null;
      return res;
    }; //
    // Montgomery method engine
    //


    BN.mont = function mont(num) {
      return new Mont(num);
    };

    function Mont(m) {
      Red.call(this, m);
      this.shift = this.m.bitLength();

      if (this.shift % 26 !== 0) {
        this.shift += 26 - this.shift % 26;
      }

      this.r = new BN(1).iushln(this.shift);
      this.r2 = this.imod(this.r.sqr());
      this.rinv = this.r._invmp(this.m);
      this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
      this.minv = this.minv.umod(this.r);
      this.minv = this.r.sub(this.minv);
    }

    inherits(Mont, Red);

    Mont.prototype.convertTo = function convertTo(num) {
      return this.imod(num.ushln(this.shift));
    };

    Mont.prototype.convertFrom = function convertFrom(num) {
      var r = this.imod(num.mul(this.rinv));
      r.red = null;
      return r;
    };

    Mont.prototype.imul = function imul(a, b) {
      if (a.isZero() || b.isZero()) {
        a.words[0] = 0;
        a.length = 1;
        return a;
      }

      var t = a.imul(b);
      var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
      var u = t.isub(c).iushrn(this.shift);
      var res = u;

      if (u.cmp(this.m) >= 0) {
        res = u.isub(this.m);
      } else if (u.cmpn(0) < 0) {
        res = u.iadd(this.m);
      }

      return res._forceRed(this);
    };

    Mont.prototype.mul = function mul(a, b) {
      if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);
      var t = a.mul(b);
      var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
      var u = t.isub(c).iushrn(this.shift);
      var res = u;

      if (u.cmp(this.m) >= 0) {
        res = u.isub(this.m);
      } else if (u.cmpn(0) < 0) {
        res = u.iadd(this.m);
      }

      return res._forceRed(this);
    };

    Mont.prototype.invm = function invm(a) {
      // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
      var res = this.imod(a._invmp(this.m).mul(this.r2));
      return res._forceRed(this);
    };
  })(module, commonjsGlobal);
})(bn);

var BN = bn.exports;

/**
 * @name isBn
 * @summary Tests for a `BN` object instance.
 * @description
 * Checks to see if the input object is an instance of `BN` (bn.js).
 * @example
 * <BR>
 *
 * ```javascript
 * import BN from 'bn.js';
 * import { isBn } from '@polkadot/util';
 *
 * console.log('isBn', isBn(new BN(1))); // => true
 * ```
 */

function isBn(value) {
  return BN.isBN(value);
}

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name isObject
 * @summary Tests for an `object`.
 * @description
 * Checks to see if the input value is a JavaScript object.
 * @example
 * <BR>
 *
 * ```javascript
 * import { isObject } from '@polkadot/util';
 *
 * isObject({}); // => true
 * isObject('something'); // => false
 * ```
 */
function isObject(value) {
  return !!value && _typeof(value) === 'object';
}

function isOn() {
  for (var _len = arguments.length, fns = new Array(_len), _key = 0; _key < _len; _key++) {
    fns[_key] = arguments[_key];
  }

  return function (value) {
    return (isObject(value) || isFunction(value)) && fns.every(function (f) {
      return isFunction(value[f]);
    });
  };
}

var isToBigInt = isOn('toBigInt');

var isToBn = isOn('toBn');

/**
 * @name nToBigInt
 * @summary Creates a bigInt value from a BN, bigint, string (base 10 or hex) or number input.
 */

function nToBigInt(value) {
  return typeof value === 'bigint' ? value : !value ? JSBI.BigInt(0) : isHex(value) ? hexToBigInt(value.toString()) : isBn(value) ? JSBI.BigInt(value.toString()) : isToBigInt(value) ? value.toBigInt() : isToBn(value) ? JSBI.BigInt(value.toBn().toString()) : JSBI.BigInt(value);
}

var hasBigInt = typeof BigInt$1 === 'function' && typeof BigInt$1.asIntN === 'function';
var hasBuffer = typeof Buffer !== 'undefined';
var hasProcess = (typeof process === "undefined" ? "undefined" : _typeof(process)) === 'object';

/**
 * @name isBuffer
 * @summary Tests for a `Buffer` object instance.
 * @description
 * Checks to see if the input object is an instance of `Buffer`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { isBuffer } from '@polkadot/util';
 *
 * console.log('isBuffer', isBuffer(Buffer.from([]))); // => true
 * ```
 */

function isBuffer(value) {
  return hasBuffer && Buffer.isBuffer(value);
}

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name isU8a
 * @summary Tests for a `Uint8Array` object instance.
 * @description
 * Checks to see if the input object is an instance of `Uint8Array`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { isUint8Array } from '@polkadot/util';
 *
 * console.log('isU8a', isU8a([])); // => false
 * ```
 */
function isU8a(value) {
  return value instanceof Uint8Array;
}

var encoder = new TextEncoder$1();
/**
 * @name stringToU8a
 * @summary Creates a Uint8Array object from a utf-8 string.
 * @description
 * String input values return the actual encoded `UInt8Array`. `null` or `undefined` values returns an empty encoded array.
 * @example
 * <BR>
 *
 * ```javascript
 * import { stringToU8a } from '@polkadot/util';
 *
 * stringToU8a('hello'); // [0x68, 0x65, 0x6c, 0x6c, 0x6f]
 * ```
 */
// eslint-disable-next-line @typescript-eslint/ban-types

function stringToU8a(value) {
  return value ? encoder.encode(value.toString()) : new Uint8Array();
}

/**
 * @name u8aToU8a
 * @summary Creates a Uint8Array value from a Uint8Array, Buffer, string or hex input.
 * @description
 * `null` or `undefined` inputs returns a `[]` result, Uint8Array values returns the value, hex strings returns a Uint8Array representation.
 * @example
 * <BR>
 *
 * ```javascript
 * import { u8aToU8a } from '@polkadot/util';
 *
 * u8aToU8a(new Uint8Array([0x12, 0x34]); // => Uint8Array([0x12, 0x34])
 * u8aToU8a(0x1234); // => Uint8Array([0x12, 0x34])
 * ```
 */

function u8aToU8a(value) {
  return !value ? new Uint8Array() : Array.isArray(value) || isBuffer(value) ? new Uint8Array(value) : isU8a(value) ? value : isHex(value) ? hexToU8a(value) : stringToU8a(value);
}

/**
 * @name u8aConcat
 * @summary Creates a concatenated Uint8Array from the inputs.
 * @description
 * Concatenates the input arrays into a single `UInt8Array`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { { u8aConcat } from '@polkadot/util';
 *
 * u8aConcat(
 *   new Uint8Array([1, 2, 3]),
 *   new Uint8Array([4, 5, 6])
 * ); // [1, 2, 3, 4, 5, 6]
 * ```
 */

function u8aConcat() {
  var length = 0;
  var offset = 0;
  var u8as = new Array(arguments.length);

  for (var i = 0; i < arguments.length; i++) {
    u8as[i] = u8aToU8a(i < 0 || arguments.length <= i ? undefined : arguments[i]);
    length += u8as[i].length;
  }

  var result = new Uint8Array(length);

  for (var _i = 0; _i < u8as.length; _i++) {
    result.set(u8as[_i], offset);
    offset += u8as[_i].length;
  }

  return result;
}

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name u8aEmpty
 * @summary Tests for a `Uint8Array` for emptyness
 * @description
 * Checks to see if the input `Uint8Array` has zero length or contains all 0 values.
 */
function u8aEmpty(value) {
  // on smaller values < 64 bytes, the byte-by-byte compare is faster than
  // allocating yet another object for DataView (on large buffers the DataView
  // is much faster)
  for (var i = 0; i < value.length; i++) {
    if (value[i]) {
      return false;
    }
  }

  return true;
}

var maybeJSBI$s = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
/**
 * @name u8aEq
 * @summary Compares two Uint8Arrays for equality.
 * @description
 * For `UInt8Array` (or hex string) input values true if there is a match.
 * @example
 * <BR>
 *
 * ```javascript
 * import { u8aEq } from '@polkadot/util';
 *
 * u8aEq(new Uint8Array([0x68, 0x65]), new Uint8Array([0x68, 0x65])); // true
 * ```
 */

function u8aEq(a, b) {
  var u8aa = u8aToU8a(a);
  var u8ab = u8aToU8a(b);

  if (maybeJSBI$s.equal(u8aa.length, u8ab.length)) {
    var dvA = new DataView(u8aa.buffer, u8aa.byteOffset);
    var dvB = new DataView(u8ab.buffer, u8ab.byteOffset);
    var mod = u8aa.length % 4;
    var length = u8aa.length - mod;

    for (var i = 0; i < length; i += 4) {
      if (maybeJSBI$s.notEqual(dvA.getUint32(i), dvB.getUint32(i))) {
        return false;
      }
    }

    for (var _i = length; _i < u8aa.length; _i++) {
      if (maybeJSBI$s.notEqual(u8aa[_i], u8ab[_i])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name u8aFixLength
 * @summary Shifts a Uint8Array to a specific bitLength
 * @description
 * Returns a uint8Array with the specified number of bits contained in the return value. (If bitLength is -1, length checking is not done). Values with more bits are trimmed to the specified length.
 * @example
 * <BR>
 *
 * ```javascript
 * import { u8aFixLength } from '@polkadot/util';
 *
 * u8aFixLength('0x12') // => 0x12
 * u8aFixLength('0x12', 16) // => 0x0012
 * u8aFixLength('0x1234', 8) // => 0x12
 * ```
 */
function u8aFixLength(value) {
  var bitLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;
  var atStart = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var byteLength = Math.ceil(bitLength / 8);

  if (bitLength === -1 || value.length === byteLength) {
    return value;
  } else if (value.length > byteLength) {
    return value.subarray(0, byteLength);
  }

  var result = new Uint8Array(byteLength);
  result.set(value, atStart ? 0 : byteLength - value.length);
  return result;
}

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name isBoolean
 * @summary Tests for a boolean value.
 * @description
 * Checks to see if the input value is a JavaScript boolean.
 * @example
 * <BR>
 *
 * ```javascript
 * import { isBoolean } from '@polkadot/util';
 *
 * isBoolean(false); // => true
 * ```
 */
function isBoolean(value) {
  return typeof value === 'boolean';
}

var DEFAULT_OPTS$2 = {
  isLe: false,
  isNegative: false
};
/**
 * @name hexToBn
 * @summary Creates a BN.js object from a hex string.
 * @description
 * `null` inputs returns a `BN(0)` result. Hex input values return the actual value converted to a BN. Anything that is not a hex string (including the `0x` prefix) throws an error.
 * @param _value The value to convert
 * @param _options Options to pass while converting
 * @param _options.isLe Convert using Little Endian
 * @param _options.isNegative Convert using two's complement
 * @example
 * <BR>
 *
 * ```javascript
 * import { hexToBn } from '@polkadot/util';
 *
 * hexToBn('0x123480001f'); // => BN(0x123480001f)
 * ```
 */

function hexToBn(value) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : DEFAULT_OPTS$2;

  if (!value || value === '0x') {
    return new BN(0);
  }

  var _objectSpread = objectSpread({
    isLe: false,
    isNegative: false
  }, isBoolean(options) ? {
    isLe: options
  } : options),
      isLe = _objectSpread.isLe,
      isNegative = _objectSpread.isNegative;

  var stripped = hexStripPrefix(value);
  var bn = new BN(stripped, 16, isLe ? 'le' : 'be'); // fromTwos takes as parameter the number of bits, which is the hex length
  // multiplied by 4.

  return isNegative ? bn.fromTwos(stripped.length * 4) : bn;
}

/** @internal */

function hex(value) {
  var mod = value.length % 2;
  var length = value.length - mod;
  var dv = new DataView(value.buffer, value.byteOffset);
  var result = '';

  for (var i = 0; i < length; i += 2) {
    result += U16_TO_HEX[dv.getUint16(i)];
  }

  if (mod) {
    result += U8_TO_HEX[dv.getUint8(length)];
  }

  return result;
}
/**
 * @name u8aToHex
 * @summary Creates a hex string from a Uint8Array object.
 * @description
 * `UInt8Array` input values return the actual hex string. `null` or `undefined` values returns an `0x` string.
 * @example
 * <BR>
 *
 * ```javascript
 * import { u8aToHex } from '@polkadot/util';
 *
 * u8aToHex(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0xf])); // 0x68656c0f
 * ```
 */


function u8aToHex(value) {
  var bitLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;
  var isPrefixed = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
  var length = Math.ceil(bitLength / 8);
  return "".concat(isPrefixed ? '0x' : '').concat(!value || !value.length ? '' : length > 0 && value.length > length ? "".concat(hex(value.subarray(0, length / 2)), "\u2026").concat(hex(value.subarray(value.length - length / 2))) : hex(value));
}

var DEFAULT_OPTS$1 = {
  isLe: true,
  isNegative: false
};
/**
 * @name u8aToBn
 * @summary Creates a BN from a Uint8Array object.
 * @description
 * `UInt8Array` input values return the actual BN. `null` or `undefined` values returns an `0x0` value.
 * @param value The value to convert
 * @param options Options to pass while converting
 * @param options.isLe Convert using Little Endian
 * @param options.isNegative Convert using two's complement
 * @example
 * <BR>
 *
 * ```javascript
 * import { u8aToBn } from '@polkadot/util';
 *
 * u8aToHex(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0xf])); // 0x68656c0f
 * ```
 */

function u8aToBn(value) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : DEFAULT_OPTS$1;
  return hexToBn(u8aToHex(value), options);
}

var maybeJSBI$r = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
var U8A_WRAP_ETHEREUM = u8aToU8a('\x19Ethereum Signed Message:\n');
var U8A_WRAP_PREFIX = u8aToU8a('<Bytes>');
var U8A_WRAP_POSTFIX = u8aToU8a('</Bytes>');
var WRAP_LEN = maybeJSBI$r.add(U8A_WRAP_PREFIX.length, U8A_WRAP_POSTFIX.length);
function u8aIsWrapped(u8a, withEthereum) {
  return maybeJSBI$r.greaterThanOrEqual(u8a.length, WRAP_LEN) && u8aEq(u8a.subarray(0, U8A_WRAP_PREFIX.length), U8A_WRAP_PREFIX) && u8aEq(u8a.slice(maybeJSBI$r.unaryMinus(U8A_WRAP_POSTFIX.length)), U8A_WRAP_POSTFIX) || withEthereum && maybeJSBI$r.greaterThanOrEqual(u8a.length, U8A_WRAP_ETHEREUM.length) && u8aEq(u8a.subarray(0, U8A_WRAP_ETHEREUM.length), U8A_WRAP_ETHEREUM);
}
function u8aUnwrapBytes(bytes) {
  var u8a = u8aToU8a(bytes); // we don't want to unwrap Ethereum-style wraps

  return u8aIsWrapped(u8a, false) ? u8a.subarray(U8A_WRAP_PREFIX.length, maybeJSBI$r.subtract(u8a.length, U8A_WRAP_POSTFIX.length)) : u8a;
}
function u8aWrapBytes(bytes) {
  var u8a = u8aToU8a(bytes); // if Ethereum-wrapping, we don't add our wrapping bytes

  return u8aIsWrapped(u8a, true) ? u8a : u8aConcat(U8A_WRAP_PREFIX, u8a, U8A_WRAP_POSTFIX);
}

var maybeJSBI$q = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
var DIV = JSBI.BigInt(256);
var NEG_MASK = JSBI.BigInt(0xff);

function createEmpty$1(_ref) {
  var _ref$bitLength = _ref.bitLength,
      bitLength = _ref$bitLength === void 0 ? 0 : _ref$bitLength;
  return bitLength === -1 ? new Uint8Array() : new Uint8Array(Math.ceil(bitLength / 8));
}

function toU8a(value, _ref2) {
  var isLe = _ref2.isLe,
      isNegative = _ref2.isNegative;
  var arr = [];

  if (isNegative) {
    value = maybeJSBI$q.multiply(maybeJSBI$q.add(value, _1n$2), maybeJSBI$q.unaryMinus(_1n$2));
  }

  while (maybeJSBI$q.notEqual(value, _0n$2)) {
    var mod = maybeJSBI$q.remainder(value, DIV);
    var val = maybeJSBI$q.toNumber(isNegative ? maybeJSBI$q.bitwiseXor(mod, NEG_MASK) : mod);

    if (isLe) {
      arr.push(val);
    } else {
      arr.unshift(val);
    }

    value = maybeJSBI$q.divide(maybeJSBI$q.subtract(value, mod), DIV);
  }

  return Uint8Array.from(arr);
}
/**
 * @name nToU8a
 * @summary Creates a Uint8Array object from a bigint.
 */


function nToU8a(value, options) {
  var opts = objectSpread({
    bitLength: -1,
    isLe: true,
    isNegative: false
  }, options);
  var valueBi = nToBigInt(value);

  if (maybeJSBI$q.equal(valueBi, _0n$2)) {
    return createEmpty$1(opts);
  }

  var u8a = toU8a(valueBi, opts);

  if (opts.bitLength === -1) {
    return u8a;
  }

  var byteLength = Math.ceil((opts.bitLength || 0) / 8);
  var output = new Uint8Array(byteLength);

  if (opts.isNegative) {
    output.fill(0xff);
  }

  output.set(u8a, opts.isLe ? 0 : byteLength - u8a.length);
  return output;
}

/**
 * @name BN_ZERO
 * @summary BN constant for 0.
 */

new BN(0);
/**
 * @name BN_ONE
 * @summary BN constant for 1.
 */

var BN_ONE = new BN(1);
/**
 * @name BN_TWO
 * @summary BN constant for 2.
 */

var BN_TWO = new BN(2);
/**
 * @name BN_THREE
 * @summary BN constant for 3.
 */

new BN(3);
/**
 * @name BN_FOUR
 * @summary BN constant for 4.
 */

new BN(4);
/**
 * @name BN_FIVE
 * @summary BN constant for 5.
 */

new BN(5);
/**
 * @name BN_SIX
 * @summary BN constant for 6.
 */

new BN(6);
/**
 * @name BN_SEVEN
 * @summary BN constant for 7.
 */

new BN(7);
/**
 * @name BN_EIGHT
 * @summary BN constant for 8.
 */

new BN(8);
/**
 * @name BN_NINE
 * @summary BN constant for 9.
 */

new BN(9);
/**
 * @name BN_TEN
 * @summary BN constant for 10.
 */

new BN(10);
/**
 * @name BN_HUNDRED
 * @summary BN constant for 100.
 */

new BN(100);
/**
 * @name BN_THOUSAND
 * @summary BN constant for 1,000.
 */

new BN(1000);
/**
 * @name BN_MILLION
 * @summary BN constant for 1,000,000.
 */

new BN(1000000);
/**
 * @name BN_BILLION
 * @summary BN constant for 1,000,000,000.
 */

var BN_BILLION = new BN(1000000000);
/**
 * @name BN_QUINTILL
 * @summary BN constant for 1,000,000,000,000,000,000.
 */

BN_BILLION.mul(BN_BILLION);
/**
 * @name BN_MAX_INTEGER
 * @summary BN constant for MAX_SAFE_INTEGER
 */

new BN(Number.MAX_SAFE_INTEGER);

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name isBigInt
 * @summary Tests for a `BigInt` object instance.
 * @description
 * Checks to see if the input object is an instance of `BigInt`
 * @example
 * <BR>
 *
 * ```javascript
 * import { isBigInt } from '@polkadot/util';
 *
 * console.log('isBigInt', isBigInt(123_456n)); // => true
 * ```
 */
function isBigInt(value) {
  return typeof value === 'bigint';
}

/**
 * @name bnToBn
 * @summary Creates a BN value from a BN, bigint, string (base 10 or hex) or number input.
 * @description
 * `null` inputs returns a `0x0` result, BN values returns the value, numbers returns a BN representation.
 * @example
 * <BR>
 *
 * ```javascript
 * import BN from 'bn.js';
 * import { bnToBn } from '@polkadot/util';
 *
 * bnToBn(0x1234); // => BN(0x1234)
 * bnToBn(new BN(0x1234)); // => BN(0x1234)
 * ```
 */

function bnToBn(value) {
  return BN.isBN(value) ? value : !value ? new BN(0) : isHex(value) ? hexToBn(value.toString()) : isBigInt(value) ? new BN(value.toString()) : isToBn(value) ? value.toBn() : isToBigInt(value) ? new BN(value.toBigInt().toString()) : new BN(value);
}

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name isNumber
 * @summary Tests for a JavaScript number.
 * @description
 * Checks to see if the input value is a valid number.
 * @example
 * <BR>
 *
 * ```javascript
 * import { isNumber } from '@polkadot/util';
 *
 * console.log('isNumber', isNumber(1234)); // => true
 * ```
 */
function isNumber(value) {
  return typeof value === 'number';
}

var DEFAULT_OPTS = {
  bitLength: -1,
  isLe: true,
  isNegative: false
};

function createEmpty(byteLength, options) {
  return options.bitLength === -1 ? new Uint8Array() : new Uint8Array(byteLength);
}

function createValue(valueBn, byteLength, _ref) {
  var isLe = _ref.isLe,
      isNegative = _ref.isNegative;
  var output = new Uint8Array(byteLength);
  var bn = isNegative ? valueBn.toTwos(byteLength * 8) : valueBn;
  output.set(bn.toArray(isLe ? 'le' : 'be', byteLength), 0);
  return output;
}
/**
 * @name bnToU8a
 * @summary Creates a Uint8Array object from a BN.
 * @description
 * `null`/`undefined`/`NaN` inputs returns an empty `Uint8Array` result. `BN` input values return the actual bytes value converted to a `Uint8Array`. Optionally convert using little-endian format if `isLE` is set.
 * @example
 * <BR>
 *
 * ```javascript
 * import { bnToU8a } from '@polkadot/util';
 *
 * bnToU8a(new BN(0x1234)); // => [0x12, 0x34]
 * ```
 */


function bnToU8a(value) {
  var arg1 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : DEFAULT_OPTS;
  var arg2 = arguments.length > 2 ? arguments[2] : undefined;
  var options = objectSpread({
    bitLength: -1,
    isLe: true,
    isNegative: false
  }, isNumber(arg1) ? {
    bitLength: arg1,
    isLe: arg2
  } : arg1);
  var valueBn = bnToBn(value);
  var byteLength = options.bitLength === -1 ? Math.ceil(valueBn.bitLength() / 8) : Math.ceil((options.bitLength || 0) / 8);
  return value ? createValue(valueBn, byteLength, options) : createEmpty(byteLength, options);
}

var maybeJSBI$p = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
var MAX_U8 = BN_TWO.pow(new BN(8 - 2)).isub(BN_ONE);
var MAX_U16 = BN_TWO.pow(new BN(16 - 2)).isub(BN_ONE);
var MAX_U32 = BN_TWO.pow(new BN(32 - 2)).isub(BN_ONE);
/**
 * @name compactToU8a
 * @description Encodes a number into a compact representation
 * @example
 * <BR>
 *
 * ```javascript
 * import { compactToU8a } from '@polkadot/util';
 *
 * console.log(compactToU8a(511, 32)); // Uint8Array([0b11111101, 0b00000111])
 * ```
 */

function compactToU8a(value) {
  var bn = bnToBn(value);

  if (bn.lte(MAX_U8)) {
    return new Uint8Array([bn.toNumber() << 2]);
  } else if (bn.lte(MAX_U16)) {
    return bnToU8a(bn.shln(2).iadd(BN_ONE), 16, true);
  } else if (bn.lte(MAX_U32)) {
    return bnToU8a(bn.shln(2).iadd(BN_TWO), 32, true);
  }

  var u8a = bnToU8a(bn);
  var length = u8a.length; // adjust to the minimum number of bytes

  while (u8a[length - 1] === 0) {

    length = maybeJSBI$p.subtract(length, maybeJSBI$p.BigInt(1));
  }

  assert(length >= 4, 'Invalid length, previous checks match anything less than 2^30');
  return u8aConcat( // subtract 4 as minimum (also catered for in decoding)
  [(length - 4 << 2) + 3], u8a.subarray(0, length));
}

/**
 * @name compactAddLength
 * @description Adds a length prefix to the input value
 * @example
 * <BR>
 *
 * ```javascript
 * import { compactAddLength } from '@polkadot/util';
 *
 * console.log(compactAddLength(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))); // Uint8Array([4 << 2, 0xde, 0xad, 0xbe, 0xef])
 * ```
 */

function compactAddLength(input) {
  return u8aConcat(compactToU8a(input.length), input);
}

// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0

/** @internal */
function zeroPad(value) {
  return value.toString().padStart(2, '0');
}

function formatDate(date) {
  var year = date.getFullYear().toString();
  var month = zeroPad(date.getMonth() + 1);
  var day = zeroPad(date.getDate());
  var hour = zeroPad(date.getHours());
  var minute = zeroPad(date.getMinutes());
  var second = zeroPad(date.getSeconds());
  return "".concat(year, "-").concat(month, "-").concat(day, " ").concat(hour, ":").concat(minute, ":").concat(second);
}

var maybeJSBI$o = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
var logTo = {
  debug: 'log',
  error: 'error',
  log: 'log',
  warn: 'warn'
};

function formatOther(value) {
  if (value && isObject(value) && maybeJSBI$o.equal(value.constructor, Object)) {
    var result = {};

    for (var _i = 0, _Object$keys = Object.keys(value); _i < _Object$keys.length; _i++) {
      var k = _Object$keys[_i];
      result[k] = loggerFormat(value[k]);
    }

    return result;
  }

  return value;
}

function loggerFormat(value) {
  if (Array.isArray(value)) {
    return value.map(loggerFormat);
  } else if (isBn(value)) {
    return value.toString();
  } else if (isU8a(value) || isBuffer(value)) {
    return u8aToHex(u8aToU8a(value));
  }

  return formatOther(value);
}

function formatWithLength(maxLength) {
  return function (v) {
    if (maxLength <= 0) {
      return v;
    }

    var r = "".concat(v);
    return maybeJSBI$o.lessThan(r.length, maxLength) ? v : "".concat(r.substr(0, maxLength), " ...");
  };
}

function apply(log, type, values) {
  var _console;

  var maxSize = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : -1;

  if (values.length === 1 && isFunction(values[0])) {
    var fnResult = values[0]();
    return apply(log, type, Array.isArray(fnResult) ? fnResult : [fnResult], maxSize);
  }

  (_console = console)[logTo[log]].apply(_console, [formatDate(new Date()), type].concat(_toConsumableArray(values.map(loggerFormat).map(formatWithLength(maxSize)))));
}

function noop() {// noop
}

function isDebugOn(e, type) {
  return !!e && (e === '*' || maybeJSBI$o.equal(type, e) || e.endsWith('*') && type.startsWith(e.slice(0, -1)));
}

function isDebugOff(e, type) {
  return !!e && e.startsWith('-') && (maybeJSBI$o.equal(type, e.slice(1)) || e.endsWith('*') && type.startsWith(e.slice(1, -1)));
}

function getDebugFlag(env, type) {
  var flag = false;

  var _iterator = _createForOfIteratorHelper(env),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var e = _step.value;

      if (isDebugOn(e, type)) {
        flag = true;
      } else if (isDebugOff(e, type)) {
        flag = false;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return flag;
}

function parseEnv(type) {
  var env = (hasProcess ? process : {}).env || {};
  var maxSize = parseInt(env.DEBUG_MAX || '-1', 10);
  return [getDebugFlag((env.DEBUG || '').toLowerCase().split(','), type), isNaN(maxSize) ? -1 : maxSize];
}
/**
 * @name Logger
 * @summary Creates a consistent log interface for messages
 * @description
 * Returns a `Logger` that has `.log`, `.error`, `.warn` and `.debug` (controlled with environment `DEBUG=typeA,typeB`) methods. Logging is done with a consistent prefix (type of logger, date) followed by the actual message using the underlying console.
 * @example
 * <BR>
 *
 * ```javascript
 * import { logger } from '@polkadot';
 *
 * const l = logger('test');
 * ```
 */


function logger(_type) {
  var type = "".concat(_type.toUpperCase(), ":").padStart(16);

  var _parseEnv = parseEnv(_type.toLowerCase()),
      _parseEnv2 = _slicedToArray(_parseEnv, 2),
      isDebug = _parseEnv2[0],
      maxSize = _parseEnv2[1];

  return {
    debug: isDebug ? function () {
      for (var _len = arguments.length, values = new Array(_len), _key = 0; _key < _len; _key++) {
        values[_key] = arguments[_key];
      }

      return apply('debug', type, values, maxSize);
    } : noop,
    error: function error() {
      for (var _len2 = arguments.length, values = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        values[_key2] = arguments[_key2];
      }

      return apply('error', type, values);
    },
    log: function log() {
      for (var _len3 = arguments.length, values = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        values[_key3] = arguments[_key3];
      }

      return apply('log', type, values);
    },
    noop: noop,
    warn: function warn() {
      for (var _len4 = arguments.length, values = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        values[_key4] = arguments[_key4];
      }

      return apply('warn', type, values);
    }
  };
}

// Copyright 2017-2022 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Do not edit, auto-generated by @polkadot/dev
var packageInfo$1 = {
  name: '@polkadot/util-crypto',
  path: require('url').pathToFileURL(__filename).toString() ? new URL(require('url').pathToFileURL(__filename).toString()).pathname.substring(0, new URL(require('url').pathToFileURL(__filename).toString()).pathname.lastIndexOf('/') + 1) : 'auto',
  type: 'esm',
  version: '8.7.1'
};

var others = [packageInfo$2, packageInfo$1];

// Copyright 2017-2022 @polkadot/keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Do not edit, auto-generated by @polkadot/dev
var packageInfo = {
  name: '@polkadot/keyring',
  path: require('url').pathToFileURL(__filename).toString() ? new URL(require('url').pathToFileURL(__filename).toString()).pathname.substring(0, new URL(require('url').pathToFileURL(__filename).toString()).pathname.lastIndexOf('/') + 1) : 'auto',
  type: 'esm',
  version: '8.7.1'
};

detectPackage(packageInfo, null, others);

function getRandomValues(output) {
  var bytes = nodeCrypto.randomBytes(output.length);

  for (var i = 0; i < bytes.length; i++) {
    output[i] = bytes[i];
  }

  return output;
}

var maybeJSBI$n = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

var _0n$1 = JSBI.BigInt(0);

var _1n$1 = JSBI.BigInt(1);

var _2n$1 = JSBI.BigInt(2);

var _3n = JSBI.BigInt(3);

var _8n = JSBI.BigInt(8);

var POW_2_256 = JSBI.exponentiate(_2n$1, JSBI.BigInt(256));
var CURVE = {
  a: _0n$1,
  b: JSBI.BigInt(7),
  P: JSBI.subtract(JSBI.subtract(POW_2_256, JSBI.exponentiate(_2n$1, JSBI.BigInt(32))), JSBI.BigInt(977)),
  n: JSBI.subtract(POW_2_256, JSBI.BigInt('432420386565659656852420866394968145599')),
  h: _1n$1,
  Gx: JSBI.BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
  Gy: JSBI.BigInt('32670510020758816978083085130507043184471273380659243275938904335757337482424'),
  beta: JSBI.BigInt('0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee')
};

function weistrass(x) {
  var a = CURVE.a,
      b = CURVE.b;
  var x2 = mod(maybeJSBI$n.multiply(x, x));
  var x3 = mod(maybeJSBI$n.multiply(x2, x));
  return mod(maybeJSBI$n.add(maybeJSBI$n.add(x3, maybeJSBI$n.multiply(a, x)), b));
}

var USE_ENDOMORPHISM = maybeJSBI$n.equal(CURVE.a, _0n$1);

var JacobianPoint = /*#__PURE__*/function () {
  function JacobianPoint(x, y, z) {
    _classCallCheck(this, JacobianPoint);

    this.x = x;
    this.y = y;
    this.z = z;
  }

  _createClass(JacobianPoint, [{
    key: "equals",
    value: function equals(other) {
      if (!(other instanceof JacobianPoint)) throw new TypeError('JacobianPoint expected');
      var X1 = this.x,
          Y1 = this.y,
          Z1 = this.z;
      var X2 = other.x,
          Y2 = other.y,
          Z2 = other.z;
      var Z1Z1 = mod(maybeJSBI$n.exponentiate(Z1, _2n$1));
      var Z2Z2 = mod(maybeJSBI$n.exponentiate(Z2, _2n$1));
      var U1 = mod(maybeJSBI$n.multiply(X1, Z2Z2));
      var U2 = mod(maybeJSBI$n.multiply(X2, Z1Z1));
      var S1 = mod(maybeJSBI$n.multiply(mod(maybeJSBI$n.multiply(Y1, Z2)), Z2Z2));
      var S2 = mod(maybeJSBI$n.multiply(mod(maybeJSBI$n.multiply(Y2, Z1)), Z1Z1));
      return maybeJSBI$n.equal(U1, U2) && maybeJSBI$n.equal(S1, S2);
    }
  }, {
    key: "negate",
    value: function negate() {
      return new JacobianPoint(this.x, mod(maybeJSBI$n.unaryMinus(this.y)), this.z);
    }
  }, {
    key: "double",
    value: function double() {
      var X1 = this.x,
          Y1 = this.y,
          Z1 = this.z;
      var A = mod(maybeJSBI$n.exponentiate(X1, _2n$1));
      var B = mod(maybeJSBI$n.exponentiate(Y1, _2n$1));
      var C = mod(maybeJSBI$n.exponentiate(B, _2n$1));
      var D = mod(maybeJSBI$n.multiply(_2n$1, maybeJSBI$n.subtract(maybeJSBI$n.subtract(mod(maybeJSBI$n.exponentiate(maybeJSBI$n.add(X1, B), _2n$1)), A), C)));
      var E = mod(maybeJSBI$n.multiply(_3n, A));
      var F = mod(maybeJSBI$n.exponentiate(E, _2n$1));
      var X3 = mod(maybeJSBI$n.subtract(F, maybeJSBI$n.multiply(_2n$1, D)));
      var Y3 = mod(maybeJSBI$n.subtract(maybeJSBI$n.multiply(E, maybeJSBI$n.subtract(D, X3)), maybeJSBI$n.multiply(_8n, C)));
      var Z3 = mod(maybeJSBI$n.multiply(maybeJSBI$n.multiply(_2n$1, Y1), Z1));
      return new JacobianPoint(X3, Y3, Z3);
    }
  }, {
    key: "add",
    value: function add(other) {
      if (!(other instanceof JacobianPoint)) throw new TypeError('JacobianPoint expected');
      var X1 = this.x,
          Y1 = this.y,
          Z1 = this.z;
      var X2 = other.x,
          Y2 = other.y,
          Z2 = other.z;
      if (maybeJSBI$n.equal(X2, _0n$1) || maybeJSBI$n.equal(Y2, _0n$1)) return this;
      if (maybeJSBI$n.equal(X1, _0n$1) || maybeJSBI$n.equal(Y1, _0n$1)) return other;
      var Z1Z1 = mod(maybeJSBI$n.exponentiate(Z1, _2n$1));
      var Z2Z2 = mod(maybeJSBI$n.exponentiate(Z2, _2n$1));
      var U1 = mod(maybeJSBI$n.multiply(X1, Z2Z2));
      var U2 = mod(maybeJSBI$n.multiply(X2, Z1Z1));
      var S1 = mod(maybeJSBI$n.multiply(mod(maybeJSBI$n.multiply(Y1, Z2)), Z2Z2));
      var S2 = mod(maybeJSBI$n.multiply(mod(maybeJSBI$n.multiply(Y2, Z1)), Z1Z1));
      var H = mod(maybeJSBI$n.subtract(U2, U1));
      var r = mod(maybeJSBI$n.subtract(S2, S1));

      if (maybeJSBI$n.equal(H, _0n$1)) {
        if (maybeJSBI$n.equal(r, _0n$1)) {
          return this["double"]();
        } else {
          return JacobianPoint.ZERO;
        }
      }

      var HH = mod(maybeJSBI$n.exponentiate(H, _2n$1));
      var HHH = mod(maybeJSBI$n.multiply(H, HH));
      var V = mod(maybeJSBI$n.multiply(U1, HH));
      var X3 = mod(maybeJSBI$n.subtract(maybeJSBI$n.subtract(maybeJSBI$n.exponentiate(r, _2n$1), HHH), maybeJSBI$n.multiply(_2n$1, V)));
      var Y3 = mod(maybeJSBI$n.subtract(maybeJSBI$n.multiply(r, maybeJSBI$n.subtract(V, X3)), maybeJSBI$n.multiply(S1, HHH)));
      var Z3 = mod(maybeJSBI$n.multiply(maybeJSBI$n.multiply(Z1, Z2), H));
      return new JacobianPoint(X3, Y3, Z3);
    }
  }, {
    key: "subtract",
    value: function subtract(other) {
      return this.add(other.negate());
    }
  }, {
    key: "multiplyUnsafe",
    value: function multiplyUnsafe(scalar) {
      var n = normalizeScalar(scalar);
      var P0 = JacobianPoint.ZERO;
      if (maybeJSBI$n.equal(n, _0n$1)) return P0;
      if (maybeJSBI$n.equal(n, _1n$1)) return this;

      if (!USE_ENDOMORPHISM) {
        var p = P0;

        var _d = this;

        while (maybeJSBI$n.greaterThan(n, _0n$1)) {
          if (maybeJSBI$n.bitwiseAnd(n, _1n$1)) p = p.add(_d);
          _d = _d["double"]();
          n = maybeJSBI$n.signedRightShift(n, _1n$1);
        }

        return p;
      }

      var _splitScalarEndo = splitScalarEndo(n),
          k1neg = _splitScalarEndo.k1neg,
          k1 = _splitScalarEndo.k1,
          k2neg = _splitScalarEndo.k2neg,
          k2 = _splitScalarEndo.k2;

      var k1p = P0;
      var k2p = P0;
      var d = this;

      while (maybeJSBI$n.greaterThan(k1, _0n$1) || maybeJSBI$n.greaterThan(k2, _0n$1)) {
        if (maybeJSBI$n.bitwiseAnd(k1, _1n$1)) k1p = k1p.add(d);
        if (maybeJSBI$n.bitwiseAnd(k2, _1n$1)) k2p = k2p.add(d);
        d = d["double"]();
        k1 = maybeJSBI$n.signedRightShift(k1, _1n$1);
        k2 = maybeJSBI$n.signedRightShift(k2, _1n$1);
      }

      if (k1neg) k1p = k1p.negate();
      if (k2neg) k2p = k2p.negate();
      k2p = new JacobianPoint(mod(maybeJSBI$n.multiply(k2p.x, CURVE.beta)), k2p.y, k2p.z);
      return k1p.add(k2p);
    }
  }, {
    key: "precomputeWindow",
    value: function precomputeWindow(W) {
      var windows = USE_ENDOMORPHISM ? 128 / W + 1 : 256 / W + 1;
      var points = [];
      var p = this;
      var base = p;

      for (var window = 0; window < windows; window++) {
        base = p;
        points.push(base);

        for (var i = 1; i < 2 ** (W - 1); i++) {
          base = base.add(p);
          points.push(base);
        }

        p = base["double"]();
      }

      return points;
    }
  }, {
    key: "wNAF",
    value: function wNAF(n, affinePoint) {
      if (!affinePoint && this.equals(JacobianPoint.BASE)) affinePoint = Point.BASE;
      var W = affinePoint && affinePoint._WINDOW_SIZE || 1;

      if (256 % W) {
        throw new Error('Point#wNAF: Invalid precomputation window, must be power of 2');
      }

      var precomputes = affinePoint && pointPrecomputes.get(affinePoint);

      if (!precomputes) {
        precomputes = this.precomputeWindow(W);

        if (affinePoint && W !== 1) {
          precomputes = JacobianPoint.normalizeZ(precomputes);
          pointPrecomputes.set(affinePoint, precomputes);
        }
      }

      var p = JacobianPoint.ZERO;
      var f = JacobianPoint.ZERO;
      var windows = 1 + (USE_ENDOMORPHISM ? 128 / W : 256 / W);
      var windowSize = 2 ** (W - 1);
      var mask = JSBI.BigInt(2 ** W - 1);
      var maxNumber = 2 ** W;
      var shiftBy = JSBI.BigInt(W);

      for (var window = 0; window < windows; window++) {
        var offset = window * windowSize;
        var wbits = maybeJSBI$n.toNumber(maybeJSBI$n.bitwiseAnd(n, mask));
        n = maybeJSBI$n.signedRightShift(n, shiftBy);

        if (wbits > windowSize) {
          wbits -= maxNumber;
          n = maybeJSBI$n.add(n, _1n$1);
        }

        if (wbits === 0) {
          var pr = precomputes[offset];
          if (window % 2) pr = pr.negate();
          f = f.add(pr);
        } else {
          var cached = precomputes[offset + Math.abs(wbits) - 1];
          if (wbits < 0) cached = cached.negate();
          p = p.add(cached);
        }
      }

      return {
        p: p,
        f: f
      };
    }
  }, {
    key: "multiply",
    value: function multiply(scalar, affinePoint) {
      var n = normalizeScalar(scalar);
      var point;
      var fake;

      if (USE_ENDOMORPHISM) {
        var _splitScalarEndo2 = splitScalarEndo(n),
            k1neg = _splitScalarEndo2.k1neg,
            k1 = _splitScalarEndo2.k1,
            k2neg = _splitScalarEndo2.k2neg,
            k2 = _splitScalarEndo2.k2;

        var _this$wNAF = this.wNAF(k1, affinePoint),
            k1p = _this$wNAF.p,
            f1p = _this$wNAF.f;

        var _this$wNAF2 = this.wNAF(k2, affinePoint),
            k2p = _this$wNAF2.p,
            f2p = _this$wNAF2.f;

        if (k1neg) k1p = k1p.negate();
        if (k2neg) k2p = k2p.negate();
        k2p = new JacobianPoint(mod(maybeJSBI$n.multiply(k2p.x, CURVE.beta)), k2p.y, k2p.z);
        point = k1p.add(k2p);
        fake = f1p.add(f2p);
      } else {
        var _this$wNAF3 = this.wNAF(n, affinePoint),
            p = _this$wNAF3.p,
            f = _this$wNAF3.f;

        point = p;
        fake = f;
      }

      return JacobianPoint.normalizeZ([point, fake])[0];
    }
  }, {
    key: "toAffine",
    value: function toAffine() {
      var invZ = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : invert(this.z);
      var x = this.x,
          y = this.y,
          z = this.z;
      var iz1 = invZ;
      var iz2 = mod(maybeJSBI$n.multiply(iz1, iz1));
      var iz3 = mod(maybeJSBI$n.multiply(iz2, iz1));
      var ax = mod(maybeJSBI$n.multiply(x, iz2));
      var ay = mod(maybeJSBI$n.multiply(y, iz3));
      var zz = mod(maybeJSBI$n.multiply(z, iz1));
      if (maybeJSBI$n.notEqual(zz, _1n$1)) throw new Error('invZ was invalid');
      return new Point(ax, ay);
    }
  }], [{
    key: "fromAffine",
    value: function fromAffine(p) {
      if (!(p instanceof Point)) {
        throw new TypeError('JacobianPoint#fromAffine: expected Point');
      }

      return new JacobianPoint(p.x, p.y, _1n$1);
    }
  }, {
    key: "toAffineBatch",
    value: function toAffineBatch(points) {
      var toInv = invertBatch(points.map(function (p) {
        return p.z;
      }));
      return points.map(function (p, i) {
        return p.toAffine(toInv[i]);
      });
    }
  }, {
    key: "normalizeZ",
    value: function normalizeZ(points) {
      return JacobianPoint.toAffineBatch(points).map(JacobianPoint.fromAffine);
    }
  }]);

  return JacobianPoint;
}();

JacobianPoint.BASE = new JacobianPoint(CURVE.Gx, CURVE.Gy, _1n$1);
JacobianPoint.ZERO = new JacobianPoint(_0n$1, _1n$1, _0n$1);
var pointPrecomputes = new WeakMap();
var Point = /*#__PURE__*/function () {
  function Point(x, y) {
    _classCallCheck(this, Point);

    this.x = x;
    this.y = y;
  }

  _createClass(Point, [{
    key: "_setWindowSize",
    value: function _setWindowSize(windowSize) {
      this._WINDOW_SIZE = windowSize;
      pointPrecomputes["delete"](this);
    }
  }, {
    key: "toRawBytes",
    value: function toRawBytes() {
      var isCompressed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      return hexToBytes(this.toHex(isCompressed));
    }
  }, {
    key: "toHex",
    value: function toHex() {
      var isCompressed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var x = numTo32bStr(this.x);

      if (isCompressed) {
        var prefix = maybeJSBI$n.bitwiseAnd(this.y, _1n$1) ? '03' : '02';
        return "".concat(prefix).concat(x);
      } else {
        return "04".concat(x).concat(numTo32bStr(this.y));
      }
    }
  }, {
    key: "toHexX",
    value: function toHexX() {
      return this.toHex(true).slice(2);
    }
  }, {
    key: "toRawX",
    value: function toRawX() {
      return this.toRawBytes(true).slice(1);
    }
  }, {
    key: "assertValidity",
    value: function assertValidity() {
      var msg = 'Point is not on elliptic curve';
      var x = this.x,
          y = this.y;
      if (!isValidFieldElement(x) || !isValidFieldElement(y)) throw new Error(msg);
      var left = mod(maybeJSBI$n.multiply(y, y));
      var right = weistrass(x);
      if (maybeJSBI$n.notEqual(mod(maybeJSBI$n.subtract(left, right)), _0n$1)) throw new Error(msg);
    }
  }, {
    key: "equals",
    value: function equals(other) {
      return maybeJSBI$n.equal(this.x, other.x) && maybeJSBI$n.equal(this.y, other.y);
    }
  }, {
    key: "negate",
    value: function negate() {
      return new Point(this.x, mod(maybeJSBI$n.unaryMinus(this.y)));
    }
  }, {
    key: "double",
    value: function double() {
      return JacobianPoint.fromAffine(this)["double"]().toAffine();
    }
  }, {
    key: "add",
    value: function add(other) {
      return JacobianPoint.fromAffine(this).add(JacobianPoint.fromAffine(other)).toAffine();
    }
  }, {
    key: "subtract",
    value: function subtract(other) {
      return this.add(other.negate());
    }
  }, {
    key: "multiply",
    value: function multiply(scalar) {
      return JacobianPoint.fromAffine(this).multiply(scalar, this).toAffine();
    }
  }, {
    key: "multiplyAndAddUnsafe",
    value: function multiplyAndAddUnsafe(Q, a, b) {
      var P = JacobianPoint.fromAffine(this);
      var aP = P.multiply(a);
      var bQ = JacobianPoint.fromAffine(Q).multiplyUnsafe(b);
      var sum = aP.add(bQ);
      return sum.equals(JacobianPoint.ZERO) ? undefined : sum.toAffine();
    }
  }], [{
    key: "fromCompressedHex",
    value: function fromCompressedHex(bytes) {
      var isShort = bytes.length === 32;
      var x = bytesToNumber(isShort ? bytes : bytes.subarray(1));
      if (!isValidFieldElement(x)) throw new Error('Point is not on curve');
      var y2 = weistrass(x);
      var y = sqrtMod(y2);
      var isYOdd = maybeJSBI$n.equal(maybeJSBI$n.bitwiseAnd(y, _1n$1), _1n$1);

      if (isShort) {
        if (isYOdd) y = mod(maybeJSBI$n.unaryMinus(y));
      } else {
        var isFirstByteOdd = (bytes[0] & 1) === 1;
        if (isFirstByteOdd !== isYOdd) y = mod(maybeJSBI$n.unaryMinus(y));
      }

      var point = new Point(x, y);
      point.assertValidity();
      return point;
    }
  }, {
    key: "fromUncompressedHex",
    value: function fromUncompressedHex(bytes) {
      var x = bytesToNumber(bytes.subarray(1, 33));
      var y = bytesToNumber(bytes.subarray(33, 65));
      var point = new Point(x, y);
      point.assertValidity();
      return point;
    }
  }, {
    key: "fromHex",
    value: function fromHex(hex) {
      var bytes = ensureBytes(hex);
      var len = bytes.length;
      var header = bytes[0];

      if (len === 32 || len === 33 && (header === 0x02 || header === 0x03)) {
        return this.fromCompressedHex(bytes);
      }

      if (len === 65 && header === 0x04) return this.fromUncompressedHex(bytes);
      throw new Error("Point.fromHex: received invalid point. Expected 32-33 compressed bytes or 65 uncompressed bytes, not ".concat(len));
    }
  }, {
    key: "fromPrivateKey",
    value: function fromPrivateKey(privateKey) {
      return Point.BASE.multiply(normalizePrivateKey(privateKey));
    }
  }, {
    key: "fromSignature",
    value: function fromSignature(msgHash, signature, recovery) {
      msgHash = ensureBytes(msgHash);
      var h = truncateHash(msgHash);

      var _normalizeSignature = normalizeSignature(signature),
          r = _normalizeSignature.r,
          s = _normalizeSignature.s;

      if (recovery !== 0 && recovery !== 1) {
        throw new Error('Cannot recover signature: invalid recovery bit');
      }

      if (maybeJSBI$n.equal(h, _0n$1)) throw new Error('Cannot recover signature: msgHash cannot be 0');
      var prefix = recovery & 1 ? '03' : '02';
      var R = Point.fromHex(prefix + numTo32bStr(r));
      var n = CURVE.n;
      var rinv = invert(r, n);
      var u1 = mod(maybeJSBI$n.multiply(maybeJSBI$n.unaryMinus(h), rinv), n);
      var u2 = mod(maybeJSBI$n.multiply(s, rinv), n);
      var Q = Point.BASE.multiplyAndAddUnsafe(R, u1, u2);
      if (!Q) throw new Error('Cannot recover signature: point at infinify');
      Q.assertValidity();
      return Q;
    }
  }]);

  return Point;
}();
Point.BASE = new Point(CURVE.Gx, CURVE.Gy);
Point.ZERO = new Point(_0n$1, _0n$1);

function sliceDER(s) {
  return Number.parseInt(s[0], 16) >= 8 ? '00' + s : s;
}

function parseDERInt(data) {
  if (data.length < 2 || data[0] !== 0x02) {
    throw new Error("Invalid signature integer tag: ".concat(bytesToHex(data)));
  }

  var len = data[1];
  var res = data.subarray(2, len + 2);

  if (!len || maybeJSBI$n.notEqual(res.length, len)) {
    throw new Error("Invalid signature integer: wrong length");
  }

  if (res[0] === 0x00 && res[1] <= 0x7f) {
    throw new Error('Invalid signature integer: trailing length');
  }

  return {
    data: bytesToNumber(res),
    left: data.subarray(len + 2)
  };
}

function parseDERSignature(data) {
  if (data.length < 2 || data[0] != 0x30) {
    throw new Error("Invalid signature tag: ".concat(bytesToHex(data)));
  }

  if (data[1] !== data.length - 2) {
    throw new Error('Invalid signature: incorrect length');
  }

  var _parseDERInt = parseDERInt(data.subarray(2)),
      r = _parseDERInt.data,
      sBytes = _parseDERInt.left;

  var _parseDERInt2 = parseDERInt(sBytes),
      s = _parseDERInt2.data,
      rBytesLeft = _parseDERInt2.left;

  if (rBytesLeft.length) {
    throw new Error("Invalid signature: left bytes after parsing: ".concat(bytesToHex(rBytesLeft)));
  }

  return {
    r: r,
    s: s
  };
}

var Signature = /*#__PURE__*/function () {
  function Signature(r, s) {
    _classCallCheck(this, Signature);

    this.r = r;
    this.s = s;
    this.assertValidity();
  }

  _createClass(Signature, [{
    key: "assertValidity",
    value: function assertValidity() {
      var r = this.r,
          s = this.s;
      if (!isWithinCurveOrder(r)) throw new Error('Invalid Signature: r must be 0 < r < n');
      if (!isWithinCurveOrder(s)) throw new Error('Invalid Signature: s must be 0 < s < n');
    }
  }, {
    key: "hasHighS",
    value: function hasHighS() {
      var HALF = maybeJSBI$n.signedRightShift(CURVE.n, _1n$1);
      return maybeJSBI$n.greaterThan(this.s, HALF);
    }
  }, {
    key: "normalizeS",
    value: function normalizeS() {
      return this.hasHighS() ? new Signature(this.r, maybeJSBI$n.subtract(CURVE.n, this.s)) : this;
    }
  }, {
    key: "toDERRawBytes",
    value: function toDERRawBytes() {
      var isCompressed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      return hexToBytes(this.toDERHex(isCompressed));
    }
  }, {
    key: "toDERHex",
    value: function toDERHex() {
      var isCompressed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var sHex = sliceDER(numberToHexUnpadded(this.s));
      if (isCompressed) return sHex;
      var rHex = sliceDER(numberToHexUnpadded(this.r));
      var rLen = numberToHexUnpadded(rHex.length / 2);
      var sLen = numberToHexUnpadded(sHex.length / 2);
      var length = numberToHexUnpadded(rHex.length / 2 + sHex.length / 2 + 4);
      return "30".concat(length, "02").concat(rLen).concat(rHex, "02").concat(sLen).concat(sHex);
    }
  }, {
    key: "toRawBytes",
    value: function toRawBytes() {
      return this.toDERRawBytes();
    }
  }, {
    key: "toHex",
    value: function toHex() {
      return this.toDERHex();
    }
  }, {
    key: "toCompactRawBytes",
    value: function toCompactRawBytes() {
      return hexToBytes(this.toCompactHex());
    }
  }, {
    key: "toCompactHex",
    value: function toCompactHex() {
      return maybeJSBI$n.add(numTo32bStr(this.r), numTo32bStr(this.s));
    }
  }], [{
    key: "fromCompact",
    value: function fromCompact(hex) {
      var arr = isUint8a(hex);
      var name = 'Signature.fromCompact';
      if (typeof hex !== 'string' && !arr) throw new TypeError("".concat(name, ": Expected string or Uint8Array"));
      var str = arr ? bytesToHex(hex) : hex;
      if (str.length !== 128) throw new Error("".concat(name, ": Expected 64-byte hex"));
      return new Signature(hexToNumber(str.slice(0, 64)), hexToNumber(str.slice(64, 128)));
    }
  }, {
    key: "fromDER",
    value: function fromDER(hex) {
      var arr = isUint8a(hex);
      if (typeof hex !== 'string' && !arr) throw new TypeError("Signature.fromDER: Expected string or Uint8Array");

      var _parseDERSignature = parseDERSignature(arr ? hex : hexToBytes(hex)),
          r = _parseDERSignature.r,
          s = _parseDERSignature.s;

      return new Signature(r, s);
    }
  }, {
    key: "fromHex",
    value: function fromHex(hex) {
      return this.fromDER(hex);
    }
  }]);

  return Signature;
}();

function concatBytes() {
  for (var _len = arguments.length, arrays = new Array(_len), _key = 0; _key < _len; _key++) {
    arrays[_key] = arguments[_key];
  }

  if (!arrays.every(isUint8a)) throw new Error('Uint8Array list expected');
  if (arrays.length === 1) return arrays[0];
  var length = arrays.reduce(function (a, arr) {
    return maybeJSBI$n.add(a, arr.length);
  }, 0);
  var result = new Uint8Array(length);

  for (var i = 0, pad = 0; i < arrays.length; i++) {
    var arr = arrays[i];
    result.set(arr, pad);
    pad += arr.length;
  }

  return result;
}

function isUint8a(bytes) {
  return bytes instanceof Uint8Array;
}

var hexes = Array.from({
  length: 256
}, function (v, i) {
  return i.toString(16).padStart(2, '0');
});

function bytesToHex(uint8a) {
  if (!(uint8a instanceof Uint8Array)) throw new Error('Expected Uint8Array');
  var hex = '';

  for (var i = 0; i < uint8a.length; i++) {
    hex += hexes[uint8a[i]];
  }

  return hex;
}

function numTo32bStr(num) {
  if (maybeJSBI$n.greaterThan(num, POW_2_256)) throw new Error('Expected number < 2^256');
  return num.toString(16).padStart(64, '0');
}

function numTo32b(num) {
  return hexToBytes(numTo32bStr(num));
}

function numberToHexUnpadded(num) {
  var hex = num.toString(16);
  return hex.length & 1 ? "0".concat(hex) : hex;
}

function hexToNumber(hex) {
  if (typeof hex !== 'string') {
    throw new TypeError('hexToNumber: expected string, got ' + _typeof(hex));
  }

  return JSBI.BigInt("0x".concat(hex));
}

function hexToBytes(hex) {
  if (typeof hex !== 'string') {
    throw new TypeError('hexToBytes: expected string, got ' + _typeof(hex));
  }

  if (hex.length % 2) throw new Error('hexToBytes: received invalid unpadded hex' + hex.length);
  var array = new Uint8Array(hex.length / 2);

  for (var i = 0; i < array.length; i++) {
    var j = i * 2;
    var hexByte = hex.slice(j, j + 2);

    var _byte = Number.parseInt(hexByte, 16);

    if (Number.isNaN(_byte) || _byte < 0) throw new Error('Invalid byte sequence');
    array[i] = _byte;
  }

  return array;
}

function bytesToNumber(bytes) {
  return hexToNumber(bytesToHex(bytes));
}

function ensureBytes(hex) {
  return hex instanceof Uint8Array ? Uint8Array.from(hex) : hexToBytes(hex);
}

function normalizeScalar(num) {
  if (typeof num === 'number' && Number.isSafeInteger(num) && num > 0) return JSBI.BigInt(num);
  if (typeof num === 'bigint' && isWithinCurveOrder(num)) return num;
  throw new TypeError('Expected valid private scalar: 0 < scalar < curve.n');
}

function mod(a) {
  var b = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : CURVE.P;
  var result = maybeJSBI$n.remainder(a, b);
  return maybeJSBI$n.greaterThanOrEqual(result, _0n$1) ? result : maybeJSBI$n.add(b, result);
}

function pow2(x, power) {
  var P = CURVE.P;
  var res = x;

  while (maybeJSBI$n.greaterThan((_x = power, power = maybeJSBI$n.subtract(power, maybeJSBI$n.BigInt(1)), _x), _0n$1)) {
    var _x;

    res = maybeJSBI$n.multiply(res, res);
    res = maybeJSBI$n.remainder(res, P);
  }

  return res;
}

function sqrtMod(x) {
  var P = CURVE.P;

  var _6n = JSBI.BigInt(6);

  var _11n = JSBI.BigInt(11);

  var _22n = JSBI.BigInt(22);

  var _23n = JSBI.BigInt(23);

  var _44n = JSBI.BigInt(44);

  var _88n = JSBI.BigInt(88);

  var b2 = maybeJSBI$n.remainder(maybeJSBI$n.multiply(maybeJSBI$n.multiply(x, x), x), P);
  var b3 = maybeJSBI$n.remainder(maybeJSBI$n.multiply(maybeJSBI$n.multiply(b2, b2), x), P);
  var b6 = maybeJSBI$n.remainder(maybeJSBI$n.multiply(pow2(b3, _3n), b3), P);
  var b9 = maybeJSBI$n.remainder(maybeJSBI$n.multiply(pow2(b6, _3n), b3), P);
  var b11 = maybeJSBI$n.remainder(maybeJSBI$n.multiply(pow2(b9, _2n$1), b2), P);
  var b22 = maybeJSBI$n.remainder(maybeJSBI$n.multiply(pow2(b11, _11n), b11), P);
  var b44 = maybeJSBI$n.remainder(maybeJSBI$n.multiply(pow2(b22, _22n), b22), P);
  var b88 = maybeJSBI$n.remainder(maybeJSBI$n.multiply(pow2(b44, _44n), b44), P);
  var b176 = maybeJSBI$n.remainder(maybeJSBI$n.multiply(pow2(b88, _88n), b88), P);
  var b220 = maybeJSBI$n.remainder(maybeJSBI$n.multiply(pow2(b176, _44n), b44), P);
  var b223 = maybeJSBI$n.remainder(maybeJSBI$n.multiply(pow2(b220, _3n), b3), P);
  var t1 = maybeJSBI$n.remainder(maybeJSBI$n.multiply(pow2(b223, _23n), b22), P);
  var t2 = maybeJSBI$n.remainder(maybeJSBI$n.multiply(pow2(t1, _6n), b2), P);
  return pow2(t2, _2n$1);
}

function invert(number) {
  var modulo = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : CURVE.P;

  if (maybeJSBI$n.equal(number, _0n$1) || maybeJSBI$n.lessThanOrEqual(modulo, _0n$1)) {
    throw new Error("invert: expected positive integers, got n=".concat(number, " mod=").concat(modulo));
  }

  var a = mod(number, modulo);
  var b = modulo;
  var x = _0n$1,
      y = _1n$1,
      u = _1n$1,
      v = _0n$1;

  while (maybeJSBI$n.notEqual(a, _0n$1)) {
    var q = maybeJSBI$n.divide(b, a);
    var r = maybeJSBI$n.remainder(b, a);
    var m = maybeJSBI$n.subtract(x, maybeJSBI$n.multiply(u, q));
    var n = maybeJSBI$n.subtract(y, maybeJSBI$n.multiply(v, q));
    b = a, a = r, x = u, y = v, u = m, v = n;
  }

  var gcd = b;
  if (maybeJSBI$n.notEqual(gcd, _1n$1)) throw new Error('invert: does not exist');
  return mod(x, modulo);
}

function invertBatch(nums) {
  var p = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : CURVE.P;
  var scratch = new Array(nums.length);
  var lastMultiplied = nums.reduce(function (acc, num, i) {
    if (maybeJSBI$n.equal(num, _0n$1)) return acc;
    scratch[i] = acc;
    return mod(maybeJSBI$n.multiply(acc, num), p);
  }, _1n$1);
  var inverted = invert(lastMultiplied, p);
  nums.reduceRight(function (acc, num, i) {
    if (maybeJSBI$n.equal(num, _0n$1)) return acc;
    scratch[i] = mod(maybeJSBI$n.multiply(acc, scratch[i]), p);
    return mod(maybeJSBI$n.multiply(acc, num), p);
  }, inverted);
  return scratch;
}

var divNearest = function divNearest(a, b) {
  return maybeJSBI$n.divide(maybeJSBI$n.add(a, maybeJSBI$n.divide(b, _2n$1)), b);
};

var POW_2_128 = JSBI.exponentiate(_2n$1, JSBI.BigInt(128));

function splitScalarEndo(k) {
  var n = CURVE.n;
  var a1 = JSBI.BigInt('0x3086d221a7d46bcde86c90e49284eb15');
  var b1 = JSBI.multiply(maybeJSBI$n.unaryMinus(_1n$1), JSBI.BigInt('0xe4437ed6010e88286f547fa90abfe4c3'));
  var a2 = JSBI.BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8');
  var b2 = a1;
  var c1 = divNearest(maybeJSBI$n.multiply(b2, k), n);
  var c2 = divNearest(maybeJSBI$n.multiply(maybeJSBI$n.unaryMinus(b1), k), n);
  var k1 = mod(maybeJSBI$n.subtract(maybeJSBI$n.subtract(k, maybeJSBI$n.multiply(c1, a1)), maybeJSBI$n.multiply(c2, a2)), n);
  var k2 = mod(maybeJSBI$n.subtract(maybeJSBI$n.multiply(maybeJSBI$n.unaryMinus(c1), b1), maybeJSBI$n.multiply(c2, b2)), n);
  var k1neg = maybeJSBI$n.greaterThan(k1, POW_2_128);
  var k2neg = maybeJSBI$n.greaterThan(k2, POW_2_128);
  if (k1neg) k1 = maybeJSBI$n.subtract(n, k1);
  if (k2neg) k2 = maybeJSBI$n.subtract(n, k2);

  if (maybeJSBI$n.greaterThan(k1, POW_2_128) || maybeJSBI$n.greaterThan(k2, POW_2_128)) {
    throw new Error('splitScalarEndo: Endomorphism failed, k=' + k);
  }

  return {
    k1neg: k1neg,
    k1: k1,
    k2neg: k2neg,
    k2: k2
  };
}

function truncateHash(hash) {
  var n = CURVE.n;
  var byteLength = hash.length;
  var delta = byteLength * 8 - 256;
  var h = bytesToNumber(hash);
  if (delta > 0) h = JSBI.signedRightShift(h, JSBI.BigInt(delta));
  if (maybeJSBI$n.greaterThanOrEqual(h, n)) h = maybeJSBI$n.subtract(h, n);
  return h;
}

var HmacDrbg = /*#__PURE__*/function () {
  function HmacDrbg() {
    _classCallCheck(this, HmacDrbg);

    this.v = new Uint8Array(32).fill(1);
    this.k = new Uint8Array(32).fill(0);
    this.counter = 0;
  }

  _createClass(HmacDrbg, [{
    key: "hmac",
    value: function hmac() {
      for (var _len2 = arguments.length, values = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        values[_key2] = arguments[_key2];
      }

      return utils.hmacSha256.apply(utils, [this.k].concat(values));
    }
  }, {
    key: "hmacSync",
    value: function hmacSync() {
      if (typeof utils.hmacSha256Sync !== 'function') throw new Error('utils.hmacSha256Sync is undefined, you need to set it');

      for (var _len3 = arguments.length, values = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        values[_key3] = arguments[_key3];
      }

      var res = utils.hmacSha256Sync.apply(utils, [this.k].concat(values));
      if (res instanceof Promise) throw new Error('To use sync sign(), ensure utils.hmacSha256 is sync');
      return res;
    }
  }, {
    key: "incr",
    value: function incr() {
      if (this.counter >= 1000) {
        throw new Error('Tried 1,000 k values for sign(), all were invalid');
      }

      this.counter += 1;
    }
  }, {
    key: "reseed",
    value: function () {
      var _reseed = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        var seed,
            _args = arguments;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                seed = _args.length > 0 && _args[0] !== undefined ? _args[0] : new Uint8Array();
                _context.next = 3;
                return this.hmac(this.v, Uint8Array.from([0x00]), seed);

              case 3:
                this.k = _context.sent;
                _context.next = 6;
                return this.hmac(this.v);

              case 6:
                this.v = _context.sent;

                if (!(seed.length === 0)) {
                  _context.next = 9;
                  break;
                }

                return _context.abrupt("return");

              case 9:
                _context.next = 11;
                return this.hmac(this.v, Uint8Array.from([0x01]), seed);

              case 11:
                this.k = _context.sent;
                _context.next = 14;
                return this.hmac(this.v);

              case 14:
                this.v = _context.sent;

              case 15:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function reseed() {
        return _reseed.apply(this, arguments);
      }

      return reseed;
    }()
  }, {
    key: "reseedSync",
    value: function reseedSync() {
      var seed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Uint8Array();
      this.k = this.hmacSync(this.v, Uint8Array.from([0x00]), seed);
      this.v = this.hmacSync(this.v);
      if (seed.length === 0) return;
      this.k = this.hmacSync(this.v, Uint8Array.from([0x01]), seed);
      this.v = this.hmacSync(this.v);
    }
  }, {
    key: "generate",
    value: function () {
      var _generate = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                this.incr();
                _context2.next = 3;
                return this.hmac(this.v);

              case 3:
                this.v = _context2.sent;
                return _context2.abrupt("return", this.v);

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function generate() {
        return _generate.apply(this, arguments);
      }

      return generate;
    }()
  }, {
    key: "generateSync",
    value: function generateSync() {
      this.incr();
      this.v = this.hmacSync(this.v);
      return this.v;
    }
  }]);

  return HmacDrbg;
}();

function isWithinCurveOrder(num) {
  return maybeJSBI$n.lessThan(_0n$1, num) && maybeJSBI$n.lessThan(num, CURVE.n);
}

function isValidFieldElement(num) {
  return maybeJSBI$n.lessThan(_0n$1, num) && maybeJSBI$n.lessThan(num, CURVE.P);
}

function kmdToSig(kBytes, m, d) {
  var k = bytesToNumber(kBytes);
  if (!isWithinCurveOrder(k)) return;
  var n = CURVE.n;
  var q = Point.BASE.multiply(k);
  var r = mod(q.x, n);
  if (maybeJSBI$n.equal(r, _0n$1)) return;
  var s = mod(maybeJSBI$n.multiply(invert(k, n), mod(maybeJSBI$n.add(m, maybeJSBI$n.multiply(d, r)), n)), n);
  if (maybeJSBI$n.equal(s, _0n$1)) return;
  var sig = new Signature(r, s);
  var recovery = (maybeJSBI$n.equal(q.x, sig.r) ? 0 : 2) | maybeJSBI$n.toNumber(maybeJSBI$n.bitwiseAnd(q.y, _1n$1));
  return {
    sig: sig,
    recovery: recovery
  };
}

function normalizePrivateKey(key) {
  var num;

  if (typeof key === 'bigint') {
    num = key;
  } else if (typeof key === 'number' && Number.isSafeInteger(key) && key > 0) {
    num = JSBI.BigInt(key);
  } else if (typeof key === 'string') {
    if (key.length !== 64) throw new Error('Expected 32 bytes of private key');
    num = hexToNumber(key);
  } else if (isUint8a(key)) {
    if (key.length !== 32) throw new Error('Expected 32 bytes of private key');
    num = bytesToNumber(key);
  } else {
    throw new TypeError('Expected valid private key');
  }

  if (!isWithinCurveOrder(num)) throw new Error('Expected private key: 0 < key < n');
  return num;
}

function normalizeSignature(signature) {
  if (signature instanceof Signature) {
    signature.assertValidity();
    return signature;
  }

  try {
    return Signature.fromDER(signature);
  } catch (error) {
    return Signature.fromCompact(signature);
  }
}

function getPublicKey(privateKey) {
  var isCompressed = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  return Point.fromPrivateKey(privateKey).toRawBytes(isCompressed);
}
function recoverPublicKey(msgHash, signature, recovery) {
  var isCompressed = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  return Point.fromSignature(msgHash, signature, recovery).toRawBytes(isCompressed);
}

function bits2int(bytes) {
  var slice = bytes.length > 32 ? bytes.slice(0, 32) : bytes;
  return bytesToNumber(slice);
}

function bits2octets(bytes) {
  var z1 = bits2int(bytes);
  var z2 = mod(z1, CURVE.n);
  return int2octets(maybeJSBI$n.lessThan(z2, _0n$1) ? z1 : z2);
}

function int2octets(num) {
  if (typeof num !== 'bigint') throw new Error('Expected bigint');
  var hex = numTo32bStr(num);
  return hexToBytes(hex);
}

function initSigArgs(msgHash, privateKey, extraEntropy) {
  if (msgHash == null) throw new Error("sign: expected valid message hash, not \"".concat(msgHash, "\""));
  var h1 = ensureBytes(msgHash);
  var d = normalizePrivateKey(privateKey);
  var seedArgs = [int2octets(d), bits2octets(h1)];

  if (extraEntropy != null) {
    if (maybeJSBI$n.equal(extraEntropy, true)) extraEntropy = utils.randomBytes(32);
    var e = ensureBytes(extraEntropy);
    if (e.length !== 32) throw new Error('sign: Expected 32 bytes of extra data');
    seedArgs.push(e);
  }

  var seed = concatBytes.apply(void 0, seedArgs);
  var m = bits2int(h1);
  return {
    seed: seed,
    m: m,
    d: d
  };
}

function finalizeSig(recSig, opts) {
  var sig = recSig.sig,
      recovery = recSig.recovery;

  var _Object$assign = Object.assign({
    canonical: true,
    der: true
  }, opts),
      canonical = _Object$assign.canonical,
      der = _Object$assign.der,
      recovered = _Object$assign.recovered;

  if (canonical && sig.hasHighS()) {
    sig = sig.normalizeS();
    recovery ^= 1;
  }

  var hashed = der ? sig.toDERRawBytes() : sig.toCompactRawBytes();
  return recovered ? [hashed, recovery] : hashed;
}

function signSync(msgHash, privKey) {
  var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var _initSigArgs = initSigArgs(msgHash, privKey, opts.extraEntropy),
      seed = _initSigArgs.seed,
      m = _initSigArgs.m,
      d = _initSigArgs.d;

  var sig;
  var drbg = new HmacDrbg();
  drbg.reseedSync(seed);

  while (!(sig = kmdToSig(drbg.generateSync(), m, d))) {
    drbg.reseedSync();
  }

  return finalizeSig(sig, opts);
}

Point.BASE._setWindowSize(8);

var crypto = {
  node: nodeCrypto,
  web: (typeof self === "undefined" ? "undefined" : _typeof(self)) === 'object' && 'crypto' in self ? self.crypto : undefined
};
var utils = {
  isValidPrivateKey: function isValidPrivateKey(privateKey) {
    try {
      normalizePrivateKey(privateKey);
      return true;
    } catch (error) {
      return false;
    }
  },
  hashToPrivateKey: function hashToPrivateKey(hash) {
    hash = ensureBytes(hash);
    if (hash.length < 40 || hash.length > 1024) throw new Error('Expected 40-1024 bytes of private key as per FIPS 186');
    var num = mod(bytesToNumber(hash), CURVE.n);
    if (maybeJSBI$n.equal(num, _0n$1) || maybeJSBI$n.equal(num, _1n$1)) throw new Error('Invalid private key');
    return numTo32b(num);
  },
  randomBytes: function randomBytes() {
    var bytesLength = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 32;

    if (crypto.web) {
      return crypto.web.getRandomValues(new Uint8Array(bytesLength));
    } else if (crypto.node) {
      var randomBytes = crypto.node.randomBytes;
      return Uint8Array.from(randomBytes(bytesLength));
    } else {
      throw new Error("The environment doesn't have randomBytes function");
    }
  },
  randomPrivateKey: function randomPrivateKey() {
    return utils.hashToPrivateKey(utils.randomBytes(40));
  },
  bytesToHex: bytesToHex,
  mod: mod,
  sha256: function () {
    var _sha = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(message) {
      var buffer, createHash;
      return regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              if (!crypto.web) {
                _context3.next = 7;
                break;
              }

              _context3.next = 3;
              return crypto.web.subtle.digest('SHA-256', message.buffer);

            case 3:
              buffer = _context3.sent;
              return _context3.abrupt("return", new Uint8Array(buffer));

            case 7:
              if (!crypto.node) {
                _context3.next = 12;
                break;
              }

              createHash = crypto.node.createHash;
              return _context3.abrupt("return", Uint8Array.from(createHash('sha256').update(message).digest()));

            case 12:
              throw new Error("The environment doesn't have sha256 function");

            case 13:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3);
    }));

    function sha256(_x13) {
      return _sha.apply(this, arguments);
    }

    return sha256;
  }(),
  hmacSha256: function () {
    var _hmacSha = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(key) {
      var _len5,
          messages,
          _key5,
          ckey,
          message,
          buffer,
          createHmac,
          hash,
          _args4 = arguments;

      return regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              for (_len5 = _args4.length, messages = new Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
                messages[_key5 - 1] = _args4[_key5];
              }

              if (!crypto.web) {
                _context4.next = 12;
                break;
              }

              _context4.next = 4;
              return crypto.web.subtle.importKey('raw', key, {
                name: 'HMAC',
                hash: {
                  name: 'SHA-256'
                }
              }, false, ['sign']);

            case 4:
              ckey = _context4.sent;
              message = concatBytes.apply(void 0, messages);
              _context4.next = 8;
              return crypto.web.subtle.sign('HMAC', ckey, message);

            case 8:
              buffer = _context4.sent;
              return _context4.abrupt("return", new Uint8Array(buffer));

            case 12:
              if (!crypto.node) {
                _context4.next = 19;
                break;
              }

              createHmac = crypto.node.createHmac;
              hash = createHmac('sha256', key);
              messages.forEach(function (m) {
                return hash.update(m);
              });
              return _context4.abrupt("return", Uint8Array.from(hash.digest()));

            case 19:
              throw new Error("The environment doesn't have hmac-sha256 function");

            case 20:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4);
    }));

    function hmacSha256(_x14) {
      return _hmacSha.apply(this, arguments);
    }

    return hmacSha256;
  }(),
  sha256Sync: undefined,
  hmacSha256Sync: undefined,
  precompute: function precompute() {
    var windowSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 8;
    var point = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Point.BASE;
    var cached = maybeJSBI$n.equal(point, Point.BASE) ? point : new Point(point.x, point.y);

    cached._setWindowSize(windowSize);

    cached.multiply(_3n);
    return cached;
  }
};

var maybeJSBI$m = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
var u32 = function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}; // Cast array to view

var createView = function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}; // The rotate right (circular right shift) operation for uint32

var rotr = function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
};
var isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44; // There is almost no big endian hardware, but js typed arrays uses platform specific endianess.
// So, just to be sure not to corrupt anything.

if (!isLE) throw new Error('Non little-endian hardware is not supported');
Array.from({
  length: 256
}, function (v, i) {
  return i.toString(16).padStart(2, '0');
});
// But setTimeout is pretty slow, maybe worth to investigate howto do minimal polyfill here

(function () {
  var nodeRequire = typeof module !== 'undefined' && typeof module.require === 'function' && module.require.bind(module);

  try {
    if (nodeRequire) {
      var _nodeRequire = nodeRequire('timers'),
          setImmediate = _nodeRequire.setImmediate;

      return function () {
        return new Promise(function (resolve) {
          return setImmediate(resolve);
        });
      };
    }
  } catch (e) {}

  return function () {
    return new Promise(function (resolve) {
      return setTimeout(resolve, 0);
    });
  };
})(); // Returns control to thread each 'tick' ms to avoid blocking

function utf8ToBytes(str) {
  if (typeof str !== 'string') {
    throw new TypeError("utf8ToBytes expected string, got ".concat(_typeof(str)));
  }

  return new TextEncoder().encode(str);
}
function toBytes(data) {
  if (typeof data === 'string') data = utf8ToBytes(data);
  if (!(data instanceof Uint8Array)) throw new TypeError("Expected input type is Uint8Array (got ".concat(_typeof(data), ")"));
  return data;
}
function assertNumber(n) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("Wrong positive integer: ".concat(n));
}
function assertHash(hash) {
  if (typeof hash !== 'function' || typeof hash.create !== 'function') throw new Error('Hash should be wrapped by utils.wrapConstructor');
  assertNumber(hash.outputLen);
  assertNumber(hash.blockLen);
} // For runtime check if class implements interface

var Hash = /*#__PURE__*/function () {
  function Hash() {
    _classCallCheck(this, Hash);
  }

  _createClass(Hash, [{
    key: "clone",
    value: // Safe version that clones internal state
    function clone() {
      return this._cloneInto();
    }
  }]);

  return Hash;
}(); // Check if object doens't have custom constructor (like Uint8Array/Array)

var isPlainObject = function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]' && maybeJSBI$m.equal(obj.constructor, Object);
};

function checkOpts(def, _opts) {
  if (_opts !== undefined && (_typeof(_opts) !== 'object' || !isPlainObject(_opts))) throw new TypeError('Options should be object or undefined');
  var opts = Object.assign(def, _opts);
  return opts;
}
function wrapConstructor(hashConstructor) {
  var hashC = function hashC(message) {
    return hashConstructor().update(toBytes(message)).digest();
  };

  var tmp = hashConstructor();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;

  hashC.create = function () {
    return hashConstructor();
  };

  return hashC;
}
function wrapConstructorWithOpts(hashCons) {
  var hashC = function hashC(msg, opts) {
    return hashCons(opts).update(toBytes(msg)).digest();
  };

  var tmp = hashCons({});
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;

  hashC.create = function (opts) {
    return hashCons(opts);
  };

  return hashC;
}

var maybeJSBI$l = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

var HMAC = /*#__PURE__*/function (_Hash) {
  _inherits(HMAC, _Hash);

  var _super = _createSuper(HMAC);

  function HMAC(hash, _key) {
    var _this;

    _classCallCheck(this, HMAC);

    _this = _super.call(this);
    _this.finished = false;
    _this.destroyed = false;
    assertHash(hash);
    var key = toBytes(_key);
    _this.iHash = hash.create();
    if (!(_this.iHash instanceof Hash)) throw new TypeError('Expected instance of class which extends utils.Hash');
    var blockLen = _this.blockLen = _this.iHash.blockLen;
    _this.outputLen = _this.iHash.outputLen;
    var pad = new Uint8Array(blockLen); // blockLen can be bigger than outputLen

    pad.set(maybeJSBI$l.greaterThan(key.length, _this.iHash.blockLen) ? hash.create().update(key).digest() : key);

    for (var i = 0; i < pad.length; i++) {
      pad[i] ^= 0x36;
    }

    _this.iHash.update(pad); // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone


    _this.oHash = hash.create(); // Undo internal XOR && apply outer XOR

    for (var _i = 0; _i < pad.length; _i++) {
      pad[_i] ^= 0x36 ^ 0x5c;
    }

    _this.oHash.update(pad);

    pad.fill(0);
    return _this;
  }

  _createClass(HMAC, [{
    key: "update",
    value: function update(buf) {
      if (this.destroyed) throw new Error('instance is destroyed');
      this.iHash.update(buf);
      return this;
    }
  }, {
    key: "digestInto",
    value: function digestInto(out) {
      if (this.destroyed) throw new Error('instance is destroyed');
      if (!(out instanceof Uint8Array) || maybeJSBI$l.notEqual(out.length, this.outputLen)) throw new Error('HMAC: Invalid output buffer');
      if (this.finished) throw new Error('digest() was already called');
      this.finished = true;
      this.iHash.digestInto(out);
      this.oHash.update(out);
      this.oHash.digestInto(out);
      this.destroy();
    }
  }, {
    key: "digest",
    value: function digest() {
      var out = new Uint8Array(this.oHash.outputLen);
      this.digestInto(out);
      return out;
    }
  }, {
    key: "_cloneInto",
    value: function _cloneInto(to) {
      // Create new instance without calling constructor since key already in state and we don't know it.
      to || (to = Object.create(Object.getPrototypeOf(this), {}));
      var oHash = this.oHash,
          iHash = this.iHash,
          finished = this.finished,
          destroyed = this.destroyed,
          blockLen = this.blockLen,
          outputLen = this.outputLen;
      to = to;
      to.finished = finished;
      to.destroyed = destroyed;
      to.blockLen = blockLen;
      to.outputLen = outputLen;
      to.oHash = oHash._cloneInto(to.oHash);
      to.iHash = iHash._cloneInto(to.iHash);
      return to;
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.destroyed = true;
      this.oHash.destroy();
      this.iHash.destroy();
    }
  }]);

  return HMAC;
}(Hash);
/**
 * HMAC: RFC2104 message authentication code.
 * @param hash - function that would be used e.g. sha256
 * @param key - message key
 * @param message - message data
 */


var hmac = function hmac(hash, key, message) {
  return new HMAC(hash, key).update(message).digest();
};

hmac.create = function (hash, key) {
  return new HMAC(hash, key);
};

var maybeJSBI$k = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

function setBigUint64(view, byteOffset, value, isLE) {
  if (typeof view.setBigUint64 === 'function') return view.setBigUint64(byteOffset, value, isLE);

  var _32n = JSBI.BigInt(32);

  var _u32_max = JSBI.BigInt(0xffffffff);

  var wh = maybeJSBI$k.toNumber(maybeJSBI$k.bitwiseAnd(maybeJSBI$k.signedRightShift(value, _32n), _u32_max));
  var wl = maybeJSBI$k.toNumber(maybeJSBI$k.bitwiseAnd(value, _u32_max));
  var h = isLE ? 4 : 0;
  var l = isLE ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE);
  view.setUint32(byteOffset + l, wl, isLE);
} // Base SHA2 class (RFC 6234)


var SHA2 = /*#__PURE__*/function (_Hash) {
  _inherits(SHA2, _Hash);

  var _super = _createSuper(SHA2);

  function SHA2(blockLen, outputLen, padOffset, isLE) {
    var _this;

    _classCallCheck(this, SHA2);

    _this = _super.call(this);
    _this.blockLen = blockLen;
    _this.outputLen = outputLen;
    _this.padOffset = padOffset;
    _this.isLE = isLE;
    _this.finished = false;
    _this.length = 0;
    _this.pos = 0;
    _this.destroyed = false;
    _this.buffer = new Uint8Array(blockLen);
    _this.view = createView(_this.buffer);
    return _this;
  }

  _createClass(SHA2, [{
    key: "update",
    value: function update(data) {
      var _x, _y;

      if (this.destroyed) throw new Error('instance is destroyed');
      var view = this.view,
          buffer = this.buffer,
          blockLen = this.blockLen,
          finished = this.finished;
      if (finished) throw new Error('digest() was already called');
      data = toBytes(data);
      var len = data.length;

      for (var pos = 0; pos < len;) {
        var take = Math.min(maybeJSBI$k.subtract(blockLen, this.pos), len - pos); // Fast path: we have at least one block in input, cast it to view and process

        if (take === blockLen) {
          var dataView = createView(data);

          for (; blockLen <= len - pos; pos += blockLen) {
            this.process(dataView, pos);
          }

          continue;
        }

        buffer.set(data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        pos += take;

        if (maybeJSBI$k.equal(this.pos, blockLen)) {
          this.process(view, 0);
          this.pos = 0;
        }
      }

      _x = this, _y = "length", _x[_y] = maybeJSBI$k.add(_x[_y], data.length);
      this.roundClean();
      return this;
    }
  }, {
    key: "digestInto",
    value: function digestInto(out) {
      var _x2;

      if (this.destroyed) throw new Error('instance is destroyed');
      if (!(out instanceof Uint8Array) || maybeJSBI$k.lessThan(out.length, this.outputLen)) throw new Error('_Sha2: Invalid output buffer');
      if (this.finished) throw new Error('digest() was already called');
      this.finished = true; // Padding
      // We can avoid allocation of buffer for padding completely if it
      // was previously not allocated here. But it won't change performance.

      var buffer = this.buffer,
          view = this.view,
          blockLen = this.blockLen,
          isLE = this.isLE;
      var pos = this.pos; // append the bit '1' to the message

      buffer[(_x2 = pos, pos = maybeJSBI$k.add(pos, maybeJSBI$k.BigInt(1)), _x2)] = 128;
      this.buffer.subarray(pos).fill(0); // we have less than padOffset left in buffer, so we cannot put length in current block, need process it and pad again

      if (maybeJSBI$k.greaterThan(this.padOffset, maybeJSBI$k.subtract(blockLen, pos))) {
        this.process(view, 0);
        pos = 0;
      } // Pad until full block byte with zeros


      for (var i = pos; maybeJSBI$k.lessThan(i, blockLen); _x3 = i, i = maybeJSBI$k.add(i, maybeJSBI$k.BigInt(1)), _x3) {
        var _x3;

        buffer[i] = 0;
      } // NOTE: sha512 requires length to be 128bit integer, but length in JS will overflow before that
      // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
      // So we just write lowest 64bit of that value.


      setBigUint64(view, blockLen - 8, JSBI.BigInt(this.length * 8), isLE);
      this.process(view, 0);
      var oview = createView(out);
      this.get().forEach(function (v, i) {
        return oview.setUint32(4 * i, v, isLE);
      });
    }
  }, {
    key: "digest",
    value: function digest() {
      var buffer = this.buffer,
          outputLen = this.outputLen;
      this.digestInto(buffer);
      var res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
  }, {
    key: "_cloneInto",
    value: function _cloneInto(to) {
      var _to;

      to || (to = new this.constructor());

      (_to = to).set.apply(_to, _toConsumableArray(this.get()));

      var blockLen = this.blockLen,
          buffer = this.buffer,
          length = this.length,
          finished = this.finished,
          destroyed = this.destroyed,
          pos = this.pos;
      to.length = length;
      to.pos = pos;
      to.finished = finished;
      to.destroyed = destroyed;
      if (maybeJSBI$k.remainder(length, blockLen)) to.buffer.set(buffer);
      return to;
    }
  }]);

  return SHA2;
}(Hash);

var maybeJSBI$j = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

var Chi = function Chi(a, b, c) {
  return maybeJSBI$j.bitwiseXor(maybeJSBI$j.bitwiseAnd(a, b), maybeJSBI$j.bitwiseAnd(maybeJSBI$j.bitwiseNot(a), c));
}; // Majority function, true if any two inpust is true


var Maj = function Maj(a, b, c) {
  return maybeJSBI$j.bitwiseXor(maybeJSBI$j.bitwiseXor(maybeJSBI$j.bitwiseAnd(a, b), maybeJSBI$j.bitwiseAnd(a, c)), maybeJSBI$j.bitwiseAnd(b, c));
}; // Round constants:
// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
// prettier-ignore


var SHA256_K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]); // Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
// prettier-ignore

var IV$1 = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]); // Temporary buffer, not used to store anything between runs
// Named this way because it matches specification.

var SHA256_W = new Uint32Array(64);

var SHA256 = /*#__PURE__*/function (_SHA) {
  _inherits(SHA256, _SHA);

  var _super = _createSuper(SHA256);

  function SHA256() {
    var _this;

    _classCallCheck(this, SHA256);

    _this = _super.call(this, 64, 32, 8, false); // We cannot use array here since array allows indexing by variable
    // which means optimizer/compiler cannot use registers.

    _this.A = IV$1[0] | 0;
    _this.B = IV$1[1] | 0;
    _this.C = IV$1[2] | 0;
    _this.D = IV$1[3] | 0;
    _this.E = IV$1[4] | 0;
    _this.F = IV$1[5] | 0;
    _this.G = IV$1[6] | 0;
    _this.H = IV$1[7] | 0;
    return _this;
  }

  _createClass(SHA256, [{
    key: "get",
    value: function get() {
      var A = this.A,
          B = this.B,
          C = this.C,
          D = this.D,
          E = this.E,
          F = this.F,
          G = this.G,
          H = this.H;
      return [A, B, C, D, E, F, G, H];
    } // prettier-ignore

  }, {
    key: "set",
    value: function set(A, B, C, D, E, F, G, H) {
      this.A = A | 0;
      this.B = B | 0;
      this.C = C | 0;
      this.D = D | 0;
      this.E = E | 0;
      this.F = F | 0;
      this.G = G | 0;
      this.H = H | 0;
    }
  }, {
    key: "process",
    value: function process(view, offset) {
      // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
      for (var i = 0; i < 16; i++, offset += 4) {
        SHA256_W[i] = view.getUint32(offset, false);
      }

      for (var _i = 16; _i < 64; _i++) {
        var W15 = SHA256_W[_i - 15];
        var W2 = SHA256_W[_i - 2];
        var s0 = maybeJSBI$j.bitwiseXor(rotr(W15, 7), rotr(W15, 18)) ^ W15 >>> 3;
        var s1 = maybeJSBI$j.bitwiseXor(rotr(W2, 17), rotr(W2, 19)) ^ W2 >>> 10;
        SHA256_W[_i] = s1 + SHA256_W[_i - 7] + s0 + SHA256_W[_i - 16] | 0;
      } // Compression function main loop, 64 rounds


      var A = this.A,
          B = this.B,
          C = this.C,
          D = this.D,
          E = this.E,
          F = this.F,
          G = this.G,
          H = this.H;

      for (var _i2 = 0; _i2 < 64; _i2++) {
        var sigma1 = maybeJSBI$j.bitwiseXor(maybeJSBI$j.bitwiseXor(rotr(E, 6), rotr(E, 11)), rotr(E, 25));
        var T1 = maybeJSBI$j.add(maybeJSBI$j.add(maybeJSBI$j.add(maybeJSBI$j.add(H, sigma1), Chi(E, F, G)), SHA256_K[_i2]), SHA256_W[_i2]) | 0;
        var sigma0 = maybeJSBI$j.bitwiseXor(maybeJSBI$j.bitwiseXor(rotr(A, 2), rotr(A, 13)), rotr(A, 22));
        var T2 = maybeJSBI$j.add(sigma0, Maj(A, B, C)) | 0;
        H = G;
        G = F;
        F = E;
        E = D + T1 | 0;
        D = C;
        C = B;
        B = A;
        A = T1 + T2 | 0;
      } // Add the compressed chunk to the current hash value


      A = maybeJSBI$j.add(A, this.A) | 0;
      B = maybeJSBI$j.add(B, this.B) | 0;
      C = maybeJSBI$j.add(C, this.C) | 0;
      D = maybeJSBI$j.add(D, this.D) | 0;
      E = maybeJSBI$j.add(E, this.E) | 0;
      F = maybeJSBI$j.add(F, this.F) | 0;
      G = maybeJSBI$j.add(G, this.G) | 0;
      H = maybeJSBI$j.add(H, this.H) | 0;
      this.set(A, B, C, D, E, F, G, H);
    }
  }, {
    key: "roundClean",
    value: function roundClean() {
      SHA256_W.fill(0);
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.set(0, 0, 0, 0, 0, 0, 0, 0);
      this.buffer.fill(0);
    }
  }]);

  return SHA256;
}(SHA2);
/**
 * SHA2-256 hash function
 * @param message - data that would be hashed
 */


var sha256$1 = wrapConstructor(function () {
  return new SHA256();
});

var maybeJSBI$i = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
var U32_MASK64 = JSBI.BigInt(2 ** 32 - 1);

var _32n = JSBI.BigInt(32);

function fromBig(n) {
  var le = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  if (le) return {
    h: maybeJSBI$i.toNumber(maybeJSBI$i.bitwiseAnd(n, U32_MASK64)),
    l: maybeJSBI$i.toNumber(maybeJSBI$i.bitwiseAnd(maybeJSBI$i.signedRightShift(n, _32n), U32_MASK64))
  };
  return {
    h: maybeJSBI$i.toNumber(maybeJSBI$i.bitwiseAnd(maybeJSBI$i.signedRightShift(n, _32n), U32_MASK64)) | 0,
    l: maybeJSBI$i.toNumber(maybeJSBI$i.bitwiseAnd(n, U32_MASK64)) | 0
  };
}
function split(lst) {
  var le = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var Ah = new Uint32Array(lst.length);
  var Al = new Uint32Array(lst.length);

  for (var i = 0; i < lst.length; i++) {
    var _fromBig = fromBig(lst[i], le),
        h = _fromBig.h,
        l = _fromBig.l;

    var _ref = [h, l];
    Ah[i] = _ref[0];
    Al[i] = _ref[1];
  }

  return [Ah, Al];
}

var shrSH = function shrSH(h, l, s) {
  return h >>> s;
};
var shrSL = function shrSL(h, l, s) {
  return h << 32 - s | l >>> s;
}; // Right rotate for Shift in [1, 32)

var rotrSH = function rotrSH(h, l, s) {
  return h >>> s | l << 32 - s;
};
var rotrSL = function rotrSL(h, l, s) {
  return h << 32 - s | l >>> s;
}; // Right rotate for Shift in (32, 64), NOTE: 32 is special case.

var rotrBH = function rotrBH(h, l, s) {
  return h << 64 - s | l >>> s - 32;
};
var rotrBL = function rotrBL(h, l, s) {
  return h >>> s - 32 | l << 64 - s;
}; // Right rotate for shift===32 (just swaps l&h)

var rotr32H = function rotr32H(h, l) {
  return l;
};
var rotr32L = function rotr32L(h, l) {
  return h;
}; // Left rotate for Shift in [1, 32)

var rotlSH = function rotlSH(h, l, s) {
  return maybeJSBI$i.leftShift(h, s) | l >>> 32 - s;
};
var rotlSL = function rotlSL(h, l, s) {
  return maybeJSBI$i.leftShift(l, s) | h >>> 32 - s;
}; // Left rotate for Shift in (32, 64), NOTE: 32 is special case.

var rotlBH = function rotlBH(h, l, s) {
  return l << s - 32 | h >>> 64 - s;
};
var rotlBL = function rotlBL(h, l, s) {
  return h << s - 32 | l >>> 64 - s;
}; // JS uses 32-bit signed integers for bitwise operations which means we cannot
// simple take carry out of low bit sum by shift, we need to use division.

function add(Ah, Al, Bh, Bl) {
  var l = (Al >>> 0) + (Bl >>> 0);
  return {
    h: maybeJSBI$i.add(Ah, Bh) + (l / 2 ** 32 | 0) | 0,
    l: l | 0
  };
} // Addition with more than 2 elements

var add3L = function add3L(Al, Bl, Cl) {
  return (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
};
var add3H = function add3H(low, Ah, Bh, Ch) {
  return maybeJSBI$i.add(maybeJSBI$i.add(Ah, Bh), Ch) + (low / 2 ** 32 | 0) | 0;
};
var add4L = function add4L(Al, Bl, Cl, Dl) {
  return (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
};
var add4H = function add4H(low, Ah, Bh, Ch, Dh) {
  return maybeJSBI$i.add(maybeJSBI$i.add(maybeJSBI$i.add(Ah, Bh), Ch), Dh) + (low / 2 ** 32 | 0) | 0;
};
var add5L = function add5L(Al, Bl, Cl, Dl, El) {
  return (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
};
var add5H = function add5H(low, Ah, Bh, Ch, Dh, Eh) {
  return maybeJSBI$i.add(maybeJSBI$i.add(maybeJSBI$i.add(maybeJSBI$i.add(Ah, Bh), Ch), Dh), Eh) + (low / 2 ** 32 | 0) | 0;
};

var maybeJSBI$h = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
// prettier-ignore

var _u64$split$1 = split(['0x428a2f98d728ae22', '0x7137449123ef65cd', '0xb5c0fbcfec4d3b2f', '0xe9b5dba58189dbbc', '0x3956c25bf348b538', '0x59f111f1b605d019', '0x923f82a4af194f9b', '0xab1c5ed5da6d8118', '0xd807aa98a3030242', '0x12835b0145706fbe', '0x243185be4ee4b28c', '0x550c7dc3d5ffb4e2', '0x72be5d74f27b896f', '0x80deb1fe3b1696b1', '0x9bdc06a725c71235', '0xc19bf174cf692694', '0xe49b69c19ef14ad2', '0xefbe4786384f25e3', '0x0fc19dc68b8cd5b5', '0x240ca1cc77ac9c65', '0x2de92c6f592b0275', '0x4a7484aa6ea6e483', '0x5cb0a9dcbd41fbd4', '0x76f988da831153b5', '0x983e5152ee66dfab', '0xa831c66d2db43210', '0xb00327c898fb213f', '0xbf597fc7beef0ee4', '0xc6e00bf33da88fc2', '0xd5a79147930aa725', '0x06ca6351e003826f', '0x142929670a0e6e70', '0x27b70a8546d22ffc', '0x2e1b21385c26c926', '0x4d2c6dfc5ac42aed', '0x53380d139d95b3df', '0x650a73548baf63de', '0x766a0abb3c77b2a8', '0x81c2c92e47edaee6', '0x92722c851482353b', '0xa2bfe8a14cf10364', '0xa81a664bbc423001', '0xc24b8b70d0f89791', '0xc76c51a30654be30', '0xd192e819d6ef5218', '0xd69906245565a910', '0xf40e35855771202a', '0x106aa07032bbd1b8', '0x19a4c116b8d2d0c8', '0x1e376c085141ab53', '0x2748774cdf8eeb99', '0x34b0bcb5e19b48a8', '0x391c0cb3c5c95a63', '0x4ed8aa4ae3418acb', '0x5b9cca4f7763e373', '0x682e6ff3d6b2b8a3', '0x748f82ee5defb2fc', '0x78a5636f43172f60', '0x84c87814a1f0ab72', '0x8cc702081a6439ec', '0x90befffa23631e28', '0xa4506cebde82bde9', '0xbef9a3f7b2c67915', '0xc67178f2e372532b', '0xca273eceea26619c', '0xd186b8c721c0c207', '0xeada7dd6cde0eb1e', '0xf57d4f7fee6ed178', '0x06f067aa72176fba', '0x0a637dc5a2c898a6', '0x113f9804bef90dae', '0x1b710b35131c471b', '0x28db77f523047d84', '0x32caab7b40c72493', '0x3c9ebe0a15c9bebc', '0x431d67c49c100d4c', '0x4cc5d4becb3e42b6', '0x597f299cfc657e2a', '0x5fcb6fab3ad6faec', '0x6c44198c4a475817'].map(function (n) {
  return JSBI.BigInt(n);
})),
    _u64$split2$1 = _slicedToArray(_u64$split$1, 2),
    SHA512_Kh = _u64$split2$1[0],
    SHA512_Kl = _u64$split2$1[1]; // Temporary buffer, not used to store anything between runs


var SHA512_W_H = new Uint32Array(80);
var SHA512_W_L = new Uint32Array(80);
var SHA512 = /*#__PURE__*/function (_SHA) {
  _inherits(SHA512, _SHA);

  var _super = _createSuper(SHA512);

  function SHA512() {
    var _this;

    _classCallCheck(this, SHA512);

    _this = _super.call(this, 128, 64, 16, false); // We cannot use array here since array allows indexing by variable which means optimizer/compiler cannot use registers.
    // Also looks cleaner and easier to verify with spec.
    // Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
    // h -- high 32 bits, l -- low 32 bits

    _this.Ah = 0x6a09e667 | 0;
    _this.Al = 0xf3bcc908 | 0;
    _this.Bh = 0xbb67ae85 | 0;
    _this.Bl = 0x84caa73b | 0;
    _this.Ch = 0x3c6ef372 | 0;
    _this.Cl = 0xfe94f82b | 0;
    _this.Dh = 0xa54ff53a | 0;
    _this.Dl = 0x5f1d36f1 | 0;
    _this.Eh = 0x510e527f | 0;
    _this.El = 0xade682d1 | 0;
    _this.Fh = 0x9b05688c | 0;
    _this.Fl = 0x2b3e6c1f | 0;
    _this.Gh = 0x1f83d9ab | 0;
    _this.Gl = 0xfb41bd6b | 0;
    _this.Hh = 0x5be0cd19 | 0;
    _this.Hl = 0x137e2179 | 0;
    return _this;
  } // prettier-ignore


  _createClass(SHA512, [{
    key: "get",
    value: function get() {
      var Ah = this.Ah,
          Al = this.Al,
          Bh = this.Bh,
          Bl = this.Bl,
          Ch = this.Ch,
          Cl = this.Cl,
          Dh = this.Dh,
          Dl = this.Dl,
          Eh = this.Eh,
          El = this.El,
          Fh = this.Fh,
          Fl = this.Fl,
          Gh = this.Gh,
          Gl = this.Gl,
          Hh = this.Hh,
          Hl = this.Hl;
      return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
    } // prettier-ignore

  }, {
    key: "set",
    value: function set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
      this.Ah = Ah | 0;
      this.Al = Al | 0;
      this.Bh = Bh | 0;
      this.Bl = Bl | 0;
      this.Ch = Ch | 0;
      this.Cl = Cl | 0;
      this.Dh = Dh | 0;
      this.Dl = Dl | 0;
      this.Eh = Eh | 0;
      this.El = El | 0;
      this.Fh = Fh | 0;
      this.Fl = Fl | 0;
      this.Gh = Gh | 0;
      this.Gl = Gl | 0;
      this.Hh = Hh | 0;
      this.Hl = Hl | 0;
    }
  }, {
    key: "process",
    value: function process(view, offset) {
      // Extend the first 16 words into the remaining 64 words w[16..79] of the message schedule array
      for (var i = 0; i < 16; i++, offset += 4) {
        SHA512_W_H[i] = view.getUint32(offset);
        SHA512_W_L[i] = view.getUint32(offset += 4);
      }

      for (var _i = 16; _i < 80; _i++) {
        // s0 := (w[i-15] rightrotate 1) xor (w[i-15] rightrotate 8) xor (w[i-15] rightshift 7)
        var W15h = SHA512_W_H[_i - 15] | 0;
        var W15l = SHA512_W_L[_i - 15] | 0;
        var s0h = maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseXor(rotrSH(W15h, W15l, 1), rotrSH(W15h, W15l, 8)), shrSH(W15h, W15l, 7));
        var s0l = maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseXor(rotrSL(W15h, W15l, 1), rotrSL(W15h, W15l, 8)), shrSL(W15h, W15l, 7)); // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)

        var W2h = SHA512_W_H[_i - 2] | 0;
        var W2l = SHA512_W_L[_i - 2] | 0;
        var s1h = maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseXor(rotrSH(W2h, W2l, 19), rotrBH(W2h, W2l, 61)), shrSH(W2h, W2l, 6));
        var s1l = maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseXor(rotrSL(W2h, W2l, 19), rotrBL(W2h, W2l, 61)), shrSL(W2h, W2l, 6)); // SHA256_W[i] = s0 + s1 + SHA256_W[i - 7] + SHA256_W[i - 16];

        var SUMl = add4L(s0l, s1l, SHA512_W_L[_i - 7], SHA512_W_L[_i - 16]);
        var SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[_i - 7], SHA512_W_H[_i - 16]);
        SHA512_W_H[_i] = SUMh | 0;
        SHA512_W_L[_i] = SUMl | 0;
      }

      var Ah = this.Ah,
          Al = this.Al,
          Bh = this.Bh,
          Bl = this.Bl,
          Ch = this.Ch,
          Cl = this.Cl,
          Dh = this.Dh,
          Dl = this.Dl,
          Eh = this.Eh,
          El = this.El,
          Fh = this.Fh,
          Fl = this.Fl,
          Gh = this.Gh,
          Gl = this.Gl,
          Hh = this.Hh,
          Hl = this.Hl; // Compression function main loop, 80 rounds

      for (var _i2 = 0; _i2 < 80; _i2++) {
        // S1 := (e rightrotate 14) xor (e rightrotate 18) xor (e rightrotate 41)
        var sigma1h = maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseXor(rotrSH(Eh, El, 14), rotrSH(Eh, El, 18)), rotrBH(Eh, El, 41));
        var sigma1l = maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseXor(rotrSL(Eh, El, 14), rotrSL(Eh, El, 18)), rotrBL(Eh, El, 41)); //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;

        var CHIh = maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseAnd(Eh, Fh), maybeJSBI$h.bitwiseAnd(maybeJSBI$h.bitwiseNot(Eh), Gh));
        var CHIl = maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseAnd(El, Fl), maybeJSBI$h.bitwiseAnd(maybeJSBI$h.bitwiseNot(El), Gl)); // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
        // prettier-ignore

        var T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[_i2], SHA512_W_L[_i2]);
        var T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[_i2], SHA512_W_H[_i2]);
        var T1l = T1ll | 0; // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)

        var sigma0h = maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseXor(rotrSH(Ah, Al, 28), rotrBH(Ah, Al, 34)), rotrBH(Ah, Al, 39));
        var sigma0l = maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseXor(rotrSL(Ah, Al, 28), rotrBL(Ah, Al, 34)), rotrBL(Ah, Al, 39));
        var MAJh = maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseAnd(Ah, Bh), maybeJSBI$h.bitwiseAnd(Ah, Ch)), maybeJSBI$h.bitwiseAnd(Bh, Ch));
        var MAJl = maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseXor(maybeJSBI$h.bitwiseAnd(Al, Bl), maybeJSBI$h.bitwiseAnd(Al, Cl)), maybeJSBI$h.bitwiseAnd(Bl, Cl));
        Hh = Gh | 0;
        Hl = Gl | 0;
        Gh = Fh | 0;
        Gl = Fl | 0;
        Fh = Eh | 0;
        Fl = El | 0;

        var _u64$add = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0);

        Eh = _u64$add.h;
        El = _u64$add.l;
        Dh = Ch | 0;
        Dl = Cl | 0;
        Ch = Bh | 0;
        Cl = Bl | 0;
        Bh = Ah | 0;
        Bl = Al | 0;
        var All = add3L(T1l, sigma0l, MAJl);
        Ah = add3H(All, T1h, sigma0h, MAJh);
        Al = All | 0;
      } // Add the compressed chunk to the current hash value


      var _u64$add2 = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0);

      Ah = _u64$add2.h;
      Al = _u64$add2.l;

      var _u64$add3 = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0);

      Bh = _u64$add3.h;
      Bl = _u64$add3.l;

      var _u64$add4 = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0);

      Ch = _u64$add4.h;
      Cl = _u64$add4.l;

      var _u64$add5 = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0);

      Dh = _u64$add5.h;
      Dl = _u64$add5.l;

      var _u64$add6 = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0);

      Eh = _u64$add6.h;
      El = _u64$add6.l;

      var _u64$add7 = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0);

      Fh = _u64$add7.h;
      Fl = _u64$add7.l;

      var _u64$add8 = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0);

      Gh = _u64$add8.h;
      Gl = _u64$add8.l;

      var _u64$add9 = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0);

      Hh = _u64$add9.h;
      Hl = _u64$add9.l;
      this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
    }
  }, {
    key: "roundClean",
    value: function roundClean() {
      SHA512_W_H.fill(0);
      SHA512_W_L.fill(0);
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.buffer.fill(0);
      this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
  }]);

  return SHA512;
}(SHA2);

var SHA512_256 = /*#__PURE__*/function (_SHA2) {
  _inherits(SHA512_256, _SHA2);

  var _super2 = _createSuper(SHA512_256);

  function SHA512_256() {
    var _this2;

    _classCallCheck(this, SHA512_256);

    _this2 = _super2.call(this); // h -- high 32 bits, l -- low 32 bits

    _this2.Ah = 0x22312194 | 0;
    _this2.Al = 0xfc2bf72c | 0;
    _this2.Bh = 0x9f555fa3 | 0;
    _this2.Bl = 0xc84c64c2 | 0;
    _this2.Ch = 0x2393b86b | 0;
    _this2.Cl = 0x6f53b151 | 0;
    _this2.Dh = 0x96387719 | 0;
    _this2.Dl = 0x5940eabd | 0;
    _this2.Eh = 0x96283ee2 | 0;
    _this2.El = 0xa88effe3 | 0;
    _this2.Fh = 0xbe5e1e25 | 0;
    _this2.Fl = 0x53863992 | 0;
    _this2.Gh = 0x2b0199fc | 0;
    _this2.Gl = 0x2c85b8aa | 0;
    _this2.Hh = 0x0eb72ddc | 0;
    _this2.Hl = 0x81c52ca2 | 0;
    _this2.outputLen = 32;
    return _this2;
  }

  return _createClass(SHA512_256);
}(SHA512);

var SHA384 = /*#__PURE__*/function (_SHA3) {
  _inherits(SHA384, _SHA3);

  var _super3 = _createSuper(SHA384);

  function SHA384() {
    var _this3;

    _classCallCheck(this, SHA384);

    _this3 = _super3.call(this); // h -- high 32 bits, l -- low 32 bits

    _this3.Ah = 0xcbbb9d5d | 0;
    _this3.Al = 0xc1059ed8 | 0;
    _this3.Bh = 0x629a292a | 0;
    _this3.Bl = 0x367cd507 | 0;
    _this3.Ch = 0x9159015a | 0;
    _this3.Cl = 0x3070dd17 | 0;
    _this3.Dh = 0x152fecd8 | 0;
    _this3.Dl = 0xf70e5939 | 0;
    _this3.Eh = 0x67332667 | 0;
    _this3.El = 0xffc00b31 | 0;
    _this3.Fh = 0x8eb44a87 | 0;
    _this3.Fl = 0x68581511 | 0;
    _this3.Gh = 0xdb0c2e0d | 0;
    _this3.Gl = 0x64f98fa7 | 0;
    _this3.Hh = 0x47b5481d | 0;
    _this3.Hl = 0xbefa4fa4 | 0;
    _this3.outputLen = 48;
    return _this3;
  }

  return _createClass(SHA384);
}(SHA512);

var sha512$1 = wrapConstructor(function () {
  return new SHA512();
});
wrapConstructor(function () {
  return new SHA512_256();
});
wrapConstructor(function () {
  return new SHA384();
});

var maybeJSBI$g = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
var __bridge = {
  cachegetInt32: null,
  cachegetUint8: null,
  type: 'wasm',
  wasm: null,
  wasmPromise: null,
  wasmPromiseFn: null
};
function withWasm(fn) {
  return function () {
    assert(__bridge.wasm, 'The WASM interface has not been initialized. Ensure that you wait for the initialization Promise with waitReady() from @polkadot/wasm-crypto (or cryptoWaitReady() from @polkadot/util-crypto) before attempting to use WASM-only interfaces.');

    for (var _len = arguments.length, params = new Array(_len), _key = 0; _key < _len; _key++) {
      params[_key] = arguments[_key];
    }

    return fn.apply(void 0, [__bridge.wasm].concat(params));
  };
}
function getWasm() {
  return __bridge.wasm;
}
function getInt32() {
  if (__bridge.cachegetInt32 === null || maybeJSBI$g.notEqual(__bridge.cachegetInt32.buffer, __bridge.wasm.memory.buffer)) {
    __bridge.cachegetInt32 = new Int32Array(__bridge.wasm.memory.buffer);
  }

  return __bridge.cachegetInt32;
}
function getUint8() {
  if (__bridge.cachegetUint8 === null || maybeJSBI$g.notEqual(__bridge.cachegetUint8.buffer, __bridge.wasm.memory.buffer)) {
    __bridge.cachegetUint8 = new Uint8Array(__bridge.wasm.memory.buffer);
  }

  return __bridge.cachegetUint8;
}
function getU8a(ptr, len) {
  return getUint8().subarray(ptr / 1, ptr / 1 + len);
}
function allocU8a(arg) {
  var ptr = __bridge.wasm.__wbindgen_malloc(arg.length * 1);

  getUint8().set(arg, ptr / 1);
  return [ptr, arg.length];
}
function allocString(arg) {
  return allocU8a(stringToU8a(arg));
}
function resultU8a() {
  var r0 = getInt32()[8 / 4 + 0];
  var r1 = getInt32()[8 / 4 + 1];
  var ret = getU8a(r0, r1).slice();

  __bridge.wasm.__wbindgen_free(r0, r1 * 1);

  return ret;
}

var bip39ToEntropy = withWasm(function (wasm, phrase) {
  wasm.ext_bip39_to_entropy.apply(wasm, [8].concat(_toConsumableArray(allocString(phrase))));
  return resultU8a();
});
var bip39ToMiniSecret = withWasm(function (wasm, phrase, password) {
  wasm.ext_bip39_to_mini_secret.apply(wasm, [8].concat(_toConsumableArray(allocString(phrase)), _toConsumableArray(allocString(password))));
  return resultU8a();
});
var bip39ToSeed = withWasm(function (wasm, phrase, password) {
  wasm.ext_bip39_to_seed.apply(wasm, [8].concat(_toConsumableArray(allocString(phrase)), _toConsumableArray(allocString(password))));
  return resultU8a();
});
var bip39Validate = withWasm(function (wasm, phrase) {
  var ret = wasm.ext_bip39_validate.apply(wasm, _toConsumableArray(allocString(phrase)));
  return ret !== 0;
});
var ed25519KeypairFromSeed = withWasm(function (wasm, seed) {
  wasm.ext_ed_from_seed.apply(wasm, [8].concat(_toConsumableArray(allocU8a(seed))));
  return resultU8a();
});
var ed25519Sign$1 = withWasm(function (wasm, pubkey, seckey, message) {
  wasm.ext_ed_sign.apply(wasm, [8].concat(_toConsumableArray(allocU8a(pubkey)), _toConsumableArray(allocU8a(seckey)), _toConsumableArray(allocU8a(message))));
  return resultU8a();
});
var ed25519Verify$1 = withWasm(function (wasm, signature, message, pubkey) {
  var ret = wasm.ext_ed_verify.apply(wasm, _toConsumableArray(allocU8a(signature)).concat(_toConsumableArray(allocU8a(message)), _toConsumableArray(allocU8a(pubkey))));
  return ret !== 0;
});
var secp256k1FromSeed = withWasm(function (wasm, seckey) {
  wasm.ext_secp_from_seed.apply(wasm, [8].concat(_toConsumableArray(allocU8a(seckey))));
  return resultU8a();
});
var secp256k1Compress$1 = withWasm(function (wasm, pubkey) {
  wasm.ext_secp_pub_compress.apply(wasm, [8].concat(_toConsumableArray(allocU8a(pubkey))));
  return resultU8a();
});
var secp256k1Expand$1 = withWasm(function (wasm, pubkey) {
  wasm.ext_secp_pub_expand.apply(wasm, [8].concat(_toConsumableArray(allocU8a(pubkey))));
  return resultU8a();
});
var secp256k1Recover$1 = withWasm(function (wasm, msgHash, sig, recovery) {
  wasm.ext_secp_recover.apply(wasm, [8].concat(_toConsumableArray(allocU8a(msgHash)), _toConsumableArray(allocU8a(sig)), [recovery]));
  return resultU8a();
});
var secp256k1Sign$1 = withWasm(function (wasm, msgHash, seckey) {
  wasm.ext_secp_sign.apply(wasm, [8].concat(_toConsumableArray(allocU8a(msgHash)), _toConsumableArray(allocU8a(seckey))));
  return resultU8a();
});
var sr25519DeriveKeypairHard = withWasm(function (wasm, pair, cc) {
  wasm.ext_sr_derive_keypair_hard.apply(wasm, [8].concat(_toConsumableArray(allocU8a(pair)), _toConsumableArray(allocU8a(cc))));
  return resultU8a();
});
var sr25519DeriveKeypairSoft = withWasm(function (wasm, pair, cc) {
  wasm.ext_sr_derive_keypair_soft.apply(wasm, [8].concat(_toConsumableArray(allocU8a(pair)), _toConsumableArray(allocU8a(cc))));
  return resultU8a();
});
var sr25519KeypairFromSeed = withWasm(function (wasm, seed) {
  wasm.ext_sr_from_seed.apply(wasm, [8].concat(_toConsumableArray(allocU8a(seed))));
  return resultU8a();
});
var sr25519Sign$1 = withWasm(function (wasm, pubkey, secret, message) {
  wasm.ext_sr_sign.apply(wasm, [8].concat(_toConsumableArray(allocU8a(pubkey)), _toConsumableArray(allocU8a(secret)), _toConsumableArray(allocU8a(message))));
  return resultU8a();
});
var sr25519Verify$1 = withWasm(function (wasm, signature, message, pubkey) {
  var ret = wasm.ext_sr_verify.apply(wasm, _toConsumableArray(allocU8a(signature)).concat(_toConsumableArray(allocU8a(message)), _toConsumableArray(allocU8a(pubkey))));
  return ret !== 0;
});
var vrfSign = withWasm(function (wasm, secret, context, message, extra) {
  wasm.ext_vrf_sign.apply(wasm, [8].concat(_toConsumableArray(allocU8a(secret)), _toConsumableArray(allocU8a(context)), _toConsumableArray(allocU8a(message)), _toConsumableArray(allocU8a(extra))));
  return resultU8a();
});
var vrfVerify = withWasm(function (wasm, pubkey, context, message, extra, outAndProof) {
  var ret = wasm.ext_vrf_verify.apply(wasm, _toConsumableArray(allocU8a(pubkey)).concat(_toConsumableArray(allocU8a(context)), _toConsumableArray(allocU8a(message)), _toConsumableArray(allocU8a(extra)), _toConsumableArray(allocU8a(outAndProof))));
  return ret !== 0;
});
var blake2b$1 = withWasm(function (wasm, data, key, size) {
  wasm.ext_blake2b.apply(wasm, [8].concat(_toConsumableArray(allocU8a(data)), _toConsumableArray(allocU8a(key)), [size]));
  return resultU8a();
});
var hmacSha256 = withWasm(function (wasm, key, data) {
  wasm.ext_hmac_sha256.apply(wasm, [8].concat(_toConsumableArray(allocU8a(key)), _toConsumableArray(allocU8a(data))));
  return resultU8a();
});
var hmacSha512 = withWasm(function (wasm, key, data) {
  wasm.ext_hmac_sha512.apply(wasm, [8].concat(_toConsumableArray(allocU8a(key)), _toConsumableArray(allocU8a(data))));
  return resultU8a();
});
var keccak256 = withWasm(function (wasm, data) {
  wasm.ext_keccak256.apply(wasm, [8].concat(_toConsumableArray(allocU8a(data))));
  return resultU8a();
});
var keccak512 = withWasm(function (wasm, data) {
  wasm.ext_keccak512.apply(wasm, [8].concat(_toConsumableArray(allocU8a(data))));
  return resultU8a();
});
var pbkdf2$1 = withWasm(function (wasm, data, salt, rounds) {
  wasm.ext_pbkdf2.apply(wasm, [8].concat(_toConsumableArray(allocU8a(data)), _toConsumableArray(allocU8a(salt)), [rounds]));
  return resultU8a();
});
var scrypt$1 = withWasm(function (wasm, password, salt, log2n, r, p) {
  wasm.ext_scrypt.apply(wasm, [8].concat(_toConsumableArray(allocU8a(password)), _toConsumableArray(allocU8a(salt)), [log2n, r, p]));
  return resultU8a();
});
var sha256 = withWasm(function (wasm, data) {
  wasm.ext_sha256.apply(wasm, [8].concat(_toConsumableArray(allocU8a(data))));
  return resultU8a();
});
var sha512 = withWasm(function (wasm, data) {
  wasm.ext_sha512.apply(wasm, [8].concat(_toConsumableArray(allocU8a(data))));
  return resultU8a();
});
function isReady() {
  return !!getWasm();
}

var JS_HASH = {
  256: sha256$1,
  512: sha512$1
};
var WA_MHAC = {
  256: hmacSha256,
  512: hmacSha512
};
/**
 * @name hmacShaAsU8a
 * @description creates a Hmac Sha (256/512) Uint8Array from the key & data
 */


function hmacShaAsU8a(key, data) {
  var bitLength = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 256;
  var onlyJs = arguments.length > 3 ? arguments[3] : undefined;
  var u8aKey = u8aToU8a(key);
  return !hasBigInt || !onlyJs && isReady() ? WA_MHAC[bitLength](u8aKey, data) : hmac(JS_HASH[bitLength], u8aKey, data);
}

var base = {};

var maybeJSBI$f = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

(function (exports) {
  /*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.bytes = exports.stringToBytes = exports.str = exports.bytesToString = exports.hex = exports.utf8 = exports.bech32m = exports.bech32 = exports.base58check = exports.base58xmr = exports.base58xrp = exports.base58flickr = exports.base58 = exports.base64url = exports.base64 = exports.base32crockford = exports.base32hex = exports.base32 = exports.base16 = exports.utils = exports.assertNumber = void 0;

  function assertNumber(n) {
    if (!Number.isSafeInteger(n)) throw new Error("Wrong integer: ".concat(n));
  }

  exports.assertNumber = assertNumber;

  function chain() {
    var wrap = function wrap(a, b) {
      return function (c) {
        return a(b(c));
      };
    };

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var encode = Array.from(args).reverse().reduce(function (acc, i) {
      return acc ? wrap(acc, i.encode) : i.encode;
    }, undefined);
    var decode = args.reduce(function (acc, i) {
      return acc ? wrap(acc, i.decode) : i.decode;
    }, undefined);
    return {
      encode: encode,
      decode: decode
    };
  }

  function alphabet(alphabet) {
    return {
      encode: function encode(digits) {
        if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('alphabet.encode input should be an array of numbers');
        return digits.map(function (i) {
          assertNumber(i);
          if (i < 0 || maybeJSBI$f.greaterThanOrEqual(i, alphabet.length)) throw new Error("Digit index outside alphabet: ".concat(i, " (alphabet: ").concat(alphabet.length, ")"));
          return alphabet[i];
        });
      },
      decode: function decode(input) {
        if (!Array.isArray(input) || input.length && typeof input[0] !== 'string') throw new Error('alphabet.decode input should be array of strings');
        return input.map(function (letter) {
          if (typeof letter !== 'string') throw new Error("alphabet.decode: not string element=".concat(letter));
          var index = alphabet.indexOf(letter);
          if (index === -1) throw new Error("Unknown letter: \"".concat(letter, "\". Allowed: ").concat(alphabet));
          return index;
        });
      }
    };
  }

  function join() {
    var separator = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    if (typeof separator !== 'string') throw new Error('join separator should be string');
    return {
      encode: function encode(from) {
        if (!Array.isArray(from) || from.length && typeof from[0] !== 'string') throw new Error('join.encode input should be array of strings');

        var _iterator = _createForOfIteratorHelper(from),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var i = _step.value;
            if (typeof i !== 'string') throw new Error("join.encode: non-string input=".concat(i));
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }

        return from.join(separator);
      },
      decode: function decode(to) {
        if (typeof to !== 'string') throw new Error('join.decode input should be string');
        return to.split(separator);
      }
    };
  }

  function padding(bits) {
    var chr = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '=';
    assertNumber(bits);
    if (typeof chr !== 'string') throw new Error('padding chr should be string');
    return {
      encode: function encode(data) {
        if (!Array.isArray(data) || data.length && typeof data[0] !== 'string') throw new Error('padding.encode input should be array of strings');

        var _iterator2 = _createForOfIteratorHelper(data),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var i = _step2.value;
            if (typeof i !== 'string') throw new Error("padding.encode: non-string input=".concat(i));
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }

        while (maybeJSBI$f.multiply(data.length, bits) % 8) {
          data.push(chr);
        }

        return data;
      },
      decode: function decode(input) {
        if (!Array.isArray(input) || input.length && typeof input[0] !== 'string') throw new Error('padding.encode input should be array of strings');

        var _iterator3 = _createForOfIteratorHelper(input),
            _step3;

        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var i = _step3.value;
            if (typeof i !== 'string') throw new Error("padding.decode: non-string input=".concat(i));
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }

        var end = input.length;
        if (maybeJSBI$f.multiply(end, bits) % 8) throw new Error('Invalid padding: string should have whole number of bytes');

        for (; end > 0 && maybeJSBI$f.equal(input[end - 1], chr); _x = end, end = maybeJSBI$f.subtract(end, maybeJSBI$f.BigInt(1)), _x) {
          var _x;

          if (!((end - 1) * bits % 8)) throw new Error('Invalid padding: string has too much padding');
        }

        return input.slice(0, end);
      }
    };
  }

  function normalize(fn) {
    if (typeof fn !== 'function') throw new Error('normalize fn should be function');
    return {
      encode: function encode(from) {
        return from;
      },
      decode: function decode(to) {
        return fn(to);
      }
    };
  }

  function convertRadix(data, from, to) {
    if (from < 2) throw new Error("convertRadix: wrong from=".concat(from, ", base cannot be less than 2"));
    if (to < 2) throw new Error("convertRadix: wrong to=".concat(to, ", base cannot be less than 2"));
    if (!Array.isArray(data)) throw new Error('convertRadix: data should be array');
    if (!data.length) return [];
    var pos = 0;
    var res = [];
    var digits = Array.from(data);
    digits.forEach(function (d) {
      assertNumber(d);
      if (d < 0 || maybeJSBI$f.greaterThanOrEqual(d, from)) throw new Error("Wrong integer: ".concat(d));
    });

    while (true) {
      var carry = 0;
      var done = true;

      for (var i = pos; i < digits.length; i++) {
        var digit = digits[i];
        var digitBase = from * carry + digit;

        if (!Number.isSafeInteger(digitBase) || from * carry / from !== carry || digitBase - digit !== from * carry) {
          throw new Error('convertRadix: carry overflow');
        }

        carry = digitBase % to;
        digits[i] = Math.floor(digitBase / to);
        if (!Number.isSafeInteger(digits[i]) || maybeJSBI$f.multiply(digits[i], to) + carry !== digitBase) throw new Error('convertRadix: carry overflow');
        if (!done) continue;else if (!digits[i]) pos = i;else done = false;
      }

      res.push(carry);
      if (done) break;
    }

    for (var _i = 0; _i < data.length - 1 && data[_i] === 0; _i++) {
      res.push(0);
    }

    return res.reverse();
  }

  var gcd = function gcd(a, b) {
    return !b ? a : gcd(b, maybeJSBI$f.remainder(a, b));
  };

  var radix2carry = function radix2carry(from, to) {
    return maybeJSBI$f.add(from, maybeJSBI$f.subtract(to, gcd(from, to)));
  };

  function convertRadix2(data, from, to, padding) {
    if (!Array.isArray(data)) throw new Error('convertRadix2: data should be array');
    if (from <= 0 || from > 32) throw new Error("convertRadix2: wrong from=".concat(from));
    if (to <= 0 || to > 32) throw new Error("convertRadix2: wrong to=".concat(to));

    if (radix2carry(from, to) > 32) {
      throw new Error("convertRadix2: carry overflow from=".concat(from, " to=").concat(to, " carryBits=").concat(radix2carry(from, to)));
    }

    var carry = 0;
    var pos = 0;
    var mask = 2 ** to - 1;
    var res = [];

    var _iterator4 = _createForOfIteratorHelper(data),
        _step4;

    try {
      for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
        var n = _step4.value;
        assertNumber(n);
        if (n >= 2 ** from) throw new Error("convertRadix2: invalid data word=".concat(n, " from=").concat(from));
        carry = carry << from | n;
        if (pos + from > 32) throw new Error("convertRadix2: carry overflow pos=".concat(pos, " from=").concat(from));
        pos += from;

        for (; pos >= to; pos -= to) {
          res.push((carry >> pos - to & mask) >>> 0);
        }

        carry &= 2 ** pos - 1;
      }
    } catch (err) {
      _iterator4.e(err);
    } finally {
      _iterator4.f();
    }

    carry = carry << to - pos & mask;
    if (!padding && pos >= from) throw new Error('Excess padding');
    if (!padding && carry) throw new Error("Non-zero padding: ".concat(carry));
    if (padding && pos > 0) res.push(carry >>> 0);
    return res;
  }

  function radix(num) {
    assertNumber(num);
    return {
      encode: function encode(bytes) {
        if (!(bytes instanceof Uint8Array)) throw new Error('radix.encode input should be Uint8Array');
        return convertRadix(Array.from(bytes), 2 ** 8, num);
      },
      decode: function decode(digits) {
        if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('radix.decode input should be array of strings');
        return Uint8Array.from(convertRadix(digits, num, 2 ** 8));
      }
    };
  }

  function radix2(bits) {
    var revPadding = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    assertNumber(bits);
    if (bits <= 0 || bits > 32) throw new Error('radix2: bits should be in (0..32]');
    if (radix2carry(8, bits) > 32 || radix2carry(bits, 8) > 32) throw new Error('radix2: carry overflow');
    return {
      encode: function encode(bytes) {
        if (!(bytes instanceof Uint8Array)) throw new Error('radix2.encode input should be Uint8Array');
        return convertRadix2(Array.from(bytes), 8, bits, !revPadding);
      },
      decode: function decode(digits) {
        if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('radix2.decode input should be array of strings');
        return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
      }
    };
  }

  function unsafeWrapper(fn) {
    if (typeof fn !== 'function') throw new Error('unsafeWrapper fn should be function');
    return function () {
      try {
        for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        return fn.apply(null, args);
      } catch (e) {}
    };
  }

  function checksum(len, fn) {
    assertNumber(len);
    if (typeof fn !== 'function') throw new Error('checksum fn should be function');
    return {
      encode: function encode(data) {
        if (!(data instanceof Uint8Array)) throw new Error('checksum.encode: input should be Uint8Array');
        var checksum = fn(data).slice(0, len);
        var res = new Uint8Array(maybeJSBI$f.add(data.length, len));
        res.set(data);
        res.set(checksum, data.length);
        return res;
      },
      decode: function decode(data) {
        if (!(data instanceof Uint8Array)) throw new Error('checksum.decode: input should be Uint8Array');
        var payload = data.slice(0, maybeJSBI$f.unaryMinus(len));
        var newChecksum = fn(payload).slice(0, len);
        var oldChecksum = data.slice(maybeJSBI$f.unaryMinus(len));

        for (var i = 0; i < len; i++) {
          if (maybeJSBI$f.notEqual(newChecksum[i], oldChecksum[i])) throw new Error('Invalid checksum');
        }

        return payload;
      }
    };
  }

  exports.utils = {
    alphabet: alphabet,
    chain: chain,
    checksum: checksum,
    radix: radix,
    radix2: radix2,
    join: join,
    padding: padding
  };
  exports.base16 = chain(radix2(4), alphabet('0123456789ABCDEF'), join(''));
  exports.base32 = chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), padding(5), join(''));
  exports.base32hex = chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), padding(5), join(''));
  exports.base32crockford = chain(radix2(5), alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'), join(''), normalize(function (s) {
    return s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');
  }));
  exports.base64 = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'), padding(6), join(''));
  exports.base64url = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'), padding(6), join(''));

  var genBase58 = function genBase58(abc) {
    return chain(radix(58), alphabet(abc), join(''));
  };

  exports.base58 = genBase58('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
  exports.base58flickr = genBase58('123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ');
  exports.base58xrp = genBase58('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz');
  var XMR_BLOCK_LEN = [0, 2, 3, 5, 6, 7, 9, 10, 11];
  exports.base58xmr = {
    encode: function encode(data) {
      var res = '';

      for (var i = 0; i < data.length; i += 8) {
        var block = data.subarray(i, i + 8);
        res += exports.base58.encode(block).padStart(XMR_BLOCK_LEN[block.length], '1');
      }

      return res;
    },
    decode: function decode(str) {
      var res = [];

      for (var i = 0; i < str.length; i += 11) {
        var slice = str.slice(i, i + 11);
        var blockLen = XMR_BLOCK_LEN.indexOf(slice.length);
        var block = exports.base58.decode(slice);

        for (var j = 0; j < maybeJSBI$f.subtract(block.length, blockLen); j++) {
          if (block[j] !== 0) throw new Error('base58xmr: wrong padding');
        }

        res = res.concat(Array.from(block.slice(maybeJSBI$f.subtract(block.length, blockLen))));
      }

      return Uint8Array.from(res);
    }
  };

  var base58check = function base58check(sha256) {
    return chain(checksum(4, function (data) {
      return sha256(sha256(data));
    }), exports.base58);
  };

  exports.base58check = base58check;
  var BECH_ALPHABET = chain(alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l'), join(''));
  var POLYMOD_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

  function bech32Polymod(pre) {
    var b = pre >> 25;
    var chk = (pre & 0x1ffffff) << 5;

    for (var i = 0; i < POLYMOD_GENERATORS.length; i++) {
      if ((b >> i & 1) === 1) chk ^= POLYMOD_GENERATORS[i];
    }

    return chk;
  }

  function bechChecksum(prefix, words) {
    var encodingConst = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
    var len = prefix.length;
    var chk = 1;

    for (var i = 0; i < len; i++) {
      var c = prefix.charCodeAt(i);
      if (c < 33 || c > 126) throw new Error("Invalid prefix (".concat(prefix, ")"));
      chk = bech32Polymod(chk) ^ c >> 5;
    }

    chk = bech32Polymod(chk);

    for (var _i2 = 0; _i2 < len; _i2++) {
      chk = bech32Polymod(chk) ^ prefix.charCodeAt(_i2) & 0x1f;
    }

    var _iterator5 = _createForOfIteratorHelper(words),
        _step5;

    try {
      for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
        var v = _step5.value;
        chk = bech32Polymod(chk) ^ v;
      }
    } catch (err) {
      _iterator5.e(err);
    } finally {
      _iterator5.f();
    }

    for (var _i3 = 0; _i3 < 6; _i3++) {
      chk = bech32Polymod(chk);
    }

    chk ^= encodingConst;
    return BECH_ALPHABET.encode(convertRadix2([chk % 2 ** 30], 30, 5, false));
  }

  function genBech32(encoding) {
    var ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;

    var _words = radix2(5);

    var fromWords = _words.decode;
    var toWords = _words.encode;
    var fromWordsUnsafe = unsafeWrapper(fromWords);

    function encode(prefix, words) {
      var limit = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 90;
      if (typeof prefix !== 'string') throw new Error("bech32.encode prefix should be string, not ".concat(_typeof(prefix)));
      if (!Array.isArray(words) || words.length && typeof words[0] !== 'number') throw new Error("bech32.encode words should be array of numbers, not ".concat(_typeof(words)));
      var actualLength = prefix.length + 7 + words.length;
      if (maybeJSBI$f.notEqual(limit, false) && actualLength > limit) throw new TypeError("Length ".concat(actualLength, " exceeds limit ").concat(limit));
      prefix = prefix.toLowerCase();
      return "".concat(prefix, "1").concat(BECH_ALPHABET.encode(words)).concat(bechChecksum(prefix, words, ENCODING_CONST));
    }

    function decode(str) {
      var limit = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 90;
      if (typeof str !== 'string') throw new Error("bech32.decode input should be string, not ".concat(_typeof(str)));
      if (str.length < 8 || maybeJSBI$f.notEqual(limit, false) && maybeJSBI$f.greaterThan(str.length, limit)) throw new TypeError("Wrong string length: ".concat(str.length, " (").concat(str, "). Expected (8..").concat(limit, ")"));
      var lowered = str.toLowerCase();
      if (maybeJSBI$f.notEqual(str, lowered) && maybeJSBI$f.notEqual(str, str.toUpperCase())) throw new Error("String must be lowercase or uppercase");
      str = lowered;
      var sepIndex = str.lastIndexOf('1');
      if (sepIndex === 0 || sepIndex === -1) throw new Error("Letter \"1\" must be present between prefix and data only");
      var _ref = [str.slice(0, sepIndex), str.slice(sepIndex + 1)],
          prefix = _ref[0],
          _words = _ref[1];
      if (_words.length < 6) throw new Error('Data must be at least 6 characters long');
      var words = BECH_ALPHABET.decode(_words).slice(0, -6);
      var sum = bechChecksum(prefix, words, ENCODING_CONST);
      if (!_words.endsWith(sum)) throw new Error("Invalid checksum in ".concat(str, ": expected \"").concat(sum, "\""));
      return {
        prefix: prefix,
        words: words
      };
    }

    var decodeUnsafe = unsafeWrapper(decode);

    function decodeToBytes(str) {
      var _decode = decode(str, false),
          prefix = _decode.prefix,
          words = _decode.words;

      return {
        prefix: prefix,
        words: words,
        bytes: fromWords(words)
      };
    }

    return {
      encode: encode,
      decode: decode,
      decodeToBytes: decodeToBytes,
      decodeUnsafe: decodeUnsafe,
      fromWords: fromWords,
      fromWordsUnsafe: fromWordsUnsafe,
      toWords: toWords
    };
  }

  exports.bech32 = genBech32('bech32');
  exports.bech32m = genBech32('bech32m');
  exports.utf8 = {
    encode: function encode(data) {
      return new TextDecoder().decode(data);
    },
    decode: function decode(str) {
      return new TextEncoder().encode(str);
    }
  };
  exports.hex = chain(radix2(4), alphabet('0123456789abcdef'), join(''), normalize(function (s) {
    if (typeof s !== 'string' || s.length % 2) throw new TypeError("hex.decode: expected string, got ".concat(_typeof(s), " with length ").concat(s.length));
    return s.toLowerCase();
  }));
  var CODERS = {
    utf8: exports.utf8,
    hex: exports.hex,
    base16: exports.base16,
    base32: exports.base32,
    base64: exports.base64,
    base64url: exports.base64url,
    base58: exports.base58,
    base58xmr: exports.base58xmr
  };
  var coderTypeError = "Invalid encoding type. Available types: ".concat(Object.keys(CODERS).join(', '));

  var bytesToString = function bytesToString(type, bytes) {
    if (typeof type !== 'string' || !CODERS.hasOwnProperty(type)) throw new TypeError(coderTypeError);
    if (!(bytes instanceof Uint8Array)) throw new TypeError('bytesToString() expects Uint8Array');
    return CODERS[type].encode(bytes);
  };

  exports.bytesToString = bytesToString;
  exports.str = exports.bytesToString;

  var stringToBytes = function stringToBytes(type, str) {
    if (!CODERS.hasOwnProperty(type)) throw new TypeError(coderTypeError);
    if (typeof str !== 'string') throw new TypeError('stringToBytes() expects string');
    return CODERS[type].decode(str);
  };

  exports.stringToBytes = stringToBytes;
  exports.bytes = exports.stringToBytes;
})(base);

var maybeJSBI$e = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

function createDecode(_ref, validate) {
  var coder = _ref.coder,
      ipfs = _ref.ipfs;
  return function (value, ipfsCompat) {
    validate(value, ipfsCompat);
    return coder.decode(ipfs && ipfsCompat ? value.substr(1) : value);
  };
}
function createEncode(_ref2) {
  var coder = _ref2.coder,
      ipfs = _ref2.ipfs;
  return function (value, ipfsCompat) {
    var out = coder.encode(u8aToU8a(value));
    return ipfs && ipfsCompat ? "".concat(ipfs).concat(out) : out;
  };
}
function createValidate(_ref3) {
  var chars = _ref3.chars,
      ipfs = _ref3.ipfs,
      type = _ref3.type;
  return function (value, ipfsCompat) {
    assert(value && typeof value === 'string', function () {
      return "Expected non-null, non-empty ".concat(type, " string input");
    });

    if (ipfs && ipfsCompat) {
      assert(maybeJSBI$e.equal(value[0], ipfs), function () {
        return "Expected ipfs-compatible ".concat(type, " to start with '").concat(ipfs, "'");
      });
    }

    var _loop = function _loop(i) {
      assert(chars.includes(value[i]) || value[i] === '=' && (i === value.length - 1 || !chars.includes(value[i + 1])), function () {
        return "Invalid ".concat(type, " character \"").concat(value[i], "\" (0x").concat(value.charCodeAt(i).toString(16), ") at index ").concat(i);
      });
    };

    for (var i = ipfsCompat ? 1 : 0; i < value.length; i++) {
      _loop(i);
    }

    return true;
  };
}

var config$1 = {
  chars: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  coder: base.base58,
  ipfs: 'z',
  type: 'base58'
};
/**
 * @name base58Validate
 * @summary Validates a base58 value.
 * @description
 * Validates that the supplied value is valid base58, throwing exceptions if not
 */

var base58Validate = createValidate(config$1);
/**
 * @name base58Decode
 * @summary Decodes a base58 value.
 * @description
 * From the provided input, decode the base58 and return the result as an `Uint8Array`.
 */

var base58Decode = createDecode(config$1, base58Validate);
/**
* @name base58Encode
* @summary Creates a base58 value.
* @description
* From the provided input, create the base58 and return the result as a string.
*/

var base58Encode = createEncode(config$1);

var maybeJSBI$d = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

var SIGMA = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3, 11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4, 7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8, 9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13, 2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9, 12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11, 13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10, 6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5, 10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0, // For BLAKE2b, the two extra permutations for rounds 10 and 11 are SIGMA[10..11] = SIGMA[0..1].
0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3]);
var BLAKE2 = /*#__PURE__*/function (_Hash) {
  _inherits(BLAKE2, _Hash);

  var _super = _createSuper(BLAKE2);

  function BLAKE2(blockLen, outputLen) {
    var _this;

    var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var keyLen = arguments.length > 3 ? arguments[3] : undefined;
    var saltLen = arguments.length > 4 ? arguments[4] : undefined;
    var persLen = arguments.length > 5 ? arguments[5] : undefined;

    _classCallCheck(this, BLAKE2);

    _this = _super.call(this);
    _this.blockLen = blockLen;
    _this.outputLen = outputLen;
    _this.length = 0;
    _this.pos = 0;
    _this.finished = false;
    _this.destroyed = false;
    assertNumber(blockLen);
    assertNumber(outputLen);
    assertNumber(keyLen);
    if (outputLen < 0 || maybeJSBI$d.greaterThan(outputLen, keyLen)) throw new Error('Blake2: outputLen bigger than keyLen');
    if (opts.key !== undefined && (opts.key.length < 1 || maybeJSBI$d.greaterThan(opts.key.length, keyLen))) throw new Error("Key should be up 1..".concat(keyLen, " byte long or undefined"));
    if (opts.salt !== undefined && maybeJSBI$d.notEqual(opts.salt.length, saltLen)) throw new Error("Salt should be ".concat(saltLen, " byte long or undefined"));
    if (opts.personalization !== undefined && maybeJSBI$d.notEqual(opts.personalization.length, persLen)) throw new Error("Personalization should be ".concat(persLen, " byte long or undefined"));
    _this.buffer32 = u32(_this.buffer = new Uint8Array(blockLen));
    return _this;
  }

  _createClass(BLAKE2, [{
    key: "update",
    value: function update(data) {
      if (this.destroyed) throw new Error('instance is destroyed'); // Main difference with other hashes: there is flag for last block,
      // so we cannot process current block before we know that there
      // is the next one. This significantly complicates logic and reduces ability
      // to do zero-copy processing

      var finished = this.finished,
          blockLen = this.blockLen,
          buffer = this.buffer,
          buffer32 = this.buffer32;
      if (finished) throw new Error('digest() was already called');
      data = toBytes(data);
      var len = data.length;

      for (var pos = 0; pos < len;) {
        // If buffer is full and we still have input (don't process last block, same as blake2s)
        if (maybeJSBI$d.equal(this.pos, blockLen)) {
          this.compress(buffer32, 0, false);
          this.pos = 0;
        }

        var take = Math.min(maybeJSBI$d.subtract(blockLen, this.pos), len - pos);
        var dataOffset = data.byteOffset + pos; // full block && aligned to 4 bytes && not last in input

        if (take === blockLen && !(dataOffset % 4) && pos + take < len) {
          var data32 = new Uint32Array(data.buffer, dataOffset, Math.floor((len - pos) / 4));

          for (var pos32 = 0; pos + blockLen < len; pos32 += buffer32.length, pos += blockLen) {
            var _x, _y;

            _x = this, _y = "length", _x[_y] = maybeJSBI$d.add(_x[_y], blockLen);
            this.compress(data32, pos32, false);
          }

          continue;
        }

        buffer.set(data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        this.length += take;
        pos += take;
      }

      return this;
    }
  }, {
    key: "digestInto",
    value: function digestInto(out) {
      if (this.destroyed) throw new Error('instance is destroyed');
      if (!(out instanceof Uint8Array) || maybeJSBI$d.lessThan(out.length, this.outputLen)) throw new Error('_Blake2: Invalid output buffer');
      var finished = this.finished,
          pos = this.pos,
          buffer32 = this.buffer32;
      if (finished) throw new Error('digest() was already called');
      this.finished = true; // Padding

      this.buffer.subarray(pos).fill(0);
      this.compress(buffer32, 0, true);
      var out32 = u32(out);
      this.get().forEach(function (v, i) {
        return out32[i] = v;
      });
    }
  }, {
    key: "digest",
    value: function digest() {
      var buffer = this.buffer,
          outputLen = this.outputLen;
      this.digestInto(buffer);
      var res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
  }, {
    key: "_cloneInto",
    value: function _cloneInto(to) {
      var _to;

      var buffer = this.buffer,
          length = this.length,
          finished = this.finished,
          destroyed = this.destroyed,
          outputLen = this.outputLen,
          pos = this.pos;
      to || (to = new this.constructor({
        dkLen: outputLen
      }));

      (_to = to).set.apply(_to, _toConsumableArray(this.get()));

      to.length = length;
      to.finished = finished;
      to.destroyed = destroyed;
      to.outputLen = outputLen;
      to.buffer.set(buffer);
      to.pos = pos;
      return to;
    }
  }]);

  return BLAKE2;
}(Hash);

var maybeJSBI$c = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
// prettier-ignore

var IV = new Uint32Array([0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85, 0xfe94f82b, 0x3c6ef372, 0x5f1d36f1, 0xa54ff53a, 0xade682d1, 0x510e527f, 0x2b3e6c1f, 0x9b05688c, 0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19]); // Temporary buffer

var BUF = new Uint32Array(32); // Mixing function G splitted in two halfs

function G1(a, b, c, d, msg, x) {
  // NOTE: V is LE here
  var Xl = msg[x],
      Xh = msg[x + 1]; // prettier-ignore

  var Al = BUF[2 * a],
      Ah = BUF[2 * a + 1]; // prettier-ignore

  var Bl = BUF[2 * b],
      Bh = BUF[2 * b + 1]; // prettier-ignore

  var Cl = BUF[2 * c],
      Ch = BUF[2 * c + 1]; // prettier-ignore

  var Dl = BUF[2 * d],
      Dh = BUF[2 * d + 1]; // prettier-ignore
  // v[a] = (v[a] + v[b] + x) | 0;

  var ll = add3L(Al, Bl, Xl);
  Ah = add3H(ll, Ah, Bh, Xh);
  Al = ll | 0; // v[d] = rotr(v[d] ^ v[a], 32)

  var _Dh$Dl = {
    Dh: maybeJSBI$c.bitwiseXor(Dh, Ah),
    Dl: maybeJSBI$c.bitwiseXor(Dl, Al)
  };
  Dh = _Dh$Dl.Dh;
  Dl = _Dh$Dl.Dl;
  var _Dh$Dl2 = {
    Dh: rotr32H(Dh, Dl),
    Dl: rotr32L(Dh)
  };
  Dh = _Dh$Dl2.Dh;
  Dl = _Dh$Dl2.Dl;

  var _u64$add = add(Ch, Cl, Dh, Dl);

  Ch = _u64$add.h;
  Cl = _u64$add.l;
  var _Bh$Bl = {
    Bh: maybeJSBI$c.bitwiseXor(Bh, Ch),
    Bl: maybeJSBI$c.bitwiseXor(Bl, Cl)
  };
  Bh = _Bh$Bl.Bh;
  Bl = _Bh$Bl.Bl;
  var _Bh$Bl2 = {
    Bh: rotrSH(Bh, Bl, 24),
    Bl: rotrSL(Bh, Bl, 24)
  };
  Bh = _Bh$Bl2.Bh;
  Bl = _Bh$Bl2.Bl;
  BUF[2 * a] = Al, BUF[2 * a + 1] = Ah;
  BUF[2 * b] = Bl, BUF[2 * b + 1] = Bh;
  BUF[2 * c] = Cl, BUF[2 * c + 1] = Ch;
  BUF[2 * d] = Dl, BUF[2 * d + 1] = Dh;
}

function G2(a, b, c, d, msg, x) {
  // NOTE: V is LE here
  var Xl = msg[x],
      Xh = msg[x + 1]; // prettier-ignore

  var Al = BUF[2 * a],
      Ah = BUF[2 * a + 1]; // prettier-ignore

  var Bl = BUF[2 * b],
      Bh = BUF[2 * b + 1]; // prettier-ignore

  var Cl = BUF[2 * c],
      Ch = BUF[2 * c + 1]; // prettier-ignore

  var Dl = BUF[2 * d],
      Dh = BUF[2 * d + 1]; // prettier-ignore
  // v[a] = (v[a] + v[b] + x) | 0;

  var ll = add3L(Al, Bl, Xl);
  Ah = add3H(ll, Ah, Bh, Xh);
  Al = ll | 0; // v[d] = rotr(v[d] ^ v[a], 16)

  var _Dh$Dl3 = {
    Dh: maybeJSBI$c.bitwiseXor(Dh, Ah),
    Dl: maybeJSBI$c.bitwiseXor(Dl, Al)
  };
  Dh = _Dh$Dl3.Dh;
  Dl = _Dh$Dl3.Dl;
  var _Dh$Dl4 = {
    Dh: rotrSH(Dh, Dl, 16),
    Dl: rotrSL(Dh, Dl, 16)
  };
  Dh = _Dh$Dl4.Dh;
  Dl = _Dh$Dl4.Dl;

  var _u64$add2 = add(Ch, Cl, Dh, Dl);

  Ch = _u64$add2.h;
  Cl = _u64$add2.l;
  var _Bh$Bl3 = {
    Bh: maybeJSBI$c.bitwiseXor(Bh, Ch),
    Bl: maybeJSBI$c.bitwiseXor(Bl, Cl)
  };
  Bh = _Bh$Bl3.Bh;
  Bl = _Bh$Bl3.Bl;
  var _Bh$Bl4 = {
    Bh: rotrBH(Bh, Bl, 63),
    Bl: rotrBL(Bh, Bl, 63)
  };
  Bh = _Bh$Bl4.Bh;
  Bl = _Bh$Bl4.Bl;
  BUF[2 * a] = Al, BUF[2 * a + 1] = Ah;
  BUF[2 * b] = Bl, BUF[2 * b + 1] = Bh;
  BUF[2 * c] = Cl, BUF[2 * c + 1] = Ch;
  BUF[2 * d] = Dl, BUF[2 * d + 1] = Dh;
}

var BLAKE2b = /*#__PURE__*/function (_blake2$BLAKE) {
  _inherits(BLAKE2b, _blake2$BLAKE);

  var _super = _createSuper(BLAKE2b);

  function BLAKE2b() {
    var _this;

    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, BLAKE2b);

    _this = _super.call(this, 128, opts.dkLen === undefined ? 64 : opts.dkLen, opts, 64, 16, 16); // Same as SHA-512, but LE

    _this.v0l = IV[0] | 0;
    _this.v0h = IV[1] | 0;
    _this.v1l = IV[2] | 0;
    _this.v1h = IV[3] | 0;
    _this.v2l = IV[4] | 0;
    _this.v2h = IV[5] | 0;
    _this.v3l = IV[6] | 0;
    _this.v3h = IV[7] | 0;
    _this.v4l = IV[8] | 0;
    _this.v4h = IV[9] | 0;
    _this.v5l = IV[10] | 0;
    _this.v5h = IV[11] | 0;
    _this.v6l = IV[12] | 0;
    _this.v6h = IV[13] | 0;
    _this.v7l = IV[14] | 0;
    _this.v7h = IV[15] | 0;
    var keyLength = opts.key ? opts.key.length : 0;
    _this.v0l ^= _this.outputLen | keyLength << 8 | 0x01 << 16 | 0x01 << 24;

    if (opts.salt) {
      var _x, _y, _x2, _y2, _x3, _y3, _x4, _y4;

      var salt = u32(toBytes(opts.salt));
      _x = _this, _y = "v4l", _x[_y] = maybeJSBI$c.bitwiseXor(_x[_y], salt[0]);
      _x2 = _this, _y2 = "v4h", _x2[_y2] = maybeJSBI$c.bitwiseXor(_x2[_y2], salt[1]);
      _x3 = _this, _y3 = "v5l", _x3[_y3] = maybeJSBI$c.bitwiseXor(_x3[_y3], salt[2]);
      _x4 = _this, _y4 = "v5h", _x4[_y4] = maybeJSBI$c.bitwiseXor(_x4[_y4], salt[3]);
    }

    if (opts.personalization) {
      var _x5, _y5, _x6, _y6, _x7, _y7, _x8, _y8;

      var pers = u32(toBytes(opts.personalization));
      _x5 = _this, _y5 = "v6l", _x5[_y5] = maybeJSBI$c.bitwiseXor(_x5[_y5], pers[0]);
      _x6 = _this, _y6 = "v6h", _x6[_y6] = maybeJSBI$c.bitwiseXor(_x6[_y6], pers[1]);
      _x7 = _this, _y7 = "v7l", _x7[_y7] = maybeJSBI$c.bitwiseXor(_x7[_y7], pers[2]);
      _x8 = _this, _y8 = "v7h", _x8[_y8] = maybeJSBI$c.bitwiseXor(_x8[_y8], pers[3]);
    }

    if (opts.key) {
      // Pad to blockLen and update
      var tmp = new Uint8Array(_this.blockLen);
      tmp.set(toBytes(opts.key));

      _this.update(tmp);
    }

    return _this;
  } // prettier-ignore


  _createClass(BLAKE2b, [{
    key: "get",
    value: function get() {
      var v0l = this.v0l,
          v0h = this.v0h,
          v1l = this.v1l,
          v1h = this.v1h,
          v2l = this.v2l,
          v2h = this.v2h,
          v3l = this.v3l,
          v3h = this.v3h,
          v4l = this.v4l,
          v4h = this.v4h,
          v5l = this.v5l,
          v5h = this.v5h,
          v6l = this.v6l,
          v6h = this.v6h,
          v7l = this.v7l,
          v7h = this.v7h;
      return [v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h];
    } // prettier-ignore

  }, {
    key: "set",
    value: function set(v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h) {
      this.v0l = v0l | 0;
      this.v0h = v0h | 0;
      this.v1l = v1l | 0;
      this.v1h = v1h | 0;
      this.v2l = v2l | 0;
      this.v2h = v2h | 0;
      this.v3l = v3l | 0;
      this.v3h = v3h | 0;
      this.v4l = v4l | 0;
      this.v4h = v4h | 0;
      this.v5l = v5l | 0;
      this.v5h = v5h | 0;
      this.v6l = v6l | 0;
      this.v6h = v6h | 0;
      this.v7l = v7l | 0;
      this.v7h = v7h | 0;
    }
  }, {
    key: "compress",
    value: function compress(msg, offset, isLast) {
      var _x9, _y9, _x10, _y10, _x11, _y11, _x12, _y12, _x13, _y13, _x14, _y14, _x15, _y15, _x16, _y16, _x17, _y17, _x18, _y18, _x19, _y19, _x20, _y20, _x21, _y21, _x22, _y22, _x23, _y23, _x24, _y24;

      this.get().forEach(function (v, i) {
        return BUF[i] = v;
      }); // First half from state.

      BUF.set(IV, 16); // Second half from IV.

      var _u64$fromBig = fromBig(JSBI.BigInt(this.length)),
          h = _u64$fromBig.h,
          l = _u64$fromBig.l;

      BUF[24] = maybeJSBI$c.bitwiseXor(IV[8], l); // Low word of the offset.

      BUF[25] = maybeJSBI$c.bitwiseXor(IV[9], h); // High word.
      // Invert all bits for last block

      if (isLast) {
        BUF[28] = maybeJSBI$c.bitwiseNot(BUF[28]);
        BUF[29] = maybeJSBI$c.bitwiseNot(BUF[29]);
      }

      var j = 0;
      var s = SIGMA;

      for (var i = 0; i < 12; i++) {
        G1(0, 4, 8, 12, msg, offset + 2 * s[j++]);
        G2(0, 4, 8, 12, msg, offset + 2 * s[j++]);
        G1(1, 5, 9, 13, msg, offset + 2 * s[j++]);
        G2(1, 5, 9, 13, msg, offset + 2 * s[j++]);
        G1(2, 6, 10, 14, msg, offset + 2 * s[j++]);
        G2(2, 6, 10, 14, msg, offset + 2 * s[j++]);
        G1(3, 7, 11, 15, msg, offset + 2 * s[j++]);
        G2(3, 7, 11, 15, msg, offset + 2 * s[j++]);
        G1(0, 5, 10, 15, msg, offset + 2 * s[j++]);
        G2(0, 5, 10, 15, msg, offset + 2 * s[j++]);
        G1(1, 6, 11, 12, msg, offset + 2 * s[j++]);
        G2(1, 6, 11, 12, msg, offset + 2 * s[j++]);
        G1(2, 7, 8, 13, msg, offset + 2 * s[j++]);
        G2(2, 7, 8, 13, msg, offset + 2 * s[j++]);
        G1(3, 4, 9, 14, msg, offset + 2 * s[j++]);
        G2(3, 4, 9, 14, msg, offset + 2 * s[j++]);
      }

      _x9 = this, _y9 = "v0l", _x9[_y9] = maybeJSBI$c.bitwiseXor(_x9[_y9], maybeJSBI$c.bitwiseXor(BUF[0], BUF[16]));
      _x10 = this, _y10 = "v0h", _x10[_y10] = maybeJSBI$c.bitwiseXor(_x10[_y10], maybeJSBI$c.bitwiseXor(BUF[1], BUF[17]));
      _x11 = this, _y11 = "v1l", _x11[_y11] = maybeJSBI$c.bitwiseXor(_x11[_y11], maybeJSBI$c.bitwiseXor(BUF[2], BUF[18]));
      _x12 = this, _y12 = "v1h", _x12[_y12] = maybeJSBI$c.bitwiseXor(_x12[_y12], maybeJSBI$c.bitwiseXor(BUF[3], BUF[19]));
      _x13 = this, _y13 = "v2l", _x13[_y13] = maybeJSBI$c.bitwiseXor(_x13[_y13], maybeJSBI$c.bitwiseXor(BUF[4], BUF[20]));
      _x14 = this, _y14 = "v2h", _x14[_y14] = maybeJSBI$c.bitwiseXor(_x14[_y14], maybeJSBI$c.bitwiseXor(BUF[5], BUF[21]));
      _x15 = this, _y15 = "v3l", _x15[_y15] = maybeJSBI$c.bitwiseXor(_x15[_y15], maybeJSBI$c.bitwiseXor(BUF[6], BUF[22]));
      _x16 = this, _y16 = "v3h", _x16[_y16] = maybeJSBI$c.bitwiseXor(_x16[_y16], maybeJSBI$c.bitwiseXor(BUF[7], BUF[23]));
      _x17 = this, _y17 = "v4l", _x17[_y17] = maybeJSBI$c.bitwiseXor(_x17[_y17], maybeJSBI$c.bitwiseXor(BUF[8], BUF[24]));
      _x18 = this, _y18 = "v4h", _x18[_y18] = maybeJSBI$c.bitwiseXor(_x18[_y18], maybeJSBI$c.bitwiseXor(BUF[9], BUF[25]));
      _x19 = this, _y19 = "v5l", _x19[_y19] = maybeJSBI$c.bitwiseXor(_x19[_y19], maybeJSBI$c.bitwiseXor(BUF[10], BUF[26]));
      _x20 = this, _y20 = "v5h", _x20[_y20] = maybeJSBI$c.bitwiseXor(_x20[_y20], maybeJSBI$c.bitwiseXor(BUF[11], BUF[27]));
      _x21 = this, _y21 = "v6l", _x21[_y21] = maybeJSBI$c.bitwiseXor(_x21[_y21], maybeJSBI$c.bitwiseXor(BUF[12], BUF[28]));
      _x22 = this, _y22 = "v6h", _x22[_y22] = maybeJSBI$c.bitwiseXor(_x22[_y22], maybeJSBI$c.bitwiseXor(BUF[13], BUF[29]));
      _x23 = this, _y23 = "v7l", _x23[_y23] = maybeJSBI$c.bitwiseXor(_x23[_y23], maybeJSBI$c.bitwiseXor(BUF[14], BUF[30]));
      _x24 = this, _y24 = "v7h", _x24[_y24] = maybeJSBI$c.bitwiseXor(_x24[_y24], maybeJSBI$c.bitwiseXor(BUF[15], BUF[31]));
      BUF.fill(0);
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.destroyed = true;
      this.buffer32.fill(0);
      this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
  }]);

  return BLAKE2b;
}(BLAKE2);
/**
 * BLAKE2b - optimized for 64-bit platforms. JS doesn't have uint64, so it's slower than BLAKE2s.
 * @param msg - message that would be hashed
 * @param opts - dkLen, key, salt, personalization
 */


var blake2b = wrapConstructorWithOpts(function (opts) {
  return new BLAKE2b(opts);
});

function createBitHasher(bitLength, fn) {
  return function (data, onlyJs) {
    return fn(data, bitLength, onlyJs);
  };
}
function createDualHasher(wa, js) {
  return function (value) {
    var bitLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 256;
    var onlyJs = arguments.length > 2 ? arguments[2] : undefined;
    var u8a = u8aToU8a(value);
    return !hasBigInt || !onlyJs && isReady() ? wa[bitLength](u8a) : js[bitLength](u8a);
  };
}

/**
 * @name blake2AsU8a
 * @summary Creates a blake2b u8a from the input.
 * @description
 * From a `Uint8Array` input, create the blake2b and return the result as a u8a with the specified `bitLength`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { blake2AsU8a } from '@polkadot/util-crypto';
 *
 * blake2AsU8a('abc'); // => [0xba, 0x80, 0xa5, 0x3f, 0x98, 0x1c, 0x4d, 0x0d]
 * ```
 */

function blake2AsU8a(data) {
  var bitLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 256;
  var key = arguments.length > 2 ? arguments[2] : undefined;
  var onlyJs = arguments.length > 3 ? arguments[3] : undefined;
  var byteLength = Math.ceil(bitLength / 8);
  var u8a = u8aToU8a(data);
  return !hasBigInt || !onlyJs && isReady() ? blake2b$1(u8a, u8aToU8a(key), byteLength) : blake2b(u8a, {
    dkLen: byteLength,
    key: key || undefined
  });
}

var SS58_PREFIX = stringToU8a('SS58PRE');
function sshash(key) {
  return blake2AsU8a(u8aConcat(SS58_PREFIX, key), 512);
}

var maybeJSBI$b = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
function checkAddressChecksum(decoded) {
  var ss58Length = decoded[0] & 64 ? 2 : 1;
  var ss58Decoded = ss58Length === 1 ? decoded[0] : (decoded[0] & 63) << 2 | decoded[1] >> 6 | (decoded[1] & 63) << 8; // 32/33 bytes public + 2 bytes checksum + prefix

  var isPublicKey = [34 + ss58Length, 35 + ss58Length].includes(decoded.length);
  var length = decoded.length - (isPublicKey ? 2 : 1); // calculate the hash and do the checksum byte checks

  var hash = sshash(decoded.subarray(0, length));
  var isValid = (decoded[0] & 128) === 0 && ![46, 47].includes(decoded[0]) && (isPublicKey ? maybeJSBI$b.equal(decoded[decoded.length - 2], hash[0]) && maybeJSBI$b.equal(decoded[decoded.length - 1], hash[1]) : maybeJSBI$b.equal(decoded[decoded.length - 1], hash[0]));
  return [isValid, length, ss58Length, ss58Decoded];
}

// Copyright (C) 2021-2022 Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// 	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var knownSubstrate = [{
  "prefix": 0,
  "network": "polkadot",
  "displayName": "Polkadot Relay Chain",
  "symbols": ["DOT"],
  "decimals": [10],
  "standardAccount": "*25519",
  "website": "https://polkadot.network"
}, {
  "prefix": 1,
  "network": "BareSr25519",
  "displayName": "Bare 32-bit Schnorr/Ristretto (S/R 25519) public key.",
  "symbols": [],
  "decimals": [],
  "standardAccount": "Sr25519",
  "website": null
}, {
  "prefix": 2,
  "network": "kusama",
  "displayName": "Kusama Relay Chain",
  "symbols": ["KSM"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://kusama.network"
}, {
  "prefix": 3,
  "network": "BareEd25519",
  "displayName": "Bare 32-bit Ed25519 public key.",
  "symbols": [],
  "decimals": [],
  "standardAccount": "Ed25519",
  "website": null
}, {
  "prefix": 4,
  "network": "katalchain",
  "displayName": "Katal Chain",
  "symbols": [],
  "decimals": [],
  "standardAccount": "*25519",
  "website": null
}, {
  "prefix": 5,
  "network": "astar",
  "displayName": "Astar Network",
  "symbols": ["ASTR"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://astar.network"
}, {
  "prefix": 6,
  "network": "bifrost",
  "displayName": "Bifrost",
  "symbols": ["BNC"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://bifrost.finance/"
}, {
  "prefix": 7,
  "network": "edgeware",
  "displayName": "Edgeware",
  "symbols": ["EDG"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://edgewa.re"
}, {
  "prefix": 8,
  "network": "karura",
  "displayName": "Karura",
  "symbols": ["KAR"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://karura.network/"
}, {
  "prefix": 9,
  "network": "reynolds",
  "displayName": "Laminar Reynolds Canary",
  "symbols": ["REY"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "http://laminar.network/"
}, {
  "prefix": 10,
  "network": "acala",
  "displayName": "Acala",
  "symbols": ["ACA"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://acala.network/"
}, {
  "prefix": 11,
  "network": "laminar",
  "displayName": "Laminar",
  "symbols": ["LAMI"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "http://laminar.network/"
}, {
  "prefix": 12,
  "network": "polymesh",
  "displayName": "Polymesh",
  "symbols": ["POLYX"],
  "decimals": [6],
  "standardAccount": "*25519",
  "website": "https://polymath.network/"
}, {
  "prefix": 13,
  "network": "integritee",
  "displayName": "Integritee",
  "symbols": ["TEER"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://integritee.network"
}, {
  "prefix": 14,
  "network": "totem",
  "displayName": "Totem",
  "symbols": ["TOTEM"],
  "decimals": [0],
  "standardAccount": "*25519",
  "website": "https://totemaccounting.com"
}, {
  "prefix": 15,
  "network": "synesthesia",
  "displayName": "Synesthesia",
  "symbols": ["SYN"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://synesthesia.network/"
}, {
  "prefix": 16,
  "network": "kulupu",
  "displayName": "Kulupu",
  "symbols": ["KLP"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://kulupu.network/"
}, {
  "prefix": 17,
  "network": "dark",
  "displayName": "Dark Mainnet",
  "symbols": [],
  "decimals": [],
  "standardAccount": "*25519",
  "website": null
}, {
  "prefix": 18,
  "network": "darwinia",
  "displayName": "Darwinia Network",
  "symbols": ["RING", "KTON"],
  "decimals": [9, 9],
  "standardAccount": "*25519",
  "website": "https://darwinia.network/"
}, {
  "prefix": 20,
  "network": "stafi",
  "displayName": "Stafi",
  "symbols": ["FIS"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://stafi.io"
}, {
  "prefix": 22,
  "network": "dock-pos-mainnet",
  "displayName": "Dock Mainnet",
  "symbols": ["DCK"],
  "decimals": [6],
  "standardAccount": "*25519",
  "website": "https://dock.io"
}, {
  "prefix": 23,
  "network": "shift",
  "displayName": "ShiftNrg",
  "symbols": [],
  "decimals": [],
  "standardAccount": "*25519",
  "website": null
}, {
  "prefix": 24,
  "network": "zero",
  "displayName": "ZERO",
  "symbols": ["ZERO"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://zero.io"
}, {
  "prefix": 25,
  "network": "zero-alphaville",
  "displayName": "ZERO Alphaville",
  "symbols": ["ZERO"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://zero.io"
}, {
  "prefix": 26,
  "network": "jupiter",
  "displayName": "Jupiter",
  "symbols": ["jDOT"],
  "decimals": [10],
  "standardAccount": "*25519",
  "website": "https://jupiter.patract.io"
}, {
  "prefix": 27,
  "network": "kabocha",
  "displayName": "Kabocha",
  "symbols": ["KAB"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://kabocha.network"
}, {
  "prefix": 28,
  "network": "subsocial",
  "displayName": "Subsocial",
  "symbols": [],
  "decimals": [],
  "standardAccount": "*25519",
  "website": null
}, {
  "prefix": 29,
  "network": "cord",
  "displayName": "CORD Network",
  "symbols": ["DHI", "WAY"],
  "decimals": [12, 12],
  "standardAccount": "*25519",
  "website": "https://cord.network/"
}, {
  "prefix": 30,
  "network": "phala",
  "displayName": "Phala Network",
  "symbols": ["PHA"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://phala.network"
}, {
  "prefix": 31,
  "network": "litentry",
  "displayName": "Litentry Network",
  "symbols": ["LIT"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://litentry.com/"
}, {
  "prefix": 32,
  "network": "robonomics",
  "displayName": "Robonomics",
  "symbols": ["XRT"],
  "decimals": [9],
  "standardAccount": "*25519",
  "website": "https://robonomics.network"
}, {
  "prefix": 33,
  "network": "datahighway",
  "displayName": "DataHighway",
  "symbols": [],
  "decimals": [],
  "standardAccount": "*25519",
  "website": null
}, {
  "prefix": 34,
  "network": "ares",
  "displayName": "Ares Protocol",
  "symbols": ["ARES"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://www.aresprotocol.com/"
}, {
  "prefix": 35,
  "network": "vln",
  "displayName": "Valiu Liquidity Network",
  "symbols": ["USDv"],
  "decimals": [15],
  "standardAccount": "*25519",
  "website": "https://valiu.com/"
}, {
  "prefix": 36,
  "network": "centrifuge",
  "displayName": "Centrifuge Chain",
  "symbols": ["CFG"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://centrifuge.io/"
}, {
  "prefix": 37,
  "network": "nodle",
  "displayName": "Nodle Chain",
  "symbols": ["NODL"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://nodle.io/"
}, {
  "prefix": 38,
  "network": "kilt",
  "displayName": "KILT Spiritnet",
  "symbols": ["KILT"],
  "decimals": [15],
  "standardAccount": "*25519",
  "website": "https://kilt.io/"
}, {
  "prefix": 39,
  "network": "mathchain",
  "displayName": "MathChain mainnet",
  "symbols": ["MATH"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://mathwallet.org"
}, {
  "prefix": 40,
  "network": "mathchain-testnet",
  "displayName": "MathChain testnet",
  "symbols": ["MATH"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://mathwallet.org"
}, {
  "prefix": 41,
  "network": "poli",
  "displayName": "Polimec Chain",
  "symbols": [],
  "decimals": [],
  "standardAccount": "*25519",
  "website": "https://polimec.io/"
}, {
  "prefix": 42,
  "network": "substrate",
  "displayName": "Substrate",
  "symbols": [],
  "decimals": [],
  "standardAccount": "*25519",
  "website": "https://substrate.io/"
}, {
  "prefix": 43,
  "network": "BareSecp256k1",
  "displayName": "Bare 32-bit ECDSA SECP-256k1 public key.",
  "symbols": [],
  "decimals": [],
  "standardAccount": "secp256k1",
  "website": null
}, {
  "prefix": 44,
  "network": "chainx",
  "displayName": "ChainX",
  "symbols": ["PCX"],
  "decimals": [8],
  "standardAccount": "*25519",
  "website": "https://chainx.org/"
}, {
  "prefix": 45,
  "network": "uniarts",
  "displayName": "UniArts Network",
  "symbols": ["UART", "UINK"],
  "decimals": [12, 12],
  "standardAccount": "*25519",
  "website": "https://uniarts.me"
}, {
  "prefix": 46,
  "network": "reserved46",
  "displayName": "This prefix is reserved.",
  "symbols": [],
  "decimals": [],
  "standardAccount": null,
  "website": null
}, {
  "prefix": 47,
  "network": "reserved47",
  "displayName": "This prefix is reserved.",
  "symbols": [],
  "decimals": [],
  "standardAccount": null,
  "website": null
}, {
  "prefix": 48,
  "network": "neatcoin",
  "displayName": "Neatcoin Mainnet",
  "symbols": ["NEAT"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://neatcoin.org"
}, {
  "prefix": 49,
  "network": "picasso",
  "displayName": "Picasso",
  "symbols": ["PICA"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://picasso.composable.finance"
}, {
  "prefix": 50,
  "network": "composable",
  "displayName": "Composable",
  "symbols": ["LAYR"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://composable.finance"
}, {
  "prefix": 51,
  "network": "oak",
  "displayName": "OAK Network",
  "symbols": ["OAK"],
  "decimals": [10],
  "standardAccount": "*25519",
  "website": "https://oak.tech"
}, {
  "prefix": 52,
  "network": "KICO",
  "displayName": "KICO",
  "symbols": ["KICO"],
  "decimals": [14],
  "standardAccount": "*25519",
  "website": "https://dico.io"
}, {
  "prefix": 53,
  "network": "DICO",
  "displayName": "DICO",
  "symbols": ["DICO"],
  "decimals": [14],
  "standardAccount": "*25519",
  "website": "https://dico.io"
}, {
  "prefix": 54,
  "network": "cere",
  "displayName": "Cere Network",
  "symbols": ["CERE"],
  "decimals": [10],
  "standardAccount": "*25519",
  "website": "https://cere.network"
}, {
  "prefix": 55,
  "network": "xxnetwork",
  "displayName": "xx network",
  "symbols": ["XX"],
  "decimals": [9],
  "standardAccount": "*25519",
  "website": "https://xx.network"
}, {
  "prefix": 63,
  "network": "hydradx",
  "displayName": "HydraDX",
  "symbols": ["HDX"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://hydradx.io"
}, {
  "prefix": 65,
  "network": "aventus",
  "displayName": "AvN Mainnet",
  "symbols": ["AVT"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://aventus.io"
}, {
  "prefix": 66,
  "network": "crust",
  "displayName": "Crust Network",
  "symbols": ["CRU"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://crust.network"
}, {
  "prefix": 67,
  "network": "genshiro",
  "displayName": "Genshiro Network",
  "symbols": ["GENS", "EQD", "LPT0"],
  "decimals": [9, 9, 9],
  "standardAccount": "*25519",
  "website": "https://genshiro.equilibrium.io"
}, {
  "prefix": 68,
  "network": "equilibrium",
  "displayName": "Equilibrium Network",
  "symbols": ["EQ"],
  "decimals": [9],
  "standardAccount": "*25519",
  "website": "https://equilibrium.io"
}, {
  "prefix": 69,
  "network": "sora",
  "displayName": "SORA Network",
  "symbols": ["XOR"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://sora.org"
}, {
  "prefix": 73,
  "network": "zeitgeist",
  "displayName": "Zeitgeist",
  "symbols": ["ZTG"],
  "decimals": [10],
  "standardAccount": "*25519",
  "website": "https://zeitgeist.pm"
}, {
  "prefix": 77,
  "network": "manta",
  "displayName": "Manta network",
  "symbols": ["MANTA"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://manta.network"
}, {
  "prefix": 78,
  "network": "calamari",
  "displayName": "Calamari: Manta Canary Network",
  "symbols": ["KMA"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://manta.network"
}, {
  "prefix": 88,
  "network": "polkadex",
  "displayName": "Polkadex Mainnet",
  "symbols": ["PDEX"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://polkadex.trade"
}, {
  "prefix": 89,
  "network": "polkadexparachain",
  "displayName": "Polkadex Parachain",
  "symbols": ["PDEX"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://polkadex.trade"
}, {
  "prefix": 93,
  "network": "fragnova",
  "displayName": "Fragnova Network",
  "symbols": ["NOVA"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://fragnova.com"
}, {
  "prefix": 98,
  "network": "polkasmith",
  "displayName": "PolkaSmith Canary Network",
  "symbols": ["PKS"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://polkafoundry.com"
}, {
  "prefix": 99,
  "network": "polkafoundry",
  "displayName": "PolkaFoundry Network",
  "symbols": ["PKF"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://polkafoundry.com"
}, {
  "prefix": 101,
  "network": "origintrail-parachain",
  "displayName": "OriginTrail Parachain",
  "symbols": ["OTP"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://parachain.origintrail.io/"
}, {
  "prefix": 105,
  "network": "pontem-network",
  "displayName": "Pontem Network",
  "symbols": ["PONT"],
  "decimals": [10],
  "standardAccount": "*25519",
  "website": "https://pontem.network"
}, {
  "prefix": 110,
  "network": "heiko",
  "displayName": "Heiko",
  "symbols": ["HKO"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://parallel.fi/"
}, {
  "prefix": 113,
  "network": "integritee-incognito",
  "displayName": "Integritee Incognito",
  "symbols": [],
  "decimals": [],
  "standardAccount": "*25519",
  "website": "https://integritee.network"
}, {
  "prefix": 117,
  "network": "tinker",
  "displayName": "Tinker",
  "symbols": ["TNKR"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://invarch.network"
}, {
  "prefix": 128,
  "network": "clover",
  "displayName": "Clover Finance",
  "symbols": ["CLV"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://clover.finance"
}, {
  "prefix": 131,
  "network": "litmus",
  "displayName": "Litmus Network",
  "symbols": ["LIT"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://litentry.com/"
}, {
  "prefix": 136,
  "network": "altair",
  "displayName": "Altair",
  "symbols": ["AIR"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://centrifuge.io/"
}, {
  "prefix": 172,
  "network": "parallel",
  "displayName": "Parallel",
  "symbols": ["PARA"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://parallel.fi/"
}, {
  "prefix": 252,
  "network": "social-network",
  "displayName": "Social Network",
  "symbols": ["NET"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://social.network"
}, {
  "prefix": 255,
  "network": "quartz_mainnet",
  "displayName": "QUARTZ by UNIQUE",
  "symbols": ["QTZ"],
  "decimals": [15],
  "standardAccount": "*25519",
  "website": "https://unique.network"
}, {
  "prefix": 268,
  "network": "pioneer_network",
  "displayName": "Pioneer Network by Bit.Country",
  "symbols": ["NEER"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://bit.country"
}, {
  "prefix": 420,
  "network": "sora_kusama_para",
  "displayName": "SORA Kusama Parachain",
  "symbols": ["XOR"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://sora.org"
}, {
  "prefix": 789,
  "network": "geek",
  "displayName": "GEEK Network",
  "symbols": ["GEEK"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://geek.gl"
}, {
  "prefix": 1110,
  "network": "efinity",
  "displayName": "Efinity",
  "symbols": ["EFI"],
  "decimals": [18],
  "standardAccount": "Sr25519",
  "website": "https://efinity.io/"
}, {
  "prefix": 1284,
  "network": "moonbeam",
  "displayName": "Moonbeam",
  "symbols": ["GLMR"],
  "decimals": [18],
  "standardAccount": "secp256k1",
  "website": "https://moonbeam.network"
}, {
  "prefix": 1285,
  "network": "moonriver",
  "displayName": "Moonriver",
  "symbols": ["MOVR"],
  "decimals": [18],
  "standardAccount": "secp256k1",
  "website": "https://moonbeam.network"
}, {
  "prefix": 1328,
  "network": "ajuna",
  "displayName": "Ajuna Network",
  "symbols": ["AJUN"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://ajuna.io"
}, {
  "prefix": 1337,
  "network": "bajun",
  "displayName": "Bajun Network",
  "symbols": ["BAJU"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://ajuna.io"
}, {
  "prefix": 2007,
  "network": "kapex",
  "displayName": "Kapex",
  "symbols": ["KAPEX"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://totemaccounting.com"
}, {
  "prefix": 2032,
  "network": "interlay",
  "displayName": "Interlay",
  "symbols": ["INTR"],
  "decimals": [10],
  "standardAccount": "*25519",
  "website": "https://interlay.io/"
}, {
  "prefix": 2092,
  "network": "kintsugi",
  "displayName": "Kintsugi",
  "symbols": ["KINT"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://interlay.io/"
}, {
  "prefix": 2254,
  "network": "subspace_testnet",
  "displayName": "Subspace testnet",
  "symbols": ["tSSC"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://subspace.network"
}, {
  "prefix": 6094,
  "network": "subspace",
  "displayName": "Subspace",
  "symbols": ["SSC"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://subspace.network"
}, {
  "prefix": 7007,
  "network": "tidefi",
  "displayName": "Tidefi",
  "symbols": ["TIFI"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://tidefi.com"
}, {
  "prefix": 7391,
  "network": "unique_mainnet",
  "displayName": "Unique Network",
  "symbols": ["UNQ"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://unique.network"
}, {
  "prefix": 9807,
  "network": "dentnet",
  "displayName": "DENTNet",
  "symbols": ["DENTX"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://www.dentnet.io"
}, {
  "prefix": 10041,
  "network": "basilisk",
  "displayName": "Basilisk",
  "symbols": ["BSX"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://bsx.fi"
}, {
  "prefix": 11330,
  "network": "cess-testnet",
  "displayName": "CESS Testnet",
  "symbols": ["TCESS"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://cess.cloud"
}, {
  "prefix": 11331,
  "network": "cess",
  "displayName": "CESS",
  "symbols": ["CESS"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://cess.cloud"
}, {
  "prefix": 11820,
  "network": "contextfree",
  "displayName": "Automata ContextFree",
  "symbols": ["CTX"],
  "decimals": [18],
  "standardAccount": "*25519",
  "website": "https://ata.network"
}, {
  "prefix": 12191,
  "network": "nftmart",
  "displayName": "NFTMart",
  "symbols": ["NMT"],
  "decimals": [12],
  "standardAccount": "*25519",
  "website": "https://nftmart.io"
}];

// Copyright 2017-2022 @polkadot/networks authors & contributors
// SPDX-License-Identifier: Apache-2.0
// NOTE: In the case where the network was hard-spooned and multiple genesisHashes
// are provided, it needs to be in reverse order, i.e. most-recent first, oldest
// last. This make lookups for the current a simple genesisHash[0]
// (See Kusama as an example)
var knownGenesis = {
  acala: ['0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c'],
  astar: ['0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6'],
  basilisk: ['0xa85cfb9b9fd4d622a5b28289a02347af987d8f73fa3108450e2b4a11c1ce5755'],
  bifrost: ['0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed'],
  centrifuge: ['0x67dddf2673b69e5f875f6f25277495834398eafd67f492e09f3f3345e003d1b5'],
  'dock-mainnet': ['0x6bfe24dca2a3be10f22212678ac13a6446ec764103c0f3471c71609eac384aae', '0xf73467c6544aa68df2ee546b135f955c46b90fa627e9b5d7935f41061bb8a5a9'],
  edgeware: ['0x742a2ca70c2fda6cee4f8df98d64c4c670a052d9568058982dad9d5a7a135c5b'],
  equilibrium: ['0x6f1a800de3daff7f5e037ddf66ab22ce03ab91874debeddb1086f5f7dbd48925'],
  genshiro: ['0x9b8cefc0eb5c568b527998bdd76c184e2b76ae561be76e4667072230217ea243'],
  hydradx: ['0xd2a620c27ec5cbc5621ff9a522689895074f7cca0d08e7134a7804e1a3ba86fc', // Snakenet Gen3-1
  '0x10af6e84234477d84dc572bac0789813b254aa490767ed06fb9591191d1073f9', // Snakenet Gen3
  '0x3d75507dd46301767e601265791da1d9cb47b6ebc94e87347b635e5bf58bd047', // Snakenet Gen2
  '0x0ed32bfcab4a83517fac88f2aa7cbc2f88d3ab93be9a12b6188a036bf8a943c2' // Snakenet Gen1
  ],
  karura: ['0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b'],
  kulupu: ['0xf7a99d3cb92853d00d5275c971c132c074636256583fee53b3bbe60d7b8769ba'],
  kusama: ['0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe', // Kusama CC3,
  '0xe3777fa922cafbff200cadeaea1a76bd7898ad5b89f7848999058b50e715f636', // Kusama CC2
  '0x3fd7b9eb6a00376e5be61f01abb429ffb0b104be05eaff4d458da48fcd425baf' // Kusama CC1
  ],
  'nodle-chain': ['0xa3d114c2b8d0627c1aa9b134eafcf7d05ca561fdc19fb388bb9457f81809fb23'],
  picasso: ['0xe8e7f0f4c4f5a00720b4821dbfddefea7490bcf0b19009961cc46957984e2c1c'],
  polkadot: ['0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'],
  polymesh: ['0x6fbd74e5e1d0a61d52ccfe9d4adaed16dd3a7caa37c6bc4d0c2fa12e8b2f4063'],
  rococo: ['0xaaf2cd1b74b5f726895921259421b534124726263982522174147046b8827897', '0x037f5f3c8e67b314062025fc886fcd6238ea25a4a9b45dce8d246815c9ebe770', '0xc196f81260cf1686172b47a79cf002120735d7cb0eb1474e8adce56618456fff', '0xf6e9983c37baf68846fedafe21e56718790e39fb1c582abc408b81bc7b208f9a', '0x5fce687da39305dfe682b117f0820b319348e8bb37eb16cf34acbf6a202de9d9', '0xe7c3d5edde7db964317cd9b51a3a059d7cd99f81bdbce14990047354334c9779', '0x1611e1dbf0405379b861e2e27daa90f480b2e6d3682414a80835a52e8cb8a215', '0x343442f12fa715489a8714e79a7b264ea88c0d5b8c66b684a7788a516032f6b9', '0x78bcd530c6b3a068bc17473cf5d2aff9c287102bed9af3ae3c41c33b9d6c6147', '0x47381ee0697153d64404fc578392c8fd5cba9073391908f46c888498415647bd', '0x19c0e4fa8ab75f5ac7865e0b8f74ff91eb9a100d336f423cd013a8befba40299'],
  sora: ['0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5'],
  stafi: ['0x290a4149f09ea0e402c74c1c7e96ae4239588577fe78932f94f5404c68243d80'],
  statemine: ['0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a'],
  subsocial: ['0x0bd72c1c305172e1275278aaeb3f161e02eccb7a819e63f62d47bd53a28189f8'],
  westend: ['0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e']
};

// Copyright 2017-2022 @polkadot/networks authors & contributors
// SPDX-License-Identifier: Apache-2.0
// these are icon overrides
var knownIcon = {
  centrifuge: 'polkadot',
  kusama: 'polkadot',
  polkadot: 'polkadot',
  sora: 'polkadot',
  statemine: 'polkadot',
  statemint: 'polkadot',
  westmint: 'polkadot'
};

// Copyright 2017-2022 @polkadot/networks authors & contributors
// SPDX-License-Identifier: Apache-2.0
// These match up with the keys of the ledgerApps object in the @polkadot/hw-ledger/defaults.ts
// and maps to the known slip44 (minus the `0x8` hard derivation flag)
//
// NOTE: Any network here needs to have a genesisHash attached in the ./genesis.ts config
var knownLedger = {
  bifrost: 0x00000314,
  centrifuge: 0x000002eb,
  'dock-mainnet': 0x00000252,
  edgeware: 0x0000020b,
  equilibrium: 0x05f5e0fd,
  genshiro: 0x05f5e0fc,
  kusama: 0x000001b2,
  'nodle-chain': 0x000003eb,
  polkadot: 0x00000162,
  polymesh: 0x00000253,
  sora: 0x00000269,
  statemine: 0x000001b2 // common-good on Kusama, shares derivation

};

// Copyright 2017-2022 @polkadot/networks authors & contributors
// SPDX-License-Identifier: Apache-2.0
// testnets should not allow selection
var knownTestnet = {
  '': true,
  // this is the default non-network entry
  'cess-testnet': true,
  'dock-testnet': true,
  jupiter: true,
  'mathchain-testnet': true,
  subspace_testnet: true,
  'zero-alphaville': true
};

var maybeJSBI$a = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

var UNSORTED = [0, 2, 42];
var TESTNETS = ['testnet'];

function toExpanded(o) {
  var network = o.network || '';
  var nameParts = network.replace(/_/g, '-').split('-');
  var n = o; // ledger additions

  n.slip44 = knownLedger[network];
  n.hasLedgerSupport = !!n.slip44; // general items

  n.genesisHash = knownGenesis[network] || [];
  n.icon = knownIcon[network] || 'substrate'; // filtering

  n.isTestnet = !!knownTestnet[network] || TESTNETS.includes(nameParts[nameParts.length - 1]);
  n.isIgnored = n.isTestnet || !(o.standardAccount && o.decimals && o.decimals.length && o.symbols && o.symbols.length) && o.prefix !== 42;
  return n;
}

function filterSelectable(_ref) {
  var genesisHash = _ref.genesisHash,
      prefix = _ref.prefix;
  return !!genesisHash.length || prefix === 42;
}

function filterAvailable(n) {
  return !n.isIgnored && !!n.network;
}

function sortNetworks(a, b) {
  var isUnSortedA = UNSORTED.includes(a.prefix);
  var isUnSortedB = UNSORTED.includes(b.prefix);
  return maybeJSBI$a.equal(isUnSortedA, isUnSortedB) ? isUnSortedA ? 0 : a.displayName.localeCompare(b.displayName) : isUnSortedA ? -1 : 1;
} // This is all the Substrate networks with our additional information


var allNetworks = knownSubstrate.map(toExpanded); // The list of available/claimed prefixes
//   - no testnets
//   - we only include those where we have a standardAccount
//   - sort by name, however we keep 0, 2, 42 first in the list

var availableNetworks = allNetworks.filter(filterAvailable).sort(sortNetworks); // A filtered list of those chains we have details about (genesisHashes)

availableNetworks.filter(filterSelectable);

function networkToPrefix(_ref) {
  var prefix = _ref.prefix;
  return prefix;
}

var defaults = {
  allowedDecodedLengths: [1, 2, 4, 8, 32, 33],
  // publicKey has prefix + 2 checksum bytes, short only prefix + 1 checksum byte
  allowedEncodedLengths: [3, 4, 6, 10, 35, 36, 37, 38],
  allowedPrefix: availableNetworks.map(networkToPrefix),
  prefix: 42
};

function decodeAddress(encoded, ignoreChecksum) {
  var ss58Format = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : -1;
  assert(encoded, 'Invalid empty address passed');

  if (isU8a(encoded) || isHex(encoded)) {
    return u8aToU8a(encoded);
  }

  try {
    var decoded = base58Decode(encoded);
    assert(defaults.allowedEncodedLengths.includes(decoded.length), 'Invalid decoded address length');

    var _checkAddressChecksum = checkAddressChecksum(decoded),
        _checkAddressChecksum2 = _slicedToArray(_checkAddressChecksum, 4),
        isValid = _checkAddressChecksum2[0],
        endPos = _checkAddressChecksum2[1],
        ss58Length = _checkAddressChecksum2[2],
        ss58Decoded = _checkAddressChecksum2[3];

    assert(ignoreChecksum || isValid, 'Invalid decoded address checksum');
    assert([-1, ss58Decoded].includes(ss58Format), function () {
      return "Expected ss58Format ".concat(ss58Format, ", received ").concat(ss58Decoded);
    });
    return decoded.slice(ss58Length, endPos);
  } catch (error) {
    throw new Error("Decoding ".concat(encoded, ": ").concat(error.message));
  }
}

// Copyright 2017-2022 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
var BN_BE_OPTS = {
  isLe: false
};
var BN_LE_OPTS = {
  isLe: true
};
var BN_BE_32_OPTS = {
  bitLength: 32,
  isLe: false
};
var BN_LE_32_OPTS = {
  bitLength: 32,
  isLe: true
};
var BN_BE_256_OPTS = {
  bitLength: 256,
  isLe: false
};
var BN_LE_256_OPTS = {
  bitLength: 256,
  isLe: true
};

var RE_NUMBER = /^\d+$/;
var JUNCTION_ID_LEN = 32;

var _chainCode = /*#__PURE__*/new WeakMap();

var _isHard = /*#__PURE__*/new WeakMap();

var DeriveJunction = /*#__PURE__*/function () {
  function DeriveJunction() {
    _classCallCheck(this, DeriveJunction);

    _classPrivateFieldInitSpec(this, _chainCode, {
      writable: true,
      value: new Uint8Array(32)
    });

    _classPrivateFieldInitSpec(this, _isHard, {
      writable: true,
      value: false
    });
  }

  _createClass(DeriveJunction, [{
    key: "chainCode",
    get: function get() {
      return _classPrivateFieldGet(this, _chainCode);
    }
  }, {
    key: "isHard",
    get: function get() {
      return _classPrivateFieldGet(this, _isHard);
    }
  }, {
    key: "isSoft",
    get: function get() {
      return !_classPrivateFieldGet(this, _isHard);
    }
  }, {
    key: "hard",
    value: function hard(value) {
      return this.soft(value).harden();
    }
  }, {
    key: "harden",
    value: function harden() {
      _classPrivateFieldSet(this, _isHard, true);

      return this;
    }
  }, {
    key: "soft",
    value: function soft(value) {
      if (isNumber(value) || isBn(value) || isBigInt(value)) {
        return this.soft(bnToU8a(value, BN_LE_256_OPTS));
      } else if (isHex(value)) {
        return this.soft(hexToU8a(value));
      } else if (isString(value)) {
        return this.soft(compactAddLength(stringToU8a(value)));
      } else if (value.length > JUNCTION_ID_LEN) {
        return this.soft(blake2AsU8a(value));
      }

      _classPrivateFieldGet(this, _chainCode).fill(0);

      _classPrivateFieldGet(this, _chainCode).set(value, 0);

      return this;
    }
  }, {
    key: "soften",
    value: function soften() {
      _classPrivateFieldSet(this, _isHard, false);

      return this;
    }
  }], [{
    key: "from",
    value: function from(value) {
      var result = new DeriveJunction();

      var _ref = value.startsWith('/') ? [value.substr(1), true] : [value, false],
          _ref2 = _slicedToArray(_ref, 2),
          code = _ref2[0],
          isHard = _ref2[1];

      result.soft(RE_NUMBER.test(code) ? new BN(code, 10) : code);
      return isHard ? result.harden() : result;
    }
  }]);

  return DeriveJunction;
}();

var RE_JUNCTION = /\/(\/?)([^/]+)/g;
/**
 * @description Extract derivation junctions from the supplied path
 */

function keyExtractPath(derivePath) {
  var parts = derivePath.match(RE_JUNCTION);
  var path = [];
  var constructed = '';

  if (parts) {
    constructed = parts.join('');

    var _iterator = _createForOfIteratorHelper(parts),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var p = _step.value;
        path.push(DeriveJunction.from(p.substr(1)));
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  assert(constructed === derivePath, function () {
    return "Re-constructed path \"".concat(constructed, "\" does not match input");
  });
  return {
    parts: parts,
    path: path
  };
}

var RE_CAPTURE = /^(\w+( \w+)*)((\/\/?[^/]+)*)(\/\/\/(.*))?$/;
/**
 * @description Extracts the phrase, path and password from a SURI format for specifying secret keys `<secret>/<soft-key>//<hard-key>///<password>` (the `///password` may be omitted, and `/<soft-key>` and `//<hard-key>` maybe repeated and mixed).
 */

function keyExtractSuri(suri) {
  // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
  var matches = suri.match(RE_CAPTURE);
  assert(!isNull(matches), 'Unable to match provided value to a secret URI');

  var _matches = _slicedToArray(matches, 7),
      phrase = _matches[1],
      derivePath = _matches[3],
      password = _matches[6];

  var _keyExtractPath = keyExtractPath(derivePath),
      path = _keyExtractPath.path;

  return {
    derivePath: derivePath,
    password: password,
    path: path,
    phrase: phrase
  };
}

var HDKD$1 = compactAddLength(stringToU8a('Secp256k1HDKD'));
function secp256k1DeriveHard(seed, chainCode) {
  assert(isU8a(chainCode) && chainCode.length === 32, 'Invalid chainCode passed to derive'); // NOTE This is specific to the Substrate HDD derivation, so always use the blake2 hasher

  return blake2AsU8a(u8aConcat(HDKD$1, seed, chainCode), 256);
}

/**
 * @name secp256k1PairFromSeed
 * @description Returns a object containing a `publicKey` & `secretKey` generated from the supplied seed.
 */

function secp256k1PairFromSeed(seed, onlyJs) {
  assert(seed.length === 32, 'Expected valid 32-byte private key as a seed');

  if (!hasBigInt || !onlyJs && isReady()) {
    var full = secp256k1FromSeed(seed);
    var publicKey = full.slice(32); // There is an issue with the secp256k1 when running in an ASM.js environment where
    // it seems that the lazy static section yields invalid results on the _first_ run.
    // If this happens, fail outright, we cannot allow invalid return values
    // https://github.com/polkadot-js/wasm/issues/307

    assert(!u8aEmpty(publicKey), 'Invalid publicKey generated from WASM interface');
    return {
      publicKey: publicKey,
      secretKey: full.slice(0, 32)
    };
  }

  return {
    publicKey: getPublicKey(seed, true),
    secretKey: seed
  };
}

function createSeedDeriveFn(fromSeed, derive) {
  return function (keypair, _ref) {
    var chainCode = _ref.chainCode,
        isHard = _ref.isHard;
    assert(isHard, 'A soft key was found in the path and is not supported');
    return fromSeed(derive(keypair.secretKey.subarray(0, 32), chainCode));
  };
}

var keyHdkdEcdsa = createSeedDeriveFn(secp256k1PairFromSeed, secp256k1DeriveHard);

var ed2curve$1 = createModule("/$$rollup_base$$/node_modules/ed2curve");

var naclFast = createModule("/$$rollup_base$$/node_modules/tweetnacl");

var maybeJSBI$9 = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

(function (module) {
  (function (nacl) {
    // Public domain.
    //
    // Implementation derived from TweetNaCl version 20140427.
    // See for details: http://tweetnacl.cr.yp.to/

    var gf = function gf(init) {
      var i,
          r = new Float64Array(16);
      if (init) for (i = 0; maybeJSBI$9.lessThan(i, init.length); _x = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x) {
        var _x;

        r[i] = init[i];
      }
      return r;
    }; //  Pluggable, initialized in high-level API below.


    var randombytes = function
      /* x, n */
    randombytes() {
      throw new Error('no PRNG');
    };

    var _0 = new Uint8Array(16);

    var _9 = new Uint8Array(32);

    _9[0] = 9;

    var gf0 = gf(),
        gf1 = gf([1]),
        _121665 = gf([0xdb41, 1]),
        D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
        D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
        X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
        Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
        I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

    function ts64(x, i, h, l) {
      x[i] = h >> 24 & 0xff;
      x[i + 1] = h >> 16 & 0xff;
      x[i + 2] = h >> 8 & 0xff;
      x[i + 3] = h & 0xff;
      x[i + 4] = l >> 24 & 0xff;
      x[i + 5] = l >> 16 & 0xff;
      x[i + 6] = l >> 8 & 0xff;
      x[i + 7] = l & 0xff;
    }

    function vn(x, xi, y, yi, n) {
      var i,
          d = 0;

      for (i = 0; maybeJSBI$9.lessThan(i, n); _x2 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x2) {
        var _x2;

        d |= maybeJSBI$9.bitwiseXor(x[maybeJSBI$9.add(xi, i)], y[maybeJSBI$9.add(yi, i)]);
      }

      return (1 & d - 1 >>> 8) - 1;
    }

    function crypto_verify_16(x, xi, y, yi) {
      return vn(x, xi, y, yi, 16);
    }

    function crypto_verify_32(x, xi, y, yi) {
      return vn(x, xi, y, yi, 32);
    }

    function core_salsa20(o, p, k, c) {
      var j0 = c[0] & 0xff | (c[1] & 0xff) << 8 | (c[2] & 0xff) << 16 | (c[3] & 0xff) << 24,
          j1 = k[0] & 0xff | (k[1] & 0xff) << 8 | (k[2] & 0xff) << 16 | (k[3] & 0xff) << 24,
          j2 = k[4] & 0xff | (k[5] & 0xff) << 8 | (k[6] & 0xff) << 16 | (k[7] & 0xff) << 24,
          j3 = k[8] & 0xff | (k[9] & 0xff) << 8 | (k[10] & 0xff) << 16 | (k[11] & 0xff) << 24,
          j4 = k[12] & 0xff | (k[13] & 0xff) << 8 | (k[14] & 0xff) << 16 | (k[15] & 0xff) << 24,
          j5 = c[4] & 0xff | (c[5] & 0xff) << 8 | (c[6] & 0xff) << 16 | (c[7] & 0xff) << 24,
          j6 = p[0] & 0xff | (p[1] & 0xff) << 8 | (p[2] & 0xff) << 16 | (p[3] & 0xff) << 24,
          j7 = p[4] & 0xff | (p[5] & 0xff) << 8 | (p[6] & 0xff) << 16 | (p[7] & 0xff) << 24,
          j8 = p[8] & 0xff | (p[9] & 0xff) << 8 | (p[10] & 0xff) << 16 | (p[11] & 0xff) << 24,
          j9 = p[12] & 0xff | (p[13] & 0xff) << 8 | (p[14] & 0xff) << 16 | (p[15] & 0xff) << 24,
          j10 = c[8] & 0xff | (c[9] & 0xff) << 8 | (c[10] & 0xff) << 16 | (c[11] & 0xff) << 24,
          j11 = k[16] & 0xff | (k[17] & 0xff) << 8 | (k[18] & 0xff) << 16 | (k[19] & 0xff) << 24,
          j12 = k[20] & 0xff | (k[21] & 0xff) << 8 | (k[22] & 0xff) << 16 | (k[23] & 0xff) << 24,
          j13 = k[24] & 0xff | (k[25] & 0xff) << 8 | (k[26] & 0xff) << 16 | (k[27] & 0xff) << 24,
          j14 = k[28] & 0xff | (k[29] & 0xff) << 8 | (k[30] & 0xff) << 16 | (k[31] & 0xff) << 24,
          j15 = c[12] & 0xff | (c[13] & 0xff) << 8 | (c[14] & 0xff) << 16 | (c[15] & 0xff) << 24;
      var x0 = j0,
          x1 = j1,
          x2 = j2,
          x3 = j3,
          x4 = j4,
          x5 = j5,
          x6 = j6,
          x7 = j7,
          x8 = j8,
          x9 = j9,
          x10 = j10,
          x11 = j11,
          x12 = j12,
          x13 = j13,
          x14 = j14,
          x15 = j15,
          u;

      for (var i = 0; i < 20; i += 2) {
        u = x0 + x12 | 0;
        x4 ^= u << 7 | u >>> 32 - 7;
        u = x4 + x0 | 0;
        x8 ^= u << 9 | u >>> 32 - 9;
        u = x8 + x4 | 0;
        x12 ^= u << 13 | u >>> 32 - 13;
        u = x12 + x8 | 0;
        x0 ^= u << 18 | u >>> 32 - 18;
        u = x5 + x1 | 0;
        x9 ^= u << 7 | u >>> 32 - 7;
        u = x9 + x5 | 0;
        x13 ^= u << 9 | u >>> 32 - 9;
        u = x13 + x9 | 0;
        x1 ^= u << 13 | u >>> 32 - 13;
        u = x1 + x13 | 0;
        x5 ^= u << 18 | u >>> 32 - 18;
        u = x10 + x6 | 0;
        x14 ^= u << 7 | u >>> 32 - 7;
        u = x14 + x10 | 0;
        x2 ^= u << 9 | u >>> 32 - 9;
        u = x2 + x14 | 0;
        x6 ^= u << 13 | u >>> 32 - 13;
        u = x6 + x2 | 0;
        x10 ^= u << 18 | u >>> 32 - 18;
        u = x15 + x11 | 0;
        x3 ^= u << 7 | u >>> 32 - 7;
        u = x3 + x15 | 0;
        x7 ^= u << 9 | u >>> 32 - 9;
        u = x7 + x3 | 0;
        x11 ^= u << 13 | u >>> 32 - 13;
        u = x11 + x7 | 0;
        x15 ^= u << 18 | u >>> 32 - 18;
        u = x0 + x3 | 0;
        x1 ^= u << 7 | u >>> 32 - 7;
        u = x1 + x0 | 0;
        x2 ^= u << 9 | u >>> 32 - 9;
        u = x2 + x1 | 0;
        x3 ^= u << 13 | u >>> 32 - 13;
        u = x3 + x2 | 0;
        x0 ^= u << 18 | u >>> 32 - 18;
        u = x5 + x4 | 0;
        x6 ^= u << 7 | u >>> 32 - 7;
        u = x6 + x5 | 0;
        x7 ^= u << 9 | u >>> 32 - 9;
        u = x7 + x6 | 0;
        x4 ^= u << 13 | u >>> 32 - 13;
        u = x4 + x7 | 0;
        x5 ^= u << 18 | u >>> 32 - 18;
        u = x10 + x9 | 0;
        x11 ^= u << 7 | u >>> 32 - 7;
        u = x11 + x10 | 0;
        x8 ^= u << 9 | u >>> 32 - 9;
        u = x8 + x11 | 0;
        x9 ^= u << 13 | u >>> 32 - 13;
        u = x9 + x8 | 0;
        x10 ^= u << 18 | u >>> 32 - 18;
        u = x15 + x14 | 0;
        x12 ^= u << 7 | u >>> 32 - 7;
        u = x12 + x15 | 0;
        x13 ^= u << 9 | u >>> 32 - 9;
        u = x13 + x12 | 0;
        x14 ^= u << 13 | u >>> 32 - 13;
        u = x14 + x13 | 0;
        x15 ^= u << 18 | u >>> 32 - 18;
      }

      x0 = x0 + j0 | 0;
      x1 = x1 + j1 | 0;
      x2 = x2 + j2 | 0;
      x3 = x3 + j3 | 0;
      x4 = x4 + j4 | 0;
      x5 = x5 + j5 | 0;
      x6 = x6 + j6 | 0;
      x7 = x7 + j7 | 0;
      x8 = x8 + j8 | 0;
      x9 = x9 + j9 | 0;
      x10 = x10 + j10 | 0;
      x11 = x11 + j11 | 0;
      x12 = x12 + j12 | 0;
      x13 = x13 + j13 | 0;
      x14 = x14 + j14 | 0;
      x15 = x15 + j15 | 0;
      o[0] = x0 >>> 0 & 0xff;
      o[1] = x0 >>> 8 & 0xff;
      o[2] = x0 >>> 16 & 0xff;
      o[3] = x0 >>> 24 & 0xff;
      o[4] = x1 >>> 0 & 0xff;
      o[5] = x1 >>> 8 & 0xff;
      o[6] = x1 >>> 16 & 0xff;
      o[7] = x1 >>> 24 & 0xff;
      o[8] = x2 >>> 0 & 0xff;
      o[9] = x2 >>> 8 & 0xff;
      o[10] = x2 >>> 16 & 0xff;
      o[11] = x2 >>> 24 & 0xff;
      o[12] = x3 >>> 0 & 0xff;
      o[13] = x3 >>> 8 & 0xff;
      o[14] = x3 >>> 16 & 0xff;
      o[15] = x3 >>> 24 & 0xff;
      o[16] = x4 >>> 0 & 0xff;
      o[17] = x4 >>> 8 & 0xff;
      o[18] = x4 >>> 16 & 0xff;
      o[19] = x4 >>> 24 & 0xff;
      o[20] = x5 >>> 0 & 0xff;
      o[21] = x5 >>> 8 & 0xff;
      o[22] = x5 >>> 16 & 0xff;
      o[23] = x5 >>> 24 & 0xff;
      o[24] = x6 >>> 0 & 0xff;
      o[25] = x6 >>> 8 & 0xff;
      o[26] = x6 >>> 16 & 0xff;
      o[27] = x6 >>> 24 & 0xff;
      o[28] = x7 >>> 0 & 0xff;
      o[29] = x7 >>> 8 & 0xff;
      o[30] = x7 >>> 16 & 0xff;
      o[31] = x7 >>> 24 & 0xff;
      o[32] = x8 >>> 0 & 0xff;
      o[33] = x8 >>> 8 & 0xff;
      o[34] = x8 >>> 16 & 0xff;
      o[35] = x8 >>> 24 & 0xff;
      o[36] = x9 >>> 0 & 0xff;
      o[37] = x9 >>> 8 & 0xff;
      o[38] = x9 >>> 16 & 0xff;
      o[39] = x9 >>> 24 & 0xff;
      o[40] = x10 >>> 0 & 0xff;
      o[41] = x10 >>> 8 & 0xff;
      o[42] = x10 >>> 16 & 0xff;
      o[43] = x10 >>> 24 & 0xff;
      o[44] = x11 >>> 0 & 0xff;
      o[45] = x11 >>> 8 & 0xff;
      o[46] = x11 >>> 16 & 0xff;
      o[47] = x11 >>> 24 & 0xff;
      o[48] = x12 >>> 0 & 0xff;
      o[49] = x12 >>> 8 & 0xff;
      o[50] = x12 >>> 16 & 0xff;
      o[51] = x12 >>> 24 & 0xff;
      o[52] = x13 >>> 0 & 0xff;
      o[53] = x13 >>> 8 & 0xff;
      o[54] = x13 >>> 16 & 0xff;
      o[55] = x13 >>> 24 & 0xff;
      o[56] = x14 >>> 0 & 0xff;
      o[57] = x14 >>> 8 & 0xff;
      o[58] = x14 >>> 16 & 0xff;
      o[59] = x14 >>> 24 & 0xff;
      o[60] = x15 >>> 0 & 0xff;
      o[61] = x15 >>> 8 & 0xff;
      o[62] = x15 >>> 16 & 0xff;
      o[63] = x15 >>> 24 & 0xff;
    }

    function core_hsalsa20(o, p, k, c) {
      var j0 = c[0] & 0xff | (c[1] & 0xff) << 8 | (c[2] & 0xff) << 16 | (c[3] & 0xff) << 24,
          j1 = k[0] & 0xff | (k[1] & 0xff) << 8 | (k[2] & 0xff) << 16 | (k[3] & 0xff) << 24,
          j2 = k[4] & 0xff | (k[5] & 0xff) << 8 | (k[6] & 0xff) << 16 | (k[7] & 0xff) << 24,
          j3 = k[8] & 0xff | (k[9] & 0xff) << 8 | (k[10] & 0xff) << 16 | (k[11] & 0xff) << 24,
          j4 = k[12] & 0xff | (k[13] & 0xff) << 8 | (k[14] & 0xff) << 16 | (k[15] & 0xff) << 24,
          j5 = c[4] & 0xff | (c[5] & 0xff) << 8 | (c[6] & 0xff) << 16 | (c[7] & 0xff) << 24,
          j6 = p[0] & 0xff | (p[1] & 0xff) << 8 | (p[2] & 0xff) << 16 | (p[3] & 0xff) << 24,
          j7 = p[4] & 0xff | (p[5] & 0xff) << 8 | (p[6] & 0xff) << 16 | (p[7] & 0xff) << 24,
          j8 = p[8] & 0xff | (p[9] & 0xff) << 8 | (p[10] & 0xff) << 16 | (p[11] & 0xff) << 24,
          j9 = p[12] & 0xff | (p[13] & 0xff) << 8 | (p[14] & 0xff) << 16 | (p[15] & 0xff) << 24,
          j10 = c[8] & 0xff | (c[9] & 0xff) << 8 | (c[10] & 0xff) << 16 | (c[11] & 0xff) << 24,
          j11 = k[16] & 0xff | (k[17] & 0xff) << 8 | (k[18] & 0xff) << 16 | (k[19] & 0xff) << 24,
          j12 = k[20] & 0xff | (k[21] & 0xff) << 8 | (k[22] & 0xff) << 16 | (k[23] & 0xff) << 24,
          j13 = k[24] & 0xff | (k[25] & 0xff) << 8 | (k[26] & 0xff) << 16 | (k[27] & 0xff) << 24,
          j14 = k[28] & 0xff | (k[29] & 0xff) << 8 | (k[30] & 0xff) << 16 | (k[31] & 0xff) << 24,
          j15 = c[12] & 0xff | (c[13] & 0xff) << 8 | (c[14] & 0xff) << 16 | (c[15] & 0xff) << 24;
      var x0 = j0,
          x1 = j1,
          x2 = j2,
          x3 = j3,
          x4 = j4,
          x5 = j5,
          x6 = j6,
          x7 = j7,
          x8 = j8,
          x9 = j9,
          x10 = j10,
          x11 = j11,
          x12 = j12,
          x13 = j13,
          x14 = j14,
          x15 = j15,
          u;

      for (var i = 0; i < 20; i += 2) {
        u = x0 + x12 | 0;
        x4 ^= u << 7 | u >>> 32 - 7;
        u = x4 + x0 | 0;
        x8 ^= u << 9 | u >>> 32 - 9;
        u = x8 + x4 | 0;
        x12 ^= u << 13 | u >>> 32 - 13;
        u = x12 + x8 | 0;
        x0 ^= u << 18 | u >>> 32 - 18;
        u = x5 + x1 | 0;
        x9 ^= u << 7 | u >>> 32 - 7;
        u = x9 + x5 | 0;
        x13 ^= u << 9 | u >>> 32 - 9;
        u = x13 + x9 | 0;
        x1 ^= u << 13 | u >>> 32 - 13;
        u = x1 + x13 | 0;
        x5 ^= u << 18 | u >>> 32 - 18;
        u = x10 + x6 | 0;
        x14 ^= u << 7 | u >>> 32 - 7;
        u = x14 + x10 | 0;
        x2 ^= u << 9 | u >>> 32 - 9;
        u = x2 + x14 | 0;
        x6 ^= u << 13 | u >>> 32 - 13;
        u = x6 + x2 | 0;
        x10 ^= u << 18 | u >>> 32 - 18;
        u = x15 + x11 | 0;
        x3 ^= u << 7 | u >>> 32 - 7;
        u = x3 + x15 | 0;
        x7 ^= u << 9 | u >>> 32 - 9;
        u = x7 + x3 | 0;
        x11 ^= u << 13 | u >>> 32 - 13;
        u = x11 + x7 | 0;
        x15 ^= u << 18 | u >>> 32 - 18;
        u = x0 + x3 | 0;
        x1 ^= u << 7 | u >>> 32 - 7;
        u = x1 + x0 | 0;
        x2 ^= u << 9 | u >>> 32 - 9;
        u = x2 + x1 | 0;
        x3 ^= u << 13 | u >>> 32 - 13;
        u = x3 + x2 | 0;
        x0 ^= u << 18 | u >>> 32 - 18;
        u = x5 + x4 | 0;
        x6 ^= u << 7 | u >>> 32 - 7;
        u = x6 + x5 | 0;
        x7 ^= u << 9 | u >>> 32 - 9;
        u = x7 + x6 | 0;
        x4 ^= u << 13 | u >>> 32 - 13;
        u = x4 + x7 | 0;
        x5 ^= u << 18 | u >>> 32 - 18;
        u = x10 + x9 | 0;
        x11 ^= u << 7 | u >>> 32 - 7;
        u = x11 + x10 | 0;
        x8 ^= u << 9 | u >>> 32 - 9;
        u = x8 + x11 | 0;
        x9 ^= u << 13 | u >>> 32 - 13;
        u = x9 + x8 | 0;
        x10 ^= u << 18 | u >>> 32 - 18;
        u = x15 + x14 | 0;
        x12 ^= u << 7 | u >>> 32 - 7;
        u = x12 + x15 | 0;
        x13 ^= u << 9 | u >>> 32 - 9;
        u = x13 + x12 | 0;
        x14 ^= u << 13 | u >>> 32 - 13;
        u = x14 + x13 | 0;
        x15 ^= u << 18 | u >>> 32 - 18;
      }

      o[0] = x0 >>> 0 & 0xff;
      o[1] = x0 >>> 8 & 0xff;
      o[2] = x0 >>> 16 & 0xff;
      o[3] = x0 >>> 24 & 0xff;
      o[4] = x5 >>> 0 & 0xff;
      o[5] = x5 >>> 8 & 0xff;
      o[6] = x5 >>> 16 & 0xff;
      o[7] = x5 >>> 24 & 0xff;
      o[8] = x10 >>> 0 & 0xff;
      o[9] = x10 >>> 8 & 0xff;
      o[10] = x10 >>> 16 & 0xff;
      o[11] = x10 >>> 24 & 0xff;
      o[12] = x15 >>> 0 & 0xff;
      o[13] = x15 >>> 8 & 0xff;
      o[14] = x15 >>> 16 & 0xff;
      o[15] = x15 >>> 24 & 0xff;
      o[16] = x6 >>> 0 & 0xff;
      o[17] = x6 >>> 8 & 0xff;
      o[18] = x6 >>> 16 & 0xff;
      o[19] = x6 >>> 24 & 0xff;
      o[20] = x7 >>> 0 & 0xff;
      o[21] = x7 >>> 8 & 0xff;
      o[22] = x7 >>> 16 & 0xff;
      o[23] = x7 >>> 24 & 0xff;
      o[24] = x8 >>> 0 & 0xff;
      o[25] = x8 >>> 8 & 0xff;
      o[26] = x8 >>> 16 & 0xff;
      o[27] = x8 >>> 24 & 0xff;
      o[28] = x9 >>> 0 & 0xff;
      o[29] = x9 >>> 8 & 0xff;
      o[30] = x9 >>> 16 & 0xff;
      o[31] = x9 >>> 24 & 0xff;
    }

    function crypto_core_salsa20(out, inp, k, c) {
      core_salsa20(out, inp, k, c);
    }

    function crypto_core_hsalsa20(out, inp, k, c) {
      core_hsalsa20(out, inp, k, c);
    }

    var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]); // "expand 32-byte k"

    function crypto_stream_salsa20_xor(c, cpos, m, mpos, b, n, k) {
      var z = new Uint8Array(16),
          x = new Uint8Array(64);
      var u, i;

      for (i = 0; i < 16; _x3 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x3) {
        var _x3;

        z[i] = 0;
      }

      for (i = 0; i < 8; _x4 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x4) {
        var _x4;

        z[i] = n[i];
      }

      while (b >= 64) {
        crypto_core_salsa20(x, z, k, sigma);

        for (i = 0; i < 64; _x5 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x5) {
          var _x5;

          c[maybeJSBI$9.add(cpos, i)] = maybeJSBI$9.bitwiseXor(m[maybeJSBI$9.add(mpos, i)], x[i]);
        }

        u = 1;

        for (i = 8; i < 16; _x6 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x6) {
          var _x6;

          u = u + (z[i] & 0xff) | 0;
          z[i] = u & 0xff;
          u >>>= 8;
        }

        b -= 64;
        cpos += 64;
        mpos += 64;
      }

      if (b > 0) {
        crypto_core_salsa20(x, z, k, sigma);

        for (i = 0; maybeJSBI$9.lessThan(i, b); _x7 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x7) {
          var _x7;

          c[maybeJSBI$9.add(cpos, i)] = maybeJSBI$9.bitwiseXor(m[maybeJSBI$9.add(mpos, i)], x[i]);
        }
      }

      return 0;
    }

    function crypto_stream_salsa20(c, cpos, b, n, k) {
      var z = new Uint8Array(16),
          x = new Uint8Array(64);
      var u, i;

      for (i = 0; i < 16; _x8 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x8) {
        var _x8;

        z[i] = 0;
      }

      for (i = 0; i < 8; _x9 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x9) {
        var _x9;

        z[i] = n[i];
      }

      while (b >= 64) {
        crypto_core_salsa20(x, z, k, sigma);

        for (i = 0; i < 64; _x10 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x10) {
          var _x10;

          c[maybeJSBI$9.add(cpos, i)] = x[i];
        }

        u = 1;

        for (i = 8; i < 16; _x11 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x11) {
          var _x11;

          u = u + (z[i] & 0xff) | 0;
          z[i] = u & 0xff;
          u >>>= 8;
        }

        b -= 64;
        cpos += 64;
      }

      if (b > 0) {
        crypto_core_salsa20(x, z, k, sigma);

        for (i = 0; maybeJSBI$9.lessThan(i, b); _x12 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x12) {
          var _x12;

          c[maybeJSBI$9.add(cpos, i)] = x[i];
        }
      }

      return 0;
    }

    function crypto_stream(c, cpos, d, n, k) {
      var s = new Uint8Array(32);
      crypto_core_hsalsa20(s, n, k, sigma);
      var sn = new Uint8Array(8);

      for (var i = 0; i < 8; i++) {
        sn[i] = n[i + 16];
      }

      return crypto_stream_salsa20(c, cpos, d, sn, s);
    }

    function crypto_stream_xor(c, cpos, m, mpos, d, n, k) {
      var s = new Uint8Array(32);
      crypto_core_hsalsa20(s, n, k, sigma);
      var sn = new Uint8Array(8);

      for (var i = 0; i < 8; i++) {
        sn[i] = n[i + 16];
      }

      return crypto_stream_salsa20_xor(c, cpos, m, mpos, d, sn, s);
    }
    /*
    * Port of Andrew Moon's Poly1305-donna-16. Public domain.
    * https://github.com/floodyberry/poly1305-donna
    */


    var poly1305 = function poly1305(key) {
      this.buffer = new Uint8Array(16);
      this.r = new Uint16Array(10);
      this.h = new Uint16Array(10);
      this.pad = new Uint16Array(8);
      this.leftover = 0;
      this.fin = 0;
      var t0, t1, t2, t3, t4, t5, t6, t7;
      t0 = key[0] & 0xff | (key[1] & 0xff) << 8;
      this.r[0] = t0 & 0x1fff;
      t1 = key[2] & 0xff | (key[3] & 0xff) << 8;
      this.r[1] = (t0 >>> 13 | t1 << 3) & 0x1fff;
      t2 = key[4] & 0xff | (key[5] & 0xff) << 8;
      this.r[2] = (t1 >>> 10 | t2 << 6) & 0x1f03;
      t3 = key[6] & 0xff | (key[7] & 0xff) << 8;
      this.r[3] = (t2 >>> 7 | t3 << 9) & 0x1fff;
      t4 = key[8] & 0xff | (key[9] & 0xff) << 8;
      this.r[4] = (t3 >>> 4 | t4 << 12) & 0x00ff;
      this.r[5] = t4 >>> 1 & 0x1ffe;
      t5 = key[10] & 0xff | (key[11] & 0xff) << 8;
      this.r[6] = (t4 >>> 14 | t5 << 2) & 0x1fff;
      t6 = key[12] & 0xff | (key[13] & 0xff) << 8;
      this.r[7] = (t5 >>> 11 | t6 << 5) & 0x1f81;
      t7 = key[14] & 0xff | (key[15] & 0xff) << 8;
      this.r[8] = (t6 >>> 8 | t7 << 8) & 0x1fff;
      this.r[9] = t7 >>> 5 & 0x007f;
      this.pad[0] = key[16] & 0xff | (key[17] & 0xff) << 8;
      this.pad[1] = key[18] & 0xff | (key[19] & 0xff) << 8;
      this.pad[2] = key[20] & 0xff | (key[21] & 0xff) << 8;
      this.pad[3] = key[22] & 0xff | (key[23] & 0xff) << 8;
      this.pad[4] = key[24] & 0xff | (key[25] & 0xff) << 8;
      this.pad[5] = key[26] & 0xff | (key[27] & 0xff) << 8;
      this.pad[6] = key[28] & 0xff | (key[29] & 0xff) << 8;
      this.pad[7] = key[30] & 0xff | (key[31] & 0xff) << 8;
    };

    poly1305.prototype.blocks = function (m, mpos, bytes) {
      var hibit = this.fin ? 0 : 1 << 11;
      var t0, t1, t2, t3, t4, t5, t6, t7, c;
      var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;
      var h0 = this.h[0],
          h1 = this.h[1],
          h2 = this.h[2],
          h3 = this.h[3],
          h4 = this.h[4],
          h5 = this.h[5],
          h6 = this.h[6],
          h7 = this.h[7],
          h8 = this.h[8],
          h9 = this.h[9];
      var r0 = this.r[0],
          r1 = this.r[1],
          r2 = this.r[2],
          r3 = this.r[3],
          r4 = this.r[4],
          r5 = this.r[5],
          r6 = this.r[6],
          r7 = this.r[7],
          r8 = this.r[8],
          r9 = this.r[9];

      while (bytes >= 16) {
        t0 = m[mpos + 0] & 0xff | (m[mpos + 1] & 0xff) << 8;
        h0 += t0 & 0x1fff;
        t1 = m[mpos + 2] & 0xff | (m[mpos + 3] & 0xff) << 8;
        h1 += (t0 >>> 13 | t1 << 3) & 0x1fff;
        t2 = m[mpos + 4] & 0xff | (m[mpos + 5] & 0xff) << 8;
        h2 += (t1 >>> 10 | t2 << 6) & 0x1fff;
        t3 = m[mpos + 6] & 0xff | (m[mpos + 7] & 0xff) << 8;
        h3 += (t2 >>> 7 | t3 << 9) & 0x1fff;
        t4 = m[mpos + 8] & 0xff | (m[mpos + 9] & 0xff) << 8;
        h4 += (t3 >>> 4 | t4 << 12) & 0x1fff;
        h5 += t4 >>> 1 & 0x1fff;
        t5 = m[mpos + 10] & 0xff | (m[mpos + 11] & 0xff) << 8;
        h6 += (t4 >>> 14 | t5 << 2) & 0x1fff;
        t6 = m[mpos + 12] & 0xff | (m[mpos + 13] & 0xff) << 8;
        h7 += (t5 >>> 11 | t6 << 5) & 0x1fff;
        t7 = m[mpos + 14] & 0xff | (m[mpos + 15] & 0xff) << 8;
        h8 += (t6 >>> 8 | t7 << 8) & 0x1fff;
        h9 += t7 >>> 5 | hibit;
        c = 0;
        d0 = c;
        d0 = maybeJSBI$9.add(d0, maybeJSBI$9.multiply(h0, r0));
        d0 += h1 * (5 * r9);
        d0 += h2 * (5 * r8);
        d0 += h3 * (5 * r7);
        d0 += h4 * (5 * r6);
        c = d0 >>> 13;
        d0 &= 0x1fff;
        d0 += h5 * (5 * r5);
        d0 += h6 * (5 * r4);
        d0 += h7 * (5 * r3);
        d0 += h8 * (5 * r2);
        d0 += h9 * (5 * r1);
        c += d0 >>> 13;
        d0 &= 0x1fff;
        d1 = c;
        d1 = maybeJSBI$9.add(d1, maybeJSBI$9.multiply(h0, r1));
        d1 = maybeJSBI$9.add(d1, maybeJSBI$9.multiply(h1, r0));
        d1 += h2 * (5 * r9);
        d1 += h3 * (5 * r8);
        d1 += h4 * (5 * r7);
        c = d1 >>> 13;
        d1 &= 0x1fff;
        d1 += h5 * (5 * r6);
        d1 += h6 * (5 * r5);
        d1 += h7 * (5 * r4);
        d1 += h8 * (5 * r3);
        d1 += h9 * (5 * r2);
        c += d1 >>> 13;
        d1 &= 0x1fff;
        d2 = c;
        d2 = maybeJSBI$9.add(d2, maybeJSBI$9.multiply(h0, r2));
        d2 = maybeJSBI$9.add(d2, maybeJSBI$9.multiply(h1, r1));
        d2 = maybeJSBI$9.add(d2, maybeJSBI$9.multiply(h2, r0));
        d2 += h3 * (5 * r9);
        d2 += h4 * (5 * r8);
        c = d2 >>> 13;
        d2 &= 0x1fff;
        d2 += h5 * (5 * r7);
        d2 += h6 * (5 * r6);
        d2 += h7 * (5 * r5);
        d2 += h8 * (5 * r4);
        d2 += h9 * (5 * r3);
        c += d2 >>> 13;
        d2 &= 0x1fff;
        d3 = c;
        d3 = maybeJSBI$9.add(d3, maybeJSBI$9.multiply(h0, r3));
        d3 = maybeJSBI$9.add(d3, maybeJSBI$9.multiply(h1, r2));
        d3 = maybeJSBI$9.add(d3, maybeJSBI$9.multiply(h2, r1));
        d3 = maybeJSBI$9.add(d3, maybeJSBI$9.multiply(h3, r0));
        d3 += h4 * (5 * r9);
        c = d3 >>> 13;
        d3 &= 0x1fff;
        d3 += h5 * (5 * r8);
        d3 += h6 * (5 * r7);
        d3 += h7 * (5 * r6);
        d3 += h8 * (5 * r5);
        d3 += h9 * (5 * r4);
        c += d3 >>> 13;
        d3 &= 0x1fff;
        d4 = c;
        d4 = maybeJSBI$9.add(d4, maybeJSBI$9.multiply(h0, r4));
        d4 = maybeJSBI$9.add(d4, maybeJSBI$9.multiply(h1, r3));
        d4 = maybeJSBI$9.add(d4, maybeJSBI$9.multiply(h2, r2));
        d4 = maybeJSBI$9.add(d4, maybeJSBI$9.multiply(h3, r1));
        d4 = maybeJSBI$9.add(d4, maybeJSBI$9.multiply(h4, r0));
        c = d4 >>> 13;
        d4 &= 0x1fff;
        d4 += h5 * (5 * r9);
        d4 += h6 * (5 * r8);
        d4 += h7 * (5 * r7);
        d4 += h8 * (5 * r6);
        d4 += h9 * (5 * r5);
        c += d4 >>> 13;
        d4 &= 0x1fff;
        d5 = c;
        d5 = maybeJSBI$9.add(d5, maybeJSBI$9.multiply(h0, r5));
        d5 = maybeJSBI$9.add(d5, maybeJSBI$9.multiply(h1, r4));
        d5 = maybeJSBI$9.add(d5, maybeJSBI$9.multiply(h2, r3));
        d5 = maybeJSBI$9.add(d5, maybeJSBI$9.multiply(h3, r2));
        d5 = maybeJSBI$9.add(d5, maybeJSBI$9.multiply(h4, r1));
        c = d5 >>> 13;
        d5 &= 0x1fff;
        d5 = maybeJSBI$9.add(d5, maybeJSBI$9.multiply(h5, r0));
        d5 += h6 * (5 * r9);
        d5 += h7 * (5 * r8);
        d5 += h8 * (5 * r7);
        d5 += h9 * (5 * r6);
        c += d5 >>> 13;
        d5 &= 0x1fff;
        d6 = c;
        d6 = maybeJSBI$9.add(d6, maybeJSBI$9.multiply(h0, r6));
        d6 = maybeJSBI$9.add(d6, maybeJSBI$9.multiply(h1, r5));
        d6 = maybeJSBI$9.add(d6, maybeJSBI$9.multiply(h2, r4));
        d6 = maybeJSBI$9.add(d6, maybeJSBI$9.multiply(h3, r3));
        d6 = maybeJSBI$9.add(d6, maybeJSBI$9.multiply(h4, r2));
        c = d6 >>> 13;
        d6 &= 0x1fff;
        d6 = maybeJSBI$9.add(d6, maybeJSBI$9.multiply(h5, r1));
        d6 = maybeJSBI$9.add(d6, maybeJSBI$9.multiply(h6, r0));
        d6 += h7 * (5 * r9);
        d6 += h8 * (5 * r8);
        d6 += h9 * (5 * r7);
        c += d6 >>> 13;
        d6 &= 0x1fff;
        d7 = c;
        d7 = maybeJSBI$9.add(d7, maybeJSBI$9.multiply(h0, r7));
        d7 = maybeJSBI$9.add(d7, maybeJSBI$9.multiply(h1, r6));
        d7 = maybeJSBI$9.add(d7, maybeJSBI$9.multiply(h2, r5));
        d7 = maybeJSBI$9.add(d7, maybeJSBI$9.multiply(h3, r4));
        d7 = maybeJSBI$9.add(d7, maybeJSBI$9.multiply(h4, r3));
        c = d7 >>> 13;
        d7 &= 0x1fff;
        d7 = maybeJSBI$9.add(d7, maybeJSBI$9.multiply(h5, r2));
        d7 = maybeJSBI$9.add(d7, maybeJSBI$9.multiply(h6, r1));
        d7 = maybeJSBI$9.add(d7, maybeJSBI$9.multiply(h7, r0));
        d7 += h8 * (5 * r9);
        d7 += h9 * (5 * r8);
        c += d7 >>> 13;
        d7 &= 0x1fff;
        d8 = c;
        d8 = maybeJSBI$9.add(d8, maybeJSBI$9.multiply(h0, r8));
        d8 = maybeJSBI$9.add(d8, maybeJSBI$9.multiply(h1, r7));
        d8 = maybeJSBI$9.add(d8, maybeJSBI$9.multiply(h2, r6));
        d8 = maybeJSBI$9.add(d8, maybeJSBI$9.multiply(h3, r5));
        d8 = maybeJSBI$9.add(d8, maybeJSBI$9.multiply(h4, r4));
        c = d8 >>> 13;
        d8 &= 0x1fff;
        d8 = maybeJSBI$9.add(d8, maybeJSBI$9.multiply(h5, r3));
        d8 = maybeJSBI$9.add(d8, maybeJSBI$9.multiply(h6, r2));
        d8 = maybeJSBI$9.add(d8, maybeJSBI$9.multiply(h7, r1));
        d8 = maybeJSBI$9.add(d8, maybeJSBI$9.multiply(h8, r0));
        d8 += h9 * (5 * r9);
        c += d8 >>> 13;
        d8 &= 0x1fff;
        d9 = c;
        d9 = maybeJSBI$9.add(d9, maybeJSBI$9.multiply(h0, r9));
        d9 = maybeJSBI$9.add(d9, maybeJSBI$9.multiply(h1, r8));
        d9 = maybeJSBI$9.add(d9, maybeJSBI$9.multiply(h2, r7));
        d9 = maybeJSBI$9.add(d9, maybeJSBI$9.multiply(h3, r6));
        d9 = maybeJSBI$9.add(d9, maybeJSBI$9.multiply(h4, r5));
        c = d9 >>> 13;
        d9 &= 0x1fff;
        d9 = maybeJSBI$9.add(d9, maybeJSBI$9.multiply(h5, r4));
        d9 = maybeJSBI$9.add(d9, maybeJSBI$9.multiply(h6, r3));
        d9 = maybeJSBI$9.add(d9, maybeJSBI$9.multiply(h7, r2));
        d9 = maybeJSBI$9.add(d9, maybeJSBI$9.multiply(h8, r1));
        d9 = maybeJSBI$9.add(d9, maybeJSBI$9.multiply(h9, r0));
        c += d9 >>> 13;
        d9 &= 0x1fff;
        c = (c << 2) + c | 0;
        c = maybeJSBI$9.add(c, d0) | 0;
        d0 = c & 0x1fff;
        c = c >>> 13;
        d1 = maybeJSBI$9.add(d1, c);
        h0 = d0;
        h1 = d1;
        h2 = d2;
        h3 = d3;
        h4 = d4;
        h5 = d5;
        h6 = d6;
        h7 = d7;
        h8 = d8;
        h9 = d9;
        mpos += 16;
        bytes -= 16;
      }

      this.h[0] = h0;
      this.h[1] = h1;
      this.h[2] = h2;
      this.h[3] = h3;
      this.h[4] = h4;
      this.h[5] = h5;
      this.h[6] = h6;
      this.h[7] = h7;
      this.h[8] = h8;
      this.h[9] = h9;
    };

    poly1305.prototype.finish = function (mac, macpos) {
      var _x17, _y2, _x18, _y3;

      var g = new Uint16Array(10);
      var c, mask, f, i;

      if (this.leftover) {
        var _x13;

        i = this.leftover;
        this.buffer[(_x13 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x13)] = 1;

        for (; i < 16; _x14 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x14) {
          var _x14;

          this.buffer[i] = 0;
        }

        this.fin = 1;
        this.blocks(this.buffer, 0, 16);
      }

      c = this.h[1] >>> 13;
      this.h[1] &= 0x1fff;

      for (i = 2; i < 10; _x15 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x15) {
        var _x15, _x16, _y;

        _x16 = this.h, _y = i, _x16[_y] = maybeJSBI$9.add(_x16[_y], c);
        c = this.h[i] >>> 13;
        this.h[i] &= 0x1fff;
      }

      this.h[0] += c * 5;
      c = this.h[0] >>> 13;
      this.h[0] &= 0x1fff;
      _x17 = this.h, _y2 = 1, _x17[_y2] = maybeJSBI$9.add(_x17[_y2], c);
      c = this.h[1] >>> 13;
      this.h[1] &= 0x1fff;
      _x18 = this.h, _y3 = 2, _x18[_y3] = maybeJSBI$9.add(_x18[_y3], c);
      g[0] = this.h[0] + 5;
      c = g[0] >>> 13;
      g[0] &= 0x1fff;

      for (i = 1; i < 10; _x19 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x19) {
        var _x19;

        g[i] = maybeJSBI$9.add(this.h[i], c);
        c = g[i] >>> 13;
        g[i] &= 0x1fff;
      }

      g[9] -= 1 << 13;
      mask = (c ^ 1) - 1;

      for (i = 0; i < 10; _x20 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x20) {
        var _x20, _x21, _y4;

        _x21 = g, _y4 = i, _x21[_y4] = maybeJSBI$9.bitwiseAnd(_x21[_y4], mask);
      }

      mask = maybeJSBI$9.bitwiseNot(mask);

      for (i = 0; i < 10; _x22 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x22) {
        var _x22;

        this.h[i] = maybeJSBI$9.bitwiseOr(maybeJSBI$9.bitwiseAnd(this.h[i], mask), g[i]);
      }

      this.h[0] = (this.h[0] | this.h[1] << 13) & 0xffff;
      this.h[1] = (this.h[1] >>> 3 | this.h[2] << 10) & 0xffff;
      this.h[2] = (this.h[2] >>> 6 | this.h[3] << 7) & 0xffff;
      this.h[3] = (this.h[3] >>> 9 | this.h[4] << 4) & 0xffff;
      this.h[4] = (this.h[4] >>> 12 | this.h[5] << 1 | this.h[6] << 14) & 0xffff;
      this.h[5] = (this.h[6] >>> 2 | this.h[7] << 11) & 0xffff;
      this.h[6] = (this.h[7] >>> 5 | this.h[8] << 8) & 0xffff;
      this.h[7] = (this.h[8] >>> 8 | this.h[9] << 5) & 0xffff;
      f = maybeJSBI$9.add(this.h[0], this.pad[0]);
      this.h[0] = f & 0xffff;

      for (i = 1; i < 8; _x23 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x23) {
        var _x23;

        f = (maybeJSBI$9.add(this.h[i], this.pad[i]) | 0) + (f >>> 16) | 0;
        this.h[i] = f & 0xffff;
      }

      mac[macpos + 0] = this.h[0] >>> 0 & 0xff;
      mac[macpos + 1] = this.h[0] >>> 8 & 0xff;
      mac[macpos + 2] = this.h[1] >>> 0 & 0xff;
      mac[macpos + 3] = this.h[1] >>> 8 & 0xff;
      mac[macpos + 4] = this.h[2] >>> 0 & 0xff;
      mac[macpos + 5] = this.h[2] >>> 8 & 0xff;
      mac[macpos + 6] = this.h[3] >>> 0 & 0xff;
      mac[macpos + 7] = this.h[3] >>> 8 & 0xff;
      mac[macpos + 8] = this.h[4] >>> 0 & 0xff;
      mac[macpos + 9] = this.h[4] >>> 8 & 0xff;
      mac[macpos + 10] = this.h[5] >>> 0 & 0xff;
      mac[macpos + 11] = this.h[5] >>> 8 & 0xff;
      mac[macpos + 12] = this.h[6] >>> 0 & 0xff;
      mac[macpos + 13] = this.h[6] >>> 8 & 0xff;
      mac[macpos + 14] = this.h[7] >>> 0 & 0xff;
      mac[macpos + 15] = this.h[7] >>> 8 & 0xff;
    };

    poly1305.prototype.update = function (m, mpos, bytes) {
      var i, want;

      if (this.leftover) {
        var _x25, _y5;

        want = 16 - this.leftover;
        if (maybeJSBI$9.greaterThan(want, bytes)) want = bytes;

        for (i = 0; maybeJSBI$9.lessThan(i, want); _x24 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x24) {
          var _x24;

          this.buffer[maybeJSBI$9.add(this.leftover, i)] = m[maybeJSBI$9.add(mpos, i)];
        }

        bytes = maybeJSBI$9.subtract(bytes, want);
        mpos = maybeJSBI$9.add(mpos, want);
        _x25 = this, _y5 = "leftover", _x25[_y5] = maybeJSBI$9.add(_x25[_y5], want);
        if (this.leftover < 16) return;
        this.blocks(this.buffer, 0, 16);
        this.leftover = 0;
      }

      if (bytes >= 16) {
        want = bytes - bytes % 16;
        this.blocks(m, mpos, want);
        mpos = maybeJSBI$9.add(mpos, want);
        bytes = maybeJSBI$9.subtract(bytes, want);
      }

      if (bytes) {
        var _x27, _y6;

        for (i = 0; maybeJSBI$9.lessThan(i, bytes); _x26 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x26) {
          var _x26;

          this.buffer[maybeJSBI$9.add(this.leftover, i)] = m[maybeJSBI$9.add(mpos, i)];
        }

        _x27 = this, _y6 = "leftover", _x27[_y6] = maybeJSBI$9.add(_x27[_y6], bytes);
      }
    };

    function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
      var s = new poly1305(k);
      s.update(m, mpos, n);
      s.finish(out, outpos);
      return 0;
    }

    function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
      var x = new Uint8Array(16);
      crypto_onetimeauth(x, 0, m, mpos, n, k);
      return crypto_verify_16(h, hpos, x, 0);
    }

    function crypto_secretbox(c, m, d, n, k) {
      var i;
      if (d < 32) return -1;
      crypto_stream_xor(c, 0, m, 0, d, n, k);
      crypto_onetimeauth(c, 16, c, 32, d - 32, c);

      for (i = 0; i < 16; _x28 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x28) {
        var _x28;

        c[i] = 0;
      }

      return 0;
    }

    function crypto_secretbox_open(m, c, d, n, k) {
      var i;
      var x = new Uint8Array(32);
      if (d < 32) return -1;
      crypto_stream(x, 0, 32, n, k);
      if (crypto_onetimeauth_verify(c, 16, c, 32, d - 32, x) !== 0) return -1;
      crypto_stream_xor(m, 0, c, 0, d, n, k);

      for (i = 0; i < 32; _x29 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x29) {
        var _x29;

        m[i] = 0;
      }

      return 0;
    }

    function set25519(r, a) {
      var i;

      for (i = 0; i < 16; _x30 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x30) {
        var _x30;

        r[i] = a[i] | 0;
      }
    }

    function car25519(o) {
      var i,
          v,
          c = 1;

      for (i = 0; i < 16; _x31 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x31) {
        var _x31;

        v = o[i] + c + 65535;
        c = Math.floor(v / 65536);
        o[i] = v - c * 65536;
      }

      o[0] += c - 1 + 37 * (c - 1);
    }

    function sel25519(p, q, b) {
      var t,
          c = ~(b - 1);

      for (var i = 0; i < 16; i++) {
        var _x32, _y7, _x33, _y8;

        t = c & maybeJSBI$9.bitwiseXor(p[i], q[i]);
        _x32 = p, _y7 = i, _x32[_y7] = maybeJSBI$9.bitwiseXor(_x32[_y7], t);
        _x33 = q, _y8 = i, _x33[_y8] = maybeJSBI$9.bitwiseXor(_x33[_y8], t);
      }
    }

    function pack25519(o, n) {
      var i, j, b;
      var m = gf(),
          t = gf();

      for (i = 0; i < 16; _x34 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x34) {
        var _x34;

        t[i] = n[i];
      }

      car25519(t);
      car25519(t);
      car25519(t);

      for (j = 0; j < 2; _x35 = j, j = maybeJSBI$9.add(j, maybeJSBI$9.BigInt(1)), _x35) {
        var _x35;

        m[0] = t[0] - 0xffed;

        for (i = 1; i < 15; _x36 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x36) {
          var _x36;

          m[i] = t[i] - 0xffff - (m[i - 1] >> 16 & 1);
          m[i - 1] &= 0xffff;
        }

        m[15] = t[15] - 0x7fff - (m[14] >> 16 & 1);
        b = m[15] >> 16 & 1;
        m[14] &= 0xffff;
        sel25519(t, m, 1 - b);
      }

      for (i = 0; i < 16; _x37 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x37) {
        var _x37;

        o[2 * i] = t[i] & 0xff;
        o[2 * i + 1] = t[i] >> 8;
      }
    }

    function neq25519(a, b) {
      var c = new Uint8Array(32),
          d = new Uint8Array(32);
      pack25519(c, a);
      pack25519(d, b);
      return crypto_verify_32(c, 0, d, 0);
    }

    function par25519(a) {
      var d = new Uint8Array(32);
      pack25519(d, a);
      return d[0] & 1;
    }

    function unpack25519(o, n) {
      var i;

      for (i = 0; i < 16; _x38 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x38) {
        var _x38;

        o[i] = n[2 * i] + (n[2 * i + 1] << 8);
      }

      o[15] &= 0x7fff;
    }

    function A(o, a, b) {
      for (var i = 0; i < 16; i++) {
        o[i] = maybeJSBI$9.add(a[i], b[i]);
      }
    }

    function Z(o, a, b) {
      for (var i = 0; i < 16; i++) {
        o[i] = maybeJSBI$9.subtract(a[i], b[i]);
      }
    }

    function M(o, a, b) {
      var v,
          c,
          t0 = 0,
          t1 = 0,
          t2 = 0,
          t3 = 0,
          t4 = 0,
          t5 = 0,
          t6 = 0,
          t7 = 0,
          t8 = 0,
          t9 = 0,
          t10 = 0,
          t11 = 0,
          t12 = 0,
          t13 = 0,
          t14 = 0,
          t15 = 0,
          t16 = 0,
          t17 = 0,
          t18 = 0,
          t19 = 0,
          t20 = 0,
          t21 = 0,
          t22 = 0,
          t23 = 0,
          t24 = 0,
          t25 = 0,
          t26 = 0,
          t27 = 0,
          t28 = 0,
          t29 = 0,
          t30 = 0,
          b0 = b[0],
          b1 = b[1],
          b2 = b[2],
          b3 = b[3],
          b4 = b[4],
          b5 = b[5],
          b6 = b[6],
          b7 = b[7],
          b8 = b[8],
          b9 = b[9],
          b10 = b[10],
          b11 = b[11],
          b12 = b[12],
          b13 = b[13],
          b14 = b[14],
          b15 = b[15];
      v = a[0];
      t0 += maybeJSBI$9.multiply(v, b0);
      t1 += maybeJSBI$9.multiply(v, b1);
      t2 += maybeJSBI$9.multiply(v, b2);
      t3 += maybeJSBI$9.multiply(v, b3);
      t4 += maybeJSBI$9.multiply(v, b4);
      t5 += maybeJSBI$9.multiply(v, b5);
      t6 += maybeJSBI$9.multiply(v, b6);
      t7 += maybeJSBI$9.multiply(v, b7);
      t8 += maybeJSBI$9.multiply(v, b8);
      t9 += maybeJSBI$9.multiply(v, b9);
      t10 += maybeJSBI$9.multiply(v, b10);
      t11 += maybeJSBI$9.multiply(v, b11);
      t12 += maybeJSBI$9.multiply(v, b12);
      t13 += maybeJSBI$9.multiply(v, b13);
      t14 += maybeJSBI$9.multiply(v, b14);
      t15 += maybeJSBI$9.multiply(v, b15);
      v = a[1];
      t1 += maybeJSBI$9.multiply(v, b0);
      t2 += maybeJSBI$9.multiply(v, b1);
      t3 += maybeJSBI$9.multiply(v, b2);
      t4 += maybeJSBI$9.multiply(v, b3);
      t5 += maybeJSBI$9.multiply(v, b4);
      t6 += maybeJSBI$9.multiply(v, b5);
      t7 += maybeJSBI$9.multiply(v, b6);
      t8 += maybeJSBI$9.multiply(v, b7);
      t9 += maybeJSBI$9.multiply(v, b8);
      t10 += maybeJSBI$9.multiply(v, b9);
      t11 += maybeJSBI$9.multiply(v, b10);
      t12 += maybeJSBI$9.multiply(v, b11);
      t13 += maybeJSBI$9.multiply(v, b12);
      t14 += maybeJSBI$9.multiply(v, b13);
      t15 += maybeJSBI$9.multiply(v, b14);
      t16 += maybeJSBI$9.multiply(v, b15);
      v = a[2];
      t2 += maybeJSBI$9.multiply(v, b0);
      t3 += maybeJSBI$9.multiply(v, b1);
      t4 += maybeJSBI$9.multiply(v, b2);
      t5 += maybeJSBI$9.multiply(v, b3);
      t6 += maybeJSBI$9.multiply(v, b4);
      t7 += maybeJSBI$9.multiply(v, b5);
      t8 += maybeJSBI$9.multiply(v, b6);
      t9 += maybeJSBI$9.multiply(v, b7);
      t10 += maybeJSBI$9.multiply(v, b8);
      t11 += maybeJSBI$9.multiply(v, b9);
      t12 += maybeJSBI$9.multiply(v, b10);
      t13 += maybeJSBI$9.multiply(v, b11);
      t14 += maybeJSBI$9.multiply(v, b12);
      t15 += maybeJSBI$9.multiply(v, b13);
      t16 += maybeJSBI$9.multiply(v, b14);
      t17 += maybeJSBI$9.multiply(v, b15);
      v = a[3];
      t3 += maybeJSBI$9.multiply(v, b0);
      t4 += maybeJSBI$9.multiply(v, b1);
      t5 += maybeJSBI$9.multiply(v, b2);
      t6 += maybeJSBI$9.multiply(v, b3);
      t7 += maybeJSBI$9.multiply(v, b4);
      t8 += maybeJSBI$9.multiply(v, b5);
      t9 += maybeJSBI$9.multiply(v, b6);
      t10 += maybeJSBI$9.multiply(v, b7);
      t11 += maybeJSBI$9.multiply(v, b8);
      t12 += maybeJSBI$9.multiply(v, b9);
      t13 += maybeJSBI$9.multiply(v, b10);
      t14 += maybeJSBI$9.multiply(v, b11);
      t15 += maybeJSBI$9.multiply(v, b12);
      t16 += maybeJSBI$9.multiply(v, b13);
      t17 += maybeJSBI$9.multiply(v, b14);
      t18 += maybeJSBI$9.multiply(v, b15);
      v = a[4];
      t4 += maybeJSBI$9.multiply(v, b0);
      t5 += maybeJSBI$9.multiply(v, b1);
      t6 += maybeJSBI$9.multiply(v, b2);
      t7 += maybeJSBI$9.multiply(v, b3);
      t8 += maybeJSBI$9.multiply(v, b4);
      t9 += maybeJSBI$9.multiply(v, b5);
      t10 += maybeJSBI$9.multiply(v, b6);
      t11 += maybeJSBI$9.multiply(v, b7);
      t12 += maybeJSBI$9.multiply(v, b8);
      t13 += maybeJSBI$9.multiply(v, b9);
      t14 += maybeJSBI$9.multiply(v, b10);
      t15 += maybeJSBI$9.multiply(v, b11);
      t16 += maybeJSBI$9.multiply(v, b12);
      t17 += maybeJSBI$9.multiply(v, b13);
      t18 += maybeJSBI$9.multiply(v, b14);
      t19 += maybeJSBI$9.multiply(v, b15);
      v = a[5];
      t5 += maybeJSBI$9.multiply(v, b0);
      t6 += maybeJSBI$9.multiply(v, b1);
      t7 += maybeJSBI$9.multiply(v, b2);
      t8 += maybeJSBI$9.multiply(v, b3);
      t9 += maybeJSBI$9.multiply(v, b4);
      t10 += maybeJSBI$9.multiply(v, b5);
      t11 += maybeJSBI$9.multiply(v, b6);
      t12 += maybeJSBI$9.multiply(v, b7);
      t13 += maybeJSBI$9.multiply(v, b8);
      t14 += maybeJSBI$9.multiply(v, b9);
      t15 += maybeJSBI$9.multiply(v, b10);
      t16 += maybeJSBI$9.multiply(v, b11);
      t17 += maybeJSBI$9.multiply(v, b12);
      t18 += maybeJSBI$9.multiply(v, b13);
      t19 += maybeJSBI$9.multiply(v, b14);
      t20 += maybeJSBI$9.multiply(v, b15);
      v = a[6];
      t6 += maybeJSBI$9.multiply(v, b0);
      t7 += maybeJSBI$9.multiply(v, b1);
      t8 += maybeJSBI$9.multiply(v, b2);
      t9 += maybeJSBI$9.multiply(v, b3);
      t10 += maybeJSBI$9.multiply(v, b4);
      t11 += maybeJSBI$9.multiply(v, b5);
      t12 += maybeJSBI$9.multiply(v, b6);
      t13 += maybeJSBI$9.multiply(v, b7);
      t14 += maybeJSBI$9.multiply(v, b8);
      t15 += maybeJSBI$9.multiply(v, b9);
      t16 += maybeJSBI$9.multiply(v, b10);
      t17 += maybeJSBI$9.multiply(v, b11);
      t18 += maybeJSBI$9.multiply(v, b12);
      t19 += maybeJSBI$9.multiply(v, b13);
      t20 += maybeJSBI$9.multiply(v, b14);
      t21 += maybeJSBI$9.multiply(v, b15);
      v = a[7];
      t7 += maybeJSBI$9.multiply(v, b0);
      t8 += maybeJSBI$9.multiply(v, b1);
      t9 += maybeJSBI$9.multiply(v, b2);
      t10 += maybeJSBI$9.multiply(v, b3);
      t11 += maybeJSBI$9.multiply(v, b4);
      t12 += maybeJSBI$9.multiply(v, b5);
      t13 += maybeJSBI$9.multiply(v, b6);
      t14 += maybeJSBI$9.multiply(v, b7);
      t15 += maybeJSBI$9.multiply(v, b8);
      t16 += maybeJSBI$9.multiply(v, b9);
      t17 += maybeJSBI$9.multiply(v, b10);
      t18 += maybeJSBI$9.multiply(v, b11);
      t19 += maybeJSBI$9.multiply(v, b12);
      t20 += maybeJSBI$9.multiply(v, b13);
      t21 += maybeJSBI$9.multiply(v, b14);
      t22 += maybeJSBI$9.multiply(v, b15);
      v = a[8];
      t8 += maybeJSBI$9.multiply(v, b0);
      t9 += maybeJSBI$9.multiply(v, b1);
      t10 += maybeJSBI$9.multiply(v, b2);
      t11 += maybeJSBI$9.multiply(v, b3);
      t12 += maybeJSBI$9.multiply(v, b4);
      t13 += maybeJSBI$9.multiply(v, b5);
      t14 += maybeJSBI$9.multiply(v, b6);
      t15 += maybeJSBI$9.multiply(v, b7);
      t16 += maybeJSBI$9.multiply(v, b8);
      t17 += maybeJSBI$9.multiply(v, b9);
      t18 += maybeJSBI$9.multiply(v, b10);
      t19 += maybeJSBI$9.multiply(v, b11);
      t20 += maybeJSBI$9.multiply(v, b12);
      t21 += maybeJSBI$9.multiply(v, b13);
      t22 += maybeJSBI$9.multiply(v, b14);
      t23 += maybeJSBI$9.multiply(v, b15);
      v = a[9];
      t9 += maybeJSBI$9.multiply(v, b0);
      t10 += maybeJSBI$9.multiply(v, b1);
      t11 += maybeJSBI$9.multiply(v, b2);
      t12 += maybeJSBI$9.multiply(v, b3);
      t13 += maybeJSBI$9.multiply(v, b4);
      t14 += maybeJSBI$9.multiply(v, b5);
      t15 += maybeJSBI$9.multiply(v, b6);
      t16 += maybeJSBI$9.multiply(v, b7);
      t17 += maybeJSBI$9.multiply(v, b8);
      t18 += maybeJSBI$9.multiply(v, b9);
      t19 += maybeJSBI$9.multiply(v, b10);
      t20 += maybeJSBI$9.multiply(v, b11);
      t21 += maybeJSBI$9.multiply(v, b12);
      t22 += maybeJSBI$9.multiply(v, b13);
      t23 += maybeJSBI$9.multiply(v, b14);
      t24 += maybeJSBI$9.multiply(v, b15);
      v = a[10];
      t10 += maybeJSBI$9.multiply(v, b0);
      t11 += maybeJSBI$9.multiply(v, b1);
      t12 += maybeJSBI$9.multiply(v, b2);
      t13 += maybeJSBI$9.multiply(v, b3);
      t14 += maybeJSBI$9.multiply(v, b4);
      t15 += maybeJSBI$9.multiply(v, b5);
      t16 += maybeJSBI$9.multiply(v, b6);
      t17 += maybeJSBI$9.multiply(v, b7);
      t18 += maybeJSBI$9.multiply(v, b8);
      t19 += maybeJSBI$9.multiply(v, b9);
      t20 += maybeJSBI$9.multiply(v, b10);
      t21 += maybeJSBI$9.multiply(v, b11);
      t22 += maybeJSBI$9.multiply(v, b12);
      t23 += maybeJSBI$9.multiply(v, b13);
      t24 += maybeJSBI$9.multiply(v, b14);
      t25 += maybeJSBI$9.multiply(v, b15);
      v = a[11];
      t11 += maybeJSBI$9.multiply(v, b0);
      t12 += maybeJSBI$9.multiply(v, b1);
      t13 += maybeJSBI$9.multiply(v, b2);
      t14 += maybeJSBI$9.multiply(v, b3);
      t15 += maybeJSBI$9.multiply(v, b4);
      t16 += maybeJSBI$9.multiply(v, b5);
      t17 += maybeJSBI$9.multiply(v, b6);
      t18 += maybeJSBI$9.multiply(v, b7);
      t19 += maybeJSBI$9.multiply(v, b8);
      t20 += maybeJSBI$9.multiply(v, b9);
      t21 += maybeJSBI$9.multiply(v, b10);
      t22 += maybeJSBI$9.multiply(v, b11);
      t23 += maybeJSBI$9.multiply(v, b12);
      t24 += maybeJSBI$9.multiply(v, b13);
      t25 += maybeJSBI$9.multiply(v, b14);
      t26 += maybeJSBI$9.multiply(v, b15);
      v = a[12];
      t12 += maybeJSBI$9.multiply(v, b0);
      t13 += maybeJSBI$9.multiply(v, b1);
      t14 += maybeJSBI$9.multiply(v, b2);
      t15 += maybeJSBI$9.multiply(v, b3);
      t16 += maybeJSBI$9.multiply(v, b4);
      t17 += maybeJSBI$9.multiply(v, b5);
      t18 += maybeJSBI$9.multiply(v, b6);
      t19 += maybeJSBI$9.multiply(v, b7);
      t20 += maybeJSBI$9.multiply(v, b8);
      t21 += maybeJSBI$9.multiply(v, b9);
      t22 += maybeJSBI$9.multiply(v, b10);
      t23 += maybeJSBI$9.multiply(v, b11);
      t24 += maybeJSBI$9.multiply(v, b12);
      t25 += maybeJSBI$9.multiply(v, b13);
      t26 += maybeJSBI$9.multiply(v, b14);
      t27 += maybeJSBI$9.multiply(v, b15);
      v = a[13];
      t13 += maybeJSBI$9.multiply(v, b0);
      t14 += maybeJSBI$9.multiply(v, b1);
      t15 += maybeJSBI$9.multiply(v, b2);
      t16 += maybeJSBI$9.multiply(v, b3);
      t17 += maybeJSBI$9.multiply(v, b4);
      t18 += maybeJSBI$9.multiply(v, b5);
      t19 += maybeJSBI$9.multiply(v, b6);
      t20 += maybeJSBI$9.multiply(v, b7);
      t21 += maybeJSBI$9.multiply(v, b8);
      t22 += maybeJSBI$9.multiply(v, b9);
      t23 += maybeJSBI$9.multiply(v, b10);
      t24 += maybeJSBI$9.multiply(v, b11);
      t25 += maybeJSBI$9.multiply(v, b12);
      t26 += maybeJSBI$9.multiply(v, b13);
      t27 += maybeJSBI$9.multiply(v, b14);
      t28 += maybeJSBI$9.multiply(v, b15);
      v = a[14];
      t14 += maybeJSBI$9.multiply(v, b0);
      t15 += maybeJSBI$9.multiply(v, b1);
      t16 += maybeJSBI$9.multiply(v, b2);
      t17 += maybeJSBI$9.multiply(v, b3);
      t18 += maybeJSBI$9.multiply(v, b4);
      t19 += maybeJSBI$9.multiply(v, b5);
      t20 += maybeJSBI$9.multiply(v, b6);
      t21 += maybeJSBI$9.multiply(v, b7);
      t22 += maybeJSBI$9.multiply(v, b8);
      t23 += maybeJSBI$9.multiply(v, b9);
      t24 += maybeJSBI$9.multiply(v, b10);
      t25 += maybeJSBI$9.multiply(v, b11);
      t26 += maybeJSBI$9.multiply(v, b12);
      t27 += maybeJSBI$9.multiply(v, b13);
      t28 += maybeJSBI$9.multiply(v, b14);
      t29 += maybeJSBI$9.multiply(v, b15);
      v = a[15];
      t15 += maybeJSBI$9.multiply(v, b0);
      t16 += maybeJSBI$9.multiply(v, b1);
      t17 += maybeJSBI$9.multiply(v, b2);
      t18 += maybeJSBI$9.multiply(v, b3);
      t19 += maybeJSBI$9.multiply(v, b4);
      t20 += maybeJSBI$9.multiply(v, b5);
      t21 += maybeJSBI$9.multiply(v, b6);
      t22 += maybeJSBI$9.multiply(v, b7);
      t23 += maybeJSBI$9.multiply(v, b8);
      t24 += maybeJSBI$9.multiply(v, b9);
      t25 += maybeJSBI$9.multiply(v, b10);
      t26 += maybeJSBI$9.multiply(v, b11);
      t27 += maybeJSBI$9.multiply(v, b12);
      t28 += maybeJSBI$9.multiply(v, b13);
      t29 += maybeJSBI$9.multiply(v, b14);
      t30 += maybeJSBI$9.multiply(v, b15);
      t0 += 38 * t16;
      t1 += 38 * t17;
      t2 += 38 * t18;
      t3 += 38 * t19;
      t4 += 38 * t20;
      t5 += 38 * t21;
      t6 += 38 * t22;
      t7 += 38 * t23;
      t8 += 38 * t24;
      t9 += 38 * t25;
      t10 += 38 * t26;
      t11 += 38 * t27;
      t12 += 38 * t28;
      t13 += 38 * t29;
      t14 += 38 * t30; // t15 left as is
      // first car

      c = 1;
      v = t0 + c + 65535;
      c = Math.floor(v / 65536);
      t0 = v - c * 65536;
      v = t1 + c + 65535;
      c = Math.floor(v / 65536);
      t1 = v - c * 65536;
      v = t2 + c + 65535;
      c = Math.floor(v / 65536);
      t2 = v - c * 65536;
      v = t3 + c + 65535;
      c = Math.floor(v / 65536);
      t3 = v - c * 65536;
      v = t4 + c + 65535;
      c = Math.floor(v / 65536);
      t4 = v - c * 65536;
      v = t5 + c + 65535;
      c = Math.floor(v / 65536);
      t5 = v - c * 65536;
      v = t6 + c + 65535;
      c = Math.floor(v / 65536);
      t6 = v - c * 65536;
      v = t7 + c + 65535;
      c = Math.floor(v / 65536);
      t7 = v - c * 65536;
      v = t8 + c + 65535;
      c = Math.floor(v / 65536);
      t8 = v - c * 65536;
      v = t9 + c + 65535;
      c = Math.floor(v / 65536);
      t9 = v - c * 65536;
      v = t10 + c + 65535;
      c = Math.floor(v / 65536);
      t10 = v - c * 65536;
      v = t11 + c + 65535;
      c = Math.floor(v / 65536);
      t11 = v - c * 65536;
      v = t12 + c + 65535;
      c = Math.floor(v / 65536);
      t12 = v - c * 65536;
      v = t13 + c + 65535;
      c = Math.floor(v / 65536);
      t13 = v - c * 65536;
      v = t14 + c + 65535;
      c = Math.floor(v / 65536);
      t14 = v - c * 65536;
      v = t15 + c + 65535;
      c = Math.floor(v / 65536);
      t15 = v - c * 65536;
      t0 += c - 1 + 37 * (c - 1); // second car

      c = 1;
      v = t0 + c + 65535;
      c = Math.floor(v / 65536);
      t0 = v - c * 65536;
      v = t1 + c + 65535;
      c = Math.floor(v / 65536);
      t1 = v - c * 65536;
      v = t2 + c + 65535;
      c = Math.floor(v / 65536);
      t2 = v - c * 65536;
      v = t3 + c + 65535;
      c = Math.floor(v / 65536);
      t3 = v - c * 65536;
      v = t4 + c + 65535;
      c = Math.floor(v / 65536);
      t4 = v - c * 65536;
      v = t5 + c + 65535;
      c = Math.floor(v / 65536);
      t5 = v - c * 65536;
      v = t6 + c + 65535;
      c = Math.floor(v / 65536);
      t6 = v - c * 65536;
      v = t7 + c + 65535;
      c = Math.floor(v / 65536);
      t7 = v - c * 65536;
      v = t8 + c + 65535;
      c = Math.floor(v / 65536);
      t8 = v - c * 65536;
      v = t9 + c + 65535;
      c = Math.floor(v / 65536);
      t9 = v - c * 65536;
      v = t10 + c + 65535;
      c = Math.floor(v / 65536);
      t10 = v - c * 65536;
      v = t11 + c + 65535;
      c = Math.floor(v / 65536);
      t11 = v - c * 65536;
      v = t12 + c + 65535;
      c = Math.floor(v / 65536);
      t12 = v - c * 65536;
      v = t13 + c + 65535;
      c = Math.floor(v / 65536);
      t13 = v - c * 65536;
      v = t14 + c + 65535;
      c = Math.floor(v / 65536);
      t14 = v - c * 65536;
      v = t15 + c + 65535;
      c = Math.floor(v / 65536);
      t15 = v - c * 65536;
      t0 += c - 1 + 37 * (c - 1);
      o[0] = t0;
      o[1] = t1;
      o[2] = t2;
      o[3] = t3;
      o[4] = t4;
      o[5] = t5;
      o[6] = t6;
      o[7] = t7;
      o[8] = t8;
      o[9] = t9;
      o[10] = t10;
      o[11] = t11;
      o[12] = t12;
      o[13] = t13;
      o[14] = t14;
      o[15] = t15;
    }

    function S(o, a) {
      M(o, a, a);
    }

    function inv25519(o, i) {
      var c = gf();
      var a;

      for (a = 0; a < 16; _x39 = a, a = maybeJSBI$9.add(a, maybeJSBI$9.BigInt(1)), _x39) {
        var _x39;

        c[a] = i[a];
      }

      for (a = 253; a >= 0; _x40 = a, a = maybeJSBI$9.subtract(a, maybeJSBI$9.BigInt(1)), _x40) {
        var _x40;

        S(c, c);
        if (a !== 2 && a !== 4) M(c, c, i);
      }

      for (a = 0; a < 16; _x41 = a, a = maybeJSBI$9.add(a, maybeJSBI$9.BigInt(1)), _x41) {
        var _x41;

        o[a] = c[a];
      }
    }

    function pow2523(o, i) {
      var c = gf();
      var a;

      for (a = 0; a < 16; _x42 = a, a = maybeJSBI$9.add(a, maybeJSBI$9.BigInt(1)), _x42) {
        var _x42;

        c[a] = i[a];
      }

      for (a = 250; a >= 0; _x43 = a, a = maybeJSBI$9.subtract(a, maybeJSBI$9.BigInt(1)), _x43) {
        var _x43;

        S(c, c);
        if (a !== 1) M(c, c, i);
      }

      for (a = 0; a < 16; _x44 = a, a = maybeJSBI$9.add(a, maybeJSBI$9.BigInt(1)), _x44) {
        var _x44;

        o[a] = c[a];
      }
    }

    function crypto_scalarmult(q, n, p) {
      var z = new Uint8Array(32);
      var x = new Float64Array(80),
          r,
          i;
      var a = gf(),
          b = gf(),
          c = gf(),
          d = gf(),
          e = gf(),
          f = gf();

      for (i = 0; i < 31; _x45 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x45) {
        var _x45;

        z[i] = n[i];
      }

      z[31] = n[31] & 127 | 64;
      z[0] &= 248;
      unpack25519(x, p);

      for (i = 0; i < 16; _x46 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x46) {
        var _x46;

        b[i] = x[i];
        d[i] = a[i] = c[i] = 0;
      }

      a[0] = d[0] = 1;

      for (i = 254; i >= 0; i = maybeJSBI$9.subtract(i, maybeJSBI$9.BigInt(1))) {
        r = z[i >>> 3] >>> (i & 7) & 1;
        sel25519(a, b, r);
        sel25519(c, d, r);
        A(e, a, c);
        Z(a, a, c);
        A(c, b, d);
        Z(b, b, d);
        S(d, e);
        S(f, a);
        M(a, c, a);
        M(c, b, e);
        A(e, a, c);
        Z(a, a, c);
        S(b, a);
        Z(c, d, f);
        M(a, c, _121665);
        A(a, a, d);
        M(c, c, a);
        M(a, d, f);
        M(d, b, x);
        S(b, e);
        sel25519(a, b, r);
        sel25519(c, d, r);
      }

      for (i = 0; i < 16; _x47 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x47) {
        var _x47;

        x[i + 16] = a[i];
        x[i + 32] = c[i];
        x[i + 48] = b[i];
        x[i + 64] = d[i];
      }

      var x32 = x.subarray(32);
      var x16 = x.subarray(16);
      inv25519(x32, x32);
      M(x16, x16, x32);
      pack25519(q, x16);
      return 0;
    }

    function crypto_scalarmult_base(q, n) {
      return crypto_scalarmult(q, n, _9);
    }

    function crypto_box_keypair(y, x) {
      randombytes(x, 32);
      return crypto_scalarmult_base(y, x);
    }

    function crypto_box_beforenm(k, y, x) {
      var s = new Uint8Array(32);
      crypto_scalarmult(s, x, y);
      return crypto_core_hsalsa20(k, _0, s, sigma);
    }

    var crypto_box_afternm = crypto_secretbox;
    var crypto_box_open_afternm = crypto_secretbox_open;

    function crypto_box(c, m, d, n, y, x) {
      var k = new Uint8Array(32);
      crypto_box_beforenm(k, y, x);
      return crypto_box_afternm(c, m, d, n, k);
    }

    function crypto_box_open(m, c, d, n, y, x) {
      var k = new Uint8Array(32);
      crypto_box_beforenm(k, y, x);
      return crypto_box_open_afternm(m, c, d, n, k);
    }

    var K = [0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc, 0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118, 0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2, 0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1, 0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694, 0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3, 0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65, 0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5, 0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4, 0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725, 0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70, 0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df, 0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b, 0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30, 0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8, 0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8, 0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb, 0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3, 0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec, 0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b, 0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178, 0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b, 0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c, 0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817];

    function crypto_hashblocks_hl(hh, hl, m, n) {
      var wh = new Int32Array(16),
          wl = new Int32Array(16),
          bh0,
          bh1,
          bh2,
          bh3,
          bh4,
          bh5,
          bh6,
          bh7,
          bl0,
          bl1,
          bl2,
          bl3,
          bl4,
          bl5,
          bl6,
          bl7,
          th,
          tl,
          i,
          j,
          h,
          l,
          a,
          b,
          c,
          d;
      var ah0 = hh[0],
          ah1 = hh[1],
          ah2 = hh[2],
          ah3 = hh[3],
          ah4 = hh[4],
          ah5 = hh[5],
          ah6 = hh[6],
          ah7 = hh[7],
          al0 = hl[0],
          al1 = hl[1],
          al2 = hl[2],
          al3 = hl[3],
          al4 = hl[4],
          al5 = hl[5],
          al6 = hl[6],
          al7 = hl[7];
      var pos = 0;

      while (n >= 128) {
        for (i = 0; i < 16; _x48 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x48) {
          var _x48;

          j = 8 * i + pos;
          wh[i] = m[j + 0] << 24 | m[j + 1] << 16 | m[j + 2] << 8 | m[j + 3];
          wl[i] = m[j + 4] << 24 | m[j + 5] << 16 | m[j + 6] << 8 | m[j + 7];
        }

        for (i = 0; i < 80; _x49 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x49) {
          var _x49;

          bh0 = ah0;
          bh1 = ah1;
          bh2 = ah2;
          bh3 = ah3;
          bh4 = ah4;
          bh5 = ah5;
          bh6 = ah6;
          bh7 = ah7;
          bl0 = al0;
          bl1 = al1;
          bl2 = al2;
          bl3 = al3;
          bl4 = al4;
          bl5 = al5;
          bl6 = al6;
          bl7 = al7; // add

          h = ah7;
          l = al7;
          a = l & 0xffff;
          b = l >>> 16;
          c = h & 0xffff;
          d = h >>> 16; // Sigma1

          h = (ah4 >>> 14 | al4 << 32 - 14) ^ (ah4 >>> 18 | al4 << 32 - 18) ^ (al4 >>> 41 - 32 | ah4 << 32 - (41 - 32));
          l = (al4 >>> 14 | ah4 << 32 - 14) ^ (al4 >>> 18 | ah4 << 32 - 18) ^ (ah4 >>> 41 - 32 | al4 << 32 - (41 - 32));
          a += l & 0xffff;
          b += l >>> 16;
          c += h & 0xffff;
          d += h >>> 16; // Ch

          h = maybeJSBI$9.bitwiseXor(maybeJSBI$9.bitwiseAnd(ah4, ah5), maybeJSBI$9.bitwiseAnd(maybeJSBI$9.bitwiseNot(ah4), ah6));
          l = maybeJSBI$9.bitwiseXor(maybeJSBI$9.bitwiseAnd(al4, al5), maybeJSBI$9.bitwiseAnd(maybeJSBI$9.bitwiseNot(al4), al6));
          a += l & 0xffff;
          b += l >>> 16;
          c += h & 0xffff;
          d += h >>> 16; // K

          h = K[i * 2];
          l = K[i * 2 + 1];
          a += l & 0xffff;
          b += l >>> 16;
          c += h & 0xffff;
          d += h >>> 16; // w

          h = wh[i % 16];
          l = wl[i % 16];
          a += l & 0xffff;
          b += l >>> 16;
          c += h & 0xffff;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          th = c & 0xffff | d << 16;
          tl = a & 0xffff | b << 16; // add

          h = th;
          l = tl;
          a = l & 0xffff;
          b = l >>> 16;
          c = h & 0xffff;
          d = h >>> 16; // Sigma0

          h = (ah0 >>> 28 | al0 << 32 - 28) ^ (al0 >>> 34 - 32 | ah0 << 32 - (34 - 32)) ^ (al0 >>> 39 - 32 | ah0 << 32 - (39 - 32));
          l = (al0 >>> 28 | ah0 << 32 - 28) ^ (ah0 >>> 34 - 32 | al0 << 32 - (34 - 32)) ^ (ah0 >>> 39 - 32 | al0 << 32 - (39 - 32));
          a += l & 0xffff;
          b += l >>> 16;
          c += h & 0xffff;
          d += h >>> 16; // Maj

          h = maybeJSBI$9.bitwiseXor(maybeJSBI$9.bitwiseXor(maybeJSBI$9.bitwiseAnd(ah0, ah1), maybeJSBI$9.bitwiseAnd(ah0, ah2)), maybeJSBI$9.bitwiseAnd(ah1, ah2));
          l = maybeJSBI$9.bitwiseXor(maybeJSBI$9.bitwiseXor(maybeJSBI$9.bitwiseAnd(al0, al1), maybeJSBI$9.bitwiseAnd(al0, al2)), maybeJSBI$9.bitwiseAnd(al1, al2));
          a += l & 0xffff;
          b += l >>> 16;
          c += h & 0xffff;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          bh7 = c & 0xffff | d << 16;
          bl7 = a & 0xffff | b << 16; // add

          h = bh3;
          l = bl3;
          a = l & 0xffff;
          b = l >>> 16;
          c = h & 0xffff;
          d = h >>> 16;
          h = th;
          l = tl;
          a += l & 0xffff;
          b += l >>> 16;
          c += h & 0xffff;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          bh3 = c & 0xffff | d << 16;
          bl3 = a & 0xffff | b << 16;
          ah1 = bh0;
          ah2 = bh1;
          ah3 = bh2;
          ah4 = bh3;
          ah5 = bh4;
          ah6 = bh5;
          ah7 = bh6;
          ah0 = bh7;
          al1 = bl0;
          al2 = bl1;
          al3 = bl2;
          al4 = bl3;
          al5 = bl4;
          al6 = bl5;
          al7 = bl6;
          al0 = bl7;

          if (i % 16 === 15) {
            for (j = 0; j < 16; _x50 = j, j = maybeJSBI$9.add(j, maybeJSBI$9.BigInt(1)), _x50) {
              var _x50;

              // add
              h = wh[j];
              l = wl[j];
              a = l & 0xffff;
              b = l >>> 16;
              c = h & 0xffff;
              d = h >>> 16;
              h = wh[(j + 9) % 16];
              l = wl[(j + 9) % 16];
              a += l & 0xffff;
              b += l >>> 16;
              c += h & 0xffff;
              d += h >>> 16; // sigma0

              th = wh[(j + 1) % 16];
              tl = wl[(j + 1) % 16];
              h = (th >>> 1 | tl << 32 - 1) ^ (th >>> 8 | tl << 32 - 8) ^ th >>> 7;
              l = (tl >>> 1 | th << 32 - 1) ^ (tl >>> 8 | th << 32 - 8) ^ (tl >>> 7 | th << 32 - 7);
              a += l & 0xffff;
              b += l >>> 16;
              c += h & 0xffff;
              d += h >>> 16; // sigma1

              th = wh[(j + 14) % 16];
              tl = wl[(j + 14) % 16];
              h = (th >>> 19 | tl << 32 - 19) ^ (tl >>> 61 - 32 | th << 32 - (61 - 32)) ^ th >>> 6;
              l = (tl >>> 19 | th << 32 - 19) ^ (th >>> 61 - 32 | tl << 32 - (61 - 32)) ^ (tl >>> 6 | th << 32 - 6);
              a += l & 0xffff;
              b += l >>> 16;
              c += h & 0xffff;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              wh[j] = c & 0xffff | d << 16;
              wl[j] = a & 0xffff | b << 16;
            }
          }
        } // add


        h = ah0;
        l = al0;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[0];
        l = hl[0];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[0] = ah0 = c & 0xffff | d << 16;
        hl[0] = al0 = a & 0xffff | b << 16;
        h = ah1;
        l = al1;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[1];
        l = hl[1];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[1] = ah1 = c & 0xffff | d << 16;
        hl[1] = al1 = a & 0xffff | b << 16;
        h = ah2;
        l = al2;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[2];
        l = hl[2];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[2] = ah2 = c & 0xffff | d << 16;
        hl[2] = al2 = a & 0xffff | b << 16;
        h = ah3;
        l = al3;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[3];
        l = hl[3];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[3] = ah3 = c & 0xffff | d << 16;
        hl[3] = al3 = a & 0xffff | b << 16;
        h = ah4;
        l = al4;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[4];
        l = hl[4];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[4] = ah4 = c & 0xffff | d << 16;
        hl[4] = al4 = a & 0xffff | b << 16;
        h = ah5;
        l = al5;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[5];
        l = hl[5];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[5] = ah5 = c & 0xffff | d << 16;
        hl[5] = al5 = a & 0xffff | b << 16;
        h = ah6;
        l = al6;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[6];
        l = hl[6];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[6] = ah6 = c & 0xffff | d << 16;
        hl[6] = al6 = a & 0xffff | b << 16;
        h = ah7;
        l = al7;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[7];
        l = hl[7];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[7] = ah7 = c & 0xffff | d << 16;
        hl[7] = al7 = a & 0xffff | b << 16;
        pos += 128;
        n -= 128;
      }

      return n;
    }

    function crypto_hash(out, m, n) {
      var hh = new Int32Array(8),
          hl = new Int32Array(8),
          x = new Uint8Array(256),
          i,
          b = n;
      hh[0] = 0x6a09e667;
      hh[1] = 0xbb67ae85;
      hh[2] = 0x3c6ef372;
      hh[3] = 0xa54ff53a;
      hh[4] = 0x510e527f;
      hh[5] = 0x9b05688c;
      hh[6] = 0x1f83d9ab;
      hh[7] = 0x5be0cd19;
      hl[0] = 0xf3bcc908;
      hl[1] = 0x84caa73b;
      hl[2] = 0xfe94f82b;
      hl[3] = 0x5f1d36f1;
      hl[4] = 0xade682d1;
      hl[5] = 0x2b3e6c1f;
      hl[6] = 0xfb41bd6b;
      hl[7] = 0x137e2179;
      crypto_hashblocks_hl(hh, hl, m, n);
      n %= 128;

      for (i = 0; maybeJSBI$9.lessThan(i, n); _x51 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x51) {
        var _x51;

        x[i] = m[maybeJSBI$9.add(maybeJSBI$9.subtract(b, n), i)];
      }

      x[n] = 128;
      n = 256 - 128 * (n < 112 ? 1 : 0);
      x[n - 9] = 0;
      ts64(x, n - 8, b / 0x20000000 | 0, b << 3);
      crypto_hashblocks_hl(hh, hl, x, n);

      for (i = 0; i < 8; _x52 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x52) {
        var _x52;

        ts64(out, 8 * i, hh[i], hl[i]);
      }

      return 0;
    }

    function add(p, q) {
      var a = gf(),
          b = gf(),
          c = gf(),
          d = gf(),
          e = gf(),
          f = gf(),
          g = gf(),
          h = gf(),
          t = gf();
      Z(a, p[1], p[0]);
      Z(t, q[1], q[0]);
      M(a, a, t);
      A(b, p[0], p[1]);
      A(t, q[0], q[1]);
      M(b, b, t);
      M(c, p[3], q[3]);
      M(c, c, D2);
      M(d, p[2], q[2]);
      A(d, d, d);
      Z(e, b, a);
      Z(f, d, c);
      A(g, d, c);
      A(h, b, a);
      M(p[0], e, f);
      M(p[1], h, g);
      M(p[2], g, f);
      M(p[3], e, h);
    }

    function cswap(p, q, b) {
      var i;

      for (i = 0; i < 4; _x53 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x53) {
        var _x53;

        sel25519(p[i], q[i], b);
      }
    }

    function pack(r, p) {
      var tx = gf(),
          ty = gf(),
          zi = gf();
      inv25519(zi, p[2]);
      M(tx, p[0], zi);
      M(ty, p[1], zi);
      pack25519(r, ty);
      r[31] ^= par25519(tx) << 7;
    }

    function scalarmult(p, q, s) {
      var b, i;
      set25519(p[0], gf0);
      set25519(p[1], gf1);
      set25519(p[2], gf1);
      set25519(p[3], gf0);

      for (i = 255; i >= 0; i = maybeJSBI$9.subtract(i, maybeJSBI$9.BigInt(1))) {
        b = s[i / 8 | 0] >> (i & 7) & 1;
        cswap(p, q, b);
        add(q, p);
        add(p, p);
        cswap(p, q, b);
      }
    }

    function scalarbase(p, s) {
      var q = [gf(), gf(), gf(), gf()];
      set25519(q[0], X);
      set25519(q[1], Y);
      set25519(q[2], gf1);
      M(q[3], X, Y);
      scalarmult(p, q, s);
    }

    function crypto_sign_keypair(pk, sk, seeded) {
      var d = new Uint8Array(64);
      var p = [gf(), gf(), gf(), gf()];
      var i;
      if (!seeded) randombytes(sk, 32);
      crypto_hash(d, sk, 32);
      d[0] &= 248;
      d[31] &= 127;
      d[31] |= 64;
      scalarbase(p, d);
      pack(pk, p);

      for (i = 0; i < 32; _x54 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x54) {
        var _x54;

        sk[i + 32] = pk[i];
      }

      return 0;
    }

    var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

    function modL(r, x) {
      var carry, i, j, k;

      for (i = 63; i >= 32; i = maybeJSBI$9.subtract(i, maybeJSBI$9.BigInt(1))) {
        var _x55, _y9;

        carry = 0;

        for (j = i - 32, k = i - 12; maybeJSBI$9.lessThan(j, k); j = maybeJSBI$9.add(j, maybeJSBI$9.BigInt(1))) {
          x[j] += carry - 16 * x[i] * L[j - (i - 32)];
          carry = Math.floor((x[j] + 128) / 256);
          x[j] -= carry * 256;
        }

        _x55 = x, _y9 = j, _x55[_y9] = maybeJSBI$9.add(_x55[_y9], carry);
        x[i] = 0;
      }

      carry = 0;

      for (j = 0; j < 32; _x56 = j, j = maybeJSBI$9.add(j, maybeJSBI$9.BigInt(1)), _x56) {
        var _x56;

        x[j] += carry - (x[31] >> 4) * L[j];
        carry = x[j] >> 8;
        x[j] &= 255;
      }

      for (j = 0; j < 32; _x57 = j, j = maybeJSBI$9.add(j, maybeJSBI$9.BigInt(1)), _x57) {
        var _x57, _x58, _y10;

        _x58 = x, _y10 = j, _x58[_y10] = maybeJSBI$9.subtract(_x58[_y10], maybeJSBI$9.multiply(carry, L[j]));
      }

      for (i = 0; i < 32; _x59 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x59) {
        var _x59;

        x[i + 1] += x[i] >> 8;
        r[i] = x[i] & 255;
      }
    }

    function reduce(r) {
      var x = new Float64Array(64),
          i;

      for (i = 0; i < 64; _x60 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x60) {
        var _x60;

        x[i] = r[i];
      }

      for (i = 0; i < 64; _x61 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x61) {
        var _x61;

        r[i] = 0;
      }

      modL(r, x);
    } // Note: difference from C - smlen returned, not passed as argument.


    function crypto_sign(sm, m, n, sk) {
      var d = new Uint8Array(64),
          h = new Uint8Array(64),
          r = new Uint8Array(64);
      var i,
          j,
          x = new Float64Array(64);
      var p = [gf(), gf(), gf(), gf()];
      crypto_hash(d, sk, 32);
      d[0] &= 248;
      d[31] &= 127;
      d[31] |= 64;
      var smlen = n + 64;

      for (i = 0; maybeJSBI$9.lessThan(i, n); _x62 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x62) {
        var _x62;

        sm[64 + i] = m[i];
      }

      for (i = 0; i < 32; _x63 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x63) {
        var _x63;

        sm[32 + i] = d[32 + i];
      }

      crypto_hash(r, sm.subarray(32), n + 32);
      reduce(r);
      scalarbase(p, r);
      pack(sm, p);

      for (i = 32; i < 64; _x64 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x64) {
        var _x64;

        sm[i] = sk[i];
      }

      crypto_hash(h, sm, n + 64);
      reduce(h);

      for (i = 0; i < 64; _x65 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x65) {
        var _x65;

        x[i] = 0;
      }

      for (i = 0; i < 32; _x66 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x66) {
        var _x66;

        x[i] = r[i];
      }

      for (i = 0; i < 32; _x67 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x67) {
        var _x67;

        for (j = 0; j < 32; _x68 = j, j = maybeJSBI$9.add(j, maybeJSBI$9.BigInt(1)), _x68) {
          var _x68, _x69, _y11;

          _x69 = x, _y11 = maybeJSBI$9.add(i, j), _x69[_y11] = maybeJSBI$9.add(_x69[_y11], maybeJSBI$9.multiply(h[i], d[j]));
        }
      }

      modL(sm.subarray(32), x);
      return smlen;
    }

    function unpackneg(r, p) {
      var t = gf(),
          chk = gf(),
          num = gf(),
          den = gf(),
          den2 = gf(),
          den4 = gf(),
          den6 = gf();
      set25519(r[2], gf1);
      unpack25519(r[1], p);
      S(num, r[1]);
      M(den, num, D);
      Z(num, num, r[2]);
      A(den, r[2], den);
      S(den2, den);
      S(den4, den2);
      M(den6, den4, den2);
      M(t, den6, num);
      M(t, t, den);
      pow2523(t, t);
      M(t, t, num);
      M(t, t, den);
      M(t, t, den);
      M(r[0], t, den);
      S(chk, r[0]);
      M(chk, chk, den);
      if (neq25519(chk, num)) M(r[0], r[0], I);
      S(chk, r[0]);
      M(chk, chk, den);
      if (neq25519(chk, num)) return -1;
      if (par25519(r[0]) === p[31] >> 7) Z(r[0], gf0, r[0]);
      M(r[3], r[0], r[1]);
      return 0;
    }

    function crypto_sign_open(m, sm, n, pk) {
      var i;
      var t = new Uint8Array(32),
          h = new Uint8Array(64);
      var p = [gf(), gf(), gf(), gf()],
          q = [gf(), gf(), gf(), gf()];
      if (n < 64) return -1;
      if (unpackneg(q, pk)) return -1;

      for (i = 0; maybeJSBI$9.lessThan(i, n); _x70 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x70) {
        var _x70;

        m[i] = sm[i];
      }

      for (i = 0; i < 32; _x71 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x71) {
        var _x71;

        m[i + 32] = pk[i];
      }

      crypto_hash(h, m, n);
      reduce(h);
      scalarmult(p, q, h);
      scalarbase(q, sm.subarray(32));
      add(p, q);
      pack(t, p);
      n -= 64;

      if (crypto_verify_32(sm, 0, t, 0)) {
        for (i = 0; maybeJSBI$9.lessThan(i, n); _x72 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x72) {
          var _x72;

          m[i] = 0;
        }

        return -1;
      }

      for (i = 0; maybeJSBI$9.lessThan(i, n); _x73 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x73) {
        var _x73;

        m[i] = sm[i + 64];
      }

      return n;
    }

    var crypto_secretbox_KEYBYTES = 32,
        crypto_secretbox_NONCEBYTES = 24,
        crypto_secretbox_ZEROBYTES = 32,
        crypto_secretbox_BOXZEROBYTES = 16,
        crypto_scalarmult_BYTES = 32,
        crypto_scalarmult_SCALARBYTES = 32,
        crypto_box_PUBLICKEYBYTES = 32,
        crypto_box_SECRETKEYBYTES = 32,
        crypto_box_BEFORENMBYTES = 32,
        crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
        crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES,
        crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES,
        crypto_sign_BYTES = 64,
        crypto_sign_PUBLICKEYBYTES = 32,
        crypto_sign_SECRETKEYBYTES = 64,
        crypto_sign_SEEDBYTES = 32,
        crypto_hash_BYTES = 64;
    nacl.lowlevel = {
      crypto_core_hsalsa20: crypto_core_hsalsa20,
      crypto_stream_xor: crypto_stream_xor,
      crypto_stream: crypto_stream,
      crypto_stream_salsa20_xor: crypto_stream_salsa20_xor,
      crypto_stream_salsa20: crypto_stream_salsa20,
      crypto_onetimeauth: crypto_onetimeauth,
      crypto_onetimeauth_verify: crypto_onetimeauth_verify,
      crypto_verify_16: crypto_verify_16,
      crypto_verify_32: crypto_verify_32,
      crypto_secretbox: crypto_secretbox,
      crypto_secretbox_open: crypto_secretbox_open,
      crypto_scalarmult: crypto_scalarmult,
      crypto_scalarmult_base: crypto_scalarmult_base,
      crypto_box_beforenm: crypto_box_beforenm,
      crypto_box_afternm: crypto_box_afternm,
      crypto_box: crypto_box,
      crypto_box_open: crypto_box_open,
      crypto_box_keypair: crypto_box_keypair,
      crypto_hash: crypto_hash,
      crypto_sign: crypto_sign,
      crypto_sign_keypair: crypto_sign_keypair,
      crypto_sign_open: crypto_sign_open,
      crypto_secretbox_KEYBYTES: crypto_secretbox_KEYBYTES,
      crypto_secretbox_NONCEBYTES: crypto_secretbox_NONCEBYTES,
      crypto_secretbox_ZEROBYTES: crypto_secretbox_ZEROBYTES,
      crypto_secretbox_BOXZEROBYTES: crypto_secretbox_BOXZEROBYTES,
      crypto_scalarmult_BYTES: crypto_scalarmult_BYTES,
      crypto_scalarmult_SCALARBYTES: crypto_scalarmult_SCALARBYTES,
      crypto_box_PUBLICKEYBYTES: crypto_box_PUBLICKEYBYTES,
      crypto_box_SECRETKEYBYTES: crypto_box_SECRETKEYBYTES,
      crypto_box_BEFORENMBYTES: crypto_box_BEFORENMBYTES,
      crypto_box_NONCEBYTES: crypto_box_NONCEBYTES,
      crypto_box_ZEROBYTES: crypto_box_ZEROBYTES,
      crypto_box_BOXZEROBYTES: crypto_box_BOXZEROBYTES,
      crypto_sign_BYTES: crypto_sign_BYTES,
      crypto_sign_PUBLICKEYBYTES: crypto_sign_PUBLICKEYBYTES,
      crypto_sign_SECRETKEYBYTES: crypto_sign_SECRETKEYBYTES,
      crypto_sign_SEEDBYTES: crypto_sign_SEEDBYTES,
      crypto_hash_BYTES: crypto_hash_BYTES,
      gf: gf,
      D: D,
      L: L,
      pack25519: pack25519,
      unpack25519: unpack25519,
      M: M,
      A: A,
      S: S,
      Z: Z,
      pow2523: pow2523,
      add: add,
      set25519: set25519,
      modL: modL,
      scalarmult: scalarmult,
      scalarbase: scalarbase
    };
    /* High-level API */

    function checkLengths(k, n) {
      if (k.length !== crypto_secretbox_KEYBYTES) throw new Error('bad key size');
      if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error('bad nonce size');
    }

    function checkBoxLengths(pk, sk) {
      if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error('bad public key size');
      if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
    }

    function checkArrayTypes() {
      for (var i = 0; i < arguments.length; i++) {
        if (!(arguments[i] instanceof Uint8Array)) throw new TypeError('unexpected type, use Uint8Array');
      }
    }

    function cleanup(arr) {
      for (var i = 0; i < arr.length; i++) {
        arr[i] = 0;
      }
    }

    nacl.randomBytes = function (n) {
      var b = new Uint8Array(n);
      randombytes(b, n);
      return b;
    };

    nacl.secretbox = function (msg, nonce, key) {
      checkArrayTypes(msg, nonce, key);
      checkLengths(key, nonce);
      var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
      var c = new Uint8Array(m.length);

      for (var i = 0; i < msg.length; i++) {
        m[i + crypto_secretbox_ZEROBYTES] = msg[i];
      }

      crypto_secretbox(c, m, m.length, nonce, key);
      return c.subarray(crypto_secretbox_BOXZEROBYTES);
    };

    nacl.secretbox.open = function (box, nonce, key) {
      checkArrayTypes(box, nonce, key);
      checkLengths(key, nonce);
      var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
      var m = new Uint8Array(c.length);

      for (var i = 0; i < box.length; i++) {
        c[i + crypto_secretbox_BOXZEROBYTES] = box[i];
      }

      if (c.length < 32) return null;
      if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return null;
      return m.subarray(crypto_secretbox_ZEROBYTES);
    };

    nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
    nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
    nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;

    nacl.scalarMult = function (n, p) {
      checkArrayTypes(n, p);
      if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
      if (p.length !== crypto_scalarmult_BYTES) throw new Error('bad p size');
      var q = new Uint8Array(crypto_scalarmult_BYTES);
      crypto_scalarmult(q, n, p);
      return q;
    };

    nacl.scalarMult.base = function (n) {
      checkArrayTypes(n);
      if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
      var q = new Uint8Array(crypto_scalarmult_BYTES);
      crypto_scalarmult_base(q, n);
      return q;
    };

    nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
    nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;

    nacl.box = function (msg, nonce, publicKey, secretKey) {
      var k = nacl.box.before(publicKey, secretKey);
      return nacl.secretbox(msg, nonce, k);
    };

    nacl.box.before = function (publicKey, secretKey) {
      checkArrayTypes(publicKey, secretKey);
      checkBoxLengths(publicKey, secretKey);
      var k = new Uint8Array(crypto_box_BEFORENMBYTES);
      crypto_box_beforenm(k, publicKey, secretKey);
      return k;
    };

    nacl.box.after = nacl.secretbox;

    nacl.box.open = function (msg, nonce, publicKey, secretKey) {
      var k = nacl.box.before(publicKey, secretKey);
      return nacl.secretbox.open(msg, nonce, k);
    };

    nacl.box.open.after = nacl.secretbox.open;

    nacl.box.keyPair = function () {
      var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
      var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
      crypto_box_keypair(pk, sk);
      return {
        publicKey: pk,
        secretKey: sk
      };
    };

    nacl.box.keyPair.fromSecretKey = function (secretKey) {
      checkArrayTypes(secretKey);
      if (secretKey.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
      var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
      crypto_scalarmult_base(pk, secretKey);
      return {
        publicKey: pk,
        secretKey: new Uint8Array(secretKey)
      };
    };

    nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
    nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
    nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
    nacl.box.nonceLength = crypto_box_NONCEBYTES;
    nacl.box.overheadLength = nacl.secretbox.overheadLength;

    nacl.sign = function (msg, secretKey) {
      checkArrayTypes(msg, secretKey);
      if (secretKey.length !== crypto_sign_SECRETKEYBYTES) throw new Error('bad secret key size');
      var signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
      crypto_sign(signedMsg, msg, msg.length, secretKey);
      return signedMsg;
    };

    nacl.sign.open = function (signedMsg, publicKey) {
      checkArrayTypes(signedMsg, publicKey);
      if (publicKey.length !== crypto_sign_PUBLICKEYBYTES) throw new Error('bad public key size');
      var tmp = new Uint8Array(signedMsg.length);
      var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
      if (mlen < 0) return null;
      var m = new Uint8Array(mlen);

      for (var i = 0; i < m.length; i++) {
        m[i] = tmp[i];
      }

      return m;
    };

    nacl.sign.detached = function (msg, secretKey) {
      var signedMsg = nacl.sign(msg, secretKey);
      var sig = new Uint8Array(crypto_sign_BYTES);

      for (var i = 0; i < sig.length; i++) {
        sig[i] = signedMsg[i];
      }

      return sig;
    };

    nacl.sign.detached.verify = function (msg, sig, publicKey) {
      checkArrayTypes(msg, sig, publicKey);
      if (sig.length !== crypto_sign_BYTES) throw new Error('bad signature size');
      if (publicKey.length !== crypto_sign_PUBLICKEYBYTES) throw new Error('bad public key size');
      var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
      var m = new Uint8Array(crypto_sign_BYTES + msg.length);
      var i;

      for (i = 0; i < crypto_sign_BYTES; _x74 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x74) {
        var _x74;

        sm[i] = sig[i];
      }

      for (i = 0; maybeJSBI$9.lessThan(i, msg.length); _x75 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x75) {
        var _x75;

        sm[i + crypto_sign_BYTES] = msg[i];
      }

      return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
    };

    nacl.sign.keyPair = function () {
      var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
      var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
      crypto_sign_keypair(pk, sk);
      return {
        publicKey: pk,
        secretKey: sk
      };
    };

    nacl.sign.keyPair.fromSecretKey = function (secretKey) {
      checkArrayTypes(secretKey);
      if (secretKey.length !== crypto_sign_SECRETKEYBYTES) throw new Error('bad secret key size');
      var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);

      for (var i = 0; i < pk.length; i++) {
        pk[i] = secretKey[32 + i];
      }

      return {
        publicKey: pk,
        secretKey: new Uint8Array(secretKey)
      };
    };

    nacl.sign.keyPair.fromSeed = function (seed) {
      checkArrayTypes(seed);
      if (seed.length !== crypto_sign_SEEDBYTES) throw new Error('bad seed size');
      var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
      var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);

      for (var i = 0; i < 32; i++) {
        sk[i] = seed[i];
      }

      crypto_sign_keypair(pk, sk, true);
      return {
        publicKey: pk,
        secretKey: sk
      };
    };

    nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
    nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
    nacl.sign.seedLength = crypto_sign_SEEDBYTES;
    nacl.sign.signatureLength = crypto_sign_BYTES;

    nacl.hash = function (msg) {
      checkArrayTypes(msg);
      var h = new Uint8Array(crypto_hash_BYTES);
      crypto_hash(h, msg, msg.length);
      return h;
    };

    nacl.hash.hashLength = crypto_hash_BYTES;

    nacl.verify = function (x, y) {
      checkArrayTypes(x, y); // Zero length arguments are considered not equal.

      if (x.length === 0 || y.length === 0) return false;
      if (maybeJSBI$9.notEqual(x.length, y.length)) return false;
      return vn(x, 0, y, 0, x.length) === 0 ? true : false;
    };

    nacl.setPRNG = function (fn) {
      randombytes = fn;
    };

    (function () {
      // Initialize PRNG if environment provides CSPRNG.
      // If not, methods calling randombytes will throw.
      var crypto = typeof self !== 'undefined' ? self.crypto || self.msCrypto : null;

      if (crypto && crypto.getRandomValues) {
        // Browsers.
        var QUOTA = 65536;
        nacl.setPRNG(function (x, n) {
          var i,
              v = new Uint8Array(n);

          for (i = 0; maybeJSBI$9.lessThan(i, n); i += QUOTA) {
            crypto.getRandomValues(v.subarray(i, i + Math.min(maybeJSBI$9.subtract(n, i), QUOTA)));
          }

          for (i = 0; maybeJSBI$9.lessThan(i, n); _x76 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x76) {
            var _x76;

            x[i] = v[i];
          }

          cleanup(v);
        });
      } else if (typeof commonjsRequire !== 'undefined') {
        // Node.js.
        crypto = nodeCrypto;

        if (crypto && crypto.randomBytes) {
          nacl.setPRNG(function (x, n) {
            var i,
                v = crypto.randomBytes(n);

            for (i = 0; maybeJSBI$9.lessThan(i, n); _x77 = i, i = maybeJSBI$9.add(i, maybeJSBI$9.BigInt(1)), _x77) {
              var _x77;

              x[i] = v[i];
            }

            cleanup(v);
          });
        }
      }
    })();
  })(module.exports ? module.exports : self.nacl = self.nacl || {});
})(naclFast);

var nacl = naclFast.exports;

var maybeJSBI$8 = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

(function (module) {
  /* jshint newcap: false */
  (function (root, f) {

    if (module.exports) module.exports = f(naclFast.exports);else root.ed2curve = f(root.nacl);
  })(commonjsGlobal, function (nacl) {

    if (!nacl) throw new Error('tweetnacl not loaded'); // -- Operations copied from TweetNaCl.js. --

    var gf = function gf(init) {
      var i,
          r = new Float64Array(16);
      if (init) for (i = 0; maybeJSBI$8.lessThan(i, init.length); _x = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x) {
        var _x;

        r[i] = init[i];
      }
      return r;
    };

    var gf0 = gf(),
        gf1 = gf([1]),
        D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
        I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

    function car25519(o) {
      var c;
      var i;

      for (i = 0; i < 16; _x2 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x2) {
        var _x2;

        o[i] += 65536;
        c = Math.floor(o[i] / 65536);
        o[(i + 1) * (i < 15 ? 1 : 0)] += c - 1 + 37 * (c - 1) * (i === 15 ? 1 : 0);
        o[i] -= c * 65536;
      }
    }

    function sel25519(p, q, b) {
      var t,
          c = ~(b - 1);

      for (var i = 0; i < 16; i++) {
        var _x3, _y, _x4, _y2;

        t = c & maybeJSBI$8.bitwiseXor(p[i], q[i]);
        _x3 = p, _y = i, _x3[_y] = maybeJSBI$8.bitwiseXor(_x3[_y], t);
        _x4 = q, _y2 = i, _x4[_y2] = maybeJSBI$8.bitwiseXor(_x4[_y2], t);
      }
    }

    function unpack25519(o, n) {
      var i;

      for (i = 0; i < 16; _x5 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x5) {
        var _x5;

        o[i] = n[2 * i] + (n[2 * i + 1] << 8);
      }

      o[15] &= 0x7fff;
    } // addition


    function A(o, a, b) {
      var i;

      for (i = 0; i < 16; _x6 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x6) {
        var _x6;

        o[i] = maybeJSBI$8.add(a[i], b[i]) | 0;
      }
    } // subtraction


    function Z(o, a, b) {
      var i;

      for (i = 0; i < 16; _x7 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x7) {
        var _x7;

        o[i] = maybeJSBI$8.subtract(a[i], b[i]) | 0;
      }
    } // multiplication


    function M(o, a, b) {
      var i,
          j,
          t = new Float64Array(31);

      for (i = 0; i < 31; _x8 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x8) {
        var _x8;

        t[i] = 0;
      }

      for (i = 0; i < 16; _x9 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x9) {
        var _x9;

        for (j = 0; j < 16; _x10 = j, j = maybeJSBI$8.add(j, maybeJSBI$8.BigInt(1)), _x10) {
          var _x10, _x11, _y3;

          _x11 = t, _y3 = maybeJSBI$8.add(i, j), _x11[_y3] = maybeJSBI$8.add(_x11[_y3], maybeJSBI$8.multiply(a[i], b[j]));
        }
      }

      for (i = 0; i < 15; _x12 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x12) {
        var _x12;

        t[i] += 38 * t[i + 16];
      }

      for (i = 0; i < 16; _x13 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x13) {
        var _x13;

        o[i] = t[i];
      }

      car25519(o);
      car25519(o);
    } // squaring


    function S(o, a) {
      M(o, a, a);
    } // inversion


    function inv25519(o, i) {
      var c = gf();
      var a;

      for (a = 0; a < 16; _x14 = a, a = maybeJSBI$8.add(a, maybeJSBI$8.BigInt(1)), _x14) {
        var _x14;

        c[a] = i[a];
      }

      for (a = 253; a >= 0; _x15 = a, a = maybeJSBI$8.subtract(a, maybeJSBI$8.BigInt(1)), _x15) {
        var _x15;

        S(c, c);
        if (a !== 2 && a !== 4) M(c, c, i);
      }

      for (a = 0; a < 16; _x16 = a, a = maybeJSBI$8.add(a, maybeJSBI$8.BigInt(1)), _x16) {
        var _x16;

        o[a] = c[a];
      }
    }

    function pack25519(o, n) {
      var i, j, b;
      var m = gf(),
          t = gf();

      for (i = 0; i < 16; _x17 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x17) {
        var _x17;

        t[i] = n[i];
      }

      car25519(t);
      car25519(t);
      car25519(t);

      for (j = 0; j < 2; _x18 = j, j = maybeJSBI$8.add(j, maybeJSBI$8.BigInt(1)), _x18) {
        var _x18;

        m[0] = t[0] - 0xffed;

        for (i = 1; i < 15; _x19 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x19) {
          var _x19;

          m[i] = t[i] - 0xffff - (m[i - 1] >> 16 & 1);
          m[i - 1] &= 0xffff;
        }

        m[15] = t[15] - 0x7fff - (m[14] >> 16 & 1);
        b = m[15] >> 16 & 1;
        m[14] &= 0xffff;
        sel25519(t, m, 1 - b);
      }

      for (i = 0; i < 16; _x20 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x20) {
        var _x20;

        o[2 * i] = t[i] & 0xff;
        o[2 * i + 1] = t[i] >> 8;
      }
    }

    function par25519(a) {
      var d = new Uint8Array(32);
      pack25519(d, a);
      return d[0] & 1;
    }

    function vn(x, xi, y, yi, n) {
      var i,
          d = 0;

      for (i = 0; maybeJSBI$8.lessThan(i, n); _x21 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x21) {
        var _x21;

        d |= maybeJSBI$8.bitwiseXor(x[maybeJSBI$8.add(xi, i)], y[maybeJSBI$8.add(yi, i)]);
      }

      return (1 & d - 1 >>> 8) - 1;
    }

    function crypto_verify_32(x, xi, y, yi) {
      return vn(x, xi, y, yi, 32);
    }

    function neq25519(a, b) {
      var c = new Uint8Array(32),
          d = new Uint8Array(32);
      pack25519(c, a);
      pack25519(d, b);
      return crypto_verify_32(c, 0, d, 0);
    }

    function pow2523(o, i) {
      var c = gf();
      var a;

      for (a = 0; a < 16; _x22 = a, a = maybeJSBI$8.add(a, maybeJSBI$8.BigInt(1)), _x22) {
        var _x22;

        c[a] = i[a];
      }

      for (a = 250; a >= 0; _x23 = a, a = maybeJSBI$8.subtract(a, maybeJSBI$8.BigInt(1)), _x23) {
        var _x23;

        S(c, c);
        if (a !== 1) M(c, c, i);
      }

      for (a = 0; a < 16; _x24 = a, a = maybeJSBI$8.add(a, maybeJSBI$8.BigInt(1)), _x24) {
        var _x24;

        o[a] = c[a];
      }
    }

    function set25519(r, a) {
      var i;

      for (i = 0; i < 16; _x25 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x25) {
        var _x25;

        r[i] = a[i] | 0;
      }
    }

    function unpackneg(r, p) {
      var t = gf(),
          chk = gf(),
          num = gf(),
          den = gf(),
          den2 = gf(),
          den4 = gf(),
          den6 = gf();
      set25519(r[2], gf1);
      unpack25519(r[1], p);
      S(num, r[1]);
      M(den, num, D);
      Z(num, num, r[2]);
      A(den, r[2], den);
      S(den2, den);
      S(den4, den2);
      M(den6, den4, den2);
      M(t, den6, num);
      M(t, t, den);
      pow2523(t, t);
      M(t, t, num);
      M(t, t, den);
      M(t, t, den);
      M(r[0], t, den);
      S(chk, r[0]);
      M(chk, chk, den);
      if (neq25519(chk, num)) M(r[0], r[0], I);
      S(chk, r[0]);
      M(chk, chk, den);
      if (neq25519(chk, num)) return -1;
      if (par25519(r[0]) === p[31] >> 7) Z(r[0], gf0, r[0]);
      M(r[3], r[0], r[1]);
      return 0;
    } // ----
    // Converts Ed25519 public key to Curve25519 public key.
    // montgomeryX = (edwardsY + 1)*inverse(1 - edwardsY) mod p


    function convertPublicKey(pk) {
      var z = new Uint8Array(32),
          q = [gf(), gf(), gf(), gf()],
          a = gf(),
          b = gf();
      if (unpackneg(q, pk)) return null; // reject invalid key

      var y = q[1];
      A(a, gf1, y);
      Z(b, gf1, y);
      inv25519(b, b);
      M(a, a, b);
      pack25519(z, a);
      return z;
    } // Converts Ed25519 secret key to Curve25519 secret key.


    function convertSecretKey(sk) {
      var d = new Uint8Array(64),
          o = new Uint8Array(32),
          i;
      nacl.lowlevel.crypto_hash(d, sk, 32);
      d[0] &= 248;
      d[31] &= 127;
      d[31] |= 64;

      for (i = 0; i < 32; _x26 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x26) {
        var _x26;

        o[i] = d[i];
      }

      for (i = 0; i < 64; _x27 = i, i = maybeJSBI$8.add(i, maybeJSBI$8.BigInt(1)), _x27) {
        var _x27;

        d[i] = 0;
      }

      return o;
    }

    function convertKeyPair(edKeyPair) {
      var publicKey = convertPublicKey(edKeyPair.publicKey);
      if (!publicKey) return null;
      return {
        publicKey: publicKey,
        secretKey: convertSecretKey(edKeyPair.secretKey)
      };
    }

    return {
      convertPublicKey: convertPublicKey,
      convertSecretKey: convertSecretKey,
      convertKeyPair: convertKeyPair
    };
  });
})(ed2curve$1);

var ed2curve = ed2curve$1.exports;

function convertSecretKeyToCurve25519(secretKey) {
  return ed2curve.convertSecretKey(secretKey);
}
function convertPublicKeyToCurve25519(publicKey) {
  return assertReturn(ed2curve.convertPublicKey(publicKey), 'Unable to convert publicKey to ed25519');
}

var HDKD = compactAddLength(stringToU8a('Ed25519HDKD'));
function ed25519DeriveHard(seed, chainCode) {
  assert(isU8a(chainCode) && chainCode.length === 32, 'Invalid chainCode passed to derive');
  return blake2AsU8a(u8aConcat(HDKD, seed, chainCode));
}

/**
 * @name randomAsU8a
 * @summary Creates a Uint8Array filled with random bytes.
 * @description
 * Returns a `Uint8Array` with the specified (optional) length filled with random bytes.
 * @example
 * <BR>
 *
 * ```javascript
 * import { randomAsU8a } from '@polkadot/util-crypto';
 *
 * randomAsU8a(); // => Uint8Array([...])
 * ```
 */

function randomAsU8a() {
  var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 32;
  return getRandomValues(new Uint8Array(length));
}

/**
 * @name ed25519PairFromSeed
 * @summary Creates a new public/secret keypair from a seed.
 * @description
 * Returns a object containing a `publicKey` & `secretKey` generated from the supplied seed.
 * @example
 * <BR>
 *
 * ```javascript
 * import { ed25519PairFromSeed } from '@polkadot/util-crypto';
 *
 * ed25519PairFromSeed(...); // => { secretKey: [...], publicKey: [...] }
 * ```
 */

function ed25519PairFromSeed(seed, onlyJs) {
  if (!onlyJs && isReady()) {
    var full = ed25519KeypairFromSeed(seed);
    return {
      publicKey: full.slice(32),
      secretKey: full.slice(0, 64)
    };
  }

  return nacl.sign.keyPair.fromSeed(seed);
}

/**
 * @name ed25519Sign
 * @summary Signs a message using the supplied secretKey
 * @description
 * Returns message signature of `message`, using the `secretKey`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { ed25519Sign } from '@polkadot/util-crypto';
 *
 * ed25519Sign([...], [...]); // => [...]
 * ```
 */

function ed25519Sign(message, _ref, onlyJs) {
  var publicKey = _ref.publicKey,
      secretKey = _ref.secretKey;
  assert(secretKey, 'Expected a valid secretKey');
  var messageU8a = u8aToU8a(message);
  return !onlyJs && isReady() ? ed25519Sign$1(publicKey, secretKey.subarray(0, 32), messageU8a) : nacl.sign.detached(messageU8a, secretKey);
}

/**
 * @name ed25519Sign
 * @summary Verifies the signature on the supplied message.
 * @description
 * Verifies the `signature` on `message` with the supplied `publicKey`. Returns `true` on sucess, `false` otherwise.
 * @example
 * <BR>
 *
 * ```javascript
 * import { ed25519Verify } from '@polkadot/util-crypto';
 *
 * ed25519Verify([...], [...], [...]); // => true/false
 * ```
 */

function ed25519Verify(message, signature, publicKey, onlyJs) {
  var messageU8a = u8aToU8a(message);
  var publicKeyU8a = u8aToU8a(publicKey);
  var signatureU8a = u8aToU8a(signature);
  assert(publicKeyU8a.length === 32, function () {
    return "Invalid publicKey, received ".concat(publicKeyU8a.length, ", expected 32");
  });
  assert(signatureU8a.length === 64, function () {
    return "Invalid signature, received ".concat(signatureU8a.length, " bytes, expected 64");
  });
  return !onlyJs && isReady() ? ed25519Verify$1(signatureU8a, messageU8a, publicKeyU8a) : nacl.sign.detached.verify(messageU8a, signatureU8a, publicKeyU8a);
}

var keyHdkdEd25519 = createSeedDeriveFn(ed25519PairFromSeed, ed25519DeriveHard);

var SEC_LEN = 64;
var PUB_LEN = 32;
var TOT_LEN = SEC_LEN + PUB_LEN;
function sr25519PairFromU8a(full) {
  var fullU8a = u8aToU8a(full);
  assert(fullU8a.length === TOT_LEN, function () {
    return "Expected keypair with ".concat(TOT_LEN, " bytes, found ").concat(fullU8a.length);
  });
  return {
    publicKey: fullU8a.slice(SEC_LEN, TOT_LEN),
    secretKey: fullU8a.slice(0, SEC_LEN)
  };
}

function sr25519KeypairToU8a(_ref) {
  var publicKey = _ref.publicKey,
      secretKey = _ref.secretKey;
  return u8aConcat(secretKey, publicKey).slice();
}

function createDeriveFn(derive) {
  return function (keypair, chainCode) {
    assert(isU8a(chainCode) && chainCode.length === 32, 'Invalid chainCode passed to derive');
    return sr25519PairFromU8a(derive(sr25519KeypairToU8a(keypair), chainCode));
  };
}

var sr25519DeriveHard = createDeriveFn(sr25519DeriveKeypairHard);

var sr25519DeriveSoft = createDeriveFn(sr25519DeriveKeypairSoft);

function keyHdkdSr25519(keypair, _ref) {
  var chainCode = _ref.chainCode,
      isSoft = _ref.isSoft;
  return isSoft ? sr25519DeriveSoft(keypair, chainCode) : sr25519DeriveHard(keypair, chainCode);
}

var generators = {
  ecdsa: keyHdkdEcdsa,
  ed25519: keyHdkdEd25519,
  // FIXME This is Substrate-compatible, not Ethereum-compatible
  ethereum: keyHdkdEcdsa,
  sr25519: keyHdkdSr25519
};
function keyFromPath(pair, path, type) {
  var keyHdkd = generators[type];
  var result = pair;

  var _iterator = _createForOfIteratorHelper(path),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var junction = _step.value;
      result = keyHdkd(result, junction);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return result;
}

/**
 * @name sr25519PairFromSeed
 * @description Returns a object containing a `publicKey` & `secretKey` generated from the supplied seed.
 */

function sr25519PairFromSeed(seed) {
  var seedU8a = u8aToU8a(seed);
  assert(seedU8a.length === 32, function () {
    return "Expected a seed matching 32 bytes, found ".concat(seedU8a.length);
  });
  return sr25519PairFromU8a(sr25519KeypairFromSeed(seedU8a));
}

/**
 * @name sr25519Sign
 * @description Returns message signature of `message`, using the supplied pair
 */

function sr25519Sign(message, _ref) {
  var publicKey = _ref.publicKey,
      secretKey = _ref.secretKey;
  assert((publicKey === null || publicKey === void 0 ? void 0 : publicKey.length) === 32, 'Expected a valid publicKey, 32-bytes');
  assert((secretKey === null || secretKey === void 0 ? void 0 : secretKey.length) === 64, 'Expected a valid secretKey, 64-bytes');
  return sr25519Sign$1(publicKey, secretKey, u8aToU8a(message));
}

/**
 * @name sr25519Verify
 * @description Verifies the signature of `message`, using the supplied pair
 */

function sr25519Verify(message, signature, publicKey) {
  var publicKeyU8a = u8aToU8a(publicKey);
  var signatureU8a = u8aToU8a(signature);
  assert(publicKeyU8a.length === 32, function () {
    return "Invalid publicKey, received ".concat(publicKeyU8a.length, " bytes, expected 32");
  });
  assert(signatureU8a.length === 64, function () {
    return "Invalid signature, received ".concat(signatureU8a.length, " bytes, expected 64");
  });
  return sr25519Verify$1(signatureU8a, u8aToU8a(message), publicKeyU8a);
}

var EMPTY_U8A$1 = new Uint8Array();
/**
 * @name sr25519VrfSign
 * @description Sign with sr25519 vrf signing (deterministic)
 */

function sr25519VrfSign(message, _ref) {
  var secretKey = _ref.secretKey;
  var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : EMPTY_U8A$1;
  var extra = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : EMPTY_U8A$1;
  assert((secretKey === null || secretKey === void 0 ? void 0 : secretKey.length) === 64, 'Invalid secretKey, expected 64-bytes');
  return vrfSign(secretKey, u8aToU8a(context), u8aToU8a(message), u8aToU8a(extra));
}

var EMPTY_U8A = new Uint8Array();
/**
 * @name sr25519VrfVerify
 * @description Verify with sr25519 vrf verification
 */

function sr25519VrfVerify(message, signOutput, publicKey) {
  var context = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : EMPTY_U8A;
  var extra = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : EMPTY_U8A;
  var publicKeyU8a = u8aToU8a(publicKey);
  var proofU8a = u8aToU8a(signOutput);
  assert(publicKeyU8a.length === 32, 'Invalid publicKey, expected 32-bytes');
  assert(proofU8a.length === 96, 'Invalid vrfSign output, expected 96 bytes');
  return vrfVerify(publicKeyU8a, u8aToU8a(context), u8aToU8a(message), u8aToU8a(extra), proofU8a);
}

function encodeAddress(key) {
  var ss58Format = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaults.prefix;
  // decode it, this means we can re-encode an address
  var u8a = decodeAddress(key);
  assert(ss58Format >= 0 && ss58Format <= 16383 && ![46, 47].includes(ss58Format), 'Out of range ss58Format specified');
  assert(defaults.allowedDecodedLengths.includes(u8a.length), function () {
    return "Expected a valid key to convert, with length ".concat(defaults.allowedDecodedLengths.join(', '));
  });
  var input = u8aConcat(ss58Format < 64 ? [ss58Format] : [(ss58Format & 252) >> 2 | 64, ss58Format >> 8 | (ss58Format & 3) << 6], u8a);
  return base58Encode(u8aConcat(input, sshash(input).subarray(0, [32, 33].includes(u8a.length) ? 2 : 1)));
}

var maybeJSBI$7 = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

var SHA3_PI = [],
    SHA3_ROTL = [],
    _SHA3_IOTA = [];

var _0n = JSBI.BigInt(0);

var _1n = JSBI.BigInt(1);

var _2n = JSBI.BigInt(2);

var _7n = JSBI.BigInt(7);

var _256n = JSBI.BigInt(256);

var _0x71n = JSBI.BigInt(0x71);

for (var round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
  // Pi
  var _ref = [y, (2 * x + 3 * y) % 5];
  x = _ref[0];
  y = _ref[1];
  SHA3_PI.push(2 * (5 * y + x)); // Rotational

  SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64); // Iota

  var t = _0n;

  for (var j = 0; j < 7; j++) {
    R = maybeJSBI$7.remainder(maybeJSBI$7.bitwiseXor(maybeJSBI$7.leftShift(R, _1n), maybeJSBI$7.multiply(maybeJSBI$7.signedRightShift(R, _7n), _0x71n)), _256n);
    if (maybeJSBI$7.bitwiseAnd(R, _2n)) t = JSBI.bitwiseXor(t, JSBI.leftShift(_1n, JSBI.subtract(JSBI.leftShift(_1n, JSBI.BigInt(j)), _1n)));
  }

  _SHA3_IOTA.push(t);
}

var _u64$split = split(_SHA3_IOTA, true),
    _u64$split2 = _slicedToArray(_u64$split, 2),
    SHA3_IOTA_H = _u64$split2[0],
    SHA3_IOTA_L = _u64$split2[1]; // Left rotation (without 0, 32, 64)


var rotlH = function rotlH(h, l, s) {
  return s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
};

var rotlL = function rotlL(h, l, s) {
  return s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
}; // Same as keccakf1600, but allows to skip some rounds


function keccakP(s) {
  var rounds = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 24;
  var B = new Uint32Array(5 * 2); // NOTE: all indices are x2 since we store state as u32 instead of u64 (bigints to slow in js)

  for (var _round = 24 - rounds; _round < 24; _round++) {
    var _x8, _y6, _x9, _y7;

    // Theta θ
    for (var _x = 0; _x < 10; _x++) {
      B[_x] = maybeJSBI$7.bitwiseXor(maybeJSBI$7.bitwiseXor(maybeJSBI$7.bitwiseXor(maybeJSBI$7.bitwiseXor(s[_x], s[_x + 10]), s[_x + 20]), s[_x + 30]), s[_x + 40]);
    }

    for (var _x2 = 0; _x2 < 10; _x2 += 2) {
      var idx1 = (_x2 + 8) % 10;
      var idx0 = (_x2 + 2) % 10;
      var B0 = B[idx0];
      var B1 = B[idx0 + 1];
      var Th = maybeJSBI$7.bitwiseXor(rotlH(B0, B1, 1), B[idx1]);
      var Tl = maybeJSBI$7.bitwiseXor(rotlL(B0, B1, 1), B[idx1 + 1]);

      for (var _y = 0; _y < 50; _y += 10) {
        var _x3, _y2, _x4, _y3;

        _x3 = s, _y2 = _x2 + _y, _x3[_y2] = maybeJSBI$7.bitwiseXor(_x3[_y2], Th);
        _x4 = s, _y3 = _x2 + _y + 1, _x4[_y3] = maybeJSBI$7.bitwiseXor(_x4[_y3], Tl);
      }
    } // Rho (ρ) and Pi (π)


    var curH = s[2];
    var curL = s[3];

    for (var _t = 0; _t < 24; _t++) {
      var shift = SHA3_ROTL[_t];

      var _Th = rotlH(curH, curL, shift);

      var _Tl = rotlL(curH, curL, shift);

      var PI = SHA3_PI[_t];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = _Th;
      s[PI + 1] = _Tl;
    } // Chi (χ)


    for (var _y4 = 0; _y4 < 50; _y4 += 10) {
      for (var _x5 = 0; _x5 < 10; _x5++) {
        B[_x5] = s[_y4 + _x5];
      }

      for (var _x6 = 0; _x6 < 10; _x6++) {
        var _x7, _y5;

        _x7 = s, _y5 = _y4 + _x6, _x7[_y5] = maybeJSBI$7.bitwiseXor(_x7[_y5], maybeJSBI$7.bitwiseAnd(maybeJSBI$7.bitwiseNot(B[(_x6 + 2) % 10]), B[(_x6 + 4) % 10]));
      }
    } // Iota (ι)


    _x8 = s, _y6 = 0, _x8[_y6] = maybeJSBI$7.bitwiseXor(_x8[_y6], SHA3_IOTA_H[_round]);
    _x9 = s, _y7 = 1, _x9[_y7] = maybeJSBI$7.bitwiseXor(_x9[_y7], SHA3_IOTA_L[_round]);
  }

  B.fill(0);
}
var Keccak = /*#__PURE__*/function (_Hash) {
  _inherits(Keccak, _Hash);

  var _super = _createSuper(Keccak);

  // NOTE: we accept arguments in bytes instead of bits here.
  function Keccak(blockLen, suffix, outputLen) {
    var _this;

    var enableXOF = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    var rounds = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 24;

    _classCallCheck(this, Keccak);

    _this = _super.call(this);
    _this.blockLen = blockLen;
    _this.suffix = suffix;
    _this.outputLen = outputLen;
    _this.enableXOF = enableXOF;
    _this.rounds = rounds;
    _this.pos = 0;
    _this.posOut = 0;
    _this.finished = false;
    _this.destroyed = false; // Can be passed from user as dkLen

    assertNumber(outputLen); // 1600 = 5x5 matrix of 64bit.  1600 bits === 200 bytes

    if (0 >= _this.blockLen || _this.blockLen >= 200) throw new Error('Sha3 supports only keccak-f1600 function');
    _this.state = new Uint8Array(200);
    _this.state32 = u32(_this.state);
    return _this;
  }

  _createClass(Keccak, [{
    key: "keccak",
    value: function keccak() {
      keccakP(this.state32, this.rounds);
      this.posOut = 0;
      this.pos = 0;
    }
  }, {
    key: "update",
    value: function update(data) {
      if (this.destroyed) throw new Error('instance is destroyed');
      if (this.finished) throw new Error('digest() was already called');
      var blockLen = this.blockLen,
          state = this.state;
      data = toBytes(data);
      var len = data.length;

      for (var pos = 0; pos < len;) {
        var take = Math.min(maybeJSBI$7.subtract(blockLen, this.pos), len - pos);

        for (var i = 0; i < take; i++) {
          var _x10, _y8, _x11, _y9, _z;

          _x10 = state, _y8 = (_x11 = this, _y9 = "pos", _z = _x11[_y9], _x11[_y9] = maybeJSBI$7.add(_z, maybeJSBI$7.BigInt(1)), _z), _x10[_y8] = maybeJSBI$7.bitwiseXor(_x10[_y8], data[pos++]);
        }

        if (maybeJSBI$7.equal(this.pos, blockLen)) this.keccak();
      }

      return this;
    }
  }, {
    key: "finish",
    value: function finish() {
      var _x12, _y10;

      if (this.finished) return;
      this.finished = true;
      var state = this.state,
          suffix = this.suffix,
          pos = this.pos,
          blockLen = this.blockLen; // Do the padding

      _x12 = state, _y10 = pos, _x12[_y10] = maybeJSBI$7.bitwiseXor(_x12[_y10], suffix);
      if ((suffix & 0x80) !== 0 && pos === blockLen - 1) this.keccak();
      state[blockLen - 1] ^= 0x80;
      this.keccak();
    }
  }, {
    key: "writeInto",
    value: function writeInto(out) {
      if (this.destroyed) throw new Error('instance is destroyed');
      if (!(out instanceof Uint8Array)) throw new Error('Keccak: invalid output buffer');
      this.finish();

      for (var pos = 0, len = out.length; pos < len;) {
        if (maybeJSBI$7.greaterThanOrEqual(this.posOut, this.blockLen)) this.keccak();
        var take = Math.min(maybeJSBI$7.subtract(this.blockLen, this.posOut), len - pos);
        out.set(this.state.subarray(this.posOut, this.posOut + take), pos);
        this.posOut += take;
        pos += take;
      }

      return out;
    }
  }, {
    key: "xofInto",
    value: function xofInto(out) {
      // Sha3/Keccak usage with XOF is probably mistake, only SHAKE instances can do XOF
      if (!this.enableXOF) throw new Error('XOF is not possible for this instance');
      return this.writeInto(out);
    }
  }, {
    key: "xof",
    value: function xof(bytes) {
      assertNumber(bytes);
      return this.xofInto(new Uint8Array(bytes));
    }
  }, {
    key: "digestInto",
    value: function digestInto(out) {
      if (maybeJSBI$7.lessThan(out.length, this.outputLen)) throw new Error('Keccak: invalid output buffer');
      if (this.finished) throw new Error('digest() was already called');
      this.finish();
      this.writeInto(out);
      this.destroy();
      return out;
    }
  }, {
    key: "digest",
    value: function digest() {
      return this.digestInto(new Uint8Array(this.outputLen));
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.destroyed = true;
      this.state.fill(0);
    }
  }, {
    key: "_cloneInto",
    value: function _cloneInto(to) {
      var blockLen = this.blockLen,
          suffix = this.suffix,
          outputLen = this.outputLen,
          rounds = this.rounds,
          enableXOF = this.enableXOF;
      to || (to = new Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
      to.state32.set(this.state32);
      to.pos = this.pos;
      to.posOut = this.posOut;
      to.finished = this.finished;
      to.rounds = rounds; // Suffix can change in cSHAKE

      to.suffix = suffix;
      to.outputLen = outputLen;
      to.enableXOF = enableXOF;
      to.destroyed = this.destroyed;
      return to;
    }
  }]);

  return Keccak;
}(Hash);

var gen = function gen(suffix, blockLen, outputLen) {
  return wrapConstructor(function () {
    return new Keccak(blockLen, suffix, outputLen);
  });
};

gen(0x06, 144, 224 / 8);
/**
 * SHA3-256 hash function
 * @param message - that would be hashed
 */

gen(0x06, 136, 256 / 8);
gen(0x06, 104, 384 / 8);
gen(0x06, 72, 512 / 8);
gen(0x01, 144, 224 / 8);
/**
 * keccak-256 hash function. Different from SHA3-256.
 * @param message - that would be hashed
 */

var keccak_256 = gen(0x01, 136, 256 / 8);
gen(0x01, 104, 384 / 8);
var keccak_512 = gen(0x01, 72, 512 / 8);

var genShake = function genShake(suffix, blockLen, outputLen) {
  return wrapConstructorWithOpts(function () {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return new Keccak(blockLen, suffix, opts.dkLen !== undefined ? opts.dkLen : outputLen, true);
  });
};

genShake(0x1f, 168, 128 / 8);
genShake(0x1f, 136, 256 / 8);

/**
 * @name keccakAsU8a
 * @summary Creates a keccak Uint8Array from the input.
 * @description
 * From either a `string` or a `Buffer` input, create the keccak and return the result as a `Uint8Array`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { keccakAsU8a } from '@polkadot/util-crypto';
 *
 * keccakAsU8a('123'); // => Uint8Array
 * ```
 */

var keccakAsU8a = createDualHasher({
  256: keccak256,
  512: keccak512
}, {
  256: keccak_256,
  512: keccak_512
});

function hasher(hashType, data, onlyJs) {
  return hashType === 'keccak' ? keccakAsU8a(data, undefined, onlyJs) : blake2AsU8a(data, undefined, undefined, onlyJs);
}

var l = logger('setSS58Format');
/**
 * @description Sets the global SS58 format to use for address encoding
 * @deprecated Use keyring.setSS58Format
 */

function setSS58Format(prefix) {
  l.warn('Global setting of the ss58Format is deprecated and not recommended. Set format on the keyring (if used) or as pat of the address encode function');
  defaults.prefix = prefix;
}

var config = {
  chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  coder: base.base64,
  type: 'base64'
};
/**
 * @name base64Validate
 * @summary Validates a base64 value.
 * @description
 * Validates that the supplied value is valid base64
 */

var base64Validate = createValidate(config);
/**
 * @name base64Decode
 * @summary Decodes a base64 value.
 * @description
 * From the provided input, decode the base64 and return the result as an `Uint8Array`.
 */

var base64Decode = createDecode(config, base64Validate);
/**
 * @name base64Encode
 * @summary Creates a base64 value.
 * @description
 * From the provided input, create the base64 and return the result as a string.
 */

var base64Encode = createEncode(config);

function secp256k1Compress(publicKey, onlyJs) {
  if (publicKey.length === 33) {
    return publicKey;
  }

  assert(publicKey.length === 65, 'Invalid publicKey provided');
  return !hasBigInt || !onlyJs && isReady() ? secp256k1Compress$1(publicKey) : Point.fromHex(publicKey).toRawBytes(true);
}

function secp256k1Expand(publicKey, onlyJs) {
  if (publicKey.length === 65) {
    return publicKey.subarray(1);
  }

  assert(publicKey.length === 33, 'Invalid publicKey provided');

  if (!hasBigInt || !onlyJs && isReady()) {
    return secp256k1Expand$1(publicKey).subarray(1);
  }

  var _Point$fromHex = Point.fromHex(publicKey),
      x = _Point$fromHex.x,
      y = _Point$fromHex.y;

  return u8aConcat(bnToU8a(x, BN_BE_256_OPTS), bnToU8a(y, BN_BE_256_OPTS));
}

/**
 * @name secp256k1Recover
 * @description Recovers a publicKey from the supplied signature
 */

function secp256k1Recover(msgHash, signature, recovery) {
  var hashType = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'blake2';
  var onlyJs = arguments.length > 4 ? arguments[4] : undefined;
  var sig = u8aToU8a(signature).subarray(0, 64);
  var msg = u8aToU8a(msgHash);
  var publicKey = !hasBigInt || !onlyJs && isReady() ? secp256k1Recover$1(msg, sig, recovery) : recoverPublicKey(msg, Signature.fromCompact(sig).toRawBytes(), recovery);
  assert(publicKey, 'Unable to recover publicKey from signature');
  return hashType === 'keccak' ? secp256k1Expand(publicKey, onlyJs) : secp256k1Compress(publicKey, onlyJs);
}

/**
 * @name secp256k1Sign
 * @description Returns message signature of `message`, using the supplied pair
 */

function secp256k1Sign(message, _ref) {
  var secretKey = _ref.secretKey;
  var hashType = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'blake2';
  var onlyJs = arguments.length > 3 ? arguments[3] : undefined;
  assert((secretKey === null || secretKey === void 0 ? void 0 : secretKey.length) === 32, 'Expected valid secp256k1 secretKey, 32-bytes');
  var data = hasher(hashType, message, onlyJs);

  if (!hasBigInt || !onlyJs && isReady()) {
    return secp256k1Sign$1(data, secretKey);
  }

  var _signSync = signSync(data, secretKey, {
    canonical: true,
    recovered: true
  }),
      _signSync2 = _slicedToArray(_signSync, 2),
      sigBytes = _signSync2[0],
      recoveryParam = _signSync2[1];

  var _Signature$fromHex = Signature.fromHex(sigBytes),
      r = _Signature$fromHex.r,
      s = _Signature$fromHex.s;

  return u8aConcat(bnToU8a(r, BN_BE_256_OPTS), bnToU8a(s, BN_BE_256_OPTS), new Uint8Array([recoveryParam || 0]));
}

var maybeJSBI$6 = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
// https://github.com/indutny/elliptic/blob/e71b2d9359c5fe9437fbf46f1f05096de447de57/lib/elliptic/curves.js#L182

var N = 'ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141'.replace(/ /g, '');
var N_BI = JSBI.BigInt("0x".concat(N));
var N_BN = new BN(N, 'hex');

function addBi(seckey, tweak) {
  var res = u8aToBigInt(tweak, BN_BE_OPTS);
  assert(maybeJSBI$6.lessThan(res, N_BI), 'Tweak parameter is out of range');
  res = maybeJSBI$6.add(res, u8aToBigInt(seckey, BN_BE_OPTS));

  if (maybeJSBI$6.greaterThanOrEqual(res, N_BI)) {
    res = maybeJSBI$6.subtract(res, N_BI);
  }

  assert(maybeJSBI$6.notEqual(res, _0n$2), 'Invalid resulting private key');
  return nToU8a(res, BN_BE_256_OPTS);
}

function addBn(seckey, tweak) {
  var res = new BN(tweak);
  assert(res.cmp(N_BN) < 0, 'Tweak parameter is out of range');
  res.iadd(new BN(seckey));

  if (res.cmp(N_BN) >= 0) {
    res.isub(N_BN);
  }

  assert(!res.isZero(), 'Invalid resulting private key');
  return bnToU8a(res, BN_BE_256_OPTS);
}

function secp256k1PrivateKeyTweakAdd(seckey, tweak, onlyBn) {
  assert(isU8a(seckey) && seckey.length === 32, 'Expected seckey to be an Uint8Array with length 32');
  assert(isU8a(tweak) && tweak.length === 32, 'Expected tweak to be an Uint8Array with length 32');
  return !hasBigInt || onlyBn ? addBn(seckey, tweak) : addBi(seckey, tweak);
}

/**
 * @name secp256k1Verify
 * @description Verifies the signature of `message`, using the supplied pair
 */

function secp256k1Verify(msgHash, signature, address) {
  var hashType = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'blake2';
  var onlyJs = arguments.length > 4 ? arguments[4] : undefined;
  var sig = u8aToU8a(signature);
  assert(sig.length === 65, "Expected signature with 65 bytes, ".concat(sig.length, " found instead"));
  var publicKey = secp256k1Recover(hasher(hashType, msgHash), sig, sig[64], hashType, onlyJs);
  var signerAddr = hasher(hashType, publicKey, onlyJs);
  var inputAddr = u8aToU8a(address); // for Ethereum (keccak) the last 20 bytes is the address

  return u8aEq(publicKey, inputAddr) || (hashType === 'keccak' ? u8aEq(signerAddr.slice(-20), inputAddr.slice(-20)) : u8aEq(signerAddr, inputAddr));
}

function getH160(u8a) {
  if ([33, 65].includes(u8a.length)) {
    u8a = keccakAsU8a(secp256k1Expand(u8a));
  }

  return u8a.slice(-20);
}

function ethereumEncode(addressOrPublic) {
  if (!addressOrPublic) {
    return '0x';
  }

  var u8aAddress = u8aToU8a(addressOrPublic);
  assert([20, 32, 33, 65].includes(u8aAddress.length), 'Invalid address or publicKey passed');
  var address = u8aToHex(getH160(u8aAddress), -1, false);
  var hash = u8aToHex(keccakAsU8a(address), -1, false);
  var result = '';

  for (var i = 0; i < 40; i++) {
    result = "".concat(result).concat(parseInt(hash[i], 16) > 7 ? address[i].toUpperCase() : address[i]);
  }

  return "0x".concat(result);
}

// Copyright 2017-2022 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
var HARDENED = 0x80000000;
function hdValidatePath(path) {
  if (!path.startsWith('m/')) {
    return false;
  }

  var parts = path.split('/').slice(1);

  var _iterator = _createForOfIteratorHelper(parts),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var p = _step.value;
      var n = /^\d+'?$/.test(p) ? parseInt(p.replace(/'$/, ''), 10) : Number.NaN;

      if (isNaN(n) || n >= HARDENED || n < 0) {
        return false;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return true;
}

var maybeJSBI$5 = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
var MASTER_SECRET = stringToU8a('Bitcoin seed');

function createCoded(secretKey, chainCode) {
  return {
    chainCode: chainCode,
    publicKey: secp256k1PairFromSeed(secretKey).publicKey,
    secretKey: secretKey
  };
}

function deriveChild(hd, index) {
  var indexBuffer = bnToU8a(index, BN_BE_32_OPTS);
  var data = maybeJSBI$5.greaterThanOrEqual(index, HARDENED) ? u8aConcat(new Uint8Array(1), hd.secretKey, indexBuffer) : u8aConcat(hd.publicKey, indexBuffer);

  try {
    var I = hmacShaAsU8a(hd.chainCode, data, 512);
    return createCoded(secp256k1PrivateKeyTweakAdd(hd.secretKey, I.slice(0, 32)), I.slice(32));
  } catch (err) {
    // In case parse256(IL) >= n or ki == 0, proceed with the next value for i
    return deriveChild(hd, index + 1);
  }
}

function hdEthereum(seed) {
  var path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var I = hmacShaAsU8a(MASTER_SECRET, seed, 512);
  var hd = createCoded(I.slice(0, 32), I.slice(32));

  if (!path || path === 'm' || path === 'M' || path === "m'" || path === "M'") {
    return hd;
  }

  assert(hdValidatePath(path), 'Invalid derivation path');
  var parts = path.split('/').slice(1);

  var _iterator = _createForOfIteratorHelper(parts),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var p = _step.value;
      hd = deriveChild(hd, maybeJSBI$5.add(parseInt(p, 10), p.length > 1 && p.endsWith("'") ? HARDENED : 0));
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return hd;
}

var maybeJSBI$4 = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};

function pbkdf2Init(hash, _password, _salt, _opts) {
  assertHash(hash);
  var opts = checkOpts({
    dkLen: 32,
    asyncTick: 10
  }, _opts);
  var c = opts.c,
      dkLen = opts.dkLen,
      asyncTick = opts.asyncTick;
  assertNumber(c);
  assertNumber(dkLen);
  assertNumber(asyncTick);
  if (c < 1) throw new Error('PBKDF2: iterations (c) should be >= 1');
  var password = toBytes(_password);
  var salt = toBytes(_salt); // DK = PBKDF2(PRF, Password, Salt, c, dkLen);

  var DK = new Uint8Array(dkLen); // U1 = PRF(Password, Salt + INT_32_BE(i))

  var PRF = hmac.create(hash, password);

  var PRFSalt = PRF._cloneInto().update(salt);

  return {
    c: c,
    dkLen: dkLen,
    asyncTick: asyncTick,
    DK: DK,
    PRF: PRF,
    PRFSalt: PRFSalt
  };
}

function pbkdf2Output(PRF, PRFSalt, DK, prfW, u) {
  PRF.destroy();
  PRFSalt.destroy();
  if (prfW) prfW.destroy();
  u.fill(0);
  return DK;
}
/**
 * PBKDF2-HMAC: RFC 2898 key derivation function
 * @param hash - hash function that would be used e.g. sha256
 * @param password - password from which a derived key is generated
 * @param salt - cryptographic salt
 * @param opts - {c, dkLen} where c is work factor and dkLen is output message size
 */


function pbkdf2(hash, password, salt, opts) {
  var _pbkdf2Init = pbkdf2Init(hash, password, salt, opts),
      c = _pbkdf2Init.c,
      dkLen = _pbkdf2Init.dkLen,
      DK = _pbkdf2Init.DK,
      PRF = _pbkdf2Init.PRF,
      PRFSalt = _pbkdf2Init.PRFSalt;

  var prfW; // Working copy

  var arr = new Uint8Array(4);
  var view = createView(arr);
  var u = new Uint8Array(PRF.outputLen); // DK = T1 + T2 + ⋯ + Tdklen/hlen

  for (var ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
    // Ti = F(Password, Salt, c, i)
    var Ti = DK.subarray(pos, pos + PRF.outputLen);
    view.setInt32(0, ti, false); // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
    // U1 = PRF(Password, Salt + INT_32_BE(i))

    (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);

    Ti.set(u.subarray(0, Ti.length));

    for (var ui = 1; ui < c; ui++) {
      // Uc = PRF(Password, Uc−1)
      PRF._cloneInto(prfW).update(u).digestInto(u);

      for (var i = 0; i < Ti.length; i++) {
        var _x, _y;

        _x = Ti, _y = i, _x[_y] = maybeJSBI$4.bitwiseXor(_x[_y], u[i]);
      }
    }
  }

  return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
}

function pbkdf2Encode(passphrase) {
  var salt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : randomAsU8a();
  var rounds = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 2048;
  var onlyJs = arguments.length > 3 ? arguments[3] : undefined;
  var u8aPass = u8aToU8a(passphrase);
  var u8aSalt = u8aToU8a(salt);
  return {
    password: !hasBigInt || !onlyJs && isReady() ? pbkdf2$1(u8aPass, u8aSalt, rounds) : pbkdf2(sha512$1, u8aPass, u8aSalt, {
      c: rounds,
      dkLen: 64
    }),
    rounds: rounds,
    salt: salt
  };
}

/**
 * @name shaAsU8a
 * @summary Creates a sha Uint8Array from the input.
 */

var shaAsU8a = createDualHasher({
  256: sha256,
  512: sha512
}, {
  256: sha256$1,
  512: sha512$1
});
/**
 * @name sha256AsU8a
 * @summary Creates a sha256 Uint8Array from the input.
 */

var sha256AsU8a = createBitHasher(256, shaAsU8a);

// Copyright 2017-2022 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Adapted from the bitcoinjs/bip39 source
// https://github.com/bitcoinjs/bip39/blob/1d063b6a6aee4145b34d701037cd3e67f5446ff9/ts_src/
var DEFAULT_WORDLIST = 'abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident|account|accuse|achieve|acid|acoustic|acquire|across|act|action|actor|actress|actual|adapt|add|addict|address|adjust|admit|adult|advance|advice|aerobic|affair|afford|afraid|again|age|agent|agree|ahead|aim|air|airport|aisle|alarm|album|alcohol|alert|alien|all|alley|allow|almost|alone|alpha|already|also|alter|always|amateur|amazing|among|amount|amused|analyst|anchor|ancient|anger|angle|angry|animal|ankle|announce|annual|another|answer|antenna|antique|anxiety|any|apart|apology|appear|apple|approve|april|arch|arctic|area|arena|argue|arm|armed|armor|army|around|arrange|arrest|arrive|arrow|art|artefact|artist|artwork|ask|aspect|assault|asset|assist|assume|asthma|athlete|atom|attack|attend|attitude|attract|auction|audit|august|aunt|author|auto|autumn|average|avocado|avoid|awake|aware|away|awesome|awful|awkward|axis|baby|bachelor|bacon|badge|bag|balance|balcony|ball|bamboo|banana|banner|bar|barely|bargain|barrel|base|basic|basket|battle|beach|bean|beauty|because|become|beef|before|begin|behave|behind|believe|below|belt|bench|benefit|best|betray|better|between|beyond|bicycle|bid|bike|bind|biology|bird|birth|bitter|black|blade|blame|blanket|blast|bleak|bless|blind|blood|blossom|blouse|blue|blur|blush|board|boat|body|boil|bomb|bone|bonus|book|boost|border|boring|borrow|boss|bottom|bounce|box|boy|bracket|brain|brand|brass|brave|bread|breeze|brick|bridge|brief|bright|bring|brisk|broccoli|broken|bronze|broom|brother|brown|brush|bubble|buddy|budget|buffalo|build|bulb|bulk|bullet|bundle|bunker|burden|burger|burst|bus|business|busy|butter|buyer|buzz|cabbage|cabin|cable|cactus|cage|cake|call|calm|camera|camp|can|canal|cancel|candy|cannon|canoe|canvas|canyon|capable|capital|captain|car|carbon|card|cargo|carpet|carry|cart|case|cash|casino|castle|casual|cat|catalog|catch|category|cattle|caught|cause|caution|cave|ceiling|celery|cement|census|century|cereal|certain|chair|chalk|champion|change|chaos|chapter|charge|chase|chat|cheap|check|cheese|chef|cherry|chest|chicken|chief|child|chimney|choice|choose|chronic|chuckle|chunk|churn|cigar|cinnamon|circle|citizen|city|civil|claim|clap|clarify|claw|clay|clean|clerk|clever|click|client|cliff|climb|clinic|clip|clock|clog|close|cloth|cloud|clown|club|clump|cluster|clutch|coach|coast|coconut|code|coffee|coil|coin|collect|color|column|combine|come|comfort|comic|common|company|concert|conduct|confirm|congress|connect|consider|control|convince|cook|cool|copper|copy|coral|core|corn|correct|cost|cotton|couch|country|couple|course|cousin|cover|coyote|crack|cradle|craft|cram|crane|crash|crater|crawl|crazy|cream|credit|creek|crew|cricket|crime|crisp|critic|crop|cross|crouch|crowd|crucial|cruel|cruise|crumble|crunch|crush|cry|crystal|cube|culture|cup|cupboard|curious|current|curtain|curve|cushion|custom|cute|cycle|dad|damage|damp|dance|danger|daring|dash|daughter|dawn|day|deal|debate|debris|decade|december|decide|decline|decorate|decrease|deer|defense|define|defy|degree|delay|deliver|demand|demise|denial|dentist|deny|depart|depend|deposit|depth|deputy|derive|describe|desert|design|desk|despair|destroy|detail|detect|develop|device|devote|diagram|dial|diamond|diary|dice|diesel|diet|differ|digital|dignity|dilemma|dinner|dinosaur|direct|dirt|disagree|discover|disease|dish|dismiss|disorder|display|distance|divert|divide|divorce|dizzy|doctor|document|dog|doll|dolphin|domain|donate|donkey|donor|door|dose|double|dove|draft|dragon|drama|drastic|draw|dream|dress|drift|drill|drink|drip|drive|drop|drum|dry|duck|dumb|dune|during|dust|dutch|duty|dwarf|dynamic|eager|eagle|early|earn|earth|easily|east|easy|echo|ecology|economy|edge|edit|educate|effort|egg|eight|either|elbow|elder|electric|elegant|element|elephant|elevator|elite|else|embark|embody|embrace|emerge|emotion|employ|empower|empty|enable|enact|end|endless|endorse|enemy|energy|enforce|engage|engine|enhance|enjoy|enlist|enough|enrich|enroll|ensure|enter|entire|entry|envelope|episode|equal|equip|era|erase|erode|erosion|error|erupt|escape|essay|essence|estate|eternal|ethics|evidence|evil|evoke|evolve|exact|example|excess|exchange|excite|exclude|excuse|execute|exercise|exhaust|exhibit|exile|exist|exit|exotic|expand|expect|expire|explain|expose|express|extend|extra|eye|eyebrow|fabric|face|faculty|fade|faint|faith|fall|false|fame|family|famous|fan|fancy|fantasy|farm|fashion|fat|fatal|father|fatigue|fault|favorite|feature|february|federal|fee|feed|feel|female|fence|festival|fetch|fever|few|fiber|fiction|field|figure|file|film|filter|final|find|fine|finger|finish|fire|firm|first|fiscal|fish|fit|fitness|fix|flag|flame|flash|flat|flavor|flee|flight|flip|float|flock|floor|flower|fluid|flush|fly|foam|focus|fog|foil|fold|follow|food|foot|force|forest|forget|fork|fortune|forum|forward|fossil|foster|found|fox|fragile|frame|frequent|fresh|friend|fringe|frog|front|frost|frown|frozen|fruit|fuel|fun|funny|furnace|fury|future|gadget|gain|galaxy|gallery|game|gap|garage|garbage|garden|garlic|garment|gas|gasp|gate|gather|gauge|gaze|general|genius|genre|gentle|genuine|gesture|ghost|giant|gift|giggle|ginger|giraffe|girl|give|glad|glance|glare|glass|glide|glimpse|globe|gloom|glory|glove|glow|glue|goat|goddess|gold|good|goose|gorilla|gospel|gossip|govern|gown|grab|grace|grain|grant|grape|grass|gravity|great|green|grid|grief|grit|grocery|group|grow|grunt|guard|guess|guide|guilt|guitar|gun|gym|habit|hair|half|hammer|hamster|hand|happy|harbor|hard|harsh|harvest|hat|have|hawk|hazard|head|health|heart|heavy|hedgehog|height|hello|helmet|help|hen|hero|hidden|high|hill|hint|hip|hire|history|hobby|hockey|hold|hole|holiday|hollow|home|honey|hood|hope|horn|horror|horse|hospital|host|hotel|hour|hover|hub|huge|human|humble|humor|hundred|hungry|hunt|hurdle|hurry|hurt|husband|hybrid|ice|icon|idea|identify|idle|ignore|ill|illegal|illness|image|imitate|immense|immune|impact|impose|improve|impulse|inch|include|income|increase|index|indicate|indoor|industry|infant|inflict|inform|inhale|inherit|initial|inject|injury|inmate|inner|innocent|input|inquiry|insane|insect|inside|inspire|install|intact|interest|into|invest|invite|involve|iron|island|isolate|issue|item|ivory|jacket|jaguar|jar|jazz|jealous|jeans|jelly|jewel|job|join|joke|journey|joy|judge|juice|jump|jungle|junior|junk|just|kangaroo|keen|keep|ketchup|key|kick|kid|kidney|kind|kingdom|kiss|kit|kitchen|kite|kitten|kiwi|knee|knife|knock|know|lab|label|labor|ladder|lady|lake|lamp|language|laptop|large|later|latin|laugh|laundry|lava|law|lawn|lawsuit|layer|lazy|leader|leaf|learn|leave|lecture|left|leg|legal|legend|leisure|lemon|lend|length|lens|leopard|lesson|letter|level|liar|liberty|library|license|life|lift|light|like|limb|limit|link|lion|liquid|list|little|live|lizard|load|loan|lobster|local|lock|logic|lonely|long|loop|lottery|loud|lounge|love|loyal|lucky|luggage|lumber|lunar|lunch|luxury|lyrics|machine|mad|magic|magnet|maid|mail|main|major|make|mammal|man|manage|mandate|mango|mansion|manual|maple|marble|march|margin|marine|market|marriage|mask|mass|master|match|material|math|matrix|matter|maximum|maze|meadow|mean|measure|meat|mechanic|medal|media|melody|melt|member|memory|mention|menu|mercy|merge|merit|merry|mesh|message|metal|method|middle|midnight|milk|million|mimic|mind|minimum|minor|minute|miracle|mirror|misery|miss|mistake|mix|mixed|mixture|mobile|model|modify|mom|moment|monitor|monkey|monster|month|moon|moral|more|morning|mosquito|mother|motion|motor|mountain|mouse|move|movie|much|muffin|mule|multiply|muscle|museum|mushroom|music|must|mutual|myself|mystery|myth|naive|name|napkin|narrow|nasty|nation|nature|near|neck|need|negative|neglect|neither|nephew|nerve|nest|net|network|neutral|never|news|next|nice|night|noble|noise|nominee|noodle|normal|north|nose|notable|note|nothing|notice|novel|now|nuclear|number|nurse|nut|oak|obey|object|oblige|obscure|observe|obtain|obvious|occur|ocean|october|odor|off|offer|office|often|oil|okay|old|olive|olympic|omit|once|one|onion|online|only|open|opera|opinion|oppose|option|orange|orbit|orchard|order|ordinary|organ|orient|original|orphan|ostrich|other|outdoor|outer|output|outside|oval|oven|over|own|owner|oxygen|oyster|ozone|pact|paddle|page|pair|palace|palm|panda|panel|panic|panther|paper|parade|parent|park|parrot|party|pass|patch|path|patient|patrol|pattern|pause|pave|payment|peace|peanut|pear|peasant|pelican|pen|penalty|pencil|people|pepper|perfect|permit|person|pet|phone|photo|phrase|physical|piano|picnic|picture|piece|pig|pigeon|pill|pilot|pink|pioneer|pipe|pistol|pitch|pizza|place|planet|plastic|plate|play|please|pledge|pluck|plug|plunge|poem|poet|point|polar|pole|police|pond|pony|pool|popular|portion|position|possible|post|potato|pottery|poverty|powder|power|practice|praise|predict|prefer|prepare|present|pretty|prevent|price|pride|primary|print|priority|prison|private|prize|problem|process|produce|profit|program|project|promote|proof|property|prosper|protect|proud|provide|public|pudding|pull|pulp|pulse|pumpkin|punch|pupil|puppy|purchase|purity|purpose|purse|push|put|puzzle|pyramid|quality|quantum|quarter|question|quick|quit|quiz|quote|rabbit|raccoon|race|rack|radar|radio|rail|rain|raise|rally|ramp|ranch|random|range|rapid|rare|rate|rather|raven|raw|razor|ready|real|reason|rebel|rebuild|recall|receive|recipe|record|recycle|reduce|reflect|reform|refuse|region|regret|regular|reject|relax|release|relief|rely|remain|remember|remind|remove|render|renew|rent|reopen|repair|repeat|replace|report|require|rescue|resemble|resist|resource|response|result|retire|retreat|return|reunion|reveal|review|reward|rhythm|rib|ribbon|rice|rich|ride|ridge|rifle|right|rigid|ring|riot|ripple|risk|ritual|rival|river|road|roast|robot|robust|rocket|romance|roof|rookie|room|rose|rotate|rough|round|route|royal|rubber|rude|rug|rule|run|runway|rural|sad|saddle|sadness|safe|sail|salad|salmon|salon|salt|salute|same|sample|sand|satisfy|satoshi|sauce|sausage|save|say|scale|scan|scare|scatter|scene|scheme|school|science|scissors|scorpion|scout|scrap|screen|script|scrub|sea|search|season|seat|second|secret|section|security|seed|seek|segment|select|sell|seminar|senior|sense|sentence|series|service|session|settle|setup|seven|shadow|shaft|shallow|share|shed|shell|sheriff|shield|shift|shine|ship|shiver|shock|shoe|shoot|shop|short|shoulder|shove|shrimp|shrug|shuffle|shy|sibling|sick|side|siege|sight|sign|silent|silk|silly|silver|similar|simple|since|sing|siren|sister|situate|six|size|skate|sketch|ski|skill|skin|skirt|skull|slab|slam|sleep|slender|slice|slide|slight|slim|slogan|slot|slow|slush|small|smart|smile|smoke|smooth|snack|snake|snap|sniff|snow|soap|soccer|social|sock|soda|soft|solar|soldier|solid|solution|solve|someone|song|soon|sorry|sort|soul|sound|soup|source|south|space|spare|spatial|spawn|speak|special|speed|spell|spend|sphere|spice|spider|spike|spin|spirit|split|spoil|sponsor|spoon|sport|spot|spray|spread|spring|spy|square|squeeze|squirrel|stable|stadium|staff|stage|stairs|stamp|stand|start|state|stay|steak|steel|stem|step|stereo|stick|still|sting|stock|stomach|stone|stool|story|stove|strategy|street|strike|strong|struggle|student|stuff|stumble|style|subject|submit|subway|success|such|sudden|suffer|sugar|suggest|suit|summer|sun|sunny|sunset|super|supply|supreme|sure|surface|surge|surprise|surround|survey|suspect|sustain|swallow|swamp|swap|swarm|swear|sweet|swift|swim|swing|switch|sword|symbol|symptom|syrup|system|table|tackle|tag|tail|talent|talk|tank|tape|target|task|taste|tattoo|taxi|teach|team|tell|ten|tenant|tennis|tent|term|test|text|thank|that|theme|then|theory|there|they|thing|this|thought|three|thrive|throw|thumb|thunder|ticket|tide|tiger|tilt|timber|time|tiny|tip|tired|tissue|title|toast|tobacco|today|toddler|toe|together|toilet|token|tomato|tomorrow|tone|tongue|tonight|tool|tooth|top|topic|topple|torch|tornado|tortoise|toss|total|tourist|toward|tower|town|toy|track|trade|traffic|tragic|train|transfer|trap|trash|travel|tray|treat|tree|trend|trial|tribe|trick|trigger|trim|trip|trophy|trouble|truck|true|truly|trumpet|trust|truth|try|tube|tuition|tumble|tuna|tunnel|turkey|turn|turtle|twelve|twenty|twice|twin|twist|two|type|typical|ugly|umbrella|unable|unaware|uncle|uncover|under|undo|unfair|unfold|unhappy|uniform|unique|unit|universe|unknown|unlock|until|unusual|unveil|update|upgrade|uphold|upon|upper|upset|urban|urge|usage|use|used|useful|useless|usual|utility|vacant|vacuum|vague|valid|valley|valve|van|vanish|vapor|various|vast|vault|vehicle|velvet|vendor|venture|venue|verb|verify|version|very|vessel|veteran|viable|vibrant|vicious|victory|video|view|village|vintage|violin|virtual|virus|visa|visit|visual|vital|vivid|vocal|voice|void|volcano|volume|vote|voyage|wage|wagon|wait|walk|wall|walnut|want|warfare|warm|warrior|wash|wasp|waste|water|wave|way|wealth|weapon|wear|weasel|weather|web|wedding|weekend|weird|welcome|west|wet|whale|what|wheat|wheel|when|where|whip|whisper|wide|width|wife|wild|will|win|window|wine|wing|wink|winner|winter|wire|wisdom|wise|wish|witness|wolf|woman|wonder|wood|wool|word|work|world|worry|worth|wrap|wreck|wrestle|wrist|write|wrong|yard|year|yellow|you|young|youth|zebra|zero|zone|zoo'.split('|');

var maybeJSBI$3 = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
var INVALID_MNEMONIC = 'Invalid mnemonic';
var INVALID_ENTROPY = 'Invalid entropy';
var INVALID_CHECKSUM = 'Invalid mnemonic checksum';

function normalize(str) {
  return (str || '').normalize('NFKD');
}

function binaryToByte(bin) {
  return parseInt(bin, 2);
}

function bytesToBinary(bytes) {
  return bytes.map(function (x) {
    return x.toString(2).padStart(8, '0');
  }).join('');
}

function deriveChecksumBits(entropyBuffer) {
  return bytesToBinary(Array.from(sha256AsU8a(entropyBuffer))).slice(0, entropyBuffer.length * 8 / 32);
}

function mnemonicToSeedSync(mnemonic, password) {
  return pbkdf2Encode(stringToU8a(normalize(mnemonic)), stringToU8a("mnemonic".concat(normalize(password)))).password;
}
function mnemonicToEntropy$1(mnemonic) {
  var _entropyBits$match;

  var words = normalize(mnemonic).split(' ');
  assert(words.length % 3 === 0, INVALID_MNEMONIC); // convert word indices to 11 bit binary strings

  var bits = words.map(function (word) {
    var index = DEFAULT_WORDLIST.indexOf(word);
    assert(index !== -1, INVALID_MNEMONIC);
    return index.toString(2).padStart(11, '0');
  }).join(''); // split the binary string into ENT/CS

  var dividerIndex = Math.floor(bits.length / 33) * 32;
  var entropyBits = bits.slice(0, dividerIndex);
  var checksumBits = bits.slice(dividerIndex); // calculate the checksum and compare

  var entropyBytes = (_entropyBits$match = entropyBits.match(/(.{1,8})/g)) === null || _entropyBits$match === void 0 ? void 0 : _entropyBits$match.map(binaryToByte);
  assert(entropyBytes && entropyBytes.length % 4 === 0 && entropyBytes.length >= 16 && entropyBytes.length <= 32, INVALID_ENTROPY);
  var entropy = u8aToU8a(entropyBytes);
  var newChecksum = deriveChecksumBits(entropy);
  assert(maybeJSBI$3.equal(newChecksum, checksumBits), INVALID_CHECKSUM);
  return entropy;
}
function validateMnemonic(mnemonic) {
  try {
    mnemonicToEntropy$1(mnemonic);
  } catch (e) {
    return false;
  }

  return true;
}

function mnemonicToEntropy(mnemonic, onlyJs) {
  return !hasBigInt || !onlyJs && isReady() ? bip39ToEntropy(mnemonic) : mnemonicToEntropy$1(mnemonic);
}

/**
 * @name mnemonicValidate
 * @summary Validates a mnemonic input using [BIP39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki).
 * @example
 * <BR>
 *
 * ```javascript
 * import { mnemonicGenerate, mnemonicValidate } from '@polkadot/util-crypto';
 *
 * const mnemonic = mnemonicGenerate(); // => string
 * const isValidMnemonic = mnemonicValidate(mnemonic); // => boolean
 * ```
 */

function mnemonicValidate(mnemonic, onlyJs) {
  return !hasBigInt || !onlyJs && isReady() ? bip39Validate(mnemonic) : validateMnemonic(mnemonic);
}

/**
 * @name mnemonicToLegacySeed
 * @summary Creates a valid Ethereum/Bitcoin-compatible seed from a mnemonic input
 * @example
 * <BR>
 *
 * ```javascript
 * import { mnemonicGenerate, mnemonicToLegacySeed, mnemonicValidate } from '@polkadot/util-crypto';
 *
 * const mnemonic = mnemonicGenerate(); // => string
 * const isValidMnemonic = mnemonicValidate(mnemonic); // => boolean
 *
 * if (isValidMnemonic) {
 *   console.log(`Seed generated from mnemonic: ${mnemonicToLegacySeed(mnemonic)}`); => u8a
 * }
 * ```
 */

function mnemonicToLegacySeed(mnemonic) {
  var password = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var onlyJs = arguments.length > 2 ? arguments[2] : undefined;
  var byteLength = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 32;
  assert(mnemonicValidate(mnemonic), 'Invalid bip39 mnemonic specified');
  assert([32, 64].includes(byteLength), function () {
    return "Invalid seed length ".concat(byteLength, ", expected 32 or 64");
  });
  return byteLength === 32 ? !hasBigInt || !onlyJs && isReady() ? bip39ToSeed(mnemonic, password) : mnemonicToSeedSync(mnemonic, password).subarray(0, 32) : mnemonicToSeedSync(mnemonic, password);
}

function mnemonicToMiniSecret(mnemonic) {
  var password = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var onlyJs = arguments.length > 2 ? arguments[2] : undefined;
  assert(mnemonicValidate(mnemonic), 'Invalid bip39 mnemonic specified');

  if (!onlyJs && isReady()) {
    return bip39ToMiniSecret(mnemonic, password);
  }

  var entropy = mnemonicToEntropy(mnemonic);
  var salt = stringToU8a("mnemonic".concat(password)); // return the first 32 bytes as the seed

  return pbkdf2Encode(entropy, salt).password.slice(0, 32);
}

/**
 * @name naclDecrypt
 * @summary Decrypts a message using the supplied secretKey and nonce
 * @description
 * Returns an decrypted message, using the `secret` and `nonce`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { naclDecrypt } from '@polkadot/util-crypto';
 *
 * naclDecrypt([...], [...], [...]); // => [...]
 * ```
 */

function naclDecrypt(encrypted, nonce, secret) {
  return nacl.secretbox.open(encrypted, nonce, secret) || null;
}

/**
 * @name naclEncrypt
 * @summary Encrypts a message using the supplied secretKey and nonce
 * @description
 * Returns an encrypted message, using the `secretKey` and `nonce`. If the `nonce` was not supplied, a random value is generated.
 * @example
 * <BR>
 *
 * ```javascript
 * import { naclEncrypt } from '@polkadot/util-crypto';
 *
 * naclEncrypt([...], [...]); // => [...]
 * ```
 */

function naclEncrypt(message, secret) {
  var nonce = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : randomAsU8a(24);
  return {
    encrypted: nacl.secretbox(message, nonce, secret),
    nonce: nonce
  };
}

/**
 * @name naclOpen
 * @summary Opens a message using the receiver's secretKey and nonce
 * @description
 * Returns a message sealed by the sender, using the receiver's `secret` and `nonce`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { naclOpen } from '@polkadot/util-crypto';
 *
 * naclOpen([...], [...], [...]); // => [...]
 * ```
 */

function naclOpen(sealed, nonce, senderBoxPublic, receiverBoxSecret) {
  return nacl.box.open(sealed, nonce, senderBoxPublic, receiverBoxSecret) || null;
}

/**
 * @name naclSeal
 * @summary Seals a message using the sender's encrypting secretKey, receiver's public key, and nonce
 * @description
 * Returns an encrypted message which can be open only by receiver's secretKey. If the `nonce` was not supplied, a random value is generated.
 * @example
 * <BR>
 *
 * ```javascript
 * import { naclSeal } from '@polkadot/util-crypto';
 *
 * naclSeal([...], [...], [...], [...]); // => [...]
 * ```
 */

function naclSeal(message, senderBoxSecret, receiverBoxPublic) {
  var nonce = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : randomAsU8a(24);
  return {
    nonce: nonce,
    sealed: nacl.box(message, nonce, receiverBoxPublic, senderBoxSecret)
  };
}

var maybeJSBI$2 = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
// Left rotate for uint32

var rotl = function rotl(a, b) {
  return maybeJSBI$2.leftShift(a, b) | a >>> 32 - b;
}; // The main Scrypt loop: uses Salsa extensively.
// Six versions of the function were tried, this is the fastest one.
// prettier-ignore


function XorAndSalsa(prev, pi, input, ii, out, oi) {
  var _x, _x2, _x3, _x4, _x5, _x6, _x7, _x8, _x9, _x10, _x11, _x12, _x13, _x14, _x15, _x16, _x17, _x18, _x19, _x20, _x21, _x22, _x23, _x24, _x25, _x26, _x27, _x28, _x29, _x30, _x31, _x32, _x33, _x34, _x35, _x36, _x37, _x38, _x39, _x40, _x41, _x42, _x43, _x44, _x45, _x46, _x47, _x48;

  // Based on https://cr.yp.to/salsa20.html
  // Xor blocks
  var y00 = maybeJSBI$2.bitwiseXor(prev[(_x = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x)], input[(_x2 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x2)]),
      y01 = maybeJSBI$2.bitwiseXor(prev[(_x3 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x3)], input[(_x4 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x4)]);
  var y02 = maybeJSBI$2.bitwiseXor(prev[(_x5 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x5)], input[(_x6 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x6)]),
      y03 = maybeJSBI$2.bitwiseXor(prev[(_x7 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x7)], input[(_x8 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x8)]);
  var y04 = maybeJSBI$2.bitwiseXor(prev[(_x9 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x9)], input[(_x10 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x10)]),
      y05 = maybeJSBI$2.bitwiseXor(prev[(_x11 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x11)], input[(_x12 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x12)]);
  var y06 = maybeJSBI$2.bitwiseXor(prev[(_x13 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x13)], input[(_x14 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x14)]),
      y07 = maybeJSBI$2.bitwiseXor(prev[(_x15 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x15)], input[(_x16 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x16)]);
  var y08 = maybeJSBI$2.bitwiseXor(prev[(_x17 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x17)], input[(_x18 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x18)]),
      y09 = maybeJSBI$2.bitwiseXor(prev[(_x19 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x19)], input[(_x20 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x20)]);
  var y10 = maybeJSBI$2.bitwiseXor(prev[(_x21 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x21)], input[(_x22 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x22)]),
      y11 = maybeJSBI$2.bitwiseXor(prev[(_x23 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x23)], input[(_x24 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x24)]);
  var y12 = maybeJSBI$2.bitwiseXor(prev[(_x25 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x25)], input[(_x26 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x26)]),
      y13 = maybeJSBI$2.bitwiseXor(prev[(_x27 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x27)], input[(_x28 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x28)]);
  var y14 = maybeJSBI$2.bitwiseXor(prev[(_x29 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x29)], input[(_x30 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x30)]),
      y15 = maybeJSBI$2.bitwiseXor(prev[(_x31 = pi, pi = maybeJSBI$2.add(pi, maybeJSBI$2.BigInt(1)), _x31)], input[(_x32 = ii, ii = maybeJSBI$2.add(ii, maybeJSBI$2.BigInt(1)), _x32)]); // Save state to temporary variables (salsa)

  var x00 = y00,
      x01 = y01,
      x02 = y02,
      x03 = y03,
      x04 = y04,
      x05 = y05,
      x06 = y06,
      x07 = y07,
      x08 = y08,
      x09 = y09,
      x10 = y10,
      x11 = y11,
      x12 = y12,
      x13 = y13,
      x14 = y14,
      x15 = y15; // Main loop (salsa)

  for (var i = 0; i < 8; i += 2) {
    x04 = maybeJSBI$2.bitwiseXor(x04, rotl(maybeJSBI$2.add(x00, x12) | 0, 7));
    x08 = maybeJSBI$2.bitwiseXor(x08, rotl(maybeJSBI$2.add(x04, x00) | 0, 9));
    x12 = maybeJSBI$2.bitwiseXor(x12, rotl(maybeJSBI$2.add(x08, x04) | 0, 13));
    x00 = maybeJSBI$2.bitwiseXor(x00, rotl(maybeJSBI$2.add(x12, x08) | 0, 18));
    x09 = maybeJSBI$2.bitwiseXor(x09, rotl(maybeJSBI$2.add(x05, x01) | 0, 7));
    x13 = maybeJSBI$2.bitwiseXor(x13, rotl(maybeJSBI$2.add(x09, x05) | 0, 9));
    x01 = maybeJSBI$2.bitwiseXor(x01, rotl(maybeJSBI$2.add(x13, x09) | 0, 13));
    x05 = maybeJSBI$2.bitwiseXor(x05, rotl(maybeJSBI$2.add(x01, x13) | 0, 18));
    x14 = maybeJSBI$2.bitwiseXor(x14, rotl(maybeJSBI$2.add(x10, x06) | 0, 7));
    x02 = maybeJSBI$2.bitwiseXor(x02, rotl(maybeJSBI$2.add(x14, x10) | 0, 9));
    x06 = maybeJSBI$2.bitwiseXor(x06, rotl(maybeJSBI$2.add(x02, x14) | 0, 13));
    x10 = maybeJSBI$2.bitwiseXor(x10, rotl(maybeJSBI$2.add(x06, x02) | 0, 18));
    x03 = maybeJSBI$2.bitwiseXor(x03, rotl(maybeJSBI$2.add(x15, x11) | 0, 7));
    x07 = maybeJSBI$2.bitwiseXor(x07, rotl(maybeJSBI$2.add(x03, x15) | 0, 9));
    x11 = maybeJSBI$2.bitwiseXor(x11, rotl(maybeJSBI$2.add(x07, x03) | 0, 13));
    x15 = maybeJSBI$2.bitwiseXor(x15, rotl(maybeJSBI$2.add(x11, x07) | 0, 18));
    x01 = maybeJSBI$2.bitwiseXor(x01, rotl(maybeJSBI$2.add(x00, x03) | 0, 7));
    x02 = maybeJSBI$2.bitwiseXor(x02, rotl(maybeJSBI$2.add(x01, x00) | 0, 9));
    x03 = maybeJSBI$2.bitwiseXor(x03, rotl(maybeJSBI$2.add(x02, x01) | 0, 13));
    x00 = maybeJSBI$2.bitwiseXor(x00, rotl(maybeJSBI$2.add(x03, x02) | 0, 18));
    x06 = maybeJSBI$2.bitwiseXor(x06, rotl(maybeJSBI$2.add(x05, x04) | 0, 7));
    x07 = maybeJSBI$2.bitwiseXor(x07, rotl(maybeJSBI$2.add(x06, x05) | 0, 9));
    x04 = maybeJSBI$2.bitwiseXor(x04, rotl(maybeJSBI$2.add(x07, x06) | 0, 13));
    x05 = maybeJSBI$2.bitwiseXor(x05, rotl(maybeJSBI$2.add(x04, x07) | 0, 18));
    x11 = maybeJSBI$2.bitwiseXor(x11, rotl(maybeJSBI$2.add(x10, x09) | 0, 7));
    x08 = maybeJSBI$2.bitwiseXor(x08, rotl(maybeJSBI$2.add(x11, x10) | 0, 9));
    x09 = maybeJSBI$2.bitwiseXor(x09, rotl(maybeJSBI$2.add(x08, x11) | 0, 13));
    x10 = maybeJSBI$2.bitwiseXor(x10, rotl(maybeJSBI$2.add(x09, x08) | 0, 18));
    x12 = maybeJSBI$2.bitwiseXor(x12, rotl(maybeJSBI$2.add(x15, x14) | 0, 7));
    x13 = maybeJSBI$2.bitwiseXor(x13, rotl(maybeJSBI$2.add(x12, x15) | 0, 9));
    x14 = maybeJSBI$2.bitwiseXor(x14, rotl(maybeJSBI$2.add(x13, x12) | 0, 13));
    x15 = maybeJSBI$2.bitwiseXor(x15, rotl(maybeJSBI$2.add(x14, x13) | 0, 18));
  } // Write output (salsa)


  out[(_x33 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x33)] = maybeJSBI$2.add(y00, x00) | 0;
  out[(_x34 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x34)] = maybeJSBI$2.add(y01, x01) | 0;
  out[(_x35 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x35)] = maybeJSBI$2.add(y02, x02) | 0;
  out[(_x36 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x36)] = maybeJSBI$2.add(y03, x03) | 0;
  out[(_x37 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x37)] = maybeJSBI$2.add(y04, x04) | 0;
  out[(_x38 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x38)] = maybeJSBI$2.add(y05, x05) | 0;
  out[(_x39 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x39)] = maybeJSBI$2.add(y06, x06) | 0;
  out[(_x40 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x40)] = maybeJSBI$2.add(y07, x07) | 0;
  out[(_x41 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x41)] = maybeJSBI$2.add(y08, x08) | 0;
  out[(_x42 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x42)] = maybeJSBI$2.add(y09, x09) | 0;
  out[(_x43 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x43)] = maybeJSBI$2.add(y10, x10) | 0;
  out[(_x44 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x44)] = maybeJSBI$2.add(y11, x11) | 0;
  out[(_x45 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x45)] = maybeJSBI$2.add(y12, x12) | 0;
  out[(_x46 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x46)] = maybeJSBI$2.add(y13, x13) | 0;
  out[(_x47 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x47)] = maybeJSBI$2.add(y14, x14) | 0;
  out[(_x48 = oi, oi = maybeJSBI$2.add(oi, maybeJSBI$2.BigInt(1)), _x48)] = maybeJSBI$2.add(y15, x15) | 0;
}

function BlockMix(input, ii, out, oi, r) {
  // The block B is r 128-byte chunks (which is equivalent of 2r 64-byte chunks)
  var head = oi + 0;
  var tail = oi + 16 * r;

  for (var i = 0; i < 16; i++) {
    out[tail + i] = input[ii + (2 * r - 1) * 16 + i];
  } // X ← B[2r−1]


  for (var _i = 0; _i < r; _i++, head += 16, ii += 16) {
    // We write odd & even Yi at same time. Even: 0bXXXXX0 Odd:  0bXXXXX1
    XorAndSalsa(out, tail, input, ii, out, head); // head[i] = Salsa(blockIn[2*i] ^ tail[i-1])

    if (_i > 0) tail += 16; // First iteration overwrites tmp value in tail

    XorAndSalsa(out, head, input, ii += 16, out, tail); // tail[i] = Salsa(blockIn[2*i+1] ^ head[i])
  }
} // Common prologue and epilogue for sync/async functions


function scryptInit(password, salt, _opts) {
  // Maxmem - 1GB+1KB by default
  var opts = checkOpts({
    dkLen: 32,
    asyncTick: 10,
    maxmem: 1024 ** 3 + 1024
  }, _opts);
  var N = opts.N,
      r = opts.r,
      p = opts.p,
      dkLen = opts.dkLen,
      asyncTick = opts.asyncTick,
      maxmem = opts.maxmem,
      onProgress = opts.onProgress;
  assertNumber(N);
  assertNumber(r);
  assertNumber(p);
  assertNumber(dkLen);
  assertNumber(asyncTick);
  assertNumber(maxmem);
  if (onProgress !== undefined && typeof onProgress !== 'function') throw new Error('progressCb should be function');
  var blockSize = 128 * r;
  var blockSize32 = blockSize / 4;

  if (N <= 1 || (N & N - 1) !== 0 || N >= 2 ** (blockSize / 8) || N > 2 ** 32) {
    // NOTE: we limit N to be less than 2**32 because of 32 bit variant of Integrify function
    // There is no JS engines that allows alocate more than 4GB per single Uint8Array for now, but can change in future.
    throw new Error('Scrypt: N must be larger than 1, a power of 2, less than 2^(128 * r / 8) and less than 2^32');
  }

  if (p < 0 || p > (2 ** 32 - 1) * 32 / blockSize) {
    throw new Error('Scrypt: p must be a positive integer less than or equal to ((2^32 - 1) * 32) / (128 * r)');
  }

  if (dkLen < 0 || dkLen > (2 ** 32 - 1) * 32) {
    throw new Error('Scrypt: dkLen should be positive integer less than or equal to (2^32 - 1) * 32');
  }

  var memUsed = blockSize * maybeJSBI$2.add(N, p);

  if (memUsed > maxmem) {
    throw new Error("Scrypt: parameters too large, ".concat(memUsed, " (128 * r * (N + p)) > ").concat(maxmem, " (maxmem)"));
  } // [B0...Bp−1] ← PBKDF2HMAC-SHA256(Passphrase, Salt, 1, blockSize*ParallelizationFactor)
  // Since it has only one iteration there is no reason to use async variant


  var B = pbkdf2(sha256$1, password, salt, {
    c: 1,
    dkLen: blockSize * p
  });
  var B32 = u32(B); // Re-used between parallel iterations. Array(iterations) of B

  var V = u32(new Uint8Array(blockSize * N));
  var tmp = u32(new Uint8Array(blockSize));

  var blockMixCb = function blockMixCb() {};

  if (onProgress) {
    var totalBlockMix = 2 * N * p; // Invoke callback if progress changes from 10.01 to 10.02
    // Allows to draw smooth progress bar on up to 8K screen

    var callbackPer = Math.max(Math.floor(totalBlockMix / 10000), 1);
    var blockMixCnt = 0;

    blockMixCb = function blockMixCb() {
      blockMixCnt++;
      if (onProgress && (!(blockMixCnt % callbackPer) || blockMixCnt === totalBlockMix)) onProgress(blockMixCnt / totalBlockMix);
    };
  }

  return {
    N: N,
    r: r,
    p: p,
    dkLen: dkLen,
    blockSize32: blockSize32,
    V: V,
    B32: B32,
    B: B,
    tmp: tmp,
    blockMixCb: blockMixCb,
    asyncTick: asyncTick
  };
}

function scryptOutput(password, dkLen, B, V, tmp) {
  var res = pbkdf2(sha256$1, password, B, {
    c: 1,
    dkLen: dkLen
  });
  B.fill(0);
  V.fill(0);
  tmp.fill(0);
  return res;
}
/**
 * Scrypt KDF from RFC 7914.
 * @param password - pass
 * @param salt - salt
 * @param opts - parameters
 * - `N` is cpu/mem work factor (power of 2 e.g. 2**18)
 * - `r` is block size (8 is common), fine-tunes sequential memory read size and performance
 * - `p` is parallelization factor (1 is common)
 * - `dkLen` is output key length in bytes e.g. 32.
 * - `asyncTick` - (default: 10) max time in ms for which async function can block execution
 * - `maxmem` - (default: `1024 ** 3 + 1024` aka 1GB+1KB). A limit that the app could use for scrypt
 * - `onProgress` - callback function that would be executed for progress report
 * @returns Derived key
 */


function scrypt(password, salt, opts) {
  var _scryptInit = scryptInit(password, salt, opts),
      N = _scryptInit.N,
      r = _scryptInit.r,
      p = _scryptInit.p,
      dkLen = _scryptInit.dkLen,
      blockSize32 = _scryptInit.blockSize32,
      V = _scryptInit.V,
      B32 = _scryptInit.B32,
      B = _scryptInit.B,
      tmp = _scryptInit.tmp,
      blockMixCb = _scryptInit.blockMixCb;

  for (var pi = 0; pi < p; pi++) {
    var Pi = blockSize32 * pi;

    for (var i = 0; i < blockSize32; i++) {
      V[i] = B32[Pi + i];
    } // V[0] = B[i]


    for (var _i2 = 0, pos = 0; _i2 < N - 1; _i2++) {
      BlockMix(V, pos, V, pos += blockSize32, r); // V[i] = BlockMix(V[i-1]);

      blockMixCb();
    }

    BlockMix(V, (N - 1) * blockSize32, B32, Pi, r); // Process last element

    blockMixCb();

    for (var _i3 = 0; _i3 < N; _i3++) {
      // First u32 of the last 64-byte block (u32 is LE)
      var j = maybeJSBI$2.remainder(B32[Pi + blockSize32 - 16], N); // j = Integrify(X) % iterations

      for (var k = 0; k < blockSize32; k++) {
        tmp[k] = maybeJSBI$2.bitwiseXor(B32[Pi + k], V[maybeJSBI$2.multiply(j, blockSize32) + k]);
      } // tmp = B ^ V[j]


      BlockMix(tmp, 0, B32, Pi, r); // B = BlockMix(B ^ V[j])

      blockMixCb();
    }
  }

  return scryptOutput(password, dkLen, B, V, tmp);
}

// Copyright 2017-2022 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
var DEFAULT_PARAMS = {
  N: 1 << 15,
  p: 1,
  r: 8
};

function scryptEncode(passphrase) {
  var salt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : randomAsU8a();
  var params = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : DEFAULT_PARAMS;
  var onlyJs = arguments.length > 3 ? arguments[3] : undefined;
  var u8a = u8aToU8a(passphrase);
  return {
    params: params,
    password: !hasBigInt || !onlyJs && isReady() ? scrypt$1(u8a, salt, Math.log2(params.N), params.r, params.p) : scrypt(u8a, salt, objectSpread({
      dkLen: 64
    }, params)),
    salt: salt
  };
}

var maybeJSBI$1 = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
function scryptFromU8a(data) {
  var salt = data.subarray(0, 32);
  var N = u8aToBn(data.subarray(32 + 0, 32 + 4), BN_LE_OPTS).toNumber();
  var p = u8aToBn(data.subarray(32 + 4, 32 + 8), BN_LE_OPTS).toNumber();
  var r = u8aToBn(data.subarray(32 + 8, 32 + 12), BN_LE_OPTS).toNumber(); // FIXME At this moment we assume these to be fixed params, this is not a great idea since we lose flexibility
  // and updates for greater security. However we need some protection against carefully-crafted params that can
  // eat up CPU since these are user inputs. So we need to get very clever here, but atm we only allow the defaults
  // and if no match, bail out

  assert(maybeJSBI$1.equal(N, DEFAULT_PARAMS.N) && maybeJSBI$1.equal(p, DEFAULT_PARAMS.p) && maybeJSBI$1.equal(r, DEFAULT_PARAMS.r), 'Invalid injected scrypt params found');
  return {
    params: {
      N: N,
      p: p,
      r: r
    },
    salt: salt
  };
}

function scryptToU8a(salt, _ref) {
  var N = _ref.N,
      p = _ref.p,
      r = _ref.r;
  return u8aConcat(salt, bnToU8a(N, BN_LE_32_OPTS), bnToU8a(p, BN_LE_32_OPTS), bnToU8a(r, BN_LE_32_OPTS));
}

// Copyright 2017-2022 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
var ENCODING = ['scrypt', 'xsalsa20-poly1305'];
var ENCODING_NONE = ['none'];
var ENCODING_VERSION = '3';
var NONCE_LENGTH = 24;
var SCRYPT_LENGTH = 32 + 3 * 4;

function jsonDecryptData(encrypted, passphrase) {
  var encType = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ENCODING;
  assert(encrypted, 'No encrypted data available to decode');
  assert(passphrase || !encType.includes('xsalsa20-poly1305'), 'Password required to decode encrypted data');
  var encoded = encrypted;

  if (passphrase) {
    var password;

    if (encType.includes('scrypt')) {
      var _scryptFromU8a = scryptFromU8a(encrypted),
          params = _scryptFromU8a.params,
          salt = _scryptFromU8a.salt;

      password = scryptEncode(passphrase, salt, params).password;
      encrypted = encrypted.subarray(SCRYPT_LENGTH);
    } else {
      password = stringToU8a(passphrase);
    }

    encoded = naclDecrypt(encrypted.subarray(NONCE_LENGTH), encrypted.subarray(0, NONCE_LENGTH), u8aFixLength(password, 256, true));
  }

  assert(encoded, 'Unable to decode using the supplied passphrase');
  return encoded;
}

function jsonEncryptFormat(encoded, contentType, isEncrypted) {
  return {
    encoded: base64Encode(encoded),
    encoding: {
      content: contentType,
      type: isEncrypted ? ENCODING : ENCODING_NONE,
      version: ENCODING_VERSION
    }
  };
}

var secp256k1VerifyHasher = function secp256k1VerifyHasher(hashType) {
  return function (message, signature, publicKey) {
    return secp256k1Verify(message, signature, publicKey, hashType);
  };
};

var VERIFIERS_ECDSA = [['ecdsa', secp256k1VerifyHasher('blake2')], ['ethereum', secp256k1VerifyHasher('keccak')]];
var VERIFIERS = [['ed25519', ed25519Verify], ['sr25519', sr25519Verify]].concat(VERIFIERS_ECDSA);
var CRYPTO_TYPES = ['ed25519', 'sr25519', 'ecdsa'];

function verifyDetect(result, _ref) {
  var message = _ref.message,
      publicKey = _ref.publicKey,
      signature = _ref.signature;
  var verifiers = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : VERIFIERS;
  result.isValid = verifiers.some(function (_ref2) {
    var _ref3 = _slicedToArray(_ref2, 2),
        crypto = _ref3[0],
        verify = _ref3[1];

    try {
      if (verify(message, signature, publicKey)) {
        result.crypto = crypto;
        return true;
      }
    } catch (error) {// do nothing, result.isValid still set to false
    }

    return false;
  });
  return result;
}

function verifyMultisig(result, _ref4) {
  var message = _ref4.message,
      publicKey = _ref4.publicKey,
      signature = _ref4.signature;
  assert([0, 1, 2].includes(signature[0]), function () {
    return "Unknown crypto type, expected signature prefix [0..2], found ".concat(signature[0]);
  });
  var type = CRYPTO_TYPES[signature[0]] || 'none';
  result.crypto = type;

  try {
    result.isValid = {
      ecdsa: function ecdsa() {
        return verifyDetect(result, {
          message: message,
          publicKey: publicKey,
          signature: signature.subarray(1)
        }, VERIFIERS_ECDSA).isValid;
      },
      ed25519: function ed25519() {
        return ed25519Verify(message, signature.subarray(1), publicKey);
      },
      none: function none() {
        throw Error('no verify for `none` crypto type');
      },
      sr25519: function sr25519() {
        return sr25519Verify(message, signature.subarray(1), publicKey);
      }
    }[type]();
  } catch (error) {// ignore, result.isValid still set to false
  }

  return result;
}

function getVerifyFn(signature) {
  return [0, 1, 2].includes(signature[0]) && [65, 66].includes(signature.length) ? verifyMultisig : verifyDetect;
}

function signatureVerify(message, signature, addressOrPublicKey) {
  var signatureU8a = u8aToU8a(signature);
  assert([64, 65, 66].includes(signatureU8a.length), function () {
    return "Invalid signature length, expected [64..66] bytes, found ".concat(signatureU8a.length);
  });
  var publicKey = decodeAddress(addressOrPublicKey);
  var input = {
    message: u8aToU8a(message),
    publicKey: publicKey,
    signature: signatureU8a
  };
  var result = {
    crypto: 'none',
    isValid: false,
    isWrapped: u8aIsWrapped(input.message, true),
    publicKey: publicKey
  };
  var isWrappedBytes = u8aIsWrapped(input.message, false);
  var verifyFn = getVerifyFn(signatureU8a);
  verifyFn(result, input);

  if (result.crypto !== 'none' || result.isWrapped && !isWrappedBytes) {
    return result;
  }

  input.message = isWrappedBytes ? u8aUnwrapBytes(input.message) : u8aWrapBytes(input.message);
  return verifyFn(result, input);
}

// Copyright 2017-2022 @polkadot/keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0
// default substrate dev phrase
var DEV_PHRASE = 'bottom drive obey lake curtain smoke basket hold race lonely fit walk'; // seed from the above phrase

var DEV_SEED = '0xfac7959dbfe72f052e5a0c3c8d6530f202b02fd8f9f5ca3580ec8deb7797479e';

// Copyright 2017-2022 @polkadot/keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0
var PKCS8_DIVIDER = new Uint8Array([161, 35, 3, 33, 0]);
var PKCS8_HEADER = new Uint8Array([48, 83, 2, 1, 1, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32]);
var PUB_LENGTH = 32;
var SEC_LENGTH = 64;
var SEED_LENGTH = 32;

var maybeJSBI = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b);
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterOrEqualThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
var SEED_OFFSET = PKCS8_HEADER.length;
function decodePair(passphrase, encrypted, _encType) {
  var encType = Array.isArray(_encType) || isUndefined(_encType) ? _encType : [_encType];
  var decrypted = jsonDecryptData(encrypted, passphrase, encType);
  var header = decrypted.subarray(0, PKCS8_HEADER.length);
  assert(u8aEq(header, PKCS8_HEADER), 'Invalid Pkcs8 header found in body');
  var secretKey = decrypted.subarray(SEED_OFFSET, maybeJSBI.add(SEED_OFFSET, SEC_LENGTH));
  var divOffset = maybeJSBI.add(SEED_OFFSET, SEC_LENGTH);
  var divider = decrypted.subarray(divOffset, maybeJSBI.add(divOffset, PKCS8_DIVIDER.length)); // old-style, we have the seed here

  if (!u8aEq(divider, PKCS8_DIVIDER)) {
    divOffset = maybeJSBI.add(SEED_OFFSET, SEED_LENGTH);
    secretKey = decrypted.subarray(SEED_OFFSET, divOffset);
    divider = decrypted.subarray(divOffset, maybeJSBI.add(divOffset, PKCS8_DIVIDER.length));
    assert(u8aEq(divider, PKCS8_DIVIDER), 'Invalid Pkcs8 divider found in body');
  }

  var pubOffset = maybeJSBI.add(divOffset, PKCS8_DIVIDER.length);
  var publicKey = decrypted.subarray(pubOffset, maybeJSBI.add(pubOffset, PUB_LENGTH));
  return {
    publicKey: publicKey,
    secretKey: secretKey
  };
}

function encodePair(_ref, passphrase) {
  var publicKey = _ref.publicKey,
      secretKey = _ref.secretKey;
  assert(secretKey, 'Expected a valid secretKey to be passed to encode');
  var encoded = u8aConcat(PKCS8_HEADER, secretKey, PKCS8_DIVIDER, publicKey);

  if (!passphrase) {
    return encoded;
  }

  var _scryptEncode = scryptEncode(passphrase),
      params = _scryptEncode.params,
      password = _scryptEncode.password,
      salt = _scryptEncode.salt;

  var _naclEncrypt = naclEncrypt(encoded, password.subarray(0, 32)),
      encrypted = _naclEncrypt.encrypted,
      nonce = _naclEncrypt.nonce;

  return u8aConcat(scryptToU8a(salt, params), nonce, encrypted);
}

function pairToJson(type, _ref, encoded, isEncrypted) {
  var address = _ref.address,
      meta = _ref.meta;
  return objectSpread(jsonEncryptFormat(encoded, ['pkcs8', type], isEncrypted), {
    address: address,
    meta: meta
  });
}

var SIG_TYPE_NONE = new Uint8Array();
var TYPE_FROM_SEED = {
  ecdsa: secp256k1PairFromSeed,
  ed25519: ed25519PairFromSeed,
  ethereum: secp256k1PairFromSeed,
  sr25519: sr25519PairFromSeed
};
var TYPE_PREFIX = {
  ecdsa: new Uint8Array([2]),
  ed25519: new Uint8Array([0]),
  ethereum: new Uint8Array([2]),
  sr25519: new Uint8Array([1])
};
var TYPE_SIGNATURE = {
  ecdsa: function ecdsa(m, p) {
    return secp256k1Sign(m, p, 'blake2');
  },
  ed25519: ed25519Sign,
  ethereum: function ethereum(m, p) {
    return secp256k1Sign(m, p, 'keccak');
  },
  sr25519: sr25519Sign
};
var TYPE_ADDRESS = {
  ecdsa: function ecdsa(p) {
    return p.length > 32 ? blake2AsU8a(p) : p;
  },
  ed25519: function ed25519(p) {
    return p;
  },
  ethereum: function ethereum(p) {
    return p.length === 20 ? p : keccakAsU8a(secp256k1Expand(p));
  },
  sr25519: function sr25519(p) {
    return p;
  }
};

function isLocked(secretKey) {
  return !secretKey || u8aEmpty(secretKey);
}

function vrfHash(proof, context, extra) {
  return blake2AsU8a(u8aConcat(context || '', extra || '', proof));
}
/**
 * @name createPair
 * @summary Creates a keyring pair object
 * @description Creates a keyring pair object with provided account public key, metadata, and encoded arguments.
 * The keyring pair stores the account state including the encoded address and associated metadata.
 *
 * It has properties whose values are functions that may be called to perform account actions:
 *
 * - `address` function retrieves the address associated with the account.
 * - `decodedPkcs8` function is called with the account passphrase and account encoded public key.
 * It decodes the encoded public key using the passphrase provided to obtain the decoded account public key
 * and associated secret key that are then available in memory, and changes the account address stored in the
 * state of the pair to correspond to the address of the decoded public key.
 * - `encodePkcs8` function when provided with the correct passphrase associated with the account pair
 * and when the secret key is in memory (when the account pair is not locked) it returns an encoded
 * public key of the account.
 * - `meta` is the metadata that is stored in the state of the pair, either when it was originally
 * created or set via `setMeta`.
 * - `publicKey` returns the public key stored in memory for the pair.
 * - `sign` may be used to return a signature by signing a provided message with the secret
 * key (if it is in memory) using Nacl.
 * - `toJson` calls another `toJson` function and provides the state of the pair,
 * it generates arguments to be passed to the other `toJson` function including an encoded public key of the account
 * that it generates using the secret key from memory (if it has been made available in memory)
 * and the optionally provided passphrase argument. It passes a third boolean argument to `toJson`
 * indicating whether the public key has been encoded or not (if a passphrase argument was provided then it is encoded).
 * The `toJson` function that it calls returns a JSON object with properties including the `address`
 * and `meta` that are assigned with the values stored in the corresponding state variables of the account pair,
 * an `encoded` property that is assigned with the encoded public key in hex format, and an `encoding`
 * property that indicates whether the public key value of the `encoded` property is encoded or not.
 */


function createPair(_ref, _ref2) {
  var toSS58 = _ref.toSS58,
      type = _ref.type;
  var publicKey = _ref2.publicKey,
      secretKey = _ref2.secretKey;
  var meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var encoded = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
  var encTypes = arguments.length > 4 ? arguments[4] : undefined;

  var decodePkcs8 = function decodePkcs8(passphrase, userEncoded) {
    var decoded = decodePair(passphrase, userEncoded || encoded, encTypes);

    if (decoded.secretKey.length === 64) {
      publicKey = decoded.publicKey;
      secretKey = decoded.secretKey;
    } else {
      var pair = TYPE_FROM_SEED[type](decoded.secretKey);
      publicKey = pair.publicKey;
      secretKey = pair.secretKey;
    }
  };

  var recode = function recode(passphrase) {
    isLocked(secretKey) && encoded && decodePkcs8(passphrase, encoded);
    encoded = encodePair({
      publicKey: publicKey,
      secretKey: secretKey
    }, passphrase); // re-encode, latest version

    encTypes = undefined; // swap to defaults, latest version follows

    return encoded;
  };

  var encodeAddress = function encodeAddress() {
    var raw = TYPE_ADDRESS[type](publicKey);
    return type === 'ethereum' ? ethereumEncode(raw) : toSS58(raw);
  };

  return {
    get address() {
      return encodeAddress();
    },

    get addressRaw() {
      var raw = TYPE_ADDRESS[type](publicKey);
      return type === 'ethereum' ? raw.slice(-20) : raw;
    },

    get isLocked() {
      return isLocked(secretKey);
    },

    get meta() {
      return meta;
    },

    get publicKey() {
      return publicKey;
    },

    get type() {
      return type;
    },

    // eslint-disable-next-line sort-keys
    decodePkcs8: decodePkcs8,
    decryptMessage: function decryptMessage(encryptedMessageWithNonce, senderPublicKey) {
      assert(!isLocked(secretKey), 'Cannot encrypt with a locked key pair');
      assert(!['ecdsa', 'ethereum'].includes(type), 'Secp256k1 not supported yet');
      var messageU8a = u8aToU8a(encryptedMessageWithNonce);
      return naclOpen(messageU8a.slice(24, messageU8a.length), messageU8a.slice(0, 24), convertPublicKeyToCurve25519(u8aToU8a(senderPublicKey)), convertSecretKeyToCurve25519(secretKey));
    },
    derive: function derive(suri, meta) {
      assert(type !== 'ethereum', 'Unable to derive on this keypair');
      assert(!isLocked(secretKey), 'Cannot derive on a locked keypair');

      var _keyExtractPath = keyExtractPath(suri),
          path = _keyExtractPath.path;

      var derived = keyFromPath({
        publicKey: publicKey,
        secretKey: secretKey
      }, path, type);
      return createPair({
        toSS58: toSS58,
        type: type
      }, derived, meta, null);
    },
    encodePkcs8: function encodePkcs8(passphrase) {
      return recode(passphrase);
    },
    encryptMessage: function encryptMessage(message, recipientPublicKey, nonceIn) {
      assert(!isLocked(secretKey), 'Cannot encrypt with a locked key pair');
      assert(!['ecdsa', 'ethereum'].includes(type), 'Secp256k1 not supported yet');

      var _naclSeal = naclSeal(u8aToU8a(message), convertSecretKeyToCurve25519(secretKey), convertPublicKeyToCurve25519(u8aToU8a(recipientPublicKey)), nonceIn),
          nonce = _naclSeal.nonce,
          sealed = _naclSeal.sealed;

      return u8aConcat(nonce, sealed);
    },
    lock: function lock() {
      secretKey = new Uint8Array();
    },
    setMeta: function setMeta(additional) {
      meta = objectSpread({}, meta, additional);
    },
    sign: function sign(message) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      assert(!isLocked(secretKey), 'Cannot sign with a locked key pair');
      return u8aConcat(options.withType ? TYPE_PREFIX[type] : SIG_TYPE_NONE, TYPE_SIGNATURE[type](u8aToU8a(message), {
        publicKey: publicKey,
        secretKey: secretKey
      }));
    },
    toJson: function toJson(passphrase) {
      // NOTE: For ecdsa and ethereum, the publicKey cannot be extracted from the address. For these
      // pass the hex-encoded publicKey through to the address portion of the JSON (before decoding)
      // unless the publicKey is already an address
      var address = ['ecdsa', 'ethereum'].includes(type) ? publicKey.length === 20 ? u8aToHex(publicKey) : u8aToHex(secp256k1Compress(publicKey)) : encodeAddress();
      return pairToJson(type, {
        address: address,
        meta: meta
      }, recode(passphrase), !!passphrase);
    },
    unlock: function unlock(passphrase) {
      return decodePkcs8(passphrase);
    },
    verify: function verify(message, signature, signerPublic) {
      return signatureVerify(message, signature, TYPE_ADDRESS[type](u8aToU8a(signerPublic))).isValid;
    },
    vrfSign: function vrfSign(message, context, extra) {
      assert(!isLocked(secretKey), 'Cannot sign with a locked key pair');

      if (type === 'sr25519') {
        return sr25519VrfSign(message, {
          secretKey: secretKey
        }, context, extra);
      }

      var proof = TYPE_SIGNATURE[type](u8aToU8a(message), {
        publicKey: publicKey,
        secretKey: secretKey
      });
      return u8aConcat(vrfHash(proof, context, extra), proof);
    },
    vrfVerify: function vrfVerify(message, vrfResult, signerPublic, context, extra) {
      if (type === 'sr25519') {
        return sr25519VrfVerify(message, vrfResult, publicKey, context, extra);
      }

      var result = signatureVerify(message, u8aConcat(TYPE_PREFIX[type], vrfResult.subarray(32)), TYPE_ADDRESS[type](u8aToU8a(signerPublic)));
      return result.isValid && u8aEq(vrfResult.subarray(0, 32), vrfHash(vrfResult.subarray(32), context, extra));
    }
  };
}

var _map = /*#__PURE__*/new WeakMap();

var Pairs = /*#__PURE__*/function () {
  function Pairs() {
    _classCallCheck(this, Pairs);

    _classPrivateFieldInitSpec(this, _map, {
      writable: true,
      value: {}
    });
  }

  _createClass(Pairs, [{
    key: "add",
    value: function add(pair) {
      _classPrivateFieldGet(this, _map)[decodeAddress(pair.address).toString()] = pair;
      return pair;
    }
  }, {
    key: "all",
    value: function all() {
      return Object.values(_classPrivateFieldGet(this, _map));
    }
  }, {
    key: "get",
    value: function get(address) {
      var pair = _classPrivateFieldGet(this, _map)[decodeAddress(address).toString()];

      assert(pair, function () {
        return "Unable to retrieve keypair '".concat(isU8a(address) || isHex(address) ? u8aToHex(u8aToU8a(address)) : address, "'");
      });
      return pair;
    }
  }, {
    key: "remove",
    value: function remove(address) {
      delete _classPrivateFieldGet(this, _map)[decodeAddress(address).toString()];
    }
  }]);

  return Pairs;
}();

var PairFromSeed = {
  ecdsa: function ecdsa(seed) {
    return secp256k1PairFromSeed(seed);
  },
  ed25519: function ed25519(seed) {
    return ed25519PairFromSeed(seed);
  },
  ethereum: function ethereum(seed) {
    return secp256k1PairFromSeed(seed);
  },
  sr25519: function sr25519(seed) {
    return sr25519PairFromSeed(seed);
  }
};

function pairToPublic(_ref) {
  var publicKey = _ref.publicKey;
  return publicKey;
}
/**
 * # @polkadot/keyring
 *
 * ## Overview
 *
 * @name Keyring
 * @summary Keyring management of user accounts
 * @description Allows generation of keyring pairs from a variety of input combinations, such as
 * json object containing account address or public key, account metadata, and account encoded using
 * `addFromJson`, or by providing those values as arguments separately to `addFromAddress`,
 * or by providing the mnemonic (seed phrase) and account metadata as arguments to `addFromMnemonic`.
 * Stores the keyring pairs in a keyring pair dictionary. Removal of the keyring pairs from the keyring pair
 * dictionary is achieved using `removePair`. Retrieval of all the stored pairs via `getPairs` or perform
 * lookup of a pair for a given account address or public key using `getPair`. JSON metadata associated with
 * an account may be obtained using `toJson` accompanied by the account passphrase.
 */


var _pairs = /*#__PURE__*/new WeakMap();

var _type = /*#__PURE__*/new WeakMap();

var _ss = /*#__PURE__*/new WeakMap();

var Keyring$1 = /*#__PURE__*/function () {
  function Keyring() {
    var _this = this;

    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Keyring);

    _classPrivateFieldInitSpec(this, _pairs, {
      writable: true,
      value: void 0
    });

    _classPrivateFieldInitSpec(this, _type, {
      writable: true,
      value: void 0
    });

    _classPrivateFieldInitSpec(this, _ss, {
      writable: true,
      value: void 0
    });

    _defineProperty(this, "decodeAddress", decodeAddress);

    _defineProperty(this, "encodeAddress", function (address, ss58Format) {
      return _this.type === 'ethereum' ? ethereumEncode(address) : encodeAddress(address, isUndefined(ss58Format) ? _classPrivateFieldGet(_this, _ss) : ss58Format);
    });

    options.type = options.type || 'ed25519';
    assert(['ecdsa', 'ethereum', 'ed25519', 'sr25519'].includes(options.type || 'undefined'), function () {
      return "Expected a keyring type of either 'ed25519', 'sr25519', 'ethereum' or 'ecdsa', found '".concat(options.type || 'unknown');
    });

    _classPrivateFieldSet(this, _pairs, new Pairs());

    _classPrivateFieldSet(this, _ss, options.ss58Format);

    _classPrivateFieldSet(this, _type, options.type);
  }
  /**
   * @description retrieve the pairs (alias for getPairs)
   */


  _createClass(Keyring, [{
    key: "pairs",
    get: function get() {
      return this.getPairs();
    }
    /**
     * @description retrieve the publicKeys (alias for getPublicKeys)
     */

  }, {
    key: "publicKeys",
    get: function get() {
      return this.getPublicKeys();
    }
    /**
     * @description Returns the type of the keyring, ed25519, sr25519 or ecdsa
     */

  }, {
    key: "type",
    get: function get() {
      return _classPrivateFieldGet(this, _type);
    }
    /**
     * @name addPair
     * @summary Stores an account, given a keyring pair, as a Key/Value (public key, pair) in Keyring Pair Dictionary
     */

  }, {
    key: "addPair",
    value: function addPair(pair) {
      return _classPrivateFieldGet(this, _pairs).add(pair);
    }
    /**
     * @name addFromAddress
     * @summary Stores an account, given an account address, as a Key/Value (public key, pair) in Keyring Pair Dictionary
     * @description Allows user to explicitly provide separate inputs including account address or public key, and optionally
     * the associated account metadata, and the default encoded value as arguments (that may be obtained from the json file
     * of an account backup), and then generates a keyring pair from them that it passes to
     * `addPair` to stores in a keyring pair dictionary the public key of the generated pair as a key and the pair as the associated value.
     */

  }, {
    key: "addFromAddress",
    value: function addFromAddress(address) {
      var meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var encoded = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      var type = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : this.type;
      var ignoreChecksum = arguments.length > 4 ? arguments[4] : undefined;
      var encType = arguments.length > 5 ? arguments[5] : undefined;
      var publicKey = this.decodeAddress(address, ignoreChecksum);
      return this.addPair(createPair({
        toSS58: this.encodeAddress,
        type: type
      }, {
        publicKey: publicKey,
        secretKey: new Uint8Array()
      }, meta, encoded, encType));
    }
    /**
     * @name addFromJson
     * @summary Stores an account, given JSON data, as a Key/Value (public key, pair) in Keyring Pair Dictionary
     * @description Allows user to provide a json object argument that contains account information (that may be obtained from the json file
     * of an account backup), and then generates a keyring pair from it that it passes to
     * `addPair` to stores in a keyring pair dictionary the public key of the generated pair as a key and the pair as the associated value.
     */

  }, {
    key: "addFromJson",
    value: function addFromJson(json, ignoreChecksum) {
      return this.addPair(this.createFromJson(json, ignoreChecksum));
    }
    /**
     * @name addFromMnemonic
     * @summary Stores an account, given a mnemonic, as a Key/Value (public key, pair) in Keyring Pair Dictionary
     * @description Allows user to provide a mnemonic (seed phrase that is provided when account is originally created)
     * argument and a metadata argument that contains account information (that may be obtained from the json file
     * of an account backup), and then generates a keyring pair from it that it passes to
     * `addPair` to stores in a keyring pair dictionary the public key of the generated pair as a key and the pair as the associated value.
     */

  }, {
    key: "addFromMnemonic",
    value: function addFromMnemonic(mnemonic) {
      var meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this.type;
      return this.addFromUri(mnemonic, meta, type);
    }
    /**
     * @name addFromPair
     * @summary Stores an account created from an explicit publicKey/secreteKey combination
     */

  }, {
    key: "addFromPair",
    value: function addFromPair(pair) {
      var meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this.type;
      return this.addPair(this.createFromPair(pair, meta, type));
    }
    /**
     * @name addFromSeed
     * @summary Stores an account, given seed data, as a Key/Value (public key, pair) in Keyring Pair Dictionary
     * @description Stores in a keyring pair dictionary the public key of the pair as a key and the pair as the associated value.
     * Allows user to provide the account seed as an argument, and then generates a keyring pair from it that it passes to
     * `addPair` to store in a keyring pair dictionary the public key of the generated pair as a key and the pair as the associated value.
     */

  }, {
    key: "addFromSeed",
    value: function addFromSeed(seed) {
      var meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this.type;
      return this.addPair(createPair({
        toSS58: this.encodeAddress,
        type: type
      }, PairFromSeed[type](seed), meta, null));
    }
    /**
     * @name addFromUri
     * @summary Creates an account via an suri
     * @description Extracts the phrase, path and password from a SURI format for specifying secret keys `<secret>/<soft-key>//<hard-key>///<password>` (the `///password` may be omitted, and `/<soft-key>` and `//<hard-key>` maybe repeated and mixed). The secret can be a hex string, mnemonic phrase or a string (to be padded)
     */

  }, {
    key: "addFromUri",
    value: function addFromUri(suri) {
      var meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this.type;
      return this.addPair(this.createFromUri(suri, meta, type));
    }
    /**
     * @name createFromJson
     * @description Creates a pair from a JSON keyfile
     */

  }, {
    key: "createFromJson",
    value: function createFromJson(_ref2, ignoreChecksum) {
      var address = _ref2.address,
          encoded = _ref2.encoded,
          _ref2$encoding = _ref2.encoding,
          content = _ref2$encoding.content,
          type = _ref2$encoding.type,
          version = _ref2$encoding.version,
          meta = _ref2.meta;
      assert(version !== '3' || content[0] === 'pkcs8', function () {
        return "Unable to decode non-pkcs8 type, [".concat(content.join(','), "] found}");
      });
      var cryptoType = version === '0' || !Array.isArray(content) ? this.type : content[1];
      var encType = !Array.isArray(type) ? [type] : type;
      assert(['ed25519', 'sr25519', 'ecdsa', 'ethereum'].includes(cryptoType), function () {
        return "Unknown crypto type ".concat(cryptoType);
      }); // Here the address and publicKey are 32 bytes and isomorphic. This is why the address field needs to be the public key for ethereum type pairs

      var publicKey = isHex(address) ? hexToU8a(address) : this.decodeAddress(address, ignoreChecksum);
      var decoded = isHex(encoded) ? hexToU8a(encoded) : base64Decode(encoded);
      return createPair({
        toSS58: this.encodeAddress,
        type: cryptoType
      }, {
        publicKey: publicKey,
        secretKey: new Uint8Array()
      }, meta, decoded, encType);
    }
    /**
     * @name createFromPair
     * @summary Creates a pair from an explicit publicKey/secreteKey combination
     */

  }, {
    key: "createFromPair",
    value: function createFromPair(pair) {
      var meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this.type;
      return createPair({
        toSS58: this.encodeAddress,
        type: type
      }, pair, meta, null);
    }
    /**
     * @name createFromUri
     * @summary Creates a Keypair from an suri
     * @description This creates a pair from the suri, but does not add it to the keyring
     */

  }, {
    key: "createFromUri",
    value: function createFromUri(_suri) {
      var meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this.type;
      // here we only aut-add the dev phrase if we have a hard-derived path
      var suri = _suri.startsWith('//') ? "".concat(DEV_PHRASE).concat(_suri) : _suri;

      var _keyExtractSuri = keyExtractSuri(suri),
          derivePath = _keyExtractSuri.derivePath,
          password = _keyExtractSuri.password,
          path = _keyExtractSuri.path,
          phrase = _keyExtractSuri.phrase;

      var seed;
      var isPhraseHex = isHex(phrase, 256);

      if (isPhraseHex) {
        seed = hexToU8a(phrase);
      } else {
        var parts = phrase.split(' ');

        if ([12, 15, 18, 21, 24].includes(parts.length)) {
          seed = type === 'ethereum' ? mnemonicToLegacySeed(phrase, '', false, 64) : mnemonicToMiniSecret(phrase, password);
        } else {
          assert(phrase.length <= 32, 'specified phrase is not a valid mnemonic and is invalid as a raw seed at > 32 bytes');
          seed = stringToU8a(phrase.padEnd(32));
        }
      }

      var derived = type === 'ethereum' ? isPhraseHex ? PairFromSeed[type](seed) // for eth, if the private key is provided as suri, it must be derived only once
      : hdEthereum(seed, derivePath.substring(1)) : keyFromPath(PairFromSeed[type](seed), path, type);
      return createPair({
        toSS58: this.encodeAddress,
        type: type
      }, derived, meta, null);
    }
    /**
     * @name encodeAddress
     * @description Encodes the input into an ss58 representation
     */

  }, {
    key: "getPair",
    value:
    /**
     * @name getPair
     * @summary Retrieves an account keyring pair from the Keyring Pair Dictionary, given an account address
     * @description Returns a keyring pair value from the keyring pair dictionary by performing
     * a key lookup using the provided account address or public key (after decoding it).
     */
    function getPair(address) {
      return _classPrivateFieldGet(this, _pairs).get(address);
    }
    /**
     * @name getPairs
     * @summary Retrieves all account keyring pairs from the Keyring Pair Dictionary
     * @description Returns an array list of all the keyring pair values that are stored in the keyring pair dictionary.
     */

  }, {
    key: "getPairs",
    value: function getPairs() {
      return _classPrivateFieldGet(this, _pairs).all();
    }
    /**
     * @name getPublicKeys
     * @summary Retrieves Public Keys of all Keyring Pairs stored in the Keyring Pair Dictionary
     * @description Returns an array list of all the public keys associated with each of the keyring pair values that are stored in the keyring pair dictionary.
     */

  }, {
    key: "getPublicKeys",
    value: function getPublicKeys() {
      return _classPrivateFieldGet(this, _pairs).all().map(pairToPublic);
    }
    /**
     * @name removePair
     * @description Deletes the provided input address or public key from the stored Keyring Pair Dictionary.
     */

  }, {
    key: "removePair",
    value: function removePair(address) {
      _classPrivateFieldGet(this, _pairs).remove(address);
    }
    /**
     * @name setSS58Format;
     * @description Sets the ss58 format for the keyring
     */

  }, {
    key: "setSS58Format",
    value: function setSS58Format(ss58) {
      _classPrivateFieldSet(this, _ss, ss58);
    }
    /**
     * @name toJson
     * @summary Returns a JSON object associated with the input argument that contains metadata assocated with an account
     * @description Returns a JSON object containing the metadata associated with an account
     * when valid address or public key and when the account passphrase is provided if the account secret
     * is not already unlocked and available in memory. Note that in [Polkadot-JS Apps](https://github.com/polkadot-js/apps) the user
     * may backup their account to a JSON file that contains this information.
     */

  }, {
    key: "toJson",
    value: function toJson(address, passphrase) {
      return _classPrivateFieldGet(this, _pairs).get(address).toJson(passphrase);
    }
  }]);

  return Keyring;
}();

// keyring is for testing - what happens is that in most cases the keyring is initialises
// before anything else. Since the sr25519 crypto is async, this creates problems with
// adding the keys when only the keyring is used.

var PAIRSSR25519 = [{
  publicKey: hexToU8a('0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d'),
  secretKey: hexToU8a('0x98319d4ff8a9508c4bb0cf0b5a78d760a0b2082c02775e6e82370816fedfff48925a225d97aa00682d6a59b95b18780c10d7032336e88f3442b42361f4a66011'),
  // nosemgrep
  seed: 'Alice',
  type: 'sr25519'
}, {
  publicKey: hexToU8a('0xbe5ddb1579b72e84524fc29e78609e3caf42e85aa118ebfe0b0ad404b5bdd25f'),
  secretKey: hexToU8a('0xe8da6c9d810e020f5e3c7f5af2dea314cbeaa0d72bc6421e92c0808a0c584a6046ab28e97c3ffc77fe12b5a4d37e8cd4afbfebbf2391ffc7cb07c0f38c023efd'),
  // nosemgrep
  seed: 'Alice//stash',
  type: 'sr25519'
}, {
  publicKey: hexToU8a('0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48'),
  secretKey: hexToU8a('0x081ff694633e255136bdb456c20a5fc8fed21f8b964c11bb17ff534ce80ebd5941ae88f85d0c1bfc37be41c904e1dfc01de8c8067b0d6d5df25dd1ac0894a325'),
  // nosemgrep
  seed: 'Bob',
  type: 'sr25519'
}, {
  publicKey: hexToU8a('0xfe65717dad0447d715f660a0a58411de509b42e6efb8375f562f58a554d5860e'),
  secretKey: hexToU8a('0xc006507cdfc267a21532394c49ca9b754ca71de21e15a1cdf807c7ceab6d0b6c3ed408d9d35311540dcd54931933e67cf1ea10d46f75408f82b789d9bd212fde'),
  // nosemgrep
  seed: 'Bob//stash',
  type: 'sr25519'
}, {
  publicKey: hexToU8a('0x90b5ab205c6974c9ea841be688864633dc9ca8a357843eeacf2314649965fe22'),
  secretKey: hexToU8a('0xa8f2d83016052e5d6d77b2f6fd5d59418922a09024cda701b3c34369ec43a7668faf12ff39cd4e5d92bb773972f41a7a5279ebc2ed92264bed8f47d344f8f18c'),
  // nosemgrep
  seed: 'Charlie',
  type: 'sr25519'
}, {
  publicKey: hexToU8a('0x306721211d5404bd9da88e0204360a1a9ab8b87c66c1bc2fcdd37f3c2222cc20'),
  secretKey: hexToU8a('0x20e05482ca4677e0edbc58ae9a3a59f6ed3b1a9484ba17e64d6fe8688b2b7b5d108c4487b9323b98b11fe36cb301b084e920f7b7895536809a6d62a451b25568'),
  // nosemgrep
  seed: 'Dave',
  type: 'sr25519'
}, {
  publicKey: hexToU8a('0xe659a7a1628cdd93febc04a4e0646ea20e9f5f0ce097d9a05290d4a9e054df4e'),
  secretKey: hexToU8a('0x683576abfd5dc35273e4264c23095a1bf21c14517bece57c7f0cc5c0ed4ce06a3dbf386b7828f348abe15d76973a72009e6ef86a5c91db2990cb36bb657c6587'),
  // nosemgrep
  seed: 'Eve',
  type: 'sr25519'
}, {
  publicKey: hexToU8a('0x1cbd2d43530a44705ad088af313e18f80b53ef16b36177cd4b77b846f2a5f07c'),
  secretKey: hexToU8a('0xb835c20f450079cf4f513900ae9faf8df06ad86c681884122c752a4b2bf74d4303e4f21bc6cc62bb4eeed5a9cce642c25e2d2ac1464093b50f6196d78e3a7426'),
  // nosemgrep
  seed: 'Ferdie',
  type: 'sr25519'
}];
var PAIRSETHEREUM = [{
  name: 'Alith',
  publicKey: hexToU8a('0x02509540919faacf9ab52146c9aa40db68172d83777250b28e4679176e49ccdd9f'),
  secretKey: hexToU8a('0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133'),
  // nosemgrep
  type: 'ethereum'
}, {
  name: 'Baltathar',
  publicKey: hexToU8a('0x033bc19e36ff1673910575b6727a974a9abd80c9a875d41ab3e2648dbfb9e4b518'),
  secretKey: hexToU8a('0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b'),
  // nosemgrep
  type: 'ethereum'
}, {
  name: 'Charleth',
  publicKey: hexToU8a('0x0234637bdc0e89b5d46543bcbf8edff329d2702bc995e27e9af4b1ba009a3c2a5e'),
  secretKey: hexToU8a('0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b'),
  // nosemgrep
  type: 'ethereum'
}, {
  name: 'Dorothy',
  publicKey: hexToU8a('0x02a00d60b2b408c2a14c5d70cdd2c205db8985ef737a7e55ad20ea32cc9e7c417c'),
  secretKey: hexToU8a('0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68'),
  // nosemgrep
  type: 'ethereum'
}, {
  name: 'Ethan',
  publicKey: hexToU8a('0x025cdc005b752651cd3f728fb9192182acb3a9c89e19072cbd5b03f3ee1f1b3ffa'),
  secretKey: hexToU8a('0x7dce9bc8babb68fec1409be38c8e1a52650206a7ed90ff956ae8a6d15eeaaef4'),
  // nosemgrep
  type: 'ethereum'
}, {
  name: 'Faith',
  publicKey: hexToU8a('0x037964b6c9d546da4646ada28a99e34acaa1d14e7aba861a9055f9bd200c8abf74'),
  secretKey: hexToU8a('0xb9d2ea9a615f3165812e8d44de0d24da9bbd164b65c4f0573e1ce2c8dbd9c8df'),
  // nosemgrep
  type: 'ethereum'
}];

function createMeta(name, seed) {
  assert(name || seed, 'Testing pair should have either a name or a seed');
  return {
    isTesting: true,
    name: name || seed && seed.replace('//', '_').toLowerCase()
  };
}
/**
 * @name testKeyring
 * @summary Create an instance of Keyring pre-populated with locked test accounts
 * @description The test accounts (i.e. alice, bob, dave, eve, ferdie)
 * are available on the dev chain and each test account is initialized with DOT funds.
 */


function createTestKeyring() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var isDerived = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  var keyring = new Keyring$1(options);
  var pairs = options.type && options.type === 'ethereum' ? PAIRSETHEREUM : PAIRSSR25519;

  var _iterator = _createForOfIteratorHelper(pairs),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _step$value = _step.value,
          name = _step$value.name,
          publicKey = _step$value.publicKey,
          secretKey = _step$value.secretKey,
          seed = _step$value.seed,
          type = _step$value.type;
      var meta = createMeta(name, seed);
      var pair = !isDerived && !name && seed ? keyring.addFromUri(seed, meta, options.type) : keyring.addPair(createPair({
        toSS58: keyring.encodeAddress,
        type: type
      }, {
        publicKey: publicKey,
        secretKey: secretKey
      }, meta));

      pair.lock = function () {// we don't have lock/unlock functionality here
      };
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return keyring;
}

var publicKey = new Uint8Array(32);
var address = encodeAddress(publicKey);
var meta = {
  isTesting: true,
  name: 'nobody'
};
var json = {
  address: address,
  encoded: '',
  encoding: {
    content: ['pkcs8', 'ed25519'],
    type: 'none',
    version: '0'
  },
  meta: meta
};
var pair = {
  address: address,
  addressRaw: publicKey,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  decodePkcs8: function decodePkcs8(passphrase, encoded) {
    return undefined;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  decryptMessage: function decryptMessage(encryptedMessageWithNonce, senderPublicKey) {
    return null;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  derive: function derive(suri, meta) {
    return pair;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  encodePkcs8: function encodePkcs8(passphrase) {
    return new Uint8Array(0);
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  encryptMessage: function encryptMessage(message, recipientPublicKey, _nonce) {
    return new Uint8Array();
  },
  isLocked: true,
  lock: function lock() {// no locking, it is always locked
  },
  meta: meta,
  publicKey: publicKey,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setMeta: function setMeta(meta) {
    return undefined;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sign: function sign(message) {
    return new Uint8Array(64);
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  toJson: function toJson(passphrase) {
    return json;
  },
  type: 'ed25519',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  unlock: function unlock(passphrase) {
    return undefined;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verify: function verify(message, signature) {
    return false;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  vrfSign: function vrfSign(message, context, extra) {
    return new Uint8Array(96);
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  vrfVerify: function vrfVerify(message, vrfResult, context, extra) {
    return false;
  }
};
function nobody() {
  return pair;
}

function createTestPairs(options) {
  var isDerived = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  var keyring = createTestKeyring(options, isDerived);
  var pairs = keyring.getPairs();
  var map = {
    nobody: nobody()
  };

  var _iterator = _createForOfIteratorHelper(pairs),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var p = _step.value;
      map[p.meta.name] = p;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return map;
}

var Keyring = Keyring$1;

export { DEV_PHRASE, DEV_SEED, Keyring$1 as Keyring, createPair, createTestKeyring, createTestPairs, decodeAddress, Keyring as default, encodeAddress, packageInfo, setSS58Format };
