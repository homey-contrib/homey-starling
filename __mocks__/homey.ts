/**
 * Manual mock for Homey SDK
 * Jest will automatically use this when 'homey' is imported in tests
 */

const mockSettings = new Map<string, unknown>();

class MockApp {
  homey = {
    settings: {
      get: (key: string) => mockSettings.get(key),
      set: (key: string, value: unknown) => mockSettings.set(key, value),
      on: jest.fn(),
      off: jest.fn(),
    },
    __: (key: string) => key,
  };

  log = jest.fn();
  error = jest.fn();
}

class MockDriver {
  homey = {
    settings: {
      get: (key: string) => mockSettings.get(key),
      set: (key: string, value: unknown) => mockSettings.set(key, value),
    },
    __: (key: string) => key,
  };

  log = jest.fn();
  error = jest.fn();
}

class MockDevice {
  homey = {
    settings: {
      get: (key: string) => mockSettings.get(key),
      set: (key: string, value: unknown) => mockSettings.set(key, value),
    },
    __: (key: string) => key,
  };

  log = jest.fn();
  error = jest.fn();

  setCapabilityValue = jest.fn();
  getCapabilityValue = jest.fn();
  hasCapability = jest.fn();
  setAvailable = jest.fn();
  setUnavailable = jest.fn();
}

export default {
  App: MockApp,
  Driver: MockDriver,
  Device: MockDevice,
};

export { MockApp as App, MockDriver as Driver, MockDevice as Device };
