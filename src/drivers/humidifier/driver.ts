/**
 * Humidifier/Dehumidifier Driver
 *
 * Handles humidifiers and dehumidifiers from Starling Hub with:
 * - On/off control
 * - Current humidity reading
 * - Intensity/speed control (0-100%)
 */

import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory } from '../../lib/api/types';

class HumidifierDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'humidifier_dehumidifier';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();
    this.log('Humidifier/Dehumidifier driver initialized');
  }
}

module.exports = HumidifierDriver;
