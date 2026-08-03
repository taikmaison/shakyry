import { useState, useEffect } from 'react';
import './App.css';
import { mockTemplates } from './real_templates';
import OriginalTemplateViewer from './OriginalTemplateViewer';

// --- MOCK DATA ---
const categories = [
  { id: 'all', name: 'Барлығы' },
  { id: 'uylenu-toi', name: 'Үйлену той' },
  { id: 'kyz-uzatu', name: 'Қыз ұзату' },
  { id: 'syrga-salu', name: 'Сырға салу' },
  { id: 'kudalyk', name: 'Құдалық' },
  { id: 'merey-toi', name: 'Мерей той' },
  { id: 'tugan-kun', name: 'Туған күн' },
  { id: 'tusaukeser', name: 'Тұсаукесер' },
  { id: 'sundet-toi', name: 'Сүндет той' },
];

// Single source of truth for the contact channel — the site has no backend,
// so every call to action goes to WhatsApp.
const WHATSAPP_NUMBER = '77780122500';
const WHATSAPP_DISPLAY = '+7 778 012 25 00';
const waLink = (text) =>
  `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

// --- COMPONENTS ---

const TemplateModal = ({ template, onClose, onPreview }) => {
  useEffect(() => {
    if (!template) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [template, onClose]);

  if (!template) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <div className="modal-body">
          <div className="modal-image-wrapper">
            <img src={template.image} alt={template.title} className="modal-image" />
          </div>
          
          <div className="modal-details">
            <h2 className="modal-title">{template.title}</h2>
            <div className="modal-meta">
              <span className="modal-category">
                {categories.find(c => c.id === template.categoryId)?.name}
              </span>
              <span className="modal-id">ID: {template.id}</span>
            </div>
            
            <p className="modal-description">
              Бұл заманауи және талғампаз дизайн сіздің мерекеңіздің маңыздылығын 
              атап өтуге арналған. Қонақтарыңызға ерекше әсер қалдырыңыз.
            </p>
            
            <ul className="modal-features">
              <li>✓ Интерактивті карта</li>
              <li>✓ Кері санақ таймері</li>
              <li>✓ Музыкамен сүйемелдеу</li>
              <li>✓ Қонақтар тізімін растау (RSVP)</li>
            </ul>

            <div className="modal-actions">
              <div className="modal-price-box">
                <p className="price-label">Бағасы</p>
                <p className="price-value">{template.price}</p>
              </div>
              <button
                className="btn-demo"
                disabled={!template.demoAvailable}
                title={template.demoAvailable ? undefined : 'Демоверсия пока не загружена'}
                onClick={(e) => { e.preventDefault(); onPreview(template.id); }}
              >
                {template.demoAvailable ? 'Демо көру' : 'Демо дайын емес'}
              </button>
              <a
                className="btn-order"
                href={waLink(`Сәлеметсіз бе! «${template.title}» шаблонын (ID: ${template.id}) тапсырыс бергім келеді.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Тапсырыс беру
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Header = ({ isScrolled }) => (
  <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
    <div className="header-container">
      <div className="logo">
        <span className="logo-icon">✨</span>
        <span className="logo-text">Toi<span className="logo-highlight">Шақыру</span></span>
      </div>
      <nav className="nav-menu">
        <a href="#templates" className="nav-link active">Шаблондар</a>
        <a href="#pricing" className="nav-link">Бағалар</a>
        <a href={waLink()} className="nav-link" target="_blank" rel="noopener noreferrer">Байланыс</a>
      </nav>
      <div className="header-actions">
        <a
          href={waLink('Сәлеметсіз бе! Шақыру туралы сұрағым бар.')}
          className="btn-whatsapp"
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      </div>
    </div>
  </header>
);

const Hero = () => (
  <section className="hero">
    <div className="hero-content">
      <h1 className="hero-title">
        Ең әдемі <span className="text-gradient">электронды шақырулар</span>
      </h1>
      <p className="hero-subtitle">
        Тойыңызға қонақтарды заманауи, әрі ыңғайлы форматта шақырыңыз. 
        Дайын шаблондар, интерактивті функциялар және қолжетімді баға.
      </p>
      <div className="hero-buttons">
        <a href="#templates" className="btn-primary">Шаблондарды көру</a>
        <a href="#pricing" className="btn-secondary">Бағаны білу</a>
      </div>
    </div>
    <div className="hero-decoration">
      <div className="circle circle-1"></div>
      <div className="circle circle-2"></div>
      <div className="circle circle-3"></div>
    </div>
  </section>
);

