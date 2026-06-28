export function isTestAccount(name) {
  if (!name) return false
  return String(name).trim().toLowerCase().startsWith('test')
}

export function isTestMaintainer(profile) {
  const name = profile?.display_name || profile?.name || ''
  return isTestAccount(name)
}
