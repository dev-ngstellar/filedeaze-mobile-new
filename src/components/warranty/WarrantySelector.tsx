import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "../../theme";
import { SparePartCoverageType } from "../../services/job.service";

interface WarrantySelectorProps {
  value: SparePartCoverageType | null;
  onChange: (value: SparePartCoverageType) => void;
  /** Shows a red asterisk + unselected outline in danger color when true and value is null. */
  error?: boolean;
}

const OPTIONS: { key: SparePartCoverageType; label: string }[] = [
  { key: "WARRANTY", label: "Warranty" },
  { key: "OUT_OF_WARRANTY", label: "Out Of Warranty" },
];

/** Mandatory per-part warranty radio selector — technician-only. Every spare part used on a
 * ticket must be tagged WARRANTY or OUT_OF_WARRANTY; the backend computes the billed amount from
 * this selection, never the frontend. */
export const WarrantySelector: React.FC<WarrantySelectorProps> = ({ value, onChange, error }) => {
  const theme = useTheme();

  return (
    <View>
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const isSelected = value === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onChange(opt.key)}
              style={[
                styles.option,
                {
                  borderColor: isSelected
                    ? theme.colors.primary
                    : error
                    ? theme.colors.danger
                    : theme.colors.borderLight,
                  backgroundColor: isSelected ? `${theme.colors.primary}0a` : "transparent",
                },
              ]}
            >
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: isSelected ? theme.colors.primary : theme.colors.borderLight },
                ]}
              >
                {isSelected ? <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} /> : null}
              </View>
              <Text
                style={[styles.optionLabel, { color: isSelected ? theme.colors.primary : theme.colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: theme.colors.danger }]}>Warranty status is required.</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  option: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  radioOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  radioInner: { width: 6, height: 6, borderRadius: 3 },
  optionLabel: { fontSize: 11, fontWeight: "700" },
  errorText: { fontSize: 11, fontWeight: "500", marginTop: 4 },
});

export default WarrantySelector;