const TemplateCard = ({ template, onClick }) => (
  <div className="template-card" onClick={onClick}>
    <div className="card-image-container">
      <img src={template.image} alt={template.title} loading="lazy" />
      <div className="card-overlay">
        <span className="btn-view">Толығырақ</span>
      </div>
      <div className="card-badges">
        {template.isNew && <span className="badge badge-new">Жаңа</span>}
        {template.isHit && <span className="badge badge-hit">Хит</span>}
      </div>
    </div>
    <div className="card-info">
      <div className="card-header">
        <h3 className="card-title">{template.title}</h3>
        <span className="card-price">{template.price}</span>
      </div>
      <p className="card-category">
        {categories.find(c => c.id === template.categoryId)?.name} • ID: {template.id}
      </p>
    </div>
  </div>
);

const Pricing = () => (
  <section id="pricing" className="pricing-section">
    <div className="section-header">
      <h2 className="section-title">Бағалар</h2>
      <p className="section-subtitle">Барлығы қарапайым және түсінікті</p>
    </div>

    <div className="pricing-card">
      <p className="pricing-label">Кез келген дайын шаблон</p>
      <p className="pricing-amount">2 799 ₸</p>
      <p className="pricing-note">
        Каталогтағы барлық шаблондардың бағасы бірдей.
      </p>

      <div className="pricing-divider"></div>

      <p className="pricing-extra">
        Шаблонға өзгеріс енгізу керек болса немесе өз дизайныңызды қаласаңыз —
        баға бөлек есептеледі. WhatsApp арқылы жазыңыз, келісеміз.
      </p>

      <a
        href={waLink('Сәлеметсіз бе! Шақыру жасатқым келеді.')}
        className="btn-whatsapp-lg"
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp арқылы жазу
      </a>
      <p className="pricing-phone">{WHATSAPP_DISPLAY}</p>
    </div>
  </section>
);

const Footer = () => (
  <footer className="footer">
    <div className="footer-content">
      <div className="footer-brand">
        <div className="logo">
          <span className="logo-icon">✨</span>
          <span className="logo-text">ToiШақыру</span>
        </div>
        <p className="footer-desc">Қазақстандағы №1 электронды шақырулар платформасы.</p>
      </div>
      <div className="footer-links">
        <div className="link-group">
          <h4>Мәзір</h4>
          <a href="#templates">Шаблондар</a>
          <a href="#pricing">Бағалар</a>
        </div>
        <div className="link-group">
          <h4>Байланыс</h4>
          <a href={waLink()} target="_blank" rel="noopener noreferrer">
            WhatsApp {WHATSAPP_DISPLAY}
          </a>
        </div>
      </div>
    </div>
    <div className="footer-bottom">
      <p>&copy; 2026 ToiШақыру. Барлық құқықтар қорғалған.</p>
    </div>
  </footer>
);

// --- MAIN APP ---

function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewTemplateId, setPreviewTemplateId] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredTemplates = selectedCategory === 'all' 
    ? mockTemplates 
    : mockTemplates.filter(t => t.categoryId === selectedCategory);

  return (
    <div className="app">
      <Header isScrolled={isScrolled} />
      
      <main>
        <Hero />
        
        <section id="templates" className="templates-section">
          <div className="section-header">
            <h2 className="section-title">Шаблондар каталогы</h2>
            <p className="section-subtitle">Өзіңізге ұнаған дизайнды таңдаңыз</p>
          </div>

          <div className="categories-wrapper">
            <div className="categories">
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="templates-grid">
            {filteredTemplates.map(template => (
              <TemplateCard 
                key={template.id} 
                template={template} 
                onClick={() => setSelectedTemplate(template)}
              />
            ))}
          </div>
        </section>

        <Pricing />
      </main>

      <TemplateModal 
        template={selectedTemplate} 
        onClose={() => setSelectedTemplate(null)} 
        onPreview={(id) => {
          setSelectedTemplate(null);
          setPreviewTemplateId(id);
        }}
      />
      
      {previewTemplateId && (
        <OriginalTemplateViewer 
          templateId={previewTemplateId} 
          onClose={() => setPreviewTemplateId(null)} 
        />
      )}

      <Footer />
    </div>
  );
}

export default App;
