import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useYacht } from '../context/YachtContext';

export default function Home() {
  const { yacht, loading } = useYacht();

  return (
    <>
      <style>{`
        .hero { position: relative; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
        .hero-bg { position: absolute; inset: 0; z-index: 0; background: linear-gradient(155deg,#0d1829 0%,#060b16 55%,#0a1520 100%); }
        .hero-bg::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 80% 50% at 50% 65%, rgba(201,168,76,0.09) 0%, transparent 68%); }
        .hero-bg::after { content:''; position:absolute; bottom:0; left:0; width:100%; height:250px; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 250'%3E%3Cpath fill='%23060b16' d='M0,160L60,149C120,139,240,117,360,122C480,128,600,160,720,165C840,171,960,149,1080,128C1200,107,1320,85,1380,74L1440,64L1440,250L0,250Z'/%3E%3C/svg%3E") no-repeat bottom; background-size:cover; }
        .hero-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; opacity: 0.4; }
        .hero-overlay { position: absolute; inset: 0; z-index: 1; background: linear-gradient(to bottom, rgba(6,11,22,0.3), rgba(6,11,22,0.7)); }
        .hero-content { position: relative; z-index: 2; text-align: center; padding: 0 24px; animation: fadeUp .9s ease both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        .hero-eyebrow { font-size: 10px; letter-spacing: 5px; text-transform: uppercase; color: var(--gold); margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 16px; }
        .hero-eyebrow::before, .hero-eyebrow::after { content:''; flex:1; max-width:60px; height:1px; background:var(--gold); opacity:.5; }
        .hero-title { font-family:'Cormorant Garamond',serif; font-size: clamp(56px,9vw,110px); font-weight: 300; line-height: .95; color: var(--cream); }
        .hero-title em { font-style: italic; color: var(--gold2); display: block; }
        .hero-sub { font-size: 12px; letter-spacing: 3px; color: var(--muted); margin: 28px 0 52px; text-transform: uppercase; }
        .hero-btns { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .hero-stats { position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 2; display: flex; gap: 60px; }
        .h-stat { text-align: center; }
        .h-stat-val { font-family:'Cormorant Garamond',serif; font-size: 28px; color: var(--gold2); }
        .h-stat-lbl { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); margin-top: 4px; }
        @media(max-width:600px) { .hero-stats { gap: 30px; bottom: 60px; } }

        /* Gallery */
        .gallery-section { padding: 80px 40px; max-width: 1200px; margin: 0 auto; }
        .gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 40px; }
        @media(max-width:640px) { .gallery-grid { grid-template-columns: 1fr 1fr; } }
        .gallery-item { aspect-ratio: 4/3; overflow: hidden; border: 1px solid var(--border); cursor: pointer; position: relative; }
        .gallery-item img, .gallery-item video { width: 100%; height: 100%; object-fit: cover; transition: transform .4s; }
        .gallery-item:hover img, .gallery-item:hover video { transform: scale(1.05); }
        .gallery-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); opacity: 0; transition: opacity .3s; }
        .gallery-item:hover .gallery-play { opacity: 1; }
        .gallery-play-icon { font-size: 48px; }
        .gallery-empty { background: var(--glass); display: flex; align-items: center; justify-content: center; font-size: 11px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; }

        .about { padding: 100px 40px; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
        @media(max-width:768px) { .about { grid-template-columns: 1fr; padding: 60px 20px; gap: 40px; } }
        .about-label { font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: var(--gold); margin-bottom: 16px; }
        .about-title { font-family:'Cormorant Garamond',serif; font-size: clamp(32px,4vw,48px); font-weight: 300; line-height: 1.2; }
        .about-title em { font-style: italic; color: var(--gold2); }
        .about-body { color: var(--muted); font-size: 14px; line-height: 1.8; margin-top: 20px; }
        .about-img { position: relative; background: var(--glass); border: 1px solid var(--border); aspect-ratio: 4/3; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .about-img img { width:100%; height:100%; object-fit:cover; }
        .about-img-placeholder { font-size: 80px; opacity: .2; }

        /* Amenities */
        .amenities { background: var(--panel); padding: 80px 40px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .amenities-inner { max-width: 1200px; margin: 0 auto; }
        .amenities-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; margin-top: 40px; }
        .amenity-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--muted); }
        .amenity-dot { width: 4px; height: 4px; background: var(--gold); border-radius: 50%; flex-shrink: 0; }

        /* CTA */
        .cta { text-align: center; padding: 100px 40px; background: linear-gradient(to bottom, var(--deep), #0d1829); }
        .cta h2 { font-family:'Cormorant Garamond',serif; font-size: clamp(36px,5vw,60px); font-weight: 300; margin-bottom: 16px; }
        .cta h2 em { font-style: italic; color: var(--gold2); }
        .cta p { color: var(--muted); font-size: 13px; letter-spacing: 2px; margin-bottom: 40px; }

        /* Pricing preview */
        .pricing-strip { padding: 80px 40px; max-width: 900px; margin: 0 auto; }
        .pricing-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 40px; }
        .pricing-card { border: 1px solid var(--border); padding: 28px 24px; background: var(--glass); text-align: center; transition: all .25s; }
        .pricing-card:hover { border-color: var(--gold); transform: translateY(-4px); }
        .pc-type { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
        .pc-price { font-family:'Cormorant Garamond',serif; font-size: 36px; color: var(--gold2); }
        .pc-unit { font-size: 11px; color: var(--muted); margin-top: 4px; }
      `}</style>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        {!loading && (
          <>
            {yacht?.featured_video && <video className="hero-video" src={yacht.featured_video} autoPlay muted loop />}
            {yacht?.featured_image && !yacht.featured_video && <div className="hero-video" style={{background:`url(${yacht.featured_image}) center/cover`}} />}
            {!yacht?.featured_video && !yacht?.featured_image && yacht?.images?.[0] && <div className="hero-video" style={{background:`url(${yacht.images[0]}) center/cover`}} />}
          </>
        )}
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-eyebrow">Exclusive Private Charter</div>
          <h1 className="hero-title">
            {loading ? (
              <>
                <span style={{ opacity: 0.4 }}>Loading</span>
                <em>Yacht…</em>
              </>
            ) : (
              <>
                Rock
                <em>The Yatch</em>
              </>
            )}
          </h1>
          <p className="hero-sub">
            {loading
              ? 'Loading yacht details…'
              : `${yacht?.model || '58ft Sunseeker Predator'} · ${yacht?.location || 'Mediterranean & Caribbean'}`}
          </p>
          <div className="hero-btns">
            <Link to="/book"><button className="btn-gold">Book a Charter</button></Link>
            <a href="#about"><button className="btn-outline">Discover</button></a>
          </div>
        </div>
        <div className="hero-stats">
          <div className="h-stat">
            <div className="h-stat-val">{loading ? '—' : `${yacht?.length_ft || 58}ft`}</div>
            <div className="h-stat-lbl">Length</div>
          </div>
          <div className="h-stat">
            <div className="h-stat-val">{loading ? '—' : (yacht?.max_guests || 12)}</div>
            <div className="h-stat-lbl">Guests</div>
          </div>
          <div className="h-stat"><div className="h-stat-val">4</div><div className="h-stat-lbl">Charter Types</div></div>
        </div>
      </section>

      {/* About */}
      <section className="about" id="about">
        <div>
          <div className="about-label">The Yacht</div>
          <h2 className="about-title">A vessel built for <em>extraordinary moments</em></h2>
          <p className="about-body">
            {loading
              ? 'Loading yacht description…'
              : (yacht?.description || 'Rock The Yatch is a stunning 58ft Sunseeker Predator offering the ultimate private charter experience. With sleek lines, powerful twin engines, and a luxuriously appointed interior, she is perfect for day trips, sunset cruises, and extended voyages.')}
          </p>
          <Link to="/book"><button className="btn-gold mt-32">Reserve Your Date</button></Link>
        </div>
        <div className="about-img">
          {loading ? (
            <div className="about-img-placeholder" style={{ fontSize: 40 }}>Loading…</div>
          ) : yacht?.images?.[0] ? (
            <img src={yacht.images[0]} alt="Rock The Yatch" />
          ) : (
            <span className="about-img-placeholder">🛥️</span>
          )}
        </div>
      </section>

      {/* Amenities */}
      {yacht?.amenities?.length > 0 && (
        <section className="amenities">
          <div className="amenities-inner">
            <div className="about-label">On Board</div>
            <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize: 32, fontWeight: 300 }}>Every <em style={{ fontStyle:'italic', color:'var(--gold2)' }}>comfort</em> included</h2>
            <div className="amenities-grid">
              {yacht.amenities.map(a => (
                <div key={a} className="amenity-item"><div className="amenity-dot"/>{a}</div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing preview */}
      <section className="pricing-strip">
        <div className="about-label">Rates</div>
        <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize: 36, fontWeight: 300 }}>Transparent <em style={{ fontStyle:'italic', color:'var(--gold2)' }}>pricing</em></h2>
        <div className="pricing-cards">
          {[
            { label: 'Hourly', price: yacht?.pricing?.hourly || 450, unit: 'per hour' },
            { label: 'Half Day', price: yacht?.pricing?.half_day || 1800, unit: '4 hours' },
            { label: 'Full Day', price: yacht?.pricing?.full_day || 3200, unit: '8 hours' },
            { label: 'Multi Day', price: yacht?.pricing?.daily_multi || 2800, unit: 'per day' },
          ].map(p => (
            <div key={p.label} className="pricing-card">
              <div className="pc-type">{p.label}</div>
              <div className="pc-price">
                {loading ? '—' : `$${p.price?.toLocaleString()}`}
              </div>
              <div className="pc-unit">{p.unit}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      {(yacht?.images?.length > 0 || yacht?.videos?.length > 0) && (
        <section className="gallery-section">
          <div className="about-label">Gallery</div>
          <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize: 36, fontWeight: 300 }}>Life on <em style={{ fontStyle:'italic', color:'var(--gold2)' }}>the water</em></h2>
          <div className="gallery-grid">
            {/* Images - exclude featured */}
            {yacht?.images?.filter(img => img !== yacht.featured_image).map((img, i) => (
              <div key={`img-${i}`} className="gallery-item">
                <img src={img} alt={`Rock The Yatch Image ${i + 1}`} />
              </div>
            ))}
            {/* Videos - exclude featured */}
            {yacht?.videos?.filter(vid => vid !== yacht.featured_video).map((vid, i) => (
              <div key={`vid-${i}`} className="gallery-item">
                <video src={vid} preload="metadata" />
                <div className="gallery-play">
                  <div className="gallery-play-icon">▶️</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="cta">
        <h2>Ready to set <em>sail?</em></h2>
        <p>Contact is arranged after your booking request — no payment taken online</p>
        <Link to="/book"><button className="btn-gold">Book Your Charter Now</button></Link>
      </section>
    </>
  );
}
