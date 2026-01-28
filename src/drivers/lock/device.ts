/**
 * Lock Device
 *
 * Represents a smart lock from Starling Hub with:
 * - Lock/Unlock control via targetLockState
 * - Current state monitoring (locked/unlocked/jammed)
 * - Jammed state alarm
 *
 * Flow triggers fired:
 * - lock_jammed: When currentState changes to 'jammed'
 * - lock_state_changed: When currentState changes
 */

import { StarlingDevice } from '../../lib/drivers';
import { Device, LockDevice } from '../../lib/api/types';

class LockDeviceClass extends StarlingDevice {
  /**
   * Register capability listeners
   */
  protected registerCapabilityListeners(): void {
    // Lock/Unlock control
    this.registerCapabilityListener('locked', async (value: boolean) => {
      const targetState = value ? 'locked' : 'unlocked';
      await this.setPropertyOptimistic('targetLockState', targetState, 'locked', value);
    });
  }

  /**
   * Handle state changes and fire flow triggers
   */
  protected handleStateChanges(device: Device): void {
    const lock = device as LockDevice;

    if (lock.currentState !== undefined) {
      const change = this.checkStateChange('currentState', lock.currentState);
      if (change) {
        // Fire state changed trigger with token
        void this.triggerFlow('lock_state_changed', { state: lock.currentState });

        // Fire jammed trigger on rising edge
        if (lock.currentState === 'jammed' && change.oldValue !== 'jammed') {
          void this.triggerFlow('lock_jammed');
        }
      }
      this.updatePreviousState('currentState', lock.currentState);
    }
  }

  /**
   * Map Starling device state to Homey capabilities
   */
  protected async mapStateToCapabilities(device: Device): Promise<void> {
    const lock = device as LockDevice;

    // Current lock state - use currentState for reading
    // currentState can be: "locked", "unlocked", "jammed"
    if (lock.currentState !== undefined) {
      const isLocked = lock.currentState === 'locked';
      await this.safeSetCapabilityValue('locked', isLocked);

      // Jammed alarm - true when lock is jammed
      if (this.hasCapability('alarm_generic')) {
        const isJammed = lock.currentState === 'jammed';
        await this.safeSetCapabilityValue('alarm_generic', isJammed);
      }
    }
  }

  /**
   * Called when the device is initialized
   */
  async onInit(): Promise<void> {
    // Ensure we have the jammed alarm capability
    await this.ensureCapability('alarm_generic');

    await super.onInit();
  }
}

module.exports = LockDeviceClass;
