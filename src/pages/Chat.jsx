// client/src/pages/Chat.jsx
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import socket from '../socket'
import ServerView from './ServerView'
import MessageBubble from '../components/MessageBubble'
import SearchBar     from '../components/SearchBar'

const API = 'http://localhost:5000/api'

export default function Chat({ user, token }) {
  const [messages,    setMessages]    = useState([])
  const [text,        setText]        = useState('')
  const [typing,      setTyping]      = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [convoId,     setConvoId]     = useState(null)
  const [recipientId, setRecipientId] = useState('')
  const [servers,       setServers]       = useState([])
  const [activeServer,  setActiveServer]  = useState(null)
  const [showCreate,    setShowCreate]    = useState(false)
  const [serverName,    setServerName]    = useState('')
  const [joinCode,      setJoinCode]      = useState('')
  const [showJoin,      setShowJoin]      = useState(false)

  const bottomRef = useRef(null)
  const typingTimer = useRef(null)
  const [replyTo,     setReplyTo]     = useState(null)   // message being replied to
  const [showSearch,  setShowSearch]  = useState(false)  // search panel toggle
  const fileInputRef  = useRef(null)                     // hidden file input

  useEffect(() => {
    loadServers()
  }, [token])
  
  const loadServers = async () => {
    try {
      const { data } = await axios.get(
        API + '/servers/mine',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setServers(data)
    } catch (err) {
      console.error('Could not load servers:', err.message)
    }
  }
  
  const createServer = async () => {
    if (!serverName.trim()) return
    await axios.post(
      API + '/servers/create',
      { name: serverName },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    setServerName('')
    setShowCreate(false)
    loadServers()
  }
  
  const joinServer = async () => {
    if (!joinCode.trim()) return
    try {
      await axios.post(
        API + '/servers/join/' + joinCode,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setJoinCode('')
      setShowJoin(false)
      loadServers()
    } catch (err) {
      alert(err.response?.data?.msg || 'Could not join server')
    }
  }
  
  
  // Connect socket on mount
  useEffect(() => {
    socket.auth = { token }
    socket.connect()

    const onConnectError = (err) => {
      console.error('Socket connection error:', err.message)
    }

    const onReceiveMessage = (msg) => {
      setMessages(prev => [...prev, msg])
    }

    const onMessageUpdated = (updated) => {
      setMessages(prev => prev.map(m => m._id === updated._id ? updated : m))
    }

    const onOnlineUsers = (users) => setOnlineUsers(users)
    const onUserTyping = () => setTyping(true)
    const onUserStopTyping = () => setTyping(false)

    socket.on('connect_error', onConnectError)
    socket.on('receive_message', onReceiveMessage)
    socket.on('message_updated', onMessageUpdated)
    socket.on('online_users', onOnlineUsers)
    socket.on('user_typing', onUserTyping)
    socket.on('user_stop_typing', onUserStopTyping)

    return () => {
      socket.off('connect_error', onConnectError)
      socket.off('receive_message', onReceiveMessage)
      socket.off('message_updated', onMessageUpdated)
      socket.off('online_users', onOnlineUsers)
      socket.off('user_typing', onUserTyping)
      socket.off('user_stop_typing', onUserStopTyping)
      socket.disconnect()
    }
  }, [token])

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Open a conversation with another user
  const openConversation = async () => {
    if (!recipientId.trim()) return
    try {
      const { data: convo } = await axios.post(
        API + '/messages/conversation',
        { recipientId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setConvoId(convo._id)
      socket.emit('join_conversation', convo._id)

      // Load history
      const { data: history } = await axios.get(
        API + '/messages/' + convo._id,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMessages(history)
    } catch (err) {
      alert('Could not open conversation: ' + err.message)
    }
  }

  const sendMessage = (fileUrl = '', fileType = '') => {
    if (!text.trim() && !fileUrl) return
    if (!convoId) return
  
    socket.emit('send_message', {
      conversationId: convoId,
      text,
      fileUrl,
      fileType,
      replyTo: replyTo?._id || null
    })
    setText('')
    setReplyTo(null)
    socket.emit('stop_typing', { conversationId: convoId })
  }
  



  const handleTyping = (e) => {
    setText(e.target.value)
    if (!convoId) return
    socket.emit('typing', { conversationId: convoId, username: user.username })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      socket.emit('stop_typing', { conversationId: convoId })
    }, 1500)
  }
  const handleKey = (e) => { if (e.key === 'Enter') sendMessage() }

  return (
    <div style={s.layout}>

      {/* Server icon bar — leftmost column */}
      <div style={sv.serverBar}>
        <div
          style={sv.dmIcon}
          onClick={() => { setActiveServer(null); setShowCreate(false); setShowJoin(false) }}
          title='Direct Messages'
        >
          💬
        </div>
        <div style={sv.divider} />

        {servers.map(srv => (
          <div
            key={srv._id}
            style={{
              ...sv.serverIcon,
              borderColor: activeServer?._id === srv._id ? '#7c5cfc' : '#2a2a3a'
            }}
            onClick={() => { setActiveServer(srv); setShowCreate(false); setShowJoin(false) }}
            title={srv.name}
          >
            {srv.name.slice(0, 2).toUpperCase()}
          </div>
        ))}

        <div
          style={sv.addIcon}
          onClick={() => { setShowCreate(v => !v); setShowJoin(false) }}
          title='Create Server'
        >
          +
        </div>
        <div
          style={sv.addIcon}
          onClick={() => { setShowJoin(v => !v); setShowCreate(false) }}
          title='Join Server'
        >
          ⤵
        </div>

        {showCreate && (
          <div style={sv.popover}>
            <div style={sv.popLabel}>Server name</div>
            <input
              style={sv.popInput}
              value={serverName}
              onChange={e => setServerName(e.target.value)}
              placeholder='My Server'
            />
            <button style={sv.popBtn} onClick={createServer}>Create</button>
          </div>
        )}

        {showJoin && (
          <div style={sv.popover}>
            <div style={sv.popLabel}>Invite code</div>
            <input
              style={sv.popInput}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              placeholder='a3f9c2'
            />
            <button style={sv.popBtn} onClick={joinServer}>Join</button>
          </div>
        )}
      </div>

      {activeServer ? (
        <ServerView
          user={user}
          token={token}
          server={activeServer}
          onBack={() => setActiveServer(null)}
        />
      ) : (
        <>

          {/* Sidebar */}
          <div style={s.sidebar}>
            <div style={s.sideTitle}>NexChat</div>
            <div style={s.sideLabel}>Start DM</div>
            <input
              style={s.sideInput}
              placeholder='Paste User ID'
              value={recipientId}
              onChange={e => setRecipientId(e.target.value)}
            />
            <button style={s.sideBtn} onClick={openConversation}>Open Chat</button>
            <div style={s.sideLabel}>Online ({onlineUsers.length})</div>
            {onlineUsers.map(id => (
              <div key={id} style={s.onlineUser}>
                <span style={s.greenDot}></span>
                {id === user.id ? 'You' : id.slice(-6)}
              </div>
            ))}
          </div>

          {/* Chat area */}
          <div style={s.chatArea}>
            <div style={s.chatHeader}>
              <span>
                {convoId ? `Conversation · ${convoId.slice(-8)}` : 'Select a conversation'}
              </span>
              {convoId && (
                <button style={hdrBtn} onClick={() => setShowSearch(true)}>🔍</button>
              )}
            </div>

            {/* Search overlay */}
            {showSearch && (
              <SearchBar
                token={token}
                conversationId={convoId}
                onClose={() => setShowSearch(false)}
              />
            )}

            <div style={s.messages}>
              {/* Replace messages.map with MessageBubble */}
              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg._id || i}
                  msg={msg}
                  currentUserId={user.id}
                  onReply={(m) => setReplyTo(m)}
                />
              ))}
              {typing && <div style={s.typingIndicator}>typing...</div>}
              <div ref={bottomRef} />
            </div>

            {/* Reply preview bar — show above input when replying */}
            {replyTo && (
              <div style={replyBar}>
                <span>↩ Replying to: {replyTo.text?.slice(0, 40)}</span>
                <button onClick={() => setReplyTo(null)} style={cancelBtn}>✕</button>
              </div>
            )}

            <div style={s.inputRow}>
              <input
                style={s.msgInput}
                placeholder='Type a message...'
                value={text}
                onChange={handleTyping}
                onKeyDown={handleKey}
                disabled={!convoId}
              />
              {/* File upload button — add next to send button in inputRow */}
              <input
                ref={fileInputRef}
                type='file'
                style={{ display: 'none' }}
                accept='image/*,.pdf'
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const form = new FormData()
                  form.append('file', file)
                  try {
                    const { data } = await axios.post(API + '/upload', form, {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                      }
                    })
                    sendMessage(data.url, data.fileType)
                  } catch (err) {
                    console.error('Upload failed', err)
                  } finally {
                    e.target.value = ''
                  }
                }}
              />
              <button
                style={uploadBtn}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!convoId}
              >
                📎
              </button>
              <button style={s.sendBtn} onClick={sendMessage} disabled={!convoId}>Send</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const sv = {
  serverBar:  { width: 72, background: '#0d0d14', display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '12px 0', gap: 8, borderRight: '1px solid #2a2a3a',
    position: 'relative' },
  dmIcon:     { width: 48, height: 48, borderRadius: 16, background: '#7c5cfc', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 22, cursor: 'pointer' },
  divider:    { width: 32, height: 1, background: '#2a2a3a', margin: '4px 0' },
  serverIcon: { width: 48, height: 48, borderRadius: 16, background: '#1a1a24',
    border: '1px solid #2a2a3a', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#e8e8f0', fontWeight: 800, fontSize: 14,
    cursor: 'pointer', transition: 'border-color 0.2s' },
  addIcon:    { width: 48, height: 48, borderRadius: 16, background: 'transparent',
    border: '2px dashed #2a2a3a', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#6b6b8a', fontSize: 22, cursor: 'pointer' },
  popover:    { position: 'absolute', left: 80, top: 60, background: '#1a1a24',
    border: '1px solid #2a2a3a', borderRadius: 10, padding: 14,
    display: 'flex', flexDirection: 'column', gap: 8, zIndex: 100, width: 180 },
  popLabel:   { color: '#6b6b8a', fontSize: 11, letterSpacing: 1 },
  popInput:   { background: '#0a0a0f', border: '1px solid #2a2a3a', color: '#e8e8f0',
    padding: '8px', borderRadius: 6, fontSize: 13 },
  popBtn:     { background: '#7c5cfc', color: 'white', border: 'none', padding: '8px',
    borderRadius: 6, fontWeight: 700, cursor: 'pointer' }
}

const s = {
  layout:    { display:'flex', height:'100vh', background:'#0a0a0f', fontFamily:'Arial,sans-serif' },
  sidebar:   { width:240, background:'#111118', borderRight:'1px solid #2a2a3a', padding:16, display:'flex', flexDirection:'column', gap:8 },
  sideTitle: { color:'#7c5cfc', fontSize:22, fontWeight:800, marginBottom:12 },
 
  sideLabel: { color:'#6b6b8a', fontSize:11, letterSpacing:2, textTransform:'uppercase', marginTop:12 },
  sideInput: { background:'#1a1a24', border:'1px solid #2a2a3a', color:'#e8e8f0', padding:'8px 12px', borderRadius:6, fontSize:12 },
  sideBtn:   { background:'#7c5cfc', color:'white', border:'none', padding:'8px', borderRadius:6, cursor:'pointer', fontWeight:700 },
  onlineUser:{ display:'flex', alignItems:'center', gap:8, color:'#e8e8f0', fontSize:13 },
  greenDot:  { width:8, height:8, borderRadius:'50%', background:'#25d0a1', display:'inline-block' },
  chatArea:  { flex:1, display:'flex', flexDirection:'column' },
  chatHeader:{ padding:'16px 24px', borderBottom:'1px solid #2a2a3a', color:'#e8e8f0', fontWeight:700, background:'#111118' },
  messages:  { flex:1, overflowY:'auto', padding:24, display:'flex', flexDirection:'column', gap:8 },
  msgRow:    { display:'flex' },
  bubble:    { maxWidth:'60%', padding:'10px 14px', borderRadius:12, color:'#e8e8f0', fontSize:14 },
  senderName:{ fontSize:11, color:'#25d0a1', fontWeight:700, marginBottom:4 },
  time:      { fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:4, textAlign:'right' },
  typingIndicator: { color:'#6b6b8a', fontSize:13, fontStyle:'italic', padding:'0 4px' },
  inputRow:  { display:'flex', gap:8, padding:16, borderTop:'1px solid #2a2a3a', background:'#111118' },
  msgInput:  { flex:1, background:'#1a1a24', border:'1px solid #2a2a3a', color:'#e8e8f0', padding:'12px 16px', borderRadius:8, fontSize:14, outline:'none' },
  sendBtn:   { background:'#7c5cfc', color:'white', border:'none', padding:'12px 24px', borderRadius:8, fontWeight:700, cursor:'pointer' },
}
// Add to styles in Chat.jsx
const hdrBtn    = { background:'none', border:'none', color:'#6b6b8a', cursor:'pointer', fontSize:18 }
const replyBar  = { display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'8px 16px', background:'rgba(124,92,252,0.1)',
                    borderTop:'1px solid #2a2a3a', color:'#a0a0c0', fontSize:13 }
const cancelBtn = { background:'none', border:'none', color:'#6b6b8a', cursor:'pointer', fontSize:14 }
const uploadBtn = { background:'none', border:'none', color:'#6b6b8a', cursor:'pointer',
                    fontSize:20, padding:'0 8px' }
