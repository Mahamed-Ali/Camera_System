import * as Icon from 'react-bootstrap-icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { MouseEvent, useEffect, useState } from 'react';
import { round, toastIt } from '../../utils/utils';
import { socket } from '../../utils/socket';
import clsx from 'clsx';

interface IVideoInfo {
	duration: number;
	filename: string;
	height: number;
	size: number;
	thumbnail: string;
	width: number;
	corrupt?: boolean;
	processing?: boolean;
}

interface IRecording {
	setRecordings: Function
	recordings: IVideoInfo[],
}

export default function CameraOrientation() {
	const [recordings, setRecordings] = useState([]);
	const fetchRecordings = () => {
		fetch('/api/videos')
			.then(response => response.json())
			.then(data => setRecordings(data))
			.catch(error => console.error(error))
	}

	useEffect(() => {
		// Initial data fetch
		fetchRecordings();
		
		// Wait a bit for possible IO events to finish
		socket.on('recording', rec => {
			(window as any).recording = rec;
			setTimeout(fetchRecordings, 200);
		});

		return () => {
			// Cleanup before unmounting
			socket.off('recording', fetchRecordings);
		}
	}, []);


	return (
		<>
			<div className="h-full">
				<h1>Recordings</h1>

				{recordings.length
					? <div className='content h-full'>
						<div className="flex flex-col gap-[20px] [--bg:#e6e6e6] dark:[--bg:#343437] ">
							<Recording recordings={recordings} setRecordings={setRecordings} />
						</div>
					</div>

					: <div className='content h-[calc(100%_-_22px)]'>
						<div className='grid place-content-center gap-[32px] top-[75px] opacity-20 w-auto h-[calc(100%_-_50px)]'>
							<svg className='w-[120px] h-auto opacity-50' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" xmlSpace="preserve">
								<g>
									<path d="M420.333 231.679v-34.81c0-26.725-21.742-48.467-48.466-48.467a48.44 48.44 0 0 0-42.548 25.258l-31.646 58.018H245.19a187.568 187.568 0 0 1-3.64 11.3c-3.949 11.035-8.988 21.848-14.882 32.043v138.047h70.667v29.84l-46.051 27.63 15.435 25.725 60.616-36.37v-46.826h33.119V231.679h-28.607l23.811-43.653a18.457 18.457 0 0 1 16.211-9.624c10.182 0 18.466 8.284 18.466 18.467l.119 263.097 60.497 36.298 15.435-25.725-46.051-27.63v-31.63c36.522-7.796 64-39.044 64-83.479C501.783 312.443 512 290.146 512 266.718v-35.04h-91.667zM196.166 314.428c-8.272 8-17.121 14.853-26.486 20.454-18.702 11.184-38.445 16.854-58.681 16.854-13.1 0-25.992-2.392-38.53-7.102 8.803 39.121 43.822 68.435 85.562 68.435h8.301v29.841l-46.05 27.63 15.435 25.725 60.449-36.27zM60 80.56v25.86c-9.342 2.841-17.683 6.572-24.95 11.209C12.12 132.258 0 155.754 0 185.578c0 61.671 49.513 136.157 111 136.157s111-74.486 111-136.157c0-28.56-12.052-51.612-34.854-66.665-7.34-4.846-15.784-8.799-25.146-11.838V80.56c0-16.708 11.828-30.699 27.549-34.054 2.348-.501 4.78-.77 7.275-.77v-30c-32.42 0-59.355 23.923-64.086 55.042-.485 3.192-.738 30.068-.738 30.068a195.011 195.011 0 0 0-21-1.11c-7.341 0-14.333.336-21 .976 0 0-.259-26.822-.755-30.05-4.78-31.063-31.69-54.926-64.069-54.926v30c2.495 0 4.927.269 7.275.77C48.172 49.861 60 63.853 60 80.56zM42.667 221.069v-30h30v30zm136.666 0h-30v-30h30z"></path>
								</g>
							</svg>
							<p>No recordings yet</p>
						</div>
					</div>
				}
			</div>
		</>
	)
}

