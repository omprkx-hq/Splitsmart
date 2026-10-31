/**
 * SplitSmart AI - Deterministic Expense & Settlement Optimizer Engine
 * Standards:
 * - Decimal-safe integer minor units (cents), deterministic remainder distribution
 * - Supported Split Methods: EQUAL, CUSTOM, PERCENTAGE, SHARES (Weights), ADJUSTMENT
 * - Multi-Payer expense co-funding architecture
 * - Hybrid Greedy Minimum-Cash-Flow with Exact Subset-Sum Partitioning
 * - Direct Pairwise vs. Simplified Debts dual-mode settlement resolution
 */

/**
 * Validates and calculates deterministic split shares
 * @param {number} totalAmount - Total expense amount in standard currency units
 * @param {string} splitMethod - 'EQUAL' | 'CUSTOM' | 'PERCENTAGE' | 'SHARES' | 'ADJUSTMENT'
 * @param {Array<{ userId: number, shareAmount?: number, percentage?: number, shares?: number, adjustment?: number }>} participants
 * @returns {{ valid: boolean, splits?: Array<{ userId: number, shareAmount: number, percentage?: number, shares?: number, adjustment?: number }>, error?: string }}
 */
function calculateDeterministicSplits(totalAmount, splitMethod, participants) {
    if (!totalAmount || isNaN(totalAmount) || totalAmount <= 0) {
        return { valid: false, error: 'Total amount must be greater than zero.' };
    }
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
        return { valid: false, error: 'At least one participant is required for an expense split.' };
    }

    const totalCents = Math.round(Number(totalAmount) * 100);
    const count = participants.length;
    const method = (splitMethod || 'EQUAL').trim().toUpperCase();

    // 1. EQUAL SPLIT
    if (method === 'EQUAL') {
        const baseCents = Math.floor(totalCents / count);
        let remainderCents = totalCents % count;

        const splits = participants.map((p) => {
            const extra = remainderCents > 0 ? 1 : 0;
            if (remainderCents > 0) remainderCents--;

            const shareCents = baseCents + extra;
            const shareAmount = shareCents / 100;
            const percentage = Number(((shareCents / totalCents) * 100).toFixed(2));

            return {
                userId: p.userId,
                shareAmount,
                percentage
            };
        });

        // Exact sum verification
        const sumShares = splits.reduce((acc, s) => acc + Math.round(s.shareAmount * 100), 0);
        if (sumShares !== totalCents) {
            return { valid: false, error: 'Rounding mismatch in equal split computation.' };
        }

        return { valid: true, splits };
    }

    // 2. CUSTOM SPLIT (Exact amounts specified per person)
    if (method === 'CUSTOM') {
        let sumCents = 0;
        const splits = [];

        for (const p of participants) {
            if (p.shareAmount === undefined || p.shareAmount === null || isNaN(p.shareAmount) || p.shareAmount < 0) {
                return { valid: false, error: `Invalid custom share amount specified for user ${p.userId}.` };
            }
            const shareCents = Math.round(Number(p.shareAmount) * 100);
            sumCents += shareCents;
            const percentage = totalCents > 0 ? Number(((shareCents / totalCents) * 100).toFixed(2)) : 0;

            splits.push({
                userId: p.userId,
                shareAmount: shareCents / 100,
                percentage
            });
        }

        if (sumCents !== totalCents) {
            const diff = (sumCents - totalCents) / 100;
            return {
                valid: false,
                error: `Custom split shares sum to ${(sumCents / 100).toFixed(2)}, which does not match total amount ${Number(totalAmount).toFixed(2)} (Difference: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}).`
            };
        }

        return { valid: true, splits };
    }

    // 3. PERCENTAGE SPLIT
    if (method === 'PERCENTAGE') {
        let sumPercentages = 0;
        participants.forEach(p => {
            sumPercentages += Number(p.percentage || 0);
        });

        if (Math.abs(sumPercentages - 100) > 0.05) {
            return {
                valid: false,
                error: `Percentages must sum to exactly 100%. Current sum: ${sumPercentages.toFixed(2)}%`
            };
        }

        let allocatedCents = 0;
        const splits = participants.map((p, idx) => {
            const pct = Number(p.percentage || 0);
            let shareCents;
            if (idx === count - 1) {
                shareCents = totalCents - allocatedCents;
            } else {
                shareCents = Math.round((totalCents * pct) / 100);
                allocatedCents += shareCents;
            }

            return {
                userId: p.userId,
                shareAmount: shareCents / 100,
                percentage: pct
            };
        });

        return { valid: true, splits };
    }

    // 4. SHARES / WEIGHTS SPLIT (e.g. 2 shares for couples, 1 share for singles)
    if (method === 'SHARES' || method === 'BY_SHARES') {
        let totalShares = 0;
        for (const p of participants) {
            const sharesVal = Number(p.shares !== undefined ? p.shares : (p.weight !== undefined ? p.weight : 1));
            if (isNaN(sharesVal) || sharesVal <= 0) {
                return { valid: false, error: `Invalid share weight for user ${p.userId}. Must be a positive number.` };
            }
            totalShares += sharesVal;
        }

        if (totalShares <= 0) {
            return { valid: false, error: 'Total shares must be greater than zero.' };
        }

        let allocatedCents = 0;
        const provisional = participants.map((p) => {
            const sharesVal = Number(p.shares !== undefined ? p.shares : (p.weight !== undefined ? p.weight : 1));
            const shareCents = Math.floor((totalCents * sharesVal) / totalShares);
            allocatedCents += shareCents;
            return {
                userId: p.userId,
                shares: sharesVal,
                shareCents
            };
        });

        // Deterministically distribute remaining cents to highest share holders first
        let remainderCents = totalCents - allocatedCents;
        provisional.sort((a, b) => b.shares - a.shares);

        for (let i = 0; i < provisional.length && remainderCents > 0; i++) {
            provisional[i].shareCents += 1;
            remainderCents--;
        }

        const splits = provisional.map(p => ({
            userId: p.userId,
            shareAmount: p.shareCents / 100,
            shares: p.shares,
            percentage: Number(((p.shareCents / totalCents) * 100).toFixed(2))
        }));

        const finalSum = splits.reduce((acc, s) => acc + Math.round(s.shareAmount * 100), 0);
        if (finalSum !== totalCents) {
            return { valid: false, error: 'Rounding mismatch in shares split computation.' };
        }

        return { valid: true, splits };
    }

    // 5. ADJUSTMENT SPLIT (Equal base split + individual adjustment offsets)
    if (method === 'ADJUSTMENT') {
        let sumAdjustmentsCents = 0;
        participants.forEach(p => {
            const adj = Number(p.adjustment || 0);
            sumAdjustmentsCents += Math.round(adj * 100);
        });

        const basePoolCents = totalCents - sumAdjustmentsCents;
        if (basePoolCents < 0) {
            return {
                valid: false,
                error: `Total individual adjustments (${(sumAdjustmentsCents / 100).toFixed(2)}) exceed total expense amount (${Number(totalAmount).toFixed(2)}).`
            };
        }

        const basePerPersonCents = Math.floor(basePoolCents / count);
        let remainderCents = basePoolCents % count;

        const splits = participants.map(p => {
            const extra = remainderCents > 0 ? 1 : 0;
            if (remainderCents > 0) remainderCents--;

            const adjCents = Math.round(Number(p.adjustment || 0) * 100);
            const shareCents = basePerPersonCents + extra + adjCents;

            if (shareCents < 0) {
                return null;
            }

            return {
                userId: p.userId,
                shareAmount: shareCents / 100,
                adjustment: Number(p.adjustment || 0),
                percentage: Number(((shareCents / totalCents) * 100).toFixed(2))
            };
        });

        if (splits.some(s => s === null)) {
            return { valid: false, error: 'Adjustment offsets result in negative share amount for a participant.' };
        }

        const finalSum = splits.reduce((acc, s) => acc + Math.round(s.shareAmount * 100), 0);
        if (finalSum !== totalCents) {
            return { valid: false, error: 'Rounding mismatch in adjustment split computation.' };
        }

        return { valid: true, splits };
    }

    return { valid: false, error: `Unsupported split method: ${splitMethod}` };
}

