/**
 * Diffuser Device
 *
 * Represents an aromatherapy diffuser from Starling Hub with:
 * - On/off control (onoff capability)
 * - Intensity control (dim capability, 0-100%)
 */

import { StarlingDevice } from '../../lib/drivers';
import { Device, DiffuserDevice } from '../../lib/api/types';

class DiffuserDeviceClass extends StarlingDevice {
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
    const diffuser = device as DiffuserDevice;

    // On/off state
    if (diffuser.isOn !== undefined && this.hasCapability('onoff')) {
      await this.safeSetCapabilityValue('onoff', diffuser.isOn);
    }

    // Intensity (0-100 -> 0-1 for dim)
    if (diffuser.intensity !== undefined && this.hasCapability('dim')) {
      await this.safeSetCapabilityValue('dim', diffuser.intensity / 100);
    }
  }

  /**
   * Called when the device is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();

    const device = this.getStarlingDevice() as DiffuserDevice | undefined;
    if (device) {
      this.log(`Diffuser initialized: ${device.name}`);

      // Add intensity capability if supported
      if (device.intensity !== undefined) {
        await this.ensureCapability('dim');
      }
    }
  }
}

module.exports = DiffuserDeviceClass;
