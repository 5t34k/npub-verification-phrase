# npub verification phrase

A small, deterministic way to turn a Nostr public key (`npub`) into a short,
human-readable phrase such as:

```
jacket toe tackle umbrella aim hurry
```

[View live demo.](https://npub-phrase.5t34k.com/)

The same npub always produces the same phrase. This lets two people confirm
they are looking at the same key by comparing a handful of memorable words
instead of reading out a 63-character `npub1…` string. It is the exact
algorithm [Nowhere](https://github.com/5t34k/nowhere) uses for its author / seller verification
phrases, reproduced here so anyone can generate the **same** phrase for a key.

This is a **fingerprint**, not a signature. It proves nothing on its own — it
just gives a stable, low-friction label for a public key so humans can compare
keys out loud, on a card, or over a call.

## How the phrase is derived

```
npub  ──bech32 decode──▶  32-byte pubkey  ──SHA-256──▶  fingerprint  ──BIP-39──▶  phrase
```

Step by step:

1. **Decode the npub to raw bytes.**
   An `npub` is a [NIP-19](https://github.com/nostr-protocol/nips/blob/master/19.md)
   bech32 encoding of a 32-byte x-only public key. Decode it to those 32 raw
   bytes. (If you already have the key as 64-character hex, just hex-decode it
   to the same 32 bytes.)

2. **Hash the raw pubkey bytes with SHA-256.**
   Run SHA-256 over the **32 raw bytes** — not over the `npub` string and not
   over the hex text. The result is a 32-byte digest. Render it as 64 lowercase
   hex characters. This is the **fingerprint**.

3. **Map the fingerprint to words (BIP-39 style).**
   Each word encodes **11 bits** (an index `0–2047` into the 2048-word
   [BIP-39 English wordlist](./wordlist.js)). For an `N`-word phrase you need
   `N × 11` bits, which is `ceil(N × 11 / 4)` hex characters. Take that many hex
   characters **from the front** of the fingerprint and consume them
   **most-significant-bit first**, 11 bits per word:

   - Maintain a bit buffer. Read hex characters left to right; each contributes
     4 bits (shift the buffer left by 4 and OR in the nibble).
   - Once the buffer holds ≥ 11 bits, take the top 11 bits as the word index
     (`(buffer >> (bits − 11)) & 0x7FF`), look it up in the wordlist, and drop
     those 11 bits from the buffer.
   - Repeat until you have `N` words.

4. **Join the words with single spaces.**

Because bits are always consumed from the front, the phrase is
**prefix-stable**: a 5-word phrase is exactly the first 5 words of the 6-word
phrase for the same key.

### Parameters

| Parameter | Value |
|-----------|-------|
| Hash | SHA-256 over the 32 raw pubkey bytes |
| Wordlist | Standard BIP-39 English, 2048 words (see [`wordlist.js`](./wordlist.js)) |
| Bits per word | 11 (index `0–2047`) |
| Word count | Configurable, clamped to **3–12**. Nowhere's default is **6** |
| Separator | Single space |

### Worked example

```
npub        npub1x5t34kxd79m657qcuwp4zrypy9t8t4e6yks5zapjvau29t0xvgaqakh2p2
pubkey hex  35171ad8cdf177aa7818e383510c81215675d73a25a14174326778a2ade6623a
SHA-256     771c7374761054df7d1ac2091b8762434f746e27bf6922db1e13c724f241342c

3 words   jacket toe tackle
5 words   jacket toe tackle umbrella aim
6 words   jacket toe tackle umbrella aim hurry      ← Nowhere default
8 words   jacket toe tackle umbrella aim hurry virtual flame
```

Walking the first word: the fingerprint starts `771c…`. In bits that is
`0111 0111 0001 1100…`. The top 11 bits are `011 1011 1000` = `0x3B8` = 952,
and `WORDLIST[952]` is `jacket`.


## Files

| File | What it is |
|------|------------|
| [`verification-phrase.js`](./verification-phrase.js) | Reference implementation (ES module + CLI). Works in Node 18+ and browsers. |
| [`wordlist.js`](./wordlist.js) | The 2048-word BIP-39 English wordlist, as a standalone module to reference. |
| [`example.js`](./example.js) | Minimal usage example. |
| [`demo.html`](./demo.html) | Self-contained web page: paste an npub, see the phrase. |

## Running the code example

```bash
npm install        # pulls in nostr-tools (for npub decoding)
node example.js
```

Or use it as a one-off CLI:

```bash
node verification-phrase.js npub1x5t34kxd79m657qcuwp4zrypy9t8t4e6yks5zapjvau29t0xvgaqakh2p2
# jacket toe tackle umbrella aim hurry

node verification-phrase.js npub1x5t34kxd79m657qcuwp4zrypy9t8t4e6yks5zapjvau29t0xvgaqakh2p2 4
# jacket toe tackle umbrella
```

Import it in your own code:

```js
import { verificationPhraseFromNpub } from './verification-phrase.js';

const phrase = await verificationPhraseFromNpub('npub1…', 6);
```

The implementation leans on [`nostr-tools`](https://github.com/nbd-wtf/nostr-tools)
(`nip19.decode`) for bech32 npub decoding; everything else (SHA-256 via Web
Crypto, the BIP-39 mapping) is dependency-free.

## License

MIT.
