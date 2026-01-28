/**
 * Purifier Device
 *
 * Represents an air purifier from Starling Hub with:
 * - On/off control (onoff capability)
 * - Fan speed control (dim capability, 0-100%)
 * - PM2.5 air quality measurement (measure_pm25 capability)
 */

import { StarlingDevice } from '../../lib/drivers';
import { Device, PurifierDevice } from '../../lib/api/types';

class PurifierDeviceClass extends StarlingDevice {
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

    // Fan speed control (dim maps to speed 0-100)
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (value: number) => {
        const speed = Math.round(value * 100);
        await this.setPropertyOptimistic('speed', speed, 'dim', value);
      });
    }
  }

  /**
   * Map Starling device state to Homey capabilities
   */
  protected async mapStateToCapabilities(device: Device): Promise<void> {
    const purifier = device as PurifierDevice;

    // On/off state
    if (purifier.isOn !== undefined && this.hasCapability('onoff')) {
      await this.safeSetCapabilityValue('onoff', purifier.isOn);
    }

    // Fan speed (0-100 -> 0-1 for dim)
    if (purifier.speed !== undefined && this.hasCapability('dim')) {
      await this.safeSetCapabilityValue('dim', purifier.speed / 100);
    }

    // PM2.5 level (direct value)
    if (purifier.pm25Level !== undefined && this.hasCapability('measure_pm25')) {
      await this.safeSetCapabilityValue('measure_pm25', purifier.pm25Level);
    }
  }

  /**
   * Called when the device is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();

    const device = this.getStarlingDevice() as PurifierDevice | undefined;
    if (device) {
      this.log(`Purifier initialized: ${device.name}`);

      // Add fan speed capability if supported
      if (device.speed !== undefined) {
        await this.ensureCapability('dim');
      }

      // Add PM2.5 capability if supported
      if (device.pm25Level !== undefined) {
        await this.ensureCapability('measure_pm25');
      }
    }
  }
}

module.exports = PurifierDeviceClass;
