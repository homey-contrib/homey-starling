const ThermostatDeviceClass = require('../device');

import { ThermostatDevice } from '../../../lib/api/types';

describe('ThermostatDevice capability handling', () => {
  it('maps presetSelected to known and custom values', async () => {
    const device = new ThermostatDeviceClass();

    device.hasCapability = jest.fn((cap: string) => cap === 'thermostat_preset');
    device.getCapabilityValue = jest.fn().mockReturnValue(undefined);
    device.setCapabilityValue = jest.fn().mockResolvedValue(undefined);

    const thermostatKnown: ThermostatDevice = {
      id: 't-1',
      name: 'Thermostat',
      model: 'Model',
      category: 'thermostat',
      roomName: 'Room',
      structureName: 'Home',
      isOnline: true,
      currentTemperature: 21,
      targetTemperature: 22,
      hvacMode: 'heat',
      hvacState: 'heating',
      canHeat: true,
      canCool: false,
      canHeatCool: false,
      presetSelected: 'Eco',
    };

    await (device as unknown as { mapStateToCapabilities: (d: ThermostatDevice) => Promise<void> }).mapStateToCapabilities(thermostatKnown);
    expect(device.setCapabilityValue).toHaveBeenCalledWith('thermostat_preset', 'eco');

    const thermostatCustom: ThermostatDevice = {
      ...thermostatKnown,
      presetSelected: 'MyPreset',
    };

    await (device as unknown as { mapStateToCapabilities: (d: ThermostatDevice) => Promise<void> }).mapStateToCapabilities(thermostatCustom);
    expect(device.setCapabilityValue).toHaveBeenCalledWith('thermostat_preset', 'custom');
  });

  it('sets presetSelected for supported presets and rejects unsupported values', async () => {
    const device = new ThermostatDeviceClass() as unknown as {
      hasCapability: jest.Mock;
      registerCapabilityListener: jest.Mock;
      setPropertyOptimistic: jest.Mock;
      getStarlingDevice: jest.Mock;
      homey: { __: (key: string, vars?: Record<string, string>) => string };
    };

    const handlers: Record<string, (value: string) => Promise<void>> = {};

    device.homey = {
      __: (key: string) => key,
    };

    device.hasCapability = jest.fn((cap: string) => cap === 'thermostat_preset');
    device.registerCapabilityListener = jest.fn((cap: string, handler: (value: string) => Promise<void>) => {
      handlers[cap] = handler;
    });
    device.setPropertyOptimistic = jest.fn().mockResolvedValue(undefined);
    device.getStarlingDevice = jest.fn().mockReturnValue({
      presetsAvailable: 'Eco, Sleep, Comfort',
      presetSelected: 'Eco',
    });

    await (device as unknown as { registerCapabilityListeners: () => void }).registerCapabilityListeners();

    await handlers.thermostat_preset('eco');
    expect(device.setPropertyOptimistic).toHaveBeenCalledWith('presetSelected', 'Eco', 'thermostat_preset', 'eco');

    await expect(handlers.thermostat_preset('custom')).rejects.toThrow('errors.thermostat_preset_custom_not_settable');
    await expect(handlers.thermostat_preset('none')).rejects.toThrow('errors.thermostat_preset_clear_requires_temp');
  });

  it('maps hvac_state and thermostat_preset capabilities', async () => {
    const device = new ThermostatDeviceClass();

    device.hasCapability = jest.fn((cap: string) => cap === 'hvac_state' || cap === 'thermostat_preset');
    device.getCapabilityValue = jest.fn().mockReturnValue(undefined);
    device.setCapabilityValue = jest.fn().mockResolvedValue(undefined);

    const thermostat: ThermostatDevice = {
      id: 't-1',
      name: 'Thermostat',
      model: 'Model',
      category: 'thermostat',
      roomName: 'Room',
      structureName: 'Home',
      isOnline: true,
      currentTemperature: 21,
      targetTemperature: 22,
      hvacMode: 'heat',
      hvacState: 'heating',
      canHeat: true,
      canCool: false,
      canHeatCool: false,
      ecoMode: true,
      presetSelected: '',
    };

    await (device as unknown as { mapStateToCapabilities: (d: ThermostatDevice) => Promise<void> }).mapStateToCapabilities(thermostat);

    expect(device.setCapabilityValue).toHaveBeenCalledWith('hvac_state', 'heating');
    expect(device.setCapabilityValue).toHaveBeenCalledWith('thermostat_preset', 'none');
  });
});
