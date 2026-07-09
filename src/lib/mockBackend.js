/**
 * In-memory mock backend used while the real Supabase backend is being wired up.
 *
 * - Mirrors every exported function in src/api/*.js (same return shape, same field names).
 * - State is persisted to uni storage so a page refresh keeps your changes.
 * - Toggle on/off via `VITE_USE_MOCK` in `.env`.
 */

import {
  buildRosterRecords,
  createMemberRecords,
  DEFAULT_MEMBER_PASSWORD,
  isAdminMember,
  memberEmail,
  findClassMember,
  authLoginEmail,
  ROSTER_VERSION,
  slugifyUsername,
  CLASS_MEMBERS,
  mergeProfilesWithClassRoster,
  resolveRosterMemberRole,
} from '@/lib/classMembers'
import { canDeletePost } from '@/lib/postPermissions'
import { canEditNotice } from '@/lib/noticePermissions'
import { isTestMaintainer } from '@/lib/testAccount'
import { adminModeEnabled } from '@/composables/adminModeState'
import {
  enrichTask,
  normalizeTaskStatus,
  parseDueDateKey,
  purgeStaleCompletedTasks,
  resolveDoneAfterChecklistToggle,
  resolveTaskStatusFromForm,
  shouldRetainCompletedTask,
} from '@/lib/taskDueDate'

// ─── Flag ────────────────────────────────────────────────────────────
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') === 'true'

// ─── Storage helpers ─────────────────────────────────────────────────
const STORAGE_KEY = 'mock_backend_v1'
const SESSION_KEY = 'mock_backend_session_v1'
const COMMUNITY_SEED_VERSION = 2
const FOCUS_DATA_VERSION = 'focus_reset_20260627'
const DEMO_COMMUNITY_IDS = new Set(['cmt_study', 'cmt_math', 'cmt_prod', 'cmt_rand'])
const DEMO_POST_IDS = new Set(['p1', 'p2', 'p3', 'p4', 'p5'])

function safeGet(key) {
  try { return uni.getStorageSync(key) || null } catch { return null }
}
function safeSet(key, value) {
  try { uni.setStorageSync(key, value) } catch {}
}

function uid(prefix = 'mck') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
function nowIso() { return new Date().toISOString() }
async function tick(ms = 60) { return new Promise((r) => setTimeout(r, ms)) }

