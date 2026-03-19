// client/src/components/MessageBubble.jsx
import { useState } from 'react'
import socket from '../socket'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

export default function MessageBubble({ msg, currentUserId, onReply }) {
  const [showReactions, setShowReactions] = useState(false)
  const isMe = msg.sender._id === currentUserId

  const react = (emoji) => {
    socket.emit('add_reaction', { messageId: msg._id, emoji })
    setShowReactions(false)
  }

  // Group reactions by emoji
  const grouped = msg.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {}) || {}

  return (
    <div style={{ display:'flex', justifyContent: isMe ? 'flex-end' : 'flex-start',
                  marginBottom:4, position:'relative' }}>

      <div style={{ maxWidth:'62%' }}>

        {/* Reply preview */}
        {msg.replyTo && (
          <div style={s.replyPreview}>
            ↩ {msg.replyTo.text?.slice(0, 50) || 'Attachment'}
          </div>
        )}

        {/* Main bubble */}
        <div
          style={{ ...s.bubble, background: isMe ? '#7c5cfc' : '#1a1a24' }}
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}
        >
          {!isMe && <div style={s.senderName}>{msg.sender.username}</div>}

          {/* Image attachment */}
          {msg.fileUrl && msg.fileType === 'image' && (
            <img src={msg.fileUrl} alt='attachment'
              style={{ maxWidth:'100%', borderRadius:8, marginBottom:6 }} />
          )}

          {/* File attachment */}
          {msg.fileUrl && msg.fileType === 'file' && (
            <a href={msg.fileUrl} target='_blank' rel='noreferrer' style={s.fileLink}>
              📎 Download file
            </a>
          )}

          {msg.text && <div style={s.text}>{msg.text}</div>}

          <div style={s.footer}>
            <span style={s.time}>
              {new Date(msg.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
            </span>
            {/* Read receipt — only show on my messages */}
            {isMe && (
              <span style={s.readReceipt}>
                {msg.readBy?.length > 0 ? '✓✓' : '✓'}
              </span>
            )}
          </div>

          {/* Hover actions */}
          {showReactions && (
            <div style={{ ...s.hoverActions, [isMe ? 'right' : 'left']: '100%' }}>
              <button style={s.actionBtn} onClick={() => setShowReactions(v => !v)}>😊</button>
              <button style={s.actionBtn} onClick={() => onReply && onReply(msg)}>↩</button>
            </div>
          )}
        </div>

        {/* Reaction picker */}
        {showReactions && (
          <div style={s.emojiPicker}
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
          >
            {EMOJIS.map(e => (
              <button key={e} style={s.emojiBtn} onClick={() => react(e)}>{e}</button>
            ))}
          </div>
        )}

        {/* Reaction counts */}
        {Object.keys(grouped).length > 0 && (
          <div style={s.reactions}>
            {Object.entries(grouped).map(([emoji, count]) => (
              <span key={emoji} style={s.reactionPill} onClick={() => react(emoji)}>
                {emoji} {count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  bubble:       { padding:'10px 14px', borderRadius:12, color:'#e8e8f0', fontSize:14,
                  position:'relative', cursor:'default' },
  senderName:   { fontSize:11, color:'#25d0a1', fontWeight:700, marginBottom:4 },
  text:         { lineHeight:1.5 },
  footer:       { display:'flex', alignItems:'center', gap:6, marginTop:4, justifyContent:'flex-end' },
  time:         { fontSize:10, color:'rgba(255,255,255,0.4)' },
  readReceipt:  { fontSize:11, color:'#25d0a1' },
  fileLink:     { color:'#25d0a1', fontSize:13, display:'block', marginBottom:4 },
  replyPreview: { background:'rgba(124,92,252,0.2)', borderLeft:'3px solid #7c5cfc',
                  padding:'4px 8px', borderRadius:4, fontSize:11, color:'#a0a0c0',
                  marginBottom:4, maxWidth:'100%', overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap' },
  hoverActions: { position:'absolute', top:-32, display:'flex', gap:4,
                  background:'#1a1a24', border:'1px solid #2a2a3a',
                  borderRadius:8, padding:'2px 6px' },
  actionBtn:    { background:'none', border:'none', cursor:'pointer', fontSize:14, padding:2 },
  emojiPicker:  { display:'flex', gap:4, background:'#1a1a24', border:'1px solid #2a2a3a',
                  borderRadius:10, padding:'6px 10px', marginTop:4 },
  emojiBtn:     { background:'none', border:'none', cursor:'pointer', fontSize:18, padding:2 },
  reactions:    { display:'flex', flexWrap:'wrap', gap:4, marginTop:4 },
  reactionPill: { background:'#1a1a24', border:'1px solid #2a2a3a', borderRadius:100,
                  padding:'2px 8px', fontSize:12, cursor:'pointer', color:'#e8e8f0' },
}
