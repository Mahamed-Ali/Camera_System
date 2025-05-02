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
// import Logs from "./pages/Logs"
export default function App() {
  return (
    <>
      <div className="main-overlay">
        <img src="/icon.svg" className='loader' width={20} />
      </div>

      <TooltipProvider delayDuration={0}>
        <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
          <UIOptionsProvider>
            <AdditionalOptionsProvider>
              <OptionsProvider>
                <Navbar />
                <section id='content' className="p-6">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/recordings" element={<Recordings />} />
                    {/* <Route path="/logs" element={<Logs />} /> */}
                  </Routes>
                </section>
                <section className="popups fixed">
                  <Toaster />
                </section>
              </OptionsProvider>
            </AdditionalOptionsProvider>
          </UIOptionsProvider>
        </ThemeProvider>
      </TooltipProvider>
    </>
  )
}
