<template>
  <view class="page" :class="themeClass">
    <view class="bg" />

    <view class="safe">
      <view class="shellBar">
        <view class="brand" @longpress="onLogoLongPress">
          <ClassLogo size="lg" />
          <text class="brandLabel">26S201</text>
        </view>
        <ThemeToggle size="lg" />
      </view>

      <view class="card">
        <view class="cardHeader">
          <text class="cardTitle">{{ mode === 'login' ? 'Welcome back' : 'Create account' }}</text>
          <text class="cardSub">
            {{ mode === 'login' ? 'Sign in to keep your day organized.' : 'Create an account to get started.' }}
          </text>
        </view>

        <view v-if="isPreview" class="noticeBanner tap" role="button" @tap="useDemoAccount">
          <view class="noticeDot" />
          <view class="noticeText">
            <text class="noticeTitle">Preview mode</text>
            <text class="noticeSub">Tap to use demo account test@class.com</text>
          </view>
        </view>

        <view v-else-if="mode === 'login' && showFirstPasswordNotice" class="noticeBanner">
          <view class="noticeDot" />
          <view class="noticeText">
            <text class="noticeTitle">Class login</text>
            <text class="noticeSub">Use your username · first-time password is {{ defaultPassword }}</text>
          </view>
        </view>

        <view class="form">
          <view class="field">
            <text class="label">{{ mode === 'login' ? 'Account' : 'Email' }}</text>
            <view class="fieldRow" :class="{ focus: focusKey === 'account' }">
              <view class="fieldGlyph userGlyph" />
              <input
                class="fieldInput"
                :placeholder="mode === 'login' ? 'Username or email' : 'name@students.edu.sg'"
                placeholder-class="placeholder"
                v-model="account"
                @focus="focusKey = 'account'"
                @blur="focusKey = ''"
                autocomplete="username"
              />
            </view>
          </view>

          <view v-if="mode === 'register'" class="field">
            <text class="label">Display name</text>
            <view class="fieldRow" :class="{ focus: focusKey === 'name' }">
              <view class="fieldGlyph nameGlyph" />
              <input
                class="fieldInput"
                placeholder="Your name"
                placeholder-class="placeholder"
                v-model="displayName"
                @focus="focusKey = 'name'"
                @blur="focusKey = ''"
              />
            </view>
          </view>

          <view class="field">
            <text class="label">Password</text>
            <view class="fieldRow" :class="{ focus: focusKey === 'password' }">
              <view class="fieldGlyph lockGlyph" />
              <input
                class="fieldInput"
                password
                placeholder="Enter password"
                placeholder-class="placeholder"
                v-model="password"
                @focus="focusKey = 'password'"
                @blur="focusKey = ''"
                autocomplete="current-password"
              />
            </view>
          </view>

          <view v-if="mode === 'register'" class="field">
            <text class="label">Confirm password</text>
            <view class="fieldRow" :class="{ focus: focusKey === 'password2' }">
              <view class="fieldGlyph lockGlyph repeat" />
              <input
                class="fieldInput"
                password
                placeholder="Repeat password"
                placeholder-class="placeholder"
                v-model="password2"
                @focus="focusKey = 'password2'"
                @blur="focusKey = ''"
                autocomplete="new-password"
              />
            </view>
          </view>

          <view class="actionRow">
            <view v-if="mode === 'login'" class="remember tap" role="button" @tap="rememberMe = !rememberMe">
              <view class="switch" :class="{ on: rememberMe }">
                <view class="switchKnob" />
              </view>
              <text class="rememberText">Remember me</text>
            </view>
            <view v-else class="rememberSpacer" />

            <text v-if="mode === 'login'" class="link tap" @tap="onForgot">Forgot password?</text>
          </view>

          <view class="primary tap" :class="{ loading: loading }" role="button" @tap="onPrimary">
            <text class="primaryText">{{ mode === 'login' ? 'Login' : 'Create account' }}</text>
          </view>

          <view v-if="mode === 'register'" class="backRow">
            <text class="link tap" @tap="setMode('login')">Back to login</text>
          </view>
        </view>
      </view>
    </view>
    <GlobalSearchOverlay />

    <view v-if="pwdChangeOpen" class="overlay show">
      <view class="pwdSheet" @tap.stop>
        <view class="pwdHead">
          <view class="fieldGlyph lockGlyph lg" />
          <text class="pwdTitle">New password</text>
        </view>
        <view v-if="pwdStatus" class="pwdStatus" :class="pwdStatusKind">
          <text class="pwdStatusText">{{ pwdStatus }}</text>
        </view>
        <view class="fieldRow" :class="{ focus: focusKey === 'newpwd' }">
          <view class="fieldGlyph lockGlyph" />
          <input
            class="fieldInput"
            password
            v-model="newPassword"
            placeholder="min 6 chars"
            placeholder-class="placeholder"
            @focus="focusKey = 'newpwd'"
            @blur="focusKey = ''"
          />
        </view>
        <view class="fieldRow" :class="{ focus: focusKey === 'newpwd2' }">
          <view class="fieldGlyph lockGlyph repeat" />
          <input
            class="fieldInput"
            password
            v-model="newPassword2"
            placeholder="confirm"
            placeholder-class="placeholder"
            @focus="focusKey = 'newpwd2'"
            @blur="focusKey = ''"
          />
        </view>
        <view class="primary tap" :class="{ loading: pwdSaving, done: pwdDone }" role="button" @tap="submitPasswordChange">
          <view v-if="pwdDone" class="actionGlyph checkGlyph" />
          <view v-else class="actionGlyph arrowGlyph" />
        </view>
        <view class="pwdSignOut tap" role="button" aria-label="Sign out" @tap="signOutFromPasswordChange">
          <view class="actionGlyph outGlyph" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import ClassLogo from '@/components/ClassLogo.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useTheme } from '@/composables/useTheme'
