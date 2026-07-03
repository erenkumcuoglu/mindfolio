# Mindfolio — Tasarım Brief'i (Claude Design için)

Bu doküman, uygulamanın **bugünkü gerçek hâlini** (akış, menü kuralları, veri saklama) ve **kozmetik iyileştirme fırsatlarını** özetler. Amaç: Claude Design'ın çekirdek işleve dokunmadan görsel/UX katmanını geliştirebilmesi.

> Temel ilke: **Mobil = ana ürün, web = onun yansıması.** Çekirdek akış (sesi içeriğe çevir) korunur; tasarım katmanı serbest.

---

## 1. Ürün özeti
Mindfolio, kullanıcının **sesini içeriğe** dönüştüren bir içerik stratejisi aracıdır. Kullanıcı konuşur → transkript çıkar → kişisel **persona**'sına uygun bir blog taslağı + platform paylaşımları (LinkedIn/X/Substack) üretilir. Ürünün kalbi "yayın aracı" değil, **kişisel strateji + persona**'dır.

- **Platformlar:** Mobil (Expo / React Native, ana ürün) + Web (Next.js, mobil-web çerçevesi).
- **AI:** Gemini (transkripsiyon + üretim). Üretim, kullanıcının persona profiliyle beslenir.
- **Backend:** Supabase (Auth, Postgres, Storage).

---

