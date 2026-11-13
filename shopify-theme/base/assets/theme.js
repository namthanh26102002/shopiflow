/* Shopiflow theme — behaviour.
 *
 * Deliberately small and dependency-free: custom elements upgrade markup that
 * already works without JavaScript, so a failed script leaves a usable store
 * (the menu is a link list, quantity is a number input, the cart form posts,
 * the gallery swipes natively, and the variant picker is ordinary links).
 */

/**
 * The storefront's root path. Not always "/": with Markets a store can serve
 * from /en-gb/ and similar, and cart endpoints must be called under it.
 */
const storeRoot = () =>
  (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Toggles the mobile navigation panel. */
class MenuToggle extends HTMLElement {
  connectedCallback() {
    this.button = this.querySelector('button');
    this.panel = document.getElementById(this.dataset.panelId);
    if (!this.button || !this.panel) return;

    this.button.addEventListener('click', () => this.toggle());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.panel.hidden) this.toggle(false);
    });
  }

  toggle(force) {
    const open = typeof force === 'boolean' ? force : this.panel.hidden;
    this.panel.hidden = !open;
    this.button.setAttribute('aria-expanded', String(open));
  }
}
customElements.define('menu-toggle', MenuToggle);

/** Plus/minus buttons around a number input. */
class QuantityInput extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('input');
    if (!this.input) return;

    this.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const step = button.dataset.action === 'increase' ? 1 : -1;
        const min = Number(this.input.min || 0);
        const next = Number(this.input.value) + step;
        this.input.value = String(Math.max(min, next));
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }
}
customElements.define('quantity-input', QuantityInput);

/**
 * Updates a cart line through the Cart AJAX API.
 *
 * Falls back to a full form submit when the request fails, so a network blip
 * does not silently drop a quantity change.
 */
class CartItems extends HTMLElement {
  connectedCallback() {
    this.addEventListener('change', (event) => {
      const input = event.target.closest('[data-line]');
      if (!input) return;
      this.updateLine(input.dataset.line, input.value);
    });
  }