function isoDaysFromNow(days) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── Seed data ───────────────────────────────────────────────────────
function seedState() {
  const userId = 'usr_test_admin'
  const testMaintainerId = 'usr_test_maintainer'
  const rosterRecords = buildRosterRecords(() => uid('usr'))
  const peerA = rosterRecords[0].profile.id
  const peerB = rosterRecords[1].profile.id
  const peerC = rosterRecords[2].profile.id
  const peerD = rosterRecords[3].profile.id

  const subjMath = 'sub_math'
  const subjPhys = 'sub_phys'
  const subjChem = 'sub_chem'
  const subjEcon = 'sub_econ'
  const subjGp   = 'sub_gp'

  const noticeMathHw   = 'ntf_math_ch6'
  const noticePhysHw   = 'ntf_phys_proj'
  const noticeChemHw   = 'ntf_chem_mech'
  const noticeViaBeach = 'ntf_via_beach'
  const noticeViaShel  = 'ntf_via_shelter'
  const noticeViaTutor = 'ntf_via_tutor'
  const noticeGenHols  = 'ntf_gen_holiday'
  const noticeEventOut = 'ntf_event_outing'

  const taskMath  = 'tsk_math_ch6'
  const taskPhys  = 'tsk_phys_proj'
  const taskChem  = 'tsk_chem_org'
  const taskGp    = 'tsk_gp_essay'
  const taskEcon  = 'tsk_econ_demand'

  const dueThu = isoDaysFromNow(1)
  const dueFri = isoDaysFromNow(2)
  const dueMon = isoDaysFromNow(4)
  const dueSat = isoDaysFromNow(3)
  const dueNextSun = isoDaysFromNow(7)
  const feedbackThreadSeed = 'fdb_thread_seed'

  return {
    roster_version: ROSTER_VERSION,
    // —— Auth users ——
    authUsers: [
      { id: userId, email: 'test@class.com', username: 'alex_tan', display_name: 'Alex Tan' },
      { id: testMaintainerId, email: 'test.maintainer@class.com', username: 'test_maintainer', display_name: 'Test Maintainer' },
      ...rosterRecords.map((r) => r.auth),
    ],

    // —— Profiles ——
    profiles: [
      {
        id: userId,
        username: 'alex_tan',
        display_name: 'Alex Tan',
        name: 'Alex Tan',
        role: 'admin',
        is_admin: true,
        birthday: '',
        mbti: 'INTJ',
        interests: 'astrophysics, jazz piano, pour-over coffee',
        bio: 'Class rep for 26S201. Loves a good study sprint.',
        links: [{ label: 'Notion', url: 'https://notion.so' }],
        birthday_visibility: 'Friends',
        avatar_url: '',
      },
      {
        id: testMaintainerId,
        username: 'test_maintainer',
        display_name: 'Test Maintainer',
        name: 'Test Maintainer',
        role: 'member',
        is_admin: false,
        birthday: '',
        mbti: '',
        interests: '',
        bio: 'Maintainer inbox for private feedback.',
        links: [],
        birthday_visibility: 'Private',
        avatar_url: '',
      },
      ...rosterRecords.map((r) => r.profile),
    ],

    // —— Tasks (belong to test user) ——
    tasks: [
      {
        id: taskMath, user_id: userId,
        title: 'Math chapter 6 discussion Qn 8',
        description: 'Vector geometry — prove that the three medians of a triangle meet at one point. Bring annotated worksheet to class.',
        deadline: 'Due Thu 4:00 PM', subject: 'Math',
        priority: 'P1', status: 'recent', reminder: '1h before',
        done: false,
        checklist: [
          { id: 'c1', text: 'Read worked example on p.142', done: true, deadline: '' },
          { id: 'c2', text: 'Sketch the medians', done: false, deadline: '2026-05-27' },
          { id: 'c3', text: 'Write the proof', done: false, deadline: '2026-05-29' },
        ],
        related_notice: { id: noticeMathHw, title: 'Math Chapter 6 — Discussion Q8' },
        source_notice_id: noticeMathHw,
        created_at: nowIso(),
      },
      {
        id: taskPhys, user_id: userId,
        title: 'Physics projectile motion assignment',
        description: 'Worksheet 4.2 — 6 problems on launched balls and inclined surfaces. Show working clearly.',
        deadline: 'Due Fri 11:59 PM', subject: 'Physics',
        priority: 'P2', status: 'recent', reminder: 'Fri May 30 · 2026-05-30 at 07:30 · repeat:daily (Daily)',
        done: false,
        checklist: [
          { id: 'c1', text: 'Watch recap video', done: false },
          { id: 'c2', text: 'Q1-3 (level 1)', done: false },
          { id: 'c3', text: 'Q4-6 (level 2)', done: false },
        ],
        related_notice: { id: noticePhysHw, title: 'Physics Worksheet 4.2 — Projectile Motion' },
        source_notice_id: noticePhysHw,
        created_at: nowIso(),
      },
      {
        id: taskChem, user_id: userId,
        title: 'Chemistry organic mechanism worksheet',
        description: 'Draw curly arrows for SN1 and SN2. Compare rates.',
        deadline: 'Due Mon next week', subject: 'Chemistry',
        priority: 'P3', status: 'upcoming', reminder: 'None',
        done: false, checklist: [],
        related_notice: { id: noticeChemHw, title: 'Chemistry — Organic Mechanisms' },
        source_notice_id: noticeChemHw,
        created_at: nowIso(),
      },
      {
        id: taskGp, user_id: userId,
        title: 'GP essay outline — climate policy',
        description: '“Has the world done enough to fight climate change?” Draft thesis + 3 supporting points.',
        deadline: 'Due Sat', subject: 'GP',
        priority: 'P2', status: 'upcoming', reminder: 'Evening before',
        done: false,
        checklist: [
          { id: 'c1', text: 'Pick a stance', done: true },
          { id: 'c2', text: 'Find 2 statistics', done: false },
        ],
        related_notice: null, source_notice_id: '',
        created_at: nowIso(),
      },
      {
        id: taskEcon, user_id: userId,
        title: 'Economics demand curve practice',
        description: 'Tutorial 3 question 2(a)–(c). Already turned in.',
        deadline: 'Submitted Mon', subject: 'Economics',
        priority: 'P3', status: 'completed', reminder: 'None',
        done: true, checklist: [],
        related_notice: null, source_notice_id: '',
        created_at: nowIso(),
      },
    ],

    // —— Notifications ——
    notifications: [
      {
        id: noticeMathHw, type: 'Homework',
        title: 'Math Chapter 6 — Discussion Q8',
        subject: 'Math', deadline: 'Thu 4:00 PM', deadline_at: dueThu,
        description: 'Please complete Discussion Question 8 from Chapter 6 (Vectors). Be ready to share your working in class.',
        attachment: 'Ch6_Discussion.pdf', attachment_url: '',
        by: 'Ms Lim (Math)', important: true,
        created_at: nowIso(),
      },
      {
        id: noticePhysHw, type: 'Homework',
        title: 'Physics Worksheet 4.2 — Projectile Motion',
        subject: 'Physics', deadline: 'Fri 11:59 PM', deadline_at: dueFri,
        description: 'Six-problem worksheet on projectile motion. Submit via the class portal.',
        attachment: 'Worksheet_4.2.pdf', attachment_url: '',
        by: 'Mr Chen (Physics)', important: true,
        created_at: nowIso(),
      },
      {
        id: noticeChemHw, type: 'Homework',
        title: 'Chemistry — Organic Mechanisms',
        subject: 'Chemistry', deadline: 'Mon next week', deadline_at: dueMon,
        description: 'Mechanism worksheet covering SN1 / SN2. Curly arrows required.',
        attachment: '', attachment_url: '',
        by: 'Mr Lee (Chem)', important: false,
        created_at: nowIso(),
      },
      {
        id: noticeViaBeach, type: 'VIA',
        title: 'VIA — Beach clean-up @ East Coast Park',
        subject: 'Community service', deadline: 'Sat 9:00 AM', deadline_at: dueSat,
        description: 'Help keep our coastline clean! Gloves, bags and refreshments provided. Counts towards 3 VIA hours.',
        attachment: '', attachment_url: '',
        by: 'CCA Office', important: true,
        created_at: nowIso(),
      },
      {
        id: noticeViaShel, type: 'VIA',
        title: 'VIA — Animal shelter visit (SPCA)',
        subject: 'Community service', deadline: 'Next Sun 10:00 AM', deadline_at: dueNextSun,
        description: 'Walk dogs, clean enclosures and help with adoption day. 4 VIA hours awarded.',
        attachment: '', attachment_url: '',
        by: 'CCA Office', important: false,
        created_at: nowIso(),
      },
      {
        id: noticeViaTutor, type: 'VIA',
        title: 'VIA — Primary school tutoring programme',
        subject: 'Community service', deadline: 'Sign-up by Fri',
        description: 'Tutor P5 students in Math & English on Wednesday afternoons. 2-hour sessions, 8-week commitment.',
        attachment: '', attachment_url: '',
        by: 'Mrs Goh (VIA Coord.)', important: false,
        created_at: nowIso(),
      },
      {
        id: noticeGenHols, type: 'General',
        title: 'June holidays — library opening hours',
        subject: 'General', deadline: '',
        description: 'School library will open 9am–1pm on weekdays during the June break. Study rooms must be booked one day in advance.',
        attachment: '', attachment_url: '',
        by: 'School Office', important: false,
        created_at: nowIso(),
      },
      {
        id: noticeEventOut, type: 'Event',
        title: 'Class outing — bowling + dinner',
        subject: 'Class', deadline: 'RSVP by Wed',
        description: 'Class outing to Orchard Bowl this Saturday at 4pm, dinner after at the food court. RSVP in the comments.',
        attachment: '', attachment_url: '',
        by: 'Alex Tan (Class Rep)', important: false,
        created_by: userId,
        created_at: nowIso(),
      },
    ],

    // —— Personal state on notifications (per user) ——
    notificationUserStates: [
      { user_id: userId, notification_id: noticeMathHw,   hidden: false, read: false, important: true,  in_planner: true  },
      { user_id: userId, notification_id: noticePhysHw,   hidden: false, read: false, important: true,  in_planner: true  },
      { user_id: userId, notification_id: noticeChemHw,   hidden: false, read: true,  important: false, in_planner: true  },
      { user_id: userId, notification_id: noticeViaBeach, hidden: false, read: false, important: true,  in_planner: false },
      { user_id: userId, notification_id: noticeViaShel,  hidden: false, read: false, important: false, in_planner: false },
      { user_id: userId, notification_id: noticeViaTutor, hidden: false, read: true,  important: false, in_planner: false },
      { user_id: userId, notification_id: noticeGenHols,  hidden: false, read: true,  important: false, in_planner: false },
      { user_id: userId, notification_id: noticeEventOut, hidden: false, read: false, important: false, in_planner: false },
    ],

    // —— Reminder delivery inbox (per user) ——
    reminderEvents: [],

    // —— Communities ——
    communities: [],

    // —— Posts ——
    posts: [],

    // —— Post likes / comments ——
    postLikes: [],
    comments: [],

    // —— Study ——
    subjects: [
      { id: subjMath, icon: '∑', name: 'Math',      updated_at: nowIso() },
      { id: subjPhys, icon: '◓', name: 'Physics',   updated_at: nowIso() },
      { id: subjChem, icon: '◔', name: 'Chemistry', updated_at: nowIso() },
      { id: subjEcon, icon: '◑', name: 'Economics', updated_at: nowIso() },
      { id: subjGp,   icon: '◒', name: 'GP',        updated_at: nowIso() },
    ],
    resources: [
      { id: 'res1', subject_id: subjMath, user_id: peerB, type: 'PDF',   title: 'Vectors — annotated lecture notes', file_key: '', file_url: '', file_size: 1456000, downloads_count: 42, likes_count: 18, created_at: nowIso() },
      { id: 'res2', subject_id: subjPhys, user_id: peerA, type: 'PDF',   title: 'Kinematics summary (1-page cheatsheet)', file_key: '', file_url: '', file_size: 220000, downloads_count: 88, likes_count: 31, created_at: nowIso() },
      { id: 'res3', subject_id: subjChem, user_id: peerC, type: 'Notes', title: 'Organic mechanisms — diagram pack', file_key: '', file_url: '', file_size: 980000, downloads_count: 25, likes_count: 12, created_at: nowIso() },
      { id: 'res4', subject_id: subjGp,   user_id: peerD, type: 'Notes', title: 'GP essay structure template', file_key: '', file_url: '', file_size: 64000,  downloads_count: 71, likes_count: 24, created_at: nowIso() },
      { id: 'res5', subject_id: subjEcon, user_id: userId, type: 'PDF',  title: 'Demand & supply — worked examples',  file_key: '', file_url: '', file_size: 540000, downloads_count: 33, likes_count: 14, created_at: nowIso() },
    ],
    resourceLikes: [
      { user_id: userId, resource_id: 'res2' },
      { user_id: userId, resource_id: 'res4' },
    ],

    focusSounds: [],
    focusSessions: [],
    feedback_threads: [
      {
        id: feedbackThreadSeed,
        user_id: peerA,
        status: 'open',
        created_at: nowIso(),
        updated_at: nowIso(),
        resolved_at: null,
        resolved_by: null,
      },
    ],
    feedback_messages: [
      {
        id: 'fdb_msg_seed',
        thread_id: feedbackThreadSeed,
        sender_id: peerA,
        body: 'The tasks page feels slow when switching tabs. Could we cache more?',
        created_at: nowIso(),
      },
    ],
    focus_data_version: FOCUS_DATA_VERSION,
    community_seed_version: COMMUNITY_SEED_VERSION,
  }
}

// ─── State load / save ───────────────────────────────────────────────
let _state = safeGet(STORAGE_KEY) || null
if (!_state) {
  _state = seedState()
  safeSet(STORAGE_KEY, _state)
} else {
  _state = ensureClassRoster(_state)
  _state = ensureCommunitySeed(_state)
  _state = ensureFocusDataReset(_state)
  _state = ensureFeedbackData(_state)
  safeSet(STORAGE_KEY, _state)
}

let _session = safeGet(SESSION_KEY) || null

function rehydrateSessionFromStorage() {
  if (_session?.user?.id) return
  const stored = safeGet(SESSION_KEY)
  if (stored?.user?.id) _session = stored
}

function setSession(value) {
  _session = value
  safeSet(SESSION_KEY, value)
}

let _persistTimer = null
function persist() {
  if (_persistTimer) return
  _persistTimer = setTimeout(() => {
    _persistTimer = null
    safeSet(STORAGE_KEY, _state)
  }, 200)
}

function persistNow() {
  if (_persistTimer) {
    clearTimeout(_persistTimer)
    _persistTimer = null
  }
  safeSet(STORAGE_KEY, _state)
}

function ensureFocusDataReset(state) {
  if (state.focus_data_version === FOCUS_DATA_VERSION) return state
  state.focusSessions = []
  state.focus_data_version = FOCUS_DATA_VERSION
  return state
}

