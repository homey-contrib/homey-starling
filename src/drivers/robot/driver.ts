/**
 * Robot Vacuum Driver
 *
 * Handles robot vacuums from Starling Hub with:
 * - Start/Stop control
 * - State monitoring (cleaning, docked, returning, paused, error)
 * - Battery level
 *
 * Flow cards:
 * - Triggers: started_cleaning, stopped_cleaning, docked, undocked, battery_low, error_occurred
 * - Conditions: is_cleaning, is_docked
 * - Actions: start_cleaning, stop_cleaning, pause_cleaning, return_to_dock
 */

import Homey from 'homey';
import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory, RobotDevice } from '../../lib/api/types';

class RobotDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'robot';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();

    // Register flow card handlers
    this.registerConditions();
    this.registerActions();

    this.log('Robot vacuum driver initialized');
  }

  /**
   * Register condition card handlers
   */
  private registerConditions(): void {
    // Is cleaning condition
    this.homey.flow.getConditionCard('is_cleaning').registerRunListener(
      (args: { device: Homey.Device }) => {
        const robot = this.getStarlingDeviceData<RobotDevice>(args.device);
        return robot?.isOn ?? false;
      }
    );

    // Is docked condition (derived from state)
    this.homey.flow.getConditionCard('is_docked').registerRunListener(
      (args: { device: Homey.Device }) => {
        const robot = this.getStarlingDeviceData<RobotDevice>(args.device);
        return robot?.state === 'docked';
      }
    );
  }

  /**
   * Register action card handlers
   */
  private registerActions(): void {
    // Start cleaning
    this.homey.flow.getActionCard('start_cleaning').registerRunListener(
      async (args: { device: Homey.Device }) => {
        const store = args.device.getStore() as { starlingId: string };
        const hubManager = this.getHubManager();
        await hubManager.setDeviceProperty(store.starlingId, 'isOn', true);
      }
    );

    // Stop cleaning
    this.homey.flow.getActionCard('stop_cleaning').registerRunListener(
      async (args: { device: Homey.Device }) => {
        const store = args.device.getStore() as { starlingId: string };
        const hubManager = this.getHubManager();
        await hubManager.setDeviceProperty(store.starlingId, 'isOn', false);
      }
    );

    // Pause cleaning
    this.homey.flow.getActionCard('pause_cleaning').registerRunListener(
      async (args: { device: Homey.Device }) => {
        const store = args.device.getStore() as { starlingId: string };
        const hubManager = this.getHubManager();
        await hubManager.setDeviceProperty(store.starlingId, 'isPaused', true);
      }
    );

    // Return to dock
    this.homey.flow.getActionCard('return_to_dock').registerRunListener(
      async (args: { device: Homey.Device }) => {
        const store = args.device.getStore() as { starlingId: string };
        const hubManager = this.getHubManager();
        await hubManager.setDeviceProperty(store.starlingId, 'returnToDock', true);
      }
    );
  }
}

module.exports = RobotDriver;
