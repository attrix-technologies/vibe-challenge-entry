import React, { useState, useEffect, useRef, useMemo } from 'react';

// ── Helpers ────────────────────────────────────────────────────────────
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const fmtNum = (n, lang, dec = 0) => {
  if (n == null) return '—';
  return new Intl.NumberFormat(lang, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  }).format(n);
};

// ── CountUp animation ──────────────────────────────────────────────────
const CountUp = ({ value, decimals = 0, duration = 1500, language }) => {
  const [display, setDisplay] = useState(0);
  const raf = useRef();

  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(value * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <>{fmtNum(display, language, decimals)}</>;
};

// ── Gradients ──────────────────────────────────────────────────────────
const GRADIENTS = [
  'linear-gradient(150deg, #0d1117 0%, #1a1a2e 40%, #16213e 100%)',
  'linear-gradient(150deg, #4a00e0 0%, #8e2de2 100%)',
  'linear-gradient(150deg, #7b2d0b 0%, #b8460e 50%, #d4600a 100%)',
  'linear-gradient(150deg, #0b3d2e 0%, #197d5c 100%)',
  'linear-gradient(150deg, #1a1a2e 0%, #e94560 100%)',
];

// ── Comparison pools ───────────────────────────────────────────────────
const DISTANCE_CMP = [
  { ref: 384400, en: n => `That's ${n}% of the way to the Moon`, fr: n => `C'est ${n}\u00a0% du chemin vers la Lune`, pct: true, emoji: '🌙' },
  { ref: 3944, en: n => `Like driving New York to LA ${n} times`, fr: n => `Comme ${n} trajets New York — Los Angeles`, emoji: '🗽' },
  { ref: 40075, en: n => `${n} laps around the Earth`, fr: n => `${n} tours de la Terre`, emoji: '🌍' },
  { ref: 20.832, en: n => `${n} laps of the N\u00fcrburgring`, fr: n => `${n} tours du N\u00fcrburgring`, emoji: '🏁' },
  { ref: 42.195, en: n => `${n} back-to-back marathons`, fr: n => `${n} marathons bout \u00e0 bout`, emoji: '🏃' },
  { ref: 7821, en: n => `Driving the Trans-Canada Highway ${n} times`, fr: n => `${n} travers\u00e9es du Canada`, emoji: '🍁' },
  { ref: 1185, en: n => `Driving the length of Italy ${n} times`, fr: n => `La longueur de l'Italie ${n} fois`, emoji: '🇮🇹' },
];

const TIME_CMP = [
  { ref: 11.4, en: n => `${n} Lord of the Rings extended marathons`, fr: n => `${n} marathons Seigneur des Anneaux`, emoji: '🧙' },
  { ref: 40, en: n => `${n} full work weeks`, fr: n => `${n} semaines de travail`, emoji: '☕' },
  { ref: 22.5, en: n => `${n} flights from London to Sydney`, fr: n => `${n} vols Londres — Sydney`, emoji: '✈️' },
  { ref: 0.79, en: n => `${n} back-to-back plays of Abbey Road`, fr: n => `${n} \u00e9coutes d'Abbey Road`, emoji: '🎵' },
  { ref: 2, en: n => `${n} feature films`, fr: n => `${n} longs m\u00e9trages`, emoji: '🎬' },
  { ref: 1.5, en: n => `${n} soccer matches`, fr: n => `${n} matchs de soccer`, emoji: '⚽' },
];

const IDLE_QUIPS = [
  { en: 'of engines humming\u2026 going absolutely nowhere', fr: 'de moteurs au ralenti\u2026 sans aller nulle part', emoji: '🫠' },
  { en: 'burning fuel for the privilege of staying put', fr: 'à br\u00fbler du carburant pour le privil\u00e8ge de rester sur place', emoji: '🫣' },
  { en: '\u2014 let that idle for a moment', fr: '\u2014 laissez \u00e7a tourner au ralenti un instant', emoji: '☝️' },
  { en: 'that could have been a very long nap', fr: 'qui auraient pu \u00eatre une tr\u00e8s longue sieste', emoji: '😴' },
];

const FUEL_CMP = [
  { ref: 300, en: n => `That's ${n} bathtubs`, fr: n => `C'est ${n} baignoires`, emoji: '🛁' },
  { ref: 1500, en: n => `Enough to fill ${n} hot tubs`, fr: n => `De quoi remplir ${n} spas`, emoji: '🫧' },
  { ref: 80, en: n => `${n} full tanks of a pickup truck`, fr: n => `${n} pleins de pickup`, emoji: '🛻' },
];

const CO2_CMP = [
  { ref: 450, en: n => `The weight of ${n} polar bears`, fr: n => `Le poids de ${n} ours polaires`, emoji: '🐻‍❄️' },
  { ref: 480, en: n => `${n} grand pianos`, fr: n => `${n} pianos \u00e0 queue`, emoji: '🎹' },
  { ref: 5000, en: n => `${n} elephants`, fr: n => `${n} \u00e9l\u00e9phants`, emoji: '🐘' },
  { ref: 2700, en: n => `${n} baby blue whales`, fr: n => `${n} b\u00e9b\u00e9s baleines bleues`, emoji: '🐳' },
];

// Pick a comparison that gives a "nice" ratio (0.5–500)
const pickCmp = (value, pool) => {
  const nice = pool.filter(c => {
    const ratio = c.pct ? (value / c.ref * 100) : (value / c.ref);
    return ratio >= 0.3 && ratio <= 999;
  });
  return pick(nice.length > 0 ? nice : pool);
};

const formatRatio = (value, cmp, lang) => {
  const ratio = cmp.pct ? (value / cmp.ref * 100) : (value / cmp.ref);
  if (ratio < 0.1) return fmtNum(ratio, lang, 2);
  if (ratio < 10) return fmtNum(ratio, lang, 1);
  return fmtNum(ratio, lang, 0);
};

// ── Date range ─────────────────────────────────────────────────────────
const getLastWeekDates = () => {
  const now = new Date();
  const day = now.getDay();
  const sun = new Date(now);
  sun.setDate(now.getDate() - day - 7);
  sun.setHours(0, 0, 0, 0);
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  return { from: sun, to: sat };
};

const formatDateRange = (lang) => {
  const { from, to } = getLastWeekDates();
  const opts = { month: 'short', day: 'numeric' };
  const locale = lang === 'fr' ? 'fr-CA' : 'en-US';
  return `${from.toLocaleDateString(locale, opts)} \u2013 ${to.toLocaleDateString(locale, opts)}`;
};

// ── Main component ─────────────────────────────────────────────────────
const WrappedOverlay = ({ stats, language, onClose }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [visible, setVisible] = useState(false);
  const fr = language === 'fr';
  const txt = (en, frTxt) => fr ? frTxt : en;

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') closeFn(); else advance(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Randomize comparisons once on mount
  const cmps = useMemo(() => {
    const p = stats.productivity || {};
    const s = stats.sustainability || {};
    const totalFuel = (s.dieselLiters || 0) + (s.gasolineLiters || 0);
    const totalCo2 = (s.dieselCo2Kg || 0) + (s.gasolineCo2Kg || 0);
    return {
      distance: pickCmp(p.totalDistance || 1, DISTANCE_CMP),
      time: pickCmp(p.totalDrivingHours || 1, TIME_CMP),
      idling: pick(IDLE_QUIPS),
      fuel: totalFuel > 0 ? pickCmp(totalFuel, FUEL_CMP) : null,
      co2: totalCo2 > 0 ? pickCmp(totalCo2, CO2_CMP) : null,
    };
  }, []);

  // Build slide list from available data
  const slides = useMemo(() => {
    const s = ['intro'];
    if (stats.productivity?.totalDistance > 0) s.push('distance');
    if (stats.productivity?.totalDrivingHours > 0) s.push('time');
    const totalFuel = (stats.sustainability?.dieselLiters || 0) + (stats.sustainability?.gasolineLiters || 0);
    if (totalFuel > 0) s.push('fuel');
    s.push('outro');
    return s;
  }, [stats]);

  const closeFn = () => {
    setVisible(false);
    setTimeout(onClose, 400);
  };

  const advance = () => {
    if (transitioning) return;
    if (slideIndex >= slides.length - 1) {
      closeFn();
      return;
    }
    setTransitioning(true);
    setTimeout(() => {
      setSlideIndex(i => i + 1);
      setTransitioning(false);
    }, 350);
  };

  const handleClose = (e) => {
    e.stopPropagation();
    closeFn();
  };

  const slide = slides[slideIndex];
  const gradient = GRADIENTS[Math.min(slideIndex, GRADIENTS.length - 1)];
  const p = stats.productivity || {};
  const sus = stats.sustainability || {};
  const safety = stats.safety || {};
  const totalFuel = (sus.dieselLiters || 0) + (sus.gasolineLiters || 0);
  const totalCo2 = (sus.dieselCo2Kg || 0) + (sus.gasolineCo2Kg || 0);

  return (
    <div
      className={`wrapped-overlay ${visible ? 'wrapped-visible' : ''}`}
      style={{ background: gradient }}
      onClick={advance}
    >
      <button className="wrapped-close" onClick={handleClose}>{'\u00d7'}</button>

      <div className="wrapped-progress">
        {slides.map((_, i) => (
          <div key={i} className={`wrapped-seg ${i < slideIndex ? 'done' : ''} ${i === slideIndex ? 'active' : ''}`}>
            <div className="wrapped-seg-fill" />
          </div>
        ))}
      </div>

      <div key={slideIndex} className={`wrapped-slide ${transitioning ? 'wrapped-slide-exit' : 'wrapped-slide-enter'}`}>

        {slide === 'intro' && (
          <>
            <div className="wrapped-emoji-hero">🎁</div>
            <div className="wrapped-overtitle">{txt("YOUR FLEET'S", 'LE BILAN DE VOTRE FLOTTE')}</div>
            <div className="wrapped-title">Last Week</div>
            <div className="wrapped-title wrapped-title-accent">Wrapped</div>
            <div className="wrapped-date">{formatDateRange(language)}</div>
            <div className="wrapped-intro-hint">{txt('Tap anywhere to begin', 'Appuyez pour commencer')} {'\u2192'}</div>
          </>
        )}

        {slide === 'distance' && (
          <>
            <div className="wrapped-label">{txt('YOUR FLEET COVERED', 'VOTRE FLOTTE A PARCOURU')}</div>
            <div className="wrapped-big-number">
              <CountUp value={p.totalDistance} language={language} />
              <span className="wrapped-unit"> km</span>
            </div>
            <div className="wrapped-comparison">
              {cmps.distance[fr ? 'fr' : 'en'](formatRatio(p.totalDistance, cmps.distance, language))}
              <span className="wrapped-cmp-emoji"> {cmps.distance.emoji}</span>
            </div>
            {p.vehicleCount > 0 && (
              <div className="wrapped-footnote">
                {txt(`across ${fmtNum(p.vehicleCount, language)} vehicles`, `r\u00e9partis sur ${fmtNum(p.vehicleCount, language)} v\u00e9hicules`)}
              </div>
            )}
          </>
        )}

        {slide === 'time' && (
          <>
            <div className="wrapped-label">{txt('TIME ON THE ROAD', 'TEMPS SUR LA ROUTE')}</div>
            <div className="wrapped-big-number">
              <CountUp value={p.totalDrivingHours} language={language} />
              <span className="wrapped-unit"> {txt('hours driving', 'h de conduite')}</span>
            </div>
            <div className="wrapped-comparison">
              {cmps.time[fr ? 'fr' : 'en'](formatRatio(p.totalDrivingHours, cmps.time, language))}
              <span className="wrapped-cmp-emoji"> {cmps.time.emoji}</span>
            </div>
            {p.totalIdlingHours > 0 && (
              <div className="wrapped-idle-section">
                <div className="wrapped-idle-number">
                  + <CountUp value={p.totalIdlingHours} language={language} /> {txt('hours idling', 'h au ralenti')}
                </div>
                <div className="wrapped-idle-quip">
                  {cmps.idling[fr ? 'fr' : 'en']} {cmps.idling.emoji}
                </div>
              </div>
            )}
          </>
        )}

        {slide === 'fuel' && (
          <>
            <div className="wrapped-label">{txt('YOUR FLEET BURNED THROUGH', 'VOTRE FLOTTE A BR\u00dbL\u00c9')}</div>
            <div className="wrapped-big-number">
              <CountUp value={totalFuel} language={language} />
              <span className="wrapped-unit"> L</span>
            </div>
            {cmps.fuel && (
              <div className="wrapped-comparison">
                {cmps.fuel[fr ? 'fr' : 'en'](formatRatio(totalFuel, cmps.fuel, language))}
                <span className="wrapped-cmp-emoji"> {cmps.fuel.emoji}</span>
              </div>
            )}
            {totalCo2 > 0 && (
              <div className="wrapped-co2-section">
                <div className="wrapped-co2-producing">{txt('Producing', 'Produisant')}</div>
                <div className="wrapped-co2-number">
                  <CountUp value={totalCo2} language={language} /> kg CO{'\u2082'}
                </div>
                {cmps.co2 && (
                  <div className="wrapped-co2-comparison">
                    {cmps.co2[fr ? 'fr' : 'en'](formatRatio(totalCo2, cmps.co2, language))} {cmps.co2.emoji}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {slide === 'outro' && (
          <>
            <div className="wrapped-outro-title">{txt("THAT'S A WRAP", "C'EST TERMIN\u00c9")} 🎬</div>
            <div className="wrapped-outro-grid">
              {p.totalDistance > 0 && (
                <div className="wrapped-outro-stat">
                  <div className="wrapped-outro-value"><CountUp value={p.totalDistance} language={language} /></div>
                  <div className="wrapped-outro-unit">km</div>
                </div>
              )}
              {p.totalDrivingHours > 0 && (
                <div className="wrapped-outro-stat">
                  <div className="wrapped-outro-value"><CountUp value={p.totalDrivingHours} language={language} /></div>
                  <div className="wrapped-outro-unit">{txt('driving hrs', 'h conduite')}</div>
                </div>
              )}
              {(safety.totalEvents || 0) > 0 && (
                <div className="wrapped-outro-stat">
                  <div className="wrapped-outro-value"><CountUp value={safety.totalEvents} language={language} /></div>
                  <div className="wrapped-outro-unit">{txt('safety events', '\u00e9v\u00e9nements')}</div>
                </div>
              )}
              {totalFuel > 0 && (
                <div className="wrapped-outro-stat">
                  <div className="wrapped-outro-value"><CountUp value={totalFuel} language={language} /></div>
                  <div className="wrapped-outro-unit">{txt('L fuel', 'L carburant')}</div>
                </div>
              )}
              {totalCo2 > 0 && (
                <div className="wrapped-outro-stat">
                  <div className="wrapped-outro-value"><CountUp value={totalCo2} language={language} /></div>
                  <div className="wrapped-outro-unit">kg CO{'\u2082'}</div>
                </div>
              )}
            </div>
            <div className="wrapped-signoff">{txt('See you next week', '\u00c0 la semaine prochaine')} 👋</div>
          </>
        )}
      </div>

      <div className="wrapped-tap-hint">
        {slideIndex < slides.length - 1
          ? txt('tap anywhere to continue', 'appuyez pour continuer')
          : txt('tap to close', 'appuyez pour fermer')}
      </div>
    </div>
  );
};

export default WrappedOverlay;
