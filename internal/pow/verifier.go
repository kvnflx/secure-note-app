// Package pow implements a SHA-256 leading-zero-bits proof-of-work.
package pow

import (
	"crypto/sha256"
	"encoding/hex"
)

// Verify returns true iff SHA256(seed || nonce) has >= difficulty leading zero bits.
func Verify(seed, nonce string, difficulty int) bool {
	sum := sha256.Sum256([]byte(seed + nonce))
	return leadingZeroBitsRaw(sum[:]) >= difficulty
}

// leadingZeroBits accepts a hex string (for test convenience).
func leadingZeroBits(hexStr string) int {
	b, err := hex.DecodeString(hexStr)
	if err != nil {
		return 0
	}
	return leadingZeroBitsRaw(b)
}

func leadingZeroBitsRaw(b []byte) int {
	count := 0
	for _, by := range b {
		if by == 0 {
			count += 8
			continue
		}
		for mask := byte(0x80); mask != 0; mask >>= 1 {
			if by&mask == 0 {
				count++
			} else {
				return count
			}
		}
	}
	return count
}
