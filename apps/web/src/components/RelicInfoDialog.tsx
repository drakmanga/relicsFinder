import { Button, Dialog, ExternalLinkIcon, PriceDelta, Skeleton } from "relic-finder-ui";

import { Unlisted } from "./Unlisted";

import { PlatPrice } from "./Plat";
import { PriceChart } from "./PriceChart";
import { useRelicDetail, useRelicHistory } from "../api/queries";
import { relicMarketUrl } from "../lib/format";

interface Props {
  relicFullName: string | null;
  onClose: () => void;
}

/**
 * What the market has done to one relic over ninety days.
 *
 * The mirror of the part dialog, and separate from it because a relic is a
 * different listing: its slug ends in `_relic`, it has no ducat value and it
 * belongs to no set, so three of the five figures there would be blank here.
 */
export function RelicInfoDialog({ relicFullName, onClose }: Props) {
  const detail = useRelicDetail(relicFullName);
  const history = useRelicHistory(relicFullName);

  return (
    <Dialog
      open={!!relicFullName}
      onClose={onClose}
      title={relicFullName ?? ""}
      description="Sealed relic, as sold on the market"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            icon={<ExternalLinkIcon />}
            onClick={() =>
              relicFullName &&
              window.open(relicMarketUrl(relicFullName), "_blank", "noopener,noreferrer")
            }
          >
            Open on Warframe Market
          </Button>
        </>
      }
    >
      <div className="rf-stat-grid">
        <Stat label="Price">
          {detail.isPending ? (
            <Skeleton width={64} height={20} />
          ) : (
            <PlatPrice value={detail.data?.averagePrice ?? null} size="lg" />
          )}
        </Stat>

        <Stat label="Median">
          <PlatPrice value={detail.data?.median ?? null} />
        </Stat>

        <Stat label="Trades / 48h">
          <span className="rf-text-data-md rf-fg-secondary">{detail.data?.volume ?? "—"}</span>
        </Stat>

        <Stat label="vs 90-day avg">
          {detail.data?.trend == null ? (
            <Unlisted />
          ) : (
            <PriceDelta value={Math.round(detail.data.trend)} />
          )}
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

      {detail.data?.volume != null && detail.data.volume < 10 && (
        <p className="rf-text-caption rf-fg-muted rf-mt-3">
          Only {detail.data.volume} trades in 48 hours — treat this price as indicative.
        </p>
      )}
    </Dialog>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="rf-text-overline rf-fg-muted rf-mb-1">{label}</p>
      {children}
    </div>
  );
}
