import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toast } from '../components/Toast'

const MO = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
            'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

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
  const [y, m] = ym.split('-')
  return `${MO[parseInt(m)-1]} ${y}`
}
function avatarColor(name) {
  const c = ['#1a3fdb','#059669','#d97706','#e11d48','#7c3aed','#0d9488']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % c.length
  return c[h]
}

const today  = new Date().toISOString().split('T')[0]
const curMo  = today.slice(0, 7)

export default function SubscriberDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { company } = useAuth()

  const [sub, setSub]       = useState(null)
  const [pays, setPays]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit]   = useState(false)
  const [showPay, setShowPay]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({})
  const [payForm, setPayForm]     = useState({
    month: curMo, amount: '', paid_at: today, notes: ''
  })

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('subscribers').select('*').eq('id', id).single(),
      supabase.from('payments').select('*').eq('subscriber_id', id)
        .order('created_at', { ascending: false })
    ])
    setSub(s); setPays(p || [])
    setLoading(false)
  }

  async function saveEdit() {
    if (!form.name || !form.phone || !form.monthly_fee) {
      toast('يرجى ملء الحقول المطلوبة', 'e'); return
    }
    setSaving(true)
    const { error } = await supabase.from('subscribers').update({
      name: form.name, phone: form.phone,
      start_date: form.start_date,
      monthly_fee: parseFloat(form.monthly_fee),
      last_paid_month: form.last_paid_month,
      notes: form.notes
    }).eq('id', id)
    setSaving(false)
    if (error) { toast('خطأ في التعديل', 'e'); return }
    toast('تم التعديل ✅', 's')
    setShowEdit(false)
    load()
  }

  async function savePay() {
    if (!payForm.month || !payForm.amount) {
      toast('يرجى ملء جميع الحقول', 'e'); return
    }
    setSaving(true)
    const { error } = await supabase.from('payments').insert({
      company_id: company.id,
      subscriber_id: id,
      subscriber_name: sub.name,
      month: payForm.month,
      amount: parseFloat(payForm.amount),
      paid_at: payForm.paid_at,
      notes: payForm.notes,
      recorded_by: 'admin'
    })
    if (error) { toast('خطأ في تسجيل الدفعة', 'e'); setSaving(false); return }

    // Update last_paid_month
    const allPaid = [...pays.map(p => p.month), payForm.month].sort()
    const lastMo = allPaid[allPaid.length - 1]
    await supabase.from('subscribers')
      .update({ last_paid_month: lastMo }).eq('id', id)

    toast(`تم تسجيل دفعة ${moLabel(payForm.month)} ✅`, 's')
    setSaving(false)
    setShowPay(false)
    load()
  }

  async function deleteSub() {
    if (!confirm('هل أنت متأكد من حذف هذا المشترك؟')) return
    await supabase.from('subscribers').update({ is_active: false }).eq('id', id)
    toast('تم حذف المشترك', 's')
    navigate('/subscribers')
  }

  function sendWA() {
    if (!sub || !company) return
    const d = calcDebt(sub)
    const total = d.length * sub.monthly_fee
    const tmpl = company.whatsapp_template ||
      'عزيزي {name}، لديك {months} شهر متأخر بمبلغ {amount} د.ع. شكراً — {company}'
    const msg = tmpl
      .replace(/{name}/g, sub.name)
      .replace(/{months}/g, d.length)
      .replace(/{amount}/g, total.toLocaleString('ar-IQ'))
      .replace(/{company}/g, company.name || 'المنصة')
    const phone = sub.phone.replace(/^0/, '964')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',
      minHeight:'60vh',fontSize:24}}>⏳</div>
  )
  if (!sub) return (
    <div style={{textAlign:'center',padding:40}}>
      <p>لم يتم العثور على المشترك</p>
      <button className="btn btn-primary" style={{marginTop:16,width:'auto',padding:'10px 20px'}}
        onClick={() => navigate('/subscribers')}>← رجوع</button>
    </div>
  )

  const debt = calcDebt(sub)
  const total = debt.length * sub.monthly_fee
  const color = avatarColor(sub.name)

  return (
    <div>
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/subscribers')}>←</button>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:'var(--ink)'}}>{sub.name}</div>
          <div style={{fontSize:12,color:'var(--ink3)'}}>{sub.phone}</div>
        </div>
        <div style={{flex:1}} />
        <button className="icon-btn" onClick={() => {
          setForm({
            name:sub.name, phone:sub.phone,
            start_date:sub.start_date,
            monthly_fee:sub.monthly_fee,
            last_paid_month:sub.last_paid_month||'',
            notes:sub.notes||''
          })
          setShowEdit(true)
        }}>✏️</button>
        <button className="icon-btn" style={{color:'var(--rose)'}}
          onClick={deleteSub}>🗑</button>
      </div>

      <div style={{padding:'18px 16px 100px',maxWidth:660,margin:'0 auto'}}>
        {/* Hero */}
        <div className="hero-card fadeUp" style={{
          background: debt.length
            ? 'linear-gradient(135deg,#1a3fdb,#7c3aed,#c2185b)'
            : 'linear-gradient(135deg,#059669,#0d9488)',
          marginBottom:14
        }}>
          <div className="hero-inner">
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
              <div style={{width:56,height:56,borderRadius:17,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:24,fontWeight:900,background:'rgba(255,255,255,.2)',
                color:'#fff',border:'2px solid rgba(255,255,255,.3)',flexShrink:0}}>
                {sub.name[0]}
              </div>
              <div>
                <div style={{fontSize:17,fontWeight:900,color:'#fff'}}>{sub.name}</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,.75)'}}>{sub.phone}</div>
              </div>
              <div style={{marginRight:'auto'}}>
                {debt.length ? (
                  <span className="badge badge-err">⚠️ {debt.length} شهر</span>
                ) : (
                  <span style={{background:'rgba(255,255,255,.2)',borderRadius:20,
                    padding:'3px 10px',fontSize:11,fontWeight:800,color:'#fff'}}>
                    ✅ مدفوع
                  </span>
                )}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:9}}>
              {[
                ['الرسم الشهري', fmt(sub.monthly_fee)],
                ['آخر دفع', moLabel(sub.last_paid_month)],
                ['الديون', debt.length ? `${debt.length} شهر` : 'لا ديون ✅'],
              ].map(([l, v]) => (
                <div key={l} className="hero-mini">
                  <div className="hero-mini-label">{l}</div>
                  <div className="hero-mini-value">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="card fadeUp d1" style={{marginBottom:13}}>
          <div className="card-body">
            <div className="card-title">📋 بيانات الاشتراك</div>
            <div className="info-grid">
              {[
                ['📅 تاريخ البداية', sub.start_date],
                ['💰 الرسم الشهري', fmt(sub.monthly_fee)],
                ['✅ آخر دفع', moLabel(sub.last_paid_month)],
                ['📝 ملاحظات', sub.notes || '—'],
              ].map(([l,v]) => (
                <div key={l} className="info-cell">
                  <div className="info-label">{l}</div>
                  <div className="info-value">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Debt */}
        {debt.length > 0 ? (
          <div className="card fadeUp d2" style={{
            marginBottom:13,
            border:'1.5px solid rgba(225,29,72,.22)'}}>
            <div className="card-body">
              <div style={{display:'flex',justifyContent:'space-between',
                alignItems:'center',marginBottom:13}}>
                <div className="card-title" style={{margin:0,color:'var(--rose)'}}>
                  ⚠️ الديون المستحقة
                </div>
                <span className="badge badge-err">{debt.length} شهر</span>
              </div>
              <div className="debt-table">
                <div className="debt-header">
                  <span>الشهر</span>
                  <span style={{textAlign:'left'}}>المبلغ</span>
                </div>
                {debt.map(mo => (
                  <div key={mo} className="debt-row">
                    <span style={{fontSize:13}}>{moLabel(mo)}</span>
                    <span style={{fontSize:13,fontWeight:700,textAlign:'left'}}>
                      {fmt(sub.monthly_fee)}
                    </span>
                  </div>
                ))}
                <div className="debt-row debt-total">
                  <span>الإجمالي</span>
                  <span style={{textAlign:'left'}}>{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="fadeUp d2" style={{
            background:'linear-gradient(135deg,rgba(5,150,105,.08),rgba(16,185,129,.04))',
            border:'1.5px solid rgba(5,150,105,.18)',borderRadius:20,
            padding:20,textAlign:'center',marginBottom:13}}>
            <div style={{fontSize:36,marginBottom:7}}>🎉</div>
            <div style={{fontWeight:800,fontSize:15,color:'var(--green)'}}>
              جميع الأشهر مدفوعة
            </div>
          </div>
        )}

        {/* Payment history */}
        <div className="card fadeUp d3" style={{marginBottom:13}}>
          <div className="card-body">
            <div className="card-title">📜 سجل الدفعات</div>
            {pays.length === 0 ? (
              <div style={{textAlign:'center',padding:18,color:'var(--ink3)',fontSize:13}}>
                لا يوجد سجل دفعات
              </div>
            ) : pays.map(p => (
              <div key={p.id} style={{display:'flex',justifyContent:'space-between',
                alignItems:'center',padding:'10px 0',
                borderBottom:'1px solid var(--bdr)'}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13}}>{moLabel(p.month)}</div>
                  <div style={{fontSize:11,color:'var(--ink3)'}}>{p.paid_at}</div>
                </div>
                <div style={{fontWeight:900,fontSize:15,
                  background:'var(--gT)',WebkitBackgroundClip:'text',
                  WebkitTextFillColor:'transparent'}}>
                  {fmt(p.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="action-bar">
        <button className="btn btn-primary" style={{flex:2}}
          onClick={() => {
            setPayForm({
              month: debt.length > 0 ? debt[0] : curMo,
              amount: sub.monthly_fee,
              paid_at: today, notes: ''
            })
            setShowPay(true)
          }}>
          ✅ تسجيل دفعة جديدة
        </button>
        <button className="btn btn-whatsapp"
          style={{flex:0,padding:'14px 18px',width:'auto'}}
          onClick={sendWA}>
          📱
        </button>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={e => {
          if (e.target === e.currentTarget) setShowEdit(false)
        }}>
          <div className="modal-sheet">
            <div className="modal-pill" />
            <div className="modal-header">
              ✏️ <span>تعديل بيانات المشترك</span>
              <button className="modal-close" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            {[
              { label:'الاسم الكامل *', key:'name', type:'text', ph:'', icon:'👤' },
              { label:'رقم الهاتف *', key:'phone', type:'tel', ph:'', icon:'📞' },
              { label:'تاريخ بداية الاشتراك', key:'start_date', type:'date', ph:'', icon:'📅' },
              { label:'الرسم الشهري (د.ع) *', key:'monthly_fee', type:'number', ph:'', icon:'💰' },
              { label:'آخر شهر مدفوع', key:'last_paid_month', type:'month', ph:'', icon:'📅' },
            ].map(f => (
              <div className="field" key={f.key}>
                <label className="field-label">{f.label}</label>
                <div className="field-wrap">
                  <span className="field-icon">{f.icon}</span>
                  <input className="field-input" type={f.type}
                    placeholder={f.ph} value={form[f.key]}
                    onChange={e => setForm({...form,[f.key]:e.target.value})} />
                </div>
              </div>
            ))}
            <div className="field">
              <label className="field-label">ملاحظات</label>
              <textarea className="field-input" rows={3} value={form.notes}
                onChange={e => setForm({...form,notes:e.target.value})} />
            </div>
            <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
              {saving ? '⏳ جاري الحفظ...' : '💾 حفظ التعديلات'}
            </button>
            <button className="btn btn-ghost" style={{marginTop:9}}
              onClick={() => setShowEdit(false)}>إلغاء</button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPay && (
        <div className="modal-overlay" onClick={e => {
          if (e.target === e.currentTarget) setShowPay(false)
        }}>
          <div className="modal-sheet">
            <div className="modal-pill" />
            <div className="modal-header">
              ✅ <span>تسجيل دفعة جديدة</span>
              <button className="modal-close" onClick={() => setShowPay(false)}>✕</button>
            </div>
            <div style={{background:'var(--bg2)',border:'1px solid var(--bdr)',
              borderRadius:14,padding:13,marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:14,color:'var(--ink)'}}>{sub.name}</div>
              <div style={{fontSize:12,color:'var(--ink3)',marginTop:3}}>
                الرسم: {fmt(sub.monthly_fee)}
              </div>
              {debt.length > 0 ? (
                <span className="badge badge-err" style={{marginTop:8}}>
                  ⚠️ {debt.length} شهر متأخر
                </span>
              ) : (
                <span className="badge badge-ok" style={{marginTop:8}}>✅ لا ديون</span>
              )}
            </div>

            <div className="field">
              <label className="field-label">الشهر المدفوع</label>
              <select className="field-input" value={payForm.month}
                onChange={e => setPayForm({...payForm,month:e.target.value})}>
                {(debt.length > 0 ? debt : [curMo]).map(mo => (
                  <option key={mo} value={mo}>{moLabel(mo)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">المبلغ (د.ع) *</label>
              <div className="field-wrap">
                <span className="field-icon">💰</span>
                <input className="field-input" type="number"
                  value={payForm.amount}
                  onChange={e => setPayForm({...payForm,amount:e.target.value})} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">تاريخ الاستلام</label>
              <div className="field-wrap">
                <span className="field-icon">📅</span>
                <input className="field-input" type="date"
                  value={payForm.paid_at}
                  onChange={e => setPayForm({...payForm,paid_at:e.target.value})} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">ملاحظات</label>
              <textarea className="field-input" rows={2}
                value={payForm.notes}
                onChange={e => setPayForm({...payForm,notes:e.target.value})} />
            </div>

            <button className="btn btn-gold" onClick={savePay} disabled={saving}>
              {saving ? '⏳ جاري التسجيل...' : '✅ تأكيد الدفعة'}
            </button>
            <button className="btn btn-ghost" style={{marginTop:9}}
              onClick={() => setShowPay(false)}>إلغاء</button>
          </div>
        </div>
      )}

      <style>{`
        .detail-header { background:var(--sur);border-bottom:1px solid var(--bdr);
          padding:0 15px;height:62px;display:flex;align-items:center;gap:13px;
          position:sticky;top:0;z-index:100;backdrop-filter:blur(20px); }
        [data-dark] .detail-header { background:rgba(7,12,28,.9); }
        .back-btn { width:38px;height:38px;border-radius:11px;background:var(--bg2);
          border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;
          font-size:18px;cursor:pointer;color:var(--ink2);transition:.18s; }
        .back-btn:hover { background:var(--gP);color:#fff;border-color:transparent; }
        .modal-overlay { position:fixed;inset:0;z-index:500;background:rgba(4,8,22,.68);
          backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center; }
        .modal-sheet { width:100%;max-width:560px;max-height:92vh;overflow-y:auto;
          background:var(--sur);border-radius:26px 26px 0 0;
          padding:10px 20px 32px;animation:slideUp .38s ease;
          border-top:1px solid var(--bdr); }
        .modal-pill { width:38px;height:4px;background:var(--bdr);
          border-radius:4px;margin:8px auto 18px; }
        .modal-header { font-size:17px;font-weight:800;color:var(--ink);
          margin-bottom:20px;display:flex;align-items:center;gap:10px; }
        .modal-close { margin-right:auto;width:32px;height:32px;border-radius:50%;
          background:var(--bg2);border:none;color:var(--ink3);cursor:pointer;
          display:flex;align-items:center;justify-content:center;font-size:15px; }
        @keyframes slideUp {
          from{opacity:0;transform:translateY(100%)}
          to{opacity:1;transform:translateY(0)}
        }
      `}</style>
    </div>
  )
    }
