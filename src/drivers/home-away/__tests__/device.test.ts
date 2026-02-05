const HomeAwayDevice = require('../device');

describe('HomeAwayDevice flow triggers', () => {
  const makeDevice = () => {
    const device = new HomeAwayDevice();
    const trigger = jest.fn().mockResolvedValue(undefined);
    const getDeviceTriggerCard = jest.fn(() => ({ trigger }));
    const app = { triggerHomeAwayChanged: jest.fn() };

    device.homey = {
      flow: { getDeviceTriggerCard },
      app,
      __: (key: string) => key,
    };

    device.log = jest.fn();
    device.error = jest.fn();

    return { device, getDeviceTriggerCard, trigger, app };
  };

  it('fires changed_to_away when mode changes to away', () => {
    const { device, getDeviceTriggerCard, trigger, app } = makeDevice();

    (device as { previousState: Map<string, unknown> }).previousState = new Map([
      ['mode', 'home'],
    ]);

    (device as { handleStateChanges: (state: { mode: string }) => void }).handleStateChanges({
      mode: 'away',
    });

    expect(app.triggerHomeAwayChanged).toHaveBeenCalledWith('away');
    expect(getDeviceTriggerCard).toHaveBeenCalledWith('changed_to_away');
    expect(trigger).toHaveBeenCalled();
  });

  it('fires changed_to_home when mode changes to home', () => {
    const { device, getDeviceTriggerCard, trigger, app } = makeDevice();

    (device as { previousState: Map<string, unknown> }).previousState = new Map([
      ['mode', 'away'],
    ]);

    (device as { handleStateChanges: (state: { mode: string }) => void }).handleStateChanges({
      mode: 'home',
    });

    expect(app.triggerHomeAwayChanged).toHaveBeenCalledWith('home');
    expect(getDeviceTriggerCard).toHaveBeenCalledWith('changed_to_home');
    expect(trigger).toHaveBeenCalled();
  });
});
