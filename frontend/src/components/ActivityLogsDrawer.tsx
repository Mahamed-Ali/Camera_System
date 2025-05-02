import '../styles/ActivityLogsDrawer.sass'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
import { DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "./ui/drawer"
import { useUIOptions } from './context-providers/ui-configs';
import { formatMessage, logIcon, readableDate } from '../utils/utils'
import { socket } from '../utils/socket';
import { Button } from "./ui/button"

export default function ActivityLogs() {
    const { uiOptions } = useUIOptions();

    return (
        // <DrawerContent className='logs-content'>
<DrawerContent className="logs-content w-[400px] fixed right-0 top-0 h-full  z-50 shadow-xl p-6 overflow-y-auto animate-slide-in-from-right">



            <DrawerHeader className='gap-[20px] mb-2'>
                <DrawerTitle>Activity logs</DrawerTitle>
                <DrawerDescription>Most recent logs are shown first</DrawerDescription>
            </DrawerHeader>
            <Accordion type="single" collapsible className="mx-[20px] overflow-y-auto max-h-[60vh]">
                {uiOptions.logs?.map((log, i) => (
                    <AccordionItem key={i} value={`item-${i}`}>
                        <AccordionTrigger>
                            <div className="log-item">
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
                        </AccordionTrigger>
                        <AccordionContent className="mx-[20px]">
                            {formatMessage(log.longMessage)}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
            <DrawerFooter>
                <DrawerClose>
                    <Button variant="link" onClick={() => socket.emit('clear-logs')}>Clear logs</Button>
                </DrawerClose>
            </DrawerFooter>
        </DrawerContent>
    )

    return (
        <DrawerContent className='logs-content template hidden'>
            <DrawerHeader className='gap-[20px] mb-2'>
                <DrawerTitle>Activity logs</DrawerTitle>
                <DrawerDescription>Click on a log message to view more details.</DrawerDescription>
            </DrawerHeader>
            <Accordion type="single" collapsible className="mx-[20px] overflow-y-auto mh-[70vh]">
                <AccordionItem value="item-0">
                    <AccordionTrigger>
                        <div className="log-item">
                            <section>
                                <div className='icon-wrapper'>
                                    {logIcon('autostart')}
                                </div>
                                <div>
                                    <span>Web server auto-started</span>
                                    <time className='opacity-50'>at 23:53 on June 15 2024</time>
                                </div>
                            </section>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="mx-[20px]">
                        Web server was started automatically after reboot.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <div className="log-item">
                            <section>
                                <div className='icon-wrapper'>
                                    {logIcon('poweroff')}
                                </div>
                                <div>
                                    <span>Device powered off</span>
                                    <time className='opacity-50'>at 23:53 on June 15 2024</time>
                                </div>
                            </section>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="mx-[20px]">
                        Device was powered off through the dashboard.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>
                        <div className="log-item">
                            <section>
                                <div className='icon-wrapper'>
                                    {logIcon('reboot')}
                                </div>
                                <div>
                                    <span>Device restarted</span>
                                    <time className='opacity-50'>at 21:43 on April 1 2024</time>
                                </div>
                            </section>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="mx-[20px]">
                        Device was restarted through the dashboard.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                    <AccordionTrigger>
                        <div className="log-item">
                            <section>
                                <div className='icon-wrapper'>
                                    {logIcon('motiondetection')}
                                </div>
                                <div>
                                    <span>Motion detected</span>
                                    <time className='opacity-50'>at 21:43 on April 1 2024</time>
                                </div>
                            </section>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="mx-[20px]">
                        Motion was detected.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                    <AccordionTrigger>
                        <div className="log-item">
                            <section>
                                <div className='icon-wrapper'>
                                    {logIcon('logging')}
                                </div>
                                <div>
                                    <span>Activity logging turned off</span>
                                    <time className='opacity-50'>at 21:42 on April 1 2024</time>
                                </div>
                            </section>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="mx-[20px]">
                        Activity logging was disabled through the dashboard.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                    <AccordionTrigger>
                        <div className="log-item">
                            <section>
                                <div className='icon-wrapper'>
                                    {logIcon('logging')}
                                </div>
                                <div>
                                    <span>Activity logging turned on</span>
                                    <time className='opacity-50'>at 21:43 on April 1 2024</time>
                                </div>
                            </section>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="mx-[20px]">
                        Activity logging was enabled through the dashboard.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-6">
                    <AccordionTrigger>
                        <div className="log-item">
                            <section>
                                <div className='icon-wrapper'>
                                    {logIcon('recording247')}
                                </div>
                                <div>
                                    <span>Recording on</span>
                                    <time className='opacity-50'>at 21:43 on April 1 2024</time>
                                </div>
                            </section>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="mx-[20px]">
                        Recording turned on through the dashboard.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-7">
                    <AccordionTrigger>
                        <div className="log-item">
                            <section>
                                <div className='icon-wrapper'>
                                    {logIcon('recording247')}
                                </div>
                                <div>
                                    <span>Recording off</span>
                                    <time className='opacity-50'>at 21:43 on April 1 2024</time>
                                </div>
                            </section>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="mx-[20px]">
                        Recording turned off through the dashboard.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-8">
                    <AccordionTrigger>
                        <div className="log-item">
                            <section>
                                <div className='icon-wrapper'>
                                    {logIcon('schedule')}
                                </div>
                                <div>
                                    <span>Scheduled recording enabled</span>
                                    <time className='opacity-50'>at 21:43 on April 1 2024</time>
                                </div>
                            </section>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="mx-[20px]">
                        Automatic recording enabled at 12:00 PM to 1:00 PM.
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            <DrawerFooter>
                <DrawerClose>
                    <Button variant="link">Close</Button>
                </DrawerClose>
            </DrawerFooter>
        </DrawerContent>
    )
}
