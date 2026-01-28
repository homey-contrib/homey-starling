# Starling Home Hub - Implementation Plan

## Executive Summary

This plan details the implementation of the Starling Home Hub Homey app as specified in `SPECIFICATION.md`. The project will be built in TypeScript with full CI/CD, targeting Homey App Store release.

**Key Decisions:**
- Full implementation of all 23 device categories in v1.0
- TypeScript with source in `/src`, compiled to root
- WebRTC streaming deferred to v1.1 (snapshots and events in v1.0)
- Full CI/CD with Jest and GitHub Actions
- Vanilla HTML/JS for settings UI
- Homey App Store submission

---

## Phase 0: Project Foundation

### 0.1 TypeScript Setup

**Tasks:**
1. Initialize TypeScript configuration
   - Create `tsconfig.json` with target ES2020, module CommonJS
   - Configure `outDir` to compile to project root
   - Set up path aliases for cleaner imports

2. Create source directory structure:
   ```
   src/
   ├── app.ts                    # Main app entry
   ├── lib/
   │   ├── api/                  # Starling API client
   │   │   ├── StarlingClient.ts
   │   │   ├── types.ts          # API response types
   │   │   └── errors.ts         # Custom error classes
   │   ├── hub/
   │   │   ├── HubManager.ts     # Hub connection manager
   │   │   ├── HubConnection.ts  # Single hub connection
   │   │   └── Poller.ts         # Polling scheduler
   │   ├── utils/
   │   │   ├── RateLimiter.ts
   │   │   ├── Logger.ts
   │   │   └── i18n.ts
   │   └── capabilities/         # Custom capability definitions
   ├── drivers/                  # Device drivers (one per category)
   └── settings/                 # Settings page assets
   ```

3. Update `package.json`:
   - Add TypeScript and type dependencies
   - Add build scripts: `build`, `build:watch`, `clean`
   - Add `prepublish` script for Homey

**Deliverables:**
- [ ] `tsconfig.json` configured
- [ ] Source directory structure created
- [ ] Build scripts working
- [ ] Existing `app.js` migrated to `src/app.ts`

### 0.2 CI/CD Setup

**Tasks:**
1. Configure Jest for TypeScript
   - Install jest, ts-jest, @types/jest
   - Create `jest.config.js`
   - Set up test directory structure mirroring `src/`

2. Create GitHub Actions workflows:
   - `.github/workflows/ci.yml`:
     - Trigger on push and PR to main/master
     - Run lint, type-check, and tests
     - Node versions: 18, 20
   - `.github/workflows/release.yml`:
     - Trigger on version tags
     - Build and validate app

3. Configure ESLint for TypeScript:
   - Update `.eslintrc.json` to extend TypeScript rules
   - Add lint-staged and husky for pre-commit hooks

**Deliverables:**
- [ ] Jest configuration working
- [ ] GitHub Actions CI pipeline
- [ ] Pre-commit hooks for lint and type-check
- [ ] Test coverage reporting

### 0.3 Homey Compose Structure

**Tasks:**
1. Define custom capabilities in `.homeycompose/capabilities/`:
   - `hvac_state.json` (off, heating, cooling)
   - `home_away_mode.json` (home, away)
   - `vacuum_state.json` (cleaning, docked, returning, paused, error)
   - `thermostat_preset.json` (eco, sleep, comfort, custom)

2. Prepare flow card templates in `.homeycompose/flow/`:
   - Create trigger/condition/action placeholder files
   - Define common argument types (device selectors, etc.)

3. Set up localization structure:
   - Create comprehensive `locales/en.json` with all strings
   - Establish naming conventions for i18n keys

**Deliverables:**
- [ ] Custom capabilities defined
- [ ] Flow card structure prepared
- [ ] Localization file with initial strings
- [ ] App icon and images (small, large, xlarge)

---

## Phase 1: Core Infrastructure

### 1.1 Starling API Client