import { login, register, forgotPassword, changePassword, logout, getCurrentUser, userMustChangePassword, resolveAccountToEmailAsync } from '@/api/auth'
import { bootstrapData } from '@/composables/useBootstrap'
import { resolveAliasToEmail } from '@/composables/useMemberStore'
import { clearAuthSession, loadRememberMeToggle, setRememberPref, tryRestoreSession } from '@/composables/useAuthSession'
import { toast } from '@/composables/useToast'
import { DEFAULT_MEMBER_PASSWORD } from '@/lib/classMembers'

const defaultPassword = DEFAULT_MEMBER_PASSWORD
const FIRST_PASSWORD_NOTICE_KEY = 'auth_first_password_notice_seen'

const { themeClass } = useTheme()
const mode = ref('login')
const focusKey = ref('')
const showFirstPasswordNotice = ref(true)

const account = ref('')
const displayName = ref('')
const password = ref('')
const password2 = ref('')
const rememberMe = ref(true)
const loading = ref(false)
const pwdChangeOpen = ref(false)
const newPassword = ref('')
const newPassword2 = ref('')
const pwdSaving = ref(false)
const pwdDone = ref(false)
const pwdStatus = ref('')
const pwdStatusKind = ref('error')

const isPreview = (import.meta.env.VITE_USE_MOCK ?? 'true') === 'true'

function useDemoAccount() {
  mode.value = 'login'
  account.value = 'test@class.com'
  password.value = 'preview'
  toast.show('Demo filled')
}

function dismissFirstPasswordNotice() {
  showFirstPasswordNotice.value = false
  try {
    uni.setStorageSync(FIRST_PASSWORD_NOTICE_KEY, '1')
  } catch (e) {}
}

function setMode(next) {
  mode.value = next
  focusKey.value = ''
}

function onLogoLongPress() {
  if (mode.value === 'login') {
    setMode('register')
    toast.show('Register mode')
  }
}

async function onForgot() {
  if (!account.value.trim()) {
    toast.show('Enter email first')
    return
  }
  const { error } = await forgotPassword(account.value.trim())
  toast.show(error ? error.message : 'Reset sent')
}

async function resolveLoginAccount(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  if (value.includes('@')) return value.toLowerCase()
  const fromAccount = await resolveAccountToEmailAsync(value)
  return fromAccount || resolveAliasToEmail(value) || value.toLowerCase()
}
const STUDENT_DOMAIN = '@students.edu.sg'

