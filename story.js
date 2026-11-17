/*
 * « Notre histoire » — 3 phrases qui se révèlent l'une après l'autre, en boucle.
 *
 * Effet « mise au point » (split text) :
 *   - entrée : chaque lettre part floue, écartée depuis le centre de la phrase et
 *     légèrement agrandie, puis converge vers sa place en devenant nette
 *     (comme un objectif qui fait le point) ;
 *   - sortie : les lettres se dissolvent dans un ordre aléatoire en remontant.
 *
 * L'animation ne dépend pas du scroll : elle démarre quand la section devient
 * visible et se met en pause quand elle sort de l'écran.
 */
(function () {
    'use strict';

    const section = document.getElementById('notre-histoire');
    if (!section) return;

    const lines = Array.from(section.querySelectorAll('.story-line'));
    const chips = Array.from(section.querySelectorAll('.story-chip'));
    const steps = Array.from(section.querySelectorAll('.story-step'));
    if (!lines.length) return;

    const HOLD = 4.2;          // temps de lecture d'une phrase (secondes)
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Sans GSAP : on affiche simplement la première phrase
    if (typeof gsap === 'undefined') {
        lines[0].style.visibility = 'visible';
        return;
    }

    // ---------- Découpage en mots / lettres ----------
    const charsByLine = lines.map((line) => {
        const text = line.textContent.trim().replace(/\s+/g, ' ');
        line.textContent = '';
        line.style.position = 'relative';
        const chars = [];
        text.split(' ').forEach((word, wi, words) => {
            const w = document.createElement('span');
            w.className = 'w';
            for (const ch of word) {
                const c = document.createElement('span');
                c.className = 'c';
                c.textContent = ch;
                w.appendChild(c);
                chars.push(c);
            }
            line.appendChild(w);
            if (wi < words.length - 1) line.appendChild(document.createTextNode(' '));
        });
        return chars;
    });

    // Écart horizontal de départ : proportionnel à la distance au centre de la ligne
    function spreadFromCenter(el, line) {
        const center = el.offsetLeft + el.offsetWidth / 2;
        return (center - line.offsetWidth / 2) * 0.28;
    }

    const chipsOf = (i) => chips.filter((c) => Number(c.dataset.part) === i);
    const barOf = (i) => steps[i] && steps[i].querySelector('i');

    function setSteps(i) {
        steps.forEach((s, k) => {
            s.classList.toggle('active', k === i);
            const bar = s.querySelector('i');
            if (bar) gsap.set(bar, { '--p': k < i ? 1 : 0 });
        });
    }

    let current = null;
    let visible = false;
    let started = false;

    // ---------- Une phrase : entrée, lecture, sortie ----------
    function playPart(i) {
        const line = lines[i];
        const chars = charsByLine[i];
        const partChips = chipsOf(i);
        setSteps(i);

        const tl = gsap.timeline({
            onComplete: () => playPart((i + 1) % lines.length)
        });

        if (reduceMotion) {
            tl.set(line, { visibility: 'visible' })
                .fromTo(line, { opacity: 0 }, { opacity: 1, duration: 0.6 })
                .fromTo(partChips, { opacity: 0 }, { opacity: 1, duration: 0.6 }, '<')
                .to([line, ...partChips], { opacity: 0, duration: 0.6 }, `+=${HOLD + 1}`)
                .set(line, { visibility: 'hidden' });
        } else {
            // Performance : le flou est appliqué UNE fois sur la phrase entière ;
            // les lettres n'animent que transform + opacity (gérés par la carte graphique).
            tl.set(line, { visibility: 'visible', willChange: 'filter' })
                .set(chars, { willChange: 'transform, opacity' })
                .fromTo(line, { filter: 'blur(12px)' }, { filter: 'blur(0px)', duration: 1.6, ease: 'power2.out' }, 0)
                // Entrée « mise au point »
                .fromTo(chars, {
                    opacity: 0,
                    x: (k, el) => spreadFromCenter(el, line),
                    y: () => gsap.utils.random(-14, 14),
                    scale: 1.18
                }, {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    scale: 1,
                    duration: 1.3,
                    ease: 'expo.out',
                    stagger: { each: 0.012, from: 'center' }
                }, 0)
                // Phrase nette : on libère les ressources pendant la lecture
                .call(() => {
                    gsap.set(line, { clearProps: 'filter,willChange' });
                    gsap.set(chars, { clearProps: 'willChange' });
                })
                .fromTo(partChips, { opacity: 0, y: 14 },
                    { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.18 }, 0.4)
                // Sortie : dissolution aléatoire (flou sur la phrase, mouvement par lettre)
                .addLabel('out', `+=${HOLD}`)
                .set(chars, { willChange: 'transform, opacity' }, 'out')
                .to(line, { filter: 'blur(8px)', duration: 0.9, ease: 'power2.in' }, 'out')
                .to(chars, {
                    opacity: 0,
                    y: -16,
                    x: () => gsap.utils.random(-8, 8),
                    duration: 0.65,
                    ease: 'power2.in',
                    stagger: { each: 0.006, from: 'random' }
                }, 'out')
                .to(partChips, { opacity: 0, y: -10, duration: 0.45, ease: 'power2.in' }, 'out')
                .set(line, { visibility: 'hidden', clearProps: 'filter,willChange' })
                .set(chars, { clearProps: 'transform,opacity,willChange' });
        }

        // Barre de progression 01 / 02 / 03 synchronisée sur la phrase
        const bar = barOf(i);
        if (bar) tl.fromTo(bar, { '--p': 0 }, { '--p': 1, duration: tl.duration(), ease: 'none' }, 0);

        current = tl;
        if (!visible) tl.pause();
    }

    // ---------- Démarrage à l'affichage, pause hors écran ----------
    const observer = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible) {
            if (!started) {
                started = true;
                playPart(0);
            } else if (current) {
                current.resume();
            }
        } else if (current) {
            current.pause();
        }
    }, { threshold: 0.35 });

    observer.observe(section);
})();
