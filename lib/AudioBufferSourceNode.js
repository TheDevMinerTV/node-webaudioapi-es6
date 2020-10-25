// @ts-check

const { BLOCK_SIZE } = require('./constants');
const AudioNode = require('./AudioNode');
const AudioParam = require('./AudioParam');
const AudioBuffer = require('./AudioBuffer');

class AudioBufferSourceNode extends AudioNode {
	/**
	 * @param {import("./AudioContext")} context
	 */
	constructor(context) {
		super(context, 0, 1, undefined, 'max', 'speakers');

		this.buffer = null;
		this.loop = false;
		this.loopStart = 0;
		this.loopEnd = 0;

		/** @readonly */
		this.playbackRate = new AudioParam(this.context, 1, 'a');

		/** @private */
		this._dsp = this._dspZeros;
	}

	/**
	 * @param {number} when
	 * @param {any} offset
	 * @param {number} duration
	 */
	start(when, offset, duration) {
		this._schedule('start', when, () => {
			if (!this.buffer) throw new Error('Invalid Buffer');

			// Subsequent calls to `start` have no effect
			this.start = () => {};

			// keeps track of the current position in the buffer
			var sampleRate = this.context.sampleRate,
				cursor,
				cursorEnd,
				cursorNext,
				missingFrames,
				outBuffer;

			var reinitPlayback = () => {
				cursor = (offset ? offset : this.loopStart) * sampleRate;

				if (duration) {
					cursorEnd = cursor + duration * sampleRate;
				} else if (this.loopEnd) {
					cursorEnd = this.loopEnd * sampleRate;
				} else {
					cursorEnd = this.buffer.length;
				}

				cursorNext = cursor;
			};

			reinitPlayback();

			this._dsp = function () {
				cursorNext = cursor + BLOCK_SIZE;

				// If there's enough data left to be read in the buffer, just read it,
				// otherwise we need to handle things a bit differently
				if (cursorNext < cursorEnd) {
					outBuffer = this.buffer.slice(cursor, cursorNext);
					cursor = cursorNext;

					return outBuffer;
				} else {
					outBuffer = new AudioBuffer(this.buffer.numberOfChannels, BLOCK_SIZE, sampleRate);
					outBuffer.set(this.buffer.slice(cursor, cursorNext));

					// If looping, we must reinitialize our cursor variables.
					// If not looping, we free the node
					if (this.loop) {
						missingFrames = cursorNext - cursorEnd;

						reinitPlayback();

						cursorNext = cursor + missingFrames;

						outBuffer.set(this.buffer.slice(cursor, cursorNext), outBuffer.length - missingFrames);
					} else {
						if (this.onended) {
							this._schedule(
								'onended',
								this.context.currentTime + (cursorNext - cursorEnd) / sampleRate,
								this.onended
							);
						}

						this._schedule(
							'kill',
							this.context.currentTime + (cursorNext - cursorEnd) / sampleRate,
							this._kill.bind(this)
						);
					}

					cursor = cursorNext;

					return outBuffer;
				}
			};
		});
	}

	/**
	 * Schedules a stop of the node
	 * @param {number} when
	 */
	stop(when) {
		this._schedule('stop', when, () => {
			this._dsp = this._dspZeros;
		});
	}

	onended() {}

	_tick() {
		super._tick();

		return this._dsp();
	}

	/** @protected */
	_dsp() {}

	/** @protected */
	_dspZeros() {
		return new AudioBuffer(1, BLOCK_SIZE, this.context.sampleRate);
	}
}

module.exports = AudioBufferSourceNode;
