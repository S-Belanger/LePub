(function () {
  'use strict';

  const concepts = ['cinematic', 'noir', 'cozy', 'arcade'];
  const panels = Array.from(document.querySelectorAll('[data-concept]'));
  const selectors = Array.from(document.querySelectorAll('[data-select]'));
  const previewToggle = document.querySelector('[data-preview-toggle]');
  const assetError = document.querySelector('.asset-error');
  let activeIndex = Math.max(0, concepts.indexOf(location.hash.slice(1)));

  function selectConcept(nextIndex, updateHash) {
    activeIndex = (nextIndex + concepts.length) % concepts.length;
    const activeId = concepts[activeIndex];

    panels.forEach((panel) => {
      const selected = panel.dataset.concept === activeId;
      panel.hidden = !selected;
      panel.classList.toggle('is-active', selected);
    });

    selectors.forEach((selector) => {
      const selected = selector.dataset.select === activeId;
      selector.classList.toggle('is-active', selected);
      if (selector.getAttribute('role') === 'tab') {
        selector.setAttribute('aria-selected', String(selected));
        selector.tabIndex = selected ? 0 : -1;
      }
    });

    if (updateHash) history.replaceState(null, '', '#' + activeId);
  }

  function setPreview(enabled) {
    document.body.classList.toggle('preview-mode', enabled);
    previewToggle.textContent = enabled ? 'Exit preview' : 'Preview only ';
    if (!enabled) {
      const hint = document.createElement('kbd');
      hint.textContent = 'P';
      previewToggle.appendChild(hint);
    }
  }

  selectors.forEach((selector) => {
    selector.addEventListener('click', () => {
      selectConcept(concepts.indexOf(selector.dataset.select), true);
    });
  });

  previewToggle.addEventListener('click', () => {
    setPreview(!document.body.classList.contains('preview-mode'));
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (target.matches('input, textarea, select') || target.isContentEditable) return;

    if (/^[1-4]$/.test(event.key)) {
      event.preventDefault();
      selectConcept(Number(event.key) - 1, true);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectConcept(activeIndex + 1, true);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectConcept(activeIndex - 1, true);
    } else if (event.key.toLowerCase() === 'p') {
      event.preventDefault();
      setPreview(!document.body.classList.contains('preview-mode'));
    } else if (event.key === 'Escape' && document.body.classList.contains('preview-mode')) {
      setPreview(false);
    }
  });

  document.querySelectorAll('.concept-media img').forEach((image) => {
    image.addEventListener('error', () => {
      assetError.hidden = false;
    });
  });

  selectConcept(activeIndex, false);
})();
