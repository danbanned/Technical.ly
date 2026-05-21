/**
 * seedCityData.js — 11 cities with full economic profiles
 *
 * Each city provides:
 *   - Core metrics (researchSpending, dealFlow, mobilityScore, …)
 *   - stats{}: 25 economic categories, each with a value and percentile (0–100).
 *     percentile drives building-color weighting in FakeCityGenerator.
 *   - universities[]: patent counts → bee density in LivingEcosystem
 *   - ecosystemConnections[]: planes and bridge lines
 *   - beeCounts{}: per-university bee density
 *   - planeCounts{}: per-destination plane count.
 *     Keys MUST match city names in useImmersionController ECOSYSTEM_MAP
 *     ('Washington', 'Philadelphia', 'Baltimore', 'Wilmington', 'Pittsburgh')
 *   - landmarks[]: per-city named towers used by FakeCityGenerator v2
 *   - cityRadius: generation radius in meters (default 600)
 *
 * Color reference (matches ECON map in FakeCityGenerator):
 *   universityResearch #00D1FF   ventureCapital    #FF8A00
 *   corporateResearch  #0091EA   privateEquity     #FF6D00
 *   techTalent         #00E676   newBusinesses     #E040FB
 *   minorityOwned      #FF005C   womenOwned        #FF4081
 *   publicSpending     #607D8B   transit           #90A4AE
 */

// ─── Shared economic-stat percentiles shape ────────────────────────────────
// Every city's stats object follows this structure:
// { statKey: { value: number, percentile: 0-100 } }

