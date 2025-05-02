import clsx from 'clsx';
import moment from 'moment';
import * as Icon from 'react-bootstrap-icons';
import { useEffect, useRef } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from "./ui/navigation-menu"
import { UIOptions, UIOptionsContextType, useUIOptions } from './context-providers/ui-configs';
import { socket } from '../utils/socket';
import { logIcon, readableDate, uniqueObjects } from '../utils/utils';

export const poweroff = () => confirm('Do you really want to power off?') && socket.emit('poweroff')
export const restart = () => confirm('The system will reboot, the server should auto-start. Do you want to reboot?') && socket.emit('reboot')

function fetchLogs(setUIOptions: UIOptionsContextType['setUIOptions']) {
  fetch('/api/activitylogs.csv')
    .then(res => {
      if (!res.ok) throw res
      return res.text();
    }).then(text => {
      if (!text) return;
      setUIOptions(uiOptions => ({
        ...uiOptions, logs: uniqueObjects(text.split('\n')
          .slice(1) // Remove header
          .filter(line => line.trim()) // Filter out empty lines
          .reverse() // Most recent first
          .map(line => {
            const [timestamp, shortMessage, longMessage, logType] = line.trim().split(',');
            return { timestamp, shortMessage, longMessage, logType };
          }))
      }));
    })
    .catch(console.error);
}

