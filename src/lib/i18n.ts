import type { Lang } from "./types";

type Greet = [string, string];

export type Strings = {
  menuMail: string; menuCal: string; menuTasks: string;
  addPlaceholder: string; emptyTasks: string; recurringTag: string;
  settingsTitle: string; darkModeLabel: string; emailLabel: string; emailSoon: string; langLabel: string;
  micTitle: string; micSub: string; micListening: string; micThinking: string; micSend: string;
  micHint: string; micAdded: string; detectedTask: string; detectedEvent: string; addBtn: string; cancelBtn: string;
  eventNewTitle: string; eventEditTitle: string;
  lblName: string; lblDate: string; lblStart: string; lblEnd: string; lblColor: string;
  namePlaceholder: string; saveBtn: string; cancelSheetBtn: string; deleteEventBtn: string;
  addEventLabel: string; demoLabel: string;
  dayCount: (n: number) => string;
  mailHeadTitle: string; mailCount: (n: number) => string;
  actOpen: string; actImportant: string; actTask: string; actHide: string;
  addedToTasksToast: string; importantStickerText: string;
  newTaskBtnLabel: string; regularTaskLabel: string; recurringTaskLabel: string;
  tasksPageTitle: string; tasksPageSub: (n: number) => string;
  recurringNewTitle: string; lblRecurringName: string; lblFrequency: string;
  freqMonthly: string; freqWeekly: string; freqDaily: string;
  lblWeekDays: string; lblMonthDay: string; saveRecurringBtn: string; weekDaysShort: string[];
  suggestEventLabel: string; suggestMailLabel: string; suggestTaskLabel: string;
  suggestNone: string; suggestNoneMeta: string;
  days: string[]; months: string[];
  greet: { night: Greet; morning: Greet; noon: Greet; evening: Greet; late: Greet };
  name: string;
  demoMail: { from: string; email: string; subject: string; preview: string; bulk?: boolean; category?: string; gmailImportant?: boolean }[];
  defaultTasks: { text: string; recurring: boolean; done?: boolean }[];
  defaultEvents: { time: string; endTime: string; title: string; color: number }[];
  eventWords: string[]; stripWords: string[];
  ampmEvening: string; ampmNight: string;
  // added in the Next.js rebuild
  today: string; yesterday: string; demoMode: string; connected: string; signOut: string;
  reconnectTitle: string; reconnectBody: string; reconnectBtn: string;
  mailNotConfigured: string; mailFailed: string; retry: string; loading: string; noMails: string;
  recurDaily: string; recurWeekly: (days: string) => string; recurMonthly: (d: number) => string;
  dataError: string; back: string; prevDay: string; nextDay: string; settings: string; close: string;
  // Google Calendar / Tasks sync
  googleAccount: string; reconnectGoogleTitle: string; reconnectGoogleBody: string; reconnectGoogleBtn: string;
  gApiDisabled: string; gFailed: string; gSaveFailed: string; gNotFound: string; gReconnectToast: string;
  savedCalendarToast: string; savedTasksToast: string; savedDemoEvent: string; savedDemoTask: string;
  allDay: string; noTimeHint: string; repeatLabel: string; repeatNone: string; recurringInstance: string;
  openInGoogle: string; dueToday: string; dueTomorrow: string; dueLabel: (d: string) => string; overdue: string;
  micSpeakNow: string; micVoiceHint: string; micTypeHint: string; micNoPermission: string; micNoSpeech: string;
  micAgain: string; switchToTask: string; switchToEvent: string; noDate: string; fromMail: string;
  micTapToTalk: string; micExample: string;
  micRecording: string; micTapToStop: string; micProcessing: string; micHeard: string; micTryAgain: string;
  micErrDenied: string; micErrNoMic: string; micErrBusyMic: string; micErrUnsupported: string;
  micErrFailed: string; micErrBusy: string; micErrOffline: string; micErrNoAnswer: string;
  // mail priority
  mailUrgent: string; mailOthers: string; mailLow: string; badgeUrgent: string; badgeImportant: string;
  askImportant: string; yes: string; no: string; showLow: (n: number) => string; hideLow: string;
  senderImportantToast: (who: string) => string; senderLowToast: (who: string) => string;
  // mini month calendar
  pickDate: string; prevMonth: string; nextMonth: string; goToday: string;
  // iPhone Reminders (Shortcuts)
  remindersLabel: string; remindersSub: string; remindersGuideTitle: string; remindersGuide: string[];
  remindersTest: string; remindersIosOnly: string; remindersTestTitle: string; sentToReminders: string;
};

