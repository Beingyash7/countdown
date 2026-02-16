import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { TimeRemaining } from './types';
import { generateMissionUpdate } from './services/geminiService';
import { getUsersData, updateCurrentUser, UserRecord, getCurrentUser, saveUsersData } from './usersdata';
import { logEvent, sendTelemetry } from './services/telemetry';
import { SEO_ROUTE_MAP } from './seoConfig.js';

type SeoRoutePath = '/' | '/about' | '/revision-plan' | '/math-plan' | '/science-plan' | '/english-plan' | '/faq' | '/privacy';

const ADMIN_PATH = (import.meta.env.VITE_ADMIN_PATH || '/website/admin-yash') as string;
const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD || 'yash2701') as string;
const SITE_URL = ((import.meta.env.VITE_SITE_URL || window.location.origin) as string).replace(/\/$/, '');
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-ssc-countdown.png`;

const App: React.FC = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path={ADMIN_PATH} element={<AdminPage />} />
    <Route path="/" element={<DashboardPage />} />
    <Route path="/about" element={<AboutPage />} />
    <Route path="/revision-plan" element={<RevisionPlanPage />} />
    <Route path="/math-plan" element={<MathPlanPage />} />
    <Route path="/science-plan" element={<SciencePlanPage />} />
    <Route path="/english-plan" element={<EnglishPlanPage />} />
    <Route path="/faq" element={<FaqPage />} />
    <Route path="/privacy" element={<PrivacyPage />} />
    <Route path="*" element={<DashboardPage />} />
  </Routes>
);

const useCanonical = () => {
  const location = useLocation();
  return `${SITE_URL}${location.pathname}`;
};

const getSeoForPath = (path: SeoRoutePath) => SEO_ROUTE_MAP[path];

const Seo: React.FC<{
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
  keywords?: string[];
  robots?: string;
  schemaGraph?: Record<string, unknown>[];
}> = ({ title, description, canonical, ogType = 'website', keywords, robots, schemaGraph }) => {
  useEffect(() => {
    const head = document.head;
    document.title = title;

    const setMeta = (key: string, value: string, isProperty = false) => {
      if (!value) return;
      const selector = isProperty ? `meta[property="${key}"]` : `meta[name="${key}"]`;
      let el = head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        if (isProperty) el.setAttribute('property', key);
        else el.setAttribute('name', key);
        head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    const setLink = (rel: string, href: string) => {
      if (!href) return;
      let el = head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    setMeta('description', description);
    setMeta('keywords', (keywords || []).join(', '));
    setMeta('robots', robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setLink('canonical', canonical);

    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:url', canonical, true);
    setMeta('og:type', ogType, true);
    setMeta('og:image', DEFAULT_OG_IMAGE, true);

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', DEFAULT_OG_IMAGE);

    const existingScript = head.querySelector('script[data-seo-schema="true"]') as HTMLScriptElement | null;
    if (schemaGraph && schemaGraph.length > 0) {
      const script = existingScript || document.createElement('script');
      if (!existingScript) {
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-schema', 'true');
        head.appendChild(script);
      }
      script.text = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': schemaGraph,
      });
    } else if (existingScript) {
      existingScript.remove();
    }
  }, [title, description, canonical, ogType, keywords, robots, schemaGraph]);

  return null;
};

const SiteShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen overflow-x-hidden overflow-y-auto py-10 bg-background-dark relative w-full flex items-start justify-center px-6 md:px-8">
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-40 scale-110">
        <source src="https://assets.mixkit.co/videos/preview/mixkit-the-earth-rotating-in-space-20093-large.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-background-dark/80"></div>
    </div>

    <div className="absolute inset-0 z-1 pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
    </div>

    <main className="relative z-10 w-full max-w-5xl p-6 md:p-12 pt-24 md:pt-28">
      {children}
      <SiteFooter />
    </main>
  </div>
);

const SiteFooter: React.FC = () => (
  <footer className="mt-16 border-t border-white/10 pt-6 text-[11px] text-white/40 flex flex-wrap gap-4">
    <Link className="hover:text-white" to="/">Home</Link>
    <Link className="hover:text-white" to="/about">About</Link>
    <Link className="hover:text-white" to="/revision-plan">Revision Plan</Link>
    <Link className="hover:text-white" to="/math-plan">Math Plan</Link>
    <Link className="hover:text-white" to="/science-plan">Science Plan</Link>
    <Link className="hover:text-white" to="/english-plan">English Plan</Link>
    <Link className="hover:text-white" to="/faq">FAQ</Link>
    <Link className="hover:text-white" to="/privacy">Privacy</Link>
  </footer>
);

const RelatedResources: React.FC<{ currentPath: SeoRoutePath }> = ({ currentPath }) => {
  const resources = [
    { to: '/', label: '10th SSC exam countdown' },
    { to: '/revision-plan', label: '10th SSC revision plan' },
    { to: '/math-plan', label: 'SSC math checklist' },
    { to: '/science-plan', label: 'Class 10 science revision' },
    { to: '/english-plan', label: 'SSC English writing practice' },
    { to: '/faq', label: '10th SSC board exam FAQ' },
  ] as const;

  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-3">Related SSC Resources</h2>
      <div className="flex flex-wrap gap-3 text-[12px] text-white/60">
        {resources
          .filter((resource) => resource.to !== currentPath)
          .map((resource) => (
            <Link key={resource.to} className="hover:text-white underline decoration-white/20" to={resource.to}>
              {resource.label}
            </Link>
          ))}
      </div>
    </section>
  );
};

const DashboardPage: React.FC = () => {
  const canonical = useCanonical();
  const [user, setUser] = useState<UserRecord>(getCurrentUser());
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [progressInput, setProgressInput] = useState(user.progress);
  const [nameError, setNameError] = useState('');
  const [progressError, setProgressError] = useState('');

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTick = useCallback(() => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  }, [isMuted]);

  useEffect(() => {
    const captureMetadata = async () => {
      const ua = navigator.userAgent;
      let browser = 'Unknown';
      let os = 'Unknown';
      let device = 'Desktop';

      if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
      else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
      else if (ua.indexOf('Safari') > -1) browser = 'Safari';
      else if (ua.indexOf('Edge') > -1) browser = 'Edge';

      if (ua.indexOf('Win') > -1) os = 'Windows';
      else if (ua.indexOf('Mac') > -1) os = 'MacOS';
      else if (ua.indexOf('Linux') > -1) os = 'Linux';
      else if (ua.indexOf('Android') > -1) os = 'Android';
      else if (ua.indexOf('iPhone') > -1) os = 'iOS';

      if (/Mobi|Android/i.test(ua)) device = 'Mobile';

      const updated = updateCurrentUser({ browser, os, device, platform: navigator.platform });
      setUser(updated);

      void sendTelemetry('page_view', {
        userId: updated.id,
        name: updated.name,
        missionName: updated.missionName,
        progress: updated.progress,
        status: updated.status,
      });
    };
    captureMetadata();
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    const savedProgressRaw = localStorage.getItem('userProgress');
    const trimmed = (savedName || '').trim();
    const progressNum = savedProgressRaw !== null ? Number(savedProgressRaw) : Number.NaN;
    const validName = trimmed.length >= 2;
    const validProgress = Number.isFinite(progressNum) && progressNum >= 0 && progressNum <= 100;

    if (validName && validProgress) {
      if (trimmed !== user.name || progressNum !== user.progress) {
        const updated = updateCurrentUser({ name: trimmed, progress: progressNum });
        setUser(updated);
      }
      setNameInput(trimmed);
      setProgressInput(progressNum);
      setIsProfileModalOpen(false);
    } else {
      setNameInput(validName ? trimmed : '');
      setProgressInput(validProgress ? progressNum : user.progress);
      setIsProfileModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isProfileModalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isProfileModalOpen]);

  const targetDate = useMemo(() => {
    const now = new Date();
    let d = new Date(now.getFullYear(), 1, 22);
    if (now > d) d = new Date(now.getFullYear() + 1, 1, 22);
    return d;
  }, []);

  const calculateTimeLeft = useCallback(() => {
    const difference = +targetDate - +new Date();
    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }, [targetDate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
      playTick();
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [calculateTimeLeft, playTick]);

  const handleRefreshStatus = async () => {
    setIsSyncing(true);
    const newStatus = await generateMissionUpdate(user.missionName);
    const updated = updateCurrentUser({ status: newStatus });
    setUser(updated);
    void sendTelemetry('status_refresh', {
      userId: updated.id,
      name: updated.name,
      missionName: updated.missionName,
      progress: updated.progress,
      status: updated.status,
    });
    setIsSyncing(false);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    const progressVal = Number(progressInput);
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters.');
    } else {
      setNameError('');
    }
    if (!Number.isFinite(progressVal) || progressVal < 0 || progressVal > 100) {
      setProgressError('Progress must be between 0 and 100.');
      return;
    }
    setProgressError('');
    localStorage.setItem('userName', trimmed);
    localStorage.setItem('userProgress', String(progressVal));
    const updated = updateCurrentUser({ name: trimmed, progress: progressVal });
    setUser(updated);
    void logEvent('name_submit', trimmed);
    void sendTelemetry('profile_update', {
      userId: updated.id,
      name: updated.name,
      missionName: updated.missionName,
      progress: updated.progress,
      status: updated.status,
    });
    setIsProfileModalOpen(false);
  };

  const handleChangeName = () => {
    localStorage.removeItem('userName');
    localStorage.removeItem('userProgress');
    setNameInput('');
    setProgressInput(0);
    setNameError('');
    setProgressError('');
    setIsProfileModalOpen(true);
  };

  const seo = getSeoForPath('/');
  const websiteSchemaGraph = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: '10th SSC Exam Countdown',
      url: SITE_URL,
      logo: `${SITE_URL}/logo-ssc-countdown.png`,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: '10th SSC Exam Countdown',
      inLanguage: 'en-IN',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ] as Record<string, unknown>[];

  return (
    <SiteShell>
      <Seo
        title={seo.title}
        description={seo.description}
        canonical={canonical}
        keywords={seo.keywords}
        schemaGraph={websiteSchemaGraph}
      />

      <div className="absolute top-6 md:top-10 left-6 md:left-10 z-20 flex items-center space-x-3">
        <img
          src="/logo-ssc-countdown.png"
          alt="10th SSC exam countdown for Maharashtra Board"
          width={40}
          height={40}
          className="w-10 h-10 rounded-lg bg-white/90 object-contain p-[2px] shadow-lg shadow-primary/30"
          loading="eager"
        />
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-white tracking-[0.2em] leading-none uppercase">Apex Terminal</span>
          <span className="text-[9px] font-medium text-primary tracking-[0.3em] mt-1 uppercase">Candidate: {user.name}</span>
        </div>
      </div>

      <div className="absolute top-6 md:top-10 right-6 md:right-10 z-20 flex items-center space-x-3">
        <button
          onClick={handleChangeName}
          className="flex items-center space-x-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-widest text-white/50"
        >
          <span className="material-icons text-sm">badge</span>
          <span>Change Name</span>
        </button>
        <button
          onClick={() => { setNameInput(user.name); setProgressInput(user.progress); setNameError(''); setProgressError(''); setIsProfileModalOpen(true); }}
          className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-widest text-white/70"
        >
          <span className="material-icons text-sm">edit</span>
          <span>Edit Profile</span>
        </button>
      </div>

      <div className="acrylic relative z-10 rounded-3xl flex flex-col min-h-[600px] border border-white/10 shadow-2xl">
        <header className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Signal Synchronized</span>
            </div>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition-all ${isMuted ? 'border-white/10 text-white/30' : 'border-primary/40 text-primary animate-pulse'}`}
            >
              <span className="material-icons text-sm">{isMuted ? 'volume_off' : 'volume_up'}</span>
              <span className="text-[8px] font-black uppercase tracking-widest">{isMuted ? 'Muted' : 'Sound On'}</span>
            </button>
          </div>
          <button onClick={handleRefreshStatus} className="text-white/20 hover:text-white transition-colors">
            <span className={`material-icons text-lg ${isSyncing ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </header>

        <div className="flex-grow flex flex-col items-center justify-center text-center p-12">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase tracking-[0.3em] mb-6">
              <span className="material-icons text-[12px] mr-2">timer</span>
              Launch: Feb 22, {targetDate.getFullYear()}
            </div>
            <h1 className="sr-only">10th SSC exam countdown and SSC board exam countdown timer</h1>
            <h2 className="text-5xl md:text-7xl font-extralight text-white tracking-tighter mb-4">{user.missionName}</h2>
            <p className="max-w-xl mx-auto text-white/40 text-sm font-light tracking-wide italic leading-relaxed">"{user.status}"</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mt-8 w-full max-w-4xl">
            <TimeUnit value={timeLeft.days} label="Days" />
            <TimeUnit value={timeLeft.hours} label="Hours" />
            <TimeUnit value={timeLeft.minutes} label="Minutes" />
            <TimeUnit value={timeLeft.seconds} label="Seconds" isPrimary />
          </div>

          <div className="w-full max-w-2xl mt-16 px-4">
            <div className="flex justify-between items-end mb-4">
              <span className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">Preparation Level</span>
              <span className="text-2xl font-extralight text-primary">{user.progress}%</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000 shadow-[0_0_15px_rgba(19,127,236,0.6)]"
                style={{ width: `${user.progress}%` }}
              />
            </div>
            <div className="flex justify-end mt-3">
              <Link
                to="/revision-plan"
                className="text-[11px] uppercase tracking-widest text-primary hover:text-white transition-colors"
              >
                Revision Plan -&gt;
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <ContentCard title="What is SSC Board Exam Countdown for Class 10?" headingLevel="h2">
          <p className="text-white/60 text-sm leading-relaxed">
            This 10th SSC exam countdown is designed for students who want clear direction during board preparation. The timer shows how many
            days are left for exam readiness and helps you break preparation into realistic daily targets. Instead of random study sessions, you
            can use this dashboard to combine revision, practice papers, and error correction in one routine. If you are searching for an SSC
            board exam countdown that also supports execution, this page is built for that exact need.
          </p>
          <p className="text-white/60 text-sm leading-relaxed">
            Many students ask how to turn time left into marks. Start with a short weekly plan, then track completion and weak chapters every day.
            That means concept recap, timed question sets, and review of mistakes. This cycle is practical for all-India Class 10 SSC learners and
            aligns with common board exam patterns. The target is not only to finish syllabus, but to improve recall speed and answer quality under
            exam pressure.
          </p>
        </ContentCard>

        <ContentCard title="How to use this for SSC board ki tayari (daily routine)" headingLevel="h2">
          <div className="grid gap-4 text-white/60 text-sm leading-relaxed">
            <Section title="Step 1: 60-minute concept block">
              Pick one chapter and revise formulas, definitions, and key examples. This makes your base strong before problem solving starts.
            </Section>
            <Section title="Step 2: 45-minute practice block">
              Solve mixed questions with a timer. Mark doubtful questions so your 10th SSC prep plan stays focused on weak areas.
            </Section>
            <Section title="Step 3: 20-minute error log">
              Rewrite wrong answers with the correct method. Repeating this daily is one of the fastest ways to improve board score consistency.
            </Section>
          </div>
          <div className="space-y-3">
            <h2 className="text-white/80 text-sm font-semibold mt-4">Quick FAQ for students</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Q: SSC board exam ke liye revision kab start karna chahiye? A: Start immediately with short daily cycles, then increase paper
              practice in the final 3 weeks.
            </p>
            <p className="text-white/60 text-sm leading-relaxed">
              Q: Is this only for one state board? A: No, the strategy is useful for all-India SSC style preparation.
            </p>
            <p className="text-white/60 text-sm leading-relaxed">
              Q: What if I miss one day? A: Do a half-day recovery plan and continue. Do not restart from zero.
            </p>
          </div>
          <RelatedResources currentPath="/" />
        </ContentCard>
      </div>

      {isProfileModalOpen && (
        <NameModal
          value={nameInput}
          progress={progressInput}
          error={nameError}
          progressError={progressError}
          onChange={setNameInput}
          onProgressChange={setProgressInput}
          onSubmit={handleProfileSubmit}
        />
      )}
    </SiteShell>
  );
};
const AboutPage: React.FC = () => {
  const canonical = useCanonical();
  const seo = getSeoForPath('/about');
  return (
    <SiteShell>
      <Seo
        title={seo.title}
        description={seo.description}
        canonical={canonical}
        keywords={seo.keywords}
      />
      <ContentCard title="About the 10th SSC exam countdown platform">
        <p className="text-white/60 text-sm leading-relaxed">
          This website is built for Class 10 students preparing for SSC board exams across India. The main purpose is to convert time left into a
          practical action plan, not just show a timer. Students usually search for a 10th SSC exam countdown and then struggle with daily
          execution. Here, countdown, revision structure, and subject checklists are combined so planning and studying stay connected.
        </p>
        <p className="text-white/60 text-sm leading-relaxed">
          The workflow is simple: identify weak chapters, run short daily revision blocks, track completion, and practice timed papers frequently.
          This works well for learners doing ssc board ki tayari because consistency matters more than one-time long sessions. If you are following
          a 10th SSC prep plan, use the linked revision pages to set weekly goals and monitor progress.
        </p>
        <RelatedResources currentPath="/about" />
      </ContentCard>
    </SiteShell>
  );
};

const RevisionPlanPage: React.FC = () => {
  const canonical = useCanonical();
  const seo = getSeoForPath('/revision-plan');
  const schemaGraph = [
    {
      '@type': 'Article',
      headline: '10th SSC revision plan for 7, 10, and 15 day preparation cycles',
      author: { '@type': 'Organization', name: '10th SSC Exam Countdown' },
      datePublished: '2026-02-12',
      dateModified: '2026-02-13',
      mainEntityOfPage: canonical,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Revision Plan', item: canonical },
      ],
    },
  ] as Record<string, unknown>[];

  return (
    <SiteShell>
      <Seo
        title={seo.title}
        description={seo.description}
        canonical={canonical}
        ogType={seo.ogType}
        keywords={seo.keywords}
        schemaGraph={schemaGraph}
      />
      <ContentCard title="10th SSC revision plan: practical prep for board exams">
        <p className="text-white/60 text-sm leading-relaxed">
          This 10th SSC revision plan is made for students who want a repeatable system before exams. Most learners lose marks because they revise
          randomly, not because they are weak in every chapter. Use this plan to cycle through concept recall, practice questions, and quick error
          analysis every day. If you searched for ssc board exam ke liye revision, this structure gives you a clear order of work so you can avoid
          panic and still cover important topics with consistency.
        </p>
        <p className="text-white/60 text-sm leading-relaxed">
          Start by listing weak chapters for each subject. Next, allocate fixed daily blocks and keep one timed section test every two to three
          days. Review mistakes the same day so memory correction is immediate. This method helps students increase answer accuracy and speed
          together. The goal is not to study all day, but to study in a controlled pattern that improves output every week.
        </p>
        <div className="grid gap-4 text-white/60 text-sm leading-relaxed">
          <Section title="Day 1-2: Core Concepts Reset">
            Review key formulas, definitions, and chapter summaries. Mark the top 3 weak areas per subject.
          </Section>
          <Section title="Day 3-4: Math + Science Focus">
            Math: 30-40 mixed problems, check mistakes. Science: diagram practice + short answers.
          </Section>
          <Section title="Day 5-6: English + History/Geo">
            English: grammar drills, writing format practice. History/Geo: map work + timelines.
          </Section>
          <Section title="Day 7-8: Full-Length Practice">
            One timed paper per day. Analyze errors and rewrite solutions for tough questions.
          </Section>
          <Section title="Day 9: Weak Areas Fix">
            Revisit the top weak areas from Day 1-2. Do a small timed quiz for each.
          </Section>
          <Section title="Day 10: Light Review + Confidence Build">
            Quick formula scan, summary notes, and past mistakes. Sleep early.
          </Section>
        </div>
        <div className="grid gap-4 text-white/60 text-sm leading-relaxed">
          <Section title="Who this plan is for">
            Class 10 SSC students who have completed most chapters but need a final execution system to improve scores.
          </Section>
          <Section title="How to use in 7, 10, and 15 days">
            For a 7-day sprint, merge paired days. For a 10-day sprint, follow as written. For a 15-day cycle, add buffer days after each paper test.
          </Section>
        </div>
        <RelatedResources currentPath="/revision-plan" />
      </ContentCard>
    </SiteShell>
  );
};

const MathPlanPage: React.FC = () => {
  const canonical = useCanonical();
  const seo = getSeoForPath('/math-plan');
  const schemaGraph = [
    {
      '@type': 'Article',
      headline: '10th SSC math revision plan and checklist for board readiness',
      author: { '@type': 'Organization', name: '10th SSC Exam Countdown' },
      datePublished: '2026-02-12',
      dateModified: '2026-02-13',
      mainEntityOfPage: canonical,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Math Plan', item: canonical },
      ],
    },
  ] as Record<string, unknown>[];

  return (
    <SiteShell>
      <Seo
        title={seo.title}
        description={seo.description}
        canonical={canonical}
        ogType={seo.ogType}
        keywords={seo.keywords}
        schemaGraph={schemaGraph}
      />
      <ContentCard title="10th SSC math revision plan for scoring consistency">
        <p className="text-white/60 text-sm leading-relaxed">
          This 10th SSC math revision plan is focused on output quality, not just chapter reading. Mathematics in board exams rewards method,
          precision, and speed under a timer. If your goal is to improve marks reliably, divide preparation into formula recall, mixed problem
          solving, and post-test error fixing. Students who do this daily usually reduce silly mistakes and improve confidence in paper sections
          that normally consume extra time.
        </p>
        <p className="text-white/60 text-sm leading-relaxed">
          Use this checklist as a loop for 7-day, 10-day, or 15-day prep cycles. Track difficult chapters separately and review them every third
          day. This works for all-India SSC board style practice because question patterns commonly test concept application, not memorization.
        </p>
        <ul className="list-disc pl-6 text-white/60 text-sm space-y-2">
          <li>Rewrite core formulas by chapter (algebra, geometry, trigonometry).</li>
          <li>Pick 20 mixed problems daily, mark 5 toughest and redo them.</li>
          <li>Practice word problems with unit conversions and clean steps.</li>
          <li>Time one section paper every 2-3 days to build speed.</li>
          <li>Keep a mistake log and re-solve errors without notes.</li>
        </ul>
        <div className="grid gap-4 text-white/60 text-sm leading-relaxed">
          <Section title="Who this plan is for">
            Students who know the basics but lose marks in multi-step problems, calculation slips, or time pressure.
          </Section>
          <Section title="How to use in 7, 10, and 15 days">
            In 7 days: focus on top weak chapters. In 10 days: include two timed papers. In 15 days: add full-paper review and reattempt sessions.
          </Section>
        </div>
        <RelatedResources currentPath="/math-plan" />
      </ContentCard>
    </SiteShell>
  );
};

const SciencePlanPage: React.FC = () => {
  const canonical = useCanonical();
  const seo = getSeoForPath('/science-plan');
  const schemaGraph = [
    {
      '@type': 'Article',
      headline: '10th SSC science revision plan for concept and diagram mastery',
      author: { '@type': 'Organization', name: '10th SSC Exam Countdown' },
      datePublished: '2026-02-12',
      dateModified: '2026-02-13',
      mainEntityOfPage: canonical,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Science Plan', item: canonical },
      ],
    },
  ] as Record<string, unknown>[];

  return (
    <SiteShell>
      <Seo
        title={seo.title}
        description={seo.description}
        canonical={canonical}
        ogType={seo.ogType}
        keywords={seo.keywords}
        schemaGraph={schemaGraph}
      />
      <ContentCard title="10th SSC science revision plan for board performance">
        <p className="text-white/60 text-sm leading-relaxed">
          This 10th SSC science revision plan helps you cover both theory clarity and answer writing quality. Science board marks depend on
          diagrams, definitions, and structured explanations, so revision must include active recall instead of passive reading. Break your
          sessions into concept summaries, diagram practice, and chapter-wise tests. If you are doing ssc board exam ke liye revision in limited
          time, this format keeps preparation measurable and focused.
        </p>
        <p className="text-white/60 text-sm leading-relaxed">
          Keep a short notebook for high-frequency terms and reaction names. Revise this list daily before practice sets. After each chapter test,
          spend ten minutes correcting language and sequencing in long answers. This improves scoring even when your concepts are already decent.
        </p>
        <ul className="list-disc pl-6 text-white/60 text-sm space-y-2">
          <li>Memorize key diagrams and label them without notes.</li>
          <li>Summarize each chapter in 5-7 bullet points.</li>
          <li>Practice short answers and long answers separately.</li>
          <li>Do 10 MCQs per chapter and track accuracy.</li>
          <li>Revise definitions and keywords daily.</li>
        </ul>
        <div className="grid gap-4 text-white/60 text-sm leading-relaxed">
          <Section title="Who this plan is for">
            Class 10 SSC students who need better retention for diagrams, definitions, and chapter-level explanations.
          </Section>
          <Section title="How to use in 7, 10, and 15 days">
            In 7 days, cover priority chapters only. In 10 days, include 3 timed science sets. In 15 days, add a full-paper simulation cycle.
          </Section>
        </div>
        <RelatedResources currentPath="/science-plan" />
      </ContentCard>
    </SiteShell>
  );
};

const EnglishPlanPage: React.FC = () => {
  const canonical = useCanonical();
  const seo = getSeoForPath('/english-plan');
  const schemaGraph = [
    {
      '@type': 'Article',
      headline: '10th SSC English revision plan for grammar and writing formats',
      author: { '@type': 'Organization', name: '10th SSC Exam Countdown' },
      datePublished: '2026-02-12',
      dateModified: '2026-02-13',
      mainEntityOfPage: canonical,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'English Plan', item: canonical },
      ],
    },
  ] as Record<string, unknown>[];

  return (
    <SiteShell>
      <Seo
        title={seo.title}
        description={seo.description}
        canonical={canonical}
        ogType={seo.ogType}
        keywords={seo.keywords}
        schemaGraph={schemaGraph}
      />
      <ContentCard title="10th SSC English revision plan for better writing marks">
        <p className="text-white/60 text-sm leading-relaxed">
          This 10th SSC English revision plan is designed for students who need better structure in grammar, comprehension, and writing formats.
          English scores improve when you practice answer form, vocabulary precision, and sentence clarity on a schedule. Instead of reading
          chapters passively, use short drills and timed writing tasks that match board answer expectations.
        </p>
        <p className="text-white/60 text-sm leading-relaxed">
          For ssc board ki tayari, focus on repetition with feedback. Practice one writing format daily, check grammar errors, and maintain a
          personal correction list. Over a 10-day cycle, this method improves speed and response quality, especially for medium-length answers.
        </p>
        <ul className="list-disc pl-6 text-white/60 text-sm space-y-2">
          <li>Revise grammar rules with 10 daily practice questions.</li>
          <li>Practice writing formats: letters, reports, and essays.</li>
          <li>Read 1 passage per day and answer comprehension questions.</li>
          <li>Revise vocabulary with synonyms and commonly confused words.</li>
          <li>Check spelling and punctuation on every written answer.</li>
        </ul>
        <div className="grid gap-4 text-white/60 text-sm leading-relaxed">
          <Section title="Who this plan is for">
            Students who lose marks in grammar accuracy, answer format, or time management in descriptive writing.
          </Section>
          <Section title="How to use in 7, 10, and 15 days">
            In 7 days, prioritize grammar and writing templates. In 10 days, add timed comprehension sets. In 15 days, add two full writing mock cycles.
          </Section>
        </div>
        <RelatedResources currentPath="/english-plan" />
      </ContentCard>
    </SiteShell>
  );
};
const FaqPage: React.FC = () => {
  const canonical = useCanonical();
  const seo = getSeoForPath('/faq');
  const faqItems = [
    {
      question: 'What is a 10th SSC exam countdown and how does it help?',
      answer: 'It is a live timer plus revision workflow that helps you convert remaining days into a practical preparation plan with daily checkpoints.',
    },
    {
      question: 'How should I use this 10th SSC revision plan daily?',
      answer: 'Use a three-part cycle: concept revision, timed questions, and error review. Continue the cycle even if one day is missed.',
    },
    {
      question: 'Is this useful only for one board or for all-India SSC students?',
      answer: 'The structure is useful for all-India SSC style preparation. You can adapt chapter lists to your board syllabus.',
    },
    {
      question: 'What subjects are covered in the preparation pages?',
      answer: 'Dedicated revision checklists are available for Math, Science, and English, along with a full revision strategy page.',
    },
    {
      question: 'How often should I practice SSC board full-length papers?',
      answer: 'Practice one timed paper every 2 to 3 days during final prep and review mistakes immediately after each paper.',
    },
    {
      question: 'SSC board ki tayari ke liye 7-day plan better hai ya 10-day?',
      answer: 'Choose 7-day for urgent recovery, 10-day for balanced coverage, and 15-day when you need extra mock paper analysis.',
    },
    {
      question: 'How can I improve marks fast in 10th SSC math?',
      answer: 'Revise formulas daily, solve mixed timed sets, and maintain an error notebook for reattempts.',
    },
    {
      question: 'How should I revise science diagrams for board exams?',
      answer: 'Practice drawing and labeling without notes, then check keyword accuracy for each diagram answer.',
    },
    {
      question: 'How do I score better in 10th SSC English writing sections?',
      answer: 'Use standard answer formats, grammar checks, and timed writing practice for letters, reports, and essays.',
    },
    {
      question: 'When should I start paper solving before board exams?',
      answer: 'Start at least two to three weeks before the exam window and increase frequency in the final 10 days.',
    },
    {
      question: 'How many hours are enough for daily SSC board preparation?',
      answer: 'Consistent 2.5 to 4 hours of focused work is often better than irregular long study sessions.',
    },
    {
      question: 'What should I do if I miss one study day?',
      answer: 'Use a half-day catch-up method and continue. Do not reset the entire plan.',
    },
    {
      question: 'Does this site collect personal data?',
      answer: 'Telemetry is limited to basic device and session details for analytics and is described in the Privacy page.',
    },
  ];

  const schemaGraph = [
    {
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'FAQ', item: canonical },
      ],
    },
  ] as Record<string, unknown>[];

  return (
    <SiteShell>
      <Seo
        title={seo.title}
        description={seo.description}
        canonical={canonical}
        keywords={seo.keywords}
        schemaGraph={schemaGraph}
      />
      <ContentCard title="10th SSC board exam FAQ: countdown, planning, and scoring">
        <p className="text-white/60 text-sm leading-relaxed">
          This FAQ section answers practical questions students ask during Class 10 SSC preparation. Use these answers to build a cleaner routine
          for revision, paper practice, and chapter prioritization. If you are searching for 10th SSC board exam FAQ terms, this page is built to
          cover common doubts in both English and natural Hinglish phrasing.
        </p>
        <div className="space-y-5">
          {faqItems.map((item) => (
            <div key={item.question}>
              <h3 className="text-white/90 text-sm font-semibold">{item.question}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
        <RelatedResources currentPath="/faq" />
      </ContentCard>
    </SiteShell>
  );
};

const PrivacyPage: React.FC = () => {
  const canonical = useCanonical();
  const seo = getSeoForPath('/privacy');
  return (
    <SiteShell>
      <Seo
        title={seo.title}
        description={seo.description}
        canonical={canonical}
        keywords={seo.keywords}
      />
      <ContentCard title="Privacy & Telemetry">
        <p className="text-white/60 text-sm leading-relaxed">
          This site uses lightweight telemetry to keep the dashboard reliable. The logs are sent to a private Telegram channel and include event names, page path, browser/device details, and the approximate IP address captured server-side. This helps diagnose errors and understand usage.
        </p>
        <p className="text-white/60 text-sm leading-relaxed">
          We do not collect GPS location or any precise location signals without explicit user permission. We do not sell data, and telemetry is used only for operational analytics and monitoring.
        </p>
        <RelatedResources currentPath="/privacy" />
      </ContentCard>
    </SiteShell>
  );
};

const ContentCard: React.FC<{ title: string; children: React.ReactNode; headingLevel?: 'h1' | 'h2' }> = ({ title, children, headingLevel = 'h1' }) => {
  const HeadingTag = headingLevel;
  return (
    <div className="acrylic relative z-10 rounded-3xl border border-white/10 shadow-2xl p-8 md:p-10 space-y-4">
      <HeadingTag className="text-3xl md:text-4xl font-light text-white tracking-tight">{title}</HeadingTag>
      {children}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-white/90 text-sm font-semibold">{title}</h3>
    <p className="text-white/60 text-sm leading-relaxed">{children}</p>
  </div>
);

const AdminPage: React.FC = () => {
  const canonical = useCanonical();
  const [user, setUser] = useState<UserRecord>(getCurrentUser());
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminFormData, setAdminFormData] = useState<UserRecord>(user);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>(user.id);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('isAdmin') === 'true';
    if (stored) setIsAdminAuth(true);
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminAuth(true);
      sessionStorage.setItem('isAdmin', 'true');
      void logEvent('admin_login_success', user.name);
      const data = getUsersData();
      setAllUsers(data);
      const current = data.find(u => u.id === selectedUserId) || data[0];
      setAdminFormData(current);
    } else {
      sessionStorage.removeItem('isAdmin');
      setIsAdminAuth(false);
      void logEvent('admin_login_fail', user.name);
      alert('Unauthorized Access Attempt.');
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('isAdmin');
    setIsAdminAuth(false);
    setAdminPassword('');
  };

  const handleAdminCommit = () => {
    const data = getUsersData();
    const index = data.findIndex(u => u.id === adminFormData.id);
    if (index !== -1) {
      data[index] = { ...adminFormData, lastActive: new Date().toISOString() };
      saveUsersData(data);
      setAllUsers(data);
      if (adminFormData.id === user.id) setUser(data[index]);
      void sendTelemetry('admin_commit', { userId: user.id, name: user.name });
      alert('Forensic Database Updated.');
    }
  };

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.platform && u.platform.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [allUsers, searchTerm]);

  const selectUser = (u: UserRecord) => {
    setSelectedUserId(u.id);
    setAdminFormData(u);
  };

  return (
    <>
      <Seo
        title="Admin | 10th SSC Exam Countdown"
        description="Restricted admin interface."
        canonical={canonical}
        robots="noindex, nofollow, noarchive"
      />
      <div className="min-h-screen overflow-x-hidden overflow-y-auto py-10 bg-[#05080a] text-white flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 z-0 opacity-5 grayscale pointer-events-none">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover">
          <source src="https://assets.mixkit.co/videos/preview/mixkit-the-earth-rotating-in-space-20093-large.mp4" type="video/mp4" />
        </video>
      </div>

      {!isAdminAuth ? (
        <div className="acrylic relative z-10 w-full max-w-sm p-8 rounded-2xl border border-red-900/30 animate-in zoom-in duration-300">
          <div className="text-center mb-8">
            <span className="material-icons text-red-600 text-4xl mb-4">terminal</span>
            <h2 className="text-lg font-bold tracking-[0.3em] uppercase text-red-500">Admin Clearance</h2>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              placeholder="ACCESS KEY"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-center tracking-[0.5em] focus:outline-none focus:border-red-500/50 text-white"
            />
            <button className="w-full py-3 bg-red-600/10 border border-red-600/30 hover:bg-red-600/20 text-red-500 text-[10px] font-bold uppercase tracking-widest transition-all">
              Validate Key
            </button>
          </form>
        </div>
      ) : (
        <div className="acrylic relative z-10 w-full max-w-6xl rounded-3xl border border-white/10 flex flex-col animate-in slide-in-from-bottom-4">
          <header className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <span className="material-icons text-primary">security</span>
              </div>
              <h1 className="text-xl font-light tracking-widest uppercase">Forensic Command Center</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleAdminLogout}
                className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                Logout
              </button>
              <button
                onClick={() => navigate('/')}
                className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                Exit Terminal
              </button>
            </div>
          </header>

          <div className="flex-grow flex">
            <aside className="w-80 border-r border-white/5 flex flex-col bg-black/20">
              <div className="p-4 border-b border-white/5">
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">search</span>
                  <input
                    type="text"
                    placeholder="Search Name or IP..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-primary/50 text-white"
                  />
                </div>
              </div>
              <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-[10px] text-white/20 uppercase tracking-widest">No Signals Found</div>
                ) : (
                  filteredUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => selectUser(u)}
                      className={`w-full text-left p-4 rounded-xl transition-all border flex flex-col space-y-1 ${selectedUserId === u.id ? 'bg-primary/10 border-primary/30' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                    >
                      <span className="text-xs font-bold text-white/80">{u.name}</span>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-white/30">{u.platform || 'Unknown'}</span>
                        <span className="text-[8px] uppercase tracking-tighter text-primary/60">{u.os || 'SYS'}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <main className="flex-grow p-10 space-y-10 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                  <h3 className="text-[10px] uppercase tracking-[0.3em] text-primary font-black">Identity Modulation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AdminInput label="Profile Name" value={adminFormData.name} onChange={v => setAdminFormData({ ...adminFormData, name: v })} />
                    <AdminInput label="Current Mission" value={adminFormData.missionName} onChange={v => setAdminFormData({ ...adminFormData, missionName: v })} />
                  </div>
                  <AdminInput label="Live Status Broadcast" value={adminFormData.status} onChange={v => setAdminFormData({ ...adminFormData, status: v })} isTextArea />
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <label className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Preparation Index</label>
                      <span className="text-primary font-mono">{adminFormData.progress}%</span>
                    </div>
                    <input
                      type="range" value={adminFormData.progress}
                      onChange={e => setAdminFormData({ ...adminFormData, progress: parseInt(e.target.value) })}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none accent-primary"
                    />
                  </div>
                  <button
                    onClick={handleAdminCommit}
                    className="w-full py-4 bg-primary rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 transition-all"
                  >
                    Update Global State
                  </button>
                </div>

                <div className="bg-black/40 rounded-2xl p-6 border border-white/5 space-y-6">
                  <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black flex items-center">
                    <span className="material-icons text-[14px] mr-2">analytics</span>
                    Session Forensics
                  </h3>
                  <div className="space-y-4">
                    <MetadataItem icon="laptop" label="Hardware" value={adminFormData.device || 'Unknown'} />
                    <MetadataItem icon="memory" label="Platform" value={adminFormData.platform || 'Unknown'} />
                    <MetadataItem icon="terminal" label="OS Environment" value={adminFormData.os || 'Unknown'} />
                    <MetadataItem icon="web" label="Browser Engine" value={adminFormData.browser || 'Unknown'} />
                    <MetadataItem icon="history" label="Last Ping" value={adminFormData.lastActive ? new Date(adminFormData.lastActive).toLocaleTimeString() : 'N/A'} />
                  </div>
                  <div className="pt-6 border-t border-white/5">
                    <span className="text-[8px] uppercase tracking-widest text-white/20 font-bold block mb-2">User Agent Hash</span>
                    <div className="bg-black/50 rounded p-3 font-mono text-[9px] text-white/30 break-all leading-relaxed">
                      {navigator.userAgent}
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

const TimeUnit: React.FC<{ value: number; label: string; isPrimary?: boolean }> = ({ value, label, isPrimary }) => (
  <div className="flex flex-col items-center">
    <span className={`text-6xl md:text-8xl font-thin leading-none tracking-tighter tabular-nums ${isPrimary ? 'text-primary' : 'text-white'}`}>
      {value.toString().padStart(2, '0')}
    </span>
    <span className="text-[9px] text-white/20 uppercase tracking-[0.4em] mt-4 font-bold">{label}</span>
  </div>
);

const AdminInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; isTextArea?: boolean }> = ({ label, value, onChange, isTextArea }) => (
  <div className="space-y-2">
    <label className="text-[9px] uppercase tracking-widest text-white/30 font-bold">{label}</label>
    {isTextArea ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-primary min-h-[100px] text-white" />
    ) : (
      <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-primary text-white" />
    )}
  </div>
);

