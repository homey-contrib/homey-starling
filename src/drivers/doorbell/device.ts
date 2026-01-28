/**
 * Doorbell Device
 *
 * Represents a doorbell camera from Starling Hub with:
 * - Motion detection (alarm_motion)
 * - Person detection (alarm_person_detected)
 * - Animal/vehicle detection
 * - Doorbell button press (alarm_generic)
 * - Quiet time toggle
 * - WebRTC live video streaming
 *
 * This class extends the camera functionality with doorbell-specific
 * flow trigger IDs (prefixed with "doorbell_" for uniqueness).
 */

import { Readable } from 'stream';
import { StarlingDevice } from '../../lib/drivers';
import { Device, CameraDevice } from '../../lib/api/types';

/**
 * Type for the app instance to access triggerFaceDetected
 */
interface StarlingHomeHubApp {
  triggerFaceDetected(personName: string, cameraId: string, cameraName: string): void;
}

/**
 * Homey Video interface for WebRTC
 */
interface VideoWebRTC {
  registerOfferListener(
    handler: (offerSdp: string) => Promise<{ answerSdp: string; streamId?: string }>
  ): void;
  registerKeepAliveListener(handler: (streamId: string) => Promise<void>): void;
}

/**
 * Homey Videos Manager interface
 */
interface VideosManager {
  createVideoWebRTC(options?: { dataChannel?: boolean }): Promise<VideoWebRTC>;
}

/**
 * Homey Image interface
 */
interface HomeyImage {
  setStream(source: (stream: NodeJS.WritableStream) => Promise<void>): void;
  update(): Promise<void>;
}

/**
 * Homey Images Manager interface
 */
interface ImagesManager {
  createImage(): Promise<HomeyImage>;
}