## 2. Tasarım sistemi (mevcut)
- **Tema:** **Light-first.** Koyu tema yalnızca kullanıcı açarsa. (Dark-first YAPILMAZ.)
- **Aksan rengi:** Emerald — light `#059669`, dark `#10b981`. Gradient: accent → accentDeep.
- **Yüzey:** Light arka plan `#F2F2F7` (iOS-vari), kartlar "liquid glass" (yarı saydam + ince kenar + blur hissi).
- **Köşeler:** pill (999), kart (~18), buton (~12). **Tipografi:** display 34 / h1 28 / h2 20 / body 15.
- **Dil:** Cihaz diline göre otomatik **TR/EN** (TR varsayılan), profilden değiştirilebilir (kalıcı).
- **Bileşenler:** GlassCard, GlassButton (primary/secondary/ghost), temalı **DialogHost** (tüm onay/uyarılar — sistem dialog'u YOK), Toast, AnimatedWave, Markdown render.

### Menü kuralları (alt navigasyon)
- 4 sekme: **Stüdyo · İçerikler · Fikirler · Profil** (yalnızca ikon, etiket yok).
- "Island" tab bar: **cam + sürekli kayan/yaylanan aktif "bubble"** vurgusu; altta home-indicator çubuğu.
- Gamification YOK (🔥 streak vb. kaldırıldı).
- Ekran üst boşlukları tutarlı (~56px), başlıklar üstte; kartlar nefes alacak şekilde.

---

## 3. Uçtan uca akış

### 3.1 Açılış & Giriş
1. **Splash:** marka logosu + "Sesini içeriğe dönüştür" + sürekli dalga animasyonu (min ~1.5sn).
2. **Giriş (3 parçalı):** üst = logo/marka · orta = karşılama + dalga · alt 1/3 = auth (Apple / Google / E-posta). E-posta adımı ayrı form.

### 3.2 Onboarding (persona oluşturma)
- Soru-cevap akışı (warmup/motivasyon ekranları + seçimler), 2 part: kısa "teaser" persona → paywall → tam strateji.
- Açılışta **davet/promo kodu** girişi (ek hakların en baştan tanımlanması).
- Sonunda Gemini persona üretir ve kaydeder; "reveal" ekranlarında konumlandırma/pillar/ses/örnek post gösterilir.

### 3.3 Stüdyo (çekirdek akış)
1. **Hero mic** (gradient daire + sürekli ripple) — ana eylem. Yanında ikincil: **Ses Dosyası Yükle**, **Metin Yaz**.
2. Mikrofona basınca **3-2-1 geri sayım** → kayıt (canlı equalizer, duraklat/durdur).
3. **Segmentler** ekranı (çok parçalı kayıt; ses gizlilik notu; Stüdyo'ya dön butonu).
4. **Transkript & Notlar:** transkript (düzenlenebilir) + **çıktı dili** seçimi + **ek notlar** ("atladığın/vurgulamak istediğin yerler").
5. **Taslak Üret** → **markdown render** edilen blog taslağı (## başlık, **kalın**, > alıntı). En başta 3 başlık alternatifi.
6. **Platform çıktıları:** LinkedIn / X / Substack (hook + özet), saklanır.
7. **Content'e Kaydet.** Yarım bırakılırsa: **"Kaldığın yerden devam?"** popup + ana sayfada "Devam eden çalışma" kartı (Taslak/Transcript badge'i).

### 3.4 İçerikler (Content)
- Tek-kolon liste; üstte **segmented durum kontrolü** (Tümü/Taslak/Yayında/Arşiv) + pillar filtreleri.
- Kart: kategori etiketi · durum etiketi · tarih · 2 satır önizleme · **Kopyala**.
- Aksiyon: **sağa kaydır → Yayınla**, **sola kaydır → Arşivle/Geri al** (web'de butonlar). Editör alttan açılır; düzenle + platform çıktıları + sil.

### 3.5 Fikirler (Ideas)
- Anlık arama (ilk 5 + "Sonraki 5"), URL ekleyince otomatik önizleme, etiket sistemi (uzun-bas düzenle/sil), jiggle-silme.

### 3.6 Profil (strateji belgesi)
- **Strateji**: konumlandırma + amaç, açıklamalı pillar'lar, ses profili + ton, **farklılaşma (✓Yap/✕Kaçın)**, hedef kitle, değerler, **örnek post**, önerilen platformlar + yayın sıklığı.
- **Düzenle** → tek **Kaydet** + **✨ AI ile Yeniden Üret**; **persona ayda yalnızca 1 kez** değişir (gerekçeli popup).
- **Kullanım & Abonelik** (kota %/bar, plan), **Dil** seçimi, **Promo**, **Davet Et & Kazan**, çıkış.

---

## 4. Veri saklama & gizlilik (KESİN kurallar)
- **Ham ses: SAKLANMAZ.** Transkripsiyon biter bitmez silinir (gizlilik + güvenlik). Mesaj: "Ses kaydın kişisel verilerin gizliliği ve güvenliği gereği saklanmaz, işlem sonrası silinir."
- **Transkript + taslaklar: SÜRESİZ saklanır** (cihazda taslak + Supabase `content`).
- **Persona profili:** Supabase `personas.profile` (jsonb). **Ayda 1 kez** değiştirilebilir (`persona_changed_at`).
- **İçerik:** `content` — `status` (draft/published/archived), `source` (recording/text), `excerpts` (jsonb), `category`, `scheduled_at`.
- **Sistem:** kritik hatalar `error_events` + **Telegram** bildirimi; promo/referral/admin tabloları.

---

## 5. Persona veri seti: Onboarding ↔ Uygulama eşleşmesi
**Genel sonuç: büyük ölçüde eşleşiyor.** Onboarding cevapları AI üretim girdisine, üretilen persona alanları hem Profil ekranına hem Studio üretim prompt'una (renderPersonaProfile) aynen akıyor.

| Alan | Onboarding toplar mı? | Uygulamada kullanılıyor mu? | Durum |
|---|---|---|---|
| goal / hedef → `purpose` | ✅ | Profil + üretim | ✅ eşleşir |
| field → `demographics.industry` | ✅ | Profil + üretim | ✅ |
| voiceTraits → `voice_profile` + `tone` | ✅ | Profil + üretim | ✅ |
| audience → `audience` | ✅ | Profil + üretim | ✅ |
| positioning → `positioning_statement` | ✅ | Profil (hero) + üretim | ✅ |
| hotTakes/format/cadence/antiposition/inspiration | ✅ | Üretim girdisi (pillar/diff/cadence'e dönüşür) | ✅ |
| `pillars` (başlık + açıklama) | ✅ (AI üretir) | Profil + üretim | 🟡 düzenlemede sadece **başlık** editlenir, açıklama AI'dan gelir (sürüklenme riski) |
| `differentiation`, `sample_post`, `suggested_platforms`, `values`, `topics` | ✅ (AI üretir) | Profil'de gösterilir + üretim | ✅ |
| **LinkedIn profil linki** (`linkedin_url`) | ❌ **onboarding'de YOK** | Profil'de düzenlenebilir; üretimde kullanılabilir | 🟡 **boşluk** — yeni kullanıcıda boş gelir |
| **Yardımcı link/makale** (`importedContent`) | 🟡 veri modelinde var ama **görünür giriş ekranı YOK** | AI üretimine beslenir; Profil'de "yardımcı notlar" olarak var | 🟡 **boşluk** — onboarding'de toplanamıyor |

### Önerilen onboarding düzeltmeleri (briefe dahil)
1. **LinkedIn profil linki adımı** ekle (opsiyonel) → `linkedin_url`.
2. **"İçeriğini içe aktar" adımı** (URL/metin yapıştır) → `importedContent` (kullanıcıyı daha iyi tanıma).
3. Pillar düzenlemede **açıklamayı da** editlenebilir yap (başlık-açıklama tutarlılığı).
4. Persona kilidini (ayda 1) pillar düzenlemeyle de hizala (şu an pillar serbest düzenleniyor).

---

## 6. C — Kozmetik / UX fırsatları (Claude Design briefi)
Çekirdek akış ve fonksiyon korunarak yapılabilecekler:

1. **Splash & Giriş cilası:** Marka kimliğini güçlendir (logo animasyonu, mikro-etkileşim, daha sıcak karşılama). 3-parça iskelet hazır; görsel dil + tipografi + boşluk ritmi geliştirilebilir.
2. **Landing / pazarlama sitesi:** Şu an `/` sade bir splash. Gerçek bir tanıtım sayfası (değer önermesi, akış görselleri, sosyal kanıt, CTA) yok — sıfırdan tasarlanabilir.
3. **Adaptif web çerçevesi:** Şu an mobil-web genişliği. Desktopta **iki-kolon** Stüdyo (sol: hero/kayıt, sağ: transkript/taslak), dar ekranda tek-kolona düşen responsive grid. Çekirdek akış aynı.
4. **Onboarding görsel kalitesi:** reveal/persona ekranlarının görsel sunumu, ilerleme hissi, mikro-animasyonlar; (yukarıdaki LinkedIn/import adımlarının tasarımı dahil).
5. **Görsel tutarlılık geçişi:** İki platformda tipografi ölçeği, ikonografi, boşluk ve glass efektlerinin standardizasyonu.
6. **Profil "strateji belgesi" sunumu:** Bilgi yoğun; görsel hiyerarşi, bölüm ikonları, "örnek post" ve "farklılaşma" kartlarının daha çekici sunumu.
7. **Boş durumlar (empty states):** Henüz içerik/fikir/persona yokken yönlendirici, motive edici ekranlar.

### Dokunulmaması gerekenler (kısıt)
- Ham ses saklama politikası (saklanmaz).
- Persona ayda-1 değişim kuralı.
- Çekirdek Stüdyo akış sırası: hero mic → geri sayım → kayıt/segment → transkript(+dil+notlar) → taslak → platform çıktıları → kaydet.
- Alt menü 4 sekme + cam/bubble; light-first; gamification yok.

---

## 7. Bugünkü teknik durum (özet)
- Mobil + web `tsc` temiz. Web, mobile büyük ölçüde uyarlandı.
- Git: web commit'lendi; mobil yedeği bekliyor (kendi repo'su kurulacak).
- Deploy öncesi yapılacaklar: `DEPLOY-ONCESI-YAPILACAKLAR.md`.
