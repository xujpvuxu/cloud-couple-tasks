const MAX_BYTES = 5 * 1024 * 1024
const MAX_EDGE = 2200

const isHeic = file => /\.(heic|heif)$/i.test(file.name) || /image\/(heic|heif|heic-sequence|heif-sequence)/i.test(file.type)

async function decodeImageFile(file) {
  if (!isHeic(file)) return file
  const { default: heic2any } = await import('heic2any')
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
  return Array.isArray(converted) ? converted[0] : converted
}

function canvasBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('無法轉換這張圖片。')), 'image/jpeg', quality)
  })
}

export async function normalizeTicketImage(file) {
  if (!file.type.startsWith('image/') && !isHeic(file)) throw new Error('請選擇圖片檔。')

  let source
  try {
    source = await createImageBitmap(await decodeImageFile(file))
  } catch {
    throw new Error('這張圖片無法讀取，請改選 JPG、PNG、WebP 或可轉換的 HEIC/HEIF 圖片。')
  }

  let scale = Math.min(1, MAX_EDGE / Math.max(source.width, source.height))
  let canvas = document.createElement('canvas')
  let context = canvas.getContext('2d')
  if (!context) {
    source.close()
    throw new Error('目前瀏覽器無法處理圖片，請更新瀏覽器後重試。')
  }

  let blob
  try {
    for (let attempt = 0; attempt < 10; attempt++) {
      canvas.width = Math.max(1, Math.round(source.width * scale))
      canvas.height = Math.max(1, Math.round(source.height * scale))
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(source, 0, 0, canvas.width, canvas.height)
      blob = await canvasBlob(canvas, attempt < 3 ? 0.9 - attempt * 0.08 : 0.72)
      if (blob.size <= MAX_BYTES) break
      scale *= 0.78
    }
  } finally {
    source.close()
    canvas.width = 0
    canvas.height = 0
  }

  if (!blob || blob.size > MAX_BYTES) throw new Error('圖片壓縮後仍超過 5 MB，請選擇較小的圖片。')
  const baseName = file.name.replace(/\.[^.]+$/, '').trim() || 'movie-ticket'
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}
