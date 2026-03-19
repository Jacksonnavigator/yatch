import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useYacht } from '../context/YachtContext';

export default function YachtPage() {
  const { yacht: globalYacht, extras: globalExtras, loading } = useYacht();
  const [yacht, setYacht] = useState(null);
  const [extras, setExtras] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    setYacht(globalYacht);
    setExtras(globalExtras);
  }, [globalYacht, globalExtras]);

  return (
    <>
      <style>{`
        .yp-hero {
          position: relative; height: 60vh; min-height: 420px;
          display: flex; align-items: flex-end; overflow: hidden;
          background: linear-gradient(160deg, #0d1829, #060b16);
        }
        .yp-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(6,11,22,1) 0%, rgba(6,11,22,0.3) 60%, transparent 100%);
          z-index: 1;
        }
        .yp-hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
        .yp-hero-placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 120px; opacity: .06; }
        .yp-hero-content { position: relative; z-index: 2; padding: 48px; }
        .yp-hero-content h1 { font-family:'Cormorant Garamond',serif; font-size: clamp(40px,6vw,72px); font-weight: 300; }
        .yp-hero-content h1 em { font-style: italic; color: var(--gold2); }
        .yp-hero-sub { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); margin-top: 8px; }

        .yp-specs { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px,1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); margin: 48px 0; }
        .yp-spec { background: var(--deep); padding: 24px 20px; text-align: center; }
        .yp-spec-val { font-family:'Cormorant Garamond',serif; font-size: 28px; color: var(--gold2); }
        .yp-spec-lbl { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-top: 4px; }

        .yp-section { margin-bottom: 64px; }
        .yp-section-label { font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: var(--gold); margin-bottom: 12px; }
        .yp-section h2 { font-family:'Cormorant Garamond',serif; font-size: 36px; font-weight: 300; margin-bottom: 24px; }
        .yp-section h2 em { font-style: italic; color: var(--gold2); }
        .yp-section p { color: var(--muted); font-size: 14px; line-height: 1.8; }

        .amenities-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px,1fr)); gap: 12px; }
        .amenity-card { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border: 1px solid var(--border); background: var(--glass); font-size: 13px; }
        .amenity-card::before { content:'—'; color: var(--gold); font-size: 10px; }

        .extras-display { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap: 16px; }
        .extra-display-card { border: 1px solid var(--border); padding: 24px; background: var(--glass); }
        .extra-icon { font-size: 28px; margin-bottom: 12px; }
        .extra-name { font-size: 14px; margin-bottom: 4px; }
        .extra-desc { font-size: 12px; color: var(--muted); line-height: 1.6; }
        .extra-price { font-family:'Cormorant Garamond',serif; font-size: 22px; color: var(--gold2); margin-top: 12px; }

        .gallery-masonry { columns: 3; gap: 12px; margin-top: 24px; }
        @media(max-width:640px) { .gallery-masonry { columns: 2; } }
        .gal-img-wrap { break-inside: avoid; margin-bottom: 12px; border: 1px solid var(--border); overflow: hidden; cursor: pointer; position: relative; }
        .gal-img-wrap img { width: 100%; display: block; transition: transform .4s; }
        .gal-img-wrap:hover img { transform: scale(1.04); }

        .lightbox { position: fixed; inset: 0; z-index: 1000; background: rgba(6,11,22,0.95); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .lightbox img { max-width: 90vw; max-height: 90vh; object-fit: contain; border: 1px solid var(--border); }
        .lightbox-close { position: absolute; top: 24px; right: 32px; font-size: 28px; color: var(--muted); background: none; border: none; cursor: pointer; }

        .cta-strip { background: linear-gradient(135deg, rgba(201,168,76,.08), transparent); border: 1px solid var(--border); padding: 48px; text-align: center; }
        .cta-strip h2 { font-family:'Cormorant Garamond',serif; font-size: 36px; font-weight: 300; margin-bottom: 12px; }
        .cta-strip h2 em { font-style: italic; color: var(--gold2); }
        .cta-strip p { color: var(--muted); font-size: 12px; letter-spacing: 2px; margin-bottom: 32px; }
        @media(max-width:640px) { .yp-hero-content { padding: 24px 20px; } }
      `}</style>

      {/* Hero */}
      <section className="yp-hero">
        {loading ? (
          <div className="yp-hero-placeholder">…</div>
        ) : yacht?.images?.[0] ? (
          <img className="yp-hero-img" src={yacht.images[0]} alt="Rock The Yatch" />
        ) : (
          <div className="yp-hero-placeholder">🛥️</div>
        )}
        <div className="yp-hero-overlay" />
        <div className="yp-hero-content">
          <h1>
            {loading ? 'Loading Yacht…' : (yacht?.name || 'Rock The Yatch')}
            {!loading && !yacht?.name && <em>Rock The Yatch</em>}
          </h1>
          <p className="yp-hero-sub">
            {loading
              ? 'Loading details…'
              : `${yacht?.model || 'Sunseeker Predator 58'} · ${yacht?.location || 'Mediterranean & Caribbean'}`}
          </p>
        </div>
      </section>

      <div className="page-wrap" style={{ paddingTop: 40 }}>

        {/* Specs */}
        <div className="yp-specs">
          {[
            { val: loading ? '—' : `${yacht?.length_ft || 58}ft`, lbl: 'Length' },
            { val: loading ? '—' : (yacht?.max_guests || 12), lbl: 'Max Guests' },
            { val: '4', lbl: 'Charter Types' },
            { val: loading ? '—' : (yacht?.pricing ? `$${yacht.pricing.hourly}/hr` : '$450/hr'), lbl: 'From' },
          ].map(s => (
            <div key={s.lbl} className="yp-spec">
              <div className="yp-spec-val">{s.val}</div>
              <div className="yp-spec-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="yp-section">
          <div className="yp-section-label">About</div>
          <h2>Built for <em>extraordinary</em> moments</h2>
          <p>{yacht?.description || 'Rock The Yatch is a stunning 58ft Sunseeker Predator offering the ultimate private charter experience. With sleek lines, a powerful twin-engine setup, and a luxuriously appointed interior, she is perfect for day trips, sunset cruises, and extended voyages across the Mediterranean and Caribbean.'}</p>
        </div>

        {/* Amenities */}
        {yacht?.amenities?.length > 0 && (
          <div className="yp-section">
            <div className="yp-section-label">On Board</div>
            <h2>Every <em>comfort</em> included</h2>
            <div className="amenities-grid">
              {yacht.amenities.map(a => (
                <div key={a} className="amenity-card">{a}</div>
              ))}
            </div>
          </div>
        )}

        {/* Extras / Add-ons */}
        {extras.length > 0 && (
          <div className="yp-section">
            <div className="yp-section-label">Enhancements</div>
            <h2>Premium <em>add-ons</em></h2>
            <div className="extras-display">
              {extras.map(e => (
                <div key={e.key} className="extra-display-card">
                  <div className="extra-icon">{e.icon}</div>
                  <div className="extra-name">{e.name}</div>
                  <div className="extra-desc">{e.description}</div>
                  <div className="extra-price">+${e.price?.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        {yacht?.images?.length > 0 && (
          <div className="yp-section">
            <div className="yp-section-label">Gallery</div>
            <h2>Life on <em>the water</em></h2>
            <div className="gallery-masonry">
              {yacht.images.map((img, i) => (
                <div key={i} className="gal-img-wrap" onClick={() => setLightbox(img)}>
                  <img src={img} alt={`Rock The Yatch ${i + 1}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="cta-strip">
          <h2>Ready to set <em>sail?</em></h2>
          <p>All charters confirmed personally by the owner · Payment arranged directly</p>
          <Link to="/book"><button className="btn-gold">Reserve Your Charter</button></Link>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close">✕</button>
          <img src={lightbox} alt="Gallery" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
