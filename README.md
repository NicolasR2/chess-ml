# Chess ML

Aplicación web para jugar ajedrez contra un modelo de red neuronal **entrenado desde cero** hasta ~2000 ELO. Front minimalista y animado (React + Vite), API en Go y motor en Python (PyTorch).

- **Frontend** — React + Vite + TypeScript, animaciones con framer-motion, fichas SVG propias, selección de nivel de ELO por niveles (no slider).
- **Backend** — Go (chi): reglas, partidas en memoria, reenvía la jugada al motor.
- **Motor** — Python + PyTorch (red ResNet estilo AlphaZero + búsqueda MCTS), servido con FastAPI.

---

## Cómo ejecutarlo localmente

Tres procesos, cada uno en su terminal:

```bash
# 1. Motor Python (sirve el modelo en el puerto 8000)
cd chess-model
pip install -r requirements.txt
python -m chessmodel.serve --checkpoint checkpoints/flagship_r3.pt

# 2. Backend Go (puerto 8080, reenvía al motor)
cd backend
CHESS_ENGINE=model MODEL_URL=http://127.0.0.1:8000 go run ./cmd/server

# 3. Frontend (puerto 5173)
cd frontend
npm install
npm run dev
```

Abre **http://localhost:5173**. Si el backend no corre en `http://127.0.0.1:8080`, define `VITE_API_URL`.

> El backend también tiene un motor de respaldo (alfa-beta) si no defines `CHESS_ENGINE=model`, útil para probar el front sin levantar Python.

---

## Cómo se entrenó el modelo (en local, GPU AMD)

El modelo aprende por **imitación supervisada**: una red ResNet con dos cabezas —*policy* (predice la jugada) y *value* (evalúa la posición)— se entrena para reproducir las jugadas y resultados de partidas humanas fuertes, y en inferencia se guía con búsqueda **PUCT-MCTS**.

Todo el entrenamiento se hizo **localmente en una GPU AMD Radeon RX 6700 XT** usando **PyTorch + `torch-directml`** (DirectML, no CUDA). El dispositivo de cómputo es `privateuseone:0`.

- **Codificación del tablero:** 18 planos de 8×8 (12 de piezas + turno + 4 de enroque + al paso).
- **Vocabulario de jugadas:** enumeración determinista de todos los movimientos origen→destino(+promoción) → 4544 salidas de la cabeza de policy.
- **Red:** `ChessNet(channels=64, blocks=6)`.
- **Pérdida:** `CrossEntropy(policy) + value_weight · MSE(value)`.
- **Entrenamiento por streaming:** los shards se cargan por lotes (no caben 67M de posiciones en RAM a la vez) y cada ronda hace *warm-start* desde el checkpoint anterior.

### Rondas de entrenamiento

| Ronda | Datos | Épocas | Pérdida (inicio→fin) | Checkpoint |
|-------|-------|-------:|----------------------|------------|
| base | 500k posiciones | 10 | 4.63 → 1.45 | `model.pt` |
| r1 | 10.8M | 3 | 3.14 → 2.56 | `flagship_r1.pt` |
| r2 | 10.8M (warm-start) | 5 | 2.49 → 2.34 | `flagship_r2.pt` |
| r3 | **67M** (warm-start) | 2 | 2.42 → 2.37 | `flagship_r3.pt` |

Tiempos aproximados en la RX 6700 XT: ~45 min/época con 10.8M posiciones; ~2–3 h/época con 67M.

Reentrenar / continuar:

```bash
cd chess-model
# preprocesar un mes de Lichess a shards
python -m chessmodel.preprocess --pgn-zst data/lichess_2016-02.pgn.zst --out-dir data/shards_2016_02
# entrenar (streaming; --shards admite varios globs separados por comas; --init-checkpoint para warm-start)
python -m chessmodel.train --shards "data/shards_2016_02/*.npz" --epochs 3 --batch-size 1024 --out checkpoints/flagship.pt
```

---

## De dónde salieron los datos de entrenamiento

De la **base de datos pública de partidas de Lichess** (<https://database.lichess.org>), descargando los volcados mensuales en formato `.pgn.zst`.

Se usaron **3 meses** (2016-02, 2016-07 y 2017-02). De cada partida se filtró para quedarnos solo con juego de calidad:

- **Ambos jugadores con rating 2000–2400.**
- **Control de tiempo con base ≥ 180 s** (nada de bullet).
- Resultado válido (victoria/derrota/tablas).

Cada posición de las partidas que pasan el filtro se convierte en una muestra `(tablero codificado, índice de jugada, resultado desde el lado a mover)` y se guarda en shards comprimidos `.npz` de 100k posiciones. En total: **~67 millones de posiciones**.

> El preprocesado (parseo con `python-chess`) es lo más lento del pipeline; ronda 1 hora por cada ~100 shards.

---

## Cómo se midió el ELO

Mediante *gauntlets* (series de partidas) del modelo **contra Stockfish**, alternando colores, con Stockfish limitado a una fuerza objetivo mediante `UCI_LimitStrength` + `UCI_Elo` (para objetivos < 1320, que es el mínimo de Stockfish, se usa `Skill Level` + profundidad reducida).

El ELO del modelo se estima a partir del marcador con la fórmula logística estándar:

```
ELO_modelo = ELO_ancla + 400 · log10( score / (1 − score) )
```

donde `score` es la fracción de puntos del modelo. Implementado en `chessmodel/evaluate.py` y `chessmodel/elo.py`:

```bash
cd chess-model
python -m chessmodel.evaluate --checkpoint checkpoints/flagship_r3.pt \
  --stockfish tools/stockfish/stockfish-windows-x86-64-avx2.exe \
  --games 60 --sims 120 --uci-elo 2000
```

### Progreso de ELO

| Modelo | Medición | ELO estimado |
|--------|----------|-------------:|
| base | 1.0/20 vs Stockfish Skill 0 | ~700 |
| flagship_r1 | 12.5/20 vs Skill 0 | ~1300 |
| flagship_r2 | 9.0/20 vs `UCI_Elo` 1700 | ~1665 |
| **flagship_r3** | **40.5/60 vs `UCI_Elo` 2000** | **~2000–2120** |

**`flagship_r3` mantiene récord ganador (67.5%) en 60 partidas contra Stockfish puesto a 2000 ELO** → se cumple el objetivo de ~2000.

*Notas de honestidad:* el limitador `UCI_Elo` de Stockfish a 0.1 s/jugada no está calibrado con precisión, y la estimación de un solo ancla tiene margen (±~90–190 ELO según el número de partidas). El dato más fiable es la corrida de 60 partidas vs 2000.

---

## Niveles de dificultad

Del modelo fuerte se derivan **7 niveles de ELO (500–2200)** debilitándolo en inferencia: menos simulaciones de MCTS + muestreo con temperatura + tasa de *blunders*. En la interfaz se eligen por niveles (sin slider). La calibración fina de cada nivel es un paso aparte (`chessmodel/calibrate.py`).

---

## Estructura del repositorio

```
chess-model/   Motor Python: entrenamiento, MCTS, evaluación y servidor FastAPI
backend/       API en Go (reglas, partidas en memoria, motores modelo + respaldo)
frontend/      Interfaz React + Vite + TypeScript
```

## Créditos

Los sets de fichas (Monolito, Contorno, Neón) son SVG originales hechos para este proyecto.
