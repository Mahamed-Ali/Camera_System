import { useEffect, useState } from "react"
import { Download, Trash2, Video } from "lucide-react"

interface Recording {
  name: string
  url: string
  date: string
}

export default function Recordings() {
  const [recordings, setRecordings] = useState<Recording[]>([])

  useEffect(() => {
    fetch("/recordings") // بدل recordings.json
      .then((res) => res.json())
      .then((data) => setRecordings(data))
      .catch(() => setRecordings([]))
  }, [])
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-red-600">📼 Recordings</h2>

      {recordings.length === 0 ? (
        <p className="text-white text-sm">No recordings found yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {recordings.map((rec, idx) => (
            <div key={idx} className="bg-gray-900 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-red-500 font-semibold">
                  <Video size={18} />
                  <span>{rec.name}</span>
                </div>
                <span className="text-xs opacity-50">{rec.date}</span>
              </div>
              <video src={rec.url} controls className="w-full rounded-lg mb-2" />
              <div className="flex gap-3">
                <a
                  href={rec.url}
                  download
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded-md flex items-center gap-1 text-sm"
                >
                  <Download size={14} /> Download
                </a>
                <button className="text-gray-400 hover:text-red-400 flex items-center gap-1 text-sm">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
