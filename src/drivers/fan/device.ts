/**
 * Fan Device
 *
 * Represents a fan from Starling Hub.
 *
 * Features:
 * - On/Off control
 * - Speed control (dim capability, 0-100 mapped to 0-1)
 */

import { StarlingDevice } from '../../lib/drivers';
import { Device, FanDevice } from '../../lib/api/types';

class FanDeviceClass extends StarlingDevice {
  /**
   * Register capability listeners
   */
  protected registerCapabilityListeners(): void {
    // On/Off
    this.registerCapabilityListener('onoff', async (value: boolean) => {
      await this.setPropertyOptimistic('isOn', value, 'onoff');
    });

    // Speed (using dim capability)
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (value: number) => {
        // Homey dim is 0-1, Starling speed is 0-100
        const speed = Math.round(value * 100);
        await this.setPropertyOptimistic('speed', speed, 'dim', value);
      });
    }
  }

  /**
   * Map Starling device state to Homey capabilities
   */
  protected async mapStateToCapabilities(device: Device): Promise<void> {
    const fan = device as FanDevice;

    // On/Off state
    await this.safeSetCapabilityValue('onoff', fan.isOn);

    // Speed
    if (fan.speed !== undefined && this.hasCapability('dim')) {
      await this.safeSetCapabilityValue('dim', fan.speed / 100);
    }
  }

  /**
   * Called when the device is initialized
   */
  async onInit(): Promise<void> {
    // Call base class first to set up starlingId, hubConnection, etc.
    await super.onInit();

    const device = this.getStarlingDevice() as FanDevice | undefined;

    if (device?.speed !== undefined) {
      await this.ensureCapability('dim');
    }
  }
}

module.exports = FanDeviceClass;
