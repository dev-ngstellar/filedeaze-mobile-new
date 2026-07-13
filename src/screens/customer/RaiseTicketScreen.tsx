import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Camera,
  ImagePlus,
  X,
  Calendar as CalendarIcon,
  MapPin,
  ChevronDown,
  ChevronUp,
  Check,
  Zap,
  Wrench,
  Flame,
  Hammer,
  Droplet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Upload,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Map,
  Play,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useTheme } from "../../theme";
import {
  useRaiseCustomerTicket,
  useCategories,
  useCategoryDetails,
  useCustomerAddresses,
  useAddCustomerAddress,
  useUpdateCustomerAddress,
  useDeleteCustomerAddress,
  useCustomerProfile,
} from "../../hooks/useCustomer";
import { Address } from "../../services/customer.service";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { AppCard } from "../../components/AppCard";
import { AppLoader } from "../../components/AppLoader";
import { CustomerPopup } from "../../components/CustomerPopup";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "RaiseTicket">;

const compressImage = async (uri: string): Promise<string> => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.error("Failed to compress image:", error);
    return uri;
  }
};

interface WheelPickerProps {
  items: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  theme: any;
}

const WheelPicker: React.FC<WheelPickerProps> = ({ items, selectedValue, onValueChange, theme }) => {
  const ITEM_HEIGHT = 44;
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Prepend and append empty items for centering
  const data = React.useMemo(() => ["", ...items, ""], [items]);

  React.useEffect(() => {
    const index = items.indexOf(selectedValue);
    if (index !== -1 && scrollViewRef.current) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedValue, items]);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const safeIndex = Math.max(0, Math.min(items.length - 1, index));
    const val = items[safeIndex];
    if (val !== selectedValue) {
      onValueChange(val);
    }
  };

  return (
    <View style={{ height: ITEM_HEIGHT * 3, width: 70, overflow: "hidden" }}>
      {/* Target indicator lines */}
      <View
        style={{
          position: "absolute",
          top: ITEM_HEIGHT,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
          borderTopWidth: 1.5,
          borderBottomWidth: 1.5,
          borderColor: theme.colors.primary,
          backgroundColor: `${theme.colors.primary}08`,
        }}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={{ paddingVertical: 0 }}
      >
        {data.map((item, idx) => (
          <View
            key={idx}
            style={{
              height: ITEM_HEIGHT,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: item === selectedValue ? 18 : 14,
                fontWeight: item === selectedValue ? "700" : "500",
                color: item === selectedValue ? theme.colors.primary : theme.colors.textMuted,
              }}
            >
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export const RaiseTicketScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<CustomerStackParamList, "RaiseTicket">>();
  const { categoryId, categoryName } = route.params || {};
  const isCategoryLocked = !!categoryId;

  // API hooks
  const { data: categories = [], isLoading: isLoadingCats } = useCategories();
  const raiseTicketMutation = useRaiseCustomerTicket();

  // Address Book API hooks
  const { data: addresses = [], isLoading: isLoadingAddresses, refetch: refetchAddresses } = useCustomerAddresses();
  const addAddressMutation = useAddCustomerAddress();
  const updateAddressMutation = useUpdateCustomerAddress();
  const deleteAddressMutation = useDeleteCustomerAddress();
  const { data: profile } = useCustomerProfile();

  // Form states
  const [selectedCat, setSelectedCat] = useState<any>(categoryId ? { id: categoryId, name: categoryName } : null);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [description, setDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState<Date | null>(null);
  const [preferredTimeSlot, setPreferredTimeSlot] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [images, setImages] = useState<{ uri: string; type: "image" | "video" }[]>([]);
  const [imageNotes, setImageNotes] = useState("");

  // Address modal states
  const [addressBookVisible, setAddressBookVisible] = useState(false);
  const [addressFormVisible, setAddressFormVisible] = useState(false);
  const [addressForm, setAddressForm] = useState<any>({
    id: undefined,
    label: "",
    street: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
  });
  const [addressFormErrors, setAddressFormErrors] = useState<Record<string, string>>({});
  const [addressSubmitAttempted, setAddressSubmitAttempted] = useState(false);

  // Address formatting helper
  const formatFullAddress = (addr: Address) => {
    const line1 = addr.street ? addr.street.trim() : "";
    
    const cityStateZipParts = [];
    if (addr.city) cityStateZipParts.push(addr.city.trim());
    if (addr.state) cityStateZipParts.push(addr.state.trim());
    const cityState = cityStateZipParts.join(", ");
    const zip = addr.postalCode ? addr.postalCode.trim() : "";
    const line2 = cityState && zip ? `${cityState} - ${zip}` : cityState || zip;
    
    const line3 = addr.country ? addr.country.trim() : "";
    
    return [line1, line2, line3].filter(Boolean).join("\n");
  };

  // Set default address or profile fallback
  useEffect(() => {
    if (isLoadingAddresses) return;
    
    if (addresses && addresses.length > 0) {
      if (!selectedAddress) {
        setSelectedAddress(addresses[0]);
      }
    } else if (profile) {
      if (!selectedAddress && profile.address) {
        setSelectedAddress({
          id: "profile",
          label: "Profile Address",
          street: profile.address,
          city: profile.city || "",
          state: "",
          country: "India",
          postalCode: profile.pincode || "",
          isActive: true,
        });
      }
    }
  }, [addresses, isLoadingAddresses, profile]);

  // Subcategories fetched dynamically based on selected Category
  // The catalog endpoint returns { subCategories: [...with serviceCharges] }
  const { data: catDetails, isLoading: isLoadingSubs } = useCategoryDetails(selectedCat?.id);
  const subCategories = Array.isArray(catDetails)
    ? catDetails
    : (catDetails?.subCategories || catDetails?.services || []);

  // Dropdown UI states
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [subModalVisible, setSubModalVisible] = useState(false);
  const subFieldRef = React.useRef<View>(null);
  const [subDropdownLayout, setSubDropdownLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Search states for category/sub-category pickers
  const [catSearch, setCatSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");

  // Custom Modal states for Date and Time Pickers
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [tempHour, setTempHour] = useState(8);
  const [tempMin, setTempMin] = useState(0);
  const [tempPeriod, setTempPeriod] = useState<"AM" | "PM">("AM");

  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Popup states
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupType, setPopupType] = useState<"info" | "success" | "warning" | "danger">("info");
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupAction, setPopupAction] = useState<() => void>(() => { });

  // Success countdown states
  const [successVisible, setSuccessVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Validation / Error states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Time slots list
  const timeSlots = [
    "08:00 AM - 10:00 AM",
    "10:00 AM - 12:00 PM",
    "12:00 PM - 02:00 PM",
    "02:00 PM - 04:00 PM",
    "04:00 PM - 06:00 PM",
    "06:00 PM - 08:00 PM",
  ];

  const triggerPopup = (
    type: "info" | "success" | "warning" | "danger",
    title: string,
    message: string,
    onConfirm: () => void = () => setPopupVisible(false)
  ) => {
    setPopupType(type);
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupAction(() => onConfirm);
    setPopupVisible(true);
  };

  // Helper to generate calendar days
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Pad initial empty cells
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Populate day values
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    // Pad trailing empty cells to make it multiple of 7
    const totalCells = Math.ceil((firstDayIndex + totalDays) / 7) * 7;
    for (let i = firstDayIndex + totalDays; i < totalCells; i++) {
      days.push(null);
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayKey = formatDateKey(new Date());

  const isDateAllowed = (date: Date) => {
    return formatDateKey(date) > todayKey;
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("electrical") || n.includes("power") || n.includes("wire")) {
      return <Zap size={22} color={theme.colors.primary} />;
    }
    if (n.includes("plumb") || n.includes("water") || n.includes("leak")) {
      return <Droplet size={22} color={theme.colors.primary} />;
    }
    if (n.includes("ac") || n.includes("cool") || n.includes("heat") || n.includes("hvac")) {
      return <Flame size={22} color={theme.colors.primary} />;
    }
    if (n.includes("carpenter") || n.includes("wood") || n.includes("furniture")) {
      return <Hammer size={22} color={theme.colors.primary} />;
    }
    if (n.includes("repair") || n.includes("fix") || n.includes("appliance")) {
      return <Wrench size={22} color={theme.colors.primary} />;
    }
    return <Settings size={22} color={theme.colors.primary} />;
  };

  // Typed variant used in the grid tile so color + size can be overridden
  const getCategoryIconEl = (name: string, color: string, size: number) => {
    const n = name.toLowerCase();
    if (n.includes("electrical") || n.includes("power") || n.includes("wire")) {
      return <Zap size={size} color={color} />;
    }
    if (n.includes("plumb") || n.includes("water") || n.includes("leak")) {
      return <Droplet size={size} color={color} />;
    }
    if (n.includes("ac") || n.includes("cool") || n.includes("heat") || n.includes("hvac")) {
      return <Flame size={size} color={color} />;
    }
    if (n.includes("carpenter") || n.includes("wood") || n.includes("furniture")) {
      return <Hammer size={size} color={color} />;
    }
    if (n.includes("repair") || n.includes("fix") || n.includes("appliance")) {
      return <Wrench size={size} color={color} />;
    }
    return <Settings size={size} color={color} />;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedCat) newErrors.category = "Category is required";
    if (!selectedSub) newErrors.subCategory = "Sub Category is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!preferredDate || !preferredTimeSlot) {
      newErrors.preferredDate = "Visit Date and Time slot are required";
    } else {
      if (!isDateAllowed(preferredDate)) {
        newErrors.preferredDate = "Bookings can only be scheduled from tomorrow onwards.";
      }
    }
    if (!selectedAddress) newErrors.address = "Address is required";
    if (images.length === 0) newErrors.images = "At least 1 photo or video is required";
    return newErrors;
  };

  const handlePickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      triggerPopup("warning", "Permission Required", "Camera access is needed to capture issue media.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === "video";
      const limit = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > limit) {
        triggerPopup("warning", "File Too Large", `${isVideo ? "Video" : "Image"} exceeds the maximum allowed size.`);
        return;
      }
      setImages((p) => [...p, { uri: asset.uri, type: (asset.type === "video" ? "video" : "image") as "image" | "video" }]);
      if (errors.images) setErrors((prev) => ({ ...prev, images: "" }));
    }
  };

  const handleRecordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      triggerPopup("warning", "Permission Required", "Camera access is needed to record video.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
        triggerPopup("warning", "File Too Large", "Video exceeds the maximum allowed size of 50MB.");
        return;
      }
      setImages((p) => [...p, { uri: asset.uri, type: "video" }]);
      if (errors.images) setErrors((prev) => ({ ...prev, images: "" }));
    }
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      triggerPopup("warning", "Permission Required", "Gallery access is needed to upload issue media.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
    });
    if (!result.canceled) {
      const validAssets = result.assets.filter((asset) => {
        const isVideo = asset.type === "video";
        const limit = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (asset.fileSize && asset.fileSize > limit) {
          triggerPopup("warning", "File Too Large", `${asset.fileName || "File"} exceeds the maximum allowed size.`);
          return false;
        }
        return true;
      });
      const newMedia = validAssets.map((asset) => ({
        uri: asset.uri,
        type: (asset.type === "video" ? "video" : "image") as "image" | "video",
      }));
      setImages((p) => [...p, ...newMedia].slice(0, 5));
      if (errors.images) setErrors((prev) => ({ ...prev, images: "" }));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((p) => p.filter((_, i) => i !== index));
  };

  const handleOpenAddressBook = () => {
    setAddressBookVisible(true);
  };

  const handleOpenAddAddress = () => {
    setAddressForm({
      id: undefined,
      label: "",
      street: "",
      city: "",
      state: "",
      country: "India",
      postalCode: "",
    });
    setAddressFormErrors({});
    setAddressSubmitAttempted(false);
    setAddressFormVisible(true);
  };

  const handleOpenEditAddress = (item: any) => {
    setAddressForm({
      id: item.id,
      label: item.label,
      street: item.street || "",
      city: item.city || "",
      state: item.state || "",
      country: item.country || "India",
      postalCode: item.postalCode || "",
    });
    setAddressFormErrors({});
    setAddressSubmitAttempted(false);
    setAddressFormVisible(true);
  };

  const handleSaveAddress = async () => {
    setAddressSubmitAttempted(true);
    const newErrors: Record<string, string> = {};
    if (!addressForm.street.trim()) newErrors.street = "Street address is required.";
    if (!addressForm.city.trim()) newErrors.city = "City is required.";
    setAddressFormErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    try {
      const payload = {
        label: addressForm.label.trim() || "Home",
        street: addressForm.street.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim() || undefined,
        country: addressForm.country.trim() || "India",
        postalCode: addressForm.postalCode.trim() || undefined,
      };

      let saved: Address;
      if (addressForm.id) {
        saved = await updateAddressMutation.mutateAsync({ id: addressForm.id, payload });
      } else {
        saved = await addAddressMutation.mutateAsync(payload);
      }
      
      const res = await refetchAddresses();
      setAddressFormVisible(false);
      setAddressBookVisible(false);
      triggerPopup("success", "Success", "Address saved successfully.");

      if (res.data) {
        const found = res.data.find((a) => a.id === saved.id) || saved;
        setSelectedAddress(found);
      } else {
        setSelectedAddress(saved);
      }
    } catch (error: any) {
      triggerPopup("danger", "Address Error", error?.message || "Failed to save address");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await deleteAddressMutation.mutateAsync(id);
      refetchAddresses();
      if (selectedAddress?.id === id) {
        setSelectedAddress(null);
      }
    } catch (error: any) {
      triggerPopup("danger", "Address Error", error?.message || "Failed to delete address");
    }
  };

  const handleSubmit = async () => {
    // Guard: prevent double-tap from sending a second request
    if (raiseTicketMutation.isPending) return;

    setSubmitAttempted(true);
    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      triggerPopup("danger", "Validation Error", "Please fill in all mandatory fields before submitting.");
      return;
    }

    try {
      const formData = new FormData();

      // ── Required fields ──────────────────────────────────────────
      formData.append("categoryId", selectedCat.id);
      formData.append("subCategoryId", selectedSub.id);
      formData.append("description", imageNotes
        ? `${description}\n\nImage Notes: ${imageNotes}`
        : description);
      const serviceAddress = selectedAddress
        ? [
            selectedAddress.street,
            selectedAddress.city,
            selectedAddress.state,
            selectedAddress.postalCode,
            selectedAddress.country,
          ]
            .filter(Boolean)
            .join(", ")
        : "";
      formData.append("serviceAddress", serviceAddress);
      formData.append("priority", "MEDIUM");

      // ── Optional: scheduled date/time ────────────────────────────
      if (preferredDate && preferredTimeSlot) {
        const scheduledTime = new Date(preferredDate);
        const [timePart] = preferredTimeSlot.split(" - ");
        const [hhmm, ampm] = timePart.split(" ");
        let [hours, minutes] = hhmm.split(":").map(Number);
        if (ampm === "PM" && hours !== 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        scheduledTime.setHours(hours, minutes, 0, 0);
        formData.append("scheduledAt", scheduledTime.toISOString());
      }

      // ── Media files — field name must be 'media' (FilesInterceptor) ──
      const mediaList = await Promise.all(
        images.map(async (item, idx) => {
          let uploadUri = item.uri;
          let filename = item.uri.split("/").pop() ?? `media_${idx}.jpg`;

          if (item.type === "image") {
            uploadUri = await compressImage(item.uri);
            filename = `ticket_${Date.now()}_${idx}.jpg`;
          }

          const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
          let mimeType = "image/jpeg";
          if (item.type === "video") {
            mimeType = ext === "mp4" ? "video/mp4" : ext === "mov" ? "video/quicktime" : `video/${ext}`;
          } else {
            mimeType = "image/jpeg";
          }

          return {
            uri: uploadUri,
            name: filename,
            type: mimeType,
          };
        })
      );

      mediaList.forEach((media) => {
        formData.append("media", {
          uri: media.uri,
          name: media.name,
          type: media.type,
        } as any);
      });

      // Log the final payload / FormData details before API call
      console.log("=== SUBMITTING TICKET FORM DATA ===");
      if ((formData as any)._parts) {
        (formData as any)._parts.forEach(([key, val]: any) => {
          if (key === "media") {
            console.log(`- ${key}:`, { uri: val.uri, name: val.name, type: val.type });
          } else {
            console.log(`- ${key}:`, val);
          }
        });
      } else {
        console.log("- FormData object:", JSON.stringify(formData));
      }
      console.log("====================================");

      await raiseTicketMutation.mutateAsync(formData);
      setSuccessVisible(true);
      setCountdown(5);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setSuccessVisible(false);
            navigation.navigate("CustomerHome");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      triggerPopup("danger", "Submission Error", err?.message || "Failed to raise support ticket");
    }
  };

  const isFormIncomplete =
    !selectedCat ||
    !selectedSub ||
    !description.trim() ||
    !preferredDate ||
    !preferredTimeSlot ||
    !selectedAddress ||
    images.length === 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader showBack onBackPress={() => navigation.goBack()} title="Raise Ticket" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card 1: Service Category Details */}
        <AppCard style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <View style={[styles.stepBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.text, marginBottom: 0 }]}>Service Information</Text>
          </View>

          {/* Category */}
          <View style={styles.fieldWrapper}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Category</Text>
              <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
            </View>
            <Pressable
              style={[
                styles.dropdownBtn,
                {
                  backgroundColor: isCategoryLocked ? `${theme.colors.primary}08` : theme.colors.background,
                  borderColor: isCategoryLocked ? `${theme.colors.primary}30` : theme.colors.borderLight
                }
              ]}
              disabled={isCategoryLocked}
              onPress={() => {
                setSubModalVisible(false);
                setCatModalVisible(true);
              }}
            >
              <View style={styles.dropdownValueWrapper}>
                {selectedCat && (
                  <View style={styles.iconCircle}>
                    {getCategoryIcon(selectedCat.name)}
                  </View>
                )}
                <Text style={[styles.dropdownText, { color: selectedCat ? theme.colors.text : theme.colors.textLight }]}>
                  {selectedCat ? selectedCat.name : "Select category..."}
                </Text>
              </View>
              {!isCategoryLocked && (
                <ChevronDown size={18} color={theme.colors.textMuted} />
              )}
            </Pressable>
            {isCategoryLocked && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, marginLeft: 2, gap: 4 }}>

              </View>
            )}
            {submitAttempted && errors.category ? (
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>{errors.category}</Text>
            ) : null}
          </View>

          <View style={[styles.fieldWrapper, { zIndex: 1000 }]}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Sub Category</Text>
              <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
            </View>
            <View style={{ position: "relative", zIndex: 1000 }}>
              <Pressable
                style={[
                  styles.dropdownBtn,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.borderLight },
                  !selectedCat && { opacity: 0.5 },
                  subModalVisible && {
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                    borderBottomWidth: 0,
                  }
                ]}
                onPress={() => {
                  if (!selectedCat) {
                    triggerPopup("info", "Select Category", "Please select a main category first.");
                    return;
                  }
                  setSubModalVisible(!subModalVisible);
                }}
              >
                <Text style={[styles.dropdownText, { color: selectedSub ? theme.colors.text : theme.colors.textLight }]}>
                  {selectedSub ? selectedSub.name : "Select repair service detail..."}
                </Text>
                <ChevronDown size={18} color={theme.colors.textMuted} />
              </Pressable>

              {/* Sub Category Picker Dropdown Overlay */}
              {subModalVisible && (
                <View
                  style={{
                    position: "relative",
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderLight,
                    borderWidth: 1.5,
                    borderTopWidth: 1,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                    maxHeight: 300,
                    padding: 10,
                    overflow: "hidden",
                    width: "100%",
                    marginTop: -1,
                  }}
                >
                  <View style={[styles.pickerSearchBar, { backgroundColor: `${theme.colors.textMuted}08`, borderColor: theme.colors.borderLight, marginHorizontal: 0, marginBottom: 8, height: 40 }]}>
                    <Wrench size={14} color={theme.colors.textMuted} />
                    <TextInput
                      style={[styles.pickerSearchInput, { color: theme.colors.text, fontSize: 13 }]}
                      placeholder="Search services..."
                      placeholderTextColor={theme.colors.textMuted}
                      value={subSearch}
                      onChangeText={setSubSearch}
                      autoCorrect={false}
                    />
                    {subSearch.length > 0 && (
                      <Pressable onPress={() => setSubSearch("")}>
                        <X size={14} color={theme.colors.textMuted} />
                      </Pressable>
                    )}
                  </View>

                  {isLoadingSubs ? (
                    <AppLoader message="Retrieving service details..." />
                  ) : (
                    <ScrollView
                      showsVerticalScrollIndicator={true}
                      keyboardShouldPersistTaps="handled"
                      style={{ maxHeight: 220 }}
                      nestedScrollEnabled={true}
                    >
                      {(() => {
                        const filtered = subCategories.filter((s: any) =>
                          s.name.toLowerCase().includes(subSearch.toLowerCase())
                        );
                        if (filtered.length === 0) {
                          return (
                            <View style={{ alignItems: "center", paddingVertical: 20 }}>
                              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>No services found</Text>
                            </View>
                          );
                        }
                        return filtered.map((item: any, index: number) => {
                          const isActive = selectedSub?.id === item.id;
                          return (
                            <Pressable
                              key={item.id}
                              style={[
                                styles.subListItem,
                                {
                                  backgroundColor: isActive ? `${theme.colors.primary}0a` : theme.colors.background,
                                  marginVertical: 3,
                                  padding: 10,
                                  minHeight: 54,
                                },
                                isActive
                                  ? { borderColor: theme.colors.primary, borderWidth: 1.5 }
                                  : { borderColor: theme.colors.borderLight, borderWidth: 1 },
                              ]}
                              onPress={() => {
                                setSelectedSub(item);
                                setSubModalVisible(false);
                                setSubSearch("");
                                if (errors.subCategory) setErrors((prev) => ({ ...prev, subCategory: "" }));
                              }}
                            >
                              <View style={[styles.subItemNumBadge, { backgroundColor: isActive ? theme.colors.primary : `${theme.colors.textMuted}10`, width: 22, height: 22, borderRadius: 11 }]}>
                                <Text style={[styles.subItemNumText, { color: isActive ? "#fff" : theme.colors.textMuted, fontSize: 10 }]}>
                                  {String(index + 1).padStart(2, "0")}
                                </Text>
                              </View>

                              <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={[styles.subItemName, { color: isActive ? theme.colors.primary : theme.colors.text, fontSize: 12 }]}>
                                  {item.name}
                                </Text>
                                {item.serviceCharges?.length > 0 && (
                                  <Text style={[styles.subItemCharge, { color: theme.colors.textMuted, fontSize: 10 }]}>
                                    ₹{item.serviceCharges[0].amount} base charge
                                  </Text>
                                )}
                              </View>

                              {isActive && (
                                <View style={[styles.subItemCheckCircle, { backgroundColor: theme.colors.primary, width: 18, height: 18, borderRadius: 9 }]}>
                                  <Check size={10} color="#fff" />
                                </View>
                              )}
                            </Pressable>
                          );
                        });
                      })()}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
            {submitAttempted && errors.subCategory ? (
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>{errors.subCategory}</Text>
            ) : null}
            {selectedSub && (
              <View style={[styles.priceNoteBox, { backgroundColor: theme.colors.card, borderColor: `${theme.colors.primary}20` }]}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                  Estimated Price Breakdown
                </Text>
                {(() => {
                  let serviceChargeObj = null;
                  if (Array.isArray(selectedSub.serviceCharges) && selectedSub.serviceCharges.length > 0) {
                    serviceChargeObj = selectedSub.serviceCharges[0];
                  } else if (selectedSub.serviceCharges && typeof selectedSub.serviceCharges === "object") {
                    serviceChargeObj = selectedSub.serviceCharges;
                  }

                  if (serviceChargeObj) {
                    const base = Number(serviceChargeObj.serviceCharge ?? serviceChargeObj.amount) || 0;
                    const gstPct = Number(serviceChargeObj.gstPercent ?? 18);
                    const gstAmt = Math.round((base * gstPct) / 100);
                    const total = base + gstAmt;
                    return (
                      <>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                          <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>Service Charge</Text>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.text }}>₹{base}</Text>
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                          <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>GST ({gstPct}%)</Text>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.text }}>₹{gstAmt}</Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: theme.colors.borderLight, marginBottom: 8 }} />
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                          <Text style={{ fontSize: 14, fontWeight: "800", color: theme.colors.text }}>Total Estimated</Text>
                          <Text style={{ fontSize: 14, fontWeight: "800", color: theme.colors.primary }}>₹{total}</Text>
                        </View>
                      </>
                    );
                  }

                  return (
                    <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 10 }}>
                      Price to be confirmed after inspection
                    </Text>
                  );
                })()}
                <View style={{ backgroundColor: `${theme.colors.warning}12`, borderRadius: 8, padding: 8, flexDirection: "row", gap: 6 }}>
                  <Text style={{ fontSize: 10 }}>⚠️</Text>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted, flex: 1, lineHeight: 16 }}>
                    Disclaimer: This is an approximate estimate. The final price may differ after on-site inspection or if additional work is required.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.fieldWrapper}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Problem Description</Text>
              <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
            </View>
            <AppInput
              placeholder="What seems to be the problem? Detail error codes, noise details..."
              value={description}
              onChangeText={(val) => {
                setDescription(val);
                if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
              }}
              multiline
              numberOfLines={4}
              onFocus={() => setSubModalVisible(false)}
            />
            {submitAttempted && errors.description ? (
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>{errors.description}</Text>
            ) : null}
          </View>
        </AppCard>

        {/* Card 2: Date & Time Trigger Buttons */}
        <AppCard style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <View style={[styles.stepBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.text, marginBottom: 0 }]}>Preferred Visit Schedule</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            {/* Preferred Date Selector */}
            <View style={{ flex: 1 }}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Visit Date</Text>
                <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
              </View>
              <Pressable
                style={[styles.dropdownBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.borderLight }]}
                onPress={() => {
                  setSubModalVisible(false);
                  setTempDate(preferredDate);
                  setDateModalVisible(true);
                }}
              >
                <View style={styles.dropdownValueWrapper}>
                  <CalendarIcon size={18} color={theme.colors.primary} />
                  <Text style={[styles.dropdownText, { color: preferredDate ? theme.colors.text : theme.colors.textLight, fontSize: 13 }]}>
                    {preferredDate
                      ? preferredDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "Select date"}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Preferred Time Selector */}
            <View style={{ flex: 1 }}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Visit Time</Text>
                <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
              </View>
              <Pressable
                style={[styles.dropdownBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.borderLight }]}
                onPress={() => {
                  setSubModalVisible(false);
                  if (preferredTimeSlot) {
                    // Parse existing HH:MM AM/PM format
                    const parts = preferredTimeSlot.split(" ");
                    const timePart = parts[0];
                    const periodPart = parts[1] as "AM" | "PM";
                    const [hh, mm] = timePart.split(":").map(Number);
                    setTempHour(hh || 8);
                    setTempMin(mm || 0);
                    setTempPeriod(periodPart || "AM");
                  } else {
                    const now = new Date();
                    let currentH = now.getHours();
                    const currentM = Math.ceil(now.getMinutes() / 5) * 5;
                    const period: "AM" | "PM" = currentH >= 12 ? "PM" : "AM";
                    if (currentH > 12) currentH -= 12;
                    if (currentH === 0) currentH = 12;
                    setTempHour(currentH);
                    setTempMin(currentM >= 60 ? 55 : currentM);
                    setTempPeriod(period);
                  }
                  setTimeModalVisible(true);
                }}
              >
                <View style={styles.dropdownValueWrapper}>
                  <Clock size={18} color={theme.colors.primary} />
                  <Text style={[styles.dropdownText, { color: preferredTimeSlot ? theme.colors.text : theme.colors.textLight, fontSize: 13 }]}>
                    {preferredTimeSlot || "Select time"}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
          {submitAttempted && errors.preferredDate ? (
            <Text style={[styles.errorText, { color: theme.colors.danger, marginTop: 8 }]}>{errors.preferredDate}</Text>
          ) : null}
        </AppCard>

        {/* Card 3: Address Details */}
        <AppCard style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <View style={[styles.stepBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.text, marginBottom: 0 }]}>Visit Address</Text>
          </View>

          <View style={styles.fieldWrapper}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Service Address</Text>
              <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
            </View>

            {selectedAddress ? (
              <View style={{ alignItems: "center", width: "100%", marginVertical: 10 }}>
                <AppCard
                  style={{
                    width: "100%",
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: theme.colors.borderLight,
                    backgroundColor: `${theme.colors.primary}04`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.primary, marginBottom: 6, textTransform: "capitalize" }}>
                    {selectedAddress.label}
                  </Text>
                  <Text style={{ fontSize: 13, color: theme.colors.text, lineHeight: 20, textAlign: "center" }}>
                    {formatFullAddress(selectedAddress)}
                  </Text>
                </AppCard>
              </View>
            ) : (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontStyle: "italic" }}>
                  No address selected. Please add or select an address.
                </Text>
              </View>
            )}

            <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 10 }}>
              <AppButton
                title="Change Address"
                variant="outline"
                onPress={() => {
                  setSubModalVisible(false);
                  handleOpenAddressBook();
                }}
                style={{ flex: 1, height: 44 }}
              />
              <AppButton
                title="Add New Address"
                onPress={() => {
                  setSubModalVisible(false);
                  handleOpenAddAddress();
                }}
                style={{ flex: 1, height: 44 }}
              />
            </View>
            {submitAttempted && errors.address ? (
              <Text style={[styles.errorText, { color: theme.colors.danger, textAlign: "center", marginTop: 8 }]}>
                {errors.address}
              </Text>
            ) : null}
          </View>
        </AppCard>

        {/* Card 4: Document Media Attachments */}
        <AppCard style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <View style={[styles.stepBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepBadgeText}>4</Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.text, marginBottom: 0 }]}>Media Documentation</Text>
          </View>

          <View style={styles.fieldWrapper}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Upload Issue Photos/Videos (At least 1)</Text>
              <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
            </View>

            {/* Dotted Upload Card Widget */}
            <View style={[styles.uploadBox, { borderColor: theme.colors.border }]}>
              <Upload size={32} color={theme.colors.primary} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.text, marginBottom: 4 }}>
                Capture or Upload Media
              </Text>
              <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 12 }}>
                Supports Photos/Videos (Max 5 items)
              </Text>
              <View style={styles.uploadBoxBtns}>
                <AppButton title="Camera" size="sm" onPress={handlePickFromCamera} style={styles.uploadSubBtn} />
                <AppButton title="Gallery" size="sm" variant="outline" onPress={handlePickFromGallery} style={styles.uploadSubBtn} />
                <AppButton title="Record Video" size="sm" variant="outline" onPress={handleRecordVideo} style={styles.uploadSubBtn} />
              </View>
            </View>

            {/* Premium Horizontal Thumbnail Row */}
            {images.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 10 }}>
                  Attached Media ({images.length} of 5)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailList}>
                  {images.map((item, idx) => (
                    <View key={idx} style={styles.thumbnailWrapper}>
                      <Image source={{ uri: item.uri }} style={styles.thumbImage} />
                      {item.type === "video" && (
                        <View style={styles.videoOverlay}>
                          <Play size={20} color="#ffffff" fill="#ffffff" />
                        </View>
                      )}
                      <View style={styles.thumbBadge}>
                        <Text style={{ fontSize: 9, color: "#ffffff", fontWeight: "700" }}>#{idx + 1}</Text>
                      </View>
                      <Pressable style={styles.thumbDeleteBtn} onPress={() => handleRemoveImage(idx)}>
                        <X size={10} color="#ffffff" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            {submitAttempted && errors.images ? (
              <Text style={[styles.errorText, { color: theme.colors.danger, marginTop: 8 }]}>{errors.images}</Text>
            ) : null}
          </View>

          {/* Media Notes */}
          <View style={styles.fieldWrapper}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Media notes</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: "500", marginLeft: 4 }}>(Optional)</Text>
            </View>
            <AppInput
              placeholder="e.g. Model number sticker / leak spot near the pipe joint"
              value={imageNotes}
              onChangeText={setImageNotes}
              onFocus={() => setSubModalVisible(false)}
            />
          </View>
        </AppCard>

        {/* Action Button */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
          <AppButton
            title="Submit Ticket"
            onPress={handleSubmit}
            disabled={isFormIncomplete || raiseTicketMutation.isPending}
            loading={raiseTicketMutation.isPending}
            style={{ elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
          />
        </View>
      </ScrollView>

      {/* Success countdown Modal */}
      <Modal visible={successVisible} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <View style={[styles.centeredModalContent, { backgroundColor: theme.colors.card, padding: 28, alignItems: "center" }]}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: `${theme.colors.success}15`, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Check size={32} color={theme.colors.success} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text, marginBottom: 8 }}>Ticket Raised!</Text>
            <Text style={{ fontSize: 13, color: theme.colors.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 20 }}>
              Your support request has been logged successfully. Our team will get back to you shortly.
            </Text>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: `${theme.colors.primary}12`, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: theme.colors.primary }}>{countdown}</Text>
            </View>
            <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 6 }}>
              Redirecting to Home in {countdown}s...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Reusable Customer Popup Dialog */}
      <CustomerPopup
        visible={popupVisible}
        type={popupType}
        title={popupTitle}
        message={popupMessage}
        onConfirm={popupAction}
      />

      {/* ── Category Picker Modal (Premium Grid) ── */}
      <Modal
        visible={catModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setCatModalVisible(false); setCatSearch(""); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            {/* Drag handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.pickerHeader}>
              <View>
                <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>Service Category</Text>
                <Text style={[styles.pickerSubtitle, { color: theme.colors.textMuted }]}>
                  {categories.length} categories available
                </Text>
              </View>
              <Pressable
                style={[styles.pickerCloseBtn, { backgroundColor: `${theme.colors.textMuted}12` }]}
                onPress={() => { setCatModalVisible(false); setCatSearch(""); }}
              >
                <X size={16} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            {/* Search bar */}
            <View style={[styles.pickerSearchBar, { backgroundColor: `${theme.colors.textMuted}08`, borderColor: theme.colors.borderLight }]}>
              <Settings size={15} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.pickerSearchInput, { color: theme.colors.text }]}
                placeholder="Search categories..."
                placeholderTextColor={theme.colors.textMuted}
                value={catSearch}
                onChangeText={setCatSearch}
                autoCorrect={false}
              />
              {catSearch.length > 0 && (
                <Pressable onPress={() => setCatSearch("")}>
                  <X size={14} color={theme.colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* Grid list */}
            <FlatList
              data={categories.filter((c: any) =>
                c.name.toLowerCase().includes(catSearch.toLowerCase())
              )}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.catGrid}
              columnWrapperStyle={{ gap: 10 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>No categories found</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isActive = selectedCat?.id === item.id;
                const PALETTE = [
                  { bg: "#fff7ed", icon: "#f97316" },
                  { bg: "#eff6ff", icon: "#3b82f6" },
                  { bg: "#f0fdf4", icon: "#22c55e" },
                  { bg: "#fdf4ff", icon: "#a855f7" },
                  { bg: "#fff1f2", icon: "#f43f5e" },
                  { bg: "#f0f9ff", icon: "#0ea5e9" },
                ];
                const hash = item.name.charCodeAt(0) % PALETTE.length;
                const palette = PALETTE[hash];
                return (
                  <Pressable
                    style={[
                      styles.catGridTile,
                      { backgroundColor: isActive ? `${theme.colors.primary}0d` : theme.colors.background },
                      isActive && { borderColor: theme.colors.primary, borderWidth: 2 },
                      !isActive && { borderColor: theme.colors.borderLight, borderWidth: 1.5 },
                    ]}
                    onPress={() => {
                      setSelectedCat(item);
                      setSelectedSub(null);
                      setCatModalVisible(false);
                      setCatSearch("");
                      if (errors.category) setErrors((prev) => ({ ...prev, category: "" }));
                    }}
                  >
                    {/* Icon bubble */}
                    <View style={[styles.catTileIconBubble, { backgroundColor: isActive ? `${theme.colors.primary}18` : palette.bg }]}>
                      {getCategoryIconEl(
                        item.name,
                        isActive ? theme.colors.primary : palette.icon,
                        26,
                      )}
                    </View>

                    {/* Label */}
                    <Text
                      style={[styles.catTileLabel, { color: isActive ? theme.colors.primary : theme.colors.text }]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>

                    {/* Sub count badge */}
                    {(item._count?.services > 0 || item.services?.length > 0) && (
                      <View style={[styles.catTileBadge, { backgroundColor: isActive ? theme.colors.primary : `${theme.colors.textMuted}18` }]}>
                        <Text style={[styles.catTileBadgeText, { color: isActive ? "#fff" : theme.colors.textMuted }]}>
                          {item._count?.services || item.services?.length} services
                        </Text>
                      </View>
                    )}

                    {/* Selected tick */}
                    {isActive && (
                      <View style={[styles.catTileCheck, { backgroundColor: theme.colors.primary }]}>
                        <Check size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>

{/* Custom Date Picker Modal */}
      <Modal visible={dateModalVisible} transparent animationType="slide" onRequestClose={() => setDateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card, paddingBottom: 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Date</Text>
              <Pressable onPress={() => setDateModalVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <View style={{ padding: 16 }}>
              {/* Calendar Controls */}
              <View style={styles.calendarHeader}>
                <Pressable onPress={handlePrevMonth} style={styles.calendarArrow}>
                  <ChevronLeft size={20} color={theme.colors.text} />
                </Pressable>
                <Text style={[styles.calendarMonthName, { color: theme.colors.text }]}>
                  {currentMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </Text>
                <Pressable onPress={handleNextMonth} style={styles.calendarArrow}>
                  <ChevronRight size={20} color={theme.colors.text} />
                </Pressable>
              </View>

              {/* Calendar Weekday Names */}
              <View style={styles.weekdayRow}>
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <Text key={day} style={[styles.weekdayCell, { color: theme.colors.textMuted }]}>
                    {day}
                  </Text>
                ))}
              </View>

              {/* Calendar Month Days Grid */}
              <View style={styles.daysGrid}>
                {calendarDays.map((dateVal, idx) => {
                  if (!dateVal) {
                    return <View key={`empty-${idx}`} style={styles.dayCellEmpty} />;
                  }

                  const isPastOrToday = !isDateAllowed(dateVal);
                  const isToday = formatDateKey(dateVal) === todayKey;
                  const isSelected = tempDate && isDateAllowed(dateVal) && formatDateKey(dateVal) === formatDateKey(tempDate);
                  const hasValidSelection = tempDate && isDateAllowed(tempDate);

                  return (
                    <Pressable
                      key={`day-${idx}`}
                      onPress={() => {
                        if (!isDateAllowed(dateVal)) {
                          Alert.alert(
                            "Invalid Date",
                            "Bookings can only be scheduled from tomorrow onwards."
                          );
                          return;
                        }
                        setTempDate(dateVal);
                      }}
                      style={[
                        styles.dayCell,
                        isSelected && { backgroundColor: theme.colors.primary, borderRadius: 100 },
                        !isSelected && isToday && !hasValidSelection && { borderWidth: 1.5, borderColor: theme.colors.primary, borderRadius: 100 },
                        isPastOrToday && { opacity: 0.3 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: theme.colors.text },
                          isSelected && { color: "#ffffff", fontWeight: "700" },
                          !isSelected && isToday && !hasValidSelection && { color: theme.colors.primary, fontWeight: "700" },
                        ]}
                      >
                        {dateVal.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {tempDate && !isDateAllowed(tempDate) ? (
                <Text style={{ color: theme.colors.danger, fontSize: 13, textAlign: "center", marginVertical: 10, fontWeight: "600" }}>
                  Bookings can only be scheduled from tomorrow onwards.
                </Text>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.modalActionRow}>
                <Pressable
                  style={[styles.modalActionBtn, styles.modalActionBtnCancel, { borderColor: theme.colors.border }]}
                  onPress={() => setDateModalVisible(false)}
                >
                  <Text style={[styles.modalActionBtnTextCancel, { color: theme.colors.textMuted }]}>Cancel</Text>
                </Pressable>
                {tempDate && isDateAllowed(tempDate) ? (
                  <Pressable
                    style={[styles.modalActionBtn, styles.modalActionBtnOk, { backgroundColor: theme.colors.primary }]}
                    onPress={() => {
                      if (tempDate) {
                        const isToday = formatDateKey(tempDate) === todayKey;
                        if (isToday && preferredTimeSlot) {
                          const [timePart] = preferredTimeSlot.split(" - ");
                          const [hhmm, ampm] = timePart.split(" ");
                          let [hours, minutes] = hhmm.split(":").map(Number);
                          if (ampm === "PM" && hours !== 12) hours += 12;
                          if (ampm === "AM" && hours === 12) hours = 0;
                          const now = new Date();
                          const selectedTimeVal = hours * 60 + minutes;
                          const currentTimeVal = now.getHours() * 60 + now.getMinutes();
                          if (selectedTimeVal < currentTimeVal) {
                            setPreferredTimeSlot("");
                            triggerPopup("warning", "Time Cleared", "The previously selected time is in the past for today. Please select a future time.");
                          }
                        }
                        setPreferredDate(tempDate);
                        if (errors.preferredDate) setErrors((prev) => ({ ...prev, preferredDate: "" }));
                      }
                      setDateModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalActionBtnTextOk, { color: "#ffffff" }]}>OK</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Time Picker Modal */}
      <Modal visible={timeModalVisible} transparent animationType="slide" onRequestClose={() => setTimeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Time</Text>
              <Pressable onPress={() => setTimeModalVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <View style={{ padding: 16, paddingBottom: 28 }}>
              {/* Scrollable wheel selectors */}
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 15, marginVertical: 20 }}>
                <WheelPicker
                  items={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]}
                  selectedValue={tempHour.toString()}
                  onValueChange={(val) => setTempHour(parseInt(val, 10))}
                  theme={theme}
                />
                <Text style={{ fontSize: 24, fontWeight: "700", color: theme.colors.textMuted }}>:</Text>
                <WheelPicker
                  items={["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]}
                  selectedValue={tempMin.toString().padStart(2, "0")}
                  onValueChange={(val) => setTempMin(parseInt(val, 10))}
                  theme={theme}
                />
                <View style={{ width: 10 }} />
                <WheelPicker
                  items={["AM", "PM"]}
                  selectedValue={tempPeriod}
                  onValueChange={(val: any) => setTempPeriod(val)}
                  theme={theme}
                />
              </View>

              {/* Formatted Time Preview */}
              <View style={[styles.timePreviewRow, { backgroundColor: `${theme.colors.primary}08`, borderRadius: 12 }]}>
                <Clock size={18} color={theme.colors.primary} />
                <Text style={[styles.timePreviewText, { color: theme.colors.primary }]}>
                  {`${tempHour.toString().padStart(2, "0")}:${tempMin.toString().padStart(2, "0")} ${tempPeriod}`}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActionRow}>
                <Pressable
                  style={[styles.modalActionBtn, styles.modalActionBtnCancel, { borderColor: theme.colors.border }]}
                  onPress={() => setTimeModalVisible(false)}
                >
                  <Text style={[styles.modalActionBtnTextCancel, { color: theme.colors.textMuted }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalActionBtn, styles.modalActionBtnOk, { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    const formatted = `${tempHour.toString().padStart(2, "0")}:${tempMin.toString().padStart(2, "0")} ${tempPeriod}`;

                    const checkDate = preferredDate || new Date();
                    const isToday = checkDate.toDateString() === new Date().toDateString();
                    if (isToday) {
                      const now = new Date();
                      let selectedHours = tempHour;
                      if (tempPeriod === "PM" && selectedHours !== 12) selectedHours += 12;
                      if (tempPeriod === "AM" && selectedHours === 12) selectedHours = 0;

                      const selectedTimeVal = selectedHours * 60 + tempMin;
                      const currentTimeVal = now.getHours() * 60 + now.getMinutes();

                      if (selectedTimeVal < currentTimeVal) {
                        triggerPopup("danger", "Invalid Time", "You cannot select a preferred visit time in the past.");
                        return;
                      }
                    }

                    setPreferredTimeSlot(formatted);
                    if (errors.preferredDate) setErrors((prev) => ({ ...prev, preferredDate: "" }));
                    setTimeModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalActionBtnTextOk, { color: "#ffffff" }]}>Confirm</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Address Book Modal */}
      <Modal visible={addressBookVisible} transparent animationType="fade" onRequestClose={() => setAddressBookVisible(false)}>
        <View style={styles.centeredModalOverlay}>
          <View style={[styles.centeredModalContent, { backgroundColor: theme.colors.card, maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Address Book</Text>
              <Pressable onPress={() => setAddressBookVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <View style={{ flex: 1, padding: 16 }}>
              {isLoadingAddresses ? (
                <AppLoader message="Retrieving addresses..." />
              ) : (
                <FlatList
                  data={addresses}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 60 }}
                  renderItem={({ item }) => {
                    const isSelected = selectedAddress?.id === item.id;
                    return (
                      <AppCard
                        style={{
                          marginBottom: 12,
                          padding: 14,
                          borderWidth: 1.5,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.borderLight,
                          backgroundColor: isSelected ? `${theme.colors.primary}08` : theme.colors.card
                        }}
                        onPress={() => {
                          setSelectedAddress(item);
                          if (errors.address) setErrors((prev) => ({ ...prev, address: "" }));
                          setAddressBookVisible(false);
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <MapPin size={16} color={isSelected ? theme.colors.primary : theme.colors.textMuted} />
                            <Text style={{ fontSize: 14, fontWeight: "700", textTransform: "capitalize", color: theme.colors.text }}>
                              {item.label}
                            </Text>
                            {isSelected && (
                              <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ color: "#ffffff", fontSize: 9, fontWeight: "700" }}>Selected</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <Pressable onPress={() => handleOpenEditAddress(item)} style={{ padding: 4 }}>
                              <Edit2 size={16} color={theme.colors.textMuted} />
                            </Pressable>
                            <Pressable onPress={() => handleDeleteAddress(item.id)} style={{ padding: 4 }}>
                              <Trash2 size={16} color={theme.colors.danger} />
                            </Pressable>
                          </View>
                        </View>
                        <Text style={{ fontSize: 13, color: theme.colors.textMuted, lineHeight: 18 }}>
                          {item.street}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>
                          {[item.city, item.state].filter(Boolean).join(", ")}
                          {item.postalCode ? ` - ${item.postalCode}` : ""}
                        </Text>
                        {item.country && (
                          <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>
                            {item.country}
                          </Text>
                        )}
                      </AppCard>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={{ paddingVertical: 40, alignItems: "center", gap: 10 }}>
                      <MapPin size={40} color={theme.colors.textLight} />
                      <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>No saved addresses yet.</Text>
                    </View>
                  }
                />
              )}
              <View style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderLight }}>
                <AppButton
                  title="Add New Address"
                  onPress={handleOpenAddAddress}
                  icon={<Plus size={18} color="#ffffff" style={{ marginRight: 6 }} />}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Address Form Modal */}
      <Modal visible={addressFormVisible} transparent animationType="fade" onRequestClose={() => setAddressFormVisible(false)}>
        <View style={styles.centeredModalOverlay}>
          <View style={[styles.centeredModalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {addressForm.id ? "Edit Address" : "Add Address"}
              </Text>
              <Pressable onPress={() => setAddressFormVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Label Field */}
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textMuted, marginBottom: 6 }]}>Address Label</Text>
                <AppInput
                  placeholder="e.g. Home, Office"
                  value={addressForm.label}
                  onChangeText={(val) => setAddressForm((prev: any) => ({ ...prev, label: val }))}
                />
              </View>

              {/* Street Address Field */}
              <View style={{ marginBottom: 12 }}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Street Address</Text>
                  <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
                </View>
                <AppInput
                  placeholder="Enter street address"
                  value={addressForm.street}
                  onChangeText={(val) => {
                    setAddressForm((prev: any) => ({ ...prev, street: val }));
                    if (addressFormErrors.street) setAddressFormErrors((prev) => ({ ...prev, street: "" }));
                  }}
                  multiline
                  numberOfLines={3}
                />
                {addressSubmitAttempted && addressFormErrors.street ? (
                  <Text style={[styles.errorText, { color: theme.colors.danger }]}>{addressFormErrors.street}</Text>
                ) : null}
              </View>

              {/* City Field */}
              <View style={{ marginBottom: 12 }}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>City</Text>
                  <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
                </View>
                <AppInput
                  placeholder="Enter city"
                  value={addressForm.city}
                  onChangeText={(val) => {
                    setAddressForm((prev: any) => ({ ...prev, city: val }));
                    if (addressFormErrors.city) setAddressFormErrors((prev) => ({ ...prev, city: "" }));
                  }}
                />
                {addressSubmitAttempted && addressFormErrors.city ? (
                  <Text style={[styles.errorText, { color: theme.colors.danger }]}>{addressFormErrors.city}</Text>
                ) : null}
              </View>

              {/* State Field */}
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textMuted, marginBottom: 6 }]}>State</Text>
                <AppInput
                  placeholder="Enter state"
                  value={addressForm.state}
                  onChangeText={(val) => setAddressForm((prev: any) => ({ ...prev, state: val }))}
                />
              </View>

              {/* Country Field */}
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textMuted, marginBottom: 6 }]}>Country</Text>
                <AppInput
                  placeholder="Enter country"
                  value={addressForm.country}
                  onChangeText={(val) => setAddressForm((prev: any) => ({ ...prev, country: val }))}
                />
              </View>

              {/* Postal Code Field */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textMuted, marginBottom: 6 }]}>Postal Code</Text>
                <AppInput
                  placeholder="Enter postal code"
                  value={addressForm.postalCode}
                  onChangeText={(val) => setAddressForm((prev: any) => ({ ...prev, postalCode: val }))}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setAddressFormVisible(false)}
                  style={{ flex: 1 }}
                />
                <AppButton
                  title={addressForm.id ? "Update" : "Save"}
                  onPress={handleSaveAddress}
                  disabled={!addressForm.street.trim() || !addressForm.city.trim()}
                  loading={addAddressMutation.isPending || updateAddressMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.1,
    marginBottom: 0,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 54,
  },
  dropdownValueWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  iconCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  calendarArrow: {
    padding: 8,
  },
  calendarMonthName: {
    fontSize: 14,
    fontWeight: "700",
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 2,
  },
  dayCellEmpty: {
    width: "14.28%",
    aspectRatio: 1,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "600",
  },
  timeSlotsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  timeSlotPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  timeSlotPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  addressInputRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  addressBookBtn: {
    width: 80,
    height: 75,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addressBookBtnFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  centeredModalContent: {
    width: "100%",
    borderRadius: 20,
    maxHeight: "75%",
    overflow: "hidden",
  },
  addressBookLabel: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  priceNoteBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBoxBtns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
    justifyContent: "center",
  },
  uploadSubBtn: {
    flex: 1,
    minWidth: 90,
    height: 40,
    borderRadius: 8,
  },
  thumbnailList: {
    gap: 10,
  },
  thumbnailWrapper: {
    position: "relative",
    width: 74,
    height: 74,
    borderRadius: 8,
  },
  thumbImage: {
    width: 74,
    height: 74,
    borderRadius: 8,
  },
  thumbBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    paddingVertical: 2,
    alignItems: "center",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  thumbDeleteBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 2,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  submitBtn: {
    marginTop: 12,
    marginBottom: 40,
    height: 52,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginTop: 8,
  },
  modalListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  modalListItemPremium: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    marginBottom: 8,
  },
  modalListText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // ── Premium picker styles ──────────────────────────────────────
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  pickerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  pickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 0,
  },
  // Category grid
  catGrid: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 10,
  },
  catGridTile: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "flex-start",
    position: "relative",
    minHeight: 130,
  },
  catTileIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  catTileLabel: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    flex: 1,
  },
  catTileBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  catTileBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  catTileCheck: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  // Sub category list
  subList: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 8,
  },
  subListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  subItemNumBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  subItemNumText: {
    fontSize: 11,
    fontWeight: "800",
  },
  subItemName: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  subItemCharge: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  subItemCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  subHeaderCatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  modalActionBtnCancel: {
    backgroundColor: "transparent",
  },
  modalActionBtnOk: {
    borderWidth: 0,
  },
  modalActionBtnTextCancel: {
    fontSize: 14,
    fontWeight: "700",
  },
  modalActionBtnTextOk: {
    fontSize: 14,
    fontWeight: "700",
  },
  timeSelectorRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    marginVertical: 16,
    gap: 8,
  },
  timeColumn: {
    alignItems: "center",
    gap: 8,
  },
  timeArrowBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timeValueBox: {
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    height: 70,
    borderRadius: 14,
  },
  timeValueText: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
  },
  timeLabelText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  ampmBtn: {
    width: 60,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ampmBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  timePreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  timePreviewText: {
    fontSize: 24,
    fontWeight: "700",
  },
  // Kept for compatibility but not used
  ampmToggleRow: { flexDirection: "row", borderRadius: 12, padding: 4, marginVertical: 8, height: 46 },
  ampmToggleBtn: { flex: 1, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  ampmText: { fontSize: 14 },
  modalActionRowVertical: { gap: 10, marginTop: 10 },
  modalActionBtnFull: { height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  modalActionBtnTextFullOk: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
  modalActionBtnFullCancel: { height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center", borderWidth: 1.5, backgroundColor: "transparent" },
  modalActionBtnTextFullCancel: { fontSize: 14, fontWeight: "700" },
});
export default RaiseTicketScreen;
