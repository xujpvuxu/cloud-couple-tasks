import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const projectId = process.env.FIREBASE_PROJECT_ID
if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required.')

initializeApp({ credential: applicationDefault(), projectId })
const db = getFirestore()
const cutoff = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000)

function isOlderThanWeek(value) {
  return value?.toMillis && value.toMillis() < cutoff.toMillis()
}

async function processTask(snapshot) {
  const taskRef = snapshot.ref
  await db.runTransaction(async transaction => {
    const current = await transaction.get(taskRef)
    if (!current.exists) return
    const task = current.data()
    if (task.status === 'done') {
      const accountRef = db.doc(`users/${task.receiverId}`)
      const account = await transaction.get(accountRef)
      if (!account.exists) return
      if (!task.pointsCredited) {
        const points = Number(task.roll ?? task.points ?? 0)
        transaction.update(accountRef, {
          pointsBalance: Number(account.data().pointsBalance || 0) + points,
          pointsEventTaskId: taskRef.id,
        })
        if (isOlderThanWeek(task.reviewedAt || task.completedAt || task.createdAt)) {
          transaction.delete(taskRef)
        } else {
          transaction.update(taskRef, { pointsCredited: true })
        }
        return
      }
      if (isOlderThanWeek(task.reviewedAt || task.completedAt || task.createdAt)) {
        transaction.delete(taskRef)
      }
      return
    }
    if (task.status === 'rejected' &&
        isOlderThanWeek(task.rejectedAt || task.createdAt)) {
      transaction.delete(taskRef)
    }
  })
}

async function processRedemption(snapshot) {
  const redemptionRef = snapshot.ref
  await db.runTransaction(async transaction => {
    const current = await transaction.get(redemptionRef)
    if (!current.exists) return
    const redemption = current.data()
    if (!['approved', 'rejected', 'used'].includes(redemption.status)) return
    const expired = redemption.status === 'used'
      ? isOlderThanWeek(redemption.usedAt)
      : redemption.status === 'rejected' && isOlderThanWeek(redemption.reviewedAt || redemption.createdAt)
    if (redemption.status === 'approved' && !redemption.pointsDebited) {
      const accountRef = db.doc(`users/${redemption.requesterId}`)
      const account = await transaction.get(accountRef)
      if (!account.exists) return
      transaction.update(accountRef, {
        pointsBalance: Number(account.data().pointsBalance || 0) - Number(redemption.points || 0),
        pointsEventRedemptionId: redemptionRef.id,
      })
      transaction.update(redemptionRef, { pointsDebited: true })
      return
    }
    if (expired) transaction.delete(redemptionRef)
  })
}

const pairs = await db.collection('pairs').get()
let processed = 0
for (const pair of pairs.docs) {
  const [tasks, redemptions] = await Promise.all([
    pair.ref.collection('tasks').get(),
    pair.ref.collection('redemptions').get(),
  ])
  for (const task of tasks.docs) {
    await processTask(task)
    processed++
  }
  for (const redemption of redemptions.docs) {
    await processRedemption(redemption)
    processed++
  }
}

console.log(`Reviewed ${processed} task and redemption records; records older than seven days were removed.`)