**Tasks:**
1. Implement `StarlingClient` class:
   ```typescript
   class StarlingClient {
     constructor(host: string, port: number, apiKey: string, useHttps: boolean)

     // Status & Discovery
     getStatus(): Promise<StatusResponse>
     getDevices(): Promise<Device[]>
     getDevice(id: string): Promise<Device>

     // Device Control
     setDeviceProperty(id: string, property: string, value: any): Promise<void>

     // Camera
     getSnapshot(id: string): Promise<Buffer>

     // Future: WebRTC methods (v1.1)
   }
   ```

2. Define TypeScript types for all API responses:
   - Device types with discriminated unions by `category`
   - Property types for each device category
   - Error response types

3. Implement error handling:
   - Custom error classes (`StarlingApiError`, `StarlingConnectionError`)
   - Map API error codes to user-friendly messages
   - Retry logic for transient failures

4. Implement rate limiting:
   - `RateLimiter` class for snapshot (1/10s) and write (1/s) limits
   - Queue with automatic delay when limit exceeded

**Deliverables:**
- [ ] `StarlingClient` with all read operations
- [ ] `StarlingClient` with write operations
- [ ] Complete TypeScript types for API
- [ ] Rate limiter implementation
- [ ] Unit tests for API client (mocked responses)

### 1.2 Hub Manager

**Tasks:**
1. Implement `HubConnection` class:
   - Wraps `StarlingClient` for a single hub
   - Tracks connection state (connected, disconnected, connecting)
   - Implements grace period logic (30-60s retry before marking offline)
   - Exponential backoff for retries

2. Implement `HubManager` singleton:
   ```typescript
   class HubManager {
     // Lifecycle
     initialize(): Promise<void>    // Staggered connect to all hubs
     shutdown(): Promise<void>

     // Hub CRUD
     addHub(config: HubConfig): Promise<Hub>
     updateHub(id: string, config: Partial<HubConfig>): Promise<Hub>
     removeHub(id: string): Promise<void>

     // Device routing
     getDevicesForHub(hubId: string): Promise<Device[]>
     getHubForDevice(deviceId: string): HubConnection

     // Events
     on('hubOnline', callback)
     on('hubOffline', callback)
     on('deviceAdded', callback)
     on('deviceRemoved', callback)
   }
   ```

3. Implement polling scheduler:
   - Configurable interval per hub (default 10-15s)
   - Efficient batching of device state updates
   - Event emission for state changes
   - Manual refresh trigger

4. Implement hub discovery:
   - mDNS/Bonjour scanning for Starling hubs
   - Manual IP entry fallback
   - Protocol auto-detection (HTTP vs HTTPS)

**Deliverables:**
- [ ] `HubConnection` with retry/grace period logic
- [ ] `HubManager` with full hub lifecycle
- [ ] Polling scheduler with configurable intervals
- [ ] mDNS discovery implementation
- [ ] Unit tests for hub manager

### 1.3 App Entry Point

**Tasks:**
1. Migrate `app.ts` to use `HubManager`:
   - Initialize hub manager on `onInit()`
   - Load saved hub configurations from settings
   - Start staggered connection to hubs
   - Register app-level flow cards

2. Implement settings storage:
   - Hub configurations (encrypted API keys)
   - User preferences (poll interval, debug mode)
   - Diagnostic data (error history)

3. Implement debug logging:
   - Toggle via settings
   - Structured log format
   - Log rotation/limits

**Deliverables:**
- [ ] Main app initialization flow
- [ ] Settings storage layer
- [ ] Debug logging system
- [ ] App-level flow cards (refresh, home/away)

---

## Phase 2: Device Drivers

### 2.1 Base Driver Architecture

**Tasks:**
1. Create abstract `StarlingDriver` base class:
   ```typescript
   abstract class StarlingDriver extends Homey.Driver {
     abstract getDeviceCategory(): string
     abstract mapCapabilities(device: StarlingDevice): CapabilityMap

     async onPairListDevices(): Promise<PairingDevice[]>
     // Shared pairing logic
   }
   ```

