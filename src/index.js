import Firebase from 'firebase'
import _ from 'lodash'
import updeep from 'updeep'
import gaTrack from 'google-analytics-js'
// import _debug from 'debug'
// const debug = _// debug('firedux')

if (typeof window !== 'undefined') {
  if (!(window.FIREDUX_OPTIONS && window.FIREDUX_OPTIONS.noTrack)) {
    gaTrack('UA-82065077-1', 'github.com', '/adjohnson916/firedux/src/index.js')
  }
}

const localStorage = typeof window === 'object' ? window.localStorage : null

const initialState = {
  data: {}
}

function splitUrl (url) {
  return url.split(/\//)
}

// function urlToKeyPath (url) {
//   const keyPath = splitUrl(url).join('.')
//   return keyPath
// }

export default class Firedux {
  constructor (options) {
    const that = this
    if (options.url) {
      console.warn('Firedux option "url" is deprecated, use "ref" instead.')
    }
    this.url = options.url || options.ref.toString()
    this.ref = options.ref || new Firebase(this.url)
    if (this.url.slice(-1) !== '/') {
      this.url += '/'
    }
    this.omit = options.omit || []
    this.token = null
    this.getting = {}
    this.removing = {}
    this.watching = {}
    this.actionId = 0
    this.dispatch = null

    function makeFirebaseState (action, state, path, value, merge = false) {
      // const keyPath = urlToKeyPath(path)
      // const dataPath = 'data.' + keyPath
      const dataPath = ['data'].concat(splitUrl(path))
      // const statusPath = 'status.' + keyPath
      // debug('MAKE FIREBASE STATE FOR ACTION', action.type, 'VALUE', keyPath, value, 'merge', merge)
      value = merge ? value : updeep.constant(value)
      const newState = updeep.updateIn(dataPath, value, state)
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

    this.reducer = function reducer () {
      return function (state = initialState, action) {
        // debug('FIREBASE ACTION', action.type, action)
        switch (action.type) {
          case 'FIREBASE_GET':
          case 'FIREBASE_WATCH':
            return makeFirebaseState(action, state, action.path, action.snapshot.val())
          case 'FIREBASE_SET':
          case 'FIREBASE_PUSH':
            return makeFirebaseState(action, state, action.path, action.value)
          case 'FIREBASE_UPDATE':
            return makeFirebaseState(action, state, action.path, action.value, true)
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
              authData: action.authData,
              authError: action.error
            }, state)
          default:
            return state
        }
      }
    }

    return this
  }
  cleanValue (value) {
    return _.isObject(value) ? _.omit(value, this.omit) : value
  }
  init () {
    const { dispatch } = this
    const that = this
    return new Promise((resolve, reject) => {
      this.token = localStorage.getItem('FIREBASE_TOKEN')
      if (this.token) {
        resolve(this.login(dispatch, {
          token: this.token
        }))
      }

      // listen for auth changes
      if (_.isFunction(this.ref.onAuth)) {
        this.ref.onAuth(function (authData) {
          // debug('FB AUTH DATA', authData)
          if (!authData) {
            localStorage.removeItem('FIREBASE_TOKEN')
            that.authData = null
            dispatch({type: 'FIREBASE_LOGOUT'})
            reject()
          }
          resolve(authData)
        })
      }
    })
  }
  login (credentials) {
    const { dispatch } = this
    const that = this
    return new Promise((resolve, reject) => {
      dispatch({type: 'FIREBASE_LOGIN_ATTEMPT'})

      const handler = function (error, authData) {
        // TODO: Error handling.
        // debug('FB AUTH', error, authData)
        if (error) {
          console.error('FB AUTH ERROR', error, authData)
          dispatch({type: 'FIREBASE_LOGIN_ERROR', error})
          reject(error)
          return
        }
        localStorage.setItem('FIREBASE_TOKEN', authData.token)
        that.authData = authData
        dispatch({type: 'FIREBASE_LOGIN', authData: authData, error: error})
        resolve(authData)
      }

      try {
        if (credentials.token) {
          this.ref.authWithCustomToken(this.token, handler)
        } else {
          this.ref.authWithPassword(credentials, handler)
        }
      } catch (error) {
        console.error('FB AUTH ERROR', error)
        dispatch({type: 'FIREBASE_LOGIN_ERROR', error})
        reject(error)
      }
    })
  }
  logout () {
    const { dispatch } = this
    return new Promise((resolve, reject) => {
      dispatch({type: 'FIREBASE_LOGOUT_ATTEMPT'})
      this.ref.unauth()
      this.authData = null
      this.authError = null
      dispatch({type: 'FIREBASE_LOGOUT'})
      resolve()
    })
  }
  watch (path, onComplete) {
    const { dispatch } = this
    return new Promise((resolve) => {
      if (this.watching[path]) {
        // // debug('already watching', path)
        return false
      }
      this.watching[path] = true
      // debug('DISPATCH WATCH', path)
      this.ref.child(path).on('value', snapshot => {
        // debug('GOT WATCHED VALUE', path, snapshot.val())
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
  get (path, onComplete) {
    const { dispatch } = this
    return new Promise((resolve) => {
      if (this.getting[path]) {
        // debug('already getting', path)
        return { type: 'FIREBASE_GET_PENDING' }
      }
      this.getting[path] = true
      // debug('FB GET', path)
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
  set (path, value, onComplete) {
    const { dispatch } = this
    return new Promise((resolve, reject) => {
      const newValue = this.cleanValue(value)
      // debug('FB SET', path, newValue)
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
  update (path, value, onComplete) {
    const { dispatch } = this
    return new Promise((resolve, reject) => {
      const newValue = this.cleanValue(value)
      // debug('FB UPDATE', path, newValue)
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
  remove (path, onComplete) {
    const { dispatch } = this
    return new Promise((resolve, reject) => {
      if (this.removing[path]) {
        // debug('already removing', path)
        return { type: 'FIREBASE_REMOVE_PENDING' }
      }
      this.removing[path] = true
      // debug('FB remove', path)

      let value

      // optimism
      dispatch({
        type: 'FIREBASE_REMOVE',
        path: path,
        // TODO: How to access state for cleaner rollback?
        // eslint-disable-next-line no-return-assign
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
  push (toPath, value, onId, onComplete) {
    const { dispatch } = this
    const that = this
    const newValue = this.cleanValue(value)

    return new Promise((resolve, reject) => {
      // debug('FB PUSH', toPath, newValue)

      let path, newId
      const ref = that.ref.child(toPath)
      const pushRef = ref.push(newValue, (error) => {
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
      path = pushRef.toString().replace(that.url, '')
      // function in firebase@2, property in firebase@3
      newId = _.isFunction(pushRef, 'key') ? pushRef.key() : pushRef.key
      if (onId) onId(newId)

      // optimism
      dispatch({
        type: 'FIREBASE_PUSH',
        path: path,
        toPath: toPath,
        newId: newId,
        value: newValue,
        ref: pushRef,
        toRef: ref
      })
    })
  }
}