/**
 * Computes individual net balances for all members in a group
 * Supports single-payer expenses as well as co-funding multi-payer records.
 * 
 * @param {Array<{ id: number, name: string, email: string }>} members
 * @param {Array<{ id: number, payer_id: number, amount: number, deleted_at?: any }>} expenses
 * @param {Array<{ expense_id: number, participant_id: number, share_amount: number }>} splits
 * @param {Array<{ id: number, payer_id: number, payee_id: number, amount: number, status: string, deleted_at?: any }>} settlements
 * @param {Array<{ expense_id: number, user_id: number, amount_paid: number }>} expensePayers
 */
function computeGroupBalances(members, expenses, splits, settlements, expensePayers = []) {
    const balances = {};
    const memberMap = {};

    members.forEach(m => {
        balances[m.id] = {
            userId: m.id,
            name: m.name,
            email: m.email,
            totalPaid: 0,
            totalShare: 0,
            settlementsPaid: 0,
            settlementsReceived: 0,
            netBalance: 0
        };
        memberMap[m.id] = m;
    });

    // Group expense payers by expense_id
    const payersByExpense = {};
    expensePayers.forEach(ep => {
        if (!payersByExpense[ep.expense_id]) {
            payersByExpense[ep.expense_id] = [];
        }
        payersByExpense[ep.expense_id].push(ep);
    });

    // Sum expenses paid (handling multi-payer records or fallback to single payer_id)
    expenses.forEach(e => {
        if (e.deleted_at) return; // Ignore soft-deleted expenses

        const multiPayers = payersByExpense[e.id];
        if (multiPayers && multiPayers.length > 0) {
            // Multi-Payer Expense
            multiPayers.forEach(p => {
                if (balances[p.user_id]) {
                    balances[p.user_id].totalPaid += Math.round(Number(p.amount_paid) * 100);
                }
            });
        } else {
            // Single Payer Fallback (Standard / Legacy)
            const payerId = e.payer_id;
            if (balances[payerId]) {
                balances[payerId].totalPaid += Math.round(Number(e.amount) * 100);
            }
        }
    });

    // Sum itemized shares
    splits.forEach(s => {
        const participantId = s.participant_id;
        if (balances[participantId]) {
            balances[participantId].totalShare += Math.round(Number(s.share_amount) * 100);
        }
    });

    // Sum verified settlements
    settlements.forEach(st => {
        if (st.deleted_at) return; // Ignore soft-deleted settlements

        if (st.status === 'paid') {
            const amtCents = Math.round(Number(st.amount) * 100);
            if (balances[st.payer_id]) {
                balances[st.payer_id].settlementsPaid += amtCents;
            }
            if (balances[st.payee_id]) {
                balances[st.payee_id].settlementsReceived += amtCents;
            }
        }
    });

    // Calculate net balances in standard currency units
    const balanceList = Object.values(balances).map(b => {
        const netCents = (b.totalPaid - b.totalShare) + (b.settlementsPaid - b.settlementsReceived);
        return {
            userId: b.userId,
            name: b.name,
            email: b.email,
            totalPaid: Number((b.totalPaid / 100).toFixed(2)),
            totalShare: Number((b.totalShare / 100).toFixed(2)),
            settlementsPaid: Number((b.settlementsPaid / 100).toFixed(2)),
            settlementsReceived: Number((b.settlementsReceived / 100).toFixed(2)),
            netBalance: Number((netCents / 100).toFixed(2)),
            netCents
        };
    });

    return balanceList;
}

