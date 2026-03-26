/**
 * ScrollToTop — Ensures the page scrolls to the top whenever the route changes.
 * Without this, navigating between routes (e.g. landing page to teacher detail)
 * would preserve the previous scroll position, which feels broken to users.
 * Renders nothing — purely a side-effect component.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  // Scroll to top each time the URL path changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // This component has no visual output
  return null;
}