function ensureFeedbackData(state) {
  if (!Array.isArray(state.feedback_threads)) state.feedback_threads = []
  if (!Array.isArray(state.feedback_messages)) state.feedback_messages = []

  const hasMaintainer = (state.profiles || []).some((p) => isTestMaintainer(p))
  if (!hasMaintainer) {
    const testMaintainerId = 'usr_test_maintainer'
    state.authUsers = state.authUsers || []
    state.profiles = state.profiles || []
    if (!state.authUsers.some((u) => u.id === testMaintainerId)) {
      state.authUsers.push({
        id: testMaintainerId,
        email: 'test.maintainer@class.com',
        username: 'test_maintainer',
        display_name: 'Test Maintainer',
      })
    }
    if (!state.profiles.some((p) => p.id === testMaintainerId)) {
      state.profiles.push({
        id: testMaintainerId,
        username: 'test_maintainer',
        display_name: 'Test Maintainer',
        name: 'Test Maintainer',
        role: 'member',
        is_admin: false,
        birthday: '',
        mbti: '',
        interests: '',
        bio: 'Maintainer inbox for private feedback.',
        links: [],
        birthday_visibility: 'Private',
        avatar_url: '',
      })
    }
  }
  return state
}

function ensureCommunitySeed(state) {
  if ((state.community_seed_version || 0) >= COMMUNITY_SEED_VERSION) return state
  state.communities = (state.communities || []).filter((c) => !DEMO_COMMUNITY_IDS.has(c.id))
  state.posts = (state.posts || []).filter(
    (p) => !DEMO_POST_IDS.has(p.id) && !DEMO_COMMUNITY_IDS.has(p.community_id)
  )
  const postIds = new Set((state.posts || []).map((p) => p.id))
  state.comments = (state.comments || []).filter((c) => postIds.has(c.post_id))
  state.postLikes = (state.postLikes || []).filter((l) => postIds.has(l.post_id))
  for (const c of state.communities || []) {
    if (!c.created_at) c.created_at = nowIso()
    if (!c.updated_at) c.updated_at = c.created_at
  }
  state.community_seed_version = COMMUNITY_SEED_VERSION
  return state
}

function ensureClassRoster(state) {
  const demoIds = ['usr_peer_a', 'usr_peer_b', 'usr_peer_c', 'usr_peer_d']
  if (state.roster_version !== ROSTER_VERSION) {
    state.authUsers = (state.authUsers || []).filter((u) => !demoIds.includes(u.id))
    state.profiles = (state.profiles || []).filter((p) => !demoIds.includes(p.id))
  }

  const rosterNames = new Set(CLASS_MEMBERS.map((m) => m.username))
  state.authUsers = state.authUsers || []
  state.profiles = state.profiles || []

  const byUsername = new Map(
    state.profiles.filter((p) => p.username).map((p) => [p.username, p])
  )

  for (const member of CLASS_MEMBERS) {
    const profile = byUsername.get(member.username)
    if (profile) {
      profile.display_name = member.display_name
      profile.name = member.display_name
      const roleAuth = resolveRosterMemberRole(member, profile)
      profile.role = roleAuth.role
      profile.is_admin = roleAuth.is_admin
      profile.email =
        member.role === 'teacher_admin' ? '' : memberEmail(member.username, member.role)
      if (member.birthday) profile.birthday = member.birthday

      const authUser = state.authUsers.find((u) => u.id === profile.id)
      if (authUser) {
        authUser.username = member.username
        authUser.display_name = member.display_name
        authUser.email = authLoginEmail(member.username, member.role)
      }
      continue
    }

    const record = createMemberRecords(member, uid('usr'))
    state.authUsers.push(record.auth)
    state.profiles.push(record.profile)
    byUsername.set(member.username, record.profile)
  }

  const removable = state.profiles.filter((p) => {
    if (!p.username || rosterNames.has(p.username)) return false
    if (p.id === 'usr_test_admin') return false
    if (String(p.name || p.display_name || '').trim().toLowerCase().startsWith('test')) {
      return false
    }
    const auth = state.authUsers.find((u) => u.id === p.id)
    return !!auth?.must_change_password
  })
  for (const p of removable) {
    state.profiles = state.profiles.filter((x) => x.id !== p.id)
    state.authUsers = state.authUsers.filter((u) => u.id !== p.id)
  }

  for (const p of state.profiles) {
    if (!p.display_name && p.name) p.display_name = p.name
    if (!p.username && p.display_name) p.username = slugifyUsername(p.display_name)
    if (p.is_admin === undefined) p.is_admin = isAdminMember(p)
    if (!p.birthday) p.birthday = ''
  }

  for (const u of state.authUsers) {
    const profile = state.profiles.find((p) => p.id === u.id)
    if (!u.username && profile?.username) u.username = profile.username
    if (!u.display_name && profile?.display_name) u.display_name = profile.display_name
  }

  state.roster_version = ROSTER_VERSION
  if (!Array.isArray(state.focusSounds)) state.focusSounds = []
  if (!Array.isArray(state.focusSessions)) state.focusSessions = []
  return state
}

/** Reset the mock backend back to its seeded state (used for "Reset preview"). */
export function resetMockBackend() {
  _state = seedState()
  _state = ensureFocusDataReset(_state)
  setSession(null)
  persistNow()
}

function currentUserId() { return _session?.user?.id || null }
function findProfile(id) { return _state.profiles.find((p) => p.id === id) || null }
function findAuthUser(id) { return _state.authUsers.find((u) => u.id === id) || null }

export function hasStoredSession() {
  rehydrateSessionFromStorage()
  return !!_session?.user?.id
}

export function resolveAccountToEmail(input) {
  const trimmed = String(input || '').trim().toLowerCase()
  if (!trimmed) return ''
  if (trimmed.includes('@')) return trimmed
  const byUsername = _state.authUsers.find((u) => u.username?.toLowerCase() === trimmed)
  if (byUsername?.email) return byUsername.email
  const rosterMember = findClassMember(trimmed)
  if (rosterMember) return authLoginEmail(rosterMember.username, rosterMember.role)
  const byEmailPrefix = _state.authUsers.find((u) => u.email?.split('@')[0]?.toLowerCase() === trimmed)
  return byEmailPrefix?.email || ''
}

// ─── Role inference (matches login.vue logic) ────────────────────────
function detectRole(email) {
  const e = (email || '').toLowerCase().trim()
  if (e.endsWith('@class.com')) return 'admin'
  return 'member'
}

function normalizeChecklist(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

// ─── Mappers (snake_case row → camelCase domain object) ──────────────
function rowToTask(row) {
  const task = {
    id: row.id,
    title: row.title,
    description: row.description || '',
    deadline: row.deadline || 'Anytime',
    subject: row.subject || 'General',
    priority: row.priority || 'P3',
    status: normalizeTaskStatus(row.status),
    reminder: row.reminder || 'None',
    reminderAt: row.reminder_at || '',
    reminderRepeat: row.reminder_repeat || 'none',
    done: !!row.done,
    checklist: normalizeChecklist(row.checklist),
    relatedNotice: row.related_notice || null,
    sourceNoticeId: row.source_notice_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || '',
    completedAt: row.completed_at || (row.done ? row.updated_at : '') || '',
  }
  return enrichTask(task)
}

function rowToNotification(row, state = null) {
  const hasUserState = state != null
  const s = state || {}
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    subject: row.subject || '',
    deadline: row.deadline || '',
    deadlineAt: row.deadline_at || '',
    description: row.description || '',
    attachment: row.attachment || '',
    attachmentUrl: row.attachment_url || '',
    checklist: normalizeChecklist(row.checklist),
    reminder: row.reminder || 'None',
    reminderAt: row.reminder_at || '',
    reminderRepeat: row.reminder_repeat || 'none',
    by: row.by || 'Admin',
    createdBy: row.created_by || '',
    createdAt: row.created_at,
    hidden: s.hidden ?? false,
    read: s.read ?? false,
    important: s.important ?? !!row.important,
    inPlanner: s.in_planner ?? false,
    hasUserState,
  }
}

function rowToPost(row, likedSet = new Set(), lookup = null) {
  const community = lookup?.communityById?.get(row.community_id)
    ?? _state.communities.find((c) => c.id === row.community_id)
  const author = lookup?.profileById?.get(row.user_id) ?? findProfile(row.user_id)
  return {
    id: row.id,
    communityId: row.community_id,
    communityName: community?.name || '',
    title: row.title,
    content: row.content || '',
    author: row.anonymous ? 'Anonymous' : (author?.name || 'Unknown'),
    authorId: row.user_id || null,
    anonymous: !!row.anonymous,
    likesCount: row.likes_count || 0,
    commentsCount: row.comments_count || 0,
    image: row.image || '',
    attachment: row.attachment || '',
    attachmentUrl: row.attachment_url || '',
    fileKey: row.file_key || '',
    liked: likedSet.has(row.id),
    postType: row.post_type || 'regular',
    fileSize: row.file_size || 0,
    createdAt: row.created_at,
  }
}

function rowToComment(row) {
  const author = findProfile(row.user_id)
  return {
    id: row.id,
    postId: row.post_id,
    author: row.anonymous ? 'Anonymous' : (author?.name || 'Unknown'),
    authorId: row.user_id || null,
    anonymous: !!row.anonymous,
    text: row.text,
    createdAt: row.created_at,
  }
}

function rowToCommunity(row) {
  const creator = row.created_by ? findProfile(row.created_by) : null
  return {
    id: row.id,
    icon: row.icon || '◉',
    name: row.name || '',
    desc: row.desc || '',
    createdBy: row.created_by || '',
    createdByName: creator?.display_name || creator?.name || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || row.created_at || '',
    pinned: !!row.is_pinned,
    pinnedAt: row.pinned_at || '',
  }
}

