// client/src/App.jsx
import { useState } from 'react'
import axios from 'axios'
import Chat from './pages/chat'


const API = 'http://localhost:5000/api'

export default function App() {
  const [mode, setMode]       = useState('login')  // 'login' or 'register'
  const [form, setForm]       = useState({ username:'', email:'', password:'' })
  const [token, setToken]     = useState(null)
  const [user, setUser]       = useState(null)
  const [error, setError]     = useState('')

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async () => {
    setError('')
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const { data } = await axios.post(API + endpoint, form)
      localStorage.setItem('HelloChat_token', data.token)
      localStorage.setItem('HelloChat_user',  JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user)
    } catch (err) {
      setError(err.response?.data?.msg || 'Something went wrong')
    }
  }

  const logout = () => {
    localStorage.clear()
    setToken(null)
    setUser(null)
  }

  // If logged in → show Chat
  if (token && user) return <Chat user={user} token={token} onLogout={logout} />

  return (
    <div style={styles.center}>
      <h1 style={styles.title}>HelloChat</h1>
      <p style={styles.sub}>{mode === 'login' ? 'Sign in' : 'Create account'}</p>
      {mode === 'register' && (
        <input style={styles.input} name='username' placeholder='Username'
          value={form.username} onChange={handle} />
      )}
      <input style={styles.input} name='email' placeholder='Email'
        value={form.email} onChange={handle} />
      <input style={styles.input} name='password' type='password' placeholder='Password'
        value={form.password} onChange={handle} />
      {error && <p style={styles.error}>{error}</p>}
      <button style={styles.btn} onClick={submit}>
        {mode === 'login' ? 'Login' : 'Register'}
      </button>
      <p style={styles.toggle} onClick={() => setMode(mode==='login'?'register':'login')}>
        {mode === 'login' ? 'No account? Register' : 'Have account? Login'}
      </p>
    </div>
  )
}

const styles = {
  center: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            minHeight:'100vh', background:'#0a0a0f', fontFamily:'Arial,sans-serif', gap:12 },
  title:  { color:'#7c5cfc', fontSize:48, fontWeight:800, margin:0 },
  sub:    { color:'#6b6b8a', fontSize:16, margin:0 },
  input:  { background:'#111118', border:'1px solid #2a2a3a', color:'#e8e8f0',
            padding:'12px 16px', borderRadius:8, fontSize:14, width:280, outline:'none' },
  btn:    { background:'#7c5cfc', color:'white', border:'none', padding:'13px 32px',
            borderRadius:8, fontSize:15, fontWeight:700, cursor:'pointer', width:316 },
  toggle: { color:'#6b6b8a', fontSize:13, cursor:'pointer' },
  error:  { color:'#ff6b6b', fontSize:13 },
}