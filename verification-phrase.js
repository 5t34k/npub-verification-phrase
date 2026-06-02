// npub verification phrase — reference implementation
//
// Derives a short, human-readable phrase from a Nostr public key, using the
// exact algorithm Nowhere uses. The same npub always produces the same phrase,
// so two people can compare a few spoken words instead of a 63-character npub.
//
// Pipeline:  npub --bech32--> 32-byte pubkey --SHA-256--> fingerprint --BIP39--> phrase
//
// Runs in Node 18+ and modern browsers (uses Web Crypto via globalThis.crypto).
// npub decoding leans on nostr-tools (nip19); everything else is dependency-free.

import { nip19 } from 'nostr-tools';
import { WORDLIST } from './wordlist.js';

// Default phrase length used by the live Nowhere renderer.
export const DEFAULT_WORD_COUNT = 6;

/** Decode an npub (or raw 64-char hex) to a 32-byte pubkey in lowercase hex. */
export function npubToPubkeyHex(npub) {
	if (/^[0-9a-fA-F]{64}$/.test(npub)) return npub.toLowerCase();
	const decoded = nip19.decode(npub);
	if (decoded.type !== 'npub') {
		throw new Error(`Expected an npub, got "${decoded.type}"`);
	}
	return decoded.data;
}

function hexToBytes(hex) {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}

/**
 * Fingerprint = SHA-256 of the RAW pubkey bytes (not the npub string, not the
 * hex string) returned as 64 lowercase hex characters.
 */
export async function computeFingerprint(pubkeyHex) {
	const digest = await globalThis.crypto.subtle.digest('SHA-256', hexToBytes(pubkeyHex));
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Map a fingerprint to `wordCount` words using the BIP-39 English wordlist.
 *
 * Each word encodes 11 bits (index 0–2047). Bits are taken from the FRONT of
 * the fingerprint, most-significant-bit first. Because we always read from the
 * front, the phrase is prefix-stable: the 5-word phrase is the first 5 words of
 * the 6-word phrase, and so on.
 *
 * wordCount is clamped to [3, 12].
 */
export function computeVerificationPhrase(fingerprint, wordCount = DEFAULT_WORD_COUNT) {
	const clamped = Math.max(3, Math.min(12, wordCount));
	const totalBits = clamped * 11;

	// Each hex char is 4 bits; take just enough hex from the front.
	const hex = fingerprint.slice(0, Math.ceil(totalBits / 4));

	const words = [];
	let bitBuffer = 0;
	let bitsInBuffer = 0;
	let hexIndex = 0;

	for (let i = 0; i < clamped; i++) {
		while (bitsInBuffer < 11 && hexIndex < hex.length) {
			bitBuffer = (bitBuffer << 4) | parseInt(hex[hexIndex], 16);
			bitsInBuffer += 4;
			hexIndex++;
		}
		const shift = bitsInBuffer - 11;
		const index = (bitBuffer >> shift) & 0x7ff;
		bitsInBuffer -= 11;
		bitBuffer &= (1 << bitsInBuffer) - 1;
		words.push(WORDLIST[index]);
	}

	return words.join(' ');
}

/** Convenience: npub (or hex pubkey) → verification phrase. */
export async function verificationPhraseFromNpub(npub, wordCount = DEFAULT_WORD_COUNT) {
	const pubkeyHex = npubToPubkeyHex(npub);
	const fingerprint = await computeFingerprint(pubkeyHex);
	return computeVerificationPhrase(fingerprint, wordCount);
}

// CLI: `node verification-phrase.js <npub> [wordCount]`
if (import.meta.url === `file://${process.argv[1]}`) {
	const [, , npub, count] = process.argv;
	if (!npub) {
		console.error('Usage: node verification-phrase.js <npub|hex> [wordCount=6]');
		process.exit(1);
	}
	const wordCount = count ? parseInt(count, 10) : DEFAULT_WORD_COUNT;
	console.log(await verificationPhraseFromNpub(npub, wordCount));
}
