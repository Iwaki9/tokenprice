import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap py-24 text-center">
      <p className="kicker">404</p>
      <h1 className="display mt-3 text-[38px]">Страница не найдена</h1>
      <p className="mt-2 text-[14px] text-muted">
        Возможно, модель или провайдер ещё не попали в индекс.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/ru/models" className="btn btn-primary">
          Модели
        </Link>
        <Link href="/ru" className="btn btn-ghost">
          На главную
        </Link>
      </div>
    </div>
  );
}
