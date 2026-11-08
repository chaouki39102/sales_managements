// Tab "الصور" of ProductModal. Called as a plain render function (not a component) to keep the original React tree.
import { s } from '../ui/styles';
import SectionHeader from '../ui/SectionHeader';
import type { ProductModalCtx } from '../hooks/useProductModal';

export default function renderImagesTab(ctx: ProductModalCtx) {
  const {
    form, imageInput, setImageInput, productId, set, imgUploadPct, imgFileRef, pendingImageUrl, setShowCamera,
    showImgSuggest, imgQuery, setImgQuery, imgResults, imgLoading, imgError, searchProductImages,
    addSuggestedImage, clearPendingImage, handleUploadImage, handleDeleteImage, setDefaultImage,
    toggleImgSuggest,
  } = ctx;

  return (
    <div style={s.section}>
      <SectionHeader icon="ti-photo" title="صور المنتج" subtitle="إضافة روابط صور المنتج (URL)" />

      {/* إضافة صورة بـ URL */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...s.inp(), flex: 1, direction: 'ltr', fontFamily: 'monospace', fontSize: 12 }}
          value={imageInput}
          onChange={e => setImageInput(e.target.value)}
          placeholder="https://example.com/image.jpg"
          onKeyDown={e => {
            if (e.key === 'Enter' && imageInput.trim()) {
              set('images', [...form.images, imageInput.trim()]);
              setImageInput('');
            }
          }}
        />
        <button
          disabled={!imageInput.trim()}
          onClick={() => { if (imageInput.trim()) { set('images', [...form.images, imageInput.trim()]); setImageInput(''); } }}
          style={{ padding: '7px 16px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: !imageInput.trim() ? 0.5 : 1 }}
        >
          <i className="ti ti-plus" /> إضافة
        </button>
        <button
          type="button"
          onClick={() => imgFileRef.current?.click()}
          disabled={!!productId === false || imgUploadPct > 0}
          style={{
            padding: '7px 16px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b3)', background: 'var(--bg2)',
            color: 'var(--t2)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: !productId || imgUploadPct > 0 ? 0.5 : 1,
          }}
        >
          {imgUploadPct > 0
            ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {imgUploadPct}%</>
            : <><i className="ti ti-upload" /> من الجهاز</>}
        </button>
        <input
          ref={imgFileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={handleUploadImage}
        />
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          disabled={pendingImageUrl !== null}
          style={{
            padding: '7px 16px', borderRadius: 'var(--r2)',
            border: '1px solid var(--em)', background: 'var(--emb)',
            color: 'var(--em)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: pendingImageUrl ? 0.5 : 1,
          }}
          title="التقاط صورة بالكاميرا — تُرفع عند الحفظ"
        >
          {pendingImageUrl
            ? <><i className="ti ti-check" /> صورة ملتقطة</>
            : <><i className="ti ti-camera" /> كاميرا</>}
        </button>
        <button
          type="button"
          onClick={toggleImgSuggest}
          style={{
            padding: '7px 16px', borderRadius: 'var(--r2)',
            border: `1px solid ${showImgSuggest ? 'var(--em)' : 'var(--b3)'}`,
            background: showImgSuggest ? 'var(--emb)' : 'var(--bg2)',
            color: showImgSuggest ? 'var(--em)' : 'var(--t2)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <i className="ti ti-sparkles" /> اقتراح صورة
        </button>
      </div>

      {/* لوحة اقتراح الصور من الإنترنت */}
      {showImgSuggest && (
        <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...s.inp(), flex: 1, fontSize: 13 }}
              value={imgQuery}
              onChange={e => setImgQuery(e.target.value)}
              placeholder="اكتب اسم المنتج أو كلمة بحث..."
              onKeyDown={e => { if (e.key === 'Enter') searchProductImages(imgQuery); }}
            />
            <button
              type="button"
              disabled={!imgQuery.trim() || imgLoading}
              onClick={() => searchProductImages(imgQuery)}
              style={{
                padding: '7px 16px', borderRadius: 'var(--r2)', border: '1px solid var(--em)',
                background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
                opacity: (!imgQuery.trim() || imgLoading) ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {imgLoading
                ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                : <i className="ti ti-search" />}
              بحث
            </button>
          </div>

          {imgLoading && (
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{
                  width: 110, height: 110, borderRadius: 'var(--r2)', flexShrink: 0,
                  background: 'var(--bg3)', border: '1px solid var(--b2)',
                }} />
              ))}
            </div>
          )}

          {!imgLoading && imgError && (
            <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', padding: '10px 0' }}>
              <i className="ti ti-mood-empty" style={{ marginLeft: 6 }} />
              {imgError}
            </div>
          )}

          {!imgLoading && imgResults.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {imgResults.map(r => {
                  const added = form.images.includes(r.full);
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => addSuggestedImage(r.full)}
                      title={added ? 'مُضافة بالفعل' : 'اضغط للإضافة إلى المنتج'}
                      style={{
                        position: 'relative', width: 110, height: 110, flexShrink: 0,
                        borderRadius: 'var(--r2)', overflow: 'hidden', padding: 0,
                        border: `2px solid ${added ? 'var(--em)' : r.exact ? 'var(--gold, #c8952c)' : 'var(--b2)'}`,
                        cursor: added ? 'default' : 'pointer', background: 'var(--bg3)',
                      }}
                    >
                      <img
                        src={r.thumb}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
                      />
                      {r.exact && !added && (
                        <div style={{
                          position: 'absolute', bottom: 0, insetInline: 0,
                          background: 'rgba(200,149,44,.92)', color: '#fff',
                          fontSize: 9, fontWeight: 700, textAlign: 'center', padding: '2px 0',
                        }}>
                          {r.label ?? 'مطابقة دقيقة'}
                        </div>
                      )}
                      {!r.exact && r.source && !added && (
                        <div style={{
                          position: 'absolute', bottom: 0, insetInline: 0,
                          background: 'rgba(0,0,0,.6)', color: '#fff',
                          fontSize: 9, fontWeight: 600, textAlign: 'center', padding: '2px 4px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {r.source}
                        </div>
                      )}
                      {added && (
                        <div style={{
                          position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <i className="ti ti-check" style={{ fontSize: 22, color: '#fff' }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-info-circle" style={{ fontSize: 13 }} />
                اضغط على أي صورة لإضافتها مباشرة إلى صور المنتج. يمكنك اختيار أكثر من صورة.
              </div>
            </>
          )}
        </div>
      )}

      {form.images.length === 0 && !pendingImageUrl ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--t4)' }}>
          <i className="ti ti-photo-off" style={{ fontSize: 40, opacity: 0.3 }} />
          <div style={{ marginTop: 12, fontSize: 13 }}>لا توجد صور</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>أضف روابط الصور أو التقط صورة بالكاميرا</div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {pendingImageUrl && (
              <div style={{
                position: 'relative', borderRadius: 'var(--r3)', overflow: 'hidden',
                border: '2px dashed var(--em)', background: 'var(--bg3)', aspectRatio: '1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img
                  src={pendingImageUrl}
                  alt="صورة ملتقطة بالكاميرا"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* شارة ملتقطة بالكاميرا */}
                <div style={{
                  position: 'absolute', top: 6, right: 6, background: 'rgba(10,138,92,.92)',
                  color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <i className="ti ti-camera" style={{ fontSize: 11 }} /> ملتقطة
                </div>
                {/* إزالة */}
                <button
                  onClick={clearPendingImage}
                  title="إزالة الصورة الملتقطة"
                  style={{
                    position: 'absolute', top: 6, left: 6, padding: '4px 7px', borderRadius: 8,
                    background: 'rgba(212,43,43,.85)', border: 'none', color: '#fff',
                    cursor: 'pointer', fontSize: 13,
                  }}
                ><i className="ti ti-trash" /></button>
                {/* ستُرفع عند الحفظ */}
                <div style={{
                  position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,.65)',
                  color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                }}>ستُرفع عند الحفظ</div>
              </div>
            )}
            {form.images.map((img, idx) => (
              <div key={idx} style={{
                position: 'relative', borderRadius: 'var(--r3)', overflow: 'hidden',
                border: form.default_image === img ? '2px solid #f5a623' : '1px solid var(--b2)',
                background: 'var(--bg3)', aspectRatio: '1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img
                  src={img}
                  alt={`صورة ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <i className="ti ti-photo" style={{
                  position: 'absolute', fontSize: 28, color: 'var(--t4)', opacity: 0.3,
                  pointerEvents: 'none',
                }} />
                {/* Overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', opacity: 0, transition: 'opacity .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <button
                    onClick={() => setDefaultImage(img)}
                    title={form.default_image === img ? 'إلغاء الصورة الرئيسية' : 'تعيين كصورة رئيسية (تظهر في نقاط البيع)'}
                    style={{ padding: '5px 8px', borderRadius: 8, background: form.default_image === img ? 'rgba(245,166,35,.9)' : 'rgba(255,255,255,.15)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}
                  ><i className={form.default_image === img ? 'ti ti-star-filled' : 'ti ti-star'} /></button>
                  <a href={img} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,.15)', color: '#fff', textDecoration: 'none', fontSize: 13 }}>
                    <i className="ti ti-external-link" />
                  </a>
                  <button
                    onClick={() => handleDeleteImage(img, idx)}
                    style={{ padding: '5px 8px', borderRadius: 8, background: 'rgba(212,43,43,.8)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}
                  ><i className="ti ti-trash" /></button>
                </div>
                {/* رقم الصورة */}
                <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {idx + 1}
                </div>
                {/* شارة الصورة الرئيسية */}
                {form.default_image === img && (
                  <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(245,166,35,.95)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999 }}>
                    <i className="ti ti-star" style={{ fontSize: 11, marginInlineEnd: 3 }} />الرئيسية
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-info-circle" style={{ fontSize: 13 }} />
            {form.images.length} صورة — الصورة ذات النجمة تظهر في نقاط البيع.
            مرر الماوس على الصورة لتعيينها رئيسية أو حذفها أو فتحها.
            {pendingImageUrl && ' الصورة الملتقطة ستُرفع تلقائياً عند الحفظ.'}
          </div>
        </div>
      )}
    </div>
  );
}
