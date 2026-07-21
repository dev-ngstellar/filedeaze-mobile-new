import React, { useState, useRef, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  TextInput,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  LogOut,
  Calendar,
  ChevronRight,
  User,
  FileText,
  ClipboardList,
  MapPin,
  CreditCard,
  Mail,
  Phone,
  Smartphone,
  Building,
  Hash,
  Edit2,
  Home,
  Search,
  Bell,
  Sparkles,
  UserCheck,
  Shield,
} from "lucide-react-native";

import { useTheme } from "../../theme";
import { useAuthStore } from "../../store/auth.store";
import {
  useCustomerTickets,
  useCustomerInvoices,
  useCustomerProfile,
  useUpdateCustomerProfile,
  useUploadCustomerProfilePhoto,
  useCustomerPayments,
  useCategories,
  useCustomerHasActiveAmc,
} from "../../hooks/useCustomer";
import { useUnreadNotificationCount } from "../../hooks/useNotifications";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppEmptyState } from "../../components/AppEmptyState";
import { AppCard } from "../../components/AppCard";
import { AppBadge } from "../../components/AppBadge";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { CustomerPopup } from "../../components/CustomerPopup";
import { LinearGradient } from "expo-linear-gradient";
import { CustomerAssetsScreen } from "./CustomerAssetsScreen";

type NavigationProp = NativeStackNavigationProp<
  CustomerStackParamList,
  "CustomerHome"
>;
type CustomerTab = "HOME" | "TICKETS" | "AMC" | "PAYMENTS" | "INVOICES" | "PROFILE";

