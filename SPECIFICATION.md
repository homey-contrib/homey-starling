# Starling Home Hub - Homey App Specification

## Overview

This document specifies the requirements for a Homey app that bridges Google Home/Nest devices exposed via the Starling Developer Connect V2 API to the Homey smart home platform.

**Target Homey Version:** >=12.4.0
**SDK Version:** 3
**Starling API Version:** 3.1 (minimum supported, with version warning for older)

---

## 1. Hub Management

### 1.1 Hub Discovery

The app supports **two methods** for adding Starling Hubs:

1. **mDNS/Bonjour Discovery** (Primary)
   - Scan local network for Starling Hub broadcasts
   - Present discovered hubs in a list for selection

2. **Manual Entry** (Fallback)
   - User enters IP address or hostname directly
   - For networks where mDNS is blocked or hubs use static IPs

### 1.2 Hub Configuration

Each hub configuration stores:
- **Name**: User-friendly identifier (editable)
- **Host**: IP address or hostname
- **Port**: Auto-detected (3080 for HTTP, 3443 for HTTPS)
- **Protocol**: HTTP or HTTPS (auto-detected based on hub settings)
- **API Key**: 12-character alphanumeric string
- **Permissions**: Read, Write, Camera (detected from API)

### 1.3 API Key Validation

When adding or editing a hub:
1. Call `/api/connect/v2/status` endpoint
2. Verify `apiReady` is true
3. Check `connectedToGoogleHome` status
4. Enumerate granted permissions (Read/Write/Camera)
5. Display permission summary to user before confirming

### 1.4 TLS Handling

- **Auto-detect protocol**: Check what the hub has enabled
- If HTTP only (port 3080): Use plain HTTP
- If HTTPS enabled (port 3443): Use HTTPS with certificate validation disabled for local hub IPs
- Starling uses `*.local.starling.direct` certificates that may not validate in Node.js

### 1.5 Multi-Hub Support

- Unlimited hubs can be configured
- Each hub operates independently
- Device naming conflict resolution: **Suffix only on conflict**
  - If "Living Room Light" exists on Hub A and Hub B, append hub identifier
  - Example: "Living Room Light (Hub B)"

### 1.6 Hub Removal

When user removes a hub:
- **Prompt user** with options:
  - Delete all devices from this hub
  - Keep devices (marked unavailable) for potential re-connection
- Preserve user's choice for flow reference preservation

---

## 2. Device Management

### 2.1 Supported Device Categories

All 23 Starling device categories with full capability mapping:

| Category | Homey Capabilities | Notes |
|----------|-------------------|-------|
| **cam** | alarm_motion, alarm_generic (person/face/animal/vehicle/package), camera snapshot | WebRTC streaming, talkback |
| **diffuser** | onoff, dim | Fragrance level control |
| **fan** | onoff, dim, fan_speed | Speed levels |
| **garage** | garagedoor_closed, alarm_generic (obstruction) | Safety alarm on obstruction |
| **heater_cooler** | onoff, target_temperature, thermostat_mode | AC units, heaters |
| **home_away_control** | Virtual device with home/away mode | Optional - user selects to add |
| **humidifier_dehumidifier** | onoff, dim, measure_humidity, target_humidity | Humidity control |
| **kettle** | onoff, measure_temperature, target_temperature | Water kettles |
| **light** | onoff, dim, light_hue, light_saturation, light_temperature | HSV + color temp, unified with priority |
| **lock** | locked, alarm_generic (jammed) | Jammed state triggers alarm |
| **open_close** | windowcoverings_state, windowcoverings_set | Blinds, curtains, gates |
| **outlet** | onoff, measure_power (if available) | Smart plugs |
| **purifier** | onoff, dim, measure_pm25 (if available) | Air quality |
| **robot** | onoff, vacuumcleaner_state, measure_battery, alarm_battery | Full vacuum support |
| **sensor** | measure_temperature, measure_humidity, alarm_motion, alarm_water, measure_co2 | Based on sensor type |
| **smoke_co_detector** | alarm_smoke, alarm_co, alarm_battery, measure_battery | Full device with alarm capabilities |
| **switch** | onoff | Simple switches |
| **thermostat** | measure_temperature, target_temperature, thermostat_mode, measure_humidity, target_humidity | Full feature parity including presets |
| **valve** | onoff, duration (if API supports) | Timers if available |

