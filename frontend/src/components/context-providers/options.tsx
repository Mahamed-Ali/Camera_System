import { createContext, useContext, useEffect, useState } from "react"
import { DateRange } from 'react-day-picker';

export interface RecordingSchedule {
    date?: DateRange,
    time?: { from?: string, to?: string },
    defaultEmpty?: boolean
}

export interface HsvaColor {
    h: number;
    s: number;
    v: number;
    a: number;
}

export interface ShapeFeatures {
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    blur: number;
    hsva: HsvaColor;
    defaultEmpty?: boolean;
}

export interface CameraOption {
    fliporientation?: boolean
    logging?: boolean
    recording247?: boolean
    motiondetection?: boolean
}

export interface MoreOption extends CameraOption {
    linelimit: number | null,
    motionwait: number | null,
    resolution: [number | undefined, number | undefined] | null,
    // camera: CameraOption,
}

export interface Options extends MoreOption {
    schedule: RecordingSchedule
    shape: ShapeFeatures | any
    // more: MoreOption,
}

export let serverOptions: Options;
export const defaultOptions: Options = {
    linelimit: null,
    motionwait: null,
    resolution: null,
    logging: false,
    recording247: false,
    motiondetection: false,
    fliporientation: false,
    schedule: {},
    shape: {
        x: 4,
        y: 5,
        width: 45,
        height: 37,
        radius: 10,
        blur: 10,
        hsva: { h: 218, s: 100, v: 63, a: .5 }
        // hsva: { h: 0, s: 0, v: 0, a: .5 }
    },
}

interface OptionsContextType {
    options: Options
    setOptions: (prevOptions: Options) => void
}

const OptionsContext = createContext<OptionsContextType | undefined>(undefined)

export function OptionsProvider({ children }: { children: React.ReactNode }) {
    // Default values, will be overwritten by the fetched values
    const [options, setOptions] = useState<Options>(defaultOptions);

    useEffect(() => {
        fetch('/api/options.json')
            .then(res => res.json())
            .then(res => {
                res && (serverOptions = res);
                
                setOptions({
                    ...options,
                    ...res,
                    shape: { ...options.shape, ...res.shape, defaultEmpty: !res.shape },
                    schedule: { ...options.schedule, ...res.schedule, defaultEmpty: !res.schedule },
                })
            })
    }, []);

    return (
        <OptionsContext.Provider value={{ options, setOptions }}>
            {children}
        </OptionsContext.Provider>
    )
}

export function useOptions() {
    const context = useContext(OptionsContext)

    if (context === undefined)
        throw new Error('useOptions must be used within a OptionsProvider')

    return context
}