// Hardcoded category hierarchy sourced from WooCommerce API (/wc/v3/products/categories)
// 150 categories total — update here if categories change in WooCommerce

export const CATEGORIES = [
  {
    id: 16, name: 'Engine', slug: 'engine',
    children: [
      {
        id: 154, name: 'Engine Internals', slug: 'engine-internals',
        children: [
          { id: 557, name: 'Bearings', slug: 'bearings' },
          { id: 162, name: 'Cam Gears', slug: 'cam-gears' },
          { id: 166, name: 'Camshafts', slug: 'camshafts' },
          { id: 560, name: 'Chain, Belts, Tensioners & Guides', slug: 'chain-belts-tensioners' },
          { id: 160, name: 'Connecting Rods', slug: 'connecting-rods' },
          { id: 159, name: 'Crankshafts', slug: 'crankshafts' },
          { id: 195, name: 'Engine Accessories & Gaskets', slug: 'engine-accessories-gaskets' },
          { id: 559, name: 'Head Gaskets', slug: 'head-gaskets' },
          { id: 558, name: 'Head Studs & Conrod Bolts', slug: 'head-studs-conrod' },
          { id: 188, name: 'Oil Pump & Water Pumps', slug: 'oil-pump-water-pumps' },
          { id: 161, name: 'Pistons', slug: 'pistons' },
          { id: 165, name: 'Rocker Arms', slug: 'rocker-arms' },
          { id: 164, name: 'Springs / Retainers & Bases', slug: 'springs-retainers-bases' },
          { id: 163, name: 'Valves', slug: 'valves' },
        ],
      },
      {
        id: 546, name: 'Engine Parts', slug: 'engine-parts',
        children: [
          { id: 552, name: 'Axles', slug: 'axles' },
          { id: 583, name: 'Catch Can & Tanks', slug: 'catch-can-tanks' },
          { id: 539, name: 'Cosmetic / Dress-up', slug: 'cosmetic-dress-up' },
          { id: 555, name: 'Hinges', slug: 'hinges' },
          { id: 118, name: 'Mounts', slug: 'mounts' },
          { id: 584, name: 'Oil & Filter', slug: 'oil-filter' },
          { id: 553, name: 'Oil Pan & Baffles', slug: 'oil-pan' },
          { id: 25,  name: 'Pulley Kits', slug: 'pulley-kits' },
          { id: 556, name: 'Supporting Parts', slug: 'supporting-parts' },
        ],
      },
      {
        id: 24, name: 'Exhaust', slug: 'exhaust',
        children: [
          { id: 152, name: 'Exhaust System', slug: 'exhaust-system' },
          { id: 151, name: 'Headers / Turbo Manifold / Dump Pipes', slug: 'headers-turbo-manifold-dump-pipes' },
          { id: 153, name: 'Mufflers & Accessories', slug: 'mufflers-and-accessories' },
        ],
      },
      {
        id: 534, name: 'Fuel', slug: 'fuel',
        children: [
          { id: 536, name: 'Fuel Filter', slug: 'fuel-filter' },
          { id: 533, name: 'Fuel Injectors', slug: 'fuel-injectors' },
          { id: 537, name: 'Fuel Pressure Regulator', slug: 'fuel-pressure-regulator' },
          { id: 535, name: 'Fuel Pump', slug: 'fuel-pump' },
          { id: 158, name: 'Fuel Rails', slug: 'fuel-rails' },
          { id: 187, name: 'Fuel System', slug: 'fuel-system' },
          { id: 538, name: 'Fuel System Parts & Accessories', slug: 'fuel-system-parts-accessories' },
        ],
      },
      {
        id: 23, name: 'Induction', slug: 'induction',
        children: [
          { id: 157, name: 'Adapters', slug: 'adapters' },
          { id: 620, name: 'Blow Off Valve / Wastegate & Accessories', slug: 'blow-off-valve-wastegate-accessories' },
          { id: 149, name: 'Intake Gaskets', slug: 'intake-gaskets' },
          { id: 155, name: 'Intake Manifolds', slug: 'intake-manifolds' },
          { id: 150, name: 'Intake Systems & Pod Filters', slug: 'intakes-systems-pod-filter' },
          { id: 561, name: 'Intake Accessories', slug: 'intake-accessories' },
          { id: 156, name: 'Map Sensors', slug: 'map-sensors' },
          { id: 148, name: 'Throttle Bodies', slug: 'throttle-bodies' },
        ],
      },
      {
        id: 887, name: 'Maintenance', slug: 'maintenance',
        children: [
          { id: 888, name: 'Engine Oil', slug: 'engine-oil' },
          { id: 891, name: 'Fluids & Lubricants', slug: 'fluids-lubricants' },
        ],
      },
      {
        id: 554, name: 'Turbo & Supercharger', slug: 'turbo-supercharger',
        children: [
          { id: 880, name: 'Blow Off Valve / Wastegate & Accessories', slug: 'blow-off-valve-wastegate-accessories-turbo-supercharger' },
          { id: 882, name: 'Intercoolers', slug: 'intercoolers' },
          { id: 883, name: 'Map Sensors', slug: 'map-sensors-turbo-supercharger' },
          { id: 884, name: 'Superchargers', slug: 'superchargers' },
          { id: 886, name: 'Turbo Manifold', slug: 'turbo-manifold' },
        ],
      },
    ],
  },
  {
    id: 18, name: 'Suspension', slug: 'suspension',
    children: [
      { id: 545, name: 'Accessories', slug: 'accessories-suspension' },
      { id: 259, name: 'Ball Joints', slug: 'ball-joints' },
      { id: 127, name: 'Bars & Braces', slug: 'bars-braces' },
      { id: 543, name: 'Bushing', slug: 'bushing' },
      { id: 286, name: 'Chassis Braces', slug: 'chassis-braces' },
      { id: 129, name: 'Coilovers', slug: 'coilovers' },
      { id: 544, name: 'Hub', slug: 'hub' },
      { id: 130, name: 'Springs', slug: 'springs' },
      { id: 541, name: 'Stabilizer Link', slug: 'stabilizer-link' },
      { id: 128, name: 'Suspension Arms', slug: 'suspension-arms' },
      { id: 542, name: 'Sway Bar Bushes', slug: 'sway-bar-bushes' },
      { id: 540, name: 'Sway Bars', slug: 'sway-bars' },
      { id: 260, name: 'Tie Rods & Ends', slug: 'tie-rods-ends' },
    ],
  },
  {
    id: 171, name: 'Honda OEM', slug: 'honda-oem',
    children: [
      {
        id: 172, name: 'Engine', slug: 'engine-honda-oem',
        children: [
          { id: 576, name: 'Accessories', slug: 'honda-engine-accessories' },
          { id: 573, name: 'Chain, Belts, Tensioners & Guides', slug: 'honda-engine-chain-belts-tensioners-guides' },
          { id: 575, name: 'Gaskets', slug: 'honda-engine-gaskets' },
          { id: 578, name: 'Mounts', slug: 'honda-engine-mounts' },
          { id: 574, name: 'Oil & Water Pumps', slug: 'honda-engine-oil-water-pumps' },
        ],
      },
      {
        id: 173, name: 'Drivetrain', slug: 'drivetrain-honda-oem',
        children: [
          { id: 572, name: 'Accessories', slug: 'honda-drivetrain-accessories' },
          { id: 571, name: 'Bearing & Seals', slug: 'honda-drivetrain-external' },
          { id: 582, name: 'Cylinders & Slaves', slug: 'honda-cylinders-slaves' },
          { id: 577, name: 'Gears & Final Drive', slug: 'honda-drivetrain-gears-final-drive' },
          { id: 579, name: 'Mounts', slug: 'honda-drivetrain-mounts' },
          { id: 570, name: 'Synchro Hub/Sleeves', slug: 'honda-drivetrain-synchrohub-sleeves' },
        ],
      },
      {
        id: 174, name: 'Body & Accessories', slug: 'body-accessories-honda-oem',
        children: [
          { id: 569, name: 'Accessories', slug: 'honda-bodyaccessries-accessories' },
          { id: 566, name: 'Engine Bay', slug: 'engine-bay' },
          { id: 567, name: 'Exterior', slug: 'exterior-accessories-honda-oem' },
          { id: 568, name: 'Interior', slug: 'interior-accessories-honda-oem' },
        ],
      },
    ],
  },
  {
    id: 20, name: 'Interior', slug: 'interior',
    children: [
      { id: 112, name: 'Accessories', slug: 'accessories' },
      { id: 565, name: 'Cables & Accessories', slug: 'cables-accessories' },
      { id: 551, name: 'Quick Release & Hub/Boss Kits', slug: 'quick-release-hub-boss-kits' },
      { id: 111, name: 'Seat & Rails', slug: 'seat-rails' },
      { id: 109, name: 'Shift Knobs', slug: 'shift-knobs' },
      { id: 110, name: 'Shifters', slug: 'shifters' },
      { id: 113, name: 'Steering Wheels', slug: 'steering-wheels' },
      { id: 587, name: 'X Bar & Braces', slug: 'x-bar-braces' },
    ],
  },
  {
    id: 17, name: 'Drivetrain', slug: 'drivetrain',
    children: [
      { id: 250, name: 'Accessories', slug: 'accessories-drivetrain' },
      { id: 134, name: 'Clutch & Flywheel', slug: 'clutch-flywheel' },
      { id: 528, name: 'Clutch Lines', slug: 'clutch-lines' },
      { id: 131, name: 'Cylinders & Slave', slug: 'cylinders-slave' },
      { id: 132, name: 'Driveshafts', slug: 'driveshafts' },
      { id: 135, name: 'Gearbox Gears & Synchros', slug: 'gearbox-gears-synchros' },
      { id: 136, name: 'Gearbox Seals & Bearings', slug: 'gearbox-seals-bearings' },
      { id: 133, name: 'Gears / Final Drives & LSD', slug: 'lsd-final-drives' },
      { id: 137, name: 'Oil & Lubrication', slug: 'oil-lubrication' },
      { id: 892, name: 'Shifters', slug: 'drivetrain-shifters' },
    ],
  },
  {
    id: 19, name: 'Brakes', slug: 'brakes',
    children: [
      { id: 177, name: 'Accessories', slug: 'accessories-brakes' },
      { id: 893, name: 'Brake Kits', slug: 'brake-kits' },
      { id: 105, name: 'Brake Lines', slug: 'brake-lines' },
      { id: 104, name: 'Brake Pads', slug: 'brake-pads' },
      { id: 176, name: 'Oil & Lubricants', slug: 'oil-lubricants' },
      { id: 103, name: 'Rotors', slug: 'rotors' },
    ],
  },
  {
    id: 106, name: 'Exterior', slug: 'exterior',
    children: [
      { id: 145, name: 'Accessories', slug: 'accessories-exterior' },
      { id: 143, name: 'Aerodynamics', slug: 'aerodynamics' },
      { id: 138, name: 'Body Panels', slug: 'body-panels' },
      { id: 586, name: 'Engine Bay', slug: 'engine-bay-exterior' },
      { id: 580, name: 'Lights & Indicators', slug: 'exterior-lights-indicators' },
      { id: 694, name: 'Mirrors', slug: 'mirrors' },
      { id: 581, name: 'Trims & Seals', slug: 'exterior-trims-seals' },
      { id: 140, name: 'Wheel Nuts', slug: 'wheel-nuts' },
    ],
  },
  {
    id: 21, name: 'Electronics', slug: 'electronics',
    children: [
      { id: 117, name: 'Accessories', slug: 'accessories-electronics' },
      { id: 619, name: 'Boost Controller', slug: 'boost-controller' },
      { id: 114, name: 'ECU & Converters', slug: 'ecu-converters' },
      { id: 116, name: 'Gauges', slug: 'gauges' },
      { id: 115, name: 'Sensors', slug: 'sensors' },
      { id: 624, name: 'Spark Plugs', slug: 'spark-plugs' },
      { id: 550, name: 'Wiring Harnesses', slug: 'wiring-harnesses' },
    ],
  },
  {
    id: 107, name: 'Cooling', slug: 'cooling',
    children: [
      { id: 126, name: 'Fans, Hose & Accessories', slug: 'fans-shrouds-hose-accessories' },
      { id: 123, name: 'Intercooler', slug: 'intercooler' },
      { id: 125, name: 'Oil Coolers', slug: 'oil-coolers' },
      { id: 124, name: 'Radiators & Overflow Bottles', slug: 'radiators' },
      { id: 548, name: 'Thermostat & Housing', slug: 'thermostat-housing' },
      { id: 547, name: 'Upper Coolant Housings', slug: 'upper-coolant-housings' },
      { id: 549, name: 'Water Pump & Plate Kits', slug: 'water-plate-kits' },
    ],
  },
  {
    id: 22, name: 'Merchandise', slug: 'merchandise',
    children: [
      { id: 503, name: 'Accessories', slug: 'accessories-merchandise' },
      { id: 504, name: 'Caps', slug: 'caps' },
      { id: 147, name: 'Hoodies & Jackets', slug: 'hoodies-jackets' },
      { id: 146, name: 'T-Shirts', slug: 'tees' },
    ],
  },
  {
    id: 471, name: 'Lighting', slug: 'lighting',
    children: [
      {
        id: 472, name: 'LED', slug: 'led',
        children: [
          { id: 484, name: 'Tail / Brake', slug: 'tail-brake' },
        ],
      },
    ],
  },
  {
    id: 666, name: 'Clearance', slug: 'clearance',
    children: [
      { id: 914, name: 'Used Parts', slug: 'used-parts' },
    ],
  },
];

// Flat list of all categories for easy ID/slug lookup
export const CATEGORIES_FLAT = CATEGORIES.reduce((acc, top) => {
  acc.push(top);
  (top.children ?? []).forEach(mid => {
    acc.push(mid);
    (mid.children ?? []).forEach(leaf => acc.push(leaf));
  });
  return acc;
}, []);

export function getCategoryBySlug(slug) {
  return CATEGORIES_FLAT.find(c => c.slug === slug) ?? null;
}

/**
 * Returns the given slug plus all descendant slugs.
 * Used so filtering by a parent category also returns products in sub-categories.
 */
export function getCategoryDescendantSlugs(slug) {
  const slugs = [];
  function collect(node) {
    slugs.push(node.slug);
    (node.children ?? []).forEach(collect);
  }
  const node = CATEGORIES_FLAT.find(c => c.slug === slug);
  if (node) collect(node);
  return slugs;
}
