import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { isTX6EventType, isTX6Source, type TX6, type TX6Bindings, type TX6EventType } from 'use-tx-6'
import { useTX6Device } from 'use-tx-6/react'

const STORAGE_KEY = 'tx6.bindings'

/** Custom pairings saved in this browser, or `{}`. */
export function loadBindings(): TX6Bindings {
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
		if(!parsed || typeof parsed !== 'object')
			return {}

		return Object.fromEntries(Object.entries(parsed).filter(([source, event]) => isTX6Source(source) && (event === null || isTX6EventType(event))))
	} catch {
		return {}
	}
}

/** Keep the device's pairings saved across reloads. */
export function persistBindings(device: TX6) {
	return device.on('bindings', bindings => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings))
		} catch {
			// Storage unavailable (private mode, blocked): pairings last for this visit only
		}
	})
}

interface Pairing {
	/** Pairing mode: clicking a control arms it instead of moving it. */
	learning: boolean
	setLearning(learning: boolean): void
	/** The control waiting for a hardware message to pair with. */
	armed: TX6EventType | null
	arm(event: TX6EventType | null): void
}

const PairingContext = createContext<Pairing>({ learning: false, setLearning: () => {}, armed: null, arm: () => {} })

/**
 * Pairing mode: arm a control, then move the matching control on the TX-6 and
 * the first CC or note it sends is bound to it.
 */
export function PairingProvider({ children }: { children?: ReactNode }) {
	const device = useTX6Device()
	const [learning, setLearning] = useState(false)
	const [armed, arm] = useState<TX6EventType | null>(null)

	useEffect(() => {
		if(!armed)
			return

		return device.on('message', (_, { origin, source }) => {
			if(origin !== 'device' || !source)
				return

			device.bind(source, armed)
			arm(null)
		})
	}, [device, armed])

	const value = useMemo<Pairing>(() => ({
		learning,
		setLearning: next => {
			setLearning(next)
			if(!next)
				arm(null)
		},
		armed,
		arm
	}), [learning, armed])

	return <PairingContext.Provider value={value}>{children}</PairingContext.Provider>
}

export function usePairing() {
	return useContext(PairingContext)
}
