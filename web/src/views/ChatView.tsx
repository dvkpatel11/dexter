import { useRef, useState } from 'react'
import { streamAgent } from '../api/client'

interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
}

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const send = () => {
    const query = input.trim()
    if (!query || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: query }])
    setLoading(true)

    let assistantText = ''

    const controller = streamAgent(query, (event, data) => {
      if (event === 'tool_start') {
        setMessages(prev => [...prev, { role: 'tool', content: `Using ${data.tool}...` }])
      } else if (event === 'tool_end') {
        setMessages(prev => {
          const updated = [...prev]
          const lastTool = updated.findLastIndex(m => m.role === 'tool')
          if (lastTool >= 0) {
            updated[lastTool] = { role: 'tool', content: `${data.tool} (${data.duration}ms)` }
          }
          return updated
        })
      } else if (event === 'done') {
        assistantText = data.answer ?? assistantText
        setMessages(prev => [...prev, { role: 'assistant', content: assistantText }])
        setLoading(false)
      } else if (event === 'result') {
        if (!assistantText) {
          assistantText = data.answer ?? ''
          setMessages(prev => [...prev, { role: 'assistant', content: assistantText }])
        }
        setLoading(false)
      } else if (event === 'error') {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }])
        setLoading(false)
      }
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 'dashboard')

    abortRef.current = controller
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <h3>Dexter</h3>
            <p>Ask anything about your portfolio, markets, or investment ideas.</p>
            <p style={{ marginTop: 12, fontSize: 12 }}>
              Try: "Run a DCF on AAPL" or "How does my portfolio look?" or "Should I buy SHOP?"
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="chat-message tool">Thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-bar">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask Dexter..."
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
