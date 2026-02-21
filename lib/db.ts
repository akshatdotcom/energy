import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "aerocharge.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  seedIfEmpty(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      demand_limit_kw INTEGER NOT NULL,
      base_load_kw INTEGER NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chargers (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id),
      name TEXT NOT NULL,
      vendor TEXT NOT NULL,
      model TEXT NOT NULL,
      max_kw INTEGER NOT NULL,
      connector_type TEXT NOT NULL DEFAULT 'CCS',
      status TEXT NOT NULL DEFAULT 'available',
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      last_heartbeat TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id),
      name TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      vin TEXT NOT NULL,
      battery_kwh REAL NOT NULL,
      driver_name TEXT NOT NULL,
      license_plate TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id),
      charger_id TEXT NOT NULL REFERENCES chargers(id),
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
      started_at TEXT NOT NULL,
      ended_at TEXT,
      energy_kwh REAL NOT NULL DEFAULT 0,
      peak_kw REAL NOT NULL DEFAULT 0,
      demand_charge_usd REAL NOT NULL DEFAULT 0,
      demand_avoided_usd REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id),
      charger_id TEXT,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rebates (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id),
      program_name TEXT NOT NULL,
      provider TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'eligible',
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      deadline TEXT,
      applied_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seedIfEmpty(db: Database.Database) {
  const count = (db.prepare("SELECT COUNT(*) as n FROM sites").get() as { n: number }).n;
  if (count > 0) return;

  // ── SITES ────────────────────────────────────────────────────────────────
  const insertSite = db.prepare(`
    INSERT INTO sites (id, name, address, city, state, lat, lng, demand_limit_kw, base_load_kw)
    VALUES (@id, @name, @address, @city, @state, @lat, @lng, @demand_limit_kw, @base_load_kw)
  `);
  const sites = [
    { id: "site-oak", name: "Oakland Distribution Center", address: "2450 Maritime Dr", city: "Oakland", state: "CA", lat: 37.8044, lng: -122.2712, demand_limit_kw: 500, base_load_kw: 320 },
    { id: "site-sj", name: "San Jose Fleet Hub", address: "1850 Airport Blvd", city: "San Jose", state: "CA", lat: 37.3639, lng: -121.9289, demand_limit_kw: 350, base_load_kw: 210 },
    { id: "site-frem", name: "Fremont Logistics Terminal", address: "39120 Argonaut Way", city: "Fremont", state: "CA", lat: 37.5485, lng: -121.9886, demand_limit_kw: 280, base_load_kw: 160 },
  ];
  for (const s of sites) insertSite.run(s);

  // ── CHARGERS ─────────────────────────────────────────────────────────────
  const insertCharger = db.prepare(`
    INSERT INTO chargers (id, site_id, name, vendor, model, max_kw, connector_type, status, position_x, position_y, last_heartbeat)
    VALUES (@id, @site_id, @name, @vendor, @model, @max_kw, @connector_type, @status, @position_x, @position_y, @last_heartbeat)
  `);
  const now = new Date().toISOString();
  const chargers = [
    // Oakland — 8 chargers
    { id: "CH01", site_id: "site-oak", name: "Bay 1-A", vendor: "ABB", model: "Terra 184", max_kw: 180, connector_type: "CCS", status: "charging", position_x: -3.5, position_y: 2, last_heartbeat: now },
    { id: "CH02", site_id: "site-oak", name: "Bay 1-B", vendor: "ChargePoint", model: "CP6000", max_kw: 62, connector_type: "CCS", status: "charging", position_x: -1.2, position_y: 2, last_heartbeat: now },
    { id: "CH03", site_id: "site-oak", name: "Bay 2-A", vendor: "ABB", model: "Terra 184", max_kw: 180, connector_type: "CCS", status: "charging", position_x: 1.2, position_y: 2, last_heartbeat: now },
    { id: "CH04", site_id: "site-oak", name: "Bay 2-B", vendor: "EVBox", model: "Troniq 100", max_kw: 100, connector_type: "CCS", status: "throttled", position_x: 3.5, position_y: 2, last_heartbeat: now },
    { id: "CH05", site_id: "site-oak", name: "Bay 3-A", vendor: "ChargePoint", model: "CP6000", max_kw: 62, connector_type: "CCS", status: "charging", position_x: -3.5, position_y: -2, last_heartbeat: now },
    { id: "CH06", site_id: "site-oak", name: "Bay 3-B", vendor: "ABB", model: "Terra 184", max_kw: 180, connector_type: "CCS", status: "available", position_x: -1.2, position_y: -2, last_heartbeat: now },
    { id: "CH07", site_id: "site-oak", name: "Bay 4-A", vendor: "EVBox", model: "Troniq 100", max_kw: 100, connector_type: "CCS", status: "charging", position_x: 1.2, position_y: -2, last_heartbeat: now },
    { id: "CH08", site_id: "site-oak", name: "Bay 4-B", vendor: "ChargePoint", model: "CP6000", max_kw: 62, connector_type: "CCS", status: "faulted", position_x: 3.5, position_y: -2, last_heartbeat: new Date(Date.now() - 3 * 3600_000).toISOString() },
    // San Jose — 4 chargers
    { id: "CH09", site_id: "site-sj", name: "SJ Bay 1", vendor: "ABB", model: "Terra 54", max_kw: 54, connector_type: "CCS", status: "charging", position_x: -1.5, position_y: 1, last_heartbeat: now },
    { id: "CH10", site_id: "site-sj", name: "SJ Bay 2", vendor: "Blink", model: "HQ 200", max_kw: 80, connector_type: "CCS", status: "available", position_x: 0, position_y: 1, last_heartbeat: now },
    { id: "CH11", site_id: "site-sj", name: "SJ Bay 3", vendor: "Blink", model: "HQ 200", max_kw: 80, connector_type: "CCS", status: "charging", position_x: 1.5, position_y: 1, last_heartbeat: now },
    { id: "CH12", site_id: "site-sj", name: "SJ Bay 4", vendor: "ChargePoint", model: "CT4000", max_kw: 7, connector_type: "J1772", status: "charging", position_x: 0, position_y: -1, last_heartbeat: now },
    // Fremont — 3 chargers
    { id: "CH13", site_id: "site-frem", name: "FR Bay 1", vendor: "ABB", model: "Terra 54", max_kw: 54, connector_type: "CCS", status: "charging", position_x: -1, position_y: 0, last_heartbeat: now },
    { id: "CH14", site_id: "site-frem", name: "FR Bay 2", vendor: "ABB", model: "Terra 54", max_kw: 54, connector_type: "CCS", status: "available", position_x: 0, position_y: 0, last_heartbeat: now },
    { id: "CH15", site_id: "site-frem", name: "FR Bay 3", vendor: "ChargePoint", model: "CT4000", max_kw: 7, connector_type: "J1772", status: "charging", position_x: 1, position_y: 0, last_heartbeat: now },
  ];
  for (const c of chargers) insertCharger.run(c);

  // ── VEHICLES ─────────────────────────────────────────────────────────────
  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (id, site_id, name, make, model, year, vin, battery_kwh, driver_name, license_plate)
    VALUES (@id, @site_id, @name, @make, @model, @year, @vin, @battery_kwh, @driver_name, @license_plate)
  `);
  const vehicles = [
    // Oakland fleet — 10 vehicles
    { id: "EV-A01", site_id: "site-oak", name: "Van #A01", make: "Rivian", model: "EDV 500", year: 2024, vin: "7PDSGDBS5NN000001", battery_kwh: 170, driver_name: "Marcus Thompson", license_plate: "8TRK421" },
    { id: "EV-A02", site_id: "site-oak", name: "Van #A02", make: "Rivian", model: "EDV 500", year: 2024, vin: "7PDSGDBS5NN000002", battery_kwh: 170, driver_name: "Sarah Lin", license_plate: "8TRK422" },
    { id: "EV-A03", site_id: "site-oak", name: "Van #A03", make: "Ford", model: "E-Transit 350", year: 2024, vin: "1FTBW9CK5NKA00001", battery_kwh: 68, driver_name: "James Kowalski", license_plate: "8TRK423" },
    { id: "EV-A04", site_id: "site-oak", name: "Van #A04", make: "Ford", model: "E-Transit 350", year: 2023, vin: "1FTBW9CK5NKA00002", battery_kwh: 68, driver_name: "Lisa Martinez", license_plate: "8TRK424" },
    { id: "EV-A05", site_id: "site-oak", name: "Cargo #A05", make: "BrightDrop", model: "EV600", year: 2024, vin: "1GBW7G2D4N1000001", battery_kwh: 145, driver_name: "Carlos Rivera", license_plate: "8TRK425" },
    { id: "EV-A06", site_id: "site-oak", name: "Cargo #A06", make: "BrightDrop", model: "EV600", year: 2024, vin: "1GBW7G2D4N1000002", battery_kwh: 145, driver_name: "Amanda Brown", license_plate: "8TRK426" },
    { id: "EV-A07", site_id: "site-oak", name: "Truck #A07", make: "Rivian", model: "EDV 700", year: 2024, vin: "7PDSGDBS5NN000007", battery_kwh: 210, driver_name: "David Chen", license_plate: "8TRK427" },
    { id: "EV-A08", site_id: "site-oak", name: "Truck #A08", make: "Rivian", model: "EDV 700", year: 2024, vin: "7PDSGDBS5NN000008", battery_kwh: 210, driver_name: "Jennifer Wu", license_plate: "8TRK428" },
    { id: "EV-A09", site_id: "site-oak", name: "Van #A09", make: "Mercedes-Benz", model: "eSprinter 2500", year: 2024, vin: "WD3PE8CD9N5000001", battery_kwh: 113, driver_name: "Robert Johnson", license_plate: "8TRK429" },
    { id: "EV-A10", site_id: "site-oak", name: "Van #A10", make: "Mercedes-Benz", model: "eSprinter 2500", year: 2024, vin: "WD3PE8CD9N5000002", battery_kwh: 113, driver_name: "Emily Davis", license_plate: "8TRK430" },
    // San Jose — 3 vehicles
    { id: "EV-B01", site_id: "site-sj", name: "SJ Van #B01", make: "Rivian", model: "EDV 500", year: 2024, vin: "7PDSGDBS5NN000011", battery_kwh: 170, driver_name: "Wei Zhang", license_plate: "9TRK101" },
    { id: "EV-B02", site_id: "site-sj", name: "SJ Van #B02", make: "Ford", model: "E-Transit 350", year: 2024, vin: "1FTBW9CK5NKA00011", battery_kwh: 68, driver_name: "Angela Torres", license_plate: "9TRK102" },
    { id: "EV-B03", site_id: "site-sj", name: "SJ Truck #B03", make: "Rivian", model: "EDV 700", year: 2023, vin: "7PDSGDBS5NN000013", battery_kwh: 210, driver_name: "Kevin Park", license_plate: "9TRK103" },
    // Fremont — 2 vehicles
    { id: "EV-C01", site_id: "site-frem", name: "FR Van #C01", make: "Ford", model: "E-Transit 350", year: 2024, vin: "1FTBW9CK5NKA00021", battery_kwh: 68, driver_name: "Miguel Santos", license_plate: "6FRM001" },
    { id: "EV-C02", site_id: "site-frem", name: "FR Van #C02", make: "Ford", model: "E-Transit 350", year: 2024, vin: "1FTBW9CK5NKA00022", battery_kwh: 68, driver_name: "Rachel Kim", license_plate: "6FRM002" },
  ];
  for (const v of vehicles) insertVehicle.run(v);

  // ── SESSIONS (90 days of history) ────────────────────────────────────────
  const insertSession = db.prepare(`
    INSERT INTO sessions (id, site_id, charger_id, vehicle_id, started_at, ended_at, energy_kwh, peak_kw, demand_charge_usd, demand_avoided_usd, status)
    VALUES (@id, @site_id, @charger_id, @vehicle_id, @started_at, @ended_at, @energy_kwh, @peak_kw, @demand_charge_usd, @demand_avoided_usd, @status)
  `);

  const oakChargers = chargers.filter((c) => c.site_id === "site-oak" && c.id !== "CH08");
  const oakVehicles = vehicles.filter((v) => v.site_id === "site-oak");
  const sjChargers = chargers.filter((c) => c.site_id === "site-sj");
  const sjVehicles = vehicles.filter((v) => v.site_id === "site-sj");
  const frChargers = chargers.filter((c) => c.site_id === "site-frem");
  const frVehicles = vehicles.filter((v) => v.site_id === "site-frem");

  let sessionIdx = 0;

  function addSessions(siteId: string, siteChargers: typeof chargers, siteVehicles: typeof vehicles, days: number) {
    for (let d = days; d >= 1; d--) {
      const date = new Date(Date.now() - d * 86_400_000);
      const sessionsPerDay = 3 + Math.floor(Math.random() * 4);
      for (let s = 0; s < sessionsPerDay; s++) {
        const charger = siteChargers[s % siteChargers.length];
        const vehicle = siteVehicles[s % siteVehicles.length];
        const startHour = 18 + Math.floor(Math.random() * 4); // 6–10 PM
        const started = new Date(date);
        started.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);
        const durationHours = 2 + Math.random() * 5;
        const ended = new Date(started.getTime() + durationHours * 3600_000);
        const peakKw = charger.max_kw * (0.55 + Math.random() * 0.40);
        const energyKwh = peakKw * durationHours * (0.7 + Math.random() * 0.25);
        const demandCharge = Math.max(0, peakKw - 80) * 16.5 * (Math.random() < 0.15 ? 1 : 0);
        const demandAvoided = peakKw * 0.22 * 16.5;
        sessionIdx++;
        insertSession.run({
          id: `sess-${sessionIdx.toString().padStart(4, "0")}`,
          site_id: siteId,
          charger_id: charger.id,
          vehicle_id: vehicle.id,
          started_at: started.toISOString(),
          ended_at: ended.toISOString(),
          energy_kwh: Math.round(energyKwh * 10) / 10,
          peak_kw: Math.round(peakKw * 10) / 10,
          demand_charge_usd: Math.round(demandCharge * 100) / 100,
          demand_avoided_usd: Math.round(demandAvoided * 100) / 100,
          status: "completed",
        });
      }
    }
  }

  addSessions("site-oak", oakChargers, oakVehicles, 90);
  addSessions("site-sj", sjChargers, sjVehicles, 60);
  addSessions("site-frem", frChargers, frVehicles, 45);

  // Active sessions (today)
  const activeVehicles = [
    { charger_id: "CH01", vehicle_id: "EV-A01" },
    { charger_id: "CH02", vehicle_id: "EV-A02" },
    { charger_id: "CH03", vehicle_id: "EV-A05" },
    { charger_id: "CH04", vehicle_id: "EV-A07" },
    { charger_id: "CH05", vehicle_id: "EV-A03" },
    { charger_id: "CH07", vehicle_id: "EV-A09" },
  ];
  for (const av of activeVehicles) {
    sessionIdx++;
    const started = new Date(Date.now() - (2 + Math.random() * 2) * 3600_000);
    insertSession.run({
      id: `sess-${sessionIdx.toString().padStart(4, "0")}`,
      site_id: "site-oak",
      charger_id: av.charger_id,
      vehicle_id: av.vehicle_id,
      started_at: started.toISOString(),
      ended_at: null,
      energy_kwh: 0,
      peak_kw: 0,
      demand_charge_usd: 0,
      demand_avoided_usd: 0,
      status: "active",
    });
  }

  // ── EVENTS ────────────────────────────────────────────────────────────────
  const insertEvent = db.prepare(`
    INSERT INTO events (id, site_id, charger_id, event_type, severity, message, payload, created_at)
    VALUES (@id, @site_id, @charger_id, @event_type, @severity, @message, @payload, @created_at)
  `);
  const events = [
    { id: "evt-001", site_id: "site-oak", charger_id: "CH08", event_type: "fault", severity: "critical", message: "CH08 (Bay 4-B) — GFCI trip detected. Unit offline, service required.", payload: JSON.stringify({ fault_code: "GFCI_TRIP", amps: 0 }), created_at: new Date(Date.now() - 66 * 3600_000).toISOString() },
    { id: "evt-002", site_id: "site-oak", charger_id: "CH04", event_type: "throttle", severity: "info", message: "AI throttled CH04 from 100 kW → 38 kW — building HVAC spike pushed load to 487 kW", payload: JSON.stringify({ before_kw: 100, after_kw: 38, trigger: "demand_limit_proximity" }), created_at: new Date(Date.now() - 1.5 * 3600_000).toISOString() },
    { id: "evt-003", site_id: "site-oak", charger_id: null, event_type: "demand_spike", severity: "warning", message: "Site load reached 491 kW — 9 kW from demand penalty threshold. AI rebalanced fleet.", payload: JSON.stringify({ load_kw: 491, limit_kw: 500, avoided: true }), created_at: new Date(Date.now() - 26 * 3600_000).toISOString() },
    { id: "evt-004", site_id: "site-oak", charger_id: "CH02", event_type: "anomaly", severity: "warning", message: "CH02 (Bay 1-B) charging 22% below rated capacity — possible cable degradation on EV-A02", payload: JSON.stringify({ expected_kw: 62, actual_kw: 48, degradation_pct: 22 }), created_at: new Date(Date.now() - 38 * 3600_000).toISOString() },
    { id: "evt-005", site_id: "site-oak", charger_id: null, event_type: "optimization", severity: "success", message: "AI pre-shifted 340 kWh to off-peak window (midnight–6 AM) — estimated savings $126", payload: JSON.stringify({ shifted_kwh: 340, savings_usd: 126, window: "midnight-6am" }), created_at: new Date(Date.now() - 48 * 3600_000).toISOString() },
    { id: "evt-006", site_id: "site-oak", charger_id: null, event_type: "demand_response", severity: "info", message: "PG&E demand response event: reduced fleet charging by 120 kW for 45 min — $58 credit earned", payload: JSON.stringify({ curtailed_kw: 120, duration_min: 45, credit_usd: 58 }), created_at: new Date(Date.now() - 5 * 24 * 3600_000).toISOString() },
    { id: "evt-007", site_id: "site-oak", charger_id: null, event_type: "optimization", severity: "success", message: "All 6 active vehicles fully charged 18 min before departure window — zero stranded vehicles", payload: JSON.stringify({ vehicles_ready: 6, minutes_early: 18 }), created_at: new Date(Date.now() - 24 * 3600_000).toISOString() },
    { id: "evt-008", site_id: "site-sj", charger_id: "CH10", event_type: "anomaly", severity: "info", message: "CH10 idle for 4+ hours during charging window — vehicle not plugged in", payload: JSON.stringify({ idle_hours: 4.2, expected_vehicle: "EV-B02" }), created_at: new Date(Date.now() - 6 * 3600_000).toISOString() },
  ];
  for (const e of events) insertEvent.run(e);

  // ── REBATES ───────────────────────────────────────────────────────────────
  const insertRebate = db.prepare(`
    INSERT INTO rebates (id, site_id, program_name, provider, amount_usd, status, type, description, deadline, applied_at)
    VALUES (@id, @site_id, @program_name, @provider, @amount_usd, @status, @type, @description, @deadline, @applied_at)
  `);
  const rebates = [
    { id: "reb-001", site_id: "site-oak", program_name: "PG&E Smart EV Charging Program", provider: "Pacific Gas & Electric", amount_usd: 4000, status: "claimed", type: "utility", description: "$500 per enrolled charger/year for demand management participation. 8 chargers enrolled.", deadline: "2026-12-31", applied_at: "2025-03-15" },
    { id: "reb-002", site_id: "site-oak", program_name: "California HVIP", provider: "CARB", amount_usd: 75000, status: "claimed", type: "vehicle", description: "Heavy-Duty ZEV Purchase Incentive — up to $8,500 per qualifying commercial vehicle. 10 vehicles.", deadline: "2025-09-30", applied_at: "2024-11-20" },
    { id: "reb-003", site_id: "site-oak", program_name: "BAAQMD Clean Air Funds", provider: "Bay Area Air Quality Management District", amount_usd: 25000, status: "pending", type: "infrastructure", description: "Grant for Level 3 EVSE installation at commercial fleet depots in the Bay Area.", deadline: "2026-06-30", applied_at: null },
    { id: "reb-004", site_id: "site-oak", program_name: "LCFS Credits (Ongoing)", provider: "CARB", amount_usd: 18400, status: "active", type: "carbon", description: "Low Carbon Fuel Standard credits generated monthly from fleet electrification. ~$1,533/mo.", deadline: null, applied_at: "2024-09-01" },
    { id: "reb-005", site_id: "site-oak", program_name: "PG&E EV Fleet Rate BEV-3", provider: "Pacific Gas & Electric", amount_usd: 32000, status: "active", type: "rate", description: "Specialized EV fleet TOU rate — estimated $32,000/year savings vs Standard A-10 commercial rate.", deadline: null, applied_at: "2024-07-01" },
    { id: "reb-006", site_id: "site-sj", program_name: "SCE Charge Ready Transport", provider: "Southern California Edison", amount_usd: 15000, status: "eligible", type: "infrastructure", description: "Infrastructure support for fleet depot charging up to $5,000 per port. 3 ports eligible.", deadline: "2026-09-15", applied_at: null },
    { id: "reb-007", site_id: "site-frem", program_name: "Alameda CTC EV Infrastructure Grant", provider: "Alameda County Transportation Commission", amount_usd: 8500, status: "eligible", type: "infrastructure", description: "Grant for Level 2 EVSE at commercial freight facilities in Alameda County.", deadline: "2026-04-30", applied_at: null },
  ];
  for (const r of rebates) insertRebate.run(r);
}

// ── Query helpers ──────────────────────────────────────────────────────────────

export function getAllSites() {
  return getDb().prepare("SELECT * FROM sites ORDER BY name").all() as Site[];
}

export function getSite(id: string) {
  return getDb().prepare("SELECT * FROM sites WHERE id = ?").get(id) as Site | undefined;
}

export function getChargersBySite(siteId: string) {
  return getDb().prepare("SELECT * FROM chargers WHERE site_id = ? ORDER BY name").all(siteId) as Charger[];
}

export function getAllChargers() {
  return getDb()
    .prepare(`SELECT c.*, s.name as site_name, s.city FROM chargers c JOIN sites s ON c.site_id = s.id ORDER BY c.site_id, c.name`)
    .all() as (Charger & { site_name: string; city: string })[];
}

export function getVehiclesBySite(siteId: string) {
  return getDb().prepare("SELECT * FROM vehicles WHERE site_id = ? ORDER BY name").all(siteId) as Vehicle[];
}

export function getAllVehicles() {
  return getDb()
    .prepare(`SELECT v.*, s.name as site_name, s.city FROM vehicles v JOIN sites s ON v.site_id = s.id ORDER BY v.site_id, v.name`)
    .all() as (Vehicle & { site_name: string; city: string })[];
}

export function getRecentEvents(limit = 20) {
  return getDb()
    .prepare(`SELECT e.*, s.name as site_name FROM events e JOIN sites s ON e.site_id = s.id ORDER BY e.created_at DESC LIMIT ?`)
    .all(limit) as (Event & { site_name: string })[];
}

export function getEventsBySite(siteId: string, limit = 30) {
  return getDb()
    .prepare(`SELECT * FROM events WHERE site_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(siteId, limit) as Event[];
}

