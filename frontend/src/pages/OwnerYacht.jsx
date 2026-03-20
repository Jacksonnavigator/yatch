import { useEffect, useState, useRef } from 'react';
import { useYacht } from '../context/YachtContext';
import { yachtApi } from '../api/client';
import toast from 'react-hot-toast';

export default function OwnerYacht() {
  const { yacht: globalYacht, extras: globalExtras, refreshYacht } = useYacht();
  const [tab, setTab] = useState('details');
  const [yacht, setYacht] = useState(null);
  const [pricing, setPricing] = useState({ full_day: 3200, half_day: 1800, hourly: 450, daily_multi: 2800 });
  const [extras, setExtras] = useState([]);
  const [editYacht, setEditYacht] = useState({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newExtra, setNewExtra] = useState({ key:'', name:'', description:'', price:'', icon:'⭐' });
  const [editingExtra, setEditingExtra] = useState(null);
  const fileRef = useRef();
  const videoRef = useRef();
  const MAX_IMAGE_MB = 10;
  const MAX_VIDEO_MB = 100;
  const MAX_VIDEO_DURATION_SECONDS = 120;
  const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

  const getVideoDurationSeconds = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      const d = v.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(d)) reject(new Error('Invalid duration'));
      else resolve(d);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to read video metadata'));
    };
    v.src = url;
  });

  // Sync local state with global context
  useEffect(() => {
    if (globalYacht) {
      console.log('🔄 Syncing yacht data - Images:', globalYacht.images, 'Videos:', globalYacht.videos);
      setYacht(globalYacht);
      setEditYacht(globalYacht);
      if (globalYacht.pricing) setPricing(globalYacht.pricing);
    }
    if (globalExtras) {
      setExtras(globalExtras);
    }
  }, [globalYacht, globalExtras]);

  const uploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type && !ALLOWED_VIDEO_TYPES.has(file.type)) {
      toast.error('Only MP4, WebM, or MOV videos allowed');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`Video too large (max ${MAX_VIDEO_MB}MB)`);
      e.target.value = '';
      return;
    }
    try {
      const duration = await getVideoDurationSeconds(file);
      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        toast.error(`Video too long (max ${MAX_VIDEO_DURATION_SECONDS}s)`);
        e.target.value = '';
        return;
      }
    } catch {
      // If we can't read metadata, fall back to server validation.
    }
    setUploading(true);
    try {
      console.log('📤 Uploading video:', file.name);
      const res = await yachtApi.uploadVideo(file);
      console.log('✅ Upload response:', res.data);
      toast.success('Video uploaded ✓');
      console.log('🔄 Refreshing yacht data...');
      await refreshYacht();
      console.log('✅ Refresh complete');
    } catch (err) {
      console.error('❌ Upload error:', err);
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally { setUploading(false); e.target.value = ''; }
  };

  const deleteVideo = async (url) => {
    const filename = url.split('/').pop();
    try {
      await yachtApi.deleteVideo(filename);
      toast.success('Video removed');
      await refreshYacht();
    } catch { toast.error('Delete failed'); }
  };

  const saveDetails = async () => {
    setSaving(true);
    try {
      console.log('💾 Saving yacht details:', { name: editYacht.name, model: editYacht.model });
      await yachtApi.update({ name: editYacht.name, model: editYacht.model, length_ft: +editYacht.length_ft, max_guests: +editYacht.max_guests, description: editYacht.description, location: editYacht.location, amenities: editYacht.amenities });
      toast.success('Yacht details saved ✓');
      console.log('🔄 Calling refreshYacht...');
      await refreshYacht(); // Sync all components globally
      console.log('✅ Yacht refresh complete');
    } catch (err) { 
      console.error('❌ Save error:', err);
      toast.error('Save failed'); 
    } finally { 
      setSaving(false); 
    }
  };

  const savePricing = async () => {
    setSaving(true);
    try {
      await yachtApi.updatePricing(pricing);
      toast.success('Pricing updated ✓');
      await refreshYacht();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const uploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error('Invalid image type (JPEG, PNG, or WebP only)');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Image too large (max ${MAX_IMAGE_MB}MB)`);
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      console.log('📤 Uploading image:', file.name);
      const res = await yachtApi.uploadImage(file);
      console.log('✅ Upload response:', res.data);
      toast.success('Image uploaded ✓');
      console.log('🔄 Refreshing yacht data...');
      await refreshYacht();
      console.log('✅ Refresh complete');
    } catch (err) {
      console.error('❌ Upload error:', err);
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally { setUploading(false); e.target.value = ''; }
  };

  const deleteImage = async (url) => {
    try {
      await yachtApi.deleteImage(url);
      toast.success('Image removed');
      await refreshYacht();
    } catch { toast.error('Delete failed'); }
  };

  const saveExtra = async () => {
    try {
      if (editingExtra) {
        await yachtApi.updateExtra(editingExtra.id, { ...newExtra, price: +newExtra.price });
        toast.success('Extra updated ✓');
        setEditingExtra(null);
      } else {
        await yachtApi.createExtra({ ...newExtra, price: +newExtra.price });
        toast.success('Extra added ✓');
      }
      setNewExtra({ key:'', name:'', description:'', price:'', icon:'⭐' });
      await refreshYacht();
    } catch (err) { toast.error(err.response?.data?.detail || 'Save failed'); }
  };

  const deleteExtra = async (id) => {
    try { 
      await yachtApi.deleteExtra(id); 
      toast.success('Extra removed'); 
      await refreshYacht();
    } catch { toast.error('Failed'); }
  };

  const amenityList = (editYacht.amenities || []).join('\n');
  const setAmenities = v => setEditYacht(y => ({ ...y, amenities: v.split('\n').map(a => a.trim()).filter(Boolean) }));

  return (
    <>
      <style>{`
        .img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px,1fr)); gap: 12px; margin-top: 20px; }
        .img-item { position: relative; aspect-ratio: 4/3; border: 1px solid var(--border); overflow: hidden; }
        .img-item img { width:100%; height:100%; object-fit:cover; }
        .img-del { position:absolute; top:6px; right:6px; background: rgba(192,57,43,.85); border: none; color:#fff; width:24px; height:24px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; }
        .upload-zone { border: 1px dashed var(--border); padding: 32px; text-align: center; cursor: pointer; transition: all .2s; }
        .upload-zone:hover { border-color: var(--gold); background: rgba(201,168,76,.04); }
        .pricing-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border); }
        .pricing-row:last-child { border-bottom: none; }
        .p-input { width: 110px; background: rgba(255,255,255,.04); border: 1px solid var(--border); color: var(--gold2); font-family:'Cormorant Garamond',serif; font-size: 22px; padding: 6px 12px; text-align: right; outline: none; transition: border .2s; }
        .p-input:focus { border-color: var(--gold); }
        .extra-row { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
        .extra-row:last-child { border-bottom: none; }
      `}</style>
      <div className="page-wrap">
        <div className="page-header">
          <h1 className="page-title">Yacht <em>Management</em></h1>
          <p className="page-sub">Rock The Yatch · {yacht?.model}</p>
          <div className="gold-line" />
        </div>

        <div className="tabs">
          {['details','images','videos','pricing','extras'].map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Details */}
        {tab === 'details' && (
          <div style={{ maxWidth: 680 }}>
            <div className="form-grid">
              <div className="field"><label>Yacht Name</label><input value={editYacht.name||''} onChange={e => setEditYacht(y=>({...y,name:e.target.value}))} /></div>
              <div className="field"><label>Model</label><input value={editYacht.model||''} onChange={e => setEditYacht(y=>({...y,model:e.target.value}))} /></div>
              <div className="field"><label>Length (ft)</label><input type="number" value={editYacht.length_ft||''} onChange={e => setEditYacht(y=>({...y,length_ft:e.target.value}))} /></div>
              <div className="field"><label>Max Guests</label><input type="number" value={editYacht.max_guests||''} onChange={e => setEditYacht(y=>({...y,max_guests:e.target.value}))} /></div>
              <div className="field"><label>Location</label><input value={editYacht.location||''} onChange={e => setEditYacht(y=>({...y,location:e.target.value}))} /></div>
              <div className="field full-col"><label>Description</label><textarea value={editYacht.description||''} onChange={e => setEditYacht(y=>({...y,description:e.target.value}))} style={{minHeight:100}} /></div>
              <div className="field full-col"><label>Amenities (one per line)</label><textarea value={amenityList} onChange={e => setAmenities(e.target.value)} style={{minHeight:120}} placeholder="Air Conditioning&#10;Jet Ski&#10;BBQ&#10;Sun Deck" /></div>
            </div>
            <button className="btn-gold mt-32" onClick={saveDetails} disabled={saving}>{saving ? 'Saving…' : 'Save Details'}</button>
          </div>
        )}

        {/* Images */}
        {tab === 'images' && (
          <div>
            <div className="upload-zone" onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={uploadImage} />
              <div style={{fontSize:32,marginBottom:12}}>📷</div>
              <p style={{fontSize:12,letterSpacing:2,textTransform:'uppercase',color:'var(--muted)'}}>
                {uploading ? 'Uploading…' : 'Click to upload yacht photos'}
              </p>
              <p style={{fontSize:11,color:'var(--muted)',marginTop:6}}>JPEG, PNG or WebP · Max {10}MB</p>
            </div>
            {yacht?.featured_image && (
              <div style={{marginTop:20}}>
                <p style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1}}>🎯 Featured (Hero Background)</p>
                <div style={{width:200,height:120,margin:'8px 0',borderRadius:4,overflow:'hidden',border:'2px solid var(--gold)'}}>
                  <img src={yacht.featured_image} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                </div>
              </div>
            )}
            <div className="img-grid">
              {(yacht?.images||[]).map((img,i) => (
                <div key={i} className="img-item" style={{position:'relative'}}>
                  <img src={img} alt="" />
                  <div style={{position:'absolute',bottom:0,left:0,right:0,display:'flex',gap:4,padding:6,background:'rgba(0,0,0,0.7)'}}>
                    <button onClick={() => deleteImage(img)} className="img-del" style={{position:'static',width:24,height:24,padding:0}}>✕</button>
                    {yacht.featured_image !== img && (
                      <button onClick={async () => {
                        try {
                          await yachtApi.setFeaturedImage(img);
                          toast.success('Featured image set ✓');
                          await refreshYacht();
                        } catch { toast.error('Failed'); }
                      }} style={{flex:1,background:'rgba(201,168,76,0.9)',border:'none',color:'#fff',fontSize:11,cursor:'pointer',borderRadius:2}}>
                        Set Featured
                      </button>
                    )}
                    {yacht.featured_image === img && <span style={{flex:1,textAlign:'center',color:'var(--gold)',fontSize:11,fontWeight:500}}>✓ Featured</span>}
                  </div>
                </div>
              ))}
              {yacht?.images?.length === 0 && <p className="text-muted mt-16" style={{fontSize:13}}>No images uploaded yet.</p>}
            </div>
          </div>
        )}

        {/* Videos */}
        {tab === 'videos' && (
          <div>
            <div className="upload-zone" onClick={() => videoRef.current?.click()}>
              <input ref={videoRef} type="file" accept="video/*" style={{display:'none'}} onChange={uploadVideo} />
              <div style={{fontSize:32,marginBottom:12}}>🎬</div>
              <p style={{fontSize:12,letterSpacing:2,textTransform:'uppercase',color:'var(--muted)'}}>
                {uploading ? 'Uploading…' : 'Click to upload yacht videos'}
              </p>
              <p style={{fontSize:11,color:'var(--muted)',marginTop:6}}>MP4, WebM or MOV · Max 100MB</p>
            </div>
            {yacht?.featured_video && (
              <div style={{marginTop:20}}>
                <p style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1}}>🎯 Featured (Hero Background)</p>
                <div style={{width:200,height:120,margin:'8px 0',borderRadius:4,overflow:'hidden',border:'2px solid var(--gold)',background:'#000'}}>
                  <video src={yacht.featured_video} style={{width:'100%',height:'100%',objectFit:'cover'}} controls={false} />
                </div>
              </div>
            )}
            <div className="img-grid">
              {(yacht?.videos||[]).map((vid,i) => (
                <div key={i} className="img-item" style={{background:'#000'}}>
                  <video src={vid} style={{width:'100%',height:'100%',objectFit:'cover'}} controls={false} />
                  <div style={{position:'absolute',bottom:0,left:0,right:0,display:'flex',gap:4,padding:6,background:'rgba(0,0,0,0.7)'}}>
                    <button onClick={() => deleteVideo(vid)} className="img-del" style={{position:'static',width:24,height:24,padding:0}}>✕</button>
                    {yacht.featured_video !== vid && (
                      <button onClick={async () => {
                        try {
                          await yachtApi.setFeaturedVideo(vid);
                          toast.success('Featured video set ✓');
                          await refreshYacht();
                        } catch { toast.error('Failed'); }
                      }} style={{flex:1,background:'rgba(201,168,76,0.9)',border:'none',color:'#fff',fontSize:11,cursor:'pointer',borderRadius:2}}>
                        Set Featured
                      </button>
                    )}
                    {yacht.featured_video === vid && <span style={{flex:1,textAlign:'center',color:'var(--gold)',fontSize:11,fontWeight:500}}>✓ Featured</span>}
                  </div>
                </div>
              ))}
              {yacht?.videos?.length === 0 && <p className="text-muted mt-16" style={{fontSize:13}}>No videos uploaded yet.</p>}
            </div>
          </div>
        )}

        {/* Pricing */}
        {tab === 'pricing' && (
          <div style={{ maxWidth: 520 }}>
            <div className="card">
              {[
                { key:'full_day', label:'Full-Day Charter (8 hrs)' },
                { key:'half_day', label:'Half-Day Charter (4 hrs)' },
                { key:'hourly', label:'Hourly Rate' },
                { key:'daily_multi', label:'Multi-Day (per day)' },
              ].map(p => (
                <div key={p.key} className="pricing-row">
                  <span style={{fontSize:13}}>{p.label}</span>
                  <div className="flex items-center gap-8">
                    <span style={{color:'var(--muted)'}}>$</span>
                    <input className="p-input" type="number" value={pricing[p.key]||''} onChange={e => setPricing(pr=>({...pr,[p.key]:+e.target.value}))} />
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-gold mt-24" onClick={savePricing} disabled={saving}>{saving ? 'Saving…' : 'Save Pricing'}</button>
          </div>
        )}

        {/* Extras */}
        {tab === 'extras' && (
          <div>
            {/* Add/Edit form */}
            <div className="card mb-24" style={{ maxWidth: 680 }}>
              <h3 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, fontWeight:300, marginBottom:20 }}>
                {editingExtra ? 'Edit Add-on' : 'New Add-on'}
              </h3>
              <div className="form-grid">
                <div className="field"><label>Key (no spaces)</label><input placeholder="catering_premium" value={newExtra.key} onChange={e=>setNewExtra(x=>({...x,key:e.target.value}))} /></div>
                <div className="field"><label>Display Name</label><input placeholder="Premium Catering" value={newExtra.name} onChange={e=>setNewExtra(x=>({...x,name:e.target.value}))} /></div>
                <div className="field"><label>Price ($)</label><input type="number" value={newExtra.price} onChange={e=>setNewExtra(x=>({...x,price:e.target.value}))} /></div>
                <div className="field"><label>Icon (emoji)</label><input value={newExtra.icon} onChange={e=>setNewExtra(x=>({...x,icon:e.target.value}))} /></div>
                <div className="field full-col"><label>Description</label><input value={newExtra.description} onChange={e=>setNewExtra(x=>({...x,description:e.target.value}))} /></div>
              </div>
              <div className="flex gap-12 mt-20">
                <button className="btn-gold" onClick={saveExtra} disabled={!newExtra.key||!newExtra.name||!newExtra.price}>
                  {editingExtra ? 'Update Add-on' : 'Add Add-on'}
                </button>
                {editingExtra && <button className="btn-outline" onClick={()=>{setEditingExtra(null);setNewExtra({key:'',name:'',description:'',price:'',icon:'⭐'});}}>Cancel</button>}
              </div>
            </div>

            {/* Existing extras */}
            <div className="card" style={{ maxWidth: 680 }}>
              <h3 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, fontWeight:300, marginBottom:16 }}>Current Add-ons</h3>
              {extras.length === 0 && <p className="text-muted" style={{fontSize:13}}>No add-ons yet.</p>}
              {extras.map(e => (
                <div key={e.id} className="extra-row">
                  <span style={{fontSize:20}}>{e.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14}}>{e.name}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>{e.description}</div>
                  </div>
                  <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:20,color:'var(--gold2)'}}>
                    ${e.price?.toLocaleString()}
                  </div>
                  <button className="btn-ghost btn-sm" onClick={()=>{setEditingExtra(e);setNewExtra({key:e.key,name:e.name,description:e.description,price:e.price,icon:e.icon});}}>Edit</button>
                  <button className="btn-ghost btn-sm" style={{color:'var(--red)'}} onClick={()=>deleteExtra(e.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
