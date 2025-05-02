import { createContext, useContext, useState } from "react"

interface AdditionalOption {
    hideSidebar?: boolean
    zones?: boolean
    moreOptions?: boolean
    recordings?: boolean
    scheduleRecordings?: boolean
}

interface AdditionalOptionsContextType {
    additionalOption: AdditionalOption
    setAdditionalOption: (option: AdditionalOption) => void
}

export const AdditionalOptionsContext = createContext<AdditionalOptionsContextType | undefined>(undefined)

export function AdditionalOptionsProvider({ children }: { children: React.ReactNode }) {
    const [additionalOption, setAdditionalOption] = useState<AdditionalOption>({ recordings: true })

    return (
        <AdditionalOptionsContext.Provider value={{ additionalOption, setAdditionalOption }}>
            {children}
        </AdditionalOptionsContext.Provider>
    )
}

export function useAdditionalOptions() {
    const context = useContext(AdditionalOptionsContext)

    if (context === undefined)
        throw new Error('useAdditionalOptions must be used within a AdditionalOptionsProvider')

    return context
}