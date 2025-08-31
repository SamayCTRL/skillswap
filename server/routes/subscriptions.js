const express = require('express');
const db = require('../config/database');
const config = require('../config/config');
const { validateSubscriptionUpgrade } = require('../middleware/validation');

const router = express.Router();

// Get current subscription
router.get('/current', async (req, res) => {
    try {
        const subscriptionQuery = `
            SELECT s.*, u.subscription_tier
            FROM subscriptions s
            RIGHT JOIN users u ON s.user_id = u.id
            WHERE u.id = $1 AND (s.status = 'active' OR s.status IS NULL)
            ORDER BY s.created_at DESC
            LIMIT 1
        `;

        const result = await db.query(subscriptionQuery, [req.user.id]);
        const subscription = result.rows[0];

        const currentTier = subscription?.tier || req.user.subscriptionTier || 'free';
        const limits = config.subscriptionLimits[currentTier];
        const pricing = config.subscriptionPricing;

        // Get current month usage
        const currentMonth = new Date().toISOString().slice(0, 7);
        const usageResult = await db.query(
            'SELECT action_type, count FROM usage_tracking WHERE user_id = $1 AND month_year = $2',
            [req.user.id, currentMonth]
        );

        const usage = {};
        usageResult.rows.forEach(row => {
            usage[row.action_type] = row.count;
        });

        res.json({
            subscription: {
                tier: currentTier,
                status: subscription?.status || 'free',
                start_date: subscription?.start_date,
                end_date: subscription?.end_date,
                features: limits.features
            },
            limits,
            usage,
            pricing
        });

    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({
            error: 'Failed to fetch subscription',
            code: 'SUBSCRIPTION_FETCH_ERROR'
        });
    }
});

// Upgrade subscription (mock implementation)
router.post('/upgrade', validateSubscriptionUpgrade, async (req, res) => {
    try {
        const { tier, billing_cycle = 'monthly' } = req.body;

        const validTiers = ['basic', 'pro', 'premium'];
        if (!validTiers.includes(tier)) {
            return res.status(400).json({
                error: 'Invalid subscription tier',
                code: 'INVALID_TIER'
            });
        }

        const pricing = config.subscriptionPricing[tier];
        const amount = pricing[billing_cycle];

        // In a real app, you'd integrate with Stripe here
        // For demo, we'll just update the user's tier directly
        
        await db.transaction(async (client) => {
            // Update user's subscription tier
            await client.query(
                'UPDATE users SET subscription_tier = $1 WHERE id = $2',
                [tier, req.user.id]
            );

            // Create subscription record
            const endDate = billing_cycle === 'yearly' 
                ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await client.query(
                `INSERT INTO subscriptions (user_id, tier, end_date, status, amount, currency)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [req.user.id, tier, endDate, 'active', amount, 'USD']
            );

            // Create notification
            await client.query(
                'INSERT INTO notifications (user_id, type, title, content) VALUES ($1, $2, $3, $4)',
                [
                    req.user.id,
                    'subscription',
                    'Subscription Upgraded',
                    `Your subscription has been upgraded to ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`
                ]
            );
        });

        res.json({
            message: 'Subscription upgraded successfully',
            tier,
            billing_cycle,
            amount: amount / 100 // Convert cents to dollars
        });

    } catch (error) {
        console.error('Subscription upgrade error:', error);
        res.status(500).json({
            error: 'Failed to upgrade subscription',
            code: 'SUBSCRIPTION_UPGRADE_ERROR'
        });
    }
});

// Cancel subscription
router.post('/cancel', async (req, res) => {
    try {
        await db.transaction(async (client) => {
            // Update subscription status
            await client.query(
                'UPDATE subscriptions SET status = $1 WHERE user_id = $2 AND status = $3',
                ['cancelled', req.user.id, 'active']
            );

            // Downgrade user to free tier at end of billing period
            // In a real app, you'd schedule this for the end date
            await client.query(
                'UPDATE users SET subscription_tier = $1 WHERE id = $2',
                ['free', req.user.id]
            );

            // Create notification
            await client.query(
                'INSERT INTO notifications (user_id, type, title, content) VALUES ($1, $2, $3, $4)',
                [
                    req.user.id,
                    'subscription',
                    'Subscription Cancelled',
                    'Your subscription has been cancelled. You now have a free account.'
                ]
            );
        });

        res.json({
            message: 'Subscription cancelled successfully'
        });

    } catch (error) {
        console.error('Subscription cancellation error:', error);
        res.status(500).json({
            error: 'Failed to cancel subscription',
            code: 'SUBSCRIPTION_CANCEL_ERROR'
        });
    }
});

// Get usage statistics
router.get('/usage', async (req, res) => {
    try {
        const { months = 6 } = req.query;
        
        const usageQuery = `
            SELECT month_year, action_type, count
            FROM usage_tracking
            WHERE user_id = $1
            AND month_year >= to_char(CURRENT_DATE - INTERVAL '${months} months', 'YYYY-MM')
            ORDER BY month_year DESC, action_type
        `;

        const result = await db.query(usageQuery, [req.user.id]);

        // Group by month
        const usageByMonth = {};
        result.rows.forEach(row => {
            if (!usageByMonth[row.month_year]) {
                usageByMonth[row.month_year] = {};
            }
            usageByMonth[row.month_year][row.action_type] = row.count;
        });

        res.json({
            usage_by_month: usageByMonth,
            current_tier: req.user.subscriptionTier
        });

    } catch (error) {
        console.error('Get usage statistics error:', error);
        res.status(500).json({
            error: 'Failed to fetch usage statistics',
            code: 'USAGE_STATS_ERROR'
        });
    }
});

module.exports = router;