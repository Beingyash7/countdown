import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { TimeRemaining } from './types';
import { generateMissionUpdate } from './services/geminiService';
import { getUsersData, updateCurrentUser, UserRecord, getCurrentUser, saveUsersData } from './usersdata';
import { logEvent, sendTelemetry } from './services/telemetry';

const ADMIN_PATH = (import.meta.env.VITE_ADMIN_PATH || '/website/admin-yash') as string;
const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD || 'yash2701') as string;
const SITE_URL = ((import.meta.env.VITE_SITE_URL || window.location.origin) as string).replace(/\/$/, '');

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

const SeoHead: React.FC<{
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
  schema?: Record<string, unknown> | Record<string, unknown>[];
}> = ({ title, description, canonical, ogType = 'website', schema }) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />

    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:type" content={ogType} />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />

    {schema ? (
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    ) : null}
  </Helmet>
);

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

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SSC 2026 Countdown',
    url: canonical,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <SiteShell>
      <SeoHead
        title="Maharashtra SSC 10th Countdown 2026 | SSC 2026 Countdown"
        description="Live SSC 2026 countdown with a focused Maharashtra SSC 10th dashboard, revision plan links, and progress tracking for board exam prep."
        canonical={canonical}
        schema={websiteSchema}
      />

      <div className="absolute top-6 md:top-10 left-6 md:left-10 z-20 flex items-center space-x-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
          <span className="material-icons text-white text-sm">rocket_launch</span>
        </div>
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
            <h1 className="text-5xl md:text-7xl font-extralight text-white tracking-tighter mb-4">{user.missionName}</h1>
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
                Revision Plan →
              </Link>
            </div>
          </div>
        </div>
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
  return (
    <SiteShell>
      <SeoHead
        title="About SSC 2026 Countdown | Maharashtra SSC 10th Focus"
        description="Learn how this Maharashtra SSC 10th countdown dashboard helps with SSC 2026 planning, daily focus, and revision structure."
        canonical={canonical}
      />
      <ContentCard title="About The SSC 2026 Countdown">
        <p className="text-white/60 text-sm leading-relaxed">
          This dashboard is built for Maharashtra SSC 10th students who want a clean, focused countdown to SSC 2026 with practical revision support. It combines a live timer, personal progress tracking, and structured revision plans so you can stay consistent without clutter.
        </p>
        <p className="text-white/60 text-sm leading-relaxed">
          Use the plans to target your weak areas, track daily output, and keep your momentum high as the exam window approaches.
        </p>
      </ContentCard>
    </SiteShell>
  );
};

const RevisionPlanPage: React.FC = () => {
  const canonical = useCanonical();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'SSC 2026 Revision Plan - 10 Day Sprint',
    author: { '@type': 'Organization', name: 'SSC Countdown' },
    datePublished: '2026-02-12',
    dateModified: '2026-02-12',
    mainEntityOfPage: canonical,
  };

  return (
    <SiteShell>
      <SeoHead
        title="SSC 2026 Revision Plan | 10-Day Maharashtra SSC 10th Sprint"
        description="A focused 10-day SSC revision plan for Maharashtra SSC 10th students, plus links to math, science, and English checklists."
        canonical={canonical}
        ogType="article"
        schema={schema}
      />
      <ContentCard title="10-Day SSC 2026 Revision Plan">
        <p className="text-white/60 text-sm leading-relaxed">
          This 10-day plan is designed as a realistic sprint before exams. Keep each day short and repeatable: concept recap, targeted practice, and quick error review. If you miss a day, do a half-day catch-up and continue.
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
        <PlanCrossLinks />
      </ContentCard>
    </SiteShell>
  );
};

const MathPlanPage: React.FC = () => {
  const canonical = useCanonical();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'SSC 2026 Math Revision Checklist',
    author: { '@type': 'Organization', name: 'SSC Countdown' },
    datePublished: '2026-02-12',
    dateModified: '2026-02-12',
    mainEntityOfPage: canonical,
  };

  return (
    <SiteShell>
      <SeoHead
        title="SSC 2026 Math Plan | Maharashtra SSC 10th Math Checklist"
        description="A practical SSC 2026 math revision checklist: formulas, problem sets, and timed practice for Maharashtra SSC 10th."
        canonical={canonical}
        ogType="article"
        schema={schema}
      />
      <ContentCard title="Math Revision Checklist">
        <ul className="list-disc pl-6 text-white/60 text-sm space-y-2">
          <li>Rewrite core formulas by chapter (algebra, geometry, trigonometry).</li>
          <li>Pick 20 mixed problems daily, mark 5 toughest and redo them.</li>
          <li>Practice word problems with unit conversions and clean steps.</li>
          <li>Time one section paper every 2-3 days to build speed.</li>
          <li>Keep a mistake log and re-solve errors without notes.</li>
        </ul>
        <PlanCrossLinks />
      </ContentCard>
    </SiteShell>
  );
};

const SciencePlanPage: React.FC = () => {
  const canonical = useCanonical();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'SSC 2026 Science Revision Checklist',
    author: { '@type': 'Organization', name: 'SSC Countdown' },
    datePublished: '2026-02-12',
    dateModified: '2026-02-12',
    mainEntityOfPage: canonical,
  };

  return (
    <SiteShell>
      <SeoHead
        title="SSC 2026 Science Plan | Maharashtra SSC 10th Science Checklist"
        description="Practical SSC 2026 science checklist with diagrams, short answers, and concept tests for Maharashtra SSC 10th."
        canonical={canonical}
        ogType="article"
        schema={schema}
      />
      <ContentCard title="Science Revision Checklist">
        <ul className="list-disc pl-6 text-white/60 text-sm space-y-2">
          <li>Memorize key diagrams and label them without notes.</li>
          <li>Summarize each chapter in 5-7 bullet points.</li>
          <li>Practice short answers and long answers separately.</li>
          <li>Do 10 MCQs per chapter and track accuracy.</li>
          <li>Revise definitions and keywords daily.</li>
        </ul>
        <PlanCrossLinks />
      </ContentCard>
    </SiteShell>
  );
};

