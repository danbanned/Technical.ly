import { useEffect } from 'react';
import { useMapStore } from '../../store/useMapStore';
import { useHoverImmerse } from '../../hooks/useHoverImmerse';

/**
 * ArticleCard
 *
 * One entry in the editorial feed. On mount it registers itself with
 * the store so the IntersectionObserver picks it up. Hovering for
 * 1.5s, clicking the card, or tapping "Explore on Map" promotes the
 * page into Immersive mode at this article's city.
 */
export default function ArticleCard({ article, immersionAPI }) {
  const registerArticle = useMapStore((s) => s.registerArticle);
  const activeArticleId = useMapStore((s) => s.activeArticleId);
  const isActive = activeArticleId === article.id;

  useEffect(() => {
    registerArticle({
      id: article.id,
      city: article.city,
      lat: article.lat,
      lon: article.lon,
      layers: article.layers,
    });
  }, [article, registerArticle]);

  const cityData = {
    name: article.city,
    lat: article.lat,
    lon: article.lon,
    articleId: article.id,
  };

  const handlers = useHoverImmerse(cityData, immersionAPI);

  return (
    <article
      className={`article-card${isActive ? ' is-active' : ''}`}
      data-article-id={article.id}
      data-city={article.city}
      data-layers={(article.layers || []).join(',')}
      data-active={isActive ? 'true' : 'false'}
      {...handlers}
    >
      <div
        className="article-thumb"
        style={{ background: article.image }}
        aria-hidden="true"
      >
        <span className="article-pin">📍 {article.city}</span>
      </div>

      <div className="article-body">
        <div className="article-meta">
          <span className="article-kicker">{article.category}</span>
          <span className="article-sep">·</span>
          <span className="article-readtime">{article.readTime}</span>
        </div>

        <h2 className="article-title">{article.title}</h2>
        <p className="article-dek">{article.dek}</p>

        <footer className="article-foot">
          <span className="article-byline">By {article.author}</span>
          <span className="article-date">{article.date}</span>
        </footer>

        <button
          type="button"
          className="article-explore"
          onClick={(e) => {
            e.stopPropagation();
            handlers.onClick(e);
          }}
        >
          📍 Explore on Map
        </button>
      </div>
    </article>
  );
}
