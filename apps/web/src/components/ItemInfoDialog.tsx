import { Button, Dialog, ExternalLinkIcon, PriceDelta, Skeleton } from "relic-finder-ui";

import { Unlisted } from "./Unlisted";

import { PlatPrice } from "./Plat";
import { PriceChart } from "./PriceChart";
import { useItemHistory } from "../api/queries";
import { marketUrl } from "../lib/format";
import type { PriceMap } from "../api/types";

interface Props {
  itemName: string | null;
  prices: PriceMap | undefined;
  onClose: () => void;
}

/**
 * Everything known about one part, in a dialog.
 *
 * A dialog rather than a third tab: this is a detour from whatever the user was
 * doing, and it should hand them back to the same scroll position and the same
 * filters when they close it.
 */
export function ItemInfoDialog({ itemName, prices, onClose }: Props) {
  const history = useItemHistory(itemName);
  const meta = itemName ? prices?.get(itemName) : undefined;

  return (
    <Dialog
      open={!!itemName}
      onClose={onClose}
      title={itemName ?? ""}
      description={meta?.setName ?? undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            icon={<ExternalLinkIcon />}
            onClick={() =>
              itemName && window.open(marketUrl(itemName), "_blank", "noopener,noreferrer")
            }
          >
            Open on Warframe Market
          </Button>
        </>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <Stat label="Price">
          <PlatPrice value={meta?.averagePrice ?? null} size="lg" />
        </Stat>

        <Stat label="Median">
          <PlatPrice value={meta?.median ?? null} />
        </Stat>

        <Stat label="Ducats">
          {meta?.ducats == null ? (
            <Unlisted />
          ) : (
            <span className="rf-text-data-md rf-ducat">{meta.ducats}</span>
          )}
        </Stat>

        <Stat label="Trades / 48h">
          <span className="rf-text-data-md rf-fg-secondary">{meta?.volume ?? "—"}</span>
        </Stat>

        <Stat label="vs 90-day avg">
          {meta?.trend == null ? <Unlisted /> : <PriceDelta value={Math.round(meta.trend)} />}
        </Stat>
      </div>

      <p className="rf-text-overline rf-fg-muted rf-stack-sm">Completed trades, 90 days</p>

      {history.isPending ? (
        <Skeleton height={160} />
      ) : history.isError ? (
        <p className="rf-text-body-sm rf-fg-muted">Could not load the price history.</p>
      ) : (
        <PriceChart points={history.data ?? []} />
      )}

      {meta?.volume != null && meta.volume < 10 && (
        <p className="rf-text-caption rf-fg-muted rf-mt-3">
          Only {meta.volume} trades in 48 hours — treat this price as indicative.
        </p>
      )}
    </Dialog>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 4 }}>
        {label}
      </p>
      {children}
    </div>
  );
}
