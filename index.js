module.exports = {
	AudioContext: require('./lib/AudioContext'),
	AudioParam: require('./lib/AudioParam'),
	AudioNode: require('./lib/AudioNode'),
	AudioDestinationNode: require('./lib/AudioDestinationNode'),
	AudioBuffer: require('./lib/AudioBuffer'),
	AudioBufferSourceNode: require('./lib/AudioBufferSourceNode'),
	GainNode: require('./lib/GainNode'),
	...require('./lib/constants')
};
