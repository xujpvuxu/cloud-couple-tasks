import {initializeApp} from 'firebase/app'
import {getAuth} from 'firebase/auth'
import {getFirestore} from 'firebase/firestore'
import {getStorage} from 'firebase/storage'
// Firebase web configuration is public. Secure access with Auth and Firestore Rules.
const config={apiKey:'AIzaSyAbL5waMshANI2F59sTApzOXp6u6a6hp1U',authDomain:'cloud-couple-tasks.firebaseapp.com',projectId:'cloud-couple-tasks',storageBucket:'cloud-couple-tasks.firebasestorage.app',appId:'1:163525732492:web:a685a5f3cf3634578473a9'}
export const ready=true
const app=initializeApp(config)
export const auth=getAuth(app)
export const db=getFirestore(app)
export const storage=getStorage(app)
