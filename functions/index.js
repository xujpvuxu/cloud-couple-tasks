import {initializeApp} from 'firebase-admin/app'
import {getAuth} from 'firebase-admin/auth'
import {getFirestore} from 'firebase-admin/firestore'
import {onRequest} from 'firebase-functions/v2/https'

initializeApp()

const db=getFirestore()
const allowedOrigins=[
  'https://xujpvuxu.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]

function validDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{1,2}-\d{1,2}$/.test(value))return false
  const [year,month,day]=value.split('-').map(Number)
  const parsed=new Date(Date.UTC(year,month-1,day))
  return parsed.getUTCFullYear()===year&&parsed.getUTCMonth()===month-1&&parsed.getUTCDate()===day
}

function dateValue(value){
  const [year,month,day]=value.split('-').map(Number)
  return Date.UTC(year,month-1,day)
}

export const fundNav=onRequest({
  region:'asia-east1',
  cors:allowedOrigins,
  timeoutSeconds:20,
  maxInstances:10
},async(req,res)=>{
  if(req.method!=='GET')return res.status(405).json({error:'method-not-allowed'})

  const fundId=req.query.fundId
  const start=req.query.B
  const end=req.query.C
  if(typeof fundId!=='string'||!/^[A-Za-z0-9_-]{1,150}$/.test(fundId)||!validDate(start)||!validDate(end)){
    return res.status(400).json({error:'invalid-query'})
  }
  const dayMs=24*60*60*1000
  const range=(dateValue(end)-dateValue(start))/dayMs
  if(range<0||range>31)return res.status(400).json({error:'invalid-date-range'})

  const token=req.get('Authorization')?.match(/^Bearer (.+)$/)?.[1]
  if(!token)return res.status(401).json({error:'unauthorized'})

  let decoded
  try{decoded=await getAuth().verifyIdToken(token)}catch{return res.status(401).json({error:'unauthorized'})}

  try{
    const userSnap=await db.doc(`users/${decoded.uid}`).get()
    const pairId=userSnap.data()?.pairId
    if(typeof pairId!=='string'||!pairId)return res.status(403).json({error:'pair-required'})

    const [pairSnap,fundSnap]=await Promise.all([
      db.doc(`pairs/${pairId}`).get(),
      db.doc(`pairs/${pairId}/funds/${fundId}`).get()
    ])
    const pair=pairSnap.data()
    if(!pairSnap.exists||![pair.ownerId,pair.partnerId].includes(decoded.uid))return res.status(403).json({error:'pair-required'})
    const code=fundSnap.data()?.code
    if(!fundSnap.exists||typeof code!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(code))return res.status(404).json({error:'fund-not-found'})

    const upstream=new URL('https://www.moneydj.com/funddj/bcd/tBCDNavList.djbcd')
    upstream.search=new URLSearchParams({a:code,B:start,C:end}).toString()
    const response=await fetch(upstream,{signal:AbortSignal.timeout(12000)})
    if(!response.ok)return res.status(502).json({error:'upstream-unavailable'})
    res.set('Cache-Control','public, max-age=300')
    res.type('text/plain').status(200).send(await response.text())
  }catch(error){
    console.error('Fund NAV proxy failed',error)
    res.status(error?.name==='TimeoutError'?504:502).json({error:'upstream-unavailable'})
  }
})
