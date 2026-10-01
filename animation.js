document.addEventListener('DOMContentLoaded', () => {
    // On enregistre le plugin ScrollTrigger une seule fois
    gsap.registerPlugin(ScrollTrigger);

    // --- NAVIGATION AUTO-HIDE (Disparaît au scroll vers le bas, réapparaît vers le haut) ---
    const nav = document.querySelector('nav');
    if (nav) {
        const showAnim = gsap.from(nav, {
            yPercent: -100,
            paused: true,
            duration: 0.3,
            ease: "power1.inOut"
        }).progress(1);

        ScrollTrigger.create({
            start: "top top",
            end: "max",
            onUpdate: (self) => {
                // Direction 1 = vers le bas (cacher), Direction -1 = vers le haut (afficher)
                if (self.direction === 1) {
                    showAnim.reverse();
                } else {
                    showAnim.play();
                }
            }
        });
    }

    // --- GESTION DU PRÉLOADER (Optimisé pour ne pas se répéter) ---
    const preloader = document.getElementById('preloader');
    const isPreloaderShown = sessionStorage.getItem('preloader_shown');

    if (isPreloaderShown && preloader) {
        preloader.style.display = 'none';
        document.body.style.overflow = '';
        gsap.set(['nav', 'main', 'footer'], { opacity: 1, filter: 'blur(0px)' });
    }

    const enterBtns = document.querySelectorAll('.enter-btn, #enter-button');
    const shopBtn = document.querySelector('.shop-btn');
    const preloaderContent = document.querySelector('.preloader-content');
    const preloaderSeq = document.getElementById('preloader-seq');
    const spinner = document.querySelector('.spinner');
    const body = document.body;

    if (!isPreloaderShown && preloader && enterBtns.length > 0 && preloaderSeq && spinner) {
        body.style.overflow = 'hidden';
        let contentHasBeenShown = false;

        // --- NOUVELLE LOGIQUE POUR LA SEQUENCE D'IMAGES (CI-DESSOUS) ---
        const totalFrames = 192; // 8 secondes à 24 FPS
        const frames = [];
        let loadedCount = 0;
        let currentFrame = 1;
        let direction = 1; // 1 pour avant, -1 pour arrière
        let animationId;

        // Fonction pour précharger toutes les images en mémoire
        const preloadImages = () => {
            for (let i = 1; i <= totalFrames; i++) {
                const img = new Image();
                img.src = `frame/${i}.jpg`;
                img.onload = () => {
                    loadedCount++;
                    if (loadedCount === Math.floor(totalFrames * 0.4) && !contentHasBeenShown) {
                        showPreloaderContent();
                    }
                };
                frames.push(img);
            }
        };

        const targetFPS = 24;
        const frameDuration = 1000 / targetFPS;
        let lastTimestamp = 0;

        const animateSequence = (timestamp) => {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const elapsed = timestamp - lastTimestamp;

            if (elapsed > frameDuration) {
                // Logique PING-PONG
                currentFrame += direction;

                if (currentFrame >= totalFrames) {
                    currentFrame = totalFrames;
                    direction = -1; // On repart en arrière
                } else if (currentFrame <= 1) {
                    currentFrame = 1;
                    direction = 1; // On repart en avant
                }

                preloaderSeq.src = frames[currentFrame - 1].src;
                lastTimestamp = timestamp - (elapsed % frameDuration);
            }
            animationId = requestAnimationFrame(animateSequence);
        };

        const showPreloaderContent = () => {
            if (contentHasBeenShown) return;
            contentHasBeenShown = true;

            spinner.style.display = 'none';

            // Démarrage de l'animation fluide via requestAnimationFrame
            animationId = requestAnimationFrame(animateSequence);

            gsap.to([preloaderSeq, ...enterBtns], {
                opacity: 1,
                duration: 0.6,
                stagger: 0.1,
                onComplete: () => {
                    enterBtns.forEach(btn => btn.style.pointerEvents = 'auto');
                }
            });
        };

        // Lancer le chargement
        preloadImages();

        // État initial synchronisé pour éviter les bugs d'affichage
        gsap.set(['nav', 'main', 'footer'], { opacity: 0, filter: 'blur(30px)' });

        // Lancement universel pour tous les boutons "Enter" (Shop & Documentation)
        if (shopBtn) {
            shopBtn.addEventListener('click', () => {
                hidePreloader();
                setTimeout(() => {
                    if (typeof lenis !== 'undefined') {
                        lenis.scrollTo('#image-gallery', { offset: -50 });
                    } else {
                        document.getElementById('image-gallery')?.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 600);
            });
        }

        const hidePreloader = () => {
            const tl = gsap.timeline({
                onComplete: () => {
                    body.style.overflow = '';
                    preloader.style.display = 'none';
                    cancelAnimationFrame(animationId);
                }
            });

            tl.to(preloaderContent, { opacity: 0, duration: 0.5, ease: 'power2.in' });
            tl.to(preloader, { yPercent: -100, duration: 1, ease: 'power3.inOut' }, '-=0.2');

            tl.fromTo(['nav', 'main', 'footer'],
                { filter: 'blur(20px)', opacity: 0 },
                {
                    filter: 'blur(0px)',
                    opacity: 1,
                    duration: 3,
                    ease: 'power2.out',
                    stagger: 0.1
                },
                '<'
            );
        };

        enterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetUrl = btn.getAttribute('href');
                const isExternal = targetUrl && targetUrl.includes('documentation');

                if (targetUrl) e.preventDefault();

                // Si c'est la documentation, on redirige automatiquement et instantanément
                sessionStorage.setItem('preloader_shown', 'true');
                if (isExternal) {
                    window.location.href = targetUrl;
                    return;
                }

                const tl = gsap.timeline({
                    onComplete: () => {
                        body.style.overflow = '';
                        preloader.style.display = 'none';
                        cancelAnimationFrame(animationId);
                    }
                });

                tl.to(preloaderContent, { opacity: 0, duration: 0.5, ease: 'power2.in' });
                tl.to(preloader, { yPercent: -100, duration: 1, ease: 'power3.inOut' }, '-=0.2');

                // Révélation cinématique 3s pour le Shop
                tl.fromTo(['nav', 'main', 'footer'],
                    { filter: 'blur(20px)', opacity: 0 },
                    {
                        filter: 'blur(0px)',
                        opacity: 1,
                        duration: 3,
                        ease: 'power2.out',
                        stagger: 0.1
                    },
                    '<'
                );
            });
        });
    }
    // --- FIN DE LA LOGIQUE DU PRÉLOADER ---

    // --- ANIMATION HERO SECTION (EN BOUCLE) ---
    // On ne lance cette animation que si les éléments existent
    if (document.querySelector('.dist-photo-wrapper')) {

        // On récupère uniquement les conteneurs de photos visibles
        const photoWrappers = gsap.utils.toArray('.dist-photo-wrapper').filter(
            wrapper => window.getComputedStyle(wrapper).display !== 'none'
        );
        const numPhotos = photoWrappers.length; // Nombre d'images à animer (4 ou 2)

        // Création d'une "timeline" GSAP pour une animation en boucle
        const tl = gsap.timeline({
            // --- MODIFICATIONS POUR L'ANIMATION INFINIE ET RAPIDE ---
            repeat: -1, // Répète l'animation à l'infini
            repeatDelay: 1.5, // Pause un peu plus longue entre chaque répétition
            defaults: {
                ease: 'power3.inOut',
                duration: 0.6 // Durée de chaque animation individuelle
            }
        });

        // --- NOUVELLE LOGIQUE D'ANIMATION SÉQUENTIELLE ---

        // 1. Animation d'apparition, une par une
        photoWrappers.forEach((container, i) => {
            tl.to(container, {
                opacity: 1,
                scale: 1,
                y: numPhotos === 2 ? 200 : 250, // Moins de déplacement vertical si 2 images
                x: (i - (numPhotos - 1) / 2) * (numPhotos === 2 ? 220 : 250) // Centrage dynamique
            }, ">-0.4"); // Le ">" indique de commencer à la fin de l'anim précédente
            // Le "-0.4" crée un léger chevauchement pour plus de fluidité
        });

        // Ajoute une pause de 1s avant la rotation
        tl.to({}, { duration: 1 });

        // 2. NOUVELLE ÉTAPE : Rotation pour afficher les images "verso"
        photoWrappers.forEach((container) => {
            tl.to(container, {
                rotationY: "+=180", // Fait tourner le conteneur de 180 degrés
                duration: 0.8,
                ease: 'back.inOut(1.7)'
            }, ">-0.5");
        });

        // Ajoute une pause de 5s pour voir les nouvelles images
        tl.to({}, { duration: 5 });

        // 3. Rotation inverse pour revenir aux images "recto"
        photoWrappers.forEach((container) => {
            tl.to(container, {
                rotationY: "+=180", // Fait tourner à nouveau pour revenir à l'état initial
                duration: 0.8,
                ease: 'back.inOut(1.7)'
            }, ">-0.5");
        });

        // 4. Animation de retour vers le centre, une par une
        photoWrappers.forEach((container) => {
            tl.to(container, {
                opacity: 0,
                scale: 0.5,
                y: 0, // Retourne à la position Y du centre
                x: 0  // Retourne à la position X du centre
            }, ">-0.4");
        });
    }

    // --- NOUVEAU : CHANGER LA COULEUR DE LA NAV SUR SECTIONS SOMBRES ---
    const darkSections = document.querySelectorAll('#a-propos, footer');
    const navElement = document.querySelector('nav');

    if (darkSections.length > 0 && navElement) {
        darkSections.forEach(section => {
            ScrollTrigger.create({
                trigger: section,
                start: 'top 61px', // 61px = hauteur de la nav + bordure
                end: 'bottom 61px',
                // Ajoute la classe 'nav-on-dark' à la nav quand elle entre dans la section
                onEnter: () => navElement.classList.add('nav-on-dark'),
                // Retire la classe quand elle sort
                onLeave: () => navElement.classList.remove('nav-on-dark'),
                // Fait la même chose en scrollant vers le haut
                onEnterBack: () => navElement.classList.add('nav-on-dark'),
                onLeaveBack: () => navElement.classList.remove('nav-on-dark')
            });
        });
    }

    // --- NOUVEAU : TRANSITION FOND NOIR VERS LE FOOTER & ANIMATION VIDEO FOOTER ---
    const mainFooter = document.getElementById('main-footer');
    const helpSection = document.getElementById('help'); // La section FAQ

    if (helpSection) {
        // Animation du fond d'écran et du texte uniquement pour la section FAQ
        gsap.to(helpSection, {
            backgroundColor: '#000000',
            color: '#ffffff',
            scrollTrigger: {
                trigger: helpSection,
                start: 'top 40%', // Commence quand on est bien entré dans la FAQ
                end: 'bottom bottom', // Fini à la fin de la FAQ
                scrub: true
            }
        });

        // Animer aussi le texte interne pour qu'il reste lisible
        gsap.to(helpSection.querySelectorAll('h2, h3, p'), {
            color: '#ffffff',
            scrollTrigger: {
                trigger: helpSection,
                start: 'top 40%',
                end: 'bottom bottom',
                scrub: true
            }
        });
    }

    if (mainFooter) {
        mainFooter.style.backgroundColor = '#000000'; // S'assurer que le footer est bien noir

        // Animation de la séquence vidéo dans le footer
        const footerBgSeq = document.getElementById('footer-bg-seq');
        if (footerBgSeq) {
            let footerCurrentFrame = 1;
            let footerDirection = 1;
            let footerAnimationId;
            let footerLastTimestamp = 0;
            const targetFPS = 24;
            const frameDuration = 1000 / targetFPS;

            const animateFooterSequence = (timestamp) => {
                if (!footerLastTimestamp) footerLastTimestamp = timestamp;
                const elapsed = timestamp - footerLastTimestamp;

                if (elapsed > frameDuration) {
                    footerCurrentFrame += footerDirection;

                    if (footerCurrentFrame >= 192) {
                        footerCurrentFrame = 192;
                        footerDirection = -1;
                    } else if (footerCurrentFrame <= 1) {
                        footerCurrentFrame = 1;
                        footerDirection = 1;
                    }

                    footerBgSeq.src = `frame/${footerCurrentFrame}.jpg`;
                    footerLastTimestamp = timestamp - (elapsed % frameDuration);
                }
                footerAnimationId = requestAnimationFrame(animateFooterSequence);
            };

            // Démarrer l'animation uniquement quand le footer est visible
            ScrollTrigger.create({
                trigger: mainFooter,
                start: 'top bottom',
                onEnter: () => footerAnimationId = requestAnimationFrame(animateFooterSequence),
                onLeaveBack: () => cancelAnimationFrame(footerAnimationId)
            });
        }
    }

    // --- CODE POUR LE MENU BURGER ---
    const burger = document.querySelector('.burger');
    if (burger) {
        const navLinks = document.querySelector('.nav-links');
        const navContainer = document.querySelector('.nav-container');
        burger.addEventListener('click', () => {
            navLinks.classList.toggle('nav-active');
            navContainer.classList.toggle('toggle');
        });
    }

    // --- CODE POUR LE SCROLLYTELLING ---
    const steps = document.querySelectorAll('.step');
    if (steps.length > 0) {
        // NOUVEAU : Logique pour déplacer les images sur mobile
        if (window.innerWidth <= 768) {
            const imagesToMove = document.querySelectorAll('.scrolly-images .scrolly-image');
            imagesToMove.forEach(img => {
                const stepNumber = img.dataset.step;
                const targetStep = document.querySelector(`.step[data-step="${stepNumber}"]`);
                if (targetStep) {
                    targetStep.appendChild(img); // Déplace l'image dans le paragraphe
                }
            });
        }

        const isMobile = window.innerWidth <= 768;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const stepNumber = entry.target.dataset.step;
                    // Cible uniquement les images pertinentes pour la taille de l'écran
                    const imagesToAnimate = isMobile
                        ? document.querySelectorAll('.step .scrolly-image')
                        : document.querySelectorAll('.scrolly-images .scrolly-image');

                    imagesToAnimate.forEach(img => {
                        img.classList.toggle('active', img.dataset.step === stepNumber);
                    });
                }
            });
        }, { threshold: 0.5 });

        steps.forEach(step => {
            observer.observe(step);
        });
    }

    // --- OPTIMISATION FLUIDITÉ (LENIS + GSAP SYNC) ---
    const lenis = new Lenis({
        duration: 1.0, // Réduit de 2.2s à 1.0s pour un scroll réactif et ultra-fluide sans inertie lourde
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
    });
    window.lenis = lenis; // Expose globally so popup can stop/start scroll

    // Synchronisation vitale pour éliminer les saccades
    lenis.on('scroll', ScrollTrigger.update);

    // --- NOUVEAU : Animation de la Custom Scrollbar ---
    const customScrollDot = document.getElementById('scroll-dot');
    const customScrollLine = document.getElementById('custom-scroll');
    if (customScrollDot && customScrollLine) {
        lenis.on('scroll', (e) => {
            const maxScroll = customScrollLine.clientHeight - customScrollDot.clientHeight;
            const translateY = e.progress * maxScroll;
            customScrollDot.style.transform = `translate(-50%, ${translateY}px)`;
        });
    }

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // --- GESTION DYNAMIQUE DU GALLERY-SHOP (HORIZONTAL CATEGORY ROWS) ---
    const loadMoreBtn = document.getElementById('load-more-gallery');
    const productModal = document.getElementById('product-modal');

    let allProducts = [];
    let filteredProducts = [];
    let itemsPerBatch = 999; /* Affiche tous les produits d'un coup puisque le bouton est supprimé */
    let displayedCount = 0;

    const createGalleryCard = (product) => {
        const card = document.createElement('div');
        card.id = 'product-card-' + product.id;
        card.classList.add('gallery-card');

        const isSoldOut = parseInt(product.stock_qty || 0) <= 0;
        const badgeHtml = isSoldOut
            ? `<span class="sold-out-badge" style="position: absolute; top: 15px; left: 15px; background: #ff5252; color: #fff; padding: 4px 10px; font-size: 0.75rem; font-weight: bold; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 10px rgba(255,82,82,0.4); z-index: 10;">Sold Out</span>`
            : '';

        card.style.position = 'relative';
        card.innerHTML = `
            ${badgeHtml}
            <img src="${product.image_url}" alt="${product.name}" style="${isSoldOut ? 'filter: grayscale(0.8) opacity(0.7);' : ''}">
            <div class="gallery-card-info">
                <h3>${product.name || 'Produit'}</h3>
                <p>${product.price} FCFA</p>
            </div>
        `;
        card.addEventListener('click', () => (window.openProductModal || _openProductModalInternal)(product));
        return card;
    };

    const createGalleryHorizontalCard = (product) => {
        const card = document.createElement('div');
        card.id = 'product-card-horiz-' + product.id;
        card.classList.add('gallery-horizontal-card');

        const isSoldOut = parseInt(product.stock_qty || 0) <= 0;
        const badgeHtml = isSoldOut
            ? `<span class="sold-out-badge" style="position: absolute; top: 15px; left: 15px; background: #ff5252; color: #fff; padding: 4px 10px; font-size: 0.75rem; font-weight: bold; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 10px rgba(255,82,82,0.4); z-index: 10;">Sold Out</span>`
            : '';

        card.innerHTML = `
            <div class="gallery-horizontal-card-visual">
                ${badgeHtml}
                <img src="${product.image_url}" alt="${product.name}" style="${isSoldOut ? 'filter: grayscale(0.8) opacity(0.7);' : ''}">
            </div>
            <div class="gallery-horizontal-card-info">
                <h3>${product.name || 'Produit'}</h3>
                <p>${product.price} FCFA</p>
            </div>
        `;
        card.addEventListener('click', () => (window.openProductModal || _openProductModalInternal)(product));
        return card;
    };

    // GALERIE DYNAMIQUE : 2 colonnes sur mobile (<= 900px), 3 colonnes sur desktop (> 900px)
    const distributeProducts = (productsToShow, append = false) => {
        const isMobile = window.innerWidth <= 900;
        const numCols = isMobile ? 2 : 3;

        const col1 = document.getElementById('col-1');
        const col2 = document.getElementById('col-2');
        const col3 = document.getElementById('col-3');

        if (col3) {
            col3.style.display = isMobile ? 'none' : 'flex';
        }

        const activeCols = isMobile ? [col1, col2] : [col1, col2, col3];

        if (!append) {
            [col1, col2, col3].forEach(col => { if (col) col.innerHTML = ''; });
        }

        let newCards = [];
        productsToShow.forEach((product, index) => {
            const colIndex = index % numCols;
            if (activeCols[colIndex]) {
                const card = createGalleryCard(product);
                activeCols[colIndex].appendChild(card);
                if (append) newCards.push(card);
            }
        });

        if (newCards.length > 0) {
            gsap.from(newCards, { y: 80, opacity: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out', clearProps: 'all' });
        }
        ScrollTrigger.refresh();
        requestAnimationFrame(initCardParallax);
    };

    // NOUVELLE GALERIE : Lignes par catégories (Horizontales)
    const distributeProductsHorizontal = (productsToShow) => {
        const container = document.querySelector('.gallery-horizontal-container');
        if (!container) return;

        container.innerHTML = ''; // Nettoyer l'ancien contenu

        // Grouper les produits par catégorie
        const grouped = productsToShow.reduce((acc, product) => {
            const cat = product.category || 'Autres';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(product);
            return acc;
        }, {});

        // Créer une ligne pour chaque catégorie
        Object.entries(grouped).forEach(([category, products]) => {
            const section = document.createElement('div');
            section.classList.add('category-row');

            const title = document.createElement('h3');
            title.classList.add('category-row-title');
            title.textContent = category;
            section.appendChild(title);

            const scrollContainer = document.createElement('div');
            scrollContainer.classList.add('category-scroll-container');

            products.forEach(product => {
                const card = createGalleryHorizontalCard(product);
                scrollContainer.appendChild(card);
            });

            // Boutons de navigation (Flèches)
            const leftBtn = document.createElement('button');
            leftBtn.classList.add('scroll-btn', 'scroll-left');
            leftBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            leftBtn.style.display = 'none'; // Caché au début

            const rightBtn = document.createElement('button');
            rightBtn.classList.add('scroll-btn', 'scroll-right');
            rightBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';

            // Actions de scroll
            const scrollAmount = window.innerWidth > 900 ? 400 : 250;
            leftBtn.addEventListener('click', () => {
                scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            });
            rightBtn.addEventListener('click', () => {
                scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            });

            // Mise à jour de la visibilité des boutons ET Parallaxe Horizontale au Drag / Slide
            const updateRowEffects = () => {
                const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
                // Affiche "Gauche" si on n'est pas au début
                leftBtn.style.display = scrollContainer.scrollLeft > 10 ? 'flex' : 'none';
                // Affiche "Droite" si on n'est pas à la fin
                rightBtn.style.display = scrollContainer.scrollLeft < maxScroll - 10 ? 'flex' : 'none';

                // Parallaxe horizontale sur les images lors du glissement (slide / drag)
                const containerRect = scrollContainer.getBoundingClientRect();
                const cards = scrollContainer.querySelectorAll('.gallery-horizontal-card');
                cards.forEach(card => {
                    const cardRect = card.getBoundingClientRect();
                    if (cardRect.right > 0 && cardRect.left < window.innerWidth) {
                        const relativePos = ((cardRect.left + cardRect.width / 2) - containerRect.left) / containerRect.width;
                        const shiftPercent = (relativePos - 0.5) * -16; // Varié de -8% à +8%
                        const img = card.querySelector('.gallery-horizontal-card-visual img');
                        if (img) {
                            img.style.transform = `translateX(${shiftPercent}%)`;
                        }
                    }
                });
            };

            scrollContainer.addEventListener('scroll', updateRowEffects, { passive: true });
            // Initialisation après le rendu pour s'assurer des bonnes largeurs
            setTimeout(updateRowEffects, 200);
            window.addEventListener('resize', updateRowEffects);

            section.appendChild(title);
            section.appendChild(scrollContainer);
            section.appendChild(leftBtn);
            section.appendChild(rightBtn);
            container.appendChild(section);
        });

        // Apparition GSAP des lignes
        const categoryRows = document.querySelectorAll('.category-row');
        if (categoryRows.length > 0) {
            gsap.from(categoryRows, {
                y: 50,
                opacity: 0,
                duration: 0.8,
                stagger: 0.2,
                ease: 'power3.out',
                clearProps: 'all'
            });
        }
    };

    // Animation de Loop Infini pour le Titre
    const initTitleMarquee = () => {
        const wrapper = document.querySelector('.section-title-wrapper');
        const titles = document.querySelectorAll('.section-title');
        if (!wrapper || titles.length === 0) return;

        const singleTitleWidth = titles[0].offsetWidth + 50; // Inclut le padding-right

        gsap.to('.section-title', {
            x: `-=${singleTitleWidth}`,
            duration: 15,
            ease: "none",
            repeat: -1,
            modifiers: {
                x: gsap.utils.unitize(x => parseFloat(x) % singleTitleWidth)
            }
        });
    };
    initTitleMarquee();

    const filterGallery = (category) => {
        filteredProducts = category === 'tout'
            ? allProducts
            : allProducts.filter(p => p.category.toLowerCase() === category.toLowerCase());

        displayedCount = 0;
        // On met à jour uniquement la galerie Masonry du haut via les filtres !
        distributeProducts(filteredProducts.slice(0, itemsPerBatch));
    };

    const productView = document.getElementById('product-view');
    const mainSections = ['home', 'image-gallery', 'help'];
    const heroHeader = document.querySelector('header');

    let lastScrollPosition = 0;

    const _openProductModalInternal = (product) => {
        if (!product) return;
        currentProduct = product;

        // Save scroll position correctly with Lenis if it exists
        if (typeof lenis !== 'undefined') {
            lastScrollPosition = lenis.scroll;
        } else {
            lastScrollPosition = window.scrollY;
        }
        console.log("Saving scroll position:", lastScrollPosition);

        // LOCK SCROLL
        document.body.style.overflow = 'hidden';
        if (typeof lenis !== 'undefined') lenis.stop();

        if (productView) {
            productView.style.display = 'block';
            productView.style.opacity = '1';
            productView.scrollTop = 0; // Ensure modal starts at top

            gsap.fromTo(productView, { opacity: 0 }, { opacity: 1, duration: 0.3 });

            // Robust parsing of gallery
            let galleryArray = [];
            try {
                if (product.gallery) {
                    if (typeof product.gallery === 'string' && product.gallery.trim() !== "") {
                        if (product.gallery.trim().startsWith('[')) {
                            galleryArray = JSON.parse(product.gallery);
                        } else {
                            galleryArray = [product.gallery];
                        }
                    } else if (Array.isArray(product.gallery)) {
                        galleryArray = product.gallery;
                    }
                }
            } catch (e) { console.error("Gallery parse error:", e); }

            const allImgs = [product.image_url, ...galleryArray].filter(u => u && typeof u === 'string' && u.trim() !== "");

            let galleryHtml = "";
            if (allImgs.length > 1) {
                galleryHtml = `<div class="shop-product-gallery">`;
                allImgs.forEach(url => {
                    galleryHtml += `<img src="${url}" class="shop-gallery-thumb ${url === product.image_url ? 'active' : ''}" 
                                                onclick="document.getElementById('zoom-img-v2').src='${url}'; 
                                                         document.querySelectorAll('.shop-gallery-thumb').forEach(t=>t.classList.remove('active')); 
                                                         this.classList.add('active');">`;
                });
                galleryHtml += `</div>`;
            }

            const isSoldOut = parseInt(product.stock_qty || 0) <= 0;
            const soldOutBadgeHtml = isSoldOut
                ? `<span class="prod-soldout-badge" style="color: #ff5252; background: rgba(255,82,82,0.1); border: 1px solid rgba(255,82,82,0.3); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; margin-left: 10px; display: inline-flex; align-items: center; gap: 5px;"><i class="fas fa-exclamation-triangle"></i> SOLD OUT</span>`
                : '';
            const buyBtnHtml = isSoldOut
                ? `<button class="buy-now-btn" id="go-to-checkout" disabled style="background: #333; color: #888; border: 1px solid #444; cursor: not-allowed; box-shadow: none;">Rupture de Stock (Sold Out)</button>`
                : `<button class="buy-now-btn" id="go-to-checkout">Commander maintenant</button>`;

            productView.innerHTML = `
                        <div class="product-page-container">
                            <button class="back-to-shop" onclick="closeProductView()">← Retour à la boutique</button>
                            
                            <div class="product-page-content" id="order-step-1">
                                <div class="product-page-visual">
                                    <div class="zoom-container-v2">
                                        <img src="${product.image_url}" alt="${product.name}" id="zoom-img-v2">
                                    </div>
                                    ${galleryHtml}
                                </div>
                                <div class="product-page-details">
                                    <h1 class="prod-title">${product.name}</h1>
                                    <div class="prod-meta">
                                        <span class="prod-price">${product.price} FCFA</span>
                                        <span class="prod-cat">${product.category}</span>
                                        ${soldOutBadgeHtml}
                                    </div>
                                    <p class="prod-desc">${product.description || 'Une pièce unique signée Made in Lo.'}</p>
                                    
                                    <div class="size-selector-v2">
                                        <p>Taille :</p>
                                        <div class="size-btns">
                                            <button class="s-btn active">S</button>
                                            <button class="s-btn">M</button>
                                            <button class="s-btn">L</button>
                                            <button class="s-btn">XL</button>
                                        </div>
                                    </div>
                                    
                                    ${buyBtnHtml}
                                </div>
                            </div>

                            <!-- STEP 2: Checkout Form -->
                            <div class="checkout-form-container" id="order-step-2" style="display:none;">
                                <button class="back-to-details" id="back-to-step1">← Retour aux détails</button>
                                <h2>Finaliser votre commande</h2>
                                <p class="checkout-subtitle">Veuillez remplir vos informations pour confirmer l'achat de : <strong>${product.name}</strong></p>
                                
                                <form id="direct-checkout-form" class="direct-checkout-form">
                                    <div class="form-group-v2">
                                        <label>Nom complet</label>
                                        <input type="text" id="chk-name" placeholder="Ex: Jean Dupont" required>
                                    </div>
                                    <div class="form-group-v2">
                                        <label>WhatsApp / Téléphone</label>
                                        <input type="tel" id="chk-phone" placeholder="Ex: +228 90..." required>
                                    </div>
                                    <div class="form-group-v2">
                                        <label>Adresse de livraison</label>
                                        <textarea id="chk-address" placeholder="Ex: Lomé, Quartier Hedzranawoé" rows="3" required></textarea>
                                    </div>
                                    
                                    <div class="checkout-summary">
                                        <span>Total à payer :</span>
                                        <strong>${product.price} FCFA</strong>
                                    </div>
                                    
                                    <button type="submit" class="confirm-order-btn">Confirmer par WhatsApp</button>
                                </form>
                            </div>
                        </div>
                    `;

            // Handle Step Transitions
            const step1 = productView.querySelector('#order-step-1');
            const step2 = productView.querySelector('#order-step-2');
            const btnCheckout = productView.querySelector('#go-to-checkout');
            const btnBack = productView.querySelector('#back-to-step1');
            const checkoutForm = productView.querySelector('#direct-checkout-form');

            btnCheckout.onclick = () => {
                gsap.to(step1, {
                    opacity: 0, duration: 0.3, onComplete: () => {
                        step1.style.display = 'none';
                        step2.style.display = 'block';
                        gsap.fromTo(step2, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
                    }
                });
            };

            btnBack.onclick = () => {
                gsap.to(step2, {
                    opacity: 0, duration: 0.3, onComplete: () => {
                        step2.style.display = 'none';
                        step1.style.display = 'flex';
                        gsap.fromTo(step1, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
                    }
                });
            };

            checkoutForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('chk-name').value;
                const phone = document.getElementById('chk-phone').value;
                const address = document.getElementById('chk-address').value;
                const size = productView.querySelector('.s-btn.active')?.innerText || 'M';

                const message = `Bonjour Made in Lo, je souhaite commander :\n\n` +
                    `Produit : ${product.name}\n` +
                    `Prix : ${product.price} FCFA\n` +
                    `Taille : ${size}\n\n` +
                    `Client : ${name}\n` +
                    `Tel : ${phone}\n` +
                    `Adresse : ${address}`;

                const waUrl = `https://wa.me/22870894072?text=${encodeURIComponent(message)}`;
                window.open(waUrl, '_blank');
            };

            // Size selection logic
            productView.querySelectorAll('.s-btn').forEach(btn => {
                btn.onclick = () => {
                    productView.querySelectorAll('.s-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                };
            });

            // Zoom logic for the new view
            const zoomContainer = productView.querySelector('.zoom-container-v2');
            const zoomImg = productView.querySelector('#zoom-img-v2');
            if (zoomContainer && zoomImg) {
                zoomContainer.onmousemove = (e) => {
                    const { left, top, width, height } = zoomContainer.getBoundingClientRect();
                    const x = ((e.clientX - left) / width) * 100;
                    const y = ((e.clientY - top) / height) * 100;
                    zoomImg.style.transformOrigin = `${x}% ${y}%`;
                    zoomImg.style.transform = "scale(2)";
                };
                zoomContainer.onmouseleave = () => {
                    zoomImg.style.transform = "scale(1)";
                };
            }
            // Reset modal internal scroll
            productView.scrollTop = 0;
        }
    };

    window.closeProductView = () => {
        if (productView) {
            gsap.to(productView, {
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                    productView.style.display = 'none';

                    // UNLOCK SCROLL
                    document.body.style.overflow = '';
                    if (typeof lenis !== 'undefined') lenis.start();

                    ScrollTrigger.refresh();

                    // FAILSAFE: Force scroll to the product we just left
                    const targetId = 'product-card-' + currentProduct.id;
                    const targetCard = document.getElementById(targetId) ||
                        document.getElementById('product-card-horiz-' + currentProduct.id);

                    if (targetCard) {
                        if (typeof lenis !== 'undefined') {
                            lenis.scrollTo(targetCard, { offset: -150, immediate: true });
                        } else {
                            targetCard.scrollIntoView({ behavior: 'auto', block: 'center' });
                        }
                    }
                }
            });
        }
    };

    // Listeners Modal Steps
    document.getElementById('btn-commander')?.addEventListener('click', () => {
        document.getElementById('modal-step-1').style.display = 'none';
        document.getElementById('modal-step-2').style.display = 'block';
        resetOrderSubsections();
    });

    document.getElementById('btn-back-step1')?.addEventListener('click', () => {
        document.getElementById('modal-step-1').style.display = 'block';
        document.getElementById('modal-step-2').style.display = 'none';
    });

    function resetOrderSubsections() {
        document.getElementById('pickup-section').style.display = 'none';
        document.getElementById('delivery-section').style.display = 'none';
        document.getElementById('order-confirm').style.display = 'none';
        document.querySelectorAll('.delivery-option-btn').forEach(b => b.classList.remove('active'));
    }

    // Retrait en Shop
    document.getElementById('btn-pickup')?.addEventListener('click', () => {
        resetOrderSubsections();
        document.getElementById('btn-pickup').classList.add('active');
        document.getElementById('pickup-section').style.display = 'block';
        initShopMap();
    });

    // Livraison
    document.getElementById('btn-delivery')?.addEventListener('click', () => {
        resetOrderSubsections();
        document.getElementById('btn-delivery').classList.add('active');
        document.getElementById('delivery-section').style.display = 'block';
    });

    // LOGIQUE CARTE LEAFLET DARK MODE
    function initShopMap() {
        if (shopMap) shopMap.remove();

        // Centrage sur Lomé
        shopMap = L.map('shop-map').setView([6.1319, 1.2228], 13);

        // Tiles Premium Dark (CartoDB DarkMatter)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: 'Made in Lo'
        }).addTo(shopMap);

        // Charger les shops depuis l'API
        fetch('api/shops.php')
            .then(res => {
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const contentType = res.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) throw new Error('Non-JSON response');
                return res.json();
            })
            .then(shops => {
                const shopListContainer = document.getElementById('shop-list');
                shopListContainer.innerHTML = '';

                shops.forEach(shop => {
                    const isHq = (shop.is_primary == 1);
                    const markerColor = isHq ? "#ff5252" : "#D4AF37";
                    const markerRadius = isHq ? 11 : 7;

                    // Custom Gold/Red Marker
                    const marker = L.circleMarker([shop.lat, shop.lng], {
                        radius: markerRadius,
                        fillColor: markerColor,
                        color: "#fff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.95
                    }).addTo(shopMap);

                    marker.bindPopup(isHq
                        ? `<b>⭐ Boutique Principale (QG)</b><br><strong>${shop.name}</strong><br>${shop.address}`
                        : `<b>🏠 ${shop.name}</b><br>${shop.address}`
                    );

                    // Rayon de livraison (5 km) - UNIQUEMENT pour le QG
                    if (isHq) {
                        const circle = L.circle([shop.lat, shop.lng], {
                            radius: 5000,
                            color: '#ff5252',
                            fillColor: '#ff5252',
                            fillOpacity: 0.08,
                            weight: 1.5
                        }).addTo(shopMap);

                        // Ajuster le rayon du cercle pour qu'il s'agrandisse quand on dézoome (zone distante)
                        shopMap.on('zoomend', function () {
                            const zoom = shopMap.getZoom();
                            let newRadius = 5000;
                            if (zoom < 10) newRadius = 25000;
                            else if (zoom === 10) newRadius = 15000;
                            else if (zoom === 11) newRadius = 10000;
                            else if (zoom === 12) newRadius = 5000;
                            else if (zoom === 13) newRadius = 3000;
                            else newRadius = 1500;
                            circle.setRadius(newRadius);
                        });
                    }

                    // Create Shop Card
                    const card = document.createElement('div');
                    card.classList.add('shop-card');
                    card.innerHTML = `
                        <div class="shop-card-info">
                            <h4>${shop.name}</h4>
                            <p>${shop.address}</p>
                        </div>
                        <button class="shop-card-action">Choisir</button>
                    `;
                    card.addEventListener('click', () => confirmOrder('pickup', shop));
                    shopListContainer.appendChild(card);
                });
            });
    }

    // FORMULAIRE LIVRAISON
    document.getElementById('delivery-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        confirmOrder('delivery');
    });

    function confirmOrder(type, shop = null) {
        const orderData = {
            action: type,
            product_id: currentProduct.id,
            product_name: currentProduct.name,
            size: document.querySelector('.size-btn.active')?.textContent || 'M'
        };

        if (type === 'delivery') {
            orderData.client_name = document.getElementById('del-name').value;
            orderData.client_phone = document.getElementById('del-phone').value;
            orderData.client_address = document.getElementById('del-address').value;
        } else {
            orderData.shop_id = shop.id;
            orderData.shop_name = shop.name;
        }

        fetch('api/orders.php', {
            method: 'POST',
            body: JSON.stringify(orderData)
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    document.getElementById('pickup-section').style.display = 'none';
                    document.getElementById('delivery-section').style.display = 'none';
                    document.querySelector('.delivery-options').style.display = 'none';
                    document.getElementById('order-confirm').style.display = 'block';
                    document.getElementById('confirm-message').textContent =
                        type === 'delivery' ? 'Votre demande de livraison a été enregistrée. Nous vous contacterons sous peu.'
                            : `Votre réservation au shop "${shop.name}" est confirmée !`;
                }
            });
    }

    // Gestion des clics sur le bouton Retour de la vue produit
    // (Géré directement par l'attribut onclick dans le HTML généré)

    // Zoom Haute Précision (Pro)
    const zoomContainer = document.querySelector('.zoom-container');
    const zoomImg = document.getElementById('modal-img');

    if (zoomContainer && zoomImg) {
        zoomContainer.addEventListener('mousemove', (e) => {
            const { left, top, width, height } = zoomContainer.getBoundingClientRect();
            const x = ((e.clientX - left) / width) * 100;
            const y = ((e.clientY - top) / height) * 100;

            zoomImg.style.transformOrigin = `${x}% ${y}%`;
            zoomImg.style.transform = "scale(2.5)";
        });

        zoomContainer.addEventListener('mouseleave', () => {
            zoomImg.style.transform = "scale(1)";
            zoomImg.style.transformOrigin = "center center";
        });
    }

    // Gestion du bouton "Précédent" du navigateur
    window.addEventListener('popstate', (e) => {
        if (productView && productView.style.display === 'block') {
            window.closeProductView();
        }
    });

    // --- CHARGEMENT DEPUIS L'API PHP ---
    fetch('api/products.php')
        .then(res => {
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) throw new Error('Non-JSON response');
            return res.json();
        })
        .then(data => {
            if (Array.isArray(data)) {
                allProducts = data;
                filterGallery('tout'); // Remplit la grille Masonry
                distributeProductsHorizontal(allProducts); // Remplit les lignes Horizontales en dessous

                // Vérifier si un produit est dans l'URL au chargement
                const hash = window.location.hash;
                if (hash.startsWith('#product-')) {
                    const id = parseInt(hash.replace('#product-', ''));
                    const product = allProducts.find(p => p.id === id);
                    if (product) openProductModal(product);
                }

                // Lance le parallax sur les cartes après rendu
                requestAnimationFrame(() => {
                    requestAnimationFrame(initCardParallax);
                });
            } else {
                console.error("Erreur API:", data.error || "Format invalide");
            }
        })
        .catch(err => console.error("Erreur chargement API:", err.message || err));

    // Listeners Filtres
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterGallery(btn.dataset.category);
        });
    });

    // Reveal animations
    const revealSections = (selector) => {
        if (!selector || typeof selector !== 'string') return;
        const elements = gsap.utils.toArray(selector);
        if (elements.length === 0) return;

        elements.forEach(el => {
            if (!el) return;
            gsap.from(el, {
                y: 50,
                opacity: 0,
                duration: 1,
                scrollTrigger: {
                    trigger: el,
                    start: 'top 90%'
                }
            });
        });
    };
    revealSections('.footer-column');

    // --- BURGER MENU LOGIC ---
    const mobileBurgerMenu = document.querySelector('.burger');
    const mainNav = document.querySelector('nav');

    if (mobileBurgerMenu && mainNav) {
        mobileBurgerMenu.addEventListener('click', () => {
            mobileBurgerMenu.classList.toggle('toggle');
            mainNav.classList.toggle('nav-active');
        });

        // Fermer le menu lors d'un clic sur un lien
        const navLinks = document.querySelectorAll('.nav-left a, .nav-right a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileBurgerMenu.classList.remove('toggle');
                mainNav.classList.remove('nav-active');
            });
        });
    }
});

