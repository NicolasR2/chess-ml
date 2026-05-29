# Diseño: Modelo de ajedrez (~2000 ELO) — sub-proyecto 1

**Fecha:** 2026-05-28
**Estado:** Aprobado en brainstorming, pendiente de revisión final del usuario
**Goal:** Entrenar un modelo de ajedrez propio que juegue al menos 2000 ELO, usando la GPU AMD del usuario, en Python.

## Contexto y alcance

La aplicación completa son tres sub-proyectos independientes:

1. **Modelo de ajedrez** (Python, entrenamiento en GPU) — *este documento*.
2. **Backend en Go** — API, gestión de partidas, consume el modelo como motor.
3. **Frontend React + Vite** — UI minimalista, bordes redondeados, animation-first.

Cada uno tendrá su propio ciclo spec → plan → implementación. Este documento cubre **solo el modelo**.

## Restricciones de hardware

- GPU: **AMD Radeon RX 6700 XT** (RDNA2, gfx1031, 12 GB), Windows 11.
- Sin CUDA. **Decisión: usar el entorno existente `torch-directml`** en `C:\Users\nicop\Downloads\amd_gpu_training\` (PyTorch 2.4.1 + torch-directml 0.2.5). Estable y sin setup, aunque más lento que ROCm. ROCm/WSL2 descartado por riesgo en gfx1031.
- Patrón obligatorio (ver skill `training-with-amd-gpu`): `import torch_directml; device = torch_directml.device()`; mover modelo y cada batch al device; no usar APIs `torch.cuda.*`.

## Enfoque

**Aprendizaje supervisado + búsqueda** (estilo AlphaZero ligero). Se descarta self-play desde cero (demasiado cómputo para una sola GPU AMD) y NNUE puro (el "modelo" sería solo evaluación). Esta ruta es la más rápida y fiable a 2000 en este hardware, y sigue siendo un modelo entrenado por el usuario.

## Arquitectura del modelo

- **Codificación de posición:** tensor de planos `8×8×N`: 12 planos de piezas (tipo × color) + planos de enroque, turno, en-passant y repeticiones. Calculado con `python-chess`.
- **Troncal:** ResNet pequeña, 6–10 bloques residuales, 64–128 canales. Cabe en 12 GB con DirectML.
- **Cabeza de política:** distribución sobre ~4672 jugadas (codificación de movimientos AlphaZero). Predice la jugada del jugador fuerte.
- **Cabeza de valor:** escalar en `[-1, 1]`. Predice el resultado desde el lado a mover. Es la que potencia la búsqueda.

## Pipeline de datos

1. **Descarga:** base mensual de Lichess (`.pgn.zst`) desde database.lichess.org.
2. **Filtrado en streaming:** ambos jugadores en **2000–2400 ELO**, control de tiempo razonable (sin bullet/ultra-rápidas), descartar abandonos tempranos. No descomprimir todo a disco.
3. **Extracción:** por posición jugada → `(tensor_posición, jugada_jugada, resultado_partida)`. Resultado = etiqueta de valor (+1/0/−1 desde el lado a mover).
4. **Almacenamiento:** shards binarios (`.npy`/`.npz` o formato propio) para lectura rápida sin reparsear PGN (evita cuello de botella en CPU bajo DirectML).

## Entrenamiento

- `torch_directml` device; modelo y batches movidos al device cada iteración.
- **Pérdida combinada:** cross-entropy (política vs jugada humana) + MSE (valor vs resultado), con pesos ajustables.
- Optimizador Adam/AdamW; `batch_size` ajustado a 12 GB (≈256–1024 según red); checkpoints periódicos.
- **Iteración:** más datos / más épocas / red mayor / mejor búsqueda hasta superar el listón de ELO.
- **Expectativa de tiempo:** tandas de horas durante varias noches. No es de una sola tarde.

## Búsqueda en inferencia

- **MCTS guiado por la red (PUCT)**, estilo AlphaZero: la política prioriza exploración, el valor evalúa hojas.
- Palanca de fuerza = **nº de simulaciones por jugada** (100–800). Calibra fuerza vs tiempo de respuesta.
- Alternativa si MCTS es lento en DirectML: alfa-beta poco profunda con la cabeza de valor como evaluación. Empezar con MCTS/PUCT.

## Evaluación de ELO (criterio del goal)

- Gauntlet local: enfrentar el motor contra **Stockfish limitado** (`Skill Level` o nodos) a fuerzas conocidas, cientos de partidas vía UCI con `python-chess`.
- Calcular ELO con **ordo** o **bayeselo** desde el PGN de resultados.
- **Criterio de parada:** superar de forma estable los **2000 ELO** en el gauntlet.

## Servicio del motor (interfaz para Go)

- Servicio **Python (FastAPI o gRPC)** que carga el modelo y expone `POST /bestmove {fen, sims}` → `{move, eval, pv}`.
- El backend Go consumirá este endpoint. La validación de legalidad puede vivir aquí con `python-chess`.

## Estructura de proyecto

```
chess-model/
  data/            # PGN crudos + shards procesados
  src/
    encoding.py    # tablero <-> tensores, jugada <-> índice
    dataset.py     # streaming PGN -> muestras -> shards
    model.py       # ResNet política+valor
    train.py       # bucle de entrenamiento DirectML
    mcts.py        # búsqueda PUCT
    engine.py      # API jugar: fen -> bestmove
    serve.py       # servicio FastAPI/gRPC
    evaluate.py    # gauntlet vs Stockfish + cálculo ELO
  checkpoints/
  configs/
```

## Componentes (unidades aisladas)

| Unidad | Qué hace | Depende de |
|--------|----------|------------|
| `encoding` | Convierte FEN↔tensor y jugada↔índice | python-chess |
| `dataset` | PGN en streaming → muestras → shards | encoding |
| `model` | Define ResNet política+valor | torch, torch-directml |
| `train` | Entrena y guarda checkpoints | model, dataset |
| `mcts` | Búsqueda PUCT sobre la red | model, encoding |
| `engine` | fen → bestmove (red + búsqueda) | mcts, model, encoding |
| `serve` | Expone engine vía API | engine |
| `evaluate` | Gauntlet vs Stockfish y ELO | engine, stockfish, ordo |

## Riesgos

- **DirectML lento:** mitigación con shards pre-procesados y tandas largas.
- **MCTS lento en inferencia:** mitigación con menos simulaciones o fallback alfa-beta.
- **No alcanzar 2000:** mitigación iterando (red mayor, más datos, más simulaciones).

## Fuera de alcance

Backend Go y frontend React (sub-proyectos 2 y 3 propios).
