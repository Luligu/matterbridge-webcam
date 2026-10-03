/**
 * @file src/module.ts
 * @description This file contains the class WebcamPlatform.
 * @author Luca Liguori
 * @created 2026-07-26
 * @version 1.0.0
 * @license Apache-2.0
 *
 * Copyright 2026, 2027, 2028 Luca Liguori.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ChildProcess } from 'node:child_process';

import { MatterbridgeDynamicPlatform } from 'matterbridge';
import type { PlatformConfig, PlatformMatterbridge } from 'matterbridge';
import { hasFfmpeg, installFfmpeg, listWebcams, playWebcam } from 'matterbridge/behaviors';
import type { AnsiLogger } from 'matterbridge/logger';
import { getErrorMessage } from 'matterbridge/utils';

/** The configuration of a webcam. */
export type WebcamConfig = {
  /** The video source: the device name on macOS and Windows, the device path on Linux. */
  videoSource: string;
  /** The audio source: the microphone name on macOS and Windows. Empty for no audio. */
  audioSource: string;
  /** The play action button. */
  play?: boolean;
};

export type WebcamPlatformConfig = PlatformConfig & {
  installFfmpeg: boolean;
  webcams: Record<string, WebcamConfig>;
};

/**
 * This is the standard interface for Matterbridge plugins.
 * Each plugin should export a default function that follows this signature.
 *
 * @param {PlatformMatterbridge} matterbridge - An instance of MatterBridge. This is the main interface for interacting with the MatterBridge system.
 * @param {AnsiLogger} log - An instance of AnsiLogger. This is used for logging messages in a format that can be displayed with ANSI color codes.
 * @param {WebcamPlatformConfig} config - The platform configuration.
 * @returns {WebcamPlatform} - An instance of the WebcamPlatform. This is the main interface for interacting with the webcam system.
 */
export default function initializePlugin(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: WebcamPlatformConfig): WebcamPlatform {
  return new WebcamPlatform(matterbridge, log, config);
}

export class WebcamPlatform extends MatterbridgeDynamicPlatform {
  /** The running ffplay processes by webcam name. */
  private readonly players = new Map<string, ChildProcess>();

