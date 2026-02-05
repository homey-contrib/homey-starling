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
type HomeyThermostatPreset = 'none' | 'eco' | 'sleep' | 'comfort' | 'custom';

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

  private mapStarlingPresetToHomey(preset?: string): HomeyThermostatPreset {
    if (!preset) return 'none';
    const normalized = preset.trim().toLowerCase();
    if (normalized === '') return 'none';
    if (normalized === 'eco') return 'eco';
    if (normalized === 'sleep') return 'sleep';
    if (normalized === 'comfort') return 'comfort';
    return 'custom';
  }

  private mapHomeyPresetToStarling(preset: HomeyThermostatPreset): string | null {
    switch (preset) {
      case 'eco':
        return 'Eco';
      case 'sleep':
        return 'Sleep';
      case 'comfort':
        return 'Comfort';
      default:
        return null;
    }
  }

  private parsePresetsAvailable(raw?: string): string[] {
    if (!raw) return [];
    return raw
      .split(',')
      .map((preset) => preset.trim())
      .filter((preset) => preset.length > 0);
  }

  private supportsPresets(device?: ThermostatDevice): boolean {
    return (
      device?.presetsAvailable !== undefined ||
      device?.presetSelected !== undefined
    );
  }

  private isPresetAvailable(available: string[], preset: string): boolean {
    if (available.length === 0) return true;
    const normalized = preset.trim().toLowerCase();
    return available.some((item) => item.trim().toLowerCase() === normalized);
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

    // Thermostat preset selection (if supported)
    if (this.hasCapability('thermostat_preset')) {
      this.registerCapabilityListener('thermostat_preset', async (value: HomeyThermostatPreset) => {
        const device = this.getStarlingDevice() as ThermostatDevice | undefined;
        if (!this.supportsPresets(device)) {
          throw new Error(this.homey.__('errors.thermostat_preset_not_supported'));
        }

        if (value === 'custom') {
          throw new Error(this.homey.__('errors.thermostat_preset_custom_not_settable'));
        }

        if (value === 'none') {
          const currentPreset = device?.presetSelected?.trim() ?? '';
          if (!currentPreset) {
            return;
          }
          throw new Error(this.homey.__('errors.thermostat_preset_clear_requires_temp'));
        }

        const presetName = this.mapHomeyPresetToStarling(value);
        if (!presetName) {
          throw new Error(this.homey.__('errors.thermostat_preset_not_supported'));
        }

        const available = this.parsePresetsAvailable(device?.presetsAvailable);
        if (!this.isPresetAvailable(available, presetName)) {
          throw new Error(this.homey.__('errors.thermostat_preset_not_supported'));
        }

        await this.setPropertyOptimistic('presetSelected', presetName, 'thermostat_preset', value);
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

    // HVAC state (custom capability)
    if (thermostat.hvacState !== undefined && this.hasCapability('hvac_state')) {
      await this.safeSetCapabilityValue('hvac_state', thermostat.hvacState);
    }

    // Humidity (optional)
    if (thermostat.humidityPercent !== undefined && this.hasCapability('measure_humidity')) {
      await this.safeSetCapabilityValue('measure_humidity', thermostat.humidityPercent);
    }

    // Eco mode (optional)
    if (thermostat.ecoMode !== undefined && this.hasCapability('thermostat_eco_mode')) {
      await this.safeSetCapabilityValue('thermostat_eco_mode', thermostat.ecoMode);
    }

    // Thermostat preset (custom capability)
    if (this.hasCapability('thermostat_preset')) {
      const preset = this.mapStarlingPresetToHomey(thermostat.presetSelected);
      await this.safeSetCapabilityValue('thermostat_preset', preset);
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

      if (this.supportsPresets(device)) {
        await this.ensureCapability('thermostat_preset');
      } else {
        await this.removeCapabilityIfPresent('thermostat_preset');
      }
    }
  }
}

module.exports = ThermostatDeviceClass;