function rowToResource(row, likedSet = new Set(), lookup = null) {
  const subject = lookup?.subjectById?.get(row.subject_id)
    ?? _state.subjects.find((s) => s.id === row.subject_id)
  const uploader = lookup?.profileById?.get(row.user_id) ?? findProfile(row.user_id)
  return {
    id: row.id,
    subjectId: row.subject_id,
    subjectName: subject?.name || '',
    type: row.type || 'PDF',
    title: row.title,
    uploaderId: row.user_id,
    uploaderName: uploader?.name || 'Unknown',
    downloadsCount: row.downloads_count || 0,
    likesCount: row.likes_count || 0,
    liked: likedSet.has(row.id),
    fileUrl: row.file_url || '',
    fileKey: row.file_key || '',
    fileSize: row.file_size || 0,
    createdAt: row.created_at,
  }
}

// ═════════════════════════════════════════════════════════════════════
//  AUTH (src/api/auth.js surface)
// ═════════════════════════════════════════════════════════════════════
export async function login(email, password) {
  await tick()
  const trimmed = String(email || '').trim().toLowerCase()
  if (!trimmed) return { data: null, error: new Error('Please enter account') }

  const resolvedEmail = trimmed.includes('@') ? trimmed : (resolveAccountToEmail(trimmed) || trimmed)
  let user = _state.authUsers.find((u) => u.email?.toLowerCase() === resolvedEmail)
  if (!user && !trimmed.includes('@')) {
    user = _state.authUsers.find((u) => u.username?.toLowerCase() === trimmed)
  }
  if (!user) {
    return { data: null, error: new Error('Account not found') }
  }
  if (user.password && String(password || '') !== user.password) {
    return { data: null, error: new Error('Incorrect password') }
  }
  const session = {
    access_token: 'mock-token',
    user: { id: user.id, email: user.email, user_metadata: { display_name: user.display_name } },
  }
  setSession(session)
  const mustChangePassword =
    !!user.must_change_password || String(password || '') === DEFAULT_MEMBER_PASSWORD
  return {
    data: {
      user: session.user,
      session,
      mustChangePassword,
    },
    error: null,
  }
}

export async function register(email, password, displayName) {
  await tick()
  const trimmed = (email || '').toLowerCase().trim()
  if (_state.authUsers.some((u) => u.email.toLowerCase() === trimmed)) {
    return { data: null, error: new Error('Email already registered') }
  }
  const id = uid('usr')
  _state.authUsers.push({ id, email: trimmed, display_name: displayName || trimmed.split('@')[0] })
  _state.profiles.push({
    id, name: displayName || trimmed.split('@')[0], role: detectRole(trimmed),
    mbti: '', interests: '', bio: '', links: [],
    birthday_visibility: 'Friends', avatar_url: '',
  })
  persist()
  return { data: { user: { id, email: trimmed, user_metadata: { display_name: displayName } } }, error: null }
}

export async function logout() {
  await tick(20)
  setSession(null)
  return { error: null }
}

export async function getCurrentUser() {
  await tick(20)
  const id = currentUserId()
  if (!id) return { user: null, profile: null, error: null }
  const authUser = findAuthUser(id)
  const profile = findProfile(id)
  if (!authUser) return { user: null, profile: null, error: null }
  const mustChangePassword = !!authUser.must_change_password
  return {
    user: {
      id: authUser.id,
      email: authUser.email,
      user_metadata: {
        display_name: authUser.display_name,
        must_change_password: mustChangePassword,
      },
      app_metadata: { must_change_password: mustChangePassword },
    },
    profile: profile ? { ...profile, must_change_password: mustChangePassword } : null,
    error: null,
  }
}

export async function forgotPassword(/* email */) {
  await tick(20)
  return { error: null }
}

export function onAuthStateChange(/* callback */) {
  return { data: { subscription: { unsubscribe() {} } } }
}

// ═════════════════════════════════════════════════════════════════════
//  PROFILES (src/api/profile.js surface)
// ═════════════════════════════════════════════════════════════════════
export async function getProfile(userId) {
  await tick()
  const profile = findProfile(userId)
  return { data: profile, error: profile ? null : new Error('Profile not found') }
}

export async function getMembers() {
  await tick()
  if (_state.roster_version !== ROSTER_VERSION) {
    _state = ensureClassRoster(_state)
    persistNow()
  }

  const rows = _state.profiles.map((p) => ({
    id: p.id,
    username: p.username || '',
    display_name: p.display_name || p.name || '',
    name: p.display_name || p.name || '',
    birthday: p.birthday || '',
    mbti: p.mbti,
    interests: p.interests,
    bio: p.bio,
    links: p.links,
    role: p.role || 'student',
    is_admin: !!p.is_admin,
    email: p.role === 'teacher_admin' ? '' : (p.email || memberEmail(p.username, p.role)),
    avatar_url: p.avatar_url,
  }))

  return { data: mergeProfilesWithClassRoster(rows), error: null }
}

export async function updateProfile(userId, payload) {
  await tick()
  const idx = _state.profiles.findIndex((p) => p.id === userId)
  if (idx < 0) return { data: null, error: new Error('Profile not found') }
  const next = { ..._state.profiles[idx] }
  if (payload.name !== undefined) next.name = payload.name
  if (payload.mbti !== undefined) next.mbti = payload.mbti
  if (payload.interests !== undefined) next.interests = payload.interests
  if (payload.bio !== undefined) next.bio = payload.bio
  if (payload.links !== undefined) next.links = payload.links
  if (payload.birthdayVisibility !== undefined) next.birthday_visibility = payload.birthdayVisibility
  const av = payload.avatarUrl ?? payload.avatar
  if (av !== undefined) next.avatar_url = av
  _state.profiles[idx] = next
  persist()
  return { data: next, error: null }
}

// ═════════════════════════════════════════════════════════════════════
//  ADMIN — member management (mock only)
// ═════════════════════════════════════════════════════════════════════
export async function requireAdminCaller() {
  await tick()
  const userId = currentUserId()
  if (!userId) return { error: new Error('Not signed in') }
  const profile = _state.profiles.find((p) => p.id === userId)
  if (!isAdminMember(profile)) return { error: new Error('Admins only') }
  return { error: null }
}

export async function adminAddMember({ username, display_name, name, email, role = 'student', birthday = '', is_admin = false }) {
  await tick()
  const { error: denied } = await requireAdminCaller()
  if (denied) return { data: null, error: denied }
  const cleanUsername = slugifyUsername(username || name || display_name)
  const cleanDisplay = String(display_name || name || '').trim()
  if (!cleanUsername || !/^[a-z0-9_]+$/.test(cleanUsername)) {
    return { data: null, error: new Error('Username required (lowercase, underscores only)') }
  }
  if (!cleanDisplay) {
    return { data: null, error: new Error('Display name required') }
  }

  const memberRole = role === 'admin' || role === 'teacher_admin' ? role : 'student'
  const adminFlag = is_admin || memberRole === 'admin' || memberRole === 'teacher_admin'
  const cleanEmail = String(email || '').trim().toLowerCase() || authLoginEmail(cleanUsername, memberRole)
  const profileEmail = memberEmail(cleanUsername, memberRole)

  if (_state.authUsers.some((u) => u.username === cleanUsername)) {
    return { data: null, error: new Error('Username already exists') }
  }
  if (_state.authUsers.some((u) => u.email?.toLowerCase() === cleanEmail)) {
    return { data: null, error: new Error('Email already exists') }
  }

  const id = uid('usr')
  _state.authUsers.push({
    id,
    username: cleanUsername,
    email: cleanEmail,
    display_name: cleanDisplay,
    password: DEFAULT_MEMBER_PASSWORD,
    must_change_password: true,
  })
  _state.profiles.push({
    id,
    username: cleanUsername,
    display_name: cleanDisplay,
    name: cleanDisplay,
    birthday: birthday || '',
    role: memberRole,
    is_admin: adminFlag,
    email: profileEmail,
    mbti: '',
    interests: '',
    bio: '',
    links: [],
    birthday_visibility: 'Friends',
    avatar_url: '',
  })
  persist()
  return {
    data: { id, username: cleanUsername, display_name: cleanDisplay, defaultPassword: DEFAULT_MEMBER_PASSWORD },
    error: null,
  }
}

export async function changePassword(userId, newPassword) {
  await tick()
  const user = _state.authUsers.find((u) => u.id === userId)
  if (!user) return { error: new Error('User not found') }
  const next = String(newPassword || '').trim()
  if (next.length < 6) return { error: new Error('Password must be at least 6 characters') }
  if (next === DEFAULT_MEMBER_PASSWORD) {
    return { error: new Error('Please choose a password other than the default') }
  }
  user.password = next
  user.must_change_password = false
  persist()
  return { error: null }
}

