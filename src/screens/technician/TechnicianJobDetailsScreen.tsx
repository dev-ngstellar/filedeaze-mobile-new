import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  Image,
  Switch,
  Modal,
  PanResponder,
} from "react-native";
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import {
  Phone,
  MapPin,
  Clock,
  Navigation as NavigationIcon,
  CheckCircle2,
  AlertCircle,
  Camera,
  DollarSign,
  Calendar,
  XCircle,
  Mail,
  Tag,
  PhoneCall,
  PlayCircle,
  AlertTriangle,
  Upload,
  ArrowLeft,
  ChevronDown,
  Smartphone,
  Play,
  Receipt,
  PenLine,
  Trash2,
  ImagePlus,
  ShieldCheck,
  CheckCircle,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";

import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useTheme } from "../../theme";
import { apiClient } from "../../api/client";
import { TechnicianStackParamList } from "../../types/navigation.types";
import { TicketStatus, JobService, SparePartUsageDraft, CollectPaymentResult } from "../../services/job.service";
import { PaymentService, PlatformCharges, MobilePaymentConfig } from "../../services/payment.service";
import {
  useJobDetails,
  useUpdateJobStatus,
  useCompleteJob,
  useRescheduleJob,
  useMarkJobPending,
  useRejectJob,
  useCollectPayment,
  usePaymentPreview,
  useUploadTicketImage,
  useTechnicianJobs,
  useAttendanceStatus,
  useSaveBeforePhotos,
} from "../../hooks/useJobs";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppCard } from "../../components/AppCard";
import { AppBadge } from "../../components/AppBadge";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { AppConfirmModal } from "../../components/AppConfirmModal";
import { AppSuccessModal } from "../../components/AppSuccessModal";
import { SparePartsSection, validateSparePartDrafts } from "../../components/warranty/SparePartsSection";
import { PaymentSummaryCard } from "../../components/warranty/PaymentSummaryCard";
import { getWarrantyStatus } from "../../utils";

type RouteProps = RouteProp<TechnicianStackParamList, "TechnicianJobDetails">;
type NavigationProp = NativeStackNavigationProp<TechnicianStackParamList, "TechnicianJobDetails">;

const QUICK_REASONS = [
  "Outside my service area",
  "Skills mismatch — wrong specialization",
  "Medical / Emergency leave",
  "Schedule conflict",
  "Vehicle unavailable",
];

const PENDING_REASONS = [
  "Spare Parts Required",
  "Waiting for Customer Approval",
  "Complex Issue — Needs Expert/Team",
  "Site Outage (Power/Water/Utility)",
  "Customer Requested Delay",
];

