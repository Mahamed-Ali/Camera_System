type Zone = {
  x: number;
  y: number;
  width: number;
  height: number;
  blur: number;
  hsva: { h: number; s: number; v: number; a: number }
}

import { useState } from "react"
import { useOptions } from "../components/context-providers/options"

export default function PrivacyZones() {
  const { options, setOptions } = useOptions()
  const [zone, setZone] = useState<Zone>(options.shape || { x: 20, y: 20, width: 40, height: 40, blur: 10, hsva: { h: 0, s: 0, v: 0, a: 0.5 } })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Save privacy zone to backend
  const saveZone = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/options.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...options, shape: zone })
      })
      if (!res.ok) throw new Error("Failed to save privacy zone")
      setOptions({ ...options, shape: zone })
      setSuccess("Privacy zone saved and applied!")
    } catch (e) {
      setError("Failed to save privacy zone.")
    } finally {
      setSaving(false)
    }
  }

  // Simple preview box (replace with canvas for advanced UI)
  return (
    <div className="h-full bg-black">
      <div className="h-full overflow-y-auto">
        <div className="p-6 text-white space-y-8">
          <h2 className="text-3xl font-bold text-red-600">🛡️ Privacy Zones</h2>
          <div className="bg-zinc-900 rounded-xl p-6 shadow-lg flex flex-col md:flex-row gap-8">
            <div className="flex-1 flex flex-col gap-4">
              <label className="font-semibold" htmlFor="zone-x">Zone X (%)</label>
              <input id="zone-x" name="zone-x" type="range" min={0} max={100} value={zone.x} onChange={e => setZone({ ...zone, x: Number(e.target.value) })} />
              <label className="font-semibold" htmlFor="zone-y">Zone Y (%)</label>
              <input id="zone-y" name="zone-y" type="range" min={0} max={100} value={zone.y} onChange={e => setZone({ ...zone, y: Number(e.target.value) })} />
              <label className="font-semibold" htmlFor="zone-width">Width (%)</label>
              <input id="zone-width" name="zone-width" type="range" min={5} max={100} value={zone.width} onChange={e => setZone({ ...zone, width: Number(e.target.value) })} />
              <label className="font-semibold" htmlFor="zone-height">Height (%)</label>
              <input id="zone-height" name="zone-height" type="range" min={5} max={100} value={zone.height} onChange={e => setZone({ ...zone, height: Number(e.target.value) })} />
              <label className="font-semibold" htmlFor="zone-blur">Blur</label>
              <input id="zone-blur" name="zone-blur" type="range" min={0} max={50} value={zone.blur} onChange={e => setZone({ ...zone, blur: Number(e.target.value) })} />
              <button
                className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-60"
                onClick={saveZone}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Privacy Zone"}
              </button>
              {error && <div className="text-red-400 mt-2">{error}</div>}
              {success && <div className="text-green-400 mt-2">{success}</div>}
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="relative w-[320px] h-[180px] bg-gray-800 rounded-lg overflow-hidden">
                {/* Simulated camera preview */}
                <div className="absolute inset-0 bg-black/40" />
                <div
                  className="absolute border-2 border-red-500 bg-red-500/20"
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                    filter: `blur(${zone.blur / 5}px)`
                  }}
                />
              </div>
              <span className="text-xs text-gray-400 mt-2">Preview (simulated)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