  constructor(
    matterbridge: PlatformMatterbridge,
    log: AnsiLogger,
    override config: WebcamPlatformConfig,
  ) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('3.10.13')) {
      throw new Error(`This plugin requires Matterbridge version >= "3.10.13". Please update Matterbridge to the latest version in the frontend.`);
    }

    this.log.info(`Initializing platform ${this.config.name}...`);

    // Normalize old config values to new ones
    this.config.installFfmpeg ??= true;
    this.config.webcams ??= {};
    this.config.debug ??= false;
    this.config.unregisterOnShutdown ??= false;

    this.log.info(`Platform ${this.config.name} initialized successfully`);
  }

  override async onStart(reason?: string): Promise<void> {
    this.log.info(`Starting platform ${this.config.name} with reason: ${reason ?? 'no reason provided'}...`);

    // Docker only: install ffmpeg when it is missing
    if (this.matterbridge.restartMode === 'docker' && this.config.installFfmpeg && !hasFfmpeg()) {
      this.log.info('Installing ffmpeg...');
      this.wssSendSnackbarMessage('Installing ffmpeg...', 10, 'info');
      if (await installFfmpeg()) {
        this.log.info('ffmpeg installed successfully');
        this.wssSendSnackbarMessage('ffmpeg installed successfully', 10, 'success');
      } else {
        this.log.error('Failed to install ffmpeg: install it manually in the container');
        this.wssSendSnackbarMessage('Failed to install ffmpeg: install it manually in the container', 0, 'error');
      }
    }

    this.log.info(`Platform ${this.config.name} started successfully`);
  }

  override async onConfigure(): Promise<void> {
    await super.onConfigure();
    this.log.info(`Configuring platform ${this.config.name}...`);

    this.log.info(`Platform ${this.config.name} configured successfully`);
  }

  /**
   * Called when the plugin config has been updated.
   *
   * @param {PlatformConfig} config - The new plugin config.
   */
  // oxlint-disable-next-line typescript/require-await
  override async onConfigChanged(config: PlatformConfig): Promise<void> {
    this.log.info(`The config of platform ${config.name} has been changed`);
  }

  /**
   * Called when an action button defined in the plugin schema is pressed.
   *
   * @param {string} action - The action triggered by the button in the plugin config.
   * @param {string} [value] - The value of the field of the action button.
   * @param {string} [id] - The id of the schema associated with the action, i.e. `root_webcams_<name>_play`.
   * @param {PlatformConfig} [formData] - The current form data of the plugin config, including the changes not yet saved.
   */
  override async onAction(action: string, value?: string, id?: string, formData?: PlatformConfig): Promise<void> {
    this.log.info(`Received action ${action}${value ? ' with ' + value : ''}${id ? ' for schema ' + id : ''}`);
    if (action === 'discoverWebcams') await this.discoverWebcams();
    if (action === 'play' && id) {
      const name = id.replace(/^root_webcams_/, '').replace(/_play$/, '');
      const webcams = (formData as Partial<WebcamPlatformConfig> | undefined)?.webcams ?? this.config.webcams;
      const webcam = webcams[name];
      if (webcam) this.playWebcam(name, webcam);
      else this.log.error(`Cannot play webcam ${name}: not found`);
    }
  }

  /**
   * Discovers the webcams of this system with ffmpeg, using the method of the current platform, and adds the new ones to the webcams of the config.
   * Does nothing if ffmpeg is not installed.
   *
   * @returns {Promise<string[]>} The discovered webcams, or an empty list if ffmpeg is not installed or the discovery failed.
   */
  async discoverWebcams(): Promise<string[]> {
    if (!hasFfmpeg()) {
      this.log.error('Cannot discover webcams: ffmpeg is not installed');
      return [];
    }
    this.log.info(`Discovering webcams on ${process.platform}...`);
    try {
      const webcams = await listWebcams();
      for (const webcam of webcams) {
        if (webcam in this.config.webcams) {
          this.log.info(`Discovered webcam ${webcam}`);
          continue;
        }
        this.log.info(`Discovered new webcam ${webcam}`);
        this.config.webcams[webcam] = { videoSource: webcam, audioSource: '' };
        this.wssSendSnackbarMessage(`Discovered new webcam ${webcam}`, 10, 'info');
      }
      if (webcams.length === 0) this.log.warn('No webcams discovered');
      else this.saveConfig(this.config);
      return webcams;
    } catch (error) {
      this.log.error(`Failed to discover webcams: ${getErrorMessage(error)}`);
      return [];
    }
  }

  /**
   * Plays a webcam in an ffplay window. A window already open for the same webcam is closed first.
   *
   * @param {string} name - The name of the webcam.
   * @param {WebcamConfig} webcam - The webcam configuration.
   * @returns {ChildProcess | undefined} The ffplay process, or undefined if ffmpeg is not installed or the webcam has no video source.
   */
  playWebcam(name: string, webcam: WebcamConfig): ChildProcess | undefined {
    if (!hasFfmpeg()) {
      this.log.error(`Cannot play webcam ${name}: ffmpeg is not installed`);
      return undefined;
    }
    if (!webcam.videoSource) {
      this.log.error(`Cannot play webcam ${name}: the video source is empty`);
      return undefined;
    }
    this.players.get(name)?.kill();
    this.log.info(`Playing webcam ${name} video source ${webcam.videoSource}${webcam.audioSource ? ' audio source ' + webcam.audioSource : ''}...`);
    const player = playWebcam(webcam.videoSource, webcam.audioSource || undefined);
    player.on('error', (error) => this.log.error(`Player of webcam ${name} failed: ${error.message}`));
    player.on('exit', (code) => {
      this.log.info(`Player of webcam ${name} exited with code ${code}`);
      if (this.players.get(name) === player) this.players.delete(name);
    });
    this.players.set(name, player);
    return player;
  }

  override async onShutdown(reason?: string): Promise<void> {
    await super.onShutdown(reason);
    this.log.info(`Shutting down platform ${this.config.name} with reason: ${reason ?? 'no reason provided'}...`);
    for (const player of this.players.values()) player.kill();
    this.players.clear();
    if (this.config.unregisterOnShutdown) await this.unregisterAllDevices();
    this.log.info(`Platform ${this.config.name} shut down successfully`);
  }
}
