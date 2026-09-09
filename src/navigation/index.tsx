import React, { useEffect } from "react";
import { View, ActivityIndicator, Alert, NativeModules } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation.types";
import { AuthNavigator } from "./AuthNavigator";
import { CustomerNavigator } from "./CustomerNavigator";
import { TechnicianNavigator } from "./TechnicianNavigator";
import { useAuthStore } from "../store/auth.store";
import { registerDeviceToken } from "../services/notificationService";
import { APP_CONFIG } from "../config/app.config";

const hasFirebase = !!NativeModules.RNFBAppModule;
const getMessaging = () => {
  if (hasFirebase) {
    try {
      return require("@react-native-firebase/messaging").default;
    } catch (e) {
      console.warn("Failed to load @react-native-firebase/messaging:", e);
    }
  }
  return null;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function NotificationHandler() {
  const { token, user } = useAuthStore();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!token) return;

    let unsubTokenRefresh: (() => void) | null = null;
    let unsubForeground: (() => void) | undefined;
    let unsubBackground: (() => void) | undefined;

    // Register FCM token with backend after login
    registerDeviceToken(token).then((unsub) => {
      unsubTokenRefresh = unsub;
    });

    const messagingInstance = getMessaging();
    console.log('[NotificationHandler] Initializing listeners. messagingInstance available =', !!messagingInstance);
    if (!messagingInstance) return;

    try {
      // Foreground notification — show alert with "Open" button to navigate
      unsubForeground = messagingInstance().onMessage(async (remoteMessage: any) => {
        console.log('[NotificationHandler] Foreground notification received:', JSON.stringify(remoteMessage, null, 2));
        const { title, body } = remoteMessage.notification ?? {};
        Alert.alert(
          title ?? APP_CONFIG.appName,
          body ?? "",
          [
            { text: "Dismiss", style: "cancel" },
            {
              text: "Open",
              onPress: () => handleNotificationNavigation(remoteMessage, navigation, user?.role),
            },
          ],
        );
      });

      // Background notification tap
      unsubBackground = messagingInstance().onNotificationOpenedApp((remoteMessage: any) => {
        console.log('[NotificationHandler] Background notification opened app:', JSON.stringify(remoteMessage, null, 2));
        handleNotificationNavigation(remoteMessage, navigation, user?.role);
      });

      // Quit state notification tap
      messagingInstance().getInitialNotification().then((remoteMessage: any) => {
        if (remoteMessage) {
          console.log('[NotificationHandler] App opened from quit state via notification:', JSON.stringify(remoteMessage, null, 2));
          handleNotificationNavigation(remoteMessage, navigation, user?.role);
        } else {
          console.log('[NotificationHandler] App opened from quit state (no initial notification)');
        }
      });
    } catch (error) {
      console.error("[NotificationHandler] Failed to initialize Firebase Messaging listeners:", error);
    }

    return () => {
      if (unsubTokenRefresh) {
        console.log('[NotificationHandler] Cleaning up token refresh listener');
        unsubTokenRefresh();
      }
      if (unsubForeground) {
        console.log('[NotificationHandler] Cleaning up foreground notification listener');
        unsubForeground();
      }
      if (unsubBackground) {
        console.log('[NotificationHandler] Cleaning up background notification listener');
        unsubBackground();
      }
    };
  }, [token, navigation, user?.role]);

  return null;
}

function handleNotificationNavigation(remoteMessage: any, navigation: any, userRole?: string) {
  const { ticketId, route } = remoteMessage.data ?? {};
  console.log('[NotificationHandler] handleNotificationNavigation called. data =', JSON.stringify(remoteMessage.data, null, 2), 'userRole =', userRole);
  
  if (ticketId) {
    if (userRole === "TECHNICIAN") {
      console.log('[NotificationHandler] Navigating to TechnicianPortal -> TechnicianJobDetails with jobId =', ticketId);
      navigation.navigate("TechnicianPortal", {
        screen: "TechnicianJobDetails",
        params: { jobId: ticketId },
      });
    } else if (userRole === "CUSTOMER") {
      console.log('[NotificationHandler] Navigating to CustomerPortal -> CustomerTicketDetails with ticketId =', ticketId);
      navigation.navigate("CustomerPortal", {
        screen: "CustomerTicketDetails",
        params: { ticketId: ticketId },
      });
    } else {
      console.warn('[NotificationHandler] handleNotificationNavigation: ticketId present but user role is neither TECHNICIAN nor CUSTOMER:', userRole);
    }
  } else if (route) {
    console.log('[NotificationHandler] Navigating to route =', route);
    navigation.navigate(route);
  } else {
    console.warn('[NotificationHandler] handleNotificationNavigation: No ticketId or route found in message data.');
  }
}

export const RootNavigator = () => {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#ffffff" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <NotificationHandler />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : user?.role === "TECHNICIAN" ? (
          <Stack.Screen name="TechnicianPortal" component={TechnicianNavigator} />
        ) : (
          // Fallback or explicit Customer route
          <Stack.Screen name="CustomerPortal" component={CustomerNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
export default RootNavigator;