export const CustomerHomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user, logout, updateAvatar } = useAuthStore();
  const insets = useSafeAreaInsets();

  const { width: screenWidth } = Dimensions.get("window");
  const isSmallScreen = screenWidth < 375;
  const tabIconSize = isSmallScreen ? 22 : 24;
  const tabLabelSize = isSmallScreen ? 10 : 11;
  const BASE_TAB_HEIGHT = 60;

  const [activeTab, setActiveTab] = useState<CustomerTab>("HOME");
  const [logoutPopupVisible, setLogoutPopupVisible] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAllCats, setShowAllCats] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredDotIdx, setFeaturedDotIdx] = useState(0);
  const featuredScrollRef = useRef<ScrollView>(null);
  const featuredIndexRef = useRef(0);

  // Queries
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();
  const { hasActiveAmc } = useCustomerHasActiveAmc();
  const [bookingMode, setBookingMode] = useState<"NORMAL" | "AMC">("NORMAL");

  const {
    data: tickets = [],
    isLoading: isTicketsLoading,
    refetch: refetchTickets,
    isFetching: isFetchingTickets,
  } = useCustomerTickets();
  const {
    data: invoices = [],
    isLoading: isInvoicesLoading,
    refetch: refetchInvoices,
    isFetching: isFetchingInvoices,
  } = useCustomerInvoices();
  const {
    data: payments = [],
    isLoading: isPaymentsLoading,
    refetch: refetchPayments,
    isFetching: isFetchingPayments,
  } = useCustomerPayments();
  const {
    data: profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useCustomerProfile();
  const updateProfileMutation = useUpdateCustomerProfile();
  const uploadPhotoMutation = useUploadCustomerProfilePhoto();
  const unreadNotifCount = useUnreadNotificationCount();

  // Sync booking mode: default to AMC if active AMC subscription exists, otherwise NORMAL
  useEffect(() => {
    setBookingMode(hasActiveAmc ? "AMC" : "NORMAL");
  }, [hasActiveAmc]);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  // Sync form states with profile data
  React.useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
      setAlternatePhone(profile.alternatePhone || "");
      setAddress(profile.address || "");
      setCity(profile.city || "");
      setPincode(profile.pincode || "");
    }
  }, [profile]);

  // Auto-scroll featured carousel every 3 seconds
  useEffect(() => {
    if (categories.length === 0) return;
    const total = Math.min(categories.length, 5);
    const cardW = Dimensions.get("window").width - 32;
    const timer = setInterval(() => {
      const next = (featuredIndexRef.current + 1) % total;
      featuredIndexRef.current = next;
      setFeaturedDotIdx(next);
      featuredScrollRef.current?.scrollTo({ x: next * (cardW + 12), animated: true });
    }, 3000);
    return () => clearInterval(timer);
  }, [categories.length]);

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(
      {
        name,
        email: email || null,
        phone,
        alternatePhone: alternatePhone || null,
        address: address || null,
        city: city || null,
        pincode: pincode || null,
      },
      {
        onSuccess: () => {
          setIsEditingProfile(false);
          Alert.alert("Success", "Profile updated successfully!");
        },
        onError: (err: any) => {
          Alert.alert("Error", err.message || "Failed to update profile");
        },
      },
    );
  };

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Downscale before upload — sending a raw multi-megapixel camera-roll photo as an avatar
        // is unnecessary and, combined with repeated picks, is a known source of the app crashing
        // and reloading on lower-end Android devices.
        let uploadUri = asset.uri;
        try {
          const context = ImageManipulator.manipulate(asset.uri);
          context.resize({ width: 800 });
          const rendered = await context.renderAsync();
          const compressed = await rendered.saveAsync({ compress: 0.6, format: SaveFormat.JPEG });
          uploadUri = compressed.uri;
        } catch (compressionError) {
          console.error("Failed to compress profile photo:", compressionError);
        }

        const formData = new FormData();
        formData.append("photo", {
          uri: Platform.OS === "ios" ? uploadUri.replace("file://", "") : uploadUri,
          type: "image/jpeg",
          name: asset.fileName || "profile_photo.jpg",
        } as any);

        uploadPhotoMutation.mutate(formData, {
          onSuccess: (data: any) => {
            if (data?.profileImageUrl) {
              updateAvatar(data.profileImageUrl);
            }
            Alert.alert("Success", "Profile photo updated successfully");
          },
          onError: (err: any) => {
            Alert.alert("Error", err.message || "Failed to update profile photo");
          },
        });
      }
    } catch (error) {
      console.log("Error picking image:", error);
      Alert.alert("Error", "Could not pick image");
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "INVOICE_GENERATED":
      case "TICKET_CLOSED":
      case "CLOSED":
        return "success";
      case "IN_PROGRESS":
      case "ASSIGNED":
      case "ACCEPTED":
      case "TRAVELLING":
      case "REACHED":
      case "REACHED_LOCATION":
        return "warning";
      case "CANCELLED":
        return "danger";
      default:
        return "primary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "NEW_TICKET":
        return "NEW";
      case "REACHED":
      case "REACHED_LOCATION":
        return "ARRIVED";
      case "TRAVELLING":
        return "EN ROUTE";
      case "TICKET_CLOSED":
      case "CLOSED":
        return "CLOSED";
      default:
        return status.replace("_", " ");
    }
  };

  const getPaymentStatusVariant = (status: string) => {
    const s = status.toUpperCase();
    if (s === "PAID" || s === "COMPLETED" || s === "SUCCESS") return "success";
    if (s === "PENDING" || s === "PROCESSING") return "warning";
    return "danger";
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case "PROFILE":
        return "My Account Profile";
      case "INVOICES":
        return "My Invoices";
      case "PAYMENTS":
        return "Payment Transactions";
      default:
        return "Service History";
    }
  };

  const handleRefresh = () => {
    if (activeTab === "HOME") {
      // refetchCategories is not destructured, no need to refresh categories
    } else if (activeTab === "TICKETS") refetchTickets();
    else if (activeTab === "INVOICES") refetchInvoices();
    else if (activeTab === "PAYMENTS") refetchPayments();
    else refetchProfile();
  };

  const isRefreshing = () => {
    if (activeTab === "HOME") return isCategoriesLoading;
    if (activeTab === "TICKETS") return isFetchingTickets;
    if (activeTab === "INVOICES") return isFetchingInvoices;
    if (activeTab === "PAYMENTS") return isFetchingPayments;
    return isProfileLoading;
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const SCREEN_W = Dimensions.get("window").width;
  const CAT_CARD_W = Math.floor((SCREEN_W - 32 - 24) / 3);
  const FEATURED_CARD_W = SCREEN_W - 32;

  const getCatBannerGrad = (name: string): [string, string] => {
    const n = name.toLowerCase();
    if (n.includes("electric") || n.includes("power") || n.includes("wire") || n.includes("wiring"))
      return ["#1C0A00", "#3B1500"];
    if (n.includes("plumb") || n.includes("water") || n.includes("pipe") || n.includes("leak") || n.includes("tap"))
      return ["#00102B", "#001845"];
    if (n.includes("ac") || n.includes("cool") || n.includes("hvac") || n.includes("air con"))
      return ["#001020", "#001C35"];
    if (n.includes("carpent") || n.includes("wood") || n.includes("furniture") || n.includes("joiner"))
      return ["#120A00", "#251500"];
    if (n.includes("paint") || n.includes("colour") || n.includes("color") || n.includes("wall"))
      return ["#110020", "#1E0035"];
    if (n.includes("clean") || n.includes("sweep") || n.includes("mop") || n.includes("sanitiz"))
      return ["#000F08", "#001A0F"];
    if (n.includes("pest") || n.includes("termite") || n.includes("insect"))
      return ["#0A0800", "#1A1200"];
    if (n.includes("appliance") || n.includes("repair") || n.includes("fix") || n.includes("washing"))
      return ["#001420", "#001C2E"];
    if (n.includes("salon") || n.includes("beauty") || n.includes("spa") || n.includes("hair"))
      return ["#20001A", "#350028"];
    if (n.includes("security") || n.includes("cctv") || n.includes("camera"))
      return ["#0A0010", "#180020"];
    if (n.includes("garden") || n.includes("lawn") || n.includes("landscap"))
      return ["#000F06", "#001A0C"];
    return ["#1E293B", "#0F172A"];
  };

  const getCatImage = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes("electric") || n.includes("power") || n.includes("wire") || n.includes("wiring"))
      return "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=260&fit=crop";
    if (n.includes("plumb") || n.includes("water") || n.includes("leak") || n.includes("pipe") || n.includes("tap"))
      return "https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=400&h=260&fit=crop";
    if (n.includes("ac") || n.includes("air con") || n.includes("cool") || n.includes("hvac") || n.includes("refriger"))
      return "https://images.unsplash.com/photo-1563014572-74af7be95775?w=400&h=260&fit=crop";
    if (n.includes("carpent") || n.includes("wood") || n.includes("furniture") || n.includes("cabinet") || n.includes("joiner"))
      return "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=260&fit=crop";
    if (n.includes("paint") || n.includes("colour") || n.includes("color") || n.includes("wall finish"))
      return "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=260&fit=crop";
    if (n.includes("clean") || n.includes("sweep") || n.includes("mop") || n.includes("sanitiz") || n.includes("hygiene"))
      return "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=260&fit=crop";
    if (n.includes("pest") || n.includes("cockroach") || n.includes("rat") || n.includes("termite") || n.includes("insect"))
      return "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=400&h=260&fit=crop";
    if (n.includes("appliance") || n.includes("washing") || n.includes("fridge") || n.includes("microwave") || n.includes("machine"))
      return "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=260&fit=crop";
    if (n.includes("salon") || n.includes("beauty") || n.includes("spa") || n.includes("hair") || n.includes("grooming"))
      return "https://images.unsplash.com/photo-1560066984-138daaa0ad8a?w=400&h=260&fit=crop";
    if (n.includes("security") || n.includes("cctv") || n.includes("camera") || n.includes("alarm") || n.includes("surveillance"))
      return "https://images.unsplash.com/photo-1580428180098-24b353d7e9d9?w=400&h=260&fit=crop";
    if (n.includes("garden") || n.includes("lawn") || n.includes("plant") || n.includes("outdoor") || n.includes("landscap"))
      return "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=260&fit=crop";
    if (n.includes("move") || n.includes("shifting") || n.includes("packer") || n.includes("relocat") || n.includes("transport"))
      return "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=260&fit=crop";
    if (n.includes("roof") || n.includes("ceiling") || n.includes("tile") || n.includes("floor") || n.includes("mason"))
      return "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=260&fit=crop";
    if (n.includes("weld") || n.includes("fabricat") || n.includes("metal") || n.includes("gate") || n.includes("grill"))
      return "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400&h=260&fit=crop";
    if (n.includes("repair") || n.includes("fix") || n.includes("handyman") || n.includes("maintenance"))
      return "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=260&fit=crop";
    const FALLBACKS = [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1574359411659-15573a27fd0c?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&h=260&fit=crop",
    ];
    return FALLBACKS[name.charCodeAt(0) % FALLBACKS.length];
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader
          showTenantBranding={activeTab !== "PROFILE" && activeTab !== "TICKETS"}
          showBack={activeTab === "PROFILE" || activeTab === "TICKETS"}
          onBackPress={() => {
            if (activeTab === "TICKETS") {
              setActiveTab("HOME");
            } else if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              setActiveTab("HOME");
            }
          }}
          title={
            activeTab === "PROFILE"
              ? "Profile Details"
              : activeTab === "TICKETS"
                ? "Service History"
                : undefined
          }
          rightAction={undefined}
        />

        {/* Reusable Customer Logout Popup */}
        <CustomerPopup
          visible={logoutPopupVisible}
          type="warning"
          title="Logout Confirmation"
          message="Are you sure you want to logout?"
          confirmText="OK"
          cancelText="Cancel"
          onConfirm={() => {
            setLogoutPopupVisible(false);
            logout();
          }}
          onCancel={() => setLogoutPopupVisible(false)}
        />

        {/* Drawer Removed */}

        {/* Main Content View below header & Customer Account Banner */}
        {bookingMode === "AMC" && activeTab === "HOME" ? (
          <View style={{ flex: 1 }}>
            {/* Location Bar */}
            <View style={[styles.locationBar, { backgroundColor: theme.colors.card, marginBottom: 0 }]}>
              <View style={styles.locationLeft}>
                <MapPin size={16} color={theme.colors.primary} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={[styles.locationLabel, { color: theme.colors.textMuted }]}>Your Location</Text>
                  <Text style={[styles.locationAddr, { color: theme.colors.text }]} numberOfLines={1}>
                    {profile?.address
                      ? [profile.address, profile.city].filter(Boolean).join(", ")
                      : "Set your address"}
                  </Text>
                </View>
              </View>
            </View>

            {/* AMC Customer Service Mode Switcher */}
            {hasActiveAmc && (
              <View style={{ flexDirection: "row", backgroundColor: theme.colors.card, borderRadius: 12, padding: 4, marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderWidth: 1, borderColor: theme.colors.borderLight }}>
                <Pressable
                  onPress={() => setBookingMode("NORMAL")}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: (bookingMode as string) === "NORMAL" ? theme.colors.primary : "transparent",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: (bookingMode as string) === "NORMAL" ? "#ffffff" : theme.colors.textMuted }}>
                    Normal Service
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setBookingMode("AMC")}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: (bookingMode as string) === "AMC" ? theme.colors.primary : "transparent",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: (bookingMode as string) === "AMC" ? "#ffffff" : theme.colors.textMuted }}>
                    AMC Service
                  </Text>
                </Pressable>
              </View>
            )}

            <CustomerAssetsScreen />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing()}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
          >
            {activeTab === "HOME" && (
              <View>
                {/* Location Bar */}
                <View style={[styles.locationBar, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.locationLeft}>
                    <MapPin size={16} color={theme.colors.primary} />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={[styles.locationLabel, { color: theme.colors.textMuted }]}>Your Location</Text>
                      <Text style={[styles.locationAddr, { color: theme.colors.text }]} numberOfLines={1}>
                        {profile?.address
                          ? [profile.address, profile.city].filter(Boolean).join(", ")
                          : "Set your address"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* AMC Customer Service Mode Switcher */}
                {hasActiveAmc && (
                  <View style={{ flexDirection: "row", backgroundColor: theme.colors.card, borderRadius: 12, padding: 4, marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderWidth: 1, borderColor: theme.colors.borderLight }}>
                    <Pressable
                      onPress={() => setBookingMode("NORMAL")}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        backgroundColor: bookingMode === "NORMAL" ? theme.colors.primary : "transparent",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: bookingMode === "NORMAL" ? "#ffffff" : theme.colors.textMuted }}>
                        Normal Service
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setBookingMode("AMC")}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        backgroundColor: bookingMode === "AMC" ? theme.colors.primary : "transparent",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: bookingMode === "AMC" ? "#ffffff" : theme.colors.textMuted }}>
                        AMC Service
                      </Text>
                    </Pressable>
                  </View>
                )}


              {/* Search Bar + Dropdown */}
              <View style={[styles.homeSearchWrap, { zIndex: 100, elevation: 100 }]}>
                <View style={{ position: "relative" }}>
                  <View style={[
                    styles.homeSearchBar,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: searchQuery ? theme.colors.primary : theme.colors.borderLight,
                      borderBottomLeftRadius: searchQuery.length > 0 ? 0 : 12,
                      borderBottomRightRadius: searchQuery.length > 0 ? 0 : 12,
                      borderBottomWidth: searchQuery.length > 0 ? 0 : 1.5,
                    }
                  ]}>
                    <Search size={17} color={searchQuery ? theme.colors.primary : theme.colors.textLight} />
                    <TextInput
                      style={[styles.homeSearchInput, { color: theme.colors.text }]}
                      placeholder="Search for services..."
                      placeholderTextColor={theme.colors.textLight}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      returnKeyType="search"
                      autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                      <Pressable onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                        <Text style={{ color: theme.colors.textMuted, fontSize: 16, lineHeight: 18 }}>✕</Text>
                      </Pressable>
                    )}
                  </View>
                  {/* Search Dropdown */}
                  {searchQuery.length > 0 && (
                    <View style={[
                      styles.searchDropdown,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.primary,
                        borderTopWidth: 0,
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                        borderBottomLeftRadius: 12,
                        borderBottomRightRadius: 12,
                        top: "100%",
                      }
                    ]}>
                      {(() => {
                        const results = categories.filter((c: any) =>
                          c.name.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                        if (results.length === 0) {
                          return (
                            <View style={{ padding: 18, alignItems: "center" }}>
                              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>No services found for "{searchQuery}"</Text>
                            </View>
                          );
                        }
                        return results.slice(0, 7).map((cat: any, idx: number) => (
                          <Pressable
                            key={cat.id}
                            style={({ pressed }) => [
                              styles.searchDropdownItem,
                              { borderBottomColor: theme.colors.borderLight },
                              idx === results.slice(0, 7).length - 1 && { borderBottomWidth: 0 },
                              pressed && { backgroundColor: `${theme.colors.primary}10` },
                            ]}
                            onPress={() => {
                              setSearchQuery("");
                              navigation.navigate("RaiseTicket", {
                                categoryId: cat.id,
                                categoryName: cat.name,
                                bookingMode: hasActiveAmc ? bookingMode : "NORMAL",
                              });
                            }}
                          >
                            <Image source={{ uri: getCatImage(cat.name) }} style={styles.searchDropdownImg} resizeMode="cover" />
                            <Text style={[styles.searchDropdownName, { color: theme.colors.text }]} numberOfLines={1}>{cat.name}</Text>
                            <ChevronRight size={14} color={theme.colors.textMuted} />
                          </Pressable>
                        ));
                      })()}
                    </View>
                  )}
                </View>
              </View>

              {/* Featured Services Banner Carousel */}
              {!isCategoriesLoading && categories.length > 0 && (
                <View style={styles.featuredSection}>
                  <Text style={[styles.featuredLabel, { color: theme.colors.textMuted }]}>Popular Services</Text>
                  <View style={{ position: "relative" }}>
                    <ScrollView
                      ref={featuredScrollRef}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.featuredList}
                      decelerationRate="fast"
                      snapToInterval={FEATURED_CARD_W + 12}
                      snapToAlignment="start"
                      scrollEventThrottle={16}
                    >
                      {categories.slice(0, 5).map((cat: any) => (
                        <LinearGradient
                          key={cat.id}
                          colors={getCatBannerGrad(cat.name)}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0.6 }}
                          style={[styles.featuredBannerCard, { width: FEATURED_CARD_W }]}
                        >
                          <View style={styles.featuredBannerLeft}>
                            <View style={styles.featuredBannerTagRow}>
                              <Text style={styles.featuredBannerStar}>⭐</Text>
                              <Text style={styles.featuredBannerTag}>TOP SERVICE</Text>
                            </View>
                            <Text style={styles.featuredBannerName} numberOfLines={2}>{cat.name}</Text>
                            <Text style={styles.featuredBannerSub}>Experts at your doorstep</Text>
                            <Pressable
                              style={[styles.featuredBannerBtn, { backgroundColor: theme.colors.primary }]}
                              onPress={() => navigation.navigate("RaiseTicket", {
                                categoryId: cat.id,
                                categoryName: cat.name,
                                bookingMode: hasActiveAmc ? bookingMode : "NORMAL",
                              })}
                            >
                              <Text style={styles.featuredBannerBtnText}>Book Now</Text>
                            </Pressable>
                          </View>
                          <Image
                            source={{ uri: getCatImage(cat.name) }}
                            style={styles.featuredBannerImg}
                            resizeMode="cover"
                          />
                        </LinearGradient>
                      ))}
                    </ScrollView>
                    {/* Dots overlaid at bottom of carousel */}
                    <View pointerEvents="none" style={styles.featuredDots}>
                      {categories.slice(0, 5).map((_: any, i: number) => (
                        <View
                          key={i}
                          style={[
                            styles.featuredDot,
                            {
                              backgroundColor: i === featuredDotIdx ? "#ffffff" : "rgba(255,255,255,0.35)",
                              width: i === featuredDotIdx ? 20 : 6,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Promo Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoChipRow}>
                {[
                  { label: "⚡ Quick Book", color: "#F97316" },
                  { label: "🎁 20% OFF Today", color: "#7C3AED" },
                  { label: "⭐ Top Rated", color: "#0EA5E9" },
                  { label: "✅ Verified Pros", color: "#059669" },
                ].map((chip, i) => (
                  <View key={i} style={[styles.promoChip, { backgroundColor: `${chip.color}14`, borderColor: `${chip.color}35` }]}>
                    <Text style={[styles.promoChipText, { color: chip.color }]}>{chip.label}</Text>
                  </View>
                ))}
              </ScrollView>

              {/* Services Grid */}
              <View style={styles.serviceSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Explore all services</Text>
                  <Sparkles size={15} color={theme.colors.primary} />
                </View>
                {isCategoriesLoading ? (
                  <AppLoader message="Loading..." />
                ) : (
                  <>
                    <View style={styles.catGridUC}>
                      {categories.slice(0, showAllCats ? categories.length : 6).map((cat: any) => (
                        <Pressable
                          key={cat.id}
                          style={({ pressed }) => [
                            styles.catCardUC,
                            { backgroundColor: theme.colors.card, width: CAT_CARD_W },
                            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                          ]}
                          onPress={() => navigation.navigate("RaiseTicket", {
                            categoryId: cat.id,
                            categoryName: cat.name,
                            bookingMode: hasActiveAmc ? bookingMode : "NORMAL",
                          })}
                        >
                          <View style={[styles.catImageWrap, { backgroundColor: theme.colors.background }]}>
                            <Image
                              source={{ uri: getCatImage(cat.name) }}
                              style={styles.catImage}
                              resizeMode="cover"
                            />
                          </View>
                          <Text style={[styles.catNameUC, { color: theme.colors.text }]} numberOfLines={2}>
                            {cat.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {categories.length > 6 && (
                      <Pressable
                        onPress={() => setShowAllCats(p => !p)}
                        style={({ pressed }) => [
                          styles.showMoreBtn,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: `${theme.colors.primary}30`,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.showMoreText, { color: theme.colors.primary }]}>
                          {showAllCats ? "Show Less" : "View all services"}
                        </Text>
                        <Text style={{ color: theme.colors.primary, fontSize: 11, marginTop: 1 }}>
                          {showAllCats ? "▲" : "▼"}
                        </Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>

              {/* Recent Booking Strip */}
              {tickets.length > 0 && (
                <View style={styles.recentSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Recent Booking</Text>
                    <Pressable onPress={() => setActiveTab("TICKETS")}>
                      <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See All</Text>
                    </Pressable>
                  </View>
                  <AppCard
                    onPress={() => navigation.navigate("CustomerJobDetails", { jobId: tickets[0].id })}
                    style={styles.recentCard}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ClipboardList size={15} color={theme.colors.textMuted} />
                        <Text style={[styles.ticketId, { color: theme.colors.textMuted, fontSize: 12 }]}>{tickets[0].ticketNumber}</Text>
                      </View>
                      <AppBadge label={getStatusLabel(tickets[0].status)} variant={getStatusVariant(tickets[0].status)} />
                    </View>
                    <Text style={[styles.cardTitle, { color: theme.colors.text, fontSize: 15 }]}>
                      {tickets[0].subCategory?.name || tickets[0].subCategory?.category?.name || "—"}
                    </Text>

                    {/* Assigning expert notice */}
                    {["NEW_TICKET", "ASSIGNED"].includes(tickets[0].status) && (
                      <View style={[styles.assigningBanner, { backgroundColor: `${theme.colors.primary}0e`, borderColor: `${theme.colors.primary}25` }]}>
                        <UserCheck size={14} color={theme.colors.primary} />
                        <Text style={[styles.assigningText, { color: theme.colors.primary }]}>
                          {tickets[0].status === "ASSIGNED"
                            ? "Expert assigned — confirming your appointment"
                            : "Finding the best expert for you…"}
                        </Text>
                      </View>
                    )}

                    <View style={[styles.timeInfo, { marginTop: 8 }]}>
                      <Calendar size={13} color={theme.colors.textMuted} style={{ marginRight: 5 }} />
                      <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>{formatDate(tickets[0].createdAt)}</Text>
                    </View>
                  </AppCard>
                </View>
              )}
            </View>
          )}

          {activeTab === "AMC" && (
            <CustomerAssetsScreen />
          )}

          {activeTab === "TICKETS" && (
            <View style={{ paddingTop: 16 }}>

              <View style={[styles.tabHeader, { paddingHorizontal: theme.spacing.md }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
                  Recent Service History
                </Text>
              </View>

              {isTicketsLoading ? (
                <AppLoader message="Retrieving requests..." />
              ) : tickets.length === 0 ? (
                <AppEmptyState
                  title="No Active Requests"
                  description="You haven't logged any service tickets yet. Tap a category above to request appliance support."
                />
              ) : (
                tickets.map((item) => (
                  <AppCard
                    key={item.id}
                    onPress={() =>
                      navigation.navigate("CustomerJobDetails", {
                        jobId: item.id,
                      })
                    }
                    style={[styles.ticketCard, { marginHorizontal: theme.spacing.md }]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ClipboardList size={16} color={theme.colors.textMuted} />
                        <Text
                          style={[
                            styles.ticketId,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {item.ticketNumber}
                        </Text>
                      </View>
                      <AppBadge
                        label={getStatusLabel(item.status)}
                        variant={getStatusVariant(item.status)}
                      />
                    </View>

                    <Text
                      style={[styles.cardTitle, { color: theme.colors.text, fontSize: 16, marginTop: 4 }]}
                    >
                      {item.subCategory?.name || "—"}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: 14,
                        marginBottom: 16,
                        lineHeight: 20,
                      }}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>

                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.colors.borderLight },
                      ]}
                    />

                    <View style={styles.cardFooter}>
                      <View style={styles.timeInfo}>
                        <Calendar
                          size={14}
                          color={theme.colors.textMuted}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            color: theme.colors.textMuted,
                            fontWeight: "500",
                          }}
                        >
                          {formatDate(item.createdAt)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.actionLink,
                          { backgroundColor: `${theme.colors.primary}15` },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: theme.colors.primary,
                            fontWeight: "700",
                            marginRight: 4,
                          }}
                        >
                          Details
                        </Text>
                        <ChevronRight size={16} color={theme.colors.primary} />
                      </View>
                    </View>
                  </AppCard>
                ))
              )}
            </View>
          )}

          {activeTab === "INVOICES" && (
            <View style={{ paddingTop: 16 }}>
              {isInvoicesLoading ? (
                <AppLoader message="Retrieving invoices..." />
              ) : invoices.length === 0 ? (
                <AppEmptyState
                  title="No Invoices Found"
                  description="Completed services requiring payment will generate dynamic invoices listed here."
                />
              ) : (
                invoices.map((inv) => (
                  <AppCard
                    key={inv.id}
                    style={[styles.ticketCard, { marginHorizontal: theme.spacing.md }]}
                    onPress={() =>
                      navigation.navigate("InvoiceDetails", { invoiceId: inv.id })
                    }
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <FileText size={16} color={theme.colors.textMuted} />
                        <Text
                          style={[
                            styles.ticketId,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {inv.invoiceNumber}
                        </Text>
                      </View>
                      <AppBadge
                        label={inv.payment?.status || "UNPAID"}
                        variant="success"
                      />
                    </View>
                    <Text
                      style={[styles.invoiceTitle, { color: theme.colors.text }]}
                    >
                      Ticket Ref:{" "}
                      <Text style={{ fontWeight: "700" }}>
                        {inv.ticket?.ticketNumber || "—"}
                      </Text>
                    </Text>
                    <View style={styles.invoiceBreakdown}>
                      <View style={styles.breakdownRow}>
                        <Text
                          style={{ color: theme.colors.textMuted, fontSize: 13 }}
                        >
                          Base Amount:
                        </Text>
                        <Text style={{ color: theme.colors.text, fontSize: 13 }}>
                          ₹{inv.subtotal}
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text
                          style={{ color: theme.colors.textMuted, fontSize: 13 }}
                        >
                          {inv.gstPercent > 0
                            ? `GST (${inv.gstPercent}%):`
                            : "GST:"}
                        </Text>
                        <Text style={{ color: theme.colors.text, fontSize: 13 }}>
                          ₹{inv.gstAmount}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.divider,
                          { backgroundColor: theme.colors.borderLight },
                        ]}
                      />
                      <View style={styles.breakdownRow}>
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontSize: 14,
                            fontWeight: "700",
                          }}
                        >
                          Total:
                        </Text>
                        <Text
                          style={{
                            color: theme.colors.primary,
                            fontSize: 14,
                            fontWeight: "700",
                          }}
                        >
                          ₹{inv.total}
                        </Text>
                      </View>
                    </View>
                  </AppCard>
                ))
              )}
            </View>
          )}

          {activeTab === "PAYMENTS" && (
            <View style={{ paddingTop: 16 }}>
              {isPaymentsLoading ? (
                <AppLoader message="Retrieving transactions..." />
              ) : payments.length === 0 ? (
                <AppEmptyState
                  title="No transaction records found"
                  description="Your service payment records will be documented here once transaction processes."
                />
              ) : (
                payments.map((item) => (
                  <AppCard
                    key={item.id}
                    style={styles.ticketCard}
                    onPress={() => {
                      if (item.invoice?.invoiceNumber) {
                        const matchingInvoice = invoices.find(
                          (inv) =>
                            inv.invoiceNumber === item.invoice?.invoiceNumber,
                        );
                        navigation.navigate("InvoiceDetails", {
                          invoiceId: matchingInvoice?.id || item.id,
                        });
                      }
                    }}
                  >
                    <View style={styles.cardHeader}>
                      <View
                        style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                      >
                        <Text
                          style={[
                            styles.label,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          Payment ID
                        </Text>
                        <Text
                          style={[styles.valueId, { color: theme.colors.text }]}
                        >
                          {item.id.substring(0, 8).toUpperCase()}
                        </Text>
                      </View>
                      <AppBadge
                        label={item.status}
                        variant={getPaymentStatusVariant(item.status)}
                      />
                    </View>

                    <View style={styles.detailRow}>
                      <Text
                        style={[styles.label, { color: theme.colors.textMuted }]}
                      >
                        Invoice No.
                      </Text>
                      <Text style={[styles.value, { color: theme.colors.text }]}>
                        {item.invoice?.invoiceNumber || "—"}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text
                        style={[styles.label, { color: theme.colors.textMuted }]}
                      >
                        Amount
                      </Text>
                      <Text
                        style={[
                          styles.valueAmount,
                          { color: theme.colors.primary },
                        ]}
                      >
                        ₹{item.amount}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.colors.borderLight },
                      ]}
                    />

                    <View style={styles.cardFooter}>
                      <View style={styles.timeInfo}>
                        <Calendar
                          size={14}
                          color={theme.colors.textMuted}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            color: theme.colors.text,
                            fontWeight: "600",
                          }}
                        >
                          {formatDate(item.createdAt)}
                        </Text>
                      </View>
                      {item.invoice?.invoiceNumber ? (
                        <View
                          style={[
                            styles.actionLink,
                            { backgroundColor: `${theme.colors.primary}15` },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              color: theme.colors.primary,
                              fontWeight: "700",
                              marginRight: 4,
                            }}
                          >
                            Invoice
                          </Text>
                          <ChevronRight size={16} color={theme.colors.primary} />
                        </View>
                      ) : null}
                    </View>
                  </AppCard>
                ))
              )}
            </View>
          )}

          {activeTab === "PROFILE" && (
            <View style={{ flex: 1, paddingTop: 16 }}>
              <AppCard style={styles.formCard}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={[
                      styles.drawerSectionTitle,
                      { color: theme.colors.textMuted, marginVertical: 0 },
                    ]}
                  >
                    Profile Details
                  </Text>
                  <Pressable
                    onPress={() => setIsEditingProfile(!isEditingProfile)}
                    style={({ pressed }) => [
                      styles.editToggleBtn,
                      {
                        backgroundColor: isEditingProfile
                          ? `${theme.colors.danger}15`
                          : `${theme.colors.primary}15`,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Edit2
                      size={14}
                      color={
                        isEditingProfile
                          ? theme.colors.danger
                          : theme.colors.primary
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.editToggleText,
                        {
                          color: isEditingProfile
                            ? theme.colors.danger
                            : theme.colors.primary,
                        },
                      ]}
                    >
                      {isEditingProfile ? "Cancel" : "Edit"}
                    </Text>
                  </Pressable>
                </View>

                <View style={{ alignItems: "center", marginBottom: 24 }}>
                  <View style={[styles.avatarCircleLg, { backgroundColor: `${theme.colors.primary}15` }]}>
                    {(profile?.profileImageUrl || user?.avatar) ? (
                      <Image
                        source={{ uri: profile?.profileImageUrl || user?.avatar }}
                        style={styles.avatarImageLg}
                      />
                    ) : (
                      <User color={theme.colors.primary} size={40} />
                    )}
                  </View>
                  {isEditingProfile && (
                    <TouchableOpacity
                      style={[styles.editPhotoBtn, { backgroundColor: theme.colors.primary }]}
                      onPress={handlePickPhoto}
                      disabled={uploadPhotoMutation.isPending}
                    >
                      <Edit2 size={12} color="#fff" />
                      <Text style={{ color: "#fff", fontSize: 12, marginLeft: 4, fontWeight: "600" }}>
                        {uploadPhotoMutation.isPending ? "Uploading..." : "Change Photo"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <AppInput
                  label="Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  editable={isEditingProfile}
                  leftIcon={<User size={16} color={theme.colors.textMuted} />}
                  style={!isEditingProfile && { opacity: 0.7 }}
                />

                <AppInput
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={isEditingProfile}
                  leftIcon={<Mail size={16} color={theme.colors.textMuted} />}
                  style={!isEditingProfile && { opacity: 0.7 }}
                />

                <AppInput
                  label="Primary Phone"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter mobile phone number"
                  keyboardType="phone-pad"
                  editable={false}
                  leftIcon={
                    <Smartphone size={16} color={theme.colors.textMuted} />
                  }
                  style={{ opacity: 0.6 }}
                />

                <AppInput
                  label="Alternate Phone"
                  value={alternatePhone}
                  onChangeText={setAlternatePhone}
                  placeholder="Enter alternate phone number"
                  keyboardType="phone-pad"
                  editable={isEditingProfile}
                  leftIcon={<Phone size={16} color={theme.colors.textMuted} />}
                  style={!isEditingProfile && { opacity: 0.7 }}
                />

                <View
                  style={[
                    styles.divider,
                    {
                      backgroundColor: theme.colors.borderLight,
                      marginVertical: 16,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.drawerSectionTitle,
                    { color: theme.colors.textMuted, marginBottom: 16 },
                  ]}
                >
                  Address Details
                </Text>

                <AppInput
                  label="Address"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter street address"
                  editable={isEditingProfile}
                  leftIcon={<MapPin size={16} color={theme.colors.textMuted} />}
                  style={!isEditingProfile && { opacity: 0.7 }}
                />

                <AppInput
                  label="City"
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter city"
                  editable={isEditingProfile}
                  leftIcon={<Building size={16} color={theme.colors.textMuted} />}
                  style={!isEditingProfile && { opacity: 0.7 }}
                />

                <AppInput
                  label="Pincode"
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="Enter pincode"
                  keyboardType="numeric"
                  editable={isEditingProfile}
                  leftIcon={<Hash size={16} color={theme.colors.textMuted} />}
                  style={!isEditingProfile && { opacity: 0.7 }}
                />

                {isEditingProfile && (
                  <AppButton
                    title="Save Changes"
                    onPress={handleSaveProfile}
                    loading={updateProfileMutation.isPending}
                    style={{ marginTop: 24 }}
                  />
                )}

                <Pressable
                  onPress={() => setLogoutPopupVisible(true)}
                  style={({ pressed }) => [
                    styles.profileLogoutBtn,
                    { backgroundColor: `${theme.colors.danger}15`, marginTop: 32 },
                    pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <LogOut size={20} color={theme.colors.danger} />
                  <Text
                    style={[
                      styles.profileLogoutText,
                      { color: theme.colors.danger },
                    ]}
                  >
                    Logout
                  </Text>
                </Pressable>
              </AppCard>
            </View>
          )}
        </ScrollView>
      )}

        {/* Sticky Bottom Navigation Bar */}
        <View style={[
          styles.bottomNav,
          {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.borderLight,
            paddingBottom: Math.max(insets.bottom, 8),
            height: BASE_TAB_HEIGHT + Math.max(insets.bottom, 8),
          }
        ]}>
          <Pressable style={styles.navItem} onPress={() => setActiveTab("HOME")}>
            <View style={[styles.navIconWrap, activeTab === "HOME" && { backgroundColor: `${theme.colors.primary}18` }]}>
              <Home size={tabIconSize} color={activeTab === "HOME" ? theme.colors.primary : theme.colors.textMuted} />
            </View>
            <Text style={[styles.navLabel, { fontSize: tabLabelSize, color: activeTab === "HOME" ? theme.colors.primary : theme.colors.textMuted, fontWeight: activeTab === "HOME" ? "700" : "500" }]}>Home</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => setActiveTab("TICKETS")}>
            <View style={[styles.navIconWrap, activeTab === "TICKETS" && { backgroundColor: `${theme.colors.primary}18` }]}>
              <ClipboardList size={tabIconSize} color={activeTab === "TICKETS" ? theme.colors.primary : theme.colors.textMuted} />
            </View>
            <Text style={[styles.navLabel, { fontSize: tabLabelSize, color: activeTab === "TICKETS" ? theme.colors.primary : theme.colors.textMuted, fontWeight: activeTab === "TICKETS" ? "700" : "500" }]}>Tickets</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => setActiveTab("PAYMENTS")}>
            <View style={[styles.navIconWrap, activeTab === "PAYMENTS" && { backgroundColor: `${theme.colors.primary}18` }]}>
              <CreditCard size={tabIconSize} color={activeTab === "PAYMENTS" ? theme.colors.primary : theme.colors.textMuted} />
            </View>
            <Text style={[styles.navLabel, { fontSize: tabLabelSize, color: activeTab === "PAYMENTS" ? theme.colors.primary : theme.colors.textMuted, fontWeight: activeTab === "PAYMENTS" ? "700" : "500" }]}>Payments</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => setActiveTab("INVOICES")}>
            <View style={[styles.navIconWrap, activeTab === "INVOICES" && { backgroundColor: `${theme.colors.primary}18` }]}>
              <FileText size={tabIconSize} color={activeTab === "INVOICES" ? theme.colors.primary : theme.colors.textMuted} />
            </View>
            <Text style={[styles.navLabel, { fontSize: tabLabelSize, color: activeTab === "INVOICES" ? theme.colors.primary : theme.colors.textMuted, fontWeight: activeTab === "INVOICES" ? "700" : "500" }]}>Invoices</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => setActiveTab("PROFILE")}>
            <View style={[styles.navIconWrap, activeTab === "PROFILE" && { backgroundColor: `${theme.colors.primary}18` }]}>
              <User size={tabIconSize} color={activeTab === "PROFILE" ? theme.colors.primary : theme.colors.textMuted} />
            </View>
            <Text style={[styles.navLabel, { fontSize: tabLabelSize, color: activeTab === "PROFILE" ? theme.colors.primary : theme.colors.textMuted, fontWeight: activeTab === "PROFILE" ? "700" : "500" }]}>Profile</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 120,
  },
  tabHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginVertical: 12,
  },
  ticketCard: {
    marginBottom: 14,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 18,
    shadowColor: "rgba(15,23,42,0.08)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ticketId: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    marginVertical: 14,
    opacity: 0.6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  invoiceTitle: {
    fontSize: 15,
    marginBottom: 12,
    fontWeight: "500",
  },
  invoiceBreakdown: {
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.015)",
    padding: 12,
    borderRadius: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  drawerSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  formCard: {
    padding: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: "rgba(15,23,42,0.07)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarCircleLg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImageLg: {
    width: "100%",
    height: "100%",
  },
  editPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: -12,
    borderWidth: 2,
    borderColor: "#fff",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    width: 110,
  },
  valueId: {
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
    textAlign: "left",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    textAlign: "left",
  },
  valueAmount: {
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
    textAlign: "left",
  },
  editToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editToggleText: {
    fontSize: 13,
    fontWeight: "700",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 26 : 8,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "rgba(226, 232, 240, 0.8)",
    shadowColor: "rgba(15,23,42,0.06)",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 2,
  },
  navIconWrap: {
    width: 52,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: "500",
    letterSpacing: 0.1,
    marginTop: 3,
  },
  profileLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  profileLogoutText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  featuredSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  featuredLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: 12,
  },
  featuredList: {
    gap: 12,
    paddingBottom: 4,
  },
  featuredBannerCard: {
    borderRadius: 18,
    overflow: "hidden" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingLeft: 20,
    paddingVertical: 18,
    minHeight: 155,
  },
  featuredBannerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  featuredBannerTagRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 10,
  },
  featuredBannerStar: {
    fontSize: 13,
  },
  featuredBannerTag: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.58)",
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
  featuredBannerName: {
    fontSize: 19,
    fontWeight: "800" as const,
    color: "#ffffff",
    lineHeight: 25,
    marginBottom: 5,
  },
  featuredBannerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.60)",
    marginBottom: 14,
    lineHeight: 17,
  },
  featuredBannerBtn: {
    alignSelf: "flex-start" as const,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
  },
  featuredBannerBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#ffffff",
  },
  featuredBannerImg: {
    width: 110,
    height: 120,
    borderRadius: 12,
  },
  featuredDots: {
    position: "absolute" as const,
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  featuredDot: {
    height: 5,
    borderRadius: 3,
  },
  showMoreBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    alignSelf: "center" as const,
    marginTop: 16,
    paddingVertical: 11,
    paddingHorizontal: 28,
    borderRadius: 26,
    borderWidth: 1.5,
    shadowColor: "rgba(0,0,0,0.07)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: "700" as const,
    letterSpacing: 0.2,
  },
  locationBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  locationLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
    marginBottom: 2,
  },
  locationAddr: {
    fontSize: 13,
    fontWeight: "700" as const,
    maxWidth: 220,
  },
  locationBellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  notifBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700" as const,
    lineHeight: 11,
  },
  homeSearchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  homeSearchBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  homeSearchPlaceholder: {
    fontSize: 14,
    flex: 1,
  },
  homeSearchInput: {
    fontSize: 14,
    flex: 1,
    paddingVertical: 0,
  },
  searchDropdown: {
    position: "absolute" as const,
    top: 52,
    left: 0,
    right: 0,
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 200,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    overflow: "hidden" as const,
  },
  searchDropdownItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  searchDropdownImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  searchDropdownName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500" as const,
  },
  heroBannerWrap: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  heroBanner: {
    borderRadius: 18,
    overflow: "hidden" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingLeft: 20,
    paddingVertical: 20,
    minHeight: 155,
  },
  heroBannerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  heroBannerTag: {
    fontSize: 10,
    color: "rgba(255,255,255,0.60)",
    fontWeight: "700" as const,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    marginBottom: 6,
  },
  heroBannerTitle: {
    fontSize: 19,
    fontWeight: "800" as const,
    color: "#ffffff",
    lineHeight: 26,
    marginBottom: 5,
  },
  heroBannerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 18,
    marginBottom: 14,
  },
  heroBannerBtn: {
    alignSelf: "flex-start" as const,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
  },
  heroBannerBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#ffffff",
  },
  heroBannerImg: {
    width: 120,
    height: 140,
    borderRadius: 12,
  },
  promoChipRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 16,
  },
  promoChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  promoChipText: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 0.1,
  },
  serviceSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800" as const,
    letterSpacing: 0.1,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  catGridUC: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
  },
  catCardUC: {
    borderRadius: 14,
    overflow: "hidden" as const,
    alignItems: "center" as const,
    paddingBottom: 10,
    shadowColor: "rgba(15,23,42,0.09)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  catImageWrap: {
    width: "100%",
    height: 90,
    overflow: "hidden" as const,
  },
  catImage: {
    width: "100%",
    height: "100%",
  },
  catNameUC: {
    fontSize: 11.5,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    paddingHorizontal: 6,
    marginTop: 8,
    lineHeight: 16,
  },
  recentSection: {
    marginTop: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  recentCard: {
    borderRadius: 16,
    padding: 16,
  },
  assigningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  assigningText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
});

export default CustomerHomeScreen;
