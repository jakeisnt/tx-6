type Listener<A extends unknown[]> = (...args: A) => void

/** Minimal strongly-typed event emitter with no platform dependencies. */
export class Emitter<Events extends { [K in keyof Events]: unknown[] }> {
	#listeners = new Map<keyof Events, Set<Listener<never>>>()

	on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
		let set = this.#listeners.get(event)
		if(!set) {
			set = new Set()
			this.#listeners.set(event, set)
		}

		set.add(listener as Listener<never>)

		return () => this.off(event, listener)
	}

	off<K extends keyof Events>(event: K, listener: Listener<Events[K]>) {
		const set = this.#listeners.get(event)
		set?.delete(listener as Listener<never>)
		if(set?.size === 0)
			this.#listeners.delete(event)
	}

	emit<K extends keyof Events>(event: K, ...args: Events[K]) {
		const set = this.#listeners.get(event)
		if(!set)
			return

		// Copy so listeners can unsubscribe while being called
		for(const listener of [...set]) {
			try {
				(listener as Listener<Events[K]>)(...args)
			} catch(error) {
				// One faulty listener must not break delivery to the rest
				reportError(error)
			}
		}
	}

	listenerCount(event: keyof Events) {
		return this.#listeners.get(event)?.size ?? 0
	}

	clear() {
		this.#listeners.clear()
	}
}

/** Surface an error without throwing: `reportError` where available, else an unhandled rejection. */
function reportError(error: unknown) {
	const report = (globalThis as { reportError?: (error: unknown) => void }).reportError
	if(report)
		report(error)
	else
		void Promise.reject(error)
}
