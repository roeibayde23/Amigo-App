import Image from "next/image";
import Link from "next/link";
import { DEMO_MODE } from "@/lib/env";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import SessionWatcher from "@/components/SessionWatcher";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="app">
      <div className="topbar"><span className="brand-name">Amigo</span></div>
      <div className="inner login-wrap">
        <Image src="/images/amigo-dog.webp" alt="Amigo" width={389} height={460} className="login-dog" priority />
        <h1 className="login-title">
          שלום, אני <span className="name">אמיגו</span> 🐾
        </h1>
        <p className="login-sub">העוזר האישי שלך למיילים, ללו&quot;ז ולמשימות</p>
        {DEMO_MODE ? (
          <>
            <p className="login-sub">מצב הדגמה – Supabase לא מוגדר עדיין.</p>
            <Link href="/" className="login-btn">כניסה להדגמה</Link>
          </>
        ) : (
          <>
            <GoogleSignInButton next={next} label="התחברות עם Google" />
            <SessionWatcher next={next} />
          </>
        )}
        <p className="login-note">אמיגו מבקש הרשאת קריאה בלבד ל-Gmail שלך.</p>
      </div>
    </main>
  );
}
