# Bug Report: WebRTC Camera Streaming Fails in Web Browsers on Self-Hosted Server

## Summary
Camera live video streaming via WebRTC works correctly in the Homey mobile app but fails with a 500 Internal Server Error in all web browsers (Chrome, Firefox, Safari) on Homey Self-Hosted Server.

## Environment
- **Homey Platform:** Self-Hosted Server
- **Browsers Tested:** Chrome, Firefox, Safari (all fail with same error)
- **Mobile App:** Works correctly (both device view and dashboard)
- **App Using Camera:** Custom app using `homey.videos.createVideoWebRTC()` with Nest Doorbell via Starling Hub

## Steps to Reproduce
1. Install a camera app that uses `createVideoWebRTC()` for live streaming
2. Add a camera device that supports WebRTC streaming
3. Open the Homey mobile app → Navigate to device → Live video works ✓
4. Open Homey web interface in any browser → Navigate to same device → Live video fails ✗

## Expected Behavior
Live video streaming should work in web browsers the same as it does in the mobile app.

## Actual Behavior
Web browser displays an error and the stream fails to load.

## Error Details

### Browser Console (Safari):
```
[Log] Fetching image for – "02e4dbea-6c33-47b5-b3c4-0899d4beee6e"
[Error] Failed to load resource: the server responded with a status of 500 (Internal Server Error)
[Error] {
  error: "uv_pipe_chmod EINVAL",
  error_description: "uv_pipe_chmod EINVAL",
  stack: "Error: uv_pipe_chmod EINVAL
    at Server.listen (… file:///app/apps/homey-shs/lib/Server.mts:666:26",
  statusCode: null,
  statusName: "Error"
}
```

### App-side logs (working correctly):
```
[log] WebRTC offer received, forwarding to Starling Hub
[log] WebRTC stream started: DKTf4pustnUo3goKAAiSUigaIAAYARA
[log] Extending WebRTC stream: DKTf4pustnUo3goKAAiSUigaIAAYARA
```

## Analysis

The error originates from **Homey Self-Hosted Server code**, not the app:
- File: `homey-shs/lib/Server.mts` line 666
- Error: `uv_pipe_chmod EINVAL` - a Node.js/libuv error when setting permissions on a pipe/socket

The app-side WebRTC negotiation completes successfully:
- SDP offer received from Homey ✓
- SDP answer received from camera ✓
- Stream ID returned ✓
- Keep-alive extension works ✓

This suggests the issue is in how Homey Self-Hosted Server proxies/relays WebRTC streams to web browser clients. The mobile app likely uses a direct WebRTC connection, bypassing the problematic server-side proxy code.

## Technical Details

The app uses standard Homey SDK camera APIs:
```typescript
const video = await homey.videos.createVideoWebRTC({ dataChannel: true });
video.registerOfferListener(async (offerSdp) => {
  // Forward to camera, return answer
  return { answerSdp: answer, streamId: id };
});
video.registerKeepAliveListener(async (streamId) => {
  // Extend stream
});
await device.setCameraVideo('main', 'Camera Name', video);
```

The WebRTC SDP contains all required sections:
- `m=audio` (Opus codec)
- `m=video` (H.264 codec)
- `m=application` (data channel)

## Workaround
Use the Homey mobile app for live video streaming instead of web browsers.

## Additional Context
- The `uv_pipe_chmod EINVAL` error typically occurs when Node.js tries to `chmod` a socket that doesn't support it (e.g., a TCP socket instead of a Unix socket)
- This may be a Docker/container-specific issue or a regression in the Self-Hosted Server code
- Other camera apps on Homey Self-Hosted Server may experience the same issue

## Submission
Submit to:
- https://github.com/athombv/homey-apps-sdk-issues
- https://community.homey.app/
