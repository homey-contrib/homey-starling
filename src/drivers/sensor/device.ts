/**
 * Sensor Device
 *
 * Represents a multi-type sensor from Starling Hub.
 * Capabilities are dynamically added based on available sensor readings.
 *
 * Supported sensor types:
 * - Temperature: measure_temperature
 * - Humidity: measure_humidity
 * - Motion: alarm_motion
 * - Water leak: alarm_water
 * - Air quality: measure_co2
 *
 * All capabilities are read-only.
 *
 * Flow triggers fired:
 * - water_leak_detected: When waterDetected changes to true
 * - water_leak_cleared: When waterDetected changes to false
 * - temperature_above: When temperature changes (run listener filters by threshold)
 * - temperature_below: When temperature changes (run listener filters by threshold)
 * - humidity_above: When humidity changes (run listener filters by threshold)
 * - humidity_below: When humidity changes (run listener filters by threshold)
 */

import { StarlingDevice } from '../../lib/drivers';
import { Device, SensorDevice } from '../../lib/api/types';

class SensorDeviceClass extends StarlingDevice {
  /**
   * Register capability listeners
   * Note: All sensor capabilities are read-only
   */
  protected registerCapabilityListeners(): void {
    // No writable capabilities - all are read-only sensors
  }

  /**
   * Handle state changes and fire flow triggers
   */
  protected handleStateChanges(device: Device): void {
    const sensor = device as SensorDevice;

    // Water leak triggers (fire on both edges)
    this.triggerOnBothEdges('waterDetected', sensor.waterDetected, 'water_leak_detected', 'water_leak_cleared');

    // Temperature threshold triggers - fire on any change, run listener filters
    if (sensor.temperature !== undefined) {
      const change = this.checkStateChange('temperature', sensor.temperature);
      if (change && change.oldValue !== undefined) {
        // Fire both triggers with state - run listeners will filter
        void this.triggerFlowWithState('temperature_above', {}, { temperature: sensor.temperature });
        void this.triggerFlowWithState('temperature_below', {}, { temperature: sensor.temperature });
      }
      this.updatePreviousState('temperature', sensor.temperature);
    }

    // Humidity threshold triggers
    if (sensor.humidity !== undefined) {
      const change = this.checkStateChange('humidity', sensor.humidity);
      if (change && change.oldValue !== undefined) {
        void this.triggerFlowWithState('humidity_above', {}, { humidity: sensor.humidity });
        void this.triggerFlowWithState('humidity_below', {}, { humidity: sensor.humidity });
      }
      this.updatePreviousState('humidity', sensor.humidity);
    }
  }

  /**
   * Fire a flow trigger with state object for run listener filtering
   */
  private async triggerFlowWithState(
    triggerId: string,
    tokens: Record<string, string | number | boolean>,
    state: Record<string, unknown>
  ): Promise<void> {
    try {
      const triggerCard = this.homey.flow.getDeviceTriggerCard(triggerId);
      await triggerCard.trigger(this, tokens, state);
    } catch (error) {
      this.error(`Failed to trigger flow ${triggerId}:`, error);
    }
  }

  /**
   * Map Starling device state to Homey capabilities
   */
  protected async mapStateToCapabilities(device: Device): Promise<void> {
    const sensor = device as SensorDevice;

    // Temperature
    if (sensor.temperature !== undefined && this.hasCapability('measure_temperature')) {
      await this.safeSetCapabilityValue('measure_temperature', sensor.temperature);
    }

    // Humidity
    if (sensor.humidity !== undefined && this.hasCapability('measure_humidity')) {
      await this.safeSetCapabilityValue('measure_humidity', sensor.humidity);
    }

    // Motion
    if (sensor.motionDetected !== undefined && this.hasCapability('alarm_motion')) {
      await this.safeSetCapabilityValue('alarm_motion', sensor.motionDetected);
    }

    // Water leak
    if (sensor.waterDetected !== undefined && this.hasCapability('alarm_water')) {
      await this.safeSetCapabilityValue('alarm_water', sensor.waterDetected);
    }

    // CO2 level (air quality)
    if (sensor.co2Level !== undefined && this.hasCapability('measure_co2')) {
      await this.safeSetCapabilityValue('measure_co2', sensor.co2Level);
    }
  }

  /**
   * Called when the device is initialized
   */
  async onInit(): Promise<void> {
    // Call base class first to set up starlingId, hubConnection, etc.
    await super.onInit();

    const device = this.getStarlingDevice() as SensorDevice | undefined;

    if (device) {
      // Dynamically add capabilities based on available sensor data
      if (device.temperature !== undefined) {
        await this.ensureCapability('measure_temperature');
      }

      if (device.humidity !== undefined) {
        await this.ensureCapability('measure_humidity');
      }

      if (device.motionDetected !== undefined) {
        await this.ensureCapability('alarm_motion');
      }

      if (device.waterDetected !== undefined) {
        await this.ensureCapability('alarm_water');
      }

      if (device.co2Level !== undefined) {
        await this.ensureCapability('measure_co2');
      }
    }
  }
}

module.exports = SensorDeviceClass;