2. Create abstract `StarlingDevice` base class:
   ```typescript
   abstract class StarlingDevice extends Homey.Device {
     protected hubConnection: HubConnection
     protected starlingId: string

     async onInit(): Promise<void>
     async updateState(state: DeviceState): Promise<void>

     // Optimistic update with rollback
     protected async setPropertyOptimistic(
       property: string,
       value: any,
       capability: string
     ): Promise<void>
   }
   ```

3. Implement pairing flow UI:
   - Hub selection (if multiple)
   - Category filter or "All devices"
   - Individual device selection
   - Zone suggestion interface

**Deliverables:**
- [ ] `StarlingDriver` base class
- [ ] `StarlingDevice` base class
- [ ] Pairing flow HTML/JS
- [ ] Shared capability mapping utilities

### 2.2 Priority Device Drivers (Your Devices)

Implement drivers for devices you own first to enable real testing:

#### 2.2.1 Camera Driver (`drivers/camera/`)

**Tasks:**
1. Implement driver with capabilities:
   - `alarm_motion`, `alarm_generic` (person, animal, vehicle)
   - Custom capabilities for face detection
   - Snapshot image capability

2. Implement detection event handling:
   - Motion, person, face, animal, vehicle, doorbell, package
   - Match Starling state exactly (no artificial sustain)
   - Dynamic flow triggers for recognized faces

3. Implement snapshot capture:
   - Event-triggered auto-capture
   - Rate limit compliance (1/10s)
   - Snapshot storage and retrieval

4. Create flow cards:
   - Triggers: All detection events
   - Conditions: Motion active, etc.
   - Actions: Take snapshot, quiet time toggle

**Deliverables:**
- [ ] Camera driver implementation
- [ ] Detection event handling
- [ ] Snapshot system (without WebRTC)
- [ ] Per-face dynamic triggers
- [ ] Flow cards for cameras

#### 2.2.2 Smoke/CO Detector Driver (`drivers/smoke-co/`)

**Tasks:**
1. Implement driver with capabilities:
   - `alarm_smoke`, `alarm_co`
   - `alarm_battery`, `measure_battery`
   - Online/offline status

2. Create flow cards:
   - Triggers: Smoke detected, CO detected, battery low
   - Conditions: Alarm active, battery state

**Deliverables:**
- [ ] Smoke/CO driver implementation
- [ ] Alarm capabilities
- [ ] Flow cards

#### 2.2.3 Lock Driver (`drivers/lock/`)

**Tasks:**
1. Implement driver with capabilities:
   - `locked` (read/write)
   - `alarm_generic` for jammed state

2. Create flow cards:
   - Triggers: Lock state changed, lock jammed
   - Conditions: Is locked/unlocked
   - Actions: Lock, unlock

**Deliverables:**
- [ ] Lock driver implementation
- [ ] Jammed alarm handling
- [ ] Flow cards

#### 2.2.4 Light Driver (`drivers/light/`)

**Tasks:**
1. Implement driver with capabilities:
   - `onoff`, `dim`
   - `light_hue`, `light_saturation`, `light_temperature`
   - Unified color/temp mode switching

2. Implement color space mapping:
   - Starling HSV → Homey capabilities
   - Mired → light_temperature

3. Create flow cards:
   - Standard Homey light cards (built-in)
   - Additional: Set color temperature

**Deliverables:**
- [ ] Light driver implementation
- [ ] HSV and color temp handling
- [ ] Mode priority switching

#### 2.2.5 Sensor Driver (`drivers/sensor/`)

**Tasks:**
1. Implement multi-type sensor driver:
   - Detect sensor type from properties
   - Dynamic capability assignment based on type
   - Temperature, humidity, motion, water, air quality

2. Create flow cards:
   - Triggers: Threshold crossed, motion detected, leak detected
   - Conditions: Temperature/humidity ranges

