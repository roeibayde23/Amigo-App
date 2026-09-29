import Link from "next/link";

const MESSAGES: Record<string, { he: string; en: string }> = {
  not_allowed: { he: "החשבון הזה לא מורשה להשתמש באמיגו.", en: "This Google account is not allowed to use Amigo." },
  exchange_failed: { he: "ההתחברות נכשלה. נסה שוב.", en: "Sign-in failed. Please try again." },
  missing_code: { he: "חסר קוד התחברות מגוגל.", en: "Google did not return a sign-in code." },
};

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason = "" } = await searchParams;
  const msg = MESSAGES[reason] ?? { he: "משהו השתבש בהתחברות.", en: reason || "Something went wrong." };
  return (
    <main className="app">
      <div className="inner login-wrap">
        <h1 className="login-title">אופס…</h1>
        <p className="login-sub">{msg.he}</p>
        <p className="login-sub" dir="ltr">{msg.en}</p>
        <Link href="/login" className="login-btn">חזרה להתחברות</Link>
      </div>
    </main>
  );
}