function detectRole(email) {
  const e = (email || '').toLowerCase().trim()
  if (e.endsWith(STUDENT_DOMAIN)) return 'member'
  return null
}

function validate() {
  const value = account.value.trim()
  if (!value) return mode.value === 'register' ? 'Please enter your email' : 'Please enter username or email'
  if (mode.value === 'register' && !displayName.value.trim()) return 'Please enter your name'
  if (!password.value) return 'Please enter your password'

  if (mode.value === 'register') {
    if (password.value.length < 6) return 'Password must be at least 6 characters'
    if (password.value !== password2.value) return 'Passwords do not match'
    if (!detectRole(value)) {
      return 'Email must end with @students.edu.sg'
    }
  }
  return ''
}

async function onPrimary() {
  if (loading.value) return
  const msg = validate()
  if (msg) {
    toast.show(msg)
    return
  }

  loading.value = true
  try {
    if (mode.value === 'login') {
      const raw = account.value.trim()
      const resolvedEmail = await resolveLoginAccount(raw)
      const { data, error } = await login(resolvedEmail, password.value)
      if (error) {
        toast.show(error.message || 'Login failed')
        return
      }
      setRememberPref({ enabled: rememberMe.value, account: raw })
      await bootstrapData({ force: true })
      if (data?.mustChangePassword) {
        pwdStatus.value = ''
        pwdDone.value = false
        newPassword.value = ''
        newPassword2.value = ''
        pwdChangeOpen.value = true
        toast.show('Set a new password to continue')
        return
      }
      if (rememberMe.value) toast.rememberMeEnabled()
      dismissFirstPasswordNotice()
      toast.loginSuccess()
      setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 250)
    } else {
      const { error } = await register(account.value.trim(), password.value, displayName.value.trim())
      if (error) {
        toast.show(error.message || 'Registration failed')
        return
      }
      toast.show('Account created')
      setTimeout(() => setMode('login'), 250)
    }
  } finally {
    loading.value = false
  }
}

async function submitPasswordChange() {
  if (pwdSaving.value || pwdDone.value) return
  pwdStatus.value = ''
  if (!newPassword.value || newPassword.value.length < 6) {
    pwdStatus.value = 'Password must be at least 6 characters'
    pwdStatusKind.value = 'error'
    toast.show(pwdStatus.value)
    return
  }
  if (newPassword.value !== newPassword2.value) {
    pwdStatus.value = 'Passwords do not match'
    pwdStatusKind.value = 'error'
    toast.show(pwdStatus.value)
    return
  }
  pwdSaving.value = true
  try {
    const { error } = await changePassword(newPassword.value)
    if (error) {
      pwdStatus.value = error.message || 'Could not update password'
      pwdStatusKind.value = 'error'
      toast.show(pwdStatus.value)
      return
    }

    pwdDone.value = true
    pwdStatus.value = 'Password updated. Taking you in…'
    pwdStatusKind.value = 'success'
    toast.show('Password updated')

    setRememberPref({ enabled: rememberMe.value, account: account.value.trim() })
    await bootstrapData({ force: true })

    setTimeout(() => {
      pwdChangeOpen.value = false
      pwdDone.value = false
      pwdStatus.value = ''
      newPassword.value = ''
      newPassword2.value = ''
      toast.loginSuccess()
      uni.reLaunch({ url: '/pages/index/index' })
    }, 650)
  } catch (e) {
    pwdStatus.value = e?.message || 'Something went wrong'
    pwdStatusKind.value = 'error'
    toast.show(pwdStatus.value)
  } finally {
    pwdSaving.value = false
  }
}

async function signOutFromPasswordChange() {
  pwdSaving.value = true
  try {
    await logout()
    clearAuthSession()
  } finally {
    pwdSaving.value = false
    pwdChangeOpen.value = false
    pwdDone.value = false
    pwdStatus.value = ''
    newPassword.value = ''
    newPassword2.value = ''
    password.value = ''
    toast.show('Signed out')
  }
}

