import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import fontUrl from "./assets/geist-latin.woff2";

/** Bundle the brand font and wait for it: no remote fonts or platform fallback frames. */
export function useFilmFont() {
  const [handle] = useState(() =>
    delayRender("Loading the bundled COMRDY film font"),
  );
  useEffect(() => {
    const font = new FontFace("COMRDY Film", `url(${fontUrl})`, {
      weight: "100 900",
    });
    font
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        continueRender(handle);
      })
      .catch(cancelRender);
  }, [handle]);
}
