import Link from "next/link";

export const metadata = {
  title: "Kullanım Koşulları · Mindfolio",
  description: "Mindfolio servisini kullanma şartları.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-zinc-800 dark:text-zinc-200">
      <Link href="/" className="text-sm text-emerald-600 hover:underline">← Ana Sayfa</Link>
      <h1 className="mt-6 text-3xl font-bold text-zinc-900 dark:text-zinc-50">Kullanım Koşulları</h1>
      <p className="mt-2 text-sm text-zinc-500">Son güncelleme: 1 Temmuz 2026</p>

      <div className="mt-10 space-y-6 leading-relaxed">
        <p>
          Mindfolio&apos;yu (&quot;servis&quot;) kullanarak aşağıdaki koşulları kabul etmiş sayılırsın. Kabul etmiyorsan
          servisi kullanma.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">1. Servisi Ne Sunuyor</h2>
          <p className="mt-2">
            Mindfolio, içerik üreticileri için AI destekli persona ve içerik üretim aracıdır. Onboarding'de
            verdiğin bilgilerle Google Gemini AI kullanarak sana özel bir konumlandırma, içerik pillar'ları,
            ses profili ve örnek postlar üretir. Stüdyo'da sese/metne dayalı taslak ve platform çıktıları oluşturur.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">2. Hesap ve Sorumluluk</h2>
          <ul className="mt-2 ml-5 list-disc space-y-1.5">
            <li>Hesap açmak için 13 yaşından büyük olman gerekir.</li>
            <li>Doğru bilgi vermek ve hesap güvenliğini korumak senin sorumluluğundur.</li>
            <li>Şifreni kimseyle paylaşma; yetkisiz erişim şüphen varsa hemen değiştir.</li>
            <li>Bir hesap yalnızca bir kişiye aittir; hesap satılamaz veya devredilemez.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">3. İzin Verilen Kullanım</h2>
          <p className="mt-2">
            Servisi yalnızca yasal amaçlar için kullanabilirsin. Şunları yapamazsın:
          </p>
          <ul className="mt-2 ml-5 list-disc space-y-1.5">
            <li>Nefret söylemi, taciz, ayrımcılık içeren içerik üretmek</li>
            <li>Yanıltıcı, dolandırıcılık amaçlı veya spam içerik yaymak</li>
            <li>Başkalarının fikri mülkiyetini ihlal eden içerik üretmek</li>
            <li>Servisin altyapısını manipüle etmek, tersine mühendislik yapmak veya rate limit'leri aşmaya çalışmak</li>
            <li>Otomatik araçlarla (bot, scraper) hesaplar oluşturmak</li>
          </ul>
          <p className="mt-3">
            Bu maddelere aykırı kullanım tespit edilirse hesabı önceden haber vermeksizin askıya alabiliriz.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">4. Üretilen İçeriğin Sahipliği</h2>
          <ul className="mt-2 ml-5 list-disc space-y-1.5">
            <li>
              <strong>Senin girdilerin senin.</strong> Verdiğin cevaplar, yazdığın metinler, kaydettiğin sesler senin
              fikri mülkiyetindir.
            </li>
            <li>
              <strong>AI'ın ürettiği çıktı da senin.</strong> Mindfolio'nun ürettiği taslakları istediğin gibi
              düzenleyebilir, yayınlayabilirsin. Bize atıfta bulunma zorunluluğun yok.
            </li>
            <li>
              Sen üretilen içeriğin doğruluğundan ve yayınlamasından tamamen sorumlusun. AI hata yapabilir,
              yayınlamadan önce her zaman kontrol et.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">5. Abonelik ve Ödeme</h2>
          <ul className="mt-2 ml-5 list-disc space-y-1.5">
            <li>
              <strong>Ücretsiz plan:</strong> 30 saniye ses kaydı limiti, 3 içerik hakkı, sınırlı strateji görünümü.
            </li>
            <li>
              <strong>Pro plan:</strong> Aylık ₺249,99 veya Yıllık ₺1.899 (~%37 indirim). Tam strateji, sınırsız içerik
              üretimi, tüm platform çıktıları.
            </li>
            <li>
              Ödemeler otomatik yenilenir. İptal etmek için Ayarlar → Abonelik'ten iptal edebilirsin — dönem sonuna
              kadar Pro erişim devam eder, sonra ücretsiz plana geçersin.
            </li>
            <li>
              Türkiye'de Apple Pay bulunmadığından mobil ödemeler App Store IAP üzerinden yürür (App Store
              koşulları uygulanır).
            </li>
            <li>
              <strong>İade politikası:</strong> Aboneliği ilk 7 gün içinde iptal edip talep edersen tam iade alırsın.
              7 gün sonrası için iade dönem içinde kalan gün oranında değerlendirilir.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">6. Servis Değişiklikleri</h2>
          <p className="mt-2">
            Özellikleri, fiyatlandırmayı ve kullanım limitlerini değiştirme hakkımızı saklı tutuyoruz. Önemli
            değişiklikler öncesinde e-posta ile bildirim yaparız.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">7. Servis Kesintileri</h2>
          <p className="mt-2">
            %100 uptime garantisi vermeyiz. Bakım, güncelleme veya üçüncü taraf (Supabase, Gemini API) kesintileri
            yaşanabilir. Uzun süreli kesintide oransal iade değerlendirilir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">8. Sorumluluk Sınırlaması</h2>
          <p className="mt-2">
            Servis &quot;olduğu gibi&quot; sunulur. Üretilen içeriğin doğruluğu, uygunluğu veya sonuçları için
            garanti vermeyiz. Kar kaybı, veri kaybı veya dolaylı zararlar için sorumluluk kabul etmeyiz — yasa çerçevesinde
            sorumluluğumuz senin bize ödediğin son 12 aylık abonelik bedeliyle sınırlıdır.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">9. Hesap Kapatma</h2>
          <ul className="mt-2 ml-5 list-disc space-y-1.5">
            <li>Sen istediğin an ayarlardan hesabını kapatabilirsin — 30 gün içinde tüm verilerin silinir.</li>
            <li>
              Kullanım koşullarını ciddi ihlal edersen (Bölüm 3) hesabını haber vermeksizin kapatabiliriz;
              bu durumda kalan abonelik iade edilmez.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">10. Geçerli Hukuk</h2>
          <p className="mt-2">
            Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda İstanbul Mahkemeleri yetkilidir.
            Tüketici korumasına dair hakların saklıdır.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">11. Değişiklikler</h2>
          <p className="mt-2">
            Bu koşulları güncelleyebiliriz. Önemli değişikliklerde önceden bildirim yaparız. Servisi kullanmaya devam
            etmen güncel koşulları kabul ettiğin anlamına gelir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">12. İletişim</h2>
          <p className="mt-2">
            Sorular için: <a href="mailto:eren@omegadijital.com" className="text-emerald-600 hover:underline">eren@omegadijital.com</a>
          </p>
        </section>
      </div>

      <div className="mt-16 border-t border-zinc-200 dark:border-zinc-800 pt-6 flex gap-6 text-sm">
        <Link href="/privacy" className="text-emerald-600 hover:underline">Gizlilik Politikası</Link>
        <Link href="/" className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">Ana Sayfa</Link>
      </div>
    </main>
  );
}
