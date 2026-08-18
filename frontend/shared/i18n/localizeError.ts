import type { TranslationDictionary } from './translations';

type Messages = TranslationDictionary['messages'];
type MessageKey = keyof Messages;

/** Canonical English backend / app messages → translation keys */
const SERVER_MESSAGE_KEYS: Record<string, MessageKey> = {
  'Invalid credentials': 'invalidCredentials',
  'Username or email already exists': 'usernameOrEmailExists',
  'Insufficient funds': 'insufficientFunds',
  'Wallet not found': 'walletNotFound',
  'Missing payment authority': 'missingPaymentAuthority',
  'Payment not found': 'paymentNotFound',
  'Payment is not pending verification': 'paymentNotPending',
  'Payment verification failed': 'paymentVerificationFailed',
  'Payment cannot be settled': 'paymentCannotBeSettled',
  'Failed to reach ZarinPal': 'failedToReachZarinpal',
  'Invalid response from ZarinPal': 'invalidZarinpalResponse',
  Unauthorized: 'unauthorized',
  'An error occurred': 'genericError',
  'Username is required': 'usernameRequired',
  'Username must be at least 3 characters': 'usernameTooShort',
  'Email is required': 'emailRequired',
  'Enter a valid email address': 'emailInvalid',
  'Username or email is required': 'identifierRequired',
  'Identifier must be at least 3 characters': 'identifierTooShort',
  'Password is required': 'passwordRequired',
  'Password must be at least 8 characters': 'passwordTooShort',
  'Passwords do not match': 'passwordsDoNotMatch',
  'Invalid form': 'invalidForm',
  'Enter a deposit amount in IRR': 'depositAmountRequired',
  'Amount must be a whole number of at least 1 IRR': 'amountWholeNumberMin',
  'Enter a withdrawal amount in IRR': 'withdrawAmountRequired',
  'Account number is required': 'accountNumberRequired',
  'Account number must be 10 to 18 digits': 'accountNumberInvalid',
  'Shaba number is required': 'shabaRequired',
  'Shaba number must be IR followed by 24 digits': 'shabaInvalid',
  'Please sign in to deposit funds': 'pleaseSignInToDeposit',
  'Login failed': 'loginFailed',
  'Registration failed': 'registrationFailed',
  'Authentication failed': 'authenticationFailed',
  'Deposit failed': 'depositFailedGeneric',
  'Withdrawal failed': 'withdrawalFailed',
  'Failed to load balance': 'failedToLoadBalance',
  'Failed to load history': 'failedToLoadHistory',
  'Could not load transactions': 'couldNotLoadTransactions',
  'Balance response was invalid': 'balanceResponseInvalid',
  'Transaction history response was invalid': 'historyResponseInvalid',
  'Login succeeded but no access token was returned': 'loginNoToken',
  'Registration succeeded but no access token was returned': 'registerNoToken',
  'Withdrawal succeeded but the updated balance was missing':
    'withdrawalBalanceMissing',
  'Deposit request did not return a ZarinPal payment URL': 'depositNoPaymentUrl',
  'Provide exactly one account number or Shaba number':
    'provideExactlyOneDestination',
  'Missing payment authority from ZarinPal.': 'missingAuthority',
  'This payment was already verified. Your wallet was not credited twice.':
    'paymentAlreadyVerified',
  'Payment verified. Your wallet has been updated.': 'paymentVerified',
  'Payment was cancelled. Your wallet was not credited.': 'paymentCancelledDetail',
};

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function formatMessage(
  template: string,
  vars?: Record<string, string | number>,
): string {
  return interpolate(template, vars);
}

export function localizeError(
  raw: unknown,
  messages: Messages,
  fallback: MessageKey = 'genericError',
): string {
  const text =
    raw instanceof Error
      ? raw.message
      : typeof raw === 'string'
        ? raw
        : '';

  const trimmed = text.trim();
  if (!trimmed) {
    return messages[fallback];
  }

  const exactKey = SERVER_MESSAGE_KEYS[trimmed];
  if (exactKey) {
    return messages[exactKey];
  }

  if (/insufficient/i.test(trimmed)) {
    return messages.insufficientFunds;
  }

  const statusMatch = /^Payment status:\s*(.+)$/i.exec(trimmed);
  if (statusMatch) {
    return formatMessage(messages.paymentStatus, {
      status: statusMatch[1] || 'unknown',
    });
  }

  return trimmed;
}