  async updateLine(line, quantity) {
    this.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(`${storeRoot()}cart/change.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line: Number(line), quantity: Number(quantity) }),
      });

      if (!response.ok) throw new Error(`Cart update failed: ${response.status}`);
      window.location.reload();
    } catch (error) {
      console.error(error);
      const form = this.closest('form');
      if (form) form.submit();
    } finally {
      this.removeAttribute('aria-busy');
    }
  }
}
customElements.define('cart-items', CartItems);

/**
 * A horizontal scroll-snap track with prev/next buttons.
 *
 * The track scrolls natively on its own; this only wires the buttons. Shared
 * by the product gallery and the image carousel block.
 */
class ScrollCarousel extends HTMLElement {
  connectedCallback() {
    this.track = this.querySelector('[data-track], .carousel__track, .gallery__track');
    if (!this.track) return;

    this.classList.add('is-enhanced');
    this.addEventListener('click', (event) => {
      const button = event.target.closest('[data-step]');
      if (!button) return;
      this.step(Number(button.dataset.step));
    });

    // While a smooth scroll is in flight the scroll position lags the click,
    // so a quick second tap would compute from the old slide and go nowhere.
    // Remember where we are heading instead, and forget it as soon as the
    // shopper takes over or the scroll settles.
    this.targetIndex = null;
    const forget = () => { this.targetIndex = null; };
    for (const type of ['pointerdown', 'touchstart', 'wheel']) {
      this.track.addEventListener(type, forget, { passive: true });
    }
    this.track.addEventListener('scrollend', forget);
  }

  slides() {
    return Array.from(this.track.children);
  }

  /** Index of the slide whose left edge is nearest the track's left edge. */
  currentIndex() {
    const left = this.track.scrollLeft;
    let best = 0;
    let bestDistance = Infinity;
    this.slides().forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft - this.track.offsetLeft - left);
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    return best;
  }

  goTo(index, behavior = 'smooth') {
    const slides = this.slides();
    if (slides.length === 0) return;
    const wrapped = (index + slides.length) % slides.length;
    const target = slides[wrapped];
    this.targetIndex = wrapped;
    this.track.scrollTo({
      left: target.offsetLeft - this.track.offsetLeft,
      behavior: prefersReducedMotion() ? 'auto' : behavior,
    });
  }

  step(delta) {
    const from = this.targetIndex === null ? this.currentIndex() : this.targetIndex;
    this.goTo(from + delta);
  }
}
customElements.define('scroll-carousel', ScrollCarousel);

/**
 * Product media gallery: a ScrollCarousel plus thumbnails, and it opens on
 * the selected variant's image.
 */
class ProductGallery extends ScrollCarousel {
  connectedCallback() {
    super.connectedCallback();
    if (!this.track) return;

    this.thumbs = Array.from(this.querySelectorAll('[data-media-target]'));

    const featured = this.slides().findIndex(
      (slide) => slide.dataset.mediaId === this.dataset.featuredMedia
    );
    if (featured > 0) this.goTo(featured, 'auto');

    this.addEventListener('click', (event) => {
      const thumb = event.target.closest('[data-media-target]');
      if (!thumb) return;
      const index = this.slides().findIndex((slide) => slide.dataset.mediaId === thumb.dataset.mediaTarget);
      if (index !== -1) this.goTo(index);
    });

    let pending = null;
    this.track.addEventListener('scroll', () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => this.syncActive());
    }, { passive: true });
  }

  /**
   * Highlights the target thumbnail as soon as an arrow or thumbnail is used,
   * rather than when the smooth scroll finishes, so the strip never lags a
   * step behind the click.
   */
  goTo(index, behavior = 'smooth') {
    super.goTo(index, behavior);
    const count = this.slides().length;
    if (count) this.syncActive((index + count) % count);
  }

  /** Marks the visible slide's thumbnail and pauses any video scrolled away. */
  syncActive(index = this.currentIndex()) {
    const slides = this.slides();
    const activeId = slides[index] && slides[index].dataset.mediaId;

    slides.forEach((slide, i) => {
      if (i !== index) slide.querySelectorAll('video').forEach((video) => video.pause());
    });

    for (const thumb of this.thumbs) {
      if (thumb.dataset.mediaTarget === activeId) {
        thumb.setAttribute('aria-current', 'true');
      } else {
        thumb.removeAttribute('aria-current');
      }
    }
  }
}
customElements.define('product-gallery', ProductGallery);

/**
 * Variant picker.
 *
 * The markup is a list of links to each variant's own URL, which already works
 * on its own. This intercepts those clicks and swaps the product section in
 * place using the Section Rendering API, so price, availability, gallery and
 * the add-to-cart button all come from Shopify rather than being patched up
 * field by field in the browser.
 *
 * Any failure falls through to a normal navigation to the same URL.
 */
class VariantPicker extends HTMLElement {
  connectedCallback() {
    this.section = this.closest('[data-section-id]');

    this.addEventListener('click', (event) => {
      const link = event.target.closest('a.variant-value');
      if (!link) return;

      // Leave modified clicks and middle-clicks to the browser so
      // open-in-new-tab keeps working.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;

      if (link.hasAttribute('aria-current')) {
        event.preventDefault();
        return;
      }

      if (!this.section || !this.section.dataset.sectionId) return;

      event.preventDefault();
      this.swap(link.href, {
        position: link.dataset.optionPosition,
        value: link.dataset.optionValue,
      });
    });
  }

  async swap(url, restoreFocusTo) {
    const section = this.section;
    const sectionId = section.dataset.sectionId;
    section.setAttribute('aria-busy', 'true');

    try {
      const fetchUrl = new URL(url, window.location.origin);
      fetchUrl.searchParams.set('section_id', sectionId);

      const response = await fetch(fetchUrl.toString());
      if (!response.ok) throw new Error(`Section render failed: ${response.status}`);

      const html = await response.text();
      const next = new DOMParser()
        .parseFromString(html, 'text/html')
        .getElementById(`MainProduct-${sectionId}`);

      if (!next) throw new Error('Rendered section markup did not contain the product container');

      // The swap re-renders the offers at the new variant's price, which also
      // resets them to the default tier. Carry the shopper's choice across so
      // picking a colour does not quietly undo picking a bundle.
      // Gift variants likewise: the Panda backpack should stay the Panda.
      const chosenOffer = section.querySelector('input[data-offer-id]:checked');
      const chosenOfferId = chosenOffer ? chosenOffer.dataset.offerId : null;
      const chosenGifts = Array.from(section.querySelectorAll('select[data-bundle-gift]'))
        .map((select) => [select.id, select.value]);

      section.innerHTML = next.innerHTML;

      for (const [id, value] of chosenGifts) {
        const select = document.getElementById(id);
        if (select && Array.from(select.options).some((option) => option.value === value)) {
          select.value = value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      if (chosenOfferId) {
        const restored = section.querySelector(`input[data-offer-id="${CSS.escape(chosenOfferId)}"]`);
        if (restored) {
          restored.checked = true;
          // Setting checked from script fires nothing; quantity-offers needs
          // to hear it to lock or unlock the gifts for this tier.
          restored.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Variant changes replace rather than push: the back button should leave
      // the product page, not walk back through every swatch tried on the way.
      const clean = new URL(url, window.location.origin);
      clean.searchParams.delete('section_id');
      window.history.replaceState({}, '', clean.toString());

      this.restoreFocus(section, restoreFocusTo);
    } catch (error) {
      console.error(error);
      window.location.href = url;
    } finally {
      section.removeAttribute('aria-busy');
    }
  }

  /** Puts focus back on the option the shopper just activated. */
  restoreFocus(section, target) {
    if (!target || !target.position || !target.value) return;

    const selector = `a.variant-value[data-option-position="${CSS.escape(target.position)}"][data-option-value="${CSS.escape(target.value)}"]`;
    const link = section.querySelector(selector);
    if (link) link.focus();
  }
}
customElements.define('variant-picker', VariantPicker);

/**
 * Product form controller.
 *
 * The product form is a plain <form>; offer radios, the quantity input and the
 * buy buttons join it with form="…". A native submit already adds the chosen
 * variant and quantity. This only takes over when the cart needs more than one
 * line or a discount code, which a single form post cannot do:
 * - a free gift attached to the chosen offer tier
 * - bundle gifts the chosen tier unlocks (data-bundle-gift, enabled only)
 * - bonus products from the offer box (data-extra-variant-id)
 * - a discount code on the chosen tier
 *
 * If that request fails, the form is submitted natively instead. The shopper
 * still gets the main product, just without the extras, which they will see in
 * the cart before paying anything.
 */
class ProductFormController extends HTMLElement {
  connectedCallback() {
    this.form = document.getElementById(this.dataset.formId);
    if (!this.form || this.form.dataset.controlled) return;
    this.form.dataset.controlled = 'true';

    this.form.addEventListener('submit', (event) => {
      const plan = this.plan();
      if (plan.extras.length === 0 && !plan.discountCode) return;

      event.preventDefault();
      this.addAll(plan);
    });
  }

  /** Reads what the form is about to add, including everything outside it. */
  plan() {
    const elements = Array.from(this.form.elements);
    const variantField = elements.find((element) => element.name === 'id');
    const quantityField = elements.find(
      (element) => element.name === 'quantity' && (element.type !== 'radio' || element.checked)
    );

    const extras = [];
    let discountCode = '';

    if (quantityField && quantityField.type === 'radio') {
      if (quantityField.dataset.giftVariantId) extras.push(Number(quantityField.dataset.giftVariantId));
      discountCode = quantityField.dataset.discountCode || '';
    }

    for (const element of elements) {
      if (element.dataset.extraVariantId) extras.push(Number(element.dataset.extraVariantId));
      // Locked gifts are disabled by quantity-offers, so this is the whole
      // unlock check: the cart gets exactly what the page shows as unlocked.
      if ('bundleGift' in element.dataset && !element.disabled && element.value) {
        extras.push(Number(element.value));
      }
    }

    return {
      variantId: variantField ? Number(variantField.value) : null,
      quantity: quantityField ? Math.max(1, Number(quantityField.value) || 1) : 1,
      extras,
      discountCode,
    };
  }

  async addAll(plan) {
    if (!plan.variantId) {
      this.form.submit();
      return;
    }

    const items = [{ id: plan.variantId, quantity: plan.quantity }];
    for (const id of plan.extras) items.push({ id, quantity: 1 });

    this.form.setAttribute('aria-busy', 'true');

    try {
      const root = storeRoot();
      const response = await fetch(`${root}cart/add.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) throw new Error(`Add to cart failed: ${response.status}`);

      const cartUrl = `${root}cart`;
      // /discount/<code> stores the code on the session, then redirects; the
      // cart page shows it applied, so nothing is hidden until checkout.
      window.location.href = plan.discountCode
        ? `${root}discount/${encodeURIComponent(plan.discountCode)}?redirect=${encodeURIComponent(cartUrl)}`
        : cartUrl;
    } catch (error) {
      console.error(error);
      this.form.removeAttribute('aria-busy');
      // Native submit does not fire the submit event, so this cannot loop.
      this.form.submit();
    }
  }
}
customElements.define('product-form-controller', ProductFormController);

