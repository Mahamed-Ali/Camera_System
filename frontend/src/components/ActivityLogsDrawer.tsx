import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
import { DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "./ui/drawer"
import { Button } from "./ui/button"
import { useEffect, useState } from "react"
import { formatMessage, logIcon, readableDate } from "../utils/utils"
import { socket } from "../utils/socket"

export default function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendReachable, setBackendReachable] = useState(true)
  
  // Load logs from backend
  useEffect(() => {
    setLoading(true)
    fetch("/logs")
      .then(res => {
        if (!res.ok) {
          setBackendReachable(false)
          throw new Error(`Backend unreachable or error. Status: ${res.status}`)
        }
        setBackendReachable(true)
        return res.json()
      })
      .then(data => {
        setLogs(data)
        setError(null)
      })
      .catch((err) => {
        setError("Failed to load logs from backend.")
        console.error("Error loading logs:", err)
      })
      .finally(() => setLoading(false))
  }, [])

  // Real-time log updates via socket.io
  useEffect(() => {
    function handleNewLog(log: any) {
      setLogs(prev => [log, ...prev])
    }
    socket.on("new-log", handleNewLog)
    return () => socket.off("new-log", handleNewLog)
  }, [])

  // Clear logs in backend and frontend
  const handleClearLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/logs/clear", { method: "POST" })
      if (!res.ok) throw new Error()
      setLogs([])
      setError(null)
    } catch {
      setError("Failed to clear logs.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DrawerContent className="logs-content w-[400px] fixed right-0 top-0 h-full z-50 shadow-xl p-6 overflow-y-auto bg-white dark:bg-black">
      <DrawerHeader className="gap-2 mb-4">
        <DrawerTitle className="text-xl font-bold text-red-600">Activity Logs</DrawerTitle>
        <DrawerDescription className="text-gray-500 dark:text-gray-400">Most recent logs are shown first.</DrawerDescription>
      </DrawerHeader>
      {loading ? (
        <div className="text-center text-gray-400 py-8">Loading logs...</div>
      ) : !backendReachable ? (
        <div className="text-center text-red-400 py-8">Backend is unreachable. Please check your server connection.</div>
      ) : error ? (
        <div className="text-center text-red-400 py-8">{error}</div>
      ) : logs.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No logs found.</div>
      ) : (
      <Accordion type="single" collapsible className="space-y-2 px-2 max-h-[65vh] overflow-y-auto">
        {logs.map((log, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="border rounded-md bg-gray-50 dark:bg-zinc-800">
            <AccordionTrigger className="p-3">
              <div className="flex gap-2 items-center">
                <div className="text-red-600">{logIcon(log.logType)}</div>
                <div className="flex flex-col text-left">
                  <span className="font-medium">{log.shortMessage}</span>
                  <time className="text-xs text-gray-500">at {readableDate(log.timestamp)}</time>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3 text-sm text-gray-700 dark:text-gray-300">
              {formatMessage(log.longMessage)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      )}
      <div className="flex justify-center mt-6">
        <Button
          variant="ghost"
          className="bg-red-600 text-white hover:bg-red-700 transition duration-300 hover:scale-105"
          onClick={handleClearLogs}
          disabled={loading}
        >
          Clear Logs
        </Button>
      </div>
    </DrawerContent>
  )
}
