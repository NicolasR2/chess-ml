import argparse
import glob
import random
import numpy as np
import torch
import torch.nn as nn
from chessmodel.model import ChessNet


def _run_batches(net, opt, ce, mse, x_t, idx_t, v_t, device, batch_size, value_weight):
    """Run one shuffled pass over the given tensors. Returns (total_loss, batches)."""
    n = x_t.shape[0]
    perm = torch.randperm(n)
    total, batches = 0.0, 0
    for s in range(0, n, batch_size):
        b = perm[s:s + batch_size]
        xb = x_t[b].to(device)
        ib = idx_t[b].to(device)
        vb = v_t[b].to(device)
        p, val = net(xb)
        loss = ce(p, ib) + value_weight * mse(val.squeeze(1), vb)
        opt.zero_grad()
        loss.backward()
        opt.step()
        total += loss.item()
        batches += 1
    return total, batches


def train_on_arrays(net, x, idx, v, device, epochs=1, batch_size=256, lr=1e-3,
                    value_weight=1.0):
    net.to(device)
    opt = torch.optim.Adam(net.parameters(), lr=lr)
    ce = nn.CrossEntropyLoss()
    mse = nn.MSELoss()
    x_t = torch.from_numpy(x)
    idx_t = torch.from_numpy(idx)
    v_t = torch.from_numpy(v)
    first_loss = last_loss = None
    for epoch in range(epochs):
        net.train(True)
        total, batches = _run_batches(net, opt, ce, mse, x_t, idx_t, v_t,
                                      device, batch_size, value_weight)
        epoch_loss = total / max(batches, 1)
        if first_loss is None:
            first_loss = epoch_loss
        last_loss = epoch_loss
        print(f"epoch {epoch+1}/{epochs} loss={epoch_loss:.4f}", flush=True)
    return first_loss, last_loss


def train_streaming(net, shard_paths, device, epochs=1, batch_size=512, lr=1e-3,
                    value_weight=1.0, chunk_shards=8, seed=0):
    """Train over shard files without loading them all into RAM at once.

    Each epoch shuffles the shard order, then loads `chunk_shards` shards at a
    time, runs one pass over that chunk, and frees it before the next chunk.
    Corrupt/unreadable shards are skipped.
    """
    net.to(device)
    opt = torch.optim.Adam(net.parameters(), lr=lr)
    ce = nn.CrossEntropyLoss()
    mse = nn.MSELoss()
    rng = random.Random(seed)
    first_loss = last_loss = None
    for epoch in range(epochs):
        order = list(shard_paths)
        rng.shuffle(order)
        net.train(True)
        total, batches = 0.0, 0
        for i in range(0, len(order), chunk_shards):
            xs, ids, vs = [], [], []
            for path in order[i:i + chunk_shards]:
                try:
                    d = np.load(path)
                    xs.append(d["x"])
                    ids.append(d["idx"])
                    vs.append(d["v"])
                except Exception as e:
                    print(f"skipping {path}: {e}", flush=True)
            if not xs:
                continue
            x_t = torch.from_numpy(np.concatenate(xs))
            idx_t = torch.from_numpy(np.concatenate(ids))
            v_t = torch.from_numpy(np.concatenate(vs))
            del xs, ids, vs
            t, b = _run_batches(net, opt, ce, mse, x_t, idx_t, v_t,
                                device, batch_size, value_weight)
            total += t
            batches += b
            del x_t, idx_t, v_t
        epoch_loss = total / max(batches, 1)
        if first_loss is None:
            first_loss = epoch_loss
        last_loss = epoch_loss
        print(f"epoch {epoch+1}/{epochs} loss={epoch_loss:.4f}", flush=True)
    return first_loss, last_loss


def _load_shards(shard_glob):
    xs, ids, vs = [], [], []
    for path in sorted(glob.glob(shard_glob)):
        d = np.load(path)
        xs.append(d["x"])
        ids.append(d["idx"])
        vs.append(d["v"])
    return np.concatenate(xs), np.concatenate(ids), np.concatenate(vs)


def main():
    import torch_directml
    ap = argparse.ArgumentParser()
    ap.add_argument("--shards", default="data/shards/*.npz")
    ap.add_argument("--epochs", type=int, default=10)
    ap.add_argument("--batch-size", type=int, default=512)
    ap.add_argument("--channels", type=int, default=64)
    ap.add_argument("--blocks", type=int, default=6)
    ap.add_argument("--chunk-shards", type=int, default=8)
    ap.add_argument("--out", default="checkpoints/model.pt")
    args = ap.parse_args()
    device = torch_directml.device()
    print(f"device={device}")
    shard_paths = sorted(glob.glob(args.shards))
    print(f"shards={len(shard_paths)} (chunk_shards={args.chunk_shards})", flush=True)
    net = ChessNet(channels=args.channels, blocks=args.blocks)
    train_streaming(net, shard_paths, device, epochs=args.epochs,
                    batch_size=args.batch_size, chunk_shards=args.chunk_shards)
    net.to("cpu")  # DirectML tensors don't survive weights_only=True load
    torch.save({"channels": args.channels, "blocks": args.blocks,
                "state_dict": net.state_dict()}, args.out)
    print(f"saved {args.out}")


if __name__ == "__main__":
    main()