export const TechnicianJobDetailsScreen = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { jobId } = route.params;
  const queryClient = useQueryClient();
  const [shouldNavigateHome, setShouldNavigateHome] = useState(false);

  const { data: job, isLoading, refetch } = useJobDetails(jobId);
  const { data: attendance } = useAttendanceStatus();
  const { data: allJobs = [] } = useTechnicianJobs();
  const updateStatusMutation = useUpdateJobStatus();
  const completeJobMutation = useCompleteJob();
  const rescheduleJobMutation = useRescheduleJob();
  const markPendingMutation = useMarkJobPending();
  const rejectJobMutation = useRejectJob();
  const collectPaymentMutation = useCollectPayment();
  const uploadImageMutation = useUploadTicketImage();
  const savePhotosMutation = useSaveBeforePhotos();
  const isCheckedIn = !!attendance?.checkedIn;

  const isVideoUrl = (url: string) => {
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
    return ["mp4", "mov", "avi", "webm", "mkv", "3gp"].includes(ext || "");
  };

  // Dialog / Popups Visibility
  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    confirmText: string;
    confirmVariant: "success" | "danger" | "primary";
    onConfirm: () => void;
  } | null>(null);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalTitle, setAlertModalTitle] = useState("");
  const [alertModalMessage, setAlertModalMessage] = useState("");

  const showAlert = (title: string, message: string) => {
    setAlertModalTitle(title);
    setAlertModalMessage(message);
    setAlertModalVisible(true);
  };

  // Reject State
  const [rejectFormVisible, setRejectFormVisible] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState("");
  const [rejectReasonText, setRejectReasonText] = useState("");

  // Pending State Form
  const [pendingFormVisible, setPendingFormVisible] = useState(false);
  const [selectedPendingReason, setSelectedPendingReason] = useState("");
  const [pendingNotes, setPendingNotes] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);

  // Reschedule Form State
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [nextVisitDate, setNextVisitDate] = useState("");

  // Start Job State
  const [startJobFormVisible, setStartJobFormVisible] = useState(false);
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [earlyStartModalVisible, setEarlyStartModalVisible] = useState(false);

  // Reach Location Form State
  const [reachFormVisible, setReachFormVisible] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);

  // Complete Form State (Multi-step Wizard)
  const [completeFormVisible, setCompleteFormVisible] = useState(false);
  const [completeStep, setCompleteStep] = useState(1);
  const [workNotes, setWorkNotes] = useState("");
  const [duration, setDuration] = useState("1.5 Hours");
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [liveDuration, setLiveDuration] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Complete Signature state
  type Point = { x: number; y: number };
  type Stroke = Point[];
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);
  const currentStrokeRef = useRef<Stroke>([]);
  const [remarks, setRemarks] = useState("");
  const [hasSigned, setHasSigned] = useState(false);

  // Spare parts / warranty state — completion-time (sent as sparePartsUsed on complete()) and
  // payment-time (split into warrantyParts/nonWarrantyParts on collectPayment()) are kept separate
  // since they're two different backend calls with two different payload shapes.
  const [completionSpareParts, setCompletionSpareParts] = useState<SparePartUsageDraft[]>([]);
  const [completionSparePartsInvalid, setCompletionSparePartsInvalid] = useState<Set<string>>(new Set());
  const [paymentSpareParts, setPaymentSpareParts] = useState<SparePartUsageDraft[]>([]);
  const [paymentSparePartsInvalid, setPaymentSparePartsInvalid] = useState<Set<string>>(new Set());
  const [paymentResult, setPaymentResult] = useState<CollectPaymentResult | null>(null);
  const [paymentSuccessVisible, setPaymentSuccessVisible] = useState(false);

  // Complete Payment Collection state
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI">("CASH");
  const [amountStr, setAmountStr] = useState("");
  const [labourChargeStr, setLabourChargeStr] = useState("");
  const [extraCharges, setExtraCharges] = useState<{ id: string; name: string; amountStr: string }[]>([]);
  const [transactionId, setTransactionId] = useState("");
  const [transactionIdError, setTransactionIdError] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [generatedInvoiceNo, setGeneratedInvoiceNo] = useState("");
  // Fetch platform charges and mobile payment config (Only when modal is open)
  const { data: platformCharges } = useQuery({
    queryKey: ["platformCharges"],
    queryFn: PaymentService.getPlatformCharges,
    enabled: completeFormVisible,
  });

  const { data: paymentConfig } = useQuery({
    queryKey: ["mobilePaymentConfig"],
    queryFn: PaymentService.getMobilePaymentConfig,
    enabled: completeFormVisible,
  });

  useEffect(() => {
    if (paymentConfig && !paymentConfig.upiEnabled) {
      setPaymentMode("CASH");
    }
  }, [paymentConfig]);

  // CALCULATION LOGIC
  const base = (!amountStr || isNaN(parseFloat(amountStr)) || parseFloat(amountStr) <= 0) ? 0 : parseFloat(amountStr);
  const labour = (!labourChargeStr || isNaN(parseFloat(labourChargeStr)) || parseFloat(labourChargeStr) <= 0) ? 0 : parseFloat(labourChargeStr);
  const extraChargesSum = extraCharges.reduce((sum, item) => {
    const name = item.name.trim();
    const val = parseFloat(item.amountStr);
    if (name !== "" && !isNaN(val) && val > 0) {
      return sum + val;
    }
    return sum;
  }, 0);

  const baseAmount = base + extraChargesSum;

  const platformFee = Number(platformCharges?.platformFee || 0);

  const shippingCharge = platformCharges?.shippingEnabled
    ? Number(platformCharges?.shippingCharge || 0)
    : 0;

  const handlingCharge = platformCharges?.handlingEnabled
    ? Number(platformCharges?.handlingCharge || 0)
    : 0;

  const subtotal = baseAmount + platformFee + shippingCharge + handlingCharge;

  const gstEnabled = !!paymentConfig?.gstEnabled;
  const gstPercent = gstEnabled
    ? Number(paymentConfig?.gstPercent || 0)
    : 0;

  const gstAmount = gstEnabled ? (subtotal * gstPercent / 100) : 0;

  const discountAmount =
    (platformCharges?.dailyDiscountEnabled ? Number(platformCharges?.dailyDiscount || 0) : 0) +
    (platformCharges?.weeklyDiscountEnabled ? Number(platformCharges?.weeklyDiscount || 0) : 0) +
    (platformCharges?.monthlyDiscountEnabled ? Number(platformCharges?.monthlyDiscount || 0) : 0);

  const totalAmount = subtotal + gstAmount - discountAmount;
  const amount = Math.max(0, Math.round(totalAmount * 100) / 100);

  const currencySymbol = paymentConfig?.currency === "INR" ? "₹" : (paymentConfig?.currency || "₹");

  // Everything technician-entered outside the core service charge (named extra items + tenant
  // platform/shipping/handling fees) is billed via the backend's generic additionalCharge bucket.
  const backendAdditionalCharge = extraChargesSum + platformFee + shippingCharge + handlingCharge;

  // Backend-computed breakdown for the payment step — AMC service/labour waivers are applied here,
  // never on device. Only fetched once the technician has entered a charge and the form is open.
  const { data: paymentPreview } = usePaymentPreview(
    jobId,
    { serviceCharge: base, labourCharge: labour, additionalCharge: backendAdditionalCharge, discount: discountAmount },
    completeFormVisible && completeStep === 2
  );

  // Reached Location GPS State
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>({ lat: 28.6139, lng: 77.2090 });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Navigation Route Param Trigger Modals
  useEffect(() => {
    if (route.params?.openCompleteJob) {
      setCompleteFormVisible(true);
      navigation.setParams({ openCompleteJob: undefined } as any);
    }
    if (route.params?.openMarkPending) {
      setPendingFormVisible(true);
      navigation.setParams({ openMarkPending: undefined } as any);
    }
  }, [route.params]);

  // Refetch job details whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Live Timer for In Progress Jobs
  useEffect(() => {
    if (job?.status !== "IN_PROGRESS") {
      setLiveDuration("");
      return;
    }

    if (completeFormVisible) {
      return;
    }

    const inProgressLog = job.statusLogs?.find((log: any) => log.status === "IN_PROGRESS");
    const startTime = inProgressLog ? new Date(inProgressLog.changedAt).getTime() : Date.now();

    const updateTimer = () => {
      const now = Date.now();
      const diffMs = now - startTime;
      if (diffMs <= 0) {
        setLiveDuration("00:00:00");
        return;
      }
      const totalSecs = Math.floor(diffMs / 1000);
      const secs = totalSecs % 60;
      const totalMins = Math.floor(totalSecs / 60);
      const mins = totalMins % 60;
      const hrs = Math.floor(totalMins / 60);

      const pad = (num: number) => String(num).padStart(2, "0");
      setLiveDuration(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, [job?.status, job?.statusLogs, completeFormVisible]);

  useEffect(() => {
    if (completeFormVisible) {
      setDuration(liveDuration || "00:00:00");
    }
  }, [completeFormVisible]);

  // Auto-populate price when job data loads
  useEffect(() => {
    if (job && !amountStr) {
      const defaultAmount = job.serviceCharge ?? job.categoryPrice ?? 0;
      if (defaultAmount > 0) {
        setAmountStr(String(defaultAmount));
      }
    }
  }, [job, amountStr]);

  useEffect(() => {
    if (job && !labourChargeStr) {
      const defaultLabour = (job as any).labourCharge ?? 0;
      if (defaultLabour > 0) {
        setLabourChargeStr(String(defaultLabour));
      }
    }
  }, [job, labourChargeStr]);

  // Sync paymentSpareParts with completionSpareParts
  useEffect(() => {
    setPaymentSpareParts(completionSpareParts);
  }, [completionSpareParts]);

  // Auto-fetch GPS on REACHED status or similar
  useEffect(() => {
    if (job?.status === "ACCEPTED" || job?.status === "REACHED_LOCATION" || completeFormVisible) {
      fetchGPS();
    }
  }, [job?.status, completeFormVisible]);

  const fetchGPS = async () => {
    setGpsLoading(true);
    setGpsError(null);
    setLocationName(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsError("Location permission denied. Please enable location service.");
        setGpsLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coords = {
        lat: parseFloat(loc.coords.latitude.toFixed(6)),
        lng: parseFloat(loc.coords.longitude.toFixed(6)),
      };
      setGpsCoords(coords);
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geocode && geocode.length > 0) {
          const item = geocode[0];
          const parts = [
            item.name,
            item.street,
            item.district,
            item.city,
            item.region,
            item.postalCode,
            item.country,
          ].filter(Boolean);
          setLocationName(parts.join(", "));
        } else {
          setLocationName(`${coords.lat}, ${coords.lng}`);
        }
      } catch {
        setLocationName(`${coords.lat}, ${coords.lng}`);
      }
    } catch (e) {
      setGpsError("Could not fetch GPS. Using fallback coordinates.");
      setGpsCoords({ lat: 28.6139, lng: 77.2090 });
      setLocationName("New Delhi, Delhi, India");
    } finally {
      setGpsLoading(false);
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (status === "ACCEPTED") {
      // 1. Check if the technician already has another active job
      const hasActiveJob = Array.isArray(allJobs) && allJobs.some(
        (j) => j.id !== jobId && ["ACCEPTED", "TRAVELLING", "REACHED_LOCATION", "IN_PROGRESS"].includes(j.status)
      );
      if (hasActiveJob) {
        setAlertModalTitle("Active Job Pending");
        setAlertModalMessage("You can only accept one job at a time. Please complete your current active job first.");
        setAlertModalVisible(true);
        return;
      }

      // 2. Check if the ticket was raised within the last 48 hours
      if (job?.createdAt) {
        const raisedTime = new Date(job.createdAt).getTime();
        const currentTime = Date.now();
        const hoursDifference = (currentTime - raisedTime) / (1000 * 60 * 60);

        if (hoursDifference > 48) {
          setAlertModalTitle("Time Expired");
          setAlertModalMessage("You can only accept a ticket within 48 hours of it being raised.");
          setAlertModalVisible(true);
          return;
        }
      }
    }

    try {
      await updateStatusMutation.mutateAsync({ ticketId: jobId, status });
      queryClient.invalidateQueries({ queryKey: ["ticketDetails", jobId] });
      queryClient.invalidateQueries({ queryKey: ["technicianTickets"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "details", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "technician", "list"] });
      setSuccessTitle("Status Updated");
      setSuccessMessage(`Ticket status is now ${status}.`);
      setSuccessVisible(true);
      await refetch();
    } catch (err: any) {
      setAlertModalTitle("Error");
      setAlertModalMessage(err.message || "Failed to update status.");
      setAlertModalVisible(true);
    }
  };

  const triggerConfirm = (title: string, message: string, confirmText: string, confirmVariant: "success" | "danger" | "primary", onConfirm: () => void) => {
    setConfirmConfig({ title, message, confirmText, confirmVariant, onConfirm });
    setConfirmVisible(true);
  };

  const handleRejectSubmit = async () => {
    const finalReason = selectedRejectReason === "Other" ? rejectReasonText : selectedRejectReason;
    if (!finalReason.trim()) {
      showAlert("Required", "Please select or describe a rejection reason.");
      return;
    }
    try {
      await rejectJobMutation.mutateAsync({ ticketId: jobId, reason: finalReason });
      setRejectFormVisible(false);
      queryClient.invalidateQueries({ queryKey: ["ticketDetails", jobId] });
      queryClient.invalidateQueries({ queryKey: ["technicianTickets"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "details", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "technician", "list"] });
      setSuccessTitle("Job Rejected");
      setSuccessMessage("This ticket has been rejected and will be reassigned.");
      setShouldNavigateHome(true);
      setSuccessVisible(true);
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to reject job.");
    }
  };

  const handlePendingSubmit = async () => {
    if (!selectedPendingReason) {
      showAlert("Required", "Please choose a pending reason.");
      return;
    }
    try {
      setUploadingImage(true);
      const uploadedUrls: string[] = [];
      for (const uri of pendingPhotos) {
        if (uri.startsWith("http")) {
          uploadedUrls.push(uri);
        } else {
          const res = await uploadImageMutation.mutateAsync({
            ticketNo: jobId,
            imageUri: uri,
            type: "BEFORE",
          });
          if (res.url) {
            uploadedUrls.push(res.url);
          }
        }
      }
      await markPendingMutation.mutateAsync({
        ticketNo: jobId,
        pendingReason: selectedPendingReason,
        notes: pendingNotes,
        photos: uploadedUrls,
      });
      setPendingFormVisible(false);
      setPendingPhotos([]);
      setPendingNotes("");
      queryClient.invalidateQueries({ queryKey: ["ticketDetails", jobId] });
      queryClient.invalidateQueries({ queryKey: ["technicianTickets"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "details", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "technician", "list"] });
      setSuccessTitle("Status Marked Pending");
      setSuccessMessage(`Ticket is now marked as pending. Reason: ${selectedPendingReason}`);
      setSuccessVisible(true);
      await refetch();
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to save status.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!nextVisitDate) {
      showAlert("Required", "Please enter reschedule date.");
      return;
    }
    try {
      await rescheduleJobMutation.mutateAsync({
        ticketNo: jobId,
        nextVisitDate,
      });
      setRescheduleVisible(false);
      queryClient.invalidateQueries({ queryKey: ["ticketDetails", jobId] });
      queryClient.invalidateQueries({ queryKey: ["technicianTickets"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "details", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "technician", "list"] });
      setSuccessTitle("Job Rescheduled");
      setSuccessMessage(`Job has been rescheduled for ${nextVisitDate}.`);
      setSuccessVisible(true);
      await refetch();
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to reschedule.");
    }
  };

  // REACH LOCATION HANDLERS
  const handleReachSubmit = async () => {
    const coords = gpsCoords || { lat: 28.6139, lng: 77.2090 };
    try {
      await updateStatusMutation.mutateAsync({ ticketId: jobId, status: "REACHED_LOCATION" });
      setReachFormVisible(false);
      queryClient.invalidateQueries({ queryKey: ["ticketDetails", jobId] });
      queryClient.invalidateQueries({ queryKey: ["technicianTickets"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "details", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "technician", "list"] });
      setSuccessTitle("Reached Site ✓");
      setSuccessMessage(`Arrival recorded at location: ${locationName || `${coords.lat}, ${coords.lng}`}`);
      setSuccessVisible(true);
      await refetch();
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to record reached status.");
    }
  };

  // BEFORE PHOTOS & START JOB HANDLERS
  const pickBeforeFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showAlert("Permission Needed", "Camera access is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setBeforePhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const pickBeforeFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Permission Needed", "Library access is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled && result.assets.length > 0) {
      setBeforePhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removeBeforePhoto = (index: number) => {
    setBeforePhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const startJobMutationCall = async () => {
    try {
      await savePhotosMutation.mutateAsync({ ticketNo: jobId, photos: beforePhotos });
      setStartJobFormVisible(false);
      queryClient.invalidateQueries({ queryKey: ["ticketDetails", jobId] });
      queryClient.invalidateQueries({ queryKey: ["technicianTickets"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "details", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "technician", "list"] });
      setSuccessTitle("Job Started ✓");
      setSuccessMessage("Status set to IN PROGRESS. Your work timer has started.");
      setSuccessVisible(true);
      await refetch();
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to start job.");
    }
  };

  const handleStartJob = async () => {
    if (beforePhotos.length === 0) {
      showAlert("Before Photos Required", "Please capture at least 1 before photo of the job site.");
      return;
    }
    if (job?.scheduledAt) {
      const scheduledTimeMs = new Date(job.scheduledAt).getTime();
      const currentTimeMs = Date.now();
      if (currentTimeMs < scheduledTimeMs) {
        setEarlyStartModalVisible(true);
        return;
      }
    }
    await startJobMutationCall();
  };

  // PENDING EVIDENCE PHOTOS HANDLERS
  const pickPendingPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libStatus !== "granted") {
        showAlert("Permission Needed", "Library access is required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setPendingPhotos((p) => [...p, result.assets[0].uri]);
      }
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPendingPhotos((p) => [...p, result.assets[0].uri]);
    }
  };

  const removePendingPhoto = (index: number) => {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // AFTER PHOTOS HANDLERS
  const pickAfterFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showAlert("Permission Denied", "Camera access is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setAfterPhotos((p) => [...p, result.assets[0].uri]);
    }
  };

  const pickAfterFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Permission Denied", "Library access is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled && result.assets.length > 0) {
      setAfterPhotos((p) => [...p, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removeAfterPhoto = (index: number) => {
    setAfterPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // COMPLETE JOB STEP PROCEDURES
  const handleStep1Proceed = () => {
    if (afterPhotos.length === 0) {
      showAlert("After Photos Required", "Please capture at least 1 after photo showing completed work.");
      return;
    }
    if (!workNotes.trim()) {
      showAlert("Work Notes Required", "Please enter a work summary / resolution note.");
      return;
    }
    setCompleteStep(2);
  };

  const handleStep2Proceed = () => {
    if (!hasSigned || strokes.length === 0) {
      showAlert("Signature Required", "Please ask the customer to sign on the pad.");
      return;
    }
    setCompleteStep(3);
  };

  // SIGNATURE DRAWING PAD PAN RESPONDER
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const pt = { x: locationX, y: locationY };
        currentStrokeRef.current = [pt];
        setCurrentStroke([pt]);
        setHasSigned(true);
        setScrollEnabled(false);
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const pt = { x: locationX, y: locationY };
        currentStrokeRef.current = [...currentStrokeRef.current, pt];
        setCurrentStroke([...currentStrokeRef.current]);
      },

      onPanResponderRelease: () => {
        if (currentStrokeRef.current.length > 0) {
          const finishedStroke = [...currentStrokeRef.current];
          setStrokes((prev) => [...prev, finishedStroke]);
        }
        currentStrokeRef.current = [];
        setCurrentStroke([]);
        setScrollEnabled(true);
      },
      onPanResponderTerminate: () => {
        if (currentStrokeRef.current.length > 0) {
          const finishedStroke = [...currentStrokeRef.current];
          setStrokes((prev) => [...prev, finishedStroke]);
        }
        currentStrokeRef.current = [];
        setCurrentStroke([]);
        setScrollEnabled(true);
      },
    })
  ).current;

  const clearSignature = () => {
    setStrokes([]);
    currentStrokeRef.current = [];
    setCurrentStroke([]);
    setHasSigned(false);
  };

  const buildPath = (stroke: Stroke): string => {
    if (stroke.length < 2) return "";
    const [first, ...rest] = stroke;
    return [`M ${first.x} ${first.y}`, ...rest.map((p) => `L ${p.x} ${p.y}`)].join(" ");
  };


  const addExtraCharge = () => {
    setExtraCharges((prev) => [...prev, { id: Math.random().toString(), name: "", amountStr: "" }]);
  };

  const removeExtraCharge = (id: string) => {
    setExtraCharges((prev) => prev.filter((item) => item.id !== id));
  };

  const updateExtraCharge = (id: string, field: "name" | "amountStr", value: string) => {
    setExtraCharges((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // NEW DECOUPLED COMPLETE SUBMIT
  const handleCompleteSubmit = async () => {
    if (!workNotes.trim()) {
      showAlert("Notes Required", "Please enter work summary notes.");
      return;
    }
    if (afterPhotos.length === 0) {
      showAlert("Photo Required", "Please capture or select at least 1 photo of completed work.");
      return;
    }

    const sparePartsValidation = validateSparePartDrafts(completionSpareParts);
    if (sparePartsValidation) {
      setCompletionSparePartsInvalid(sparePartsValidation.invalidIds);
      showAlert("Spare Parts Incomplete", sparePartsValidation.message);
      return;
    }
    setCompletionSparePartsInvalid(new Set());

    setSubmitting(true);
    try {
      // 1. Upload all after photos sequentially
      const uniqueAfterPhotos = Array.from(new Set(afterPhotos));
      for (const uri of uniqueAfterPhotos) {
        if (!uri.startsWith("http")) {
          await JobService.uploadTicketImage(jobId, uri, "AFTER");
        }
      }

      // 2. Complete the job (skip if already completed to prevent API rejection errors)
      if (job?.status === "IN_PROGRESS") {
        await completeJobMutation.mutateAsync({
          ticketNo: jobId,
          payload: {
            beforePhotos: job?.beforePhotos ?? [],
            afterPhotos: uniqueAfterPhotos,
            customerSignature: "captured",
            workNotes: workNotes + (remarks.trim() ? ` | Remarks: ${remarks}` : ""),
            duration: liveDuration || "—",
            lat: gpsCoords?.lat ?? 28.6139,
            lng: gpsCoords?.lng ?? 77.2090,
            sparePartsUsed: completionSpareParts.map((p) => ({
              sparePartId: p.sparePartId,
              quantity: p.quantity,
              warrantyStatus: p.warrantyStatus!,
            })),
          },
        });
      }

      queryClient.invalidateQueries({ queryKey: ["ticketDetails", jobId] });
      queryClient.invalidateQueries({ queryKey: ["technicianTickets"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "details", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "technician", "list"] });
      queryClient.invalidateQueries({ queryKey: ["amc"] });
      queryClient.invalidateQueries({ queryKey: ["amcSubscriptionDetails"] });

      await refetch();
      setCompleteStep(2);
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to complete ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  // NEW DECOUPLED PAYMENT SUBMIT
  const handlePaymentSubmit = async () => {
    const finalAmountToCollect = paymentPreview ? paymentPreview.grandTotal : amount;
    if (finalAmountToCollect <= 0) {
      showAlert("Amount Required", "Please enter a valid payment amount.");
      return;
    }

    for (const item of extraCharges) {
      const name = item.name.trim();
      const val = parseFloat(item.amountStr);
      const isFullyEmpty = name === "" && item.amountStr.trim() === "";
      if (isFullyEmpty) {
        continue;
      }
      if (name !== "" && (isNaN(val) || val <= 0)) {
        showAlert("Validation Error", `Please enter a valid amount greater than 0 for extra charge: "${name}"`);
        return;
      }
      if (name === "" && !isNaN(val) && val > 0) {
        showAlert("Validation Error", `Please enter a charge name for the amount: ${currencySymbol}${item.amountStr}`);
        return;
      }
    }

    const validateTransactionId = (val: string): boolean => {
      const trimmed = val.trim();
      if (!trimmed) return false;
      const regex = /^[a-zA-Z0-9]{8,35}$/;
      return regex.test(trimmed);
    };

    if (paymentMode === "UPI") {
      if (!paymentConfig || !paymentConfig.upiId) {
        showAlert("UPI Not Configured", "UPI payment is not configured. Please select CASH payment mode.");
        return;
      }
      const trimmedTxn = transactionId.trim();
      if (!trimmedTxn) {
        setTransactionIdError("Please enter a valid UPI transaction ID.");
        showAlert("Transaction ID Required", "Please enter a valid UPI transaction ID.");
        return;
      }
      if (!validateTransactionId(trimmedTxn)) {
        setTransactionIdError("Please enter a valid UPI transaction ID.");
        showAlert("Invalid Transaction ID", "Please enter a valid UPI transaction ID.");
        return;
      }
    }
    if (!paymentConfirmed) {
      showAlert("Confirm Payment", "Please toggle the payment confirmation before submitting.");
      return;
    }

    const sparePartsValidation = validateSparePartDrafts(paymentSpareParts);
    if (sparePartsValidation) {
      setPaymentSparePartsInvalid(sparePartsValidation.invalidIds);
      showAlert("Spare Parts Incomplete", sparePartsValidation.message);
      return;
    }
    setPaymentSparePartsInvalid(new Set());

    const warrantyParts = paymentSpareParts
      .filter((p) => p.warrantyStatus === "WARRANTY")
      .map((p) => ({ sparePartId: p.sparePartId, quantity: p.quantity }));
    const nonWarrantyParts = paymentSpareParts
      .filter((p) => p.warrantyStatus === "OUT_OF_WARRANTY")
      .map((p) => ({ sparePartId: p.sparePartId, quantity: p.quantity }));

    setSubmitting(true);
    try {
      // 3. Collect payment
      const payResult = await collectPaymentMutation.mutateAsync({
        ticketNo: jobId,
        payload: {
          serviceCharge: base,
          labourCharge: labour,
          additionalCharge: backendAdditionalCharge,
          discount: discountAmount,
          warrantyParts,
          nonWarrantyParts,
          method: paymentMode,
        },
      });



      queryClient.invalidateQueries({ queryKey: ["ticketDetails", jobId] });
      queryClient.invalidateQueries({ queryKey: ["technicianTickets"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "details", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "technician", "list"] });
      queryClient.invalidateQueries({ queryKey: ["technicianInvoices"] });

      setCompleteFormVisible(false);
      await refetch();

      // Go directly to Invoice Screen
      navigation.replace("InvoiceGenerate", {
        jobId: jobId,
        ticketNo: job?.ticketNo ?? jobId,
        amount: payResult.grandTotal ?? 0,
        paymentMethod: paymentMode,
        invoiceNo: payResult.invoiceNumber,
        invoiceSubtotal: payResult.subtotal,
        invoiceGstAmount: payResult.gstAmount,
        invoiceGstPercent: payResult.gstPercent,
        invoiceTotal: payResult.grandTotal,
        invoiceGeneratedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to collect payment.");
    } finally {
      setSubmitting(false);
    }
  };



  const openPhone = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const openMaps = (address: string) => {
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader showBack onBackPress={() => navigation.goBack()} title="Ticket Details" />
        <AppLoader message="Loading ticket details..." />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader showBack onBackPress={() => navigation.goBack()} title="Error" />
        <View style={styles.errorContent}>
          <Text style={{ color: theme.colors.textMuted }}>Job ticket not found.</Text>
        </View>
      </View>
    );
  }

  const getActiveStep = (status: string) => {
    switch (status) {
      case "ASSIGNED":
      case "NEW_TICKET":
        return 0;
      case "ACCEPTED":
        return 1;
      case "TRAVELLING":
        return 2;
      case "REACHED_LOCATION":
        return 3;
      case "IN_PROGRESS":
      case "PENDING":
        return 4;
      case "COMPLETED":
        return 5;
      case "TICKET_CLOSED":
      case "INVOICE_GENERATED":
      case "CANCELLED":
        return 6;
      default:
        return 0;
    }
  };

  const parseDescriptionAndNotes = (desc: string) => {
    if (!desc) return { cleanedDescription: "", notes: [] as string[] };
    const parts = desc.split(/Image Notes\s*:\s*/i);
    const cleanedDescription = parts[0].replace(/\n+$/, "").trim();
    const notes = parts.slice(1).map(p => p.trim());
    return { cleanedDescription, notes };
  };

  const { cleanedDescription, notes } = parseDescriptionAndNotes(job.description);

  const formatWarrantyDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const activeStep = getActiveStep(job.status);
  const steps = ["Assigned", "Accepted", "Travel", "Reached", "Working", "Completed", "Closed"];

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case "URGENT":
      case "HIGH":
        return theme.colors.danger;
      case "MEDIUM":
        return theme.colors.warning;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardVerticalOffset={64}
    >
      <AppHeader showBack onBackPress={() => navigation.goBack()} title={`Ticket: ${job.ticketNo}`} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Service Details Card */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Service Details</Text>
        <AppCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.ticketNo, { color: theme.colors.textMuted }]}>{job.ticketNo}</Text>
          </View>
          <Text
            style={[
              styles.jobTitle,
              { color: theme.colors.text, fontSize: theme.typography.fontSize.lg, fontWeight: "700" },
            ]}
          >
            {job.service}
          </Text>

          <View style={styles.descContainer}>
            <Text style={[styles.descTitle, { color: theme.colors.text }]}>Description</Text>
            <Text style={[styles.descBody, { color: theme.colors.text }]}>
              {cleanedDescription}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.colors.success}12` }]}>
              <Calendar size={18} color={theme.colors.success} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Scheduled Time</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {job.scheduledDate} | {job.scheduledTime}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}12` }]}>
              <Tag size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Category</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {job.category || "—"}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}12` }]}>
              <ShieldCheck size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingRight: 8 }}>
                <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Asset Information</Text>
                {(() => {
                  if (!job.customerAsset) return null;
                  if (!job.customerAsset.warrantyExpiresAt) {
                    return (
                      <View style={[styles.warrantyBadge, { backgroundColor: "#9ca3af" }]}>
                        <Text style={styles.warrantyBadgeText}>Warranty Unknown</Text>
                      </View>
                    );
                  }
                  const status = getWarrantyStatus(job.customerAsset.warrantyExpiresAt);
                  return (
                    <View style={[styles.warrantyBadge, { backgroundColor: status.badgeBg }]}>
                      <Text style={styles.warrantyBadgeText}>{status.label}</Text>
                    </View>
                  );
                })()}
              </View>
              <Text style={[styles.infoValue, { color: theme.colors.text, fontWeight: "700" }]}>
                {job.customerAsset?.name || "No Asset Linked"}
              </Text>
              {job.customerAsset ? (
                <>
                  {(job.customerAsset.brand || job.customerAsset.model) ? (
                    <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 2 }}>
                      {job.customerAsset.brand ?? "—"} · {job.customerAsset.model ?? "—"}
                    </Text>
                  ) : null}
                  {job.customerAsset.serialNumber ? (
                    <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 1 }}>
                      S/N: {job.customerAsset.serialNumber}
                    </Text>
                  ) : null}
                  {job.customerAsset.warrantyExpiresAt ? (
                    <View style={{ marginTop: 6 }}>
                      <Text style={[styles.infoLabel, { color: theme.colors.textMuted, fontSize: 10 }]}>Warranty Expires</Text>
                      <Text style={[styles.infoValue, { color: theme.colors.text, fontSize: 13, fontWeight: "600", marginTop: 2 }]}>
                        {formatWarrantyDate(job.customerAsset.warrantyExpiresAt)}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          </View>
        </AppCard>

        {/* AMC Coverage Card — only rendered when this ticket is billed under an AMC contract */}
        {job.isAmcCovered && job.amcStatus ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>AMC Coverage</Text>
            <AppCard style={styles.card}>
              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: `${theme.colors.success}12` }]}>
                  <ShieldCheck size={18} color={theme.colors.success} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Plan</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text, fontWeight: "700" }]}>
                    {job.amcStatus.planName}
                  </Text>
                </View>
                <AppBadge label="AMC JOB" variant="success" />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: `${theme.colors.success}12` }]}>
                  <CheckCircle2 size={18} color={theme.colors.success} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Status</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>{job.amcStatus.status}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: `${theme.colors.success}12` }]}>
                  <Tag size={18} color={theme.colors.success} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Remaining Visits</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text, fontWeight: "700" }]}>
                    {job.amcStatus.remainingVisits}
                  </Text>
                </View>
              </View>
            </AppCard>
          </>
        ) : null}

        {/* Customer Details Card */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Customer Details</Text>
        <AppCard style={styles.card}>
          <Text style={[styles.customerName, { color: theme.colors.text, fontWeight: "600", fontSize: 16, marginBottom: 12 }]}>
            {job.customerName}
          </Text>

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}12` }]}>
              <MapPin size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Service Address</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text, paddingRight: 8 }]}>
                {job.address}
              </Text>
            </View>
            <AppButton
              title="Map"
              onPress={() => openMaps(job.address)}
              variant="outline"
              size="sm"
              icon={<NavigationIcon size={12} color={theme.colors.primary} />}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.colors.success}12` }]}>
              <Phone size={18} color={theme.colors.success} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Mobile Phone</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {job.customerMobile}
              </Text>
            </View>
            <AppButton
              title="Call"
              onPress={() => openPhone(job.customerMobile)}
              variant="outline"
              size="sm"
              icon={<Phone size={12} color={theme.colors.primary} />}
            />
          </View>

          {!!job.customerAlternatePhone && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: `#f59e0b12` }]}>
                  <PhoneCall size={18} color="#f59e0b" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Alternate Phone</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {job.customerAlternatePhone}
                  </Text>
                </View>
                <AppButton
                  title="Call"
                  onPress={() => openPhone(job.customerAlternatePhone!)}
                  variant="outline"
                  size="sm"
                  icon={<Phone size={12} color={theme.colors.primary} />}
                />
              </View>
            </>
          )}

          {!!job.customerEmail && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: `#8b5cf612` }]}>
                  <Mail size={18} color="#8b5cf6" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Email Address</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {job.customerEmail}
                  </Text>
                </View>
              </View>
            </>
          )}
        </AppCard>

        {/* Customer Attached Media */}
        {job.images && job.images.length > 0 && job.status !== "COMPLETED" && job.status !== "TICKET_CLOSED" && job.status !== "INVOICE_GENERATED" && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Attached Media</Text>
            <View style={{ gap: 16, marginVertical: 12 }}>
              {job.images.map((imgUrl, index) => {
                const isVideo = isVideoUrl(imgUrl);
                const note = notes[index];
                const hasNote = note && note.trim() !== "";
                return (
                  <View key={index} style={{ flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                    {isVideo ? (
                      <Pressable
                        onPress={() => Linking.openURL(imgUrl)}
                        style={[styles.photoThumbnail, {
                          backgroundColor: "#0f172a",
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: theme.colors.borderLight,
                        }]}
                      >
                        <Play size={24} color="#ffffff" fill="#ffffff" />
                        <Text style={{ fontSize: 9, color: "#ffffff", fontWeight: "700", marginTop: 4 }}>Play Video</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => Linking.openURL(imgUrl)}
                        style={({ pressed }) => [
                          styles.photoThumbnail,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Image
                          source={{ uri: imgUrl }}
                          style={{ width: "100%", height: "100%", borderRadius: 8 }}
                        />
                      </Pressable>
                    )}
                    {hasNote ? (
                      <View style={{ marginTop: 2, paddingLeft: 4 }}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textMuted, fontSize: 10, marginBottom: 2 }]}>Image Notes</Text>
                        <Text style={[styles.infoValue, { color: theme.colors.text, fontSize: 13 }]}>
                          {note}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Dynamic Action Controls */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Execution Controls</Text>

        {/* 1. ASSIGNED / NEW_TICKET */}
        {(job.status === "ASSIGNED" || job.status === "NEW_TICKET") && (
          !isCheckedIn ? (
            <Pressable onPress={() => navigation.navigate("TechnicianHome")}>
              <AppCard style={styles.card}>
                <Text style={[styles.actionCardTitle, { color: theme.colors.text }]}>Pending Acceptance</Text>
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: `${theme.colors.danger}08`,
                  borderWidth: 1,
                  borderColor: `${theme.colors.danger}20`,
                  marginTop: 8,
                }}>
                  <AlertCircle size={18} color={theme.colors.danger} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontSize: 12, color: theme.colors.danger, fontWeight: "600", lineHeight: 16 }}>
                      Login to accept this job.
                    </Text>
                  </View>
                </View>
              </AppCard>
            </Pressable>
          ) : (
            <AppCard style={styles.card}>
              <Text style={[styles.actionCardTitle, { color: theme.colors.text }]}>Pending Acceptance</Text>
              <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 16 }}>
                Review customer details and accept this ticket to start the execution flow.
              </Text>
              <View style={styles.btnRow}>
                <AppButton
                  title="Reject"
                  variant="outline"
                  onPress={() => {
                    setSelectedRejectReason("");
                    setRejectReasonText("");
                    setRejectFormVisible(true);
                  }}
                  style={{ flex: 1, borderColor: theme.colors.danger }}
                  textStyle={{ color: theme.colors.danger }}
                />
                <AppButton
                  title="Accept Ticket"
                  onPress={() => handleStatusChange("ACCEPTED")}
                  loading={updateStatusMutation.isPending}
                  style={{ flex: 1.5 }}
                />
              </View>
            </AppCard>
          )
        )}

        {/* 2. ACCEPTED */}
        {job.status === "ACCEPTED" && (
          <AppCard style={styles.card}>
            <Text style={[styles.actionCardTitle, { color: theme.colors.text }]}>Ticket Accepted</Text>
            <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 16 }}>
              You have accepted the ticket. Tap below when you start travelling to the client site.
            </Text>
            <AppButton
              title="Start Travel"
              onPress={() => handleStatusChange("TRAVELLING")}
              loading={updateStatusMutation.isPending}
            />
          </AppCard>
        )}

        {/* 2.5. TRAVELLING */}
        {job.status === "TRAVELLING" && (
          <AppCard style={styles.card}>
            <Text style={[styles.actionCardTitle, { color: theme.colors.text }]}>Travelling to Site</Text>
            <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 16 }}>
              You are en route to the client's location. Tap below to record site arrival.
            </Text>
            <AppButton
              title="Reach Location"
              onPress={() => setReachFormVisible(true)}
              loading={updateStatusMutation.isPending}
            />
          </AppCard>
        )}

        {/* 3. REACHED */}
        {job.status === "REACHED_LOCATION" && (
          <AppCard style={styles.card}>
            <Text style={[styles.actionCardTitle, { color: theme.colors.text }]}>Reached Site Location</Text>
            <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 16 }}>
              You have reached the client's location. Tap below to capture site photos and start work.
            </Text>
            <AppButton
              title="Begin Job Execution"
              onPress={() => setStartJobFormVisible(true)}
            />
          </AppCard>
        )}

        {/* 4. IN_PROGRESS */}
        {job.status === "IN_PROGRESS" && (
          <AppCard style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={[styles.actionCardTitle, { color: theme.colors.text, marginBottom: 0 }]}>Job in Progress</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success }} />
                <Text style={{ fontSize: 12, color: theme.colors.success, fontWeight: "600" }}>ACTIVE</Text>
              </View>
            </View>

            <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 14 }}>
              Job execution is active. You can track work duration and complete or pause the job below:
            </Text>

            {/* Inline Timer Container */}
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: `${theme.colors.success}08`,
                borderWidth: 1.5,
                borderColor: theme.colors.success,
                borderRadius: 12,
                paddingVertical: 18,
                paddingHorizontal: 12,
                marginVertical: 14,
                gap: 6,
              }}
            >
              <Clock size={24} color={theme.colors.success} />
              <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Work Duration In Progress
              </Text>
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: "800",
                  color: theme.colors.success,
                  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                  letterSpacing: 1.5,
                }}
              >
                {liveDuration || "00:00:00"}
              </Text>
            </View>

            <View style={styles.btnRow}>
              <AppButton
                title="Mark Pending"
                variant="outline"
                onPress={() => {
                  setSelectedPendingReason("");
                  setPendingNotes("");
                  setPendingPhotos([]);
                  setPendingFormVisible(true);
                }}
                style={{ flex: 1, borderColor: theme.colors.warning }}
                textStyle={{ color: theme.colors.warning }}
                icon={<AlertTriangle size={14} color={theme.colors.warning} />}
              />
              <AppButton
                title="Complete Job"
                onPress={() => {
                  setCompleteStep(1);
                  setCompleteFormVisible(true);
                }}
                variant="success"
                style={{ flex: 1.5 }}
                icon={<CheckCircle size={14} color="#ffffff" />}
              />
            </View>
          </AppCard>
        )}

        {/* 5. COMPLETED */}
        {job.status === "COMPLETED" && (
          <AppCard style={styles.card}>
            <Text style={[styles.actionCardTitle, { color: theme.colors.text }]}>Service Completed</Text>
            <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 16 }}>
              Job execution is complete. Please collect payment and generate the customer invoice.
            </Text>
            <AppButton
              title="Collect Payment"
              variant="success"
              onPress={() => {
                setCompleteStep(2);
                setCompleteFormVisible(true);
              }}
            />
          </AppCard>
        )}

        {/* 6. TICKET_CLOSED / INVOICE_GENERATED — real persisted invoice/payment fields only,
             never back-calculated (there used to be a base-price-minus-subtotal approximation
             here to guess a spare-parts amount; that's gone now that the backend exposes the
             real per-line invoice fields). */}
        {(job.status === "TICKET_CLOSED" || job.status === "INVOICE_GENERATED") && (() => {
          const invDate = job.invoiceGeneratedAt ? new Date(job.invoiceGeneratedAt).toLocaleDateString("en-IN") : "—";
          const invNum = job.invoiceNo || `INV-${job.ticketNo}`;

          return (
            <View>
              <AppCard style={[styles.card, { marginBottom: 16 }]}>
                <View style={[styles.successBanner, { backgroundColor: `${theme.colors.success}10`, borderColor: theme.colors.success }]}>
                  <CheckCircle2 size={24} color={theme.colors.success} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.success, fontWeight: "700", fontSize: 14 }}>
                      Ticket Closed
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 4 }}>
                      Invoice successfully generated.
                    </Text>
                  </View>
                </View>
              </AppCard>

              <PaymentSummaryCard
                invoiceNumber={invNum}
                ticketNumber={job.ticketNo}
                customerName={job.customerName}
                paymentMode={job.paymentMethod ?? "—"}
                paymentStatus={job.paymentStatus ?? "Collected"}
                invoiceDate={invDate}
                serviceCharge={job.invoiceServiceCharge ?? 0}
                serviceChargeWaived={job.paymentServiceChargeWaived}
                labourCharge={job.invoiceLabourCharge ?? 0}
                labourChargeWaived={job.paymentLabourChargeWaived}
                sparePartsAmount={job.invoiceSparePartsAmount ?? 0}
                additionalCharge={job.invoiceAdditionalCharge}
                discount={job.invoiceDiscount}
                subtotal={job.invoiceSubtotal}
                gstPercent={job.invoiceGstPercent}
                gstAmount={job.invoiceGstAmount}
                grandTotal={job.invoiceTotal ?? job.paymentCollection ?? 0}
                currency={currencySymbol}
                onViewInvoice={() => navigation.navigate("InvoiceGenerate", {
                  jobId: job.id,
                  ticketNo: job.ticketNo,
                  amount: job.paymentCollection ?? 0,
                  paymentMethod: job.paymentMethod ?? "CASH",
                  invoiceNo: job.invoiceNo ?? `INV-${job.ticketNo}`,
                  invoiceSubtotal: job.invoiceSubtotal,
                  invoiceGstAmount: job.invoiceGstAmount,
                  invoiceGstPercent: job.invoiceGstPercent,
                  invoiceTotal: job.invoiceTotal,
                  invoiceGeneratedAt: job.invoiceGeneratedAt,
                })}
              />
            </View>
          );
        })()}

        {/* 8. PENDING / RESCHEDULED */}
        {job.status === "PENDING" && !rescheduleVisible && (
          <AppCard style={styles.card}>
            <View style={[styles.alertBox, { backgroundColor: `${theme.colors.danger}10`, borderColor: theme.colors.danger, marginBottom: 16 }]}>
              <AlertCircle size={20} color={theme.colors.danger} />
              <Text style={{ color: theme.colors.text, fontSize: 13, flex: 1 }}>
                Reason: <Text style={{ fontWeight: "700" }}>{job.pendingReason}</Text>
              </Text>
            </View>
            <View style={styles.btnRow}>
              <AppButton
                title="Resume Work"
                onPress={() => handleStatusChange("IN_PROGRESS")}
                style={{ flex: 1.5 }}
                loading={updateStatusMutation.isPending}
              />
              <AppButton
                title="Complete Job"
                variant="outline"
                onPress={() => {
                  setCompleteStep(1);
                  setCompleteFormVisible(true);
                }}
                style={{ flex: 1, borderColor: theme.colors.success }}
                textStyle={{ color: theme.colors.success }}
              />
            </View>
          </AppCard>
        )}

        {job.status === "RESCHEDULED" && !rescheduleVisible && (
          <AppCard style={styles.card}>
            <View style={[styles.alertBox, { backgroundColor: `${theme.colors.warning}10`, borderColor: theme.colors.warning }]}>
              <Calendar size={20} color={theme.colors.warning} />
              <Text style={{ color: theme.colors.text, fontSize: 13, flex: 1 }}>
                Rescheduled date: <Text style={{ fontWeight: "700" }}>{job.nextVisitDate}</Text>
              </Text>
            </View>
            <AppButton
              title="Resume Work Now"
              onPress={() => handleStatusChange("IN_PROGRESS")}
              style={{ marginTop: 16 }}
              loading={updateStatusMutation.isPending}
            />
          </AppCard>
        )}

        {/* Reschedule Visit Date Input Form */}
        {rescheduleVisible && (
          <AppCard style={styles.formCard}>
            <Text style={[styles.formTitle, { color: theme.colors.text }]}>Reschedule Ticket</Text>
            <AppInput
              label="Next Visit Date (YYYY-MM-DD)"
              placeholder="e.g. 2026-06-25"
              value={nextVisitDate}
              onChangeText={setNextVisitDate}
            />
            <View style={styles.btnRow}>
              <AppButton title="Cancel" variant="outline" onPress={() => setRescheduleVisible(false)} style={{ flex: 1 }} />
              <AppButton title="Reschedule" onPress={handleRescheduleSubmit} loading={rescheduleJobMutation.isPending} style={{ flex: 1.5 }} />
            </View>
          </AppCard>
        )}

        {/* Media section moved above execution controls */}

        {/* Upload Status State Overlay */}
        {uploadingImage && (
          <AppLoader message="Uploading image to server..." />
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal visible={rejectFormVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%", alignItems: "center" }}>
            <AppCard style={styles.modalContent}>
              <Text style={[styles.formTitle, { color: theme.colors.text }]}>Reject Ticket</Text>
              <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 12 }}>
                Please select a reason for rejecting this service ticket:
              </Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {QUICK_REASONS.map((reason) => {
                  const isSel = selectedRejectReason === reason;
                  return (
                    <Pressable
                      key={reason}
                      onPress={() => {
                        setSelectedRejectReason(reason);
                        if (reason !== "Other") setRejectReasonText("");
                      }}
                      style={[
                        styles.reasonOption,
                        {
                          borderColor: isSel ? theme.colors.danger : theme.colors.borderLight,
                          backgroundColor: isSel ? `${theme.colors.danger}08` : theme.colors.card,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: isSel ? "700" : "500" }}>{reason}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setSelectedRejectReason("Other")}
                  style={[
                    styles.reasonOption,
                    {
                      borderColor: selectedRejectReason === "Other" ? theme.colors.danger : theme.colors.borderLight,
                      backgroundColor: selectedRejectReason === "Other" ? `${theme.colors.danger}08` : theme.colors.card,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: selectedRejectReason === "Other" ? "700" : "500" }}>Other Reason</Text>
                </Pressable>
              </View>

              {selectedRejectReason === "Other" && (
                <AppInput
                  label="Describe Reason"
                  placeholder="Type rejection notes here..."
                  value={rejectReasonText}
                  onChangeText={setRejectReasonText}
                  multiline
                  numberOfLines={3}
                />
              )}

              <View style={styles.btnRow}>
                <AppButton title="Cancel" variant="outline" onPress={() => setRejectFormVisible(false)} style={{ flex: 1 }} />
                <AppButton title="Submit Reject" variant="danger" onPress={handleRejectSubmit} loading={rejectJobMutation.isPending} style={{ flex: 1.5 }} />
              </View>
            </AppCard>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Reach Location Modal */}
      <Modal visible={reachFormVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <AppCard style={styles.modalContent}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <MapPin size={24} color={theme.colors.primary} />
              <Text style={[styles.formTitle, { color: theme.colors.text, marginBottom: 0 }]}>Mark Reach Location</Text>
            </View>

            <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 16 }}>
              Confirm your arrival at the client's destination:
            </Text>

            <View style={[styles.alertBox, { backgroundColor: `${theme.colors.primary}08`, borderColor: theme.colors.borderLight, marginBottom: 16 }]}>
              <MapPin size={18} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.text, fontSize: 13, flex: 1 }}>
                Destination: <Text style={{ fontWeight: "700" }}>{job.address}</Text>
              </Text>
            </View>

            <View style={{ padding: 12, borderRadius: 8, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, textTransform: "uppercase", marginBottom: 4 }}>GPS Status</Text>
              {gpsLoading ? (
                <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>Acquiring coordinates address...</Text>
              ) : gpsError ? (
                <Text style={{ fontSize: 13, color: theme.colors.danger }}>{gpsError}</Text>
              ) : locationName ? (
                <Text style={{ fontSize: 13, color: theme.colors.text, fontWeight: "600" }}>{locationName}</Text>
              ) : (
                <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>Waiting for location...</Text>
              )}
            </View>

            <View style={styles.btnRow}>
              <AppButton title="Cancel" variant="outline" onPress={() => setReachFormVisible(false)} style={{ flex: 1 }} />
              <AppButton
                title="Mark as Reached"
                onPress={handleReachSubmit}
                loading={updateStatusMutation.isPending}
                disabled={updateStatusMutation.isPending}
                style={{ flex: 1.5 }}
              />
            </View>
          </AppCard>
        </View>
      </Modal>

      {/* Start Job Modal */}
      <Modal visible={startJobFormVisible} animationType="slide" transparent>
        <ScrollView
          style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)" }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <AppCard style={styles.modalContent}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <PlayCircle size={24} color={theme.colors.success} />
              <Text style={[styles.formTitle, { color: theme.colors.text, marginBottom: 0 }]}>Begin Job Execution</Text>
            </View>

            <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 14 }}>
              Before starting execution, capture at least 1 photo of the site condition:
            </Text>

            {/* Photos Grid */}
            {beforePhotos.length > 0 && (
              <View style={styles.photoGrid}>
                {beforePhotos.map((uri, idx) => (
                  <Pressable key={idx} onLongPress={() => removeBeforePhoto(idx)} style={styles.photoWrapper}>
                    <Image source={{ uri }} style={styles.photoThumbnail} />
                    <View style={[styles.photoIndex, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.photoIndexText}>{idx + 1}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Photo Upload Actions */}
            <View style={styles.photoBtnRow}>
              <Pressable
                onPress={pickBeforeFromCamera}
                style={({ pressed }) => [
                  styles.photoActionBtn,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <Camera size={20} color={theme.colors.primary} />
                <Text style={[styles.photoActionLabel, { color: theme.colors.text, fontSize: 12 }]}>Take Photo</Text>
              </Pressable>

              <Pressable
                onPress={pickBeforeFromGallery}
                style={({ pressed }) => [
                  styles.photoActionBtn,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <ImagePlus size={20} color={theme.colors.primary} />
                <Text style={[styles.photoActionLabel, { color: theme.colors.text, fontSize: 12 }]}>From Gallery</Text>
              </Pressable>
            </View>

            {beforePhotos.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f0fdf4",
                  borderWidth: 1,
                  borderColor: "#dcfce7",
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  marginBottom: 18,
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} color="#22c55e" />
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#166534" }}>
                  {beforePhotos.length} Site Photo{beforePhotos.length > 1 ? "s" : ""} Selected
                </Text>
              </View>
            )}

            <View style={styles.btnRow}>
              <AppButton title="Cancel" variant="outline" onPress={() => setStartJobFormVisible(false)} style={{ flex: 1 }} />
              <AppButton
                title="Start Job"
                variant="success"
                onPress={handleStartJob}
                loading={savePhotosMutation.isPending}
                disabled={beforePhotos.length === 0}
                style={{ flex: 1.5 }}
              />
            </View>
          </AppCard>
        </ScrollView>
      </Modal>

      {/* Early Start Warning Modal */}
      <AppConfirmModal
        visible={earlyStartModalVisible}
        title="Early Start Warning"
        message={`You are starting this job before the scheduled visit time (${job.scheduledDate} · ${job.scheduledTime}).\n\nAre you sure you want to proceed and start work now?`}
        confirmText="Yes, Start Now"
        cancelText="Cancel"
        confirmVariant="warning"
        onConfirm={async () => {
          setEarlyStartModalVisible(false);
          await startJobMutationCall();
        }}
        onCancel={() => setEarlyStartModalVisible(false)}
      />

      {/* Mark Pending Modal */}
      <Modal visible={pendingFormVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", alignItems: "center", padding: 16 }}>
          <AppCard style={[styles.modalContent, { width: "100%", maxWidth: 420, maxHeight: "90%" }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }} style={{ width: "100%" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <AlertTriangle size={24} color={theme.colors.warning} />
                <Text style={[styles.formTitle, { color: theme.colors.text, marginBottom: 0 }]}>Mark as Pending</Text>
              </View>

              <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 14 }}>
                Select a reason to flag this service ticket as pending:
              </Text>

              {/* Reasons */}
              <View style={{ gap: 8, marginBottom: 16 }}>
                {PENDING_REASONS.map((reason) => {
                  const isSel = selectedPendingReason === reason;
                  return (
                    <Pressable
                      key={reason}
                      onPress={() => setSelectedPendingReason(reason)}
                      style={[
                        styles.reasonOption,
                        {
                          borderColor: isSel ? theme.colors.warning : theme.colors.borderLight,
                          backgroundColor: isSel ? `${theme.colors.warning}06` : theme.colors.card,
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          gap: 12,
                          borderRadius: 10,
                        },
                      ]}
                    >
                      <View style={[styles.radioOuter, { borderColor: isSel ? theme.colors.warning : theme.colors.border }]}>
                        {isSel && <View style={[styles.radioInner, { backgroundColor: theme.colors.warning }]} />}
                      </View>
                      <Text style={{ color: theme.colors.text, fontWeight: isSel ? "700" : "500", fontSize: 13.5, flex: 1 }}>{reason}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Notes */}
              <AppInput
                label="Additional Notes (optional)"
                placeholder="Describe why job is pending..."
                value={pendingNotes}
                onChangeText={setPendingNotes}
                multiline
                numberOfLines={3}
              />

              {/* Photo upload */}
              <Text style={[styles.formLabel, { color: theme.colors.textMuted, marginTop: 8 }]}>Evidence Photos (optional)</Text>
              <View style={[styles.photoGrid, { marginBottom: 12 }]}>
                {pendingPhotos.map((uri, idx) => (
                  <Pressable key={idx} onLongPress={() => removePendingPhoto(idx)} style={styles.photoWrapper}>
                    <Image source={{ uri }} style={styles.photoThumbnail} />
                  </Pressable>
                ))}
                {pendingPhotos.length < 3 && (
                  <Pressable
                    onPress={pickPendingPhoto}
                    style={[styles.addPhotoBtn, { borderColor: theme.colors.border }]}
                  >
                    <Camera size={20} color={theme.colors.textMuted} />
                    <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>Add</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.btnRow}>
                <AppButton title="Cancel" variant="outline" onPress={() => setPendingFormVisible(false)} style={{ flex: 1 }} />
                <AppButton
                  title="Submit Pending"
                  variant="warning"
                  onPress={handlePendingSubmit}
                  loading={markPendingMutation.isPending || uploadingImage}
                  disabled={!selectedPendingReason}
                  style={{ flex: 1.5 }}
                />
              </View>
            </ScrollView>
          </AppCard>
        </View>
      </Modal>

      {/* Complete Job & Payment Collection Modal */}
      <Modal
        visible={completeFormVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (completeStep !== 2) {
            setCompleteFormVisible(false);
          }
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", alignItems: "center", padding: 16 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", maxWidth: 420, maxHeight: "90%" }}
          >
            <AppCard style={{ width: "100%", padding: 16, backgroundColor: theme.colors.background, borderRadius: 16, maxHeight: "100%" }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }} style={{ width: "100%" }}>
                {/* Header */}
                <View style={{ borderBottomWidth: 1, borderColor: theme.colors.borderLight, paddingBottom: 12, marginBottom: 16, flexDirection: "row", alignItems: "center" }}>
                  {completeStep === 2 && (
                    <Pressable onPress={() => setCompleteStep(1)} style={{ marginRight: 10, padding: 4 }}>
                      <ArrowLeft size={20} color={theme.colors.text} />
                    </Pressable>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: theme.colors.text }}>
                      {completeStep === 2 ? "Collect Payment" : "Complete Work Order"}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>
                      Ticket: {job?.ticketNo}
                    </Text>
                  </View>
                </View>

                {/* Step 1: Complete Job Form */}
                {completeStep === 1 && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.primary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 }}>
                      Work Summary & Photos
                    </Text>
                    <View style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderLight, backgroundColor: theme.colors.card }}>
                      <Text style={[styles.formLabel, { color: theme.colors.text, marginTop: 0, fontSize: 13, fontWeight: "600" }]}>
                        Work Summary Notes<Text style={{ color: theme.colors.danger }}> *</Text>
                      </Text>
                      <View style={[styles.textAreaContainer, { borderColor: workNotes ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.card, borderRadius: 10, borderWidth: 1.5, padding: 10, minHeight: 90 }]}>
                        <TextInput
                          value={workNotes}
                          onChangeText={setWorkNotes}
                          placeholder="Detail what was completed and any resolutions..."
                          placeholderTextColor={theme.colors.textLight}
                          multiline
                          numberOfLines={3}
                          style={[styles.textArea, { color: theme.colors.text, fontSize: 14, textAlignVertical: "top" }]}
                        />
                      </View>

                      <Text style={[styles.formLabel, { color: theme.colors.text, marginTop: 18, fontSize: 13, fontWeight: "600" }]}>
                        After Photos<Text style={{ color: theme.colors.danger }}> *</Text>
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 8 }}>At least 1 photo showing completed work is required.</Text>
                      <View style={styles.photoGrid}>
                        {afterPhotos.map((uri, idx) => (
                          <Pressable key={idx} onLongPress={() => removeAfterPhoto(idx)} style={styles.photoWrapper}>
                            <Image source={{ uri }} style={styles.photoThumbnail} />
                            <View style={[styles.photoIndex, { backgroundColor: theme.colors.primary }]}>
                              <Text style={styles.photoIndexText}>{idx + 1}</Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>

                      <View style={styles.photoBtnRow}>
                        <Pressable
                          onPress={pickAfterFromCamera}
                          style={({ pressed }) => [
                            styles.photoActionBtn,
                            { backgroundColor: theme.colors.card, borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 }
                          ]}
                        >
                          <Camera size={20} color={theme.colors.primary} />
                          <Text style={[styles.photoActionLabel, { color: theme.colors.text, fontSize: 12 }]}>Take Photo</Text>
                        </Pressable>

                        <Pressable
                          onPress={pickAfterFromGallery}
                          style={({ pressed }) => [
                            styles.photoActionBtn,
                            { backgroundColor: theme.colors.card, borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 }
                          ]}
                        >
                          <ImagePlus size={20} color={theme.colors.primary} />
                          <Text style={[styles.photoActionLabel, { color: theme.colors.text, fontSize: 12 }]}>From Gallery</Text>
                        </Pressable>
                      </View>

                      {/* Work time & GPS verified badge */}
                      <View style={{ marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <ShieldCheck size={28} color="#22c55e" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: "#166534", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Work Time & GPS Verified
                          </Text>
                          <Text style={{ fontSize: 13, color: "#14532d", fontWeight: "600", marginTop: 2 }}>
                            Duration: {duration}
                          </Text>
                          {gpsCoords ? (
                            <Text style={{ fontSize: 12, color: "#166534", marginTop: 1, fontWeight: "500" }}>
                              GPS Lock: {locationName || `${gpsCoords.lat.toFixed(6)}, ${gpsCoords.lng.toFixed(6)}`}
                            </Text>
                          ) : (
                            <Text style={{ fontSize: 12, color: theme.colors.warning, marginTop: 1, fontWeight: "500" }}>
                              Acquiring GPS Lock...
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Spare Parts Used */}
                      <SparePartsSection
                        subCategoryId={job?.subCategoryId}
                        items={completionSpareParts}
                        onChange={setCompletionSpareParts}
                        title="Spare Parts Used"
                        subtitle="Optional — tag each part's warranty status if any were used."
                        invalidIds={completionSparePartsInvalid}
                      />
                    </View>
                  </View>
                )}

                {/* Step 2: Payment UI */}
                {completeStep === 2 && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.primary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 }}>
                      Billing & Payment
                    </Text>
                    <View style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderLight, backgroundColor: theme.colors.card }}>

                      {/* Service Charge Input */}
                      <Text style={[styles.formLabel, { color: theme.colors.text, marginTop: 0, fontSize: 13, fontWeight: "600" }]}>Service Charge ({currencySymbol})</Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "#f8fafc",
                          borderWidth: 1.5,
                          borderColor: theme.colors.borderLight,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          height: 46,
                          gap: 8,
                          marginTop: 4
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: "600", color: theme.colors.textMuted }}>{currencySymbol}</Text>
                        <TextInput
                          value={amountStr}
                          editable={false}
                          placeholder="0.00"
                          style={{ flex: 1, fontSize: 14, fontWeight: "600", color: theme.colors.textMuted }}
                        />
                      </View>

                      {/* Labour Charge Input (Read-only, fetched from backend) */}
                      {labour > 0 && (
                        <>
                          <Text style={[styles.formLabel, { color: theme.colors.text, marginTop: 16, fontSize: 13, fontWeight: "600" }]}>Labour Charge ({currencySymbol})</Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              backgroundColor: "#f8fafc",
                              borderWidth: 1.5,
                              borderColor: theme.colors.borderLight,
                              borderRadius: 10,
                              paddingHorizontal: 12,
                              height: 46,
                              gap: 8,
                              marginTop: 4
                            }}
                          >
                            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.colors.textMuted }}>{currencySymbol}</Text>
                            <TextInput
                              value={labourChargeStr}
                              editable={false}
                              placeholder="0.00"
                              style={{ flex: 1, fontSize: 14, fontWeight: "600", color: theme.colors.textMuted }}
                            />
                          </View>
                        </>
                      )}

                      {/* Read-Only Spare Parts Summary */}
                      {completionSpareParts.length > 0 && (
                        <View style={{ marginTop: 16, marginBottom: 4 }}>
                          <Text style={[styles.formLabel, { color: theme.colors.text, marginTop: 0, marginBottom: 8, fontSize: 13, fontWeight: "600" }]}>
                            Spare Parts Used
                          </Text>
                          <View style={{ borderRadius: 10, borderWidth: 1, borderColor: theme.colors.borderLight, backgroundColor: "#f8fafc", padding: 12 }}>
                            {completionSpareParts.map((item, idx) => {
                              const isWarranty = item.warrantyStatus === "WARRANTY";
                              const itemTotal = isWarranty ? 0 : item.unitPrice * item.quantity;
                              return (
                                <View
                                  key={item.localId || idx}
                                  style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    paddingVertical: 6,
                                    borderBottomWidth: idx === completionSpareParts.length - 1 ? 0 : 1,
                                    borderColor: theme.colors.borderLight,
                                  }}
                                >
                                  <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.text }}>{item.partName}</Text>
                                    <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 2 }}>
                                      Qty: {item.quantity} · {currencySymbol}{item.unitPrice.toLocaleString("en-IN")} / unit
                                    </Text>
                                  </View>
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      fontWeight: "700",
                                      color: isWarranty ? theme.colors.success : theme.colors.text,
                                    }}
                                  >
                                    {isWarranty ? "FREE (Warranty)" : `${currencySymbol}${itemTotal.toLocaleString("en-IN")}`}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}



                      {/* Payment Preview — backend-computed breakdown */}
                      {paymentPreview ? (
                        <View style={{ marginTop: 14, marginBottom: 4 }}>
                          <PaymentSummaryCard
                            title="Payment Preview"
                            serviceCharge={paymentPreview.serviceCharge}
                            serviceChargeWaived={paymentPreview.serviceChargeWaived}
                            labourCharge={paymentPreview.labourCharge}
                            labourChargeWaived={paymentPreview.labourChargeWaived}
                            sparePartsAmount={paymentPreview.sparePartsAmount}
                            warrantyPartsValue={paymentPreview.warrantyPartsValue}
                            additionalCharge={paymentPreview.additionalCharge}
                            discount={paymentPreview.discount}
                            subtotal={paymentPreview.subtotal}
                            gstPercent={paymentPreview.gstPercent}
                            gstAmount={paymentPreview.gstAmount}
                            grandTotal={paymentPreview.grandTotal}
                            currency={currencySymbol}
                            spareParts={
                              paymentSpareParts.length > 0
                                ? paymentSpareParts.map((p) => ({
                                  name: p.partName,
                                  quantity: p.quantity,
                                  unitPrice: p.unitPrice,
                                  coverageType: (p.warrantyStatus ?? "OUT_OF_WARRANTY") as "WARRANTY" | "OUT_OF_WARRANTY",
                                }))
                                : undefined
                            }
                          />
                        </View>
                      ) : null}

                      {/* Mode cash/upi */}
                      <Text style={[styles.formLabel, { color: theme.colors.text, marginTop: 18, fontSize: 13, fontWeight: "600" }]}>Payment Mode</Text>
                      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                        <Pressable
                          onPress={() => setPaymentMode("CASH")}
                          style={{
                            flex: 1,
                            height: 48,
                            borderRadius: 8,
                            borderWidth: 2,
                            borderColor: paymentMode === "CASH" ? theme.colors.primary : theme.colors.borderLight,
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: paymentMode === "CASH" ? theme.colors.primary : theme.colors.card,
                          }}
                        >
                          <Text style={{ fontWeight: "800", fontSize: 14, color: paymentMode === "CASH" ? "#ffffff" : theme.colors.textMuted }}>CASH</Text>
                        </Pressable>
                        {paymentConfig?.upiEnabled && (
                          <Pressable
                            onPress={() => setPaymentMode("UPI")}
                            style={{
                              flex: 1,
                              height: 48,
                              borderRadius: 8,
                              borderWidth: 2,
                              borderColor: paymentMode === "UPI" ? theme.colors.primary : theme.colors.borderLight,
                              justifyContent: "center",
                              alignItems: "center",
                              backgroundColor: paymentMode === "UPI" ? theme.colors.primary : theme.colors.card,
                            }}
                          >
                            <Text style={{ fontWeight: "800", fontSize: 14, color: paymentMode === "UPI" ? "#ffffff" : theme.colors.textMuted }}>UPI</Text>
                          </Pressable>
                        )}
                      </View>

                      {paymentMode === "UPI" && (
                        <View style={{ alignItems: "center", marginVertical: 14, padding: 16, backgroundColor: "#ffffff", borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.borderLight }}>
                          {(!paymentConfig || !paymentConfig.upiEnabled) ? (
                            <Text style={{ fontSize: 13, color: theme.colors.danger, fontWeight: "600", textAlign: "center", marginVertical: 20 }}>
                              UPI payment is disabled.
                            </Text>
                          ) : !paymentConfig.upiId ? (
                            <Text style={{ fontSize: 13, color: theme.colors.danger, fontWeight: "600", textAlign: "center", marginVertical: 20 }}>
                              UPI not available.
                            </Text>
                          ) : (
                            <>
                              <View style={{ padding: 12, borderWidth: 1.5, borderColor: theme.colors.primary, borderRadius: 16, borderStyle: "dashed", backgroundColor: "#f8fafc", marginBottom: 10 }}>
                                <QRCode
                                  value={`upi://pay?pa=${paymentConfig.upiId}&pn=${encodeURIComponent(paymentConfig.upiAccountName || "FieldEaze Services")}&am=${paymentPreview ? paymentPreview.grandTotal : amount}&cu=${paymentConfig.currency || "INR"}&tn=ServicePayment`}
                                  size={130}
                                />
                              </View>

                              <Text style={{ fontSize: 12, color: theme.colors.text, fontWeight: "600", textAlign: "center", paddingHorizontal: 10 }}>
                                Scan to Pay {currencySymbol}{(paymentPreview ? paymentPreview.grandTotal : amount).toLocaleString("en-IN")}
                              </Text>

                              {paymentConfig.upiAccountName && (
                                <Text style={{ fontSize: 11, color: theme.colors.text, marginTop: 4, fontWeight: "500", textAlign: "center" }}>
                                  Merchant: {paymentConfig.upiAccountName}
                                </Text>
                              )}

                              {paymentConfig.upiId && (
                                <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 2, textAlign: "center" }}>
                                  UPI ID: {paymentConfig.upiId}
                                </Text>
                              )}
                            </>
                          )}

                          {paymentConfig && paymentConfig.upiId && (
                            <View style={{ width: "100%", marginTop: 16, borderTopWidth: 1, borderColor: theme.colors.borderLight, paddingTop: 14 }}>
                              <Text style={[styles.formLabel, { color: theme.colors.text, marginBottom: 8, marginTop: 0, fontSize: 13, fontWeight: "600" }]}>
                                UPI Transaction ID (8-35 Characters)<Text style={{ color: theme.colors.danger }}> *</Text>
                              </Text>
                              <AppInput
                                placeholder="Enter 12-digit transaction ID"
                                value={transactionId}
                                onChangeText={(val) => {
                                  setTransactionId(val);
                                  setTransactionIdError("");
                                }}
                                error={transactionIdError}
                              />
                            </View>
                          )}
                        </View>
                      )}

                      <Pressable
                        onPress={() => setPaymentConfirmed(!paymentConfirmed)}
                        style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 14, paddingHorizontal: 4 }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: paymentConfirmed ? theme.colors.success : theme.colors.border,
                            backgroundColor: paymentConfirmed ? theme.colors.success : theme.colors.card,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {paymentConfirmed && (
                            <CheckCircle size={14} color="#ffffff" />
                          )}
                        </View>
                        <Text style={{ fontSize: 13, color: theme.colors.text, fontWeight: "600", flex: 1 }}>
                          Confirm payment of {currencySymbol}{(paymentPreview ? paymentPreview.grandTotal : amount).toLocaleString("en-IN")} has been received.
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Bottom Buttons */}
                <View style={[styles.btnRow, { marginTop: 8 }]}>
                  {completeStep !== 2 && (
                    <AppButton title="Cancel" variant="outline" onPress={() => setCompleteFormVisible(false)} style={{ flex: 1 }} />
                  )}
                  <AppButton
                    title={completeStep === 2 ? "Collect Payment" : "Submit & Complete Job"}
                    variant="success"
                    onPress={completeStep === 2 ? handlePaymentSubmit : handleCompleteSubmit}
                    loading={submitting}
                    style={{ flex: completeStep === 2 ? 1 : 1.8 }}
                  />
                </View>
              </ScrollView>
            </AppCard>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Confirmation Dialog Modal */}
      {confirmVisible && confirmConfig && (
        <AppConfirmModal
          visible={confirmVisible}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          cancelText="Cancel"
          confirmVariant={confirmConfig.confirmVariant}
          onConfirm={() => {
            setConfirmVisible(false);
            confirmConfig.onConfirm();
          }}
          onCancel={() => setConfirmVisible(false)}
        />
      )}

      {/* Success Notification Modal */}
      <AppSuccessModal
        visible={successVisible}
        title={successTitle}
        message={successMessage}
        onClose={() => {
          setSuccessVisible(false);
          if (shouldNavigateHome) {
            setShouldNavigateHome(false);
            navigation.navigate("TechnicianHome");
          }
        }}
        autoCloseDelay={2000}
      />
      {/* Payment Success Modal — full backend-returned breakdown, per PAYMENT SUCCESS requirements */}
      <Modal visible={paymentSuccessVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", alignItems: "center", padding: 16 }}>
          <View style={{ width: "100%", maxWidth: 420, maxHeight: "90%" }}>
            <AppCard style={{ width: "100%", padding: 16, backgroundColor: theme.colors.background, borderRadius: 16, maxHeight: "100%" }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <View style={{ alignItems: "center", marginBottom: 16 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: `${theme.colors.success}15`, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <CheckCircle2 size={32} color={theme.colors.success} />
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: "800", color: theme.colors.text }}>Payment Collected ✓</Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>Invoice generated successfully</Text>
                </View>

                {paymentResult ? (
                  <PaymentSummaryCard
                    title="Payment Collected Summary"
                    invoiceNumber={paymentResult.invoiceNumber}
                    paymentMode={paymentMode === "CASH" ? "Cash" : "UPI"}
                    paymentStatus="Collected"
                    invoiceDate={new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    serviceCharge={paymentResult.serviceCharge}
                    serviceChargeWaived={paymentResult.serviceChargeWaived}
                    labourCharge={paymentResult.labourCharge}
                    labourChargeWaived={paymentResult.labourChargeWaived}
                    sparePartsAmount={paymentResult.sparePartsAmount}
                    warrantyPartsValue={paymentResult.warrantyPartsValue}
                    additionalCharge={paymentResult.additionalCharge}
                    discount={paymentResult.discount}
                    subtotal={paymentResult.subtotal}
                    gstPercent={paymentResult.gstPercent}
                    gstAmount={paymentResult.gstAmount}
                    grandTotal={paymentResult.grandTotal}
                    currency={currencySymbol}
                    spareParts={
                      paymentSpareParts.length > 0
                        ? paymentSpareParts.map((p) => ({
                          name: p.partName,
                          quantity: p.quantity,
                          unitPrice: p.unitPrice,
                          coverageType: (p.warrantyStatus ?? "OUT_OF_WARRANTY") as "WARRANTY" | "OUT_OF_WARRANTY",
                        }))
                        : undefined
                    }
                  />
                ) : null}

                <AppButton
                  title="Done"
                  onPress={() => {
                    setPaymentSuccessVisible(false);
                    setPaymentResult(null);
                    navigation.navigate("TechnicianHome");
                  }}
                  style={{ marginTop: 16 }}
                />
              </ScrollView>
            </AppCard>
          </View>
        </View>
      </Modal>

      {/* App Alert Warning Modal */}
      <AppConfirmModal
        visible={alertModalVisible}
        title={alertModalTitle}
        message={alertModalMessage}
        confirmText="Close"
        confirmVariant="warning"
        showCancel={false}
        onConfirm={() => setAlertModalVisible(false)}
        onCancel={() => setAlertModalVisible(false)}
      />
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
  paymentMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  paymentMetaLabel: {
    fontSize: 12,
  },
  paymentMetaValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    marginBottom: 16,
  },
  formCard: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  jobTitle: {
    marginBottom: 6,
  },
  jobDesc: {
    lineHeight: 20,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  customerName: {
    fontSize: 15,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1.5,
    borderRadius: 8,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 8,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginVertical: 12,
  },
  photoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  photoIndex: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  photoIndexText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  methodToggleRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  errorContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stepsCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  stepInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  stepStatusLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stepCurrentText: {
    fontSize: 16,
    fontWeight: "700",
  },
  stepNextText: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  stepLabelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepMinLabel: {
    fontSize: 9,
    textAlign: "center",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ticketNo: {
    fontSize: 13,
    fontWeight: "600",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  infoTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  gpsErrorContainer: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  gpsSuccessContainer: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  gridCol: {
    flex: 1,
  },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
    gap: 8,
  },
  tileIcon: {
    marginRight: 4,
  },
  tileLabel: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tileValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  miniActionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  completeFormCard: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderTopWidth: 4,
    borderTopColor: "#10b981", // Success green
  },
  uploadPlaceholder: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    padding: 20,
    borderRadius: 16,
  },
  bottomSheetContainer: {
    width: "100%",
    maxHeight: "90%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  bottomSheetHeader: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 2,
  },
  signaturePad: {
    height: 160,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 8,
    marginVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  padPlaceholder: {
    position: "absolute",
    alignItems: "center",
    gap: 4,
  },
  padPlaceholderText: {
    fontSize: 12,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  padHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  padLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  padLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  photoBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 12,
  },
  photoActionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  photoActionLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  photoStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  reasonText: {
    fontSize: 14,
    flex: 1,
  },
  textAreaContainer: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    minHeight: 90,
  },
  textArea: {
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  padHint: {
    fontSize: 11,
    marginTop: 4,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  addExtraBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  addExtraBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  extraRowInput: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  extraNameInput: {
    flex: 1.5,
    height: 40,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  extraAmountWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  extraAmountInput: {
    flex: 1,
    fontSize: 13,
  },
  removeExtraBtn: {
    padding: 6,
  },
  breakdownCard: {
    padding: 12,
    borderRadius: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 12,
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  modeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  descContainer: {
    marginTop: 8,
    marginBottom: 14,
  },
  descTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  descBody: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  warrantyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  warrantyBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "500",
  },
});
