/**
 * Lock Driver
 *
 * Handles smart locks from Starling Hub with:
 * - Lock/Unlock control
 * - Jammed state alarm
 *
 * Flow cards:
 * - Triggers: lock_jammed, lock_state_changed
 * - Conditions: is_jammed
 */

import Homey from 'homey';
import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory, LockDevice } from '../../lib/api/types';

class LockDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'lock';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();

    // Register flow card handlers
    this.registerConditions();

    this.log('Lock driver initialized');
  }

  /**
   * Register condition card handlers
   */
  private registerConditions(): void {
    // Is jammed condition
    this.homey.flow.getConditionCard('is_jammed').registerRunListener(
      (args: { device: Homey.Device }) => {
        const lock = this.getStarlingDeviceData<LockDevice>(args.device);
        return lock?.currentState === 'jammed';
      }
    );
  }
}

module.exports = LockDriver;
