// @ts-check

const DspObject = require('./DspObject');
const { AudioInput } = require('./audioports');
const { AudioOutput } = require('./audioports');

const ChannelCountMode = ['max', 'clamped-max', 'explicit'];
const ChannelInterpretation = ['speakers', 'discrete'];

class AudioNode extends DspObject {
	/**
	 * @param {import("./AudioContext")} context
	 * @param {number} numberOfInputs
	 * @param {number} numberOfOutputs
	 * @param {'max' | 'clamped-max' | 'explicit'} channelCountMode
	 * @param {'speakers' | 'discrete'} channelInterpretation
	 */
	constructor(
		context,
		numberOfInputs,
		numberOfOutputs,
		channelCount = 2,
		channelCountMode,
		channelInterpretation
	) {
		super(context);

		/** @protected */
		this._killed = false;

		// Initialize audio ports
		/** @readonly */
		this._inputs = [];
		/** @readonly */
		this._outputs = [];

		/** @readonly */
		this.context = context;
		/** @readonly */
		this.numberOfInputs = numberOfInputs;
		/** @readonly */
		this.numberOfOutputs = numberOfOutputs;

		/** @protected */
		this._channelCount = channelCount;
		/** @protected */
		this._channelCountMode = channelCountMode;
		/** @protected */
		this._channelInterpretation = channelInterpretation;

		for (let i = 0; i < this.numberOfInputs; i++) {
			this._inputs.push(new AudioInput(context, this, i));
		}

		for (let i = 0; i < this.numberOfOutputs; i++) {
			this._outputs.push(new AudioOutput(context, this, i));
		}
	}

	/**
	 * @param {number} newChannelCount
	 */
	set channelCount(newChannelCount) {
		if (newChannelCount < 1) {
			throw new Error('Invalid number of channels');
		}

		this._channelCount = newChannelCount;
	}

	get channelCountMode() {
		return this._channelCountMode;
	}

	set channelCountMode(newChannelCountMode) {
		if (ChannelCountMode.indexOf(newChannelCountMode) === -1) {
			throw new Error('Invalid value for channelCountMode : ' + newChannelCountMode);
		}

		this._channelCountMode = newChannelCountMode;
	}

	get channelInterpretation() {
		return this._channelInterpretation;
	}

	set channelInterpretation(newChannelInterpretation) {
		if (ChannelInterpretation.indexOf(newChannelInterpretation) === -1) {
			throw new Error('Invalid value for channelInterpretation : ' + newChannelInterpretation);
		}

		this._channelInterpretation = newChannelInterpretation;
	}

	/**
	 * Connects a AudioInputNode
	 * @param {import('./AudioNode')} destination
	 * @param {number} output
	 * @param {number} input
	 */
	connect(destination, output = 0, input = 0) {
		if (output >= this.numberOfOutputs) {
			throw new Error('output out of bounds ' + output);
		}

		if (input >= destination.numberOfInputs) {
			throw new Error('input out of bounds ' + input);
		}

		this._outputs[output].connect(destination._inputs[input]);
	}

	/**
	 * Disconnects a AudioOutputNode by index
	 * @param {number} output
	 */
	disconnect(output) {
		if (output === void 0) {
			output = 0;
		}

		if (output >= this.numberOfOutputs) {
			throw new Error('output out of bounds ' + output);
		}

		const audioOut = this._outputs[output];

		audioOut.sinks.slice(0).forEach(function (sink) {
			audioOut.disconnect(sink);
		});
	}

	/**
	 * Disconnects all ports and remove all events listeners
	 */
	_kill() {
		this._inputs.forEach(function (input) {
			input._kill();
		});

		this._outputs.forEach(function (output) {
			output._kill();
		});

		this.removeAllListeners();

		this._killed = true;
	}

	/**
	 * Ticks the node
	 */
	_tick() {
		if (this._killed) {
			throw new Error('AudioNode is killed!');
		}

		return super._tick();
	}
}

module.exports = AudioNode;