const EnglishPlanPage: React.FC = () => {
  const canonical = useCanonical();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'SSC 2026 English Revision Checklist',
    author: { '@type': 'Organization', name: 'SSC Countdown' },
    datePublished: '2026-02-12',
    dateModified: '2026-02-12',
    mainEntityOfPage: canonical,
  };

  return (
    <SiteShell>
      <SeoHead
        title="SSC 2026 English Plan | Maharashtra SSC 10th English Checklist"
        description="SSC 2026 English revision checklist for Maharashtra SSC 10th: grammar drills, writing formats, and comprehension practice."
        canonical={canonical}
        ogType="article"
        schema={schema}
      />
      <ContentCard title="English Revision Checklist">
        <ul className="list-disc pl-6 text-white/60 text-sm space-y-2">
          <li>Revise grammar rules with 10 daily practice questions.</li>
          <li>Practice writing formats: letters, reports, and essays.</li>
          <li>Read 1 passage per day and answer comprehension questions.</li>
          <li>Revise vocabulary with synonyms and commonly confused words.</li>
          <li>Check spelling and punctuation on every written answer.</li>
        </ul>
        <PlanCrossLinks />
      </ContentCard>
    </SiteShell>
  );
};
const FaqPage: React.FC = () => {
  const canonical = useCanonical();
  const faqItems = [
    {
      question: 'What is the SSC 2026 countdown for Maharashtra SSC 10th?',
      answer: 'It is a live timer that tracks the remaining time until the SSC 2026 exam window, designed to keep revision planning focused.',
    },
    {
      question: 'How should I use the 10-day revision plan?',
      answer: 'Treat it as a sprint: review concepts, practice targeted questions, and fix errors daily. If you miss a day, do a half-day catch-up.',
    },
    {
      question: 'Is the dashboard only for Maharashtra SSC 10th students?',
      answer: 'The content is optimized for Maharashtra SSC 10th, but the revision structure can help any SSC-style exam prep.',
    },
    {
      question: 'What subjects are covered in the revision plans?',
      answer: 'Dedicated checklists are available for Math, Science, and English, plus a 10-day full revision plan.',
    },
    {
      question: 'How often should I practice full-length papers?',
      answer: 'Aim for one timed paper every 2-3 days during the final 10-day sprint and review mistakes immediately.',
    },
    {
      question: 'Does this site collect personal data?',
      answer: 'The telemetry is limited to basic device and session details for analytics and is explained in the Privacy page. No GPS location is collected without permission.',
    },
  ];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <SiteShell>
      <SeoHead
        title="SSC 2026 FAQ | Maharashtra SSC 10th Countdown"
        description="Frequently asked questions about the SSC 2026 countdown, revision plan, and exam preparation for Maharashtra SSC 10th."
        canonical={canonical}
        schema={schema}
      />
      <ContentCard title="FAQ">
        <div className="space-y-5">
          {faqItems.map((item) => (
            <div key={item.question}>
              <h3 className="text-white/90 text-sm font-semibold">{item.question}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
      </ContentCard>
    </SiteShell>
  );
};

const PrivacyPage: React.FC = () => {
  const canonical = useCanonical();
  return (
    <SiteShell>
      <SeoHead
        title="Privacy Policy | SSC 2026 Countdown"
        description="Privacy details for SSC 2026 countdown telemetry, including what is logged to Telegram and what is not collected."
        canonical={canonical}
      />
      <ContentCard title="Privacy & Telemetry">
        <p className="text-white/60 text-sm leading-relaxed">
          This site uses lightweight telemetry to keep the dashboard reliable. The logs are sent to a private Telegram channel and include event names, page path, browser/device details, and the approximate IP address captured server-side. This helps diagnose errors and understand usage.
        </p>
        <p className="text-white/60 text-sm leading-relaxed">
          We do not collect GPS location or any precise location signals without explicit user permission. We do not sell data, and telemetry is used only for operational analytics and monitoring.
        </p>
      </ContentCard>
    </SiteShell>
  );
};

const PlanCrossLinks: React.FC = () => (
  <div className="mt-6 text-[12px] text-white/50 flex flex-wrap gap-4">
    <span className="uppercase tracking-widest text-white/30">Also see:</span>
    <Link className="hover:text-white" to="/math-plan">Math Plan</Link>
    <Link className="hover:text-white" to="/science-plan">Science Plan</Link>
    <Link className="hover:text-white" to="/english-plan">English Plan</Link>
  </div>
);

const ContentCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="acrylic relative z-10 rounded-3xl border border-white/10 shadow-2xl p-8 md:p-10 space-y-4">
    <h1 className="text-3xl md:text-4xl font-light text-white tracking-tight">{title}</h1>
    {children}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-white/90 text-sm font-semibold">{title}</h3>
    <p className="text-white/60 text-sm leading-relaxed">{children}</p>
  </div>
);

const AdminPage: React.FC = () => {
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
                        <span className="text-[9px] font-mono text-white/30">{u.ip || '0.0.0.0'}</span>
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
