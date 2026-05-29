import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { toast } from '../../components/Toast'

function fmt(n) { return Number(n).toLocaleString('ar-IQ') + ' د.ع' }

export default function AdminDashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab]           = useState('overview')
  const [companies, setCompanies] = useState([])
  const [requests, setRequests]   = useState([])
  const [stats, setStats]         = useState({})
  const [loading, setLoading]     = useState(true)
  const [dark, setDark]           = useState(false)

  useEffect(() => {
    loadAll()
    setDark(document.documentElement.hasAttribute('data-dark'))
  }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: co }, { data: req }] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('subscription_requests').select('*, companies(name,email)')
        .order('requested_at', { ascending: false }),
    ])
    setCompanies(co || [])
    setRequests(req || [])

    const totalSubs = await supabase
      .from('subscribers').select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    setStats({
      totalCompanies: (co || []).length,
      activeCompanies: (co || []).filter(c => c.plan !== 'trial').length,
      pendingRequests: (req || []).filter(r => r.status === 'pending').length,
      totalSubscribers: totalSubs.count || 0,
    })
    setLoading(false)
  }

  async function approveRequest(id, companyId, planKey) {
    const { error } = await supabase
      .from('subscription_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast('خطأ في الموافقة', 'e'); return }

    await supabase.from('companies')
      .update({ plan: planKey })
      .eq('id', companyId)

    toast('تمت الموافقة على الطلب ✅', 's')
    loadAll()
  }

  async function rejectRequest(id) {
    const { error } = await supabase
      .from('subscription_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast('خطأ في الرفض', 'e'); return }
    toast('تم رفض الطلب', 'w')
    loadAll()
  }

  async function toggleCompany(id, current) {
    await supabase.from('companies')
      .update({ is_active: !current }).eq('id', id)
    toast(current ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب', 's')
    loadAll()
  }

  function toggleTheme() {
    const newDark = !dark
    setDark(newDark)
    if (newDark) {
      document.documentElement.setAttribute('data-dark', '')
      localStorage.setItem('np_theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-dark')
      localStorage.setItem('np_theme', 'light')
    }
  }

  const planColors = {
    trial:    '#d97706',
    starter:  '#6144f5',
    pro:      '#1a3fdb',
    business: '#059669'
  }
  const planNames = {
    trial: '⭐ تجريبي', starter: '⚡ البداية',
    pro: '💎 الاحترافي', business: '🏢 الأعمال'
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',
      fontFamily:'Tajawal,sans-serif',direction:'rtl'}}>

      {/* Admin Topbar */}
      <div style={{height:62,padding:'0 16px',display:'flex',
        alignItems:'center',justifyContent:'space-between',
        background:'linear-gradient(135deg,#0a0f1e,#1a3fdb)',
        position:'sticky',top:0,zIndex:200,
        boxShadow:'0 4px 20px rgba(26,63,219,.3)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,
            background:'rgba(255,255,255,.15)',display:'flex',
            alignItems:'center',justifyContent:'center',fontSize:18}}>
            🛡️
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:900,color:'#fff'}}>
              لوحة تحكم المدير
            </div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.6)',
              letterSpacing:'.04em'}}>
              NETPRO ADMIN
            </div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={toggleTheme}
            style={{width:36,height:36,borderRadius:9,border:'1px solid rgba(255,255,255,.2)',
              background:'rgba(255,255,255,.1)',color:'#fff',cursor:'pointer',fontSize:16}}>
            {dark ? '☀️' : '🌙'}
          </button>
          <button onClick={() => navigate('/')}
            style={{width:36,height:36,borderRadius:9,border:'1px solid rgba(255,255,255,.2)',
              background:'rgba(255,255,255,.1)',color:'#fff',cursor:'pointer',fontSize:14,
              fontWeight:700}}>
            🏠
          </button>
          <button onClick={async () => { await signOut(); navigate('/login') }}
            style={{padding:'8px 14px',borderRadius:9,border:'1px solid rgba(225,29,72,.4)',
              background:'rgba(225,29,72,.15)',color:'#ff6b6b',cursor:'pointer',
              fontSize:12,fontWeight:700}}>
            خروج 🚪
          </button>
        </div>
      </div>

      <div style={{maxWidth:800,margin:'0 auto',padding:'20px 16px 40px'}}>

        {/* Stats */}
        {loading ? (
          <div style={{textAlign:'center',padding:40,fontSize:24}}>⏳</div>
        ) : (
          <>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',
              gap:11,marginBottom:20}}>
              {[
                { icon:'🏢', label:'إجمالي الشركات',    value: stats.totalCompanies,   color:'var(--blue)' },
                { icon:'✅', label:'مشتركون فعليون',     value: stats.activeCompanies,  color:'var(--green)' },
                { icon:'⏳', label:'طلبات معلّقة',       value: stats.pendingRequests,  color:'var(--amber)' },
                { icon:'👥', label:'إجمالي المشتركين',   value: stats.totalSubscribers, color:'var(--blue2)' },
              ].map(s => (
                <div key={s.label} style={{background:'var(--sur)',
                  border:'1px solid var(--bdr)',borderRadius:16,
                  padding:'15px 14px',boxShadow:'var(--shC)'}}>
                  <div style={{fontSize:28,marginBottom:6}}>{s.icon}</div>
                  <div style={{fontSize:11,color:'var(--ink3)',fontWeight:700,
                    marginBottom:3,letterSpacing:'.04em'}}>
                    {s.label}
                  </div>
                  <div style={{fontSize:26,fontWeight:900,color:s.color}}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{display:'flex',background:'var(--bg2)',
              borderRadius:10,padding:4,gap:4,marginBottom:16}}>
              {[
                { key:'overview', label:'📊 نظرة عامة' },
                { key:'requests', label:`⏳ الطلبات ${stats.pendingRequests > 0 ? `(${stats.pendingRequests})` : ''}` },
                { key:'companies', label:'🏢 الشركات' },
              ].map(t => (
                <button key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{flex:1,padding:'9px 8px',borderRadius:7,border:'none',
                    fontSize:12,fontWeight:700,cursor:'pointer',transition:'.18s',
                    background: tab===t.key ? 'var(--gP)' : 'transparent',
                    color: tab===t.key ? '#fff' : 'var(--ink3)',
                    boxShadow: tab===t.key ? '0 3px 12px rgba(26,63,219,.22)' : 'none'}}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
              <div>
                {/* Plans distribution */}
                <div style={{background:'var(--sur)',border:'1px solid var(--bdr)',
                  borderRadius:16,padding:18,marginBottom:14}}>
                  <div style={{fontSize:15,fontWeight:800,color:'var(--ink)',
                    marginBottom:14}}>
                    📈 توزيع الباقات
                  </div>
                  {Object.entries(planNames).map(([key, name]) => {
                    const count = companies.filter(c => c.plan === key).length
                    const pct = companies.length
                      ? Math.round(count / companies.length * 100) : 0
                    return (
                      <div key={key} style={{marginBottom:10}}>
                        <div style={{display:'flex',justifyContent:'space-between',
                          marginBottom:4}}>
                          <span style={{fontSize:13,fontWeight:600}}>{name}</span>
                          <span style={{fontSize:13,fontWeight:800,
                            color:planColors[key]}}>
                            {count} شركة ({pct}%)
                          </span>
                        </div>
                        <div style={{height:6,background:'var(--bdr)',
                          borderRadius:6,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,
                            background:planColors[key],borderRadius:6,
                            transition:'width .7s ease'}}/>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Recent signups */}
                <div style={{background:'var(--sur)',border:'1px solid var(--bdr)',
                  borderRadius:16,padding:18}}>
                  <div style={{fontSize:15,fontWeight:800,color:'var(--ink)',
                    marginBottom:14}}>
                    🆕 آخر التسجيلات
                  </div>
                  {companies.slice(0, 5).map(co => (
                    <div key={co.id} style={{display:'flex',
                      justifyContent:'space-between',alignItems:'center',
                      padding:'10px 0',borderBottom:'1px solid var(--bdr)'}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'var(--ink)'}}>
                          {co.name}
                        </div>
                        <div style={{fontSize:11,color:'var(--ink3)'}}>
                          {co.email}
                        </div>
                      </div>
                      <span style={{fontSize:11,fontWeight:800,padding:'3px 9px',
                        borderRadius:20,background:`${planColors[co.plan]}22`,
                        color:planColors[co.plan]}}>
                        {planNames[co.plan]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requests Tab */}
            {tab === 'requests' && (
              <div>
                {requests.length === 0 ? (
                  <div style={{textAlign:'center',padding:40,color:'var(--ink3)'}}>
                    <div style={{fontSize:40,marginBottom:8}}>📭</div>
                    <div style={{fontWeight:700}}>لا يوجد طلبات</div>
                  </div>
                ) : requests.map(req => (
                  <div key={req.id} style={{background:'var(--sur)',
                    border:'1px solid var(--bdr)',borderRadius:16,
                    padding:16,marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',
                      alignItems:'flex-start',marginBottom:12}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:800,color:'var(--ink)'}}>
                          {req.companies?.name || '—'}
                        </div>
                        <div style={{fontSize:12,color:'var(--ink3)',marginTop:2}}>
                          {req.companies?.email}
                        </div>
                        <div style={{fontSize:12,color:'var(--ink3)',marginTop:2}}>
                          {new Date(req.requested_at).toLocaleString('ar')}
                        </div>
                      </div>
                      <div style={{textAlign:'left'}}>
                        <div style={{fontSize:16,fontWeight:900,
                          background:'var(--gP)',WebkitBackgroundClip:'text',
                          WebkitTextFillColor:'transparent'}}>
                          ${req.amount}/شهر
                        </div>
                        <span style={{fontSize:11,fontWeight:800,padding:'3px 9px',
                          borderRadius:20,marginTop:4,display:'inline-block',
                          background: req.status==='pending'
                            ? 'rgba(217,119,6,.1)' : req.status==='approved'
                            ? 'rgba(5,150,105,.1)' : 'rgba(225,29,72,.1)',
                          color: req.status==='pending' ? 'var(--amber)'
                            : req.status==='approved' ? 'var(--green)' : 'var(--rose)'}}>
                          {req.status==='pending' ? '⏳ معلّق'
                            : req.status==='approved' ? '✅ مقبول' : '❌ مرفوض'}
                        </span>
                      </div>
                    </div>

                    <div style={{display:'flex',gap:8,alignItems:'center',
                      flexWrap:'wrap',marginBottom:12}}>
                      <span style={{fontSize:12,fontWeight:700,
                        padding:'4px 12px',borderRadius:20,
                        background:`${planColors[req.plan_key]}22`,
                        color:planColors[req.plan_key]}}>
                        {planNames[req.plan_key]}
                      </span>
                      {req.admin_notes && (
                        <span style={{fontSize:12,color:'var(--ink3)'}}>
                          📝 {req.admin_notes}
                        </span>
                      )}
                    </div>

                    {req.payment_image_url && (
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:12,color:'var(--ink3)',
                          marginBottom:6,fontWeight:700}}>
                          📷 صورة إيصال الدفع:
                        </div>
                        <img
                          src={req.payment_image_url}
                          alt="إيصال الدفع"
                          style={{width:'100%',maxHeight:200,
                            objectFit:'cover',borderRadius:10,cursor:'pointer'}}
                          onClick={() => window.open(req.payment_image_url,'_blank')}
                        />
                      </div>
                    )}

                    {req.status === 'pending' && (
                      <div style={{display:'grid',
                        gridTemplateColumns:'1fr 1fr',gap:8}}>
                        <button
                          onClick={() => approveRequest(
                            req.id, req.company_id, req.plan_key)}
                          style={{padding:'10px',borderRadius:10,border:'none',
                            background:'linear-gradient(135deg,#065f46,#059669)',
                            color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                          ✅ موافقة
                        </button>
                        <button
                          onClick={() => rejectRequest(req.id)}
                          style={{padding:'10px',borderRadius:10,border:'none',
                            background:'linear-gradient(135deg,#7f1d1d,#dc2626)',
                            color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                          ❌ رفض
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Companies Tab */}
            {tab === 'companies' && (
              <div>
                {companies.map(co => (
                  <div key={co.id} style={{background:'var(--sur)',
                    border:'1px solid var(--bdr)',borderRadius:16,
                    padding:16,marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',
                      alignItems:'flex-start',marginBottom:8}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:800,color:'var(--ink)'}}>
                          {co.name}
                        </div>
                        <div style={{fontSize:12,color:'var(--ink3)',marginTop:2}}>
                          {co.email}
                        </div>
                        <div style={{fontSize:11,color:'var(--ink3)',marginTop:2}}>
                          📅 {new Date(co.created_at).toLocaleDateString('ar')}
                        </div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',
                        alignItems:'flex-end',gap:6}}>
                        <span style={{fontSize:11,fontWeight:800,
                          padding:'3px 9px',borderRadius:20,
                          background:`${planColors[co.plan]}22`,
                          color:planColors[co.plan]}}>
                          {planNames[co.plan]}
                        </span>
                        <span style={{fontSize:11,fontWeight:700,
                          padding:'2px 8px',borderRadius:20,
                          background: co.is_active
                            ? 'rgba(5,150,105,.1)' : 'rgba(225,29,72,.1)',
                          color: co.is_active ? 'var(--green)' : 'var(--rose)'}}>
                          {co.is_active ? '● نشط' : '● موقف'}
                        </span>
                      </div>
                    </div>
                    <div style={{display:'grid',
                      gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
                      <button
                        onClick={() => toggleCompany(co.id, co.is_active)}
                        style={{padding:'8px',borderRadius:9,border:'none',
                          background: co.is_active
                            ? 'rgba(225,29,72,.1)' : 'rgba(5,150,105,.1)',
                          color: co.is_active ? 'var(--rose)' : 'var(--green)',
                          fontWeight:700,fontSize:12,cursor:'pointer'}}>
                        {co.is_active ? '⏸ تعطيل' : '▶ تفعيل'}
                      </button>
                      <select
                        value={co.plan}
                        onChange={async e => {
                          await supabase.from('companies')
                            .update({ plan: e.target.value }).eq('id', co.id)
                          toast('تم تحديث الباقة ✅', 's')
                          loadAll()
                        }}
                        style={{padding:'8px',borderRadius:9,
                          border:'1px solid var(--bdr)',
                          background:'var(--bg2)',color:'var(--ink)',
                          fontFamily:'Tajawal,sans-serif',
                          fontSize:12,fontWeight:700,cursor:'pointer'}}>
                        <option value="trial">⭐ تجريبي</option>
                        <option value="starter">⚡ البداية</option>
                        <option value="pro">💎 الاحترافي</option>
                        <option value="business">🏢 الأعمال</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
