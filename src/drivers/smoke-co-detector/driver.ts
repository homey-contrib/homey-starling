/**
 * Smoke/CO Detector Driver
 *
 * Handles Nest Protect and similar smoke/CO detectors from Starling Hub with:
 * - Smoke alarm
 * - Carbon monoxide alarm
 * - Battery level monitoring
 *
 * Flow cards:
 * - Triggers: smoke_detected, smoke_cleared, co_detected, co_cleared, battery_low
 * - Conditions: smoke_is_detected, co_is_detected
 */

import Homey from 'homey';
import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory, SmokeCODevice } from '../../lib/api/types';

class SmokeCODriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'smoke_co_detector';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();

    // Register flow card handlers
    this.registerConditions();

    this.log('Smoke/CO Detector driver initialized');
  }

  /**
   * Register condition card handlers
   */
  private registerConditions(): void {
    // Smoke detected condition
    this.homey.flow.getConditionCard('smoke_is_detected').registerRunListener(
      (args: { device: Homey.Device }) => {
        const detector = this.getStarlingDeviceData<SmokeCODevice>(args.device);
        return detector?.smokeDetected ?? false;
      }
    );

    // CO detected condition
    this.homey.flow.getConditionCard('co_is_detected').registerRunListener(
      (args: { device: Homey.Device }) => {
        const detector = this.getStarlingDeviceData<SmokeCODevice>(args.device);
        return detector?.coDetected ?? false;
      }
    );
  }
}

module.exports = SmokeCODriver;
