package storage

import (
	"context"
	"errors"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisConfig struct {
	Addr    string // tcp "host:port"
	Network string // e.g. "unix" or "" for tcp
}

type RedisStore struct {
	rdb *redis.Client
}

func NewRedis(cfg RedisConfig) (*RedisStore, error) {
	opts := &redis.Options{Addr: cfg.Addr, Network: cfg.Network}
	if opts.Network == "" {
		opts.Network = "tcp"
	}
	rdb := redis.NewClient(opts)
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}
	return &RedisStore{rdb: rdb}, nil
}

func (r *RedisStore) Close() error { return r.rdb.Close() }

func noteKey(id string) string  { return "note:" + id }
func powKey(seed string) string { return "pow:" + seed }

func (r *RedisStore) PutNote(ctx context.Context, id string, n Note) error {
	key := noteKey(id)
	ttl := time.Until(n.ExpiresAt)
	if ttl <= 0 {
		return errors.New("storage: expiry in the past")
	}
	pw := "0"
	if n.HasPassword {
		pw = "1"
	}
	fields := []interface{}{
		"ciphertext", n.Ciphertext,
		"expires_at", strconv.FormatInt(n.ExpiresAt.Unix(), 10),
		"kill_token_hash", n.KillTokenHash,
		"has_password", pw,
	}
	if err := r.rdb.HSet(ctx, key, fields...).Err(); err != nil {
		return err
	}
	return r.rdb.Expire(ctx, key, ttl).Err()
}

// revealScript atomically reads and deletes the note.
var revealScript = redis.NewScript(`
local v = redis.call('HGETALL', KEYS[1])
if #v == 0 then return nil end
redis.call('DEL', KEYS[1])
return v
`)

func (r *RedisStore) RevealNote(ctx context.Context, id string) (Note, error) {
	res, err := revealScript.Run(ctx, r.rdb, []string{noteKey(id)}).Result()
	if errors.Is(err, redis.Nil) {
		return Note{}, ErrNotFound
	}
	if err != nil {
		return Note{}, err
	}
	arr, ok := res.([]interface{})
	if !ok || len(arr) == 0 {
		return Note{}, ErrNotFound
	}
	n := Note{}
	for i := 0; i+1 < len(arr); i += 2 {
		k, _ := arr[i].(string)
		v, _ := arr[i+1].(string)
		switch k {
		case "ciphertext":
			n.Ciphertext = []byte(v)
		case "expires_at":
			sec, _ := strconv.ParseInt(v, 10, 64)
			n.ExpiresAt = time.Unix(sec, 0)
		case "kill_token_hash":
			n.KillTokenHash = v
		case "has_password":
			n.HasPassword = v == "1"
		}
	}
	return n, nil
}

// killScript deletes only if the provided hash matches.
var killScript = redis.NewScript(`
local h = redis.call('HGET', KEYS[1], 'kill_token_hash')
if not h then return 0 end
if h ~= ARGV[1] then return -1 end
redis.call('DEL', KEYS[1])
return 1
`)

func (r *RedisStore) KillNote(ctx context.Context, id, killTokenHash string) error {
	res, err := killScript.Run(ctx, r.rdb, []string{noteKey(id)}, killTokenHash).Int()
	if err != nil {
		return err
	}
	switch res {
	case 1:
		return nil
	case 0:
		return ErrNotFound
	case -1:
		return ErrKillTokenMismatch
	default:
		return errors.New("storage: unexpected kill result")
	}
}

func (r *RedisStore) IssuePOWSeed(ctx context.Context, seed string, ttl time.Duration) error {
	return r.rdb.Set(ctx, powKey(seed), "1", ttl).Err()
}

func (r *RedisStore) ConsumePOWSeed(ctx context.Context, seed string) error {
	deleted, err := r.rdb.Del(ctx, powKey(seed)).Result()
	if err != nil {
		return err
	}
	if deleted == 0 {
		return ErrPOWSeedInvalid
	}
	return nil
}
