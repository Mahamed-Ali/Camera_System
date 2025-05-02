import { toastIt } from "./utils.tsx";
import { io } from "socket.io-client";
import * as uiconfig from "../components/context-providers/ui-configs";

// https://vitejs.dev/guide/env-and-mode.html#env-variables-and-modes
export const socket = io(import.meta.env.VITE_BACKEND_URL || location.origin);

export function setupListeners({ setUIOptions }: uiconfig.UIOptionsContextType) {
    // Function to simplify setting options multiple times
    const setUIOpts = (options: uiconfig.UIOptions, paused: boolean) => {
        if (paused)
            setUIOptions(prev => ({ ...prev, ...options, logs: prev.logs }));
        else {
            const feed = document.querySelector('main .video img') as HTMLImageElement;
            // URL needs to change to force Firefox to reload the image
            feed.src = feed.src.replace(/#.*|$/, '') + '#' + Math.random()
            // Waiting just for a moment to show the pause effect
            setTimeout(() => setUIOptions(prev => ({ ...prev, ...options, logs: prev.logs })), 1000);
        }
    }

    // Inform user with message from the server
    socket.on('inform', toastIt);

    // Camera feed paused/unpaused by server eg. due to resolution change
    socket.on('system-pause', (paused: boolean) => setUIOpts({ serverPaused: paused }, paused));

    // Camera feed paused/unpaused by user
    socket.on('paused', (paused: boolean) => setUIOpts({ userPaused: paused }, paused));

    // Server has come back online, unpause the feed
    socket.on('yo', () => {
        setUIOpts({ serverPaused: false, userPaused: false, serverOnline: true }, false);
        // setTimeout(() => document.querySelector('.loader')?.remove(), 500);
    })

    // Clean up the listeners
    return () => {
        socket.off('yo');
        socket.off('inform');
        socket.off('paused');
        socket.off('system-pause');
    }
}