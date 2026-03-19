// client/src/components/SearchBar.jsx
import { useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:5000/api'

export default function SearchBar({ token, conversationId, channelId, onClose }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: query })
      if (conversationId) params.append('conversationId', conversationId)
      if (channelId)      params.append('channelId', channelId)

      const { data } = await axios.get(
        `${API}/messages/search?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setResults(data)
    } catch (err) {
      console.error('Search failed:', err.message)
    }
    setLoading(false)
  }

  return (
    <div style={s.overlay}>
      <div style={s.panel}>
        <div style={s.header}>
          <span style={s.title}>Search Messages</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={s.inputRow}>
          <input style={s.input} placeholder='Search...' value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            autoFocus />
          <button style={s.searchBtn} onClick={search}>
            {loading ? '...' : 'Search'}
          </button>
        </div>
        <div style={s.results}>
          {results.length === 0 && query && !loading && (
            <div style={s.empty}>No results found</div>
          )}
          {results.map((msg, i) => (
            <div key={i} style={s.result}>
              <div style={s.resultSender}>{msg.sender.username}</div>
              <div style={s.resultText}>{msg.text}</div>
              <div style={s.resultTime}>
                {new Date(msg.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay:     { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
                 display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 },
  panel:       { background:'#111118', border:'1px solid #2a2a3a', borderRadius:16,
                 width:520, maxHeight:'70vh', display:'flex', flexDirection:'column' },
  header:      { display:'flex', justifyContent:'space-between', alignItems:'center',
                 padding:'16px 20px', borderBottom:'1px solid #2a2a3a' },
  title:       { color:'#e8e8f0', fontWeight:700, fontSize:16 },
  closeBtn:    { background:'none', border:'none', color:'#6b6b8a', cursor:'pointer', fontSize:16 },
  inputRow:    { display:'flex', gap:8, padding:16 },
  input:       { flex:1, background:'#1a1a24', border:'1px solid #2a2a3a', color:'#e8e8f0',
                 padding:'10px 14px', borderRadius:8, fontSize:14, outline:'none' },
  searchBtn:   { background:'#7c5cfc', color:'white', border:'none', padding:'10px 20px',
                 borderRadius:8, fontWeight:700, cursor:'pointer' },
  results:     { overflowY:'auto', padding:'0 16px 16px' },
  empty:       { color:'#6b6b8a', textAlign:'center', padding:24, fontSize:14 },
  result:      { background:'#1a1a24', border:'1px solid #2a2a3a', borderRadius:8,
                 padding:'12px 14px', marginBottom:8 },
  resultSender:{ color:'#25d0a1', fontSize:12, fontWeight:700, marginBottom:4 },
  resultText:  { color:'#e8e8f0', fontSize:14, marginBottom:4 },
  resultTime:  { color:'#6b6b8a', fontSize:11 },
}