/**
 * Computes direct pairwise balances between users (Direct Pairwise Mode)
 * Direct mode shows exactly who owes whom without greedy proxy re-routing.
 */
function computePairwiseDirectDebts(members, expenses, splits, settlements, expensePayers = []) {
    const memberMap = {};
    members.forEach(m => { memberMap[m.id] = m; });

    // Matrix of direct debt: pairwise[debtorId][creditorId] = debt in cents
    const pairwise = {};
    members.forEach(m1 => {
        pairwise[m1.id] = {};
        members.forEach(m2 => {
            pairwise[m1.id][m2.id] = 0;
        });
    });

    const payersByExpense = {};
    expensePayers.forEach(ep => {
        if (!payersByExpense[ep.expense_id]) payersByExpense[ep.expense_id] = [];
        payersByExpense[ep.expense_id].push(ep);
    });

    const splitsByExpense = {};
    splits.forEach(s => {
        if (!splitsByExpense[s.expense_id]) splitsByExpense[s.expense_id] = [];
        splitsByExpense[s.expense_id].push(s);
    });

    // 1. Process expenses
    expenses.forEach(e => {
        if (e.deleted_at) return;
        const expSplits = splitsByExpense[e.id] || [];
        const expPayers = payersByExpense[e.id] || [];
        const totalExpCents = Math.round(Number(e.amount) * 100);

        if (totalExpCents <= 0) return;

        // Determine funding distribution
        let payers = [];
        if (expPayers.length > 0) {
            payers = expPayers.map(p => ({
                userId: p.user_id,
                paidCents: Math.round(Number(p.amount_paid) * 100)
            }));
        } else {
            payers = [{ userId: e.payer_id, paidCents: totalExpCents }];
        }

        // Each participant's share is proportionally owed to each payer
        expSplits.forEach(s => {
            const shareCents = Math.round(Number(s.share_amount) * 100);
            payers.forEach(p => {
                if (s.participant_id !== p.userId && p.paidCents > 0) {
                    const owedToPayerCents = Math.round((shareCents * p.paidCents) / totalExpCents);
                    if (pairwise[s.participant_id] && pairwise[s.participant_id][p.userId] !== undefined) {
                        pairwise[s.participant_id][p.userId] += owedToPayerCents;
                    }
                }
            });
        });
    });

    // 2. Settle verified payments
    settlements.forEach(st => {
        if (st.deleted_at || st.status !== 'paid') return;
        const amtCents = Math.round(Number(st.amount) * 100);
        if (pairwise[st.payer_id] && pairwise[st.payer_id][st.payee_id] !== undefined) {
            pairwise[st.payer_id][st.payee_id] -= amtCents;
        }
    });

    // 3. Reconcile bidirectional debts: if A owes B 50 and B owes A 20 -> A owes B 30
    const directTransfers = [];
    const processedPairs = new Set();

    members.forEach(m1 => {
        members.forEach(m2 => {
            if (m1.id === m2.id) return;
            const pairKey = [m1.id, m2.id].sort().join(':');
            if (processedPairs.has(pairKey)) return;
            processedPairs.add(pairKey);

            const debt1to2 = pairwise[m1.id][m2.id] || 0;
            const debt2to1 = pairwise[m2.id][m1.id] || 0;
            const netDebt = debt1to2 - debt2to1;

            if (netDebt > 0) {
                directTransfers.push({
                    payerId: m1.id,
                    payerName: m1.name,
                    payeeId: m2.id,
                    payeeName: m2.name,
                    amount: Number((netDebt / 100).toFixed(2))
                });
            } else if (netDebt < 0) {
                directTransfers.push({
                    payerId: m2.id,
                    payerName: m2.name,
                    payeeId: m1.id,
                    payeeName: m1.name,
                    amount: Number((-netDebt / 100).toFixed(2))
                });
            }
        });
    });

    return directTransfers;
}

