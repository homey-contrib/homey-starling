/**
 * Purifier Driver
 *
 * Handles air purifiers from Starling Hub with:
 * - On/off control
 * - Fan speed control (0-100%)
 * - PM2.5 air quality measurement
 */

import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory } from '../../lib/api/types';

class PurifierDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'purifier';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();
    this.log('Purifier driver initialized');
  }
}

module.exports = PurifierDriver;
