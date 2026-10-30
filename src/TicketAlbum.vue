<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { deleteObject, getBytes, ref as storageRef, uploadBytes } from 'firebase/storage'
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db, storage } from './firebase'
import { normalizeTicketImage } from './ticket-images'

const props = defineProps({
  pairId: { type: String, default: '' },
  userId: { type: String, default: '' },
  partnerName: { type: String, default: '另一半' }
})

const tickets = ref([])
const imageUrls = ref({})
const selectedFiles = ref([])
const previewUrls = ref([])
const form = ref({ date: todayDate(), title: '', note: '' })
const editId = ref('')
const editForm = ref({ date: '', title: '', note: '' })
const processing = ref(false)
const saving = ref(false)
const removingId = ref('')
const error = ref('')
const imagePreview = ref('')
const fileInput = ref(null)
const orderedTickets = computed(() => [...tickets.value].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
let stopTickets = null
let loadVersion = 0

function todayDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function clearImageUrls() {
  Object.values(imageUrls.value).forEach(url => URL.revokeObjectURL(url))
  imageUrls.value = {}
  loadVersion++
}

function clearPreviews() {
  previewUrls.value.forEach(url => URL.revokeObjectURL(url))
  previewUrls.value = []
}

function loadPhotos(rows) {
  const version = ++loadVersion
  Promise.all(rows.flatMap(ticket => ticket.photoPaths.map(async (path, index) => {
    try {
      const bytes = await getBytes(storageRef(storage, path), 5 * 1024 * 1024)
      return [`${ticket.id}:${index}`, URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }))]
    } catch {
      return [`${ticket.id}:${index}`, '']
    }
  }))).then(entries => {
    if (version !== loadVersion) {
      entries.forEach(([, url]) => url && URL.revokeObjectURL(url))
      return
    }
    Object.values(imageUrls.value).forEach(url => URL.revokeObjectURL(url))
    imageUrls.value = Object.fromEntries(entries)
  })
}

watch(() => props.pairId, pairId => {
  stopTickets?.()
  stopTickets = null
  tickets.value = []
  clearImageUrls()
  if (!pairId) return
  stopTickets = onSnapshot(collection(db, 'pairs', pairId, 'tickets'), snapshot => {
    tickets.value = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    loadPhotos(tickets.value)
  }, snapshotError => {
    error.value = snapshotError.code === 'permission-denied' ? '無法讀取票根，請確認已發布最新版 Firestore 規則。' : '讀取票根失敗：' + snapshotError.message
  })
}, { immediate: true })

onBeforeUnmount(() => {
  stopTickets?.()
  clearImageUrls()
  clearPreviews()
})

async function selectFiles(event) {
  clearPreviews()
  selectedFiles.value = []
  error.value = ''
  const files = Array.from(event.target.files || [])
  if (files.length > 4) {
    error.value = '一次電影紀錄最多上傳四張照片。'
    event.target.value = ''
    return
  }
  if (!files.length) return
  processing.value = true
  try {
    selectedFiles.value = await Promise.all(files.map(normalizeTicketImage))
    previewUrls.value = selectedFiles.value.map(file => URL.createObjectURL(file))
  } catch (conversionError) {
    error.value = conversionError.message || '圖片轉檔失敗，請換一張圖片再試。'
    event.target.value = ''
  } finally {
    processing.value = false
  }
}

