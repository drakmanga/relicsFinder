import { Toast } from "relic-finder-ui";

const stack: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  width: 360,
  maxWidth: "100%",
};

export const Tones = () => (
  <div style={stack}>
    <Toast tone="success" title="Aggiunta alla wishlist" description="Volt Prime Neuroptics" onDismiss={() => {}} />
    <Toast
      tone="warning"
      title="Dati non aggiornati"
      description="Ultimo aggiornamento 47 minuti fa"
      onDismiss={() => {}}
    />
    <Toast
      tone="danger"
      title="Warframe Market non raggiungibile"
      description="HTTP 503 — riprovo tra 30s"
      onDismiss={() => {}}
    />
    <Toast tone="info" title="23 reliquie trovate" description="Filtro: solo Axi" onDismiss={() => {}} />
  </div>
);

export const TitleOnly = () => (
  <div style={stack}>
    <Toast tone="success" title="Prezzo aggiornato" />
    <Toast tone="info" title="Inventario sincronizzato" />
  </div>
);