export function getRebates(siteId?: string) {
  if (siteId) {
    return getDb().prepare("SELECT * FROM rebates WHERE site_id = ? ORDER BY amount_usd DESC").all(siteId) as Rebate[];
  }
  return getDb()
    .prepare(`SELECT r.*, s.name as site_name FROM rebates r JOIN sites s ON r.site_id = s.id ORDER BY r.amount_usd DESC`)
    .all() as (Rebate & { site_name: string })[];
}

export function getSessionStats(siteId?: string) {
  const where = siteId ? "WHERE site_id = ?" : "";
  const args = siteId ? [siteId] : [];
  return getDb()
    .prepare(
      `SELECT
        COUNT(*) as total_sessions,
        ROUND(SUM(energy_kwh), 1) as total_energy_kwh,
        ROUND(SUM(demand_avoided_usd), 0) as total_demand_avoided_usd,
        ROUND(SUM(demand_charge_usd), 0) as total_demand_charges_usd,
        ROUND(AVG(peak_kw), 1) as avg_peak_kw
      FROM sessions ${where}`
    )
    .get(...args) as SessionStats;
}

export function getDailyEnergy(days = 30, siteId = "site-oak") {
  return getDb()
    .prepare(
      `SELECT
        DATE(started_at) as date,
        ROUND(SUM(energy_kwh), 1) as energy_kwh,
        ROUND(SUM(demand_avoided_usd), 0) as savings_usd,
        COUNT(*) as sessions
      FROM sessions
      WHERE site_id = ? AND started_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(started_at)
      ORDER BY date`
    )
    .all(siteId, days) as DailyEnergyStat[];
}

