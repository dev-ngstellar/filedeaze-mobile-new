/**
 * Web stub for @react-native-firebase/messaging
 * FCM push notifications are not available on web.
 * This stub returns no-op implementations so the app runs without crashing.
 */
const messaging = () => ({
  requestPermission: async () => 0,
  getToken: async () => null,
  onTokenRefresh: () => () => {},
  onMessage: () => () => {},
  onNotificationOpenedApp: () => () => {},
  getInitialNotification: async () => null,
  setBackgroundMessageHandler: () => {},
  deleteToken: async () => {},
  AuthorizationStatus: {
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    NOT_DETERMINED: -1,
    DENIED: 0,
  },
});

messaging.AuthorizationStatus = {
  AUTHORIZED: 1,
  PROVISIONAL: 2,
  NOT_DETERMINED: -1,
  DENIED: 0,
};

module.exports = messaging;
module.exports.default = messaging;
