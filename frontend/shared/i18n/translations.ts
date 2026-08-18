export type Language = 'en' | 'fa';

export type TranslationDictionary = {
  common: {
    appName: string;
    welcomeBack: string;
    guestUser: string;
    loggedIn: string;
    signIn: string;
    createAccount: string;
    logOut: string;
    availableBalance: string;
    currentBalance: string;
    updatedBalance: string;
    totalBalance: string;
    loadingBalance: string;
    signInToViewBalance: string;
    walletPrivateMsg: string;
    retry: string;
    couldNotLoadBalance: string;
    backToWallet: string;
    done: string;
    loading: string;
    currency: string;
  };
  nav: {
    home: string;
    statistic: string;
    history: string;
    profile: string;
  };
  home: {
    topUp: string;
    send: string;
    request: string;
    history: string;
    paymentList: string;
    promoTitle: string;
    seeMore: string;
    limitedTime: string;
    specialOffer: string;
    specialOfferDesc: string;
    requestMoneyAlert: string;
    services: {
      internet: string;
      electricity: string;
      voucher: string;
      assurance: string;
      mobileCredit: string;
      bill: string;
      merchant: string;
      more: string;
    };
  };
  auth: {
    welcomeTitle: string;
    loginSub: string;
    joinTitle: string;
    registerSub: string;
    usernameOrEmail: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    signInBtn: string;
    signingIn: string;
    createAccountBtn: string;
    creatingAccount: string;
    dontHaveAccount: string;
    createOne: string;
    alreadyHaveAccount: string;
    signInLink: string;
  };
  deposit: {
    depositTitle: string;
    addMoneyTitle: string;
    addMoneySub: string;
    topUpWalletModal: string;
    topUpModalSub: string;
    topUpAmount: string;
    payWithZarinpal: string;
    redirecting: string;
    depositStatus: string;
    depositSuccessful: string;
    depositCancelled: string;
    depositFailed: string;
    confirmingPayment: string;
  };
  withdrawal: {
    withdrawTitle: string;
    withdrawFromWallet: string;
    withdrawSubtitle: string;
    accountNumber: string;
    shabaNumber: string;
    accountNumberPlaceholder: string;
    shabaNumberPlaceholder: string;
    amountIrr: string;
    withdrawBtn: string;
    processing: string;
    maxWithdraw: string;
    receipt: string;
    withdrawalSuccessful: string;
    amountDeducted: string;
    withdrawalAmount: string;
    remainingBalance: string;
    dateTime: string;
    seeDetail: string;
    paymentMethod: string;
    walletBalance: string;
    destination: string;
    status: string;
    completed: string;
    pleaseSignInToWithdraw: string;
  };
  profile: {
    profileTitle: string;
    notSignedIn: string;
    notSignedInSub: string;
    loadingProfile: string;
    userId: string;
    walletId: string;
    currencyLabel: string;
  };
  history: {
    historyTitle: string;
    loadingHistory: string;
    signInToViewHistory: string;
    historyPrivateMsg: string;
    noTransactionsYet: string;
    noTransactionsSub: string;
    deposit: string;
    withdrawal: string;
  };
  statistics: {
    statsTitle: string;
    overview: string;
    month: string;
    income: string;
    expense: string;
    samplePreview: string;
  };
  messages: {
    usernameRequired: string;
    usernameTooShort: string;
    emailRequired: string;
    emailInvalid: string;
    identifierRequired: string;
    identifierTooShort: string;
    passwordRequired: string;
    passwordTooShort: string;
    passwordsDoNotMatch: string;
    invalidForm: string;
    depositAmountRequired: string;
    amountWholeNumberMin: string;
    withdrawAmountRequired: string;
    insufficientFunds: string;
    accountNumberRequired: string;
    accountNumberInvalid: string;
    shabaRequired: string;
    shabaInvalid: string;
    pleaseSignInToDeposit: string;
    depositRedirectHint: string;
    invalidCredentials: string;
    usernameOrEmailExists: string;
    walletNotFound: string;
    missingPaymentAuthority: string;
    paymentNotFound: string;
    paymentNotPending: string;
    paymentVerificationFailed: string;
    paymentCannotBeSettled: string;
    failedToReachZarinpal: string;
    invalidZarinpalResponse: string;
    unauthorized: string;
    genericError: string;
    loginFailed: string;
    registrationFailed: string;
    authenticationFailed: string;
    depositFailedGeneric: string;
    withdrawalFailed: string;
    failedToLoadBalance: string;
    failedToLoadHistory: string;
    couldNotLoadTransactions: string;
    balanceResponseInvalid: string;
    historyResponseInvalid: string;
    loginNoToken: string;
    registerNoToken: string;
    withdrawalBalanceMissing: string;
      depositNoPaymentUrl: string;
      provideExactlyOneDestination: string;
      accountCreatedFor: string;
    paymentAlreadyVerified: string;
    paymentVerified: string;
    paymentCancelledDetail: string;
    paymentStatus: string;
    missingAuthority: string;
    shareReceiptTitle: string;
    shareReceiptText: string;
    withdrewAmount: string;
  };
};

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    common: {
      appName: 'Poulix',
      welcomeBack: 'Welcome back',
      guestUser: 'Guest User',
      loggedIn: 'Logged in',
      signIn: 'Sign in',
      createAccount: 'Create Account',
      logOut: 'Log Out',
      availableBalance: 'Available Balance',
      currentBalance: 'Current Balance',
      updatedBalance: 'Updated Balance',
      totalBalance: 'Total Balance',
      loadingBalance: 'Loading balance...',
      signInToViewBalance: 'Sign in to view your balance',
      walletPrivateMsg:
        'Your wallet is private. Only your signed-in account can see this balance.',
      retry: 'Retry',
      couldNotLoadBalance: 'Could not load balance',
      backToWallet: 'Back to Wallet',
      done: 'Done',
      loading: 'Loading...',
      currency: 'IRR',
    },
    nav: {
      home: 'Home',
      statistic: 'Statistic',
      history: 'History',
      profile: 'Profile',
    },
    home: {
      topUp: 'Top Up',
      send: 'Send',
      request: 'Request',
      history: 'History',
      paymentList: 'Payment List',
      promoTitle: 'Promo & Discount',
      seeMore: 'See more',
      limitedTime: 'Limited Time',
      specialOffer: "Special Offer for Today's Top Up",
      specialOfferDesc:
        'Get up to 20% bonus cashback on your next wallet top up.',
      requestMoneyAlert: 'Request Money link copied to clipboard!',
      services: {
        internet: 'Internet',
        electricity: 'Electricity',
        voucher: 'Voucher',
        assurance: 'Assurance',
        mobileCredit: 'Mobile Credit',
        bill: 'Bill',
        merchant: 'Merchant',
        more: 'More',
      },
    },
    auth: {
      welcomeTitle: 'Welcome back',
      loginSub: 'Sign in with your username or email to continue.',
      joinTitle: 'Join Poulix',
      registerSub: 'Create an account to manage your wallet securely.',
      usernameOrEmail: 'Username or Email',
      username: 'Username',
      email: 'Email Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      signInBtn: 'Sign In',
      signingIn: 'Signing in...',
      createAccountBtn: 'Create Account',
      creatingAccount: 'Creating account...',
      dontHaveAccount: "Don't have an account?",
      createOne: 'Create one',
      alreadyHaveAccount: 'Already have an account?',
      signInLink: 'Sign in',
    },
    deposit: {
      depositTitle: 'Top Up Balance',
      addMoneyTitle: 'Add Money to Wallet',
      addMoneySub:
        'Enter an IRR amount and complete payment on ZarinPal sandbox',
      topUpWalletModal: 'Top Up Wallet',
      topUpModalSub:
        'Pay through ZarinPal sandbox. Your balance updates after the payment is verified.',
      topUpAmount: 'Top Up Amount (IRR)',
      payWithZarinpal: 'Pay with ZarinPal',
      redirecting: 'Redirecting to ZarinPal...',
      depositStatus: 'Deposit Status',
      depositSuccessful: 'Deposit successful',
      depositCancelled: 'Deposit cancelled',
      depositFailed: 'Deposit failed',
      confirmingPayment: 'Confirming your ZarinPal payment...',
    },
    withdrawal: {
      withdrawTitle: 'Withdraw',
      withdrawFromWallet: 'Withdraw from Wallet',
      withdrawSubtitle: 'Send IRR to an account number or Shaba number',
      accountNumber: 'Account number',
      shabaNumber: 'Shaba number',
      accountNumberPlaceholder: '10 to 18 digits',
      shabaNumberPlaceholder: 'IR + 24 digits',
      amountIrr: 'Amount (IRR)',
      withdrawBtn: 'Withdraw',
      processing: 'Processing...',
      maxWithdraw: 'You can withdraw up to {max}',
      receipt: 'Receipt',
      withdrawalSuccessful: 'Withdrawal successful',
      amountDeducted: 'The amount was deducted from your wallet.',
      withdrawalAmount: 'Withdrawal amount',
      remainingBalance: 'Remaining Balance',
      dateTime: 'Date & time',
      seeDetail: 'See Detail',
      paymentMethod: 'Payment Method',
      walletBalance: 'Wallet Balance',
      destination: 'Destination',
      status: 'Status',
      completed: 'Completed',
      pleaseSignInToWithdraw: 'Please sign in to withdraw funds',
    },
    profile: {
      profileTitle: 'Profile',
      notSignedIn: 'You are not signed in',
      notSignedInSub:
        'Sign in or create an account to view your wallet profile and settings.',
      loadingProfile: 'Loading profile...',
      userId: 'User ID',
      walletId: 'Wallet ID',
      currencyLabel: 'Currency',
    },
    history: {
      historyTitle: 'Transaction History',
      loadingHistory: 'Loading transactions...',
      signInToViewHistory: 'Sign in to view history',
      historyPrivateMsg:
        'Your deposits and withdrawals are private to your account.',
      noTransactionsYet: 'No transactions yet',
      noTransactionsSub:
        'Your deposits and withdrawals will appear here automatically.',
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
    },
    statistics: {
      statsTitle: 'Statistic',
      overview: 'Overview',
      month: 'Month',
      income: 'Income',
      expense: 'Expense',
      samplePreview: 'Sample preview',
    },
    messages: {
      usernameRequired: 'Username is required',
      usernameTooShort: 'Username must be at least 3 characters',
      emailRequired: 'Email is required',
      emailInvalid: 'Enter a valid email address',
      identifierRequired: 'Username or email is required',
      identifierTooShort: 'Identifier must be at least 3 characters',
      passwordRequired: 'Password is required',
      passwordTooShort: 'Password must be at least 8 characters',
      passwordsDoNotMatch: 'Passwords do not match',
      invalidForm: 'Invalid form',
      depositAmountRequired: 'Enter a deposit amount in IRR',
      amountWholeNumberMin: 'Amount must be a whole number of at least 1 IRR',
      withdrawAmountRequired: 'Enter a withdrawal amount in IRR',
      insufficientFunds: 'Insufficient funds',
      accountNumberRequired: 'Account number is required',
      accountNumberInvalid: 'Account number must be 10 to 18 digits',
      shabaRequired: 'Shaba number is required',
      shabaInvalid: 'Shaba number must be IR followed by 24 digits',
      pleaseSignInToDeposit: 'Please sign in to deposit funds',
      depositRedirectHint:
        'You will be sent to ZarinPal sandbox to pay {amount}. The wallet updates only after payment is verified.',
      invalidCredentials: 'Invalid credentials',
      usernameOrEmailExists: 'Username or email already exists',
      walletNotFound: 'Wallet not found',
      missingPaymentAuthority: 'Missing payment authority',
      paymentNotFound: 'Payment not found',
      paymentNotPending: 'Payment is not pending verification',
      paymentVerificationFailed: 'Payment verification failed',
      paymentCannotBeSettled: 'Payment cannot be settled',
      failedToReachZarinpal: 'Failed to reach ZarinPal',
      invalidZarinpalResponse: 'Invalid response from ZarinPal',
      unauthorized: 'Unauthorized',
      genericError: 'An error occurred',
      loginFailed: 'Login failed',
      registrationFailed: 'Registration failed',
      authenticationFailed: 'Authentication failed',
      depositFailedGeneric: 'Deposit failed',
      withdrawalFailed: 'Withdrawal failed',
      failedToLoadBalance: 'Failed to load balance',
      failedToLoadHistory: 'Failed to load history',
      couldNotLoadTransactions: 'Could not load transactions',
      balanceResponseInvalid: 'Balance response was invalid',
      historyResponseInvalid: 'Transaction history response was invalid',
      loginNoToken: 'Login succeeded but no access token was returned',
      registerNoToken: 'Registration succeeded but no access token was returned',
      withdrawalBalanceMissing:
        'Withdrawal succeeded but the updated balance was missing',
      depositNoPaymentUrl: 'Deposit request did not return a ZarinPal payment URL',
      provideExactlyOneDestination:
        'Provide exactly one account number or Shaba number',
      accountCreatedFor: 'Account created for {email}',
      paymentAlreadyVerified:
        'This payment was already verified. Your wallet was not credited twice.',
      paymentVerified: 'Payment verified. Your wallet has been updated.',
      paymentCancelledDetail:
        'Payment was cancelled. Your wallet was not credited.',
      paymentStatus: 'Payment status: {status}',
      missingAuthority: 'Missing payment authority from ZarinPal.',
      shareReceiptTitle: 'Withdrawal Receipt',
      shareReceiptText:
        'Withdrawal of {amount} to {destinationLabel} {destination} was successful.',
      withdrewAmount: 'Withdrew {amount}',
    },
  },
  fa: {
    common: {
      appName: 'پولیکس',
      welcomeBack: 'خوش آمدید',
      guestUser: 'کاربر مهمان',
      loggedIn: 'وارد شده',
      signIn: 'ورود',
      createAccount: 'ایجاد حساب',
      logOut: 'خروج از حساب',
      availableBalance: 'موجودی در دسترس',
      currentBalance: 'موجودی فعلی',
      updatedBalance: 'موجودی به‌روز شده',
      totalBalance: 'موجودی کل',
      loadingBalance: 'در حال بارگذاری موجودی...',
      signInToViewBalance: 'برای مشاهده موجودی وارد شوید',
      walletPrivateMsg:
        'کیف پول شما شخصی است. تنها حساب وارد شده شما به این موجودی دسترسی دارد.',
      retry: 'تلاش مجدد',
      couldNotLoadBalance: 'بارگذاری موجودی با خطا مواجه شد',
      backToWallet: 'بازگشت به کیف پول',
      done: 'تأیید',
      loading: 'در حال بارگذاری...',
      currency: 'ریال',
    },
    nav: {
      home: 'خانه',
      statistic: 'آمار',
      history: 'تاریخچه',
      profile: 'پروفایل',
    },
    home: {
      topUp: 'افزایش موجودی',
      send: 'انتقال / برداشت',
      request: 'درخواست',
      history: 'تاریخچه',
      paymentList: 'خدمات پرداخت',
      promoTitle: 'تخفیف‌ها و پیشنهادها',
      seeMore: 'مشاهده بیشتر',
      limitedTime: 'پیشنهاد ویژه',
      specialOffer: 'تخفیف ویژه برای افزایش موجودی امروز',
      specialOfferDesc:
        'تا ۲۰٪ اعتبار هدیه در افزایش موجودی بعدی خود دریافت کنید.',
      requestMoneyAlert: 'لینک درخواست پول کپی شد!',
      services: {
        internet: 'اینترنت',
        electricity: 'برق',
        voucher: 'کارت هدیه',
        assurance: 'بیمه',
        mobileCredit: 'شارژ سیم‌کارت',
        bill: 'قبوض',
        merchant: 'فروشندگان',
        more: 'بیشتر',
      },
    },
    auth: {
      welcomeTitle: 'خوش آمدید',
      loginSub: 'جهت ادامه با نام کاربری یا ایمیل خود وارد شوید.',
      joinTitle: 'عضویت در پولیکس',
      registerSub: 'یک حساب کاربری برای مدیریت امن کیف پول ایجاد کنید.',
      usernameOrEmail: 'نام کاربری یا ایمیل',
      username: 'نام کاربری',
      email: 'آدرس ایمیل',
      password: 'کلمه عبور',
      confirmPassword: 'تکرار کلمه عبور',
      signInBtn: 'ورود به حساب',
      signingIn: 'در حال ورود...',
      createAccountBtn: 'ایجاد حساب کاربری',
      creatingAccount: 'در حال ایجاد حساب...',
      dontHaveAccount: 'حساب کاربری ندارید؟',
      createOne: 'ثبت‌نام کنید',
      alreadyHaveAccount: 'قبلاً ثبت‌نام کرده‌اید؟',
      signInLink: 'وارد شوید',
    },
    deposit: {
      depositTitle: 'افزایش موجودی',
      addMoneyTitle: 'افزایش موجودی کیف پول',
      addMoneySub:
        'مبلغ مورد نظر به ریال را وارد کرده و پرداخت درگاه زرین‌پال را تکمیل کنید',
      topUpWalletModal: 'افزایش موجودی کیف پول',
      topUpModalSub:
        'پرداخت از طریق درگاه زرین‌پال. موجودی پس از بررسی و تأیید به‌روز می‌شود.',
      topUpAmount: 'مبلغ افزایش موجودی (ریال)',
      payWithZarinpal: 'پرداخت با زرین‌پال',
      redirecting: 'در حال انتقال به زرین‌پال...',
      depositStatus: 'وضعیت پرداخت',
      depositSuccessful: 'پرداخت با موفقیت انجام شد',
      depositCancelled: 'پرداخت لغو شد',
      depositFailed: 'پرداخت ناموفق بود',
      confirmingPayment: 'در حال بررسی و تأیید پرداخت زرین‌پال...',
    },
    withdrawal: {
      withdrawTitle: 'برداشت',
      withdrawFromWallet: 'برداشت از کیف پول',
      withdrawSubtitle: 'انتقال ریالی به شماره حساب یا شماره شبا',
      accountNumber: 'شماره حساب',
      shabaNumber: 'شماره شبا',
      accountNumberPlaceholder: '۱۰ تا ۱۸ رقم',
      shabaNumberPlaceholder: 'IR + ۲۴ رقم',
      amountIrr: 'مبلغ (ریال)',
      withdrawBtn: 'برداشت از حساب',
      processing: 'در حال پردازش...',
      maxWithdraw: 'حداکثر مبلغ قابل برداشت: {max}',
      receipt: 'رسید پرداخت',
      withdrawalSuccessful: 'برداشت با موفقیت انجام شد',
      amountDeducted: 'مبلغ فوق از موجودی کیف پول شما کسر گردید.',
      withdrawalAmount: 'مبلغ برداشت',
      remainingBalance: 'موجودی باقیمانده',
      dateTime: 'تاریخ و زمان',
      seeDetail: 'مشاهده جزئیات',
      paymentMethod: 'روش پرداخت',
      walletBalance: 'موجودی کیف پول',
      destination: 'مقصد',
      status: 'وضعیت',
      completed: 'تکمیل شده',
      pleaseSignInToWithdraw: 'لطفاً برای برداشت حساب وارد شوید',
    },
    profile: {
      profileTitle: 'پروفایل کاربری',
      notSignedIn: 'شما وارد حساب کاربری نشده‌اید',
      notSignedInSub:
        'برای مشاهده پروفایل و تنظیمات کیف پول وارد شوید یا حساب ایجاد کنید.',
      loadingProfile: 'در حال بارگذاری پروفایل...',
      userId: 'شناسه کاربر',
      walletId: 'شناسه کیف پول',
      currencyLabel: 'واحد پول',
    },
    history: {
      historyTitle: 'تاریخچه تراکنش‌ها',
      loadingHistory: 'در حال بارگذاری تراکنش‌ها...',
      signInToViewHistory: 'برای مشاهده تاریخچه وارد شوید',
      historyPrivateMsg:
        'واریزها و برداشت‌های شما محرمانه و مخصوص حساب شما است.',
      noTransactionsYet: 'تراکنشی ثبت نشده است',
      noTransactionsSub:
        'واریزها و برداشت‌های شما به صورت خودکار در اینجا نمایش داده می‌شوند.',
      deposit: 'واریز',
      withdrawal: 'برداشت',
    },
    statistics: {
      statsTitle: 'آمار و گزارش‌ها',
      overview: 'نمای کلی',
      month: 'ماهانه',
      income: 'واریزی‌ها',
      expense: 'برداشت‌ها',
      samplePreview: 'نمایش نمونه',
    },
    messages: {
      usernameRequired: 'نام کاربری الزامی است',
      usernameTooShort: 'نام کاربری باید حداقل ۳ کاراکتر باشد',
      emailRequired: 'ایمیل الزامی است',
      emailInvalid: 'یک ایمیل معتبر وارد کنید',
      identifierRequired: 'نام کاربری یا ایمیل الزامی است',
      identifierTooShort: 'شناسه باید حداقل ۳ کاراکتر باشد',
      passwordRequired: 'کلمه عبور الزامی است',
      passwordTooShort: 'کلمه عبور باید حداقل ۸ کاراکتر باشد',
      passwordsDoNotMatch: 'کلمات عبور یکسان نیستند',
      invalidForm: 'فرم نامعتبر است',
      depositAmountRequired: 'مبلغ واریز را به ریال وارد کنید',
      amountWholeNumberMin: 'مبلغ باید عدد صحیح و حداقل ۱ ریال باشد',
      withdrawAmountRequired: 'مبلغ برداشت را به ریال وارد کنید',
      insufficientFunds: 'موجودی کافی نیست',
      accountNumberRequired: 'شماره حساب الزامی است',
      accountNumberInvalid: 'شماره حساب باید بین ۱۰ تا ۱۸ رقم باشد',
      shabaRequired: 'شماره شبا الزامی است',
      shabaInvalid: 'شماره شبا باید با IR و ۲۴ رقم باشد',
      pleaseSignInToDeposit: 'لطفاً برای افزایش موجودی وارد حساب شوید',
      depositRedirectHint:
        'برای پرداخت {amount} به درگاه زرین‌پال منتقل می‌شوید. موجودی فقط پس از تأیید پرداخت به‌روز می‌شود.',
      invalidCredentials: 'نام کاربری یا رمز عبور نادرست است',
      usernameOrEmailExists: 'نام کاربری یا ایمیل قبلاً ثبت شده است',
      walletNotFound: 'کیف پول یافت نشد',
      missingPaymentAuthority: 'کد پیگیری پرداخت موجود نیست',
      paymentNotFound: 'پرداخت یافت نشد',
      paymentNotPending: 'پرداخت در انتظار تأیید نیست',
      paymentVerificationFailed: 'تأیید پرداخت ناموفق بود',
      paymentCannotBeSettled: 'پرداخت قابل تسویه نیست',
      failedToReachZarinpal: 'ارتباط با زرین‌پال برقرار نشد',
      invalidZarinpalResponse: 'پاسخ نامعتبر از زرین‌پال',
      unauthorized: 'دسترسی غیرمجاز',
      genericError: 'خطایی رخ داد',
      loginFailed: 'ورود ناموفق بود',
      registrationFailed: 'ثبت‌نام ناموفق بود',
      authenticationFailed: 'احراز هویت ناموفق بود',
      depositFailedGeneric: 'واریز ناموفق بود',
      withdrawalFailed: 'برداشت ناموفق بود',
      failedToLoadBalance: 'بارگذاری موجودی ناموفق بود',
      failedToLoadHistory: 'بارگذاری تاریخچه ناموفق بود',
      couldNotLoadTransactions: 'بارگذاری تراکنش‌ها ممکن نشد',
      balanceResponseInvalid: 'پاسخ موجودی نامعتبر بود',
      historyResponseInvalid: 'پاسخ تاریخچه تراکنش‌ها نامعتبر بود',
      loginNoToken: 'ورود موفق بود اما توکن دسترسی دریافت نشد',
      registerNoToken: 'ثبت‌نام موفق بود اما توکن دسترسی دریافت نشد',
      withdrawalBalanceMissing: 'برداشت موفق بود اما موجودی به‌روز شده دریافت نشد',
      depositNoPaymentUrl: 'درخواست واریز آدرس پرداخت زرین‌پال را برنگرداند',
      provideExactlyOneDestination:
        'فقط یکی از شماره حساب یا شماره شبا را وارد کنید',
      accountCreatedFor: 'حساب برای {email} ایجاد شد',
      paymentAlreadyVerified:
        'این پرداخت قبلاً تأیید شده است. موجودی دوباره افزایش نیافت.',
      paymentVerified: 'پرداخت تأیید شد. موجودی کیف پول به‌روز شد.',
      paymentCancelledDetail: 'پرداخت لغو شد. موجودی افزایش نیافت.',
      paymentStatus: 'وضعیت پرداخت: {status}',
      missingAuthority: 'کد پیگیری پرداخت از زرین‌پال دریافت نشد.',
      shareReceiptTitle: 'رسید برداشت',
      shareReceiptText:
        'برداشت {amount} به {destinationLabel} {destination} با موفقیت انجام شد.',
      withdrewAmount: 'مبلغ {amount} برداشت شد',
    },
  },
};