export default function Header() {
  const { uiOptions, setUIOptions } = useUIOptions();
  const timeRef = useRef(null);
  const unseen = uiOptions.notifications?.filter(n => !n.seen).length;

  useEffect(() => {
    let serverOffline = () => setUIOptions(prev => ({ ...prev, serverOnline: false }));
    let setOfflineSoon = setTimeout(serverOffline, 2000);

    // Check server status every second, also used for time sync
    setInterval(() => socket.emit('yo, you alive?'), 1000);

    // If the server responds within 2 seconds, setOfflineSoon will be canceled
    socket.on('alive and not kicking because I have not legs', (date: string) => {
      // Cancel the offline timeout because the server is online
      clearTimeout(setOfflineSoon);
      // Set the timeout check again, should be canceled again in a second if the server is online
      setOfflineSoon = setTimeout(serverOffline, 2000);
      setUIOptions(prev => ({ ...prev, serverOnline: true, lastUpdated: date }));

      if (timeRef.current === null)
        return;

      // Better to use the server's time rather than the client's
      const time = moment(date);

      (timeRef.current as HTMLElement).querySelector('.hour')!.textContent = time.format('HH');
      (timeRef.current as HTMLElement).querySelector('.mins')!.textContent = time.format('mm');
      (timeRef.current as HTMLElement).querySelector('.rest')!.textContent = time.format('ss MMMM D');
    });

    socket.on('new-log', (newLog: string[]) => {
      // Empty value means logs have been cleared
      if (!newLog)
        return setUIOptions(prev => ({ ...prev, logs: [] }));

      // Add new entry to log list
      const [timestamp, shortMessage, longMessage, logType] = newLog;
      const log = { timestamp, shortMessage, longMessage, logType };

      setUIOptions(prev => ({ ...prev, logs: uniqueObjects([log, ...prev.logs!]) }));
    });

    socket.on('notify', (newLog: string[]) => { // [timestamp, shortMessage, logType]
      const log = { timestamp: newLog[0], shortMessage: newLog[1], logType: newLog[2] };
      console.log('notify', log);

      setUIOptions(prev => ({ ...prev, notifications: uniqueObjects([log, ...(prev.notifications || [])]) }));
    });

    // Fetch logs when server comes online
    socket.on('yo', () => fetchLogs(setUIOptions));
  }, []);

  return (
    <NavigationMenu>
      <h1 className='font-bold text-2xl'>Camera Dashboard</h1>
      <div className='nav-lists flex gap-[20px] place-items-center'>
        <NavigationMenuList className='flex gap-[15px]'>
          <NavigationMenuItem className='nav-link !bg-transparent t2'>
            <Tooltip>
              <div className="option">
                <TooltipTrigger>
                  <div className={clsx('option rec bg-[#00000066] dark:bg-[#ffffff66]', { 'live': !uiOptions.serverPaused && !uiOptions.userPaused && uiOptions.serverOnline })}></div>
                </TooltipTrigger>
                <TooltipContent side='bottom' sideOffset={24} className='bg-[#00000085] dark:bg-[#3b3b3f73] backdrop-blur-[5px] -translate-y-3'>
                  <div className='place-items-baseline flex gap-[10px]'>
                    <div className={clsx('rec bg-[#ffffff66] !animate-none', { 'live': !uiOptions.serverPaused && !uiOptions.userPaused && uiOptions.serverOnline })}></div>
                    <div>{!uiOptions.serverPaused && !uiOptions.userPaused && uiOptions.serverOnline ? 'Live' : !uiOptions.serverOnline ? 'Server offline' : 'Paused'}</div>
                  </div>
                </TooltipContent>
              </div>
            </Tooltip>
          </NavigationMenuItem>

          {(uiOptions.serverOnline || uiOptions.lastUpdated) && <time className='nav-link t2' ref={timeRef}>
            <span className="hour"></span>
            <span className={clsx('px-[5px]', { 'animate-[pulsing_1s_infinite]': uiOptions.serverOnline })}>:</span>
            <span className="mins"></span>
            <span className={clsx('px-[5px]', { 'animate-[pulsing_1s_infinite]': uiOptions.serverOnline })}>:</span>
            <span className="rest"></span>
          </time>}

          <NavigationMenuItem className={clsx('nav-link notifications t2', { new: uiOptions.notifications?.some(n => !n.seen) })}>
            <div className="option">
              <NavigationMenuTrigger>
                <Icon.BellFill data-number={3} className='icon cursor-pointer' />
              </NavigationMenuTrigger>

              <NavigationMenuContent className='nav-content'>
                <Notifictions opts={uiOptions} setUIOptions={setUIOptions} unseen={unseen!} />
              </NavigationMenuContent>

            </div>
          </NavigationMenuItem>
          <NavigationMenuItem className='nav-link power t2'>
            <div className="option power">
              <NavigationMenuTrigger>
                <svg className='icon cursor-pointer' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink='http://www.w3.org/1999/xlink' width="512" height="512" x="0" y="0" viewBox="0 0 32 32" xmlSpace="preserve" fill="currentColor">
                  <g>
                    <path d="M22.364 6.808a2 2 0 0 0 0 2.828 9 9 0 1 1-12.728 0 2 2 0 0 0-2.828-2.828 13 13 0 1 0 18.384 0 2 2 0 0 0-2.828 0z"></path>
                    <path d="M16 15.8a2.01 2.01 0 0 0 2-2V5a2 2 0 0 0-4 0v8.8a2.01 2.01 0 0 0 2 2z"></path>
                  </g>
                </svg>
              </NavigationMenuTrigger>
              <NavigationMenuContent className='nav-content'>
                <div className="nav-content-options power-options">
                  <div className="option power-off cursor-pointer" onClick={poweroff}>
                    <section>
                      <div className='icon-wrapper'>
                        {/* <Icon.Power size={17} className='icon' /> */}
                        <svg className='icon w-[16px] h-[16px] -translate-y-[.5px]' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink='http://www.w3.org/1999/xlink' width="512" height="512" x="0" y="0" viewBox="0 0 32 32" xmlSpace="preserve">
                          <g>
                            <path d="M22.364 6.808a2 2 0 0 0 0 2.828 9 9 0 1 1-12.728 0 2 2 0 0 0-2.828-2.828 13 13 0 1 0 18.384 0 2 2 0 0 0-2.828 0z"></path>
                            <path d="M16 15.8a2.01 2.01 0 0 0 2-2V5a2 2 0 0 0-4 0v8.8a2.01 2.01 0 0 0 2 2z"></path>
                          </g>
                        </svg>
                      </div>
                      <div>Power off device</div>
                    </section>
                    <section>
                      <p>You will need to replug to power on</p>
                    </section>
                  </div>
                  <div className="option restart cursor-pointer" onClick={restart}>
                    <section>
                      <div className='icon-wrapper'>
                        {/* <Icon.ArrowClockwise size={16} className='icon' /> */}
                        <svg className='icon w-[13px] h-[13px] translate-y-[.5px] rotate-[90deg]' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 303.596 303.596" xmlSpace="preserve">
                          <g>
                            <path d="M273.193 62.099C245.08 25.376 202.332 4.314 155.911 4.314c-32.636 0-63.584 10.485-89.5 30.323a148.134 148.134 0 0 0-25.245 24.642L34.581 21.98c-.721-4.079-4.615-6.807-8.69-6.082L6.196 19.374a7.496 7.496 0 0 0-6.082 8.689l15.646 88.629a7.504 7.504 0 0 0 8.69 6.082l88.63-15.646a7.5 7.5 0 0 0 6.082-8.689l-3.477-19.695a7.5 7.5 0 0 0-8.689-6.082l-36.933 6.52a112.971 112.971 0 0 1 17.624-16.754c19.762-15.127 43.361-23.122 68.247-23.122 35.419 0 68.028 16.063 89.469 44.069 18.266 23.86 26.146 53.406 22.19 83.194-3.957 29.789-19.277 56.254-43.138 74.519-19.818 15.171-43.38 23.19-68.139 23.19a114.85 114.85 0 0 1-15.057-.999c-29.788-3.956-56.253-19.275-74.519-43.137-11.118-14.523-18.59-31.659-21.609-49.556a7.502 7.502 0 0 0-8.644-6.148l-19.721 3.327a7.501 7.501 0 0 0-6.148 8.643c3.963 23.495 13.759 45.975 28.33 65.009 23.948 31.284 58.647 51.37 97.702 56.557a150.203 150.203 0 0 0 19.708 1.308c32.486 0 63.39-10.514 89.369-30.402 31.285-23.948 51.371-58.647 56.558-97.703 5.19-39.056-5.142-77.794-29.092-109.078z"></path>
                          </g>
                        </svg>
                      </div>
                      <div>Restart device</div>
                    </section>
                    <section>
                      <p>The webserver should auto-start</p>
                    </section>
                  </div>
                </div>
              </NavigationMenuContent>
            </div>
          </NavigationMenuItem>
        </NavigationMenuList>
      </div>
    </NavigationMenu>
  )
}




