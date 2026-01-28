/**
 * Kettle Driver
 *
 * Handles smart kettles from Starling Hub with:
 * - On/off control
 * - Current temperature reading
 * - Target temperature setting
 */

import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory } from '../../lib/api/types';

class KettleDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'kettle';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();
    this.log('Kettle driver initialized');
  }
}

module.exports = KettleDriver;
