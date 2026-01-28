/**
 * Outlet Driver
 *
 * Handles smart outlets from Starling Hub with:
 * - On/Off control
 * - Power measurement (optional)
 */

import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory } from '../../lib/api/types';

class OutletDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'outlet';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();
    this.log('Outlet driver initialized');
  }
}

module.exports = OutletDriver;
