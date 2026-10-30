import { useEffect, useState } from 'react';
import GradientASCII from './GradientASCII.jsx';

const DARK_COLORS = ['#d88d1e', '#ffd9b2', '#ffdea5', '#f8b238'];
// pale colors vanish on a white page, so light mode uses stronger oranges
const LIGHT_COLORS = ['#ea580c', '#fdba74', '#fb923c', '#f97316'];

const isDark = () => document.documentElement.classList.contains('dark');

// GradientASCII that follows the site theme (the `dark` class on <html>).
const HeroASCII = props => {
  const [dark, setDark] = useState(() => typeof document === 'undefined' || isDark());

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setDark(isDark());
    return () => observer.disconnect();
  }, []);

  return <GradientASCII {...props} colors={dark ? DARK_COLORS : LIGHT_COLORS} lightMode={!dark} />;
};

export default HeroASCII;
