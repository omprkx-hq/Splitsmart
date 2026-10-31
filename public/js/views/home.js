/**
 * View 1: Home / Landing Page
 * Friendly, human, clean fintech presentation modeled after Splitwise & Wise.
 */

function renderHomeView() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <!-- Hero Section -->
      <section class="hero-section" style="padding: 48px 0 32px 0;">
        <div class="hero-pill">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 9999px; background: var(--accent-primary);"></span>
          <span>Simple Shared Expenses</span>
          <span style="color: var(--border-strong);">&bull;</span>
          <span style="color: var(--accent-primary); font-weight: 700;">Zero Stress</span>
        </div>
        
        <h1 class="hero-headline forge-text-reveal" style="max-width: 820px; margin: 0 auto 18px auto;">
          <span class="kinetic-line">
            <span class="kinetic-word">Split</span>
            <span class="kinetic-word">expenses</span>
            <span class="kinetic-word">with</span>
            <span class="kinetic-word">friends.</span>
          </span>
          <span class="kinetic-line">
            <span class="kinetic-word text-fill-wave">No</span>
            <span class="kinetic-word text-fill-wave">math</span>
            <span class="kinetic-word text-fill-wave">required.</span>
          </span>
        </h1>
        
        <p class="hero-subhead" style="max-width: 600px; margin: 0 auto 32px auto; font-size: 17px;">
          Track shared bills, know exactly who owes whom, and settle up easily with roommates, friends, and travel buddies.
        </p>
        
        <div class="hero-cta-group">
          <a href="#/calculator" class="btn btn-primary btn-lg" style="background: #059669; border-color: #059669;">⚡ Quick AI Calculator (No Login) &rarr;</a>
          <a href="#/signup" class="btn btn-secondary btn-lg">Create Free Account</a>
        </div>
      </section>

      <!-- Clean Visual Showcase Card -->
      <section style="margin: 32px auto 56px auto; max-width: 900px;">
        <div class="card" style="box-shadow: var(--shadow-lg); border-color: var(--border-subtle); overflow: hidden;">
          <div class="card-header" style="background: var(--bg-subtle); border-bottom: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="color: var(--accent-primary);">${Icons.category('Travel', 22)}</span>
              <div>
                <span class="card-title" style="font-size: 16px;">Weekend Road Trip</span>
                <div style="font-size: 12px; color: var(--text-muted);">4 members &bull; USD ($)</div>
              </div>
            </div>
            <span class="badge badge-primary">Live Example</span>
          </div>
          
          <div class="card-body" style="padding: 24px;">
            <!-- Balances Example -->
            <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;">
                  Quick Summary
                </div>
                <div style="font-size: 18px; font-weight: 800; color: var(--accent-emerald);">
                  Alex owes Sarah $45.00
                </div>
              </div>
              <a href="#/signup" class="btn btn-primary btn-sm">Settle Up &rarr;</a>
            </div>

            <!-- Example Expenses Feed -->
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="color: var(--text-secondary);">${Icons.category('Housing', 18)}</span>
                  <div>
                    <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">Airbnb Cabin Booking</div>
                    <div style="font-size: 12px; color: var(--text-muted);">Paid by Sarah &bull; Split equally (4 people)</div>
                  </div>
                </div>
                <div style="font-size: 15px; font-weight: 800; color: var(--text-primary);">$320.00</div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="color: var(--text-secondary);">${Icons.category('Shopping', 18)}</span>
                  <div>
                    <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">Groceries &amp; Barbecue</div>
                    <div style="font-size: 12px; color: var(--text-muted);">Paid by Alex &bull; Split equally (4 people)</div>
                  </div>
                </div>
                <div style="font-size: 15px; font-weight: 800; color: var(--text-primary);">$140.00</div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="color: var(--text-secondary);">${Icons.category('Transportation', 18)}</span>
                  <div>
                    <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">Highway Gas &amp; Tolls</div>
                    <div style="font-size: 12px; color: var(--text-muted);">Paid by Liam &bull; Split equally (4 people)</div>
                  </div>
                </div>
                <div style="font-size: 15px; font-weight: 800; color: var(--text-primary);">$60.00</div>
              </div>
            </div>
          </div>

          <div class="card-footer" style="justify-content: space-between; font-size: 13px; color: var(--text-muted); background: var(--bg-subtle);">
            <span>Never worry about who paid what again.</span>
            <a href="#/signup" style="color: var(--accent-primary); font-weight: 700;">Start your free group &rarr;</a>
          </div>
        </div>
      </section>

      <!-- 3 Key Features -->
      <section id="features" style="padding: 32px 0 48px 0;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h2 style="font-size: 28px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px;">Everything you need to split bills</h2>
          <p style="color: var(--text-muted); font-size: 15px; margin-top: 6px;">Clear, friendly, and transparent expense tracking for everyday life.</p>
        </div>

        <div class="features-grid">
          <div class="feature-box">
            <div class="feature-icon-badge" style="color: var(--accent-primary);">${Icons.users(22)}</div>
            <h3 class="feature-title">Groups for Any Occasion</h3>
            <p class="feature-desc">
              Organize expenses into isolated groups for trips, roommates, parties, or family vacations. Everyone sees the same clear ledger.
            </p>
          </div>

          <div class="feature-box">
            <div class="feature-icon-badge" style="color: var(--info-primary);">${Icons.scale(22)}</div>
            <h3 class="feature-title">Flexible Bill Splitting</h3>
            <p class="feature-desc">
              Split bills equally, by exact custom dollar amounts, or by percentage shares. Remainder cents are allocated automatically so numbers always add up.
            </p>
          </div>

          <div class="feature-box">
            <div class="feature-icon-badge" style="color: var(--warning-primary);">${Icons.checkCircle(22)}</div>
            <h3 class="feature-title">Simplified Settlements</h3>
            <p class="feature-desc">
              No need for a dozen back-and-forth transfers. The system minimizes debt paths so your group can settle all balances in the fewest possible payments.
            </p>
          </div>

          <div class="feature-box">
            <div class="feature-icon-badge" style="color: var(--accent-emerald);">${Icons.creditCard(22)}</div>
            <h3 class="feature-title">PayPal or Cash</h3>
            <p class="feature-desc">
              Settle up online securely with PayPal or mark debts settled in cash with a single click. Balances update in real time.
            </p>
          </div>
        </div>
      </section>

      <!-- Interactive Scroll-Driven 3D Unfolding Financial Vault (About Section) -->
      <section id="about-vault-section" class="about-vault-section">
        <div id="about"></div>
        <div id="how-it-works"></div>
        
        <div style="text-align: center; margin-bottom: 24px;">
          <div class="vault-badge-pill">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent-primary);"></span>
            <span>ENTERPRISE MULTI-CURRENCY LEDGER &bull; HOW SPLITSMART WORKS</span>
          </div>
          <h2 style="font-size: 32px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.6px; margin-bottom: 8px;">
            The Anatomy of an Instant Split
          </h2>
          <p style="color: var(--text-muted); font-size: 15px; max-width: 620px; margin: 0 auto;">
            Deconstruct the SplitSmart financial ledger. Watch how raw shared expenses decompose into fair mathematical shares and instant PayPal settlements with real-time auditability.
          </p>
        </div>

        <!-- Telemetry HUD Bar -->
        <div class="vault-hud-bar">
          <div class="vault-hud-status">
            <span class="vault-hud-status-dot"></span>
            <span id="vault-status-text">ENTERPRISE LEDGER &bull; SCROLL TO EXPAND ARCHITECTURE</span>
          </div>
          
          <div class="vault-hud-meter-wrap">
            <span style="color: var(--text-muted); font-size: 10px;">EXPANSION:</span>
            <div class="vault-hud-meter-track">
              <div class="vault-hud-meter-fill" id="vault-meter-fill"></div>
            </div>
            <span id="vault-percent-text" style="color: var(--accent-primary); font-weight: 700;">0%</span>
          </div>

          <div class="vault-hud-speed">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
            <span id="vault-speed-text">0.0 px/f (Precision Rest)</span>
          </div>
        </div>

        <!-- 3D Stage Viewport -->
        <div class="vault-stage-container" id="vault-stage-container">
          <div class="vault-ambient-aura" id="vault-ambient-aura"></div>

          <div class="vault-assembly" id="vault-assembly">
            
            <!-- Layer 1: Titanium Obsidian Smart Card Shell (Top Flap) -->
            <div class="vault-layer-card" id="vault-layer-card">
              <div class="vault-card-glare" id="vault-card-glare"></div>

              <div class="vault-card-header">
                <div style="display: flex; align-items: center; gap: 14px;">
                  <div class="vault-chip-icon">
                    <div class="vault-chip-lines"></div>
                    <div class="vault-chip-core"></div>
                  </div>
                  <div class="vault-contactless" title="Zero Friction Contactless Settle">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M6 12a6 6 0 0 1 6-6"/><path d="M4 12a8 8 0 0 1 8-8"/><path d="M8 12a4 4 0 0 1 4-4"/></svg>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="vault-paypal-brand-badge">
                    ${Icons.paypalFlagship(16)}
                    <span>PayPal Sandbox</span>
                  </span>
                  <span class="vault-card-seal">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>AGENTIC AI</span>
                  </span>
                </div>
              </div>

              <div class="vault-card-number">
                <span>4092</span>
                <span>&bull;&bull;&bull;&bull;</span>
                <span>&bull;&bull;&bull;&bull;</span>
                <span style="color: var(--accent-primary);">2026</span>
              </div>

              <div class="vault-card-footer">
                <div>
                  <div class="vault-card-label">Friends &amp; Family Edition</div>
                  <div class="vault-card-holder">SPLITSMART FOR EVERYDAY LIFE</div>
                </div>
                <div style="text-align: right;">
                  <div class="vault-card-label">Deterministic Settlement</div>
                  <div style="font-size: 11px; font-weight: 800; color: var(--accent-emerald); font-family: var(--font-code); display: flex; align-items: center; gap: 4px;">
                    <span>ZERO-DRIFT CLEARANCE</span>
                    <span>&darr;</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Data Connector Streams Linking Layer 1 to Layer 2 -->
            <div class="vault-connector-stream" id="vault-connector-stream-1">
              <div class="vault-laser-line"></div>
              <div class="vault-laser-line"></div>
              <div class="vault-laser-line"></div>
            </div>

            <!-- Layer 2: Deconstructed Expense Breakdown Matrix (Center Core) -->
            <div class="vault-layer-matrix" id="vault-layer-matrix">
              <div class="vault-matrix-header">
                <div>
                  <div style="font-size: 10px; color: var(--text-muted); font-family: var(--font-code); text-transform: uppercase; letter-spacing: 1px;">
                    Multi-Party Expense #4092 &bull; PayPal Order Routing
                  </div>
                  <div class="vault-matrix-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color: var(--accent-primary);"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span>Alpine Ski Cabin &amp; Welcome Dinner</span>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 10px; color: var(--text-muted); font-family: var(--font-code);">TOTAL GROUP BILL</div>
                  <div class="vault-matrix-total">$180.00 USD</div>
                </div>
              </div>

              <!-- 3-Way Fair Share Matrix -->
              <div class="vault-split-shares">
                <!-- Alex -->
                <div class="vault-share-box" style="border-left: 3px solid var(--accent-emerald);">
                  <div class="vault-share-user">
                    <span class="vault-avatar-badge" style="background: var(--accent-emerald); color: #FFF;">AR</span>
                    <div>
                      <div style="font-size: 12px; font-weight: 750;">Alex Rivera</div>
                      <div style="font-size: 9px; color: var(--accent-emerald); font-family: var(--font-code);">PAID IN FULL</div>
                    </div>
                  </div>
                  <div class="vault-share-amount" style="color: var(--accent-emerald);">$60.00</div>
                  <div class="vault-share-status" style="color: var(--accent-emerald);">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Gets Back +$120.00</span>
                  </div>
                </div>

                <!-- Sarah -->
                <div class="vault-share-box" style="border-left: 3px solid var(--accent-primary);">
                  <div class="vault-share-user">
                    <span class="vault-avatar-badge" style="background: var(--accent-primary); color: #FFF;">SC</span>
                    <div>
                      <div style="font-size: 12px; font-weight: 750;">Sarah Chen</div>
                      <div style="font-size: 9px; color: var(--accent-primary); font-family: var(--font-code);">EQUAL SHARE</div>
                    </div>
                  </div>
                  <div class="vault-share-amount" style="color: var(--text-primary);">$60.00</div>
                  <div class="vault-share-status" style="color: var(--accent-primary);">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>Owes Alex $60.00</span>
                  </div>
                </div>

                <!-- You -->
                <div class="vault-share-box" style="border-left: 3px solid var(--danger-primary);">
                  <div class="vault-share-user">
                    <span class="vault-avatar-badge" style="background: var(--danger-primary); color: #FFF;">YO</span>
                    <div>
                      <div style="font-size: 12px; font-weight: 750;">You</div>
                      <div style="font-size: 9px; color: var(--danger-text); font-family: var(--font-code);">EQUAL SHARE</div>
                    </div>
                  </div>
                  <div class="vault-share-amount" style="color: var(--text-primary);">$60.00</div>
                  <div class="vault-share-status" style="color: var(--danger-text);">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    <span>Owes Alex $60.00</span>
                  </div>
                </div>
              </div>

              <div class="vault-matrix-formula">
                <span>&bull; Exact Math: $180.00 &divide; 3 = $60.00 each</span>
                <span style="color: var(--accent-emerald); font-weight: 700;">Zero Ledger Drift &bull; Exact Cents Allocation</span>
              </div>
            </div>

            <!-- Data Connector Streams Linking Layer 2 to Layer 3 -->
            <div class="vault-connector-stream" id="vault-connector-stream-2">
              <div class="vault-laser-line"></div>
              <div class="vault-laser-line"></div>
              <div class="vault-laser-line"></div>
            </div>

            <!-- Layer 3: PayPal Instant Settlement Clearance Terminal (Bottom Flap) -->
            <div class="vault-layer-settle" id="vault-layer-settle">
              <div class="vault-settle-flex">
                <div>
                  <div style="font-size: 14px; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                    ${Icons.paypalFlagship(18)}
                    <span>PayPal Instant Settlement Clearance</span>
                  </div>
                  <div class="vault-minimizer-graph">
                    <span>Debt Optimization: <span class="vault-minimizer-strike">6 peer-to-peer</span> &rarr; <span class="vault-minimizer-optimized">2 Direct Transfers</span></span>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <span class="vault-settle-pill-danger">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--danger-primary);"></span>
                    <span>Due: $60.00</span>
                  </span>

                  <button class="vault-paypal-btn" onclick="window.trigger3DPayPalDemo()" title="Test Live PayPal Sandbox Settlement">
                    ${Icons.paypal(18)}
                    <span>Pay $60.00 via PayPal Sandbox &rarr;</span>
                  </button>
                </div>
              </div>

              <!-- 3-Stage PayPal Sandbox Cryptographic Pipeline -->
              <div class="vault-paypal-pipeline">
                <div class="vault-pipeline-step active">
                  <span class="vault-pipeline-dot"></span>
                  <div>
                    <div style="font-weight: 750; color: var(--text-primary);">1. Order Creation</div>
                    <div style="font-size: 9px; color: var(--text-muted); font-family: var(--font-code);">POST /v2/orders &bull; 0.2s</div>
                  </div>
                </div>

                <div class="vault-pipeline-step active">
                  <span class="vault-pipeline-dot" style="background: var(--warning-primary);"></span>
                  <div>
                    <div style="font-weight: 750; color: var(--text-primary);">2. Sandbox Approval</div>
                    <div style="font-size: 9px; color: var(--text-muted); font-family: var(--font-code);">Zero Friction 2FA Modal</div>
                  </div>
                </div>

                <div class="vault-pipeline-step active">
                  <span class="vault-pipeline-dot" style="background: var(--accent-emerald);"></span>
                  <div>
                    <div style="font-weight: 750; color: var(--text-primary);">3. Server-Side Capture</div>
                    <div style="font-size: 9px; color: var(--text-muted); font-family: var(--font-code);">Zero-Drift SQL &amp; Receipt</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- PayPal & Enterprise Architecture Matrix -->
        <div class="paypal-architecture-showcase">
          <div style="text-align: center; margin-bottom: 24px;">
            <span class="vault-paypal-brand-badge" style="font-size: 12px; padding: 7px 18px;">
              ${Icons.paypalFlagship(16)}
              <span>ENTERPRISE COMMERCE &bull; PAYPAL PLATFORM ARCHITECTURE</span>
            </span>
            <h3 style="font-size: 26px; font-weight: 800; color: var(--text-primary); margin: 12px 0 6px 0; letter-spacing: -0.5px;">
              Deterministic Multi-Party Settlement with PayPal Platform
            </h3>
            <p style="color: var(--text-muted); font-size: 14px; max-width: 600px; margin: 0 auto;">
              Engineered for enterprise scale. Combining PostgreSQL ACID transactions with PayPal's Orders v2 and Capture APIs.
            </p>
          </div>

          <div class="paypal-architecture-grid">
            <div class="paypal-feature-card">
              <div class="paypal-card-accent-line" style="background: var(--accent-primary);"></div>
              <div style="color: var(--accent-primary); margin-bottom: 12px;">${Icons.creditCard(24)}</div>
              <h4 style="font-size: 16px; font-weight: 750; color: var(--text-primary); margin-bottom: 6px;">Server-Side Orders v2</h4>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                Client secrets never touch the browser. Orders are created with precise line-item ledger shares and PayPal currency codes.
              </p>
            </div>

            <div class="paypal-feature-card">
              <div class="paypal-card-accent-line" style="background: var(--accent-emerald);"></div>
              <div style="color: var(--accent-emerald); margin-bottom: 12px;">${Icons.shield(24)}</div>
              <h4 style="font-size: 16px; font-weight: 750; color: var(--text-primary); margin-bottom: 6px;">Cryptographic Capture</h4>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                Server-side capture verification guarantees zero fraudulent payments. Ledger states only flip when status is <span style="color: var(--accent-emerald); font-family: var(--font-code);">COMPLETED</span>.
              </p>
            </div>

            <div class="paypal-feature-card">
              <div class="paypal-card-accent-line" style="background: var(--paypal-navy);"></div>
              <div style="color: var(--paypal-navy); margin-bottom: 12px;">${Icons.scale(24)}</div>
              <h4 style="font-size: 16px; font-weight: 750; color: var(--text-primary); margin-bottom: 6px;">Zero Ledger Drift</h4>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                Pennies never vanish into thin air. Mathematical cent remainder redistribution guarantees &plusmn;0.0000 exact balances across all group debts.
              </p>
            </div>

            <div class="paypal-feature-card">
              <div class="paypal-card-accent-line" style="background: var(--accent-primary);"></div>
              <div style="color: var(--accent-primary); margin-bottom: 12px;">${Icons.receipt(24)}</div>
              <h4 style="font-size: 16px; font-weight: 750; color: var(--text-primary); margin-bottom: 6px;">Digital Audit Receipts</h4>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                Instant HTML email receipts and downloadable PDF ledgers dispatched with verifiable PayPal Capture IDs.
              </p>
            </div>
          </div>
        </div>

          </div>
        </div>

        <!-- 3 Pillars of SplitSmart Execution -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin-top: 24px;">
          <div class="card" style="margin-bottom: 0;">
            <div class="card-body">
              <span style="font-size: 11px; font-weight: 800; color: var(--accent-primary); text-transform: uppercase; font-family: var(--font-code);">Pillar 01</span>
              <h4 style="font-size: 17px; font-weight: 700; margin: 8px 0; color: var(--text-primary);">Create Isolated Groups</h4>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">Organize shared costs for trips or roommates with real-time zero-drift PostgreSQL ledger balance tracking.</p>
            </div>
          </div>

          <div class="card" style="margin-bottom: 0;">
            <div class="card-body">
              <span style="font-size: 11px; font-weight: 800; color: var(--warning-primary); text-transform: uppercase; font-family: var(--font-code);">Pillar 02</span>
              <h4 style="font-size: 17px; font-weight: 700; margin: 8px 0; color: var(--text-primary);">Deconstruct Expenses</h4>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">Split equally, by exact dollar amounts, or percentages. Every remainder cent is allocated deterministically.</p>
            </div>
          </div>

          <div class="card" style="margin-bottom: 0;">
            <div class="card-body">
              <span style="font-size: 11px; font-weight: 800; color: var(--accent-emerald); text-transform: uppercase; font-family: var(--font-code);">Pillar 03</span>
              <h4 style="font-size: 17px; font-weight: 700; margin: 8px 0; color: var(--text-primary);">Instant 1-Click Settle</h4>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">Check net debts in one glance. Settle up through PayPal Platform or record cash with live financial audit verification.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Final Call to Action -->
      <section style="background-color: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 56px 36px; text-align: center; margin-bottom: 48px; box-shadow: var(--shadow-sm);">
        <h2 style="font-size: 30px; font-weight: 800; letter-spacing: -0.6px; margin-bottom: 12px; color: var(--text-primary);">Ready to stop stressing over shared bills?</h2>
        <p style="color: var(--text-muted); font-size: 16px; max-width: 520px; margin: 0 auto 28px auto;">Join SplitSmart today and split expenses with ease.</p>
        <a href="#/signup" class="btn btn-primary btn-lg">Create Free Account &rarr;</a>
      </section>
    `;

    // Initialize 3D Scroll Vault Engine immediately
    if (window.initScrollVaultEngine) {
        window.initScrollVaultEngine();
    }
}

window.renderHomeView = renderHomeView;
