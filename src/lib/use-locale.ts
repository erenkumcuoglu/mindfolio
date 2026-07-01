"use client";

import { useState, useEffect } from "react";

const TR = {
  studioTitle: "Stüdyo", studioDesc: "Kaydet, yazıya çevir, içerik üret",
  contentTitle: "İçerikler", contentDesc: "İçeriklerini planla ve düzenle",
  ideasTitle: "Fikirler", ideasDesc: "Kaydettiğin bağlantılar ve ilham",
  profileTitle: "Profil", profileDesc: "Kişisel bilgilerin ve tercihlerin",
  newContent: "Yeni İçerik", newIdea: "Yeni Fikir", close: "Kapat",
  // Studio
  audioSec: "Ses",
  transcriptSec: "Transkript / Notlar",
  startRec: "Kayıt Başlat", recordAnother: "Yeni Kayıt",
  uploadAudio: "Ses Dosyası Yükle",
  toText: "Metne Çevir", discard: "Vazgeç",
  pause: "Duraklat", resume: "Devam Et", stop: "Durdur",
  recordingLb: "Kayıt",
  transcriptPlaceholder: "Transkriptini yapıştır ya da notlarını buraya yaz…",
  genSettings: "Üretim Ayarları",
  outputLang: "Çıktı dili",
  addNotesLabel: "Ek notlar (isteğe bağlı) — söylemeyi unuttuğun ya da vurgulamak istediğin şeyler",
  addNotesPlaceholder: "örn. daha samimi bir ton istiyorum, yeni ürün lansmanından bahset, sona bir çağrı ekle…",
  generateDraft: "Taslak Üret",
  saveDraft: "Taslağı Kaydet", updateDraft: "Taslağı Güncelle",
  saveToContent: "Taslağı Kaydet", updateInContent: "Taslağı Güncelle",
  copyDraft: "Taslağı Kopyala", copy: "Kopyala", copied: "Kopyalandı!",
  linkToIdea: "Fikre Bağla", changeLink: "Bağlantıyı Değiştir",
  titleSec: "Başlık", regenTitles: "Başlıkları yenile",
  pickTitle: "Bir başlık seç:", changeTitle: "Başlığı değiştir",
  genTitleOptions: "Başlık önerileri üret",
  draftSec: "Taslak", repurpose: "Taslağı Çoğalt",
  generatePrefix: "Üret", regenerate: "Yeniden üret",
  shareOnX: "X'te Paylaş", shareOnLinkedin: "LinkedIn'de Paylaş",
  startNewTitle: "Yeni içerik başlat?",
  startNewBody: "Bu, mevcut kaydını, transkriptini, taslağını ve üretilen gönderileri siler. Geri alınamaz.",
  cancel: "Vazgeç", startNewContent: "Yeni içerik başlat",
  linkModalTitle: "Taslağı Fikre Bağla",
  linkModalDesc: "Bu taslağı bağlamak için var olan bir fikir ara.",
  searchIdeas: "Fikirlerde ara…",
  searching: "Aranıyor…", noResults: "Sonuç yok", noIdeas: "Henüz fikir yok",
  // Content status
  filterAll: "Tümü",
  statusDraft: "Taslak", statusPublished: "Yayında", statusArchived: "Arşiv",
  draftAttached: "Taslak hazır",
  publish: "Yayınla", unpublish: "Yayından Kaldır",
  archive: "Arşivle", unarchive: "Arşivden Çıkar",
  noContent: "Henüz içerik yok", loadingText: "Yükleniyor…",
  contentTitlePh: "İçerik başlığı", selectPillar: "Pillar seç", draftLabel: "Taslak",
  scheduledDate: "Planlanan yayın tarihi", saveContentBtn: "İçeriği Kaydet", saving: "Kaydediliyor…",
  editContent: "İçeriği Düzenle", saveChanges: "Değişiklikleri Kaydet", del: "Sil", areYouSure: "Emin misin?",
  // Ideas
  titlePh: "Başlık", urlPastePh: "Bir URL yapıştır — önizleme otomatik gelir", addTagPh: "Etiket ekle…",
  saveIdea: "Fikri Kaydet", editIdea: "Fikri Düzenle", urlOptionalPh: "URL (opsiyonel)", notesPh: "Not veya özet…", add: "Ekle",
  // Profile
  yourNamePh: "Adın", savedExcl: "Kaydedildi!",
  displayName: "Görünen ad", emailLabel: "E-posta", emailLocked: "E-posta değiştirilemez. Yardım için destekle iletişime geç.", saveChangesBtn: "Değişiklikleri kaydet",
  // Settings
  currentPwPh: "Mevcut şifre", newPwPh: "Yeni şifre (en az 6 karakter)",
  delLi1: "Tüm taslakların ve transkriptlerin silinecek",
  delLi2: "Kaydettiğin tüm fikirler ve bağlantılar silinecek",
  delLi3: "Yazı persona'n silinecek",
  delLi4: "Tüm ses kayıtların silinecek",
  delLi5: "Hesabın sistemden kaldırılacak",
  writeText: "Metin Yaz", writeBodyPh: "Aklındaki fikri buraya yaz…",
  language: "Dil", langTurkish: "Türkçe", langEnglish: "English",
};

