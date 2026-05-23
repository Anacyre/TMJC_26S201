<template>
  <view class="page" :class="themeClass">
    <view class="bg" />

    <view class="safe">
      <view class="topbar">
        <view class="brand">
          <view class="dot" />
          <view class="brandText">
            <text class="brandTitle">26S201 Class OS</text>
            <text class="brandSub">Tasks · Community · Study</text>
          </view>
        </view>

        <view class="themeToggle" @tap="toggleTheme" role="button">
          <text class="themeToggleText">{{ theme === 'dark' ? 'Dark' : 'Light' }}</text>
          <view class="themeKnob" :class="{ on: theme === 'dark' }" />
        </view>
      </view>

      <view class="card">
        <view class="cardHeader">
          <view class="cardTitleWrap">
            <text class="cardTitle">Welcome back</text>
            <text class="cardSub">
              {{ mode === 'login' ? 'Sign in to keep your day organized.' : 'Create an account to get started.' }}
            </text>
          </view>

          <view class="modePill" @tap="toggleMode" role="button">
            <text class="modePillText">{{ mode === 'login' ? 'Login' : 'Register' }}</text>
          </view>
        </view>

        <view v-if="isPreview" class="previewBanner" role="button" @tap="useDemoAccount">
          <view class="previewDot" />
          <view class="previewText">
            <text class="previewTitle">Preview Mode · backend not connected</text>
            <text class="previewSub">Tap to use the demo account · test@class.com · any password</text>
          </view>
        </view>

        <view class="form">
          <view class="field" :class="{ focus: focusKey === 'account' }">
            <text class="label">{{ mode === 'login' ? 'Email or alias' : 'Email' }}</text>
            <input
              class="input"
              :placeholder="mode === 'login' ? 'alex@class.com  ·  or your alias' : 'you@example.com'"
              placeholder-class="placeholder"
              v-model="account"
              @focus="focusKey = 'account'"
              @blur="focusKey = ''"
              autocomplete="username"
            />
          </view>

          <view v-if="mode === 'register'" class="field" :class="{ focus: focusKey === 'name' }">
            <text class="label">Display name</text>
            <input
              class="input"
              placeholder="Your name"
              placeholder-class="placeholder"
              v-model="displayName"
              @focus="focusKey = 'name'"
              @blur="focusKey = ''"
            />
          </view>

          <view class="field" :class="{ focus: focusKey === 'password' }">
            <text class="label">Password</text>
            <input
              class="input"
              password
              placeholder="••••••••"
              placeholder-class="placeholder"
              v-model="password"
              @focus="focusKey = 'password'"
              @blur="focusKey = ''"
              autocomplete="current-password"
            />
          </view>

          <view v-if="mode === 'register'" class="field" :class="{ focus: focusKey === 'password2' }">
            <text class="label">Confirm password</text>
            <input
              class="input"
              password
              placeholder="••••••••"
              placeholder-class="placeholder"
              v-model="password2"
              @focus="focusKey = 'password2'"
              @blur="focusKey = ''"
              autocomplete="new-password"
            />
          </view>

          <view class="row">
            <view class="remember" @tap="rememberMe = !rememberMe" role="button">
              <view class="switch" :class="{ on: rememberMe }">
                <view class="switchKnob" />
              </view>
              <text class="rowText">Remember me</text>
            </view>

            <text v-if="mode === 'login'" class="link" @tap="onForgot">Forgot password?</text>
          </view>

          <view class="primary" :class="{ loading: loading }" @tap="onPrimary" role="button">
            <text class="primaryText">{{ mode === 'login' ? 'Login' : 'Create account' }}</text>
          </view>

          <view class="bottomRow">
            <text class="muted">{{ mode === 'login' ? 'New here?' : 'Already have an account?' }}</text>
            <text class="link" @tap="toggleMode">
              {{ mode === 'login' ? 'Create account' : 'Back to login' }}
            </text>
          </view>
        </view>
      </view>

      <view class="footer">
        <text class="footerLeft">© 2026 26S201 · Class OS</text>
        <text class="footerRight">Theme: {{ theme }}</text>
      </view>
    </view>
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { login, register, forgotPassword } from '@/api/auth'
import { bootstrapData } from '@/composables/useBootstrap'
import { resolveAliasToEmail } from '@/composables/useMemberStore'
import { toast } from '@/composables/useToast'

const THEME_KEY = 'ui_theme'
const MODE_KEY = 'auth_mode'

const theme = ref('light')
const mode = ref('login')
const focusKey = ref('')

