/**
 * Diffuser Driver
 *
 * Handles aromatherapy diffusers from Starling Hub with:
 * - On/off control
 * - Intensity control (0-100%)
 */

import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory } from '../../lib/api/types';

class DiffuserDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'diffuser';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();
    this.log('Diffuser driver initialized');
  }
}

module.exports = DiffuserDriver;
