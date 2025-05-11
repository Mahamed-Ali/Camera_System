import './styles/App.sass'
import { Routes, Route } from 'react-router-dom'
import Header from "./components/Header"
import Navbar from "./components/Navbar"
import { Toaster } from "./components/ui/toaster"
import { TooltipProvider } from "./components/ui/tooltip"
import { OptionsProvider } from './components/context-providers/options'
import { ThemeProvider } from "./components/context-providers/sidebar-theme"
import { AdditionalOptionsProvider } from "./components/context-providers/sidebar-additional-options"
import { UIOptionsProvider } from './components/context-providers/ui-configs'

import Home from "./pages/Home"
import Settings from "./pages/Settings"
import Recordings from "./pages/Recordings"
import PrivacyZones from "./pages/PrivacyZones"
import Schedule from "./pages/Schedule"
// import Logs from "./pages/Logs"
import { useState } from 'react'

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null)
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Something went wrong</h1>
        <p className="mb-2">{error.message}</p>
        <button className="bg-red-600 px-4 py-2 rounded" onClick={() => window.location.reload()}>Reload</button>
      </div>
    )
  }
  // @ts-ignore
  return <ErrorCatcher setError={setError}>{children}</ErrorCatcher>
}

// Helper to catch errors in children
function ErrorCatcher({ setError, children }: { setError: (e: Error) => void, children: React.ReactNode }) {
  try {
    // @ts-ignore
    return children
  } catch (e: any) {
    setError(e)
    return null
  }
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-4xl font-bold text-red-600 mb-4">404</h1>
      <p className="mb-2">Page Not Found</p>
      <a href="/" className="text-red-400 underline">Go Home</a>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="main-overlay">
        <img src="/icon.svg" className='loader' width={20} alt="App loading icon" />
      </div>
      <TooltipProvider delayDuration={0}>
        <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
          <UIOptionsProvider>
            <AdditionalOptionsProvider>
              <OptionsProvider>
                <div className="flex flex-col h-screen">
                  <Navbar />
                  <main className="flex-1 overflow-hidden">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/settings/privacy-zones" element={<PrivacyZones />} />
                      <Route path="/settings/schedule" element={<Schedule />} />
                      <Route path="/recordings" element={<Recordings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                  <section className="popups fixed">
                    <Toaster />
                  </section>
                </div>
              </OptionsProvider>
            </AdditionalOptionsProvider>
          </UIOptionsProvider>
        </ThemeProvider>
      </TooltipProvider>
    </ErrorBoundary>
  )
}
