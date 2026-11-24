import { Button, CheckIcon } from "relic-finder-ui";

interface Props {
  /** What is being ticked, for the controls' names: "Teshin's 10,000 Kuva". */
  name: string;
  /** Most claims in a week, or null when there is no point at which it is done. */
  limit: number | null;
  count: number;
  /** False for the rotating offer in the weeks it is not in the shop. */
  available: boolean;
  onSet: (count: number) => void;
}

/**
 * This week's claims of one vendor offer or one fixed weekly reward.
 *
 * Every capped line gets the same Done toggle, so the column reads as one
 * control down its whole length: pressed, it marks the line finished; pressed
 * again, it clears it. Lines with more than one claim also get a `− 2/3 +`
 * stepper above it, for the weeks only some are taken. Nothing for an uncapped
 * vendor: there is no point at which it is done.
 */
export function KuvaDone({ name: offer, limit, count, available, onSet }: Props) {
  if (limit === null || !available) return <span className="rf-fg-muted">—</span>;

  const done = count >= limit;

  return (
    <div className="rf-kuva-done">
      {limit > 1 && (
        <div className="rf-kuva-stepper">
          <Button
            variant="outline"
            size="xs"
            aria-label={`One fewer of ${offer}`}
            disabled={count === 0}
            onClick={() => onSet(count - 1)}
          >
            −
          </Button>
          <span
            className={`rf-tabular rf-kuva-done-count${done ? " rf-gold" : ""}`}
            aria-live="polite"
          >
            {count}/{limit}
          </span>
          <Button
            variant="outline"
            size="xs"
            aria-label={`One more of ${offer}`}
            disabled={done}
            onClick={() => onSet(count + 1)}
          >
            +
          </Button>
        </div>
      )}
      <Button
        // Gold once pressed, the same fill as every primary action in the
        // app, so a finished offer is found by scanning the column for it.
        variant={done ? "primary" : "outline"}
        size="sm"
        icon={done ? <CheckIcon /> : undefined}
        aria-pressed={done}
        aria-label={`Done: ${offer} this week`}
        className="rf-kuva-done-toggle"
        onClick={() => onSet(done ? 0 : limit)}
      >
        Done
      </Button>
    </div>
  );
}
