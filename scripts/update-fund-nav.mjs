import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const projectId = process.env.FIREBASE_PROJECT_ID
if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required.')

initializeApp({ credential: applicationDefault(), projectId })
const db = getFirestore()
const DAY_MS = 24 * 60 * 60 * 1000

function taipeiDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

function compactDate(date) {
  return date.replaceAll('-', '')
}

function shiftDate(date, days) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

function parseResponse(raw) {
  const text = raw.replace(/^\uFEFF/, '').trim()
  if (!text) return []
  const list = text.match(/^([\d,]+)\s+([\d.,]+)$/)
  let rows
  if (list) {
    const dates = list[1].split(',')
    const values = list[2].split(',')
    if (dates.length !== values.length) throw new Error('MoneyDJ returned mismatched dates and NAV values.')
    rows = dates.map((date, index) => ({ date, nav: Number(values[index]) }))
  } else {
    rows = text.split(/\r?\n/).filter(Boolean).map(line => {
      const [date, value] = line.trim().split(/[\s,]+/)
      return { date, nav: Number(value) }
    })
  }
  if (rows.some(row => !/^\d{8}$/.test(row.date) || !Number.isFinite(row.nav))) {
    throw new Error('MoneyDJ returned an unrecognized NAV format.')
  }
  return rows
}

async function fetchNav(code, start, end) {
  const url = new URL('https://www.moneydj.com/funddj/bcd/tBCDNavList.djbcd')
  url.search = new URLSearchParams({ a: code, B: start, C: end }).toString()
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`MoneyDJ returned HTTP ${response.status}.`)
  return parseResponse(await response.text())
}

async function pruneQuotes(quotesRef, cutoff) {
  const oldQuotes = await quotesRef.where('date', '<', cutoff).get()
  for (let offset = 0; offset < oldQuotes.docs.length; offset += 400) {
    const batch = db.batch()
    oldQuotes.docs.slice(offset, offset + 400).forEach(quote => batch.delete(quote.ref))
    await batch.commit()
  }
  return oldQuotes.size
}

const today = taipeiDate()
const todayKey = compactDate(today)
const start = shiftDate(today, -13)
const cutoff = compactDate(start)
const pairs = await db.collection('pairs').get()
let checked = 0
let fetched = 0
let stored = 0
let pruned = 0

for (const pair of pairs.docs) {
  const funds = await pair.ref.collection('funds').get()
  for (const fund of funds.docs) {
    const code = fund.data().code
    if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(code)) continue
    checked += 1
    const quotesRef = fund.ref.collection('nav')
    pruned += await pruneQuotes(quotesRef, cutoff)
    const todaysQuote = await quotesRef.doc(todayKey).get()
    if (!todaysQuote.exists) {
      const rows = await fetchNav(code, start.replace(/-(\d{2})$/, (_, day) => `-${Number(day)}`), today.replace(/-(\d{2})$/, (_, day) => `-${Number(day)}`))
      const batch = db.batch()
      let pendingWrites = 0
      for (const row of rows) {
        if (row.date < cutoff || row.date > todayKey) continue
        const quoteRef = quotesRef.doc(row.date)
        const current = await quoteRef.get()
        if (current.exists && Number(current.data().nav) === row.nav) continue
        batch.set(quoteRef, { date: row.date, nav: row.nav, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        pendingWrites += 1
      }
      if (pendingWrites) {
        await batch.commit()
        stored += pendingWrites
      }
      if (rows.some(row => row.date === todayKey)) fetched += 1
    }
  }
}

console.log(JSON.stringify({ today, checkedFunds: checked, fundsWithTodayNav: fetched, storedRows: stored, deletedExpiredRows: pruned }))