const he: Strings = {
  menuMail: "מיילים", menuCal: 'לו"ז', menuTasks: "משימות",
  addPlaceholder: "הוסף משימה חדשה...", emptyTasks: "אין משימות כרגע — תוסיף אחת למעלה ✍️", recurringTag: "חוזר",
  settingsTitle: "הגדרות", darkModeLabel: "מצב לילה", emailLabel: "חיבור למייל", emailSoon: "בקרוב", langLabel: "שפה",
  micTitle: "הקלטה חכמה", micSub: 'כתוב מה שהיית אומר לאמיגו, לדוגמה: "תקבע לי פגישה מחר עם שי ב-9 בבוקר"',
  micListening: "מקשיב...", micThinking: "אמיגו מנתח את הבקשה...", micSend: "שלח",
  micHint: "גרסה זו מדמה זיהוי דיבור — הטקסט מתווסף אחרי אישור", micAdded: "נוסף בהצלחה ✓",
  detectedTask: "אמיגו זיהה: משימה", detectedEvent: 'אמיגו זיהה: אירוע בלו"ז', addBtn: "הוסף", cancelBtn: "ערוך מחדש",
  eventNewTitle: "אירוע חדש", eventEditTitle: "עריכת אירוע",
  lblName: "שם האירוע", lblDate: "תאריך", lblStart: "שעת התחלה", lblEnd: "שעת סיום", lblColor: "צבע",
  namePlaceholder: "פגישה, שיחה, משימה...", saveBtn: "שמור", cancelSheetBtn: "ביטול", deleteEventBtn: "ביטול אירוע",
  addEventLabel: "הוסף אירוע", demoLabel: "לדוגמה",
  dayCount: (n) => n + " אירועים",
  mailHeadTitle: "המיילים שלך", mailCount: (n) => n + " מיילים",
  actOpen: "פתח", actImportant: "חשוב", actTask: "משימה", actHide: "הסתר",
  addedToTasksToast: "התווסף למשימות ✓", importantStickerText: "חשוב!",
  newTaskBtnLabel: "משימה חדשה", regularTaskLabel: "משימה רגילה", recurringTaskLabel: "משימה קבועה",
  tasksPageTitle: "לוח המשימות ✓", tasksPageSub: (n) => (n === 1 ? "משימה 1 לביצוע" : "יש לך " + n + " משימות לביצוע"),
  recurringNewTitle: "משימה קבועה חדשה", lblRecurringName: "שם המשימה", lblFrequency: "תדירות",
  freqMonthly: "חודשי", freqWeekly: "שבועי", freqDaily: "כל יום",
  lblWeekDays: "באיזה ימים?", lblMonthDay: "באיזה יום בחודש?",
  saveRecurringBtn: "שמור משימה קבועה", weekDaysShort: ["א", "ב", "ג", "ד", "ה", "ו", "ש"],
  suggestEventLabel: "האירוע הקרוב שלך", suggestMailLabel: "מייל שכדאי להעיף בו מבט", suggestTaskLabel: "משימה מומלצת",
  suggestNone: "הכל נקי להיום ✨", suggestNoneMeta: "אין אירועים, מיילים דחופים או משימות פתוחות כרגע",
  days: ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "שבת"],
  months: ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"],
  greet: {
    night: ["לילה טוב", "עוד מעט בוקר חדש 🌙"],
    morning: ["בוקר טוב", "מה התוכנית להיום? ☀️"],
    noon: ["צהריים טובים", "איך מתקדם היום? 🌤️"],
    evening: ["ערב טוב", "סיכום קטן ליום שהיה? 🌆"],
    late: ["לילה טוב", "כדאי לתכנן את מחר? 🌙"],
  },
  name: "רועי",
  demoMail: [
    { from: "שי כהן", email: "shai.cohen@gmail.com", subject: "אישור לפגישה מחר", preview: "היי, מאשר את הפגישה מחר ב-9:00. נתראה במשרד...", gmailImportant: true },
    { from: "בנק הפועלים", email: "no-reply@bankhapoalim.co.il", subject: "עדכון יתרה חודשי", preview: "דוח הפעילות החודשי שלך מוכן לצפייה באזור האישי...", category: "UPDATES" },
    { from: "ועד הבית", email: "vaad.habait@gmail.com", subject: "תשלום ועד בית — תזכורת", preview: "מזכירים כי התשלום החודשי יש להעביר עד ה-5 בחודש..." },
    { from: "דנה לוי", email: "dana.levi@gmail.com", subject: "תמונות מהטיול", preview: "העליתי את כל התמונות לאלבום..." },
    { from: "Wolt", email: "news@wolt.com", subject: "20% הנחה על ההזמנה הבאה 🍕", preview: "רק השבוע...", bulk: true, category: "PROMOTIONS" },
  ],
  defaultTasks: [
    { text: "לשלם שכר דירה", recurring: true },
    { text: "להתכונן לפגישה עם שי", recurring: false },
    { text: "להזמין מתנה ליום הולדת", recurring: false, done: true },
  ],
  defaultEvents: [
    { time: "09:00", endTime: "09:30", title: "סנדאפ עם הצוות", color: 0 },
    { time: "11:00", endTime: "12:00", title: "פגישת תכנון שבועית", color: 1 },
    { time: "13:00", endTime: "14:00", title: "צהריים עם דנה", color: 2 },
    { time: "15:30", endTime: "16:30", title: "סקירת עיצוב עם לקוח", color: 3 },
    { time: "18:00", endTime: "19:00", title: "אימון בחדר כושר", color: 4 },
    { time: "21:30", endTime: "22:00", title: "שיחת צ'ק-אין עם המנהל", color: 5 },
  ],
  eventWords: ["פגישה", "פגישת", "תור ", "אירוע", "ניפגש", "נפגש", "להיפגש", "לפגוש", "ראיון", "ישיבה", "מפגש", "דייט", "ארוחת"],
  stripWords: ["תכניס ליומן", "תוסיף ליומן", "תוסיף משימה", "תרשום לי", "תקבע לי", "קבע לי", "תקבעי לי", "קבעי לי", "תזכיר לי", "תזכירי לי", "תוסיף", "תרשום", "קבע", "ליומן", "בבקשה"],
  ampmEvening: "בערב", ampmNight: "בלילה",
  today: "היום", yesterday: "אתמול", demoMode: "מצב הדגמה", connected: "מחובר", signOut: "התנתק",
  reconnectTitle: "צריך לחבר מחדש את Gmail",
  reconnectBody: "ההרשאה של גוגל פגה (במצב Testing היא מתחדשת כל 7 ימים). התחבר שוב כדי לראות מיילים.",
  reconnectBtn: "חבר מחדש את Gmail",
  mailNotConfigured: "חיבור ה-Gmail עוד לא הוגדר בשרת (חסרים מפתחות).",
  mailFailed: "לא הצלחנו לטעון את המיילים כרגע.", retry: "נסה שוב", loading: "טוען...", noMails: "אין מיילים חדשים 📭",
  recurDaily: "כל יום", recurWeekly: (d) => "ימים " + d, recurMonthly: (d) => "ב-" + d + " לחודש",
  dataError: "שמירה נכשלה, נסה שוב", back: "חזרה", prevDay: "היום הקודם", nextDay: "היום הבא", settings: "הגדרות", close: "סגור",
  googleAccount: "חשבון Google",
  reconnectGoogleTitle: "חיבור מחדש לגוגל (פעם אחת)",
  reconnectGoogleBody: "אמיגו מסתנכרן עכשיו עם יומן Google. כדי לאשר את ההרשאה החדשה צריך להתחבר מחדש פעם אחת בלבד.",
  reconnectGoogleBtn: "התחבר מחדש עם Google",
  gApiDisabled: "יומן Google עוד לא הופעל בשרת. נסה שוב בעוד כמה דקות.",
  gFailed: "לא הצלחנו לדבר עם גוגל כרגע. נסה שוב.",
  gSaveFailed: "השמירה בגוגל נכשלה, נסה שוב",
  gNotFound: "הפריט כבר לא קיים בגוגל",
  gReconnectToast: "צריך להתחבר מחדש לגוגל",
  savedCalendarToast: "נשמר ביומן גוגל ✓", savedTasksToast: "נשמר במשימות ✓",
  savedDemoEvent: "נשמר ביומן ✓", savedDemoTask: "נשמר במשימות ✓",
  allDay: "כל היום", noTimeHint: "בלי שעה = אירוע של כל היום", repeatLabel: "חזרה", repeatNone: "ללא",
  recurringInstance: "🔁 אירוע חוזר — השינוי יחול רק על המופע הזה",
  openInGoogle: "פתח ביומן Google",
  dueToday: "היום", dueTomorrow: "מחר", dueLabel: (d) => d, overdue: "באיחור",
  micSpeakNow: "מקשיב... דבר עכשיו 🎙️",
  micVoiceHint: "דבר או הקלד — אמיגו ישאל לפני שהוא שומר",
  micTypeHint: "הדפדפן הזה לא תומך בזיהוי דיבור — הקלד מה שהיית אומר",
  micNoPermission: "אין גישה למיקרופון — אפשר להקליד במקום",
  micNoSpeech: "לא שמעתי כלום — נסה שוב או הקלד",
  micAgain: "🎙️ דבר שוב",
  switchToTask: "זו בעצם משימה", switchToEvent: "זה בעצם אירוע",
  noDate: "בלי תאריך", fromMail: "מתוך מייל",
  micTapToTalk: "🎙️ לחץ ודבר", micExample: "לדוגמה: פגישה עם שי מחר ב-9",
  micRecording: "מקשיב...", micTapToStop: "לחץ לסיום", micProcessing: "מעבד...", micHeard: "שמעתי:",
  micTryAgain: "🎙️ נסה שוב",
  micErrDenied: "אין הרשאה למיקרופון. לחץ ״נסה שוב״ ובחר ״אפשר״. אם לא מופיעה שאלה: הגדרות ← אפליקציות ← Safari ← מיקרופון ← ״לשאול״. אפשר גם להקליד.",
  micErrNoMic: "לא נמצא מיקרופון — אפשר להקליד במקום",
  micErrBusyMic: "המיקרופון תפוס (שיחה? אפליקציה אחרת?) — סגור אותה ונסה שוב, או הקלד",
  micErrUnsupported: "הדפדפן הזה לא מאפשר הקלטה — הקלד מה שהיית אומר",
  micErrFailed: "לא הצלחתי להבין את ההקלטה — נסה שוב או הקלד",
  micErrBusy: "יותר מדי בקשות כרגע — נסה שוב בעוד דקה, או הקלד",
  micErrOffline: "אין חיבור לאינטרנט — נסה שוב או הקלד",
  micErrNoAnswer: "זיהוי הדיבור לא עונה — הקלד מה שהיית אומר",
  mailUrgent: "דחוף וחשוב", mailOthers: "שאר המיילים", mailLow: "פחות חשוב", badgeUrgent: "דחוף", badgeImportant: "חשוב",
  askImportant: "זה חשוב?", yes: "כן", no: "לא",
  showLow: (n) => `הצג ${n} מיילים פחות חשובים`, hideLow: "הסתר מיילים פחות חשובים",
  senderImportantToast: (w) => `מעכשיו מיילים מ${w} יופיעו למעלה ✓`,
  senderLowToast: (w) => `הבנתי, מיילים מ${w} יופיעו למטה`,
  pickDate: "בחר תאריך", prevMonth: "החודש הקודם", nextMonth: "החודש הבא", goToday: "היום",
  remindersLabel: "שליחת משימות לתזכורות באייפון",
  remindersSub: 'כל משימה חדשה נשלחת לאפליקציית התזכורות דרך הקיצור "Amigo Reminder"',
  remindersGuideTitle: "איך בונים את הקיצור (פעם אחת, כ-3 דקות)",
  remindersGuide: [
    'פתח את אפליקציית "קיצורים" (Shortcuts) באייפון ולחץ על ＋ למעלה.',
    'לחץ על שם הקיצור למעלה ושנה אותו ל: Amigo Reminder (באנגלית, בדיוק כך — A ו-R גדולות, רווח באמצע).',
    'לחץ "הוסף פעולה", חפש "מילון" (Dictionary) ובחר "קבל מילון מהקלט" (Get Dictionary from Input). הקלט צריך להיות "קלט קיצור" (Shortcut Input). אם למעלה מופיע "קבל קלט", בחר סוג: טקסט.',
    'הוסף פעולה "קבל ערך מילון" (Get Dictionary Value). לחץ על "מפתח" (Key) וכתוב: title',
    'הוסף שוב "קבל ערך מילון", והפעם כתוב במפתח: due',
    'הוסף פעולה "אם" (If). בתנאי בחר את "ערך מילון" האחרון (של due) ← "יש ערך כלשהו" (has any value).',
    'בתוך ה"אם": הוסף "הוסף תזכורת חדשה" (Add New Reminder). בשדה הטקסט בחר את המשתנה "ערך מילון" הראשון (של title). לחץ על החץ ▸ / "הצג עוד" ← "התראה" (Alert) ← "בזמן" (At Time), ובשדה התאריך בחר את "ערך מילון" של due.',
    'גרור לתוך "אחרת" (Otherwise) עוד פעולת "הוסף תזכורת חדשה" עם אותו title — בלי התראה (למשימות בלי תאריך).',
    'לחץ "סיום". חזור לאמיגו ← הגדרות ← "בדיקה". בפעם הראשונה אשר את "פתח בקיצורים" ואת הגישה לתזכורות ("אפשר תמיד").',
    'אחרי שהתזכורת נוספה, חוזרים לאמיגו בלחיצה על "◀ Safari" בפינה העליונה.',
  ],
  remindersTest: "בדיקה: שלח תזכורת לדוגמה", remindersIosOnly: "עובד רק באייפון / אייפד (Safari)",
  remindersTestTitle: "בדיקה מאמיגו 🐶", sentToReminders: "נשלח לתזכורות באייפון ✓",
};

