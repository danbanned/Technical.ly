import { useRef } from 'react';
import ArticleCard from './ArticleCard';
import { ARTICLES } from '../../data/articles';
import { useArticleObserver } from '../../hooks/useArticleObserver';

/**
 * ArticleFeed — the scrollable middle column of the Technical.ly layout.
 * Hosts the IntersectionObserver so it drives Reactive transitions
 * based on which card is most visible.
 */
export default function ArticleFeed({ immersionAPI }) {
  const feedRef = useRef(null);
  useArticleObserver(feedRef, immersionAPI);

  return (
    <main className="article-feed" ref={feedRef} aria-label="Editorial feed">
      <section className="feed-header">
        <p className="feed-tagline">The Living Map</p>
        <h1 className="feed-headline">
          Where ideas, money, and opportunity actually meet.
        </h1>
        <p className="feed-sub">
          Scroll any story — the globe behind this page follows along.
          Hover a card to step inside the city it describes.
        </p>
      </section>

      <div className="feed-list">
        {ARTICLES.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            immersionAPI={immersionAPI}
          />
        ))}
      </div>

      <footer className="feed-footer">
        <p>End of feed · More stories coming Tuesday.</p>
      </footer>
    </main>
  );
}
