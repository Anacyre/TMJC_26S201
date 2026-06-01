/** @typedef {{ username: string, display_name: string, role: 'student'|'admin'|'teacher_admin', is_admin: boolean, birthday?: string }} ClassMemberDef */

/** @type {ClassMemberDef[]} */
export const CLASS_MEMBERS = [
  // Students
  { username: 'gottumukkala_sri_haswitha', display_name: 'Gottumukkala Sri Haswitha', role: 'student', is_admin: false },
  { username: 'ling_jing_teng_jayden', display_name: 'Ling Jing Teng Jayden', role: 'student', is_admin: false },
  { username: 'wong_chu_lin_chloe', display_name: 'Wong Chu Lin Chloe', role: 'student', is_admin: false },
  { username: 'xiong_chenyu', display_name: 'Xiong Chenyu', role: 'student', is_admin: false },
  { username: 'lim_hong_en_josh', display_name: 'Lim Hong En Josh', role: 'student', is_admin: false },
  { username: 'yu_yanting', display_name: 'Yu Yanting', role: 'student', is_admin: false },
  { username: 'lim_hao_han', display_name: 'Lim Hao Han', role: 'student', is_admin: false },
  { username: 'ethan_sua_zhi_wei', display_name: 'Ethan Sua Zhi Wei', role: 'student', is_admin: false },
  { username: 'chin_jian_ming', display_name: 'Chin Jian Ming', role: 'student', is_admin: false },
  { username: 'vicencio_miguel_arsenio_maylad', display_name: 'Vicencio Miguel Arsenio Maylad', role: 'student', is_admin: false },
  { username: 'sim_song_ze', display_name: 'Sim Song Ze', role: 'student', is_admin: false },
  { username: 'tan_sow_xuan', display_name: 'Tan Sow Xuan', role: 'student', is_admin: false },
  { username: 'chia_wen_hao', display_name: 'Chia Wen Hao', role: 'student', is_admin: false },
  { username: 'glenn_tan_theng_jing', display_name: 'Glenn Tan Theng Jing', role: 'student', is_admin: false },
  { username: 'suasin_jorge_axel_v', display_name: 'Suasin Jorge Axel V', role: 'student', is_admin: false },
  { username: 'grandhi_purna_shivani', display_name: 'Grandhi Purna Shivani', role: 'student', is_admin: false },
  { username: 'daniyal_amril_yusran', display_name: 'Daniyal Amril Yusran', role: 'student', is_admin: false },
  { username: 'elgin_wu_junfeng', display_name: 'Elgin Wu Junfeng', role: 'student', is_admin: false },
  { username: 'lee_kee_kai_boris', display_name: 'Lee Kee Kai Boris', role: 'student', is_admin: false },
  { username: 'chinwala_tasheen_afzal', display_name: 'Chinwala Tasheen Afzal', role: 'student', is_admin: false },
  { username: 'ian_jaan_khambali', display_name: 'Ian Jaan Khambali', role: 'student', is_admin: false },
  { username: 'nikitadharitri_rajesh_kanchi', display_name: 'Nikitadharitri Rajesh Kanchi', role: 'student', is_admin: false },
  { username: 'liwantong_canace', display_name: 'LiWantong Canace', role: 'student', is_admin: false },
  { username: 'lee_koh_yim_ethan', display_name: 'Lee Koh Yim Ethan', role: 'student', is_admin: false },
  { username: 'sim_jeng_how_jaydon', display_name: 'Sim Jeng How Jaydon', role: 'student', is_admin: false },
  { username: 'vance_cheng_you_jian', display_name: 'Vance Cheng You Jian', role: 'student', is_admin: false },
  // Special admin
  { username: 'oh_rui_en_belle', display_name: 'Oh Rui En Belle', role: 'admin', is_admin: true },
  // Teachers (admin)
  { username: 'guobin_eugene_choon', display_name: 'Guobin Eugene Choon', role: 'teacher_admin', is_admin: true },
  { username: 'chua_wei_ming', display_name: 'Chua Wei Ming', role: 'teacher_admin', is_admin: true },
  { username: 'chu_jing_cheryl_wong', display_name: 'Chu Jing Cheryl Wong', role: 'teacher_admin', is_admin: true },
  { username: 'mao_yu_yan', display_name: 'Mao Yu Yan', role: 'teacher_admin', is_admin: true },
  { username: 'michelle_lee', display_name: 'Michelle Lee', role: 'teacher_admin', is_admin: true },
  { username: 'chen_zhiling', display_name: 'Chen Zhiling', role: 'teacher_admin', is_admin: true },
]

export const DEFAULT_MEMBER_PASSWORD = '123456'
export const ROSTER_VERSION = '26s201_roster_v2'

