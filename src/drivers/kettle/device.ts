/**
 * Kettle Device
 *
 * Represents a smart kettle from Starling Hub with:
 * - On/off control (onoff capability)
 * - Current temperature reading (measure_temperature capability)
 * - Target temperature setting (target_temperature capability)
 */

import { StarlingDevice } from '../../lib/drivers';
import { Device, KettleDevice } from '../../lib/api/types';

class KettleDeviceClass extends StarlingDevice {
  /**
   * Register capability listeners
   */
  protected registerCapabilityListeners(): void {
    // On/off control (start/stop heating)
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
  }

  /**
   * Map Starling device state to Homey capabilities
   */
  protected async mapStateToCapabilities(device: Device): Promise<void> {
    const kettle = device as KettleDevice;

    // On/off state (heating active)
    if (kettle.isOn !== undefined && this.hasCapability('onoff')) {
      await this.safeSetCapabilityValue('onoff', kettle.isOn);
    }

    // Current water temperature
    if (kettle.currentTemperature !== undefined && this.hasCapability('measure_temperature')) {
      await this.safeSetCapabilityValue('measure_temperature', kettle.currentTemperature);
    }

    // Target temperature setting
    if (kettle.targetTemperature !== undefined && this.hasCapability('target_temperature')) {
      await this.safeSetCapabilityValue('target_temperature', kettle.targetTemperature);
    }
  }

  /**
   * Called when the device is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();

    const device = this.getStarlingDevice() as KettleDevice | undefined;
    if (device) {
      this.log(`Kettle initialized: ${device.name}`);

      // Add temperature capabilities if supported
      if (device.currentTemperature !== undefined) {
        await this.ensureCapability('measure_temperature');
      }

      if (device.targetTemperature !== undefined) {
        await this.ensureCapability('target_temperature');
      }
    }
  }
}

module.exports = KettleDeviceClass;
