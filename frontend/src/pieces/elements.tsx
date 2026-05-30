// frontend/src/pieces/elements.tsx
import type { ReactNode } from 'react'

export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p'
export const PIECE_TYPES: PieceType[] = ['k', 'q', 'r', 'b', 'n', 'p']

// All pieces share one geometry on a 0 0 45 45 viewBox.
// Children inherit fill/stroke from the parent <svg>, so a set only sets styles.
export const PIECE_ELEMENTS: Record<PieceType, ReactNode> = {
  k: (
    <>
      <rect x="21" y="5" width="3" height="9" rx="1.2" />
      <rect x="18.4" y="7.6" width="8.2" height="2.8" rx="1.2" />
      <path d="M12 33 C10 20 17 16 22.5 16 C28 16 35 20 33 33 Z" />
      <rect x="10.5" y="32" width="24" height="5" rx="2.5" />
    </>
  ),
  q: (
    <>
      <circle cx="9" cy="13" r="2.1" />
      <circle cx="16" cy="9.6" r="2.1" />
      <circle cx="22.5" cy="8" r="2.3" />
      <circle cx="29" cy="9.6" r="2.1" />
      <circle cx="36" cy="13" r="2.1" />
      <path d="M9 14 L13.5 32 h18 L36 14 L29.5 22 L22.5 13 L15.5 22 Z" />
      <rect x="11" y="31" width="23" height="5" rx="2.5" />
    </>
  ),
  r: (
    <>
      <rect x="13" y="9" width="3.5" height="5" />
      <rect x="18.5" y="9" width="3.5" height="5" />
      <rect x="24" y="9" width="3.5" height="5" />
      <rect x="29.5" y="9" width="3.5" height="5" />
      <rect x="12" y="13" width="21" height="5" rx="1" />
      <path d="M14.5 18 h16 l-1.5 13 h-13 Z" />
      <rect x="11" y="30" width="23" height="6" rx="2" />
    </>
  ),
  b: (
    <>
      <circle cx="22.5" cy="7" r="2.3" />
      <path d="M22.5 9 C16 12 15 22 17.5 30 h10 C30 22 29 12 22.5 9 Z" />
      <rect x="13" y="30" width="19" height="6" rx="2.5" />
    </>
  ),
  n: (
    <>
      <path d="M13 34 L13 33 C13 25 15.5 21 19 18 L16.8 15 C15.7 13 16.6 10.8 19 11 L21 13.2 C23.4 10 27.6 10 30.4 13.2 C33.2 16.4 33 22 32 26 L32 34 Z" />
    </>
  ),
  p: (
    <>
      <circle cx="22.5" cy="14" r="5.3" />
      <path d="M16.5 33 C16.5 24 19 21 22.5 21 C26 21 28.5 24 28.5 33 Z" />
      <rect x="13" y="32" width="19" height="5" rx="2.5" />
    </>
  ),
}
