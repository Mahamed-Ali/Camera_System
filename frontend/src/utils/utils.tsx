import moment from 'moment';
import * as Icon from 'react-bootstrap-icons';
import { toast } from '../components/ui/use-toast';

export interface Toast {
	title?: string,
	description: string,
	data?: string[]
}

/**
 * Display a toast message to the user.
 * @param title The title of the toast message.
 * @param description The description of the toast message.
 * @param data An array of messages to be displayed in the toast message.
 */
export function toastIt({ title, description, data }: Toast) {
	if (!data) {
		// Straight forward title and description toast message.
		toast({ title: title || 'Info', description: formatMessage(description) });
		return;
	}

	// Multiple messages to be displayed in the toast message.
	// At this point, data will be like this [[title', 'description'], ...]
	// Only titles will be displayed in the toast for conciseness comma-separated.
	description = data.map(arr => arr[0]).map((s, i) => i === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1)).join(', ')
	// Capitalise the first letter of the description.
	description = description.charAt(0).toUpperCase() + description.slice(1);

	toast({
		// If only one message, title will be first message's title.
		title: data.length === 1 ? data[0][0] || 'Info' : 'Info',
		description: formatMessage(data.length === 1 ? data[0][1] : description),
	});
}

/**
 * Rounds a number to a specified number of decimal places.
 * @param num The number to round.
 * https://stackoverflow.com/a/48764436/11848657
 */
export function round(num: number, places = 1) {
	const p = Math.pow(10, places);
	return Math.round(num * p) / p;
}

/**
 * Formats a date to a more readable string format
 */
export function readableDate(date: Date | string | undefined, noUTC = false): string {
	// If date is undefined, use the current date
	const currentYear = moment().year();
	// Apparently adding the 'Z' fixes timezone issues
	let momentDate = moment((typeof date === 'string' ? date.replace(/Z$/, '') + 'Z' : date) || new Date());
		momentDate = noUTC ? momentDate : momentDate.utc();

	// 'Do' is the day of the month with ordinal suffix (1st, 2nd, 3rd, ...), https://momentjs.com/docs/#/displaying/format
	return momentDate.format(`HH:mm [on] MMMM Do${momentDate.year() === currentYear ? '' : ', YYYY'}`);
}

/**
 * Sets the time of a Date object to a specified time string.
 */
export function setTimeToDate(date: Date | undefined, timeString: string | undefined): Date {
	// If date is undefined, use the current date
	const currentDate = moment(date || new Date());

	if (timeString) {
		// If timeString is undefined, use the current time
		const currentTime = timeString || moment().format('HH:mm:ss');

		// Use moment to update the time components
		const [hours, minutes, seconds] = currentTime.split(':').map(Number);
		currentDate.hours(hours).minutes(minutes).seconds(seconds);
	}

	return currentDate.toDate();
}
/**
 * Clean and remove unnecessary properties from an object.
 * Good before sending an object to the server.
 */
export function cleanObject<T>(obj: T): T {
	// Remove defaultEmpty property on object and it's children
	// undefined properties are removed from the object when stringified
	return JSON.parse(JSON.stringify(obj, (k, v) => k === 'defaultEmpty' ? undefined : v));
}

/**
 * Updates a message containing content like ISO dates to use more human-readable formats.
 */
export function formatMessage(message: string): string {
	const regex = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/g;

	return message.replace(regex, (match) => {
		// Use the readableDate function to format the matched date string
		return readableDate(match, true);
	});
}

