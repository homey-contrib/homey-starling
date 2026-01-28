/**
 * Thermostat Device
 *
 * Represents a thermostat from Starling Hub with support for:
 * - Target temperature (read/write)
 * - Current temperature (read-only)
 * - HVAC mode: off, heat, cool, auto (maps to Starling heatCool)
 * - Humidity monitoring (optional)
 * - Eco mode toggle (optional)
 *
 * Mode mapping:
 * - Homey "auto" ↔ Starling "heatCool"
 * - Other modes map directly
 *
 * Flow triggers fired:
 * - hvac_state_changed: When hvacState changes (off/heating/cooling)
 * - hvac_mode_changed: When hvacMode changes
 * - eco_mode_changed: When ecoMode changes
 */

import { StarlingDevice } from '../../lib/drivers';
import { Device, ThermostatDevice } from '../../lib/api/types';

// Homey thermostat mode values
type HomeyThermostatMode = 'off' | 'heat' | 'cool' | 'auto';

class ThermostatDeviceClass extends StarlingDevice {
  /**
   * Map Homey mode to Starling hvacMode
   */
  private homeyModeToStarling(mode: HomeyThermostatMode): string {
    return mode === 'auto' ? 'heatCool' : mode;
  }

  /**
   * Map Starling hvacMode to Homey mode
   */
  private starlingModeToHomey(mode: string): HomeyThermostatMode {
    return mode === 'heatCool' ? 'auto' : (mode as HomeyThermostatMode);
  }

  /**
   * Register capability listeners
   */
  protected registerCapabilityListeners(): void {
    // Target temperature
    this.registerCapabilityListener('target_temperature', async (value: number) => {
      await this.setPropertyOptimistic('targetTemperature', value, 'target_temperature');
    });

    // HVAC mode
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (value: HomeyThermostatMode) => {
        const starlingMode = this.homeyModeToStarling(value);
        await this.setPropertyOptimistic('hvacMode', starlingMode, 'thermostat_mode', value);
      });
    }

    // Eco mode toggle (if supported)
    if (this.hasCapability('thermostat_eco_mode')) {
      this.registerCapabilityListener('thermostat_eco_mode', async (value: boolean) => {
        await this.setPropertyOptimistic('ecoMode', value, 'thermostat_eco_mode');
      });
    }
  }

  /**
   * Handle state changes and fire flow triggers
   */
  protected handleStateChanges(device: Device): void {
    const thermostat = device as ThermostatDevice;

    // HVAC state changed trigger
    if (thermostat.hvacState !== undefined) {
      const change = this.checkStateChange('hvacState', thermostat.hvacState);
      if (change) {
        void this.triggerFlow('hvac_state_changed', { state: thermostat.hvacState });
      }
      this.updatePreviousState('hvacState', thermostat.hvacState);
    }

    // HVAC mode changed trigger
    if (thermostat.hvacMode !== undefined) {
      const change = this.checkStateChange('hvacMode', thermostat.hvacMode);
      if (change) {
        const homeyMode = this.starlingModeToHomey(thermostat.hvacMode);
        void this.triggerFlow('hvac_mode_changed', { mode: homeyMode });
      }
      this.updatePreviousState('hvacMode', thermostat.hvacMode);
    }

    // Eco mode changed trigger
    if (thermostat.ecoMode !== undefined) {
      const change = this.checkStateChange('ecoMode', thermostat.ecoMode);
      if (change) {
        const stateText = thermostat.ecoMode ? 'enabled' : 'disabled';
        void this.triggerFlow('eco_mode_changed', { state: stateText });
      }
      this.updatePreviousState('ecoMode', thermostat.ecoMode);
    }
  }

  /**
   * Map Starling device state to Homey capabilities
   */
  protected async mapStateToCapabilities(device: Device): Promise<void> {
    const thermostat = device as ThermostatDevice;

    // Current temperature (read-only)
    if (thermostat.currentTemperature !== undefined) {
      await this.safeSetCapabilityValue('measure_temperature', thermostat.currentTemperature);
    }

    // Target temperature
    if (thermostat.targetTemperature !== undefined) {
      await this.safeSetCapabilityValue('target_temperature', thermostat.targetTemperature);
    }

    // HVAC mode
    if (thermostat.hvacMode !== undefined && this.hasCapability('thermostat_mode')) {
      const homeyMode = this.starlingModeToHomey(thermostat.hvacMode);
      await this.safeSetCapabilityValue('thermostat_mode', homeyMode);
    }

    // Humidity (optional)
    if (thermostat.humidityPercent !== undefined && this.hasCapability('measure_humidity')) {
      await this.safeSetCapabilityValue('measure_humidity', thermostat.humidityPercent);
    }

    // Eco mode (optional)
    if (thermostat.ecoMode !== undefined && this.hasCapability('thermostat_eco_mode')) {
      await this.safeSetCapabilityValue('thermostat_eco_mode', thermostat.ecoMode);
    }
  }

  /**
   * Called when the device is initialized
   */
  async onInit(): Promise<void> {
    // Call base class first to set up starlingId, hubConnection, etc.
    await super.onInit();

    const device = this.getStarlingDevice() as ThermostatDevice | undefined;

    if (device) {
      // Add thermostat mode based on device capabilities
      if (device.canHeat || device.canCool || device.canHeatCool) {
        await this.ensureCapability('thermostat_mode');
      }

      // Add humidity if available
      if (device.humidityPercent !== undefined) {
        await this.ensureCapability('measure_humidity');
      }

      // Add eco mode if supported
      if (device.ecoMode !== undefined) {
        await this.ensureCapability('thermostat_eco_mode');
      }
    }
  }
}

module.exports = ThermostatDeviceClass;