export function insertEvent(event: {
  site_id: string;
  charger_id?: string;
  event_type: string;
  severity: string;
  message: string;
  payload?: object;
}) {
  const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  getDb()
    .prepare(
      `INSERT INTO events (id, site_id, charger_id, event_type, severity, message, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, event.site_id, event.charger_id ?? null, event.event_type, event.severity, event.message, event.payload ? JSON.stringify(event.payload) : null);
  return id;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type Site = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  demand_limit_kw: number;
  base_load_kw: number;
  timezone: string;
  created_at: string;
};

export type Charger = {
  id: string;
  site_id: string;
  name: string;
  vendor: string;
  model: string;
  max_kw: number;
  connector_type: string;
  status: string;
  position_x: number;
  position_y: number;
  last_heartbeat: string | null;
  created_at: string;
};

export type Vehicle = {
  id: string;
  site_id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  battery_kwh: number;
  driver_name: string;
  license_plate: string;
  created_at: string;
};

export type Event = {
  id: string;
  site_id: string;
  charger_id: string | null;
  event_type: string;
  severity: string;
  message: string;
  payload: string | null;
  created_at: string;
};

export type Rebate = {
  id: string;
  site_id: string;
  program_name: string;
  provider: string;
  amount_usd: number;
  status: string;
  type: string;
  description: string;
  deadline: string | null;
  applied_at: string | null;
  created_at: string;
};

export type SessionStats = {
  total_sessions: number;
  total_energy_kwh: number;
  total_demand_avoided_usd: number;
  total_demand_charges_usd: number;
  avg_peak_kw: number;
};

export type DailyEnergyStat = {
  date: string;
  energy_kwh: number;
  savings_usd: number;
  sessions: number;
};
