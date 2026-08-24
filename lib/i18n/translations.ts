// ─── Translation catalogue ───────────────────────────────────────────────────
// `en` is the source of truth: every key must exist here. `ar` is typed against
// it, so a missing Arabic string is a compile error rather than a blank label
// discovered by a user in Doha.
//
// Keys are namespaced by area (`common.*`, `booking.*`) and named for meaning,
// not for the English words, so copy edits don't churn key names.

export const en = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    save: 'Save',
    done: 'Done',
    next: 'Next',
    back: 'Back',
    close: 'Close',
    retry: 'Retry',
    search: 'Search',
    seeAll: 'See all',
    loading: 'Loading…',
    currency: 'QAR',
  },
  tabs: {
    home: 'Home',
    search: 'Search',
    bookings: 'Bookings',
    cars: 'Cars',
    account: 'Account',
    quick: 'Quick',
  },
  offline: {
    title: "You're offline",
    body: 'Showing the last information we saved. Reconnect to get live updates.',
    banner: 'No internet connection',
  },
  errors: {
    title: 'Something went wrong',
    body: 'The screen could not be loaded. Try again, and if it keeps happening let us know.',
    notFoundTitle: 'Not found',
    notFoundBody: 'This record may have been removed.',
  },
  booking: {
    chooseVehicle: 'Choose vehicle',
    chooseDateTime: 'Choose date and time',
    addOns: 'Add-ons',
    pickupDropoff: 'Pickup and drop-off',
    summary: 'Summary',
    checkout: 'Checkout',
    confirm: 'Confirm booking',
    status: {
      pending: 'Pending',
      confirmed: 'Confirmed',
      inProgress: 'In progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
  },
  account: {
    title: 'Account',
    language: 'Language',
    languageSubtitle: 'Set the app language for the mobile experience.',
    theme: 'Appearance',
    notifications: 'Notifications',
    signOut: 'Sign out',
    restartRequired: 'Restart required',
    restartBody:
      'Arabic uses a right-to-left layout. The app needs to restart to apply it.',
    restartNow: 'Restart now',
  },
} as const;

/** Every leaf key in `en`, as a dotted path — e.g. `"booking.status.pending"`. */
export type TranslationKey = LeafKeys<typeof en>;

type LeafKeys<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : LeafKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Same shape as `en`, enforced structurally. */
type Catalogue = {
  [K in keyof typeof en]: { [P in keyof (typeof en)[K]]: (typeof en)[K][P] extends string
    ? string
    : { [Q in keyof (typeof en)[K][P]]: string } };
};

export const ar: Catalogue = {
  common: {
    ok: 'حسناً',
    cancel: 'إلغاء',
    save: 'حفظ',
    done: 'تم',
    next: 'التالي',
    back: 'رجوع',
    close: 'إغلاق',
    retry: 'إعادة المحاولة',
    search: 'بحث',
    seeAll: 'عرض الكل',
    loading: 'جارٍ التحميل…',
    currency: 'ر.ق',
  },
  tabs: {
    home: 'الرئيسية',
    search: 'بحث',
    bookings: 'الحجوزات',
    cars: 'سياراتي',
    account: 'الحساب',
    quick: 'سريع',
  },
  offline: {
    title: 'أنت غير متصل بالإنترنت',
    body: 'نعرض آخر المعلومات المحفوظة. أعد الاتصال للحصول على التحديثات المباشرة.',
    banner: 'لا يوجد اتصال بالإنترنت',
  },
  errors: {
    title: 'حدث خطأ ما',
    body: 'تعذّر تحميل الشاشة. حاول مرة أخرى، وإذا تكرر الأمر فأخبرنا.',
    notFoundTitle: 'غير موجود',
    notFoundBody: 'ربما تم حذف هذا السجل.',
  },
  booking: {
    chooseVehicle: 'اختر السيارة',
    chooseDateTime: 'اختر التاريخ والوقت',
    addOns: 'خدمات إضافية',
    pickupDropoff: 'الاستلام والتسليم',
    summary: 'الملخص',
    checkout: 'الدفع',
    confirm: 'تأكيد الحجز',
    status: {
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      inProgress: 'قيد التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغى',
    },
  },
  account: {
    title: 'الحساب',
    language: 'اللغة',
    languageSubtitle: 'اختر لغة التطبيق لتجربة الهاتف.',
    theme: 'المظهر',
    notifications: 'الإشعارات',
    signOut: 'تسجيل الخروج',
    restartRequired: 'إعادة التشغيل مطلوبة',
    restartBody: 'العربية تستخدم تخطيطاً من اليمين إلى اليسار. يجب إعادة تشغيل التطبيق لتطبيقه.',
    restartNow: 'إعادة التشغيل الآن',
  },
};

export const catalogues = { en, ar } as const;
export type AppLanguage = keyof typeof catalogues;
