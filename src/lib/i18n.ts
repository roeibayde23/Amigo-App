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
  demoMail: { from: string; subject: string; preview: string }[];
  defaultTasks: { text: string; recurring: boolean; done?: boolean }[];
  defaultEvents: { time: string; endTime: string; title: string; color: number }[];
  eventWords: string[]; stripWords: string[]; tomorrowWords: string[];
  ampmEvening: string; ampmNight: string;
  // added in the Next.js rebuild
  today: string; yesterday: string; demoMode: string; connected: string; signOut: string;
  reconnectTitle: string; reconnectBody: string; reconnectBtn: string;
  mailNotConfigured: string; mailFailed: string; retry: string; loading: string; noMails: string;
  recurDaily: string; recurWeekly: (days: string) => string; recurMonthly: (d: number) => string;
  dataError: string; back: string; prevDay: string; nextDay: string; settings: string; close: string;
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
    { from: "שי כהן", subject: "אישור לפגישה מחר", preview: "היי, מאשר את הפגישה מחר ב-9:00. נתראה במשרד..." },
    { from: "בנק הפועלים", subject: "עדכון יתרה חודשי", preview: "דוח הפעילות החודשי שלך מוכן לצפייה באזור האישי..." },
    { from: "ועד הבית", subject: "תשלום ועד בית — תזכורת", preview: "מזכירים כי התשלום החודשי יש להעביר עד ה-5 בחודש..." },
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
  eventWords: ["פגישה", "פגישת", "תור", "אירוע", "ניפגש", "נפגש", "להיפגש", "ראיון"],
  stripWords: ["תקבע לי", "קבע לי", "תקבעי לי", "קבעי לי", "קבע", "תזכיר לי", "תזכירי לי", "בבקשה"],
  tomorrowWords: ["מחר"],
  ampmEvening: "בערב", ampmNight: "בלילה",
  today: "היום", yesterday: "אתמול", demoMode: "מצב הדגמה", connected: "מחובר", signOut: "התנתק",
  reconnectTitle: "צריך לחבר מחדש את Gmail",
  reconnectBody: "ההרשאה של גוגל פגה (במצב Testing היא מתחדשת כל 7 ימים). התחבר שוב כדי לראות מיילים.",
  reconnectBtn: "חבר מחדש את Gmail",
  mailNotConfigured: "חיבור ה-Gmail עוד לא הוגדר בשרת (חסרים מפתחות).",
  mailFailed: "לא הצלחנו לטעון את המיילים כרגע.", retry: "נסה שוב", loading: "טוען...", noMails: "אין מיילים חדשים 📭",
  recurDaily: "כל יום", recurWeekly: (d) => "ימים " + d, recurMonthly: (d) => "ב-" + d + " לחודש",
  dataError: "שמירה נכשלה, נסה שוב", back: "חזרה", prevDay: "היום הקודם", nextDay: "היום הבא", settings: "הגדרות", close: "סגור",
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
    { from: "Shai Cohen", subject: "Confirming tomorrow's meeting", preview: "Hey, confirming our meeting tomorrow at 9. See you at the office..." },
    { from: "Bank Hapoalim", subject: "Monthly balance update", preview: "Your monthly activity report is ready to view in your account..." },
    { from: "Building Committee", subject: "HOA payment — reminder", preview: "Just a reminder that the monthly payment is due by the 5th..." },
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
  eventWords: ["meeting", "appointment", "call", "interview"],
  stripWords: ["set a", "schedule a", "remind me to", "please"],
  tomorrowWords: ["tomorrow"],
  ampmEvening: "pm", ampmNight: "pm",
  today: "Today", yesterday: "Yesterday", demoMode: "Demo mode", connected: "Connected", signOut: "Sign out",
  reconnectTitle: "Gmail needs to be reconnected",
  reconnectBody: "Google's permission expired (in Testing mode it lasts 7 days). Sign in again to see your email.",
  reconnectBtn: "Reconnect Gmail",
  mailNotConfigured: "Gmail isn't configured on the server yet (missing keys).",
  mailFailed: "Couldn't load your email right now.", retry: "Try again", loading: "Loading...", noMails: "No new emails 📭",
  recurDaily: "Daily", recurWeekly: (d) => d, recurMonthly: (d) => "Day " + d,
  dataError: "Saving failed, please try again", back: "Back", prevDay: "Previous day", nextDay: "Next day", settings: "Settings", close: "Close",
};

export const STRINGS: Record<Lang, Strings> = { he, en };
