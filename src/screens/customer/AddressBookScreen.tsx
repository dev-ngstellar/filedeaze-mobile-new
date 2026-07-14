import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, MapPin, Edit2, Trash2, X, Map, Home, Briefcase, Check } from "lucide-react-native";
import { useTheme } from "../../theme";
import {
  useCustomerAddresses,
  useAddCustomerAddress,
  useUpdateCustomerAddress,
  useDeleteCustomerAddress,
} from "../../hooks/useCustomer";
import { CustomerStackParamList } from "../../types/navigation.types";
import { Address } from "../../services/customer.service";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppCard } from "../../components/AppCard";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "AddressBook">;
type RouteProps = RouteProp<CustomerStackParamList, "AddressBook">;

interface AddressFormState {
  id?: string;
  label: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export const AddressBookScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const onSelectAddress = route.params?.onSelectAddress;

  const { data: addresses = [], isLoading } = useCustomerAddresses();
  const addAddressMutation = useAddCustomerAddress();
  const updateAddressMutation = useUpdateCustomerAddress();
  const deleteAddressMutation = useDeleteCustomerAddress();

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<AddressFormState>({
    label: "",
    street: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const validate = (currentForm: AddressFormState) => {
    const newErrors: Record<string, string> = {};
    if (!currentForm.street.trim()) newErrors.street = "Street address is required.";
    if (!currentForm.city.trim()) newErrors.city = "City is required.";
    return newErrors;
  };

  const handleOpenAdd = () => {
    setForm({
      label: "",
      street: "",
      city: "",
      state: "",
      country: "India",
      postalCode: "",
    });
    setErrors({});
    setSubmitAttempted(false);
    setModalVisible(true);
  };

  const handleOpenEdit = (item: any) => {
    setForm({
      id: item.id,
      label: item.label,
      street: item.street || "",
      city: item.city || "",
      state: item.state || "",
      country: item.country || "India",
      postalCode: item.postalCode || "",
    });
    setErrors({});
    setSubmitAttempted(false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    setSubmitAttempted(true);
    const newErrors = validate(form);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      const payload = {
        label: form.label.trim() || "Home",
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim() || undefined,
        country: form.country.trim() || "India",
        postalCode: form.postalCode.trim() || undefined,
      };

      let saved: Address;
      if (form.id) {
        saved = await updateAddressMutation.mutateAsync({ id: form.id, payload });
        Alert.alert("Success", "Address updated successfully.");
      } else {
        saved = await addAddressMutation.mutateAsync(payload);
        Alert.alert("Success", "Address saved successfully.");
      }
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save address");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to remove this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAddressMutation.mutateAsync(id);
              Alert.alert("Deleted", "Address removed successfully.");
            } catch (error: any) {
              Alert.alert("Error", error?.message || "Failed to delete address");
            }
          },
        },
      ]
    );
  };

  const isFormValid = !form.street.trim() || !form.city.trim();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader showBack onBackPress={() => navigation.goBack()} title="Address Book" />

      {isLoading ? (
        <AppLoader message="Retrieving addresses..." />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isSelected = route.params?.selectedAddressId === item.id;
            const isHome = item.label?.toLowerCase().includes("home");
            const isOffice = item.label?.toLowerCase().includes("office") || item.label?.toLowerCase().includes("work");
            
            return (
              <AppCard
                style={[
                  styles.addressCard,
                  {
                    borderColor: isSelected ? theme.colors.primary : theme.colors.borderLight,
                    borderWidth: isSelected ? 1.5 : 1,
                    backgroundColor: isSelected ? `${theme.colors.primary}04` : theme.colors.card,
                  }
                ]}
                onPress={() => {
                  if (onSelectAddress) {
                    onSelectAddress(item);
                    navigation.goBack();
                  }
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.labelWrapper}>
                    {isHome ? (
                      <Home size={16} color={theme.colors.primary} />
                    ) : isOffice ? (
                      <Briefcase size={16} color={theme.colors.primary} />
                    ) : (
                      <MapPin size={16} color={theme.colors.primary} />
                    )}
                    <Text style={[styles.addressLabel, { color: theme.colors.text }]}>
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(item);
                      }}
                      style={styles.iconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Edit2 size={16} color={theme.colors.textMuted} />
                    </Pressable>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      style={styles.iconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={16} color={theme.colors.danger} />
                    </Pressable>
                  </View>
                </View>

                <Text style={[styles.addressText, { color: theme.colors.textMuted }]}>
                  {item.street}
                </Text>
                <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginTop: -6, marginBottom: 8 }}>
                  {[item.city, item.state].filter(Boolean).join(", ")}
                  {item.postalCode ? ` - ${item.postalCode}` : ""}
                </Text>
                {item.country ? (
                  <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 8 }}>
                    {item.country}
                  </Text>
                ) : null}

                {isSelected && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <Check size={14} color={theme.colors.success} />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.success }}>
                      Currently Selected
                    </Text>
                  </View>
                )}
              </AppCard>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MapPin size={48} color={theme.colors.textLight} />
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                No saved addresses yet.
              </Text>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
        <AppButton
          title="Add New Address"
          onPress={handleOpenAdd}
          icon={<Plus size={18} color="#ffffff" style={{ marginRight: 6 }} />}
        />
      </View>

      {/* Add/Edit Address Form Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {form.id ? "Edit Address" : "Add Address"}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              {/* Label Field */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.formLabel, { color: theme.colors.textMuted, marginBottom: 6 }]}>Address Label</Text>
                <AppInput
                  placeholder="e.g. Home, Office"
                  value={form.label}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, label: val }))}
                />
              </View>

              {/* Street Address Field */}
              <View style={styles.fieldContainer}>
                <View style={styles.labelRow}>
                  <Text style={[styles.formLabel, { color: theme.colors.textMuted }]}>Street Address</Text>
                  <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
                </View>
                <AppInput
                  placeholder="Enter street address"
                  value={form.street}
                  onChangeText={(val) => {
                    setForm((prev) => ({ ...prev, street: val }));
                    if (errors.street) setErrors((prev) => ({ ...prev, street: "" }));
                  }}
                  multiline
                  numberOfLines={3}
                />
                {submitAttempted && errors.street ? (
                  <Text style={[styles.errorText, { color: theme.colors.danger }]}>{errors.street}</Text>
                ) : null}
              </View>

              {/* City Field */}
              <View style={styles.fieldContainer}>
                <View style={styles.labelRow}>
                  <Text style={[styles.formLabel, { color: theme.colors.textMuted }]}>City</Text>
                  <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
                </View>
                <AppInput
                  placeholder="Enter city"
                  value={form.city}
                  onChangeText={(val) => {
                    setForm((prev) => ({ ...prev, city: val }));
                    if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
                  }}
                />
                {submitAttempted && errors.city ? (
                  <Text style={[styles.errorText, { color: theme.colors.danger }]}>{errors.city}</Text>
                ) : null}
              </View>

              {/* State Field */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.formLabel, { color: theme.colors.textMuted, marginBottom: 6 }]}>State</Text>
                <AppInput
                  placeholder="Enter state"
                  value={form.state}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, state: val }))}
                />
              </View>

              {/* Country Field */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.formLabel, { color: theme.colors.textMuted, marginBottom: 6 }]}>Country</Text>
                <AppInput
                  placeholder="Enter country"
                  value={form.country}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, country: val }))}
                />
              </View>

              {/* Postal Code Field */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.formLabel, { color: theme.colors.textMuted, marginBottom: 6 }]}>Postal Code</Text>
                <AppInput
                  placeholder="Enter postal code"
                  value={form.postalCode}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, postalCode: val }))}
                />
              </View>

              <AppButton
                title={form.id ? "Update Address" : "Save Address"}
                onPress={handleSave}
                disabled={isFormValid}
                style={{ marginTop: 16 }}
                loading={addAddressMutation.isPending || updateAddressMutation.isPending}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  addressCard: {
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  labelWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  coordsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coordsText: {
    fontSize: 11,
    fontWeight: "500",
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "transparent",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  modalForm: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
});
