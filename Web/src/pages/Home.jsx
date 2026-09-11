import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import logoImg from "../images/Meesent App logo .png";

export default function Home() {
  const [searchMode, setSearchMode] = useState("services");
  const [searchWhat, setSearchWhat] = useState("");
  const [searchWhere, setSearchWhere] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Form states
  const [fname, setFname] = useState("");
  const [fphone, setFphone] = useState("");
  const [femail, setFemail] = useState("");
  const [ftype, setFtype] = useState("Customer looking for a service");
  const [fmsg, setFmsg] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Scroll event for sticky nav styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reveal-on-scroll IntersectionObserver setup
  useEffect(() => {
    const revealEls = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    setFname("");
    setFphone("");
    setFemail("");
    setFtype("Customer looking for a service");
    setFmsg("");
    setTimeout(() => setIsSubmitted(false), 5000);
  };

  return (
    <div className="meesent-landing-page">
      <style>{`
        .meesent-landing-page {
          --navy:        #0F1A3D;
          --navy-2:      #142759;
          --navy-soft:   #2A46A8;
          --amber:       #2563EB;
          --amber-dark:  #1D4ED8;
          --teal:        #00B8A0;
          --teal-dark:   #009684;
          --gold:        #F5A623;
          --bg:          #F7F8FC;
          --surface:     #FFFFFF;
          --slate:       #4A4F6A;
          --slate-light: #7A7FA0;
          --line:        #E4E7F2;
          --line-dark:   rgba(255,255,255,.14);

          --font-display: 'Sora', sans-serif;
          --font-body: 'Inter', sans-serif;

          --radius-s: 10px;
          --radius-m: 18px;
          --radius-l: 28px;

          --shadow-sm: 0 2px 10px rgba(18,22,59,.06);
          --shadow-md: 0 12px 32px rgba(18,22,59,.10);
          --shadow-lg: 0 24px 64px rgba(18,22,59,.16);

          --maxw: 1240px;

          font-family: var(--font-body);
          color: var(--navy);
          background: var(--bg);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          overflow-x: hidden;
          min-height: 100vh;
        }

        .meesent-landing-page *,
        .meesent-landing-page *::before,
        .meesent-landing-page *::after {
          box-sizing: border-box;
        }

        .meesent-landing-page a {
          color: inherit;
          text-decoration: none;
        }

        .meesent-landing-page button {
          font-family: inherit;
          cursor: pointer;
        }

        .meesent-landing-page ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .meesent-landing-page h1,
        .meesent-landing-page h2,
        .meesent-landing-page h3,
        .meesent-landing-page h4 {
          font-family: var(--font-display);
          margin: 0;
          line-height: 1.12;
          letter-spacing: -0.015em;
        }

        .meesent-landing-page p {
          margin: 0;
        }

        .meesent-landing-page :focus-visible {
          outline: 3px solid var(--amber);
          outline-offset: 3px;
          border-radius: 4px;
        }

        .meesent-landing-page ::selection {
          background: var(--amber);
          color: #fff;
        }

        .meesent-landing-page .wrap {
          max-width: var(--maxw);
          margin: 0 auto;
          padding: 0 32px;
        }
        @media (max-width: 640px) {
          .meesent-landing-page .wrap { padding: 0 20px; }
        }

        .meesent-landing-page .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 12px;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: var(--amber);
        }
        .meesent-landing-page .eyebrow::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--amber);
          display: inline-block;
          box-shadow: 0 0 0 4px rgba(37,99,235,.15);
        }
        .meesent-landing-page .eyebrow.on-dark { color: #8FF3E4; }
        .meesent-landing-page .eyebrow.on-dark::before {
          background: #8FF3E4;
          box-shadow: 0 0 0 4px rgba(143,243,228,.15);
        }

        .meesent-landing-page .section-head {
          max-width: 640px;
          margin-bottom: 56px;
        }
        .meesent-landing-page .section-head h2 {
          font-size: clamp(28px, 4vw, 44px);
          margin-top: 16px;
          color: var(--navy);
        }
        .meesent-landing-page .section-head p {
          margin-top: 18px;
          font-size: 17px;
          color: var(--slate);
          line-height: 1.7;
        }
        .meesent-landing-page .section-head.center {
          margin-left: auto;
          margin-right: auto;
          text-align: center;
        }

        .meesent-landing-page section {
          position: relative;
        }
        .meesent-landing-page .pad {
          padding: 112px 0;
        }
        @media (max-width: 768px) {
          .meesent-landing-page .pad { padding: 76px 0; }
        }

        .meesent-landing-page .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--line) 18%, var(--line) 82%, transparent);
          border: none;
          margin: 0;
        }
        .meesent-landing-page .section-alt {
          background: var(--surface);
        }
        .meesent-landing-page .section-alt::before,
        .meesent-landing-page .section-alt::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--line) 20%, var(--line) 80%, transparent);
        }
        .meesent-landing-page .section-alt::before { top: 0; }
        .meesent-landing-page .section-alt::after { bottom: 0; }

        .meesent-landing-page .reveal {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity .7s ease, transform .7s cubic-bezier(.2,.7,.2,1);
        }
        .meesent-landing-page .reveal.is-visible {
          opacity: 1;
          transform: none;
        }

        .meesent-landing-page .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 15px;
          padding: 15px 26px;
          border-radius: 999px;
          border: 1px solid transparent;
          position: relative;
          overflow: hidden;
          isolation: isolate;
          transition: transform .3s cubic-bezier(.2,.8,.3,1), box-shadow .3s ease, background .3s ease, border-color .3s ease, color .3s ease;
          white-space: nowrap;
        }
        .meesent-landing-page .btn::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          opacity: 0;
          background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0) 55%);
          transition: opacity .3s ease;
        }
        .meesent-landing-page .btn:hover::before { opacity: 1; }
        .meesent-landing-page .btn:active { transform: translateY(0) scale(.98); }
        .meesent-landing-page .btn svg { width: 18px; height: 18px; flex: none; }
        
        .meesent-landing-page .btn-primary {
          background: var(--amber);
          color: #fff;
          box-shadow: 0 10px 24px rgba(37,99,235,.3), 0 2px 6px rgba(37,99,235,.35), inset 0 1px 0 rgba(255,255,255,.2);
        }
        .meesent-landing-page .btn-primary:hover {
          background: var(--amber-dark);
          transform: translateY(-3px);
          box-shadow: 0 16px 34px rgba(37,99,235,.4), 0 4px 10px rgba(37,99,235,.3);
        }
        
        .meesent-landing-page .btn-outline {
          background: var(--surface);
          border-color: var(--line);
          color: var(--navy);
        }
        .meesent-landing-page .btn-outline:hover {
          border-color: var(--navy);
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
        }
        .meesent-landing-page .btn-outline.on-dark {
          background: transparent;
          border-color: var(--line-dark);
          color: #fff;
        }
        .meesent-landing-page .btn-outline.on-dark:hover {
          border-color: #fff;
          box-shadow: none;
        }
        
        .meesent-landing-page .btn-teal {
          background: var(--teal);
          color: #fff;
          box-shadow: 0 10px 24px rgba(0,184,160,.28), inset 0 1px 0 rgba(255,255,255,.2);
        }
        .meesent-landing-page .btn-teal:hover {
          background: var(--teal-dark);
          transform: translateY(-3px);
          box-shadow: 0 16px 34px rgba(0,184,160,.36);
        }
        
        .meesent-landing-page .btn-ghost {
          background: rgba(255,255,255,.08);
          color: #fff;
          border-color: var(--line-dark);
          backdrop-filter: blur(6px);
        }
        .meesent-landing-page .btn-ghost:hover {
          background: rgba(255,255,255,.16);
          transform: translateY(-3px);
        }
        .meesent-landing-page .btn-sm {
          padding: 10px 18px;
          font-size: 13.5px;
        }

        .meesent-landing-page .icon {
          width: 24px;
          height: 24px;
          stroke: currentColor;
          fill: none;
          stroke-width: 1.7;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        /* NAV */
        .meesent-landing-page .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: rgba(247,248,252,.72);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid transparent;
          transition: border-color .3s ease, background .3s ease;
        }
        .meesent-landing-page .nav.scrolled {
          border-color: var(--line);
          background: rgba(247,248,252,.92);
          box-shadow: 0 6px 24px rgba(18,22,59,.06);
        }
        .meesent-landing-page .nav-inner {
          max-width: var(--maxw);
          margin: 0 auto;
          padding: 18px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        @media (max-width: 640px) {
          .meesent-landing-page .nav-inner { padding: 16px 20px; }
        }

        .meesent-landing-page .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 21px;
          color: var(--navy);
          letter-spacing: -.01em;
        }
        .meesent-landing-page .logo-mark {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--amber), var(--teal));
          display: flex;
          align-items: center;
          justify-content: center;
          flex: none;
          box-shadow: 0 4px 12px -2px rgba(37,99,235,.5);
        }
        .meesent-landing-page .logo-mark svg {
          width: 19px;
          height: 19px;
          stroke: #fff;
        }

        .meesent-landing-page .nav-links {
          display: flex;
          align-items: center;
          gap: 36px;
        }
        .meesent-landing-page .nav-links a {
          font-size: 14.5px;
          font-weight: 600;
          color: var(--slate);
          transition: color .2s ease;
          position: relative;
          padding-bottom: 3px;
        }
        .meesent-landing-page .nav-links a::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 2px;
          background: var(--amber);
          border-radius: 2px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform .25s cubic-bezier(.2,.8,.3,1);
        }
        .meesent-landing-page .nav-links a:hover { color: var(--navy); }
        .meesent-landing-page .nav-links a:hover::after { transform: scaleX(1); }
        .meesent-landing-page .nav-cta { display: flex; align-items: center; gap: 14px; }

        .meesent-landing-page .nav-toggle {
          display: none;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: var(--surface);
        }
        .meesent-landing-page .nav-toggle svg { width: 20px; height: 20px; }

        @media (max-width: 900px) {
          .meesent-landing-page .nav-links {
            position: fixed;
            inset: 70px 16px auto 16px;
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: var(--radius-m);
            box-shadow: var(--shadow-lg);
            flex-direction: column;
            align-items: flex-start;
            padding: 22px 24px;
            gap: 18px;
            transform: translateY(-14px);
            opacity: 0;
            pointer-events: none;
            transition: all .28s ease;
          }
          .meesent-landing-page .nav-links.open {
            transform: translateY(0);
            opacity: 1;
            pointer-events: auto;
          }
          .meesent-landing-page .nav-cta .btn-outline { display: none; }
          .meesent-landing-page .nav-toggle { display: flex; }
        }

        /* HERO */
        .meesent-landing-page .hero {
          padding: 168px 0 120px;
          background:
            radial-gradient(680px 420px at 92% -6%, rgba(0,184,160,.14), transparent 60%),
            radial-gradient(600px 500px at -6% 24%, rgba(37,99,235,.12), transparent 55%),
            var(--bg);
          overflow: hidden;
          position: relative;
        }
        .meesent-landing-page .hero::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: .7;
          background-image: radial-gradient(#D4D9EF 1px, transparent 1px);
          background-size: 26px 26px;
          mask-image: radial-gradient(560px 420px at 22% 30%, black, transparent 72%);
        }
        .meesent-landing-page .hero-grid {
          display: grid;
          grid-template-columns: 1.05fr .95fr;
          gap: 56px;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        @media (max-width: 980px) {
          .meesent-landing-page .hero-grid { grid-template-columns: 1fr; }
        }

        .meesent-landing-page .hero-copy h1 {
          font-size: clamp(34px, 5vw, 58px);
          margin-top: 18px;
          color: var(--navy);
        }
        .meesent-landing-page .hero-copy h1 em {
          font-style: normal;
          background: linear-gradient(100deg, var(--amber), var(--teal-dark));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .meesent-landing-page .hero-copy h1 .u {
          position: relative;
          white-space: nowrap;
          color: var(--teal-dark);
        }
        .meesent-landing-page .hero-copy p.lead {
          margin-top: 22px;
          font-size: 18px;
          line-height: 1.7;
          color: var(--slate);
          max-width: 520px;
        }

        /* search card */
        .meesent-landing-page .search-card {
          margin-top: 34px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius-m);
          box-shadow: var(--shadow-md);
          padding: 10px;
          max-width: 560px;
        }
        .meesent-landing-page .search-toggle {
          display: flex;
          gap: 6px;
          padding: 6px;
        }
        .meesent-landing-page .search-toggle button {
          flex: 1;
          border: none;
          background: transparent;
          padding: 10px 14px;
          border-radius: 999px;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 13.5px;
          color: var(--slate-light);
          transition: all .2s ease;
        }
        .meesent-landing-page .search-toggle button.active {
          background: var(--navy);
          color: #fff;
        }
        .meesent-landing-page .search-fields {
          display: flex;
          align-items: stretch;
          gap: 8px;
          padding: 8px;
          flex-wrap: wrap;
        }
        .meesent-landing-page .search-field {
          flex: 1 1 170px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          background: var(--bg);
          border: 1px solid var(--line);
        }
        .meesent-landing-page .search-field svg {
          width: 18px;
          height: 18px;
          color: var(--slate-light);
          flex: none;
        }
        .meesent-landing-page .search-field input {
          border: none;
          background: transparent;
          outline: none;
          font-family: var(--font-body);
          font-size: 14.5px;
          color: var(--navy);
          width: 100%;
        }
        .meesent-landing-page .search-field input::placeholder {
          color: var(--slate-light);
        }
        .meesent-landing-page .search-go { flex: none; }
        @media (max-width: 480px) {
          .meesent-landing-page .search-go { width: 100%; }
        }

        /* store badges */
        .meesent-landing-page .store-row {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 30px;
        }
        .meesent-landing-page .store-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 20px 11px 16px;
          border-radius: 14px;
          background: var(--navy);
          color: #fff;
          border: 1px solid var(--navy);
          transition: transform .25s ease, box-shadow .25s ease, background .25s ease;
        }
        .meesent-landing-page .store-badge:hover {
          transform: translateY(-2px);
          background: var(--navy-2);
          box-shadow: var(--shadow-md);
        }
        .meesent-landing-page .store-badge svg {
          width: 26px;
          height: 26px;
          flex: none;
        }
        .meesent-landing-page .store-badge .txt small {
          display: block;
          font-size: 10.5px;
          letter-spacing: .03em;
          color: #B9BEE0;
        }
        .meesent-landing-page .store-badge .txt strong {
          display: block;
          font-size: 15.5px;
          font-family: var(--font-display);
          font-weight: 700;
          margin-top: 1px;
        }
        .meesent-landing-page .store-badge.disabled {
          background: transparent;
          color: var(--navy);
          border-color: var(--line);
          cursor: default;
        }
        .meesent-landing-page .store-badge.disabled:hover {
          transform: none;
          box-shadow: none;
          background: transparent;
        }
        .meesent-landing-page .store-badge.disabled .txt small {
          color: var(--slate-light);
        }
        .meesent-landing-page .store-badge.disabled svg {
          color: var(--navy);
        }

        .meesent-landing-page .hero-trust {
          display: flex;
          align-items: center;
          gap: 22px;
          margin-top: 36px;
          flex-wrap: wrap;
        }
        .meesent-landing-page .hero-trust .stat strong {
          display: block;
          font-family: var(--font-display);
          font-size: 22px;
          color: var(--navy);
        }
        .meesent-landing-page .hero-trust .stat span {
          font-size: 12.5px;
          color: var(--slate-light);
        }
        .meesent-landing-page .hero-trust .divider {
          width: 1px;
          height: 34px;
          background: var(--line);
        }

        /* Hero phone / radar visual */
        .meesent-landing-page .hero-visual {
          position: relative;
          display: flex;
          justify-content: center;
        }
        .meesent-landing-page .radar {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 0;
        }
        .meesent-landing-page .radar-ring {
          position: absolute;
          border: 1px solid rgba(0,184,160,.28);
          border-radius: 50%;
        }
        .meesent-landing-page .radar-ring.r1 { width: 180px; height: 180px; }
        .meesent-landing-page .radar-ring.r2 { width: 320px; height: 320px; }
        .meesent-landing-page .radar-ring.r3 { width: 460px; height: 460px; }
        
        .meesent-landing-page .radar-pulse {
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,184,160,.25), transparent 70%);
          animation: pulse 3.2s ease-out infinite;
        }
        @keyframes pulse {
          0% { transform: scale(.5); opacity: .9; }
          100% { transform: scale(2.6); opacity: 0; }
        }

        .meesent-landing-page .chip-float {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,.6);
          border-radius: 14px;
          padding: 10px 14px;
          box-shadow: var(--shadow-md);
          font-size: 12.5px;
          font-weight: 700;
          font-family: var(--font-display);
          color: var(--navy);
          z-index: 3;
          animation: float 5s ease-in-out infinite;
        }
        .meesent-landing-page .chip-float svg { width: 16px; height: 16px; }
        .meesent-landing-page .chip-float.c1 { top: 8%; left: -4%; animation-delay: .2s; }
        .meesent-landing-page .chip-float.c2 { bottom: 14%; right: -6%; animation-delay: 1.1s; color: var(--teal-dark); }
        .meesent-landing-page .chip-float.c3 { bottom: 44%; left: -10%; animation-delay: 2s; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .meesent-landing-page .phone {
          position: relative;
          z-index: 2;
          width: 290px;
          height: 590px;
          border-radius: 46px;
          background: linear-gradient(155deg,#1B234C,var(--navy) 40%);
          padding: 14px;
          box-shadow: var(--shadow-lg), inset 0 0 0 2px rgba(255,255,255,.06);
        }
        .meesent-landing-page .phone::before,
        .meesent-landing-page .phone::after {
          content: "";
          position: absolute;
          right: -3px;
          width: 3px;
          background: var(--navy-2);
          border-radius: 2px 0 0 2px;
        }
        .meesent-landing-page .phone::before { top: 118px; height: 52px; }
        .meesent-landing-page .phone::after { top: 184px; height: 76px; }
        
        .meesent-landing-page .phone-notch {
          position: absolute;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          width: 96px;
          height: 26px;
          background: #000;
          border-radius: 20px;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 14px;
        }
        .meesent-landing-page .phone-notch::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #1c2340;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
        }
        
        .meesent-landing-page .phone-screen {
          position: relative;
          width: 100%;
          height: 100%;
          background: var(--surface);
          border-radius: 34px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .meesent-landing-page .phone-screen::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 20;
          background: linear-gradient(115deg, rgba(255,255,255,.10) 0%, transparent 16%, transparent 84%, rgba(255,255,255,.04) 100%);
        }
        
        .meesent-landing-page .ps-status {
          display: flex;
          justify-content: space-between;
          padding: 16px 20px 4px;
          font-size: 11px;
          font-weight: 700;
          color: var(--navy);
        }
        .meesent-landing-page .ps-header {
          padding: 18px 20px 6px;
        }
        .meesent-landing-page .ps-header .greet {
          font-size: 11.5px;
          color: var(--slate-light);
          font-weight: 600;
        }
        .meesent-landing-page .ps-header .name {
          font-family: var(--font-display);
          font-size: 19px;
          font-weight: 700;
          margin-top: 2px;
          color: var(--navy);
        }
        
        .meesent-landing-page .ps-search {
          margin: 14px 20px;
          padding: 12px 14px;
          background: var(--bg);
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .meesent-landing-page .ps-search svg {
          width: 15px;
          height: 15px;
          color: var(--slate-light);
        }
        .meesent-landing-page .ps-search span {
          font-size: 12px;
          color: var(--slate-light);
        }
        
        .meesent-landing-page .ps-cats {
          display: flex;
          gap: 10px;
          padding: 2px 20px 6px;
          overflow: hidden;
        }
        .meesent-landing-page .ps-cat {
          flex: none;
          width: 64px;
          text-align: center;
        }
        .meesent-landing-page .ps-cat .ico {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }
        .meesent-landing-page .ps-cat .ico svg {
          width: 22px;
          height: 22px;
          color: #fff;
        }
        .meesent-landing-page .ps-cat span {
          display: block;
          font-size: 9.5px;
          margin-top: 6px;
          color: var(--slate);
          font-weight: 600;
        }
        
        .meesent-landing-page .ps-section-title {
          padding: 14px 20px 6px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--navy);
          font-family: var(--font-display);
        }
        
        .meesent-landing-page .ps-card {
          margin: 0 20px 10px;
          padding: 12px;
          border: 1px solid var(--line);
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .meesent-landing-page .ps-card .av {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          flex: none;
        }
        .meesent-landing-page .ps-card .meta {
          flex: 1;
        }
        .meesent-landing-page .ps-card .meta b {
          display: block;
          font-size: 12px;
          color: var(--navy);
        }
        .meesent-landing-page .ps-card .meta span {
          font-size: 10.5px;
          color: var(--slate-light);
        }
        .meesent-landing-page .ps-card .rate {
          font-size: 11px;
          font-weight: 700;
          color: var(--teal-dark);
        }
        
        .meesent-landing-page .ps-nav {
          margin-top: auto;
          display: flex;
          justify-content: space-around;
          padding: 12px 10px;
          border-top: 1px solid var(--line);
        }
        .meesent-landing-page .ps-nav svg {
          width: 19px;
          height: 19px;
        }
        .meesent-landing-page .ps-nav .active { color: var(--amber); }
        .meesent-landing-page .ps-nav .idle { color: var(--slate-light); }

        /* TRUST STRIP */
        .meesent-landing-page .trust-strip {
          background: var(--navy);
          padding: 0;
        }
        .meesent-landing-page .trust-inner {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }
        .meesent-landing-page .trust-item {
          padding: 38px 24px;
          text-align: center;
          border-right: 1px solid var(--line-dark);
        }
        .meesent-landing-page .trust-item:last-child {
          border-right: none;
        }
        .meesent-landing-page .trust-item strong {
          display: block;
          font-family: var(--font-display);
          font-size: clamp(22px, 3vw, 32px);
          color: #fff;
        }
        .meesent-landing-page .trust-item span {
          font-size: 12.5px;
          color: #A9AEDA;
          letter-spacing: .03em;
        }
        @media (max-width: 720px) {
          .meesent-landing-page .trust-inner { grid-template-columns: repeat(2, 1fr); }
          .meesent-landing-page .trust-item { border-bottom: 1px solid var(--line-dark); }
        }

        /* TWO SIDES */
        .meesent-landing-page .sides-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
        }
        @media (max-width: 860px) {
          .meesent-landing-page .sides-grid { grid-template-columns: 1fr; }
        }
        
        .meesent-landing-page .side-card {
          border-radius: var(--radius-l);
          padding: 44px 40px;
          position: relative;
          overflow: hidden;
          transition: transform .35s cubic-bezier(.2,.8,.3,1), box-shadow .35s ease;
        }
        .meesent-landing-page .side-card:hover {
          transform: translateY(-6px);
          box-shadow: var(--shadow-lg);
        }
        .meesent-landing-page .side-card.cust {
          background: linear-gradient(160deg, #EAFBF7, #F7F8FC 60%);
          border: 1px solid #CFF1EA;
        }
        .meesent-landing-page .side-card.vend {
          background: linear-gradient(160deg, #FFF1E7, #F7F8FC 60%);
          border: 1px solid #FBDCC3;
        }
        .meesent-landing-page .side-card .tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          font-family: var(--font-display);
        }
        .meesent-landing-page .side-card.cust .tag {
          background: #CFF1EA;
          color: var(--teal-dark);
        }
        .meesent-landing-page .side-card.vend .tag {
          background: #FBDCC3;
          color: var(--amber-dark);
        }
        .meesent-landing-page .side-card h3 {
          font-size: 26px;
          margin-top: 18px;
          color: var(--navy);
        }
        .meesent-landing-page .side-card p.desc {
          margin-top: 12px;
          color: var(--slate);
          line-height: 1.65;
          font-size: 15.5px;
          max-width: 420px;
        }
        .meesent-landing-page .side-list {
          margin-top: 22px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .meesent-landing-page .side-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 14.5px;
          color: var(--navy);
          font-weight: 500;
        }
        .meesent-landing-page .side-list svg {
          width: 19px;
          height: 19px;
          flex: none;
          margin-top: 1px;
        }
        .meesent-landing-page .side-card.cust .side-list svg { color: var(--teal-dark); }
        .meesent-landing-page .side-card.vend .side-list svg { color: var(--amber-dark); }
        .meesent-landing-page .side-card .btn { margin-top: 28px; }
        
        .meesent-landing-page .side-badge-icon {
          position: absolute;
          right: -26px;
          bottom: -26px;
          width: 130px;
          height: 130px;
          opacity: .5;
        }
        .meesent-landing-page .side-badge-icon svg { width: 100%; height: 100%; }
        .meesent-landing-page .side-card.cust .side-badge-icon { color: #B9EBE1; }
        .meesent-landing-page .side-card.vend .side-badge-icon { color: #FCD3AE; }

        /* SERVICES GRID */
        .meesent-landing-page .services-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        @media (max-width: 980px) {
          .meesent-landing-page .services-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 680px) {
          .meesent-landing-page .services-grid { grid-template-columns: repeat(2, 1fr); }
        }
        
        .meesent-landing-page .service-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius-m);
          padding: 26px 22px;
          transition: transform .3s cubic-bezier(.2,.8,.3,1), box-shadow .3s ease, border-color .3s ease;
        }
        .meesent-landing-page .service-card:hover {
          transform: translateY(-7px);
          box-shadow: var(--shadow-lg);
          border-color: transparent;
        }
        .meesent-landing-page .service-card:hover .service-ico {
          transform: scale(1.08) rotate(-3deg);
        }
        
        .meesent-landing-page .service-ico {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform .3s cubic-bezier(.2,.8,.3,1), box-shadow .3s ease;
          box-shadow: 0 8px 18px -6px rgba(18,22,59,.28);
        }
        .meesent-landing-page .service-ico svg { width: 25px; height: 25px; color: #fff; }
        .meesent-landing-page .service-card h4 { margin-top: 18px; font-size: 16.5px; color: var(--navy); }
        .meesent-landing-page .service-card span { display: block; margin-top: 6px; font-size: 12.5px; color: var(--slate-light); }
        .meesent-landing-page .services-cta { margin-top: 40px; text-align: center; }

        /* PROCESS */
        .meesent-landing-page .process-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
          position: relative;
        }
        @media (max-width: 820px) {
          .meesent-landing-page .process-row { grid-template-columns: 1fr; gap: 34px; }
        }
        
        .meesent-landing-page .process-step {
          padding: 0 26px;
          position: relative;
        }
        .meesent-landing-page .process-step:first-child { padding-left: 0; }
        .meesent-landing-page .process-step:last-child { padding-right: 0; }
        
        .meesent-landing-page .process-num {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 44px;
          color: transparent;
          -webkit-text-stroke: 1.5px var(--line);
        }
        .meesent-landing-page .process-step h4 { margin-top: 8px; font-size: 18px; color: var(--navy); }
        .meesent-landing-page .process-step p { margin-top: 10px; font-size: 14.5px; color: var(--slate); line-height: 1.6; }
        
        .meesent-landing-page .process-arrow {
          position: absolute;
          top: 20px;
          right: -14px;
          width: 26px;
          height: 26px;
          color: var(--line);
        }
        @media (max-width: 820px) {
          .meesent-landing-page .process-arrow { display: none; }
        }

        /* JOBS */
        .meesent-landing-page .jobs-wrap {
          background: var(--navy);
          border-radius: var(--radius-l);
          padding: 56px 52px;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 640px) {
          .meesent-landing-page .jobs-wrap { padding: 40px 24px; }
        }
        
        .meesent-landing-page .jobs-wrap::before {
          content: "";
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,.18), transparent 65%);
          top: -220px;
          right: -180px;
        }
        .meesent-landing-page .jobs-wrap::after {
          content: "";
          position: absolute;
          inset: 0;
          opacity: .5;
          pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px);
          background-size: 22px 22px;
          mask-image: linear-gradient(180deg, transparent, rgba(0,0,0,.5) 30%, transparent 85%);
        }
        
        .meesent-landing-page .jobs-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }
        .meesent-landing-page .jobs-head h2 { color: #fff; font-size: clamp(24px, 3.4vw, 34px); margin-top: 12px; max-width: 460px; }
        .meesent-landing-page .jobs-head p { color: #B9BEE0; margin-top: 10px; max-width: 420px; font-size: 15px; line-height: 1.6; }
        
        .meesent-landing-page .jobs-list {
          margin-top: 38px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          position: relative;
          z-index: 1;
        }
        @media (max-width: 760px) {
          .meesent-landing-page .jobs-list { grid-template-columns: 1fr; }
        }
        
        .meesent-landing-page .job-card {
          background: rgba(255,255,255,.05);
          border: 1px solid var(--line-dark);
          border-radius: 16px;
          padding: 22px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          transition: background .3s ease, transform .3s ease, border-color .3s ease, box-shadow .3s ease;
        }
        .meesent-landing-page .job-card:hover {
          background: rgba(255,255,255,.09);
          transform: translateY(-4px);
          border-color: rgba(37,99,235,.4);
          box-shadow: 0 16px 30px rgba(0,0,0,.25);
        }
        
        .meesent-landing-page .job-ico {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(37,99,235,.18);
          display: flex;
          align-items: center;
          justify-content: center;
          flex: none;
        }
        .meesent-landing-page .job-ico svg { width: 21px; height: 21px; color: var(--amber); }
        .meesent-landing-page .job-meta { flex: 1; }
        .meesent-landing-page .job-meta h4 { color: #fff; font-size: 16px; }
        
        .meesent-landing-page .job-tags {
          display: flex;
          gap: 8px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .meesent-landing-page .job-tags span {
          font-size: 11px;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          color: #C7CBEE;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .meesent-landing-page .job-tags span.pay {
          background: rgba(0,184,160,.18);
          color: #7FEFDF;
        }
        
        .meesent-landing-page .job-apply { margin-top: 14px; }
        .meesent-landing-page .job-apply a {
          font-size: 13px;
          font-weight: 700;
          font-family: var(--font-display);
          color: var(--amber);
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .meesent-landing-page .job-apply svg { width: 14px; height: 14px; }
        .meesent-landing-page .jobs-cta {
          margin-top: 34px;
          display: flex;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        /* VENDOR REGISTRATION */
        .meesent-landing-page .vendor-section {
          display: grid;
          grid-template-columns: .95fr 1.05fr;
          gap: 60px;
          align-items: center;
        }
        @media (max-width: 940px) {
          .meesent-landing-page .vendor-section { grid-template-columns: 1fr; }
        }
        
        .meesent-landing-page .vendor-steps {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .meesent-landing-page .vstep {
          display: flex;
          gap: 20px;
          padding: 22px 0;
          border-bottom: 1px solid var(--line);
        }
        .meesent-landing-page .vstep:last-child { border-bottom: none; }
        
        .meesent-landing-page .vstep-num {
          flex: none;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: var(--navy);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 14px;
        }
        .meesent-landing-page .vstep h4 { font-size: 16.5px; color: var(--navy); }
        .meesent-landing-page .vstep p { margin-top: 6px; font-size: 14px; color: var(--slate); line-height: 1.6; max-width: 420px; }
        .meesent-landing-page .vendor-cta-row { display: flex; gap: 14px; margin-top: 30px; flex-wrap: wrap; }

        .meesent-landing-page .vendor-panel {
          background: linear-gradient(160deg, var(--navy), var(--navy-2));
          border-radius: var(--radius-l);
          padding: 40px;
          position: relative;
          overflow: hidden;
        }
        .meesent-landing-page .vendor-panel::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(420px 260px at 100% 0%, rgba(0,184,160,.22), transparent 60%);
        }
        
        .meesent-landing-page .vp-card {
          position: relative;
          z-index: 1;
          background: rgba(255,255,255,.06);
          border: 1px solid var(--line-dark);
          border-radius: 18px;
          padding: 24px;
        }
        .meesent-landing-page .vp-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .meesent-landing-page .vp-avatar {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--amber), var(--teal));
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .meesent-landing-page .vp-avatar svg { width: 24px; height: 24px; color: #fff; }
        .meesent-landing-page .vp-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #7FEFDF;
          background: rgba(0,184,160,.15);
          padding: 6px 12px;
          border-radius: 999px;
        }
        .meesent-landing-page .vp-badge svg { width: 13px; height: 13px; }
        .meesent-landing-page .vp-name { margin-top: 16px; color: #fff; font-family: var(--font-display); font-size: 19px; font-weight: 700; }
        .meesent-landing-page .vp-role { color: #A9AEDA; font-size: 13px; margin-top: 2px; }
        
        .meesent-landing-page .vp-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 20px;
        }
        .meesent-landing-page .vp-stats div {
          background: rgba(255,255,255,.05);
          border-radius: 12px;
          padding: 12px;
          text-align: center;
        }
        .meesent-landing-page .vp-stats strong { display: block; color: #fff; font-family: var(--font-display); font-size: 17px; }
        .meesent-landing-page .vp-stats span { font-size: 10px; color: #A9AEDA; }
        
        .meesent-landing-page .vp-bars {
          margin-top: 20px;
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 60px;
        }
        .meesent-landing-page .vp-bars i {
          flex: 1;
          background: linear-gradient(180deg, var(--teal), rgba(0,184,160,.3));
          border-radius: 6px 6px 0 0;
          display: block;
        }

        /* APP SHOWCASE */
        .meesent-landing-page .showcase-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 26px;
        }
        @media (max-width: 860px) {
          .meesent-landing-page .showcase-strip { grid-template-columns: 1fr; max-width: 320px; margin: 0 auto; }
        }
        .meesent-landing-page .showcase-item { text-align: center; }
        
        .meesent-landing-page .showcase-frame {
          width: 100%;
          aspect-ratio: 9/18.3;
          border-radius: 34px;
          background: var(--navy);
          padding: 10px;
          box-shadow: var(--shadow-lg);
          margin: 0 auto;
          max-width: 250px;
        }
        .meesent-landing-page .showcase-screen {
          width: 100%;
          height: 100%;
          border-radius: 26px;
          background: linear-gradient(165deg, #EAFBF7, #FFF1E7);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          position: relative;
          border: 1px dashed #C9CEEC;
        }
        .meesent-landing-page .showcase-screen svg { width: 38px; height: 38px; color: var(--navy-soft); opacity: .5; }
        .meesent-landing-page .showcase-screen span { font-size: 11px; color: var(--slate-light); font-weight: 600; max-width: 150px; }
        .meesent-landing-page .showcase-item h4 { margin-top: 18px; font-size: 15px; color: var(--navy); }
        .meesent-landing-page .showcase-item p { margin-top: 4px; font-size: 12.5px; color: var(--slate-light); }

        /* TESTIMONIALS */
        .meesent-landing-page .testi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 22px;
        }
        @media (max-width: 900px) {
          .meesent-landing-page .testi-grid { grid-template-columns: 1fr; }
        }
        
        .meesent-landing-page .testi-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius-m);
          padding: 30px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          transition: transform .3s cubic-bezier(.2,.8,.3,1), box-shadow .3s ease;
        }
        .meesent-landing-page .testi-card:hover {
          transform: translateY(-6px);
          box-shadow: var(--shadow-lg);
        }
        .meesent-landing-page .testi-stars { display: flex; gap: 3px; color: var(--gold); }
        .meesent-landing-page .testi-stars svg { width: 16px; height: 16px; }
        .meesent-landing-page .testi-card p.quote { font-size: 15px; line-height: 1.7; color: var(--navy); }
        
        .meesent-landing-page .testi-who {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: auto;
        }
        .meesent-landing-page .testi-avatar { width: 42px; height: 42px; border-radius: 50%; flex: none; }
        .meesent-landing-page .testi-who b { display: block; font-size: 14px; color: var(--navy); }
        .meesent-landing-page .testi-who span { font-size: 12px; color: var(--slate-light); }

        /* CONTACT */
        .meesent-landing-page .contact-wrap {
          display: grid;
          grid-template-columns: .85fr 1.15fr;
          gap: 0;
          border-radius: var(--radius-l);
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }
        @media (max-width: 900px) {
          .meesent-landing-page .contact-wrap { grid-template-columns: 1fr; }
        }
        
        .meesent-landing-page .contact-info {
          background: var(--navy);
          padding: 52px 44px;
          color: #fff;
          position: relative;
          overflow: hidden;
        }
        .meesent-landing-page .contact-info::before {
          content: "";
          position: absolute;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,.18), transparent 65%);
          bottom: -160px;
          left: -140px;
        }
        
        .meesent-landing-page .contact-info h3 { font-size: 24px; position: relative; z-index: 1; }
        .meesent-landing-page .contact-info p.sub { margin-top: 12px; color: #B9BEE0; font-size: 14.5px; line-height: 1.6; max-width: 320px; position: relative; z-index: 1; }
        
        .meesent-landing-page .contact-rows {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          z-index: 1;
        }
        .meesent-landing-page .contact-row { display: flex; gap: 14px; align-items: flex-start; }
        .meesent-landing-page .contact-row .ico {
          width: 40px;
          height: 40px;
          border-radius: 11px;
          background: rgba(255,255,255,.08);
          display: flex;
          align-items: center;
          justify-content: center;
          flex: none;
        }
        .meesent-landing-page .contact-row .ico svg { width: 18px; height: 18px; color: var(--teal); }
        .meesent-landing-page .contact-row b { display: block; font-size: 14px; color: #fff; }
        .meesent-landing-page .contact-row span { font-size: 13px; color: #A9AEDA; }
        
        .meesent-landing-page .contact-social { display: flex; gap: 10px; margin-top: 34px; position: relative; z-index: 1; }
        .meesent-landing-page .contact-social a {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(255,255,255,.08);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background .2s ease;
        }
        .meesent-landing-page .contact-social a:hover { background: rgba(255,255,255,.18); }
        .meesent-landing-page .contact-social svg { width: 16px; height: 16px; color: #fff; }

        .meesent-landing-page .contact-form { background: var(--surface); padding: 52px 44px; }
        .meesent-landing-page .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 520px) {
          .meesent-landing-page .form-row { grid-template-columns: 1fr; }
        }
        
        .meesent-landing-page .field { margin-bottom: 18px; }
        .meesent-landing-page .field label { display: block; font-size: 12.5px; font-weight: 700; color: var(--navy); margin-bottom: 8px; font-family: var(--font-display); }
        
        .meesent-landing-page .field input,
        .meesent-landing-page .field select,
        .meesent-landing-page .field textarea {
          width: 100%;
          border: 1px solid var(--line);
          background: var(--bg);
          border-radius: 12px;
          padding: 13px 15px;
          font-family: var(--font-body);
          font-size: 14.5px;
          color: var(--navy);
          outline: none;
          transition: border-color .2s ease, box-shadow .2s ease;
        }
        .meesent-landing-page .field input:focus,
        .meesent-landing-page .field select:focus,
        .meesent-landing-page .field textarea:focus {
          border-color: var(--teal);
          box-shadow: 0 0 0 4px rgba(0,184,160,.12);
        }
        .meesent-landing-page .field textarea { resize: vertical; min-height: 110px; }
        
        .meesent-landing-page .form-note { font-size: 12px; color: var(--slate-light); margin-top: 10px; }
        
        .meesent-landing-page .form-success {
          display: none;
          align-items: center;
          gap: 10px;
          background: #EAFBF7;
          border: 1px solid #CFF1EA;
          color: var(--teal-dark);
          padding: 13px 16px;
          border-radius: 12px;
          font-size: 13.5px;
          font-weight: 600;
          margin-top: 14px;
        }
        .meesent-landing-page .form-success.show { display: flex; }
        .meesent-landing-page .form-success svg { width: 18px; height: 18px; flex: none; }

        /* FOOTER */
        .meesent-landing-page .footer-cta {
          background: linear-gradient(135deg, var(--navy), var(--navy-2));
          border-radius: var(--radius-l);
          padding: 64px 56px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 40px;
          flex-wrap: wrap;
          position: relative;
          overflow: hidden;
        }
        .meesent-landing-page .footer-cta::before {
          content: "";
          position: absolute;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,184,160,.2), transparent 65%);
          top: -200px;
          right: -120px;
        }
        .meesent-landing-page .footer-cta h2 { color: #fff; font-size: clamp(24px, 3.4vw, 36px); max-width: 480px; position: relative; z-index: 1; }
        .meesent-landing-page .footer-cta p { color: #B9BEE0; margin-top: 12px; font-size: 15px; max-width: 420px; position: relative; z-index: 1; }
        .meesent-landing-page .footer-cta .store-row { margin-top: 0; position: relative; z-index: 1; }

        .meesent-landing-page footer { padding: 80px 0 34px; }
        .meesent-landing-page .footer-grid { display: grid; grid-template-columns: 1.4fr repeat(3, 1fr); gap: 40px; padding-top: 64px; }
        @media (max-width: 820px) {
          .meesent-landing-page .footer-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 520px) {
          .meesent-landing-page .footer-grid { grid-template-columns: 1fr; }
        }
        
        .meesent-landing-page .footer-brand p { margin-top: 14px; font-size: 14px; color: var(--slate); line-height: 1.6; max-width: 280px; }
        .meesent-landing-page .footer-col h5 { font-family: var(--font-display); font-size: 13px; letter-spacing: .04em; text-transform: uppercase; color: var(--navy); margin-bottom: 18px; }
        .meesent-landing-page .footer-col ul { display: flex; flex-direction: column; gap: 12px; }
        .meesent-landing-page .footer-col a { font-size: 14px; color: var(--slate); transition: color .2s ease; }
        .meesent-landing-page .footer-col a:hover { color: var(--navy); }
        
        .meesent-landing-page .footer-bottom {
          margin-top: 64px;
          padding-top: 26px;
          border-top: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .meesent-landing-page .footer-bottom span { font-size: 13px; color: var(--slate-light); }
        .meesent-landing-page .footer-legal { display: flex; gap: 22px; }
        .meesent-landing-page .footer-legal a { font-size: 13px; color: var(--slate-light); }
        .meesent-landing-page .footer-legal a:hover { color: var(--navy); }
      `}</style>

      {/* NAVBAR */}
      <nav className={`nav ${isScrolled ? "scrolled" : ""}`} id="nav">
        <div className="nav-inner">
          <a href="#top" className="logo">
            <img src={logoImg} alt="Meesent Logo" style={{ width: '34px', height: '34px', objectFit: 'contain', borderRadius: '8px' }} />
            Meesent
          </a>

          <ul className={`nav-links ${mobileMenuOpen ? "open" : ""}`} id="navLinks">
            <li><a href="#services" onClick={() => setMobileMenuOpen(false)}>Services</a></li>
            <li><a href="#jobs" onClick={() => setMobileMenuOpen(false)}>Jobs</a></li>
            <li><a href="#vendors" onClick={() => setMobileMenuOpen(false)}>For Vendors</a></li>
            <li><a href="#how" onClick={() => setMobileMenuOpen(false)}>How it works</a></li>
            <li><a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a></li>
          </ul>

          <div className="nav-cta">

            <a href="#download" className="btn btn-primary btn-sm">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v13m0 0-4-4m4 4 4-4M5 21h14" />
              </svg>
              Get the app
            </a>
            <button
              className="nav-toggle"
              id="navToggle"
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* 1. HERO */}
      <header className="hero" id="top">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Local services &amp; jobs, one app</p>
            <h1>Find trusted help nearby.<br />Or find your <em>next job</em> nearby.</h1>
            <p className="lead">Meesent connects people to verified local service professionals and puts nearby job openings in one place — while local vendors register their business and start getting leads the same day.</p>



            <div className="store-row">
              <a href="https://play.google.com/store/apps/details?id=com.messent.app&hl=en_IN" className="store-badge" aria-label="Get it on Google Play" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.6 2.4c-.4.4-.6.9-.6 1.5v16.2c0 .6.2 1.1.6 1.5l.1.1L13 12.4v-.2L3.7 2.3l-.1.1Z" />
                  <path d="m16 9.4-3-1.7L4.4 2.9 15.1 9.9 16 9.4Z" />
                  <path d="M16 14.6l-.9-.5-10.7 6.9 8.6-4.6 3-1.8Z" />
                  <path d="m17.9 11.3-2.3 1.3-2.3 1.4 2.3 1.4 2.3 1.3 4-2.3a1.4 1.4 0 0 0 0-2.4l-4-1.7Z" />
                </svg>
                <span className="txt"><small>GET IT ON</small><strong>Google Play</strong></span>
              </a>
              <span className="store-badge disabled" aria-disabled="true">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.5 12.6c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.9-.8-1.5 0-2.9.9-3.6 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.2-2.6-.1 0-2.6-1-2.6-3.9Z" />
                  <path d="M15.2 5.8c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.7-1 2.8 1 .1 2.1-.6 2.8-1.3Z" />
                </svg>
                <span className="txt"><small>COMING SOON ON THE</small><strong>App Store</strong></span>
              </span>
            </div>

            <div className="hero-trust">
              <div className="stat"><strong>500+</strong><span>Verified Jobs</span></div>
              <div className="divider"></div>
              <div className="stat"><strong>Major Cities</strong><span>AP & Telangana</span></div>
              <div className="divider"></div>
              <div className="stat"><strong>Direct Apply</strong><span>via Call or WhatsApp</span></div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="radar" aria-hidden="true">
              <div className="radar-ring r3"></div>
              <div className="radar-ring r2"></div>
              <div className="radar-ring r1"></div>
              <div className="radar-pulse"></div>
            </div>

            <div className="chip-float c1">
              <svg viewBox="0 0 24 24" fill="var(--gold)" stroke="var(--gold)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 2 2.9 6.3 6.8.7-5.1 4.6 1.5 6.7L12 16.9l-6.1 3.4 1.5-6.7-5.1-4.6 6.8-.7L12 2Z" />
              </svg>
              4.8 rated on Play Store
            </div>
            <div className="chip-float c2">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12.5 11 15l4.5-6" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              KYC verified vendors
            </div>
            <div className="chip-float c3">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              420+ jobs posted today
            </div>

            <div className="phone">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <div className="ps-status"><span>9:41</span><span>●●● 5G 100%</span></div>
                <div className="ps-header">
                  <p className="greet">Good morning</p>
                  <p className="name">Ramesh, Kukatpally</p>
                </div>
                <div className="ps-search">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <span>Search services or jobs near you</span>
                </div>
                <div className="ps-cats">
                  <div className="ps-cat">
                    <div className="ico" style={{ background: "var(--teal)" }}>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a3 3 0 0 0-4.2 4.2L4 17l3 3 6.5-6.5a3 3 0 0 0 4.2-4.2l-2.3 2.3-2-2 2.3-2.3Z" />
                      </svg>
                    </div>
                    <span>Repair</span>
                  </div>
                  <div className="ps-cat">
                    <div className="ico" style={{ background: "var(--amber)" }}>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 7 9 18l-5-5" />
                      </svg>
                    </div>
                    <span>Cleaning</span>
                  </div>
                  <div className="ps-cat">
                    <div className="ico" style={{ background: "var(--navy-soft)" }}>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="7" width="18" height="13" rx="2" />
                        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </div>
                    <span>Jobs</span>
                  </div>
                  <div className="ps-cat">
                    <div className="ico" style={{ background: "var(--teal-dark)" }}>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                        <path d="M9 22V12h6v10" />
                      </svg>
                    </div>
                    <span>Tutors</span>
                  </div>
                </div>
                <p className="ps-section-title">Top rated near you</p>
                <div className="ps-card">
                  <div className="av" style={{ background: "linear-gradient(135deg,var(--teal),var(--teal-dark))" }}></div>
                  <div className="meta"><b>Sunrise Electricals</b><span>2.1 km · Electrician</span></div>
                  <div className="rate">★ 4.9</div>
                </div>
                <div className="ps-card">
                  <div className="av" style={{ background: "linear-gradient(135deg,var(--amber),var(--amber-dark))" }}></div>
                  <div className="meta"><b>Field Sales Executive</b><span>Kondapur · ₹18-22k/mo</span></div>
                  <div className="rate">New</div>
                </div>
                <div className="ps-nav">
                  <svg className="active" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11.5 12 4l9 7.5" />
                    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
                  </svg>
                  <svg className="idle" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="7" width="18" height="13" rx="2" />
                    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <svg className="idle" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21a8 8 0 1 0-16 0" />
                    <circle cx="12" cy="8" r="5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* TRUST STRIP */}
      <section className="trust-strip">
        <div className="wrap trust-inner">
          <div className="trust-item"><strong>500+</strong><span>Verified Jobs Listed</span></div>
          <div className="trust-item"><strong>Major Cities</strong><span>AP & Telangana Live</span></div>
          <div className="trust-item"><strong>Direct Apply</strong><span>Call & WhatsApp Contact</span></div>
          <div className="trust-item"><strong>KYC Verified</strong><span>Local service providers</span></div>
        </div>
      </section>

      {/* 2. TWO SIDES */}
      <section className="pad" id="how">
        <div className="wrap">
          <div className="section-head reveal">
            <p className="eyebrow">One app, two sides of local work</p>
            <h2>Built for the person hiring and the person doing the work</h2>
            <p>Meesent brings verified local services and nearby job listings together — putting customers directly in touch with local vendors, and connecting job seekers directly with local employers, in a single local-first app.</p>
          </div>

          <div className="sides-grid">
            <div className="side-card cust reveal">
              <span className="tag">FOR CUSTOMERS</span>
              <h3>Get local work done, without the guesswork</h3>
              <p className="desc">Search any service — from electricians to tutors — compare verified nearby professionals, and get their contact details in a few taps.</p>
              <ul class="side-list">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12.5 11 15l4.5-6" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  KYC-verified local professionals
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12.5 11 15l4.5-6" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  Transparent pricing before you reach out
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12.5 11 15l4.5-6" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  Ratings &amp; reviews from your neighbourhood
                </li>
              </ul>
              <a href="#services" className="btn btn-teal">Explore services</a>
              <span className="side-badge-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.4">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9 12.5 11 15l4.5-6" />
                </svg>
              </span>
            </div>

            <div className="side-card vend reveal" id="vendors">
              <span className="tag">FOR VENDORS, MANUFACTURERS &amp; JOB SEEKERS</span>
              <h3>Register your trade. Start getting local leads</h3>
              <p className="desc">List your business, register as a manufacturer or supplier, post the services you offer or the roles you're hiring for — and reach customers actively searching nearby.</p>
              <ul className="side-list">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12.5 11 15l4.5-6" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  Free business, trade &amp; manufacturer registration
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12.5 11 15l4.5-6" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  Post job openings for your business
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12.5 11 15l4.5-6" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  Get discovered by nearby customers
                </li>
              </ul>
              <a href="#vendor-register" className="btn btn-primary">Register your business</a>
              <span className="side-badge-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.4">
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SERVICES */}
      <section className="pad section-alt" id="services">
        <div className="wrap">
          <div className="section-head reveal">
            <p className="eyebrow">Popular categories</p>
            <h2>Every local service, sorted by what you need</h2>
            <p>From daily home repairs to specialised trades — find verified professionals near you across every category.</p>
          </div>

          <div className="services-grid">
            <div className="service-card reveal">
              <div className="service-ico" style={{ background: "var(--teal)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a3 3 0 0 0-4.2 4.2L4 17l3 3 6.5-6.5a3 3 0 0 0 4.2-4.2l-2.3 2.3-2-2 2.3-2.3Z" />
                </svg>
              </div>
              <h4>Home Repair</h4><span>Verified professionals</span>
            </div>
            <div className="service-card reveal">
              <div className="service-ico" style={{ background: "var(--amber)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7 9 18l-5-5" />
                </svg>
              </div>
              <h4>Home Cleaning</h4><span>Verified professionals</span>
            </div>
            <div className="service-card reveal">
              <div className="service-ico" style={{ background: "var(--navy-soft)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8.5 10.5 15.5 5m-7 8 7 5.5" />
                </svg>
              </div>
              <h4>Salon &amp; Spa</h4><span>Verified professionals</span>
            </div>
            <div className="service-card reveal">
              <div className="service-ico" style={{ background: "var(--teal-dark)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                  <path d="M9 22V12h6v10" />
                </svg>
              </div>
              <h4>Tutoring</h4><span>Verified professionals</span>
            </div>
            <div className="service-card reveal">
              <div className="service-ico" style={{ background: "var(--amber-dark)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2 3 14h7l-1 8 11-13h-7l0-7Z" />
                </svg>
              </div>
              <h4>Electrician</h4><span>Verified professionals</span>
            </div>
            <div className="service-card reveal">
              <div className="service-ico" style={{ background: "var(--navy)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 4v4M11 4v4M4 8h12l2 3v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z" />
                  <circle cx="7" cy="18" r="1.6" />
                  <circle cx="14" cy="18" r="1.6" />
                </svg>
              </div>
              <h4>Plumbing</h4><span>Verified professionals</span>
            </div>
            <div className="service-card reveal">
              <div className="service-ico" style={{ background: "var(--teal)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
                  <circle cx="7.5" cy="18" r="1.6" />
                  <circle cx="17.5" cy="18" r="1.6" />
                </svg>
              </div>
              <h4>Moving &amp; Packing</h4><span>Verified professionals</span>
            </div>
            <div className="service-card reveal">
              <div className="service-ico" style={{ background: "var(--amber)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="2" />
                  <path d="M8 8h8M8 12h8M8 16h5" />
                </svg>
              </div>
              <h4>Appliance Repair</h4><span>Verified professionals</span>
            </div>
            <div className="service-card reveal">
              <div className="service-ico" style={{ background: "var(--navy-soft)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21V10l6 3.5V10l6 3.5V9l6 4v8H3Z" />
                  <path d="M7 21v-4M12 21v-4M17 21v-4" />
                </svg>
              </div>
              <h4>Manufacturing &amp; Wholesale</h4><span>Verified manufacturers</span>
            </div>
            <div className="service-card reveal">
              <div className="service-ico" style={{ background: "var(--teal-dark)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 8V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v2M3 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  <rect x="3" y="8" width="18" height="12" rx="1.5" />
                  <path d="M3 13h18" />
                </svg>
              </div>
              <h4>Packaging &amp; Printing</h4><span>Verified units</span>
            </div>
            <div className="service-card reveal">
              <div className="service-ico" style={{ background: "var(--amber-dark)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a3 3 0 0 0-4.2 4.2L4 17l3 3 6.5-6.5a3 3 0 0 0 4.2-4.2l-2.3 2.3-2-2 2.3-2.3Z" />
                  <circle cx="18" cy="6" r="2.4" />
                </svg>
              </div>
              <h4>Industrial Equipment</h4><span>Verified suppliers</span>
            </div>
            <div className="service-card reveal">
              <div className="service-ico" style={{ background: "var(--navy)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8.5 10.5 15.5 5m-7 8 7 5.5" />
                </svg>
              </div>
              <h4>Textile &amp; Garment Works</h4><span>Verified manufacturers</span>
            </div>
          </div>

          <div className="services-cta reveal">
            <a href="#download" className="btn btn-outline">View all 30+ categories</a>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="pad">
        <div className="wrap">
          <div className="section-head center reveal" style={{ marginLeft: "auto", marginRight: "auto" }}>
            <p className="eyebrow" style={{ justifyContent: "center" }}>Simple by design</p>
            <h2>Getting help nearby takes three steps</h2>
          </div>
          <div className="process-row reveal">
            <div className="process-step">
              <div className="process-num">01</div>
              <h4>Search nearby</h4>
              <p>Tell Meesent what you need and your area — we surface verified professionals close to you first.</p>
              <svg className="process-arrow" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14m0 0-5-5m5 5-5 5" />
              </svg>
            </div>
            <div className="process-step">
              <div className="process-num">02</div>
              <h4>Compare &amp; connect</h4>
              <p>Check ratings and pricing, then get their phone number and contact them directly — no middleman.</p>
              <svg className="process-arrow" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14m0 0-5-5m5 5-5 5" />
              </svg>
            </div>
            <div className="process-step">
              <div className="process-num">03</div>
              <h4>Get it done</h4>
              <p>Settle the details directly with the vendor and get your work done, then leave a review for your neighbourhood.</p>
            </div>
          </div>
        </div>
      </section>



      {/* 6. VENDOR REGISTRATION */}
      <section className="pad section-alt" id="vendor-register">
        <div className="wrap">
          <div className="section-head reveal">
            <p className="eyebrow">For vendors, manufacturers &amp; business owners</p>
            <h2>Register your business or manufacturing unit in four simple steps</h2>
          </div>

          <div className="vendor-section">
            <div className="vendor-steps reveal">
              <div className="vstep">
                <div className="vstep-num">01</div>
                <div><h4>Create your business profile</h4><p>Add your trade or manufacturing unit name, category, service area and working hours.</p></div>
              </div>
              <div className="vstep">
                <div className="vstep-num">02</div>
                <div><h4>Verify your KYC &amp; trade details</h4><p>Upload ID, trade licence or manufacturing registration for a verified badge customers trust.</p></div>
              </div>
              <div className="vstep">
                <div className="vstep-num">03</div>
                <div><h4>List services, products or post job openings</h4><p>Publish what you offer or manufacture, your pricing, or roles you're hiring for.</p></div>
              </div>
              <div className="vstep">
                <div className="vstep-num">04</div>
                <div><h4>Start getting local leads</h4><p>Appear in nearby search results and receive enquiries, orders or applicants.</p></div>
              </div>
              <div className="vendor-cta-row">
                <a href="#download" className="btn btn-primary">Start registration</a>
                <a href="#contact" className="btn btn-outline">Talk to our team</a>
              </div>
            </div>

            <div className="vendor-panel reveal">
              <div className="vp-card">
                <div className="vp-row">
                  <div className="vp-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2 3 14h7l-1 8 11-13h-7l0-7Z" />
                    </svg>
                  </div>
                  <div className="vp-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12.5 11 15l4.5-6" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                    Verified
                  </div>
                </div>
                <p className="vp-name">Sunrise Electricals</p>
                <p className="vp-role">Electrician · Kukatpally, Hyderabad</p>
                <div className="vp-stats">
                  <div><strong>142</strong><span>ENQUIRIES</span></div>
                  <div><strong>4.9</strong><span>RATING</span></div>
                  <div><strong>18</strong><span>THIS WEEK</span></div>
                </div>
                <div className="vp-bars">
                  <i style={{ height: "35%" }}></i>
                  <i style={{ height: "55%" }}></i>
                  <i style={{ height: "40%" }}></i>
                  <i style={{ height: "70%" }}></i>
                  <i style={{ height: "50%" }}></i>
                  <i style={{ height: "85%" }}></i>
                  <i style={{ height: "60%" }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. APP SHOWCASE */}
      <section className="pad" id="download">
        <div className="wrap">
          <div className="section-head center reveal" style={{ marginLeft: "auto", marginRight: "auto" }}>
            <p className="eyebrow" style={{ justifyContent: "center" }}>See it in action</p>
            <h2>A closer look at the Meesent app</h2>
            <p>Drop your three screenshots into the frames below — each one is ready-sized for a phone screen.</p>
          </div>

          <div className="showcase-strip reveal">
            <div className="showcase-item">
              <div className="showcase-frame">
                <div className="showcase-screen">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="m3 15 5-5 4 4 5-6 4 5" />
                  </svg>
                  <span>Paste Home Screen here</span>
                </div>
              </div>
              <h4>Home &amp; discovery</h4>
              <p>Search services or jobs by category and distance</p>
            </div>

            <div className="showcase-item">
              <div className="showcase-frame">
                <div className="showcase-screen">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="m3 15 5-5 4 4 5-6 4 5" />
                  </svg>
                  <span>Paste Enquiries / Jobs screen here</span>
                </div>
              </div>
              <h4>Enquiries &amp; applications</h4>
              <p>Track customer enquiries or job applications in one place</p>
            </div>

            <div className="showcase-item">
              <div className="showcase-frame">
                <div className="showcase-screen">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="m3 15 5-5 4 4 5-6 4 5" />
                  </svg>
                  <span>Paste Vendor Dashboard here</span>
                </div>
              </div>
              <h4>Vendor dashboard</h4>
              <p>Manage your business profile, leads and listings</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TESTIMONIALS */}
      <section className="pad section-alt">
        <div className="wrap">
          <div className="section-head reveal">
            <p className="eyebrow">What people are saying</p>
            <h2>Trusted by customers, vendors and job seekers alike</h2>
          </div>

          <div className="testi-grid">
            <div className="testi-card reveal">
              <div className="testi-stars">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} viewBox="0 0 24 24" fill="currentColor">
                    <path d="m12 2 2.9 6.3 6.8.7-5.1 4.6 1.5 6.7L12 16.9l-6.1 3.4 1.5-6.7-5.1-4.6 6.8-.7L12 2Z" />
                  </svg>
                ))}
              </div>
              <p className="quote">"Got an electrician's number in under a minute and he was at my door within the hour. No middleman, just called and done."</p>
              <div className="testi-who">
                <div className="testi-avatar" style={{ background: "linear-gradient(135deg,var(--teal),var(--teal-dark))" }}></div>
                <div><b>Priya Nair</b><span>Customer, Kukatpally</span></div>
              </div>
            </div>

            <div className="testi-card reveal">
              <div className="testi-stars">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} viewBox="0 0 24 24" fill="currentColor">
                    <path d="m12 2 2.9 6.3 6.8.7-5.1 4.6 1.5 6.7L12 16.9l-6.1 3.4 1.5-6.7-5.1-4.6 6.8-.7L12 2Z" />
                  </svg>
                ))}
              </div>
              <p className="quote">"Registered my salon in one evening and started getting calls and enquiries from my own neighbourhood within a week."</p>
              <div className="testi-who">
                <div className="testi-avatar" style={{ background: "linear-gradient(135deg,var(--amber),var(--amber-dark))" }}></div>
                <div><b>Ravi Kumar</b><span>Vendor, Salon Owner</span></div>
              </div>
            </div>

            <div className="testi-card reveal">
              <div className="testi-stars">
                {[1, 2, 3, 4].map((i) => (
                  <svg key={i} viewBox="0 0 24 24" fill="currentColor">
                    <path d="m12 2 2.9 6.3 6.8.7-5.1 4.6 1.5 6.7L12 16.9l-6.1 3.4 1.5-6.7-5.1-4.6 6.8-.7L12 2Z" />
                  </svg>
                ))}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="m12 2 2.9 6.3 6.8.7-5.1 4.6 1.5 6.7L12 16.9l-6.1 3.4 1.5-6.7-5.1-4.6 6.8-.7L12 2Z" />
                </svg>
              </div>
              <p className="quote">"Found a delivery job two kilometres from home the same day I applied. Everything happened right inside the app."</p>
              <div className="testi-who">
                <div className="testi-avatar" style={{ background: "linear-gradient(135deg,var(--navy-soft),var(--navy))" }}></div>
                <div><b>Sandeep Reddy</b><span>Job Seeker, Miyapur</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. CONTACT */}
      <section className="pad" id="contact">
        <div className="wrap">
          <div className="section-head reveal">
            <p className="eyebrow">Get in touch</p>
            <h2>Questions about Meesent? We're here to help</h2>
            <p>Whether you're a customer, a service vendor, or hiring locally — reach out and our team will get back to you.</p>
          </div>

          <div className="contact-wrap reveal">
            <div className="contact-info">
              <h3>Contact information</h3>
              <p className="sub">Reach the Meesent support team directly, or drop by our office during working hours.</p>
              <div className="contact-rows">
                <div className="contact-row">
                  <span className="ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 3a2 2 0 0 1-.4 2.1L8 10.3a16 16 0 0 0 6 6l1.5-1.4a2 2 0 0 1 2.1-.4c1 .3 2 .5 3 .7a2 2 0 0 1 1.7 2Z" />
                    </svg>
                  </span>
                  <div><b>+91 90000 12345</b><span>Mon–Sat, 9am – 8pm</span></div>
                </div>
                <div className="contact-row">
                  <span className="ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m2 7 10 6 10-6" />
                    </svg>
                  </span>
                  <div><b>support@meesent.app</b><span>We reply within 24 hours</span></div>
                </div>
                <div className="contact-row">
                  <span className="ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21c-4.2-3.6-7-7.1-7-10.6A7 7 0 0 1 12 3a7 7 0 0 1 7 7.4c0 3.5-2.8 7-7 10.6Z" />
                      <circle cx="12" cy="10.4" r="2.4" />
                    </svg>
                  </span>
                  <div><b>Meesent HQ</b><span>Kukatpally, Hyderabad, Telangana</span></div>
                </div>
              </div>
              <div className="contact-social">
                <a href="#" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.2" cy="6.8" r="1" />
                  </svg>
                </a>
                <a href="#" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <path d="M7 10v7M7 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 13v4" />
                  </svg>
                </a>
                <a href="#" aria-label="X">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="m4 4 16 16M20 4 4 20" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="contact-form">
              <form id="contactForm" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="fname">Full name</label>
                    <input id="fname" type="text" placeholder="Your name" value={fname} onChange={(e) => setFname(e.target.value)} required />
                  </div>
                  <div className="field">
                    <label htmlFor="fphone">Phone number</label>
                    <input id="fphone" type="tel" placeholder="+91 00000 00000" value={fphone} onChange={(e) => setFphone(e.target.value)} required />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="femail">Email address</label>
                  <input id="femail" type="email" placeholder="you@example.com" value={femail} onChange={(e) => setFemail(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="ftype">I am a</label>
                  <select id="ftype" value={ftype} onChange={(e) => setFtype(e.target.value)}>
                    <option>Customer looking for a service</option>
                    <option>Job seeker</option>
                    <option>Vendor / business owner</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="fmsg">Message</label>
                  <textarea id="fmsg" placeholder="Tell us how we can help" value={fmsg} onChange={(e) => setFmsg(e.target.value)} required></textarea>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Send message</button>
                <div className={`form-success ${isSubmitted ? "show" : ""}`} id="formSuccess">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12.5 11 15l4.5-6" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  Thanks — our team will reach out shortly.
                </div>
                <p className="form-note">By submitting, you agree to Meesent's Terms &amp; Privacy Policy.</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA & FOOTER */}
      <section className="pad" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="footer-cta reveal">
            <div>
              <p className="eyebrow on-dark">Download Meesent</p>
              <h2>Local help and local jobs — right in your pocket</h2>
              <p>Get it on Google Play today. Coming soon on the App Store.</p>
            </div>
            <div className="store-row">
              <a href="https://play.google.com/store/apps/details?id=com.messent.app&hl=en_IN" className="store-badge" aria-label="Get it on Google Play" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.6 2.4c-.4.4-.6.9-.6 1.5v16.2c0 .6.2 1.1.6 1.5l.1.1L13 12.4v-.2L3.7 2.3l-.1.1Z" />
                  <path d="m16 9.4-3-1.7L4.4 2.9 15.1 9.9 16 9.4Z" />
                  <path d="M16 14.6l-.9-.5-10.7 6.9 8.6-4.6 3-1.8Z" />
                  <path d="m17.9 11.3-2.3 1.3-2.3 1.4 2.3 1.4 2.3 1.3 4-2.3a1.4 1.4 0 0 0 0-2.4l-4-1.7Z" />
                </svg>
                <span className="txt"><small>GET IT ON</small><strong>Google Play</strong></span>
              </a>
              <span className="store-badge disabled" aria-disabled="true" style={{ background: "rgba(255,255,255,.06)", borderColor: "var(--line-dark)", color: "#fff" }}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.5 12.6c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.9-.8-1.5 0-2.9.9-3.6 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.2-2.6-.1 0-2.6-1-2.6-3.9Z" />
                  <path d="M15.2 5.8c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.7-1 2.8 1 .1 2.1-.6 2.8-1.3Z" />
                </svg>
                <span className="txt"><small>COMING SOON ON THE</small><strong>App Store</strong></span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#top" className="logo">
                <img src={logoImg} alt="Meesent Logo" style={{ width: '34px', height: '34px', objectFit: 'contain', borderRadius: '8px' }} />
                Meesent
              </a>
              <p>Local needs &amp; jobs, in one app. Verified local services and nearby job listings, built for your neighbourhood.</p>
            </div>
            <div className="footer-col">
              <h5>Customers</h5>
              <ul>
                <li><a href="#services">Browse services</a></li>
                <li><a href="#jobs">Browse jobs</a></li>
                <li><a href="#how">How it works</a></li>
                <li><a href="#contact">Support</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Vendors &amp; Manufacturers</h5>
              <ul>
                <li><a href="#vendor-register">Register business</a></li>
                <li><a href="#vendor-register">Register as manufacturer</a></li>
                <li><a href="#vendor-register">Post a job</a></li>
                <li><a href="#">Vendor dashboard</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <ul>
                <li><a href="#">About Meesent</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#contact">Contact us</a></li>
                <li><a href="#">Press</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Meesent Technologies Pvt. Ltd. All rights reserved.</span>
            <div className="footer-legal">
              <Link to="/privacy-policy">Privacy Policy</Link>
              <Link to="/terms-conditions">Terms of Service</Link>
              <Link to="/deleteaccount">Refund Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
