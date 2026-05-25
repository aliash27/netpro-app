import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toast } from '../components/Toast'

function calcDebt(sub) {
  if (!sub?.last_paid_month) return []
  const now = new Date()
  const [ly, lm] = sub.last_paid_month.split('-').map(Number)
  const months = []
  let y = ly, m = lm + 1
  if (m > 12) { m = 1; y++ }
  while (new Date(y, m - 1) <= now) {
    months.push(`${y}-${String(m).padStart(2,'0')}`)
    m++; if (m > 12) { m = 1; y++ }
  }
  return months
}

function fmt(n) { return Number(n).toLocaleString('ar-IQ') + ' د.ع' }
function moLabel(ym) {
  if (!ym) return '—'
  const MO = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
  const [y, m] = ym.split('-')
  return `${MO[parseInt(m)-1]} ${y}`
}
function avatarColor(name) {
  const c = ['#1a3fdb','#059669','#d97706','#e11d48','#7c3aed','#0d9488']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % c.length
  return c[h]
}

export default function Debts() {
  const { company } = useAuth()
  const navigate = useNavigate()
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('subscribers').select('*')
      .eq('company_id', company.id).eq('is_active', true)
    setSubs(data || [])
    setLoading(false)
  }

  const late = subs.filter(s => calcDebt(s).length > 0)
  const totalDebt = late.reduce((a, s) => a + calcDebt(s).length * s.monthly_fee, 0)

  function sendWA(sub) {
    const d = calcDebt(sub)
    const total = d.length * sub.monthly_fee
    const tmpl = company?.whatsapp_template ||
      'عزيزي {name}، لديك {months} شهر متأخر بمبلغ {amount} د.ع. شكراً — {company}'
    const msg = tmpl
      .replace(/{name}/g, sub.name)
      .replace(/{months}/g, d.length)
      .replace(/{amount}/g, total.toLocaleString('ar-IQ'))
      .replace(/{company}/g, company?.name || 'المنصة')
    const phone = sub.phone.replace(/^0/, '964')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function sendAllWA() {
    if (!late.length) { toast('لا يوجد متأخرون', 'i'); return }
    toast(`جاري فتح ${late.length} محادثات...`, 'i')
    late.forEach((sub, i) => setTimeout(() => sendWA(sub), i * 1100))
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',
      minHeight:'60vh',fontSize:24}}>⏳</div>
  )

  return (
    <div className="page">
      <div className="page-title">⚠️ الديون المستحقة</div>

      {/* Summary cards */}
      <div className="stat-grid" style={{marginBottom:16}}>
        <div className="stat-card">
          <div className="stat-icon si-2">👥</div>
          <div className="stat-label">متأخرون</div>
          <div className="stat-value warn">{late.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon si-3">💰</div>
          <div className="stat-label">إجمالي الديون</div>
          <div className="stat-value danger"
            style={{fontSize:'clamp(11px,3vw,18px)'}}>
            {fmt(totalDebt)}
          </div>
        </div>
      </div>

      {late.length > 0 && (
        <button className="btn btn-whatsapp" style={{marginBottom:16}}
          onClick={sendAllWA}>
          📨 مراسلة جميع المتأخرين دفعة واحدة
        </button>
      )}

      <div className="sec-header">
        <div className="sec-title">المتأخرون عن الدفع</div>
        <div className="sec-count">{late.length}</div>
      </div>

      {late.length === 0 ? (
        <div className="empty-state">
          <div className="empty-art">🎉</div>
          <div className="empty-title">لا يوجد متأخرون!</div>
          <div className="empty-sub">جميع المشتركين مدفوعون. عمل رائع!</div>
        </div>
      ) : late.map(sub => {
        const d = calcDebt(sub)
        const total = d.length * sub.monthly_fee
        const color = avatarColor(sub.name)
        return (
          <div key={sub.id} className="card" style={{marginBottom:11}}>
            <div className="card-body" style={{padding:15}}>
              <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:11}}>
                <div className="sub-avatar" style={{background:`${color}22`,color}}>
                  {sub.name[0]}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14,cursor:'pointer',
                    color:'var(--ink)'}}
                    onClick={() => navigate(`/subscribers/${sub.id}`)}>
                    {sub.name}
                  </div>
                  <div style={{fontSize:12,color:'var(--ink3)'}}>{sub.phone}</div>
                </div>
                <div style={{textAlign:'left'}}>
                  <span className="badge badge-err">⚠️ {d.length} شهر</span>
                  <div style={{fontSize:14,fontWeight:900,color:'var(--rose)',marginTop:4}}>
                    {fmt(total)}
                  </div>
                </div>
              </div>
              <div style={{fontSize:12,color:'var(--ink3)',marginBottom:10}}>
                آخر دفع: <strong style={{color:'var(--ink)'}}>{moLabel(sub.last_paid_month)}</strong>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/subscribers/${sub.id}`)}>
                  📋 تفاصيل
                </button>
                <button className="btn btn-whatsapp btn-sm" onClick={() => sendWA(sub)}>
                  📱 مراسلة
                </button>
              </div>
            </div>
          </div>
        )
      })}

      <style>{`
        .sec-count { font-size:11px;font-weight:700;color:var(--ink3);
          background:var(--bg2);border:1px solid var(--bdr);
          padding:3px 10px;border-radius:20px; }
      `}</style>
    </div>
  )
}
