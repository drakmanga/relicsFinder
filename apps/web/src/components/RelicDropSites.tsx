/**
 * Over 150 lines (rule 4), just: the mission list and the dialog holding the
 * rest of it, which are the same list at two lengths.
 */
import { useState } from "react";
import { Button, Dialog, Divider, ExternalLinkIcon, Skeleton } from "relic-finder-ui";

import { PlatPrice } from "./Plat";
import { relicMarketUrl } from "../lib/format";
import type { DropInfo } from "../api/types";

/** How many missions to list before collapsing into a count. */
const SITES_SHOWN = 4;

interface Props {
  relicFullName: string;
  sites: DropInfo[];
  sitesPending: boolean;
  /** The most valuable single drop, restated under the buy button. */
  best: number | null;
}

/**
 * Where the relic drops, and the alternative to farming it.
 *
 * Its own component because it is the one block in the panel that asks a
 * question of its own — buy or farm — and the only one holding state: whether
 * the full mission list is open. Everything above it is a rendering of the
 * relic; this is a decision about it.
 */
export function RelicDropSites({ relicFullName, sites, sitesPending, best }: Props) {
  const [allSites, setAllSites] = useState(false);

  return (
    <>
      <Divider />
      <p className="rf-text-overline rf-fg-muted rf-stack-sm">Where it drops</p>
      {sitesPending ? (
        <Skeleton height={40} />
      ) : sites.length === 0 ? (
        <p className="rf-text-body-sm rf-fg-muted">No mission drops it — the relic is vaulted.</p>
      ) : (
        <>
          <div className="rf-stack-6">
            {sites.slice(0, SITES_SHOWN).map((site, index) => (
              <div key={`${site.location}-${site.rotation}-${index}`} className="rf-stat-row">
                <span className="rf-fill">{site.location}</span>
                <span className="rf-text-caption rf-fg-muted">{site.mission}</span>
                {site.rotation && (
                  <span className="rf-text-caption rf-fg-muted">rot {site.rotation}</span>
                )}
                <span
                  className="rf-text-data-sm rf-fg-muted"
                  style={{ width: 48, textAlign: "right" }}
                >
                  {site.chance.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>

          {sites.length > SITES_SHOWN && (
            /*
            The four best are the answer most of the time — a relic worth
            farming has one or two places worth farming it — so the list stays
            short and the rest is a click away rather than a scroll away. The
            ones underneath still matter: a mission four rotations deep can be
            the only one somebody has unlocked.
          */
            <button
              type="button"
              className="rf-focus-ring"
              onClick={() => setAllSites(true)}
              style={{
                marginTop: 8,
                padding: 0,
                background: "none",
                border: 0,
                cursor: "pointer",
                font: "inherit",
                color: "var(--rf-fg-accent, var(--rf-gold-500))",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              and {sites.length - SITES_SHOWN} more missions
            </button>
          )}
        </>
      )}
      <div className="rf-mt-5">
        {/*
        The relic, not a part. Relics are traded in their own right, and this
        panel is about the relic — buying one is an alternative to farming it,
        which is exactly the choice the missions above inform.
      */}
        <Button
          variant="primary"
          icon={<ExternalLinkIcon />}
          className="rf-full"
          onClick={() =>
            window.open(relicMarketUrl(relicFullName), "_blank", "noopener,noreferrer")
          }
        >
          Buy this relic on Warframe Market
        </Button>
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="rf-text-caption rf-fg-muted">Best drop</span>
        <span className="rf-push">
          <PlatPrice value={best} />
        </span>
      </div>
      {/*
      A dialog rather than an expanding section: the panel is a column of
      short blocks read top to bottom, and dropping forty rows into the middle
      of it pushes everything below out of reach. This is a detour, and it
      hands the panel back exactly as it was.
    */}
      <Dialog
        open={allSites}
        onClose={() => setAllSites(false)}
        title={`Where ${relicFullName} drops`}
        description={`${sites.length} missions, best chance first`}
        footer={
          <Button variant="ghost" onClick={() => setAllSites(false)}>
            Close
          </Button>
        }
      >
        <div style={{ maxHeight: "60vh", overflowY: "auto", display: "grid", gap: 6 }}>
          {sites.map((site, index) => (
            <div
              key={`${site.location}-${site.rotation}-${index}`}
              style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 13 }}
            >
              <span className="rf-fill">{site.location}</span>
              <span className="rf-text-caption rf-fg-muted">{site.mission}</span>
              {site.rotation && (
                <span className="rf-text-caption rf-fg-muted">rot {site.rotation}</span>
              )}
              <span
                className="rf-text-data-sm rf-tabular rf-fg-muted"
                style={{ width: 56, textAlign: "right" }}
              >
                {site.chance.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </Dialog>{" "}
    </>
  );
}
