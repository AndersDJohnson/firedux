'use strict';

var _es = require('arrow-mocha/es5');

var _src = require('../src');

var _src2 = _interopRequireDefault(_src);

var _redux = require('redux');

var _reduxThunk = require('redux-thunk');

var _reduxThunk2 = _interopRequireDefault(_reduxThunk);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _ref = require('./ref');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-env mocha */
// import { it, before, after, beforeEach, afterEach } from 'arrow-mocha/es5'
describe('test', function (t) {
  var firedux = void 0;
  var reducer = void 0;
  var store = void 0;
  var middleware = void 0;

  (0, _es.beforeEach)(function (t) {
    firedux = new _src2.default({
      ref: _ref.ref
    });

    reducer = (0, _redux.combineReducers)({
      app: function app() {
        var s = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
        return s;
      },
      firedux: firedux.reducer()
    });

    middleware = (0, _redux.applyMiddleware)(_reduxThunk2.default);

    store = (0, _redux.createStore)(reducer, middleware);

    firedux.dispatch = store.dispatch;
  });

  (0, _es.it)('should get url from ref', function (t) {
    _assert2.default.equal(firedux.url, _ref.url);
  });

  (0, _es.it)('should set and get', function (t, done) {
    t.timeout(10000);

    store.subscribe(function () {
      var state = store.getState();
      console.log('STATE:', JSON.stringify(state, null, '  '));
      _assert2.default.equal(state.firedux.data.test, true);
    });

    firedux.set('test', true).then(function () {
      return firedux.get('test');
    }).then(function (result) {
      _assert2.default.equal(result.snapshot.val(), true);
      done();
    }).catch(done);
  });

  (0, _es.it)('should replace on set', function (t, done) {
    t.timeout(10000);

    store.subscribe(function () {
      var state = store.getState();
      console.log('STATE:', JSON.stringify(state, null, '  '));
    });

    firedux.set('set', { first: true }).then(function () {
      var p = firedux.set('set', { second: true });
      var state = store.getState();
      _assert2.default.deepEqual(state.firedux.data.set, { second: true });
      return p;
    }).then(function () {
      return firedux.get('set');
    }).then(function (result) {
      _assert2.default.deepEqual(result.snapshot.val(), { second: true });
      done();
    }).catch(done);
  });

  (0, _es.it)('should merge on update', function (t, done) {
    t.timeout(10000);

    store.subscribe(function () {
      var state = store.getState();
      console.log('STATE:', JSON.stringify(state, null, '  '));
    });

    firedux.set('update', { first: true }).then(function () {
      var p = firedux.update('update', { second: true });
      var state = store.getState();
      _assert2.default.deepEqual(state.firedux.data.update, { first: true, second: true }, 'local state');
      return p;
    }).then(function () {
      return firedux.get('update');
    }).then(function (result) {
      done();
    }).catch(done);
  });

  (0, _es.it)('should push with key', function (t, done) {
    t.timeout(10000);

    firedux.push('push', { first: true }, function (id) {
      _assert2.default.ok(id);
    }).then(function (id) {
      _assert2.default.ok(id);
      done();
    }).catch(done);
  });
});