**Deliverables:**
- [ ] Multi-type sensor driver
- [ ] Dynamic capability assignment
- [ ] Flow cards

#### 2.2.6 Garage Driver (`drivers/garage/`)

**Tasks:**
1. Implement driver with capabilities:
   - `garagedoor_closed`
   - `alarm_generic` for obstruction

2. Create flow cards:
   - Triggers: Door opened/closed, obstruction detected
   - Conditions: Door state
   - Actions: Open, close

**Deliverables:**
- [ ] Garage driver implementation
- [ ] Obstruction alarm
- [ ] Flow cards

#### 2.2.7 Thermostat Driver (`drivers/thermostat/`)

**Tasks:**
1. Implement driver with full capabilities:
   - `measure_temperature`, `target_temperature`
   - `thermostat_mode` (off, heat, cool, heat-cool)
   - `measure_humidity`, `target_humidity`
   - Custom `hvac_state`, `thermostat_preset`

2. Implement preset switching:
   - Eco, Sleep, Comfort, custom presets
   - Flow actions for preset selection

3. Implement temperature sensor selection (if multiple)

4. Create flow cards:
   - Triggers: Temperature changed, mode changed, state changed
   - Conditions: Mode is, is heating/cooling
   - Actions: Set temp, set mode, set preset, select sensor

**Deliverables:**
- [ ] Thermostat driver with full parity
- [ ] Preset handling
- [ ] Sensor selection
- [ ] Comprehensive flow cards

### 2.3 Remaining Device Drivers

Implement remaining device categories:

| Driver | Capabilities | Priority |
|--------|-------------|----------|
| `switch` | onoff | Simple |
| `outlet` | onoff, measure_power | Simple |
| `fan` | onoff, dim, fan_speed | Medium |
| `diffuser` | onoff, dim | Simple |
| `valve` | onoff, duration | Medium |
| `kettle` | onoff, measure_temperature, target_temperature | Medium |
| `heater_cooler` | onoff, target_temperature, thermostat_mode | Medium |
| `humidifier_dehumidifier` | onoff, dim, measure_humidity, target_humidity | Medium |
| `purifier` | onoff, dim, measure_pm25 | Medium |
| `robot` | onoff, vacuumcleaner_state, measure_battery | Complex |
| `open_close` | windowcoverings_state, windowcoverings_set | Medium |
| `home_away_control` | home_away_mode | Simple |

**Tasks per driver:**
1. Implement driver class extending `StarlingDriver`
2. Implement device class extending `StarlingDevice`
3. Map Starling properties to Homey capabilities
4. Define driver in `.homeycompose/drivers/<id>/`
5. Create category-specific flow cards
6. Add localization strings
7. Write unit tests

**Deliverables:**
- [ ] All 23 device drivers implemented
- [ ] Complete capability mappings
- [ ] All flow cards defined
- [ ] Unit tests for each driver

---

## Phase 3: Settings & UI

### 3.1 Settings Page Implementation

**Tasks:**
1. Create main settings HTML page:
   - Hub list with status indicators
   - Add Hub button
   - Global settings section
   - Diagnostics link

2. Implement hub management UI:
   - Add Hub flow (discovery or manual)
   - Edit Hub modal
   - Remove Hub confirmation with device options
   - Permission display

3. Implement diagnostics page:
   - Connection status per hub
   - Last poll timestamps
   - Error history
   - Debug toggle
   - Export logs button

4. Style consistently with Homey design language

**Deliverables:**
- [ ] Main settings page
- [ ] Add/Edit/Remove hub flows
- [ ] Diagnostics page
- [ ] Responsive styling

### 3.2 Pairing Flow UI

**Tasks:**
1. Create hub selection page (for multi-hub)
2. Create category filter interface
3. Create device selection list with checkboxes
4. Create zone suggestion interface
5. Create confirmation/summary page

