// Source of truth for the Services landing page (/services), the per-service
// detail pages (/services/<slug>), and the Services mega menu in the main nav.
// All copy is professional/technical: no fabricated stats, no marketing buzz.

export const services = [
  // ─────────────────────────── Maintenance ───────────────────────────
  {
    slug: 'general-service',
    title: 'General Service',
    category: 'maintenance',
    image: '/services-general.jpg',
    tagline: 'Routine maintenance, done properly.',
    summary:
      'Scheduled service work to keep your daily reliable and your weekend car ready. Oils, filters, fluids and a head-to-toe inspection.',
    intro:
      'A general service is the maintenance interval most cars need every 6 to 12 months or every 10,000 to 15,000km. We change the oil and filter, top up the fluids, replace consumable items as they need it, and run a full visual inspection so small problems get caught before they become expensive ones. Every visit ends with a written summary of what we did and anything we want to keep an eye on next time.',
    inclusions: [
      'Engine oil and oil filter replacement',
      'Air, fuel and cabin filter inspection or replacement',
      'Coolant, brake fluid and gear oil top-up',
      'Brake pad and rotor inspection',
      'Tyre pressure, tread depth and wear pattern check',
      'Drive belts, hoses and battery condition check',
      'Lights, wipers and visible electrical check',
      'Written report with photos where relevant',
    ],
    sections: [
      {
        heading: 'What we cover',
        body: 'A general service covers the six areas where wear and consumables usually need attention between major intervals.',
        bullets: [
          'Engine — oil, filter, top-ups and visible leak check',
          'Brakes — pad thickness, rotor condition, fluid level',
          'Suspension and steering — bushings, shocks, alignment indicators',
          'Electrical — battery, alternator output, exterior lights',
          'Tyres — pressures, tread depth, rotation if needed',
          'Underbody — exhaust, cooling, drive belts',
        ],
      },
      {
        heading: 'When to book one',
        body: 'Most workshops use intervals of 6 months or 10,000–15,000km, whichever comes first. If you drive hard, do mostly short trips, or take the car to track days, the right interval is sooner. Bring the logbook if you have it — we will follow the manufacturer schedule.',
      },
    ],
  },
  {
    slug: 'major-service',
    title: 'Major Service',
    category: 'maintenance',
    image: '/menu/menu-maintenacne.jpg',
    tagline: 'A deeper service, every two years.',
    summary:
      'Everything in a general service plus the heavier items that only come due every 24 months or 30,000–40,000km.',
    intro:
      'A major service is the larger interval that includes everything a general service covers, plus the items that wear over a longer cycle — coolant flushes, transmission fluid, spark plugs, drive belt and timing belt inspection, full brake fluid replacement and a more thorough underbody check. It is the right service to book if your last big visit was more than two years ago or if you are about to put serious kilometres on the car.',
    inclusions: [
      'Everything in a general service',
      'Engine coolant flush and refill',
      'Brake fluid replacement front and rear',
      'Transmission fluid inspection or change',
      'Spark plug replacement (interval-based)',
      'Drive belt and timing belt condition check',
      'Detailed brake system service including caliper slides',
      'Full underbody and chassis inspection',
      'Diagnostic scan and clearing of stored codes if appropriate',
      'Written report with prioritised follow-up items',
    ],
    sections: [
      {
        heading: 'How a major service is structured',
        body: 'We break the visit into stages so nothing gets missed and you get a clear picture of the car before any work starts.',
        bullets: [
          'Initial consultation — what you have noticed, your usage, what the logbook says',
          'In-depth inspection — multi-point check of mechanical, electrical and chassis items',
          'Findings report — what is good, what needs attention now, what to monitor',
          'Maintenance work — fluids, filters, plugs, belts, brake service',
          'Final road test and quality check before pickup',
        ],
      },
      {
        heading: 'Pairing with tuning or upgrades',
        body: 'A major service is a good time to plan upgrades — performance brakes, suspension or a tune. We can quote the upgrade work alongside the service so you only pay one labour bill and the car only comes apart once.',
      },
    ],
  },
  {
    slug: 'logbook-service',
    title: 'Logbook Service',
    category: 'maintenance',
    image: '/menu/menu-honda-engine.jpg',
    tagline: 'Manufacturer schedule, warranty intact.',
    summary:
      'A logbook service performed to the manufacturer specification — same parts, same intervals, fully stamped — so your factory or extended warranty stays valid.',
    intro:
      'Australian consumer law allows you to service your new car at any qualified workshop without losing the manufacturer warranty, provided the service is carried out to the schedule and specification in the logbook. We follow the schedule item by item, use parts that meet or exceed the manufacturer specification, and stamp the book so the service history reads cleanly when the car is sold or warranty is claimed.',
    inclusions: [
      'Service performed to the manufacturer logbook schedule',
      'Genuine or OEM-equivalent fluids and filters',
      'Wear component checks at the intervals specified',
      'Diagnostic scan to manufacturer procedure',
      'All required adjustments and resets',
      'Logbook stamped, dated and signed',
      'Receipt and inspection report kept on file with us',
    ],
    sections: [
      {
        heading: 'What stays valid',
        body: 'Following the logbook keeps your factory warranty, any extended warranty taken out at purchase, and most third-party warranties intact. We document every service so the paper trail is clear if you ever need to claim.',
      },
      {
        heading: 'Bring',
        body: 'Bring the logbook, any service paperwork from previous workshops, and any concerns you would like us to look at while the car is in. If you would like a courtesy or loan vehicle, mention it when you book.',
      },
    ],
  },
  {
    slug: 'brake-service',
    title: 'Brake Service',
    category: 'maintenance',
    image: '/menu/menu-brake-pads.jpg',
    tagline: 'Stops that match how you drive.',
    summary:
      'Pads, rotors, fluid and complete brake-system overhaul — for daily commuters, performance street cars and track day builds.',
    intro:
      'Brakes are the one system on the car you cannot afford to compromise on. We service stock brake systems to factory specification and build out performance setups for street and track use. Whether you need a fresh set of pads or a full big-brake conversion, the brakes that come back to you are bedded, road-tested and ready.',
    inclusions: [
      'Brake pad replacement (street, sport, track compounds)',
      'Rotor replacement, machining or upgrade',
      'Brake fluid flush and bleed (DOT 4 / 5.1 / racing fluids)',
      'Caliper inspection, rebuild or upgrade',
      'Stainless braided brake lines',
      'Big brake kit fitment (Brembo, Endless, AP and similar)',
      'Pad bed-in procedure on every fresh pad set',
      'Road test before handover',
    ],
    sections: [
      {
        heading: 'Our process',
        body: 'A brake service that gets it right starts with diagnosis, not parts.',
        bullets: [
          'Inspection — pads, rotors, calipers, hoses, fluid moisture content',
          'Findings report — what needs replacing, what can be reused',
          'Service plan — confirmed with you before any parts go on the car',
          'Workshop work — fitment, torque to spec, fluid bleed',
          'Road test — pedal feel, pull, noise, ABS engagement',
          'Handover — notes on bed-in and break-in mileage',
        ],
      },
      {
        heading: 'Pads we typically fit',
        body: 'On Hondas and JDM platforms we commonly fit Intima SS, Endless, DBA Xtreme and Hawk pads, paired with Delios, DBA or upgraded two-piece rotors. If you have a specific compound in mind we can usually source it.',
      },
    ],
  },
  {
    slug: 'suspension-service',
    title: 'Suspension Service',
    category: 'maintenance',
    image: '/menu/menu-coilovers.jpg',
    tagline: 'From street comfort to track stiffness.',
    summary:
      'Shocks, springs, bushings and full coilover and arm setups — set up and corner-balanced for the way you actually drive.',
    intro:
      'A suspension that is right for your car is one that matches how you use it. We service worn factory suspension, build street-friendly drop setups, and corner-balance dedicated track cars. Coilover fitment includes a baseline ride-height and damper setting we put on your car, then refine after a road test rather than guess at on the bench.',
    inclusions: [
      'Shock and strut replacement (OEM and aftermarket)',
      'Coilover fitment, ride-height set and damper baseline',
      'Spring upgrades and lowering kits',
      'Suspension and control arm replacement',
      'Bushing replacement (rubber, polyurethane, spherical)',
      'Sway bar and end-link replacement',
      'Wheel alignment to spec',
      'Corner balance for track-focused builds',
    ],
    sections: [
      {
        heading: 'Setup options',
        body: 'We carry and service the suspension brands customers ask for most, including Tein, MCA, Hardrace, Whiteline, Eibach, Skunk2 and Hybrid Racing. Tell us how the car is used — daily, weekend, track — and we will spec accordingly.',
      },
      {
        heading: 'Alignment',
        body: 'Suspension work without an alignment is half a service. Every coilover, lowering spring or arm fitment is followed by a wheel alignment to the spec sheet for the car, with adjustments for stance, tyre wear or cornering preference if you have requested it.',
      },
    ],
  },
  {
    slug: 'tyres-wheel-alignment',
    title: 'Tyres & Wheel Alignment',
    category: 'maintenance',
    image: '/menu/menu-wheels.jpg',
    tagline: 'Right rubber, set up straight.',
    summary:
      'Tyre supply and fitment plus four-wheel alignment — for daily commuters, fast street cars and dedicated track builds.',
    intro:
      'Tyres are the only contact patch the car has, and a millimetre of toe out of spec will undo the rest of the suspension work in a few thousand kilometres. We supply and fit a wide range of street, sport and semi-slick tyres, balance them on the machine, and finish every job with a four-wheel alignment to factory spec or your preferred performance setup. If the car has new suspension, lowered ride height, or has just hit a kerb, an alignment is the cheapest insurance you can buy.',
    inclusions: [
      'Tyre supply and fitment (street, sport, semi-slick, slick)',
      'Computer wheel balancing front and rear',
      'Old tyre disposal and rubber valve stem replacement',
      'Four-wheel alignment to factory specification',
      'Performance alignment for track, time-attack or stance setups',
      'Camber, caster and toe adjustment front and rear',
      'Tyre rotation, pressure check and tread depth report',
      'Pre-alignment suspension inspection (bushings, ball joints, tie rods)',
    ],
    sections: [
      {
        heading: 'How a proper alignment is done',
        body: 'A wheel alignment is only as good as the inspection that comes before it. Worn bushings, loose tie rods or uneven tyre pressures will throw the numbers off and the alignment will not hold.',
        bullets: [
          'Pre-check — suspension play, tyre pressures, ride height',
          'Mount on the alignment rack and measure current geometry',
          'Compare against factory or target performance spec',
          'Adjust camber, caster and toe front and rear',
          'Final reading printed and supplied to you',
          'Road test for pull, tracking and steering wheel centre',
        ],
      },
      {
        heading: 'Street vs track alignments',
        body: 'A street alignment targets even tyre wear and stable highway tracking. A track alignment trades some tyre life for negative camber and toe settings that bite harder mid-corner. Tell us how the car is used and what you have under it — coilovers, camber arms, adjustable toe links — and we will set the geometry accordingly.',
      },
    ],
  },
  {
    slug: 'drivetrain-service',
    title: 'Drivetrain Service',
    category: 'maintenance',
    image: '/menu/menu-clutch.jpg',
    tagline: 'Power on the ground.',
    summary:
      'Clutch, driveshafts, axles, differential and the rest of the drivetrain — diagnosed, serviced and upgraded.',
    intro:
      'The drivetrain is everything that moves power from the engine to the wheels. We diagnose vibration, slip, noise and wear across the full system — clutch, gearbox, driveshafts, CV joints, differential, axles and hubs — and service or replace whatever is found. On performance builds we fit upgraded components matched to the engine output.',
    inclusions: [
      'Clutch and flywheel replacement (stock and upgraded)',
      'Driveshaft and CV joint replacement or upgrade',
      'Axle and hub bearing service',
      'Differential service, oil change and LSD installation',
      'Transfer case service (4WD)',
      'Drivetrain diagnostics for vibration and noise',
      'Sensor and electronic drivetrain control checks',
      'Road test and post-service confirmation',
    ],
    sections: [
      {
        heading: 'When to book one',
        body: 'Common signs the drivetrain is asking for attention include a clutch that slips under load, a clunk on takeoff or gearchange, vibration at speed, whining from the differential, or a transfer case that is noisy on lockup. Any of these are worth a diagnostic visit.',
      },
      {
        heading: 'Upgrade-ready',
        body: 'On forced-induction Hondas and high-power JDM builds we regularly fit upgraded clutches (Exedy, Competition Clutch, ORC, ATS), Insane and DSS driveshafts, MFactory and Quaife LSDs, and upgraded final drives. Tell us your power target and we will spec drivetrain parts that survive it.',
      },
    ],
  },
  {
    slug: 'transmission-service',
    title: 'Transmission Service',
    category: 'maintenance',
    image: '/menu/menu-synchros.jpg',
    tagline: 'Clean fluid, sharp shifts, longer life.',
    summary:
      'Manual, automatic, CVT and DCT transmissions — fluid service, diagnostics, repair and rebuild.',
    intro:
      'Transmission fluid does most of the work and gets thanked for none of it. A transmission service replaces the fluid, looks at what it brings out, and addresses any wear or fault before it forces a rebuild. We service every major transmission type and rebuild manual gearboxes in-house using OEM and upgraded synchros, gears and bearings.',
    inclusions: [
      'Manual gearbox fluid change and inspection',
      'Automatic transmission fluid and filter service',
      'CVT and DCT fluid service to manufacturer specification',
      'Solenoid testing and replacement',
      'Transmission control module diagnostic scan',
      'Manual gearbox rebuild (synchros, bearings, seals)',
      'Shifter cables, bushings and shifter rebuild',
      'Road test for shift quality and engagement',
    ],
    sections: [
      {
        heading: 'Why fluid first',
        body: 'Most transmission problems start as a fluid problem. Old or contaminated fluid wears synchros, glazes friction plates and confuses control modules. A clean fluid service often resolves rough shifts and slipping before any teardown is needed.',
      },
      {
        heading: 'Rebuilds and upgrades',
        body: 'We rebuild Honda manual gearboxes (B, K and F-series), fit upgraded synchros and gears (Synchrotech, MFactory, PPG), and install close-ratio sets where appropriate. Tell us how you use the car — daily street, drag strip, road course — so the build matches.',
      },
    ],
  },

  // ─────────────────────────── Performance ───────────────────────────
  {
    slug: 'engine-build',
    title: 'Engine Build & Rebuild',
    category: 'performance',
    image: '/services/IMG_7626.jpg',
    tagline: 'Built for what you ask of it.',
    summary:
      'Stock rebuilds, performance builds and full custom engines — Honda, Acura and JDM platforms, dyno-tested before delivery.',
    intro:
      'An engine build is only as good as the planning and the parts. We build engines for daily reliability, naturally aspirated power, and turbocharged platforms that need to survive boost. Every build is balanced, machined to spec, blueprinted and dyno-verified before it goes back in the car.',
    inclusions: [
      'Full engine teardown, inspection and machine work',
      'Block and head machining (decking, honing, line bore, valve job)',
      'Forged or OEM internal selection and assembly',
      'Cylinder head porting and valvetrain upgrades',
      'Custom camshaft selection and valvetrain matching',
      'Bottom-end balancing and blueprinting',
      'Pre-build, in-process and post-build measurement records',
      'Run-in tune and dyno verification before handover',
    ],
    sections: [
      {
        heading: 'Build types',
        body: 'We work on most engine families our customers run, with deep experience on Honda B, K, F and D series.',
        bullets: [
          'Stock rebuild — restore a tired engine to factory spec or better',
          'NA performance build — raised compression, ported head, cams, valvetrain',
          'Forced-induction build — sleeved or aftermarket block, forged internals, head studs, ARP fasteners',
          'Custom build — your spec, our recommendations, signed off before parts are ordered',
        ],
      },
      {
        heading: 'Platforms',
        body: 'Honda B-series, K-series, F-series, D-series and J-series; Subaru EJ/FA, Nissan SR/RB/VQ, Mitsubishi 4G63 and 4B11, Mazda BP/B6 and rotary on request. If your platform is not listed, ask — we will be honest about whether we are the right shop for the job.',
      },
    ],
  },
  {
    slug: 'exhaust-fabrication',
    title: 'Exhaust & Custom Fabrication',
    category: 'performance',
    image: '/menu/menu-headers.jpg',
    tagline: 'Bent, welded and fitted in-house.',
    summary:
      'Off-the-shelf exhaust fitment plus full custom fabrication — headers, downpipes, turbo-back systems, one-off builds.',
    intro:
      'We carry, fit and fabricate exhausts for street, strip and circuit use. If you want a brand-name catback fitted, we have the catalogue. If your build needs a custom downpipe, header or full turbo-back system, we design and weld it on the bench so it fits properly the first time. Stainless and titanium tubing, TIG-welded.',
    inclusions: [
      'Catback exhaust fitment (Invidia, HKS, Tomei, GReddy and similar)',
      'Header design and fabrication (4-1, 4-2-1, T3/T4 turbo manifolds)',
      'Downpipe fabrication, catted or catless',
      'Turbo-back system design and build',
      'Muffler and resonator selection for sound and back-pressure',
      'V-band, slip-fit and flange options',
      'Mandrel-bent stainless and titanium tubing',
      'TIG welding throughout, back-purged where required',
    ],
    sections: [
      {
        heading: 'Custom fabrication',
        body: 'Custom work is the part most workshops outsource. We do it in-house. Bring the car or the parts, tell us the goal — sound, flow, packaging — and we will design the exhaust on the bench rather than guess at it on the lift.',
      },
      {
        heading: 'Sound, flow and noise',
        body: 'There is no single best exhaust. Track day cars want flow and need to meet a sound limit. Street cars want sound and street-legal back-pressure. Tell us how you use the car and what noise you want, and we will spec accordingly.',
      },
    ],
  },
  {
    slug: 'tuning',
    title: 'Tuning Service',
    category: 'performance',
    image: '/services-tuning.jpg',
    tagline: 'Calibrated, not just flashed.',
    summary:
      'Custom ECU tuning on our in-house dyno — for stock cars, bolt-on builds, and full forced-induction setups.',
    intro:
      'A tune is not a number. It is a calibration of fuel, ignition, boost and throttle behaviour for the way your specific car is built and driven. We tune naturally aspirated and forced induction Hondas, Acuras and most JDM platforms in-house on the dyno using Hondata, KTuner, Link and similar platforms. Every tune is data-logged in real driving conditions before sign-off.',
    inclusions: [
      'Hondata FlashPro, KManager and S300 tuning',
      'KTuner and KTuner V2 tuning',
      'Link, ECUMaster and Haltech tuning',
      'Naturally aspirated and forced induction calibration',
      'Air/fuel ratio and ignition timing mapping',
      'Boost control, wastegate and electronic boost solenoid tuning',
      'Launch control and rev limiter calibration',
      'Pre-tune and post-tune health and compression check',
      'Datalogging in road conditions before sign-off',
    ],
    sections: [
      {
        heading: 'How a tune is structured',
        body: 'A proper tune is a process, not a download.',
        bullets: [
          'Pre-tune inspection — compression, fuel pressure, sensors, basic mechanical health',
          'Baseline pull — measure where the car is right now',
          'Calibration on the dyno — fuel, ignition, throttle, boost',
          'Datalogging at part-throttle and street loads',
          'Final pull and sign-off, with logs supplied to you',
        ],
      },
      {
        heading: 'What we tune for',
        body: 'We tune for the car. Daily reliability, fuel economy, drivability, throttle response and peak power are all dials that move depending on how you use the car. Tell us what matters and we will tune to it — not just to a dyno chart.',
      },
    ],
  },
  {
    slug: 'performance-parts',
    title: 'Performance Parts',
    category: 'performance',
    image: '/services-performance.jpg',
    tagline: 'Parts you trust, fitted properly.',
    summary:
      'We stock and fit the performance brands our customers ask for — and stand behind every install.',
    intro:
      'Performance parts is more than a product list. We carry the brands we trust, fit them in-house, and back the work with our installation guarantee. If you have a build in mind, come in and talk it through — we will spec the parts, work out the order they should go on, and quote labour up front so there are no surprises.',
    inclusions: [
      'Engine internals — pistons, rods, valvetrain, head studs',
      'Forced induction — turbo kits, supercharger kits, intercoolers',
      'Fuel system — injectors, pumps, regulators, rails',
      'Engine management — Hondata, KTuner, Link, ECUMaster',
      'Suspension — coilovers, springs, sway bars, arms, bushings',
      'Brakes — pads, rotors, big brake kits, lines, fluids',
      'Drivetrain — clutches, flywheels, LSDs, axles, gears',
      'Exhaust — headers, downpipes, full systems, mufflers',
      'Wheels and tyres for street and track use',
    ],
    sections: [
      {
        heading: 'Brands we carry',
        body: 'We stock or directly source the brands our customers ask for most — including Hondata, Skunk2, K-Tuned, HKS, Mugen, Spoon Sports, Toda Racing, ARP, Exedy, Competition Clutch, Tein, Eibach, Whiteline, Hardrace, MCA, AEM, Walbro, NGK, Motul, Kraftwerks and many more.',
      },
      {
        heading: 'Buying and fitting',
        body: 'You can buy parts from us to fit yourself, or have us fit them — labour is quoted on top of the part price and any required workshop consumables. If you are buying parts elsewhere we can usually still fit them, but the warranty is the seller’s — we cannot back parts we did not supply.',
      },
    ],
    extraLinks: [
      { label: 'Browse the parts catalogue', href: '/shop' },
      { label: 'See all brands we carry', href: '/brands' },
    ],
  },
  {
    slug: 'race-track-support',
    title: 'Race Track Support',
    category: 'performance',
    image: '/services/MTL03720.jpg',
    tagline: 'We come to the track with you.',
    summary:
      'Trackside support for sprint days, time-attack and circuit racing — pre-event prep, in-paddock setup and changes between sessions.',
    intro:
      'A track day is no place to find out the car was not ready. Race track support is two halves — a thorough pre-event prep so the car arrives sorted, and a hands-on day at the circuit so you have someone in your corner between sessions. Whether you are running a Sandown sprint, a Phillip Island time-attack or a full-day club event, we bring the tools, the spares and the experience to keep you on the grid.',
    inclusions: [
      'Pre-event safety and mechanical inspection',
      'Brake fluid flush with high-temperature racing fluid',
      'Race pad and rotor inspection or fitment',
      'Coolant, engine oil and gearbox fluid checks at race level',
      'Wheel torque, hub and bearing check',
      'Camber and tyre pressure setup for the circuit',
      'In-paddock support between sessions (changes, adjustments, repairs)',
      'Datalogging review where logging is fitted',
      'Spares kit and tooling on hand throughout the day',
    ],
    sections: [
      {
        heading: 'What track support looks like',
        body: 'A weekend at the track has a rhythm. We work to it.',
        bullets: [
          'Pre-event — workshop visit a week out, full check-over, fluids, brakes, alignment',
          'Setup morning — pressures, camber, ride height and fuel load before first session',
          'Between sessions — adjust pressures, swap pads or rotors, look at any new noise',
          'Driver debrief — what the car was doing, what to change for the next run',
          'Post-event — list of items the car wants attention on before next outing',
        ],
      },
      {
        heading: 'Events and circuits we support',
        body: 'We regularly support customers at Phillip Island, Sandown, Winton, Calder Park and Heathcote. The Bend, Symmons Plains and interstate events are possible with notice — get in touch early so we can plan the trip, the spares kit and the trailer logistics with you.',
      },
      {
        heading: 'What you should bring',
        body: 'Helmet, suit and licence as the event requires; race fuel if your build needs it; a spare set of wheels and tyres if you have them; and an honest read on what you want to get out of the day. The clearer the goal, the better the day runs.',
      },
    ],
  },
];

