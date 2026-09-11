import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const translations: Record<string, any> = {
  en: {
    hello_explorer: "Hello, Explorer",
    find_your: "Find your",
    dream_job: "dream job",
    recent_notifications: "Recent Notifications",
    view_all: "View all",
    premium_job_seekers: "Premium for Job Seekers",
    starting_at: "Starting at just ₹9",
    home: "Home",
    jobs: "Jobs",
    search: "Search",
    applications: "Applications",
    profile: "Profile",
    services: "Services",
    urgent_recruitment: "Urgent Recruitment",
    high_salary: "20k+ Salary Jobs",
    fast_response: "Fast Response",
    show_more: "Show More Applications",
    genuine_verification: "Genuine Verification",
    upgrade_now: "Upgrade Now",
    no_jobs: "No jobs available at the moment.",
    login_welcome_back: "Welcome Back!",
    login_enter_mobile: "Enter your mobile number to continue",
    login_send_otp: "Send OTP",
    login_terms: "By continuing, you agree to our",
    login_tos: "Terms of Service",
    login_and: "and",
    login_privacy: "Privacy Policy"
  },
  te: {
    hello_explorer: "నమస్తే, అన్వేషకుడా",
    find_your: "మీ కలల",
    dream_job: "ఉద్యోగాన్ని కనుగొనండి",
    recent_notifications: "ఇటీవలి నోటిఫికేషన్‌లు",
    view_all: "అన్నీ చూడండి",
    premium_job_seekers: "ఉద్యోగార్థులకు ప్రీమియం",
    starting_at: "కేవలం ₹9 తో ప్రారంభం",
    home: "హోమ్",
    jobs: "ఉద్యోగాలు",
    search: "శోధన",
    applications: "దరఖాస్తులు",
    profile: "ప్రొఫైల్",
    services: "సేవలు",
    urgent_recruitment: "తక్షణ నియామకం",
    high_salary: "20k+ జీతం ఉద్యోగాలు",
    fast_response: "వేగవంతమైన స్పందన",
    show_more: "మరిన్ని దరఖాస్తులు",
    genuine_verification: "జెన్యూన్ వెరిఫికేషన్",
    upgrade_now: "ఇప్పుడే అప్‌గ్రే드 చేయండి",
    no_jobs: "ప్రస్తుతం ఎలాంటి ఉద్యోగాలు అందుబాటులో లేవు.",
    login_welcome_back: "తిరిగి స్వాగతం!",
    login_enter_mobile: "కొనసాగించడానికి మీ మొబైల్ నంబర్‌ను నమోదు చేయండి",
    login_send_otp: "OTP పంపండి",
    login_terms: "కొనసాగించడం ద్వారా, మీరు మా",
    login_tos: "సేవా నిబంధనలు",
    login_and: "మరియు",
    login_privacy: "గోప్యతా విధానం"
  },
  hi: {
    hello_explorer: "नमस्ते, एक्सप्लोरर",
    find_your: "अपनी सपनों की",
    dream_job: "नौकरी खोजें",
    recent_notifications: "हाल की सूचनाएं",
    view_all: "सभी देखें",
    premium_job_seekers: "नौकरी चाहने वालों के लिए प्रीमियम",
    starting_at: "सिर्फ ₹9 से शुरू",
    home: "होम",
    jobs: "नौकरियां",
    search: "खोज",
    applications: "आवेदन",
    profile: "प्रोफ़ाइल",
    services: "सेवाएं",
    urgent_recruitment: "तत्काल भर्ती",
    high_salary: "20k+ वेतन वाली नौकरियां",
    fast_response: "त्वरित प्रतिक्रिया",
    show_more: "अधिक आवेदन दिखाएं",
    genuine_verification: "जेनुइन वेरिफिकेशन",
    upgrade_now: "अभी अपग्रेड करें",
    no_jobs: "फिलहाल कोई नौकरी उपलब्ध नहीं है।",
    login_welcome_back: "वापसी पर स्वागत है!",
    login_enter_mobile: "जारी रखने के लिए अपना मोबाइल नंबर दर्ज करें",
    login_send_otp: "OTP भेजें",
    login_terms: "जारी रखकर, आप हमारी",
    login_tos: "सेवा की शर्तें",
    login_and: "और",
    login_privacy: "गोपनीयता नीति"
  },
  kn: {
    hello_explorer: "ನಮಸ್ಕಾರ, ಅನ್ವೇಷಕರೆ",
    find_your: "ನಿಮ್ಮ ಕನಸಿನ",
    dream_job: "ಉದ್ಯೋಗವನ್ನು ಹುಡುಕಿ",
    recent_notifications: "ಇತ್ತೀಚಿನ ಅಧಿಸೂಚನೆಗಳು",
    view_all: "ಎಲ್ಲವನ್ನೂ ವೀಕ್ಷಿಸಿ",
    premium_job_seekers: "ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿಗಳಿಗೆ ಪ್ರೀಮಿಯಂ",
    starting_at: "ಕೇವಲ ₹9 ರಿಂದ ಪ್ರಾರಂಭ",
    home: "ಮುಖಪುಟ",
    jobs: "ಉದ್ಯೋಗಗಳು",
    search: "ಹುಡುಕಾಟ",
    applications: "ಅರ್ಜಿಗಳು",
    profile: "ಪ್ರೊಫೈಲ್",
    services: "ಸೇವೆಗಳು",
    urgent_recruitment: "ತುರ್ತು ನೇಮಕಾತಿ",
    high_salary: "20k+ ವೇತನದ ಉದ್ಯೋಗಗಳು",
    fast_response: "ತ್ವರಿತ ಪ್ರತಿಕ್ರಿಯೆ",
    show_more: "ಹೆಚ್ಚಿನ ಅರ್ಜಿಗಳನ್ನು ತೋರಿಸಿ",
    genuine_verification: "ಜೆನ್ಯೂನ್ ಪರಿಶೀಲನೆ",
    upgrade_now: "ಈಗ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ",
    no_jobs: "ಪ್ರಸ್ತುತ ಯಾವುದೇ ಉದ್ಯೋಗಗಳು ಲಭ್ಯವಿಲ್ಲ.",
    login_welcome_back: "ಮತ್ತೆ ಸ್ವಾಗತ!",
    login_enter_mobile: "ಮುಂದುವರಿಯಲು ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ",
    login_send_otp: "OTP ಕಳುಹಿಸಿ",
    login_terms: "ಮುಂದುವರಿಯುವ ಮೂಲಕ, ನೀವು ನಮ್ಮ",
    login_tos: "ಸೇವಾ ನಿಯಮಗಳು",
    login_and: "ಮತ್ತು",
    login_privacy: "ಗೌಪ್ಯತಾ ನೀತಿ"
  }
};

type LocalizationContextType = {
  t: (key: string) => string;
  locale: string;
  setLocale: (lang: string) => void;
};

export const LocalizationContext = createContext<LocalizationContextType>({
  t: (key: string) => key,
  locale: 'en',
  setLocale: () => {},
});

export const LocalizationProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState('en');

  useEffect(() => {
    const loadLang = async () => {
      const savedLang = await AsyncStorage.getItem('userLanguage');
      if (savedLang) setLocaleState(savedLang);
    };
    loadLang();
  }, []);

  const setLocale = async (lang: string) => {
    setLocaleState(lang);
    await AsyncStorage.setItem('userLanguage', lang);
  };

  const t = (key: string) => {
    return translations[locale]?.[key] || translations['en'][key] || key;
  };

  return (
    <LocalizationContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useTranslation = () => useContext(LocalizationContext);