export const SEED_CITIES = {

  // ── BALTIMORE ────────────────────────────────────────────────────────────
  baltimore: {
    name: 'Baltimore', state: 'MD',
    lat: 39.2904, lon: -76.6122,
    cityRadius: 600,
    focusLandmark: 'universityTower',
    researchSpending: 3.9e9, dealFlow: 1.2e8, dealCount: 23, dealFlowYoY: -15,
    mobilityScore: 62, mobilityRating: 'Moderate',
    newBusinessFormationRate: 8.3, jobMobilityIndex: 54, migrationNet: -1200,
    medianIncome: 52000, incomeGrowthYoY: 2.1, laborForceParticipation: 61.5,

    stats: {
      universityResearch:    { value: 3.9e9,  percentile: 92 },
      corporateResearch:     { value: 4.5e8,  percentile: 45 },
      patents:               { value: 342,    percentile: 78 },
      ventureCapital:        { value: 1.2e8,  percentile: 22 },  // ← MISMATCH
      privateEquity:         { value: 8e7,    percentile: 18 },
      angelInvestment:       { value: 3.5e7,  percentile: 30 },
      bankLending:           { value: 2.1e9,  percentile: 55 },
      techTalent:            { value: 28000,  percentile: 48 },
      healthcareTalent:      { value: 85000,  percentile: 88 },
      graduateOutput:        { value: 12000,  percentile: 75 },
      newBusinesses:         { value: 1800,   percentile: 35 },
      smallBusiness:         { value: 32000,  percentile: 52 },
      franchises:            { value: 2800,   percentile: 45 },
      commercialRealEstate:  { value: 8.5e8,  percentile: 40 },
      residentialRealEstate: { value: 3.2e9,  percentile: 48 },
      industrialRealEstate:  { value: 4.5e8,  percentile: 35 },
      minorityOwned:         { value: 1600,   percentile: 15 },  // ← MISMATCH
      womenOwned:            { value: 2800,   percentile: 28 },
      communityBanking:      { value: 4.5e8,  percentile: 55 },
      affordableHousing:     { value: 2.8e7,  percentile: 32 },
      publicSpending:        { value: 6.5e9,  percentile: 62 },
      infrastructure:        { value: 3.2e9,  percentile: 50 },
      transit:               { value: 1.8e9,  percentile: 45 },
      mixedUse:              { value: 0,      percentile: 40 },
      vacant:                { value: 0,      percentile: 55 },
    },

    universities: [
      { name: 'Johns Hopkins University',          lat: 39.3299, lon: -76.6205, rd_spending: 3.18e9, field: 'Medical/Health',  patents: 342, gradStudents: 8200,  minorityLed: 12 },
      { name: 'University of Maryland Baltimore',  lat: 39.2904, lon: -76.6253, rd_spending: 6.8e8,  field: 'Medical/Health',  patents: 87,  gradStudents: 3400,  minorityLed: 22 },
      { name: 'Morgan State University',           lat: 39.3382, lon: -76.6090, rd_spending: 4.5e7,  field: 'Engineering/CS',  patents: 12,  gradStudents: 1200,  minorityLed: 68 },
      { name: 'UMBC',                              lat: 39.2550, lon: -76.6175, rd_spending: 8.4e7,  field: 'Engineering/CS',  patents: 28,  gradStudents: 1800,  minorityLed: 35 },
    ],

    ecosystemConnections: [
      { city: 'Washington',    lat: 38.9072, lon: -77.0369, flowType: 'talent',  volume: 3400,  direction: 'outbound', dealValue: 0 },
      { city: 'Philadelphia',  lat: 39.9526, lon: -75.1652, flowType: 'capital', volume: 0,     direction: 'inbound',  dealValue: 8.5e7 },
      { city: 'Boston',        lat: 42.3601, lon: -71.0589, flowType: 'capital', volume: 0,     direction: 'outbound', dealValue: 1.2e8 },
      { city: 'New York',      lat: 40.7128, lon: -74.0060, flowType: 'talent',  volume: 2100,  direction: 'outbound', dealValue: 0 },
      { city: 'San Francisco', lat: 37.7749, lon: -122.4194,flowType: 'capital', volume: 0,     direction: 'inbound',  dealValue: 9.5e7 },
    ],

    beeCounts: {
      'Johns Hopkins University':         80,
      'University of Maryland Baltimore': 30,
      'Morgan State University':          8,
      'UMBC':                             15,
    },
    treeCount: 120, treeHealth: 0.55,
    carCount: 20,   carSpeed: 0.54,
    dustEmission: 0.15,
    planeCounts: { Washington: 8, Philadelphia: 5 },

    landmarks: [
      { template: 'comcastTower',    gridX: 0,    gridZ: 0,    name: 'Legg Mason Tower',       height: 32, color: '#0D47A1', stat: 'corporateResearch' },
      { template: 'universityTower', gridX: -120, gridZ: 80,   name: 'JHU Research Tower',     height: 40, color: '#00D1FF', stat: 'universityResearch' },
      { template: 'hospitalComplex', gridX: -80,  gridZ: -60,  name: 'Johns Hopkins Hospital', height: 30, color: '#E91E63', stat: 'healthcareTalent' },
      { template: 'financialTower',  gridX: 100,  gridZ: -30,  name: 'VC Hub',                 height: 18, color: '#FF8A00', stat: 'ventureCapital' },
      { template: 'transitHub',      gridX: 60,   gridZ: 140,  name: 'Penn Station',           height: 15, color: '#607D8B', stat: 'transit' },
    ],
  },

  // ── BOSTON ───────────────────────────────────────────────────────────────
  boston: {
    name: 'Boston', state: 'MA',
    lat: 42.3601, lon: -71.0589,
    cityRadius: 700,
    focusLandmark: 'universityTower',
    researchSpending: 5.2e9, dealFlow: 4.8e9, dealCount: 180, dealFlowYoY: 8,
    mobilityScore: 78, mobilityRating: 'High',
    newBusinessFormationRate: 14.2, jobMobilityIndex: 72, migrationNet: 4500,
    medianIncome: 72000, incomeGrowthYoY: 4.8, laborForceParticipation: 68.2,

    stats: {
      universityResearch:    { value: 5.2e9,  percentile: 96 },
      corporateResearch:     { value: 2.8e9,  percentile: 85 },
      patents:               { value: 850,    percentile: 95 },
      ventureCapital:        { value: 4.8e9,  percentile: 88 },
      privateEquity:         { value: 3.2e9,  percentile: 82 },
      angelInvestment:       { value: 4.5e8,  percentile: 78 },
      bankLending:           { value: 5.5e9,  percentile: 80 },
      techTalent:            { value: 95000,  percentile: 92 },
      healthcareTalent:      { value: 120000, percentile: 95 },
      graduateOutput:        { value: 28000,  percentile: 96 },
      newBusinesses:         { value: 5200,   percentile: 82 },
      smallBusiness:         { value: 45000,  percentile: 75 },
      franchises:            { value: 3800,   percentile: 62 },
      commercialRealEstate:  { value: 4.5e9,  percentile: 85 },
      residentialRealEstate: { value: 8.2e9,  percentile: 88 },
      industrialRealEstate:  { value: 9e8,    percentile: 55 },
      minorityOwned:         { value: 3800,   percentile: 42 },
      womenOwned:            { value: 6200,   percentile: 55 },
      communityBanking:      { value: 8e8,    percentile: 72 },
      affordableHousing:     { value: 1.2e8,  percentile: 48 },
      publicSpending:        { value: 8.5e9,  percentile: 78 },
      infrastructure:        { value: 5.5e9,  percentile: 75 },
      transit:               { value: 4.2e9,  percentile: 82 },
      mixedUse:              { value: 0,      percentile: 75 },
      vacant:                { value: 0,      percentile: 18 },
    },

    universities: [
      { name: 'MIT',                 lat: 42.3601, lon: -71.0942, rd_spending: 1.8e9, field: 'Engineering/CS', patents: 420, gradStudents: 7200,  minorityLed: 18 },
      { name: 'Harvard University',  lat: 42.3770, lon: -71.1167, rd_spending: 1.5e9, field: 'Medical/Health', patents: 310, gradStudents: 14000, minorityLed: 15 },
      { name: 'Boston University',   lat: 42.3505, lon: -71.1054, rd_spending: 6.5e8, field: 'Medical/Health', patents: 95,  gradStudents: 8500,  minorityLed: 22 },
      { name: 'Northeastern',        lat: 42.3398, lon: -71.0892, rd_spending: 3.5e8, field: 'Engineering/CS', patents: 58,  gradStudents: 6200,  minorityLed: 28 },
      { name: 'Tufts University',    lat: 42.4075, lon: -71.1190, rd_spending: 2.8e8, field: 'Life Sciences',  patents: 42,  gradStudents: 3800,  minorityLed: 20 },
      { name: 'Boston College',      lat: 42.3350, lon: -71.1702, rd_spending: 1.5e8, field: 'Social Sciences',patents: 18,  gradStudents: 3200,  minorityLed: 25 },
      { name: 'UMass Boston',        lat: 42.3134, lon: -71.0385, rd_spending: 1.2e8, field: 'Engineering/CS', patents: 22,  gradStudents: 2800,  minorityLed: 38 },
      { name: 'Brandeis University', lat: 42.3656, lon: -71.2596, rd_spending: 9e7,   field: 'Life Sciences',  patents: 15,  gradStudents: 2200,  minorityLed: 30 },
    ],

    ecosystemConnections: [
      { city: 'New York',      lat: 40.7128, lon: -74.0060,  flowType: 'capital', volume: 0,    direction: 'bidirectional', dealValue: 2.5e9 },
      { city: 'San Francisco', lat: 37.7749, lon: -122.4194, flowType: 'capital', volume: 0,    direction: 'bidirectional', dealValue: 3.2e9 },
      { city: 'Washington',    lat: 38.9072, lon: -77.0369,  flowType: 'talent',  volume: 5200, direction: 'bidirectional', dealValue: 0 },
    ],

    beeCounts: {
      'MIT': 100, 'Harvard University': 90, 'Boston University': 40,
      'Northeastern': 35, 'Tufts University': 25, 'Boston College': 20,
      'UMass Boston': 15, 'Brandeis University': 18,
    },
    treeCount: 300, treeHealth: 0.85,
    carCount: 60,   carSpeed: 0.72,
    dustEmission: 0.8,
    planeCounts: { 'New York': 25, 'San Francisco': 30, 'Washington': 10 },

    landmarks: [
      { template: 'comcastTower',    gridX: 0,    gridZ: 0,    name: 'Boston Financial Tower',  height: 45, color: '#0D47A1', stat: 'corporateResearch' },
      { template: 'universityTower', gridX: -150, gridZ: 100,  name: 'MIT Innovation Tower',    height: 42, color: '#00D1FF', stat: 'universityResearch' },
      { template: 'universityTower', gridX: -100, gridZ: -80,  name: 'Harvard Research Tower',  height: 38, color: '#00D1FF', stat: 'universityResearch' },
      { template: 'hospitalComplex', gridX: 120,  gridZ: 80,   name: 'Mass General Hospital',   height: 32, color: '#E91E63', stat: 'healthcareTalent' },
      { template: 'financialTower',  gridX: 80,   gridZ: -50,  name: 'Seaport VC Hub',          height: 40, color: '#FF8A00', stat: 'ventureCapital' },
      { template: 'transitHub',      gridX: -30,  gridZ: 160,  name: 'South Station',           height: 18, color: '#607D8B', stat: 'transit' },
    ],
  },

  // ── SAN FRANCISCO ────────────────────────────────────────────────────────
  'san francisco': {
    name: 'San Francisco', state: 'CA',
    lat: 37.7749, lon: -122.4194,
    cityRadius: 800,
    focusLandmark: 'financialTower',
    researchSpending: 2.8e9, dealFlow: 18.5e9, dealCount: 450, dealFlowYoY: 22,
    mobilityScore: 85, mobilityRating: 'High',
    newBusinessFormationRate: 18.7, jobMobilityIndex: 81, migrationNet: 8200,
    medianIncome: 96000, incomeGrowthYoY: 8.5, laborForceParticipation: 72.8,

    stats: {
      universityResearch:    { value: 2.8e9,   percentile: 85 },
      corporateResearch:     { value: 8.5e9,   percentile: 98 },
      patents:               { value: 1200,    percentile: 98 },
      ventureCapital:        { value: 1.85e10, percentile: 99 },
      privateEquity:         { value: 1.2e10,  percentile: 98 },
      angelInvestment:       { value: 2.5e9,   percentile: 98 },
      bankLending:           { value: 8.2e9,   percentile: 92 },
      techTalent:            { value: 180000,  percentile: 99 },
      healthcareTalent:      { value: 65000,   percentile: 82 },
      graduateOutput:        { value: 15000,   percentile: 82 },
      newBusinesses:         { value: 12000,   percentile: 98 },
      smallBusiness:         { value: 55000,   percentile: 85 },
      franchises:            { value: 4200,    percentile: 68 },
      commercialRealEstate:  { value: 1.2e10,  percentile: 96 },
      residentialRealEstate: { value: 2.5e10,  percentile: 98 },
      industrialRealEstate:  { value: 1.5e9,   percentile: 62 },
      minorityOwned:         { value: 8500,    percentile: 72 },
      womenOwned:            { value: 12000,   percentile: 78 },
      communityBanking:      { value: 1.2e9,   percentile: 82 },
      affordableHousing:     { value: 5e8,     percentile: 55 },
      publicSpending:        { value: 1.2e10,  percentile: 88 },
      infrastructure:        { value: 8e9,     percentile: 85 },
      transit:               { value: 6e9,     percentile: 88 },
      mixedUse:              { value: 0,       percentile: 92 },
      vacant:                { value: 0,       percentile: 5 },
    },

    universities: [
      { name: 'Stanford University',  lat: 37.4275, lon: -122.1697, rd_spending: 1.6e9, field: 'Engineering/CS', patents: 520, gradStudents: 9500, minorityLed: 16 },
      { name: 'UC Berkeley',          lat: 37.8719, lon: -122.2585, rd_spending: 1.2e9, field: 'Engineering/CS', patents: 380, gradStudents: 11000,minorityLed: 20 },
      { name: 'UCSF',                 lat: 37.7626, lon: -122.4580, rd_spending: 8e8,   field: 'Medical/Health', patents: 210, gradStudents: 4200, minorityLed: 18 },
      { name: 'San Francisco State',  lat: 37.7249, lon: -122.4799, rd_spending: 5e7,   field: 'Social Sciences',patents: 8,   gradStudents: 1800, minorityLed: 45 },
      { name: 'USF',                  lat: 37.7769, lon: -122.4516, rd_spending: 3.5e7, field: 'Life Sciences',  patents: 12,  gradStudents: 1500, minorityLed: 32 },
    ],

    ecosystemConnections: [
      { city: 'Boston',   lat: 42.3601, lon: -71.0589, flowType: 'capital', volume: 0, direction: 'bidirectional', dealValue: 3.2e9 },
      { city: 'New York', lat: 40.7128, lon: -74.0060, flowType: 'capital', volume: 0, direction: 'bidirectional', dealValue: 2.8e9 },
    ],

    beeCounts: {
      'Stanford University': 95, 'UC Berkeley': 85, 'UCSF': 50,
      'San Francisco State': 20, 'USF': 25,
    },
    treeCount: 250, treeHealth: 0.95,
    carCount: 80,   carSpeed: 0.85,
    dustEmission: 1.0,
    planeCounts: { Boston: 30, 'New York': 25 },

    landmarks: [
      { template: 'comcastTower',    gridX: 0,    gridZ: 0,    name: 'Salesforce Tower',        height: 50, color: '#0D47A1', stat: 'corporateResearch' },
      { template: 'financialTower',  gridX: -60,  gridZ: 40,   name: 'VC District Tower',       height: 45, color: '#FF8A00', stat: 'ventureCapital' },
      { template: 'financialTower',  gridX: 70,   gridZ: -30,  name: 'Sand Hill Hub',           height: 42, color: '#FF6D00', stat: 'privateEquity' },
      { template: 'universityTower', gridX: -180, gridZ: 120,  name: 'Stanford Research Tower', height: 35, color: '#00D1FF', stat: 'universityResearch' },
      { template: 'transitHub',      gridX: 30,   gridZ: 150,  name: 'BART Hub',                height: 20, color: '#607D8B', stat: 'transit' },
    ],
  },

  // ── PITTSBURGH ───────────────────────────────────────────────────────────
  pittsburgh: {
    name: 'Pittsburgh', state: 'PA',
    lat: 40.4406, lon: -79.9959,
    cityRadius: 500,
    focusLandmark: 'universityTower',
    researchSpending: 2.1e9, dealFlow: 2.8e8, dealCount: 35, dealFlowYoY: 5,
    mobilityScore: 58, mobilityRating: 'Moderate',
    newBusinessFormationRate: 7.2, jobMobilityIndex: 48, migrationNet: -800,
    medianIncome: 48000, incomeGrowthYoY: 1.8, laborForceParticipation: 58.5,

    stats: {
      universityResearch:    { value: 2.1e9,  percentile: 78 },
      corporateResearch:     { value: 6e8,    percentile: 52 },
      patents:               { value: 280,    percentile: 72 },
      ventureCapital:        { value: 2.8e8,  percentile: 38 },
      privateEquity:         { value: 1.5e8,  percentile: 28 },
      angelInvestment:       { value: 6e7,    percentile: 35 },
      bankLending:           { value: 1.8e9,  percentile: 48 },
      techTalent:            { value: 35000,  percentile: 55 },
      healthcareTalent:      { value: 55000,  percentile: 72 },
      graduateOutput:        { value: 8500,   percentile: 68 },
      newBusinesses:         { value: 1500,   percentile: 28 },
      smallBusiness:         { value: 22000,  percentile: 42 },
      franchises:            { value: 1800,   percentile: 35 },
      commercialRealEstate:  { value: 5e8,    percentile: 32 },
      residentialRealEstate: { value: 1.8e9,  percentile: 35 },
      industrialRealEstate:  { value: 8e8,    percentile: 55 },
      minorityOwned:         { value: 1200,   percentile: 22 },
      womenOwned:            { value: 2000,   percentile: 25 },
      communityBanking:      { value: 3e8,    percentile: 45 },
      affordableHousing:     { value: 2e7,    percentile: 38 },
      publicSpending:        { value: 4e9,    percentile: 48 },
      infrastructure:        { value: 2.5e9,  percentile: 42 },
      transit:               { value: 1.2e9,  percentile: 38 },
      mixedUse:              { value: 0,      percentile: 35 },
      vacant:                { value: 0,      percentile: 48 },
    },

    universities: [
      { name: 'Carnegie Mellon University', lat: 40.4428, lon: -79.9430, rd_spending: 1.2e9, field: 'Engineering/CS', patents: 220, gradStudents: 6500, minorityLed: 14 },
      { name: 'University of Pittsburgh',   lat: 40.4444, lon: -79.9533, rd_spending: 8e8,   field: 'Medical/Health', patents: 95,  gradStudents: 5200, minorityLed: 18 },
      { name: 'Duquesne University',        lat: 40.4367, lon: -79.9899, rd_spending: 3e7,   field: 'Life Sciences',  patents: 10,  gradStudents: 1200, minorityLed: 22 },
    ],

    ecosystemConnections: [
      { city: 'Philadelphia', lat: 39.9526, lon: -75.1652, flowType: 'capital', volume: 0,    direction: 'inbound',  dealValue: 8e7 },
      { city: 'Washington',   lat: 38.9072, lon: -77.0369, flowType: 'talent',  volume: 1800, direction: 'outbound', dealValue: 0 },
    ],

    beeCounts: {
      'Carnegie Mellon University': 85,
      'University of Pittsburgh':   40,
      'Duquesne University':        10,
    },
    treeCount: 80,  treeHealth: 0.45,
    carCount: 15,   carSpeed: 0.48,
    dustEmission: 0.2,
    planeCounts: { Philadelphia: 8 },

    landmarks: [
      { template: 'comcastTower',    gridX: 0,    gridZ: 0,   name: 'PPG Place',          height: 30, color: '#0D47A1', stat: 'corporateResearch' },
      { template: 'universityTower', gridX: -100, gridZ: 80,  name: 'CMU Robotics Tower', height: 38, color: '#00D1FF', stat: 'universityResearch' },
      { template: 'hospitalComplex', gridX: 80,   gridZ: -50, name: ' Medical Center',height: 28, color: '#E91E63', stat: 'healthcareTalent' },
      { template: 'transitHub',      gridX: -40,  gridZ: 130, name: 'Steel Plaza',        height: 14, color: '#607D8B', stat: 'transit' },
    ],
  },

  // ── DETROIT ──────────────────────────────────────────────────────────────
  detroit: {
    name: 'Detroit', state: 'MI',
    lat: 42.3314, lon: -83.0458,
    cityRadius: 550,
    focusLandmark: 'comcastTower',
    researchSpending: 9e8, dealFlow: 8e7, dealCount: 20, dealFlowYoY: -5,
    mobilityScore: 42, mobilityRating: 'Low',
    newBusinessFormationRate: 5.8, jobMobilityIndex: 35, migrationNet: -3500,
    medianIncome: 32000, incomeGrowthYoY: 0.5, laborForceParticipation: 52.0,

    stats: {
      universityResearch:    { value: 9e8,    percentile: 55 },
      corporateResearch:     { value: 1.5e9,  percentile: 62 },
      patents:               { value: 180,    percentile: 55 },
      ventureCapital:        { value: 8e7,    percentile: 15 },
      privateEquity:         { value: 3e7,    percentile: 10 },
      angelInvestment:       { value: 1.5e7,  percentile: 12 },
      bankLending:           { value: 8e8,    percentile: 28 },
      techTalent:            { value: 18000,  percentile: 32 },
      healthcareTalent:      { value: 35000,  percentile: 48 },
      graduateOutput:        { value: 4500,   percentile: 42 },
      newBusinesses:         { value: 900,    percentile: 15 },
      smallBusiness:         { value: 18000,  percentile: 35 },
      franchises:            { value: 2200,   percentile: 38 },
      commercialRealEstate:  { value: 3e8,    percentile: 22 },
      residentialRealEstate: { value: 8e8,    percentile: 18 },
      industrialRealEstate:  { value: 1.5e9,  percentile: 68 },
      minorityOwned:         { value: 2500,   percentile: 55 },
      womenOwned:            { value: 3500,   percentile: 48 },
      communityBanking:      { value: 2e8,    percentile: 35 },
      affordableHousing:     { value: 5e7,    percentile: 62 },
      publicSpending:        { value: 2.5e9,  percentile: 32 },
      infrastructure:        { value: 1.5e9,  percentile: 28 },
      transit:               { value: 5e8,    percentile: 22 },
      mixedUse:              { value: 0,      percentile: 15 },
      vacant:                { value: 0,      percentile: 85 },
    },

    universities: [
      { name: 'University of Michigan', lat: 42.2780, lon: -83.7382, rd_spending: 1.5e9, field: 'Engineering/CS', patents: 150, gradStudents: 8500, minorityLed: 12 },
      { name: 'Wayne State University', lat: 42.3585, lon: -83.0673, rd_spending: 2.5e8, field: 'Medical/Health', patents: 35,  gradStudents: 3200, minorityLed: 35 },
    ],

    ecosystemConnections: [
      { city: 'Chicago',   lat: 41.8781, lon: -87.6298, flowType: 'capital', volume: 0,    direction: 'inbound',  dealValue: 4e7 },
      { city: 'Cleveland', lat: 41.4993, lon: -81.6944, flowType: 'talent',  volume: 1200, direction: 'outbound', dealValue: 0 },
    ],

    beeCounts: {
      'University of Michigan': 45,
      'Wayne State University': 15,
    },
    treeCount: 50,  treeHealth: 0.25,
    carCount: 10,   carSpeed: 0.35,
    dustEmission: 0.05,
    planeCounts: {},

    landmarks: [
      { template: 'comcastTower', gridX: 0,   gridZ: 0,   name: 'GM Renaissance Center',  height: 35, color: '#0D47A1', stat: 'corporateResearch' },
      { template: 'transitHub',   gridX: -50, gridZ: 120, name: 'Detroit Station',         height: 12, color: '#607D8B', stat: 'transit' },
    ],
  },

  // ── AUSTIN ───────────────────────────────────────────────────────────────
  austin: {
    name: 'Austin', state: 'TX',
    lat: 30.2672, lon: -97.7431,
    cityRadius: 600,
    focusLandmark: 'financialTower',
    researchSpending: 1.2e9, dealFlow: 2.8e9, dealCount: 95, dealFlowYoY: 18,
    mobilityScore: 84, mobilityRating: 'High',
    newBusinessFormationRate: 16.5, jobMobilityIndex: 76, migrationNet: 12000,
    medianIncome: 68000, incomeGrowthYoY: 7.2, laborForceParticipation: 70.5,

    stats: {
      universityResearch:    { value: 1.2e9,  percentile: 68 },
      corporateResearch:     { value: 3.5e9,  percentile: 78 },
      patents:               { value: 380,    percentile: 80 },
      ventureCapital:        { value: 2.8e9,  percentile: 78 },
      privateEquity:         { value: 1.8e9,  percentile: 68 },
      angelInvestment:       { value: 3e8,    percentile: 72 },
      bankLending:           { value: 3.5e9,  percentile: 68 },
      techTalent:            { value: 72000,  percentile: 85 },
      healthcareTalent:      { value: 38000,  percentile: 52 },
      graduateOutput:        { value: 6500,   percentile: 58 },
      newBusinesses:         { value: 4800,   percentile: 78 },
      smallBusiness:         { value: 38000,  percentile: 68 },
      franchises:            { value: 3500,   percentile: 58 },
      commercialRealEstate:  { value: 2.5e9,  percentile: 68 },
      residentialRealEstate: { value: 5.5e9,  percentile: 75 },
      industrialRealEstate:  { value: 6e8,    percentile: 42 },
      minorityOwned:         { value: 3200,   percentile: 48 },
      womenOwned:            { value: 4800,   percentile: 52 },
      communityBanking:      { value: 6e8,    percentile: 62 },
      affordableHousing:     { value: 8e7,    percentile: 42 },
      publicSpending:        { value: 5e9,    percentile: 58 },
      infrastructure:        { value: 3.5e9,  percentile: 62 },
      transit:               { value: 2e9,    percentile: 55 },
      mixedUse:              { value: 0,      percentile: 72 },
      vacant:                { value: 0,      percentile: 12 },
    },

    universities: [
      { name: 'University of Texas at Austin', lat: 30.2849, lon: -97.7341, rd_spending: 8e8,  field: 'Engineering/CS', patents: 180, gradStudents: 7500, minorityLed: 25 },
      { name: 'St. Edwards University',        lat: 30.2280, lon: -97.7540, rd_spending: 1.5e7, field: 'Social Sciences',patents: 5,   gradStudents: 800,  minorityLed: 42 },
    ],

    ecosystemConnections: [
      { city: 'San Francisco', lat: 37.7749, lon: -122.4194, flowType: 'capital', volume: 0,    direction: 'bidirectional', dealValue: 1.2e9 },
      { city: 'Houston',       lat: 29.7604, lon: -95.3698,  flowType: 'capital', volume: 0,    direction: 'inbound',       dealValue: 5e8 },
      { city: 'Dallas',        lat: 32.7767, lon: -96.7970,  flowType: 'talent',  volume: 2800, direction: 'bidirectional', dealValue: 0 },
    ],

    beeCounts: {
      'University of Texas at Austin': 70,
      'St. Edwards University': 8,
    },
    treeCount: 220, treeHealth: 0.88,
    carCount: 55,   carSpeed: 0.76,
    dustEmission: 0.7,
    planeCounts: {},

    landmarks: [
      { template: 'comcastTower',    gridX: 0,    gridZ: 0,   name: 'Indeed Tower',         height: 38, color: '#0D47A1', stat: 'corporateResearch' },
      { template: 'financialTower',  gridX: 80,   gridZ: -30, name: 'Capital Factory',      height: 32, color: '#FF8A00', stat: 'ventureCapital' },
      { template: 'universityTower', gridX: -100, gridZ: 60,  name: 'UT Innovation Tower',  height: 30, color: '#00D1FF', stat: 'universityResearch' },
      { template: 'transitHub',      gridX: 30,   gridZ: 140, name: 'Austin Station',       height: 16, color: '#607D8B', stat: 'transit' },
    ],
  },

  // ── WASHINGTON DC ────────────────────────────────────────────────────────
  // Key is 'washington dc' but getCityData() matches 'washington' via prefix search
  'washington dc': {
    name: 'Washington DC', state: 'DC',
    lat: 38.9072, lon: -77.0369,
    cityRadius: 500,
    focusLandmark: 'transitHub',
    researchSpending: 2.5e9, dealFlow: 1.5e9, dealCount: 65, dealFlowYoY: 10,
    mobilityScore: 72, mobilityRating: 'High',
    newBusinessFormationRate: 10.5, jobMobilityIndex: 65, migrationNet: 2500,
    medianIncome: 82000, incomeGrowthYoY: 3.5, laborForceParticipation: 68.0,

    stats: {
      universityResearch:    { value: 2.5e9,  percentile: 82 },
      corporateResearch:     { value: 1.2e9,  percentile: 68 },
      patents:               { value: 220,    percentile: 65 },
      ventureCapital:        { value: 1.5e9,  percentile: 58 },
      privateEquity:         { value: 9e8,    percentile: 52 },
      angelInvestment:       { value: 1.5e8,  percentile: 55 },
      bankLending:           { value: 4e9,    percentile: 72 },
      techTalent:            { value: 65000,  percentile: 78 },
      healthcareTalent:      { value: 45000,  percentile: 62 },
      graduateOutput:        { value: 18000,  percentile: 88 },
      newBusinesses:         { value: 2800,   percentile: 52 },
      smallBusiness:         { value: 35000,  percentile: 62 },
      franchises:            { value: 2500,   percentile: 42 },
      commercialRealEstate:  { value: 2e9,    percentile: 62 },
      residentialRealEstate: { value: 6e9,    percentile: 78 },
      industrialRealEstate:  { value: 3e8,    percentile: 25 },
      minorityOwned:         { value: 4200,   percentile: 68 },
      womenOwned:            { value: 5500,   percentile: 65 },
      communityBanking:      { value: 7e8,    percentile: 68 },
      affordableHousing:     { value: 1.5e8,  percentile: 52 },
      publicSpending:        { value: 2.5e10, percentile: 98 },
      infrastructure:        { value: 8e9,    percentile: 82 },
      transit:               { value: 5e9,    percentile: 85 },
      mixedUse:              { value: 0,      percentile: 68 },
      vacant:                { value: 0,      percentile: 15 },
    },

    universities: [
      { name: 'Georgetown University',        lat: 38.9076, lon: -77.0723, rd_spending: 3.5e8, field: 'Social Sciences',patents: 25, gradStudents: 5500, minorityLed: 20 },
      { name: 'George Washington University', lat: 38.8997, lon: -77.0486, rd_spending: 2.8e8, field: 'Medical/Health', patents: 30, gradStudents: 6200, minorityLed: 22 },
      { name: 'Howard University',            lat: 38.9227, lon: -77.0194, rd_spending: 1.2e8, field: 'Medical/Health', patents: 12, gradStudents: 2800, minorityLed: 72 },
      { name: 'American University',          lat: 38.9371, lon: -77.0868, rd_spending: 8e7,   field: 'Social Sciences',patents: 8,  gradStudents: 3200, minorityLed: 28 },
    ],

    ecosystemConnections: [
      { city: 'Baltimore',    lat: 39.2904, lon: -76.6122, flowType: 'talent',  volume: 3400, direction: 'inbound',       dealValue: 0 },
      { city: 'Wilmington',   lat: 39.7391, lon: -75.5398, flowType: 'talent',  volume: 800,  direction: 'bidirectional', dealValue: 0 },
      { city: 'Philadelphia', lat: 39.9526, lon: -75.1652, flowType: 'talent',  volume: 2200, direction: 'bidirectional', dealValue: 0 },
    ],

    beeCounts: {
      'Georgetown University': 35, 'George Washington University': 30,
      'Howard University': 15, 'American University': 12,
    },
    treeCount: 180, treeHealth: 0.72,
    carCount: 40,   carSpeed: 0.65,
    dustEmission: 0.4,
    planeCounts: { Baltimore: 8, Wilmington: 5, Philadelphia: 8 },

    landmarks: [
      { template: 'comcastTower',    gridX: 0,   gridZ: 0,   name: 'Federal Core Tower',    height: 28, color: '#0D47A1', stat: 'publicSpending' },
      { template: 'universityTower', gridX: -80, gridZ: 70,  name: 'Georgetown Research',   height: 25, color: '#00D1FF', stat: 'universityResearch' },
      { template: 'universityTower', gridX: 70,  gridZ: -60, name: 'Howard Innovation Hub', height: 22, color: '#FF005C', stat: 'minorityOwned' },
      { template: 'transitHub',      gridX: 20,  gridZ: 130, name: 'Union Station',         height: 18, color: '#607D8B', stat: 'transit' },
    ],
  },

  // ── PHILADELPHIA ─────────────────────────────────────────────────────────
  philadelphia: {
    name: 'Philadelphia', state: 'PA',
    lat: 39.9526, lon: -75.1652,
    cityRadius: 550,
    focusLandmark: 'financialTower',
    researchSpending: 2.8e9, dealFlow: 9e8, dealCount: 55, dealFlowYoY: 12,
    mobilityScore: 65, mobilityRating: 'Moderate',
    newBusinessFormationRate: 9.5, jobMobilityIndex: 58, migrationNet: 800,
    medianIncome: 48000, incomeGrowthYoY: 2.8, laborForceParticipation: 60.5,

    stats: {
      universityResearch:    { value: 2.8e9,  percentile: 85 },
      corporateResearch:     { value: 8e8,    percentile: 58 },
      patents:               { value: 350,    percentile: 75 },
      ventureCapital:        { value: 9e8,    percentile: 48 },
      privateEquity:         { value: 5e8,    percentile: 42 },
      angelInvestment:       { value: 1.2e8,  percentile: 48 },
      bankLending:           { value: 2.5e9,  percentile: 58 },
      techTalent:            { value: 42000,  percentile: 62 },
      healthcareTalent:      { value: 72000,  percentile: 82 },
      graduateOutput:        { value: 15000,  percentile: 85 },
      newBusinesses:         { value: 2200,   percentile: 45 },
      smallBusiness:         { value: 30000,  percentile: 55 },
      franchises:            { value: 2600,   percentile: 44 },
      commercialRealEstate:  { value: 1.2e9,  percentile: 52 },
      residentialRealEstate: { value: 3.5e9,  percentile: 52 },
      industrialRealEstate:  { value: 7e8,    percentile: 48 },
      minorityOwned:         { value: 3500,   percentile: 52 },
      womenOwned:            { value: 4500,   percentile: 48 },
      communityBanking:      { value: 5e8,    percentile: 58 },
      affordableHousing:     { value: 8e7,    percentile: 48 },
      publicSpending:        { value: 5e9,    percentile: 55 },
      infrastructure:        { value: 3e9,    percentile: 52 },
      transit:               { value: 2.5e9,  percentile: 62 },
      mixedUse:              { value: 0,      percentile: 55 },
      vacant:                { value: 0,      percentile: 35 },
    },

    universities: [
      { name: 'University of Pennsylvania', lat: 39.9522, lon: -75.1932, rd_spending: 1.4e9, field: 'Medical/Health', patents: 280, gradStudents: 10000, minorityLed: 16 },
      { name: 'Drexel University',          lat: 39.9566, lon: -75.1899, rd_spending: 3.5e8, field: 'Engineering/CS', patents: 55,  gradStudents: 5200,  minorityLed: 22 },
      { name: 'Temple University',          lat: 39.9812, lon: -75.1553, rd_spending: 2.8e8, field: 'Medical/Health', patents: 42,  gradStudents: 6500,  minorityLed: 28 },
    ],

    ecosystemConnections: [
      { city: 'Baltimore',  lat: 39.2904, lon: -76.6122, flowType: 'capital', volume: 0,    direction: 'outbound',      dealValue: 8.5e7 },
      { city: 'Wilmington', lat: 39.7391, lon: -75.5398, flowType: 'talent',  volume: 1100, direction: 'outbound',      dealValue: 0 },
      { city: 'Washington', lat: 38.9072, lon: -77.0369, flowType: 'talent',  volume: 2200, direction: 'bidirectional', dealValue: 0 },
    ],

    beeCounts: {
      'University of Pennsylvania': 75,
      'Drexel University': 35,
      'Temple University': 30,
    },
    treeCount: 150, treeHealth: 0.62,
    carCount: 30,   carSpeed: 0.58,
    dustEmission: 0.35,
    planeCounts: { Baltimore: 6, Wilmington: 4, Washington: 8 },

    landmarks: [
      { template: 'comcastTower',    gridX: 0,    gridZ: 0,   name: 'Comcast Center',      height: 42, color: '#0D47A1', stat: 'corporateResearch' },
      { template: 'universityTower', gridX: -100, gridZ: 80,  name: 'Penn Medicine Tower', height: 35, color: '#00D1FF', stat: 'universityResearch' },
      { template: 'financialTower',  gridX: 80,   gridZ: -40, name: 'VC Row',              height: 25, color: '#FF8A00', stat: 'ventureCapital' },
      { template: 'transitHub',      gridX: -20,  gridZ: 140, name: '30th Street Station', height: 16, color: '#607D8B', stat: 'transit' },
    ],
  },

  // ── NEW YORK ─────────────────────────────────────────────────────────────
  'new york': {
    name: 'New York', state: 'NY',
    lat: 40.7128, lon: -74.0060,
    cityRadius: 900,
    focusLandmark: 'financialTower',
    researchSpending: 6.5e9, dealFlow: 22e9, dealCount: 550, dealFlowYoY: 15,
    mobilityScore: 75, mobilityRating: 'High',
    newBusinessFormationRate: 15.2, jobMobilityIndex: 70, migrationNet: 15000,
    medianIncome: 72000, incomeGrowthYoY: 5.5, laborForceParticipation: 66.0,

    stats: {
      universityResearch:    { value: 6.5e9,  percentile: 98 },
      corporateResearch:     { value: 5.5e9,  percentile: 95 },
      patents:               { value: 1500,   percentile: 99 },
      ventureCapital:        { value: 2.2e10, percentile: 99 },
      privateEquity:         { value: 1.5e10, percentile: 99 },
      angelInvestment:       { value: 3e9,    percentile: 99 },
      bankLending:           { value: 1.2e10, percentile: 98 },
      techTalent:            { value: 200000, percentile: 99 },
      healthcareTalent:      { value: 150000, percentile: 98 },
      graduateOutput:        { value: 45000,  percentile: 99 },
      newBusinesses:         { value: 15000,  percentile: 99 },
      smallBusiness:         { value: 85000,  percentile: 95 },
      franchises:            { value: 6000,   percentile: 78 },
      commercialRealEstate:  { value: 3e10,   percentile: 99 },
      residentialRealEstate: { value: 5e10,   percentile: 99 },
      industrialRealEstate:  { value: 2.5e9,  percentile: 72 },
      minorityOwned:         { value: 15000,  percentile: 85 },
      womenOwned:            { value: 22000,  percentile: 82 },
      communityBanking:      { value: 2e9,    percentile: 88 },
      affordableHousing:     { value: 1.5e9,  percentile: 68 },
      publicSpending:        { value: 3e10,   percentile: 99 },
      infrastructure:        { value: 1.5e10, percentile: 95 },
      transit:               { value: 1.2e10, percentile: 99 },
      mixedUse:              { value: 0,      percentile: 98 },
      vacant:                { value: 0,      percentile: 8 },
    },

    universities: [
      { name: 'Columbia University',  lat: 40.8075, lon: -73.9626, rd_spending: 1.5e9, field: 'Medical/Health',  patents: 380, gradStudents: 15000, minorityLed: 18 },
      { name: 'NYU',                  lat: 40.7295, lon: -73.9965, rd_spending: 1.2e9, field: 'Medical/Health',  patents: 250, gradStudents: 18000, minorityLed: 20 },
      { name: 'Cornell Tech',         lat: 40.7415, lon: -73.9540, rd_spending: 3e8,   field: 'Engineering/CS', patents: 85,  gradStudents: 2500,  minorityLed: 15 },
      { name: 'CUNY Graduate Center', lat: 40.7486, lon: -73.9837, rd_spending: 2e8,   field: 'Social Sciences',patents: 35,  gradStudents: 5000,  minorityLed: 38 },
    ],

    ecosystemConnections: [
      { city: 'Boston',        lat: 42.3601, lon: -71.0589,  flowType: 'capital', volume: 0, direction: 'bidirectional', dealValue: 2.5e9 },
      { city: 'San Francisco', lat: 37.7749, lon: -122.4194, flowType: 'capital', volume: 0, direction: 'bidirectional', dealValue: 2.8e9 },
      { city: 'Philadelphia',  lat: 39.9526, lon: -75.1652,  flowType: 'capital', volume: 0, direction: 'bidirectional', dealValue: 8e8 },
    ],

    beeCounts: {
      'Columbia University': 90, 'NYU': 80, 'Cornell Tech': 45, 'CUNY Graduate Center': 25,
    },
    treeCount: 350, treeHealth: 0.82,
    carCount: 90,   carSpeed: 0.70,
    dustEmission: 1.0,
    planeCounts: { Boston: 25, 'San Francisco': 28, Philadelphia: 12 },

    landmarks: [
      { template: 'comcastTower',    gridX: 0,    gridZ: 0,    name: 'One World Trade',         height: 52, color: '#0D47A1', stat: 'corporateResearch' },
      { template: 'financialTower',  gridX: -50,  gridZ: 30,   name: 'Wall Street District',    height: 48, color: '#FF8A00', stat: 'ventureCapital' },
      { template: 'financialTower',  gridX: 60,   gridZ: -20,  name: 'Midtown VC Hub',          height: 45, color: '#FF6D00', stat: 'privateEquity' },
      { template: 'universityTower', gridX: -120, gridZ: 100,  name: 'Columbia Research Tower', height: 38, color: '#00D1FF', stat: 'universityResearch' },
      { template: 'hospitalComplex', gridX: 100,  gridZ: 80,   name: 'NYU Langone Medical',     height: 35, color: '#E91E63', stat: 'healthcareTalent' },
      { template: 'transitHub',      gridX: -20,  gridZ: 180,  name: 'Grand Central',           height: 22, color: '#607D8B', stat: 'transit' },
    ],
  },

  // ── CHICAGO ──────────────────────────────────────────────────────────────
  chicago: {
    name: 'Chicago', state: 'IL',
    lat: 41.8781, lon: -87.6298,
    cityRadius: 750,
    focusLandmark: 'financialTower',
    researchSpending: 3.2e9, dealFlow: 3.5e9, dealCount: 140, dealFlowYoY: 10,
    mobilityScore: 68, mobilityRating: 'Moderate-High',
    newBusinessFormationRate: 11.5, jobMobilityIndex: 62, migrationNet: -2000,
    medianIncome: 58000, incomeGrowthYoY: 3.2, laborForceParticipation: 64.5,

    stats: {
      universityResearch:    { value: 3.2e9,  percentile: 88 },
      corporateResearch:     { value: 2.2e9,  percentile: 78 },
      patents:               { value: 420,    percentile: 82 },
      ventureCapital:        { value: 3.5e9,  percentile: 72 },
      privateEquity:         { value: 2.5e9,  percentile: 75 },
      angelInvestment:       { value: 3.5e8,  percentile: 68 },
      bankLending:           { value: 5e9,    percentile: 75 },
      techTalent:            { value: 65000,  percentile: 72 },
      healthcareTalent:      { value: 90000,  percentile: 85 },
      graduateOutput:        { value: 18000,  percentile: 82 },
      newBusinesses:         { value: 3500,   percentile: 62 },
      smallBusiness:         { value: 48000,  percentile: 78 },
      franchises:            { value: 4200,   percentile: 68 },
      commercialRealEstate:  { value: 3.5e9,  percentile: 78 },
      residentialRealEstate: { value: 6e9,    percentile: 72 },
      industrialRealEstate:  { value: 2e9,    percentile: 82 },
      minorityOwned:         { value: 5500,   percentile: 62 },
      womenOwned:            { value: 7500,   percentile: 58 },
      communityBanking:      { value: 9e8,    percentile: 75 },
      affordableHousing:     { value: 2e8,    percentile: 52 },
      publicSpending:        { value: 8e9,    percentile: 72 },
      infrastructure:        { value: 5e9,    percentile: 68 },
      transit:               { value: 3.5e9,  percentile: 75 },
      mixedUse:              { value: 0,      percentile: 72 },
      vacant:                { value: 0,      percentile: 28 },
    },

    universities: [
      { name: 'University of Chicago',            lat: 41.7886, lon: -87.5987, rd_spending: 8e8,  field: 'Social Sciences',patents: 120, gradStudents: 7500, minorityLed: 16 },
      { name: 'Northwestern University',          lat: 42.0559, lon: -87.6753, rd_spending: 9e8,  field: 'Medical/Health', patents: 160, gradStudents: 8500, minorityLed: 14 },
      { name: 'University of Illinois Chicago',   lat: 41.8719, lon: -87.6490, rd_spending: 4e8,  field: 'Medical/Health', patents: 65,  gradStudents: 5500, minorityLed: 32 },
      { name: 'Illinois Institute of Technology', lat: 41.8349, lon: -87.6270, rd_spending: 1.2e8, field: 'Engineering/CS',patents: 40,  gradStudents: 2800, minorityLed: 25 },
    ],

    ecosystemConnections: [
      { city: 'New York', lat: 40.7128, lon: -74.0060, flowType: 'capital', volume: 0, direction: 'bidirectional', dealValue: 1.5e9 },
      { city: 'Detroit',  lat: 42.3314, lon: -83.0458, flowType: 'capital', volume: 0, direction: 'outbound',      dealValue: 4e7 },
    ],

    beeCounts: {
      'University of Chicago': 65, 'Northwestern University': 70,
      'University of Illinois Chicago': 35, 'Illinois Institute of Technology': 20,
    },
    treeCount: 200, treeHealth: 0.68,
    carCount: 45,   carSpeed: 0.62,
    dustEmission: 0.6,
    planeCounts: { 'New York': 18, Detroit: 8 },

    landmarks: [
      { template: 'comcastTower',    gridX: 0,    gridZ: 0,    name: 'Willis Tower',           height: 48, color: '#0D47A1', stat: 'corporateResearch' },
      { template: 'financialTower',  gridX: -40,  gridZ: 50,   name: 'Chicago Mercantile',     height: 42, color: '#FF8A00', stat: 'ventureCapital' },
      { template: 'universityTower', gridX: 120,  gridZ: -80,  name: 'Northwestern Research',  height: 35, color: '#00D1FF', stat: 'universityResearch' },
      { template: 'transitHub',      gridX: 30,   gridZ: 160,  name: 'Union Station Chicago',  height: 20, color: '#607D8B', stat: 'transit' },
    ],
  },

  // ── WILMINGTON ───────────────────────────────────────────────────────────
  wilmington: {
    name: 'Wilmington', state: 'DE',
    lat: 39.7391, lon: -75.5398,
    cityRadius: 400,
    focusLandmark: 'financialTower',
    researchSpending: 4e8, dealFlow: 1.8e8, dealCount: 29, dealFlowYoY: 31,
    mobilityScore: 58, mobilityRating: 'Moderate',
    newBusinessFormationRate: 9.5, jobMobilityIndex: 55, migrationNet: 600,
    medianIncome: 44000, incomeGrowthYoY: 4.2, laborForceParticipation: 64.8,

    stats: {
      universityResearch:    { value: 4e8,   percentile: 32 },
      corporateResearch:     { value: 2e8,   percentile: 28 },
      patents:               { value: 67,    percentile: 35 },
      ventureCapital:        { value: 1.8e8, percentile: 40 },
      privateEquity:         { value: 9e7,   percentile: 35 },
      angelInvestment:       { value: 2.5e7, percentile: 28 },
      bankLending:           { value: 1.5e9, percentile: 55 },
      techTalent:            { value: 12000, percentile: 28 },
      healthcareTalent:      { value: 18000, percentile: 30 },
      graduateOutput:        { value: 3500,  percentile: 35 },
      newBusinesses:         { value: 800,   percentile: 22 },
      smallBusiness:         { value: 14000, percentile: 30 },
      franchises:            { value: 1200,  percentile: 28 },
      commercialRealEstate:  { value: 3e8,   percentile: 25 },
      residentialRealEstate: { value: 8e8,   percentile: 22 },
      industrialRealEstate:  { value: 2.5e8, percentile: 28 },
      minorityOwned:         { value: 800,   percentile: 18 },
      womenOwned:            { value: 1400,  percentile: 22 },
      communityBanking:      { value: 3.5e8, percentile: 52 },
      affordableHousing:     { value: 1.5e7, percentile: 30 },
      publicSpending:        { value: 1.2e9, percentile: 28 },
      infrastructure:        { value: 6e8,   percentile: 25 },
      transit:               { value: 3e8,   percentile: 28 },
      mixedUse:              { value: 0,     percentile: 35 },
      vacant:                { value: 0,     percentile: 40 },
    },

    universities: [
      { name: 'University of Delaware', lat: 39.6778, lon: -75.7508, rd_spending: 3.4e8, field: 'Chemistry',      patents: 58, gradStudents: 2800, minorityLed: 18 },
      { name: 'Widener University',     lat: 39.8327, lon: -75.3991, rd_spending: 6e7,   field: 'Engineering/CS', patents: 9,  gradStudents: 900,  minorityLed: 22 },
    ],

    ecosystemConnections: [
      { city: 'Philadelphia', lat: 39.9526, lon: -75.1652, flowType: 'talent',  volume: 2900, direction: 'outbound', dealValue: 0 },
      { city: 'Baltimore',    lat: 39.2904, lon: -76.6122, flowType: 'capital', volume: 0,    direction: 'inbound',  dealValue: 4.2e7 },
    ],

    beeCounts: {
      'University of Delaware': 22,
      'Widener University': 8,
    },
    treeCount: 60,  treeHealth: 0.58,
    carCount: 10,   carSpeed: 0.58,
    dustEmission: 0.20,
    planeCounts: { Philadelphia: 8, Baltimore: 5 },

    landmarks: [
      { template: 'comcastTower',   gridX: 0,   gridZ: 0,  name: 'Wilmington Trust Tower', height: 22, color: '#0D47A1', stat: 'corporateResearch' },
      { template: 'financialTower', gridX: 60,  gridZ: -30,name: 'Fintech District',       height: 20, color: '#FF8A00', stat: 'ventureCapital' },
      { template: 'transitHub',     gridX: -30, gridZ: 90, name: 'Amtrak Station',         height: 12, color: '#607D8B', stat: 'transit' },
    ],
  },
};