// ─── PARALLAX IMAGE DANS LES CARTES ──────────────────────────────────────────
// Zoom IN quand la carte entre dans le viewport → Dezoom + parallax en scrollant.
// ─── PARALLAX IMAGE DANS LES CARTES (Sans espace noir & réactif) ───────────────
// Position absolue avec top: -15% et height: 130%.
// L'image dépasse de 15% en haut et 15% en bas du cadre -> IMPOSSIBLE d'avoir une bande noire.
function initCardParallax() {
    ScrollTrigger.getAll()
        .filter(t => t._cardParallax)
        .forEach(t => t.kill());

    const cards = document.querySelectorAll('#image-gallery .gallery-card');
    if (!cards.length) return;

    cards.forEach(card => {
        const img = card.querySelector('img');
        if (!img) return;

        // Positionnement absolu centré avec buffer de 15% au-dessus et en dessous
        img.style.position = 'absolute';
        img.style.top = '-15%';
        img.style.left = '0';
        img.style.width = '100%';
        img.style.height = '130%';
        img.style.objectFit = 'cover';
        img.style.objectPosition = 'center';
        img.style.willChange = 'transform';

        // L'image translate en yPercent de -5% à +5%.
        // À yPercent = +5%, le haut de l'image est encore à -10% au-dessus de la carte -> 0% de noir visible.
        const anim = gsap.fromTo(img,
            { yPercent: -5 },
            {
                yPercent: 5,
                ease: 'none',
                scrollTrigger: {
                    trigger: card,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 0.6,
                    invalidateOnRefresh: false
                }
            }
        );

        if (anim && anim.scrollTrigger) anim.scrollTrigger._cardParallax = true;
    });

    ScrollTrigger.refresh();
}
