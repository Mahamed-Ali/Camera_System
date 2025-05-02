import { useEffect, useState } from "react"
import {
  Camera,
  WifiOff,
  Wifi,
  Clock,
  CameraOff,
  CameraIcon,
  Play,
  Pause,
  Camera as SnapshotIcon,
} from "lucide-react"

export default function Home() {
  const [streaming, setStreaming] = useState(false)
  const [connected, setConnected] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState("00:00:00")

  // تحديد اللون حسب الحالة
  const statusColor = streaming && connected ? "text-green-500" : "text-red-500"

  useEffect(() => {
    const pingServer = () => {
      fetch("http://127.0.0.1:5000/", { method: "GET" })
        .then(() => setConnected(true))
        .catch(() => setConnected(false))
    }

    pingServer()
    const interval = setInterval(pingServer, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (streaming && startTime) {
      timer = setInterval(() => {
        const diff = Math.floor((Date.now() - startTime.getTime()) / 1000)
        const hrs = String(Math.floor(diff / 3600)).padStart(2, "0")
        const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, "0")
        const secs = String(diff % 60).padStart(2, "0")
        setElapsedTime(`${hrs}:${mins}:${secs}`)
      }, 1000)
    } else {
      setElapsedTime("00:00:00")
    }
    return () => clearInterval(timer)
  }, [streaming, startTime])

  const handleToggleStream = () => {
    if (!streaming) setStartTime(new Date())
    setStreaming(!streaming)
  }

  const handleSnapshot = () => {
    const a = document.createElement('a')
    a.href = 'http://127.0.0.1:5000/video_feed'
    a.download = `snapshot_${Date.now()}.jpg`
    a.click()
  }

  return (
    <div className="p-6">
      <div className="w-full flex justify-center">
        <h1 className={`text-3xl font-extrabold mb-6 flex items-center gap-2 ${statusColor}`}>
          <Camera className="text-inherit text-4xl" />
          Live Camera View
        </h1>
      </div>

      <div className={`flex justify-center gap-6 mb-4 text-sm ${statusColor}`}>
        <span className="flex items-center gap-1">
          {connected ? <Wifi className="text-inherit" size={16} /> : <WifiOff className="text-inherit" size={16} />}
          {connected ? "Connected" : "Disconnected"}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={16} /> {elapsedTime}
        </span>
        <span className="flex items-center gap-1">
          {streaming ? <CameraIcon size={16} /> : <CameraOff size={16} />}
          {streaming ? "Live" : "Paused"}
        </span>
      </div>

      <div className="bg-black rounded-xl w-full max-w-5xl mx-auto shadow-lg h-[400px] flex items-center justify-center">
        {streaming ? (
          <img
            src="http://127.0.0.1:5000/video_feed"
            alt="Live camera feed"
            className="rounded-lg mx-auto"
          />
        ) : (
          <p className="text-red-500 text-xl font-medium">Stream is stopped</p>
        )}
      </div>

      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={handleToggleStream}
          className="flex items-center gap-2 px-6 py-2 rounded-md font-semibold transition duration-300 bg-red-600 text-white hover:bg-red-700"
        >
          {streaming ? <Pause size={18} /> : <Play size={18} />}
          {streaming ? "Stop Camera" : "Start Camera"}
        </button>

        <button
          onClick={handleSnapshot}
          className="flex items-center gap-2 px-6 py-2 rounded-md font-semibold transition duration-300 bg-red-500 text-white hover:bg-red-600"
        >
          <SnapshotIcon size={18} /> Take Snapshot
        </button>
      </div>
    </div>
  )
}
