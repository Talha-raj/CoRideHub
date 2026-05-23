#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Registers the Swift LocationModule class with the React Native bridge.
// The Swift file handles all implementation; this file only declares the bridge.

RCT_EXTERN_MODULE(LocationModule, RCTEventEmitter)

RCT_EXTERN_METHOD(startTracking)
RCT_EXTERN_METHOD(stopTracking)

RCT_EXTERN_METHOD(
  getCurrentLocation:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  saveTrackingInfo:(NSString *)routeId
  token:(NSString *)token
  serverUrl:(NSString *)serverUrl
)

RCT_EXTERN_METHOD(clearTrackingInfo)
