// @ts-check

const _ = require('underscore');
const { EventEmitter } = require('events');
const AudioBuffer = require('./AudioBuffer');
const { BLOCK_SIZE } = require('./constants');
const ChannelMixing = require('./ChannelMixing');

class AudioPort extends EventEmitter {
	/**
	 * @param {import('./AudioContext')} context
	 * @param {import('./AudioDestinationNode')} node
	 * @param {string} id
	 */
	constructor(context, node, id) {
		super();

		this.connections = [];
		this.node = node;
		this.id = id;
		this.context = context;
	}

	/**
	 * Connects the AudioPort to another AudioPort
	 * @param {AudioPort} otherPort
	 * @returns {boolean} true if connection succeeded
	 */
	connect(otherPort) {
		if (this.connections.indexOf(otherPort) !== -1) {
			return false;
		}

		this.connections.push(otherPort);
		otherPort.connect(this);

		this.emit('connection', otherPort);

		return true;
	}

	/**
	 * Disconnects the AudioPort from another AudioPort
	 * @param {AudioPort} otherPort
	 * @returns {boolean} true if disconnection succeeded
	 */
	disconnect(otherPort) {
		const connInd = this.connections.indexOf(otherPort);

		if (connInd === -1) {
			return false;
		}

		this.connections.splice(connInd, 1);
		otherPort.disconnect(this);

		this.emit('disconnection', otherPort);

		return true;
	}

	/**
	 * Called when a node is killed. Removes connections, and event listeners.
	 */
	_kill() {
		this.connections.slice(0).forEach((port) => {
			this.disconnect(port);
		});

		this.removeAllListeners();
	}
}

class AudioInput extends AudioPort {
	/**
	 * @param {import("./AudioContext")} context
	 * @param {import("./AudioDestinationNode")} node
	 * @param {string} id
	 */
	constructor(context, node, id) {
		super(context, node, id);

		// `computedNumberOfChannels` is scheduled to be recalculated everytime a connection
		// or disconnection happens.
		this.computedNumberOfChannels = null;
		this.on('connected', () => (this.computedNumberOfChannels = null));
		this.on('disconnected', () => (this.computedNumberOfChannels = null));
	}

	get sources() {
		return this.connections;
	}

	/**
	 * Connects the AudioPort to another AudioPort
	 * @param {AudioPort} source
	 * @returns {boolean} true if connection succeeded
	 */
	connect(source) {
		// When the number of channels of the source changes, we trigger
		// computation of `computedNumberOfChannels`
		source.on('_numberOfChannels', () => {
			this.computedNumberOfChannels = null;
		});

		return super.connect(source);
	}

	/**
	 * Disconnects the AudioPort from another AudioPort
	 * @param {AudioPort} source
	 * @returns {boolean} true if disconnection succeeded
	 */
	disconnect(source) {
		source.removeAllListeners('_numberOfChannels');

		return super.disconnect(source);
	}

	/**
	 * Ticks the AudioInput
	 */
	_tick() {
		const inBuffers = this.sources.map((source) => source._tick());

		if (this.computedNumberOfChannels === null) {
			this._computeNumberOfChannels(
				this.sources.length ? _.chain(inBuffers).pluck('numberOfChannels').max().value() : 0
			);
		}

		const outBuffer = new AudioBuffer(this.computedNumberOfChannels, BLOCK_SIZE, this.context.sampleRate);

		inBuffers.forEach((inBuffer) => {
			const ch = new ChannelMixing(
				inBuffer.numberOfChannels,
				this.computedNumberOfChannels,
				this.node.channelInterpretation
			);

			ch.process(inBuffer, outBuffer);
		});

		return outBuffer;
	}

	/**
	 * @protected
	 */
	_computeNumberOfChannels(maxChannelsUpstream = 1) {
		const countMode = this.node.channelCountMode;
		const channelCount = this.node.channelCount;

		if (countMode === 'max') {
			this.computedNumberOfChannels = maxChannelsUpstream;
		} else if (countMode === 'clamped-max') {
			this.computedNumberOfChannels = Math.min(maxChannelsUpstream, channelCount);
		} else if (countMode === 'explicit') {
			this.computedNumberOfChannels = channelCount;
		} else {
			// this shouldn't happen
			throw new Error('invalid channelCountMode');
		}
	}
}

class AudioOutput extends AudioPort {
	/**
	 * @param {import("./AudioContext")} context
	 * @param {import("./AudioDestinationNode")} node
	 * @param {string} id
	 */
	constructor(context, node, id) {
		super(context, node, id);

		// This caches the block fetched from the node.
		this._cachedBlock = {
			time: -1,
			buffer: null
		};

		// This catches the number of channels of the audio going through this output
		this._numberOfChannels = null;
	}

	get sinks() {
		return this.connections;
	}

	/**
	 * Ticks the AudioOutput
	 * Pulls the audio from the node only once, and copies it so that several
	 * nodes downstream can pull the same block.
	 */
	_tick() {
		if (this._cachedBlock.time > this.context.currentTime) {
			return this._cachedBlock.buffer;
		}

		const outBuffer = this.node._tick();

		if (this._numberOfChannels !== outBuffer.numberOfChannels) {
			this._numberOfChannels = outBuffer.numberOfChannels;

			this.emit('_numberOfChannels');
		}

		this._cachedBlock = {
			time: this.context.currentTime,
			buffer: outBuffer
		};

		return outBuffer;
	}
}

module.exports = {
	AudioOutput: AudioOutput,
	AudioInput: AudioInput
};
