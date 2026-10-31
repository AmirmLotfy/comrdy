"use client";

import { useEffect } from "react";

/** Content is always visible. Motion is an enhancement, never a loading gate. */
export function ScrollReveal() {
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !("IntersectionObserver" in window)) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (!preference.matches) {
            animations.push(
              entry.target.animate(
                [
                  { transform: "translateY(12px)", opacity: 0.65 },
                  { transform: "translateY(0)", opacity: 1 },
                ],
                { duration: 360, easing: "cubic-bezier(0.2, 0, 0, 1)" },
              ),
            );
          }
        }
      },
      { threshold: 0.12 },
    );
    document
      .querySelectorAll("[data-reveal]")
      .forEach((element) => observer.observe(element));
    const stop = () => {
      if (preference.matches)
        animations.forEach((animation) => animation.cancel());
    };
    preference.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", stop);
    };
  }, []);
  return null;
}
