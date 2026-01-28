/**
 * Switch Driver
 *
 * Handles simple on/off switches from Starling Hub.
 */

import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory } from '../../lib/api/types';

class SwitchDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'switch';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();
    this.log('Switch driver initialized');
  }
}

module.exports = SwitchDriver;
