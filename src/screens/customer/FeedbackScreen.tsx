import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Star,
  CheckCircle2,
  MessageSquare,
  Ticket,
} from "lucide-react-native";
import { useTheme } from "../../theme";
import { useSubmitCustomerFeedback, useCustomerTicketDetails } from "../../hooks/useCustomer";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { AppCard } from "../../components/AppCard";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { AppLoader } from "../../components/AppLoader";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "Feedback">;
type RouteProps = RouteProp<CustomerStackParamList, "Feedback">;

const RATING_LABELS: Record<number, string> = {
  5: "Excellent Service",
  4: "Good",
  3: "Average",
  2: "Poor",
  1: "Very Poor",
  0: "Tap a star to rate",
};

const AnimatedStar = ({
  starNumber,
  rating,
  onPress,
  primaryColor,
  textLightColor,
}: {
  starNumber: number;
  rating: number;
  onPress: () => void;
  primaryColor: string;
  textLightColor: string;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isSelected = starNumber <= rating;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.starBtn} hitSlop={6}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Star
          size={40}
          color={isSelected ? primaryColor : textLightColor}
          fill={isSelected ? primaryColor : "transparent"}
        />
      </Animated.View>
    </Pressable>
  );
};

export const FeedbackScreen = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { ticketId, ticketNumber } = route.params;

  const { data: ticket, isLoading } = useCustomerTicketDetails(ticketId);
  const submitFeedbackMutation = useSubmitCustomerFeedback();

  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [reviewError, setReviewError] = useState("");

  const handleRatingSelect = (selectedStar: number) => {
    setRating(selectedStar);
    setRatingError("");
  };

  const handleReviewChange = (text: string) => {
    setReview(text);
    if (text.trim()) {
      setReviewError("");
    }
  };

  const handleNavigateHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "CustomerDashboard" }],
    });
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);

    let hasError = false;

    if (rating === 0) {
      setRatingError("Please select a star rating.");
      hasError = true;
    } else {
      setRatingError("");
    }

    if (!review.trim()) {
      setReviewError("Please enter your feedback description.");
      hasError = true;
    } else {
      setReviewError("");
    }

    if (hasError) {
      return;
    }

    try {
      await submitFeedbackMutation.mutateAsync({
        ticketId,
        rating,
        review: review.trim(),
      });

      setIsSubmitted(true);
    } catch (err: any) {
      Alert.alert("Submission Failed", "We couldn't submit your feedback. Please check your connection and try again.");
    }
  };

  const isFormIncomplete = rating === 0 || !review.trim();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader showBack onBackPress={() => navigation.goBack()} title="Submit Feedback" />
        <AppLoader message="Loading service details..." />
      </View>
    );
  }

  if (isSubmitted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader showBack={false} title="Submit Feedback" />
        <View style={styles.successContainer}>
          <View style={[styles.successIconCircle, { backgroundColor: `${theme.colors.success}15` }]}>
            <CheckCircle2 size={68} color={theme.colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: theme.colors.text }]}>Thank You!</Text>
          <Text style={[styles.successSubtitle, { color: theme.colors.textMuted }]}>
            Your feedback has been submitted successfully.
          </Text>

          <AppButton
            title="Back to Home"
            onPress={handleNavigateHome}
            style={{ width: "100%", marginTop: 32 }}
          />
        </View>
      </View>
    );
  }

  if (ticket?.feedback) {
    const existingFeedback = ticket.feedback;
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader showBack onBackPress={() => navigation.goBack()} title="Submit Feedback" />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AppCard style={styles.card}>
            <View style={styles.ticketHeaderRow}>
              <Ticket size={18} color={theme.colors.primary} />
              <Text style={[styles.ticketNo, { color: theme.colors.text }]}>Ticket #{ticketNumber}</Text>
            </View>
          </AppCard>

          <AppCard style={[styles.card, { alignItems: "center", paddingVertical: 28 }]}>
            <View style={[styles.alreadySubmittedBadge, { backgroundColor: `${theme.colors.success}15` }]}>
              <CheckCircle2 size={22} color={theme.colors.success} />
              <Text style={[styles.alreadySubmittedText, { color: theme.colors.success }]}>
                Feedback Already Submitted
              </Text>
            </View>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={34}
                  color={star <= existingFeedback.rating ? theme.colors.primary : theme.colors.borderLight}
                  fill={star <= existingFeedback.rating ? theme.colors.primary : "transparent"}
                />
              ))}
            </View>

            <Text style={[styles.ratingLabelText, { color: theme.colors.primary }]}>
              {RATING_LABELS[existingFeedback.rating] || "Service Rated"}
            </Text>

            {existingFeedback.review ? (
              <Text style={[styles.existingReviewText, { color: theme.colors.text }]}>
                "{existingFeedback.review}"
              </Text>
            ) : null}

            <AppButton
              title="Return to Home"
              onPress={handleNavigateHome}
              variant="outline"
              style={{ marginTop: 24, width: "100%" }}
            />
          </AppCard>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader showBack onBackPress={() => navigation.goBack()} title="Submit Feedback" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Title Section */}
        <View style={styles.headerSubtitleSection}>
          <Text style={[styles.screenMainTitle, { color: theme.colors.text }]}>Submit Feedback</Text>
          <Text style={[styles.screenSubtitle, { color: theme.colors.textMuted }]}>
            Share your experience with today's service.
          </Text>
        </View>

        {/* Ticket Reference Badge */}
        <AppCard style={styles.ticketBadgeCard}>
          <View style={styles.ticketHeaderRow}>
            <View style={[styles.ticketIconBox, { backgroundColor: `${theme.colors.primary}12` }]}>
              <Ticket size={18} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={[styles.ticketRefLabel, { color: theme.colors.textMuted }]}>SERVICE TICKET</Text>
              <Text style={[styles.ticketNo, { color: theme.colors.text }]}>#{ticketNumber}</Text>
            </View>
          </View>
        </AppCard>

        {/* 1. Rating Section (Required) */}
        <AppCard style={styles.card}>
          <Text style={[styles.cardSectionTitle, { color: theme.colors.text }]}>
            Rate Your Experience <Text style={{ color: theme.colors.danger }}>*</Text>
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <AnimatedStar
                key={star}
                starNumber={star}
                rating={rating}
                onPress={() => handleRatingSelect(star)}
                primaryColor={theme.colors.primary}
                textLightColor={theme.colors.borderLight}
              />
            ))}
          </View>

          <Text style={[styles.ratingLabelText, { color: rating > 0 ? theme.colors.primary : theme.colors.textMuted }]}>
            {RATING_LABELS[rating]}
          </Text>

          {submitAttempted && ratingError ? (
            <Text style={[styles.errorText, { color: theme.colors.danger, textAlign: "center" }]}>
              {ratingError}
            </Text>
          ) : null}
        </AppCard>

        {/* 2. Feedback Description / Comments Section (Required) */}
        <AppCard style={styles.card}>
          <View style={styles.cardTitleRow}>
            <MessageSquare size={16} color={theme.colors.primary} />
            <Text style={[styles.cardSectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>
              Feedback Description <Text style={{ color: theme.colors.danger }}>*</Text>
            </Text>
          </View>

          <View style={styles.textAreaWrapper}>
            <Pressable style={styles.textAreaContainer}>
              <AppInput
                placeholder="Tell us about your service experience..."
                value={review}
                onChangeText={handleReviewChange}
                multiline
                numberOfLines={4}
                maxLength={500}
                style={[styles.multilineInput, { color: theme.colors.text }]}
              />
            </Pressable>
            <View style={styles.charCounterRow}>
              <Text style={[styles.charCounterText, { color: theme.colors.textMuted }]}>
                {review.length}/500
              </Text>
            </View>
          </View>

          {submitAttempted && reviewError ? (
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>
              {reviewError}
            </Text>
          ) : null}
        </AppCard>

        {/* Submit Action */}
        <AppButton
          title="Submit Feedback"
          onPress={handleSubmit}
          disabled={isFormIncomplete}
          loading={submitFeedbackMutation.isPending}
          style={{ marginTop: 8, marginBottom: 36 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerSubtitleSection: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  screenMainTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  ticketBadgeCard: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
  },
  ticketHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ticketIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketRefLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  ticketNo: {
    fontSize: 15,
    fontWeight: "800",
  },
  card: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 10,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 10,
  },
  starBtn: {
    padding: 2,
  },
  ratingLabelText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
  textAreaWrapper: {
    marginTop: 6,
  },
  textAreaContainer: {
    minHeight: 110,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCounterRow: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  charCounterText: {
    fontSize: 11,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  successIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  alreadySubmittedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
  },
  alreadySubmittedText: {
    fontSize: 14,
    fontWeight: "700",
  },
  existingReviewText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
});

export default FeedbackScreen;
