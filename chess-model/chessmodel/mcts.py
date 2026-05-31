import math


class _Node:
    def __init__(self, prior=0.0):
        self.P = prior
        self.N = 0
        self.W = 0.0
        self.children = {}

    @property
    def Q(self):
        return self.W / self.N if self.N > 0 else 0.0

    def expand(self, priors):
        for move, p in priors.items():
            if move not in self.children:
                self.children[move] = _Node(p)

    def select(self, c_puct):
        best_score, best_move, best_child = -1e18, None, None
        for move, child in self.children.items():
            u = child.Q + c_puct * child.P * math.sqrt(self.N) / (1 + child.N)
            if u > best_score:
                best_score, best_move, best_child = u, move, child
        return best_move, best_child


def _terminal_value(board):
    # value from the perspective of the side to move at this board
    if board.is_checkmate():
        return -1.0
    return 0.0


class MCTS:
    def __init__(self, evaluator, c_puct=1.5):
        self.evaluator = evaluator
        self.c_puct = c_puct

    def search(self, board, sims):
        root = _Node()
        priors, _ = self.evaluator(board)
        root.expand(priors)
        for _ in range(sims):
            self._simulate(board.copy(), root)
        return {move: child.N for move, child in root.children.items()}

    def best_move(self, board, sims):
        visits = self.search(board, sims)
        return max(visits, key=visits.get)

    def _simulate(self, board, node):
        path = [node]
        while node.children and not board.is_game_over():
            move, node = node.select(self.c_puct)
            board.push(move)
            path.append(node)
        if board.is_game_over():
            value = _terminal_value(board)
        else:
            priors, value = self.evaluator(board)
            node.expand(priors)
        for n in reversed(path):
            value = -value
            n.N += 1
            n.W += value
