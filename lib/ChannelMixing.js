// @ts-check

const { BLOCK_SIZE } = require('./constants');

class ChannelMixing {
	/**
	 * @type {(inBuffer:import('./AudioBuffer'), outBuffer:import('./AudioBuffer')) => void}
	 * @protected
	 */
	_process = null;

	/**
	 * @param {number} numberOfChannels
	 * @param {number} computedNumberOfChannels
	 * @param {string} channelInterpretation
	 */
	constructor(numberOfChannels, computedNumberOfChannels, channelInterpretation) {
		this.numberOfChannels = numberOfChannels;
		this.computedNumberOfChannels = computedNumberOfChannels;
		this.channelInterpretation = channelInterpretation;

		if (this.numberOfChannels === this.computedNumberOfChannels) {
			this._process = this.identityProcess;
		} else {
			if (this.channelInterpretation === 'speakers') {
				this._process = this['speakerMix' + this.numberOfChannels + this.computedNumberOfChannels];

				if (!this._process) {
					// well, this is ugly.
					if (this.numberOfChannels < this.computedNumberOfChannels) {
						this._process = this.discreteUpMix;
					} else {
						this._process = this.discreteDownMix;
					}
				}
			} else {
				if (this.numberOfChannels < this.computedNumberOfChannels) {
					this._process = this.discreteUpMix;
				} else {
					this._process = this.discreteDownMix;
				}
			}
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	identityProcess(inBuffer, outBuffer) {
		for (var ch = 0; ch < this.computedNumberOfChannels; ch++) {
			const inData = inBuffer.getChannelData(ch);
			const outData = outBuffer.getChannelData(ch);

			for (let i = 0; i < BLOCK_SIZE; i++) {
				outData[i] += inData[i];
			}
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	discreteUpMix(inBuffer, outBuffer) {
		for (let ch = 0; ch < this.numberOfChannels; ch++) {
			const chDataIn = inBuffer.getChannelData(ch);
			const chDataOut = outBuffer.getChannelData(ch);

			for (let i = 0; i < BLOCK_SIZE; i++) {
				chDataOut[i] += chDataIn[i];
			}
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	discreteDownMix(inBuffer, outBuffer) {
		for (let ch = 0; ch < this.computedNumberOfChannels; ch++) {
			const chDataIn = inBuffer.getChannelData(ch);
			const chDataOut = outBuffer.getChannelData(ch);

			for (let i = 0; i < BLOCK_SIZE; i++) {
				chDataOut[i] += chDataIn[i];
			}
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	speakerMix12(inBuffer, outBuffer) {
		const inData = inBuffer.getChannelData(0);
		const dataOutL = outBuffer.getChannelData(0);
		const dataOutR = outBuffer.getChannelData(1);

		for (let i = 0; i < BLOCK_SIZE; i++) {
			dataOutL[i] += inData[i];
			dataOutR[i] += inData[i];
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	speakerMix14(inBuffer, outBuffer) {
		const inData = inBuffer.getChannelData(0);
		const dataOutL = outBuffer.getChannelData(0);
		const dataOutR = outBuffer.getChannelData(1);

		for (let i = 0; i < BLOCK_SIZE; i++) {
			dataOutL[i] += inData[i];
			dataOutR[i] += inData[i];
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	speakerMix16(inBuffer, outBuffer) {
		const inData = inBuffer.getChannelData(0);
		const dataOutC = outBuffer.getChannelData(2);

		for (let i = 0; i < BLOCK_SIZE; i++) {
			dataOutC[i] += inData[i];
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	speakerMix24(inBuffer, outBuffer) {
		const dataL = inBuffer.getChannelData(0);
		const dataR = inBuffer.getChannelData(1);
		const dataOutL = outBuffer.getChannelData(0);
		const dataOutR = outBuffer.getChannelData(1);

		for (let i = 0; i < BLOCK_SIZE; i++) {
			dataOutL[i] += dataL[i];
			dataOutR[i] += dataR[i];
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	speakerMix26(inBuffer, outBuffer) {
		const dataL = inBuffer.getChannelData(0);
		const dataR = inBuffer.getChannelData(1);
		const dataOutL = outBuffer.getChannelData(0);
		const dataOutR = outBuffer.getChannelData(1);

		for (let i = 0; i < BLOCK_SIZE; i++) {
			dataOutL[i] += dataL[i];
			dataOutR[i] += dataR[i];
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	speakerMix46(inBuffer, outBuffer) {
		const dataL = inBuffer.getChannelData(0);
		const dataR = inBuffer.getChannelData(1);
		const dataSL = inBuffer.getChannelData(2);
		const dataSR = inBuffer.getChannelData(3);
		const dataOutL = outBuffer.getChannelData(0);
		const dataOutR = outBuffer.getChannelData(1);
		const dataOutSL = outBuffer.getChannelData(4);
		const dataOutSR = outBuffer.getChannelData(5);

		for (let i = 0; i < BLOCK_SIZE; i++) {
			dataOutL[i] += dataL[i];
			dataOutR[i] += dataR[i];
			dataOutSL[i] += dataSL[i];
			dataOutSR[i] += dataSR[i];
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	speakerMix21(inBuffer, outBuffer) {
		const dataL = inBuffer.getChannelData(0);
		const dataR = inBuffer.getChannelData(1);
		const dataOut = outBuffer.getChannelData(0);

		for (let i = 0; i < BLOCK_SIZE; i++) {
			dataOut[i] += 0.5 * (dataL[i] + dataR[i]);
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	speakerMix41(inBuffer, outBuffer) {
		const dataL = inBuffer.getChannelData(0);
		const dataR = inBuffer.getChannelData(1);
		const dataSL = inBuffer.getChannelData(2);
		const dataSR = inBuffer.getChannelData(3);
		const dataOut = outBuffer.getChannelData(0);

		for (let i = 0; i < BLOCK_SIZE; i++) {
			dataOut[i] += 0.25 * (dataL[i] + dataR[i] + dataSL[i] + dataSR[i]);
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	speakerMix42(inBuffer, outBuffer) {
		const dataL = inBuffer.getChannelData(0);
		const dataR = inBuffer.getChannelData(1);
		const dataSL = inBuffer.getChannelData(2);
		const dataSR = inBuffer.getChannelData(3);
		const dataOutL = outBuffer.getChannelData(0);
		const dataOutR = outBuffer.getChannelData(1);

		for (let i = 0; i < BLOCK_SIZE; i++) {
			dataOutL[i] += 0.5 * (dataL[i] + dataSL[i]);
			dataOutR[i] += 0.5 * (dataR[i] + dataSR[i]);
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	speakerMix61(inBuffer, outBuffer) {
		const dataL = inBuffer.getChannelData(0);
		const dataR = inBuffer.getChannelData(1);
		const dataC = inBuffer.getChannelData(2);
		const dataSL = inBuffer.getChannelData(4);
		const dataSR = inBuffer.getChannelData(5);
		const dataOut = outBuffer.getChannelData(0);

		for (let i = 0; i < BLOCK_SIZE; i++) {
			dataOut[i] += 0.7071 * (dataL[i] + dataR[i]) + dataC[i] + 0.5 * (dataSL[i] + dataSR[i]);
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	speakerMix62(inBuffer, outBuffer) {
		const dataL = inBuffer.getChannelData(0);
		const dataR = inBuffer.getChannelData(1);
		const dataC = inBuffer.getChannelData(2);
		const dataSL = inBuffer.getChannelData(4);
		const dataSR = inBuffer.getChannelData(5);
		const dataOutL = outBuffer.getChannelData(0);
		const dataOutR = outBuffer.getChannelData(1);

		for (let i = 0; i < BLOCK_SIZE; i++) {
			dataOutL[i] += dataL[i] + 0.7071 * (dataC[i] + dataSL[i]);
			dataOutR[i] += dataR[i] + 0.7071 * (dataC[i] + dataSR[i]);
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	speakerMix64(inBuffer, outBuffer) {
		const dataL = inBuffer.getChannelData(0);
		const dataR = inBuffer.getChannelData(1);
		const dataC = inBuffer.getChannelData(2);
		const dataSL = inBuffer.getChannelData(4);
		const dataSR = inBuffer.getChannelData(5);
		const dataOutL = outBuffer.getChannelData(0);
		const dataOutR = outBuffer.getChannelData(1);
		const dataOutSL = outBuffer.getChannelData(2);
		const dataOutSR = outBuffer.getChannelData(3);

		for (let i = 0; i < BLOCK_SIZE; i++) {
			dataOutL[i] += dataL[i] + 0.7071 * dataC[i];
			dataOutR[i] += dataR[i] + 0.7071 * dataC[i];
			dataOutSL[i] += dataSL[i];
			dataOutSR[i] += dataSR[i];
		}
	}

	/**
	 * @param {import('./AudioBuffer')} inBuffer
	 * @param {import('./AudioBuffer')} outBuffer
	 */
	process(inBuffer, outBuffer) {
		this._process(inBuffer, outBuffer);

		return outBuffer;
	}
}

module.exports = ChannelMixing;
