import { useState, useEffect } from 'react';

let cachedStatus = null;
let statusPromise = null;

export default function useTinyFishStatus() {
  const [status, setStatus] = useState(
    cachedStatus || {
      enabled: false,
      available: false,
      features: { news: false, ngoCheck: false, partners: false, chat: false },
      loading: !cachedStatus
    }
  );

  useEffect(() => {
    if (cachedStatus) {
      setStatus({ ...cachedStatus, loading: false });
      return;
    }

    if (!statusPromise) {
      statusPromise = fetch('/api/tinyfish/status')
        .then(res => {
          if (!res.ok) throw new Error('Status fetch failed');
          return res.json();
        })
        .then(data => {
          cachedStatus = {
            enabled: Boolean(data?.enabled),
            available: Boolean(data?.available),
            features: data?.features || { news: false, ngoCheck: false, partners: false, chat: false }
          };
          return cachedStatus;
        })
        .catch(() => {
          cachedStatus = {
            enabled: false,
            available: false,
            features: { news: false, ngoCheck: false, partners: false, chat: false }
          };
          return cachedStatus;
        });
    }

    statusPromise.then(res => {
      setStatus({ ...res, loading: false });
    });
  }, []);

  return status;
}