/**
 * Quantity offer tiers and the bundle gifts under them.
 *
 * The tiers are plain radios and need nothing from here. This keeps the gifts
 * in step with the chosen tier: a gift unlocks from tier data-unlock onward,
 * and a locked gift's cart input is disabled so the form controller skips it.
 * The server renders the same lock state for the default tier, so the page is
 * right before this runs.
 *
 * It also swaps a gift's picture and price when the shopper picks another
 * variant of it.
 */
class QuantityOffers extends HTMLElement {
  connectedCallback() {
    this.addEventListener('change', (event) => {
      if (event.target.matches('input[data-offer-index]')) this.syncGifts();
      if (event.target.matches('select[data-bundle-gift]')) this.showGiftVariant(event.target);
    });
    this.syncGifts();
  }

  /** 1-based position of the chosen tier, or 0 when there are no tiers. */
  selectedIndex() {
    const checked = this.querySelector('input[data-offer-index]:checked');
    return checked ? Number(checked.dataset.offerIndex) : 0;
  }

  syncGifts() {
    const index = this.selectedIndex();
    for (const gift of this.querySelectorAll('.gift[data-unlock]')) {
      const locked = index < Number(gift.dataset.unlock);
      gift.classList.toggle('is-locked', locked);
      gift.querySelectorAll('[data-bundle-gift]').forEach((input) => { input.disabled = locked; });
    }
  }

