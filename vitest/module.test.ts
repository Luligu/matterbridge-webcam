/**
 * @file vitest/module.test.ts
 * @description This file contains the tests for the WebcamPlatform.
 * @author Luca Liguori
 */

const NAME = 'Platform';
const MATTER_PORT = 6000;

import { EventEmitter } from 'node:events';

import type { PlatformMatterbridge } from 'matterbridge';
import { log, loggerErrorSpy, loggerFatalSpy, loggerInfoSpy, loggerWarnSpy, setDebug, setupTest } from 'matterbridge/vitest-utils';
import {
  addMatterbridge,
  createServerNode,
  createTestEnvironment,
  destroyTestEnvironment,
  getMatterbridge,
  startServerNode,
  stopServerNode,
} from 'matterbridge/vitest-utils/matter';

import initializePlugin, { WebcamPlatform } from '../src/module.js';
import type { WebcamPlatformConfig } from '../src/module.js';

const behaviors = vi.hoisted(() => ({
  hasFfmpeg: vi.fn(() => true),
  installFfmpeg: vi.fn(async () => true),
  listWebcams: vi.fn(async () => [] as string[]),
  playWebcam: vi.fn(),
}));

vi.mock('matterbridge/behaviors', () => behaviors);

await setupTest(NAME);

/**
 * Creates a fake ffplay process.
 *
 * @returns {EventEmitter & { kill: ReturnType<typeof vi.fn> }} The fake process.
 */
function createFakePlayer(): EventEmitter & { kill: ReturnType<typeof vi.fn> } {
  return Object.assign(new EventEmitter(), { kill: vi.fn() });
}

