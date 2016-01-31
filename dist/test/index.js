'use strict';

var _es = require('arrow-mocha/es5');

var _src = require('../src');

var _src2 = _interopRequireDefault(_src);

var _redux = require('redux');

var _reduxThunk = require('redux-thunk');

var _reduxThunk2 = _interopRequireDefault(_reduxThunk);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('test', function (t) {
  var firedux = undefined;
  var reducer = undefined;
  var store = undefined;

  (0, _es.beforeEach)(function (t) {
    firedux = new _src2.default({
      url: 'https://redux-firebase.firebaseio.com/'
    });

    reducer = (0, _redux.combineReducers)({
      app: function app() {
        var s = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
        return s;
      },
      firedux: firedux.reducer()
    });

    store = (0, _redux.applyMiddleware)(_reduxThunk2.default)(_redux.createStore)(reducer);

    firedux.dispatch = store.dispatch;
  });

  (0, _es.it)('should', function (t, done) {
    t.timeout(10000);

    store.subscribe(function () {
      var state = store.getState();
      console.log('STATE:', JSON.stringify(state, null, '  '));
      _assert2.default.equal(state.firedux.data.test, true);
    });

    firedux.set('test', true).then(function () {
      return firedux.get('test');
    }, done).then(function (result) {
      _assert2.default.equal(result.snapshot.val(), true);
      done();
    }, done).catch(done);
  });
}); /* eslint-env mocha */
// import { it, before, after, beforeEach, afterEach } from 'arrow-mocha/es5'
