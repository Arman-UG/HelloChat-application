// client/src/pages/ServerView.jsx
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import socket from '../socket'

const API = 'http://localhost:5000/api'

export default function ServerView({ user, token, server, onBack }) {
  const [channels,       setChannels]       = useState([])
  const [activeChannel,  setActiveChannel]  = useState(null)
  const [messages,       setMessages]       = useState([])
  const [text,           setText]           = useState('')
  const [members,        setMembers]        = useState([])
  const [newChannel,     setNewChannel]     = useState('')
  const [showInvite,     setShowInvite]     = useState(false)
  const [inviteCode,     setInviteCode]     = useState('')
  const bottomRef = useRef(null)

  // Load channels on mount
  useEffect(() => {
    loadChannels()
    setMembers(server.members || [])
  }, [server])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Socket: listen for channel messages
  useEffect(() => {
    socket.on('receive_channel_message', (msg) => {
      setMessages(prev => [...prev, msg])
    })
    return () => socket.off('receive_channel_message')
  }, [])

  const loadChannels = async () => {
    const { data } = await axios.get(
      `${API}/servers/${server._id}/channels`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    setChannels(data)
    if (data.length > 0) selectChannel(data[0])
  }

  const selectChannel = async (channel) => {
    setActiveChannel(channel)
    socket.emit('join_channel', channel._id)
    const { data } = await axios.get(
      `${API}/servers/channel/${channel._id}/messages`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    setMessages(data)
  }

  const sendMessage = () => {
    if (!text.trim() || !activeChannel) return
    socket.emit('send_channel_message', {
      channelId: activeChannel._id,
      text
    })
    setText('')
  }

  const createChannel = async () => {
    if (!newChannel.trim()) return
    await axios.post(
      `${API}/servers/${server._id}/channels`,
      { name: newChannel },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    setNewChannel('')
    loadChannels()
  }

  const getInviteCode = async () => {
    try {
      const { data } = await axios.get(
        `${API}/servers/${server._id}/invite`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setInviteCode(data.inviteCode)
      setShowInvite(true)
    } catch {
      alert('Only owner or admin can get invite link')
    }
  }

  const myRole = server.members?.find(
    m => (m.user._id || m.user) === user.id
  )?.role

  return (
    <div style={s.layout}>

      {/* Channel sidebar */}
      <div style={s.channelBar}>
        <div style={s.serverName}>{server.name}</div>
        <button style={s.backBtn} onClick={onBack}>← Servers</button>

        <div style={s.sectionLabel}>Channels</div>
        {channels.map(ch => (
          <div key={ch._id}
            style={{ ...s.channelItem,
              background: activeChannel?._id === ch._id ? '#2a2a3a' : 'transparent'
            }}
            onClick={() => selectChannel(ch)}
          >
            # {ch.name}
          </div>
        ))}

        {/* Create channel — owner/admin only */}
        {(myRole === 'owner' || myRole === 'admin') && (
          <div style={s.createChannel}>
            <input style={s.channelInput} placeholder='new-channel'
              value={newChannel} onChange={e => setNewChannel(e.target.value)} />
            <button style={s.createBtn} onClick={createChannel}>+</button>
          </div>
        )}

        {/* Invite button — owner/admin only */}
        {(myRole === 'owner' || myRole === 'admin') && (
          <button style={s.inviteBtn} onClick={getInviteCode}>
            Invite Link
          </button>
        )}

        {showInvite && (
          <div style={s.inviteBox}>
            <div style={s.inviteLabel}>Share this code:</div>
            <div style={s.inviteCode}>{inviteCode}</div>
            <button style={s.copyBtn}
              onClick={() => { navigator.clipboard.writeText(inviteCode); alert('Copied!') }}
            >Copy</button>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div style={s.chatArea}>
        <div style={s.chatHeader}>
          {activeChannel ? `# ${activeChannel.name}` : 'Select a channel'}
        </div>

        <div style={s.messages}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              ...s.msgRow,
              justifyContent: msg.sender._id === user.id ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                ...s.bubble,
                background: msg.sender._id === user.id ? '#7c5cfc' : '#1a1a24'
              }}>
                {msg.sender._id !== user.id && (
                  <div style={s.senderName}>{msg.sender.username}</div>
                )}
                <div>{msg.text}</div>
                <div style={s.time}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div style={s.inputRow}>
          <input style={s.msgInput}
            placeholder={activeChannel ? `Message #${activeChannel.name}` : 'Select a channel first'}
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            disabled={!activeChannel} />
          <button style={s.sendBtn} onClick={sendMessage} disabled={!activeChannel}>Send</button>
        </div>
      </div>

      {/* Members sidebar */}
      <div style={s.memberBar}>
        <div style={s.sectionLabel}>Members ({members.length})</div>
        {members.map((m, i) => (
          <div key={i} style={s.memberItem}>
            <span style={s.greenDot}></span>
            <div>
              <div style={s.memberName}>{m.user?.username || 'Unknown'}</div>
              <div style={s.memberRole}>{m.role}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

const s = {
  layout:      { display:'flex', height:'100vh', background:'#0a0a0f', fontFamily:'Arial,sans-serif' },
  channelBar:  { width:220, background:'#111118', borderRight:'1px solid #2a2a3a', padding:16,
                 display:'flex', flexDirection:'column', gap:6, overflowY:'auto' },
  serverName:  { color:'#e8e8f0', fontSize:16, fontWeight:800, marginBottom:4 },
  backBtn:     { background:'transparent', border:'1px solid #2a2a3a', color:'#6b6b8a',
                 padding:'4px 8px', borderRadius:6, cursor:'pointer', fontSize:12, marginBottom:8 },
  sectionLabel:{ color:'#6b6b8a', fontSize:11, letterSpacing:2, textTransform:'uppercase', margin:'12px 0 4px' },
  channelItem: { color:'#a0a0c0', fontSize:14, padding:'6px 8px', borderRadius:6, cursor:'pointer' },
  createChannel:{ display:'flex', gap:4, marginTop:8 },
  channelInput:{ flex:1, background:'#1a1a24', border:'1px solid #2a2a3a', color:'#e8e8f0',
                 padding:'6px 8px', borderRadius:6, fontSize:12 },
  createBtn:   { background:'#7c5cfc', color:'white', border:'none', borderRadius:6,
                 width:28, cursor:'pointer', fontWeight:800 },
  inviteBtn:   { background:'transparent', border:'1px solid #7c5cfc', color:'#7c5cfc',
                 padding:'6px', borderRadius:6, cursor:'pointer', fontSize:12, marginTop:8 },
  inviteBox:   { background:'#1a1a24', border:'1px solid #2a2a3a', borderRadius:8, padding:12, marginTop:8 },
  inviteLabel: { color:'#6b6b8a', fontSize:11, marginBottom:4 },
  inviteCode:  { color:'#25d0a1', fontSize:13, fontWeight:700, wordBreak:'break-all', marginBottom:6 },
  copyBtn:     { background:'#25d0a1', color:'#0a0a0f', border:'none', borderRadius:4,
                 padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:700 },
  chatArea:    { flex:1, display:'flex', flexDirection:'column' },
  chatHeader:  { padding:'16px 24px', borderBottom:'1px solid #2a2a3a', color:'#e8e8f0',
                 fontWeight:700, background:'#111118' },
  messages:    { flex:1, overflowY:'auto', padding:24, display:'flex', flexDirection:'column', gap:8 },
  msgRow:      { display:'flex' },
  bubble:      { maxWidth:'60%', padding:'10px 14px', borderRadius:12, color:'#e8e8f0', fontSize:14 },
  senderName:  { fontSize:11, color:'#25d0a1', fontWeight:700, marginBottom:4 },
  time:        { fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:4, textAlign:'right' },
  inputRow:    { display:'flex', gap:8, padding:16, borderTop:'1px solid #2a2a3a', background:'#111118' },
  msgInput:    { flex:1, background:'#1a1a24', border:'1px solid #2a2a3a', color:'#e8e8f0',
                 padding:'12px 16px', borderRadius:8, fontSize:14, outline:'none' },
  sendBtn:     { background:'#7c5cfc', color:'white', border:'none', padding:'12px 24px',
                 borderRadius:8, fontWeight:700, cursor:'pointer' },
  memberBar:   { width:200, background:'#111118', borderLeft:'1px solid #2a2a3a',
                 padding:16, overflowY:'auto' },
  memberItem:  { display:'flex', alignItems:'center', gap:8, marginBottom:10 },
  greenDot:    { width:8, height:8, borderRadius:'50%', background:'#25d0a1',
                 display:'inline-block', flexShrink:0 },
  memberName:  { color:'#e8e8f0', fontSize:13 },
  memberRole:  { color:'#6b6b8a', fontSize:11 },
}