onLoad(async () => {
  try {
    showFirstPasswordNotice.value = !uni.getStorageSync(FIRST_PASSWORD_NOTICE_KEY)
  } catch (e) {}
  rememberMe.value = loadRememberMeToggle()
  const restored = await tryRestoreSession()
  if (restored) {
    const { user, profile } = await getCurrentUser()
    if (userMustChangePassword(profile, user)) {
      pwdChangeOpen.value = true
      toast.show('Set a new password to continue')
      return
    }
    uni.reLaunch({ url: '/pages/index/index' })
  }
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.safe {
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 36rpx;
  position: relative;
  z-index: 1;
}

.bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.18), transparent 60%),
    radial-gradient(900rpx 700rpx at 70% 30%, rgba(120, 180, 255, 0.14), transparent 65%),
    linear-gradient(180deg, rgba(248, 250, 255, 1), rgba(241, 244, 250, 1));
}
.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.22), transparent 58%),
    radial-gradient(900rpx 700rpx at 70% 30%, rgba(100, 160, 255, 0.14), transparent 62%),
    linear-gradient(180deg, rgba(8, 12, 20, 1), rgba(10, 14, 26, 1));
}

.shellBar {
  height: 132rpx;
  margin-bottom: 28rpx;
  padding: 0 28rpx;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.68);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  box-shadow: 0 12rpx 40rpx rgba(12, 20, 40, 0.06);
  backdrop-filter: blur(16px);
}
.t-dark .shellBar {
  background: rgba(26, 29, 33, 0.78);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.35);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.brandLabel {
  font-size: 30rpx;
  font-weight: 740;
  letter-spacing: 0.6rpx;
  color: rgba(16, 24, 40, 0.78);
}
.t-dark .brandLabel { color: rgba(245, 247, 255, 0.84); }

.card {
  width: 100%;
  padding: 32rpx 32rpx 28rpx;
  border-radius: 38rpx;
  background: rgba(255, 255, 255, 0.74);
  border: 1rpx solid rgba(255, 255, 255, 0.60);
  box-shadow: 0 22rpx 70rpx rgba(12, 20, 40, 0.10);
  backdrop-filter: blur(14px);
}
.t-dark .card {
  background: rgba(18, 24, 40, 0.58);
  border-color: rgba(255, 255, 255, 0.10);
  box-shadow: 0 26rpx 90rpx rgba(0, 0, 0, 0.40);
}

