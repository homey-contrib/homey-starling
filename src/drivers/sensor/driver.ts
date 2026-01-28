/**
 * Sensor Driver
 *
 * Handles multi-type sensors from Starling Hub including:
 * - Temperature sensors
 * - Humidity sensors
 * - Motion sensors
 * - Water leak sensors
 * - Air quality sensors (CO2)
 *
 * Capabilities are dynamically added based on sensor type.
 *
 * Flow cards:
 * - Triggers: water_leak_detected, water_leak_cleared, temperature_above, temperature_below, humidity_above, humidity_below
 * - Conditions: water_leak_is_detected, temperature_is_above, humidity_is_above
 */

import Homey from 'homey';
import { StarlingDriver } from '../../lib/drivers';
import { DeviceCategory, SensorDevice } from '../../lib/api/types';

class SensorDriver extends StarlingDriver {
  /**
   * Get the device category this driver handles
   */
  getDeviceCategory(): DeviceCategory {
    return 'sensor';
  }

  /**
   * Called when the driver is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();

    // Register flow card handlers
    this.registerConditions();
    this.registerTriggers();

    this.log('Sensor driver initialized');
  }

  /**
   * Register condition card handlers
   */
  private registerConditions(): void {
    // Water leak detected condition
    this.homey.flow.getConditionCard('water_leak_is_detected').registerRunListener(
      (args: { device: Homey.Device }) => {
        const sensor = this.getStarlingDeviceData<SensorDevice>(args.device);
        return sensor?.waterDetected ?? false;
      }
    );

    // Temperature is above condition
    this.homey.flow.getConditionCard('temperature_is_above').registerRunListener(
      (args: { device: Homey.Device; temperature: number }) => {
        const sensor = this.getStarlingDeviceData<SensorDevice>(args.device);
        return (sensor?.temperature ?? 0) > args.temperature;
      }
    );

    // Humidity is above condition
    this.homey.flow.getConditionCard('humidity_is_above').registerRunListener(
      (args: { device: Homey.Device; humidity: number }) => {
        const sensor = this.getStarlingDeviceData<SensorDevice>(args.device);
        return (sensor?.humidity ?? 0) > args.humidity;
      }
    );
  }

  /**
   * Register trigger card handlers for threshold triggers
   */
  private registerTriggers(): void {
    // Temperature above trigger with run listener for threshold check
    const tempAboveTrigger = this.homey.flow.getDeviceTriggerCard('temperature_above');
    tempAboveTrigger.registerRunListener(
      (args: { temperature: number }, state: { temperature: number }) => {
        return state.temperature > args.temperature;
      }
    );

    // Temperature below trigger
    const tempBelowTrigger = this.homey.flow.getDeviceTriggerCard('temperature_below');
    tempBelowTrigger.registerRunListener(
      (args: { temperature: number }, state: { temperature: number }) => {
        return state.temperature < args.temperature;
      }
    );

    // Humidity above trigger
    const humAboveTrigger = this.homey.flow.getDeviceTriggerCard('humidity_above');
    humAboveTrigger.registerRunListener(
      (args: { humidity: number }, state: { humidity: number }) => {
        return state.humidity > args.humidity;
      }
    );

    // Humidity below trigger
    const humBelowTrigger = this.homey.flow.getDeviceTriggerCard('humidity_below');
    humBelowTrigger.registerRunListener(
      (args: { humidity: number }, state: { humidity: number }) => {
        return state.humidity < args.humidity;
      }
    );
  }
}

module.exports = SensorDriver;
