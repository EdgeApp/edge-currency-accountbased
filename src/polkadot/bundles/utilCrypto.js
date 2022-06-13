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

var maybeJSBI$K = {
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

  if (syms.length !== 1 || maybeJSBI$K.notEqual(syms[0], sym)) {
    return false;
  }

  if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
    return false;
  }

  if (typeof Object.getOwnPropertyDescriptor === 'function') {
    var descriptor = Object.getOwnPropertyDescriptor(obj, sym);

    if (descriptor.value !== symVal || maybeJSBI$K.notEqual(descriptor.enumerable, true)) {
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

var maybeJSBI$J = {
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

      if (maybeJSBI$J.equal(Object(result), result)) {
        return result;
      }

      return this;
    } else {
      return target.apply(that, args.concat(slice.call(arguments)));
    }
  };

  var boundLength = Math.max(0, maybeJSBI$J.subtract(target.length, args.length));
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

var maybeJSBI$I = {
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

    if (maybeJSBI$I.equal(value, needsEval)) {
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

    if ((first === '"' || first === "'" || first === '`' || last === '"' || last === "'" || last === '`') && maybeJSBI$I.notEqual(first, last)) {
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

var maybeJSBI$H = {
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

  return maybeJSBI$H.equal(getProto(fn), GeneratorFunction);
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

var maybeJSBI$G = {
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
    if (maybeJSBI$G.equal(array[i], value)) {
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
        anyTrue = maybeJSBI$G.equal(getter.call(value), typedArray);
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

var maybeJSBI$F = {
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

        if (maybeJSBI$F.equal(name, typedArray)) {
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
          return maybeJSBI$E.toNumber(args[i++]);

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
    if (typeof process !== 'undefined' && maybeJSBI$E.equal(process.noDeprecation, true)) {
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
    maybeJSBI$E.notEqual(value.inspect, exports.inspect) && // Also filter out any prototype objects using the circular check.
    !(value.constructor && maybeJSBI$E.equal(value.constructor.prototype, value))) {
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
      return maybeJSBI$E.add(prev, cur.replace(/\u001b\[\d\d?m/g, '').length) + 1;
    }, 0);

    if (length > 60) {
      return braces[0] + (base === '' ? '' : base + '\n ') + ' ' + output.join(',\n  ') + ' ' + braces[1];
    }

    return maybeJSBI$E.add(braces[0], base) + ' ' + output.join(', ') + ' ' + braces[1];
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

    while (_x = i, i = maybeJSBI$E.subtract(i, maybeJSBI$E.BigInt(1)), _x) {
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

var TextDecoder$1 = extractGlobal('TextDecoder', util$1.TextDecoder);

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
var packageInfo$3 = {
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
      return d && maybeJSBI$D.notEqual(d.version, version);
    });

    if (mismatches.length) {
      console.warn("".concat(name, " requires direct dependencies exactly matching version ").concat(version, ".\n").concat(DEDUPE, "\n").concat(flattenInfos(mismatches)));
    }
  }
}

var BigInt$1 = typeof xglobal.BigInt === 'function' && typeof xglobal.BigInt.asIntN === 'function' ? xglobal.BigInt : function () {
  return Number.NaN;
};

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

maybeJSBI$C.multiply(_1Bn, _1Bn);
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
    result = JSBI.add(maybeJSBI$B.multiply(result, U16_MAX), JSBI.BigInt(dvI.getUint16(i)));
  }

  if (mod) {
    result = JSBI.add(maybeJSBI$B.multiply(result, U8_MAX), JSBI.BigInt(dvI.getUint8(length)));
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
  return isNegative ? maybeJSBI$B.subtract(maybeJSBI$B.multiply(toBigInt(xor(u8a)), maybeJSBI$B.unaryMinus(_1n$2)), _1n$2) : toBigInt(u8a);
}

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

for (var i$1 = 0; i$1 < 256; i$1++) {
  for (var j$1 = 0; j$1 < 256; j$1++) {
    var _hex = maybeJSBI$A.add(U8_TO_HEX[i$1], U8_TO_HEX[j$1]);

    var _n = i$1 << 8 | j$1;

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

      return num !== null && _typeof(num) === 'object' && maybeJSBI$z.equal(num.constructor.wordSize, BN.wordSize) && Array.isArray(num.words);
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
        number = maybeJSBI$z.unaryMinus(number);
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
            j = maybeJSBI$z.add(j, maybeJSBI$z.BigInt(1));
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
            j = maybeJSBI$z.add(j, maybeJSBI$z.BigInt(1));
          }
        }
      }

      return this.strip();
    };

    function parseHex(str, start, end) {
      var r = 0;
      var len = Math.min(str.length, end);

      for (var i = start; i < len; _x3 = i, i = maybeJSBI$z.add(i, maybeJSBI$z.BigInt(1)), _x3) {
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
      this.length = Math.ceil(maybeJSBI$z.subtract(number.length, start) / 6);
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
          j = maybeJSBI$z.add(j, maybeJSBI$z.BigInt(1));
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

      for (var i = start; i < len; _x5 = i, i = maybeJSBI$z.add(i, maybeJSBI$z.BigInt(1)), _x5) {
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
      var total = maybeJSBI$z.subtract(number.length, start);
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

        for (i = 0; i < mod; _x6 = i, i = maybeJSBI$z.add(i, maybeJSBI$z.BigInt(1)), _x6) {
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
      while (maybeJSBI$z.lessThan(this.length, size)) {
        var _x7, _y, _z;

        this.words[(_x7 = this, _y = "length", _z = _x7[_y], _x7[_y] = maybeJSBI$z.add(_z, maybeJSBI$z.BigInt(1)), _z)] = 0;
      }

      return this;
    }; // Remove leading `0` from `this`


    BN.prototype.strip = function strip() {
      while (this.length > 1 && this.words[this.length - 1] === 0) {
        var _x8, _y2, _z2;

        _x8 = this, _y2 = "length", _z2 = _x8[_y2], _x8[_y2] = maybeJSBI$z.subtract(_z2, maybeJSBI$z.BigInt(1));
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
            out = maybeJSBI$z.add(maybeJSBI$z.add(zeros[6 - word.length], word), out);
          } else {
            out = maybeJSBI$z.add(word, out);
          }

          off += 2;

          if (off >= 26) {
            off -= 26;
            i--;
          }
        }

        if (carry !== 0) {
          out = maybeJSBI$z.add(carry.toString(16), out);
        }

        while (maybeJSBI$z.remainder(out.length, padding) !== 0) {
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
            out = maybeJSBI$z.add(maybeJSBI$z.add(zeros[maybeJSBI$z.subtract(groupSize, r.length)], r), out);
          } else {
            out = maybeJSBI$z.add(r, out);
          }
        }

        if (this.isZero()) {
          out = '0' + out;
        }

        while (maybeJSBI$z.remainder(out.length, padding) !== 0) {
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

      return this.negative !== 0 ? maybeJSBI$z.unaryMinus(ret) : ret;
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
        for (i = 0; i < reqLength - byteLength; _x9 = i, i = maybeJSBI$z.add(i, maybeJSBI$z.BigInt(1)), _x9) {
          var _x9;

          res[i] = 0;
        }

        for (i = 0; !q.isZero(); _x10 = i, i = maybeJSBI$z.add(i, maybeJSBI$z.BigInt(1)), _x10) {
          var _x10;

          b = q.andln(0xff);
          q.iushrn(8);
          res[reqLength - i - 1] = b;
        }
      } else {
        for (i = 0; !q.isZero(); _x11 = i, i = maybeJSBI$z.add(i, maybeJSBI$z.BigInt(1)), _x11) {
          var _x11;

          b = q.andln(0xff);
          q.iushrn(8);
          res[i] = b;
        }

        for (; i < reqLength; _x12 = i, i = maybeJSBI$z.add(i, maybeJSBI$z.BigInt(1)), _x12) {
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
      while (maybeJSBI$z.lessThan(this.length, num.length)) {
        var _x13, _y3, _z3;

        this.words[(_x13 = this, _y3 = "length", _z3 = _x13[_y3], _x13[_y3] = maybeJSBI$z.add(_z3, maybeJSBI$z.BigInt(1)), _z3)] = 0;
      }

      for (var i = 0; i < num.length; i++) {
        this.words[i] = maybeJSBI$z.bitwiseOr(this.words[i], num.words[i]);
      }

      return this.strip();
    };

    BN.prototype.ior = function ior(num) {
      assert(maybeJSBI$z.bitwiseOr(this.negative, num.negative) === 0);
      return this.iuor(num);
    }; // Or `num` with `this`


    BN.prototype.or = function or(num) {
      if (maybeJSBI$z.greaterThan(this.length, num.length)) return this.clone().ior(num);
      return num.clone().ior(this);
    };

    BN.prototype.uor = function uor(num) {
      if (maybeJSBI$z.greaterThan(this.length, num.length)) return this.clone().iuor(num);
      return num.clone().iuor(this);
    }; // And `num` with `this` in-place


    BN.prototype.iuand = function iuand(num) {
      // b = min-length(num, this)
      var b;

      if (maybeJSBI$z.greaterThan(this.length, num.length)) {
        b = num;
      } else {
        b = this;
      }

      for (var i = 0; i < b.length; i++) {
        this.words[i] = maybeJSBI$z.bitwiseAnd(this.words[i], num.words[i]);
      }

      this.length = b.length;
      return this.strip();
    };

    BN.prototype.iand = function iand(num) {
      assert(maybeJSBI$z.bitwiseOr(this.negative, num.negative) === 0);
      return this.iuand(num);
    }; // And `num` with `this`


    BN.prototype.and = function and(num) {
      if (maybeJSBI$z.greaterThan(this.length, num.length)) return this.clone().iand(num);
      return num.clone().iand(this);
    };

    BN.prototype.uand = function uand(num) {
      if (maybeJSBI$z.greaterThan(this.length, num.length)) return this.clone().iuand(num);
      return num.clone().iuand(this);
    }; // Xor `num` with `this` in-place


    BN.prototype.iuxor = function iuxor(num) {
      // a.length > b.length
      var a;
      var b;

      if (maybeJSBI$z.greaterThan(this.length, num.length)) {
        a = this;
        b = num;
      } else {
        a = num;
        b = this;
      }

      for (var i = 0; i < b.length; i++) {
        this.words[i] = maybeJSBI$z.bitwiseXor(a.words[i], b.words[i]);
      }

      if (maybeJSBI$z.notEqual(this, a)) {
        for (; i < a.length; i++) {
          this.words[i] = a.words[i];
        }
      }

      this.length = a.length;
      return this.strip();
    };

    BN.prototype.ixor = function ixor(num) {
      assert(maybeJSBI$z.bitwiseOr(this.negative, num.negative) === 0);
      return this.iuxor(num);
    }; // Xor `num` with `this`


    BN.prototype.xor = function xor(num) {
      if (maybeJSBI$z.greaterThan(this.length, num.length)) return this.clone().ixor(num);
      return num.clone().ixor(this);
    };

    BN.prototype.uxor = function uxor(num) {
      if (maybeJSBI$z.greaterThan(this.length, num.length)) return this.clone().iuxor(num);
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
        this.words[i] = maybeJSBI$z.bitwiseNot(this.words[i]) & 0x3ffffff;
      } // Handle the residue


      if (bitsLeft > 0) {
        this.words[i] = maybeJSBI$z.bitwiseNot(this.words[i]) & 0x3ffffff >> 26 - bitsLeft;
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

      if (maybeJSBI$z.greaterThan(this.length, num.length)) {
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
        _x14 = this, _y4 = "length", _z4 = _x14[_y4], _x14[_y4] = maybeJSBI$z.add(_z4, maybeJSBI$z.BigInt(1)); // Copy the rest of the words
      } else if (maybeJSBI$z.notEqual(a, this)) {
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

      if (maybeJSBI$z.greaterThan(this.length, num.length)) return this.clone().iadd(num);
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


      if (carry === 0 && i < a.length && maybeJSBI$z.notEqual(a, this)) {
        for (; i < a.length; i++) {
          this.words[i] = a.words[i];
        }
      }

      this.length = Math.max(this.length, i);

      if (maybeJSBI$z.notEqual(a, this)) {
        this.negative = 1;
      }

      return this.strip();
    }; // Subtract `num` from `this`


    BN.prototype.sub = function sub(num) {
      return this.clone().isub(num);
    };

    function smallMulTo(self, num, out) {
      out.negative = maybeJSBI$z.bitwiseXor(num.negative, self.negative);
      var len = maybeJSBI$z.add(self.length, num.length) | 0;
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

        _x15 = out, _y5 = "length", _z5 = _x15[_y5], _x15[_y5] = maybeJSBI$z.subtract(_z5, maybeJSBI$z.BigInt(1));
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
      out.negative = maybeJSBI$z.bitwiseXor(self.negative, num.negative);
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
        _x16 = out, _y6 = "length", _z6 = _x16[_y6], _x16[_y6] = maybeJSBI$z.add(_z6, maybeJSBI$z.BigInt(1));
      }

      return out;
    }; // Polyfill comb


    if (!Math.imul) {
      comb10MulTo = smallMulTo;
    }

    function bigMulTo(self, num, out) {
      out.negative = maybeJSBI$z.bitwiseXor(num.negative, self.negative);
      out.length = maybeJSBI$z.add(self.length, num.length);
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

        _x17 = out, _y7 = "length", _z7 = _x17[_y7], _x17[_y7] = maybeJSBI$z.subtract(_z7, maybeJSBI$z.BigInt(1));
      }

      return out.strip();
    }

    function jumboMulTo(self, num, out) {
      var fftm = new FFTM();
      return fftm.mulp(self, num, out);
    }

    BN.prototype.mulTo = function mulTo(num, out) {
      var res;
      var len = maybeJSBI$z.add(this.length, num.length);

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
            rtws[p + j] = maybeJSBI$z.add(re, ro);
            itws[p + j] = maybeJSBI$z.add(ie, io);
            rtws[p + j + s] = maybeJSBI$z.subtract(re, ro);
            itws[p + j + s] = maybeJSBI$z.subtract(ie, io);
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
        iws[i] = maybeJSBI$z.unaryMinus(iws[N - i - 1]);
        iws[N - i - 1] = maybeJSBI$z.unaryMinus(t);
      }
    };

    FFTM.prototype.normalize13b = function normalize13b(ws, N) {
      var carry = 0;

      for (var i = 0; i < N / 2; i++) {
        var w = Math.round(maybeJSBI$z.divide(ws[2 * i + 1], N)) * 0x2000 + Math.round(maybeJSBI$z.divide(ws[2 * i], N)) + carry;
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
        var rx = maybeJSBI$z.subtract(maybeJSBI$z.multiply(rwst[i], nrwst[i]), maybeJSBI$z.multiply(iwst[i], niwst[i]));
        iwst[i] = maybeJSBI$z.add(maybeJSBI$z.multiply(rwst[i], niwst[i]), maybeJSBI$z.multiply(iwst[i], nrwst[i]));
        rwst[i] = rx;
      }

      this.conjugate(rwst, iwst, N);
      this.transform(rwst, iwst, rmws, _, N, rbt);
      this.conjugate(rmws, _, N);
      this.normalize13b(rmws, N);
      out.negative = maybeJSBI$z.bitwiseXor(x.negative, y.negative);
      out.length = maybeJSBI$z.add(x.length, y.length);
      return out.strip();
    }; // Multiply `this` by `num`


    BN.prototype.mul = function mul(num) {
      var out = new BN(null);
      out.words = new Array(maybeJSBI$z.add(this.length, num.length));
      return this.mulTo(num, out);
    }; // Multiply employing FFT


    BN.prototype.mulf = function mulf(num) {
      var out = new BN(null);
      out.words = new Array(maybeJSBI$z.add(this.length, num.length));
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
        _x18 = this, _y8 = "length", _z8 = _x18[_y8], _x18[_y8] = maybeJSBI$z.add(_z8, maybeJSBI$z.BigInt(1));
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

        for (i = 0; maybeJSBI$z.lessThan(i, this.length); _x19 = i, i = maybeJSBI$z.add(i, maybeJSBI$z.BigInt(1)), _x19) {
          var _x19;

          var newCarry = this.words[i] & carryMask;
          var c = (this.words[i] | 0) - newCarry << r;
          this.words[i] = c | carry;
          carry = newCarry >>> 26 - r;
        }

        if (carry) {
          var _x20, _y9, _z9;

          this.words[i] = carry;
          _x20 = this, _y9 = "length", _z9 = _x20[_y9], _x20[_y9] = maybeJSBI$z.add(_z9, maybeJSBI$z.BigInt(1));
        }
      }

      if (s !== 0) {
        for (i = this.length - 1; i >= 0; _x21 = i, i = maybeJSBI$z.subtract(i, maybeJSBI$z.BigInt(1)), _x21) {
          var _x21;

          this.words[i + s] = this.words[i];
        }

        for (i = 0; i < s; _x22 = i, i = maybeJSBI$z.add(i, maybeJSBI$z.BigInt(1)), _x22) {
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

        maskedWords.words[(_x23 = maskedWords, _y10 = "length", _z10 = _x23[_y10], _x23[_y10] = maybeJSBI$z.add(_z10, maybeJSBI$z.BigInt(1)), _z10)] = carry;
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
      if (num < 0) return this.isubn(maybeJSBI$z.unaryMinus(num)); // Possible sign change

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

      _x24 = this.words, _y11 = 0, _x24[_y11] = maybeJSBI$z.add(_x24[_y11], num); // Carry

      for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
        this.words[i] -= 0x4000000;

        if (i === this.length - 1) {
          this.words[i + 1] = 1;
        } else {
          var _x25, _y12, _z11;

          _x25 = this.words, _y12 = i + 1, _z11 = _x25[_y12], _x25[_y12] = maybeJSBI$z.add(_z11, maybeJSBI$z.BigInt(1));
        }
      }

      this.length = Math.max(this.length, i + 1);
      return this;
    }; // Subtract plain number `num` from `this`


    BN.prototype.isubn = function isubn(num) {
      var _x26, _y13;

      assert(typeof num === 'number');
      assert(num < 0x4000000);
      if (num < 0) return this.iaddn(maybeJSBI$z.unaryMinus(num));

      if (this.negative !== 0) {
        this.negative = 0;
        this.iaddn(num);
        this.negative = 1;
        return this;
      }

      _x26 = this.words, _y13 = 0, _x26[_y13] = maybeJSBI$z.subtract(_x26[_y13], num);

      if (this.length === 1 && this.words[0] < 0) {
        this.words[0] = maybeJSBI$z.unaryMinus(this.words[0]);
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
      var len = maybeJSBI$z.add(num.length, shift);
      var i;

      this._expand(len);

      var w;
      var carry = 0;

      for (i = 0; maybeJSBI$z.lessThan(i, num.length); _x27 = i, i = maybeJSBI$z.add(i, maybeJSBI$z.BigInt(1)), _x27) {
        var _x27;

        w = (this.words[maybeJSBI$z.add(i, shift)] | 0) + carry;
        var right = (num.words[i] | 0) * mul;
        w -= right & 0x3ffffff;
        carry = (w >> 26) - (right / 0x4000000 | 0);
        this.words[maybeJSBI$z.add(i, shift)] = w & 0x3ffffff;
      }

      for (; maybeJSBI$z.lessThan(i, maybeJSBI$z.subtract(this.length, shift)); _x28 = i, i = maybeJSBI$z.add(i, maybeJSBI$z.BigInt(1)), _x28) {
        var _x28;

        w = (this.words[maybeJSBI$z.add(i, shift)] | 0) + carry;
        carry = w >> 26;
        this.words[maybeJSBI$z.add(i, shift)] = w & 0x3ffffff;
      }

      if (carry === 0) return this.strip(); // Subtraction overflow

      assert(carry === -1);
      carry = 0;

      for (i = 0; maybeJSBI$z.lessThan(i, this.length); _x29 = i, i = maybeJSBI$z.add(i, maybeJSBI$z.BigInt(1)), _x29) {
        var _x29;

        w = -(this.words[i] | 0) + carry;
        carry = w >> 26;
        this.words[i] = w & 0x3ffffff;
      }

      this.negative = 1;
      return this.strip();
    };

    BN.prototype._wordDiv = function _wordDiv(num, mode) {
      var shift = maybeJSBI$z.subtract(this.length, num.length);
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


      var m = maybeJSBI$z.subtract(a.length, b.length);
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

      if (maybeJSBI$z.bitwiseAnd(this.negative, num.negative) !== 0) {
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


      if (maybeJSBI$z.greaterThan(num.length, this.length) || this.cmp(num) < 0) {
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
      return maybeJSBI$z.bitwiseAnd(this.words[0], num);
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
        _x30 = this, _y14 = "length", _z12 = _x30[_y14], _x30[_y14] = maybeJSBI$z.add(_z12, maybeJSBI$z.BigInt(1));
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
          num = maybeJSBI$z.unaryMinus(num);
        }

        assert(num <= 0x3ffffff, 'Number is too big');
        var w = this.words[0] | 0;
        res = w === num ? 0 : w < num ? -1 : 1;
      }

      if (this.negative !== 0) return maybeJSBI$z.unaryMinus(res) | 0;
      return res;
    }; // Compare two numbers and return:
    // 1 - if `this` > `num`
    // 0 - if `this` == `num`
    // -1 - if `this` < `num`


    BN.prototype.cmp = function cmp(num) {
      if (this.negative !== 0 && num.negative === 0) return -1;
      if (this.negative === 0 && num.negative !== 0) return 1;
      var res = this.ucmp(num);
      if (this.negative !== 0) return maybeJSBI$z.unaryMinus(res) | 0;
      return res;
    }; // Unsigned comparison


    BN.prototype.ucmp = function ucmp(num) {
      // At this point both numbers have the same sign
      if (maybeJSBI$z.greaterThan(this.length, num.length)) return 1;
      if (maybeJSBI$z.lessThan(this.length, num.length)) return -1;
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
      } while (maybeJSBI$z.greaterThan(rlen, this.n));

      var cmp = maybeJSBI$z.lessThan(rlen, this.n) ? -1 : r.ucmp(this.p);

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
      output.words[(_x31 = output, _y15 = "length", _z13 = _x31[_y15], _x31[_y15] = maybeJSBI$z.add(_z13, maybeJSBI$z.BigInt(1)), _z13)] = prev & mask;

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

        _x32 = num, _y16 = "length", _z14 = _x32[_y16], _x32[_y16] = maybeJSBI$z.subtract(_z14, maybeJSBI$z.BigInt(1));

        if (num.words[num.length - 1] === 0) {
          var _x33, _y17, _z15;

          _x33 = num, _y17 = "length", _z15 = _x33[_y17], _x33[_y17] = maybeJSBI$z.subtract(_z15, maybeJSBI$z.BigInt(1));
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

        num.words[(_x34 = num, _y18 = "length", _z16 = _x34[_y18], _x34[_y18] = maybeJSBI$z.add(_z16, maybeJSBI$z.BigInt(1)), _z16)] = carry;
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
      assert(maybeJSBI$z.bitwiseOr(a.negative, b.negative) === 0, 'red works only with positives');
      assert(a.red && maybeJSBI$z.equal(a.red, b.red), 'red works only with red numbers');
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

          if (maybeJSBI$z.notEqual(res, wnd[0])) {
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
      return maybeJSBI$z.equal(r, num) ? r.clone() : r;
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
/**
 * @name u8aCmp
 * @summary Compares two Uint8Arrays for sorting.
 * @description
 * For `UInt8Array` (or hex string) input values returning -1, 0 or +1
 * @example
 * <BR>
 *
 * ```javascript
 * import { u8aCmp } from '@polkadot/util';
 *
 * u8aCmp(new Uint8Array([0x67, 0x65]), new Uint8Array([0x68, 0x65])); // -1
 * u8aCmp(new Uint8Array([0x68, 0x65]), new Uint8Array([0x68, 0x65])); // 0
 * u8aCmp(new Uint8Array([0x69, 0x65]), new Uint8Array([0x68, 0x65])); // +1
 * ```
 */

function u8aCmp(a, b) {
  var u8aa = u8aToU8a(a);
  var u8ab = u8aToU8a(b);
  var i = 0;

  while (true) {
    var overA = i >= u8aa.length;
    var overB = i >= u8ab.length;

    if (overA && overB) {
      // both ends reached
      return 0;
    } else if (overA) {
      // a has no more data, b has data
      return -1;
    } else if (overB) {
      // b has no more data, a has data
      return 1;
    } else if (maybeJSBI$y.notEqual(u8aa[i], u8ab[i])) {
      // the number in this index doesn't match
      // (we don't use u8aa[i] - u8ab[i] since that doesn't match with localeCompare)
      return maybeJSBI$y.greaterThan(u8aa[i], u8ab[i]) ? 1 : -1;
    }

    i++;
  }
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

  if (maybeJSBI$x.equal(u8aa.length, u8ab.length)) {
    var dvA = new DataView(u8aa.buffer, u8aa.byteOffset);
    var dvB = new DataView(u8ab.buffer, u8ab.byteOffset);
    var mod = u8aa.length % 4;
    var length = u8aa.length - mod;

    for (var i = 0; i < length; i += 4) {
      if (maybeJSBI$x.notEqual(dvA.getUint32(i), dvB.getUint32(i))) {
        return false;
      }
    }

    for (var _i = length; _i < u8aa.length; _i++) {
      if (maybeJSBI$x.notEqual(u8aa[_i], u8ab[_i])) {
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

/**
 * @name u8aSorted
 * @summary Sorts an array of Uint8Arrays
 * @description
 * For input `UInt8Array[]` return the sorted result
 * @example
 * <BR>
 *
 * ```javascript
 * import { u8aSorted} from '@polkadot/util';
 *
 * u8aSorted([new Uint8Array([0x69]), new Uint8Array([0x68])]); // [0x68, 0x69]
 * ```
 */

function u8aSorted(u8as) {
  return u8as.sort(u8aCmp);
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

var decoder = new TextDecoder$1('utf-8');
/**
 * @name u8aToString
 * @summary Creates a utf-8 string from a Uint8Array object.
 * @description
 * `UInt8Array` input values return the actual decoded utf-8 string. `null` or `undefined` values returns an empty string.
 * @example
 * <BR>
 *
 * ```javascript
 * import { u8aToString } from '@polkadot/util';
 *
 * u8aToString(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f])); // hello
 * ```
 */

function u8aToString(value) {
  return !(value !== null && value !== void 0 && value.length) ? '' : decoder.decode(value);
}

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
var U8A_WRAP_ETHEREUM = u8aToU8a('\x19Ethereum Signed Message:\n');
var U8A_WRAP_PREFIX = u8aToU8a('<Bytes>');
var U8A_WRAP_POSTFIX = u8aToU8a('</Bytes>');
var WRAP_LEN = maybeJSBI$w.add(U8A_WRAP_PREFIX.length, U8A_WRAP_POSTFIX.length);
function u8aIsWrapped(u8a, withEthereum) {
  return maybeJSBI$w.greaterThanOrEqual(u8a.length, WRAP_LEN) && u8aEq(u8a.subarray(0, U8A_WRAP_PREFIX.length), U8A_WRAP_PREFIX) && u8aEq(u8a.slice(maybeJSBI$w.unaryMinus(U8A_WRAP_POSTFIX.length)), U8A_WRAP_POSTFIX) || withEthereum && maybeJSBI$w.greaterThanOrEqual(u8a.length, U8A_WRAP_ETHEREUM.length) && u8aEq(u8a.subarray(0, U8A_WRAP_ETHEREUM.length), U8A_WRAP_ETHEREUM);
}
function u8aUnwrapBytes(bytes) {
  var u8a = u8aToU8a(bytes); // we don't want to unwrap Ethereum-style wraps

  return u8aIsWrapped(u8a, false) ? u8a.subarray(U8A_WRAP_PREFIX.length, maybeJSBI$w.subtract(u8a.length, U8A_WRAP_POSTFIX.length)) : u8a;
}
function u8aWrapBytes(bytes) {
  var u8a = u8aToU8a(bytes); // if Ethereum-wrapping, we don't add our wrapping bytes

  return u8aIsWrapped(u8a, true) ? u8a : u8aConcat(U8A_WRAP_PREFIX, u8a, U8A_WRAP_POSTFIX);
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
var DIV = JSBI.BigInt(256);
var NEG_MASK = JSBI.BigInt(0xff);

function createEmpty$1(_ref) {
  var _ref$bitLength = _ref.bitLength,
      bitLength = _ref$bitLength === void 0 ? 0 : _ref$bitLength;
  return bitLength === -1 ? new Uint8Array() : new Uint8Array(Math.ceil(bitLength / 8));
}

function toU8a$1(value, _ref2) {
  var isLe = _ref2.isLe,
      isNegative = _ref2.isNegative;
  var arr = [];

  if (isNegative) {
    value = maybeJSBI$v.multiply(maybeJSBI$v.add(value, _1n$2), maybeJSBI$v.unaryMinus(_1n$2));
  }

  while (maybeJSBI$v.notEqual(value, _0n$2)) {
    var mod = maybeJSBI$v.remainder(value, DIV);
    var val = maybeJSBI$v.toNumber(isNegative ? maybeJSBI$v.bitwiseXor(mod, NEG_MASK) : mod);

    if (isLe) {
      arr.push(val);
    } else {
      arr.unshift(val);
    }

    value = maybeJSBI$v.divide(maybeJSBI$v.subtract(value, mod), DIV);
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

  if (maybeJSBI$v.equal(valueBi, _0n$2)) {
    return createEmpty$1(opts);
  }

  var u8a = toU8a$1(valueBi, opts);

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

var BN_EIGHT = new BN(8);
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

    length = maybeJSBI$u.subtract(length, maybeJSBI$u.BigInt(1));
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
var logTo = {
  debug: 'log',
  error: 'error',
  log: 'log',
  warn: 'warn'
};

function formatOther(value) {
  if (value && isObject(value) && maybeJSBI$t.equal(value.constructor, Object)) {
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
    return maybeJSBI$t.lessThan(r.length, maxLength) ? v : "".concat(r.substr(0, maxLength), " ...");
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
  return !!e && (e === '*' || maybeJSBI$t.equal(type, e) || e.endsWith('*') && type.startsWith(e.slice(0, -1)));
}

function isDebugOff(e, type) {
  return !!e && e.startsWith('-') && (maybeJSBI$t.equal(type, e.slice(1)) || e.endsWith('*') && type.startsWith(e.slice(1, -1)));
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

// Copyright 2017-2022 @polkadot/networks authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Do not edit, auto-generated by @polkadot/dev
var packageInfo$2 = {
  name: '@polkadot/networks',
  path: require('url').pathToFileURL(__filename).toString() ? new URL(require('url').pathToFileURL(__filename).toString()).pathname.substring(0, new URL(require('url').pathToFileURL(__filename).toString()).pathname.lastIndexOf('/') + 1) : 'auto',
  type: 'esm',
  version: '8.7.1'
};

// Copyright 2017-2022 @polkadot/x-randomvalues authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Do not edit, auto-generated by @polkadot/dev
var packageInfo$1 = {
  name: '@polkadot/x-randomvalues',
  path: require('url').pathToFileURL(__filename).toString() ? new URL(require('url').pathToFileURL(__filename).toString()).pathname.substring(0, new URL(require('url').pathToFileURL(__filename).toString()).pathname.lastIndexOf('/') + 1) : 'auto',
  type: 'esm',
  version: '8.7.1'
};

function getRandomValues(output) {
  var bytes = nodeCrypto.randomBytes(output.length);

  for (var i = 0; i < bytes.length; i++) {
    output[i] = bytes[i];
  }

  return output;
}

var others = [packageInfo$2, packageInfo$3, packageInfo$1];

// Copyright 2017-2022 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Do not edit, auto-generated by @polkadot/dev
var packageInfo = {
  name: '@polkadot/util-crypto',
  path: require('url').pathToFileURL(__filename).toString() ? new URL(require('url').pathToFileURL(__filename).toString()).pathname.substring(0, new URL(require('url').pathToFileURL(__filename).toString()).pathname.lastIndexOf('/') + 1) : 'auto',
  type: 'esm',
  version: '8.7.1'
};

detectPackage(packageInfo, null, others);

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
  var x2 = mod(maybeJSBI$s.multiply(x, x));
  var x3 = mod(maybeJSBI$s.multiply(x2, x));
  return mod(maybeJSBI$s.add(maybeJSBI$s.add(x3, maybeJSBI$s.multiply(a, x)), b));
}

var USE_ENDOMORPHISM = maybeJSBI$s.equal(CURVE.a, _0n$1);

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
      var Z1Z1 = mod(maybeJSBI$s.exponentiate(Z1, _2n$1));
      var Z2Z2 = mod(maybeJSBI$s.exponentiate(Z2, _2n$1));
      var U1 = mod(maybeJSBI$s.multiply(X1, Z2Z2));
      var U2 = mod(maybeJSBI$s.multiply(X2, Z1Z1));
      var S1 = mod(maybeJSBI$s.multiply(mod(maybeJSBI$s.multiply(Y1, Z2)), Z2Z2));
      var S2 = mod(maybeJSBI$s.multiply(mod(maybeJSBI$s.multiply(Y2, Z1)), Z1Z1));
      return maybeJSBI$s.equal(U1, U2) && maybeJSBI$s.equal(S1, S2);
    }
  }, {
    key: "negate",
    value: function negate() {
      return new JacobianPoint(this.x, mod(maybeJSBI$s.unaryMinus(this.y)), this.z);
    }
  }, {
    key: "double",
    value: function double() {
      var X1 = this.x,
          Y1 = this.y,
          Z1 = this.z;
      var A = mod(maybeJSBI$s.exponentiate(X1, _2n$1));
      var B = mod(maybeJSBI$s.exponentiate(Y1, _2n$1));
      var C = mod(maybeJSBI$s.exponentiate(B, _2n$1));
      var D = mod(maybeJSBI$s.multiply(_2n$1, maybeJSBI$s.subtract(maybeJSBI$s.subtract(mod(maybeJSBI$s.exponentiate(maybeJSBI$s.add(X1, B), _2n$1)), A), C)));
      var E = mod(maybeJSBI$s.multiply(_3n, A));
      var F = mod(maybeJSBI$s.exponentiate(E, _2n$1));
      var X3 = mod(maybeJSBI$s.subtract(F, maybeJSBI$s.multiply(_2n$1, D)));
      var Y3 = mod(maybeJSBI$s.subtract(maybeJSBI$s.multiply(E, maybeJSBI$s.subtract(D, X3)), maybeJSBI$s.multiply(_8n, C)));
      var Z3 = mod(maybeJSBI$s.multiply(maybeJSBI$s.multiply(_2n$1, Y1), Z1));
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
      if (maybeJSBI$s.equal(X2, _0n$1) || maybeJSBI$s.equal(Y2, _0n$1)) return this;
      if (maybeJSBI$s.equal(X1, _0n$1) || maybeJSBI$s.equal(Y1, _0n$1)) return other;
      var Z1Z1 = mod(maybeJSBI$s.exponentiate(Z1, _2n$1));
      var Z2Z2 = mod(maybeJSBI$s.exponentiate(Z2, _2n$1));
      var U1 = mod(maybeJSBI$s.multiply(X1, Z2Z2));
      var U2 = mod(maybeJSBI$s.multiply(X2, Z1Z1));
      var S1 = mod(maybeJSBI$s.multiply(mod(maybeJSBI$s.multiply(Y1, Z2)), Z2Z2));
      var S2 = mod(maybeJSBI$s.multiply(mod(maybeJSBI$s.multiply(Y2, Z1)), Z1Z1));
      var H = mod(maybeJSBI$s.subtract(U2, U1));
      var r = mod(maybeJSBI$s.subtract(S2, S1));

      if (maybeJSBI$s.equal(H, _0n$1)) {
        if (maybeJSBI$s.equal(r, _0n$1)) {
          return this["double"]();
        } else {
          return JacobianPoint.ZERO;
        }
      }

      var HH = mod(maybeJSBI$s.exponentiate(H, _2n$1));
      var HHH = mod(maybeJSBI$s.multiply(H, HH));
      var V = mod(maybeJSBI$s.multiply(U1, HH));
      var X3 = mod(maybeJSBI$s.subtract(maybeJSBI$s.subtract(maybeJSBI$s.exponentiate(r, _2n$1), HHH), maybeJSBI$s.multiply(_2n$1, V)));
      var Y3 = mod(maybeJSBI$s.subtract(maybeJSBI$s.multiply(r, maybeJSBI$s.subtract(V, X3)), maybeJSBI$s.multiply(S1, HHH)));
      var Z3 = mod(maybeJSBI$s.multiply(maybeJSBI$s.multiply(Z1, Z2), H));
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
      if (maybeJSBI$s.equal(n, _0n$1)) return P0;
      if (maybeJSBI$s.equal(n, _1n$1)) return this;

      if (!USE_ENDOMORPHISM) {
        var p = P0;

        var _d = this;

        while (maybeJSBI$s.greaterThan(n, _0n$1)) {
          if (maybeJSBI$s.bitwiseAnd(n, _1n$1)) p = p.add(_d);
          _d = _d["double"]();
          n = maybeJSBI$s.signedRightShift(n, _1n$1);
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

      while (maybeJSBI$s.greaterThan(k1, _0n$1) || maybeJSBI$s.greaterThan(k2, _0n$1)) {
        if (maybeJSBI$s.bitwiseAnd(k1, _1n$1)) k1p = k1p.add(d);
        if (maybeJSBI$s.bitwiseAnd(k2, _1n$1)) k2p = k2p.add(d);
        d = d["double"]();
        k1 = maybeJSBI$s.signedRightShift(k1, _1n$1);
        k2 = maybeJSBI$s.signedRightShift(k2, _1n$1);
      }

      if (k1neg) k1p = k1p.negate();
      if (k2neg) k2p = k2p.negate();
      k2p = new JacobianPoint(mod(maybeJSBI$s.multiply(k2p.x, CURVE.beta)), k2p.y, k2p.z);
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
        var wbits = maybeJSBI$s.toNumber(maybeJSBI$s.bitwiseAnd(n, mask));
        n = maybeJSBI$s.signedRightShift(n, shiftBy);

        if (wbits > windowSize) {
          wbits -= maxNumber;
          n = maybeJSBI$s.add(n, _1n$1);
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
        k2p = new JacobianPoint(mod(maybeJSBI$s.multiply(k2p.x, CURVE.beta)), k2p.y, k2p.z);
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
      var iz2 = mod(maybeJSBI$s.multiply(iz1, iz1));
      var iz3 = mod(maybeJSBI$s.multiply(iz2, iz1));
      var ax = mod(maybeJSBI$s.multiply(x, iz2));
      var ay = mod(maybeJSBI$s.multiply(y, iz3));
      var zz = mod(maybeJSBI$s.multiply(z, iz1));
      if (maybeJSBI$s.notEqual(zz, _1n$1)) throw new Error('invZ was invalid');
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
        var prefix = maybeJSBI$s.bitwiseAnd(this.y, _1n$1) ? '03' : '02';
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
      var left = mod(maybeJSBI$s.multiply(y, y));
      var right = weistrass(x);
      if (maybeJSBI$s.notEqual(mod(maybeJSBI$s.subtract(left, right)), _0n$1)) throw new Error(msg);
    }
  }, {
    key: "equals",
    value: function equals(other) {
      return maybeJSBI$s.equal(this.x, other.x) && maybeJSBI$s.equal(this.y, other.y);
    }
  }, {
    key: "negate",
    value: function negate() {
      return new Point(this.x, mod(maybeJSBI$s.unaryMinus(this.y)));
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
      var isYOdd = maybeJSBI$s.equal(maybeJSBI$s.bitwiseAnd(y, _1n$1), _1n$1);

      if (isShort) {
        if (isYOdd) y = mod(maybeJSBI$s.unaryMinus(y));
      } else {
        var isFirstByteOdd = (bytes[0] & 1) === 1;
        if (isFirstByteOdd !== isYOdd) y = mod(maybeJSBI$s.unaryMinus(y));
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

      if (maybeJSBI$s.equal(h, _0n$1)) throw new Error('Cannot recover signature: msgHash cannot be 0');
      var prefix = recovery & 1 ? '03' : '02';
      var R = Point.fromHex(prefix + numTo32bStr(r));
      var n = CURVE.n;
      var rinv = invert(r, n);
      var u1 = mod(maybeJSBI$s.multiply(maybeJSBI$s.unaryMinus(h), rinv), n);
      var u2 = mod(maybeJSBI$s.multiply(s, rinv), n);
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

  if (!len || maybeJSBI$s.notEqual(res.length, len)) {
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
      var HALF = maybeJSBI$s.signedRightShift(CURVE.n, _1n$1);
      return maybeJSBI$s.greaterThan(this.s, HALF);
    }
  }, {
    key: "normalizeS",
    value: function normalizeS() {
      return this.hasHighS() ? new Signature(this.r, maybeJSBI$s.subtract(CURVE.n, this.s)) : this;
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
      return maybeJSBI$s.add(numTo32bStr(this.r), numTo32bStr(this.s));
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
    return maybeJSBI$s.add(a, arr.length);
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
  if (maybeJSBI$s.greaterThan(num, POW_2_256)) throw new Error('Expected number < 2^256');
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
  var result = maybeJSBI$s.remainder(a, b);
  return maybeJSBI$s.greaterThanOrEqual(result, _0n$1) ? result : maybeJSBI$s.add(b, result);
}

function pow2(x, power) {
  var P = CURVE.P;
  var res = x;

  while (maybeJSBI$s.greaterThan((_x = power, power = maybeJSBI$s.subtract(power, maybeJSBI$s.BigInt(1)), _x), _0n$1)) {
    var _x;

    res = maybeJSBI$s.multiply(res, res);
    res = maybeJSBI$s.remainder(res, P);
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

  var b2 = maybeJSBI$s.remainder(maybeJSBI$s.multiply(maybeJSBI$s.multiply(x, x), x), P);
  var b3 = maybeJSBI$s.remainder(maybeJSBI$s.multiply(maybeJSBI$s.multiply(b2, b2), x), P);
  var b6 = maybeJSBI$s.remainder(maybeJSBI$s.multiply(pow2(b3, _3n), b3), P);
  var b9 = maybeJSBI$s.remainder(maybeJSBI$s.multiply(pow2(b6, _3n), b3), P);
  var b11 = maybeJSBI$s.remainder(maybeJSBI$s.multiply(pow2(b9, _2n$1), b2), P);
  var b22 = maybeJSBI$s.remainder(maybeJSBI$s.multiply(pow2(b11, _11n), b11), P);
  var b44 = maybeJSBI$s.remainder(maybeJSBI$s.multiply(pow2(b22, _22n), b22), P);
  var b88 = maybeJSBI$s.remainder(maybeJSBI$s.multiply(pow2(b44, _44n), b44), P);
  var b176 = maybeJSBI$s.remainder(maybeJSBI$s.multiply(pow2(b88, _88n), b88), P);
  var b220 = maybeJSBI$s.remainder(maybeJSBI$s.multiply(pow2(b176, _44n), b44), P);
  var b223 = maybeJSBI$s.remainder(maybeJSBI$s.multiply(pow2(b220, _3n), b3), P);
  var t1 = maybeJSBI$s.remainder(maybeJSBI$s.multiply(pow2(b223, _23n), b22), P);
  var t2 = maybeJSBI$s.remainder(maybeJSBI$s.multiply(pow2(t1, _6n), b2), P);
  return pow2(t2, _2n$1);
}

function invert(number) {
  var modulo = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : CURVE.P;

  if (maybeJSBI$s.equal(number, _0n$1) || maybeJSBI$s.lessThanOrEqual(modulo, _0n$1)) {
    throw new Error("invert: expected positive integers, got n=".concat(number, " mod=").concat(modulo));
  }

  var a = mod(number, modulo);
  var b = modulo;
  var x = _0n$1,
      y = _1n$1,
      u = _1n$1,
      v = _0n$1;

  while (maybeJSBI$s.notEqual(a, _0n$1)) {
    var q = maybeJSBI$s.divide(b, a);
    var r = maybeJSBI$s.remainder(b, a);
    var m = maybeJSBI$s.subtract(x, maybeJSBI$s.multiply(u, q));
    var n = maybeJSBI$s.subtract(y, maybeJSBI$s.multiply(v, q));
    b = a, a = r, x = u, y = v, u = m, v = n;
  }

  var gcd = b;
  if (maybeJSBI$s.notEqual(gcd, _1n$1)) throw new Error('invert: does not exist');
  return mod(x, modulo);
}

function invertBatch(nums) {
  var p = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : CURVE.P;
  var scratch = new Array(nums.length);
  var lastMultiplied = nums.reduce(function (acc, num, i) {
    if (maybeJSBI$s.equal(num, _0n$1)) return acc;
    scratch[i] = acc;
    return mod(maybeJSBI$s.multiply(acc, num), p);
  }, _1n$1);
  var inverted = invert(lastMultiplied, p);
  nums.reduceRight(function (acc, num, i) {
    if (maybeJSBI$s.equal(num, _0n$1)) return acc;
    scratch[i] = mod(maybeJSBI$s.multiply(acc, scratch[i]), p);
    return mod(maybeJSBI$s.multiply(acc, num), p);
  }, inverted);
  return scratch;
}

var divNearest = function divNearest(a, b) {
  return maybeJSBI$s.divide(maybeJSBI$s.add(a, maybeJSBI$s.divide(b, _2n$1)), b);
};

var POW_2_128 = JSBI.exponentiate(_2n$1, JSBI.BigInt(128));

function splitScalarEndo(k) {
  var n = CURVE.n;
  var a1 = JSBI.BigInt('0x3086d221a7d46bcde86c90e49284eb15');
  var b1 = JSBI.multiply(maybeJSBI$s.unaryMinus(_1n$1), JSBI.BigInt('0xe4437ed6010e88286f547fa90abfe4c3'));
  var a2 = JSBI.BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8');
  var b2 = a1;
  var c1 = divNearest(maybeJSBI$s.multiply(b2, k), n);
  var c2 = divNearest(maybeJSBI$s.multiply(maybeJSBI$s.unaryMinus(b1), k), n);
  var k1 = mod(maybeJSBI$s.subtract(maybeJSBI$s.subtract(k, maybeJSBI$s.multiply(c1, a1)), maybeJSBI$s.multiply(c2, a2)), n);
  var k2 = mod(maybeJSBI$s.subtract(maybeJSBI$s.multiply(maybeJSBI$s.unaryMinus(c1), b1), maybeJSBI$s.multiply(c2, b2)), n);
  var k1neg = maybeJSBI$s.greaterThan(k1, POW_2_128);
  var k2neg = maybeJSBI$s.greaterThan(k2, POW_2_128);
  if (k1neg) k1 = maybeJSBI$s.subtract(n, k1);
  if (k2neg) k2 = maybeJSBI$s.subtract(n, k2);

  if (maybeJSBI$s.greaterThan(k1, POW_2_128) || maybeJSBI$s.greaterThan(k2, POW_2_128)) {
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
  if (maybeJSBI$s.greaterThanOrEqual(h, n)) h = maybeJSBI$s.subtract(h, n);
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
  return maybeJSBI$s.lessThan(_0n$1, num) && maybeJSBI$s.lessThan(num, CURVE.n);
}

function isValidFieldElement(num) {
  return maybeJSBI$s.lessThan(_0n$1, num) && maybeJSBI$s.lessThan(num, CURVE.P);
}

function kmdToSig(kBytes, m, d) {
  var k = bytesToNumber(kBytes);
  if (!isWithinCurveOrder(k)) return;
  var n = CURVE.n;
  var q = Point.BASE.multiply(k);
  var r = mod(q.x, n);
  if (maybeJSBI$s.equal(r, _0n$1)) return;
  var s = mod(maybeJSBI$s.multiply(invert(k, n), mod(maybeJSBI$s.add(m, maybeJSBI$s.multiply(d, r)), n)), n);
  if (maybeJSBI$s.equal(s, _0n$1)) return;
  var sig = new Signature(r, s);
  var recovery = (maybeJSBI$s.equal(q.x, sig.r) ? 0 : 2) | maybeJSBI$s.toNumber(maybeJSBI$s.bitwiseAnd(q.y, _1n$1));
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
  return int2octets(maybeJSBI$s.lessThan(z2, _0n$1) ? z1 : z2);
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
    if (maybeJSBI$s.equal(extraEntropy, true)) extraEntropy = utils.randomBytes(32);
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
    if (maybeJSBI$s.equal(num, _0n$1) || maybeJSBI$s.equal(num, _1n$1)) throw new Error('Invalid private key');
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
    var cached = maybeJSBI$s.equal(point, Point.BASE) ? point : new Point(point.x, point.y);

    cached._setWindowSize(windowSize);

    cached.multiply(_3n);
    return cached;
  }
};

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
var u32$1 = function u32(arr) {
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
  return Object.prototype.toString.call(obj) === '[object Object]' && maybeJSBI$r.equal(obj.constructor, Object);
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

    pad.set(maybeJSBI$q.greaterThan(key.length, _this.iHash.blockLen) ? hash.create().update(key).digest() : key);

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
      if (!(out instanceof Uint8Array) || maybeJSBI$q.notEqual(out.length, this.outputLen)) throw new Error('HMAC: Invalid output buffer');
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

function setBigUint64(view, byteOffset, value, isLE) {
  if (typeof view.setBigUint64 === 'function') return view.setBigUint64(byteOffset, value, isLE);

  var _32n = JSBI.BigInt(32);

  var _u32_max = JSBI.BigInt(0xffffffff);

  var wh = maybeJSBI$p.toNumber(maybeJSBI$p.bitwiseAnd(maybeJSBI$p.signedRightShift(value, _32n), _u32_max));
  var wl = maybeJSBI$p.toNumber(maybeJSBI$p.bitwiseAnd(value, _u32_max));
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
        var take = Math.min(maybeJSBI$p.subtract(blockLen, this.pos), len - pos); // Fast path: we have at least one block in input, cast it to view and process

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

        if (maybeJSBI$p.equal(this.pos, blockLen)) {
          this.process(view, 0);
          this.pos = 0;
        }
      }

      _x = this, _y = "length", _x[_y] = maybeJSBI$p.add(_x[_y], data.length);
      this.roundClean();
      return this;
    }
  }, {
    key: "digestInto",
    value: function digestInto(out) {
      var _x2;

      if (this.destroyed) throw new Error('instance is destroyed');
      if (!(out instanceof Uint8Array) || maybeJSBI$p.lessThan(out.length, this.outputLen)) throw new Error('_Sha2: Invalid output buffer');
      if (this.finished) throw new Error('digest() was already called');
      this.finished = true; // Padding
      // We can avoid allocation of buffer for padding completely if it
      // was previously not allocated here. But it won't change performance.

      var buffer = this.buffer,
          view = this.view,
          blockLen = this.blockLen,
          isLE = this.isLE;
      var pos = this.pos; // append the bit '1' to the message

      buffer[(_x2 = pos, pos = maybeJSBI$p.add(pos, maybeJSBI$p.BigInt(1)), _x2)] = 128;
      this.buffer.subarray(pos).fill(0); // we have less than padOffset left in buffer, so we cannot put length in current block, need process it and pad again

      if (maybeJSBI$p.greaterThan(this.padOffset, maybeJSBI$p.subtract(blockLen, pos))) {
        this.process(view, 0);
        pos = 0;
      } // Pad until full block byte with zeros


      for (var i = pos; maybeJSBI$p.lessThan(i, blockLen); _x3 = i, i = maybeJSBI$p.add(i, maybeJSBI$p.BigInt(1)), _x3) {
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
      if (maybeJSBI$p.remainder(length, blockLen)) to.buffer.set(buffer);
      return to;
    }
  }]);

  return SHA2;
}(Hash);

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

var Chi = function Chi(a, b, c) {
  return maybeJSBI$o.bitwiseXor(maybeJSBI$o.bitwiseAnd(a, b), maybeJSBI$o.bitwiseAnd(maybeJSBI$o.bitwiseNot(a), c));
}; // Majority function, true if any two inpust is true


var Maj = function Maj(a, b, c) {
  return maybeJSBI$o.bitwiseXor(maybeJSBI$o.bitwiseXor(maybeJSBI$o.bitwiseAnd(a, b), maybeJSBI$o.bitwiseAnd(a, c)), maybeJSBI$o.bitwiseAnd(b, c));
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
        var s0 = maybeJSBI$o.bitwiseXor(rotr(W15, 7), rotr(W15, 18)) ^ W15 >>> 3;
        var s1 = maybeJSBI$o.bitwiseXor(rotr(W2, 17), rotr(W2, 19)) ^ W2 >>> 10;
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
        var sigma1 = maybeJSBI$o.bitwiseXor(maybeJSBI$o.bitwiseXor(rotr(E, 6), rotr(E, 11)), rotr(E, 25));
        var T1 = maybeJSBI$o.add(maybeJSBI$o.add(maybeJSBI$o.add(maybeJSBI$o.add(H, sigma1), Chi(E, F, G)), SHA256_K[_i2]), SHA256_W[_i2]) | 0;
        var sigma0 = maybeJSBI$o.bitwiseXor(maybeJSBI$o.bitwiseXor(rotr(A, 2), rotr(A, 13)), rotr(A, 22));
        var T2 = maybeJSBI$o.add(sigma0, Maj(A, B, C)) | 0;
        H = G;
        G = F;
        F = E;
        E = D + T1 | 0;
        D = C;
        C = B;
        B = A;
        A = T1 + T2 | 0;
      } // Add the compressed chunk to the current hash value


      A = maybeJSBI$o.add(A, this.A) | 0;
      B = maybeJSBI$o.add(B, this.B) | 0;
      C = maybeJSBI$o.add(C, this.C) | 0;
      D = maybeJSBI$o.add(D, this.D) | 0;
      E = maybeJSBI$o.add(E, this.E) | 0;
      F = maybeJSBI$o.add(F, this.F) | 0;
      G = maybeJSBI$o.add(G, this.G) | 0;
      H = maybeJSBI$o.add(H, this.H) | 0;
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
var U32_MASK64 = JSBI.BigInt(2 ** 32 - 1);

var _32n$1 = JSBI.BigInt(32);

function fromBig(n) {
  var le = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  if (le) return {
    h: maybeJSBI$n.toNumber(maybeJSBI$n.bitwiseAnd(n, U32_MASK64)),
    l: maybeJSBI$n.toNumber(maybeJSBI$n.bitwiseAnd(maybeJSBI$n.signedRightShift(n, _32n$1), U32_MASK64))
  };
  return {
    h: maybeJSBI$n.toNumber(maybeJSBI$n.bitwiseAnd(maybeJSBI$n.signedRightShift(n, _32n$1), U32_MASK64)) | 0,
    l: maybeJSBI$n.toNumber(maybeJSBI$n.bitwiseAnd(n, U32_MASK64)) | 0
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
  return maybeJSBI$n.leftShift(h, s) | l >>> 32 - s;
};
var rotlSL = function rotlSL(h, l, s) {
  return maybeJSBI$n.leftShift(l, s) | h >>> 32 - s;
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
    h: maybeJSBI$n.add(Ah, Bh) + (l / 2 ** 32 | 0) | 0,
    l: l | 0
  };
} // Addition with more than 2 elements

var add3L = function add3L(Al, Bl, Cl) {
  return (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
};
var add3H = function add3H(low, Ah, Bh, Ch) {
  return maybeJSBI$n.add(maybeJSBI$n.add(Ah, Bh), Ch) + (low / 2 ** 32 | 0) | 0;
};
var add4L = function add4L(Al, Bl, Cl, Dl) {
  return (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
};
var add4H = function add4H(low, Ah, Bh, Ch, Dh) {
  return maybeJSBI$n.add(maybeJSBI$n.add(maybeJSBI$n.add(Ah, Bh), Ch), Dh) + (low / 2 ** 32 | 0) | 0;
};
var add5L = function add5L(Al, Bl, Cl, Dl, El) {
  return (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
};
var add5H = function add5H(low, Ah, Bh, Ch, Dh, Eh) {
  return maybeJSBI$n.add(maybeJSBI$n.add(maybeJSBI$n.add(maybeJSBI$n.add(Ah, Bh), Ch), Dh), Eh) + (low / 2 ** 32 | 0) | 0;
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
        var s0h = maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseXor(rotrSH(W15h, W15l, 1), rotrSH(W15h, W15l, 8)), shrSH(W15h, W15l, 7));
        var s0l = maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseXor(rotrSL(W15h, W15l, 1), rotrSL(W15h, W15l, 8)), shrSL(W15h, W15l, 7)); // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)

        var W2h = SHA512_W_H[_i - 2] | 0;
        var W2l = SHA512_W_L[_i - 2] | 0;
        var s1h = maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseXor(rotrSH(W2h, W2l, 19), rotrBH(W2h, W2l, 61)), shrSH(W2h, W2l, 6));
        var s1l = maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseXor(rotrSL(W2h, W2l, 19), rotrBL(W2h, W2l, 61)), shrSL(W2h, W2l, 6)); // SHA256_W[i] = s0 + s1 + SHA256_W[i - 7] + SHA256_W[i - 16];

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
        var sigma1h = maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseXor(rotrSH(Eh, El, 14), rotrSH(Eh, El, 18)), rotrBH(Eh, El, 41));
        var sigma1l = maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseXor(rotrSL(Eh, El, 14), rotrSL(Eh, El, 18)), rotrBL(Eh, El, 41)); //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;

        var CHIh = maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseAnd(Eh, Fh), maybeJSBI$m.bitwiseAnd(maybeJSBI$m.bitwiseNot(Eh), Gh));
        var CHIl = maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseAnd(El, Fl), maybeJSBI$m.bitwiseAnd(maybeJSBI$m.bitwiseNot(El), Gl)); // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
        // prettier-ignore

        var T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[_i2], SHA512_W_L[_i2]);
        var T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[_i2], SHA512_W_H[_i2]);
        var T1l = T1ll | 0; // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)

        var sigma0h = maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseXor(rotrSH(Ah, Al, 28), rotrBH(Ah, Al, 34)), rotrBH(Ah, Al, 39));
        var sigma0l = maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseXor(rotrSL(Ah, Al, 28), rotrBL(Ah, Al, 34)), rotrBL(Ah, Al, 39));
        var MAJh = maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseAnd(Ah, Bh), maybeJSBI$m.bitwiseAnd(Ah, Ch)), maybeJSBI$m.bitwiseAnd(Bh, Ch));
        var MAJl = maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseXor(maybeJSBI$m.bitwiseAnd(Al, Bl), maybeJSBI$m.bitwiseAnd(Al, Cl)), maybeJSBI$m.bitwiseAnd(Bl, Cl));
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
  if (__bridge.cachegetInt32 === null || maybeJSBI$l.notEqual(__bridge.cachegetInt32.buffer, __bridge.wasm.memory.buffer)) {
    __bridge.cachegetInt32 = new Int32Array(__bridge.wasm.memory.buffer);
  }

  return __bridge.cachegetInt32;
}
function getUint8() {
  if (__bridge.cachegetUint8 === null || maybeJSBI$l.notEqual(__bridge.cachegetUint8.buffer, __bridge.wasm.memory.buffer)) {
    __bridge.cachegetUint8 = new Uint8Array(__bridge.wasm.memory.buffer);
  }

  return __bridge.cachegetUint8;
}
function getU8a(ptr, len) {
  return getUint8().subarray(ptr / 1, ptr / 1 + len);
}
function getString(ptr, len) {
  return u8aToString(getU8a(ptr, len));
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
function resultString() {
  return u8aToString(resultU8a());
}

// SPDX-License-Identifier: Apache-2.0
// Generated as part of the build, do not edit

var sizeCompressed = 171464;
var sizeUncompressed = 340174;
var bytes = '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';
var bytes_1 = {
  bytes: bytes,
  sizeCompressed: sizeCompressed,
  sizeUncompressed: sizeUncompressed
};

// Copyright 2019-2022 @polkadot/wasm-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
var chars$1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64Decode$1(data) {
  var bytes = [];
  var _byte = 0;
  var bits = 0;

  for (var i = 0; i < data.length && data[i] !== '='; i++) {
    // each character represents 6 bits
    _byte = _byte << 6 | chars$1.indexOf(data[i]); // each byte needs to contain 8 bits

    if ((bits += 6) >= 8) {
      bytes.push(_byte >>> (bits -= 8) & 0xff);
    }
  }

  return Uint8Array.from(bytes);
}

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
// Copyright 2019-2022 @polkadot/wasm-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
// MIT License
//
// Copyright (c) 2020 Arjun Barrett
//
// Copied from https://github.com/101arrowz/fflate/blob/73c737941ec89d85cdf0ad39ee6f26c5fdc95fd7/src/index.ts
// This only contains the unzlibSync function, no compression, no async, no workers
//
// These 2 issues are addressed as a short-term, stop-gap solution
//   - https://github.com/polkadot-js/api/issues/2963
//   - https://github.com/101arrowz/fflate/issues/17
//
// Only tweaks make here are some TS adjustments (we use strict null checks), the code is otherwise as-is with
// only the single required function provided (compression is still being done in the build with fflate)

/* eslint-disable */
// inflate state
// aliases for shorter compressed code (most minifers don't do this)
var u8 = Uint8Array,
    u16 = Uint16Array,
    u32 = Uint32Array; // code length index map

var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]); // fixed length extra bits

var fleb = new u8([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
/* unused */
0, 0,
/* impossible */
0]); // fixed distance extra bits
// see fleb note

var fdeb = new u8([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
/* unused */
0, 0]); // get base, reverse index map from extra bits

var freb = function freb(eb, start) {
  var b = new u16(31);

  for (var i = 0; i < 31; ++i) {
    b[i] = start += 1 << eb[i - 1];
  } // numbers here are at max 18 bits


  var r = new u32(b[30]);

  for (var _i = 1; _i < 30; ++_i) {
    for (var j = b[_i]; maybeJSBI$k.lessThan(j, b[_i + 1]); j = maybeJSBI$k.add(j, maybeJSBI$k.BigInt(1))) {
      r[j] = maybeJSBI$k.subtract(j, b[_i]) << 5 | _i;
    }
  }

  return [b, r];
};

var _freb = freb(fleb, 2),
    _freb2 = _slicedToArray(_freb, 2),
    fl = _freb2[0],
    revfl = _freb2[1]; // we can ignore the fact that the other numbers are wrong; they never happen anyway


fl[28] = 258, revfl[258] = 28;

var _freb3 = freb(fdeb, 0),
    _freb4 = _slicedToArray(_freb3, 1),
    fd = _freb4[0]; // map of value to reverse (assuming 16 bits)


var rev = new u16(32768);

for (var i = 0; i < 32768; ++i) {
  // reverse table algorithm from SO
  var x$1 = (i & 0xAAAA) >>> 1 | (i & 0x5555) << 1;
  x$1 = (x$1 & 0xCCCC) >>> 2 | (x$1 & 0x3333) << 2;
  x$1 = (x$1 & 0xF0F0) >>> 4 | (x$1 & 0x0F0F) << 4;
  rev[i] = ((x$1 & 0xFF00) >>> 8 | (x$1 & 0x00FF) << 8) >>> 1;
} // create huffman tree from u8 "map": index -> code length for code index
// mb (max bits) must be at most 15
// TODO: optimize/split up?


var hMap = function hMap(cd, mb, r) {
  var s = cd.length; // index

  var i = 0; // u16 "map": index -> # of codes with bit length = index

  var l = new u16(mb); // length of cd must be 288 (total # of codes)

  for (; i < s; ++i) {
    var _x, _y;

    _x = l, _y = cd[i] - 1, _x[_y] = maybeJSBI$k.add(_x[_y], maybeJSBI$k.BigInt(1));
  } // u16 "map": index -> minimum code for bit length = index


  var le = new u16(mb);

  for (i = 0; i < mb; ++i) {
    le[i] = maybeJSBI$k.add(le[i - 1], l[i - 1]) << 1;
  }

  var co;

  if (r) {
    // u16 "map": index -> number of actual bits, symbol for code
    co = new u16(1 << mb); // bits to remove for reverser

    var rvb = 15 - mb;

    for (i = 0; i < s; ++i) {
      // ignore 0 lengths
      if (cd[i]) {
        var _x2, _y2, _z;

        // num encoding both symbol and bits read
        var sv = i << 4 | cd[i]; // free bits

        var _r = maybeJSBI$k.subtract(mb, cd[i]); // start value


        var v = maybeJSBI$k.leftShift((_x2 = le, _y2 = cd[i] - 1, _z = _x2[_y2], _x2[_y2] = maybeJSBI$k.add(_z, maybeJSBI$k.BigInt(1)), _z), _r); // m is end value

        for (var m = v | (1 << _r) - 1; v <= m; v = maybeJSBI$k.add(v, maybeJSBI$k.BigInt(1))) {
          // every 16 bit value starting with the code yields the same result
          co[rev[v] >>> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);

    for (i = 0; i < s; ++i) {
      var _x3, _y3, _z2;

      co[i] = rev[(_x3 = le, _y3 = cd[i] - 1, _z2 = _x3[_y3], _x3[_y3] = maybeJSBI$k.add(_z2, maybeJSBI$k.BigInt(1)), _z2)] >>> 15 - cd[i];
    }
  }

  return co;
}; // fixed length tree


var flt = new u8(288);

for (var _i2 = 0; _i2 < 144; ++_i2) {
  flt[_i2] = 8;
}

for (var _i3 = 144; _i3 < 256; ++_i3) {
  flt[_i3] = 9;
}

for (var _i4 = 256; _i4 < 280; ++_i4) {
  flt[_i4] = 7;
}

for (var _i5 = 280; _i5 < 288; ++_i5) {
  flt[_i5] = 8;
} // fixed distance tree


var fdt = new u8(32);

for (var _i6 = 0; _i6 < 32; ++_i6) {
  fdt[_i6] = 5;
} // fixed length map


var flrm = hMap(flt, 9, 1); // fixed distance map

var fdrm = hMap(fdt, 5, 1); // read d, starting at bit p and mask with m

var bits = function bits(d, p, m) {
  var o = p >>> 3;
  return (d[o] | d[o + 1] << 8) >>> (p & 7) & m;
}; // read d, starting at bit p continuing for at least 16 bits


var bits16 = function bits16(d, p) {
  var o = p >>> 3;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >>> (p & 7);
}; // get end of byte


var shft = function shft(p) {
  return (p >>> 3) + (p & 7 && 1);
}; // typed array slice - allows garbage collector to free original reference,
// while being more compatible than .slice


var slc = function slc(v, s, e) {
  if (s == null || s < 0) s = 0;
  if (e == null || maybeJSBI$k.greaterThan(e, v.length)) e = v.length; // can't use .constructor in case user-supplied

  var n = new (v instanceof u16 ? u16 : v instanceof u32 ? u32 : u8)(maybeJSBI$k.subtract(e, s));
  n.set(v.subarray(s, e));
  return n;
}; // find max of array


var max = function max(a) {
  var m = a[0];

  for (var _i7 = 1; _i7 < a.length; ++_i7) {
    if (maybeJSBI$k.greaterThan(a[_i7], m)) m = a[_i7];
  }

  return m;
}; // expands raw DEFLATE data


var inflt = function inflt(dat, buf, st) {
  var noSt = !st || st.i;
  if (!st) st = {}; // source length

  var sl = dat.length; // have to estimate size

  var noBuf = !buf || !noSt; // Assumes roughly 33% compression ratio average

  if (!buf) buf = new u8(sl * 3); // ensure buffer can fit at least l elements

  var cbuf = function cbuf(l) {
    var bl = buf.length; // need to increase size to fit

    if (maybeJSBI$k.greaterThan(l, bl)) {
      // Double or set to necessary, whichever is greater
      var nbuf = new u8(Math.max(bl << 1, l));
      nbuf.set(buf);
      buf = nbuf;
    }
  }; //  last chunk         bitpos           bytes


  var _final = st.f || 0,
      pos = st.p || 0,
      bt = st.b || 0,
      lm = st.l,
      dm = st.d,
      lbt = st.m,
      dbt = st.n;

  if (_final && !lm) return buf; // total bits

  var tbts = sl << 3;

  do {
    if (!lm) {
      // BFINAL - this is only 1 when last chunk is next
      st.f = _final = bits(dat, pos, 1); // type: 0 = no compression, 1 = fixed huffman, 2 = dynamic huffman

      var type = bits(dat, pos + 1, 3);
      pos += 3;

      if (!type) {
        // go to end of byte boundary
        var s = shft(pos) + 4,
            l = dat[s - 4] | dat[s - 3] << 8,
            t = s + l;

        if (t > sl) {
          if (noSt) throw 'unexpected EOF';
          break;
        } // ensure size


        if (noBuf) cbuf(bt + l); // Copy over uncompressed data

        buf.set(dat.subarray(s, t), bt); // Get new bitpos, update byte count

        st.b = bt += l, st.p = pos = t << 3;
        continue;
      } else if (type == 1) lm = flrm, dm = fdrm, lbt = 9, dbt = 5;else if (type == 2) {
        //  literal                            lengths
        var hLit = bits(dat, pos, 31) + 257,
            hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14; // length+distance tree

        var ldt = new u8(tl); // code length tree

        var clt = new u8(19);

        for (var _i8 = 0; _i8 < hcLen; ++_i8) {
          // use index map to get real code
          clt[clim[_i8]] = bits(dat, pos + _i8 * 3, 7);
        }

        pos += hcLen * 3; // code lengths bits

        var clb = max(clt),
            clbmsk = (1 << clb) - 1;
        if (!noSt && pos + tl * (clb + 7) > tbts) break; // code lengths map

        var clm = hMap(clt, clb, 1);

        for (var _i9 = 0; _i9 < tl;) {
          var r = clm[bits(dat, pos, clbmsk)]; // bits read

          pos += r & 15; // symbol

          var _s = r >>> 4; // code length to copy


          if (_s < 16) {
            ldt[_i9++] = _s;
          } else {
            //  copy   count
            var c = 0,
                n = 0;
            if (_s == 16) n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[_i9 - 1];else if (_s == 17) n = 3 + bits(dat, pos, 7), pos += 3;else if (_s == 18) n = 11 + bits(dat, pos, 127), pos += 7;

            while (n--) {
              ldt[_i9++] = c;
            }
          }
        } //    length tree                 distance tree


        var lt = ldt.subarray(0, hLit),
            dt = ldt.subarray(hLit); // max length bits

        lbt = max(lt); // max dist bits

        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else throw 'invalid block type';

      if (pos > tbts) throw 'unexpected EOF';
    } // Make sure the buffer can hold this + the largest possible addition
    // maximum chunk size (practically, theoretically infinite) is 2^17;


    if (noBuf) cbuf(bt + 131072);
    var lms = (1 << lbt) - 1,
        dms = (1 << dbt) - 1;
    var mxa = maybeJSBI$k.add(lbt, dbt) + 18;

    while (noSt || pos + mxa < tbts) {
      // bits read, code
      var _c = lm[bits16(dat, pos) & lms],
          sym = _c >>> 4;
      pos += _c & 15;
      if (pos > tbts) throw 'unexpected EOF';
      if (!_c) throw 'invalid length/literal';
      if (sym < 256) buf[bt++] = sym;else if (sym == 256) {
        lm = undefined;
        break;
      } else {
        var add = sym - 254; // no extra bits needed if less

        if (sym > 264) {
          // index
          var _i10 = sym - 257,
              b = fleb[_i10];

          add = maybeJSBI$k.add(bits(dat, pos, (1 << b) - 1), fl[_i10]);
          pos += b;
        } // dist


        var d = dm[bits16(dat, pos) & dms],
            dsym = d >>> 4;
        if (!d) throw 'invalid distance';
        pos += d & 15;
        var _dt = fd[dsym];

        if (dsym > 3) {
          var _b = fdeb[dsym];
          _dt += bits16(dat, pos) & (1 << _b) - 1, pos += _b;
        }

        if (pos > tbts) throw 'unexpected EOF';
        if (noBuf) cbuf(bt + 131072);
        var end = bt + add;

        for (; bt < end; bt += 4) {
          buf[bt] = buf[bt - _dt];
          buf[bt + 1] = buf[bt + 1 - _dt];
          buf[bt + 2] = buf[bt + 2 - _dt];
          buf[bt + 3] = buf[bt + 3 - _dt];
        }

        bt = end;
      }
    }

    st.l = lm, st.p = pos, st.b = bt;
    if (lm) _final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!_final);

  return bt == buf.length ? buf : slc(buf, 0, bt);
}; // zlib valid


var zlv = function zlv(d) {
  if ((d[0] & 15) != 8 || d[0] >>> 4 > 7 || (d[0] << 8 | d[1]) % 31) throw 'invalid zlib data';
  if (d[1] & 32) throw 'invalid zlib data: preset dictionaries not supported';
};
/**
 * Expands Zlib data
 * @param data The data to decompress
 * @param out Where to write the data. Saves memory if you know the decompressed size and provide an output buffer of that length.
 * @returns The decompressed version of the data
 */


function unzlibSync(data, out) {
  return inflt((zlv(data), data.subarray(2, -4)), out);
}

var wasmBytes = unzlibSync(base64Decode$1(bytes_1.bytes), new Uint8Array(bytes_1.sizeUncompressed));

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
var DEFAULT_CRYPTO = {
  getRandomValues: getRandomValues
};
var DEFAULT_SELF = {
  crypto: DEFAULT_CRYPTO
};
var heap = new Array(32).fill(undefined).concat(undefined, null, true, false);
var heapNext = heap.length;

function getObject(idx) {
  return heap[idx];
}

function dropObject(idx) {
  if (idx < 36) {
    return;
  }

  heap[idx] = heapNext;
  heapNext = idx;
}

function takeObject(idx) {
  var ret = getObject(idx);
  dropObject(idx);
  return ret;
}

function addObject(obj) {
  if (maybeJSBI$j.equal(heapNext, heap.length)) {
    heap.push(heap.length + 1);
  }

  var idx = heapNext;
  heapNext = heap[idx];
  heap[idx] = obj;
  return idx;
}

function __wbindgen_is_undefined(idx) {
  return getObject(idx) === undefined;
}
function __wbindgen_throw(ptr, len) {
  throw new Error(getString(ptr, len));
}
function __wbg_self_1b7a39e3a92c949c() {
  return addObject(DEFAULT_SELF);
}
function __wbg_require_604837428532a733(ptr, len) {
  throw new Error("Unable to require ".concat(getString(ptr, len)));
} // eslint-disable-next-line @typescript-eslint/no-unused-vars

function __wbg_crypto_968f1772287e2df0(_idx) {
  return addObject(DEFAULT_CRYPTO);
} // eslint-disable-next-line @typescript-eslint/no-unused-vars

function __wbg_getRandomValues_a3d34b4fee3c2869(_idx) {
  return addObject(DEFAULT_CRYPTO.getRandomValues);
} // eslint-disable-next-line @typescript-eslint/no-unused-vars

function __wbg_getRandomValues_f5e14ab7ac8e995d(_arg0, ptr, len) {
  DEFAULT_CRYPTO.getRandomValues(getU8a(ptr, len));
} // eslint-disable-next-line @typescript-eslint/no-unused-vars

function __wbg_randomFillSync_d5bd2d655fdf256a(_idx, _ptr, _len) {
  throw new Error('randomFillsync is not available'); // getObject(idx).randomFillSync(getU8a(ptr, len));
}
function __wbindgen_object_drop_ref(idx) {
  takeObject(idx);
}
function abort() {
  throw new Error('abort');
}

var wbg = /*#__PURE__*/Object.freeze({
  __proto__: null,
  __wbindgen_is_undefined: __wbindgen_is_undefined,
  __wbindgen_throw: __wbindgen_throw,
  __wbg_self_1b7a39e3a92c949c: __wbg_self_1b7a39e3a92c949c,
  __wbg_require_604837428532a733: __wbg_require_604837428532a733,
  __wbg_crypto_968f1772287e2df0: __wbg_crypto_968f1772287e2df0,
  __wbg_getRandomValues_a3d34b4fee3c2869: __wbg_getRandomValues_a3d34b4fee3c2869,
  __wbg_getRandomValues_f5e14ab7ac8e995d: __wbg_getRandomValues_f5e14ab7ac8e995d,
  __wbg_randomFillSync_d5bd2d655fdf256a: __wbg_randomFillSync_d5bd2d655fdf256a,
  __wbindgen_object_drop_ref: __wbindgen_object_drop_ref,
  abort: abort
});

function createPromise(_x, _x2) {
  return _createPromise.apply(this, arguments);
}

function _createPromise() {
  _createPromise = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(wasmBytes, asmFn) {
    var source;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            assert((typeof WebAssembly === "undefined" ? "undefined" : _typeof(WebAssembly)) === 'object' && typeof WebAssembly.instantiate === 'function' && wasmBytes && wasmBytes.length, 'WebAssembly is not available in your environment');
            _context.next = 4;
            return WebAssembly.instantiate(wasmBytes, {
              wbg: wbg
            });

          case 4:
            source = _context.sent;
            __bridge.wasm = source.instance.exports;
            _context.next = 11;
            break;

          case 8:
            _context.prev = 8;
            _context.t0 = _context["catch"](0);

            // if we have a valid supplied asm.js, return that
            if (asmFn) {
              __bridge.type = 'asm';
              __bridge.wasm = asmFn(wbg);
            } else {
              console.error("FATAL: Unable to initialize @polkadot/wasm-crypto:: ".concat(_context.t0.message));
              __bridge.wasm = null;
            }

          case 11:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, null, [[0, 8]]);
  }));
  return _createPromise.apply(this, arguments);
}

function setWasmPromise(wasmBytes, asmFn) {
  __bridge.wasmPromise = createPromise(wasmBytes, asmFn);
  return __bridge.wasmPromise;
}
function initWasm() {
  return setWasmPromise(wasmBytes, null);
}

var bip39Generate = withWasm(function (wasm, words) {
  wasm.ext_bip39_generate(8, words);
  return resultString();
});
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
var sr25519DerivePublicSoft = withWasm(function (wasm, pubkey, cc) {
  wasm.ext_sr_derive_public_soft.apply(wasm, [8].concat(_toConsumableArray(allocU8a(pubkey)), _toConsumableArray(allocU8a(cc))));
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
var sr25519Agree = withWasm(function (wasm, pubkey, secret) {
  wasm.ext_sr_agree.apply(wasm, [8].concat(_toConsumableArray(allocU8a(pubkey)), _toConsumableArray(allocU8a(secret))));
  return resultU8a();
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
var twox = withWasm(function (wasm, data, rounds) {
  wasm.ext_twox.apply(wasm, [8].concat(_toConsumableArray(allocU8a(data)), [rounds]));
  return resultU8a();
});
function isReady() {
  return !!getWasm();
}
function waitReady() {
  return _waitReady.apply(this, arguments);
}

function _waitReady() {
  _waitReady = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;

            if (!__bridge.wasmPromise) {
              if (!__bridge.wasmPromiseFn) {
                __bridge.wasmPromiseFn = initWasm;
              }

              __bridge.wasmPromise = __bridge.wasmPromiseFn();
            }

            _context.next = 4;
            return __bridge.wasmPromise;

          case 4:
            return _context.abrupt("return", isReady());

          case 7:
            _context.prev = 7;
            _context.t0 = _context["catch"](0);
            return _context.abrupt("return", false);

          case 10:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, null, [[0, 7]]);
  }));
  return _waitReady.apply(this, arguments);
}

var JS_HASH = {
  256: sha256$1,
  512: sha512$1
};
var WA_MHAC = {
  256: hmacSha256,
  512: hmacSha512
};

function createSha(bitLength) {
  return function (key, data, onlyJs) {
    return hmacShaAsU8a(key, data, bitLength, onlyJs);
  };
}
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
/**
 * @name hmacSha256AsU8a
 * @description creates a Hmac Sha256 Uint8Array from the key & data
 */

var hmacSha256AsU8a = createSha(256);
/**
 * @name hmacSha512AsU8a
 * @description creates a Hmac Sha512 Uint8Array from the key & data
 */

var hmacSha512AsU8a = createSha(512);

var base = {};

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
          if (i < 0 || maybeJSBI$i.greaterThanOrEqual(i, alphabet.length)) throw new Error("Digit index outside alphabet: ".concat(i, " (alphabet: ").concat(alphabet.length, ")"));
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

        while (maybeJSBI$i.multiply(data.length, bits) % 8) {
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
        if (maybeJSBI$i.multiply(end, bits) % 8) throw new Error('Invalid padding: string should have whole number of bytes');

        for (; end > 0 && maybeJSBI$i.equal(input[end - 1], chr); _x = end, end = maybeJSBI$i.subtract(end, maybeJSBI$i.BigInt(1)), _x) {
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
      if (d < 0 || maybeJSBI$i.greaterThanOrEqual(d, from)) throw new Error("Wrong integer: ".concat(d));
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
        if (!Number.isSafeInteger(digits[i]) || maybeJSBI$i.multiply(digits[i], to) + carry !== digitBase) throw new Error('convertRadix: carry overflow');
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
    return !b ? a : gcd(b, maybeJSBI$i.remainder(a, b));
  };

  var radix2carry = function radix2carry(from, to) {
    return maybeJSBI$i.add(from, maybeJSBI$i.subtract(to, gcd(from, to)));
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
        var res = new Uint8Array(maybeJSBI$i.add(data.length, len));
        res.set(data);
        res.set(checksum, data.length);
        return res;
      },
      decode: function decode(data) {
        if (!(data instanceof Uint8Array)) throw new Error('checksum.decode: input should be Uint8Array');
        var payload = data.slice(0, maybeJSBI$i.unaryMinus(len));
        var newChecksum = fn(payload).slice(0, len);
        var oldChecksum = data.slice(maybeJSBI$i.unaryMinus(len));

        for (var i = 0; i < len; i++) {
          if (maybeJSBI$i.notEqual(newChecksum[i], oldChecksum[i])) throw new Error('Invalid checksum');
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

        for (var j = 0; j < maybeJSBI$i.subtract(block.length, blockLen); j++) {
          if (block[j] !== 0) throw new Error('base58xmr: wrong padding');
        }

        res = res.concat(Array.from(block.slice(maybeJSBI$i.subtract(block.length, blockLen))));
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
      if (maybeJSBI$i.notEqual(limit, false) && actualLength > limit) throw new TypeError("Length ".concat(actualLength, " exceeds limit ").concat(limit));
      prefix = prefix.toLowerCase();
      return "".concat(prefix, "1").concat(BECH_ALPHABET.encode(words)).concat(bechChecksum(prefix, words, ENCODING_CONST));
    }

    function decode(str) {
      var limit = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 90;
      if (typeof str !== 'string') throw new Error("bech32.decode input should be string, not ".concat(_typeof(str)));
      if (str.length < 8 || maybeJSBI$i.notEqual(limit, false) && maybeJSBI$i.greaterThan(str.length, limit)) throw new TypeError("Wrong string length: ".concat(str.length, " (").concat(str, "). Expected (8..").concat(limit, ")"));
      var lowered = str.toLowerCase();
      if (maybeJSBI$i.notEqual(str, lowered) && maybeJSBI$i.notEqual(str, str.toUpperCase())) throw new Error("String must be lowercase or uppercase");
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
function createIs(validate) {
  return function (value, ipfsCompat) {
    try {
      return validate(value, ipfsCompat);
    } catch (error) {
      return false;
    }
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
      assert(maybeJSBI$h.equal(value[0], ipfs), function () {
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

var config$2 = {
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

var base58Validate = createValidate(config$2);
/**
 * @name base58Decode
 * @summary Decodes a base58 value.
 * @description
 * From the provided input, decode the base58 and return the result as an `Uint8Array`.
 */

var base58Decode = createDecode(config$2, base58Validate);
/**
* @name base58Encode
* @summary Creates a base58 value.
* @description
* From the provided input, create the base58 and return the result as a string.
*/

var base58Encode = createEncode(config$2);
/**
* @name isBase58
* @description Checks if the input is in base58, returning true/false
*/

var isBase58 = createIs(base58Validate);

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
    if (outputLen < 0 || maybeJSBI$g.greaterThan(outputLen, keyLen)) throw new Error('Blake2: outputLen bigger than keyLen');
    if (opts.key !== undefined && (opts.key.length < 1 || maybeJSBI$g.greaterThan(opts.key.length, keyLen))) throw new Error("Key should be up 1..".concat(keyLen, " byte long or undefined"));
    if (opts.salt !== undefined && maybeJSBI$g.notEqual(opts.salt.length, saltLen)) throw new Error("Salt should be ".concat(saltLen, " byte long or undefined"));
    if (opts.personalization !== undefined && maybeJSBI$g.notEqual(opts.personalization.length, persLen)) throw new Error("Personalization should be ".concat(persLen, " byte long or undefined"));
    _this.buffer32 = u32$1(_this.buffer = new Uint8Array(blockLen));
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
        if (maybeJSBI$g.equal(this.pos, blockLen)) {
          this.compress(buffer32, 0, false);
          this.pos = 0;
        }

        var take = Math.min(maybeJSBI$g.subtract(blockLen, this.pos), len - pos);
        var dataOffset = data.byteOffset + pos; // full block && aligned to 4 bytes && not last in input

        if (take === blockLen && !(dataOffset % 4) && pos + take < len) {
          var data32 = new Uint32Array(data.buffer, dataOffset, Math.floor((len - pos) / 4));

          for (var pos32 = 0; pos + blockLen < len; pos32 += buffer32.length, pos += blockLen) {
            var _x, _y;

            _x = this, _y = "length", _x[_y] = maybeJSBI$g.add(_x[_y], blockLen);
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
      if (!(out instanceof Uint8Array) || maybeJSBI$g.lessThan(out.length, this.outputLen)) throw new Error('_Blake2: Invalid output buffer');
      var finished = this.finished,
          pos = this.pos,
          buffer32 = this.buffer32;
      if (finished) throw new Error('digest() was already called');
      this.finished = true; // Padding

      this.buffer.subarray(pos).fill(0);
      this.compress(buffer32, 0, true);
      var out32 = u32$1(out);
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
    Dh: maybeJSBI$f.bitwiseXor(Dh, Ah),
    Dl: maybeJSBI$f.bitwiseXor(Dl, Al)
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
    Bh: maybeJSBI$f.bitwiseXor(Bh, Ch),
    Bl: maybeJSBI$f.bitwiseXor(Bl, Cl)
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
    Dh: maybeJSBI$f.bitwiseXor(Dh, Ah),
    Dl: maybeJSBI$f.bitwiseXor(Dl, Al)
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
    Bh: maybeJSBI$f.bitwiseXor(Bh, Ch),
    Bl: maybeJSBI$f.bitwiseXor(Bl, Cl)
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

      var salt = u32$1(toBytes(opts.salt));
      _x = _this, _y = "v4l", _x[_y] = maybeJSBI$f.bitwiseXor(_x[_y], salt[0]);
      _x2 = _this, _y2 = "v4h", _x2[_y2] = maybeJSBI$f.bitwiseXor(_x2[_y2], salt[1]);
      _x3 = _this, _y3 = "v5l", _x3[_y3] = maybeJSBI$f.bitwiseXor(_x3[_y3], salt[2]);
      _x4 = _this, _y4 = "v5h", _x4[_y4] = maybeJSBI$f.bitwiseXor(_x4[_y4], salt[3]);
    }

    if (opts.personalization) {
      var _x5, _y5, _x6, _y6, _x7, _y7, _x8, _y8;

      var pers = u32$1(toBytes(opts.personalization));
      _x5 = _this, _y5 = "v6l", _x5[_y5] = maybeJSBI$f.bitwiseXor(_x5[_y5], pers[0]);
      _x6 = _this, _y6 = "v6h", _x6[_y6] = maybeJSBI$f.bitwiseXor(_x6[_y6], pers[1]);
      _x7 = _this, _y7 = "v7l", _x7[_y7] = maybeJSBI$f.bitwiseXor(_x7[_y7], pers[2]);
      _x8 = _this, _y8 = "v7h", _x8[_y8] = maybeJSBI$f.bitwiseXor(_x8[_y8], pers[3]);
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

      BUF[24] = maybeJSBI$f.bitwiseXor(IV[8], l); // Low word of the offset.

      BUF[25] = maybeJSBI$f.bitwiseXor(IV[9], h); // High word.
      // Invert all bits for last block

      if (isLast) {
        BUF[28] = maybeJSBI$f.bitwiseNot(BUF[28]);
        BUF[29] = maybeJSBI$f.bitwiseNot(BUF[29]);
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

      _x9 = this, _y9 = "v0l", _x9[_y9] = maybeJSBI$f.bitwiseXor(_x9[_y9], maybeJSBI$f.bitwiseXor(BUF[0], BUF[16]));
      _x10 = this, _y10 = "v0h", _x10[_y10] = maybeJSBI$f.bitwiseXor(_x10[_y10], maybeJSBI$f.bitwiseXor(BUF[1], BUF[17]));
      _x11 = this, _y11 = "v1l", _x11[_y11] = maybeJSBI$f.bitwiseXor(_x11[_y11], maybeJSBI$f.bitwiseXor(BUF[2], BUF[18]));
      _x12 = this, _y12 = "v1h", _x12[_y12] = maybeJSBI$f.bitwiseXor(_x12[_y12], maybeJSBI$f.bitwiseXor(BUF[3], BUF[19]));
      _x13 = this, _y13 = "v2l", _x13[_y13] = maybeJSBI$f.bitwiseXor(_x13[_y13], maybeJSBI$f.bitwiseXor(BUF[4], BUF[20]));
      _x14 = this, _y14 = "v2h", _x14[_y14] = maybeJSBI$f.bitwiseXor(_x14[_y14], maybeJSBI$f.bitwiseXor(BUF[5], BUF[21]));
      _x15 = this, _y15 = "v3l", _x15[_y15] = maybeJSBI$f.bitwiseXor(_x15[_y15], maybeJSBI$f.bitwiseXor(BUF[6], BUF[22]));
      _x16 = this, _y16 = "v3h", _x16[_y16] = maybeJSBI$f.bitwiseXor(_x16[_y16], maybeJSBI$f.bitwiseXor(BUF[7], BUF[23]));
      _x17 = this, _y17 = "v4l", _x17[_y17] = maybeJSBI$f.bitwiseXor(_x17[_y17], maybeJSBI$f.bitwiseXor(BUF[8], BUF[24]));
      _x18 = this, _y18 = "v4h", _x18[_y18] = maybeJSBI$f.bitwiseXor(_x18[_y18], maybeJSBI$f.bitwiseXor(BUF[9], BUF[25]));
      _x19 = this, _y19 = "v5l", _x19[_y19] = maybeJSBI$f.bitwiseXor(_x19[_y19], maybeJSBI$f.bitwiseXor(BUF[10], BUF[26]));
      _x20 = this, _y20 = "v5h", _x20[_y20] = maybeJSBI$f.bitwiseXor(_x20[_y20], maybeJSBI$f.bitwiseXor(BUF[11], BUF[27]));
      _x21 = this, _y21 = "v6l", _x21[_y21] = maybeJSBI$f.bitwiseXor(_x21[_y21], maybeJSBI$f.bitwiseXor(BUF[12], BUF[28]));
      _x22 = this, _y22 = "v6h", _x22[_y22] = maybeJSBI$f.bitwiseXor(_x22[_y22], maybeJSBI$f.bitwiseXor(BUF[13], BUF[29]));
      _x23 = this, _y23 = "v7l", _x23[_y23] = maybeJSBI$f.bitwiseXor(_x23[_y23], maybeJSBI$f.bitwiseXor(BUF[14], BUF[30]));
      _x24 = this, _y24 = "v7h", _x24[_y24] = maybeJSBI$f.bitwiseXor(_x24[_y24], maybeJSBI$f.bitwiseXor(BUF[15], BUF[31]));
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any

function createAsHex(fn) {
  return function () {
    return u8aToHex(fn.apply(void 0, arguments));
  };
}
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
/**
 * @name blake2AsHex
 * @description Creates a blake2b hex from the input.
 */

var blake2AsHex = createAsHex(blake2AsU8a);

var SS58_PREFIX = stringToU8a('SS58PRE');
function sshash(key) {
  return blake2AsU8a(u8aConcat(SS58_PREFIX, key), 512);
}

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
function checkAddressChecksum(decoded) {
  var ss58Length = decoded[0] & 64 ? 2 : 1;
  var ss58Decoded = ss58Length === 1 ? decoded[0] : (decoded[0] & 63) << 2 | decoded[1] >> 6 | (decoded[1] & 63) << 8; // 32/33 bytes public + 2 bytes checksum + prefix

  var isPublicKey = [34 + ss58Length, 35 + ss58Length].includes(decoded.length);
  var length = decoded.length - (isPublicKey ? 2 : 1); // calculate the hash and do the checksum byte checks

  var hash = sshash(decoded.subarray(0, length));
  var isValid = (decoded[0] & 128) === 0 && ![46, 47].includes(decoded[0]) && (isPublicKey ? maybeJSBI$e.equal(decoded[decoded.length - 2], hash[0]) && maybeJSBI$e.equal(decoded[decoded.length - 1], hash[1]) : maybeJSBI$e.equal(decoded[decoded.length - 1], hash[0]));
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
  return maybeJSBI$d.equal(isUnSortedA, isUnSortedB) ? isUnSortedA ? 0 : a.displayName.localeCompare(b.displayName) : isUnSortedA ? -1 : 1;
} // This is all the Substrate networks with our additional information


var allNetworks = knownSubstrate.map(toExpanded); // The list of available/claimed prefixes
//   - no testnets
//   - we only include those where we have a standardAccount
//   - sort by name, however we keep 0, 2, 42 first in the list

var availableNetworks = allNetworks.filter(filterAvailable).sort(sortNetworks); // A filtered list of those chains we have details about (genesisHashes)

var selectableNetworks = availableNetworks.filter(filterSelectable);

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

/**
 * @name addressToEvm
 * @summary Converts an SS58 address to its corresponding EVM address.
 */

function addressToEvm(address, ignoreChecksum) {
  var decoded = decodeAddress(address, ignoreChecksum);
  return decoded.subarray(0, 20);
}

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
/**
 * @name checkAddress
 * @summary Validates an ss58 address.
 * @description
 * From the provided input, validate that the address is a valid input.
 */

function checkAddress(address, prefix) {
  var decoded;

  try {
    decoded = base58Decode(address);
  } catch (error) {
    return [false, error.message];
  }

  var _checkAddressChecksum = checkAddressChecksum(decoded),
      _checkAddressChecksum2 = _slicedToArray(_checkAddressChecksum, 4),
      isValid = _checkAddressChecksum2[0],
      ss58Decoded = _checkAddressChecksum2[3];

  if (maybeJSBI$c.notEqual(ss58Decoded, prefix)) {
    return [false, "Prefix mismatch, expected ".concat(prefix, ", found ").concat(ss58Decoded)];
  } else if (!defaults.allowedEncodedLengths.includes(decoded.length)) {
    return [false, 'Invalid decoded address length'];
  }

  return [isValid, isValid ? null : 'Invalid decoded address checksum'];
}

// Copyright 2017-2022 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
var BN_BE_OPTS = {
  isLe: false
};
var BN_LE_OPTS = {
  isLe: true
};
var BN_LE_16_OPTS = {
  bitLength: 16,
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
var BN_LE_512_OPTS = {
  bitLength: 512,
  isLe: true
};

function addressToU8a(who) {
  return decodeAddress(who);
}

var PREFIX$1 = stringToU8a('modlpy/utilisuba');
function createKeyMulti(who, threshold) {
  return blake2AsU8a(u8aConcat.apply(void 0, [PREFIX$1, compactToU8a(who.length)].concat(_toConsumableArray(u8aSorted(who.map(addressToU8a))), [bnToU8a(threshold, BN_LE_16_OPTS)])));
}

var PREFIX = stringToU8a('modlpy/utilisuba');
function createKeyDerived(who, index) {
  return blake2AsU8a(u8aConcat(PREFIX, decodeAddress(who), bnToU8a(index, BN_LE_16_OPTS)));
}

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

(function (module) {
  (function (nacl) {
    // Public domain.
    //
    // Implementation derived from TweetNaCl version 20140427.
    // See for details: http://tweetnacl.cr.yp.to/

    var gf = function gf(init) {
      var i,
          r = new Float64Array(16);
      if (init) for (i = 0; maybeJSBI$b.lessThan(i, init.length); _x = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x) {
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

      for (i = 0; maybeJSBI$b.lessThan(i, n); _x2 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x2) {
        var _x2;

        d |= maybeJSBI$b.bitwiseXor(x[maybeJSBI$b.add(xi, i)], y[maybeJSBI$b.add(yi, i)]);
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

      for (i = 0; i < 16; _x3 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x3) {
        var _x3;

        z[i] = 0;
      }

      for (i = 0; i < 8; _x4 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x4) {
        var _x4;

        z[i] = n[i];
      }

      while (b >= 64) {
        crypto_core_salsa20(x, z, k, sigma);

        for (i = 0; i < 64; _x5 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x5) {
          var _x5;

          c[maybeJSBI$b.add(cpos, i)] = maybeJSBI$b.bitwiseXor(m[maybeJSBI$b.add(mpos, i)], x[i]);
        }

        u = 1;

        for (i = 8; i < 16; _x6 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x6) {
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

        for (i = 0; maybeJSBI$b.lessThan(i, b); _x7 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x7) {
          var _x7;

          c[maybeJSBI$b.add(cpos, i)] = maybeJSBI$b.bitwiseXor(m[maybeJSBI$b.add(mpos, i)], x[i]);
        }
      }

      return 0;
    }

    function crypto_stream_salsa20(c, cpos, b, n, k) {
      var z = new Uint8Array(16),
          x = new Uint8Array(64);
      var u, i;

      for (i = 0; i < 16; _x8 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x8) {
        var _x8;

        z[i] = 0;
      }

      for (i = 0; i < 8; _x9 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x9) {
        var _x9;

        z[i] = n[i];
      }

      while (b >= 64) {
        crypto_core_salsa20(x, z, k, sigma);

        for (i = 0; i < 64; _x10 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x10) {
          var _x10;

          c[maybeJSBI$b.add(cpos, i)] = x[i];
        }

        u = 1;

        for (i = 8; i < 16; _x11 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x11) {
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

        for (i = 0; maybeJSBI$b.lessThan(i, b); _x12 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x12) {
          var _x12;

          c[maybeJSBI$b.add(cpos, i)] = x[i];
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
        d0 = maybeJSBI$b.add(d0, maybeJSBI$b.multiply(h0, r0));
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
        d1 = maybeJSBI$b.add(d1, maybeJSBI$b.multiply(h0, r1));
        d1 = maybeJSBI$b.add(d1, maybeJSBI$b.multiply(h1, r0));
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
        d2 = maybeJSBI$b.add(d2, maybeJSBI$b.multiply(h0, r2));
        d2 = maybeJSBI$b.add(d2, maybeJSBI$b.multiply(h1, r1));
        d2 = maybeJSBI$b.add(d2, maybeJSBI$b.multiply(h2, r0));
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
        d3 = maybeJSBI$b.add(d3, maybeJSBI$b.multiply(h0, r3));
        d3 = maybeJSBI$b.add(d3, maybeJSBI$b.multiply(h1, r2));
        d3 = maybeJSBI$b.add(d3, maybeJSBI$b.multiply(h2, r1));
        d3 = maybeJSBI$b.add(d3, maybeJSBI$b.multiply(h3, r0));
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
        d4 = maybeJSBI$b.add(d4, maybeJSBI$b.multiply(h0, r4));
        d4 = maybeJSBI$b.add(d4, maybeJSBI$b.multiply(h1, r3));
        d4 = maybeJSBI$b.add(d4, maybeJSBI$b.multiply(h2, r2));
        d4 = maybeJSBI$b.add(d4, maybeJSBI$b.multiply(h3, r1));
        d4 = maybeJSBI$b.add(d4, maybeJSBI$b.multiply(h4, r0));
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
        d5 = maybeJSBI$b.add(d5, maybeJSBI$b.multiply(h0, r5));
        d5 = maybeJSBI$b.add(d5, maybeJSBI$b.multiply(h1, r4));
        d5 = maybeJSBI$b.add(d5, maybeJSBI$b.multiply(h2, r3));
        d5 = maybeJSBI$b.add(d5, maybeJSBI$b.multiply(h3, r2));
        d5 = maybeJSBI$b.add(d5, maybeJSBI$b.multiply(h4, r1));
        c = d5 >>> 13;
        d5 &= 0x1fff;
        d5 = maybeJSBI$b.add(d5, maybeJSBI$b.multiply(h5, r0));
        d5 += h6 * (5 * r9);
        d5 += h7 * (5 * r8);
        d5 += h8 * (5 * r7);
        d5 += h9 * (5 * r6);
        c += d5 >>> 13;
        d5 &= 0x1fff;
        d6 = c;
        d6 = maybeJSBI$b.add(d6, maybeJSBI$b.multiply(h0, r6));
        d6 = maybeJSBI$b.add(d6, maybeJSBI$b.multiply(h1, r5));
        d6 = maybeJSBI$b.add(d6, maybeJSBI$b.multiply(h2, r4));
        d6 = maybeJSBI$b.add(d6, maybeJSBI$b.multiply(h3, r3));
        d6 = maybeJSBI$b.add(d6, maybeJSBI$b.multiply(h4, r2));
        c = d6 >>> 13;
        d6 &= 0x1fff;
        d6 = maybeJSBI$b.add(d6, maybeJSBI$b.multiply(h5, r1));
        d6 = maybeJSBI$b.add(d6, maybeJSBI$b.multiply(h6, r0));
        d6 += h7 * (5 * r9);
        d6 += h8 * (5 * r8);
        d6 += h9 * (5 * r7);
        c += d6 >>> 13;
        d6 &= 0x1fff;
        d7 = c;
        d7 = maybeJSBI$b.add(d7, maybeJSBI$b.multiply(h0, r7));
        d7 = maybeJSBI$b.add(d7, maybeJSBI$b.multiply(h1, r6));
        d7 = maybeJSBI$b.add(d7, maybeJSBI$b.multiply(h2, r5));
        d7 = maybeJSBI$b.add(d7, maybeJSBI$b.multiply(h3, r4));
        d7 = maybeJSBI$b.add(d7, maybeJSBI$b.multiply(h4, r3));
        c = d7 >>> 13;
        d7 &= 0x1fff;
        d7 = maybeJSBI$b.add(d7, maybeJSBI$b.multiply(h5, r2));
        d7 = maybeJSBI$b.add(d7, maybeJSBI$b.multiply(h6, r1));
        d7 = maybeJSBI$b.add(d7, maybeJSBI$b.multiply(h7, r0));
        d7 += h8 * (5 * r9);
        d7 += h9 * (5 * r8);
        c += d7 >>> 13;
        d7 &= 0x1fff;
        d8 = c;
        d8 = maybeJSBI$b.add(d8, maybeJSBI$b.multiply(h0, r8));
        d8 = maybeJSBI$b.add(d8, maybeJSBI$b.multiply(h1, r7));
        d8 = maybeJSBI$b.add(d8, maybeJSBI$b.multiply(h2, r6));
        d8 = maybeJSBI$b.add(d8, maybeJSBI$b.multiply(h3, r5));
        d8 = maybeJSBI$b.add(d8, maybeJSBI$b.multiply(h4, r4));
        c = d8 >>> 13;
        d8 &= 0x1fff;
        d8 = maybeJSBI$b.add(d8, maybeJSBI$b.multiply(h5, r3));
        d8 = maybeJSBI$b.add(d8, maybeJSBI$b.multiply(h6, r2));
        d8 = maybeJSBI$b.add(d8, maybeJSBI$b.multiply(h7, r1));
        d8 = maybeJSBI$b.add(d8, maybeJSBI$b.multiply(h8, r0));
        d8 += h9 * (5 * r9);
        c += d8 >>> 13;
        d8 &= 0x1fff;
        d9 = c;
        d9 = maybeJSBI$b.add(d9, maybeJSBI$b.multiply(h0, r9));
        d9 = maybeJSBI$b.add(d9, maybeJSBI$b.multiply(h1, r8));
        d9 = maybeJSBI$b.add(d9, maybeJSBI$b.multiply(h2, r7));
        d9 = maybeJSBI$b.add(d9, maybeJSBI$b.multiply(h3, r6));
        d9 = maybeJSBI$b.add(d9, maybeJSBI$b.multiply(h4, r5));
        c = d9 >>> 13;
        d9 &= 0x1fff;
        d9 = maybeJSBI$b.add(d9, maybeJSBI$b.multiply(h5, r4));
        d9 = maybeJSBI$b.add(d9, maybeJSBI$b.multiply(h6, r3));
        d9 = maybeJSBI$b.add(d9, maybeJSBI$b.multiply(h7, r2));
        d9 = maybeJSBI$b.add(d9, maybeJSBI$b.multiply(h8, r1));
        d9 = maybeJSBI$b.add(d9, maybeJSBI$b.multiply(h9, r0));
        c += d9 >>> 13;
        d9 &= 0x1fff;
        c = (c << 2) + c | 0;
        c = maybeJSBI$b.add(c, d0) | 0;
        d0 = c & 0x1fff;
        c = c >>> 13;
        d1 = maybeJSBI$b.add(d1, c);
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
        this.buffer[(_x13 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x13)] = 1;

        for (; i < 16; _x14 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x14) {
          var _x14;

          this.buffer[i] = 0;
        }

        this.fin = 1;
        this.blocks(this.buffer, 0, 16);
      }

      c = this.h[1] >>> 13;
      this.h[1] &= 0x1fff;

      for (i = 2; i < 10; _x15 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x15) {
        var _x15, _x16, _y;

        _x16 = this.h, _y = i, _x16[_y] = maybeJSBI$b.add(_x16[_y], c);
        c = this.h[i] >>> 13;
        this.h[i] &= 0x1fff;
      }

      this.h[0] += c * 5;
      c = this.h[0] >>> 13;
      this.h[0] &= 0x1fff;
      _x17 = this.h, _y2 = 1, _x17[_y2] = maybeJSBI$b.add(_x17[_y2], c);
      c = this.h[1] >>> 13;
      this.h[1] &= 0x1fff;
      _x18 = this.h, _y3 = 2, _x18[_y3] = maybeJSBI$b.add(_x18[_y3], c);
      g[0] = this.h[0] + 5;
      c = g[0] >>> 13;
      g[0] &= 0x1fff;

      for (i = 1; i < 10; _x19 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x19) {
        var _x19;

        g[i] = maybeJSBI$b.add(this.h[i], c);
        c = g[i] >>> 13;
        g[i] &= 0x1fff;
      }

      g[9] -= 1 << 13;
      mask = (c ^ 1) - 1;

      for (i = 0; i < 10; _x20 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x20) {
        var _x20, _x21, _y4;

        _x21 = g, _y4 = i, _x21[_y4] = maybeJSBI$b.bitwiseAnd(_x21[_y4], mask);
      }

      mask = maybeJSBI$b.bitwiseNot(mask);

      for (i = 0; i < 10; _x22 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x22) {
        var _x22;

        this.h[i] = maybeJSBI$b.bitwiseOr(maybeJSBI$b.bitwiseAnd(this.h[i], mask), g[i]);
      }

      this.h[0] = (this.h[0] | this.h[1] << 13) & 0xffff;
      this.h[1] = (this.h[1] >>> 3 | this.h[2] << 10) & 0xffff;
      this.h[2] = (this.h[2] >>> 6 | this.h[3] << 7) & 0xffff;
      this.h[3] = (this.h[3] >>> 9 | this.h[4] << 4) & 0xffff;
      this.h[4] = (this.h[4] >>> 12 | this.h[5] << 1 | this.h[6] << 14) & 0xffff;
      this.h[5] = (this.h[6] >>> 2 | this.h[7] << 11) & 0xffff;
      this.h[6] = (this.h[7] >>> 5 | this.h[8] << 8) & 0xffff;
      this.h[7] = (this.h[8] >>> 8 | this.h[9] << 5) & 0xffff;
      f = maybeJSBI$b.add(this.h[0], this.pad[0]);
      this.h[0] = f & 0xffff;

      for (i = 1; i < 8; _x23 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x23) {
        var _x23;

        f = (maybeJSBI$b.add(this.h[i], this.pad[i]) | 0) + (f >>> 16) | 0;
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
        if (maybeJSBI$b.greaterThan(want, bytes)) want = bytes;

        for (i = 0; maybeJSBI$b.lessThan(i, want); _x24 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x24) {
          var _x24;

          this.buffer[maybeJSBI$b.add(this.leftover, i)] = m[maybeJSBI$b.add(mpos, i)];
        }

        bytes = maybeJSBI$b.subtract(bytes, want);
        mpos = maybeJSBI$b.add(mpos, want);
        _x25 = this, _y5 = "leftover", _x25[_y5] = maybeJSBI$b.add(_x25[_y5], want);
        if (this.leftover < 16) return;
        this.blocks(this.buffer, 0, 16);
        this.leftover = 0;
      }

      if (bytes >= 16) {
        want = bytes - bytes % 16;
        this.blocks(m, mpos, want);
        mpos = maybeJSBI$b.add(mpos, want);
        bytes = maybeJSBI$b.subtract(bytes, want);
      }

      if (bytes) {
        var _x27, _y6;

        for (i = 0; maybeJSBI$b.lessThan(i, bytes); _x26 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x26) {
          var _x26;

          this.buffer[maybeJSBI$b.add(this.leftover, i)] = m[maybeJSBI$b.add(mpos, i)];
        }

        _x27 = this, _y6 = "leftover", _x27[_y6] = maybeJSBI$b.add(_x27[_y6], bytes);
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

      for (i = 0; i < 16; _x28 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x28) {
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

      for (i = 0; i < 32; _x29 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x29) {
        var _x29;

        m[i] = 0;
      }

      return 0;
    }

    function set25519(r, a) {
      var i;

      for (i = 0; i < 16; _x30 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x30) {
        var _x30;

        r[i] = a[i] | 0;
      }
    }

    function car25519(o) {
      var i,
          v,
          c = 1;

      for (i = 0; i < 16; _x31 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x31) {
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

        t = c & maybeJSBI$b.bitwiseXor(p[i], q[i]);
        _x32 = p, _y7 = i, _x32[_y7] = maybeJSBI$b.bitwiseXor(_x32[_y7], t);
        _x33 = q, _y8 = i, _x33[_y8] = maybeJSBI$b.bitwiseXor(_x33[_y8], t);
      }
    }

    function pack25519(o, n) {
      var i, j, b;
      var m = gf(),
          t = gf();

      for (i = 0; i < 16; _x34 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x34) {
        var _x34;

        t[i] = n[i];
      }

      car25519(t);
      car25519(t);
      car25519(t);

      for (j = 0; j < 2; _x35 = j, j = maybeJSBI$b.add(j, maybeJSBI$b.BigInt(1)), _x35) {
        var _x35;

        m[0] = t[0] - 0xffed;

        for (i = 1; i < 15; _x36 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x36) {
          var _x36;

          m[i] = t[i] - 0xffff - (m[i - 1] >> 16 & 1);
          m[i - 1] &= 0xffff;
        }

        m[15] = t[15] - 0x7fff - (m[14] >> 16 & 1);
        b = m[15] >> 16 & 1;
        m[14] &= 0xffff;
        sel25519(t, m, 1 - b);
      }

      for (i = 0; i < 16; _x37 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x37) {
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

      for (i = 0; i < 16; _x38 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x38) {
        var _x38;

        o[i] = n[2 * i] + (n[2 * i + 1] << 8);
      }

      o[15] &= 0x7fff;
    }

    function A(o, a, b) {
      for (var i = 0; i < 16; i++) {
        o[i] = maybeJSBI$b.add(a[i], b[i]);
      }
    }

    function Z(o, a, b) {
      for (var i = 0; i < 16; i++) {
        o[i] = maybeJSBI$b.subtract(a[i], b[i]);
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
      t0 += maybeJSBI$b.multiply(v, b0);
      t1 += maybeJSBI$b.multiply(v, b1);
      t2 += maybeJSBI$b.multiply(v, b2);
      t3 += maybeJSBI$b.multiply(v, b3);
      t4 += maybeJSBI$b.multiply(v, b4);
      t5 += maybeJSBI$b.multiply(v, b5);
      t6 += maybeJSBI$b.multiply(v, b6);
      t7 += maybeJSBI$b.multiply(v, b7);
      t8 += maybeJSBI$b.multiply(v, b8);
      t9 += maybeJSBI$b.multiply(v, b9);
      t10 += maybeJSBI$b.multiply(v, b10);
      t11 += maybeJSBI$b.multiply(v, b11);
      t12 += maybeJSBI$b.multiply(v, b12);
      t13 += maybeJSBI$b.multiply(v, b13);
      t14 += maybeJSBI$b.multiply(v, b14);
      t15 += maybeJSBI$b.multiply(v, b15);
      v = a[1];
      t1 += maybeJSBI$b.multiply(v, b0);
      t2 += maybeJSBI$b.multiply(v, b1);
      t3 += maybeJSBI$b.multiply(v, b2);
      t4 += maybeJSBI$b.multiply(v, b3);
      t5 += maybeJSBI$b.multiply(v, b4);
      t6 += maybeJSBI$b.multiply(v, b5);
      t7 += maybeJSBI$b.multiply(v, b6);
      t8 += maybeJSBI$b.multiply(v, b7);
      t9 += maybeJSBI$b.multiply(v, b8);
      t10 += maybeJSBI$b.multiply(v, b9);
      t11 += maybeJSBI$b.multiply(v, b10);
      t12 += maybeJSBI$b.multiply(v, b11);
      t13 += maybeJSBI$b.multiply(v, b12);
      t14 += maybeJSBI$b.multiply(v, b13);
      t15 += maybeJSBI$b.multiply(v, b14);
      t16 += maybeJSBI$b.multiply(v, b15);
      v = a[2];
      t2 += maybeJSBI$b.multiply(v, b0);
      t3 += maybeJSBI$b.multiply(v, b1);
      t4 += maybeJSBI$b.multiply(v, b2);
      t5 += maybeJSBI$b.multiply(v, b3);
      t6 += maybeJSBI$b.multiply(v, b4);
      t7 += maybeJSBI$b.multiply(v, b5);
      t8 += maybeJSBI$b.multiply(v, b6);
      t9 += maybeJSBI$b.multiply(v, b7);
      t10 += maybeJSBI$b.multiply(v, b8);
      t11 += maybeJSBI$b.multiply(v, b9);
      t12 += maybeJSBI$b.multiply(v, b10);
      t13 += maybeJSBI$b.multiply(v, b11);
      t14 += maybeJSBI$b.multiply(v, b12);
      t15 += maybeJSBI$b.multiply(v, b13);
      t16 += maybeJSBI$b.multiply(v, b14);
      t17 += maybeJSBI$b.multiply(v, b15);
      v = a[3];
      t3 += maybeJSBI$b.multiply(v, b0);
      t4 += maybeJSBI$b.multiply(v, b1);
      t5 += maybeJSBI$b.multiply(v, b2);
      t6 += maybeJSBI$b.multiply(v, b3);
      t7 += maybeJSBI$b.multiply(v, b4);
      t8 += maybeJSBI$b.multiply(v, b5);
      t9 += maybeJSBI$b.multiply(v, b6);
      t10 += maybeJSBI$b.multiply(v, b7);
      t11 += maybeJSBI$b.multiply(v, b8);
      t12 += maybeJSBI$b.multiply(v, b9);
      t13 += maybeJSBI$b.multiply(v, b10);
      t14 += maybeJSBI$b.multiply(v, b11);
      t15 += maybeJSBI$b.multiply(v, b12);
      t16 += maybeJSBI$b.multiply(v, b13);
      t17 += maybeJSBI$b.multiply(v, b14);
      t18 += maybeJSBI$b.multiply(v, b15);
      v = a[4];
      t4 += maybeJSBI$b.multiply(v, b0);
      t5 += maybeJSBI$b.multiply(v, b1);
      t6 += maybeJSBI$b.multiply(v, b2);
      t7 += maybeJSBI$b.multiply(v, b3);
      t8 += maybeJSBI$b.multiply(v, b4);
      t9 += maybeJSBI$b.multiply(v, b5);
      t10 += maybeJSBI$b.multiply(v, b6);
      t11 += maybeJSBI$b.multiply(v, b7);
      t12 += maybeJSBI$b.multiply(v, b8);
      t13 += maybeJSBI$b.multiply(v, b9);
      t14 += maybeJSBI$b.multiply(v, b10);
      t15 += maybeJSBI$b.multiply(v, b11);
      t16 += maybeJSBI$b.multiply(v, b12);
      t17 += maybeJSBI$b.multiply(v, b13);
      t18 += maybeJSBI$b.multiply(v, b14);
      t19 += maybeJSBI$b.multiply(v, b15);
      v = a[5];
      t5 += maybeJSBI$b.multiply(v, b0);
      t6 += maybeJSBI$b.multiply(v, b1);
      t7 += maybeJSBI$b.multiply(v, b2);
      t8 += maybeJSBI$b.multiply(v, b3);
      t9 += maybeJSBI$b.multiply(v, b4);
      t10 += maybeJSBI$b.multiply(v, b5);
      t11 += maybeJSBI$b.multiply(v, b6);
      t12 += maybeJSBI$b.multiply(v, b7);
      t13 += maybeJSBI$b.multiply(v, b8);
      t14 += maybeJSBI$b.multiply(v, b9);
      t15 += maybeJSBI$b.multiply(v, b10);
      t16 += maybeJSBI$b.multiply(v, b11);
      t17 += maybeJSBI$b.multiply(v, b12);
      t18 += maybeJSBI$b.multiply(v, b13);
      t19 += maybeJSBI$b.multiply(v, b14);
      t20 += maybeJSBI$b.multiply(v, b15);
      v = a[6];
      t6 += maybeJSBI$b.multiply(v, b0);
      t7 += maybeJSBI$b.multiply(v, b1);
      t8 += maybeJSBI$b.multiply(v, b2);
      t9 += maybeJSBI$b.multiply(v, b3);
      t10 += maybeJSBI$b.multiply(v, b4);
      t11 += maybeJSBI$b.multiply(v, b5);
      t12 += maybeJSBI$b.multiply(v, b6);
      t13 += maybeJSBI$b.multiply(v, b7);
      t14 += maybeJSBI$b.multiply(v, b8);
      t15 += maybeJSBI$b.multiply(v, b9);
      t16 += maybeJSBI$b.multiply(v, b10);
      t17 += maybeJSBI$b.multiply(v, b11);
      t18 += maybeJSBI$b.multiply(v, b12);
      t19 += maybeJSBI$b.multiply(v, b13);
      t20 += maybeJSBI$b.multiply(v, b14);
      t21 += maybeJSBI$b.multiply(v, b15);
      v = a[7];
      t7 += maybeJSBI$b.multiply(v, b0);
      t8 += maybeJSBI$b.multiply(v, b1);
      t9 += maybeJSBI$b.multiply(v, b2);
      t10 += maybeJSBI$b.multiply(v, b3);
      t11 += maybeJSBI$b.multiply(v, b4);
      t12 += maybeJSBI$b.multiply(v, b5);
      t13 += maybeJSBI$b.multiply(v, b6);
      t14 += maybeJSBI$b.multiply(v, b7);
      t15 += maybeJSBI$b.multiply(v, b8);
      t16 += maybeJSBI$b.multiply(v, b9);
      t17 += maybeJSBI$b.multiply(v, b10);
      t18 += maybeJSBI$b.multiply(v, b11);
      t19 += maybeJSBI$b.multiply(v, b12);
      t20 += maybeJSBI$b.multiply(v, b13);
      t21 += maybeJSBI$b.multiply(v, b14);
      t22 += maybeJSBI$b.multiply(v, b15);
      v = a[8];
      t8 += maybeJSBI$b.multiply(v, b0);
      t9 += maybeJSBI$b.multiply(v, b1);
      t10 += maybeJSBI$b.multiply(v, b2);
      t11 += maybeJSBI$b.multiply(v, b3);
      t12 += maybeJSBI$b.multiply(v, b4);
      t13 += maybeJSBI$b.multiply(v, b5);
      t14 += maybeJSBI$b.multiply(v, b6);
      t15 += maybeJSBI$b.multiply(v, b7);
      t16 += maybeJSBI$b.multiply(v, b8);
      t17 += maybeJSBI$b.multiply(v, b9);
      t18 += maybeJSBI$b.multiply(v, b10);
      t19 += maybeJSBI$b.multiply(v, b11);
      t20 += maybeJSBI$b.multiply(v, b12);
      t21 += maybeJSBI$b.multiply(v, b13);
      t22 += maybeJSBI$b.multiply(v, b14);
      t23 += maybeJSBI$b.multiply(v, b15);
      v = a[9];
      t9 += maybeJSBI$b.multiply(v, b0);
      t10 += maybeJSBI$b.multiply(v, b1);
      t11 += maybeJSBI$b.multiply(v, b2);
      t12 += maybeJSBI$b.multiply(v, b3);
      t13 += maybeJSBI$b.multiply(v, b4);
      t14 += maybeJSBI$b.multiply(v, b5);
      t15 += maybeJSBI$b.multiply(v, b6);
      t16 += maybeJSBI$b.multiply(v, b7);
      t17 += maybeJSBI$b.multiply(v, b8);
      t18 += maybeJSBI$b.multiply(v, b9);
      t19 += maybeJSBI$b.multiply(v, b10);
      t20 += maybeJSBI$b.multiply(v, b11);
      t21 += maybeJSBI$b.multiply(v, b12);
      t22 += maybeJSBI$b.multiply(v, b13);
      t23 += maybeJSBI$b.multiply(v, b14);
      t24 += maybeJSBI$b.multiply(v, b15);
      v = a[10];
      t10 += maybeJSBI$b.multiply(v, b0);
      t11 += maybeJSBI$b.multiply(v, b1);
      t12 += maybeJSBI$b.multiply(v, b2);
      t13 += maybeJSBI$b.multiply(v, b3);
      t14 += maybeJSBI$b.multiply(v, b4);
      t15 += maybeJSBI$b.multiply(v, b5);
      t16 += maybeJSBI$b.multiply(v, b6);
      t17 += maybeJSBI$b.multiply(v, b7);
      t18 += maybeJSBI$b.multiply(v, b8);
      t19 += maybeJSBI$b.multiply(v, b9);
      t20 += maybeJSBI$b.multiply(v, b10);
      t21 += maybeJSBI$b.multiply(v, b11);
      t22 += maybeJSBI$b.multiply(v, b12);
      t23 += maybeJSBI$b.multiply(v, b13);
      t24 += maybeJSBI$b.multiply(v, b14);
      t25 += maybeJSBI$b.multiply(v, b15);
      v = a[11];
      t11 += maybeJSBI$b.multiply(v, b0);
      t12 += maybeJSBI$b.multiply(v, b1);
      t13 += maybeJSBI$b.multiply(v, b2);
      t14 += maybeJSBI$b.multiply(v, b3);
      t15 += maybeJSBI$b.multiply(v, b4);
      t16 += maybeJSBI$b.multiply(v, b5);
      t17 += maybeJSBI$b.multiply(v, b6);
      t18 += maybeJSBI$b.multiply(v, b7);
      t19 += maybeJSBI$b.multiply(v, b8);
      t20 += maybeJSBI$b.multiply(v, b9);
      t21 += maybeJSBI$b.multiply(v, b10);
      t22 += maybeJSBI$b.multiply(v, b11);
      t23 += maybeJSBI$b.multiply(v, b12);
      t24 += maybeJSBI$b.multiply(v, b13);
      t25 += maybeJSBI$b.multiply(v, b14);
      t26 += maybeJSBI$b.multiply(v, b15);
      v = a[12];
      t12 += maybeJSBI$b.multiply(v, b0);
      t13 += maybeJSBI$b.multiply(v, b1);
      t14 += maybeJSBI$b.multiply(v, b2);
      t15 += maybeJSBI$b.multiply(v, b3);
      t16 += maybeJSBI$b.multiply(v, b4);
      t17 += maybeJSBI$b.multiply(v, b5);
      t18 += maybeJSBI$b.multiply(v, b6);
      t19 += maybeJSBI$b.multiply(v, b7);
      t20 += maybeJSBI$b.multiply(v, b8);
      t21 += maybeJSBI$b.multiply(v, b9);
      t22 += maybeJSBI$b.multiply(v, b10);
      t23 += maybeJSBI$b.multiply(v, b11);
      t24 += maybeJSBI$b.multiply(v, b12);
      t25 += maybeJSBI$b.multiply(v, b13);
      t26 += maybeJSBI$b.multiply(v, b14);
      t27 += maybeJSBI$b.multiply(v, b15);
      v = a[13];
      t13 += maybeJSBI$b.multiply(v, b0);
      t14 += maybeJSBI$b.multiply(v, b1);
      t15 += maybeJSBI$b.multiply(v, b2);
      t16 += maybeJSBI$b.multiply(v, b3);
      t17 += maybeJSBI$b.multiply(v, b4);
      t18 += maybeJSBI$b.multiply(v, b5);
      t19 += maybeJSBI$b.multiply(v, b6);
      t20 += maybeJSBI$b.multiply(v, b7);
      t21 += maybeJSBI$b.multiply(v, b8);
      t22 += maybeJSBI$b.multiply(v, b9);
      t23 += maybeJSBI$b.multiply(v, b10);
      t24 += maybeJSBI$b.multiply(v, b11);
      t25 += maybeJSBI$b.multiply(v, b12);
      t26 += maybeJSBI$b.multiply(v, b13);
      t27 += maybeJSBI$b.multiply(v, b14);
      t28 += maybeJSBI$b.multiply(v, b15);
      v = a[14];
      t14 += maybeJSBI$b.multiply(v, b0);
      t15 += maybeJSBI$b.multiply(v, b1);
      t16 += maybeJSBI$b.multiply(v, b2);
      t17 += maybeJSBI$b.multiply(v, b3);
      t18 += maybeJSBI$b.multiply(v, b4);
      t19 += maybeJSBI$b.multiply(v, b5);
      t20 += maybeJSBI$b.multiply(v, b6);
      t21 += maybeJSBI$b.multiply(v, b7);
      t22 += maybeJSBI$b.multiply(v, b8);
      t23 += maybeJSBI$b.multiply(v, b9);
      t24 += maybeJSBI$b.multiply(v, b10);
      t25 += maybeJSBI$b.multiply(v, b11);
      t26 += maybeJSBI$b.multiply(v, b12);
      t27 += maybeJSBI$b.multiply(v, b13);
      t28 += maybeJSBI$b.multiply(v, b14);
      t29 += maybeJSBI$b.multiply(v, b15);
      v = a[15];
      t15 += maybeJSBI$b.multiply(v, b0);
      t16 += maybeJSBI$b.multiply(v, b1);
      t17 += maybeJSBI$b.multiply(v, b2);
      t18 += maybeJSBI$b.multiply(v, b3);
      t19 += maybeJSBI$b.multiply(v, b4);
      t20 += maybeJSBI$b.multiply(v, b5);
      t21 += maybeJSBI$b.multiply(v, b6);
      t22 += maybeJSBI$b.multiply(v, b7);
      t23 += maybeJSBI$b.multiply(v, b8);
      t24 += maybeJSBI$b.multiply(v, b9);
      t25 += maybeJSBI$b.multiply(v, b10);
      t26 += maybeJSBI$b.multiply(v, b11);
      t27 += maybeJSBI$b.multiply(v, b12);
      t28 += maybeJSBI$b.multiply(v, b13);
      t29 += maybeJSBI$b.multiply(v, b14);
      t30 += maybeJSBI$b.multiply(v, b15);
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

      for (a = 0; a < 16; _x39 = a, a = maybeJSBI$b.add(a, maybeJSBI$b.BigInt(1)), _x39) {
        var _x39;

        c[a] = i[a];
      }

      for (a = 253; a >= 0; _x40 = a, a = maybeJSBI$b.subtract(a, maybeJSBI$b.BigInt(1)), _x40) {
        var _x40;

        S(c, c);
        if (a !== 2 && a !== 4) M(c, c, i);
      }

      for (a = 0; a < 16; _x41 = a, a = maybeJSBI$b.add(a, maybeJSBI$b.BigInt(1)), _x41) {
        var _x41;

        o[a] = c[a];
      }
    }

    function pow2523(o, i) {
      var c = gf();
      var a;

      for (a = 0; a < 16; _x42 = a, a = maybeJSBI$b.add(a, maybeJSBI$b.BigInt(1)), _x42) {
        var _x42;

        c[a] = i[a];
      }

      for (a = 250; a >= 0; _x43 = a, a = maybeJSBI$b.subtract(a, maybeJSBI$b.BigInt(1)), _x43) {
        var _x43;

        S(c, c);
        if (a !== 1) M(c, c, i);
      }

      for (a = 0; a < 16; _x44 = a, a = maybeJSBI$b.add(a, maybeJSBI$b.BigInt(1)), _x44) {
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

      for (i = 0; i < 31; _x45 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x45) {
        var _x45;

        z[i] = n[i];
      }

      z[31] = n[31] & 127 | 64;
      z[0] &= 248;
      unpack25519(x, p);

      for (i = 0; i < 16; _x46 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x46) {
        var _x46;

        b[i] = x[i];
        d[i] = a[i] = c[i] = 0;
      }

      a[0] = d[0] = 1;

      for (i = 254; i >= 0; i = maybeJSBI$b.subtract(i, maybeJSBI$b.BigInt(1))) {
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

      for (i = 0; i < 16; _x47 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x47) {
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
        for (i = 0; i < 16; _x48 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x48) {
          var _x48;

          j = 8 * i + pos;
          wh[i] = m[j + 0] << 24 | m[j + 1] << 16 | m[j + 2] << 8 | m[j + 3];
          wl[i] = m[j + 4] << 24 | m[j + 5] << 16 | m[j + 6] << 8 | m[j + 7];
        }

        for (i = 0; i < 80; _x49 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x49) {
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

          h = maybeJSBI$b.bitwiseXor(maybeJSBI$b.bitwiseAnd(ah4, ah5), maybeJSBI$b.bitwiseAnd(maybeJSBI$b.bitwiseNot(ah4), ah6));
          l = maybeJSBI$b.bitwiseXor(maybeJSBI$b.bitwiseAnd(al4, al5), maybeJSBI$b.bitwiseAnd(maybeJSBI$b.bitwiseNot(al4), al6));
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

          h = maybeJSBI$b.bitwiseXor(maybeJSBI$b.bitwiseXor(maybeJSBI$b.bitwiseAnd(ah0, ah1), maybeJSBI$b.bitwiseAnd(ah0, ah2)), maybeJSBI$b.bitwiseAnd(ah1, ah2));
          l = maybeJSBI$b.bitwiseXor(maybeJSBI$b.bitwiseXor(maybeJSBI$b.bitwiseAnd(al0, al1), maybeJSBI$b.bitwiseAnd(al0, al2)), maybeJSBI$b.bitwiseAnd(al1, al2));
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
            for (j = 0; j < 16; _x50 = j, j = maybeJSBI$b.add(j, maybeJSBI$b.BigInt(1)), _x50) {
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

      for (i = 0; maybeJSBI$b.lessThan(i, n); _x51 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x51) {
        var _x51;

        x[i] = m[maybeJSBI$b.add(maybeJSBI$b.subtract(b, n), i)];
      }

      x[n] = 128;
      n = 256 - 128 * (n < 112 ? 1 : 0);
      x[n - 9] = 0;
      ts64(x, n - 8, b / 0x20000000 | 0, b << 3);
      crypto_hashblocks_hl(hh, hl, x, n);

      for (i = 0; i < 8; _x52 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x52) {
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

      for (i = 0; i < 4; _x53 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x53) {
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

      for (i = 255; i >= 0; i = maybeJSBI$b.subtract(i, maybeJSBI$b.BigInt(1))) {
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

      for (i = 0; i < 32; _x54 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x54) {
        var _x54;

        sk[i + 32] = pk[i];
      }

      return 0;
    }

    var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

    function modL(r, x) {
      var carry, i, j, k;

      for (i = 63; i >= 32; i = maybeJSBI$b.subtract(i, maybeJSBI$b.BigInt(1))) {
        var _x55, _y9;

        carry = 0;

        for (j = i - 32, k = i - 12; maybeJSBI$b.lessThan(j, k); j = maybeJSBI$b.add(j, maybeJSBI$b.BigInt(1))) {
          x[j] += carry - 16 * x[i] * L[j - (i - 32)];
          carry = Math.floor((x[j] + 128) / 256);
          x[j] -= carry * 256;
        }

        _x55 = x, _y9 = j, _x55[_y9] = maybeJSBI$b.add(_x55[_y9], carry);
        x[i] = 0;
      }

      carry = 0;

      for (j = 0; j < 32; _x56 = j, j = maybeJSBI$b.add(j, maybeJSBI$b.BigInt(1)), _x56) {
        var _x56;

        x[j] += carry - (x[31] >> 4) * L[j];
        carry = x[j] >> 8;
        x[j] &= 255;
      }

      for (j = 0; j < 32; _x57 = j, j = maybeJSBI$b.add(j, maybeJSBI$b.BigInt(1)), _x57) {
        var _x57, _x58, _y10;

        _x58 = x, _y10 = j, _x58[_y10] = maybeJSBI$b.subtract(_x58[_y10], maybeJSBI$b.multiply(carry, L[j]));
      }

      for (i = 0; i < 32; _x59 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x59) {
        var _x59;

        x[i + 1] += x[i] >> 8;
        r[i] = x[i] & 255;
      }
    }

    function reduce(r) {
      var x = new Float64Array(64),
          i;

      for (i = 0; i < 64; _x60 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x60) {
        var _x60;

        x[i] = r[i];
      }

      for (i = 0; i < 64; _x61 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x61) {
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

      for (i = 0; maybeJSBI$b.lessThan(i, n); _x62 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x62) {
        var _x62;

        sm[64 + i] = m[i];
      }

      for (i = 0; i < 32; _x63 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x63) {
        var _x63;

        sm[32 + i] = d[32 + i];
      }

      crypto_hash(r, sm.subarray(32), n + 32);
      reduce(r);
      scalarbase(p, r);
      pack(sm, p);

      for (i = 32; i < 64; _x64 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x64) {
        var _x64;

        sm[i] = sk[i];
      }

      crypto_hash(h, sm, n + 64);
      reduce(h);

      for (i = 0; i < 64; _x65 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x65) {
        var _x65;

        x[i] = 0;
      }

      for (i = 0; i < 32; _x66 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x66) {
        var _x66;

        x[i] = r[i];
      }

      for (i = 0; i < 32; _x67 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x67) {
        var _x67;

        for (j = 0; j < 32; _x68 = j, j = maybeJSBI$b.add(j, maybeJSBI$b.BigInt(1)), _x68) {
          var _x68, _x69, _y11;

          _x69 = x, _y11 = maybeJSBI$b.add(i, j), _x69[_y11] = maybeJSBI$b.add(_x69[_y11], maybeJSBI$b.multiply(h[i], d[j]));
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

      for (i = 0; maybeJSBI$b.lessThan(i, n); _x70 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x70) {
        var _x70;

        m[i] = sm[i];
      }

      for (i = 0; i < 32; _x71 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x71) {
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
        for (i = 0; maybeJSBI$b.lessThan(i, n); _x72 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x72) {
          var _x72;

          m[i] = 0;
        }

        return -1;
      }

      for (i = 0; maybeJSBI$b.lessThan(i, n); _x73 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x73) {
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

      for (i = 0; i < crypto_sign_BYTES; _x74 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x74) {
        var _x74;

        sm[i] = sig[i];
      }

      for (i = 0; maybeJSBI$b.lessThan(i, msg.length); _x75 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x75) {
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
      if (maybeJSBI$b.notEqual(x.length, y.length)) return false;
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

          for (i = 0; maybeJSBI$b.lessThan(i, n); i += QUOTA) {
            crypto.getRandomValues(v.subarray(i, i + Math.min(maybeJSBI$b.subtract(n, i), QUOTA)));
          }

          for (i = 0; maybeJSBI$b.lessThan(i, n); _x76 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x76) {
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

            for (i = 0; maybeJSBI$b.lessThan(i, n); _x77 = i, i = maybeJSBI$b.add(i, maybeJSBI$b.BigInt(1)), _x77) {
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

(function (module) {
  /* jshint newcap: false */
  (function (root, f) {

    if (module.exports) module.exports = f(naclFast.exports);else root.ed2curve = f(root.nacl);
  })(commonjsGlobal, function (nacl) {

    if (!nacl) throw new Error('tweetnacl not loaded'); // -- Operations copied from TweetNaCl.js. --

    var gf = function gf(init) {
      var i,
          r = new Float64Array(16);
      if (init) for (i = 0; maybeJSBI$a.lessThan(i, init.length); _x = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x) {
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

      for (i = 0; i < 16; _x2 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x2) {
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

        t = c & maybeJSBI$a.bitwiseXor(p[i], q[i]);
        _x3 = p, _y = i, _x3[_y] = maybeJSBI$a.bitwiseXor(_x3[_y], t);
        _x4 = q, _y2 = i, _x4[_y2] = maybeJSBI$a.bitwiseXor(_x4[_y2], t);
      }
    }

    function unpack25519(o, n) {
      var i;

      for (i = 0; i < 16; _x5 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x5) {
        var _x5;

        o[i] = n[2 * i] + (n[2 * i + 1] << 8);
      }

      o[15] &= 0x7fff;
    } // addition


    function A(o, a, b) {
      var i;

      for (i = 0; i < 16; _x6 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x6) {
        var _x6;

        o[i] = maybeJSBI$a.add(a[i], b[i]) | 0;
      }
    } // subtraction


    function Z(o, a, b) {
      var i;

      for (i = 0; i < 16; _x7 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x7) {
        var _x7;

        o[i] = maybeJSBI$a.subtract(a[i], b[i]) | 0;
      }
    } // multiplication


    function M(o, a, b) {
      var i,
          j,
          t = new Float64Array(31);

      for (i = 0; i < 31; _x8 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x8) {
        var _x8;

        t[i] = 0;
      }

      for (i = 0; i < 16; _x9 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x9) {
        var _x9;

        for (j = 0; j < 16; _x10 = j, j = maybeJSBI$a.add(j, maybeJSBI$a.BigInt(1)), _x10) {
          var _x10, _x11, _y3;

          _x11 = t, _y3 = maybeJSBI$a.add(i, j), _x11[_y3] = maybeJSBI$a.add(_x11[_y3], maybeJSBI$a.multiply(a[i], b[j]));
        }
      }

      for (i = 0; i < 15; _x12 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x12) {
        var _x12;

        t[i] += 38 * t[i + 16];
      }

      for (i = 0; i < 16; _x13 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x13) {
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

      for (a = 0; a < 16; _x14 = a, a = maybeJSBI$a.add(a, maybeJSBI$a.BigInt(1)), _x14) {
        var _x14;

        c[a] = i[a];
      }

      for (a = 253; a >= 0; _x15 = a, a = maybeJSBI$a.subtract(a, maybeJSBI$a.BigInt(1)), _x15) {
        var _x15;

        S(c, c);
        if (a !== 2 && a !== 4) M(c, c, i);
      }

      for (a = 0; a < 16; _x16 = a, a = maybeJSBI$a.add(a, maybeJSBI$a.BigInt(1)), _x16) {
        var _x16;

        o[a] = c[a];
      }
    }

    function pack25519(o, n) {
      var i, j, b;
      var m = gf(),
          t = gf();

      for (i = 0; i < 16; _x17 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x17) {
        var _x17;

        t[i] = n[i];
      }

      car25519(t);
      car25519(t);
      car25519(t);

      for (j = 0; j < 2; _x18 = j, j = maybeJSBI$a.add(j, maybeJSBI$a.BigInt(1)), _x18) {
        var _x18;

        m[0] = t[0] - 0xffed;

        for (i = 1; i < 15; _x19 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x19) {
          var _x19;

          m[i] = t[i] - 0xffff - (m[i - 1] >> 16 & 1);
          m[i - 1] &= 0xffff;
        }

        m[15] = t[15] - 0x7fff - (m[14] >> 16 & 1);
        b = m[15] >> 16 & 1;
        m[14] &= 0xffff;
        sel25519(t, m, 1 - b);
      }

      for (i = 0; i < 16; _x20 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x20) {
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

      for (i = 0; maybeJSBI$a.lessThan(i, n); _x21 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x21) {
        var _x21;

        d |= maybeJSBI$a.bitwiseXor(x[maybeJSBI$a.add(xi, i)], y[maybeJSBI$a.add(yi, i)]);
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

      for (a = 0; a < 16; _x22 = a, a = maybeJSBI$a.add(a, maybeJSBI$a.BigInt(1)), _x22) {
        var _x22;

        c[a] = i[a];
      }

      for (a = 250; a >= 0; _x23 = a, a = maybeJSBI$a.subtract(a, maybeJSBI$a.BigInt(1)), _x23) {
        var _x23;

        S(c, c);
        if (a !== 1) M(c, c, i);
      }

      for (a = 0; a < 16; _x24 = a, a = maybeJSBI$a.add(a, maybeJSBI$a.BigInt(1)), _x24) {
        var _x24;

        o[a] = c[a];
      }
    }

    function set25519(r, a) {
      var i;

      for (i = 0; i < 16; _x25 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x25) {
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

      for (i = 0; i < 32; _x26 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x26) {
        var _x26;

        o[i] = d[i];
      }

      for (i = 0; i < 64; _x27 = i, i = maybeJSBI$a.add(i, maybeJSBI$a.BigInt(1)), _x27) {
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
 * @name randomAsHex
 * @description Creates a hex string filled with random bytes.
 */

var randomAsHex = createAsHex(randomAsU8a);

var BN_53 = new BN(9007199254740991);
/**
 * @name randomAsNumber
 * @summary Creates a random number from random bytes.
 * @description
 * Returns a random number generated from the secure bytes.
 * @example
 * <BR>
 *
 * ```javascript
 * import { randomAsNumber } from '@polkadot/util-crypto';
 *
 * randomAsNumber(); // => <random number>
 * ```
 */

function randomAsNumber() {
  return hexToBn(randomAsHex(8)).and(BN_53).toNumber();
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
 * @name ed25519PairFromRandom
 * @summary Creates a new public/secret keypair.
 * @description
 * Returns a new generate object containing a `publicKey` & `secretKey`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { ed25519PairFromRandom } from '@polkadot/util-crypto';
 *
 * ed25519PairFromRandom(); // => { secretKey: [...], publicKey: [...] }
 * ```
 */

function ed25519PairFromRandom() {
  return ed25519PairFromSeed(randomAsU8a());
}

/**
 * @name ed25519PairFromSecret
 * @summary Creates a new public/secret keypair from a secret.
 * @description
 * Returns a object containing a `publicKey` & `secretKey` generated from the supplied secret.
 * @example
 * <BR>
 *
 * ```javascript
 * import { ed25519PairFromSecret } from '@polkadot/util-crypto';
 *
 * ed25519PairFromSecret(...); // => { secretKey: [...], publicKey: [...] }
 * ```
 */

function ed25519PairFromSecret(secret) {
  return nacl.sign.keyPair.fromSecretKey(secret);
}

/**
 * @name ed25519PairFromString
 * @summary Creates a new public/secret keypair from a string.
 * @description
 * Returns a object containing a `publicKey` & `secretKey` generated from the supplied string. The string is hashed and the value used as the input seed.
 * @example
 * <BR>
 *
 * ```javascript
 * import { ed25519PairFromString } from '@polkadot/util-crypto';
 *
 * ed25519PairFromString('test'); // => { secretKey: [...], publicKey: [...] }
 * ```
 */

function ed25519PairFromString(value) {
  return ed25519PairFromSeed(blake2AsU8a(stringToU8a(value)));
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
 * @name sr25519Agreement
 * @description Key agreement between other's public key and self secret key
 */

function sr25519Agreement(secretKey, publicKey) {
  var secretKeyU8a = u8aToU8a(secretKey);
  var publicKeyU8a = u8aToU8a(publicKey);
  assert(publicKeyU8a.length === 32, function () {
    return "Invalid publicKey, received ".concat(publicKeyU8a.length, " bytes, expected 32");
  });
  assert(secretKeyU8a.length === 64, function () {
    return "Invalid secretKey, received ".concat(secretKeyU8a.length, " bytes, expected 64");
  });
  return sr25519Agree(publicKeyU8a, secretKeyU8a);
}

function sr25519DerivePublic(publicKey, chainCode) {
  var publicKeyU8a = u8aToU8a(publicKey);
  assert(isU8a(chainCode) && chainCode.length === 32, 'Invalid chainCode passed to derive');
  assert(publicKeyU8a.length === 32, function () {
    return "Invalid publicKey, received ".concat(publicKeyU8a.length, " bytes, expected 32");
  });
  return sr25519DerivePublicSoft(publicKeyU8a, chainCode);
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

function filterHard(_ref) {
  var isHard = _ref.isHard;
  return isHard;
}
/**
 * @name deriveAddress
 * @summary Creates a sr25519 derived address from the supplied and path.
 * @description
 * Creates a sr25519 derived address based on the input address/publicKey and the uri supplied.
 */


function deriveAddress(who, suri, ss58Format) {
  var _keyExtractPath = keyExtractPath(suri),
      path = _keyExtractPath.path;

  assert(path.length && !path.every(filterHard), 'Expected suri to contain a combination of non-hard paths');
  var publicKey = decodeAddress(who);

  var _iterator = _createForOfIteratorHelper(path),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var chainCode = _step.value.chainCode;
      publicKey = sr25519DerivePublic(publicKey, chainCode);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return encodeAddress(publicKey, ss58Format);
}

/**
 * @name encodeDerivedAddress
 * @summary Creates a derived address as used in Substrate utility.
 * @description
 * Creates a Substrate derived address based on the input address/publicKey and the index supplied.
 */

function encodeDerivedAddress(who, index, ss58Format) {
  return encodeAddress(createKeyDerived(decodeAddress(who), index), ss58Format);
}

/**
 * @name encodeMultiAddress
 * @summary Creates a multisig address.
 * @description
 * Creates a Substrate multisig address based on the input address and the required threshold.
 */

function encodeMultiAddress(who, threshold, ss58Format) {
  return encodeAddress(createKeyMulti(who, threshold), ss58Format);
}

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

var SHA3_PI = [],
    SHA3_ROTL = [],
    _SHA3_IOTA = [];

var _0n = JSBI.BigInt(0);

var _1n = JSBI.BigInt(1);

var _2n = JSBI.BigInt(2);

var _7n$1 = JSBI.BigInt(7);

var _256n$1 = JSBI.BigInt(256);

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
    R = maybeJSBI$9.remainder(maybeJSBI$9.bitwiseXor(maybeJSBI$9.leftShift(R, _1n), maybeJSBI$9.multiply(maybeJSBI$9.signedRightShift(R, _7n$1), _0x71n)), _256n$1);
    if (maybeJSBI$9.bitwiseAnd(R, _2n)) t = JSBI.bitwiseXor(t, JSBI.leftShift(_1n, JSBI.subtract(JSBI.leftShift(_1n, JSBI.BigInt(j)), _1n)));
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
      B[_x] = maybeJSBI$9.bitwiseXor(maybeJSBI$9.bitwiseXor(maybeJSBI$9.bitwiseXor(maybeJSBI$9.bitwiseXor(s[_x], s[_x + 10]), s[_x + 20]), s[_x + 30]), s[_x + 40]);
    }

    for (var _x2 = 0; _x2 < 10; _x2 += 2) {
      var idx1 = (_x2 + 8) % 10;
      var idx0 = (_x2 + 2) % 10;
      var B0 = B[idx0];
      var B1 = B[idx0 + 1];
      var Th = maybeJSBI$9.bitwiseXor(rotlH(B0, B1, 1), B[idx1]);
      var Tl = maybeJSBI$9.bitwiseXor(rotlL(B0, B1, 1), B[idx1 + 1]);

      for (var _y = 0; _y < 50; _y += 10) {
        var _x3, _y2, _x4, _y3;

        _x3 = s, _y2 = _x2 + _y, _x3[_y2] = maybeJSBI$9.bitwiseXor(_x3[_y2], Th);
        _x4 = s, _y3 = _x2 + _y + 1, _x4[_y3] = maybeJSBI$9.bitwiseXor(_x4[_y3], Tl);
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

        _x7 = s, _y5 = _y4 + _x6, _x7[_y5] = maybeJSBI$9.bitwiseXor(_x7[_y5], maybeJSBI$9.bitwiseAnd(maybeJSBI$9.bitwiseNot(B[(_x6 + 2) % 10]), B[(_x6 + 4) % 10]));
      }
    } // Iota (ι)


    _x8 = s, _y6 = 0, _x8[_y6] = maybeJSBI$9.bitwiseXor(_x8[_y6], SHA3_IOTA_H[_round]);
    _x9 = s, _y7 = 1, _x9[_y7] = maybeJSBI$9.bitwiseXor(_x9[_y7], SHA3_IOTA_L[_round]);
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
    _this.state32 = u32$1(_this.state);
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
        var take = Math.min(maybeJSBI$9.subtract(blockLen, this.pos), len - pos);

        for (var i = 0; i < take; i++) {
          var _x10, _y8, _x11, _y9, _z;

          _x10 = state, _y8 = (_x11 = this, _y9 = "pos", _z = _x11[_y9], _x11[_y9] = maybeJSBI$9.add(_z, maybeJSBI$9.BigInt(1)), _z), _x10[_y8] = maybeJSBI$9.bitwiseXor(_x10[_y8], data[pos++]);
        }

        if (maybeJSBI$9.equal(this.pos, blockLen)) this.keccak();
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

      _x12 = state, _y10 = pos, _x12[_y10] = maybeJSBI$9.bitwiseXor(_x12[_y10], suffix);
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
        if (maybeJSBI$9.greaterThanOrEqual(this.posOut, this.blockLen)) this.keccak();
        var take = Math.min(maybeJSBI$9.subtract(this.blockLen, this.posOut), len - pos);
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
      if (maybeJSBI$9.lessThan(out.length, this.outputLen)) throw new Error('Keccak: invalid output buffer');
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
/**
 * @name keccak256AsU8a
 * @description Creates a keccak256 Uint8Array from the input.
 */

var keccak256AsU8a = createBitHasher(256, keccakAsU8a);
/**
 * @name keccak512AsU8a
 * @description Creates a keccak512 Uint8Array from the input.
 */

var keccak512AsU8a = createBitHasher(512, keccakAsU8a);
/**
 * @name keccakAsHex
 * @description Creates a keccak hex string from the input.
 */

var keccakAsHex = createAsHex(keccakAsU8a);

function hasher(hashType, data, onlyJs) {
  return hashType === 'keccak' ? keccakAsU8a(data, undefined, onlyJs) : blake2AsU8a(data, undefined, undefined, onlyJs);
}

/**
 * @name evmToAddress
 * @summary Converts an EVM address to its corresponding SS58 address.
 */

function evmToAddress(evmAddress, ss58Format) {
  var hashType = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'blake2';
  var message = u8aConcat('evm:', evmAddress);
  assert(message.length === 24, function () {
    return "Converting ".concat(evmAddress, ": Invalid evm address length");
  });
  return encodeAddress(hasher(hashType, message), ss58Format);
}

/**
 * @name addressEq
 * @summary Compares two addresses, either in ss58, Uint8Array or hex format.
 * @description
 * For the input values, return true is the underlying public keys do match.
 * @example
 * <BR>
 *
 * ```javascript
 * import { u8aEq } from '@polkadot/util';
 *
 * u8aEq(new Uint8Array([0x68, 0x65]), new Uint8Array([0x68, 0x65])); // true
 * ```
 */

function addressEq(a, b) {
  return u8aEq(decodeAddress(a), decodeAddress(b));
}

function validateAddress(encoded, ignoreChecksum, ss58Format) {
  return !!decodeAddress(encoded, ignoreChecksum, ss58Format);
}

function isAddress(address, ignoreChecksum, ss58Format) {
  try {
    return validateAddress(address, ignoreChecksum, ss58Format);
  } catch (error) {
    return false;
  }
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

function sortAddresses(addresses, ss58Format) {
  var u8aToAddress = function u8aToAddress(u8a) {
    return encodeAddress(u8a, ss58Format);
  };

  return u8aSorted(addresses.map(addressToU8a)).map(u8aToAddress);
}

var chars = 'abcdefghijklmnopqrstuvwxyz234567';
var config$1 = {
  chars: chars,
  coder: base.utils.chain( // We define our own chain, the default base32 has padding
  base.utils.radix2(5), base.utils.alphabet(chars), {
    decode: function decode(input) {
      return input.split('');
    },
    encode: function encode(input) {
      return input.join('');
    }
  }),
  ipfs: 'b',
  type: 'base32'
};
/**
 * @name base32Validate
 * @summary Validates a base32 value.
 * @description
 * Validates that the supplied value is valid base32, throwing exceptions if not
 */

var base32Validate = createValidate(config$1);
/**
* @name isBase32
* @description Checks if the input is in base32, returning true/false
*/

var isBase32 = createIs(base32Validate);
/**
 * @name base32Decode
 * @summary Delookup a base32 value.
 * @description
 * From the provided input, decode the base32 and return the result as an `Uint8Array`.
 */

var base32Decode = createDecode(config$1, base32Validate);
/**
* @name base32Encode
* @summary Creates a base32 value.
* @description
* From the provided input, create the base32 and return the result as a string.
*/

var base32Encode = createEncode(config$1);

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
 * @name isBase64
 * @description Checks if the input is in base64, returning true/false
 */

var isBase64 = createIs(base64Validate);
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

// Copyright 2017-2022 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name base64Pad
 * @description Adds padding characters for correct length
 */
function base64Pad(value) {
  return value.padEnd(value.length + value.length % 4, '=');
}

// Copyright 2017-2022 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name base64Trim
 * @description Trims padding characters
 */
function base64Trim(value) {
  while (value.length && value[value.length - 1] === '=') {
    value = value.slice(0, -1);
  }

  return value;
}

var cryptoIsReady = isReady;
function cryptoWaitReady() {
  return waitReady().then(function () {
    assert(isReady(), 'Unable to initialize @polkadot/util-crypto');
    return true;
  })["catch"](function () {
    return false;
  });
}

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
// https://github.com/indutny/elliptic/blob/e71b2d9359c5fe9437fbf46f1f05096de447de57/lib/elliptic/curves.js#L182

var N = 'ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141'.replace(/ /g, '');
var N_BI = JSBI.BigInt("0x".concat(N));
var N_BN = new BN(N, 'hex');

function addBi(seckey, tweak) {
  var res = u8aToBigInt(tweak, BN_BE_OPTS);
  assert(maybeJSBI$8.lessThan(res, N_BI), 'Tweak parameter is out of range');
  res = maybeJSBI$8.add(res, u8aToBigInt(seckey, BN_BE_OPTS));

  if (maybeJSBI$8.greaterThanOrEqual(res, N_BI)) {
    res = maybeJSBI$8.subtract(res, N_BI);
  }

  assert(maybeJSBI$8.notEqual(res, _0n$2), 'Invalid resulting private key');
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

function isInvalidChar(_char, _byte) {
  return maybeJSBI$7.notEqual(_char, _byte > 7 ? _char.toUpperCase() : _char.toLowerCase());
}

function isEthereumChecksum(_address) {
  var address = _address.replace('0x', '');

  var hash = u8aToHex(keccakAsU8a(address.toLowerCase()), -1, false);

  for (var i = 0; i < 40; i++) {
    if (isInvalidChar(address[i], parseInt(hash[i], 16))) {
      return false;
    }
  }

  return true;
}

function isEthereumAddress(address) {
  if (!address || address.length !== 42 || !isHex(address)) {
    return false;
  } else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
    return true;
  }

  return isEthereumChecksum(address);
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
  var data = maybeJSBI$6.greaterThanOrEqual(index, HARDENED) ? u8aConcat(new Uint8Array(1), hd.secretKey, indexBuffer) : u8aConcat(hd.publicKey, indexBuffer);

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
      hd = deriveChild(hd, maybeJSBI$6.add(parseInt(p, 10), p.length > 1 && p.endsWith("'") ? HARDENED : 0));
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return hd;
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

        _x = Ti, _y = i, _x[_y] = maybeJSBI$5.bitwiseXor(_x[_y], u[i]);
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
/**
 * @name sha512AsU8a
 * @summary Creates a sha512 Uint8Array from the input.
 */

var sha512AsU8a = createBitHasher(512, shaAsU8a);

// Copyright 2017-2022 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Adapted from the bitcoinjs/bip39 source
// https://github.com/bitcoinjs/bip39/blob/1d063b6a6aee4145b34d701037cd3e67f5446ff9/ts_src/
var DEFAULT_WORDLIST = 'abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident|account|accuse|achieve|acid|acoustic|acquire|across|act|action|actor|actress|actual|adapt|add|addict|address|adjust|admit|adult|advance|advice|aerobic|affair|afford|afraid|again|age|agent|agree|ahead|aim|air|airport|aisle|alarm|album|alcohol|alert|alien|all|alley|allow|almost|alone|alpha|already|also|alter|always|amateur|amazing|among|amount|amused|analyst|anchor|ancient|anger|angle|angry|animal|ankle|announce|annual|another|answer|antenna|antique|anxiety|any|apart|apology|appear|apple|approve|april|arch|arctic|area|arena|argue|arm|armed|armor|army|around|arrange|arrest|arrive|arrow|art|artefact|artist|artwork|ask|aspect|assault|asset|assist|assume|asthma|athlete|atom|attack|attend|attitude|attract|auction|audit|august|aunt|author|auto|autumn|average|avocado|avoid|awake|aware|away|awesome|awful|awkward|axis|baby|bachelor|bacon|badge|bag|balance|balcony|ball|bamboo|banana|banner|bar|barely|bargain|barrel|base|basic|basket|battle|beach|bean|beauty|because|become|beef|before|begin|behave|behind|believe|below|belt|bench|benefit|best|betray|better|between|beyond|bicycle|bid|bike|bind|biology|bird|birth|bitter|black|blade|blame|blanket|blast|bleak|bless|blind|blood|blossom|blouse|blue|blur|blush|board|boat|body|boil|bomb|bone|bonus|book|boost|border|boring|borrow|boss|bottom|bounce|box|boy|bracket|brain|brand|brass|brave|bread|breeze|brick|bridge|brief|bright|bring|brisk|broccoli|broken|bronze|broom|brother|brown|brush|bubble|buddy|budget|buffalo|build|bulb|bulk|bullet|bundle|bunker|burden|burger|burst|bus|business|busy|butter|buyer|buzz|cabbage|cabin|cable|cactus|cage|cake|call|calm|camera|camp|can|canal|cancel|candy|cannon|canoe|canvas|canyon|capable|capital|captain|car|carbon|card|cargo|carpet|carry|cart|case|cash|casino|castle|casual|cat|catalog|catch|category|cattle|caught|cause|caution|cave|ceiling|celery|cement|census|century|cereal|certain|chair|chalk|champion|change|chaos|chapter|charge|chase|chat|cheap|check|cheese|chef|cherry|chest|chicken|chief|child|chimney|choice|choose|chronic|chuckle|chunk|churn|cigar|cinnamon|circle|citizen|city|civil|claim|clap|clarify|claw|clay|clean|clerk|clever|click|client|cliff|climb|clinic|clip|clock|clog|close|cloth|cloud|clown|club|clump|cluster|clutch|coach|coast|coconut|code|coffee|coil|coin|collect|color|column|combine|come|comfort|comic|common|company|concert|conduct|confirm|congress|connect|consider|control|convince|cook|cool|copper|copy|coral|core|corn|correct|cost|cotton|couch|country|couple|course|cousin|cover|coyote|crack|cradle|craft|cram|crane|crash|crater|crawl|crazy|cream|credit|creek|crew|cricket|crime|crisp|critic|crop|cross|crouch|crowd|crucial|cruel|cruise|crumble|crunch|crush|cry|crystal|cube|culture|cup|cupboard|curious|current|curtain|curve|cushion|custom|cute|cycle|dad|damage|damp|dance|danger|daring|dash|daughter|dawn|day|deal|debate|debris|decade|december|decide|decline|decorate|decrease|deer|defense|define|defy|degree|delay|deliver|demand|demise|denial|dentist|deny|depart|depend|deposit|depth|deputy|derive|describe|desert|design|desk|despair|destroy|detail|detect|develop|device|devote|diagram|dial|diamond|diary|dice|diesel|diet|differ|digital|dignity|dilemma|dinner|dinosaur|direct|dirt|disagree|discover|disease|dish|dismiss|disorder|display|distance|divert|divide|divorce|dizzy|doctor|document|dog|doll|dolphin|domain|donate|donkey|donor|door|dose|double|dove|draft|dragon|drama|drastic|draw|dream|dress|drift|drill|drink|drip|drive|drop|drum|dry|duck|dumb|dune|during|dust|dutch|duty|dwarf|dynamic|eager|eagle|early|earn|earth|easily|east|easy|echo|ecology|economy|edge|edit|educate|effort|egg|eight|either|elbow|elder|electric|elegant|element|elephant|elevator|elite|else|embark|embody|embrace|emerge|emotion|employ|empower|empty|enable|enact|end|endless|endorse|enemy|energy|enforce|engage|engine|enhance|enjoy|enlist|enough|enrich|enroll|ensure|enter|entire|entry|envelope|episode|equal|equip|era|erase|erode|erosion|error|erupt|escape|essay|essence|estate|eternal|ethics|evidence|evil|evoke|evolve|exact|example|excess|exchange|excite|exclude|excuse|execute|exercise|exhaust|exhibit|exile|exist|exit|exotic|expand|expect|expire|explain|expose|express|extend|extra|eye|eyebrow|fabric|face|faculty|fade|faint|faith|fall|false|fame|family|famous|fan|fancy|fantasy|farm|fashion|fat|fatal|father|fatigue|fault|favorite|feature|february|federal|fee|feed|feel|female|fence|festival|fetch|fever|few|fiber|fiction|field|figure|file|film|filter|final|find|fine|finger|finish|fire|firm|first|fiscal|fish|fit|fitness|fix|flag|flame|flash|flat|flavor|flee|flight|flip|float|flock|floor|flower|fluid|flush|fly|foam|focus|fog|foil|fold|follow|food|foot|force|forest|forget|fork|fortune|forum|forward|fossil|foster|found|fox|fragile|frame|frequent|fresh|friend|fringe|frog|front|frost|frown|frozen|fruit|fuel|fun|funny|furnace|fury|future|gadget|gain|galaxy|gallery|game|gap|garage|garbage|garden|garlic|garment|gas|gasp|gate|gather|gauge|gaze|general|genius|genre|gentle|genuine|gesture|ghost|giant|gift|giggle|ginger|giraffe|girl|give|glad|glance|glare|glass|glide|glimpse|globe|gloom|glory|glove|glow|glue|goat|goddess|gold|good|goose|gorilla|gospel|gossip|govern|gown|grab|grace|grain|grant|grape|grass|gravity|great|green|grid|grief|grit|grocery|group|grow|grunt|guard|guess|guide|guilt|guitar|gun|gym|habit|hair|half|hammer|hamster|hand|happy|harbor|hard|harsh|harvest|hat|have|hawk|hazard|head|health|heart|heavy|hedgehog|height|hello|helmet|help|hen|hero|hidden|high|hill|hint|hip|hire|history|hobby|hockey|hold|hole|holiday|hollow|home|honey|hood|hope|horn|horror|horse|hospital|host|hotel|hour|hover|hub|huge|human|humble|humor|hundred|hungry|hunt|hurdle|hurry|hurt|husband|hybrid|ice|icon|idea|identify|idle|ignore|ill|illegal|illness|image|imitate|immense|immune|impact|impose|improve|impulse|inch|include|income|increase|index|indicate|indoor|industry|infant|inflict|inform|inhale|inherit|initial|inject|injury|inmate|inner|innocent|input|inquiry|insane|insect|inside|inspire|install|intact|interest|into|invest|invite|involve|iron|island|isolate|issue|item|ivory|jacket|jaguar|jar|jazz|jealous|jeans|jelly|jewel|job|join|joke|journey|joy|judge|juice|jump|jungle|junior|junk|just|kangaroo|keen|keep|ketchup|key|kick|kid|kidney|kind|kingdom|kiss|kit|kitchen|kite|kitten|kiwi|knee|knife|knock|know|lab|label|labor|ladder|lady|lake|lamp|language|laptop|large|later|latin|laugh|laundry|lava|law|lawn|lawsuit|layer|lazy|leader|leaf|learn|leave|lecture|left|leg|legal|legend|leisure|lemon|lend|length|lens|leopard|lesson|letter|level|liar|liberty|library|license|life|lift|light|like|limb|limit|link|lion|liquid|list|little|live|lizard|load|loan|lobster|local|lock|logic|lonely|long|loop|lottery|loud|lounge|love|loyal|lucky|luggage|lumber|lunar|lunch|luxury|lyrics|machine|mad|magic|magnet|maid|mail|main|major|make|mammal|man|manage|mandate|mango|mansion|manual|maple|marble|march|margin|marine|market|marriage|mask|mass|master|match|material|math|matrix|matter|maximum|maze|meadow|mean|measure|meat|mechanic|medal|media|melody|melt|member|memory|mention|menu|mercy|merge|merit|merry|mesh|message|metal|method|middle|midnight|milk|million|mimic|mind|minimum|minor|minute|miracle|mirror|misery|miss|mistake|mix|mixed|mixture|mobile|model|modify|mom|moment|monitor|monkey|monster|month|moon|moral|more|morning|mosquito|mother|motion|motor|mountain|mouse|move|movie|much|muffin|mule|multiply|muscle|museum|mushroom|music|must|mutual|myself|mystery|myth|naive|name|napkin|narrow|nasty|nation|nature|near|neck|need|negative|neglect|neither|nephew|nerve|nest|net|network|neutral|never|news|next|nice|night|noble|noise|nominee|noodle|normal|north|nose|notable|note|nothing|notice|novel|now|nuclear|number|nurse|nut|oak|obey|object|oblige|obscure|observe|obtain|obvious|occur|ocean|october|odor|off|offer|office|often|oil|okay|old|olive|olympic|omit|once|one|onion|online|only|open|opera|opinion|oppose|option|orange|orbit|orchard|order|ordinary|organ|orient|original|orphan|ostrich|other|outdoor|outer|output|outside|oval|oven|over|own|owner|oxygen|oyster|ozone|pact|paddle|page|pair|palace|palm|panda|panel|panic|panther|paper|parade|parent|park|parrot|party|pass|patch|path|patient|patrol|pattern|pause|pave|payment|peace|peanut|pear|peasant|pelican|pen|penalty|pencil|people|pepper|perfect|permit|person|pet|phone|photo|phrase|physical|piano|picnic|picture|piece|pig|pigeon|pill|pilot|pink|pioneer|pipe|pistol|pitch|pizza|place|planet|plastic|plate|play|please|pledge|pluck|plug|plunge|poem|poet|point|polar|pole|police|pond|pony|pool|popular|portion|position|possible|post|potato|pottery|poverty|powder|power|practice|praise|predict|prefer|prepare|present|pretty|prevent|price|pride|primary|print|priority|prison|private|prize|problem|process|produce|profit|program|project|promote|proof|property|prosper|protect|proud|provide|public|pudding|pull|pulp|pulse|pumpkin|punch|pupil|puppy|purchase|purity|purpose|purse|push|put|puzzle|pyramid|quality|quantum|quarter|question|quick|quit|quiz|quote|rabbit|raccoon|race|rack|radar|radio|rail|rain|raise|rally|ramp|ranch|random|range|rapid|rare|rate|rather|raven|raw|razor|ready|real|reason|rebel|rebuild|recall|receive|recipe|record|recycle|reduce|reflect|reform|refuse|region|regret|regular|reject|relax|release|relief|rely|remain|remember|remind|remove|render|renew|rent|reopen|repair|repeat|replace|report|require|rescue|resemble|resist|resource|response|result|retire|retreat|return|reunion|reveal|review|reward|rhythm|rib|ribbon|rice|rich|ride|ridge|rifle|right|rigid|ring|riot|ripple|risk|ritual|rival|river|road|roast|robot|robust|rocket|romance|roof|rookie|room|rose|rotate|rough|round|route|royal|rubber|rude|rug|rule|run|runway|rural|sad|saddle|sadness|safe|sail|salad|salmon|salon|salt|salute|same|sample|sand|satisfy|satoshi|sauce|sausage|save|say|scale|scan|scare|scatter|scene|scheme|school|science|scissors|scorpion|scout|scrap|screen|script|scrub|sea|search|season|seat|second|secret|section|security|seed|seek|segment|select|sell|seminar|senior|sense|sentence|series|service|session|settle|setup|seven|shadow|shaft|shallow|share|shed|shell|sheriff|shield|shift|shine|ship|shiver|shock|shoe|shoot|shop|short|shoulder|shove|shrimp|shrug|shuffle|shy|sibling|sick|side|siege|sight|sign|silent|silk|silly|silver|similar|simple|since|sing|siren|sister|situate|six|size|skate|sketch|ski|skill|skin|skirt|skull|slab|slam|sleep|slender|slice|slide|slight|slim|slogan|slot|slow|slush|small|smart|smile|smoke|smooth|snack|snake|snap|sniff|snow|soap|soccer|social|sock|soda|soft|solar|soldier|solid|solution|solve|someone|song|soon|sorry|sort|soul|sound|soup|source|south|space|spare|spatial|spawn|speak|special|speed|spell|spend|sphere|spice|spider|spike|spin|spirit|split|spoil|sponsor|spoon|sport|spot|spray|spread|spring|spy|square|squeeze|squirrel|stable|stadium|staff|stage|stairs|stamp|stand|start|state|stay|steak|steel|stem|step|stereo|stick|still|sting|stock|stomach|stone|stool|story|stove|strategy|street|strike|strong|struggle|student|stuff|stumble|style|subject|submit|subway|success|such|sudden|suffer|sugar|suggest|suit|summer|sun|sunny|sunset|super|supply|supreme|sure|surface|surge|surprise|surround|survey|suspect|sustain|swallow|swamp|swap|swarm|swear|sweet|swift|swim|swing|switch|sword|symbol|symptom|syrup|system|table|tackle|tag|tail|talent|talk|tank|tape|target|task|taste|tattoo|taxi|teach|team|tell|ten|tenant|tennis|tent|term|test|text|thank|that|theme|then|theory|there|they|thing|this|thought|three|thrive|throw|thumb|thunder|ticket|tide|tiger|tilt|timber|time|tiny|tip|tired|tissue|title|toast|tobacco|today|toddler|toe|together|toilet|token|tomato|tomorrow|tone|tongue|tonight|tool|tooth|top|topic|topple|torch|tornado|tortoise|toss|total|tourist|toward|tower|town|toy|track|trade|traffic|tragic|train|transfer|trap|trash|travel|tray|treat|tree|trend|trial|tribe|trick|trigger|trim|trip|trophy|trouble|truck|true|truly|trumpet|trust|truth|try|tube|tuition|tumble|tuna|tunnel|turkey|turn|turtle|twelve|twenty|twice|twin|twist|two|type|typical|ugly|umbrella|unable|unaware|uncle|uncover|under|undo|unfair|unfold|unhappy|uniform|unique|unit|universe|unknown|unlock|until|unusual|unveil|update|upgrade|uphold|upon|upper|upset|urban|urge|usage|use|used|useful|useless|usual|utility|vacant|vacuum|vague|valid|valley|valve|van|vanish|vapor|various|vast|vault|vehicle|velvet|vendor|venture|venue|verb|verify|version|very|vessel|veteran|viable|vibrant|vicious|victory|video|view|village|vintage|violin|virtual|virus|visa|visit|visual|vital|vivid|vocal|voice|void|volcano|volume|vote|voyage|wage|wagon|wait|walk|wall|walnut|want|warfare|warm|warrior|wash|wasp|waste|water|wave|way|wealth|weapon|wear|weasel|weather|web|wedding|weekend|weird|welcome|west|wet|whale|what|wheat|wheel|when|where|whip|whisper|wide|width|wife|wild|will|win|window|wine|wing|wink|winner|winter|wire|wisdom|wise|wish|witness|wolf|woman|wonder|wood|wool|word|work|world|worry|worth|wrap|wreck|wrestle|wrist|write|wrong|yard|year|yellow|you|young|youth|zebra|zero|zone|zoo'.split('|');

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
  assert(maybeJSBI$4.equal(newChecksum, checksumBits), INVALID_CHECKSUM);
  return entropy;
}
function entropyToMnemonic(entropy) {
  // 128 <= ENT <= 256
  assert(entropy.length % 4 === 0 && entropy.length >= 16 && entropy.length <= 32, INVALID_ENTROPY);
  var entropyBits = bytesToBinary(Array.from(entropy));
  var checksumBits = deriveChecksumBits(entropy); // we just set it prior, so this is a safe check
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion

  return maybeJSBI$4.add(entropyBits, checksumBits).match(/(.{1,11})/g).map(function (binary) {
    return DEFAULT_WORDLIST[binaryToByte(binary)];
  }).join(' ');
}
function generateMnemonic(strength) {
  strength = strength || 128;
  assert(strength % 32 === 0, INVALID_ENTROPY);
  return entropyToMnemonic(randomAsU8a(strength / 8));
}
function validateMnemonic(mnemonic) {
  try {
    mnemonicToEntropy$1(mnemonic);
  } catch (e) {
    return false;
  }

  return true;
}

var STRENGTH_MAP = {
  12: 16 * 8,
  15: 20 * 8,
  18: 24 * 8,
  21: 28 * 8,
  24: 32 * 8
};
/**
 * @name mnemonicGenerate
 * @summary Creates a valid mnemonic string using using [BIP39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki).
 * @example
 * <BR>
 *
 * ```javascript
 * import { mnemonicGenerate } from '@polkadot/util-crypto';
 *
 * const mnemonic = mnemonicGenerate(); // => string
 * ```
 */

function mnemonicGenerate() {
  var numWords = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 12;
  var onlyJs = arguments.length > 1 ? arguments[1] : undefined;
  return !hasBigInt || !onlyJs && isReady() ? bip39Generate(numWords) : generateMnemonic(STRENGTH_MAP[numWords]);
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

function ledgerDerivePrivate(xprv, index) {
  var kl = xprv.subarray(0, 32);
  var kr = xprv.subarray(32, 64);
  var cc = xprv.subarray(64, 96);
  var data = u8aConcat([0], kl, kr, bnToU8a(index, BN_LE_32_OPTS));
  var z = hmacShaAsU8a(cc, data, 512);
  data[0] = 0x01;
  return u8aConcat(bnToU8a(u8aToBn(kl, BN_LE_OPTS).iadd(u8aToBn(z.subarray(0, 28), BN_LE_OPTS).imul(BN_EIGHT)), BN_LE_512_OPTS).subarray(0, 32), bnToU8a(u8aToBn(kr, BN_LE_OPTS).iadd(u8aToBn(z.subarray(32, 64), BN_LE_OPTS)), BN_LE_512_OPTS).subarray(0, 32), hmacShaAsU8a(cc, data, 512).subarray(32, 64));
}

var ED25519_CRYPTO = 'ed25519 seed'; // gets an xprv from a mnemonic

function ledgerMaster(mnemonic, password) {
  var seed = mnemonicToSeedSync(mnemonic, password);
  var chainCode = hmacShaAsU8a(ED25519_CRYPTO, new Uint8Array([1].concat(_toConsumableArray(seed))), 256);
  var priv;

  while (!priv || priv[31] & 32) {
    priv = hmacShaAsU8a(ED25519_CRYPTO, priv || seed, 512);
  }

  priv[0] &= 248;
  priv[31] &= 127;
  priv[31] |= 64;
  return u8aConcat(priv, chainCode);
}

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
function hdLedger(_mnemonic, path) {
  var words = _mnemonic.split(' ').map(function (s) {
    return s.trim();
  }).filter(function (s) {
    return s;
  });

  assert([12, 24, 25].includes(words.length), 'Expected a mnemonic with 24 words (or 25 including a password)');

  var _ref = words.length === 25 ? [words.slice(0, 24).join(' '), words[24]] : [words.join(' '), ''],
      _ref2 = _slicedToArray(_ref, 2),
      mnemonic = _ref2[0],
      password = _ref2[1];

  assert(mnemonicValidate(mnemonic), 'Invalid mnemonic passed to ledger derivation');
  assert(hdValidatePath(path), 'Invalid derivation path');
  var parts = path.split('/').slice(1);
  var seed = ledgerMaster(mnemonic, password);

  var _iterator = _createForOfIteratorHelper(parts),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var p = _step.value;
      var n = parseInt(p.replace(/'$/, ''), 10);
      seed = ledgerDerivePrivate(seed, maybeJSBI$3.lessThan(n, HARDENED) ? maybeJSBI$3.add(n, HARDENED) : n);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return ed25519PairFromSeed(seed.slice(0, 32));
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
 * @name naclBoxPairFromSecret
 * @summary Creates a new public/secret box keypair from a secret.
 * @description
 * Returns a object containing a box `publicKey` & `secretKey` generated from the supplied secret.
 * @example
 * <BR>
 *
 * ```javascript
 * import { naclBoxPairFromSecret } from '@polkadot/util-crypto';
 *
 * naclBoxPairFromSecret(...); // => { secretKey: [...], publicKey: [...] }
 * ```
 */

function naclBoxPairFromSecret(secret) {
  return nacl.box.keyPair.fromSecretKey(secret.slice(0, 32));
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

var rotl$1 = function rotl(a, b) {
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
    x04 = maybeJSBI$2.bitwiseXor(x04, rotl$1(maybeJSBI$2.add(x00, x12) | 0, 7));
    x08 = maybeJSBI$2.bitwiseXor(x08, rotl$1(maybeJSBI$2.add(x04, x00) | 0, 9));
    x12 = maybeJSBI$2.bitwiseXor(x12, rotl$1(maybeJSBI$2.add(x08, x04) | 0, 13));
    x00 = maybeJSBI$2.bitwiseXor(x00, rotl$1(maybeJSBI$2.add(x12, x08) | 0, 18));
    x09 = maybeJSBI$2.bitwiseXor(x09, rotl$1(maybeJSBI$2.add(x05, x01) | 0, 7));
    x13 = maybeJSBI$2.bitwiseXor(x13, rotl$1(maybeJSBI$2.add(x09, x05) | 0, 9));
    x01 = maybeJSBI$2.bitwiseXor(x01, rotl$1(maybeJSBI$2.add(x13, x09) | 0, 13));
    x05 = maybeJSBI$2.bitwiseXor(x05, rotl$1(maybeJSBI$2.add(x01, x13) | 0, 18));
    x14 = maybeJSBI$2.bitwiseXor(x14, rotl$1(maybeJSBI$2.add(x10, x06) | 0, 7));
    x02 = maybeJSBI$2.bitwiseXor(x02, rotl$1(maybeJSBI$2.add(x14, x10) | 0, 9));
    x06 = maybeJSBI$2.bitwiseXor(x06, rotl$1(maybeJSBI$2.add(x02, x14) | 0, 13));
    x10 = maybeJSBI$2.bitwiseXor(x10, rotl$1(maybeJSBI$2.add(x06, x02) | 0, 18));
    x03 = maybeJSBI$2.bitwiseXor(x03, rotl$1(maybeJSBI$2.add(x15, x11) | 0, 7));
    x07 = maybeJSBI$2.bitwiseXor(x07, rotl$1(maybeJSBI$2.add(x03, x15) | 0, 9));
    x11 = maybeJSBI$2.bitwiseXor(x11, rotl$1(maybeJSBI$2.add(x07, x03) | 0, 13));
    x15 = maybeJSBI$2.bitwiseXor(x15, rotl$1(maybeJSBI$2.add(x11, x07) | 0, 18));
    x01 = maybeJSBI$2.bitwiseXor(x01, rotl$1(maybeJSBI$2.add(x00, x03) | 0, 7));
    x02 = maybeJSBI$2.bitwiseXor(x02, rotl$1(maybeJSBI$2.add(x01, x00) | 0, 9));
    x03 = maybeJSBI$2.bitwiseXor(x03, rotl$1(maybeJSBI$2.add(x02, x01) | 0, 13));
    x00 = maybeJSBI$2.bitwiseXor(x00, rotl$1(maybeJSBI$2.add(x03, x02) | 0, 18));
    x06 = maybeJSBI$2.bitwiseXor(x06, rotl$1(maybeJSBI$2.add(x05, x04) | 0, 7));
    x07 = maybeJSBI$2.bitwiseXor(x07, rotl$1(maybeJSBI$2.add(x06, x05) | 0, 9));
    x04 = maybeJSBI$2.bitwiseXor(x04, rotl$1(maybeJSBI$2.add(x07, x06) | 0, 13));
    x05 = maybeJSBI$2.bitwiseXor(x05, rotl$1(maybeJSBI$2.add(x04, x07) | 0, 18));
    x11 = maybeJSBI$2.bitwiseXor(x11, rotl$1(maybeJSBI$2.add(x10, x09) | 0, 7));
    x08 = maybeJSBI$2.bitwiseXor(x08, rotl$1(maybeJSBI$2.add(x11, x10) | 0, 9));
    x09 = maybeJSBI$2.bitwiseXor(x09, rotl$1(maybeJSBI$2.add(x08, x11) | 0, 13));
    x10 = maybeJSBI$2.bitwiseXor(x10, rotl$1(maybeJSBI$2.add(x09, x08) | 0, 18));
    x12 = maybeJSBI$2.bitwiseXor(x12, rotl$1(maybeJSBI$2.add(x15, x14) | 0, 7));
    x13 = maybeJSBI$2.bitwiseXor(x13, rotl$1(maybeJSBI$2.add(x12, x15) | 0, 9));
    x14 = maybeJSBI$2.bitwiseXor(x14, rotl$1(maybeJSBI$2.add(x13, x12) | 0, 13));
    x15 = maybeJSBI$2.bitwiseXor(x15, rotl$1(maybeJSBI$2.add(x14, x13) | 0, 18));
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
  var B32 = u32$1(B); // Re-used between parallel iterations. Array(iterations) of B

  var V = u32$1(new Uint8Array(blockSize * N));
  var tmp = u32$1(new Uint8Array(blockSize));

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

function jsonDecrypt(_ref, passphrase) {
  var encoded = _ref.encoded,
      encoding = _ref.encoding;
  assert(encoded, 'No encrypted data available to decode');
  return jsonDecryptData(isHex(encoded) ? hexToU8a(encoded) : base64Decode(encoded), passphrase, Array.isArray(encoding.type) ? encoding.type : [encoding.type]);
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

function jsonEncrypt(data, contentType, passphrase) {
  var isEncrypted = false;
  var encoded = data;

  if (passphrase) {
    var _scryptEncode = scryptEncode(passphrase),
        params = _scryptEncode.params,
        password = _scryptEncode.password,
        salt = _scryptEncode.salt;

    var _naclEncrypt = naclEncrypt(encoded, password.subarray(0, 32)),
        encrypted = _naclEncrypt.encrypted,
        nonce = _naclEncrypt.nonce;

    isEncrypted = true;
    encoded = u8aConcat(scryptToU8a(salt, params), nonce, encrypted);
  }

  return jsonEncryptFormat(encoded, contentType, isEncrypted);
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
//
// xxHash64 implementation in pure Javascript
// Copyright (C) 2016, Pierre Curto
// MIT license
//
// Changes made:
//   - converted to TypeScript
//   - uses native JS BigInt (no external dependencies)
//   - support only for Uint8Array inputs
//   - no constructor function, straight fill & digest
//   - update code removed, only called once, no streams

var P64_1 = JSBI.BigInt('11400714785074694791');
var P64_2 = JSBI.BigInt('14029467366897019727');
var P64_3 = JSBI.BigInt('1609587929392839161');
var P64_4 = JSBI.BigInt('9650029242287828579');
var P64_5 = JSBI.BigInt('2870177450012600261'); // mask for a u64, all bits set

var U64 = JSBI.BigInt('0xffffffffffffffff'); // various constants

var _7n = JSBI.BigInt(7);

var _11n = JSBI.BigInt(11);

var _12n = JSBI.BigInt(12);

var _16n = JSBI.BigInt(16);

var _18n = JSBI.BigInt(18);

var _23n = JSBI.BigInt(23);

var _27n = JSBI.BigInt(27);

var _29n = JSBI.BigInt(29);

var _31n = JSBI.BigInt(31);

var _32n = JSBI.BigInt(32);

var _33n = JSBI.BigInt(33);

var _64n = JSBI.BigInt(64);

var _256n = JSBI.BigInt(256);

function rotl(a, b) {
  var c = maybeJSBI.bitwiseAnd(a, U64);
  return maybeJSBI.bitwiseAnd(maybeJSBI.bitwiseOr(maybeJSBI.leftShift(c, b), maybeJSBI.signedRightShift(c, maybeJSBI.subtract(_64n, b))), U64);
}

function fromU8a(u8a, p, count) {
  var bigints = new Array(count);
  var offset = 0;

  for (var i = 0; i < count; i++, offset += 2) {
    bigints[i] = JSBI.BigInt(u8a[p + offset] | u8a[p + 1 + offset] << 8);
  }

  var result = _0n$2;

  for (var _i = count - 1; _i >= 0; _i--) {
    result = maybeJSBI.add(maybeJSBI.leftShift(result, _16n), bigints[_i]);
  }

  return result;
}

function toU8a(h64) {
  var result = new Uint8Array(8);

  for (var i = 7; i >= 0; i--) {
    result[i] = maybeJSBI.toNumber(maybeJSBI.remainder(h64, _256n));
    h64 = maybeJSBI.divide(h64, _256n);
  }

  return result;
}

function state(initSeed) {
  var seed = JSBI.BigInt(initSeed);
  return {
    seed: seed,
    u8a: new Uint8Array(32),
    u8asize: 0,
    v1: maybeJSBI.add(maybeJSBI.add(seed, P64_1), P64_2),
    v2: maybeJSBI.add(seed, P64_2),
    v3: seed,
    v4: maybeJSBI.subtract(seed, P64_1)
  };
}

function init(state, input) {
  if (input.length < 32) {
    state.u8a.set(input);
    state.u8asize = input.length;
    return state;
  }

  var limit = input.length - 32;
  var p = 0;

  if (limit >= 0) {
    var adjustV = function adjustV(v) {
      return maybeJSBI.multiply(P64_1, rotl(maybeJSBI.add(v, maybeJSBI.multiply(P64_2, fromU8a(input, p, 4))), _31n));
    };

    do {
      state.v1 = adjustV(state.v1);
      p += 8;
      state.v2 = adjustV(state.v2);
      p += 8;
      state.v3 = adjustV(state.v3);
      p += 8;
      state.v4 = adjustV(state.v4);
      p += 8;
    } while (p <= limit);
  }

  if (p < input.length) {
    state.u8a.set(input.subarray(p, input.length));
    state.u8asize = input.length - p;
  }

  return state;
}

function xxhash64(input, initSeed) {
  var _init = init(state(initSeed), input),
      seed = _init.seed,
      u8a = _init.u8a,
      u8asize = _init.u8asize,
      v1 = _init.v1,
      v2 = _init.v2,
      v3 = _init.v3,
      v4 = _init.v4;

  var p = 0;
  var h64 = JSBI.bitwiseAnd(U64, JSBI.add(JSBI.BigInt(input.length), input.length >= 32 ? maybeJSBI.add(maybeJSBI.multiply(maybeJSBI.bitwiseXor(maybeJSBI.add(maybeJSBI.multiply(maybeJSBI.bitwiseXor(maybeJSBI.add(maybeJSBI.multiply(maybeJSBI.bitwiseXor(maybeJSBI.add(maybeJSBI.multiply(maybeJSBI.bitwiseXor(maybeJSBI.add(maybeJSBI.add(maybeJSBI.add(rotl(v1, _1n$2), rotl(v2, _7n)), rotl(v3, _12n)), rotl(v4, _18n)), maybeJSBI.multiply(P64_1, rotl(maybeJSBI.multiply(v1, P64_2), _31n))), P64_1), P64_4), maybeJSBI.multiply(P64_1, rotl(maybeJSBI.multiply(v2, P64_2), _31n))), P64_1), P64_4), maybeJSBI.multiply(P64_1, rotl(maybeJSBI.multiply(v3, P64_2), _31n))), P64_1), P64_4), maybeJSBI.multiply(P64_1, rotl(maybeJSBI.multiply(v4, P64_2), _31n))), P64_1), P64_4) : maybeJSBI.add(seed, P64_5)));

  while (p <= u8asize - 8) {
    h64 = maybeJSBI.bitwiseAnd(U64, maybeJSBI.add(P64_4, maybeJSBI.multiply(P64_1, rotl(maybeJSBI.bitwiseXor(h64, maybeJSBI.multiply(P64_1, rotl(maybeJSBI.multiply(P64_2, fromU8a(u8a, p, 4)), _31n))), _27n))));
    p += 8;
  }

  if (p + 4 <= u8asize) {
    h64 = maybeJSBI.bitwiseAnd(U64, maybeJSBI.add(P64_3, maybeJSBI.multiply(P64_2, rotl(maybeJSBI.bitwiseXor(h64, maybeJSBI.multiply(P64_1, fromU8a(u8a, p, 2))), _23n))));
    p += 4;
  }

  while (p < u8asize) {
    h64 = maybeJSBI.bitwiseAnd(U64, maybeJSBI.multiply(P64_1, rotl(JSBI.bitwiseXor(h64, JSBI.multiply(P64_5, JSBI.BigInt(u8a[p++]))), _11n)));
  }

  h64 = maybeJSBI.bitwiseAnd(U64, maybeJSBI.multiply(P64_2, maybeJSBI.bitwiseXor(h64, maybeJSBI.signedRightShift(h64, _33n))));
  h64 = maybeJSBI.bitwiseAnd(U64, maybeJSBI.multiply(P64_3, maybeJSBI.bitwiseXor(h64, maybeJSBI.signedRightShift(h64, _29n))));
  return toU8a(maybeJSBI.bitwiseAnd(U64, maybeJSBI.bitwiseXor(h64, maybeJSBI.signedRightShift(h64, _32n))));
}

/**
 * @name xxhashAsU8a
 * @summary Creates a xxhash64 u8a from the input.
 * @description
 * From either a `string`, `Uint8Array` or a `Buffer` input, create the xxhash64 and return the result as a `Uint8Array` with the specified `bitLength`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { xxhashAsU8a } from '@polkadot/util-crypto';
 *
 * xxhashAsU8a('abc'); // => 0x44bc2cf5ad770999
 * ```
 */

function xxhashAsU8a(data) {
  var bitLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 64;
  var onlyJs = arguments.length > 2 ? arguments[2] : undefined;
  var rounds = Math.ceil(bitLength / 64);
  var u8a = u8aToU8a(data);

  if (!hasBigInt || !onlyJs && isReady()) {
    return twox(u8a, rounds);
  }

  var result = new Uint8Array(rounds * 8);

  for (var seed = 0; seed < rounds; seed++) {
    result.set(xxhash64(u8a, seed).reverse(), seed * 8);
  }

  return result;
}
/**
 * @name xxhashAsHex
 * @description Creates a xxhash64 hex from the input.
 */

var xxhashAsHex = createAsHex(xxhashAsU8a);

export { addressEq, addressToEvm, allNetworks, availableNetworks, base32Decode, base32Encode, base32Validate, base58Decode, base58Encode, base58Validate, base64Decode, base64Encode, base64Pad, base64Trim, base64Validate, blake2AsHex, blake2AsU8a, checkAddress, checkAddressChecksum, convertPublicKeyToCurve25519, convertSecretKeyToCurve25519, createKeyDerived, createKeyMulti, cryptoIsReady, cryptoWaitReady, decodeAddress, deriveAddress, ed25519DeriveHard, ed25519PairFromRandom, ed25519PairFromSecret, ed25519PairFromSeed, ed25519PairFromString, ed25519Sign, ed25519Verify, encodeAddress, encodeDerivedAddress, encodeMultiAddress, ethereumEncode, evmToAddress, hdEthereum, hdLedger, hdValidatePath, hmacSha256AsU8a, hmacSha512AsU8a, hmacShaAsU8a, isAddress, isBase32, isBase58, isBase64, isEthereumAddress, isEthereumChecksum, jsonDecrypt, jsonDecryptData, jsonEncrypt, jsonEncryptFormat, keccak256AsU8a, keccak512AsU8a, keccakAsHex, keccakAsU8a, keyExtractPath, keyExtractSuri, keyFromPath, keyHdkdEcdsa, keyHdkdEd25519, keyHdkdSr25519, mnemonicGenerate, mnemonicToEntropy, mnemonicToLegacySeed, mnemonicToMiniSecret, mnemonicValidate, naclBoxPairFromSecret, naclDecrypt, naclEncrypt, naclOpen, naclSeal, packageInfo, pbkdf2Encode, randomAsHex, randomAsNumber, randomAsU8a, scryptEncode, scryptFromU8a, scryptToU8a, secp256k1Compress, secp256k1Expand, secp256k1PairFromSeed, secp256k1PrivateKeyTweakAdd, secp256k1Recover, secp256k1Sign, secp256k1Verify, selectableNetworks, setSS58Format, sha256AsU8a, sha512AsU8a, shaAsU8a, signatureVerify, sortAddresses, sr25519Agreement, sr25519DeriveHard, sr25519DerivePublic, sr25519DeriveSoft, sr25519PairFromSeed, sr25519Sign, sr25519Verify, sr25519VrfSign, sr25519VrfVerify, validateAddress, xxhashAsHex, xxhashAsU8a };