### 2.2 Device Pairing Flow

1. User initiates "Add Device" in Homey
2. Present hub selection (if multiple hubs configured)
3. **Device selection interface:**
   - Option to "Add All Devices"
   - Filter by device category (Lights, Thermostats, Cameras, etc.)
   - Individual device checkboxes within categories
4. **Zone suggestion:**
   - For each device, suggest Homey zone based on `roomName` from Starling
   - User can accept suggestion or select different zone
5. Pair selected devices

### 2.3 Device Naming

- Use device `name` from Starling API
- On conflict (same name from different hubs): append " (Hub Name)" suffix
- Users can rename in Homey after pairing

### 2.4 Device Icons

- **Model-specific icons** for known Nest/Google devices where available
- Bundle icons for common models:
  - Nest Thermostat (various generations)
  - Nest Protect
  - Nest Cam (various models)
  - Nest Doorbell
  - Google Home devices
- Fall back to **generic category icons** for unknown models

### 2.5 Device Removal Detection

When a device disappears from Starling API:
- **Mark device unavailable** in Homey
- Do NOT auto-delete (preserves flow references)
- User can manually remove if desired
- If device reappears, automatically restore availability

---

## 3. Polling & State Synchronization

### 3.1 Poll Interval

- **Default: 10-15 seconds** for all devices
- Configurable per-hub in settings (advanced option)
- Balance between responsiveness and hub/network load

### 3.2 Hub Offline Handling

- **Grace period: 30-60 seconds** before marking hub offline
- During grace period: retry silently with exponential backoff
- After grace period: mark all devices from that hub as unavailable
- Continue retry attempts in background
- When hub returns: restore device availability automatically

### 3.3 Optimistic UI Updates

When user sends a command:
1. **Immediately update** Homey UI with expected state
2. On next poll, verify actual state
3. If state differs from expected: **rollback** UI to actual state
4. If rollback occurs: notify user of command failure

### 3.4 Manual Refresh

- **Flow action** available: "Refresh all devices from hub"
- Triggers immediate poll of specified hub or all hubs
- Useful for automations that need guaranteed fresh state

---

## 4. Capability Mapping Details

### 4.1 Lights

- **HSV Color Space:** Map Starling's hue (0-360), saturation (0-100), brightness (0-100) to Homey's light_hue, light_saturation, dim
- **Color Temperature:** Map Starling's mired units to Homey's light_temperature
- **Unified with Priority:**
  - Setting color mode clears color temperature mode
  - Setting color temperature clears color mode
  - Matches typical smart light behavior

### 4.2 Thermostats (Full Feature Parity)

| Starling Property | Homey Capability | Notes |
|-------------------|------------------|-------|
| currentTemperature | measure_temperature | Read-only |
| targetTemperature | target_temperature | Writable |
| hvacMode | thermostat_mode | off, heat, cool, heatCool |
| hvacState | Custom capability | off, heating, cooling (read-only) |
| humidityPercent | measure_humidity | Read-only |
| targetHumidity | target_humidity | Writable if supported |
| ecoMode | Custom capability | Boolean or preset name |
| presets | Flow actions | Switch to Eco, Sleep, Comfort, custom presets |
| temperatureSensors | Flow actions | Select active sensor (if multiple) |

### 4.3 Cameras

**Detection Events (flow triggers):**
- Motion detected
- Person detected
- Face detected (with name token for known faces)
- Animal detected
- Vehicle detected
- Doorbell pushed
- Package delivered
- Package retrieved

**Face Recognition:**
- **Per-face flow triggers** using dynamic flow card registration
- When new face is recognized, register trigger "Face detected: [Name]"
- Generic "Any face detected" trigger with face name as token

