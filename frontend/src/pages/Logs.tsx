import ActivityLogs from '../components/ActivityLogsDrawer'

export default function Logs() {
  return (
    <div className="h-full bg-black">
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <ActivityLogs />
        </div>
      </div>
    </div>
  )
}