function Recording({ recordings, setRecordings }: IRecording) {
	const [playing, setPlayingVid] = useState<string | null>(null);

	function startPlaying(filename: string, readable: boolean, e: MouseEvent): void {
		// Asserting that e.target is an Element
		const target = e.target as Element;

		if (target.closest('.option.clickable')) return;
		if (!readable) return;

		setPlayingVid(`/api/recordings/${filename}`);
	}

	function deleteRecording(filename: string): void {
		fetch(`/api/videos/delete/${filename}`,)
			.then(response => response.json())
			.then(data => {
				if (data.message)
					// Failed if there is a message
					return toastIt({ title: 'Failed to delete recording', description: data.message });

				console.log('Deleted recording:', filename);
				setRecordings(recordings.filter((recording: IVideoInfo) => recording.filename !== filename));
			})
	}

	return (
		<>
			{recordings.map((recording, index) => {
				// Hide possibly unnecessary properties from the filename
				const cleanName = recording.filename.replace(/\.(scheduled|processing|motion|manual)/gi, '');
				// Recording status: in progress, automatically recorded, manually recorded
				const status = {
					processing: recording.filename.includes('.processing'),
					scheduled: recording.filename.includes('.scheduled'),
					motion: recording.filename.includes('.motion'),
				};

				// More info is available when file is readable
				const readable = !recording.processing && !recording.corrupt;

				return (
					<div key={index} className={clsx('recording flex gap-[13px] place-items-center rounded-[15px] px-[13px] py-[15px] overflow-hidden cursor-default bg-[--bg] transition-[.3s_ease] t2 min-h-[92px] h-auto object-cover', { 'cursor-pointer hover:brightness-[.97] hover:dark:brightness-[.9]': readable })} onClick={(e) => startPlaying(recording.filename, readable, e)}>
						{readable && <img src={`/api/recordings/thumbnails/${recording.thumbnail}`} className="w-[80px] h-auto h-full object-cover rounded-[5px] shadow-[#0000002b_0px_6px_13px_-6px] t2" />}
						{readable && <Icon.PlayFill className='absolute translate-x-[25px] w-[30px] h-auto' />}
						{!readable && <img className="w-[80px] h-auto h-full object-cover rounded-[5px] shadow-[#0000002b_0px_6px_13px_-6px] t2 invisible" />}
						{recording.processing &&
							<svg className='absolute translate-x-[25px] w-[25px] h-auto' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 465.2 465.2" xmlSpace="preserve">
								<g>
									<path d="M279.591 423.714a192.461 192.461 0 0 1-11.629 2.52c-10.148 1.887-16.857 11.647-14.98 21.804a18.651 18.651 0 0 0 7.618 11.876 18.64 18.64 0 0 0 14.175 3.099 233.175 233.175 0 0 0 13.854-3.008c10.021-2.494 16.126-12.646 13.626-22.662-2.494-10.025-12.637-16.125-22.664-13.629zM417.887 173.047a18.644 18.644 0 0 0 6.97 9.398c4.684 3.299 10.813 4.409 16.662 2.475 9.806-3.256 15.119-13.83 11.875-23.631a232.327 232.327 0 0 0-4.865-13.314c-3.836-9.59-14.714-14.259-24.309-10.423-9.585 3.834-14.256 14.715-10.417 24.308a194.816 194.816 0 0 1 4.084 11.187zM340.36 397.013a195.86 195.86 0 0 1-10.134 6.261c-8.949 5.162-12.014 16.601-6.854 25.546a18.664 18.664 0 0 0 5.416 5.942c5.769 4.059 13.604 4.667 20.127.909a233.049 233.049 0 0 0 12.062-7.452c8.614-5.691 10.985-17.294 5.291-25.912-5.693-8.621-17.291-10.989-25.908-5.294zM465.022 225.279c-.407-10.322-9.101-18.356-19.426-17.953-10.312.407-18.352 9.104-17.947 19.422.155 3.945.195 7.949.104 11.89-.145 6.473 3.021 12.243 7.941 15.711a18.647 18.647 0 0 0 10.345 3.401c10.322.229 18.876-7.958 19.105-18.285.103-4.709.064-9.48-.122-14.186zM414.835 347.816c-8.277-6.21-19.987-4.524-26.186 3.738a195.193 195.193 0 0 1-7.434 9.298c-6.69 7.86-5.745 19.666 2.115 26.361.448.38.901.729 1.371 1.057 7.814 5.509 18.674 4.243 24.992-3.171a232.358 232.358 0 0 0 8.874-11.102c6.2-8.262 4.522-19.98-3.732-26.181zM442.325 280.213c-9.855-3.09-20.35 2.396-23.438 12.251a198.06 198.06 0 0 1-3.906 11.253c-3.105 8.156-.13 17.13 6.69 21.939a18.635 18.635 0 0 0 4.126 2.19c9.649 3.682 20.454-1.159 24.132-10.812a240.351 240.351 0 0 0 4.646-13.382c3.085-9.857-2.397-20.349-12.25-23.439zM197.999 426.402a193.1 193.1 0 0 1-47.968-15.244c-.18-.094-.341-.201-.53-.287a204.256 204.256 0 0 1-10.63-5.382c-.012-.014-.034-.023-.053-.031a199.491 199.491 0 0 1-18.606-11.628C32.24 331.86 11.088 209.872 73.062 121.901c13.476-19.122 29.784-35.075 47.965-47.719.224-.156.448-.311.67-.468 64.067-44.144 151.06-47.119 219.089-1.757l-14.611 21.111c-4.062 5.876-1.563 10.158 5.548 9.518l63.467-5.682c7.12-.64 11.378-6.799 9.463-13.675L387.61 21.823c-1.908-6.884-6.793-7.708-10.859-1.833l-14.645 21.161C312.182 7.638 252.303-5.141 192.87 5.165a235.263 235.263 0 0 0-17.709 3.78c-.045.008-.081.013-.117.021-.225.055-.453.128-.672.189-51.25 13.161-95.965 43.052-127.872 85.7-.269.319-.546.631-.8.978a220.276 220.276 0 0 0-3.145 4.353 229.217 229.217 0 0 0-4.938 7.308c-.199.296-.351.597-.525.896C10.762 149.191-1.938 196.361.24 244.383c.005.158-.004.317 0 .479a227.87 227.87 0 0 0 1.088 14.129c.027.302.094.588.145.89a230.909 230.909 0 0 0 1.998 14.145c8.344 48.138 31.052 91.455 65.079 125.16.079.079.161.165.241.247.028.031.059.047.086.076a235.637 235.637 0 0 0 29.793 24.898c28.02 19.744 59.221 32.795 92.729 38.808 10.167 1.827 19.879-4.941 21.703-15.103 1.823-10.169-4.939-19.889-15.103-21.71z"></path>
									<path d="M221.124 83.198c-8.363 0-15.137 6.78-15.137 15.131v150.747l137.87 71.271a15.042 15.042 0 0 0 6.933 1.69c5.476 0 10.765-2.982 13.454-8.185 3.835-7.426.933-16.549-6.493-20.384L236.244 230.65V98.329c-.001-8.351-6.767-15.131-15.12-15.131z"></path>
								</g>
							</svg>}
						{recording.corrupt &&
							<svg className='absolute translate-x-[27px] w-[27px] h-auto' fill='currentColor' xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 36 36" xmlSpace="preserve">
								<g>
									<g fill-rule="evenodd">
										<path d="M29.43 4.29v11.05a10.91 10.91 0 0 0-4-.77c-5.99 0-10.86 4.87-10.86 10.86 0 3.49 1.65 6.58 4.19 8.57H4.29A2.29 2.29 0 0 1 2 31.71V8.66c0-.61.24-1.19.67-1.62l4.37-4.37C7.47 2.24 8.06 2 8.66 2h18.48a2.29 2.29 0 0 1 2.29 2.29z"></path>
										<path d="M29.33 17.81a8.39 8.39 0 0 0-3.9-.95c-4.73 0-8.57 3.84-8.57 8.57S20.7 34 25.43 34c4.67-.01 8.59-3.81 8.57-8.57 0-3.33-1.9-6.21-4.67-7.62zm-3.9 11.88a1.14 1.14 0 1 1-.001-2.279 1.14 1.14 0 0 1 .001 2.279zm1.14-4.86a1.14 1.14 0 1 1-2.28 0v-3.07a1.14 1.14 0 1 1 2.28 0z">
										</path>
									</g>
								</g>
							</svg>}
						<div className='whitespace-nowrap overflow-hidden'>
							<h3 className='overflow-hidden text-ellipsis'>{cleanName}</h3>
							<div>
								<p className={clsx("opacity-50 text-[80%] status", { 'processing': recording.processing })}>
									{status.processing
										? 'Recording in progress'
										: status.motion
											? 'Triggered by motion'
											: status.scheduled
												? 'Recorded automatically'
												: 'Recorded manually'}
								</p>

								{recording.corrupt && <p className="opacity-50 text-[80%]">Corrupt file</p>}
								{/* {status.processing && <p className="opacity-50 text-[80%]">Playable after processing</p>} */}
								{readable && <p className="opacity-50 text-[80%]">Size: {round(recording.size / 1_000_000)} MB</p>}
								{/* {readable && <p className="opacity-50 text-[80%]">Duration: {recording.duration} seconds</p>} */}
								{/* {readable && <p className="opacity-50 text-[80%]">Resolution: {recording.width}x{recording.height}</p>} */}
								{!recording.processing &&
									<div className="options">
										<div className="content">
											<Tooltip>
												<div className="option clickable" onClick={() => !recording.processing && deleteRecording(recording.filename)}>
													<TooltipTrigger>
														<div className="delete opacity-80 hover:opacity-100 hover:text-[#993401] dark:hover:text-[#ff722c]">
															<Icon.TrashFill className='cursor-pointer' size={14} />
														</div>
													</TooltipTrigger>
													<TooltipContent side='left' sideOffset={24} className='bg-[#00000085] backdrop-blur-[5px] translate-x-[11px]'>
														<div className='place-items-baseline flex gap-[10px]'>
															<div>Delete</div>
														</div>
													</TooltipContent>
												</div>
											</Tooltip>
											<Tooltip>
												<div className="option clickable">
													<TooltipTrigger>
														<div className="delete opacity-80 hover:opacity-100 hover:text-[#993401] dark:hover:text-[#ff722c]">
															<a className="download opacity-80 hover:opacity-100 hover:text-[#015cad] dark:hover:text-[#9bd0ff]" download={cleanName}
																href={`/api/recordings/${recording.filename}`}> {/* dark:hover:text-[#9bd0ff] */}
																<Icon.Download className='cursor-pointer' size={14} />
															</a>
														</div>
													</TooltipTrigger>
													<TooltipContent side='left' sideOffset={24} className='bg-[#00000085] backdrop-blur-[5px] translate-x-[11px]'>
														<div className='place-items-baseline flex gap-[10px]'>
															<div>Download</div>
														</div>
													</TooltipContent>
												</div>
											</Tooltip>
										</div>
									</div>}
							</div>
						</div>
					</div>
				)
			})}

			{playing &&
				<div className="content-popup">
					<div className='wrapper'>
						<div className="close-btn" onClick={() => setPlayingVid(null)}>
							<Icon.X className='cursor-pointer' size={24} />
						</div>

						<video controls className='h-[70vh]'>
							<source src={playing} type="video/mp4" />
						</video>
					</div>
					<div className="overlay" onClick={() => setPlayingVid(null)}></div>
				</div>}
		</>
	)
}