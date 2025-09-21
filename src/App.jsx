import React, { useEffect, useMemo, useRef, useState } from 'react'
import { api, setToken } from './lib/api.js'
import { createSocket } from './lib/socket.js'
import TextareaAutosize from 'react-textarea-autosize'
import { PaperAirplaneIcon, PaperClipIcon, PhotoIcon, VideoCameraIcon, FaceSmileIcon, MagnifyingGlassIcon, PlusIcon, PhoneIcon, EllipsisHorizontalIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, MicrophoneIcon, ComputerDesktopIcon, Cog6ToothIcon, UserGroupIcon, BellSlashIcon, ArchiveBoxIcon, PencilIcon, TrashIcon, ArrowRightOnRectangleIcon, BookmarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const me = { id: 'me', name: 'You', avatar: 'https://i.pravatar.cc/100?img=15' }

const mockConversations = [
  {
    id: 'c1',
    type: 'group',
    name: 'Product Team',
    avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=PT',
    members: [
      me,
      { id: 'u1', name: 'Ava', avatar: 'https://i.pravatar.cc/100?img=1' },
      { id: 'u2', name: 'Noah', avatar: 'https://i.pravatar.cc/100?img=5' },
      { id: 'u3', name: 'Liam', avatar: 'https://i.pravatar.cc/100?img=7' },
    ],
    messages: [
      { id: 'm1', sender: 'u1', type: 'text', text: 'Morning team! Here’s the latest design drop.', ts: Date.now() - 1000 * 60 * 60 * 24 },
      { id: 'm2', sender: 'u1', type: 'image', images: ['https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=800&auto=format&fit=crop'], ts: Date.now() - 1000 * 60 * 60 * 24 + 1000 },
      { id: 'm3', sender: 'u2', type: 'text', text: 'Looks great! I’ll prep the PR.', ts: Date.now() - 1000 * 60 * 60 * 23 },
      { id: 'm4', sender: 'me', type: 'file', file: { name: 'specs.pdf', size: 256000, type: 'application/pdf', url: 'https://example.com/specs.pdf' }, ts: Date.now() - 1000 * 60 * 60 * 22 },
      { id: 'm5', sender: 'u3', type: 'video', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', ts: Date.now() - 1000 * 60 * 10 },
    ],
  },
  {
    id: 'c2',
    type: 'dm',
    name: 'Ava',
    avatar: 'https://i.pravatar.cc/100?img=1',
    members: [me, { id: 'u1', name: 'Ava', avatar: 'https://i.pravatar.cc/100?img=1' }],
    messages: [
      { id: 'm6', sender: 'u1', type: 'text', text: 'Hey! Ready for the demo?', ts: Date.now() - 1000 * 60 * 60 * 2 },
      { id: 'm7', sender: 'me', type: 'text', text: 'Yep, loading the dataset now.', ts: Date.now() - 1000 * 60 * 60 * 2 + 60000 },
      { id: 'm8', sender: 'u1', type: 'image', images: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop'], ts: Date.now() - 1000 * 60 * 60 },
    ],
  },
  {
    id: 'c3',
    type: 'dm',
    name: 'Noah',
    avatar: 'https://i.pravatar.cc/100?img=5',
    members: [me, { id: 'u2', name: 'Noah', avatar: 'https://i.pravatar.cc/100?img=5' }],
    messages: [
      { id: 'm9', sender: 'u2', type: 'text', text: 'Can you review my slides?', ts: Date.now() - 1000 * 60 * 30 },
    ],
  },
]

function useMockData() {
  const [conversations, setConversations] = useState(mockConversations)
  const [selectedId, setSelectedId] = useState(conversations[0]?.id)

  const selected = useMemo(() => conversations.find(c => c.id === selectedId), [conversations, selectedId])

  const sendMessage = (conversationId, msg) => {
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c))
  }

  const addConversation = (convo) => {
    setConversations(prev => [convo, ...prev])
  }

  return { conversations, selectedId, setSelectedId, selected, sendMessage, addConversation }
}

const Sidebar = React.forwardRef(function Sidebar({ conversations, selectedId, onSelect, onNewChat, searchRef, theme, onToggleTheme }, ref) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const filtered = conversations.filter(c =>
    (filter === 'all' || c.type === filter) && c.name.toLowerCase().includes(query.toLowerCase())
  )

  const lastMessageText = (c) => {
    const m = c.messages[c.messages.length - 1]
    if (!m) return ''
    if (m.type === 'text') return m.text
    if (m.type === 'image') return 'Sent a photo'
    if (m.type === 'video') return 'Sent a video'
    if (m.type === 'file') return `Sent ${m.file?.name || 'a file'}`
    return ''
  }

  const handleKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const list = filtered
      if (!list.length) return
      const cur = Math.max(0, list.findIndex(c => c.id === selectedId))
      let nextIdx = cur
      if (e.key === 'ArrowDown') nextIdx = (cur + 1) % list.length
      if (e.key === 'ArrowUp') nextIdx = (cur - 1 + list.length) % list.length
      if (e.key === 'Home') nextIdx = 0
      if (e.key === 'End') nextIdx = list.length - 1
      onSelect(list[nextIdx].id)
    }
  }

  return (
    <div
      ref={ref}
      tabIndex={0}
      onKeyDown={handleKey}
      className="h-full w-80 shrink-0 border-r border-[var(--border)] flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div className="p-4 flex items-center gap-2 border-b border-[var(--border)]">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-zinc-400" />
          <input
            ref={searchRef}
            className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-xl pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onToggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <SunIcon className="w-5 h-5" />
          ) : (
            <MoonIcon className="w-5 h-5" />
          )}
        </button>

        <button className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700" title="New chat" onClick={() => onNewChat?.()}>
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-2 flex gap-2 text-sm">
        {['all', 'dm', 'group'].map(t => (
          <button key={t} onClick={() => setFilter(t)} className={classNames(
            'px-3 py-1 rounded-full',
            filter === t ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-900'
          )}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto thin-scrollbar">
        {filtered.map(c => (
          <button key={c.id} onClick={() => onSelect(c.id)} className={classNames(
            'w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70',
            selectedId === c.id && 'bg-zinc-100 dark:bg-zinc-900'
          )}>
            <img src={c.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-xs text-zinc-400">{formatTime(c.messages[c.messages.length-1]?.ts || Date.now())}</div>
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{lastMessageText(c)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
})

function ChatHeader({ convo, onStartCall, onFocusSearch, onOpenMembers, onBack }) {
  const [openMenu, setOpenMenu] = useState(false)
  const menuRef = useRef(null)
  const btnRef = useRef(null)
  const others = convo.members.filter(m => m.id !== me.id)
  const subtitle = convo.type === 'group' ? `${convo.members.length} members` : `${others[0]?.name} • Online`

  useEffect(() => {
    if (!openMenu) return
    const onClick = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target) && !btnRef.current?.contains(e.target)) setOpenMenu(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpenMenu(false) }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [openMenu])

  return (
    <div className="h-16 border-b border-[var(--border)] flex items-center justify-between px-2 md:px-4 relative">
      <div className="flex items-center gap-2 md:gap-3">
        {onBack && (
          <button className="md:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={onBack} aria-label="Back">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
        )}
        <img src={convo.avatar} className="w-10 h-10 rounded-full object-cover" />
        <div>
          <div className="font-semibold">{convo.name}</div>
          <div className="text-xs text-zinc-500">{subtitle}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        <button
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
          title={convo.type === 'group' ? 'View members' : 'View participant'}
          onClick={() => onOpenMembers?.()}
        >
          <UserGroupIcon className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900" title="Search in chat" onClick={() => onFocusSearch?.()}><MagnifyingGlassIcon className="w-5 h-5" /></button>
        <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900" title="Call" onClick={onStartCall}><PhoneIcon className="w-5 h-5" /></button>
        <button ref={btnRef} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900" title="More" onClick={() => setOpenMenu(v => !v)}><EllipsisHorizontalIcon className="w-6 h-6" /></button>
        {openMenu && (
          <div ref={menuRef} className="absolute right-2 top-14 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden">
            <div className="py-1 text-sm">
              <button className="w-full px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => { setOpenMenu(false); onOpenMembers?.() }}><UserGroupIcon className="w-4 h-4"/> <span className="truncate">View members</span></button>
              <button className="w-full px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setOpenMenu(false)}><BellSlashIcon className="w-4 h-4"/> <span className="truncate">Mute notifications</span></button>
              <button className="w-full px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => { setOpenMenu(false); onFocusSearch?.() }}><MagnifyingGlassIcon className="w-4 h-4"/> <span className="truncate">Search in conversation</span></button>
            </div>
            <div className="py-1 text-sm border-t border-[var(--border)]">
              <button className="w-full px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setOpenMenu(false)}><BookmarkIcon className="w-4 h-4"/> <span className="truncate">Pin conversation</span></button>
              <button className="w-full px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setOpenMenu(false)}><ArchiveBoxIcon className="w-4 h-4"/> <span className="truncate">Archive</span></button>
            </div>
            <div className="py-1 text-sm border-t border-[var(--border)]">
              {convo.type === 'group' ? (
                <button className="w-full px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setOpenMenu(false)}><ArrowRightOnRectangleIcon className="w-4 h-4"/> <span className="truncate">Leave group</span></button>
              ) : (
                <button className="w-full px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setOpenMenu(false)}><TrashIcon className="w-4 h-4"/> <span className="truncate">Delete chat</span></button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AddContactModal({ open, onClose, onAdd }) {
  const [tab, setTab] = useState('scan') // 'scan' | 'invite'
  const [error, setError] = useState('')
  const [detectedText, setDetectedText] = useState('')
  const [scanning, setScanning] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const detectorRef = useRef(null)

  useEffect(() => {
    if (!open) return
    // Prepare invite link for sharing
    const token = Math.random().toString(36).slice(2, 10)
    const origin = window.location.origin
    setInviteLink(`${origin}/?invite=${token}`)
  }, [open])

  // Stop camera/loop
  const stopScan = () => {
    setScanning(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  useEffect(() => {
    if (!open || tab !== 'scan') return
    let cancelled = false
    setError('')
    setDetectedText('')

    const setup = async () => {
      try {
        // Feature detection
        if ('BarcodeDetector' in window) {
          const BD = window.BarcodeDetector
          detectorRef.current = new BD({ formats: ['qr_code'] })
        } else {
          setError('QR scanning not supported on this browser. Try uploading an image or use the invite link tab.')
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) return
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setScanning(true)

        const loop = async () => {
          if (!videoRef.current || !detectorRef.current) return
          try {
            const codes = await detectorRef.current.detect(videoRef.current)
            const code = codes?.[0]
            if (code?.rawValue) {
              setDetectedText(code.rawValue)
              // Auto-stop on first detection
              stopScan()
            }
          } catch (e) {
            // ignore per-frame errors
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      } catch (e) {
        setError(e.message || 'Unable to access camera')
      }
    }
    setup()
    return () => { cancelled = true; stopScan() }
  }, [open, tab])

  const parseContactFromText = (text) => {
    try {
      // Prefer URLs with query params: ?name=...&id=...
      let url
      try { url = new URL(text) } catch (_) { /* not a URL */ }
      if (url) {
        const name = url.searchParams.get('name') || undefined
        const id = url.searchParams.get('id') || undefined
        const avatar = url.searchParams.get('avatar') || undefined
        const invite = url.searchParams.get('invite') || undefined
        if (name || id) {
          return { id: id || ('qr_' + Math.random().toString(36).slice(2, 8)), name: name || 'New Contact', avatar: avatar || `https://i.pravatar.cc/100?u=${id || name || invite}` }
        }
        if (invite) {
          return { id: 'qr_' + invite, name: 'New Contact', avatar: `https://i.pravatar.cc/100?u=${invite}` }
        }
      }
      // Fallback: treat raw text as a handle
      const trimmed = String(text).trim()
      if (trimmed) {
        return { id: 'qr_' + Math.random().toString(36).slice(2, 8), name: trimmed.slice(0, 24), avatar: `https://i.pravatar.cc/100?u=${encodeURIComponent(trimmed)}` }
      }
    } catch (_) {}
    return null
  }

  const handleConfirmDetected = () => {
    const c = parseContactFromText(detectedText)
    if (!c) { setError('Could not parse QR code.'); return }
    onAdd?.(c)
  }

  const onUploadImage = async (file) => {
    setError('')
    setDetectedText('')
    if (!('BarcodeDetector' in window)) { setError('QR scanning not supported on this browser.'); return }
    try {
      const imgBitmap = await createImageBitmap(file)
      const BD = window.BarcodeDetector
      const detector = new BD({ formats: ['qr_code'] })
      const codes = await detector.detect(imgBitmap)
      const code = codes?.[0]
      if (code?.rawValue) setDetectedText(code.rawValue)
      else setError('No QR code found in image.')
    } catch (e) {
      setError(e.message || 'Failed to process image')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--border)]">
          <div className="font-semibold">Add contact</div>
          <div className="flex items-center gap-1 text-sm">
            <button className={(tab === 'scan' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-900') + ' px-3 py-1 rounded-full'} onClick={() => setTab('scan')}>Scan QR</button>
            <button className={(tab === 'invite' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-900') + ' px-3 py-1 rounded-full'} onClick={() => setTab('invite')}>Invite link</button>
          </div>
          <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={onClose} aria-label="Close add contact">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {tab === 'scan' ? (
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <div className="rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 aspect-video relative grid place-items-center">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                {!scanning && !detectedText && (
                  <div className="absolute inset-0 grid place-items-center text-zinc-500 text-sm px-4 text-center">{error || 'Initializing camera… If prompted, allow camera access.'}</div>
                )}
                {detectedText && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40 text-white p-4 text-center">
                    <div className="space-y-2">
                      <div className="text-sm text-white/80">QR detected</div>
                      <div className="text-xs break-all max-w-sm mx-auto">{detectedText}</div>
                      <div className="flex gap-2 justify-center">
                        <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20" onClick={() => { setDetectedText(''); if (!streamRef.current) setTab('scan') }}>Scan again</button>
                        <button className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500" onClick={handleConfirmDetected}>Add contact</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="text-sm text-zinc-600 dark:text-zinc-300">No camera? Upload a QR image or paste an invite link/code.</div>
                <label className="block">
                  <span className="text-sm">Upload QR image</span>
                  <input type="file" accept="image/*" className="mt-1 block w-full text-sm" onChange={(e) => e.target.files?.[0] && onUploadImage(e.target.files[0])} />
                </label>
                <label className="block">
                  <span className="text-sm">Paste invite text/link</span>
                  <input type="text" className="mt-1 w-full bg-zinc-100 dark:bg-zinc-900 rounded-lg px-3 py-2 outline-none focus:ring-2 ring-indigo-500" placeholder="Paste here" value={detectedText} onChange={(e) => setDetectedText(e.target.value)} />
                </label>
                <div className="flex justify-end">
                  <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50" disabled={!detectedText} onClick={handleConfirmDetected}>Add contact</button>
                </div>
                {error && <div className="text-sm text-rose-600">{error}</div>}
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <div className="space-y-3">
                <div className="text-sm">Share this link with your contact via any app. They can open the link or scan the QR to connect.</div>
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 break-all select-all text-sm">{inviteLink}</div>
                <div className="flex gap-2">
                  <button className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800" onClick={async () => { try { await navigator.clipboard.writeText(inviteLink) } catch {} }}>Copy link</button>
                  <button className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800" onClick={async () => { if (navigator.share) { try { await navigator.share({ title: 'Chat invite', url: inviteLink }) } catch {} } }}>
                    Share…
                  </button>
                </div>
                <div className="text-xs text-zinc-500">Tip: Your contact can add you by scanning this QR or opening the link.</div>
              </div>
              <div className="grid place-items-center">
                <img alt="Invite QR" className="w-56 h-56 bg-white rounded-lg p-2 shadow" src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(inviteLink)}`} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800" onClick={() => { stopScan(); onClose?.() }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message, isMe, sender, onOpenGallery }) {
  const bubbleClasses = isMe
    ? 'bg-indigo-600 text-white'
    : 'bg-zinc-100 dark:bg-zinc-900'

  return (
    <div className={classNames('flex gap-3', isMe ? 'justify-end' : 'justify-start')}>
      {!isMe && <img src={sender.avatar} className="w-8 h-8 rounded-full object-cover mt-5" />}
      <div className={classNames('max-w-[70%] rounded-2xl px-4 py-2 shadow-sm', bubbleClasses)}>
        {message.type === 'text' && (
          <div className="whitespace-pre-wrap">{message.text}</div>
        )}
        {message.type === 'image' && (
          <div className="grid grid-cols-2 gap-2">
            {message.images?.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt="Shared image"
                className="rounded-lg w-full h-40 object-cover cursor-zoom-in"
                onClick={() => onOpenGallery?.(message.images || [src], idx)}
              />
            ))}
          </div>
        )}
        {message.type === 'video' && (
          <video className="rounded-lg w-72 max-w-full" controls src={message.videoUrl} />
        )}
        {message.type === 'file' && (
          <a
            href={message.file?.url || '#'} 
            download={message.file?.name || true}
            className="flex items-center gap-3"
            rel="noreferrer"
          >
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center ring-1 ring-inset ring-white/20">
              <PaperClipIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium">{message.file?.name}</div>
              <div className="text-xs opacity-70">{Math.round((message.file?.size || 0)/1024)} KB</div>
            </div>
          </a>
        )}
        <div className={classNames('mt-1 flex items-center gap-1 text-xs', isMe ? 'text-white/80' : 'text-zinc-500')}>
          <span>{formatTime(message.ts)}</span>
          {isMe && <CheckIcon className="w-4 h-4" />}
        </div>
      </div>
    </div>
  )
}

function GalleryModal({ open, items, index, onClose, onPrev, onNext }) {
  const imgRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = originalOverflow
    }
  }, [open, onClose, onPrev, onNext])

  if (!open) return null
  const src = items[index]
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="Close">
        <XMarkIcon className="w-6 h-6" />
      </button>
      <button className="absolute left-4 md:left-8 p-2 rounded-full bg-white/10 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onPrev() }} aria-label="Previous">
        <ChevronLeftIcon className="w-7 h-7" />
      </button>
      <img ref={imgRef} src={src} alt="Gallery item" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
      <button className="absolute right-4 md:right-8 p-2 rounded-full bg-white/10 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onNext() }} aria-label="Next">
        <ChevronRightIcon className="w-7 h-7" />
      </button>
      <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm">
        {index + 1} / {items.length}
      </div>
    </div>
  )
}

function CallOverlay({ open, convo, onClose }) {
  const [muted, setMuted] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [stage, setStage] = useState('connecting') // connecting | connected | ended

  useEffect(() => {
    if (!open) return
    setStage('connecting')
    const t = setTimeout(() => setStage('connected'), 1200)
    return () => clearTimeout(t)
  }, [open])

  if (!open) return null

  const participants = [
    { id: 'me', name: 'You', avatar: me.avatar, speaking: !muted },
    ...convo.members.filter(m => m.id !== me.id).slice(0, 3).map((m, i) => ({ id: m.id, name: m.name, avatar: m.avatar, speaking: i % 2 === 0 }))
  ]

  return (
    <div className="fixed inset-0 z-50 bg-zinc-900/95 text-zinc-50">
      <div className="absolute inset-0 flex flex-col">
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
          <div className="font-medium">{convo.name} — {stage === 'connecting' ? 'Connecting…' : 'In call'}</div>
          <button className="p-2 rounded-lg hover:bg-white/10" onClick={onClose}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 p-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(2, participants.length)}, minmax(0, 1fr))` }}>
          {participants.map((p) => (
            <div key={p.id} className="relative rounded-xl overflow-hidden bg-zinc-800 ring-1 ring-white/10">
              {/* Mock video tile */}
              <div className="absolute inset-0 grid place-items-center">
                <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-white/20">
                  <img src={p.avatar} className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <div className="px-2 py-1 rounded-md bg-black/50 text-sm">
                  {p.name}
                </div>
                <div className={"h-2 w-12 rounded-full transition " + (p.speaking ? 'bg-emerald-400' : 'bg-white/30')}>
                </div>
              </div>
              <div className="pb-[56.25%]" />
            </div>
          ))}
        </div>
        <div className="h-20 border-t border-white/10 flex items-center justify-center gap-3">
          <button onClick={() => setMuted(m => !m)} className={"p-3 rounded-full " + (muted ? 'bg-white/10' : 'bg-white/20 hover:bg-white/30')} title={muted ? 'Unmute (M)' : 'Mute (M)'}>
            <MicrophoneIcon className="w-6 h-6" />
          </button>
          <button onClick={() => setCameraOn(c => !c)} className={"p-3 rounded-full " + (!cameraOn ? 'bg-white/10' : 'bg-white/20 hover:bg-white/30')} title={cameraOn ? 'Turn camera off (C)' : 'Turn camera on (C)'}>
            <VideoCameraIcon className="w-6 h-6" />
          </button>
          <button onClick={() => setSharing(s => !s)} className={"p-3 rounded-full " + (sharing ? 'bg-emerald-500/30 hover:bg-emerald-500/40' : 'bg-white/20 hover:bg-white/30')} title={sharing ? 'Stop share (S)' : 'Share screen (S)'}>
            <ComputerDesktopIcon className="w-6 h-6" />
          </button>
          <button className="p-3 rounded-full bg-rose-600 hover:bg-rose-500" onClick={onClose} title="End call (Esc)">
            <PhoneIcon className="w-6 h-6 -rotate-45" />
          </button>
          <button className="p-3 rounded-full bg-white/10 hover:bg-white/20" title="Devices">
            <Cog6ToothIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
      {/* Keyboard shortcuts inside overlay */}
      <CallHotkeys open={open} onClose={onClose} onToggleMic={() => setMuted(m => !m)} onToggleCam={() => setCameraOn(c => !c)} onToggleShare={() => setSharing(s => !s)} />
    </div>
  )
}

function CallHotkeys({ open, onClose, onToggleMic, onToggleCam, onToggleShare }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      const k = e.key.toLowerCase()
      if (k === 'escape') onClose()
      if (k === 'm') onToggleMic()
      if (k === 'c') onToggleCam()
      if (k === 's') onToggleShare()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, onToggleMic, onToggleCam, onToggleShare])
  return null
}

function MembersPanel({ open, convo, onClose, mobile = false }) {
  const panelRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    const onClick = (e) => {
      if (!panelRef.current) return
      if (!panelRef.current.contains(e.target)) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open, onClose])

  if (!open || !convo) return null

  const title = convo.type === 'group' ? `${convo.name} — ${convo.members.length} members` : `${convo.name}`

  return (
    <div className="fixed inset-0 z-40 bg-black/30">
      <aside ref={panelRef} className={"absolute top-0 h-full bg-[var(--surface)] border-[var(--border)] shadow-2xl flex flex-col " + (mobile ? 'left-0 right-0 border-t md:border-l' : 'right-0 w-[360px] max-w-[90vw] border-l')}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--border)]">
          <div className="font-semibold">{title}</div>
          <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={onClose}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-3 space-y-2 overflow-y-auto thin-scrollbar">
          {convo.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <img src={m.avatar} className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1">
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-zinc-500">{m.id === me.id ? 'You' : 'Member'}</div>
              </div>
              {convo.type === 'group' && m.id !== me.id && (
                <button className="px-2 py-1 text-xs rounded-md bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800">Message</button>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

const MessageList = React.forwardRef(function MessageList({ convo, onOpenGallery }, ref) {
  const listRef = useRef(null)
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [convo])

  return (
    <div
      ref={(el) => {
        listRef.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      }}
      tabIndex={0}
      className="flex-1 overflow-y-auto p-4 thin-scrollbar bg-[url('data:image/svg+xml,%3Csvg width=\'120\' height=\'120\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'none\'/%3E%3Ccircle cx=\'60\' cy=\'60\' r=\'0.5\' fill=\'%23e5e7eb\'/%3E%3C/svg%3E')] dark:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      onKeyDown={(e) => {
        const el = listRef.current
        if (!el) return
        if (e.key === 'PageUp') { e.preventDefault(); el.scrollBy({ top: -el.clientHeight, behavior: 'smooth' }) }
        if (e.key === 'PageDown') { e.preventDefault(); el.scrollBy({ top: el.clientHeight, behavior: 'smooth' }) }
        if (e.key === 'Home' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); el.scrollTo({ top: 0, behavior: 'smooth' }) }
        if (e.key === 'End' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }) }
      }}
    >
      {/* Date separators */}
      {convo.messages.map((m, idx) => {
        const sender = convo.members.find(u => u.id === m.sender) || me
        const isMe = sender.id === me.id
        const showDate = idx === 0 || formatDate(m.ts) !== formatDate(convo.messages[idx - 1].ts)
        return (
          <div key={m.id} className="mb-3">
            {showDate && (
              <div className="text-center text-xs text-zinc-500 my-2">
                <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900">{formatDate(m.ts)}</span>
              </div>
            )}
            <MessageBubble message={m} isMe={isMe} sender={sender} onOpenGallery={onOpenGallery} />
          </div>
        )
      })}
    </div>
  )
})

function Composer({ onSend, inputRef }) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState([]) // {file, url, kind: 'image'|'video'|'file'}
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const handleAddFiles = (fileList, kindHint) => {
    const items = Array.from(fileList).map(f => {
      const url = URL.createObjectURL(f)
      const kind = kindHint || (f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'file')
      return { file: f, url, kind }
    })
    setFiles(prev => [...prev, ...items])
  }

  const send = () => {
    const ts = Date.now()
    let sent = false
    if (text.trim()) {
      onSend({ id: crypto.randomUUID(), sender: 'me', type: 'text', text: text.trim(), ts })
      sent = true
    }
    files.forEach(item => {
      if (item.kind === 'image') {
        onSend({ id: crypto.randomUUID(), sender: 'me', type: 'image', images: [item.url], ts: ts + 1 })
      } else if (item.kind === 'video') {
        onSend({ id: crypto.randomUUID(), sender: 'me', type: 'video', videoUrl: item.url, ts: ts + 2 })
      } else {
        onSend({ id: crypto.randomUUID(), sender: 'me', type: 'file', file: { name: item.file.name, size: item.file.size, type: item.file.type, url: item.url }, ts: ts + 3 })
      }
      sent = true
    })
    if (sent) {
      setText('')
      setFiles([])
    }
  }

  return (
    <div className="border-t border-[var(--border)] p-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
          {files.map((item, i) => (
            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800">
              {item.kind === 'image' && <img src={item.url} className="w-full h-full object-cover" />}
              {item.kind === 'video' && <video src={item.url} className="w-full h-full object-cover" />}
              {item.kind === 'file' && (
                <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 text-xs p-2 text-center">
                  <div className="truncate w-full">{item.file.name}</div>
                </div>
              )}
              <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="absolute -right-2 -top-2 bg-zinc-800 text-white rounded-full w-6 h-6">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleAddFiles(e.target.files, 'image')} />
          <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => handleAddFiles(e.target.files, 'video')} />
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleAddFiles(e.target.files, 'file')} />
          <button onClick={() => imageInputRef.current?.click()} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900" title="Attach photos">
            <PhotoIcon className="w-6 h-6" />
          </button>
          <button onClick={() => videoInputRef.current?.click()} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900" title="Attach video">
            <VideoCameraIcon className="w-6 h-6" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900" title="Attach files">
            <PaperClipIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1">
          <TextareaAutosize
            inputRef={inputRef}
            minRows={1}
            maxRows={8}
            placeholder="Message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
                e.preventDefault()
                send()
              }
              if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
                e.preventDefault()
                send()
              }
              if (e.key === 'Escape') {
                if (files.length) setFiles([])
                else inputRef?.current?.blur?.()
              }
            }}
            className="w-full resize-none bg-zinc-100 dark:bg-zinc-900 rounded-2xl px-4 py-3 outline-none focus:ring-2 ring-indigo-500"
          />
        </div>
        <button onClick={send} className="shrink-0 h-12 w-12 grid place-items-center rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700" title="Send">
          <PaperAirplaneIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}

function useBackendData() {
  const [ready, setReady] = useState(false)
  const [meId, setMeId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const socketRef = useRef(null)

  // initialize: auto-provision demo user and load rooms
  useEffect(() => {
    if (!api.url) return
    let cancelled = false
    const init = async () => {
      try {
        const existing = localStorage.getItem('auth.demo.v1')
        let email, password
        if (existing) {
          const obj = JSON.parse(existing)
          email = obj.email; password = obj.password
        } else {
          email = `demo_${Math.random().toString(36).slice(2, 8)}@example.com`
          password = 'password'
          try {
            const s = await api.signup(email, password)
            setToken(s.token)
            if (s.user?.id) {
              setMeId(s.user.id)
              try { localStorage.setItem('auth.me.v1', s.user.id) } catch {}
            }
          } catch (_) {
            // ignore
          }
          localStorage.setItem('auth.demo.v1', JSON.stringify({ email, password }))
        }
        let token = localStorage.getItem('auth.token.v1')
        if (!token) {
          const l = await api.login(email, password)
          setToken(l.token)
          token = l.token
          if (l.user?.id) {
            setMeId(l.user.id)
            try { localStorage.setItem('auth.me.v1', l.user.id) } catch {}
          }
        }
        if (!meId) {
          // Try restore meId from storage or from token payload
          const storedMe = localStorage.getItem('auth.me.v1')
          if (storedMe) setMeId(storedMe)
          else if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
              if (payload?.sub) setMeId(payload.sub)
            } catch {}
          }
        }
        // fetch rooms
        const { rooms } = await api.listRooms()
        let list = rooms
        if (!list.length) {
          const r = await api.createRoom('General')
          list = [r.room]
        }
        // normalize to UI conversations
        const convos = list.map(r => ({ id: r.id, type: 'group', name: r.name, avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(r.name)}`, members: [{ id: 'me', name: 'You', avatar: me.avatar }], messages: [] }))
        if (cancelled) return
        setConversations(convos)
        setSelectedId(convos[0]?.id || null)
        setReady(true)
      } catch (e) {
        console.error('Backend init failed', e)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  // load messages for selected room
  useEffect(() => {
    const load = async () => {
      if (!selectedId) return
      try {
        const { messages } = await api.listMessages(selectedId, { limit: 50 })
        setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, messages: messages.map(m => ({ id: m.id, sender: m.user_id === meId ? 'me' : 'other', type: 'text', text: m.content, ts: Date.parse(m.timestamp) || Date.now() })) } : c))
      } catch (e) {
        // ignore
      }
    }
    load()
  }, [selectedId, meId])

  // socket
  useEffect(() => {
    if (!api.url) return
    const s = createSocket()
    socketRef.current = s
    if (selectedId) s?.emit('room:join', selectedId)
    s?.on('message:new', (m) => {
      setConversations(prev => prev.map(c => c.id === m.room_id ? { ...c, messages: [...c.messages, { id: m.id, sender: m.user_id === meId ? 'me' : 'other', type: 'text', text: m.content, ts: Date.parse(m.timestamp) || Date.now() }] } : c))
    })
    return () => { s?.disconnect() }
  }, [api.url])

  useEffect(() => {
    const s = socketRef.current
    if (!s) return
    s.emit('room:leave')
    if (selectedId) s.emit('room:join', selectedId)
  }, [selectedId])

  const sendMessage = async (roomId, msg) => {
    if (msg.type !== 'text') return // backend supports text in MVP
    try {
      const { message } = await api.sendMessage(roomId, msg.text)
      setConversations(prev => prev.map(c => c.id === roomId ? { ...c, messages: [...c.messages, { id: message.id, sender: 'me', type: 'text', text: message.content, ts: Date.parse(message.timestamp) || Date.now() }] } : c))
    } catch (e) {
      console.error('send failed', e)
    }
  }

  const selected = useMemo(() => conversations.find(c => c.id === selectedId), [conversations, selectedId])
  return { ready, conversations, selectedId, setSelectedId, selected, sendMessage, addConversation: (c) => setConversations(prev => [c, ...prev]) }
}

export default function App() {
  const usingBackend = Boolean(import.meta.env.VITE_API_URL)
  const mock = useMockData()
  const backend = useBackendData()
  const { conversations, selectedId, setSelectedId, selected, sendMessage, addConversation } = usingBackend && backend.ready ? backend : mock

  // Refs for keyboard panel cycling
  const sidebarRef = useRef(null)
  const sidebarSearchRef = useRef(null)
  const messagesRef = useRef(null)
  const composerInputRef = useRef(null)

  // Responsive: mobile detection and view switching
  const [isMobile, setIsMobile] = useState(false)
  const [mobileView, setMobileView] = useState('list') // 'list' | 'chat'
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener?.('change', update)
    return () => mql.removeEventListener?.('change', update)
  }, [])

  // Theme handling: load, apply, and toggle
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch {}
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])
  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  const handleSend = (msg) => {
    sendMessage(selectedId, msg)
  }

  // Gallery state
  const [gallery, setGallery] = useState({ open: false, items: [], index: 0 })
  const openGallery = (items, index = 0) => setGallery({ open: true, items, index })
  const closeGallery = () => setGallery((g) => ({ ...g, open: false }))
  const prevGallery = () => setGallery((g) => ({ ...g, index: (g.index - 1 + g.items.length) % g.items.length }))
  const nextGallery = () => setGallery((g) => ({ ...g, index: (g.index + 1) % g.items.length }))

  // Call overlay state
  const [callOpen, setCallOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  // Suggested contacts (good defaults)
  const existingIds = new Set(conversations.flatMap(c => c.members.map(m => m.id)))
  const baseSuggestions = [
    { id: 'u4', name: 'Sophia', avatar: 'https://i.pravatar.cc/100?img=12', title: 'Design Lead' },
    { id: 'u5', name: 'Mason', avatar: 'https://i.pravatar.cc/100?img=9', title: 'Data Scientist' },
    { id: 'u6', name: 'Olivia', avatar: 'https://i.pravatar.cc/100?img=10', title: 'Product Manager' },
    { id: 'u7', name: 'Ethan', avatar: 'https://i.pravatar.cc/100?img=11', title: 'Frontend Engineer' },
    { id: 'u8', name: 'Amelia', avatar: 'https://i.pravatar.cc/100?img=14', title: 'QA Analyst' },
    { id: 'u9', name: 'James', avatar: 'https://i.pravatar.cc/100?img=16', title: 'DevOps' },
    { id: 'u10', name: 'Isabella', avatar: 'https://i.pravatar.cc/100?img=17', title: 'UX Researcher' },
    { id: 'u11', name: 'Lucas', avatar: 'https://i.pravatar.cc/100?img=18', title: 'Backend Engineer' },
  ]
  const suggestions = baseSuggestions.filter(s => !existingIds.has(s.id))

  // Global keyboard shortcuts (outside overlays)
  useEffect(() => {
    const onKeyDown = (e) => {
      const active = document.activeElement
      const anchors = [
        sidebarRef.current,
        sidebarSearchRef.current,
        messagesRef.current,
        composerInputRef.current,
      ].filter(Boolean)

      const isAnchor = anchors.some((el) => el === active)

      // Tab: cycle panels when focus is at anchors or body
      if (e.key === 'Tab' && (isAnchor || active === document.body)) {
        e.preventDefault()
        const order = [sidebarRef.current || sidebarSearchRef.current, messagesRef.current, composerInputRef.current].filter(Boolean)
        if (!order.length) return
        const idx = Math.max(0, order.indexOf(active))
        const next = e.shiftKey ? order[(idx - 1 + order.length) % order.length] : order[(idx + 1) % order.length]
        next?.focus()
        return
      }

      // Quick focus: '/' or Cmd/Ctrl+K => sidebar search
      if ((e.key === '/' || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) && !e.defaultPrevented) {
        const tag = active?.tagName?.toLowerCase()
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault()
          sidebarSearchRef.current?.focus()
        }
      }

      // Switch conversations: Alt+ArrowUp/Down
      if ((e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) && conversations.length) {
        e.preventDefault()
        const idx = conversations.findIndex((c) => c.id === selectedId)
        const nextIdx = e.key === 'ArrowDown' ? (idx + 1) % conversations.length : (idx - 1 + conversations.length) % conversations.length
        setSelectedId(conversations[nextIdx].id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [conversations, selectedId, setSelectedId])

  return (
    <div className="h-dvh w-full flex">
      {/* Sidebar: full-width on mobile list view; fixed width on md+ */}
      <div className={(isMobile ? (mobileView === 'list' ? 'flex' : 'hidden') : 'flex') + ' md:flex h-full w-full md:w-80 shrink-0'}>
        <Sidebar
          ref={sidebarRef}
          searchRef={sidebarSearchRef}
          conversations={conversations}
          selectedId={selectedId}
          onSelect={(id) => { setSelectedId(id); if (isMobile) setMobileView('chat') }}
          onNewChat={() => setAddOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      {/* Chat area: hidden on mobile list view */}
      <div className={(isMobile ? (mobileView === 'chat' ? 'flex' : 'hidden') : 'flex') + ' flex-1 flex flex-col'}>
        {selected ? (
          <>
            <ChatHeader
              convo={selected}
              onStartCall={() => setCallOpen(true)}
              onFocusSearch={() => sidebarSearchRef.current?.focus()}
              onOpenMembers={() => setMembersOpen(true)}
              onBack={isMobile ? () => setMobileView('list') : undefined}
            />
            <MessageList ref={messagesRef} convo={selected} onOpenGallery={openGallery} />
            <Composer inputRef={composerInputRef} onSend={handleSend} />
            <GalleryModal open={gallery.open} items={gallery.items} index={gallery.index} onClose={closeGallery} onPrev={prevGallery} onNext={nextGallery} />
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-zinc-500">Select a conversation</div>
        )}
      </div>

      <CallOverlay open={callOpen} convo={selected || conversations[0]} onClose={() => setCallOpen(false)} />
      <MembersPanel open={membersOpen} mobile={isMobile} convo={selected || conversations[0]} onClose={() => setMembersOpen(false)} />
      <AddContactModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(contact) => {
          const newConvo = {
            id: 'c' + Math.random().toString(36).slice(2, 8),
            type: 'dm',
            name: contact.name,
            avatar: contact.avatar,
            members: [me, { id: contact.id, name: contact.name, avatar: contact.avatar }],
            messages: [],
          }
          addConversation(newConvo)
          setSelectedId(newConvo.id)
          setAddOpen(false)
          if (isMobile) setMobileView('chat')
        }}
      />
    </div>
  )
}
