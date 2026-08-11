export type PublicRegistrationFormField =
  | "categoryIds"
  | "fullName"
  | "displayEmail"
  | "displayPhone"
  | "instagramUsername"
  | "gender"
  | "dateOfBirth"
  | "province"
  | "cityOrRegency"
  | "district"
  | "postalCode"
  | "emergencyContactName"
  | "emergencyContactPhone"
  | "termsAccepted"
  | "privacyAccepted"
  | "dataStatementAccepted"
  | "turnstileToken"
  | "idempotencyKey";

export type PublicRegistrationFormValues = {
  categoryIds: string[];
  fullName: string;
  displayEmail: string;
  displayPhone: string;
  instagramUsername: string;
  gender: string;
  dateOfBirth: string;
  province: string;
  cityOrRegency: string;
  district: string;
  postalCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  dataStatementAccepted: boolean;
  turnstileToken: string;
  idempotencyKey: string;
};

export type PublicRegistrationFormState = {
  values: PublicRegistrationFormValues;
  fieldErrors: Partial<Record<PublicRegistrationFormField, string>>;
  formError: string | null;
};

export function createPublicRegistrationFormValues(
  idempotencyKey: string,
): PublicRegistrationFormValues {
  return {
    categoryIds: [],
    fullName: "",
    displayEmail: "",
    displayPhone: "",
    instagramUsername: "",
    gender: "",
    dateOfBirth: "",
    province: "",
    cityOrRegency: "",
    district: "",
    postalCode: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    termsAccepted: false,
    privacyAccepted: false,
    dataStatementAccepted: false,
    turnstileToken: "",
    idempotencyKey,
  };
}

export function createPublicRegistrationFormState(
  idempotencyKey: string,
): PublicRegistrationFormState {
  return {
    values: createPublicRegistrationFormValues(idempotencyKey),
    fieldErrors: {},
    formError: null,
  };
}
