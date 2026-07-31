import React from "react";
import { View, Text, StyleSheet, Pressable, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Bell, Shield } from "lucide-react-native";
import { useTheme } from "../theme";
import { APP_CONFIG } from "../config/app.config";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../store/auth.store";
import { useUnreadNotificationCount } from "../hooks/useNotifications";
import { useCustomerHasActiveAmc } from "../hooks/useCustomer";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  /** Explicitly control the back arrow. Defaults to auto (true when navigation can go back). */
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
  showTenantBranding?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack,
  onBackPress,
  rightAction,
  leftAction,
  showTenantBranding = true,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const unreadNotifCount = useUnreadNotificationCount();
  const { hasActiveAmc } = useCustomerHasActiveAmc();

  // Auto-detect navigation so we never need to pass showBack manually on child screens.
  // Wrapped in try/catch because AppHeader is sometimes rendered outside a navigator context.
  let canGoBack = false;
  let defaultGoBack: (() => void) | undefined;
  let nav: any;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    nav = useNavigation();
    canGoBack = nav.canGoBack();
    defaultGoBack = () => nav.goBack();
  } catch {
    // not inside a navigator — keep defaults
  }

  // Resolve whether to show back arrow:
  //   • If showBack is explicitly set (true/false), honour it.
  //   • Otherwise show it automatically when the stack can go back.
  const resolvedShowBack = showBack !== undefined ? showBack : canGoBack;
  const resolvedOnBackPress = onBackPress ?? defaultGoBack;

  const isCustomer = user?.role === "CUSTOMER";
  const currentRouteName = nav?.getCurrentRoute?.()?.name;
  const showCustomerHeaderActions = isCustomer && currentRouteName !== "NotificationList" && title !== "Notifications";

  const handleNotificationPress = () => {
    if (nav) {
      nav.navigate("NotificationList");
    }
  };

  const handleAssetsPress = () => {
    if (nav) {
      nav.navigate("CustomerAssets");
    }
  };

  const renderRightAction = () => {
    if (showCustomerHeaderActions) {
      return (
        <View style={styles.rightActionRow}>
          <Pressable
            onPress={handleAssetsPress}
            style={({ pressed }) => [
              styles.headerIconButton,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="My Assets & AMC"
          >
            <Shield color={theme.colors.text} size={21} />
            {hasActiveAmc && (
              <View style={[styles.activeAmcDot, { backgroundColor: theme.colors.success }]} />
            )}
          </Pressable>

          <Pressable
            onPress={handleNotificationPress}
            style={({ pressed }) => [
              styles.headerIconButton,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Notifications"
          >
            <Bell color={theme.colors.text} size={21} />
            {unreadNotifCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: theme.colors.danger }]}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </Text>
              </View>
            )}
          </Pressable>
          {rightAction}
        </View>
      );
    }
    return rightAction;
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + (Platform.OS === "ios" ? 6 : 10),
          backgroundColor: theme.colors.card,
          shadowColor: "rgba(15,23,42,0.06)",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 4,
          borderBottomWidth: 1,
          borderBottomColor: `${theme.colors.borderLight}90`,
          zIndex: 10,
        },
      ]}
    >
      <View style={styles.contentRow}>
        {leftAction && <View style={styles.leftActionContainer}>{leftAction}</View>}

        {resolvedShowBack ? (
          <Pressable
            onPress={resolvedOnBackPress}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: `${theme.colors.primary}0d` },
              pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
            ]}
          >
            <ArrowLeft color={theme.colors.text} size={22} />
          </Pressable>
        ) : showTenantBranding && (APP_CONFIG as any).logo ? (
          <Image
            source={{ uri: (APP_CONFIG as any).logo }}
            style={[styles.logo, { borderColor: `${theme.colors.primary}20` }]}
          />
        ) : showTenantBranding ? (
          <View style={[styles.initialsLogo, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.initialsText}>
              {APP_CONFIG.appName.split(" ").slice(0, 2).map((w: string) => w[0]).join("")}
            </Text>
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}

        <View style={styles.textContainer}>
          {showTenantBranding && !title ? (
            <>
              <Text
                style={[
                  styles.tenantTitle,
                  {
                    color: theme.colors.text,
                    fontSize: 20,
                    fontWeight: "800",
                  },
                ]}
                numberOfLines={1}
              >
                {APP_CONFIG.appName}
              </Text>
              <View style={[styles.portalBadge, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Text style={[styles.tenantSubtitle, { color: theme.colors.primary }]}>
                  PORTAL
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.colors.text,
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.bold,
                  },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {subtitle && (
                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: theme.colors.textMuted,
                      fontSize: theme.typography.fontSize.xs,
                    },
                  ]}
                >
                  {subtitle}
                </Text>
              )}
            </>
          )}
        </View>

        {showCustomerHeaderActions || rightAction ? (
          <View style={styles.rightActionContainer}>{renderRightAction()}</View>
        ) : (
          <View style={styles.rightActionPlaceholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 1,
    textAlign: "center",
  },
  tenantTitle: {
    letterSpacing: -0.5,
    textAlign: "center",
  },
  portalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    alignSelf: "center",
  },
  tenantSubtitle: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    textAlign: "center",
  },
  rightActionContainer: {
    justifyContent: "center",
    alignItems: "flex-end",
    minWidth: 40,
  },
  rightActionPlaceholder: {
    width: 40,
  },
  initialsLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  initialsText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  leftActionContainer: {
    justifyContent: "center",
    alignItems: "flex-start",
    marginRight: 6,
  },
  rightActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  activeAmcDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 10,
  },
  notifBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    zIndex: 10,
  },
  notifBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700" as const,
    lineHeight: 11,
  },
});
export default AppHeader;
