/**
 * The placeholder for a number nobody has.
 *
 * It was a bare em-dash in `fg-disabled`, which is two failures at once. The
 * colour scores 2.4:1 on these surfaces — WCAG exempts disabled controls, but
 * this is not a disabled control, it is a fact about the market, so the
 * exemption does not apply and `fg-muted` at 5.7:1 does the job. And an em-dash
 * on its own is announced as "dash" or as nothing at all, so the meaning is
 * spelled out for anyone not reading the glyph.
 */
export function Unlisted({ what = "Not listed" }: { what?: string }) {
  return (
    <span className="rf-unlisted" title={what}>
      <span aria-hidden="true">—</span>
      <span className="rf-sr-only">{what}</span>
    </span>
  );
}