export function logIcon(type: string) {
	switch (type) {
		case 'motion': case 'motiondetection': return <Icon.PersonWalking className='icon scale-[1.05]' />
		case 'autostart': return <svg className='icon w-[15px] h-[15px]' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 700 700" xmlSpace="preserve"><g><path d="M556.57 290.34 212.32 91.58C166.39 65.07 109 98.21 109 151.24v397.52c0 53 57.41 86.17 103.34 59.66l344.23-198.76c45.93-26.51 45.93-92.81 0-119.32z"></path></g></svg>
		case 'reboot': return <svg className='icon w-[11.5px] h-[11.5px] translate-y-[.5px] scale-[.8] rotate-[90deg]' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 303.596 303.596" xmlSpace="preserve"><g><path d="M273.193 62.099C245.08 25.376 202.332 4.314 155.911 4.314c-32.636 0-63.584 10.485-89.5 30.323a148.134 148.134 0 0 0-25.245 24.642L34.581 21.98c-.721-4.079-4.615-6.807-8.69-6.082L6.196 19.374a7.496 7.496 0 0 0-6.082 8.689l15.646 88.629a7.504 7.504 0 0 0 8.69 6.082l88.63-15.646a7.5 7.5 0 0 0 6.082-8.689l-3.477-19.695a7.5 7.5 0 0 0-8.689-6.082l-36.933 6.52a112.971 112.971 0 0 1 17.624-16.754c19.762-15.127 43.361-23.122 68.247-23.122 35.419 0 68.028 16.063 89.469 44.069 18.266 23.86 26.146 53.406 22.19 83.194-3.957 29.789-19.277 56.254-43.138 74.519-19.818 15.171-43.38 23.19-68.139 23.19a114.85 114.85 0 0 1-15.057-.999c-29.788-3.956-56.253-19.275-74.519-43.137-11.118-14.523-18.59-31.659-21.609-49.556a7.502 7.502 0 0 0-8.644-6.148l-19.721 3.327a7.501 7.501 0 0 0-6.148 8.643c3.963 23.495 13.759 45.975 28.33 65.009 23.948 31.284 58.647 51.37 97.702 56.557a150.203 150.203 0 0 0 19.708 1.308c32.486 0 63.39-10.514 89.369-30.402 31.285-23.948 51.371-58.647 56.558-97.703 5.19-39.056-5.142-77.794-29.092-109.078z"></path></g></svg>
		case 'poweroff': return <svg className='icon w-[15px] h-[15px] -translate-y-[1px]' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink='http://www.w3.org/1999/xlink' width="512" height="512" x="0" y="0" viewBox="0 0 32 32" xmlSpace="preserve" fill="currentColor"><g><path d="M22.364 6.808a2 2 0 0 0 0 2.828 9 9 0 1 1-12.728 0 2 2 0 0 0-2.828-2.828 13 13 0 1 0 18.384 0 2 2 0 0 0-2.828 0z"></path><path d="M16 15.8a2.01 2.01 0 0 0 2-2V5a2 2 0 0 0-4 0v8.8a2.01 2.01 0 0 0 2 2z"></path></g></svg>
		case 'schedule': return <svg className='icon w-[15px] h-[15px] scale-[.9]' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" xmlSpace="preserve"><g><path d="M437.02 74.98C388.667 26.629 324.38 0 256 0S123.333 26.629 74.98 74.98C26.629 123.333 0 187.62 0 256s26.629 132.667 74.98 181.02C123.333 485.371 187.62 512 256 512s132.667-26.629 181.02-74.98C485.371 388.667 512 324.38 512 256s-26.629-132.667-74.98-181.02zM256 454.733c-109.582 0-198.733-89.151-198.733-198.733S146.418 57.267 256 57.267 454.733 146.418 454.733 256 365.582 454.733 256 454.733z"></path><circle cx="256" cy="256" r="12.009"></circle><path d="M256 87.267C162.96 87.267 87.267 162.96 87.267 256S162.96 424.733 256 424.733 424.733 349.04 424.733 256 349.04 87.267 256 87.267zM362.465 271H295.23c-6.053 15.776-21.35 27.009-39.23 27.009-23.164 0-42.009-18.845-42.009-42.009 0-17.88 11.233-33.177 27.009-39.23v-42.484c0-8.284 6.716-15 15-15s15 6.716 15 15v42.484A42.219 42.219 0 0 1 295.23 241h67.235c8.284 0 15 6.716 15 15s-6.716 15-15 15z"></path></g></svg>
		case 'recording247': return <svg className='icon w-[15px] h-[15px] scale-[.9]' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 426.667 426.667" xmlSpace="preserve"><g><path d="M213.333 106.667c-58.88 0-106.667 47.787-106.667 106.667S154.453 320 213.333 320 320 272.213 320 213.333s-47.787-106.666-106.667-106.666z"></path><path d="M213.333 0C95.467 0 0 95.467 0 213.333s95.467 213.333 213.333 213.333S426.667 331.2 426.667 213.333 331.2 0 213.333 0zm0 384c-94.293 0-170.667-76.373-170.667-170.667S119.04 42.667 213.333 42.667 384 119.04 384 213.333 307.627 384 213.333 384z"></path></g></svg>
		case 'shape': return <svg className='icon w-[14px] h-[14px]' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" xmlSpace="preserve"><g><g><path d="M419.72 419.72 92.26 92.27l-.07-.08a19 19 0 0 0-26.78 27l28.67 28.67a332.64 332.64 0 0 0-88.19 89 34.22 34.22 0 0 0 0 38.38C65.86 364 160.93 416 256 415.35a271.6 271.6 0 0 0 90.46-15.16l46.41 46.41a19 19 0 0 0 26.94-26.79zM256 363.74a107.78 107.78 0 0 1-98.17-152.18l29.95 29.95a69.75 69.75 0 0 0 82.71 82.71l29.95 29.95a107.23 107.23 0 0 1-44.44 9.57zM506.11 236.81C446.14 148 351.07 96 256 96.65a271.6 271.6 0 0 0-90.46 15.16l46 46a107.78 107.78 0 0 1 142.63 142.63l63.74 63.74a332.49 332.49 0 0 0 88.2-89 34.22 34.22 0 0 0 0-38.37z"></path><path d="M256 186.26a69.91 69.91 0 0 0-14.49 1.52l82.71 82.7A69.74 69.74 0 0 0 256 186.26z"></path></g></g></svg>
		case 'logging': case 'linelimit': return <svg className='icon w-[15px] h-[15px]' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" xmlSpace="preserve"><g><path d="M403.005 44.611c0-13.529-11.043-24.566-24.572-24.566-79.195-.005-307.864 0-307.864 0-18.816 0-34.071 15.255-34.071 34.071v36.772h24.684v-29.16c0-4.686 1.908-8.937 4.986-12.014a16.946 16.946 0 0 1 12.014-4.986v.028l99.931-.001h183.208v-.028c4.686 0 8.937 1.908 12.014 4.986a16.95 16.95 0 0 1 4.985 12.014v135.94l24.684-24.684V44.611zm18.49 129.682 44.202 44.202 17.686-17.686c12.156-12.156 12.156-32.047.001-44.203-12.156-12.156-32.047-12.155-44.203 0l-17.686 17.687zm-155.15 155.15-19.324 49.201c-1.465 3.731-.666 7.729 2.121 10.609 2.788 2.881 6.757 3.811 10.534 2.469l50.87-18.077s.124-.124.367-.362l-44.205-44.205-.363.365zm189.453-101.048L320.811 363.381l-44.202-44.202 134.986-134.986zm-77.477 97.275 24.684-24.684v166.403c0 13.534-11.043 24.566-24.572 24.566-79.195.005-307.864 0-307.864 0-18.816 0-34.071-15.255-34.071-34.071v-36.772h24.684v29.159c0 4.665 1.907 8.907 4.983 11.985a16.949 16.949 0 0 0 12.01 4.987l283.146.001v.027c4.686 0 8.937-1.908 12.014-4.986a16.95 16.95 0 0 0 4.985-12.014V325.67zM23.062 104.887H81.62a3.579 3.579 0 0 1 3.561 3.561v19.448a3.579 3.579 0 0 1-3.561 3.561H23.062a3.58 3.58 0 0 1-3.562-3.561v-19.448a3.579 3.579 0 0 1 3.562-3.561zm0 275.656a3.58 3.58 0 0 0-3.562 3.561v19.448a3.579 3.579 0 0 0 3.562 3.561H81.62a3.579 3.579 0 0 0 3.561-3.561v-19.448a3.579 3.579 0 0 0-3.561-3.561zm0-91.886a3.58 3.58 0 0 0-3.562 3.561v19.447a3.58 3.58 0 0 0 3.562 3.562H81.62a3.579 3.579 0 0 0 3.561-3.562v-19.447a3.579 3.579 0 0 0-3.561-3.561zm0-91.885H81.62a3.579 3.579 0 0 1 3.561 3.561v19.447a3.58 3.58 0 0 1-3.561 3.562H23.062a3.58 3.58 0 0 1-3.562-3.562v-19.447a3.579 3.579 0 0 1 3.562-3.561zm13.436-51.315h24.684v37.316H36.498zm0 91.885v37.315h24.684v-37.315zm0 91.885v37.316h24.684v-37.316zM361.322 58.7v.028c.821 0 1.57.338 2.115.884a2.99 2.99 0 0 1 .884 2.116v149.941L256.445 319.544l-2.064 2.064-20.391 51.918c-3.461 8.812-1.492 18.659 5.091 25.463 6.602 6.822 16.337 9.104 25.283 5.925l53.848-19.135 2.234-2.234 43.874-43.874v110.602c0 .821-.338 1.571-.884 2.116a2.988 2.988 0 0 1-2.115.884v.027l-237.348-.001V58.701zm-251.349.001v394.598H78.176c-.818 0-1.566-.34-2.111-.886a3.018 3.018 0 0 1-.881-2.141v-29.159h6.437c9.681 0 17.561-7.881 17.561-17.561v-19.448c0-9.681-7.88-17.561-17.561-17.561h-6.437v-37.316h6.437c9.681 0 17.561-7.881 17.561-17.561v-19.447c0-9.681-7.88-17.561-17.561-17.561h-6.437v-37.315h6.437c9.681 0 17.561-7.881 17.561-17.561v-19.447c0-9.681-7.88-17.561-17.561-17.561h-6.437v-37.316h6.437c9.681 0 17.561-7.88 17.561-17.561v-19.448c0-9.681-7.88-17.561-17.561-17.561h-6.437v-29.16c0-.821.338-1.57.884-2.116a2.99 2.99 0 0 1 2.116-.884V58.7h31.789zm72.283 44.963h123.782c4.686 0 8.937 1.908 12.015 4.985a16.953 16.953 0 0 1 4.985 12.015v44.888c0 4.686-1.908 8.937-4.985 12.015a16.953 16.953 0 0 1-12.015 4.985H182.256a16.953 16.953 0 0 1-12.015-4.985 16.952 16.952 0 0 1-4.985-12.015v-44.888c0-4.686 1.908-8.937 4.985-12.015a16.953 16.953 0 0 1 12.015-4.985zm123.782 14c.822 0 1.571.339 2.116.884s.884 1.295.884 2.116v44.888c0 .822-.338 1.571-.884 2.116a2.99 2.99 0 0 1-2.116.883H182.256c-.821 0-1.571-.338-2.116-.883s-.884-1.295-.884-2.116v-44.888c0-.821.339-1.571.884-2.116s1.295-.884 2.116-.884z"></path></g></svg>
		case 'fliporientation': return <svg className='icon !w-[17px] !h-[17px]' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 458.695 458.695" xmlSpace="preserve"><g><path d="M425.707 151.066c-1.878-4.899-7.373-7.349-12.271-5.47l-156.045 59.817v-17.527c0-33.435-19.766-62.332-48.225-75.663 15.936-11.164 26.385-29.65 26.385-50.541C235.551 27.671 207.88 0 173.868 0s-61.683 27.671-61.683 61.683c0 20.863 10.422 39.327 26.322 50.496-8.698 4.068-16.714 9.661-23.706 16.653-15.767 15.778-24.45 36.751-24.45 59.055v81.559l-51.893 19.892a9.503 9.503 0 0 0 3.403 18.373 9.47 9.47 0 0 0 3.398-.632l138.512-53.096v16.824c0 33.368 19.781 62.293 48.241 75.65-15.948 11.162-26.406 29.655-26.406 50.555 0 34.012 27.671 61.683 61.683 61.683s61.683-27.671 61.683-61.683c0-20.865-10.423-39.331-26.326-50.499a83.51 83.51 0 0 0 23.704-16.652c15.773-15.785 24.46-36.757 24.46-59.055v-80.855l69.426-26.613c4.899-1.879 7.349-7.373 5.471-12.272zM173.868 19c23.536 0 42.683 19.147 42.683 42.683s-19.147 42.683-42.683 42.683-42.683-19.147-42.683-42.683S150.332 19 173.868 19zm-64.517 168.886c0-17.231 6.708-33.435 18.888-45.623 12.186-12.186 28.388-18.897 45.63-18.897 35.578.008 64.522 28.952 64.522 64.52v24.811l-129.04 49.465v-74.276zm157.938 251.809c-23.536 0-42.683-19.147-42.683-42.683 0-23.432 18.981-42.508 42.375-42.675h.615c23.394.167 42.375 19.243 42.375 42.675.001 23.535-19.146 42.683-42.682 42.683zm64.522-168.889c0 17.225-6.712 33.428-18.9 45.625-12.089 12.098-28.167 18.813-45.22 18.905h-.094c-.103 0-.205-.008-.308-.008s-.205.007-.308.008h-.039c-35.384-.191-64.171-29.14-64.171-64.53v-24.107l129.04-49.465v73.572z"></path></g></svg>
		// case 'fliporientation': return <svg className='icon w-[15px] h-[15px]' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 64 64" xmlSpace="preserve"><g><path d="M30.5 24.9a1.994 1.994 0 0 0 3 0h.01L48.89 7.32A1.998 1.998 0 0 0 47.39 4H16.61a1.998 1.998 0 0 0-1.5 3.32zM33.51 39.1h-.01a2.062 2.062 0 0 0-3.01 0L15.11 56.68a1.998 1.998 0 0 0 1.5 3.32h30.78a1.998 1.998 0 0 0 1.5-3.32zM59 31h-3.5a1 1 0 0 0 0 2H59a1 1 0 0 0 0-2zM28.644 31a1 1 0 0 0 0 2h6.713a1 1 0 0 0 0-2zM21.929 33a1 1 0 0 0 0-2h-6.714a1 1 0 0 0 0 2zM48.786 31h-6.714a1 1 0 0 0 0 2h6.714a1 1 0 0 0 0-2zM8.5 31H5a1 1 0 0 0 0 2h3.5a1 1 0 0 0 0-2z"></path></g></svg>
		default: return <svg className='icon w-[15px] h-[15px]' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 24 24" xmlSpace="preserve"><g><path d="M22 3.5C22 1.57 20.43 0 18.5 0h-13C3.57 0 2 1.57 2 3.5V20h4.255A6.968 6.968 0 0 0 5 24h14a6.968 6.968 0 0 0-1.255-4H22V3.5ZM19 17H5V3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5V17ZM12 5c-2.757 0-5 2.243-5 5s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5Zm0 7c-1.103 0-2-.897-2-2s.897-2 2-2 2 .897 2 2-.897 2-2 2Z"></path></g></svg>
	}
}

export function uniqueObjects(array: any[]) {
	// Converting to JSON string to remove duplicates as objects are not comparable
	return Array.from(new Set(array.map(x => JSON.stringify(x)))).map(x => JSON.parse(x))
}