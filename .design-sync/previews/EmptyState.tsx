import { EmptyState, Chip, Button } from "relic-finder-ui";

export const Initial = () => (
  <EmptyState
    tone="initial"
    title="Cerca una reliquia"
    description="Nome della reliquia o dell'item Prime."
    actions={
      <>
        <Chip>Lith V9</Chip>
        <Chip>Volt Prime</Chip>
        <Chip>Meso B4</Chip>
      </>
    }
  />
);

export const NoResults = () => (
  <EmptyState
    title="Nessun risultato"
    description={'Nessuna reliquia contiene "Xyz Prime".'}
    actions={
      <Button variant="outline" size="sm">
        Prova "Volt Prime"
      </Button>
    }
  />
);

export const Error = () => (
  <EmptyState
    tone="error"
    title="Impossibile caricare i prezzi"
    description="warframe.market — HTTP 503 Service Unavailable"
    actions={
      <Button variant="outline" size="sm">
        Riprova
      </Button>
    }
  />
);
