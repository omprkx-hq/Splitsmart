/**
 * SplitSmart AI - Awwwards & Emotion Agency Interaction Engine
 * Implements:
 * 1. Emotion Agency Circular Clip-Path Theme Transition (Expanding from click coordinate)
 * 2. Emotion Agency Velocity-Driven Inverting Cursor (mix-blend-mode: difference, squash & stretch)
 * 3. Forge Automotive Luxury Intro Curtain & Masked Kinetic Text Slide-Up
 * 4. Hairline Scroll Progress Bar & Staggered Scroll Reveal
 * 5. Dynamic Card Spotlight Illumination
 */

(function () {
    // -------------------------------------------------------------------------
    // 1. Emotion Agency Circular Clip-Path Theme Transition
    // -------------------------------------------------------------------------
    function executeCircularThemeTransition(e, newTheme, onApply) {
        let x = window.innerWidth - 60;
        let y = 34;

        if (e && typeof e.clientX === 'number' && e.clientX > 0) {
            x = e.clientX;
            y = e.clientY;
        } else {
            const btn = document.querySelector('.nav-theme-btn');
            if (btn) {
                const rect = btn.getBoundingClientRect();
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 2;
            }
        }

        const maxRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        if (document.startViewTransition) {
            const transition = document.startViewTransition(() => {
                if (onApply) onApply();
            });

            transition.ready.then(() => {
                document.documentElement.animate(
                    {
                        clipPath: [
                            `circle(0px at ${x}px ${y}px)`,
                            `circle(${maxRadius}px at ${x}px ${y}px)`
                        ]
                    },
                    {
                        duration: 700,
                        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                        pseudoElement: '::view-transition-new(root)'
                    }
                );
            });
        } else {
            // High-performance DOM circular ripple fallback
            const portal = document.createElement('div');
            portal.className = 'theme-ripple-portal';
            const circle = document.createElement('div');
            circle.className = 'theme-ripple-circle';
            circle.style.left = `${x}px`;
            circle.style.top = `${y}px`;
            circle.style.background = (newTheme === 'amoled' || newTheme === 'dark') ? '#000000' : '#FAFAF9';
            portal.appendChild(circle);
            document.body.appendChild(portal);

            setTimeout(() => {
                if (onApply) onApply();
            }, 320);

            setTimeout(() => {
                portal.remove();
            }, 720);
        }
    }

    // -------------------------------------------------------------------------
    // 2. Natural Native Cursor (Fintech Enterprise Standard)
    // -------------------------------------------------------------------------
    function initPrecisionCursor() {
        // Remove legacy custom cursor elements to maintain clean native pointer precision
        const dot = document.getElementById('cursor-dot');
        const ring = document.getElementById('cursor-ring');
        const oldEmotion = document.getElementById('emotion-cursor');
        if (dot) dot.remove();
        if (ring) ring.remove();
        if (oldEmotion) oldEmotion.remove();
    }

    // -------------------------------------------------------------------------
    // 3. Instant Page Mount (Zero Blocker Delay)
    // -------------------------------------------------------------------------
    function initIntroCurtain() {
        const curtain = document.getElementById('forge-curtain');
        if (curtain) curtain.remove();
        triggerKineticText();
    }

    function triggerKineticText() {
        const words = document.querySelectorAll('.kinetic-word');
        words.forEach((w, i) => {
            setTimeout(() => {
                w.classList.add('is-revealed');
            }, 60 + i * 55);
        });
    }

    // -------------------------------------------------------------------------
    // 4. Hairline Scroll Progress Bar
    // -------------------------------------------------------------------------
    function initScrollProgress() {
        let bar = document.getElementById('scroll-progress');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'scroll-progress';
            bar.className = 'scroll-progress-bar';
            document.body.appendChild(bar);
        }

        function updateProgress() {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (scrollHeight <= 0) {
                bar.style.width = '0%';
                return;
            }
            const progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
            bar.style.width = `${progress}%`;
        }

        window.addEventListener('scroll', updateProgress, { passive: true });
        window.addEventListener('resize', updateProgress, { passive: true });
        updateProgress();
    }

    // -------------------------------------------------------------------------
    // 5. Staggered Scroll Reveal Engine (IntersectionObserver)
    // -------------------------------------------------------------------------
    let revealObserver = null;

    function initScrollReveal() {
        if (!('IntersectionObserver' in window)) return;

        revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-revealed');
                    obs.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.08,
            rootMargin: '0px 0px -40px 0px'
        });

        scanAndObserve();
    }

    function scanAndObserve() {
        if (!revealObserver) return;

        const targets = document.querySelectorAll(
            '.card:not(.reveal-on-scroll), .stat-card:not(.reveal-on-scroll), .feature-box:not(.reveal-on-scroll), .hero-section:not(.reveal-on-scroll), .ledger-table-container:not(.reveal-on-scroll), .group-card-modern:not(.reveal-on-scroll), .action-tile:not(.reveal-on-scroll)'
        );

        targets.forEach((el, index) => {
            el.classList.add('reveal-on-scroll');
            const delayMod = (index % 4) + 1;
            el.classList.add(`reveal-delay-${delayMod}`);
            revealObserver.observe(el);
        });
    }

    // -------------------------------------------------------------------------
    // 6. Subtle Card Spotlight Illumination (Linear physical light feel)
    // -------------------------------------------------------------------------
    function initCardSpotlight() {
        document.addEventListener('mousemove', (e) => {
            const card = e.target.closest('.card, .stat-card, .feature-box, .group-card-modern, .action-tile');
            if (!card) return;

            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        }, { passive: true });
    }

    // -------------------------------------------------------------------------
    // 7. Scroll-Driven 3D Unfolding Financial Vault (About Section)
    // Synchronized with scroll position and real-time scroll velocity
    // -------------------------------------------------------------------------
    let vaultAnimationId = null;
    let lastScrollY = window.scrollY || 0;
    let smoothSpeed = 0;
    let currentProgress = 0;
    let mouseTiltX = 0;
    let mouseTiltY = 0;
    let targetTiltX = 0;
    let targetTiltY = 0;

    window.addEventListener('mousemove', (e) => {
        const stage = document.getElementById('vault-stage-container');
        if (!stage) return;
        const rect = stage.getBoundingClientRect();
        if (e.clientY >= rect.top - 120 && e.clientY <= rect.bottom + 120) {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            targetTiltX = ((e.clientX - centerX) / (rect.width / 2)) * 8; // max 8 deg Y-axis
            targetTiltY = -((e.clientY - centerY) / (rect.height / 2)) * 6; // max 6 deg X-axis
        } else {
            targetTiltX = 0;
            targetTiltY = 0;
        }
    }, { passive: true });

    function initScrollVaultEngine() {
        const section = document.getElementById('about-vault-section');
        if (!section) {
            if (vaultAnimationId) {
                cancelAnimationFrame(vaultAnimationId);
                vaultAnimationId = null;
            }
            return;
        }

        const assembly = document.getElementById('vault-assembly');
        const layerCard = document.getElementById('vault-layer-card');
        const layerMatrix = document.getElementById('vault-layer-matrix');
        const layerSettle = document.getElementById('vault-layer-settle');
        const glare = document.getElementById('vault-card-glare');
        const aura = document.getElementById('vault-ambient-aura');
        const meterFill = document.getElementById('vault-meter-fill');
        const statusText = document.getElementById('vault-status-text');
        const speedText = document.getElementById('vault-speed-text');
        const percentText = document.getElementById('vault-percent-text');

        if (!layerCard || !layerMatrix || !layerSettle) return;

        lastScrollY = window.scrollY || 0;

        function updateVaultFrame() {
            const currentSection = document.getElementById('about-vault-section');
            if (!currentSection) {
                vaultAnimationId = null;
                return;
            }

            const currentScrollY = window.scrollY || document.documentElement.scrollTop;
            
            // Calculate instantaneous scroll speed with smooth damping
            const rawSpeed = Math.abs(currentScrollY - lastScrollY);
            smoothSpeed += (rawSpeed - smoothSpeed) * 0.18;
            lastScrollY = currentScrollY;

            // Compute section visibility & progress within viewport
            const rect = currentSection.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            // Starts unfolding when top of section enters 85% of viewport
            // Fully open when center of section reaches middle of viewport
            const startY = windowHeight * 0.85;
            const endY = windowHeight * 0.15;
            const progressSpan = rect.height + (startY - endY);
            const traveled = startY - rect.top;
            
            let targetProgress = traveled / progressSpan;
            targetProgress = Math.max(0, Math.min(1, targetProgress));

            // Smooth fluid damping interpolation towards target progress
            currentProgress += (targetProgress - currentProgress) * 0.12;

            // Speed tilt effect: faster scrolling adds dynamic physical perspective
            const dynamicSpeedTilt = Math.min(smoothSpeed * 0.35, 12);

            // Damped Mouse Parallax Gyroscope
            mouseTiltX += (targetTiltX - mouseTiltX) * 0.1;
            mouseTiltY += (targetTiltY - mouseTiltY) * 0.1;

            if (assembly) {
                assembly.style.transform = `rotateY(${mouseTiltX.toFixed(2)}deg) rotateX(${mouseTiltY.toFixed(2)}deg)`;
            }

            // Apply 3D transforms to the 3 layers according to scroll progress & speed
            const p = currentProgress;
            currentSection.style.setProperty('--vault-p', p.toFixed(3));
            
            // Layer 1: Titanium Card Shell tilts backward and floats upward
            const cardRotateX = (p * 48 + dynamicSpeedTilt).toFixed(2);
            const cardTranslateY = (p * -105).toFixed(1);
            const cardTranslateZ = (p * -38).toFixed(1);
            const cardShadowGlow = (0.2 + p * 0.35).toFixed(2);
            layerCard.style.transform = `perspective(1200px) rotateX(${cardRotateX}deg) translateY(${cardTranslateY}px) translateZ(${cardTranslateZ}px)`;
            layerCard.style.boxShadow = `0 30px 65px rgba(0, 0, 0, 0.95), 0 0 40px rgba(208, 240, 48, ${cardShadowGlow})`;

            // Specular Glare Movement
            if (glare) {
                const glareX = (mouseTiltX * 24 + (1 - p) * 160).toFixed(1);
                const glareY = (mouseTiltY * 20 + p * 90).toFixed(1);
                glare.style.transform = `translate(${glareX}px, ${glareY}px)`;
            }

            // Layer 2: Deconstructed Matrix core floats forward into foreground
            const matrixTranslateZ = (p * 64 + dynamicSpeedTilt * 0.8).toFixed(1);
            const matrixScale = (0.92 + p * 0.09).toFixed(3);
            const matrixOpacity = (0.65 + p * 0.35).toFixed(2);
            layerMatrix.style.transform = `perspective(1200px) translateZ(${matrixTranslateZ}px) scale(${matrixScale})`;
            layerMatrix.style.opacity = matrixOpacity;

            // Layer 3: Settlement base unfolds downward and angles forward
            const settleRotateX = (p * -38 - dynamicSpeedTilt * 0.7).toFixed(2);
            const settleTranslateY = (p * 105).toFixed(1);
            const settleTranslateZ = (p * -28).toFixed(1);
            layerSettle.style.transform = `perspective(1200px) rotateX(${settleRotateX}deg) translateY(${settleTranslateY}px) translateZ(${settleTranslateZ}px)`;

            // Ambient Aura Bloom
            if (aura) {
                const auraScale = (0.8 + p * 0.4).toFixed(2);
                const auraOpacity = (0.25 + p * 0.75).toFixed(2);
                aura.style.transform = `translate(-50%, -50%) scale(${auraScale})`;
                aura.style.opacity = auraOpacity;
            }

            // Update Telemetry HUD
            if (meterFill) meterFill.style.width = `${(p * 100).toFixed(1)}%`;
            if (percentText) percentText.textContent = `${Math.round(p * 100)}%`;
            
            if (speedText) {
                if (smoothSpeed > 8) {
                    speedText.textContent = `${smoothSpeed.toFixed(1)} px/f (Kinetic Velocity)`;
                    speedText.style.color = 'var(--color-fiery-orange)';
                } else if (smoothSpeed > 1) {
                    speedText.textContent = `${smoothSpeed.toFixed(1)} px/f (Active Scroll)`;
                    speedText.style.color = 'var(--color-sunshine-yellow)';
                } else {
                    speedText.textContent = `0.0 px/f (Precision Rest)`;
                    speedText.style.color = 'var(--text-muted)';
                }
            }

            if (statusText) {
                if (p < 0.12) {
                    statusText.textContent = 'ENTERPRISE SETTLEMENT LEDGER • SCROLL TO EXPAND';
                } else if (p < 0.88) {
                    statusText.textContent = `DECONSTRUCTING MULTI-PARTY SHARES (${Math.round(p * 100)}%)`;
                } else {
                    statusText.textContent = 'FULLY DECONSTRUCTED • ZERO-DRIFT EQUILIBRIUM';
                }
            }

            if (typeof window !== 'undefined' && window.requestAnimationFrame) {
                vaultAnimationId = window.requestAnimationFrame(updateVaultFrame);
            }
        }

        if (vaultAnimationId && typeof window !== 'undefined' && window.cancelAnimationFrame) {
            window.cancelAnimationFrame(vaultAnimationId);
        }
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            vaultAnimationId = window.requestAnimationFrame(updateVaultFrame);
        }
    }

    // -------------------------------------------------------------------------
    // 8. Interactive 3D PayPal Sandbox Demo Modal
    // -------------------------------------------------------------------------
    function trigger3DPayPalDemo() {
        // Remove existing modal if any
        const existing = document.getElementById('paypal-demo-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'paypal-demo-modal-overlay';
        overlay.className = 'paypal-demo-overlay';
        overlay.innerHTML = `
          <div class="paypal-demo-card">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; padding-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
              <div style="display: flex; align-items: center; gap: 12px;">
                ${Icons.paypalFlagship(24)}
                <div>
                  <div style="font-size: 16px; font-weight: 800; color: #FFFFFF;">PayPal Sandbox Clearance</div>
                  <div style="font-size: 11px; color: var(--color-sunshine-yellow); font-family: var(--font-code);">REAL-TIME SANDBOX SETTLEMENT SIMULATOR</div>
                </div>
              </div>
              <button onclick="document.getElementById('paypal-demo-modal-overlay').remove()" style="background: transparent; border: none; color: #94A3B8; font-size: 20px; cursor: pointer; padding: 4px 8px;">&times;</button>
            </div>

            <!-- Simulation Status Body -->
            <div id="paypal-sim-body">
              <div style="margin-bottom: 18px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 13px; color: #94A3B8;">Settlement Target:</span>
                  <span style="font-size: 13px; font-weight: 700; color: #FFFFFF;">Alex Rivera &bull; Alpine Ski Cabin</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 13px; color: #94A3B8;">Settlement Amount:</span>
                  <span style="font-size: 20px; font-weight: 800; color: var(--accent-primary); font-family: var(--font-code);">$60.00 USD</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 13px; color: var(--text-muted);">Verification Method:</span>
                  <span style="font-size: 12px; font-weight: 700; color: var(--accent-emerald);">PayPal Orders v2 Server Capture</span>
                </div>
              </div>

              <!-- Animated Step Indicator -->
              <div id="paypal-sim-steps" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
                <div id="step-order" style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--accent-primary); font-family: var(--font-code);">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--accent-primary);"></span>
                  <span>Generating PayPal Order #ORD-8942-SANDBOX...</span>
                </div>
              </div>

              <div id="paypal-sim-footer" style="display: flex; gap: 12px; justify-content: flex-end;">
                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('paypal-demo-modal-overlay').remove()">Close</button>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(overlay);

        // Run multi-stage simulation with live feedback
        const stepsContainer = document.getElementById('paypal-sim-steps');
        const footerContainer = document.getElementById('paypal-sim-footer');

        setTimeout(() => {
            if (!stepsContainer) return;
            stepsContainer.innerHTML += `
              <div id="step-auth" style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--accent-emerald); font-family: var(--font-code); animation: viewEnter 0.2s ease;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--accent-emerald);"></span>
                <span>PayPal Sandbox 2FA Auth Verified: BUYER_APPROVED</span>
              </div>
            `;
        }, 850);

        setTimeout(() => {
            if (!stepsContainer) return;
            stepsContainer.innerHTML += `
              <div id="step-capture" style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-primary); font-family: var(--font-code); animation: viewEnter 0.2s ease;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--accent-emerald);"></span>
                <span>Server Capture: STATUS = COMPLETED &bull; Zero Drift Committed</span>
              </div>
            `;

            if (footerContainer) {
                footerContainer.innerHTML = `
                  <button class="btn btn-secondary btn-sm" onclick="document.getElementById('paypal-demo-modal-overlay').remove()">Dismiss</button>
                  <a href="#/signup" class="vault-paypal-btn" style="text-decoration: none; padding: 8px 18px; font-size: 12px;" onclick="document.getElementById('paypal-demo-modal-overlay').remove()">
                    Launch Full SplitSmart &rarr;
                  </a>
                `;
            }

            if (window.showToast) {
                showToast('PayPal Sandbox Payment of $60.00 Verified! Zero Ledger Drift Confirmed.', 'success', 4000);
            }
        }, 1750);
    }

    // -------------------------------------------------------------------------
    // Engine Bootstrapper
    // -------------------------------------------------------------------------
    function boot() {
        initPrecisionCursor();
        initIntroCurtain();
        initScrollProgress();
        initScrollReveal();
        initCardSpotlight();
        initScrollVaultEngine();

        window.addEventListener('hashchange', () => {
            setTimeout(() => {
                scanAndObserve();
                triggerKineticText();
                initScrollVaultEngine();
            }, 80);
        });

        const content = document.getElementById('app-content');
        if (content && typeof MutationObserver !== 'undefined') {
            const domObserver = new MutationObserver(() => {
                scanAndObserve();
                triggerKineticText();
                initScrollVaultEngine();
            });
            domObserver.observe(content, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.executeCircularThemeTransition = executeCircularThemeTransition;
    window.triggerKineticText = triggerKineticText;
    window.scanAndObserveAwwwards = scanAndObserve;
    window.initScrollVaultEngine = initScrollVaultEngine;
    window.trigger3DPayPalDemo = trigger3DPayPalDemo;
})();
