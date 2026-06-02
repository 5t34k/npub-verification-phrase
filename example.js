// Minimal usage example.
//   1. npm install
//   2. node example.js
//
// Expected output (this npub is deterministic):
//   npub1x5t34kxd79m657qcuwp4zrypy9t8t4e6yks5zapjvau29t0xvgaqakh2p2
//   pubkey hex : 35171ad8cdf177aa7818e383510c81215675d73a25a14174326778a2ade6623a
//   fingerprint: 771c7374761054df7d1ac2091b8762434f746e27bf6922db1e13c724f241342c
//   phrase (6) : jacket toe tackle umbrella aim hurry

import {
	npubToPubkeyHex,
	computeFingerprint,
	computeVerificationPhrase,
	verificationPhraseFromNpub
} from './verification-phrase.js';

const npub = 'npub1x5t34kxd79m657qcuwp4zrypy9t8t4e6yks5zapjvau29t0xvgaqakh2p2';

// Step by step
const pubkeyHex = npubToPubkeyHex(npub);
const fingerprint = await computeFingerprint(pubkeyHex);

console.log(npub);
console.log('pubkey hex :', pubkeyHex);
console.log('fingerprint:', fingerprint);
console.log('phrase (6) :', computeVerificationPhrase(fingerprint, 6));

// Or in one call
console.log('phrase (3) :', await verificationPhraseFromNpub(npub, 3));
console.log('phrase (8) :', await verificationPhraseFromNpub(npub, 8));
