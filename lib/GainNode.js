// @ts-check

const AudioNode = require('./AudioNode');
const AudioParam = require('./AudioParam');
const AudioBuffer = require('./AudioBuffer');
const { BLOCK_SIZE } = require('./constants');

class GainNode extends AudioNode {
	/**
	 * @param {import("./AudioContext")} context
	 */
	constructor(context) {
		super(context, 1, 1, undefined, 'max', 'speakers');

		/** @readonly */
		this.gain = new AudioParam(this.context, 1, 'a');
	}

	_tick() {
		super._tick();

		const inBuff = this._inputs[0]._tick();
		const gainArray = this.gain._tick().getChannelData(0);
		const outBuff = new AudioBuffer(inBuff.numberOfChannels, BLOCK_SIZE, this.context.sampleRate);

		for (let ch = 0; ch < inBuff.numberOfChannels; ch++) {
			const inChArray = inBuff.getChannelData(ch);
			const outChArray = outBuff.getChannelData(ch);

			for (let i = 0; i < BLOCK_SIZE; i++) {
				outChArray[i] = inChArray[i] * gainArray[i];
			}
		}

		return outBuff;
	}
}

module.exports = GainNode;
