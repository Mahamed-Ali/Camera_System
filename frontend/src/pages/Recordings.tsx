import { useEffect, useState, useCallback, useRef } from "react"
import { Download, Trash2, Video, Search } from "lucide-react"
// @ts-ignore
import { io } from "socket.io-client"

// Logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data || '')
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '')
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '')
  }
}

interface Recording {
  name: string
  url: string
  date: string
  duration: string
  size: string
  thumbnail?: string
}

const SOCKET_URL = window.location.origin.replace(/^http/, "ws")

export default function Recordings() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "name">("date")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Load cached recordings from localStorage
  const loadCachedRecordings = useCallback(() => {
    const cached = localStorage.getItem("recordings")
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        logger.info('Loaded recordings from cache', { count: parsed.length })
        setRecordings(parsed)
        setFilteredRecordings(parsed)
        return true
      } catch (e) {
        logger.error('Failed to parse cached recordings', e)
      }
    }
    return false
  }, [])

  // Save recordings to localStorage
  const cacheRecordings = useCallback((data: Recording[]) => {
    try {
      localStorage.setItem("recordings", JSON.stringify(data))
      logger.info('Cached recordings successfully', { count: data.length })
    } catch (e) {
      logger.error('Failed to cache recordings', e)
    }
  }, [])

  // Fetch recordings from server
  const fetchRecordings = useCallback(async () => {
    try {
      setIsLoading(true)
      logger.info('Fetching recordings from server')
      const res = await fetch("/api/recordings/")
      if (!res.ok) throw new Error(`Failed to fetch recordings: ${res.status}`)
      const data = await res.json()
      logger.info('Successfully fetched recordings', { count: data.length })
      setRecordings(data)
      setFilteredRecordings(data)
      cacheRecordings(data)
      setError(null)
      return true
    } catch (err) {
      logger.error('Failed to fetch recordings from backend', err)
      setError("Failed to fetch recordings from backend. Trying cache...")
      if (loadCachedRecordings()) return true
      
      // Fallback to recordings.json
      try {
        logger.info('Attempting to load fallback recordings.json')
        const res = await fetch("/recordings/recordings.json")
        if (!res.ok) throw new Error(`No fallback recordings.json found: ${res.status}`)
        const data = await res.json()
        logger.info('Successfully loaded fallback recordings', { count: data.length })
        setRecordings(data)
        setFilteredRecordings(data)
        setError("Loaded from fallback recordings.json.")
        return true
      } catch (e) {
        logger.error('Failed to load fallback recordings', e)
        setError("No recordings available.")
        setRecordings([])
        setFilteredRecordings([])
        return false
      }
    } finally {
      setIsLoading(false)
    }
  }, [loadCachedRecordings, cacheRecordings])

  // Delete recording
  const handleDelete = async (filename: string) => {
    try {
      logger.info('Attempting to delete recording', { filename })
      const res = await fetch(`/api/videos/delete/${filename}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Failed to delete recording: ${res.status}`)
      const updatedRecordings = recordings.filter(r => r.name !== filename)
      logger.info('Successfully deleted recording', { filename })
      setRecordings(updatedRecordings)
      setFilteredRecordings(updatedRecordings)
      cacheRecordings(updatedRecordings)
    } catch (err) {
      logger.error('Failed to delete recording', err)
      setError("Failed to delete recording. Will retry when server is back.")
    }
  }

  // Filter and sort recordings
  useEffect(() => {
    let filtered = [...recordings]
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.date.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
      return a.name.localeCompare(b.name)
    })
    setFilteredRecordings(filtered)
  }, [recordings, searchTerm, sortBy])

  // Initial load
  useEffect(() => {
    fetchRecordings()
  }, [fetchRecordings])

  // WebSocket for real-time updates
  useEffect(() => {
    let socket: any = null
    try {
      logger.info('Initializing WebSocket connection')
      // @ts-ignore
      socket = io(SOCKET_URL)
      socket.on("new-recording", (rec: Recording) => {
        logger.info('Received new recording via WebSocket', { recording: rec.name })
        setRecordings(prev => {
          const exists = prev.some(r => r.name === rec.name)
          if (exists) return prev
          const updated = [rec, ...prev]
          cacheRecordings(updated)
          return updated
        })
      })
      socket.on("connect_error", (error: any) => {
        logger.error('WebSocket connection error', error)
      })
    } catch (e) {
      logger.warn('WebSocket initialization failed, falling back to polling', e)
      pollingRef.current = setInterval(fetchRecordings, 10000)
    }
    return () => {
      if (socket) {
        logger.info('Disconnecting WebSocket')
        socket.disconnect()
      }
      if (pollingRef.current) {
        logger.info('Clearing polling interval')
        clearInterval(pollingRef.current)
      }
    }
  }, [fetchRecordings, cacheRecordings])
  
  return (
    <div className="h-full bg-black">
      <div className="h-full overflow-y-auto">
        <div className="space-y-6 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-3xl font-bold text-red-600">📼 Recordings</h2>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search recordings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "name")}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 text-red-200 p-4 rounded-lg">{error}</div>
          )}
          {isLoading ? (
            <div className="text-white text-center py-8">Loading recordings...</div>
          ) : filteredRecordings.length === 0 ? (
            <p className="text-white text-sm">No recordings found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRecordings.map((rec, idx) => (
                <div key={idx} className="bg-zinc-900 p-4 rounded-2xl shadow-lg text-white flex flex-col group transition-all duration-200 hover:shadow-2xl hover:bg-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-lg text-white truncate max-w-[60%]" title={rec.name}>{rec.name}</span>
                    <span className="text-xs opacity-60 whitespace-nowrap">{rec.date}</span>
                  </div>
                  <div className="relative w-full aspect-video mb-3 rounded-lg overflow-hidden bg-black">
                    <video src={`/api/recordings/${rec.name}`} controls className="w-full h-full object-cover rounded-lg bg-black" preload="metadata" />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mb-3">
                    <span className="flex items-center gap-1"><Video size={16} /> {rec.duration}</span>
                    <span className="flex items-center gap-1"><Download size={16} /> {rec.size}</span>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <a
                      href={`/api/recordings/${rec.name}`}
                      download
                      className="flex-1 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2 transition-colors group/download"
                      title="Download"
                    >
                      <Download size={18} />
                    </a>
                    <button
                      onClick={() => handleDelete(rec.name)}
                      className="flex-1 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 transition-colors group/delete"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