**Snapshots:**
- **Event-triggered capture:** Auto-snapshot on motion/doorbell/person detection
- Store most recent snapshot per camera
- Respect rate limit (1 per 10 seconds)
- If multiple events within rate limit window, queue single snapshot after cooldown

**WebRTC Streaming:**
- Full implementation of live video streaming
- Support stream initiation, extension (for cloud streams), and termination
- Handle local vs cloud stream differences

**Talkback:**
- Full two-way audio support for compatible devices
- Enable/disable talkback via flow actions

### 4.4 Locks

- Map `targetLockState` to Homey's `locked` capability
- Monitor `currentState` for actual lock position
- **Dedicated alarm_generic capability** for jammed state
- Flow trigger: "Lock is jammed"

### 4.5 Garage Doors

- `garagedoor_closed` capability for open/close state
- **Alarm on obstruction:** If obstruction detected, trigger alarm_generic
- Flow trigger: "Garage door obstructed"

### 4.6 Detection Event Behavior

- **Match Starling state exactly**
- If Starling reports `motionDetected: true`, Homey shows motion active
- If Starling reports `motionDetected: false`, Homey clears motion state
- No artificial sustain period - trust Starling's timing

### 4.7 Robot Vacuums (Full Support)

| Feature | Implementation |
|---------|----------------|
| On/Off | Start/stop cleaning |
| State | vacuumcleaner_state (cleaning, docked, returning, etc.) |
| Battery | measure_battery (0-100%) |
| Charging | Custom indicator or alarm_battery when low |
| Dock status | Flow triggers for docked/undocked |
| Start/Stop/Pause | Flow actions |

---

## 5. Home/Away Control

### 5.1 Virtual Device (Optional)

- Create as a **dedicated virtual device** in Homey
- User must explicitly select to add during pairing (not auto-added)
- One device per structure (if multiple structures exist)

### 5.2 Fallback Behavior

If user doesn't add Home/Away device:
- Expose **flow action only**: "Set Home/Away mode"
- Action available at app level, not tied to specific device

### 5.3 Capabilities

- Custom capability: `home_away_mode` (home, away)
- Flow trigger: "Home/Away mode changed"
- Flow condition: "Mode is home/away"
- Flow action: "Set mode to home/away"

---

## 6. Flow Cards

### 6.1 Triggers

**Camera Triggers:**
- Motion detected on [camera]
- Person detected on [camera]
- Face detected on [camera] (with face name token)
- [Specific face name] detected on [camera] (dynamic per known face)
- Animal detected on [camera]
- Vehicle detected on [camera]
- Doorbell pushed on [doorbell]
- Package delivered at [camera]
- Package retrieved at [camera]

**Thermostat Triggers:**
- Temperature changed on [thermostat]
- HVAC mode changed on [thermostat]
- HVAC state changed (started/stopped heating/cooling)
- Humidity changed on [thermostat]

**Lock Triggers:**
- Lock state changed on [lock]
- Lock jammed on [lock]

**Garage Triggers:**
- Garage door opened/closed
- Garage door obstructed

**Smoke/CO Triggers:**
- Smoke detected on [detector]
- CO detected on [detector]
- Detector battery low

**Robot Vacuum Triggers:**
- Vacuum started/stopped cleaning
- Vacuum docked/undocked
- Vacuum battery low

**Sensor Triggers:**
- Motion detected (motion sensors)
- Water leak detected (leak sensors)
- Temperature/humidity threshold crossed

**System Triggers:**
- Hub went offline
- Hub came online
- Device command failed (with error token)
- Home/Away mode changed

### 6.2 Conditions

**Device Conditions:**
- [light] is on/off
- [thermostat] mode is [mode]
- [thermostat] is heating/cooling
- [lock] is locked/unlocked
- [camera] has motion detected
- [garage door] is open/closed
- [vacuum] is cleaning/docked

**System Conditions:**
- Hub [hub] is online/offline
- Home/Away mode is [mode]

