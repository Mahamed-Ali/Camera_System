import { Calendar } from "../../components/ui/calendar"
import { TimeField } from "../ui/time-field"
import { Button } from "../ui/button";
import { toast } from "../ui/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { setTimeToDate } from "../../utils/utils";
import { useOptions } from "../context-providers/options";
import { socket } from "../../utils/socket";
import { TimeValue } from "react-aria";
import { cn } from "../../lib/utils";
import { DateTimeFormatOptions } from "luxon";

export default function Recordings() {
	const { options: { schedule: sched }, options, setOptions } = useOptions()
	const [hFrom, mFrom, sFrom] = sched.time?.from?.split(':').map(Number) || [0, 0, 0];
	const [hTo, mTo, sTo] = sched.time?.to?.split(':').map(Number) || [0, 0, 0];
	const timeOptions: DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false };

	function updateSchedule(remove: Boolean): void {
		if (remove) {
			setOptions({ ...options, schedule: { ...sched, defaultEmpty: true } });
			socket.emit('option-update', 'schedule', null);
			return;
		}

		// Join date and time to create a new date object
		const dateFrom = setTimeToDate(sched.date?.from, sched.time?.from || '00:00:00');
		const dateTo = sched.date?.to
			? setTimeToDate(sched.date?.to, sched.time?.to || '00:00:00')
			: setTimeToDate(sched.date?.from, sched.time?.to || sched.time?.from || '00:00:00');

		const fullSched = { date: { from: dateFrom, to: dateTo }, time: { from: dateFrom.toLocaleTimeString("en-us", timeOptions), to: dateTo?.toLocaleTimeString("en-us", timeOptions) } }
		const now = new Date();
		// console.log({ 1: sched.date?.from, 2: sched.date?.to })
		console.log({ from: dateFrom, to: dateTo })
		console.log(fullSched)

		// Make sure the start date and time are in the future
		if (dateFrom < setTimeToDate(now, now.toLocaleTimeString("en-us", timeOptions))) {
			var x = setTimeToDate(now, now.toLocaleTimeString("en-us", timeOptions));
			debugger;
			toast({ title: 'Invalid schedule', description: 'Start date and time must be in the future.' });
			return;
		}

		// Save the schedule
		socket.emit('option-update', 'schedule', fullSched);
		// setOptions({ ...options, schedule: fullSched });
	}

	return (
		<div className="h-full">
			<h1>Recording Schedule</h1>
			<p>Pick a date and time range for automatic recording.</p>
			<div className='content h-full'>
				<Calendar initialFocus mode="range" selected={sched.date} onSelect={range => setOptions({ ...options, schedule: { ...sched, date: range } })} className="px-0 flex place" />
				<div className="flex justify-between [&>:last-child]:place-content-end">
					{sched.time?.from
						? <TimeField value={{ hour: hFrom, minute: mFrom, second: sFrom } as TimeValue} onChange={v => setOptions({ ...options, schedule: { ...sched, time: { ...sched.time, from: v.toString() } } })} />
						: <TimeField onChange={v => setOptions({ ...options, schedule: { ...sched, time: { ...sched.time, from: v.toString() } } })} />}
					{sched.time?.to
						? <TimeField value={{ hour: hTo, minute: mTo, second: sTo } as TimeValue} onChange={v => setOptions({ ...options, schedule: { ...sched, time: { ...sched.time, to: v.toString() } } })} />
						: <TimeField onChange={v => setOptions({ ...options, schedule: { ...sched, time: { ...sched.time, to: v.toString() } } })} />}
				</div>
				<section>
					<Tooltip>
						<TooltipTrigger className="cursor-default">
							{sched.date && sched.time?.from && sched.time?.to
								? <Button className="save-button mt-[3%]" onClick={() => updateSchedule(false)}>Save</Button>
								: <Button className="save-button mt-[3%]" disabled>Save</Button>}
						</TooltipTrigger>
						<TooltipContent side='top' sideOffset={24} className={cn('bg-[#00000085] backdrop-blur-[5px] translate-y-[17px]', { '!hidden': sched.date && sched.time?.from && sched.time?.to })}>
							<div className='place-items-baseline flex gap-[10px]'>
								<div>Pick a date and time range first</div>
							</div>
						</TooltipContent>
					</Tooltip>
					{!options.schedule.defaultEmpty && <Button variant={'ghost'} className="mt-[3%] hover:bg-transparent opacity-50 hover:opacity-100 underline transition-opacity" onClick={() => updateSchedule(true)}>Remove schedule</Button>}
				</section>
			</div>
		</div>
	)
}
