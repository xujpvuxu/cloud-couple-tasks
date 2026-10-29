import {initializeApp} from 'firebase/app'
import {getAuth} from 'firebase/auth'
import {getFirestore} from 'firebase/firestore'
// Firebase web configuration is public. Secure access with Auth and Firestore Rules.
const config={apiKey:'AIzaSyAbL5waMshANI2F59sTApzOXp6u6a6hp1U',authDomain:'cloud-couple-tasks.firebaseapp.com',projectId:'cloud-couple-tasks',appId:'1:163525732492:web:a685a5f3cf3634578473a9'}
export const ready=true
export const auth=getAuth(initializeApp(config))
export const db=getFirestore()