const account = ref('')
const displayName = ref('')
const password = ref('')
const password2 = ref('')
const rememberMe = ref(true)
const loading = ref(false)

const isPreview = (import.meta.env.VITE_USE_MOCK ?? 'true') === 'true'

const themeClass = computed(() => (theme.value === 'dark' ? 't-dark' : 't-light'))

function useDemoAccount() {
  mode.value = 'login'
  account.value = 'test@class.com'
  password.value = 'preview'
  toast.show('Demo filled')
}

function loadPersisted() {
  try {
    const t = uni.getStorageSync(THEME_KEY)
    const m = uni.getStorageSync(MODE_KEY)
    if (t === 'light' || t === 'dark') theme.value = t
    if (m === 'login' || m === 'register') mode.value = m
  } catch (e) {}
}

function persist() {
  try {
    uni.setStorageSync(THEME_KEY, theme.value)
    uni.setStorageSync(MODE_KEY, mode.value)
  } catch (e) {}
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  persist()
}

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  focusKey.value = ''
  persist()
}

async function onForgot() {
  if (!account.value.trim()) {
    toast.show('Enter email first')
    return
  }
  const { error } = await forgotPassword(account.value.trim())
  toast.show(error ? error.message : 'Reset sent')
}

const ADMIN_DOMAIN = '@class.com'
const STUDENT_DOMAIN = '@students.edu.sg'

function detectRole(email) {
  const e = (email || '').toLowerCase().trim()
  if (e.endsWith(ADMIN_DOMAIN)) return 'admin'
  if (e.endsWith(STUDENT_DOMAIN)) return 'member'
  return null
}

function validate() {
  const value = account.value.trim()
  if (!value) return mode.value === 'register' ? 'Please enter your email' : 'Please enter your email or alias'
  if (mode.value === 'register' && !displayName.value.trim()) return 'Please enter your name'
  if (!password.value) return 'Please enter your password'

  if (mode.value === 'register') {
    if (password.value.length < 6) return 'Password must be at least 6 characters'
    if (password.value !== password2.value) return 'Passwords do not match'
    if (!detectRole(value)) {
      return 'Email must end with @class.com (admin) or @students.edu.sg (student)'
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
      const resolvedEmail = raw.includes('@') ? raw : (resolveAliasToEmail(raw) || raw)
      const { error } = await login(resolvedEmail, password.value)
      if (error) {
        toast.show(error.message || 'Login failed')
        return
      }
      toast.show('Logged in')
      await bootstrapData({ force: true })
      setTimeout(() => uni.navigateTo({ url: '/pages/index/index' }), 250)
    } else {
      const { error } = await register(account.value.trim(), password.value, displayName.value.trim())
      if (error) {
        toast.show(error.message || 'Registration failed')
        return
      }
      toast.show('Account created')
      setTimeout(() => {
        mode.value = 'login'
        persist()
      }, 250)
    }
  } finally {
    loading.value = false
  }
}

onLoad(() => {
  loadPersisted()
  const sys = uni.getSystemInfoSync?.()
  if (!uni.getStorageSync(THEME_KEY) && sys?.theme) {
    theme.value = sys.theme === 'dark' ? 'dark' : 'light'
  }
  persist()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.safe {
  padding: 52rpx 34rpx 28rpx;
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

.safe,
.topbar,
.card,
.footer {
  position: relative;
  z-index: 1;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 34rpx;
}

.brand {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 14rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(12px);
}

.t-dark .brand {
  background: rgba(22, 28, 44, 0.55);
  border-color: rgba(255, 255, 255, 0.10);
}

.dot {
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  background: linear-gradient(180deg, #6aa6ff, #2e63ff);
  box-shadow: 0 0 0 8rpx rgba(83, 147, 255, 0.18);
}

.brandText {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brandTitle {
  font-size: 28rpx;
  font-weight: 650;
  color: rgba(16, 24, 40, 0.92);
}

.t-dark .brandTitle {
  color: rgba(245, 247, 255, 0.92);
}

.brandSub {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.54);
}

.t-dark .brandSub {
  color: rgba(245, 247, 255, 0.52);
}

.themeToggle {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(12px);
}

.t-dark .themeToggle {
  background: rgba(22, 28, 44, 0.55);
  border-color: rgba(255, 255, 255, 0.10);
}

.themeToggleText {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.68);
}

.t-dark .themeToggleText {
  color: rgba(245, 247, 255, 0.62);
}

.themeKnob {
  width: 62rpx;
  height: 34rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.12);
  position: relative;
}

.themeKnob::after {
  content: '';
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 26rpx;
  height: 26rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  transition: transform 180ms ease;
}

.themeKnob.on {
  background: rgba(80, 140, 255, 0.32);
}

.themeKnob.on::after {
  transform: translateX(28rpx);
  background: rgba(10, 14, 26, 0.9);
}

.card {
  width: 100%;
  padding: 32rpx 30rpx 26rpx;
  border-radius: 34rpx;
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
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.cardTitleWrap {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.cardTitle {
  font-size: 40rpx;
  font-weight: 760;
  color: rgba(16, 24, 40, 0.92);
  letter-spacing: -0.5rpx;
}

.t-dark .cardTitle {
  color: rgba(245, 247, 255, 0.92);
}

.cardSub {
  font-size: 24rpx;
  color: rgba(16, 24, 40, 0.60);
}

.t-dark .cardSub {
  color: rgba(245, 247, 255, 0.54);
}

.modePill {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.06);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}

.t-dark .modePill {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.10);
}

.modePillText {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.70);
}

.t-dark .modePillText {
  color: rgba(245, 247, 255, 0.65);
}

.previewBanner {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 14rpx 16rpx;
  margin-bottom: 22rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, rgba(80, 140, 255, 0.14), rgba(46, 99, 255, 0.10));
  border: 1rpx solid rgba(46, 99, 255, 0.22);
  transition: transform 180ms ease;
}

