import type { AuthResponse, LoginPayload, RegisterPayload } from "@/shared/api";
import { api, setStoredToken } from "@/shared/api";
import type { TranslationDictionary } from "@/shared/i18n/translations";
import validator from "validator";

type Messages = TranslationDictionary["messages"];

export function isValidEmailAddress(email: string): boolean {
  return validator.isEmail(email.trim());
}

export function validateUsername(
  username: string,
  messages: Messages,
): string | null {
  const value = username.trim();
  if (!value) return messages.usernameRequired;
  if (value.length < 3) return messages.usernameTooShort;
  return null;
}

export function validateEmail(
  email: string,
  messages: Messages,
): string | null {
  const value = email.trim();
  if (!value) return messages.emailRequired;
  if (!isValidEmailAddress(value)) return messages.emailInvalid;
  return null;
}

export function validateIdentifier(
  identifier: string,
  messages: Messages,
): string | null {
  const value = identifier.trim();
  if (!value) return messages.identifierRequired;
  if (value.length < 3) return messages.identifierTooShort;
  return null;
}

export function validatePassword(
  password: string,
  messages: Messages,
): string | null {
  if (!password) return messages.passwordRequired;
  if (password.length < 8) return messages.passwordTooShort;
  return null;
}

export async function loginAndStoreSession(
  payload: LoginPayload,
  messages?: Messages,
): Promise<AuthResponse> {
  const response = await api.login({
    identifier: payload.identifier.trim(),
    password: payload.password,
  });

  if (!response?.accessToken) {
    throw new Error(
      messages?.loginNoToken ||
        "Login succeeded but no access token was returned",
    );
  }

  setStoredToken(response.accessToken);
  return response;
}

export async function registerAndStoreSession(
  payload: RegisterPayload,
  messages?: Messages,
): Promise<AuthResponse> {
  const response = await api.register({
    username: payload.username.trim(),
    email: payload.email.trim(),
    password: payload.password,
  });

  if (!response?.accessToken) {
    throw new Error(
      messages?.registerNoToken ||
        "Registration succeeded but no access token was returned",
    );
  }

  setStoredToken(response.accessToken);
  return response;
}