function resetForm() {
  clearPreviews()
  selectedFiles.value = []
  form.value = { date: todayDate(), title: '', note: '' }
  error.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function saveTicket() {
  error.value = ''
  if (!props.pairId || !props.userId) {
    error.value = '請先登入並完成配對。'
    return
  }
  if (!form.value.date) {
    error.value = '請選擇電影日期。'
    return
  }
  if (selectedFiles.value.length < 1 || selectedFiles.value.length > 4) {
    error.value = '每筆電影紀錄請選擇一到四張照片。'
    return
  }

  saving.value = true
  const ticketRef = doc(collection(db, 'pairs', props.pairId, 'tickets'))
  const uploadedPaths = []
  try {
    const photoPaths = []
    for (const file of selectedFiles.value) {
      const path = `pairs/${props.pairId}/tickets/${ticketRef.id}/${crypto.randomUUID()}.jpg`
      await uploadBytes(storageRef(storage, path), file, { contentType: 'image/jpeg', customMetadata: { ownerUid: props.userId } })
      uploadedPaths.push(path)
      photoPaths.push(path)
    }
    await setDoc(ticketRef, {
      pairId: props.pairId,
      ownerUid: props.userId,
      date: form.value.date,
      title: form.value.title.trim(),
      note: form.value.note.trim(),
      photoPaths,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    resetForm()
  } catch (saveError) {
    await Promise.allSettled(uploadedPaths.map(path => deleteObject(storageRef(storage, path))))
    error.value = saveError.code === 'storage/unauthorized' || saveError.code === 'permission-denied'
      ? '上傳遭拒，請確認 Firebase Storage 已啟用，並發布 storage.rules 和 firestore.rules。'
      : '票根儲存失敗：' + saveError.message
  } finally {
    saving.value = false
  }
}

function beginEdit(ticket) {
  editId.value = ticket.id
  editForm.value = { date: ticket.date, title: ticket.title || '', note: ticket.note || '' }
  error.value = ''
}

async function saveEdit(ticket) {
  if (ticket.ownerUid !== props.userId || !editForm.value.date) return
  error.value = ''
  try {
    await updateDoc(doc(db, 'pairs', props.pairId, 'tickets', ticket.id), {
      date: editForm.value.date,
      title: editForm.value.title.trim(),
      note: editForm.value.note.trim(),
      updatedAt: serverTimestamp()
    })
    editId.value = ''
  } catch (saveError) {
    error.value = saveError.code === 'permission-denied' ? '只有上傳者可以修改票根。' : '修改失敗：' + saveError.message
  }
}

async function removeTicket(ticket) {
  if (ticket.ownerUid !== props.userId || !window.confirm('確定刪除這次電影紀錄和其中所有照片嗎？')) return
  removingId.value = ticket.id
  error.value = ''
  try {
    await deleteDoc(doc(db, 'pairs', props.pairId, 'tickets', ticket.id))
    const results = await Promise.allSettled(ticket.photoPaths.map(path => deleteObject(storageRef(storage, path))))
    if (results.some(result => result.status === 'rejected')) error.value = '紀錄已刪除；部分照片尚未清理，請確認 Storage 規則。'
  } catch (removeError) {
    error.value = removeError.code === 'permission-denied' ? '只有上傳者可以刪除這筆票根。' : '刪除失敗：' + removeError.message
  } finally {
    removingId.value = ''
  }
}
</script>

<template>
  <section class="ticket-album">
    <div class="ticket-heading">
      <div><small>OUR MOVIE MEMORIES</small><h2>電影票根</h2><p>把一起看過的電影，好好收藏起來。</p></div>
      <span class="ticket-heading-icon">🎟️</span>
    </div>

    <form class="ticket-form" @submit.prevent="saveTicket">
      <label>電影日期<input v-model="form.date" type="date" required :disabled="!userId || !pairId"></label>
      <label>電影名稱（選填）<input v-model="form.title" maxlength="80" placeholder="例如：一起看的那部電影" :disabled="!userId || !pairId"></label>
      <label>備註（選填）<textarea v-model="form.note" maxlength="300" placeholder="記下當天的小事" :disabled="!userId || !pairId"></textarea></label>
      <label class="ticket-file-label">上傳票根照片（1–4 張）<input ref="fileInput" type="file" accept="image/*,.heic,.heif" multiple :disabled="!userId || !pairId || processing" @change="selectFiles"><small>支援 JPG、PNG、WebP、HEIC、HEIF；會自動轉為 JPG 並縮小至 5 MB 內。</small></label>
      <p v-if="processing" class="ticket-hint">正在整理照片，請稍候…</p>
      <div v-if="previewUrls.length" class="ticket-previews"><img v-for="(url,index) in previewUrls" :key="index" :src="url" alt="票根預覽"></div>
      <p v-if="error" class="ticket-error" role="alert">{{error}}</p>
      <div class="ticket-form-actions"><button type="button" class="ticket-cancel" @click="resetForm">清除</button><button class="primary" type="submit" :disabled="!userId || !pairId || saving || processing">{{saving?'上傳中…':'新增電影紀錄'}}</button></div>
      <p v-if="!userId" class="ticket-hint">請先登入並完成配對後使用票根相簿。</p>
      <p v-else-if="!pairId" class="ticket-hint">完成配對後，就能和另一半一起收藏電影票根。</p>
    </form>

    <div class="ticket-list-heading"><h3>一起看過的電影</h3><small>依日期由新到舊</small></div>
    <div v-if="!orderedTickets.length" class="ticket-empty">還沒有票根，新增第一場電影回憶吧。</div>
    <article v-for="ticket in orderedTickets" :key="ticket.id" class="ticket-card">
      <template v-if="editId===ticket.id">
        <form class="ticket-edit-form" @submit.prevent="saveEdit(ticket)">
          <label>電影日期<input v-model="editForm.date" type="date" required></label>
          <label>電影名稱<input v-model="editForm.title" maxlength="80" placeholder="電影名稱（選填）"></label>
          <label>備註<textarea v-model="editForm.note" maxlength="300" placeholder="備註（選填）"></textarea></label>
          <div class="ticket-form-actions"><button type="button" class="ticket-cancel" @click="editId=''">取消</button><button class="primary" type="submit">儲存</button></div>
        </form>
      </template>
      <template v-else>
        <div class="ticket-card-heading"><div><time>{{new Date(`${ticket.date}T00:00:00+08:00`).toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'long',day:'numeric'})}}</time><h4>{{ticket.title||'未命名電影'}}</h4></div><span v-if="ticket.ownerUid===userId" class="ticket-owner">我上傳</span><span v-else class="ticket-owner">{{partnerName}}上傳</span></div>
        <p v-if="ticket.note" class="ticket-note">{{ticket.note}}</p>
        <div class="ticket-photos"><button v-for="(path,index) in ticket.photoPaths" :key="path" type="button" class="ticket-photo" :aria-label="`放大檢視第 ${index+1} 張票根`" @click="imageUrls[`${ticket.id}:${index}`] && (imagePreview=imageUrls[`${ticket.id}:${index}`])"><img v-if="imageUrls[`${ticket.id}:${index}`]" :src="imageUrls[`${ticket.id}:${index}`]" alt="電影票根"><span v-else>讀取中…</span></button></div>
        <div v-if="ticket.ownerUid===userId" class="ticket-card-actions"><button type="button" @click="beginEdit(ticket)">修改日期或備註</button><button type="button" class="ticket-delete" :disabled="removingId===ticket.id" @click="removeTicket(ticket)">{{removingId===ticket.id?'刪除中…':'刪除整筆紀錄'}}</button></div>
      </template>
    </article>
  </section>
  <div v-if="imagePreview" class="ticket-lightbox" @click.self="imagePreview=''"><button type="button" aria-label="關閉圖片" @click="imagePreview=''">×</button><img :src="imagePreview" alt="放大的電影票根"></div>
</template>
