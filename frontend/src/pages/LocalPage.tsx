// frontend/src/pages/LocalPage.tsx
import { PageShell } from '../components/PageShell'
import { GameView } from '../components/GameView'

export function LocalPage() {
  return <PageShell><GameView opts={{ mode: 'local', color: 'white' }} /></PageShell>
}
