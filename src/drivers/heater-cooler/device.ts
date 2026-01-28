/**
 * Heater/Cooler Device
 *
 * Represents a heater or cooler from Starling Hub with:
 * - On/off control (onoff capability)
 * - Current temperature reading (measure_temperature capability)
 * - Target temperature setting (target_temperature capability)
 * - Mode control (thermostat_mode capability: heat/cool/auto)
 */

import { StarlingDevice } from '../../lib/drivers';
import { Device, HeaterCoolerDevice } from '../../lib/api/types';

class HeaterCoolerDeviceClass extends StarlingDevice {
  /**
   * Register capability listeners
   */
  protected registerCapabilityListeners(): void {
    // On/off control
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value: boolean) => {
        await this.setPropertyOptimistic('isOn', value, 'onoff');
      });
    }

    // Target temperature control
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (value: number) => {
        await this.setPropertyOptimistic('targetTemperature', value, 'target_temperature');
      });
    }

    // Mode control (heat/cool/auto)
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (value: string) => {
        // Starling uses the same mode values: heat, cool, auto
        await this.setPropertyOptimistic('mode', value, 'thermostat_mode');
      });
    }
  }

  /**
   * Map Starling device state to Homey capabilities
   */
  protected async mapStateToCapabilities(device: Device): Promise<void> {
    const heaterCooler = device as HeaterCoolerDevice;

    // On/off state
    if (heaterCooler.isOn !== undefined && this.hasCapability('onoff')) {
      await this.safeSetCapabilityValue('onoff', heaterCooler.isOn);
    }

    // Current temperature
    if (heaterCooler.currentTemperature !== undefined && this.hasCapability('measure_temperature')) {
      await this.safeSetCapabilityValue('measure_temperature', heaterCooler.currentTemperature);
    }

    // Target temperature
    if (heaterCooler.targetTemperature !== undefined && this.hasCapability('target_temperature')) {
      await this.safeSetCapabilityValue('target_temperature', heaterCooler.targetTemperature);
    }

    // Mode (heat/cool/auto)
    if (heaterCooler.mode !== undefined && this.hasCapability('thermostat_mode')) {
      await this.safeSetCapabilityValue('thermostat_mode', heaterCooler.mode);
    }
  }

  /**
   * Called when the device is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();

    const device = this.getStarlingDevice() as HeaterCoolerDevice | undefined;
    if (device) {
      this.log(`Heater/Cooler initialized: ${device.name}`);

      // Add temperature capabilities if supported
      if (device.currentTemperature !== undefined) {
        await this.ensureCapability('measure_temperature');
      }

      if (device.targetTemperature !== undefined) {
        await this.ensureCapability('target_temperature');
      }

      // Add mode capability if supported
      if (device.mode !== undefined) {
        await this.ensureCapability('thermostat_mode');
      }
    }
  }
}

module.exports = HeaterCoolerDeviceClass;
