// Shared render logic used by index.html and playground.html
(function (root) {
  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
  }
  function normalizeMedia(path) {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    if (path.startsWith('data:')) return path;
    if (path.startsWith('/')) return path;
    return '/' + path.replace(/^\.?\//, '');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function sectionAttrs(cfg, id) {
    const bg = cfg.background || 'light';
    const sp = cfg.spacing || 'normal';
    const al = cfg.alignment || 'left';
    return `id="${id}" data-bg="${bg}" data-spacing="${sp}" data-align="${al}"`;
  }

  const renderers = {
    about(cfg) {
      if (!cfg.enabled) return '';
      return `<section ${sectionAttrs(cfg,'about')} class="about">
        <div class="container">
          <div class="about-grid">
            <div>
              <div class="section-label">About</div>
              <h2>${esc(cfg.heading || '')}</h2>
              <div class="rich-body">${cfg.body || ''}</div>
            </div>
            <div class="about-card">
              <h3>${esc(cfg.card_heading || '')}</h3>
              <p>${esc(cfg.card_text || '')}</p>
              <div class="stat-row">
                <div class="stat"><div class="num">${esc(cfg.stat_1_number || '')}</div><div class="lbl">${esc(cfg.stat_1_label || '')}</div></div>
                <div class="stat"><div class="num">${esc(cfg.stat_2_number || '')}</div><div class="lbl">${esc(cfg.stat_2_label || '')}</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>`;
    },
    featured(cfg) {
      if (!cfg.enabled || !cfg.name) return '';
      const photo = cfg.photo ? `<img class="featured-photo" src="${normalizeMedia(cfg.photo)}" alt="${esc(cfg.name)}">` : '<div class="featured-photo"></div>';
      return `<section ${sectionAttrs(cfg,'featured')} class="featured">
        <div class="container">
          <div class="section-label">Spotlight</div>
          <h2>${esc(cfg.heading || '')}</h2>
          <div class="featured-inner">
            ${photo}
            <div>
              <h3>${esc(cfg.name)}</h3>
              <div class="featured-desc">${cfg.description || ''}</div>
            </div>
          </div>
        </div>
      </section>`;
    },
    products(cfg) {
      if (!cfg.enabled) return '';
      const cards = (cfg.items || []).map(p => {
        const photo = p.photo ? `<img class="photo" src="${normalizeMedia(p.photo)}" alt="${esc(p.name)}">` : '';
        return `<div class="product-card">${photo}<div class="body"><h3>${esc(p.name)}</h3><div class="rich-body">${p.description || ''}</div></div></div>`;
      }).join('');
      return `<section ${sectionAttrs(cfg,'bats')} class="products">
        <div class="container">
          <div class="section-label">The Lineup</div>
          <h2>${esc(cfg.heading || '')}</h2>
          <div class="product-grid">${cards}</div>
        </div>
      </section>`;
    },
    gallery(cfg) {
      if (!cfg.enabled || !(cfg.images || []).length) return '';
      const imgs = cfg.images.map(src => `<img src="${normalizeMedia(src)}" alt="Custom wiffle bat">`).join('');
      return `<section ${sectionAttrs(cfg,'gallery')} class="gallery">
        <div class="container">
          <div class="section-label">Gallery</div>
          <h2>${esc(cfg.heading || '')}</h2>
          <p class="gallery-subtext">${esc(cfg.subtext || '')}</p>
          <div class="gallery-grid">${imgs}</div>
        </div>
      </section>`;
    },
    testimonials(cfg) {
      if (!cfg.enabled || !(cfg.items || []).length) return '';
      const cards = cfg.items.map(t => `<div class="testi-card"><blockquote>${t.quote || ''}</blockquote><div class="who">— ${esc(t.author || '')}</div></div>`).join('');
      return `<section ${sectionAttrs(cfg,'testimonials')} class="testimonials">
        <div class="container">
          <div class="section-label">Reviews</div>
          <h2>${esc(cfg.heading || '')}</h2>
          <div class="testi-grid">${cards}</div>
        </div>
      </section>`;
    },
    contact(cfg) {
      if (!cfg.enabled) return '';
      return `<section ${sectionAttrs(cfg,'contact')} class="contact">
        <div class="container">
          <div class="contact-wrap">
            <div class="section-label">Contact</div>
            <h2>${esc(cfg.heading || '')}</h2>
            <div class="contact-subtext">${cfg.subtext || ''}</div>
            <form action="${esc(cfg.form_endpoint || '')}" method="POST">
              <div><label for="name">Your Name</label><input type="text" id="name" name="name" required></div>
              <div><label for="email">Email</label><input type="email" id="email" name="email" required></div>
              <div><label for="message">What kind of bat do you want?</label><textarea id="message" name="message" placeholder="Colors, style, quantity, anything else..." required></textarea></div>
              <button type="submit" class="btn">${esc(cfg.button_label || 'Send It')}</button>
            </form>
          </div>
        </div>
      </section>`;
    }
  };

  const navLabels = { about: 'About', featured: 'Featured', products: 'Bats', gallery: 'Gallery', testimonials: 'Reviews', contact: 'Contact' };
  const navAnchors = { about: 'about', featured: 'featured', products: 'bats', gallery: 'gallery', testimonials: 'testimonials', contact: 'contact' };

  function renderSite(data, doc) {
    doc = doc || document;
    doc.body.setAttribute('data-theme', data.theme || 'navy-red');

    doc.querySelectorAll('[data-c]').forEach(el => {
      const val = getPath(data, el.getAttribute('data-c'));
      if (val !== undefined && val !== null) el.innerHTML = val;
    });

    const hero = doc.getElementById('hero');
    if (hero) {
      hero.classList.remove('has-bg');
      let heroStyleTag = doc.getElementById('hero-bg-style');
      if (!heroStyleTag) {
        heroStyleTag = doc.createElement('style');
        heroStyleTag.id = 'hero-bg-style';
        doc.head.appendChild(heroStyleTag);
      }
      heroStyleTag.textContent = '';
      if (data.hero) {
        hero.setAttribute('data-align', data.hero.alignment || 'left');
        hero.setAttribute('data-spacing', data.hero.spacing || 'spacious');
        if (data.hero.background_image) {
          heroStyleTag.textContent = `#hero { --hero-bg: url("${normalizeMedia(data.hero.background_image)}"); }`;
          hero.classList.add('has-bg');
        }
      }
    }

    const order = (data.section_order || []).map(s => s.section).filter(Boolean);
    const seen = new Set();
    const html = order.map(name => {
      if (seen.has(name) || !renderers[name] || !data[name]) return '';
      seen.add(name);
      return renderers[name](data[name]);
    }).join('');
    const main = doc.getElementById('sections');
    if (main) main.innerHTML = html;

    const nav = doc.getElementById('nav-links');
    if (nav) {
      nav.innerHTML = order
        .filter(n => data[n] && data[n].enabled)
        .map(n => `<a href="#${navAnchors[n]}">${navLabels[n]}</a>`).join('');
    }

    const sr = doc.getElementById('social-row');
    if (sr) {
      const links = [];
      if (data.social && data.social.instagram) links.push(`<a href="${esc(data.social.instagram)}" target="_blank" rel="noopener">Instagram</a>`);
      if (data.social && data.social.tiktok) links.push(`<a href="${esc(data.social.tiktok)}" target="_blank" rel="noopener">TikTok</a>`);
      if (data.social && data.social.email) links.push(`<a href="mailto:${esc(data.social.email)}">Email</a>`);
      sr.innerHTML = links.join('');
    }
  }

  root.BlitzRender = { renderSite, renderers };
})(window);