export async function adminSetRole(userId, role) {
  await tick()
  const { error: denied } = await requireAdminCaller()
  if (denied) return { data: null, error: denied }
  const idx = _state.profiles.findIndex((p) => p.id === userId)
  if (idx < 0) return { data: null, error: new Error('Profile not found') }
  _state.profiles[idx].role = role === 'admin' ? 'admin' : role === 'teacher_admin' ? 'teacher_admin' : 'student'
  _state.profiles[idx].is_admin = role === 'admin' || role === 'teacher_admin'
  persist()
  return { data: _state.profiles[idx], error: null }
}

// ═════════════════════════════════════════════════════════════════════
//  TASKS (src/api/tasks.js surface)
// ═════════════════════════════════════════════════════════════════════
export async function fetchTasks(options = {}) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: [], error: new Error('Not signed in') }

  const staleIds = _state.tasks
    .filter((t) => t.user_id === userId && t.done && !shouldRetainCompletedTask(rowToTask(t)))
    .map((t) => t.id)
  if (staleIds.length) {
    _state.tasks = _state.tasks.filter((t) => !staleIds.includes(t.id))
    persist()
  }

  let rows = _state.tasks.filter((t) => t.user_id === userId)
  if (options.status) {
    const status = options.status === 'recent' ? ['recent', 'today'] : [options.status]
    rows = rows.filter((t) => status.includes(normalizeTaskStatus(t.status)))
  }
  rows = [...rows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return { data: purgeStaleCompletedTasks(rows.map(rowToTask)), error: null }
}

export async function fetchTaskById(taskId) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: null, error: new Error('Not signed in') }
  const row = _state.tasks.find((t) => t.id === taskId && t.user_id === userId)
  if (!row) return { data: null, error: new Error('Task not found') }
  return { data: rowToTask(row), error: null }
}

export async function createTask(payload) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: null, error: new Error('Not signed in') }
  const deadlineDate = parseDueDateKey(payload.deadline)
  const row = {
    id: uid('tsk'), user_id: userId,
    title: payload.title?.trim() || 'Untitled Task',
    description: payload.description?.trim() || '',
    deadline: payload.deadline?.trim() || 'Anytime',
    subject: payload.subject?.trim() || 'General',
    priority: payload.priority || 'P3',
    status: payload.status || resolveTaskStatusFromForm({ deadlineDate }),
    reminder: payload.reminder?.trim() || 'None',
    reminder_at: payload.reminderAt || null,
    reminder_repeat: payload.reminderRepeat || 'none',
    done: false,
    checklist: payload.checklist || [],
    related_notice: payload.relatedNotice || null,
    source_notice_id: payload.sourceNoticeId || '',
    created_at: nowIso(),
  }
  _state.tasks.unshift(row)
  persist()
  return { data: rowToTask(row), error: null }
}

export async function updateTask(taskId, payload) {
  await tick()
  const idx = _state.tasks.findIndex((t) => t.id === taskId)
  if (idx < 0) return { data: null, error: new Error('Task not found') }
  const row = _state.tasks[idx]
  if (payload.title !== undefined)       row.title = payload.title.trim()
  if (payload.description !== undefined) row.description = payload.description?.trim() ?? ''
  if (payload.deadline !== undefined)    row.deadline = payload.deadline?.trim() ?? 'Anytime'
  if (payload.subject !== undefined)     row.subject = payload.subject?.trim() ?? 'General'
  if (payload.priority !== undefined)    row.priority = payload.priority
  if (payload.status !== undefined)      row.status = payload.status
  if (payload.reminder !== undefined)    row.reminder = payload.reminder?.trim() ?? 'None'
  if (payload.reminderAt !== undefined)  row.reminder_at = payload.reminderAt || null
  if (payload.reminderRepeat !== undefined) row.reminder_repeat = payload.reminderRepeat || 'none'
  if (payload.done !== undefined)        row.done = !!payload.done
  if (payload.checklist !== undefined)   row.checklist = payload.checklist
  if (payload.done === true) row.completed_at = payload.completedAt || nowIso()
  if (payload.done === false) row.completed_at = null
  row.updated_at = nowIso()
  persist()
  return { data: rowToTask(row), error: null }
}

export async function archiveTask(taskId) {
  await tick()
  const idx = _state.tasks.findIndex((t) => t.id === taskId)
  if (idx < 0) return { data: null, error: new Error('Task not found') }
  _state.tasks[idx].status = 'archived'
  _state.tasks[idx].done = true
  _state.tasks[idx].updated_at = nowIso()
  persist()
  return { data: rowToTask(_state.tasks[idx]), error: null }
}

export async function unarchiveTask(taskId) {
  await tick()
  const idx = _state.tasks.findIndex((t) => t.id === taskId)
  if (idx < 0) return { data: null, error: new Error('Task not found') }
  const row = _state.tasks[idx]
  const deadlineDate = parseDueDateKey(row.deadline)
  row.done = false
  row.status = resolveTaskStatusFromForm({ deadlineDate })
  row.completed_at = null
  row.updated_at = nowIso()
  persist()
  return { data: rowToTask(row), error: null }
}

export async function deleteTask(taskId) {
  await tick()
  _state.tasks = _state.tasks.filter((t) => t.id !== taskId)
  persist()
  return { error: null }
}

export async function toggleTaskDone(taskId, currentDone) {
  await tick()
  const idx = _state.tasks.findIndex((t) => t.id === taskId)
  if (idx < 0) return { data: null, error: new Error('Task not found') }
  const newDone = !currentDone
  const now = nowIso()
  _state.tasks[idx].done = newDone
  const deadlineDate = parseDueDateKey(_state.tasks[idx].deadline)
  _state.tasks[idx].status = newDone
    ? 'completed'
    : resolveTaskStatusFromForm({ deadlineDate })
  _state.tasks[idx].completed_at = newDone ? now : null
  _state.tasks[idx].updated_at = now
  persist()
  return { data: rowToTask(_state.tasks[idx]), error: null }
}

export async function toggleChecklistItem(taskId, checklistId) {
  await tick()
  const idx = _state.tasks.findIndex((t) => t.id === taskId)
  if (idx < 0) return { data: null, error: new Error('Task not found') }
  const task = _state.tasks[idx]
  const checklist = normalizeChecklist(task.checklist).map((c) =>
    c.id === checklistId ? { ...c, done: !c.done } : c
  )
  const { done: nextDone } = resolveDoneAfterChecklistToggle(checklist, !!task.done)
  const now = nowIso()
  const deadlineDate = parseDueDateKey(task.deadline)
  task.checklist = checklist
  task.done = nextDone
  task.status = nextDone ? 'completed' : resolveTaskStatusFromForm({ deadlineDate })
  task.completed_at = nextDone ? task.completed_at || now : null
  task.updated_at = now
  persist()
  return { data: rowToTask(task), error: null }
}

// ═════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS (src/api/notifications.js surface)
// ═════════════════════════════════════════════════════════════════════
function getNoticeState(userId, notificationId) {
  return _state.notificationUserStates.find(
    (s) => s.user_id === userId && s.notification_id === notificationId
  )
}

function upsertNoticeState(userId, notificationId, patch) {
  let s = getNoticeState(userId, notificationId)
  if (!s) {
    s = { user_id: userId, notification_id: notificationId, hidden: false, read: false, important: false, in_planner: false }
    _state.notificationUserStates.push(s)
  }
  Object.assign(s, patch)
  persist()
  return s
}

export async function fetchNotifications(options = {}) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: [], error: new Error('Not signed in') }
  const rows = [..._state.notifications].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const list = rows.map((row) => {
    const state = getNoticeState(userId, row.id)
    return rowToNotification(row, state ?? null)
  })
  const filtered = options.hidden !== undefined
    ? list.filter((n) => n.hidden === options.hidden)
    : list
  return { data: filtered, error: null, userId }
}

export async function createNotification(payload) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: null, error: new Error('Not signed in') }
  const profile = _state.profiles.find((p) => p.id === userId)
  if (!isAdminMember(profile)) return { data: null, error: new Error('Admins only') }
  const row = {
    id: uid('ntf'),
    type: payload.type,
    title: payload.title,
    subject: payload.subject || '',
    deadline: payload.deadline || '',
    deadline_at: payload.deadlineAt || '',
    description: payload.description || '',
    attachment: payload.attachment || '',
    attachment_url: payload.attachmentUrl || '',
    checklist: payload.checklist || [],
    reminder: payload.reminder?.trim() || 'None',
    reminder_at: payload.reminderAt || null,
    reminder_repeat: payload.reminderRepeat || 'none',
    important: !!payload.important,
    by: payload.by || 'Admin',
    created_by: userId || '',
    created_at: nowIso(),
  }
  _state.notifications.unshift(row)
  persist()
  return { data: rowToNotification(row), error: null }
}

export async function markRead(notificationId) {
  await tick(20)
  const id = currentUserId(); if (!id) return { error: new Error('Not signed in') }
  upsertNoticeState(id, notificationId, { read: true })
  return { error: null }
}

