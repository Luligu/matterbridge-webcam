/**
 * @file vitest/module.test.ts
 * @description This file contains the tests for the WebcamPlatform.
 * @author Luca Liguori
 */

const NAME = 'Platform';
const MATTER_PORT = 6000;

import type { PlatformConfig, PlatformMatterbridge } from 'matterbridge';
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

await setupTest(NAME);

describe('TestPlatform', () => {
  let matterbridge: PlatformMatterbridge;
  let platform: WebcamPlatform;

  const config: PlatformConfig = {
    name: 'matterbridge-webcam',
    type: 'DynamicPlatform',
    version: '1.0.0',
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
      'This plugin requires Matterbridge version >= "3.10.10". Please update Matterbridge to the latest version in the frontend.',
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