.cardHeader {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 24rpx;
}
.cardTitle {
  font-size: 44rpx;
  font-weight: 760;
  letter-spacing: -0.4rpx;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .cardTitle { color: rgba(245, 247, 255, 0.92); }
.cardSub {
  font-size: 28rpx;
  line-height: 1.45;
  color: rgba(16, 24, 40, 0.58);
}
.t-dark .cardSub { color: rgba(245, 247, 255, 0.54); }

.noticeBanner {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  margin-bottom: 24rpx;
  padding: 18rpx 20rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, rgba(46, 99, 255, 0.10), rgba(46, 99, 255, 0.06));
  border: 1rpx solid rgba(46, 99, 255, 0.18);
}
.t-dark .noticeBanner {
  background: linear-gradient(135deg, rgba(80, 140, 255, 0.18), rgba(46, 99, 255, 0.12));
  border-color: rgba(120, 160, 255, 0.28);
}
.noticeDot {
  width: 16rpx;
  height: 16rpx;
  margin-top: 8rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(46, 99, 255, 0.88);
  box-shadow: 0 0 0 6rpx rgba(46, 99, 255, 0.16);
}
.noticeText {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.noticeTitle {
  font-size: 26rpx;
  font-weight: 700;
  color: rgba(46, 99, 255, 0.92);
}
.t-dark .noticeTitle { color: rgba(170, 200, 255, 0.96); }
.noticeSub {
  font-size: 24rpx;
  line-height: 1.45;
  color: rgba(16, 24, 40, 0.62);
}
.t-dark .noticeSub { color: rgba(245, 247, 255, 0.62); }

.form { display: flex; flex-direction: column; gap: 20rpx; }

.field {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.label {
  font-size: 26rpx;
  font-weight: 680;
  color: rgba(16, 24, 40, 0.72);
  padding-left: 4rpx;
}
.t-dark .label { color: rgba(245, 247, 255, 0.68); }

.fieldRow {
  min-height: 104rpx;
  padding: 0 22rpx;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.70);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  display: flex;
  align-items: center;
  gap: 14rpx;
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
.t-dark .fieldRow {
  background: rgba(10, 14, 26, 0.55);
  border-color: rgba(255, 255, 255, 0.10);
}
.fieldRow.focus {
  border-color: rgba(46, 99, 255, 0.55);
  box-shadow: 0 0 0 8rpx rgba(46, 99, 255, 0.12);
}

.fieldInput {
  flex: 1;
  min-width: 0;
  font-size: 32rpx;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .fieldInput { color: rgba(245, 247, 255, 0.92); }
.placeholder { color: rgba(16, 24, 40, 0.35); }
.t-dark .placeholder { color: rgba(245, 247, 255, 0.28); }

.fieldGlyph {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  position: relative;
  opacity: 0.72;
}
.fieldGlyph.lg { width: 36rpx; height: 36rpx; }
.fieldGlyph.sm { width: 24rpx; height: 24rpx; }

.userGlyph::before,
.userGlyph::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(16, 24, 40, 0.72);
  border-radius: 999rpx;
}
.t-dark .userGlyph::before,
.t-dark .userGlyph::after { background: rgba(245, 247, 255, 0.78); }
.userGlyph::before {
  top: 2rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}
.userGlyph::after {
  bottom: 2rpx;
  width: 20rpx;
  height: 10rpx;
  border-radius: 10rpx 10rpx 4rpx 4rpx;
}

.nameGlyph::before,
.nameGlyph::after {
  content: '';
  position: absolute;
  background: rgba(16, 24, 40, 0.72);
  border-radius: 999rpx;
}
.t-dark .nameGlyph::before,
.t-dark .nameGlyph::after { background: rgba(245, 247, 255, 0.78); }
.nameGlyph::before {
  left: 4rpx;
  top: 8rpx;
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
}
.nameGlyph::after {
  right: 2rpx;
  bottom: 4rpx;
  width: 16rpx;
  height: 2rpx;
  transform: rotate(-24deg);
}

.lockGlyph::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 2rpx;
  width: 12rpx;
  height: 8rpx;
  margin-left: -6rpx;
  border: 2rpx solid rgba(16, 24, 40, 0.72);
  border-bottom: none;
  border-radius: 8rpx 8rpx 0 0;
}
.lockGlyph::after {
  content: '';
  position: absolute;
  left: 4rpx;
  right: 4rpx;
  bottom: 2rpx;
  height: 14rpx;
  border-radius: 4rpx;
  background: rgba(16, 24, 40, 0.72);
}
.t-dark .lockGlyph::before { border-color: rgba(245, 247, 255, 0.78); }
.t-dark .lockGlyph::after { background: rgba(245, 247, 255, 0.78); }
.lockGlyph.repeat::after { opacity: 0.55; }

.actionRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx 4rpx 0;
}
.remember {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.rememberSpacer { flex: 1; }
.rememberText {
  font-size: 26rpx;
  color: rgba(16, 24, 40, 0.68);
}
.t-dark .rememberText { color: rgba(245, 247, 255, 0.62); }
.link {
  font-size: 26rpx;
  font-weight: 640;
  color: rgba(46, 99, 255, 0.92);
}
.t-dark .link { color: rgba(170, 200, 255, 0.92); }

.switch {
  width: 72rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.12);
  border: 1rpx solid rgba(16, 24, 40, 0.10);
  position: relative;
}
.t-dark .switch {
  background: rgba(245, 247, 255, 0.10);
  border-color: rgba(255, 255, 255, 0.10);
}
.switch.on {
  background: rgba(46, 99, 255, 0.35);
  border-color: rgba(46, 99, 255, 0.25);
}
.switchKnob {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  transition: transform 180ms ease;
}
.switch.on .switchKnob { transform: translateX(32rpx); }