### 6.3 Actions

**Light Actions:**
- Turn on/off [light]
- Set brightness to [level]%
- Set color to [hue]/[saturation]
- Set color temperature to [temp]

**Thermostat Actions:**
- Set target temperature to [temp]
- Set mode to [off/heat/cool/auto]
- Set to preset [Eco/Sleep/Comfort/custom]
- Set target humidity to [level]%
- Select temperature sensor [sensor]

**Lock Actions:**
- Lock/Unlock [lock]

**Garage Actions:**
- Open/Close garage door

**Camera Actions:**
- Take snapshot from [camera]
- Enable/Disable quiet time on [camera]
- Enable/Disable camera on [camera]
- Start/Stop talkback on [camera]

**Vacuum Actions:**
- Start/Stop/Pause cleaning
- Return to dock

**Valve Actions:**
- Turn on/off [valve]
- Turn on [valve] for [duration] minutes (if API supports)

**Home/Away Actions:**
- Set Home/Away mode to [home/away]

**System Actions:**
- Refresh all devices from [hub]
- Refresh all devices from all hubs

---

## 7. Settings Interface

### 7.1 Main Settings Page

**Hub List:**
- Display all configured hubs
- **Minimal view:** Hub name + online/offline status indicator
- Tap/click hub for detailed view and editing

**Add Hub Button:**
- Launches hub discovery or manual entry flow

**Global Settings:**
- Debug mode toggle (enables verbose logging)
- Default poll interval (advanced)

### 7.2 Hub Detail/Edit View

**Displayed Information:**
- Hub name (editable)
- IP address / hostname
- Protocol (HTTP/HTTPS)
- Connection status
- API permissions (Read/Write/Camera indicators)
- Device count

**Actions:**
- Edit API key (triggers re-sync + permission check)
- Test connection
- Remove hub (with device handling prompt)

### 7.3 Diagnostics Page

**Per-Hub Diagnostics:**
- Connection status
- Last successful poll timestamp
- Last error (if any)
- API version reported by hub
- Permissions summary

**Error History:**
- Recent failed commands with timestamps
- Device offline events
- Hub connection failures

**Actions:**
- Export diagnostic log
- Clear error history

---

## 8. Error Handling

### 8.1 Command Failures

When a device command fails:
1. **Rollback** optimistic UI update
2. **Send Homey notification** describing the failure
3. **Add timeline entry** for persistent record
4. **Fire flow trigger** "Device command failed" with tokens:
   - Device name
   - Command attempted
   - Error message

### 8.2 Error Types & Handling

| Error Code | User Message | Recovery |
|------------|--------------|----------|
| INVALID_API_KEY | "API key rejected. Please verify key in settings." | Prompt to update key |
| DEVICE_NOT_FOUND | "Device no longer available on hub." | Mark device unavailable |
| READ_ONLY_PROPERTY | "This property cannot be changed." | Revert UI, log warning |
| INVALID_VALUE | "Value not accepted by device." | Revert UI, notify user |
| SET_ERROR | "Google Home rejected the change." | Revert UI, notify user |
| NO_SNAPSHOT_AVAILABLE | "Camera snapshot unavailable." | Show placeholder, retry later |
| STREAM_REQUEST_REFUSED | "Could not start video stream." | Notify user, suggest retry |
| Network timeout | "Hub not responding." | Enter retry/grace period |

### 8.3 API Version Warnings

- On hub connection, check `apiVersion` from `/status`
- If version < 3.1: **warn but allow** connection
- Display warning in hub settings: "Hub firmware may be outdated. Some features may not work correctly."

---

## 9. Permission-Based Feature Availability

### 9.1 Graceful Degradation

The app works with **any permission combination**:

**Read-only keys:**
- All devices visible and state displayed
- All monitoring/trigger capabilities work
- Control actions disabled with clear UI indication
- Conditions still function (checking state)

