import { Card } from './Card';

/** Marca o que ainda falta construir. Remova quando a tela estiver pronta. */
export function Placeholder({ requirements }: { requirements: string }) {
  return (
    <Card className="p-5 text-sm text-muted">
      Em construção — requisitos: {requirements}
    </Card>
  );
}