.t-dark .previewBanner {
  background: linear-gradient(135deg, rgba(80, 140, 255, 0.18), rgba(46, 99, 255, 0.12));
  border-color: rgba(120, 160, 255, 0.28);
}

.previewBanner:active {
  transform: scale(0.985);
}

.previewDot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: rgba(46, 99, 255, 0.92);
  box-shadow: 0 0 0 6rpx rgba(46, 99, 255, 0.18);
  flex-shrink: 0;
}

.previewText {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex: 1;
  min-width: 0;
}

.previewTitle {
  font-size: 22rpx;
  font-weight: 700;
  color: rgba(46, 99, 255, 0.96);
}

.t-dark .previewTitle {
  color: rgba(170, 200, 255, 0.96);
}

.previewSub {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.62);
}

.t-dark .previewSub {
  color: rgba(245, 247, 255, 0.62);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.field {
  padding: 18rpx 18rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.70);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}

.t-dark .field {
  background: rgba(10, 14, 26, 0.55);
  border-color: rgba(255, 255, 255, 0.10);
}

.field.focus {
  border-color: rgba(46, 99, 255, 0.55);
  box-shadow: 0 0 0 10rpx rgba(46, 99, 255, 0.14);
}

.label {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.55);
}

.t-dark .label {
  color: rgba(245, 247, 255, 0.52);
}

.input {
  margin-top: 10rpx;
  font-size: 28rpx;
  color: rgba(16, 24, 40, 0.92);
}

.t-dark .input {
  color: rgba(245, 247, 255, 0.92);
}

.placeholder {
  color: rgba(16, 24, 40, 0.35);
}

.t-dark .placeholder {
  color: rgba(245, 247, 255, 0.28);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx 2rpx;
}

.remember {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.switch {
  width: 64rpx;
  height: 36rpx;
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
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  transition: transform 180ms ease;
}

.switch.on .switchKnob {
  transform: translateX(28rpx);
}

.rowText {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.65);
}

.t-dark .rowText {
  color: rgba(245, 247, 255, 0.60);
}

.link {
  font-size: 22rpx;
  color: rgba(46, 99, 255, 0.95);
}

.primary {
  margin-top: 6rpx;
  height: 92rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #4f86ff, #2e63ff);
  box-shadow: 0 18rpx 50rpx rgba(46, 99, 255, 0.35);
  transform: translateZ(0);
}

.t-dark .primary {
  box-shadow: 0 20rpx 60rpx rgba(46, 99, 255, 0.25);
}

.primary.loading {
  opacity: 0.72;
}

.primaryText {
  color: rgba(255, 255, 255, 0.96);
  font-size: 28rpx;
  font-weight: 700;
  letter-spacing: 0.4rpx;
}

.bottomRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6rpx;
}

.muted {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.50);
}

.t-dark .muted {
  color: rgba(245, 247, 255, 0.45);
}

.footer {
  margin-top: 26rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8rpx;
}

.footerLeft,
.footerRight {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.46);
}

.t-dark .footerLeft,
.t-dark .footerRight {
  color: rgba(245, 247, 255, 0.40);
}
</style>

