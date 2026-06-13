export function personInitials(name) {
  return String(name || '?')
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function personFirstName(name) {
  return String(name || '').split(' ')[0] || '?'
}