function Notifictions({ opts, setUIOptions, unseen }: { opts: UIOptions, setUIOptions: UIOptionsContextType['setUIOptions'], unseen: number }) {
  // Mark all notifications as seen to remove the new badge
  // unseen && opts.notifications?.forEach(n => n.seen = true);
  unseen && setUIOptions(prev => ({ ...prev, notifications: prev.notifications?.map(n => ({ ...n, seen: true })) }));

  // Use only the first 5 unique notifications.
  const notifs = uniqueObjects((opts.notifications) || []).slice(0, 5);

  return (
    <>
      <div className="nav-content-options notification-options">
        {/* Use only the first 3 notifications or logs if no notifications */}
        {notifs.map((log, i) => (
          <div className="option" key={i}>
            <section>
              <div className='icon-wrapper'>
                {logIcon(log.logType)}
              </div>
              <div>
                <span>{log.shortMessage}</span>
                <time className='opacity-50'>at {readableDate(log.timestamp)}</time>
              </div>
            </section>
          </div>
        ))}

        {/* <div className={clsx('text-[90%] mr-[4px]', { 'opacity-50': opts.notifications?.length })}>{opts.notifications?.length ? 'See more in activity logs' : 'No notifications'}</div> */}
        {!opts.notifications?.length && <div className={'text-[90%] mr-[4px]'}>{'No notifications'}</div>}
      </div>

      <div className="nav-content-options notification-options template hidden">
        <div className="option">
          <section>
            <div className='icon-wrapper'>
              <Icon.PersonWalking size={16} className='icon' />
            </div>
            <div>
              <span>Motion detected</span>
              <time className='opacity-50'>at 21:43 on April 1 2024</time>
            </div>
          </section>
        </div>
        <div className="option">
          <section>
            <div className='icon-wrapper'>
              {/* <Icon.JournalX size={16} className='icon translate-y-[.5px]' /> */}
              <svg className='icon w-[16px] h-[16px] mr-[1px]' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" xmlSpace="preserve">
                <g>
                  <path d="M403.005 44.611c0-13.529-11.043-24.566-24.572-24.566-79.195-.005-307.864 0-307.864 0-18.816 0-34.071 15.255-34.071 34.071v36.772h24.684v-29.16c0-4.686 1.908-8.937 4.986-12.014a16.946 16.946 0 0 1 12.014-4.986v.028l99.931-.001h183.208v-.028c4.686 0 8.937 1.908 12.014 4.986a16.95 16.95 0 0 1 4.985 12.014v135.94l24.684-24.684V44.611zm18.49 129.682 44.202 44.202 17.686-17.686c12.156-12.156 12.156-32.047.001-44.203-12.156-12.156-32.047-12.155-44.203 0l-17.686 17.687zm-155.15 155.15-19.324 49.201c-1.465 3.731-.666 7.729 2.121 10.609 2.788 2.881 6.757 3.811 10.534 2.469l50.87-18.077s.124-.124.367-.362l-44.205-44.205-.363.365zm189.453-101.048L320.811 363.381l-44.202-44.202 134.986-134.986zm-77.477 97.275 24.684-24.684v166.403c0 13.534-11.043 24.566-24.572 24.566-79.195.005-307.864 0-307.864 0-18.816 0-34.071-15.255-34.071-34.071v-36.772h24.684v29.159c0 4.665 1.907 8.907 4.983 11.985a16.949 16.949 0 0 0 12.01 4.987l283.146.001v.027c4.686 0 8.937-1.908 12.014-4.986a16.95 16.95 0 0 0 4.985-12.014V325.67zM23.062 104.887H81.62a3.579 3.579 0 0 1 3.561 3.561v19.448a3.579 3.579 0 0 1-3.561 3.561H23.062a3.58 3.58 0 0 1-3.562-3.561v-19.448a3.579 3.579 0 0 1 3.562-3.561zm0 275.656a3.58 3.58 0 0 0-3.562 3.561v19.448a3.579 3.579 0 0 0 3.562 3.561H81.62a3.579 3.579 0 0 0 3.561-3.561v-19.448a3.579 3.579 0 0 0-3.561-3.561zm0-91.886a3.58 3.58 0 0 0-3.562 3.561v19.447a3.58 3.58 0 0 0 3.562 3.562H81.62a3.579 3.579 0 0 0 3.561-3.562v-19.447a3.579 3.579 0 0 0-3.561-3.561zm0-91.885H81.62a3.579 3.579 0 0 1 3.561 3.561v19.447a3.58 3.58 0 0 1-3.561 3.562H23.062a3.58 3.58 0 0 1-3.562-3.562v-19.447a3.579 3.579 0 0 1 3.562-3.561zm13.436-51.315h24.684v37.316H36.498zm0 91.885v37.315h24.684v-37.315zm0 91.885v37.316h24.684v-37.316zM361.322 58.7v.028c.821 0 1.57.338 2.115.884a2.99 2.99 0 0 1 .884 2.116v149.941L256.445 319.544l-2.064 2.064-20.391 51.918c-3.461 8.812-1.492 18.659 5.091 25.463 6.602 6.822 16.337 9.104 25.283 5.925l53.848-19.135 2.234-2.234 43.874-43.874v110.602c0 .821-.338 1.571-.884 2.116a2.988 2.988 0 0 1-2.115.884v.027l-237.348-.001V58.701zm-251.349.001v394.598H78.176c-.818 0-1.566-.34-2.111-.886a3.018 3.018 0 0 1-.881-2.141v-29.159h6.437c9.681 0 17.561-7.881 17.561-17.561v-19.448c0-9.681-7.88-17.561-17.561-17.561h-6.437v-37.316h6.437c9.681 0 17.561-7.881 17.561-17.561v-19.447c0-9.681-7.88-17.561-17.561-17.561h-6.437v-37.315h6.437c9.681 0 17.561-7.881 17.561-17.561v-19.447c0-9.681-7.88-17.561-17.561-17.561h-6.437v-37.316h6.437c9.681 0 17.561-7.88 17.561-17.561v-19.448c0-9.681-7.88-17.561-17.561-17.561h-6.437v-29.16c0-.821.338-1.57.884-2.116a2.99 2.99 0 0 1 2.116-.884V58.7h31.789zm72.283 44.963h123.782c4.686 0 8.937 1.908 12.015 4.985a16.953 16.953 0 0 1 4.985 12.015v44.888c0 4.686-1.908 8.937-4.985 12.015a16.953 16.953 0 0 1-12.015 4.985H182.256a16.953 16.953 0 0 1-12.015-4.985 16.952 16.952 0 0 1-4.985-12.015v-44.888c0-4.686 1.908-8.937 4.985-12.015a16.953 16.953 0 0 1 12.015-4.985zm123.782 14c.822 0 1.571.339 2.116.884s.884 1.295.884 2.116v44.888c0 .822-.338 1.571-.884 2.116a2.99 2.99 0 0 1-2.116.883H182.256c-.821 0-1.571-.338-2.116-.883s-.884-1.295-.884-2.116v-44.888c0-.821.339-1.571.884-2.116s1.295-.884 2.116-.884z"></path>
                </g>
              </svg>
            </div>
            <div>
              <span>Logging off</span>
              <time className='opacity-50'>at 21:42 on April 1 2024</time>
            </div>
          </section>
        </div>
        <div className="option">
          <section>
            <div className='icon-wrapper'>
              {/* <Icon.JournalCheck size={16} className='icon translate-y-[.5px]' /> */}
              <svg className='icon w-[16px] h-[16px] mr-[1px]' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" xmlSpace="preserve">
                <g>
                  <path d="M403.005 44.611c0-13.529-11.043-24.566-24.572-24.566-79.195-.005-307.864 0-307.864 0-18.816 0-34.071 15.255-34.071 34.071v36.772h24.684v-29.16c0-4.686 1.908-8.937 4.986-12.014a16.946 16.946 0 0 1 12.014-4.986v.028l99.931-.001h183.208v-.028c4.686 0 8.937 1.908 12.014 4.986a16.95 16.95 0 0 1 4.985 12.014v135.94l24.684-24.684V44.611zm18.49 129.682 44.202 44.202 17.686-17.686c12.156-12.156 12.156-32.047.001-44.203-12.156-12.156-32.047-12.155-44.203 0l-17.686 17.687zm-155.15 155.15-19.324 49.201c-1.465 3.731-.666 7.729 2.121 10.609 2.788 2.881 6.757 3.811 10.534 2.469l50.87-18.077s.124-.124.367-.362l-44.205-44.205-.363.365zm189.453-101.048L320.811 363.381l-44.202-44.202 134.986-134.986zm-77.477 97.275 24.684-24.684v166.403c0 13.534-11.043 24.566-24.572 24.566-79.195.005-307.864 0-307.864 0-18.816 0-34.071-15.255-34.071-34.071v-36.772h24.684v29.159c0 4.665 1.907 8.907 4.983 11.985a16.949 16.949 0 0 0 12.01 4.987l283.146.001v.027c4.686 0 8.937-1.908 12.014-4.986a16.95 16.95 0 0 0 4.985-12.014V325.67zM23.062 104.887H81.62a3.579 3.579 0 0 1 3.561 3.561v19.448a3.579 3.579 0 0 1-3.561 3.561H23.062a3.58 3.58 0 0 1-3.562-3.561v-19.448a3.579 3.579 0 0 1 3.562-3.561zm0 275.656a3.58 3.58 0 0 0-3.562 3.561v19.448a3.579 3.579 0 0 0 3.562 3.561H81.62a3.579 3.579 0 0 0 3.561-3.561v-19.448a3.579 3.579 0 0 0-3.561-3.561zm0-91.886a3.58 3.58 0 0 0-3.562 3.561v19.447a3.58 3.58 0 0 0 3.562 3.562H81.62a3.579 3.579 0 0 0 3.561-3.562v-19.447a3.579 3.579 0 0 0-3.561-3.561zm0-91.885H81.62a3.579 3.579 0 0 1 3.561 3.561v19.447a3.58 3.58 0 0 1-3.561 3.562H23.062a3.58 3.58 0 0 1-3.562-3.562v-19.447a3.579 3.579 0 0 1 3.562-3.561zm13.436-51.315h24.684v37.316H36.498zm0 91.885v37.315h24.684v-37.315zm0 91.885v37.316h24.684v-37.316zM361.322 58.7v.028c.821 0 1.57.338 2.115.884a2.99 2.99 0 0 1 .884 2.116v149.941L256.445 319.544l-2.064 2.064-20.391 51.918c-3.461 8.812-1.492 18.659 5.091 25.463 6.602 6.822 16.337 9.104 25.283 5.925l53.848-19.135 2.234-2.234 43.874-43.874v110.602c0 .821-.338 1.571-.884 2.116a2.988 2.988 0 0 1-2.115.884v.027l-237.348-.001V58.701zm-251.349.001v394.598H78.176c-.818 0-1.566-.34-2.111-.886a3.018 3.018 0 0 1-.881-2.141v-29.159h6.437c9.681 0 17.561-7.881 17.561-17.561v-19.448c0-9.681-7.88-17.561-17.561-17.561h-6.437v-37.316h6.437c9.681 0 17.561-7.881 17.561-17.561v-19.447c0-9.681-7.88-17.561-17.561-17.561h-6.437v-37.315h6.437c9.681 0 17.561-7.881 17.561-17.561v-19.447c0-9.681-7.88-17.561-17.561-17.561h-6.437v-37.316h6.437c9.681 0 17.561-7.88 17.561-17.561v-19.448c0-9.681-7.88-17.561-17.561-17.561h-6.437v-29.16c0-.821.338-1.57.884-2.116a2.99 2.99 0 0 1 2.116-.884V58.7h31.789zm72.283 44.963h123.782c4.686 0 8.937 1.908 12.015 4.985a16.953 16.953 0 0 1 4.985 12.015v44.888c0 4.686-1.908 8.937-4.985 12.015a16.953 16.953 0 0 1-12.015 4.985H182.256a16.953 16.953 0 0 1-12.015-4.985 16.952 16.952 0 0 1-4.985-12.015v-44.888c0-4.686 1.908-8.937 4.985-12.015a16.953 16.953 0 0 1 12.015-4.985zm123.782 14c.822 0 1.571.339 2.116.884s.884 1.295.884 2.116v44.888c0 .822-.338 1.571-.884 2.116a2.99 2.99 0 0 1-2.116.883H182.256c-.821 0-1.571-.338-2.116-.883s-.884-1.295-.884-2.116v-44.888c0-.821.339-1.571.884-2.116s1.295-.884 2.116-.884z"></path>
                </g>
              </svg>
            </div>
            <div>
              <span>Logging on</span>
              <time className='opacity-50'>at 21:43 on April 1 2024</time>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
