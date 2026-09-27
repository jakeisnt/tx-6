import { devicePackage } from '../../../tsdown.base.ts'

export default devicePackage({
	index: 'src/index.ts',
	'transports/web-bluetooth': 'src/transports/web-bluetooth.ts',
	'transports/web-midi': 'src/transports/web-midi.ts'
})
