import Link from "next/link";

export const metadata = {
  title: "Gizlilik Politikası · Mindfolio",
  description: "Mindfolio verilerini nasıl topluyor, saklıyor ve koruyor.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-zinc-800 dark:text-zinc-200">
      <Link href="/" className="text-sm text-emerald-600 hover:underline">← Ana Sayfa</Link>
      <h1 className="mt-6 text-3xl font-bold text-zinc-900 dark:text-zinc-50">Gizlilik Politikası</h1>
      <p className="mt-2 text-sm text-zinc-500">Son güncelleme: 1 Temmuz 2026</p>

      <div className="mt-10 space-y-6 leading-relaxed">
        <p>
          Mindfolio (&quot;biz&quot;, &quot;servis&quot;) olarak gizliliğine önem veriyoruz. Bu belge, hangi verileri
          topladığımızı, nasıl kullandığımızı ve haklarını açıklar.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">1. Topladığımız Veriler</h2>
          <p className="mt-2">Şu bilgileri topluyoruz:</p>
          <ul className="mt-2 ml-5 list-disc space-y-1.5">
            <li><strong>Hesap bilgileri:</strong> ad, e-posta adresi, şifre (hash'lenmiş).</li>
            <li><strong>Onboarding cevapları:</strong> içerik hedefin, uzmanlık alanın, ses profili tercihleri, hedef kitle, konumlandırma cümlen.</li>
            <li><strong>Opsiyonel içerik girdileri:</strong> LinkedIn URL'in, paylaştığın yazı örnekleri (import ettiğin metinler).</li>
            <li><strong>Üretilen içerik:</strong> AI'ın ürettiği taslaklar, platform çıktıları, kaydettiğin içerikler.</li>
            <li><strong>Ses kayıtları:</strong> transkript üretimi için geçici olarak alınır (bkz. bölüm 3).</li>
            <li><strong>Kullanım verisi:</strong> aylık içerik sayısı, oturum bilgisi (analitik amaçlı, kişisel değil).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">2. Verileri Nasıl Kullanıyoruz</h2>
          <ul className="mt-2 ml-5 list-disc space-y-1.5">
            <li>Hesabını çalıştırmak ve strateji üretmek</li>
            <li>Sana özel içerik pillar'ları ve taslaklar oluşturmak (AI ile)</li>
            <li>Servisin doğru çalışmasını sağlamak (hata izleme, güvenlik)</li>
            <li>Kritik uyarıları göndermek (e-posta ile)</li>
          </ul>
          <p className="mt-3">
            <strong>Verilerini üçüncü taraflara SATMAYIZ.</strong> Reklam ağlarıyla paylaşmayız.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">3. Ses Kayıtları — Saklanmaz</h2>
          <p className="mt-2">
            Stüdyo'da yaptığın ses kaydı Gemini AI ile transkripte çevrilir ve transkript üretimi
            <strong> tamamlandıktan hemen sonra silinir.</strong> Ham ses dosyaları sunucumuzda kalıcı olarak saklanmaz;
            sadece transkript metni (senin görebildiğin) kalır.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">4. Üçüncü Taraf Servisler</h2>
          <p className="mt-2">Şu servisleri kullanıyoruz:</p>
          <ul className="mt-2 ml-5 list-disc space-y-1.5">
            <li><strong>Supabase</strong> — kimlik doğrulama, veritabanı, depolama (ABD sunucuları)</li>
            <li><strong>Google Gemini API</strong> — AI persona ve içerik üretimi (Google'ın gizlilik politikasına tabi)</li>
            <li><strong>Netlify</strong> — web hosting</li>
            <li><strong>Google OAuth</strong> — Google ile giriş yaptığında</li>
          </ul>
          <p className="mt-3">
            AI'a gönderdiğin metinler Gemini API'ye iletilir. Google&apos;ın Gemini API için kullanıcı verilerini
            model eğitiminde <em>kullanmadığını</em> beyan ettiğini belirtelim (
            <a href="https://ai.google.dev/gemini-api/terms" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Gemini API Terms
            </a>).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">5. Veri Saklama Süresi</h2>
          <ul className="mt-2 ml-5 list-disc space-y-1.5">
            <li>Hesap ve içerik verilerin, sen silene kadar veya hesap kapatana kadar saklanır.</li>
            <li>Ses kayıtları: transkript üretimi biter bitmez silinir (dakikalar içinde).</li>
            <li>Ödeme kayıtları: yasal zorunluluk gereği 5 yıl saklanır.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">6. Haklarım</h2>
          <p className="mt-2">
            Verilerine ilişkin şu haklara sahipsin (KVKK Md. 11 ve GDPR):
          </p>
          <ul className="mt-2 ml-5 list-disc space-y-1.5">
            <li>Verilerin hakkında bilgi isteme</li>
            <li>Düzeltme veya silme talep etme (hesap ayarlarından ya da e-posta ile)</li>
            <li>Verilerini dışa aktarma (JSON formatında)</li>
            <li>Onay geri çekme</li>
            <li>Şikayet için: KVKK (Türkiye) veya yerel veri koruma otoritene başvuru</li>
          </ul>
          <p className="mt-3">
            Silme talebi için <a href="mailto:eren@omegadijital.com" className="text-emerald-600 hover:underline">eren@omegadijital.com</a> adresine yaz.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">7. Çocuklar</h2>
          <p className="mt-2">Mindfolio 13 yaş altı kullanıcılar için değildir; bu yaş grubundan bilinçli veri toplamayız.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">8. Güvenlik</h2>
          <p className="mt-2">
            Şifrelerini bcrypt ile hash'liyor, aktarımda TLS kullanıyor, veritabanı erişimini Row Level Security ile
            kullanıcıya kısıtlıyoruz. Yine de %100 güvenlik garantisi vermeyiz — güçlü şifre kullan ve e-posta erişimini koru.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">9. Değişiklikler</h2>
          <p className="mt-2">Bu politikayı güncelleyebiliriz. Önemli değişiklikleri e-posta ile bildiririz.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">10. İletişim</h2>
          <p className="mt-2">
            Sorular için: <a href="mailto:eren@omegadijital.com" className="text-emerald-600 hover:underline">eren@omegadijital.com</a>
          </p>
        </section>
      </div>

      <div className="mt-16 border-t border-zinc-200 dark:border-zinc-800 pt-6 flex gap-6 text-sm">
        <Link href="/terms" className="text-emerald-600 hover:underline">Kullanım Koşulları</Link>
        <Link href="/" className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">Ana Sayfa</Link>
      </div>
    </main>
  );
}
