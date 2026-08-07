import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  DetailPanel,
  Divider,
  DropList,
  DropRow,
  EmptyState,
  ExternalLinkIcon,
  Input,
  Price,
  SearchIcon,
  Skeleton,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  Tabs,
  TierChip,
} from "relic-finder-ui";

import { REFINEMENT_ORDER, firstState, groupRelics } from "./api/normalize";
import { useDropInfo, useRelicPrice, useRelics } from "./api/queries";
import type { Refinement, RelicGroup } from "./api/types";
import { relativeTime } from "./lib/format";

/** How many rows to render before the list is cut. 689 relics is a lot of DOM. */
const PAGE = 80;

/**
 * Scaffold screen.
 *
 * A fraction of the Claude Design mock on purpose: it exists to prove the chain
 * end to end — workspace dependency, stylesheet, provider, query layer, dev
 * proxy — against the real backend. Filters, the Prime Items view and the
 * wishlist come next.
 */
export function App() {
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const relics = useRelics();

  const groups = useMemo(() => groupRelics(relics.data ?? []), [relics.data]);

  const matches = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return groups;

    return groups.filter((group) => {
      if (group.fullName.toLowerCase().includes(query)) return true;
      return Object.values(group.states).some((rewards) =>
        rewards?.some((reward) => reward.itemName.toLowerCase().includes(query)),
      );
    });
  }, [groups, term]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.fullName === selected) ?? null,
    [groups, selected],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <Topbar />

      <div
        style={{
          flex: "none",
          padding: "14px 18px",
          background: "var(--rf-surface-1)",
          borderBottom: "1px solid var(--rf-border-default)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0, maxWidth: 720 }}>
          <Input
            icon={<SearchIcon />}
            placeholder="Lith V9, Volt Prime Neuroptics…"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            aria-label="Cerca reliquia o item"
          />
        </div>
        {relics.data && (
          <Chip>
            {matches.length} reliquie
            {matches.length > PAGE ? ` · ne mostro ${PAGE}` : ""}
          </Chip>
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: 1,
          background: "var(--rf-border-default)",
        }}
      >
        <main
          style={{ flex: 1, minWidth: 0, background: "var(--rf-surface-0)", overflow: "auto" }}
        >
          <Results
            groups={matches}
            state={relics}
            selected={selected}
            onSelect={setSelected}
            term={term}
          />
        </main>

        <RelicDetail group={selectedGroup} />
      </div>
    </div>
  );
}

function Topbar() {
  return (
    <header
      style={{
        height: 56,
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "0 18px",
        background: "var(--rf-surface-2)",
        borderBottom: "1px solid var(--rf-border-default)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--rf-font-display)",
          fontSize: 17,
          letterSpacing: "0.14em",
          color: "var(--rf-gold-300)",
        }}
      >
        RELIC FINDER
      </span>
    </header>
  );
}

interface ResultsProps {
  groups: RelicGroup[];
  state: ReturnType<typeof useRelics>;
  selected: string | null;
  onSelect: (fullName: string) => void;
  term: string;
}

function Results({ groups, state, selected, onSelect, term }: ResultsProps) {
  if (state.isPending) {
    return (
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} height={40} />
        ))}
      </div>
    );
  }

  if (state.isError) {
    return (
      <EmptyState
        tone="error"
        title="Impossibile caricare le reliquie"
        description={String(state.error)}
        actions={
          <Button variant="outline" size="sm" onClick={() => state.refetch()}>
            Riprova
          </Button>
        }
      />
    );
  }

  if (groups.length === 0) {
    return term ? (
      <EmptyState
        title="Nessun risultato"
        description={`Nessuna reliquia corrisponde a «${term}».`}
      />
    ) : (
      <EmptyState
        tone="initial"
        title="Cerca una reliquia"
        description="Nome della reliquia o dell'item Prime."
      />
    );
  }

  return (
    <Table interactive framed={false}>
      <thead>
        <tr>
          <TableHeaderCell>Tier</TableHeaderCell>
          <TableHeaderCell>Reliquia</TableHeaderCell>
          <TableHeaderCell>Contenuto</TableHeaderCell>
          <TableHeaderCell align="right">Drop</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {groups.slice(0, PAGE).map((group) => {
          const rewards = group.states[firstState(group)] ?? [];
          const rare = rewards.find((reward) => reward.rarity === "rare");

          return (
            <TableRow
              key={group.fullName}
              selected={group.fullName === selected}
              onClick={() => onSelect(group.fullName)}
            >
              <TableCell>
                <TierChip tier={group.tier} />
              </TableCell>
              <TableCell>{group.fullName}</TableCell>
              <TableCell>{rare ? rare.itemName : `${rewards.length} item`}</TableCell>
              <TableCell align="right" numeric>
                {rewards.length}
              </TableCell>
            </TableRow>
          );
        })}
      </tbody>
    </Table>
  );
}

function RelicDetail({ group }: { group: RelicGroup | null }) {
  const [refinement, setRefinement] = useState<Refinement>("intact");

  const price = useRelicPrice(group?.fullName ?? null);
  const drops = useDropInfo(group?.fullName ?? null);

  if (!group) return <DetailPanel empty />;

  const available = REFINEMENT_ORDER.filter((r) => group.states[r]?.length);
  const active = group.states[refinement]?.length ? refinement : firstState(group);
  const rewards = group.states[active] ?? [];
  const location = drops.data?.[0];

  return (
    <DetailPanel
      key={group.fullName}
      badges={<TierChip tier={group.tier} refinement={active} />}
      title={group.fullName}
      meta={
        location
          ? `${location.mission} · ${location.location} · Rotation ${location.rotation}`
          : "Luogo di drop non esposto dal backend"
      }
    >
      <Divider />

      <Tabs
        label="Raffinazione"
        value={active}
        onChange={(id) => setRefinement(id as Refinement)}
        items={available.map((r) => ({
          id: r,
          label: r === "exceptional" ? "Except." : r[0]!.toUpperCase() + r.slice(1),
        }))}
      />

      <p className="rf-text-overline rf-fg-muted" style={{ margin: "16px 0 8px" }}>
        Contenuto
      </p>

      <DropList key={active}>
        {rewards.map((reward, index) => (
          <DropRow
            key={reward.id || reward.itemName}
            name={reward.itemName}
            rarity={reward.rarity}
            chance={reward.chance}
            index={index}
          />
        ))}
      </DropList>

      <Divider />

      <div>
        <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 4 }}>
          Prezzo medio della reliquia
        </p>

        {price.isPending ? (
          <Skeleton width={80} height={20} />
        ) : (
          <Price value={price.data ? Math.round(price.data.averagePrice) : null} size="lg" />
        )}

        {price.data && (
          <p className="rf-text-caption rf-fg-muted" style={{ marginTop: 2 }}>
            aggiornato {relativeTime(price.dataUpdatedAt)}
          </p>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <Button
          variant="primary"
          icon={<ExternalLinkIcon />}
          style={{ width: "100%" }}
          onClick={() =>
            window.open(
              `https://warframe.market/items/${group.fullName.toLowerCase().replace(/\s+/g, "_")}_relic`,
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          Apri su Warframe Market
        </Button>
      </div>

      <p className="rf-text-caption rf-fg-muted" style={{ marginTop: 12 }}>
        I prezzi per singolo item non sono ancora esposti dal backend.
      </p>
    </DetailPanel>
  );
}