export function slugifyUsername(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
}

export function isTeacherMember(profileOrRole) {
  if (!profileOrRole) return false
  if (typeof profileOrRole === 'object') return profileOrRole.role === 'teacher_admin'
  return profileOrRole === 'teacher_admin'
}

export function memberEmail(username, role = 'student') {
  if (role === 'teacher_admin') return ''
  return `${username}@students.edu.sg`
}

/** Auth-only login email; not shown in member list for teachers. */
export function authLoginEmail(username, role = 'student') {
  if (role === 'teacher_admin') return `${username}@class.com`
  return `${username}@students.edu.sg`
}

export function findClassMember(username) {
  const key = slugifyUsername(username)
  if (!key) return null
  return CLASS_MEMBERS.find((m) => m.username === key) || null
}

/** Admin check: roster wins for class members; ignores stale is_admin on students. */
export function isAdminMember(profileOrRole) {
  if (!profileOrRole) return false
  if (typeof profileOrRole === 'object') {
    const username =
      profileOrRole.username ||
      slugifyUsername(profileOrRole.display_name || profileOrRole.name)
    const member = findClassMember(username)
    if (member) {
      if (member.is_admin) return true
      if (member.role === 'student') return profileOrRole.role === 'admin'
      return false
    }
    return !!(
      profileOrRole.is_admin ||
      profileOrRole.role === 'admin' ||
      profileOrRole.role === 'teacher_admin'
    )
  }
  return profileOrRole === 'admin' || profileOrRole === 'teacher_admin'
}

/**
 * @param {ClassMemberDef} member
 * @param {string} id
 */
export function createMemberRecords(member, id) {
  const loginEmail = authLoginEmail(member.username, member.role)
  const profileEmail = memberEmail(member.username, member.role)
  return {
    auth: {
      id,
      username: member.username,
      email: loginEmail,
      display_name: member.display_name,
      password: DEFAULT_MEMBER_PASSWORD,
      must_change_password: true,
    },
    profile: {
      id,
      username: member.username,
      display_name: member.display_name,
      name: member.display_name,
      birthday: member.birthday || '',
      role: member.role,
      is_admin: member.is_admin,
      email: profileEmail,
      mbti: '',
      interests: '',
      bio: '',
      links: [],
      birthday_visibility: 'Friends',
      avatar_url: '',
    },
  }
}

export function buildRosterRecords(idFactory) {
  return CLASS_MEMBERS.map((member) => createMemberRecords(member, idFactory()))
}

const rosterUsernameSet = () => new Set(CLASS_MEMBERS.map((m) => m.username))

/**
 * Member list for UI: canonical CLASS_MEMBERS merged with stored/remote profiles.
 * Non-roster accounts (preview admin, manually added) are appended.
 */
export function mergeProfilesWithClassRoster(dbProfiles = []) {
  const rosterNames = rosterUsernameSet()
  const byUsername = new Map()
  for (const p of dbProfiles) {
    const key = p.username || slugifyUsername(p.display_name || p.name)
    if (key) byUsername.set(key, p)
  }

  const out = []

  for (const member of CLASS_MEMBERS) {
    const row = byUsername.get(member.username)
    const base = row
      ? { ...row }
      : {
          id: `roster_${member.username}`,
          username: member.username,
          mbti: '',
          interests: '',
          bio: '',
          links: [],
          birthday: member.birthday || '',
          avatar_url: '',
        }

    out.push({
      ...base,
      id: base.id,
      username: member.username,
      display_name: member.display_name,
      name: member.display_name,
      role: member.role,
      is_admin: member.is_admin,
      email:
        member.role === 'teacher_admin'
          ? ''
          : base.email || memberEmail(member.username, member.role),
      birthday: base.birthday ?? member.birthday ?? '',
      mbti: base.mbti ?? '',
      interests: base.interests ?? '',
      bio: base.bio ?? '',
      links: base.links ?? [],
      avatar_url: base.avatar_url ?? '',
    })
  }

  for (const p of dbProfiles) {
    const key = p.username || slugifyUsername(p.display_name || p.name)
    if (!key || rosterNames.has(key)) continue
    out.push({
      ...p,
      id: p.id,
      username: key,
      display_name: p.display_name || p.name || '',
      name: p.display_name || p.name || '',
      role: p.role || 'student',
      is_admin: !!p.is_admin,
      email: p.email || '',
      birthday: p.birthday || '',
      mbti: p.mbti || '',
      interests: p.interests || '',
      bio: p.bio || '',
      links: p.links || [],
      avatar_url: p.avatar_url || '',
    })
  }

  out.sort((a, b) =>
    String(a.display_name || a.name).localeCompare(String(b.display_name || b.name))
  )
  return out
}
