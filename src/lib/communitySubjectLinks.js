/** Link community spaces ↔ notice/task subject strings. */

export function slugFromCommunityName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const LEGACY_SUBJECT_SLUGS = {
  math: 'Math',
  physics: 'Physics',
  chemistry: 'Chemistry',
  economics: 'Economics',
  gp: 'GP',
}

export function communitySubjectFilterLabels(communities = []) {
  return ['All subjects', ...communities.map((c) => c.name)]
}

export function communitySubjectFilterValue(label, communities = []) {
  if (label === 'All subjects' || !label) return 'All'
  const match = communities.find((c) => c.name === label)
  return match?.id || label
}

export function communitySubjectFilterLabel(value, communities = []) {
  if (!value || value === 'All') return 'All subjects'
  const match = communities.find((c) => c.id === value || c.name === value)
  return match?.name || String(value)
}

export function findCommunityByFilterValue(communities = [], filterValue = '') {
  if (!filterValue || filterValue === 'All') return null
  return (
    communities.find((c) => c.id === filterValue) ||
    communities.find((c) => c.name === filterValue) ||
    null
  )
}

export function subjectTextMatchesCommunity(subjectText, community) {
  if (!community?.name) return false
  const s = String(subjectText || '').trim().toLowerCase()
  if (!s) return false
  const name = String(community.name).trim().toLowerCase()
  if (name === 'gp') return s.includes('general paper') || s === 'gp'
  if (s === name) return true
  return s.includes(name) || name.includes(s)
}

export function noticeMatchesCommunity(notice, community) {
  if (!community) return true
  return subjectTextMatchesCommunity(notice?.subject, community)
}

export function taskMatchesCommunitySubject(task, community) {
  if (!community) return true
  return subjectTextMatchesCommunity(task?.subject, community)
}

export function resolveCommunityFilterFromQuery(communities = [], query = {}) {
  if (query?.communityId) {
    const id = String(query.communityId)
    return communities.some((c) => c.id === id) ? id : 'All'
  }
  if (query?.subject) {
    const slug = String(query.subject).toLowerCase()
    const legacyName = LEGACY_SUBJECT_SLUGS[slug]
    if (legacyName) {
      const legacy = communities.find((c) => c.name.toLowerCase() === legacyName.toLowerCase())
      if (legacy) return legacy.id
    }
    const bySlug = communities.find((c) => slugFromCommunityName(c.name) === slug)
    if (bySlug) return bySlug.id
    const byName = communities.find((c) => c.name.toLowerCase() === slug)
    if (byName) return byName.id
  }
  return 'All'
}

export function communitySubjectNames(communities = []) {
  return communities.map((c) => c.name).filter(Boolean)
}
