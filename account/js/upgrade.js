document.addEventListener('DOMContentLoaded', async function () {
    let currentUser = null;

    // Check if user is authenticated and load profile
    try {
        const response = await makeApiRequest('profile', 'GET', null, true);
        if (response && response.user) {
            currentUser = response.user;
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        showNotification('Please sign in to upgrade', 'error');
        setTimeout(() => {
            window.location.href = '/account/';
        }, 2000);
        return;
    }

    // Define initiateUpgrade on the window object so it can be called from HTML
    window.initiateUpgrade = async function (plan, price) {
        const btns = document.querySelectorAll('.upgrade-btn');
        const callingBtn = Array.from(btns).find(btn => btn.getAttribute('onclick')?.includes(plan));

        // Check if user already has this tier or better
        if (plan === 'pro_lifetime' && currentUser.isProUser) {
            showNotification('You already have a Pro subscription!', 'info');
            return;
        }
        if (plan === 'plus_subscription' && (currentUser.isPlusUser || currentUser.isProUser)) {
            showNotification('You already have a Plus or Pro subscription!', 'info');
            return;
        }

        try {
            if (callingBtn) {
                callingBtn.disabled = true;
                callingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            }

            // 1. Create Razorpay Order
            const orderResponse = await makeApiRequest('features?action=subscription&subAction=create-order', 'POST', {
                plan: plan,
                price: price
            }, true);

            if (!orderResponse || !orderResponse.orderId) {
                throw new Error('Failed to create payment order');
            }

            // 2. Open Razorpay Checkout
            const options = {
                key: orderResponse.razorpayKey,
                amount: orderResponse.amount,
                currency: orderResponse.currency,
                name: plan === 'pro_lifetime' ? "Materio Pro" : "Materio Plus",
                description: plan === 'pro_lifetime' ? 'Pro Lifetime Membership' : 'Plus 3-Month Subscription',
                order_id: orderResponse.orderId,
                handler: async function (response) {
                    try {
                        if (callingBtn) callingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

                        // 3. Verify Payment and Upgrade User
                        const verifyResponse = await makeApiRequest('features?action=subscription&subAction=verify-payment', 'POST', {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            plan: plan
                        }, true);

                        if (verifyResponse && verifyResponse.success) {
                            showNotification(`Welcome to Materio ${plan === 'pro_lifetime' ? 'Pro' : 'Plus'}! Your account has been upgraded.`, 'success');

                            // Update local flags
                            if (plan === 'pro_lifetime') currentUser.isProUser = true;
                            else currentUser.isPlusUser = true;

                            if (callingBtn) callingBtn.textContent = 'Upgraded Successfully';

                            setTimeout(() => {
                                window.location.href = '/account/profile.html';
                            }, 3000);
                        }
                    } catch (error) {
                        console.error('Payment verification failed:', error);
                        showNotification('Payment verification failed: ' + error.message, 'error');
                        if (callingBtn) {
                            callingBtn.disabled = false;
                            callingBtn.textContent = 'Retry Upgrade';
                        }
                    }
                },
                prefill: {
                    name: currentUser.displayName || currentUser.username,
                    email: currentUser.email
                },
                theme: {
                    color: plan === 'pro_lifetime' ? "#FFD700" : "#C0C0C0"
                }
            };

            const rzp = new Razorpay(options);
            rzp.on('payment.failed', function (response) {
                showNotification('Payment failed: ' + response.error.description, 'error');
                if (callingBtn) {
                    callingBtn.disabled = false;
                    callingBtn.textContent = 'Upgrade Now';
                }
            });
            rzp.open();

        } catch (error) {
            console.error('Upgrade error:', error);
            const errorMessage = error.details ? `${error.message}: ${error.details}` : (error.message || 'Failed to initiate upgrade');
            showNotification(errorMessage, 'error');
            if (callingBtn) {
                callingBtn.disabled = false;
                callingBtn.textContent = 'Upgrade Now';
            }
        }
    };
});
