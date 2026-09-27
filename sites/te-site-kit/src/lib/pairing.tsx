import { type ControlBindings, type ControlKinds, type ControlName, type DeviceProfile, isControlSource } from '@ulnd/teenage'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'

import { type AnyDevice, useDevice } from '../device.ts'

/** Per device, e.g. `tx6.bindings`, so each site keeps its own pairings. */
const storageKey = (profile: { name: string }) => `${profile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.bindings`

/** Custom pairings saved in this browser, or `{}`. */
export function loadBindings<K extends ControlKinds>(profile: DeviceProfile<K>): ControlBindings<ControlName<K>> {
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(profile)) ?? '{}')
		if(!parsed || typeof parsed !== 'object')
			return {}

		return Object.fromEntries(Object.entries(parsed).filter(([source, event]) => isControlSource(source) && (event === null || profile.isControl(event))))
	} catch {
		return {}
	}
}

/** Keep the device's pairings saved across reloads. */
export function persistBindings(device: AnyDevice) {
	return device.on('bindings', bindings => {
		try {
			localStorage.setItem(storageKey(device.profile), JSON.stringify(bindings))
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
	armed: string | null
	arm(event: string | null): void
}

const PairingContext = createContext<Pairing>({ learning: false, setLearning: () => {}, armed: null, arm: () => {} })

/**
 * Pairing mode: arm a control, then move the matching control on the device and
 * the first CC or note it sends is bound to it.
 */
export function PairingProvider({ children }: { children?: ReactNode }) {
	const device = useDevice()
	const [learning, setLearning] = useState(false)
	const [armed, arm] = useState<string | null>(null)

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
