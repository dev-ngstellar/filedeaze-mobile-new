import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CustomerStackParamList } from "../types/navigation.types";

import { CustomerDashboardScreen } from "../screens/customer/CustomerDashboardScreen";
import { RaiseTicketScreen } from "../screens/customer/RaiseTicketScreen";
import { TicketHistoryScreen } from "../screens/customer/TicketHistoryScreen";
import { CustomerTicketDetailsScreen } from "../screens/customer/CustomerTicketDetailsScreen";
import { PaymentHistoryScreen } from "../screens/customer/PaymentHistoryScreen";
import { InvoiceListScreen } from "../screens/customer/InvoiceListScreen";
import { InvoiceDetailsScreen } from "../screens/customer/InvoiceDetailsScreen";
import { FeedbackScreen } from "../screens/customer/FeedbackScreen";
import { AddressBookScreen } from "../screens/customer/AddressBookScreen";
import { NotificationListScreen } from "../screens/shared/NotificationListScreen";
import { CustomerAssetsScreen } from "../screens/customer/CustomerAssetsScreen";
import { CustomerAssetDetailScreen } from "../screens/customer/CustomerAssetDetailScreen";
import { MyAmcScreen } from "../screens/customer/MyAmcScreen";
import { AmcDetailsScreen } from "../screens/customer/AmcDetailsScreen";

import { CustomerHomeScreen } from "../screens/customer/CustomerHomeScreen";
import { CustomerJobDetailsScreen } from "../screens/customer/CustomerJobDetailsScreen";
import { PostLoginSplashScreen } from "../screens/auth/PostLoginSplashScreen";

const Stack = createNativeStackNavigator<CustomerStackParamList>();

export const CustomerNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="PostLoginSplash"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="PostLoginSplash" component={PostLoginSplashScreen} options={{ animation: "fade" }} />
      <Stack.Screen name="CustomerDashboard" component={CustomerDashboardScreen} />
      <Stack.Screen name="RaiseTicket" component={RaiseTicketScreen} />
      <Stack.Screen name="TicketHistory" component={TicketHistoryScreen} />
      <Stack.Screen name="CustomerTicketDetails" component={CustomerTicketDetailsScreen} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
      <Stack.Screen name="InvoiceList" component={InvoiceListScreen} />
      <Stack.Screen name="InvoiceDetails" component={InvoiceDetailsScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="AddressBook" component={AddressBookScreen} />
      <Stack.Screen name="CustomerAssets" component={CustomerAssetsScreen} />
      <Stack.Screen name="CustomerAssetDetail" component={CustomerAssetDetailScreen} />
      <Stack.Screen name="MyAmc" component={MyAmcScreen} />
      <Stack.Screen name="AmcDetails" component={AmcDetailsScreen} />

      <Stack.Screen name="NotificationList" component={NotificationListScreen} />
      {/* Keep older screens for compatibility */}
      <Stack.Screen name="CustomerHome" component={CustomerHomeScreen} />
      <Stack.Screen name="CustomerJobDetails" component={CustomerJobDetailsScreen} />
    </Stack.Navigator>
  );
};

export default CustomerNavigator;
