/* eslint-env mocha */

import firebase from 'firebase'

let ref
if (process.env.FIREBASE_VERSION === '2') {
  ref = new firebase('https://redux-firebase.firebaseio.com/')
}
else {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: 'firedux-3d1a8.firebaseapp.com',
    databaseURL: 'https://firedux-3d1a8.firebaseio.com'
  }
  firebase.initializeApp(config)
  ref = firebase.database().ref()
}
module.exports = ref
