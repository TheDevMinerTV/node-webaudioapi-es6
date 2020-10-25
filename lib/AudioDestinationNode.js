// @ts-check

const AudioNode = require('./AudioNode');

class AudioDestinationNode extends AudioNode {
	/**
	 * @param {import("./AudioContext")} context
	 */
	constructor(context) {
		super(context, 1, 0, 2, 'explicit', 'speakers');
	}

	get maxChannelCount() {
		return 2;
	}

	/**
	 * This only pulls the data from the nodes upstream
	 */
	_tick() {
		return this._inputs[0]._tick();
	}
}

module.exports = AudioDestinationNode;