export async function toggleImportant(notificationId, currentValue) {
  await tick(20)
  const id = currentUserId(); if (!id) return { error: new Error('Not signed in') }
  upsertNoticeState(id, notificationId, { important: !currentValue })
  return { error: null }
}

export async function toggleHidden(notificationId, currentValue) {
  await tick(20)
  const id = currentUserId(); if (!id) return { error: new Error('Not signed in'), userId: '' }
  upsertNoticeState(id, notificationId, { hidden: !currentValue })
  return { error: null, userId: id }
}

export async function setHidden(notificationId, hidden) {
  await tick(20)
  const id = currentUserId(); if (!id) return { error: new Error('Not signed in'), userId: '' }
  upsertNoticeState(id, notificationId, { hidden: !!hidden })
  return { error: null, userId: id }
}

export async function setInPlanner(notificationId, value) {
  await tick(20)
  const id = currentUserId(); if (!id) return { error: new Error('Not signed in') }
  upsertNoticeState(id, notificationId, { in_planner: value })
  return { error: null }
}

export async function patchNotificationState(notificationId, patch) {
  await tick(20)
  const id = currentUserId(); if (!id) return { error: new Error('Not signed in'), userId: '' }
  const apiPatch = {}
  if (patch.hidden !== undefined) apiPatch.hidden = !!patch.hidden
  if (patch.read !== undefined) apiPatch.read = !!patch.read
  if (patch.important !== undefined) apiPatch.important = !!patch.important
  if (patch.in_planner !== undefined) apiPatch.in_planner = !!patch.in_planner
  if (patch.inPlanner !== undefined) apiPatch.in_planner = !!patch.inPlanner
  upsertNoticeState(id, notificationId, apiPatch)
  return { error: null, userId: id }
}

export async function deleteNotification(notificationId) {
  await tick(20)
  const id = currentUserId()
  if (!id) return { error: new Error('Not signed in'), userId: '' }
  const row = _state.notifications.find((n) => n.id === notificationId)
  if (!row) return { error: new Error('Notice not found'), userId: id }

  const profile = _state.profiles.find((p) => p.id === id)
  const allowed = canEditNotice(
    { id: row.id, createdBy: row.created_by || '' },
    { userId: id, isAdminActive: isAdminMember(profile) && adminModeEnabled.value },
  )
  if (!allowed) return { error: new Error('Not allowed'), userId: id }

  _state.tasks = _state.tasks.filter((t) => t.source_notice_id !== notificationId)
  _state.notifications = _state.notifications.filter((n) => n.id !== notificationId)
  _state.notificationUserStates = _state.notificationUserStates.filter((s) => s.notification_id !== notificationId)
  persist()
  return { error: null, userId: id }
}

export async function updateNotification(notificationId, payload) {
  await tick(20)
  const id = currentUserId()
  if (!id) return { data: null, error: new Error('Not signed in') }
  const idx = _state.notifications.findIndex((n) => n.id === notificationId)
  if (idx < 0) return { data: null, error: new Error('Notice not found') }
  const row = _state.notifications[idx]
  const profile = _state.profiles.find((p) => p.id === id)
  const allowed = canEditNotice(
    { id: row.id, createdBy: row.created_by || '' },
    { userId: id, isAdminActive: isAdminMember(profile) && adminModeEnabled.value },
  )
  if (!allowed) return { data: null, error: new Error('Not allowed') }

  const next = { ...row }
  if (payload.type !== undefined) next.type = payload.type
  if (payload.title !== undefined) next.title = payload.title
  if (payload.subject !== undefined) next.subject = payload.subject
  if (payload.deadline !== undefined) next.deadline = payload.deadline
  if (payload.deadlineAt !== undefined) next.deadline_at = payload.deadlineAt
  if (payload.description !== undefined) next.description = payload.description
  if (payload.attachment !== undefined) next.attachment = payload.attachment
  if (payload.attachmentUrl !== undefined) next.attachment_url = payload.attachmentUrl
  if (payload.checklist !== undefined) next.checklist = payload.checklist
  if (payload.reminder !== undefined) next.reminder = payload.reminder?.trim() || 'None'
  if (payload.reminderAt !== undefined) next.reminder_at = payload.reminderAt || null
  if (payload.reminderRepeat !== undefined) next.reminder_repeat = payload.reminderRepeat || 'none'
  if (payload.important !== undefined) next.important = payload.important
  _state.notifications[idx] = next
  persist()
  const state = getNoticeState(id, notificationId)
  return { data: rowToNotification(next, state ?? null), error: null }
}

export async function deleteTasksBySourceNotice(noticeId) {
  await tick(10)
  const userId = currentUserId()
  if (!userId) return { error: new Error('Not signed in') }
  _state.tasks = _state.tasks.filter(
    (t) => !(t.user_id === userId && t.source_notice_id === noticeId),
  )
  persist()
  return { error: null }
}

// ═════════════════════════════════════════════════════════════════════
//  REMINDERS (src/api/reminders.js surface)
//  Mirrors the server-side pg_cron dispatcher: fan due reminders into a
//  per-user inbox, advancing/clearing the schedule cursor.
// ═════════════════════════════════════════════════════════════════════
function mockNextReminderAt(base, repeat) {
  if (!base) return null
  const stepDays = { daily: 1, weekly: 7 }
  const r = String(repeat || 'none').toLowerCase()
  if (r === 'none' || (!stepDays[r] && r !== 'monthly' && r !== 'yearly')) return null
  let next = new Date(base)
  const now = Date.now()
  let guard = 0
  while (next.getTime() <= now && guard < 1000) {
    if (r === 'monthly') next.setMonth(next.getMonth() + 1)
    else if (r === 'yearly') next.setFullYear(next.getFullYear() + 1)
    else next.setDate(next.getDate() + stepDays[r])
    guard += 1
  }
  return next.toISOString()
}

function dispatchDueRemindersMock() {
  if (!Array.isArray(_state.reminderEvents)) _state.reminderEvents = []
  const now = Date.now()
  let changed = false
  const pushEvent = (userId, sourceType, sourceId, title, body, dueAt) => {
    const exists = _state.reminderEvents.some(
      (e) => e.user_id === userId && e.source_type === sourceType
        && e.source_id === String(sourceId) && e.due_at === dueAt,
    )
    if (exists) return
    _state.reminderEvents.unshift({
      id: uid('rmd'), user_id: userId, source_type: sourceType,
      source_id: String(sourceId), title: title || '', body: body || '',
      due_at: dueAt, seen_at: null, created_at: nowIso(),
    })
    changed = true
  }

  for (const t of _state.tasks) {
    if (!t.reminder_at || t.done) continue
    if (new Date(t.reminder_at).getTime() > now) continue
    pushEvent(t.user_id, 'task', t.id, t.title || 'Task', 'Task reminder', t.reminder_at)
    t.reminder_at = mockNextReminderAt(t.reminder_at, t.reminder_repeat)
    changed = true
  }

  const memberIds = _state.profiles.map((p) => p.id)
  for (const n of _state.notifications) {
    if (!n.reminder_at) continue
    if (new Date(n.reminder_at).getTime() > now) continue
    for (const uidValue of memberIds) {
      pushEvent(uidValue, 'notice', n.id, n.title || 'Notice', 'Notice reminder', n.reminder_at)
    }
    n.reminder_at = mockNextReminderAt(n.reminder_at, n.reminder_repeat)
    changed = true
  }

  if (changed) persist()
}

export async function fetchDueReminders() {
  await tick(20)
  const userId = currentUserId()
  if (!userId) return { data: [], error: null }
  dispatchDueRemindersMock()
  const data = (_state.reminderEvents || [])
    .filter((e) => e.user_id === userId && !e.seen_at)
    .sort((a, b) => (a.due_at < b.due_at ? -1 : 1))
  return { data, error: null }
}

export async function markRemindersSeen(ids) {
  await tick(20)
  const set = new Set(ids || [])
  if (!set.size) return { error: null }
  const seenAt = nowIso()
  for (const e of _state.reminderEvents || []) {
    if (set.has(e.id)) e.seen_at = seenAt
  }
  persist()
  return { error: null }
}

// ═════════════════════════════════════════════════════════════════════
//  COMMUNITY (src/api/community.js surface)
// ═════════════════════════════════════════════════════════════════════
export async function fetchCommunities() {
  await tick()
  const data = [..._state.communities]
    .sort((a, b) => {
      const pa = a.is_pinned ? 1 : 0
      const pb = b.is_pinned ? 1 : 0
      if (pa !== pb) return pb - pa
      if (pa && pb) return (b.pinned_at || '').localeCompare(a.pinned_at || '')
      return a.name.localeCompare(b.name)
    })
    .map(rowToCommunity)
  return { data, error: null }
}