**Deliverables:**
- [ ] Complete pairing flow UI
- [ ] Zone suggestion integration
- [ ] Device naming conflict handling

---

## Phase 4: Flow Cards & Automation

### 4.1 Flow Card Implementation

**Tasks:**
1. Define all trigger cards in `.homeycompose/flow/triggers/`
2. Define all condition cards in `.homeycompose/flow/conditions/`
3. Define all action cards in `.homeycompose/flow/actions/`
4. Implement flow card handlers in drivers

**Key Flow Cards:**

| Type | Card | Tokens/Arguments |
|------|------|------------------|
| Trigger | Motion detected | device, zone |
| Trigger | Person detected | device |
| Trigger | Face detected | device, face_name |
| Trigger | Doorbell pushed | device |
| Trigger | Package delivered | device |
| Trigger | Lock jammed | device |
| Trigger | Hub offline | hub_name |
| Trigger | Command failed | device, command, error |
| Condition | Device is on/off | device |
| Condition | Thermostat mode is | device, mode |
| Condition | Hub is online | hub |
| Action | Set thermostat preset | device, preset |
| Action | Take snapshot | device |
| Action | Refresh devices | hub (optional) |
| Action | Set home/away | mode |

5. Implement dynamic face trigger registration

**Deliverables:**
- [ ] All trigger flow cards
- [ ] All condition flow cards
- [ ] All action flow cards
- [ ] Dynamic flow card registration
- [ ] Flow card tests

### 4.2 System Flow Cards

**Tasks:**
1. Implement app-level triggers:
   - Hub online/offline
   - Command failed

2. Implement app-level actions:
   - Refresh all devices
   - Set Home/Away mode (when no virtual device)

**Deliverables:**
- [ ] System triggers working
- [ ] System actions working

---

## Phase 5: Error Handling & Polish

### 5.1 Error Handling

**Tasks:**
1. Implement command failure flow:
   - Optimistic update
   - Verification on poll
   - Rollback if mismatch
   - Notification + timeline + trigger

2. Implement user notifications:
   - Error notification formatting
   - Timeline entries
   - Localized messages

3. Implement hub offline handling:
   - Grace period (30-60s)
   - Device unavailable marking
   - Auto-recovery on reconnect

**Deliverables:**
- [ ] Optimistic UI with rollback
- [ ] Error notifications
- [ ] Grace period handling
- [ ] Auto-recovery logic

### 5.2 Permission Handling

**Tasks:**
1. Implement graceful degradation:
   - Detect available permissions on connect
   - Disable unavailable capabilities
   - Show appropriate UI messages

2. Implement permission change handling:
   - Re-sync on API key change
   - Update device capabilities dynamically

**Deliverables:**
- [ ] Permission detection
- [ ] Capability disabling
- [ ] Permission change handling

### 5.3 Localization

**Tasks:**
1. Complete all English strings
2. Review and refine string quality
3. Prepare for future translations

**Deliverables:**
- [ ] Complete `locales/en.json`
- [ ] All strings externalized
- [ ] No hardcoded user-facing text

---

## Phase 6: Testing & Quality

### 6.1 Unit Testing

**Tasks:**
1. API client tests (mocked HTTP)
2. Hub manager tests
3. Driver logic tests
4. Rate limiter tests
5. Capability mapping tests

**Target:** 80%+ code coverage on core logic

**Deliverables:**
- [ ] Comprehensive unit test suite
- [ ] Code coverage reporting
- [ ] All tests passing in CI

### 6.2 Integration Testing

**Tasks:**
1. Create test fixtures for Starling API responses
2. Test device pairing flow
3. Test state synchronization
4. Test error scenarios

**Deliverables:**
- [ ] Integration test suite
- [ ] Test fixtures

### 6.3 Manual Testing

**Tasks:**
1. Test with real Starling hub(s)
2. Test all owned device types
3. Test multi-hub scenarios (if applicable)
4. Test Homey flows end-to-end
5. Test settings UI in browser and Homey app

