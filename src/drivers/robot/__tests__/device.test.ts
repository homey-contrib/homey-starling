const RobotDevice = require('../device');

describe('RobotDevice capability mapping', () => {
  it('maps robot state to vacuum_state capability', async () => {
    const device = new RobotDevice();

    device.hasCapability = jest.fn().mockReturnValue(true);
    device.getCapabilityValue = jest.fn().mockReturnValue(undefined);
    device.setCapabilityValue = jest.fn().mockResolvedValue(undefined);

    await (device as {
      mapStateToCapabilities: (state: {
        isOn: boolean;
        state: string;
        batteryLevel: number;
      }) => Promise<void>;
    }).mapStateToCapabilities({
      isOn: true,
      state: 'docked',
      batteryLevel: 50,
    });

    expect(device.setCapabilityValue).toHaveBeenCalledWith('vacuum_state', 'docked');
  });
});
