/**
 * Blinds/Shades Driver
 *
 * Handles window coverings from Starling Hub with:
 * - Position control (0-100%)
 * - Open/Close/Opening/Closing states
 *
 * Flow cards:
 * - Triggers: opened, closed
 * - Actions: set_position
 */

import Homey from 'homey';
import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory } from '../../lib/api/types';

class BlindsDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'open_close';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();

    // Register flow card handlers
    this.registerActions();

    this.log('Blinds driver initialized');
  }

  /**
   * Register action card handlers
   */
  private registerActions(): void {
    // Set position
    this.homey.flow.getActionCard('set_position').registerRunListener(
      async (args: { device: Homey.Device; position: number }) => {
        const store = args.device.getStore() as { starlingId: string };
        const hubManager = this.getHubManager();
        // Position argument is 0-100
        await hubManager.setDeviceProperty(store.starlingId, 'position', args.position);
      }
    );
  }
}

module.exports = BlindsDriver;
