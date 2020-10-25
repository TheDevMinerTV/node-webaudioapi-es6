// @ts-check

const AudioBuffer = require('./AudioBuffer');
const AV = require('av');
require('mp3');
require('flac');
require('aac');

/**
 * Decodes a buffer to an AudioBuffer
 * @param {Buffer} buffer
 * @param {(error: Error | null, audioBuffer?: import('./AudioBuffer')) => void} done
 */
const decodeAudioData = (buffer, done) => {
	// @ts-ignore
	var asset = AV.Asset.fromBuffer(buffer);

	asset.on('error', (err) => done(err));

	asset.decodeToBuffer(
		/** @param {number[]} decoded */
		(decoded) => {
			const deinterleaved = [];
			const numberOfChannels = asset.format.channelsPerFrame;
			const length = Math.floor(decoded.length / numberOfChannels);

			for (let ch = 0; ch < numberOfChannels; ch++) {
				deinterleaved.push(new Float32Array(length));
			}

			for (let ch = 0; ch < numberOfChannels; ch++) {
				const chArray = deinterleaved[ch];

				for (let i = 0; i < length; i++) {
					chArray[i] = decoded[ch + i * numberOfChannels];
				}
			}

			done(null, AudioBuffer.fromArray(deinterleaved, asset.format.sampleRate));
		}
	);
};

/**
 * Decodes a buffer to an AudioBuffer
 * @param {Buffer} buffer
 * @returns {Promise<import('./AudioBuffer')>}
 */
const decodeAudioDataAsync = (buffer) => {
	return new Promise((res, rej) => {
		// @ts-ignore
		const asset = AV.Asset.fromBuffer(buffer);

		asset.on('error', (err) => rej(err));

		asset.decodeToBuffer((decoded) => {
			const numberOfChannels = asset.format.channelsPerFrame;
			const length = Math.floor(decoded.length / numberOfChannels);
			const deinterleaved = [];

			for (let ch = 0; ch < numberOfChannels; ch++) {
				deinterleaved.push(new Float32Array(length));
			}

			for (let ch = 0; ch < numberOfChannels; ch++) {
				const chArray = deinterleaved[ch];

				for (let i = 0; i < length; i++) {
					chArray[i] = decoded[ch + i * numberOfChannels];
				}
			}

			res(AudioBuffer.fromArray(deinterleaved, asset.format.sampleRate));
		});
	});
};

module.exports = {
	decodeAudioData,
	decodeAudioDataAsync
};
