/**
 * Outlet Device
 *
 * Represents a smart outlet from Starling Hub.
 *
 * Features:
 * - On/Off control
 * - Power measurement (optional, in watts)
 */

import { StarlingDevice } from '../../lib/drivers';
import { Device, OutletDevice } from '../../lib/api/types';

class OutletDeviceClass extends StarlingDevice {
  /**
   * Register capability listeners
   */
  protected registerCapabilityListeners(): void {
    this.registerCapabilityListener('onoff', async (value: boolean) => {
      await this.setPropertyOptimistic('isOn', value, 'onoff');
    });
  }

  /**
   * Map Starling device state to Homey capabilities
   */
  protected async mapStateToCapabilities(device: Device): Promise<void> {
    const outlet = device as OutletDevice;

    // On/Off state
    await this.safeSetCapabilityValue('onoff', outlet.isOn);

    // Power measurement (optional)
    if (outlet.power !== undefined && this.hasCapability('measure_power')) {
      await this.safeSetCapabilityValue('measure_power', outlet.power);
    }
  }

  /**
   * Called when the device is initialized
   */
  async onInit(): Promise<void> {
    // Call base class first to set up starlingId, hubConnection, etc.
    await super.onInit();

    const device = this.getStarlingDevice() as OutletDevice | undefined;

    if (device?.power !== undefined) {
      await this.ensureCapability('measure_power');
    }
  }
}

module.exports = OutletDeviceClass;
