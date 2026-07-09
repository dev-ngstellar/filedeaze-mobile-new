import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TechnicianStackParamList } from "../types/navigation.types";
import { ThemeProvider, technicianTheme } from "../theme";
import { TechnicianHomeScreen } from "../screens/technician/TechnicianHomeScreen";
import { TechnicianJobDetailsScreen } from "../screens/technician/TechnicianJobDetailsScreen";
import { TechnicianInvoiceListScreen } from "../screens/technician/TechnicianInvoiceListScreen";
import { AttendanceHistoryScreen } from "../screens/technician/AttendanceHistoryScreen";
import { AssignedJobsScreen } from "../screens/technician/AssignedJobsScreen";
// Workflow Integration Screens
import { CheckOutScreen } from "../screens/technician/CheckOutScreen";
import { WorkTimerScreen } from "../screens/technician/WorkTimerScreen";
import { InvoiceGenerateScreen } from "../screens/technician/InvoiceGenerateScreen";
import { PostLoginSplashScreen } from "../screens/auth/PostLoginSplashScreen";
import { NotificationListScreen } from "../screens/shared/NotificationListScreen";

const Stack = createNativeStackNavigator<TechnicianStackParamList>();

export const TechnicianNavigator = () => {
  return (
    <ThemeProvider theme={technicianTheme}>
    <Stack.Navigator
      initialRouteName="PostLoginSplash"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="PostLoginSplash" component={PostLoginSplashScreen} options={{ animation: "fade" }} />
      <Stack.Screen name="TechnicianHome" component={TechnicianHomeScreen} />
      <Stack.Screen name="TechnicianJobDetails" component={TechnicianJobDetailsScreen} />
      <Stack.Screen name="TechnicianInvoiceList" component={TechnicianInvoiceListScreen} />
      <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
      <Stack.Screen name="AssignedJobs" component={AssignedJobsScreen} />
      {/* Workflow Integration */}
      <Stack.Screen name="CheckOut" component={CheckOutScreen} />
      <Stack.Screen name="WorkTimer" component={WorkTimerScreen} />
      <Stack.Screen name="InvoiceGenerate" component={InvoiceGenerateScreen} />
      <Stack.Screen name="NotificationList" component={NotificationListScreen} />
    </Stack.Navigator>
    </ThemeProvider>
  );
};
