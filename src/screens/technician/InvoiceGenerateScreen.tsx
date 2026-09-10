import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  BackHandler,
  Platform,
} from "react-native";
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Download, Share2 } from "lucide-react-native";

import { useTheme } from "../../theme";
import { TechnicianStackParamList } from "../../types/navigation.types";
import { useJobDetails } from "../../hooks/useJobs";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppButton } from "../../components/AppButton";
import { AppAlertModal } from "../../components/AppAlertModal";
import { numberToIndianWords } from "../../utils/numberToWords";
import { APP_CONFIG } from "../../config/app.config";
import { AuthService, TenantBrandingInfo } from "../../services/auth.service";
import { PaymentService, MobilePaymentConfig } from "../../services/payment.service";
import { JobService, CompanyInfo } from "../../services/job.service";
import { getPdfFilename, preparePdfForSharing } from "../../utils/pdfShare";

type RouteProps = RouteProp<TechnicianStackParamList, "InvoiceGenerate">;
type NavigationProp = NativeStackNavigationProp<TechnicianStackParamList, "InvoiceGenerate">;

export const InvoiceGenerateScreen = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();

  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "warning">("success");
  const [tenantInfo, setTenantInfo] = useState<TenantBrandingInfo | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<MobilePaymentConfig | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(() => JobService.getCachedCompanyInfo());

  useEffect(() => {
    AuthService.getTenantBranding()
      .then((info) => {
        if (info) setTenantInfo(info);
      })
      .catch(() => {});

    PaymentService.getMobilePaymentConfig()
      .then((cfg) => {
        if (cfg) setPaymentConfig(cfg);
      })
      .catch(() => {});

    JobService.getCompanyInfo()
      .then((info) => {
        if (info) setCompanyInfo(info);
      })
      .catch(() => {});
  }, []);

  const showAlert = (title: string, message: string, type: "success" | "error" | "warning" = "success") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "TechnicianHome" }],
      });
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  const {
    invoice: paramInvoice,
    company: paramCompany,
    jobId,
    ticketNo,
    amount: initialAmount,
    paymentMethod: paramPaymentMethod,
    paymentStatus: paramPaymentStatus,
    invoiceNo,
    invoiceSubtotal,
    invoiceGstAmount,
    invoiceGstPercent,
    invoiceTotal,
    invoiceGeneratedAt,
  } = (route.params as any) || {};

  // Resolve target ticket identifier for fetching details
  const effectiveJobId = jobId || (paramInvoice as any)?.ticketId || ticketNo || "";
  const { data: job, isLoading: isJobLoading } = useJobDetails(effectiveJobId);

  // Formatting helpers
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr?: string | null) => {
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

  const fmt = (val: number | undefined | null) => {
    const num = Number(val ?? 0);
    return `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Compile full API invoice details (Phase 2, 3, 4, 5, 8: Dynamic & Zero Hardcoding)
  const invoiceData = useMemo(() => {
    const invDetails = job?.invoiceDetails;
    const rawCompany =
      paramCompany ||
      (paramInvoice as any)?.company ||
      companyInfo ||
      (job as any)?.company ||
      (job as any)?.rawInvoice?.company ||
      (job as any)?.invoice?.company ||
      (job as any)?.ticket?.company ||
      invDetails?.company ||
      job?.tenant ||
      {};

    const company = {
      companyName:
        rawCompany.companyName ||
        rawCompany.name ||
        companyInfo?.companyName ||
        companyInfo?.name ||
        invDetails?.company?.companyName ||
        job?.tenant?.companyName ||
        tenantInfo?.companyName ||
        APP_CONFIG.appName,
      address:
        rawCompany.address ||
        companyInfo?.address ||
        invDetails?.company?.address ||
        job?.tenant?.address ||
        tenantInfo?.address ||
        "",
      city:
        rawCompany.city ||
        companyInfo?.city ||
        invDetails?.company?.city ||
        job?.tenant?.city ||
        tenantInfo?.city ||
        "",
      state:
        rawCompany.state ||
        companyInfo?.state ||
        invDetails?.company?.state ||
        job?.tenant?.state ||
        tenantInfo?.state ||
        "",
      pincode:
        rawCompany.pincode ||
        companyInfo?.pincode ||
        invDetails?.company?.pincode ||
        job?.tenant?.pincode ||
        "",
      phone:
        rawCompany.phone ||
        rawCompany.mobile ||
        companyInfo?.phone ||
        companyInfo?.mobile ||
        invDetails?.company?.phone ||
        job?.tenant?.phone ||
        tenantInfo?.phone ||
        "",
      email:
        rawCompany.email ||
        companyInfo?.email ||
        invDetails?.company?.email ||
        job?.tenant?.email ||
        "",
      gstNumber:
        rawCompany.gstNumber ||
        rawCompany.gstin ||
        companyInfo?.gstNumber ||
        companyInfo?.gstin ||
        invDetails?.company?.gstNumber ||
        job?.tenant?.gstNumber ||
        job?.tenant?.gstin ||
        paymentConfig?.gstNumber ||
        tenantInfo?.gstNumber ||
        "",
      logoUrl:
        rawCompany.logoUrl ||
        rawCompany.logo ||
        companyInfo?.logoUrl ||
        companyInfo?.logo ||
        invDetails?.company?.logoUrl ||
        job?.tenant?.logoUrl ||
        tenantInfo?.logoUrl ||
        null,
      sealUrl:
        rawCompany.sealUrl ||
        rawCompany.companySealUrl ||
        companyInfo?.sealUrl ||
        companyInfo?.companySealUrl ||
        invDetails?.company?.sealUrl ||
        invDetails?.authorization?.sealUrl ||
        (job as any)?.company?.sealUrl ||
        (job as any)?.sealUrl ||
        job?.tenant?.sealUrl ||
        tenantInfo?.sealUrl ||
        null,
    };

    const customer = {
      customerName: invDetails?.customer?.customerName || job?.customerName || "—",
      customerAddress: invDetails?.customer?.customerAddress || job?.address || job?.customerAddress || "",
      customerCity: invDetails?.customer?.customerCity || job?.customerCity || "",
      customerState: invDetails?.customer?.customerState || job?.customerState || "",
      customerPincode: invDetails?.customer?.customerPincode || job?.customerPincode || "",
      customerPhone: invDetails?.customer?.customerPhone || job?.customerMobile || job?.customerAlternatePhone || "",
      customerEmail: invDetails?.customer?.customerEmail || job?.customerEmail || "",
      customerGstin: invDetails?.customer?.customerGstin || job?.customerGstin || "",
    };

    const invoiceNumberVal =
      invDetails?.invoice?.invoiceNumber ||
      invoiceNo ||
      job?.invoiceNo ||
      (job?.ticketNo ? `INV-${job.ticketNo}` : "—");

    const dateVal =
      invDetails?.invoice?.invoiceDate ||
      (job?.invoiceGeneratedAt ? formatDate(job.invoiceGeneratedAt) : formatDate(invoiceGeneratedAt || new Date().toISOString()));

    const timeVal =
      invDetails?.invoice?.invoiceTime ||
      (job?.invoiceGeneratedAt ? formatTime(job.invoiceGeneratedAt) : formatTime(invoiceGeneratedAt || new Date().toISOString()));

    const invoiceMeta = {
      invoiceId: invDetails?.invoice?.invoiceId || job?.rawInvoice?.id || "",
      invoiceNumber: invoiceNumberVal,
      prefix: invDetails?.invoice?.prefix || "INV",
      invoiceDate: dateVal,
      invoiceTime: timeVal,
      billingType: invDetails?.invoice?.billingType || job?.rawInvoice?.billingType || null,
      placeOfSupply: invDetails?.invoice?.placeOfSupply || (job as any)?.rawInvoice?.placeOfSupply || (job as any)?.invoice?.placeOfSupply || "",
    };

    // Raw billing inputs from API / route params
    const rawSubtotal = Number(invDetails?.billing?.subtotal ?? job?.invoiceSubtotal ?? invoiceSubtotal ?? initialAmount ?? 0);
    const discount = Number(invDetails?.billing?.discount ?? job?.invoiceDiscount ?? 0);
    const gstPercent = Number(invDetails?.billing?.gstPercent ?? job?.invoiceGstPercent ?? invoiceGstPercent ?? 0);
    const rawGstAmount = Number(invDetails?.billing?.gstAmount ?? job?.invoiceGstAmount ?? invoiceGstAmount ?? 0);
    const rawTotal = Number(invDetails?.billing?.total ?? job?.invoiceTotal ?? invoiceTotal ?? initialAmount ?? 0);

    // Check if the service charge / subtotal was entered as a tax-inclusive total
    // (e.g. Total = 177, but 18% GST was added on top to make 208.86, OR subtotal = 177, total = 177 with 18% GST)
    const isTaxInclusive =
      gstPercent > 0 &&
      rawSubtotal > 0 &&
      (
        Math.abs(rawSubtotal * (1 + gstPercent / 100) - rawTotal) < 0.05 ||
        (rawTotal > 0 && Math.abs(rawSubtotal - rawTotal) < 0.05)
      );

    const total = isTaxInclusive
      ? (Math.abs(rawSubtotal * (1 + gstPercent / 100) - rawTotal) < 0.05 ? rawSubtotal : rawTotal)
      : rawTotal;

    const subtotal = isTaxInclusive
      ? Math.round((total / (1 + gstPercent / 100)) * 100) / 100
      : rawSubtotal;

    const gstAmount = isTaxInclusive
      ? Math.round((total - subtotal) * 100) / 100
      : rawGstAmount;

    // Dynamic items
    let items = invDetails?.items;
    if (!items || items.length === 0) {
      const fallbackItems = [];
      const serviceVal = isTaxInclusive
        ? subtotal
        : Number(job?.invoiceServiceCharge ?? job?.invoiceSubtotal ?? initialAmount ?? 0);

      if (serviceVal > 0 || !job?.spareParts || job.spareParts.length === 0) {
        fallbackItems.push({
          itemName: (job?.service || "SERVICE").toUpperCase(),
          description: job?.scheduledDate ? `(ON ${job.scheduledDate})` : "",
          quantity: 1,
          unit: "Nos",
          unitPrice: serviceVal,
          amount: serviceVal,
        });
      }
      if (Number(job?.invoiceLabourCharge ?? 0) > 0) {
        fallbackItems.push({
          itemName: "LABOUR CHARGES",
          description: "",
          quantity: 1,
          unit: "Nos",
          unitPrice: Number(job?.invoiceLabourCharge),
          amount: Number(job?.invoiceLabourCharge),
        });
      }
      if (job?.spareParts && job.spareParts.length > 0) {
        for (const sp of job.spareParts) {
          const isWarranty = sp.coverageType === "WARRANTY";
          fallbackItems.push({
            itemName: sp.name.toUpperCase(),
            description: isWarranty ? "(Covered under warranty)" : "",
            quantity: sp.quantity,
            unit: sp.unitOfMeasure || "Nos",
            unitPrice: sp.unitPrice,
            amount: isWarranty ? 0 : sp.quantity * sp.unitPrice,
          });
        }
      }
      if (Number(job?.invoiceAdditionalCharge ?? 0) > 0) {
        fallbackItems.push({
          itemName: "ADDITIONAL CHARGES",
          description: "",
          quantity: 1,
          unit: "Nos",
          unitPrice: Number(job?.invoiceAdditionalCharge),
          amount: Number(job?.invoiceAdditionalCharge),
        });
      }
      items = fallbackItems;
    } else if (items && items.length > 0 && isTaxInclusive) {
      // If items total equals the tax-inclusive total (e.g. 177), scale item amounts to base before tax (150)
      const itemsSum = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      if (Math.abs(itemsSum - total) < 0.05) {
        items = items.map((it) => {
          const qty = Number(it.quantity || 1);
          const baseAmt = Math.round((Number(it.amount || 0) / (1 + gstPercent / 100)) * 100) / 100;
          return {
            ...it,
            unitPrice: Math.round((baseAmt / (qty || 1)) * 100) / 100,
            amount: baseAmt,
          };
        });
      }
    }

    const resolvedPaymentStatus =
      job?.paymentStatus ||
      (job as any)?.payment?.status ||
      (paramInvoice as any)?.payment?.status ||
      (paramInvoice as any)?.paymentStatus ||
      paramPaymentStatus;

    const resolvedPaymentMethod =
      paramPaymentMethod ||
      job?.paymentMethod ||
      (job as any)?.payment?.method ||
      (paramInvoice as any)?.payment?.method ||
      "CASH";

    // It is pending credit ONLY if it's explicitly CREDIT and its status is PENDING or UNPAID.
    // If credit has been collected/settled, status is COLLECTED / PAID, so received is full and balance is 0.
    const isCreditUnpaid =
      resolvedPaymentMethod === "CREDIT" &&
      (resolvedPaymentStatus === "PENDING" || resolvedPaymentStatus === "UNPAID");

    const receivedAmount = Number(invDetails?.billing?.receivedAmount ?? (isCreditUnpaid ? 0 : total));
    const balanceAmount = Number(invDetails?.billing?.balanceAmount ?? (isCreditUnpaid ? total : 0));
    const amountInWords = invDetails?.billing?.amountInWords || numberToIndianWords(total);

    const billing = {
      subtotal,
      discount,
      gstPercent,
      gstAmount,
      total,
      receivedAmount,
      balanceAmount,
      amountInWords,
    };

    const termsAndConditions =
      invDetails?.termsAndConditions && invDetails.termsAndConditions.length > 0
        ? invDetails.termsAndConditions
        : [gstPercent > 0 ? "* Including GST." : "* GST Not Applicable.", "* Payment 100% Advance."];

    const authorization = {
      companyName: invDetails?.authorization?.companyName || company.companyName,
      sealUrl: company.sealUrl || invDetails?.authorization?.sealUrl || null,
      signatureUrl: invDetails?.authorization?.signatureUrl || null,
      authorizedSignatoryName: invDetails?.authorization?.authorizedSignatoryName || "Authorized Signatory",
    };

    // Calculate totals for items table
    const totalItemQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalItemAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      company,
      customer,
      invoiceMeta,
      items,
      billing,
      termsAndConditions,
      authorization,
      totalItemQty,
      totalItemAmount,
    };
  }, [
    job,
    invoiceNo,
    invoiceSubtotal,
    invoiceGstAmount,
    invoiceGstPercent,
    invoiceTotal,
    initialAmount,
    invoiceGeneratedAt,
    tenantInfo,
    paymentConfig,
    companyInfo,
    paramCompany,
    paramInvoice,
    paramPaymentMethod,
    paramPaymentStatus,
  ]);

  /**
   * Generates the clean, exact SERVICE BILL PDF HTML string matching the reference PDF design.
   */
  const generateServiceBillHtml = (): string => {
    const {
      company,
      customer,
      invoiceMeta,
      items,
      billing,
      termsAndConditions,
      authorization,
      totalItemQty,
      totalItemAmount,
    } = invoiceData;

    const itemsRowsHtml = items
      .map(
        (item, idx) => `
        <tr>
          <td style="width: 32px; text-align: center;">${idx + 1}</td>
          <td>
            <div style="font-weight: 700; text-transform: uppercase;">${item.itemName}</div>
            ${item.description ? `<div style="font-size: 10px; color: #6b7280; margin-top: 1px;">${item.description}</div>` : ""}
          </td>
          <td style="width: 60px; text-align: center;">${item.quantity}</td>
          <td style="width: 60px; text-align: center;">${item.unit}</td>
          <td style="width: 100px; text-align: right;">Rs ${Number(item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="width: 100px; text-align: right; font-weight: 600;">Rs ${Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `
      )
      .join("");

    const termsHtml = termsAndConditions
      .map((term) => `<div style="font-size: 11px; color: #374151; margin-top: 2px;">${term}</div>`)
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Service Bill #${invoiceMeta.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            padding: 36px 44px;
            color: #111827;
            line-height: 1.4;
            font-size: 12px;
          }
          .bill-box { max-width: 720px; margin: auto; }
          .header-row { display: flex; justify-content: space-between; align-items: center; }
          .company-col { flex: 1; padding-right: 16px; }
          .company-title { font-size: 16px; font-weight: 800; color: #111827; text-transform: uppercase; letter-spacing: 0.5px; }
          .company-meta { font-size: 11px; color: #374151; margin-top: 2px; }
          .logo-col { width: 140px; text-align: right; display: flex; justify-content: flex-end; align-items: center; }
          .header-logo { max-height: 65px; max-width: 140px; object-fit: contain; }
          .green-line { height: 1.5px; background: #15803d; margin: 12px 0 14px 0; width: 100%; }
          .bill-title { font-size: 18px; font-weight: 800; color: #15803d; text-align: center; margin-bottom: 18px; letter-spacing: 0.5px; }
          
          .two-col { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
          .col-left { width: 55%; }
          .col-right { width: 42%; text-align: right; }
          .section-title { font-size: 12px; font-weight: 700; color: #111827; margin-bottom: 4px; }
          .customer-name { font-size: 13px; font-weight: 700; color: #111827; text-transform: uppercase; }
          .cust-meta { font-size: 11px; color: #374151; margin-top: 2px; }
          .detail-row { font-size: 11px; color: #374151; margin-top: 3px; }
          .detail-label { color: #6b7280; font-weight: 500; }
          .detail-val { font-weight: 700; color: #111827; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #15803d; color: #ffffff; font-weight: 700; font-size: 11px; padding: 7px 8px; text-align: left; }
          td { padding: 8px 8px; font-size: 11px; color: #111827; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
          .total-row td { border-top: 1.5px solid #111827; border-bottom: 1.5px solid #111827; font-weight: 700; font-size: 11.5px; padding: 8px 8px; }

          .bottom-section { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px; }
          .bottom-left { width: 52%; }
          .bottom-right { width: 44%; }
          .bold-title { font-size: 11.5px; font-weight: 700; color: #111827; margin-bottom: 4px; }
          .words-text { font-size: 11.5px; color: #374151; margin-bottom: 16px; }
          
          .summary-row { display: flex; justify-content: space-between; font-size: 11.5px; color: #374151; padding: 3px 0; }
          .total-banner { background: #15803d; color: #ffffff; display: flex; justify-content: space-between; font-weight: 700; font-size: 12px; padding: 6px 8px; margin: 4px 0; }
          .summary-val { font-weight: 600; color: #111827; }

          .auth-box { margin-top: 22px; text-align: right; }
          .auth-for { font-size: 11.5px; font-weight: 700; color: #111827; }
          .seal-box { height: 55px; margin: 4px 0; display: flex; justify-content: flex-end; align-items: center; }
          .seal-space { height: 45px; }
          .seal-img { max-height: 50px; max-width: 100px; object-fit: contain; }
          .auth-signatory { font-size: 11.5px; font-weight: 700; color: #111827; }
        </style>
      </head>
      <body>
        <div class="bill-box">
          <!-- 1. TOP HEADER: Company Details (Left) & Company Logo (Right) -->
          <div class="header-row">
            <div class="company-col">
              <div class="company-title">${company.companyName}</div>
              ${company.address ? `<div class="company-meta">${company.address}</div>` : ""}
              ${company.city || company.pincode ? `<div class="company-meta">${[company.city, company.pincode].filter(Boolean).join(" - ")}</div>` : ""}
              ${company.phone ? `<div class="company-meta">Phone: ${company.phone}</div>` : ""}
              ${company.state ? `<div class="company-meta">State: ${company.state}</div>` : ""}
              ${company.gstNumber ? `<div class="company-meta">GSTIN: ${company.gstNumber}</div>` : ""}
            </div>
            ${company.logoUrl ? `
              <div class="logo-col">
                <img src="${company.logoUrl}" class="header-logo" alt="Logo" />
              </div>
            ` : ""}
          </div>

          <!-- Thin Green Divider Line -->
          <div class="green-line"></div>

          <!-- 2. CENTERED SERVICE BILL TITLE -->
          <div class="bill-title">SERVICE BILL</div>

          <!-- 3. TWO-COLUMN: Bill To (Left) & Invoice Details (Right) -->
          <div class="two-col">
            <div class="col-left">
              <div class="section-title">Bill To</div>
              <div class="customer-name">${customer.customerName}</div>
              ${customer.customerAddress ? `<div class="cust-meta">${customer.customerAddress}</div>` : ""}
              ${customer.customerCity || customer.customerPincode ? `<div class="cust-meta">${[customer.customerCity, customer.customerPincode].filter(Boolean).join(", ")}</div>` : ""}
              ${customer.customerPhone ? `<div class="cust-meta">Contact: ${customer.customerPhone}</div>` : ""}
              ${customer.customerState ? `<div class="cust-meta">State: ${customer.customerState}</div>` : ""}
              ${customer.customerGstin ? `<div class="cust-meta">GSTIN: ${customer.customerGstin}</div>` : ""}
            </div>

            <div class="col-right">
              <div class="section-title">Invoice Details</div>
              <div class="detail-row"><span class="detail-label">Invoice No.: </span><span class="detail-val">${invoiceMeta.invoiceNumber}</span></div>
              <div class="detail-row"><span class="detail-label">Date: </span><span class="detail-val">${invoiceMeta.invoiceDate}</span></div>
              ${invoiceMeta.invoiceTime ? `<div class="detail-row"><span class="detail-label">Time: </span><span class="detail-val">${invoiceMeta.invoiceTime}</span></div>` : ""}
              ${invoiceMeta.placeOfSupply ? `<div class="detail-row"><span class="detail-label">Place of Supply: </span><span class="detail-val">${invoiceMeta.placeOfSupply}</span></div>` : ""}
            </div>
          </div>

          <!-- 4. ITEM TABLE -->
          <table>
            <thead>
              <tr>
                <th style="width: 32px; text-align: center;">#</th>
                <th>Item name</th>
                <th style="width: 60px; text-align: center;">Quantity</th>
                <th style="width: 60px; text-align: center;">Unit</th>
                <th style="width: 100px; text-align: right;">Price/ Unit</th>
                <th style="width: 100px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
              <tr class="total-row">
                <td style="text-align: center;"></td>
                <td>Total</td>
                <td style="text-align: center;">${totalItemQty}</td>
                <td></td>
                <td></td>
                <td style="text-align: right;">Rs ${totalItemAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          <!-- 5. LOWER SECTION: Words & Terms (Left) | Billing Summary (Right) -->
          <div class="bottom-section">
            <div class="bottom-left">
              <div class="bold-title">Invoice Amount In Words</div>
              <div class="words-text">${billing.amountInWords}</div>

              <div class="bold-title">Terms And Conditions</div>
              ${termsHtml}
            </div>

            <div class="bottom-right">
              <div class="summary-row">
                <span class="summary-label">Sub Total</span>
                <span class="summary-val">Rs ${billing.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              ${billing.discount > 0 ? `
                <div class="summary-row">
                  <span class="summary-label">Discount</span>
                  <span class="summary-val">-Rs ${billing.discount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ""}
              ${billing.gstAmount > 0 ? `
                <div class="summary-row">
                  <span class="summary-label">GST (${billing.gstPercent}%)</span>
                  <span class="summary-val">Rs ${billing.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ""}
              <div class="total-banner">
                <span>Total</span>
                <span>Rs ${billing.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Received</span>
                <span class="summary-val">Rs ${billing.receivedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Balance</span>
                <span class="summary-val">Rs ${billing.balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <!-- AUTHORIZATION -->
              <div class="auth-box">
                <div class="auth-for">For: ${company.companyName}</div>
                ${company.sealUrl ? `
                  <div class="seal-box">
                    <img src="${company.sealUrl}" class="seal-img" alt="Seal" />
                  </div>
                ` : `<div class="seal-space"></div>`}
                <div class="auth-signatory">${authorization.authorizedSignatoryName}</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  /**
   * Phase 9: Generates invoice PDF via expo-print and saves/opens it.
   */
  const handleDownload = async () => {
    try {
      setDownloading(true);
      const html = generateServiceBillHtml();
      const { uri } = await Print.printToFileAsync({ html });
      const filename = getPdfFilename(invoiceData.company.companyName, "service-bill");

      if (Platform.OS === "web") {
        if (typeof document !== "undefined") {
          const link = document.createElement("a");
          link.href = uri;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showAlert("Invoice Ready", `Service Bill #${invoiceData.invoiceMeta.invoiceNumber} has been downloaded.`, "success");
          return;
        }
      }

      const shareUri = await preparePdfForSharing(uri, filename);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareUri, {
          mimeType: "application/pdf",
          dialogTitle: `Save Invoice #${invoiceData.invoiceMeta.invoiceNumber}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        await Print.printAsync({ uri: shareUri });
      }
      showAlert("Invoice Ready", `Service Bill #${invoiceData.invoiceMeta.invoiceNumber} has been generated successfully.`, "success");
    } catch {
      showAlert("Download Failed", "We could not generate the invoice PDF. Please try again.", "error");
    } finally {
      setDownloading(false);
    }
  };

  /**
   * Phase 10: Shares the exact same generated PDF via native sharing sheet.
   */
  const handleShare = async () => {
    try {
      setSharing(true);
      const html = generateServiceBillHtml();
      const { uri } = await Print.printToFileAsync({ html });
      const filename = getPdfFilename(invoiceData.company.companyName, "service-bill");

      if (!(await Sharing.isAvailableAsync())) {
        showAlert("Sharing Unavailable", "Sharing is not supported on this device.", "warning");
        return;
      }

      const shareUri = await preparePdfForSharing(uri, filename);

      await Sharing.shareAsync(shareUri, {
        mimeType: "application/pdf",
        dialogTitle: `Share Service Bill #${invoiceData.invoiceMeta.invoiceNumber}`,
        UTI: "com.adobe.pdf",
      });
    } catch {
      showAlert("Share Failed", "We could not share the invoice document. Please try again.", "error");
    } finally {
      setSharing(false);
    }
  };

  if (isJobLoading && !job) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Service Bill" showBack onBackPress={handleBack} />
        <AppLoader message="Loading invoice..." />
      </View>
    );
  }

  const {
    company,
    customer,
    invoiceMeta,
    items,
    billing,
    termsAndConditions,
    authorization,
    totalItemQty,
    totalItemAmount,
  } = invoiceData;

  return (
    <View style={[styles.container, { backgroundColor: "#f1f5f9" }]}>
      <AppHeader
        title="Service Bill"
        subtitle={`#${invoiceMeta.invoiceNumber}`}
        showBack={true}
        onBackPress={handleBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ========================================================
            REQUIRED SERVICE BILL INVOICE CARD (MATCHING REFERENCE PDF)
            ======================================================== */}
        <View style={styles.billContainer}>
          {/* 1. TOP HEADER: Company Details (LEFT) & Logo (RIGHT) */}
          <View style={styles.headerRow}>
            <View style={styles.companyCol}>
              <Text style={styles.companyName}>{company.companyName}</Text>
              {company.address ? <Text style={styles.companyMeta}>{company.address}</Text> : null}
              {company.city || company.pincode ? (
                <Text style={styles.companyMeta}>
                  {[company.city, company.pincode].filter(Boolean).join(" - ")}
                </Text>
              ) : null}
              {company.phone ? <Text style={styles.companyMeta}>Phone: {company.phone}</Text> : null}
              {company.state ? <Text style={styles.companyMeta}>State: {company.state}</Text> : null}
              {company.gstNumber ? <Text style={styles.companyMeta}>GSTIN: {company.gstNumber}</Text> : null}
            </View>

            {company.logoUrl ? (
              <View style={styles.logoCol}>
                <Image source={{ uri: company.logoUrl }} style={styles.companyLogo} resizeMode="contain" />
              </View>
            ) : null}
          </View>

          {/* Green Horizontal Divider */}
          <View style={styles.greenDivider} />

          {/* 2. CENTERED SERVICE BILL TITLE */}
          <Text style={styles.serviceBillTitle}>SERVICE BILL</Text>

          {/* 3. TWO-COLUMN: Bill To (LEFT) & Invoice Details (RIGHT) */}
          <View style={styles.twoColRow}>
            {/* Bill To */}
            <View style={styles.colLeft}>
              <Text style={styles.sectionHeading}>Bill To</Text>
              <Text style={styles.customerName}>{customer.customerName}</Text>
              {customer.customerAddress ? (
                <Text style={styles.customerMeta}>{customer.customerAddress}</Text>
              ) : null}
              {customer.customerCity || customer.customerPincode ? (
                <Text style={styles.customerMeta}>
                  {[customer.customerCity, customer.customerPincode].filter(Boolean).join(", ")}
                </Text>
              ) : null}
              {customer.customerPhone ? (
                <Text style={styles.customerMeta}>Contact: {customer.customerPhone}</Text>
              ) : null}
              {customer.customerState ? (
                <Text style={styles.customerMeta}>State: {customer.customerState}</Text>
              ) : null}
              {customer.customerGstin ? (
                <Text style={styles.customerMeta}>GSTIN: {customer.customerGstin}</Text>
              ) : null}
            </View>

            {/* Invoice Details */}
            <View style={styles.colRight}>
              <Text style={[styles.sectionHeading, { textAlign: "right" }]}>Invoice Details</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice No.: </Text>
                <Text style={styles.metaValue}>{invoiceMeta.invoiceNumber}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date: </Text>
                <Text style={styles.metaValue}>{invoiceMeta.invoiceDate}</Text>
              </View>
              {invoiceMeta.invoiceTime ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Time: </Text>
                  <Text style={styles.metaValue}>{invoiceMeta.invoiceTime}</Text>
                </View>
              ) : null}
              {invoiceMeta.placeOfSupply ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Place of Supply: </Text>
                  <Text style={styles.metaValue}>{invoiceMeta.placeOfSupply}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* 4. ITEM TABLE */}
          <View style={styles.tableContainer}>
            {/* Table Header (Green Background, White Text) */}
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, styles.colIdx]}>#</Text>
              <Text style={[styles.thText, styles.colItem]}>Item name</Text>
              <Text style={[styles.thText, styles.colQty]}>Quantity</Text>
              <Text style={[styles.thText, styles.colUnit]}>Unit</Text>
              <Text style={[styles.thText, styles.colPrice]}>Price/ Unit</Text>
              <Text style={[styles.thText, styles.colAmount]}>Amount</Text>
            </View>

            {/* Table Rows */}
            {items.map((item, index) => (
              <View key={`item-${index}`} style={styles.tableRow}>
                <Text style={[styles.tdText, styles.colIdx, { color: "#64748b" }]}>{index + 1}</Text>
                <View style={styles.colItem}>
                  <Text style={styles.itemNameText}>{item.itemName}</Text>
                  {item.description ? (
                    <Text style={styles.itemDescText}>{item.description}</Text>
                  ) : null}
                </View>
                <Text style={[styles.tdText, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.tdText, styles.colUnit]}>{item.unit}</Text>
                <Text style={[styles.tdText, styles.colPrice]}>{fmt(item.unitPrice)}</Text>
                <Text style={[styles.tdText, styles.colAmount, { fontWeight: "700" }]}>
                  {fmt(item.amount)}
                </Text>
              </View>
            ))}

            {/* Total Row */}
            <View style={styles.tableTotalRow}>
              <Text style={[styles.totalRowText, styles.colIdx]}></Text>
              <Text style={[styles.totalRowText, styles.colItem]}>Total</Text>
              <Text style={[styles.totalRowText, styles.colQty]}>{totalItemQty}</Text>
              <Text style={[styles.totalRowText, styles.colUnit]}></Text>
              <Text style={[styles.totalRowText, styles.colPrice]}></Text>
              <Text style={[styles.totalRowText, styles.colAmount]}>{fmt(totalItemAmount)}</Text>
            </View>
          </View>

          {/* 5. LOWER SECTION: Words & Terms (Left) | Summary & Auth (Right) */}
          <View style={styles.lowerSection}>
            {/* Left: Words & Terms */}
            <View style={styles.lowerLeft}>
              <Text style={styles.lowerHeading}>Invoice Amount In Words</Text>
              <Text style={styles.amountInWordsText}>{billing.amountInWords}</Text>

              <Text style={[styles.lowerHeading, { marginTop: 14 }]}>Terms And Conditions</Text>
              {termsAndConditions.map((term, index) => (
                <Text key={`term-${index}`} style={styles.termText}>
                  {term}
                </Text>
              ))}
            </View>

            {/* Right: Billing Summary & Authorization */}
            <View style={styles.lowerRight}>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Sub Total</Text>
                <Text style={styles.summaryVal}>{fmt(billing.subtotal)}</Text>
              </View>

              {billing.discount > 0 ? (
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryVal, { color: "#dc2626" }]}>-{fmt(billing.discount)}</Text>
                </View>
              ) : null}

              {billing.gstAmount > 0 ? (
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>GST ({billing.gstPercent}%)</Text>
                  <Text style={styles.summaryVal}>{fmt(billing.gstAmount)}</Text>
                </View>
              ) : null}

              {/* Total Banner (Solid Green, White Text) */}
              <View style={styles.totalBanner}>
                <Text style={styles.totalBannerText}>Total</Text>
                <Text style={styles.totalBannerText}>{fmt(billing.total)}</Text>
              </View>

              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Received</Text>
                <Text style={styles.summaryVal}>{fmt(billing.receivedAmount)}</Text>
              </View>

              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Balance</Text>
                <Text style={styles.summaryVal}>{fmt(billing.balanceAmount)}</Text>
              </View>

              {/* AUTHORIZATION */}
              <View style={styles.authContainer}>
                <Text style={styles.authForText}>For: {company.companyName}</Text>
                {company.sealUrl ? (
                  <View style={styles.sealWrapper}>
                    <Image
                      source={{ uri: company.sealUrl }}
                      style={styles.companySeal}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <View style={styles.signatorySpace} />
                )}
                <Text style={styles.signatoryText}>{authorization.authorizedSignatoryName}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ========================================================
            6. ACTIONS: DOWNLOAD & SHARE INVOICE
            ======================================================== */}
        <View style={styles.actionsContainer}>
          <View style={styles.btnRow}>
            <AppButton
              title={downloading ? "Downloading..." : "Download Invoice"}
              onPress={handleDownload}
              variant="outline"
              size="md"
              style={styles.actionBtn}
              loading={downloading}
              disabled={downloading || sharing}
              icon={<Download size={16} color="#15803d" style={{ marginRight: 6 }} />}
            />
            <AppButton
              title={sharing ? "Sharing..." : "Share Invoice"}
              onPress={handleShare}
              variant="primary"
              size="md"
              style={[styles.actionBtn, { backgroundColor: "#15803d" }]}
              loading={sharing}
              disabled={downloading || sharing}
              icon={<Share2 size={16} color="#ffffff" style={{ marginRight: 6 }} />}
            />
          </View>
        </View>
      </ScrollView>

      {/* Alert Feedback Modal */}
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
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 90,
  },
  billContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  companyCol: {
    flex: 1,
    paddingRight: 16,
  },
  companyName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  companyMeta: {
    fontSize: 11,
    color: "#334155",
    marginTop: 2,
    lineHeight: 15,
  },
  logoCol: {
    width: 100,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  companyLogo: {
    width: 90,
    height: 60,
  },
  greenDivider: {
    height: 1.5,
    backgroundColor: "#15803d",
    marginVertical: 10,
    width: "100%",
  },
  serviceBillTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#15803d",
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  twoColRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  colLeft: {
    flex: 1,
    paddingRight: 8,
  },
  colRight: {
    flex: 1,
    alignItems: "flex-end",
    paddingLeft: 8,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 3,
  },
  customerName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0f172a",
    textTransform: "uppercase",
  },
  customerMeta: {
    fontSize: 10.5,
    color: "#334155",
    marginTop: 1.5,
    lineHeight: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  metaLabel: {
    fontSize: 10.5,
    color: "#64748b",
  },
  metaValue: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#15803d",
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  thText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    alignItems: "flex-start",
  },
  tdText: {
    fontSize: 10.5,
    color: "#0f172a",
  },
  colIdx: {
    width: 22,
    textAlign: "center",
  },
  colItem: {
    flex: 3,
    paddingRight: 4,
  },
  colQty: {
    width: 38,
    textAlign: "center",
  },
  colUnit: {
    width: 38,
    textAlign: "center",
  },
  colPrice: {
    width: 65,
    textAlign: "right",
  },
  colAmount: {
    width: 65,
    textAlign: "right",
  },
  itemNameText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  itemDescText: {
    fontSize: 9.5,
    color: "#64748b",
    marginTop: 1,
  },
  tableTotalRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 6,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1.5,
    borderTopColor: "#0f172a",
    borderBottomWidth: 1.5,
    borderBottomColor: "#0f172a",
    alignItems: "center",
  },
  totalRowText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  lowerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 6,
  },
  lowerLeft: {
    flex: 1.1,
    paddingRight: 10,
  },
  lowerRight: {
    flex: 0.9,
    paddingLeft: 4,
  },
  lowerHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 3,
  },
  amountInWordsText: {
    fontSize: 10.5,
    color: "#334155",
    lineHeight: 14,
  },
  termText: {
    fontSize: 10,
    color: "#334155",
    marginTop: 2,
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2.5,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#334155",
  },
  summaryVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  totalBanner: {
    backgroundColor: "#15803d",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginVertical: 4,
    borderRadius: 3,
  },
  totalBannerText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  authContainer: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  authForText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  sealWrapper: {
    height: 48,
    width: 80,
    justifyContent: "center",
    alignItems: "flex-end",
    marginVertical: 3,
  },
  sealImage: {
    width: 75,
    height: 44,
  },
  companySeal: {
    width: 75,
    height: 44,
  },
  signatorySpace: {
    height: 36,
  },
  signatoryText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  actionsContainer: {
    marginTop: 16,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
  },
});
