import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MO = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
            'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function moLabel(ym) {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  return `${MO[parseInt(m)-1]} ${y}`
}
function fmt(n) { return Number(n).toLocaleString('ar-IQ') + ' د.ع' }

export default function Payments() {
  const { company } = useAuth()
  const [pays, setPays]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('payments').select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    setPays(data || [])
    setLoading(false)
  }

  const list = search
    ? pays.filter(p =>
        p.subscriber_name.includes(search) ||
        moLabel(p.month).includes(search))
    : pays

  return (
    <div className="page">
      <div className="page-title">📋 سجل الدفعات</div>

      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input className="search-input"
          placeholder="بحث باسم أو شهر..."
          value={search}
          onChange={e => setSearch(e.target.value)} />
        {search && (
          <button className="search-clear"
            onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      <div className="sec-header">
        <div className="sec-title">الدفعات المسجلة</div>
        <div className="sec-count">{list.length}</div>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:40,fontSize:24}}>⏳</div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-art">📋</div>
          <div className="empty-title">لا يوجد دفعات مسجلة</div>
          <div className="empty-sub">ابدأ بتسجيل أول دفعة من صفحة المشتركين</div>
        </div>
      ) : list.map(p => (
        <div key={p.id} className="card" style={{marginBottom:9}}>
          <div className="card-body" style={{padding:'13px 15px'}}>
            <div style={{display:'flex',justifyContent:'space-between',
              alignItems:'flex-start'}}>
              <div>
                <div style={{fontWeight:800,fontSize:14,color:'var(--ink)'}}>
                  {p.subscriber_name}
                </div>
                <div style={{fontSize:12,color:'var(--ink3)',marginTop:2}}>
                  {moLabel(p.month)} • {p.paid_at}
                </div>
                <div style={{fontSize:11,color:'var(--ink3)',marginTop:1}}>
                  بواسطة: {p.recorded_by || '—'}
                </div>
              </div>
              <div style={{textAlign:'left'}}>
                <div style={{fontSize:17,fontWeight:900,
                  background:'var(--gT)',WebkitBackgroundClip:'text',
                  WebkitTextFillColor:'transparent'}}>
                  {fmt(p.amount)}
                </div>
                <span className="badge badge-ok" style={{marginTop:5}}>
                  ✅ مسجل
                </span>
              </div>
            </div>
            {p.notes && (
              <div style={{marginTop:8,fontSize:12,color:'var(--ink3)',
                background:'var(--bg2)',borderRadius:8,padding:'6px 10px'}}>
                📝 {p.notes}
              </div>
            )}
          </div>
        </div>
      ))}

      <style>{`
        .sec-count { font-size:11px;font-weight:700;color:var(--ink3);
          background:var(--bg2);border:1px solid var(--bdr);
          padding:3px 10px;border-radius:20px; }
      `}</style>
    </div>
  )
}
