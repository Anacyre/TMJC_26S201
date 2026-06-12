/** Preset icons for class spaces (single Unicode glyph). */
export const COMMUNITY_ICON_PRESETS = [
  { id: 'math', label: 'Math', icon: '∑' },
  { id: 'physics', label: 'Physics', icon: 'Φ' },
  { id: 'chemistry', label: 'Chemistry', icon: '⚗' },
  { id: 'economics', label: 'Economics', icon: '¤' },
  { id: 'news', label: 'News', icon: '✉' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'music', label: 'Music', icon: '♫' },
  { id: 'art', label: 'Art', icon: '✎' },
  { id: 'photo', label: 'Photo', icon: '◉' },
  { id: 'study', label: 'Study', icon: '◎' },
  { id: 'science', label: 'Science', icon: '⚛' },
  { id: 'language', label: 'Language', icon: '文' },
  { id: 'code', label: 'Code', icon: '⟨⟩' },
  { id: 'general', label: 'General', icon: '✿' },
]

const KEYWORD_RULES = [
  { keys: ['math', 'algebra', 'calculus', 'geometry', '数学', '代数'], icon: '∑' },
  { keys: ['phys', 'mechanic', 'motion', '物理', '力学'], icon: 'Φ' },
  { keys: ['chem', 'organic', 'molecule', '化学'], icon: '⚗' },
  { keys: ['econ', 'finance', 'demand', 'supply', '经济', '金融'], icon: '¤' },
  { keys: ['news', 'announce', 'bulletin', 'notice', '新闻', '公告'], icon: '✉' },
  { keys: ['sport', 'fitness', 'ball', 'game', '运动', '体育'], icon: '⚽' },
  { keys: ['music', 'band', 'jazz', 'piano', '音乐'], icon: '♫' },
  { keys: ['art', 'paint', 'draw', 'sketch', '绘画', '美术'], icon: '✎' },
  { keys: ['photo', 'camera', 'lens', '摄影'], icon: '◉' },
  { keys: ['study', 'sprint', 'focus', 'exam', '学习', '复习'], icon: '◎' },
  { keys: ['sci', 'lab', 'bio', '科学', '实验'], icon: '⚛' },
  { keys: ['lang', 'english', 'chinese', 'literature', '语言', '文学'], icon: '文' },
  { keys: ['code', 'program', 'dev', 'cs', '编程', '计算机'], icon: '⟨⟩' },
]

const FALLBACK_ICONS = ['✿', '◐', '◈', '◇', '◆', '▣', '◉', '◎']

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0
  }
  return h
}

/** Suggest a single-character icon from space name / description. */
export function suggestCommunityIcon(name = '', desc = '') {
  const text = `${name} ${desc}`.trim().toLowerCase()
  if (!text) return '#'

  for (const rule of KEYWORD_RULES) {
    if (rule.keys.some((k) => text.includes(k))) return rule.icon
  }

  const first = String(name).trim()[0]
  if (first && /[\u4e00-\u9fff]/.test(first)) return first

  const letters = String(name).replace(/[^a-zA-Z0-9]/g, '')
  if (letters.length >= 2) return letters.slice(0, 2).toUpperCase()
  if (letters.length === 1) return letters.toUpperCase()

  return FALLBACK_ICONS[hashString(text) % FALLBACK_ICONS.length]
}

export function normalizeCommunityIcon(raw, name = '', desc = '') {
  const trimmed = String(raw || '').trim()
  if (trimmed) return trimmed.slice(0, 2)
  return suggestCommunityIcon(name, desc)
}
