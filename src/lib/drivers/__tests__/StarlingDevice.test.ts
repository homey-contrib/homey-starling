import { StarlingDevice } from '../StarlingDevice';
import { Device } from '../../api/types';
import { DeviceStateChange } from '../../hub/types';

class TestDevice extends StarlingDevice {
  public syncCalls = 0;

  protected registerCapabilityListeners(): void {
    // No-op for tests
  }

  protected async mapStateToCapabilities(_device: Device): Promise<void> {
    // No-op for tests
  }

  // Override to avoid Homey interactions in tests
  protected async syncDeviceState(): Promise<void> {
    this.syncCalls += 1;
  }

  public async testSetPropertyOptimistic(
    property: string,
    value: unknown,
    capability: string,
    expectedValue?: unknown
  ): Promise<void> {
    return this.setPropertyOptimistic(property, value, capability, expectedValue);
  }

  public async testProcessStateChange(change: DeviceStateChange): Promise<void> {
    return (this as unknown as { processStateChange: (c: DeviceStateChange) => Promise<void> }).processStateChange(change);
  }
}

describe('StarlingDevice optimistic updates', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createDevice(): TestDevice {
    const device = new TestDevice() as any;

    device.homey = {
      __: (key: string) => key,
      notifications: {
        createNotification: jest.fn().mockResolvedValue(undefined),
      },
    };
    device.hubConnection = {};
    device.hubManager = {
      setDeviceProperty: jest.fn().mockResolvedValue(undefined),
    };
    device.starlingId = 'device-1';
    device.setCapabilityValue = jest.fn().mockResolvedValue(undefined);
    device.getCapabilityValue = jest.fn().mockReturnValue(false);
    device.hasCapability = jest.fn().mockReturnValue(true);
    device.getAvailable = jest.fn().mockReturnValue(true);
    device.setAvailable = jest.fn();
    device.setUnavailable = jest.fn();

    return device as TestDevice;
  }

  it('clears timeout when property confirmation matches property value', async () => {
    const device = createDevice();

    await device.testSetPropertyOptimistic('quietTime', true, 'onoff', false);

    const change: DeviceStateChange = {
      hubId: 'hub-1',
      device: { id: 'device-1' } as Device,
      changes: [
        {
          property: 'quietTime',
          oldValue: false,
          newValue: true,
        },
      ],
      timestamp: new Date(),
    };

    await device.testProcessStateChange(change);

    expect(device.syncCalls).toBe(1);

    jest.advanceTimersByTime(15000);
    await Promise.resolve();

    expect(device.syncCalls).toBe(1);
  });

  it('triggers a state refresh when optimistic update times out', async () => {
    const device = createDevice();

    await device.testSetPropertyOptimistic('quietTime', true, 'onoff', false);

    expect(device.syncCalls).toBe(0);

    jest.advanceTimersByTime(15000);
    await Promise.resolve();

    expect(device.syncCalls).toBe(1);
  });
});
