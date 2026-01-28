/**
 * Home/Away Control Driver
 *
 * Handles home/away status from Starling Hub with:
 * - Home/Away mode control
 * - Presence state for automations
 */

import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory } from '../../lib/api/types';

class HomeAwayDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'home_away_control';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();
    this.log('Home/Away driver initialized');
  }
}

module.exports = HomeAwayDriver;