  showGiftVariant(select) {
    const option = select.selectedOptions[0];
    const gift = select.closest('.gift');
    if (!option || !gift) return;

    const image = gift.querySelector('.gift__image');
    if (image && option.dataset.image) {
      // The srcset was built for the first variant; drop it or the browser
      // keeps showing that one.
      image.removeAttribute('srcset');
      image.src = option.dataset.image;
    }

    const price = gift.querySelector('[data-gift-price]');
    if (price && option.dataset.price) {
      const label = price.querySelector('.visually-hidden');
      price.textContent = '';
      if (label) price.append(label, ' ');
      price.append(option.dataset.price);
    }
  }
}
customElements.define('quantity-offers', QuantityOffers);

/**
 * Sale countdown above the offer tiers.
 *
 * Counts down to a fixed end the merchant sets, in store time (data-offset is
 * the store's UTC offset at render, as in DeliveryEstimate). It stays hidden
 * when the end is missing, unreadable or already past, and hides itself when
 * it reaches zero. There is deliberately no per-visitor "evergreen" mode: a
 * timer that restarts for every visitor is a false claim about the sale.
 */
class SaleCountdown extends HTMLElement {
  connectedCallback() {
    this.text = this.querySelector('[data-countdown-text]');
    if (!this.text) return;
    this.endsAt = SaleCountdown.parseEnd(this.dataset.ends, this.dataset.offset);
    if (this.endsAt === null) {
      // Only the merchant, in the theme editor, hears about a typo.
      if (window.Shopify && window.Shopify.designMode) {
        this.text.textContent = `Sale end "${this.dataset.ends}" not recognised. Use YYYY-MM-DD HH:MM.`;
        this.hidden = false;
      }
      return;
    }
    this.render();
    this.timer = window.setInterval(() => this.render(), 1000);
  }

