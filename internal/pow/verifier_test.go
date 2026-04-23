package pow

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"testing"
)

// Brute-force a valid nonce for low difficulties (tests only).
func findValidNonce(t *testing.T, seed string, difficulty int) string {
	t.Helper()
	for i := 0; i < 1<<24; i++ {
		nonce := strconv.Itoa(i)
		if leadingZeroBits(sha256hex(seed+nonce)) >= difficulty {
			return nonce
		}
	}
	t.Fatalf("no nonce found within budget for difficulty %d", difficulty)
	return ""
}

func sha256hex(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func TestVerifyAccepts(t *testing.T) {
	seed := "abc123"
	diff := 8
	nonce := findValidNonce(t, seed, diff)
	ok := Verify(seed, nonce, diff)
	if !ok {
		t.Fatalf("expected valid, seed=%s nonce=%s", seed, nonce)
	}
}

func TestVerifyRejectsTooFewZeros(t *testing.T) {
	if Verify("seed", "0", 32) {
		t.Fatal("expected rejection for impossible difficulty")
	}
}

func TestLeadingZeroBitsCountsCorrectly(t *testing.T) {
	// 0x0f = 0000 1111 -> 4 leading zero bits
	if got := leadingZeroBits("0f" + "00"); got != 4 {
		t.Errorf("want 4, got %d", got)
	}
	// 0x00 + 0x80 = 00000000 10000000 -> 8 leading zero bits
	if got := leadingZeroBits("0080"); got != 8 {
		t.Errorf("want 8, got %d", got)
	}
}

// Ensure public surface compiles.
var _ = fmt.Sprintf
