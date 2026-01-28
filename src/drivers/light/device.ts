/**
 * Light Device
 *
 * Represents a light from Starling Hub with support for:
 * - On/Off control
 * - Brightness dimming (0-100)
 * - HSV color (hue 0-360, saturation 0-100)
 * - Color temperature (mired)
 *
 * Handles unified color/temperature mode switching:
 * - Setting color clears color temperature mode
 * - Setting color temperature clears color mode
 */

import { StarlingDevice } from '../../lib/drivers';
import { Device, LightDevice } from '../../lib/api/types';

class LightDeviceClass extends StarlingDevice {
  /**
   * Register capability listeners
   */
  protected registerCapabilityListeners(): void {
    // On/Off
    this.registerCapabilityListener('onoff', async (value: boolean) => {
      await this.setPropertyOptimistic('isOn', value, 'onoff');
    });

    // Brightness (dim)
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (value: number) => {
        // Homey dim is 0-1, Starling brightness is 0-100
        const brightness = Math.round(value * 100);
        await this.setPropertyOptimistic('brightness', brightness, 'dim', value);
      });
    }

    // Hue
    if (this.hasCapability('light_hue')) {
      this.registerCapabilityListener('light_hue', async (value: number) => {
        // Homey hue is 0-1, Starling hue is 0-360
        const hue = Math.round(value * 360);
        await this.setPropertyOptimistic('hue', hue, 'light_hue', value);
      });
    }

    // Saturation
    if (this.hasCapability('light_saturation')) {
      this.registerCapabilityListener('light_saturation', async (value: number) => {
        // Homey saturation is 0-1, Starling saturation is 0-100
        const saturation = Math.round(value * 100);
        await this.setPropertyOptimistic('saturation', saturation, 'light_saturation', value);
      });
    }

    // Color temperature
    if (this.hasCapability('light_temperature')) {
      this.registerCapabilityListener('light_temperature', async (value: number) => {
        // Homey temperature is 0-1 (cold to warm)
        // Starling uses mired (typically 153-500)
        // Convert: 0 = 153 mired (coldest), 1 = 500 mired (warmest)
        const mired = Math.round(153 + value * (500 - 153));
        await this.setPropertyOptimistic('colorTemperature', mired, 'light_temperature', value);
      });
    }
  }

  /**
   * Map Starling device state to Homey capabilities
   */
  protected async mapStateToCapabilities(device: Device): Promise<void> {
    const light = device as LightDevice;

    // On/Off
    await this.safeSetCapabilityValue('onoff', light.isOn);

    // Brightness
    if (light.brightness !== undefined && this.hasCapability('dim')) {
      await this.safeSetCapabilityValue('dim', light.brightness / 100);
    }

    // Color (HSV)
    if (light.supportsColor) {
      if (light.hue !== undefined && this.hasCapability('light_hue')) {
        await this.safeSetCapabilityValue('light_hue', light.hue / 360);
      }
      if (light.saturation !== undefined && this.hasCapability('light_saturation')) {
        await this.safeSetCapabilityValue('light_saturation', light.saturation / 100);
      }
    }

    // Color temperature
    if (light.supportsColorTemperature && light.colorTemperature !== undefined) {
      if (this.hasCapability('light_temperature')) {
        // Convert mired to 0-1 range
        const temp = (light.colorTemperature - 153) / (500 - 153);
        await this.safeSetCapabilityValue('light_temperature', Math.max(0, Math.min(1, temp)));
      }
    }
  }

  /**
   * Called when the device is initialized
   */
  async onInit(): Promise<void> {
    // Call base class first to set up starlingId, hubConnection, etc.
    await super.onInit();

    // Add capabilities dynamically based on light features
    const device = this.getStarlingDevice() as LightDevice | undefined;

    if (device) {
      // Always have dim for lights with brightness
      if (device.brightness !== undefined) {
        await this.ensureCapability('dim');
      }

      // Color capabilities
      if (device.supportsColor) {
        await this.ensureCapability('light_hue');
        await this.ensureCapability('light_saturation');
      }

      // Color temperature
      if (device.supportsColorTemperature) {
        await this.ensureCapability('light_temperature');
      }
    }
  }
}

module.exports = LightDeviceClass;
