/**
 * Render check.
 *
 * Compiling proves the types line up; it proves nothing about whether a
 * component actually produces markup. This renders every exported component to
 * static HTML and asserts the classes the stylesheet keys off are present — so
 * a component that silently returns nothing, or loses its Orokin clip, fails
 * here rather than in a design six months from now.
 */
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";

import {
  Button,
  Card,
  Chip,
  DetailPanel,
  Dialog,
  Divider,
  DropList,
  DropRow,
  DropRate,
  EmptyState,
  Frame,
  Input,
  Modal,
  OrokinProvider,
  Price,
  PriceDelta,
  RarityTag,
  Skeleton,
  SkeletonStack,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  TabPanel,
  Tabs,
  TierChip,
  Toast,
  ToastRegion,
  Tooltip,
} from "../src/index";

interface Check {
  name: string;
  element: ReactElement;
  /** Substrings that must appear in the rendered markup. */
  expect: string[];
}

const checks: Check[] = [
  {
    name: "OrokinProvider",
    element: <OrokinProvider>content</OrokinProvider>,
    expect: ["rf-root", "content"],
  },
  {
    name: "Frame",
    element: (
      <Frame notch="lg" variant="gilded">
        framed
      </Frame>
    ),
    expect: ["rf-frame", "rf-frame-gilded", "rf-notch-lg", "rf-frame-inner", "framed"],
  },
  {
    name: "Button/primary",
    element: <Button variant="primary">Search</Button>,
    expect: ["rf-btn", "rf-btn-primary", "rf-btn-md", "rf-clip", "Search"],
  },
  {
    name: "Button/accent",
    element: <Button variant="accent">Wishlist</Button>,
    expect: ["rf-btn-accent", "Wishlist"],
  },
  {
    name: "Button/outline",
    element: <Button variant="outline">Outline</Button>,
    expect: ["rf-btn-outline-wrap", "rf-frame-interactive", "rf-btn-outline", "Outline"],
  },
  {
    name: "Button/ghost",
    element: <Button variant="ghost">Ghost</Button>,
    expect: ["rf-btn-ghost", "Ghost"],
  },
  {
    name: "Button/danger",
    element: <Button variant="danger">Remove</Button>,
    expect: ["rf-btn-danger", "Remove"],
  },
  {
    name: "Button/loading",
    element: <Button loading>Caricamento</Button>,
    expect: ["rf-spinner", 'aria-busy="true"', "disabled"],
  },
  {
    name: "Button/disabled",
    element: <Button disabled>Disabled</Button>,
    expect: ["disabled"],
  },
  {
    name: "Button/iconOnly",
    element: <Button iconOnly aria-label="Copia" size="sm" />,
    expect: ["rf-btn-icon-sm", 'aria-label="Copia"'],
  },
  {
    name: "Input",
    element: <Input label="Search" placeholder="Lith V9" shortcut="⌘K" />,
    expect: ["rf-field", "rf-frame-interactive", "rf-field-input", "rf-kbd", "Lith V9", "Search"],
  },
  {
    name: "Input/error",
    element: <Input error="No such relic" defaultValue="Xyz" />,
    expect: ["rf-frame-danger", 'aria-invalid="true"', "aria-describedby", "rf-field-helper-error"],
  },
  {
    name: "TierChip/lith",
    element: <TierChip tier="lith" refinement="radiant" />,
    expect: ["rf-chip-tier", "rf-tier-lith", "rf-ref-radiant", "rf-clip-octagon", "Lith"],
  },
  {
    name: "TierChip/axi-pulse",
    element: <TierChip tier="axi" refinement="radiant" pulse showRefinement />,
    expect: ["rf-tier-axi", "rf-anim-radiant", "Radiant"],
  },
  {
    name: "TierChip/all-tiers",
    element: (
      <>
        <TierChip tier="lith" />
        <TierChip tier="meso" />
        <TierChip tier="neo" />
        <TierChip tier="axi" />
        <TierChip tier="requiem" />
      </>
    ),
    expect: ["rf-tier-lith", "rf-tier-meso", "rf-tier-neo", "rf-tier-axi", "rf-tier-requiem"],
  },
  {
    name: "Chip/filter",
    element: (
      <Chip variant="filter" onDismiss={() => {}}>
        Axi only
      </Chip>
    ),
    expect: ["rf-chip-filter", "rf-chip-dismiss", "Axi only"],
  },
  {
    name: "RarityTag",
    element: (
      <>
        <RarityTag rarity="common" />
        <RarityTag rarity="uncommon" />
        <RarityTag rarity="rare" />
      </>
    ),
    expect: [
      "rf-rarity-common",
      "rf-rarity-uncommon",
      "rf-rarity-rare",
      "rf-rarity-dot",
      "Common",
      "Rare",
    ],
  },
  {
    name: "Price",
    element: <Price value={45} />,
    expect: ["rf-price-platinum", "45", "rf-price-suffix"],
  },
  {
    name: "Price/missing",
    element: <Price value={null} />,
    expect: ["rf-price-empty", "—"],
  },
  {
    name: "Price/range",
    element: <Price value={45} max={100} currency="ducat" />,
    expect: ["rf-price-ducat", "45", "100"],
  },
  {
    name: "PriceDelta",
    element: (
      <>
        <PriceDelta value={12} />
        <PriceDelta value={-8} />
      </>
    ),
    expect: ["rf-delta-up", "rf-delta-down", "▲", "▼"],
  },
  {
    name: "DropRate",
    element: <DropRate value={25.33} />,
    expect: ["25.33%"],
  },
  {
    name: "Table",
    element: (
      <Table interactive>
        <thead>
          <tr>
            <TableHeaderCell>Tier</TableHeaderCell>
            <TableHeaderCell sortable sortDirection="asc" onSort={() => {}}>
              Price
            </TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          <TableRow selected>
            <TableCell>
              <TierChip tier="lith" />
            </TableCell>
            <TableCell align="right" numeric>
              <Price value={45} />
            </TableCell>
          </TableRow>
        </tbody>
      </Table>
    ),
    expect: [
      "rf-table",
      "rf-table-interactive",
      "rf-frame",
      'aria-selected="true"',
      'aria-sort="ascending"',
      "rf-align-right",
      "rf-tabular",
      "Price",
    ],
  },
  {
    name: "DropRow",
    element: (
      <DropRow
        name="Volt Prime Neuroptics"
        rarity="rare"
        chance={2}
        price={45}
        index={0}
        interactive
      />
    ),
    expect: [
      "rf-droprow",
      "rf-droprow-interactive",
      "rf-rarity-rare",
      "Volt Prime Neuroptics",
      "2.00%",
      "--rf-i:0",
    ],
  },
  {
    name: "DropList/stagger",
    element: (
      <DropList>
        <DropRow name="A" rarity="common" index={0} />
        <DropRow name="B" rarity="rare" index={1} />
      </DropList>
    ),
    expect: ["rf-stagger", "--rf-i:1"],
  },
  {
    name: "DetailPanel",
    element: (
      <DetailPanel
        badges={<TierChip tier="lith" refinement="radiant" />}
        title="Lith V9"
        meta="Hepit · Void · Rotation A"
      >
        <Divider />
        <DropRow name="Volt Prime Neuroptics" rarity="rare" chance={2} price={45} />
      </DetailPanel>
    ),
    expect: [
      "rf-detail",
      "rf-frame-gilded",
      "rf-frame-inverse",
      "rf-anim-sweep",
      "rf-text-display-md",
      "Lith V9",
      "rf-divider",
    ],
  },
  {
    name: "DetailPanel/empty",
    element: <DetailPanel empty />,
    expect: ["rf-detail-empty", "No relic selected"],
  },
  {
    name: "Card",
    element: (
      <Card variant="gilded" header={<span>Axi A2</span>} footer={<span>Market</span>}>
        body
      </Card>
    ),
    expect: ["rf-frame-gilded", "rf-card-body", "rf-card-header", "rf-card-footer", "Axi A2"],
  },
  {
    name: "Tabs",
    element: (
      <>
        <Tabs
          label="Sections"
          value="drops"
          onChange={() => {}}
          items={[
            { id: "drops", label: "Contents" },
            { id: "prices", label: "Prices" },
          ]}
        />
        <TabPanel id="drops" value="drops">
          panel
        </TabPanel>
      </>
    ),
    expect: ['role="tablist"', "rf-tab", 'aria-selected="true"', 'role="tabpanel"', "panel"],
  },
  {
    name: "Tooltip",
    element: (
      <Tooltip content="24h average price">
        <span>hover</span>
      </Tooltip>
    ),
    expect: ["rf-tooltip-wrap", "hover"],
  },
  {
    name: "Dialog",
    element: (
      <Dialog
        open
        onClose={() => {}}
        title="Add"
        description="How many copies?"
        footer={<Button>Ok</Button>}
      >
        content
      </Dialog>
    ),
    expect: [
      "rf-dialog-scrim",
      'role="dialog"',
      'aria-modal="true"',
      "rf-frame-gilded",
      "Add",
      "rf-dialog-footer",
    ],
  },
  {
    name: "Dialog/closed",
    element: (
      <Dialog open={false} onClose={() => {}} title="Nascosto">
        content
      </Dialog>
    ),
    expect: [],
  },
  {
    name: "Modal",
    element: (
      <Modal open onClose={() => {}} label="Details">
        <DetailPanel title="Axi A1">contents</DetailPanel>
      </Modal>
    ),
    expect: [
      "rf-modal-scrim",
      'role="dialog"',
      'aria-modal="true"',
      'aria-label="Details"',
      "rf-detail",
      "Axi A1",
    ],
  },
  {
    name: "Modal/closed",
    element: (
      <Modal open={false} onClose={() => {}} label="Details">
        contents
      </Modal>
    ),
    expect: [],
  },
  {
    name: "Toast",
    element: (
      <ToastRegion>
        <Toast tone="success" title="Aggiunta" description="Volt Prime" onDismiss={() => {}} />
        <Toast tone="danger" title="Error" />
      </ToastRegion>
    ),
    expect: [
      "rf-toast-region",
      "rf-toast-success",
      "rf-toast-danger",
      'role="alert"',
      'role="status"',
    ],
  },
  {
    name: "Skeleton",
    element: <SkeletonStack lines={3} />,
    expect: ["rf-skeleton-stack", "rf-skeleton", 'aria-busy="true"'],
  },
  {
    name: "Skeleton/single",
    element: <Skeleton width={120} height={20} />,
    expect: ["rf-skeleton", "width:120px"],
  },
  {
    name: "EmptyState/initial",
    element: (
      <EmptyState tone="initial" title="Search for a relic" description="By name or by part" />
    ),
    expect: ["rf-empty", "rf-empty-icon-initial", "rf-text-display-sm", "Search for a relic"],
  },
  {
    name: "EmptyState/error",
    element: <EmptyState tone="error" title="Error" description="HTTP 503" />,
    expect: ["rf-empty-icon-error", 'role="alert"', "HTTP 503"],
  },
  {
    name: "EmptyState/empty",
    element: <EmptyState title="No results" />,
    expect: ["rf-empty-icon", "No results"],
  },
];

let failures = 0;

for (const check of checks) {
  let html = "";
  try {
    html = renderToStaticMarkup(<OrokinProvider>{check.element}</OrokinProvider>);
  } catch (error) {
    console.error(`FAIL  ${check.name} — threw: ${(error as Error).message}`);
    failures++;
    continue;
  }

  const missing = check.expect.filter((needle) => !html.includes(needle));

  if (missing.length > 0) {
    console.error(`FAIL  ${check.name} — missing: ${missing.join(", ")}`);
    failures++;
    continue;
  }

  // A component that renders nothing but its wrapper is a silent failure.
  const inner = html.replace(/^<div class="rf-root">/, "").replace(/<\/div>$/, "");
  if (check.expect.length > 0 && inner.trim().length === 0) {
    console.error(`FAIL  ${check.name} — rendered empty`);
    failures++;
    continue;
  }

  console.log(`ok    ${check.name}`);
}

console.log(`\n${checks.length - failures}/${checks.length} render checks passed`);

if (failures > 0) process.exit(1);
