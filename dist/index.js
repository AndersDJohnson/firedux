'use strict';

var _createClass = (function () { function defineProperties (target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _firebase = require('firebase');

var _firebase2 = _interopRequireDefault(_firebase);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _updeep = require('updeep');

var _updeep2 = _interopRequireDefault(_updeep);

var _debug2 = require('debug');

var _debug3 = _interopRequireDefault(_debug2);

function _interopRequireDefault (obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = (0, _debug3.default)('firedux');

var _window = window;
var localStorage = _window.localStorage;

var initialState = {
  data: {}
};

function splitUrl (url) {
  return url.split(/\//);
}
function urlToKeyPath (url) {
  var keyPath = splitUrl(url).join('.');
  return keyPath;
}

var Firedux = (function () {
  function Firedux (options) {
    _classCallCheck(this, Firedux);

    var that = this;
    this.url = options.url;
    if (this.url.slice(-1) !== '/') {
      this.url += '/';
    }
    this.omit = options.omit || [];
    this.ref = new _firebase2.default(this.url);
    this.token = null;
    this.getting = {};
    this.removing = {};
    this.bound = {};
    this.actionId = 0;

    function makeFirebaseState (action, state, path, value) {
      var keyPath = urlToKeyPath(path);
      // const dataPath = 'data.' + keyPath
      var dataPath = ['data'].concat(splitUrl(path));
      // const statusPath = 'status.' + keyPath
      debug('MAKE FIREBASE STATE FOR ACTION', action.type, 'VALUE', keyPath, value);
      var newState = _updeep2.default.updateIn(dataPath, _updeep2.default.constant(value), state);
      return newState;
    }

    function removeFirebaseState (action, state, path) {
      var split = splitUrl(path);
      var dataSplit = ['data'].concat(split);

      // get & set value for restore in case of error
      // TODO: Find a cleaner way to do this.
      action.setValue(_lodash2.default.get(state, dataSplit));

      var id = split.pop();
      var parentPath = split.join('.');
      // var binding = that.bound[path]
      // that.ref.child(path).off('value', binding
      // that.ref.child(path).off('value')
      that.ref.child(path).off();
      // delete that.bound[path]
      var keyPath = parentPath;
      var dataPath = 'data.' + keyPath;
      var newState = _updeep2.default.updateIn(dataPath, _updeep2.default.omit(id), state);
      return newState;
    }

    this.reducer = function () {
      var state = arguments.length <= 0 || arguments[0] === undefined ? initialState : arguments[0];
      var action = arguments[1];

      debug('FIREBASE ACTION', action.type, action);
      switch (action.type) {
        case 'FIREBASE_GET':
        case 'FIREBASE_BIND':
          return makeFirebaseState(action, state, action.path, action.snapshot.val());
        case 'FIREBASE_SET':
        case 'FIREBASE_UPDATE':
        case 'FIREBASE_PUSH':
          return makeFirebaseState(action, state, action.path, action.value);
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
        case 'FIREBASE_LOGOUT':
        case 'FIREBASE_LOGIN_ERROR':
          return (0, _updeep2.default)({
            auth: action.auth,
            authError: action.error
          }, state);
        default:
          return state;
      }
    };

    this.actions = {
      init: function init () {
        return function (dispatch) {
          that.token = localStorage.getItem('FIREBASE_TOKEN');
          if (that.token) {
            dispatch(that.actions.login({
              token: that.token
            }));
          }

          // listen for auth changes
          that.ref.onAuth(function (authData) {
            debug('FB AUTH DATA', authData);
            if (!authData) {
              localStorage.removeItem('FIREBASE_TOKEN');
              that.auth = null;
              dispatch({ type: 'FIREBASE_LOGOUT' });
            }
          });
        };
      },
      login: function login (credentials) {
        return function (dispatch) {
          dispatch({ type: 'FIREBASE_LOGIN_ATTEMPT' });

          var handler = function handler (error, authData) {
            // TODO: Error handling.
            debug('FB AUTH', error, authData);
            if (error) {
              console.error('FB AUTH ERROR', error, authData);
              dispatch({ type: 'FIREBASE_LOGIN_ERROR', error: error });
              return;
            }
            localStorage.setItem('FIREBASE_TOKEN', authData.token);
            that.auth = authData;
            dispatch({ type: 'FIREBASE_LOGIN', auth: authData, error: error });
          };

          try {
            if (credentials.token) {
              that.ref.authWithCustomToken(that.token, handler);
            } else {
              that.ref.authWithPassword(credentials, handler);
            }
          } catch (error) {
            console.error('FB AUTH ERROR', error);
            dispatch({ type: 'FIREBASE_LOGIN_ERROR', error: error });
          }
        };
      },
      logout: function logout () {
        return function (dispatch) {
          dispatch({ type: 'FIREBASE_LOGOUT_ATTEMPT' });
          that.ref.unauth();
        };
      }
    };

    return this;
  }

  _createClass(Firedux, [{
    key: 'cleanValue',
    value: function cleanValue (value) {
      return _lodash2.default.isObject(value) ? _lodash2.default.omit(value, this.omit) : value;
    }
  }, {
    key: 'bind',
    value: function bind (dispatch, path) {
      if (this.bound[path]) {
        // debug('already bound', path)
        return false;
      }
      this.bound[path] = true;
      debug('DISPATCH BOUND', path);
      this.ref.child(path).on('value', function (snapshot) {
        debug('GOT BOUND VALUE', path, snapshot.val());
        // TODO: Make binds smart enough to ignore pending updates, e.g. not replace
        //  a path that has been removed locally but is queued for remote delete?
        dispatch({
          type: 'FIREBASE_BIND',
          path: path,
          snapshot: snapshot
        });
      });
    }
  }, {
    key: 'get',
    value: function get (dispatch, path, onComplete) {
      var _this = this;

      return new Promise(function (resolve) {
        if (_this.getting[path]) {
          debug('already getting', path);
          return { type: 'FIREBASE_GET_PENDING' };
        }
        _this.getting[path] = true;
        debug('FB GET', path);
        _this.ref.child(path).once('value', function (snapshot) {
          _this.getting[path] = false;
          dispatch({
            type: 'FIREBASE_GET',
            path: path,
            snapshot: snapshot
          });
          if (onComplete) onComplete(snapshot);else resolve({ snapshot: snapshot });
        });
      });
    }
  }, {
    key: 'set',
    value: function set (dispatch, path, value, onComplete) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        var newValue = _this2.cleanValue(value);
        debug('FB SET', path, newValue);
        // optimism
        dispatch({
          type: 'FIREBASE_SET',
          path: path,
          value: newValue
        });
        _this2.ref.child(path).set(newValue, function (error) {
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
    value: function update (dispatch, path, value, onComplete) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        var newValue = _this3.cleanValue(value);
        debug('FB UPDATE', path, newValue);
        // optimism
        dispatch({
          type: 'FIREBASE_UPDATE',
          path: path,
          value: newValue
        });
        _this3.ref.child(path).update(newValue, function (error) {
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
    value: function remove (dispatch, path, onComplete) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        if (_this4.removing[path]) {
          debug('already removing', path);
          return { type: 'FIREBASE_REMOVE_PENDING' };
        }
        _this4.removing[path] = true;
        debug('FB remove', path);

        var value = undefined;

        // optimism
        dispatch({
          type: 'FIREBASE_REMOVE',
          path: path,
          // TODO: How to access state for cleaner rollback?
          setValue: function setValue (v) {
            return value = v;
          }
        });
        _this4.ref.child(path).remove(function (error) {
          _this4.removing[path] = false;
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
    value: function push (dispatch, toPath, value, onId, onComplete) {
      var that = this;
      var newValue = this.cleanValue(value);

      return new Promise(function (resolve, reject) {
        debug('FB PUSH', toPath, newValue);

        var path = undefined,
            newId = undefined;
        var push = that.ref.child(toPath).push(newValue, function (error) {
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
        path = push.toString().replace(that.url, '');
        newId = _lodash2.default.last(path.split('/'));
        onId(newId);

        // optimism
        dispatch({
          type: 'FIREBASE_PUSH',
          path: path,
          toPath: toPath,
          newId: newId,
          value: newValue
        });
      });
    }
  }]);

  return Firedux;
})();

exports.default = Firedux;
