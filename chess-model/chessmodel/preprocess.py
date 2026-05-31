import argparse
import io
import zstandard as zstd
from chessmodel.dataset import iter_samples_from_pgn, write_shards


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pgn-zst", required=True)
    ap.add_argument("--out-dir", default="data/shards")
    ap.add_argument("--shard-size", type=int, default=100_000)
    args = ap.parse_args()

    dctx = zstd.ZstdDecompressor()
    with open(args.pgn_zst, "rb") as fh:
        stream = dctx.stream_reader(fh)
        text = io.TextIOWrapper(stream, encoding="utf-8", errors="ignore")
        samples = iter_samples_from_pgn(text)
        paths = write_shards(samples, args.out_dir, args.shard_size)
    print(f"Wrote {len(paths)} shards to {args.out_dir}")


if __name__ == "__main__":
    main()
