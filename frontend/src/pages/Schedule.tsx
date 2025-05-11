type DailySchedule = {
  [day: string]: [number, number]
}

import { useState } from "react"
import { useOptions } from "../components/context-providers/options"

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const defaultSchedule: DailySchedule = days.reduce((acc, d) => ({ ...acc, [d]: [8, 17] }), {} as DailySchedule);

export default function Schedule() {
  const { options, setOptions } = useOptions()
  const [schedule, setSchedule] = useState<DailySchedule>(() => {
    if (
      options.schedule &&
      typeof options.schedule === "object" &&
      days.every(day => Array.isArray((options.schedule as any)[day]))
    ) {
      return options.schedule as DailySchedule;
    }
    return defaultSchedule;
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const saveSchedule = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/options.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...options, schedule })
      })
      if (!res.ok) throw new Error("Failed to save schedule")
      setOptions({ ...options, schedule })
      setSuccess("Recording schedule saved!")
    } catch (e) {
      setError("Failed to save schedule.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full bg-black">
      <div className="h-full overflow-y-auto">
        <div className="p-6 text-white space-y-8">
          <h2 className="text-3xl font-bold text-red-600">⏰ Recording Schedule</h2>
          <div className="bg-zinc-900 rounded-xl p-6 shadow-lg flex flex-col gap-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400">
                    <th className="p-2">Day</th>
                    <th className="p-2">Start Hour</th>
                    <th className="p-2">End Hour</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map(day => (
                    <tr key={day} className="border-b border-zinc-800">
                      <td className="p-2 font-semibold text-red-400">{day}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          max={23}
                          id={`start-hour-${day}`}
                          name={`start-hour-${day}`}
                          value={schedule[day][0]}
                          onChange={e => setSchedule({ ...schedule, [day]: [Number(e.target.value), schedule[day][1]] })}
                          className="w-16 bg-zinc-800 text-white rounded px-2 py-1 border border-zinc-700"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          max={23}
                          id={`end-hour-${day}`}
                          name={`end-hour-${day}`}
                          value={schedule[day][1]}
                          onChange={e => setSchedule({ ...schedule, [day]: [schedule[day][0], Number(e.target.value)] })}
                          className="w-16 bg-zinc-800 text-white rounded px-2 py-1 border border-zinc-700"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-60"
              onClick={saveSchedule}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Schedule"}
            </button>
            {error && <div className="text-red-400 mt-2">{error}</div>}
            {success && <div className="text-green-400 mt-2">{success}</div>}
          </div>
        </div>
      </div>
    </div>
  )
} 