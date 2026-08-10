import { useEffect, useState } from 'react';
import { mockTemplates } from './real_templates';

const OriginalTemplateViewer = ({ templateId, onClose }) => {
  const [failed, setFailed] = useState(false);
  const template = mockTemplates.find(t => t.id === templateId);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  let iframeUrl = `/demos/${templateId}/index.html`;
  if (template && template.previewUrl) {
    iframeUrl = template.previewUrl;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 99999,
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        position: 'absolute',
        top: '15px',
        right: '15px',
        zIndex: 100000
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '14px',
            backdropFilter: 'blur(4px)'
          }}
        >
          Жабу (Закрыть)
        </button>
      </div>
      {failed ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '24px',
          textAlign: 'center',
          background: '#14121a',
          color: '#ece8f1'
        }}>
          <div style={{ fontSize: '40px' }}>🚧</div>
          <h2 style={{ fontSize: '20px', margin: 0 }}>Демо жүктелмеді</h2>
          <p style={{ fontSize: '14px', color: '#a9a2b8', margin: 0 }}>
            Не удалось загрузить демоверсию шаблона (ID: {templateId}).
          </p>
        </div>
      ) : (
        <iframe
          src={iframeUrl}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Template Preview"
        />
      )}
    </div>
  );
};

export default OriginalTemplateViewer;
