import { describe, expect, it } from "vitest";
import {
  emailSchema,
  newPasswordSchema,
  otpSchema,
  passwordStrengthIssues,
  signUpSchema,
} from "./schemas";

describe("emailSchema", () => {
  it("accepts a valid email", () => {
    expect(emailSchema.safeParse("alex@northwindstudio.co").success).toBe(true);
  });

  it("rejects an empty value", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  it("rejects a value without an @", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("otpSchema", () => {
  it("accepts exactly 6 digits", () => {
    expect(otpSchema.safeParse("424242").success).toBe(true);
  });

  it("rejects fewer than 6 digits", () => {
    expect(otpSchema.safeParse("4242").success).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(otpSchema.safeParse("42424a").success).toBe(false);
  });
});

describe("passwordStrengthIssues", () => {
  it("has no issues for a strong password", () => {
    expect(passwordStrengthIssues("Oakey#2026")).toEqual([]);
  });

  it("flags a short password", () => {
    expect(passwordStrengthIssues("Oak1")).toContain("At least 8 characters.");
  });

  it("flags a password missing an uppercase letter", () => {
    expect(passwordStrengthIssues("oakey2026")).toContain("At least one uppercase letter.");
  });

  it("flags a password missing a digit", () => {
    expect(passwordStrengthIssues("OakeyOakey")).toContain("At least one number.");
  });
});

describe("signUpSchema", () => {
  const valid = {
    businessName: "Northwind Studio",
    firstName: "Alex",
    lastName: "Rivera",
    email: "alex@northwindstudio.co",
    password: "Oakey#2026",
  };

  it("accepts a fully valid payload", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a weak password", () => {
    const result = signUpSchema.safeParse({ ...valid, password: "weak" });
    expect(result.success).toBe(false);
  });

  it("rejects a one-character business name", () => {
    const result = signUpSchema.safeParse({ ...valid, businessName: "N" });
    expect(result.success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("accepts matching strong passwords", () => {
    const result = newPasswordSchema.safeParse({ password: "Oakey#2026", confirmPassword: "Oakey#2026" });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = newPasswordSchema.safeParse({ password: "Oakey#2026", confirmPassword: "Oakey#2027" });
    expect(result.success).toBe(false);
  });
});
