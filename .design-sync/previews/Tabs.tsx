import { Tabs, TabPanel } from "relic-finder-ui";

const items = [
  { id: "drops", label: "Contenuto" },
  { id: "prices", label: "Prezzi" },
  { id: "farm", label: "Farm" },
  { id: "history", label: "Storico", disabled: true },
];

export const Default = () => (
  <div>
    <Tabs label="Sezioni reliquia" items={items} value="drops" onChange={() => {}} />
    <TabPanel id="drops" value="drops">
      <p style={{ fontSize: 13, color: "var(--rf-fg-muted)", marginTop: 16 }}>
        I sei drop della reliquia, con rarità e prezzo.
      </p>
    </TabPanel>
  </div>
);

export const SecondSelected = () => (
  <div>
    <Tabs label="Sezioni reliquia" items={items} value="prices" onChange={() => {}} />
    <TabPanel id="prices" value="prices">
      <p style={{ fontSize: 13, color: "var(--rf-fg-muted)", marginTop: 16 }}>
        Prezzo medio, range e ducati.
      </p>
    </TabPanel>
  </div>
);
