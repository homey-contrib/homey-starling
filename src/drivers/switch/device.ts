/**
 * Switch Device
 *
 * Represents a simple on/off switch from Starling Hub.
 */

import { StarlingDevice } from '../../lib/drivers';
import { Device, SwitchDevice } from '../../lib/api/types';

class SwitchDeviceClass extends StarlingDevice {
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
    const switchDevice = device as SwitchDevice;

    await this.safeSetCapabilityValue('onoff', switchDevice.isOn);
  }
}

module.exports = SwitchDeviceClass;