class DoorbellDeviceClass extends StarlingDevice {
  /**
   * Register capability listeners
   */
  protected registerCapabilityListeners(): void {
    // Quiet time toggle (only writable capability)
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value: boolean) => {
        // Invert: Homey onoff=true means doorbell active, quietTime=false
        await this.setPropertyOptimistic('quietTime', !value, 'onoff', value);
      });
    }
  }

  /**
   * Handle state changes and fire flow triggers
   * Uses doorbell-prefixed trigger IDs
   */
  protected handleStateChanges(device: Device): void {
    const camera = device as CameraDevice;

    // Detection triggers (fire on rising edge only)
    this.triggerOnRisingEdge('personDetected', camera.personDetected, 'doorbell_person_detected');
    this.triggerOnRisingEdge('animalDetected', camera.animalDetected, 'doorbell_animal_detected');
    this.triggerOnRisingEdge('vehicleDetected', camera.vehicleDetected, 'doorbell_vehicle_detected');
    this.triggerOnRisingEdge('doorbellPushed', camera.doorbellPushed, 'doorbell_pressed');
    this.triggerOnRisingEdge('packageDelivered', camera.packageDelivered, 'doorbell_package_delivered');
    this.triggerOnRisingEdge('packageRetrieved', camera.packageRetrieved, 'doorbell_package_retrieved');

    // Face detection triggers (per-person)
    if (camera.faceDetected) {
      for (const [personName, detected] of Object.entries(camera.faceDetected)) {
        const stateKey = `faceDetected:${personName}`;
        const change = this.checkStateChange(stateKey, detected);
        if (change && change.newValue === true) {
          const app = this.homey.app as unknown as StarlingHomeHubApp;
          app.triggerFaceDetected(personName, camera.id, camera.name);
        }
        this.updatePreviousState(stateKey, detected);
      }
    }
  }

  /**
   * Map Starling device state to Homey capabilities
   */
  protected async mapStateToCapabilities(device: Device): Promise<void> {
    const camera = device as CameraDevice;

    // Quiet time → onoff (inverted)
    if (camera.quietTime !== undefined && this.hasCapability('onoff')) {
      await this.safeSetCapabilityValue('onoff', !camera.quietTime);
    }

    // Motion detection
    if (camera.motionDetected !== undefined && this.hasCapability('alarm_motion')) {
      await this.safeSetCapabilityValue('alarm_motion', camera.motionDetected);
    }

    // Person detection
    if (camera.personDetected !== undefined && this.hasCapability('alarm_person_detected')) {
      await this.safeSetCapabilityValue('alarm_person_detected', camera.personDetected);
    }

    // Animal detection
    if (camera.animalDetected !== undefined && this.hasCapability('alarm_animal_detected')) {
      await this.safeSetCapabilityValue('alarm_animal_detected', camera.animalDetected);
    }

    // Vehicle detection
    if (camera.vehicleDetected !== undefined && this.hasCapability('alarm_vehicle_detected')) {
      await this.safeSetCapabilityValue('alarm_vehicle_detected', camera.vehicleDetected);
    }

    // Doorbell button
    if (camera.doorbellPushed !== undefined && this.hasCapability('alarm_generic')) {
      await this.safeSetCapabilityValue('alarm_generic', camera.doorbellPushed);
    }
  }

  /**
   * Called when the device is initialized
   */
  async onInit(): Promise<void> {
    await super.onInit();

    const device = this.getStarlingDevice() as CameraDevice | undefined;

    if (device) {
      // Add motion detection capability
      await this.ensureCapability('alarm_motion');

      // Add person detection if supported
      if (device.personDetected !== undefined) {
        await this.ensureCapability('alarm_person_detected');
      }

      // Add doorbell capability (always present for doorbells)
      await this.ensureCapability('alarm_generic');

      // Set up WebRTC video streaming if supported
      if (device.supportsWebRtcStreaming || device.supportsStreaming) {
        await this.setupWebRTCVideo();
      } else {
        this.log('WebRTC streaming not supported by this doorbell');
      }

      // Set up snapshot image for dashboard
      await this.setupSnapshotImage();
    }
  }

  /**
   * Set up WebRTC video streaming
   */
  private async setupWebRTCVideo(): Promise<void> {
    try {
      const videos = this.homey as unknown as { videos: VideosManager };

      if (!videos.videos?.createVideoWebRTC) {
        this.log('VideoWebRTC not available on this Homey platform');
        return;
      }

      // Nest cameras REQUIRE a data channel
      const video = await videos.videos.createVideoWebRTC({
        dataChannel: true,
      });

      video.registerOfferListener(async (offerSdp: string) => {
        this.log('WebRTC offer received, forwarding to Starling Hub');

        const connection = this.hubConnection;
        if (!connection) {
          throw new Error('Hub connection not available');
        }

        const store = this.getStore() as { starlingId: string };
        const client = connection.getClient();

        try {
          const result = await client.startStream(store.starlingId, offerSdp);
          this.log(`WebRTC stream started: ${result.streamId}`);

          return {
            answerSdp: result.answer,
            streamId: result.streamId,
          };
        } catch (error) {
          this.error('WebRTC stream start failed:', error);
          throw error;
        }
      });

      video.registerKeepAliveListener(async (streamId: string) => {
        this.log(`Extending WebRTC stream: ${streamId}`);

        const connection = this.hubConnection;
        if (!connection) {
          throw new Error('Hub connection not available');
        }

        const store = this.getStore() as { starlingId: string };
        const client = connection.getClient();

        await client.extendStream(store.starlingId, streamId);
      });

      const deviceWithVideo = this as unknown as {
        setCameraVideo(id: string, title: string, video: unknown): Promise<void>;
      };
      await deviceWithVideo.setCameraVideo('main', this.getName(), video);

      this.log('WebRTC video streaming enabled');
    } catch (error) {
      this.error('Failed to set up WebRTC video:', error);
    }
  }

  /**
   * Set up snapshot image for dashboard
   */
  private async setupSnapshotImage(): Promise<void> {
    try {
      const homeyWithImages = this.homey as unknown as { images: ImagesManager };

      if (!homeyWithImages.images?.createImage) {
        this.log('Image manager not available on this Homey platform');
        return;
      }

      const image = await homeyWithImages.images.createImage();

      image.setStream(async (stream: NodeJS.WritableStream) => {
        const connection = this.hubConnection;
        if (!connection) {
          throw new Error('Hub connection not available');
        }

        const store = this.getStore() as { starlingId: string };

        try {
          const snapshotBuffer = await connection.getSnapshot(store.starlingId);
          const readable = Readable.from(snapshotBuffer);
          readable.pipe(stream);
        } catch (error) {
          this.error('Failed to fetch snapshot:', error);
          throw error;
        }
      });

      const sdkImage = image as unknown as Parameters<typeof this.setCameraImage>[2];
      await this.setCameraImage('snapshot', 'Snapshot', sdkImage);

      this.log('Snapshot image enabled for dashboard');
    } catch (error) {
      this.error('Failed to set up snapshot image:', error);
    }
  }
}

module.exports = DoorbellDeviceClass;
