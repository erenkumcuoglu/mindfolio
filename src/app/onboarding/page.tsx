"use client";

import { useState, useEffect, useCallback, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { ThemeToggle } from "@/components/app/ThemeToggle";

type StepType = "message" | "motivation" | "warmup" | "reveal" | "single" | "multi" | "input" | "tag-input" | "loader" | "paywall" | "done";

interface Option {
  id: string;
  label: string;
  emoji?: string;
}

interface Step {
  id: string;
  type: StepType;
  part: 1 | 2;
  title: string;
  description?: string;
  options?: Option[];
  placeholder?: string;
  validate?: (answers: Record<string, unknown>) => boolean;
  loaderLabel?: string;
  multiMax?: number;
}

function getWarmupContent(prevStepId: string, answers: Answers): { title: string; description: string } {
  const goal: Record<string, { title: string; description: string }> = {
    brand: {
      title: "Kişisel marka bir gecede olmaz.",
      description: "Kişisel marka çoğu zaman düzenli frekansta ve spesifik dikeylerde içerik üretmeyi gerektirir. Mindfolio bu yolda en büyük destekçin olacak.",
    },
    visibility: {
      title: "Görünürlük şans değil, tutarlılıktır.",
      description: "Görünürlük şans değil, tutarlılıktır. Doğru ritmi birlikte kuracağız.",
    },
    inbound: {
      title: "İyi içerik fırsatları kapına getirir.",
      description: "İyi içerik, peşinden koşmadığın fırsatları kapına getirir. Hedefimiz tam bu.",
    },
    audience: {
      title: "Kitle, değer veren içerikle büyür.",
      description: "Kitle, değer veren içerikle büyür. Neyi iyi yaptığını bulup ölçekleyelim.",
    },
  };

  const fieldMsgs: Record<string, { title: string; description: string }> = {
    finance: {
      title: "Finans içerikleri zor sayılır.",
      description: "Finans içerikleri zor sayılır — sıkıcı, anlaşılması güç bulunur. Oysa öyle olmak zorunda değil; birlikte farklı bir ton yaratabiliriz.",
    },
    tech: {
      title: "Teknolojide 'neden' fark yaratır.",
      description: "Teknolojide herkes 'ne' yaptığını anlatır; biz 'neden'ini ve hikâyeni öne çıkaracağız.",
    },
    business: {
      title: "Pazarlamacının kendi pazarlaması en zorudur.",
      description: "Pazarlamacının kendi pazarlaması en zorudur. Sana da bir stratejist lazım — işte buradayız.",
    },
    creative: {
      title: "Girişimci hikâyeleri en çok bağ kuran içeriklerdir.",
      description: "Girişimci hikâyeleri en çok bağ kuran içeriklerdir. Senin sahadaki yara izlerin en güçlü malzemen.",
    },
    science: {
      title: "Karmaşığı basit anlatmak en büyük beceridir.",
      description: "Karmaşık konuları sadeleştirmek en değerli yeteneklerden biridir. Bunun için buradayım.",
    },
    other: {
      title: "İnsanlar insanlarla bağ kurar.",
      description: "İnsanlar insanlarla bağ kurar. Senin perspektifin tam da bu yüzden değerli.",
    },
  };

  const audienceMsgs: Record<string, { title: string; description: string }> = {
    leaders: {
      title: "Yöneticiler az ama derin okur.",
      description: "Yöneticiler az ama derin okur. Net ve kanıtlı bir ton kuracağız.",
    },
    founders: {
      title: "Girişimciler ham dürüstlük sever.",
      description: "Girişimciler ham dürüstlüğü sever. Filtresiz tarafın burada işine yarayacak.",
    },
    peers: {
      title: "Uzmana uzman gibi konuşmak güven yaratır.",
      description: "Uzmana uzman gibi konuşmak güven yaratır. Derinliğini öne çıkaracağız.",
    },
    public: {
      title: "Geniş kitlede sadelik kazanır.",
      description: "Geniş kitlede sadelik kazanır. Karmaşığı basit anlatmayı birlikte yapacağız.",
    },
  };

  if (prevStepId === "goal") {
    const g = answers.goal;
    if (g && goal[g]) return goal[g];
  }
  if (prevStepId === "field") {
    const f = answers.field;
    if (f && fieldMsgs[f]) return fieldMsgs[f];
  }
  if (prevStepId === "hasContent") {
    if (answers.hasContent === "yes") {
      return {
        title: "Harika, sıfırdan başlamıyorsun.",
        description: "Güzel — içeriklerini incelediğimde tonunu anlamam çok daha kolay olacak.",
      };
    }
    return {
      title: "Sorun değil, buradayız.",
      description: "Sorun değil, zaten başlaman için buradayım. Sıfırdan birlikte kuracağız.",
    };
  }
  if (prevStepId === "voiceTraits") {
    return {
      title: "Sesini duymaya başladım bile.",
      description: "Sesini duymaya başladım bile. Bunu kalıcı hale getireceğiz.",
    };
  }
  if (prevStepId === "audience") {
    const a = answers.audience;
    if (a.includes("leaders")) return audienceMsgs.leaders;
    if (a.includes("founders")) return audienceMsgs.founders;
    if (a.includes("peers")) return audienceMsgs.peers;
    if (a.includes("public")) return audienceMsgs.public;
  }
  if (prevStepId === "positioning") {
    return {
      title: "İşte çekirdek bu.",
      description: "İşte çekirdek bu. Şimdi bunu gerçek bir stratejiye dönüştürüyorum…",
    };
  }
  if (prevStepId === "linkedin-url") {
    return {
      title: "LinkedIn alındı.",
      description: "Profil verisi sesini ve temalarını yakalamaya başlayacak.",
    };
  }
  if (prevStepId === "import-content") {
    return {
      title: "Anladım, hemen inceliyorum.",
      description: "Link veya metni alıyorum. Birazdan sesini ve temalarını çıkarmaya başlayacağız.",
    };
  }
  if (prevStepId === "warmup-enrich") {
    return {
      title: "Profil zenginleştirme tamamlandı.",
      description: "Profil verilerin hazır — şimdi yazı sesine bakıyoruz.",
    };
  }

  return { title: "Harika cevap.", description: "Harika. Birazdan seni şaşırtacak bir profil çıkaracağız." };
}

const GOAL_LABELS: Record<string, string> = {
  visibility: "Alanımda bilinmek",
  inbound: "İşime talep yaratmak",
  brand: "Kişisel marka inşası",
  audience: "Kitle ve topluluk oluşturmak",
};

const FIELD_LABELS: Record<string, string> = {
  tech: "Teknoloji / Yazılım / AI",
  business: "İş / Girişimcilik / Strateji",
  creative: "Yaratıcı / Tasarım / Medya",
  science: "Bilim / Sağlık / Akademi",
  finance: "Finans / Yatırım / Ekonomi",
  other: "Diğer",
};

const VOICE_LABELS: Record<string, string> = {
  casual: "Samimi / Günlük dil",
  formal: "Resmi / Profesyonel",
  story: "Hikaye anlatan",
  data: "Veri odaklı",
  sharp: "Kısa / Çarpıcı",
  deep: "Derin / Kapsamlı",
  humor: "Espri / Oyunbaz",
  emotive: "Duygusal / İlham verici",
};

const AUDIENCE_LABELS: Record<string, string> = {
  peers: "Alanımdaki profesyoneller",
  founders: "Girişimciler",
  leaders: "Yöneticiler / Karar alıcılar",
  ic: "Ürün/mühendislik ekipleri",
  recruit: "Öğrenciler / Kariyer başı",
  public: "Genel kamu",
};

const HOTTAKE_LABELS: Record<string, string> = {
  industry: "Sektör trendleri/dogmaları",
  tools: "Araçlar/metodolojiler",
  culture: "İş kültürü/yönetim",
  future: "Gelecek/teknoloji/toplum",
  none: "Henüz net aykırı görüşüm yok",
};

const FORMAT_LABELS: Record<string, string> = {
  long: "Uzun yazı / makale",
  short: "Kısa post",
  video: "Video script",
  carousel: "Carousel / slayt",
  audio: "Sesli / podcast",
};

const CADENCE_LABELS: Record<string, string> = {
  daily: "Hemen her gün",
  weekly: "Haftada 2-3 kez",
  biweekly: "Haftada 1 kez",
  monthly: "Ayda 2-3 kez",
};

const ANTIPOSITION_LABELS: Record<string, string> = {
  clickbait: "Tık tuzağı",
  corpo: "Kurumsal jargon",
  toxic: "Negatif/polemik",
  fluff: "Yüzeysel içerik",
  expert: "Ukalalık",
  hype: "Abartılı iyimserlik",
};

const INSPIRATION_LABELS: Record<string, string> = {
  elon: "Teknik founder'lar",
  pg: "Essayist'ler",
  lenny: "Newsletter yazarları",
  altman: "Tech thinker'lar",
  naval: "Felsefi iş yazarları",
  seth: "Pazarlama yazarları",
  other: "Başka",
};

const MOTIVATION_STEPS: Step[] = [
  {
    id: "motivation-1",
    type: "motivation",
    part: 1,
    title: '"Neden içerik üretmeliyim ki?"',
    description:
      "İçerik üretmek, uzmanlığını görünür kılmanın en güçlü yolu.\n\nİnsanlar tanımadıkları birine güvenmez — düzenli içerik, seni alanında akılda kalan isim yapar.",
  },
  {
    id: "motivation-2",
    type: "motivation",
    part: 1,
    title: '"Doğru bir karar mı?"',
    description:
      "Bugün başlayan herkes bir yerden başladı.\n\nEn iyi zaman dünmüş; ikincisi şu an. Kararını vermiş olman en büyük adım.",
  },
  {
    id: "motivation-3",
    type: "motivation",
    part: 1,
    title: '"Vakit / emek korkusu"',
    description:
      "Saatlerce klavye başında oturmana gerek yok.\n\nKonuş, biz yazıya dökelim. Senin işin düşünmek; ürettiğin değeri metne çevirmek bizim işimiz.",
  },
  {
    id: "motivation-4",
    type: "motivation",
    part: 1,
    title: '"Yapabilir miyim / yeterli miyim?"',
    description:
      "Bilgin ve potansiyelin zaten var.\n\nMindfolio bunu maksimize etmek için burada — yanında bir stratejist gibi. Başlamak için ihtiyacın olan her şeye sahipsin.",
  },
];

const QUESTION_STEPS: Step[] = [
  {
    id: "goal",
    type: "single",
    part: 1,
    title: "Seni buraya ne getirdi?",
    description: "İçerik hedefin ne? En çok hangisi seni tanımlıyor?",
    options: [
      { id: "visibility", emoji: "👁", label: "Görünürlük — alanımda bilinmek istiyorum" },
      { id: "inbound", emoji: "🎯", label: "Inbound — işime/fikirlerime talep yaratmak" },
      { id: "brand", emoji: "💎", label: "Kişisel marka — kendi adımı inşa etmek" },
      { id: "audience", emoji: "📡", label: "Kitle — takipçi ve topluluk oluşturmak" },
    ],
    validate: (a) => (a as unknown as Answers).goal.length > 0,
  },
  {
    id: "field",
    type: "single",
    part: 1,
    title: "Hangi alandasın?",
    description: "Uzmanlık alanın ne?",
    options: [
      { id: "tech", emoji: "💻", label: "Teknoloji / Yazılım / AI" },
      { id: "business", emoji: "📊", label: "İş / Girişimcilik / Strateji" },
      { id: "creative", emoji: "🎨", label: "Yaratıcı / Tasarım / Medya" },
      { id: "science", emoji: "🔬", label: "Bilim / Sağlık / Akademi" },
      { id: "finance", emoji: "💰", label: "Finans / Yatırım / Ekonomi" },
      { id: "other", emoji: "🌍", label: "Diğer — kendim tarif edeceğim" },
    ],
    validate: (a) => (a as unknown as Answers).field.length > 0,
  },
  {
    id: "hasContent",
    type: "single",
    part: 1,
    title: "Geçmiş içeriğin var mı?",
    description: "Daha önce yazdığın, paylaştığın içerikler var mı?",
    options: [
      { id: "yes", emoji: "📚", label: "Evet — blog, LinkedIn, newsletter, X..." },
      { id: "no", emoji: "✨", label: "Hayır — sıfırdan başlıyorum" },
    ],
    validate: (a) => (a as unknown as Answers).hasContent.length > 0,
  },
  // 5.1 — LinkedIn profil linki (opsiyonel, skip'lenebilir)
  {
    id: "linkedin-url",
    type: "input",
    part: 1,
    title: "LinkedIn profilin var mı?",
    description: "Paylaşırsan içerik stratejini profilinden besleyebilirim. Boş bırakabilirsin.",
    placeholder: "linkedin.com/in/kullaniciadi",
    validate: () => true, // her zaman geçilebilir
  },
  // 5.2 — İçerik içe aktar (opsiyonel, skip'lenebilir)
  {
    id: "import-content",
    type: "input",
    part: 1,
    title: "Daha önce bir şeyler yazdın mı?",
    description: "Blog, makale veya LinkedIn yazısı — bir link ya da metin yapıştır. Boş bırakabilirsin.",
    placeholder: "https://medium.com/... veya yazı örneklerini yapıştır",
    validate: () => true,
  },
  // 5.1+5.2 sonrası → enrich loader
  {
    id: "warmup-enrich",
    type: "loader",
    part: 1,
    title: "Profilin zenginleştiriliyor...",
    description: "Link ve metinler taranıyor, sesin ve temaların çıkarılıyor.",
  },
  {
    id: "voiceTraits",
    type: "multi",
    part: 1,
    title: "Yazı sesin nasıl?",
    description: "Aşağıdaki ikililerden sana en yakın olanları seç (en fazla 2).",
    options: [
      { id: "casual", label: "Samimi / Günlük konuşma dili" },
      { id: "formal", label: "Resmi / Profesyonel / Akademik" },
      { id: "story", label: "Hikaye anlatan / Anlatısal" },
      { id: "data", label: "Veri odaklı / Analitik" },
      { id: "sharp", label: "Kısa / Çarpıcı / Özlü" },
      { id: "deep", label: "Derin / Uzun / Kapsamlı" },
      { id: "humor", label: "Espri / Ironi / Oyunbaz" },
      { id: "emotive", label: "Duygusal / İlham verici" },
    ],
    multiMax: 2,
    validate: (a) => (a as unknown as Answers).voiceTraits.length >= 1,
  },
  {
    id: "audience",
    type: "multi",
    part: 1,
    title: "Kime sesleniyorsun?",
    description: "Hedef kitlen kim? Birden fazla seçebilirsin.",
    options: [
      { id: "peers", emoji: "🤝", label: "Kendi alanımdaki profesyoneller / akranlar" },
      { id: "founders", emoji: "🚀", label: "Girişimciler / Kurucular" },
      { id: "leaders", emoji: "👔", label: "Yöneticiler / Karar alıcılar" },
      { id: "ic", emoji: "⚙", label: "Ürün/mühendislik ekipleri (IC'ler)" },
      { id: "recruit", emoji: "🎓", label: "Öğrenciler / Kariyer başındakiler" },
      { id: "public", emoji: "🌐", label: "Genel kamu / Herkes" },
    ],
    validate: (a) => (a as unknown as Answers).audience.length >= 1,
  },
  {
    id: "positioning",
    type: "input",
    part: 1,
    title: "Ne ile bilinmek istersin?",
    description: "Bir cümleyle: İnsanlar seni neyle hatırlasın?",
    placeholder: "e.g., Yapay zekayı iş dünyası için anlaşılır kılan adam/kadın...",
    validate: (a) => (a.positioning as string)?.trim().length > 0,
  },
];

// Build full step list: motivation → welcome → question + warmup pairs
const STEPS: Step[] = [
  ...MOTIVATION_STEPS,
  {
    id: "welcome",
    type: "message",
    part: 1,
    title: "Hadi yazı kişiliğini oluşturalım",
    description:
      "Sesini, tarzını ve hedeflerini anlamak için birkaç soru soracağım. Ardından sana özel bir yazı kişiliği oluşturacağım — böylece her içerik sana ait gibi hissettirir.\n\nYaklaşık 2 dakika sürer.",
  },
  ...QUESTION_STEPS.flatMap((q) => {
    const warmupId = `warmup-${q.id}`;
    return [q, { id: warmupId, type: "warmup" as const, part: 1 as const, title: "", description: "" }];
  }),
  {
    id: "generating-teaser",
    type: "loader",
    part: 1,
    title: "Kişiselleştirilmiş personan oluşturuluyor...",
    description: "Cevaplarını analiz ediyor ve sana özgü yazı sesini hazırlıyor.",
  },
  {
    id: "reveal-positioning",
    type: "reveal",
    part: 1,
    title: "İşte sen busun.",
    description: "Konumlandırma stratejin, yanıtlarından üretildi.",
  },
  {
    id: "reveal-pillars",
    type: "reveal",
    part: 1,
    title: "İçerik pillar'ların",
    description: "Yazılarının temelini oluşturacak ana başlıklar.",
  },
  {
    id: "reveal-voice",
    type: "reveal",
    part: 1,
    title: "Ses profili ve farklılaşma",
    description: "Yazı sesin ve kaçınman gereken tuzaklar.",
  },
  {
    id: "reveal-sample",
    type: "reveal",
    part: 1,
    title: "Senin sesinden bir örnek",
    description: "Mindfolio'nun senin için nasıl yazdığını gösteren kısa bir post.",
  },
  {
    id: "paywall",
    type: "paywall",
    part: 1,
    title: "Personan hazır. Sıra stratejide.",
    description:
      "Teaser personanı gördün. Şimdi tam içerik stratejini aç — konumlandırma, pillar'lar, ses profili ve ilk örnek postun seni bekliyor.",
  },
  // ── Part 2 ──────────────────────────────────────
  {
    id: "hotTakes",
    type: "multi",
    part: 2,
    title: "Hangi konularda güçlü / aykırı görüşlerin var?",
    description: "Seni farklılaştıran, çoğunluğun aynı fikirde olmadığı konular. Seçtiklerin hakkında kısaca not ekleyebilirsin.",
    options: [
      { id: "industry", emoji: "🏭", label: "Sektörümdeki baskın trendler / dogmalar" },
      { id: "tools", emoji: "🔧", label: "Araçlar / metodolojiler / çerçeveler" },
      { id: "culture", emoji: "🏛", label: "İş kültürü / yönetim / çalışma biçimleri" },
      { id: "future", emoji: "🔮", label: "Gelecek / teknoloji / toplum" },
      { id: "none", emoji: "🤷", label: "Henüz net bir aykırı görüşüm yok" },
    ],
    validate: () => true,
  },
  {
    id: "hotTakesDetail",
    type: "input",
    part: 2,
    title: "Bu konuda biraz daha açar mısın?",
    description: "Aykırı görüşünü kısaca açıkla — ne düşünüyorsun ve neden?",
    placeholder: "e.g., Çoğu AI girişiminin asıl sorunu teknoloji değil, dağıtım stratejisi...",
    validate: () => true,
  },
  {
    id: "format",
    type: "multi",
    part: 2,
    title: "Hangi içerik türü sana yakın?",
    description: "Doğal olarak hangi formatta üretmek sana daha kolay gelir?",
    options: [
      { id: "long", emoji: "📝", label: "Uzun yazı — blog / makale / deneme" },
      { id: "short", emoji: "💬", label: "Kısa post — LinkedIn / X gönderisi" },
      { id: "video", emoji: "🎬", label: "Video script — YouTube / Reels" },
      { id: "carousel", emoji: "🎠", label: "Carousel — slayt tabanlı içerik" },
      { id: "audio", emoji: "🎙", label: "Sesli — podcast / sesli not / dikte" },
    ],
    validate: (a) => (a as unknown as Answers).format.length >= 1,
  },
  {
    id: "cadence",
    type: "single",
    part: 2,
    title: "Gerçekçi olarak ne sıklıkla üretebilirsin?",
    description: "Abartma — gerçekten ayırabileceğin tempo ne?",
    options: [
      { id: "daily", emoji: "🔥", label: "Hemen hemen her gün" },
      { id: "weekly", emoji: "📅", label: "Haftada 2-3 kez" },
      { id: "biweekly", emoji: "📆", label: "Haftada 1 kez" },
      { id: "monthly", emoji: "🌙", label: "Ayda 2-3 kez" },
    ],
    validate: (a) => (a as unknown as Answers).cadence.length > 0,
  },
  {
    id: "antiposition",
    type: "multi",
    part: 2,
    title: "Ne OLMAK İSTEMEZSİN?",
    description: "Kesinlikle kaçındığın, içinde olmak istemediğin klişe/ton/lügat seçenekleri. Farklılaşman için kritik bir soru.",
    options: [
      { id: "clickbait", emoji: "🪤", label: "Tık tuzağı / abartılı başlıklar" },
      { id: "corpo", emoji: "👔", label: "Kurumsal jargon / 'corporate bullshit'" },
      { id: "toxic", emoji: "☠", label: "Negatif / tartışma çıkaran / polemik" },
      { id: "fluff", emoji: "🫧", label: "Yüzeysel / içeriksiz / 'herkesin yazdığı şeyler'" },
      { id: "expert", emoji: "🎓", label: "Ukalalık / tepeden bakan 'ben bilirim' hali" },
      { id: "hype", emoji: "📢", label: "Abartılı iyimserlik / 'new era' lügatı" },
    ],
    validate: () => true,
  },
  {
    id: "inspiration",
    type: "multi",
    part: 2,
    title: "Kimlerin içeriğini beğeniyorsun?",
    description: "İlham aldığın, tarzını beğendiğin isimler var mı? (İsteğe bağlı — ses üçgenlemesi için değerli.)",
    options: [
      { id: "elon", emoji: "⚡", label: "Elon Musk / X'teki teknik founder'lar" },
      { id: "pg", emoji: "✍️", label: "Paul Graham / essayist'ler" },
      { id: "lenny", emoji: "📬", label: "Lenny'd / newsletter yazarları" },
      { id: "altman", emoji: "🧠", label: "Sam Altman / tech thinker'lar" },
      { id: "naval", emoji: "🧘", label: "Naval / felsefi iş yazarları" },
      { id: "seth", emoji: "🎯", label: "Seth Godin / pazarlama yazarları" },
      { id: "other", emoji: "📖", label: "Başka — kendim ekleyeceğim" },
    ],
    validate: () => true,
  },
  {
    id: "differentiator",
    type: "single",
    part: 2,
    title: "Bakış açını farklı kılan ne?",
    description: "Seni en iyi tanımlayan ifadeyi seç.",
    options: [
      { id: "exp-founder", emoji: "🏗", label: "Sıfırdan bir şey inşa ettim — oyun kitabını paylaşıyorum" },
      { id: "deep-expert", emoji: "🔬", label: "Bir alanda derin uzmanlığım var — karmaşığı sadeleştiriyorum" },
      { id: "contrarian", emoji: "⚡", label: "Kalıpların dışında düşünüyorum — alanımdaki ezberleri sorguluyorum" },
      { id: "connector", emoji: "🔗", label: "Sektörler arası bağlantılar kuruyorum — eşsiz sentezler üretiyorum" },
    ],
  },
  {
    id: "goals",
    type: "multi",
    part: 2,
    title: "İçeriğinle neyi başarmak istiyorsun?",
    description: "Hepsi geçerli, istediğin kadar seç.",
    options: [
      { id: "audience", emoji: "📈", label: "Kitle / kişisel marka inşa etmek" },
      { id: "leads", emoji: "💼", label: "İşime talep / müşteri adayı yaratmak" },
      { id: "authority", emoji: "🎓", label: "Düşünce liderliği oluşturmak" },
      { id: "network", emoji: "🤝", label: "Akranlar ve mentorlarla bağlantı kurmak" },
      { id: "monetize", emoji: "💰", label: "Ücretli içerikle gelir elde etmek" },
      { id: "legacy", emoji: "📝", label: "Yolculuğumu belgelemek ve miras bırakmak" },
    ],
  },
  {
    id: "generating-full",
    type: "loader",
    part: 2,
    title: "Tam içerik stratejin oluşturuluyor...",
    description:
      "Konumlandırman, içerik pillar'ların, ses profilin ve örnek postun hazırlanıyor.",
  },
  {
    id: "reveal-full-positioning",
    type: "reveal",
    part: 2,
    title: "İşte sen busun.",
    description: "Tam konumlandırma stratejin, tüm yanıtlarından üretildi.",
  },
  {
    id: "reveal-full-pillars",
    type: "reveal",
    part: 2,
    title: "İçerik pillar'ların",
    description: "Yazılarının temelini oluşturacak ana başlıklar.",
  },
  {
    id: "reveal-full-voice",
    type: "reveal",
    part: 2,
    title: "Ses profili ve farklılaşma",
    description: "Yazı sesin ve kaçınman gereken tuzaklar.",
  },
  {
    id: "reveal-full-sample",
    type: "reveal",
    part: 2,
    title: "Senin sesinden bir örnek",
    description: "Mindfolio'nun senin için nasıl yazdığını gösteren bir post.",
  },
  // ── Part 2 Deep Setup ──────────────────────────
  {
    id: "voice-calibrate",
    type: "input",
    part: 2,
    title: "Sesini kalibre edelim",
    description:
      "2-3 tane daha önce yazdığın yazıyı yapıştır. AI sesini analiz etsin ve ton profilini hassaslaştırsın.",
    placeholder:
      "LinkedIn postların, blog yazıların veya notların... En az 1-2 paragraf.",
    validate: () => true,
  },
  {
    id: "pillar-deepen",
    type: "multi",
    part: 2,
    title: "Pillar'larını derinleştir",
    description:
      "Her pillar için önerilen konular. Beğendiklerini seç, ileride içerik takviminde kullanacağız.",
    options: [],
    validate: () => true,
  },
  {
    id: "first-content",
    type: "input",
    part: 2,
    title: "İlk içeriğini oluştur",
    description:
      "Mindfolio senin sesinde bir taslak yazsın. Aşağıya bir konu gir veya boş bırak — AI kendiliğinden bir post üretsin.",
    placeholder:
      "İstersen bir konu yaz, istersen boş bırak — AI senin için bir şey üretsin.",
    validate: () => true,
  },
  {
    id: "reminder-setup",
    type: "single",
    part: 2,
    title: "Hatırlatıcı kur",
    description: "İçerik üretmeyi unutmaman için sana ne sıklıkla hatırlatalım?",
    options: [
      { id: "daily", emoji: "🔥", label: "Her gün" },
      { id: "weekdays", emoji: "📅", label: "Hafta içi her gün" },
      { id: "weekly", emoji: "📆", label: "Haftada 1 kez" },
      { id: "none", emoji: "🔕", label: "Hatırlatma istemiyorum" },
    ],
  },
  {
    id: "done",
    type: "done",
    part: 2,
    title: "Her şey hazır!",
    description: "Studio'ya yönlendiriliyorsun...",
  },
];

interface Answers {
  goal: string;
  field: string;
  hasContent: string;
  voiceTraits: string[];
  audience: string[];
  positioning: string;
  hotTakes: string[];
  hotTakesDetail: string;
  format: string[];
  cadence: string;
  antiposition: string[];
  inspiration: string[];
  importedContent: string;
  "linkedin-url": string;
  "import-content": string;
  differentiator: string;
  goals: string[];
  "voice-calibrate": string;
  "first-content": string;
  "reminder-setup": string;
}

const defaultAnswers: Answers = {
  goal: "",
  field: "",
  hasContent: "",
  voiceTraits: [],
  audience: [],
  positioning: "",
  hotTakes: [],
  hotTakesDetail: "",
  format: [],
  cadence: "",
  antiposition: [],
  inspiration: [],
  importedContent: "",
  "linkedin-url": "",
  "import-content": "",
  differentiator: "",
  goals: [],
  "voice-calibrate": "",
  "first-content": "",
  "reminder-setup": "",
};

interface State {
  stepIndex: number;
  answers: Answers;
  direction: "forward" | "back";
  transitioning: boolean;
  partPaid: boolean;
}

type Action =
  | { type: "NEXT"; direction?: "forward" }
  | { type: "BACK" }
  | { type: "SET_ANSWER"; key: keyof Answers; value: unknown }
  | { type: "SET_TRANSITIONING"; value: boolean }
  | { type: "SET_PAID"; value: boolean }
  | { type: "GO_TO"; stepIndex: number }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "NEXT":
      return {
        ...state,
        stepIndex: state.stepIndex + 1,
        direction: action.direction ?? "forward",
        transitioning: true,
      };
    case "BACK":
      return {
        ...state,
        stepIndex: Math.max(0, state.stepIndex - 1),
        direction: "back",
        transitioning: true,
      };
    case "SET_ANSWER":
      return {
        ...state,
        answers: { ...state.answers, [action.key]: action.value },
      };
    case "SET_TRANSITIONING":
      return { ...state, transitioning: action.value };
    case "SET_PAID":
      return { ...state, partPaid: action.value };
    case "GO_TO":
      return { ...state, stepIndex: action.stepIndex, direction: "forward", transitioning: true };
    case "RESET":
      return { stepIndex: 0, answers: { ...defaultAnswers }, direction: "forward", transitioning: true, partPaid: false };
    default:
      return state;
  }
}

