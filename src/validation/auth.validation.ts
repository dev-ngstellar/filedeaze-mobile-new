import { z } from "zod";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const technicianLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Email or Mobile is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

export const customerLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please enter a valid email address.")
    .regex(EMAIL_REGEX, "Please enter a valid email address."),
  password: z
    .string()
    .min(1, "Password is required."),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters"),
    mobile: z
      .string()
      .trim()
      .min(1, "Mobile number is required")
      .regex(/^\d{10}$/, "Mobile number must be 10 digits"),
    email: z
      .string()
      .trim()
      .min(1, "Please enter a valid email address.")
      .regex(EMAIL_REGEX, "Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((val) => /[a-zA-Z]/.test(val) && /\d/.test(val), {
        message: "Password must contain both letters and numbers",
      }),
    confirmPassword: z
      .string()
      .min(1, "Confirm password is required"),
    address: z
      .string()
      .trim()
      .min(1, "Address is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please enter a valid email address.")
    .regex(EMAIL_REGEX, "Please enter a valid email address."),
});

export const profileUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^\d{10}$/, "Phone number must be 10 digits"),
  pincode: z
    .string()
    .trim()
    .min(1, "Pincode is required")
    .regex(/^\d{6}$/, "Pincode must be 6 digits"),
  address: z
    .string()
    .trim()
    .min(1, "Address is required"),
  city: z.string().trim().optional(),
  alternatePhone: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^\d{10}$/.test(val), {
      message: "Please enter a valid 10-digit alternate phone number.",
    }),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter 6-digit OTP"),
});

export type TechnicianLoginInput = z.infer<typeof technicianLoginSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