/**
 * Enhanced Debt Simplification Optimizer
 * - Exact Subset-Sum Matching: Identifies and matches exact debtor/creditor pairs first ($O(N)$ pass)
 * - Greedy Minimum-Cash-Flow: Settles remaining fractional balances with minimal transactions
 * 
 * @param {Array<{ userId: number, name: string, email: string, netCents: number }>} balances
 * @returns {Array<{ payerId: number, payerName: string, payeeId: number, payeeName: string, amount: number }>}
 */
function optimizeSettlements(balances) {
    const creditors = [];
    const debtors = [];

    balances.forEach(b => {
        if (b.netCents > 0) {
            creditors.push({ ...b, balance: b.netCents });
        } else if (b.netCents < 0) {
            debtors.push({ ...b, balance: -b.netCents });
        }
    });

    const proposedTransfers = [];

    // STEP 1: Exact Subset Match Optimization ($k=1$)
    // If a debtor owes exactly what a creditor is owed, match them immediately!
    // This prevents breaking clean single-debt relationships across unrelated members.
    for (let d = 0; d < debtors.length; d++) {
        const debtor = debtors[d];
        if (debtor.balance <= 0) continue;

        for (let c = 0; c < creditors.length; c++) {
            const creditor = creditors[c];
            if (creditor.balance <= 0) continue;

            if (debtor.balance === creditor.balance) {
                proposedTransfers.push({
                    payerId: debtor.userId,
                    payerName: debtor.name,
                    payeeId: creditor.userId,
                    payeeName: creditor.name,
                    amount: Number((debtor.balance / 100).toFixed(2))
                });
                debtor.balance = 0;
                creditor.balance = 0;
                break;
            }
        }
    }

    // Filter out settled participants
    const remainingCreditors = creditors.filter(c => c.balance > 0);
    const remainingDebtors = debtors.filter(d => d.balance > 0);

    // STEP 2: Greedy Bipartite Matching on remaining balances
    remainingCreditors.sort((a, b) => b.balance - a.balance);
    remainingDebtors.sort((a, b) => b.balance - a.balance);

    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < remainingCreditors.length && dIdx < remainingDebtors.length) {
        const creditor = remainingCreditors[cIdx];
        const debtor = remainingDebtors[dIdx];

        const transferCents = Math.min(creditor.balance, debtor.balance);
        if (transferCents > 0) {
            proposedTransfers.push({
                payerId: debtor.userId,
                payerName: debtor.name,
                payeeId: creditor.userId,
                payeeName: creditor.name,
                amount: Number((transferCents / 100).toFixed(2))
            });

            creditor.balance -= transferCents;
            debtor.balance -= transferCents;
        }

        if (creditor.balance === 0) cIdx++;
        if (debtor.balance === 0) dIdx++;
    }

    return proposedTransfers;
}

module.exports = {
    calculateDeterministicSplits,
    computeGroupBalances,
    computePairwiseDirectDebts,
    optimizeSettlements
};