function isMultiStep(s: Step) {
  return s.type === "multi" || s.type === "input" || s.type === "tag-input";
}

function canProceed(step: Step, answers: Answers): boolean {
  if (["message", "motivation", "warmup", "reveal", "loader", "paywall", "done"].includes(step.type)) return true;
  if (step.validate) return step.validate(answers as unknown as Record<string, unknown>);
  return true;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    stepIndex: 0,
    answers: { ...defaultAnswers },
    direction: "forward",
    transitioning: false,
    partPaid: false,
  });
  const booted = useRef(false);
  const [ready, setReady] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const [personaData, setPersonaData] = useState<any>(null);

  // Guard: redirect if persona already exists.
  // `?preview` (or ?preview=1) skips the guard so the flow can be viewed
  // anytime without creating a new account — UI only, no data is changed.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const preview =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("preview");
    if (preview) {
      setReady(true);
      return;
    }
    fetch("/api/personas")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.onboarding_complete) {
          router.replace("/studio");
        } else {
          setReady(true);
        }
      })
      .catch(() => { setReady(true); });
  }, [router]);

  const step = STEPS[state.stepIndex];
  const isLastInPart = step
    ? STEPS.findLastIndex((s) => s.part === step.part) === state.stepIndex
    : false;
  const nextStep = STEPS[state.stepIndex + 1];
  const nextPartIsDifferent = nextStep && step && nextStep.part !== step.part;

  // Global progress (eased: fast early, slow near end)
  const globalFrac = STEPS.length > 1 ? state.stepIndex / (STEPS.length - 1) : 1;
  const globalProgressWidth = Math.pow(globalFrac, 0.6) * 100;

  const { stepIndex, answers, partPaid } = state;

  // WARM-UP transition effect
  useEffect(() => {
    if (state.transitioning) {
      const timer = setTimeout(() => dispatch({ type: "SET_TRANSITIONING", value: false }), 50);
      return () => clearTimeout(timer);
    }
  }, [state.transitioning]);

  const handleNext = useCallback(() => {
    dispatch({ type: "NEXT" });
  }, []);

  const handleBack = useCallback(() => {
    dispatch({ type: "BACK" });
  }, []);

  const advanceIntro = useCallback(() => {
    if (step?.id === "warmup-hasContent" && answers.hasContent !== "yes") {
      const voiceTraitsIdx = STEPS.findIndex((s) => s.id === "voiceTraits");
      if (voiceTraitsIdx >= 0) {
        dispatch({ type: "GO_TO", stepIndex: voiceTraitsIdx });
        return;
      }
    }
    dispatch({ type: "NEXT" });
  }, [step?.id, answers.hasContent]);

  const generateTeaserPersona = useCallback(async () => {
    const goalLabel = GOAL_LABELS[answers.goal] ?? answers.goal;
    const fieldLabel = FIELD_LABELS[answers.field] ?? answers.field;
    const voiceLabel = answers.voiceTraits.map((v) => VOICE_LABELS[v] ?? v).join(", ");
    const audienceLabel = answers.audience.map((a) => AUDIENCE_LABELS[a] ?? a).join(", ");

    // 5.1 + 5.2 — yeni opsiyonel girdileri AI'ya yedir + Supabase'e kaydet
    const linkedinUrl = (answers["linkedin-url"] || "").trim();
    const importContent = (answers["import-content"] || "").trim();
    const combinedImported = [importContent, answers.importedContent].filter(Boolean).join("\n\n").trim();

    const res = await fetch("/api/ai/analyze-persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: goalLabel,
        field: fieldLabel,
        hasContent: answers.hasContent,
        voiceTraits: voiceLabel,
        audience: audienceLabel,
        positioning: answers.positioning,
        linkedinUrl: linkedinUrl || undefined,
        importedContent: combinedImported || undefined,
      }),
    });
    if (!res.ok) throw new Error("Failed to generate persona");
    const data = await res.json();
    // Save teaser persona (+linkedin_url profile field)
    const profileWithLinkedin = linkedinUrl ? { ...data.profile, linkedin_url: linkedinUrl } : data.profile;
    const saveRes = await fetch("/api/personas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: goalLabel.slice(0, 60) || "My Persona",
        profile: profileWithLinkedin,
        onboarding_complete: false,
      }),
    });
    if (!saveRes.ok) throw new Error("Failed to save persona");
    setPersonaData(data.profile);
  }, [answers]);

  const [generationError, setGenerationError] = useState<"teaser" | "full" | null>(null);
  const [generationAttempt, setGenerationAttempt] = useState(0);
  const [subscribing, setSubscribing] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [pillarTopics, setPillarTopics] = useState<{ pillarTitle: string; topics: string[] }[]>([]);
  const [generatedPost, setGeneratedPost] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");

  const handleSubscribe = useCallback(async () => {
    setSubscribing(true);
    try {
      // Save mock subscription flag to persona profile
      await fetch("/api/personas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            active: true,
            plan: selectedPlan,
            mock: true,
            subscribed_at: new Date().toISOString(),
          },
        }),
      });
      dispatch({ type: "SET_PAID", value: true });
      const part2Start = STEPS.findIndex((s) => s.part === 2);
      dispatch({ type: "GO_TO", stepIndex: part2Start });
    } catch {
      // fall through — still allow access in mock mode
      dispatch({ type: "SET_PAID", value: true });
      const part2Start = STEPS.findIndex((s) => s.part === 2);
      dispatch({ type: "GO_TO", stepIndex: part2Start });
    }
  }, [selectedPlan]);

  // On mount: check if persona already has subscription active → jump to Part 2
  useEffect(() => {
    if (booted.current && step?.type === "paywall") {
      fetch("/api/personas")
        .then((r) => r.json())
        .then((data) => {
          if (data?.profile?.subscription?.active) {
            dispatch({ type: "SET_PAID", value: true });
            const part2Start = STEPS.findIndex((s) => s.part === 2);
            dispatch({ type: "GO_TO", stepIndex: part2Start });
          }
        })
        .catch(() => {});
    }
  }, [step?.id, step?.type]);

  const generateFullStrategy = useCallback(async () => {
    const goalLabel = GOAL_LABELS[answers.goal] ?? answers.goal;
    const fieldLabel = FIELD_LABELS[answers.field] ?? answers.field;
    const voiceLabel = answers.voiceTraits.map((v) => VOICE_LABELS[v] ?? v).join(", ");
    const audienceLabel = answers.audience.map((a) => AUDIENCE_LABELS[a] ?? a).join(", ");
    const hotTakesLabels = answers.hotTakes.map((h) => HOTTAKE_LABELS[h] ?? h).join(", ");
    const formatLabels = answers.format.map((f) => FORMAT_LABELS[f] ?? f).join(", ");
    const cadenceLabel = CADENCE_LABELS[answers.cadence] ?? answers.cadence;
    const antipositionLabels = answers.antiposition.map((a) => ANTIPOSITION_LABELS[a] ?? a).join(", ");
    const inspirationLabels = answers.inspiration.map((i) => INSPIRATION_LABELS[i] ?? i).join(", ");

    const linkedinUrl = (answers["linkedin-url"] || "").trim();
    const importContent = (answers["import-content"] || "").trim();
    const combinedImported = [importContent, answers.importedContent].filter(Boolean).join("\n\n").trim();

    const res = await fetch("/api/ai/analyze-persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: goalLabel,
        field: fieldLabel,
        hasContent: answers.hasContent,
        voiceTraits: voiceLabel,
        audience: audienceLabel,
        positioning: answers.positioning,
        hotTakes: hotTakesLabels,
        hotTakesDetail: answers.hotTakesDetail,
        format: formatLabels,
        cadence: cadenceLabel,
        antiposition: antipositionLabels,
        inspiration: inspirationLabels,
        linkedinUrl: linkedinUrl || undefined,
        importedContent: combinedImported || undefined,
      }),
    });
    if (!res.ok) throw new Error("Failed to generate full strategy");
    const data = await res.json();
    setPersonaData(data.profile);
    // Save full persona (but don't mark complete yet — deep setup follows)
    await fetch("/api/personas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: goalLabel.slice(0, 60) || "My Persona",
        profile: data.profile,
        onboarding_complete: false,
      }),
    });
  }, [answers]);

  const handleCalibrate = useCallback(async () => {
    const text = answers["voice-calibrate"] as string;
    if (!text?.trim()) return;
    setCalibrating(true);
    try {
      const res = await fetch("/api/ai/analyze-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: "",
          field: "",
          hasContent: "yes",
          voiceTraits: "",
          audience: "",
          positioning: "",
          importedContent: text,
        }),
      });
      if (!res.ok) throw new Error("Calibration failed");
      const data = await res.json();
      if (data?.profile) {
        const merged = { ...personaData, ...data.profile };
        setPersonaData(merged);
        await fetch("/api/personas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: merged }),
        });
      }
    } catch {
      // proceed silently
    }
    setCalibrating(false);
    dispatch({ type: "NEXT" });
  }, [answers, personaData]);

  const handlePillarDeepen = useCallback(async () => {
    if (!personaData?.pillars?.length) {
      dispatch({ type: "NEXT" });
      return;
    }
    // Call AI to generate topic suggestions per pillar
    try {
      const pillarNames = (personaData.pillars as { title: string }[]).map((p) => p.title).join(", ");
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `I have these content pillars: ${pillarNames}. For each pillar, suggest 3 specific topic ideas that would resonate with my audience. Return as JSON array of {pillarTitle, topics: [string]}. No markdown.`,
          format: "raw",
        }),
      });
      if (!res.ok) throw new Error("Failed to generate topics");
      const data = await res.json();
      let topics;
      try {
        topics = JSON.parse(data.text);
      } catch {
        topics = (personaData.pillars as { title: string }[]).map((p) => ({
          pillarTitle: p.title,
          topics: [`${p.title} — giriş`, `${p.title} — derinlik`, `${p.title} — vaka`],
        }));
      }
      setPillarTopics(topics);
      // Save to persona profile
      const merged = { ...personaData, pillarTopics: topics };
      setPersonaData(merged);
      await fetch("/api/personas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: merged }),
      });
    } catch {
      // proceed with empty topics
    }
    dispatch({ type: "NEXT" });
  }, [personaData]);

  const handleGenerateFirstContent = useCallback(async () => {
    setSavingDraft(true);
    const topic = (answers["first-content"] as string)?.trim() || "";
    try {
      const formatLabels = answers.format.map((f) => FORMAT_LABELS[f] ?? f).join(", ");
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: topic
            ? `Write a post about: ${topic}`
            : "Write a short, engaging post in my voice on a topic from my content pillars. Make it personal and insightful.",
          format: (formatLabels.includes("linkedin") ? "linkedin" : "raw") as "linkedin" | "raw",
        }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      setGeneratedPost(data.text);
      // Auto-save as draft
      await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: data.text,
          title: topic ? topic.slice(0, 100) : "İlk içerik taslağım",
          platform: formatLabels.split(",")[0]?.trim() || "linkedin",
        }),
      });
      setDraftSaved(true);
    } catch {
      // allow proceed
    }
    setSavingDraft(false);
    dispatch({ type: "NEXT" });
  }, [answers]);

  const handleSetReminder = useCallback(
    (value: string) => {
      dispatch({ type: "SET_ANSWER", key: "reminder-setup", value });
      // Save preference to persona
      const reminderPref = { reminder: value, updated_at: new Date().toISOString() };
      const merged = { ...personaData, setup: { ...(personaData?.setup ?? {}), ...reminderPref } };
      setPersonaData(merged);
      fetch("/api/personas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: merged }),
      }).catch(() => {});
      setTimeout(() => dispatch({ type: "NEXT" }), 350);
    },
    [personaData]
  );

  const finishOnboarding = useCallback(async () => {
    await fetch("/api/personas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_complete: true }),
    }).catch(() => {});
    router.push("/studio");
  }, [router]);

  // ── Staged import message progression ──
  const importStages = [
    "Profilin okunuyor...",
    "İçeriklerin taranıyor...",
    "Ton ve tekrar eden temalar çıkarılıyor...",
    "Stratejin oluşturuluyor...",
  ];
  const [importStageIndex, setImportStageIndex] = useState(0);
  const [importError, setImportError] = useState(false);
  const retryImport = useRef<() => void>(() => {});

  // ── Auto-generate / auto-advance when entering specific steps ──
  useEffect(() => {
    if (step?.id === "warmup-enrich") {
      // 5.1 + 5.2 sonrası enrich loader: opsiyonel linkedin + import-content varsa zenginleştir.
      setImportError(false);
      setImportStageIndex(0);
      const stageTimer = setInterval(() => {
        setImportStageIndex((prev) => Math.min(prev + 1, importStages.length - 1));
      }, 1500);

      const linkedinUrl = (answers["linkedin-url"] || "").trim();
      const importInput = (answers["import-content"] || "").trim();
      const candidateUrl = (importInput.startsWith("http") ? importInput : "") || (linkedinUrl.startsWith("http") ? linkedinUrl : (linkedinUrl ? `https://${linkedinUrl.replace(/^https?:\/\//, "")}` : ""));

      // Hiçbir şey verilmemişse direkt geç
      if (!linkedinUrl && !importInput) {
        const t = setTimeout(() => { clearInterval(stageTimer); dispatch({ type: "NEXT" }); }, 1200);
        return () => { clearInterval(stageTimer); clearTimeout(t); };
      }

      if (candidateUrl) {
        const doFetch = () =>
          fetch("/api/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: candidateUrl }),
          })
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
              if (data?.preview) {
                const extracted = [data.preview.title, data.preview.description].filter(Boolean).join("\n\n");
                if (extracted) {
                  dispatch({ type: "SET_ANSWER", key: "importedContent", value: extracted });
                }
              }
              clearInterval(stageTimer);
              setImportStageIndex(importStages.length - 1);
              setTimeout(() => dispatch({ type: "NEXT" }), 400);
            })
            .catch(() => {
              // Hata olsa bile akışı kırmıyoruz — kullanıcı continue edebilsin.
              clearInterval(stageTimer);
              setTimeout(() => dispatch({ type: "NEXT" }), 800);
            });
        retryImport.current = doFetch;
        doFetch();
      } else {
        // Sadece metin verilmişse — kısa animasyon, sonra geç
        setTimeout(() => {
          clearInterval(stageTimer);
          dispatch({ type: "NEXT" });
        }, 2500);
      }
      return () => clearInterval(stageTimer);
    }
    if (step?.id === "generating-teaser") {
      setGenerationError(null);
      generateTeaserPersona()
        .then(() => {
          setGenerationError(null);
          setTimeout(() => dispatch({ type: "NEXT" }), 800);
        })
        .catch(() => setGenerationError("teaser"));
    }
    if (step?.id === "generating-full") {
      setGenerationError(null);
      generateFullStrategy()
        .then(() => {
          setGenerationError(null);
          setTimeout(() => dispatch({ type: "NEXT" }), 800);
        })
        .catch(() => setGenerationError("full"));
    }
    if (step?.id === "pillar-deepen" && pillarTopics.length === 0) {
      handlePillarDeepen();
    }
    if (step?.id === "done") {
      finishOnboarding();
    }
  }, [step?.id, step?.type, generateTeaserPersona, generateFullStrategy, finishOnboarding, handlePillarDeepen, pillarTopics.length, generationAttempt]);

  // ── Single-select auto-advance ──
  const handleSingleSelect = useCallback(
    (key: keyof Answers, value: string) => {
      dispatch({ type: "SET_ANSWER", key, value });
      // After brief animation, auto-advance
      setTimeout(() => dispatch({ type: "NEXT" }), 350);
    },
    []
  );

  if (!ready) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <span className="animate-pulse text-sm text-zinc-400">Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col px-4"
      style={{ minHeight: "100dvh" }}
      onTouchStart={(e) => {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        if (!step) return;
        if (!["message", "motivation", "warmup"].includes(step.type)) return;
        const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
        const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
          if (deltaX < 0) {
            advanceIntro();
          } else if (stepIndex > 0) {
            dispatch({ type: "BACK" });
          }
        }
      }}
    >
      <div className="absolute top-4 right-4 z-50"><ThemeToggle /></div>

      {/* ── PROGRESS BAR (continuous, no numbers) ── */}
      <header className="flex-shrink-0 pt-safe-top pt-6 pb-3 max-w-lg mx-auto w-full">
        <div className="h-1 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${globalProgressWidth}%` }}
          />
        </div>
      </header>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full pb-4">
        <GlassCard
          key={step?.id}
          className={`p-6 sm:p-8 animate-fade-in transition-all duration-300 ${
            state.transitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          }`}
        >
          {step?.id === "welcome" && (
            <div className="space-y-6 text-center cursor-pointer" onClick={advanceIntro}>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-3xl">
                ✦
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {step.title}
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                {step.description}
              </p>
              <p className="text-xs text-zinc-300 dark:text-zinc-600 animate-pulse pt-2">
                Devam etmek için tıkla
              </p>
            </div>
          )}

          {step?.type === "motivation" && (
            <div className="space-y-6 text-center py-4 cursor-pointer" onClick={advanceIntro}>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-3xl">
                💬
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                {step.title}
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed whitespace-pre-line text-base sm:text-lg">
                {step.description}
              </p>
              <p className="text-xs text-zinc-300 dark:text-zinc-600 animate-pulse pt-2">
                {step.id === "motivation-4" ? "Hazır mısın? Herhangi bir yere tıkla." : "Devam etmek için tıkla"}
              </p>
            </div>
          )}

          {step?.type === "warmup" && (
            <div className="space-y-5 text-center py-8 cursor-pointer" onClick={advanceIntro}>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950">
                <span className="relative flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500" />
                </span>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
                {(() => {
                  const prevStep = STEPS[stepIndex - 1];
                  return prevStep ? getWarmupContent(prevStep.id, answers).title : "";
                })()}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                {(() => {
                  const prevStep = STEPS[stepIndex - 1];
                  return prevStep ? getWarmupContent(prevStep.id, answers).description : "";
                })()}
              </p>
              <p className="text-xs text-zinc-300 dark:text-zinc-600 animate-pulse pt-2">
                Devam etmek için tıkla
              </p>
            </div>
          )}

          {(step?.type === "input") && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{step.title}</h2>
              {step.description && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{step.description}</p>
              )}
              <textarea
                value={(answers[step.id as keyof Answers] as string) ?? ""}
                onChange={(e) => dispatch({ type: "SET_ANSWER", key: step.id as keyof Answers, value: e.target.value })}
                placeholder={step.placeholder}
                rows={4}
                className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical"
                autoFocus
              />
              {step.id === "voice-calibrate" && (
                <GlassButton
                  variant="primary"
                  className="w-full"
                  onClick={handleCalibrate}
                  disabled={calibrating || !(answers["voice-calibrate"] as string)?.trim()}
                >
                  {calibrating ? "Sesin analiz ediliyor..." : "Sesimi Analiz Et"}
                </GlassButton>
              )}
              {step.id === "first-content" && (
                <GlassButton
                  variant="primary"
                  className="w-full"
                  onClick={handleGenerateFirstContent}
                  disabled={savingDraft}
                >
                  {savingDraft ? "İçerik oluşturuluyor..." : generatedPost ? "Tekrar Oluştur" : "İçeriği Oluştur"}
                </GlassButton>
              )}
              {step.id === "first-content" && generatedPost && (
                <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-700/40 p-4 shadow-sm space-y-2">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Oluşturulan Taslak
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                    {generatedPost}
                  </p>
                  {draftSaved && (
                    <p className="text-xs text-emerald-500">✅ Taslak kaydedildi.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {step?.type === "tag-input" && (
            <TagInputStep
              step={step}
              items={(answers[step.id as keyof Answers] as string[]) ?? []}
              onAdd={(val) => {
                const key = step.id as keyof Answers;
                const current = answers[key] as string[];
                dispatch({ type: "SET_ANSWER", key, value: [...current, val] });
              }}
              onRemove={(val) => {
                const key = step.id as keyof Answers;
                const current = answers[key] as string[];
                dispatch({ type: "SET_ANSWER", key, value: current.filter((x) => x !== val) });
              }}
            />
          )}

          {(step?.type === "single") && step.options && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{step.title}</h2>
              {step.description && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{step.description}</p>
              )}
              <div className="space-y-2">
                {step.options.map((opt) => {
                  const selected = answers[step.id as keyof Answers] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        if (step.id === "reminder-setup") {
                          handleSetReminder(opt.id);
                        } else {
                          handleSingleSelect(step.id as keyof Answers, opt.id);
                        }
                      }}
                      className={`w-full text-left rounded-xl border p-3.5 flex items-center gap-3 transition-all duration-200 ${
                        selected
                          ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 ring-2 ring-emerald-500/20"
                          : "border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      {opt.emoji && <span className="text-lg shrink-0">{opt.emoji}</span>}
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{opt.label}</span>
                      {selected && (
                        <span className="ml-auto shrink-0 text-emerald-500">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(step?.type === "multi") && step.options && step.options.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{step.title}</h2>
              {step.description && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{step.description}</p>
              )}
              {step.multiMax && (
                <p className="text-xs text-zinc-400">En fazla {step.multiMax} seçim yapabilirsin.</p>
              )}
              <div className="space-y-2">
                {step.options.map((opt) => {
                  const key = step.id as keyof Answers;
                  const current = (answers[key] as string[]) ?? [];
                  const selected = current.includes(opt.id);
                  const atMax = !!step.multiMax && current.length >= step.multiMax;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        if (selected) {
                          dispatch({ type: "SET_ANSWER", key, value: current.filter((x: string) => x !== opt.id) });
                        } else if (!atMax) {
                          dispatch({ type: "SET_ANSWER", key, value: [...current, opt.id] });
                        }
                      }}
                      className={`w-full text-left rounded-xl border p-3.5 flex items-center gap-3 transition-all duration-200 ${
                        selected
                          ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 ring-2 ring-emerald-500/20"
                          : atMax
                          ? "opacity-40 cursor-not-allowed border-zinc-200/60 dark:border-zinc-700/40"
                          : "border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      {opt.emoji && <span className="text-lg shrink-0">{opt.emoji}</span>}
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{opt.label}</span>
                      <span
                        className={`ml-auto shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          selected
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {selected && (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step?.type === "loader" && (
            <div className="space-y-6 text-center py-8">
              {importError ? (
                <>
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950 text-3xl">
                    ⚠️
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    Linke ulaşamadım
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                    Bağlantıya erişemedim. İstersen birkaç yazını metin olarak yapıştırabilir ya da sıfırdan devam edebiliriz.
                  </p>
                  <div className="flex flex-col gap-2">
                    <GlassButton
                      variant="primary"
                      onClick={() => {
                        setImportError(false);
                        dispatch({ type: "SET_ANSWER", key: "importedContent", value: "" });
                        const prevIdx = STEPS.findIndex((s) => s.id === "import-input");
                        if (prevIdx >= 0) dispatch({ type: "GO_TO", stepIndex: prevIdx });
                      }}
                    >
                      Metin yapıştır
                    </GlassButton>
                    <GlassButton
                      variant="ghost"
                      onClick={() => {
                        setImportError(false);
                        dispatch({ type: "NEXT" });
                      }}
                    >
                      Sıfırdan devam et
                    </GlassButton>
                  </div>
                </>
              ) : generationError ? (
                <>
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950 text-3xl">
                    ⚠️
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    Persona oluşturulamadı
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                    AI servisine şu an ulaşılamadı. Lütfen tekrar dene.
                  </p>
                  <GlassButton
                    variant="primary"
                    className="w-full"
                    onClick={() => setGenerationAttempt((n) => n + 1)}
                  >
                    Tekrar dene
                  </GlassButton>
                </>
              ) : (
                <>
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950">
                    <span className="relative flex h-6 w-6">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-6 w-6 bg-emerald-500" />
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {step.title}
                  </h2>
                  {step.id === "warmup-enrich" ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 min-h-[1.25rem] transition-all duration-300">
                      {importStages[importStageIndex]}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{step.description}</p>
                  )}
                </>
              )}
            </div>
          )}

          {step?.type === "paywall" && (
            <div className="space-y-5 text-center">
              {/* Görsel header — AI yazıyor üstte, LinkedIn/X alt */}
              <div className="relative h-[116px] w-full">
                <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">AI yazıyor</span>
                  <span className="flex items-end gap-0.5 h-3">
                    {[0, 0.15, 0.3].map((d) => (
                      <span
                        key={d}
                        className="inline-block w-0.5 bg-emerald-500 origin-bottom"
                        style={{ height: "100%", animation: `pw-bar 0.7s ease-in-out ${d}s infinite alternate` }}
                      />
                    ))}
                  </span>
                </div>
                <div className="absolute bottom-0 left-2 w-[120px] rounded-xl border border-black/[0.06] dark:border-white/[0.09] bg-white/80 dark:bg-white/[0.054] px-3 py-2 flex items-center gap-2" style={{ animation: "pw-floatA 2.6s ease-in-out infinite" }}>
                  <span className="text-[13px] font-bold text-[#0a66c2]">in</span>
                  <div className="space-y-1">
                    <span className="block h-1 w-9 rounded-full bg-zinc-300 dark:bg-white/15" />
                    <span className="block h-1 w-6 rounded-full bg-zinc-300 dark:bg-white/15" />
                  </div>
                </div>
                <div className="absolute bottom-0 right-2 w-[120px] rounded-xl border border-black/[0.06] dark:border-white/[0.09] bg-white/80 dark:bg-white/[0.054] px-3 py-2 flex items-center gap-2" style={{ animation: "pw-floatC 3s ease-in-out 0.4s infinite" }}>
                  <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">X</span>
                  <div className="space-y-1">
                    <span className="block h-1 w-8 rounded-full bg-zinc-300 dark:bg-white/15" />
                    <span className="block h-1 w-5 rounded-full bg-zinc-300 dark:bg-white/15" />
                  </div>
                </div>
                <style>{`
                  @keyframes pw-bar { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
                  @keyframes pw-floatA { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
                  @keyframes pw-floatC { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                `}</style>
              </div>

              {/* V2 logo — light variant */}
              <div className="flex justify-center">
                <svg width="30" height="30" viewBox="0 0 26 26" fill="none" aria-hidden>
                  <rect width="26" height="26" rx="6.5" fill="rgba(5,150,105,0.09)" stroke="rgba(5,150,105,0.2)" strokeWidth="1" />
                  <rect x="1.5" y="10.5" width="2" height="5" rx="1" fill="#059669" opacity=".55" />
                  <rect x="4.5" y="6.5" width="2" height="13" rx="1" fill="#059669" opacity=".85" />
                  <rect x="7.5" y="5" width="2" height="16" rx="1" fill="#059669" />
                  <rect x="10.5" y="7" width="2" height="12" rx="1" fill="#059669" opacity=".7" />
                  <rect x="15" y="9.5" width="7" height="1.7" rx=".85" fill="currentColor" opacity=".58" />
                  <rect x="15" y="12.5" width="8.5" height="1.7" rx=".85" fill="currentColor" opacity=".48" />
                  <rect x="15" y="15.5" width="5.5" height="1.7" rx=".85" fill="currentColor" opacity=".4" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {step.title}
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-sm">
                {step.description}
              </p>

              {/* Plan seçim — Aylık ₺249,99 / Yıllık ₺1.899 (~%37 indirim) */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "yearly" as const, period: "YILLIK", price: "₺1.899", note: "Yıllık fatura · ~₺158/ay", save: "%37 İNDİRİM" },
                  { key: "monthly" as const, period: "AYLIK", price: "₺249,99", note: "Aylık fatura", save: null },
                ].map((p) => {
                  const active = selectedPlan === p.key;
                  return (
                    <button
                      type="button"
                      key={p.key}
                      onClick={() => setSelectedPlan(p.key)}
                      className={`relative rounded-2xl border px-3 py-4 text-left transition-all ${
                        active
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 ring-2 ring-emerald-500/20"
                          : "border-zinc-200 dark:border-white/[0.09] bg-white/60 dark:bg-white/[0.04]"
                      }`}
                    >
                      {p.save && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                          {p.save}
                        </span>
                      )}
                      <span className="block text-center text-[9px] font-bold tracking-widest text-zinc-400">PRO</span>
                      <span className={`block text-center text-xs font-semibold mt-1 ${active ? "text-emerald-600" : "text-zinc-600 dark:text-zinc-300"}`}>{p.period}</span>
                      <span className={`block text-center text-[22px] font-bold mt-2 ${active ? "text-emerald-600" : "text-zinc-900 dark:text-zinc-100"}`}>{p.price}</span>
                      <span className="block text-center text-[10px] text-zinc-400 mt-1.5">{p.note}</span>
                    </button>
                  );
                })}
              </div>

              {/* Trust + cancel note */}
              <div className="rounded-xl border border-zinc-200/60 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-white/[0.03] p-3 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed text-left">
                💳 Bu mock akıştır — kart alınmaz. 🔐 Personan kaydedildi · İstediğin zaman iptal et.
              </div>

              {/* CTA */}
              <div className="space-y-2">
                <GlassButton
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleSubscribe}
                  disabled={subscribing}
                >
                  {subscribing
                    ? "Stratejin hazırlanıyor..."
                    : selectedPlan === "yearly"
                      ? "Yıllık Aboneliği Başlat"
                      : "Aylık Aboneliği Başlat"}
                </GlassButton>
                <button
                  type="button"
                  onClick={handleNext}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors underline underline-offset-2"
                >
                  Belki sonra — personamı kaydet
                </button>
              </div>
            </div>
          )}

          {step?.type === "done" && (
            <div className="space-y-6 text-center py-8">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-3xl">
                ✦
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{step.title}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 animate-pulse">{step.description}</p>
            </div>
          )}

          {/* ── Multi-step reveal cards ── */}
          {step?.type === "reveal" && personaData && (
            <div className="space-y-4 animate-slide-up">
              {/* Card 1: Positioning */}
              {(step.id === "reveal-positioning" || step.id === "reveal-full-positioning") && (
                <>
                  <div className="text-center space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-2xl mb-2">
                      ✦
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                      {step.title}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{step.description}</p>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/60 dark:border-emerald-800/40 p-5 text-center">
                    <p className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-50 leading-relaxed italic">
                      &ldquo;{personaData?.positioning_statement ?? "Henüz oluşturulmadı."}&rdquo;
                    </p>
                  </div>
                  <p className="text-center text-xs text-zinc-400">Bunu sonra düzenleyebilirsin.</p>
                </>
              )}

              {/* Card 2: Pillars */}
              {(step.id === "reveal-pillars" || step.id === "reveal-full-pillars") && (
                <>
                  <div className="text-center space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-2xl mb-2">
                      📚
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                      {step.title}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{step.description}</p>
                  </div>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {(personaData?.pillars ?? []).length > 0 ? (
                      (personaData.pillars as { title: string; description: string }[]).map(
                        (pillar: { title: string; description: string }, i: number) => (
                          <div
                            key={i}
                            className="rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-4 space-y-1 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                          >
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                              {i + 1}. {pillar.title}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                              {pillar.description}
                            </p>
                          </div>
                        )
                      )
                    ) : (
                      <p className="text-sm text-zinc-400 text-center py-4">Henüz oluşturulmadı.</p>
                    )}
                  </div>
                  <p className="text-center text-xs text-zinc-400">Bunu sonra düzenleyebilirsin.</p>
                </>
              )}

              {/* Card 3: Voice Profile + Differentiation */}
              {(step.id === "reveal-voice" || step.id === "reveal-full-voice") && (
                <>
                  <div className="text-center space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950 text-2xl mb-2">
                      🎯
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                      {step.title}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{step.description}</p>
                  </div>

                  {/* Voice tags */}
                  {(personaData?.voice_profile ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Ses profili</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(personaData.voice_profile as string[]).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Differentiation */}
                  {personaData?.differentiation && (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Farklılaşma</p>
                      <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 p-3">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1.5">✅ Yap</p>
                        <ul className="space-y-1">
                          {(personaData.differentiation as { do: string[] })?.do?.map((item: string, i: number) => (
                            <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5">
                              <span className="text-emerald-500 shrink-0">·</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-800/40 p-3">
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5">❌ Yapma</p>
                        <ul className="space-y-1">
                          {(personaData.differentiation as { dont: string[] })?.dont?.map((item: string, i: number) => (
                            <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5">
                              <span className="text-red-400 shrink-0">·</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <p className="text-center text-xs text-zinc-400">Bunu sonra düzenleyebilirsin.</p>
                </>
              )}

              {/* Card 4: Sample Post — locked preview before paywall */}
              {step.id === "reveal-sample" && personaData && (
                <div className="relative">
                  <div className="space-y-6 overflow-y-auto max-h-[60vh] pb-24">
                    {/* Positioning */}
                    {personaData.positioning_statement && (
                      <div className="text-center space-y-2">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-xl">✦</div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Konumlandırma</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">&ldquo;{personaData.positioning_statement}&rdquo;</p>
                      </div>
                    )}
                    {/* Pillars */}
                    {(personaData.pillars ?? []).length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-center text-zinc-900 dark:text-zinc-50">İçerik Pillar&apos;ları</h3>
                        {(personaData.pillars as { title: string; description: string }[]).map((p, i) => (
                          <div key={i} className="rounded-lg border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-3">
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{i + 1}. {p.title}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{p.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Voice profile */}
                    {(personaData.voice_profile ?? []).length > 0 && (
                      <div className="text-center space-y-1.5">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Ses Profili</h3>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {(personaData.voice_profile as string[]).map((tag) => (
                            <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Sample post */}
                    {personaData.sample_post && (
                      <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-700/40 p-3 shadow-sm">
                        <p className="text-xs font-semibold text-zinc-500 mb-1">Örnek Post</p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{personaData.sample_post}</p>
                      </div>
                    )}
                  </div>
                  {/* Bottom fade + CTA */}
                  <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-b from-transparent to-white dark:to-zinc-950 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 pb-4 flex justify-center">
                    <GlassButton variant="primary" className="w-full" onClick={handleNext}>
                      Tüm stratejiye sahip ol ve içerik üretmeye başla →
                    </GlassButton>
                  </div>
                </div>
              )}
              {step.id === "reveal-full-sample" && (
                <>
                  <div className="text-center space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950 text-2xl mb-2">
                      ✍️
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                      {step.title}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{step.description}</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-700/40 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-xs font-bold text-emerald-800 dark:text-emerald-200">
                        S
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">Senin Sesin</p>
                        <p className="text-[10px] text-zinc-400">Mindfolio · Taslak</p>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                      {personaData?.sample_post ?? "Henüz oluşturulmadı."}
                    </p>
                  </div>
                  <p className="text-center text-xs text-zinc-400">Bunu sonra düzenleyebilirsin.</p>
                </>
              )}

              {/* ── Pillar Deepen ── */}
              {step?.id === "pillar-deepen" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{step.title}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{step.description}</p>
                  {pillarTopics.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="animate-pulse text-sm text-zinc-400">Konular oluşturuluyor...</span>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                      {pillarTopics.map((pt) => (
                        <div key={pt.pillarTitle} className="space-y-1.5">
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            {pt.pillarTitle}
                          </p>
                          <div className="space-y-1">
                            {pt.topics.map((topic) => (
                              <label
                                key={topic}
                                className="flex items-start gap-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-3 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 rounded border-zinc-300 dark:border-zinc-600 text-emerald-500 focus:ring-emerald-500/30"
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">{topic}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── FOOTER: navigation (normal flow, NOT absolute) ── */}
      <footer className="flex-shrink-0 pb-safe-bottom pb-6 pt-2 max-w-lg mx-auto w-full">
        {step && !["message", "motivation", "warmup", "reveal", "loader", "paywall", "done"].includes(step.type) && (
          <div className="flex items-center justify-between gap-3">
            {stepIndex > 0 && step.type !== "single" ? (
              <GlassButton variant="ghost" onClick={handleBack}>
                Geri
              </GlassButton>
            ) : (
              <div />
            )}

            {step.type === "single" ? null : (
              <GlassButton
                variant="primary"
                disabled={!canProceed(step, answers)}
                onClick={handleNext}
              >
                Devam
              </GlassButton>
            )}
          </div>
        )}

        {step?.type === "reveal" && step.id !== "reveal-sample" && (
          <div className="flex justify-center">
            <GlassButton
              variant="primary"
              className="w-full"
              onClick={handleNext}
            >
              {step.id.startsWith("reveal-full-") && step.id === "reveal-full-sample"
                ? "Oluşturmaya Başla"
                : "Devam"}
            </GlassButton>
          </div>
        )}
      </footer>
    </div>
  );
}

// ── Shared tag input component ──

function TagInputStep({
  step,
  items,
  onAdd,
  onRemove,
}: {
  step: Step;
  items: string[];
  onAdd: (val: string) => void;
  onRemove: (val: string) => void;
}) {
  const [input, setInput] = useState("");

  const handleAdd = useCallback(() => {
    const val = input.trim();
    if (val && !items.includes(val)) {
      onAdd(val);
      setInput("");
    }
  }, [input, items, onAdd]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{step.title}</h2>
      {step.description && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{step.description}</p>
      )}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          placeholder={step.placeholder}
          className="flex-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        <GlassButton size="sm" onClick={handleAdd}>
          Ekle
        </GlassButton>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-3 py-1 text-sm max-w-[160px] truncate"
              title={t}
            >
              <span className="truncate">{t}</span>
              <button
                onClick={() => onRemove(t)}
                className="shrink-0 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
