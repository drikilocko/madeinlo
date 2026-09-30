/**
 * Made in Lo - Premium Toast & Alert Notification System
 * Replaces native cheap browser alerts with high-end luxury toast notification drawers.
 */

(function() {
    // Inject CSS styles into the document head
    const style = document.createElement('style');
    style.innerHTML = `
        #toast-container {
            position: fixed;
            top: 30px;
            right: 30px;
            z-index: 100000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
            max-width: 420px;
            width: calc(100% - 60px);
            font-family: 'Montserrat', sans-serif;
        }

        .toast-popup {
            background: rgba(12, 12, 12, 0.96);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 16px 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            pointer-events: auto;
            transform: translateX(120%);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .toast-popup.toast-show {
            transform: translateX(0);
            opacity: 1;
        }

        .toast-content-wrapper {
            display: flex;
            align-items: center;
            gap: 14px;
            flex: 1;
        }

        .toast-icon {
            font-size: 1.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .toast-message {
            font-size: 0.88rem;
            font-weight: 500;
            line-height: 1.4;
            letter-spacing: 0.2px;
        }

        .toast-close {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.4);
            cursor: pointer;
            font-size: 1rem;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s, transform 0.2s;
            border-radius: 50%;
        }

        .toast-close:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.05);
            transform: scale(1.05);
        }

        /* Toast types colors styling */
        .toast-success {
            border-left: 4px solid #4CAF50;
        }
        .toast-success .toast-icon {
            background: rgba(76, 175, 80, 0.12);
            color: #4CAF50;
        }

        .toast-error {
            border-left: 4px solid #ff5252;
        }
        .toast-error .toast-icon {
            background: rgba(255, 82, 82, 0.12);
            color: #ff5252;
        }

        .toast-warning {
            border-left: 4px solid #ff9800;
        }
        .toast-warning .toast-icon {
            background: rgba(255, 152, 0, 0.12);
            color: #ff9800;
        }

        .toast-info {
            border-left: 4px solid #D4AF37;
        }
        .toast-info .toast-icon {
            background: rgba(212, 175, 55, 0.12);
            color: #D4AF37;
        }

        @media (max-width: 576px) {
            #toast-container {
                top: 20px;
                right: 20px;
                width: calc(100% - 40px);
            }
        }

        /* Styles Premium pour le Modal de Mise à jour en direct */
        #live-update-modal {
            position: fixed;
            inset: 0;
            z-index: 200000;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Montserrat', sans-serif;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            opacity: 0;
            transition: opacity 0.4s ease;
            pointer-events: auto;
        }
        #live-update-modal.modal-show {
            opacity: 1;
        }
        .update-modal-body {
            background: rgba(18, 18, 18, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 30px 40px;
            border-radius: 20px;
            max-width: 480px;
            width: calc(100% - 40px);
            text-align: center;
            box-shadow: 0 30px 60px rgba(0,0,0,0.8);
            transform: scale(0.9);
            transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        }
        #live-update-modal.modal-show .update-modal-body {
            transform: scale(1);
        }
        .update-modal-icon {
            font-size: 3rem;
            color: #D4AF37;
            margin-bottom: 20px;
            animation: pulse-update 2s infinite;
        }
        @keyframes pulse-update {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 0.8; }
        }
        .update-modal-title {
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 15px;
            color: #fff;
            letter-spacing: -0.5px;
        }
        .update-modal-text {
            font-size: 0.92rem;
            line-height: 1.6;
            color: rgba(255,255,255,0.7);
            margin-bottom: 25px;
        }
        .update-modal-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        .update-btn-confirm {
            background: #fff;
            color: #000;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .update-btn-confirm:hover {
            background: #D4AF37;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(212,175,55,0.2);
        }
        .update-btn-cancel {
            background: rgba(255,255,255,0.05);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.1);
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .update-btn-cancel:hover {
            background: rgba(255,255,255,0.1);
            transform: translateY(-2px);
        }
    `;
    document.head.appendChild(style);

    // Dynamic creator for toast container
    function getContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Show premium toast notification
     * @param {string} message - Notification text
     * @param {string} type - 'success', 'error', 'warning', 'info'
     */
    window.showToast = function(message, type = 'info') {
        const container = getContainer();
        const toast = document.createElement('div');
        toast.className = `toast-popup toast-${type}`;

        let iconClass = 'fa-info-circle';
        if (type === 'success') iconClass = 'fa-check-circle';
        if (type === 'error') iconClass = 'fa-exclamation-circle';
        if (type === 'warning') iconClass = 'fa-exclamation-triangle';

        toast.innerHTML = `
            <div class="toast-content-wrapper">
                <div class="toast-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Fermer">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Handle close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.onclick = function() {
            toast.classList.remove('toast-show');
            setTimeout(() => toast.remove(), 500);
        };

        container.appendChild(toast);

        // Slide In
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 50);

        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('toast-show');
                setTimeout(() => toast.remove(), 500);
            }
        }, 5000);
    };

    // Override the native browser alert box with the brand-new luxury toast notifications
    window.alert = function(message) {
        if (!message) return;
        const msgLower = message.toLowerCase();
        
        let type = 'info';
        if (msgLower.includes('erreur') || msgLower.includes('failed') || msgLower.includes('impossible') || msgLower.includes('insuffisant') || msgLower.includes('échec')) {
            type = 'error';
        } else if (msgLower.includes('succès') || msgLower.includes('réussi') || msgLower.includes('enregistrée') || msgLower.includes('confirmée')) {
            type = 'success';
        } else if (msgLower.includes('attention') || msgLower.includes('remplir') || msgLower.includes('vide')) {
            type = 'warning';
        }

        window.showToast(message, type);
        console.log(`[Made in Lo Toast Override] Native alert replaced: "${message}" (${type})`);
    };

    // --- SYSTEME DE VERIFICATION DES MISES A JOUR EN DIRECT ---
    function initLiveUpdateCheck() {
        let currentSignature = null;
        let updateDetected = false;

        async function checkUpdates() {
            if (updateDetected) return; // Ne pas spammer si déjà détecté
            
            try {
                const res = await fetch('api/check-updates.php');
                const data = await res.json();
                
                if (data.status === 'success' && data.signature) {
                    if (currentSignature === null) {
                        currentSignature = data.signature;
                    } else if (currentSignature !== data.signature) {
                        updateDetected = true;
                        showUpdateModal();
                    }
                }
            } catch (e) {
                console.error('[Live Update Check] Erreur:', e);
            }
        }

        function showUpdateModal() {
            // Créer le modal d'update avec un style haut de gamme
            const modal = document.createElement('div');
            modal.id = 'live-update-modal';
            modal.innerHTML = `
                <div class="update-modal-body">
                    <div class="update-modal-icon">
                        <i class="fas fa-sync-alt"></i>
                    </div>
                    <div class="update-modal-title">Mise à jour disponible !</div>
                    <div class="update-modal-text">
                        De nouveaux articles ou modifications de stock viennent d'être publiés par l'administration.<br>
                        Voulez-vous actualiser pour afficher les nouveautés ?
                    </div>
                    <div class="update-modal-actions">
                        <button class="update-btn-confirm">Actualiser</button>
                        <button class="update-btn-cancel">Annuler</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Animer l'affichage
            setTimeout(() => modal.classList.add('modal-show'), 50);

            // Gérer les clics
            modal.querySelector('.update-btn-confirm').onclick = function() {
                window.location.reload();
            };

            modal.querySelector('.update-btn-cancel').onclick = function() {
                modal.classList.remove('modal-show');
                setTimeout(() => modal.remove(), 400);
            };
        }

        // Lancer la vérification initiale après 5 secondes, puis toutes les 15 secondes
        setTimeout(() => {
            checkUpdates();
            setInterval(checkUpdates, 15000);
        }, 5000);
    }

    // Activer la surveillance du site sur toutes les pages sauf sur la console d'administration
    if (!window.location.pathname.includes('admin.html')) {
        // Attendre que la page soit complètement chargée
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initLiveUpdateCheck);
        } else {
            initLiveUpdateCheck();
        }
    }
})();
