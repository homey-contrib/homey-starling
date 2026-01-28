/**
 * Humidifier/Dehumidifier Device
 *
 * Represents a humidifier or dehumidifier from Starling Hub with:
 * - On/off control (onoff capability)
 * - Current humidity reading (measure_humidity capability)
 * - Intensity/speed control (dim capability, 0-100%)
 */

import { StarlingDevice } from '../../lib/drivers';
import { Device, HumidifierDehumidifierDevice } from '../../lib/api/types';

class HumidifierDeviceClass extends StarlingDevice {
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

    // Intensity control (dim maps to intensity 0-100)
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (value: number) => {
        const intensity = Math.round(value * 100);
        await this.setPropertyOptimistic('intensity', intensity, 'dim', value);
      });
    }
  }

  /**
   * Map Starling device state to Homey capabilities
   */
  protected async mapStateToCapabilities(device: Device): Promise<void> {
    const humidifier = device as HumidifierDehumidifierDevice;

    // On/off state
    if (humidifier.isOn !== undefined && this.hasCapability('onoff')) {
      await this.safeSetCapabilityValue('onoff', humidifier.isOn);
    }

    // Current humidity reading
    if (humidifier.currentHumidity !== undefined && this.hasCapability('measure_humidity')) {
      await this.safeSetCapabilityValue('measure_humidity', humidifier.currentHumidity);
    }

    // Intensity (0-100 -> 0-1 for dim)
    if (humidifier.intensity !== undefined && this.hasCapability('dim')) {
      await this.safeSetCapabilityValue('dim', humidifier.intensity / 100);
    }
  }

  /**
   * Called when the device is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();

    const device = this.getStarlingDevice() as HumidifierDehumidifierDevice | undefined;
    if (device) {
      this.log(`Humidifier/Dehumidifier initialized: ${device.name}`);

      // Add humidity capability if supported
      if (device.currentHumidity !== undefined) {
        await this.ensureCapability('measure_humidity');
      }

      // Add intensity capability if supported
      if (device.intensity !== undefined) {
        await this.ensureCapability('dim');
      }
    }
  }
}

module.exports = HumidifierDeviceClass;
