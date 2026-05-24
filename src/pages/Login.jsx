import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]       = useState('in')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [showPw, setShowPw] = useState(false)

  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')

  const [rEmail, setREmail]     = useState('')
  const [rPass, setRPass]       = useState('')
  const [rPass2, setRPass2]     = useState('')
  const [rCompany, setRCompany] = useState('')
  const [rPhone, setRPhone]     = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !pass) { setError('يرجى ملء جميع الحقول'); return }
    setLoading(true); setError('')
    try {
      await signIn(email, pass)
      navigate('/')
    } catch {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    } finally { setLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!rEmail || !rPass || !rCompany) { setError('يرجى ملء الحقول المطلوبة *'); return }
    if (rPass !== rPass2) { setError('كلمتا المرور غير متطابقتين'); return }
    if (rPass.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    setLoading(true); setError('')
    try {
      await signUp(rEmail, rPass, rCompany, rPhone)
      navigate('/')
    } catch (err) {
      setError(err.message || 'حدث خطأ، حاول مرة أخرى')
    } finally { setLoading(false) }
  }

  function toggleTheme() {
    const dark = document.documentElement.hasAttribute('data-dark')
    if (dark) {
      document.documentElement.removeAttribute('data-dark')
      localStorage.setItem('np_theme', 'light')
    } else {
      document.documentElement.setAttribute('data-dark', '')
      localStorage.setItem('np_theme', 'dark')
    }
  }

  return (
    <div className="login-page">
      <button className="theme-toggle" onClick={toggleTheme}>
        {document.documentElement.hasAttribute('data-dark') ? '☀️' : '🌙'}
      </button>

      {/* Background orbs */}
      <div style={{
        position:'absolute',width:400,height:400,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(26,63,219,.1),transparent)',
        top:-120,right:-120,pointerEvents:'none',
        animation:'orbFloat 7s ease-in-out infinite'
      }}/>
      <div style={{
        position:'absolute',width:300,height:300,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(156,39,176,.08),transparent)',
        bottom:-80,left:-80,pointerEvents:'none',
        animation:'orbFloat 10s ease-in-out infinite reverse'
      }}/>

      <div className="login-wrap">
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:28}} className="fadeUp">
          <div className="login-logo">📡</div>
          <h1 style={{fontSize:28,fontWeight:900,
            background:'var(--gP)',WebkitBackgroundClip:'text',
            WebkitTextFillColor:'transparent'}}>
            نيت برو
          </h1>
          <p style={{fontSize:13,color:'var(--ink3)',marginTop:5}}>
            المنصة الاحترافية لإدارة اشتراكات الإنترنت
          </p>
        </div>

        {/* Card */}
        <div className="login-card fadeUp" style={{animationDelay:'.1s'}}>
          {/* Tabs */}
          <div className="tab-switcher">
            <button
              className={`tab-btn ${tab==='in'?'active':''}`}
              onClick={() => { setTab('in'); setError('') }}
            >تسجيل الدخول</button>
            <button
              className={`tab-btn ${tab==='up'?'active':''}`}
              onClick={() => { setTab('up'); setError('') }}
            >إنشاء حساب</button>
          </div>

          {/* Error */}
          {error && (
            <div style={{background:'#fee2e2',color:'#dc2626',
              padding:'10px 14px',borderRadius:10,fontSize:13,
              fontWeight:600,marginBottom:14}}>
              ⚠️ {error}
            </div>
          )}

          {/* Login Form */}
          {tab === 'in' && (
            <form onSubmit={handleLogin}>
              <div className="field">
                <label className="field-label">البريد الإلكتروني</label>
                <div className="field-wrap">
                  <span className="field-icon">📧</span>
                  <input className="field-input" type="email"
                    placeholder="example@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">كلمة المرور</label>
                <div className="field-wrap">
                  <span className="field-icon">🔒</span>
                  <input className="field-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={pass} onChange={e => setPass(e.target.value)} />
                  <button type="button" className="field-icon field-icon-left"
                    onClick={() => setShowPw(!showPw)}>
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '⏳ جاري الدخول...' : 'دخول إلى المنصة →'}
              </button>
              <div style={{textAlign:'center',marginTop:12}}>
                <button type="button" style={{background:'none',border:'none',
                  color:'var(--blue)',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  نسيت كلمة المرور؟
                </button>
              </div>
            </form>
          )}

          {/* Register Form */}
          {tab === 'up' && (
            <form onSubmit={handleRegister}>
              <div className="field">
                <label className="field-label">البريد الإلكتروني *</label>
                <div className="field-wrap">
                  <span className="field-icon">📧</span>
                  <input className="field-input" type="email"
                    placeholder="example@email.com"
                    value={rEmail} onChange={e => setREmail(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">كلمة المرور *</label>
                <div className="field-wrap">
                  <span className="field-icon">🔒</span>
                  <input className="field-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="6 أحرف على الأقل"
                    value={rPass} onChange={e => setRPass(e.target.value)} />
                  <button type="button" className="field-icon field-icon-left"
                    onClick={() => setShowPw(!showPw)}>
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div className="field">
                <label className="field-label">تأكيد كلمة المرور *</label>
                <div className="field-wrap">
                  <span className="field-icon">🔒</span>
                  <input className="field-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="أعد كتابة كلمة المرور"
                    value={rPass2} onChange={e => setRPass2(e.target.value)} />
                </div>
              </div>
              <div className="divider">بيانات الشركة</div>
              <div className="field">
                <label className="field-label">اسم الشركة / المنصة *</label>
                <div className="field-wrap">
                  <span className="field-icon">🏢</span>
                  <input className="field-input" type="text"
                    placeholder="مثال: شركة الرافدين للإنترنت"
                    value={rCompany} onChange={e => setRCompany(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">رقم الهاتف</label>
                <div className="field-wrap">
                  <span className="field-icon">📞</span>
                  <input className="field-input" type="tel"
                    placeholder="07XXXXXXXXX"
                    value={rPhone} onChange={e => setRPhone(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn btn-gold" disabled={loading}>
                {loading ? '⏳ جاري الإنشاء...' : '🎁 إنشاء الحساب مجاناً'}
              </button>
              <div className="trial-note" style={{marginTop:12}}>
                <span>✨ 7 أيام تجريبية مجانية — بدون بطاقة</span>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes orbFloat {
          0%,100%{transform:translate(0,0)}
          33%{transform:translate(18px,-14px)}
          66%{transform:translate(-14px,18px)}
        }
      `}</style>
    </div>
  )
}
