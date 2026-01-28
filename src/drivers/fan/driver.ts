/**
 * Fan Driver
 *
 * Handles fans from Starling Hub with:
 * - On/Off control
 * - Speed control (0-100)
 */

import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory } from '../../lib/api/types';

class FanDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'fan';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();
    this.log('Fan driver initialized');
  }
}

module.exports = FanDriver;