.primary {
  margin-top: 8rpx;
  height: 108rpx;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #4f86ff, #2e63ff);
  box-shadow: 0 18rpx 50rpx rgba(46, 99, 255, 0.35);
}
.t-dark .primary { box-shadow: 0 20rpx 60rpx rgba(46, 99, 255, 0.25); }
.primary.loading { opacity: 0.72; }
.primary.done {
  background: linear-gradient(180deg, #44c767, #2ea44f);
  box-shadow: 0 18rpx 50rpx rgba(46, 160, 90, 0.28);
}
.primaryText {
  font-size: 32rpx;
  font-weight: 740;
  color: rgba(255, 255, 255, 0.96);
  letter-spacing: 0.4rpx;
}

.backRow {
  display: flex;
  justify-content: center;
  padding-top: 4rpx;
}

.actionGlyph {
  width: 28rpx;
  height: 28rpx;
  position: relative;
}
.arrowGlyph::before {
  content: '';
  position: absolute;
  left: 4rpx;
  top: 50%;
  width: 16rpx;
  height: 2rpx;
  margin-top: -1rpx;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 999rpx;
}
.arrowGlyph::after {
  content: '';
  position: absolute;
  right: 4rpx;
  top: 50%;
  margin-top: -5rpx;
  width: 0;
  height: 0;
  border-top: 5rpx solid transparent;
  border-bottom: 5rpx solid transparent;
  border-left: 8rpx solid rgba(255, 255, 255, 0.96);
}
.checkGlyph::before {
  content: '';
  position: absolute;
  left: 4rpx;
  bottom: 10rpx;
  width: 10rpx;
  height: 2rpx;
  background: rgba(255, 255, 255, 0.96);
  transform: rotate(45deg);
  border-radius: 999rpx;
}
.checkGlyph::after {
  content: '';
  position: absolute;
  left: 10rpx;
  bottom: 12rpx;
  width: 16rpx;
  height: 2rpx;
  background: rgba(255, 255, 255, 0.96);
  transform: rotate(-45deg);
  border-radius: 999rpx;
}
.outGlyph::before {
  content: '';
  position: absolute;
  left: 6rpx;
  top: 50%;
  width: 12rpx;
  height: 2rpx;
  margin-top: -1rpx;
  background: rgba(16, 24, 40, 0.48);
  border-radius: 999rpx;
}
.outGlyph::after {
  content: '';
  position: absolute;
  right: 4rpx;
  top: 50%;
  margin-top: -5rpx;
  width: 0;
  height: 0;
  border-top: 5rpx solid transparent;
  border-bottom: 5rpx solid transparent;
  border-right: 8rpx solid rgba(16, 24, 40, 0.48);
}
.t-dark .outGlyph::before { background: rgba(245, 247, 255, 0.44); }
.t-dark .outGlyph::after { border-right-color: rgba(245, 247, 255, 0.44); }

.tap:active { transform: scale(0.985); }

.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(8, 12, 20, 0.38);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.pwdSheet {
  width: 100%;
  max-width: 680rpx;
  padding: 28rpx 24rpx calc(28rpx + env(safe-area-inset-bottom));
  border-radius: 28rpx 28rpx 0 0;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
}
.t-dark .pwdSheet { background: rgba(26, 29, 33, 0.94); }

.pwdHead {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.pwdTitle {
  font-size: 28rpx;
  font-weight: 740;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .pwdTitle { color: rgba(245, 247, 255, 0.92); }

.pwdStatus {
  margin-bottom: 14rpx;
  padding: 12rpx 14rpx;
  border-radius: 16rpx;
  border: 1rpx solid transparent;
}
.pwdStatus.error {
  background: rgba(255, 59, 48, 0.08);
  border-color: rgba(255, 59, 48, 0.18);
}
.pwdStatus.success {
  background: rgba(46, 99, 255, 0.08);
  border-color: rgba(46, 99, 255, 0.18);
}
.pwdStatusText {
  font-size: 22rpx;
  font-weight: 640;
  line-height: 1.4;
}
.pwdStatus.error .pwdStatusText { color: rgba(180, 40, 32, 0.92); }
.pwdStatus.success .pwdStatusText { color: rgba(46, 99, 255, 0.92); }

.pwdSignOut {
  margin-top: 16rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