const EN: typeof TR = {
  studioTitle: "Studio", studioDesc: "Record, transcribe, and generate content",
  contentTitle: "Content", contentDesc: "Plan, organize, and schedule your content",
  ideasTitle: "Ideas", ideasDesc: "Bookmarked links, notes, and inspiration",
  profileTitle: "Profile", profileDesc: "Your personal preferences and information",
  newContent: "New Content", newIdea: "New Idea", close: "Close",
  // Studio
  audioSec: "Audio",
  transcriptSec: "Transcript / Notes",
  startRec: "Start Recording", recordAnother: "Record another",
  uploadAudio: "Upload audio file",
  toText: "Convert to text", discard: "Discard",
  pause: "Pause", resume: "Resume", stop: "Stop",
  recordingLb: "Recording",
  transcriptPlaceholder: "Paste your transcript or write your notes here…",
  genSettings: "Generate Settings",
  outputLang: "Output language",
  addNotesLabel: "Additional notes (optional) — things you forgot to mention or want to emphasize",
  addNotesPlaceholder: "e.g., I want the tone to be more casual, mention the new product launch, and add a call to action at the end…",
  generateDraft: "Generate Draft",
  saveDraft: "Save Draft", updateDraft: "Update Saved Draft",
  saveToContent: "Save to Content", updateInContent: "Update in Content",
  copyDraft: "Copy Draft", copy: "Copy", copied: "Copied!",
  linkToIdea: "Link to Idea", changeLink: "Change Link",
  titleSec: "Title", regenTitles: "Regenerate titles",
  pickTitle: "Pick a title:", changeTitle: "Change title",
  genTitleOptions: "Generate title options",
  draftSec: "Draft", repurpose: "Repurpose Draft",
  generatePrefix: "Generate", regenerate: "Regenerate",
  shareOnX: "Share on X", shareOnLinkedin: "Share on LinkedIn",
  startNewTitle: "Start a new content?",
  startNewBody: "This clears your current recording, transcript, draft, and generated posts. This can't be undone.",
  cancel: "Cancel", startNewContent: "Start new content",
  linkModalTitle: "Link Draft to Idea",
  linkModalDesc: "Search for an existing idea to link this draft to.",
  searchIdeas: "Search ideas…",
  searching: "Searching…", noResults: "No results", noIdeas: "No ideas yet",
  // Content status
  filterAll: "All",
  statusDraft: "Draft", statusPublished: "Published", statusArchived: "Archived",
  draftAttached: "Draft ready",
  publish: "Publish", unpublish: "Unpublish",
  archive: "Archive", unarchive: "Unarchive",
  noContent: "No content yet", loadingText: "Loading…",
  contentTitlePh: "Content title", selectPillar: "Select pillar", draftLabel: "Draft",
  scheduledDate: "Scheduled publish date", saveContentBtn: "Save Content", saving: "Saving…",
  editContent: "Edit Content", saveChanges: "Save Changes", del: "Delete", areYouSure: "Are you sure?",
  // Ideas
  titlePh: "Title", urlPastePh: "Paste a URL — preview will auto-fetch", addTagPh: "Add tag...",
  saveIdea: "Save Idea", editIdea: "Edit Idea", urlOptionalPh: "URL (optional)", notesPh: "Notes or summary...", add: "Add",
  // Profile
  yourNamePh: "Your name", savedExcl: "Saved!",
  displayName: "Display name", emailLabel: "Email", emailLocked: "Email cannot be changed. Contact support for assistance.", saveChangesBtn: "Save changes",
  // Settings
  currentPwPh: "Current password", newPwPh: "New password (min. 6 characters)",
  delLi1: "All your drafts and transcripts will be deleted",
  delLi2: "All your saved ideas and links will be deleted",
  delLi3: "Your writing persona will be deleted",
  delLi4: "Any audio recordings will be deleted",
  delLi5: "Your account will be removed from the system",
  writeText: "Write Text", writeBodyPh: "Write your idea here…",
  language: "Language", langTurkish: "Türkçe", langEnglish: "English",
};

/**
 * Device-language strings for nav/headers (tr → Turkish, else English).
 * Resolves on the client after mount to avoid SSR hydration mismatches
 * (renders English first paint, then flips if the device is Turkish).
 */
const STORE_KEY = "mindfolio.lang";

/** Resolve current language: user override (localStorage) > browser > Turkish. */
function resolveTr(): boolean {
  try {
    const ov = localStorage.getItem(STORE_KEY);
    if (ov === "tr") return true;
    if (ov === "en") return false;
    return !(navigator.language || "tr").slice(0, 2).toLowerCase().startsWith("en");
  } catch {
    return true;
  }
}

/** Persist a language override and notify all useLocale() consumers. */
export function setAppLocale(lang: "tr" | "en") {
  try {
    localStorage.setItem(STORE_KEY, lang);
    window.dispatchEvent(new Event("mf-locale"));
  } catch {
    /* ignore */
  }
}

export function useLocale() {
  // Turkish-first default for SSR first paint; resolves override/browser on mount
  // and reacts to language changes (custom event + cross-tab storage event).
  const [tr, setTr] = useState(true);
  useEffect(() => {
    const update = () => setTr(resolveTr());
    update();
    window.addEventListener("mf-locale", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("mf-locale", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return tr ? TR : EN;
}

/** Hook for a language switcher UI. */
export function useLocaleControl(): { lang: "tr" | "en"; setLang: (l: "tr" | "en") => void } {
  const [lang, setLangState] = useState<"tr" | "en">("tr");
  useEffect(() => {
    const update = () => setLangState(resolveTr() ? "tr" : "en");
    update();
    window.addEventListener("mf-locale", update);
    return () => window.removeEventListener("mf-locale", update);
  }, []);
  return { lang, setLang: (l) => setAppLocale(l) };
}
