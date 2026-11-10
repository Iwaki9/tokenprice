import Link from "next/link";
import { AdminLogin } from "@/components/admin/login-form";
import { logoutAction } from "@/lib/actions/admin";
import { isAdmin, usingDefaultPassword } from "@/lib/auth";
import { dictionaries } from "@/lib/i18n";
import { isLang } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];

  if (!(await isAdmin())) {
    return (
      <div className="wrap">
        <AdminLogin lang={lang} dict={dict} defaultPassword={usingDefaultPassword()} />
      </div>
    );
  }

  const links = [
    { href: `/${lang}/admin`, label: dict.admin.dashboard },
    { href: `/${lang}/admin/providers`, label: dict.admin.providersTab },
    { href: `/${lang}/admin/submissions`, label: dict.admin.submissionsTab },
    { href: `/${lang}/admin/clicks`, label: dict.admin.clicksTab },
  ];

  return (
    <div className="wrap py-8">
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <span className="mr-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
          {dict.admin.title}
        </span>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="chip !py-1 !text-[12.5px]">
            {link.label}
          </Link>
        ))}
        <form action={logoutAction} className="ml-auto">
          <input type="hidden" name="lang" value={lang} />
          <button type="submit" className="text-[12.5px] text-muted underline underline-offset-2 hover:text-ink">
            {dict.admin.signOut}
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
