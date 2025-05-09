import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
import { DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "./ui/drawer"
import { Button } from "./ui/button"
import { useUIOptions } from "./context-providers/ui-configs"
import { formatMessage, logIcon, readableDate } from "../utils/utils"

export default function ActivityLogs() {
  const { uiOptions, setUIOptions } = useUIOptions()

  // Dummy logs للتجربة
  const logs = uiOptions.logs?.length ? uiOptions.logs : [
    { timestamp: new Date().toISOString(), shortMessage: "Web server auto-started", longMessage: "⚡ Started automatically", logType: "autostart" },
    { timestamp: new Date().toISOString(), shortMessage: "Device powered off", longMessage: "⏻ Shut down safely", logType: "poweroff" },
    { timestamp: new Date().toISOString(), shortMessage: "Device restarted", longMessage: "🔁 Restarted by admin", logType: "reboot" },
    { timestamp: new Date().toISOString(), shortMessage: "Motion detected", longMessage: "🎯 Motion in hallway", logType: "motiondetection" },
    { timestamp: new Date().toISOString(), shortMessage: "Logging turned off", longMessage: "📜 Disabled by user", logType: "logging" },
    { timestamp: new Date().toISOString(), shortMessage: "Recording on", longMessage: "📹 24/7 recording started", logType: "recording247" },
    { timestamp: new Date().toISOString(), shortMessage: "Scheduled recording enabled", longMessage: "⏰ Recording scheduled 12–1 PM", logType: "schedule" }
  ]

  return (
    <DrawerContent className="logs-content w-[400px] fixed right-0 top-0 h-full z-50 shadow-xl p-6 overflow-y-auto bg-white dark:bg-zinc-900">
      <DrawerHeader className="gap-2 mb-4">
        <DrawerTitle className="text-xl font-bold text-red-600">Activity Logs</DrawerTitle>
        <DrawerDescription className="text-gray-500 dark:text-gray-400">Most recent logs are shown first.</DrawerDescription>
      </DrawerHeader>

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

      {/* زر Clear Logs في المنتصف */}
      <div className="flex justify-center mt-6">
        <Button
          variant="ghost"
          className="bg-red-600 text-white hover:bg-red-700 transition duration-300 hover:scale-105"
          onClick={() => setUIOptions({ ...uiOptions, logs: [] })}
        >
          Clear Logs
        </Button>
      </div>
    </DrawerContent>
  )
}
