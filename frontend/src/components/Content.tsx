import clsx from 'clsx';
import '../styles/App.sass'
import * as Icon from 'react-bootstrap-icons';
import PrivacyZoneShape from './ZoneShape';
import ZoneOptions from './content-options/ZoneOptions';
import RecordingScheduleOptions from './content-options/RecordingScheduleOptions';
import MoreOptions from './content-options/MoreOptions';
import RecordingsOptions from './content-options/RecordingsOptions';

import { useEffect, useRef } from 'react';
import { setupListeners, socket } from '../utils/socket'
import { useUIOptions } from './context-providers/ui-configs';
import { useAdditionalOptions } from "./context-providers/sidebar-additional-options";


export default function Content() {
  const feedImgRef = useRef(null);
  const { additionalOption } = useAdditionalOptions();
  const { uiOptions: opts, setUIOptions } = useUIOptions()

  // Setup socket listeners on mount
  useEffect(() => setupListeners({ uiOptions: opts, setUIOptions }), []);

  return (
    <main>
      <div className='video [&:not(:hover)>_.feed-controls]:hidden' data-msg={opts.serverPaused || (!opts.serverOnline && 'Server offline') || undefined}>
        {additionalOption.zones && <PrivacyZoneShape feedImgRef={feedImgRef} />}
        {/* <img className="feed t2" src="https://unsplash.it/752/565" alt="feed" ref={feedImgRef} /> */}
        <img className={clsx("feed t2", { hidden: !opts.lastUpdated })} src="http://127.0.0.1:5000/feed" alt="" ref={feedImgRef} />
        <div className={clsx("feed-controls shows-up relative h-0 grid place-content-center", { hidden: opts.serverPaused || !opts.lastUpdated })}>
          <div className="controls bg-background2 dark:shadow-none shadow-xl min-w-[150px] h-[30px] rounded-[100px] flex place-content-center cursor-pointer" onClick={() => socket.emit('pause')}>
            <div className="play-pause grid place-content-center">
              {opts.userPaused || opts.serverPaused || !opts.serverOnline ? <Icon.PlayFill size={20} /> : <Icon.PauseFill size={20} />}
            </div>
          </div>
        </div>
      </div>

      <div className="controls-panel t2">
        {additionalOption.zones && <ZoneOptions />}
        {additionalOption.moreOptions && <MoreOptions />}
        {additionalOption.scheduleRecordings && <RecordingScheduleOptions />}
        {(additionalOption.recordings || Object.keys(additionalOption).length === 0) && <RecordingsOptions />}
      </div>
    </main>
  )
}
