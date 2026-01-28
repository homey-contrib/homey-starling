/**
 * Garage Door Driver
 *
 * Handles garage doors from Starling Hub with:
 * - Open/Close control
 * - State monitoring (open, closed, opening, closing)
 * - Obstruction detection alarm
 *
 * Flow cards:
 * - Triggers: obstruction_detected, obstruction_cleared, door_opened, door_closed
 * - Conditions: is_obstructed
 */

import Homey from 'homey';
import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory, GarageDevice } from '../../lib/api/types';

class GarageDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'garage';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();

    // Register flow card handlers
    this.registerConditions();

    this.log('Garage door driver initialized');
  }

  /**
   * Register condition card handlers
   */
  private registerConditions(): void {
    // Is obstructed condition
    this.homey.flow.getConditionCard('is_obstructed').registerRunListener(
      (args: { device: Homey.Device }) => {
        const garage = this.getStarlingDeviceData<GarageDevice>(args.device);
        return garage?.obstructionDetected ?? false;
      }
    );
  }
}

module.exports = GarageDriver;
