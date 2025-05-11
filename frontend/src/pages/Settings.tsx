import { Switch } from "../components/ui/switch"
import { useTheme } from "../components/context-providers/sidebar-theme"
import { useOptions } from "../components/context-providers/options"
import { Link } from "react-router-dom"
import { socket } from '../utils/socket'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { options, setOptions } = useOptions()

  function saveOption(key: string, checked: boolean) {
    socket.emit('option-update', key, checked)
    setOptions({ ...options, [key]: checked })
    setTimeout(() => fetch('/api/options.json')
      .then(res => res.json())
      .then(res => setOptions({
        ...options,
        ...res,
        shape: { ...res.shape, ...options.shape },
        schedule: { ...res.schedule, ...options.schedule },
      })), 1500)
  }

  return (
    <div className="h-full">
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <h2 className="text-3xl font-bold text-red-600 mb-6">⚙️ Settings</h2>
          
          <div className="space-y-6 max-w-4xl mx-auto">
            <section className="bg-zinc-900 p-6 rounded-xl shadow-lg space-y-4">
              <h3 className="text-xl font-semibold text-white">General Options</h3>
              <div className="flex items-center justify-between text-white">
                <span>Dark Theme</span>
                <Switch
                  aria-label="Enable dark theme"
                  checked={theme === 'dark'}
                  onCheckedChange={checked => setTheme(checked ? 'dark' : 'light')}
                />
              </div>
            </section>

            <section className="bg-zinc-900 p-6 rounded-xl shadow-lg space-y-4">
              <h3 className="text-xl font-semibold text-white">Camera Options</h3>
              <div className="flex items-center justify-between text-white">
                <span>Flip upside down</span>
                <Switch
                  aria-label="Flip camera orientation"
                  checked={options.fliporientation}
                  onCheckedChange={checked => saveOption('fliporientation', checked)}
                />
              </div>
              <div className="flex items-center justify-between text-white">
                <span>24/7 Recording</span>
                <Switch
                  aria-label="Enable 24/7 recording"
                  checked={options.recording247}
                  onCheckedChange={checked => saveOption('recording247', checked)}
                />
              </div>
              <div className="flex items-center justify-between text-white">
                <span>Motion Detection</span>
                <Switch
                  aria-label="Enable motion detection"
                  checked={options.motiondetection}
                  onCheckedChange={checked => saveOption('motiondetection', checked)}
                />
              </div>
              <div className="flex items-center justify-between text-white">
                <span>Activity Logs</span>
                <Switch
                  aria-label="Enable activity logs"
                  checked={options.logging}
                  onCheckedChange={checked => saveOption('logging', checked)}
                />
              </div>
            </section>

            <section className="bg-zinc-900 p-6 rounded-xl shadow-lg space-y-4">
              <h3 className="text-xl font-semibold text-white">Advanced</h3>
              <div className="flex flex-col gap-3">
                <Link to="/settings/privacy-zones" className="text-red-400 hover:underline">Privacy Zones</Link>
                <Link to="/settings/schedule" className="text-red-400 hover:underline">Recording Schedule</Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
