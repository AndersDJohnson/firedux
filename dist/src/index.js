'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _firebase = require('firebase');

var _firebase2 = _interopRequireDefault(_firebase);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _updeep = require('updeep');

var _updeep2 = _interopRequireDefault(_updeep);

var _googleAnalyticsJs = require('google-analytics-js');

var _googleAnalyticsJs2 = _interopRequireDefault(_googleAnalyticsJs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// import _debug from 'debug'
// const debug = _// debug('firedux')

if (typeof window !== 'undefined') {
  if (!(window.FIREDUX_OPTIONS && window.FIREDUX_OPTIONS.noTrack)) {
    (0, _googleAnalyticsJs2.default)('UA-82065077-1', 'github.com', '/adjohnson916/firedux/src/index.js');
  }
}

var localStorage = (typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' ? window.localStorage : null;

var initialState = {
  data: {}
};

function splitUrl(url) {
  return url.split(/\//);
}

// function urlToKeyPath (url) {
//   const keyPath = splitUrl(url).join('.')
//   return keyPath
// }

var Firedux = function () {
  function Firedux(options) {
    _classCallCheck(this, Firedux);

    var that = this;
    if (options.url) {
      console.warn('Firedux option "url" is deprecated, use "ref" instead.');
    }

    this.v3 = _firebase2.default.SDK_VERSION.substr(0, 2) === '3.';

    if (this.v3) {
      this.auth = _firebase2.default.auth; // eslint-disable-line
    }

    this.url = options.url || options.ref.toString();
    this.ref = options.ref || new _firebase2.default(this.url);
    if (this.url.slice(-1) !== '/') {
      this.url += '/';
    }
    this.omit = options.omit || [];
    this.token = null;
    this.getting = {};
    this.removing = {};
    this.watching = {};
    this.actionId = 0;
    this.dispatch = null;
    this.userAuth = null;

    function makeFirebaseState(action, state, path, value) {
      var merge = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      // const keyPath = urlToKeyPath(path)
      // const dataPath = 'data.' + keyPath
      var dataPath = ['data'].concat(splitUrl(path));
      // const statusPath = 'status.' + keyPath
      // debug('MAKE FIREBASE STATE FOR ACTION', action.type, 'VALUE', keyPath, value, 'merge', merge)
      value = merge ? value : _updeep2.default.constant(value);
      var newState = _updeep2.default.updateIn(dataPath, value, state);
      return newState;
    }

    function removeFirebaseState(action, state, path) {
      var split = splitUrl(path);
      var dataSplit = ['data'].concat(split);

      // get & set value for restore in case of error
      // TODO: Find a cleaner way to do this.
      action.setValue(_lodash2.default.get(state, dataSplit));

      var id = split.pop();
      var parentPath = split.join('.');
      that.ref.child(path).off();
      var keyPath = parentPath;
      var dataPath = 'data.' + keyPath;
      var newState = _updeep2.default.updateIn(dataPath, _updeep2.default.omit(id), state);
      return newState;
    }

    this.reducer = function reducer() {
      return function () {
        var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initialState;
        var action = arguments[1];

        // debug('FIREBASE ACTION', action.type, action)
        switch (action.type) {
          case 'FIREBASE_GET':
          case 'FIREBASE_WATCH':
            return makeFirebaseState(action, state, action.path, action.snapshot.val());
          case 'FIREBASE_SET':
          case 'FIREBASE_PUSH':
            return makeFirebaseState(action, state, action.path, action.value);
          case 'FIREBASE_UPDATE':
            return makeFirebaseState(action, state, action.path, action.value, true);
          case 'FIREBASE_REMOVE':
            return removeFirebaseState(action, state, action.path);
          case 'FIREBASE_SET_RESPONSE':
          case 'FIREBASE_UPDATE_RESPONSE':
          case 'FIREBASE_REMOVE_RESPONSE':
            // TODO: Error handling, at per-path level, somehow async without clobber, maybe queues?
            if (action.error) {
              console.error(action.error);
              // restore state
              return makeFirebaseState(action, state, action.path, action.value);
            }
            return state;
          case 'FIREBASE_PUSH_RESPONSE':
            if (action.error) {
              // return removeFirebaseState(action, state, action.path)
            }
            return state;
          case 'FIREBASE_LOGIN':
          case 'FIREBASE_LOGIN_ERROR':
          case 'FIREBASE_LOGOUT':
          case 'FIREBASE_LOGOUT_ERROR':
            return (0, _updeep2.default)({
              authData: action.authData,
              authError: action.error
            }, state);
          default:
            return state;
        }
      };
    };

    return this;
  }

  _createClass(Firedux, [{
    key: 'cleanValue',
    value: function cleanValue(value) {
      return _lodash2.default.isObject(value) ? _lodash2.default.omit(value, this.omit) : value;
    }
  }, {
    key: 'init',
    value: function init() {
      var _this = this;

      var dispatch = this.dispatch;

      var that = this;
      return new Promise(function (resolve, reject) {
        _this.token = localStorage.getItem('FIREBASE_TOKEN');
        if (_this.token) {
          resolve(_this.login(dispatch, {
            token: _this.token
          }));
        }

        if (_this.v3) {
          var auth = _this.auth();

          auth.onAuthStateChanged(function (user) {
            if (user) {
              _this.userAuth = user;
              resolve(user);
            } else {
              localStorage.removeItem('FIREBASE_TOKEN');
              that.authData = null;
              dispatch({ type: 'FIREBASE_LOGOUT' });
              reject();
            }
          });
        }

        // listen for auth changes
        if (_lodash2.default.isFunction(_this.ref.onAuth)) {
          _this.ref.onAuth(function (authData) {
            // debug('FB AUTH DATA', authData)
            if (!authData) {
              localStorage.removeItem('FIREBASE_TOKEN');
              that.authData = null;
              dispatch({ type: 'FIREBASE_LOGOUT' });
              reject();
            }
            resolve(authData);
          });
        }
      });
    }
  }, {
    key: 'login',
    value: function login(credentials) {
      var _this2 = this;

      var dispatch = this.dispatch;

      var that = this;
      return new Promise(function (resolve, reject) {
        dispatch({ type: 'FIREBASE_LOGIN_ATTEMPT' });

        var handleError = function handleError(error) {
          var authData = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

          console.error('FB AUTH ERROR', error, authData);
          dispatch({ type: 'FIREBASE_LOGIN_ERROR', error: error });
          reject(error);
        };

        var handler = function handler(error, authData) {
          // TODO: Error handling.
          // debug('FB AUTH', error, authData)

          if (error) return handleError(error);

          localStorage.setItem('FIREBASE_TOKEN', authData.token || authData.refreshToken);
          that.authData = authData;
          dispatch({ type: 'FIREBASE_LOGIN', authData: authData, error: error });
          resolve(authData);
        };

        try {
          if (!credentials) {
            reject();
            return;
          }
          if (_this2.v3) {
            if (!credentials.email && !credentials.password) {
              reject();
              return;
            }
            // TODO add custom later...
            _this2.auth().signInWithEmailAndPassword(credentials.email, credentials.password).then(function (authData) {
              return handler(null, authData);
            }).catch(function (error) {
              return handleError(error);
            });
          } else if (credentials.token) {
            _this2.ref.authWithCustomToken(_this2.token, handler);
          } else {
            _this2.ref.authWithPassword(credentials, handler);
          }
        } catch (error) {
          console.error('FB AUTH ERROR', error);
          dispatch({ type: 'FIREBASE_LOGIN_ERROR', error: error });
          reject(error);
        }
      });
    }
  }, {
    key: 'logout',
    value: function logout() {
      var _this3 = this;

      var dispatch = this.dispatch;


      return new Promise(function (resolve, reject) {
        dispatch({ type: 'FIREBASE_LOGOUT_ATTEMPT' });

        var handleLogout = function handleLogout() {
          this.authData = null;
          this.authError = null;
          dispatch({ type: 'FIREBASE_LOGOUT' });
          resolve();
        };

        var handleLogoutError = function handleLogoutError(error) {
          dispatch({ type: 'FIREBASE_LOGOUT_ERROR', error: error });
          if (error) reject(error);else resolve();
        };

        if (_this3.v3) {
          _this3.auth().signOut().then(handleLogout, handleLogoutError);
        } else {
          _this3.ref.unauth(); // no callbacks for old firebase :(
          handleLogout();
        }
      });
    }
  }, {
    key: 'watch',
    value: function watch(path, onComplete) {
      var _this4 = this;

      var dispatch = this.dispatch;

      return new Promise(function (resolve) {
        if (_this4.watching[path]) {
          // // debug('already watching', path)
          return false;
        }
        _this4.watching[path] = true;
        // debug('DISPATCH WATCH', path)
        _this4.ref.child(path).on('value', function (snapshot) {
          // debug('GOT WATCHED VALUE', path, snapshot.val())
          // TODO: Make watches smart enough to ignore pending updates, e.g. not replace
          //  a path that has been removed locally but is queued for remote delete?
          dispatch({
            type: 'FIREBASE_WATCH',
            path: path,
            snapshot: snapshot
          });

          if (onComplete) onComplete(snapshot);
          resolve({ snapshot: snapshot });
        });
      });
    }
  }, {
    key: 'get',
    value: function get(path, onComplete) {
      var _this5 = this;

      var dispatch = this.dispatch;

      return new Promise(function (resolve) {
        if (_this5.getting[path]) {
          // debug('already getting', path)
          return { type: 'FIREBASE_GET_PENDING' };
        }
        _this5.getting[path] = true;
        // debug('FB GET', path)
        _this5.ref.child(path).once('value', function (snapshot) {
          _this5.getting[path] = false;
          dispatch({
            type: 'FIREBASE_GET',
            path: path,
            snapshot: snapshot
          });
          if (onComplete) onComplete(snapshot);
          resolve({ snapshot: snapshot });
        });
      });
    }
  }, {
    key: 'set',
    value: function set(path, value, onComplete) {
      var _this6 = this;

      var dispatch = this.dispatch;

      return new Promise(function (resolve, reject) {
        var newValue = _this6.cleanValue(value);
        // debug('FB SET', path, newValue)
        // optimism
        dispatch({
          type: 'FIREBASE_SET',
          path: path,
          value: newValue
        });
        _this6.ref.child(path).set(newValue, function (error) {
          dispatch({
            type: 'FIREBASE_SET_RESPONSE',
            path: path,
            value: newValue,
            error: error
          });
          if (onComplete) onComplete(error);
          if (error) reject(error);else resolve({ value: newValue });
        });
      });
    }
  }, {
    key: 'update',
    value: function update(path, value, onComplete) {
      var _this7 = this;

      var dispatch = this.dispatch;

      return new Promise(function (resolve, reject) {
        var newValue = _this7.cleanValue(value);
        // debug('FB UPDATE', path, newValue)
        // optimism
        dispatch({
          type: 'FIREBASE_UPDATE',
          path: path,
          value: newValue
        });
        _this7.ref.child(path).update(newValue, function (error) {
          dispatch({
            type: 'FIREBASE_UPDATE_RESPONSE',
            path: path,
            value: newValue,
            error: error
          });
          if (onComplete) onComplete(error);
          if (error) reject(error);else resolve({ value: newValue });
        });
      });
    }
  }, {
    key: 'remove',
    value: function remove(path, onComplete) {
      var _this8 = this;

      var dispatch = this.dispatch;

      return new Promise(function (resolve, reject) {
        if (_this8.removing[path]) {
          // debug('already removing', path)
          return { type: 'FIREBASE_REMOVE_PENDING' };
        }
        _this8.removing[path] = true;
        // debug('FB remove', path)

        var value = void 0;

        // optimism
        dispatch({
          type: 'FIREBASE_REMOVE',
          path: path,
          // TODO: How to access state for cleaner rollback?
          // eslint-disable-next-line no-return-assign
          setValue: function setValue(v) {
            return value = v;
          }
        });
        _this8.ref.child(path).remove(function (error) {
          _this8.removing[path] = false;
          dispatch({
            type: 'FIREBASE_REMOVE_RESPONSE',
            path: path,
            value: value,
            error: error
          });
          if (onComplete) onComplete(error);
          if (error) reject(error);else resolve();
        });
      });
    }
  }, {
    key: 'push',
    value: function push(toPath, value, onId, onComplete) {
      var dispatch = this.dispatch;

      var that = this;
      var newValue = this.cleanValue(value);

      return new Promise(function (resolve, reject) {
        // debug('FB PUSH', toPath, newValue)

        var path = void 0,
            newId = void 0;
        var ref = that.ref.child(toPath);
        var pushRef = ref.push(newValue, function (error) {
          dispatch({
            type: 'FIREBASE_PUSH_RESPONSE',
            path: path,
            toPath: toPath,
            newId: newId,
            value: newValue,
            error: error
          });
          if (onComplete) onComplete(error, newId);
          if (error) reject(error);else resolve(newId);
        });
        path = pushRef.toString().replace(that.url, '');
        // function in firebase@2, property in firebase@3
        newId = _lodash2.default.isFunction(pushRef, 'key') ? pushRef.key() : pushRef.key;
        if (onId) onId(newId);

        // optimism
        dispatch({
          type: 'FIREBASE_PUSH',
          path: path,
          toPath: toPath,
          newId: newId,
          value: newValue,
          ref: pushRef,
          toRef: ref
        });
      });
    }
  }]);

  return Firedux;
}();

exports.default = Firedux;
