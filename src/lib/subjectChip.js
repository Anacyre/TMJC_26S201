export function subjectChipClass(subject) {
  const name = String(subject || '').toLowerCase()
  if (name.includes('math')) return 'sub-blue'
  if (name.includes('phys')) return 'sub-violet'
  if (name.includes('chem')) return 'sub-green'
  if (name.includes('econ')) return 'sub-amber'
  if (name === 'gp' || name.includes('general paper') || name.includes('general')) return 'sub-rose'
  return 'sub-slate'
}
