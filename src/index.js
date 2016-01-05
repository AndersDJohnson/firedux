import Firebase from 'firebase'
import _promise from 'es6-promise'
const { Promise } = _promise
import _ from 'lodash'
import updeep from 'updeep'
import _debug from 'debug'
const debug = _debug('firedux')

const localStorage = typeof window === 'object' ? window.localStorage : null

const initialState = {
  data: {}
}

function splitUrl (url) {
  return url.split(/\//)
}
function urlToKeyPath (url) {
  const keyPath = splitUrl(url).join('.')
  return keyPath
}

export default class Firedux {
  constructor (options) {
    const that = this
    this.url = options.url
    if (this.url.slice(-1) !== '/') {
      this.url += '/'
    }
    this.omit = options.omit || []
    this.ref = new Firebase(this.url)
    this.token = null
    this.getting = {}
    this.removing = {}
    this.watching = {}
    this.actionId = 0

    function makeFirebaseState (action, state, path, value) {
      const keyPath = urlToKeyPath(path)
      // const dataPath = 'data.' + keyPath
      const dataPath = ['data'].concat(splitUrl(path))
      // const statusPath = 'status.' + keyPath
      debug('MAKE FIREBASE STATE FOR ACTION', action.type, 'VALUE', keyPath, value)
      const newState = updeep.updateIn(dataPath, updeep.constant(value), state)
      return newState
    }

    function removeFirebaseState (action, state, path) {
      const split = splitUrl(path)
      const dataSplit = ['data'].concat(split)

      // get & set value for restore in case of error
      // TODO: Find a cleaner way to do this.
      action.setValue(_.get(state, dataSplit))

      const id = split.pop()
      const parentPath = split.join('.')
      that.ref.child(path).off()
      const keyPath = parentPath
      const dataPath = 'data.' + keyPath
      const newState = updeep.updateIn(dataPath, updeep.omit(id), state)
      return newState
    }

    this.reducer = function (state = initialState, action) {
      debug('FIREBASE ACTION', action.type, action)
      switch (action.type) {
        case 'FIREBASE_GET':
        case 'FIREBASE_WATCH':
          return makeFirebaseState(action, state, action.path, action.snapshot.val())
        case 'FIREBASE_SET':
        case 'FIREBASE_UPDATE':
        case 'FIREBASE_PUSH':
          return makeFirebaseState(action, state, action.path, action.value)
        case 'FIREBASE_REMOVE':
          return removeFirebaseState(action, state, action.path)
        case 'FIREBASE_SET_RESPONSE':
        case 'FIREBASE_UPDATE_RESPONSE':
        case 'FIREBASE_REMOVE_RESPONSE':
          // TODO: Error handling, at per-path level, somehow async without clobber, maybe queues?
          if (action.error) {
            console.error(action.error)
            // restore state
            return makeFirebaseState(action, state, action.path, action.value)
          }
          return state
        case 'FIREBASE_PUSH_RESPONSE':
          if (action.error) {
            // return removeFirebaseState(action, state, action.path)
          }
          return state
        case 'FIREBASE_LOGIN':
        case 'FIREBASE_LOGOUT':
        case 'FIREBASE_LOGIN_ERROR':
          return updeep({
            auth: action.auth,
            authError: action.error
          }, state)
        default:
          return state
      }
    }

    this.actions = {
      init: function () {
        return function (dispatch) {
          that.token = localStorage.getItem('FIREBASE_TOKEN')
          if (that.token) {
            dispatch(that.actions.login({
              token: that.token
            }))
          }

          // listen for auth changes
          that.ref.onAuth(function (authData) {
            debug('FB AUTH DATA', authData)
            if (!authData) {
              localStorage.removeItem('FIREBASE_TOKEN')
              that.auth = null
              dispatch({type: 'FIREBASE_LOGOUT'})
            }
          })
        }
      },
      login: function (credentials) {
        return function (dispatch) {
          dispatch({type: 'FIREBASE_LOGIN_ATTEMPT'})

          const handler = function (error, authData) {
            // TODO: Error handling.
            debug('FB AUTH', error, authData)
            if (error) {
              console.error('FB AUTH ERROR', error, authData)
              dispatch({type: 'FIREBASE_LOGIN_ERROR', error})
              return
            }
            localStorage.setItem('FIREBASE_TOKEN', authData.token)
            that.auth = authData
            dispatch({type: 'FIREBASE_LOGIN', auth: authData, error: error})
          }

          try {
            if (credentials.token) {
              that.ref.authWithCustomToken(that.token, handler)
            } else {
              that.ref.authWithPassword(credentials, handler)
            }
          } catch (error) {
            console.error('FB AUTH ERROR', error)
            dispatch({type: 'FIREBASE_LOGIN_ERROR', error})
          }
        }
      },
      logout: function () {
        return function (dispatch) {
          dispatch({type: 'FIREBASE_LOGOUT_ATTEMPT'})
          that.ref.unauth()
        }
      }
    }

    return this
  }
  cleanValue (value) {
    return _.isObject(value) ? _.omit(value, this.omit) : value
  }
  watch (dispatch, path, onComplete) {
    return new Promise((resolve) => {
      if (this.watching[path]) {
        // debug('already watching', path)
        return false
      }
      this.watching[path] = true
      debug('DISPATCH WATCH', path)
      this.ref.child(path).on('value', snapshot => {
        debug('GOT WATCHED VALUE', path, snapshot.val())
        // TODO: Make watches smart enough to ignore pending updates, e.g. not replace
        //  a path that has been removed locally but is queued for remote delete?
        dispatch({
          type: 'FIREBASE_WATCH',
          path: path,
          snapshot: snapshot
        })

        if (onComplete) onComplete(snapshot)
        resolve({snapshot: snapshot})
      })
    })
  }
  get (dispatch, path, onComplete) {
    return new Promise((resolve) => {
      if (this.getting[path]) {
        debug('already getting', path)
        return { type: 'FIREBASE_GET_PENDING' }
      }
      this.getting[path] = true
      debug('FB GET', path)
      this.ref.child(path).once('value', snapshot => {
        this.getting[path] = false
        dispatch({
          type: 'FIREBASE_GET',
          path: path,
          snapshot: snapshot
        })
        if (onComplete) onComplete(snapshot)
        resolve({snapshot: snapshot})
      })
    })
  }
  set (dispatch, path, value, onComplete) {
    return new Promise((resolve, reject) => {
      const newValue = this.cleanValue(value)
      debug('FB SET', path, newValue)
      // optimism
      dispatch({
        type: 'FIREBASE_SET',
        path: path,
        value: newValue
      })
      this.ref.child(path).set(newValue, error => {
        dispatch({
          type: 'FIREBASE_SET_RESPONSE',
          path: path,
          value: newValue,
          error: error
        })
        if (onComplete) onComplete(error)
        if (error) reject(error)
        else resolve({value: newValue})
      })
    })
  }
  update (dispatch, path, value, onComplete) {
    return new Promise((resolve, reject) => {
      const newValue = this.cleanValue(value)
      debug('FB UPDATE', path, newValue)
      // optimism
      dispatch({
        type: 'FIREBASE_UPDATE',
        path: path,
        value: newValue
      })
      this.ref.child(path).update(newValue, error => {
        dispatch({
          type: 'FIREBASE_UPDATE_RESPONSE',
          path: path,
          value: newValue,
          error: error
        })
        if (onComplete) onComplete(error)
        if (error) reject(error)
        else resolve({value: newValue})
      })
    })
  }
  remove (dispatch, path, onComplete) {
    return new Promise((resolve, reject) => {
      if (this.removing[path]) {
        debug('already removing', path)
        return { type: 'FIREBASE_REMOVE_PENDING' }
      }
      this.removing[path] = true
      debug('FB remove', path)

      let value

      // optimism
      dispatch({
        type: 'FIREBASE_REMOVE',
        path: path,
        // TODO: How to access state for cleaner rollback?
        setValue: (v) => value = v
      })
      this.ref.child(path).remove((error) => {
        this.removing[path] = false
        dispatch({
          type: 'FIREBASE_REMOVE_RESPONSE',
          path: path,
          value: value,
          error: error
        })
        if (onComplete) onComplete(error)
        if (error) reject(error)
        else resolve()
      })
    })
  }
  push (dispatch, toPath, value, onId, onComplete) {
    const that = this
    const newValue = this.cleanValue(value)

    return new Promise((resolve, reject) => {
      debug('FB PUSH', toPath, newValue)

      let path, newId
      const push = that.ref.child(toPath).push(newValue, (error) => {
        dispatch({
          type: 'FIREBASE_PUSH_RESPONSE',
          path: path,
          toPath: toPath,
          newId: newId,
          value: newValue,
          error: error
        })
        if (onComplete) onComplete(error, newId)
        if (error) reject(error)
        else resolve(newId)
      })
      path = push.toString().replace(that.url, '')
      newId = _.last(path.split('/'))
      onId(newId)

      // optimism
      dispatch({
        type: 'FIREBASE_PUSH',
        path: path,
        toPath: toPath,
        newId: newId,
        value: newValue
      })
    })
  }
}
