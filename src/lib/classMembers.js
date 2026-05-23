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
  { username: 'glenn_tan_then_jing', display_name: 'Glenn Tan Theng Jing', role: 'student', is_admin: false },
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
]

export const DEFAULT_MEMBER_PASSWORD = '123456'
export const ROSTER_VERSION = '26s201_roster_v1'

export function slugifyUsername(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
}

export function memberEmail(username, role) {
  const domain = role === 'student' ? '@students.edu.sg' : '@class.com'
  return `${username}${domain}`
}

export function isAdminMember(profileOrRole) {
  if (!profileOrRole) return false
  if (typeof profileOrRole === 'object') {
    return !!(profileOrRole.is_admin || profileOrRole.role === 'admin' || profileOrRole.role === 'teacher_admin')
  }
  return profileOrRole === 'admin' || profileOrRole === 'teacher_admin'
}

/**
 * @param {ClassMemberDef} member
 * @param {string} id
 */
export function createMemberRecords(member, id) {
  const email = memberEmail(member.username, member.role)
  return {
    auth: {
      id,
      username: member.username,
      email,
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
