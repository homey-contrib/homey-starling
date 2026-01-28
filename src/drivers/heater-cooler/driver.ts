/**
 * Heater/Cooler Driver
 *
 * Handles heaters and coolers from Starling Hub with:
 * - On/off control
 * - Current temperature reading
 * - Target temperature setting
 * - Mode control (heat/cool/auto)
 */

import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory } from '../../lib/api/types';

class HeaterCoolerDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'heater_cooler';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();
    this.log('Heater/Cooler driver initialized');
  }
}

module.exports = HeaterCoolerDriver;