export async function createCommunity(payload) {
  await tick()
  const userId = currentUserId()
  const row = {
    id: uid('cmt'),
    icon: payload.icon || '◉',
    name: payload.name,
    desc: payload.desc || '',
    created_by: userId || '',
    is_pinned: false,
    pinned_at: '',
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  _state.communities.unshift(row)
  persist()
  return { data: rowToCommunity(row), error: null }
}

export async function updateCommunity(id, payload) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: null, error: new Error('Not signed in') }
  const profile = findProfile(userId)
  if (!isAdminMember(profile)) return { data: null, error: new Error('Admins only') }
  const idx = _state.communities.findIndex((c) => c.id === id)
  if (idx < 0) return { data: null, error: new Error('Space not found') }
  const row = _state.communities[idx]
  if (payload.name !== undefined) row.name = String(payload.name).trim()
  if (payload.desc !== undefined) row.desc = String(payload.desc).trim()
  if (payload.icon !== undefined) row.icon = String(payload.icon).trim() || row.icon
  if (payload.pinned !== undefined) {
    row.is_pinned = !!payload.pinned
    row.pinned_at = payload.pinned ? nowIso() : ''
  }
  row.updated_at = nowIso()
  persist()
  return { data: rowToCommunity(row), error: null }
}

export async function fetchPosts(options = {}) {
  await tick()
  const userId = currentUserId()
  const likedSet = new Set(
    _state.postLikes.filter((l) => l.user_id === userId).map((l) => l.post_id)
  )
  const lookup = {
    communityById: new Map(_state.communities.map((c) => [c.id, c])),
    profileById: new Map(_state.profiles.map((p) => [p.id, p])),
  }
  let rows = [..._state.posts]
  if (options.communityId) rows = rows.filter((r) => r.community_id === options.communityId)
  if (options.postType) rows = rows.filter((r) => (r.post_type || 'regular') === options.postType)
  if (options.sort === 'hot') {
    rows.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
  } else if (options.sort === 'top') {
    rows.sort((a, b) => (b.comments_count || 0) - (a.comments_count || 0))
  } else {
    rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }
  return { data: rows.map((r) => rowToPost(r, likedSet, lookup)), error: null }
}

export async function createPost(payload) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: null, error: new Error('Not signed in') }
  const row = {
    id: uid('pst'),
    community_id: payload.communityId,
    user_id: userId,
    title: payload.title,
    content: payload.content || '',
    anonymous: !!payload.anonymous,
    image: payload.image || '',
    attachment: payload.attachment || '',
    attachment_url: payload.attachmentUrl || '',
    file_key: payload.fileKey || '',
    post_type: payload.postType || 'regular',
    file_size: payload.fileSize || 0,
    likes_count: 0,
    comments_count: 0,
    created_at: nowIso(),
  }
  _state.posts.unshift(row)
  persist()
  return { data: rowToPost(row), error: null }
}

export async function deletePost(postId) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { error: new Error('Not signed in') }
  const idx = _state.posts.findIndex((p) => p.id === postId)
  if (idx < 0) return { error: new Error('Post not found') }
  const post = _state.posts[idx]
  const profile = findProfile(userId)
  if (!canDeletePost(
    { id: post.id, authorId: post.user_id },
    { userId, isAdminActive: isAdminMember(profile) && adminModeEnabled.value }
  )) {
    return { error: new Error('Not allowed') }
  }
  _state.posts.splice(idx, 1)
  _state.comments = _state.comments.filter((c) => c.post_id !== postId)
  _state.postLikes = _state.postLikes.filter((l) => l.post_id !== postId)
  persist()
  return { error: null }
}

export async function togglePostLike(postId, currentLiked, currentCount) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { error: new Error('Not signed in') }
  const post = _state.posts.find((p) => p.id === postId)
  if (!post) return { error: new Error('Post not found') }

  if (currentLiked) {
    _state.postLikes = _state.postLikes.filter((l) => !(l.user_id === userId && l.post_id === postId))
    post.likes_count = Math.max(0, (post.likes_count || 0) - 1)
  } else {
    if (!_state.postLikes.some((l) => l.user_id === userId && l.post_id === postId)) {
      _state.postLikes.push({ user_id: userId, post_id: postId })
    }
    post.likes_count = (post.likes_count || 0) + 1
  }
  persist()
  return { liked: !currentLiked, likesCount: post.likes_count, error: null }
}

export async function fetchComments(postId) {
  await tick()
  const rows = _state.comments
    .filter((c) => c.post_id === postId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return { data: rows.map(rowToComment), error: null }
}

export async function addComment(postId, text, anonymous = false) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: null, error: new Error('Not signed in') }
  const row = {
    id: uid('cmm'), post_id: postId, user_id: userId,
    text: text.trim(), anonymous: !!anonymous, created_at: nowIso(),
  }
  _state.comments.unshift(row)
  const post = _state.posts.find((p) => p.id === postId)
  if (post) post.comments_count = (post.comments_count || 0) + 1
  persist()
  return { data: rowToComment(row), error: null }
}

// ═════════════════════════════════════════════════════════════════════
//  STUDY (src/api/study.js surface)
// ═════════════════════════════════════════════════════════════════════
export async function fetchSubjects() {
  await tick()
  const filesCountBySubject = new Map()
  for (const r of _state.resources) {
    const sid = r.subject_id
    filesCountBySubject.set(sid, (filesCountBySubject.get(sid) || 0) + 1)
  }
  const data = [..._state.subjects]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({
      id: s.id, icon: s.icon || '', name: s.name,
      filesCount: filesCountBySubject.get(s.id) || 0,
      updatedAt: s.updated_at,
    }))
  return { data, error: null }
}

export async function createSubject(payload) {
  await tick()
  const row = {
    id: uid('sub'),
    icon: payload.icon || '📘',
    name: payload.name,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  _state.subjects.push(row)
  persist()
  return {
    data: {
      id: row.id,
      icon: row.icon,
      name: row.name,
      filesCount: 0,
      updatedAt: row.updated_at,
    },
    error: null,
  }
}

export async function fetchResources(options = {}) {
  await tick()
  const userId = currentUserId()
  const likedSet = new Set(
    _state.resourceLikes.filter((l) => l.user_id === userId).map((l) => l.resource_id)
  )
  const lookup = {
    subjectById: new Map(_state.subjects.map((s) => [s.id, s])),
    profileById: new Map(_state.profiles.map((p) => [p.id, p])),
  }
  let rows = [..._state.resources]
  if (options.subjectId) rows = rows.filter((r) => r.subject_id === options.subjectId)
  if (options.sort === 'downloads') {
    rows.sort((a, b) => (b.downloads_count || 0) - (a.downloads_count || 0))
  } else if (options.sort === 'likes') {
    rows.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
  } else {
    rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }
  return { data: rows.map((r) => rowToResource(r, likedSet, lookup)), error: null }
}

export async function createResource(payload) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: null, error: new Error('Not signed in') }
  const row = {
    id: uid('res'),
    subject_id: payload.subjectId,
    user_id: userId,
    type: payload.type || 'PDF',
    title: payload.title,
    file_key: payload.fileKey || '',
    file_url: payload.fileUrl || '',
    file_size: payload.fileSize || 0,
    downloads_count: 0,
    likes_count: 0,
    created_at: nowIso(),
  }
  _state.resources.unshift(row)
  persist()
  return { data: rowToResource(row), error: null }
}

export async function toggleResourceLike(resourceId, currentLiked, currentCount) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { error: new Error('Not signed in') }
  const res = _state.resources.find((r) => r.id === resourceId)
  if (!res) return { error: new Error('Resource not found') }
  if (currentLiked) {
    _state.resourceLikes = _state.resourceLikes.filter((l) => !(l.user_id === userId && l.resource_id === resourceId))
    res.likes_count = Math.max(0, (res.likes_count || 0) - 1)
  } else {
    if (!_state.resourceLikes.some((l) => l.user_id === userId && l.resource_id === resourceId)) {
      _state.resourceLikes.push({ user_id: userId, resource_id: resourceId })
    }
    res.likes_count = (res.likes_count || 0) + 1
  }
  persist()
  return { liked: !currentLiked, likesCount: res.likes_count, error: null }
}

export async function downloadResource(resourceId) {
  await tick()
  const res = _state.resources.find((r) => r.id === resourceId)
  if (!res) return { downloadUrl: '', error: new Error('Resource not found') }
  res.downloads_count = (res.downloads_count || 0) + 1
  persist()
  return { downloadUrl: res.file_url || '', error: null }
}

// ═════════════════════════════════════════════════════════════════════
//  FOCUS SOUNDS (shared white noise library)
// ═════════════════════════════════════════════════════════════════════
export async function fetchFocusSounds() {
  await tick(20)
  return { data: [...(_state.focusSounds || [])], error: null }
}

export async function addFocusSound(record) {
  await tick(20)
  const { error: denied } = await requireAdminCaller()
  if (denied) return { data: null, error: denied }
  if (!Array.isArray(_state.focusSounds)) _state.focusSounds = []
  const item = {
    id: record.id || `fsnd_${Date.now().toString(36)}`,
    name: record.name,
    icon: record.icon || 'water',
    color: record.color || '',
    audioUrl: record.audioUrl,
    fileKey: record.fileKey || '',
    durationSeconds: record.durationSeconds || 0,
    source: 'shared',
    createdAt: record.createdAt || new Date().toISOString(),
  }
  _state.focusSounds.unshift(item)
  persist()
  return { data: item, error: null }
}

