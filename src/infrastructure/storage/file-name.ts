export function sanitizeStorageFileName(fileName: string): string {
  const normalized = fileName.normalize('NFKD').replace(/\p{M}/gu, '')
  const extensionIndex = normalized.lastIndexOf('.')
  const hasExtension = extensionIndex > 0
  const name = hasExtension ? normalized.slice(0, extensionIndex) : normalized
  const extension = hasExtension
    ? normalized.slice(extensionIndex + 1).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    : ''
  const safeName = name.replace(/[^a-zA-Z0-9-]/g, '') || 'archivo'

  return extension ? `${safeName}.${extension}` : safeName
}

export function deriveFileName(urlArchivo: string): string {
  const last = urlArchivo.split('/').pop() || urlArchivo
  return last.replace(/^\d{13}-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}-/i, '').replace(/^\d{13}-/, '')
}