**Read + Write (no Camera):**
- Full device control
- Camera devices show detection events
- Camera snapshots disabled with message: "Camera permission not granted"
- WebRTC streaming unavailable

**Full permissions (Read + Write + Camera):**
- All features enabled

### 9.2 UI Indication

- Capabilities requiring unavailable permissions show disabled state
- Tooltip or info text explains: "Enable [permission] in Starling app to use this feature"
- Settings page shows permission matrix per hub

---

## 10. Startup & Lifecycle

### 10.1 App Initialization

On Homey restart or app start:
1. Load hub configurations from storage
2. **Staggered reconnection:**
   - Connect to hubs one at a time
   - 2-3 second delay between hub connection attempts
   - Prevents overwhelming network on boot
3. For each hub:
   - Verify connectivity
   - Fetch device list
   - Update device states
   - Start polling loop

### 10.2 API Key Changes

When user edits a hub's API key:
1. Validate new key against `/status`
2. Check permissions
3. **Re-sync devices:** Fetch fresh device list
4. **Re-evaluate permissions:**
   - If permissions changed, update device capabilities accordingly
   - Example: Gained Camera permission → enable snapshot capability on cameras
5. Notify user of changes

---

## 11. Localization

### 11.1 Structure

- Full **i18n infrastructure** from initial implementation
- All user-facing strings externalized to locale files
- Use Homey's `__()` translation function throughout

### 11.2 Initial Languages

- **English (en)** - complete implementation
- Structure ready for additional languages (nl, de, fr, etc.)

### 11.3 Externalized Strings

- Device capability labels
- Flow card titles and descriptions
- Settings page labels
- Error messages
- Notifications
- Status indicators

---

## 12. Technical Implementation Notes

### 12.1 Driver Architecture

Create separate drivers per device category for cleaner organization:
- `drivers/camera/`
- `drivers/thermostat/`
- `drivers/light/`
- `drivers/lock/`
- etc.

Each driver handles:
- Pairing flow for that device type
- Capability mapping specific to category
- State polling and updates
- Command handling

### 12.2 Hub Manager

Central class managing hub connections:
- Maintains connection pool to all hubs
- Handles polling scheduling
- Routes device requests to correct hub
- Implements retry logic and grace periods

### 12.3 Rate Limiting

Implement client-side rate limiting:
- Camera snapshots: max 1 per 10 seconds per camera
- Property writes: max 1 per second per device
- Queue commands if rate exceeded

### 12.4 Storage

Use Homey's `ManagerSettings` for:
- Hub configurations (name, host, encrypted API key)
- User preferences (poll intervals, debug mode)
- Device metadata cache

---

## 13. Future Considerations

The following items are noted for potential future versions:

1. **Activity Zone support** - Starling API 3.1+ supports zone-based motion detection
2. **Local streaming optimization** - Prefer local streams over cloud for 2021+ cameras when available
3. **Thermostat scheduling** - Expose schedule management if API supports
4. **Energy monitoring** - Aggregate power usage from outlets/devices if data available
5. **Widget support** - Homey dashboard widgets for quick camera views

---

## Appendix A: Starling API Reference

**Base URL:** `http(s)://<hub-ip>:<port>/api/connect/v2`

**Ports:**
- HTTP: 3080
- HTTPS: 3443

**Key Endpoints:**
- `GET /status` - API readiness and version
- `GET /devices` - List all devices
- `GET /devices/{id}` - Device details
- `GET /devices/{id}/{property}` - Single property
- `POST /devices/{id}` - Update properties
- `GET /devices/{id}/snapshot` - Camera snapshot
- `POST /devices/{id}/stream` - Start WebRTC stream
- `POST /devices/{id}/stream/{sid}/extend` - Extend cloud stream
- `POST /devices/{id}/stream/{sid}/stop` - Stop stream
- `POST /devices/{id}/stream/{sid}/talkback` - Toggle talkback

---

## Appendix B: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | TBD | Initial specification |

---

*This specification was developed through detailed requirements gathering and represents the complete feature set for the Starling Home Hub Homey app.*