  disconnectedCallback() {
    window.clearInterval(this.timer);
  }

  /**
   * "2026-11-30 23:59", or a bare date meaning the end of that day, in store
   * wall time, to a UTC timestamp. Null when it does not parse.
   */
  static parseEnd(value, offset) {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec((value || '').trim());
    if (!match) return null;
    const [year, month, day] = [match[1], match[2], match[3]].map(Number);
    const hasTime = match[4] !== undefined;
    const hour = hasTime ? Number(match[4]) : 23;
    const minute = hasTime ? Number(match[5]) : 59;
    const second = hasTime ? 0 : 59;
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

    const zone = /^([+-])(\d{2})(\d{2})$/.exec(offset || '');
    const offsetMinutes = zone ? (zone[1] === '-' ? -1 : 1) * (Number(zone[2]) * 60 + Number(zone[3])) : 0;
    return Date.UTC(year, month - 1, day, hour, minute, second) - offsetMinutes * 60000;
  }

  render() {
    const remaining = this.endsAt - Date.now();
    if (remaining <= 0) {
      this.hidden = true;
      window.clearInterval(this.timer);
      return;
    }
    const seconds = Math.floor(remaining / 1000);
    const days = Math.floor(seconds / 86400);
    const pad = (n) => String(n).padStart(2, '0');
    const clock = `${pad(Math.floor(seconds / 3600) % 24)}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
    this.text.textContent = (this.dataset.text || '').replace('[time]', days > 0 ? `${days}d ${clock}` : clock);
    this.hidden = false;
  }
}
customElements.define('sale-countdown', SaleCountdown);

/**
 * Sticky buy bar: shown once the main buy button has scrolled up out of view,
 * hidden again when it comes back. Its own button submits the main form, so
 * the chosen variant and offer tier carry over.
 */
class StickyBuyBar extends HTMLElement {
  connectedCallback() {
    const section = this.closest('[data-section-id]');
    const mainButton = section && section.querySelector('[data-main-buy]');
    if (!mainButton || !('IntersectionObserver' in window)) return;

    this.observer = new IntersectionObserver(([entry]) => {
      // Only once the button is above the viewport: a bar appearing while the
      // shopper is still above the buy box would just cover the page.
      const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      this.hidden = !scrolledPast;
      document.body.classList.toggle('has-sticky-buy', scrolledPast);
    });
    this.observer.observe(mainButton);
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
    document.body.classList.remove('has-sticky-buy');
  }
}
customElements.define('sticky-buy-bar', StickyBuyBar);

/**
 * "Read more" for long text: clamps the content, and shows the button only
 * when there is actually more to read.
 */
class ReadMore extends HTMLElement {
  connectedCallback() {
    this.content = this.querySelector('.read-more__content');
    this.button = this.querySelector('.read-more__toggle');
    if (!this.content || !this.button) return;

    this.classList.add('is-clamped');
    requestAnimationFrame(() => {
      const overflowing = this.content.scrollHeight > this.content.clientHeight + 2;
      if (!overflowing) {
        this.classList.remove('is-clamped');
        return;
      }
      this.button.hidden = false;
      this.button.addEventListener('click', () => {
        const expanded = this.classList.toggle('is-clamped') === false;
        this.button.setAttribute('aria-expanded', String(expanded));
        this.button.hidden = expanded;
      });
    });
  }
}
customElements.define('read-more', ReadMore);

/**
 * Rotates announcement messages on narrow screens. Wide screens show them all
 * at once via CSS, so this does nothing there.
 */
class AnnouncementRotator extends HTMLElement {
  connectedCallback() {
    this.messages = Array.from(this.querySelectorAll('.announcement__message'));
    if (this.messages.length < 2 || prefersReducedMotion()) return;

    const seconds = Number(this.dataset.interval) || 4;
    this.index = 0;
    this.timer = window.setInterval(() => {
      if (window.matchMedia('(min-width: 750px)').matches) return;
      if (this.matches(':hover, :focus-within')) return;
      this.messages[this.index].classList.remove('is-active');
      this.index = (this.index + 1) % this.messages.length;
      this.messages[this.index].classList.add('is-active');
    }, seconds * 1000);
  }

  disconnectedCallback() {
    window.clearInterval(this.timer);
  }
}
customElements.define('announcement-rotator', AnnouncementRotator);

/**
 * Counts a figure up from zero the first time it scrolls into view.
 *
 * The real value is in the HTML, so search engines, screen readers and
 * visitors without JavaScript all get the true figure. Only figures that are
 * one number with optional text around it animate ("94%", "$1,200", "3,000+");
 * something like "3 in 4" is left exactly as written.
 */
class CountUp extends HTMLElement {
  connectedCallback() {
    if (this.started) return;
    const text = this.textContent.trim();
    const match = text.match(/^([^\d-]*)(-?[\d,]*\.?\d+)(\D*)$/);
    if (!match || prefersReducedMotion() || !('IntersectionObserver' in window)) return;

    const [, prefix, digits, suffix] = match;
    const target = parseFloat(digits.replace(/,/g, ''));
    if (!Number.isFinite(target)) return;

    const decimals = (digits.split('.')[1] || '').length;
    const grouped = digits.includes(',');
    const format = (value) =>
      prefix +
      value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: grouped,
      }) +
      suffix;

    // Screen readers get the real figure once; the moving digits are hidden
    // from them.
    this.textContent = '';
    const spoken = document.createElement('span');
    spoken.className = 'visually-hidden';
    spoken.textContent = text;
    this.display = document.createElement('span');
    this.display.setAttribute('aria-hidden', 'true');
    this.display.textContent = format(0);
    this.append(spoken, this.display);

    this.observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      this.observer.disconnect();
      this.started = true;
      const duration = 1200;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        this.display.textContent = format(progress === 1 ? target : target * eased);
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    this.observer.observe(this);
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
  }
}
customElements.define('count-up', CountUp);

/**
 * Delivery estimate: works out ship and delivery dates from the block's rules.
 *
 * Calendar maths runs on the store's wall clock (data-offset is the store's
 * UTC offset when the page was rendered), using Date objects whose UTC fields
 * hold that wall time. Weekends are skipped unless allowed. Public holidays
 * are not known, which is why the copy says "estimated".
 */
class DeliveryEstimate extends HTMLElement {
  connectedCallback() {
    this.render();
    this.timer = window.setInterval(() => this.render(), 30000);
  }

  disconnectedCallback() {
    window.clearInterval(this.timer);
  }

  storeNow() {
    const match = /^([+-])(\d{2})(\d{2})$/.exec(this.dataset.offset || '');
    const minutes = match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
    return new Date(Date.now() + minutes * 60000);
  }

  isWorkday(date) {
    if (this.dataset.weekends === 'true') return true;
    const day = date.getUTCDay();
    return day !== 0 && day !== 6;
  }

  addWorkdays(from, count) {
    const date = new Date(from);
    let added = 0;
    while (added < count) {
      date.setUTCDate(date.getUTCDate() + 1);
      if (this.isWorkday(date)) added += 1;
    }
    return date;
  }

  /** Pure date maths, separate from the DOM so it can be checked directly. */
  plan(now = this.storeNow()) {
    const cutoff = Number(this.dataset.cutoff);
    const processing = Number(this.dataset.processing);
    const beforeCutoff = this.isWorkday(now) && now.getUTCHours() < cutoff;

    // The first working day the order is handled on.
    const start = beforeCutoff ? now : this.addWorkdays(now, 1);
    const ships = processing === 0 ? start : this.addWorkdays(start, processing);
    const earliest = this.addWorkdays(ships, Number(this.dataset.min));
    const latest = this.addWorkdays(ships, Math.max(Number(this.dataset.max), Number(this.dataset.min)));

    let remaining = null;
    if (beforeCutoff) {
      const cutoffAt = new Date(now);
      cutoffAt.setUTCHours(cutoff, 0, 0, 0);
      remaining = cutoffAt - now;
    }
    return { ships, earliest, latest, remaining, now };
  }

  render() {
    const { ships, earliest, latest, remaining, now } = this.plan();
    const format = new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
      weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
    });
    const sameDay = (a, b) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
    const label = (date) => (sameDay(date, now) ? this.dataset.labelToday : format.format(date));

    const shipsEl = this.querySelector('[data-delivery-date="ships"]');
    const deliveredEl = this.querySelector('[data-delivery-date="delivered"]');
    if (shipsEl) shipsEl.textContent = label(ships);
    if (deliveredEl) {
      deliveredEl.textContent = sameDay(earliest, latest)
        ? format.format(earliest)
        : `${format.format(earliest)} – ${format.format(latest)}`;
    }

    const countdown = this.querySelector('[data-delivery-countdown]');
    if (!countdown) return;
    if (remaining === null || !this.dataset.countdown) {
      countdown.hidden = true;
      return;
    }
    const totalMinutes = Math.max(1, Math.ceil(remaining / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const time = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    countdown.textContent = this.dataset.countdown.replace('[time]', time).replace('[date]', label(ships));
    countdown.hidden = false;
  }
}
customElements.define('delivery-estimate', DeliveryEstimate);

/**
 * Level explorer: one level at a time, stepped with - and +. The ends are
 * real ends (no wrap-around): stepping past "strongest" back to "gentlest"
 * would misrepresent an intensity scale.
 */
class LevelExplorer extends HTMLElement {
  connectedCallback() {
    this.levels = Array.from(this.querySelectorAll('.level-explorer__level'));
    this.current = this.querySelector('[data-level-current]');
    this.buttons = Array.from(this.querySelectorAll('[data-level-step]'));
    if (this.levels.length === 0) return;

    this.classList.add('is-enhanced');
    this.addEventListener('click', (event) => {
      const button = event.target.closest('[data-level-step]');
      if (!button) return;
      this.show(this.index + Number(button.dataset.levelStep));
    });
    this.show(Math.max(0, this.levels.findIndex((level) => level.classList.contains('is-active'))));
  }

  show(index) {
    this.index = Math.min(Math.max(index, 0), this.levels.length - 1);
    this.levels.forEach((level, i) => level.classList.toggle('is-active', i === this.index));
    if (this.current) this.current.textContent = this.levels[this.index].dataset.levelLabel;
    const [less, more] = this.buttons;
    if (less) less.disabled = this.index === 0;
    if (more) more.disabled = this.index === this.levels.length - 1;
  }
}
customElements.define('level-explorer', LevelExplorer);

/**
 * Fetches Shopify's product recommendations for the related products section
 * when it nears the viewport. The response is this same section rendered with
 * the recommendations object populated. If there are none, it stays empty.
 */
class ProductRecommendations extends HTMLElement {
  connectedCallback() {
    if (this.loaded || this.children.length > 0 || !this.dataset.url) return;

    const load = async () => {
      this.loaded = true;
      try {
        const response = await fetch(this.dataset.url);
        if (!response.ok) return;
        const fresh = new DOMParser()
          .parseFromString(await response.text(), 'text/html')
          .querySelector('product-recommendations');
        if (fresh && fresh.innerHTML.trim()) this.innerHTML = fresh.innerHTML;
      } catch (error) {
        console.error(error);
      }
    };

    if (!('IntersectionObserver' in window)) {
      load();
      return;
    }
    this.observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      this.observer.disconnect();
      load();
    }, { rootMargin: '0px 0px 600px 0px' });
    this.observer.observe(this);
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
  }
}
customElements.define('product-recommendations', ProductRecommendations);

// Inside [data-one-player], starting one video pauses the rest. "play" does
// not bubble, hence the capture listener on the document.
document.addEventListener('play', (event) => {
  const video = event.target;
  if (!(video instanceof HTMLVideoElement)) return;
  const group = video.closest('[data-one-player]');
  if (!group) return;
  group.querySelectorAll('video').forEach((other) => {
    if (other !== video) other.pause();
  });
}, true);