const MetadataItem: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center space-x-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
    <span className="material-icons text-white/30 text-base">{icon}</span>
    <div className="flex flex-col">
      <span className="text-[8px] uppercase tracking-widest text-white/20 font-bold">{label}</span>
      <span className="text-white/70 font-medium truncate max-w-[150px]">{value}</span>
    </div>
  </div>
);

const NameModal: React.FC<{
  value: string;
  progress: number;
  error: string;
  progressError: string;
  onChange: (value: string) => void;
  onProgressChange: (value: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}> = ({ value, progress, error, progressError, onChange, onProgressChange, onSubmit }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div className="acrylic w-full max-w-md p-8 rounded-3xl border border-white/20 animate-in zoom-in-95">
      <h2 className="text-lg font-light mb-2 tracking-tight text-white/90">Enter Your Name</h2>
      <p className="text-[11px] text-white/50 mb-6">Name and progress are required to continue.</p>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Name</label>
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
            autoFocus
          />
          {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Progress</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="100"
                value={Number.isFinite(progress) ? progress : 0}
                onChange={e => onProgressChange(Number(e.target.value))}
                className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-white/40">%</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Number.isFinite(progress) ? progress : 0}
            onChange={e => onProgressChange(parseInt(e.target.value, 10))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          {progressError && <p className="text-[10px] text-red-400 mt-1">{progressError}</p>}
        </div>
        <button className="w-full py-4 bg-primary rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/30">
          Submit
        </button>
      </form>
    </div>
  </div>
);

export default App;

