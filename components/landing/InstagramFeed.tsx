"use client";
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface InstagramPost {
  id: string;
  imageUrl: string;
  permalink: string;
  caption: string;
}

export function InstagramFeed() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/instagram/posts');
        const json = await res.json();
        if (!active) return;
        setPosts(Array.isArray(json?.posts) ? json.posts : []);
      } catch {
        // Si falla, simplemente no se muestra la sección — no rompe la home.
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loaded && posts.length === 0) return null;

  return (
    <section className="bleed tile tile-light" aria-labelledby="instagram-title">
      <div className="tile-inner">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-8 md:mb-10" data-reveal="">
          <h2 id="instagram-title" className="t-section">
            @tkicks.sj. <span className="t-muted">Lo que pasa en el showroom.</span>
          </h2>
          <a
            href="https://www.instagram.com/tkicks.sj"
            target="_blank"
            rel="noopener noreferrer"
            className="link-apple t-body"
          >
            Seguir en Instagram
          </a>
        </div>

        {!loaded ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-parchment animate-pulse rounded-sm" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {posts.slice(0, 8).map((post) => (
              <a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                data-reveal=""
                className="group relative block aspect-square overflow-hidden rounded-sm bg-parchment"
              >
                <Image
                  src={post.imageUrl}
                  alt={post.caption || 'Post de @tkicks.sj'}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition-transform duration-[1200ms] ease-apple group-hover:scale-[1.04]"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