const en: Strings = {
  menuMail: "Mail", menuCal: "Schedule", menuTasks: "Tasks",
  addPlaceholder: "Add a new task...", emptyTasks: "No tasks yet — add one above ✍️", recurringTag: "Recurring",
  settingsTitle: "Settings", darkModeLabel: "Night mode", emailLabel: "Connect email", emailSoon: "Soon", langLabel: "Language",
  micTitle: "Smart Recording", micSub: 'Type what you\'d say to Amigo, e.g. "Set a meeting with Shai tomorrow at 9am"',
  micListening: "Listening...", micThinking: "Amigo is thinking...", micSend: "Send",
  micHint: "This version simulates voice recognition — text is added after you confirm", micAdded: "Added successfully ✓",
  detectedTask: "Amigo detected: a task", detectedEvent: "Amigo detected: a calendar event", addBtn: "Add", cancelBtn: "Edit again",
  eventNewTitle: "New event", eventEditTitle: "Edit event",
  lblName: "Event name", lblDate: "Date", lblStart: "Start time", lblEnd: "End time", lblColor: "Color",
  namePlaceholder: "Meeting, call, task...", saveBtn: "Save", cancelSheetBtn: "Cancel", deleteEventBtn: "Cancel event",
  addEventLabel: "Add event", demoLabel: "Sample",
  dayCount: (n) => n + " events",
  mailHeadTitle: "Your emails", mailCount: (n) => n + " emails",
  actOpen: "Open", actImportant: "Important", actTask: "Task", actHide: "Hide",
  addedToTasksToast: "Added to tasks ✓", importantStickerText: "Important!",
  newTaskBtnLabel: "New task", regularTaskLabel: "Regular task", recurringTaskLabel: "Recurring task",
  tasksPageTitle: "Task board ✓", tasksPageSub: (n) => (n === 1 ? "1 task to do" : "You have " + n + " tasks to do"),
  recurringNewTitle: "New recurring task", lblRecurringName: "Task name", lblFrequency: "Frequency",
  freqMonthly: "Monthly", freqWeekly: "Weekly", freqDaily: "Daily",
  lblWeekDays: "Which days?", lblMonthDay: "Which day of month?",
  saveRecurringBtn: "Save recurring task", weekDaysShort: ["S", "M", "T", "W", "T", "F", "S"],
  suggestEventLabel: "Your next event", suggestMailLabel: "An email worth a look", suggestTaskLabel: "Suggested task",
  suggestNone: "All clear today ✨", suggestNoneMeta: "No events, urgent emails, or open tasks right now",
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  greet: {
    night: ["Good night", "Morning's not far 🌙"],
    morning: ["Good morning", "What's the plan today? ☀️"],
    noon: ["Good afternoon", "How's the day going? 🌤️"],
    evening: ["Good evening", "Time to recap the day? 🌆"],
    late: ["Good night", "Worth planning tomorrow? 🌙"],
  },
  name: "Roei",
  demoMail: [
    { from: "Shai Cohen", email: "shai.cohen@gmail.com", subject: "Confirming tomorrow's meeting", preview: "Hey, confirming our meeting tomorrow at 9. See you at the office...", gmailImportant: true },
    { from: "Bank Hapoalim", email: "no-reply@bankhapoalim.co.il", subject: "Monthly balance update", preview: "Your monthly activity report is ready to view in your account...", category: "UPDATES" },
    { from: "Building Committee", email: "vaad.habait@gmail.com", subject: "HOA payment — reminder", preview: "Just a reminder that the monthly payment is due by the 5th..." },
    { from: "Dana Levi", email: "dana.levi@gmail.com", subject: "Photos from the trip", preview: "I uploaded all the photos..." },
    { from: "Wolt", email: "news@wolt.com", subject: "20% off your next order 🍕", preview: "This week only...", bulk: true, category: "PROMOTIONS" },
  ],
  defaultTasks: [
    { text: "Pay rent", recurring: true },
    { text: "Prep for meeting with Shai", recurring: false },
    { text: "Order a birthday gift", recurring: false, done: true },
  ],
  defaultEvents: [
    { time: "09:00", endTime: "09:30", title: "Team standup", color: 0 },
    { time: "11:00", endTime: "12:00", title: "Weekly planning meeting", color: 1 },
    { time: "13:00", endTime: "14:00", title: "Lunch with Dana", color: 2 },
    { time: "15:30", endTime: "16:30", title: "Design review with client", color: 3 },
    { time: "18:00", endTime: "19:00", title: "Gym workout", color: 4 },
    { time: "21:30", endTime: "22:00", title: "Check-in call with manager", color: 5 },
  ],
  eventWords: ["meeting", "appointment", "interview", "dinner with", "lunch with"],
  stripWords: ["add to my calendar", "add a task to", "add a task", "set up a", "set a", "schedule a", "remind me to", "please"],
  ampmEvening: "pm", ampmNight: "pm",
  today: "Today", yesterday: "Yesterday", demoMode: "Demo mode", connected: "Connected", signOut: "Sign out",
  reconnectTitle: "Gmail needs to be reconnected",
  reconnectBody: "Google's permission expired (in Testing mode it lasts 7 days). Sign in again to see your email.",
  reconnectBtn: "Reconnect Gmail",
  mailNotConfigured: "Gmail isn't configured on the server yet (missing keys).",
  mailFailed: "Couldn't load your email right now.", retry: "Try again", loading: "Loading...", noMails: "No new emails 📭",
  recurDaily: "Daily", recurWeekly: (d) => d, recurMonthly: (d) => "Day " + d,
  dataError: "Saving failed, please try again", back: "Back", prevDay: "Previous day", nextDay: "Next day", settings: "Settings", close: "Close",
  googleAccount: "Google account",
  reconnectGoogleTitle: "Reconnect Google (one time)",
  reconnectGoogleBody: "Amigo now syncs with Google Calendar. Sign in again once to approve the new permission.",
  reconnectGoogleBtn: "Reconnect with Google",
  gApiDisabled: "Google Calendar isn't enabled on the server yet. Try again in a few minutes.",
  gFailed: "Couldn't reach Google right now. Please try again.",
  gSaveFailed: "Saving to Google failed, please try again",
  gNotFound: "This item no longer exists in Google",
  gReconnectToast: "Please reconnect Google",
  savedCalendarToast: "Saved to Google Calendar ✓", savedTasksToast: "Saved to tasks ✓",
  savedDemoEvent: "Saved to calendar ✓", savedDemoTask: "Saved to tasks ✓",
  allDay: "All day", noTimeHint: "No time = all-day event", repeatLabel: "Repeat", repeatNone: "None",
  recurringInstance: "🔁 Recurring event — changes apply to this occurrence only",
  openInGoogle: "Open in Google Calendar",
  dueToday: "Today", dueTomorrow: "Tomorrow", dueLabel: (d) => d, overdue: "Overdue",
  micSpeakNow: "Listening... speak now 🎙️",
  micVoiceHint: "Speak or type — Amigo asks before saving",
  micTypeHint: "This browser has no speech recognition — type what you'd say",
  micNoPermission: "No microphone access — you can type instead",
  micNoSpeech: "I didn't hear anything — try again or type",
  micAgain: "🎙️ Speak again",
  switchToTask: "Make it a task", switchToEvent: "Make it an event",
  noDate: "No date", fromMail: "From email",
  micTapToTalk: "🎙️ Tap and speak", micExample: "e.g. Meeting with Shai tomorrow at 9",
  micRecording: "Listening...", micTapToStop: "Tap to finish", micProcessing: "Processing...", micHeard: "I heard:",
  micTryAgain: "🎙️ Try again",
  micErrDenied: "No microphone permission. Tap “Try again” and choose “Allow”. If no prompt appears: Settings → Apps → Safari → Microphone → “Ask”. You can also type.",
  micErrNoMic: "No microphone found — you can type instead",
  micErrBusyMic: "The microphone is busy (a call? another app?) — close it and try again, or type",
  micErrUnsupported: "This browser can't record — type what you'd say",
  micErrFailed: "I couldn't understand the recording — try again or type",
  micErrBusy: "Too many requests right now — try again in a minute, or type",
  micErrOffline: "No internet connection — try again or type",
  micErrNoAnswer: "Speech recognition isn't responding — type what you'd say",
  mailUrgent: "Urgent & important", mailOthers: "Other emails", mailLow: "Less important", badgeUrgent: "Urgent", badgeImportant: "Important",
  askImportant: "Important?", yes: "Yes", no: "No",
  showLow: (n) => `Show ${n} less important emails`, hideLow: "Hide less important emails",
  senderImportantToast: (w) => `Emails from ${w} will now show at the top ✓`,
  senderLowToast: (w) => `Got it, emails from ${w} will show lower`,
  pickDate: "Pick a date", prevMonth: "Previous month", nextMonth: "Next month", goToday: "Today",
  remindersLabel: "Send tasks to iPhone Reminders",
  remindersSub: 'Every new task goes to the Reminders app via the "Amigo Reminder" shortcut',
  remindersGuideTitle: "How to build the shortcut (once, ~3 minutes)",
  remindersGuide: [
    'Open the Shortcuts app on your iPhone and tap ＋.',
    'Rename the shortcut to exactly: Amigo Reminder',
    'Add action "Get Dictionary from Input" (input = Shortcut Input). If "Receive input" shows at the top, choose type: Text.',
    'Add "Get Dictionary Value" with Key: title',
    'Add another "Get Dictionary Value" with Key: due',
    'Add "If": the last Dictionary Value (due) → "has any value".',
    'Inside If: "Add New Reminder" with the first Dictionary Value (title); Show More → Alert → At Time → the due Dictionary Value.',
    'In Otherwise: another "Add New Reminder" with the title only (no alert).',
    'Tap Done. In Amigo → Settings → "Test". Allow "Open in Shortcuts" and Reminders access ("Always Allow").',
    'After the reminder is added, tap "◀ Safari" at the top to return to Amigo.',
  ],
  remindersTest: "Test: send a sample reminder", remindersIosOnly: "Works on iPhone / iPad (Safari) only",
  remindersTestTitle: "Test from Amigo 🐶", sentToReminders: "Sent to iPhone Reminders ✓",
};

export const STRINGS: Record<Lang, Strings> = { he, en };