export const servicesByCategory = {
  maintenance: services.filter((s) => s.category === 'maintenance'),
  performance: services.filter((s) => s.category === 'performance'),
};

export const servicesFaqs = [
  {
    q: 'Do I need to book in advance?',
    a: 'Yes. We work by appointment so every car gets dedicated workshop time. Use the Book a Service page or call 03 9574 1710.',
  },
  {
    q: 'What is the difference between a general service and a major service?',
    a: 'A general service is the regular interval that handles oil, filters, fluid top-ups and a full inspection. A major service includes the same plus the items that come due less often — coolant flush, brake fluid replacement, spark plugs, drive-belt and timing-belt checks. Most cars need a general service every 6 to 12 months and a major service roughly every two years.',
  },
  {
    q: 'Will a logbook service with you keep my new car warranty valid?',
    a: 'Yes. Australian consumer law allows you to use any qualified workshop, provided the service is performed to the manufacturer schedule and specification. We follow the logbook item by item, use OEM-spec parts and fluids, and stamp the book — your factory and extended warranties stay intact.',
  },
  {
    q: 'Do you work on non-Honda vehicles?',
    a: 'Our depth is on Honda and Acura platforms, but we regularly service Toyota, Mazda, Nissan, Subaru and Mitsubishi cars. Engine builds, tuning and fabrication work cover most JDM platforms. Get in touch if you are unsure.',
  },
  {
    q: 'Can I supply my own parts?',
    a: 'For parts we sell, we prefer to source them so we can stand behind quality and fitment. We can fit customer-supplied parts in some cases, but the warranty stays with whoever supplied the part — we cannot back parts we did not buy.',
  },
  {
    q: 'Do you tune cars you did not build?',
    a: 'Yes. Bring the car in for a pre-tune health check (compression, fuel pressure, sensors). If the mechanical baseline is good we will tune it. If anything is wrong, we will tell you what needs fixing first.',
  },
];
