import React, { useState, useEffect } from 'react';
import TinyFishErrorBoundary from './TinyFishErrorBoundary';
import TinyFishBadge from './TinyFishBadge';
import useTinyFishStatus from './useTinyFishStatus';
import './tinyfish.css';

function LiveNewsTickerInner() {
  const { available, loading: statusLoading } = useTinyFishStatus();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (statusLoading) return;
    if (!available) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetch('/api/tinyfish/news')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.available && Array.isArray(data.items)) {
          setNews(data.items);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [available, statusLoading]);

  if (!statusLoading && !available) {
    return null;
  }

  if (loading) {
    return (
      <section className="tf-news-section">
        <div className="container">
          <div className="tf-news-header">
            <h3>Live Food-Waste Headlines</h3>
            <TinyFishBadge />
          </div>
          <div className="tf-news-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="tf-news-card">
                <div className="tf-skeleton" style={{ width: '40%' }}></div>
                <div className="tf-skeleton" style={{ width: '90%', height: '18px' }}></div>
                <div className="tf-skeleton" style={{ width: '100%' }}></div>
                <div className="tf-skeleton" style={{ width: '30%' }}></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (news.length === 0) {
    return null;
  }

  return (
    <section className="tf-news-section">
      <div className="container">
        <div className="tf-news-header">
          <h3>Live Food-Waste Headlines</h3>
          <TinyFishBadge />
        </div>
        <div className="tf-news-grid">
          {news.map((item, idx) => (
            <div key={idx} className="tf-news-card">
              <div>
                <div className="tf-news-meta">
                  <span>{item.publisher || item.site_name || 'India News'}</span>
                  {item.date && <span>{String(item.date).slice(0, 10)}</span>}
                </div>
                <h4 className="tf-news-title">{item.title}</h4>
                <p className="tf-news-snippet">{item.snippet}</p>
              </div>
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="tf-news-link"
              >
                Read coverage ↗
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LiveNewsTicker() {
  return (
    <TinyFishErrorBoundary>
      <LiveNewsTickerInner />
    </TinyFishErrorBoundary>
  );
}
