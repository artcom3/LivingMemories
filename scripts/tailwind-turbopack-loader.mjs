// Wraps @tailwindcss/turbopack so edits to a Tailwind entry CSS (globals.css)
// always reach the dev server.
//
// The Tailwind loader caches one compiler per `this.resource` and only rebuilds
// it when the file's mtime changes. After an edit, Turbopack sometimes runs the
// loader first with the previous source and then with the new one: the first
// run rebuilds the compiler from stale CSS and records the new mtime, so the
// second run reuses it and the old styles are served (and persisted in
// .next/dev, which is why restarting `next dev` did not help).
//
// Adding a hash of the source to `resource` gives each version of the CSS its
// own cache entry, built from that exact source. Scans of class names in other
// files stay incremental while the CSS itself is unchanged.
import { createHash } from "node:crypto";
import tailwind from "@tailwindcss/turbopack";

const load = tailwind.default ?? tailwind;

export default function tailwindTurbopackLoader(source) {
  const hash = createHash("sha1").update(source).digest("hex").slice(0, 12);
  const resource = `${this.resource}?css=${hash}`;
  const context = new Proxy(this, {
    get: (target, key) => (key === "resource" ? resource : Reflect.get(target, key)),
  });
  return load.call(context, source);
}
