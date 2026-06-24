import React, { useEffect, useState, useRef } from 'react'
import toast from 'react-hot-toast'
import api from '../api'

const fmt = d => d ? new Date(d).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : ''

export default function WhatsApp() {
  const [convs, setConvs] = useState([])
  const [active, setActive] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const msgsRef = useRef(null)

  useEffect(() => {
    api.get('/whatsapp/conversations').then(setConvs).catch(console.error)
  }, [])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [msgs])

  const openConv = async (c) => {
    setActive(c)
    const m = await api.get(`/whatsapp/messages/${c.id}`)
    setMsgs(Array.isArray(m) ? m : [])
  }

  const send = async () => {
    if (!text.trim() || !active) return
    try {
      await api.post('/whatsapp/send', { contact_id: active.id, message: text })
      setText('')
      const m = await api.get(`/whatsapp/messages/${active.id}`)
      setMsgs(Array.isArray(m) ? m : [])
    } catch (e) { toast.error('Send failed — check WhatsApp credentials') }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">WhatsApp</h1>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex" style={{ height: 'calc(100vh - 160px)' }}>
        {/* Conversation list */}
        <div className="w-72 border-r border-slate-100 flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversations ({convs.length})</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convs.length === 0 && <p className="text-slate-400 text-sm text-center py-10">No conversations yet</p>}
            {convs.map(c => (
              <div key={c.id} onClick={() => openConv(c)}
                className={`px-4 py-3 cursor-pointer border-b border-slate-50 hover:bg-indigo-50 transition-colors ${active?.id === c.id ? 'bg-indigo-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {(c.first_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{c.first_name} {c.last_name || ''}</p>
                    <p className="text-xs text-slate-400 truncate">{c.last_message || 'No messages'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat window */}
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center"><p className="text-4xl mb-3">💬</p><p>Select a conversation</p></div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
                {(active.first_name || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{active.first_name} {active.last_name || ''}</p>
                <p className="text-xs text-slate-400">{active.whatsapp_id || active.phone || '—'}</p>
              </div>
            </div>

            <div ref={msgsRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-slate-50">
              {msgs.length === 0 && <p className="text-slate-400 text-sm text-center py-10">No messages yet</p>}
              {msgs.map(m => (
                <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm ${
                    m.direction === 'outbound'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                  }`}>
                    <p>{m.body}</p>
                    <p className={`text-xs mt-1 ${m.direction === 'outbound' ? 'text-indigo-200' : 'text-slate-400'}`}>{fmt(m.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 flex gap-2">
              <input value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Type a message…"
                className="flex-1 px-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-indigo-400" />
              <button onClick={send} className="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700">Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
