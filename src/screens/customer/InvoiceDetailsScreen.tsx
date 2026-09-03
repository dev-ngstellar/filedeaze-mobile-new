import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Download, Share2 } from "lucide-react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { useTheme } from "../../theme";
import { useCustomerInvoiceDetails, useCustomerProfile } from "../../hooks/useCustomer";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppButton } from "../../components/AppButton";
import { AppAlertModal } from "../../components/AppAlertModal";
import { numberToIndianWords } from "../../utils/numberToWords";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "InvoiceDetails">;
type RouteProps = RouteProp<CustomerStackParamList, "InvoiceDetails">;

export const InvoiceDetailsScreen = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { invoiceId } = route.params;

  const { data: invoiceData, isLoading } = useCustomerInvoiceDetails(invoiceId);
  const { data: profile } = useCustomerProfile();

  const [downloading, setDownloading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "warning">("success");

  const showAlert = (title: string, message: string, type: "success" | "error" | "warning" = "success") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    } catch {
      return "";
    }
  };

  const generatePDFHtml = (
    invNum: string,
    dateVal: string,
    timeVal: string,
    company: {
      name: string;
      address: string;
      cityPin: string;
      phone: string;
      gstin: string;
      state: string;
      logoUrl: string | null;
    },
    customer: {
      name: string;
      address: string;
      cityPin: string;
    },
    amountFormatted: string,
    amountWordsText: string,
    sealImageUri: string | null,
    signatory: string
  ) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Receipt #${invNum}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            padding: 40px 48px;
            color: #111827;
            line-height: 1.45;
          }
          .receipt-box { max-width: 680px; margin: auto; }
          .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
          .company-title {
            font-size: 16px;
            font-weight: 800;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .company-meta { font-size: 11px; color: #374151; margin-top: 2px; }
          .header-logo { max-height: 52px; max-width: 140px; object-fit: contain; }
          .green-line { height: 1.5px; background: #15803d; margin: 14px 0 16px 0; width: 100%; }
          .receipt-title {
            font-size: 18px;
            font-weight: 800;
            color: #15803d;
            text-align: center;
            margin-bottom: 24px;
          }
          .two-col { display: flex; justify-content: space-between; align-items: flex-start; }
          .col-left { width: 50%; }
          .col-right { width: 45%; text-align: right; }
          .section-heading { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 6px; }
          .item-bold { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 3px; }
          .item-text { font-size: 11.5px; color: #374151; margin-top: 2px; }
          .detail-row { font-size: 11.5px; color: #374151; margin-top: 3px; }
          .detail-label { color: #6b7280; font-weight: 500; }
          .detail-val { font-weight: 700; color: #111827; }
          .spacer { height: 36px; }
          .amount-val { font-size: 18px; font-weight: 800; color: #111827; margin-top: 2px; }
          .amount-line { width: 120px; height: 1px; background: #111827; margin: 6px 0 12px auto; }
          .sign-for { font-size: 12px; font-weight: 700; color: #111827; margin-top: 12px; }
          .sign-space { height: 50px; }
          .seal-img { max-height: 60px; max-width: 100px; object-fit: contain; margin: 6px 0 4px auto; display: block; }
          .sign-title { font-size: 11px; color: #374151; }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <!-- 1. Header: Company Info (Left) & Logo (Right) -->
          <div class="header-row">
            <div>
              <div class="company-title">${company.name}</div>
              ${company.address ? `<div class="company-meta">${company.address}</div>` : ""}
              ${company.cityPin ? `<div class="company-meta">${company.cityPin}</div>` : ""}
              ${company.phone ? `<div class="company-meta">Phone: ${company.phone}</div>` : ""}
              ${company.gstin ? `<div class="company-meta">GSTIN: ${company.gstin}</div>` : ""}
              ${company.state ? `<div class="company-meta">State: ${company.state}</div>` : ""}
            </div>
            ${company.logoUrl ? `<div><img src="${company.logoUrl}" class="header-logo" /></div>` : ""}
          </div>

          <!-- Thin Green Divider -->
          <div class="green-line"></div>

          <!-- 2. Centered Green Title -->
          <div class="receipt-title">Payment Receipt</div>

          <!-- 3. Customer (Left) & Receipt Details (Right) -->
          <div class="two-col">
            <div class="col-left">
              <div class="section-heading">Received From</div>
              <div class="item-bold">${customer.name}</div>
              ${customer.address ? `<div class="item-text">${customer.address}</div>` : ""}
              ${customer.cityPin ? `<div class="item-text">${customer.cityPin}</div>` : ""}
            </div>

            <div class="col-right">
              <div class="section-heading">Receipt Details</div>
              <div class="detail-row"><span class="detail-label">Receipt No: </span><span class="detail-val">#${invNum}</span></div>
              <div class="detail-row"><span class="detail-label">Date: </span><span class="detail-val">${dateVal}</span></div>
              ${timeVal ? `<div class="detail-row"><span class="detail-label">Time: </span><span class="detail-val">${timeVal}</span></div>` : ""}
            </div>
          </div>

          <!-- Spacing -->
          <div class="spacer"></div>

          <!-- 4. Amount In Words (Left) & Received (Right) -->
          <div class="two-col">
            <div class="col-left">
              <div class="section-heading">Amount In Words</div>
              <div class="item-text" style="max-width: 260px;">${amountWordsText}</div>
            </div>

            <div class="col-right">
              <div class="section-heading">Received</div>
              <div class="amount-val">Rs ${amountFormatted}</div>
              <div class="amount-line"></div>

              <!-- 5. Authorization Section -->
              <div class="sign-for">For: ${company.name}</div>
              ${sealImageUri ? `<img src="${sealImageUri}" class="seal-img" />` : `<div class="sign-space"></div>`}
              <div class="sign-title">${signatory}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader showBack onBackPress={() => navigation.goBack()} title="Payment Receipt" />
        <AppLoader message="Loading receipt..." />
      </View>
    );
  }

  if (!invoiceData) {
    return (
      <View style={styles.container}>
        <AppHeader showBack onBackPress={() => navigation.goBack()} title="Payment Receipt" />
        <View style={styles.centerContent}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>Receipt not found.</Text>
        </View>
      </View>
    );
  }

  const { invoice: rawInvoice, tenant, settings } = invoiceData;
  const invoice = rawInvoice as any;

  // Exact backend total — source of truth (NO calculation on frontend)
  const totalAmount = Number(
    invoice.total ??
    invoice.totalAmount ??
    invoice.grandTotal ??
    0
  );

  const formattedAmount = totalAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const invoiceNumber = invoice.invoiceNumber ?? invoice.invoiceNo ?? "—";
  const dateStr = formatDate(invoice.generatedAt);
  const timeStr = formatTime(invoice.generatedAt || invoice.createdAt);

  // Dynamic Amount In Words
  const amountWords = invoice.amountInWords || numberToIndianWords(totalAmount);

  // Customer Details (From API data)
  const customerName =
    invoice.ticket?.customer?.name ||
    invoice.customerName ||
    profile?.name ||
    "Customer";

  const customerAddress = invoice.ticket?.customer?.address || profile?.address || "";
  const customerCity = invoice.ticket?.customer?.city || profile?.city || "";
  const customerPincode = invoice.ticket?.customer?.pincode || profile?.pincode || "";
  const customerCityPin = [customerCity, customerPincode].filter(Boolean).join(" - ");

  // Company Details (From Tenant API data)
  const companyName = tenant?.companyName || "FieldEaze Services";
  const companyAddress = tenant?.address || "";
  const companyCity = tenant?.city || "";
  const companyPincode = (tenant as any)?.pincode || "";
  const companyCityPin = [companyCity, companyPincode].filter(Boolean).join(" - ");
  const companyPhone = tenant?.phone || "";
  const companyGstin = (tenant as any)?.gstin || (tenant as any)?.gstNumber || settings?.gstin || settings?.gstNumber || "";
  const companyState = tenant?.state || "";
  const logoUrl = tenant?.logoUrl || null;

  // Authorization details (Dynamic from API; gracefully null if not configured)
  const sealUrl = (tenant as any)?.sealUrl || (tenant as any)?.companySealUrl || (settings as any)?.sealUrl || null;
  const signatoryText = (tenant as any)?.authorizedSignatoryName || (settings as any)?.authorizedSignatoryName || "Authorized Signatory";

  const handleDownload = async () => {
    if (!invoiceData) return;
    try {
      setDownloading(true);
      const html = generatePDFHtml(
        invoiceNumber,
        dateStr,
        timeStr,
        {
          name: companyName,
          address: companyAddress,
          cityPin: companyCityPin,
          phone: companyPhone,
          gstin: companyGstin,
          state: companyState,
          logoUrl,
        },
        {
          name: customerName,
          address: customerAddress,
          cityPin: customerCityPin,
        },
        formattedAmount,
        amountWords,
        sealUrl,
        signatoryText
      );
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        await Print.printAsync({ uri });
      }
      showAlert("Receipt Ready", `Payment Receipt #${invoiceNumber} is ready.`, "success");
    } catch {
      showAlert("Download Failed", "We couldn't generate the receipt document. Please try again.", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!invoiceData) return;
    try {
      const html = generatePDFHtml(
        invoiceNumber,
        dateStr,
        timeStr,
        {
          name: companyName,
          address: companyAddress,
          cityPin: companyCityPin,
          phone: companyPhone,
          gstin: companyGstin,
          state: companyState,
          logoUrl,
        },
        {
          name: customerName,
          address: customerAddress,
          cityPin: customerCityPin,
        },
        formattedAmount,
        amountWords,
        sealUrl,
        signatoryText
      );
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Share Payment Receipt #${invoiceNumber}`,
        UTI: "com.adobe.pdf",
      });
    } catch {
      showAlert("Share Failed", "We couldn't share the receipt document. Please try again.", "error");
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader showBack onBackPress={() => navigation.goBack()} title="Payment Receipt" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ========================================================
            FORMAL PAYMENT RECEIPT (EXACT FIRST REFERENCE STYLE)
            ======================================================== */}
        <View style={styles.receiptContainer}>

          {/* 1. TOP HEADER: Company Details (LEFT) & Company Logo (RIGHT) */}
          <View style={styles.headerRow}>
            <View style={styles.companyDetailsCol}>
              <Text style={styles.companyName}>{companyName}</Text>
              {companyAddress ? <Text style={styles.companyMeta}>{companyAddress}</Text> : null}
              {companyCityPin ? <Text style={styles.companyMeta}>{companyCityPin}</Text> : null}
              {companyPhone ? <Text style={styles.companyMeta}>Phone: {companyPhone}</Text> : null}
              {companyGstin ? <Text style={styles.companyMeta}>GSTIN: {companyGstin}</Text> : null}
              {companyState ? <Text style={styles.companyMeta}>State: {companyState}</Text> : null}
            </View>

            {logoUrl ? (
              <View style={styles.logoCol}>
                <Image source={{ uri: logoUrl }} style={styles.companyLogo} resizeMode="contain" />
              </View>
            ) : null}
          </View>

          {/* Thin Green Divider Line */}
          <View style={styles.greenLine} />

          {/* 2. CENTERED GREEN TITLE */}
          <Text style={styles.receiptTitle}>Payment Receipt</Text>

          {/* 3. CUSTOMER SECTION (LEFT) & RECEIPT DETAILS (RIGHT) */}
          <View style={styles.twoColRow}>
            {/* LEFT: Received From */}
            <View style={styles.colLeft}>
              <Text style={styles.sectionHeading}>Received From</Text>
              <Text style={styles.customerName}>{customerName}</Text>
              {customerAddress ? <Text style={styles.customerDetailText}>{customerAddress}</Text> : null}
              {customerCityPin ? <Text style={styles.customerDetailText}>{customerCityPin}</Text> : null}
            </View>

            {/* RIGHT: Receipt Details */}
            <View style={styles.colRight}>
              <Text style={[styles.sectionHeading, { textAlign: "right" }]}>Receipt Details</Text>
              <Text style={styles.metaRow}>
                <Text style={styles.metaLabel}>Receipt No: </Text>
                <Text style={styles.metaValue}>#{invoiceNumber}</Text>
              </Text>
              <Text style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date: </Text>
                <Text style={styles.metaValue}>{dateStr}</Text>
              </Text>
              {timeStr ? (
                <Text style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Time: </Text>
                  <Text style={styles.metaValue}>{timeStr}</Text>
                </Text>
              ) : null}
            </View>
          </View>

          {/* Generous Vertical Space Between Sections */}
          <View style={styles.sectionSpacer} />

          {/* 4. PAYMENT SECTION: Amount In Words (LEFT) & Received (RIGHT) */}
          <View style={styles.twoColRow}>
            {/* LEFT: Amount In Words */}
            <View style={styles.colLeft}>
              <Text style={styles.sectionHeading}>Amount In Words</Text>
              <Text style={styles.amountWordsText}>{amountWords}</Text>
            </View>

            {/* RIGHT: Received & Authorization */}
            <View style={styles.colRight}>
              <Text style={[styles.sectionHeading, { textAlign: "right" }]}>Received</Text>
              <Text style={[styles.amountValue, { textAlign: "right" }]}>
                Rs {formattedAmount}
              </Text>
              <View style={styles.amountUnderline} />

              {/* 5. AUTHORIZATION SECTION */}
              <View style={styles.signatoryContainer}>
                <Text style={styles.signForText}>For: {companyName}</Text>
                {sealUrl ? (
                  <Image source={{ uri: sealUrl }} style={styles.sealImage} resizeMode="contain" />
                ) : (
                  <View style={styles.signatorySpace} />
                )}
                <Text style={styles.signatoryLabel}>{signatoryText}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons Below Receipt Document */}
        <View style={styles.btnRow}>
          <AppButton
            title={downloading ? "Generating..." : "Download PDF"}
            onPress={handleDownload}
            variant="outline"
            style={{ flex: 1, backgroundColor: "#ffffff" }}
            loading={downloading}
            icon={<Download size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />}
          />
          <AppButton
            title="Share"
            onPress={handleShare}
            variant="outline"
            style={{ flex: 1, backgroundColor: "#ffffff" }}
            icon={<Share2 size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />}
          />
        </View>
      </ScrollView>

      <AppAlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    backgroundColor: "#ffffff",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Document Container (White, clean, no cards, no borders)
  receiptContainer: {
    width: "100%",
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    marginBottom: 28,
  },

  // 1. Header: Company Info & Logo
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  companyDetailsCol: {
    flex: 1,
    paddingRight: 10,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  companyMeta: {
    fontSize: 11,
    color: "#334155",
    marginTop: 2,
    lineHeight: 15,
  },
  logoCol: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  companyLogo: {
    width: 100,
    height: 48,
  },

  // Thin Green Horizontal Line
  greenLine: {
    height: 1.5,
    backgroundColor: "#15803d",
    marginVertical: 14,
    width: "100%",
  },

  // 2. Centered Title
  receiptTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#15803d",
    textAlign: "center",
    marginBottom: 20,
  },

  // 3. Two-Column Layout
  twoColRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  colLeft: {
    flex: 1,
    paddingRight: 8,
  },
  colRight: {
    flex: 1,
    paddingLeft: 8,
    alignItems: "flex-end",
  },

  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  customerName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  customerDetailText: {
    fontSize: 11.5,
    color: "#334155",
    marginTop: 2,
    lineHeight: 15,
  },

  metaRow: {
    marginTop: 3,
    textAlign: "right",
  },
  metaLabel: {
    fontSize: 11.5,
    color: "#64748b",
  },
  metaValue: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0f172a",
  },

  // Spacer
  sectionSpacer: {
    height: 28,
  },

  // 4. Amount In Words
  amountWordsText: {
    fontSize: 11.5,
    color: "#334155",
    lineHeight: 16,
    marginTop: 2,
    paddingRight: 6,
  },

  // Received Amount
  amountValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 2,
  },
  amountUnderline: {
    width: 120,
    height: 1,
    backgroundColor: "#0f172a",
    marginVertical: 6,
  },

  // 5. Authorization Section
  signatoryContainer: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  signForText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "right",
  },
  sealImage: {
    width: 80,
    height: 60,
    marginVertical: 4,
  },
  signatorySpace: {
    height: 48,
  },
  signatoryLabel: {
    fontSize: 11,
    color: "#475569",
    textAlign: "right",
  },

  // Action Buttons
  btnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
});

export default InvoiceDetailsScreen;
