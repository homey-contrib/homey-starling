/**
 * Garage Door Device
 *
 * Represents a garage door from Starling Hub.
 *
 * State mapping:
 * - Starling doorState: 'open' | 'closed' | 'opening' | 'closing'
 * - Homey garagedoor_closed: boolean (true = closed, false = open)
 *
 * Features:
 * - Open/Close control via garagedoor_closed capability
 * - Obstruction detection alarm
 *
 * Flow triggers fired:
 * - obstruction_detected: When obstructionDetected changes to true
 * - obstruction_cleared: When obstructionDetected changes to false
 * - door_opened: When doorState changes to 'open'
 * - door_closed: When doorState changes to 'closed'
 */

import { StarlingDevice } from '../../lib/drivers';
import { Device, GarageDevice } from '../../lib/api/types';

class GarageDeviceClass extends StarlingDevice {
  /**
   * Register capability listeners
   */
  protected registerCapabilityListeners(): void {
    // Garage door control
    // garagedoor_closed = true means closed, false means open
    this.registerCapabilityListener('garagedoor_closed', async (value: boolean) => {
      const targetState = value ? 'closed' : 'open';
      await this.setPropertyOptimistic('doorState', targetState, 'garagedoor_closed', value);
    });
  }

  /**
   * Handle state changes and fire flow triggers
   */
  protected handleStateChanges(device: Device): void {
    const garage = device as GarageDevice;

    // Door state triggers
    if (garage.doorState !== undefined) {
      const change = this.checkStateChange('doorState', garage.doorState);
      if (change) {
        if (garage.doorState === 'open' && change.oldValue !== 'open') {
          void this.triggerFlow('door_opened');
        } else if (garage.doorState === 'closed' && change.oldValue !== 'closed') {
          void this.triggerFlow('door_closed');
        }
      }
      this.updatePreviousState('doorState', garage.doorState);
    }

    // Obstruction detection triggers (fire on both edges)
    this.triggerOnBothEdges('obstructionDetected', garage.obstructionDetected, 'obstruction_detected', 'obstruction_cleared');
  }

  /**
   * Map Starling device state to Homey capabilities
   */
  protected async mapStateToCapabilities(device: Device): Promise<void> {
    const garage = device as GarageDevice;

    // Door state
    if (garage.doorState !== undefined) {
      // Map state to closed boolean
      // 'closed' → true, 'open'/'opening'/'closing' → false
      const isClosed = garage.doorState === 'closed';
      await this.safeSetCapabilityValue('garagedoor_closed', isClosed);
    }

    // Obstruction detection
    if (garage.obstructionDetected !== undefined && this.hasCapability('alarm_generic')) {
      await this.safeSetCapabilityValue('alarm_generic', garage.obstructionDetected);
    }
  }

  /**
   * Called when the device is initialized
   */
  async onInit(): Promise<void> {
    // Add obstruction alarm capability
    await this.ensureCapability('alarm_generic');

    await super.onInit();
  }
}

module.exports = GarageDeviceClass;
