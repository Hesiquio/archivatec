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