// ── Default fallback ──────────────────────────────────────────────────────
export const DEFAULT_CITY = SEED_CITIES.baltimore;

// ── Primary lookup ────────────────────────────────────────────────────────
// Handles 'Washington' → 'washington dc' via prefix match,
// 'San Francisco' → 'san francisco', and direct hits.
export function getCityData(cityName) {
  if (!cityName) return DEFAULT_CITY;
  const key = cityName.toLowerCase().trim();
  if (SEED_CITIES[key]) return SEED_CITIES[key];
  const keys = Object.keys(SEED_CITIES);
  const match = keys.find((k) => k.startsWith(key) || key.startsWith(k));
  return match ? SEED_CITIES[match] : DEFAULT_CITY;
}

// Backward-compatible alias used by LivingEcosystem and any existing callers.
export const getSeedCity = getCityData;

// ── Economic stat → hex color ─────────────────────────────────────────────
const STAT_COLORS = {
  universityResearch: '#00D1FF', corporateResearch: '#0091EA', patents: '#00B8D4',
  ventureCapital: '#FF8A00', privateEquity: '#FF6D00', angelInvestment: '#FFAB40',
  bankLending: '#FFD180', techTalent: '#00E676', healthcareTalent: '#69F0AE',
  graduateOutput: '#B9F6CA', newBusinesses: '#E040FB', smallBusiness: '#EA80FC',
  franchises: '#F48FB1', commercialRealEstate: '#795548', residentialRealEstate: '#8D6E63',
  industrialRealEstate: '#A1887F', minorityOwned: '#FF005C', womenOwned: '#FF4081',
  communityBanking: '#FF80AB', affordableHousing: '#F50057', publicSpending: '#607D8B',
  infrastructure: '#78909C', transit: '#90A4AE', mixedUse: '#B0BEC5', vacant: '#37474F',
};
export function getStatColor(statKey) { return STAT_COLORS[statKey] ?? '#B0BEC5'; }

// ── Percentile label ──────────────────────────────────────────────────────
export function getPercentileLabel(p) {
  if (p >= 90) return 'Exceptional';
  if (p >= 75) return 'Very High';
  if (p >= 60) return 'High';
  if (p >= 40) return 'Moderate';
  if (p >= 25) return 'Low-Moderate';
  if (p >= 10) return 'Low';
  return 'Very Low';
}
