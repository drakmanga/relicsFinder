import { Dialog, Button, Input, TierChip } from "relic-finder-ui";

export const AddToInventory = () => (
  <Dialog
    open
    onClose={() => {}}
    title="Aggiungi all'inventario"
    description="Quante copie di Lith V9 vuoi registrare? Il conteggio verrà usato per stimare il valore totale."
    footer={
      <>
        <Button variant="ghost">Annulla</Button>
        <Button variant="primary">Aggiungi</Button>
      </>
    }
  >
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <TierChip tier="lith" refinement="radiant" />
      <Input defaultValue="3" wrapperClassName="rf-tabular" aria-label="Quantità" />
    </div>
  </Dialog>
);

export const Destructive = () => (
  <Dialog
    open
    onClose={() => {}}
    dismissible={false}
    title="Rimuovere dalla wishlist?"
    description="Volt Prime Neuroptics verrà rimosso. Le notifiche di prezzo per questo item si fermeranno."
    footer={
      <>
        <Button variant="ghost">Annulla</Button>
        <Button variant="danger">Rimuovi</Button>
      </>
    }
  />
);
