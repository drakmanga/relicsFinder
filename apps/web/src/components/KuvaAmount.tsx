import { CURRENCIES, KUVA_ICON, type Cost } from "../lib/kuvaSources";
import { kuvaLabel } from "../lib/kuva";

/**
 * The icons beside a number are decorative: the currency's name is printed
 * next to each one, so `alt=""` keeps a screen reader from saying it twice.
 * Width and height are set as attributes as well as in CSS so the row
 * reserves the box before the image decodes.
 */
const ICON_BOX = 24;

/** "◆ 10,000" with the Kuva icon, or a range. */
export function KuvaAmount({ kuva }: { kuva: number | readonly [number, number] }) {
  return (
    <span className="rf-kuva-amount">
      <img className="rf-kuva-icon" src={KUVA_ICON} alt="" width={ICON_BOX} height={ICON_BOX} />
      <span className="rf-tabular">{kuvaLabel(kuva)}</span>
    </span>
  );
}

/** What an offer costs: one line per currency, each with its icon. */
export function KuvaCost({ cost }: { cost: Cost[] }) {
  return (
    <span className="rf-kuva-cost">
      {cost.map(({ currency, amount }) => {
        const { name, icon } = CURRENCIES[currency];
        return (
          <span key={currency} className="rf-kuva-amount">
            <img className="rf-kuva-icon" src={icon} alt="" width={ICON_BOX} height={ICON_BOX} />
            <span>
              <span className="rf-tabular">{amount}</span> {name}
            </span>
          </span>
        );
      })}
    </span>
  );
}
