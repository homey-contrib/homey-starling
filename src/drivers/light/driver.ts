/**
 * Light Driver
 *
 * Handles lights from Starling Hub with support for:
 * - On/Off
 * - Brightness (dimming)
 * - Color (HSV)
 * - Color temperature
 */

import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory } from '../../lib/api/types';

class LightDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'light';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();
    this.log('Light driver initialized');
  }
}

module.exports = LightDriver;