**Deliverables:**
- [ ] Manual test checklist
- [ ] Bug fixes from testing
- [ ] Performance validation

---

## Phase 7: App Store Preparation

### 7.1 Assets & Branding

**Tasks:**
1. Create/finalize app icon (SVG)
2. Create promotional images:
   - small.png (250x175)
   - large.png (500x350)
   - xlarge.png (1000x700)
3. Write app store description
4. Create screenshots for store listing

**Deliverables:**
- [ ] Finalized app icon
- [ ] Promotional images
- [ ] Store description
- [ ] Screenshots

### 7.2 Documentation

**Tasks:**
1. Update README.md with:
   - Features overview
   - Setup instructions
   - Configuration guide
   - Troubleshooting

2. Create CHANGELOG.md

3. Verify CONTRIBUTING.md and LICENSE

**Deliverables:**
- [ ] Comprehensive README
- [ ] CHANGELOG
- [ ] Complete documentation

### 7.3 Validation & Submission

**Tasks:**
1. Run `homey app validate`
2. Fix any validation errors
3. Test install via `homey app install`
4. Submit to Homey App Store
5. Address review feedback

**Deliverables:**
- [ ] Validation passing
- [ ] App store submission
- [ ] Review completion

---

## Phase 8: Post-Launch (v1.1+)

### 8.1 WebRTC Streaming (v1.1)

**Tasks:**
1. Implement WebRTC signaling
2. Implement stream initiation/extension/termination
3. Handle local vs cloud streaming
4. Implement talkback (two-way audio)
5. Create streaming UI (if applicable in Homey)

**Deliverables:**
- [ ] Live video streaming
- [ ] Talkback support
- [ ] Stream management

### 8.2 Future Enhancements

- Activity zone support
- Local streaming preference
- Thermostat scheduling
- Energy monitoring aggregation
- Dashboard widgets

---

## Dependencies & Prerequisites

### Required for Development

- Node.js 18+ (LTS)
- npm 9+
- Homey CLI (`npm install -g homey`)
- TypeScript 5+
- Git

### Required for Testing

- Starling Home Hub with firmware 2024.43+
- At least one connected device per category (ideal)
- Homey Pro (2019 or 2023)

### API Keys Needed

- Starling Developer Connect API key (Read+Write+Camera recommended)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Device categories without test devices | Medium | Implement based on API docs, defer testing to beta users |
| WebRTC complexity | High | Deferred to v1.1, research thoroughly before implementing |
| Homey App Store rejection | Medium | Follow guidelines strictly, validate early |
| API changes in Starling | Low | Version checking, graceful degradation |
| Performance with many devices | Medium | Optimize polling, test with large device counts |

---

## Success Criteria

### v1.0 Release

- [ ] All 23 device categories implemented
- [ ] Multi-hub support working
- [ ] All flow cards functional
- [ ] Settings UI complete
- [ ] Snapshots and detection events working for cameras
- [ ] CI pipeline green
- [ ] 80%+ test coverage on core logic
- [ ] App store validation passing
- [ ] Tested with all owned device types

### v1.1 Release

- [ ] WebRTC streaming functional
- [ ] Talkback support
- [ ] Any bugs from v1.0 fixed
- [ ] Community feedback addressed

---

## Estimated Effort Breakdown

| Phase | Description | Relative Effort |
|-------|-------------|-----------------|
| Phase 0 | Project Foundation | 10% |
| Phase 1 | Core Infrastructure | 20% |
| Phase 2 | Device Drivers | 30% |
| Phase 3 | Settings & UI | 10% |
| Phase 4 | Flow Cards | 10% |
| Phase 5 | Error Handling & Polish | 10% |
| Phase 6 | Testing & Quality | 5% |
| Phase 7 | App Store Preparation | 5% |

---

*This implementation plan is a living document and should be updated as development progresses and requirements evolve.*