export async function removeFocusSound(id) {
  await tick(20)
  const { error: denied } = await requireAdminCaller()
  if (denied) return { error: denied }
  _state.focusSounds = (_state.focusSounds || []).filter((s) => s.id !== id)
  persist()
  return { error: null }
}

// ═════════════════════════════════════════════════════════════════════
//  FOCUS SESSIONS
// ═════════════════════════════════════════════════════════════════════
function focusSessionRowToClient(row) {
  return {
    id: row.id,
    clientId: row.client_id || '',
    minutes: row.minutes,
    subject: row.subject || 'Focus',
    soundId: row.sound_id || 'silence',
    endedAt: row.ended_at,
    synced: true,
  }
}

function focusSessionsForUser(userId) {
  return (_state.focusSessions || [])
    .filter((s) => s.user_id === userId)
    .sort((a, b) => new Date(b.ended_at).getTime() - new Date(a.ended_at).getTime())
    .slice(0, 200)
    .map(focusSessionRowToClient)
}

export async function fetchFocusPrefsForUser(userId) {
  await tick(10)
  if (!userId) return { data: null, error: new Error('User required') }
  const profile = findProfile(userId)
  return { data: profile?.focus_prefs || null, error: null }
}

export async function fetchFocusSessionsForUser(userId) {
  await tick(20)
  if (!userId) return { data: [], error: new Error('User required') }
  const profile = findProfile(userId)
  const prefs = profile?.focus_prefs || {}
  const viewerId = currentUserId()
  if (prefs.visibility === 'private' && viewerId !== userId) {
    return { data: [], error: null }
  }
  return { data: focusSessionsForUser(userId), error: null }
}

export async function fetchFocusSessions() {
  await tick(20)
  const userId = currentUserId()
  if (!userId) return { data: [], error: new Error('Not signed in') }
  return { data: focusSessionsForUser(userId), error: null }
}

export async function createFocusSession(payload) {
  await tick(20)
  const userId = currentUserId()
  if (!userId) return { data: null, error: new Error('Not signed in') }
  if (!Array.isArray(_state.focusSessions)) _state.focusSessions = []

  if (payload.clientId) {
    const existing = _state.focusSessions.find(
      (s) => s.user_id === userId && s.client_id === payload.clientId
    )
    if (existing) return { data: focusSessionRowToClient(existing), error: null }
  }

  const row = {
    id: uid('fs'),
    user_id: userId,
    client_id: payload.clientId || null,
    minutes: Math.round(payload.minutes),
    subject: payload.subject || 'Focus',
    sound_id: payload.soundId || 'silence',
    ended_at: payload.endedAt || nowIso(),
    created_at: nowIso(),
  }
  _state.focusSessions.unshift(row)
  persist()
  return { data: focusSessionRowToClient(row), error: null }
}

export async function fetchFocusPrefs() {
  await tick(10)
  const userId = currentUserId()
  if (!userId) return { data: null, error: new Error('Not signed in') }
  const profile = findProfile(userId)
  return { data: profile?.focus_prefs || null, error: null }
}

export async function saveFocusPrefs(prefs) {
  await tick(10)
  const userId = currentUserId()
  if (!userId) return { data: null, error: new Error('Not signed in') }
  const profile = findProfile(userId)
  if (!profile) return { data: null, error: new Error('Profile not found') }
  profile.focus_prefs = prefs
  persist()
  return { data: prefs, error: null }
}

// ═════════════════════════════════════════════════════════════════════
//  FEEDBACK (src/api/feedback.js surface)
// ═════════════════════════════════════════════════════════════════════
function rowToFeedbackThread(row) {
  const profile = findProfile(row.user_id)
  const preview = [...(_state.feedback_messages || [])]
    .filter((m) => m.thread_id === row.id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]
  return {
    id: row.id,
    userId: row.user_id,
    userName: profile?.display_name || profile?.name || 'Unknown',
    status: row.status || 'open',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    resolvedAt: row.resolved_at || null,
    resolvedBy: row.resolved_by || null,
    preview: preview?.body || '',
    previewAt: preview?.created_at || row.created_at,
  }
}

function rowToFeedbackMessage(row) {
  const profile = findProfile(row.sender_id)
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    senderName: profile?.display_name || profile?.name || 'Unknown',
    body: row.body,
    createdAt: row.created_at,
  }
}

export async function fetchFeedbackThreads() {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: [], error: new Error('Not signed in') }
  const profile = findProfile(userId)
  const maintainer = isTestMaintainer(profile)
  const rows = [...(_state.feedback_threads || [])]
    .filter((t) => maintainer || t.user_id === userId)
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
  return { data: rows.map(rowToFeedbackThread), error: null }
}

export async function fetchFeedbackMessages(threadId) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: [], error: new Error('Not signed in') }
  const profile = findProfile(userId)
  const thread = (_state.feedback_threads || []).find((t) => t.id === threadId)
  if (!thread) return { data: [], error: new Error('Thread not found') }
  if (thread.user_id !== userId && !isTestMaintainer(profile)) {
    return { data: [], error: new Error('Not allowed') }
  }
  const rows = (_state.feedback_messages || [])
    .filter((m) => m.thread_id === threadId)
    .sort((a, b) => (a.created_at > b.created_at ? 1 : -1))
  return { data: rows.map(rowToFeedbackMessage), error: null }
}

export async function createFeedbackThread(body) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: null, error: new Error('Not signed in') }
  const text = String(body || '').trim()
  if (!text) return { data: null, error: new Error('Message required') }
  const now = nowIso()
  const thread = {
    id: uid('fdb'),
    user_id: userId,
    status: 'open',
    created_at: now,
    updated_at: now,
    resolved_at: null,
    resolved_by: null,
  }
  const message = {
    id: uid('fdm'),
    thread_id: thread.id,
    sender_id: userId,
    body: text,
    created_at: now,
  }
  _state.feedback_threads.unshift(thread)
  _state.feedback_messages.push(message)
  persist()
  return { data: rowToFeedbackThread(thread), error: null }
}

export async function addFeedbackMessage(threadId, body) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: null, error: new Error('Not signed in') }
  const text = String(body || '').trim()
  if (!text) return { data: null, error: new Error('Message required') }
  const profile = findProfile(userId)
  const thread = (_state.feedback_threads || []).find((t) => t.id === threadId)
  if (!thread) return { data: null, error: new Error('Thread not found') }
  if (thread.user_id !== userId && !isTestMaintainer(profile)) {
    return { data: null, error: new Error('Not allowed') }
  }
  const now = nowIso()
  const row = {
    id: uid('fdm'),
    thread_id: threadId,
    sender_id: userId,
    body: text,
    created_at: now,
  }
  _state.feedback_messages.push(row)
  thread.updated_at = now
  persist()
  return { data: rowToFeedbackMessage(row), error: null }
}

export async function resolveFeedbackThread(threadId) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { data: null, error: new Error('Not signed in') }
  const profile = findProfile(userId)
  if (!isTestMaintainer(profile)) return { data: null, error: new Error('Maintainers only') }
  const thread = (_state.feedback_threads || []).find((t) => t.id === threadId)
  if (!thread) return { data: null, error: new Error('Thread not found') }
  const now = nowIso()
  thread.status = 'resolved'
  thread.resolved_at = now
  thread.resolved_by = userId
  thread.updated_at = now
  persist()
  return { data: rowToFeedbackThread(thread), error: null }
}

export async function deleteFeedbackThread(threadId) {
  await tick()
  const userId = currentUserId()
  if (!userId) return { error: new Error('Not signed in') }
  const profile = findProfile(userId)
  const thread = (_state.feedback_threads || []).find((t) => t.id === threadId)
  if (!thread) return { error: new Error('Thread not found') }
  if (thread.user_id !== userId && !isTestMaintainer(profile)) {
    return { error: new Error('Not allowed') }
  }
  _state.feedback_threads = (_state.feedback_threads || []).filter((t) => t.id !== threadId)
  _state.feedback_messages = (_state.feedback_messages || []).filter((m) => m.thread_id !== threadId)
  persist()
  return { error: null }
}

// ═════════════════════════════════════════════════════════════════════
//  UPLOAD (src/api/upload.js surface) — stubbed
// ═════════════════════════════════════════════════════════════════════
export async function uploadFile(file, type = 'resource') {
  await tick()
  const fileName = file?.name || `${type}-${Date.now()}`
  return {
    fileKey: `${type}/mock/${fileName}`,
    fileName,
    fileUrl: `mock://files/${type}/${encodeURIComponent(fileName)}`,
    fileSize: file?.size || 0,
    mimeType: file?.type || 'application/octet-stream',
    error: null,
  }
}

export async function uploadAvatar(file, userId) {
  const result = await uploadFile(file, 'avatar')
  if (result.error) return result
  await updateProfile(userId, { avatarUrl: result.fileUrl })
  return { ...result, error: null }
}
