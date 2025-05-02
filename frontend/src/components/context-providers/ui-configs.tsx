import { createContext, useContext, useEffect, useState } from "react"
import { socket } from '../../utils/socket'

export interface Log {
  timestamp: string;
  shortMessage: string;
  longMessage: string;
  logType: string;
}

export interface UIOptions {
  userPaused?: boolean
  serverPaused?: boolean
  serverOnline?: boolean
  lastUpdated?: string
  logs?: Log[]
  lastSeenMsg?: Log['longMessage']
  notificationsSeen?: boolean
  notifications?: (Omit<Log, 'longMessage'> & { seen?: boolean })[]
}

export interface UIOptionsContextType {
  uiOptions: UIOptions
  setUIOptions: React.Dispatch<React.SetStateAction<UIOptions>>
}

export const UIOptionsContext = createContext<UIOptionsContextType | undefined>(undefined)

export function UIOptionsProvider({ children }: { children: React.ReactNode }) {
  const [opt, setUIOptions] = useState<UIOptions>({
    userPaused: false,
    serverPaused: false,
    serverOnline: false,
    logs: []
  })

  useEffect(() => {
    // استقبل كل اللوجات من السيرفر عند الاتصال
    socket.on('logs', (logs: Log[]) => {
      setUIOptions(prev => ({
        ...prev,
        logs: logs
      }))
    })

    // استقبل كل لوج جديد واتضيفه على بداية القائمة
    socket.on('new-log', (log: Log) => {
      setUIOptions(prev => ({
        ...prev,
        logs: [log, ...(prev.logs || [])]
      }))
    })

    // cleanup لما الكومبوننت يتشال
    return () => {
      socket.off('logs')
      socket.off('new-log')
    }
  }, [])

  return (
    <UIOptionsContext.Provider value={{ uiOptions: opt, setUIOptions }}>
      {children}
    </UIOptionsContext.Provider>
  )
}

export function useUIOptions() {
  const context = useContext(UIOptionsContext)
  if (context === undefined)
    throw new Error('useUIOptions must be used within a UIOptionsProvider')
  return context
}