describe('TestPlatform', () => {
  let matterbridge: PlatformMatterbridge;
  let platform: WebcamPlatform;

  const config: WebcamPlatformConfig = {
    name: 'matterbridge-webcam',
    type: 'DynamicPlatform',
    version: '1.0.0',
    installFfmpeg: true,
    webcams: {},
    debug: false,
    unregisterOnShutdown: false,
  };

  beforeAll(async () => {
    // Create Matterbridge environment
    await createTestEnvironment();
    await createServerNode(MATTER_PORT);
    await startServerNode();
    matterbridge = getMatterbridge();
  });

  beforeEach(() => {
    // Reset the mock calls before each test
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // No errors logged during tests
    expect(loggerWarnSpy).not.toHaveBeenCalled();
    expect(loggerErrorSpy).not.toHaveBeenCalled();
    expect(loggerFatalSpy).not.toHaveBeenCalled();
    // Clear debug
    await setDebug(false);
  });

  afterAll(async () => {
    // Destroy Matterbridge environment
    await stopServerNode();
    await destroyTestEnvironment();
    // Restore all mocks
    vi.restoreAllMocks();
  });

  it('should throw error in load when version is not valid', () => {
    expect(() => initializePlugin({ ...matterbridge, matterbridgeVersion: '1.0.0' }, log, config)).toThrow(
      'This plugin requires Matterbridge version >= "3.10.13". Please update Matterbridge to the latest version in the frontend.',
    );
  });

  it('should initialize platform with config name', () => {
    platform = new WebcamPlatform(matterbridge, log, config);
    addMatterbridge(platform);
    expect(loggerInfoSpy).toHaveBeenCalledWith(`Initializing platform ${config.name}...`);
    expect(loggerInfoSpy).toHaveBeenCalledWith(`Platform ${config.name} initialized successfully`);
  });

  it('should call onStart with reason', async () => {
    await platform.onStart('Test reason');
    expect(loggerInfoSpy).toHaveBeenCalledWith(`Starting platform ${config.name} with reason: Test reason...`);
  });

  it('should call onConfigure', async () => {
    await platform.onConfigure();
    expect(loggerInfoSpy).toHaveBeenCalledWith(`Configuring platform ${config.name}...`);
  });

  it('should log at info level when onConfigChanged is called', async () => {
    await platform.onConfigChanged({ ...config });
    expect(loggerInfoSpy).toHaveBeenCalledWith(`The config of platform ${config.name} has been changed`);
  });

  it('should install ffmpeg on start when running in docker and ffmpeg is missing', async () => {
    const dockerMatterbridge = { ...matterbridge, restartMode: 'docker' } as PlatformMatterbridge;
    const dockerPlatform = new WebcamPlatform(dockerMatterbridge, log, { ...config });
    const snackbarSpy = vi.spyOn(dockerPlatform, 'wssSendSnackbarMessage').mockImplementation(() => {});
    behaviors.hasFfmpeg.mockReturnValue(false);

    await dockerPlatform.onStart();
    expect(behaviors.installFfmpeg).toHaveBeenCalledTimes(1);
    expect(loggerInfoSpy).toHaveBeenCalledWith('ffmpeg installed successfully');
    expect(snackbarSpy).toHaveBeenCalledWith('Installing ffmpeg...', 10, 'info');
    expect(snackbarSpy).toHaveBeenCalledWith('ffmpeg installed successfully', 10, 'success');

    snackbarSpy.mockClear();
    behaviors.installFfmpeg.mockResolvedValueOnce(false);
    await dockerPlatform.onStart();
    expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to install ffmpeg: install it manually in the container');
    expect(snackbarSpy).toHaveBeenCalledWith('Failed to install ffmpeg: install it manually in the container', 0, 'error');
    loggerErrorSpy.mockClear();
    behaviors.hasFfmpeg.mockReturnValue(true);
  });

  it('should register a camera for each webcam on start', async () => {
    const webcamPlatform = new WebcamPlatform(matterbridge, log, {
      ...config,
      webcams: {
        'Front Cam': { videoSource: '0', audioSource: '1' },
        'Desk Cam': { videoSource: '2', audioSource: '' },
      },
    });
    const registerSpy = vi.spyOn(webcamPlatform, 'registerDevice').mockResolvedValue();
    vi.spyOn(webcamPlatform, 'validateDevice').mockReturnValue(true);

    await webcamPlatform.onStart();
    expect(registerSpy).toHaveBeenCalledTimes(2);
    const [front, desk] = registerSpy.mock.calls.map(([device]) => device);
    expect(front.deviceName).toBe('Front Cam');
    expect(front.serialNumber).toBe('WEBCAM-e1c174bd41f0c89c');
    expect(desk.deviceName).toBe('Desk Cam');
    expect(desk.serialNumber).toBe('WEBCAM-c94623e15ec170a0');
  });

  it('should not register a camera that is not valid on start', async () => {
    const webcamPlatform = new WebcamPlatform(matterbridge, log, { ...config, webcams: { 'Front Cam': { videoSource: '0', audioSource: '' } } });
    const registerSpy = vi.spyOn(webcamPlatform, 'registerDevice').mockResolvedValue();
    const validateSpy = vi.spyOn(webcamPlatform, 'validateDevice').mockReturnValue(false);

    await webcamPlatform.onStart();
    expect(validateSpy).toHaveBeenCalledWith(['Front Cam', 'WEBCAM-e1c174bd41f0c89c']);
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it('should use a hashed serial number and truncate the name of a camera to 32 characters', async () => {
    const longName = 'A very long webcam name that exceeds the Matter limit';
    const webcamPlatform = new WebcamPlatform(matterbridge, log, { ...config, webcams: { [longName]: { videoSource: '0', audioSource: '' } } });
    const registerSpy = vi.spyOn(webcamPlatform, 'registerDevice').mockResolvedValue();
    vi.spyOn(webcamPlatform, 'validateDevice').mockReturnValue(true);

    await webcamPlatform.onStart();
    const [device] = registerSpy.mock.calls[0];
    expect(device.serialNumber).toBe('WEBCAM-fe474456c3a22447');
    expect(device.deviceName).toBe('A very long webcam name that exc');
  });

  it('should normalize missing config values when constructed', () => {
    const bare = { name: 'bare', type: 'DynamicPlatform', version: '1.0.0' } as unknown as WebcamPlatformConfig;
    const barePlatform = new WebcamPlatform(matterbridge, log, bare);
    expect(barePlatform.config.installFfmpeg).toBe(true);
    expect(barePlatform.config.webcams).toEqual({});
    expect(barePlatform.config.debug).toBe(false);
    expect(barePlatform.config.unregisterOnShutdown).toBe(false);
  });

  it('should return an empty list when discovering webcams without ffmpeg', async () => {
    behaviors.hasFfmpeg.mockReturnValueOnce(false);
    expect(await platform.discoverWebcams()).toEqual([]);
    expect(loggerErrorSpy).toHaveBeenCalledWith('Cannot discover webcams: ffmpeg is not installed');
    loggerErrorSpy.mockClear();
  });

  it('should add only new webcams when discovering webcams', async () => {
    const saveSpy = vi.spyOn(platform, 'saveConfig').mockImplementation(() => {});
    const snackbarSpy = vi.spyOn(platform, 'wssSendSnackbarMessage').mockImplementation(() => {});
    platform.config.webcams = { Known: { videoSource: 'Known', audioSource: '' } };
    behaviors.listWebcams.mockResolvedValueOnce(['Known', 'New']);

    expect(await platform.discoverWebcams()).toEqual(['Known', 'New']);
    expect(platform.config.webcams).toEqual({
      Known: { videoSource: 'Known', audioSource: '' },
      New: { videoSource: 'New', audioSource: '' },
    });
    expect(snackbarSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('should warn and not save when no webcams are discovered', async () => {
    const saveSpy = vi.spyOn(platform, 'saveConfig').mockImplementation(() => {});
    behaviors.listWebcams.mockResolvedValueOnce([]);

    expect(await platform.discoverWebcams()).toEqual([]);
    expect(loggerWarnSpy).toHaveBeenCalledWith('No webcams discovered');
    expect(saveSpy).not.toHaveBeenCalled();
    loggerWarnSpy.mockClear();
  });

  it('should log an error when the webcam discovery fails', async () => {
    behaviors.listWebcams.mockRejectedValueOnce(new Error('boom'));
    expect(await platform.discoverWebcams()).toEqual([]);
    expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to discover webcams: boom');
    loggerErrorSpy.mockClear();
  });

  it('should not play a webcam without ffmpeg or without a video source', () => {
    behaviors.hasFfmpeg.mockReturnValueOnce(false);
    expect(platform.playWebcam('Cam', { videoSource: 'Cam', audioSource: '' })).toBeUndefined();
    expect(loggerErrorSpy).toHaveBeenCalledWith('Cannot play webcam Cam: ffmpeg is not installed');

    expect(platform.playWebcam('Cam', { videoSource: '', audioSource: '' })).toBeUndefined();
    expect(loggerErrorSpy).toHaveBeenCalledWith('Cannot play webcam Cam: the video source is empty');
    expect(behaviors.playWebcam).not.toHaveBeenCalled();
    loggerErrorSpy.mockClear();
  });

  it('should play a webcam and replace the previous player', () => {
    const first = createFakePlayer();
    const second = createFakePlayer();
    behaviors.playWebcam.mockReturnValueOnce(first).mockReturnValueOnce(second);

    expect(platform.playWebcam('Cam', { videoSource: 'Cam', audioSource: 'Mic' })).toBe(first);
    expect(behaviors.playWebcam).toHaveBeenCalledWith('Cam', 'Mic');
    expect(loggerInfoSpy).toHaveBeenCalledWith('Playing webcam Cam video source Cam audio source Mic...');

    expect(platform.playWebcam('Cam', { videoSource: 'Cam', audioSource: '' })).toBe(second);
    // oxlint-disable-next-line unicorn/no-useless-undefined
    expect(behaviors.playWebcam).toHaveBeenLastCalledWith('Cam', undefined);
    expect(first.kill).toHaveBeenCalledTimes(1);

    first.emit('exit', 0);
    expect(second.kill).not.toHaveBeenCalled();
    second.emit('error', new Error('failed'));
    expect(loggerErrorSpy).toHaveBeenCalledWith('Player of webcam Cam failed: failed');
    loggerErrorSpy.mockClear();
    second.emit('exit', 1);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Player of webcam Cam exited with code 1');
  });

  it('should kill the running players on shutdown', async () => {
    const player = createFakePlayer();
    behaviors.playWebcam.mockReturnValueOnce(player);
    platform.playWebcam('Cam', { videoSource: 'Cam', audioSource: '' });

    await platform.onShutdown();
    expect(player.kill).toHaveBeenCalledTimes(1);
  });

  it('should handle the discoverWebcams and play actions', async () => {
    const discoverSpy = vi.spyOn(platform, 'discoverWebcams').mockResolvedValue([]);
    // oxlint-disable-next-line unicorn/no-useless-undefined
    const playSpy = vi.spyOn(platform, 'playWebcam').mockReturnValue(undefined);
    platform.config.webcams = { Cam: { videoSource: 'Cam', audioSource: '' } };

    await platform.onAction('discoverWebcams');
    expect(discoverSpy).toHaveBeenCalledTimes(1);

    await platform.onAction('play', 'true', 'root_webcams_Cam_play');
    expect(playSpy).toHaveBeenCalledWith('Cam', { videoSource: 'Cam', audioSource: '' });

    const formData = { ...config, webcams: { Other: { videoSource: 'Other', audioSource: '' } } };
    await platform.onAction('play', undefined, 'root_webcams_Other_play', formData);
    expect(playSpy).toHaveBeenLastCalledWith('Other', { videoSource: 'Other', audioSource: '' });

    await platform.onAction('play', undefined, 'root_webcams_Missing_play');
    expect(loggerErrorSpy).toHaveBeenCalledWith('Cannot play webcam Missing: not found');
    loggerErrorSpy.mockClear();
  });

  it('should call onShutdown with reason', async () => {
    await platform.onShutdown('Test reason');
    expect(loggerInfoSpy).toHaveBeenCalledWith(`Shutting down platform ${config.name} with reason: Test reason...`);
  });

  it('should restart and unregister devices if configured', async () => {
    platform = new WebcamPlatform(matterbridge, log, config);
    addMatterbridge(platform);
    expect(loggerInfoSpy).toHaveBeenCalledWith(`Initializing platform ${config.name}...`);
    expect(loggerInfoSpy).toHaveBeenCalledWith(`Platform ${config.name} initialized successfully`);

    await platform.onStart();
    expect(loggerInfoSpy).toHaveBeenCalledWith(`Starting platform ${config.name} with reason: no reason provided...`);

    const unregisterSpy = vi.spyOn(platform, 'unregisterAllDevices').mockResolvedValue();
    platform.config.unregisterOnShutdown = true;
    await platform.onShutdown();
    expect(loggerInfoSpy).toHaveBeenCalledWith(`Shutting down platform ${config.name} with reason: no reason provided...`);
    expect(unregisterSpy).toHaveBeenCalled();
  });
});
