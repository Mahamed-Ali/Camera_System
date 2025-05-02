import * as Icon from 'react-bootstrap-icons';

import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from '../ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card"
import { defaultOptions, useOptions } from '../context-providers/options';
import { socket } from '../../utils/socket';

export default function MoreOptions() {
  const { options: opts, setOptions } = useOptions();

  function updateOptions() {
    // Using 'bulk ' event rather than individual events to reduce the number of events sent to the server,
    // number of listeners, and better server management for bulk updates.
    const data = {
      motionwait: opts.motionwait,
      linelimit: opts.linelimit,
      resolution: opts.resolution,
      // resolution: opts.resolution?.filter(v => v),
      // resolution: opts.resolution?.map(v => v || 0),
    }

    // Confirm that the user has made a change to the resolution
    if (data.resolution?.toString() !== defaultOptions.resolution?.toString())
      // If recording is in progress, make sure the user knows that changing the resolution will stop the recording
      if ((window as any).recording && !confirm('Seems like there is a recording in progress. Changing the resolution will stop the recording.\n\nDo you want to continue?'))
        return;

    socket.emit('option-update', 'bulk', data);
  }

  return (
    <div className="h-full">
      <h1>More Options</h1>
      <p className='!mb-[30px]'>Additional settings for the camera.</p>
      <div className='content'>
        <section className='flex flex-col gap-[20px]'>
          <div className="flex flex-col">
            <div className='flex place-items-center'>
              <Label htmlFor="linelimit">Max number of lines in log file</Label>
              <HoverCard openDelay={200} closeDelay={200}>
                <HoverCardTrigger>
                  <Icon.InfoCircle className='info-popup' /></HoverCardTrigger>
                <HoverCardContent>
                  Activity logs are stored in a csv file.
                  <br /><br />
                  When the line limit is reached, the oldest log entry is removed to make space for the new one.
                </HoverCardContent>
              </HoverCard>
            </div>
            <Input type="number" id="linelimit" placeholder="Enter number" min={0} defaultValue={opts.linelimit as number} className="input mt-[15px] mb-[10px]" onChange={e => setOptions({ ...opts, linelimit: parseInt(e.target.value) || null })} />
            <p className='opacity-70 dark:opacity-50'>0 means no limit</p>
          </div>

          <div className="flex flex-col">
            <div className='flex place-items-center'>
              <Label htmlFor="motionwait">Motion detection cooldown</Label>
              <HoverCard openDelay={200} closeDelay={200}>
                <HoverCardTrigger>
                  <Icon.InfoCircle className='info-popup' /></HoverCardTrigger>
                <HoverCardContent>
                  The time in seconds to wait before detecting motion again and notifying if enabled. 0 means no cooldown.
                </HoverCardContent>
              </HoverCard>
            </div>
            <Input type="number" id="motionwait" placeholder="Enter number" min={0} defaultValue={opts.motionwait as number} className="input mt-[15px] mb-[10px]" onChange={e => setOptions({ ...opts, motionwait: parseInt(e.target.value) || null })} />
            <p className='opacity-70 dark:opacity-50'>Time in seconds</p>
          </div>

          <div className="flex flex-col">
            <div className='flex place-items-center'>
              <Label htmlFor="motionwait">Resolution</Label>
              <HoverCard openDelay={200} closeDelay={200}>
                <HoverCardTrigger>
                  <Icon.InfoCircle className='info-popup' /></HoverCardTrigger>
                <HoverCardContent>
                  Higher resolutions require more processing and will slow down the camera.
                  <br /><br />
                  Leave empty to use the default resolution.
                </HoverCardContent>
              </HoverCard>
            </div>
            <div className='flex place-content-center place-items-center justify-between'>
              <Input type="number" id="resX" placeholder="Width" min={0} defaultValue={opts.resolution?.[0]} className="input mt-[15px] mb-[10px] w-[42%] pr-0" onChange={e => setOptions({ ...opts, resolution: [parseInt(e.target.value) || 0, opts.resolution?.[1] || 0] })} />
              <span>x</span>
              <Input type="number" id="resY" placeholder="Height" min={0} defaultValue={opts.resolution?.[1]} className="input mt-[15px] mb-[10px] w-[42%] pr-0" onChange={e => setOptions({ ...opts, resolution: [opts.resolution?.[0] || 0, parseInt(e.target.value) || 0] })} />
            </div>
            <p className='opacity-70 dark:opacity-50'></p>
          </div>
        </section>
        <section>
          <Button className="save-button mt-[3%]" onClick={updateOptions}>Save</Button>
        </section>
      </div>
    </div>
  )
}
