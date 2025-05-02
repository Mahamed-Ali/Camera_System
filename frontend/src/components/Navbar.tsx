import { Link, useLocation } from 'react-router-dom';
import { Camera, Settings, Clock, Home } from 'lucide-react';
import { useState } from 'react';
import { Drawer, DrawerTrigger } from './ui/drawer';
import ActivityLogs from './ActivityLogsDrawer';

export default function Navbar() {
  const location = useLocation();

  const linkClasses = (path: string) =>
    `flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-300 ${
      location.pathname === path
        ? 'bg-white text-red-600 shadow-lg'
        : 'text-white hover:text-red-400 hover:bg-gray-800'
    }`;

  return (
    <header className="p-4 shadow bg-black text-white flex justify-between items-center">
      <div className="text-xl font-bold tracking-wide">🔒 Smart Camera</div>
      <nav className="flex gap-4 items-center">
        <Link to="/" className={linkClasses('/')}> <Home size={18} /> Home </Link>
        <Link to="/settings" className={linkClasses('/settings')}> <Settings size={18} /> Settings </Link>
        <Link to="/recordings" className={linkClasses('/recordings')}> <Camera size={18} /> Recordings </Link>

        {/* Logs Drawer Trigger */}
        <Drawer>
          <DrawerTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-300 text-white hover:text-red-400 hover:bg-gray-800">
              <Clock size={18} /> Logs
            </button>
          </DrawerTrigger>
          <ActivityLogs />
        </Drawer>
      </nav>
    </header>
  );
}
